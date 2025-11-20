const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Export all user data
router.get('/export', async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const collections = [
      'expenses', 'incomes', 'budgets', 'goals', 'investments',
      'loans', 'emi', 'insurance', 'debts', 'subscriptions'
    ];
    
    const exportData = {};
    
    for (const collection of collections) {
      const snapshot = await db.collection(collection)
        .where('userId', '==', userId)
        .get();
      
      exportData[collection] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
    
    res.json({
      userId,
      exportDate: new Date().toISOString(),
      data: exportData
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Delete all user data
router.delete('/delete-all', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { confirm } = req.body;
    
    if (confirm !== 'DELETE_ALL_DATA') {
      return res.status(400).json({ 
        error: 'Confirmation required. Send { "confirm": "DELETE_ALL_DATA" }'
      });
    }
    
    const collections = [
      'expenses', 'incomes', 'budgets', 'goals', 'investments',
      'loans', 'emi', 'insurance', 'debts', 'subscriptions',
      'documents', 'notifications', 'activityLogs'
    ];
    
    let deletedCount = 0;
    
    for (const collection of collections) {
      const snapshot = await db.collection(collection)
        .where('userId', '==', userId)
        .get();
      
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        deletedCount++;
      });
      
      await batch.commit();
    }
    
    res.json({ 
      message: 'All user data deleted successfully',
      deletedCount
    });
  } catch (error) {
    console.error('Error deleting data:', error);
    res.status(500).json({ error: 'Failed to delete data' });
  }
});

// Import user data
router.post('/import', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { data } = req.body;
    
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Invalid data format' });
    }
    
    let importedCount = 0;
    
    for (const [collection, items] of Object.entries(data)) {
      if (Array.isArray(items)) {
        const batch = db.batch();
        
        items.forEach(item => {
          const docRef = db.collection(collection).doc();
          batch.set(docRef, {
            ...item,
            userId,
            importedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          importedCount++;
        });
        
        await batch.commit();
      }
    }
    
    res.json({ 
      message: 'Data imported successfully',
      importedCount
    });
  } catch (error) {
    console.error('Error importing data:', error);
    res.status(500).json({ error: 'Failed to import data' });
  }
});

// Get data statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const collections = [
      'expenses', 'incomes', 'budgets', 'goals', 'investments',
      'loans', 'emi', 'insurance', 'debts', 'subscriptions'
    ];
    
    const stats = {};
    
    for (const collection of collections) {
      const snapshot = await db.collection(collection)
        .where('userId', '==', userId)
        .get();
      
      stats[collection] = snapshot.size;
    }
    
    res.json({
      userId,
      totalDocuments: Object.values(stats).reduce((sum, count) => sum + count, 0),
      byCollection: stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
