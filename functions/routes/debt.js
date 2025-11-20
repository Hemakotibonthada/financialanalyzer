const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Get all debts
router.get('/', async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('debts')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const debts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(debts);
  } catch (error) {
    console.error('Error fetching debts:', error);
    res.status(500).json({ error: 'Failed to fetch debts' });
  }
});

// Add debt
router.post('/', async (req, res) => {
  try {
    const userId = req.user.uid;
    const debtData = {
      ...req.body,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('debts').add(debtData);
    const doc = await docRef.get();
    
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error adding debt:', error);
    res.status(500).json({ error: 'Failed to add debt' });
  }
});

// Update debt
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('debts').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ error: 'Debt not found' });
    }
    
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await docRef.update(updateData);
    const updatedDoc = await docRef.get();
    
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Error updating debt:', error);
    res.status(500).json({ error: 'Failed to update debt' });
  }
});

// Delete debt
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('debts').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ error: 'Debt not found' });
    }
    
    await docRef.delete();
    res.json({ message: 'Debt deleted successfully' });
  } catch (error) {
    console.error('Error deleting debt:', error);
    res.status(500).json({ error: 'Failed to delete debt' });
  }
});

// Get debt summary
router.get('/summary/total', async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('debts')
      .where('userId', '==', userId)
      .get();
    
    let totalDebt = 0;
    let totalPaid = 0;
    
    snapshot.docs.forEach(doc => {
      const debt = doc.data();
      totalDebt += debt.amount || 0;
      totalPaid += debt.paidAmount || 0;
    });
    
    const remaining = totalDebt - totalPaid;
    const payoffPercentage = totalDebt > 0 ? ((totalPaid / totalDebt) * 100).toFixed(2) : 0;
    
    res.json({
      totalDebts: snapshot.size,
      totalDebt,
      totalPaid,
      remaining,
      payoffPercentage
    });
  } catch (error) {
    console.error('Error fetching debt summary:', error);
    res.status(500).json({ error: 'Failed to fetch debt summary' });
  }
});

module.exports = router;
