const express = require('express');
const router = express.Router();

// Get spending predictions
router.get('/predict-spending', (req, res) => {
  try {
    const { category, months = 3 } = req.query;
    
    // Placeholder for ML model integration
    const predictions = [];
    for (let i = 1; i <= months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      predictions.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        predicted: Math.floor(Math.random() * 5000) + 2000,
        confidence: (Math.random() * 20 + 75).toFixed(2)
      });
    }
    
    res.json({
      category: category || 'All',
      predictions,
      model: 'ARIMA',
      accuracy: '85%'
    });
  } catch (error) {
    console.error('Error predicting spending:', error);
    res.status(500).json({ error: 'Failed to predict spending' });
  }
});

// Detect anomalies
router.get('/detect-anomalies', (req, res) => {
  try {
    // Placeholder for anomaly detection
    const anomalies = [
      {
        id: '1',
        type: 'unusual_spending',
        description: 'Spending 150% above average in Entertainment',
        severity: 'high',
        date: new Date().toISOString(),
        amount: 5000
      }
    ];
    
    res.json({ anomalies, detected: anomalies.length });
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    res.status(500).json({ error: 'Failed to detect anomalies' });
  }
});

// Budget recommendations
router.get('/recommend-budget', (req, res) => {
  try {
    // Placeholder for budget recommendations based on ML
    const recommendations = {
      totalIncome: 10000,
      recommended: {
        housing: { amount: 3000, percentage: 30 },
        food: { amount: 1500, percentage: 15 },
        transportation: { amount: 1000, percentage: 10 },
        utilities: { amount: 500, percentage: 5 },
        entertainment: { amount: 500, percentage: 5 },
        savings: { amount: 2000, percentage: 20 },
        other: { amount: 1500, percentage: 15 }
      }
    };
    
    res.json(recommendations);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

module.exports = router;
