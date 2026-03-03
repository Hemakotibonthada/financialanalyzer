// ============================================================================
// Financial Insights Aggregation Service — Deep financial analytics
// ============================================================================
// Provides: spending trends, income analysis, savings rate tracking,
// peer comparison estimates, financial ratios, and actionable insights.
// ============================================================================

const logger = require('../utils/logger');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const EMI = require('../models/EMI');
const Investment = require('../models/Investment');
const FinancialGoal = require('../models/FinancialGoal');
const BankAccount = require('../models/BankAccount');
const Debt = require('../models/Debt');

// ─── Monthly Trends ────────────────────────────────────────────────
async function getMonthlyTrends(userId, months = 12) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const pipeline = [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: { year: { $year: '$date' }, month: { $month: '$date' }, type: '$type' },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
        avg: { $avg: '$amount' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ];

  const results = await Transaction.aggregate(pipeline);

  // Organize by month
  const monthlyData = {};
  results.forEach(r => {
    const key = `${r._id.year}-${String(r._id.month).padStart(2, '0')}`;
    if (!monthlyData[key]) monthlyData[key] = { month: key, income: 0, expenses: 0, incomeCount: 0, expenseCount: 0 };
    if (['credit', 'income'].includes(r._id.type)) {
      monthlyData[key].income += r.total;
      monthlyData[key].incomeCount += r.count;
    } else {
      monthlyData[key].expenses += r.total;
      monthlyData[key].expenseCount += r.count;
    }
  });

  const sorted = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

  // Calculate trends
  sorted.forEach((m, i) => {
    m.savings = m.income - m.expenses;
    m.savingsRate = m.income > 0 ? ((m.savings / m.income) * 100) : 0;
    if (i > 0) {
      const prev = sorted[i - 1];
      m.expenseChange = prev.expenses > 0 ? ((m.expenses - prev.expenses) / prev.expenses * 100) : 0;
      m.incomeChange = prev.income > 0 ? ((m.income - prev.income) / prev.income * 100) : 0;
    }
  });

  return { trends: sorted, months: sorted.length, period: { from: startDate, to: new Date() } };
}

// ─── Category Deep Dive ─────────────────────────────────────────────
async function getCategoryInsights(userId, months = 6) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const pipeline = [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: { $in: ['debit', 'expense'] },
        date: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: { category: '$category', month: { $month: '$date' }, year: { $year: '$date' } },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ];

  const results = await Transaction.aggregate(pipeline);

  // Organize by category
  const categories = {};
  results.forEach(r => {
    const cat = r._id.category || 'Other';
    if (!categories[cat]) categories[cat] = { category: cat, totalSpent: 0, monthlyData: [], avgMonthly: 0 };
    categories[cat].totalSpent += r.total;
    categories[cat].monthlyData.push({
      month: `${r._id.year}-${String(r._id.month).padStart(2, '0')}`,
      amount: r.total,
      count: r.count,
    });
  });

  // Calculate category-level metrics
  Object.values(categories).forEach(cat => {
    const monthCount = cat.monthlyData.length || 1;
    cat.avgMonthly = cat.totalSpent / monthCount;

    // Trend (slope of monthly spending)
    if (cat.monthlyData.length >= 3) {
      const amounts = cat.monthlyData.map(m => m.amount);
      const n = amounts.length;
      const sumX = n * (n - 1) / 2;
      const sumY = amounts.reduce((a, b) => a + b, 0);
      const sumXY = amounts.reduce((a, v, i) => a + i * v, 0);
      const sumX2 = n * (n - 1) * (2 * n - 1) / 6;
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      cat.trend = slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable';
      cat.trendStrength = Math.abs(slope / (cat.avgMonthly || 1));
    } else {
      cat.trend = 'insufficient_data';
    }
  });

  const sorted = Object.values(categories).sort((a, b) => b.totalSpent - a.totalSpent);
  const grandTotal = sorted.reduce((s, c) => s + c.totalSpent, 0);
  sorted.forEach(c => { c.percentOfTotal = grandTotal > 0 ? (c.totalSpent / grandTotal * 100) : 0; });

  return { categories: sorted, grandTotal, months, topCategory: sorted[0]?.category || 'N/A' };
}

// ─── Financial Ratios ───────────────────────────────────────────────
async function getFinancialRatios(userId) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [transactions, emis, debts, investments, accounts] = await Promise.all([
    Transaction.find({ userId: new mongoose.Types.ObjectId(userId), date: { $gte: sixMonthsAgo } }).lean(),
    EMI.find({ userId: new mongoose.Types.ObjectId(userId), status: { $in: ['active', 'Active'] } }).lean(),
    Debt.find({ userId: new mongoose.Types.ObjectId(userId) }).lean().catch(() => []),
    Investment.find({ userId: new mongoose.Types.ObjectId(userId) }).lean(),
    BankAccount.find({ userId: new mongoose.Types.ObjectId(userId) }).lean().catch(() => []),
  ]);

  const monthlyIncome = transactions
    .filter(t => ['credit', 'income'].includes(t.type))
    .reduce((s, t) => s + (t.amount || 0), 0) / 6;

  const monthlyExpenses = transactions
    .filter(t => ['debit', 'expense'].includes(t.type))
    .reduce((s, t) => s + (t.amount || 0), 0) / 6;

  const monthlyEMI = emis.reduce((s, e) => s + (e.emiAmount || 0), 0);
  const totalDebt = debts.reduce((s, d) => s + (d.amount || d.totalAmount || d.remainingAmount || 0), 0)
    + emis.reduce((s, e) => s + (e.remainingAmount || e.loanAmount || 0), 0);
  const totalAssets = accounts.reduce((s, a) => s + (a.balance || 0), 0)
    + investments.reduce((s, i) => s + (i.currentValue || 0), 0);
  const totalInvested = investments.reduce((s, i) => s + (i.totalInvestedAmount || i.investedAmount || 0), 0);
  const totalCurrentValue = investments.reduce((s, i) => s + (i.currentValue || 0), 0);

  const ratios = {
    savingsRate: monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome * 100) : 0,
    debtToIncome: monthlyIncome > 0 ? (monthlyEMI / monthlyIncome * 100) : 0,
    emergencyFund: monthlyExpenses > 0 ? (accounts.reduce((s, a) => s + (a.balance || 0), 0) / monthlyExpenses) : 0,
    netWorth: totalAssets - totalDebt,
    debtToAsset: totalAssets > 0 ? (totalDebt / totalAssets * 100) : 0,
    investmentReturn: totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested * 100) : 0,
    expenseToIncome: monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome * 100) : 0,
    investmentRate: monthlyIncome > 0 ? (totalInvested / (monthlyIncome * 6) * 100) : 0,
  };

  // Benchmarks and ratings
  const ratings = {
    savingsRate: ratios.savingsRate >= 30 ? 'excellent' : ratios.savingsRate >= 20 ? 'good' : ratios.savingsRate >= 10 ? 'fair' : 'poor',
    debtToIncome: ratios.debtToIncome <= 20 ? 'excellent' : ratios.debtToIncome <= 36 ? 'good' : ratios.debtToIncome <= 50 ? 'fair' : 'poor',
    emergencyFund: ratios.emergencyFund >= 6 ? 'excellent' : ratios.emergencyFund >= 3 ? 'good' : ratios.emergencyFund >= 1 ? 'fair' : 'poor',
    debtToAsset: ratios.debtToAsset <= 20 ? 'excellent' : ratios.debtToAsset <= 40 ? 'good' : ratios.debtToAsset <= 60 ? 'fair' : 'poor',
  };

  return { ratios, ratings, metrics: { monthlyIncome, monthlyExpenses, monthlyEMI, totalDebt, totalAssets, totalInvested, totalCurrentValue } };
}

// ─── Spending Velocity (daily spending rate) ────────────────────────
async function getSpendingVelocity(userId, days = 30) {
  const startDate = new Date(Date.now() - days * 86400000);

  const pipeline = [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: { $in: ['debit', 'expense'] },
        date: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const dailySpending = await Transaction.aggregate(pipeline);

  const amounts = dailySpending.map(d => d.total);
  const totalSpent = amounts.reduce((a, b) => a + b, 0);
  const avgDaily = amounts.length > 0 ? totalSpent / amounts.length : 0;
  const maxDay = dailySpending.reduce((max, d) => d.total > (max?.total || 0) ? d : max, null);
  const minDay = dailySpending.reduce((min, d) => d.total < (min?.total || Infinity) ? d : min, null);

  // Calculate if spending is accelerating
  if (amounts.length >= 7) {
    const firstHalf = amounts.slice(0, Math.floor(amounts.length / 2));
    const secondHalf = amounts.slice(Math.floor(amounts.length / 2));
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    var acceleration = avgSecond - avgFirst;
    var accelerationPercent = avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst * 100) : 0;
    var trend = accelerationPercent > 10 ? 'accelerating' : accelerationPercent < -10 ? 'decelerating' : 'steady';
  }

  // Project month-end spending
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dayOfMonth = new Date().getDate();
  const projectedMonthly = avgDaily * daysInMonth;

  return {
    dailyData: dailySpending,
    avgDaily: Math.round(avgDaily),
    totalSpent: Math.round(totalSpent),
    highestDay: maxDay,
    lowestDay: minDay,
    trend: trend || 'insufficient_data',
    acceleration: Math.round(acceleration || 0),
    accelerationPercent: Math.round(accelerationPercent || 0),
    projectedMonthly: Math.round(projectedMonthly),
    daysRemaining: daysInMonth - dayOfMonth,
  };
}

// ─── Merchant Analysis ──────────────────────────────────────────────
async function getMerchantAnalysis(userId, months = 6) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const pipeline = [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: { $in: ['debit', 'expense'] },
        date: { $gte: startDate },
        $or: [
          { merchant: { $exists: true, $ne: '' } },
          { description: { $exists: true, $ne: '' } },
        ],
      },
    },
    {
      $group: {
        _id: { $ifNull: ['$merchant', '$description'] },
        totalSpent: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' },
        lastDate: { $max: '$date' },
        firstDate: { $min: '$date' },
        categories: { $addToSet: '$category' },
      },
    },
    { $sort: { totalSpent: -1 } },
    { $limit: 50 },
  ];

  const merchants = await Transaction.aggregate(pipeline);

  // Identify frequent vs occasional merchants
  merchants.forEach(m => {
    const span = (new Date(m.lastDate) - new Date(m.firstDate)) / 86400000;
    m.frequency = m.count > 1 && span > 0 ? (m.count / (span / 30)).toFixed(1) + '/month' : 'one-time';
    m.merchant = m._id;
    delete m._id;
  });

  return { merchants, topMerchant: merchants[0]?.merchant || 'N/A', totalMerchants: merchants.length };
}

// ─── Comprehensive Insights Dashboard ───────────────────────────────
async function getComprehensiveInsights(userId) {
  try {
    const [trends, categories, ratios, velocity, merchants] = await Promise.allSettled([
      getMonthlyTrends(userId, 12),
      getCategoryInsights(userId, 6),
      getFinancialRatios(userId),
      getSpendingVelocity(userId, 30),
      getMerchantAnalysis(userId, 6),
    ]);

    // Generate actionable insights
    const insights = [];
    const r = ratios.status === 'fulfilled' ? ratios.value : null;
    const v = velocity.status === 'fulfilled' ? velocity.value : null;
    const c = categories.status === 'fulfilled' ? categories.value : null;

    if (r?.ratings?.savingsRate === 'poor') {
      insights.push({ type: 'warning', title: 'Low Savings Rate', message: `Your savings rate is ${r.ratios.savingsRate.toFixed(1)}%. Aim for at least 20%.`, priority: 'high' });
    }
    if (r?.ratings?.debtToIncome === 'poor') {
      insights.push({ type: 'critical', title: 'High Debt Burden', message: `Debt payments consume ${r.ratios.debtToIncome.toFixed(1)}% of your income. Consider debt consolidation.`, priority: 'critical' });
    }
    if (r?.ratings?.emergencyFund === 'poor') {
      insights.push({ type: 'warning', title: 'Insufficient Emergency Fund', message: `You have ${r.ratios.emergencyFund.toFixed(1)} months of expenses saved. Target 6 months.`, priority: 'high' });
    }
    if (v?.trend === 'accelerating') {
      insights.push({ type: 'warning', title: 'Spending Accelerating', message: `Your daily spending is increasing by ${v.accelerationPercent}%. Projected ₹${v.projectedMonthly.toLocaleString('en-IN')} this month.`, priority: 'medium' });
    }
    if (c?.categories?.[0]?.percentOfTotal > 40) {
      insights.push({ type: 'info', title: 'Concentrated Spending', message: `${c.categories[0].category} accounts for ${c.categories[0].percentOfTotal.toFixed(1)}% of all spending. Consider diversifying expenses.`, priority: 'low' });
    }
    if (r?.ratios?.investmentReturn > 15) {
      insights.push({ type: 'success', title: 'Strong Investment Returns', message: `Your investments are returning ${r.ratios.investmentReturn.toFixed(1)}%. Great performance!`, priority: 'low' });
    }

    return {
      trends: trends.status === 'fulfilled' ? trends.value : null,
      categories: categories.status === 'fulfilled' ? categories.value : null,
      ratios: ratios.status === 'fulfilled' ? ratios.value : null,
      velocity: velocity.status === 'fulfilled' ? velocity.value : null,
      merchants: merchants.status === 'fulfilled' ? merchants.value : null,
      insights,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`Comprehensive insights error: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getMonthlyTrends,
  getCategoryInsights,
  getFinancialRatios,
  getSpendingVelocity,
  getMerchantAnalysis,
  getComprehensiveInsights,
};
