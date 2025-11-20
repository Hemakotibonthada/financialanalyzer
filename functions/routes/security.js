const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Get security settings
router.get('/settings', async (req, res) => {
  try {
    const userId = req.user.uid;
    const doc = await db.collection('securitySettings').doc(userId).get();
    
    if (!doc.exists) {
      return res.json({
        twoFactorEnabled: false,
        loginAlerts: true,
        sessionTimeout: 30,
        trustedDevices: []
      });
    }
    
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching security settings:', error);
    res.status(500).json({ error: 'Failed to fetch security settings' });
  }
});

// Update security settings
router.put('/settings', async (req, res) => {
  try {
    const userId = req.user.uid;
    const settingsData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('securitySettings').doc(userId).set(settingsData, { merge: true });
    const doc = await db.collection('securitySettings').doc(userId).get();
    
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error updating security settings:', error);
    res.status(500).json({ error: 'Failed to update security settings' });
  }
});

// Get login history
router.get('/login-history', async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('loginHistory')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();
    
    const history = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching login history:', error);
    res.status(500).json({ error: 'Failed to fetch login history' });
  }
});

// Log security event
router.post('/events', async (req, res) => {
  try {
    const userId = req.user.uid;
    const eventData = {
      ...req.body,
      userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('securityEvents').add(eventData);
    const doc = await docRef.get();
    
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error logging security event:', error);
    res.status(500).json({ error: 'Failed to log security event' });
  }
});

module.exports = router;
