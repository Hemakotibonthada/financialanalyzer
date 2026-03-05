// ============================================================================
// EXTENDED AI ROUTES — Fraud Detection, Reports, Document Intelligence
// ============================================================================

'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const model = (name) => {
  try { return require(`../models/${name}`); } catch { return null; }
};

// ============================================================================
// §1  FRAUD DETECTION
// ============================================================================

let fraudService = null;
const getFraudService = () => {
  if (!fraudService) {
    const { FraudDetectionService } = require('../services/ai/fraudDetectionSystem');
    fraudService = new FraudDetectionService();
  }
  return fraudService;
};

/**
 * @route POST /api/ai-extended/fraud/screen
 * @desc Screen a transaction for fraud
 */
router.post('/fraud/screen', authenticate, async (req, res) => {
  try {
    const fraud = getFraudService();
    const userId = req.user._id.toString();
    const { transaction } = req.body;

    if (!transaction) {
      return res.status(400).json({ success: false, message: 'Transaction required' });
    }

    // Get recent transactions for context
    const Transaction = model('Transaction');
    let recentTxns = [];
    if (Transaction) {
      recentTxns = await Transaction.find({ userId: req.user._id })
        .sort({ date: -1 }).limit(100).lean();
    }

    const result = await fraud.screenTransaction(userId, transaction, recentTxns);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Fraud screening error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/ai-extended/fraud/screen-batch
 * @desc Screen multiple transactions for fraud
 */
router.post('/fraud/screen-batch', authenticate, async (req, res) => {
  try {
    const fraud = getFraudService();
    const userId = req.user._id.toString();
    const { transactions } = req.body;

    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({ success: false, message: 'Transactions array required' });
    }

    const Transaction = model('Transaction');
    let allTxns = [];
    if (Transaction) {
      allTxns = await Transaction.find({ userId: req.user._id })
        .sort({ date: -1 }).limit(500).lean();
    }

    const result = await fraud.screenBatch(userId, transactions, allTxns);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/ai-extended/fraud/initialize
 * @desc Initialize fraud detection profile for user
 */
router.post('/fraud/initialize', authenticate, async (req, res) => {
  try {
    const fraud = getFraudService();
    const userId = req.user._id.toString();

    const Transaction = model('Transaction');
    let transactions = [];
    if (Transaction) {
      transactions = await Transaction.find({ userId: req.user._id })
        .sort({ date: -1 }).limit(1000).lean();
    }

    const profile = await fraud.initializeUser(userId, transactions);
    res.json({
      success: true,
      data: {
        profileCreated: true,
        transactionsAnalyzed: transactions.length,
        avgExpense: Math.round(profile.avgExpense),
        knownMerchants: profile.knownMerchants.size,
        categories: Object.keys(profile.categoryAverages).length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/ai-extended/fraud/alerts
 * @desc Get fraud alerts
 */
router.get('/fraud/alerts', authenticate, async (req, res) => {
  try {
    const fraud = getFraudService();
    const alerts = fraud.getAlerts({
      status: req.query.status,
      riskLevel: req.query.riskLevel,
      minScore: req.query.minScore ? parseInt(req.query.minScore) : undefined
    });
    res.json({ success: true, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/ai-extended/fraud/alerts/:alertId/resolve
 * @desc Resolve a fraud alert
 */
router.post('/fraud/alerts/:alertId/resolve', authenticate, async (req, res) => {
  try {
    const fraud = getFraudService();
    const result = fraud.resolveAlert(
      req.params.alertId,
      req.body.resolution || 'resolved',
      req.user.name || req.user._id.toString()
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/ai-extended/fraud/stats
 * @desc Get fraud detection statistics
 */
router.get('/fraud/stats', authenticate, async (req, res) => {
  try {
    const fraud = getFraudService();
    res.json({ success: true, data: fraud.getStats() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §2  REPORT GENERATION
// ============================================================================

let reportService = null;
const getReportService = () => {
  if (!reportService) {
    const { NLReportService } = require('../services/ai/nlReportGenerator');
    reportService = new NLReportService();
  }
  return reportService;
};

/**
 * @route GET /api/ai-extended/reports/generate
 * @desc Generate a comprehensive financial report
 */
router.get('/reports/generate', authenticate, async (req, res) => {
  try {
    const reports = getReportService();
    const userId = req.user._id;
    const period = req.query.period || 'monthly';
    const data = await _gatherAllData(userId);

    const report = reports.generateReport(data, period);
    res.json({ success: true, data: report });
  } catch (error) {
    logger.error('Report generation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/ai-extended/reports/quick-summary
 * @desc Generate a quick financial summary
 */
router.get('/reports/quick-summary', authenticate, async (req, res) => {
  try {
    const reports = getReportService();
    const data = await _gatherAllData(req.user._id);
    const summary = reports.generateQuickSummary(data);
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/ai-extended/reports/category/:category
 * @desc Generate a category-specific report
 */
router.get('/reports/category/:category', authenticate, async (req, res) => {
  try {
    const reports = getReportService();
    const data = await _gatherAllData(req.user._id);
    const report = reports.generateCategoryReport(data, req.params.category);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §3  DOCUMENT INTELLIGENCE
// ============================================================================

let docService = null;
const getDocService = () => {
  if (!docService) {
    const { DocumentIntelligenceService } = require('../services/ai/documentIntelligence');
    docService = new DocumentIntelligenceService();
  }
  return docService;
};

/**
 * @route POST /api/ai-extended/documents/analyze
 * @desc Analyze a financial document
 */
router.post('/documents/analyze', authenticate, async (req, res) => {
  try {
    const docs = getDocService();
    const { text, documentType } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, message: 'Document text required' });
    }

    const result = await docs.analyzeDocument(text, documentType || null);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/ai-extended/documents/extract-amounts
 * @desc Extract monetary amounts from text
 */
router.post('/documents/extract-amounts', authenticate, async (req, res) => {
  try {
    const { AmountParser } = require('../services/ai/documentIntelligence');
    const parser = new AmountParser();
    const amounts = parser.extractAll(req.body.text || '');
    res.json({ success: true, data: amounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §4  BEHAVIORAL FINANCE
// ============================================================================

/**
 * @route GET /api/ai-extended/behavioral/analyze
 * @desc Run behavioral finance analysis
 */
router.get('/behavioral/analyze', authenticate, async (req, res) => {
  try {
    const { BehavioralFinanceService } = require('../services/ai/behavioralFinance');
    const service = new BehavioralFinanceService();
    const userId = req.user._id;
    const data = await _gatherAllData(userId);

    const analysis = await service.analyzeUserBehavior(userId.toString(), data);
    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §5  SPENDING INTELLIGENCE
// ============================================================================

/**
 * @route GET /api/ai-extended/spending/intelligence
 * @desc Get comprehensive spending intelligence
 */
router.get('/spending/intelligence', authenticate, async (req, res) => {
  try {
    const { SpendingIntelligenceService } = require('../services/ai/spendingIntelligence');
    const service = new SpendingIntelligenceService();
    const userId = req.user._id;
    const data = await _gatherAllData(userId);

    const result = await service.analyzeComprehensive(userId.toString(), data);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §6  RECOMMENDATIONS
// ============================================================================

/**
 * @route GET /api/ai-extended/recommendations
 * @desc Get personalized financial recommendations
 */
router.get('/recommendations', authenticate, async (req, res) => {
  try {
    const { RecommendationService } = require('../services/ai/recommendationEngine');
    const service = new RecommendationService();
    const userId = req.user._id;
    const data = await _gatherAllData(userId);

    const recs = await service.getRecommendations(userId.toString(), data);
    res.json({ success: true, data: recs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/ai-extended/recommendations/feedback
 * @desc Submit recommendation feedback
 */
router.post('/recommendations/feedback', authenticate, async (req, res) => {
  try {
    const { RecommendationService } = require('../services/ai/recommendationEngine');
    const service = new RecommendationService();
    const { recommendationId, action } = req.body;
    await service.recordFeedback(req.user._id.toString(), recommendationId, action);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §7  FINANCIAL FORECASTING
// ============================================================================

/**
 * @route GET /api/ai-extended/forecast/ensemble
 * @desc Run ensemble forecasting
 */
router.get('/forecast/ensemble', authenticate, async (req, res) => {
  try {
    const { EnsembleForecaster } = require('../services/ai/financialForecasting');
    const forecaster = new EnsembleForecaster();
    const days = parseInt(req.query.days) || 30;

    const Transaction = model('Transaction');
    if (!Transaction) return res.status(500).json({ success: false, message: 'Model not found' });

    const transactions = await Transaction.find({
      userId: req.user._id, type: 'expense'
    }).sort({ date: 1 }).limit(365).lean();

    const dates = transactions.map(t => t.date || new Date());
    const values = transactions.map(t => Math.abs(t.amount || 0));

    const result = forecaster.forecast(dates, values, days);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/ai-extended/forecast/monte-carlo
 * @desc Run Monte Carlo portfolio simulation
 */
router.post('/forecast/monte-carlo', authenticate, async (req, res) => {
  try {
    const { MonteCarloSimulator } = require('../services/ai/financialForecasting');
    const mc = new MonteCarloSimulator({ numSimulations: req.body.simulations || 500 });

    const simType = req.body.type || 'portfolio';

    let result;
    if (simType === 'portfolio') {
      result = mc.simulatePortfolioGrowth(req.body.config || {});
    } else if (simType === 'retirement') {
      result = mc.simulateRetirement(req.body.config || {});
    } else if (simType === 'goal') {
      result = mc.simulateGoalAchievement(req.body.config || {});
    } else {
      return res.status(400).json({ success: false, message: 'Invalid simulation type' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §8  FINANCIAL PLANNING
// ============================================================================

/**
 * @route POST /api/ai-extended/planning/comprehensive
 * @desc Generate comprehensive financial plan
 */
router.post('/planning/comprehensive', authenticate, async (req, res) => {
  try {
    const { FinancialPlanningService } = require('../services/ai/smartFinancialPlanner');
    const planner = new FinancialPlanningService();
    const userId = req.user._id;
    const userFinData = await _gatherAllData(userId);

    const plan = await planner.generateComprehensivePlan(userId.toString(), {
      ...userFinData,
      ...req.body
    });

    res.json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/ai-extended/planning/tax-comparison
 * @desc Compare old vs new tax regimes
 */
router.post('/planning/tax-comparison', authenticate, async (req, res) => {
  try {
    const { TaxOptimizer } = require('../services/ai/smartFinancialPlanner');
    const optimizer = new TaxOptimizer();
    const result = optimizer.calculateTaxComparison(
      req.body.income || 0,
      req.body.deductions || {}
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/ai-extended/planning/retirement
 * @desc Plan retirement
 */
router.post('/planning/retirement', authenticate, async (req, res) => {
  try {
    const { RetirementPlanner } = require('../services/ai/smartFinancialPlanner');
    const planner = new RetirementPlanner();
    const result = planner.plan(req.body || {});
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/ai-extended/planning/insurance-gap
 * @desc Analyze insurance gaps
 */
router.post('/planning/insurance-gap', authenticate, async (req, res) => {
  try {
    const { InsuranceGapAnalyzer } = require('../services/ai/smartFinancialPlanner');
    const analyzer = new InsuranceGapAnalyzer();
    const result = analyzer.analyze(req.body || {});
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// HELPER — Data Gathering
// ============================================================================

async function _gatherAllData(userId) {
  const data = {};
  const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

  try {
    const Transaction = model('Transaction');
    if (Transaction) {
      data.transactions = await Transaction.find({ userId, date: { $gte: cutoff } })
        .sort({ date: -1 }).lean();
    }
  } catch (e) { /* non-fatal */ }

  try {
    const Budget = model('Budget');
    if (Budget) data.budgets = await Budget.find({ userId }).lean();
  } catch (e) { /* non-fatal */ }

  try {
    const FinancialGoal = model('FinancialGoal');
    if (FinancialGoal) data.goals = await FinancialGoal.find({ userId }).lean();
  } catch (e) { /* non-fatal */ }

  try {
    const PersonalLoan = model('PersonalLoan');
    if (PersonalLoan) data.loans = await PersonalLoan.find({ userId }).lean();
  } catch (e) { /* non-fatal */ }

  try {
    const Investment = model('Investment');
    if (Investment) data.investments = await Investment.find({ userId }).lean();
  } catch (e) { /* non-fatal */ }

  return data;
}

module.exports = router;
