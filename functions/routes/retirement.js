const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Get retirement plan
router.get('/plan', async (req, res) => {
  try {
    const userId = req.user.uid;
    const doc = await db.collection('retirementPlans').doc(userId).get();
    
    if (!doc.exists) {
      return res.json({
        targetAge: 60,
        currentAge: 30,
        targetAmount: 1000000,
        currentSavings: 0,
        monthlyContribution: 0
      });
    }
    
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching retirement plan:', error);
    res.status(500).json({ error: 'Failed to fetch retirement plan' });
  }
});

// Update retirement plan
router.put('/plan', async (req, res) => {
  try {
    const userId = req.user.uid;
    const planData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('retirementPlans').doc(userId).set(planData, { merge: true });
    const doc = await db.collection('retirementPlans').doc(userId).get();
    
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error updating retirement plan:', error);
    res.status(500).json({ error: 'Failed to update retirement plan' });
  }
});

// Calculate retirement projections
router.post('/calculate', (req, res) => {
  try {
    const { currentAge, retirementAge, currentSavings, monthlyContribution, expectedReturn } = req.body;
    
    if (!currentAge || !retirementAge || currentSavings === undefined || !monthlyContribution || !expectedReturn) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const yearsToRetirement = retirementAge - currentAge;
    const monthsToRetirement = yearsToRetirement * 12;
    const monthlyRate = expectedReturn / (12 * 100);
    
    // Future value calculation
    const futureValueOfCurrentSavings = currentSavings * Math.pow(1 + monthlyRate, monthsToRetirement);
    const futureValueOfContributions = monthlyContribution * 
      ((Math.pow(1 + monthlyRate, monthsToRetirement) - 1) / monthlyRate);
    
    const totalRetirementSavings = futureValueOfCurrentSavings + futureValueOfContributions;
    
    res.json({
      currentAge,
      retirementAge,
      yearsToRetirement,
      currentSavings,
      monthlyContribution,
      expectedReturn,
      projectedSavings: Math.round(totalRetirementSavings),
      contributions: Math.round(futureValueOfContributions),
      growth: Math.round(totalRetirementSavings - currentSavings - (monthlyContribution * monthsToRetirement))
    });
  } catch (error) {
    console.error('Error calculating retirement:', error);
    res.status(500).json({ error: 'Failed to calculate retirement projections' });
  }
});

module.exports = router;
