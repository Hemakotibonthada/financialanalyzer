const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const FinancialGoal = require('../models/FinancialGoal');
const moment = require('moment');

/**
 * Spending Behavior Analysis Service
 * Analyzes user spending patterns and provides personalized insights
 */
class SpendingBehaviorService {
  /**
   * Analyze user's complete spending behavior
   */
  async analyzeSpendingBehavior(userId, timeframe = 'last6months') {
    try {
      const dateRange = this.getDateRange(timeframe);
      
      // Get all transactions
      const transactions = await Transaction.find({
        userId: userId,
        date: { $gte: dateRange.start, $lte: dateRange.end }
      }).sort({ date: -1 });

      // Get budgets and goals for context
      const budgets = await Budget.find({ userId: userId });
      const goals = await FinancialGoal.find({ userId: userId });

      // Perform comprehensive analysis
      const analysis = {
        summary: this.generateSpendingSummary(transactions),
        patterns: this.detectSpendingPatterns(transactions),
        categories: this.analyzeCategorySpending(transactions),
        temporal: this.analyzeTemporalPatterns(transactions),
        behavioral: this.analyzeBehavioralIndicators(transactions),
        budgetCompliance: this.analyzeBudgetCompliance(transactions, budgets),
        recommendations: await this.generateRecommendations(userId, transactions, budgets, goals),
        alerts: this.generateAlerts(transactions, budgets),
        insights: this.generateInsights(transactions),
        score: this.calculateSpendingScore(transactions, budgets)
      };

      return analysis;
    } catch (error) {
      console.error('Error analyzing spending behavior:', error);
      throw error;
    }
  }

  /**
   * Generate spending summary
   */
  generateSpendingSummary(transactions) {
    const expenses = transactions.filter(t => t.amount < 0);
    const income = transactions.filter(t => t.amount > 0);

    const totalExpense = Math.abs(expenses.reduce((sum, t) => sum + t.amount, 0));
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    return {
      totalExpense,
      totalIncome,
      netSavings,
      savingsRate: parseFloat(savingsRate.toFixed(2)),
      transactionCount: transactions.length,
      averageExpense: expenses.length > 0 ? totalExpense / expenses.length : 0,
      averageIncome: income.length > 0 ? totalIncome / income.length : 0
    };
  }

  /**
   * Detect spending patterns
   */
  detectSpendingPatterns(transactions) {
    const patterns = {
      recurring: this.detectRecurringTransactions(transactions),
      impulse: this.detectImpulsePurchases(transactions),
      seasonal: this.detectSeasonalSpending(transactions),
      weekend: this.analyzeWeekendSpending(transactions),
      timeOfDay: this.analyzeTimeOfDaySpending(transactions),
      paymentMethod: this.analyzePaymentMethods(transactions)
    };

    return patterns;
  }

  /**
   * Detect recurring transactions
   */
  detectRecurringTransactions(transactions) {
    const recurring = [];
    const grouped = {};

    // Group by merchant and amount
    transactions.forEach(t => {
      if (t.amount < 0) {
        const key = `${t.merchantName || t.description}_${Math.abs(t.amount)}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(t);
      }
    });

    // Find recurring patterns
    Object.keys(grouped).forEach(key => {
      const group = grouped[key];
      if (group.length >= 3) {
        const dates = group.map(t => moment(t.date));
        const intervals = [];
        
        for (let i = 1; i < dates.length; i++) {
          intervals.push(dates[i].diff(dates[i-1], 'days'));
        }

        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        
        // If interval is consistent (within 20% variance)
        const variance = intervals.reduce((sum, interval) => 
          sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
        const stdDev = Math.sqrt(variance);
        
        if (stdDev / avgInterval < 0.2) {
          recurring.push({
            merchant: group[0].merchantName || group[0].description,
            amount: Math.abs(group[0].amount),
            frequency: this.determineFrequency(avgInterval),
            occurrences: group.length,
            nextExpected: moment(dates[dates.length - 1]).add(avgInterval, 'days').format('YYYY-MM-DD'),
            category: group[0].category
          });
        }
      }
    });

    return recurring;
  }

  /**
   * Detect impulse purchases
   */
  detectImpulsePurchases(transactions) {
    const expenses = transactions.filter(t => t.amount < 0);
    if (expenses.length === 0) return { count: 0, totalAmount: 0, purchases: [] };
    const avgAmount = Math.abs(expenses.reduce((sum, t) => sum + t.amount, 0) / expenses.length);
    const stdDev = this.calculateStdDev(expenses.map(t => Math.abs(t.amount)));

    // Impulse purchases are > 2 standard deviations above average
    const impulsePurchases = expenses.filter(t => 
      Math.abs(t.amount) > avgAmount + (2 * stdDev)
    ).map(t => ({
      merchant: t.merchantName || t.description,
      amount: Math.abs(t.amount),
      date: t.date,
      category: t.category,
      deviationFactor: ((Math.abs(t.amount) - avgAmount) / stdDev).toFixed(2)
    }));

    return {
      count: impulsePurchases.length,
      totalAmount: impulsePurchases.reduce((sum, p) => sum + p.amount, 0),
      purchases: impulsePurchases.slice(0, 10) // Top 10
    };
  }

  /**
   * Detect seasonal spending patterns
   */
  detectSeasonalSpending(transactions) {
    const monthlySpending = {};
    
    transactions.forEach(t => {
      if (t.amount < 0) {
        const month = moment(t.date).format('MMM');
        if (!monthlySpending[month]) monthlySpending[month] = 0;
        monthlySpending[month] += Math.abs(t.amount);
      }
    });

    const monthlyValues = Object.values(monthlySpending);
    const avgMonthlySpend = monthlyValues.length > 0 
      ? monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length 
      : 0;

    const peaks = Object.keys(monthlySpending)
      .filter(month => monthlySpending[month] > avgMonthlySpend * 1.3)
      .map(month => ({
        month,
        amount: monthlySpending[month],
        percentAboveAverage: ((monthlySpending[month] - avgMonthlySpend) / avgMonthlySpend * 100).toFixed(1)
      }));

    return {
      monthlySpending,
      averageMonthlySpend: avgMonthlySpend,
      peakMonths: peaks
    };
  }

  /**
   * Analyze weekend vs weekday spending
   */
  analyzeWeekendSpending(transactions) {
    let weekdaySpend = 0, weekendSpend = 0;
    let weekdayCount = 0, weekendCount = 0;

    transactions.forEach(t => {
      if (t.amount < 0) {
        const dayOfWeek = moment(t.date).day();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          weekendSpend += Math.abs(t.amount);
          weekendCount++;
        } else {
          weekdaySpend += Math.abs(t.amount);
          weekdayCount++;
        }
      }
    });

    return {
      weekdayAverage: weekdayCount > 0 ? weekdaySpend / weekdayCount : 0,
      weekendAverage: weekendCount > 0 ? weekendSpend / weekendCount : 0,
      weekendPremium: weekendCount > 0 && weekdayCount > 0 
        ? ((weekendSpend / weekendCount) / (weekdaySpend / weekdayCount) - 1) * 100 
        : 0,
      preference: weekendSpend > weekdaySpend ? 'weekend' : 'weekday'
    };
  }

  /**
   * Analyze time of day spending
   */
  analyzeTimeOfDaySpending(transactions) {
    const timeSlots = {
      morning: { start: 6, end: 12, amount: 0, count: 0 },
      afternoon: { start: 12, end: 18, amount: 0, count: 0 },
      evening: { start: 18, end: 22, amount: 0, count: 0 },
      night: { start: 22, end: 6, amount: 0, count: 0 }
    };

    transactions.forEach(t => {
      if (t.amount < 0 && t.date) {
        const hour = moment(t.date).hour();
        const amount = Math.abs(t.amount);

        if (hour >= 6 && hour < 12) {
          timeSlots.morning.amount += amount;
          timeSlots.morning.count++;
        } else if (hour >= 12 && hour < 18) {
          timeSlots.afternoon.amount += amount;
          timeSlots.afternoon.count++;
        } else if (hour >= 18 && hour < 22) {
          timeSlots.evening.amount += amount;
          timeSlots.evening.count++;
        } else {
          timeSlots.night.amount += amount;
          timeSlots.night.count++;
        }
      }
    });

    const slotKeys = Object.keys(timeSlots);
    const mostActive = slotKeys.length > 0 
      ? slotKeys.reduce((a, b) => timeSlots[a].count > timeSlots[b].count ? a : b)
      : 'morning';

    return { timeSlots, mostActiveTime: mostActive };
  }

  /**
   * Analyze payment methods
   */
  analyzePaymentMethods(transactions) {
    const methods = {};

    transactions.forEach(t => {
      if (t.amount < 0) {
        const method = t.paymentMethod || 'Unknown';
        if (!methods[method]) {
          methods[method] = { count: 0, amount: 0 };
        }
        methods[method].count++;
        methods[method].amount += Math.abs(t.amount);
      }
    });

    return methods;
  }

  /**
   * Analyze category-wise spending
   */
  analyzeCategorySpending(transactions) {
    const categoryData = {};

    transactions.forEach(t => {
      if (t.amount < 0) {
        const category = t.category || 'Uncategorized';
        if (!categoryData[category]) {
          categoryData[category] = { 
            total: 0, 
            count: 0, 
            transactions: [] 
          };
        }
        categoryData[category].total += Math.abs(t.amount);
        categoryData[category].count++;
        categoryData[category].transactions.push(t);
      }
    });

    // Calculate percentages and averages
    const catValues = Object.values(categoryData);
    const totalSpend = catValues.length > 0 ? catValues.reduce((sum, cat) => sum + cat.total, 0) : 0;
    
    const categorySummary = Object.keys(categoryData).map(category => ({
      category,
      total: categoryData[category].total,
      count: categoryData[category].count,
      average: categoryData[category].total / categoryData[category].count,
      percentage: totalSpend > 0 ? (categoryData[category].total / totalSpend * 100).toFixed(1) : '0.0',
      trend: this.calculateCategoryTrend(categoryData[category].transactions)
    })).sort((a, b) => b.total - a.total);

    return {
      categories: categorySummary,
      topCategories: categorySummary.slice(0, 5),
      totalSpend
    };
  }

  /**
   * Calculate category trend
   */
  calculateCategoryTrend(transactions) {
    if (transactions.length < 2) return 'stable';

    const sorted = transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    const midpoint = Math.floor(sorted.length / 2);
    
    const firstHalf = sorted.slice(0, midpoint).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const secondHalf = sorted.slice(midpoint).reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const change = ((secondHalf - firstHalf) / firstHalf) * 100;

    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  /**
   * Analyze temporal patterns
   */
  analyzeTemporalPatterns(transactions) {
    const dailySpending = {};
    const weeklySpending = {};
    const monthlySpending = {};

    transactions.forEach(t => {
      if (t.amount < 0) {
        const date = moment(t.date);
        const day = date.format('YYYY-MM-DD');
        const week = date.format('YYYY-[W]WW');
        const month = date.format('YYYY-MM');

        dailySpending[day] = (dailySpending[day] || 0) + Math.abs(t.amount);
        weeklySpending[week] = (weeklySpending[week] || 0) + Math.abs(t.amount);
        monthlySpending[month] = (monthlySpending[month] || 0) + Math.abs(t.amount);
      }
    });

    return {
      dailyAverage: this.calculateAverage(Object.values(dailySpending)),
      weeklyAverage: this.calculateAverage(Object.values(weeklySpending)),
      monthlyAverage: this.calculateAverage(Object.values(monthlySpending)),
      mostExpensiveDay: this.findMax(dailySpending),
      mostExpensiveWeek: this.findMax(weeklySpending),
      mostExpensiveMonth: this.findMax(monthlySpending)
    };
  }

  /**
   * Analyze behavioral indicators
   */
  analyzeBehavioralIndicators(transactions) {
    const expenses = transactions.filter(t => t.amount < 0);
    
    return {
      spendingVelocity: this.calculateSpendingVelocity(expenses),
      consistencyScore: this.calculateConsistencyScore(expenses),
      diversificationIndex: this.calculateDiversificationIndex(expenses),
      luxuryRatio: this.calculateLuxuryRatio(expenses),
      essentialRatio: this.calculateEssentialRatio(expenses),
      discretionaryRatio: this.calculateDiscretionaryRatio(expenses),
      cashBurnRate: this.calculateCashBurnRate(expenses)
    };
  }

  /**
   * Calculate spending velocity (transactions per day)
   */
  calculateSpendingVelocity(transactions) {
    if (transactions.length === 0) return 0;
    
    const dates = transactions.map(t => moment(t.date));
    const dayRange = moment.max(dates).diff(moment.min(dates), 'days') || 1;
    
    return (transactions.length / dayRange).toFixed(2);
  }

  /**
   * Calculate consistency score (how consistent is spending)
   */
  calculateConsistencyScore(transactions) {
    if (transactions.length < 2) return 100;

    const amounts = transactions.map(t => Math.abs(t.amount));
    const mean = this.calculateAverage(amounts);
    const stdDev = this.calculateStdDev(amounts);
    
    // Lower coefficient of variation = higher consistency
    const coefficientOfVariation = (stdDev / mean) * 100;
    const consistencyScore = Math.max(0, 100 - coefficientOfVariation);
    
    return parseFloat(consistencyScore.toFixed(2));
  }

  /**
   * Calculate diversification index
   */
  calculateDiversificationIndex(transactions) {
    const categories = new Set(transactions.map(t => t.category));
    const merchants = new Set(transactions.map(t => t.merchantName || t.description));
    
    // More categories and merchants = higher diversification
    const categoryScore = Math.min(categories.size * 5, 50);
    const merchantScore = Math.min(merchants.size * 2, 50);
    
    return parseFloat((categoryScore + merchantScore).toFixed(2));
  }

  /**
   * Calculate luxury spending ratio
   */
  calculateLuxuryRatio(transactions) {
    const luxuryCategories = ['Entertainment', 'Dining', 'Shopping', 'Travel', 'Luxury'];
    const totalSpend = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const luxurySpend = transactions
      .filter(t => luxuryCategories.includes(t.category))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    return totalSpend > 0 ? parseFloat(((luxurySpend / totalSpend) * 100).toFixed(2)) : 0;
  }

  /**
   * Calculate essential spending ratio
   */
  calculateEssentialRatio(transactions) {
    const essentialCategories = ['Groceries', 'Utilities', 'Rent', 'Healthcare', 'Transportation'];
    const totalSpend = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const essentialSpend = transactions
      .filter(t => essentialCategories.includes(t.category))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    return totalSpend > 0 ? parseFloat(((essentialSpend / totalSpend) * 100).toFixed(2)) : 0;
  }

  /**
   * Calculate discretionary spending ratio
   */
  calculateDiscretionaryRatio(transactions) {
    const essentialRatio = this.calculateEssentialRatio(transactions);
    return parseFloat((100 - essentialRatio).toFixed(2));
  }

  /**
   * Calculate cash burn rate (daily average spending)
   */
  calculateCashBurnRate(transactions) {
    if (transactions.length === 0) return 0;
    
    const totalSpend = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const dates = transactions.map(t => moment(t.date));
    const dayRange = moment.max(dates).diff(moment.min(dates), 'days') || 1;
    
    return parseFloat((totalSpend / dayRange).toFixed(2));
  }

  /**
   * Analyze budget compliance
   */
  analyzeBudgetCompliance(transactions, budgets) {
    const compliance = budgets.map(budget => {
      const categoryTransactions = transactions.filter(t => 
        t.category === budget.category && t.amount < 0
      );
      
      const spent = Math.abs(categoryTransactions.reduce((sum, t) => sum + t.amount, 0));
      const budgetLimit = budget.amount || budget.limit || 0;
      const percentUsed = budgetLimit > 0 ? (spent / budgetLimit) * 100 : 0;
      const remaining = budgetLimit - spent;
      
      let status = 'safe';
      if (percentUsed >= 100) status = 'exceeded';
      else if (percentUsed >= 80) status = 'warning';
      
      return {
        category: budget.category,
        limit: budgetLimit,
        spent,
        remaining,
        percentUsed: parseFloat(percentUsed.toFixed(2)),
        status,
        transactionCount: categoryTransactions.length
      };
    });

    const overallCompliance = compliance.length > 0
      ? (compliance.filter(c => c.status === 'safe').length / compliance.length) * 100
      : 100;

    return {
      budgets: compliance,
      overallComplianceScore: parseFloat(overallCompliance.toFixed(2)),
      exceededCount: compliance.filter(c => c.status === 'exceeded').length,
      warningCount: compliance.filter(c => c.status === 'warning').length
    };
  }

  /**
   * Generate personalized recommendations
   */
  async generateRecommendations(userId, transactions, budgets, goals) {
    const recommendations = [];
    
    // Analyze spending patterns
    const categoryAnalysis = this.analyzeCategorySpending(transactions);
    const behavioral = this.analyzeBehavioralIndicators(transactions);
    const patterns = this.detectSpendingPatterns(transactions);

    // High discretionary spending
    if (behavioral.discretionaryRatio > 50) {
      recommendations.push({
        type: 'reduce_discretionary',
        priority: 'high',
        title: 'Reduce Discretionary Spending',
        message: `${behavioral.discretionaryRatio}% of your spending is discretionary. Consider reducing non-essential expenses.`,
        potentialSavings: categoryAnalysis.totalSpend * 0.15,
        action: 'Review and cut back on entertainment, dining out, and shopping expenses'
      });
    }

    // Impulse purchases
    if (patterns.impulse.count > 5) {
      recommendations.push({
        type: 'control_impulse',
        priority: 'medium',
        title: 'Control Impulse Purchases',
        message: `You made ${patterns.impulse.count} large impulse purchases totaling ₹${patterns.impulse.totalAmount.toFixed(2)}`,
        potentialSavings: patterns.impulse.totalAmount * 0.5,
        action: 'Implement a 24-hour wait rule for purchases over ₹1000'
      });
    }

    // Budget exceeded
    const exceededBudgets = budgets.filter(b => {
      const spent = transactions
        .filter(t => t.category === b.category && t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      return spent > (b.amount || b.limit || 0);
    });

    if (exceededBudgets.length > 0) {
      recommendations.push({
        type: 'budget_exceeded',
        priority: 'high',
        title: 'Budget Limits Exceeded',
        message: `You've exceeded budget limits in ${exceededBudgets.length} categories`,
        categories: exceededBudgets.map(b => b.category),
        action: 'Review and adjust budgets or reduce spending in these categories'
      });
    }

    // Low savings rate
    const summary = this.generateSpendingSummary(transactions);
    if (summary.savingsRate < 20) {
      recommendations.push({
        type: 'increase_savings',
        priority: 'high',
        title: 'Increase Savings Rate',
        message: `Your savings rate is ${summary.savingsRate}%. Financial experts recommend at least 20%.`,
        targetSavings: summary.totalIncome * 0.2,
        currentSavings: summary.netSavings,
        action: 'Set up automatic transfers to savings account after each paycheck'
      });
    }

    // Subscription optimization
    if (patterns.recurring.length > 5) {
      recommendations.push({
        type: 'optimize_subscriptions',
        priority: 'medium',
        title: 'Optimize Subscriptions',
        message: `You have ${patterns.recurring.length} recurring payments. Review and cancel unused subscriptions.`,
        subscriptions: patterns.recurring.slice(0, 5),
        potentialSavings: patterns.recurring.reduce((sum, s) => sum + s.amount, 0) * 0.3,
        action: 'Audit all subscriptions and keep only essential ones'
      });
    }

    // Weekend spending
    if (patterns.weekend.weekendPremium > 30) {
      recommendations.push({
        type: 'weekend_spending',
        priority: 'low',
        title: 'Manage Weekend Spending',
        message: `You spend ${patterns.weekend.weekendPremium.toFixed(1)}% more on weekends`,
        action: 'Plan affordable weekend activities to reduce overspending'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate alerts
   */
  generateAlerts(transactions, budgets) {
    const alerts = [];
    const recentTransactions = transactions.slice(0, 30);

    // Unusual spending alert
    const expenseTransactions = transactions.filter(t => t.amount < 0);
    const avgAmount = expenseTransactions.length > 0 
      ? Math.abs(expenseTransactions.reduce((sum, t) => sum + t.amount, 0) / expenseTransactions.length)
      : 0;

    recentTransactions.forEach(t => {
      if (avgAmount > 0 && Math.abs(t.amount) > avgAmount * 3) {
        alerts.push({
          type: 'unusual_spending',
          severity: 'warning',
          title: 'Unusual Large Transaction',
          message: `Transaction of ₹${Math.abs(t.amount).toFixed(2)} at ${t.merchantName || t.description} is significantly higher than your average`,
          transaction: t
        });
      }
    });

    // Budget alert
    budgets.forEach(budget => {
      const spent = transactions
        .filter(t => t.category === budget.category && t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const budgetAmt = budget.amount || budget.limit || 0;
      const percentUsed = budgetAmt > 0 ? (spent / budgetAmt) * 100 : 0;

      if (percentUsed >= 90) {
        alerts.push({
          type: 'budget_alert',
          severity: percentUsed >= 100 ? 'critical' : 'warning',
          title: `Budget Alert: ${budget.category}`,
          message: `You've used ${percentUsed.toFixed(1)}% of your ${budget.category} budget`,
          category: budget.category,
          spent,
          limit: budgetAmt
        });
      }
    });

    return alerts;
  }

  /**
   * Generate insights
   */
  generateInsights(transactions) {
    const insights = [];
    
    const categoryAnalysis = this.analyzeCategorySpending(transactions);
    const patterns = this.detectSpendingPatterns(transactions);
    
    // Top spending category
    if (categoryAnalysis.topCategories.length > 0) {
      const top = categoryAnalysis.topCategories[0];
      insights.push({
        type: 'top_category',
        title: 'Top Spending Category',
        message: `${top.category} accounts for ${top.percentage}% of your total spending (₹${top.total.toFixed(2)})`,
        icon: '📊'
      });
    }

    // Spending trend
    const trend = this.calculateOverallTrend(transactions);
    insights.push({
      type: 'trend',
      title: 'Spending Trend',
      message: `Your spending is ${trend.direction} by ${trend.percentage}% compared to previous period`,
      icon: trend.direction === 'increasing' ? '📈' : '📉'
    });

    // Most frequent merchant
    const merchantFrequency = {};
    transactions.forEach(t => {
      const merchant = t.merchantName || t.description || 'Unknown';
      merchantFrequency[merchant] = (merchantFrequency[merchant] || 0) + 1;
    });
    const merchantKeys = Object.keys(merchantFrequency);
    if (merchantKeys.length > 0) {
      const topMerchant = merchantKeys.reduce((a, b) => 
        merchantFrequency[a] > merchantFrequency[b] ? a : b
      );
      
      insights.push({
        type: 'frequent_merchant',
        title: 'Most Frequent Merchant',
        message: `You shop most at ${topMerchant} (${merchantFrequency[topMerchant]} transactions)`,
        icon: '🛒'
      });
    }

    // Weekend vs weekday
    if (patterns.weekend.preference) {
      insights.push({
        type: 'spending_pattern',
        title: 'Spending Pattern',
        message: `You tend to spend more on ${patterns.weekend.preference}s`,
        icon: '📅'
      });
    }

    return insights;
  }

  /**
   * Calculate spending score (0-100)
   */
  calculateSpendingScore(transactions, budgets) {
    let score = 100;
    
    const summary = this.generateSpendingSummary(transactions);
    const behavioral = this.analyzeBehavioralIndicators(transactions);
    const budgetCompliance = this.analyzeBudgetCompliance(transactions, budgets);

    // Savings rate (30 points)
    if (summary.savingsRate < 10) score -= 30;
    else if (summary.savingsRate < 20) score -= 15;
    else if (summary.savingsRate >= 30) score += 10;

    // Budget compliance (25 points)
    score -= (25 - (budgetCompliance.overallComplianceScore * 0.25));

    // Essential vs discretionary (20 points)
    if (behavioral.essentialRatio < 40) score -= 20;
    else if (behavioral.essentialRatio >= 60) score += 10;

    // Consistency (15 points)
    score += (behavioral.consistencyScore * 0.15);

    // Diversification (10 points)
    score += (behavioral.diversificationIndex * 0.1);

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Helper: Get date range
   */
  getDateRange(timeframe) {
    const end = moment();
    let start;

    switch(timeframe) {
      case 'last30days':
        start = moment().subtract(30, 'days');
        break;
      case 'last90days':
        start = moment().subtract(90, 'days');
        break;
      case 'last6months':
        start = moment().subtract(6, 'months');
        break;
      case 'lastyear':
        start = moment().subtract(1, 'year');
        break;
      default:
        start = moment().subtract(6, 'months');
    }

    return { start: start.toDate(), end: end.toDate() };
  }

  /**
   * Helper: Calculate average
   */
  calculateAverage(arr) {
    return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  /**
   * Helper: Calculate standard deviation
   */
  calculateStdDev(arr) {
    if (arr.length === 0) return 0;
    const mean = this.calculateAverage(arr);
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }

  /**
   * Helper: Find maximum value in object
   */
  findMax(obj) {
    const keys = Object.keys(obj);
    if (keys.length === 0) return 'N/A';
    return keys.reduce((a, b) => obj[a] > obj[b] ? a : b);
  }

  /**
   * Helper: Determine frequency from interval
   */
  determineFrequency(days) {
    if (days <= 1) return 'daily';
    if (days <= 7) return 'weekly';
    if (days <= 15) return 'bi-weekly';
    if (days <= 31) return 'monthly';
    if (days <= 92) return 'quarterly';
    return 'yearly';
  }

  /**
   * Helper: Calculate overall trend
   */
  calculateOverallTrend(transactions) {
    if (transactions.length < 2) return { direction: 'stable', percentage: 0 };

    const sorted = transactions.filter(t => t.amount < 0)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const midpoint = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, midpoint).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const secondHalf = sorted.slice(midpoint).reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const change = ((secondHalf - firstHalf) / firstHalf) * 100;

    return {
      direction: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable',
      percentage: Math.abs(change).toFixed(1)
    };
  }
}

module.exports = new SpendingBehaviorService();
