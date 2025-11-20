const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Export all financial data
router.get('/all', async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const [expenses, incomes, budgets, goals, investments] = await Promise.all([
      db.collection('expenses').where('userId', '==', userId).get(),
      db.collection('incomes').where('userId', '==', userId).get(),
      db.collection('budgets').where('userId', '==', userId).get(),
      db.collection('goals').where('userId', '==', userId).get(),
      db.collection('investments').where('userId', '==', userId).get()
    ]);
    
    const exportData = {
      expenses: expenses.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      incomes: incomes.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      budgets: budgets.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      goals: goals.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      investments: investments.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    };
    
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Export specific collection
router.get('/:collection', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { collection } = req.params;
    
    const allowedCollections = ['expenses', 'incomes', 'budgets', 'goals', 'investments', 'loans', 'emi'];
    if (!allowedCollections.includes(collection)) {
      return res.status(400).json({ error: 'Invalid collection' });
    }
    
    const snapshot = await db.collection(collection)
      .where('userId', '==', userId)
      .get();
    
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({ collection, data });
  } catch (error) {
    console.error('Error exporting collection:', error);
    res.status(500).json({ error: 'Failed to export collection' });
  }
});

// Generate PDF report
router.post('/pdf', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { reportType, startDate, endDate } = req.body;
    
    // Placeholder for PDF generation
    res.json({ 
      message: 'PDF generation initiated',
      reportType,
      userId,
      dateRange: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

module.exports = router;
