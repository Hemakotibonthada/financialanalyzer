// ============================================================================
// GmailEmail Model — Persistent local storage for Gmail financial emails
// ============================================================================
// Stores full email content, parsed metadata, extracted transactions,
// AI analysis results, and attachment references for offline access.
// ============================================================================

const mongoose = require('mongoose');

// ── Extracted Amount Sub-Schema ──
const extractedAmountSchema = new mongoose.Schema({
  value: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  type: { type: String, enum: ['debit', 'credit', 'unknown'], default: 'unknown' },
  description: { type: String },
  merchant: { type: String },
  category: { type: String },
  confidence: { type: Number, min: 0, max: 1, default: 0.5 },
  source: { type: String }, // 'subject', 'body', 'attachment'
  rawText: { type: String },
  position: { type: Number } // character position in email body
}, { _id: false });

// ── Attachment Sub-Schema ──
const attachmentSchema = new mongoose.Schema({
  attachmentId: { type: String }, // Gmail attachment ID
  filename: { type: String, required: true },
  mimeType: { type: String },
  size: { type: Number }, // bytes
  localPath: { type: String }, // local filesystem path
  isDownloaded: { type: Boolean, default: false },
  downloadedAt: { type: Date },
  isProcessed: { type: Boolean, default: false },
  processedAt: { type: Date },
  extractedData: { type: mongoose.Schema.Types.Mixed },
  processingError: { type: String },
  checksum: { type: String }, // MD5/SHA256 for dedup
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' } // linked Document record
}, { _id: true });

// ── UPI Details Sub-Schema ──
const upiDetailsSchema = new mongoose.Schema({
  upiId: { type: String }, // VPA like user@bank
  utrNumber: { type: String }, // Unique Transaction Reference
  transactionId: { type: String },
  payerName: { type: String },
  payeeName: { type: String },
  payerVpa: { type: String },
  payeeVpa: { type: String },
  app: { type: String }, // PhonePe, GPay, Paytm, etc.
  status: { type: String, enum: ['success', 'failed', 'pending', 'unknown'], default: 'unknown' },
  remarks: { type: String }
}, { _id: false });

// ── Bank Details Sub-Schema ──
const bankDetailsSchema = new mongoose.Schema({
  bankName: { type: String },
  accountNumber: { type: String }, // masked
  accountType: { type: String }, // savings, current, credit card
  ifscCode: { type: String },
  branchName: { type: String },
  availableBalance: { type: Number },
  currentBalance: { type: Number },
  statementPeriod: {
    from: { type: Date },
    to: { type: Date }
  },
  cardLast4: { type: String },
  cardType: { type: String } // visa, mastercard, rupay
}, { _id: false });

// ── AI Analysis Sub-Schema ──
const aiAnalysisSchema = new mongoose.Schema({
  category: { type: String }, // bank_alert, upi_payment, credit_card, investment, insurance, tax, salary, etc.
  subCategory: { type: String },
  sentiment: { type: String, enum: ['positive', 'negative', 'neutral', 'urgent'], default: 'neutral' },
  urgency: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
  financialImpact: { type: String, enum: ['income', 'expense', 'investment', 'transfer', 'info', 'alert'], default: 'info' },
  keywords: [{ type: String }],
  entities: [{
    type: { type: String }, // amount, date, account, merchant, upi_id
    value: { type: String },
    confidence: { type: Number }
  }],
  summary: { type: String }, // AI-generated one-line summary
  insights: [{ type: String }], // AI-generated insights
  riskFlags: [{ type: String }], // potential fraud/risk indicators
  actionRequired: { type: Boolean, default: false },
  actionDescription: { type: String },
  confidence: { type: Number, min: 0, max: 1, default: 0.5 },
  modelVersion: { type: String },
  analyzedAt: { type: Date },
  processingTimeMs: { type: Number }
}, { _id: false });

// ── Transaction Link Sub-Schema ──
const transactionLinkSchema = new mongoose.Schema({
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  amount: { type: Number },
  type: { type: String },
  category: { type: String },
  linkedAt: { type: Date, default: Date.now },
  autoCreated: { type: Boolean, default: false }
}, { _id: false });

// ══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ══════════════════════════════════════════════════════════════
const gmailEmailSchema = new mongoose.Schema({
  // ── Ownership ──
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ── Gmail Identifiers ──
  gmailMessageId: {
    type: String,
    required: true,
    index: true
  },
  threadId: { type: String, index: true },
  historyId: { type: String },
  labelIds: [{ type: String }],
  
  // ── Email Metadata ──
  from: {
    email: { type: String, required: true, index: true },
    name: { type: String }
  },
  to: [{
    email: { type: String },
    name: { type: String }
  }],
  cc: [{
    email: { type: String },
    name: { type: String }
  }],
  subject: { type: String, index: true },
  date: { type: Date, required: true, index: true },
  internalDate: { type: Number }, // Gmail internal date (epoch ms)
  snippet: { type: String }, // Gmail snippet (preview text)
  
  // ── Email Content ──
  bodyText: { type: String }, // plain text body
  bodyHtml: { type: String }, // HTML body
  bodyLength: { type: Number, default: 0 },
  headers: { type: mongoose.Schema.Types.Mixed }, // select headers
  
  // ── Classification ──
  emailType: {
    type: String,
    enum: [
      'bank_transaction_alert',
      'bank_statement',
      'credit_card_alert',
      'credit_card_statement',
      'upi_payment',
      'upi_collection',
      'wallet_transaction',
      'investment_alert',
      'investment_statement',
      'insurance_premium',
      'insurance_policy',
      'loan_emi',
      'loan_statement',
      'salary_credit',
      'salary_slip',
      'tax_document',
      'bill_payment',
      'recharge',
      'cashback',
      'reward_points',
      'account_update',
      'security_alert',
      'promotional',
      'other_financial',
      'unclassified'
    ],
    default: 'unclassified',
    index: true
  },
  
  // ── Sender Classification ──
  senderType: {
    type: String,
    enum: ['bank', 'upi_app', 'payment_gateway', 'investment_platform', 'insurance', 'government', 'employer', 'merchant', 'unknown'],
    default: 'unknown',
    index: true
  },
  senderInstitution: { type: String }, // e.g., 'HDFC Bank', 'PhonePe', 'Zerodha'
  
  // ── Extracted Financial Data ──
  extractedAmounts: [extractedAmountSchema],
  primaryAmount: { type: Number }, // main transaction amount
  primaryAmountType: { type: String, enum: ['debit', 'credit', 'unknown'] },
  
  // ── Parsed Details ──
  upiDetails: upiDetailsSchema,
  bankDetails: bankDetailsSchema,
  
  // ── Attachments ──
  attachments: [attachmentSchema],
  hasAttachments: { type: Boolean, default: false },
  attachmentCount: { type: Number, default: 0 },
  
  // ── AI Analysis ──
  aiAnalysis: aiAnalysisSchema,
  isAnalyzed: { type: Boolean, default: false, index: true },
  
  // ── Transaction Links ──
  linkedTransactions: [transactionLinkSchema],
  hasLinkedTransactions: { type: Boolean, default: false },
  autoTransactionCreated: { type: Boolean, default: false },
  
  // ── Processing Status ──
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'parsed', 'analyzed', 'completed', 'error', 'skipped'],
    default: 'pending',
    index: true
  },
  processingError: { type: String },
  processingAttempts: { type: Number, default: 0 },
  lastProcessedAt: { type: Date },
  
  // ── Flags ──
  isRead: { type: Boolean, default: false },
  isStarred: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  isDuplicate: { type: Boolean, default: false },
  duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'GmailEmail' },
  isImportant: { type: Boolean, default: false },
  requiresAttention: { type: Boolean, default: false },
  
  // ── User Actions ──
  userCategory: { type: String }, // user-override category
  userNotes: { type: String },
  userTags: [{ type: String }],
  userVerified: { type: Boolean, default: false }, // user confirmed parsed data is correct
  
  // ── Sync Metadata ──
  syncBatchId: { type: String },
  syncedAt: { type: Date, default: Date.now },
  lastUpdatedFromGmail: { type: Date }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ══════════════════════════════════════════════════════════════
// INDEXES
// ══════════════════════════════════════════════════════════════

// Unique: one email per user per Gmail message
gmailEmailSchema.index({ userId: 1, gmailMessageId: 1 }, { unique: true });

// Common query patterns
gmailEmailSchema.index({ userId: 1, date: -1 });
gmailEmailSchema.index({ userId: 1, emailType: 1, date: -1 });
gmailEmailSchema.index({ userId: 1, senderType: 1, date: -1 });
gmailEmailSchema.index({ userId: 1, processingStatus: 1 });
gmailEmailSchema.index({ userId: 1, isAnalyzed: 1 });
gmailEmailSchema.index({ userId: 1, hasLinkedTransactions: 1 });
gmailEmailSchema.index({ userId: 1, 'from.email': 1 });
gmailEmailSchema.index({ userId: 1, senderInstitution: 1, date: -1 });

// Text search index
gmailEmailSchema.index({
  subject: 'text',
  bodyText: 'text',
  snippet: 'text',
  'from.name': 'text',
  'from.email': 'text',
  senderInstitution: 'text'
}, {
  weights: {
    subject: 10,
    senderInstitution: 8,
    'from.name': 5,
    snippet: 3,
    bodyText: 1
  },
  name: 'gmail_email_text_search'
});

// TTL index — auto-delete very old unimportant emails after 2 years
// Only applies to unstarred, non-important emails
// gmailEmailSchema.index({ date: 1 }, { expireAfterSeconds: 63072000, partialFilterExpression: { isStarred: false, isImportant: false } });

// ══════════════════════════════════════════════════════════════
// VIRTUALS
// ══════════════════════════════════════════════════════════════

gmailEmailSchema.virtual('formattedDate').get(function() {
  if (!this.date) return 'Unknown';
  return this.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
});

gmailEmailSchema.virtual('formattedAmount').get(function() {
  if (!this.primaryAmount) return null;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(this.primaryAmount);
});

gmailEmailSchema.virtual('shortSubject').get(function() {
  if (!this.subject) return '(No Subject)';
  return this.subject.length > 80 ? this.subject.substring(0, 80) + '...' : this.subject;
});

gmailEmailSchema.virtual('senderDisplay').get(function() {
  return this.from?.name || this.from?.email || 'Unknown Sender';
});

gmailEmailSchema.virtual('totalExtractedAmount').get(function() {
  if (!this.extractedAmounts || this.extractedAmounts.length === 0) return 0;
  return this.extractedAmounts.reduce((sum, a) => {
    return sum + (a.type === 'credit' ? a.value : -a.value);
  }, 0);
});

// ══════════════════════════════════════════════════════════════
// STATIC METHODS
// ══════════════════════════════════════════════════════════════

/**
 * Upsert an email — insert or update if exists
 */
gmailEmailSchema.statics.upsertEmail = async function(userId, gmailMessageId, emailData) {
  return this.findOneAndUpdate(
    { userId, gmailMessageId },
    { $set: { ...emailData, userId, gmailMessageId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

/**
 * Get emails for a user with pagination and filters
 */
gmailEmailSchema.statics.getEmails = async function(userId, options = {}) {
  const {
    page = 1,
    limit = 50,
    sort = '-date',
    emailType,
    senderType,
    senderInstitution,
    dateFrom,
    dateTo,
    hasAttachments,
    isAnalyzed,
    processingStatus,
    search,
    minAmount,
    maxAmount,
    amountType
  } = options;

  const filter = { userId, isDeleted: { $ne: true } };

  if (emailType) filter.emailType = emailType;
  if (senderType) filter.senderType = senderType;
  if (senderInstitution) filter.senderInstitution = senderInstitution;
  if (hasAttachments !== undefined) filter.hasAttachments = hasAttachments;
  if (isAnalyzed !== undefined) filter.isAnalyzed = isAnalyzed;
  if (processingStatus) filter.processingStatus = processingStatus;

  if (dateFrom || dateTo) {
    filter.date = {};
    if (dateFrom) filter.date.$gte = new Date(dateFrom);
    if (dateTo) filter.date.$lte = new Date(dateTo);
  }

  if (minAmount || maxAmount) {
    filter.primaryAmount = {};
    if (minAmount) filter.primaryAmount.$gte = parseFloat(minAmount);
    if (maxAmount) filter.primaryAmount.$lte = parseFloat(maxAmount);
  }

  if (amountType) filter.primaryAmountType = amountType;

  if (search) {
    filter.$text = { $search: search };
  }

  const skip = (page - 1) * limit;
  const sortObj = {};
  const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
  sortObj[sortField] = sort.startsWith('-') ? -1 : 1;

  const [emails, total] = await Promise.all([
    this.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .select('-bodyHtml -headers')
      .lean(),
    this.countDocuments(filter)
  ]);

  return {
    emails,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
};

/**
 * Get email statistics for a user
 */
gmailEmailSchema.statics.getStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), isDeleted: { $ne: true } } },
    {
      $facet: {
        byType: [
          { $group: { _id: '$emailType', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        bySender: [
          { $group: { _id: '$senderInstitution', count: { $sum: 1 }, senderType: { $first: '$senderType' } } },
          { $sort: { count: -1 } },
          { $limit: 20 }
        ],
        byMonth: [
          {
            $group: {
              _id: { year: { $year: '$date' }, month: { $month: '$date' } },
              count: { $sum: 1 },
              totalDebit: {
                $sum: { $cond: [{ $eq: ['$primaryAmountType', 'debit'] }, '$primaryAmount', 0] }
              },
              totalCredit: {
                $sum: { $cond: [{ $eq: ['$primaryAmountType', 'credit'] }, '$primaryAmount', 0] }
              }
            }
          },
          { $sort: { '_id.year': -1, '_id.month': -1 } },
          { $limit: 12 }
        ],
        processingStats: [
          { $group: { _id: '$processingStatus', count: { $sum: 1 } } }
        ],
        totals: [
          {
            $group: {
              _id: null,
              totalEmails: { $sum: 1 },
              analyzedCount: { $sum: { $cond: ['$isAnalyzed', 1, 0] } },
              withTransactions: { $sum: { $cond: ['$hasLinkedTransactions', 1, 0] } },
              withAttachments: { $sum: { $cond: ['$hasAttachments', 1, 0] } },
              totalDebitAmount: {
                $sum: { $cond: [{ $eq: ['$primaryAmountType', 'debit'] }, '$primaryAmount', 0] }
              },
              totalCreditAmount: {
                $sum: { $cond: [{ $eq: ['$primaryAmountType', 'credit'] }, '$primaryAmount', 0] }
              },
              avgAmount: { $avg: '$primaryAmount' },
              oldestEmail: { $min: '$date' },
              newestEmail: { $max: '$date' }
            }
          }
        ]
      }
    }
  ]);

  return {
    byType: stats[0]?.byType || [],
    bySender: stats[0]?.bySender || [],
    byMonth: stats[0]?.byMonth || [],
    processingStats: stats[0]?.processingStats || [],
    totals: stats[0]?.totals?.[0] || {}
  };
};

/**
 * Get unprocessed emails for batch processing
 */
gmailEmailSchema.statics.getUnprocessed = async function(userId, limit = 100) {
  return this.find({
    userId,
    processingStatus: { $in: ['pending', 'error'] },
    processingAttempts: { $lt: 3 },
    isDeleted: { $ne: true }
  })
    .sort({ date: -1 })
    .limit(limit)
    .lean();
};

/**
 * Mark emails as analyzed in bulk
 */
gmailEmailSchema.statics.bulkUpdateAnalysis = async function(updates) {
  const operations = updates.map(({ emailId, analysis }) => ({
    updateOne: {
      filter: { _id: emailId },
      update: {
        $set: {
          aiAnalysis: analysis,
          isAnalyzed: true,
          processingStatus: 'analyzed',
          lastProcessedAt: new Date()
        }
      }
    }
  }));
  return this.bulkWrite(operations);
};

/**
 * Get sender frequency analysis
 */
gmailEmailSchema.statics.getSenderAnalysis = async function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), isDeleted: { $ne: true } } },
    {
      $group: {
        _id: '$from.email',
        senderName: { $first: '$from.name' },
        senderInstitution: { $first: '$senderInstitution' },
        senderType: { $first: '$senderType' },
        count: { $sum: 1 },
        firstEmail: { $min: '$date' },
        lastEmail: { $max: '$date' },
        emailTypes: { $addToSet: '$emailType' },
        totalDebit: {
          $sum: { $cond: [{ $eq: ['$primaryAmountType', 'debit'] }, '$primaryAmount', 0] }
        },
        totalCredit: {
          $sum: { $cond: [{ $eq: ['$primaryAmountType', 'credit'] }, '$primaryAmount', 0] }
        },
        avgAmount: { $avg: '$primaryAmount' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 50 }
  ]);
};

// ══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ══════════════════════════════════════════════════════════════

/**
 * Get a clean display-friendly version
 */
gmailEmailSchema.methods.toDisplayFormat = function() {
  return {
    id: this._id,
    gmailMessageId: this.gmailMessageId,
    from: this.senderDisplay,
    fromEmail: this.from?.email,
    subject: this.subject,
    shortSubject: this.shortSubject,
    date: this.date,
    formattedDate: this.formattedDate,
    snippet: this.snippet,
    emailType: this.emailType,
    senderType: this.senderType,
    senderInstitution: this.senderInstitution,
    primaryAmount: this.primaryAmount,
    primaryAmountType: this.primaryAmountType,
    formattedAmount: this.formattedAmount,
    hasAttachments: this.hasAttachments,
    attachmentCount: this.attachmentCount,
    isAnalyzed: this.isAnalyzed,
    hasLinkedTransactions: this.hasLinkedTransactions,
    isStarred: this.isStarred,
    isImportant: this.isImportant,
    requiresAttention: this.requiresAttention,
    aiSummary: this.aiAnalysis?.summary,
    aiCategory: this.aiAnalysis?.category,
    aiSentiment: this.aiAnalysis?.sentiment,
    processingStatus: this.processingStatus
  };
};

// ══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ══════════════════════════════════════════════════════════════

gmailEmailSchema.pre('save', function(next) {
  // Auto-compute attachment count
  if (this.attachments) {
    this.attachmentCount = this.attachments.length;
    this.hasAttachments = this.attachmentCount > 0;
  }
  
  // Auto-compute body length
  if (this.bodyText) {
    this.bodyLength = this.bodyText.length;
  }

  // Auto-set primary amount from extractedAmounts if not set
  if (!this.primaryAmount && this.extractedAmounts?.length > 0) {
    const sorted = [...this.extractedAmounts].sort((a, b) => b.value - a.value);
    this.primaryAmount = sorted[0].value;
    this.primaryAmountType = sorted[0].type;
  }

  // Auto-set hasLinkedTransactions
  if (this.linkedTransactions?.length > 0) {
    this.hasLinkedTransactions = true;
  }

  next();
});

const GmailEmail = mongoose.model('GmailEmail', gmailEmailSchema);

module.exports = GmailEmail;
