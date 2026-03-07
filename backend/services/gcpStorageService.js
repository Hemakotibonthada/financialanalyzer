/**
 * Google Cloud Platform (GCP) Storage Service
 * 
 * Manages cloud storage for financial data backups, account snapshots,
 * transaction exports, and document attachments on Google Cloud Storage.
 * 
 * Bucket structure:
 *   /{userId}/accounts/         — Bank account snapshots (JSON)
 *   /{userId}/transactions/     — Transaction data exports (JSON/CSV)
 *   /{userId}/profiles/         — Financial profile backups (JSON)
 *   /{userId}/reports/          — Generated reports (PDF/XLSX)
 *   /{userId}/documents/        — Uploaded financial documents
 *   /{userId}/backups/          — Full automated backups (JSON)
 */

const { Storage } = require('@google-cloud/storage');
const path = require('path');
const logger = require('../utils/logger');

class GCPStorageService {
  constructor() {
    this.storage = null;
    this.bucket = null;
    this.bucketName = null;
    this.initialized = false;
  }

  /**
   * Initialize GCP Storage client
   * Supports both service account key file and application default credentials
   */
  initialize() {
    try {
      this.bucketName = process.env.GCP_STORAGE_BUCKET;

      if (!this.bucketName) {
        logger.warn('⚠️  GCP_STORAGE_BUCKET not set — GCP Storage disabled');
        return false;
      }

      const options = {
        projectId: process.env.GCP_PROJECT_ID,
      };

      // Use service account key file if provided
      if (process.env.GCP_KEY_FILE) {
        options.keyFilename = process.env.GCP_KEY_FILE;
        logger.info(`🔑 Using GCP key file: ${process.env.GCP_KEY_FILE}`);
      } else if (process.env.GCP_CREDENTIALS_JSON) {
        // Parse inline JSON credentials (useful for CI/CD and cloud deployments)
        try {
          options.credentials = JSON.parse(process.env.GCP_CREDENTIALS_JSON);
          logger.info('🔑 Using inline GCP credentials');
        } catch (parseErr) {
          logger.error('❌ Failed to parse GCP_CREDENTIALS_JSON:', parseErr.message);
          return false;
        }
      } else {
        // Fall back to Application Default Credentials (ADC)
        logger.info('🔑 Using Application Default Credentials for GCP');
      }

      this.storage = new Storage(options);
      this.bucket = this.storage.bucket(this.bucketName);
      this.initialized = true;

      logger.info(`✅ GCP Storage initialized — bucket: ${this.bucketName}`);
      return true;
    } catch (error) {
      logger.error('❌ GCP Storage initialization failed:', error.message);
      return false;
    }
  }

  /**
   * Check if GCP Storage is available
   */
  isAvailable() {
    return this.initialized && this.bucket !== null;
  }

  /**
   * Ensure the bucket exists (create if not)
   */
  async ensureBucket() {
    if (!this.isAvailable()) return false;
    try {
      const [exists] = await this.bucket.exists();
      if (!exists) {
        const location = process.env.GCP_STORAGE_LOCATION || 'ASIA-SOUTH1';
        await this.storage.createBucket(this.bucketName, {
          location,
          storageClass: 'STANDARD',
          uniformBucketLevelAccess: { enabled: true },
        });
        logger.info(`🪣 Created GCP bucket: ${this.bucketName} in ${location}`);
      }
      return true;
    } catch (error) {
      logger.error('Failed to ensure bucket:', error.message);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  CORE OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Upload a JSON object to GCP Storage
   */
  async uploadJSON(filePath, data, metadata = {}) {
    if (!this.isAvailable()) throw new Error('GCP Storage not initialized');

    const file = this.bucket.file(filePath);
    const content = JSON.stringify(data, null, 2);

    await file.save(content, {
      contentType: 'application/json',
      metadata: {
        metadata: {
          ...metadata,
          uploadedAt: new Date().toISOString(),
          source: 'financial-analyzer',
        },
      },
      resumable: false,
    });

    logger.info(`📤 Uploaded JSON to gs://${this.bucketName}/${filePath}`);
    return { bucket: this.bucketName, path: filePath, size: content.length };
  }

  /**
   * Upload a raw buffer/file to GCP Storage
   */
  async uploadFile(filePath, buffer, contentType, metadata = {}) {
    if (!this.isAvailable()) throw new Error('GCP Storage not initialized');

    const file = this.bucket.file(filePath);
    await file.save(buffer, {
      contentType,
      metadata: { metadata: { ...metadata, uploadedAt: new Date().toISOString() } },
      resumable: buffer.length > 5 * 1024 * 1024, // resumable for files > 5MB
    });

    logger.info(`📤 Uploaded file to gs://${this.bucketName}/${filePath} (${buffer.length} bytes)`);
    return { bucket: this.bucketName, path: filePath, size: buffer.length };
  }

  /**
   * Download a JSON object from GCP Storage
   */
  async downloadJSON(filePath) {
    if (!this.isAvailable()) throw new Error('GCP Storage not initialized');

    const file = this.bucket.file(filePath);
    const [exists] = await file.exists();
    if (!exists) return null;

    const [content] = await file.download();
    return JSON.parse(content.toString());
  }

  /**
   * Download a raw file from GCP Storage
   */
  async downloadFile(filePath) {
    if (!this.isAvailable()) throw new Error('GCP Storage not initialized');

    const file = this.bucket.file(filePath);
    const [exists] = await file.exists();
    if (!exists) return null;

    const [content] = await file.download();
    const [metadata] = await file.getMetadata();
    return { buffer: content, contentType: metadata.contentType, size: metadata.size };
  }

  /**
   * Delete a file from GCP Storage
   */
  async deleteFile(filePath) {
    if (!this.isAvailable()) throw new Error('GCP Storage not initialized');

    const file = this.bucket.file(filePath);
    const [exists] = await file.exists();
    if (!exists) return false;

    await file.delete();
    logger.info(`🗑️  Deleted gs://${this.bucketName}/${filePath}`);
    return true;
  }

  /**
   * List files in a directory prefix
   */
  async listFiles(prefix, maxResults = 100) {
    if (!this.isAvailable()) throw new Error('GCP Storage not initialized');

    const [files] = await this.bucket.getFiles({
      prefix,
      maxResults,
    });

    return files.map(f => ({
      name: f.name,
      size: parseInt(f.metadata.size || 0),
      contentType: f.metadata.contentType,
      updated: f.metadata.updated,
      metadata: f.metadata.metadata || {},
    }));
  }

  /**
   * Generate a signed URL for temporary access
   */
  async getSignedUrl(filePath, expiresInMinutes = 60) {
    if (!this.isAvailable()) throw new Error('GCP Storage not initialized');

    const file = this.bucket.file(filePath);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });

    return url;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  FINANCIAL DATA OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Backup all bank accounts for a user
   */
  async backupAccounts(userId, accounts) {
    const filePath = `${userId}/accounts/snapshot_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const data = {
      userId,
      exportedAt: new Date().toISOString(),
      accountCount: accounts.length,
      accounts: accounts.map(acc => ({
        id: acc._id?.toString(),
        bankName: acc.bankName,
        accountNumber: acc.accountNumber,
        accountType: acc.accountType,
        balance: acc.balance,
        currency: acc.currency,
        isActive: acc.isActive,
        metadata: acc.metadata,
        balanceHistory: acc.balanceHistory,
        tags: acc.tags,
        lastSyncedAt: acc.lastSyncedAt,
        createdAt: acc.createdAt,
        updatedAt: acc.updatedAt,
      })),
      totalBalance: accounts.reduce((sum, a) => sum + (a.balance || 0), 0),
    };

    const result = await this.uploadJSON(filePath, data, {
      type: 'account-backup',
      userId,
      count: String(accounts.length),
    });

    // Also maintain a "latest" symlink
    await this.uploadJSON(`${userId}/accounts/latest.json`, data, {
      type: 'account-backup-latest',
      userId,
    });

    return result;
  }

  /**
   * Backup transactions for a user
   */
  async backupTransactions(userId, transactions, dateRange = {}) {
    const label = dateRange.startDate && dateRange.endDate
      ? `${dateRange.startDate}_to_${dateRange.endDate}`
      : new Date().toISOString().replace(/[:.]/g, '-');

    const filePath = `${userId}/transactions/export_${label}.json`;
    const data = {
      userId,
      exportedAt: new Date().toISOString(),
      dateRange,
      transactionCount: transactions.length,
      transactions: transactions.map(tx => ({
        id: tx._id?.toString(),
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        type: tx.type,
        category: tx.category,
        subcategory: tx.subcategory,
        merchantName: tx.merchantName,
        paymentMethod: tx.paymentMethod,
        source: tx.source,
        balance: tx.balance,
        tags: tx.tags,
        notes: tx.notes,
        isRecurring: tx.isRecurring,
        createdAt: tx.createdAt,
      })),
      summary: {
        totalCredit: transactions.filter(t => t.type === 'credit').reduce((s, t) => s + Math.abs(t.amount), 0),
        totalDebit: transactions.filter(t => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0),
        categories: [...new Set(transactions.map(t => t.category).filter(Boolean))],
      },
    };

    return this.uploadJSON(filePath, data, {
      type: 'transaction-export',
      userId,
      count: String(transactions.length),
    });
  }

  /**
   * Backup financial profile for a user
   */
  async backupProfile(userId, profile) {
    const filePath = `${userId}/profiles/profile_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const sanitized = {
      userId,
      exportedAt: new Date().toISOString(),
      fullName: profile.fullName,
      monthlyIncome: profile.monthlyIncome,
      incomeSource: profile.incomeSource,
      currency: profile.currency,
      budgetLimits: profile.budgetLimits,
      savingsGoal: profile.savingsGoal,
      customCategories: profile.customCategories,
      creditScore: profile.creditScore ? {
        score: profile.creditScore.score,
        lastUpdated: profile.creditScore.lastUpdated,
        history: profile.creditScore.history,
      } : null,
      statistics: profile.statistics,
      isProfileComplete: profile.isProfileComplete,
      // Exclude sensitive data: PAN, tokens, keys
    };

    const result = await this.uploadJSON(filePath, sanitized, {
      type: 'profile-backup',
      userId,
    });

    await this.uploadJSON(`${userId}/profiles/latest.json`, sanitized, {
      type: 'profile-backup-latest',
      userId,
    });

    return result;
  }

  /**
   * Full backup — accounts + transactions + profile + EMIs + goals
   */
  async fullBackup(userId, data) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = `${userId}/backups/full_${timestamp}.json`;

    const backup = {
      userId,
      createdAt: new Date().toISOString(),
      version: '1.0',
      data: {
        accounts: data.accounts || [],
        transactions: data.transactions || [],
        profile: data.profile || null,
        emis: data.emis || [],
        goals: data.goals || [],
        budgets: data.budgets || [],
        billReminders: data.billReminders || [],
        investments: data.investments || [],
      },
      summary: {
        accountCount: (data.accounts || []).length,
        transactionCount: (data.transactions || []).length,
        totalBalance: (data.accounts || []).reduce((s, a) => s + (a.balance || 0), 0),
        emiCount: (data.emis || []).length,
        goalCount: (data.goals || []).length,
      },
    };

    const result = await this.uploadJSON(filePath, backup, {
      type: 'full-backup',
      userId,
      version: '1.0',
    });

    // Maintain latest reference
    await this.uploadJSON(`${userId}/backups/latest.json`, backup, {
      type: 'full-backup-latest',
      userId,
    });

    return { ...result, timestamp, summary: backup.summary };
  }

  /**
   * Restore from a full backup
   */
  async getFullBackup(userId, fileName = 'latest.json') {
    const filePath = `${userId}/backups/${fileName}`;
    return this.downloadJSON(filePath);
  }

  /**
   * List all backups for a user
   */
  async listBackups(userId) {
    const files = await this.listFiles(`${userId}/backups/`, 50);
    return files
      .filter(f => f.name !== `${userId}/backups/latest.json`)
      .map(f => ({
        name: f.name.split('/').pop(),
        path: f.name,
        size: f.size,
        createdAt: f.updated,
        metadata: f.metadata,
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Upload a report (PDF/XLSX) to GCP
   */
  async uploadReport(userId, buffer, filename, contentType) {
    const filePath = `${userId}/reports/${filename}`;
    return this.uploadFile(filePath, buffer, contentType, {
      type: 'report',
      userId,
      originalName: filename,
    });
  }

  /**
   * Upload a financial document to GCP
   */
  async uploadDocument(userId, buffer, filename, contentType, docMetadata = {}) {
    const ext = path.extname(filename);
    const safeName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = `${userId}/documents/${safeName}`;

    return this.uploadFile(filePath, buffer, contentType, {
      type: 'financial-document',
      userId,
      originalName: filename,
      ...docMetadata,
    });
  }

  /**
   * Get storage usage statistics for a user
   */
  async getStorageStats(userId) {
    if (!this.isAvailable()) throw new Error('GCP Storage not initialized');

    const categories = ['accounts', 'transactions', 'profiles', 'reports', 'documents', 'backups'];
    const stats = { totalSize: 0, totalFiles: 0, categories: {} };

    for (const cat of categories) {
      const files = await this.listFiles(`${userId}/${cat}/`, 500);
      const totalSize = files.reduce((s, f) => s + f.size, 0);
      stats.categories[cat] = { fileCount: files.length, totalSize };
      stats.totalSize += totalSize;
      stats.totalFiles += files.length;
    }

    return stats;
  }

  /**
   * Delete all data for a user (GDPR compliance)
   */
  async deleteAllUserData(userId) {
    if (!this.isAvailable()) throw new Error('GCP Storage not initialized');

    const [files] = await this.bucket.getFiles({ prefix: `${userId}/` });
    if (files.length === 0) return { deleted: 0 };

    await Promise.all(files.map(f => f.delete()));
    logger.info(`🗑️  Deleted all GCP data for user ${userId} (${files.length} files)`);

    return { deleted: files.length };
  }
}

// Singleton instance
const gcpStorageService = new GCPStorageService();

module.exports = gcpStorageService;
