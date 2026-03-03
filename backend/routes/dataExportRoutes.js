// ============================================================================
// Data Export Routes — CSV/JSON export for all financial data types
// ============================================================================
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const dataExportService = require('../services/dataExportService');
const logger = require('../utils/logger');

// GET /api/data-export/transactions
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const { format, startDate, endDate, category, type } = req.query;
    const result = await dataExportService.exportTransactions(req.user._id, { format, startDate, endDate, category, type });

    if (result.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.send(result.data);
    }
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Export transactions error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/data-export/budgets
router.get('/budgets', authenticate, async (req, res) => {
  try {
    const result = await dataExportService.exportBudgets(req.user._id, { format: req.query.format });
    if (result.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.send(result.data);
    }
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Export budgets error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/data-export/emis
router.get('/emis', authenticate, async (req, res) => {
  try {
    const result = await dataExportService.exportEMIs(req.user._id, { format: req.query.format });
    if (result.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.send(result.data);
    }
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Export EMIs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/data-export/investments
router.get('/investments', authenticate, async (req, res) => {
  try {
    const result = await dataExportService.exportInvestments(req.user._id, { format: req.query.format });
    if (result.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.send(result.data);
    }
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Export investments error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/data-export/goals
router.get('/goals', authenticate, async (req, res) => {
  try {
    const result = await dataExportService.exportGoals(req.user._id, { format: req.query.format });
    if (result.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.send(result.data);
    }
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Export goals error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/data-export/snapshot — Complete financial snapshot (JSON)
router.get('/snapshot', authenticate, async (req, res) => {
  try {
    const snapshot = await dataExportService.exportCompleteSnapshot(req.user._id, req.query);
    res.json({ success: true, ...snapshot });
  } catch (error) {
    logger.error('Export snapshot error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/data-export/category-report
router.get('/category-report', authenticate, async (req, res) => {
  try {
    const result = await dataExportService.exportCategoryReport(req.user._id, req.query);
    if (result.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.send(result.data);
    }
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Export category report error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
