// ============================================================================
// Smart Notification Service — Enterprise notification management
// ============================================================================
// Handles: real-time notifications, notification preferences, priority routing,
// batching, and AI-powered notification insights.
// ============================================================================

const logger = require('../utils/logger');
const Notification = require('../models/Notification');

// ─── Notification Types & Config ────────────────────────────────────
const NOTIFICATION_TYPES = {
  // Financial Events
  TRANSACTION_LARGE:    { category: 'financial', priority: 'high',   icon: '💰', defaultEnabled: true },
  TRANSACTION_UNUSUAL:  { category: 'financial', priority: 'high',   icon: '⚠️', defaultEnabled: true },
  BUDGET_THRESHOLD:     { category: 'financial', priority: 'medium', icon: '📊', defaultEnabled: true },
  BUDGET_EXCEEDED:      { category: 'financial', priority: 'high',   icon: '🚨', defaultEnabled: true },
  GOAL_MILESTONE:       { category: 'financial', priority: 'medium', icon: '🎯', defaultEnabled: true },
  GOAL_ACHIEVED:        { category: 'financial', priority: 'low',    icon: '🏆', defaultEnabled: true },
  LOW_BALANCE:          { category: 'financial', priority: 'high',   icon: '💳', defaultEnabled: true },
  
  // Reminders
  BILL_DUE:             { category: 'reminder',  priority: 'high',   icon: '📅', defaultEnabled: true },
  EMI_DUE:              { category: 'reminder',  priority: 'high',   icon: '🏦', defaultEnabled: true },
  SUBSCRIPTION_RENEWAL: { category: 'reminder',  priority: 'medium', icon: '🔄', defaultEnabled: true },
  
  // AI & Insights
  AI_INSIGHT:           { category: 'insight',   priority: 'low',    icon: '🧠', defaultEnabled: true },
  AI_RECOMMENDATION:    { category: 'insight',   priority: 'medium', icon: '💡', defaultEnabled: true },
  ANOMALY_DETECTED:     { category: 'insight',   priority: 'high',   icon: '🔍', defaultEnabled: true },
  PATTERN_DETECTED:     { category: 'insight',   priority: 'low',    icon: '📈', defaultEnabled: false },
  
  // Automation
  AUTOMATION_EXECUTED:  { category: 'automation', priority: 'low',    icon: '⚡', defaultEnabled: false },
  AUTOMATION_FAILED:    { category: 'automation', priority: 'high',   icon: '❌', defaultEnabled: true },
  
  // System
  SYSTEM_UPDATE:        { category: 'system',    priority: 'low',    icon: 'ℹ️',  defaultEnabled: true },
  SECURITY_ALERT:       { category: 'system',    priority: 'high',   icon: '🛡️', defaultEnabled: true },
  DATA_EXPORT_READY:    { category: 'system',    priority: 'medium', icon: '📦', defaultEnabled: true },
  
  // Achievements
  ACHIEVEMENT_UNLOCKED: { category: 'gamification', priority: 'low', icon: '🏅', defaultEnabled: true },
  STREAK_MILESTONE:     { category: 'gamification', priority: 'low', icon: '🔥', defaultEnabled: true },
};

const PRIORITY_WEIGHT = { critical: 4, high: 3, medium: 2, low: 1 };

// ─── Create notification ────────────────────────────────────────────
async function createNotification(userId, type, data = {}) {
  try {
    const config = NOTIFICATION_TYPES[type];
    if (!config) {
      logger.warn(`Unknown notification type: ${type}`);
      return null;
    }

    const notification = new Notification({
      userId,
      type,
      category: config.category,
      priority: data.priority || config.priority,
      title: data.title || type.replace(/_/g, ' ').toLowerCase(),
      message: data.message || '',
      icon: data.icon || config.icon,
      data: data.metadata || {},
      link: data.link || null,
      read: false,
      dismissed: false,
    });

    await notification.save();
    logger.info(`Notification created: ${type} for user ${userId}`);
    return notification;
  } catch (error) {
    logger.error(`Error creating notification: ${error.message}`);
    return null;
  }
}

// ─── Bulk create notifications ──────────────────────────────────────
async function createBulkNotifications(userId, notifications) {
  try {
    const docs = notifications.map(n => {
      const config = NOTIFICATION_TYPES[n.type] || {};
      return {
        userId,
        type: n.type,
        category: config.category || 'system',
        priority: n.priority || config.priority || 'low',
        title: n.title,
        message: n.message,
        icon: n.icon || config.icon || 'ℹ️',
        data: n.metadata || {},
        link: n.link || null,
        read: false,
        dismissed: false,
      };
    });
    const result = await Notification.insertMany(docs);
    logger.info(`${result.length} bulk notifications created for user ${userId}`);
    return result;
  } catch (error) {
    logger.error(`Bulk notification error: ${error.message}`);
    return [];
  }
}

// ─── Get user notifications ─────────────────────────────────────────
async function getUserNotifications(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    category = null,
    priority = null,
    unreadOnly = false,
    sortBy = 'createdAt',
    sortOrder = -1,
  } = options;

  const query = { userId, dismissed: { $ne: true } };
  if (category) query.category = category;
  if (priority) query.priority = priority;
  if (unreadOnly) query.read = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ userId, read: false, dismissed: { $ne: true } }),
  ]);

  return {
    notifications,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    unreadCount,
  };
}

// ─── Mark as read ───────────────────────────────────────────────────
async function markAsRead(userId, notificationIds) {
  const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];
  return Notification.updateMany(
    { _id: { $in: ids }, userId },
    { $set: { read: true, readAt: new Date() } }
  );
}

async function markAllAsRead(userId) {
  return Notification.updateMany(
    { userId, read: false },
    { $set: { read: true, readAt: new Date() } }
  );
}

// ─── Dismiss ────────────────────────────────────────────────────────
async function dismissNotification(userId, notificationId) {
  return Notification.updateOne(
    { _id: notificationId, userId },
    { $set: { dismissed: true, dismissedAt: new Date() } }
  );
}

// ─── Get notification stats ─────────────────────────────────────────
async function getNotificationStats(userId) {
  const [byCategory, byPriority, recent] = await Promise.all([
    Notification.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
      { $group: { _id: '$category', count: { $sum: 1 }, unread: { $sum: { $cond: ['$read', 0, 1] } } } },
    ]),
    Notification.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
    Notification.countDocuments({
      userId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }),
  ]);

  return {
    byCategory: Object.fromEntries(byCategory.map(c => [c._id, { total: c.count, unread: c.unread }])),
    byPriority: Object.fromEntries(byPriority.map(p => [p._id, p.count])),
    last24Hours: recent,
  };
}

// ─── Cleanup old notifications ──────────────────────────────────────
async function cleanupOldNotifications(userId, daysToKeep = 90) {
  const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  const result = await Notification.deleteMany({
    userId,
    createdAt: { $lt: cutoff },
    read: true,
  });
  logger.info(`Cleaned up ${result.deletedCount} old notifications for user ${userId}`);
  return result.deletedCount;
}

module.exports = {
  NOTIFICATION_TYPES,
  createNotification,
  createBulkNotifications,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  getNotificationStats,
  cleanupOldNotifications,
};
