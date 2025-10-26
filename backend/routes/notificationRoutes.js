const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');
const Notification = require('../models/Notification');
const { body, query, validationResult } = require('express-validator');

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get(
  '/',
  auth,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('type').optional().isString(),
    query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    query('isRead').optional().isBoolean().toBoolean(),
    query('isArchived').optional().isBoolean().toBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.userId;
      const result = await NotificationService.getUserNotifications(userId, req.query);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get notifications'
      });
    }
  }
);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notifications count
 * @access  Private
 */
router.get('/unread-count', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const count = await Notification.getUnreadCount(userId);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count'
    });
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
    const stats = await Notification.getStats(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics'
    });
  }
});

/**
 * @route   POST /api/notifications
 * @desc    Create a notification (manual)
 * @access  Private
 */
router.post(
  '/',
  auth,
  [
    body('type').isIn([
      'info', 'success', 'warning', 'error', 'bill_reminder', 'emi_reminder',
      'budget_alert', 'transaction_alert', 'document_processed', 'analysis_complete',
      'cibil_update', 'gmail_sync', 'security_alert', 'system_notification'
    ]),
    body('title').notEmpty().trim(),
    body('message').notEmpty().trim(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('category').optional().isIn(['finance', 'system', 'security', 'reminder', 'alert', 'update']),
    body('data').optional().isObject(),
    body('actions').optional().isArray()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.userId;
      const notification = await NotificationService.createNotification(userId, req.body);

      res.status(201).json({
        success: true,
        data: notification
      });
    } catch (error) {
      console.error('Create notification error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create notification'
      });
    }
  }
);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:id/read', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const notificationId = req.params.id;

    const notification = await Notification.findOne({
      _id: notificationId,
      userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.markAsRead();

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark as read'
    });
  }
});

/**
 * @route   PUT /api/notifications/mark-read
 * @desc    Mark multiple notifications as read
 * @access  Private
 */
router.put(
  '/mark-read',
  auth,
  [body('notificationIds').isArray().notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.userId;
      const { notificationIds } = req.body;

      const result = await Notification.markAsRead(userId, notificationIds);

      res.json({
        success: true,
        data: {
          modifiedCount: result.modifiedCount
        }
      });
    } catch (error) {
      console.error('Mark multiple as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notifications as read'
      });
    }
  }
);

/**
 * @route   PUT /api/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await Notification.markAllAsRead(userId);

    res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all as read'
    });
  }
});

/**
 * @route   PUT /api/notifications/:id/archive
 * @desc    Archive notification
 * @access  Private
 */
router.put('/:id/archive', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const notificationId = req.params.id;

    const notification = await Notification.findOne({
      _id: notificationId,
      userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.archive();

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Archive notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive notification'
    });
  }
});

/**
 * @route   PUT /api/notifications/archive
 * @desc    Archive multiple notifications
 * @access  Private
 */
router.put(
  '/archive',
  auth,
  [body('notificationIds').isArray().notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.userId;
      const { notificationIds } = req.body;

      const result = await Notification.archiveNotifications(userId, notificationIds);

      res.json({
        success: true,
        data: {
          modifiedCount: result.modifiedCount
        }
      });
    } catch (error) {
      console.error('Archive multiple error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to archive notifications'
      });
    }
  }
);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const notificationId = req.params.id;

    const result = await Notification.deleteOne({
      _id: notificationId,
      userId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
});

/**
 * @route   DELETE /api/notifications/cleanup
 * @desc    Cleanup old archived notifications
 * @access  Private (Admin)
 */
router.delete('/cleanup', auth, async (req, res) => {
  try {
    const { daysOld = 90 } = req.query;
    const result = await Notification.cleanupOldNotifications(parseInt(daysOld));

    res.json({
      success: true,
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup notifications'
    });
  }
});

module.exports = router;
