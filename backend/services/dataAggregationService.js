// ============================================================
// Financial Analyzer - Data Aggregation & Analytics Pipeline
// Feature #96: Multi-source data aggregation with analytics
// ============================================================

const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const mongoose = require('mongoose');

class DataAggregationService {
  /**
   * Get comprehensive financial dashboard data
   */
  static async getDashboardData(userId, period = 'month') {
    try {
      const dateRange = this._getDateRange(period);
      const prevDateRange = this._getPreviousDateRange(period);

      const [
        currentTransactions,
        previousTransactions,
        budgets,
      ] = await Promise.all([
        Transaction.find({ userId, date: { $gte: dateRange.start, $lte: dateRange.end } }),
        Transaction.find({ userId, date: { $gte: prevDateRange.start, $lte: prevDateRange.end } }),
        Budget.find({ userId }),
      ]);

      // Current period stats
      const currentStats = this._calculateStats(currentTransactions);
      const previousStats = this._calculateStats(previousTransactions);

      // Calculate changes
      const changes = {
        income: this._calculateChange(currentStats.totalIncome, previousStats.totalIncome),
        expenses: this._calculateChange(currentStats.totalExpenses, previousStats.totalExpenses),
        savings: this._calculateChange(currentStats.savings, previousStats.savings),
        transactionCount: this._calculateChange(currentStats.count, previousStats.count),
      };

      // Daily breakdown
      const dailyData = this._getDailyBreakdown(currentTransactions);

      // Category analysis
      const categoryAnalysis = this._getCategoryAnalysis(currentTransactions);

      // Budget adherence
      const budgetAdherence = this._getBudgetAdherence(budgets, currentStats.categoryExpenses);

      // Top spending areas
      const topSpending = Object.entries(currentStats.categoryExpenses)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: currentStats.totalExpenses > 0 
            ? Math.round((amount / currentStats.totalExpenses) * 100) 
            : 0,
        }));

      // Spending velocity (pace of spending)
      const daysElapsed = Math.max(1, Math.ceil((dateRange.end - dateRange.start) / 86400000));
      const daysPassed = Math.max(1, Math.ceil((new Date() - dateRange.start) / 86400000));
      const spendingVelocity = {
        dailyAverage: Math.round(currentStats.totalExpenses / daysPassed),
        projectedMonthly: Math.round((currentStats.totalExpenses / daysPassed) * 30),
        pace: currentStats.totalExpenses / daysPassed > previousStats.totalExpenses / daysElapsed 
          ? 'above-average' 
          : 'below-average',
      };

      return {
        success: true,
        period,
        dateRange: { start: dateRange.start, end: dateRange.end },
        currentPeriod: {
          income: currentStats.totalIncome,
          expenses: currentStats.totalExpenses,
          savings: currentStats.savings,
          savingsRate: currentStats.savingsRate,
          transactionCount: currentStats.count,
        },
        previousPeriod: {
          income: previousStats.totalIncome,
          expenses: previousStats.totalExpenses,
          savings: previousStats.savings,
          savingsRate: previousStats.savingsRate,
          transactionCount: previousStats.count,
        },
        changes,
        dailyBreakdown: dailyData,
        categoryAnalysis,
        topSpending,
        budgetAdherence,
        spendingVelocity,
        insights: this._generateInsights(currentStats, previousStats, changes, budgetAdherence),
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get spending patterns analysis
   */
  static async getSpendingPatterns(userId, months = 6) {
    try {
      const startDate = new Date(Date.now() - months * 30 * 86400000);
      const transactions = await Transaction.find({
        userId,
        type: 'expense',
        date: { $gte: startDate },
      });

      // Day of week patterns
      const dayOfWeekSpending = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
      const dayOfWeekCount = [0, 0, 0, 0, 0, 0, 0];
      
      // Time-based patterns (if time data available)
      const hourlySpending = new Array(24).fill(0);
      
      // Weekly patterns
      const weeklySpending = {};
      
      // Category trends
      const categoryMonthly = {};

      transactions.forEach(tx => {
        const date = new Date(tx.date);
        const dayOfWeek = date.getDay();
        dayOfWeekSpending[dayOfWeek] += tx.amount;
        dayOfWeekCount[dayOfWeek]++;

        const hour = date.getHours();
        hourlySpending[hour] += tx.amount;

        const weekKey = `${date.getFullYear()}-W${Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7)}`;
        weeklySpending[weekKey] = (weeklySpending[weekKey] || 0) + tx.amount;

        const monthKey = date.toISOString().substring(0, 7);
        const cat = tx.category || 'Other';
        if (!categoryMonthly[cat]) categoryMonthly[cat] = {};
        categoryMonthly[cat][monthKey] = (categoryMonthly[cat][monthKey] || 0) + tx.amount;
      });

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const avgByDay = dayOfWeekSpending.map((total, i) => ({
        day: dayNames[i],
        shortDay: dayNames[i].substring(0, 3),
        totalSpending: Math.round(total),
        averageSpending: dayOfWeekCount[i] > 0 ? Math.round(total / dayOfWeekCount[i]) : 0,
        transactionCount: dayOfWeekCount[i],
      }));

      // Find peak spending day
      const peakDay = avgByDay.reduce((max, day) => day.averageSpending > max.averageSpending ? day : max, avgByDay[0]);

      // Find biggest spending category
      const categoryTrends = Object.entries(categoryMonthly).map(([category, monthly]) => {
        const amounts = Object.values(monthly);
        const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
        const trend = amounts.length >= 2 
          ? (amounts[amounts.length - 1] - amounts[0]) / amounts[0] 
          : 0;
        return {
          category,
          averageMonthly: Math.round(avg),
          trend: trend > 0.05 ? 'increasing' : trend < -0.05 ? 'decreasing' : 'stable',
          trendPercentage: Math.round(trend * 100),
          monthlyData: monthly,
        };
      }).sort((a, b) => b.averageMonthly - a.averageMonthly);

      return {
        success: true,
        period: `Last ${months} months`,
        patterns: {
          dayOfWeek: avgByDay,
          peakSpendingDay: peakDay,
          lowestSpendingDay: avgByDay.reduce((min, day) => day.averageSpending < min.averageSpending && day.averageSpending > 0 ? day : min, peakDay),
          weekendVsWeekday: {
            weekday: Math.round(avgByDay.slice(1, 6).reduce((s, d) => s + d.averageSpending, 0) / 5),
            weekend: Math.round((avgByDay[0].averageSpending + avgByDay[6].averageSpending) / 2),
          },
        },
        categoryTrends,
        totalTransactions: transactions.length,
        averageTransactionAmount: transactions.length > 0 
          ? Math.round(transactions.reduce((s, t) => s + t.amount, 0) / transactions.length) 
          : 0,
      };
    } catch (error) {
      console.error('Error getting spending patterns:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get financial summary with aggregated metrics
   */
  static async getFinancialSummary(userId) {
    try {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisYearStart = new Date(now.getFullYear(), 0, 1);
      const fyStart = now.getMonth() >= 3 
        ? new Date(now.getFullYear(), 3, 1) 
        : new Date(now.getFullYear() - 1, 3, 1);

      const [thisMonth, thisYear, thisFY, allTime] = await Promise.all([
        Transaction.find({ userId, date: { $gte: thisMonthStart } }),
        Transaction.find({ userId, date: { $gte: thisYearStart } }),
        Transaction.find({ userId, date: { $gte: fyStart } }),
        Transaction.find({ userId }),
      ]);

      const monthStats = this._calculateStats(thisMonth);
      const yearStats = this._calculateStats(thisYear);
      const fyStats = this._calculateStats(thisFY);
      const allTimeStats = this._calculateStats(allTime);

      return {
        success: true,
        thisMonth: {
          income: monthStats.totalIncome,
          expenses: monthStats.totalExpenses,
          savings: monthStats.savings,
          savingsRate: monthStats.savingsRate,
          transactions: monthStats.count,
        },
        thisYear: {
          income: yearStats.totalIncome,
          expenses: yearStats.totalExpenses,
          savings: yearStats.savings,
          savingsRate: yearStats.savingsRate,
          transactions: yearStats.count,
          avgMonthlyIncome: Math.round(yearStats.totalIncome / Math.max(1, now.getMonth() + 1)),
          avgMonthlyExpenses: Math.round(yearStats.totalExpenses / Math.max(1, now.getMonth() + 1)),
        },
        thisFY: {
          income: fyStats.totalIncome,
          expenses: fyStats.totalExpenses,
          savings: fyStats.savings,
          savingsRate: fyStats.savingsRate,
          transactions: fyStats.count,
        },
        allTime: {
          income: allTimeStats.totalIncome,
          expenses: allTimeStats.totalExpenses,
          savings: allTimeStats.savings,
          savingsRate: allTimeStats.savingsRate,
          transactions: allTimeStats.count,
          topCategories: Object.entries(allTimeStats.categoryExpenses)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([cat, amt]) => ({ category: cat, amount: amt })),
        },
      };
    } catch (error) {
      console.error('Error getting financial summary:', error);
      return { success: false, error: error.message };
    }
  }

  // ======================== HELPER METHODS ========================

  static _calculateStats(transactions) {
    let totalIncome = 0;
    let totalExpenses = 0;
    const categoryExpenses = {};
    const categoryIncome = {};

    transactions.forEach(tx => {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
        const cat = tx.category || 'Other';
        categoryIncome[cat] = (categoryIncome[cat] || 0) + tx.amount;
      } else {
        totalExpenses += tx.amount;
        const cat = tx.category || 'Other';
        categoryExpenses[cat] = (categoryExpenses[cat] || 0) + tx.amount;
      }
    });

    return {
      totalIncome,
      totalExpenses,
      savings: totalIncome - totalExpenses,
      savingsRate: totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0,
      count: transactions.length,
      categoryExpenses,
      categoryIncome,
    };
  }

  static _calculateChange(current, previous) {
    if (previous === 0) return { amount: current, percentage: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'neutral' };
    const change = current - previous;
    const pct = Math.round((change / previous) * 100);
    return {
      amount: change,
      percentage: pct,
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
    };
  }

  static _getDateRange(period) {
    const now = new Date();
    switch (period) {
      case 'week': return { start: new Date(now - 7 * 86400000), end: now };
      case 'month': return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
      case 'quarter': return { start: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1), end: now };
      case 'year': return { start: new Date(now.getFullYear(), 0, 1), end: now };
      case 'fy':
        const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        return { start: new Date(fyStart, 3, 1), end: now };
      default: return { start: new Date(now - 30 * 86400000), end: now };
    }
  }

  static _getPreviousDateRange(period) {
    const range = this._getDateRange(period);
    const duration = range.end - range.start;
    return {
      start: new Date(range.start - duration),
      end: new Date(range.start - 1),
    };
  }

  static _getDailyBreakdown(transactions) {
    const daily = {};
    transactions.forEach(tx => {
      const dateKey = new Date(tx.date).toISOString().substring(0, 10);
      if (!daily[dateKey]) daily[dateKey] = { date: dateKey, income: 0, expense: 0, count: 0 };
      if (tx.type === 'income') daily[dateKey].income += tx.amount;
      else daily[dateKey].expense += tx.amount;
      daily[dateKey].count++;
    });
    return Object.values(daily).sort((a, b) => a.date.localeCompare(b.date));
  }

  static _getCategoryAnalysis(transactions) {
    const categories = {};
    transactions.filter(t => t.type === 'expense').forEach(tx => {
      const cat = tx.category || 'Other';
      if (!categories[cat]) categories[cat] = { total: 0, count: 0, transactions: [] };
      categories[cat].total += tx.amount;
      categories[cat].count++;
    });

    const totalExpenses = Object.values(categories).reduce((s, c) => s + c.total, 0);
    return Object.entries(categories)
      .map(([name, data]) => ({
        category: name,
        total: Math.round(data.total),
        count: data.count,
        percentage: totalExpenses > 0 ? Math.round((data.total / totalExpenses) * 100) : 0,
        average: Math.round(data.total / data.count),
      }))
      .sort((a, b) => b.total - a.total);
  }

  static _getBudgetAdherence(budgets, categoryExpenses) {
    if (!budgets || budgets.length === 0) return { score: 0, categories: [] };

    let totalBudget = 0;
    let totalSpent = 0;
    const categoryResults = budgets.map(b => {
      const budgetAmount = b.amount || b.limit || 0;
      const spent = categoryExpenses[b.category] || 0;
      totalBudget += budgetAmount;
      totalSpent += Math.min(spent, budgetAmount);
      return {
        category: b.category,
        budget: budgetAmount,
        spent,
        remaining: budgetAmount - spent,
        percentage: budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0,
        status: spent <= budgetAmount * 0.75 ? 'good' : spent <= budgetAmount ? 'warning' : 'over',
      };
    });

    return {
      score: totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0,
      categories: categoryResults,
      overBudgetCount: categoryResults.filter(c => c.status === 'over').length,
      underBudgetCount: categoryResults.filter(c => c.status === 'good').length,
    };
  }

  static _generateInsights(current, previous, changes, budgetAdherence) {
    const insights = [];

    if (changes.expenses.direction === 'up' && changes.expenses.percentage > 10) {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        title: 'Spending Increased',
        message: `Expenses are up ${changes.expenses.percentage}% compared to last period`,
      });
    }

    if (changes.income.direction === 'up') {
      insights.push({
        type: 'positive',
        icon: '📈',
        title: 'Income Growth',
        message: `Income increased by ${changes.income.percentage}%`,
      });
    }

    if (current.savingsRate >= 30) {
      insights.push({
        type: 'achievement',
        icon: '🏆',
        title: 'Excellent Savings Rate',
        message: `${current.savingsRate}% savings rate is above the recommended 20%`,
      });
    }

    if (budgetAdherence.overBudgetCount > 0) {
      insights.push({
        type: 'alert',
        icon: '🔴',
        title: 'Budget Exceeded',
        message: `${budgetAdherence.overBudgetCount} categories are over budget`,
      });
    }

    return insights;
  }
}

module.exports = DataAggregationService;
