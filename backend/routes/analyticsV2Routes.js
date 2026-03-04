// ============================================================================
// Enterprise Analytics V2 Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const analyticsV2 = require('../services/enterpriseAnalyticsV2');
const logger = require('../utils/logger');

router.use(authenticate);

// GET /api/analytics-v2/dashboard — Complete dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const data = await analyticsV2.getDashboardAnalytics(req.user._id, parseInt(days));
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Analytics dashboard error:', error);
    res.status(500).json({ success: false, message: 'Analytics error', error: error.message });
  }
});

// GET /api/analytics-v2/alerts — Smart spending alerts
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await analyticsV2.getSpendingAlerts(req.user._id);
    res.json({ success: true, data: alerts });
  } catch (error) {
    logger.error('Alerts error:', error);
    res.status(500).json({ success: false, message: 'Failed to get alerts', error: error.message });
  }
});

// POST /api/analytics-v2/categorize — AI categorization
router.post('/categorize', async (req, res) => {
  try {
    const { description, amount } = req.body;
    const result = await analyticsV2.categorizeTransaction(description, amount, req.user._id);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Categorize error:', error);
    res.status(500).json({ success: false, message: 'Categorization error', error: error.message });
  }
});

module.exports = router;
