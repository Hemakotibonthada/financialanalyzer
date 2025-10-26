const mongoose = require('mongoose');

/**
 * Investment Model
 * Tracks all types of investments: Stocks, Mutual Funds, FDs, Bonds, Crypto, Gold, etc.
 */
const investmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Investment Type
  type: {
    type: String,
    enum: ['stock', 'mutual_fund', 'fd', 'rd', 'bond', 'crypto', 'gold', 'etf', 'sip', 'real_estate', 'ppf', 'nps', 'elss', 'other'],
    required: true,
    index: true
  },
  
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  symbol: {
    type: String, // Stock symbol, mutual fund code, etc.
    trim: true,
    uppercase: true,
    index: true
  },
  isin: {
    type: String, // International Securities Identification Number
    trim: true
  },
  
  // Purchase Details
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  purchasePrice: {
    type: Number,
    required: true,
    min: 0
  },
  purchaseDate: {
    type: Date,
    required: true,
    index: true
  },
  totalInvestedAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Current Market Value
  currentPrice: {
    type: Number,
    min: 0
  },
  currentValue: {
    type: Number,
    min: 0
  },
  lastUpdated: {
    type: Date
  },
  
  // Returns
  absoluteReturn: {
    type: Number,
    default: 0
  },
  returnPercentage: {
    type: Number,
    default: 0
  },
  xirr: { // Extended Internal Rate of Return
    type: Number
  },
  cagr: { // Compound Annual Growth Rate
    type: Number
  },
  
  // For SIP/Regular Investments
  isSIP: {
    type: Boolean,
    default: false
  },
  sipAmount: {
    type: Number,
    min: 0
  },
  sipFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
  },
  sipStartDate: {
    type: Date
  },
  sipEndDate: {
    type: Date
  },
  
  // Investment Details
  platform: {
    type: String, // Zerodha, Groww, ET Money, Bank, etc.
    trim: true
  },
  folio: {
    type: String, // Folio number for mutual funds
    trim: true
  },
  broker: {
    type: String,
    trim: true
  },
  
  // Tax Information
  ltcg: { // Long Term Capital Gains
    type: Number,
    default: 0
  },
  stcg: { // Short Term Capital Gains
    type: Number,
    default: 0
  },
  taxableAmount: {
    type: Number,
    default: 0
  },
  
  // Maturity Details (for FDs, Bonds, etc.)
  maturityDate: {
    type: Date
  },
  maturityAmount: {
    type: Number
  },
  interestRate: {
    type: Number,
    min: 0,
    max: 100
  },
  
  // Dividends and Returns
  dividends: [{
    amount: Number,
    date: Date,
    type: String // Regular, Interim, Special
  }],
  totalDividendsReceived: {
    type: Number,
    default: 0
  },
  
  // Risk and Category
  riskLevel: {
    type: String,
    enum: ['very_low', 'low', 'moderate', 'high', 'very_high'],
    default: 'moderate'
  },
  category: {
    type: String, // Equity, Debt, Hybrid, Balanced, etc.
    trim: true
  },
  subCategory: {
    type: String,
    trim: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'sold', 'matured', 'redeemed', 'closed'],
    default: 'active',
    index: true
  },
  
  // Sale/Exit Details
  soldDate: {
    type: Date
  },
  soldPrice: {
    type: Number
  },
  soldQuantity: {
    type: Number
  },
  realizableProfit: {
    type: Number
  },
  
  // Performance Metrics
  dayChange: {
    type: Number
  },
  weekChange: {
    type: Number
  },
  monthChange: {
    type: Number
  },
  yearChange: {
    type: Number
  },
  
  // Holdings History
  transactions: [{
    type: {
      type: String,
      enum: ['buy', 'sell', 'dividend', 'bonus', 'split', 'merger']
    },
    quantity: Number,
    price: Number,
    amount: Number,
    date: Date,
    notes: String
  }],
  
  // Additional Information
  notes: {
    type: String
  },
  tags: [{
    type: String,
    trim: true
  }],
  
  // Goals
  linkedGoal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FinancialGoal'
  },
  targetAmount: {
    type: Number
  },
  targetDate: {
    type: Date
  },
  
  // Auto-sync
  autoSync: {
    type: Boolean,
    default: false
  },
  syncSource: {
    type: String // API source for price updates
  },
  lastSyncedAt: {
    type: Date
  },
  
  // Documents
  documents: [{
    name: String,
    url: String,
    type: String, // Statement, Contract, Certificate
    uploadDate: Date
  }],
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
investmentSchema.index({ userId: 1, status: 1 });
investmentSchema.index({ userId: 1, type: 1 });
investmentSchema.index({ userId: 1, purchaseDate: -1 });
investmentSchema.index({ symbol: 1, status: 1 });
investmentSchema.index({ maturityDate: 1, status: 1 });

// Virtuals
investmentSchema.virtual('unrealizedProfitLoss').get(function() {
  if (this.status !== 'active') return 0;
  return (this.currentValue || 0) - this.totalInvestedAmount;
});

investmentSchema.virtual('daysHeld').get(function() {
  if (this.soldDate) {
    return Math.floor((this.soldDate - this.purchaseDate) / (1000 * 60 * 60 * 24));
  }
  return Math.floor((new Date() - this.purchaseDate) / (1000 * 60 * 60 * 24));
});

investmentSchema.virtual('isLongTerm').get(function() {
  return this.daysHeld > 365; // 1 year
});

// Methods
investmentSchema.methods.updateCurrentValue = function(currentPrice) {
  this.currentPrice = currentPrice;
  this.currentValue = this.quantity * currentPrice;
  this.absoluteReturn = this.currentValue - this.totalInvestedAmount;
  this.returnPercentage = ((this.absoluteReturn / this.totalInvestedAmount) * 100).toFixed(2);
  this.lastUpdated = new Date();
  return this.save();
};

investmentSchema.methods.recordTransaction = function(type, quantity, price, notes = '') {
  const transaction = {
    type,
    quantity,
    price,
    amount: quantity * price,
    date: new Date(),
    notes
  };
  
  this.transactions.push(transaction);
  
  if (type === 'buy') {
    this.quantity += quantity;
    this.totalInvestedAmount += transaction.amount;
  } else if (type === 'sell') {
    this.quantity -= quantity;
    if (this.quantity === 0) {
      this.status = 'sold';
      this.soldDate = new Date();
    }
  }
  
  return this.save();
};

investmentSchema.methods.calculateXIRR = function() {
  // Simplified XIRR calculation
  // For accurate XIRR, use a financial library
  if (this.transactions.length === 0) return 0;
  
  const totalInvested = this.totalInvestedAmount;
  const currentValue = this.currentValue || 0;
  const daysHeld = this.daysHeld || 1;
  const years = daysHeld / 365;
  
  if (years === 0 || totalInvested === 0) return 0;
  
  const xirr = ((Math.pow(currentValue / totalInvested, 1 / years) - 1) * 100).toFixed(2);
  this.xirr = parseFloat(xirr);
  return this.xirr;
};

investmentSchema.methods.calculateCAGR = function() {
  const years = this.daysHeld / 365;
  if (years === 0 || this.totalInvestedAmount === 0) return 0;
  
  const currentValue = this.currentValue || 0;
  const cagr = ((Math.pow(currentValue / this.totalInvestedAmount, 1 / years) - 1) * 100).toFixed(2);
  this.cagr = parseFloat(cagr);
  return this.cagr;
};

investmentSchema.methods.recordDividend = function(amount, type = 'Regular') {
  const dividend = {
    amount,
    date: new Date(),
    type
  };
  
  this.dividends.push(dividend);
  this.totalDividendsReceived = (this.totalDividendsReceived || 0) + amount;
  return this.save();
};

// Static methods
investmentSchema.statics.getPortfolioSummary = async function(userId) {
  const investments = await this.find({ userId, status: 'active' });
  
  const summary = {
    totalInvested: 0,
    currentValue: 0,
    absoluteReturn: 0,
    returnPercentage: 0,
    dayChange: 0,
    unrealizedProfitLoss: 0,
    totalDividends: 0,
    byType: {},
    topPerformers: [],
    worstPerformers: []
  };
  
  investments.forEach(inv => {
    summary.totalInvested += inv.totalInvestedAmount;
    summary.currentValue += inv.currentValue || 0;
    summary.totalDividends += inv.totalDividendsReceived || 0;
    summary.dayChange += inv.dayChange || 0;
    
    // Group by type
    if (!summary.byType[inv.type]) {
      summary.byType[inv.type] = {
        count: 0,
        invested: 0,
        current: 0,
        return: 0
      };
    }
    summary.byType[inv.type].count++;
    summary.byType[inv.type].invested += inv.totalInvestedAmount;
    summary.byType[inv.type].current += inv.currentValue || 0;
  });
  
  summary.absoluteReturn = summary.currentValue - summary.totalInvested;
  summary.returnPercentage = summary.totalInvested > 0 
    ? ((summary.absoluteReturn / summary.totalInvested) * 100).toFixed(2) 
    : 0;
  summary.unrealizedProfitLoss = summary.absoluteReturn;
  
  // Calculate returns by type
  Object.keys(summary.byType).forEach(type => {
    const data = summary.byType[type];
    data.return = ((data.current - data.invested) / data.invested * 100).toFixed(2);
  });
  
  // Top and worst performers
  const sorted = investments.sort((a, b) => b.returnPercentage - a.returnPercentage);
  summary.topPerformers = sorted.slice(0, 5);
  summary.worstPerformers = sorted.slice(-5).reverse();
  
  return summary;
};

investmentSchema.statics.getUpcomingMaturities = async function(userId, days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return await this.find({
    userId,
    status: 'active',
    maturityDate: {
      $gte: new Date(),
      $lte: futureDate
    }
  }).sort({ maturityDate: 1 });
};

// Pre-save middleware
investmentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate current value if price is available
  if (this.currentPrice && this.quantity) {
    this.currentValue = this.quantity * this.currentPrice;
    this.absoluteReturn = this.currentValue - this.totalInvestedAmount;
    this.returnPercentage = ((this.absoluteReturn / this.totalInvestedAmount) * 100).toFixed(2);
  }
  
  next();
});

const Investment = mongoose.model('Investment', investmentSchema);

module.exports = Investment;
