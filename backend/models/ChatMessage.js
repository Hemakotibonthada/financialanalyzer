const mongoose = require('mongoose');
const { Schema } = mongoose;

const chatMessageSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: [true, 'Message role is required']
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    maxlength: 10000
  },
  metadata: {
    charts: { type: Schema.Types.Mixed, default: null },
    actions: { type: [Schema.Types.Mixed], default: [] },
    tokens: { type: Number, default: 0 },
    model: { type: String, default: null }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

chatMessageSchema.index({ userId: 1, conversationId: 1 });
chatMessageSchema.index({ conversationId: 1, createdAt: 1 });
chatMessageSchema.index({ userId: 1, createdAt: -1 });

chatMessageSchema.statics.findByConversation = function (conversationId) {
  return this.find({ conversationId }).sort({ createdAt: 1 });
};

chatMessageSchema.statics.getConversations = function (userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $sort: { createdAt: -1 } },
    { $group: {
      _id: '$conversationId',
      lastMessage: { $first: '$content' },
      lastRole: { $first: '$role' },
      lastAt: { $first: '$createdAt' },
      messageCount: { $sum: 1 }
    }},
    { $sort: { lastAt: -1 } }
  ]);
};

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = ChatMessage;
