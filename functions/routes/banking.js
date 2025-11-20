const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Get all bank accounts
router.get('/accounts', async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('bankAccounts')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const accounts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    res.status(500).json({ error: 'Failed to fetch bank accounts' });
  }
});

// Add bank account
router.post('/accounts', async (req, res) => {
  try {
    const userId = req.user.uid;
    const accountData = {
      ...req.body,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('bankAccounts').add(accountData);
    const doc = await docRef.get();
    
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error adding bank account:', error);
    res.status(500).json({ error: 'Failed to add bank account' });
  }
});

// Get bank transactions
router.get('/transactions', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { accountId } = req.query;
    
    let query = db.collection('bankTransactions').where('userId', '==', userId);
    if (accountId) {
      query = query.where('accountId', '==', accountId);
    }
    
    const snapshot = await query.orderBy('date', 'desc').limit(100).get();
    
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get account balance
router.get('/accounts/:id/balance', async (req, res) => {
  try {
    const userId = req.user.uid;
    const doc = await db.collection('bankAccounts').doc(req.params.id).get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ error: 'Bank account not found' });
    }
    
    const balance = doc.data().balance || 0;
    res.json({ accountId: doc.id, balance });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

module.exports = router;
