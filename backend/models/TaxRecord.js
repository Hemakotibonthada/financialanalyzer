const mongoose = require('mongoose');

const taxRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  financialYear: {
    type: String,
    required: true // Format: "2024-2025"
  },
  assessmentYear: {
    type: String,
    required: true // Format: "2025-2026"
  },
  taxRegime: {
    type: String,
    enum: ['old', 'new'],
    default: 'new'
  },
  income: {
    salary: {
      basic: { type: Number, default: 0 },
      hra: { type: Number, default: 0 },
      lta: { type: Number, default: 0 },
      specialAllowance: { type: Number, default: 0 },
      bonus: { type: Number, default: 0 },
      overtime: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    houseProperty: {
      rental: { type: Number, default: 0 },
      interestOnLoan: { type: Number, default: 0 },
      municipalTax: { type: Number, default: 0 },
      netIncome: { type: Number, default: 0 }
    },
    businessProfession: {
      gross: { type: Number, default: 0 },
      expenses: { type: Number, default: 0 },
      net: { type: Number, default: 0 }
    },
    capitalGains: {
      shortTerm: { type: Number, default: 0 },
      longTerm: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    otherSources: {
      interest: { type: Number, default: 0 },
      dividend: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    grossTotal: { type: Number, default: 0 }
  },
  deductions: {
    section80C: {
      ppf: { type: Number, default: 0 },
      elss: { type: Number, default: 0 },
      nsc: { type: Number, default: 0 },
      lifeInsurance: { type: Number, default: 0 },
      housingLoanPrincipal: { type: Number, default: 0 },
      sukanyaSamriddhi: { type: Number, default: 0 },
      epf: { type: Number, default: 0 },
      tuitionFees: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      limit: { type: Number, default: 150000 }
    },
    section80D: {
      self: { type: Number, default: 0 },
      parents: { type: Number, default: 0 },
      preventiveHealth: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    section80E: { type: Number, default: 0 }, // Education loan interest
    section80G: { type: Number, default: 0 }, // Donations
    section80TTA: { type: Number, default: 0 }, // Savings account interest
    section80TTB: { type: Number, default: 0 }, // Senior citizen interest
    section24: { type: Number, default: 0 }, // Home loan interest
    standardDeduction: { type: Number, default: 50000 },
    nps: {
      employer: { type: Number, default: 0 },
      additional: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    totalDeductions: { type: Number, default: 0 }
  },
  taxableIncome: { type: Number, default: 0 },
  taxCalculation: {
    slabs: [{
      from: Number,
      to: Number,
      rate: Number,
      tax: Number
    }],
    incomeTax: { type: Number, default: 0 },
    surcharge: { type: Number, default: 0 },
    cess: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 }
  },
  tds: {
    salary: { type: Number, default: 0 },
    interest: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  advanceTax: [{
    quarter: String,
    dueDate: Date,
    amount: Number,
    paidDate: Date,
    challanNumber: String,
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue'],
      default: 'pending'
    }
  }],
  taxPayable: { type: Number, default: 0 },
  refundDue: { type: Number, default: 0 },
  itr: {
    form: String, // ITR-1, ITR-2, etc.
    filedDate: Date,
    acknowledgement: String,
    status: {
      type: String,
      enum: ['not_filed', 'filed', 'processed', 'refund_issued', 'demand_raised']
    },
    processingDate: Date
  },
  documents: [{
    type: String,
    name: String,
    url: String,
    uploadDate: Date
  }],
  optimizations: [{
    suggestion: String,
    potentialSaving: Number,
    category: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high']
    }
  }],
  notes: String,
  status: {
    type: String,
    enum: ['draft', 'under_review', 'finalized', 'filed'],
    default: 'draft'
  }
}, {
  timestamps: true
});

// Indexes
taxRecordSchema.index({ userId: 1, financialYear: 1 }, { unique: true });
taxRecordSchema.index({ userId: 1, status: 1 });
taxRecordSchema.index({ 'itr.status': 1 });

// Methods
taxRecordSchema.methods.calculateTax = function() {
  // Calculate gross total income
  this.income.salary.total = Object.values(this.income.salary)
    .filter((v, k) => k !== 'total')
    .reduce((sum, val) => sum + (val || 0), 0);
  
  this.income.otherSources.total = 
    (this.income.otherSources.interest || 0) +
    (this.income.otherSources.dividend || 0) +
    (this.income.otherSources.other || 0);
  
  this.income.grossTotal =
    this.income.salary.total +
    this.income.houseProperty.netIncome +
    this.income.businessProfession.net +
    this.income.capitalGains.total +
    this.income.otherSources.total;
  
  // Calculate total deductions
  this.deductions.section80C.total = Math.min(
    Object.values(this.deductions.section80C)
      .filter((v, k) => k !== 'total' && k !== 'limit')
      .reduce((sum, val) => sum + (val || 0), 0),
    this.deductions.section80C.limit
  );
  
  this.deductions.section80D.total =
    (this.deductions.section80D.self || 0) +
    (this.deductions.section80D.parents || 0) +
    (this.deductions.section80D.preventiveHealth || 0);
  
  this.deductions.nps.total =
    (this.deductions.nps.employer || 0) +
    (this.deductions.nps.additional || 0);
  
  this.deductions.totalDeductions =
    this.deductions.section80C.total +
    this.deductions.section80D.total +
    (this.deductions.section80E || 0) +
    (this.deductions.section80G || 0) +
    (this.deductions.section80TTA || 0) +
    (this.deductions.section80TTB || 0) +
    (this.deductions.section24 || 0) +
    (this.deductions.standardDeduction || 0) +
    this.deductions.nps.total;
  
  // Calculate taxable income
  this.taxableIncome = Math.max(0, this.income.grossTotal - this.deductions.totalDeductions);
  
  // Calculate tax based on regime
  const slabs = this.taxRegime === 'new' 
    ? this.getNewRegimeSlabs()
    : this.getOldRegimeSlabs();
  
  let tax = 0;
  this.taxCalculation.slabs = [];
  
  for (const slab of slabs) {
    const taxableAmount = Math.min(
      Math.max(0, this.taxableIncome - slab.from),
      slab.to - slab.from
    );
    
    const slabTax = (taxableAmount * slab.rate) / 100;
    tax += slabTax;
    
    if (taxableAmount > 0) {
      this.taxCalculation.slabs.push({
        from: slab.from,
        to: slab.to,
        rate: slab.rate,
        tax: slabTax
      });
    }
  }
  
  this.taxCalculation.incomeTax = tax;
  
  // Calculate surcharge (if income > 50 lakhs)
  if (this.taxableIncome > 5000000) {
    this.taxCalculation.surcharge = tax * 0.10; // 10% surcharge
  } else {
    this.taxCalculation.surcharge = 0;
  }
  
  // Calculate cess (4%)
  this.taxCalculation.cess = (tax + this.taxCalculation.surcharge) * 0.04;
  
  this.taxCalculation.totalTax = 
    tax + 
    this.taxCalculation.surcharge + 
    this.taxCalculation.cess;
  
  // Calculate TDS total
  this.tds.total = 
    (this.tds.salary || 0) +
    (this.tds.interest || 0) +
    (this.tds.other || 0);
  
  // Calculate advance tax total
  const advanceTaxPaid = this.advanceTax
    .filter(at => at.status === 'paid')
    .reduce((sum, at) => sum + at.amount, 0);
  
  // Calculate tax payable or refund
  const totalTaxPaid = this.tds.total + advanceTaxPaid;
  const difference = this.taxCalculation.totalTax - totalTaxPaid;
  
  if (difference > 0) {
    this.taxPayable = Math.round(difference);
    this.refundDue = 0;
  } else {
    this.taxPayable = 0;
    this.refundDue = Math.round(Math.abs(difference));
  }
  
  return this;
};

taxRecordSchema.methods.getNewRegimeSlabs = function() {
  return [
    { from: 0, to: 300000, rate: 0 },
    { from: 300000, to: 600000, rate: 5 },
    { from: 600000, to: 900000, rate: 10 },
    { from: 900000, to: 1200000, rate: 15 },
    { from: 1200000, to: 1500000, rate: 20 },
    { from: 1500000, to: Infinity, rate: 30 }
  ];
};

taxRecordSchema.methods.getOldRegimeSlabs = function() {
  return [
    { from: 0, to: 250000, rate: 0 },
    { from: 250000, to: 500000, rate: 5 },
    { from: 500000, to: 1000000, rate: 20 },
    { from: 1000000, to: Infinity, rate: 30 }
  ];
};

taxRecordSchema.methods.generateOptimizations = function() {
  this.optimizations = [];
  
  // Check 80C utilization
  const section80CUsed = this.deductions.section80C.total;
  const section80CLimit = 150000;
  
  if (section80CUsed < section80CLimit) {
    const remaining = section80CLimit - section80CUsed;
    const saving = remaining * 0.30; // Assuming 30% tax bracket
    
    this.optimizations.push({
      suggestion: `Invest ₹${remaining} more in 80C instruments (PPF, ELSS, etc.)`,
      potentialSaving: saving,
      category: '80C',
      priority: 'high'
    });
  }
  
  // Check NPS additional deduction
  if (!this.deductions.nps.additional || this.deductions.nps.additional < 50000) {
    const remaining = 50000 - (this.deductions.nps.additional || 0);
    const saving = remaining * 0.30;
    
    this.optimizations.push({
      suggestion: `Invest ₹${remaining} in NPS to claim additional 80CCD(1B) deduction`,
      potentialSaving: saving,
      category: 'NPS',
      priority: 'high'
    });
  }
  
  // Check health insurance
  if (!this.deductions.section80D.self || this.deductions.section80D.self < 25000) {
    this.optimizations.push({
      suggestion: 'Get health insurance to claim 80D deduction up to ₹25,000',
      potentialSaving: 25000 * 0.30,
      category: '80D',
      priority: 'medium'
    });
  }
  
  // Tax regime comparison
  const otherRegimeTax = this.calculateOtherRegimeTax();
  if (otherRegimeTax < this.taxCalculation.totalTax) {
    this.optimizations.push({
      suggestion: `Switch to ${this.taxRegime === 'new' ? 'old' : 'new'} tax regime`,
      potentialSaving: this.taxCalculation.totalTax - otherRegimeTax,
      category: 'regime',
      priority: 'high'
    });
  }
  
  return this.optimizations;
};

taxRecordSchema.methods.calculateOtherRegimeTax = function() {
  const currentRegime = this.taxRegime;
  this.taxRegime = currentRegime === 'new' ? 'old' : 'new';
  
  const slabs = this.taxRegime === 'new' 
    ? this.getNewRegimeSlabs()
    : this.getOldRegimeSlabs();
  
  let tax = 0;
  for (const slab of slabs) {
    const taxableAmount = Math.min(
      Math.max(0, this.taxableIncome - slab.from),
      slab.to - slab.from
    );
    tax += (taxableAmount * slab.rate) / 100;
  }
  
  const surcharge = this.taxableIncome > 5000000 ? tax * 0.10 : 0;
  const cess = (tax + surcharge) * 0.04;
  
  this.taxRegime = currentRegime; // Restore original regime
  
  return tax + surcharge + cess;
};

const TaxRecord = mongoose.model('TaxRecord', taxRecordSchema);

module.exports = TaxRecord;
