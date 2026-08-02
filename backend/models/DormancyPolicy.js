const mongoose = require('mongoose');

const {
  DORMANCY_STAGE,
  OUTREACH_CHANNEL,
  APPROVER_ROLES,
  DEFAULT_THRESHOLDS,
  DEFAULT_OUTREACH,
  DEFAULT_FEE_PERCENTAGE,
  DEFAULT_GST_PERCENTAGE,
  roundMoney
} = require('../constants/legacyConstants');

const dormancyPolicySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  version: {
    type: Number,
    required: true,
    min: 1
  },
  isActive: {
    type: Boolean,
    default: false,
    index: true
  },
  thresholds: {
    watchDays: {
      type: Number,
      default: DEFAULT_THRESHOLDS.watchDays,
      min: 0
    },
    dormantDays: {
      type: Number,
      default: DEFAULT_THRESHOLDS.dormantDays,
      min: 0
    },
    unreachableDays: {
      type: Number,
      default: DEFAULT_THRESHOLDS.unreachableDays,
      min: 0
    },
    welfareCheckDays: {
      type: Number,
      default: DEFAULT_THRESHOLDS.welfareCheckDays,
      min: 0
    }
  },
  outreach: {
    maxAttemptsPerChannel: {
      type: Number,
      default: DEFAULT_OUTREACH.maxAttemptsPerChannel,
      min: 1
    },
    cooldownHours: {
      type: Number,
      default: DEFAULT_OUTREACH.cooldownHours,
      min: 0
    },
    requiredChannelsBeforeEscalation: {
      type: [{
        type: String,
        enum: OUTREACH_CHANNEL
      }],
      default: DEFAULT_OUTREACH.requiredChannelsBeforeEscalation
    }
  },
  escalation: {
    autoEscalateAfterDays: {
      type: Number,
      default: 30,
      min: 0
    },
    requireDualApproval: {
      type: Boolean,
      default: true
    },
    minApproverRole: {
      type: String,
      enum: APPROVER_ROLES,
      default: 'estate_officer'
    }
  },
  fee: {
    percentage: {
      type: Number,
      default: DEFAULT_FEE_PERCENTAGE,
      min: 0
    },
    minFeeInINR: {
      type: Number,
      default: 0,
      min: 0
    },
    maxFeeInINR: {
      type: Number,
      default: null,
      min: 0
    },
    gstPercentage: {
      type: Number,
      default: DEFAULT_GST_PERCENTAGE,
      min: 0
    },
    chargeOn: {
      type: String,
      enum: ['recovered_only'],
      default: 'recovered_only'
    }
  },
  freezeOnStage: {
    type: String,
    enum: DORMANCY_STAGE,
    default: 'unreachable'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  changeReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

dormancyPolicySchema.index({ isActive: 1, version: -1 });
dormancyPolicySchema.index({ version: 1 }, { unique: true });
dormancyPolicySchema.index({ createdBy: 1, createdAt: -1 });

dormancyPolicySchema.virtual('isFeeCapped').get(function() {
  return this.fee && (this.fee.minFeeInINR > 0 || this.fee.maxFeeInINR !== null);
});

dormancyPolicySchema.virtual('orderedThresholds').get(function() {
  return [
    this.thresholds.watchDays,
    this.thresholds.dormantDays,
    this.thresholds.unreachableDays,
    this.thresholds.welfareCheckDays
  ];
});

dormancyPolicySchema.set('toJSON', { virtuals: true });
dormancyPolicySchema.set('toObject', { virtuals: true });

dormancyPolicySchema.pre('validate', function(next) {
  const ordered = this.orderedThresholds;
  const isAscending = ordered.every((value, index) => index === 0 || value >= ordered[index - 1]);
  if (!isAscending) {
    next(new Error('Dormancy thresholds must be ordered from watch through welfare check'));
    return;
  }
  next();
});

dormancyPolicySchema.pre('save', function(next) {
  if (this.fee) {
    this.fee.percentage = roundMoney(this.fee.percentage);
    this.fee.minFeeInINR = roundMoney(this.fee.minFeeInINR);
    if (this.fee.maxFeeInINR !== null && this.fee.maxFeeInINR !== undefined) {
      this.fee.maxFeeInINR = roundMoney(this.fee.maxFeeInINR);
    }
    this.fee.gstPercentage = roundMoney(this.fee.gstPercentage);
  }
  next();
});

dormancyPolicySchema.statics.getActive = async function() {
  let policy = await this.findOne({ isActive: true }).sort({ version: -1 });
  if (policy) return policy;

  policy = await this.findOne().sort({ version: -1 });
  return policy;
};

dormancyPolicySchema.statics.activateVersion = async function(id, userId, reason) {
  const session = await mongoose.startSession();
  let activated;

  await session.withTransaction(async () => {
    await this.updateMany({ isActive: true }, { $set: { isActive: false } }, { session });
    activated = await this.findByIdAndUpdate(id, {
      $set: {
        isActive: true,
        createdBy: userId,
        changeReason: reason
      }
    }, { new: true, runValidators: true, session });
    if (!activated) throw new Error('Dormancy policy not found');
  });

  await session.endSession();
  return activated;
};

dormancyPolicySchema.statics.listVersions = function(limit = 25) {
  return this.find().sort({ version: -1 }).limit(limit);
};

dormancyPolicySchema.methods.estimateFee = function(recoveredAmountInINR) {
  const basisAmountInINR = roundMoney(recoveredAmountInINR);
  let grossFeeInINR = roundMoney(basisAmountInINR * (this.fee.percentage / 100));
  let minFeeApplied = false;
  let maxFeeApplied = false;

  if (this.fee.minFeeInINR > 0 && basisAmountInINR > 0 && grossFeeInINR < this.fee.minFeeInINR) {
    grossFeeInINR = roundMoney(this.fee.minFeeInINR);
    minFeeApplied = true;
  }

  if (this.fee.maxFeeInINR !== null && this.fee.maxFeeInINR !== undefined && grossFeeInINR > this.fee.maxFeeInINR) {
    grossFeeInINR = roundMoney(this.fee.maxFeeInINR);
    maxFeeApplied = true;
  }

  const gstAmountInINR = roundMoney(grossFeeInINR * (this.fee.gstPercentage / 100));

  return {
    basisAmountInINR,
    grossFeeInINR,
    gstAmountInINR,
    totalPayableInINR: roundMoney(grossFeeInINR + gstAmountInINR),
    minFeeApplied,
    maxFeeApplied
  };
};

module.exports = mongoose.model('DormancyPolicy', dormancyPolicySchema);
