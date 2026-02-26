const mongoose = require('mongoose');

/**
 * SplitExpense Model
 * Represents an expense split within a group
 */
const splitExpenseSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  paidBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    }
  },
  splitType: {
    type: String,
    enum: ['equal', 'percentage', 'exact'],
    default: 'equal',
    required: true
  },
  splits: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      trim: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100
    },
    paid: {
      type: Boolean,
      default: false
    }
  }],
  category: {
    type: String,
    enum: ['food', 'transport', 'accommodation', 'entertainment', 'shopping', 'utilities', 'medical', 'other'],
    default: 'other'
  },
  date: {
    type: Date,
    default: Date.now
  },
  receipt: {
    url: String,
    filename: String
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true
  },
  isSettled: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
splitExpenseSchema.index({ groupId: 1, date: -1 });
splitExpenseSchema.index({ 'paidBy.userId': 1 });
splitExpenseSchema.index({ 'splits.userId': 1 });
splitExpenseSchema.index({ groupId: 1, category: 1 });
splitExpenseSchema.index({ isSettled: 1 });

const SplitExpense = mongoose.model('SplitExpense', splitExpenseSchema);

module.exports = SplitExpense;
