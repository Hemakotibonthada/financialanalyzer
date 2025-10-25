const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
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
  category: {
    type: String,
    required: true,
    enum: [
      'Food & Dining',
      'Shopping',
      'Bills & Utilities',
      'Transportation',
      'Entertainment',
      'Healthcare',
      'Education',
      'Housing',
      'Insurance',
      'Income',
      'Transfer',
      'Investment',
      'Other'
    ]
  },
  subcategory: String,
  merchant: String,
  type: {
    type: String,
    enum: ['debit', 'credit', 'transfer'],
    required: true
  },
  account: String,
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'bank_transfer', 'check', 'other']
  },
  tags: [String],
  notes: String,
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly']
    },
    nextDate: Date
  }
});

const chartSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['bar', 'pie', 'line', 'doughnut', 'area'],
    required: true
  },
  title: String,
  data: {
    labels: [String],
    datasets: [{
      label: String,
      data: [Number],
      backgroundColor: [String],
      borderColor: [String],
      borderWidth: Number
    }]
  },
  options: mongoose.Schema.Types.Mixed
});

const suggestionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['warning', 'info', 'success', 'tip', 'alert'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  category: String,
  impact: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  actionable: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  }
});

const financialAnalysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  profileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FinancialProfile'
  },
  title: {
    type: String,
    default: 'Financial Analysis Report'
  },
  description: String,
  sourceFiles: [{
    filename: String,
    originalName: String,
    size: Number,
    type: String,
    path: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  dateRange: {
    start: Date,
    end: Date
  },
  transactions: [transactionSchema],
  analysis: {
    totalSpent: {
      type: Number,
      default: 0
    },
    totalIncome: {
      type: Number,
      default: 0
    },
    netFlow: {
      type: Number,
      default: 0
    },
    transactionCount: {
      type: Number,
      default: 0
    },
    averageTransaction: {
      type: Number,
      default: 0
    },
    savingsRate: {
      type: Number,
      default: 0
    },
    topCategories: [{
      category: String,
      amount: Number,
      percentage: Number,
      transactionCount: Number,
      trend: String
    }],
    topMerchants: [{
      merchant: String,
      amount: Number,
      transactionCount: Number,
      category: String
    }],
    monthlyTrends: [{
      month: String,
      year: Number,
      totalSpent: Number,
      totalIncome: Number,
      netFlow: Number,
      categoryBreakdown: mongoose.Schema.Types.Mixed
    }],
    unusualSpikes: [{
      date: Date,
      amount: Number,
      category: String,
      description: String,
      deviationPercentage: Number
    }],
    recurringExpenses: [{
      description: String,
      amount: Number,
      frequency: String,
      category: String,
      nextDate: Date,
      confidence: Number
    }]
  },
  financialHealthScore: {
    overall: {
      type: Number,
      min: 0,
      max: 100
    },
    components: {
      savings: Number,
      debtRatio: Number,
      spendingControl: Number,
      incomeStability: Number,
      budgetCompliance: Number
    },
    rating: {
      type: String,
      enum: ['Excellent', 'Good', 'Fair', 'Poor', 'Critical']
    }
  },
  budgetComparison: {
    categories: [{
      category: String,
      budgeted: Number,
      actual: Number,
      difference: Number,
      percentage: Number,
      status: {
        type: String,
        enum: ['under', 'on-track', 'over', 'critical']
      }
    }]
  },
  charts: [chartSchema],
  aiInsights: {
    summary: String,
    keyFindings: [String],
    spendingPatterns: String,
    incomeAnalysis: String,
    cashFlowAnalysis: String,
    trendAnalysis: String,
    riskFactors: [String],
    opportunities: [String],
    categoryAnalysis: mongoose.Schema.Types.Mixed,
    projections: {
      nextMonth: String,
      quarterly: String,
      annual: String
    }
  },
  suggestions: [suggestionSchema],
  aiModel: {
    provider: {
      type: String,
      enum: ['ollama', 'openai']
    },
    model: String,
    version: String
  },
  processingStatus: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed'],
    default: 'queued'
  },
  processingTime: {
    type: Number,
    default: 0
  },
  error: {
    message: String,
    stack: String
  },
  metadata: {
    analysisVersion: {
      type: String,
      default: '1.0.0'
    },
    dataQuality: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: 'good'
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.8
    },
    processingSteps: [{
      step: String,
      status: String,
      timestamp: Date,
      duration: Number
    }]
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  sharedWith: [{
    userId: mongoose.Schema.Types.ObjectId,
    permissions: {
      type: String,
      enum: ['view', 'edit']
    }
  }]
}, {
  timestamps: true
});

// Indexes for better performance
financialAnalysisSchema.index({ userId: 1, createdAt: -1 });
financialAnalysisSchema.index({ processingStatus: 1 });
financialAnalysisSchema.index({ 'transactions.date': 1 });
financialAnalysisSchema.index({ 'transactions.category': 1 });
financialAnalysisSchema.index({ 'dateRange.start': 1, 'dateRange.end': 1 });

// Virtual for analysis age
financialAnalysisSchema.virtual('analysisAge').get(function() {
  return Date.now() - this.createdAt;
});

// Method to calculate basic statistics
financialAnalysisSchema.methods.calculateBasicStats = function() {
  const transactions = this.transactions;
  
  const totalSpent = transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  const totalIncome = transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const netFlow = totalIncome - totalSpent;
  const transactionCount = transactions.length;
  const averageTransaction = transactionCount > 0 ? totalSpent / transactionCount : 0;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpent) / totalIncome) * 100 : 0;
  
  this.analysis.totalSpent = totalSpent;
  this.analysis.totalIncome = totalIncome;
  this.analysis.netFlow = netFlow;
  this.analysis.transactionCount = transactionCount;
  this.analysis.averageTransaction = averageTransaction;
  this.analysis.savingsRate = savingsRate;
  
  return this.analysis;
};

const FinancialAnalysis = mongoose.model('FinancialAnalysis', financialAnalysisSchema);

module.exports = FinancialAnalysis;
