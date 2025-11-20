const express = require('express');
const admin = require('firebase-admin');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const db = admin.firestore();

// Generic CRUD routes for incomes, budgets, goals, emis, lenders, loans, bill-reminders

// Get all
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const collection = req.baseUrl.split('/').pop(); // Get collection name from URL
    
    const snapshot = await db.collection(collection)
      .where('userId', '==', userId)
      .get();
    
    const items = [];
    snapshot.forEach(doc => {
      items.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const collection = req.baseUrl.split('/').pop();
    
    const itemData = {
      ...req.body,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection(collection).add(itemData);
    const doc = await docRef.get();
    
    res.status(201).json({
      success: true,
      data: { id: doc.id, ...doc.data() }
    });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update
router.put('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const collection = req.baseUrl.split('/').pop();
    const itemId = req.params.id;
    
    const itemRef = db.collection(collection).doc(itemId);
    const doc = await itemRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    delete updateData.userId;
    
    await itemRef.update(updateData);
    const updated = await itemRef.get();
    
    res.json({
      success: true,
      data: { id: updated.id, ...updated.data() }
    });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const collection = req.baseUrl.split('/').pop();
    const itemId = req.params.id;
    
    const itemRef = db.collection(collection).doc(itemId);
    const doc = await itemRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    await itemRef.delete();
    
    res.json({ success: true, message: 'Item deleted' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
