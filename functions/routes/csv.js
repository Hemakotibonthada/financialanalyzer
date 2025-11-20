const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Import expenses from CSV
router.post('/import/expenses', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { data } = req.body;
    
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }
    
    const batch = db.batch();
    const imported = [];
    
    for (const row of data) {
      const expenseData = {
        ...row,
        userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = db.collection('expenses').doc();
      batch.set(docRef, expenseData);
      imported.push({ id: docRef.id, ...expenseData });
    }
    
    await batch.commit();
    res.json({ message: 'Expenses imported successfully', count: imported.length, data: imported });
  } catch (error) {
    console.error('Error importing expenses:', error);
    res.status(500).json({ error: 'Failed to import expenses' });
  }
});

// Export expenses to CSV
router.get('/export/expenses', async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('expenses')
      .where('userId', '==', userId)
      .orderBy('date', 'desc')
      .get();
    
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ data: expenses });
  } catch (error) {
    console.error('Error exporting expenses:', error);
    res.status(500).json({ error: 'Failed to export expenses' });
  }
});

// Import incomes from CSV
router.post('/import/incomes', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { data } = req.body;
    
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }
    
    const batch = db.batch();
    const imported = [];
    
    for (const row of data) {
      const incomeData = {
        ...row,
        userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = db.collection('incomes').doc();
      batch.set(docRef, incomeData);
      imported.push({ id: docRef.id, ...incomeData });
    }
    
    await batch.commit();
    res.json({ message: 'Incomes imported successfully', count: imported.length, data: imported });
  } catch (error) {
    console.error('Error importing incomes:', error);
    res.status(500).json({ error: 'Failed to import incomes' });
  }
});

// Export incomes to CSV
router.get('/export/incomes', async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('incomes')
      .where('userId', '==', userId)
      .orderBy('date', 'desc')
      .get();
    
    const incomes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ data: incomes });
  } catch (error) {
    console.error('Error exporting incomes:', error);
    res.status(500).json({ error: 'Failed to export incomes' });
  }
});

module.exports = router;
