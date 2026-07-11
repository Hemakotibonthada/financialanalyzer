const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const encryptionService = require('../services/encryptionService');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'lender', 'admin'],
    default: 'user'
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'pro', 'premium'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'trialing', 'past_due', 'canceled', 'inactive'],
      default: 'active'
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly', 'none'],
      default: 'none'
    },
    provider: {
      type: String,
      enum: ['razorpay', 'stripe', 'manual', 'none'],
      default: 'none'
    },
    customerId: { type: String },
    subscriptionId: { type: String },
    currentPeriodEnd: { type: Date },
    trialEndsAt: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    updatedAt: { type: Date }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Account lockout after failed attempts
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  lastLogin: {
    type: Date
  },
  profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FinancialProfile'
  },
  twoFactorAuth: {
    enabled: {
      type: Boolean,
      default: false
    },
    secret: {
      type: String,
      select: false
    },
    backupCodes: [{
      code: String,
      used: {
        type: Boolean,
        default: false
      }
    }],
    verified: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient querying (email already has unique index from schema)
userSchema.index({ isActive: 1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ createdAt: -1 });

// Encrypt 2FA secret before saving
userSchema.pre('save', function(next) {
  try {
    if (this.isModified('twoFactorAuth.secret') && this.twoFactorAuth.secret && !encryptionService.isEncrypted(this.twoFactorAuth.secret)) {
      this.twoFactorAuth.secret = encryptionService.encrypt(this.twoFactorAuth.secret);
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Decrypt 2FA secret after finding
userSchema.post('find', function(docs) {
  docs.forEach(doc => {
    if (doc.twoFactorAuth?.secret && encryptionService.isEncrypted(doc.twoFactorAuth.secret)) {
      try {
        doc.twoFactorAuth.secret = encryptionService.decrypt(doc.twoFactorAuth.secret);
      } catch (error) {
        console.error('Error decrypting 2FA secret:', error);
      }
    }
  });
});

userSchema.post('findOne', function(doc) {
  if (doc?.twoFactorAuth?.secret && encryptionService.isEncrypted(doc.twoFactorAuth.secret)) {
    try {
      doc.twoFactorAuth.secret = encryptionService.decrypt(doc.twoFactorAuth.secret);
    } catch (error) {
      console.error('Error decrypting 2FA secret:', error);
    }
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  // Remove 2FA backup codes from API responses
  if (obj.twoFactorAuth) {
    delete obj.twoFactorAuth.backupCodes;
    delete obj.twoFactorAuth.secret;
  }
  return obj;
};

// Account lockout methods
userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.methods.incrementFailedAttempts = async function() {
  const MAX_ATTEMPTS = 5;
  const LOCK_TIME = 30 * 60 * 1000; // 30 minutes
  
  // If previous lock has expired, reset attempts
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { failedLoginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { failedLoginAttempts: 1 } };
  
  if (this.failedLoginAttempts + 1 >= MAX_ATTEMPTS) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }
  
  return this.updateOne(updates);
};

userSchema.methods.resetFailedAttempts = function() {
  return this.updateOne({
    $set: { failedLoginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
