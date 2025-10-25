const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: false
  },
  date: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  type: {
    type: String,
    enum: ['debit', 'credit', 'transfer'],
    required: true
  },
  category: {
    type: String,
    trim: true,
    default: 'other'
  },
  subcategory: {
    type: String
  },
  merchantName: {
    type: String,
    trim: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'bank_transfer', 'wallet', 'net_banking', 'cheque', 'other'],
    default: 'other'
  },
  source: {
    type: String,
    enum: ['manual', 'upload', 'gmail_attachment', 'gmail_email', 'api', 'quick_entry', 'other'],
    default: 'upload'
  },
  location: {
    type: String,
    trim: true
  },
  accountNumber: {
    type: String,
    sparse: true
  },
  referenceNumber: {
    type: String,
    sparse: true
  },
  balance: {
    type: Number
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
    },
    nextExpectedDate: Date
  },
  tags: [String],
  notes: {
    type: String
  },
  upi: {
    vpa: String,
    utr: String,
    reference: String,
    app: String,
    payer: String,
    payee: String
  },
  emailMetadata: mongoose.Schema.Types.Mixed,
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  aiProcessed: {
    type: Boolean,
    default: false
  },
  extractionMethod: {
    type: String,
    enum: ['ocr', 'pdf_text', 'csv_parse', 'manual', 'ai_enhanced'],
    default: 'ocr'
  },
  // AI enhancement fields
  aiEnhancements: {
    detectedCategory: String,
    detectedMerchant: String,
    confidenceScore: Number,
    tags: [String],
    enhancementTimestamp: Date,
    sourceLine: Number,
    rawText: String
  },
  // Additional AI fields from legacy schema
  ai_category: String,
  ai_confidence: Number,
  ai_tags: [String],
  merchant: String,
  // Processing metadata
  processingMetadata: {
    documentType: String,
    extractionPatterns: [String],
    validationIssues: [String],
    enhancementApplied: Boolean
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });
transactionSchema.index({ documentId: 1 });

// Virtual for formatted amount
transactionSchema.virtual('formattedAmount').get(function() {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency
  });
  return formatter.format(this.amount);
});

// Static method to get spending by category
transactionSchema.statics.getSpendingByCategory = function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: 'debit',
        date: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }
    },
    {
      $sort: { totalAmount: -1 }
    }
  ]);
};

// Static method to get monthly spending trend
transactionSchema.statics.getMonthlyTrend = function(userId, months = 6) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: 'debit',
        date: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' }
        },
        totalSpent: { $sum: '$amount' },
        transactionCount: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);
};

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;