// ============================================================================
// Budget Optimizer AI — Smart Budget Allocation & Optimization
// ============================================================================
// AI-powered budget analysis and optimization engine:
//  - Analyzes actual spending vs budget allocation
//  - Suggests optimal budget distribution (50/30/20 + customized)
//  - Identifies under/over-budget categories
//  - Provides smart reallocation suggestions
//  - Seasonal adjustment recommendations
//  - Zero-based budgeting assistance
// ============================================================================

const Transaction = require('../../models/Transaction');
const Budget = require('../../models/Budget');
const logger = require('../../utils/logger');

class BudgetOptimizerAI {
  /**
   * Generate optimal budget allocation based on income and spending patterns
   */
  async generateOptimalBudget(userId, monthlyIncome) {
    const since = new Date();
    since.setMonth(since.getMonth() - 3);
    const transactions = await Transaction.find({ userId, type: 'expense', date: { $gte: since } }).lean();

    if (!monthlyIncome) {
      const incTxns = await Transaction.find({ userId, type: 'income', date: { $gte: since } }).lean();
      monthlyIncome = incTxns.reduce((s, t) => s + (t.amount || 0), 0) / 3;
    }

    // Actual spending by category (monthly avg over 3 months)
    const categoryTotals = {};
    transactions.forEach(t => {
      const cat = t.category || 'other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (t.amount || 0);
    });
    const monthlyActual = {};
    Object.entries(categoryTotals).forEach(([cat, total]) => {
      monthlyActual[cat] = Math.round(total / 3);
    });

    const totalActualMonthly = Object.values(monthlyActual).reduce((a, b) => a + b, 0);

    // Classify categories
    const necessities = ['rent', 'groceries', 'utilities', 'healthcare', 'insurance', 'education', 'emi', 'transport'];
    const discretionary = ['food', 'dining', 'shopping', 'entertainment', 'travel', 'gift', 'personal'];

    let needsTotal = 0, wantsTotal = 0, savingsTotal = 0;
    Object.entries(monthlyActual).forEach(([cat, amount]) => {
      if (necessities.includes(cat.toLowerCase())) needsTotal += amount;
      else if (discretionary.includes(cat.toLowerCase())) wantsTotal += amount;
      else needsTotal += amount; // Default to needs
    });
    savingsTotal = Math.max(0, monthlyIncome - needsTotal - wantsTotal);

    // 50/30/20 target
    const targetNeeds = monthlyIncome * 0.50;
    const targetWants = monthlyIncome * 0.30;
    const targetSavings = monthlyIncome * 0.20;

    // Per-category optimization
    const optimized = {};
    const adjustments = [];

    Object.entries(monthlyActual).forEach(([cat, actualAmount]) => {
      const isNeed = necessities.includes(cat.toLowerCase());
      const totalBucket = isNeed ? needsTotal : wantsTotal;
      const targetBucket = isNeed ? targetNeeds : targetWants;

      // Proportional allocation within bucket
      const proportion = totalBucket > 0 ? actualAmount / totalBucket : 0;
      const suggested = Math.round(proportion * targetBucket);

      const diff = actualAmount - suggested;
      const diffPct = suggested > 0 ? Math.round((diff / suggested) * 100) : 0;

      optimized[cat] = {
        actual: actualAmount,
        suggested,
        difference: diff,
        differencePercent: diffPct,
        type: isNeed ? 'need' : 'want',
        status: diffPct > 20 ? 'over_budget' : diffPct < -20 ? 'under_budget' : 'on_track',
      };

      if (Math.abs(diff) > 500 && Math.abs(diffPct) > 15) {
        adjustments.push({
          category: cat,
          direction: diff > 0 ? 'reduce' : 'increase',
          amount: Math.abs(diff),
          message: diff > 0
            ? `Reduce ${cat} by ₹${Math.abs(diff).toLocaleString('en-IN')}/month (currently ${diffPct}% over)`
            : `You can allocate ₹${Math.abs(diff).toLocaleString('en-IN')}/month more to ${cat}`,
          priority: Math.abs(diffPct) > 50 ? 'high' : 'medium',
        });
      }
    });

    // Sort adjustments by priority
    adjustments.sort((a, b) => {
      const pri = { high: 3, medium: 2, low: 1 };
      return (pri[b.priority] || 0) - (pri[a.priority] || 0);
    });

    return {
      monthlyIncome: Math.round(monthlyIncome),
      rule503020: {
        needs: { target: Math.round(targetNeeds), actual: needsTotal, diff: needsTotal - Math.round(targetNeeds) },
        wants: { target: Math.round(targetWants), actual: wantsTotal, diff: wantsTotal - Math.round(targetWants) },
        savings: { target: Math.round(targetSavings), actual: savingsTotal, diff: savingsTotal - Math.round(targetSavings) },
      },
      categoryBudgets: optimized,
      adjustments,
      totalActualSpending: totalActualMonthly,
      savingsOpportunity: Math.max(0, wantsTotal - Math.round(targetWants)),
      healthScore: this._calculateBudgetHealth(needsTotal, wantsTotal, savingsTotal, monthlyIncome),
    };
  }

  /**
   * Analyze budget adherence over time
   */
  async analyzeBudgetAdherence(userId, months = 3) {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const [transactions, budgets] = await Promise.all([
      Transaction.find({ userId, type: 'expense', date: { $gte: since } }).lean(),
      Budget.find({ userId }).lean().catch(() => []),
    ]);

    // Monthly breakdown
    const monthlyData = {};
    transactions.forEach(t => {
      const monthKey = new Date(t.date).toISOString().substring(0, 7);
      const cat = t.category || 'other';
      if (!monthlyData[monthKey]) monthlyData[monthKey] = {};
      monthlyData[monthKey][cat] = (monthlyData[monthKey][cat] || 0) + (t.amount || 0);
    });

    // Budget limits
    const budgetLimits = {};
    budgets.forEach(b => {
      const cat = b.category || b.name;
      if (cat) budgetLimits[cat.toLowerCase()] = b.limit || b.amount || b.budgetAmount || 0;
    });

    // Calculate adherence per month
    const adherenceHistory = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, categories]) => {
        let withinBudget = 0;
        let overBudget = 0;
        let totalCategories = 0;

        Object.entries(categories).forEach(([cat, spent]) => {
          const limit = budgetLimits[cat.toLowerCase()];
          if (limit && limit > 0) {
            totalCategories++;
            if (spent <= limit) withinBudget++;
            else overBudget++;
          }
        });

        const adherenceRate = totalCategories > 0 ? Math.round((withinBudget / totalCategories) * 100) : null;

        return {
          month,
          categories,
          withinBudget,
          overBudget,
          totalTracked: totalCategories,
          adherenceRate,
          totalSpent: Object.values(categories).reduce((a, b) => a + b, 0),
        };
      });

    // Overall adherence score
    const validMonths = adherenceHistory.filter(h => h.adherenceRate !== null);
    const avgAdherence = validMonths.length > 0
      ? Math.round(validMonths.reduce((s, h) => s + h.adherenceRate, 0) / validMonths.length)
      : null;

    // Trend
    const trend = validMonths.length >= 2
      ? validMonths[validMonths.length - 1].adherenceRate - validMonths[0].adherenceRate
      : 0;

    return {
      overallAdherence: avgAdherence,
      trend: trend > 5 ? 'improving' : trend < -5 ? 'declining' : 'stable',
      trendValue: trend,
      history: adherenceHistory,
      budgetLimits,
      recommendations: this._getAdherenceRecommendations(avgAdherence, adherenceHistory),
    };
  }

  /**
   * Smart budget reallocation suggestions
   */
  async suggestReallocation(userId) {
    const optimal = await this.generateOptimalBudget(userId);
    const reallocationPlan = [];

    // Find overspent categories that can be reduced
    const overSpent = Object.entries(optimal.categoryBudgets)
      .filter(([, data]) => data.status === 'over_budget' && data.difference > 0)
      .sort((a, b) => b[1].difference - a[1].difference);

    // Find underspent categories or savings
    const underSpent = Object.entries(optimal.categoryBudgets)
      .filter(([, data]) => data.status === 'under_budget' && data.difference < 0)
      .sort((a, b) => a[1].difference - b[1].difference);

    const totalOverspend = overSpent.reduce((s, [, d]) => s + d.difference, 0);

    if (totalOverspend > 0) {
      // Suggest moving money from over to savings or under categories
      overSpent.forEach(([cat, data]) => {
        const reductionTarget = Math.round(data.difference * 0.7); // Aim for 70% reduction
        reallocationPlan.push({
          from: cat,
          to: 'savings',
          amount: reductionTarget,
          message: `Reduce ${cat} spending by ₹${reductionTarget.toLocaleString('en-IN')}/month`,
          difficulty: data.differencePercent > 50 ? 'hard' : 'moderate',
          tips: this._getReductionTips(cat),
        });
      });
    }

    return {
      currentSituation: {
        monthlyIncome: optimal.monthlyIncome,
        totalSpending: optimal.totalActualSpending,
        savingsRate: optimal.monthlyIncome > 0
          ? Math.round((optimal.monthlyIncome - optimal.totalActualSpending) / optimal.monthlyIncome * 100)
          : 0,
      },
      reallocationPlan,
      potentialSavings: totalOverspend,
      impactSummary: totalOverspend > 0
        ? `By following this plan, you could save an additional ₹${Math.round(totalOverspend * 0.7).toLocaleString('en-IN')}/month (₹${Math.round(totalOverspend * 0.7 * 12).toLocaleString('en-IN')}/year)`
        : 'Your budget allocation looks good! Focus on maintaining consistency.',
    };
  }

  // ─── Private helpers ────────────────────────────────────────────
  _calculateBudgetHealth(needs, wants, savings, income) {
    if (income <= 0) return 0;
    let score = 50;

    // Savings component (40 pts max)
    const savingsRate = savings / income * 100;
    score += Math.min(40, savingsRate >= 20 ? 40 : savingsRate >= 10 ? 25 : savingsRate * 1.5);

    // Needs ratio (30 pts max)
    const needsRatio = needs / income * 100;
    score += needsRatio <= 50 ? 30 : needsRatio <= 60 ? 20 : needsRatio <= 70 ? 10 : 0;

    // Wants ratio (20 pts max)
    const wantsRatio = wants / income * 100;
    score += wantsRatio <= 30 ? 20 : wantsRatio <= 40 ? 15 : wantsRatio <= 50 ? 5 : 0;

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  _getAdherenceRecommendations(adherence, history) {
    const recs = [];
    if (adherence === null) {
      recs.push('Set budget limits for your main spending categories');
      return recs;
    }
    if (adherence < 50) {
      recs.push('Review and adjust your budget limits — they may be too restrictive');
      recs.push('Track purchases daily to stay aware of spending');
    } else if (adherence < 75) {
      recs.push('Focus on the 2-3 categories where you overspend most');
      recs.push('Set up spending alerts for those categories');
    } else {
      recs.push('Excellent budget discipline! Consider tightening limits to save more');
    }
    return recs;
  }

  _getReductionTips(category) {
    const tips = {
      food: ['Meal prep on weekends', 'Set daily spending limit', 'Cook at home 5 days/week'],
      shopping: ['Wait 48 hours before buying', 'Unsubscribe from promotional emails', 'Set monthly limit'],
      entertainment: ['Cancel unused subscriptions', 'Look for free alternatives', 'Set monthly fun budget'],
      transport: ['Use public transit twice a week', 'Carpool with coworkers', 'Walk for short distances'],
      dining: ['Limit eating out to weekends', 'Pack lunch for work', 'Choose affordable restaurants'],
    };
    return tips[category.toLowerCase()] || ['Track daily spending', 'Set alerts for overspending', 'Find alternatives'];
  }
}

module.exports = new BudgetOptimizerAI();
