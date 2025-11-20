const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');

const db = admin.firestore();

// Get transactions analytics
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { period = '30' } = req.query;
    
    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    
    // Get expenses
    const expensesSnapshot = await db.collection('expenses')
      .where('userId', '==', userId)
      .get();
    
    // Get incomes
    const incomesSnapshot = await db.collection('incomes')
      .where('userId', '==', userId)
      .get();
    
    // Filter by date in application layer
    const expenses = expensesSnapshot.docs
      .map(doc => ({
        ...doc.data(),
        amount: parseFloat(doc.data().amount) || 0,
        date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date)
      }))
      .filter(exp => exp.date >= startDate);
    
    const incomes = incomesSnapshot.docs
      .map(doc => ({
        ...doc.data(),
        amount: parseFloat(doc.data().amount) || 0,
        date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date)
      }))
      .filter(inc => inc.date >= startDate);
    
    // Calculate totals
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
    
    // Category breakdown
    const categoryBreakdown = {};
    expenses.forEach(exp => {
      const category = exp.category || 'Other';
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + exp.amount;
    });
    
    // Daily trend
    const dailyTrend = {};
    expenses.forEach(exp => {
      const date = exp.date.toISOString().split('T')[0];
      dailyTrend[date] = (dailyTrend[date] || 0) + exp.amount;
    });
    
    res.json({
      success: true,
      data: {
        period: daysAgo,
        summary: {
          totalExpenses,
          totalIncome,
          netSavings: totalIncome - totalExpenses,
          transactionCount: expenses.length + incomes.length,
          averageDailySpend: totalExpenses / daysAgo
        },
        categoryBreakdown: Object.entries(categoryBreakdown).map(([category, amount]) => ({
          category,
          amount,
          percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
        })),
        dailyTrend: Object.entries(dailyTrend).map(([date, amount]) => ({
          date,
          amount
        })).sort((a, b) => a.date.localeCompare(b.date))
      }
    });
  } catch (error) {
    console.error('Transactions analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions analytics'
    });
  }
});

// Get all transactions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { startDate, endDate, limit = 50, category, type } = req.query;
    
    // Get expenses
    let expensesQuery = db.collection('expenses').where('userId', '==', userId);
    const expensesSnapshot = await expensesQuery.get();
    
    // Get incomes
    let incomesQuery = db.collection('incomes').where('userId', '==', userId);
    const incomesSnapshot = await incomesQuery.get();
    
    let transactions = [
      ...expensesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'expense',
        date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date)
      })),
      ...incomesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'income',
        date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date)
      }))
    ];
    
    // Filter by date range
    if (startDate) {
      const start = new Date(startDate);
      transactions = transactions.filter(t => t.date >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      transactions = transactions.filter(t => t.date <= end);
    }
    
    // Filter by category
    if (category) {
      transactions = transactions.filter(t => t.category === category);
    }
    
    // Filter by type
    if (type) {
      transactions = transactions.filter(t => t.type === type);
    }
    
    // Sort by date (newest first)
    transactions.sort((a, b) => b.date - a.date);
    
    // Apply limit
    transactions = transactions.slice(0, parseInt(limit));
    
    // Format dates for response
    transactions = transactions.map(t => ({
      ...t,
      date: t.date.toISOString()
    }));
    
    res.json({
      success: true,
      data: transactions,
      count: transactions.length
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions'
    });
  }
});

module.exports = router;
