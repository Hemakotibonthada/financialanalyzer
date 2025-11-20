const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Get portfolio overview
router.get('/overview', async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const [stocks, bonds, mutualFunds, etfs] = await Promise.all([
      db.collection('stocks').where('userId', '==', userId).get(),
      db.collection('bonds').where('userId', '==', userId).get(),
      db.collection('mutualFunds').where('userId', '==', userId).get(),
      db.collection('etfs').where('userId', '==', userId).get()
    ]);
    
    const calculateTotal = (snapshot) => {
      return snapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        return sum + ((data.quantity || 0) * (data.currentPrice || 0));
      }, 0);
    };
    
    const portfolio = {
      stocks: {
        count: stocks.size,
        value: calculateTotal(stocks)
      },
      bonds: {
        count: bonds.size,
        value: calculateTotal(bonds)
      },
      mutualFunds: {
        count: mutualFunds.size,
        value: calculateTotal(mutualFunds)
      },
      etfs: {
        count: etfs.size,
        value: calculateTotal(etfs)
      }
    };
    
    const totalValue = Object.values(portfolio).reduce((sum, item) => sum + item.value, 0);
    
    res.json({
      ...portfolio,
      totalValue,
      allocation: {
        stocks: totalValue > 0 ? ((portfolio.stocks.value / totalValue) * 100).toFixed(2) : 0,
        bonds: totalValue > 0 ? ((portfolio.bonds.value / totalValue) * 100).toFixed(2) : 0,
        mutualFunds: totalValue > 0 ? ((portfolio.mutualFunds.value / totalValue) * 100).toFixed(2) : 0,
        etfs: totalValue > 0 ? ((portfolio.etfs.value / totalValue) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching portfolio overview:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio overview' });
  }
});

// Get holdings
router.get('/holdings', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { type } = req.query;
    
    const collections = type ? [type] : ['stocks', 'bonds', 'mutualFunds', 'etfs'];
    const holdings = [];
    
    for (const collection of collections) {
      const snapshot = await db.collection(collection)
        .where('userId', '==', userId)
        .get();
      
      snapshot.docs.forEach(doc => {
        holdings.push({
          id: doc.id,
          type: collection,
          ...doc.data()
        });
      });
    }
    
    res.json(holdings);
  } catch (error) {
    console.error('Error fetching holdings:', error);
    res.status(500).json({ error: 'Failed to fetch holdings' });
  }
});

// Add holding
router.post('/holdings', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { type, ...holdingData } = req.body;
    
    if (!['stocks', 'bonds', 'mutualFunds', 'etfs'].includes(type)) {
      return res.status(400).json({ error: 'Invalid holding type' });
    }
    
    const data = {
      ...holdingData,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection(type).add(data);
    const doc = await docRef.get();
    
    res.status(201).json({ id: doc.id, type, ...doc.data() });
  } catch (error) {
    console.error('Error adding holding:', error);
    res.status(500).json({ error: 'Failed to add holding' });
  }
});

module.exports = router;
