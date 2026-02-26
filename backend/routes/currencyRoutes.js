const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// In-memory currency alerts store
const userAlerts = {};

const supportedCurrencies = {
  USD: { name: 'US Dollar', symbol: '$' },
  EUR: { name: 'Euro', symbol: '€' },
  GBP: { name: 'British Pound', symbol: '£' },
  JPY: { name: 'Japanese Yen', symbol: '¥' },
  AUD: { name: 'Australian Dollar', symbol: 'A$' },
  CAD: { name: 'Canadian Dollar', symbol: 'C$' },
  CHF: { name: 'Swiss Franc', symbol: 'Fr' },
  SGD: { name: 'Singapore Dollar', symbol: 'S$' },
  AED: { name: 'UAE Dirham', symbol: 'د.إ' },
  INR: { name: 'Indian Rupee', symbol: '₹' },
};

const baseRates = {
  USD: 83.45, EUR: 90.82, GBP: 105.30, JPY: 0.54,
  AUD: 54.20, CAD: 61.35, CHF: 94.10, SGD: 62.50, AED: 22.72, INR: 1.0,
};

/**
 * @route   GET /api/currency/rates
 * @desc    Get latest exchange rates (base INR)
 * @access  Private
 */
router.get('/rates', authenticate, async (req, res) => {
  try {
    const { base = 'INR' } = req.query;
    const rates = {};
    const baseRate = baseRates[base] || 1;
    Object.keys(baseRates).forEach(currency => {
      rates[currency] = +(baseRates[currency] / baseRate).toFixed(4);
    });
    res.json({
      success: true,
      base,
      lastUpdated: new Date().toISOString(),
      rates,
    });
  } catch (error) {
    console.error('Error fetching rates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch exchange rates' });
  }
});

/**
 * @route   POST /api/currency/convert
 * @desc    Convert between currencies
 * @access  Private
 */
router.post('/convert', authenticate, async (req, res) => {
  try {
    const { from, to, amount } = req.body;
    if (!from || !to || !amount) {
      return res.status(400).json({ success: false, error: 'from, to, and amount are required' });
    }
    if (!baseRates[from] || !baseRates[to]) {
      return res.status(400).json({ success: false, error: 'Unsupported currency' });
    }
    const inrAmount = amount * baseRates[from];
    const converted = inrAmount / baseRates[to];
    res.json({
      success: true,
      from, to,
      amount: Number(amount),
      converted: +converted.toFixed(4),
      rate: +(baseRates[from] / baseRates[to]).toFixed(6),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error converting currency:', error);
    res.status(500).json({ success: false, error: 'Failed to convert currency' });
  }
});

/**
 * @route   GET /api/currency/historical
 * @desc    Get historical exchange rates
 * @access  Private
 */
router.get('/historical', authenticate, async (req, res) => {
  try {
    const { from = 'USD', to = 'INR', period = '1M' } = req.query;
    const days = period === '1W' ? 7 : period === '1M' ? 30 : period === '3M' ? 90 : period === '6M' ? 180 : 365;
    const data = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      const baseVal = baseRates[from] / baseRates[to];
      return {
        date: date.toISOString().split('T')[0],
        rate: +(baseVal + (Math.random() - 0.5) * baseVal * 0.04).toFixed(4),
      };
    });
    res.json({ success: true, from, to, period, data });
  } catch (error) {
    console.error('Error fetching historical rates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch historical rates' });
  }
});

/**
 * @route   GET /api/currency/currencies
 * @desc    Get list of supported currencies
 * @access  Public
 */
router.get('/currencies', (req, res) => {
  try {
    res.json({ success: true, data: supportedCurrencies });
  } catch (error) {
    console.error('Error fetching currencies:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch currencies' });
  }
});

/**
 * @route   GET /api/currency/alerts
 * @desc    Get user currency alerts
 * @access  Private
 */
router.get('/alerts', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const alerts = userAlerts[userId] || [];
    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch currency alerts' });
  }
});

/**
 * @route   POST /api/currency/alerts
 * @desc    Create currency alert
 * @access  Private
 */
router.post('/alerts', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { from, to, targetRate, direction } = req.body;
    if (!from || !to || !targetRate) {
      return res.status(400).json({ success: false, error: 'from, to, and targetRate are required' });
    }
    if (!userAlerts[userId]) userAlerts[userId] = [];
    const alert = {
      id: Date.now().toString(),
      from, to,
      targetRate: Number(targetRate),
      direction: direction || 'above',
      currentRate: +(baseRates[from] / baseRates[to]).toFixed(4),
      active: true,
      createdAt: new Date().toISOString(),
    };
    userAlerts[userId].push(alert);
    res.status(201).json({ success: true, message: 'Alert created', data: alert });
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ success: false, error: 'Failed to create currency alert' });
  }
});

/**
 * @route   DELETE /api/currency/alerts/:id
 * @desc    Delete currency alert
 * @access  Private
 */
router.delete('/alerts/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    if (!userAlerts[userId]) return res.status(404).json({ success: false, error: 'No alerts found' });
    const index = userAlerts[userId].findIndex(a => a.id === id);
    if (index === -1) return res.status(404).json({ success: false, error: 'Alert not found' });
    userAlerts[userId].splice(index, 1);
    res.json({ success: true, message: 'Alert deleted' });
  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({ success: false, error: 'Failed to delete currency alert' });
  }
});

module.exports = router;
