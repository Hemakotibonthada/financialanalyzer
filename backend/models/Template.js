const mongoose = require('mongoose');
const { Schema } = mongoose;

const templateSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    maxlength: 150
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  category: {
    type: String,
    enum: ['budget', 'goal', 'savings', 'investment'],
    required: [true, 'Template category is required'],
    index: true
  },
  type: {
    type: String,
    enum: ['system', 'user'],
    default: 'user'
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  config: {
    type: Schema.Types.Mixed,
    required: [true, 'Template configuration is required'],
    default: {}
  },
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0, min: 0 }
  },
  usageCount: {
    type: Number,
    default: 0,
    min: 0
  },
  tags: {
    type: [String],
    default: [],
    set: (tags) => tags.map(t => t.toLowerCase().trim())
  },
  isPublic: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

templateSchema.index({ category: 1, type: 1 });
templateSchema.index({ tags: 1 });
templateSchema.index({ isPublic: 1, 'rating.average': -1 });
templateSchema.index({ createdBy: 1 });

templateSchema.statics.findPublicByCategory = function (category) {
  return this.find({ category, isPublic: true }).sort({ 'rating.average': -1 });
};

templateSchema.statics.findByUser = function (userId) {
  return this.find({ createdBy: userId, type: 'user' }).sort({ updatedAt: -1 });
};

const Template = mongoose.model('Template', templateSchema);

module.exports = Template;
