const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');

const db = admin.firestore();

// Get unread notification count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const notificationsSnapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .where('read', '==', false)
      .get();
    
    res.json({
      success: true,
      data: {
        count: notificationsSnapshot.size
      }
    });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count'
    });
  }
});

// Get all notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const limit = parseInt(req.query.limit) || 20;
    
    // Fetch without orderBy to avoid composite index requirement
    const notificationsSnapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .limit(limit)
      .get();
    
    // Sort client-side
    const notifications = notificationsSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toISOString() : doc.data().createdAt,
        _sortTime: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().getTime() : 0
      }))
      .sort((a, b) => b._sortTime - a._sortTime)
      .map(({_sortTime, ...notification}) => notification); // Remove _sortTime from response
    
    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const notificationId = req.params.id;
    
    const notificationRef = db.collection('notifications').doc(notificationId);
    const notificationDoc = await notificationRef.get();
    
    if (!notificationDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    // Verify ownership
    if (notificationDoc.data().userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    await notificationRef.update({
      read: true,
      readAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// Mark all as read
router.put('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const notificationsSnapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .where('read', '==', false)
      .get();
    
    const batch = db.batch();
    notificationsSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        read: true,
        readAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    await batch.commit();
    
    res.json({
      success: true,
      message: `${notificationsSnapshot.size} notifications marked as read`
    });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all as read'
    });
  }
});

// Archive notification
router.put('/:id/archive', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const notificationId = req.params.id;
    
    const notificationRef = db.collection('notifications').doc(notificationId);
    const notificationDoc = await notificationRef.get();
    
    if (!notificationDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    // Verify ownership
    if (notificationDoc.data().userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    await notificationRef.update({
      archived: true,
      archivedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      success: true,
      message: 'Notification archived'
    });
  } catch (error) {
    console.error('Archive notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive notification'
    });
  }
});

module.exports = router;
