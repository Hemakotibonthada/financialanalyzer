const mongoose = require('mongoose');

const insurancePolicySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  provider: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['health', 'life', 'auto', 'home', 'property', 'disability', 'travel', 'other'],
    default: 'health'
  },
  policyNumber: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  premium: {
    type: Number,
    required: true,
    min: 0
  },
  frequency: {
    type: String,
    enum: ['monthly', 'quarterly', 'semi-annually', 'annually'],
    default: 'monthly'
  },
  coverageAmount: {
    type: Number,
    required: true,
    min: 0
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  beneficiaries: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

insurancePolicySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('InsurancePolicy', insurancePolicySchema);
