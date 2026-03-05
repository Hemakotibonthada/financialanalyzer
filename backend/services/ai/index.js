// ============================================================================
// AI MODULE INDEX — Unified Export for All AI/ML Components
// ============================================================================

'use strict';

// Neural Network Library
const {
  Matrix,
  NeuralNetwork,
  DenseLayer,
  SpendingPredictorNN,
  AnomalyDetectorNN,
  CategoryClassifierNN,
} = require('./neuralNetwork');

// Decision Trees & Ensemble Methods
const {
  DecisionTree,
  RandomForest,
  GradientBoostedTrees,
  FinancialRiskClassifier,
} = require('./decisionTree');

// Clustering & Dimensionality Reduction
const {
  KMeans,
  DBSCAN,
  HierarchicalClustering,
  PCA,
  CustomerSegmentation,
  SpendingPatternDiscovery,
} = require('./clustering');

// NLP & Sentiment Analysis
const {
  Tokenizer,
  TFIDFVectorizer,
  SentimentAnalyzer,
  FinancialNER,
  QueryUnderstanding,
  TextSummarizer,
  ConversationManager,
} = require('./nlpEngine');

// Time Series & Forecasting
const {
  HoltWinters,
  ARIMA,
  SeasonalDecomposition,
  ChangepointDetector,
  MovingAverage,
  FinancialForecaster,
  CashflowProjector,
  RecurringTransactionDetector,
  autocorrelation,
  partialAutocorrelation,
} = require('./timeSeries');

// Training Pipeline & Orchestration
const {
  AITrainingPipeline,
  ModelRegistry,
  DataPreprocessor,
  TrainingScheduler,
  PerformanceTracker,
  CrossValidator,
} = require('./trainingPipeline');

// Reinforcement Learning
const {
  QTable, DQN, SimpleNeuralNet, PolicyGradientAgent, ActorCritic,
  ReplayBuffer, BudgetOptimizationEnv, InvestmentStrategyEnv,
  DebtPayoffEnv, RLBudgetOptimizer, MultiArmedBandit,
} = require('./reinforcementLearning');

// Advanced Anomaly Detection
const {
  IsolationForest, LocalOutlierFactor, StatisticalProcessControl,
  Autoencoder, EnsembleAnomalyDetector, FinancialAnomalyAnalyzer,
  TransactionFeatureExtractor,
} = require('./advancedAnomalyDetection');

// Knowledge Graph
const {
  KnowledgeGraph, FinancialKnowledgeGraphBuilder, GraphReasoningEngine,
} = require('./knowledgeGraph');

// AutoML Pipeline
const {
  FeatureEngineer, LinearRegressionModel, LogisticRegressionModel,
  KNearestNeighbors, GradientBoostingRegressor, SupportVectorRegressor,
  AutoMLPipeline, AutoMLModelRegistry,
} = require('./autoMLPipeline');

// Explainable AI
const {
  PermutationFeatureImportance, ShapleyExplainer, LIMEExplainer,
  CounterfactualExplainer, DecisionAuditTrail, NaturalLanguageExplainer,
  ConfidenceCalibrator, ExplainabilityService,
} = require('./explainableAI');

// Conversational AI
const {
  ConversationMemory, FinancialIntentClassifier, FinancialEntityExtractor,
  DialogStateTracker, FinancialResponseGenerator, ConversationalAIEngine,
} = require('./conversationalAI');

// Model Monitoring
const {
  DataDriftDetector, ConceptDriftDetector, PredictionLogger,
  ABTestManager, ModelMonitoringService,
} = require('./modelMonitoring');

// AI Orchestrator
const AIOrchestrator = require('./aiOrchestrator');

module.exports = {
  // Neural Networks
  Matrix,
  NeuralNetwork,
  DenseLayer,
  SpendingPredictorNN,
  AnomalyDetectorNN,
  CategoryClassifierNN,

  // Decision Trees
  DecisionTree,
  RandomForest,
  GradientBoostedTrees,
  FinancialRiskClassifier,

  // Clustering
  KMeans,
  DBSCAN,
  HierarchicalClustering,
  PCA,
  CustomerSegmentation,
  SpendingPatternDiscovery,

  // NLP
  Tokenizer,
  TFIDFVectorizer,
  SentimentAnalyzer,
  FinancialNER,
  QueryUnderstanding,
  TextSummarizer,
  ConversationManager,

  // Time Series
  HoltWinters,
  ARIMA,
  SeasonalDecomposition,
  ChangepointDetector,
  MovingAverage,
  FinancialForecaster,
  CashflowProjector,
  RecurringTransactionDetector,
  autocorrelation,
  partialAutocorrelation,

  // Training Pipeline
  AITrainingPipeline,
  ModelRegistry,
  DataPreprocessor,
  TrainingScheduler,
  PerformanceTracker,
  CrossValidator,

  // Reinforcement Learning
  QTable, DQN, SimpleNeuralNet, PolicyGradientAgent, ActorCritic,
  ReplayBuffer, BudgetOptimizationEnv, InvestmentStrategyEnv,
  DebtPayoffEnv, RLBudgetOptimizer, MultiArmedBandit,

  // Advanced Anomaly Detection
  IsolationForest, LocalOutlierFactor, StatisticalProcessControl,
  Autoencoder, EnsembleAnomalyDetector, FinancialAnomalyAnalyzer,
  TransactionFeatureExtractor,

  // Knowledge Graph
  KnowledgeGraph, FinancialKnowledgeGraphBuilder, GraphReasoningEngine,

  // AutoML Pipeline
  FeatureEngineer, LinearRegressionModel, LogisticRegressionModel,
  KNearestNeighbors, GradientBoostingRegressor, SupportVectorRegressor,
  AutoMLPipeline, AutoMLModelRegistry,

  // Explainable AI
  PermutationFeatureImportance, ShapleyExplainer, LIMEExplainer,
  CounterfactualExplainer, DecisionAuditTrail, NaturalLanguageExplainer,
  ConfidenceCalibrator, ExplainabilityService,

  // Conversational AI
  ConversationMemory, FinancialIntentClassifier, FinancialEntityExtractor,
  DialogStateTracker, FinancialResponseGenerator, ConversationalAIEngine,

  // Model Monitoring
  DataDriftDetector, ConceptDriftDetector, PredictionLogger,
  ABTestManager, ModelMonitoringService,

  // Orchestrator
  AIOrchestrator,
};
