const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Get all budgets for a user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('budgets')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const budgets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(budgets);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// Get a single budget
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const doc = await db.collection('budgets').doc(req.params.id).get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({ error: 'Failed to fetch budget' });
  }
});

// Create a new budget
router.post('/', async (req, res) => {
  try {
    const userId = req.user.uid;
    const budgetData = {
      ...req.body,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('budgets').add(budgetData);
    const doc = await docRef.get();
    
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error creating budget:', error);
    res.status(500).json({ error: 'Failed to create budget' });
  }
});

// Update a budget
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('budgets').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await docRef.update(updateData);
    const updatedDoc = await docRef.get();
    
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({ error: 'Failed to update budget' });
  }
});

// Delete a budget
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('budgets').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    
    await docRef.delete();
    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('Error deleting budget:', error);
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

module.exports = router;
