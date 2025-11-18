const mongoose = require('mongoose');

const retirementPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  basicInfo: {
    currentAge: { type: Number, required: true },
    retirementAge: { type: Number, required: true },
    lifeExpectancy: { type: Number, default: 85 },
    currentAnnualIncome: Number,
    currentSavings: Number
  },
  goals: {
    targetMonthlyIncome: { type: Number, required: true },
    desiredLifestyle: {
      type: String,
      enum: ['basic', 'comfortable', 'luxury'],
      default: 'comfortable'
    },
    retirementLocation: String,
    travelBudget: Number,
    hobbiesBudget: Number,
    healthcareBudget: Number
  },
  corpus: {
    required: Number,
    current: Number,
    gap: Number,
    calculations: {
      inflationRate: { type: Number, default: 6 },
      returnRate: { type: Number, default: 12 },
      taxRate: { type: Number, default: 20 },
      adjustedReturnRate: Number
    }
  },
  investments: [{
    type: {
      type: String,
      enum: ['epf', 'ppf', 'nps', 'pension_plan', 'mutual_fund', 'stocks', 'bonds', 'real_estate', 'gold', 'fd', 'other']
    },
    name: String,
    currentValue: Number,
    monthlyContribution: Number,
    employerContribution: Number,
    expectedReturn: Number,
    maturityValue: Number,
    maturityDate: Date,
    isLocked: Boolean,
    lockInPeriod: Number,
    taxBenefit: String
  }],
  pension: {
    governmentPension: {
      expected: Number,
      source: String
    },
    privatePension: [{
      provider: String,
      amount: Number,
      startDate: Date
    }],
    totalMonthly: Number
  },
  socialSecurity: {
    eligibleFor: Boolean,
    expectedAmount: Number,
    startDate: Date,
    scheme: String
  },
  projections: [{
    age: Number,
    year: Number,
    corpusRequired: Number,
    corpusProjected: Number,
    monthlyIncome: Number,
    gap: Number,
    monthlySavingsNeeded: Number
  }],
  strategies: [{
    name: String,
    description: String,
    requiredMonthlyInvestment: Number,
    expectedCorpus: Number,
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    instruments: [String],
    timeline: String,
    pros: [String],
    cons: [String]
  }],
  milestones: [{
    age: Number,
    description: String,
    targetAmount: Number,
    achieved: Boolean,
    achievedDate: Date
  }],
  risks: [{
    type: {
      type: String,
      enum: ['inflation', 'longevity', 'market', 'health', 'sequence_of_returns', 'currency', 'policy']
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    impact: String,
    mitigation: String
  }],
  withdrawalStrategy: {
    method: {
      type: String,
      enum: ['systematic_withdrawal', 'bucket', 'percentage_rule', 'dynamic', 'annuity']
    },
    rate: Number, // e.g., 4% rule
    monthlyWithdrawal: Number,
    emergencyFund: Number,
    rebalancingFrequency: String
  },
  healthcarePlanning: {
    estimatedAnnualCost: Number,
    insuranceCoverage: Number,
    outOfPocketMax: Number,
    longTermCareInsurance: Boolean,
    medications: Number
  },
  estatePlanning: {
    willPrepared: Boolean,
    trusts: Boolean,
    beneficiaries: [{
      name: String,
      relationship: String,
      share: Number
    }],
    powerOfAttorney: Boolean,
    livingWill: Boolean
  },
  recommendations: [{
    category: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    suggestion: String,
    expectedImpact: String,
    actionItems: [String],
    deadline: Date
  }],
  scenarioAnalysis: [{
    name: String,
    description: String,
    assumptions: mongoose.Schema.Types.Mixed,
    projectedCorpus: Number,
    probability: Number,
    adequacy: Boolean
  }],
  lastReviewed: Date,
  nextReviewDate: Date,
  notes: String,
  status: {
    type: String,
    enum: ['planning', 'on_track', 'needs_attention', 'critical'],
    default: 'planning'
  }
}, {
  timestamps: true
});

// Indexes
retirementPlanSchema.index({ userId: 1 });
retirementPlanSchema.index({ status: 1 });
retirementPlanSchema.index({ 'basicInfo.retirementAge': 1 });

// Methods
retirementPlanSchema.methods.calculateRequiredCorpus = function() {
  const { currentAge, retirementAge, lifeExpectancy } = this.basicInfo;
  const { targetMonthlyIncome } = this.goals;
  const { inflationRate, returnRate } = this.corpus.calculations;
  
  const yearsToRetirement = retirementAge - currentAge;
  const yearsInRetirement = lifeExpectancy - retirementAge;
  
  // Calculate inflation-adjusted monthly income needed at retirement
  const futureMonthlyIncome = targetMonthlyIncome * Math.pow(1 + inflationRate / 100, yearsToRetirement);
  const futureAnnualIncome = futureMonthlyIncome * 12;
  
  // Calculate corpus needed using annuity formula
  // PV = PMT * [(1 - (1 + r)^-n) / r]
  const realReturnRate = ((1 + returnRate / 100) / (1 + inflationRate / 100)) - 1;
  const monthlyRate = realReturnRate / 12;
  const totalMonths = yearsInRetirement * 12;
  
  let requiredCorpus;
  if (monthlyRate === 0) {
    requiredCorpus = futureMonthlyIncome * totalMonths;
  } else {
    requiredCorpus = futureMonthlyIncome * ((1 - Math.pow(1 + monthlyRate, -totalMonths)) / monthlyRate);
  }
  
  this.corpus.required = Math.round(requiredCorpus);
  
  // Calculate current corpus
  this.corpus.current = this.investments.reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
  
  // Calculate gap
  this.corpus.gap = Math.max(0, this.corpus.required - this.projectFutureValue());
  
  return this.corpus;
};

retirementPlanSchema.methods.projectFutureValue = function() {
  const { currentAge, retirementAge } = this.basicInfo;
  const yearsToRetirement = retirementAge - currentAge;
  const { returnRate } = this.corpus.calculations;
  
  let futureValue = 0;
  
  this.investments.forEach(inv => {
    const currentVal = inv.currentValue || 0;
    const monthlyContribution = (inv.monthlyContribution || 0) + (inv.employerContribution || 0);
    const rate = (inv.expectedReturn || returnRate) / 100;
    const monthlyRate = rate / 12;
    const months = yearsToRetirement * 12;
    
    // Future value of current investment
    const fvCurrent = currentVal * Math.pow(1 + rate, yearsToRetirement);
    
    // Future value of monthly contributions
    let fvContributions = 0;
    if (monthlyContribution > 0) {
      fvContributions = monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    }
    
    futureValue += fvCurrent + fvContributions;
  });
  
  return Math.round(futureValue);
};

retirementPlanSchema.methods.calculateMonthlySavingsRequired = function() {
  const { currentAge, retirementAge } = this.basicInfo;
  const yearsToRetirement = retirementAge - currentAge;
  const { returnRate } = this.corpus.calculations;
  
  const currentValue = this.corpus.current || 0;
  const requiredCorpus = this.corpus.required;
  
  // Future value of current savings
  const fvCurrent = currentValue * Math.pow(1 + returnRate / 100, yearsToRetirement);
  
  // Amount needed from future contributions
  const amountNeeded = Math.max(0, requiredCorpus - fvCurrent);
  
  // Calculate monthly savings needed
  const monthlyRate = (returnRate / 100) / 12;
  const months = yearsToRetirement * 12;
  
  let monthlySavings;
  if (monthlyRate === 0) {
    monthlySavings = amountNeeded / months;
  } else {
    monthlySavings = amountNeeded / ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  }
  
  return Math.round(monthlySavings);
};

retirementPlanSchema.methods.generateProjections = function() {
  const { currentAge, retirementAge, lifeExpectancy } = this.basicInfo;
  const { targetMonthlyIncome } = this.goals;
  const { inflationRate } = this.corpus.calculations;
  
  this.projections = [];
  
  for (let age = currentAge; age <= lifeExpectancy; age += 5) {
    const yearsFromNow = age - currentAge;
    const yearsToRetirement = Math.max(0, retirementAge - age);
    
    // Inflation-adjusted monthly income
    const adjustedIncome = targetMonthlyIncome * Math.pow(1 + inflationRate / 100, yearsFromNow);
    
    // Calculate corpus needed at this age
    const yearsInRetirement = Math.max(0, lifeExpectancy - age);
    const corpusNeeded = adjustedIncome * 12 * yearsInRetirement * 0.8; // Simplified
    
    // Project current savings
    const currentSavings = this.investments.reduce((sum, inv) => {
      const val = inv.currentValue || 0;
      const contribution = (inv.monthlyContribution || 0) * 12 * yearsFromNow;
      const growth = Math.pow(1.12, yearsFromNow);
      return sum + (val + contribution) * growth;
    }, 0);
    
    const gap = Math.max(0, corpusNeeded - currentSavings);
    
    this.projections.push({
      age,
      year: new Date().getFullYear() + yearsFromNow,
      corpusRequired: Math.round(corpusNeeded),
      corpusProjected: Math.round(currentSavings),
      monthlyIncome: Math.round(adjustedIncome),
      gap: Math.round(gap),
      monthlySavingsNeeded: yearsToRetirement > 0 ? Math.round(gap / (yearsToRetirement * 12)) : 0
    });
  }
  
  return this.projections;
};

retirementPlanSchema.methods.assessRisks = function() {
  this.risks = [];
  
  const { currentAge, retirementAge } = this.basicInfo;
  const yearsToRetirement = retirementAge - currentAge;
  
  // Inflation risk
  if (this.corpus.calculations.inflationRate > 7) {
    this.risks.push({
      type: 'inflation',
      severity: 'high',
      impact: 'High inflation could erode purchasing power significantly',
      mitigation: 'Invest in inflation-beating assets like equity and real estate'
    });
  }
  
  // Longevity risk
  if (this.basicInfo.lifeExpectancy - retirementAge > 25) {
    this.risks.push({
      type: 'longevity',
      severity: 'medium',
      impact: 'Corpus may not last for extended retirement period',
      mitigation: 'Consider annuities and increase retirement corpus by 20%'
    });
  }
  
  // Market risk
  const equityExposure = this.investments
    .filter(inv => ['stocks', 'mutual_fund'].includes(inv.type))
    .reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
  
  const totalValue = this.corpus.current || 1;
  const equityPercent = (equityExposure / totalValue) * 100;
  
  if (yearsToRetirement < 10 && equityPercent > 60) {
    this.risks.push({
      type: 'market',
      severity: 'high',
      impact: 'High equity exposure near retirement increases volatility',
      mitigation: 'Gradually shift to debt instruments and reduce equity to 40%'
    });
  }
  
  // Healthcare risk
  if (!this.healthcarePlanning.insuranceCoverage || this.healthcarePlanning.insuranceCoverage < 500000) {
    this.risks.push({
      type: 'health',
      severity: 'critical',
      impact: 'Inadequate health insurance could deplete retirement corpus',
      mitigation: 'Get comprehensive health insurance with at least ₹10 lakh coverage'
    });
  }
  
  return this.risks;
};

retirementPlanSchema.methods.generateRecommendations = function() {
  this.recommendations = [];
  
  const monthlySavingsNeeded = this.calculateMonthlySavingsRequired();
  const currentMonthlyInvestment = this.investments
    .reduce((sum, inv) => sum + (inv.monthlyContribution || 0), 0);
  
  if (monthlySavingsNeeded > currentMonthlyInvestment) {
    const gap = monthlySavingsNeeded - currentMonthlyInvestment;
    this.recommendations.push({
      category: 'Savings',
      priority: 'high',
      suggestion: `Increase monthly investment by ₹${gap}`,
      expectedImpact: `Will help achieve retirement corpus of ₹${this.corpus.required}`,
      actionItems: [
        'Review and reduce discretionary expenses',
        'Set up automatic investment plan',
        'Consider additional income sources'
      ]
    });
  }
  
  // NPS recommendation
  const hasNPS = this.investments.some(inv => inv.type === 'nps');
  if (!hasNPS) {
    this.recommendations.push({
      category: 'Tax Efficiency',
      priority: 'high',
      suggestion: 'Start NPS investment for tax benefits',
      expectedImpact: 'Save up to ₹62,500 in taxes annually under 80C and 80CCD(1B)',
      actionItems: [
        'Open NPS Tier-I account',
        'Invest ₹50,000 for 80CCD(1B) benefit',
        'Choose appropriate asset allocation based on age'
      ]
    });
  }
  
  // Emergency fund
  const emergencyFund = this.withdrawalStrategy.emergencyFund || 0;
  const requiredEmergency = (this.basicInfo.currentAnnualIncome || 600000) * 0.5;
  
  if (emergencyFund < requiredEmergency) {
    this.recommendations.push({
      category: 'Risk Management',
      priority: 'critical',
      suggestion: 'Build emergency fund',
      expectedImpact: 'Protect retirement corpus from unexpected expenses',
      actionItems: [
        `Save ₹${requiredEmergency - emergencyFund} in liquid funds`,
        'Keep in easily accessible account',
        'Cover 6-12 months of expenses'
      ]
    });
  }
  
  return this.recommendations;
};

retirementPlanSchema.methods.runScenarioAnalysis = function() {
  this.scenarioAnalysis = [];
  
  const baseReturnRate = this.corpus.calculations.returnRate;
  const baseInflation = this.corpus.calculations.inflationRate;
  
  // Optimistic scenario
  this.corpus.calculations.returnRate = baseReturnRate + 2;
  this.corpus.calculations.inflationRate = baseInflation - 1;
  const optimisticCorpus = this.projectFutureValue();
  
  this.scenarioAnalysis.push({
    name: 'Optimistic',
    description: 'Higher returns, lower inflation',
    assumptions: {
      returnRate: baseReturnRate + 2,
      inflationRate: baseInflation - 1
    },
    projectedCorpus: optimisticCorpus,
    probability: 25,
    adequacy: optimisticCorpus >= this.corpus.required
  });
  
  // Pessimistic scenario
  this.corpus.calculations.returnRate = baseReturnRate - 2;
  this.corpus.calculations.inflationRate = baseInflation + 1;
  const pessimisticCorpus = this.projectFutureValue();
  
  this.scenarioAnalysis.push({
    name: 'Pessimistic',
    description: 'Lower returns, higher inflation',
    assumptions: {
      returnRate: baseReturnRate - 2,
      inflationRate: baseInflation + 1
    },
    projectedCorpus: pessimisticCorpus,
    probability: 25,
    adequacy: pessimisticCorpus >= this.corpus.required
  });
  
  // Most likely scenario
  this.corpus.calculations.returnRate = baseReturnRate;
  this.corpus.calculations.inflationRate = baseInflation;
  const likelyCorpus = this.projectFutureValue();
  
  this.scenarioAnalysis.push({
    name: 'Most Likely',
    description: 'Expected returns and inflation',
    assumptions: {
      returnRate: baseReturnRate,
      inflationRate: baseInflation
    },
    projectedCorpus: likelyCorpus,
    probability: 50,
    adequacy: likelyCorpus >= this.corpus.required
  });
  
  return this.scenarioAnalysis;
};

const RetirementPlan = mongoose.model('RetirementPlan', retirementPlanSchema);

module.exports = RetirementPlan;
