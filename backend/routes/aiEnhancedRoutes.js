// ============================================================================
// ENHANCED AI ROUTES — Complete API for All AI Features
// ============================================================================
// Provides REST endpoints for: RL optimization, anomaly detection, knowledge
// graph queries, AutoML, explainable AI, conversational AI, model monitoring,
// financial health scoring, and smart categorization.
// ============================================================================

'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

// Lazy-load AI orchestrator
let orchestrator = null;
const getOrchestrator = () => {
  if (!orchestrator) {
    orchestrator = require('../services/ai/aiOrchestrator');
  }
  return orchestrator;
};

// Lazy-load models
const model = (name) => {
  try { return require(`../models/${name}`); } catch { return null; }
};

// ============================================================================
// §1  COMPREHENSIVE ANALYSIS
// ============================================================================

/**
 * @route POST /api/ai-enhanced/analyze
 * @desc Run comprehensive AI analysis on user's financial data
 */
router.post('/analyze', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    const userId = req.user._id;
    const userData = await _gatherUserData(userId, req.body);

    const result = await ai.analyzeUserFinances(userId, userData);

    res.json({
      success: true,
      data: result,
      meta: { source: 'local-ai', version: '3.0.0' }
    });
  } catch (error) {
    logger.error('AI analysis error:', error);
    res.status(500).json({ success: false, message: 'AI analysis failed', error: error.message });
  }
});

/**
 * @route GET /api/ai-enhanced/status
 * @desc Get AI system status and health
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    res.json({ success: true, data: ai.getStatus() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §2  CONVERSATIONAL AI
// ============================================================================

/**
 * @route POST /api/ai-enhanced/chat
 * @desc Chat with the AI financial assistant
 */
router.post('/chat', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    const userId = req.user._id.toString();
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // Build context from user data
    const context = await _gatherUserContext(userId);
    if (history) context.history = history;

    const response = await ai.chat(userId, message, context);

    res.json({
      success: true,
      data: {
        message: response.message,
        intent: response.detectedIntent,
        confidence: response.confidence,
        entities: response.entities,
        slots: response.slots,
        followUp: response.followUp,
        suggestions: response.suggestions,
        turnCount: response.turnCount,
        data: response.data
      }
    });
  } catch (error) {
    logger.error('AI chat error:', error);
    res.status(500).json({ success: false, message: 'Chat processing failed', error: error.message });
  }
});

/**
 * @route GET /api/ai-enhanced/chat/summary
 * @desc Get conversation summary
 */
router.get('/chat/summary', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    const summary = ai.conversationEngine.getConversationSummary(req.user._id.toString());
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §3  BUDGET OPTIMIZATION (Reinforcement Learning)
// ============================================================================

/**
 * @route POST /api/ai-enhanced/optimize/budget
 * @desc RL-based budget optimization
 */
router.post('/optimize/budget', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    const userId = req.user._id.toString();
    const financialData = await _buildBudgetData(userId, req.body);

    const result = await ai.optimizeBudget(userId, financialData);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Budget optimization error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/ai-enhanced/optimize/investments
 * @desc RL-based investment portfolio optimization
 */
router.post('/optimize/investments', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    const userId = req.user._id.toString();

    const result = await ai.optimizeInvestments(userId, {
      totalCorpus: req.body.totalCorpus || 1000000,
      riskTolerance: req.body.riskTolerance || 0.5,
      investmentHorizon: req.body.investmentHorizon || 10,
      age: req.body.age || 30,
      monthlyContribution: req.body.monthlyContribution || 10000
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Investment optimization error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/ai-enhanced/optimize/debt
 * @desc RL-based debt payoff strategy optimization
 */
router.post('/optimize/debt', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    const userId = req.user._id.toString();
    const debtData = await _buildDebtData(userId, req.body);

    const result = await ai.optimizeDebtPayoff(userId, debtData);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Debt optimization error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §4  ANOMALY DETECTION
// ============================================================================

/**
 * @route GET /api/ai-enhanced/anomalies
 * @desc Detect anomalies in transactions
 */
router.get('/anomalies', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    const userId = req.user._id;
    const days = parseInt(req.query.days) || 90;

    const Transaction = model('Transaction');
    if (!Transaction) return res.status(500).json({ success: false, message: 'Transaction model not found' });

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const transactions = await Transaction.find({ userId, date: { $gte: cutoff } }).lean();

    const result = await ai.detectAnomalies(userId.toString(), transactions);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Anomaly detection error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/ai-enhanced/anomalies/check
 * @desc Check a single transaction for anomalies
 */
router.post('/anomalies/check', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    const { transaction } = req.body;

    if (!transaction) {
      return res.status(400).json({ success: false, message: 'Transaction data required' });
    }

    // Get historical data for context
    const userId = req.user._id;
    const Transaction = model('Transaction');
    const historical = Transaction
      ? await Transaction.find({ userId }).sort({ date: -1 }).limit(200).lean()
      : [];

    // Run detection
    const { FinancialAnomalyAnalyzer } = require('../services/ai/advancedAnomalyDetection');
    const analyzer = new FinancialAnomalyAnalyzer();
    const allTxns = [...historical, transaction];
    const result = await analyzer.analyzeTransactions(userId.toString(), allTxns);

    // Find the specific transaction's anomaly result
    const txnAnomaly = result.anomalies?.find(a =>
      a.transaction?.amount === transaction.amount
    );

    res.json({
      success: true,
      data: {
        isAnomaly: !!txnAnomaly,
        details: txnAnomaly || { score: 0, severity: 'normal' }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §5  KNOWLEDGE GRAPH
// ============================================================================

/**
 * @route POST /api/ai-enhanced/knowledge/query
 * @desc Query the financial knowledge graph
 */
router.post('/knowledge/query', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    const userId = req.user._id.toString();
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ success: false, message: 'Question is required' });
    }

    const userData = await _gatherUserData(userId);
    const result = await ai.queryKnowledgeGraph(userId, question, userData);

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/ai-enhanced/knowledge/graph
 * @desc Get the knowledge graph structure
 */
router.get('/knowledge/graph', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    const userId = req.user._id.toString();
    const builder = ai.userGraphs[userId];

    if (!builder) {
      return res.json({ success: true, data: { nodes: [], edges: [], stats: { nodeCount: 0 } } });
    }

    const stats = builder.graph.getStats();
    const communities = builder.graph.detectCommunities();

    res.json({
      success: true,
      data: {
        stats,
        communities: communities.map((c, i) => ({ id: i, members: c, size: c.length })),
        recommendations: builder.getRecommendations(userId)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §6  FINANCIAL HEALTH
// ============================================================================

/**
 * @route GET /api/ai-enhanced/health-score
 * @desc Get comprehensive financial health score
 */
router.get('/health-score', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    const userId = req.user._id;
    const userData = await _gatherUserData(userId);

    const result = await ai.computeFinancialHealthScore(userId.toString(), userData);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Health score error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §7  SPENDING PREDICTION
// ============================================================================

/**
 * @route GET /api/ai-enhanced/predict/spending
 * @desc Predict future spending using AutoML
 */
router.get('/predict/spending', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    const userId = req.user._id;
    const weeks = parseInt(req.query.weeks) || 4;

    const Transaction = model('Transaction');
    if (!Transaction) return res.status(500).json({ success: false, message: 'Model not found' });

    const transactions = await Transaction.find({ userId })
      .sort({ date: -1 })
      .limit(500)
      .lean();

    const result = await ai.predictSpending(userId.toString(), transactions, weeks);

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §8  SMART CATEGORIZATION
// ============================================================================

/**
 * @route POST /api/ai-enhanced/categorize
 * @desc AI-powered transaction categorization
 */
router.post('/categorize', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    const userId = req.user._id.toString();
    const { transaction, transactions } = req.body;

    if (transaction) {
      const result = await ai.smartCategorize(userId, transaction);
      return res.json({ success: true, data: result });
    }

    if (transactions && Array.isArray(transactions)) {
      const results = await Promise.all(
        transactions.map(t => ai.smartCategorize(userId, t))
      );
      return res.json({ success: true, data: results });
    }

    res.status(400).json({ success: false, message: 'Transaction data required' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §9  INSIGHTS
// ============================================================================

/**
 * @route GET /api/ai-enhanced/insights
 * @desc Generate AI-powered financial insights
 */
router.get('/insights', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    const userId = req.user._id;
    const userData = await _gatherUserData(userId);

    const result = await ai.generateInsights(userId.toString(), userData);

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §10  WHAT-IF ANALYSIS
// ============================================================================

/**
 * @route POST /api/ai-enhanced/what-if
 * @desc Run what-if scenario analysis
 */
router.post('/what-if', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    const userId = req.user._id.toString();
    const { scenario } = req.body;

    if (!scenario) {
      return res.status(400).json({ success: false, message: 'Scenario required' });
    }

    const result = await ai.whatIfAnalysis(userId, scenario);

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §11  EXPLAINABILITY
// ============================================================================

/**
 * @route POST /api/ai-enhanced/explain
 * @desc Get explanations for AI decisions
 */
router.post('/explain', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    const userId = req.user._id.toString();
    const { decisionType, data } = req.body;

    const explanation = await ai.explainDecision(userId, decisionType, data);

    res.json({ success: true, data: { explanation } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/ai-enhanced/audit-trail
 * @desc Get AI decision audit trail
 */
router.get('/audit-trail', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    const userId = req.user._id.toString();

    const trail = await ai.getAuditTrail(userId);

    res.json({ success: true, data: trail });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §12  AUTO-ML
// ============================================================================

/**
 * @route POST /api/ai-enhanced/automl/run
 * @desc Run AutoML pipeline
 */
router.post('/automl/run', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    const userId = req.user._id.toString();
    const { task, data } = req.body;

    if (!task) {
      return res.status(400).json({ success: false, message: 'Task type required (forecast, categorize, anomaly)' });
    }

    // If no data provided, use user's transaction data
    if (!data || !data.transactions) {
      const Transaction = model('Transaction');
      if (Transaction) {
        const transactions = await Transaction.find({ userId: req.user._id })
          .sort({ date: -1 })
          .limit(500)
          .lean();
        data.transactions = transactions;
      }
    }

    const result = await ai.runAutoML(userId, task, data || {});

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/ai-enhanced/automl/history
 * @desc Get AutoML run history
 */
router.get('/automl/history', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    res.json({ success: true, data: ai.autoML.getHistory() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §13  MODEL MONITORING
// ============================================================================

/**
 * @route GET /api/ai-enhanced/monitoring/dashboard
 * @desc Get model monitoring dashboard
 */
router.get('/monitoring/dashboard', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    const { modelId } = req.query;

    const dashboard = modelId
      ? ai.monitoring.getDashboard(modelId)
      : ai.getMonitoringDashboard();

    res.json({ success: true, data: dashboard });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/ai-enhanced/monitoring/metrics/:modelId
 * @desc Get metrics for a specific model
 */
router.get('/monitoring/metrics/:modelId', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    const metrics = ai.getModelMetrics(req.params.modelId);
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/ai-enhanced/monitoring/alerts
 * @desc Get active model alerts
 */
router.get('/monitoring/alerts', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    const alerts = ai.monitoring.performanceTracker.getAlerts(req.query.modelId || null);
    res.json({ success: true, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/ai-enhanced/monitoring/alerts/:alertId/acknowledge
 * @desc Acknowledge an alert
 */
router.post('/monitoring/alerts/:alertId/acknowledge', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    const result = ai.monitoring.performanceTracker.acknowledgeAlert(req.params.alertId);
    res.json({ success: true, acknowledged: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §14  A/B TESTING
// ============================================================================

/**
 * @route POST /api/ai-enhanced/ab-test/create
 * @desc Create a new A/B test
 */
router.post('/ab-test/create', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    const test = ai.monitoring.createABTest(req.body);
    res.json({ success: true, data: test });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/ai-enhanced/ab-test/list
 * @desc List all A/B tests
 */
router.get('/ab-test/list', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    const tests = ai.monitoring.getABTests();
    res.json({ success: true, data: tests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §15  FEEDBACK
// ============================================================================

/**
 * @route POST /api/ai-enhanced/feedback
 * @desc Submit feedback on AI decisions
 */
router.post('/feedback', authenticate, async (req, res) => {
  try {
    const ai = getOrchestrator();
    const { decisionId, correct, feedback } = req.body;

    if (!decisionId) {
      return res.status(400).json({ success: false, message: 'Decision ID required' });
    }

    const result = ai.explainability.addFeedback(decisionId, {
      correct: !!correct,
      feedback: feedback || '',
      userId: req.user._id.toString()
    });

    // Also update intent classifier if chat feedback
    if (req.body.correctIntent) {
      ai.conversationEngine.intentClassifier.learn(
        req.body.originalMessage || '',
        req.body.correctIntent
      );
    }

    res.json({ success: true, recorded: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// HELPER FUNCTIONS — Data Gathering
// ============================================================================

async function _gatherUserData(userId, extra = {}) {
  const data = { ...extra };

  try {
    const Transaction = model('Transaction');
    if (Transaction) {
      const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      data.transactions = data.transactions || await Transaction.find({
        userId, date: { $gte: cutoff }
      }).sort({ date: -1 }).lean();
    }
  } catch (e) { logger.debug('Transaction fetch error:', e.message); }

  try {
    const Budget = model('Budget');
    if (Budget) {
      data.budgets = data.budgets || await Budget.find({ userId }).lean();
    }
  } catch (e) { logger.debug('Budget fetch error:', e.message); }

  try {
    const FinancialGoal = model('FinancialGoal');
    if (FinancialGoal) {
      data.goals = data.goals || await FinancialGoal.find({ userId }).lean();
    }
  } catch (e) { logger.debug('Goal fetch error:', e.message); }

  try {
    const PersonalLoan = model('PersonalLoan');
    if (PersonalLoan) {
      data.loans = data.loans || await PersonalLoan.find({ userId }).lean();
    }
  } catch (e) { logger.debug('Loan fetch error:', e.message); }

  try {
    const Investment = model('Investment');
    if (Investment) {
      data.investments = data.investments || await Investment.find({ userId }).lean();
    }
  } catch (e) { logger.debug('Investment fetch error:', e.message); }

  return data;
}

async function _gatherUserContext(userId) {
  const context = {};

  try {
    const Transaction = model('Transaction');
    if (Transaction) {
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      context.transactions = await Transaction.find({ userId, date: { $gte: cutoff } })
        .sort({ date: -1 }).limit(200).lean();

      const months = Math.max(1, new Set(context.transactions.map(t =>
        new Date(t.date).toISOString().substring(0, 7)
      )).size);

      context.monthlyIncome = context.transactions
        .filter(t => t.type === 'income')
        .reduce((s, t) => s + Math.abs(t.amount || 0), 0) / months;
      context.monthlyExpenses = context.transactions
        .filter(t => t.type === 'expense')
        .reduce((s, t) => s + Math.abs(t.amount || 0), 0) / months;
    }
  } catch (e) { logger.debug('Context gathering error:', e.message); }

  try {
    const PersonalLoan = model('PersonalLoan');
    if (PersonalLoan) {
      const loans = await PersonalLoan.find({ userId }).lean();
      context.activeLoans = loans.filter(l => l.status === 'active').length;
      context.totalOutstanding = loans
        .filter(l => l.status === 'active')
        .reduce((s, l) => s + (l.outstandingAmount || l.principalAmount || 0), 0);
    }
  } catch (e) { /* non-fatal */ }

  return context;
}

async function _buildBudgetData(userId, body) {
  const data = {
    monthlyIncome: body.monthlyIncome || 50000,
    currentAllocations: body.currentAllocations || {},
    historicalSpending: body.historicalSpending || {},
    savingsGoal: body.savingsGoal || 0.2,
    categories: body.categories || undefined,
    essentialCategories: body.essentialCategories || undefined
  };

  // Auto-populate from transactions if not provided
  if (Object.keys(data.historicalSpending).length === 0) {
    try {
      const Transaction = model('Transaction');
      if (Transaction) {
        const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const txns = await Transaction.find({
          userId, type: 'expense', date: { $gte: cutoff }
        }).lean();

        const months = Math.max(1, new Set(txns.map(t =>
          new Date(t.date).toISOString().substring(0, 7)
        )).size);

        for (const t of txns) {
          const cat = (t.category || 'misc').toLowerCase();
          data.historicalSpending[cat] = (data.historicalSpending[cat] || 0) + Math.abs(t.amount || 0);
        }

        // Convert to monthly average
        for (const cat of Object.keys(data.historicalSpending)) {
          data.historicalSpending[cat] /= months;
        }

        // Estimate income
        const incomeTxns = await Transaction.find({
          userId, type: 'income', date: { $gte: cutoff }
        }).lean();
        const totalIncome = incomeTxns.reduce((s, t) => s + Math.abs(t.amount || 0), 0);
        data.monthlyIncome = totalIncome / months || data.monthlyIncome;
      }
    } catch (e) { logger.debug('Budget data build error:', e.message); }
  }

  return data;
}

async function _buildDebtData(userId, body) {
  const data = {
    debts: body.debts || [],
    monthlyBudget: body.monthlyBudget || 60000,
    extraPayment: body.extraPayment || 10000
  };

  // Auto-populate from loans if not provided
  if (data.debts.length === 0) {
    try {
      const PersonalLoan = model('PersonalLoan');
      if (PersonalLoan) {
        const loans = await PersonalLoan.find({ userId, status: 'active' }).lean();
        data.debts = loans.map(l => ({
          name: l.name || l.loanType || 'Loan',
          balance: l.outstandingAmount || l.principalAmount || 0,
          rate: l.interestRate || 0.12,
          minPayment: l.emiAmount || 0
        }));
      }
    } catch (e) { logger.debug('Debt data build error:', e.message); }
  }

  return data;
}

module.exports = router;
