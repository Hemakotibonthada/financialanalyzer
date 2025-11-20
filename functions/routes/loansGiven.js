const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');
const db = admin.firestore();

// Get all loans given
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('loansGiven')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const loans = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ success: true, data: loans });
  } catch (error) {
    console.error('Error fetching loans given:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch loans given' });
  }
});

// Get summary of loans given
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('loansGiven')
      .where('userId', '==', userId)
      .get();
    
    let totalLent = 0;
    let totalReceived = 0;
    let totalOutstanding = 0;
    let activeLoanCount = 0;
    let completedLoanCount = 0;
    
    snapshot.docs.forEach(doc => {
      const loan = doc.data();
      const amount = parseFloat(loan.amount || 0);
      const received = parseFloat(loan.receivedAmount || 0);
      const outstanding = amount - received;
      
      totalLent += amount;
      totalReceived += received;
      totalOutstanding += outstanding;
      
      if (outstanding > 0) {
        activeLoanCount++;
      } else {
        completedLoanCount++;
      }
    });
    
    res.json({
      success: true,
      data: {
        totalLent,
        totalReceived,
        totalOutstanding,
        activeLoanCount,
        completedLoanCount,
        totalLoanCount: snapshot.size
      }
    });
  } catch (error) {
    console.error('Error fetching loans given summary:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch loans given summary' });
  }
});

// Create new loan given
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const loanData = {
      ...req.body,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('loansGiven').add(loanData);
    const doc = await docRef.get();
    
    res.status(201).json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('Error creating loan given:', error);
    res.status(500).json({ success: false, error: 'Failed to create loan given' });
  }
});

// Get loan by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const doc = await db.collection('loansGiven').doc(req.params.id).get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ success: false, error: 'Loan not found' });
    }
    
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('Error fetching loan:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch loan' });
  }
});

// Update loan
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('loansGiven').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ success: false, error: 'Loan not found' });
    }
    
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await docRef.update(updateData);
    const updatedDoc = await docRef.get();
    
    res.json({ success: true, data: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error) {
    console.error('Error updating loan:', error);
    res.status(500).json({ success: false, error: 'Failed to update loan' });
  }
});

// Delete loan
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('loansGiven').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ success: false, error: 'Loan not found' });
    }
    
    await docRef.delete();
    res.json({ success: true, message: 'Loan deleted successfully' });
  } catch (error) {
    console.error('Error deleting loan:', error);
    res.status(500).json({ success: false, error: 'Failed to delete loan' });
  }
});

// Record payment received
router.post('/:id/repayment', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const loanId = req.params.id;
    const { amount, date, method, transactionId, notes } = req.body;
    
    const loanRef = db.collection('loansGiven').doc(loanId);
    const loanDoc = await loanRef.get();
    
    if (!loanDoc.exists || loanDoc.data().userId !== userId) {
      return res.status(404).json({ success: false, error: 'Loan not found' });
    }
    
    const currentReceived = parseFloat(loanDoc.data().receivedAmount || 0);
    const paymentAmount = parseFloat(amount);
    
    await loanRef.update({
      receivedAmount: currentReceived + paymentAmount,
      lastPaymentDate: date || admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    const updatedDoc = await loanRef.get();
    res.json({ success: true, data: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ success: false, error: 'Failed to record payment' });
  }
});

// Write off loan
router.put('/:id/write-off', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('loansGiven').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ success: false, error: 'Loan not found' });
    }
    
    await docRef.update({
      status: 'written-off',
      writtenOffDate: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    const updatedDoc = await docRef.get();
    res.json({ success: true, data: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error) {
    console.error('Error writing off loan:', error);
    res.status(500).json({ success: false, error: 'Failed to write off loan' });
  }
});

module.exports = router;
