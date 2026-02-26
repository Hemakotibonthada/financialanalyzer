const mongoose = require('mongoose');

/**
 * Receipt Model
 * Represents a scanned/processed receipt
 */
const receiptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  imageUrl: {
    type: String,
    trim: true
  },
  vendor: {
    type: String,
    trim: true,
    maxlength: 200
  },
  amount: {
    type: Number,
    min: 0
  },
  date: {
    type: Date
  },
  items: [{
    name: {
      type: String,
      trim: true
    },
    quantity: {
      type: Number,
      default: 1,
      min: 0
    },
    price: {
      type: Number,
      min: 0
    }
  }],
  category: {
    type: String,
    enum: ['groceries', 'dining', 'fuel', 'medical', 'electronics', 'clothing', 'utilities', 'entertainment', 'travel', 'other'],
    default: 'other'
  },
  raw_text: {
    type: String
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
receiptSchema.index({ userId: 1, date: -1 });
receiptSchema.index({ status: 1 });
receiptSchema.index({ vendor: 1 });

const Receipt = mongoose.model('Receipt', receiptSchema);

module.exports = Receipt;
