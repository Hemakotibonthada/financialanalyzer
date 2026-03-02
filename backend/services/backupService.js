const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { createGzip, createGunzip } = require('zlib');
const { pipeline } = require('stream/promises');
const { Readable, Writable } = require('stream');
const logger = require('../utils/logger');

// All user-data collections to back up
const USER_COLLECTIONS = [
  'Transaction', 'Budget', 'BillReminder', 'Investment', 'Debt',
  'EMI', 'FinancialProfile', 'FinancialGoal', 'FinancialAnalysis',
  'PersonalLoan', 'LoanGiven', 'Lender', 'LenderLoan', 'LenderPayment',
  'Portfolio', 'TaxRecord', 'InsurancePolicy', 'RealEstate',
  'Invoice', 'Client', 'Project', 'Vendor', 'Contract',
  'NetWorthSnapshot', 'SplitExpense', 'Group', 'FamilyMember',
  'CompanyExpense', 'Subscription', 'Receipt', 'Document',
  'BankAccount', 'AutomationRule', 'Template', 'ChatMessage',
  'Notification', 'ActivityLog', 'RetirementPlan', 'Currency',
  'Analysis', 'Anomaly', 'MLModel', 'Prediction'
];

// Backup storage directory
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

class BackupService {
  constructor() {
    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  }

  /**
   * Create a full database backup for a user
   * Returns backup metadata and the backup data
   */
  async createBackup(userId, options = {}) {
    const { type = 'manual', schedule = null } = options;
    const startTime = Date.now();

    logger.info(`Starting ${type} backup for user ${userId}`);

    const backup = {
      version: '2.0',
      format: 'financial_analyzer_backup',
      createdAt: new Date().toISOString(),
      type, // 'manual', 'daily', 'weekly', 'monthly'
      schedule,
      userId: userId.toString(),
      mongoVersion: mongoose.version,
      collections: {},
      metadata: {
        totalDocuments: 0,
        totalCollections: 0,
        collectionCounts: {},
        durationMs: 0
      }
    };

    for (const collectionName of USER_COLLECTIONS) {
      try {
        const Model = require(`../models/${collectionName}`);
        const docs = await Model.find({ userId }).lean();
        
        if (docs.length > 0) {
          backup.collections[collectionName] = docs;
          backup.metadata.collectionCounts[collectionName] = docs.length;
          backup.metadata.totalDocuments += docs.length;
          backup.metadata.totalCollections++;
        }
      } catch (err) {
        // Model doesn't have userId field or doesn't exist — skip silently
        try {
          // Some models like User don't have userId but _id
          if (collectionName === 'User') {
            const Model = require(`../models/${collectionName}`);
            const doc = await Model.findById(userId).lean();
            if (doc) {
              backup.collections[collectionName] = [doc];
              backup.metadata.collectionCounts[collectionName] = 1;
              backup.metadata.totalDocuments += 1;
              backup.metadata.totalCollections++;
            }
          }
        } catch (innerErr) {
          // Skip entirely
        }
      }
    }

    backup.metadata.durationMs = Date.now() - startTime;
    
    logger.info(`Backup complete: ${backup.metadata.totalDocuments} documents from ${backup.metadata.totalCollections} collections in ${backup.metadata.durationMs}ms`);

    return backup;
  }

  /**
   * Save backup to disk as a compressed .bak file
   */
  async saveBackupToFile(userId, backup) {
    const userDir = path.join(BACKUP_DIR, userId.toString());
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${backup.type}_${timestamp}.json.gz`;
    const filepath = path.join(userDir, filename);

    // Compress using gzip
    const jsonStr = JSON.stringify(backup);
    const input = Readable.from([jsonStr]);
    const gzip = createGzip({ level: 9 }); // max compression
    const output = fs.createWriteStream(filepath);

    await pipeline(input, gzip, output);

    const stats = fs.statSync(filepath);
    
    // Save backup record to database
    const record = await this._saveBackupRecord(userId, {
      filename,
      filepath,
      type: backup.type,
      sizeBytes: stats.size,
      uncompressedSizeBytes: Buffer.byteLength(jsonStr, 'utf-8'),
      totalDocuments: backup.metadata.totalDocuments,
      totalCollections: backup.metadata.totalCollections,
      collectionCounts: backup.metadata.collectionCounts,
      durationMs: backup.metadata.durationMs
    });

    // Clean up old backups (keep last N per type)
    await this._cleanupOldBackups(userId);

    return record;
  }

  /**
   * Create backup and return as downloadable buffer (for manual export)
   */
  async createExportBackup(userId) {
    const backup = await this.createBackup(userId, { type: 'export' });
    const jsonStr = JSON.stringify(backup, null, 2);
    
    return {
      data: Buffer.from(jsonStr, 'utf-8'),
      filename: `FinancialAnalyzer_Backup_${new Date().toISOString().split('T')[0]}.json`,
      metadata: backup.metadata
    };
  }

  /**
   * Create backup and return as compressed buffer
   */
  async createCompressedExportBackup(userId) {
    const backup = await this.createBackup(userId, { type: 'export' });
    const jsonStr = JSON.stringify(backup);
    
    return new Promise((resolve, reject) => {
      const chunks = [];
      const gzip = createGzip({ level: 9 });
      
      gzip.on('data', chunk => chunks.push(chunk));
      gzip.on('end', () => {
        resolve({
          data: Buffer.concat(chunks),
          filename: `FinancialAnalyzer_Backup_${new Date().toISOString().split('T')[0]}.json.gz`,
          metadata: backup.metadata,
          compressed: true
        });
      });
      gzip.on('error', reject);
      
      gzip.write(jsonStr);
      gzip.end();
    });
  }

  /**
   * Restore from backup data
   * Supports both merge and replace strategies
   */
  async restoreFromBackup(userId, backupData, options = {}) {
    const { strategy = 'merge' } = options; // 'merge' or 'replace'
    const startTime = Date.now();

    logger.info(`Starting ${strategy} restore for user ${userId}`);

    // Validate backup format
    if (!backupData.format || backupData.format !== 'financial_analyzer_backup') {
      throw new Error('Invalid backup file format. Expected Financial Analyzer backup.');
    }

    if (!backupData.collections || typeof backupData.collections !== 'object') {
      throw new Error('Invalid backup data: missing collections.');
    }

    const results = {
      restored: {},
      skipped: {},
      errors: {},
      totalRestored: 0,
      totalSkipped: 0,
      totalErrors: 0,
      strategy,
      durationMs: 0
    };

    for (const [collectionName, docs] of Object.entries(backupData.collections)) {
      if (!Array.isArray(docs) || docs.length === 0) continue;

      try {
        const Model = require(`../models/${collectionName}`);

        if (strategy === 'replace') {
          // Delete all existing data for this user in this collection
          await Model.deleteMany({ userId });
          
          // Insert backup data with correct userId
          const insertDocs = docs.map(doc => {
            const { _id, __v, ...rest } = doc;
            return { ...rest, userId };
          });
          
          await Model.insertMany(insertDocs, { ordered: false }).catch(e => {
            // Some may fail due to unique constraints — that's OK
            logger.warn(`Partial insert for ${collectionName}: ${e.message}`);
          });
          
          results.restored[collectionName] = docs.length;
          results.totalRestored += docs.length;

        } else {
          // Merge strategy: upsert by original _id
          let restoredCount = 0;
          let skippedCount = 0;

          for (const doc of docs) {
            try {
              const { __v, ...rest } = doc;
              const originalId = doc._id;

              // Check if document already exists
              const existing = await Model.findOne({ 
                _id: originalId, 
                userId 
              });

              if (!existing) {
                // Insert new document
                await Model.create({ ...rest, userId });
                restoredCount++;
              } else {
                skippedCount++;
              }
            } catch (docErr) {
              // Skip individual document errors
              skippedCount++;
            }
          }

          results.restored[collectionName] = restoredCount;
          results.skipped[collectionName] = skippedCount;
          results.totalRestored += restoredCount;
          results.totalSkipped += skippedCount;
        }
      } catch (err) {
        logger.error(`Error restoring ${collectionName}:`, err.message);
        results.errors[collectionName] = err.message;
        results.totalErrors++;
      }
    }

    results.durationMs = Date.now() - startTime;
    logger.info(`Restore complete: ${results.totalRestored} restored, ${results.totalSkipped} skipped, ${results.totalErrors} errors in ${results.durationMs}ms`);

    return results;
  }

  /**
   * Restore from a saved backup file on disk
   */
  async restoreFromFile(userId, backupId, options = {}) {
    const record = await this._getBackupRecord(backupId, userId);
    if (!record) {
      throw new Error('Backup not found');
    }

    if (!fs.existsSync(record.filepath)) {
      throw new Error('Backup file not found on disk. It may have been deleted.');
    }

    // Read and decompress
    const compressed = fs.readFileSync(record.filepath);
    const backupData = await this._decompressBackup(compressed);

    return this.restoreFromBackup(userId, backupData, options);
  }

  /**
   * List all backups for a user
   */
  async listBackups(userId) {
    const db = mongoose.connection.db;
    const collection = db.collection('backup_records');

    const records = await collection
      .find({ userId: userId.toString() })
      .sort({ createdAt: -1 })
      .toArray();

    // Check if files still exist on disk
    return records.map(record => ({
      ...record,
      fileExists: record.filepath ? fs.existsSync(record.filepath) : false
    }));
  }

  /**
   * Delete a specific backup
   */
  async deleteBackup(userId, backupId) {
    const record = await this._getBackupRecord(backupId, userId);
    if (!record) {
      throw new Error('Backup not found');
    }

    // Delete file from disk
    if (record.filepath && fs.existsSync(record.filepath)) {
      fs.unlinkSync(record.filepath);
    }

    // Delete record from database
    const db = mongoose.connection.db;
    await db.collection('backup_records').deleteOne({ 
      _id: new mongoose.Types.ObjectId(backupId),
      userId: userId.toString()
    });

    return { deleted: true };
  }

  /**
   * Get backup schedule settings for a user
   */
  async getScheduleSettings(userId) {
    const db = mongoose.connection.db;
    const settings = await db.collection('backup_settings').findOne({ 
      userId: userId.toString() 
    });

    return settings || {
      userId: userId.toString(),
      enabled: false,
      frequency: 'weekly', // 'daily', 'weekly', 'monthly'
      retentionCount: { daily: 7, weekly: 4, monthly: 6 },
      lastRun: null,
      nextRun: null
    };
  }

  /**
   * Update backup schedule settings
   */
  async updateScheduleSettings(userId, settings) {
    const db = mongoose.connection.db;
    
    const nextRun = settings.enabled ? this._calculateNextRun(settings.frequency) : null;

    const result = await db.collection('backup_settings').findOneAndUpdate(
      { userId: userId.toString() },
      {
        $set: {
          ...settings,
          userId: userId.toString(),
          nextRun,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true, returnDocument: 'after' }
    );

    return result;
  }

  /**
   * Run scheduled backups for all users who have them enabled
   * Called by the scheduler/cron
   */
  async runScheduledBackups() {
    const db = mongoose.connection.db;
    const now = new Date();

    const dueSettings = await db.collection('backup_settings').find({
      enabled: true,
      nextRun: { $lte: now }
    }).toArray();

    logger.info(`Running scheduled backups for ${dueSettings.length} users`);

    const results = [];
    for (const settings of dueSettings) {
      try {
        const backup = await this.createBackup(settings.userId, {
          type: settings.frequency,
          schedule: settings.frequency
        });

        const record = await this.saveBackupToFile(settings.userId, backup);

        // Update last run and next run
        const nextRun = this._calculateNextRun(settings.frequency);
        await db.collection('backup_settings').updateOne(
          { userId: settings.userId },
          { $set: { lastRun: now, nextRun } }
        );

        results.push({ userId: settings.userId, success: true, record });
        logger.info(`Scheduled ${settings.frequency} backup complete for user ${settings.userId}`);
      } catch (err) {
        results.push({ userId: settings.userId, success: false, error: err.message });
        logger.error(`Scheduled backup failed for user ${settings.userId}: ${err.message}`);
      }
    }

    return results;
  }

  // ========== Private Helpers ==========

  async _saveBackupRecord(userId, data) {
    const db = mongoose.connection.db;
    const record = {
      userId: userId.toString(),
      ...data,
      createdAt: new Date()
    };

    const result = await db.collection('backup_records').insertOne(record);
    return { ...record, _id: result.insertedId };
  }

  async _getBackupRecord(backupId, userId) {
    const db = mongoose.connection.db;
    return db.collection('backup_records').findOne({
      _id: new mongoose.Types.ObjectId(backupId),
      userId: userId.toString()
    });
  }

  async _cleanupOldBackups(userId) {
    const settings = await this.getScheduleSettings(userId);
    const retention = settings.retentionCount || { daily: 7, weekly: 4, monthly: 6 };
    const db = mongoose.connection.db;

    for (const [type, keep] of Object.entries(retention)) {
      const records = await db.collection('backup_records')
        .find({ userId: userId.toString(), type })
        .sort({ createdAt: -1 })
        .toArray();

      if (records.length > keep) {
        const toDelete = records.slice(keep);
        for (const record of toDelete) {
          try {
            if (record.filepath && fs.existsSync(record.filepath)) {
              fs.unlinkSync(record.filepath);
            }
            await db.collection('backup_records').deleteOne({ _id: record._id });
            logger.info(`Cleaned up old ${type} backup: ${record.filename}`);
          } catch (err) {
            logger.warn(`Failed to clean up backup ${record._id}: ${err.message}`);
          }
        }
      }
    }
  }

  _calculateNextRun(frequency) {
    const now = new Date();
    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        const next = new Date(now);
        next.setMonth(next.getMonth() + 1);
        return next;
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  async _decompressBackup(compressedBuffer) {
    return new Promise((resolve, reject) => {
      const gunzip = createGunzip();
      const chunks = [];

      gunzip.on('data', chunk => chunks.push(chunk));
      gunzip.on('end', () => {
        try {
          const json = Buffer.concat(chunks).toString('utf-8');
          resolve(JSON.parse(json));
        } catch (e) {
          reject(new Error('Failed to parse backup data'));
        }
      });
      gunzip.on('error', reject);

      gunzip.write(compressedBuffer);
      gunzip.end();
    });
  }
}

module.exports = new BackupService();
