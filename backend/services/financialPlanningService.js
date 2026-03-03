// ============================================================================
// Enterprise Financial Planning Service
// ============================================================================
// Comprehensive financial planning: retirement, tax optimization, debt payoff
// strategies, emergency fund planning, SIP calculators, and wealth projections.
// ============================================================================

// ============================================================================
// § 1 — Compound Interest & Time Value of Money
// ============================================================================

class FinancialMath {
  // Future Value of a lump sum
  static futureValue(presentValue, rate, periods) {
    return presentValue * Math.pow(1 + rate, periods);
  }

  // Present Value of a future sum
  static presentValue(futureValue, rate, periods) {
    return futureValue / Math.pow(1 + rate, periods);
  }

  // Future Value of an annuity (regular investments)
  static futureValueAnnuity(payment, rate, periods) {
    if (rate === 0) return payment * periods;
    return payment * ((Math.pow(1 + rate, periods) - 1) / rate);
  }

  // PMT — Payment needed to reach a future value
  static paymentForFV(targetFV, rate, periods) {
    if (rate === 0) return targetFV / periods;
    return targetFV * (rate / (Math.pow(1 + rate, periods) - 1));
  }

  // EMI calculation
  static emi(principal, annualRate, tenureMonths) {
    const monthlyRate = annualRate / 12 / 100;
    if (monthlyRate === 0) return principal / tenureMonths;
    return principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) /
      (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  }

  // Loan amortization schedule
  static amortizationSchedule(principal, annualRate, tenureMonths) {
    const monthlyRate = annualRate / 12 / 100;
    const emiAmount = this.emi(principal, annualRate, tenureMonths);
    const schedule = [];
    let balance = principal;
    let totalInterest = 0;

    for (let month = 1; month <= tenureMonths; month++) {
      const interest = balance * monthlyRate;
      const principalPaid = emiAmount - interest;
      balance -= principalPaid;
      totalInterest += interest;

      schedule.push({
        month,
        emi: Math.round(emiAmount),
        principal: Math.round(principalPaid),
        interest: Math.round(interest),
        balance: Math.max(0, Math.round(balance)),
        totalInterest: Math.round(totalInterest),
      });
    }

    return { schedule, totalInterest: Math.round(totalInterest), emi: Math.round(emiAmount) };
  }

  // Real return after inflation
  static realReturn(nominalRate, inflationRate) {
    return ((1 + nominalRate) / (1 + inflationRate)) - 1;
  }

  // XIRR approximation for irregular cash flows
  static xirr(cashflows, dates, guess = 0.1) {
    const daysInYear = 365.25;
    const maxIterations = 100;
    const tolerance = 0.000001;
    let rate = guess;

    for (let i = 0; i < maxIterations; i++) {
      let npv = 0;
      let dnpv = 0;
      const d0 = dates[0].getTime();

      for (let j = 0; j < cashflows.length; j++) {
        const dt = (dates[j].getTime() - d0) / (daysInYear * 86400000);
        const factor = Math.pow(1 + rate, dt);
        npv += cashflows[j] / factor;
        dnpv -= dt * cashflows[j] / (factor * (1 + rate));
      }

      const newRate = rate - npv / dnpv;
      if (Math.abs(newRate - rate) < tolerance) return newRate;
      rate = newRate;
    }

    return rate;
  }
}

// ============================================================================
// § 2 — Retirement Planning
// ============================================================================

class RetirementPlanner {
  constructor(params = {}) {
    this.currentAge = params.currentAge || 30;
    this.retirementAge = params.retirementAge || 60;
    this.lifeExpectancy = params.lifeExpectancy || 85;
    this.monthlyExpenses = params.monthlyExpenses || 50000;
    this.currentSavings = params.currentSavings || 0;
    this.monthlySIP = params.monthlySIP || 0;
    this.expectedReturn = params.expectedReturn || 0.12;    // 12% pre-retirement
    this.postRetirementReturn = params.postRetirementReturn || 0.08; // 8% post-retirement
    this.inflationRate = params.inflationRate || 0.06;       // 6% India
    this.existingRetirementCorpus = params.existingRetirementCorpus || 0;
  }

  calculate() {
    const yearsToRetirement = this.retirementAge - this.currentAge;
    const retirementYears = this.lifeExpectancy - this.retirementAge;

    // Step 1: Calculate future monthly expenses (inflation adjusted)
    const futureMonthlyExpenses = this.monthlyExpenses * Math.pow(1 + this.inflationRate, yearsToRetirement);
    const futureAnnualExpenses = futureMonthlyExpenses * 12;

    // Step 2: Corpus needed at retirement (PV of annuity, real return)
    const realPostRetReturn = FinancialMath.realReturn(this.postRetirementReturn, this.inflationRate);
    let corpusNeeded;
    if (realPostRetReturn <= 0) {
      corpusNeeded = futureAnnualExpenses * retirementYears;
    } else {
      corpusNeeded = futureAnnualExpenses * (1 - Math.pow(1 + realPostRetReturn, -retirementYears)) / realPostRetReturn;
    }

    // Step 3: Future value of current savings
    const fvCurrentSavings = FinancialMath.futureValue(
      this.currentSavings + this.existingRetirementCorpus,
      this.expectedReturn,
      yearsToRetirement
    );

    // Step 4: Future value of monthly SIP
    const fvSIP = FinancialMath.futureValueAnnuity(
      this.monthlySIP,
      this.expectedReturn / 12,
      yearsToRetirement * 12
    );

    // Step 5: Gap analysis
    const projectedCorpus = fvCurrentSavings + fvSIP;
    const shortfall = Math.max(0, corpusNeeded - projectedCorpus);

    // Step 6: Additional monthly SIP needed to close gap
    const additionalSIPNeeded = shortfall > 0
      ? FinancialMath.paymentForFV(shortfall, this.expectedReturn / 12, yearsToRetirement * 12)
      : 0;

    // Step 7: Milestone projections
    const milestones = [];
    for (const age of [35, 40, 45, 50, 55, 60, 65]) {
      if (age <= this.currentAge || age > this.lifeExpectancy) continue;
      const years = age - this.currentAge;
      const fvSav = FinancialMath.futureValue(this.currentSavings, this.expectedReturn, years);
      const fvSip = FinancialMath.futureValueAnnuity(this.monthlySIP, this.expectedReturn / 12, years * 12);
      milestones.push({
        age,
        projectedCorpus: Math.round(fvSav + fvSip),
        year: new Date().getFullYear() + years,
      });
    }

    return {
      currentAge: this.currentAge,
      retirementAge: this.retirementAge,
      lifeExpectancy: this.lifeExpectancy,
      yearsToRetirement,
      retirementYears,
      currentMonthlyExpenses: Math.round(this.monthlyExpenses),
      futureMonthlyExpenses: Math.round(futureMonthlyExpenses),
      corpusNeeded: Math.round(corpusNeeded),
      projectedCorpus: Math.round(projectedCorpus),
      shortfall: Math.round(shortfall),
      isOnTrack: shortfall === 0,
      readinessPercent: Math.min(100, Math.round((projectedCorpus / corpusNeeded) * 100)),
      additionalSIPNeeded: Math.round(additionalSIPNeeded),
      totalMonthlySIPRequired: Math.round(this.monthlySIP + additionalSIPNeeded),
      fvCurrentSavings: Math.round(fvCurrentSavings),
      fvSIP: Math.round(fvSIP),
      assumptions: {
        expectedReturn: this.expectedReturn * 100,
        postRetirementReturn: this.postRetirementReturn * 100,
        inflationRate: this.inflationRate * 100,
      },
      milestones,
    };
  }
}

// ============================================================================
// § 3 — SIP & Lumpsum Calculator
// ============================================================================

class InvestmentCalculator {
  // SIP returns calculation with step-up
  static sipReturns(monthlySIP, annualReturn, years, annualStepUp = 0) {
    const monthlyReturn = annualReturn / 12;
    let totalInvested = 0;
    let currentValue = 0;
    let currentSIP = monthlySIP;
    const yearlyBreakdown = [];

    for (let year = 1; year <= years; year++) {
      for (let month = 1; month <= 12; month++) {
        currentValue = (currentValue + currentSIP) * (1 + monthlyReturn);
        totalInvested += currentSIP;
      }

      yearlyBreakdown.push({
        year,
        invested: Math.round(totalInvested),
        value: Math.round(currentValue),
        returns: Math.round(currentValue - totalInvested),
        returnPercent: totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested * 100).toFixed(1) : 0,
      });

      // Annual step-up
      if (annualStepUp > 0) {
        currentSIP = currentSIP * (1 + annualStepUp);
      }
    }

    const wealthGain = currentValue - totalInvested;

    return {
      monthlySIP: Math.round(monthlySIP),
      annualReturn: annualReturn * 100,
      years,
      annualStepUp: annualStepUp * 100,
      totalInvested: Math.round(totalInvested),
      futureValue: Math.round(currentValue),
      wealthGain: Math.round(wealthGain),
      absoluteReturn: totalInvested > 0 ? ((wealthGain / totalInvested) * 100).toFixed(1) : 0,
      yearlyBreakdown,
    };
  }

  // Lumpsum investment returns
  static lumpsumReturns(amount, annualReturn, years) {
    const yearlyBreakdown = [];

    for (let year = 1; year <= years; year++) {
      const value = FinancialMath.futureValue(amount, annualReturn, year);
      yearlyBreakdown.push({
        year,
        value: Math.round(value),
        returns: Math.round(value - amount),
        cagr: (annualReturn * 100).toFixed(1),
      });
    }

    const finalValue = FinancialMath.futureValue(amount, annualReturn, years);

    return {
      investedAmount: amount,
      annualReturn: annualReturn * 100,
      years,
      futureValue: Math.round(finalValue),
      totalReturns: Math.round(finalValue - amount),
      yearlyBreakdown,
    };
  }

  // Goal-based SIP calculator
  static sipForGoal(targetAmount, annualReturn, years) {
    const monthlyReturn = annualReturn / 12;
    const months = years * 12;
    const monthlySIP = FinancialMath.paymentForFV(targetAmount, monthlyReturn, months);

    return {
      targetAmount,
      annualReturn: annualReturn * 100,
      years,
      requiredMonthlySIP: Math.round(monthlySIP),
      totalInvestment: Math.round(monthlySIP * months),
      expectedReturns: Math.round(targetAmount - monthlySIP * months),
    };
  }

  // SIP delay cost calculator — shows impact of delaying
  static sipDelayCost(monthlySIP, annualReturn, totalYears, delayYears) {
    const withoutDelay = this.sipReturns(monthlySIP, annualReturn, totalYears);
    const withDelay = this.sipReturns(monthlySIP, annualReturn, totalYears - delayYears);

    return {
      withoutDelay: {
        years: totalYears,
        value: withoutDelay.futureValue,
        invested: withoutDelay.totalInvested,
      },
      withDelay: {
        years: totalYears - delayYears,
        value: withDelay.futureValue,
        invested: withDelay.totalInvested,
      },
      costOfDelay: withoutDelay.futureValue - withDelay.futureValue,
      investmentSaved: withDelay.totalInvested - withoutDelay.totalInvested,
      netLoss: (withoutDelay.futureValue - withDelay.futureValue) -
        (withoutDelay.totalInvested - withDelay.totalInvested),
    };
  }
}

// ============================================================================
// § 4 — Debt Payoff Strategies
// ============================================================================

class DebtPayoffOptimizer {
  constructor(debts = []) {
    // debts: [{ name, balance, interestRate, minPayment, type }]
    this.debts = debts.map(d => ({ ...d }));
  }

  // Avalanche method — highest interest rate first
  avalanche(extraMonthlyPayment = 0) {
    return this._simulate('avalanche', extraMonthlyPayment);
  }

  // Snowball method — smallest balance first
  snowball(extraMonthlyPayment = 0) {
    return this._simulate('snowball', extraMonthlyPayment);
  }

  // Hybrid — combines psychological wins with interest optimization
  hybrid(extraMonthlyPayment = 0) {
    return this._simulate('hybrid', extraMonthlyPayment);
  }

  _simulate(strategy, extraPayment) {
    let debts = this.debts.map(d => ({
      ...d,
      balance: d.balance,
      totalInterestPaid: 0,
      monthsPaid: 0,
      paidOff: false,
    }));

    const timeline = [];
    let month = 0;
    const maxMonths = 360; // 30 year cap
    const payoffOrder = [];

    while (debts.some(d => d.balance > 0) && month < maxMonths) {
      month++;
      let available = extraPayment;

      // Accrue interest on all debts
      for (const debt of debts) {
        if (debt.balance <= 0) continue;
        const monthlyRate = debt.interestRate / 100 / 12;
        const interest = debt.balance * monthlyRate;
        debt.totalInterestPaid += interest;
        debt.balance += interest;
      }

      // Pay minimum on all debts
      for (const debt of debts) {
        if (debt.balance <= 0) continue;
        const payment = Math.min(debt.balance, debt.minPayment);
        debt.balance -= payment;
        if (debt.balance <= 0.01) {
          debt.balance = 0;
          debt.paidOff = true;
          payoffOrder.push({ name: debt.name, month });
          available += debt.minPayment;
        }
      }

      // Apply extra payment based on strategy
      const activeDebts = debts.filter(d => d.balance > 0);
      if (activeDebts.length > 0 && available > 0) {
        let sorted;
        switch (strategy) {
          case 'avalanche':
            sorted = activeDebts.sort((a, b) => b.interestRate - a.interestRate);
            break;
          case 'snowball':
            sorted = activeDebts.sort((a, b) => a.balance - b.balance);
            break;
          case 'hybrid':
            // Score: normalized interest * 0.6 + normalized inverse balance * 0.4
            const maxRate = Math.max(...activeDebts.map(d => d.interestRate));
            const maxBal = Math.max(...activeDebts.map(d => d.balance));
            sorted = activeDebts.sort((a, b) => {
              const scoreA = (a.interestRate / maxRate) * 0.6 + (1 - a.balance / maxBal) * 0.4;
              const scoreB = (b.interestRate / maxRate) * 0.6 + (1 - b.balance / maxBal) * 0.4;
              return scoreB - scoreA;
            });
            break;
        }

        const target = sorted[0];
        const extraPay = Math.min(target.balance, available);
        target.balance -= extraPay;
        if (target.balance <= 0.01) {
          target.balance = 0;
          target.paidOff = true;
          payoffOrder.push({ name: target.name, month });
        }
      }

      // Record monthly snapshot
      const totalBalance = debts.reduce((sum, d) => sum + d.balance, 0);
      timeline.push({
        month,
        totalBalance: Math.round(totalBalance),
        debtsRemaining: debts.filter(d => d.balance > 0).length,
      });
    }

    const totalInterest = Math.round(debts.reduce((sum, d) => sum + d.totalInterestPaid, 0));
    const totalMonths = month;
    const originalTotal = this.debts.reduce((sum, d) => sum + d.balance, 0);

    return {
      strategy,
      totalMonths,
      totalYears: (totalMonths / 12).toFixed(1),
      totalInterestPaid: totalInterest,
      totalPaid: Math.round(originalTotal + totalInterest),
      payoffOrder,
      timeline: timeline.filter((_, i) => i % 3 === 0 || i === timeline.length - 1), // Every 3 months
      debtDetails: debts.map(d => ({
        name: d.name,
        originalBalance: this.debts.find(od => od.name === d.name)?.balance,
        interestPaid: Math.round(d.totalInterestPaid),
      })),
    };
  }

  // Compare all strategies
  compare(extraMonthlyPayment = 0) {
    const avalanche = this.avalanche(extraMonthlyPayment);
    const snowball = this.snowball(extraMonthlyPayment);
    const hybrid = this.hybrid(extraMonthlyPayment);

    const strategies = [avalanche, snowball, hybrid];
    const best = strategies.reduce((a, b) => a.totalInterestPaid < b.totalInterestPaid ? a : b);

    return {
      avalanche,
      snowball,
      hybrid,
      recommended: best.strategy,
      interestSaved: {
        avalancheVsSnowball: snowball.totalInterestPaid - avalanche.totalInterestPaid,
        hybridVsSnowball: snowball.totalInterestPaid - hybrid.totalInterestPaid,
      },
      timeSaved: {
        avalancheVsSnowball: snowball.totalMonths - avalanche.totalMonths,
      },
    };
  }
}

// ============================================================================
// § 5 — Emergency Fund Planner
// ============================================================================

class EmergencyFundPlanner {
  calculate(params = {}) {
    const monthlyExpenses = params.monthlyExpenses || 50000;
    const dependents = params.dependents || 0;
    const hasInsurance = params.hasInsurance || false;
    const jobStability = params.jobStability || 'medium'; // low/medium/high
    const hasEMIs = params.hasEMIs || false;
    const monthlyEMIs = params.monthlyEMIs || 0;
    const currentEmergencyFund = params.currentEmergencyFund || 0;

    // Determine recommended months based on risk factors
    let recommendedMonths = 6;
    if (jobStability === 'low') recommendedMonths += 3;
    if (jobStability === 'high') recommendedMonths -= 1;
    if (dependents > 0) recommendedMonths += Math.min(dependents, 3);
    if (!hasInsurance) recommendedMonths += 2;
    if (hasEMIs) recommendedMonths += 1;

    const monthlyCost = monthlyExpenses + monthlyEMIs;
    const targetAmount = monthlyCost * recommendedMonths;
    const currentCoverage = currentEmergencyFund / monthlyCost;
    const gap = Math.max(0, targetAmount - currentEmergencyFund);

    // Multiple savings scenarios
    const scenarios = [3, 6, 9, 12, 18, 24].map(months => ({
      months,
      monthlySavings: Math.round(gap / months),
      completionDate: new Date(Date.now() + months * 30.44 * 86400000).toISOString().split('T')[0],
    }));

    return {
      monthlyExpenses,
      monthlyEMIs,
      totalMonthlyCost: monthlyCost,
      recommendedMonths,
      targetAmount: Math.round(targetAmount),
      currentFund: currentEmergencyFund,
      gap: Math.round(gap),
      coverageMonths: parseFloat(currentCoverage.toFixed(1)),
      coveragePercent: Math.min(100, Math.round((currentEmergencyFund / targetAmount) * 100)),
      status: currentCoverage >= recommendedMonths ? 'adequate' :
        currentCoverage >= 3 ? 'partial' : 'insufficient',
      riskFactors: {
        jobStability,
        dependents,
        hasInsurance,
        hasEMIs,
      },
      savingsScenarios: scenarios,
      recommendation: gap <= 0
        ? 'Your emergency fund meets the recommended level. Consider investing the surplus.'
        : `Build an additional ₹${formatINR(gap)} in emergency savings. Save ₹${formatINR(Math.round(gap / 12))}/month to reach your goal in 1 year.`,
    };
  }
}

// ============================================================================
// § 6 — Tax Optimization Engine (India-specific)
// ============================================================================

class TaxOptimizer {
  constructor(regime = 'new') {
    this.regime = regime; // 'old' or 'new'
  }

  // Old regime tax slabs (FY 2024-25)
  static oldRegimeSlabs = [
    { min: 0, max: 250000, rate: 0 },
    { min: 250000, max: 500000, rate: 5 },
    { min: 500000, max: 1000000, rate: 20 },
    { min: 1000000, max: Infinity, rate: 30 },
  ];

  // New regime tax slabs (FY 2024-25)
  static newRegimeSlabs = [
    { min: 0, max: 300000, rate: 0 },
    { min: 300000, max: 700000, rate: 5 },
    { min: 700000, max: 1000000, rate: 10 },
    { min: 1000000, max: 1200000, rate: 15 },
    { min: 1200000, max: 1500000, rate: 20 },
    { min: 1500000, max: Infinity, rate: 30 },
  ];

  // Calculate tax for given income and deductions
  calculateTax(grossIncome, deductions = {}) {
    const oldTax = this._calculateRegimeTax(grossIncome, deductions, 'old');
    const newTax = this._calculateRegimeTax(grossIncome, {}, 'new');

    return {
      grossIncome,
      deductions,
      oldRegime: oldTax,
      newRegime: newTax,
      recommended: oldTax.totalTax < newTax.totalTax ? 'old' : 'new',
      savings: Math.abs(oldTax.totalTax - newTax.totalTax),
    };
  }

  _calculateRegimeTax(income, deductions, regime) {
    let taxableIncome = income;
    const deductionBreakdown = {};

    if (regime === 'old') {
      // Standard deduction
      const stdDeduction = Math.min(50000, income);
      taxableIncome -= stdDeduction;
      deductionBreakdown.standardDeduction = stdDeduction;

      // 80C — PPF, ELSS, LIC, etc. (max 1.5L)
      if (deductions.section80C) {
        const amt = Math.min(deductions.section80C, 150000);
        taxableIncome -= amt;
        deductionBreakdown.section80C = amt;
      }

      // 80D — Health Insurance (max 25K self, 50K parents senior)
      if (deductions.section80D) {
        const amt = Math.min(deductions.section80D, 75000); // Self + parents
        taxableIncome -= amt;
        deductionBreakdown.section80D = amt;
      }

      // 80E — Education Loan interest
      if (deductions.section80E) {
        taxableIncome -= deductions.section80E;
        deductionBreakdown.section80E = deductions.section80E;
      }

      // 24b — Home Loan interest (max 2L)
      if (deductions.section24b) {
        const amt = Math.min(deductions.section24b, 200000);
        taxableIncome -= amt;
        deductionBreakdown.section24b = amt;
      }

      // 80CCD(1B) — NPS additional (max 50K)
      if (deductions.nps) {
        const amt = Math.min(deductions.nps, 50000);
        taxableIncome -= amt;
        deductionBreakdown.nps = amt;
      }

      // HRA exemption
      if (deductions.hra) {
        taxableIncome -= deductions.hra;
        deductionBreakdown.hra = deductions.hra;
      }
    } else {
      // New regime — standard deduction of 75000 (FY 2024-25)
      const stdDeduction = Math.min(75000, income);
      taxableIncome -= stdDeduction;
      deductionBreakdown.standardDeduction = stdDeduction;
    }

    taxableIncome = Math.max(0, taxableIncome);

    // Calculate tax based on slabs
    const slabs = regime === 'old' ? TaxOptimizer.oldRegimeSlabs : TaxOptimizer.newRegimeSlabs;
    let tax = 0;
    const slabBreakdown = [];

    for (const slab of slabs) {
      if (taxableIncome > slab.min) {
        const taxable = Math.min(taxableIncome, slab.max) - slab.min;
        const slabTax = taxable * slab.rate / 100;
        tax += slabTax;
        if (slabTax > 0) {
          slabBreakdown.push({
            range: `₹${formatINR(slab.min)} - ₹${slab.max === Infinity ? '∞' : formatINR(slab.max)}`,
            rate: slab.rate,
            taxable: Math.round(taxable),
            tax: Math.round(slabTax),
          });
        }
      }
    }

    // Health & Education Cess (4%)
    const cess = tax * 0.04;

    // Rebate u/s 87A
    let rebate = 0;
    if (regime === 'new' && taxableIncome <= 700000) {
      rebate = Math.min(tax, 25000);
    } else if (regime === 'old' && taxableIncome <= 500000) {
      rebate = Math.min(tax, 12500);
    }

    const totalTax = Math.round(Math.max(0, tax - rebate + cess));

    return {
      regime,
      taxableIncome: Math.round(taxableIncome),
      totalDeductions: Math.round(income - taxableIncome),
      deductionBreakdown,
      slabBreakdown,
      baseTax: Math.round(tax),
      rebate: Math.round(rebate),
      cess: Math.round(cess),
      totalTax,
      effectiveRate: income > 0 ? ((totalTax / income) * 100).toFixed(2) : 0,
      monthlyTax: Math.round(totalTax / 12),
    };
  }

  // Tax saving recommendations
  getOptimizationTips(income, currentDeductions = {}) {
    const tips = [];
    const maxSavings = {};

    // 80C gap
    const current80C = currentDeductions.section80C || 0;
    if (current80C < 150000) {
      const gap = 150000 - current80C;
      const potentialSaving = gap * 0.3; // At 30% slab
      tips.push({
        section: '80C',
        description: 'Invest in ELSS, PPF, or Life Insurance',
        currentUtilization: current80C,
        maxLimit: 150000,
        gap,
        potentialSaving: Math.round(potentialSaving),
        instruments: ['ELSS Mutual Funds', 'PPF', 'NSC', 'Tax Saver FD', 'ULIP', 'Sukanya Samriddhi'],
      });
    }

    // 80D gap
    const current80D = currentDeductions.section80D || 0;
    if (current80D < 75000) {
      tips.push({
        section: '80D',
        description: 'Health Insurance premiums (self + family + parents)',
        currentUtilization: current80D,
        maxLimit: 75000,
        gap: 75000 - current80D,
        potentialSaving: Math.round((75000 - current80D) * 0.3),
        instruments: ['Health Insurance', 'Senior Citizen health plans'],
      });
    }

    // NPS
    const currentNPS = currentDeductions.nps || 0;
    if (currentNPS < 50000) {
      tips.push({
        section: '80CCD(1B)',
        description: 'Additional NPS contribution',
        currentUtilization: currentNPS,
        maxLimit: 50000,
        gap: 50000 - currentNPS,
        potentialSaving: Math.round((50000 - currentNPS) * 0.3),
        instruments: ['National Pension System (NPS)'],
      });
    }

    // Home loan
    if (!currentDeductions.section24b && income > 1000000) {
      tips.push({
        section: '24(b)',
        description: 'Home loan interest deduction up to ₹2L',
        maxLimit: 200000,
        potentialSaving: Math.round(200000 * 0.3),
        instruments: ['Home Loan Interest'],
      });
    }

    const totalPotentialSaving = tips.reduce((sum, t) => sum + (t.potentialSaving || 0), 0);

    return {
      tips,
      totalPotentialSaving,
      regimeRecommendation: totalPotentialSaving > 0 ?
        'Consider Old Regime with full deductions to save up to ₹' + formatINR(totalPotentialSaving) :
        'New Regime may be more beneficial with limited deductions',
    };
  }
}

// ============================================================================
// § 7 — Wealth Projection Engine
// ============================================================================

class WealthProjector {
  project(params = {}) {
    const {
      currentNetWorth = 0,
      monthlyIncome = 0,
      monthlyExpenses = 0,
      annualIncomeGrowth = 0.08,
      annualExpenseGrowth = 0.06,
      investmentReturn = 0.12,
      years = 20,
    } = params;

    const projections = [];
    let netWorth = currentNetWorth;
    let income = monthlyIncome;
    let expenses = monthlyExpenses;

    for (let year = 1; year <= years; year++) {
      const annualSavings = (income - expenses) * 12;
      const investmentGains = netWorth * investmentReturn;
      netWorth += annualSavings + investmentGains;

      projections.push({
        year,
        calendarYear: new Date().getFullYear() + year,
        monthlyIncome: Math.round(income),
        monthlyExpenses: Math.round(expenses),
        monthlySavings: Math.round(income - expenses),
        savingsRate: income > 0 ? (((income - expenses) / income) * 100).toFixed(1) : 0,
        annualSavings: Math.round(annualSavings),
        investmentGains: Math.round(investmentGains),
        netWorth: Math.round(netWorth),
      });

      // Apply annual growth
      income *= (1 + annualIncomeGrowth);
      expenses *= (1 + annualExpenseGrowth);
    }

    // Key milestones
    const milestones = [];
    const targets = [1000000, 5000000, 10000000, 50000000, 100000000]; // 10L, 50L, 1Cr, 5Cr, 10Cr
    targets.forEach(target => {
      const entry = projections.find(p => p.netWorth >= target);
      if (entry) {
        milestones.push({
          target,
          targetLabel: formatINRFull(target),
          reachedInYear: entry.year,
          calendarYear: entry.calendarYear,
        });
      }
    });

    // Financial independence (annual expenses covered by returns)
    const fiEntry = projections.find(p => {
      const annualExpenses = p.monthlyExpenses * 12;
      const passiveIncome = p.netWorth * investmentReturn;
      return passiveIncome >= annualExpenses;
    });

    return {
      startingNetWorth: currentNetWorth,
      finalNetWorth: projections.length > 0 ? projections[projections.length - 1].netWorth : currentNetWorth,
      wealthMultiple: currentNetWorth > 0 ? (projections[projections.length - 1]?.netWorth / currentNetWorth).toFixed(1) : 'N/A',
      projections,
      milestones,
      financialIndependence: fiEntry ? {
        reachedInYear: fiEntry.year,
        calendarYear: fiEntry.calendarYear,
        netWorthAtFI: fiEntry.netWorth,
      } : null,
    };
  }
}

// ============================================================================
// § 8 — Insurance Needs Calculator
// ============================================================================

class InsuranceCalculator {
  calculateLifeInsurance(params = {}) {
    const {
      annualIncome = 600000,
      currentAge = 30,
      retirementAge = 60,
      dependents = 2,
      existingCoverage = 0,
      outstandingLoans = 0,
      monthlyExpenses = 50000,
      emergencyFund = 0,
      childrenEducation = 0, // Future education costs
      inflationRate = 0.06,
    } = params;

    // Human Life Value method
    const yearsOfCoverage = retirementAge - currentAge;
    const futureEarnings = annualIncome *
      ((1 - Math.pow(1 + inflationRate, yearsOfCoverage)) / (-inflationRate));

    // Needs-based method
    const yearlyExpenses = monthlyExpenses * 12;
    const expensesCoverage = yearlyExpenses * Math.min(yearsOfCoverage, 25);
    const totalNeeds = expensesCoverage + outstandingLoans + childrenEducation;

    // Recommended coverage
    const incomeMultiple = Math.max(10, yearsOfCoverage);
    const recommendedByMultiple = annualIncome * incomeMultiple;
    const recommendedByNeeds = totalNeeds - emergencyFund;

    const recommended = Math.max(recommendedByMultiple, recommendedByNeeds);
    const gap = Math.max(0, recommended - existingCoverage);

    return {
      methods: {
        humanLifeValue: Math.round(futureEarnings),
        incomeMultiple: Math.round(recommendedByMultiple),
        needsBased: Math.round(recommendedByNeeds),
      },
      recommended: Math.round(recommended),
      existingCoverage,
      gap: Math.round(gap),
      adequate: gap <= 0,
      components: {
        expensesCoverage: Math.round(expensesCoverage),
        outstandingLoans,
        childrenEducation,
        totalNeeds: Math.round(totalNeeds),
      },
    };
  }

  calculateHealthInsurance(params = {}) {
    const {
      familySize = 4,
      currentAge = 30,
      currentCoverage = 0,
      hasCorporateCover = false,
      corporateCoverAmount = 0,
      preExistingConditions = false,
      city = 'metro', // metro/tier1/tier2/rural
    } = params;

    const baseCoverage = {
      metro: 1500000,    // 15L
      tier1: 1000000,    // 10L
      tier2: 750000,     // 7.5L
      rural: 500000,     // 5L
    };

    let recommended = baseCoverage[city] || 1000000;
    recommended += (familySize - 1) * 300000;
    if (currentAge > 40) recommended += 500000;
    if (currentAge > 50) recommended += 500000;
    if (preExistingConditions) recommended += 500000;

    const effectiveCoverage = currentCoverage + (hasCorporateCover ? corporateCoverAmount : 0);
    const gap = Math.max(0, recommended - effectiveCoverage);

    return {
      recommended: Math.round(recommended),
      currentCoverage,
      corporateCoverage: hasCorporateCover ? corporateCoverAmount : 0,
      effectiveCoverage,
      gap: Math.round(gap),
      adequate: gap <= 0,
      superTopUpSuggested: gap > 0 && effectiveCoverage > 0,
      superTopUpAmount: Math.round(gap),
    };
  }
}

// ============================================================================
// § 9 — Comprehensive Financial Plan Generator
// ============================================================================

class FinancialPlanGenerator {
  generate(profile = {}) {
    const {
      age = 30,
      monthlyIncome = 100000,
      monthlyExpenses = 60000,
      currentSavings = 500000,
      investments = 0,
      debts = [],
      goals = [],
      dependents = 0,
      hasInsurance = false,
      riskTolerance = 'moderate', // conservative/moderate/aggressive
    } = profile;

    const monthlySavings = monthlyIncome - monthlyExpenses;
    const savingsRate = (monthlySavings / monthlyIncome) * 100;

    // Asset allocation based on risk tolerance and age
    const equityPercent = Math.max(20, Math.min(80, 100 - age + (
      riskTolerance === 'aggressive' ? 15 :
        riskTolerance === 'conservative' ? -15 : 0
    )));
    const debtPercent = 100 - equityPercent;

    // Emergency fund
    const emergencyFund = new EmergencyFundPlanner().calculate({
      monthlyExpenses,
      dependents,
      hasInsurance,
      monthlyEMIs: debts.reduce((sum, d) => sum + (d.minPayment || 0), 0),
      currentEmergencyFund: currentSavings * 0.3,
    });

    // Retirement
    const retirement = new RetirementPlanner({
      currentAge: age,
      monthlyExpenses,
      currentSavings: investments,
      monthlySIP: monthlySavings * (equityPercent / 100) * 0.5,
    }).calculate();

    // Wealth projection
    const wealth = new WealthProjector().project({
      currentNetWorth: currentSavings + investments - debts.reduce((s, d) => s + d.balance, 0),
      monthlyIncome,
      monthlyExpenses,
      years: Math.max(10, 60 - age),
    });

    // Insurance needs
    const insurance = new InsuranceCalculator();
    const lifeInsurance = insurance.calculateLifeInsurance({
      annualIncome: monthlyIncome * 12,
      currentAge: age,
      dependents,
      outstandingLoans: debts.reduce((s, d) => s + d.balance, 0),
      monthlyExpenses,
    });
    const healthInsurance = insurance.calculateHealthInsurance({
      familySize: 1 + dependents,
      currentAge: age,
    });

    // Debt strategy
    let debtStrategy = null;
    if (debts.length > 0) {
      const optimizer = new DebtPayoffOptimizer(debts);
      debtStrategy = optimizer.compare(Math.max(0, monthlySavings * 0.3));
    }

    // Priority recommendations
    const priorities = [];
    if (emergencyFund.status === 'insufficient') {
      priorities.push({
        priority: 1,
        action: 'Build Emergency Fund',
        detail: `Save ₹${formatINR(emergencyFund.gap)} for ${emergencyFund.recommendedMonths} months coverage`,
        allocation: Math.round(monthlySavings * 0.3),
      });
    }
    if (lifeInsurance.gap > 0) {
      priorities.push({
        priority: 2,
        action: 'Get Life Insurance',
        detail: `Coverage gap of ₹${formatINR(lifeInsurance.gap)}`,
      });
    }
    if (healthInsurance.gap > 0) {
      priorities.push({
        priority: 3,
        action: 'Increase Health Coverage',
        detail: `Need ₹${formatINR(healthInsurance.gap)} more coverage`,
      });
    }
    if (debts.length > 0) {
      priorities.push({
        priority: 4,
        action: 'Accelerate Debt Repayment',
        detail: `Use ${debtStrategy?.recommended || 'avalanche'} strategy`,
        allocation: Math.round(monthlySavings * 0.3),
      });
    }
    priorities.push({
      priority: 5,
      action: 'Invest for Retirement',
      detail: `Start/increase SIP of ₹${formatINR(retirement.additionalSIPNeeded || Math.round(monthlySavings * 0.4))}`,
      allocation: Math.round(monthlySavings * 0.4),
    });

    // Monthly allocation plan
    const allocationPlan = {
      emergencyFund: Math.round(monthlySavings * (emergencyFund.status === 'adequate' ? 0.05 : 0.25)),
      debtRepayment: Math.round(monthlySavings * (debts.length > 0 ? 0.25 : 0)),
      equityInvestments: Math.round(monthlySavings * (equityPercent / 100) * (debts.length > 0 ? 0.35 : 0.55)),
      debtInvestments: Math.round(monthlySavings * (debtPercent / 100) * 0.3),
      insurance: Math.round(monthlySavings * 0.05),
      discretionary: Math.round(monthlySavings * 0.05),
    };

    return {
      snapshot: {
        age,
        monthlyIncome,
        monthlyExpenses,
        monthlySavings,
        savingsRate: savingsRate.toFixed(1),
        currentNetWorth: currentSavings + investments - debts.reduce((s, d) => s + d.balance, 0),
      },
      assetAllocation: {
        equity: equityPercent,
        debt: debtPercent,
        riskProfile: riskTolerance,
      },
      emergencyFund,
      retirement,
      wealth: {
        finalNetWorth: wealth.finalNetWorth,
        milestones: wealth.milestones,
        financialIndependence: wealth.financialIndependence,
      },
      insurance: { life: lifeInsurance, health: healthInsurance },
      debtStrategy,
      priorities: priorities.sort((a, b) => a.priority - b.priority),
      monthlyAllocationPlan: allocationPlan,
      generatedAt: new Date().toISOString(),
    };
  }
}

// ============================================================================
// § 10 — Helper Functions
// ============================================================================

function formatINR(amount) {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toFixed(0);
}

function formatINRFull(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============================================================================
// § 11 — Module Exports
// ============================================================================

module.exports = {
  FinancialMath,
  RetirementPlanner,
  InvestmentCalculator,
  DebtPayoffOptimizer,
  EmergencyFundPlanner,
  TaxOptimizer,
  WealthProjector,
  InsuranceCalculator,
  FinancialPlanGenerator,
};
