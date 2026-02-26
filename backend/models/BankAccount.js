const mongoose = require('mongoose');

/**
 * BankAccount Model
 * Represents a user's bank account for multi-account tracking
 */
const bankAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  bankName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  accountNumber: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20 // Stored as masked, e.g., XXXX1234
  },
  accountType: {
    type: String,
    enum: ['savings', 'current', 'FD', 'RD', 'salary', 'NRE', 'NRO'],
    required: true,
    default: 'savings'
  },
  balance: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true,
    trim: true
  },
  color: {
    type: String,
    default: '#4F46E5',
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastSyncedAt: {
    type: Date
  },
  metadata: {
    ifscCode: {
      type: String,
      trim: true,
      uppercase: true
    },
    branchName: {
      type: String,
      trim: true
    },
    accountHolderName: {
      type: String,
      trim: true
    },
    openingDate: {
      type: Date
    },
    interestRate: {
      type: Number,
      min: 0
    },
    maturityDate: {
      type: Date
    },
    nomineeName: {
      type: String,
      trim: true
    }
  },
  balanceHistory: [{
    balance: Number,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Indexes
bankAccountSchema.index({ userId: 1, isActive: 1 });
bankAccountSchema.index({ userId: 1, accountType: 1 });
bankAccountSchema.index({ userId: 1, bankName: 1 });
bankAccountSchema.index({ userId: 1, accountNumber: 1 }, { unique: true });

// Mask account number before saving
bankAccountSchema.pre('save', function (next) {
  if (this.isModified('accountNumber') && this.accountNumber.length > 4) {
    const last4 = this.accountNumber.slice(-4);
    this.accountNumber = 'XXXX' + last4;
  }
  next();
});

// Virtual for display name
bankAccountSchema.virtual('displayName').get(function () {
  return `${this.bankName} - ${this.accountType} (${this.accountNumber})`;
});

bankAccountSchema.set('toJSON', { virtuals: true });
bankAccountSchema.set('toObject', { virtuals: true });

const BankAccount = mongoose.model('BankAccount', bankAccountSchema);

module.exports = BankAccount;
