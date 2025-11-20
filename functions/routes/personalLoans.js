const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');
const db = admin.firestore();

// Get all personal loans
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('personalLoans')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const loans = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
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
    let activeLoanCount = 0;
    let completedLoanCount = 0;
    
    snapshot.docs.forEach(doc => {
      const loan = doc.data();
      const principal = parseFloat(loan.principalAmount || 0);
      const repaid = parseFloat(loan.repaidAmount || 0);
      const outstanding = principal - repaid;
      
      totalBorrowed += principal;
      totalRepaid += repaid;
      totalOutstanding += outstanding;
      
      if (loan.status === 'active' && outstanding > 0) {
        activeLoanCount++;
      } else if (loan.status === 'repaid' || outstanding <= 0) {
        completedLoanCount++;
      }
    });
    
    res.json({
      success: true,
      data: {
        totalBorrowed,
        totalRepaid,
        totalOutstanding,
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
    
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
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
    
    const currentRepaid = parseFloat(loanDoc.data().repaidAmount || 0);
    const paymentAmount = parseFloat(amount);
    const principal = parseFloat(loanDoc.data().principalAmount || 0);
    const newRepaidAmount = currentRepaid + paymentAmount;
    
    const updateData = {
      repaidAmount: newRepaidAmount,
      lastRepaymentDate: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // If fully repaid, mark as complete
    if (newRepaidAmount >= principal) {
      updateData.status = 'repaid';
      updateData.repaidDate = admin.firestore.FieldValue.serverTimestamp();
    }
    
    await loanRef.update(updateData);
    
    const updatedDoc = await loanRef.get();
    res.json({ success: true, data: { id: updatedDoc.id, ...updatedDoc.data() } });
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
