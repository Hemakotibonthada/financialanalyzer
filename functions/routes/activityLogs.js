const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Get all activity logs
router.get('/', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { limit = 50, type } = req.query;
    
    let query = db.collection('activityLogs')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(parseInt(limit));
    
    if (type) {
      query = query.where('type', '==', type);
    }
    
    const snapshot = await query.get();
    
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// Create activity log
router.post('/', async (req, res) => {
  try {
    const userId = req.user.uid;
    const logData = {
      ...req.body,
      userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('activityLogs').add(logData);
    const doc = await docRef.get();
    
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error creating activity log:', error);
    res.status(500).json({ error: 'Failed to create activity log' });
  }
});

// Get activity summary
router.get('/summary/stats', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { days = 7 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const snapshot = await db.collection('activityLogs')
      .where('userId', '==', userId)
      .where('timestamp', '>=', startDate)
      .get();
    
    const byType = {};
    const byDate = {};
    
    snapshot.docs.forEach(doc => {
      const log = doc.data();
      const type = log.type || 'other';
      const date = log.timestamp?.toDate?.()?.toDateString() || 'Unknown';
      
      byType[type] = (byType[type] || 0) + 1;
      byDate[date] = (byDate[date] || 0) + 1;
    });
    
    res.json({
      totalActivities: snapshot.size,
      byType,
      byDate,
      period: `${days} days`
    });
  } catch (error) {
    console.error('Error fetching activity summary:', error);
    res.status(500).json({ error: 'Failed to fetch activity summary' });
  }
});

// Clear old logs
router.delete('/cleanup', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { olderThan = 90 } = req.body;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThan));
    
    const snapshot = await db.collection('activityLogs')
      .where('userId', '==', userId)
      .where('timestamp', '<', cutoffDate)
      .get();
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    res.json({ 
      message: 'Old logs deleted successfully',
      deletedCount: snapshot.size
    });
  } catch (error) {
    console.error('Error cleaning up logs:', error);
    res.status(500).json({ error: 'Failed to cleanup logs' });
  }
});

module.exports = router;
