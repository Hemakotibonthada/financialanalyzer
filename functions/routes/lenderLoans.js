const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Get all lender loans
router.get('/', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { lenderId } = req.query;
    
    let query = db.collection('lenderLoans').where('userId', '==', userId);
    if (lenderId) {
      query = query.where('lenderId', '==', lenderId);
    }
    
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    
    const loans = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(loans);
  } catch (error) {
    console.error('Error fetching lender loans:', error);
    res.status(500).json({ error: 'Failed to fetch lender loans' });
  }
});

// Create new lender loan
router.post('/', async (req, res) => {
  try {
    const userId = req.user.uid;
    const loanData = {
      ...req.body,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('lenderLoans').add(loanData);
    const doc = await docRef.get();
    
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error creating lender loan:', error);
    res.status(500).json({ error: 'Failed to create lender loan' });
  }
});

// Get lender loan by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const doc = await db.collection('lenderLoans').doc(req.params.id).get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ error: 'Lender loan not found' });
    }
    
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching lender loan:', error);
    res.status(500).json({ error: 'Failed to fetch lender loan' });
  }
});

// Update lender loan
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('lenderLoans').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ error: 'Lender loan not found' });
    }
    
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await docRef.update(updateData);
    const updatedDoc = await docRef.get();
    
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Error updating lender loan:', error);
    res.status(500).json({ error: 'Failed to update lender loan' });
  }
});

// Delete lender loan
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('lenderLoans').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ error: 'Lender loan not found' });
    }
    
    await docRef.delete();
    res.json({ message: 'Lender loan deleted successfully' });
  } catch (error) {
    console.error('Error deleting lender loan:', error);
    res.status(500).json({ error: 'Failed to delete lender loan' });
  }
});

module.exports = router;
