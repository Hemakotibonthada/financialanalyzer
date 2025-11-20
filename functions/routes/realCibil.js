const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Get CIBIL score history
router.get('/history', async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('cibilHistory')
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
    console.error('Error fetching CIBIL history:', error);
    res.status(500).json({ error: 'Failed to fetch CIBIL history' });
  }
});

// Add CIBIL score entry
router.post('/score', async (req, res) => {
  try {
    const userId = req.user.uid;
    const scoreData = {
      ...req.body,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('cibilHistory').add(scoreData);
    const doc = await docRef.get();
    
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error adding CIBIL score:', error);
    res.status(500).json({ error: 'Failed to add CIBIL score' });
  }
});

// Get latest CIBIL score
router.get('/latest', async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('cibilHistory')
      .where('userId', '==', userId)
      .orderBy('date', 'desc')
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return res.json({ score: null, message: 'No CIBIL score found' });
    }
    
    const doc = snapshot.docs[0];
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching latest CIBIL score:', error);
    res.status(500).json({ error: 'Failed to fetch latest CIBIL score' });
  }
});

// Get credit report
router.get('/report', async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const [cibilScore, loans, creditCards] = await Promise.all([
      db.collection('cibilHistory')
        .where('userId', '==', userId)
        .orderBy('date', 'desc')
        .limit(1)
        .get(),
      db.collection('loans')
        .where('userId', '==', userId)
        .get(),
      db.collection('creditCards')
        .where('userId', '==', userId)
        .get()
    ]);
    
    const report = {
      latestScore: cibilScore.empty ? null : { id: cibilScore.docs[0].id, ...cibilScore.docs[0].data() },
      totalLoans: loans.size,
      totalCreditCards: creditCards.size,
      loans: loans.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      creditCards: creditCards.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    };
    
    res.json(report);
  } catch (error) {
    console.error('Error generating credit report:', error);
    res.status(500).json({ error: 'Failed to generate credit report' });
  }
});

module.exports = router;
