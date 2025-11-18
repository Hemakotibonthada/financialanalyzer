const mongoose = require('mongoose');

const anomalySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  anomalyType: {
    type: String,
    enum: [
      'unusual_spending',
      'unusual_income',
      'suspicious_transaction',
      'duplicate_transaction',
      'category_deviation',
      'merchant_deviation',
      'location_anomaly',
      'time_anomaly',
      'amount_anomaly',
      'frequency_anomaly',
      'pattern_break',
      'account_takeover',
      'data_breach'
    ],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  relatedTransactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }],
  detectionMethod: {
    type: String,
    enum: ['rule_based', 'statistical', 'ml_model', 'pattern_analysis', 'hybrid']
  },
  details: {
    expectedValue: mongoose.Schema.Types.Mixed,
    actualValue: mongoose.Schema.Types.Mixed,
    deviation: Number,
    threshold: Number,
    confidence: Number
  },
  context: {
    historicalAverage: Number,
    historicalStdDev: Number,
    recentPattern: String,
    comparisonPeriod: String,
    dataPoints: Number
  },
  isFraud: {
    type: Boolean,
    default: false
  },
  isFalsePositive: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['detected', 'investigating', 'resolved', 'ignored', 'confirmed'],
    default: 'detected'
  },
  resolution: {
    action: String,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date,
    notes: String
  },
  notifications: [{
    channel: String,
    sentAt: Date,
    status: String
  }],
  userFeedback: {
    isAccurate: Boolean,
    comment: String,
    reportedAt: Date
  },
  mlModelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MLModel'
  },
  rules: [{
    ruleName: String,
    ruleId: String,
    triggered: Boolean,
    weight: Number
  }],
  recommendations: [{
    title: String,
    description: String,
    action: String,
    priority: String
  }],
  metadata: {
    detectionTime: Number,
    features: mongoose.Schema.Types.Mixed,
    algorithm: String
  }
}, {
  timestamps: true
});

// Indexes
anomalySchema.index({ userId: 1, status: 1 });
anomalySchema.index({ userId: 1, anomalyType: 1, createdAt: -1 });
anomalySchema.index({ severity: 1, status: 1 });
anomalySchema.index({ score: -1 });
anomalySchema.index({ isFraud: 1 });

// Methods
anomalySchema.methods.markAsResolved = async function(action, notes, userId) {
  this.status = 'resolved';
  this.resolution = {
    action,
    resolvedBy: userId,
    resolvedAt: new Date(),
    notes
  };
  await this.save();
};

anomalySchema.methods.markAsFraud = async function() {
  this.isFraud = true;
  this.status = 'confirmed';
  await this.save();
};

anomalySchema.methods.markAsFalsePositive = async function() {
  this.isFalsePositive = true;
  this.status = 'ignored';
  await this.save();
};

// Static methods
anomalySchema.statics.getActiveAnomalies = async function(userId, severity = null) {
  const query = {
    userId,
    status: { $in: ['detected', 'investigating'] }
  };
  
  if (severity) {
    query.severity = severity;
  }
  
  return this.find(query).sort({ score: -1, createdAt: -1 });
};

anomalySchema.statics.getAnomalyStats = async function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          type: '$anomalyType',
          severity: '$severity'
        },
        count: { $sum: 1 },
        avgScore: { $avg: '$score' },
        fraudCount: {
          $sum: { $cond: ['$isFraud', 1, 0] }
        },
        falsePositiveCount: {
          $sum: { $cond: ['$isFalsePositive', 1, 0] }
        }
      }
    }
  ]);
};

anomalySchema.statics.getFraudRate = async function(userId) {
  const total = await this.countDocuments({ userId });
  const frauds = await this.countDocuments({ userId, isFraud: true });
  return total > 0 ? (frauds / total) * 100 : 0;
};

const Anomaly = mongoose.model('Anomaly', anomalySchema);

module.exports = Anomaly;
