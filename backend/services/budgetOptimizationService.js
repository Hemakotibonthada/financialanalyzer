// ============================================================
// Financial Analyzer - Budget Optimization Service
// Feature #91: Intelligent budget optimization engine
// ============================================================

const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');

class BudgetOptimizationService {
  // Industry-standard budget allocation rules
  static BUDGET_RULES = {
    '50-30-20': {
      name: '50/30/20 Rule',
      description: 'Needs 50%, Wants 30%, Savings 20%',
      needs: 0.50,
      wants: 0.30,
      savings: 0.20,
      categories: {
        needs: ['Rent', 'Utilities', 'Groceries', 'Insurance', 'Healthcare', 'Transport', 'EMI', 'Education'],
        wants: ['Dining', 'Entertainment', 'Shopping', 'Travel', 'Subscriptions', 'Personal Care', 'Gifts'],
        savings: ['Savings', 'Investments', 'Emergency Fund', 'Retirement'],
      },
    },
    '60-20-20': {
      name: '60/20/20 Rule',
      description: 'Committed 60%, Financial Goals 20%, Flexible 20%',
      committed: 0.60,
      goals: 0.20,
      flexible: 0.20,
    },
    '70-20-10': {
      name: '70/20/10 Rule',
      description: 'Living Expenses 70%, Savings 20%, Debt/Giving 10%',
      living: 0.70,
      savings: 0.20,
      debtGiving: 0.10,
    },
    'zero-based': {
      name: 'Zero-Based Budget',
      description: 'Every rupee has a purpose - income minus expenses equals zero',
    },
    'envelope': {
      name: 'Envelope System',
      description: 'Allocate cash to physical or virtual envelopes for each category',
    },
  };

  // Category benchmarks (percentage of income for Indian context)
  static CATEGORY_BENCHMARKS = {
    'Rent': { min: 0.15, ideal: 0.25, max: 0.35, priority: 'essential' },
    'Groceries': { min: 0.08, ideal: 0.12, max: 0.18, priority: 'essential' },
    'Transport': { min: 0.05, ideal: 0.08, max: 0.12, priority: 'essential' },
    'Utilities': { min: 0.03, ideal: 0.05, max: 0.08, priority: 'essential' },
    'Healthcare': { min: 0.02, ideal: 0.05, max: 0.10, priority: 'essential' },
    'Insurance': { min: 0.03, ideal: 0.05, max: 0.08, priority: 'essential' },
    'EMI': { min: 0.00, ideal: 0.10, max: 0.25, priority: 'essential' },
    'Education': { min: 0.02, ideal: 0.05, max: 0.10, priority: 'essential' },
    'Dining': { min: 0.02, ideal: 0.05, max: 0.08, priority: 'discretionary' },
    'Entertainment': { min: 0.02, ideal: 0.04, max: 0.07, priority: 'discretionary' },
    'Shopping': { min: 0.03, ideal: 0.05, max: 0.10, priority: 'discretionary' },
    'Travel': { min: 0.02, ideal: 0.05, max: 0.08, priority: 'discretionary' },
    'Subscriptions': { min: 0.01, ideal: 0.02, max: 0.04, priority: 'discretionary' },
    'Personal Care': { min: 0.02, ideal: 0.03, max: 0.05, priority: 'discretionary' },
    'Gifts': { min: 0.01, ideal: 0.02, max: 0.04, priority: 'discretionary' },
    'Investments': { min: 0.10, ideal: 0.20, max: 0.40, priority: 'savings' },
    'Emergency Fund': { min: 0.05, ideal: 0.10, max: 0.15, priority: 'savings' },
    'Retirement': { min: 0.05, ideal: 0.10, max: 0.20, priority: 'savings' },
  };

  /**
   * Analyze current spending and suggest optimized budget
   */
  static async optimizeBudget(userId, monthlyIncome) {
    try {
      const threeMonthsAgo = new Date(Date.now() - 90 * 86400000);
      const transactions = await Transaction.find({
        userId,
        date: { $gte: threeMonthsAgo },
        type: 'expense',
      });

      // Calculate average monthly spending by category
      const categorySpending = {};
      transactions.forEach(tx => {
        const cat = tx.category || 'Other';
        categorySpending[cat] = (categorySpending[cat] || 0) + tx.amount;
      });

      // Normalize to monthly averages
      const monthlySpending = {};
      let totalMonthlyExpense = 0;
      for (const [cat, total] of Object.entries(categorySpending)) {
        monthlySpending[cat] = Math.round(total / 3);
        totalMonthlyExpense += monthlySpending[cat];
      }

      // Apply 50/30/20 rule optimization
      const rule = this.BUDGET_RULES['50-30-20'];
      const needsBudget = monthlyIncome * rule.needs;
      const wantsBudget = monthlyIncome * rule.wants;
      const savingsBudget = monthlyIncome * rule.savings;

      // Classify current spending
      const currentNeeds = Object.entries(monthlySpending)
        .filter(([cat]) => rule.categories.needs.includes(cat))
        .reduce((s, [, v]) => s + v, 0);
      const currentWants = Object.entries(monthlySpending)
        .filter(([cat]) => rule.categories.wants.includes(cat))
        .reduce((s, [, v]) => s + v, 0);
      const currentSavings = monthlyIncome - totalMonthlyExpense;

      // Generate optimized allocations
      const optimizedBudget = {};
      const suggestions = [];
      const savings_opportunities = [];

      for (const [category, benchmark] of Object.entries(this.CATEGORY_BENCHMARKS)) {
        const current = monthlySpending[category] || 0;
        const currentPct = monthlyIncome > 0 ? current / monthlyIncome : 0;
        const idealAmount = Math.round(monthlyIncome * benchmark.ideal);
        const maxAmount = Math.round(monthlyIncome * benchmark.max);

        optimizedBudget[category] = {
          current: current,
          currentPercentage: Math.round(currentPct * 100),
          suggested: idealAmount,
          suggestedPercentage: Math.round(benchmark.ideal * 100),
          max: maxAmount,
          status: currentPct <= benchmark.ideal ? 'good' : currentPct <= benchmark.max ? 'warning' : 'over',
          priority: benchmark.priority,
          potentialSaving: current > idealAmount ? current - idealAmount : 0,
        };

        if (currentPct > benchmark.max) {
          suggestions.push({
            category,
            type: 'reduce',
            severity: 'high',
            message: `${category} spending (${Math.round(currentPct * 100)}%) exceeds maximum recommended ${Math.round(benchmark.max * 100)}%`,
            currentAmount: current,
            suggestedAmount: idealAmount,
            savingPotential: current - idealAmount,
          });
        } else if (currentPct > benchmark.ideal) {
          suggestions.push({
            category,
            type: 'optimize',
            severity: 'medium',
            message: `${category} spending can be optimized from ${Math.round(currentPct * 100)}% to ideal ${Math.round(benchmark.ideal * 100)}%`,
            currentAmount: current,
            suggestedAmount: idealAmount,
            savingPotential: current - idealAmount,
          });
        }

        if (current > idealAmount && benchmark.priority === 'discretionary') {
          savings_opportunities.push({
            category,
            currentMonthly: current,
            suggestedMonthly: idealAmount,
            monthlySaving: current - idealAmount,
            annualSaving: (current - idealAmount) * 12,
            easeOfImplementation: current - idealAmount < monthlyIncome * 0.02 ? 'easy' : 'moderate',
          });
        }
      }

      // Sort savings opportunities by potential
      savings_opportunities.sort((a, b) => b.monthlySaving - a.monthlySaving);

      return {
        success: true,
        currentSummary: {
          monthlyIncome,
          totalExpenses: totalMonthlyExpense,
          currentSavings,
          savingsRate: Math.round((currentSavings / monthlyIncome) * 100),
          needs: { amount: currentNeeds, percentage: Math.round((currentNeeds / monthlyIncome) * 100), target: 50 },
          wants: { amount: currentWants, percentage: Math.round((currentWants / monthlyIncome) * 100), target: 30 },
          savings: { amount: currentSavings, percentage: Math.round((currentSavings / monthlyIncome) * 100), target: 20 },
        },
        optimizedBudget,
        suggestions,
        savingsOpportunities: savings_opportunities,
        totalPotentialSaving: savings_opportunities.reduce((s, o) => s + o.monthlySaving, 0),
        totalAnnualPotentialSaving: savings_opportunities.reduce((s, o) => s + o.annualSaving, 0),
        budgetScore: this._calculateBudgetScore(monthlySpending, monthlyIncome),
        recommendations: this._generateRecommendations(currentSavings, monthlyIncome, totalMonthlyExpense, suggestions),
      };
    } catch (error) {
      console.error('Error optimizing budget:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate smart budget allocation based on income
   */
  static generateSmartBudget(monthlyIncome, preferences = {}) {
    const { 
      hasEMI = false, 
      emiAmount = 0, 
      hasRent = true, 
      rentAmount = 0,
      riskTolerance = 'moderate',
      savingsGoal = 'balanced',
    } = preferences;

    const allocation = {};
    let remaining = monthlyIncome;

    // Fixed expenses first
    if (hasRent && rentAmount > 0) {
      allocation['Rent'] = rentAmount;
      remaining -= rentAmount;
    } else if (hasRent) {
      allocation['Rent'] = Math.round(monthlyIncome * 0.25);
      remaining -= allocation['Rent'];
    }

    if (hasEMI && emiAmount > 0) {
      allocation['EMI'] = emiAmount;
      remaining -= emiAmount;
    }

    // Savings allocation based on goal
    const savingsMultiplier = {
      aggressive: 0.35,
      balanced: 0.25,
      conservative: 0.15,
      debt_focused: 0.10,
    };

    const savingsTarget = Math.round(remaining * (savingsMultiplier[savingsGoal] || 0.25));
    
    // Investment split based on risk tolerance
    const investmentSplit = {
      aggressive: { equity: 0.70, debt: 0.15, gold: 0.05, emergency: 0.10 },
      moderate: { equity: 0.50, debt: 0.25, gold: 0.10, emergency: 0.15 },
      conservative: { equity: 0.30, debt: 0.40, gold: 0.10, emergency: 0.20 },
    };

    const split = investmentSplit[riskTolerance] || investmentSplit.moderate;
    allocation['Equity Investments'] = Math.round(savingsTarget * split.equity);
    allocation['Debt Investments'] = Math.round(savingsTarget * split.debt);
    allocation['Gold/Commodities'] = Math.round(savingsTarget * split.gold);
    allocation['Emergency Fund'] = Math.round(savingsTarget * split.emergency);
    remaining -= savingsTarget;

    // Essential expenses
    allocation['Groceries'] = Math.round(remaining * 0.22);
    allocation['Utilities'] = Math.round(remaining * 0.08);
    allocation['Transport'] = Math.round(remaining * 0.12);
    allocation['Healthcare'] = Math.round(remaining * 0.08);
    allocation['Insurance'] = Math.round(remaining * 0.06);
    allocation['Education'] = Math.round(remaining * 0.06);

    // Discretionary
    allocation['Dining'] = Math.round(remaining * 0.10);
    allocation['Entertainment'] = Math.round(remaining * 0.08);
    allocation['Shopping'] = Math.round(remaining * 0.08);
    allocation['Personal Care'] = Math.round(remaining * 0.04);
    allocation['Subscriptions'] = Math.round(remaining * 0.03);
    allocation['Miscellaneous'] = Math.round(remaining * 0.05);

    const totalAllocated = Object.values(allocation).reduce((s, v) => s + v, 0);
    
    return {
      success: true,
      monthlyIncome,
      allocation,
      totalAllocated,
      unallocated: monthlyIncome - totalAllocated,
      savingsRate: Math.round((savingsTarget / monthlyIncome) * 100),
      breakdown: {
        essential: Object.entries(allocation)
          .filter(([k]) => ['Rent', 'EMI', 'Groceries', 'Utilities', 'Transport', 'Healthcare', 'Insurance', 'Education'].includes(k))
          .reduce((s, [, v]) => s + v, 0),
        discretionary: Object.entries(allocation)
          .filter(([k]) => ['Dining', 'Entertainment', 'Shopping', 'Personal Care', 'Subscriptions', 'Miscellaneous'].includes(k))
          .reduce((s, [, v]) => s + v, 0),
        savings: savingsTarget,
      },
    };
  }

  /**
   * Compare spending patterns across time periods
   */
  static async compareSpendingPeriods(userId, period1Start, period1End, period2Start, period2End) {
    try {
      const [period1Txns, period2Txns] = await Promise.all([
        Transaction.find({ userId, date: { $gte: period1Start, $lte: period1End }, type: 'expense' }),
        Transaction.find({ userId, date: { $gte: period2Start, $lte: period2End }, type: 'expense' }),
      ]);

      const aggregate = (txns) => {
        const byCat = {};
        let total = 0;
        txns.forEach(tx => {
          const cat = tx.category || 'Other';
          byCat[cat] = (byCat[cat] || 0) + tx.amount;
          total += tx.amount;
        });
        return { byCat, total, count: txns.length };
      };

      const p1 = aggregate(period1Txns);
      const p2 = aggregate(period2Txns);

      const allCategories = [...new Set([...Object.keys(p1.byCat), ...Object.keys(p2.byCat)])];

      const comparison = allCategories.map(cat => {
        const a1 = p1.byCat[cat] || 0;
        const a2 = p2.byCat[cat] || 0;
        const change = a2 - a1;
        const changePercent = a1 > 0 ? Math.round((change / a1) * 100) : a2 > 0 ? 100 : 0;

        return {
          category: cat,
          period1Amount: a1,
          period2Amount: a2,
          change,
          changePercent,
          direction: change > 0 ? 'increased' : change < 0 ? 'decreased' : 'unchanged',
          significance: Math.abs(changePercent) > 20 ? 'significant' : Math.abs(changePercent) > 10 ? 'moderate' : 'minor',
        };
      }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

      return {
        success: true,
        period1: { total: p1.total, count: p1.count },
        period2: { total: p2.total, count: p2.count },
        totalChange: p2.total - p1.total,
        totalChangePercent: p1.total > 0 ? Math.round(((p2.total - p1.total) / p1.total) * 100) : 0,
        comparison,
        topIncreases: comparison.filter(c => c.direction === 'increased').slice(0, 5),
        topDecreases: comparison.filter(c => c.direction === 'decreased').slice(0, 5),
      };
    } catch (error) {
      console.error('Error comparing spending periods:', error);
      return { success: false, error: error.message };
    }
  }

  // ======================== HELPER METHODS ========================

  static _calculateBudgetScore(monthlySpending, monthlyIncome) {
    let score = 100;
    let deductions = [];

    for (const [category, amount] of Object.entries(monthlySpending)) {
      const benchmark = this.CATEGORY_BENCHMARKS[category];
      if (!benchmark) continue;

      const pct = amount / monthlyIncome;
      if (pct > benchmark.max) {
        const penalty = Math.min(15, Math.round((pct - benchmark.max) / benchmark.max * 100));
        score -= penalty;
        deductions.push({ category, penalty, reason: 'exceeds max' });
      } else if (pct > benchmark.ideal) {
        const penalty = Math.min(5, Math.round((pct - benchmark.ideal) / benchmark.ideal * 50));
        score -= penalty;
        deductions.push({ category, penalty, reason: 'above ideal' });
      }
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      grade: score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 50 ? 'D' : 'F',
      deductions,
    };
  }

  static _generateRecommendations(currentSavings, income, expenses, suggestions) {
    const recommendations = [];
    const savingsRate = income > 0 ? currentSavings / income : 0;

    if (savingsRate < 0.10) {
      recommendations.push({
        priority: 'critical',
        icon: '🚨',
        title: 'Dangerously Low Savings',
        message: `Your savings rate is only ${Math.round(savingsRate * 100)}%. Aim for at least 20%.`,
        actions: ['Cut discretionary spending by 20%', 'Review subscriptions', 'Cook at home more often'],
      });
    } else if (savingsRate < 0.20) {
      recommendations.push({
        priority: 'high',
        icon: '⚠️',
        title: 'Below Target Savings',
        message: `Your savings rate is ${Math.round(savingsRate * 100)}%. Try to reach 20%.`,
        actions: ['Track daily expenses', 'Set up auto-debit for savings', 'Find one expense to eliminate'],
      });
    } else {
      recommendations.push({
        priority: 'positive',
        icon: '🌟',
        title: 'Great Savings Rate!',
        message: `Your savings rate of ${Math.round(savingsRate * 100)}% is excellent. Keep it up!`,
        actions: ['Consider increasing investments', 'Diversify your portfolio', 'Plan for long-term goals'],
      });
    }

    if (suggestions.filter(s => s.severity === 'high').length > 3) {
      recommendations.push({
        priority: 'high',
        icon: '📊',
        title: 'Multiple Overspending Categories',
        message: 'Several categories exceed recommended limits. Consider a comprehensive budget review.',
        actions: ['Use the 50/30/20 rule', 'Set category-wise limits', 'Review and cut back on top overspending areas'],
      });
    }

    if (expenses > income * 0.9) {
      recommendations.push({
        priority: 'critical',
        icon: '💸',
        title: 'Living Paycheck to Paycheck',
        message: 'Your expenses are consuming over 90% of income. Build an emergency fund immediately.',
        actions: ['Build 3 months emergency fund', 'Find additional income sources', 'Negotiate bills and subscriptions'],
      });
    }

    return recommendations;
  }
}

module.exports = BudgetOptimizationService;
