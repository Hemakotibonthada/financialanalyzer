// ============================================================================
// AI ADVANCED ROUTES — Portfolio, Credit, Notifications, Peers, Search
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
// §1  PORTFOLIO OPTIMIZATION
// ============================================================================

let portfolioService = null;
const getPortfolioService = () => {
  if (!portfolioService) {
    const { PortfolioOptimizationService } = require('../services/ai/portfolioOptimization');
    portfolioService = new PortfolioOptimizationService();
  }
  return portfolioService;
};

router.post('/portfolio/optimize', authenticate, async (req, res) => {
  try {
    const service = getPortfolioService();
    const result = service.optimizePortfolio(req.body || {});
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Portfolio optimization error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/portfolio/efficient-frontier', authenticate, async (req, res) => {
  try {
    const service = getPortfolioService();
    const result = service.getEfficientFrontier(req.query.riskProfile || 'moderate');
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/portfolio/assets', authenticate, async (req, res) => {
  try {
    const service = getPortfolioService();
    res.json({ success: true, data: service.getAvailableAssets() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/portfolio/analyze', authenticate, async (req, res) => {
  try {
    const { PortfolioAnalytics, AssetClassLibrary } = require('../services/ai/portfolioOptimization');
    const analytics = new PortfolioAnalytics(new AssetClassLibrary());
    const result = analytics.analyze(req.body.portfolio || {});
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/portfolio/stress-test', authenticate, async (req, res) => {
  try {
    const { PortfolioAnalytics, AssetClassLibrary } = require('../services/ai/portfolioOptimization');
    const analytics = new PortfolioAnalytics(new AssetClassLibrary());
    const result = analytics.stressTest(req.body.portfolio || {}, req.body.scenarios || null);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/portfolio/rebalance', authenticate, async (req, res) => {
  try {
    const { DynamicRebalancer, AssetClassLibrary } = require('../services/ai/portfolioOptimization');
    const rebalancer = new DynamicRebalancer(new AssetClassLibrary());
    const result = rebalancer.analyzeRebalancing(
      req.body.currentPortfolio || {},
      req.body.targetAllocations || {},
      req.body.config || {}
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §2  CREDIT SCORE
// ============================================================================

let creditService = null;
const getCreditService = () => {
  if (!creditService) {
    const { CreditScoreService } = require('../services/ai/creditScorePredictor');
    creditService = new CreditScoreService();
  }
  return creditService;
};

router.get('/credit/score', authenticate, async (req, res) => {
  try {
    const service = getCreditService();
    const userId = req.user._id.toString();
    const data = await _gatherFinancialData(req.user._id);
    const result = service.getScore(userId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/credit/simulate', authenticate, async (req, res) => {
  try {
    const service = getCreditService();
    const data = await _gatherFinancialData(req.user._id);
    const result = req.body.scenarios
      ? service.simulateMultiple(data, req.body.scenarios)
      : service.simulateScenario(data, req.body.scenario || {});
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/credit/improvement-plan', authenticate, async (req, res) => {
  try {
    const service = getCreditService();
    const data = await _gatherFinancialData(req.user._id);
    const result = service.getImprovementPlan(data);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/credit/history', authenticate, async (req, res) => {
  try {
    const service = getCreditService();
    const result = service.getScoreHistory(req.user._id.toString());
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §3  SMART NOTIFICATIONS
// ============================================================================

let notifService = null;
const getNotifService = () => {
  if (!notifService) {
    const { SmartNotificationService } = require('../services/ai/smartNotificationAI');
    notifService = new SmartNotificationService();
  }
  return notifService;
};

router.post('/notifications/process', authenticate, async (req, res) => {
  try {
    const service = getNotifService();
    const userId = req.user._id.toString();
    const context = req.body.context || {};

    // Build context from user data
    const data = await _gatherFinancialData(req.user._id);
    const enrichedContext = {
      ...context,
      hasInvestments: (data.investments || []).length > 0,
      hasLoans: (data.loans || []).filter(l => l.status === 'active').length > 0,
      savingsRate: 0.2, // Default
      isMarketHours: new Date().getHours() >= 9 && new Date().getHours() <= 16,
      ...data
    };

    const result = await service.processNotifications(userId, enrichedContext);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/notifications/interaction', authenticate, async (req, res) => {
  try {
    const service = getNotifService();
    service.recordInteraction(
      req.user._id.toString(),
      req.body.notificationId,
      req.body.action
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/notifications/stats', authenticate, async (req, res) => {
  try {
    const service = getNotifService();
    const stats = service.getDeliveryStats(req.user._id.toString());
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §4  PEER COMPARISON
// ============================================================================

router.post('/peers/compare', authenticate, async (req, res) => {
  try {
    const { PeerComparisonAnalyzer } = require('../services/ai/peerComparisonEngine');
    const analyzer = new PeerComparisonAnalyzer();
    const data = await _gatherFinancialData(req.user._id);

    // Build user profile for comparison
    const transactions = data.transactions || [];
    const expenses = transactions.filter(t => t.type === 'expense');
    const incomes = transactions.filter(t => t.type === 'income');
    const totalExpense = expenses.reduce((s, t) => s + Math.abs(t.amount || 0), 0);
    const totalIncome = incomes.reduce((s, t) => s + Math.abs(t.amount || 0), 0);
    const months = Math.max(1, new Set(transactions.map(t =>
      new Date(t.date || 0).toISOString().substring(0, 7)
    )).size);

    const monthlyIncome = totalIncome / months || req.body.monthlyIncome || 50000;
    const monthlyExpense = totalExpense / months;

    // Category breakdown
    const categoryBreakdown = {};
    for (const t of expenses) {
      const cat = (t.category || 'unknown').toLowerCase();
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + Math.abs(t.amount || 0);
    }
    for (const cat of Object.keys(categoryBreakdown)) {
      categoryBreakdown[cat] /= (totalExpense || 1);
    }

    const userProfile = {
      savingsRate: monthlyIncome > 0 ? (monthlyIncome - monthlyExpense) / monthlyIncome : 0,
      investmentRate: req.body.investmentRate || 0.05,
      debtToIncome: req.body.debtToIncome || 0,
      emergencyFundMonths: req.body.emergencyFundMonths || 3,
      categoryBreakdown
    };

    const result = analyzer.compare(userProfile, {
      monthlyIncome,
      age: req.body.age || 30
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §5  SEMANTIC SEARCH
// ============================================================================

router.post('/search/smart', authenticate, async (req, res) => {
  try {
    const { SemanticSearchService } = require('../services/ai/semanticSearch');
    const searchService = new SemanticSearchService();
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, message: 'Search query required' });
    }

    const Transaction = model('Transaction');
    let transactions = [];
    if (Transaction) {
      transactions = await Transaction.find({ userId: req.user._id })
        .sort({ date: -1 }).limit(2000).lean();
    }

    const result = searchService.search(query, transactions);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/search/suggestions', authenticate, async (req, res) => {
  try {
    const { SemanticSearchService } = require('../services/ai/semanticSearch');
    const searchService = new SemanticSearchService();
    const suggestions = searchService.getSuggestions(req.query.q || '');
    res.json({ success: true, data: suggestions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/search/parse', authenticate, async (req, res) => {
  try {
    const { FinancialQueryParser } = require('../services/ai/semanticSearch');
    const parser = new FinancialQueryParser();
    const result = parser.parse(req.body.query || '');
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// HELPERS
// ============================================================================

async function _gatherFinancialData(userId) {
  const data = {};
  const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  try {
    const Transaction = model('Transaction');
    if (Transaction) data.transactions = await Transaction.find({ userId, date: { $gte: cutoff } }).sort({ date: -1 }).lean();
  } catch { /* non-fatal */ }

  try {
    const PersonalLoan = model('PersonalLoan');
    if (PersonalLoan) data.loans = await PersonalLoan.find({ userId }).lean();
  } catch { /* non-fatal */ }

  try {
    const Investment = model('Investment');
    if (Investment) data.investments = await Investment.find({ userId }).lean();
  } catch { /* non-fatal */ }

  try {
    const CreditCardBill = model('CreditCardBill');
    if (CreditCardBill) data.creditCards = await CreditCardBill.find({ userId }).lean();
  } catch { /* non-fatal */ }

  // Estimate monthly income
  const incomes = (data.transactions || []).filter(t => t.type === 'income');
  const months = Math.max(1, new Set(incomes.map(t =>
    new Date(t.date || 0).toISOString().substring(0, 7)
  )).size);
  data.monthlyIncome = incomes.reduce((s, t) => s + Math.abs(t.amount || 0), 0) / months;

  return data;
}

module.exports = router;
