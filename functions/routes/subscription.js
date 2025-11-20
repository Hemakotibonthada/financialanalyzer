const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Get all subscriptions
router.get('/', async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('subscriptions')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const subscriptions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// Add subscription
router.post('/', async (req, res) => {
  try {
    const userId = req.user.uid;
    const subscriptionData = {
      ...req.body,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('subscriptions').add(subscriptionData);
    const doc = await docRef.get();
    
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error adding subscription:', error);
    res.status(500).json({ error: 'Failed to add subscription' });
  }
});

// Update subscription
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('subscriptions').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await docRef.update(updateData);
    const updatedDoc = await docRef.get();
    
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// Delete subscription
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('subscriptions').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    await docRef.delete();
    res.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    res.status(500).json({ error: 'Failed to delete subscription' });
  }
});

// Get subscription summary
router.get('/summary/all', async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('subscriptions')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .get();
    
    let monthlyTotal = 0;
    let yearlyTotal = 0;
    
    snapshot.docs.forEach(doc => {
      const sub = doc.data();
      const amount = sub.amount || 0;
      
      if (sub.billingCycle === 'monthly') {
        monthlyTotal += amount;
        yearlyTotal += amount * 12;
      } else if (sub.billingCycle === 'yearly') {
        yearlyTotal += amount;
        monthlyTotal += amount / 12;
      }
    });
    
    res.json({
      totalSubscriptions: snapshot.size,
      monthlyTotal: Math.round(monthlyTotal * 100) / 100,
      yearlyTotal: Math.round(yearlyTotal * 100) / 100
    });
  } catch (error) {
    console.error('Error fetching subscription summary:', error);
    res.status(500).json({ error: 'Failed to fetch subscription summary' });
  }
});

module.exports = router;
