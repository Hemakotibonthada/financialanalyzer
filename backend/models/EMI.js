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
    // Removed enum to support custom provider names (e.g., friends, family, local banks)
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
  currency: {
    type: String,
    default: 'INR',
    enum: ['USD', 'INR']
  },
  principalAmountInINR: {
    type: Number,
    required: true,
    min: 0,
    index: true
  },
  interestRate: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  interestType: {
    type: String,
    enum: ['percentage', 'flat'],
    default: 'percentage'
  },
  processingFee: {
    type: Number,
    default: 0,
    min: 0
  },
  processingFeeInINR: {
    type: Number,
    default: 0,
    min: 0
  },
  emiAmount: {
    type: Number,
    required: true,
    min: 0
  },
  emiAmountInINR: {
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
  
  // Repayment Type
  repaymentType: {
    type: String,
    enum: ['MONTHLY', 'ON_REQUEST'],
    default: 'MONTHLY',
    index: true
  },
  
  // Date Information
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    required: false // Not required for ON_REQUEST type
  },
  nextDueDate: {
    type: Date,
    required: false, // Not required for ON_REQUEST type
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
      required: false // Not required for ON_REQUEST type
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
  
  // ─── Bank Deduction Details ─────────────────────────────────────
  deductionBankAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
    index: true
  },
  deductionBankName: {
    type: String,
    trim: true
  },
  deductionAccountNumber: {
    type: String,   // masked, e.g. XXXX1234
    trim: true
  },
  deductionDay: {
    type: Number,    // day-of-month the EMI auto-debits (1–31)
    min: 1,
    max: 31
  },
  autoDebitEnabled: {
    type: Boolean,
    default: false
  },
  minimumBalanceRequired: {
    type: Number,    // user-specified or bank-specified min balance to keep
    default: 0,
    min: 0
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
  // startDate = first EMI paid date
  // Next due = startDate + paidInstallments months (0-indexed: 0=first payment at startDate)
  const nextDate = new Date(this.startDate);
  nextDate.setMonth(nextDate.getMonth() + this.paidInstallments);
  
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
  currentDate.setHours(0, 0, 0, 0);
  
  const nextDue = new Date(this.nextDueDate);
  nextDue.setHours(0, 0, 0, 0);
  
  // Calculate starting point
  let monthsToAdd = 0;
  let installmentNumber = this.paidInstallments + 1;
  
  // If next due date is in the past, calculate how many months behind
  if (nextDue < currentDate) {
    monthsToAdd = Math.floor(
      (currentDate.getFullYear() - nextDue.getFullYear()) * 12 +
      (currentDate.getMonth() - nextDue.getMonth())
    );
    installmentNumber += monthsToAdd;
  }
  
  // Store the original day of month for the payment
  const originalDay = nextDue.getDate();
  
  // Generate upcoming payments
  for (let i = 0; i < Math.min(months, this.remainingInstallments); i++) {
    // Calculate the target month and year
    const totalMonthsFromStart = monthsToAdd + i;
    const targetYear = nextDue.getFullYear() + Math.floor((nextDue.getMonth() + totalMonthsFromStart) / 12);
    const targetMonth = (nextDue.getMonth() + totalMonthsFromStart) % 12;
    
    // Create date for the first day of target month
    const paymentDate = new Date(targetYear, targetMonth, 1);
    
    // Get the last day of the target month
    const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    
    // Set the day to the original day, or last day of month if original day doesn't exist
    paymentDate.setDate(Math.min(originalDay, lastDayOfMonth));
    
    // Check if this payment falls within the requested period from current date
    const monthsDiff = Math.floor(
      (paymentDate.getFullYear() - currentDate.getFullYear()) * 12 +
      (paymentDate.getMonth() - currentDate.getMonth())
    );
    
    if (monthsDiff >= 0 && monthsDiff < months) {
      upcoming.push({
        installmentNumber: installmentNumber + i,
        dueDate: paymentDate,
        amount: this.emiAmount,
        status: paymentDate < currentDate ? 'overdue' : 'upcoming'
      });
    }
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
