const mongoose = require('mongoose');

const {
  ASSET_CATEGORY,
  LIABILITY_CATEGORY,
  ALL_CATEGORIES,
  ASSET_STATUS,
  RECOVERED_ASSET_STATUSES,
  RECOVERABILITY,
  DISCOVERY_METHOD,
  maskValue,
  roundMoney
} = require('../constants/legacyConstants');

const estateAssetSchema = new mongoose.Schema({
  estateCaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EstateCase',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  kind: {
    type: String,
    enum: ['asset', 'liability'],
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ALL_CATEGORIES,
    required: true,
    index: true,
    validate: {
      validator: function(value) {
        return this.kind === 'asset' ? ASSET_CATEGORY.includes(value) : LIABILITY_CATEGORY.includes(value);
      },
      message: 'EstateAsset category must match kind'
    }
  },
  sourceModel: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  institution: {
    type: String,
    trim: true
  },
  identifierMasked: {
    type: String,
    trim: true
  },
  estimatedValue: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['USD', 'INR']
  },
  estimatedValueInINR: {
    type: Number,
    default: 0,
    min: 0,
    index: true
  },
  exchangeRate: {
    type: Number,
    default: 1,
    min: 0
  },
  recoveredValueInINR: {
    type: Number,
    default: 0,
    min: 0,
    index: true
  },
  status: {
    type: String,
    enum: ASSET_STATUS,
    default: 'discovered',
    index: true
  },
  recoverability: {
    type: String,
    enum: RECOVERABILITY,
    default: 'unknown',
    index: true
  },
  discoveryMethod: {
    type: String,
    enum: DISCOVERY_METHOD,
    default: 'auto_scan',
    index: true
  },
  counterparty: {
    name: { type: String, trim: true },
    relationship: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true }
  },
  notes: {
    type: String,
    trim: true
  },
  discoveredAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: {
    type: Date
  }
}, {
  timestamps: true
});

estateAssetSchema.index({ userId: 1, status: 1 });
estateAssetSchema.index({ estateCaseId: 1, kind: 1 });
estateAssetSchema.index({ estateCaseId: 1, status: 1 });
estateAssetSchema.index({ sourceModel: 1, sourceId: 1 });
estateAssetSchema.index({ sourceModel: 1, sourceId: 1, estateCaseId: 1 }, { unique: true });
estateAssetSchema.index({ estateCaseId: 1, category: 1, recoverability: 1 });

estateAssetSchema.virtual('isRecovered').get(function() {
  return RECOVERED_ASSET_STATUSES.includes(this.status);
});

estateAssetSchema.virtual('unrecoveredValueInINR').get(function() {
  return roundMoney(Math.max(0, (this.estimatedValueInINR || 0) - (this.recoveredValueInINR || 0)));
});

estateAssetSchema.virtual('recoveryPercentage').get(function() {
  if (!this.estimatedValueInINR) return 0;
  return roundMoney((this.recoveredValueInINR / this.estimatedValueInINR) * 100);
});

estateAssetSchema.set('toJSON', { virtuals: true });
estateAssetSchema.set('toObject', { virtuals: true });

estateAssetSchema.pre('save', function(next) {
  this.estimatedValue = roundMoney(this.estimatedValue);
  this.estimatedValueInINR = roundMoney(this.estimatedValueInINR || this.estimatedValue * this.exchangeRate);
  this.recoveredValueInINR = roundMoney(this.recoveredValueInINR);
  if (this.identifierMasked) this.identifierMasked = maskValue(this.identifierMasked);
  next();
});

estateAssetSchema.methods.verify = function(actorId, note) {
  this.status = 'verified';
  this.verifiedBy = actorId;
  this.verifiedAt = new Date();
  if (note) this.notes = this.notes ? `${this.notes}\n${note}` : note;
  return this.save();
};

estateAssetSchema.methods.recordRecovery = function(amountInINR, actorId, note) {
  this.recoveredValueInINR = roundMoney(amountInINR);
  this.status = this.recoveredValueInINR >= this.estimatedValueInINR ? 'recovered' : 'partially_recovered';
  this.verifiedBy = this.verifiedBy || actorId;
  if (note) this.notes = this.notes ? `${this.notes}\n${note}` : note;
  return this.save();
};

estateAssetSchema.methods.markUnrecoverable = function(actorId, note) {
  this.status = 'unrecoverable';
  this.verifiedBy = this.verifiedBy || actorId;
  if (note) this.notes = this.notes ? `${this.notes}\n${note}` : note;
  return this.save();
};

estateAssetSchema.statics.upsertDiscovery = function(payload) {
  return this.findOneAndUpdate({
    sourceModel: payload.sourceModel,
    sourceId: payload.sourceId,
    estateCaseId: payload.estateCaseId
  }, {
    $set: payload,
    $setOnInsert: { discoveredAt: new Date() }
  }, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
    runValidators: true
  });
};

estateAssetSchema.statics.getByCase = function(estateCaseId, filters = {}) {
  const query = { estateCaseId };
  if (filters.kind) query.kind = filters.kind;
  if (filters.status) query.status = filters.status;
  if (filters.category) query.category = filters.category;
  return this.find(query).sort({ kind: 1, estimatedValueInINR: -1 });
};

estateAssetSchema.statics.getRecoverySummary = function(estateCaseId) {
  return this.aggregate([
    { $match: { estateCaseId: new mongoose.Types.ObjectId(estateCaseId) } },
    {
      $group: {
        _id: { kind: '$kind', status: '$status' },
        count: { $sum: 1 },
        estimatedValueInINR: { $sum: '$estimatedValueInINR' },
        recoveredValueInINR: { $sum: '$recoveredValueInINR' }
      }
    },
    { $sort: { '_id.kind': 1, recoveredValueInINR: -1 } }
  ]);
};

module.exports = mongoose.model('EstateAsset', estateAssetSchema);
