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
  remainingAmount: {
    type: Number,
    default: 0
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
  if (this.amount === 0) return 0;
  return ((this.totalRepaid / this.amount) * 100).toFixed(2);
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
  
  // Calculate remaining amount
  this.remainingAmount = this.amount - this.totalRepaid;
  
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
  
  const totalLent = loans.reduce((sum, loan) => sum + loan.amount, 0);
  const totalRepaid = loans.reduce((sum, loan) => sum + loan.totalRepaid, 0);
  const totalOutstanding = loans.reduce((sum, loan) => sum + loan.remainingAmount, 0);
  
  const activeLoans = loans.filter(l => l.status !== 'fully_paid' && l.status !== 'written_off');
  const overdueLoans = loans.filter(l => l.status === 'overdue');
  const fullyPaidLoans = loans.filter(l => l.status === 'fully_paid');
  
  return {
    totalLent,
    totalRepaid,
    totalOutstanding,
    activeLoansCount: activeLoans.length,
    overdueLoansCount: overdueLoans.length,
    fullyPaidCount: fullyPaidLoans.length,
    totalLoans: loans.length
  };
};

const LoanGiven = mongoose.model('LoanGiven', loanGivenSchema);

module.exports = LoanGiven;
