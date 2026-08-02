const mongoose = require('mongoose');

const {
  FEE_STATUS,
  RECOVERED_ASSET_STATUSES,
  CASE_NUMBER_PREFIX,
  DEFAULT_FEE_PERCENTAGE,
  DEFAULT_GST_PERCENTAGE,
  formatCaseNumber,
  roundMoney
} = require('../constants/legacyConstants');

const settlementFeeSchema = new mongoose.Schema({
  estateCaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EstateCase',
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  invoiceNumber: {
    type: String,
    unique: true,
    index: true
  },
  feePercentage: {
    type: Number,
    default: DEFAULT_FEE_PERCENTAGE,
    min: 0
  },
  basisAmountInINR: { type: Number, default: 0, min: 0 },
  grossFeeInINR: { type: Number, default: 0, min: 0 },
  gstPercentage: { type: Number, default: DEFAULT_GST_PERCENTAGE, min: 0 },
  gstAmountInINR: { type: Number, default: 0, min: 0 },
  totalPayableInINR: { type: Number, default: 0, min: 0 },
  minFeeApplied: { type: Boolean, default: false },
  maxFeeApplied: { type: Boolean, default: false },
  status: {
    type: String,
    enum: FEE_STATUS,
    default: 'pending',
    index: true
  },
  lineItems: [{
    estateAssetId: { type: mongoose.Schema.Types.ObjectId, ref: 'EstateAsset' },
    description: { type: String, trim: true },
    recoveredInINR: { type: Number, default: 0, min: 0 },
    feeInINR: { type: Number, default: 0, min: 0 }
  }],
  payments: [{
    amountInINR: { type: Number, required: true, min: 0 },
    method: { type: String, trim: true },
    reference: { type: String, trim: true },
    receivedAt: { type: Date, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  amountPaidInINR: { type: Number, default: 0, min: 0 },
  balanceInINR: { type: Number, default: 0, min: 0 },
  waiver: {
    waived: { type: Boolean, default: false },
    reason: { type: String, trim: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date }
  },
  issuedAt: { type: Date },
  dueAt: { type: Date, index: true },
  paidAt: { type: Date }
}, {
  timestamps: true
});

settlementFeeSchema.index({ userId: 1, status: 1 });
settlementFeeSchema.index({ estateCaseId: 1, status: 1 });
settlementFeeSchema.index({ status: 1, dueAt: 1 });
settlementFeeSchema.index({ issuedAt: -1 });

settlementFeeSchema.virtual('isPaid').get(function() {
  return this.status === 'paid' || this.balanceInINR <= 0;
});

settlementFeeSchema.virtual('isOverdue').get(function() {
  return Boolean(this.dueAt && !this.isPaid && new Date() > this.dueAt);
});

settlementFeeSchema.virtual('effectiveFeePercentage').get(function() {
  if (!this.basisAmountInINR) return 0;
  return roundMoney((this.grossFeeInINR / this.basisAmountInINR) * 100);
});

settlementFeeSchema.set('toJSON', { virtuals: true });
settlementFeeSchema.set('toObject', { virtuals: true });

settlementFeeSchema.pre('validate', async function(next) {
  try {
    if (!this.invoiceNumber) {
      this.invoiceNumber = await this.constructor.generateCaseNumber();
    }
    next();
  } catch (error) {
    next(error);
  }
});

settlementFeeSchema.pre('save', function(next) {
  this.feePercentage = roundMoney(this.feePercentage);
  this.basisAmountInINR = roundMoney(this.basisAmountInINR);
  this.grossFeeInINR = roundMoney(this.grossFeeInINR);
  this.gstPercentage = roundMoney(this.gstPercentage);
  this.gstAmountInINR = roundMoney(this.gstAmountInINR);
  this.totalPayableInINR = roundMoney(this.totalPayableInINR);
  this.amountPaidInINR = roundMoney((this.payments || []).reduce((sum, payment) => sum + Number(payment.amountInINR || 0), 0));
  this.balanceInINR = this.waiver && this.waiver.waived ? 0 : roundMoney(Math.max(0, this.totalPayableInINR - this.amountPaidInINR));

  if (this.balanceInINR <= 0 && this.totalPayableInINR > 0 && !this.waiver.waived) {
    this.status = 'paid';
    this.paidAt = this.paidAt || new Date();
  } else if (this.amountPaidInINR > 0 && this.balanceInINR > 0) {
    this.status = 'partially_paid';
  }
  next();
});

settlementFeeSchema.methods.recompute = async function() {
  const computed = await this.constructor.computeFor(this.estateCaseId);
  Object.assign(this, computed, {
    userId: this.userId || computed.userId,
    invoiceNumber: this.invoiceNumber
  });
  return this.save();
};

settlementFeeSchema.methods.recordPayment = function(payment) {
  this.payments.push({
    amountInINR: roundMoney(payment.amountInINR),
    method: payment.method,
    reference: payment.reference,
    receivedAt: payment.receivedAt || new Date(),
    recordedBy: payment.recordedBy
  });
  return this.save();
};

settlementFeeSchema.methods.waive = function(actorId, reason) {
  if (!reason) throw new Error('Waiver reason is required');
  this.waiver = {
    waived: true,
    reason,
    approvedBy: actorId,
    approvedAt: new Date()
  };
  this.status = 'waived';
  this.balanceInINR = 0;
  return this.save();
};

settlementFeeSchema.statics.generateCaseNumber = async function(when = new Date(), attempt = 0) {
  if (attempt >= 5) throw new Error('Unable to generate unique invoice number after 5 attempts');

  const start = new Date(when.getFullYear(), when.getMonth(), 1);
  const end = new Date(when.getFullYear(), when.getMonth() + 1, 1);
  const existing = await this.countDocuments({ createdAt: { $gte: start, $lt: end } });
  const candidate = formatCaseNumber(CASE_NUMBER_PREFIX.invoice, existing + attempt + 1, when);
  const collision = await this.exists({ invoiceNumber: candidate });

  if (collision) return this.generateCaseNumber(when, attempt + 1);
  return candidate;
};

settlementFeeSchema.statics.computeFor = async function(estateCaseId) {
  const EstateAsset = mongoose.model('EstateAsset');
  const DormancyPolicy = mongoose.model('DormancyPolicy');
  const assets = await EstateAsset.find({
    estateCaseId,
    status: { $in: RECOVERED_ASSET_STATUSES }
  }).lean();

  const policy = await DormancyPolicy.getActive();
  const feeConfig = policy && policy.fee ? policy.fee : {
    percentage: DEFAULT_FEE_PERCENTAGE,
    minFeeInINR: 0,
    maxFeeInINR: null,
    gstPercentage: DEFAULT_GST_PERCENTAGE
  };

  const lineItems = assets.map(asset => {
    const recoveredInINR = roundMoney(asset.recoveredValueInINR || 0);
    return {
      estateAssetId: asset._id,
      description: asset.title,
      recoveredInINR,
      feeInINR: roundMoney(recoveredInINR * (feeConfig.percentage / 100))
    };
  });

  const basisAmountInINR = roundMoney(lineItems.reduce((sum, item) => sum + item.recoveredInINR, 0));
  let grossFeeInINR = roundMoney(basisAmountInINR * (feeConfig.percentage / 100));
  let minFeeApplied = false;
  let maxFeeApplied = false;

  if (basisAmountInINR > 0 && feeConfig.minFeeInINR > 0 && grossFeeInINR < feeConfig.minFeeInINR) {
    grossFeeInINR = roundMoney(feeConfig.minFeeInINR);
    minFeeApplied = true;
  }

  if (feeConfig.maxFeeInINR !== null && feeConfig.maxFeeInINR !== undefined && grossFeeInINR > feeConfig.maxFeeInINR) {
    grossFeeInINR = roundMoney(feeConfig.maxFeeInINR);
    maxFeeApplied = true;
  }

  const gstPercentage = roundMoney(feeConfig.gstPercentage);
  const gstAmountInINR = roundMoney(grossFeeInINR * (gstPercentage / 100));
  const totalPayableInINR = roundMoney(grossFeeInINR + gstAmountInINR);

  return {
    estateCaseId,
    userId: assets[0] && assets[0].userId,
    feePercentage: roundMoney(feeConfig.percentage),
    basisAmountInINR,
    grossFeeInINR,
    gstPercentage,
    gstAmountInINR,
    totalPayableInINR,
    minFeeApplied,
    maxFeeApplied,
    lineItems,
    amountPaidInINR: 0,
    balanceInINR: totalPayableInINR
  };
};

settlementFeeSchema.statics.getAgingSummary = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalPayableInINR: { $sum: '$totalPayableInINR' },
        balanceInINR: { $sum: '$balanceInINR' }
      }
    },
    { $sort: { balanceInINR: -1 } }
  ]);
};

module.exports = mongoose.model('SettlementFee', settlementFeeSchema);
