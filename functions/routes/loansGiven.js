const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');
const db = admin.firestore();

// Helper function to calculate interest for loans given
const calculateLoanGivenInterest = (loan) => {
  const amount = parseFloat(loan.amount || 0);
  const received = parseFloat(loan.receivedAmount || 0);
  const hasInterest = loan.hasInterest || false;
  const interestRate = parseFloat(loan.interestRate || 0);
  
  if (!hasInterest || interestRate === 0) {
    return {
      currentInterest: 0,
      remainingAmount: amount - received,
      totalRepaid: received,
      repaymentPercentage: amount > 0 ? ((received / amount) * 100).toFixed(1) : 0
    };
  }
  
  // Calculate days since loan was given
  const loanDate = loan.loanDate?.toDate ? loan.loanDate.toDate() : new Date(loan.loanDate);
  const today = new Date();
  const daysSinceLoan = Math.floor((today - loanDate) / (1000 * 60 * 60 * 24));
  
  // Simple Interest: P * R * T / 100 (T in years)
  const years = daysSinceLoan / 365;
  const currentInterest = (amount * interestRate * years) / 100;
  
  // Total amount owed = Principal + Interest
  const totalOwed = amount + currentInterest;
  const remainingAmount = totalOwed - received;
  
  return {
    currentInterest: parseFloat(currentInterest.toFixed(2)),
    remainingAmount: parseFloat(remainingAmount.toFixed(2)),
    totalRepaid: received,
    repaymentPercentage: totalOwed > 0 ? ((received / totalOwed) * 100).toFixed(1) : 0
  };
};

// Get all loans given
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('loansGiven')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const loans = snapshot.docs.map(doc => {
      const loanData = doc.data();
      const interestCalc = calculateLoanGivenInterest(loanData);
      
      return {
        id: doc.id,
        ...loanData,
        currentInterest: interestCalc.currentInterest,
        remainingAmount: interestCalc.remainingAmount,
        totalRepaid: interestCalc.totalRepaid,
        repaymentPercentage: interestCalc.repaymentPercentage
      };
    });
    
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
    let totalInterest = 0;
    let activeLoanCount = 0;
    let completedLoanCount = 0;
    
    snapshot.docs.forEach(doc => {
      const loan = doc.data();
      const amount = parseFloat(loan.amount || 0);
      const received = parseFloat(loan.receivedAmount || 0);
      
      // Calculate interest
      const interestCalc = calculateLoanGivenInterest(loan);
      
      totalLent += amount;
      totalReceived += received;
      totalOutstanding += interestCalc.remainingAmount;
      totalInterest += interestCalc.currentInterest;
      
      if (interestCalc.remainingAmount > 0) {
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
        totalInterest,
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
    
    const loanData = doc.data();
    const interestCalc = calculateLoanGivenInterest(loanData);
    
    res.json({ 
      success: true, 
      data: { 
        id: doc.id, 
        ...loanData,
        currentInterest: interestCalc.currentInterest,
        remainingAmount: interestCalc.remainingAmount,
        totalRepaid: interestCalc.totalRepaid,
        repaymentPercentage: interestCalc.repaymentPercentage
      } 
    });
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
    const updatedData = updatedDoc.data();
    const interestCalc = calculateLoanGivenInterest(updatedData);
    
    res.json({ 
      success: true, 
      data: { 
        id: updatedDoc.id, 
        ...updatedData,
        currentInterest: interestCalc.currentInterest,
        remainingAmount: interestCalc.remainingAmount,
        totalRepaid: interestCalc.totalRepaid,
        repaymentPercentage: interestCalc.repaymentPercentage
      } 
    });
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
