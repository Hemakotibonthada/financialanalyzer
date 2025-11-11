const mongoose = require('mongoose');

const billReminderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    enum: ['electricity', 'water', 'gas', 'internet', 'mobile', 'milk', 'rent', 'subscription', 'insurance', 'loan', 'other'],
    default: 'other'
  },
  dueDate: {
    type: Date,
    required: true
  },
  frequency: {
    type: String,
    enum: ['once', 'weekly', 'monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  reminderDays: {
    type: Number,
    default: 3, // Days before due date to remind
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'awaiting_approval', 'approved', 'paid', 'overdue', 'cancelled', 'rejected'],
    default: 'pending'
  },
  // Auto-payment feature
  autoPayEnabled: {
    type: Boolean,
    default: false
  },
  requiresApproval: {
    type: Boolean,
    default: true // User must approve before auto-payment
  },
  approvalStatus: {
    type: String,
    enum: ['not_required', 'pending', 'approved', 'rejected'],
    default: 'not_required'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  approvalNote: {
    type: String
  },
  // Payment provider details
  paymentMethod: {
    type: String,
    enum: ['card', 'upi', 'bank_transfer', 'cash', 'cheque', 'manual'],
    default: 'manual'
  },
  paymentAccountId: {
    type: String // Reference to linked payment account
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paidDate: {
    type: Date
  },
  paidAmount: {
    type: Number
  },
  notes: {
    type: String
  },
  autoCreateExpense: {
    type: Boolean,
    default: true // Automatically create expense when marked as paid
  },
  lastNotificationSent: {
    type: Date
  },
  nextDueDate: {
    type: Date // For recurring bills
  },
  // Payment history
  paymentHistory: [{
    amount: Number,
    paidDate: Date,
    paymentMethod: String,
    transactionId: String,
    notes: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Vendor details
  vendor: {
    name: String,
    accountNumber: String,
    phone: String,
    email: String,
    address: String
  },
  // Reminder settings
  reminderSettings: {
    emailReminder: {
      type: Boolean,
      default: true
    },
    pushNotification: {
      type: Boolean,
      default: true
    },
    smsReminder: {
      type: Boolean,
      default: false
    }
  },
  // Tags for organization
  tags: [String],
  // Attachment support
  attachments: [{
    filename: String,
    path: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for efficient queries
billReminderSchema.index({ userId: 1, dueDate: 1 });
billReminderSchema.index({ userId: 1, status: 1 });

// Update status based on due date
billReminderSchema.pre('save', function(next) {
  if (this.isPaid) {
    this.status = 'paid';
  } else if (this.status !== 'cancelled') {
    const now = new Date();
    if (now > this.dueDate) {
      this.status = 'overdue';
    } else {
      this.status = 'pending';
    }
  }
  next();
});

// Calculate next due date for recurring bills
billReminderSchema.methods.calculateNextDueDate = function() {
  if (this.frequency === 'once') {
    return null;
  }

  const currentDue = new Date(this.dueDate);
  let nextDue = new Date(currentDue);

  switch (this.frequency) {
    case 'weekly':
      nextDue.setDate(currentDue.getDate() + 7);
      break;
    case 'monthly':
      nextDue.setMonth(currentDue.getMonth() + 1);
      break;
    case 'quarterly':
      nextDue.setMonth(currentDue.getMonth() + 3);
      break;
    case 'yearly':
      nextDue.setFullYear(currentDue.getFullYear() + 1);
      break;
  }

  return nextDue;
};

// Method to request approval for auto-payment
billReminderSchema.methods.requestApproval = async function(userId) {
  if (!this.autoPayEnabled) {
    throw new Error('Auto-payment is not enabled for this bill');
  }
  
  this.approvalStatus = 'pending';
  this.status = 'awaiting_approval';
  await this.save();
  
  return this;
};

// Method to approve payment
billReminderSchema.methods.approvePayment = async function(userId, note) {
  if (this.approvalStatus !== 'pending') {
    throw new Error('This bill is not awaiting approval');
  }
  
  this.approvalStatus = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  this.approvalNote = note;
  this.status = 'approved';
  await this.save();
  
  return this;
};

// Method to reject payment
billReminderSchema.methods.rejectPayment = async function(userId, note) {
  if (this.approvalStatus !== 'pending') {
    throw new Error('This bill is not awaiting approval');
  }
  
  this.approvalStatus = 'rejected';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  this.approvalNote = note;
  this.status = 'rejected';
  await this.save();
  
  return this;
};

// Method to mark bill as paid
billReminderSchema.methods.markAsPaid = async function(paymentDetails) {
  this.isPaid = true;
  this.status = 'paid';
  this.paidDate = paymentDetails.paidDate || new Date();
  this.paidAmount = paymentDetails.amount || this.amount;
  
  // Add to payment history
  this.paymentHistory.push({
    amount: paymentDetails.amount || this.amount,
    paidDate: this.paidDate,
    paymentMethod: paymentDetails.paymentMethod || this.paymentMethod,
    transactionId: paymentDetails.transactionId,
    notes: paymentDetails.notes
  });
  
  await this.save();
  
  return this;
};

// Static method to get bills due soon
billReminderSchema.statics.getBillsDueSoon = async function(userId, days = 7) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  
  return this.find({
    userId,
    dueDate: { $gte: startDate, $lte: endDate },
    status: { $in: ['pending', 'awaiting_approval'] }
  }).sort({ dueDate: 1 });
};

// Static method to get overdue bills
billReminderSchema.statics.getOverdueBills = async function(userId) {
  const now = new Date();
  
  return this.find({
    userId,
    dueDate: { $lt: now },
    status: { $in: ['pending', 'overdue', 'awaiting_approval'] }
  }).sort({ dueDate: 1 });
};

const BillReminder = mongoose.model('BillReminder', billReminderSchema);

module.exports = BillReminder;
