const mongoose = require('mongoose');

/**
 * Group Model
 * Represents a group for expense splitting among members
 */
const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  totalExpenses: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'settled', 'archived'],
    default: 'active'
  },
  avatar: {
    type: String,
    default: '👥'
  },
  category: {
    type: String,
    enum: ['trip', 'household', 'office', 'event', 'friends', 'family', 'other'],
    default: 'other'
  }
}, {
  timestamps: true
});

// Indexes
groupSchema.index({ createdBy: 1 });
groupSchema.index({ 'members.userId': 1 });
groupSchema.index({ status: 1 });
groupSchema.index({ createdBy: 1, status: 1 });

// Virtual for member count
groupSchema.virtual('memberCount').get(function () {
  return this.members.filter(m => m.isActive).length;
});

// Ensure virtuals are included in JSON
groupSchema.set('toJSON', { virtuals: true });
groupSchema.set('toObject', { virtuals: true });

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;
