// ============================================================================
// SMART FINANCIAL PLANNER — AI-Driven Goal & Retirement Planning
// ============================================================================
// Comprehensive financial planning with goal optimization, retirement analysis,
// tax strategy, insurance gap analysis, and life-stage recommendations.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');

const sum = (a) => a.reduce((s, v) => s + v, 0);
const mean = (a) => a.length ? sum(a) / a.length : 0;

// ============================================================================
// §1  GOAL OPTIMIZER — Optimize Multiple Financial Goals
// ============================================================================

class GoalOptimizer {
  constructor() {
    this.inflationRate = 0.06;
    this.defaultReturnRates = {
      conservative: 0.07,
      moderate: 0.10,
      aggressive: 0.14
    };
  }

  optimizeGoals(goals, monthlyIncome, currentSavingsRate = 0.2) {
    const monthlyBudget = monthlyIncome * currentSavingsRate;
    const prioritized = this._prioritizeGoals(goals);
    const allocations = [];
    let remainingBudget = monthlyBudget;

    for (const goal of prioritized) {
      const inflatedTarget = this._inflateTarget(goal);
      const monthsRemaining = this._monthsUntilDeadline(goal);
      const currentProgress = goal.currentAmount || goal.saved || 0;
      const gap = Math.max(0, inflatedTarget - currentProgress);

      if (monthsRemaining <= 0) {
        allocations.push({
          ...goal,
          inflatedTarget,
          monthlySIP: 0,
          status: 'overdue',
          recommendation: 'Goal deadline has passed. Reassess priority and set a new deadline.'
        });
        continue;
      }

      // Calculate required monthly SIP
      const riskProfile = this._getGoalRiskProfile(goal, monthsRemaining);
      const returnRate = this.defaultReturnRates[riskProfile] || 0.10;
      const r = returnRate / 12;
      const fvCurrent = currentProgress * Math.pow(1 + r, monthsRemaining);
      const remaining = inflatedTarget - fvCurrent;
      const annuityFactor = r > 0 ? (Math.pow(1 + r, monthsRemaining) - 1) / r : monthsRemaining;
      const requiredSIP = Math.max(0, remaining / annuityFactor);

      const allocatedSIP = Math.min(requiredSIP, remainingBudget);
      remainingBudget -= allocatedSIP;

      // Feasibility analysis
      const feasibility = allocatedSIP >= requiredSIP * 0.95 ? 'on_track' :
                          allocatedSIP >= requiredSIP * 0.7 ? 'at_risk' : 'underfunded';

      const projectedValue = fvCurrent + allocatedSIP * annuityFactor;
      const shortfall = Math.max(0, inflatedTarget - projectedValue);

      allocations.push({
        goalName: goal.name || goal.title,
        goalId: goal._id || goal.id,
        priority: goal.priority || 'medium',
        targetAmount: goal.targetAmount || goal.target,
        inflatedTarget: Math.round(inflatedTarget),
        currentAmount: currentProgress,
        progressPercent: inflatedTarget > 0 ? ((currentProgress / inflatedTarget) * 100).toFixed(1) : 0,
        monthsRemaining,
        riskProfile,
        expectedReturn: (returnRate * 100).toFixed(1) + '%',
        requiredMonthlySIP: Math.round(requiredSIP),
        allocatedMonthlySIP: Math.round(allocatedSIP),
        feasibility,
        projectedFinalValue: Math.round(projectedValue),
        shortfall: Math.round(shortfall),
        recommendation: this._getGoalRecommendation(feasibility, goal, requiredSIP, allocatedSIP, monthsRemaining)
      });
    }

    return {
      goalAllocations: allocations,
      totalMonthlyBudget: monthlyBudget,
      totalAllocated: monthlyBudget - remainingBudget,
      unallocated: Math.max(0, remainingBudget),
      goalsOnTrack: allocations.filter(a => a.feasibility === 'on_track').length,
      goalsAtRisk: allocations.filter(a => a.feasibility === 'at_risk').length,
      goalsUnderfunded: allocations.filter(a => a.feasibility === 'underfunded').length,
      overallHealth: allocations.length > 0
        ? allocations.filter(a => a.feasibility === 'on_track').length / allocations.length
        : 1,
      suggestions: this._generateGoalSuggestions(allocations, remainingBudget, monthlyIncome)
    };
  }

  _prioritizeGoals(goals) {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...goals].sort((a, b) => {
      const pDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      if (pDiff !== 0) return pDiff;
      // Earlier deadline = higher priority
      const dA = new Date(a.deadline || a.targetDate || '2099-12-31');
      const dB = new Date(b.deadline || b.targetDate || '2099-12-31');
      return dA - dB;
    });
  }

  _inflateTarget(goal) {
    const target = goal.targetAmount || goal.target || 0;
    const months = this._monthsUntilDeadline(goal);
    return target * Math.pow(1 + this.inflationRate / 12, Math.max(0, months));
  }

  _monthsUntilDeadline(goal) {
    const deadline = new Date(goal.deadline || goal.targetDate || Date.now());
    return Math.max(0, Math.round((deadline - Date.now()) / (30 * 24 * 60 * 60 * 1000)));
  }

  _getGoalRiskProfile(goal, monthsRemaining) {
    if (monthsRemaining < 12) return 'conservative';
    if (monthsRemaining < 36) return 'moderate';
    return 'aggressive';
  }

  _getGoalRecommendation(feasibility, goal, required, allocated, months) {
    if (feasibility === 'on_track') {
      return `On track! Continue SIP of ₹${Math.round(allocated).toLocaleString()}/month.`;
    }
    if (feasibility === 'at_risk') {
      const extra = Math.round(required - allocated);
      return `At risk. Need ₹${extra.toLocaleString()} more per month, or extend deadline by ${Math.round(months * 0.3)} months.`;
    }
    return `Underfunded. Consider either reducing the target, extending the deadline, or increasing income allocation.`;
  }

  _generateGoalSuggestions(allocations, unallocated, income) {
    const suggestions = [];

    if (unallocated > 0) {
      const underfunded = allocations.filter(a => a.feasibility === 'underfunded');
      if (underfunded.length > 0) {
        suggestions.push(`Allocate surplus ₹${Math.round(unallocated).toLocaleString()} to underfunded goals: ${underfunded.map(a => a.goalName).join(', ')}`);
      } else {
        suggestions.push(`You have ₹${Math.round(unallocated).toLocaleString()} unallocated. Consider starting an emergency fund or new investment goal.`);
      }
    }

    const highReturnsNeeded = allocations.filter(a => a.riskProfile === 'aggressive' && a.monthsRemaining < 24);
    if (highReturnsNeeded.length > 0) {
      suggestions.push(`Warning: ${highReturnsNeeded.map(a => a.goalName).join(', ')} require aggressive returns with short timeline. Consider revising.`);
    }

    return suggestions;
  }
}

// ============================================================================
// §2  RETIREMENT PLANNER — Comprehensive Retirement Analysis
// ============================================================================

class RetirementPlanner {
  constructor() {
    this.inflationRate = 0.06;
    this.medicalInflation = 0.14;
    this.safeWithdrawalRate = 0.04;
  }

  plan(config) {
    const {
      currentAge = 30,
      retirementAge = 55,
      lifeExpectancy = 85,
      currentMonthlyExpense = 50000,
      currentSavings = 500000,
      monthlySIP = 15000,
      existingRetirementFunds = 0, // EPF, NPS, etc.
      expectedReturn = 0.12,
      postRetirementReturn = 0.08,
      currentHealthInsurance = 0
    } = config;

    const yearsToRetirement = retirementAge - currentAge;
    const retirementYears = lifeExpectancy - retirementAge;

    // Calculate future monthly expenses at retirement
    const futureMonthlyExpense = currentMonthlyExpense *
      Math.pow(1 + this.inflationRate, yearsToRetirement);

    // Calculate required corpus (25x annual expenses — 4% SWR)
    const annualExpenseAtRetirement = futureMonthlyExpense * 12;
    const requiredCorpus = annualExpenseAtRetirement / this.safeWithdrawalRate;

    // More accurate: present value of retirement expenses
    const pvRetirement = this._pvRetirementExpenses(
      futureMonthlyExpense, retirementYears, postRetirementReturn, this.inflationRate
    );

    // Projected corpus from existing savings and SIP
    const projectedFromSavings = (currentSavings + existingRetirementFunds) *
      Math.pow(1 + expectedReturn, yearsToRetirement);
    const monthlyReturn = expectedReturn / 12;
    const projectedFromSIP = monthlySIP *
      ((Math.pow(1 + monthlyReturn, yearsToRetirement * 12) - 1) / monthlyReturn);
    const totalProjected = projectedFromSavings + projectedFromSIP;

    // Gap analysis
    const corpusGap = Math.max(0, pvRetirement - totalProjected);
    const additionalMonthlySIP = corpusGap > 0
      ? corpusGap / ((Math.pow(1 + monthlyReturn, yearsToRetirement * 12) - 1) / monthlyReturn)
      : 0;

    // Health care costs
    const futureHealthCost = 500000 * Math.pow(1 + this.medicalInflation, yearsToRetirement);
    const healthCorpusNeeded = futureHealthCost * retirementYears * 0.1; // 10% annual medical costs

    // FIRE calculation (Financial Independence, Retire Early)
    const fireNumber = currentMonthlyExpense * 12 * 25;
    const yearsToFIRE = this._yearsToTarget(
      currentSavings + existingRetirementFunds, monthlySIP, expectedReturn, fireNumber
    );

    // EPF/NPS projections
    const epfContribution = currentMonthlyExpense * 0.24; // Employer + employee
    const epfProjection = epfContribution * 12 *
      ((Math.pow(1 + 0.081, yearsToRetirement) - 1) / 0.081);

    return {
      summary: {
        currentAge,
        retirementAge,
        yearsToRetirement,
        retirementYears
      },
      expenses: {
        currentMonthly: currentMonthlyExpense,
        atRetirement: Math.round(futureMonthlyExpense),
        annualAtRetirement: Math.round(annualExpenseAtRetirement),
        inflationImpact: `${((futureMonthlyExpense / currentMonthlyExpense - 1) * 100).toFixed(0)}% increase`
      },
      corpus: {
        requiredSimple: Math.round(requiredCorpus),
        requiredAccurate: Math.round(pvRetirement),
        projected: Math.round(totalProjected),
        fromExistingSavings: Math.round(projectedFromSavings),
        fromSIP: Math.round(projectedFromSIP),
        gap: Math.round(corpusGap),
        gapPercent: pvRetirement > 0 ? ((corpusGap / pvRetirement) * 100).toFixed(1) + '%' : '0%',
        onTrack: corpusGap <= 0
      },
      action: {
        currentMonthlySIP: monthlySIP,
        requiredAdditionalSIP: Math.round(additionalMonthlySIP),
        totalRequiredSIP: Math.round(monthlySIP + additionalMonthlySIP),
        sipIncreasePercent: monthlySIP > 0
          ? ((additionalMonthlySIP / monthlySIP) * 100).toFixed(0) + '%'
          : 'N/A'
      },
      healthcare: {
        projectedAnnualCost: Math.round(futureHealthCost),
        recommendedCover: Math.round(futureHealthCost * 2),
        currentCover: currentHealthInsurance,
        gap: Math.max(0, Math.round(futureHealthCost * 2 - currentHealthInsurance)),
        healthCorpusNeeded: Math.round(healthCorpusNeeded)
      },
      fire: {
        fireNumber: Math.round(fireNumber),
        yearsToFIRE: Math.round(yearsToFIRE * 10) / 10,
        fireAge: currentAge + Math.ceil(yearsToFIRE),
        canRetireEarly: yearsToFIRE < yearsToRetirement
      },
      epf: {
        monthlyContribution: Math.round(epfContribution),
        projectedCorpus: Math.round(epfProjection)
      },
      recommendations: this._generateRetirementRecommendations({
        corpusGap, additionalMonthlySIP, monthlySIP, yearsToRetirement,
        currentAge, currentSavings, currentMonthlyExpense
      })
    };
  }

  _pvRetirementExpenses(monthlyExpense, years, returnRate, inflationRate) {
    const realReturn = (1 + returnRate) / (1 + inflationRate) - 1;
    const months = years * 12;
    const r = realReturn / 12;

    if (r === 0) return monthlyExpense * months;
    return monthlyExpense * (1 - Math.pow(1 + r, -months)) / r;
  }

  _yearsToTarget(current, monthlySIP, returnRate, target) {
    if (current >= target) return 0;
    const monthlyReturn = returnRate / 12;

    for (let months = 1; months <= 600; months++) { // Max 50 years
      const fv = current * Math.pow(1 + monthlyReturn, months) +
        monthlySIP * ((Math.pow(1 + monthlyReturn, months) - 1) / monthlyReturn);
      if (fv >= target) return months / 12;
    }
    return 50;
  }

  _generateRetirementRecommendations(data) {
    const recs = [];

    if (data.corpusGap > 0) {
      recs.push({
        priority: 'critical',
        area: 'savings',
        message: `You need to increase SIP by ₹${Math.round(data.additionalMonthlySIP).toLocaleString()}/month to meet your retirement goal.`
      });

      if (data.additionalMonthlySIP > data.monthlySIP * 0.5) {
        recs.push({
          priority: 'high',
          area: 'strategy',
          message: 'Consider step-up SIP: increase SIP by 10% annually with salary increments instead of a large lump-sum increase.'
        });
      }
    }

    if (data.currentAge < 35) {
      recs.push({
        priority: 'medium',
        area: 'investment',
        message: 'With 20+ years to retirement, maintain 70-80% equity allocation for higher growth.'
      });
    }

    if (data.currentSavings < data.currentMonthlyExpense * 6) {
      recs.push({
        priority: 'high',
        area: 'emergency',
        message: 'Build emergency fund (6 months expenses) before increasing retirement contributions.'
      });
    }

    recs.push({
      priority: 'medium',
      area: 'nps',
      message: 'Invest in NPS for additional ₹50,000 tax deduction under 80CCD(1B) and retirement corpus.'
    });

    return recs;
  }
}

// ============================================================================
// §3  TAX OPTIMIZATION ENGINE — Smart Tax Planning
// ============================================================================

class TaxOptimizer {
  constructor() {
    this.taxSlabsOld = [
      { limit: 250000, rate: 0 },
      { limit: 500000, rate: 0.05 },
      { limit: 1000000, rate: 0.2 },
      { limit: Infinity, rate: 0.3 }
    ];
    this.taxSlabsNew = [
      { limit: 300000, rate: 0 },
      { limit: 700000, rate: 0.05 },
      { limit: 1000000, rate: 0.10 },
      { limit: 1200000, rate: 0.15 },
      { limit: 1500000, rate: 0.20 },
      { limit: Infinity, rate: 0.30 }
    ];
    this.standardDeduction = 75000;
  }

  calculateTaxComparison(income, deductions = {}) {
    const {
      section80C = 0,    // Max 150000
      section80D = 0,    // Max 25000 (self) + 50000 (parents)
      section80CCD = 0,  // Max 50000 (NPS)
      hra = 0,
      homeLoanInterest = 0, // Max 200000
      homeLoanPrincipal = 0, // Part of 80C
      otherDeductions = 0
    } = deductions;

    // Old regime calculation
    const totalDeductionsOld = Math.min(section80C + homeLoanPrincipal, 150000) +
      Math.min(section80D, 75000) + Math.min(section80CCD, 50000) +
      hra + Math.min(homeLoanInterest, 200000) + otherDeductions +
      this.standardDeduction;

    const taxableIncomeOld = Math.max(0, income - totalDeductionsOld);
    const taxOld = this._calculateTax(taxableIncomeOld, this.taxSlabsOld);
    const cessOld = taxOld * 0.04;

    // New regime calculation
    const taxableIncomeNew = Math.max(0, income - this.standardDeduction);
    const taxNew = this._calculateTax(taxableIncomeNew, this.taxSlabsNew);
    const cessNew = taxNew * 0.04;

    // Rebate u/s 87A
    const rebateOld = taxableIncomeOld <= 500000 ? Math.min(taxOld, 12500) : 0;
    const rebateNew = taxableIncomeNew <= 700000 ? Math.min(taxNew, 25000) : 0;

    const totalTaxOld = taxOld + cessOld - rebateOld;
    const totalTaxNew = taxNew + cessNew - rebateNew;
    const savings = totalTaxNew - totalTaxOld;

    return {
      oldRegime: {
        grossIncome: income,
        totalDeductions: totalDeductionsOld,
        taxableIncome: taxableIncomeOld,
        tax: Math.round(taxOld),
        cess: Math.round(cessOld),
        rebate: Math.round(rebateOld),
        totalTax: Math.round(Math.max(0, totalTaxOld)),
        effectiveRate: income > 0 ? ((totalTaxOld / income) * 100).toFixed(1) + '%' : '0%'
      },
      newRegime: {
        grossIncome: income,
        standardDeduction: this.standardDeduction,
        taxableIncome: taxableIncomeNew,
        tax: Math.round(taxNew),
        cess: Math.round(cessNew),
        rebate: Math.round(rebateNew),
        totalTax: Math.round(Math.max(0, totalTaxNew)),
        effectiveRate: income > 0 ? ((totalTaxNew / income) * 100).toFixed(1) + '%' : '0%'
      },
      recommendation: totalTaxOld < totalTaxNew ? 'old_regime' : 'new_regime',
      savings: Math.round(Math.abs(savings)),
      savingsPercent: income > 0 ? ((Math.abs(savings) / income) * 100).toFixed(2) + '%' : '0%',
      breakEvenDeductions: this._calculateBreakEven(income),
      optimizationTips: this._getTaxOptimizationTips(deductions, income)
    };
  }

  _calculateTax(income, slabs) {
    let tax = 0;
    let remaining = income;
    let prevLimit = 0;

    for (const slab of slabs) {
      const taxableInSlab = Math.min(remaining, slab.limit - prevLimit);
      if (taxableInSlab <= 0) break;
      tax += taxableInSlab * slab.rate;
      remaining -= taxableInSlab;
      prevLimit = slab.limit;
    }

    return Math.max(0, tax);
  }

  _calculateBreakEven(income) {
    // Find the deduction amount where old and new regime taxes are equal
    for (let deductions = 0; deductions <= 500000; deductions += 10000) {
      const taxOld = this._calculateTax(Math.max(0, income - deductions - this.standardDeduction), this.taxSlabsOld);
      const taxNew = this._calculateTax(Math.max(0, income - this.standardDeduction), this.taxSlabsNew);
      if (taxOld <= taxNew) return deductions;
    }
    return 500000;
  }

  _getTaxOptimizationTips(deductions, income) {
    const tips = [];

    if ((deductions.section80C || 0) < 150000) {
      const gap = 150000 - (deductions.section80C || 0);
      tips.push({
        section: '80C',
        message: `You can claim ₹${gap.toLocaleString()} more under 80C. Consider ELSS (3-year lock-in, equity returns) or PPF (safe, 7.1%).`,
        potentialSaving: Math.round(gap * 0.3)
      });
    }

    if ((deductions.section80D || 0) < 50000) {
      tips.push({
        section: '80D',
        message: 'Get health insurance for parents (₹50,000 deduction for senior citizen parents).',
        potentialSaving: Math.round(25000 * 0.3)
      });
    }

    if ((deductions.section80CCD || 0) < 50000 && income > 500000) {
      tips.push({
        section: '80CCD(1B)',
        message: 'Invest ₹50,000 in NPS for additional deduction beyond 80C. Also builds retirement corpus.',
        potentialSaving: Math.round(50000 * 0.3)
      });
    }

    if (income > 1500000 && !(deductions.homeLoanInterest > 0)) {
      tips.push({
        section: '24(b)',
        message: 'Home loan interest deduction of up to ₹2L is a significant tax saver for high-income earners.',
        potentialSaving: Math.round(200000 * 0.3)
      });
    }

    return tips;
  }
}

// ============================================================================
// §4  INSURANCE GAP ANALYZER
// ============================================================================

class InsuranceGapAnalyzer {
  analyze(config) {
    const {
      age = 30,
      annualIncome = 600000,
      dependents = 2,
      existingLifeInsurance = 0,
      existingHealthInsurance = 0,
      existingAccidentInsurance = 0,
      hasHomeLoan = false,
      homeLoanOutstanding = 0,
      monthlyExpenses = 40000,
      hasKids = false,
      kidsAge = []
    } = config;

    // Life insurance analysis
    const incomeReplacement = annualIncome * 15;
    const liabilityCover = homeLoanOutstanding;
    const childEducation = hasKids ? kidsAge.reduce((s, age) => {
      const yearsToCollege = Math.max(0, 18 - age);
      return s + 1500000 * Math.pow(1.06, yearsToCollege);
    }, 0) : 0;
    const requiredLifeInsurance = incomeReplacement + liabilityCover + childEducation;
    const lifeInsuranceGap = Math.max(0, requiredLifeInsurance - existingLifeInsurance);

    // Health insurance analysis
    const basicCover = 500000;
    const recommendedHealth = Math.max(
      1000000,
      monthlyExpenses * 12 * 0.3, // 30% of annual expenses
      dependents > 2 ? 2000000 : 1000000
    );
    const healthInsuranceGap = Math.max(0, recommendedHealth - existingHealthInsurance);

    // Critical illness
    const criticalIllnessCover = annualIncome * 5;

    // Personal accident
    const accidentCover = annualIncome * 10;
    const accidentGap = Math.max(0, accidentCover - existingAccidentInsurance);

    // Premium estimates
    const termPremium = this._estimateTermPremium(age, lifeInsuranceGap);
    const healthPremium = this._estimateHealthPremium(age, healthInsuranceGap, dependents);

    return {
      lifeInsurance: {
        required: Math.round(requiredLifeInsurance),
        existing: existingLifeInsurance,
        gap: Math.round(lifeInsuranceGap),
        breakdown: {
          incomeReplacement: Math.round(incomeReplacement),
          liabilities: Math.round(liabilityCover),
          childEducation: Math.round(childEducation)
        },
        estimatedMonthlyPremium: termPremium,
        recommendation: lifeInsuranceGap > 0
          ? `Get term insurance of ₹${(lifeInsuranceGap / 100000).toFixed(0)} lakhs. Estimated premium: ₹${termPremium}/month.`
          : 'Life insurance coverage is adequate.'
      },
      healthInsurance: {
        required: Math.round(recommendedHealth),
        existing: existingHealthInsurance,
        gap: Math.round(healthInsuranceGap),
        estimatedMonthlyPremium: healthPremium,
        recommendation: healthInsuranceGap > 0
          ? `Increase health cover by ₹${(healthInsuranceGap / 100000).toFixed(0)} lakhs. Consider super top-up plan.`
          : 'Health insurance coverage is adequate.'
      },
      criticalIllness: {
        recommended: Math.round(criticalIllnessCover),
        reason: 'Cancer/heart surgery average cost: ₹15-30 lakhs. Critical illness gives lump sum on diagnosis.',
        estimatedPremium: Math.round(criticalIllnessCover * 0.003 / 12)
      },
      personalAccident: {
        recommended: Math.round(accidentCover),
        existing: existingAccidentInsurance,
        gap: Math.round(accidentGap)
      },
      totalMonthlyPremium: termPremium + healthPremium + Math.round(criticalIllnessCover * 0.003 / 12),
      overallScore: this._calculateInsuranceScore({
        lifeInsuranceGap, requiredLifeInsurance,
        healthInsuranceGap, recommendedHealth
      }),
      priority: lifeInsuranceGap > 0 ? 'Get term insurance first' :
                healthInsuranceGap > 0 ? 'Increase health coverage' :
                'Coverage is adequate'
    };
  }

  _estimateTermPremium(age, coverAmount) {
    // Approximate Indian term insurance premiums
    const basePremiumPer10L = age < 30 ? 500 : age < 35 ? 600 : age < 40 ? 800 : age < 45 ? 1200 : 1800;
    return Math.round((coverAmount / 1000000) * basePremiumPer10L / 12);
  }

  _estimateHealthPremium(age, coverAmount, dependents) {
    const basePremiumPer5L = age < 35 ? 6000 : age < 45 ? 10000 : age < 55 ? 18000 : 30000;
    const familyMultiplier = 1 + (dependents - 1) * 0.3;
    return Math.round((coverAmount / 500000) * basePremiumPer5L * familyMultiplier / 12);
  }

  _calculateInsuranceScore(data) {
    let score = 100;
    if (data.lifeInsuranceGap > 0) {
      score -= Math.min(40, (data.lifeInsuranceGap / data.requiredLifeInsurance) * 40);
    }
    if (data.healthInsuranceGap > 0) {
      score -= Math.min(30, (data.healthInsuranceGap / data.recommendedHealth) * 30);
    }
    return Math.max(0, Math.round(score));
  }
}

// ============================================================================
// §5  LIFE STAGE FINANCIAL ADVISOR
// ============================================================================

class LifeStageAdvisor {
  getAdvice(config) {
    const { age, maritalStatus, hasKids, kidsCount, income, savings, hasHomeLoan } = config;

    const stage = this._determineLifeStage(age, maritalStatus, hasKids);
    const advice = this._getStageAdvice(stage, config);

    return {
      stage: stage.name,
      description: stage.description,
      ageBracket: stage.ageBracket,
      priorities: advice.priorities,
      milestones: advice.milestones,
      assetAllocation: advice.assetAllocation,
      keyActions: advice.keyActions,
      commonMistakes: advice.commonMistakes
    };
  }

  _determineLifeStage(age, maritalStatus, hasKids) {
    if (age < 25) return { name: 'Career Start', description: 'Building financial foundation', ageBracket: '22-25' };
    if (age < 30 && maritalStatus !== 'married') return { name: 'Growth Phase', description: 'Accelerating wealth creation', ageBracket: '25-30' };
    if (age < 35) return { name: 'Establishment', description: 'Building family and assets', ageBracket: '30-35' };
    if (age < 45) return { name: 'Peak Earning', description: 'Maximizing savings and investments', ageBracket: '35-45' };
    if (age < 55) return { name: 'Pre-Retirement', description: 'Securing retirement corpus', ageBracket: '45-55' };
    return { name: 'Retirement', description: 'Wealth preservation and distribution', ageBracket: '55+' };
  }

  _getStageAdvice(stage, config) {
    const stageAdvice = {
      'Career Start': {
        priorities: ['Build emergency fund (6 months)', 'Start SIP (even ₹500/month)', 'Get term + health insurance', 'Avoid lifestyle inflation'],
        milestones: ['₹1L emergency fund', 'First SIP investment', 'Health insurance', 'No credit card debt'],
        assetAllocation: { equity: 80, debt: 10, gold: 5, liquid: 5 },
        keyActions: ['Start with Nifty 50 index fund SIP', 'Automate savings on pay day', 'Learn about Section 80C'],
        commonMistakes: ['Not starting SIP early', 'Buying ULIPs/endowment plans', 'No health insurance', 'Excessive lifestyle spending']
      },
      'Growth Phase': {
        priorities: ['Maximize tax-saving investments', 'Increase SIP with salary hikes', 'Build investment portfolio', 'Start retirement planning'],
        milestones: ['6-month emergency fund', '₹10L invested', 'Full 80C utilization', 'Term insurance (50L+)'],
        assetAllocation: { equity: 70, debt: 15, gold: 5, liquid: 10 },
        keyActions: ['Step-up SIP by 10% annually', 'Diversify into mid-cap funds', 'Max out 80C, 80D, 80CCD', 'Consider PPF for debt allocation'],
        commonMistakes: ['No term insurance', 'Ignoring NPS 80CCD benefit', 'Mixing insurance with investment', 'No financial goals']
      },
      'Establishment': {
        priorities: ['Home loan planning', 'Child education fund', 'Adequate insurance coverage', 'Career growth investment'],
        milestones: ['Home purchase/down payment', 'Child education fund started', '₹50L+ invested', 'Will/nomination updated'],
        assetAllocation: { equity: 60, debt: 20, gold: 5, liquid: 10, 'real_estate': 5 },
        keyActions: ['Plan home loan EMI < 30% of income', 'Start child education SIP', 'Increase health cover to ₹10L+', 'Create a will'],
        commonMistakes: ['Over-leveraging on home loan', 'Neglecting retirement for kids\' education', 'Inadequate health insurance', 'No estate planning']
      },
      'Peak Earning': {
        priorities: ['Accelerate retirement savings', 'Prepay home loan', 'Higher education planning', 'Portfolio consolidation'],
        milestones: ['₹1Cr+ portfolio', 'Home loan 50% paid', 'Kids\' education fund on track', 'Comprehensive insurance'],
        assetAllocation: { equity: 50, debt: 25, gold: 10, liquid: 10, 'real_estate': 5 },
        keyActions: ['Max out all tax deductions', 'Consider lump-sum investments in dips', 'Consolidate multiple funds', 'Review and update nomination/will'],
        commonMistakes: ['Ignoring portfolio rebalancing', 'Not prepaying high-interest loans', 'Over-concentration in one asset', 'No health checkups']
      },
      'Pre-Retirement': {
        priorities: ['Secure retirement corpus', 'Reduce portfolio risk', 'Clear all debts', 'Health/medical planning'],
        milestones: ['Retirement corpus on track', 'All loans closed', 'Super top-up health plan', 'Estate plan complete'],
        assetAllocation: { equity: 35, debt: 35, gold: 10, liquid: 15, 'real_estate': 5 },
        keyActions: ['Gradually shift to debt (SWP strategy)', 'Build 2-year expense buffer in liquid', 'Get critical illness cover', 'Plan for post-retirement income streams'],
        commonMistakes: ['100% equity at 50+', 'Co-signing loans for children', 'Premature corpus withdrawal', 'Ignoring inflation for retirement']
      },
      'Retirement': {
        priorities: ['Income generation', 'Capital preservation', 'Healthcare planning', 'Legacy planning'],
        milestones: ['Monthly income stream set up', 'Will updated', 'Healthcare provision secured', 'Emergency fund maintained'],
        assetAllocation: { equity: 20, debt: 40, gold: 10, liquid: 25, 'real_estate': 5 },
        keyActions: ['Set up SWP for monthly income', 'Maintain 3-year expenses in liquid', 'Regular health checkups', 'Consider reverse mortgage if needed'],
        commonMistakes: ['Lending retirement corpus', 'No inflation adjustment in withdrawals', 'Inadequate medical fund', 'Not updating beneficiary nominees']
      }
    };

    return stageAdvice[stage.name] || stageAdvice['Growth Phase'];
  }
}

// ============================================================================
// §6  UNIFIED FINANCIAL PLANNING SERVICE
// ============================================================================

class FinancialPlanningService {
  constructor() {
    this.goalOptimizer = new GoalOptimizer();
    this.retirementPlanner = new RetirementPlanner();
    this.taxOptimizer = new TaxOptimizer();
    this.insuranceAnalyzer = new InsuranceGapAnalyzer();
    this.lifeStageAdvisor = new LifeStageAdvisor();
  }

  async generateComprehensivePlan(userId, data) {
    const results = {};

    // Goal optimization
    if (data.goals && data.goals.length > 0) {
      results.goalPlan = this.goalOptimizer.optimizeGoals(
        data.goals,
        data.monthlyIncome || 50000,
        data.savingsRate || 0.2
      );
    }

    // Retirement planning
    results.retirementPlan = this.retirementPlanner.plan({
      currentAge: data.age || 30,
      retirementAge: data.retirementAge || 55,
      currentMonthlyExpense: data.monthlyExpense || 40000,
      currentSavings: data.totalSavings || 0,
      monthlySIP: data.monthlySIP || 10000,
      expectedReturn: data.expectedReturn || 0.12
    });

    // Tax optimization
    if (data.annualIncome) {
      results.taxPlan = this.taxOptimizer.calculateTaxComparison(
        data.annualIncome,
        data.deductions || {}
      );
    }

    // Insurance gap analysis
    results.insurancePlan = this.insuranceAnalyzer.analyze({
      age: data.age || 30,
      annualIncome: data.annualIncome || (data.monthlyIncome || 50000) * 12,
      dependents: data.dependents || 2,
      existingLifeInsurance: data.lifeInsurance || 0,
      existingHealthInsurance: data.healthInsurance || 0,
      hasHomeLoan: !!data.homeLoan,
      homeLoanOutstanding: data.homeLoanOutstanding || 0,
      monthlyExpenses: data.monthlyExpense || 40000,
      hasKids: data.hasKids || false,
      kidsAge: data.kidsAge || []
    });

    // Life stage advice
    results.lifeStageAdvice = this.lifeStageAdvisor.getAdvice({
      age: data.age || 30,
      maritalStatus: data.maritalStatus || 'single',
      hasKids: data.hasKids || false,
      income: data.monthlyIncome || 50000,
      savings: data.totalSavings || 0
    });

    results.generatedAt = new Date();
    results.userId = userId;

    return results;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  GoalOptimizer,
  RetirementPlanner,
  TaxOptimizer,
  InsuranceGapAnalyzer,
  LifeStageAdvisor,
  FinancialPlanningService
};
