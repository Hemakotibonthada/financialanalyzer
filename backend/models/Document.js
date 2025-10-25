const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  originalFileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true,
    enum: ['pdf', 'xlsx', 'xls', 'csv', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'txt', 'json', 'html', 'eml', 'zip', 'rar', '7z', 'gif', 'bmp', 'tif', 'tiff', 'bin']
  },
  fileSize: {
    type: Number,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  source: {
    type: String,
    enum: ['upload', 'gmail', 'manual', 'gmail_email'],
    default: 'upload'
  },
  gmailMessageId: {
    type: String
  },
  category: {
    type: String,
    enum: [
      'bank_statement',
      'credit_card',
      'receipt',
      'invoice',
      'tax_document',
      'investment',
      'insurance',
      'upi_transaction',
      'upi_receipt',
      'email_record',
      'banking',
      'creditCards',
      'upiPayments',
      'mobileWallet',
      'investments',
      'taxes',
      'utilities',
      'loans',
      'receipts',
      'payroll',
      'expenses',
      'other'
    ],
    default: 'other'
  },
  isPasswordProtected: {
    type: Boolean,
    default: false
  },
  isProcessed: {
    type: Boolean,
    default: false
  },
  extractedText: {
    type: String
  },
  extractedData: {
    type: mongoose.Schema.Types.Mixed
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'password_required'],
    default: 'pending'
  },
  processingError: {
    type: String
  },
  passwordHints: [{
    source: String, // 'email_subject', 'email_body', 'manual'
    hint: String,
    extractedDate: Date
  }],
  metadata: {
    dateCreated: Date,
    dateModified: Date,
    author: String,
    subject: String,
    keywords: [String],
    emailSource: String,
    labels: [String],
    threadId: String
  },
  transactionCount: {
    type: Number,
    default: 0
  },
  analysisResults: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Analysis'
  }
}, {
  timestamps: true
});

// Index for efficient querying
documentSchema.index({ userId: 1, createdAt: -1 });
documentSchema.index({ userId: 1, category: 1 });
documentSchema.index({ userId: 1, isProcessed: 1 });
documentSchema.index({ gmailMessageId: 1 }, { sparse: true });

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;