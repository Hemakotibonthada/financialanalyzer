const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const recurringTransactionService = require('../services/recurringTransactionService');
const logger = require('../utils/logger');

// GET /api/recurring/detect
router.get('/detect', authenticate, async (req, res) => {
  try {
    const options = {
      startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
      minAmount: req.query.minAmount ? parseFloat(req.query.minAmount) : undefined,
      category: req.query.category
    };

    const result = await recurringTransactionService.detectRecurringTransactions(req.user.userId, options);
    res.json({ success: true, message: 'Recurring patterns detected successfully', data: result });
  } catch (error) {
    logger.error('Error detecting recurring patterns:', error);
    res.status(500).json({ success: false, message: 'Failed to detect recurring patterns', error: error.message });
  }
});

// POST /api/recurring/mark
router.post('/mark', authenticate, async (req, res) => {
  try {
    const { transactionIds, patternId, frequency } = req.body;
    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Transaction IDs must be a non-empty array' });
    }
    if (!patternId || !frequency) {
      return res.status(400).json({ success: false, message: 'Pattern ID and frequency are required' });
    }

    const result = await recurringTransactionService.markAsRecurring(transactionIds, patternId, frequency);
    res.json({ success: true, message: 'Transactions marked as recurring', data: { modifiedCount: result.modifiedCount } });
  } catch (error) {
    logger.error('Error marking transactions as recurring:', error);
    res.status(500).json({ success: false, message: 'Failed to mark transactions as recurring', error: error.message });
  }
});

// GET /api/recurring/predictions
router.get('/predictions', authenticate, async (req, res) => {
  try {
    const months = req.query.months ? parseInt(req.query.months) : 3;
    if (months < 1 || months > 12) {
      return res.status(400).json({ success: false, message: 'Months must be between 1 and 12' });
    }

    const result = await recurringTransactionService.predictFutureTransactions(req.user.userId, months);
    res.json({ success: true, message: 'Future transactions predicted successfully', data: result });
  } catch (error) {
    logger.error('Error predicting future transactions:', error);
    res.status(500).json({ success: false, message: 'Failed to predict future transactions', error: error.message });
  }
});

// GET /api/recurring/statistics
router.get('/statistics', authenticate, async (req, res) => {
  try {
    const stats = await recurringTransactionService.getStatistics(req.user.userId);
    res.json({ success: true, message: 'Statistics retrieved successfully', data: stats });
  } catch (error) {
    logger.error('Error getting recurring statistics:', error);
    res.status(500).json({ success: false, message: 'Failed to get statistics', error: error.message });
  }
});

// GET /api/recurring/patterns/:patternId
router.get('/patterns/:patternId', authenticate, async (req, res) => {
  try {
    const { patternId } = req.params;
    const result = await recurringTransactionService.detectRecurringTransactions(req.user.userId);
    const pattern = result.patterns.find(p => p.id === patternId);
    
    if (!pattern) {
      return res.status(404).json({ success: false, message: 'Pattern not found' });
    }

    res.json({ success: true, message: 'Pattern retrieved successfully', data: pattern });
  } catch (error) {
    logger.error('Error getting pattern details:', error);
    res.status(500).json({ success: false, message: 'Failed to get pattern details', error: error.message });
  }
});

// POST /api/recurring/auto-categorize
router.post('/auto-categorize', authenticate, async (req, res) => {
  try {
    const patterns = await recurringTransactionService.detectRecurringTransactions(req.user.userId);
    let categorizedCount = 0;

    for (const pattern of patterns.patterns) {
      if (pattern.confidence >= 70) {
        await recurringTransactionService.markAsRecurring(pattern.transactions.map(t => t.id), pattern.id, pattern.patternType);
        categorizedCount += pattern.transactions.length;
      }
    }

    res.json({
      success: true,
      message: 'Transactions auto-categorized successfully',
      data: {
        patternsFound: patterns.patterns.length,
        transactionsCategorized: categorizedCount,
        highConfidencePatterns: patterns.patterns.filter(p => p.confidence >= 70).length
      }
    });
  } catch (error) {
    logger.error('Error auto-categorizing transactions:', error);
    res.status(500).json({ success: false, message: 'Failed to auto-categorize transactions', error: error.message });
  }
});

module.exports = router;
