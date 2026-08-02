const crypto = require('crypto');
const mongoose = require('mongoose');

const { SUPPORT_ROLES } = require('../constants/legacyConstants');

function computeHash(sequence, estateCaseId, action, after, previousHash, occurredAt) {
  return crypto
    .createHash('sha256')
    .update(`${sequence}${estateCaseId}${action}${JSON.stringify(after)}${previousHash}${occurredAt}`)
    .digest('hex');
}

const estateAuditEventSchema = new mongoose.Schema({
  sequence: {
    type: Number,
    required: true,
    min: 1,
    index: true
  },
  estateCaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EstateCase',
    required: true,
    index: true
  },
  dormancyCaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DormancyCase',
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  actorRole: {
    type: String,
    enum: SUPPORT_ROLES,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  entityType: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  before: {
    type: mongoose.Schema.Types.Mixed
  },
  after: {
    type: mongoose.Schema.Types.Mixed
  },
  reason: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  previousHash: {
    type: String,
    required: true
  },
  hash: {
    type: String,
    required: true,
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

estateAuditEventSchema.index({ userId: 1, occurredAt: -1 });
estateAuditEventSchema.index({ estateCaseId: 1, sequence: 1 }, { unique: true });
estateAuditEventSchema.index({ estateCaseId: 1, occurredAt: -1 });
estateAuditEventSchema.index({ actorId: 1, occurredAt: -1 });
estateAuditEventSchema.index({ entityType: 1, entityId: 1 });

estateAuditEventSchema.virtual('isGenesis').get(function() {
  return this.previousHash === 'GENESIS';
});

estateAuditEventSchema.virtual('summary').get(function() {
  return `${this.action} on ${this.entityType}`;
});

estateAuditEventSchema.set('toJSON', { virtuals: true });
estateAuditEventSchema.set('toObject', { virtuals: true });

estateAuditEventSchema.pre(['updateOne', 'findOneAndUpdate', 'deleteOne', 'findOneAndDelete', 'updateMany', 'deleteMany'], function(next) {
  next(new Error('EstateAuditEvent is append-only'));
});

estateAuditEventSchema.pre('save', function(next) {
  if (!this.isNew) {
    next(new Error('EstateAuditEvent is append-only'));
    return;
  }
  next();
});

estateAuditEventSchema.statics.computeHash = computeHash;

estateAuditEventSchema.statics.record = async function(payload) {
  let lastError;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const previous = await this.findOne({ estateCaseId: payload.estateCaseId }).sort({ sequence: -1 }).lean();
    const sequence = previous ? previous.sequence + 1 : 1;
    const previousHash = previous ? previous.hash : 'GENESIS';
    const occurredAt = payload.occurredAt || new Date();
    const hash = computeHash(
      sequence,
      payload.estateCaseId,
      payload.action,
      payload.after,
      previousHash,
      occurredAt
    );

    try {
      return await this.create({
        ...payload,
        sequence,
        previousHash,
        hash,
        occurredAt
      });
    } catch (error) {
      lastError = error;
      if (error && error.code === 11000) continue;
      throw error;
    }
  }

  throw lastError || new Error('Unable to append estate audit event after 5 attempts');
};

estateAuditEventSchema.statics.verifyChain = async function(estateCaseId) {
  const events = await this.find({ estateCaseId }).sort({ sequence: 1 }).lean();
  let previousHash = 'GENESIS';

  for (const event of events) {
    const expectedHash = computeHash(
      event.sequence,
      event.estateCaseId,
      event.action,
      event.after,
      previousHash,
      event.occurredAt
    );

    if (event.previousHash !== previousHash || event.hash !== expectedHash) {
      return {
        valid: false,
        brokenAtSequence: event.sequence,
        totalEvents: events.length
      };
    }

    previousHash = event.hash;
  }

  return {
    valid: true,
    brokenAtSequence: null,
    totalEvents: events.length
  };
};

estateAuditEventSchema.statics.getTrail = function(estateCaseId) {
  return this.find({ estateCaseId }).sort({ sequence: 1 });
};

module.exports = mongoose.model('EstateAuditEvent', estateAuditEventSchema);
