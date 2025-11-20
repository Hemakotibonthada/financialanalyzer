const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Get all insurance policies
router.get('/', async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('insurance')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const policies = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(policies);
  } catch (error) {
    console.error('Error fetching insurance policies:', error);
    res.status(500).json({ error: 'Failed to fetch insurance policies' });
  }
});

// Add insurance policy
router.post('/', async (req, res) => {
  try {
    const userId = req.user.uid;
    const policyData = {
      ...req.body,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('insurance').add(policyData);
    const doc = await docRef.get();
    
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error adding insurance policy:', error);
    res.status(500).json({ error: 'Failed to add insurance policy' });
  }
});

// Get policy by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const doc = await db.collection('insurance').doc(req.params.id).get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ error: 'Insurance policy not found' });
    }
    
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching insurance policy:', error);
    res.status(500).json({ error: 'Failed to fetch insurance policy' });
  }
});

// Update policy
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('insurance').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ error: 'Insurance policy not found' });
    }
    
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await docRef.update(updateData);
    const updatedDoc = await docRef.get();
    
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Error updating insurance policy:', error);
    res.status(500).json({ error: 'Failed to update insurance policy' });
  }
});

// Delete policy
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('insurance').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ error: 'Insurance policy not found' });
    }
    
    await docRef.delete();
    res.json({ message: 'Insurance policy deleted successfully' });
  } catch (error) {
    console.error('Error deleting insurance policy:', error);
    res.status(500).json({ error: 'Failed to delete insurance policy' });
  }
});

// Get insurance summary
router.get('/summary/coverage', async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('insurance')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .get();
    
    let totalCoverage = 0;
    let totalPremium = 0;
    const byType = {};
    
    snapshot.docs.forEach(doc => {
      const policy = doc.data();
      totalCoverage += policy.coverageAmount || 0;
      totalPremium += policy.premiumAmount || 0;
      
      const type = policy.type || 'Other';
      byType[type] = (byType[type] || 0) + 1;
    });
    
    res.json({
      totalPolicies: snapshot.size,
      totalCoverage,
      totalPremium,
      byType
    });
  } catch (error) {
    console.error('Error fetching insurance summary:', error);
    res.status(500).json({ error: 'Failed to fetch insurance summary' });
  }
});

module.exports = router;
