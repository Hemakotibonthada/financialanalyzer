// ============================================================================
// FINANCIAL WELLNESS ENGINE — Holistic Financial Well-Being Assessment
// ============================================================================
// Comprehensive financial wellness scoring across 8 dimensions: income
// stability, expense management, savings health, debt fitness, investment
// maturity, risk preparedness, goal alignment, and behavioral health.
// Generates personalized action plans. Runs entirely locally.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');

const sum = (a) => a.reduce((s, v) => s + v, 0);
const mean = (a) => (a.length ? sum(a) / a.length : 0);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ============================================================================
// §1  WELLNESS DIMENSIONS
// ============================================================================

class WellnessDimensionScorer {
  constructor() {
    this.dimensions = {
      incomeStability: { weight: 0.15, name: 'Income Stability', icon: '💰' },
      expenseManagement: { weight: 0.15, name: 'Expense Management', icon: '📊' },
      savingsHealth: { weight: 0.15, name: 'Savings Health', icon: '🐖' },
      debtFitness: { weight: 0.15, name: 'Debt Fitness', icon: '🏦' },
      investmentMaturity: { weight: 0.10, name: 'Investment Maturity', icon: '📈' },
      riskPreparedness: { weight: 0.10, name: 'Risk Preparedness', icon: '🛡️' },
      goalAlignment: { weight: 0.10, name: 'Goal Alignment', icon: '🎯' },
      behavioralHealth: { weight: 0.10, name: 'Behavioral Health', icon: '🧠' }
    };
  }

  scoreIncomeStability(data) {
    const { transactions = [], monthlyIncome = 0 } = data;
    const incomes = transactions.filter(t => t.type === 'income');

    if (incomes.length < 3 || monthlyIncome === 0) {
      return { score: 50, details: 'Insufficient income data', factors: {} };
    }

    const amounts = incomes.map(t => Math.abs(t.amount || 0));
    const cv = amounts.length > 1
      ? Math.sqrt(mean(amounts.map(a => (a - mean(amounts)) ** 2))) / (mean(amounts) || 1)
      : 0.5;

    const sources = new Set(incomes.map(t => (t.description || t.category || '').toLowerCase().trim()));
    const diversification = Math.min(100, sources.size * 25);

    // Trend analysis
    const mid = Math.floor(amounts.length / 2);
    const recentAvg = mean(amounts.slice(mid));
    const olderAvg = mean(amounts.slice(0, mid));
    const trend = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;

    let score = 50;
    // Stability (low CV = good)
    if (cv < 0.05) score += 25;
    else if (cv < 0.15) score += 15;
    else if (cv < 0.30) score += 5;
    else score -= 10;

    // Multiple sources
    if (sources.size >= 3) score += 15;
    else if (sources.size >= 2) score += 8;

    // Positive trend
    if (trend > 0.05) score += 10;
    else if (trend < -0.10) score -= 10;

    return {
      score: clamp(score, 0, 100),
      details: `${sources.size} income source(s), ${cv < 0.15 ? 'stable' : 'variable'} amounts`,
      factors: {
        variability: (cv * 100).toFixed(1) + '%',
        sources: sources.size,
        trend: trend > 0.05 ? 'growing' : trend < -0.05 ? 'declining' : 'stable',
        diversification
      }
    };
  }

  scoreExpenseManagement(data) {
    const { transactions = [], monthlyIncome = 50000, budgets = [] } = data;
    const expenses = transactions.filter(t => t.type === 'expense');

    if (expenses.length < 10) {
      return { score: 50, details: 'Insufficient expense data', factors: {} };
    }

    const amounts = expenses.map(t => Math.abs(t.amount || 0));
    const totalExpense = sum(amounts);
    const months = Math.max(1, new Set(transactions.map(t =>
      new Date(t.date || 0).toISOString().substring(0, 7)
    )).size);
    const monthlyExpense = totalExpense / months;
    const expenseRatio = monthlyIncome > 0 ? monthlyExpense / monthlyIncome : 1;

    // Budget adherence
    let budgetScore = 0;
    if (budgets.length > 0) {
      const onBudget = budgets.filter(b => (b.spent || 0) <= (b.limit || b.amount || Infinity));
      budgetScore = (onBudget.length / budgets.length) * 30;
    }

    // Category balance
    const categories = {};
    for (const t of expenses) {
      const cat = t.category || 'unknown';
      categories[cat] = (categories[cat] || 0) + Math.abs(t.amount || 0);
    }
    const catCount = Object.keys(categories).length;
    const maxCatPct = totalExpense > 0
      ? Math.max(...Object.values(categories)) / totalExpense
      : 0;

    let score = 50;
    // Expense ratio (lower is better)
    if (expenseRatio <= 0.60) score += 25;
    else if (expenseRatio <= 0.75) score += 15;
    else if (expenseRatio <= 0.85) score += 5;
    else if (expenseRatio > 0.95) score -= 15;

    score += budgetScore;

    // Category concentration
    if (maxCatPct > 0.5) score -= 5;
    if (catCount >= 5) score += 5;

    return {
      score: clamp(score, 0, 100),
      details: `${(expenseRatio * 100).toFixed(0)}% of income spent, ${catCount} categories`,
      factors: {
        expenseToIncomeRatio: (expenseRatio * 100).toFixed(1) + '%',
        monthlyExpense: Math.round(monthlyExpense),
        budgetsOnTrack: budgets.filter(b => (b.spent || 0) <= (b.limit || Infinity)).length,
        totalBudgets: budgets.length,
        categoryCount: catCount,
        topCategoryShare: (maxCatPct * 100).toFixed(0) + '%'
      }
    };
  }

  scoreSavingsHealth(data) {
    const { savingsRate = 0, emergencyFundMonths = 0, monthlyIncome = 50000 } = data;

    let score = 0;

    // Savings rate (20% = excellent)
    if (savingsRate >= 0.30) score += 40;
    else if (savingsRate >= 0.20) score += 30;
    else if (savingsRate >= 0.10) score += 15;
    else if (savingsRate > 0) score += 5;

    // Emergency fund (6 months = excellent)
    if (emergencyFundMonths >= 12) score += 35;
    else if (emergencyFundMonths >= 6) score += 25;
    else if (emergencyFundMonths >= 3) score += 15;
    else if (emergencyFundMonths >= 1) score += 5;

    // Automation bonus (assumed from consistency)
    score += 10; // Base for having savings at all

    // Growth trajectory
    score += Math.min(15, savingsRate * 50);

    return {
      score: clamp(score, 0, 100),
      details: `${(savingsRate * 100).toFixed(0)}% savings rate, ${emergencyFundMonths.toFixed(1)}mo emergency fund`,
      factors: {
        savingsRate: (savingsRate * 100).toFixed(1) + '%',
        emergencyFundMonths: emergencyFundMonths.toFixed(1),
        monthlyExpense: Math.round(monthlyIncome * (1 - savingsRate)),
        targetSavingsRate: '20%',
        targetEmergencyMonths: 6
      }
    };
  }

  scoreDebtFitness(data) {
    const { loans = [], monthlyIncome = 50000 } = data;
    const activeLoans = loans.filter(l => l.status === 'active');

    if (activeLoans.length === 0) {
      return {
        score: 90, details: 'No active debt — excellent!',
        factors: { activeLoans: 0, totalEMI: 0, debtToIncome: '0%' }
      };
    }

    const totalEMI = sum(activeLoans.map(l => l.emiAmount || l.emi || 0));
    const totalOutstanding = sum(activeLoans.map(l => l.outstandingAmount || l.outstanding || 0));
    const dti = monthlyIncome > 0 ? totalEMI / monthlyIncome : 0;
    const highInterestDebt = activeLoans.filter(l => (l.interestRate || l.rate || 0) > 0.15);

    let score = 50;
    if (dti <= 0.20) score += 30;
    else if (dti <= 0.30) score += 20;
    else if (dti <= 0.40) score += 5;
    else score -= 15;

    if (activeLoans.length <= 2) score += 10;
    else if (activeLoans.length > 4) score -= 10;

    if (highInterestDebt.length === 0) score += 10;
    else score -= highInterestDebt.length * 5;

    return {
      score: clamp(score, 0, 100),
      details: `${activeLoans.length} loan(s), DTI ${(dti * 100).toFixed(0)}%`,
      factors: {
        activeLoans: activeLoans.length,
        totalEMI: Math.round(totalEMI),
        totalOutstanding: Math.round(totalOutstanding),
        debtToIncome: (dti * 100).toFixed(1) + '%',
        highInterestCount: highInterestDebt.length
      }
    };
  }

  scoreInvestmentMaturity(data) {
    const { investments = [], monthlyIncome = 50000 } = data;

    if (investments.length === 0) {
      return { score: 20, details: 'No investments', factors: { count: 0 } };
    }

    const totalInvested = sum(investments.map(i => i.investedAmount || i.invested || 0));
    const totalValue = sum(investments.map(i => i.currentValue || i.value || 0));
    const diversity = new Set(investments.map(i => i.type || i.assetClass)).size;
    const annualIncome = monthlyIncome * 12;
    const investmentRatio = annualIncome > 0 ? totalInvested / annualIncome : 0;

    let score = 30;
    if (investmentRatio >= 2) score += 25;
    else if (investmentRatio >= 1) score += 15;
    else if (investmentRatio >= 0.5) score += 8;

    if (diversity >= 4) score += 20;
    else if (diversity >= 3) score += 12;
    else if (diversity >= 2) score += 6;

    if (totalValue > totalInvested) score += 15;
    else if (totalValue === totalInvested) score += 5;

    return {
      score: clamp(score, 0, 100),
      details: `${investments.length} holdings, ${diversity} asset classes`,
      factors: {
        holdings: investments.length,
        assetClasses: diversity,
        totalInvested: Math.round(totalInvested),
        currentValue: Math.round(totalValue),
        returns: totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested * 100).toFixed(1) + '%' : '0%',
        investmentRatio: (investmentRatio * 100).toFixed(0) + '%'
      }
    };
  }

  scoreRiskPreparedness(data) {
    const { hasLifeInsurance = false, hasHealthInsurance = false,
            emergencyFundMonths = 0, hasWill = false } = data;

    let score = 0;
    if (hasLifeInsurance) score += 30;
    if (hasHealthInsurance) score += 30;
    if (emergencyFundMonths >= 6) score += 20;
    else if (emergencyFundMonths >= 3) score += 10;
    if (hasWill) score += 10;
    score += 10; // Base — awareness of risk

    return {
      score: clamp(score, 0, 100),
      details: `${[hasLifeInsurance && 'Life', hasHealthInsurance && 'Health'].filter(Boolean).join('+')} insurance`,
      factors: {
        lifeInsurance: hasLifeInsurance ? 'Yes' : 'No',
        healthInsurance: hasHealthInsurance ? 'Yes' : 'No',
        emergencyFund: emergencyFundMonths >= 6 ? 'Adequate' : 'Insufficient',
        estatePlanning: hasWill ? 'Done' : 'Pending'
      }
    };
  }

  scoreGoalAlignment(data) {
    const { goals = [] } = data;

    if (goals.length === 0) {
      return { score: 30, details: 'No financial goals set', factors: { goalCount: 0 } };
    }

    const progress = goals.map(g => {
      const target = g.targetAmount || g.target || 0;
      const current = g.currentAmount || g.saved || 0;
      return target > 0 ? current / target : 0;
    });

    const avgProgress = mean(progress);
    const goalsOnTrack = progress.filter(p => p >= 0.4).length;

    let score = 30; // Base for having goals
    score += Math.min(30, avgProgress * 50);
    score += Math.min(20, goals.length * 5);
    score += (goalsOnTrack / goals.length) * 20;

    return {
      score: clamp(score, 0, 100),
      details: `${goals.length} goal(s), avg ${(avgProgress * 100).toFixed(0)}% complete`,
      factors: {
        goalCount: goals.length,
        averageProgress: (avgProgress * 100).toFixed(0) + '%',
        goalsOnTrack,
        goalsAtRisk: goals.length - goalsOnTrack
      }
    };
  }

  scoreBehavioralHealth(data) {
    const { transactions = [] } = data;
    const expenses = transactions.filter(t => t.type === 'expense');

    if (expenses.length < 20) {
      return { score: 50, details: 'Insufficient data', factors: {} };
    }

    const amounts = expenses.map(t => Math.abs(t.amount || 0));

    // Late-night spending
    const lateNight = expenses.filter(t => {
      const h = new Date(t.date || Date.now()).getHours();
      return h >= 22 || h < 5;
    });
    const lateNightRatio = lateNight.length / expenses.length;

    // Weekend spending ratio
    const weekendTxns = expenses.filter(t => {
      const d = new Date(t.date || 0).getDay();
      return d === 0 || d === 6;
    });
    const weekendRatio = weekendTxns.length / (expenses.length || 1);

    // Spending consistency (lower CV = more disciplined)
    const dailyTotals = {};
    for (const t of expenses) {
      const d = new Date(t.date || 0).toISOString().split('T')[0];
      dailyTotals[d] = (dailyTotals[d] || 0) + Math.abs(t.amount || 0);
    }
    const dailyValues = Object.values(dailyTotals);
    const spendCV = dailyValues.length > 1
      ? Math.sqrt(mean(dailyValues.map(v => (v - mean(dailyValues)) ** 2))) / (mean(dailyValues) || 1)
      : 0;

    let score = 60;
    if (lateNightRatio > 0.15) score -= 15;
    else if (lateNightRatio < 0.05) score += 10;

    if (weekendRatio > 0.4) score -= 10;
    else if (weekendRatio < 0.3) score += 5;

    if (spendCV < 0.5) score += 15;
    else if (spendCV > 1.5) score -= 15;

    return {
      score: clamp(score, 0, 100),
      details: `${(lateNightRatio * 100).toFixed(0)}% late-night, ${(spendCV * 100).toFixed(0)}% volatility`,
      factors: {
        lateNightRatio: (lateNightRatio * 100).toFixed(1) + '%',
        weekendRatio: (weekendRatio * 100).toFixed(1) + '%',
        spendingVolatility: (spendCV * 100).toFixed(0) + '%',
        consistency: spendCV < 0.5 ? 'High' : spendCV < 1 ? 'Medium' : 'Low'
      }
    };
  }
}

// ============================================================================
// §2  WELLNESS ASSESSMENT SERVICE
// ============================================================================

class FinancialWellnessService {
  constructor() {
    this.scorer = new WellnessDimensionScorer();
  }

  assess(data) {
    const scorer = this.scorer;
    const dimensions = scorer.dimensions;

    // Score all dimensions
    const scores = {
      incomeStability: scorer.scoreIncomeStability(data),
      expenseManagement: scorer.scoreExpenseManagement(data),
      savingsHealth: scorer.scoreSavingsHealth(data),
      debtFitness: scorer.scoreDebtFitness(data),
      investmentMaturity: scorer.scoreInvestmentMaturity(data),
      riskPreparedness: scorer.scoreRiskPreparedness(data),
      goalAlignment: scorer.scoreGoalAlignment(data),
      behavioralHealth: scorer.scoreBehavioralHealth(data)
    };

    // Weighted overall score
    let overallScore = 0;
    for (const [key, result] of Object.entries(scores)) {
      overallScore += result.score * (dimensions[key]?.weight || 0.125);
    }
    overallScore = Math.round(overallScore);

    // Rating
    let rating, emoji;
    if (overallScore >= 80) { rating = 'Excellent'; emoji = '🌟'; }
    else if (overallScore >= 65) { rating = 'Good'; emoji = '👍'; }
    else if (overallScore >= 50) { rating = 'Fair'; emoji = '⚡'; }
    else if (overallScore >= 35) { rating = 'Needs Work'; emoji = '⚠️'; }
    else { rating = 'Critical'; emoji = '🚨'; }

    // Top strengths and weaknesses
    const sorted = Object.entries(scores).sort((a, b) => b[1].score - a[1].score);
    const strengths = sorted.slice(0, 3).map(([key, s]) => ({
      dimension: dimensions[key]?.name || key,
      icon: dimensions[key]?.icon || '',
      score: s.score,
      detail: s.details
    }));
    const weaknesses = sorted.slice(-3).reverse().map(([key, s]) => ({
      dimension: dimensions[key]?.name || key,
      icon: dimensions[key]?.icon || '',
      score: s.score,
      detail: s.details
    }));

    // Action plan
    const actionPlan = this._generateActionPlan(scores, dimensions);

    // Peer comparison text
    const peerComparison = overallScore >= 70
      ? 'You\'re doing better than 75% of people in your age/income bracket!'
      : overallScore >= 50
        ? 'You\'re about average. Small improvements can make a big difference.'
        : 'There\'s significant room for improvement. Focus on the weakest areas first.';

    return {
      overallScore,
      rating,
      emoji,
      dimensions: Object.fromEntries(
        Object.entries(scores).map(([key, s]) => [
          key,
          {
            name: dimensions[key]?.name || key,
            icon: dimensions[key]?.icon || '',
            weight: dimensions[key]?.weight || 0.125,
            score: s.score,
            details: s.details,
            factors: s.factors
          }
        ])
      ),
      strengths,
      weaknesses,
      actionPlan,
      peerComparison,
      assessedAt: new Date(),
      nextAssessment: 'Review in 1 month for updated scores'
    };
  }

  _generateActionPlan(scores, dimensions) {
    const actions = [];
    const sorted = Object.entries(scores).sort((a, b) => a[1].score - b[1].score);

    for (const [key, result] of sorted.slice(0, 4)) {
      if (result.score >= 80) continue;

      const action = this._getActionForDimension(key, result);
      if (action) {
        actions.push({
          dimension: dimensions[key]?.name || key,
          icon: dimensions[key]?.icon || '',
          currentScore: result.score,
          targetScore: Math.min(100, result.score + 20),
          ...action,
          estimatedTimeWeeks: result.score < 40 ? 12 : result.score < 60 ? 8 : 4
        });
      }
    }

    return actions;
  }

  _getActionForDimension(key, result) {
    const actions = {
      incomeStability: {
        action: 'Diversify income sources',
        steps: ['Start a side hustle or freelance work', 'Build passive income through investments', 'Negotiate salary or seek better opportunities'],
        impact: 'high'
      },
      expenseManagement: {
        action: 'Optimize spending habits',
        steps: ['Set category-wise budgets', 'Track expenses daily for 30 days', 'Cut subscriptions/services you don\'t use', 'Use 24-hour rule for non-essential purchases'],
        impact: 'high'
      },
      savingsHealth: {
        action: 'Boost savings rate',
        steps: ['Automate savings on payday', 'Target 20% savings rate', 'Build 6-month emergency fund in liquid mutual fund'],
        impact: 'high'
      },
      debtFitness: {
        action: 'Reduce debt burden',
        steps: ['List all debts by interest rate', 'Pay off highest-rate debt first (avalanche)', 'Consider consolidation for multiple loans', 'Avoid new debt for 6 months'],
        impact: 'medium'
      },
      investmentMaturity: {
        action: 'Grow investment portfolio',
        steps: ['Start SIP in index fund (₹500 minimum)', 'Diversify across equity, debt, gold', 'Maximize 80C with ELSS', 'Review portfolio quarterly'],
        impact: 'medium'
      },
      riskPreparedness: {
        action: 'Close risk gaps',
        steps: ['Get term life insurance (10-15x income)', 'Get health insurance (₹10L minimum)', 'Build emergency fund to 6 months', 'Create/update will and nominations'],
        impact: 'critical'
      },
      goalAlignment: {
        action: 'Set and track financial goals',
        steps: ['Define 3-5 specific financial goals with deadlines', 'Calculate required monthly SIP for each', 'Set up auto-debit for goal SIPs', 'Review progress monthly'],
        impact: 'medium'
      },
      behavioralHealth: {
        action: 'Improve financial habits',
        steps: ['Avoid late-night shopping', 'Set weekly spending limits', 'Wait 48 hours before non-essential purchases over ₹1000', 'Review spending patterns weekly'],
        impact: 'medium'
      }
    };

    return actions[key] || null;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  WellnessDimensionScorer,
  FinancialWellnessService
};
