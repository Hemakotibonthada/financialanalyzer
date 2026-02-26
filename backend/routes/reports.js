// ============================================================
// Financial Analyzer - Reports Routes
// Feature #93: Report generation API endpoints
// ============================================================

const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middleware/auth');
const ReportGeneratorService = require('../services/reportGeneratorService');

// GET /api/reports/templates - List report templates
router.get('/templates', auth, (req, res) => {
  try {
    const result = ReportGeneratorService.getTemplates();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/reports/generate - Generate a report
router.post('/generate', auth, async (req, res) => {
  try {
    const { templateId, format, dateRange, filters } = req.body;
    if (!templateId) {
      return res.status(400).json({ success: false, error: 'templateId is required' });
    }
    const result = await ReportGeneratorService.generateReport(
      req.user._id || req.user.id,
      templateId,
      { format, dateRange, filters }
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/summary - Quick financial summary
router.get('/summary', auth, async (req, res) => {
  try {
    const period = req.query.period || 'month';
    const result = await ReportGeneratorService.getQuickSummary(req.user._id || req.user.id, period);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/reports/schedule - Schedule a recurring report
router.post('/schedule', auth, async (req, res) => {
  try {
    const { templateId, schedule } = req.body;
    if (!templateId) {
      return res.status(400).json({ success: false, error: 'templateId is required' });
    }
    const result = await ReportGeneratorService.scheduleReport(req.user._id || req.user.id, templateId, schedule || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
