const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');

const db = admin.firestore();

// Search across all collections
router.get('/', async (req, res) => {
  try {
    const { q, type } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    // Placeholder for search implementation
    res.json({
      query: q,
      type: type || 'all',
      results: [],
      message: 'Search functionality - integrate with Algolia or Elasticsearch for production'
    });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ error: 'Failed to perform search' });
  }
});

// Search transactions
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { query, category, startDate, endDate, minAmount, maxAmount, type } = req.query;
    
    // Get all transactions for the user
    let transactionsQuery = db.collection('expenses').where('userId', '==', userId);
    
    const snapshot = await transactionsQuery.get();
    
    let transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      type: 'expense'
    }));
    
    // Also get income transactions
    const incomeSnapshot = await db.collection('incomes')
      .where('userId', '==', userId)
      .get();
    
    const incomes = incomeSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      type: 'income'
    }));
    
    transactions = [...transactions, ...incomes];
    
    // Filter by search query
    if (query) {
      const lowerQuery = query.toLowerCase();
      transactions = transactions.filter(t => 
        (t.description || '').toLowerCase().includes(lowerQuery) ||
        (t.category || '').toLowerCase().includes(lowerQuery) ||
        (t.notes || '').toLowerCase().includes(lowerQuery)
      );
    }
    
    // Filter by category
    if (category) {
      transactions = transactions.filter(t => t.category === category);
    }
    
    // Filter by type
    if (type) {
      transactions = transactions.filter(t => t.type === type);
    }
    
    // Filter by date range
    if (startDate) {
      transactions = transactions.filter(t => {
        const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
        return tDate >= new Date(startDate);
      });
    }
    
    if (endDate) {
      transactions = transactions.filter(t => {
        const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
        return tDate <= new Date(endDate);
      });
    }
    
    // Filter by amount range
    if (minAmount) {
      transactions = transactions.filter(t => 
        parseFloat(t.amount || 0) >= parseFloat(minAmount)
      );
    }
    
    if (maxAmount) {
      transactions = transactions.filter(t => 
        parseFloat(t.amount || 0) <= parseFloat(maxAmount)
      );
    }
    
    // Sort by date (newest first)
    transactions.sort((a, b) => {
      const aDate = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const bDate = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return bDate - aDate;
    });
    
    res.json({
      success: true,
      data: {
        transactions,
        count: transactions.length,
        filters: {
          query,
          category,
          startDate,
          endDate,
          minAmount,
          maxAmount,
          type
        }
      }
    });
  } catch (error) {
    console.error('Error searching transactions:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to search transactions' 
    });
  }
});

module.exports = router;
