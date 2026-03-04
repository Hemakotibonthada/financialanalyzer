// ============================================================================
// AI Intelligence Routes — Unified API for All AI Engines
// ============================================================================
// Exposes the Self-Learning Pipeline, Transaction Enrichment, Financial Goals AI,
// Budget Optimizer, Debt Payoff Engine, and Cash Flow Projections.
// ============================================================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

// Lazy-load AI engines (they require models which need DB connection)
const getEngine = (name) => {
  const engines = {
    pipeline: () => require('../services/ai/selfLearningPipeline'),
    enrichment: () => require('../services/ai/transactionEnrichment'),
    goals: () => require('../services/ai/financialGoalsAI'),
    budget: () => require('../services/ai/budgetOptimizerAI'),
    debt: () => require('../services/ai/debtPayoffEngine'),
    cashflow: () => require('../services/ai/cashFlowProjection'),
  };
  try { return engines[name]?.(); } catch (e) { logger.error(`Failed to load ${name}:`, e.message); return null; }
};

router.use(authenticate);

// ==========================================
// Self-Learning Pipeline
// ==========================================

// POST /api/ai-intelligence/train — Train AI models on user data
router.post('/train', async (req, res) => {
  try {
    const { getPipeline } = getEngine('pipeline');
    const pipeline = getPipeline(req.user._id);
    const result = await pipeline.train(req.user._id);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('AI train error:', error);
    res.status(500).json({ success: false, message: 'Training failed', error: error.message });
  }
});

// GET /api/ai-intelligence/status — Get AI pipeline status
router.get('/status', async (req, res) => {
  try {
    const { getPipeline } = getEngine('pipeline');
    const pipeline = getPipeline(req.user._id);
    res.json({ success: true, data: pipeline.getStatus() });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Status check failed', error: error.message });
  }
});

// POST /api/ai-intelligence/categorize — AI categorization
router.post('/categorize', async (req, res) => {
  try {
    const { getPipeline } = getEngine('pipeline');
    const pipeline = getPipeline(req.user._id);
    const { description, amount } = req.body;
    const result = pipeline.categorize(description, amount);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Categorization failed', error: error.message });
  }
});

// GET /api/ai-intelligence/predictions — Spending predictions
router.get('/predictions', async (req, res) => {
  try {
    const { getPipeline } = getEngine('pipeline');
    const pipeline = getPipeline(req.user._id);
    if (!pipeline.metadata.lastTrainedAt) await pipeline.train(req.user._id);
    const { months = 3 } = req.query;
    const result = pipeline.getPredictions(parseInt(months));
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Prediction failed', error: error.message });
  }
});

// GET /api/ai-intelligence/recommendations — AI recommendations  
router.get('/recommendations', async (req, res) => {
  try {
    const { getPipeline } = getEngine('pipeline');
    const pipeline = getPipeline(req.user._id);
    if (!pipeline.metadata.lastTrainedAt) await pipeline.train(req.user._id);
    const recommendations = await pipeline.getRecommendations(req.user._id);
    res.json({ success: true, data: recommendations });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Recommendations failed', error: error.message });
  }
});

// ==========================================
// Transaction Enrichment
// ==========================================

// POST /api/ai-intelligence/enrich — Enrich a transaction
router.post('/enrich', async (req, res) => {
  try {
    const enrichment = getEngine('enrichment');
    const result = await enrichment.enrich(req.body, req.user._id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Enrichment failed', error: error.message });
  }
});

// POST /api/ai-intelligence/enrich-batch — Bulk enrich
router.post('/enrich-batch', async (req, res) => {
  try {
    const enrichment = getEngine('enrichment');
    const { transactions } = req.body;
    const result = await enrichment.enrichBatch(transactions || [], req.user._id);
    res.json({ success: true, data: result, count: result.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Batch enrichment failed', error: error.message });
  }
});

// POST /api/ai-intelligence/detect-duplicates — Check for duplicates
router.post('/detect-duplicates', async (req, res) => {
  try {
    const enrichment = getEngine('enrichment');
    const result = await enrichment.detectDuplicates(req.user._id, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Duplicate detection failed', error: error.message });
  }
});

// GET /api/ai-intelligence/enrichment-stats — Enrichment analytics
router.get('/enrichment-stats', async (req, res) => {
  try {
    const enrichment = getEngine('enrichment');
    const result = await enrichment.getEnrichmentStats(req.user._id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Stats failed', error: error.message });
  }
});

// ==========================================
// Financial Goals AI
// ==========================================

// POST /api/ai-intelligence/goals/assess — Assess goal feasibility
router.post('/goals/assess', async (req, res) => {
  try {
    const goalsAI = getEngine('goals');
    const result = await goalsAI.assessFeasibility(req.user._id, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Goal assessment failed', error: error.message });
  }
});

// POST /api/ai-intelligence/goals/plan — Generate savings plan
router.post('/goals/plan', async (req, res) => {
  try {
    const goalsAI = getEngine('goals');
    const { goal, monthlyBudget } = req.body;
    const result = goalsAI.generateSavingsPlan(goal, monthlyBudget || 0);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Plan generation failed', error: error.message });
  }
});

// GET /api/ai-intelligence/goals/:id/pace — Analyze goal pace
router.get('/goals/:id/pace', async (req, res) => {
  try {
    const goalsAI = getEngine('goals');
    const result = await goalsAI.analyzePace(req.user._id, req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Pace analysis failed', error: error.message });
  }
});

// GET /api/ai-intelligence/goals/prioritize — Prioritize goals
router.get('/goals/prioritize', async (req, res) => {
  try {
    const goalsAI = getEngine('goals');
    const result = await goalsAI.prioritizeGoals(req.user._id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Prioritization failed', error: error.message });
  }
});

// ==========================================
// Budget Optimizer
// ==========================================

// GET /api/ai-intelligence/budget/optimize — Get optimal budget
router.get('/budget/optimize', async (req, res) => {
  try {
    const budgetAI = getEngine('budget');
    const { income } = req.query;
    const result = await budgetAI.generateOptimalBudget(req.user._id, income ? parseFloat(income) : undefined);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Budget optimization failed', error: error.message });
  }
});

// GET /api/ai-intelligence/budget/adherence — Budget adherence analysis
router.get('/budget/adherence', async (req, res) => {
  try {
    const budgetAI = getEngine('budget');
    const { months = 3 } = req.query;
    const result = await budgetAI.analyzeBudgetAdherence(req.user._id, parseInt(months));
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Adherence analysis failed', error: error.message });
  }
});

// GET /api/ai-intelligence/budget/reallocation — Smart reallocation
router.get('/budget/reallocation', async (req, res) => {
  try {
    const budgetAI = getEngine('budget');
    const result = await budgetAI.suggestReallocation(req.user._id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Reallocation failed', error: error.message });
  }
});

// ==========================================
// Debt Payoff Engine
// ==========================================

// GET /api/ai-intelligence/debt/analyze — Full debt analysis
router.get('/debt/analyze', async (req, res) => {
  try {
    const debtEngine = getEngine('debt');
    const { extraMonthly = 0 } = req.query;
    const result = await debtEngine.analyzeDebts(req.user._id, parseFloat(extraMonthly));
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Debt analysis failed', error: error.message });
  }
});

// GET /api/ai-intelligence/debt/foreclosure/:emiId — Foreclosure analysis
router.get('/debt/foreclosure/:emiId', async (req, res) => {
  try {
    const debtEngine = getEngine('debt');
    const result = await debtEngine.analyzeForeclosure(req.user._id, req.params.emiId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Foreclosure analysis failed', error: error.message });
  }
});

// ==========================================
// Cash Flow Projections
// ==========================================

// GET /api/ai-intelligence/cashflow/project — Full projection
router.get('/cashflow/project', async (req, res) => {
  try {
    const cfEngine = getEngine('cashflow');
    const { horizon = 90, balance = 0 } = req.query;
    const result = await cfEngine.project(req.user._id, {
      horizon: parseInt(horizon),
      startBalance: parseFloat(balance),
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Projection failed', error: error.message });
  }
});

// GET /api/ai-intelligence/cashflow/short-term — 7-day projection  
router.get('/cashflow/short-term', async (req, res) => {
  try {
    const cfEngine = getEngine('cashflow');
    const { balance = 0 } = req.query;
    const result = await cfEngine.projectShortTerm(req.user._id, parseFloat(balance));
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Short-term projection failed', error: error.message });
  }
});

// GET /api/ai-intelligence/cashflow/balance-risk — Balance risk analysis
router.get('/cashflow/balance-risk', async (req, res) => {
  try {
    const cfEngine = getEngine('cashflow');
    const { balance = 0 } = req.query;
    const result = await cfEngine.analyzeBalanceRisk(req.user._id, parseFloat(balance));
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Risk analysis failed', error: error.message });
  }
});

// ==========================================
// Advanced NLP Chat
// ==========================================

// POST /api/ai-intelligence/chat — Process chat message
router.post('/chat', async (req, res) => {
  try {
    const { AdvancedNLPChatEngine } = require('../services/ai/advancedNLPChat');
    const chatEngine = new AdvancedNLPChatEngine();
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message required' });
    const result = await chatEngine.processMessage(req.user._id, message);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Chat error:', error);
    res.status(500).json({ success: false, message: 'Chat failed', error: error.message });
  }
});

// ==========================================
// Pattern Recognition
// ==========================================

// GET /api/ai-intelligence/patterns — Full pattern analysis
router.get('/patterns', async (req, res) => {
  try {
    const { PatternRecognitionEngine } = require('../services/ai/patternRecognition');
    const engine = new PatternRecognitionEngine();
    const result = await engine.fullAnalysis(req.user._id);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Pattern analysis error:', error);
    res.status(500).json({ success: false, message: 'Pattern analysis failed', error: error.message });
  }
});

// ==========================================
// Smart Investment Advisor
// ==========================================

// GET /api/ai-intelligence/invest/analyze — Investment analysis
router.get('/invest/analyze', async (req, res) => {
  try {
    const advisor = require('../services/ai/smartInvestmentAdvisor');
    const result = await advisor.analyze(req.user._id);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Investment analysis error:', error);
    res.status(500).json({ success: false, message: 'Investment analysis failed', error: error.message });
  }
});

// POST /api/ai-intelligence/invest/sip-projection — SIP calculator
router.post('/invest/sip-projection', async (req, res) => {
  try {
    const advisor = require('../services/ai/smartInvestmentAdvisor');
    const { monthlyAmount, years, expectedReturn } = req.body;
    const result = advisor.calculateSIPProjection(parseFloat(monthlyAmount) || 5000, parseInt(years) || 10, parseFloat(expectedReturn) || 12);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'SIP projection failed', error: error.message });
  }
});

// POST /api/ai-intelligence/invest/goal-sip — Goal-based SIP
router.post('/invest/goal-sip', async (req, res) => {
  try {
    const advisor = require('../services/ai/smartInvestmentAdvisor');
    const { targetAmount, years, expectedReturn } = req.body;
    const result = advisor.calculateGoalSIP(parseFloat(targetAmount) || 1000000, parseInt(years) || 5, parseFloat(expectedReturn) || 12);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Goal SIP calc failed', error: error.message });
  }
});

// ==========================================
// Predictive Alerts
// ==========================================

// GET /api/ai-intelligence/alerts/predictive — Proactive alerts
router.get('/alerts/predictive', async (req, res) => {
  try {
    const alertSystem = require('../services/ai/predictiveAlerts');
    const result = await alertSystem.generateAlerts(req.user._id);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Predictive alerts error:', error);
    res.status(500).json({ success: false, message: 'Alert generation failed', error: error.message });
  }
});

// ==========================================
// Financial Literacy
// ==========================================

// GET /api/ai-intelligence/learn/path — Learning path
router.get('/learn/path', async (req, res) => {
  try {
    const literacy = require('../services/ai/financialLiteracy');
    const result = literacy.getLearningPath(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Learning path failed', error: error.message });
  }
});

// GET /api/ai-intelligence/learn/concept/:id — Get concept
router.get('/learn/concept/:id', async (req, res) => {
  try {
    const literacy = require('../services/ai/financialLiteracy');
    const concept = literacy.getConcept(req.params.id);
    if (!concept) return res.status(404).json({ success: false, message: 'Concept not found' });
    res.json({ success: true, data: concept });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Concept fetch failed', error: error.message });
  }
});

// GET /api/ai-intelligence/learn/concepts — All concepts
router.get('/learn/concepts', async (req, res) => {
  try {
    const literacy = require('../services/ai/financialLiteracy');
    const { category } = req.query;
    const result = category ? literacy.getConceptsByCategory(category) : literacy.getAllConcepts();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch concepts', error: error.message });
  }
});

// GET /api/ai-intelligence/learn/tip — Daily tip
router.get('/learn/tip', async (req, res) => {
  try {
    const literacy = require('../services/ai/financialLiteracy');
    res.json({ success: true, data: literacy.getDailyTip() });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Tip failed', error: error.message });
  }
});

// POST /api/ai-intelligence/learn/quiz — Generate quiz
router.post('/learn/quiz', async (req, res) => {
  try {
    const literacy = require('../services/ai/financialLiteracy');
    const { category, count } = req.body;
    const result = literacy.generateQuiz(category, parseInt(count) || 5);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Quiz generation failed', error: error.message });
  }
});

// POST /api/ai-intelligence/learn/quiz/evaluate — Evaluate quiz
router.post('/learn/quiz/evaluate', async (req, res) => {
  try {
    const literacy = require('../services/ai/financialLiteracy');
    const { answers, correctAnswers } = req.body;
    const result = literacy.evaluateQuiz(answers || [], correctAnswers || []);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Quiz eval failed', error: error.message });
  }
});

// GET /api/ai-intelligence/learn/jargon/:term — Decode jargon
router.get('/learn/jargon/:term', async (req, res) => {
  try {
    const literacy = require('../services/ai/financialLiteracy');
    const result = literacy.decodeJargon(req.params.term);
    res.json({ success: true, data: { term: req.params.term, definition: result } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Jargon decode failed', error: error.message });
  }
});

// GET /api/ai-intelligence/learn/jargon — Search jargon
router.get('/learn/jargon', async (req, res) => {
  try {
    const literacy = require('../services/ai/financialLiteracy');
    const { q } = req.query;
    const result = q ? literacy.searchJargon(q) : Object.entries(require('../services/ai/financialLiteracy')).slice(0, 20);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Jargon search failed', error: error.message });
  }
});

module.exports = router;
