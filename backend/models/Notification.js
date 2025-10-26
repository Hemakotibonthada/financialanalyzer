const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'info',
      'success',
      'warning',
      'error',
      'bill_reminder',
      'emi_reminder',
      'budget_alert',
      'transaction_alert',
      'document_processed',
      'analysis_complete',
      'cibil_update',
      'gmail_sync',
      'security_alert',
      'system_notification'
    ],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: 'notification'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  category: {
    type: String,
    enum: ['finance', 'system', 'security', 'reminder', 'alert', 'update'],
    default: 'system'
  },
  // Notification metadata
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Link to related resources
  relatedResource: {
    resourceType: {
      type: String,
      enum: ['transaction', 'document', 'emi', 'bill', 'budget', 'analysis', 'cibil', 'user']
    },
    resourceId: mongoose.Schema.Types.ObjectId
  },
  // Action buttons
  actions: [{
    label: String,
    action: String,
    url: String,
    primary: {
      type: Boolean,
      default: false
    }
  }],
  // Status
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  archivedAt: {
    type: Date
  },
  // Delivery
  channels: [{
    type: String,
    enum: ['in_app', 'email', 'push', 'sms']
  }],
  deliveryStatus: {
    in_app: {
      delivered: { type: Boolean, default: true },
      deliveredAt: { type: Date, default: Date.now }
    },
    email: {
      delivered: { type: Boolean, default: false },
      deliveredAt: Date,
      error: String
    },
    push: {
      delivered: { type: Boolean, default: false },
      deliveredAt: Date,
      error: String
    }
  },
  // Scheduling
  scheduledFor: {
    type: Date
  },
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, priority: 1, isRead: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Static method to create notification
notificationSchema.statics.createNotification = async function(userId, notificationData) {
  try {
    const notification = new this({
      userId,
      ...notificationData,
      channels: notificationData.channels || ['in_app']
    });
    
    await notification.save();
    
    // Emit real-time notification via WebSocket if available
    const websocketService = require('../services/websocketService');
    websocketService.sendToUser(userId.toString(), 'notification:new', {
      notification: notification.toObject()
    });
    
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    userId,
    isRead: false,
    isArchived: false
  });
};

// Static method to mark as read
notificationSchema.statics.markAsRead = async function(userId, notificationIds) {
  const result = await this.updateMany(
    {
      _id: { $in: notificationIds },
      userId
    },
    {
      $set: {
        isRead: true,
        readAt: new Date()
      }
    }
  );
  
  return result;
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = async function(userId) {
  const result = await this.updateMany(
    {
      userId,
      isRead: false
    },
    {
      $set: {
        isRead: true,
        readAt: new Date()
      }
    }
  );
  
  return result;
};

// Static method to archive notifications
notificationSchema.statics.archiveNotifications = async function(userId, notificationIds) {
  const result = await this.updateMany(
    {
      _id: { $in: notificationIds },
      userId
    },
    {
      $set: {
        isArchived: true,
        archivedAt: new Date()
      }
    }
  );
  
  return result;
};

// Static method to delete old notifications
notificationSchema.statics.cleanupOldNotifications = async function(daysOld = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate },
    isArchived: true
  });
  
  return result;
};

// Static method to get notification statistics
notificationSchema.statics.getStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unread: {
          $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
        },
        archived: {
          $sum: { $cond: [{ $eq: ['$isArchived', true] }, 1, 0] }
        },
        byType: {
          $push: '$type'
        },
        byPriority: {
          $push: '$priority'
        }
      }
    }
  ]);
  
  if (stats.length === 0) {
    return {
      total: 0,
      unread: 0,
      archived: 0,
      byType: {},
      byPriority: {}
    };
  }
  
  const result = stats[0];
  
  // Count by type
  result.byType = result.byType.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  
  // Count by priority
  result.byPriority = result.byPriority.reduce((acc, priority) => {
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {});
  
  return result;
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = async function() {
  this.isRead = true;
  this.readAt = new Date();
  await this.save();
  return this;
};

// Instance method to archive
notificationSchema.methods.archive = async function() {
  this.isArchived = true;
  this.archivedAt = new Date();
  await this.save();
  return this;
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
