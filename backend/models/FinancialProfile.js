const mongoose = require('mongoose');

const financialProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  panNumber: {
    type: String,
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format']
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^[0-9]{10}$/, 'Invalid phone number format']
  },
  monthlyIncome: {
    type: Number,
    min: 0
  },
  incomeSource: {
    type: String,
    enum: ['manual', 'auto-detected', 'not-set'],
    default: 'not-set'
  },
  lastIncomeUpdate: {
    type: Date
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD']
  },
  preferences: {
    autoFetchDocuments: {
      type: Boolean,
      default: false
    },
    fetchFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
    aiProvider: {
      type: String,
      enum: ['ollama', 'openai'],
      default: 'ollama'
    },
    openAIKey: {
      type: String,
      select: false
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    budgetAlerts: {
      type: Boolean,
      default: true
    }
  },
  gmailSettings: {
    isConnected: {
      type: Boolean,
      default: false
    },
    email: String,
    lastSync: Date,
    lastFullSyncAt: Date,
    initialSyncCompleted: {
      type: Boolean,
      default: false
    },
    initialSyncStartedAt: Date,
    lastMessageInternalDate: Date,
    lastHistoryId: String,
    totalMessagesSynced: {
      type: Number,
      default: 0
    },
    lastAttachmentSyncCount: {
      type: Number,
      default: 0
    },
    accessToken: {
      type: String,
      select: false
    },
    refreshToken: {
      type: String,
      select: false
    },
    grantedScopes: {
      type: [String],
      default: []
    },
    lastReadMessageId: {
      type: String
    },
    lastReadAt: {
      type: Date
    },
    lastReadSummaryCount: {
      type: Number,
      default: 0
    }
  },
  budgetLimits: {
    type: Map,
    of: Number,
    default: new Map()
  },
  savingsGoal: {
    amount: {
      type: Number,
      default: 0
    },
    deadline: Date,
    description: String
  },
  customCategories: [{
    name: String,
    keywords: [String],
    color: String
  }],
  creditScore: {
    score: {
      type: Number,
      min: 300,
      max: 850
    },
    grade: String,
    lastUpdated: Date,
    panNumber: String, // Masked PAN for security
    factors: [{
      factor: String,
      impact: String, // 'positive' or 'negative'
      description: String
    }],
    recommendations: [{
      title: String,
      description: String,
      priority: String,
      category: String
    }],
    accounts: {
      total: Number,
      open: Number,
      closed: Number,
      active: Number,
      delinquent: Number
    },
    totalCreditLimit: Number,
    totalCredit: Number, // For compatibility
    availableCredit: Number, // For compatibility
    utilizationRatio: mongoose.Schema.Types.Mixed, // String or Number
    creditUtilization: Number,
    percentile: Number,
    isMockData: Boolean,
    creditCards: [{
      cardName: String,
      provider: String,
      cardType: String,
      cardNumber: String,
      status: String,
      creditLimit: Number,
      currentBalance: Number,
      availableLimit: Number,
      utilizationPercent: mongoose.Schema.Types.Mixed,
      interestRate: Number,
      rewardPoints: Number,
      annualFee: Number,
      issueDate: Date,
      expiryDate: Date,
      minAmountDue: Number,
      dueDate: Date,
      lastPaymentDate: Date,
      lastPaymentAmount: Number
    }],
    creditCardSummary: {
      totalCards: Number,
      activeCards: Number,
      totalCreditLimit: Number,
      totalCurrentBalance: Number,
      averageUtilization: mongoose.Schema.Types.Mixed,
      totalRewardPoints: Number
    },
    creditCardRecommendations: mongoose.Schema.Types.Mixed,
    creditHistory: [{
      month: String,
      score: Number,
      inquiries: Number,
      accounts: Number,
      utilization: mongoose.Schema.Types.Mixed
    }]
  },
  statistics: {
    totalAnalyses: {
      type: Number,
      default: 0
    },
    totalTransactions: {
      type: Number,
      default: 0
    },
    lastAnalysisDate: Date,
    averageMonthlySpending: {
      type: Number,
      default: 0
    }
  },
  expenseTemplates: [{
    _id: mongoose.Schema.Types.ObjectId,
    description: String,
    amount: Number,
    category: String,
    createdAt: Date
  }],
  isProfileComplete: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Check if profile is complete
financialProfileSchema.pre('save', function(next) {
  this.isProfileComplete = !!(
    this.fullName &&
    this.monthlyIncome &&
    this.preferences.aiProvider
  );
  next();
});

const FinancialProfile = mongoose.model('FinancialProfile', financialProfileSchema);

module.exports = FinancialProfile;
