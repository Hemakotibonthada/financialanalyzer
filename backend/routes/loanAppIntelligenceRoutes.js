/**
 * Loan-App & NBFC Intelligence Routes
 * Surfaces unsecured loan-app / NBFC EMIs and OVERDUE / collections detection
 * plus a debt-spiral verdict, derived from the user's stored Gmail emails.
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireFeature } = require('../middleware/entitlements');
const logger = require('../utils/logger');
const LoanAppIntelligenceService = require('../services/loanAppIntelligenceService');

const loanAppIntelligence = new LoanAppIntelligenceService();

// GET /api/loan-intelligence/analyze — per-lender loan-app/NBFC picture
router.get('/analyze', authenticate, requireFeature('debtSpiralMonitor'), async (req, res) => {
  try {
    const data = await loanAppIntelligence.analyzeLoans(req.user._id);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Loan intelligence analyze failed:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze loan emails' });
  }
});

// GET /api/loan-intelligence/spiral — debt-spiral verdict + supporting lenders
router.get('/spiral', authenticate, requireFeature('debtSpiralMonitor'), async (req, res) => {
  try {
    const data = await loanAppIntelligence.computeSpiral(req.user._id);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Loan intelligence spiral failed:', error);
    res.status(500).json({ success: false, message: 'Failed to compute debt-spiral analysis' });
  }
});

module.exports = router;
