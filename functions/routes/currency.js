const express = require('express');
const router = express.Router();

// Get exchange rates
router.get('/rates', async (req, res) => {
  try {
    const { base = 'USD' } = req.query;
    
    // Placeholder for currency conversion API integration
    const rates = {
      USD: 1.0,
      EUR: 0.85,
      GBP: 0.73,
      INR: 83.12,
      JPY: 149.50,
      AUD: 1.52,
      CAD: 1.36,
      CHF: 0.88
    };
    
    res.json({ base, rates, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error fetching currency rates:', error);
    res.status(500).json({ error: 'Failed to fetch currency rates' });
  }
});

// Convert currency
router.post('/convert', (req, res) => {
  try {
    const { amount, from, to } = req.body;
    
    if (!amount || !from || !to) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Placeholder conversion rates
    const rates = {
      USD: 1.0,
      EUR: 0.85,
      GBP: 0.73,
      INR: 83.12,
      JPY: 149.50
    };
    
    const fromRate = rates[from] || 1;
    const toRate = rates[to] || 1;
    const convertedAmount = (amount / fromRate) * toRate;
    
    res.json({
      originalAmount: amount,
      fromCurrency: from,
      toCurrency: to,
      convertedAmount: Math.round(convertedAmount * 100) / 100,
      rate: toRate / fromRate,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error converting currency:', error);
    res.status(500).json({ error: 'Failed to convert currency' });
  }
});

module.exports = router;
