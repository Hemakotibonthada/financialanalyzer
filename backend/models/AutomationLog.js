const mongoose = require('mongoose');

const automationLogSchema = new mongoose.Schema({
  ruleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AutomationRule',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null
  },
  triggered: {
    type: Boolean,
    default: false
  },
  triggerType: {
    type: String
  },
  actionResults: [{
    type: { type: String },
    success: { type: Boolean },
    details: { type: mongoose.Schema.Types.Mixed },
    error: { type: String },
    duration: { type: Number }
  }],
  executedAt: {
    type: Date,
    default: Date.now
  },
  duration: {
    type: Number, // total execution time in ms
    default: 0
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

automationLogSchema.index({ userId: 1, executedAt: -1 });
automationLogSchema.index({ ruleId: 1, executedAt: -1 });
automationLogSchema.index({ triggered: 1, executedAt: -1 });

// Keep only last 90 days of logs
automationLogSchema.index({ executedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const AutomationLog = mongoose.model('AutomationLog', automationLogSchema);

module.exports = AutomationLog;
