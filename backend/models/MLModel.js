const mongoose = require('mongoose');

const mlModelSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  modelType: {
    type: String,
    enum: [
      'spending_prediction',
      'anomaly_detection',
      'fraud_detection',
      'budget_forecast',
      'investment_recommendation',
      'risk_assessment',
      'category_classifier',
      'merchant_classifier',
      'income_prediction',
      'savings_optimizer',
      'debt_repayment',
      'financial_health'
    ],
    required: true
  },
  version: {
    type: String,
    required: true
  },
  accuracy: {
    type: Number,
    min: 0,
    max: 1
  },
  trainingData: {
    dataPoints: Number,
    features: [String],
    dateRange: {
      start: Date,
      end: Date
    }
  },
  hyperparameters: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  metrics: {
    precision: Number,
    recall: Number,
    f1Score: Number,
    mse: Number,
    rmse: Number,
    mae: Number,
    r2Score: Number
  },
  modelData: {
    weights: mongoose.Schema.Types.Mixed,
    biases: mongoose.Schema.Types.Mixed,
    architecture: mongoose.Schema.Types.Mixed
  },
  trainingHistory: [{
    epoch: Number,
    loss: Number,
    accuracy: Number,
    valLoss: Number,
    valAccuracy: Number,
    timestamp: Date
  }],
  predictions: [{
    date: Date,
    input: mongoose.Schema.Types.Mixed,
    output: mongoose.Schema.Types.Mixed,
    confidence: Number
  }],
  status: {
    type: String,
    enum: ['training', 'trained', 'deployed', 'deprecated', 'failed'],
    default: 'training'
  },
  lastTrainedAt: Date,
  lastUsedAt: Date,
  usageCount: {
    type: Number,
    default: 0
  },
  featureImportance: {
    type: Map,
    of: Number
  },
  notes: String
}, {
  timestamps: true
});

// Indexes
mlModelSchema.index({ userId: 1, modelType: 1, status: 1 });
mlModelSchema.index({ lastUsedAt: -1 });
mlModelSchema.index({ accuracy: -1 });

// Methods
mlModelSchema.methods.recordPrediction = async function(input, output, confidence) {
  this.predictions.push({
    date: new Date(),
    input,
    output,
    confidence
  });
  
  // Keep only last 1000 predictions
  if (this.predictions.length > 1000) {
    this.predictions = this.predictions.slice(-1000);
  }
  
  this.lastUsedAt = new Date();
  this.usageCount++;
  
  await this.save();
};

mlModelSchema.methods.updateMetrics = async function(metrics) {
  this.metrics = { ...this.metrics, ...metrics };
  await this.save();
};

mlModelSchema.statics.getLatestModel = async function(userId, modelType) {
  return this.findOne({
    userId,
    modelType,
    status: 'deployed'
  }).sort({ version: -1 });
};

const MLModel = mongoose.model('MLModel', mlModelSchema);

module.exports = MLModel;
