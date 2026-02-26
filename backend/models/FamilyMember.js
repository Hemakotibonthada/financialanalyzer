const mongoose = require('mongoose');
const { Schema } = mongoose;

const familyMemberSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Family member name is required'],
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  avatar: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['admin', 'member', 'viewer'],
    default: 'member'
  },
  relationship: {
    type: String,
    enum: ['spouse', 'child', 'parent', 'sibling', 'other'],
    required: [true, 'Relationship is required']
  },
  allowance: {
    amount: { type: Number, default: 0, min: 0 },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'],
      default: 'monthly'
    },
    lastPaidAt: { type: Date, default: null }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  permissions: {
    canViewTransactions: { type: Boolean, default: true },
    canAddTransactions: { type: Boolean, default: false },
    canViewBudgets: { type: Boolean, default: true },
    canEditBudgets: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: true }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

familyMemberSchema.index({ userId: 1, isActive: 1 });
familyMemberSchema.index({ userId: 1, relationship: 1 });
familyMemberSchema.index({ email: 1 });

familyMemberSchema.statics.findActiveByUser = function (userId) {
  return this.find({ userId, isActive: true }).sort({ name: 1 });
};

familyMemberSchema.statics.findByRelationship = function (userId, relationship) {
  return this.find({ userId, relationship, isActive: true });
};

const FamilyMember = mongoose.model('FamilyMember', familyMemberSchema);

module.exports = FamilyMember;
