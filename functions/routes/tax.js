const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Get all tax records
router.get('/records', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { year } = req.query;
    
    let query = db.collection('taxRecords').where('userId', '==', userId);
    if (year) {
      query = query.where('year', '==', parseInt(year));
    }
    
    const snapshot = await query.orderBy('year', 'desc').get();
    
    const records = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(records);
  } catch (error) {
    console.error('Error fetching tax records:', error);
    res.status(500).json({ error: 'Failed to fetch tax records' });
  }
});

// Add tax record
router.post('/records', async (req, res) => {
  try {
    const userId = req.user.uid;
    const recordData = {
      ...req.body,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('taxRecords').add(recordData);
    const doc = await docRef.get();
    
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error adding tax record:', error);
    res.status(500).json({ error: 'Failed to add tax record' });
  }
});

// Calculate tax estimate
router.post('/calculate', (req, res) => {
  try {
    const { income, deductions = 0, taxYear = new Date().getFullYear() } = req.body;
    
    if (!income) {
      return res.status(400).json({ error: 'Income is required' });
    }
    
    const taxableIncome = Math.max(0, income - deductions);
    
    // Simplified tax calculation (India tax slabs for example)
    let tax = 0;
    if (taxableIncome <= 250000) {
      tax = 0;
    } else if (taxableIncome <= 500000) {
      tax = (taxableIncome - 250000) * 0.05;
    } else if (taxableIncome <= 750000) {
      tax = 12500 + (taxableIncome - 500000) * 0.10;
    } else if (taxableIncome <= 1000000) {
      tax = 37500 + (taxableIncome - 750000) * 0.15;
    } else if (taxableIncome <= 1250000) {
      tax = 75000 + (taxableIncome - 1000000) * 0.20;
    } else if (taxableIncome <= 1500000) {
      tax = 125000 + (taxableIncome - 1250000) * 0.25;
    } else {
      tax = 187500 + (taxableIncome - 1500000) * 0.30;
    }
    
    res.json({
      taxYear,
      grossIncome: income,
      deductions,
      taxableIncome,
      estimatedTax: Math.round(tax),
      effectiveRate: income > 0 ? ((tax / income) * 100).toFixed(2) : 0
    });
  } catch (error) {
    console.error('Error calculating tax:', error);
    res.status(500).json({ error: 'Failed to calculate tax' });
  }
});

// Get tax deductions
router.get('/deductions', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { year } = req.query;
    
    let query = db.collection('taxDeductions').where('userId', '==', userId);
    if (year) {
      query = query.where('year', '==', parseInt(year));
    }
    
    const snapshot = await query.get();
    
    const deductions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(deductions);
  } catch (error) {
    console.error('Error fetching deductions:', error);
    res.status(500).json({ error: 'Failed to fetch deductions' });
  }
});

module.exports = router;
