const Analysis = require('../models/Analysis');
const Transaction = require('../models/Transaction');
const FinancialProfile = require('../models/FinancialProfile');
const logger = require('../utils/logger');

/**
 * Advanced Financial Analytics Service
 * Generates comprehensive financial insights and chart data
 */
class AnalyticsService {
  
  /**
   * Generate comprehensive financial dashboard data
   */
  async generateDashboard(userId) {
    try {
      logger.info(`Generating dashboard for user ${userId}`);

      const [
        profile,
        recentAnalyses,
        monthlyTrends,
        categoryBreakdown,
        spendingPatterns,
        budgetAnalysis,
        savingsGoals,
        recurringTransactions,
        financialHealth,
        monthlyIncomeData
      ] = await Promise.all([
        this.getUserProfile(userId),
        this.getRecentAnalyses(userId, 10),
        this.getMonthlyTrends(userId, 12),
        this.getCategoryBreakdown(userId, 6),
        this.getSpendingPatterns(userId),
        this.getBudgetAnalysis(userId),
        this.getSavingsGoals(userId),
        this.getRecurringTransactions(userId),
        this.calculateFinancialHealth(userId),
        this.getMonthlyIncome(userId)
      ]);

      const dashboard = {
        profile,
        summary: {
          totalAnalyses: recentAnalyses.length,
          lastSyncDate: profile?.gmailSettings?.lastSync || null,
          financialHealthScore: financialHealth.score,
          monthlySpending: monthlyTrends.currentMonth?.totalSpending || 0,
          monthlyIncome: monthlyIncomeData.amount,
          incomeSource: monthlyIncomeData.source,
          lastSalaryDate: monthlyIncomeData.lastSalaryDate
        },
        charts: {
          monthlyTrends,
          categoryBreakdown,
          spendingPatterns,
          budgetAnalysis,
          financialHealth
        },
        insights: {
          recurringTransactions,
          savingsGoals,
          recommendations: await this.generateRecommendations(userId, financialHealth)
        },
        recentActivity: recentAnalyses
      };

      logger.info(`Dashboard generated successfully for user ${userId}`);
      return dashboard;

    } catch (error) {
      logger.error(`Error generating dashboard for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user financial profile
   */
  async getUserProfile(userId) {
    return await FinancialProfile.findOne({ userId }).lean();
  }

  /**
   * Get recent financial analyses
   */
  async getRecentAnalyses(userId, limit = 10) {
    return await Analysis.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Generate monthly spending trends for charts
   */
  async getMonthlyTrends(userId, monthsBack = 12) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    // Get all transactions directly from Transaction collection
    const transactions = await Transaction.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    }).lean();

    // Group by month
    const monthlyData = {};
    
    transactions.forEach(transaction => {
      const month = new Date(transaction.date).toISOString().substring(0, 7); // YYYY-MM
      
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          totalSpending: 0,
          totalIncome: 0,
          transactionCount: 0,
          categories: {}
        };
      }

      if (transaction.type === 'credit') {
        monthlyData[month].totalIncome += Math.abs(transaction.amount || 0);
      } else {
        monthlyData[month].totalSpending += Math.abs(transaction.amount || 0);
      }
      
      monthlyData[month].transactionCount += 1;

      // Aggregate categories
      const category = transaction.category || transaction.ai_category || 'other';
      monthlyData[month].categories[category] = 
        (monthlyData[month].categories[category] || 0) + 1;
    });

    // Sort by month and fill gaps
    const sortedMonths = Object.keys(monthlyData).sort();
    const trends = [];
    
    for (let i = 0; i < monthsBack; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - (monthsBack - 1 - i));
      const monthKey = date.toISOString().substring(0, 7);
      
      trends.push(monthlyData[monthKey] || {
        month: monthKey,
        totalSpending: 0,
        totalIncome: 0,
        transactionCount: 0,
        categories: {}
      });
    }

    return {
      trends,
      currentMonth: trends[trends.length - 1],
      previousMonth: trends[trends.length - 2],
      summary: {
        totalMonths: trends.length,
        averageSpending: trends.reduce((sum, t) => sum + t.totalSpending, 0) / trends.length,
        averageIncome: trends.reduce((sum, t) => sum + t.totalIncome, 0) / trends.length,
        spendingTrend: this.calculateTrend(trends.map(t => t.totalSpending)),
        incomeTrend: this.calculateTrend(trends.map(t => t.totalIncome))
      }
    };
  }

  /**
   * Generate category breakdown for pie/donut charts
   */
  async getCategoryBreakdown(userId, monthsBack = 6) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    // Get transactions directly
    const transactions = await Transaction.find({
      userId,
      type: 'debit',
      date: { $gte: startDate, $lte: endDate }
    }).lean();

    const categoryTotals = {};
    let grandTotal = 0;

    transactions.forEach(transaction => {
      const amount = Math.abs(transaction.amount || 0);
      const category = transaction.category || transaction.ai_category || 'other';

      categoryTotals[category] = (categoryTotals[category] || 0) + amount;
      grandTotal += amount;
    });

    // Convert to chart format
    const chartData = Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: Math.round((amount / grandTotal) * 100 * 100) / 100,
        color: this.getCategoryColor(category)
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      chartData,
      summary: {
        totalCategories: chartData.length,
        totalAmount: grandTotal,
        topCategory: chartData[0]?.category || 'No data',
        diversificationIndex: this.calculateDiversificationIndex(chartData)
      }
    };
  }

  /**
   * Analyze spending patterns and habits
   */
  async getSpendingPatterns(userId) {
    const analyses = await Analysis.find({
      userId,
      createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // Last 90 days
    }).lean();

    // Analyze by day of week
    const dayOfWeekSpending = Array(7).fill(0);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Analyze by time of day (if available)
    const hourlySpending = Array(24).fill(0);
    
    // Analyze by merchant types
    const merchantTypes = {};
    
    analyses.forEach(analysis => {
      const date = new Date(analysis.createdAt);
      const dayOfWeek = date.getDay();
      const hour = date.getHours();
      
      dayOfWeekSpending[dayOfWeek] += (analysis.results?.totalAmount || 0);
      hourlySpending[hour] += (analysis.results?.totalAmount || 0);

      // Merchant analysis (from metadata if available)
      if (analysis.metadata && analysis.metadata.emailMetadata) {
        const sender = analysis.metadata.emailMetadata.from;
        const merchantType = this.classifyMerchant(sender);
        merchantTypes[merchantType] = (merchantTypes[merchantType] || 0) + 1;
      }
    });

    return {
      dayOfWeek: {
        data: dayOfWeekSpending.map((amount, index) => ({
          day: dayNames[index],
          amount,
          dayIndex: index
        })),
        peakDay: dayNames[dayOfWeekSpending.indexOf(Math.max(...dayOfWeekSpending))],
        weekdayTotal: dayOfWeekSpending.slice(1, 6).reduce((a, b) => a + b, 0),
        weekendTotal: dayOfWeekSpending[0] + dayOfWeekSpending[6]
      },
      hourly: {
        data: hourlySpending.map((amount, hour) => ({ hour, amount })),
        peakHour: hourlySpending.indexOf(Math.max(...hourlySpending))
      },
      merchants: Object.entries(merchantTypes)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
    };
  }

  /**
   * Generate budget analysis and tracking
   */
  async getBudgetAnalysis(userId) {
    const profile = await FinancialProfile.findOne({ userId }).lean();
    const monthlySpending = await this.getMonthlyTrends(userId, 1);
    
    if (!profile || !profile.budgetLimits || Object.keys(profile.budgetLimits).length === 0) {
      return {
        hasBudget: false,
        message: 'No budget set',
        recommendation: 'Set monthly budget limits for better financial tracking'
      };
    }

    const currentSpending = monthlySpending.currentMonth?.totalSpending || 0;
    const budgetCategories = [];
    let totalBudget = 0;
    let totalSpent = 0;

    // Analyze by category budgets
    const categoryPromises = [];
    const entries = Object.entries(profile.budgetLimits);
    
    for (const [category, limit] of entries) {
      categoryPromises.push(
        this.getCategorySpending(userId, category, 1).then(categorySpending => {
          totalBudget += limit;
          totalSpent += categorySpending;

          return {
            category,
            budget: limit,
            spent: categorySpending,
            remaining: limit - categorySpending,
            percentUsed: Math.round((categorySpending / limit) * 100),
            status: this.getBudgetStatus(categorySpending, limit)
          };
        })
      );
    }

    const budgetCategoriesResult = await Promise.all(categoryPromises);
    budgetCategories.push(...budgetCategoriesResult);

    return {
      hasBudget: true,
      totalBudget,
      totalSpent,
      totalRemaining: totalBudget - totalSpent,
      overallStatus: this.getBudgetStatus(totalSpent, totalBudget),
      categories: budgetCategories.sort((a, b) => b.percentUsed - a.percentUsed),
      projectedMonthEnd: this.projectMonthEndSpending(currentSpending),
      alerts: this.generateBudgetAlerts(budgetCategories)
    };
  }

  /**
   * Track savings goals progress
   */
  async getSavingsGoals(userId) {
    const profile = await FinancialProfile.findOne({ userId }).lean();
    const monthlyTrends = await this.getMonthlyTrends(userId, 12);
    
    if (!profile || !profile.savingsGoals || profile.savingsGoals.length === 0) {
      return {
        hasGoals: false,
        recommendation: 'Set savings goals to track your financial progress'
      };
    }

    const avgMonthlySavings = this.calculateAverageSavings(monthlyTrends.trends);
    
    const goalsProgress = profile.savingsGoals.map(goal => {
      const monthsToGoal = goal.targetDate ? 
        Math.max(0, (new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24 * 30)) : null;
      
      const requiredMonthlySavings = monthsToGoal ? 
        (goal.targetAmount - goal.currentAmount) / monthsToGoal : null;

      return {
        ...goal,
        progressPercentage: Math.round((goal.currentAmount / goal.targetAmount) * 100),
        monthsRemaining: monthsToGoal,
        requiredMonthlySavings,
        onTrack: requiredMonthlySavings ? avgMonthlySavings >= requiredMonthlySavings : null,
        projectedCompletionDate: this.projectGoalCompletion(goal, avgMonthlySavings)
      };
    });

    return {
      hasGoals: true,
      goals: goalsProgress,
      totalTargetAmount: profile.savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0),
      totalCurrentAmount: profile.savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0),
      avgMonthlySavings,
      recommendations: this.generateSavingsRecommendations(goalsProgress, avgMonthlySavings)
    };
  }

  /**
   * Identify recurring transactions and subscriptions
   */
  async getRecurringTransactions(userId) {
    const analyses = await Analysis.find({
      userId,
      createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } // Last 6 months
    }).lean();

    // Group similar transactions
    const transactionGroups = {};
    
    analyses.forEach(analysis => {
      if (analysis.results && analysis.results.categories) {
        const amount = analysis.results?.totalAmount || 0;
        const category = analysis.results.categories[0]; // Primary category
        const date = new Date(analysis.createdAt);
        
        // Create grouping key based on amount and category
        const key = `${category}_${Math.round(amount)}`;
        
        if (!transactionGroups[key]) {
          transactionGroups[key] = {
            category,
            amount,
            occurrences: [],
            description: `${category} - $${amount}`
          };
        }
        
        transactionGroups[key].occurrences.push(date);
      }
    });

    // Identify recurring patterns
    const recurringTransactions = [];
    
    Object.values(transactionGroups).forEach(group => {
      if (group.occurrences.length >= 3) { // At least 3 occurrences
        group.occurrences.sort((a, b) => a - b);
        
        // Calculate intervals
        const intervals = [];
        for (let i = 1; i < group.occurrences.length; i++) {
          const days = Math.round((group.occurrences[i] - group.occurrences[i-1]) / (1000 * 60 * 60 * 24));
          intervals.push(days);
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const intervalVariance = this.calculateVariance(intervals);
        
        // Consider it recurring if interval variance is low
        if (intervalVariance < 10) { // Less than 10 days variance
          recurringTransactions.push({
            ...group,
            frequency: this.determineFrequency(avgInterval),
            avgInterval: Math.round(avgInterval),
            reliability: Math.max(0, 100 - intervalVariance * 2), // Reliability score
            nextExpectedDate: new Date(group.occurrences[group.occurrences.length - 1].getTime() + avgInterval * 24 * 60 * 60 * 1000),
            monthlyImpact: this.calculateMonthlyImpact(group.amount, avgInterval)
          });
        }
      }
    });

    return recurringTransactions.sort((a, b) => b.monthlyImpact - a.monthlyImpact);
  }

  /**
   * Calculate financial health score
   */
  async calculateFinancialHealth(userId) {
    const profile = await FinancialProfile.findOne({ userId }).lean();
    const monthlyTrends = await this.getMonthlyTrends(userId, 6);
    const budgetAnalysis = await this.getBudgetAnalysis(userId);
    
    let score = 0;
    const factors = [];

    // Income stability (25 points)
    const incomeStability = this.assessIncomeStability(monthlyTrends.trends);
    score += incomeStability.score;
    factors.push(incomeStability);

    // Spending discipline (25 points)
    const spendingDiscipline = this.assessSpendingDiscipline(budgetAnalysis, monthlyTrends);
    score += spendingDiscipline.score;
    factors.push(spendingDiscipline);

    // Savings rate (25 points)
    const savingsRate = this.assessSavingsRate(monthlyTrends.trends);
    score += savingsRate.score;
    factors.push(savingsRate);

    // Financial diversity (25 points)
    const diversity = this.assessFinancialDiversity(userId);
    score += diversity.score;
    factors.push(diversity);

    return {
      score: Math.round(score),
      grade: this.getHealthGrade(score),
      factors,
      recommendations: this.generateHealthRecommendations(factors)
    };
  }

  /**
   * Generate personalized financial recommendations
   */
  async generateRecommendations(userId, financialHealth) {
    const recommendations = [];
    
    // Based on financial health score
    if (financialHealth.score < 50) {
      recommendations.push({
        type: 'urgent',
        title: 'Improve Financial Health',
        description: 'Focus on budgeting and reducing unnecessary expenses',
        priority: 'high',
        action: 'Create and follow a monthly budget'
      });
    }

    // Budget-based recommendations
    const budgetAnalysis = await this.getBudgetAnalysis(userId);
    if (budgetAnalysis.hasBudget && budgetAnalysis.overallStatus === 'over') {
      recommendations.push({
        type: 'budget',
        title: 'Budget Exceeded',
        description: `You've exceeded your budget by $${Math.abs(budgetAnalysis.totalRemaining)}`,
        priority: 'high',
        action: 'Review and adjust spending categories'
      });
    }

    // Savings recommendations
    const savingsGoals = await this.getSavingsGoals(userId);
    if (savingsGoals.hasGoals) {
      const offTrackGoals = savingsGoals.goals.filter(g => g.onTrack === false);
      if (offTrackGoals.length > 0) {
        recommendations.push({
          type: 'savings',
          title: 'Savings Goals Behind Schedule',
          description: `${offTrackGoals.length} savings goals are behind schedule`,
          priority: 'medium',
          action: 'Increase monthly savings or adjust goal timelines'
        });
      }
    }

    // Recurring transaction insights
    const recurringTransactions = await this.getRecurringTransactions(userId);
    const highImpactSubscriptions = recurringTransactions.filter(t => t.monthlyImpact > 100);
    if (highImpactSubscriptions.length > 0) {
      recommendations.push({
        type: 'subscriptions',
        title: 'Review High-Cost Subscriptions',
        description: `You have ${highImpactSubscriptions.length} recurring charges over $100/month`,
        priority: 'medium',
        action: 'Review and cancel unused subscriptions'
      });
    }

    return recommendations;
  }

  // Helper methods
  calculateTrend(values) {
    if (values.length < 2) return 0;
    const recent = values.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, values.length);
    const older = values.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, values.length - 3);
    return recent - older;
  }

  getCategoryColor(category) {
    const colors = {
      'Food & Dining': '#FF6B6B',
      'Transportation': '#4ECDC4',
      'Shopping': '#45B7D1',
      'Entertainment': '#96CEB4',
      'Utilities': '#FFEAA7',
      'Healthcare': '#DDA0DD',
      'Education': '#98D8C8',
      'Insurance': '#F7DC6F',
      'Investment': '#BB8FCE',
      'Rent': '#85C1E9'
    };
    return colors[category] || '#BDC3C7';
  }

  calculateDiversificationIndex(chartData) {
    if (chartData.length === 0) return 0;
    // Shannon diversity index adapted for financial categories
    const total = chartData.reduce((sum, item) => sum + item.amount, 0);
    let diversity = 0;
    
    chartData.forEach(item => {
      const proportion = item.amount / total;
      if (proportion > 0) {
        diversity -= proportion * Math.log2(proportion);
      }
    });
    
    return Math.round(diversity * 100) / 100;
  }

  classifyMerchant(email) {
    const domain = email.toLowerCase();
    if (domain.includes('amazon') || domain.includes('flipkart')) return 'E-commerce';
    if (domain.includes('bank') || domain.includes('hdfc') || domain.includes('sbi')) return 'Banking';
    if (domain.includes('swiggy') || domain.includes('zomato')) return 'Food Delivery';
    if (domain.includes('uber') || domain.includes('ola')) return 'Transportation';
    if (domain.includes('netflix') || domain.includes('spotify')) return 'Entertainment';
    return 'Other';
  }

  getBudgetStatus(spent, budget) {
    const percentage = (spent / budget) * 100;
    if (percentage <= 70) return 'good';
    if (percentage <= 90) return 'warning';
    if (percentage <= 100) return 'critical';
    return 'over';
  }

  async getCategorySpending(userId, category, monthsBack) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    const transactions = await Transaction.find({
      userId,
      type: 'debit',
      date: { $gte: startDate, $lte: endDate },
      $or: [
        { category: category },
        { ai_category: category }
      ]
    }).lean();

    return transactions.reduce((sum, transaction) => sum + Math.abs(transaction.amount || 0), 0);
  }

  projectMonthEndSpending(currentSpending) {
    const currentDate = new Date();
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const daysPassed = currentDate.getDate();
    
    return Math.round((currentSpending / daysPassed) * daysInMonth);
  }

  generateBudgetAlerts(budgetCategories) {
    return budgetCategories
      .filter(cat => cat.status === 'critical' || cat.status === 'over')
      .map(cat => ({
        category: cat.category,
        message: cat.status === 'over' ? 
          `Budget exceeded by $${Math.abs(cat.remaining)}` : 
          `Approaching budget limit (${cat.percentUsed}% used)`,
        severity: cat.status
      }));
  }

  calculateAverageSavings(monthlyTrends) {
    const savingsData = monthlyTrends.map(month => 
      Math.max(0, month.totalIncome - month.totalSpending)
    );
    return savingsData.reduce((sum, savings) => sum + savings, 0) / savingsData.length;
  }

  projectGoalCompletion(goal, avgMonthlySavings) {
    if (avgMonthlySavings <= 0) return null;
    
    const remainingAmount = goal.targetAmount - goal.currentAmount;
    const monthsToComplete = Math.ceil(remainingAmount / avgMonthlySavings);
    
    const completionDate = new Date();
    completionDate.setMonth(completionDate.getMonth() + monthsToComplete);
    
    return completionDate;
  }

  generateSavingsRecommendations(goals, avgMonthlySavings) {
    const recommendations = [];
    
    const behindGoals = goals.filter(g => g.onTrack === false);
    if (behindGoals.length > 0) {
      recommendations.push('Increase monthly savings to stay on track with your goals');
    }
    
    if (avgMonthlySavings < 500) {
      recommendations.push('Aim to save at least $500 per month for financial security');
    }
    
    const shortTermGoals = goals.filter(g => g.monthsRemaining && g.monthsRemaining < 12);
    if (shortTermGoals.length > 0) {
      recommendations.push('Focus on short-term goals that are achievable within a year');
    }
    
    return recommendations;
  }

  calculateVariance(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  determineFrequency(avgInterval) {
    if (avgInterval <= 7) return 'Weekly';
    if (avgInterval <= 35) return 'Monthly';
    if (avgInterval <= 95) return 'Quarterly';
    return 'Irregular';
  }

  calculateMonthlyImpact(amount, intervalDays) {
    return Math.round((amount * 30) / intervalDays);
  }

  assessIncomeStability(trends) {
    const incomes = trends.map(t => t.totalIncome).filter(i => i > 0);
    if (incomes.length < 3) {
      return { factor: 'Income Stability', score: 10, description: 'Insufficient income data' };
    }
    
    const variance = this.calculateVariance(incomes);
    const mean = incomes.reduce((a, b) => a + b, 0) / incomes.length;
    const stabilityRatio = variance / mean;
    
    let score = 25;
    if (stabilityRatio > 0.3) score = 10;
    else if (stabilityRatio > 0.2) score = 15;
    else if (stabilityRatio > 0.1) score = 20;
    
    return {
      factor: 'Income Stability',
      score,
      description: `Income variance: ${Math.round(stabilityRatio * 100)}%`
    };
  }

  assessSpendingDiscipline(budgetAnalysis, monthlyTrends) {
    if (!budgetAnalysis.hasBudget) {
      return { factor: 'Spending Discipline', score: 10, description: 'No budget set' };
    }
    
    let score = 25;
    if (budgetAnalysis.overallStatus === 'over') score = 5;
    else if (budgetAnalysis.overallStatus === 'critical') score = 15;
    else if (budgetAnalysis.overallStatus === 'warning') score = 20;
    
    return {
      factor: 'Spending Discipline',
      score,
      description: `Budget status: ${budgetAnalysis.overallStatus}`
    };
  }

  assessSavingsRate(trends) {
    const savingsRates = trends.map(t => {
      if (t.totalIncome === 0) return 0;
      return Math.max(0, (t.totalIncome - t.totalSpending) / t.totalIncome);
    });
    
    const avgSavingsRate = savingsRates.reduce((a, b) => a + b, 0) / savingsRates.length;
    
    let score = 5;
    if (avgSavingsRate >= 0.3) score = 25;
    else if (avgSavingsRate >= 0.2) score = 20;
    else if (avgSavingsRate >= 0.1) score = 15;
    else if (avgSavingsRate >= 0.05) score = 10;
    
    return {
      factor: 'Savings Rate',
      score,
      description: `Average savings rate: ${Math.round(avgSavingsRate * 100)}%`
    };
  }

  assessFinancialDiversity(userId) {
    // This would need more sophisticated analysis of investment accounts, etc.
    // For now, return a basic score
    return {
      factor: 'Financial Diversity',
      score: 15,
      description: 'Basic financial tracking in place'
    };
  }

  getHealthGrade(score) {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  generateHealthRecommendations(factors) {
    const recommendations = [];
    
    factors.forEach(factor => {
      if (factor.score < 15) {
        switch (factor.factor) {
          case 'Income Stability':
            recommendations.push('Work on stabilizing your income sources');
            break;
          case 'Spending Discipline':
            recommendations.push('Create and stick to a monthly budget');
            break;
          case 'Savings Rate':
            recommendations.push('Increase your savings rate to at least 20% of income');
            break;
          case 'Financial Diversity':
            recommendations.push('Consider diversifying your financial portfolio');
            break;
        }
      }
    });
    
    return recommendations;
  }

  /**
   * Calculate and update monthly income from salary transactions or profile
   * Priority: 1) Recent salary transactions, 2) Profile setting
   */
  async getMonthlyIncome(userId) {
    try {
      const profile = await FinancialProfile.findOne({ userId });
      
      // Check for salary transactions in the last 3 months
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const salaryTransactions = await Transaction.find({
        userId,
        date: { $gte: threeMonthsAgo },
        $or: [
          { category: 'Salary' },
          { category: 'salary' },
          { ai_category: 'Salary' },
          { ai_category: 'salary' },
          { 
            description: { 
              $regex: /salary|payslip|payroll|wage|income from employment|pay credit/i 
            }
          }
        ]
      }).sort({ date: -1 }).lean();

      if (salaryTransactions.length > 0) {
        // Calculate average salary from recent transactions
        const salaryAmounts = salaryTransactions.map(t => Math.abs(t.amount));
        const averageSalary = salaryAmounts.reduce((sum, amt) => sum + amt, 0) / salaryAmounts.length;
        
        // Round to nearest 100
        const calculatedIncome = Math.round(averageSalary / 100) * 100;
        
        // Update profile if the calculated income differs significantly from stored value
        if (!profile.monthlyIncome || Math.abs(profile.monthlyIncome - calculatedIncome) > 1000) {
          profile.monthlyIncome = calculatedIncome;
          profile.incomeSource = 'auto-detected';
          profile.lastIncomeUpdate = new Date();
          await profile.save();
          
          logger.info(`Auto-updated monthly income for user ${userId}: ₹${calculatedIncome}`);
        }
        
        return {
          amount: calculatedIncome,
          source: 'salary-transactions',
          transactionCount: salaryTransactions.length,
          lastSalaryDate: salaryTransactions[0].date
        };
      }

      // Fall back to profile setting
      if (profile && profile.monthlyIncome) {
        return {
          amount: profile.monthlyIncome,
          source: 'profile-setting',
          transactionCount: 0,
          lastSalaryDate: null
        };
      }

      // No income data available
      return {
        amount: 0,
        source: 'not-set',
        transactionCount: 0,
        lastSalaryDate: null
      };

    } catch (error) {
      logger.error('Error calculating monthly income:', error);
      return {
        amount: 0,
        source: 'error',
        transactionCount: 0,
        lastSalaryDate: null
      };
    }
  }
}

module.exports = new AnalyticsService();