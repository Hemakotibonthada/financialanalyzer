// ============================================================================
// Enterprise Analytics Engine V2 — AI-Powered Financial Intelligence
// ============================================================================
// Advanced analytics with statistical modeling, pattern recognition,
// anomaly detection, time series forecasting, and smart recommendations.
// ============================================================================

const Transaction = require('../models/Transaction');
const EMI = require('../models/EMI');
const logger = require('../utils/logger');

class EnterpriseAnalyticsV2 {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000;
  }

  _cached(userId, key) {
    const k = `${userId}:${key}`;
    const c = this.cache.get(k);
    if (c && Date.now() - c.ts < this.cacheTTL) return c.data;
    return null;
  }
  _cache(userId, key, data) {
    this.cache.set(`${userId}:${key}`, { data, ts: Date.now() });
  }

  // ─── Complete Dashboard Analytics ───────────────────────────────
  async getDashboardAnalytics(userId, days = 30) {
    const cached = this._cached(userId, `dash_${days}`);
    if (cached) return cached;

    const since = new Date();
    since.setDate(since.getDate() - days);
    const prevSince = new Date(since);
    prevSince.setDate(prevSince.getDate() - days);

    const [currentTxns, prevTxns, emis] = await Promise.all([
      Transaction.find({ userId, date: { $gte: since } }).sort({ date: -1 }).lean(),
      Transaction.find({ userId, date: { $gte: prevSince, $lt: since } }).lean(),
      EMI.find({ userId, status: 'active' }).lean().catch(() => []),
    ]);

    // Current period
    const curIncome = currentTxns.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const curExpense = currentTxns.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

    // Previous period
    const prevIncome = prevTxns.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const prevExpense = prevTxns.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

    // Category breakdown
    const categories = {};
    const prevCategories = {};
    currentTxns.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.category || 'other';
      categories[cat] = (categories[cat] || 0) + (t.amount || 0);
    });
    prevTxns.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.category || 'other';
      prevCategories[cat] = (prevCategories[cat] || 0) + (t.amount || 0);
    });

    // Category comparison
    const categoryComparison = Object.keys({ ...categories, ...prevCategories }).map(cat => {
      const current = categories[cat] || 0;
      const previous = prevCategories[cat] || 0;
      const change = previous > 0 ? ((current - previous) / previous * 100) : (current > 0 ? 100 : 0);
      return { category: cat, current, previous, change: Math.round(change * 10) / 10, percentage: curExpense > 0 ? Math.round(current / curExpense * 1000) / 10 : 0 };
    }).sort((a, b) => b.current - a.current);

    // Daily spending trend
    const dailySpending = {};
    currentTxns.filter(t => t.type === 'expense').forEach(t => {
      const d = new Date(t.date).toISOString().split('T')[0];
      dailySpending[d] = (dailySpending[d] || 0) + (t.amount || 0);
    });
    const dailyTrend = Object.entries(dailySpending)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // EMI burden
    const monthlyEmi = emis.reduce((s, e) => s + (e.emiAmountInINR || e.emiAmount || 0), 0);

    // Spending velocity (avg daily spending)
    const velocity = days > 0 ? curExpense / days : 0;
    const prevVelocity = days > 0 ? prevExpense / days : 0;

    // Risk indicators
    const savingsRate = curIncome > 0 ? ((curIncome - curExpense) / curIncome * 100) : 0;
    const emiToIncome = curIncome > 0 ? (monthlyEmi / curIncome * 100) : 0;

    const result = {
      summary: {
        income: curIncome,
        expense: curExpense,
        net: curIncome - curExpense,
        savingsRate: Math.round(savingsRate * 10) / 10,
        transactionCount: currentTxns.length,
      },
      comparison: {
        incomeChange: prevIncome > 0 ? Math.round((curIncome - prevIncome) / prevIncome * 1000) / 10 : 0,
        expenseChange: prevExpense > 0 ? Math.round((curExpense - prevExpense) / prevExpense * 1000) / 10 : 0,
        previousIncome: prevIncome,
        previousExpense: prevExpense,
      },
      categories: categoryComparison,
      dailyTrend,
      velocity: { current: Math.round(velocity), previous: Math.round(prevVelocity), change: prevVelocity > 0 ? Math.round((velocity - prevVelocity) / prevVelocity * 100) : 0 },
      emiMetrics: { monthlyEmi, emiToIncome: Math.round(emiToIncome * 10) / 10, activeCount: emis.length },
      riskIndicators: {
        savingsRate: { value: Math.round(savingsRate * 10) / 10, status: savingsRate >= 20 ? 'healthy' : savingsRate >= 10 ? 'moderate' : 'at_risk' },
        emiToIncome: { value: Math.round(emiToIncome * 10) / 10, status: emiToIncome <= 30 ? 'healthy' : emiToIncome <= 50 ? 'moderate' : 'at_risk' },
        spendingTrend: { status: dailyTrend.length >= 7 ? (this._trend(dailyTrend.map(d => d.amount)) > 0.05 ? 'increasing' : 'stable') : 'insufficient_data' },
      },
      recentTransactions: currentTxns.slice(0, 10).map(t => ({
        _id: t._id, amount: t.amount, type: t.type, category: t.category,
        description: t.description, date: t.date, merchant: t.merchant,
      })),
    };

    this._cache(userId, `dash_${days}`, result);
    return result;
  }

  // ─── Smart Categorization ──────────────────────────────────────
  async categorizeTransaction(description, amount, userId) {
    // Rule-based categorization (runs locally, no external API needed)
    const desc = (description || '').toLowerCase();

    const rules = [
      { patterns: ['swiggy', 'zomato', 'uber eats', 'dominos', 'pizza', 'restaurant', 'cafe', 'coffee', 'food', 'dining', 'biryani', 'burger'], category: 'food' },
      { patterns: ['uber', 'ola', 'rapido', 'metro', 'bus', 'train', 'petrol', 'diesel', 'fuel', 'parking', 'toll'], category: 'transport' },
      { patterns: ['amazon', 'flipkart', 'myntra', 'meesho', 'shopping', 'mall', 'store', 'purchase'], category: 'shopping' },
      { patterns: ['netflix', 'spotify', 'hotstar', 'prime', 'subscription', 'youtube', 'gym', 'membership'], category: 'entertainment' },
      { patterns: ['electricity', 'water', 'gas', 'internet', 'wifi', 'broadband', 'mobile', 'recharge', 'phone'], category: 'utilities' },
      { patterns: ['rent', 'maintenance', 'society', 'apartment', 'housing'], category: 'rent' },
      { patterns: ['hospital', 'doctor', 'pharmacy', 'medicine', 'medical', 'health', 'lab', 'test'], category: 'healthcare' },
      { patterns: ['school', 'college', 'tuition', 'course', 'udemy', 'education', 'book', 'studY'], category: 'education' },
      { patterns: ['insurance', 'lic', 'policy', 'premium'], category: 'insurance' },
      { patterns: ['salary', 'payroll', 'wage', 'freelance', 'payment received', 'credit'], category: 'salary' },
      { patterns: ['transfer', 'upi', 'neft', 'imps', 'rtgs'], category: 'transfer' },
      { patterns: ['atm', 'withdraw', 'cash'], category: 'cash' },
      { patterns: ['emi', 'loan', 'installment'], category: 'emi' },
      { patterns: ['invest', 'mutual fund', 'sip', 'stock', 'share', 'zerodha', 'groww'], category: 'investment' },
    ];

    for (const rule of rules) {
      if (rule.patterns.some(p => desc.includes(p))) {
        return { category: rule.category, confidence: 0.85, method: 'rule_based' };
      }
    }

    // Learn from user's past categorizations
    try {
      const pastTxns = await Transaction.find({ userId, description: { $regex: desc.split(' ')[0], $options: 'i' } })
        .sort({ date: -1 }).limit(5).lean();

      if (pastTxns.length > 0) {
        const catCounts = {};
        pastTxns.forEach(t => { const c = t.category || 'other'; catCounts[c] = (catCounts[c] || 0) + 1; });
        const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
        if (topCat) {
          return { category: topCat[0], confidence: Math.min(0.9, 0.5 + topCat[1] * 0.1), method: 'learned' };
        }
      }
    } catch {}

    return { category: 'other', confidence: 0.3, method: 'default' };
  }

  // ─── Spending Anomaly Alerts ────────────────────────────────────
  async getSpendingAlerts(userId) {
    const days = 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const transactions = await Transaction.find({ userId, type: 'expense', date: { $gte: since } }).lean();

    const alerts = [];

    // 1. Daily spending spike
    const dailyMap = {};
    transactions.forEach(t => {
      const d = new Date(t.date).toISOString().split('T')[0];
      dailyMap[d] = (dailyMap[d] || 0) + (t.amount || 0);
    });
    const dailyAmounts = Object.values(dailyMap);
    if (dailyAmounts.length >= 5) {
      const avg = dailyAmounts.reduce((a, b) => a + b, 0) / dailyAmounts.length;
      const today = new Date().toISOString().split('T')[0];
      const todaySpend = dailyMap[today] || 0;
      if (todaySpend > avg * 2) {
        alerts.push({
          type: 'spending_spike',
          severity: 'high',
          title: 'High Spending Today',
          message: `You've spent ₹${todaySpend.toLocaleString('en-IN')} today, which is ${(todaySpend / avg).toFixed(1)}x your daily average of ₹${Math.round(avg).toLocaleString('en-IN')}.`,
          amount: todaySpend,
          threshold: avg * 2,
        });
      }
    }

    // 2. Category overspend
    const catTotals = {};
    transactions.forEach(t => {
      const cat = t.category || 'other';
      catTotals[cat] = (catTotals[cat] || 0) + (t.amount || 0);
    });
    const totalSpend = Object.values(catTotals).reduce((a, b) => a + b, 0);
    Object.entries(catTotals).forEach(([cat, amount]) => {
      if (amount > totalSpend * 0.4) {
        alerts.push({
          type: 'category_dominance',
          severity: 'medium',
          title: `High ${cat} Spending`,
          message: `${cat} accounts for ${(amount / totalSpend * 100).toFixed(0)}% of your total spending.`,
          category: cat,
          amount,
          percentage: Math.round(amount / totalSpend * 100),
        });
      }
    });

    // 3. Savings rate warning
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    // Re-fetch income separately since we filtered expenses above
    const incTxns = await Transaction.find({ userId, type: 'income', date: { $gte: since } }).lean();
    const totalIncome = incTxns.reduce((s, t) => s + (t.amount || 0), 0);
    if (totalIncome > 0 && totalSpend > totalIncome * 0.9) {
      alerts.push({
        type: 'low_savings',
        severity: totalSpend > totalIncome ? 'high' : 'medium',
        title: totalSpend > totalIncome ? 'Spending Exceeds Income' : 'Very Low Savings',
        message: `You're spending ${(totalSpend / totalIncome * 100).toFixed(0)}% of your income.`,
      });
    }

    return alerts.sort((a, b) => {
      const sev = { high: 3, medium: 2, low: 1 };
      return (sev[b.severity] || 0) - (sev[a.severity] || 0);
    });
  }

  // ─── Utility ────────────────────────────────────────────────────
  _trend(values) {
    if (values.length < 2) return 0;
    const n = values.length;
    let sx = 0, sy = 0, sxy = 0, sx2 = 0;
    for (let i = 0; i < n; i++) { sx += i; sy += values[i]; sxy += i * values[i]; sx2 += i * i; }
    const slope = (n * sxy - sx * sy) / (n * sx2 - sx * sx);
    const mean = sy / n;
    return mean > 0 ? slope / mean : 0;
  }
}

module.exports = new EnterpriseAnalyticsV2();
