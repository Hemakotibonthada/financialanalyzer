const mongoose = require('mongoose');

const {
  CLAIM_STATUS,
  CLAIM_TYPE,
  TERMINAL_CLAIM_STATUSES,
  CASE_NUMBER_PREFIX,
  CLAIM_PLAYBOOKS,
  isValidClaimTransition,
  formatCaseNumber,
  roundMoney
} = require('../constants/legacyConstants');

const timelineEntrySchema = new mongoose.Schema({
  at: { type: Date, default: Date.now },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true, trim: true },
  detail: { type: String, trim: true }
}, { _id: false });

const recoveryClaimSchema = new mongoose.Schema({
  claimNumber: {
    type: String,
    unique: true,
    index: true
  },
  estateCaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EstateCase',
    required: true,
    index: true
  },
  estateAssetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EstateAsset',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  claimType: {
    type: String,
    enum: CLAIM_TYPE,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: CLAIM_STATUS,
    default: 'draft',
    index: true
  },
  institution: {
    name: { type: String, trim: true },
    branch: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    referenceNumber: { type: String, trim: true }
  },
  claimedAmountInINR: { type: Number, default: 0, min: 0 },
  approvedAmountInINR: { type: Number, default: 0, min: 0 },
  receivedAmountInINR: { type: Number, default: 0, min: 0, index: true },
  submittedAt: { type: Date },
  acknowledgedAt: { type: Date },
  decisionAt: { type: Date },
  settledAt: { type: Date },
  expectedSettlementDate: { type: Date, index: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'EstateDocument' }],
  correspondence: [{
    at: { type: Date, default: Date.now },
    direction: { type: String, enum: ['outbound', 'inbound'], required: true },
    channel: { type: String, trim: true },
    summary: { type: String, trim: true },
    byUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  rejectionReason: { type: String, trim: true },
  appealNotes: { type: String, trim: true },
  slaDueAt: { type: Date, index: true },
  timeline: [timelineEntrySchema]
}, {
  timestamps: true
});

recoveryClaimSchema.index({ userId: 1, status: 1 });
recoveryClaimSchema.index({ estateCaseId: 1, status: 1 });
recoveryClaimSchema.index({ estateAssetId: 1, status: 1 });
recoveryClaimSchema.index({ assignedTo: 1, status: 1, slaDueAt: 1 });
recoveryClaimSchema.index({ claimType: 1, status: 1 });

recoveryClaimSchema.virtual('isTerminal').get(function() {
  return TERMINAL_CLAIM_STATUSES.includes(this.status);
});

recoveryClaimSchema.virtual('isSlaBreached').get(function() {
  return Boolean(this.slaDueAt && !this.isTerminal && new Date() > this.slaDueAt);
});

recoveryClaimSchema.virtual('playbook').get(function() {
  return CLAIM_PLAYBOOKS[this.claimType] || CLAIM_PLAYBOOKS.generic_recovery;
});

recoveryClaimSchema.virtual('recoveryPercentage').get(function() {
  if (!this.claimedAmountInINR) return 0;
  return roundMoney((this.receivedAmountInINR / this.claimedAmountInINR) * 100);
});

recoveryClaimSchema.set('toJSON', { virtuals: true });
recoveryClaimSchema.set('toObject', { virtuals: true });

recoveryClaimSchema.pre('validate', async function(next) {
  try {
    if (!this.claimNumber) {
      this.claimNumber = await this.constructor.generateCaseNumber();
    }
    next();
  } catch (error) {
    next(error);
  }
});

recoveryClaimSchema.pre('save', function(next) {
  this.claimedAmountInINR = roundMoney(this.claimedAmountInINR);
  this.approvedAmountInINR = roundMoney(this.approvedAmountInINR);
  this.receivedAmountInINR = roundMoney(this.receivedAmountInINR);
  next();
});

recoveryClaimSchema.methods.addTimelineEntry = function(actor, action, detail) {
  this.timeline.push({ actor, action, detail, at: new Date() });
  return this;
};

recoveryClaimSchema.methods.addCorrespondence = function(data) {
  this.correspondence.push({
    at: data.at || new Date(),
    direction: data.direction,
    channel: data.channel,
    summary: data.summary,
    byUser: data.byUser
  });
  this.addTimelineEntry(data.byUser, 'correspondence_added', data.summary);
  return this.save();
};

recoveryClaimSchema.methods.transitionTo = function(status, actorId, note) {
  if (!isValidClaimTransition(this.status, status)) {
    throw new Error(`Illegal recovery claim transition from ${this.status} to ${status}`);
  }

  this.status = status;
  const now = new Date();
  if (status === 'submitted' && !this.submittedAt) this.submittedAt = now;
  if (status === 'acknowledged' && !this.acknowledgedAt) this.acknowledgedAt = now;
  if (['approved', 'rejected'].includes(status) && !this.decisionAt) this.decisionAt = now;
  if (status === 'settled' && !this.settledAt) this.settledAt = now;
  this.addTimelineEntry(actorId, `status:${status}`, note);
  return this.save();
};

recoveryClaimSchema.statics.generateCaseNumber = async function(when = new Date(), attempt = 0) {
  if (attempt >= 5) throw new Error('Unable to generate unique recovery claim number after 5 attempts');

  const start = new Date(when.getFullYear(), when.getMonth(), 1);
  const end = new Date(when.getFullYear(), when.getMonth() + 1, 1);
  const existing = await this.countDocuments({ createdAt: { $gte: start, $lt: end } });
  const candidate = formatCaseNumber(CASE_NUMBER_PREFIX.claim, existing + attempt + 1, when);
  const collision = await this.exists({ claimNumber: candidate });

  if (collision) return this.generateCaseNumber(when, attempt + 1);
  return candidate;
};

recoveryClaimSchema.statics.createWithCaseNumber = async function(payload) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await this.create({
        ...payload,
        claimNumber: payload.claimNumber || await this.generateCaseNumber(new Date(), attempt)
      });
    } catch (error) {
      lastError = error;
      if (error && error.code === 11000) {
        payload.claimNumber = undefined;
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error('Unable to create recovery claim with a unique claim number');
};

recoveryClaimSchema.statics.getQueue = function(filters = {}) {
  const query = {};
  if (filters.estateCaseId) query.estateCaseId = filters.estateCaseId;
  if (filters.status) query.status = filters.status;
  else query.status = { $nin: TERMINAL_CLAIM_STATUSES };
  if (filters.assignedTo) query.assignedTo = filters.assignedTo;
  if (filters.claimType) query.claimType = filters.claimType;

  return this.find(query).sort({ slaDueAt: 1, expectedSettlementDate: 1 }).limit(filters.limit || 100);
};

recoveryClaimSchema.statics.getRecoverySummary = function(estateCaseId) {
  return this.aggregate([
    { $match: { estateCaseId: new mongoose.Types.ObjectId(estateCaseId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        claimedAmountInINR: { $sum: '$claimedAmountInINR' },
        approvedAmountInINR: { $sum: '$approvedAmountInINR' },
        receivedAmountInINR: { $sum: '$receivedAmountInINR' }
      }
    },
    { $sort: { receivedAmountInINR: -1 } }
  ]);
};

module.exports = mongoose.model('RecoveryClaim', recoveryClaimSchema);
