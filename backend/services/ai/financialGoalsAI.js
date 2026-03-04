// ============================================================================
// Financial Goals AI Engine — Smart Goal Planning & Tracking
// ============================================================================
// Provides AI-powered goal analysis including:
//  - Goal feasibility assessment
//  - Optimal savings plan calculation
//  - Progress tracking with pace analysis
//  - Risk-adjusted projections
//  - Smart milestone suggestions
//  - Goal prioritization recommendations
// ============================================================================

const Transaction = require('../../models/Transaction');
const FinancialGoal = require('../../models/FinancialGoal');
const logger = require('../../utils/logger');

class FinancialGoalsAI {
  /**
   * Assess goal feasibility based on current financial situation
   */
  async assessFeasibility(userId, goalParams) {
    const { targetAmount, targetDate, currentSaved = 0, monthlyContribution = 0 } = goalParams;

    // Get user's financial context
    const since = new Date();
    since.setMonth(since.getMonth() - 3);
    const transactions = await Transaction.find({ userId, date: { $gte: since } }).lean();

    const monthlyIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0) / 3;
    const monthlyExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0) / 3;
    const monthlySurplus = monthlyIncome - monthlyExpense;

    const remaining = targetAmount - currentSaved;
    const monthsUntilTarget = targetDate
      ? Math.max(1, Math.ceil((new Date(targetDate) - new Date()) / (30.44 * 24 * 60 * 60 * 1000)))
      : null;

    const requiredMonthly = monthsUntilTarget ? remaining / monthsUntilTarget : null;

    // Calculate feasibility score (0-100)
    let feasibilityScore = 100;
    let factors = [];

    if (requiredMonthly) {
      const surplus = monthlyContribution || monthlySurplus;
      const ratio = surplus > 0 ? requiredMonthly / surplus : Infinity;

      if (ratio > 1) {
        feasibilityScore -= Math.min(40, (ratio - 1) * 20);
        factors.push({
          type: 'warning',
          message: `Required monthly saving of ₹${Math.round(requiredMonthly).toLocaleString('en-IN')} exceeds available surplus of ₹${Math.round(surplus).toLocaleString('en-IN')}`
        });
      }
      if (ratio <= 0.5) {
        factors.push({ type: 'positive', message: 'Easily achievable with current savings pattern' });
      }
    }

    // Time pressure
    if (monthsUntilTarget && monthsUntilTarget < 6 && remaining > monthlySurplus * 6) {
      feasibilityScore -= 20;
      factors.push({ type: 'warning', message: 'Tight timeline — consider extending the deadline' });
    }

    // Progress check
    if (currentSaved > 0 && targetAmount > 0) {
      const progressPct = (currentSaved / targetAmount) * 100;
      if (progressPct > 50) {
        feasibilityScore = Math.min(100, feasibilityScore + 10);
        factors.push({ type: 'positive', message: `Already ${progressPct.toFixed(0)}% complete!` });
      }
    }

    feasibilityScore = Math.max(0, Math.min(100, Math.round(feasibilityScore)));

    // Suggested adjustments
    const suggestions = [];
    if (feasibilityScore < 60 && monthsUntilTarget) {
      // Suggest extending timeline
      const comfortableMonths = monthlySurplus > 0 ? Math.ceil(remaining / (monthlySurplus * 0.5)) : null;
      if (comfortableMonths) {
        const newDate = new Date();
        newDate.setMonth(newDate.getMonth() + comfortableMonths);
        suggestions.push({
          type: 'extend_timeline',
          message: `Extend deadline to ${newDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} for a comfortable pace`,
          newMonths: comfortableMonths,
        });
      }

      // Suggest lower target
      const achievableTarget = currentSaved + (monthlySurplus * 0.6 * (monthsUntilTarget || 12));
      if (achievableTarget < targetAmount) {
        suggestions.push({
          type: 'reduce_target',
          message: `A target of ₹${Math.round(achievableTarget).toLocaleString('en-IN')} would be more achievable`,
          newTarget: Math.round(achievableTarget),
        });
      }

      // Suggest increasing savings
      if (requiredMonthly && monthlySurplus > 0) {
        const additionalNeeded = requiredMonthly - monthlySurplus * 0.5;
        if (additionalNeeded > 0) {
          suggestions.push({
            type: 'increase_savings',
            message: `Save an additional ₹${Math.round(additionalNeeded).toLocaleString('en-IN')}/month by reducing discretionary spending`,
          });
        }
      }
    }

    return {
      feasibilityScore,
      rating: feasibilityScore >= 80 ? 'highly_achievable' : feasibilityScore >= 60 ? 'achievable' : feasibilityScore >= 40 ? 'challenging' : 'very_challenging',
      factors,
      suggestions,
      financialContext: {
        monthlyIncome: Math.round(monthlyIncome),
        monthlyExpense: Math.round(monthlyExpense),
        monthlySurplus: Math.round(monthlySurplus),
        savingsRate: monthlyIncome > 0 ? Math.round((monthlySurplus / monthlyIncome) * 100) : 0,
      },
      projection: {
        monthsRequired: requiredMonthly ? monthsUntilTarget : null,
        requiredMonthly: requiredMonthly ? Math.round(requiredMonthly) : null,
        projectedCompletion: monthlySurplus > 0
          ? new Date(Date.now() + (remaining / (monthlySurplus * 0.5)) * 30.44 * 24 * 60 * 60 * 1000)
          : null,
      },
    };
  }

  /**
   * Generate optimal savings plan for a goal
   */
  generateSavingsPlan(goal, monthlyBudget) {
    const { targetAmount, currentSaved = 0, targetDate, priority = 'medium' } = goal;
    const remaining = targetAmount - currentSaved;
    const monthsLeft = targetDate
      ? Math.max(1, Math.ceil((new Date(targetDate) - new Date()) / (30.44 * 24 * 60 * 60 * 1000)))
      : 24;

    // Priority multiplier
    const priorityFactor = priority === 'critical' ? 0.4 : priority === 'high' ? 0.3 : priority === 'medium' ? 0.2 : 0.1;
    const idealMonthly = Math.min(monthlyBudget * priorityFactor, remaining / Math.max(1, monthsLeft - 1));

    // Milestones
    const milestones = [];
    const milestonePoints = [10, 25, 50, 75, 90, 100];
    milestonePoints.forEach(pct => {
      const targetAmt = targetAmount * pct / 100;
      if (targetAmt > currentSaved) {
        const monthsToReach = idealMonthly > 0 ? Math.ceil((targetAmt - currentSaved) / idealMonthly) : null;
        const reachDate = monthsToReach ? new Date(Date.now() + monthsToReach * 30.44 * 24 * 60 * 60 * 1000) : null;
        milestones.push({
          percentage: pct,
          amount: Math.round(targetAmt),
          monthsFromNow: monthsToReach,
          estimatedDate: reachDate,
          reward: pct === 50 ? '🎯 Halfway there!' : pct === 100 ? '🎉 Goal Complete!' : null,
        });
      }
    });

    // Monthly schedule
    const schedule = [];
    let accumulated = currentSaved;
    for (let m = 1; m <= Math.min(monthsLeft, 36); m++) {
      accumulated = Math.min(targetAmount, accumulated + idealMonthly);
      const date = new Date();
      date.setMonth(date.getMonth() + m);
      schedule.push({
        month: m,
        date: date.toISOString().substring(0, 7),
        contribution: Math.round(idealMonthly),
        accumulated: Math.round(accumulated),
        progress: Math.round((accumulated / targetAmount) * 100),
      });
      if (accumulated >= targetAmount) break;
    }

    return {
      idealMonthly: Math.round(idealMonthly),
      totalMonths: schedule.length,
      milestones,
      schedule,
      strategies: this._getStrategies(priority, idealMonthly, monthlyBudget),
    };
  }

  /**
   * Analyze pace of goal progress
   */
  async analyzePace(userId, goalId) {
    let goal;
    try {
      goal = await FinancialGoal.findOne({ _id: goalId, userId }).lean();
    } catch { return { error: 'Goal not found' }; }
    if (!goal) return { error: 'Goal not found' };

    const targetAmount = goal.targetAmount || goal.target || 0;
    const currentSaved = goal.currentAmount || goal.saved || 0;
    const startDate = new Date(goal.startDate || goal.createdAt);
    const targetDate = goal.targetDate ? new Date(goal.targetDate) : null;

    const elapsedMonths = Math.max(1, (Date.now() - startDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
    const progressPct = targetAmount > 0 ? (currentSaved / targetAmount * 100) : 0;
    const monthlyRate = currentSaved / elapsedMonths;

    const remainingAmount = Math.max(0, targetAmount - currentSaved);
    const projectedMonthsToComplete = monthlyRate > 0 ? remainingAmount / monthlyRate : Infinity;

    let pace = 'on_track';
    let paceScore = 50;

    if (targetDate) {
      const monthsLeft = Math.max(0, (targetDate.getTime() - Date.now()) / (30.44 * 24 * 60 * 60 * 1000));
      const expectedProgress = ((elapsedMonths / (elapsedMonths + monthsLeft)) * 100);

      if (progressPct >= expectedProgress * 1.1) {
        pace = 'ahead';
        paceScore = 85;
      } else if (progressPct >= expectedProgress * 0.9) {
        pace = 'on_track';
        paceScore = 70;
      } else if (progressPct >= expectedProgress * 0.7) {
        pace = 'slightly_behind';
        paceScore = 45;
      } else {
        pace = 'behind';
        paceScore = 25;
      }
    }

    // Recommendations based on pace
    const recommendations = [];
    if (pace === 'behind' || pace === 'slightly_behind') {
      const catchUpMonthly = targetDate
        ? remainingAmount / Math.max(1, (targetDate.getTime() - Date.now()) / (30.44 * 24 * 60 * 60 * 1000))
        : monthlyRate * 1.5;

      recommendations.push({
        title: 'Increase Monthly Savings',
        message: `Save ₹${Math.round(catchUpMonthly).toLocaleString('en-IN')}/month to get back on track`,
      });
      recommendations.push({
        title: 'Review Expenses',
        message: 'Look for categories where you can cut spending by 15-20%',
      });
    }
    if (pace === 'ahead') {
      recommendations.push({
        title: 'Great Progress!',
        message: 'Consider investing the surplus for better returns',
      });
    }

    return {
      goal: {
        name: goal.name || goal.title,
        targetAmount,
        currentSaved,
        progressPct: Math.round(progressPct * 10) / 10,
      },
      pace,
      paceScore,
      monthlyRate: Math.round(monthlyRate),
      projectedCompletion: monthlyRate > 0
        ? new Date(Date.now() + projectedMonthsToComplete * 30.44 * 24 * 60 * 60 * 1000)
        : null,
      elapsedMonths: Math.round(elapsedMonths * 10) / 10,
      recommendations,
    };
  }

  /**
   * Prioritize multiple goals
   */
  async prioritizeGoals(userId) {
    let goals;
    try {
      goals = await FinancialGoal.find({ userId, status: { $in: ['active', 'in_progress'] } }).lean();
    } catch {
      return { goals: [], message: 'Could not load goals' };
    }

    if (!goals || goals.length === 0) return { goals: [], message: 'No active goals found' };

    // Score each goal
    const scored = goals.map(g => {
      const target = g.targetAmount || g.target || 0;
      const current = g.currentAmount || g.saved || 0;
      const remaining = Math.max(0, target - current);
      const progress = target > 0 ? (current / target * 100) : 0;

      // Priority factors
      let urgencyScore = 50;
      if (g.targetDate) {
        const daysLeft = Math.max(0, (new Date(g.targetDate) - new Date()) / (24 * 60 * 60 * 1000));
        urgencyScore = daysLeft < 90 ? 90 : daysLeft < 180 ? 70 : daysLeft < 365 ? 50 : 30;
      }

      // Category priority
      const categoryPriority = {
        emergency: 95, debt_payoff: 90, education: 70, home: 60,
        retirement: 55, investment: 50, travel: 30, shopping: 20,
      };
      const catScore = categoryPriority[(g.category || '').toLowerCase()] || 40;

      // Near completion bonus
      const completionBonus = progress > 80 ? 15 : progress > 60 ? 10 : 0;

      const totalPriority = Math.round((urgencyScore * 0.4 + catScore * 0.3 + completionBonus + (g.priority === 'high' ? 20 : g.priority === 'critical' ? 30 : 0)) * 10) / 10;

      return {
        _id: g._id,
        name: g.name || g.title,
        category: g.category,
        targetAmount: target,
        currentAmount: current,
        progress: Math.round(progress),
        remaining: Math.round(remaining),
        targetDate: g.targetDate,
        priorityScore: totalPriority,
        urgencyScore,
        suggestedMonthly: null,
      };
    });

    // Sort by priority
    scored.sort((a, b) => b.priorityScore - a.priorityScore);

    return {
      goals: scored,
      topPriority: scored[0],
      totalRemaining: scored.reduce((s, g) => s + g.remaining, 0),
      goalCount: scored.length,
      strategy: scored.length > 3
        ? 'Focus on top 3 goals first, then redistribute funds as goals are completed.'
        : 'Balance contributions across all goals based on priority scores.',
    };
  }

  // ─── Private helpers ────────────────────────────────────────────
  _getStrategies(priority, idealMonthly, totalBudget) {
    const strategies = [];

    if (priority === 'critical' || priority === 'high') {
      strategies.push('Set up automatic monthly transfer on salary day');
      strategies.push('Reduce discretionary spending by 20% until goal is met');
    }

    if (idealMonthly > totalBudget * 0.3) {
      strategies.push('Consider a side income source to accelerate progress');
      strategies.push('Look for temporary expense cuts (subscriptions, dining out)');
    }

    strategies.push('Review progress weekly using the Goals dashboard');
    strategies.push('Celebrate milestones to maintain motivation');

    return strategies;
  }
}

module.exports = new FinancialGoalsAI();
