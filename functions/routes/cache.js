const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');

const db = admin.firestore();

// Get cache stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const cacheSnapshot = await db.collection('cache').get();
    
    const stats = {
      total: cacheSnapshot.size,
      byType: {}
    };
    
    cacheSnapshot.forEach(doc => {
      const data = doc.data();
      const type = data.type || 'unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Cache stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cache stats'
    });
  }
});

// Get cache entry
router.get('/get/:key', authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;
    const cacheDoc = await db.collection('cache').doc(key).get();
    
    if (!cacheDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Cache entry not found'
      });
    }
    
    res.json({
      success: true,
      data: cacheDoc.data()
    });
  } catch (error) {
    console.error('Get cache error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cache entry'
    });
  }
});

// Delete cache entry
router.delete('/delete/:key', authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;
    await db.collection('cache').doc(key).delete();
    
    res.json({
      success: true,
      message: 'Cache entry deleted'
    });
  } catch (error) {
    console.error('Delete cache error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete cache entry'
    });
  }
});

// Delete cache by pattern
router.delete('/pattern/:pattern', authenticateToken, async (req, res) => {
  try {
    const { pattern } = req.params;
    const cacheSnapshot = await db.collection('cache').get();
    
    const batch = db.batch();
    let deleteCount = 0;
    
    cacheSnapshot.forEach(doc => {
      if (doc.id.includes(pattern)) {
        batch.delete(doc.ref);
        deleteCount++;
      }
    });
    
    await batch.commit();
    
    res.json({
      success: true,
      message: `Deleted ${deleteCount} cache entries`,
      deleted: deleteCount
    });
  } catch (error) {
    console.error('Delete pattern error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete cache entries'
    });
  }
});

module.exports = router;
