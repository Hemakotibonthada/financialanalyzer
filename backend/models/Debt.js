const mongoose = require('mongoose');

const debtSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  debtType: {
    type: String,
    enum: [
      'home_loan',
      'car_loan',
      'personal_loan',
      'education_loan',
      'credit_card',
      'business_loan',
      'gold_loan',
      'overdraft',
      'line_of_credit',
      'payday_loan',
      'peer_to_peer',
      'medical_debt',
      'other'
    ],
    required: true
  },
  creditor: {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['bank', 'nbfc', 'credit_union', 'individual', 'company', 'other']
    },
    accountNumber: String,
    contact: {
      phone: String,
      email: String,
      address: String
    }
  },
  loanDetails: {
    principalAmount: { type: Number, required: true },
    currentBalance: { type: Number, required: true },
    interestRate: { type: Number, required: true },
    rateType: {
      type: String,
      enum: ['fixed', 'variable', 'hybrid'],
      default: 'fixed'
    },
    tenure: Number, // Months
    remainingTenure: Number,
    startDate: { type: Date, required: true },
    maturityDate: Date,
    emi: Number,
    loanNumber: String
  },
  paymentHistory: [{
    date: Date,
    principalPaid: Number,
    interestPaid: Number,
    totalPaid: Number,
    balanceAfterPayment: Number,
    status: {
      type: String,
      enum: ['on_time', 'late', 'missed', 'partial'],
      default: 'on_time'
    },
    lateFee: Number,
    paymentMethod: String,
    receiptNumber: String
  }],
  prepayments: [{
    date: Date,
    amount: Number,
    newEmi: Number,
    newTenure: Number,
    savedInterest: Number,
    prepaymentCharges: Number,
    reason: String
  }],
  statistics: {
    totalPaid: Number,
    totalPrincipalPaid: Number,
    totalInterestPaid: Number,
    totalLateFees: Number,
    remainingInterest: Number,
    percentagePaid: Number,
    timeElapsed: Number, // Months
    onTimePayments: Number,
    latePayments: Number,
    missedPayments: Number,
    paymentScore: Number
  },
  payoffStrategy: {
    method: {
      type: String,
      enum: ['avalanche', 'snowball', 'hybrid', 'minimum', 'custom'],
      default: 'minimum'
    },
    extraPayment: Number,
    targetPayoffDate: Date,
    projectedSavings: Number
  },
  projections: [{
    month: Number,
    date: Date,
    emiDue: Number,
    principalComponent: Number,
    interestComponent: Number,
    balance: Number,
    cumulativeInterest: Number
  }],
  status: {
    type: String,
    enum: ['active', 'closed', 'defaulted', 'settled', 'restructured', 'refinanced'],
    default: 'active'
  },
  collateral: {
    hasCollateral: Boolean,
    // Wrapped so Mongoose treats `collateral` as a nested object, not a String path
    // (a bare `type: String` key makes Mongoose interpret the whole object as its type).
    type: { type: String },
    description: String,
    value: Number,
    ltv: Number // Loan to Value ratio
  },
  guarantor: [{
    name: String,
    relationship: String,
    contact: String
  }],
  documents: [{
    // Wrapped for the same reason as `collateral.type` above.
    type: { type: String },
    name: String,
    url: String,
    uploadDate: Date
  }],
  alerts: [{
    type: {
      type: String,
      enum: ['payment_due', 'payment_overdue', 'interest_rate_change', 'milestone', 'refinance_opportunity']
    },
    date: Date,
    message: String,
    isActive: Boolean
  }],
  refinanceOpportunities: [{
    date: Date,
    currentRate: Number,
    availableRate: Number,
    potentialSavings: Number,
    processingFee: Number,
    breakEvenMonths: Number,
    recommendation: String
  }],
  creditImpact: {
    utilizationRatio: Number,
    onTimePaymentRatio: Number,
    ageOfDebt: Number, // Months
    impactOnScore: Number
  },
  taxBenefits: {
    principalDeduction: Number,
    interestDeduction: Number,
    section: String, // 80C, 24(b), etc.
    financialYear: String
  },
  notes: String,
  tags: [String]
}, {
  timestamps: true
});

// Indexes
debtSchema.index({ userId: 1, status: 1 });
debtSchema.index({ userId: 1, debtType: 1 });
debtSchema.index({ 'loanDetails.maturityDate': 1 });
debtSchema.index({ status: 1 });

// Methods
debtSchema.methods.calculateStatistics = function() {
  // Calculate payment statistics
  const payments = this.paymentHistory;
  
  this.statistics.totalPaid = payments.reduce((sum, p) => sum + (p.totalPaid || 0), 0);
  this.statistics.totalPrincipalPaid = payments.reduce((sum, p) => sum + (p.principalPaid || 0), 0);
  this.statistics.totalInterestPaid = payments.reduce((sum, p) => sum + (p.interestPaid || 0), 0);
  this.statistics.totalLateFees = payments.reduce((sum, p) => sum + (p.lateFee || 0), 0);
  
  // Add prepayment amounts
  const prepaymentTotal = this.prepayments.reduce((sum, p) => sum + p.amount, 0);
  this.statistics.totalPrincipalPaid += prepaymentTotal;
  
  // Calculate percentage paid
  this.statistics.percentagePaid = ((this.loanDetails.principalAmount - this.loanDetails.currentBalance) / this.loanDetails.principalAmount) * 100;
  
  // Calculate time elapsed
  const months = Math.floor((new Date() - this.loanDetails.startDate) / (30 * 24 * 60 * 60 * 1000));
  this.statistics.timeElapsed = months;
  
  // Calculate remaining interest
  this.statistics.remainingInterest = this.calculateRemainingInterest();
  
  // Payment pattern analysis
  this.statistics.onTimePayments = payments.filter(p => p.status === 'on_time').length;
  this.statistics.latePayments = payments.filter(p => p.status === 'late').length;
  this.statistics.missedPayments = payments.filter(p => p.status === 'missed').length;
  
  // Payment score (0-100)
  const totalPayments = payments.length;
  if (totalPayments > 0) {
    this.statistics.paymentScore = ((this.statistics.onTimePayments / totalPayments) * 100);
  }
  
  return this.statistics;
};

debtSchema.methods.calculateRemainingInterest = function() {
  if (!this.loanDetails.emi || !this.loanDetails.remainingTenure) {
    return 0;
  }
  
  const totalRemainingPayments = this.loanDetails.emi * this.loanDetails.remainingTenure;
  const remainingPrincipal = this.loanDetails.currentBalance;
  
  return totalRemainingPayments - remainingPrincipal;
};

debtSchema.methods.recordPayment = async function(paymentDetails) {
  const emi = paymentDetails.amount || this.loanDetails.emi;
  const rate = this.loanDetails.interestRate / 1200; // Monthly rate
  const balance = this.loanDetails.currentBalance;
  
  // Calculate interest and principal components
  const interestComponent = balance * rate;
  const principalComponent = emi - interestComponent;
  
  const payment = {
    date: paymentDetails.date || new Date(),
    principalPaid: principalComponent,
    interestPaid: interestComponent,
    totalPaid: emi,
    balanceAfterPayment: balance - principalComponent,
    status: paymentDetails.status || 'on_time',
    lateFee: paymentDetails.lateFee || 0,
    paymentMethod: paymentDetails.paymentMethod,
    receiptNumber: paymentDetails.receiptNumber
  };
  
  this.paymentHistory.push(payment);
  
  // Update current balance
  this.loanDetails.currentBalance = payment.balanceAfterPayment;
  this.loanDetails.remainingTenure = this.loanDetails.remainingTenure - 1;
  
  // Check if loan is paid off
  if (this.loanDetails.currentBalance <= 0) {
    this.status = 'closed';
    this.loanDetails.currentBalance = 0;
  }
  
  // Recalculate statistics
  this.calculateStatistics();
  
  await this.save();
  return payment;
};

debtSchema.methods.recordPrepayment = async function(amount, charges = 0) {
  const oldEmi = this.loanDetails.emi;
  const oldTenure = this.loanDetails.remainingTenure;
  const oldBalance = this.loanDetails.currentBalance;
  const rate = this.loanDetails.interestRate / 1200;
  
  // Reduce principal
  const newBalance = oldBalance - amount;
  this.loanDetails.currentBalance = Math.max(0, newBalance);
  
  // Calculate new tenure (keeping EMI same) or new EMI (keeping tenure same)
  // Here we keep EMI same and reduce tenure
  let newTenure = 0;
  if (newBalance > 0) {
    newTenure = Math.ceil(Math.log(oldEmi / (oldEmi - newBalance * rate)) / Math.log(1 + rate));
  }
  
  const savedInterest = (oldEmi * oldTenure - newBalance) - (oldEmi * newTenure - newBalance);
  
  this.prepayments.push({
    date: new Date(),
    amount,
    newEmi: oldEmi,
    newTenure,
    savedInterest: Math.max(0, savedInterest),
    prepaymentCharges: charges
  });
  
  this.loanDetails.remainingTenure = newTenure;
  
  if (this.loanDetails.currentBalance === 0) {
    this.status = 'closed';
  }
  
  await this.save();
};

debtSchema.methods.generateAmortizationSchedule = function() {
  const principal = this.loanDetails.currentBalance;
  const rate = this.loanDetails.interestRate / 1200;
  const tenure = this.loanDetails.remainingTenure;
  const emi = this.loanDetails.emi;
  
  this.projections = [];
  let balance = principal;
  let cumulativeInterest = this.statistics.totalInterestPaid || 0;
  
  for (let month = 1; month <= tenure; month++) {
    const interestComponent = balance * rate;
    const principalComponent = emi - interestComponent;
    balance -= principalComponent;
    cumulativeInterest += interestComponent;
    
    const date = new Date();
    date.setMonth(date.getMonth() + month);
    
    this.projections.push({
      month,
      date,
      emiDue: emi,
      principalComponent: Math.round(principalComponent),
      interestComponent: Math.round(interestComponent),
      balance: Math.round(Math.max(0, balance)),
      cumulativeInterest: Math.round(cumulativeInterest)
    });
    
    if (balance <= 0) break;
  }
  
  return this.projections;
};

debtSchema.methods.calculatePayoffWithExtra = function(extraPayment = 0) {
  const principal = this.loanDetails.currentBalance;
  const rate = this.loanDetails.interestRate / 1200;
  const emi = this.loanDetails.emi + extraPayment;
  
  let balance = principal;
  let months = 0;
  let totalInterest = 0;
  
  while (balance > 0 && months < 600) { // Max 50 years
    const interest = balance * rate;
    const principalPaid = Math.min(emi - interest, balance);
    
    balance -= principalPaid;
    totalInterest += interest;
    months++;
    
    if (balance <= 0) break;
  }
  
  // Calculate savings
  const originalMonths = this.loanDetails.remainingTenure;
  const originalInterest = this.calculateRemainingInterest();
  
  const monthsSaved = originalMonths - months;
  const interestSaved = originalInterest - totalInterest;
  
  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() + months);
  
  return {
    months,
    targetPayoffDate: targetDate,
    totalInterest: Math.round(totalInterest),
    monthsSaved,
    interestSaved: Math.round(interestSaved),
    totalSavings: Math.round(interestSaved),
    extraPaymentRequired: extraPayment
  };
};

debtSchema.methods.analyzeRefinanceOpportunity = function(newRate) {
  const currentRate = this.loanDetails.interestRate;
  const principal = this.loanDetails.currentBalance;
  const remainingTenure = this.loanDetails.remainingTenure;
  
  // Calculate current total payment
  const currentTotalPayment = this.loanDetails.emi * remainingTenure;
  
  // Calculate new EMI with new rate
  const newMonthlyRate = newRate / 1200;
  const newEmi = (principal * newMonthlyRate * Math.pow(1 + newMonthlyRate, remainingTenure)) / 
                 (Math.pow(1 + newMonthlyRate, remainingTenure) - 1);
  const newTotalPayment = newEmi * remainingTenure;
  
  // Typical refinance costs (1-2% of principal)
  const processingFee = principal * 0.015;
  
  const savings = currentTotalPayment - newTotalPayment;
  const netSavings = savings - processingFee;
  const breakEvenMonths = Math.ceil(processingFee / (this.loanDetails.emi - newEmi));
  
  const opportunity = {
    date: new Date(),
    currentRate,
    availableRate: newRate,
    potentialSavings: Math.round(savings),
    processingFee: Math.round(processingFee),
    netSavings: Math.round(netSavings),
    breakEvenMonths,
    recommendation: netSavings > 0 && breakEvenMonths < remainingTenure / 2 
      ? 'Recommended - You will break even in ' + breakEvenMonths + ' months'
      : 'Not recommended - Break even period too long'
  };
  
  this.refinanceOpportunities.push(opportunity);
  
  return opportunity;
};

debtSchema.methods.assessCreditImpact = function() {
  // Utilization ratio (for credit cards and lines of credit)
  if (['credit_card', 'line_of_credit'].includes(this.debtType)) {
    const limit = this.loanDetails.principalAmount; // Assuming this is the credit limit
    const used = this.loanDetails.currentBalance;
    this.creditImpact.utilizationRatio = (used / limit) * 100;
  }
  
  // On-time payment ratio
  const totalPayments = this.paymentHistory.length;
  const onTimePayments = this.statistics.onTimePayments || 0;
  
  if (totalPayments > 0) {
    this.creditImpact.onTimePaymentRatio = (onTimePayments / totalPayments) * 100;
  }
  
  // Age of debt
  const months = Math.floor((new Date() - this.loanDetails.startDate) / (30 * 24 * 60 * 60 * 1000));
  this.creditImpact.ageOfDebt = months;
  
  // Impact on credit score (simplified)
  let impact = 0;
  
  // Payment history impact (35% of score)
  if (this.creditImpact.onTimePaymentRatio >= 95) impact += 35;
  else if (this.creditImpact.onTimePaymentRatio >= 90) impact += 30;
  else if (this.creditImpact.onTimePaymentRatio >= 80) impact += 20;
  else impact += 10;
  
  // Utilization impact (30% of score)
  if (this.creditImpact.utilizationRatio) {
    if (this.creditImpact.utilizationRatio < 30) impact += 30;
    else if (this.creditImpact.utilizationRatio < 50) impact += 20;
    else if (this.creditImpact.utilizationRatio < 75) impact += 10;
    else impact += 5;
  } else {
    impact += 25; // No utilization for term loans
  }
  
  this.creditImpact.impactOnScore = impact;
  
  return this.creditImpact;
};

// Static methods
debtSchema.statics.getDebtSummary = async function(userId) {
  const debts = await this.find({ userId, status: 'active' });
  
  const summary = {
    totalDebts: debts.length,
    totalPrincipal: 0,
    totalCurrentBalance: 0,
    totalMonthlyPayment: 0,
    totalInterestPaid: 0,
    totalRemainingInterest: 0,
    byType: {},
    debtToIncomeRatio: 0,
    averageInterestRate: 0,
    totalPayoffTime: 0
  };
  
  debts.forEach(debt => {
    debt.calculateStatistics();
    
    summary.totalPrincipal += debt.loanDetails.principalAmount;
    summary.totalCurrentBalance += debt.loanDetails.currentBalance;
    summary.totalMonthlyPayment += debt.loanDetails.emi || 0;
    summary.totalInterestPaid += debt.statistics.totalInterestPaid;
    summary.totalRemainingInterest += debt.statistics.remainingInterest;
    
    // Group by type
    const type = debt.debtType;
    if (!summary.byType[type]) {
      summary.byType[type] = {
        count: 0,
        balance: 0,
        monthlyPayment: 0
      };
    }
    
    summary.byType[type].count++;
    summary.byType[type].balance += debt.loanDetails.currentBalance;
    summary.byType[type].monthlyPayment += debt.loanDetails.emi || 0;
  });
  
  // Calculate average interest rate
  if (debts.length > 0) {
    const weightedRate = debts.reduce((sum, debt) => {
      return sum + (debt.loanDetails.interestRate * debt.loanDetails.currentBalance);
    }, 0);
    summary.averageInterestRate = weightedRate / summary.totalCurrentBalance;
  }
  
  return summary;
};

debtSchema.statics.getPayoffPlan = async function(userId, strategy = 'avalanche', extraPayment = 0) {
  const debts = await this.find({ userId, status: 'active' }).sort({
    'loanDetails.interestRate': -1 // For avalanche method
  });
  
  if (debts.length === 0) return { plan: [], summary: {} };
  
  // For snowball method, sort by balance
  if (strategy === 'snowball') {
    debts.sort((a, b) => a.loanDetails.currentBalance - b.loanDetails.currentBalance);
  }
  
  const plan = [];
  let month = 0;
  let activeDebts = debts.map(d => ({
    id: d._id,
    name: d.creditor.name,
    balance: d.loanDetails.currentBalance,
    rate: d.loanDetails.interestRate / 1200,
    minPayment: d.loanDetails.emi
  }));
  
  let availableExtra = extraPayment;
  
  while (activeDebts.some(d => d.balance > 0) && month < 600) {
    month++;
    const monthPlan = { month, payments: [] };
    
    // Pay minimum on all debts
    activeDebts.forEach(debt => {
      if (debt.balance > 0) {
        const interest = debt.balance * debt.rate;
        const principal = Math.min(debt.minPayment - interest, debt.balance);
        
        debt.balance -= principal;
        
        monthPlan.payments.push({
          debtId: debt.id,
          debtName: debt.name,
          payment: debt.minPayment,
          principal,
          interest,
          balance: Math.max(0, debt.balance)
        });
      }
    });
    
    // Apply extra payment to target debt (first in sorted order)
    if (availableExtra > 0) {
      const targetDebt = activeDebts.find(d => d.balance > 0);
      if (targetDebt) {
        const extraPrincipal = Math.min(availableExtra, targetDebt.balance);
        targetDebt.balance -= extraPrincipal;
        
        const payment = monthPlan.payments.find(p => p.debtId.equals(targetDebt.id));
        if (payment) {
          payment.payment += extraPrincipal;
          payment.principal += extraPrincipal;
          payment.balance = targetDebt.balance;
        }
      }
    }
    
    plan.push(monthPlan);
    
    // When a debt is paid off, add its minimum payment to extra payment
    const paidOffDebt = activeDebts.find(d => d.balance === 0 && d.minPayment > 0);
    if (paidOffDebt) {
      availableExtra += paidOffDebt.minPayment;
      paidOffDebt.minPayment = 0;
    }
  }
  
  const totalInterest = plan.reduce((sum, monthPlan) => {
    return sum + monthPlan.payments.reduce((s, p) => s + p.interest, 0);
  }, 0);
  
  return {
    strategy,
    plan,
    summary: {
      totalMonths: month,
      totalInterestPaid: Math.round(totalInterest),
      debtFreeDate: new Date(new Date().setMonth(new Date().getMonth() + month))
    }
  };
};

const Debt = mongoose.model('Debt', debtSchema);

module.exports = Debt;
