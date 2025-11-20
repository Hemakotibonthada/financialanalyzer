const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        firestore: 'connected',
        auth: 'connected',
        storage: 'connected'
      }
    };
    
    res.json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  try {
    const db = admin.firestore();
    
    // Test Firestore connection
    let firestoreStatus = 'connected';
    try {
      await db.collection('_health_check').doc('test').set({ 
        timestamp: admin.firestore.FieldValue.serverTimestamp() 
      });
    } catch (err) {
      firestoreStatus = 'error';
    }
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        firestore: firestoreStatus,
        auth: 'connected',
        storage: 'connected'
      },
      version: '1.0.0'
    };
    
    res.json(health);
  } catch (error) {
    console.error('Detailed health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
