/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  EXPENSE INTELLIGENCE SERVICE - Smart Expense Analysis & Categorization
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

class ExpenseIntelligenceService {
  constructor() {
    this.merchantPatterns = {
      grocery: /swiggy\s*instamart|blinkit|bigbasket|zepto|dmart|reliance\s*fresh|more\s*mega|nature'?s\s*basket|grofers|jiomart/i,
      food: /swiggy|zomato|domino|pizza\s*hut|mcdonald|burger\s*king|kfc|subway|starbucks|café\s*coffee|haldiram|barbeque\s*nation/i,
      transport: /uber|ola|rapido|metro|irctc|makemytrip|goibibo|redbus|blabla|fastag|fuel|petrol|diesel|hp\s*fuel|iocl|bpcl/i,
      shopping: /amazon|flipkart|myntra|ajio|meesho|nykaa|tata\s*cliq|snapdeal|paytm\s*mall|shoppers\s*stop|lifestyle/i,
      entertainment: /netflix|hotstar|prime\s*video|spotify|gaana|youtube|bookmyshow|pvr|inox|zee5|sonyliv|jiocinema/i,
      utilities: /electricity|water\s*bill|gas\s*bill|broadband|jio|airtel|vodafone|bsnl|tata\s*sky|dish\s*tv|d2h/i,
      healthcare: /pharmacy|apollo|medplus|netmeds|pharmeasy|1mg|doctor|hospital|clinic|dental|diagnostic|lab/i,
      education: /udemy|coursera|byju|unacademy|vedantu|school|college|university|tuition|coaching/i,
      insurance: /lic|hdfc\s*life|sbi\s*life|icici\s*pru|max\s*life|star\s*health|care\s*health|niva\s*bupa/i,
      investment: /zerodha|groww|upstox|angel|5paisa|motilal|hdfc\s*sec|icici\s*direct|sbi\s*mf|nippon|axis\s*mf/i,
      rent: /rent|house\s*rent|lease|landlord|pg\s*accommodation/i,
      emi: /emi|loan\s*payment|installment|bajaj\s*finserv|tata\s*capital|hdfc\s*bank\s*emi/i
    };

    this.categoryBudgetDefaults = {
      food: 0.15, grocery: 0.10, transport: 0.08, shopping: 0.10,
      entertainment: 0.05, utilities: 0.08, healthcare: 0.05,
      education: 0.05, rent: 0.25, emi: 0.10, other: 0.09
    };
  }

  /**
   * Analyze spending patterns and provide intelligence
   */
  async analyzeSpending(userId, options = {}) {
    try {
      const { days = 90, granularity = 'monthly' } = options;
      const transactions = await this._getExpenseTransactions(userId, days);
      
      if (transactions.length === 0) {
        return { summary: null, trends: [], anomalies: [], patterns: [], recommendations: [] };
      }

      const summary = this._calculateSpendingSummary(transactions, days);
      const trends = this._analyzeTrends(transactions, granularity);
      const anomalies = this._detectAnomalies(transactions);
      const patterns = this._identifyPatterns(transactions);
      const recommendations = this._generateRecommendations(summary, trends, anomalies, patterns);
      const merchantAnalysis = this._analyzeMerchants(transactions);
      const dayOfWeekAnalysis = this._analyzeDayOfWeek(transactions);
      const timeOfDayAnalysis = this._analyzeTimeOfDay(transactions);
      const categoryAnalysis = this._analyzeCategoryTrends(transactions);
      const savingsOpportunities = this._findSavingsOpportunities(transactions, summary);

      return {
        summary,
        trends,
        anomalies,
        patterns,
        recommendations,
        merchantAnalysis,
        dayOfWeekAnalysis,
        timeOfDayAnalysis,
        categoryAnalysis,
        savingsOpportunities
      };
    } catch (error) {
      logger.error('Expense intelligence analysis error:', error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive spending summary
   */
  _calculateSpendingSummary(transactions, days) {
    const totalSpent = transactions.reduce((s, t) => s + (t.amount || 0), 0);
    const avgDaily = totalSpent / Math.max(1, days);
    const months = Math.max(1, days / 30);
    const avgMonthly = totalSpent / months;

    // Category breakdown
    const categoryBreakdown = {};
    transactions.forEach(t => {
      const cat = t.category || this._autoDetectCategory(t.description || t.merchant || '');
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { amount: 0, count: 0, transactions: [] };
      categoryBreakdown[cat].amount += t.amount || 0;
      categoryBreakdown[cat].count++;
      categoryBreakdown[cat].transactions.push(t);
    });

    // Calculate percentages
    Object.keys(categoryBreakdown).forEach(cat => {
      categoryBreakdown[cat].percentage = totalSpent > 0 ? (categoryBreakdown[cat].amount / totalSpent) * 100 : 0;
      categoryBreakdown[cat].avgTransaction = categoryBreakdown[cat].count > 0 
        ? categoryBreakdown[cat].amount / categoryBreakdown[cat].count : 0;
    });

    // Needs vs Wants analysis
    const necessityCategories = ['rent', 'emi', 'grocery', 'utilities', 'healthcare', 'insurance', 'education', 'transport'];
    const wantCategories = ['food', 'shopping', 'entertainment', 'travel', 'lifestyle'];
    
    const needsAmount = Object.entries(categoryBreakdown)
      .filter(([cat]) => necessityCategories.includes(cat))
      .reduce((s, [, data]) => s + data.amount, 0);
    const wantsAmount = Object.entries(categoryBreakdown)
      .filter(([cat]) => wantCategories.includes(cat))
      .reduce((s, [, data]) => s + data.amount, 0);
    const otherAmount = totalSpent - needsAmount - wantsAmount;

    // Top categories
    const topCategories = Object.entries(categoryBreakdown)
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 10)
      .map(([name, data]) => ({ name, ...data }));

    // Largest transactions
    const largestTransactions = [...transactions]
      .sort((a, b) => (b.amount || 0) - (a.amount || 0))
      .slice(0, 10);

    return {
      totalSpent,
      avgDaily,
      avgMonthly,
      avgTransaction: transactions.length > 0 ? totalSpent / transactions.length : 0,
      transactionCount: transactions.length,
      categoryBreakdown,
      topCategories,
      largestTransactions,
      needsVsWants: {
        needs: totalSpent > 0 ? (needsAmount / totalSpent) * 100 : 0,
        wants: totalSpent > 0 ? (wantsAmount / totalSpent) * 100 : 0,
        savings: 0,
        needsAmount,
        wantsAmount,
        otherAmount
      },
      days
    };
  }

  /**
   * Analyze spending trends over time
   */
  _analyzeTrends(transactions, granularity = 'monthly') {
    const buckets = {};
    
    transactions.forEach(t => {
      const date = new Date(t.date);
      let key;
      if (granularity === 'daily') key = date.toISOString().split('T')[0];
      else if (granularity === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!buckets[key]) buckets[key] = { total: 0, count: 0, categories: {} };
      buckets[key].total += t.amount || 0;
      buckets[key].count++;
      const cat = t.category || 'other';
      buckets[key].categories[cat] = (buckets[key].categories[cat] || 0) + (t.amount || 0);
    });

    const sortedKeys = Object.keys(buckets).sort();
    const trend = sortedKeys.map(key => ({
      period: key,
      total: buckets[key].total,
      count: buckets[key].count,
      categories: buckets[key].categories
    }));

    // Calculate trend direction
    if (trend.length >= 2) {
      const recentHalf = trend.slice(Math.floor(trend.length / 2));
      const olderHalf = trend.slice(0, Math.floor(trend.length / 2));
      const recentAvg = recentHalf.reduce((s, t) => s + t.total, 0) / recentHalf.length;
      const olderAvg = olderHalf.reduce((s, t) => s + t.total, 0) / olderHalf.length;
      const changePercent = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

      return {
        data: trend,
        direction: changePercent > 5 ? 'increasing' : changePercent < -5 ? 'decreasing' : 'stable',
        changePercent
      };
    }

    return { data: trend, direction: 'stable', changePercent: 0 };
  }

  /**
   * Detect spending anomalies
   */
  _detectAnomalies(transactions) {
    const anomalies = [];
    
    // Calculate per-category statistics
    const categoryStats = {};
    transactions.forEach(t => {
      const cat = t.category || 'other';
      if (!categoryStats[cat]) categoryStats[cat] = [];
      categoryStats[cat].push(t.amount || 0);
    });

    // Find outliers using IQR method for each category
    Object.entries(categoryStats).forEach(([category, amounts]) => {
      if (amounts.length < 5) return;
      
      const sorted = [...amounts].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      const upperBound = q3 + 1.5 * iqr;
      const lowerBound = q1 - 1.5 * iqr;

      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;

      transactions.filter(t => (t.category || 'other') === category).forEach(t => {
        if ((t.amount || 0) > upperBound && (t.amount || 0) > mean * 2) {
          anomalies.push({
            transaction: t,
            category,
            type: 'unusually_high',
            deviation: ((t.amount - mean) / mean * 100).toFixed(0),
            expectedRange: { min: Math.round(lowerBound), max: Math.round(upperBound) },
            message: `Unusually high ${category} expense of ₹${t.amount.toLocaleString()} (${((t.amount - mean) / mean * 100).toFixed(0)}% above average)`
          });
        }
      });
    });

    // Detect sudden category spikes
    const monthlyCategories = {};
    transactions.forEach(t => {
      const month = new Date(t.date).toISOString().substring(0, 7);
      const cat = t.category || 'other';
      if (!monthlyCategories[cat]) monthlyCategories[cat] = {};
      monthlyCategories[cat][month] = (monthlyCategories[cat][month] || 0) + (t.amount || 0);
    });

    Object.entries(monthlyCategories).forEach(([cat, monthly]) => {
      const values = Object.values(monthly);
      if (values.length < 3) return;
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const lastMonth = values[values.length - 1];
      if (lastMonth > avg * 1.5 && lastMonth > avg + 5000) {
        anomalies.push({
          type: 'category_spike',
          category: cat,
          currentMonth: lastMonth,
          average: avg,
          deviation: ((lastMonth - avg) / avg * 100).toFixed(0),
          message: `${cat} spending spiked ${((lastMonth - avg) / avg * 100).toFixed(0)}% above average this month`
        });
      }
    });

    return anomalies.sort((a, b) => parseInt(b.deviation) - parseInt(a.deviation)).slice(0, 10);
  }

  /**
   * Identify recurring spending patterns
   */
  _identifyPatterns(transactions) {
    const patterns = [];

    // Find recurring merchants
    const merchantFrequency = {};
    transactions.forEach(t => {
      const merchant = (t.merchant || t.description || '').toLowerCase().trim();
      if (!merchant) return;
      if (!merchantFrequency[merchant]) merchantFrequency[merchant] = { count: 0, totalAmount: 0, dates: [] };
      merchantFrequency[merchant].count++;
      merchantFrequency[merchant].totalAmount += t.amount || 0;
      merchantFrequency[merchant].dates.push(new Date(t.date));
    });

    // Detect subscription-like patterns (regular intervals)
    Object.entries(merchantFrequency)
      .filter(([, data]) => data.count >= 3)
      .forEach(([merchant, data]) => {
        const sortedDates = data.dates.sort((a, b) => a - b);
        const intervals = [];
        for (let i = 1; i < sortedDates.length; i++) {
          intervals.push((sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24));
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const intervalVariance = intervals.reduce((s, i) => s + Math.pow(i - avgInterval, 2), 0) / intervals.length;
        const isRegular = Math.sqrt(intervalVariance) < avgInterval * 0.3;

        if (isRegular && avgInterval < 35) {
          patterns.push({
            type: 'subscription',
            merchant,
            frequency: avgInterval < 8 ? 'weekly' : avgInterval < 20 ? 'biweekly' : 'monthly',
            avgAmount: data.totalAmount / data.count,
            totalSpent: data.totalAmount,
            occurrences: data.count,
            intervalDays: Math.round(avgInterval)
          });
        } else if (data.count >= 5) {
          patterns.push({
            type: 'frequent',
            merchant,
            avgAmount: data.totalAmount / data.count,
            totalSpent: data.totalAmount,
            occurrences: data.count
          });
        }
      });

    // Weekend vs weekday spending
    const weekendSpend = transactions
      .filter(t => [0, 6].includes(new Date(t.date).getDay()))
      .reduce((s, t) => s + (t.amount || 0), 0);
    const weekdaySpend = transactions
      .filter(t => ![0, 6].includes(new Date(t.date).getDay()))
      .reduce((s, t) => s + (t.amount || 0), 0);
    
    if (weekendSpend > 0 || weekdaySpend > 0) {
      const totalDays = Math.ceil((Math.max(...transactions.map(t => new Date(t.date).getTime())) - 
        Math.min(...transactions.map(t => new Date(t.date).getTime()))) / (1000 * 60 * 60 * 24)) || 1;
      const weekendDays = Math.round(totalDays * 2 / 7);
      const weekdayDays = totalDays - weekendDays;
      const avgWeekendDaily = weekendDays > 0 ? weekendSpend / weekendDays : 0;
      const avgWeekdayDaily = weekdayDays > 0 ? weekdaySpend / weekdayDays : 0;

      if (avgWeekendDaily > avgWeekdayDaily * 1.3) {
        patterns.push({
          type: 'weekend_heavy',
          weekendAvgDaily: avgWeekendDaily,
          weekdayAvgDaily: avgWeekdayDaily,
          message: `Weekend spending is ${((avgWeekendDaily / avgWeekdayDaily - 1) * 100).toFixed(0)}% higher than weekdays`
        });
      }
    }

    return patterns;
  }

  /**
   * Analyze merchant spending
   */
  _analyzeMerchants(transactions) {
    const merchantData = {};
    transactions.forEach(t => {
      const merchant = t.merchant || t.description || 'Unknown';
      if (!merchantData[merchant]) merchantData[merchant] = { amount: 0, count: 0, category: t.category };
      merchantData[merchant].amount += t.amount || 0;
      merchantData[merchant].count++;
    });

    return Object.entries(merchantData)
      .map(([name, data]) => ({ name, ...data, avgTransaction: data.amount / data.count }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 20);
  }

  /**
   * Analyze spending by day of week
   */
  _analyzeDayOfWeek(transactions) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayData = Array(7).fill(null).map(() => ({ amount: 0, count: 0 }));

    transactions.forEach(t => {
      const day = new Date(t.date).getDay();
      dayData[day].amount += t.amount || 0;
      dayData[day].count++;
    });

    return days.map((name, i) => ({
      day: name,
      shortDay: name.substring(0, 3),
      amount: dayData[i].amount,
      count: dayData[i].count,
      avgAmount: dayData[i].count > 0 ? dayData[i].amount / dayData[i].count : 0
    }));
  }

  /**
   * Analyze spending by time of day
   */
  _analyzeTimeOfDay(transactions) {
    const timeSlots = {
      'Early Morning (5-8)': { range: [5, 8], amount: 0, count: 0 },
      'Morning (8-12)': { range: [8, 12], amount: 0, count: 0 },
      'Afternoon (12-17)': { range: [12, 17], amount: 0, count: 0 },
      'Evening (17-21)': { range: [17, 21], amount: 0, count: 0 },
      'Night (21-24)': { range: [21, 24], amount: 0, count: 0 },
      'Late Night (0-5)': { range: [0, 5], amount: 0, count: 0 }
    };

    transactions.forEach(t => {
      const hour = new Date(t.date).getHours();
      for (const [, slot] of Object.entries(timeSlots)) {
        if (hour >= slot.range[0] && hour < slot.range[1]) {
          slot.amount += t.amount || 0;
          slot.count++;
          break;
        }
      }
    });

    return Object.entries(timeSlots).map(([name, data]) => ({
      timeSlot: name,
      amount: data.amount,
      count: data.count,
      avgAmount: data.count > 0 ? data.amount / data.count : 0
    }));
  }

  /**
   * Analyze category trends over time
   */
  _analyzeCategoryTrends(transactions) {
    const monthlyByCategory = {};
    transactions.forEach(t => {
      const month = new Date(t.date).toISOString().substring(0, 7);
      const cat = t.category || 'other';
      if (!monthlyByCategory[cat]) monthlyByCategory[cat] = {};
      monthlyByCategory[cat][month] = (monthlyByCategory[cat][month] || 0) + (t.amount || 0);
    });

    return Object.entries(monthlyByCategory).map(([category, monthly]) => {
      const values = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b));
      const amounts = values.map(([, v]) => v);
      const trend = amounts.length >= 2 ? 
        ((amounts[amounts.length - 1] - amounts[0]) / Math.max(1, amounts[0]) * 100) : 0;

      return {
        category,
        monthlyData: values.map(([month, amount]) => ({ month, amount })),
        trend: trend > 10 ? 'increasing' : trend < -10 ? 'decreasing' : 'stable',
        trendPercent: trend,
        avgMonthly: amounts.reduce((a, b) => a + b, 0) / amounts.length
      };
    }).sort((a, b) => Math.abs(b.trendPercent) - Math.abs(a.trendPercent));
  }

  /**
   * Find savings opportunities
   */
  _findSavingsOpportunities(transactions, summary) {
    const opportunities = [];

    // Subscription optimization
    const subscriptions = this._identifyPatterns(transactions).filter(p => p.type === 'subscription');
    if (subscriptions.length > 3) {
      const totalSubscriptions = subscriptions.reduce((s, sub) => s + sub.avgAmount, 0);
      opportunities.push({
        type: 'subscription_audit',
        title: 'Review Subscriptions',
        description: `You have ${subscriptions.length} recurring subscriptions totaling ~₹${Math.round(totalSubscriptions).toLocaleString()} monthly. Review if all are still needed.`,
        potentialSavings: Math.round(totalSubscriptions * 0.2), // Assume 20% can be cut
        priority: 'medium'
      });
    }

    // Food delivery optimization
    const foodSpend = (summary.categoryBreakdown.food?.amount || 0);
    const grocerySpend = (summary.categoryBreakdown.grocery?.amount || 0);
    if (foodSpend > grocerySpend * 1.5 && foodSpend > 5000) {
      opportunities.push({
        type: 'cooking_more',
        title: 'Cook More, Order Less',
        description: `You spend ${Math.round((foodSpend / (foodSpend + grocerySpend)) * 100)}% on outside food. Cooking at home could save significantly.`,
        potentialSavings: Math.round(foodSpend * 0.4),
        priority: 'high'
      });
    }

    // Shopping optimization
    const shoppingSpend = summary.categoryBreakdown.shopping?.amount || 0;
    if (shoppingSpend > summary.totalSpent * 0.15) {
      opportunities.push({
        type: 'shopping_discipline',
        title: 'Reduce Impulse Shopping',
        description: `Shopping is ${((shoppingSpend / summary.totalSpent) * 100).toFixed(0)}% of spending. Use the 24-hour rule before purchases.`,
        potentialSavings: Math.round(shoppingSpend * 0.3),
        priority: 'medium'
      });
    }

    // Entertainment budget
    const entertainmentSpend = summary.categoryBreakdown.entertainment?.amount || 0;
    if (entertainmentSpend > summary.totalSpent * 0.08) {
      opportunities.push({
        type: 'entertainment_budget',
        title: 'Set Entertainment Budget',
        description: `Entertainment spending is ${((entertainmentSpend / summary.totalSpent) * 100).toFixed(0)}% of total. Set a monthly cap.`,
        potentialSavings: Math.round(entertainmentSpend * 0.25),
        priority: 'low'
      });
    }

    // Transportation optimization
    const transportSpend = summary.categoryBreakdown.transport?.amount || 0;
    if (transportSpend > summary.totalSpent * 0.12) {
      opportunities.push({
        type: 'transport_optimization',
        title: 'Optimize Transportation',
        description: 'Consider carpooling, public transport, or ride-sharing passes to reduce transport costs.',
        potentialSavings: Math.round(transportSpend * 0.2),
        priority: 'medium'
      });
    }

    return opportunities.sort((a, b) => (b.potentialSavings || 0) - (a.potentialSavings || 0));
  }

  /**
   * Generate actionable recommendations
   */
  _generateRecommendations(summary, trends, anomalies, patterns) {
    const recommendations = [];

    // Trend-based recommendations
    if (trends.direction === 'increasing' && trends.changePercent > 10) {
      recommendations.push({
        type: 'warning',
        title: 'Spending is Trending Up',
        description: `Your spending has increased by ${trends.changePercent.toFixed(0)}%. Review recent expenses to identify areas to cut back.`,
        priority: 'high'
      });
    }

    // 50/30/20 rule recommendations
    if (summary.needsVsWants.wants > 35) {
      recommendations.push({
        type: 'action',
        title: 'Reduce Discretionary Spending',
        description: `Discretionary spending is ${summary.needsVsWants.wants.toFixed(0)}% (target: 30%). Consider cutting non-essential expenses.`,
        priority: 'medium'
      });
    }

    // Anomaly-based recommendations
    if (anomalies.length > 3) {
      recommendations.push({
        type: 'info',
        title: 'Multiple Unusual Transactions',
        description: `${anomalies.length} unusual transactions detected. Review them to ensure they're legitimate.`,
        priority: 'medium'
      });
    }

    // High-frequency merchant recommendations
    const frequentMerchants = patterns.filter(p => p.type === 'frequent' && p.occurrences >= 10);
    if (frequentMerchants.length > 0) {
      const top = frequentMerchants[0];
      recommendations.push({
        type: 'info',
        title: `Frequent ${top.merchant} Visits`,
        description: `You've made ${top.occurrences} transactions at ${top.merchant} (₹${Math.round(top.totalSpent).toLocaleString()} total). Consider if this spending is necessary.`,
        priority: 'low'
      });
    }

    // Weekend spending recommendations
    const weekendPattern = patterns.find(p => p.type === 'weekend_heavy');
    if (weekendPattern) {
      recommendations.push({
        type: 'action',
        title: 'High Weekend Spending',
        description: weekendPattern.message + '. Plan weekend activities with a budget.',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  /**
   * Auto-detect category from transaction description
   */
  _autoDetectCategory(description) {
    for (const [category, pattern] of Object.entries(this.merchantPatterns)) {
      if (pattern.test(description)) return category;
    }
    return 'other';
  }

  /**
   * Get budget vs actual comparison
   */
  async getBudgetComparison(userId, month) {
    try {
      const Transaction = mongoose.model('Transaction');
      const Budget = mongoose.model('Budget');

      const targetMonth = month || new Date().toISOString().substring(0, 7);
      const startDate = new Date(targetMonth + '-01');
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      const [transactions, budgets] = await Promise.all([
        Transaction.find({ userId, type: 'expense', date: { $gte: startDate, $lt: endDate } }).lean(),
        Budget.find({ userId }).lean()
      ]);

      const categorySpending = {};
      transactions.forEach(t => {
        const cat = t.category || 'other';
        categorySpending[cat] = (categorySpending[cat] || 0) + (t.amount || 0);
      });

      const comparison = budgets.map(b => {
        const actual = categorySpending[b.category] || 0;
        const budgeted = b.amount || 0;
        return {
          category: b.category,
          budgeted,
          actual,
          remaining: budgeted - actual,
          percentUsed: budgeted > 0 ? (actual / budgeted) * 100 : 0,
          status: actual > budgeted ? 'over_budget' : actual > budgeted * 0.8 ? 'warning' : 'on_track'
        };
      });

      // Add unbudgeted categories
      Object.entries(categorySpending).forEach(([cat, amount]) => {
        if (!comparison.find(c => c.category === cat)) {
          comparison.push({
            category: cat,
            budgeted: 0,
            actual: amount,
            remaining: -amount,
            percentUsed: 0,
            status: 'unbudgeted'
          });
        }
      });

      return {
        month: targetMonth,
        comparison: comparison.sort((a, b) => b.actual - a.actual),
        totalBudgeted: budgets.reduce((s, b) => s + (b.amount || 0), 0),
        totalSpent: Object.values(categorySpending).reduce((s, v) => s + v, 0),
        overBudgetCategories: comparison.filter(c => c.status === 'over_budget').length,
        onTrackCategories: comparison.filter(c => c.status === 'on_track').length
      };
    } catch (error) {
      logger.error('Budget comparison error:', error);
      throw error;
    }
  }

  // Helper methods
  async _getExpenseTransactions(userId, days) {
    try {
      const Transaction = mongoose.model('Transaction');
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      return await Transaction.find({
        userId,
        type: 'expense',
        date: { $gte: cutoff }
      }).sort({ date: -1 }).lean();
    } catch { return []; }
  }
}

module.exports = new ExpenseIntelligenceService();
