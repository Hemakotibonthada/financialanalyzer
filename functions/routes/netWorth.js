const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Calculate net worth
router.get('/calculate', async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Fetch all assets and liabilities in parallel
    const [
      investmentsSnapshot,
      savingsSnapshot,
      realEstateSnapshot,
      loansSnapshot,
      creditCardsSnapshot
    ] = await Promise.all([
      db.collection('investments').where('userId', '==', userId).get(),
      db.collection('savings').where('userId', '==', userId).get(),
      db.collection('realEstate').where('userId', '==', userId).get(),
      db.collection('loans').where('userId', '==', userId).get(),
      db.collection('creditCards').where('userId', '==', userId).get()
    ]);
    
    // Calculate total assets
    let totalAssets = 0;
    
    investmentsSnapshot.docs.forEach(doc => {
      totalAssets += doc.data().currentValue || doc.data().amount || 0;
    });
    
    savingsSnapshot.docs.forEach(doc => {
      totalAssets += doc.data().balance || doc.data().amount || 0;
    });
    
    realEstateSnapshot.docs.forEach(doc => {
      totalAssets += doc.data().currentValue || doc.data().purchasePrice || 0;
    });
    
    // Calculate total liabilities
    let totalLiabilities = 0;
    
    loansSnapshot.docs.forEach(doc => {
      const loan = doc.data();
      totalLiabilities += (loan.amount || 0) - (loan.paidAmount || 0);
    });
    
    creditCardsSnapshot.docs.forEach(doc => {
      totalLiabilities += doc.data().outstandingAmount || 0;
    });
    
    const netWorth = totalAssets - totalLiabilities;
    
    res.json({
      totalAssets,
      totalLiabilities,
      netWorth,
      breakdown: {
        investments: investmentsSnapshot.size,
        savings: savingsSnapshot.size,
        realEstate: realEstateSnapshot.size,
        loans: loansSnapshot.size,
        creditCards: creditCardsSnapshot.size
      }
    });
  } catch (error) {
    console.error('Error calculating net worth:', error);
    res.status(500).json({ error: 'Failed to calculate net worth' });
  }
});

// Get net worth history
router.get('/history', async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('netWorthHistory')
      .where('userId', '==', userId)
      .orderBy('date', 'desc')
      .limit(12)
      .get();
    
    const history = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching net worth history:', error);
    res.status(500).json({ error: 'Failed to fetch net worth history' });
  }
});

// Save net worth snapshot
router.post('/snapshot', async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshotData = {
      ...req.body,
      userId,
      date: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('netWorthHistory').add(snapshotData);
    const doc = await docRef.get();
    
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error saving net worth snapshot:', error);
    res.status(500).json({ error: 'Failed to save net worth snapshot' });
  }
});

module.exports = router;
