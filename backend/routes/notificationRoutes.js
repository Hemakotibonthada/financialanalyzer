const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middleware/auth');

// In-memory notification store
const userNotifications = {};
const userPreferences = {};

function getNotifications(userId) {
  if (!userNotifications[userId]) {
    userNotifications[userId] = [
      { id: '1', type: 'bill_reminder', title: 'Electricity Bill Due', message: 'Your electricity bill of ₹2,450 is due on Feb 28', priority: 'high', isRead: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: '2', type: 'transaction_alert', title: 'Large Transaction', message: 'Debit of ₹45,000 detected from HDFC account', priority: 'medium', isRead: false, createdAt: new Date(Date.now() - 7200000).toISOString() },
      { id: '3', type: 'budget_alert', title: 'Budget Exceeded', message: 'Dining out budget exceeded by ₹3,200 this month', priority: 'high', isRead: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: '4', type: 'emi_reminder', title: 'EMI Due Tomorrow', message: 'Home loan EMI of ₹35,420 due tomorrow', priority: 'urgent', isRead: false, createdAt: new Date(Date.now() - 172800000).toISOString() },
      { id: '5', type: 'info', title: 'FD Maturity Alert', message: 'Your SBI FD of ₹5,00,000 matures in 15 days', priority: 'medium', isRead: true, createdAt: new Date(Date.now() - 259200000).toISOString() },
      { id: '6', type: 'cibil_update', title: 'CIBIL Score Updated', message: 'Your CIBIL score has increased by 12 points to 764', priority: 'low', isRead: true, createdAt: new Date(Date.now() - 432000000).toISOString() },
    ];
  }
  return userNotifications[userId];
}

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type, priority, isRead, page = 1, limit = 20 } = req.query;
    let notifications = getNotifications(userId);
    if (type) notifications = notifications.filter(n => n.type === type);
    if (priority) notifications = notifications.filter(n => n.priority === priority);
    if (isRead !== undefined) notifications = notifications.filter(n => n.isRead === (isRead === 'true'));
    const start = (page - 1) * limit;
    const paginated = notifications.slice(start, start + Number(limit));
    res.json({ success: true, data: { notifications: paginated, total: notifications.length, page: Number(page), totalPages: Math.ceil(notifications.length / limit) } });
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
    const userId = req.user.userId;
    const notifications = getNotifications(userId);
    const count = notifications.filter(n => !n.isRead).length;
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, error: 'Failed to get unread count' });
  }
});

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const notifications = getNotifications(userId);
    const notification = notifications.find(n => n.id === req.params.id);
    if (!notification) return res.status(404).json({ success: false, error: 'Notification not found' });
    notification.isRead = true;
    notification.readAt = new Date().toISOString();
    res.json({ success: true, data: notification });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark as read' });
  }
});

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.patch('/read-all', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const notifications = getNotifications(userId);
    let count = 0;
    notifications.forEach(n => { if (!n.isRead) { n.isRead = true; n.readAt = new Date().toISOString(); count++; } });
    res.json({ success: true, message: `${count} notifications marked as read` });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark all as read' });
  }
});

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const notifications = getNotifications(userId);
    const index = notifications.findIndex(n => n.id === req.params.id);
    if (index === -1) return res.status(404).json({ success: false, error: 'Notification not found' });
    notifications.splice(index, 1);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete notification' });
  }
});

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get notification preferences
 * @access  Private
 */
router.get('/preferences', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const defaults = {
      email: { billReminders: true, emiAlerts: true, budgetAlerts: true, transactionAlerts: true, weeklyDigest: true, marketNews: false },
      push: { billReminders: true, emiAlerts: true, budgetAlerts: true, transactionAlerts: true, priceAlerts: true },
      sms: { emiAlerts: true, securityAlerts: true },
      quietHours: { enabled: false, start: '22:00', end: '07:00' },
    };
    res.json({ success: true, data: userPreferences[userId] || defaults });
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
    const userId = req.user.userId;
    userPreferences[userId] = { ...(userPreferences[userId] || {}), ...req.body };
    res.json({ success: true, message: 'Preferences updated', data: userPreferences[userId] });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ success: false, error: 'Failed to update preferences' });
  }
});

/**
 * @route   GET /api/notifications/stats
 * @desc    Get notification statistics
 * @access  Private
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const notifications = getNotifications(userId);
    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.isRead).length,
      byType: {},
      byPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
    };
    notifications.forEach(n => {
      stats.byType[n.type] = (stats.byType[n.type] || 0) + 1;
      stats.byPriority[n.priority] = (stats.byPriority[n.priority] || 0) + 1;
    });
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get notification stats' });
  }
});

module.exports = router;
