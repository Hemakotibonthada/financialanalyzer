const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  predictionType: {
    type: String,
    enum: [
      'spending',
      'income',
      'savings',
      'category_spend',
      'merchant_spend',
      'anomaly',
      'fraud',
      'budget_excess',
      'bill_amount',
      'investment_return',
      'risk_score',
      'credit_score',
      'financial_health',
      'debt_payoff',
      'retirement_corpus'
    ],
    required: true
  },
  targetDate: {
    type: Date,
    required: true
  },
  predictedValue: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  range: {
    min: Number,
    max: Number,
    median: Number
  },
  actualValue: mongoose.Schema.Types.Mixed,
  accuracy: Number,
  factors: [{
    name: String,
    impact: Number,
    value: mongoose.Schema.Types.Mixed
  }],
  modelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MLModel'
  },
  metadata: {
    algorithm: String,
    features: [String],
    dataPoints: Number,
    timeframe: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  variance: Number,
  status: {
    type: String,
    enum: ['pending', 'verified', 'incorrect', 'partially_correct'],
    default: 'pending'
  },
  userFeedback: {
    rating: Number,
    comment: String,
    helpful: Boolean
  },
  recommendations: [{
    title: String,
    description: String,
    action: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    impact: Number
  }],
  expiresAt: Date
}, {
  timestamps: true
});

// Indexes
predictionSchema.index({ userId: 1, targetDate: 1 });
predictionSchema.index({ userId: 1, predictionType: 1, status: 1 });
predictionSchema.index({ targetDate: 1 });
predictionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
predictionSchema.index({ confidence: -1 });

// Methods
predictionSchema.methods.verify = async function(actualValue) {
  this.actualValue = actualValue;
  this.isVerified = true;
  this.verifiedAt = new Date();
  
  // Calculate accuracy
  if (typeof this.predictedValue === 'number' && typeof actualValue === 'number') {
    const error = Math.abs(this.predictedValue - actualValue);
    const percentError = (error / actualValue) * 100;
    this.accuracy = Math.max(0, 100 - percentError);
    this.variance = error;
    
    if (percentError < 5) {
      this.status = 'verified';
    } else if (percentError < 20) {
      this.status = 'partially_correct';
    } else {
      this.status = 'incorrect';
    }
  }
  
  await this.save();
  return this;
};

predictionSchema.methods.addRecommendation = async function(recommendation) {
  this.recommendations.push(recommendation);
  await this.save();
};

// Static methods
predictionSchema.statics.getPendingVerifications = async function(userId) {
  const now = new Date();
  return this.find({
    userId,
    targetDate: { $lte: now },
    isVerified: false
  });
};

predictionSchema.statics.getAccuracyStats = async function(userId, predictionType) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        predictionType,
        isVerified: true
      }
    },
    {
      $group: {
        _id: null,
        avgAccuracy: { $avg: '$accuracy' },
        avgConfidence: { $avg: '$confidence' },
        totalPredictions: { $sum: 1 },
        avgVariance: { $avg: '$variance' }
      }
    }
  ]);
};

const Prediction = mongoose.model('Prediction', predictionSchema);

module.exports = Prediction;
