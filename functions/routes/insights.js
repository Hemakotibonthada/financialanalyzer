const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// AI-powered recommendation engine
function generateAIRecommendations(financialData) {
  const recommendations = [];
  const { totalIncome, totalExpenses, savings, savingsRate, categoryExpenses, recurringTransactions, emiData } = financialData;

  // Savings recommendations
  if (savingsRate < 10) {
    recommendations.push({
      title: 'Critical: Improve Your Savings Rate',
      description: `Your savings rate is ${savingsRate}%. Experts recommend saving at least 20% of your income. Start by setting up automatic transfers to a savings account.`,
      priority: 'high',
      category: 'savings',
      actionItems: [
        'Set up automatic savings transfers on payday',
        'Use the 50/30/20 rule: 50% needs, 30% wants, 20% savings',
        'Track every expense for one month to identify savings opportunities'
      ],
      potentialSavings: Math.round(totalIncome * 0.1 - savings),
      icon: '💰'
    });
  } else if (savingsRate < 20) {
    recommendations.push({
      title: 'Boost Your Savings Rate',
      description: `You're saving ${savingsRate}%, which is good, but aim for 20%+ for better financial security.`,
      priority: 'medium',
      category: 'savings',
      actionItems: [
        'Increase savings by 2% each month',
        'Review and cancel unused subscriptions',
        'Set specific savings goals for motivation'
      ],
      potentialSavings: Math.round(totalIncome * 0.2 - savings),
      icon: '📈'
    });
  } else {
    recommendations.push({
      title: 'Excellent Savings Habits!',
      description: `Your ${savingsRate}% savings rate is outstanding! Consider investing for long-term growth.`,
      priority: 'low',
      category: 'investment',
      actionItems: [
        'Explore mutual funds or index funds',
        'Consider tax-saving investments like ELSS',
        'Diversify into equity for long-term wealth building'
      ],
      potentialGains: Math.round(savings * 0.12),
      icon: '🎯'
    });
  }

  // Category-specific recommendations
  if (categoryExpenses.Food > totalIncome * 0.25) {
    recommendations.push({
      title: 'High Food Expenses Detected',
      description: `Food expenses are ${((categoryExpenses.Food / totalIncome) * 100).toFixed(1)}% of income. Recommend keeping it under 25%.`,
      priority: 'medium',
      category: 'expenses',
      actionItems: [
        'Plan weekly meals and cook at home more often',
        'Use grocery lists to avoid impulse purchases',
        'Try batch cooking on weekends'
      ],
      potentialSavings: Math.round(categoryExpenses.Food - totalIncome * 0.25),
      icon: '🍽️'
    });
  }

  if (categoryExpenses.Entertainment > totalIncome * 0.1) {
    recommendations.push({
      title: 'Entertainment Spending Alert',
      description: `Entertainment costs are ${((categoryExpenses.Entertainment / totalIncome) * 100).toFixed(1)}% of income. Consider reducing to 10%.`,
      priority: 'low',
      category: 'expenses',
      actionItems: [
        'Choose free or low-cost entertainment options',
        'Share subscription services with family',
        'Set a monthly entertainment budget'
      ],
      potentialSavings: Math.round(categoryExpenses.Entertainment - totalIncome * 0.1),
      icon: '🎮'
    });
  }

  // Debt and EMI recommendations
  if (emiData.totalMonthlyEMI > totalIncome * 0.4) {
    recommendations.push({
      title: 'High EMI Burden Alert',
      description: `Your EMI payments are ${((emiData.totalMonthlyEMI / totalIncome) * 100).toFixed(1)}% of income. This is risky - keep it below 40%.`,
      priority: 'high',
      category: 'debt',
      actionItems: [
        'Consider consolidating high-interest loans',
        'Avoid taking new loans until EMI burden reduces',
        'Try to foreclose smaller loans first'
      ],
      potentialSavings: Math.round(emiData.totalMonthlyEMI - totalIncome * 0.35),
      icon: '⚠️'
    });
  }

  // Recurring transaction insights
  if (recurringTransactions.length > 0) {
    const subscriptionTotal = recurringTransactions.reduce((sum, t) => sum + t.averageAmount, 0);
    if (subscriptionTotal > totalIncome * 0.05) {
      recommendations.push({
        title: 'Review Recurring Subscriptions',
        description: `You have ${recurringTransactions.length} recurring payments totaling ₹${subscriptionTotal.toFixed(0)}/month.`,
        priority: 'medium',
        category: 'subscriptions',
        actionItems: [
          'Cancel unused or rarely-used subscriptions',
          'Look for annual plans to save money',
          'Share family plans when possible'
        ],
        potentialSavings: Math.round(subscriptionTotal * 0.3),
        icon: '🔄'
      });
    }
  }

  // Emergency fund recommendation
  const emergencyFund = savings;
  const recommendedEmergencyFund = totalExpenses * 6;
  if (emergencyFund < recommendedEmergencyFund) {
    recommendations.push({
      title: 'Build Your Emergency Fund',
      description: `Your emergency fund should cover 6 months of expenses (₹${recommendedEmergencyFund.toFixed(0)}). Current: ₹${emergencyFund.toFixed(0)}.`,
      priority: 'high',
      category: 'security',
      actionItems: [
        'Set aside 10% of income monthly for emergencies',
        'Keep emergency fund in liquid savings account',
        'Don\'t touch this fund unless absolutely necessary'
      ],
      targetAmount: recommendedEmergencyFund,
      currentAmount: emergencyFund,
      icon: '🛡️'
    });
  }

  // Tax optimization
  if (totalIncome > 600000) {
    recommendations.push({
      title: 'Optimize Your Tax Savings',
      description: 'With your income level, strategic tax planning can save you significant money.',
      priority: 'medium',
      category: 'tax',
      actionItems: [
        'Maximize 80C deductions (₹1.5L limit)',
        'Invest in NPS for additional ₹50K deduction',
        'Consider health insurance for 80D benefits'
      ],
      potentialSavings: Math.round(totalIncome * 0.08),
      icon: '📋'
    });
  }

  // Investment diversification
  recommendations.push({
    title: 'Diversify Your Investments',
    description: 'Build a balanced portfolio across different asset classes for optimal returns.',
    priority: 'low',
    category: 'investment',
    actionItems: [
      'Allocate 60% to equity, 30% to debt, 10% to gold',
      'Start SIP in diversified mutual funds',
      'Review and rebalance portfolio quarterly'
    ],
    icon: '📊'
  });

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// Detect recurring transactions using AI pattern matching
function detectRecurringTransactions(expenses) {
  const recurringPatterns = new Map();
  
  // Group by merchant/description
  expenses.forEach(expense => {
    const key = expense.description?.toLowerCase().trim() || expense.merchant?.toLowerCase().trim() || 'unknown';
    if (!recurringPatterns.has(key)) {
      recurringPatterns.set(key, []);
    }
    recurringPatterns.get(key).push({
      amount: expense.amount,
      date: new Date(expense.date),
      category: expense.category
    });
  });

  const recurring = [];
  
  recurringPatterns.forEach((transactions, merchant) => {
    if (transactions.length < 2) return;

    // Sort by date
    transactions.sort((a, b) => a.date - b.date);

    // Calculate intervals between transactions
    const intervals = [];
    for (let i = 1; i < transactions.length; i++) {
      const daysDiff = Math.round((transactions[i].date - transactions[i-1].date) / (1000 * 60 * 60 * 24));
      intervals.push(daysDiff);
    }

    // Check for consistent intervals (weekly, bi-weekly, monthly, quarterly)
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const stdDev = Math.sqrt(intervals.reduce((sq, n) => sq + Math.pow(n - avgInterval, 2), 0) / intervals.length);
    
    // Low standard deviation indicates regular pattern
    if (stdDev < avgInterval * 0.3) {
      const avgAmount = transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length;
      const amountVariance = Math.max(...transactions.map(t => t.amount)) - Math.min(...transactions.map(t => t.amount));
      
      let frequency = 'monthly';
      if (avgInterval < 10) frequency = 'weekly';
      else if (avgInterval < 20) frequency = 'bi-weekly';
      else if (avgInterval < 35) frequency = 'monthly';
      else if (avgInterval < 95) frequency = 'quarterly';
      else if (avgInterval < 370) frequency = 'yearly';

      recurring.push({
        merchant: merchant.replace(/[^a-z0-9\s]/g, '').trim(),
        frequency,
        averageAmount: Math.round(avgAmount),
        amountVariance: Math.round(amountVariance),
        occurrences: transactions.length,
        category: transactions[0].category,
        lastDate: transactions[transactions.length - 1].date,
        nextExpectedDate: new Date(transactions[transactions.length - 1].date.getTime() + avgInterval * 24 * 60 * 60 * 1000),
        confidence: Math.min(100, Math.round((1 - stdDev / avgInterval) * 100)),
        isSubscription: amountVariance < avgAmount * 0.1 // Very consistent amounts suggest subscriptions
      });
    }
  });

  return recurring.sort((a, b) => b.confidence - a.confidence);
}

// Get financial insights with AI recommendations
router.get('/', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { period = 'month' } = req.query;
    
    const now = new Date();
    const startDate = new Date();
    
    if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (period === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    }
    
    // Fetch all financial data
    const [expensesSnapshot, incomesSnapshot, budgetsSnapshot, emiSnapshot] = await Promise.all([
      db.collection('expenses')
        .where('userId', '==', userId)
        .where('date', '>=', startDate.toISOString())
        .get(),
      db.collection('incomes')
        .where('userId', '==', userId)
        .where('date', '>=', startDate.toISOString())
        .get(),
      db.collection('budgets')
        .where('userId', '==', userId)
        .get(),
      db.collection('emi')
        .where('userId', '==', userId)
        .where('status', '==', 'active')
        .get()
    ]);
    
    const expenses = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const totalExpenses = expenses.reduce((sum, doc) => sum + (doc.amount || 0), 0);
    const totalIncome = incomesSnapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
    const savings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((savings / totalIncome) * 100).toFixed(2) : 0;
    
    // Category-wise analysis
    const categoryExpenses = {};
    expenses.forEach(expense => {
      const category = expense.category || 'Other';
      categoryExpenses[category] = (categoryExpenses[category] || 0) + (expense.amount || 0);
    });
    
    // Calculate EMI burden
    const totalMonthlyEMI = emiSnapshot.docs.reduce((sum, doc) => sum + (parseFloat(doc.data().emiAmount) || 0), 0);
    const emiData = {
      totalMonthlyEMI,
      activeCount: emiSnapshot.size
    };

    // Detect recurring transactions
    const recurringTransactions = detectRecurringTransactions(expenses);
    
    // Generate AI recommendations
    const recommendations = generateAIRecommendations({
      totalIncome,
      totalExpenses,
      savings,
      savingsRate,
      categoryExpenses,
      recurringTransactions,
      emiData
    });

    const insights = {
      period,
      totalExpenses,
      totalIncome,
      savings,
      savingsRate: parseFloat(savingsRate),
      recommendations,
      recurringTransactions: recurringTransactions.slice(0, 10),
      topCategories: Object.entries(categoryExpenses)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, amount]) => ({ 
          category, 
          amount,
          percentage: ((amount / totalExpenses) * 100).toFixed(1)
        })),
      emiSummary: {
        totalMonthlyEMI,
        activeEMIs: emiSnapshot.size,
        emiToIncomeRatio: totalIncome > 0 ? ((totalMonthlyEMI / totalIncome) * 100).toFixed(1) : 0
      }
    };
    
    res.json(insights);
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

// Get spending trends
router.get('/trends', async (req, res) => {
  try {
    const userId = req.user.uid;
    const months = 6;
    const trends = [];
    
    for (let i = 0; i < months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const snapshot = await db.collection('expenses')
        .where('userId', '==', userId)
        .where('date', '>=', startOfMonth.toISOString())
        .where('date', '<=', endOfMonth.toISOString())
        .get();
      
      const total = snapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
      
      trends.unshift({
        month: startOfMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        amount: total,
        count: snapshot.size
      });
    }
    
    res.json(trends);
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

module.exports = router;
