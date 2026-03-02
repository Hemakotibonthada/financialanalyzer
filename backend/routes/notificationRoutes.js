const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middleware/auth');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications (paginated, filterable)
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, priority, isRead, page = 1, limit = 20, sort = '-createdAt' } = req.query;

    const filter = { userId, isArchived: false };
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (isRead !== undefined) filter.isRead = isRead === 'true';

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Notification.countDocuments(filter);
    const notifications = await Notification.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data: {
        notifications,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        pagination: { hasMore: skip + notifications.length < total }
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to get notifications' });
  }
});

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user._id);
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, error: 'Failed to get unread count' });
  }
});

/**
 * @route   GET /api/notifications/stats
 * @desc    Get notification statistics
 * @access  Private
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await Notification.getStats(req.user._id);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get notification stats' });
  }
});

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get notification preferences
 * @access  Private
 */
router.get('/preferences', auth, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const prefs = await db.collection('notification_preferences').findOne({ userId: req.user._id.toString() });
    const defaults = {
      email: { billReminders: true, emiAlerts: true, budgetAlerts: true, transactionAlerts: true, weeklyDigest: true, marketNews: false },
      push: { billReminders: true, emiAlerts: true, budgetAlerts: true, transactionAlerts: true, priceAlerts: true },
      sms: { emiAlerts: true, securityAlerts: true },
      quietHours: { enabled: false, start: '22:00', end: '07:00' },
    };
    res.json({ success: true, data: prefs || defaults });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ success: false, error: 'Failed to get preferences' });
  }
});

/**
 * @route   PUT /api/notifications/preferences
 * @desc    Update notification preferences
 * @access  Private
 */
router.put('/preferences', auth, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const result = await db.collection('notification_preferences').findOneAndUpdate(
      { userId: req.user._id.toString() },
      { $set: { ...req.body, userId: req.user._id.toString(), updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, returnDocument: 'after' }
    );
    res.json({ success: true, message: 'Preferences updated', data: result });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ success: false, error: 'Failed to update preferences' });
  }
});

/**
 * @route   PUT /api/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    const result = await Notification.markAllAsRead(req.user._id);
    res.json({ success: true, message: `${result.modifiedCount || 0} notifications marked as read` });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark all as read' });
  }
});

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark a single notification as read
 * @access  Private
 */
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, userId: req.user._id });
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    await notification.markAsRead();
    res.json({ success: true, data: notification });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark as read' });
  }
});

/**
 * @route   PUT /api/notifications/:id/archive
 * @desc    Archive a notification
 * @access  Private
 */
router.put('/:id/archive', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, userId: req.user._id });
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    await notification.archive();
    res.json({ success: true, data: notification });
  } catch (error) {
    console.error('Archive notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to archive notification' });
  }
});

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete notification' });
  }
});

/**
 * @route   POST /api/notifications
 * @desc    Create a new notification (internal/admin use)
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
  try {
    const { type, title, message, priority, category, data, actionUrl, actions } = req.body;
    const notification = await Notification.createNotification(req.user._id, {
      type: type || 'info',
      title,
      message,
      priority: priority || 'medium',
      category: category || 'system',
      data,
      actions: actions || (actionUrl ? [{ label: 'View', action: 'navigate', url: actionUrl, primary: true }] : [])
    });
    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to create notification' });
  }
});

module.exports = router;
