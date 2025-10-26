const mongoose = require('mongoose');

const lenderPaymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  lenderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lender',
    required: true,
    index: true
  },
  loanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LenderLoan',
    required: true,
    index: true
  },
  
  // Payment Details
  paymentNumber: {
    type: String,
    required: true
  },
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  principalAmount: {
    type: Number,
    default: 0
  },
  interestAmount: {
    type: Number,
    default: 0
  },
  penaltyAmount: {
    type: Number,
    default: 0
  },
  
  // Payment Method
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Card', 'Net Banking', 'Other'],
    default: 'Cash'
  },
  transactionId: String,
  chequeNumber: String,
  bankName: String,
  
  // Payment Status
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed', 'Cancelled'],
    default: 'Completed'
  },
  
  // Emi Info
  emiNumber: Number, // Which EMI this payment is for
  
  // Receipts and Documents
  receiptNumber: String,
  receiptUrl: String,
  documents: [{
    name: String,
    url: String,
    uploadDate: Date
  }],
  
  // Notes
  notes: String,
  internalNotes: String,
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
lenderPaymentSchema.index({ userId: 1, loanId: 1, paymentDate: -1 });
lenderPaymentSchema.index({ paymentNumber: 1 }, { unique: true });
lenderPaymentSchema.index({ paymentDate: -1 });
lenderPaymentSchema.index({ status: 1 });

// Generate unique payment number
lenderPaymentSchema.statics.generatePaymentNumber = async function() {
  const count = await this.countDocuments();
  const timestamp = Date.now().toString().slice(-6);
  return `PAY${timestamp}${(count + 1).toString().padStart(4, '0')}`;
};

// Update loan after payment
lenderPaymentSchema.methods.updateLoan = async function() {
  const LenderLoan = mongoose.model('LenderLoan');
  const loan = await LenderLoan.findById(this.loanId);
  
  if (!loan) {
    throw new Error('Loan not found');
  }
  
  // Update loan amounts
  loan.amountRepaid = (loan.amountRepaid || 0) + this.amount;
  loan.principalPaid = (loan.principalPaid || 0) + this.principalAmount;
  loan.interestPaid = (loan.interestPaid || 0) + this.interestAmount;
  loan.outstandingAmount = loan.totalPayable - loan.amountRepaid;
  loan.principalDue = loan.principalAmount - loan.principalPaid;
  loan.interestDue = loan.totalInterest - loan.interestPaid;
  
  // Update EMI count
  loan.totalEmisPaid = (loan.totalEmisPaid || 0) + 1;
  loan.totalEmisRemaining = loan.tenure - loan.totalEmisPaid;
  
  // Update last payment details
  loan.lastPaymentDate = this.paymentDate;
  loan.lastPaymentAmount = this.amount;
  
  // Calculate next EMI date
  if (loan.totalEmisRemaining > 0) {
    const nextDate = new Date(this.paymentDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    loan.nextEmiDate = nextDate;
    loan.nextEmiAmount = loan.emi;
  } else {
    loan.nextEmiDate = null;
    loan.nextEmiAmount = 0;
  }
  
  // Update status
  if (loan.outstandingAmount <= 0) {
    loan.status = 'Completed';
  } else {
    loan.status = 'Active';
  }
  
  // Update overdue status
  loan.updateOverdueStatus();
  
  await loan.save();
  
  // Update lender statistics
  const Lender = mongoose.model('Lender');
  const lender = await Lender.findById(this.lenderId);
  if (lender) {
    await lender.updateStatistics();
  }
  
  return loan;
};

// Pre-save hook
lenderPaymentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('LenderPayment', lenderPaymentSchema);
