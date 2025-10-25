/**
 * EMI (Equated Monthly Installment) Model
 * Stores credit card EMI details extracted from statements
 */

const mongoose = require('mongoose');

const emiSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Credit Card Information
  cardProvider: {
    type: String,
    required: true,
    enum: ['ICICI', 'HDFC', 'SBI', 'AXIS', 'KOTAK', 'CITI', 'AMEX', 'STANDARD CHARTERED', 'INDUSIND', 'YES BANK', 'OTHER'],
    index: true
  },
  cardLastFourDigits: {
    type: String,
    required: true,
    match: /^\d{4}$/
  },
  cardHolderName: {
    type: String,
    required: true
  },
  
  // EMI Details
  merchantName: {
    type: String,
    required: true
  },
  productDescription: {
    type: String,
    default: 'Credit Card Purchase'
  },
  
  // Financial Details
  principalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  interestRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0
  },
  processingFee: {
    type: Number,
    default: 0,
    min: 0
  },
  emiAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Tenure Information
  totalTenure: {
    type: Number,
    required: true,
    min: 1
  },
  paidInstallments: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  remainingInstallments: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Date Information
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    required: true
  },
  nextDueDate: {
    type: Date,
    required: true,
    index: true
  },
  
  // Payment Tracking
  paymentHistory: [{
    installmentNumber: {
      type: Number,
      required: true
    },
    dueDate: {
      type: Date,
      required: true
    },
    paidDate: {
      type: Date
    },
    amount: {
      type: Number,
      required: true
    },
    principalPaid: {
      type: Number,
      required: true
    },
    interestPaid: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['paid', 'pending', 'overdue', 'upcoming'],
      default: 'upcoming'
    }
  }],
  
  // Statement Reference
  statementId: {
    type: String,
    index: true
  },
  statementDate: {
    type: Date
  },
  statementPeriod: {
    type: String
  },
  
  // Document Reference
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'completed', 'foreclosed', 'cancelled'],
    default: 'active',
    index: true
  },
  
  // Additional Information
  transactionDate: {
    type: Date
  },
  transactionReference: {
    type: String
  },
  
  // Foreclosure Information
  foreclosureAmount: {
    type: Number,
    default: 0
  },
  canForeclosure: {
    type: Boolean,
    default: true
  },
  
  // Metadata
  notes: {
    type: String
  },
  tags: [{
    type: String
  }],
  
  // Auto-extraction metadata
  extractionConfidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  extractionMethod: {
    type: String,
    enum: ['auto', 'manual', 'ai'],
    default: 'auto'
  },
  
  // Audit
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastSyncedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for performance
emiSchema.index({ userId: 1, status: 1 });
emiSchema.index({ userId: 1, nextDueDate: 1 });
emiSchema.index({ userId: 1, cardProvider: 1 });
emiSchema.index({ status: 1, nextDueDate: 1 });

// Virtual for remaining amount
emiSchema.virtual('remainingAmount').get(function() {
  return this.emiAmount * this.remainingInstallments;
});

// Virtual for total amount paid
emiSchema.virtual('totalPaid').get(function() {
  return this.emiAmount * this.paidInstallments;
});

// Virtual for total interest paid
emiSchema.virtual('totalInterestPaid').get(function() {
  return this.paymentHistory
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.interestPaid, 0);
});

// Virtual for total principal paid
emiSchema.virtual('totalPrincipalPaid').get(function() {
  return this.paymentHistory
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.principalPaid, 0);
});

// Virtual for completion percentage
emiSchema.virtual('completionPercentage').get(function() {
  return Math.round((this.paidInstallments / this.totalTenure) * 100);
});

// Instance method to update next due date
emiSchema.methods.updateNextDueDate = function() {
  const currentDate = new Date();
  const monthsToAdd = this.paidInstallments + 1;
  const nextDate = new Date(this.startDate);
  nextDate.setMonth(nextDate.getMonth() + monthsToAdd);
  
  this.nextDueDate = nextDate;
  
  // Update remaining installments
  this.remainingInstallments = this.totalTenure - this.paidInstallments;
  
  // Update status if completed
  if (this.remainingInstallments === 0) {
    this.status = 'completed';
  }
  
  return this.nextDueDate;
};

// Instance method to add payment
emiSchema.methods.addPayment = function(paymentData) {
  this.paymentHistory.push(paymentData);
  this.paidInstallments++;
  this.updateNextDueDate();
  this.lastSyncedAt = new Date();
  return this.save();
};

// Instance method to calculate upcoming payments
emiSchema.methods.getUpcomingPayments = function(months = 12) {
  const upcoming = [];
  const currentDate = new Date();
  
  for (let i = 0; i < Math.min(months, this.remainingInstallments); i++) {
    const dueDate = new Date(this.nextDueDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    
    upcoming.push({
      installmentNumber: this.paidInstallments + i + 1,
      dueDate: dueDate,
      amount: this.emiAmount,
      status: dueDate < currentDate ? 'overdue' : 'upcoming'
    });
  }
  
  return upcoming;
};

// Static method to get user's active EMIs
emiSchema.statics.getActiveEMIs = function(userId) {
  return this.find({
    userId,
    status: 'active',
    remainingInstallments: { $gt: 0 }
  }).sort({ nextDueDate: 1 });
};

// Static method to get EMIs by card
emiSchema.statics.getEMIsByCard = function(userId, cardProvider) {
  return this.find({
    userId,
    cardProvider,
    status: 'active'
  }).sort({ nextDueDate: 1 });
};

// Static method to get upcoming EMIs for a period
emiSchema.statics.getUpcomingEMIs = function(userId, startDate, endDate) {
  return this.find({
    userId,
    status: 'active',
    nextDueDate: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ nextDueDate: 1 });
};

// Static method to calculate monthly EMI burden
emiSchema.statics.calculateMonthlyBurden = async function(userId, month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  const emis = await this.find({
    userId,
    status: 'active',
    nextDueDate: {
      $gte: startDate,
      $lte: endDate
    }
  });
  
  const totalAmount = emis.reduce((sum, emi) => sum + emi.emiAmount, 0);
  const emiCount = emis.length;
  
  return {
    month,
    year,
    totalAmount,
    emiCount,
    emis: emis.map(e => ({
      id: e._id,
      merchantName: e.merchantName,
      cardProvider: e.cardProvider,
      amount: e.emiAmount,
      dueDate: e.nextDueDate
    }))
  };
};

// Pre-save middleware to update timestamps
emiSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Enable virtuals in JSON
emiSchema.set('toJSON', { virtuals: true });
emiSchema.set('toObject', { virtuals: true });

const EMI = mongoose.model('EMI', emiSchema);

module.exports = EMI;
