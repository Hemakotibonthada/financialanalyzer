const express = require('express');
const router = express.Router();
const SearchService = require('../services/searchService');
const { body, query, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');

// All search routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/search/transactions
 * @desc    Search transactions with full-text search
 * @access  Private
 */
router.get(
  '/transactions',
  [
    query('q').optional().trim(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('sortBy').optional().isIn(['date', 'amount', 'relevance']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
    query('type').optional().isIn(['debit', 'credit', 'transfer']),
    query('category').optional().trim(),
    query('paymentMethod').optional().isIn(['cash', 'card', 'upi', 'bank_transfer', 'wallet', 'net_banking', 'cheque', 'other']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('minAmount').optional().isFloat({ min: 0 }).toFloat(),
    query('maxAmount').optional().isFloat({ min: 0 }).toFloat(),
    query('merchantName').optional().trim(),
    query('isRecurring').optional().isBoolean().toBoolean(),
    query('isVerified').optional().isBoolean().toBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.id;
      const { q, ...options } = req.query;

      const results = await SearchService.searchTransactions(userId, q, options);

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Transaction search error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to search transactions'
      });
    }
  }
);

/**
 * @route   GET /api/search/global
 * @desc    Global search across all resource types
 * @access  Private
 */
router.get(
  '/global',
  [
    query('q').notEmpty().trim().withMessage('Search query is required'),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('types').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.id;
      const { q, limit, types } = req.query;

      const options = {
        limit: limit || 20
      };

      if (types) {
        options.types = types.split(',').map(t => t.trim());
      }

      const results = await SearchService.globalSearch(userId, q, options);

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Global search error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to perform global search'
      });
    }
  }
);

/**
 * @route   GET /api/search/suggestions
 * @desc    Get search suggestions/autocomplete
 * @access  Private
 */
router.get(
  '/suggestions',
  [
    query('q').notEmpty().trim().withMessage('Search prefix is required'),
    query('type').optional().isIn(['all', 'merchants', 'categories', 'descriptions', 'tags'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.id;
      const { q, type = 'all' } = req.query;

      const suggestions = await SearchService.getSuggestions(userId, q, type);

      res.json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      console.error('Suggestions error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get suggestions'
      });
    }
  }
);

/**
 * @route   GET /api/search/popular
 * @desc    Get popular search terms
 * @access  Private
 */
router.get('/popular', async (req, res) => {
  try {
    const userId = req.user.id;

    const popularTerms = await SearchService.getPopularSearchTerms(userId);

    res.json({
      success: true,
      data: popularTerms
    });
  } catch (error) {
    console.error('Popular terms error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get popular search terms'
    });
  }
});

/**
 * @route   POST /api/search/advanced
 * @desc    Advanced search with complex queries
 * @access  Private
 */
router.post(
  '/advanced',
  [
    body('query').optional().trim(),
    body('exactMatch').optional().isBoolean(),
    body('dateRange').optional().isObject(),
    body('dateRange.start').optional().isISO8601(),
    body('dateRange.end').optional().isISO8601(),
    body('amountRange').optional().isObject(),
    body('amountRange.min').optional().isFloat({ min: 0 }),
    body('amountRange.max').optional().isFloat({ min: 0 }),
    body('types').optional().isArray(),
    body('categories').optional().isArray(),
    body('paymentMethods').optional().isArray(),
    body('tags').optional().isArray(),
    body('merchants').optional().isArray(),
    body('isRecurring').optional().isBoolean(),
    body('isVerified').optional().isBoolean(),
    body('hasNotes').optional().isBoolean(),
    body('sortBy').optional().isIn(['date', 'amount', 'relevance']),
    body('sortOrder').optional().isIn(['asc', 'desc']),
    body('page').optional().isInt({ min: 1 }),
    body('limit').optional().isInt({ min: 1, max: 100 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.id;
      const searchParams = { ...req.body, userId };

      const results = await SearchService.advancedSearch(userId, searchParams);

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Advanced search error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to perform advanced search'
      });
    }
  }
);

/**
 * @route   GET /api/search/quick
 * @desc    Quick search for common queries
 * @access  Private
 */
router.get('/quick/:type', async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.params;

    let results;

    switch (type) {
      case 'recent':
        // Last 7 days transactions
        results = await SearchService.searchTransactions(userId, '', {
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          limit: 20
        });
        break;

      case 'large':
        // Transactions over 1000
        results = await SearchService.searchTransactions(userId, '', {
          minAmount: 1000,
          sortBy: 'amount',
          sortOrder: 'desc',
          limit: 20
        });
        break;

      case 'recurring':
        // Recurring transactions
        results = await SearchService.searchTransactions(userId, '', {
          isRecurring: true,
          limit: 20
        });
        break;

      case 'unverified':
        // Unverified transactions
        results = await SearchService.searchTransactions(userId, '', {
          isVerified: false,
          limit: 20
        });
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid quick search type. Use: recent, large, recurring, or unverified'
        });
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Quick search error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to perform quick search'
    });
  }
});

module.exports = router;
