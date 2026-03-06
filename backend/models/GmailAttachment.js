/**
 * GmailAttachment Model
 * 
 * Mongoose model for storing Gmail attachment metadata, content extraction results,
 * bank statement parsing output, and AI-driven financial analysis. Supports the full
 * lifecycle of an attachment from download through processing to archival/cleanup.
 * 
 * @module models/GmailAttachment
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ---------------------------------------------------------------------------
//  Sub-schemas
// ---------------------------------------------------------------------------

/**
 * Extracted transaction line-item from a bank statement attachment.
 * Each transaction carries its own confidence score so downstream consumers
 * can decide whether to surface or discard low-quality extractions.
 */
const ExtractedTransactionSchema = new Schema(
  {
    /** Transaction date as it appears on the statement */
    date: {
      type: Date,
      required: true,
    },

    /** Raw description / narration string */
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    /** Monetary amount (always stored as positive; use `type` for direction) */
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    /** Whether this is money coming in or going out */
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },

    /** Running balance after this transaction (if available) */
    balance: {
      type: Number,
      default: null,
    },

    /** Auto-assigned spending / income category */
    category: {
      type: String,
      trim: true,
      default: 'uncategorized',
    },

    /** Reference / cheque / UTR number when present */
    referenceNumber: {
      type: String,
      trim: true,
      default: null,
    },

    /** Confidence of the extraction for this specific row (0-1) */
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 1,
    },
  },
  { _id: false }
);

/**
 * Aggregated financial metrics derived from the extracted transactions.
 */
const FinancialMetricsSchema = new Schema(
  {
    totalCredits: { type: Number, default: 0 },
    totalDebits: { type: Number, default: 0 },
    openingBalance: { type: Number, default: null },
    closingBalance: { type: Number, default: null },
    avgDailyBalance: { type: Number, default: null },
    highestCredit: { type: Number, default: null },
    highestDebit: { type: Number, default: null },
    transactionCount: { type: Number, default: 0 },
    netCashFlow: { type: Number, default: 0 },
  },
  { _id: false }
);

/**
 * Period covered by a bank statement attachment.
 */
const StatementPeriodSchema = new Schema(
  {
    start: { type: Date, default: null },
    end: { type: Date, default: null },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
//  Main Schema
// ---------------------------------------------------------------------------

/**
 * @typedef {import('mongoose').Document} GmailAttachmentDocument
 */
const GmailAttachmentSchema = new Schema(
  {
    // ------------------------------------------------------------------
    //  Core identification
    // ------------------------------------------------------------------

    /** Owner of the attachment */
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
      index: true,
    },

    /** Parent email that contained this attachment */
    emailId: {
      type: Schema.Types.ObjectId,
      ref: 'GmailEmail',
      required: [true, 'emailId is required'],
      index: true,
    },

    /** Gmail API message ID for back-referencing */
    gmailMessageId: {
      type: String,
      required: [true, 'gmailMessageId is required'],
      trim: true,
    },

    /** Gmail API attachment ID used for lazy-downloading via the API */
    gmailAttachmentId: {
      type: String,
      required: [true, 'gmailAttachmentId is required'],
      trim: true,
      index: true,
    },

    // ------------------------------------------------------------------
    //  File metadata
    // ------------------------------------------------------------------

    /** Original filename as reported by Gmail */
    filename: {
      type: String,
      required: [true, 'filename is required'],
      trim: true,
      maxlength: 512,
    },

    /** MIME type (e.g. application/pdf, text/csv) */
    mimeType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 128,
    },

    /** Size in bytes */
    size: {
      type: Number,
      required: true,
      min: 0,
    },

    /** Absolute or relative path to the downloaded file on disk / cloud storage */
    filePath: {
      type: String,
      trim: true,
      default: null,
    },

    /** SHA-256 checksum of the raw attachment bytes – used for deduplication */
    checksum: {
      type: String,
      trim: true,
      default: null,
    },

    // ------------------------------------------------------------------
    //  Processing status
    // ------------------------------------------------------------------

    /**
     * Lifecycle status of this attachment.
     *
     *  pending     → freshly recorded, file not yet downloaded
     *  downloaded  → file saved to disk / storage
     *  processing  → extraction / analysis in progress
     *  processed   → extraction completed successfully
     *  failed      → one or more processing steps failed
     *  archived    → moved to cold storage or marked for cleanup
     */
    status: {
      type: String,
      enum: ['pending', 'downloaded', 'processing', 'processed', 'failed', 'archived'],
      default: 'pending',
      index: true,
    },

    // ------------------------------------------------------------------
    //  Content extraction
    // ------------------------------------------------------------------

    /** Full extracted text from the attachment (PDF text layer, OCR output, etc.) */
    extractedText: {
      type: String,
      default: null,
    },

    /** Structured data extracted from the attachment (schema-free) */
    extractedData: {
      type: Schema.Types.Mixed,
      default: null,
    },

    /** Method used to extract content from this attachment */
    extractionMethod: {
      type: String,
      enum: ['ocr', 'pdf_text', 'csv_parse', 'xlsx_parse', 'html_parse', 'manual', null],
      default: null,
    },

    /** Overall confidence of the extraction (0-1) */
    extractionConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },

    // ------------------------------------------------------------------
    //  Bank statement fields
    // ------------------------------------------------------------------

    /** Detected bank / financial institution name */
    bankName: {
      type: String,
      trim: true,
      default: null,
    },

    /** Masked account number (e.g. "XXXX1234") */
    accountNumber: {
      type: String,
      trim: true,
      default: null,
    },

    /** Date range the statement covers */
    statementPeriod: {
      type: StatementPeriodSchema,
      default: () => ({}),
    },

    /** Kind of account the statement belongs to */
    statementType: {
      type: String,
      enum: ['savings', 'current', 'credit_card', 'loan', 'investment', 'unknown', null],
      default: null,
    },

    /** Individual transaction rows parsed from the statement */
    transactions: {
      type: [ExtractedTransactionSchema],
      default: [],
    },

    // ------------------------------------------------------------------
    //  AI analysis fields
    // ------------------------------------------------------------------

    /** AI-assigned high-level category for this attachment */
    aiCategory: {
      type: String,
      trim: true,
      default: null,
    },

    /** AI-generated natural-language summary */
    aiSummary: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },

    /** Array of discrete AI-generated insights / observations */
    aiInsights: {
      type: [String],
      default: [],
    },

    /** Confidence of the AI analysis itself (0-1) */
    aiConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },

    /** Aggregated financial metrics computed from transactions */
    financialMetrics: {
      type: FinancialMetricsSchema,
      default: () => ({}),
    },

    // ------------------------------------------------------------------
    //  Processing timing & retries
    // ------------------------------------------------------------------

    /** Timestamp when processing was started */
    processingStartedAt: {
      type: Date,
      default: null,
    },

    /** Timestamp when processing completed (success or final failure) */
    processingCompletedAt: {
      type: Date,
      default: null,
    },

    /** Processing wall-clock duration in milliseconds */
    processingDuration: {
      type: Number,
      default: null,
      min: 0,
    },

    /** Array of error messages accumulated during processing attempts */
    processingErrors: {
      type: [String],
      default: [],
    },

    /** Number of times processing has been retried */
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /** When the last retry was attempted */
    lastRetryAt: {
      type: Date,
      default: null,
    },

    // ------------------------------------------------------------------
    //  Security
    // ------------------------------------------------------------------

    /** Whether the stored file is encrypted at rest */
    isEncrypted: {
      type: Boolean,
      default: false,
    },

    /** Encryption algorithm used (e.g. "aes-256-gcm") */
    encryptionMethod: {
      type: String,
      trim: true,
      default: null,
    },

    /** Whether the source document was password-protected (e.g. locked PDF) */
    passwordProtected: {
      type: Boolean,
      default: false,
    },

    /** Hash of the password used to unlock the document (never store plaintext) */
    passwordHash: {
      type: String,
      trim: true,
      default: null,
      select: false, // excluded from queries by default
    },

    // ------------------------------------------------------------------
    //  Soft-delete / TTL
    // ------------------------------------------------------------------

    /** Marks the record as logically deleted without removing it */
    isDeleted: {
      type: Boolean,
      default: false,
    },

    /**
     * If set, the document will be automatically removed by MongoDB's TTL
     * reaper after this date. Used primarily for failed attachments that
     * should be cleaned up after 30 days.
     */
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'gmail_attachments',
  }
);

// ---------------------------------------------------------------------------
//  Indexes
// ---------------------------------------------------------------------------

/** Compound: fetch all attachments for a user+email quickly */
GmailAttachmentSchema.index({ userId: 1, emailId: 1 });

/** Compound: list attachments by processing status per user */
GmailAttachmentSchema.index({ userId: 1, status: 1 });

/** Compound: look up attachments by bank per user */
GmailAttachmentSchema.index({ userId: 1, bankName: 1 });

/** Unique sparse: prevent storing the exact same file twice */
GmailAttachmentSchema.index({ checksum: 1 }, { unique: true, sparse: true });

/** Unique per gmail attachment id + user to prevent duplicates */
GmailAttachmentSchema.index({ userId: 1, gmailAttachmentId: 1 }, { unique: true });

/** TTL index – MongoDB automatically deletes docs whose expiresAt is in the past */
GmailAttachmentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ---------------------------------------------------------------------------
//  Virtuals
// ---------------------------------------------------------------------------

/**
 * Human-readable file size (e.g. "1.4 MB").
 * @returns {string}
 */
GmailAttachmentSchema.virtual('formattedSize').get(function () {
  const bytes = this.size;
  if (bytes == null) return 'unknown';
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);

  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
});

/**
 * Age of the attachment since creation, expressed as a human-readable string.
 * @returns {string}
 */
GmailAttachmentSchema.virtual('age').get(function () {
  if (!this.createdAt) return 'unknown';

  const diffMs = Date.now() - this.createdAt.getTime();
  const seconds = Math.floor(diffMs / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
});

/**
 * Derived processing-status label combining status + error info.
 * Handy for UI badges.
 * @returns {string}
 */
GmailAttachmentSchema.virtual('processingStatus').get(function () {
  if (this.status === 'failed' && this.retryCount > 0) {
    return `failed (${this.retryCount} retries)`;
  }
  if (this.status === 'processing' && this.processingStartedAt) {
    const elapsed = Date.now() - this.processingStartedAt.getTime();
    if (elapsed > 5 * 60 * 1000) return 'processing (stalled)';
  }
  return this.status;
});

/**
 * Number of extracted transactions.
 * @returns {number}
 */
GmailAttachmentSchema.virtual('transactionCount').get(function () {
  return Array.isArray(this.transactions) ? this.transactions.length : 0;
});

// ---------------------------------------------------------------------------
//  Instance methods
// ---------------------------------------------------------------------------

/**
 * Transition the attachment into the "processed" state, recording timing and
 * optional extraction results in a single atomic save.
 *
 * @param {Object}  [results]                 - Processing output to persist.
 * @param {string}  [results.extractedText]   - Plain-text content.
 * @param {*}       [results.extractedData]   - Structured data (any shape).
 * @param {string}  [results.extractionMethod] - Method used.
 * @param {number}  [results.extractionConfidence] - 0-1.
 * @param {Array}   [results.transactions]    - Parsed transaction rows.
 * @param {Object}  [results.financialMetrics] - Summary metrics.
 * @param {string}  [results.aiSummary]       - AI summary.
 * @param {Array}   [results.aiInsights]      - AI insight strings.
 * @param {number}  [results.aiConfidence]    - 0-1.
 * @returns {Promise<GmailAttachmentDocument>}
 */
GmailAttachmentSchema.methods.markProcessed = async function (results = {}) {
  const now = new Date();

  this.status = 'processed';
  this.processingCompletedAt = now;

  if (this.processingStartedAt) {
    this.processingDuration = now.getTime() - this.processingStartedAt.getTime();
  }

  // Merge in any supplied results
  const allowedFields = [
    'extractedText',
    'extractedData',
    'extractionMethod',
    'extractionConfidence',
    'transactions',
    'financialMetrics',
    'bankName',
    'accountNumber',
    'statementPeriod',
    'statementType',
    'aiCategory',
    'aiSummary',
    'aiInsights',
    'aiConfidence',
  ];

  for (const field of allowedFields) {
    if (results[field] !== undefined) {
      this[field] = results[field];
    }
  }

  return this.save();
};

/**
 * Transition the attachment into the "failed" state, logging the error message
 * and optionally scheduling it for auto-cleanup after 30 days.
 *
 * @param {string}  errorMessage   - Human-readable error description.
 * @param {Object}  [options]      - Extra options.
 * @param {boolean} [options.scheduleCleanup=true] - Set a 30-day TTL.
 * @param {number}  [options.maxRetries=3]         - Max retries before giving up.
 * @returns {Promise<GmailAttachmentDocument>}
 */
GmailAttachmentSchema.methods.markFailed = async function (errorMessage, options = {}) {
  const { scheduleCleanup = true, maxRetries = 3 } = options;
  const now = new Date();

  this.status = 'failed';
  this.processingCompletedAt = now;
  this.processingErrors.push(`[${now.toISOString()}] ${errorMessage}`);
  this.retryCount = (this.retryCount || 0) + 1;
  this.lastRetryAt = now;

  if (this.processingStartedAt) {
    this.processingDuration = now.getTime() - this.processingStartedAt.getTime();
  }

  // If we've exceeded max retries, schedule for auto-cleanup
  if (scheduleCleanup && this.retryCount >= maxRetries) {
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    this.expiresAt = new Date(now.getTime() + thirtyDays);
  }

  return this.save();
};

/**
 * Build a concise summary object from the extracted transactions, useful for
 * dashboard cards and API responses.
 *
 * @returns {Object} Summary containing totals, counts, and date range.
 */
GmailAttachmentSchema.methods.getTransactionSummary = function () {
  const txs = this.transactions || [];

  if (txs.length === 0) {
    return {
      count: 0,
      totalCredits: 0,
      totalDebits: 0,
      netFlow: 0,
      dateRange: null,
      categories: {},
      avgConfidence: null,
    };
  }

  let totalCredits = 0;
  let totalDebits = 0;
  let minDate = null;
  let maxDate = null;
  let confidenceSum = 0;
  const categories = {};

  for (const tx of txs) {
    if (tx.type === 'credit') {
      totalCredits += tx.amount;
    } else {
      totalDebits += tx.amount;
    }

    if (tx.date) {
      const d = new Date(tx.date);
      if (!minDate || d < minDate) minDate = d;
      if (!maxDate || d > maxDate) maxDate = d;
    }

    const cat = tx.category || 'uncategorized';
    categories[cat] = (categories[cat] || 0) + 1;

    confidenceSum += tx.confidence != null ? tx.confidence : 1;
  }

  return {
    count: txs.length,
    totalCredits: Math.round(totalCredits * 100) / 100,
    totalDebits: Math.round(totalDebits * 100) / 100,
    netFlow: Math.round((totalCredits - totalDebits) * 100) / 100,
    dateRange: minDate && maxDate ? { start: minDate, end: maxDate } : null,
    categories,
    avgConfidence: Math.round((confidenceSum / txs.length) * 100) / 100,
  };
};

// ---------------------------------------------------------------------------
//  Static methods
// ---------------------------------------------------------------------------

/**
 * Retrieve all non-deleted attachments for a given user, sorted newest-first.
 *
 * @param {string|ObjectId} userId
 * @param {Object} [opts]
 * @param {number} [opts.limit=50]
 * @param {number} [opts.skip=0]
 * @param {string} [opts.status]       - Filter by status.
 * @param {string} [opts.bankName]     - Filter by bank.
 * @param {string} [opts.sortBy=createdAt]
 * @param {number} [opts.sortOrder=-1]
 * @returns {Promise<GmailAttachmentDocument[]>}
 */
GmailAttachmentSchema.statics.getByUser = function (userId, opts = {}) {
  const {
    limit = 50,
    skip = 0,
    status,
    bankName,
    sortBy = 'createdAt',
    sortOrder = -1,
  } = opts;

  const filter = { userId, isDeleted: false };
  if (status) filter.status = status;
  if (bankName) filter.bankName = bankName;

  return this.find(filter)
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)
    .populate('emailId', 'subject from date')
    .lean();
};

/**
 * Retrieve all attachments belonging to a specific email.
 *
 * @param {string|ObjectId} emailId
 * @returns {Promise<GmailAttachmentDocument[]>}
 */
GmailAttachmentSchema.statics.getByEmail = function (emailId) {
  return this.find({ emailId, isDeleted: false })
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Fetch attachments that are waiting to be processed, ordered by creation
 * date so older items are picked up first (FIFO).
 *
 * @param {Object} [opts]
 * @param {number} [opts.limit=20]         - Max items to return.
 * @param {number} [opts.maxRetries=3]     - Skip items that exceeded retries.
 * @param {number} [opts.stalledMs=300000] - Consider "processing" items stalled
 *                                           after this many ms (default 5 min).
 * @returns {Promise<GmailAttachmentDocument[]>}
 */
GmailAttachmentSchema.statics.getPendingProcessing = function (opts = {}) {
  const { limit = 20, maxRetries = 3, stalledMs = 5 * 60 * 1000 } = opts;

  const stalledBefore = new Date(Date.now() - stalledMs);

  return this.find({
    isDeleted: false,
    $or: [
      { status: 'pending' },
      { status: 'downloaded' },
      // Pick up items that failed but haven't exceeded retry limit
      { status: 'failed', retryCount: { $lt: maxRetries } },
      // Pick up stalled processing items
      { status: 'processing', processingStartedAt: { $lt: stalledBefore } },
    ],
  })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();
};

/**
 * Aggregate processing statistics for a user (or globally if userId is null).
 *
 * @param {string|ObjectId|null} userId - Scope stats to a user, or null for global.
 * @returns {Promise<Object>} Counts by status, avg processing duration, etc.
 */
GmailAttachmentSchema.statics.getProcessedStats = async function (userId = null) {
  const matchStage = { isDeleted: false };
  if (userId) matchStage.userId = new mongoose.Types.ObjectId(userId);

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalSize: { $sum: '$size' },
        avgProcessingDuration: { $avg: '$processingDuration' },
        totalTransactions: { $sum: { $size: { $ifNull: ['$transactions', []] } } },
      },
    },
  ];

  const results = await this.aggregate(pipeline);

  // Reshape into a friendlier object
  const stats = {
    total: 0,
    byStatus: {},
    totalSizeBytes: 0,
    avgProcessingDurationMs: null,
    totalTransactionsExtracted: 0,
  };

  let durationSum = 0;
  let durationCount = 0;

  for (const bucket of results) {
    stats.total += bucket.count;
    stats.totalSizeBytes += bucket.totalSize;
    stats.totalTransactionsExtracted += bucket.totalTransactions;
    stats.byStatus[bucket._id] = bucket.count;

    if (bucket.avgProcessingDuration != null) {
      durationSum += bucket.avgProcessingDuration * bucket.count;
      durationCount += bucket.count;
    }
  }

  if (durationCount > 0) {
    stats.avgProcessingDurationMs = Math.round(durationSum / durationCount);
  }

  return stats;
};

/**
 * Calculate storage usage per user, returning an array sorted by total bytes
 * descending.
 *
 * @param {Object} [opts]
 * @param {number} [opts.limit=25]
 * @returns {Promise<Array<{userId: ObjectId, totalBytes: number, fileCount: number, formattedSize: string}>>}
 */
GmailAttachmentSchema.statics.getStorageUsage = async function (opts = {}) {
  const { limit = 25 } = opts;

  const pipeline = [
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: '$userId',
        totalBytes: { $sum: '$size' },
        fileCount: { $sum: 1 },
      },
    },
    { $sort: { totalBytes: -1 } },
    { $limit: limit },
  ];

  const results = await this.aggregate(pipeline);

  // Attach a human-readable size string to each result
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  return results.map((r) => {
    const bytes = r.totalBytes;
    let formatted = '0 B';
    if (bytes > 0) {
      const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
      const val = bytes / Math.pow(1024, exp);
      formatted = `${val.toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
    }

    return {
      userId: r._id,
      totalBytes: bytes,
      fileCount: r.fileCount,
      formattedSize: formatted,
    };
  });
};

// ---------------------------------------------------------------------------
//  Middleware
// ---------------------------------------------------------------------------

/**
 * Pre-save: ensure expiresAt is set for failed attachments that have exhausted
 * retries, providing a 30-day TTL safety-net.
 */
GmailAttachmentSchema.pre('save', function (next) {
  if (this.status === 'failed' && this.retryCount >= 3 && !this.expiresAt) {
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    this.expiresAt = new Date(Date.now() + thirtyDays);
  }
  next();
});

/**
 * Pre-find: exclude soft-deleted documents by default unless the caller
 * explicitly includes `isDeleted` in the query filter.
 */
GmailAttachmentSchema.pre(/^find/, function (next) {
  const filter = this.getFilter();
  if (filter && filter.isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
  next();
});

// ---------------------------------------------------------------------------
//  Model export
// ---------------------------------------------------------------------------

const GmailAttachment = mongoose.models.GmailAttachment || mongoose.model('GmailAttachment', GmailAttachmentSchema);

module.exports = GmailAttachment;
