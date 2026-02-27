const mongoose = require('mongoose');

/**
 * PersonalLoan Model - For tracking loans TAKEN from friends/family
 * These are on-request loans without fixed EMI schedules
 */
const personalLoanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  lenderName: {
    type: String,
    required: true,
    trim: true
  },
  relationship: {
    type: String,
    enum: ['Friend', 'Family', 'Colleague', 'Relative', 'Other'],
    default: 'Friend'
  },
  principalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  loanTakenDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  interestRate: {
    type: Number,
    default: 0,
    min: 0
  },
  interestType: {
    type: String,
    enum: ['simple', 'flat', 'none'],
    default: 'none'
  },
  purpose: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'repaid'],
    default: 'active'
  },
  repaymentDate: {
    type: Date
  },
  totalRepaid: {
    type: Number,
    default: 0,
    min: 0
  },
  contactDetails: {
    phone: String,
    email: String
  },
  notes: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  tags: [String]
}, {
  timestamps: true
});

// Virtual field: Calculate current interest based on time elapsed
personalLoanSchema.virtual('currentInterest').get(function() {
  if (this.interestType === 'none' || this.interestRate === 0) {
    return 0;
  }

  // Flat interest: fixed rupee amount, no time-based calculation
  if (this.interestType === 'flat') {
    return this.interestRate; // interestRate is the flat rupee amount
  }

  const startDate = new Date(this.loanTakenDate);
  const endDate = this.status === 'repaid' && this.repaymentDate 
    ? new Date(this.repaymentDate) 
    : new Date();
  
  // Calculate days elapsed
  const daysElapsed = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
  
  // Simple interest calculation: (P × R × T) / (100 × 365)
  // T in days, R is annual rate
  const interest = (this.principalAmount * this.interestRate * daysElapsed) / (100 * 365);
  
  return Math.round(interest * 100) / 100; // Round to 2 decimal places
});

// Virtual field: Calculate total outstanding (principal + interest)
personalLoanSchema.virtual('outstandingAmount').get(function() {
  if (this.status === 'repaid') {
    return 0;
  }
  return this.principalAmount + this.currentInterest - this.totalRepaid;
});

// Virtual field: Calculate days since loan taken
personalLoanSchema.virtual('daysSinceTaken').get(function() {
  const startDate = new Date(this.loanTakenDate);
  const now = new Date();
  return Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
});

// Ensure virtuals are included in JSON
personalLoanSchema.set('toJSON', { virtuals: true });
personalLoanSchema.set('toObject', { virtuals: true });

// Pre-save middleware to update status
personalLoanSchema.pre('save', function(next) {
  // If fully repaid, mark as repaid
  if (this.totalRepaid >= this.principalAmount + this.currentInterest) {
    this.status = 'repaid';
    if (!this.repaymentDate) {
      this.repaymentDate = new Date();
    }
  }
  next();
});

// Static method: Get all active personal loans for a user
personalLoanSchema.statics.getActiveLoans = function(userId) {
  return this.find({ userId, status: 'active' }).sort({ loanTakenDate: -1 });
};

// Static method: Get summary statistics
personalLoanSchema.statics.getSummary = async function(userId) {
  const activeLoans = await this.find({ userId, status: 'active' });
  
  let totalBorrowed = 0;
  let totalOutstanding = 0;
  let totalInterest = 0;
  
  activeLoans.forEach(loan => {
    totalBorrowed += loan.principalAmount;
    totalOutstanding += loan.outstandingAmount;
    totalInterest += loan.currentInterest;
  });
  
  return {
    activeLoansCount: activeLoans.length,
    totalBorrowed,
    totalOutstanding,
    totalInterest,
    totalRepaid: activeLoans.reduce((sum, loan) => sum + loan.totalRepaid, 0)
  };
};

// Instance method: Add partial repayment
personalLoanSchema.methods.addRepayment = function(amount) {
  this.totalRepaid += amount;
  return this.save();
};

const PersonalLoan = mongoose.model('PersonalLoan', personalLoanSchema);

module.exports = PersonalLoan;
