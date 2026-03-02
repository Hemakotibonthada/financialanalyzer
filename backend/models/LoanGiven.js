const mongoose = require('mongoose');

const loanGivenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  borrowerName: {
    type: String,
    required: true,
    trim: true
  },
  relationship: {
    type: String,
    enum: ['Friend', 'Family', 'Colleague', 'Relative', 'Other'],
    default: 'Friend'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['USD', 'INR']
  },
  amountInINR: {
    type: Number,
    required: true,
    min: 0,
    index: true
  },
  exchangeRate: {
    type: Number,
    default: 1,
    min: 0
  },
  loanDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  expectedRepaymentDate: {
    type: Date
  },
  actualRepaymentDate: {
    type: Date
  },
  purpose: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'partially_paid', 'fully_paid', 'overdue', 'written_off'],
    default: 'pending'
  },
  repayments: [{
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['USD', 'INR']
    },
    amountInINR: {
      type: Number,
      required: true,
      min: 0
    },
    exchangeRate: {
      type: Number,
      default: 1
    },
    date: {
      type: Date,
      required: true,
      default: Date.now
    },
    method: {
      type: String,
      enum: ['cash', 'bank_transfer', 'upi', 'cheque', 'other'],
      default: 'cash'
    },
    transactionId: String,
    notes: String
  }],
  totalRepaid: {
    type: Number,
    default: 0
  },
  totalRepaidInINR: {
    type: Number,
    default: 0,
    index: true
  },
  remainingAmount: {
    type: Number,
    default: 0
  },
  remainingAmountInINR: {
    type: Number,
    default: 0,
    index: true
  },
  contactDetails: {
    phone: String,
    email: String
  },
  interestRate: {
    type: Number,
    default: 0,
    min: 0
  },
  interestType: {
    type: String,
    enum: ['none', 'percentage', 'flat', 'rupee_per_100'],
    default: 'none'
  },
  hasInterest: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    trim: true
  },
  reminders: [{
    date: Date,
    message: String,
    sent: {
      type: Boolean,
      default: false
    }
  }],
  documents: [{
    documentType: {
      type: String,
      enum: ['agreement', 'receipt', 'promissory_note', 'other']
    },
    fileName: String,
    filePath: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [String],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
loanGivenSchema.index({ userId: 1, status: 1 });
loanGivenSchema.index({ userId: 1, borrowerName: 1 });
loanGivenSchema.index({ loanDate: -1 });
loanGivenSchema.index({ expectedRepaymentDate: 1 });

// Virtual for days overdue
loanGivenSchema.virtual('daysOverdue').get(function() {
  if (this.status === 'fully_paid' || !this.expectedRepaymentDate) return 0;
  
  const today = new Date();
  const expected = new Date(this.expectedRepaymentDate);
  
  if (today > expected) {
    const diffTime = Math.abs(today - expected);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  
  return 0;
});

// Virtual for repayment percentage
loanGivenSchema.virtual('repaymentPercentage').get(function() {
  const totalOwed = this.amount + (this.currentInterest || 0);
  if (totalOwed === 0) return 0;
  return ((this.totalRepaid / totalOwed) * 100).toFixed(2);
});

// Virtual field: Calculate current accrued interest
loanGivenSchema.virtual('currentInterest').get(function() {
  if (!this.hasInterest || this.interestType === 'none' || this.interestRate === 0) {
    return 0;
  }

  // Flat interest: fixed rupee amount
  if (this.interestType === 'flat') {
    return this.interestRate;
  }

  const startDate = new Date(this.loanDate);
  const endDate = this.status === 'fully_paid' && this.actualRepaymentDate
    ? new Date(this.actualRepaymentDate)
    : new Date();

  const daysElapsed = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));

  // Rupee per 100 per month: (amount × rate × months) / 100
  if (this.interestType === 'rupee_per_100') {
    const monthsElapsed = daysElapsed / 30.44;
    const interest = (this.amount * this.interestRate * monthsElapsed) / 100;
    return Math.round(interest * 100) / 100;
  }

  // Percentage (annual rate): (P × R × days) / (100 × 365)
  if (this.interestType === 'percentage') {
    const interest = (this.amount * this.interestRate * daysElapsed) / (100 * 365);
    return Math.round(interest * 100) / 100;
  }

  return 0;
});

// Virtual field: Monthly interest amount
loanGivenSchema.virtual('monthlyInterest').get(function() {
  if (this.interestType === 'rupee_per_100') {
    return Math.round((this.amount * this.interestRate) / 100 * 100) / 100;
  }
  if (this.interestType === 'percentage') {
    return Math.round((this.amount * this.interestRate) / (100 * 12) * 100) / 100;
  }
  if (this.interestType === 'flat') {
    return this.interestRate;
  }
  return 0;
});

// Virtual field: Equivalent annual rate
loanGivenSchema.virtual('annualEquivalentRate').get(function() {
  if (this.interestType === 'rupee_per_100') {
    return Math.round(this.interestRate * 12 * 100) / 100;
  }
  if (this.interestType === 'percentage') {
    return this.interestRate;
  }
  return 0;
});

// Enable virtuals in JSON
loanGivenSchema.set('toJSON', { virtuals: true });
loanGivenSchema.set('toObject', { virtuals: true });

// Pre-save middleware to calculate totals and update status
loanGivenSchema.pre('save', function(next) {
  // Calculate total repaid
  if (this.repayments && this.repayments.length > 0) {
    this.totalRepaid = this.repayments.reduce((sum, payment) => sum + payment.amount, 0);
  }
  
  // Calculate remaining amount (principal + interest - repaid)
  const accruedInterest = this.currentInterest || 0;
  this.remainingAmount = this.amount + accruedInterest - this.totalRepaid;
  
  // Update status based on repayment
  if (this.remainingAmount <= 0) {
    this.status = 'fully_paid';
    if (!this.actualRepaymentDate) {
      this.actualRepaymentDate = new Date();
    }
  } else if (this.totalRepaid > 0) {
    this.status = 'partially_paid';
  } else if (this.expectedRepaymentDate && new Date() > new Date(this.expectedRepaymentDate)) {
    this.status = 'overdue';
  } else {
    this.status = 'pending';
  }
  
  next();
});

// Instance method to add a repayment
loanGivenSchema.methods.addRepayment = function(repaymentData) {
  this.repayments.push(repaymentData);
  return this.save();
};

// Static method to get all loans given by user
loanGivenSchema.statics.getUserLoans = function(userId, filters = {}) {
  const query = { userId, ...filters };
  return this.find(query).sort({ loanDate: -1 });
};

// Static method to get summary statistics
loanGivenSchema.statics.getSummary = async function(userId) {
  const loans = await this.find({ userId });
  
  let totalInterest = 0;
  loans.forEach(loan => {
    totalInterest += loan.currentInterest || 0;
  });

  const totalLent = loans.reduce((sum, loan) => sum + loan.amount, 0);
  const totalRepaid = loans.reduce((sum, loan) => sum + loan.totalRepaid, 0);
  const totalOutstanding = loans.reduce((sum, loan) => sum + (loan.amount + (loan.currentInterest || 0) - loan.totalRepaid), 0);
  
  const activeLoans = loans.filter(l => l.status !== 'fully_paid' && l.status !== 'written_off');
  const overdueLoans = loans.filter(l => l.status === 'overdue');
  const fullyPaidLoans = loans.filter(l => l.status === 'fully_paid');
  
  return {
    totalLent,
    totalRepaid,
    totalOutstanding: Math.max(0, totalOutstanding),
    totalInterest,
    activeLoansCount: activeLoans.length,
    overdueLoansCount: overdueLoans.length,
    fullyPaidCount: fullyPaidLoans.length,
    totalLoans: loans.length
  };
};

const LoanGiven = mongoose.model('LoanGiven', loanGivenSchema);

module.exports = LoanGiven;
