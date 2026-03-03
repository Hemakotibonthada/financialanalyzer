// ============================================================================
// ENTERPRISE TAX OPTIMIZATION ENGINE — India-Specific Tax Planning
// ============================================================================
// Comprehensive Indian tax calculation, regime comparison, investment
// suggestions, HRA/80C/80D optimizations, and tax calendar.
// ============================================================================

const logger = require('../utils/logger');
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ============================================================================
// §1  TAX SLAB DEFINITIONS — FY 2025-26
// ============================================================================

const OLD_REGIME_SLABS = [
  { min: 0, max: 250000, rate: 0, label: 'Up to ₹2.5L' },
  { min: 250001, max: 500000, rate: 5, label: '₹2.5L – ₹5L' },
  { min: 500001, max: 1000000, rate: 20, label: '₹5L – ₹10L' },
  { min: 1000001, max: Infinity, rate: 30, label: 'Above ₹10L' },
];

const NEW_REGIME_SLABS = [
  { min: 0, max: 300000, rate: 0, label: 'Up to ₹3L' },
  { min: 300001, max: 700000, rate: 5, label: '₹3L – ₹7L' },
  { min: 700001, max: 1000000, rate: 10, label: '₹7L – ₹10L' },
  { min: 1000001, max: 1200000, rate: 15, label: '₹10L – ₹12L' },
  { min: 1200001, max: 1500000, rate: 20, label: '₹12L – ₹15L' },
  { min: 1500001, max: Infinity, rate: 30, label: 'Above ₹15L' },
];

const SENIOR_OLD_REGIME_SLABS = [
  { min: 0, max: 300000, rate: 0, label: 'Up to ₹3L' },
  { min: 300001, max: 500000, rate: 5, label: '₹3L – ₹5L' },
  { min: 500001, max: 1000000, rate: 20, label: '₹5L – ₹10L' },
  { min: 1000001, max: Infinity, rate: 30, label: 'Above ₹10L' },
];

// ============================================================================
// §2  DEDUCTION LIMITS
// ============================================================================

const DEDUCTION_LIMITS = {
  '80C': {
    limit: 150000,
    description: 'PPF, ELSS, LIC, EPF, NSC, Tax-saving FD, Tuition fees',
    instruments: [
      { name: 'PPF (Public Provident Fund)', limit: 150000, lockIn: '15 years', returns: '7.1%', risk: 'Risk-free', recommended: true },
      { name: 'ELSS (Equity Linked Savings Scheme)', limit: 150000, lockIn: '3 years', returns: '12-15%', risk: 'Market-linked', recommended: true },
      { name: 'NSC (National Savings Certificate)', limit: 150000, lockIn: '5 years', returns: '7.7%', risk: 'Risk-free' },
      { name: 'Tax-Saving FD', limit: 150000, lockIn: '5 years', returns: '6-7%', risk: 'Risk-free' },
      { name: 'NPS (Section 80CCD(1))', limit: 150000, lockIn: 'Till 60', returns: '8-10%', risk: 'Market-linked' },
      { name: 'LIC Premium', limit: 150000, lockIn: 'Policy term', returns: '4-6%', risk: 'Risk-free' },
      { name: 'EPF (Employee Provident Fund)', limit: 150000, lockIn: 'Till retirement', returns: '8.25%', risk: 'Risk-free' },
      { name: 'Sukanya Samriddhi Yojana', limit: 150000, lockIn: '21 years', returns: '8.2%', risk: 'Risk-free' },
      { name: 'ULIP', limit: 150000, lockIn: '5 years', returns: 'Variable', risk: 'Market-linked' },
      { name: 'Tuition Fees (Max 2 children)', limit: 150000, lockIn: 'N/A', returns: 'N/A', risk: 'N/A' },
    ],
  },
  '80CCD(1B)': {
    limit: 50000,
    description: 'Additional NPS contribution',
    instruments: [
      { name: 'NPS Additional Contribution', limit: 50000, lockIn: 'Till 60', returns: '8-10%', risk: 'Market-linked', recommended: true },
    ],
  },
  '80D': {
    limit: 100000,
    description: 'Health insurance premiums',
    details: [
      { category: 'Self & Family', limit: 25000, seniorLimit: 50000 },
      { category: 'Parents', limit: 25000, seniorParentLimit: 50000 },
      { category: 'Preventive Health Checkup', limit: 5000, note: 'Within overall limit' },
    ],
  },
  '80E': {
    limit: Infinity,
    description: 'Interest on education loan (no upper limit)',
    duration: 'Max 8 years from first repayment year',
  },
  '80G': {
    limit: Infinity,
    description: 'Donations to approved funds/charities',
    categories: [
      { type: '100% deduction', examples: 'PM Relief Fund, National Defence Fund' },
      { type: '50% deduction', examples: 'PM Drought Relief, National Foundation for Communal Harmony' },
      { type: '100% with limit', examples: 'Approved Institute/Hospital', limit: '10% of gross income' },
    ],
  },
  '80TTA': {
    limit: 10000,
    description: 'Interest on savings account',
  },
  '80TTB': {
    limit: 50000,
    description: 'Interest income for senior citizens',
  },
  '24(b)': {
    limit: 200000,
    description: 'Home loan interest (self-occupied)',
    letOut: 'No limit for let-out property',
  },
  'HRA': {
    description: 'House Rent Allowance exemption',
    calculation: 'Min of: Actual HRA, Rent paid - 10% of salary, 50% of salary (metro) / 40% (non-metro)',
  },
  'Standard Deduction': {
    limit: 75000,
    description: 'Standard deduction for salaried employees (FY 2025-26)',
  },
};

// ============================================================================
// §3  TAX CALCULATOR
// ============================================================================

class TaxCalculator {
  calculateTax(params) {
    const {
      grossIncome = 0,
      hra = 0,
      lta = 0,
      specialAllowance = 0,
      otherIncome = 0,
      rentPaid = 0,
      isMetro = true,
      isSenior = false,
      deductions = {},
      homeLoanInterest = 0,
      employerEPF = 0,
      employeeEPF = 0,
    } = params;

    const totalIncome = grossIncome + otherIncome;

    // Calculate Old Regime
    const oldRegime = this._calculateOldRegime({
      totalIncome, hra, lta, rentPaid, isMetro, isSenior,
      deductions, homeLoanInterest, employerEPF, employeeEPF,
      grossIncome,
    });

    // Calculate New Regime
    const newRegime = this._calculateNewRegime({ totalIncome, isSenior });

    // Comparison
    const savings = oldRegime.totalTax - newRegime.totalTax;
    const recommended = savings > 0 ? 'new' : 'old';
    const benefitAmount = Math.abs(savings);

    return {
      success: true,
      grossIncome: totalIncome,
      oldRegime,
      newRegime,
      comparison: {
        recommended,
        savings: benefitAmount,
        savingsPercentage: totalIncome > 0 ? Math.round((benefitAmount / totalIncome) * 100 * 10) / 10 : 0,
        message: `${recommended === 'new' ? 'New' : 'Old'} regime saves you ₹${benefitAmount.toLocaleString()}`,
      },
      effectiveTaxRate: {
        old: totalIncome > 0 ? Math.round((oldRegime.totalTax / totalIncome) * 100 * 10) / 10 : 0,
        new: totalIncome > 0 ? Math.round((newRegime.totalTax / totalIncome) * 100 * 10) / 10 : 0,
      },
      breakeven: this._calculateBreakeven(totalIncome),
    };
  }

  _calculateOldRegime(params) {
    const {
      totalIncome, hra, rentPaid, isMetro, isSenior,
      deductions, homeLoanInterest, employeeEPF, grossIncome,
    } = params;

    // Standard deduction
    const standardDeduction = Math.min(75000, totalIncome);

    // HRA exemption
    let hraExemption = 0;
    if (hra > 0 && rentPaid > 0) {
      const basicSalary = grossIncome * 0.5; // Approximate basic as 50% of gross
      hraExemption = Math.min(
        hra,
        rentPaid - 0.1 * basicSalary,
        (isMetro ? 0.5 : 0.4) * basicSalary
      );
      hraExemption = Math.max(0, hraExemption);
    }

    // Section 80C
    const section80C = Math.min(
      150000,
      (deductions['80C'] || 0) + (employeeEPF || 0)
    );

    // Section 80CCD(1B) - Additional NPS
    const section80CCD1B = Math.min(50000, deductions['80CCD1B'] || 0);

    // Section 80D - Health Insurance
    const section80D = Math.min(100000, deductions['80D'] || 0);

    // Section 24(b) - Home Loan Interest
    const section24b = Math.min(200000, homeLoanInterest || 0);

    // Section 80E - Education Loan Interest
    const section80E = deductions['80E'] || 0;

    // Section 80G - Donations
    const section80G = deductions['80G'] || 0;

    // Section 80TTA/TTB - Savings Interest
    const section80TTA = Math.min(isSenior ? 50000 : 10000, deductions['80TTA'] || 0);

    // Total deductions
    const totalDeductions = standardDeduction + hraExemption + section80C + section80CCD1B +
      section80D + section24b + section80E + section80G + section80TTA;

    const taxableIncome = Math.max(0, totalIncome - totalDeductions);

    // Calculate tax
    const slabs = isSenior ? SENIOR_OLD_REGIME_SLABS : OLD_REGIME_SLABS;
    const { tax, breakdown } = this._applySlabs(taxableIncome, slabs);

    // Rebate u/s 87A (for income up to ₹5L)
    const rebate87A = taxableIncome <= 500000 ? Math.min(tax, 12500) : 0;

    const taxAfterRebate = tax - rebate87A;
    const surcharge = this._calculateSurcharge(totalIncome, taxAfterRebate);
    const cess = Math.round((taxAfterRebate + surcharge) * 0.04);
    const totalTax = Math.round(taxAfterRebate + surcharge + cess);

    return {
      regime: 'old',
      taxableIncome: Math.round(taxableIncome),
      baseTax: Math.round(tax),
      rebate87A: Math.round(rebate87A),
      surcharge: Math.round(surcharge),
      cess: Math.round(cess),
      totalTax: Math.max(0, totalTax),
      deductions: {
        standardDeduction: Math.round(standardDeduction),
        hra: Math.round(hraExemption),
        section80C: Math.round(section80C),
        section80CCD1B: Math.round(section80CCD1B),
        section80D: Math.round(section80D),
        section24b: Math.round(section24b),
        section80E: Math.round(section80E),
        section80G: Math.round(section80G),
        section80TTA: Math.round(section80TTA),
        total: Math.round(totalDeductions),
      },
      breakdown,
      monthlyTax: Math.round(totalTax / 12),
      takeHome: Math.round((totalIncome - totalTax) / 12),
    };
  }

  _calculateNewRegime(params) {
    const { totalIncome, isSenior } = params;

    // New regime: only standard deduction of ₹75,000
    const standardDeduction = Math.min(75000, totalIncome);
    const taxableIncome = Math.max(0, totalIncome - standardDeduction);

    const { tax, breakdown } = this._applySlabs(taxableIncome, NEW_REGIME_SLABS);

    // Rebate u/s 87A (for income up to ₹7L in new regime)
    const rebate87A = taxableIncome <= 700000 ? Math.min(tax, 25000) : 0;

    const taxAfterRebate = tax - rebate87A;
    const surcharge = this._calculateSurcharge(totalIncome, taxAfterRebate);
    const cess = Math.round((taxAfterRebate + surcharge) * 0.04);
    const totalTax = Math.round(taxAfterRebate + surcharge + cess);

    return {
      regime: 'new',
      taxableIncome: Math.round(taxableIncome),
      baseTax: Math.round(tax),
      rebate87A: Math.round(rebate87A),
      surcharge: Math.round(surcharge),
      cess: Math.round(cess),
      totalTax: Math.max(0, totalTax),
      deductions: {
        standardDeduction: Math.round(standardDeduction),
        total: Math.round(standardDeduction),
      },
      breakdown,
      monthlyTax: Math.round(totalTax / 12),
      takeHome: Math.round((totalIncome - totalTax) / 12),
    };
  }

  _applySlabs(taxableIncome, slabs) {
    let remaining = taxableIncome;
    let totalTax = 0;
    const breakdown = [];

    for (const slab of slabs) {
      if (remaining <= 0) break;
      const slabWidth = slab.max === Infinity ? remaining : Math.min(remaining, slab.max - slab.min + 1);
      const taxForSlab = Math.round(slabWidth * (slab.rate / 100));
      totalTax += taxForSlab;
      breakdown.push({
        slab: slab.label,
        income: Math.round(slabWidth),
        rate: slab.rate,
        tax: taxForSlab,
      });
      remaining -= slabWidth;
    }

    return { tax: totalTax, breakdown };
  }

  _calculateSurcharge(totalIncome, tax) {
    if (totalIncome > 50000000) return Math.round(tax * 0.37); // 37% for > 5Cr
    if (totalIncome > 20000000) return Math.round(tax * 0.25); // 25% for > 2Cr
    if (totalIncome > 10000000) return Math.round(tax * 0.15); // 15% for > 1Cr
    if (totalIncome > 5000000) return Math.round(tax * 0.10); // 10% for > 50L
    return 0;
  }

  _calculateBreakeven(income) {
    // Calculate the deduction amount where old regime becomes more beneficial
    // than new regime
    const newTax = this._calculateNewRegime({ totalIncome: income, isSenior: false }).totalTax;

    let low = 0, high = Math.min(income, 500000);
    while (high - low > 1000) {
      const mid = Math.floor((low + high) / 2);
      const oldTaxable = Math.max(0, income - mid);
      const { tax } = this._applySlabs(oldTaxable, OLD_REGIME_SLABS);
      const rebate = oldTaxable <= 500000 ? Math.min(tax, 12500) : 0;
      const surcharge = this._calculateSurcharge(income, tax - rebate);
      const cess = Math.round((tax - rebate + surcharge) * 0.04);
      const oldTotal = Math.max(0, tax - rebate + surcharge + cess);

      if (oldTotal > newTax) low = mid; else high = mid;
    }

    return {
      deductionNeeded: Math.round(high),
      message: `You need at least ₹${Math.round(high).toLocaleString()} in deductions for old regime to be beneficial`,
    };
  }
}

// ============================================================================
// §4  TAX PLANNING ADVISOR
// ============================================================================

class TaxPlanningAdvisor {
  suggestTaxSavingInvestments(params) {
    const {
      grossIncome = 0,
      existingDeductions = {},
      riskAppetite = 'moderate',
      age = 30,
      existingInvestments = [],
    } = params;

    const suggestions = [];
    const used80C = existingDeductions['80C'] || 0;
    const remaining80C = Math.max(0, 150000 - used80C);

    // 80C suggestions
    if (remaining80C > 0) {
      const instruments = DEDUCTION_LIMITS['80C'].instruments;
      const filtered = instruments.filter(inst => {
        if (riskAppetite === 'low') return inst.risk === 'Risk-free';
        if (riskAppetite === 'high') return true;
        return true;
      });

      const recommended = [];
      if (riskAppetite !== 'low' && remaining80C >= 50000) {
        recommended.push({
          instrument: 'ELSS Mutual Fund',
          amount: Math.min(remaining80C, 100000),
          reason: 'Shortest lock-in (3 years) with best potential returns (12-15%)',
          taxSaving: Math.round(Math.min(remaining80C, 100000) * 0.3),
          priority: 1,
        });
      }

      if (remaining80C >= 50000) {
        recommended.push({
          instrument: 'PPF',
          amount: Math.min(remaining80C > 100000 ? remaining80C - 100000 : remaining80C, 150000),
          reason: 'EEE status (exempt-exempt-exempt), risk-free 7.1% returns',
          taxSaving: Math.round(Math.min(remaining80C, 150000) * 0.3),
          priority: 2,
        });
      }

      suggestions.push({
        section: '80C',
        limit: 150000,
        used: used80C,
        remaining: remaining80C,
        recommendations: recommended,
        potentialSaving: Math.round(remaining80C * 0.3), // Assuming 30% bracket
      });
    }

    // 80CCD(1B) - NPS
    const usedNPS = existingDeductions['80CCD1B'] || 0;
    const remainingNPS = Math.max(0, 50000 - usedNPS);
    if (remainingNPS > 0) {
      suggestions.push({
        section: '80CCD(1B)',
        limit: 50000,
        used: usedNPS,
        remaining: remainingNPS,
        recommendations: [{
          instrument: 'NPS (National Pension System)',
          amount: remainingNPS,
          reason: 'Additional ₹50,000 deduction over 80C. Good for retirement planning.',
          taxSaving: Math.round(remainingNPS * 0.3),
          priority: 3,
        }],
        potentialSaving: Math.round(remainingNPS * 0.3),
      });
    }

    // 80D - Health Insurance
    const used80D = existingDeductions['80D'] || 0;
    const limit80D = age >= 60 ? 100000 : 50000;
    const remaining80D = Math.max(0, limit80D - used80D);
    if (remaining80D > 0) {
      suggestions.push({
        section: '80D',
        limit: limit80D,
        used: used80D,
        remaining: remaining80D,
        recommendations: [{
          instrument: 'Health Insurance Premium',
          amount: remaining80D,
          reason: 'Essential protection + tax deduction. Cover self, spouse, children, and parents.',
          taxSaving: Math.round(remaining80D * 0.3),
          priority: 1,
        }],
        potentialSaving: Math.round(remaining80D * 0.3),
      });
    }

    // Section 24(b) - Home Loan
    const usedHomeLoan = existingDeductions['24b'] || 0;
    if (usedHomeLoan === 0 && grossIncome > 1000000) {
      suggestions.push({
        section: '24(b)',
        limit: 200000,
        used: 0,
        remaining: 200000,
        recommendations: [{
          instrument: 'Home Loan Interest',
          amount: 200000,
          reason: 'If planning to buy property, home loan interest up to ₹2L is deductible',
          taxSaving: Math.round(200000 * 0.3),
          priority: 4,
        }],
        potentialSaving: Math.round(200000 * 0.3),
        note: 'Only applicable if you have a home loan',
      });
    }

    // Total potential savings
    const totalPotentialSaving = suggestions.reduce((s, sec) => s + (sec.potentialSaving || 0), 0);

    // Investment priority matrix
    const priorityMatrix = this._buildPriorityMatrix(riskAppetite, age, grossIncome);

    return {
      success: true,
      suggestions,
      totalPotentialSaving,
      totalDeductionsAvailable: suggestions.reduce((s, sec) => s + (sec.remaining || 0), 0),
      priorityMatrix,
      timeline: this._getInvestmentTimeline(),
      tips: this._getTaxTips(grossIncome, existingDeductions),
    };
  }

  _buildPriorityMatrix(risk, age, income) {
    const matrix = [];

    if (risk === 'high' || (risk === 'moderate' && age < 35)) {
      matrix.push({ priority: 1, instrument: 'ELSS', allocation: '40%', reason: 'High growth, shortest lock-in' });
      matrix.push({ priority: 2, instrument: 'PPF', allocation: '25%', reason: 'Safe foundation' });
      matrix.push({ priority: 3, instrument: 'NPS', allocation: '20%', reason: 'Retirement + extra deduction' });
      matrix.push({ priority: 4, instrument: 'Health Insurance', allocation: '15%', reason: 'Essential protection' });
    } else if (risk === 'moderate') {
      matrix.push({ priority: 1, instrument: 'PPF', allocation: '35%', reason: 'Safe guaranteed returns' });
      matrix.push({ priority: 2, instrument: 'ELSS', allocation: '30%', reason: 'Growth with manageable risk' });
      matrix.push({ priority: 3, instrument: 'NPS', allocation: '20%', reason: 'Retirement planning' });
      matrix.push({ priority: 4, instrument: 'Health Insurance', allocation: '15%', reason: 'Essential' });
    } else {
      matrix.push({ priority: 1, instrument: 'PPF', allocation: '40%', reason: 'Safest instrument' });
      matrix.push({ priority: 2, instrument: 'Tax-Saving FD', allocation: '25%', reason: 'Bank-guaranteed returns' });
      matrix.push({ priority: 3, instrument: 'NSC', allocation: '20%', reason: 'Government-backed' });
      matrix.push({ priority: 4, instrument: 'Health Insurance', allocation: '15%', reason: 'Essential' });
    }

    return matrix;
  }

  _getInvestmentTimeline() {
    const now = new Date();
    const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

    return {
      currentFY: `${fy}-${(fy + 1).toString().slice(2)}`,
      deadlines: [
        { date: `${fy + 1}-03-31`, event: 'Tax-saving investment deadline', daysLeft: Math.max(0, Math.round((new Date(fy + 1, 2, 31) - now) / 86400000)) },
        { date: `${fy + 1}-07-31`, event: 'ITR filing deadline', daysLeft: Math.max(0, Math.round((new Date(fy + 1, 6, 31) - now) / 86400000)) },
        { date: `${fy}-06-15`, event: 'First advance tax installment' },
        { date: `${fy}-09-15`, event: 'Second advance tax installment' },
        { date: `${fy}-12-15`, event: 'Third advance tax installment' },
        { date: `${fy + 1}-03-15`, event: 'Fourth advance tax installment' },
      ],
      monthlyPlan: this._generateMonthlyPlan(fy),
    };
  }

  _generateMonthlyPlan(fy) {
    const months = [];
    for (let m = 3; m < 15; m++) {
      const month = m % 12;
      const year = m >= 12 ? fy + 1 : fy;
      months.push({
        month: new Date(year, month, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
        actions: this._getMonthlyActions(month),
      });
    }
    return months;
  }

  _getMonthlyActions(month) {
    const actions = {
      3: ['Start SIP in ELSS for tax saving', 'Review PPF contribution plan'],
      4: ['Set up monthly PPF standing instruction', 'File advance tax if applicable'],
      5: ['Review health insurance renewal', 'Check NPS contribution status'],
      6: ['First advance tax deadline (15th)', 'Mid-year tax planning review'],
      7: ['ITR filing deadline', 'Compile all investment proofs'],
      8: ['Review existing investments performance', 'Plan HRA documentation'],
      9: ['Second advance tax deadline (15th)', 'Check 80C utilization status'],
      10: ['Review insurance policies before renewal', 'Plan year-end investments'],
      11: ['Diwali bonus – invest in ELSS/PPF', 'Check if incremental deductions needed'],
      0: ['New year tax planning check', 'Gather rent receipts for HRA claim'],
      1: ['Finalize remaining 80C investments', 'Submit investment proofs to employer'],
      2: ['Last date for tax-saving investments (31st)', 'Complete all documentation'],
    };
    return actions[month] || ['Continue monthly SIP contributions'];
  }

  _getTaxTips(income, deductions) {
    const tips = [];

    tips.push({
      title: 'Max Out 80C First',
      tip: 'Ensure you use the full ₹1.5 lakh limit under Section 80C. Even if you have EPF, top up with ELSS or PPF.',
      applicability: 'all',
    });

    if (income > 1000000) {
      tips.push({
        title: 'Use NPS for Extra ₹50K Deduction',
        tip: 'Section 80CCD(1B) gives an additional ₹50,000 deduction beyond 80C. Total: ₹2 lakh in deductions.',
        applicability: 'high_income',
      });
    }

    tips.push({
      title: 'Invest Early in Financial Year',
      tip: 'Investing in April vs March gives 11 extra months of compounding. ELSS SIP from April is ideal.',
      applicability: 'all',
    });

    tips.push({
      title: 'Claim Health Insurance for Parents',
      tip: 'Premium paid for parents (even senior citizen parents up to ₹50K) is deductible under 80D.',
      applicability: 'all',
    });

    if (income > 500000) {
      tips.push({
        title: 'Compare Both Tax Regimes',
        tip: `With ₹${Math.round(income).toLocaleString()} income, check which regime gives lower tax. Old regime needs ₹3.75L+ in deductions to beat new regime for most.`,
        applicability: 'flexible',
      });
    }

    tips.push({
      title: 'Keep Rent Receipts for HRA',
      tip: 'If you pay rent but receive HRA, keep rent receipts. For rent > ₹1L/year, landlord PAN is required.',
      applicability: 'salaried',
    });

    tips.push({
      title: 'Education Loan Interest (80E)',
      tip: 'Full interest on education loan is deductible with no upper limit. Claim for up to 8 years.',
      applicability: 'education_loan',
    });

    return tips;
  }
}

// ============================================================================
// §5  TAX CALENDAR
// ============================================================================

class TaxCalendar {
  getCalendar(fy = null) {
    const now = new Date();
    if (!fy) fy = `${now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1}-${((now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1) + 1).toString().slice(2)}`;

    const startYear = parseInt(fy.split('-')[0]);
    const endYear = startYear + 1;

    const events = [
      { date: `${startYear}-04-01`, title: 'Financial Year Begins', type: 'milestone', description: 'Start of FY — begin tax planning' },
      { date: `${startYear}-06-15`, title: 'Advance Tax Q1', type: 'deadline', description: 'Pay 15% of estimated annual tax', penalty: 'Interest u/s 234C' },
      { date: `${startYear}-07-31`, title: 'ITR Filing Deadline', type: 'deadline', description: 'Last date to file ITR for previous FY', penalty: 'Late fee u/s 234F up to ₹5,000' },
      { date: `${startYear}-09-15`, title: 'Advance Tax Q2', type: 'deadline', description: 'Pay 45% of estimated annual tax (cumulative)', penalty: 'Interest u/s 234C' },
      { date: `${startYear}-09-30`, title: 'Tax Audit Report Due', type: 'deadline', description: 'For businesses requiring audit under 44AB', penalty: '0.5% of turnover or ₹1.5L' },
      { date: `${startYear}-10-31`, title: 'ITR (Audit Cases)', type: 'deadline', description: 'Extended ITR deadline for audit cases', penalty: 'Late fee applies' },
      { date: `${startYear}-12-15`, title: 'Advance Tax Q3', type: 'deadline', description: 'Pay 75% of estimated annual tax (cumulative)', penalty: 'Interest u/s 234C' },
      { date: `${startYear}-12-31`, title: 'Belated/Revised ITR', type: 'deadline', description: 'Last date for belated or revised ITR', penalty: 'Late fee ₹5,000 if income > ₹5L' },
      { date: `${endYear}-01-15`, title: 'Submit Investment Proofs', type: 'reminder', description: 'Submit tax-saving investment proofs to employer for TDS adjustment' },
      { date: `${endYear}-02-28`, title: 'Last Date TDS Form 16B', type: 'deadline', description: 'Issue Form 16B for property transactions' },
      { date: `${endYear}-03-15`, title: 'Advance Tax Q4', type: 'deadline', description: 'Pay 100% of estimated annual tax', penalty: 'Interest u/s 234B and 234C' },
      { date: `${endYear}-03-31`, title: 'FY End / Investment Deadline', type: 'deadline', description: 'Last date for tax-saving investments under 80C, 80D, etc.', penalty: 'Missed deductions for entire year' },
    ];

    // Add days remaining
    const today = now.toISOString().split('T')[0];
    events.forEach(e => {
      const eventDate = new Date(e.date);
      e.daysLeft = Math.max(0, Math.round((eventDate - now) / 86400000));
      e.isPast = eventDate < now;
      e.isUpcoming = e.daysLeft > 0 && e.daysLeft <= 30;
      e.isUrgent = e.daysLeft > 0 && e.daysLeft <= 7;
    });

    return {
      financialYear: fy,
      events,
      upcomingDeadlines: events.filter(e => !e.isPast && e.type === 'deadline').slice(0, 3),
      passedDeadlines: events.filter(e => e.isPast),
      nextAction: events.filter(e => !e.isPast).sort((a, b) => a.daysLeft - b.daysLeft)[0] || null,
    };
  }
}

// ============================================================================
// §6  ADVANCE TAX CALCULATOR
// ============================================================================

class AdvanceTaxCalculator {
  calculate(params) {
    const { annualTax = 0, tdsDeducted = 0 } = params;
    const netTaxPayable = Math.max(0, annualTax - tdsDeducted);

    if (netTaxPayable < 10000) {
      return {
        required: false,
        message: 'Advance tax not required as net tax payable is less than ₹10,000',
        netTaxPayable,
      };
    }

    const schedule = [
      { quarter: 'Q1 (by June 15)', percentage: 15, amount: Math.round(netTaxPayable * 0.15), cumulative: 15 },
      { quarter: 'Q2 (by Sep 15)', percentage: 30, amount: Math.round(netTaxPayable * 0.30), cumulative: 45 },
      { quarter: 'Q3 (by Dec 15)', percentage: 30, amount: Math.round(netTaxPayable * 0.30), cumulative: 75 },
      { quarter: 'Q4 (by Mar 15)', percentage: 25, amount: Math.round(netTaxPayable * 0.25), cumulative: 100 },
    ];

    // Determine which installments are pending
    const now = new Date();
    const month = now.getMonth();
    let paidSoFar = 0;
    schedule.forEach(s => {
      if (month >= 5 && s.quarter.includes('Q1')) { s.status = 'due'; paidSoFar += s.amount; }
      else if (month >= 8 && s.quarter.includes('Q2')) { s.status = 'due'; paidSoFar += s.amount; }
      else if (month >= 11 && s.quarter.includes('Q3')) { s.status = 'due'; paidSoFar += s.amount; }
      else if (month >= 2 && s.quarter.includes('Q4')) { s.status = 'due'; paidSoFar += s.amount; }
      else s.status = 'upcoming';
    });

    return {
      required: true,
      netTaxPayable: Math.round(netTaxPayable),
      annualTax: Math.round(annualTax),
      tdsDeducted: Math.round(tdsDeducted),
      schedule,
      nextPayment: schedule.find(s => s.status === 'upcoming'),
      interestRisk: 'Non-payment leads to interest u/s 234B (1%/month) and 234C (1%/month per quarter)',
    };
  }
}

// ============================================================================
// §7  ENTERPRISE TAX OPTIMIZATION ENGINE — Main Export
// ============================================================================

class EnterpriseTaxEngine {
  constructor() {
    this.calculator = new TaxCalculator();
    this.advisor = new TaxPlanningAdvisor();
    this.calendar = new TaxCalendar();
    this.advanceTax = new AdvanceTaxCalculator();
  }

  calculateTax(params) { return this.calculator.calculateTax(params); }
  suggestInvestments(params) { return this.advisor.suggestTaxSavingInvestments(params); }
  getTaxCalendar(fy) { return this.calendar.getCalendar(fy); }
  calculateAdvanceTax(params) { return this.advanceTax.calculate(params); }

  getComprehensivePlan(params) {
    const taxResult = this.calculateTax(params);
    const suggestions = this.suggestInvestments(params);
    const calendar = this.getTaxCalendar();
    const advanceTax = this.calculateAdvanceTax({
      annualTax: Math.min(taxResult.oldRegime.totalTax, taxResult.newRegime.totalTax),
      tdsDeducted: params.tdsDeducted || 0,
    });

    return {
      tax: taxResult,
      suggestions,
      calendar,
      advanceTax,
      summary: {
        recommendedRegime: taxResult.comparison.recommended,
        totalSavingOpportunity: suggestions.totalPotentialSaving,
        nextDeadline: calendar.nextAction,
        actionItems: this._generateActionItems(taxResult, suggestions, calendar),
      },
    };
  }

  _generateActionItems(tax, suggestions, calendar) {
    const items = [];

    suggestions.suggestions.forEach(s => {
      if (s.remaining > 0) {
        items.push({
          priority: s.section === '80D' ? 'high' : 'medium',
          action: `Invest ₹${s.remaining.toLocaleString()} in ${s.section}`,
          potentialSaving: `₹${s.potentialSaving.toLocaleString()} tax saved`,
          deadline: calendar.events.find(e => e.title.includes('Investment Deadline'))?.date,
        });
      }
    });

    if (calendar.upcomingDeadlines.length > 0) {
      const next = calendar.upcomingDeadlines[0];
      items.push({
        priority: next.daysLeft <= 7 ? 'urgent' : 'medium',
        action: next.title,
        deadline: next.date,
        daysLeft: next.daysLeft,
      });
    }

    return items.sort((a, b) => {
      const order = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (order[a.priority] || 3) - (order[b.priority] || 3);
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

const taxEngine = new EnterpriseTaxEngine();

module.exports = {
  taxEngine,
  EnterpriseTaxEngine,
  TaxCalculator,
  TaxPlanningAdvisor,
  TaxCalendar,
  AdvanceTaxCalculator,
  OLD_REGIME_SLABS,
  NEW_REGIME_SLABS,
  DEDUCTION_LIMITS,
};
