const mongoose = require('mongoose');
const encryptionService = require('../services/encryptionService');

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
    },
    debtFreedom: {
      autoSweep: {
        enabled: {
          type: Boolean,
          default: false
        },
        sweepPercentage: {
          type: Number,
          min: 0,
          max: 100,
          default: 0
        },
        updatedAt: {
          type: Date
        }
      },
      lateFeeShield: {
        enabled: {
          type: Boolean,
          default: false
        },
        notifyDaysBefore: {
          type: Number,
          min: 0,
          max: 31,
          default: 3
        },
        updatedAt: {
          type: Date
        }
      },
      emergencyFund: {
        currentAmount: {
          type: Number,
          min: 0,
          default: 0
        },
        goalAmount: {
          type: Number,
          min: 0,
          default: 0
        },
        contributions: [
          {
            amount: {
              type: Number,
              min: 0
            },
            date: {
              type: Date,
              default: Date.now
            },
            note: {
              type: String,
              trim: true,
              maxlength: 200
            }
          }
        ],
        updatedAt: {
          type: Date
        }
      }
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

// Indexes for efficient querying (userId already has unique index from schema)
financialProfileSchema.index({ 'gmailSettings.isConnected': 1 });
financialProfileSchema.index({ 'gmailSettings.lastSync': -1 });
financialProfileSchema.index({ isProfileComplete: 1 });

// Encrypt sensitive fields before saving
financialProfileSchema.pre('save', function(next) {
  try {
    // Encrypt PAN number if modified and not already encrypted
    if (this.isModified('panNumber') && this.panNumber && !encryptionService.isEncrypted(this.panNumber)) {
      this.panNumber = encryptionService.encrypt(this.panNumber);
    }

    // Encrypt OpenAI key if modified and not already encrypted
    if (this.isModified('preferences.openAIKey') && this.preferences.openAIKey && !encryptionService.isEncrypted(this.preferences.openAIKey)) {
      this.preferences.openAIKey = encryptionService.encrypt(this.preferences.openAIKey);
    }

    // Encrypt Gmail tokens if modified and not already encrypted
    if (this.isModified('gmailSettings.accessToken') && this.gmailSettings.accessToken && !encryptionService.isEncrypted(this.gmailSettings.accessToken)) {
      this.gmailSettings.accessToken = encryptionService.encrypt(this.gmailSettings.accessToken);
    }

    if (this.isModified('gmailSettings.refreshToken') && this.gmailSettings.refreshToken && !encryptionService.isEncrypted(this.gmailSettings.refreshToken)) {
      this.gmailSettings.refreshToken = encryptionService.encrypt(this.gmailSettings.refreshToken);
    }

    // Encrypt credit card numbers if modified and not already encrypted
    if (this.isModified('cibilData.creditCards')) {
      this.cibilData.creditCards.forEach((card, index) => {
        if (card.cardNumber && !encryptionService.isEncrypted(card.cardNumber)) {
          this.cibilData.creditCards[index].cardNumber = encryptionService.encrypt(card.cardNumber);
        }
      });
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Decrypt sensitive fields after finding
financialProfileSchema.post('find', function(docs) {
  docs.forEach(doc => decryptProfileFields(doc));
});

financialProfileSchema.post('findOne', function(doc) {
  if (doc) decryptProfileFields(doc);
});

financialProfileSchema.post('findOneAndUpdate', function(doc) {
  if (doc) decryptProfileFields(doc);
});

// Helper function to decrypt profile fields
function decryptProfileFields(doc) {
  try {
    // Decrypt PAN number
    if (doc.panNumber && encryptionService.isEncrypted(doc.panNumber)) {
      doc.panNumber = encryptionService.decrypt(doc.panNumber);
    }

    // Decrypt OpenAI key
    if (doc.preferences?.openAIKey && encryptionService.isEncrypted(doc.preferences.openAIKey)) {
      doc.preferences.openAIKey = encryptionService.decrypt(doc.preferences.openAIKey);
    }

    // Decrypt Gmail tokens
    if (doc.gmailSettings?.accessToken && encryptionService.isEncrypted(doc.gmailSettings.accessToken)) {
      doc.gmailSettings.accessToken = encryptionService.decrypt(doc.gmailSettings.accessToken);
    }

    if (doc.gmailSettings?.refreshToken && encryptionService.isEncrypted(doc.gmailSettings.refreshToken)) {
      doc.gmailSettings.refreshToken = encryptionService.decrypt(doc.gmailSettings.refreshToken);
    }

    // Decrypt credit card numbers
    if (doc.cibilData?.creditCards) {
      doc.cibilData.creditCards.forEach((card, index) => {
        if (card.cardNumber && encryptionService.isEncrypted(card.cardNumber)) {
          doc.cibilData.creditCards[index].cardNumber = encryptionService.decrypt(card.cardNumber);
        }
      });
    }
  } catch (error) {
    console.error('Error decrypting profile fields:', error);
    // Don't throw error, just log it
  }
}

// Method to get masked credit card numbers for display
financialProfileSchema.methods.getMaskedCardNumbers = function() {
  if (!this.cibilData?.creditCards) return [];
  
  return this.cibilData.creditCards.map(card => ({
    ...card.toObject(),
    cardNumber: card.cardNumber ? encryptionService.maskCardNumber(card.cardNumber) : null
  }));
};

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
