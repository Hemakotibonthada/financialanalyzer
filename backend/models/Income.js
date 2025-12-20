const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  source: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['salary', 'business', 'freelance', 'investment', 'rental', 'other'],
    default: 'salary'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  frequency: {
    type: String,
    enum: ['weekly', 'biweekly', 'monthly', 'quarterly', 'annually'],
    default: 'monthly'
  },
  startDate: {
    type: Date
  },
  taxable: {
    type: Boolean,
    default: true
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

incomeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Income', incomeSchema);
