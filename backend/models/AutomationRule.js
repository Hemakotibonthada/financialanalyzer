const mongoose = require('mongoose');
const { Schema } = mongoose;

const conditionSchema = new Schema({
  field: { type: String, required: true },
  operator: {
    type: String,
    enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'contains', 'not_contains', 'starts_with', 'ends_with', 'in', 'not_in', 'between', 'regex', 'is_empty', 'is_not_empty'],
    required: true
  },
  value: { type: Schema.Types.Mixed, required: true }
}, { _id: false });

const scheduleSchema = new Schema({
  type: {
    type: String,
    enum: ['once', 'daily', 'weekly', 'monthly', 'yearly', 'cron', 'interval'],
    default: 'once'
  },
  time: { type: String }, // HH:mm format
  dayOfWeek: { type: Number, min: 0, max: 6 }, // 0=Sun, 6=Sat
  dayOfMonth: { type: Number, min: 1, max: 31 },
  month: { type: Number, min: 0, max: 11 },
  cronExpression: { type: String },
  intervalMinutes: { type: Number },
  startDate: { type: Date },
  endDate: { type: Date },
  nextRunAt: { type: Date },
  lastRunAt: { type: Date },
  timezone: { type: String, default: 'Asia/Kolkata' }
}, { _id: false });

const executionLogSchema = new Schema({
  executedAt: { type: Date, default: Date.now },
  triggerData: { type: Schema.Types.Mixed },
  actionResults: [{ type: Schema.Types.Mixed }],
  success: { type: Boolean, default: true },
  error: { type: String },
  duration: { type: Number } // milliseconds
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
  category: {
    type: String,
    enum: ['spending', 'saving', 'budgeting', 'investment', 'debt', 'alerting', 'reporting', 'organization', 'ai_powered', 'custom'],
    default: 'custom'
  },
  trigger: {
    type: {
      type: String,
      enum: [
        // Transaction triggers
        'amount_above', 'amount_below', 'amount_between',
        'category_match', 'keyword_match', 'merchant_match',
        'recurring_pattern', 'date_match',
        // Financial triggers
        'budget_threshold', 'budget_exceeded',
        'spending_velocity', 'spending_spike',
        'savings_milestone', 'savings_drop',
        'income_received', 'income_change',
        'bill_due', 'bill_overdue',
        'goal_progress', 'goal_deadline',
        'emi_due', 'emi_missed',
        // AI triggers
        'anomaly_detected', 'fraud_suspected',
        'pattern_change', 'unusual_merchant',
        'credit_score_change',
        // System triggers
        'schedule', 'manual', 'webhook',
        'low_balance', 'high_balance',
        'new_transaction', 'transaction_failed'
      ],
      required: true
    },
    value: { type: Schema.Types.Mixed },
    category: { type: String, trim: true },
    params: { type: Schema.Types.Mixed, default: {} }
  },
  action: {
    type: {
      type: String,
      enum: [
        // Transaction actions
        'auto_categorize', 'auto_tag', 'auto_split',
        'add_note', 'flag_review',
        // Notification actions
        'send_notification', 'send_email', 'send_sms',
        'create_alert', 'push_notification',
        // Financial actions
        'auto_save', 'auto_transfer', 'auto_invest',
        'create_budget', 'adjust_budget',
        'update_goal', 'create_reminder',
        // Reporting actions
        'generate_report', 'export_data',
        'create_snapshot', 'log_event',
        // Organization actions
        'archive_transaction', 'merge_transactions',
        'assign_category_rule', 'create_recurring',
        // AI actions
        'run_analysis', 'train_model',
        'generate_insight', 'suggest_optimization',
        // Custom actions
        'webhook_call', 'custom_script'
      ],
      required: true
    },
    config: { type: Schema.Types.Mixed, default: {} }
  },
  // Multiple chained actions
  chainedActions: [{
    type: {
      type: String,
      required: true
    },
    config: { type: Schema.Types.Mixed, default: {} },
    delay: { type: Number, default: 0 }, // delay in ms before executing
    condition: { type: Schema.Types.Mixed } // optional condition
  }],
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
  successCount: {
    type: Number,
    default: 0
  },
  failureCount: {
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
  },
  schedule: {
    type: scheduleSchema,
    default: null
  },
  // Execution history (last 50 entries)
  executionHistory: {
    type: [executionLogSchema],
    default: [],
    validate: {
      validator: function(v) { return v.length <= 50; }
    }
  },
  // Rate limiting
  cooldownMinutes: {
    type: Number,
    default: 0 // 0 = no cooldown
  },
  maxExecutionsPerDay: {
    type: Number,
    default: 0 // 0 = unlimited
  },
  // Metadata
  tags: [{ type: String, trim: true }],
  isTemplate: {
    type: Boolean,
    default: false
  },
  templateId: {
    type: Schema.Types.ObjectId,
    ref: 'AutomationRule',
    default: null
  },
  aiGenerated: {
    type: Boolean,
    default: false
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

automationRuleSchema.index({ userId: 1, isActive: 1 });
automationRuleSchema.index({ userId: 1, priority: -1 });
automationRuleSchema.index({ 'trigger.type': 1 });
automationRuleSchema.index({ category: 1 });
automationRuleSchema.index({ 'schedule.nextRunAt': 1 });
automationRuleSchema.index({ isTemplate: 1 });

automationRuleSchema.virtual('successRate').get(function() {
  return this.executionCount > 0 ? Math.round((this.successCount / this.executionCount) * 100) : 0;
});

automationRuleSchema.methods.execute = function () {
  this.executionCount += 1;
  this.lastExecutedAt = new Date();
  return this.save();
};

automationRuleSchema.methods.recordExecution = function (triggerData, actionResults, success, error, duration) {
  this.executionCount += 1;
  if (success) this.successCount += 1;
  else this.failureCount += 1;
  this.lastExecutedAt = new Date();

  // Keep only last 50 entries
  if (this.executionHistory.length >= 50) {
    this.executionHistory.shift();
  }
  this.executionHistory.push({ executedAt: new Date(), triggerData, actionResults, success, error, duration });

  return this.save();
};

automationRuleSchema.statics.findActiveByUser = function (userId) {
  return this.find({ userId, isActive: true }).sort({ priority: -1 });
};

automationRuleSchema.statics.findByTriggerType = function (userId, triggerType) {
  return this.find({ userId, isActive: true, 'trigger.type': triggerType }).sort({ priority: -1 });
};

automationRuleSchema.statics.findDueScheduled = function () {
  return this.find({
    isActive: true,
    'schedule.nextRunAt': { $lte: new Date() }
  }).sort({ 'schedule.nextRunAt': 1 });
};

automationRuleSchema.statics.getTemplates = function () {
  return this.find({ isTemplate: true }).sort({ category: 1, name: 1 });
};

const AutomationRule = mongoose.model('AutomationRule', automationRuleSchema);

module.exports = AutomationRule;
