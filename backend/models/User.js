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
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'lender', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
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
  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
