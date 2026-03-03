// ============================================================
// AI Engine API Routes — Enhanced with Neural Networks, NLP,
// Time Series, Clustering, and Decision Trees
// ============================================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const aiController = require('../controllers/aiController');

// ─── Core AI Dashboard ───────────────────────────────────────
router.get('/dashboard', authenticate, aiController.getDashboard);
router.get('/health-score', authenticate, aiController.getHealthScore);
router.get('/recommendations', authenticate, aiController.getRecommendations);

// ─── Forecasting ─────────────────────────────────────────────
router.get('/forecast/spending', authenticate, aiController.getSpendingForecast);
router.get('/forecast/income', authenticate, aiController.getIncomeForecast);
router.get('/forecast/savings', authenticate, aiController.getSavingsForecast);
router.get('/forecast/cashflow', authenticate, aiController.getCashflowProjection);

// ─── Anomaly & Change Detection ──────────────────────────────
router.get('/anomalies', authenticate, aiController.getAnomalies);
router.get('/changepoints', authenticate, aiController.getChangepoints);

// ─── Insights & Analysis ────────────────────────────────────
router.get('/insights', authenticate, aiController.getInsights);
router.get('/sentiment', authenticate, aiController.getSentiment);
router.get('/summary', authenticate, aiController.getFinancialSummary);
router.get('/risk-assessment', authenticate, aiController.getRiskAssessment);
router.get('/moving-averages', authenticate, aiController.getMovingAverages);

// ─── Pattern Analysis ────────────────────────────────────────
router.get('/patterns/recurring', authenticate, aiController.getRecurringPatterns);
router.get('/patterns/merchants', authenticate, aiController.getMerchantAnalysis);
router.get('/patterns/velocity', authenticate, aiController.getVelocityAnalysis);
router.get('/patterns/spending', authenticate, aiController.getSpendingPatterns);

// ─── NLP & Entity Extraction ────────────────────────────────
router.post('/query', authenticate, aiController.processQuery);
router.post('/entities', authenticate, aiController.extractEntities);

// ─── Model Training & Pipeline ──────────────────────────────
router.post('/train', authenticate, aiController.trainModels);
router.post('/categorize', authenticate, aiController.categorize);
router.get('/pipeline/status', authenticate, aiController.getPipelineStatus);

module.exports = router;
