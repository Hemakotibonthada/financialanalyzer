const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');

const db = admin.firestore();

// Get Gmail sync status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Check if user has Gmail credentials stored
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    const hasGmailAuth = !!(userData?.gmailAuth || userData?.googleAuth);
    const lastSync = userData?.lastGmailSync?.toDate ? userData.lastGmailSync.toDate().toISOString() : null;
    
    res.json({
      success: true,
      data: {
        connected: hasGmailAuth,
        lastSync,
        status: hasGmailAuth ? 'connected' : 'disconnected',
        email: userData?.email || null
      }
    });
  } catch (error) {
    console.error('Gmail status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Gmail status'
    });
  }
});

// Connect Gmail (placeholder for OAuth flow)
router.post('/connect', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Gmail integration coming soon',
      data: {
        authUrl: null,
        status: 'Feature in development'
      }
    });
  } catch (error) {
    console.error('Gmail connect error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect Gmail'
    });
  }
});

// Disconnect Gmail
router.post('/disconnect', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    await db.collection('users').doc(userId).update({
      gmailAuth: admin.firestore.FieldValue.delete(),
      googleAuth: admin.firestore.FieldValue.delete(),
      lastGmailSync: admin.firestore.FieldValue.delete()
    });
    
    res.json({
      success: true,
      message: 'Gmail disconnected successfully'
    });
  } catch (error) {
    console.error('Gmail disconnect error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Gmail'
    });
  }
});

// Trigger Gmail sync
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Update last sync timestamp
    await db.collection('users').doc(userId).update({
      lastGmailSync: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      success: true,
      message: 'Gmail sync feature coming soon',
      data: {
        status: 'pending',
        message: 'Email transaction extraction will be available soon'
      }
    });
  } catch (error) {
    console.error('Gmail sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync Gmail'
    });
  }
});

// Get Gmail OAuth URL
router.get('/auth-url', authenticateToken, async (req, res) => {
  try {
    // In a full implementation, this would generate a Google OAuth URL
    // For now, return a placeholder
    const redirectUri = req.query.redirect_uri || 'http://localhost:5173/profile';
    
    res.json({
      success: true,
      data: {
        authUrl: null,
        message: 'Gmail OAuth integration coming soon',
        status: 'feature_in_development'
      }
    });
  } catch (error) {
    console.error('Gmail auth URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate auth URL'
    });
  }
});

module.exports = router;
