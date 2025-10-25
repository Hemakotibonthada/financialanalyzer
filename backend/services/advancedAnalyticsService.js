const Transaction = require('../models/Transaction');
const FinancialProfile = require('../models/FinancialProfile');
const EMI = require('../models/EMI');

class AdvancedAnalyticsService {
  /**
   * Generate spending forecast for next N days based on historical patterns
   */
  async generateSpendingForecast(userId, daysToForecast = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90); // Use last 90 days for analysis

    const transactions = await Transaction.find({
      userId,
      date: { $gte: startDate, $lte: endDate },
      type: 'expense'
    }).sort({ date: 1 });

    if (transactions.length < 10) {
      return {
        forecast: [],
        confidence: 'low',
        message: 'Insufficient data for accurate forecast. Need at least 10 transactions.'
      };
    }

    // Calculate daily average spending
    const dailySpending = {};
    transactions.forEach(t => {
      const day = new Date(t.date).toISOString().split('T')[0];
      dailySpending[day] = (dailySpending[day] || 0) + t.amount;
    });

    const spendingValues = Object.values(dailySpending);
    const avgDailySpending = spendingValues.reduce((a, b) => a + b, 0) / spendingValues.length;
    const stdDev = Math.sqrt(
      spendingValues.reduce((sum, val) => sum + Math.pow(val - avgDailySpending, 2), 0) / spendingValues.length
    );

    // Calculate category-wise spending patterns
    const categoryPatterns = {};
    transactions.forEach(t => {
      if (!categoryPatterns[t.category]) {
        categoryPatterns[t.category] = {
          total: 0,
          count: 0,
          avgAmount: 0
        };
      }
      categoryPatterns[t.category].total += t.amount;
      categoryPatterns[t.category].count++;
    });

    Object.keys(categoryPatterns).forEach(cat => {
      categoryPatterns[cat].avgAmount = categoryPatterns[cat].total / categoryPatterns[cat].count;
      categoryPatterns[cat].frequency = categoryPatterns[cat].count / 90; // per day
    });

    // Generate forecast
    const forecast = [];
    const today = new Date();
    
    for (let i = 1; i <= daysToForecast; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(forecastDate.getDate() + i);
      
      // Apply day-of-week patterns
      const dayOfWeek = forecastDate.getDay();
      const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.2 : 1.0;
      
      // Apply month-end patterns (people spend more at month start)
      const dayOfMonth = forecastDate.getDate();
      const monthStartMultiplier = dayOfMonth <= 5 ? 1.3 : dayOfMonth >= 25 ? 0.9 : 1.0;
      
      const predictedAmount = avgDailySpending * weekendMultiplier * monthStartMultiplier;
      const confidenceLower = predictedAmount - stdDev;
      const confidenceUpper = predictedAmount + stdDev;

      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        predicted: Math.round(predictedAmount * 100) / 100,
        confidenceRange: {
          lower: Math.max(0, Math.round(confidenceLower * 100) / 100),
          upper: Math.round(confidenceUpper * 100) / 100
        },
        dayOfWeek: forecastDate.toLocaleDateString('en-US', { weekday: 'short' })
      });
    }

    return {
      forecast,
      confidence: stdDev < avgDailySpending * 0.5 ? 'high' : stdDev < avgDailySpending ? 'medium' : 'low',
      summary: {
        avgDailySpending: Math.round(avgDailySpending * 100) / 100,
        expectedMonthlySpending: Math.round(avgDailySpending * 30 * 100) / 100,
        volatility: Math.round((stdDev / avgDailySpending) * 100) + '%'
      },
      categoryPatterns
    };
  }

  /**
   * Detect anomalous transactions (unusual spending)
   */
  async detectAnomalies(userId, lookbackDays = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);

    const transactions = await Transaction.find({
      userId,
      date: { $gte: startDate, $lte: endDate },
      type: 'expense'
    }).sort({ date: -1 });

    if (transactions.length < 5) {
      return { anomalies: [], message: 'Insufficient data for anomaly detection' };
    }

    // Calculate statistics by category
    const categoryStats = {};
    transactions.forEach(t => {
      if (!categoryStats[t.category]) {
        categoryStats[t.category] = { amounts: [], mean: 0, stdDev: 0 };
      }
      categoryStats[t.category].amounts.push(t.amount);
    });

    // Calculate mean and std dev for each category
    Object.keys(categoryStats).forEach(cat => {
      const amounts = categoryStats[cat].amounts;
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);
      
      categoryStats[cat].mean = mean;
      categoryStats[cat].stdDev = stdDev;
    });

    // Detect anomalies (transactions > 2 standard deviations from mean)
    const anomalies = [];
    transactions.forEach(t => {
      const stats = categoryStats[t.category];
      if (!stats || stats.amounts.length < 3) return; // Need at least 3 transactions

      const zScore = (t.amount - stats.mean) / (stats.stdDev || 1);
      
      if (Math.abs(zScore) > 2) {
        anomalies.push({
          transaction: {
            id: t._id,
            description: t.description,
            amount: t.amount,
            category: t.category,
            date: t.date
          },
          anomalyType: zScore > 0 ? 'unusually_high' : 'unusually_low',
          severity: Math.abs(zScore) > 3 ? 'high' : 'medium',
          zScore: Math.round(zScore * 100) / 100,
          context: {
            categoryAverage: Math.round(stats.mean * 100) / 100,
            deviation: Math.round((t.amount - stats.mean) * 100) / 100,
            percentageDifference: Math.round(((t.amount - stats.mean) / stats.mean) * 100) + '%'
          }
        });
      }
    });

    // Sort by severity and date
    anomalies.sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === 'high' ? -1 : 1;
      }
      return new Date(b.transaction.date) - new Date(a.transaction.date);
    });

    return {
      anomalies,
      summary: {
        totalAnomalies: anomalies.length,
        highSeverity: anomalies.filter(a => a.severity === 'high').length,
        mediumSeverity: anomalies.filter(a => a.severity === 'medium').length,
        categories: [...new Set(anomalies.map(a => a.transaction.category))]
      }
    };
  }

  /**
   * Generate spending heatmap (by day of week and hour of day)
   */
  async generateSpendingHeatmap(userId, lookbackDays = 90) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);

    const transactions = await Transaction.find({
      userId,
      date: { $gte: startDate, $lte: endDate },
      type: 'expense'
    });

    if (transactions.length === 0) {
      return { heatmap: [], message: 'No transaction data available' };
    }

    // Initialize heatmap data structure
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const hourlyData = Array(24).fill(0).map(() => Array(7).fill(0));
    const hourlyCount = Array(24).fill(0).map(() => Array(7).fill(0));

    // Populate heatmap
    transactions.forEach(t => {
      const date = new Date(t.date);
      const dayOfWeek = date.getDay();
      const hour = date.getHours();
      
      hourlyData[hour][dayOfWeek] += t.amount;
      hourlyCount[hour][dayOfWeek]++;
    });

    // Calculate averages and format heatmap
    const heatmap = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let day = 0; day < 7; day++) {
        const count = hourlyCount[hour][day];
        const total = hourlyData[hour][day];
        const average = count > 0 ? total / count : 0;

        if (count > 0) {
          heatmap.push({
            hour,
            day: dayNames[day],
            dayIndex: day,
            averageSpending: Math.round(average * 100) / 100,
            totalSpending: Math.round(total * 100) / 100,
            transactionCount: count,
            intensity: average // Used for color scaling
          });
        }
      }
    }

    // Find peak spending times
    const sortedByIntensity = [...heatmap].sort((a, b) => b.averageSpending - a.averageSpending);
    const peakTimes = sortedByIntensity.slice(0, 5).map(item => ({
      time: `${item.day} ${item.hour}:00`,
      averageSpending: item.averageSpending,
      transactionCount: item.transactionCount
    }));

    // Calculate day-wise totals
    const dayTotals = dayNames.map((dayName, dayIndex) => {
      const dayData = heatmap.filter(h => h.dayIndex === dayIndex);
      return {
        day: dayName,
        total: Math.round(dayData.reduce((sum, h) => sum + h.totalSpending, 0) * 100) / 100,
        avgPerTransaction: dayData.length > 0 
          ? Math.round((dayData.reduce((sum, h) => sum + h.totalSpending, 0) / dayData.reduce((sum, h) => sum + h.transactionCount, 0)) * 100) / 100
          : 0
      };
    });

    return {
      heatmap,
      peakTimes,
      dayTotals,
      summary: {
        mostExpensiveDay: dayTotals.reduce((max, day) => day.total > max.total ? day : max, dayTotals[0]).day,
        totalTransactions: transactions.length,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      }
    };
  }

  /**
   * Calculate financial health score (0-100)
   */
  async calculateFinancialHealthScore(userId) {
    const profile = await FinancialProfile.findOne({ userId });
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const transactions = await Transaction.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    });

    let score = 50; // Start at middle
    const factors = [];

    // Factor 1: Spending vs Income (30 points)
    if (profile && profile.monthlyIncome) {
      const monthlyExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const spendingRatio = monthlyExpenses / profile.monthlyIncome;
      
      if (spendingRatio < 0.5) {
        score += 30;
        factors.push({ name: 'Spending Control', impact: 30, status: 'excellent', detail: 'Spending <50% of income' });
      } else if (spendingRatio < 0.7) {
        score += 20;
        factors.push({ name: 'Spending Control', impact: 20, status: 'good', detail: 'Spending 50-70% of income' });
      } else if (spendingRatio < 0.9) {
        score += 10;
        factors.push({ name: 'Spending Control', impact: 10, status: 'fair', detail: 'Spending 70-90% of income' });
      } else {
        score -= 10;
        factors.push({ name: 'Spending Control', impact: -10, status: 'poor', detail: 'Spending >90% of income' });
      }
    }

    // Factor 2: Budget Adherence (20 points)
    if (profile && profile.budgetLimits && profile.budgetLimits.size > 0) {
      const budgetCategories = Array.from(profile.budgetLimits.keys());
      let categoriesWithinBudget = 0;

      budgetCategories.forEach(category => {
        const limit = profile.budgetLimits.get(category);
        const spent = transactions
          .filter(t => t.category === category && t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
        
        if (spent <= limit) categoriesWithinBudget++;
      });

      const adherenceRate = categoriesWithinBudget / budgetCategories.length;
      const budgetScore = Math.round(adherenceRate * 20);
      score += budgetScore;
      factors.push({
        name: 'Budget Adherence',
        impact: budgetScore,
        status: adherenceRate > 0.8 ? 'excellent' : adherenceRate > 0.5 ? 'good' : 'needs improvement',
        detail: `${categoriesWithinBudget}/${budgetCategories.length} categories within budget`
      });
    }

    // Factor 3: Savings Rate (20 points)
    if (profile && profile.savingsGoals && profile.savingsGoals.length > 0) {
      const totalSavingsTarget = profile.savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0);
      const totalSavingsCurrent = profile.savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);
      const savingsRate = totalSavingsCurrent / totalSavingsTarget;

      if (savingsRate > 0.75) {
        score += 20;
        factors.push({ name: 'Savings Progress', impact: 20, status: 'excellent', detail: 'On track with savings goals' });
      } else if (savingsRate > 0.5) {
        score += 15;
        factors.push({ name: 'Savings Progress', impact: 15, status: 'good', detail: 'Making progress on savings' });
      } else if (savingsRate > 0.25) {
        score += 10;
        factors.push({ name: 'Savings Progress', impact: 10, status: 'fair', detail: 'Some savings progress' });
      } else {
        score += 5;
        factors.push({ name: 'Savings Progress', impact: 5, status: 'needs improvement', detail: 'Behind on savings goals' });
      }
    }

    // Factor 4: Spending Consistency (15 points)
    const dailySpending = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const day = new Date(t.date).toISOString().split('T')[0];
      dailySpending[day] = (dailySpending[day] || 0) + t.amount;
    });

    const spendingValues = Object.values(dailySpending);
    if (spendingValues.length > 0) {
      const avg = spendingValues.reduce((a, b) => a + b, 0) / spendingValues.length;
      const variance = spendingValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / spendingValues.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / avg;

      if (coefficientOfVariation < 0.5) {
        score += 15;
        factors.push({ name: 'Spending Consistency', impact: 15, status: 'excellent', detail: 'Very consistent spending' });
      } else if (coefficientOfVariation < 1.0) {
        score += 10;
        factors.push({ name: 'Spending Consistency', impact: 10, status: 'good', detail: 'Fairly consistent spending' });
      } else {
        score += 5;
        factors.push({ name: 'Spending Consistency', impact: 5, status: 'volatile', detail: 'Irregular spending pattern' });
      }
    }

    // Factor 5: Emergency Fund (15 points)
    if (profile && profile.monthlyIncome) {
      const currentBalance = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0) - transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const monthsOfExpenses = currentBalance / (profile.monthlyIncome * 0.7);

      if (monthsOfExpenses >= 6) {
        score += 15;
        factors.push({ name: 'Emergency Fund', impact: 15, status: 'excellent', detail: '6+ months of expenses saved' });
      } else if (monthsOfExpenses >= 3) {
        score += 10;
        factors.push({ name: 'Emergency Fund', impact: 10, status: 'good', detail: '3-6 months of expenses saved' });
      } else if (monthsOfExpenses >= 1) {
        score += 5;
        factors.push({ name: 'Emergency Fund', impact: 5, status: 'fair', detail: '1-3 months of expenses saved' });
      } else {
        factors.push({ name: 'Emergency Fund', impact: 0, status: 'critical', detail: 'Less than 1 month saved' });
      }
    }

    // Factor 6: EMI Burden (15 points) - NEW
    const activeEMIs = await EMI.find({ 
      userId, 
      status: 'active',
      remainingInstallments: { $gt: 0 }
    });

    if (activeEMIs.length > 0 && profile && profile.monthlyIncome) {
      const monthlyEMIBurden = activeEMIs.reduce((sum, emi) => sum + emi.emiAmount, 0);
      const emiBurdenRatio = monthlyEMIBurden / profile.monthlyIncome;
      const emiCount = activeEMIs.length;

      if (emiBurdenRatio < 0.15) {
        // EMI burden < 15% of income - Excellent
        score += 15;
        factors.push({ 
          name: 'EMI Burden', 
          impact: 15, 
          status: 'excellent', 
          detail: `₹${monthlyEMIBurden.toLocaleString()} EMI (${Math.round(emiBurdenRatio * 100)}% of income, ${emiCount} active EMIs)` 
        });
      } else if (emiBurdenRatio < 0.25) {
        // EMI burden 15-25% - Good
        score += 10;
        factors.push({ 
          name: 'EMI Burden', 
          impact: 10, 
          status: 'good', 
          detail: `₹${monthlyEMIBurden.toLocaleString()} EMI (${Math.round(emiBurdenRatio * 100)}% of income, ${emiCount} active EMIs)` 
        });
      } else if (emiBurdenRatio < 0.40) {
        // EMI burden 25-40% - Fair
        score += 5;
        factors.push({ 
          name: 'EMI Burden', 
          impact: 5, 
          status: 'fair', 
          detail: `₹${monthlyEMIBurden.toLocaleString()} EMI (${Math.round(emiBurdenRatio * 100)}% of income, ${emiCount} active EMIs)` 
        });
      } else {
        // EMI burden > 40% - High burden
        score -= 5;
        factors.push({ 
          name: 'EMI Burden', 
          impact: -5, 
          status: 'high', 
          detail: `₹${monthlyEMIBurden.toLocaleString()} EMI (${Math.round(emiBurdenRatio * 100)}% of income, ${emiCount} active EMIs) - Consider debt consolidation` 
        });
      }
    } else if (activeEMIs.length === 0) {
      // No EMIs - Excellent
      score += 15;
      factors.push({ 
        name: 'EMI Burden', 
        impact: 15, 
        status: 'excellent', 
        detail: 'No active EMIs - Debt-free status!' 
      });
    }

    // Normalize score to 0-100
    score = Math.max(0, Math.min(100, score));

    // Determine overall rating
    let rating = 'Poor';
    let color = 'red';
    if (score >= 80) { rating = 'Excellent'; color = 'green'; }
    else if (score >= 65) { rating = 'Good'; color = 'blue'; }
    else if (score >= 50) { rating = 'Fair'; color = 'yellow'; }

    return {
      score: Math.round(score),
      rating,
      color,
      factors,
      recommendations: this.generateRecommendations(factors, score)
    };
  }

  /**
   * Generate personalized recommendations
   */
  generateRecommendations(factors, score) {
    const recommendations = [];

    factors.forEach(factor => {
      if (factor.status === 'poor' || factor.status === 'critical' || factor.status === 'needs improvement') {
        switch (factor.name) {
          case 'Spending Control':
            recommendations.push({
              priority: 'high',
              category: 'spending',
              title: 'Reduce Monthly Expenses',
              description: 'Your spending is consuming most of your income. Try to reduce discretionary expenses by 15-20%.',
              actionSteps: [
                'Review subscriptions and cancel unused services',
                'Set daily spending limits',
                'Use the 24-hour rule for non-essential purchases'
              ]
            });
            break;
          case 'Budget Adherence':
            recommendations.push({
              priority: 'medium',
              category: 'budgeting',
              title: 'Improve Budget Adherence',
              description: 'You\'re exceeding budget limits in several categories.',
              actionSteps: [
                'Review and adjust budget limits to be more realistic',
                'Set up alerts when approaching 80% of category budgets',
                'Track expenses daily to stay aware of spending'
              ]
            });
            break;
          case 'Savings Progress':
            recommendations.push({
              priority: 'high',
              category: 'savings',
              title: 'Accelerate Savings',
              description: 'You\'re falling behind on savings goals.',
              actionSteps: [
                'Set up automatic transfers to savings on payday',
                'Apply the 50/30/20 rule: 50% needs, 30% wants, 20% savings',
                'Consider additional income sources'
              ]
            });
            break;
          case 'Emergency Fund':
            recommendations.push({
              priority: 'critical',
              category: 'emergency',
              title: 'Build Emergency Fund',
              description: 'You need at least 3-6 months of expenses saved for emergencies.',
              actionSteps: [
                'Start with a goal of ₹10,000 in emergency savings',
                'Save 10% of every paycheck automatically',
                'Keep emergency fund in a separate, easily accessible account'
              ]
            });
            break;
          case 'EMI Burden':
            if (factor.status === 'high' || factor.status === 'fair') {
              recommendations.push({
                priority: factor.status === 'high' ? 'critical' : 'high',
                category: 'debt',
                title: 'Reduce EMI Burden',
                description: `Your EMI obligations are ${factor.detail.includes('40%') ? 'significantly impacting' : 'affecting'} your financial flexibility.`,
                actionSteps: [
                  'Consider foreclosing high-interest EMIs if possible',
                  'Avoid taking new EMIs until current burden reduces',
                  'Prioritize paying off EMIs with highest interest rates first',
                  'Explore balance transfer options for better interest rates',
                  'Aim to keep total EMI below 30% of monthly income'
                ]
              });
            }
            break;
        }
      }
    });

    // Add general improvement tips based on score
    if (score < 50) {
      recommendations.push({
        priority: 'high',
        category: 'general',
        title: 'Financial Health Improvement Plan',
        description: 'Your financial health needs immediate attention.',
        actionSteps: [
          'Create a detailed monthly budget and stick to it',
          'Identify and eliminate unnecessary expenses',
          'Focus on building an emergency fund',
          'Consider consulting a financial advisor'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Identify savings opportunities
   */
  async identifySavingsOpportunities(userId) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 60);

    const transactions = await Transaction.find({
      userId,
      date: { $gte: startDate, $lte: endDate },
      type: 'expense'
    });

    const opportunities = [];

    // Group by category
    const categorySpending = {};
    transactions.forEach(t => {
      if (!categorySpending[t.category]) {
        categorySpending[t.category] = { total: 0, count: 0, transactions: [] };
      }
      categorySpending[t.category].total += t.amount;
      categorySpending[t.category].count++;
      categorySpending[t.category].transactions.push(t);
    });

    // Find high-spending categories
    const sortedCategories = Object.entries(categorySpending)
      .sort(([, a], [, b]) => b.total - a.total);

    sortedCategories.slice(0, 3).forEach(([category, data]) => {
      const avgTransaction = data.total / data.count;
      const potentialSavings = data.total * 0.15; // Assume 15% reduction potential

      opportunities.push({
        type: 'high_spending_category',
        category,
        currentSpending: Math.round(data.total * 100) / 100,
        potentialSavings: Math.round(potentialSavings * 100) / 100,
        transactionCount: data.count,
        avgTransactionAmount: Math.round(avgTransaction * 100) / 100,
        suggestion: `This is your ${sortedCategories.findIndex(([cat]) => cat === category) + 1}st highest spending category. Consider reducing expenses here by 15% to save ₹${Math.round(potentialSavings)}/month.`
      });
    });

    // Find recurring small expenses (coffee tax)
    const smallRecurring = transactions.filter(t => t.amount < 500 && t.amount > 50);
    const descriptionFrequency = {};
    smallRecurring.forEach(t => {
      const desc = t.description.toLowerCase();
      descriptionFrequency[desc] = (descriptionFrequency[desc] || 0) + 1;
    });

    Object.entries(descriptionFrequency)
      .filter(([, count]) => count >= 5)
      .forEach(([description, count]) => {
        const relatedTransactions = smallRecurring.filter(t => 
          t.description.toLowerCase() === description
        );
        const total = relatedTransactions.reduce((sum, t) => sum + t.amount, 0);
        const avgAmount = total / count;

        opportunities.push({
          type: 'recurring_small_expense',
          description,
          frequency: count,
          totalSpent: Math.round(total * 100) / 100,
          avgAmount: Math.round(avgAmount * 100) / 100,
          potentialMonthlySavings: Math.round((total / 2) * 100) / 100,
          suggestion: `You've spent ₹${Math.round(total)} on "${description}" ${count} times. Reducing this by half could save ₹${Math.round(total / 2)}/month.`
        });
      });

    return {
      opportunities,
      totalPotentialSavings: Math.round(
        opportunities.reduce((sum, opp) => 
          sum + (opp.potentialSavings || opp.potentialMonthlySavings || 0), 0
        ) * 100
      ) / 100
    };
  }
}

module.exports = new AdvancedAnalyticsService();
