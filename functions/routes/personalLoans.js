const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');
const db = admin.firestore();

// Helper function to calculate interest
const calculateInterest = (loan) => {
  const principal = parseFloat(loan.principalAmount || 0);
  const repaid = parseFloat(loan.repaidAmount || 0);
  const interestRate = parseFloat(loan.interestRate || 0);
  const interestType = loan.interestType || 'none';
  
  if (interestType === 'none' || interestRate === 0) {
    return {
      currentInterest: 0,
      outstandingAmount: principal - repaid
    };
  }
  
  // Calculate days since loan was taken
  const loanDate = loan.loanTakenDate?.toDate ? loan.loanTakenDate.toDate() : new Date(loan.loanTakenDate);
  const today = new Date();
  const daysSinceLoan = Math.floor((today - loanDate) / (1000 * 60 * 60 * 24));
  
  let currentInterest = 0;
  
  if (interestType === 'simple') {
    // Simple Interest: P * R * T / 100 (T in years)
    const years = daysSinceLoan / 365;
    currentInterest = (principal * interestRate * years) / 100;
  } else if (interestType === 'compound') {
    // Compound Interest (monthly): P * (1 + R/1200)^months - P
    const months = daysSinceLoan / 30;
    currentInterest = principal * (Math.pow(1 + interestRate / 1200, months) - 1);
  }
  
  // Outstanding = Principal - Repaid + Interest
  const outstandingAmount = principal - repaid + currentInterest;
  
  return {
    currentInterest: parseFloat(currentInterest.toFixed(2)),
    outstandingAmount: parseFloat(outstandingAmount.toFixed(2))
  };
};

// Get all personal loans
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('personalLoans')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const loans = snapshot.docs.map(doc => {
      const loanData = doc.data();
      const interestCalc = calculateInterest(loanData);
      
      return {
        id: doc.id,
        ...loanData,
        currentInterest: interestCalc.currentInterest,
        outstandingAmount: interestCalc.outstandingAmount
      };
    });
    
    res.json({ success: true, data: loans });
  } catch (error) {
    console.error('Error fetching personal loans:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch personal loans' });
  }
});

// Get summary of personal loans
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('personalLoans')
      .where('userId', '==', userId)
      .get();
    
    let totalBorrowed = 0;
    let totalRepaid = 0;
    let totalOutstanding = 0;
    let totalInterest = 0;
    let activeLoanCount = 0;
    let completedLoanCount = 0;
    
    snapshot.docs.forEach(doc => {
      const loan = doc.data();
      const principal = parseFloat(loan.principalAmount || 0);
      const repaid = parseFloat(loan.repaidAmount || 0);
      
      // Calculate interest
      const interestCalc = calculateInterest(loan);
      
      totalBorrowed += principal;
      totalRepaid += repaid;
      totalOutstanding += interestCalc.outstandingAmount;
      totalInterest += interestCalc.currentInterest;
      
      if (loan.status === 'active' && interestCalc.outstandingAmount > 0) {
        activeLoanCount++;
      } else if (loan.status === 'repaid' || interestCalc.outstandingAmount <= 0) {
        completedLoanCount++;
      }
    });
    
    res.json({
      success: true,
      data: {
        totalBorrowed,
        totalRepaid,
        totalOutstanding,
        totalInterest,
        activeLoanCount,
        completedLoanCount,
        totalLoanCount: snapshot.size
      }
    });
  } catch (error) {
    console.error('Error fetching personal loans summary:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch personal loans summary' });
  }
});

// Create new personal loan
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const loanData = {
      ...req.body,
      userId,
      status: 'active',
      repaidAmount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('personalLoans').add(loanData);
    const doc = await docRef.get();
    
    res.status(201).json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('Error creating personal loan:', error);
    res.status(500).json({ success: false, error: 'Failed to create personal loan' });
  }
});

// Get loan by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const doc = await db.collection('personalLoans').doc(req.params.id).get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ success: false, error: 'Personal loan not found' });
    }
    
    const loanData = doc.data();
    const interestCalc = calculateInterest(loanData);
    
    res.json({ 
      success: true, 
      data: { 
        id: doc.id, 
        ...loanData,
        currentInterest: interestCalc.currentInterest,
        outstandingAmount: interestCalc.outstandingAmount
      } 
    });
  } catch (error) {
    console.error('Error fetching personal loan:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch personal loan' });
  }
});

// Update loan
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('personalLoans').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ success: false, error: 'Personal loan not found' });
    }
    
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await docRef.update(updateData);
    const updatedDoc = await docRef.get();
    
    res.json({ success: true, data: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error) {
    console.error('Error updating personal loan:', error);
    res.status(500).json({ success: false, error: 'Failed to update personal loan' });
  }
});

// Delete loan
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('personalLoans').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ success: false, error: 'Personal loan not found' });
    }
    
    await docRef.delete();
    res.json({ success: true, message: 'Personal loan deleted successfully' });
  } catch (error) {
    console.error('Error deleting personal loan:', error);
    res.status(500).json({ success: false, error: 'Failed to delete personal loan' });
  }
});

// Add repayment to personal loan
router.post('/:id/repayment', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const loanId = req.params.id;
    const { amount } = req.body;
    
    const loanRef = db.collection('personalLoans').doc(loanId);
    const loanDoc = await loanRef.get();
    
    if (!loanDoc.exists || loanDoc.data().userId !== userId) {
      return res.status(404).json({ success: false, error: 'Personal loan not found' });
    }
    
    const loanData = loanDoc.data();
    const currentRepaid = parseFloat(loanData.repaidAmount || 0);
    const paymentAmount = parseFloat(amount);
    const principal = parseFloat(loanData.principalAmount || 0);
    const newRepaidAmount = currentRepaid + paymentAmount;
    
    // Calculate current interest to determine if fully repaid
    const interestCalc = calculateInterest(loanData);
    const totalOwed = interestCalc.outstandingAmount;
    
    const updateData = {
      repaidAmount: newRepaidAmount,
      lastRepaymentDate: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // If fully repaid (including interest), mark as complete
    if (newRepaidAmount >= totalOwed) {
      updateData.status = 'repaid';
      updateData.repaidDate = admin.firestore.FieldValue.serverTimestamp();
    }
    
    await loanRef.update(updateData);
    
    const updatedDoc = await loanRef.get();
    const updatedData = updatedDoc.data();
    const updatedInterestCalc = calculateInterest(updatedData);
    
    res.json({ 
      success: true, 
      data: { 
        id: updatedDoc.id, 
        ...updatedData,
        currentInterest: updatedInterestCalc.currentInterest,
        outstandingAmount: updatedInterestCalc.outstandingAmount
      } 
    });
  } catch (error) {
    console.error('Error adding repayment:', error);
    res.status(500).json({ success: false, error: 'Failed to add repayment' });
  }
});

// Mark loan as fully repaid
router.put('/:id/mark-repaid', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('personalLoans').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ success: false, error: 'Personal loan not found' });
    }
    
    const principal = parseFloat(doc.data().principalAmount || 0);
    
    await docRef.update({
      status: 'repaid',
      repaidAmount: principal,
      repaidDate: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    const updatedDoc = await docRef.get();
    res.json({ success: true, data: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error) {
    console.error('Error marking loan as repaid:', error);
    res.status(500).json({ success: false, error: 'Failed to mark loan as repaid' });
  }
});

module.exports = router;
