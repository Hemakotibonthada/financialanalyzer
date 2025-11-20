const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');

const db = admin.firestore();

// Get profile status
router.get('/profile-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    
    const hasProfile = userDoc.exists;
    const userData = userDoc.data();
    
    res.json({
      success: true,
      data: {
        hasProfile,
        isComplete: hasProfile && userData?.name && userData?.email,
        fields: {
          name: !!userData?.name,
          email: !!userData?.email,
          phone: !!userData?.phone,
          dateOfBirth: !!userData?.dateOfBirth
        }
      }
    });
  } catch (error) {
    console.error('Profile status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile status'
    });
  }
});

// Get supported currencies
router.get('/currencies', async (req, res) => {
  try {
    res.json({
      success: true,
      data: [
        { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
        { code: 'USD', symbol: '$', name: 'US Dollar' },
        { code: 'EUR', symbol: '€', name: 'Euro' },
        { code: 'GBP', symbol: '£', name: 'British Pound' },
        { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
        { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
        { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' }
      ]
    });
  } catch (error) {
    console.error('Currencies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch currencies'
    });
  }
});

// Get quick expenses for a date
router.get('/quick-expenses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    // Get expenses for the specified date - use string comparison for simplicity
    // Fetch expenses without orderBy to avoid index requirement
    const expensesSnapshot = await db.collection('expenses')
      .where('userId', '==', userId)
      .get();
    
    // Filter by date and sort in application layer
    const expenses = expensesSnapshot.docs
      .map(doc => {
        const data = doc.data();
        let expenseDate = date;
        
        // Handle different date formats
        if (data.date) {
          if (data.date.toDate) {
            expenseDate = data.date.toDate().toISOString().split('T')[0];
          } else if (typeof data.date === 'string') {
            expenseDate = data.date.split('T')[0];
          }
        }
        
        return {
          id: doc.id,
          ...data,
          date: expenseDate,
          dateObj: data.date?.toDate ? data.date.toDate() : new Date(data.date || Date.now())
        };
      })
      .filter(exp => exp.date === date)
      .sort((a, b) => b.dateObj - a.dateObj)
      .slice(0, 20);
    
    const total = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    
    res.json({
      success: true,
      data: {
        date,
        expenses,
        total: parseFloat(total.toFixed(2)),
        count: expenses.length
      }
    });
  } catch (error) {
    console.error('Quick expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quick expenses',
      error: error.message
    });
  }
});

// Analyze documents (placeholder for future implementation)
router.post('/analyze', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Document analysis feature coming soon',
      data: {
        status: 'pending',
        message: 'AI-powered document analysis will be available soon'
      }
    });
  } catch (error) {
    console.error('Analyze error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze documents'
    });
  }
});

// Get transactions
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { startDate, endDate, limit = 50 } = req.query;
    
    let query = db.collection('expenses').where('userId', '==', userId);
    
    if (startDate) {
      query = query.where('date', '>=', admin.firestore.Timestamp.fromDate(new Date(startDate)));
    }
    
    if (endDate) {
      query = query.where('date', '<=', admin.firestore.Timestamp.fromDate(new Date(endDate)));
    }
    
    const transactionsSnapshot = await query
      .orderBy('date', 'desc')
      .limit(parseInt(limit))
      .get();
    
    const transactions = transactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate ? doc.data().date.toDate().toISOString() : doc.data().date
    }));
    
    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions'
    });
  }
});

// Get transactions analytics
router.get('/transactions/analytics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { period = '30' } = req.query;
    
    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    
    // Get expenses
    const expensesSnapshot = await db.collection('expenses')
      .where('userId', '==', userId)
      .where('date', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .get();
    
    // Get incomes
    const incomesSnapshot = await db.collection('incomes')
      .where('userId', '==', userId)
      .where('date', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .get();
    
    const expenses = expensesSnapshot.docs.map(doc => ({
      ...doc.data(),
      amount: parseFloat(doc.data().amount) || 0
    }));
    
    const incomes = incomesSnapshot.docs.map(doc => ({
      ...doc.data(),
      amount: parseFloat(doc.data().amount) || 0
    }));
    
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
      const date = exp.date?.toDate ? exp.date.toDate().toISOString().split('T')[0] : 
                   new Date(exp.date).toISOString().split('T')[0];
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
          percentage: (amount / totalExpenses) * 100
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

// Get spending by category
router.get('/analytics/spending-by-category', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { startDate, endDate } = req.query;
    
    let query = db.collection('expenses').where('userId', '==', userId);
    
    if (startDate) {
      query = query.where('date', '>=', admin.firestore.Timestamp.fromDate(new Date(startDate)));
    }
    
    if (endDate) {
      query = query.where('date', '<=', admin.firestore.Timestamp.fromDate(new Date(endDate)));
    }
    
    const expensesSnapshot = await query.get();
    
    const categoryTotals = {};
    
    expensesSnapshot.forEach(doc => {
      const data = doc.data();
      const category = data.category || 'Uncategorized';
      const amount = parseFloat(data.amount) || 0;
      
      categoryTotals[category] = (categoryTotals[category] || 0) + amount;
    });
    
    const data = Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      amount: parseFloat(amount.toFixed(2))
    }));
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Spending by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch spending by category'
    });
  }
});

// Get monthly trends
router.get('/analytics/monthly-trends', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { months = 6 } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));
    
    const expensesSnapshot = await db.collection('expenses')
      .where('userId', '==', userId)
      .where('date', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .where('date', '<=', admin.firestore.Timestamp.fromDate(endDate))
      .get();
    
    const monthlyTotals = {};
    
    expensesSnapshot.forEach(doc => {
      const data = doc.data();
      const date = data.date?.toDate ? data.date.toDate() : new Date(data.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const amount = parseFloat(data.amount) || 0;
      
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + amount;
    });
    
    const data = Object.entries(monthlyTotals).map(([month, amount]) => ({
      month,
      amount: parseFloat(amount.toFixed(2))
    })).sort((a, b) => a.month.localeCompare(b.month));
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Monthly trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly trends'
    });
  }
});

// Document summary analytics
router.get('/analytics/document-summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const documentsSnapshot = await db.collection('documents')
      .where('userId', '==', userId)
      .get();
    
    const summary = {
      total: documentsSnapshot.size,
      byCategory: {},
      byType: {},
      totalSize: 0
    };
    
    documentsSnapshot.forEach(doc => {
      const data = doc.data();
      
      const category = data.category || 'other';
      summary.byCategory[category] = (summary.byCategory[category] || 0) + 1;
      
      const type = data.type || 'financial';
      summary.byType[type] = (summary.byType[type] || 0) + 1;
      
      summary.totalSize += data.fileSize || 0;
    });
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Document summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document summary'
    });
  }
});

// Quick expense
router.post('/quick-expense', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const expenseData = {
      ...req.body,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (expenseData.date) {
      expenseData.date = admin.firestore.Timestamp.fromDate(new Date(expenseData.date));
    }
    
    const expenseRef = await db.collection('expenses').add(expenseData);
    
    res.json({
      success: true,
      message: 'Expense added successfully',
      data: {
        id: expenseRef.id,
        ...expenseData
      }
    });
  } catch (error) {
    console.error('Quick expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add expense'
    });
  }
});

// Delete quick expense
router.delete('/quick-expense/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    const expenseRef = db.collection('expenses').doc(id);
    const expenseDoc = await expenseRef.get();
    
    if (!expenseDoc.exists || expenseDoc.data().userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }
    
    await expenseRef.delete();
    
    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete expense'
    });
  }
});

// Get expense history with filters
router.get('/expense-history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { limit = 100, offset = 0, search, category, range = 'month' } = req.query;
    
    console.log('Expense history request:', { userId, limit, offset, search, category, range });
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date(now);
    
    switch (range) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date(0); // Beginning of time
        break;
      case 'month':
      default:
        startDate.setMonth(now.getMonth() - 1);
        break;
    }
    
    // Build query - simplified to avoid index requirement
    // First, get all expenses for the user, then filter in memory
    let query = db.collection('expenses').where('userId', '==', userId);
    
    const expensesSnapshot = await query.get();
    
    let expenses = expensesSnapshot.docs.map(doc => ({
      _id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate ? doc.data().date.toDate().toISOString() : doc.data().date,
      amount: parseFloat(doc.data().amount) || 0
    }));
    
    console.log(`Total expenses before filtering: ${expenses.length}`);
    
    // Filter by date range
    const startDateTimestamp = startDate.getTime();
    expenses = expenses.filter(exp => {
      try {
        const expDate = new Date(exp.date);
        return expDate.getTime() >= startDateTimestamp;
      } catch (err) {
        return false;
      }
    });
    
    console.log(`Expenses after date filter: ${expenses.length}`);
    
    // Filter by category if specified
    if (category && category !== 'all') {
      expenses = expenses.filter(exp => exp.category === category);
      console.log(`Expenses after category filter: ${expenses.length}`);
    }
    
    // Apply search filter
    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim();
      expenses = expenses.filter(exp => {
        const description = (exp.description || '').toLowerCase();
        const expCategory = (exp.category || '').toLowerCase();
        return description.includes(searchLower) || expCategory.includes(searchLower);
      });
      console.log(`Expenses after search filter: ${expenses.length}`);
    }
    
    // Sort by date descending
    expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Apply pagination
    const total = expenses.length;
    const paginatedExpenses = expenses.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    console.log(`Returning ${paginatedExpenses.length} expenses out of ${total}`);
    
    res.json({
      success: true,
      expenses: paginatedExpenses,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > (parseInt(offset) + parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get expense history error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expense history',
      error: error.message
    });
  }
});

// Get expense templates
router.get('/expense-templates', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const templatesSnapshot = await db.collection('expenseTemplates')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const templates = templatesSnapshot.docs.map(doc => ({
      _id: doc.id,
      ...doc.data(),
      amount: parseFloat(doc.data().amount) || 0
    }));
    
    res.json({
      success: true,
      templates: templates
    });
  } catch (error) {
    console.error('Get expense templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expense templates'
    });
  }
});

// Create expense template
router.post('/expense-template', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const templateData = {
      ...req.body,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const templateRef = await db.collection('expenseTemplates').add(templateData);
    
    res.json({
      success: true,
      message: 'Template created successfully',
      data: {
        id: templateRef.id,
        ...templateData
      }
    });
  } catch (error) {
    console.error('Create expense template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create template'
    });
  }
});

// Delete expense template
router.delete('/expense-template/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    const templateRef = db.collection('expenseTemplates').doc(id);
    const templateDoc = await templateRef.get();
    
    if (!templateDoc.exists || templateDoc.data().userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }
    
    await templateRef.delete();
    
    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete template'
    });
  }
});

// Export expenses
router.get('/export-expenses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { format = 'json', startDate, endDate } = req.query;
    
    let query = db.collection('expenses').where('userId', '==', userId);
    
    if (startDate) {
      query = query.where('date', '>=', admin.firestore.Timestamp.fromDate(new Date(startDate)));
    }
    
    if (endDate) {
      query = query.where('date', '<=', admin.firestore.Timestamp.fromDate(new Date(endDate)));
    }
    
    const expensesSnapshot = await query.orderBy('date', 'desc').get();
    
    const expenses = expensesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate ? doc.data().date.toDate().toISOString() : doc.data().date
    }));
    
    if (format === 'json') {
      res.json({
        success: true,
        data: expenses
      });
    } else {
      // Return JSON for now, can add CSV/Excel later
      res.json({
        success: true,
        message: 'Export completed',
        data: expenses
      });
    }
  } catch (error) {
    console.error('Export expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export expenses'
    });
  }
});

// Credit score (placeholder)
router.post('/credit-score', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Credit score feature coming soon',
      data: {
        score: 0,
        message: 'Credit score calculation will be available soon'
      }
    });
  } catch (error) {
    console.error('Credit score error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate credit score'
    });
  }
});

// Credit detail (placeholder)
router.get('/credit-detail', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Credit detail feature coming soon',
      data: {}
    });
  } catch (error) {
    console.error('Credit detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch credit detail'
    });
  }
});

// Analyze all documents
router.post('/analyze-all', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Analyze all feature coming soon',
      data: {
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Analyze all error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze documents'
    });
  }
});

// Get reports
router.get('/reports', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const reportsSnapshot = await db.collection('reports')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    
    const reports = reportsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toISOString() : doc.data().createdAt
    }));
    
    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports'
    });
  }
});

// Get report by ID
router.get('/reports/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    const reportDoc = await db.collection('reports').doc(id).get();
    
    if (!reportDoc.exists || reportDoc.data().userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: reportDoc.id,
        ...reportDoc.data(),
        createdAt: reportDoc.data().createdAt?.toDate ? reportDoc.data().createdAt.toDate().toISOString() : reportDoc.data().createdAt
      }
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report'
    });
  }
});

// Get report status
router.get('/reports/:id/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    const reportDoc = await db.collection('reports').doc(id).get();
    
    if (!reportDoc.exists || reportDoc.data().userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        status: reportDoc.data().status || 'completed',
        progress: reportDoc.data().progress || 100
      }
    });
  } catch (error) {
    console.error('Get report status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report status'
    });
  }
});

// Delete report
router.delete('/reports/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    const reportDoc = await db.collection('reports').doc(id).get();
    
    if (!reportDoc.exists || reportDoc.data().userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    await db.collection('reports').doc(id).delete();
    
    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete report'
    });
  }
});

// Get charts
router.get('/charts/:reportId', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Charts feature coming soon',
      data: []
    });
  } catch (error) {
    console.error('Get charts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch charts'
    });
  }
});

// Get insights
router.get('/insights/:reportId', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Insights feature coming soon',
      data: []
    });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch insights'
    });
  }
});

// Get health score
router.get('/health-score', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Simple health score based on expenses
    const expensesSnapshot = await db.collection('expenses')
      .where('userId', '==', userId)
      .get();
    
    const totalExpenses = expensesSnapshot.size;
    const score = Math.min(100, Math.max(0, 100 - (totalExpenses / 10)));
    
    res.json({
      success: true,
      data: {
        score: Math.round(score),
        totalExpenses,
        message: 'Financial health score calculated'
      }
    });
  } catch (error) {
    console.error('Health score error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate health score'
    });
  }
});

// Export report
router.get('/export/:reportId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { reportId } = req.params;
    const { format = 'json' } = req.query;
    
    const reportDoc = await db.collection('reports').doc(reportId).get();
    
    if (!reportDoc.exists || reportDoc.data().userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Report exported',
      data: {
        id: reportDoc.id,
        ...reportDoc.data()
      }
    });
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export report'
    });
  }
});

module.exports = router;
