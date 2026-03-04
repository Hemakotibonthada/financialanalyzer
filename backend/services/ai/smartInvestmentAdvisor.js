// ============================================================================
// Smart Investment Advisor — AI-Powered Portfolio Optimization
// ============================================================================
// Provides:
//  - Risk profiling based on spending/saving behavior
//  - Asset allocation recommendations
//  - SIP amount calculator with goal mapping
//  - Tax-efficient investment suggestions
//  - Emergency fund adequacy assessment
//  - Portfolio rebalancing signals
//  - Indian market-specific advice (PPF, NPS, ELSS, FD)
// ============================================================================

const Transaction = require('../../models/Transaction');
const EMI = require('../../models/EMI');
const logger = require('../../utils/logger');

// ─── Indian Investment Products ──────────────────────────────────────
const PRODUCTS = {
  ppf: { name: 'Public Provident Fund', returnMin: 7.1, returnMax: 7.1, risk: 'none', lockIn: 15, taxBenefit: '80C', taxFree: true, minInvestment: 500, maxInvestment: 150000 },
  elss: { name: 'ELSS Mutual Fund', returnMin: 10, returnMax: 18, risk: 'high', lockIn: 3, taxBenefit: '80C', taxFree: false, minInvestment: 500 },
  nps: { name: 'National Pension System', returnMin: 8, returnMax: 12, risk: 'moderate', lockIn: 60, taxBenefit: '80CCD', taxFree: true, minInvestment: 1000 },
  fd: { name: 'Fixed Deposit', returnMin: 6, returnMax: 7.5, risk: 'none', lockIn: 1, taxBenefit: null, taxFree: false, minInvestment: 1000 },
  rd: { name: 'Recurring Deposit', returnMin: 5.5, returnMax: 7, risk: 'none', lockIn: 0.5, taxBenefit: null, taxFree: false, minInvestment: 500 },
  liquid_fund: { name: 'Liquid Mutual Fund', returnMin: 4, returnMax: 6, risk: 'very_low', lockIn: 0, taxBenefit: null, taxFree: false, minInvestment: 500 },
  index_fund: { name: 'Nifty 50 Index Fund', returnMin: 10, returnMax: 15, risk: 'moderate', lockIn: 0, taxBenefit: null, taxFree: false, minInvestment: 500 },
  mid_cap: { name: 'Mid Cap Fund', returnMin: 12, returnMax: 20, risk: 'high', lockIn: 0, taxBenefit: null, taxFree: false, minInvestment: 1000 },
  small_cap: { name: 'Small Cap Fund', returnMin: 14, returnMax: 25, risk: 'very_high', lockIn: 0, taxBenefit: null, taxFree: false, minInvestment: 1000 },
  gold_bond: { name: 'Sovereign Gold Bond', returnMin: 6, returnMax: 10, risk: 'moderate', lockIn: 5, taxBenefit: null, taxFree: true, minInvestment: 5000 },
  epf: { name: 'Employee Provident Fund', returnMin: 8.15, returnMax: 8.15, risk: 'none', lockIn: 58, taxBenefit: '80C', taxFree: true },
};

class SmartInvestmentAdvisor {
  /**
   * Complete investment analysis and recommendations
   */
  async analyze(userId) {
    const since = new Date();
    since.setMonth(since.getMonth() - 6);

    const [transactions, emis] = await Promise.all([
      Transaction.find({ userId, date: { $gte: since } }).lean(),
      EMI.find({ userId, status: 'active' }).lean().catch(() => []),
    ]);

    const monthlyIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0) / 6;
    const monthlyExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0) / 6;
    const monthlySurplus = monthlyIncome - monthlyExpense;
    const monthlyEmi = emis.reduce((s, e) => s + (e.emiAmount || 0), 0);
    const savingsRate = monthlyIncome > 0 ? (monthlySurplus / monthlyIncome * 100) : 0;

    // Risk profile
    const riskProfile = this._assessRiskProfile(savingsRate, monthlyIncome, monthlyEmi, monthlySurplus);

    // Emergency fund assessment
    const emergencyFund = this._assessEmergencyFund(monthlyExpense, monthlySurplus);

    // Asset allocation
    const allocation = this._recommendAllocation(riskProfile, monthlySurplus);

    // SIP recommendations
    const sipPlan = this._generateSIPPlan(monthlySurplus, riskProfile, allocation);

    // Tax optimization
    const taxOptimization = this._taxOptimization(monthlyIncome, monthlySurplus);

    // Goal-based suggestions
    const goalSuggestions = this._goalBasedSuggestions(monthlySurplus, riskProfile);

    return {
      financialSnapshot: {
        monthlyIncome: Math.round(monthlyIncome),
        monthlyExpense: Math.round(monthlyExpense),
        monthlySurplus: Math.round(monthlySurplus),
        monthlyEmi: Math.round(monthlyEmi),
        savingsRate: Math.round(savingsRate * 10) / 10,
        emiToIncome: monthlyIncome > 0 ? Math.round(monthlyEmi / monthlyIncome * 100) : 0,
      },
      riskProfile,
      emergencyFund,
      allocation,
      sipPlan,
      taxOptimization,
      goalSuggestions,
      investableAmount: Math.max(0, Math.round(monthlySurplus * 0.6)),
    };
  }

  /**
   * Calculate SIP returns projection
   */
  calculateSIPProjection(monthlyAmount, years, expectedReturn = 12) {
    const months = years * 12;
    const monthlyRate = expectedReturn / 100 / 12;
    const futureValue = monthlyAmount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
    const totalInvested = monthlyAmount * months;
    const totalReturns = futureValue - totalInvested;

    // Year-by-year projection
    const yearlyProjection = [];
    for (let y = 1; y <= years; y++) {
      const m = y * 12;
      const fv = monthlyAmount * ((Math.pow(1 + monthlyRate, m) - 1) / monthlyRate) * (1 + monthlyRate);
      yearlyProjection.push({
        year: y,
        invested: Math.round(monthlyAmount * m),
        value: Math.round(fv),
        returns: Math.round(fv - monthlyAmount * m),
      });
    }

    return {
      monthlyAmount: Math.round(monthlyAmount),
      years,
      expectedReturn,
      totalInvested: Math.round(totalInvested),
      projectedValue: Math.round(futureValue),
      totalReturns: Math.round(totalReturns),
      returnMultiple: totalInvested > 0 ? Math.round(futureValue / totalInvested * 100) / 100 : 0,
      yearlyProjection,
    };
  }

  /**
   * Suggest SIP amount needed for a financial goal
   */
  calculateGoalSIP(targetAmount, years, expectedReturn = 12) {
    const months = years * 12;
    const monthlyRate = expectedReturn / 100 / 12;
    const monthlyAmount = targetAmount / (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate));

    return {
      targetAmount,
      years,
      expectedReturn,
      requiredMonthlySIP: Math.round(monthlyAmount),
      totalInvestment: Math.round(monthlyAmount * months),
      expectedReturns: Math.round(targetAmount - monthlyAmount * months),
    };
  }

  // ─── Private Methods ────────────────────────────────────────────

  _assessRiskProfile(savingsRate, income, emiBurden, surplus) {
    let score = 50; // Base

    // Income stability indicator
    if (income > 100000) score += 10;
    else if (income > 50000) score += 5;

    // Savings capacity
    if (savingsRate > 30) score += 15;
    else if (savingsRate > 20) score += 10;
    else if (savingsRate > 10) score += 5;
    else score -= 10;

    // Debt burden
    const emiRatio = income > 0 ? (emiBurden / income * 100) : 0;
    if (emiRatio > 40) score -= 15;
    else if (emiRatio > 20) score -= 5;
    else score += 5;

    // Surplus
    if (surplus > 30000) score += 10;
    else if (surplus > 10000) score += 5;
    else if (surplus <= 0) score -= 20;

    score = Math.max(10, Math.min(90, score));

    const profile = score >= 70 ? 'aggressive' : score >= 50 ? 'moderate' : score >= 30 ? 'conservative' : 'ultra_conservative';

    return {
      score,
      profile,
      label: profile === 'aggressive' ? 'Aggressive Investor' : profile === 'moderate' ? 'Balanced Investor' : profile === 'conservative' ? 'Conservative Investor' : 'Safety-First Investor',
      description: this._riskDescription(profile),
      suitableProducts: this._suitableProducts(profile),
    };
  }

  _riskDescription(profile) {
    const desc = {
      aggressive: 'Your financial position allows for higher-risk, higher-return investments. Focus on equity-heavy portfolio with 70-80% in stocks/equity mutual funds.',
      moderate: 'A balanced approach suits you best. Mix equity (50-60%) with debt instruments (30-40%) and some gold/alternatives (10%).',
      conservative: 'Prioritize capital preservation with guaranteed-return instruments. Keep 60-70% in FDs, PPF, and debt funds.',
      ultra_conservative: 'Focus on building an emergency fund first. Only invest in highly liquid, low-risk instruments.',
    };
    return desc[profile] || desc.moderate;
  }

  _suitableProducts(profile) {
    const products = {
      aggressive: ['index_fund', 'mid_cap', 'small_cap', 'elss', 'nps', 'gold_bond'],
      moderate: ['index_fund', 'elss', 'ppf', 'nps', 'gold_bond', 'fd'],
      conservative: ['ppf', 'fd', 'rd', 'liquid_fund', 'gold_bond', 'nps'],
      ultra_conservative: ['liquid_fund', 'fd', 'rd', 'ppf'],
    };
    return (products[profile] || products.moderate).map(key => ({ key, ...PRODUCTS[key] }));
  }

  _assessEmergencyFund(monthlyExpense, surplus) {
    const targetMonths = 6;
    const targetAmount = monthlyExpense * targetMonths;
    const monthsToSave = surplus > 0 ? Math.ceil(targetAmount / (surplus * 0.3)) : null;

    return {
      targetAmount: Math.round(targetAmount),
      targetMonths,
      monthsToSave,
      recommendation: surplus <= 0
        ? 'Critical: You have no surplus to build an emergency fund. Reduce expenses first.'
        : `Save ₹${Math.round(surplus * 0.3).toLocaleString('en-IN')}/month in a liquid fund until you reach ₹${Math.round(targetAmount).toLocaleString('en-IN')}`,
      product: 'liquid_fund',
      suggestedMonthly: Math.round(Math.max(1000, surplus * 0.3)),
    };
  }

  _recommendAllocation(riskProfile, surplus) {
    const profile = riskProfile.profile;
    const allocations = {
      aggressive: { equity: 70, debt: 15, gold: 10, cash: 5 },
      moderate: { equity: 50, debt: 30, gold: 10, cash: 10 },
      conservative: { equity: 25, debt: 50, gold: 10, cash: 15 },
      ultra_conservative: { equity: 10, debt: 60, gold: 5, cash: 25 },
    };

    const alloc = allocations[profile] || allocations.moderate;
    const investable = Math.max(0, surplus * 0.6);

    return {
      strategy: profile,
      percentages: alloc,
      amounts: {
        equity: Math.round(investable * alloc.equity / 100),
        debt: Math.round(investable * alloc.debt / 100),
        gold: Math.round(investable * alloc.gold / 100),
        cash: Math.round(investable * alloc.cash / 100),
      },
      monthlyInvestable: Math.round(investable),
    };
  }

  _generateSIPPlan(surplus, riskProfile, allocation) {
    const investable = allocation.monthlyInvestable;
    if (investable <= 0) return { message: 'No surplus available for SIP investments' };

    const plan = [];

    if (allocation.amounts.equity >= 500) {
      const equityAmt = allocation.amounts.equity;
      if (equityAmt >= 2000) {
        plan.push({ product: 'Nifty 50 Index Fund', amount: Math.round(equityAmt * 0.5), frequency: 'monthly', rationale: 'Core equity allocation — low cost, diversified' });
        plan.push({ product: 'ELSS (Tax Saving)', amount: Math.round(equityAmt * 0.3), frequency: 'monthly', rationale: 'Equity exposure + 80C tax benefit' });
        plan.push({ product: 'Mid Cap Fund', amount: Math.round(equityAmt * 0.2), frequency: 'monthly', rationale: 'Growth kicker for higher returns' });
      } else {
        plan.push({ product: 'ELSS (Tax Saving)', amount: equityAmt, frequency: 'monthly', rationale: 'Equity + tax saving in one fund' });
      }
    }

    if (allocation.amounts.debt >= 500) {
      plan.push({ product: 'PPF', amount: Math.min(allocation.amounts.debt, 12500), frequency: 'monthly', rationale: 'Guaranteed 7.1%, tax-free, 80C benefit' });
    }

    if (allocation.amounts.gold >= 500) {
      plan.push({ product: 'Sovereign Gold Bond', amount: allocation.amounts.gold, frequency: 'quarterly', rationale: 'Gold exposure + 2.5% guaranteed interest' });
    }

    return {
      totalMonthly: Math.round(investable),
      plan,
      projectedIn5Years: this.calculateSIPProjection(investable, 5, riskProfile.profile === 'aggressive' ? 14 : 10),
      projectedIn10Years: this.calculateSIPProjection(investable, 10, riskProfile.profile === 'aggressive' ? 14 : 10),
    };
  }

  _taxOptimization(income, surplus) {
    const annualIncome = income * 12;
    const suggestions = [];
    let totalTaxSaving = 0;

    // 80C (₹1.5L limit)
    if (surplus > 0) {
      const ppfAmount = Math.min(150000, surplus * 12 * 0.15);
      suggestions.push({
        section: '80C',
        product: 'PPF + ELSS',
        amount: Math.round(ppfAmount),
        taxSaving: Math.round(ppfAmount * 0.3),
        description: 'Invest in PPF (₹500-1.5L/yr) and ELSS (SIP) to claim full 80C deduction',
      });
      totalTaxSaving += ppfAmount * 0.3;
    }

    // 80D
    suggestions.push({
      section: '80D',
      product: 'Health Insurance',
      amount: 25000,
      taxSaving: 7500,
      description: 'Health insurance premium for self/family (₹25K) + parents (₹50K if senior)',
    });
    totalTaxSaving += 7500;

    // 80CCD(1B)
    suggestions.push({
      section: '80CCD(1B)',
      product: 'NPS',
      amount: 50000,
      taxSaving: 15000,
      description: 'Additional ₹50K NPS deduction over 80C limit',
    });
    totalTaxSaving += 15000;

    return {
      estimatedAnnualIncome: Math.round(annualIncome),
      suggestions,
      totalPotentialSaving: Math.round(totalTaxSaving),
      effectiveSavingPerMonth: Math.round(totalTaxSaving / 12),
    };
  }

  _goalBasedSuggestions(surplus, riskProfile) {
    const suggestions = [];

    if (surplus > 5000) {
      suggestions.push({
        goal: 'Emergency Fund',
        timeframe: '12 months',
        monthlyRequired: Math.round(surplus * 0.3),
        product: 'Liquid Fund',
        priority: 'high',
      });
    }

    if (surplus > 10000) {
      const carFund = this.calculateGoalSIP(500000, 3, 10);
      suggestions.push({
        goal: 'Car Down Payment (₹5L)',
        timeframe: '3 years',
        monthlyRequired: carFund.requiredMonthlySIP,
        product: 'Balanced Hybrid Fund',
        priority: 'medium',
      });
    }

    if (surplus > 20000) {
      const homeFund = this.calculateGoalSIP(2000000, 5, 12);
      suggestions.push({
        goal: 'Home Down Payment (₹20L)',
        timeframe: '5 years',
        monthlyRequired: homeFund.requiredMonthlySIP,
        product: 'Aggressive Hybrid + Index Fund',
        priority: 'medium',
      });
    }

    const retireFund = this.calculateGoalSIP(10000000, 25, riskProfile.profile === 'aggressive' ? 14 : 11);
    suggestions.push({
      goal: 'Retirement Corpus (₹1Cr)',
      timeframe: '25 years',
      monthlyRequired: retireFund.requiredMonthlySIP,
      product: 'Nifty 50 Index Fund SIP',
      priority: 'high',
    });

    return suggestions;
  }
}

module.exports = new SmartInvestmentAdvisor();
