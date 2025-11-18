const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const currencyService = require('../services/currencyConversionService');

/**
 * @route   GET /api/currency/supported
 * @desc    Get all supported currencies
 * @access  Public
 */
router.get('/supported', (req, res) => {
  try {
    const currencies = currencyService.getSupportedCurrencies();
    res.json(currencies);
  } catch (error) {
    console.error('Error fetching currencies:', error);
    res.status(500).json({ error: 'Failed to fetch currencies' });
  }
});

/**
 * @route   GET /api/currency/rates
 * @desc    Get latest exchange rates
 * @access  Private
 */
router.get('/rates', authenticate, async (req, res) => {
  try {
    const { base } = req.query;
    const rates = await currencyService.fetchExchangeRates(base);
    res.json(rates);
  } catch (error) {
    console.error('Error fetching rates:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
});

/**
 * @route   GET /api/currency/rates/historical
 * @desc    Get historical exchange rates
 * @access  Private
 */
router.get('/rates/historical', authenticate, async (req, res) => {
  try {
    const { date, base } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const rates = await currencyService.getHistoricalRates(date, base);
    res.json(rates);
  } catch (error) {
    console.error('Error fetching historical rates:', error);
    res.status(500).json({ error: 'Failed to fetch historical rates' });
  }
});

/**
 * @route   POST /api/currency/convert
 * @desc    Convert amount between currencies
 * @access  Private
 */
router.post('/convert', authenticate, async (req, res) => {
  try {
    const { amount, from, to, date } = req.body;
    
    if (!amount || !from || !to) {
      return res.status(400).json({ error: 'Amount, from, and to currencies are required' });
    }

    let conversion;
    if (date) {
      conversion = await currencyService.convertHistorical(amount, from, to, date);
    } else {
      conversion = await currencyService.convert(amount, from, to);
    }

    res.json(conversion);
  } catch (error) {
    console.error('Error converting currency:', error);
    res.status(500).json({ error: 'Failed to convert currency' });
  }
});

/**
 * @route   POST /api/currency/convert/multiple
 * @desc    Convert amount to multiple currencies
 * @access  Private
 */
router.post('/convert/multiple', authenticate, async (req, res) => {
  try {
    const { amount, from, to } = req.body;
    
    if (!amount || !from || !to || !Array.isArray(to)) {
      return res.status(400).json({ 
        error: 'Amount, from currency, and to currencies array are required' 
      });
    }

    const conversions = await currencyService.convertMultiple(amount, from, to);
    res.json(conversions);
  } catch (error) {
    console.error('Error converting to multiple currencies:', error);
    res.status(500).json({ error: 'Failed to convert to multiple currencies' });
  }
});

/**
 * @route   POST /api/currency/convert/bulk
 * @desc    Bulk convert transactions
 * @access  Private
 */
router.post('/convert/bulk', authenticate, async (req, res) => {
  try {
    const { transactions, targetCurrency } = req.body;
    
    if (!transactions || !Array.isArray(transactions) || !targetCurrency) {
      return res.status(400).json({ 
        error: 'Transactions array and target currency are required' 
      });
    }

    const results = await currencyService.convertTransactions(transactions, targetCurrency);
    res.json(results);
  } catch (error) {
    console.error('Error bulk converting:', error);
    res.status(500).json({ error: 'Failed to bulk convert transactions' });
  }
});

/**
 * @route   GET /api/currency/rate
 * @desc    Get exchange rate between two currencies
 * @access  Private
 */
router.get('/rate', authenticate, async (req, res) => {
  try {
    const { from, to } = req.query;
    
    if (!from || !to) {
      return res.status(400).json({ error: 'From and to currencies are required' });
    }

    const rate = await currencyService.getExchangeRate(from, to);
    
    if (!rate) {
      return res.status(404).json({ error: 'Exchange rate not found' });
    }

    res.json({ from, to, rate });
  } catch (error) {
    console.error('Error fetching rate:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rate' });
  }
});

/**
 * @route   GET /api/currency/trend
 * @desc    Get currency trend (daily change)
 * @access  Private
 */
router.get('/trend', authenticate, async (req, res) => {
  try {
    const { currency, base } = req.query;
    
    if (!currency) {
      return res.status(400).json({ error: 'Currency code is required' });
    }

    const trend = await currencyService.getCurrencyTrend(currency, base);
    
    if (!trend) {
      return res.status(404).json({ error: 'Trend data not available' });
    }

    res.json(trend);
  } catch (error) {
    console.error('Error fetching trend:', error);
    res.status(500).json({ error: 'Failed to fetch currency trend' });
  }
});

/**
 * @route   GET /api/currency/popular-pairs
 * @desc    Get popular currency pairs with rates
 * @access  Private
 */
router.get('/popular-pairs', authenticate, async (req, res) => {
  try {
    const pairs = await currencyService.getPopularPairs();
    res.json(pairs);
  } catch (error) {
    console.error('Error fetching popular pairs:', error);
    res.status(500).json({ error: 'Failed to fetch popular currency pairs' });
  }
});

/**
 * @route   GET /api/currency/symbol/:code
 * @desc    Get currency symbol
 * @access  Public
 */
router.get('/symbol/:code', (req, res) => {
  try {
    const symbol = currencyService.getCurrencySymbol(req.params.code);
    res.json({ code: req.params.code, symbol });
  } catch (error) {
    console.error('Error fetching symbol:', error);
    res.status(500).json({ error: 'Failed to fetch currency symbol' });
  }
});

/**
 * @route   POST /api/currency/format
 * @desc    Format amount with currency symbol
 * @access  Private
 */
router.post('/format', authenticate, (req, res) => {
  try {
    const { amount, currency, locale } = req.body;
    
    if (amount === undefined || !currency) {
      return res.status(400).json({ error: 'Amount and currency are required' });
    }

    const formatted = currencyService.formatCurrency(amount, currency, locale);
    res.json({ amount, currency, formatted });
  } catch (error) {
    console.error('Error formatting currency:', error);
    res.status(500).json({ error: 'Failed to format currency' });
  }
});

/**
 * @route   DELETE /api/currency/cache
 * @desc    Clear exchange rate cache
 * @access  Private (Admin)
 */
router.delete('/cache', authenticate, (req, res) => {
  try {
    const result = currencyService.clearCache();
    res.json(result);
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

/**
 * @route   GET /api/currency/cache/stats
 * @desc    Get cache statistics
 * @access  Private (Admin)
 */
router.get('/cache/stats', authenticate, (req, res) => {
  try {
    const stats = currencyService.getCacheStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    res.status(500).json({ error: 'Failed to fetch cache statistics' });
  }
});

module.exports = router;
