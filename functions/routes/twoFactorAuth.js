const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Setup 2FA
router.post('/setup', async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Placeholder for 2FA setup (would use speakeasy or similar)
    const secret = 'PLACEHOLDER_SECRET_' + Math.random().toString(36).substring(7);
    
    await db.collection('twoFactorAuth').doc(userId).set({
      secret,
      enabled: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      secret,
      qrCode: 'data:image/png;base64,placeholder',
      message: '2FA setup initiated. Scan QR code with authenticator app.'
    });
  } catch (error) {
    console.error('Error setting up 2FA:', error);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

// Verify and enable 2FA
router.post('/verify', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }
    
    // Placeholder verification
    const isValid = code.length === 6;
    
    if (isValid) {
      await db.collection('twoFactorAuth').doc(userId).update({
        enabled: true,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      res.json({ 
        success: true,
        message: '2FA enabled successfully'
      });
    } else {
      res.status(400).json({ 
        success: false,
        error: 'Invalid verification code'
      });
    }
  } catch (error) {
    console.error('Error verifying 2FA:', error);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

// Disable 2FA
router.post('/disable', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }
    
    await db.collection('twoFactorAuth').doc(userId).update({
      enabled: false,
      disabledAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ 
      success: true,
      message: '2FA disabled successfully'
    });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// Check 2FA status
router.get('/status', async (req, res) => {
  try {
    const userId = req.user.uid;
    const doc = await db.collection('twoFactorAuth').doc(userId).get();
    
    if (!doc.exists) {
      return res.json({ enabled: false });
    }
    
    res.json({ 
      enabled: doc.data().enabled || false,
      setupDate: doc.data().verifiedAt
    });
  } catch (error) {
    console.error('Error checking 2FA status:', error);
    res.status(500).json({ error: 'Failed to check 2FA status' });
  }
});

module.exports = router;
