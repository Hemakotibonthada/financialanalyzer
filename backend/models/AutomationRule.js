const mongoose = require('mongoose');
const { Schema } = mongoose;

const conditionSchema = new Schema({
  field: { type: String, required: true },
  operator: {
    type: String,
    enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'starts_with', 'ends_with', 'in', 'not_in'],
    required: true
  },
  value: { type: Schema.Types.Mixed, required: true }
}, { _id: false });

const automationRuleSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Rule name is required'],
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  trigger: {
    type: {
      type: String,
      enum: ['amount_above', 'amount_below', 'category_match', 'recurring_pattern', 'date_match', 'keyword_match'],
      required: true
    },
    value: { type: Schema.Types.Mixed, required: true },
    category: { type: String, trim: true }
  },
  action: {
    type: {
      type: String,
      enum: ['auto_categorize', 'send_notification', 'create_alert', 'auto_tag', 'auto_save', 'auto_transfer'],
      required: true
    },
    config: { type: Schema.Types.Mixed, default: {} }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  executionCount: {
    type: Number,
    default: 0
  },
  lastExecutedAt: {
    type: Date,
    default: null
  },
  conditions: {
    type: [conditionSchema],
    default: []
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

automationRuleSchema.index({ userId: 1, isActive: 1 });
automationRuleSchema.index({ userId: 1, priority: -1 });
automationRuleSchema.index({ 'trigger.type': 1 });

automationRuleSchema.methods.execute = function () {
  this.executionCount += 1;
  this.lastExecutedAt = new Date();
  return this.save();
};

automationRuleSchema.statics.findActiveByUser = function (userId) {
  return this.find({ userId, isActive: true }).sort({ priority: -1 });
};

automationRuleSchema.statics.findByTriggerType = function (userId, triggerType) {
  return this.find({ userId, isActive: true, 'trigger.type': triggerType }).sort({ priority: -1 });
};

const AutomationRule = mongoose.model('AutomationRule', automationRuleSchema);

module.exports = AutomationRule;
