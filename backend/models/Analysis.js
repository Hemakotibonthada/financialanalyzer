const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  analysisType: {
    type: String,
    enum: ['spending_analysis', 'budget_analysis', 'savings_projection', 'investment_review', 'debt_analysis'],
    required: true
  },
  period: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  documentsAnalyzed: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  transactionsAnalyzed: {
    type: Number,
    default: 0
  },
  summary: {
    totalIncome: {
      type: Number,
      default: 0
    },
    totalExpenses: {
      type: Number,
      default: 0
    },
    netSavings: {
      type: Number,
      default: 0
    },
    savingsRate: {
      type: Number,
      default: 0
    }
  },
  categoryBreakdown: [{
    category: String,
    amount: Number,
    percentage: Number,
    transactionCount: Number,
    trend: {
      type: String,
      enum: ['increasing', 'decreasing', 'stable']
    }
  }],
  insights: [{
    type: {
      type: String,
      enum: ['warning', 'suggestion', 'achievement', 'trend', 'anomaly']
    },
    title: String,
    description: String,
    impact: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    actionable: Boolean,
    suggestedAction: String
  }],
  recommendations: [{
    category: String,
    currentSpending: Number,
    recommendedSpending: Number,
    potentialSavings: Number,
    reasoning: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    timeframe: String
  }],
  futureProjections: {
    nextMonthPrediction: {
      expectedIncome: Number,
      expectedExpenses: Number,
      projectedSavings: Number
    },
    yearEndProjection: {
      totalIncome: Number,
      totalExpenses: Number,
      totalSavings: Number
    },
    goalProgress: {
      savingsGoalProgress: Number,
      budgetAdherence: Number,
      spendingEfficiency: Number
    }
  },
  aiProvider: {
    type: String,
    enum: ['ollama', 'openai'],
    required: true
  },
  aiModel: {
    type: String,
    required: true
  },
  processingTime: {
    type: Number, // in milliseconds
    default: 0
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  error: {
    type: String
  },
  metadata: {
    gmailSync: {
      attempted: { type: Boolean, default: false },
      successful: { type: Boolean, default: false },
      totalEmails: { type: Number, default: 0 },
      downloadedFiles: { type: Number, default: 0 },
      runDate: Date,
      errors: { type: Number, default: 0 },
      folderPath: String,
      downloadedFilesList: [mongoose.Schema.Types.Mixed]
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
analysisSchema.index({ userId: 1, createdAt: -1 });
analysisSchema.index({ userId: 1, analysisType: 1 });
analysisSchema.index({ userId: 1, status: 1 });

// Virtual for analysis age
analysisSchema.virtual('ageInDays').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Static method to get latest analysis by type
analysisSchema.statics.getLatestByType = function(userId, analysisType) {
  return this.findOne({
    userId,
    analysisType,
    status: 'completed'
  }).sort({ createdAt: -1 });
};

// Method to calculate overall score
analysisSchema.methods.getOverallScore = function() {
  let score = 0;
  let factors = 0;

  // Savings rate (40% weight)
  if (this.summary.savingsRate !== undefined) {
    score += Math.min(this.summary.savingsRate * 100, 100) * 0.4;
    factors += 0.4;
  }

  // Budget adherence (30% weight)
  if (this.futureProjections?.goalProgress?.budgetAdherence !== undefined) {
    score += this.futureProjections.goalProgress.budgetAdherence * 100 * 0.3;
    factors += 0.3;
  }

  // Spending efficiency (30% weight)
  if (this.futureProjections?.goalProgress?.spendingEfficiency !== undefined) {
    score += this.futureProjections.goalProgress.spendingEfficiency * 100 * 0.3;
    factors += 0.3;
  }

  return factors > 0 ? Math.round(score / factors) : 0;
};

const Analysis = mongoose.model('Analysis', analysisSchema);

module.exports = Analysis;