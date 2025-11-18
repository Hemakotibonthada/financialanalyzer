const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  type: {
    type: String,
    enum: ['stocks', 'mutual_funds', 'bonds', 'mixed', 'crypto', 'commodities', 'custom'],
    default: 'mixed'
  },
  holdings: [{
    symbol: String,
    name: String,
    assetType: {
      type: String,
      enum: ['stock', 'etf', 'mutual_fund', 'bond', 'crypto', 'commodity', 'reit', 'gold', 'other']
    },
    quantity: Number,
    averagePrice: Number,
    currentPrice: Number,
    investedValue: Number,
    currentValue: Number,
    unrealizedGain: Number,
    unrealizedGainPercent: Number,
    dayChange: Number,
    dayChangePercent: Number,
    transactions: [{
      type: {
        type: String,
        enum: ['buy', 'sell', 'dividend', 'split', 'bonus', 'rights']
      },
      date: Date,
      quantity: Number,
      price: Number,
      amount: Number,
      charges: Number,
      notes: String
    }],
    dividends: [{
      date: Date,
      amount: Number,
      type: {
        type: String,
        enum: ['cash', 'stock']
      }
    }],
    allocation: Number, // Percentage of portfolio
    targetAllocation: Number,
    exchange: String,
    sector: String,
    industry: String,
    country: String,
    currency: String,
    isin: String,
    lastUpdated: Date
  }],
  performance: {
    totalInvested: Number,
    currentValue: Number,
    totalReturn: Number,
    totalReturnPercent: Number,
    realizedGains: Number,
    unrealizedGains: Number,
    dividendIncome: Number,
    xirr: Number,
    cagr: Number,
    sharpeRatio: Number,
    volatility: Number,
    maxDrawdown: Number,
    beta: Number,
    alpha: Number,
    historicalReturns: [{
      period: String, // '1D', '1W', '1M', '3M', '6M', '1Y', '3Y', '5Y', 'ALL'
      returnPercent: Number,
      returnAmount: Number
    }]
  },
  allocation: {
    byAssetType: [{
      type: String,
      percentage: Number,
      value: Number
    }],
    bySector: [{
      sector: String,
      percentage: Number,
      value: Number
    }],
    byCountry: [{
      country: String,
      percentage: Number,
      value: Number
    }],
    byCurrency: [{
      currency: String,
      percentage: Number,
      value: Number
    }]
  },
  targets: {
    targetReturn: Number,
    riskTolerance: {
      type: String,
      enum: ['conservative', 'moderate', 'aggressive', 'very_aggressive']
    },
    investmentHorizon: Number, // Years
    rebalancingFrequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'semi_annually', 'annually']
    },
    assetAllocationTargets: [{
      assetType: String,
      targetPercentage: Number,
      minPercentage: Number,
      maxPercentage: Number
    }]
  },
  benchmarks: [{
    name: String,
    symbol: String,
    type: String,
    returns: [{
      period: String,
      returnPercent: Number
    }]
  }],
  rebalancing: [{
    date: Date,
    reason: String,
    changes: [{
      symbol: String,
      action: String,
      quantity: Number,
      price: Number
    }],
    costOfRebalancing: Number,
    expectedImpact: String
  }],
  analysis: {
    diversificationScore: Number,
    riskScore: Number,
    qualityScore: Number,
    expenseRatio: Number,
    turnoverRatio: Number,
    concentrationRisk: {
      topHoldings: Number, // Percentage in top 5 holdings
      singleStockMax: Number
    },
    recommendations: [{
      type: String,
      priority: String,
      suggestion: String,
      impact: String
    }]
  },
  watchlist: [{
    symbol: String,
    name: String,
    assetType: String,
    currentPrice: Number,
    targetPrice: Number,
    reason: String,
    addedDate: Date
  }],
  alerts: [{
    type: {
      type: String,
      enum: ['price_target', 'percentage_change', 'value_change', 'rebalance_needed', 'dividend', 'custom']
    },
    condition: mongoose.Schema.Types.Mixed,
    isActive: Boolean,
    triggered: Boolean,
    triggeredAt: Date,
    notifications: [String] // email, push, sms
  }],
  tags: [String],
  isArchived: {
    type: Boolean,
    default: false
  },
  lastRebalanced: Date,
  nextRebalanceDate: Date
}, {
  timestamps: true
});

// Indexes
portfolioSchema.index({ userId: 1, isArchived: 1 });
portfolioSchema.index({ userId: 1, type: 1 });
portfolioSchema.index({ 'holdings.symbol': 1 });

// Methods
portfolioSchema.methods.calculatePerformance = function() {
  let totalInvested = 0;
  let currentValue = 0;
  let realizedGains = 0;
  let dividendIncome = 0;
  
  this.holdings.forEach(holding => {
    const invested = holding.quantity * holding.averagePrice;
    const current = holding.quantity * holding.currentPrice;
    
    totalInvested += invested;
    currentValue += current;
    
    // Calculate unrealized gains
    holding.unrealizedGain = current - invested;
    holding.unrealizedGainPercent = ((current - invested) / invested) * 100;
    holding.currentValue = current;
    holding.investedValue = invested;
    
    // Sum dividends
    if (holding.dividends) {
      const divs = holding.dividends.reduce((sum, div) => sum + div.amount, 0);
      dividendIncome += divs;
    }
    
    // Calculate realized gains from sell transactions
    const sells = holding.transactions.filter(t => t.type === 'sell');
    sells.forEach(sell => {
      const sellValue = sell.quantity * sell.price;
      const costBasis = sell.quantity * holding.averagePrice;
      realizedGains += (sellValue - costBasis);
    });
  });
  
  const totalGains = (currentValue - totalInvested) + realizedGains + dividendIncome;
  
  this.performance.totalInvested = totalInvested;
  this.performance.currentValue = currentValue;
  this.performance.unrealizedGains = currentValue - totalInvested;
  this.performance.realizedGains = realizedGains;
  this.performance.dividendIncome = dividendIncome;
  this.performance.totalReturn = totalGains;
  this.performance.totalReturnPercent = totalInvested > 0 ? (totalGains / totalInvested) * 100 : 0;
  
  return this.performance;
};

portfolioSchema.methods.calculateXIRR = function() {
  // Simplified XIRR calculation using Newton-Raphson method
  const cashFlows = [];
  
  // Add all buy transactions as negative cash flows
  this.holdings.forEach(holding => {
    holding.transactions.forEach(txn => {
      if (txn.type === 'buy') {
        cashFlows.push({
          date: txn.date,
          amount: -(txn.amount + (txn.charges || 0))
        });
      } else if (txn.type === 'sell') {
        cashFlows.push({
          date: txn.date,
          amount: txn.amount - (txn.charges || 0)
        });
      }
    });
    
    // Add dividends as positive cash flows
    if (holding.dividends) {
      holding.dividends.forEach(div => {
        cashFlows.push({
          date: div.date,
          amount: div.amount
        });
      });
    }
  });
  
  // Add current value as final cash flow
  cashFlows.push({
    date: new Date(),
    amount: this.performance.currentValue
  });
  
  // Sort by date
  cashFlows.sort((a, b) => a.date - b.date);
  
  if (cashFlows.length < 2) {
    return 0;
  }
  
  // Simplified XIRR - using approximate annual return
  const firstDate = cashFlows[0].date;
  const lastDate = cashFlows[cashFlows.length - 1].date;
  const years = (lastDate - firstDate) / (365 * 24 * 60 * 60 * 1000);
  
  if (years === 0) return 0;
  
  const invested = Math.abs(cashFlows.filter(cf => cf.amount < 0).reduce((sum, cf) => sum + cf.amount, 0));
  const returned = cashFlows.filter(cf => cf.amount > 0).reduce((sum, cf) => sum + cf.amount, 0);
  
  const xirr = (Math.pow(returned / invested, 1 / years) - 1) * 100;
  
  this.performance.xirr = xirr;
  return xirr;
};

portfolioSchema.methods.calculateAllocation = function() {
  const total = this.performance.currentValue;
  
  if (total === 0) return;
  
  // By asset type
  const byAssetType = {};
  const bySector = {};
  const byCountry = {};
  const byCurrency = {};
  
  this.holdings.forEach(holding => {
    const value = holding.currentValue || 0;
    const percentage = (value / total) * 100;
    
    // Update holding allocation
    holding.allocation = percentage;
    
    // Asset type
    const assetType = holding.assetType || 'other';
    byAssetType[assetType] = (byAssetType[assetType] || 0) + value;
    
    // Sector
    if (holding.sector) {
      bySector[holding.sector] = (bySector[holding.sector] || 0) + value;
    }
    
    // Country
    const country = holding.country || 'Unknown';
    byCountry[country] = (byCountry[country] || 0) + value;
    
    // Currency
    const currency = holding.currency || 'INR';
    byCurrency[currency] = (byCurrency[currency] || 0) + value;
  });
  
  // Convert to arrays
  this.allocation.byAssetType = Object.entries(byAssetType).map(([type, value]) => ({
    type,
    value,
    percentage: (value / total) * 100
  }));
  
  this.allocation.bySector = Object.entries(bySector).map(([sector, value]) => ({
    sector,
    value,
    percentage: (value / total) * 100
  }));
  
  this.allocation.byCountry = Object.entries(byCountry).map(([country, value]) => ({
    country,
    value,
    percentage: (value / total) * 100
  }));
  
  this.allocation.byCurrency = Object.entries(byCurrency).map(([currency, value]) => ({
    currency,
    value,
    percentage: (value / total) * 100
  }));
};

portfolioSchema.methods.analyzeRisk = function() {
  const holdings = this.holdings;
  
  // Diversification score
  const numHoldings = holdings.length;
  let diversificationScore = 0;
  
  if (numHoldings >= 20) diversificationScore = 100;
  else if (numHoldings >= 15) diversificationScore = 85;
  else if (numHoldings >= 10) diversificationScore = 70;
  else if (numHoldings >= 5) diversificationScore = 50;
  else diversificationScore = 30;
  
  // Concentration risk
  const sorted = [...holdings].sort((a, b) => (b.allocation || 0) - (a.allocation || 0));
  const top5Percentage = sorted.slice(0, 5).reduce((sum, h) => sum + (h.allocation || 0), 0);
  const maxSingle = sorted[0]?.allocation || 0;
  
  // Risk score (lower is better)
  let riskScore = 50;
  if (top5Percentage > 70) riskScore += 30;
  else if (top5Percentage > 50) riskScore += 20;
  else if (top5Percentage > 30) riskScore += 10;
  
  if (maxSingle > 25) riskScore += 20;
  else if (maxSingle > 15) riskScore += 10;
  
  this.analysis.diversificationScore = diversificationScore;
  this.analysis.riskScore = riskScore;
  this.analysis.concentrationRisk = {
    topHoldings: top5Percentage,
    singleStockMax: maxSingle
  };
  
  // Generate recommendations
  this.analysis.recommendations = [];
  
  if (numHoldings < 10) {
    this.analysis.recommendations.push({
      type: 'diversification',
      priority: 'high',
      suggestion: 'Add more holdings to improve diversification',
      impact: 'Reduce portfolio risk'
    });
  }
  
  if (top5Percentage > 50) {
    this.analysis.recommendations.push({
      type: 'concentration',
      priority: 'high',
      suggestion: 'Top 5 holdings represent more than 50% of portfolio',
      impact: 'Rebalance to reduce concentration risk'
    });
  }
  
  if (maxSingle > 20) {
    this.analysis.recommendations.push({
      type: 'position_size',
      priority: 'medium',
      suggestion: `Largest position (${maxSingle.toFixed(1)}%) exceeds recommended 20% limit`,
      impact: 'Consider reducing position size'
    });
  }
  
  return this.analysis;
};

portfolioSchema.methods.suggestRebalancing = function() {
  const suggestions = [];
  
  if (!this.targets.assetAllocationTargets || this.targets.assetAllocationTargets.length === 0) {
    return suggestions;
  }
  
  const currentAllocation = this.allocation.byAssetType;
  
  this.targets.assetAllocationTargets.forEach(target => {
    const current = currentAllocation.find(a => a.type === target.assetType);
    const currentPercentage = current ? current.percentage : 0;
    
    if (currentPercentage < target.minPercentage || currentPercentage > target.maxPercentage) {
      const difference = target.targetPercentage - currentPercentage;
      const action = difference > 0 ? 'buy' : 'sell';
      const amount = Math.abs(difference * this.performance.currentValue / 100);
      
      suggestions.push({
        assetType: target.assetType,
        action,
        currentPercentage: currentPercentage.toFixed(2),
        targetPercentage: target.targetPercentage,
        differencePercentage: difference.toFixed(2),
        amount: amount.toFixed(2),
        reason: `Current allocation ${action === 'buy' ? 'below' : 'above'} target range`
      });
    }
  });
  
  return suggestions;
};

// Static methods
portfolioSchema.statics.getUserPortfolioSummary = async function(userId) {
  const portfolios = await this.find({ userId, isArchived: false });
  
  let totalValue = 0;
  let totalInvested = 0;
  let totalGains = 0;
  
  portfolios.forEach(portfolio => {
    portfolio.calculatePerformance();
    totalValue += portfolio.performance.currentValue;
    totalInvested += portfolio.performance.totalInvested;
    totalGains += portfolio.performance.totalReturn;
  });
  
  return {
    portfolioCount: portfolios.length,
    totalValue,
    totalInvested,
    totalGains,
    totalGainsPercent: totalInvested > 0 ? (totalGains / totalInvested) * 100 : 0,
    portfolios: portfolios.map(p => ({
      id: p._id,
      name: p.name,
      type: p.type,
      value: p.performance.currentValue,
      returns: p.performance.totalReturnPercent
    }))
  };
};

const Portfolio = mongoose.model('Portfolio', portfolioSchema);

module.exports = Portfolio;
