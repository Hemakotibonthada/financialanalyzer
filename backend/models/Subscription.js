const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  serviceName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: [
      'streaming',
      'software',
      'gaming',
      'music',
      'news',
      'fitness',
      'education',
      'cloud_storage',
      'productivity',
      'communication',
      'security',
      'other'
    ]
  },
  provider: {
    name: String,
    website: String,
    contact: String
  },
  plan: {
    name: String,
    features: [String],
    limitations: [String]
  },
  pricing: {
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    billingCycle: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'lifetime'],
      default: 'monthly'
    }
  },
  dates: {
    startDate: { type: Date, required: true },
    renewalDate: Date,
    endDate: Date,
    trialEndDate: Date,
    cancelledDate: Date
  },
  status: {
    type: String,
    enum: ['trial', 'active', 'cancelled', 'expired', 'paused'],
    default: 'active'
  },
  paymentMethod: {
    type: String,
    last4: String
  },
  autoRenewal: {
    type: Boolean,
    default: true
  },
  usage: [{
    date: Date,
    metric: String,
    value: Number
  }],
  costs: {
    totalPaid: { type: Number, default: 0 },
    projectedAnnual: Number,
    averageMonthly: Number
  },
  linkedAccounts: [{
    email: String,
    username: String,
    isShared: Boolean
  }],
  alerts: [{
    type: {
      type: String,
      enum: ['renewal', 'price_change', 'trial_ending', 'unused']
    },
    date: Date,
    triggered: Boolean
  }],
  utilization: {
    score: Number, // 0-100
    lastUsed: Date,
    usageFrequency: String
  },
  alternatives: [{
    name: String,
    price: Number,
    features: [String]
  }],
  tags: [String],
  notes: String
}, {
  timestamps: true
});

subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ 'dates.renewalDate': 1 });

subscriptionSchema.methods.calculateProjectedCost = function() {
  const multipliers = {
    daily: 365,
    weekly: 52,
    monthly: 12,
    quarterly: 4,
    yearly: 1,
    lifetime: 0
  };
  
  this.costs.projectedAnnual = this.pricing.amount * (multipliers[this.pricing.billingCycle] || 12);
  this.costs.averageMonthly = this.costs.projectedAnnual / 12;
  
  return this.costs;
};

subscriptionSchema.methods.assessUtilization = function() {
  if (!this.utilization.lastUsed) {
    this.utilization.score = 0;
    this.utilization.usageFrequency = 'never';
    return;
  }
  
  const daysSinceLastUse = Math.floor((new Date() - this.utilization.lastUsed) / (24 * 60 * 60 * 1000));
  
  if (daysSinceLastUse <= 7) {
    this.utilization.score = 100;
    this.utilization.usageFrequency = 'daily';
  } else if (daysSinceLastUse <= 30) {
    this.utilization.score = 70;
    this.utilization.usageFrequency = 'weekly';
  } else if (daysSinceLastUse <= 90) {
    this.utilization.score = 40;
    this.utilization.usageFrequency = 'monthly';
  } else {
    this.utilization.score = 10;
    this.utilization.usageFrequency = 'rarely';
  }
};

subscriptionSchema.statics.getSubscriptionSummary = async function(userId) {
  const subs = await this.find({ userId, status: 'active' });
  
  subs.forEach(sub => sub.calculateProjectedCost());
  
  return {
    totalSubscriptions: subs.length,
    monthlyTotal: subs.reduce((sum, s) => sum + (s.costs.averageMonthly || 0), 0),
    annualTotal: subs.reduce((sum, s) => sum + (s.costs.projectedAnnual || 0), 0),
    byCategory: subs.reduce((acc, s) => {
      const cat = s.category || 'other';
      if (!acc[cat]) acc[cat] = { count: 0, monthly: 0 };
      acc[cat].count++;
      acc[cat].monthly += s.costs.averageMonthly || 0;
      return acc;
    }, {})
  };
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;
