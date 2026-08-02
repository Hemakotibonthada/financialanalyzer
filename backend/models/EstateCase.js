const mongoose = require('mongoose');

const {
  ESTATE_STATUS,
  VERIFICATION_METHOD,
  CASE_PRIORITY,
  APPROVER_ROLES,
  CASE_NUMBER_PREFIX,
  isValidEstateTransition,
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

const contactSchema = new mongoose.Schema({
  phone: { type: String, trim: true },
  alternatePhone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  address: {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' }
  }
}, { _id: false });

const estateCaseSchema = new mongoose.Schema({
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
  dormancyCaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DormancyCase',
    index: true
  },
  status: {
    type: String,
    enum: ESTATE_STATUS,
    default: 'initiated',
    index: true
  },
  priority: {
    type: String,
    enum: CASE_PRIORITY,
    default: 'normal',
    index: true
  },
  deceased: {
    reportedAt: { type: Date },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reportedVia: { type: String, trim: true },
    dateOfDeath: { type: Date },
    placeOfDeath: { type: String, trim: true },
    causeCategory: { type: String, trim: true }
  },
  verification: {
    method: { type: String, enum: VERIFICATION_METHOD },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'EstateDocument' },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    notes: { type: String, trim: true }
  },
  approval: {
    proposedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    proposedAt: { type: Date },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      validate: {
        validator: function(value) {
          if (!value || !this.approval || !this.approval.proposedBy) return true;
          return String(value) !== String(this.approval.proposedBy);
        },
        message: 'Maker-checker violation: approval.approvedBy must be different from approval.proposedBy'
      }
    },
    approvedAt: { type: Date },
    approverRole: { type: String, enum: APPROVER_ROLES },
    decision: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true
    },
    rejectionReason: { type: String, trim: true }
  },
  claimant: {
    nomineeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Nominee' },
    fullName: { type: String, trim: true },
    relationship: { type: String, trim: true },
    contact: contactSchema,
    isLegalHeir: { type: Boolean, default: false },
    verifiedAt: { type: Date }
  },
  disputeFlag: {
    type: Boolean,
    default: false,
    index: true
  },
  disputeNotes: {
    type: String,
    trim: true
  },
  totals: {
    discoveredAssetsInINR: { type: Number, default: 0, min: 0 },
    discoveredLiabilitiesInINR: { type: Number, default: 0, min: 0 },
    recoveredInINR: { type: Number, default: 0, min: 0 },
    netEstateInINR: { type: Number, default: 0 },
    feeInINR: { type: Number, default: 0, min: 0 }
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  slaDueAt: {
    type: Date,
    index: true
  },
  consent: {
    given: { type: Boolean, default: false },
    givenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    givenAt: { type: Date },
    ipAddress: { type: String, trim: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'EstateDocument' }
  },
  revocation: {
    revoked: { type: Boolean, default: false, index: true },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    revokedAt: { type: Date },
    reason: { type: String, trim: true }
  },
  closedAt: {
    type: Date
  },
  closureSummary: {
    type: String,
    trim: true
  },
  policyVersion: {
    type: Number,
    index: true
  },
  timeline: [timelineEntrySchema]
}, {
  timestamps: true
});

estateCaseSchema.index({ userId: 1, status: 1 });
estateCaseSchema.index({ status: 1, priority: -1, slaDueAt: 1 });
estateCaseSchema.index({ assignedTo: 1, status: 1 });
estateCaseSchema.index({ dormancyCaseId: 1, status: 1 });
estateCaseSchema.index({ 'approval.decision': 1, status: 1 });
estateCaseSchema.index({ userId: 1, 'revocation.revoked': 1 });

estateCaseSchema.virtual('isOpen').get(function() {
  return !['closed', 'rejected', 'revoked'].includes(this.status);
});

estateCaseSchema.virtual('isApproved').get(function() {
  return this.approval && this.approval.decision === 'approved';
});

estateCaseSchema.virtual('netRecoverableInINR').get(function() {
  return roundMoney((this.totals.recoveredInINR || 0) - (this.totals.feeInINR || 0));
});

estateCaseSchema.virtual('isSlaBreached').get(function() {
  return Boolean(this.slaDueAt && this.isOpen && new Date() > this.slaDueAt);
});

estateCaseSchema.set('toJSON', { virtuals: true });
estateCaseSchema.set('toObject', { virtuals: true });

estateCaseSchema.pre('validate', async function(next) {
  try {
    if (!this.caseNumber) {
      this.caseNumber = await this.constructor.generateCaseNumber();
    }
    next();
  } catch (error) {
    next(error);
  }
});

estateCaseSchema.pre('save', function(next) {
  if (this.approval && this.approval.approvedBy && this.approval.proposedBy &&
      String(this.approval.approvedBy) === String(this.approval.proposedBy)) {
    next(new Error('Maker-checker violation: approval.approvedBy must be different from approval.proposedBy'));
    return;
  }

  if (this.totals) {
    this.totals.discoveredAssetsInINR = roundMoney(this.totals.discoveredAssetsInINR);
    this.totals.discoveredLiabilitiesInINR = roundMoney(this.totals.discoveredLiabilitiesInINR);
    this.totals.recoveredInINR = roundMoney(this.totals.recoveredInINR);
    this.totals.netEstateInINR = roundMoney(this.totals.netEstateInINR);
    this.totals.feeInINR = roundMoney(this.totals.feeInINR);
  }
  next();
});

estateCaseSchema.methods.addTimelineEntry = function(actor, action, detail) {
  this.timeline.push({ actor, action, detail, at: new Date() });
  return this;
};

estateCaseSchema.methods.transitionTo = function(status, actorId, note) {
  if (!isValidEstateTransition(this.status, status)) {
    throw new Error(`Illegal estate case transition from ${this.status} to ${status}`);
  }
  this.status = status;
  this.addTimelineEntry(actorId, `status:${status}`, note);
  return this;
};

estateCaseSchema.methods.propose = function(actorId, details = {}) {
  this.approval.proposedBy = actorId;
  this.approval.proposedAt = new Date();
  this.approval.decision = 'pending';
  this.deceased.reportedBy = actorId;
  this.deceased.reportedAt = this.deceased.reportedAt || new Date();
  Object.assign(this.deceased, details);
  this.transitionTo('verification_pending', actorId, details.notes || 'Death reported for verification');
  return this.save();
};

estateCaseSchema.methods.approve = function(actorId, approverRole, note) {
  if (this.approval.proposedBy && String(actorId) === String(this.approval.proposedBy)) {
    throw new Error('Maker-checker violation: proposer cannot approve the same estate case');
  }
  this.approval.approvedBy = actorId;
  this.approval.approvedAt = new Date();
  this.approval.approverRole = approverRole;
  this.approval.decision = 'approved';
  this.transitionTo('verified', actorId, note || 'Death verification approved');
  return this.save();
};

estateCaseSchema.methods.reject = function(actorId, reason) {
  this.approval.decision = 'rejected';
  this.approval.rejectionReason = reason;
  this.status = 'rejected';
  this.addTimelineEntry(actorId, 'rejected', reason);
  return this.save();
};

estateCaseSchema.methods.revoke = function(actorId, reason) {
  if (!reason) throw new Error('Revocation reason is required');
  this.revocation = {
    revoked: true,
    revokedBy: actorId,
    revokedAt: new Date(),
    reason
  };
  this.status = 'revoked';
  this.addTimelineEntry(actorId, 'revoked', reason);
  return this.save();
};

estateCaseSchema.methods.recomputeTotals = async function() {
  const EstateAsset = mongoose.model('EstateAsset');
  const SettlementFee = mongoose.model('SettlementFee');
  const assets = await EstateAsset.find({ estateCaseId: this._id });

  const totals = assets.reduce((acc, asset) => {
    if (asset.kind === 'asset') acc.discoveredAssetsInINR += Number(asset.estimatedValueInINR || 0);
    if (asset.kind === 'liability') acc.discoveredLiabilitiesInINR += Number(asset.estimatedValueInINR || 0);
    acc.recoveredInINR += Number(asset.recoveredValueInINR || 0);
    return acc;
  }, {
    discoveredAssetsInINR: 0,
    discoveredLiabilitiesInINR: 0,
    recoveredInINR: 0
  });

  const fee = await SettlementFee.computeFor(this._id);
  this.totals = {
    discoveredAssetsInINR: roundMoney(totals.discoveredAssetsInINR),
    discoveredLiabilitiesInINR: roundMoney(totals.discoveredLiabilitiesInINR),
    recoveredInINR: roundMoney(totals.recoveredInINR),
    netEstateInINR: roundMoney(totals.recoveredInINR - totals.discoveredLiabilitiesInINR - fee.totalPayableInINR),
    feeInINR: roundMoney(fee.totalPayableInINR)
  };
  return this.save();
};

estateCaseSchema.statics.generateCaseNumber = async function(when = new Date(), attempt = 0) {
  if (attempt >= 5) throw new Error('Unable to generate unique estate case number after 5 attempts');

  const start = new Date(when.getFullYear(), when.getMonth(), 1);
  const end = new Date(when.getFullYear(), when.getMonth() + 1, 1);
  const existing = await this.countDocuments({ createdAt: { $gte: start, $lt: end } });
  const candidate = formatCaseNumber(CASE_NUMBER_PREFIX.estate, existing + attempt + 1, when);
  const collision = await this.exists({ caseNumber: candidate });

  if (collision) return this.generateCaseNumber(when, attempt + 1);
  return candidate;
};

estateCaseSchema.statics.createWithCaseNumber = async function(payload) {
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
  throw lastError || new Error('Unable to create estate case with a unique case number');
};

estateCaseSchema.statics.getQueue = function(filters = {}) {
  const query = {};
  if (filters.status) query.status = filters.status;
  else query.status = { $nin: ['closed', 'rejected', 'revoked'] };
  if (filters.assignedTo) query.assignedTo = filters.assignedTo;
  if (filters.priority) query.priority = filters.priority;

  return this.find(query).sort({ priority: -1, slaDueAt: 1, createdAt: 1 }).limit(filters.limit || 100);
};

estateCaseSchema.statics.getSummary = function(filters = {}) {
  const match = {};
  if (filters.userId) match.userId = new mongoose.Types.ObjectId(filters.userId);

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        recoveredInINR: { $sum: '$totals.recoveredInINR' },
        feesInINR: { $sum: '$totals.feeInINR' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('EstateCase', estateCaseSchema);
