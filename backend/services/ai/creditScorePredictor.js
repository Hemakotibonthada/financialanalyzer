// ============================================================================
// CREDIT SCORE PREDICTOR — AI-Powered Credit Health Analysis
// ============================================================================
// Predicts credit score changes, simulates impact of financial decisions,
// provides improvement recommendations, and tracks credit health factors.
// Runs entirely locally using statistical models.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');

const sum = (a) => a.reduce((s, v) => s + v, 0);
const mean = (a) => (a.length ? sum(a) / a.length : 0);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ============================================================================
// §1  CREDIT FACTOR ANALYZER
// ============================================================================

class CreditFactorAnalyzer {
  constructor() {
    // CIBIL score range: 300-900
    this.scoreRange = { min: 300, max: 900 };
    this.idealScore = 750;

    // Factor weights (based on CIBIL methodology)
    this.factorWeights = {
      paymentHistory: 0.35,      // 35% — most important
      creditUtilization: 0.25,   // 25%
      creditAge: 0.15,           // 15%
      creditMix: 0.10,           // 10%
      recentInquiries: 0.10,     // 10%
      totalDebt: 0.05            // 5%
    };
  }

  analyzeFactors(financialData) {
    const factors = {};

    // Payment History (35%)
    factors.paymentHistory = this._analyzePaymentHistory(financialData);

    // Credit Utilization (25%)
    factors.creditUtilization = this._analyzeCreditUtilization(financialData);

    // Credit Age (15%)
    factors.creditAge = this._analyzeCreditAge(financialData);

    // Credit Mix (10%)
    factors.creditMix = this._analyzeCreditMix(financialData);

    // Recent Inquiries (10%)
    factors.recentInquiries = this._analyzeRecentInquiries(financialData);

    // Total Debt (5%)
    factors.totalDebt = this._analyzeTotalDebt(financialData);

    return factors;
  }

  _analyzePaymentHistory(data) {
    const { loans, creditCards, transactions } = data;
    let onTimePayments = 0;
    let totalPayments = 0;
    let missedPayments = 0;
    let latePayments = 0;

    // Analyze loan EMI payments
    if (loans) {
      for (const loan of loans) {
        const totalEMIs = loan.emiPaid || loan.totalRepaid ? Math.ceil((loan.totalRepaid || 0) / (loan.emiAmount || 1)) : 12;
        const missedEMIs = loan.missedPayments || 0;
        totalPayments += totalEMIs;
        onTimePayments += totalEMIs - missedEMIs;
        missedPayments += missedEMIs;
      }
    }

    // Analyze credit card payments
    if (creditCards) {
      for (const card of creditCards) {
        const total = card.totalPayments || 12;
        const missed = card.missedPayments || 0;
        const late = card.latePayments || 0;
        totalPayments += total;
        onTimePayments += total - missed - late;
        missedPayments += missed;
        latePayments += late;
      }
    }

    // Default to good history if no data
    if (totalPayments === 0) {
      totalPayments = 12;
      onTimePayments = 12;
    }

    const onTimeRate = totalPayments > 0 ? onTimePayments / totalPayments : 1;
    const score = clamp(onTimeRate * 100, 0, 100);

    return {
      score,
      weight: this.factorWeights.paymentHistory,
      weightedScore: score * this.factorWeights.paymentHistory,
      details: {
        totalPayments,
        onTimePayments,
        missedPayments,
        latePayments,
        onTimeRate: (onTimeRate * 100).toFixed(1) + '%'
      },
      rating: score >= 95 ? 'Excellent' : score >= 85 ? 'Good' : score >= 70 ? 'Fair' : 'Poor',
      recommendations: this._paymentRecommendations(onTimeRate, missedPayments)
    };
  }

  _analyzeCreditUtilization(data) {
    const { creditCards, loans } = data;
    let totalLimit = 0;
    let totalUsed = 0;

    if (creditCards) {
      for (const card of creditCards) {
        totalLimit += card.creditLimit || card.limit || 0;
        totalUsed += card.currentBalance || card.outstandingAmount || card.used || 0;
      }
    }

    // Add revolving credit from loans
    if (loans) {
      for (const loan of loans) {
        if (loan.loanType === 'credit_line' || loan.revolving) {
          totalLimit += loan.sanctionedAmount || loan.limit || 0;
          totalUsed += loan.outstandingAmount || loan.outstanding || 0;
        }
      }
    }

    const utilization = totalLimit > 0 ? totalUsed / totalLimit : 0;
    // Ideal: <30%, Good: <50%, Fair: <70%, Poor: >70%
    const score = utilization <= 0.30 ? 100 :
                  utilization <= 0.50 ? 80 :
                  utilization <= 0.70 ? 50 :
                  utilization <= 0.90 ? 25 : 10;

    return {
      score,
      weight: this.factorWeights.creditUtilization,
      weightedScore: score * this.factorWeights.creditUtilization,
      details: {
        totalCreditLimit: totalLimit,
        totalUtilized: totalUsed,
        utilizationRatio: (utilization * 100).toFixed(1) + '%'
      },
      rating: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor',
      recommendations: this._utilizationRecommendations(utilization, totalLimit, totalUsed)
    };
  }

  _analyzeCreditAge(data) {
    const { loans, creditCards } = data;
    let oldestAccountAge = 0; // months
    let avgAccountAge = 0;
    let accountCount = 0;
    const ages = [];

    const now = new Date();

    if (loans) {
      for (const loan of loans) {
        const startDate = new Date(loan.startDate || loan.disbursementDate || Date.now());
        const ageMonths = Math.max(0, (now - startDate) / (30 * 24 * 60 * 60 * 1000));
        ages.push(ageMonths);
        accountCount++;
      }
    }

    if (creditCards) {
      for (const card of creditCards) {
        const startDate = new Date(card.openDate || card.startDate || Date.now());
        const ageMonths = Math.max(0, (now - startDate) / (30 * 24 * 60 * 60 * 1000));
        ages.push(ageMonths);
        accountCount++;
      }
    }

    if (ages.length === 0) ages.push(12); // Default 1 year

    oldestAccountAge = Math.max(...ages);
    avgAccountAge = mean(ages);

    // Score based on average age
    const avgYears = avgAccountAge / 12;
    const score = avgYears >= 7 ? 100 :
                  avgYears >= 5 ? 85 :
                  avgYears >= 3 ? 65 :
                  avgYears >= 1 ? 40 : 20;

    return {
      score,
      weight: this.factorWeights.creditAge,
      weightedScore: score * this.factorWeights.creditAge,
      details: {
        oldestAccountMonths: Math.round(oldestAccountAge),
        oldestAccountYears: (oldestAccountAge / 12).toFixed(1),
        averageAccountMonths: Math.round(avgAccountAge),
        averageAccountYears: (avgAccountAge / 12).toFixed(1),
        totalAccounts: accountCount
      },
      rating: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor',
      recommendations: [
        avgYears < 3 ? 'Avoid closing old credit accounts — they boost your credit age.' : null,
        'Don\'t open too many new accounts at once — it lowers your average age.',
      ].filter(Boolean)
    };
  }

  _analyzeCreditMix(data) {
    const { loans, creditCards, investments } = data;
    const types = new Set();

    if (loans) {
      for (const loan of loans) {
        types.add(loan.loanType || loan.type || 'personal_loan');
      }
    }
    if (creditCards && creditCards.length > 0) types.add('credit_card');
    if (investments && investments.length > 0) types.add('investment_account');

    const diversity = types.size;
    const score = diversity >= 4 ? 100 :
                  diversity >= 3 ? 80 :
                  diversity >= 2 ? 55 :
                  diversity >= 1 ? 30 : 10;

    return {
      score,
      weight: this.factorWeights.creditMix,
      weightedScore: score * this.factorWeights.creditMix,
      details: {
        accountTypes: [...types],
        diversity
      },
      rating: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor',
      recommendations: [
        diversity < 3 ? 'A healthy mix of secured (home/car loan) and unsecured (credit card) credit improves your score.' : null,
        'Having both revolving (credit card) and installment (EMI) credit is ideal.'
      ].filter(Boolean)
    };
  }

  _analyzeRecentInquiries(data) {
    const inquiries = data.recentInquiries || data.hardInquiries || 0;
    const softInquiries = data.softInquiries || 0;

    // Only hard inquiries matter
    const score = inquiries === 0 ? 100 :
                  inquiries <= 2 ? 80 :
                  inquiries <= 4 ? 50 :
                  inquiries <= 6 ? 30 : 10;

    return {
      score,
      weight: this.factorWeights.recentInquiries,
      weightedScore: score * this.factorWeights.recentInquiries,
      details: {
        hardInquiries: inquiries,
        softInquiries,
        impact: inquiries > 2 ? 'negative' : 'minimal'
      },
      rating: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor',
      recommendations: [
        inquiries > 3 ? 'Avoid applying for new credit for 6 months to let inquiries age off.' : null,
        'Rate-shopping for the same product within 14 days counts as a single inquiry.',
        'Checking your own score (soft inquiry) does NOT affect your credit score.'
      ].filter(Boolean)
    };
  }

  _analyzeTotalDebt(data) {
    const { loans, monthlyIncome } = data;
    let totalDebt = 0;
    let monthlyEMI = 0;

    if (loans) {
      for (const loan of loans) {
        if (loan.status === 'active') {
          totalDebt += loan.outstandingAmount || loan.outstanding || loan.principalAmount || 0;
          monthlyEMI += loan.emiAmount || loan.emi || 0;
        }
      }
    }

    const income = monthlyIncome || 50000;
    const dti = income > 0 ? monthlyEMI / income : 0;

    const score = dti <= 0.20 ? 100 :
                  dti <= 0.30 ? 80 :
                  dti <= 0.40 ? 50 :
                  dti <= 0.50 ? 25 : 10;

    return {
      score,
      weight: this.factorWeights.totalDebt,
      weightedScore: score * this.factorWeights.totalDebt,
      details: {
        totalDebt,
        monthlyEMI,
        monthlyIncome: income,
        debtToIncome: (dti * 100).toFixed(1) + '%'
      },
      rating: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor',
      recommendations: this._debtRecommendations(dti, totalDebt)
    };
  }

  _paymentRecommendations(rate, missed) {
    const recs = [];
    if (missed > 0) recs.push(`You have ${missed} missed payment(s). Set up auto-pay for all EMIs and credit cards.`);
    if (rate < 0.95) recs.push('Even one missed payment stays on your report for 7 years. Prioritize on-time payments.');
    if (rate >= 0.95) recs.push('Excellent payment history! Keep maintaining 100% on-time payments.');
    return recs;
  }

  _utilizationRecommendations(util, limit, used) {
    const recs = [];
    if (util > 0.70) recs.push(`Utilization at ${(util * 100).toFixed(0)}% — pay down ₹${Math.round(used - limit * 0.30).toLocaleString()} to reach ideal 30%.`);
    else if (util > 0.30) recs.push(`Utilization at ${(util * 100).toFixed(0)}% — try to keep below 30% for optimal score.`);
    if (limit > 0) recs.push('Request credit limit increases periodically — it automatically reduces utilization.');
    return recs;
  }

  _debtRecommendations(dti, totalDebt) {
    const recs = [];
    if (dti > 0.40) recs.push(`DTI ratio is ${(dti * 100).toFixed(0)}% — risky. Focus on paying down highest-interest debt first.`);
    if (totalDebt > 0) recs.push('Consider debt consolidation if you have multiple high-interest loans.');
    return recs;
  }
}

// ============================================================================
// §2  CREDIT SCORE CALCULATOR
// ============================================================================

class CreditScoreCalculator {
  constructor() {
    this.factorAnalyzer = new CreditFactorAnalyzer();
  }

  calculateScore(financialData) {
    const factors = this.factorAnalyzer.analyzeFactors(financialData);

    // Calculate weighted total
    let weightedTotal = 0;
    for (const factor of Object.values(factors)) {
      weightedTotal += factor.weightedScore;
    }

    // Map to CIBIL range (300-900)
    const rawScore = weightedTotal; // 0-100
    const cibilScore = Math.round(300 + (rawScore / 100) * 600);
    const clampedScore = clamp(cibilScore, 300, 900);

    // Rating
    let rating, category;
    if (clampedScore >= 800) { rating = '🟢 Excellent'; category = 'excellent'; }
    else if (clampedScore >= 750) { rating = '🟢 Good'; category = 'good'; }
    else if (clampedScore >= 700) { rating = '🟡 Fair'; category = 'fair'; }
    else if (clampedScore >= 650) { rating = '🟠 Below Average'; category = 'below_average'; }
    else if (clampedScore >= 550) { rating = '🔴 Poor'; category = 'poor'; }
    else { rating = '🔴 Very Poor'; category = 'very_poor'; }

    // Impact summary
    const factorsSorted = Object.entries(factors)
      .sort((a, b) => a[1].score - b[1].score);
    const weakestFactor = factorsSorted[0];
    const strongestFactor = factorsSorted[factorsSorted.length - 1];

    // Collect all recommendations
    const allRecommendations = [];
    for (const [name, factor] of Object.entries(factors)) {
      for (const rec of factor.recommendations || []) {
        allRecommendations.push({
          factor: name,
          factorRating: factor.rating,
          recommendation: rec,
          priority: factor.score < 50 ? 'high' : factor.score < 70 ? 'medium' : 'low'
        });
      }
    }

    return {
      score: clampedScore,
      rating,
      category,
      rawScore: Math.round(rawScore),
      factors,
      weakestFactor: {
        name: weakestFactor[0],
        score: weakestFactor[1].score,
        rating: weakestFactor[1].rating
      },
      strongestFactor: {
        name: strongestFactor[0],
        score: strongestFactor[1].score,
        rating: strongestFactor[1].rating
      },
      recommendations: allRecommendations.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return (order[a.priority] || 2) - (order[b.priority] || 2);
      }),
      calculatedAt: new Date()
    };
  }
}

// ============================================================================
// §3  CREDIT SCORE SIMULATOR — What-If for Credit Decisions
// ============================================================================

class CreditScoreSimulator {
  constructor() {
    this.calculator = new CreditScoreCalculator();
  }

  simulate(currentData, scenario) {
    // Create modified data based on scenario
    const modifiedData = JSON.parse(JSON.stringify(currentData));

    switch (scenario.type) {
      case 'pay_off_card':
        return this._simulatePayOffCard(currentData, modifiedData, scenario);

      case 'new_loan':
        return this._simulateNewLoan(currentData, modifiedData, scenario);

      case 'missed_payment':
        return this._simulateMissedPayment(currentData, modifiedData, scenario);

      case 'close_account':
        return this._simulateCloseAccount(currentData, modifiedData, scenario);

      case 'increase_limit':
        return this._simulateIncreaseLimit(currentData, modifiedData, scenario);

      case 'pay_down_debt':
        return this._simulatePayDownDebt(currentData, modifiedData, scenario);

      default:
        return { error: 'Unknown scenario type' };
    }
  }

  simulateMultiple(currentData, scenarios) {
    const currentScore = this.calculator.calculateScore(currentData);
    const results = scenarios.map(scenario => {
      const result = this.simulate(currentData, scenario);
      return {
        scenario: scenario.description || scenario.type,
        ...result
      };
    });

    return {
      currentScore: currentScore.score,
      simulations: results.sort((a, b) => (b.newScore || 0) - (a.newScore || 0)),
      bestScenario: results.reduce((best, r) => (r.newScore || 0) > (best.newScore || 0) ? r : best, results[0]),
      worstScenario: results.reduce((worst, r) => (r.newScore || 0) < (worst.newScore || 0) ? r : worst, results[0])
    };
  }

  _simulatePayOffCard(current, modified, scenario) {
    const currentScore = this.calculator.calculateScore(current);

    if (modified.creditCards) {
      const cardIdx = modified.creditCards.findIndex(c =>
        c.name === scenario.cardName || c.id === scenario.cardId
      );
      if (cardIdx >= 0) {
        modified.creditCards[cardIdx].currentBalance = 0;
        modified.creditCards[cardIdx].outstandingAmount = 0;
      }
    }

    const newScore = this.calculator.calculateScore(modified);

    return {
      type: 'pay_off_card',
      currentScore: currentScore.score,
      newScore: newScore.score,
      change: newScore.score - currentScore.score,
      impact: newScore.score > currentScore.score ? 'positive' : 'neutral',
      explanation: `Paying off your credit card would improve utilization ratio, potentially increasing your score by ${Math.max(0, newScore.score - currentScore.score)} points.`
    };
  }

  _simulateNewLoan(current, modified, scenario) {
    const currentScore = this.calculator.calculateScore(current);

    if (!modified.loans) modified.loans = [];
    modified.loans.push({
      loanType: scenario.loanType || 'personal_loan',
      principalAmount: scenario.amount || 500000,
      outstandingAmount: scenario.amount || 500000,
      emiAmount: scenario.emi || 15000,
      status: 'active',
      startDate: new Date()
    });

    modified.recentInquiries = (modified.recentInquiries || 0) + 1;

    const newScore = this.calculator.calculateScore(modified);

    return {
      type: 'new_loan',
      currentScore: currentScore.score,
      newScore: newScore.score,
      change: newScore.score - currentScore.score,
      impact: newScore.score < currentScore.score ? 'negative' : 'neutral',
      explanation: `Taking a new loan of ₹${(scenario.amount || 500000).toLocaleString()} would increase your DTI ratio and add a hard inquiry, likely reducing your score by ${Math.abs(newScore.score - currentScore.score)} points initially. Score recovers with on-time payments.`
    };
  }

  _simulateMissedPayment(current, modified, scenario) {
    const currentScore = this.calculator.calculateScore(current);

    if (modified.loans && modified.loans.length > 0) {
      if (!modified.loans[0].missedPayments) modified.loans[0].missedPayments = 0;
      modified.loans[0].missedPayments += 1;
    }

    const newScore = this.calculator.calculateScore(modified);

    return {
      type: 'missed_payment',
      currentScore: currentScore.score,
      newScore: newScore.score,
      change: newScore.score - currentScore.score,
      impact: 'negative',
      explanation: `A single missed payment can drop your score by ${Math.abs(newScore.score - currentScore.score)} points and stays on your report for 7 years. Always set up auto-pay!`
    };
  }

  _simulateCloseAccount(current, modified, scenario) {
    const currentScore = this.calculator.calculateScore(current);

    if (modified.creditCards) {
      modified.creditCards = modified.creditCards.filter(c =>
        c.name !== scenario.cardName && c.id !== scenario.cardId
      );
    }

    const newScore = this.calculator.calculateScore(modified);

    return {
      type: 'close_account',
      currentScore: currentScore.score,
      newScore: newScore.score,
      change: newScore.score - currentScore.score,
      impact: newScore.score < currentScore.score ? 'negative' : 'neutral',
      explanation: `Closing a credit account reduces your total credit limit (increasing utilization) and may reduce your credit age. Expected impact: ${newScore.score - currentScore.score} points.`
    };
  }

  _simulateIncreaseLimit(current, modified, scenario) {
    const currentScore = this.calculator.calculateScore(current);

    if (modified.creditCards && modified.creditCards.length > 0) {
      modified.creditCards[0].creditLimit = (modified.creditCards[0].creditLimit || 100000) * 1.5;
      modified.creditCards[0].limit = modified.creditCards[0].creditLimit;
    }

    const newScore = this.calculator.calculateScore(modified);

    return {
      type: 'increase_limit',
      currentScore: currentScore.score,
      newScore: newScore.score,
      change: newScore.score - currentScore.score,
      impact: 'positive',
      explanation: `A 50% credit limit increase would reduce your utilization ratio, potentially improving your score by ${Math.max(0, newScore.score - currentScore.score)} points.`
    };
  }

  _simulatePayDownDebt(current, modified, scenario) {
    const currentScore = this.calculator.calculateScore(current);
    const payAmount = scenario.amount || 100000;

    if (modified.loans) {
      for (const loan of modified.loans) {
        if (loan.status === 'active') {
          const outstanding = loan.outstandingAmount || loan.outstanding || 0;
          const reduction = Math.min(payAmount, outstanding);
          loan.outstandingAmount = outstanding - reduction;
          loan.outstanding = loan.outstandingAmount;
          break;
        }
      }
    }

    const newScore = this.calculator.calculateScore(modified);

    return {
      type: 'pay_down_debt',
      currentScore: currentScore.score,
      newScore: newScore.score,
      change: newScore.score - currentScore.score,
      impact: 'positive',
      explanation: `Paying down ₹${payAmount.toLocaleString()} of debt would improve your DTI ratio, potentially boosting your score by ${Math.max(0, newScore.score - currentScore.score)} points.`
    };
  }
}

// ============================================================================
// §4  CREDIT HEALTH MONITOR
// ============================================================================

class CreditHealthMonitor {
  constructor() {
    this.calculator = new CreditScoreCalculator();
    this.history = {};
  }

  trackScore(userId, financialData) {
    const result = this.calculator.calculateScore(financialData);

    if (!this.history[userId]) this.history[userId] = [];
    this.history[userId].push({
      score: result.score,
      date: new Date(),
      factors: Object.fromEntries(
        Object.entries(result.factors).map(([k, v]) => [k, v.score])
      )
    });

    // Keep last 24 months
    if (this.history[userId].length > 24) this.history[userId].shift();

    // Add trend analysis
    result.trend = this._analyzeTrend(userId);
    result.monthlyChange = this._getMonthlyChange(userId);
    result.projectedScore = this._projectScore(userId);

    return result;
  }

  _analyzeTrend(userId) {
    const history = this.history[userId] || [];
    if (history.length < 2) return { direction: 'stable', change: 0 };

    const recent = history.slice(-3);
    const older = history.slice(-6, -3);

    if (older.length === 0) return { direction: 'stable', change: 0 };

    const recentAvg = mean(recent.map(h => h.score));
    const olderAvg = mean(older.map(h => h.score));
    const change = recentAvg - olderAvg;

    return {
      direction: change > 10 ? 'improving' : change < -10 ? 'declining' : 'stable',
      change: Math.round(change),
      recentAvg: Math.round(recentAvg),
      historicalAvg: Math.round(olderAvg)
    };
  }

  _getMonthlyChange(userId) {
    const history = this.history[userId] || [];
    if (history.length < 2) return 0;
    return history[history.length - 1].score - history[history.length - 2].score;
  }

  _projectScore(userId) {
    const history = this.history[userId] || [];
    if (history.length < 3) return null;

    const scores = history.map(h => h.score);
    const n = scores.length;

    // Simple linear projection
    const xMean = (n - 1) / 2;
    const yMean = mean(scores);
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (scores[i] - yMean);
      den += (i - xMean) ** 2;
    }
    const slope = den > 0 ? num / den : 0;
    const projected3m = Math.round(clamp(scores[n - 1] + slope * 3, 300, 900));
    const projected6m = Math.round(clamp(scores[n - 1] + slope * 6, 300, 900));

    return { threeMonth: projected3m, sixMonth: projected6m, trend: slope > 0 ? 'up' : 'down' };
  }

  getHistory(userId) {
    return this.history[userId] || [];
  }
}

// ============================================================================
// §5  UNIFIED CREDIT SCORE SERVICE
// ============================================================================

class CreditScoreService {
  constructor() {
    this.calculator = new CreditScoreCalculator();
    this.simulator = new CreditScoreSimulator();
    this.monitor = new CreditHealthMonitor();
  }

  getScore(userId, financialData) {
    return this.monitor.trackScore(userId, financialData);
  }

  simulateScenario(financialData, scenario) {
    return this.simulator.simulate(financialData, scenario);
  }

  simulateMultiple(financialData, scenarios) {
    return this.simulator.simulateMultiple(financialData, scenarios);
  }

  getScoreHistory(userId) {
    return this.monitor.getHistory(userId);
  }

  getImprovementPlan(financialData) {
    const score = this.calculator.calculateScore(financialData);
    const targetScore = Math.min(900, score.score + 100);

    const plan = {
      currentScore: score.score,
      targetScore,
      factors: score.factors,
      steps: [],
      estimatedTimeMonths: 0
    };

    // Prioritize improvements by impact
    const factorEntries = Object.entries(score.factors)
      .sort((a, b) => a[1].score - b[1].score);

    for (const [name, factor] of factorEntries) {
      if (factor.score >= 90) continue;

      const improvement = {
        factor: name,
        currentScore: factor.score,
        currentRating: factor.rating,
        weight: factor.weight,
        potentialImpact: Math.round((90 - factor.score) * factor.weight * 6),
        actions: factor.recommendations || [],
        timelineMonths: factor.score < 50 ? 6 : factor.score < 70 ? 3 : 1
      };

      plan.steps.push(improvement);
      plan.estimatedTimeMonths = Math.max(plan.estimatedTimeMonths, improvement.timelineMonths);
    }

    plan.steps.sort((a, b) => b.potentialImpact - a.potentialImpact);

    return plan;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  CreditFactorAnalyzer,
  CreditScoreCalculator,
  CreditScoreSimulator,
  CreditHealthMonitor,
  CreditScoreService
};
