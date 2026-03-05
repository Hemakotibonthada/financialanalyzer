/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  WEALTH MANAGEMENT ROUTES - API Routes for Wealth Management Features
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const wealthService = require('../services/wealthManagementService');
const wellnessService = require('../services/financialWellnessService');
const logger = require('../utils/logger');

// ─── Wealth Overview ─────────────────────────────────────────────────────────

router.get('/overview', authenticate, async (req, res) => {
  try {
    const data = await wealthService.getWealthOverview(req.user._id);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Wealth overview error:', error);
    res.status(500).json({ success: false, message: 'Failed to get wealth overview', error: error.message });
  }
});

router.get('/history', authenticate, async (req, res) => {
  try {
    const { days = 365 } = req.query;
    const data = await wealthService.getWealthHistory(req.user._id, parseInt(days));
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Wealth history error:', error);
    res.status(500).json({ success: false, message: 'Failed to get wealth history', error: error.message });
  }
});

router.get('/rebalancing', authenticate, async (req, res) => {
  try {
    const targetAllocation = req.query.targets ? JSON.parse(req.query.targets) : undefined;
    const data = await wealthService.getRebalancingRecommendations(req.user._id, targetAllocation);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Rebalancing error:', error);
    res.status(500).json({ success: false, message: 'Failed to compute rebalancing', error: error.message });
  }
});

router.get('/fire-metrics', authenticate, async (req, res) => {
  try {
    const { retirementAge = 60 } = req.query;
    const data = await wealthService.calculateFIREMetrics(req.user._id, parseInt(retirementAge));
    res.json({ success: true, data });
  } catch (error) {
    logger.error('FIRE metrics error:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate FIRE metrics', error: error.message });
  }
});

// ─── Financial Wellness ──────────────────────────────────────────────────────

router.get('/wellness-score', authenticate, async (req, res) => {
  try {
    const data = await wellnessService.calculateWellnessScore(req.user._id);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Wellness score error:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate wellness score', error: error.message });
  }
});

router.get('/wellness-history', authenticate, async (req, res) => {
  try {
    // Return empty history for now - would be populated by scheduled jobs
    res.json({ success: true, data: [] });
  } catch (error) {
    logger.error('Wellness history error:', error);
    res.status(500).json({ success: false, message: 'Failed to get wellness history', error: error.message });
  }
});

router.get('/action-items', authenticate, async (req, res) => {
  try {
    const wellness = await wellnessService.calculateWellnessScore(req.user._id);
    res.json({ success: true, data: wellness.actionItems || [] });
  } catch (error) {
    logger.error('Action items error:', error);
    res.status(500).json({ success: false, message: 'Failed to get action items', error: error.message });
  }
});

module.exports = router;
