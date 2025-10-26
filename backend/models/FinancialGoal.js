const mongoose = require('mongoose');

/**
 * Financial Goal Model
 * Track savings goals, retirement planning, major purchases, etc.
 */
const financialGoalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Goal Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'retirement',
      'emergency_fund',
      'home_purchase',
      'car_purchase',
      'education',
      'wedding',
      'vacation',
      'business',
      'debt_free',
      'wealth_creation',
      'other'
    ],
    required: true,
    index: true
  },
  icon: {
    type: String, // Emoji or icon name
    default: '🎯'
  },
  
  // Target Information
  targetAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  targetDate: {
    type: Date,
    required: true,
    index: true
  },
  
  // Progress
  progressPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  remainingAmount: {
    type: Number,
    default: 0
  },
  
  // Strategy
  savingsStrategy: {
    type: String,
    enum: ['lump_sum', 'monthly', 'weekly', 'variable'],
    default: 'monthly'
  },
  monthlySavingsTarget: {
    type: Number,
    min: 0
  },
  autoAllocate: {
    type: Boolean,
    default: false
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'completed', 'paused', 'cancelled'],
    default: 'active',
    index: true
  },
  
  // Milestones
  milestones: [{
    name: String,
    amount: Number,
    date: Date,
    achieved: {
      type: Boolean,
      default: false
    },
    achievedDate: Date
  }],
  
  // Contributions
  contributions: [{
    amount: Number,
    date: Date,
    source: String, // Manual, Auto-debit, Bonus, etc.
    notes: String
  }],
  totalContributed: {
    type: Number,
    default: 0
  },
  
  // Linked Items
  linkedInvestments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Investment'
  }],
  linkedAccounts: [{
    accountId: String,
    accountName: String,
    allocation: Number // Percentage
  }],
  
  // Risk and Return
  expectedReturn: {
    type: Number, // Annual return percentage
    default: 12
  },
  riskTolerance: {
    type: String,
    enum: ['conservative', 'moderate', 'aggressive'],
    default: 'moderate'
  },
  
  // Timeline
  startDate: {
    type: Date,
    default: Date.now
  },
  completedDate: {
    type: Date
  },
  daysRemaining: {
    type: Number
  },
  monthsRemaining: {
    type: Number
  },
  
  // Recommendations
  recommendedInvestments: [{
    type: String,
    name: String,
    allocation: Number,
    reason: String
  }],
  
  // Reminders
  reminders: {
    enabled: {
      type: Boolean,
      default: true
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'monthly'
    },
    lastReminded: Date
  },
  
  // Achievement
  isAchieved: {
    type: Boolean,
    default: false
  },
  achievementNotes: {
    type: String
  },
  
  // Metadata
  notes: {
    type: String
  },
  tags: [{
    type: String,
    trim: true
  }],
  color: {
    type: String, // HEX color for UI
    default: '#3B82F6'
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
financialGoalSchema.index({ userId: 1, status: 1 });
financialGoalSchema.index({ userId: 1, targetDate: 1 });
financialGoalSchema.index({ userId: 1, priority: 1 });

// Virtuals
financialGoalSchema.virtual('shortfall').get(function() {
  return Math.max(0, this.targetAmount - this.currentAmount);
});

financialGoalSchema.virtual('requiredMonthlySavings').get(function() {
  if (this.monthsRemaining <= 0) return 0;
  return this.shortfall / this.monthsRemaining;
});

financialGoalSchema.virtual('onTrack').get(function() {
  if (this.monthsRemaining <= 0) return this.progressPercentage >= 100;
  
  const elapsedMonths = this.getElapsedMonths();
  const totalMonths = elapsedMonths + this.monthsRemaining;
  const expectedProgress = (elapsedMonths / totalMonths) * 100;
  
  return this.progressPercentage >= expectedProgress - 10; // 10% tolerance
});

// Methods
financialGoalSchema.methods.updateProgress = function() {
  this.remainingAmount = Math.max(0, this.targetAmount - this.currentAmount);
  this.progressPercentage = Math.min(100, (this.currentAmount / this.targetAmount) * 100).toFixed(2);
  
  // Calculate time remaining
  const now = new Date();
  const timeDiff = this.targetDate - now;
  this.daysRemaining = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
  this.monthsRemaining = Math.max(0, Math.floor(this.daysRemaining / 30));
  
  // Check if achieved
  if (this.currentAmount >= this.targetAmount && this.status === 'active') {
    this.status = 'completed';
    this.isAchieved = true;
    this.completedDate = new Date();
  }
  
  return this.save();
};

financialGoalSchema.methods.addContribution = async function(amount, source = 'Manual', notes = '') {
  const contribution = {
    amount,
    date: new Date(),
    source,
    notes
  };
  
  this.contributions.push(contribution);
  this.currentAmount += amount;
  this.totalContributed += amount;
  
  await this.updateProgress();
  
  // Check milestones
  this.checkMilestones();
  
  return this.save();
};

financialGoalSchema.methods.addMilestone = function(name, amount, date) {
  const milestone = {
    name,
    amount,
    date,
    achieved: false
  };
  
  this.milestones.push(milestone);
  this.milestones.sort((a, b) => a.amount - b.amount);
  
  return this.save();
};

financialGoalSchema.methods.checkMilestones = function() {
  this.milestones.forEach(milestone => {
    if (!milestone.achieved && this.currentAmount >= milestone.amount) {
      milestone.achieved = true;
      milestone.achievedDate = new Date();
    }
  });
};

financialGoalSchema.methods.getElapsedMonths = function() {
  const now = new Date();
  const start = this.startDate;
  const diffTime = Math.abs(now - start);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
};

financialGoalSchema.methods.projectCompletion = function() {
  if (this.monthlySavingsTarget <= 0) {
    return null;
  }
  
  const monthsNeeded = Math.ceil(this.shortfall / this.monthlySavingsTarget);
  const projectedDate = new Date();
  projectedDate.setMonth(projectedDate.getMonth() + monthsNeeded);
  
  return {
    monthsNeeded,
    projectedDate,
    onTime: projectedDate <= this.targetDate
  };
};

// Static methods
financialGoalSchema.statics.getActiveGoals = async function(userId) {
  return await this.find({ userId, status: 'active' }).sort({ priority: -1, targetDate: 1 });
};

financialGoalSchema.statics.getUpcomingGoals = async function(userId, months = 12) {
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + months);
  
  return await this.find({
    userId,
    status: 'active',
    targetDate: { $lte: futureDate }
  }).sort({ targetDate: 1 });
};

financialGoalSchema.statics.getTotalSavingsTarget = async function(userId) {
  const goals = await this.find({ userId, status: 'active' });
  
  let totalTarget = 0;
  let totalCurrent = 0;
  let totalMonthly = 0;
  
  goals.forEach(goal => {
    totalTarget += goal.targetAmount;
    totalCurrent += goal.currentAmount;
    totalMonthly += goal.monthlySavingsTarget || 0;
  });
  
  return {
    totalTarget,
    totalCurrent,
    totalShortfall: totalTarget - totalCurrent,
    totalMonthlyRequired: totalMonthly,
    averageProgress: (totalCurrent / totalTarget * 100).toFixed(2)
  };
};

financialGoalSchema.statics.getGoalsByCategory = async function(userId) {
  const goals = await this.find({ userId, status: 'active' });
  
  const byCategory = {};
  
  goals.forEach(goal => {
    if (!byCategory[goal.category]) {
      byCategory[goal.category] = {
        count: 0,
        totalTarget: 0,
        totalCurrent: 0,
        goals: []
      };
    }
    
    byCategory[goal.category].count++;
    byCategory[goal.category].totalTarget += goal.targetAmount;
    byCategory[goal.category].totalCurrent += goal.currentAmount;
    byCategory[goal.category].goals.push(goal);
  });
  
  return byCategory;
};

// Pre-save middleware
financialGoalSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Auto-update progress
  this.remainingAmount = Math.max(0, this.targetAmount - this.currentAmount);
  this.progressPercentage = Math.min(100, (this.currentAmount / this.targetAmount) * 100).toFixed(2);
  
  // Calculate time remaining
  const now = new Date();
  const timeDiff = this.targetDate - now;
  this.daysRemaining = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
  this.monthsRemaining = Math.max(0, Math.floor(this.daysRemaining / 30));
  
  next();
});

const FinancialGoal = mongoose.model('FinancialGoal', financialGoalSchema);

module.exports = FinancialGoal;
