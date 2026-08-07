// ============================================================================
// ENTERPRISE API ROUTES — Wires new enterprise services to HTTP endpoints
// ============================================================================
// Routes for prediction engine, risk assessment, tax engine, report generator,
// and the security middleware.
// ============================================================================

const express = require('express');
const router = express.Router();

// ── Services ──
let predictionEngine, riskAssessmentService, taxEngine, reportGenerator;

try { predictionEngine = require('../services/enterprisePredictionEngine').predictionEngine; } catch (e) { console.warn('[Enterprise Routes] Prediction engine not available:', e.message); }
try { riskAssessmentService = require('../services/enterpriseRiskAssessment').riskAssessmentService; } catch (e) { console.warn('[Enterprise Routes] Risk assessment not available:', e.message); }
try { taxEngine = require('../services/enterpriseTaxEngine').taxEngine; } catch (e) { console.warn('[Enterprise Routes] Tax engine not available:', e.message); }
try { reportGenerator = require('../services/enterpriseReportGenerator').reportGenerator; } catch (e) { console.warn('[Enterprise Routes] Report generator not available:', e.message); }

// ── Auth middleware ──
// Auth is required, not optional. Previously this fell back to
// `(req, res, next) => next()` when the require failed, which would have
// silently exposed all 19 endpoints below - including the prediction engine -
// to unauthenticated callers. A missing auth module must crash at boot.
const { authenticate: authMiddleware } = require('../middleware/auth');

// ============================================================================
// §1  PREDICTION ENDPOINTS
// ============================================================================

/**
 * POST /api/enterprise/predictions/spending
 * Predict future spending based on transaction history
 */
router.post('/predictions/spending', authMiddleware, async (req, res) => {
  try {
    if (!predictionEngine) return res.status(503).json({ success: false, error: 'Prediction engine not available' });

    const { transactions, days = 30 } = req.body;
    const result = predictionEngine.predictSpending(transactions || [], days);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Predictions] Spending error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/enterprise/predictions/anomalies
 * Detect anomalous transactions
 */
router.post('/predictions/anomalies', authMiddleware, async (req, res) => {
  try {
    if (!predictionEngine) return res.status(503).json({ success: false, error: 'Prediction engine not available' });

    const { transactions } = req.body;
    const result = predictionEngine.detectAnomalies(transactions || []);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Predictions] Anomaly error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/enterprise/predictions/categorize
 * Auto-categorize transactions using Naive Bayes
 */
router.post('/predictions/categorize', authMiddleware, async (req, res) => {
  try {
    if (!predictionEngine) return res.status(503).json({ success: false, error: 'Prediction engine not available' });

    const { description, amount, transactions } = req.body;
    // Train on existing transactions
    if (transactions && transactions.length > 0) {
      predictionEngine.train(transactions);
    }
    const result = predictionEngine.categorize(description, amount);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Predictions] Categorize error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/enterprise/predictions/insights
 * Generate comprehensive AI insights
 */
router.post('/predictions/insights', authMiddleware, async (req, res) => {
  try {
    if (!predictionEngine) return res.status(503).json({ success: false, error: 'Prediction engine not available' });

    const { transactions, budgets, goals } = req.body;
    const result = predictionEngine.generateInsights(transactions || [], budgets || [], goals || []);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Predictions] Insights error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/enterprise/predictions/goals
 * Get goal achievement advice
 */
router.post('/predictions/goals', authMiddleware, async (req, res) => {
  try {
    if (!predictionEngine) return res.status(503).json({ success: false, error: 'Prediction engine not available' });

    const { goals, transactions } = req.body;
    const result = predictionEngine.adviseGoals(goals || [], transactions || []);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Predictions] Goals error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// §2  RISK ASSESSMENT ENDPOINTS
// ============================================================================

/**
 * POST /api/enterprise/risk/assess
 * Comprehensive risk assessment
 */
router.post('/risk/assess', authMiddleware, async (req, res) => {
  try {
    if (!riskAssessmentService) return res.status(503).json({ success: false, error: 'Risk assessment not available' });

    const { financialData } = req.body;
    const result = await riskAssessmentService.assessRisk(financialData || {});
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Risk] Assessment error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/enterprise/risk/simulate
 * Monte Carlo simulation
 */
router.post('/risk/simulate', authMiddleware, async (req, res) => {
  try {
    if (!riskAssessmentService) return res.status(503).json({ success: false, error: 'Risk assessment not available' });

    const { financialData, simulations = 1000, months = 12 } = req.body;
    const result = riskAssessmentService.runMonteCarloSimulation(financialData || {}, simulations, months);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Risk] Simulation error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/enterprise/risk/stress-test
 * Stress test scenarios
 */
router.post('/risk/stress-test', authMiddleware, async (req, res) => {
  try {
    if (!riskAssessmentService) return res.status(503).json({ success: false, error: 'Risk assessment not available' });

    const { financialData } = req.body;
    const result = riskAssessmentService.stressTest(financialData || {});
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Risk] Stress test error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// §3  TAX ENGINE ENDPOINTS
// ============================================================================

/**
 * POST /api/enterprise/tax/calculate
 * Calculate tax under both regimes
 */
router.post('/tax/calculate', authMiddleware, async (req, res) => {
  try {
    if (!taxEngine) return res.status(503).json({ success: false, error: 'Tax engine not available' });

    const { income, deductions, age, riskAppetite } = req.body;
    const result = taxEngine.getComprehensivePlan({
      income: income || {},
      deductions: deductions || {},
      age: age || 30,
      riskAppetite: riskAppetite || 'moderate',
    });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Tax] Calculation error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/enterprise/tax/calendar
 * Get tax calendar events
 */
router.get('/tax/calendar', authMiddleware, async (req, res) => {
  try {
    if (!taxEngine) return res.status(503).json({ success: false, error: 'Tax engine not available' });

    const result = taxEngine.getTaxCalendar();
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Tax] Calendar error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// §4  REPORT GENERATOR ENDPOINTS
// ============================================================================

/**
 * POST /api/enterprise/reports/generate
 * Generate comprehensive financial report
 */
router.post('/reports/generate', authMiddleware, async (req, res) => {
  try {
    if (!reportGenerator) return res.status(503).json({ success: false, error: 'Report generator not available' });

    const { transactions, investments, debts, creditData, period = 'monthly', type = 'executive' } = req.body;

    let result;
    switch (type) {
      case 'executive':
        result = reportGenerator.generateExecutiveSummary(transactions || [], period);
        break;
      case 'income-expense':
        result = reportGenerator.generateIncomeExpenseReport(transactions || [], period);
        break;
      case 'investment':
        result = reportGenerator.generateInvestmentReport(investments || []);
        break;
      case 'debt':
        result = reportGenerator.generateDebtReport(debts || []);
        break;
      case 'cashflow':
        result = reportGenerator.generateCashFlowReport(transactions || [], period);
        break;
      case 'credit':
        result = reportGenerator.generateCreditReport(creditData || {});
        break;
      case 'full':
        result = reportGenerator.generateFullReport({
          transactions: transactions || [],
          investments: investments || [],
          debts: debts || [],
          creditData: creditData || {},
          period,
        });
        break;
      default:
        result = reportGenerator.generateExecutiveSummary(transactions || [], period);
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Reports] Generation error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// §5  HEALTH & SECURITY ENDPOINTS
// ============================================================================

/**
 * GET /api/enterprise/health
 * System health check
 */
router.get('/health', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        predictionEngine: !!predictionEngine,
        riskAssessment: !!riskAssessmentService,
        taxEngine: !!taxEngine,
        reportGenerator: !!reportGenerator,
        mongodb: mongoose.connection.readyState === 1,
      },
      node: process.version,
    };

    const allServicesUp = Object.values(health.services).every(Boolean);
    health.status = allServicesUp ? 'healthy' : 'degraded';

    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (err) {
    res.status(503).json({ status: 'error', error: err.message });
  }
});

/**
 * GET /api/enterprise/security/audit
 * Get security audit logs (admin only)
 */
router.get('/security/audit', authMiddleware, async (req, res) => {
  try {
    const { auditLogger } = require('../middleware/enterpriseSecurity');
    const { count = 50, action, userId } = req.query;
    const logs = auditLogger.getRecentLogs(parseInt(count) || 50, { action, userId });
    res.json({ success: true, data: logs });
  } catch (err) {
    console.error('[Security] Audit error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/enterprise/security/report
 * Get security report (admin only)
 */
router.get('/security/report', authMiddleware, async (req, res) => {
  try {
    const { auditLogger } = require('../middleware/enterpriseSecurity');
    const report = auditLogger.getSecurityReport();
    res.json({ success: true, data: report });
  } catch (err) {
    console.error('[Security] Report error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// §6  AI TRAINING PIPELINE ENDPOINTS
// ============================================================================
let trainingPipeline;
try { trainingPipeline = require('../services/enterpriseTrainingPipeline').trainingPipeline; } catch (e) { console.warn('[Enterprise Routes] Training pipeline not available:', e.message); }

/**
 * POST /api/enterprise/training/ingest
 * Ingest transactions for AI self-training
 */
router.post('/training/ingest', authMiddleware, async (req, res) => {
  try {
    if (!trainingPipeline) return res.status(503).json({ success: false, error: 'Training pipeline unavailable' });
    const { transactions } = req.body;
    const result = await trainingPipeline.ingestTransactions(transactions || []);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Training] Ingest error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/enterprise/training/predict
 * Predict spending amount for a transaction
 */
router.post('/training/predict', authMiddleware, async (req, res) => {
  try {
    if (!trainingPipeline) return res.status(503).json({ success: false, error: 'Training pipeline unavailable' });
    const result = trainingPipeline.predictSpending(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/enterprise/training/classify
 * Classify a transaction category from description
 */
router.post('/training/classify', authMiddleware, async (req, res) => {
  try {
    if (!trainingPipeline) return res.status(503).json({ success: false, error: 'Training pipeline unavailable' });
    const { description } = req.body;
    const result = trainingPipeline.classifyCategory(description || '');
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/enterprise/training/metrics
 * Get AI pipeline training metrics
 */
router.get('/training/metrics', authMiddleware, async (req, res) => {
  try {
    if (!trainingPipeline) return res.status(503).json({ success: false, error: 'Training pipeline unavailable' });
    const metrics = trainingPipeline.getMetrics();
    res.json({ success: true, data: metrics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/enterprise/training/trends
 * Detect spending trends
 */
router.get('/training/trends', authMiddleware, async (req, res) => {
  try {
    if (!trainingPipeline) return res.status(503).json({ success: false, error: 'Training pipeline unavailable' });
    const trends = trainingPipeline.detectTrends();
    res.json({ success: true, data: trends });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
