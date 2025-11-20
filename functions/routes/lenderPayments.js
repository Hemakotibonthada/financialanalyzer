const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Get all lender payments
router.get('/', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { loanId } = req.query;
    
    let query = db.collection('lenderPayments').where('userId', '==', userId);
    if (loanId) {
      query = query.where('loanId', '==', loanId);
    }
    
    const snapshot = await query.orderBy('paymentDate', 'desc').get();
    
    const payments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(payments);
  } catch (error) {
    console.error('Error fetching lender payments:', error);
    res.status(500).json({ error: 'Failed to fetch lender payments' });
  }
});

// Create new payment
router.post('/', async (req, res) => {
  try {
    const userId = req.user.uid;
    const paymentData = {
      ...req.body,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('lenderPayments').add(paymentData);
    const doc = await docRef.get();
    
    // Update loan paid amount
    if (req.body.loanId) {
      const loanRef = db.collection('lenderLoans').doc(req.body.loanId);
      await loanRef.update({
        paidAmount: admin.firestore.FieldValue.increment(req.body.amount || 0),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// Get payment by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const doc = await db.collection('lenderPayments').doc(req.params.id).get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// Delete payment
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('lenderPayments').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    const paymentData = doc.data();
    
    // Revert loan paid amount
    if (paymentData.loanId) {
      const loanRef = db.collection('lenderLoans').doc(paymentData.loanId);
      await loanRef.update({
        paidAmount: admin.firestore.FieldValue.increment(-(paymentData.amount || 0)),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    await docRef.delete();
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

module.exports = router;
