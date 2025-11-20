const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');
const db = admin.firestore();

// Get all lenders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('lenders')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const lenders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(lenders);
  } catch (error) {
    console.error('Error fetching lenders:', error);
    res.status(500).json({ error: 'Failed to fetch lenders' });
  }
});

// Create new lender
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const lenderData = {
      ...req.body,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('lenders').add(lenderData);
    const doc = await docRef.get();
    
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error creating lender:', error);
    res.status(500).json({ error: 'Failed to create lender' });
  }
});

// Get lender by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const doc = await db.collection('lenders').doc(req.params.id).get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ error: 'Lender not found' });
    }
    
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching lender:', error);
    res.status(500).json({ error: 'Failed to fetch lender' });
  }
});

// Update lender
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('lenders').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ error: 'Lender not found' });
    }
    
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await docRef.update(updateData);
    const updatedDoc = await docRef.get();
    
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Error updating lender:', error);
    res.status(500).json({ error: 'Failed to update lender' });
  }
});

// Delete lender
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('lenders').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ error: 'Lender not found' });
    }
    
    await docRef.delete();
    res.json({ message: 'Lender deleted successfully' });
  } catch (error) {
    console.error('Error deleting lender:', error);
    res.status(500).json({ error: 'Failed to delete lender' });
  }
});

// Get lender statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const lenderId = req.params.id;
    
    const lenderDoc = await db.collection('lenders').doc(lenderId).get();
    if (!lenderDoc.exists || lenderDoc.data().userId !== userId) {
      return res.status(404).json({ error: 'Lender not found' });
    }
    
    const loansSnapshot = await db.collection('lenderLoans')
      .where('lenderId', '==', lenderId)
      .get();
    
    const stats = {
      totalLoans: loansSnapshot.size,
      totalAmount: 0,
      totalPaid: 0,
      totalOutstanding: 0
    };
    
    loansSnapshot.docs.forEach(doc => {
      const loan = doc.data();
      stats.totalAmount += loan.amount || 0;
      stats.totalPaid += loan.paidAmount || 0;
      stats.totalOutstanding += (loan.amount || 0) - (loan.paidAmount || 0);
    });
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching lender stats:', error);
    res.status(500).json({ error: 'Failed to fetch lender statistics' });
  }
});

// Get lenders dashboard
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Get all lenders
    const lendersSnapshot = await db.collection('lenders')
      .where('userId', '==', userId)
      .get();
    
    const lenders = lendersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get all loans
    const loansSnapshot = await db.collection('lenderLoans')
      .where('userId', '==', userId)
      .get();
    
    const loans = loansSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Calculate summary statistics
    const totalLenders = lenders.length;
    const totalLoansGiven = loans.length;
    const totalAmountLent = loans.reduce((sum, loan) => sum + (parseFloat(loan.amount) || 0), 0);
    const totalAmountReceived = loans.reduce((sum, loan) => sum + (parseFloat(loan.paidAmount) || 0), 0);
    const totalOutstanding = totalAmountLent - totalAmountReceived;
    const activeLoans = loans.filter(loan => loan.status === 'active').length;
    
    // Get upcoming payments (next 30 days)
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const upcomingPayments = loans
      .filter(loan => {
        if (!loan.nextPaymentDate) return false;
        const paymentDate = new Date(loan.nextPaymentDate);
        return paymentDate >= now && paymentDate <= thirtyDaysLater;
      })
      .sort((a, b) => new Date(a.nextPaymentDate) - new Date(b.nextPaymentDate))
      .slice(0, 10);
    
    res.json({
      success: true,
      data: {
        summary: {
          totalLenders,
          totalLoansGiven,
          totalAmountLent,
          totalAmountReceived,
          totalOutstanding,
          activeLoans,
          completedLoans: totalLoansGiven - activeLoans
        },
        lenders,
        recentLoans: loans.slice(0, 10),
        upcomingPayments
      }
    });
  } catch (error) {
    console.error('Error fetching lenders dashboard:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch lenders dashboard' 
    });
  }
});

module.exports = router;
