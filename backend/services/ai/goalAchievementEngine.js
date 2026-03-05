// ============================================================================
// FINANCIAL GOAL ACHIEVEMENT ENGINE — Smart Goal Planning & Tracking
// ============================================================================
// AI-powered goal feasibility analysis, progress tracking, dynamic
// contribution optimization, milestone celebrations, and goal
// prioritization with trade-off analysis. Runs entirely locally.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');

const sum = (a) => a.reduce((s, v) => s + v, 0);
const mean = (a) => (a.length ? sum(a) / a.length : 0);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ============================================================================
// §1  GOAL FEASIBILITY ANALYZER
// ============================================================================

class GoalFeasibilityAnalyzer {
  constructor() {
    this.inflationRate = 0.06;
    this.defaultReturns = {
      conservative: 0.07,
      moderate: 0.10,
      aggressive: 0.14,
      equity: 0.12,
      debt: 0.07,
      hybrid: 0.09
    };
  }

  analyze(goal, userProfile = {}) {
    const {
      name, targetAmount, currentAmount = 0, deadline,
      priority = 'medium', category = 'general',
      monthlyContribution = 0, investmentType = 'moderate'
    } = goal;

    const { monthlyIncome = 50000, totalExpenses = 40000,
            existingCommitments = 0, riskTolerance = 'moderate' } = userProfile;

    const target = targetAmount || 0;
    const current = currentAmount || 0;
    const deadlineDate = deadline ? new Date(deadline) : new Date(Date.now() + 365 * 5 * 86400000);
    const monthsRemaining = Math.max(1, Math.round((deadlineDate - Date.now()) / (30 * 86400000)));
    const yearsRemaining = monthsRemaining / 12;

    // Inflation-adjusted target
    const inflatedTarget = target * Math.pow(1 + this.inflationRate, yearsRemaining);

    // Gap analysis
    const gap = Math.max(0, inflatedTarget - current);
    const progressPercent = inflatedTarget > 0 ? (current / inflatedTarget) * 100 : 0;

    // Required monthly contribution
    const returnRate = this.defaultReturns[investmentType] || this.defaultReturns.moderate;
    const monthlyReturn = returnRate / 12;

    // Future value of current savings
    const fvCurrent = current * Math.pow(1 + monthlyReturn, monthsRemaining);

    // Required SIP
    const annuityFactor = monthlyReturn > 0
      ? (Math.pow(1 + monthlyReturn, monthsRemaining) - 1) / monthlyReturn
      : monthsRemaining;
    const requiredSIP = Math.max(0, (inflatedTarget - fvCurrent) / annuityFactor);

    // Affordability check
    const availableForSavings = Math.max(0, monthlyIncome - totalExpenses - existingCommitments);
    const isAffordable = requiredSIP <= availableForSavings;
    const affordabilityRatio = availableForSavings > 0 ? requiredSIP / availableForSavings : Infinity;

    // Feasibility score (0-100)
    let feasibilityScore = 50;
    if (isAffordable) feasibilityScore += 25;
    if (progressPercent > 25) feasibilityScore += 10;
    if (monthsRemaining > 24) feasibilityScore += 10;
    if (requiredSIP < monthlyIncome * 0.2) feasibilityScore += 10;
    if (affordabilityRatio > 1) feasibilityScore -= (affordabilityRatio - 1) * 20;
    feasibilityScore = clamp(feasibilityScore, 0, 100);

    // Projected completion
    let projectedCompletionMonths = monthsRemaining;
    if (monthlyContribution > 0) {
      let balance = current;
      for (let m = 0; m < 600; m++) { // Max 50 years
        balance = balance * (1 + monthlyReturn) + monthlyContribution;
        if (balance >= inflatedTarget) {
          projectedCompletionMonths = m + 1;
          break;
        }
      }
    }

    // Risk of not achieving
    const riskLevel = feasibilityScore >= 70 ? 'low' :
                      feasibilityScore >= 40 ? 'medium' : 'high';

    // Alternative scenarios
    const alternatives = this._generateAlternatives(
      inflatedTarget, current, monthsRemaining, returnRate, requiredSIP,
      monthlyContribution, availableForSavings
    );

    return {
      goalName: name,
      category,
      priority,
      originalTarget: target,
      inflatedTarget: Math.round(inflatedTarget),
      currentAmount: current,
      gap: Math.round(gap),
      progressPercent: Math.round(progressPercent * 10) / 10,
      monthsRemaining,
      yearsRemaining: Math.round(yearsRemaining * 10) / 10,
      requiredMonthlySIP: Math.round(requiredSIP),
      currentMonthlySIP: monthlyContribution,
      sipShortfall: Math.max(0, Math.round(requiredSIP - monthlyContribution)),
      isAffordable,
      affordabilityRatio: Math.round(affordabilityRatio * 100) / 100,
      feasibilityScore: Math.round(feasibilityScore),
      riskLevel,
      investmentType,
      expectedReturn: (returnRate * 100).toFixed(1) + '%',
      projectedCompletionMonths,
      onTrack: monthlyContribution >= requiredSIP * 0.95,
      alternatives,
      milestones: this._generateMilestones(inflatedTarget, current, monthsRemaining),
      recommendation: this._getRecommendation(feasibilityScore, requiredSIP, monthlyContribution, isAffordable, riskLevel)
    };
  }

  _generateAlternatives(target, current, months, returnRate, requiredSIP, currentSIP, available) {
    const alternatives = [];

    // Extend deadline
    const extendedMonths = months + 12;
    const monthlyReturn = returnRate / 12;
    const extendedSIP = Math.max(0, (target - current * Math.pow(1 + monthlyReturn, extendedMonths)) /
      ((Math.pow(1 + monthlyReturn, extendedMonths) - 1) / monthlyReturn));

    if (extendedSIP < requiredSIP * 0.8) {
      alternatives.push({
        type: 'extend_deadline',
        description: `Extend by 12 months → SIP reduces to ₹${Math.round(extendedSIP).toLocaleString()}/mo`,
        newSIP: Math.round(extendedSIP),
        savings: Math.round(requiredSIP - extendedSIP)
      });
    }

    // Higher returns (more aggressive investment)
    const aggressiveReturn = Math.min(returnRate * 1.4, 0.16);
    const aggressiveMonthly = aggressiveReturn / 12;
    const aggressiveSIP = Math.max(0, (target - current * Math.pow(1 + aggressiveMonthly, months)) /
      ((Math.pow(1 + aggressiveMonthly, months) - 1) / aggressiveMonthly));

    if (aggressiveSIP < requiredSIP * 0.85) {
      alternatives.push({
        type: 'aggressive_investment',
        description: `Switch to aggressive (${(aggressiveReturn * 100).toFixed(0)}% returns) → SIP ₹${Math.round(aggressiveSIP).toLocaleString()}/mo`,
        newSIP: Math.round(aggressiveSIP),
        risk: 'Higher volatility'
      });
    }

    // Reduce target by 20%
    const reducedTarget = target * 0.8;
    const reducedSIP = Math.max(0, (reducedTarget - current * Math.pow(1 + monthlyReturn, months)) /
      ((Math.pow(1 + monthlyReturn, months) - 1) / monthlyReturn));

    alternatives.push({
      type: 'reduce_target',
      description: `Reduce target by 20% → SIP ₹${Math.round(reducedSIP).toLocaleString()}/mo`,
      newTarget: Math.round(reducedTarget),
      newSIP: Math.round(reducedSIP)
    });

    // Step-up SIP (10% annual increase)
    const stepUpSIP = requiredSIP * 0.7; // Start lower, increase annually
    alternatives.push({
      type: 'step_up_sip',
      description: `Start at ₹${Math.round(stepUpSIP).toLocaleString()}/mo, increase 10% annually`,
      startSIP: Math.round(stepUpSIP),
      annualIncrease: '10%'
    });

    return alternatives;
  }

  _generateMilestones(target, current, totalMonths) {
    const milestones = [
      { percent: 25, label: '25% — Quarter Way', amount: Math.round(target * 0.25) },
      { percent: 50, label: '50% — Halfway!', amount: Math.round(target * 0.50) },
      { percent: 75, label: '75% — Almost There', amount: Math.round(target * 0.75) },
      { percent: 90, label: '90% — Final Push', amount: Math.round(target * 0.90) },
      { percent: 100, label: '100% — Goal Achieved!', amount: Math.round(target) }
    ];

    const currentPercent = target > 0 ? (current / target) * 100 : 0;

    return milestones.map(m => ({
      ...m,
      achieved: currentPercent >= m.percent,
      projectedMonth: Math.round((m.percent / 100) * totalMonths),
      remaining: Math.max(0, m.amount - current)
    }));
  }

  _getRecommendation(score, required, current, affordable, risk) {
    if (score >= 80) return `On track! ${current > 0 ? 'Continue your SIP' : `Start a SIP of ₹${required.toLocaleString()}/month`}.`;
    if (score >= 60) return `Feasible with effort. ${affordable ? `Increase SIP to ₹${required.toLocaleString()}/mo.` : 'Consider extending the deadline or reducing the target.'}`;
    if (score >= 40) return `Challenging. Consider extending the deadline by 1-2 years or switching to higher-return investments.`;
    return `High risk of not achieving. Reassess the goal — either extend timeline significantly, reduce target, or increase income.`;
  }
}

// ============================================================================
// §2  MULTI-GOAL OPTIMIZER
// ============================================================================

class MultiGoalOptimizer {
  constructor() {
    this.analyzer = new GoalFeasibilityAnalyzer();
  }

  optimize(goals, userProfile = {}) {
    const { monthlyIncome = 50000, totalExpenses = 40000, existingCommitments = 0 } = userProfile;

    // Available budget for all goals
    const totalAvailable = Math.max(0, monthlyIncome - totalExpenses - existingCommitments);

    // Analyze each goal
    const analyzed = goals.map(g => this.analyzer.analyze(g, userProfile));

    // Sort by priority and urgency
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    analyzed.sort((a, b) => {
      const pDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      if (pDiff !== 0) return pDiff;
      return a.monthsRemaining - b.monthsRemaining; // Urgent first
    });

    // Allocate budget
    let remainingBudget = totalAvailable;
    const allocations = [];
    const tradeOffs = [];

    for (const goal of analyzed) {
      const allocation = Math.min(goal.requiredMonthlySIP, remainingBudget);
      const deficit = Math.max(0, goal.requiredMonthlySIP - allocation);
      remainingBudget -= allocation;

      const status = allocation >= goal.requiredMonthlySIP * 0.95 ? 'fully_funded' :
                     allocation > 0 ? 'partially_funded' : 'unfunded';

      allocations.push({
        goalName: goal.goalName,
        priority: goal.priority,
        requiredSIP: goal.requiredMonthlySIP,
        allocatedSIP: Math.round(allocation),
        deficit: Math.round(deficit),
        status,
        feasibility: goal.feasibilityScore,
        monthsRemaining: goal.monthsRemaining,
        progressPercent: goal.progressPercent
      });

      if (deficit > 0) {
        tradeOffs.push({
          goal: goal.goalName,
          shortfall: Math.round(deficit),
          impactIfDeferred: `Extending by ${Math.round(deficit / (goal.requiredMonthlySIP || 1) * goal.monthsRemaining * 0.3)} months`,
          suggestion: goal.alternatives[0]?.description || 'Consider reducing target'
        });
      }
    }

    // Summary
    const totalRequired = sum(analyzed.map(a => a.requiredMonthlySIP));
    const totalAllocated = sum(allocations.map(a => a.allocatedSIP));
    const fullyFunded = allocations.filter(a => a.status === 'fully_funded').length;
    const budgetUtilization = totalAvailable > 0 ? totalAllocated / totalAvailable : 0;

    return {
      goals: allocations,
      tradeOffs,
      summary: {
        totalGoals: goals.length,
        fullyFunded,
        partiallyFunded: allocations.filter(a => a.status === 'partially_funded').length,
        unfunded: allocations.filter(a => a.status === 'unfunded').length,
        totalRequired: Math.round(totalRequired),
        totalAvailable: Math.round(totalAvailable),
        totalAllocated: Math.round(totalAllocated),
        surplus: Math.round(Math.max(0, remainingBudget)),
        deficit: Math.round(Math.max(0, totalRequired - totalAvailable)),
        budgetUtilization: (budgetUtilization * 100).toFixed(0) + '%'
      },
      recommendation: totalRequired <= totalAvailable
        ? 'All goals are achievable within your current budget! Continue SIPs as allocated.'
        : `Budget shortfall of ₹${Math.round(totalRequired - totalAvailable).toLocaleString()}/mo. ${tradeOffs.length} goal(s) need adjustment.`,
      scenarioAnalysis: this._scenarioAnalysis(analyzed, totalAvailable)
    };
  }

  _scenarioAnalysis(analyzed, available) {
    return {
      optimistic: {
        label: 'If income increases 20%',
        additionalBudget: Math.round(available * 0.2),
        goalsFullyFundable: analyzed.filter(g => g.requiredMonthlySIP <= available * 1.2 / analyzed.length).length
      },
      conservative: {
        label: 'If expenses increase 10%',
        reducedBudget: Math.round(available * 0.9),
        impact: 'May need to defer lowest-priority goal'
      },
      bestCase: {
        label: 'With 15% annual returns',
        sipReduction: '~20% lower SIPs needed'
      }
    };
  }
}

// ============================================================================
// §3  GOAL PROGRESS TRACKER
// ============================================================================

class GoalProgressTracker {
  constructor() {
    this.history = {};
  }

  trackProgress(userId, goalId, progressData) {
    const key = `${userId}_${goalId}`;
    if (!this.history[key]) this.history[key] = [];

    this.history[key].push({
      date: new Date(),
      currentAmount: progressData.currentAmount || 0,
      contribution: progressData.contribution || 0,
      returns: progressData.returns || 0,
      milestone: progressData.milestone || null
    });

    // Keep last 60 entries (monthly for 5 years)
    if (this.history[key].length > 60) this.history[key].shift();

    return this._analyzeProgress(key, progressData);
  }

  _analyzeProgress(key, current) {
    const entries = this.history[key] || [];
    if (entries.length < 2) return { trend: 'insufficient_data', monthlyGrowth: 0 };

    const amounts = entries.map(e => e.currentAmount);
    const recentGrowth = amounts.length >= 2
      ? amounts[amounts.length - 1] - amounts[amounts.length - 2]
      : 0;

    const avgGrowth = mean(
      amounts.slice(1).map((a, i) => a - amounts[i])
    );

    const contributions = entries.map(e => e.contribution).filter(c => c > 0);
    const avgContribution = mean(contributions);

    // Acceleration
    const recentAmounts = amounts.slice(-3);
    const olderAmounts = amounts.slice(-6, -3);
    const isAccelerating = olderAmounts.length > 0
      ? mean(recentAmounts.map((a, i) => i > 0 ? a - recentAmounts[i - 1] : 0)) >
        mean(olderAmounts.map((a, i) => i > 0 ? a - olderAmounts[i - 1] : 0))
      : false;

    // Streak
    let streak = 0;
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].contribution > 0) streak++;
      else break;
    }

    return {
      trend: recentGrowth > avgGrowth * 1.1 ? 'accelerating' :
             recentGrowth > 0 ? 'growing' :
             recentGrowth < 0 ? 'declining' : 'flat',
      monthlyGrowth: Math.round(recentGrowth),
      avgMonthlyGrowth: Math.round(avgGrowth),
      avgContribution: Math.round(avgContribution),
      contributionStreak: streak,
      isAccelerating,
      totalContributed: sum(entries.map(e => e.contribution)),
      totalReturns: sum(entries.map(e => e.returns)),
      dataPoints: entries.length,
      motivation: this._getMotivation(streak, recentGrowth, amounts)
    };
  }

  _getMotivation(streak, growth, amounts) {
    if (streak >= 12) return '🔥 12+ months streak! Incredible discipline!';
    if (streak >= 6) return '💪 6-month streak! You\'re building great habits!';
    if (streak >= 3) return '👍 3-month streak! Keep the momentum!';
    if (growth > 0) return '📈 Growing! Every contribution counts.';
    return '🎯 Start contributing today — even ₹500 matters.';
  }

  getHistory(userId, goalId) {
    return this.history[`${userId}_${goalId}`] || [];
  }
}

// ============================================================================
// §4  GOAL RECOMMENDATION ENGINE
// ============================================================================

class GoalRecommendationEngine {
  suggestGoals(userProfile) {
    const { age = 30, monthlyIncome = 50000, existingGoals = [], hasEmergencyFund = false,
            hasInsurance = false, hasRetirementPlan = false, hasKids = false } = userProfile;

    const suggestions = [];

    // Emergency fund (always #1 if not present)
    if (!hasEmergencyFund && !existingGoals.some(g => (g.name || '').toLowerCase().includes('emergency'))) {
      suggestions.push({
        name: 'Emergency Fund',
        targetAmount: monthlyIncome * 6,
        deadline: this._dateFromNow(12),
        priority: 'critical',
        category: 'safety',
        reason: 'Safety net covering 6 months of income',
        investmentType: 'conservative',
        monthlyContribution: Math.round(monthlyIncome * 6 / 12)
      });
    }

    // Term insurance
    if (!hasInsurance && age < 55) {
      suggestions.push({
        name: 'Term Life Insurance',
        targetAmount: monthlyIncome * 12 * 15,
        priority: 'critical',
        category: 'insurance',
        reason: 'Cover 15x annual income for family protection',
        investmentType: 'insurance',
        note: 'Not an investment goal — buy term plan immediately'
      });
    }

    // Retirement (if under 55 and no plan)
    if (!hasRetirementPlan && age < 55) {
      const yearsToRetire = Math.max(55 - age, 10);
      const monthlyExpenseAtRetirement = (monthlyIncome * 0.6) * Math.pow(1.06, yearsToRetire);
      const requiredCorpus = monthlyExpenseAtRetirement * 12 * 25;

      suggestions.push({
        name: 'Retirement Corpus',
        targetAmount: Math.round(requiredCorpus),
        deadline: this._dateFromNow(yearsToRetire * 12),
        priority: 'high',
        category: 'retirement',
        reason: `₹${Math.round(requiredCorpus / 10000000).toFixed(0)} Cr needed for ${Math.round(85 - 55)} years of retirement`,
        investmentType: age < 40 ? 'aggressive' : 'moderate'
      });
    }

    // Child education (if has kids)
    if (hasKids) {
      suggestions.push({
        name: 'Child Education Fund',
        targetAmount: 3000000,
        deadline: this._dateFromNow(15 * 12),
        priority: 'high',
        category: 'education',
        reason: 'Engineering/medical education costs ₹20-40L in 15 years',
        investmentType: 'moderate'
      });
    }

    // Vacation fund
    if (monthlyIncome > 40000 && !existingGoals.some(g => (g.name || '').toLowerCase().includes('vacation'))) {
      suggestions.push({
        name: 'Annual Vacation Fund',
        targetAmount: monthlyIncome * 2,
        deadline: this._dateFromNow(12),
        priority: 'low',
        category: 'lifestyle',
        reason: 'Budget 2 months income for annual vacation without guilt',
        investmentType: 'conservative'
      });
    }

    // Home down payment
    if (age < 40 && monthlyIncome > 60000 && !existingGoals.some(g => (g.name || '').toLowerCase().includes('house'))) {
      suggestions.push({
        name: 'Home Down Payment',
        targetAmount: monthlyIncome * 12 * 3,
        deadline: this._dateFromNow(5 * 12),
        priority: 'medium',
        category: 'real_estate',
        reason: '20% down payment for a home',
        investmentType: 'moderate'
      });
    }

    // Car fund
    if (monthlyIncome > 50000 && !existingGoals.some(g => (g.name || '').toLowerCase().includes('car'))) {
      suggestions.push({
        name: 'New Car Fund',
        targetAmount: monthlyIncome * 10,
        deadline: this._dateFromNow(3 * 12),
        priority: 'low',
        category: 'vehicle',
        reason: 'Save for car instead of taking a loan — save ₹1-2L in interest',
        investmentType: 'conservative'
      });
    }

    // Wealth building
    if (monthlyIncome > 100000) {
      suggestions.push({
        name: 'Wealth Building (₹1 Cr)',
        targetAmount: 10000000,
        deadline: this._dateFromNow(10 * 12),
        priority: 'medium',
        category: 'wealth',
        reason: 'First crore milestone — the hardest but most important',
        investmentType: 'aggressive'
      });
    }

    return {
      suggestions: suggestions.filter(s =>
        !existingGoals.some(g => g.name === s.name)
      ),
      existingGoals: existingGoals.length,
      totalSuggested: suggestions.length,
      topPriority: suggestions.find(s => s.priority === 'critical') || suggestions[0] || null
    };
  }

  _dateFromNow(months) {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  }
}

// ============================================================================
// §5  UNIFIED GOAL ACHIEVEMENT SERVICE
// ============================================================================

class GoalAchievementService {
  constructor() {
    this.feasibilityAnalyzer = new GoalFeasibilityAnalyzer();
    this.multiGoalOptimizer = new MultiGoalOptimizer();
    this.progressTracker = new GoalProgressTracker();
    this.recommendationEngine = new GoalRecommendationEngine();
  }

  analyzeGoal(goal, userProfile) {
    return this.feasibilityAnalyzer.analyze(goal, userProfile);
  }

  optimizeMultipleGoals(goals, userProfile) {
    return this.multiGoalOptimizer.optimize(goals, userProfile);
  }

  trackProgress(userId, goalId, progressData) {
    return this.progressTracker.trackProgress(userId, goalId, progressData);
  }

  getProgressHistory(userId, goalId) {
    return this.progressTracker.getHistory(userId, goalId);
  }

  suggestNewGoals(userProfile) {
    return this.recommendationEngine.suggestGoals(userProfile);
  }

  getComprehensiveAnalysis(goals, userProfile) {
    const optimization = this.multiGoalOptimizer.optimize(goals, userProfile);
    const suggestions = this.recommendationEngine.suggestGoals({
      ...userProfile,
      existingGoals: goals
    });

    return {
      optimization,
      suggestions,
      overallHealth: {
        goalsCount: goals.length,
        fullyFunded: optimization.summary.fullyFunded,
        averageFeasibility: Math.round(mean(
          optimization.goals.map(g => g.feasibility)
        )),
        totalMonthlyInvestment: optimization.summary.totalAllocated,
        investmentToIncomeRatio: userProfile.monthlyIncome > 0
          ? ((optimization.summary.totalAllocated / userProfile.monthlyIncome) * 100).toFixed(0) + '%'
          : 'N/A'
      },
      generatedAt: new Date()
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  GoalFeasibilityAnalyzer,
  MultiGoalOptimizer,
  GoalProgressTracker,
  GoalRecommendationEngine,
  GoalAchievementService
};
