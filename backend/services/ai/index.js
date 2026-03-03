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
};
