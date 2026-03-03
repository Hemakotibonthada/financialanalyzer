// ============================================================================
// AI TRAINING PIPELINE — Self-Training Orchestration Engine
// ============================================================================
// Orchestrates training of all AI models, manages model versions,
// schedules automatic retraining, tracks performance metrics,
// and maintains a model registry. Fully local — no external APIs.
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');

// Import AI modules
const { NeuralNetwork, SpendingPredictorNN, AnomalyDetectorNN, CategoryClassifierNN } = require('./neuralNetwork');
const { RandomForest, GradientBoostedTrees, FinancialRiskClassifier } = require('./decisionTree');
const { KMeans, DBSCAN, CustomerSegmentation, SpendingPatternDiscovery } = require('./clustering');
const { SentimentAnalyzer, TFIDFVectorizer, FinancialNER, QueryUnderstanding, TextSummarizer } = require('./nlpEngine');
const { HoltWinters, ARIMA, FinancialForecaster, ChangepointDetector, RecurringTransactionDetector } = require('./timeSeries');

// ============================================================================
// §0  MODEL REGISTRY
// ============================================================================

class ModelRegistry {
  constructor(basePath) {
    this.basePath = basePath || path.join(__dirname, '../../data/models');
    this.registry = {};
    this.ensureDirectory();
    this.loadRegistry();
  }

  ensureDirectory() {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
    const registryDir = path.join(this.basePath, 'registry');
    if (!fs.existsSync(registryDir)) {
      fs.mkdirSync(registryDir, { recursive: true });
    }
  }

  loadRegistry() {
    const registryPath = path.join(this.basePath, 'registry', 'models.json');
    try {
      if (fs.existsSync(registryPath)) {
        this.registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      }
    } catch (err) {
      logger?.warn?.('Failed to load model registry:', err.message);
      this.registry = {};
    }
  }

  saveRegistry() {
    const registryPath = path.join(this.basePath, 'registry', 'models.json');
    try {
      fs.writeFileSync(registryPath, JSON.stringify(this.registry, null, 2));
    } catch (err) {
      logger?.error?.('Failed to save model registry:', err.message);
    }
  }

  registerModel(name, metadata) {
    if (!this.registry[name]) {
      this.registry[name] = { versions: [], currentVersion: null };
    }

    const version = {
      version: (this.registry[name].versions.length + 1),
      timestamp: Date.now(),
      metrics: metadata.metrics || {},
      config: metadata.config || {},
      dataSize: metadata.dataSize || 0,
      trainingDuration: metadata.trainingDuration || 0,
      status: 'active',
    };

    this.registry[name].versions.push(version);
    this.registry[name].currentVersion = version.version;
    this.saveRegistry();

    return version;
  }

  getModelInfo(name) {
    return this.registry[name] || null;
  }

  getLatestVersion(name) {
    const info = this.registry[name];
    if (!info || !info.versions.length) return null;
    return info.versions[info.versions.length - 1];
  }

  saveModelWeights(name, weights) {
    const modelDir = path.join(this.basePath, name);
    if (!fs.existsSync(modelDir)) {
      fs.mkdirSync(modelDir, { recursive: true });
    }

    const filePath = path.join(modelDir, `v${this.registry[name]?.currentVersion || 1}.json`);
    try {
      fs.writeFileSync(filePath, JSON.stringify(weights));
      return filePath;
    } catch (err) {
      logger?.error?.('Failed to save model weights:', err.message);
      return null;
    }
  }

  loadModelWeights(name, version = null) {
    const v = version || this.registry[name]?.currentVersion || 1;
    const filePath = path.join(this.basePath, name, `v${v}.json`);
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    } catch (err) {
      logger?.warn?.('Failed to load model weights:', err.message);
    }
    return null;
  }

  getAllModels() {
    return Object.entries(this.registry).map(([name, info]) => ({
      name,
      currentVersion: info.currentVersion,
      totalVersions: info.versions.length,
      lastTrained: info.versions.length > 0 ? new Date(info.versions[info.versions.length - 1].timestamp).toISOString() : null,
      metrics: info.versions.length > 0 ? info.versions[info.versions.length - 1].metrics : {},
    }));
  }
}

// ============================================================================
// §1  DATA PREPROCESSOR
// ============================================================================

class DataPreprocessor {
  constructor() {
    this.scalers = {};
  }

  // Min-Max scaling
  minMaxScale(data, featureName) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    this.scalers[featureName] = { type: 'minmax', min, max };
    return data.map(v => max !== min ? (v - min) / (max - min) : 0.5);
  }

  // Standard scaling (z-score)
  standardScale(data, featureName) {
    const m = data.reduce((s, v) => s + v, 0) / data.length;
    const s = Math.sqrt(data.reduce((ss, v) => ss + (v - m) ** 2, 0) / data.length);
    this.scalers[featureName] = { type: 'standard', mean: m, std: s };
    return data.map(v => s !== 0 ? (v - m) / s : 0);
  }

  // Inverse transform
  inverseScale(data, featureName) {
    const scaler = this.scalers[featureName];
    if (!scaler) return data;

    if (scaler.type === 'minmax') {
      return data.map(v => v * (scaler.max - scaler.min) + scaler.min);
    }
    return data.map(v => v * scaler.std + scaler.mean);
  }

  // Handle missing values
  fillMissing(data, strategy = 'mean') {
    const validValues = data.filter(v => v != null && !isNaN(v));
    let fillValue;

    switch (strategy) {
      case 'mean': fillValue = validValues.reduce((s, v) => s + v, 0) / validValues.length; break;
      case 'median': {
        const sorted = [...validValues].sort((a, b) => a - b);
        fillValue = sorted[Math.floor(sorted.length / 2)];
        break;
      }
      case 'zero': fillValue = 0; break;
      default: fillValue = 0;
    }

    return data.map(v => v == null || isNaN(v) ? fillValue : v);
  }

  // Detect and handle outliers using IQR
  handleOutliers(data, method = 'clip') {
    const sorted = [...data].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;

    if (method === 'clip') {
      return data.map(v => Math.max(lower, Math.min(upper, v)));
    }
    if (method === 'remove') {
      return data.filter(v => v >= lower && v <= upper);
    }
    // Replace with median
    const median = sorted[Math.floor(sorted.length / 2)];
    return data.map(v => v < lower || v > upper ? median : v);
  }

  // Feature engineering from transactions
  extractFeatures(transactions) {
    const features = {};
    const amounts = transactions.map(t => Math.abs(t.amount || 0));

    features.totalAmount = amounts.reduce((s, v) => s + v, 0);
    features.avgAmount = features.totalAmount / amounts.length || 0;
    features.maxAmount = Math.max(...amounts, 0);
    features.minAmount = Math.min(...amounts, Infinity);
    features.stdAmount = Math.sqrt(amounts.reduce((s, v) => s + (v - features.avgAmount) ** 2, 0) / amounts.length);
    features.medianAmount = [...amounts].sort((a, b) => a - b)[Math.floor(amounts.length / 2)] || 0;
    features.transactionCount = transactions.length;

    // Category distribution
    const categories = {};
    for (const t of transactions) {
      const cat = t.category || 'other';
      categories[cat] = (categories[cat] || 0) + 1;
    }
    features.uniqueCategories = Object.keys(categories).length;
    features.topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'other';

    // Temporal features
    const dates = transactions.map(t => new Date(t.date));
    if (dates.length > 1) {
      const intervals = [];
      const sortedDates = dates.sort((a, b) => a - b);
      for (let i = 1; i < sortedDates.length; i++) {
        intervals.push((sortedDates[i] - sortedDates[i - 1]) / 86400000);
      }
      features.avgDaysBetween = intervals.reduce((s, v) => s + v, 0) / intervals.length;
      features.maxGapDays = Math.max(...intervals);
    }

    // Day-of-week distribution
    const dayDist = new Array(7).fill(0);
    for (const d of dates) {
      dayDist[d.getDay()]++;
    }
    features.weekdayRatio = (dayDist[1] + dayDist[2] + dayDist[3] + dayDist[4] + dayDist[5]) / dates.length;

    return features;
  }

  serialize() {
    return { scalers: this.scalers };
  }

  static deserialize(obj) {
    const dp = new DataPreprocessor();
    dp.scalers = obj.scalers || {};
    return dp;
  }
}

// ============================================================================
// §2  TRAINING JOB SCHEDULER
// ============================================================================

class TrainingScheduler {
  constructor() {
    this.jobs = new Map();
    this.intervals = new Map();
    this.history = [];
  }

  schedule(jobName, trainFn, intervalMs = 3600000, runImmediately = false) {
    if (this.intervals.has(jobName)) {
      clearInterval(this.intervals.get(jobName));
    }

    this.jobs.set(jobName, {
      trainFn,
      intervalMs,
      lastRun: null,
      nextRun: Date.now() + (runImmediately ? 0 : intervalMs),
      status: 'scheduled',
      runCount: 0,
    });

    const run = async () => {
      const job = this.jobs.get(jobName);
      if (!job) return;

      job.status = 'running';
      job.lastRun = Date.now();
      job.runCount++;

      try {
        const startTime = Date.now();
        const result = await trainFn();
        const duration = Date.now() - startTime;

        job.status = 'completed';
        job.lastResult = result;
        job.lastDuration = duration;
        job.nextRun = Date.now() + intervalMs;

        this.history.push({
          job: jobName,
          timestamp: Date.now(),
          duration,
          status: 'success',
          metrics: result?.metrics || {},
        });

        logger?.info?.(`Training job "${jobName}" completed in ${duration}ms`);
      } catch (err) {
        job.status = 'failed';
        job.lastError = err.message;

        this.history.push({
          job: jobName,
          timestamp: Date.now(),
          status: 'failed',
          error: err.message,
        });

        logger?.error?.(`Training job "${jobName}" failed:`, err.message);
      }
    };

    if (runImmediately) {
      run();
    }

    const interval = setInterval(run, intervalMs);
    this.intervals.set(jobName, interval);
  }

  cancel(jobName) {
    if (this.intervals.has(jobName)) {
      clearInterval(this.intervals.get(jobName));
      this.intervals.delete(jobName);
    }
    this.jobs.delete(jobName);
  }

  cancelAll() {
    for (const [name] of this.intervals) {
      clearInterval(this.intervals.get(name));
    }
    this.intervals.clear();
    this.jobs.clear();
  }

  getStatus() {
    const jobStatuses = {};
    for (const [name, job] of this.jobs) {
      jobStatuses[name] = {
        status: job.status,
        lastRun: job.lastRun ? new Date(job.lastRun).toISOString() : null,
        nextRun: job.nextRun ? new Date(job.nextRun).toISOString() : null,
        runCount: job.runCount,
        lastDuration: job.lastDuration,
        intervalMs: job.intervalMs,
      };
    }
    return {
      jobs: jobStatuses,
      totalJobs: this.jobs.size,
      history: this.history.slice(-20), // Last 20 entries
    };
  }
}

// ============================================================================
// §3  PERFORMANCE TRACKER
// ============================================================================

class PerformanceTracker {
  constructor() {
    this.metrics = {};
  }

  record(modelName, metrics) {
    if (!this.metrics[modelName]) {
      this.metrics[modelName] = [];
    }

    this.metrics[modelName].push({
      timestamp: Date.now(),
      ...metrics,
    });

    // Keep last 100 records per model
    if (this.metrics[modelName].length > 100) {
      this.metrics[modelName] = this.metrics[modelName].slice(-100);
    }
  }

  getMetrics(modelName) {
    return this.metrics[modelName] || [];
  }

  getLatest(modelName) {
    const records = this.metrics[modelName];
    return records ? records[records.length - 1] : null;
  }

  getTrend(modelName, metricKey = 'accuracy') {
    const records = this.metrics[modelName] || [];
    if (records.length < 2) return 'stable';

    const recent = records.slice(-5).map(r => r[metricKey]).filter(v => v != null);
    if (recent.length < 2) return 'stable';

    const slope = (recent[recent.length - 1] - recent[0]) / recent.length;
    if (slope > 0.01) return 'improving';
    if (slope < -0.01) return 'degrading';
    return 'stable';
  }

  shouldRetrain(modelName, degradationThreshold = 0.1) {
    const records = this.metrics[modelName] || [];
    if (records.length < 3) return true;

    const latest = records[records.length - 1];
    const best = records.reduce((best, r) => {
      const accuracyKey = Object.keys(r).find(k => k.includes('accuracy') || k.includes('score'));
      if (accuracyKey && r[accuracyKey] > (best[accuracyKey] || 0)) return r;
      return best;
    }, records[0]);

    const accuracyKey = Object.keys(latest).find(k => k.includes('accuracy') || k.includes('score'));
    if (!accuracyKey) return true;

    return (best[accuracyKey] - latest[accuracyKey]) > degradationThreshold;
  }

  getSummary() {
    return Object.entries(this.metrics).map(([model, records]) => ({
      model,
      totalRecords: records.length,
      latest: records[records.length - 1],
      trend: this.getTrend(model),
      needsRetrain: this.shouldRetrain(model),
    }));
  }
}

// ============================================================================
// §4  CROSS-VALIDATION ENGINE
// ============================================================================

class CrossValidator {
  // K-Fold Cross Validation
  static kFold(data, labels, k = 5, trainFn, evaluateFn) {
    const n = data.length;
    const foldSize = Math.floor(n / k);
    const indices = Array.from({ length: n }, (_, i) => i);

    // Shuffle indices
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const scores = [];

    for (let fold = 0; fold < k; fold++) {
      const testStart = fold * foldSize;
      const testEnd = fold === k - 1 ? n : (fold + 1) * foldSize;

      const testIndices = indices.slice(testStart, testEnd);
      const trainIndices = [...indices.slice(0, testStart), ...indices.slice(testEnd)];

      const trainData = trainIndices.map(i => data[i]);
      const trainLabels = trainIndices.map(i => labels[i]);
      const testData = testIndices.map(i => data[i]);
      const testLabels = testIndices.map(i => labels[i]);

      const model = trainFn(trainData, trainLabels);
      const score = evaluateFn(model, testData, testLabels);
      scores.push(score);
    }

    return {
      scores,
      mean: scores.reduce((s, v) => s + v, 0) / scores.length,
      std: Math.sqrt(scores.reduce((s, v) => s + (v - scores.reduce((ss, vv) => ss + vv, 0) / scores.length) ** 2, 0) / scores.length),
      min: Math.min(...scores),
      max: Math.max(...scores),
    };
  }

  // Time Series Cross Validation (expanding window)
  static timeSeriesCV(data, k = 5, trainFn, evaluateFn) {
    const minTrainSize = Math.floor(data.length * 0.3);
    const stepSize = Math.floor((data.length - minTrainSize) / k);
    const scores = [];

    for (let fold = 0; fold < k; fold++) {
      const trainEnd = minTrainSize + fold * stepSize;
      const testEnd = Math.min(trainEnd + stepSize, data.length);

      const trainData = data.slice(0, trainEnd);
      const testData = data.slice(trainEnd, testEnd);

      if (testData.length < 2) break;

      const model = trainFn(trainData);
      const score = evaluateFn(model, testData);
      scores.push(score);
    }

    return {
      scores,
      mean: scores.reduce((s, v) => s + v, 0) / scores.length,
      std: Math.sqrt(scores.reduce((s, v) => s + (v - scores.reduce((ss, vv) => ss + vv, 0) / scores.length) ** 2, 0) / scores.length),
    };
  }
}

// ============================================================================
// §5  AI TRAINING PIPELINE (Main Orchestrator)
// ============================================================================

class AITrainingPipeline {
  constructor(config = {}) {
    this.modelRegistry = new ModelRegistry(config.modelPath);
    this.preprocessor = new DataPreprocessor();
    this.scheduler = new TrainingScheduler();
    this.performance = new PerformanceTracker();

    // Model instances
    this.models = {
      spendingPredictor: null,
      anomalyDetector: null,
      categoryClassifier: null,
      riskClassifier: null,
      customerSegmentation: null,
      spendingPatterns: null,
      sentimentAnalyzer: new SentimentAnalyzer(),
      forecaster: new FinancialForecaster(),
      ner: new FinancialNER(),
      queryEngine: new QueryUnderstanding(),
      summarizer: new TextSummarizer(),
      changepointDetector: new ChangepointDetector(),
      recurringDetector: new RecurringTransactionDetector(),
    };

    this.isTraining = false;
    this.lastFullTraining = null;
  }

  // Initialize and load saved models
  async initialize() {
    logger?.info?.('AI Training Pipeline: Initializing...');

    try {
      // Load saved model weights
      for (const modelName of ['spendingPredictor', 'anomalyDetector', 'categoryClassifier', 'riskClassifier']) {
        const weights = this.modelRegistry.loadModelWeights(modelName);
        if (weights) {
          logger?.info?.(`Loaded model weights: ${modelName}`);
        }
      }

      logger?.info?.('AI Training Pipeline: Initialized successfully');
      return true;
    } catch (err) {
      logger?.error?.('AI Training Pipeline initialization failed:', err.message);
      return false;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TRAINING METHODS
  // ──────────────────────────────────────────────────────────────────────────

  async trainSpendingPredictor(transactions) {
    const startTime = Date.now();
    logger?.info?.('Training: Spending Predictor...');

    try {
      const model = new SpendingPredictorNN({
        learningRate: 0.001,
        epochs: 100,
        batchSize: 32,
      });

      // Prepare data
      const monthlyData = {};
      for (const t of transactions) {
        if (t.type === 'expense' || t.type === 'debit') {
          const month = new Date(t.date).toISOString().slice(0, 7);
          if (!monthlyData[month]) monthlyData[month] = [];
          monthlyData[month].push(t);
        }
      }

      const sortedMonths = Object.keys(monthlyData).sort();
      if (sortedMonths.length < 6) {
        logger?.warn?.('Insufficient data for spending predictor training');
        return { success: false, reason: 'insufficient_data' };
      }

      const trainResult = model.train(transactions);

      // Register model
      const metrics = {
        accuracy: trainResult?.accuracy || 0,
        loss: trainResult?.loss || 0,
        dataPoints: transactions.length,
      };

      this.modelRegistry.registerModel('spendingPredictor', {
        metrics,
        dataSize: transactions.length,
        trainingDuration: Date.now() - startTime,
      });

      this.models.spendingPredictor = model;
      this.performance.record('spendingPredictor', metrics);

      logger?.info?.(`Spending Predictor trained in ${Date.now() - startTime}ms`);
      return { success: true, metrics, duration: Date.now() - startTime };
    } catch (err) {
      logger?.error?.('Spending Predictor training failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  async trainAnomalyDetector(transactions) {
    const startTime = Date.now();
    logger?.info?.('Training: Anomaly Detector...');

    try {
      const model = new AnomalyDetectorNN({
        encodingDim: 8,
        learningRate: 0.001,
        epochs: 50,
      });

      const trainResult = model.train(transactions);

      const metrics = {
        reconstructionError: trainResult?.avgReconstructionError || 0,
        dataPoints: transactions.length,
      };

      this.modelRegistry.registerModel('anomalyDetector', {
        metrics,
        dataSize: transactions.length,
        trainingDuration: Date.now() - startTime,
      });

      this.models.anomalyDetector = model;
      this.performance.record('anomalyDetector', metrics);

      logger?.info?.(`Anomaly Detector trained in ${Date.now() - startTime}ms`);
      return { success: true, metrics, duration: Date.now() - startTime };
    } catch (err) {
      logger?.error?.('Anomaly Detector training failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  async trainCategoryClassifier(transactions) {
    const startTime = Date.now();
    logger?.info?.('Training: Category Classifier...');

    try {
      const model = new CategoryClassifierNN({
        hiddenSize: 64,
        learningRate: 0.01,
        epochs: 100,
      });

      // Need labeled data
      const labeled = transactions.filter(t => t.category && t.description);
      if (labeled.length < 50) {
        logger?.warn?.('Insufficient labeled data for category classifier');
        return { success: false, reason: 'insufficient_labeled_data' };
      }

      const trainResult = model.train(labeled);

      const metrics = {
        accuracy: trainResult?.accuracy || 0,
        categories: trainResult?.categories || 0,
        dataPoints: labeled.length,
      };

      this.modelRegistry.registerModel('categoryClassifier', {
        metrics,
        dataSize: labeled.length,
        trainingDuration: Date.now() - startTime,
      });

      this.models.categoryClassifier = model;
      this.performance.record('categoryClassifier', metrics);

      logger?.info?.(`Category Classifier trained in ${Date.now() - startTime}ms`);
      return { success: true, metrics, duration: Date.now() - startTime };
    } catch (err) {
      logger?.error?.('Category Classifier training failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  async trainRiskClassifier(userData) {
    const startTime = Date.now();
    logger?.info?.('Training: Risk Classifier...');

    try {
      const model = new FinancialRiskClassifier();
      model.train(userData);

      const metrics = {
        accuracy: model.model?.oobScore || 0,
        features: 14,
        dataPoints: userData.length || 0,
      };

      this.modelRegistry.registerModel('riskClassifier', {
        metrics,
        dataSize: userData.length || 0,
        trainingDuration: Date.now() - startTime,
      });

      this.models.riskClassifier = model;
      this.performance.record('riskClassifier', metrics);

      logger?.info?.(`Risk Classifier trained in ${Date.now() - startTime}ms`);
      return { success: true, metrics, duration: Date.now() - startTime };
    } catch (err) {
      logger?.error?.('Risk Classifier training failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  async trainCustomerSegmentation(users) {
    const startTime = Date.now();
    logger?.info?.('Training: Customer Segmentation...');

    try {
      const model = new CustomerSegmentation();
      const result = model.segment(users);

      const metrics = {
        segments: result?.segments?.length || 0,
        users: users.length,
        silhouetteScore: result?.metrics?.silhouetteScore || 0,
      };

      this.modelRegistry.registerModel('customerSegmentation', {
        metrics,
        dataSize: users.length,
        trainingDuration: Date.now() - startTime,
      });

      this.models.customerSegmentation = model;
      this.performance.record('customerSegmentation', metrics);

      logger?.info?.(`Customer Segmentation trained in ${Date.now() - startTime}ms`);
      return { success: true, metrics, result, duration: Date.now() - startTime };
    } catch (err) {
      logger?.error?.('Customer Segmentation training failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  async trainSpendingPatterns(transactions) {
    const startTime = Date.now();
    logger?.info?.('Training: Spending Pattern Discovery...');

    try {
      const model = new SpendingPatternDiscovery();
      const result = model.discover(transactions);

      const metrics = {
        patterns: result?.patterns?.length || 0,
        dataPoints: transactions.length,
      };

      this.modelRegistry.registerModel('spendingPatterns', {
        metrics,
        dataSize: transactions.length,
        trainingDuration: Date.now() - startTime,
      });

      this.models.spendingPatterns = model;
      this.performance.record('spendingPatterns', metrics);

      logger?.info?.(`Spending Patterns trained in ${Date.now() - startTime}ms`);
      return { success: true, metrics, result, duration: Date.now() - startTime };
    } catch (err) {
      logger?.error?.('Spending Patterns training failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FULL TRAINING PIPELINE
  // ──────────────────────────────────────────────────────────────────────────

  async trainAll(data) {
    if (this.isTraining) {
      return { success: false, message: 'Training already in progress' };
    }

    this.isTraining = true;
    const startTime = Date.now();
    const results = {};

    try {
      logger?.info?.('=== Starting Full AI Training Pipeline ===');

      const { transactions = [], users = [], userData = [] } = data;

      // 1. Spending Predictor
      if (transactions.length >= 30) {
        results.spendingPredictor = await this.trainSpendingPredictor(transactions);
      }

      // 2. Anomaly Detector
      if (transactions.length >= 20) {
        results.anomalyDetector = await this.trainAnomalyDetector(transactions);
      }

      // 3. Category Classifier
      const labeled = transactions.filter(t => t.category && t.description);
      if (labeled.length >= 50) {
        results.categoryClassifier = await this.trainCategoryClassifier(transactions);
      }

      // 4. Risk Classifier
      if (userData.length > 0 || users.length > 0) {
        results.riskClassifier = await this.trainRiskClassifier(userData.length > 0 ? userData : users);
      }

      // 5. Customer Segmentation
      if (users.length >= 10) {
        results.customerSegmentation = await this.trainCustomerSegmentation(users);
      }

      // 6. Spending Patterns
      if (transactions.length >= 30) {
        results.spendingPatterns = await this.trainSpendingPatterns(transactions);
      }

      this.lastFullTraining = Date.now();

      const totalDuration = Date.now() - startTime;
      const successCount = Object.values(results).filter(r => r.success).length;

      logger?.info?.(`=== Training Pipeline Complete: ${successCount}/${Object.keys(results).length} models trained in ${totalDuration}ms ===`);

      return {
        success: true,
        results,
        duration: totalDuration,
        modelsTotal: Object.keys(results).length,
        modelsSuccess: successCount,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      logger?.error?.('Full training pipeline failed:', err.message);
      return { success: false, error: err.message, results };
    } finally {
      this.isTraining = false;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PREDICTION & INFERENCE METHODS
  // ──────────────────────────────────────────────────────────────────────────

  predictSpending(transactions, months = 3) {
    return this.models.forecaster.comprehensiveForecast(transactions, months);
  }

  detectAnomalies(transactions) {
    if (this.models.anomalyDetector) {
      return this.models.anomalyDetector.detect(transactions);
    }
    // Fallback: statistical method
    const amounts = transactions.map(t => Math.abs(t.amount || 0));
    const m = amounts.reduce((s, v) => s + v, 0) / amounts.length;
    const s = Math.sqrt(amounts.reduce((ss, v) => ss + (v - m) ** 2, 0) / amounts.length);

    return transactions.map(t => {
      const z = Math.abs((Math.abs(t.amount || 0) - m) / (s || 1));
      return {
        ...t,
        isAnomaly: z > 2.5,
        anomalyScore: z,
        severity: z > 4 ? 'high' : z > 3 ? 'medium' : z > 2.5 ? 'low' : 'normal',
      };
    }).filter(t => t.isAnomaly);
  }

  classifyCategory(description) {
    if (this.models.categoryClassifier) {
      return this.models.categoryClassifier.predict(description);
    }
    // Fallback: keyword-based
    return this.models.ner._classifyTransactionType(description);
  }

  assessRisk(userData) {
    if (this.models.riskClassifier) {
      return this.models.riskClassifier.predict(userData);
    }
    return { risk: 'unknown', confidence: 0 };
  }

  analyzeSentiment(text) {
    return this.models.sentimentAnalyzer.analyze(text);
  }

  understandQuery(query) {
    return this.models.queryEngine.understand(query);
  }

  extractEntities(text) {
    return this.models.ner.extract(text);
  }

  detectRecurring(transactions) {
    return this.models.recurringDetector.detect(transactions);
  }

  detectChangepoints(data) {
    return this.models.changepointDetector.detectSpendingChanges(data);
  }

  generateSummary(financialData) {
    return this.models.summarizer.summarizeFinancialData(financialData);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AUTO-TRAINING SCHEDULER
  // ──────────────────────────────────────────────────────────────────────────

  startAutoTraining(getDataFn, intervalMs = 3600000) {
    this.scheduler.schedule('full_training', async () => {
      const data = await getDataFn();
      return await this.trainAll(data);
    }, intervalMs);

    logger?.info?.(`Auto-training scheduled every ${intervalMs / 60000} minutes`);
  }

  stopAutoTraining() {
    this.scheduler.cancelAll();
    logger?.info?.('Auto-training stopped');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STATUS & REPORTING
  // ──────────────────────────────────────────────────────────────────────────

  getStatus() {
    return {
      isTraining: this.isTraining,
      lastFullTraining: this.lastFullTraining ? new Date(this.lastFullTraining).toISOString() : null,
      models: this.modelRegistry.getAllModels(),
      performance: this.performance.getSummary(),
      scheduler: this.scheduler.getStatus(),
      availableModels: {
        spendingPredictor: !!this.models.spendingPredictor,
        anomalyDetector: !!this.models.anomalyDetector,
        categoryClassifier: !!this.models.categoryClassifier,
        riskClassifier: !!this.models.riskClassifier,
        customerSegmentation: !!this.models.customerSegmentation,
        spendingPatterns: !!this.models.spendingPatterns,
        sentimentAnalyzer: true,
        forecaster: true,
        ner: true,
        queryEngine: true,
        changepointDetector: true,
        recurringDetector: true,
      },
    };
  }

  getDashboardData() {
    const allModels = this.modelRegistry.getAllModels();
    const performanceSummary = this.performance.getSummary();

    return {
      totalModels: allModels.length,
      trainedModels: allModels.filter(m => m.currentVersion).length,
      totalTrainingRuns: this.performance.getSummary().reduce((s, m) => s + m.totalRecords, 0),
      avgAccuracy: (() => {
        const accuracies = performanceSummary
          .map(m => m.latest?.accuracy)
          .filter(a => a != null);
        return accuracies.length > 0 ? accuracies.reduce((s, v) => s + v, 0) / accuracies.length : 0;
      })(),
      modelsNeedingRetrain: performanceSummary.filter(m => m.needsRetrain).length,
      lastTraining: this.lastFullTraining ? new Date(this.lastFullTraining).toISOString() : null,
      modelDetails: allModels,
      performanceHistory: performanceSummary,
    };
  }
}

// ============================================================================
// §6  EXPORTS
// ============================================================================

module.exports = {
  AITrainingPipeline,
  ModelRegistry,
  DataPreprocessor,
  TrainingScheduler,
  PerformanceTracker,
  CrossValidator,
};
