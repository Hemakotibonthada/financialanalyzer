const express = require('express');
const admin = require('firebase-admin');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const db = admin.firestore();

// Get all expenses
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('expenses')
      .where('userId', '==', userId)
      .orderBy('date', 'desc')
      .get();
    
    const expenses = [];
    snapshot.forEach(doc => {
      expenses.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({ success: true, data: expenses });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create expense
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const expenseData = {
      ...req.body,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('expenses').add(expenseData);
    const doc = await docRef.get();
    
    res.status(201).json({
      success: true,
      data: { id: doc.id, ...doc.data() }
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update expense
router.put('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const expenseId = req.params.id;
    
    const expenseRef = db.collection('expenses').doc(expenseId);
    const doc = await expenseRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    delete updateData.userId; // Don't allow changing userId
    
    await expenseRef.update(updateData);
    const updated = await expenseRef.get();
    
    res.json({
      success: true,
      data: { id: updated.id, ...updated.data() }
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete expense
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const expenseId = req.params.id;
    
    const expenseRef = db.collection('expenses').doc(expenseId);
    const doc = await expenseRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    
    await expenseRef.delete();
    
    res.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
