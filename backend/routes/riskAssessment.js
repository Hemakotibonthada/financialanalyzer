// ============================================================
// Financial Analyzer - Risk Assessment Routes
// Feature #94: Risk assessment API endpoints
// ============================================================

const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middleware/auth');
const RiskAssessmentService = require('../services/riskAssessmentService');

// POST /api/risk-assessment/assess - Full risk assessment
router.post('/assess', auth, async (req, res) => {
  try {
    const result = await RiskAssessmentService.assessRisk(req.user._id || req.user.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/risk-assessment/quick - Quick risk check with defaults
router.get('/quick', auth, async (req, res) => {
  try {
    const result = await RiskAssessmentService.assessRisk(req.user._id || req.user.id, {});
    res.json({
      success: true,
      score: result.overallScore,
      riskLevel: result.riskLevel,
      topActions: (result.actionItems || []).slice(0, 3),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
