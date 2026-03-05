// ============================================================================
// PEER COMPARISON ENGINE — Anonymous Financial Benchmarking
// ============================================================================
// Compares user financial metrics against synthetic peer cohorts based on
// income bracket, age, location, and household size. Generates percentile
// rankings and actionable comparison insights. Runs entirely locally.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');

const sum = (a) => a.reduce((s, v) => s + v, 0);
const mean = (a) => (a.length ? sum(a) / a.length : 0);

// ============================================================================
// §1  PEER COHORT GENERATOR — Synthetic Benchmark Data
// ============================================================================

class PeerCohortGenerator {
  constructor() {
    // Indian financial benchmarks by income bracket (monthly)
    this.benchmarks = {
      '0-25k': {
        label: 'Lower Income',
        incomeRange: [15000, 25000],
        avgSavingsRate: 0.08,
        avgRent: 0.35,
        avgFood: 0.25,
        avgTransport: 0.12,
        avgUtilities: 0.10,
        avgEntertainment: 0.05,
        avgHealthcare: 0.03,
        avgInsurance: 0.01,
        avgInvestmentRate: 0.02,
        avgEmergencyFundMonths: 1.5,
        avgDebtToIncome: 0.15,
        avgCreditScore: 680,
        avgFinancialGoals: 1
      },
      '25k-50k': {
        label: 'Lower Middle',
        incomeRange: [25000, 50000],
        avgSavingsRate: 0.12,
        avgRent: 0.30,
        avgFood: 0.20,
        avgTransport: 0.10,
        avgUtilities: 0.08,
        avgEntertainment: 0.07,
        avgHealthcare: 0.04,
        avgInsurance: 0.03,
        avgInvestmentRate: 0.05,
        avgEmergencyFundMonths: 2.5,
        avgDebtToIncome: 0.20,
        avgCreditScore: 710,
        avgFinancialGoals: 2
      },
      '50k-1L': {
        label: 'Middle',
        incomeRange: [50000, 100000],
        avgSavingsRate: 0.18,
        avgRent: 0.25,
        avgFood: 0.15,
        avgTransport: 0.08,
        avgUtilities: 0.06,
        avgEntertainment: 0.08,
        avgHealthcare: 0.05,
        avgInsurance: 0.05,
        avgInvestmentRate: 0.10,
        avgEmergencyFundMonths: 4,
        avgDebtToIncome: 0.25,
        avgCreditScore: 740,
        avgFinancialGoals: 3
      },
      '1L-2L': {
        label: 'Upper Middle',
        incomeRange: [100000, 200000],
        avgSavingsRate: 0.22,
        avgRent: 0.20,
        avgFood: 0.12,
        avgTransport: 0.07,
        avgUtilities: 0.04,
        avgEntertainment: 0.10,
        avgHealthcare: 0.05,
        avgInsurance: 0.06,
        avgInvestmentRate: 0.15,
        avgEmergencyFundMonths: 6,
        avgDebtToIncome: 0.30,
        avgCreditScore: 770,
        avgFinancialGoals: 4
      },
      '2L-5L': {
        label: 'High Income',
        incomeRange: [200000, 500000],
        avgSavingsRate: 0.28,
        avgRent: 0.15,
        avgFood: 0.10,
        avgTransport: 0.06,
        avgUtilities: 0.03,
        avgEntertainment: 0.12,
        avgHealthcare: 0.05,
        avgInsurance: 0.07,
        avgInvestmentRate: 0.22,
        avgEmergencyFundMonths: 9,
        avgDebtToIncome: 0.28,
        avgCreditScore: 790,
        avgFinancialGoals: 5
      },
      '5L+': {
        label: 'Very High Income',
        incomeRange: [500000, 2000000],
        avgSavingsRate: 0.35,
        avgRent: 0.10,
        avgFood: 0.07,
        avgTransport: 0.05,
        avgUtilities: 0.02,
        avgEntertainment: 0.12,
        avgHealthcare: 0.05,
        avgInsurance: 0.08,
        avgInvestmentRate: 0.30,
        avgEmergencyFundMonths: 12,
        avgDebtToIncome: 0.20,
        avgCreditScore: 810,
        avgFinancialGoals: 6
      }
    };

    // Age-based adjustments
    this.ageAdjustments = {
      '22-25': { savingsMultiplier: 0.6, investmentMultiplier: 0.4, debtMultiplier: 0.5 },
      '25-30': { savingsMultiplier: 0.8, investmentMultiplier: 0.7, debtMultiplier: 0.8 },
      '30-35': { savingsMultiplier: 1.0, investmentMultiplier: 1.0, debtMultiplier: 1.2 },
      '35-45': { savingsMultiplier: 1.1, investmentMultiplier: 1.3, debtMultiplier: 1.1 },
      '45-55': { savingsMultiplier: 1.2, investmentMultiplier: 1.4, debtMultiplier: 0.8 },
      '55+':   { savingsMultiplier: 1.3, investmentMultiplier: 1.0, debtMultiplier: 0.4 }
    };
  }

  getCohort(monthlyIncome, age = 30) {
    let bracket = '50k-1L';
    if (monthlyIncome < 25000) bracket = '0-25k';
    else if (monthlyIncome < 50000) bracket = '25k-50k';
    else if (monthlyIncome < 100000) bracket = '50k-1L';
    else if (monthlyIncome < 200000) bracket = '1L-2L';
    else if (monthlyIncome < 500000) bracket = '2L-5L';
    else bracket = '5L+';

    const base = this.benchmarks[bracket];
    const ageGroup = this._getAgeGroup(age);
    const ageAdj = this.ageAdjustments[ageGroup] || this.ageAdjustments['30-35'];

    return {
      bracket,
      label: base.label,
      ageGroup,
      benchmarks: {
        savingsRate: base.avgSavingsRate * ageAdj.savingsMultiplier,
        rentPercent: base.avgRent,
        foodPercent: base.avgFood,
        transportPercent: base.avgTransport,
        utilitiesPercent: base.avgUtilities,
        entertainmentPercent: base.avgEntertainment,
        healthcarePercent: base.avgHealthcare,
        insurancePercent: base.avgInsurance,
        investmentRate: base.avgInvestmentRate * ageAdj.investmentMultiplier,
        emergencyFundMonths: base.avgEmergencyFundMonths,
        debtToIncome: base.avgDebtToIncome * ageAdj.debtMultiplier,
        creditScore: base.avgCreditScore,
        financialGoals: base.avgFinancialGoals
      }
    };
  }

  _getAgeGroup(age) {
    if (age < 25) return '22-25';
    if (age < 30) return '25-30';
    if (age < 35) return '30-35';
    if (age < 45) return '35-45';
    if (age < 55) return '45-55';
    return '55+';
  }

  generateSyntheticPeers(monthlyIncome, age, count = 100) {
    const cohort = this.getCohort(monthlyIncome, age);
    const peers = [];

    for (let i = 0; i < count; i++) {
      const peer = {};
      for (const [key, value] of Object.entries(cohort.benchmarks)) {
        // Add normally-distributed noise (±30%)
        const noise = 1 + (Math.random() * 0.6 - 0.3);
        peer[key] = typeof value === 'number' ? value * noise : value;
      }
      peer.income = monthlyIncome * (0.7 + Math.random() * 0.6);
      peers.push(peer);
    }

    return peers;
  }
}

// ============================================================================
// §2  PERCENTILE CALCULATOR
// ============================================================================

class PercentileCalculator {
  calculatePercentile(value, distribution) {
    const sorted = [...distribution].sort((a, b) => a - b);
    const belowCount = sorted.filter(v => v < value).length;
    const equalCount = sorted.filter(v => v === value).length;
    return ((belowCount + equalCount * 0.5) / sorted.length) * 100;
  }

  calculateRanking(value, distribution) {
    const percentile = this.calculatePercentile(value, distribution);
    return {
      percentile: Math.round(percentile),
      rank: Math.round(distribution.length - (percentile / 100) * distribution.length) + 1,
      total: distribution.length,
      label: this._getPercentileLabel(percentile),
      comparison: percentile >= 75 ? 'above_average' :
                  percentile >= 50 ? 'average' :
                  percentile >= 25 ? 'below_average' : 'needs_improvement'
    };
  }

  _getPercentileLabel(percentile) {
    if (percentile >= 90) return 'Top 10%';
    if (percentile >= 75) return 'Top 25%';
    if (percentile >= 50) return 'Above Average';
    if (percentile >= 25) return 'Below Average';
    return 'Bottom 25%';
  }
}

// ============================================================================
// §3  PEER COMPARISON ANALYZER
// ============================================================================

class PeerComparisonAnalyzer {
  constructor() {
    this.cohortGenerator = new PeerCohortGenerator();
    this.percentileCalc = new PercentileCalculator();
  }

  compare(userProfile, config = {}) {
    const { monthlyIncome = 50000, age = 30 } = config;
    const cohort = this.cohortGenerator.getCohort(monthlyIncome, age);
    const peers = this.cohortGenerator.generateSyntheticPeers(monthlyIncome, age, 100);

    const comparisons = {};

    // Savings Rate
    if (userProfile.savingsRate !== undefined) {
      const peerValues = peers.map(p => p.savingsRate);
      comparisons.savingsRate = {
        userValue: (userProfile.savingsRate * 100).toFixed(1) + '%',
        peerAverage: (cohort.benchmarks.savingsRate * 100).toFixed(1) + '%',
        ...this.percentileCalc.calculateRanking(userProfile.savingsRate, peerValues),
        better: userProfile.savingsRate > cohort.benchmarks.savingsRate,
        deviation: ((userProfile.savingsRate - cohort.benchmarks.savingsRate) * 100).toFixed(1) + 'pp',
        insight: userProfile.savingsRate > cohort.benchmarks.savingsRate
          ? `You save more than ${this.percentileCalc.calculatePercentile(userProfile.savingsRate, peerValues).toFixed(0)}% of your peers!`
          : `Your savings rate is below average. Peers in your bracket save ${(cohort.benchmarks.savingsRate * 100).toFixed(0)}%.`
      };
    }

    // Investment Rate
    if (userProfile.investmentRate !== undefined) {
      const peerValues = peers.map(p => p.investmentRate);
      comparisons.investmentRate = {
        userValue: (userProfile.investmentRate * 100).toFixed(1) + '%',
        peerAverage: (cohort.benchmarks.investmentRate * 100).toFixed(1) + '%',
        ...this.percentileCalc.calculateRanking(userProfile.investmentRate, peerValues),
        better: userProfile.investmentRate > cohort.benchmarks.investmentRate,
        insight: userProfile.investmentRate > cohort.benchmarks.investmentRate
          ? 'Your investment allocation is above peers. Strong wealth-building approach!'
          : 'Consider increasing investments. Your peers invest more of their income.'
      };
    }

    // Debt-to-Income
    if (userProfile.debtToIncome !== undefined) {
      const peerValues = peers.map(p => p.debtToIncome);
      comparisons.debtToIncome = {
        userValue: (userProfile.debtToIncome * 100).toFixed(1) + '%',
        peerAverage: (cohort.benchmarks.debtToIncome * 100).toFixed(1) + '%',
        ...this.percentileCalc.calculateRanking(1 - userProfile.debtToIncome, peerValues.map(v => 1 - v)),
        better: userProfile.debtToIncome < cohort.benchmarks.debtToIncome,
        insight: userProfile.debtToIncome < cohort.benchmarks.debtToIncome
          ? 'Excellent debt management! Lower DTI than most peers.'
          : 'Your debt burden is higher than peers. Consider accelerating repayment.'
      };
    }

    // Emergency Fund
    if (userProfile.emergencyFundMonths !== undefined) {
      const peerValues = peers.map(p => p.emergencyFundMonths);
      comparisons.emergencyFund = {
        userValue: userProfile.emergencyFundMonths.toFixed(1) + ' months',
        peerAverage: cohort.benchmarks.emergencyFundMonths.toFixed(1) + ' months',
        ...this.percentileCalc.calculateRanking(userProfile.emergencyFundMonths, peerValues),
        better: userProfile.emergencyFundMonths > cohort.benchmarks.emergencyFundMonths,
        insight: userProfile.emergencyFundMonths >= 6
          ? 'Great emergency fund! You\'re well-prepared for unexpected expenses.'
          : `Your emergency fund covers ${userProfile.emergencyFundMonths.toFixed(1)} months. Target 6 months.`
      };
    }

    // Category spending comparisons
    const categoryMapping = {
      food: { key: 'foodPercent', label: 'Food & Dining' },
      transport: { key: 'transportPercent', label: 'Transport' },
      entertainment: { key: 'entertainmentPercent', label: 'Entertainment' },
      utilities: { key: 'utilitiesPercent', label: 'Utilities' },
      healthcare: { key: 'healthcarePercent', label: 'Healthcare' },
      insurance: { key: 'insurancePercent', label: 'Insurance' }
    };

    if (userProfile.categoryBreakdown) {
      comparisons.categories = {};
      for (const [cat, mapping] of Object.entries(categoryMapping)) {
        const userPct = userProfile.categoryBreakdown[cat] || 0;
        const peerPct = cohort.benchmarks[mapping.key] || 0;
        const peerValues = peers.map(p => p[mapping.key] || peerPct);

        comparisons.categories[cat] = {
          label: mapping.label,
          userPercent: (userPct * 100).toFixed(1) + '%',
          peerPercent: (peerPct * 100).toFixed(1) + '%',
          difference: ((userPct - peerPct) * 100).toFixed(1) + 'pp',
          ...this.percentileCalc.calculateRanking(1 - userPct, peerValues.map(v => 1 - v)),
          isHigher: userPct > peerPct * 1.2,
          isLower: userPct < peerPct * 0.8
        };
      }
    }

    // Overall financial health comparison
    const overallScore = this._calculateOverallScore(userProfile, cohort.benchmarks);
    const peerScores = peers.map(p => this._calculateOverallScore(p, cohort.benchmarks));

    comparisons.overallHealth = {
      score: overallScore,
      ...this.percentileCalc.calculateRanking(overallScore, peerScores),
      insight: overallScore >= 75
        ? 'Your financial health is better than most peers in your bracket!'
        : overallScore >= 50
          ? 'You\'re doing about average compared to peers.'
          : 'There\'s room for improvement compared to your peer group.'
    };

    return {
      cohort: { bracket: cohort.bracket, label: cohort.label, ageGroup: cohort.ageGroup },
      comparisons,
      topStrengths: this._getTopStrengths(comparisons),
      improvementAreas: this._getImprovementAreas(comparisons),
      overallRanking: comparisons.overallHealth,
      peerCount: peers.length,
      generatedAt: new Date()
    };
  }

  _calculateOverallScore(profile, benchmarks) {
    let score = 50;

    const sr = profile.savingsRate || 0;
    const bsr = benchmarks.savingsRate || 0.15;
    score += (sr - bsr) / bsr * 20;

    const ir = profile.investmentRate || 0;
    const bir = benchmarks.investmentRate || 0.10;
    score += (ir - bir) / bir * 15;

    const dti = profile.debtToIncome || 0;
    const bdti = benchmarks.debtToIncome || 0.25;
    score -= (dti - bdti) / bdti * 10;

    const ef = profile.emergencyFundMonths || 0;
    const bef = benchmarks.emergencyFundMonths || 4;
    score += (ef - bef) / bef * 10;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  _getTopStrengths(comparisons) {
    const strengths = [];
    for (const [key, comp] of Object.entries(comparisons)) {
      if (key === 'categories' || key === 'overallHealth') continue;
      if (comp.better || comp.percentile >= 70) {
        strengths.push({ area: key, percentile: comp.percentile, insight: comp.insight });
      }
    }
    return strengths.sort((a, b) => b.percentile - a.percentile).slice(0, 3);
  }

  _getImprovementAreas(comparisons) {
    const areas = [];
    for (const [key, comp] of Object.entries(comparisons)) {
      if (key === 'categories' || key === 'overallHealth') continue;
      if (!comp.better && comp.percentile !== undefined && comp.percentile < 40) {
        areas.push({ area: key, percentile: comp.percentile, insight: comp.insight });
      }
    }
    return areas.sort((a, b) => a.percentile - b.percentile).slice(0, 3);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  PeerCohortGenerator,
  PercentileCalculator,
  PeerComparisonAnalyzer
};
