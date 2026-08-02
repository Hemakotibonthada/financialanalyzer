const mongoose = require('mongoose');

const {
  DORMANCY_STAGE,
  DORMANCY_TRIGGER,
  CASE_STATUS,
  TERMINAL_CASE_STATUSES,
  CASE_PRIORITY,
  CASE_NUMBER_PREFIX,
  formatCaseNumber,
  roundMoney
} = require('../constants/legacyConstants');

const timelineEntrySchema = new mongoose.Schema({
  at: {
    type: Date,
    default: Date.now
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  action: {
    type: String,
    required: true,
    trim: true
  },
  detail: {
    type: String,
    trim: true
  }
}, { _id: false });

const dormancyCaseSchema = new mongoose.Schema({
  caseNumber: {
    type: String,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  activityIndexId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccountActivityIndex',
    required: true,
    index: true
  },
  stage: {
    type: String,
    enum: DORMANCY_STAGE,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: CASE_STATUS,
    default: 'open',
    index: true
  },
  priority: {
    type: String,
    enum: CASE_PRIORITY,
    default: 'normal',
    index: true
  },
  triggers: [{
    type: String,
    enum: DORMANCY_TRIGGER
  }],
  detectedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  daysInactiveAtDetection: {
    type: Number,
    min: 0,
    default: 0
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  assignedAt: {
    type: Date
  },
  slaDueAt: {
    type: Date,
    index: true
  },
  outreachAttempts: {
    type: Number,
    default: 0,
    min: 0
  },
  lastOutreachAt: {
    type: Date
  },
  nextOutreachDueAt: {
    type: Date,
    index: true
  },
  userResponded: {
    type: Boolean,
    default: false
  },
  respondedAt: {
    type: Date
  },
  resolution: {
    outcome: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: {
      type: Date
    }
  },
  escalatedToEstateCase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EstateCase'
  },
  policyVersion: {
    type: Number,
    index: true
  },
  timeline: [timelineEntrySchema]
}, {
  timestamps: true
});

dormancyCaseSchema.index({ userId: 1, status: 1 });
dormancyCaseSchema.index({ userId: 1, stage: 1 });
dormancyCaseSchema.index({ status: 1, priority: -1, slaDueAt: 1 });
dormancyCaseSchema.index({ assignedTo: 1, status: 1, slaDueAt: 1 });
dormancyCaseSchema.index({ detectedAt: -1, status: 1 });

dormancyCaseSchema.virtual('isTerminal').get(function() {
  return TERMINAL_CASE_STATUSES.includes(this.status);
});

dormancyCaseSchema.virtual('isSlaBreached').get(function() {
  return Boolean(this.slaDueAt && !this.isTerminal && new Date() > this.slaDueAt);
});

dormancyCaseSchema.virtual('ageDays').get(function() {
  if (!this.detectedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(this.detectedAt).getTime()) / 86400000));
});

dormancyCaseSchema.set('toJSON', { virtuals: true });
dormancyCaseSchema.set('toObject', { virtuals: true });

dormancyCaseSchema.pre('validate', async function(next) {
  try {
    if (!this.caseNumber) {
      this.caseNumber = await this.constructor.generateCaseNumber();
    }
    next();
  } catch (error) {
    next(error);
  }
});

dormancyCaseSchema.pre('save', function(next) {
  this.daysInactiveAtDetection = roundMoney(this.daysInactiveAtDetection);
  next();
});

dormancyCaseSchema.methods.addTimelineEntry = function(actor, action, detail) {
  this.timeline.push({ actor, action, detail, at: new Date() });
  return this;
};

dormancyCaseSchema.methods.assign = function(actorId, assigneeId, note) {
  this.assignedTo = assigneeId;
  this.assignedAt = new Date();
  if (this.status === 'open') this.status = 'in_progress';
  this.addTimelineEntry(actorId, 'assigned', note || `Assigned to ${assigneeId}`);
  return this.save();
};

dormancyCaseSchema.methods.escalate = function(actorId, estateCaseId, note) {
  this.status = 'closed_deceased';
  this.stage = 'escalated_estate';
  this.escalatedToEstateCase = estateCaseId;
  this.resolution = {
    outcome: 'escalated_estate',
    notes: note,
    resolvedBy: actorId,
    resolvedAt: new Date()
  };
  this.addTimelineEntry(actorId, 'escalated_estate', note);
  return this.save();
};

dormancyCaseSchema.methods.resolveAlive = function(actorId, notes) {
  this.status = 'closed_alive';
  this.stage = 'resolved_alive';
  this.userResponded = true;
  this.respondedAt = new Date();
  this.resolution = {
    outcome: 'confirmed_alive',
    notes,
    resolvedBy: actorId,
    resolvedAt: new Date()
  };
  this.addTimelineEntry(actorId, 'resolved_alive', notes);
  return this.save();
};

dormancyCaseSchema.statics.generateCaseNumber = async function(when = new Date(), attempt = 0) {
  if (attempt >= 5) throw new Error('Unable to generate unique dormancy case number after 5 attempts');

  const start = new Date(when.getFullYear(), when.getMonth(), 1);
  const end = new Date(when.getFullYear(), when.getMonth() + 1, 1);
  const existing = await this.countDocuments({ createdAt: { $gte: start, $lt: end } });
  const candidate = formatCaseNumber(CASE_NUMBER_PREFIX.dormancy, existing + attempt + 1, when);
  const collision = await this.exists({ caseNumber: candidate });

  if (collision) return this.generateCaseNumber(when, attempt + 1);
  return candidate;
};

dormancyCaseSchema.statics.createWithCaseNumber = async function(payload) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await this.create({
        ...payload,
        caseNumber: payload.caseNumber || await this.generateCaseNumber(new Date(), attempt)
      });
    } catch (error) {
      lastError = error;
      if (error && error.code === 11000) {
        payload.caseNumber = undefined;
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error('Unable to create dormancy case with a unique case number');
};

dormancyCaseSchema.statics.getQueue = function(filters = {}) {
  const query = {};
  if (filters.status) query.status = filters.status;
  else query.status = { $nin: TERMINAL_CASE_STATUSES };
  if (filters.stage) query.stage = filters.stage;
  if (filters.priority) query.priority = filters.priority;
  if (filters.assignedTo) query.assignedTo = filters.assignedTo;

  return this.find(query)
    .sort({ priority: -1, slaDueAt: 1, detectedAt: 1 })
    .limit(filters.limit || 100);
};

dormancyCaseSchema.statics.getSlaBreaches = function() {
  return this.find({
    status: { $nin: TERMINAL_CASE_STATUSES },
    slaDueAt: { $lt: new Date() }
  }).sort({ slaDueAt: 1 });
};

dormancyCaseSchema.statics.getSummary = function() {
  return this.aggregate([
    {
      $group: {
        _id: { status: '$status', stage: '$stage' },
        count: { $sum: 1 },
        avgInactiveDays: { $avg: '$daysInactiveAtDetection' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('DormancyCase', dormancyCaseSchema);
