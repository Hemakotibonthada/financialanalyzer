// ============================================================================
// Enhanced Analytics Engine — Enterprise Financial Analytics
// ============================================================================
// Advanced analytics service with aggregation pipelines, trend analysis,
// cohort analysis, financial ratios, and performance benchmarking.
// ============================================================================

const mongoose = require('mongoose');

class AnalyticsEngine {
  // ═══════════════════════════════════════════════════════════════════════
  // § 1 ─ SPENDING ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Get comprehensive spending analysis for a user
   * @param {string} userId 
   * @param {Object} options - { days, groupBy, categories }
   * @returns {{ totalSpent, dailyAvg, topCategories, weekdayVsWeekend, hourlyDistribution, trends }}
   */
  static async getSpendingAnalytics(userId, options = {}) {
    const { days = 30, groupBy = 'category' } = options;
    const startDate = new Date(Date.now() - days * 86400000);
    
    try {
      const Transaction = mongoose.model('Transaction');
      const transactions = await Transaction.find({
        userId,
        type: { $ne: 'income' },
        date: { $gte: startDate },
      }).sort({ date: -1 }).lean();

      if (!transactions.length) {
        return { totalSpent: 0, dailyAvg: 0, topCategories: [], trends: [], weekdayVsWeekend: { weekday: 0, weekend: 0 } };
      }

      const totalSpent = transactions.reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const dailyAvg = totalSpent / days;

      // Category breakdown
      const categoryMap = {};
      const dailyMap = {};
      const hourMap = {};
      let weekdayTotal = 0, weekdayCount = 0, weekendTotal = 0, weekendCount = 0;

      transactions.forEach(t => {
        const amount = Math.abs(t.amount || 0);
        const cat = t.category || 'Uncategorized';
        categoryMap[cat] = (categoryMap[cat] || { total: 0, count: 0, transactions: [] });
        categoryMap[cat].total += amount;
        categoryMap[cat].count++;
        if (categoryMap[cat].transactions.length < 5) categoryMap[cat].transactions.push(t);

        const date = new Date(t.date);
        const dateStr = date.toISOString().substring(0, 10);
        dailyMap[dateStr] = (dailyMap[dateStr] || 0) + amount;

        const hour = date.getHours();
        hourMap[hour] = (hourMap[hour] || 0) + amount;

        const dow = date.getDay();
        if (dow === 0 || dow === 6) { weekendTotal += amount; weekendCount++; }
        else { weekdayTotal += amount; weekdayCount++; }
      });

      const topCategories = Object.entries(categoryMap)
        .map(([name, data]) => ({
          name,
          total: data.total,
          count: data.count,
          percentage: totalSpent > 0 ? ((data.total / totalSpent) * 100) : 0,
          avgTransaction: data.count > 0 ? (data.total / data.count) : 0,
        }))
        .sort((a, b) => b.total - a.total);

      const trends = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date, value }));

      const hourlyDistribution = Object.entries(hourMap)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([hour, value]) => ({ hour: parseInt(hour), value }));

      return {
        totalSpent,
        dailyAvg,
        topCategories,
        trends,
        weekdayVsWeekend: {
          weekday: weekdayCount ? weekdayTotal / weekdayCount : 0,
          weekend: weekendCount ? weekendTotal / weekendCount : 0,
          ratio: weekdayCount && weekendCount ? (weekendTotal / weekendCount) / (weekdayTotal / weekdayCount) : 1,
        },
        hourlyDistribution,
        transactionCount: transactions.length,
      };
    } catch (err) {
      console.error('Spending analytics error:', err);
      return { totalSpent: 0, dailyAvg: 0, topCategories: [], trends: [] };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // § 2 ─ INCOME ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════

  static async getIncomeAnalytics(userId, days = 90) {
    const startDate = new Date(Date.now() - days * 86400000);
    
    try {
      const Transaction = mongoose.model('Transaction');
      const incomes = await Transaction.find({
        userId,
        type: 'income',
        date: { $gte: startDate },
      }).sort({ date: -1 }).lean();

      const totalIncome = incomes.reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const monthlyAvg = totalIncome / (days / 30);

      // Source breakdown
      const sourceMap = {};
      incomes.forEach(t => {
        const src = t.category || t.source || t.description || 'Other';
        sourceMap[src] = (sourceMap[src] || 0) + Math.abs(t.amount || 0);
      });

      const sources = Object.entries(sourceMap)
        .map(([name, total]) => ({ name, total, percentage: totalIncome > 0 ? ((total / totalIncome) * 100) : 0 }))
        .sort((a, b) => b.total - a.total);

      // Monthly trend
      const monthMap = {};
      incomes.forEach(t => {
        const month = new Date(t.date).toISOString().substring(0, 7);
        monthMap[month] = (monthMap[month] || 0) + Math.abs(t.amount || 0);
      });

      const monthlyTrend = Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, value]) => ({ month, value }));

      // Stability score (lower CV = more stable)
      const monthValues = Object.values(monthMap);
      const mean = monthValues.length ? monthValues.reduce((a, b) => a + b, 0) / monthValues.length : 0;
      const variance = monthValues.length ? monthValues.reduce((s, v) => s + (v - mean) ** 2, 0) / monthValues.length : 0;
      const cv = mean > 0 ? (Math.sqrt(variance) / mean) : 1;
      const stabilityScore = Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));

      return {
        totalIncome, monthlyAvg, sources, monthlyTrend,
        stabilityScore, transactionCount: incomes.length,
      };
    } catch (err) {
      console.error('Income analytics error:', err);
      return { totalIncome: 0, monthlyAvg: 0, sources: [], monthlyTrend: [] };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // § 3 ─ FINANCIAL RATIOS
  // ═══════════════════════════════════════════════════════════════════════

  static async getFinancialRatios(userId, days = 30) {
    try {
      const Transaction = mongoose.model('Transaction');
      const startDate = new Date(Date.now() - days * 86400000);
      
      const [incomeResult, expenseResult] = await Promise.all([
        Transaction.aggregate([
          { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'income', date: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } },
        ]),
        Transaction.aggregate([
          { $match: { userId: new mongoose.Types.ObjectId(userId), type: { $ne: 'income' }, date: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } },
        ]),
      ]);

      const income = incomeResult[0]?.total || 0;
      const expenses = expenseResult[0]?.total || 0;
      const savings = income - expenses;

      // Financial ratios
      const savingsRate = income > 0 ? ((savings / income) * 100) : 0;
      const expenseRatio = income > 0 ? ((expenses / income) * 100) : 0;
      const burnRate = income > 0 ? (expenses / income) : 0;
      const runwayMonths = expenses > 0 ? Math.round(savings / (expenses / (days / 30)) * 10) / 10 : 0;

      // 50/30/20 rule check
      const needsTarget = income * 0.5;
      const wantsTarget = income * 0.3;
      const savingsTarget = income * 0.2;

      return {
        income, expenses, savings,
        savingsRate: Math.round(savingsRate * 10) / 10,
        expenseRatio: Math.round(expenseRatio * 10) / 10,
        burnRate: Math.round(burnRate * 100) / 100,
        runwayMonths,
        budgetRule503020: {
          needs: { target: needsTarget, label: '50% Needs' },
          wants: { target: wantsTarget, label: '30% Wants' },
          savings: { target: savingsTarget, actual: savings, label: '20% Savings' },
        },
        healthIndicators: {
          savingsRate: savingsRate >= 20 ? 'good' : savingsRate >= 10 ? 'moderate' : 'poor',
          burnRate: burnRate <= 0.8 ? 'good' : burnRate <= 0.95 ? 'moderate' : 'poor',
          incomeStability: income > 0 ? 'active' : 'no-income',
        },
      };
    } catch (err) {
      console.error('Financial ratios error:', err);
      return { income: 0, expenses: 0, savings: 0, savingsRate: 0 };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // § 4 ─ MONTHLY COMPARISON
  // ═══════════════════════════════════════════════════════════════════════

  static async getMonthlyComparison(userId, months = 6) {
    try {
      const Transaction = mongoose.model('Transaction');
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const transactions = await Transaction.find({
        userId,
        date: { $gte: startDate },
      }).lean();

      const monthData = {};
      transactions.forEach(t => {
        const month = new Date(t.date).toISOString().substring(0, 7);
        if (!monthData[month]) monthData[month] = { income: 0, expense: 0, count: 0 };
        if (t.type === 'income') monthData[month].income += Math.abs(t.amount || 0);
        else monthData[month].expense += Math.abs(t.amount || 0);
        monthData[month].count++;
      });

      const comparison = Object.entries(monthData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month,
          income: data.income,
          expense: data.expense,
          savings: data.income - data.expense,
          savingsRate: data.income > 0 ? (((data.income - data.expense) / data.income) * 100) : 0,
          transactionCount: data.count,
        }));

      // Month-over-month changes
      for (let i = 1; i < comparison.length; i++) {
        const prev = comparison[i - 1];
        const curr = comparison[i];
        curr.incomeChange = prev.income > 0 ? (((curr.income - prev.income) / prev.income) * 100) : 0;
        curr.expenseChange = prev.expense > 0 ? (((curr.expense - prev.expense) / prev.expense) * 100) : 0;
      }

      return { comparison, monthCount: comparison.length };
    } catch (err) {
      console.error('Monthly comparison error:', err);
      return { comparison: [], monthCount: 0 };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // § 5 ─ MERCHANT ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════

  static async getMerchantAnalytics(userId, days = 90) {
    try {
      const Transaction = mongoose.model('Transaction');
      const startDate = new Date(Date.now() - days * 86400000);

      const transactions = await Transaction.find({
        userId,
        type: { $ne: 'income' },
        date: { $gte: startDate },
      }).lean();

      const merchantMap = {};
      transactions.forEach(t => {
        const merchant = t.merchant || t.description || 'Unknown';
        if (!merchantMap[merchant]) {
          merchantMap[merchant] = { total: 0, count: 0, amounts: [], dates: [], category: t.category };
        }
        const amount = Math.abs(t.amount || 0);
        merchantMap[merchant].total += amount;
        merchantMap[merchant].count++;
        merchantMap[merchant].amounts.push(amount);
        merchantMap[merchant].dates.push(t.date);
      });

      const merchants = Object.entries(merchantMap)
        .map(([name, data]) => ({
          name,
          totalSpent: data.total,
          transactions: data.count,
          avgTransaction: data.count > 0 ? (data.total / data.count) : 0,
          maxTransaction: Math.max(...data.amounts),
          minTransaction: Math.min(...data.amounts),
          category: data.category,
          lastVisit: data.dates.sort((a, b) => new Date(b) - new Date(a))[0],
          isRecurring: data.count >= 3,
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent);

      // Merchant loyalty score (top 5 merchants = high loyalty)
      const topMerchants = merchants.slice(0, 5);
      const topMerchantSpend = topMerchants.reduce((s, m) => s + m.totalSpent, 0);
      const totalSpend = merchants.reduce((s, m) => s + m.totalSpent, 0);
      const concentrationRatio = totalSpend > 0 ? (topMerchantSpend / totalSpend) : 0;

      return {
        merchants: merchants.slice(0, 20),
        totalMerchants: merchants.length,
        topMerchants,
        concentrationRatio: Math.round(concentrationRatio * 100),
        recurringMerchants: merchants.filter(m => m.isRecurring).length,
      };
    } catch (err) {
      console.error('Merchant analytics error:', err);
      return { merchants: [], totalMerchants: 0 };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // § 6 ─ NET WORTH CALCULATION
  // ═══════════════════════════════════════════════════════════════════════

  static async getNetWorth(userId) {
    try {
      const models = {};
      const modelNames = ['Investment', 'BankAccount', 'Debt', 'EMI', 'FixedDeposit', 'Property'];
      
      modelNames.forEach(name => {
        try { models[name] = mongoose.model(name); } catch { }
      });

      const results = await Promise.allSettled([
        models.Investment ? models.Investment.find({ userId }).lean() : Promise.resolve([]),
        models.BankAccount ? models.BankAccount.find({ userId }).lean() : Promise.resolve([]),
        models.Debt ? models.Debt.find({ userId }).lean() : Promise.resolve([]),
        models.EMI ? models.EMI.find({ userId }).lean() : Promise.resolve([]),
        models.FixedDeposit ? models.FixedDeposit.find({ userId }).lean() : Promise.resolve([]),
        models.Property ? models.Property.find({ userId }).lean() : Promise.resolve([]),
      ]);

      const get = (idx) => results[idx]?.status === 'fulfilled' ? results[idx].value : [];

      const investments = get(0);
      const bankAccounts = get(1);
      const debts = get(2);
      const emis = get(3);
      const fds = get(4);
      const properties = get(5);

      // Assets
      const investmentValue = investments.reduce((s, i) => s + (i.currentValue || i.amount || 0), 0);
      const bankBalance = bankAccounts.reduce((s, a) => s + (a.balance || a.currentBalance || 0), 0);
      const fdValue = fds.reduce((s, f) => s + (f.amount || f.principal || 0), 0);
      const propertyValue = properties.reduce((s, p) => s + (p.currentValue || p.purchasePrice || 0), 0);

      const totalAssets = investmentValue + bankBalance + fdValue + propertyValue;

      // Liabilities
      const totalDebts = debts.reduce((s, d) => s + (d.outstanding || d.remainingAmount || d.amount || 0), 0);
      const totalEMIs = emis.reduce((s, e) => s + (e.remainingAmount || 0), 0);
      const totalLiabilities = totalDebts + totalEMIs;

      const netWorth = totalAssets - totalLiabilities;

      return {
        netWorth,
        totalAssets,
        totalLiabilities,
        breakdown: {
          assets: {
            investments: investmentValue,
            bankAccounts: bankBalance,
            fixedDeposits: fdValue,
            properties: propertyValue,
          },
          liabilities: {
            debts: totalDebts,
            emis: totalEMIs,
          },
        },
        debtToAssetRatio: totalAssets > 0 ? Math.round((totalLiabilities / totalAssets) * 100) : 0,
      };
    } catch (err) {
      console.error('Net worth calculation error:', err);
      return { netWorth: 0, totalAssets: 0, totalLiabilities: 0 };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // § 7 ─ COMPREHENSIVE DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════

  static async getComprehensiveDashboard(userId, days = 30) {
    const results = await Promise.allSettled([
      this.getSpendingAnalytics(userId, { days }),
      this.getIncomeAnalytics(userId, days),
      this.getFinancialRatios(userId, days),
      this.getMonthlyComparison(userId, 6),
      this.getMerchantAnalytics(userId, days),
      this.getNetWorth(userId),
    ]);

    const get = (idx) => results[idx]?.status === 'fulfilled' ? results[idx].value : null;

    return {
      spending: get(0),
      income: get(1),
      ratios: get(2),
      monthlyComparison: get(3),
      merchants: get(4),
      netWorth: get(5),
      generatedAt: new Date().toISOString(),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // § 8 ─ BUDGET TRACKING
  // ═══════════════════════════════════════════════════════════════════════

  static async getBudgetStatus(userId) {
    try {
      const Budget = mongoose.model('Budget');
      const Transaction = mongoose.model('Transaction');
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [budgets, transactions] = await Promise.all([
        Budget.find({ userId }).lean(),
        Transaction.find({
          userId,
          type: { $ne: 'income' },
          date: { $gte: startOfMonth },
        }).lean(),
      ]);

      // Aggregate spending by category
      const spending = {};
      transactions.forEach(t => {
        const cat = (t.category || '').toLowerCase();
        spending[cat] = (spending[cat] || 0) + Math.abs(t.amount || 0);
      });

      const budgetStatus = budgets.map(b => {
        const cat = (b.category || '').toLowerCase();
        const spent = spending[cat] || 0;
        const limit = b.amount || b.limit || 0;
        const percentage = limit > 0 ? (spent / limit) * 100 : 0;
        
        let status = 'under';
        if (percentage >= 100) status = 'exceeded';
        else if (percentage >= 80) status = 'warning';
        else if (percentage >= 50) status = 'moderate';

        return {
          category: b.category,
          limit,
          spent,
          remaining: Math.max(limit - spent, 0),
          percentage: Math.round(percentage * 10) / 10,
          status,
          daysInMonth: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate(),
          daysPassed: new Date().getDate(),
          projectedSpend: new Date().getDate() > 0 ? (spent / new Date().getDate()) * new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() : 0,
        };
      });

      const totalBudget = budgets.reduce((s, b) => s + (b.amount || b.limit || 0), 0);
      const totalSpent = Object.values(spending).reduce((s, v) => s + v, 0);

      return {
        budgets: budgetStatus,
        totalBudget,
        totalSpent,
        overallUtilization: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
        exceededCount: budgetStatus.filter(b => b.status === 'exceeded').length,
        warningCount: budgetStatus.filter(b => b.status === 'warning').length,
      };
    } catch (err) {
      console.error('Budget status error:', err);
      return { budgets: [], totalBudget: 0, totalSpent: 0 };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // § 9 ─ CASHFLOW PROJECTION
  // ═══════════════════════════════════════════════════════════════════════

  static async getCashflowProjection(userId, months = 6) {
    try {
      const ratios = await this.getFinancialRatios(userId, 90);
      const monthlyIncome = ratios.income / 3;
      const monthlyExpense = ratios.expenses / 3;
      const monthlySavings = monthlyIncome - monthlyExpense;

      const projections = [];
      let runningBalance = 0;

      for (let i = 1; i <= months; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() + i);
        const label = date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

        // Add some variance
        const variance = 1 + (Math.random() - 0.5) * 0.1;
        const projectedIncome = monthlyIncome * variance;
        const projectedExpense = monthlyExpense * variance;
        runningBalance += projectedIncome - projectedExpense;

        projections.push({
          month: label,
          income: Math.round(projectedIncome),
          expense: Math.round(projectedExpense),
          savings: Math.round(projectedIncome - projectedExpense),
          cumulativeSavings: Math.round(runningBalance),
        });
      }

      return {
        projections,
        monthlyAvgIncome: Math.round(monthlyIncome),
        monthlyAvgExpense: Math.round(monthlyExpense),
        expectedSavings: Math.round(monthlySavings * months),
      };
    } catch (err) {
      console.error('Cashflow projection error:', err);
      return { projections: [], monthlyAvgIncome: 0, monthlyAvgExpense: 0 };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // § 10 ─ GOAL PROGRESS ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════

  static async getGoalAnalytics(userId) {
    try {
      const Goal = mongoose.model('Goal');
      const goals = await Goal.find({ userId }).lean();

      if (!goals.length) return { goals: [], summary: { total: 0, completed: 0, totalTarget: 0, totalSaved: 0 } };

      const analytics = goals.map(g => {
        const target = g.targetAmount || g.target || 0;
        const saved = g.currentAmount || g.saved || g.progress || 0;
        const progress = target > 0 ? (saved / target) * 100 : 0;
        const deadline = g.deadline || g.targetDate;
        const daysLeft = deadline ? Math.max(Math.ceil((new Date(deadline) - new Date()) / 86400000), 0) : null;
        const dailySavingsNeeded = daysLeft && daysLeft > 0 ? (target - saved) / daysLeft : 0;

        return {
          ...g,
          progress: Math.min(progress, 100),
          isCompleted: progress >= 100,
          daysLeft,
          dailySavingsNeeded: Math.round(dailySavingsNeeded),
          isOnTrack: daysLeft ? (progress / 100 >= (1 - daysLeft / 365)) : null,
        };
      });

      const completed = analytics.filter(g => g.isCompleted);
      const totalTarget = goals.reduce((s, g) => s + (g.targetAmount || g.target || 0), 0);
      const totalSaved = goals.reduce((s, g) => s + (g.currentAmount || g.saved || g.progress || 0), 0);

      return {
        goals: analytics,
        summary: {
          total: goals.length,
          completed: completed.length,
          active: goals.length - completed.length,
          totalTarget,
          totalSaved,
          overallProgress: totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0,
        },
      };
    } catch (err) {
      console.error('Goal analytics error:', err);
      return { goals: [], summary: { total: 0, completed: 0 } };
    }
  }
}

module.exports = AnalyticsEngine;
