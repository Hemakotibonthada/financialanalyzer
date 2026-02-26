// ============================================================
// Financial Analyzer - Tax Optimization Service
// Feature #95: Indian tax optimization & planning engine
// ============================================================

class TaxOptimizationService {
  // Tax slabs for FY 2024-25 (New Regime - Default)
  static NEW_REGIME_SLABS = [
    { min: 0, max: 300000, rate: 0 },
    { min: 300001, max: 700000, rate: 5 },
    { min: 700001, max: 1000000, rate: 10 },
    { min: 1000001, max: 1200000, rate: 15 },
    { min: 1200001, max: 1500000, rate: 20 },
    { min: 1500001, max: Infinity, rate: 30 },
  ];

  // Tax slabs for FY 2024-25 (Old Regime)
  static OLD_REGIME_SLABS = [
    { min: 0, max: 250000, rate: 0 },
    { min: 250001, max: 500000, rate: 5 },
    { min: 500001, max: 1000000, rate: 20 },
    { min: 1000001, max: Infinity, rate: 30 },
  ];

  // Tax-saving investment limits
  static DEDUCTION_LIMITS = {
    section80C: {
      limit: 150000,
      name: 'Section 80C',
      description: 'PPF, ELSS, LIC, Home Loan Principal, Tuition Fees, etc.',
      investments: [
        { name: 'PPF (Public Provident Fund)', maxLimit: 150000, lockIn: '15 years', returns: '7.1% p.a.', risk: 'Very Low', taxOnReturns: 'Exempt' },
        { name: 'ELSS (Equity Linked Savings)', maxLimit: 150000, lockIn: '3 years', returns: '12-15% (historical)', risk: 'High', taxOnReturns: 'LTCG > ₹1L taxed at 10%' },
        { name: 'NSC (National Savings Certificate)', maxLimit: 150000, lockIn: '5 years', returns: '7.7% p.a.', risk: 'Very Low', taxOnReturns: 'Taxable' },
        { name: 'SCSS (Senior Citizen Savings)', maxLimit: 3000000, lockIn: '5 years', returns: '8.2% p.a.', risk: 'Very Low', taxOnReturns: 'Taxable', eligibility: 'Age 60+' },
        { name: 'Tax-Saving FD (5 Year)', maxLimit: 150000, lockIn: '5 years', returns: '6-7% p.a.', risk: 'Very Low', taxOnReturns: 'Taxable' },
        { name: 'Life Insurance Premium', maxLimit: 150000, lockIn: 'Policy term', returns: 'Varies', risk: 'Low', taxOnReturns: 'Generally Exempt' },
        { name: 'EPF (Employee Provident Fund)', maxLimit: 150000, lockIn: 'Till retirement', returns: '8.25% p.a.', risk: 'Very Low', taxOnReturns: 'Exempt (conditions apply)' },
        { name: 'Home Loan Principal', maxLimit: 150000, lockIn: 'Loan tenure', returns: 'N/A (saves interest)', risk: 'N/A', taxOnReturns: 'N/A' },
        { name: 'Children Tuition Fees', maxLimit: 150000, lockIn: 'N/A', returns: 'N/A', risk: 'N/A', taxOnReturns: 'N/A', eligibility: 'Max 2 children' },
        { name: 'Sukanya Samriddhi Yojana', maxLimit: 150000, lockIn: '21 years', returns: '8.2% p.a.', risk: 'Very Low', taxOnReturns: 'Exempt', eligibility: 'Girl child (age < 10)' },
      ],
    },
    section80CCD1B: {
      limit: 50000,
      name: 'Section 80CCD(1B)',
      description: 'Additional NPS contribution (over and above 80C)',
      investments: [
        { name: 'NPS (National Pension System)', maxLimit: 50000, lockIn: 'Till 60', returns: '9-12% (historical)', risk: 'Moderate', taxOnReturns: '60% exempt, 40% annuity' },
      ],
    },
    section80D: {
      limit: 25000,
      name: 'Section 80D',
      description: 'Health Insurance Premium',
      tiers: [
        { description: 'Self & Family (< 60 years)', limit: 25000 },
        { description: 'Parents (< 60 years)', limit: 25000 },
        { description: 'Self & Family (Senior Citizen)', limit: 50000 },
        { description: 'Parents (Senior Citizen)', limit: 50000 },
        { description: 'Preventive Health Checkup', limit: 5000, note: 'Included in above limits' },
      ],
      maxTotal: 100000,
    },
    section80E: {
      limit: Infinity,
      name: 'Section 80E',
      description: 'Education Loan Interest (no upper limit, 8 years)',
    },
    section80G: {
      limit: Infinity,
      name: 'Section 80G',
      description: 'Donations to eligible charities (50% or 100% deduction)',
    },
    section80TTA: {
      limit: 10000,
      name: 'Section 80TTA',
      description: 'Interest on Savings Bank Account',
    },
    section24B: {
      limit: 200000,
      name: 'Section 24(b)',
      description: 'Home Loan Interest for self-occupied property',
    },
    standardDeduction: {
      limit: 75000,
      name: 'Standard Deduction',
      description: 'Standard deduction for salaried employees (New Regime: ₹75,000)',
    },
    hra: {
      name: 'HRA Exemption',
      description: 'House Rent Allowance exemption (Old Regime only)',
      calculation: 'Minimum of: Actual HRA, Rent - 10% of Basic, 50% of Basic (Metro) / 40% (Non-Metro)',
    },
  };

  /**
   * Calculate tax under both regimes and recommend
   */
  static calculateTax(incomeDetails) {
    const {
      grossSalary = 0,
      basicSalary = 0,
      hra = 0,
      rentPaid = 0,
      isMetroCity = true,
      otherIncome = 0,
      section80C = 0,
      section80CCD1B = 0,
      section80D = 0,
      section80E = 0,
      section80G = 0,
      section80TTA = 0,
      homeLoanInterest = 0,
      homeLoanPrincipal = 0,
      age = 30,
    } = incomeDetails;

    const totalIncome = grossSalary + otherIncome;

    // ============= OLD REGIME CALCULATION =============
    let oldRegimeDeductions = 50000; // Standard deduction (old regime)

    // HRA Exemption
    let hraExemption = 0;
    if (hra > 0 && rentPaid > 0) {
      const basicForHRA = basicSalary;
      hraExemption = Math.min(
        hra,
        rentPaid - (0.10 * basicForHRA * 12),
        (isMetroCity ? 0.50 : 0.40) * basicForHRA * 12
      );
      hraExemption = Math.max(0, hraExemption);
      oldRegimeDeductions += hraExemption;
    }

    // Section 80C
    const actual80C = Math.min(section80C + homeLoanPrincipal, this.DEDUCTION_LIMITS.section80C.limit);
    oldRegimeDeductions += actual80C;

    // Section 80CCD(1B)
    const actual80CCD = Math.min(section80CCD1B, this.DEDUCTION_LIMITS.section80CCD1B.limit);
    oldRegimeDeductions += actual80CCD;

    // Section 80D
    const actual80D = Math.min(section80D, this.DEDUCTION_LIMITS.section80D.maxTotal);
    oldRegimeDeductions += actual80D;

    // Section 80E
    oldRegimeDeductions += section80E;

    // Section 80G
    oldRegimeDeductions += section80G;

    // Section 80TTA
    const actual80TTA = Math.min(section80TTA, this.DEDUCTION_LIMITS.section80TTA.limit);
    oldRegimeDeductions += actual80TTA;

    // Section 24(b) - Home Loan Interest
    const actualHomeLoanInterest = Math.min(homeLoanInterest, this.DEDUCTION_LIMITS.section24B.limit);
    oldRegimeDeductions += actualHomeLoanInterest;

    const oldRegimeTaxableIncome = Math.max(0, totalIncome - oldRegimeDeductions);
    const oldRegimeTax = this._calculateSlabTax(oldRegimeTaxableIncome, this.OLD_REGIME_SLABS, age);

    // ============= NEW REGIME CALCULATION =============
    const newRegimeDeductions = 75000; // Standard deduction only
    const newRegimeTaxableIncome = Math.max(0, totalIncome - newRegimeDeductions);
    const newRegimeTax = this._calculateSlabTax(newRegimeTaxableIncome, this.NEW_REGIME_SLABS, age);

    // Add 4% Health & Education Cess
    const oldRegimeFinalTax = Math.round(oldRegimeTax * 1.04);
    const newRegimeFinalTax = Math.round(newRegimeTax * 1.04);

    // Determine recommendation
    const recommended = newRegimeFinalTax <= oldRegimeFinalTax ? 'new' : 'old';
    const taxSaving = Math.abs(newRegimeFinalTax - oldRegimeFinalTax);

    return {
      success: true,
      income: {
        grossSalary,
        otherIncome,
        totalIncome,
      },
      oldRegime: {
        deductions: {
          standardDeduction: 50000,
          hraExemption,
          section80C: actual80C,
          section80CCD1B: actual80CCD,
          section80D: actual80D,
          section80E,
          section80G,
          section80TTA: actual80TTA,
          homeLoanInterest: actualHomeLoanInterest,
          total: oldRegimeDeductions,
        },
        taxableIncome: oldRegimeTaxableIncome,
        tax: oldRegimeTax,
        cess: Math.round(oldRegimeTax * 0.04),
        totalTax: oldRegimeFinalTax,
        effectiveRate: totalIncome > 0 ? Math.round((oldRegimeFinalTax / totalIncome) * 10000) / 100 : 0,
        monthlyTax: Math.round(oldRegimeFinalTax / 12),
      },
      newRegime: {
        deductions: {
          standardDeduction: 75000,
          total: newRegimeDeductions,
        },
        taxableIncome: newRegimeTaxableIncome,
        tax: newRegimeTax,
        cess: Math.round(newRegimeTax * 0.04),
        totalTax: newRegimeFinalTax,
        effectiveRate: totalIncome > 0 ? Math.round((newRegimeFinalTax / totalIncome) * 10000) / 100 : 0,
        monthlyTax: Math.round(newRegimeFinalTax / 12),
      },
      recommendation: {
        regime: recommended,
        regimeName: recommended === 'new' ? 'New Tax Regime' : 'Old Tax Regime',
        taxSaving,
        reason: recommended === 'new'
          ? 'New regime offers lower tax due to reduced slab rates'
          : 'Old regime offers lower tax due to available deductions',
      },
      breakEvenDeductions: this._calculateBreakEven(totalIncome),
    };
  }

  /**
   * Suggest tax-saving investments
   */
  static suggestTaxSavingInvestments(incomeDetails) {
    const {
      grossSalary = 0,
      age = 30,
      riskTolerance = 'moderate',
      existing80C = 0,
      existing80CCD = 0,
      existing80D = 0,
    } = incomeDetails;

    const suggestions = [];
    const totalIncome = grossSalary;

    // Section 80C suggestions
    const remaining80C = Math.max(0, 150000 - existing80C);
    if (remaining80C > 0) {
      const investmentSuggestions = [];

      if (riskTolerance === 'aggressive' || riskTolerance === 'moderate') {
        investmentSuggestions.push({
          name: 'ELSS Mutual Funds',
          amount: Math.min(remaining80C, remaining80C * 0.60),
          reason: 'Lowest lock-in (3 years), best potential returns',
          priority: 1,
        });
      }

      investmentSuggestions.push({
        name: 'PPF',
        amount: Math.min(remaining80C * 0.30, 150000),
        reason: 'Safe, tax-free returns, good for long-term',
        priority: 2,
      });

      if (riskTolerance === 'conservative') {
        investmentSuggestions.push({
          name: 'Tax-Saving Fixed Deposit',
          amount: Math.min(remaining80C * 0.40, 150000),
          reason: 'Guaranteed returns, suitable for conservative investors',
          priority: 2,
        });
      }

      suggestions.push({
        section: '80C',
        limit: 150000,
        utilized: existing80C,
        remaining: remaining80C,
        taxSaving: Math.round(remaining80C * this._getMarginalRate(totalIncome) / 100),
        investments: investmentSuggestions,
      });
    }

    // Section 80CCD(1B) - NPS
    const remaining80CCD = Math.max(0, 50000 - existing80CCD);
    if (remaining80CCD > 0) {
      suggestions.push({
        section: '80CCD(1B)',
        limit: 50000,
        utilized: existing80CCD,
        remaining: remaining80CCD,
        taxSaving: Math.round(remaining80CCD * this._getMarginalRate(totalIncome) / 100),
        investments: [
          {
            name: 'NPS (National Pension System)',
            amount: remaining80CCD,
            reason: 'Additional ₹50K deduction beyond Section 80C, good returns',
            priority: 1,
          },
        ],
      });
    }

    // Section 80D - Health Insurance
    const remaining80D = Math.max(0, 25000 - existing80D);
    if (remaining80D > 0) {
      suggestions.push({
        section: '80D',
        limit: age >= 60 ? 50000 : 25000,
        utilized: existing80D,
        remaining: remaining80D,
        taxSaving: Math.round(remaining80D * this._getMarginalRate(totalIncome) / 100),
        investments: [
          {
            name: 'Health Insurance Premium',
            amount: remaining80D,
            reason: 'Essential protection + tax benefit',
            priority: 1,
          },
          {
            name: 'Parents Health Insurance',
            amount: Math.min(25000, 50000),
            reason: 'Additional deduction for parents insurance',
            priority: 2,
          },
        ],
      });
    }

    // Calculate total potential tax saving
    const totalPotentialSaving = suggestions.reduce((s, sg) => s + sg.taxSaving, 0);

    return {
      success: true,
      currentTaxBracket: `${this._getMarginalRate(totalIncome)}%`,
      suggestions,
      totalPotentialTaxSaving: totalPotentialSaving,
      totalInvestmentNeeded: suggestions.reduce((s, sg) => s + sg.remaining, 0),
      monthlyInvestmentNeeded: Math.round(suggestions.reduce((s, sg) => s + sg.remaining, 0) / 12),
      timeline: this._generateInvestmentTimeline(suggestions),
    };
  }

  /**
   * Tax calendar with important dates
   */
  static getTaxCalendar(fy = '2024-25') {
    return {
      success: true,
      financialYear: fy,
      importantDates: [
        { date: 'April 1', description: 'Financial Year begins', category: 'fy' },
        { date: 'June 15', description: 'Advance Tax - 1st Installment (15% of estimated tax)', category: 'advance_tax' },
        { date: 'July 31', description: 'ITR Filing Deadline (non-audit cases)', category: 'itr' },
        { date: 'September 15', description: 'Advance Tax - 2nd Installment (45% cumulative)', category: 'advance_tax' },
        { date: 'October 31', description: 'ITR Filing Deadline (audit cases)', category: 'itr' },
        { date: 'December 15', description: 'Advance Tax - 3rd Installment (75% cumulative)', category: 'advance_tax' },
        { date: 'December 31', description: 'Revised/Belated Return Deadline', category: 'itr' },
        { date: 'January 15', description: 'Quarterly TDS/TCS Return (Q3)', category: 'tds' },
        { date: 'March 15', description: 'Advance Tax - 4th Installment (100% cumulative)', category: 'advance_tax' },
        { date: 'March 31', description: 'Financial Year ends / Last day for 80C investments', category: 'fy' },
      ],
      taxSavingDeadlines: [
        { investment: 'ELSS Investment', deadline: 'March 31', note: 'Invest before March 31 for current FY deduction' },
        { investment: 'PPF Contribution', deadline: 'April 5 (for interest)', note: 'Deposit before 5th to earn interest for that month' },
        { investment: 'NPS Contribution', deadline: 'March 31', note: 'Complete contribution before FY end' },
        { investment: 'Health Insurance', deadline: 'March 31', note: 'Renew/purchase before FY end' },
        { investment: 'Life Insurance', deadline: 'Premium due date', note: 'Pay premium on time' },
      ],
    };
  }

  // ======================== HELPER METHODS ========================

  static _calculateSlabTax(taxableIncome, slabs, age = 30) {
    let tax = 0;

    for (const slab of slabs) {
      if (taxableIncome > slab.min) {
        const taxableInSlab = Math.min(taxableIncome, slab.max) - slab.min + 1;
        tax += (taxableInSlab * slab.rate) / 100;
      }
    }

    // Section 87A Rebate (for income up to ₹7L in new regime, ₹5L in old)
    if (slabs === this.NEW_REGIME_SLABS && taxableIncome <= 700000) {
      tax = Math.max(0, tax - 25000);
    } else if (slabs === this.OLD_REGIME_SLABS && taxableIncome <= 500000) {
      tax = Math.max(0, tax - 12500);
    }

    // Surcharge for high income
    if (taxableIncome > 50000000) {
      tax *= 1.37; // 37% surcharge
    } else if (taxableIncome > 20000000) {
      tax *= 1.25; // 25% surcharge
    } else if (taxableIncome > 10000000) {
      tax *= 1.15; // 15% surcharge
    } else if (taxableIncome > 5000000) {
      tax *= 1.10; // 10% surcharge
    }

    return Math.round(tax);
  }

  static _getMarginalRate(income) {
    if (income > 1500000) return 30;
    if (income > 1200000) return 20;
    if (income > 1000000) return 15;
    if (income > 700000) return 10;
    if (income > 300000) return 5;
    return 0;
  }

  static _calculateBreakEven(totalIncome) {
    // Calculate deductions needed for old regime to beat new regime
    const newRegimeTax = this._calculateSlabTax(Math.max(0, totalIncome - 75000), this.NEW_REGIME_SLABS);
    
    // Binary search for break-even deductions
    let low = 0, high = totalIncome;
    while (high - low > 1000) {
      const mid = Math.floor((low + high) / 2);
      const oldTax = this._calculateSlabTax(Math.max(0, totalIncome - mid - 50000), this.OLD_REGIME_SLABS);
      if (oldTax > newRegimeTax) {
        low = mid;
      } else {
        high = mid;
      }
    }

    return {
      deductionsNeeded: Math.round(high),
      description: `You need at least ₹${high.toLocaleString('en-IN')} in deductions for old regime to be beneficial`,
    };
  }

  static _generateInvestmentTimeline(suggestions) {
    const months = [];
    const totalNeeded = suggestions.reduce((s, sg) => s + sg.remaining, 0);
    const monthly = Math.round(totalNeeded / 12);

    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      months.push({
        month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
        amount: monthly,
        cumulative: monthly * (i + 1),
        progress: Math.round(((i + 1) / 12) * 100),
      });
    }

    return months;
  }
}

module.exports = TaxOptimizationService;
