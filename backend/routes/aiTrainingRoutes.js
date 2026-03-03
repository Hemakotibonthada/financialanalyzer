// ============================================================================
// AI Model Training Routes — Enterprise ML Training Pipeline
// ============================================================================
// Endpoints for training, managing, and querying all local ML models.
// Provides individual model training, bulk training, model status,
// and real-time predictions from trained models.
// ============================================================================

const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');

let aiModelTrainer;
try { aiModelTrainer = require('../services/aiModelTrainer'); }
catch (e) { console.warn('aiModelTrainer not available:', e.message); }

let nlpChatEngine;
try { nlpChatEngine = require('../services/nlpChatEngine'); }
catch (e) { console.warn('nlpChatEngine not available:', e.message); }

// ============================================================================
// Model Training Endpoints
// ============================================================================

/**
 * @route   POST /api/ai-training/train-all
 * @desc    Train all ML models for the authenticated user
 * @access  Private
 */
router.post('/train-all', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!aiModelTrainer) return res.status(503).json({ success: false, error: 'AI training service unavailable' });
    const results = await aiModelTrainer.trainAllModels(userId);
    res.json({ success: true, ...results });
  } catch (error) {
    console.error('Train all models error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/ai-training/train/:modelName
 * @desc    Train a specific model
 * @access  Private
 */
router.post('/train/:modelName', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!aiModelTrainer) return res.status(503).json({ success: false, error: 'AI training service unavailable' });

    const trainers = {
      categorizer:           () => aiModelTrainer.trainCategorizer(userId),
      spending_patterns:     () => aiModelTrainer.trainSpendingPatterns(userId),
      anomaly_baselines:     () => aiModelTrainer.trainAnomalyBaselines(userId),
      budget_optimizer:      () => aiModelTrainer.trainBudgetOptimizer(userId),
      risk_profile:          () => aiModelTrainer.trainRiskProfile(userId),
      goal_forecaster:       () => aiModelTrainer.trainGoalForecaster(userId),
      lifestyle_cluster:     () => aiModelTrainer.trainLifestyleCluster(userId),
      income_predictor:      () => aiModelTrainer.trainIncomePredictor(userId),
      merchant_intelligence: () => aiModelTrainer.trainMerchantIntelligence(userId),
      sentiment_analyzer:    () => aiModelTrainer.trainSentimentAnalyzer(userId),
    };

    const modelName = req.params.modelName;
    const trainer = trainers[modelName];
    if (!trainer) {
      return res.status(400).json({
        success: false,
        error: `Unknown model: ${modelName}`,
        availableModels: Object.keys(trainers),
      });
    }

    const result = await trainer();
    res.json({ success: true, model: modelName, ...result });
  } catch (error) {
    console.error(`Train model error:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Model Status & Query Endpoints
// ============================================================================

/**
 * @route   GET /api/ai-training/status
 * @desc    Get status of all trained models
 * @access  Private
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!aiModelTrainer) return res.status(503).json({ success: false, error: 'AI training service unavailable' });
    const status = aiModelTrainer.getModelStatus(userId);
    res.json({ success: true, ...status });
  } catch (error) {
    console.error('Model status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/ai-training/model/:modelName
 * @desc    Get a trained model's predictions/data
 * @access  Private
 */
router.get('/model/:modelName', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!aiModelTrainer) return res.status(503).json({ success: false, error: 'AI training service unavailable' });
    const result = aiModelTrainer.getModelPrediction(userId, req.params.modelName);
    res.json(result);
  } catch (error) {
    console.error('Model query error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/ai-training/models
 * @desc    List all saved models for the user
 * @access  Private
 */
router.get('/models', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!aiModelTrainer) return res.status(503).json({ success: false, error: 'AI training service unavailable' });
    const models = aiModelTrainer.listModels(userId);
    res.json({ success: true, models, count: models.length });
  } catch (error) {
    console.error('List models error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Prediction Endpoints
// ============================================================================

/**
 * @route   POST /api/ai-training/classify
 * @desc    Classify a transaction using trained model
 * @access  Private
 */
router.post('/classify', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!aiModelTrainer) return res.status(503).json({ success: false, error: 'AI training service unavailable' });
    const { description, amount, merchantName } = req.body;
    const result = aiModelTrainer.classifyTransaction(userId, description, amount, merchantName);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Classify error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/ai-training/batch-classify
 * @desc    Classify multiple transactions at once
 * @access  Private
 */
router.post('/batch-classify', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!aiModelTrainer) return res.status(503).json({ success: false, error: 'AI training service unavailable' });
    const { transactions } = req.body;
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ success: false, error: 'Provide transactions array' });
    }
    const results = transactions.map(t =>
      aiModelTrainer.classifyTransaction(userId, t.description, t.amount, t.merchantName)
    );
    res.json({ success: true, results, classified: results.length });
  } catch (error) {
    console.error('Batch classify error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// NLP Chat Endpoint
// ============================================================================

/**
 * @route   POST /api/ai-training/chat
 * @desc    Process a natural language financial query
 * @access  Private
 */
router.post('/chat', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!nlpChatEngine) return res.status(503).json({ success: false, error: 'NLP chat engine unavailable' });
    const { message, context } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'Message is required' });
    const response = await nlpChatEngine.processMessage(userId, message, context || {});
    res.json({ success: true, ...response });
  } catch (error) {
    console.error('NLP Chat error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/ai-training/suggestions
 * @desc    Get AI-powered smart suggestions
 * @access  Private
 */
router.get('/suggestions', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!nlpChatEngine) return res.status(503).json({ success: false, error: 'NLP chat engine unavailable' });
    const result = await nlpChatEngine.generateSmartSuggestions(userId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Risk Assessment Endpoint
// ============================================================================

/**
 * @route   GET /api/ai-training/risk-profile
 * @desc    Get complete risk profile with stress tests
 * @access  Private
 */
router.get('/risk-profile', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!aiModelTrainer) return res.status(503).json({ success: false, error: 'AI training service unavailable' });
    const model = aiModelTrainer.getModelPrediction(userId, 'risk_profile');
    if (!model.success) {
      // Auto-train if not available
      const result = await aiModelTrainer.trainRiskProfile(userId);
      return res.json({ success: true, ...result, autoTrained: true });
    }
    res.json({ success: true, ...model.data });
  } catch (error) {
    console.error('Risk profile error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/ai-training/budget-optimization
 * @desc    Get AI budget optimization recommendations
 * @access  Private
 */
router.get('/budget-optimization', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!aiModelTrainer) return res.status(503).json({ success: false, error: 'AI training service unavailable' });
    const model = aiModelTrainer.getModelPrediction(userId, 'budget_optimizer');
    if (!model.success) {
      const result = await aiModelTrainer.trainBudgetOptimizer(userId);
      return res.json({ success: true, ...result, autoTrained: true });
    }
    res.json({ success: true, ...model.data });
  } catch (error) {
    console.error('Budget optimization error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/ai-training/spending-forecast
 * @desc    Get ML spending forecast with trends
 * @access  Private
 */
router.get('/spending-forecast', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!aiModelTrainer) return res.status(503).json({ success: false, error: 'AI training service unavailable' });
    const model = aiModelTrainer.getModelPrediction(userId, 'spending_patterns');
    if (!model.success) {
      const result = await aiModelTrainer.trainSpendingPatterns(userId);
      return res.json({ success: true, ...result, autoTrained: true });
    }
    res.json({ success: true, ...model.data });
  } catch (error) {
    console.error('Spending forecast error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/ai-training/merchant-intelligence
 * @desc    Get merchant intelligence analysis
 * @access  Private
 */
router.get('/merchant-intelligence', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!aiModelTrainer) return res.status(503).json({ success: false, error: 'AI training service unavailable' });
    const model = aiModelTrainer.getModelPrediction(userId, 'merchant_intelligence');
    if (!model.success) {
      const result = await aiModelTrainer.trainMerchantIntelligence(userId);
      return res.json({ success: true, ...result, autoTrained: true });
    }
    res.json({ success: true, ...model.data });
  } catch (error) {
    console.error('Merchant intelligence error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/ai-training/lifestyle
 * @desc    Get lifestyle clustering analysis
 * @access  Private
 */
router.get('/lifestyle', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!aiModelTrainer) return res.status(503).json({ success: false, error: 'AI training service unavailable' });
    const model = aiModelTrainer.getModelPrediction(userId, 'lifestyle_cluster');
    if (!model.success) {
      const result = await aiModelTrainer.trainLifestyleCluster(userId);
      return res.json({ success: true, ...result, autoTrained: true });
    }
    res.json({ success: true, ...model.data });
  } catch (error) {
    console.error('Lifestyle analysis error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/ai-training/sentiment
 * @desc    Get financial sentiment analysis
 * @access  Private
 */
router.get('/sentiment', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!aiModelTrainer) return res.status(503).json({ success: false, error: 'AI training service unavailable' });
    const model = aiModelTrainer.getModelPrediction(userId, 'sentiment_analyzer');
    if (!model.success) {
      const result = await aiModelTrainer.trainSentimentAnalyzer(userId);
      return res.json({ success: true, ...result, autoTrained: true });
    }
    res.json({ success: true, ...model.data });
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/ai-training/income-forecast
 * @desc    Get income prediction model data
 * @access  Private
 */
router.get('/income-forecast', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!aiModelTrainer) return res.status(503).json({ success: false, error: 'AI training service unavailable' });
    const model = aiModelTrainer.getModelPrediction(userId, 'income_predictor');
    if (!model.success) {
      const result = await aiModelTrainer.trainIncomePredictor(userId);
      return res.json({ success: true, ...result, autoTrained: true });
    }
    res.json({ success: true, ...model.data });
  } catch (error) {
    console.error('Income forecast error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/ai-training/goal-forecast
 * @desc    Get goal achievement forecast
 * @access  Private
 */
router.get('/goal-forecast', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!aiModelTrainer) return res.status(503).json({ success: false, error: 'AI training service unavailable' });
    const model = aiModelTrainer.getModelPrediction(userId, 'goal_forecaster');
    if (!model.success) {
      const result = await aiModelTrainer.trainGoalForecaster(userId);
      return res.json({ success: true, ...result, autoTrained: true });
    }
    res.json({ success: true, ...model.data });
  } catch (error) {
    console.error('Goal forecast error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
