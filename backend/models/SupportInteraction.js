const mongoose = require('mongoose');

const {
  OUTREACH_CHANNEL,
  OUTREACH_OUTCOME,
  PROOF_OF_LIFE_OUTCOMES,
  CHANNEL_FAILURE_OUTCOMES,
  maskValue
} = require('../constants/legacyConstants');

const supportInteractionSchema = new mongoose.Schema({
  caseId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  caseType: {
    type: String,
    enum: ['dormancy', 'estate'],
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  channel: {
    type: String,
    enum: OUTREACH_CHANNEL,
    required: true,
    index: true
  },
  direction: {
    type: String,
    enum: ['outbound', 'inbound'],
    required: true,
    index: true
  },
  attemptNumber: {
    type: Number,
    default: 1,
    min: 1
  },
  contactedParty: {
    type: String,
    enum: ['user', 'nominee', 'emergency_contact', 'other'],
    default: 'user',
    index: true
  },
  contactValueMasked: {
    type: String,
    trim: true
  },
  outcome: {
    type: String,
    enum: OUTREACH_OUTCOME,
    required: true,
    index: true
  },
  durationSeconds: {
    type: Number,
    default: 0,
    min: 0
  },
  notes: {
    type: String,
    trim: true
  },
  recordingUrl: {
    type: String,
    trim: true
  },
  followUpRequired: {
    type: Boolean,
    default: false,
    index: true
  },
  followUpAt: {
    type: Date,
    index: true
  },
  occurredAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

supportInteractionSchema.index({ userId: 1, occurredAt: -1 });
supportInteractionSchema.index({ caseId: 1, caseType: 1, occurredAt: -1 });
supportInteractionSchema.index({ agentId: 1, occurredAt: -1 });
supportInteractionSchema.index({ outcome: 1, channel: 1, occurredAt: -1 });
supportInteractionSchema.index({ followUpRequired: 1, followUpAt: 1 });

supportInteractionSchema.virtual('isProofOfLife').get(function() {
  return PROOF_OF_LIFE_OUTCOMES.includes(this.outcome);
});

supportInteractionSchema.virtual('isChannelFailure').get(function() {
  return CHANNEL_FAILURE_OUTCOMES.includes(this.outcome);
});

supportInteractionSchema.virtual('needsFollowUpNow').get(function() {
  return Boolean(this.followUpRequired && this.followUpAt && new Date() >= this.followUpAt);
});

supportInteractionSchema.set('toJSON', { virtuals: true });
supportInteractionSchema.set('toObject', { virtuals: true });

supportInteractionSchema.pre('save', function(next) {
  if (this.contactValueMasked) {
    this.contactValueMasked = maskValue(this.contactValueMasked);
  }
  next();
});

supportInteractionSchema.methods.scheduleFollowUp = function(when, note) {
  this.followUpRequired = true;
  this.followUpAt = when;
  if (note) this.notes = this.notes ? `${this.notes}\n${note}` : note;
  return this.save();
};

supportInteractionSchema.methods.clearFollowUp = function(note) {
  this.followUpRequired = false;
  if (note) this.notes = this.notes ? `${this.notes}\n${note}` : note;
  return this.save();
};

supportInteractionSchema.statics.logInteraction = function(payload) {
  return this.create(payload);
};

supportInteractionSchema.statics.getCaseTimeline = function(caseId, caseType) {
  return this.find({ caseId, caseType }).sort({ occurredAt: 1 });
};

supportInteractionSchema.statics.getFollowUpQueue = function(limit = 100) {
  return this.find({
    followUpRequired: true,
    followUpAt: { $lte: new Date() }
  }).sort({ followUpAt: 1 }).limit(limit);
};

supportInteractionSchema.statics.getOutcomeSummary = function(filters = {}) {
  const match = {};
  if (filters.userId) match.userId = new mongoose.Types.ObjectId(filters.userId);
  if (filters.caseType) match.caseType = filters.caseType;
  if (filters.from || filters.to) {
    match.occurredAt = {};
    if (filters.from) match.occurredAt.$gte = filters.from;
    if (filters.to) match.occurredAt.$lte = filters.to;
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: { channel: '$channel', outcome: '$outcome' },
        count: { $sum: 1 },
        avgDurationSeconds: { $avg: '$durationSeconds' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('SupportInteraction', supportInteractionSchema);
