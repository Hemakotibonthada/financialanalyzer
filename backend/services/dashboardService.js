const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// Models (lazy-loaded to avoid circular deps)
// ---------------------------------------------------------------------------

let Transaction, Budget, Goal, Bill, Account;

function loadModels() {
  if (!Transaction) {
    try {
      Transaction = require('../models/Transaction');
      Budget = require('../models/Budget');
      Goal = require('../models/Goal');
      Bill = require('../models/Bill');
      Account = require('../models/Account');
    } catch (err) {
      logger.warn('Some models could not be loaded:', err.message);
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDateRange(period = 'month') {
  const now = new Date();
  const startDate = new Date(now);

  switch (period) {
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setMonth(now.getMonth() - 1);
  }

  return { startDate, endDate: now };
}

function getPreviousPeriodRange(startDate, endDate) {
  const duration = endDate.getTime() - startDate.getTime();
  return {
    startDate: new Date(startDate.getTime() - duration),
    endDate: new Date(startDate.getTime()),
  };
}

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

/**
 * Get aggregated dashboard summary.
 */
async function getDashboardSummary(userId, period = 'month') {
  try {
    loadModels();
    const { startDate, endDate } = getDateRange(period);

    const [incomeExpense, recentTxns, budgets, goals, healthScore] = await Promise.all([
      getIncomeExpenseAggregation(userId, startDate, endDate),
      getRecentTransactions(userId, 5),
      getActiveBudgets(userId),
      getActiveGoals(userId),
      getFinancialHealthScore(userId),
    ]);

    return {
      period,
      dateRange: { startDate, endDate },
      income: incomeExpense.income,
      expenses: incomeExpense.expenses,
      savings: incomeExpense.income - incomeExpense.expenses,
      savingsRate: incomeExpense.income > 0
        ? Math.round(((incomeExpense.income - incomeExpense.expenses) / incomeExpense.income) * 100)
        : 0,
      transactionCount: incomeExpense.count,
      recentTransactions: recentTxns,
      activeBudgets: budgets.length,
      budgetStatus: budgets,
      activeGoals: goals.length,
      goalProgress: goals,
      healthScore,
    };
  } catch (err) {
    logger.error('getDashboardSummary error:', err);
    throw err;
  }
}

async function getIncomeExpenseAggregation(userId, startDate, endDate) {
  try {
    if (!Transaction) return { income: 0, expenses: 0, count: 0 };

    const result = await Transaction.aggregate([
      { $match: { userId, date: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: null,
          income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
          expenses: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
          count: { $sum: 1 },
        },
      },
    ]);

    return result[0] || { income: 0, expenses: 0, count: 0 };
  } catch (err) {
    logger.error('getIncomeExpenseAggregation error:', err);
    return { income: 0, expenses: 0, count: 0 };
  }
}

async function getRecentTransactions(userId, limit = 5) {
  try {
    if (!Transaction) return [];
    return await Transaction.find({ userId })
      .sort({ date: -1 })
      .limit(limit)
      .lean();
  } catch (err) {
    logger.error('getRecentTransactions error:', err);
    return [];
  }
}

async function getActiveBudgets(userId) {
  try {
    if (!Budget) return [];
    const budgets = await Budget.find({ userId, isActive: { $ne: false } }).lean();
    return budgets.map((b) => ({
      ...b,
      spent: b.spent || 0,
      remaining: Math.max((b.amount || 0) - (b.spent || 0), 0),
      percentage: b.amount > 0 ? Math.round(((b.spent || 0) / b.amount) * 100) : 0,
    }));
  } catch (err) {
    logger.error('getActiveBudgets error:', err);
    return [];
  }
}

async function getActiveGoals(userId) {
  try {
    if (!Goal) return [];
    const goals = await Goal.find({ userId, isComplete: { $ne: true } }).lean();
    return goals.map((g) => ({
      ...g,
      progress: g.targetAmount > 0
        ? Math.round(((g.currentAmount || 0) / g.targetAmount) * 100)
        : 0,
    }));
  } catch (err) {
    logger.error('getActiveGoals error:', err);
    return [];
  }
}

/**
 * Monthly spending trends (last N months).
 */
async function getSpendingTrends(userId, months = 6) {
  try {
    loadModels();
    if (!Transaction) return [];

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const result = await Transaction.aggregate([
      { $match: { userId, type: 'expense', date: { $gte: startDate } } },
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    return result.map((r) => ({
      year: r._id.year,
      month: r._id.month,
      label: `${r._id.year}-${String(r._id.month).padStart(2, '0')}`,
      total: Math.round(r.total * 100) / 100,
      count: r.count,
      avgAmount: Math.round(r.avgAmount * 100) / 100,
    }));
  } catch (err) {
    logger.error('getSpendingTrends error:', err);
    throw err;
  }
}

/**
 * Categorized spending breakdown.
 */
async function getCategoryBreakdown(userId, period = 'month') {
  try {
    loadModels();
    if (!Transaction) return [];

    const { startDate, endDate } = getDateRange(period);

    const result = await Transaction.aggregate([
      { $match: { userId, type: 'expense', date: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' },
          maxAmount: { $max: '$amount' },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const grandTotal = result.reduce((sum, r) => sum + r.total, 0);

    return result.map((r) => ({
      category: r._id || 'Uncategorized',
      total: Math.round(r.total * 100) / 100,
      count: r.count,
      avgAmount: Math.round(r.avgAmount * 100) / 100,
      maxAmount: Math.round(r.maxAmount * 100) / 100,
      percentage: grandTotal > 0 ? Math.round((r.total / grandTotal) * 1000) / 10 : 0,
    }));
  } catch (err) {
    logger.error('getCategoryBreakdown error:', err);
    throw err;
  }
}

/**
 * Recent activity feed across transactions, bills, and goals.
 */
async function getRecentActivity(userId, limit = 20) {
  try {
    loadModels();
    const activities = [];

    // Recent transactions
    if (Transaction) {
      const txns = await Transaction.find({ userId }).sort({ date: -1 }).limit(limit).lean();
      txns.forEach((t) => {
        activities.push({
          type: 'transaction',
          id: t._id,
          title: t.description || t.category,
          amount: t.amount,
          category: t.category,
          transactionType: t.type,
          date: t.date,
        });
      });
    }

    // Recent goal updates
    if (Goal) {
      const goals = await Goal.find({ userId }).sort({ updatedAt: -1 }).limit(5).lean();
      goals.forEach((g) => {
        activities.push({
          type: 'goal',
          id: g._id,
          title: g.name,
          progress: g.targetAmount > 0 ? Math.round(((g.currentAmount || 0) / g.targetAmount) * 100) : 0,
          date: g.updatedAt || g.createdAt,
        });
      });
    }

    // Upcoming bills
    if (Bill) {
      const bills = await Bill.find({ userId, isPaid: { $ne: true } }).sort({ dueDate: 1 }).limit(5).lean();
      bills.forEach((b) => {
        activities.push({
          type: 'bill',
          id: b._id,
          title: b.name || b.description,
          amount: b.amount,
          dueDate: b.dueDate,
          date: b.dueDate,
        });
      });
    }

    // Sort all activities by date
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    return activities.slice(0, limit);
  } catch (err) {
    logger.error('getRecentActivity error:', err);
    throw err;
  }
}

/**
 * Composite financial health score (0-100).
 */
async function getFinancialHealthScore(userId) {
  try {
    loadModels();
    const scores = { savings: 0, budgetAdherence: 0, debtRatio: 0, goalProgress: 0, consistency: 0 };
    const weights = { savings: 0.25, budgetAdherence: 0.2, debtRatio: 0.2, goalProgress: 0.15, consistency: 0.2 };

    // Savings rate score
    const { startDate, endDate } = getDateRange('month');
    const ie = await getIncomeExpenseAggregation(userId, startDate, endDate);
    if (ie.income > 0) {
      const savingsRate = (ie.income - ie.expenses) / ie.income;
      scores.savings = Math.min(savingsRate * 200, 100); // 50% savings = perfect score
    }

    // Budget adherence
    const budgets = await getActiveBudgets(userId);
    if (budgets.length > 0) {
      const adherence = budgets.reduce((sum, b) => {
        return sum + (b.percentage <= 100 ? 100 - Math.max(b.percentage - 80, 0) * 5 : 0);
      }, 0) / budgets.length;
      scores.budgetAdherence = Math.max(adherence, 0);
    } else {
      scores.budgetAdherence = 50; // Neutral if no budgets set
    }

    // Goal progress
    const goals = await getActiveGoals(userId);
    if (goals.length > 0) {
      scores.goalProgress = goals.reduce((sum, g) => sum + g.progress, 0) / goals.length;
    } else {
      scores.goalProgress = 50;
    }

    // Consistency (regular income)
    if (Transaction) {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const incomeCount = await Transaction.countDocuments({
        userId,
        type: 'income',
        date: { $gte: threeMonthsAgo },
      });
      scores.consistency = Math.min(incomeCount * 10, 100);
    }

    // Debt ratio (placeholder – defaults to neutral)
    scores.debtRatio = 60;

    // Weighted total
    const totalScore = Object.keys(weights).reduce(
      (sum, key) => sum + scores[key] * weights[key],
      0
    );

    return {
      score: Math.round(totalScore),
      breakdown: scores,
      grade:
        totalScore >= 80 ? 'A' :
        totalScore >= 60 ? 'B' :
        totalScore >= 40 ? 'C' :
        totalScore >= 20 ? 'D' : 'F',
    };
  } catch (err) {
    logger.error('getFinancialHealthScore error:', err);
    return { score: 0, breakdown: {}, grade: 'N/A' };
  }
}

/**
 * Get upcoming payments (bills and EMIs due soon).
 */
async function getUpcomingPayments(userId, days = 14) {
  try {
    loadModels();
    if (!Bill) return [];

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const bills = await Bill.find({
      userId,
      isPaid: { $ne: true },
      dueDate: { $gte: now, $lte: futureDate },
    })
      .sort({ dueDate: 1 })
      .lean();

    return bills.map((b) => {
      const daysUntilDue = Math.ceil((new Date(b.dueDate) - now) / (1000 * 60 * 60 * 24));
      return {
        ...b,
        daysUntilDue,
        urgency: daysUntilDue <= 3 ? 'critical' : daysUntilDue <= 7 ? 'warning' : 'normal',
      };
    });
  } catch (err) {
    logger.error('getUpcomingPayments error:', err);
    throw err;
  }
}

/**
 * Generate insights based on spending patterns.
 */
async function getInsights(userId) {
  try {
    loadModels();
    const insights = [];

    const { startDate, endDate } = getDateRange('month');
    const prev = getPreviousPeriodRange(startDate, endDate);

    // Spending change insight
    const [current, previous] = await Promise.all([
      getIncomeExpenseAggregation(userId, startDate, endDate),
      getIncomeExpenseAggregation(userId, prev.startDate, prev.endDate),
    ]);

    if (previous.expenses > 0) {
      const change = ((current.expenses - previous.expenses) / previous.expenses) * 100;
      if (Math.abs(change) > 10) {
        insights.push({
          type: change > 0 ? 'warning' : 'positive',
          category: 'spending',
          title: change > 0 ? 'Spending Increased' : 'Spending Decreased',
          message: `Your spending ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(Math.round(change))}% compared to last period.`,
          value: Math.round(change),
        });
      }
    }

    // Top category insight
    const categories = await getCategoryBreakdown(userId, 'month');
    if (categories.length > 0) {
      const top = categories[0];
      insights.push({
        type: 'info',
        category: 'spending',
        title: 'Top Spending Category',
        message: `${top.category} is your biggest expense at ${top.percentage}% of total spending.`,
        value: top.total,
      });
    }

    // Savings rate insight
    if (current.income > 0) {
      const savingsRate = Math.round(((current.income - current.expenses) / current.income) * 100);
      insights.push({
        type: savingsRate >= 20 ? 'positive' : savingsRate >= 0 ? 'info' : 'warning',
        category: 'savings',
        title: 'Savings Rate',
        message: savingsRate >= 20
          ? `Great job! You're saving ${savingsRate}% of your income.`
          : savingsRate >= 0
            ? `You're saving ${savingsRate}% of your income. Aim for at least 20%.`
            : `You're spending more than you earn. Consider reviewing your expenses.`,
        value: savingsRate,
      });
    }

    // Budget warnings
    const budgets = await getActiveBudgets(userId);
    const overBudget = budgets.filter((b) => b.percentage >= 90);
    if (overBudget.length > 0) {
      insights.push({
        type: 'warning',
        category: 'budget',
        title: 'Budget Alert',
        message: `${overBudget.length} budget(s) are at 90% or above: ${overBudget.map((b) => b.category).join(', ')}.`,
        value: overBudget.length,
      });
    }

    // Goal milestone insight
    const goals = await getActiveGoals(userId);
    const nearComplete = goals.filter((g) => g.progress >= 80 && g.progress < 100);
    if (nearComplete.length > 0) {
      insights.push({
        type: 'positive',
        category: 'goals',
        title: 'Almost There!',
        message: `${nearComplete.length} goal(s) are 80%+ complete: ${nearComplete.map((g) => g.name).join(', ')}.`,
        value: nearComplete.length,
      });
    }

    return insights;
  } catch (err) {
    logger.error('getInsights error:', err);
    return [];
  }
}

/**
 * Compare current period with previous period.
 */
async function getMonthOverMonthComparison(userId, period = 'month') {
  try {
    loadModels();
    const { startDate, endDate } = getDateRange(period);
    const prev = getPreviousPeriodRange(startDate, endDate);

    const [current, previous] = await Promise.all([
      getIncomeExpenseAggregation(userId, startDate, endDate),
      getIncomeExpenseAggregation(userId, prev.startDate, prev.endDate),
    ]);

    const [currentCategories, previousCategories] = await Promise.all([
      getCategoryBreakdown(userId, period),
      Transaction
        ? Transaction.aggregate([
            { $match: { userId, type: 'expense', date: { $gte: prev.startDate, $lte: prev.endDate } } },
            { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
            { $sort: { total: -1 } },
          ])
        : [],
    ]);

    const incomeChange = previous.income > 0
      ? Math.round(((current.income - previous.income) / previous.income) * 100)
      : null;
    const expenseChange = previous.expenses > 0
      ? Math.round(((current.expenses - previous.expenses) / previous.expenses) * 100)
      : null;

    return {
      current: {
        period: { startDate, endDate },
        income: current.income,
        expenses: current.expenses,
        savings: current.income - current.expenses,
        transactionCount: current.count,
        categories: currentCategories,
      },
      previous: {
        period: { startDate: prev.startDate, endDate: prev.endDate },
        income: previous.income,
        expenses: previous.expenses,
        savings: previous.income - previous.expenses,
        transactionCount: previous.count,
        categories: previousCategories.map((c) => ({ category: c._id, total: c.total, count: c.count })),
      },
      changes: {
        income: incomeChange,
        expenses: expenseChange,
        savings: current.income - current.expenses - (previous.income - previous.expenses),
        transactionCount: current.count - previous.count,
      },
    };
  } catch (err) {
    logger.error('getMonthOverMonthComparison error:', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  getDashboardSummary,
  getSpendingTrends,
  getCategoryBreakdown,
  getRecentActivity,
  getFinancialHealthScore,
  getUpcomingPayments,
  getInsights,
  getMonthOverMonthComparison,
};
