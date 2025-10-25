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
    enum: ['bills', 'utilities', 'rent', 'subscription', 'insurance', 'loan', 'other'],
    default: 'bills'
  },
  dueDate: {
    type: Date,
    required: true
  },
  frequency: {
    type: String,
    enum: ['once', 'weekly', 'monthly', 'quarterly', 'yearly'],
    default: 'once'
  },
  reminderDays: {
    type: Number,
    default: 3, // Days before due date to remind
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'cancelled'],
    default: 'pending'
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
    default: false // Automatically create expense when marked as paid
  },
  lastNotificationSent: {
    type: Date
  },
  nextDueDate: {
    type: Date // For recurring bills
  }
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

const BillReminder = mongoose.model('BillReminder', billReminderSchema);

module.exports = BillReminder;
