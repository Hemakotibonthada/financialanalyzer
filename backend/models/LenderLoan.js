const mongoose = require('mongoose');

const lenderLoanSchema = new mongoose.Schema({
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
  
  // Borrower Information
  borrowerName: {
    type: String,
    required: true,
    trim: true
  },
  borrowerEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  borrowerPhone: {
    type: String,
    required: true,
    trim: true
  },
  borrowerAddress: String,
  borrowerPan: {
    type: String,
    trim: true,
    uppercase: true
  },
  borrowerAadhar: {
    type: String,
    trim: true
  },
  
  // Loan Details
  loanNumber: {
    type: String,
    required: true
  },
  principalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  interestRate: {
    type: Number,
    required: true,
    min: 0
  },
  interestType: {
    type: String,
    enum: ['Simple', 'Compound', 'Flat', 'Rupee_per_100'],
    default: 'Simple'
  },
  tenure: {
    type: Number,
    required: true,
    min: 1 // in months
  },
  emi: {
    type: Number,
    default: 0
  },
  
  // Dates
  disbursementDate: {
    type: Date,
    required: true
  },
  firstEmiDate: {
    type: Date,
    required: true
  },
  maturityDate: {
    type: Date,
    required: true
  },
  
  // Financial Status
  totalInterest: {
    type: Number,
    default: 0
  },
  totalPayable: {
    type: Number,
    default: 0
  },
  amountRepaid: {
    type: Number,
    default: 0
  },
  outstandingAmount: {
    type: Number,
    default: 0
  },
  interestPaid: {
    type: Number,
    default: 0
  },
  interestDue: {
    type: Number,
    default: 0
  },
  principalPaid: {
    type: Number,
    default: 0
  },
  principalDue: {
    type: Number,
    default: 0
  },
  
  // Payment Status
  totalEmisPaid: {
    type: Number,
    default: 0
  },
  totalEmisRemaining: {
    type: Number,
    default: 0
  },
  nextEmiDate: Date,
  nextEmiAmount: Number,
  lastPaymentDate: Date,
  lastPaymentAmount: Number,
  
  // Loan Purpose
  loanPurpose: {
    type: String,
    enum: ['Personal', 'Business', 'Education', 'Medical', 'Property', 'Vehicle', 'Agriculture', 'Emergency', 'Other'],
    default: 'Personal'
  },
  loanDescription: String,
  
  // Collateral/Security
  isSecured: {
    type: Boolean,
    default: false
  },
  collateralType: String,
  collateralValue: Number,
  collateralDescription: String,
  
  // Guarantor Details
  hasGuarantor: {
    type: Boolean,
    default: false
  },
  guarantorName: String,
  guarantorPhone: String,
  guarantorEmail: String,
  guarantorAddress: String,
  
  // Status
  status: {
    type: String,
    enum: ['Active', 'Completed', 'Defaulted', 'Foreclosed', 'Overdue'],
    default: 'Active'
  },
  
  // Overdue tracking
  isOverdue: {
    type: Boolean,
    default: false
  },
  overdueAmount: {
    type: Number,
    default: 0
  },
  overdueDays: {
    type: Number,
    default: 0
  },
  penaltyAmount: {
    type: Number,
    default: 0
  },
  
  // Late Payment Penalty
  latePenaltyRate: {
    type: Number,
    default: 2 // percentage
  },
  
  // Documents
  documents: [{
    type: String,
    url: String,
    uploadDate: Date
  }],
  
  // Payment History (will be populated from LenderPayment model)
  
  // Risk Assessment
  riskCategory: {
    type: String,
    enum: ['Low Risk', 'Medium Risk', 'High Risk', 'Default Risk'],
    default: 'Low Risk'
  },
  creditScore: Number,
  
  // Notes and Comments
  notes: String,
  internalNotes: String, // Private notes not visible to borrower
  tags: [String],
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
lenderLoanSchema.index({ userId: 1, lenderId: 1, status: 1 });
lenderLoanSchema.index({ loanNumber: 1 }, { unique: true });
lenderLoanSchema.index({ borrowerName: 1 });
lenderLoanSchema.index({ disbursementDate: -1 });
lenderLoanSchema.index({ nextEmiDate: 1 });

// Virtual for completion percentage
lenderLoanSchema.virtual('completionPercentage').get(function() {
  if (this.totalPayable === 0) return 0;
  return ((this.amountRepaid / this.totalPayable) * 100).toFixed(2);
});

// Virtual for months remaining
lenderLoanSchema.virtual('monthsRemaining').get(function() {
  if (this.status !== 'Active') return 0;
  return this.totalEmisRemaining;
});

// Generate unique loan number
lenderLoanSchema.statics.generateLoanNumber = async function() {
  const count = await this.countDocuments();
  const timestamp = Date.now().toString().slice(-6);
  return `LN${timestamp}${(count + 1).toString().padStart(4, '0')}`;
};

// Calculate EMI
lenderLoanSchema.methods.calculateEMI = function() {
  const principal = this.principalAmount;
  const ratePerMonth = this.interestRate / (12 * 100);
  const tenure = this.tenure;
  
  if (this.interestType === 'Rupee_per_100') {
    // Rupee per 100 per month: monthly interest = (P × rate) / 100
    const monthlyInterest = (principal * this.interestRate) / 100;
    this.totalInterest = monthlyInterest * tenure;
    this.totalPayable = principal + this.totalInterest;
    this.emi = Math.round((principal / tenure) + monthlyInterest); // principal portion + fixed monthly interest
  } else if (this.interestType === 'Flat') {
    const totalInterest = (principal * this.interestRate * (tenure / 12)) / 100;
    this.totalInterest = totalInterest;
    this.totalPayable = principal + totalInterest;
    this.emi = this.totalPayable / tenure;
  } else {
    // Reducing balance (Simple/Compound)
    const emi = (principal * ratePerMonth * Math.pow(1 + ratePerMonth, tenure)) / 
                (Math.pow(1 + ratePerMonth, tenure) - 1);
    this.emi = Math.round(emi);
    this.totalPayable = this.emi * tenure;
    this.totalInterest = this.totalPayable - principal;
  }
  
  this.outstandingAmount = this.totalPayable - this.amountRepaid;
  this.principalDue = principal - this.principalPaid;
  this.interestDue = this.totalInterest - this.interestPaid;
  this.totalEmisRemaining = tenure - this.totalEmisPaid;
  this.nextEmiAmount = this.emi;
  
  return this.emi;
};

// Update overdue status
lenderLoanSchema.methods.updateOverdueStatus = function() {
  if (this.status !== 'Active' || !this.nextEmiDate) {
    this.isOverdue = false;
    this.overdueDays = 0;
    return;
  }
  
  const today = new Date();
  const nextEmi = new Date(this.nextEmiDate);
  
  if (today > nextEmi) {
    this.isOverdue = true;
    const diffTime = Math.abs(today - nextEmi);
    this.overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Calculate penalty
    this.penaltyAmount = (this.overdueAmount * this.latePenaltyRate * this.overdueDays) / (100 * 30);
    
    // Update risk category
    if (this.overdueDays > 90) {
      this.riskCategory = 'Default Risk';
    } else if (this.overdueDays > 60) {
      this.riskCategory = 'High Risk';
    } else if (this.overdueDays > 30) {
      this.riskCategory = 'Medium Risk';
    }
  } else {
    this.isOverdue = false;
    this.overdueDays = 0;
    this.penaltyAmount = 0;
  }
};

// Pre-save hook
lenderLoanSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate outstanding if not set
  if (this.totalPayable && this.amountRepaid !== undefined) {
    this.outstandingAmount = this.totalPayable - this.amountRepaid;
  }
  
  next();
});

module.exports = mongoose.model('LenderLoan', lenderLoanSchema);
