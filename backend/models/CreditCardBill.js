/**
 * Credit Card Bill Model
 * Tracks monthly credit card bill amounts — from Gmail or manual entry.
 * Links to EMI Tracker for holistic debt tracking.
 */

const mongoose = require('mongoose');

const spendingCategorySchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: [
      'shopping', 'groceries', 'dining', 'fuel', 'travel', 'entertainment',
      'utilities', 'insurance', 'medical', 'education', 'subscriptions',
      'emi', 'cash_advance', 'fees_charges', 'other'
    ]
  },
  amount: { type: Number, required: true, min: 0 },
  transactionCount: { type: Number, default: 1, min: 0 }
}, { _id: false });

const creditCardBillSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // -------- Card Identification --------
  cardProvider: {
    type: String,
    required: true,
    index: true
  },
  cardLastFourDigits: {
    type: String,
    required: true,
    match: /^\d{4}$/
  },
  cardHolderName: {
    type: String,
    default: ''
  },
  cardNetwork: {
    type: String,
    enum: ['visa', 'mastercard', 'rupay', 'amex', 'diners', 'other', ''],
    default: ''
  },

  // -------- Bill Period --------
  statementDate: {
    type: Date,
    required: true
  },
  billingPeriodStart: {
    type: Date
  },
  billingPeriodEnd: {
    type: Date
  },
  dueDate: {
    type: Date,
    required: true
  },

  // -------- Amounts --------
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  minimumDue: {
    type: Number,
    default: 0,
    min: 0
  },
  previousBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  paymentsReceived: {
    type: Number,
    default: 0,
    min: 0
  },
  newCharges: {
    type: Number,
    default: 0,
    min: 0
  },
  interestCharged: {
    type: Number,
    default: 0,
    min: 0
  },
  cashAdvance: {
    type: Number,
    default: 0,
    min: 0
  },
  feesAndCharges: {
    type: Number,
    default: 0,
    min: 0
  },
  rewardsEarned: {
    type: Number,
    default: 0
  },
  creditLimit: {
    type: Number,
    default: 0,
    min: 0
  },
  availableCredit: {
    type: Number,
    default: 0,
    min: 0
  },

  // -------- Spending Breakdown --------
  spendingByCategory: [spendingCategorySchema],

  // -------- Payment Tracking --------
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'minimum_paid', 'partial_paid', 'full_paid', 'overdue'],
    default: 'unpaid'
  },
  amountPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  paymentDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'upi', 'auto_debit', 'cash', 'other', ''],
    default: ''
  },

  // -------- Source --------
  source: {
    type: String,
    enum: ['manual', 'gmail', 'statement_pdf'],
    default: 'manual'
  },
  gmailMessageId: {
    type: String
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  },
  extractionConfidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 1
  },

  // -------- Notes --------
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// -------- Indexes --------
creditCardBillSchema.index({ userId: 1, statementDate: -1 });
creditCardBillSchema.index({ userId: 1, cardProvider: 1, cardLastFourDigits: 1, statementDate: -1 });
creditCardBillSchema.index({ userId: 1, paymentStatus: 1 });
creditCardBillSchema.index({ userId: 1, dueDate: 1 });

// Prevent duplicate bills for same card + statement period
creditCardBillSchema.index(
  { userId: 1, cardProvider: 1, cardLastFourDigits: 1, statementDate: 1 },
  { unique: true }
);

// -------- Virtuals --------
creditCardBillSchema.virtual('remainingAmount').get(function () {
  return Math.max(0, this.totalAmount - this.amountPaid);
});

creditCardBillSchema.virtual('utilizationPercentage').get(function () {
  if (!this.creditLimit || this.creditLimit === 0) return 0;
  return Math.round((this.totalAmount / this.creditLimit) * 100);
});

creditCardBillSchema.virtual('isOverdue').get(function () {
  return this.paymentStatus !== 'full_paid' && new Date() > this.dueDate;
});

creditCardBillSchema.virtual('daysUntilDue').get(function () {
  const now = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// -------- Static Methods --------
creditCardBillSchema.statics.getUnpaidBills = function (userId) {
  return this.find({
    userId,
    paymentStatus: { $in: ['unpaid', 'minimum_paid', 'partial_paid', 'overdue'] }
  }).sort({ dueDate: 1 });
};

creditCardBillSchema.statics.getBillsByCard = function (userId, cardProvider, cardLastFourDigits) {
  return this.find({
    userId,
    cardProvider,
    cardLastFourDigits
  }).sort({ statementDate: -1 });
};

creditCardBillSchema.statics.getMonthlySpending = async function (userId, months = 6) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), statementDate: { $gte: startDate } } },
    {
      $group: {
        _id: {
          year: { $year: '$statementDate' },
          month: { $month: '$statementDate' }
        },
        totalBilled: { $sum: '$totalAmount' },
        totalPaid: { $sum: '$amountPaid' },
        totalMinimumDue: { $sum: '$minimumDue' },
        totalInterest: { $sum: '$interestCharged' },
        billCount: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);
};

creditCardBillSchema.statics.getSpendingAnalytics = async function (userId, months = 6) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), statementDate: { $gte: startDate } } },
    { $unwind: '$spendingByCategory' },
    {
      $group: {
        _id: '$spendingByCategory.category',
        totalAmount: { $sum: '$spendingByCategory.amount' },
        totalTransactions: { $sum: '$spendingByCategory.transactionCount' },
        avgPerMonth: { $avg: '$spendingByCategory.amount' }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);
};

// Auto-update paymentStatus before save
creditCardBillSchema.pre('save', function (next) {
  if (this.amountPaid >= this.totalAmount && this.totalAmount > 0) {
    this.paymentStatus = 'full_paid';
  } else if (this.amountPaid >= this.minimumDue && this.minimumDue > 0) {
    if (this.amountPaid > this.minimumDue) {
      this.paymentStatus = 'partial_paid';
    } else {
      this.paymentStatus = 'minimum_paid';
    }
  } else if (this.amountPaid > 0) {
    this.paymentStatus = 'partial_paid';
  } else if (new Date() > this.dueDate) {
    this.paymentStatus = 'overdue';
  }
  next();
});

module.exports = mongoose.model('CreditCardBill', creditCardBillSchema);
