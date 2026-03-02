/**
 * @fileoverview Smart Notification Service
 * Creates, manages, schedules, and delivers notifications including
 * budget alerts, bill reminders, goal milestones, and weekly summaries.
 * @module services/notificationService
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Import the canonical Notification model (with static methods) from models/
const Notification = require('../models/Notification');

// NotificationPrefs schema — only defined here (no separate model file)
const notificationPrefsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    channels: {
      in_app: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
    },
    types: {
      budget_alert: { type: Boolean, default: true },
      bill_reminder: { type: Boolean, default: true },
      goal_milestone: { type: Boolean, default: true },
      weekly_summary: { type: Boolean, default: true },
      security_alert: { type: Boolean, default: true },
      transaction: { type: Boolean, default: true },
      system: { type: Boolean, default: true },
      custom: { type: Boolean, default: true },
    },
    quietHours: {
      enabled: { type: Boolean, default: false },
      start: { type: String, default: '22:00' },
      end: { type: String, default: '07:00' },
    },
    weeklyDigestDay: { type: String, default: 'monday' },
  },
  { timestamps: true }
);

const NotificationPrefs =
  mongoose.models.NotificationPrefs ||
  mongoose.model('NotificationPrefs', notificationPrefsSchema);

/* ============================================================
 *  Notification Service
 * ============================================================ */
const notificationService = {
  /* ----------------------------------------------------------
   *  createNotification
   * ---------------------------------------------------------- */
  /**
   * Create and persist a new notification.
   * @param {string} userId - Recipient user ID.
   * @param {string} type - Notification type.
   * @param {string} title - Short title.
   * @param {string} message - Full message body.
   * @param {Object} [metadata={}] - Additional data payload.
   * @param {string} [priority='medium'] - low | medium | high | urgent
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async createNotification(userId, type, title, message, metadata = {}, priority = 'medium') {
    try {
      if (!userId) throw new Error('userId is required');
      if (!type) throw new Error('Notification type is required');
      if (!title || !message) throw new Error('Title and message are required');

      // Fetch user prefs to decide channels
      const prefs = await notificationService.getNotificationPreferences(userId);
      const prefData = prefs.data || {};

      // Check if user has disabled this type
      if (prefData.types && prefData.types[type] === false) {
        logger.info(`Notification type "${type}" disabled by user ${userId}. Skipped.`);
        return { success: true, data: { skipped: true, reason: 'disabled_by_user' } };
      }

      // Determine active channels
      const activeChannels = [];
      if (prefData.channels) {
        for (const [ch, enabled] of Object.entries(prefData.channels)) {
          if (enabled) activeChannels.push(ch);
        }
      }
      if (!activeChannels.length) activeChannels.push('in_app');

      const notification = new Notification({
        userId,
        type,
        title,
        message,
        priority,
        data: metadata,
        channels: activeChannels,
      });

      await notification.save();
      logger.info(`Notification created [${type}] for user ${userId}`);
      return { success: true, data: notification.toObject() };
    } catch (error) {
      logger.error(`createNotification error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getNotifications
   * ---------------------------------------------------------- */
  /**
   * Retrieve notifications for a user with optional filters and pagination,
   * grouped by date.
   * @param {string} userId
   * @param {Object} [filters={}]
   * @param {string} [filters.type] - Filter by type.
   * @param {boolean} [filters.isRead] - Filter by read status.
   * @param {string} [filters.priority]
   * @param {number} [filters.page=1]
   * @param {number} [filters.limit=30]
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getNotifications(userId, filters = {}) {
    try {
      if (!userId) throw new Error('userId is required');

      const page = Math.max(1, parseInt(filters.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 30));

      const query = { userId, isDeleted: false };
      if (filters.type) query.type = filters.type;
      if (filters.isRead !== undefined) query.isRead = filters.isRead;
      if (filters.priority) query.priority = filters.priority;

      const [notifications, total] = await Promise.all([
        Notification.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Notification.countDocuments(query),
      ]);

      // Group by date
      const grouped = {};
      for (const n of notifications) {
        const dateKey = new Date(n.createdAt).toISOString().split('T')[0];
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(n);
      }

      return {
        success: true,
        data: {
          notifications,
          grouped,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      };
    } catch (error) {
      logger.error(`getNotifications error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  markAsRead
   * ---------------------------------------------------------- */
  /**
   * Mark a single notification as read.
   * @param {string} userId
   * @param {string} notificationId
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async markAsRead(userId, notificationId) {
    try {
      if (!userId || !notificationId) throw new Error('userId and notificationId are required');

      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId, isDeleted: false },
        { $set: { isRead: true, readAt: new Date() } },
        { new: true }
      );

      if (!notification) throw new Error('Notification not found');

      return { success: true, data: { id: notificationId, isRead: true, readAt: notification.readAt } };
    } catch (error) {
      logger.error(`markAsRead error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  markAllAsRead
   * ---------------------------------------------------------- */
  /**
   * Mark all unread notifications as read for a user.
   * @param {string} userId
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async markAllAsRead(userId) {
    try {
      if (!userId) throw new Error('userId is required');

      const now = new Date();
      const result = await Notification.updateMany(
        { userId, isRead: false, isDeleted: false },
        { $set: { isRead: true, readAt: now } }
      );

      logger.info(`Marked ${result.modifiedCount} notifications as read for user ${userId}`);
      return { success: true, data: { markedCount: result.modifiedCount, readAt: now } };
    } catch (error) {
      logger.error(`markAllAsRead error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  deleteNotification
   * ---------------------------------------------------------- */
  /**
   * Soft-delete a notification.
   * @param {string} userId
   * @param {string} notificationId
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async deleteNotification(userId, notificationId) {
    try {
      if (!userId || !notificationId) throw new Error('userId and notificationId are required');

      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { $set: { isDeleted: true } },
        { new: true }
      );

      if (!notification) throw new Error('Notification not found');

      return { success: true, data: { id: notificationId, deleted: true } };
    } catch (error) {
      logger.error(`deleteNotification error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getNotificationPreferences
   * ---------------------------------------------------------- */
  /**
   * Get a user's notification channel and type preferences.
   * Returns defaults if none are set.
   * @param {string} userId
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getNotificationPreferences(userId) {
    try {
      if (!userId) throw new Error('userId is required');

      let prefs = await NotificationPrefs.findOne({ userId }).lean();

      if (!prefs) {
        // Return defaults
        prefs = {
          userId,
          channels: { in_app: true, email: true, push: false, sms: false },
          types: {
            budget_alert: true,
            bill_reminder: true,
            goal_milestone: true,
            weekly_summary: true,
            security_alert: true,
            transaction: true,
            system: true,
            custom: true,
          },
          quietHours: { enabled: false, start: '22:00', end: '07:00' },
          weeklyDigestDay: 'monday',
        };
      }

      return { success: true, data: prefs };
    } catch (error) {
      logger.error(`getNotificationPreferences error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  updateNotificationPreferences
   * ---------------------------------------------------------- */
  /**
   * Create or update user notification preferences.
   * @param {string} userId
   * @param {Object} prefs - Partial preferences to merge.
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async updateNotificationPreferences(userId, prefs) {
    try {
      if (!userId) throw new Error('userId is required');
      if (!prefs || typeof prefs !== 'object') throw new Error('Preferences object is required');

      const updateFields = {};
      if (prefs.channels) {
        for (const [ch, val] of Object.entries(prefs.channels)) {
          updateFields[`channels.${ch}`] = !!val;
        }
      }
      if (prefs.types) {
        for (const [t, val] of Object.entries(prefs.types)) {
          updateFields[`types.${t}`] = !!val;
        }
      }
      if (prefs.quietHours) {
        if (prefs.quietHours.enabled !== undefined) updateFields['quietHours.enabled'] = !!prefs.quietHours.enabled;
        if (prefs.quietHours.start) updateFields['quietHours.start'] = prefs.quietHours.start;
        if (prefs.quietHours.end) updateFields['quietHours.end'] = prefs.quietHours.end;
      }
      if (prefs.weeklyDigestDay) updateFields.weeklyDigestDay = prefs.weeklyDigestDay;

      const updated = await NotificationPrefs.findOneAndUpdate(
        { userId },
        { $set: updateFields },
        { new: true, upsert: true }
      ).lean();

      logger.info(`Notification preferences updated for user ${userId}`);
      return { success: true, data: updated };
    } catch (error) {
      logger.error(`updateNotificationPreferences error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  sendBudgetAlert
   * ---------------------------------------------------------- */
  /**
   * Send a budget utilization alert when spending reaches a threshold.
   * @param {string} userId
   * @param {string} budgetId
   * @param {number} percentUsed - Current utilization percentage.
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async sendBudgetAlert(userId, budgetId, percentUsed) {
    try {
      if (!userId || !budgetId) throw new Error('userId and budgetId are required');
      if (percentUsed == null) throw new Error('percentUsed is required');

      let priority = 'low';
      let title = 'Budget Update';
      let message = '';

      if (percentUsed >= 100) {
        priority = 'urgent';
        title = 'Budget Exceeded!';
        message = `You have exceeded your budget by ${(percentUsed - 100).toFixed(1)}%. Consider reviewing your spending immediately.`;
      } else if (percentUsed >= 90) {
        priority = 'high';
        title = 'Budget Almost Exhausted';
        message = `You have used ${percentUsed.toFixed(1)}% of your budget. Only ${(100 - percentUsed).toFixed(1)}% remaining.`;
      } else if (percentUsed >= 75) {
        priority = 'medium';
        title = 'Budget Alert: 75% Used';
        message = `You have used ${percentUsed.toFixed(1)}% of your budget. Plan your remaining spending carefully.`;
      } else {
        message = `Budget utilization is at ${percentUsed.toFixed(1)}%. You're on track!`;
      }

      return await notificationService.createNotification(userId, 'budget_alert', title, message, {
        budgetId,
        percentUsed,
      }, priority);
    } catch (error) {
      logger.error(`sendBudgetAlert error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  sendBillReminder
   * ---------------------------------------------------------- */
  /**
   * Send a reminder about an upcoming bill payment.
   * @param {string} userId
   * @param {string} billId
   * @param {Date|string} dueDate
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async sendBillReminder(userId, billId, dueDate) {
    try {
      if (!userId || !billId) throw new Error('userId and billId are required');
      if (!dueDate) throw new Error('dueDate is required');

      const due = new Date(dueDate);
      const now = new Date();
      const daysUntilDue = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

      let priority = 'medium';
      let title = 'Bill Reminder';
      let message = '';

      if (daysUntilDue < 0) {
        priority = 'urgent';
        title = 'Overdue Bill!';
        message = `A bill was due ${Math.abs(daysUntilDue)} day(s) ago. Please make the payment immediately to avoid penalties.`;
      } else if (daysUntilDue === 0) {
        priority = 'high';
        title = 'Bill Due Today';
        message = 'You have a bill due today. Make sure to complete the payment before the end of the day.';
      } else if (daysUntilDue <= 3) {
        priority = 'high';
        title = `Bill Due in ${daysUntilDue} Day(s)`;
        message = `You have a bill due on ${due.toLocaleDateString('en-IN')}. Don't forget to pay it on time.`;
      } else {
        title = `Upcoming Bill (${daysUntilDue} Days)`;
        message = `A bill is due on ${due.toLocaleDateString('en-IN')} (${daysUntilDue} days from now).`;
      }

      return await notificationService.createNotification(userId, 'bill_reminder', title, message, {
        billId,
        dueDate: due,
        daysUntilDue,
      }, priority);
    } catch (error) {
      logger.error(`sendBillReminder error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  sendGoalMilestoneAlert
   * ---------------------------------------------------------- */
  /**
   * Notify the user about a goal milestone achievement.
   * @param {string} userId
   * @param {string} goalId
   * @param {Object} milestone
   * @param {number} milestone.percentComplete
   * @param {string} [milestone.goalName]
   * @param {number} [milestone.amountSaved]
   * @param {number} [milestone.targetAmount]
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async sendGoalMilestoneAlert(userId, goalId, milestone) {
    try {
      if (!userId || !goalId) throw new Error('userId and goalId are required');
      if (!milestone) throw new Error('Milestone data is required');

      const pct = milestone.percentComplete || 0;
      const goalName = milestone.goalName || 'Your goal';

      let title = 'Goal Progress';
      let message = '';
      let priority = 'medium';

      if (pct >= 100) {
        title = '🎉 Goal Achieved!';
        message = `Congratulations! You have achieved "${goalName}". ` +
          (milestone.amountSaved ? `You saved ₹${milestone.amountSaved.toLocaleString('en-IN')}.` : '');
        priority = 'high';
      } else if (pct >= 75) {
        title = 'Almost There! 75% Complete';
        message = `You're 75% of the way to "${goalName}". Keep up the great work!`;
      } else if (pct >= 50) {
        title = 'Halfway There! 50% Complete';
        message = `You've reached the halfway point for "${goalName}". Stay consistent!`;
      } else if (pct >= 25) {
        title = 'Great Start! 25% Complete';
        message = `You've completed 25% of "${goalName}". You're building momentum!`;
        priority = 'low';
      } else {
        title = 'Goal Progress Update';
        message = `"${goalName}" is at ${pct.toFixed(0)}%. Every step counts!`;
        priority = 'low';
      }

      return await notificationService.createNotification(
        userId,
        'goal_milestone',
        title,
        message,
        { goalId, ...milestone },
        priority
      );
    } catch (error) {
      logger.error(`sendGoalMilestoneAlert error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  sendWeeklySummary
   * ---------------------------------------------------------- */
  /**
   * Generate and send a weekly financial summary notification.
   * @param {string} userId
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async sendWeeklySummary(userId) {
    try {
      if (!userId) throw new Error('userId is required');

      // Build simulated weekly data (in real app this would query transactions)
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);

      const summaryData = {
        period: {
          start: weekStart.toISOString().split('T')[0],
          end: now.toISOString().split('T')[0],
        },
        totalIncome: +(Math.random() * 50000 + 20000).toFixed(2),
        totalExpenses: +(Math.random() * 30000 + 10000).toFixed(2),
        transactionCount: Math.floor(Math.random() * 30 + 5),
        topCategory: 'Food & Dining',
        savingsRate: +(Math.random() * 30 + 10).toFixed(1),
      };

      summaryData.netSavings = +(summaryData.totalIncome - summaryData.totalExpenses).toFixed(2);

      const message =
        `Weekly Summary (${summaryData.period.start} to ${summaryData.period.end}):\n` +
        `• Income: ₹${summaryData.totalIncome.toLocaleString('en-IN')}\n` +
        `• Expenses: ₹${summaryData.totalExpenses.toLocaleString('en-IN')}\n` +
        `• Net Savings: ₹${summaryData.netSavings.toLocaleString('en-IN')}\n` +
        `• Transactions: ${summaryData.transactionCount}\n` +
        `• Top Spending Category: ${summaryData.topCategory}\n` +
        `• Savings Rate: ${summaryData.savingsRate}%`;

      return await notificationService.createNotification(
        userId,
        'weekly_summary',
        'Your Weekly Financial Summary',
        message,
        summaryData,
        'low'
      );
    } catch (error) {
      logger.error(`sendWeeklySummary error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getNotificationStats
   * ---------------------------------------------------------- */
  /**
   * Get notification statistics for the user—unread count, type breakdown.
   * @param {string} userId
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getNotificationStats(userId) {
    try {
      if (!userId) throw new Error('userId is required');

      const objectId = new mongoose.Types.ObjectId(userId);

      const [unreadCount, typeBreakdown, totalCount] = await Promise.all([
        Notification.countDocuments({ userId: objectId, isRead: false, isDeleted: false }),
        Notification.aggregate([
          { $match: { userId: objectId, isDeleted: false } },
          { $group: { _id: '$type', count: { $sum: 1 }, unread: { $sum: { $cond: ['$isRead', 0, 1] } } } },
          { $sort: { count: -1 } },
        ]),
        Notification.countDocuments({ userId: objectId, isDeleted: false }),
      ]);

      const byType = {};
      for (const item of typeBreakdown) {
        byType[item._id] = { total: item.count, unread: item.unread };
      }

      return {
        success: true,
        data: {
          totalNotifications: totalCount,
          unreadCount,
          readCount: totalCount - unreadCount,
          byType,
        },
      };
    } catch (error) {
      logger.error(`getNotificationStats error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  scheduleNotification
   * ---------------------------------------------------------- */
  /**
   * Schedule a notification for future delivery.
   * @param {string} userId
   * @param {string} type - Notification type.
   * @param {Date|string} scheduledAt - When to deliver.
   * @param {Object} data - Notification content.
   * @param {string} data.title
   * @param {string} data.message
   * @param {Object} [data.metadata]
   * @param {string} [data.priority]
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async scheduleNotification(userId, type, scheduledAt, data = {}) {
    try {
      if (!userId) throw new Error('userId is required');
      if (!type) throw new Error('Notification type is required');
      if (!scheduledAt) throw new Error('scheduledAt is required');
      if (!data.title || !data.message) throw new Error('Title and message are required');

      const scheduleDate = new Date(scheduledAt);
      if (scheduleDate <= new Date()) {
        throw new Error('scheduledAt must be a future date');
      }

      const notification = new Notification({
        userId,
        type,
        title: data.title,
        message: data.message,
        priority: data.priority || 'medium',
        data: { ...(data.metadata || {}), scheduled: true },
        scheduledFor: scheduleDate,
        channels: ['in_app'],
      });

      await notification.save();

      logger.info(
        `Notification scheduled for ${scheduleDate.toISOString()} [${type}] user ${userId}`
      );
      return {
        success: true,
        data: {
          id: notification._id,
          scheduledAt: scheduleDate,
          type,
          title: data.title,
        },
      };
    } catch (error) {
      logger.error(`scheduleNotification error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },
};

module.exports = notificationService;
