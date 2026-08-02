const mongoose = require('mongoose');

const {
  DORMANCY_STAGE,
  DEFAULT_THRESHOLDS,
  daysBetween,
  stageForInactiveDays,
  roundMoney
} = require('../constants/legacyConstants');

const SIGNAL_FIELD_MAP = Object.freeze({
  login: 'lastLoginAt',
  api: 'lastApiActivityAt',
  api_activity: 'lastApiActivityAt',
  transaction: 'lastTransactionAt',
  document: 'lastDocumentAt',
  gmail_sync: 'lastGmailSyncAt'
});

const accountActivityIndexSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  lastLoginAt: {
    type: Date,
    index: true
  },
  lastApiActivityAt: {
    type: Date,
    index: true
  },
  lastTransactionAt: {
    type: Date
  },
  lastDocumentAt: {
    type: Date
  },
  lastGmailSyncAt: {
    type: Date
  },
  lastMeaningfulActivityAt: {
    type: Date,
    index: true
  },
  loginCount30d: {
    type: Number,
    default: 0,
    min: 0
  },
  loginCount90d: {
    type: Number,
    default: 0,
    min: 0
  },
  loginCount365d: {
    type: Number,
    default: 0,
    min: 0
  },
  consecutiveInactiveDays: {
    type: Number,
    default: 0,
    min: 0,
    index: true
  },
  emailBounceCount: {
    type: Number,
    default: 0,
    min: 0
  },
  smsFailureCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastContactAttemptAt: {
    type: Date
  },
  dormancyStage: {
    type: String,
    enum: DORMANCY_STAGE,
    default: 'active',
    index: true
  },
  stageChangedAt: {
    type: Date
  },
  isFrozen: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

accountActivityIndexSchema.index({ userId: 1, dormancyStage: 1 });
accountActivityIndexSchema.index({ dormancyStage: 1, consecutiveInactiveDays: -1 });
accountActivityIndexSchema.index({ isFrozen: 1, dormancyStage: 1 });
accountActivityIndexSchema.index({ lastMeaningfulActivityAt: 1, dormancyStage: 1 });

accountActivityIndexSchema.virtual('daysSinceLastActivity').get(function() {
  return daysBetween(this.lastMeaningfulActivityAt);
});

accountActivityIndexSchema.virtual('isStale').get(function() {
  return (this.daysSinceLastActivity || 0) >= DEFAULT_THRESHOLDS.watchDays;
});

accountActivityIndexSchema.set('toJSON', { virtuals: true });
accountActivityIndexSchema.set('toObject', { virtuals: true });

accountActivityIndexSchema.pre('save', function(next) {
  const activityDates = [
    this.lastLoginAt,
    this.lastApiActivityAt,
    this.lastTransactionAt,
    this.lastDocumentAt,
    this.lastGmailSyncAt
  ].filter(Boolean).map(d => new Date(d));

  if (activityDates.length > 0) {
    this.lastMeaningfulActivityAt = new Date(Math.max(...activityDates.map(d => d.getTime())));
  }

  this.consecutiveInactiveDays = daysBetween(this.lastMeaningfulActivityAt) || 0;
  this.loginCount30d = roundMoney(this.loginCount30d);
  this.loginCount90d = roundMoney(this.loginCount90d);
  this.loginCount365d = roundMoney(this.loginCount365d);
  next();
});

accountActivityIndexSchema.methods.recordContactFailure = function(kind, occurredAt = new Date()) {
  if (kind === 'email') this.emailBounceCount += 1;
  if (kind === 'sms') this.smsFailureCount += 1;
  this.lastContactAttemptAt = occurredAt;
  return this.save();
};

accountActivityIndexSchema.methods.freeze = function(note) {
  this.isFrozen = true;
  if (note) this.notes = note;
  return this.save();
};

accountActivityIndexSchema.methods.resetDormancy = function(note) {
  this.dormancyStage = 'active';
  this.stageChangedAt = new Date();
  this.isFrozen = false;
  if (note) this.notes = note;
  return this.save();
};

accountActivityIndexSchema.statics.touch = async function(userId, signalType) {
  const now = new Date();
  const field = SIGNAL_FIELD_MAP[signalType] || 'lastApiActivityAt';
  const update = {
    $set: {
      [field]: now,
      lastMeaningfulActivityAt: now,
      consecutiveInactiveDays: 0,
      dormancyStage: 'active',
      stageChangedAt: now,
      isFrozen: false
    },
    $setOnInsert: { userId }
  };

  if (signalType === 'login') {
    update.$inc = {
      loginCount30d: 1,
      loginCount90d: 1,
      loginCount365d: 1
    };
  }

  return this.findOneAndUpdate({ userId }, update, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true
  });
};

accountActivityIndexSchema.statics.recomputeInactivity = async function(userId) {
  const doc = await this.findOne({ userId });
  if (!doc) return null;

  const previousStage = doc.dormancyStage;
  doc.consecutiveInactiveDays = daysBetween(doc.lastMeaningfulActivityAt) || 0;
  doc.dormancyStage = stageForInactiveDays(doc.consecutiveInactiveDays);
  if (previousStage !== doc.dormancyStage) {
    doc.stageChangedAt = new Date();
  }

  return doc.save();
};

accountActivityIndexSchema.statics.findCandidates = function(stage, minDays, limit = 100) {
  const query = {
    dormancyStage: stage,
    consecutiveInactiveDays: { $gte: minDays },
    isFrozen: { $ne: true }
  };

  return this.find(query)
    .sort({ consecutiveInactiveDays: -1, lastMeaningfulActivityAt: 1 })
    .limit(limit);
};

accountActivityIndexSchema.statics.getDormancySummary = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$dormancyStage',
        count: { $sum: 1 },
        avgInactiveDays: { $avg: '$consecutiveInactiveDays' },
        frozen: { $sum: { $cond: ['$isFrozen', 1, 0] } }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('AccountActivityIndex', accountActivityIndexSchema);
