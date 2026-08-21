/**
 * Cloudflare R2 storage service.
 *
 * A drop-in replacement for gcpStorageService: same public method names, same
 * return shapes, so every existing caller (server bootstrap, gcpStorageRoutes,
 * backup scheduler) works against either backend without a change.
 *
 * Why R2 rather than GCS for this app: financial documents and full backups are
 * written rarely and read on demand (restore, download a statement, re-run a
 * report). That pattern is dominated by egress cost, and R2 does not charge for
 * egress. The S3 API also means the same code runs unchanged against MinIO
 * locally or AWS S3 later.
 *
 * Requests are signed with AWS Signature V4 directly rather than pulling in the
 * AWS SDK - this needs six operations, and the SDK is a large dependency to
 * carry for that.
 */

const crypto = require('crypto');
const path = require('path');
const logger = require('../utils/logger');

class R2StorageService {
  constructor() {
    this.endpoint = null;
    this.bucketName = null;
    this.accessKeyId = null;
    this.secretAccessKey = null;
    this.region = 'auto';
    this.service = 's3';
    this.initialized = false;
  }

  initialize() {
    try {
      const {
        R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_REGION
      } = process.env;

      if (!R2_ENDPOINT || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
        logger.warn('⚠️  R2_* not fully set — Cloudflare R2 storage disabled');
        return false;
      }

      this.endpoint = R2_ENDPOINT.replace(/\/$/, '');
      this.bucketName = R2_BUCKET;
      this.accessKeyId = R2_ACCESS_KEY_ID;
      this.secretAccessKey = R2_SECRET_ACCESS_KEY;
      this.region = R2_REGION || 'auto';
      this.initialized = true;

      logger.info(`✅ Cloudflare R2 storage initialized — bucket: ${this.bucketName}`);
      return true;
    } catch (error) {
      logger.error('❌ R2 storage initialization failed:', error.message);
      return false;
    }
  }

  isAvailable() {
    return this.initialized;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  SIGNING
  // ─────────────────────────────────────────────────────────────────────────

  get host() {
    return new URL(this.endpoint).host;
  }

  objectUrl(key) {
    return `${this.endpoint}/${this.bucketName}/${encodeURI(key).replace(/^\//, '')}`;
  }

  static hmac(key, value) {
    return crypto.createHmac('sha256', key).update(value, 'utf8').digest();
  }

  static sha256(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  signingKey(dateStamp) {
    const kDate = R2StorageService.hmac(`AWS4${this.secretAccessKey}`, dateStamp);
    const kRegion = R2StorageService.hmac(kDate, this.region);
    const kService = R2StorageService.hmac(kRegion, this.service);
    return R2StorageService.hmac(kService, 'aws4_request');
  }

  /**
   * Authorization header for a request.
   *
   * `query` is signed too, which List needs - the prefix and continuation token
   * travel in the query string and an unsigned one is rejected.
   */
  signedHeaders(method, key, body, contentType, query = '') {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = R2StorageService.sha256(body || '');
    const canonicalUri = key
      ? `/${this.bucketName}/${encodeURI(key).replace(/^\//, '')}`
      : `/${this.bucketName}`;

    const headers = {
      host: this.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate
    };
    if (contentType) headers['content-type'] = contentType;

    const sortedKeys = Object.keys(headers).sort();
    const canonicalHeaders = sortedKeys.map((h) => `${h}:${headers[h]}\n`).join('');
    const signedHeaderList = sortedKeys.join(';');

    const canonicalRequest = [
      method, canonicalUri, query, canonicalHeaders, signedHeaderList, payloadHash
    ].join('\n');

    const scope = `${dateStamp}/${this.region}/${this.service}/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256', amzDate, scope, R2StorageService.sha256(canonicalRequest)
    ].join('\n');

    const signature = crypto
      .createHmac('sha256', this.signingKey(dateStamp))
      .update(stringToSign, 'utf8')
      .digest('hex');

    return {
      ...headers,
      Authorization: `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${scope}, `
        + `SignedHeaders=${signedHeaderList}, Signature=${signature}`
    };
  }

  assertReady() {
    if (!this.isAvailable()) throw new Error('R2 Storage not initialized');
  }

  /**
   * The bucket is created out of band (Terraform / dashboard / the Cloudflare
   * API) because the S3 CreateBucket call is not the supported path on R2 and
   * the credentials an app runs with should not be able to create buckets.
   */
  async ensureBucket() {
    if (!this.isAvailable()) return false;
    try {
      const res = await fetch(`${this.endpoint}/${this.bucketName}?list-type=2&max-keys=1`, {
        method: 'GET',
        headers: this.signedHeaders('GET', '', '', null, 'list-type=2&max-keys=1')
      });
      if (res.ok) return true;
      logger.error(`R2 bucket "${this.bucketName}" is not reachable (HTTP ${res.status})`);
      return false;
    } catch (error) {
      logger.error('Failed to reach R2 bucket:', error.message);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  CORE OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────

  async uploadJSON(filePath, data, metadata = {}) {
    this.assertReady();
    const content = JSON.stringify(data, null, 2);
    await this.uploadFile(filePath, Buffer.from(content), 'application/json', metadata);
    logger.info(`📤 Uploaded JSON to r2://${this.bucketName}/${filePath}`);
    return { bucket: this.bucketName, path: filePath, size: content.length };
  }

  async uploadFile(filePath, buffer, contentType, metadata = {}) {
    this.assertReady();
    const body = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const headers = this.signedHeaders('PUT', filePath, body, contentType || 'application/octet-stream');

    // User metadata rides along as x-amz-meta-* headers. Not part of the
    // signature: header values must be ASCII and a filename with non-ASCII
    // characters would otherwise break the signature rather than just the
    // metadata.
    const res = await fetch(this.objectUrl(filePath), { method: 'PUT', headers, body });

    if (!res.ok) {
      throw new Error(`R2 upload failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    }

    logger.info(`📤 Uploaded file to r2://${this.bucketName}/${filePath} (${body.length} bytes)`);
    return { bucket: this.bucketName, path: filePath, size: body.length, metadata };
  }

  async downloadJSON(filePath) {
    this.assertReady();
    const file = await this.downloadFile(filePath);
    if (!file) return null;
    try {
      return JSON.parse(file.buffer.toString());
    } catch (error) {
      logger.error(`Corrupt JSON at r2://${this.bucketName}/${filePath}: ${error.message}`);
      return null;
    }
  }

  async downloadFile(filePath) {
    this.assertReady();
    const res = await fetch(this.objectUrl(filePath), {
      method: 'GET',
      headers: this.signedHeaders('GET', filePath, '')
    });

    // A missing object is a normal outcome for a "latest backup" lookup on a
    // new account, so it returns null rather than throwing.
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`R2 download failed (${res.status})`);

    const buffer = Buffer.from(await res.arrayBuffer());
    return {
      buffer,
      contentType: res.headers.get('content-type'),
      size: Number(res.headers.get('content-length') || buffer.length)
    };
  }

  async deleteFile(filePath) {
    this.assertReady();
    const res = await fetch(this.objectUrl(filePath), {
      method: 'DELETE',
      headers: this.signedHeaders('DELETE', filePath, '')
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`R2 delete failed (${res.status})`);
    }
    logger.info(`🗑️  Deleted r2://${this.bucketName}/${filePath}`);
    return res.status !== 404;
  }

  /**
   * ListObjectsV2, following continuation tokens.
   *
   * S3 returns at most 1000 keys per call regardless of what is asked for, so a
   * single request would silently truncate a user with more objects than that -
   * and truncating a listing that feeds "delete all my data" would leave
   * residue behind.
   */
  async listFiles(prefix, maxResults = 100) {
    this.assertReady();
    const out = [];
    let token = null;

    do {
      const params = new URLSearchParams({ 'list-type': '2', prefix: prefix || '' });
      params.set('max-keys', String(Math.min(maxResults - out.length, 1000)));
      if (token) params.set('continuation-token', token);

      // S3 requires the canonical query string sorted by key.
      const query = [...params.entries()]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');

      const res = await fetch(`${this.endpoint}/${this.bucketName}?${query}`, {
        method: 'GET',
        headers: this.signedHeaders('GET', '', '', null, query)
      });

      if (!res.ok) throw new Error(`R2 list failed (${res.status})`);
      const xml = await res.text();

      for (const match of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
        const block = match[1];
        const pick = (tag) => (block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`)) || [])[1];
        out.push({
          name: decodeXml(pick('Key') || ''),
          size: parseInt(pick('Size') || '0', 10),
          contentType: undefined, // not returned by LIST; a HEAD per key is not worth it
          updated: pick('LastModified'),
          metadata: {}
        });
      }

      const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
      token = truncated
        ? decodeXml((xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/) || [])[1] || '')
        : null;
    } while (token && out.length < maxResults);

    return out.slice(0, maxResults);
  }

  /** Presigned GET so objects stay private and links expire. */
  async getSignedUrl(filePath, expiresInMinutes = 60) {
    this.assertReady();
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const scope = `${dateStamp}/${this.region}/${this.service}/aws4_request`;
    const canonicalUri = `/${this.bucketName}/${encodeURI(filePath).replace(/^\//, '')}`;

    const params = new URLSearchParams({
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.accessKeyId}/${scope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(Math.min(expiresInMinutes, 7 * 24 * 60) * 60),
      'X-Amz-SignedHeaders': 'host'
    });

    const canonicalRequest = [
      'GET', canonicalUri, params.toString(), `host:${this.host}\n`, 'host', 'UNSIGNED-PAYLOAD'
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256', amzDate, scope, R2StorageService.sha256(canonicalRequest)
    ].join('\n');

    const signature = crypto
      .createHmac('sha256', this.signingKey(dateStamp))
      .update(stringToSign, 'utf8')
      .digest('hex');

    return `${this.endpoint}${canonicalUri}?${params.toString()}&X-Amz-Signature=${signature}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  FINANCIAL DATA OPERATIONS
  //  Same paths and payloads as the GCP service, so a deployment can switch
  //  backends without invalidating existing backups.
  // ─────────────────────────────────────────────────────────────────────────

  async backupAccounts(userId, accounts) {
    const filePath = `${userId}/accounts/snapshot_${stamp()}.json`;
    const data = {
      userId,
      exportedAt: new Date().toISOString(),
      accountCount: accounts.length,
      accounts: accounts.map((acc) => ({
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
        updatedAt: acc.updatedAt
      })),
      totalBalance: accounts.reduce((sum, a) => sum + (a.balance || 0), 0)
    };

    const result = await this.uploadJSON(filePath, data, {
      type: 'account-backup', userId, count: String(accounts.length)
    });
    await this.uploadJSON(`${userId}/accounts/latest.json`, data, {
      type: 'account-backup-latest', userId
    });
    return result;
  }

  async backupTransactions(userId, transactions, dateRange = {}) {
    const label = dateRange.startDate && dateRange.endDate
      ? `${dateRange.startDate}_to_${dateRange.endDate}`
      : stamp();

    const filePath = `${userId}/transactions/export_${label}.json`;
    const data = {
      userId,
      exportedAt: new Date().toISOString(),
      dateRange,
      transactionCount: transactions.length,
      transactions: transactions.map((tx) => ({
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
        createdAt: tx.createdAt
      })),
      summary: {
        totalCredit: transactions.filter((t) => t.type === 'credit').reduce((s, t) => s + Math.abs(t.amount), 0),
        totalDebit: transactions.filter((t) => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0),
        categories: [...new Set(transactions.map((t) => t.category).filter(Boolean))]
      }
    };

    return this.uploadJSON(filePath, data, {
      type: 'transaction-export', userId, count: String(transactions.length)
    });
  }

  async backupProfile(userId, profile) {
    const filePath = `${userId}/profiles/profile_${stamp()}.json`;
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
        history: profile.creditScore.history
      } : null,
      statistics: profile.statistics,
      isProfileComplete: profile.isProfileComplete
      // Sensitive fields (PAN, OAuth tokens, keys) are deliberately excluded.
    };

    const result = await this.uploadJSON(filePath, sanitized, { type: 'profile-backup', userId });
    await this.uploadJSON(`${userId}/profiles/latest.json`, sanitized, {
      type: 'profile-backup-latest', userId
    });
    return result;
  }

  async fullBackup(userId, data) {
    const timestamp = stamp();
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
        investments: data.investments || []
      },
      summary: {
        accountCount: (data.accounts || []).length,
        transactionCount: (data.transactions || []).length,
        totalBalance: (data.accounts || []).reduce((s, a) => s + (a.balance || 0), 0),
        emiCount: (data.emis || []).length,
        goalCount: (data.goals || []).length
      }
    };

    const result = await this.uploadJSON(filePath, backup, {
      type: 'full-backup', userId, version: '1.0'
    });
    await this.uploadJSON(`${userId}/backups/latest.json`, backup, {
      type: 'full-backup-latest', userId
    });

    return { ...result, timestamp, summary: backup.summary };
  }

  async getFullBackup(userId, fileName = 'latest.json') {
    return this.downloadJSON(`${userId}/backups/${fileName}`);
  }

  async listBackups(userId) {
    const files = await this.listFiles(`${userId}/backups/`, 50);
    return files
      .filter((f) => f.name !== `${userId}/backups/latest.json`)
      .map((f) => ({
        name: f.name.split('/').pop(),
        path: f.name,
        size: f.size,
        createdAt: f.updated,
        metadata: f.metadata
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async uploadReport(userId, buffer, filename, contentType) {
    return this.uploadFile(`${userId}/reports/${filename}`, buffer, contentType, {
      type: 'report', userId, originalName: filename
    });
  }

  async uploadDocument(userId, buffer, filename, contentType, docMetadata = {}) {
    // The original name is never used verbatim as a path segment - it is user
    // supplied and would otherwise allow writing outside the user's prefix.
    const safeName = `${Date.now()}-${path.basename(filename).replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    return this.uploadFile(`${userId}/documents/${safeName}`, buffer, contentType, {
      type: 'financial-document', userId, originalName: filename, ...docMetadata
    });
  }

  async getStorageStats(userId) {
    this.assertReady();
    const categories = ['accounts', 'transactions', 'profiles', 'reports', 'documents', 'backups'];
    const stats = { totalSize: 0, totalFiles: 0, categories: {} };

    for (const cat of categories) {
      const files = await this.listFiles(`${userId}/${cat}/`, 1000);
      const totalSize = files.reduce((s, f) => s + f.size, 0);
      stats.categories[cat] = { fileCount: files.length, totalSize };
      stats.totalSize += totalSize;
      stats.totalFiles += files.length;
    }

    return stats;
  }

  /** GDPR erasure: every object under the user's prefix. */
  async deleteAllUserData(userId) {
    this.assertReady();
    // A high cap rather than the default 100: a partial delete here would leave
    // personal data behind while reporting success.
    const files = await this.listFiles(`${userId}/`, 100000);
    if (files.length === 0) return { deleted: 0 };

    // Bounded concurrency - firing thousands of DELETEs at once exhausts
    // sockets and gets rate limited.
    const batchSize = 25;
    for (let i = 0; i < files.length; i += batchSize) {
      await Promise.all(files.slice(i, i + batchSize).map((f) => this.deleteFile(f.name)));
    }

    logger.info(`🗑️  Deleted all R2 data for user ${userId} (${files.length} files)`);
    return { deleted: files.length };
  }
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function decodeXml(value) {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// Singleton instance
const r2StorageService = new R2StorageService();

module.exports = r2StorageService;
module.exports.R2StorageService = R2StorageService;
