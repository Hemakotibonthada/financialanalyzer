const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');

const db = admin.firestore();

// Get all incomes for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { startDate, endDate, source, category } = req.query;
    
    let query = db.collection('incomes').where('userId', '==', userId);
    
    const snapshot = await query.get();
    let incomes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Apply filters in memory to avoid Firestore index issues
    if (startDate) {
      const startTime = new Date(startDate).getTime();
      incomes = incomes.filter(inc => {
        const incomeDate = inc.date?.toDate ? inc.date.toDate() : new Date(inc.date);
        return incomeDate.getTime() >= startTime;
      });
    }
    
    if (endDate) {
      const endTime = new Date(endDate).getTime();
      incomes = incomes.filter(inc => {
        const incomeDate = inc.date?.toDate ? inc.date.toDate() : new Date(inc.date);
        return incomeDate.getTime() <= endTime;
      });
    }
    
    if (source) {
      incomes = incomes.filter(inc => inc.source === source);
    }
    
    if (category) {
      incomes = incomes.filter(inc => inc.category === category);
    }
    
    // Sort by date descending
    incomes.sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
    
    res.json({
      success: true,
      data: incomes
    });
  } catch (error) {
    console.error('Error fetching incomes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incomes',
      error: error.message
    });
  }
});

// Create a new income
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { description, amount, source, category, date, notes } = req.body;
    
    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }
    
    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Description is required'
      });
    }
    
    const incomeData = {
      userId,
      description: description.trim(),
      amount: parseFloat(amount),
      source: source || 'other',
      category: category || 'other',
      date: date ? admin.firestore.Timestamp.fromDate(new Date(date)) : admin.firestore.Timestamp.now(),
      notes: notes || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('incomes').add(incomeData);
    
    res.status(201).json({
      success: true,
      message: 'Income added successfully',
      data: {
        id: docRef.id,
        ...incomeData,
        date: incomeData.date.toDate().toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating income:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create income',
      error: error.message
    });
  }
});

// Get quick incomes for today
router.get('/quick-incomes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    
    // Set to start and end of day
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
    
    const snapshot = await db.collection('incomes')
      .where('userId', '==', userId)
      .get();
    
    let incomes = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(inc => {
        const incomeDate = inc.date?.toDate ? inc.date.toDate() : new Date(inc.date);
        return incomeDate >= startOfDay && incomeDate <= endOfDay;
      })
      .sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
    
    const total = incomes.reduce((sum, inc) => sum + (parseFloat(inc.amount) || 0), 0);
    
    res.json({
      success: true,
      data: {
        incomes,
        total,
        date: targetDate.toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error('Error fetching quick incomes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quick incomes',
      error: error.message
    });
  }
});

// Update an income
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const { description, amount, source, category, date, notes } = req.body;
    
    const docRef = db.collection('incomes').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Income not found'
      });
    }
    
    if (doc.data().userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (description !== undefined) updateData.description = description.trim();
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (source !== undefined) updateData.source = source;
    if (category !== undefined) updateData.category = category;
    if (date !== undefined) updateData.date = admin.firestore.Timestamp.fromDate(new Date(date));
    if (notes !== undefined) updateData.notes = notes;
    
    await docRef.update(updateData);
    
    res.json({
      success: true,
      message: 'Income updated successfully',
      data: {
        id,
        ...updateData
      }
    });
  } catch (error) {
    console.error('Error updating income:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update income',
      error: error.message
    });
  }
});

// Delete an income
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    const docRef = db.collection('incomes').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Income not found'
      });
    }
    
    if (doc.data().userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    await docRef.delete();
    
    res.json({
      success: true,
      message: 'Income deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting income:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete income',
      error: error.message
    });
  }
});

module.exports = router;
