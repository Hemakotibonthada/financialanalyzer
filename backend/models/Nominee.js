const mongoose = require('mongoose');

const {
  NOMINEE_STATUS,
  RELATIONSHIP,
  ID_PROOF_TYPE,
  LIKELY_CLASS_I_HEIRS,
  maskValue,
  roundMoney
} = require('../constants/legacyConstants');

const nomineeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  relationship: {
    type: String,
    enum: RELATIONSHIP,
    required: true,
    index: true
  },
  sharePercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  isPrimary: {
    type: Boolean,
    default: false,
    index: true
  },
  dateOfBirth: {
    type: Date
  },
  guardian: {
    name: {
      type: String,
      trim: true
    },
    relationship: {
      type: String,
      enum: RELATIONSHIP
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    }
  },
  contact: {
    phone: {
      type: String,
      trim: true
    },
    alternatePhone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    address: {
      line1: { type: String, trim: true },
      line2: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
      country: { type: String, trim: true, default: 'India' }
    }
  },
  identification: {
    type: {
      type: String,
      enum: ID_PROOF_TYPE
    },
    numberEncrypted: {
      type: String,
      select: false
    },
    maskedNumber: {
      type: String,
      trim: true
    }
  },
  status: {
    type: String,
    enum: NOMINEE_STATUS,
    default: 'pending_verification',
    index: true
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: {
    type: Date
  },
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EstateDocument'
  }],
  canInitiateClaim: {
    type: Boolean,
    default: false
  },
  isLegalHeir: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

nomineeSchema.index({ userId: 1, status: 1 });
nomineeSchema.index({ userId: 1, isActive: 1, sharePercentage: -1 });
nomineeSchema.index({ userId: 1, isPrimary: 1 });
nomineeSchema.index({ userId: 1, relationship: 1 });

nomineeSchema.virtual('isMinor').get(function() {
  if (!this.dateOfBirth) return false;
  const today = new Date();
  const dob = new Date(this.dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age < 18;
});

nomineeSchema.virtual('requiresGuardian').get(function() {
  return this.isMinor;
});

nomineeSchema.virtual('isLikelyClassIHeir').get(function() {
  return LIKELY_CLASS_I_HEIRS.includes(this.relationship);
});

nomineeSchema.virtual('displayContact').get(function() {
  return {
    phone: maskValue(this.contact && this.contact.phone),
    email: maskValue(this.contact && this.contact.email),
    identification: this.identification && this.identification.maskedNumber
  };
});

nomineeSchema.set('toJSON', { virtuals: true });
nomineeSchema.set('toObject', { virtuals: true });

nomineeSchema.pre('save', function(next) {
  this.sharePercentage = roundMoney(this.sharePercentage);
  if (this.identification && this.identification.numberEncrypted && !this.identification.maskedNumber) {
    this.identification.maskedNumber = maskValue(this.identification.numberEncrypted);
  }
  if (this.status === 'verified' && !this.verifiedAt) {
    this.verifiedAt = new Date();
  }
  next();
});

nomineeSchema.methods.verify = function(actorId) {
  this.status = 'verified';
  this.verifiedBy = actorId;
  this.verifiedAt = new Date();
  this.canInitiateClaim = true;
  return this.save();
};

nomineeSchema.methods.deactivate = function(note) {
  this.isActive = false;
  this.status = 'inactive';
  if (note) this.notes = note;
  return this.save();
};

nomineeSchema.methods.updateIdentification = function(type, encryptedValue, rawValueForMasking) {
  this.identification = {
    type,
    numberEncrypted: encryptedValue,
    maskedNumber: maskValue(rawValueForMasking || encryptedValue)
  };
  return this;
};

nomineeSchema.statics.getActiveForUser = function(userId) {
  return this.find({
    userId,
    isActive: true,
    status: { $nin: ['inactive', 'superseded', 'rejected'] }
  }).sort({ isPrimary: -1, sharePercentage: -1, fullName: 1 });
};

nomineeSchema.statics.validateShares = async function(userId) {
  const nominees = await this.getActiveForUser(userId).lean();
  const total = roundMoney(nominees.reduce((sum, nominee) => sum + Number(nominee.sharePercentage || 0), 0));

  return {
    valid: total === 100,
    total,
    nominees
  };
};

nomineeSchema.statics.getPrimary = function(userId) {
  return this.findOne({
    userId,
    isActive: true,
    isPrimary: true,
    status: { $nin: ['inactive', 'superseded', 'rejected'] }
  }).sort({ sharePercentage: -1, updatedAt: -1 });
};

nomineeSchema.statics.getLegalHeirs = function(userId) {
  return this.find({ userId, isActive: true, isLegalHeir: true }).sort({ fullName: 1 });
};

module.exports = mongoose.model('Nominee', nomineeSchema);
