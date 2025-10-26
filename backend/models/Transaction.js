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
    enum: ['cash', 'Cash', 'card', 'Card', 'upi', 'UPI', 'bank_transfer', 'Bank Transfer', 'wallet', 'Wallet', 'net_banking', 'Net Banking', 'cheque', 'Cheque', 'imps', 'IMPS', 'neft', 'NEFT', 'rtgs', 'RTGS', 'other', 'Other'],
    default: 'other'
  },
  source: {
    type: String,
    enum: ['manual', 'upload', 'bank_statement', 'gmail_attachment', 'gmail_email', 'api', 'quick_entry', 'other'],
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

// Text index for full-text search
transactionSchema.index({ 
  description: 'text', 
  merchantName: 'text',
  'upi.payer': 'text',
  'upi.payee': 'text',
  notes: 'text',
  tags: 'text',
  category: 'text',
  subcategory: 'text',
  location: 'text'
}, {
  weights: {
    description: 10,
    merchantName: 8,
    'upi.payer': 6,
    'upi.payee': 6,
    notes: 4,
    category: 3,
    subcategory: 2,
    tags: 5,
    location: 2
  },
  name: 'transaction_text_search'
});

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

// Static method for full-text search
transactionSchema.statics.searchTransactions = async function(userId, searchQuery, options = {}) {
  const {
    limit = 50,
    skip = 0,
    sortBy = 'date',
    sortOrder = 'desc',
    filters = {}
  } = options;

  // Build the base query
  const query = {
    userId: new mongoose.Types.ObjectId(userId),
    $text: { $search: searchQuery }
  };

  // Apply additional filters
  if (filters.type) query.type = filters.type;
  if (filters.category) query.category = filters.category;
  if (filters.startDate || filters.endDate) {
    query.date = {};
    if (filters.startDate) query.date.$gte = new Date(filters.startDate);
    if (filters.endDate) query.date.$lte = new Date(filters.endDate);
  }
  if (filters.minAmount !== undefined) {
    query.amount = { ...query.amount, $gte: filters.minAmount };
  }
  if (filters.maxAmount !== undefined) {
    query.amount = { ...query.amount, $lte: filters.maxAmount };
  }

  // Execute search with text score
  const results = await this.find(query, {
    score: { $meta: 'textScore' }
  })
    .sort(sortBy === 'relevance' ? { score: { $meta: 'textScore' } } : { [sortBy]: sortOrder === 'desc' ? -1 : 1 })
    .skip(skip)
    .limit(limit);

  // Get total count for pagination
  const total = await this.countDocuments(query);

  return {
    results,
    total,
    page: Math.floor(skip / limit) + 1,
    pages: Math.ceil(total / limit)
  };
};

// Static method to get search suggestions
transactionSchema.statics.getSearchSuggestions = async function(userId, prefix, limit = 10) {
  const suggestions = new Set();
  
  // Search in descriptions
  const descriptions = await this.distinct('description', {
    userId: new mongoose.Types.ObjectId(userId),
    description: new RegExp(`^${prefix}`, 'i')
  }).limit(limit);
  descriptions.forEach(d => suggestions.add(d));
  
  // Search in merchant names
  const merchants = await this.distinct('merchantName', {
    userId: new mongoose.Types.ObjectId(userId),
    merchantName: new RegExp(`^${prefix}`, 'i')
  }).limit(limit);
  merchants.forEach(m => suggestions.add(m));
  
  // Search in categories
  const categories = await this.distinct('category', {
    userId: new mongoose.Types.ObjectId(userId),
    category: new RegExp(`^${prefix}`, 'i')
  }).limit(limit);
  categories.forEach(c => suggestions.add(c));
  
  return Array.from(suggestions).slice(0, limit);
};

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;