const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Get all investments
router.get('/', async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('investments')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const investments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(investments);
  } catch (error) {
    console.error('Error fetching investments:', error);
    res.status(500).json({ error: 'Failed to fetch investments' });
  }
});

// Create new investment
router.post('/', async (req, res) => {
  try {
    const userId = req.user.uid;
    const investmentData = {
      ...req.body,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('investments').add(investmentData);
    const doc = await docRef.get();
    
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error creating investment:', error);
    res.status(500).json({ error: 'Failed to create investment' });
  }
});

// Get investment by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const doc = await db.collection('investments').doc(req.params.id).get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ error: 'Investment not found' });
    }
    
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching investment:', error);
    res.status(500).json({ error: 'Failed to fetch investment' });
  }
});

// Update investment
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('investments').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ error: 'Investment not found' });
    }
    
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await docRef.update(updateData);
    const updatedDoc = await docRef.get();
    
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Error updating investment:', error);
    res.status(500).json({ error: 'Failed to update investment' });
  }
});

// Delete investment
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('investments').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ error: 'Investment not found' });
    }
    
    await docRef.delete();
    res.json({ message: 'Investment deleted successfully' });
  } catch (error) {
    console.error('Error deleting investment:', error);
    res.status(500).json({ error: 'Failed to delete investment' });
  }
});

// Get portfolio summary
router.get('/summary/portfolio', async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('investments')
      .where('userId', '==', userId)
      .get();
    
    let totalInvested = 0;
    let currentValue = 0;
    
    snapshot.docs.forEach(doc => {
      const inv = doc.data();
      totalInvested += inv.investedAmount || 0;
      currentValue += inv.currentValue || inv.investedAmount || 0;
    });
    
    const returns = currentValue - totalInvested;
    const returnPercentage = totalInvested > 0 ? ((returns / totalInvested) * 100).toFixed(2) : 0;
    
    res.json({
      totalInvestments: snapshot.size,
      totalInvested,
      currentValue,
      returns,
      returnPercentage
    });
  } catch (error) {
    console.error('Error fetching portfolio summary:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio summary' });
  }
});

module.exports = router;
