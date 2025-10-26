const mongoose = require('mongoose');

const lenderSchema = new mongoose.Schema({
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
  lenderType: {
    type: String,
    enum: ['Individual', 'Financial Institution', 'NBFC', 'Bank', 'Private Lender', 'Other'],
    default: 'Individual'
  },
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  contactPhone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  },
  registrationNumber: {
    type: String,
    trim: true
  },
  panNumber: {
    type: String,
    trim: true,
    uppercase: true
  },
  gstNumber: {
    type: String,
    trim: true,
    uppercase: true
  },
  
  // Financial Details
  totalAmountLent: {
    type: Number,
    default: 0
  },
  totalOutstanding: {
    type: Number,
    default: 0
  },
  totalInterestEarned: {
    type: Number,
    default: 0
  },
  totalInterestPending: {
    type: Number,
    default: 0
  },
  totalRepaid: {
    type: Number,
    default: 0
  },
  
  // Loan Statistics
  activeLoanCount: {
    type: Number,
    default: 0
  },
  completedLoanCount: {
    type: Number,
    default: 0
  },
  defaultedLoanCount: {
    type: Number,
    default: 0
  },
  
  // Default Interest Rates
  defaultInterestRate: {
    type: Number,
    default: 0
  },
  defaultInterestType: {
    type: String,
    enum: ['Simple', 'Compound', 'Flat'],
    default: 'Simple'
  },
  
  // Risk Assessment
  riskRating: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Very High'],
    default: 'Medium'
  },
  defaultRate: {
    type: Number,
    default: 0 // Percentage of defaulted loans
  },
  
  // Status
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Suspended'],
    default: 'Active'
  },
  
  // Additional Information
  notes: String,
  tags: [String],
  
  // Bank Account Details (for payments)
  bankDetails: {
    accountNumber: String,
    accountHolderName: String,
    ifscCode: String,
    bankName: String,
    branch: String
  },
  
  // Rating and Reviews
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  
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

// Indexes for better query performance
lenderSchema.index({ userId: 1, status: 1 });
lenderSchema.index({ lenderName: 1 });
lenderSchema.index({ lenderType: 1 });
lenderSchema.index({ createdAt: -1 });

// Virtual for collection rate
lenderSchema.virtual('collectionRate').get(function() {
  if (this.totalAmountLent === 0) return 0;
  return ((this.totalRepaid / this.totalAmountLent) * 100).toFixed(2);
});

// Virtual for average loan size
lenderSchema.virtual('averageLoanSize').get(function() {
  const totalLoans = this.activeLoanCount + this.completedLoanCount + this.defaultedLoanCount;
  if (totalLoans === 0) return 0;
  return (this.totalAmountLent / totalLoans).toFixed(2);
});

// Virtual for ROI (Return on Investment)
lenderSchema.virtual('roi').get(function() {
  if (this.totalAmountLent === 0) return 0;
  return ((this.totalInterestEarned / this.totalAmountLent) * 100).toFixed(2);
});

// Update timestamp before save
lenderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to calculate risk rating based on default rate
lenderSchema.methods.calculateRiskRating = function() {
  if (this.defaultRate < 5) {
    this.riskRating = 'Low';
  } else if (this.defaultRate < 15) {
    this.riskRating = 'Medium';
  } else if (this.defaultRate < 30) {
    this.riskRating = 'High';
  } else {
    this.riskRating = 'Very High';
  }
  return this.riskRating;
};

// Method to update statistics
lenderSchema.methods.updateStatistics = async function() {
  const Loan = mongoose.model('LenderLoan');
  
  const loans = await Loan.find({ 
    userId: this.userId,
    lenderId: this._id 
  });
  
  this.activeLoanCount = loans.filter(l => l.status === 'Active').length;
  this.completedLoanCount = loans.filter(l => l.status === 'Completed').length;
  this.defaultedLoanCount = loans.filter(l => l.status === 'Defaulted').length;
  
  this.totalAmountLent = loans.reduce((sum, l) => sum + (l.principalAmount || 0), 0);
  this.totalOutstanding = loans
    .filter(l => l.status === 'Active')
    .reduce((sum, l) => sum + (l.outstandingAmount || 0), 0);
  this.totalInterestEarned = loans.reduce((sum, l) => sum + (l.interestPaid || 0), 0);
  this.totalInterestPending = loans
    .filter(l => l.status === 'Active')
    .reduce((sum, l) => sum + (l.interestDue || 0), 0);
  this.totalRepaid = loans.reduce((sum, l) => sum + (l.amountRepaid || 0), 0);
  
  // Calculate default rate
  const totalLoans = this.activeLoanCount + this.completedLoanCount + this.defaultedLoanCount;
  this.defaultRate = totalLoans > 0 ? ((this.defaultedLoanCount / totalLoans) * 100).toFixed(2) : 0;
  
  // Update risk rating
  this.calculateRiskRating();
  
  await this.save();
};

module.exports = mongoose.model('Lender', lenderSchema);
