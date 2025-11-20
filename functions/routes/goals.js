const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();
const { authenticateToken } = require('../middleware/auth');

// Get all goals
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('goals')
      .where('userId', '==', userId)
      .orderBy('targetDate', 'asc')
      .get();
    
    const goals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      data: goals
    });
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// Create new goal
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const goalData = {
      ...req.body,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('goals').add(goalData);
    const doc = await docRef.get();
    
    res.status(201).json({
      success: true,
      data: { id: doc.id, ...doc.data() }
    });
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// Get goals summary (MUST be before /:id route)
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('goals')
      .where('userId', '==', userId)
      .get();
    
    const goals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const totalTargetAmount = goals.reduce((sum, goal) => sum + (parseFloat(goal.targetAmount) || 0), 0);
    const totalCurrentAmount = goals.reduce((sum, goal) => sum + (parseFloat(goal.currentAmount) || 0), 0);
    const completedGoals = goals.filter(goal => 
      (goal.currentAmount || 0) >= (goal.targetAmount || 0)
    ).length;
    
    res.json({
      success: true,
      data: {
        totalGoals: goals.length,
        completedGoals,
        activeGoals: goals.length - completedGoals,
        totalTargetAmount,
        totalCurrentAmount,
        overallProgress: totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0,
        goals
      }
    });
  } catch (error) {
    console.error('Error fetching goals summary:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch goals summary' 
    });
  }
});

// Get goal by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const doc = await db.collection('goals').doc(req.params.id).get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ 
        success: false,
        message: 'Goal not found' 
      });
    }
    
    res.json({
      success: true,
      data: { id: doc.id, ...doc.data() }
    });
  } catch (error) {
    console.error('Error fetching goal:', error);
    res.status(500).json({ error: 'Failed to fetch goal' });
  }
});

// Update goal
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('goals').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ 
        success: false,
        message: 'Goal not found' 
      });
    }
    
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await docRef.update(updateData);
    const updatedDoc = await docRef.get();
    
    res.json({
      success: true,
      data: { id: updatedDoc.id, ...updatedDoc.data() }
    });
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// Delete goal
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('goals').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ 
        success: false,
        message: 'Goal not found' 
      });
    }
    
    await docRef.delete();
    res.json({ 
      success: true,
      message: 'Goal deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

// Update goal progress
router.post('/:id/progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { amount } = req.body;
    
    const docRef = db.collection('goals').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ 
        success: false,
        message: 'Goal not found' 
      });
    }
    
    await docRef.update({
      currentAmount: admin.firestore.FieldValue.increment(amount),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    const updatedDoc = await docRef.get();
    res.json({
      success: true,
      data: { id: updatedDoc.id, ...updatedDoc.data() }
    });
  } catch (error) {
    console.error('Error updating goal progress:', error);
    res.status(500).json({ error: 'Failed to update goal progress' });
  }
});

// Add contribution to goal
router.post('/:id/contribute', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { amount, note } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid contribution amount is required' 
      });
    }
    
    const docRef = db.collection('goals').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ 
        success: false, 
        message: 'Goal not found' 
      });
    }
    
    const goalData = doc.data();
    const newCurrentAmount = (goalData.currentAmount || 0) + parseFloat(amount);
    
    // Add contribution record
    await db.collection('goal-contributions').add({
      goalId: req.params.id,
      userId,
      amount: parseFloat(amount),
      note: note || '',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Update goal
    await docRef.update({
      currentAmount: newCurrentAmount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    const updatedDoc = await docRef.get();
    res.json({ 
      success: true,
      data: { 
        id: updatedDoc.id, 
        ...updatedDoc.data() 
      } 
    });
  } catch (error) {
    console.error('Error adding contribution:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add contribution' 
    });
  }
});

// Add milestone to goal
router.post('/:id/milestone', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { title, targetAmount, targetDate, description } = req.body;
    
    if (!title || !targetAmount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title and target amount are required' 
      });
    }
    
    const docRef = db.collection('goals').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ 
        success: false, 
        message: 'Goal not found' 
      });
    }
    
    const goalData = doc.data();
    const milestones = goalData.milestones || [];
    
    milestones.push({
      id: Date.now().toString(),
      title,
      targetAmount: parseFloat(targetAmount),
      targetDate,
      description: description || '',
      completed: false,
      createdAt: new Date().toISOString()
    });
    
    await docRef.update({
      milestones,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    const updatedDoc = await docRef.get();
    res.json({ 
      success: true,
      data: { 
        id: updatedDoc.id, 
        ...updatedDoc.data() 
      } 
    });
  } catch (error) {
    console.error('Error adding milestone:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add milestone' 
    });
  }
});

module.exports = router;
