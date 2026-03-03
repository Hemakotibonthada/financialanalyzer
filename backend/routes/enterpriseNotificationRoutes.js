// ============================================================================
// Enterprise Notification Routes — Smart Notification API
// ============================================================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { notificationEngine, CATEGORY, PRIORITY } = require('../services/enterpriseNotificationEngine');

// GET /api/notifications — Get user notifications
router.get('/', authenticate, (req, res) => {
  try {
    const {
      limit = 50,
      unreadOnly = false,
      category = null,
      priority = null,
    } = req.query;

    const notifications = notificationEngine.getNotifications(req.user._id || req.user.id, {
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true',
      category,
      priority: priority ? parseInt(priority) : null,
    });

    const unreadCount = notificationEngine.getUnreadCount(req.user._id || req.user.id);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        total: notifications.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/notifications/unread-count — Get unread count only
router.get('/unread-count', authenticate, (req, res) => {
  try {
    const count = notificationEngine.getUnreadCount(req.user._id || req.user.id);
    res.json({ success: true, data: { count } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/notifications/:id/read — Mark one as read
router.patch('/:id/read', authenticate, (req, res) => {
  try {
    const result = notificationEngine.markRead(req.params.id);
    res.json({ success: result, message: result ? 'Marked as read' : 'Not found' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/notifications/read-all — Mark all as read
router.patch('/read-all', authenticate, (req, res) => {
  try {
    const count = notificationEngine.markAllRead(req.user._id || req.user.id);
    res.json({ success: true, data: { markedRead: count } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/notifications/:id — Dismiss a notification
router.delete('/:id', authenticate, (req, res) => {
  try {
    const result = notificationEngine.dismiss(req.params.id);
    res.json({ success: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/notifications/preferences — Get user notification preferences
router.get('/preferences', authenticate, (req, res) => {
  try {
    const prefs = notificationEngine.getPreferences(req.user._id || req.user.id);
    res.json({ success: true, data: prefs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/notifications/preferences — Update notification preferences
router.put('/preferences', authenticate, (req, res) => {
  try {
    const updated = notificationEngine.updatePreferences(req.user._id || req.user.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/notifications/trigger-daily — Trigger daily notification checks
router.post('/trigger-daily', authenticate, async (req, res) => {
  try {
    const results = await notificationEngine.runDailyChecks(
      req.user._id || req.user.id,
      req.body || {}
    );
    res.json({ success: true, data: { triggered: results.length, results } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/notifications/categories — List categories
router.get('/categories', (req, res) => {
  res.json({ success: true, data: CATEGORY });
});

// GET /api/notifications/priorities — List priorities
router.get('/priorities', (req, res) => {
  res.json({ success: true, data: PRIORITY });
});

// GET /api/notifications/stats — Get notification engine stats
router.get('/stats', authenticate, (req, res) => {
  try {
    const stats = notificationEngine.getStats();
    const userUnread = notificationEngine.getUnreadCount(req.user._id || req.user.id);
    res.json({ success: true, data: { ...stats, userUnread } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
