const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  period: {
    type: String,
    enum: ['MONTHLY', 'WEEKLY', 'YEARLY'],
    default: 'MONTHLY'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  alertThreshold: {
    type: Number,
    min: 0,
    max: 100,
    default: 80 // Alert when 80% of budget is used
  },
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    }
  },
  spent: {
    type: Number,
    default: 0
  },
  lastCalculated: {
    type: Date
  },
  rollover: {
    enabled: {
      type: Boolean,
      default: false
    },
    amount: {
      type: Number,
      default: 0
    }
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Compound index for unique budget per user/category/period
budgetSchema.index({ userId: 1, category: 1, period: 1 }, { unique: true });
budgetSchema.index({ isActive: 1 });
budgetSchema.index({ startDate: -1 });

// Virtual for remaining budget
budgetSchema.virtual('remaining').get(function() {
  return Math.max(0, this.amount - this.spent);
});

// Virtual for percentage used
budgetSchema.virtual('percentageUsed').get(function() {
  return this.amount > 0 ? Math.round((this.spent / this.amount) * 100) : 0;
});

// Virtual for status
budgetSchema.virtual('status').get(function() {
  const percentage = this.percentageUsed;
  if (percentage >= 100) return 'EXCEEDED';
  if (percentage >= this.alertThreshold) return 'WARNING';
  if (percentage >= 50) return 'MODERATE';
  return 'GOOD';
});

// Virtual for is over budget
budgetSchema.virtual('isOverBudget').get(function() {
  return this.spent > this.amount;
});

// Enable virtuals in JSON
budgetSchema.set('toJSON', { virtuals: true });
budgetSchema.set('toObject', { virtuals: true });

// Instance method to calculate spent amount
budgetSchema.methods.calculateSpent = async function() {
  const Transaction = require('./Transaction');
  
  let startDate = this.startDate;
  let endDate = new Date();
  
  // Calculate date range based on period
  if (this.period === 'MONTHLY') {
    startDate = new Date();
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);
    endDate.setHours(23, 59, 59, 999);
  } else if (this.period === 'WEEKLY') {
    startDate = new Date();
    startDate.setDate(startDate.getDate() - startDate.getDay());
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else if (this.period === 'YEARLY') {
    startDate = new Date();
    startDate.setMonth(0, 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);
    endDate.setDate(0);
    endDate.setHours(23, 59, 59, 999);
  }
  
  // Get transactions for this category in the period
  const result = await Transaction.aggregate([
    {
      $match: {
        userId: this.userId,
        category: this.category,
        type: 'debit',
        date: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: null,
        totalSpent: { $sum: '$amount' }
      }
    }
  ]);
  
  this.spent = result.length > 0 ? result[0].totalSpent : 0;
  this.lastCalculated = new Date();
  
  return this.spent;
};

// Static method to get all budgets with spending for a user
budgetSchema.statics.getBudgetsWithSpending = async function(userId) {
  const budgets = await this.find({ userId, isActive: true });
  
  // Calculate spent for each budget
  for (const budget of budgets) {
    await budget.calculateSpent();
    await budget.save();
  }
  
  return budgets;
};

// Static method to check if any budget needs alert
budgetSchema.statics.checkAlerts = async function(userId) {
  const budgets = await this.getBudgetsWithSpending(userId);
  
  const alerts = [];
  for (const budget of budgets) {
    if (budget.percentageUsed >= budget.alertThreshold) {
      alerts.push({
        budgetId: budget._id,
        category: budget.category,
        amount: budget.amount,
        spent: budget.spent,
        remaining: budget.remaining,
        percentageUsed: budget.percentageUsed,
        status: budget.status,
        message: budget.isOverBudget 
          ? `Budget exceeded for ${budget.category}!` 
          : `${budget.percentageUsed}% of budget used for ${budget.category}`
      });
    }
  }
  
  return alerts;
};

const Budget = mongoose.model('Budget', budgetSchema);

module.exports = Budget;
