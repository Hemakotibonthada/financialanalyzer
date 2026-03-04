/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  AI Model Manager — Enterprise-Grade Model Versioning, Registry & Lifecycle
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *  Features:
 *   • Model versioning with semantic version tracking
 *   • A/B testing support with traffic splitting
 *   • Model performance monitoring & drift detection
 *   • Auto-rollback on degradation
 *   • Cross-validation with k-fold splits
 *   • Feature importance tracking
 *   • Model comparison dashboards
 *   • Persistent model storage with compression
 *
 *  Zero external ML dependencies — everything runs locally.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const crypto = require('crypto');
const zlib = require('zlib');

// ────────────────────────────────────────────────────────────────────────────
// § 1 — CONSTANTS & UTILITIES
// ────────────────────────────────────────────────────────────────────────────

const MODEL_DIR = path.join(__dirname, '..', '..', 'data', 'models');
const METRICS_DIR = path.join(__dirname, '..', '..', 'data', 'metrics');
const MAX_VERSIONS = 10;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

function timestamp() {
  return new Date().toISOString();
}

function mean(arr) {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

function stdDev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// ────────────────────────────────────────────────────────────────────────────
// § 2 — MODEL VERSION
// ────────────────────────────────────────────────────────────────────────────

class ModelVersion {
  constructor(modelName, version, metadata = {}) {
    this.id = generateId();
    this.modelName = modelName;
    this.version = version; // semver string like '1.0.0'
    this.createdAt = timestamp();
    this.status = 'draft'; // draft | staging | production | archived | rolled-back
    this.metadata = {
      algorithm: metadata.algorithm || 'unknown',
      hyperparameters: metadata.hyperparameters || {},
      trainingDataSize: metadata.trainingDataSize || 0,
      trainingDuration: metadata.trainingDuration || 0,
      features: metadata.features || [],
      description: metadata.description || '',
      ...metadata,
    };
    this.metrics = {
      accuracy: null,
      precision: null,
      recall: null,
      f1: null,
      mae: null,
      mse: null,
      rmse: null,
      r2: null,
      custom: {},
    };
    this.validationMetrics = null;
    this.weights = null;
    this.featureImportance = {};
    this.predictionLog = [];
    this.driftMetrics = [];
  }

  setMetrics(metrics) {
    Object.assign(this.metrics, metrics);
    this.metadata.lastEvaluated = timestamp();
  }

  setWeights(weights) {
    this.weights = weights;
  }

  promote(status) {
    const valid = ['draft', 'staging', 'production', 'archived', 'rolled-back'];
    if (!valid.includes(status)) throw new Error(`Invalid status: ${status}`);
    this.status = status;
    this.metadata[`${status}At`] = timestamp();
  }

  logPrediction(input, prediction, actual = null) {
    this.predictionLog.push({
      timestamp: Date.now(),
      inputHash: crypto.createHash('md5').update(JSON.stringify(input)).digest('hex').slice(0, 8),
      prediction,
      actual,
    });
    // Keep only last 1000 predictions
    if (this.predictionLog.length > 1000) {
      this.predictionLog = this.predictionLog.slice(-1000);
    }
  }

  getPerformanceSummary() {
    const withActual = this.predictionLog.filter(p => p.actual !== null);
    if (withActual.length === 0) return { predictions: this.predictionLog.length, evaluated: 0 };

    const errors = withActual.map(p => Math.abs(p.prediction - p.actual));
    return {
      predictions: this.predictionLog.length,
      evaluated: withActual.length,
      mae: mean(errors),
      maxError: Math.max(...errors),
      minError: Math.min(...errors),
      medianError: percentile(errors, 50),
      p95Error: percentile(errors, 95),
    };
  }

  serialize() {
    return {
      id: this.id,
      modelName: this.modelName,
      version: this.version,
      createdAt: this.createdAt,
      status: this.status,
      metadata: this.metadata,
      metrics: this.metrics,
      validationMetrics: this.validationMetrics,
      featureImportance: this.featureImportance,
      predictionLog: this.predictionLog.slice(-100), // save last 100
      driftMetrics: this.driftMetrics.slice(-50),
    };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// § 3 — CROSS VALIDATOR
// ────────────────────────────────────────────────────────────────────────────

class CrossValidator {
  /**
   * K-Fold cross-validation
   * @param {Array} data - Array of { features, target }
   * @param {Function} trainFn - (trainData) => model
   * @param {Function} predictFn - (model, features) => prediction
   * @param {number} k - Number of folds (default 5)
   * @returns {{ foldMetrics, avgMetrics, stdMetrics }}
   */
  static kFold(data, trainFn, predictFn, k = 5) {
    if (data.length < k) k = data.length;
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    const foldSize = Math.ceil(shuffled.length / k);
    const foldMetrics = [];

    for (let i = 0; i < k; i++) {
      const testStart = i * foldSize;
      const testEnd = Math.min(testStart + foldSize, shuffled.length);
      const testSet = shuffled.slice(testStart, testEnd);
      const trainSet = [...shuffled.slice(0, testStart), ...shuffled.slice(testEnd)];

      const model = trainFn(trainSet);
      const predictions = testSet.map(d => ({
        predicted: predictFn(model, d.features),
        actual: d.target,
      }));

      const errors = predictions.map(p => Math.abs(p.predicted - p.actual));
      const squaredErrors = predictions.map(p => (p.predicted - p.actual) ** 2);
      const mse = mean(squaredErrors);
      const actualValues = predictions.map(p => p.actual);
      const ssTot = actualValues.reduce((s, v) => s + (v - mean(actualValues)) ** 2, 0);
      const ssRes = squaredErrors.reduce((s, v) => s + v, 0);

      foldMetrics.push({
        fold: i + 1,
        samples: testSet.length,
        mae: mean(errors),
        mse,
        rmse: Math.sqrt(mse),
        r2: ssTot > 0 ? 1 - ssRes / ssTot : 0,
        maxError: Math.max(...errors),
      });
    }

    const metricKeys = ['mae', 'mse', 'rmse', 'r2'];
    const avgMetrics = {};
    const stdMetrics = {};
    for (const key of metricKeys) {
      const vals = foldMetrics.map(f => f[key]);
      avgMetrics[key] = mean(vals);
      stdMetrics[key] = stdDev(vals);
    }

    return { foldMetrics, avgMetrics, stdMetrics, k, totalSamples: data.length };
  }

  /**
   * Stratified K-Fold for classification
   */
  static stratifiedKFold(data, trainFn, predictFn, k = 5) {
    // Group by target class
    const groups = {};
    for (const d of data) {
      const cls = String(d.target);
      if (!groups[cls]) groups[cls] = [];
      groups[cls].push(d);
    }

    // Shuffle each group
    for (const cls in groups) {
      groups[cls].sort(() => Math.random() - 0.5);
    }

    // Distribute into folds
    const folds = Array.from({ length: k }, () => []);
    for (const cls in groups) {
      groups[cls].forEach((d, i) => {
        folds[i % k].push(d);
      });
    }

    const foldMetrics = [];
    for (let i = 0; i < k; i++) {
      const testSet = folds[i];
      const trainSet = folds.filter((_, j) => j !== i).flat();

      const model = trainFn(trainSet);
      const predictions = testSet.map(d => ({
        predicted: predictFn(model, d.features),
        actual: d.target,
      }));

      // Classification metrics
      const correct = predictions.filter(p => String(p.predicted) === String(p.actual)).length;
      const accuracy = testSet.length > 0 ? correct / testSet.length : 0;

      // Per-class precision/recall
      const classes = [...new Set(predictions.map(p => String(p.actual)))];
      const classMetrics = {};
      for (const cls of classes) {
        const tp = predictions.filter(p => String(p.predicted) === cls && String(p.actual) === cls).length;
        const fp = predictions.filter(p => String(p.predicted) === cls && String(p.actual) !== cls).length;
        const fn = predictions.filter(p => String(p.predicted) !== cls && String(p.actual) === cls).length;
        const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
        const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
        const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
        classMetrics[cls] = { precision, recall, f1, support: tp + fn };
      }

      foldMetrics.push({ fold: i + 1, accuracy, classMetrics, samples: testSet.length });
    }

    const avgAccuracy = mean(foldMetrics.map(f => f.accuracy));
    const stdAccuracy = stdDev(foldMetrics.map(f => f.accuracy));

    return { foldMetrics, avgAccuracy, stdAccuracy, k, totalSamples: data.length };
  }

  /**
   * Time-series cross-validation (expanding window)
   */
  static timeSeriesCV(data, trainFn, predictFn, minTrainSize = null) {
    const n = data.length;
    const minTrain = minTrainSize || Math.max(10, Math.floor(n * 0.3));
    const foldMetrics = [];

    for (let i = minTrain; i < n; i++) {
      const trainSet = data.slice(0, i);
      const testPoint = data[i];

      const model = trainFn(trainSet);
      const predicted = predictFn(model, testPoint.features);
      const error = Math.abs(predicted - testPoint.target);

      foldMetrics.push({
        step: i - minTrain + 1,
        trainSize: i,
        predicted,
        actual: testPoint.target,
        error,
        squaredError: error ** 2,
      });
    }

    const errors = foldMetrics.map(f => f.error);
    const squaredErrors = foldMetrics.map(f => f.squaredError);

    return {
      foldMetrics,
      avgMAE: mean(errors),
      avgMSE: mean(squaredErrors),
      avgRMSE: Math.sqrt(mean(squaredErrors)),
      totalSteps: foldMetrics.length,
      minTrainSize: minTrain,
    };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// § 4 — FEATURE IMPORTANCE ANALYZER
// ────────────────────────────────────────────────────────────────────────────

class FeatureImportanceAnalyzer {
  /**
   * Permutation-based feature importance
   * @param {Array} data - Array of { features, target }
   * @param {Function} predictFn - (features) => prediction
   * @param {Array} featureNames - Feature name strings
   * @param {number} nRepeats - Number of permutation repeats
   */
  static permutationImportance(data, predictFn, featureNames, nRepeats = 5) {
    // Calculate baseline error
    const baselineErrors = data.map(d => (predictFn(d.features) - d.target) ** 2);
    const baselineMSE = mean(baselineErrors);

    const importance = {};

    for (let f = 0; f < featureNames.length; f++) {
      const importanceScores = [];

      for (let r = 0; r < nRepeats; r++) {
        // Create permuted dataset
        const permutedData = data.map(d => ({
          ...d,
          features: [...d.features],
        }));

        // Shuffle feature f
        const featureValues = permutedData.map(d => d.features[f]);
        for (let i = featureValues.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [featureValues[i], featureValues[j]] = [featureValues[j], featureValues[i]];
        }
        permutedData.forEach((d, i) => { d.features[f] = featureValues[i]; });

        // Calculate permuted error
        const permutedErrors = permutedData.map(d => (predictFn(d.features) - d.target) ** 2);
        const permutedMSE = mean(permutedErrors);

        importanceScores.push(permutedMSE - baselineMSE);
      }

      importance[featureNames[f]] = {
        meanImportance: mean(importanceScores),
        stdImportance: stdDev(importanceScores),
        relativeImportance: baselineMSE > 0 ? mean(importanceScores) / baselineMSE : 0,
      };
    }

    // Normalize to percentages
    const totalImportance = Object.values(importance).reduce((s, v) => s + Math.max(0, v.meanImportance), 0);
    for (const feat in importance) {
      importance[feat].normalizedImportance = totalImportance > 0
        ? Math.max(0, importance[feat].meanImportance) / totalImportance
        : 1 / featureNames.length;
    }

    // Sort by importance
    const ranked = Object.entries(importance)
      .sort(([, a], [, b]) => b.meanImportance - a.meanImportance)
      .map(([name, metrics], rank) => ({
        feature: name,
        rank: rank + 1,
        ...metrics,
      }));

    return { features: ranked, baselineMSE, totalImportance };
  }

  /**
   * Correlation-based feature importance (Pearson)
   */
  static correlationImportance(data, featureNames) {
    const targets = data.map(d => d.target);
    const targetMean = mean(targets);
    const targetStd = stdDev(targets);

    const correlations = featureNames.map((name, idx) => {
      const featureValues = data.map(d => d.features[idx]);
      const featureMean = mean(featureValues);
      const featureStd = stdDev(featureValues);

      if (featureStd === 0 || targetStd === 0) return { feature: name, correlation: 0, absCorrelation: 0 };

      let covariance = 0;
      for (let i = 0; i < data.length; i++) {
        covariance += (featureValues[i] - featureMean) * (targets[i] - targetMean);
      }
      covariance /= data.length;

      const correlation = covariance / (featureStd * targetStd);
      return { feature: name, correlation, absCorrelation: Math.abs(correlation) };
    });

    return correlations.sort((a, b) => b.absCorrelation - a.absCorrelation);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// § 5 — MODEL DRIFT DETECTOR
// ────────────────────────────────────────────────────────────────────────────

class DriftDetector {
  constructor(windowSize = 100) {
    this.windowSize = windowSize;
    this.referenceDistribution = null;
    this.recentPredictions = [];
    this.driftHistory = [];
  }

  /**
   * Set reference distribution from training data
   */
  setReference(predictions) {
    this.referenceDistribution = {
      mean: mean(predictions),
      std: stdDev(predictions),
      min: Math.min(...predictions),
      max: Math.max(...predictions),
      p25: percentile(predictions, 25),
      p50: percentile(predictions, 50),
      p75: percentile(predictions, 75),
      count: predictions.length,
    };
  }

  /**
   * Check for drift in recent predictions
   */
  checkDrift(newPrediction) {
    this.recentPredictions.push(newPrediction);
    if (this.recentPredictions.length > this.windowSize) {
      this.recentPredictions.shift();
    }

    if (!this.referenceDistribution || this.recentPredictions.length < 20) {
      return { isDrifting: false, confidence: 0, reason: 'insufficient_data' };
    }

    const recentMean = mean(this.recentPredictions);
    const recentStd = stdDev(this.recentPredictions);
    const ref = this.referenceDistribution;

    // Page-Hinkley test approximation
    const meanShift = Math.abs(recentMean - ref.mean) / (ref.std || 1);
    const varianceChange = ref.std > 0 ? Math.abs(recentStd - ref.std) / ref.std : 0;
    const distributionShift = this._kolmogorovSmirnovApprox(this.recentPredictions, ref);

    const driftScore = (meanShift * 0.4 + varianceChange * 0.3 + distributionShift * 0.3);
    const isDrifting = driftScore > 1.5;
    const severity = driftScore > 3 ? 'critical' : driftScore > 2 ? 'high' : driftScore > 1.5 ? 'medium' : 'low';

    const result = {
      isDrifting,
      severity,
      driftScore: Math.round(driftScore * 100) / 100,
      confidence: Math.min(100, Math.round(this.recentPredictions.length / this.windowSize * 100)),
      details: {
        meanShift: Math.round(meanShift * 100) / 100,
        varianceChange: Math.round(varianceChange * 100) / 100,
        distributionShift: Math.round(distributionShift * 100) / 100,
      },
      reference: { mean: ref.mean, std: ref.std },
      recent: { mean: recentMean, std: recentStd, count: this.recentPredictions.length },
      timestamp: timestamp(),
    };

    if (isDrifting) {
      this.driftHistory.push(result);
      if (this.driftHistory.length > 100) this.driftHistory.shift();
    }

    return result;
  }

  /**
   * Simplified Kolmogorov-Smirnov test
   */
  _kolmogorovSmirnovApprox(sample, ref) {
    if (sample.length < 5) return 0;

    // Compare empirical CDFs
    const sorted = [...sample].sort((a, b) => a - b);
    const n = sorted.length;
    let maxDiff = 0;

    for (let i = 0; i < n; i++) {
      const empiricalCDF = (i + 1) / n;
      // Reference CDF (normal approximation)
      const z = ref.std > 0 ? (sorted[i] - ref.mean) / ref.std : 0;
      const refCDF = 0.5 * (1 + this._erf(z / Math.SQRT2));
      maxDiff = Math.max(maxDiff, Math.abs(empiricalCDF - refCDF));
    }

    // Scale to 0-5 range for drift scoring
    return maxDiff * 5;
  }

  _erf(x) {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
    const p = 0.3275911;
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  }

  getDriftSummary() {
    return {
      totalDriftEvents: this.driftHistory.length,
      recentEvents: this.driftHistory.slice(-10),
      currentWindowSize: this.recentPredictions.length,
      isMonitoring: this.referenceDistribution !== null,
    };
  }

  serialize() {
    return {
      windowSize: this.windowSize,
      referenceDistribution: this.referenceDistribution,
      recentPredictions: this.recentPredictions,
      driftHistory: this.driftHistory.slice(-50),
    };
  }

  static deserialize(data) {
    const detector = new DriftDetector(data.windowSize || 100);
    detector.referenceDistribution = data.referenceDistribution;
    detector.recentPredictions = data.recentPredictions || [];
    detector.driftHistory = data.driftHistory || [];
    return detector;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// § 6 — A/B TEST MANAGER
// ────────────────────────────────────────────────────────────────────────────

class ABTestManager {
  constructor() {
    this.tests = new Map();
  }

  createTest(testName, modelA, modelB, trafficSplit = 0.5) {
    const test = {
      name: testName,
      modelA: { name: modelA, predictions: [], errors: [] },
      modelB: { name: modelB, predictions: [], errors: [] },
      trafficSplit, // fraction going to model B
      createdAt: timestamp(),
      status: 'running',
      totalPredictions: 0,
    };
    this.tests.set(testName, test);
    return test;
  }

  routeRequest(testName) {
    const test = this.tests.get(testName);
    if (!test || test.status !== 'running') return 'A';
    return Math.random() < test.trafficSplit ? 'B' : 'A';
  }

  recordResult(testName, variant, prediction, actual) {
    const test = this.tests.get(testName);
    if (!test) return;

    const model = variant === 'B' ? test.modelB : test.modelA;
    model.predictions.push(prediction);
    if (actual !== undefined && actual !== null) {
      model.errors.push(Math.abs(prediction - actual));
    }
    test.totalPredictions++;
  }

  getTestResults(testName) {
    const test = this.tests.get(testName);
    if (!test) return null;

    const calcStats = (model) => ({
      name: model.name,
      predictions: model.predictions.length,
      evaluated: model.errors.length,
      mae: model.errors.length > 0 ? mean(model.errors) : null,
      medianError: model.errors.length > 0 ? percentile(model.errors, 50) : null,
      p95Error: model.errors.length > 0 ? percentile(model.errors, 95) : null,
    });

    const statsA = calcStats(test.modelA);
    const statsB = calcStats(test.modelB);

    // Statistical significance (simplified t-test)
    let isSignificant = false;
    let pValue = 1;
    if (test.modelA.errors.length >= 30 && test.modelB.errors.length >= 30) {
      const mA = mean(test.modelA.errors);
      const mB = mean(test.modelB.errors);
      const sA = stdDev(test.modelA.errors);
      const sB = stdDev(test.modelB.errors);
      const nA = test.modelA.errors.length;
      const nB = test.modelB.errors.length;
      const se = Math.sqrt(sA ** 2 / nA + sB ** 2 / nB);
      const tStat = se > 0 ? Math.abs(mA - mB) / se : 0;
      // Approximate p-value using normal approximation
      const z = tStat;
      pValue = 2 * (1 - 0.5 * (1 + this._erf(z / Math.SQRT2)));
      isSignificant = pValue < 0.05;
    }

    return {
      ...test,
      modelA: statsA,
      modelB: statsB,
      winner: isSignificant
        ? (statsA.mae < statsB.mae ? 'A' : 'B')
        : 'inconclusive',
      isSignificant,
      pValue: Math.round(pValue * 10000) / 10000,
    };
  }

  _erf(x) {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
    const p = 0.3275911;
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  }

  endTest(testName) {
    const test = this.tests.get(testName);
    if (test) test.status = 'completed';
    return this.getTestResults(testName);
  }

  listTests() {
    return [...this.tests.values()].map(t => ({
      name: t.name,
      status: t.status,
      totalPredictions: t.totalPredictions,
      createdAt: t.createdAt,
    }));
  }
}

// ────────────────────────────────────────────────────────────────────────────
// § 7 — MODEL REGISTRY (Orchestrator)
// ────────────────────────────────────────────────────────────────────────────

class ModelRegistry extends EventEmitter {
  constructor() {
    super();
    this.models = new Map();       // modelName -> [ModelVersion]
    this.activeModels = new Map(); // modelName -> ModelVersion (production)
    this.driftDetectors = new Map();
    this.abTestManager = new ABTestManager();
    this.performanceHistory = new Map(); // modelName -> [{ timestamp, metrics }]
    this._loaded = false;
  }

  /**
   * Register a new model version
   */
  registerModel(modelName, version, weights, metadata = {}) {
    const modelVersion = new ModelVersion(modelName, version, metadata);
    modelVersion.setWeights(weights);

    if (!this.models.has(modelName)) {
      this.models.set(modelName, []);
      this.driftDetectors.set(modelName, new DriftDetector());
      this.performanceHistory.set(modelName, []);
    }

    const versions = this.models.get(modelName);
    versions.push(modelVersion);

    // Prune old versions
    while (versions.length > MAX_VERSIONS) {
      const removed = versions.shift();
      this.emit('model:pruned', { modelName, version: removed.version });
    }

    this.emit('model:registered', { modelName, version, id: modelVersion.id });
    return modelVersion;
  }

  /**
   * Promote a model version to production
   */
  promoteToProduction(modelName, version) {
    const versions = this.models.get(modelName);
    if (!versions) throw new Error(`Model ${modelName} not found`);

    const modelVersion = versions.find(v => v.version === version);
    if (!modelVersion) throw new Error(`Version ${version} not found for ${modelName}`);

    // Demote current production model
    const current = this.activeModels.get(modelName);
    if (current) {
      current.promote('archived');
    }

    modelVersion.promote('production');
    this.activeModels.set(modelName, modelVersion);

    // Reset drift detector with new model's baseline
    if (modelVersion.predictionLog.length > 0) {
      const predictions = modelVersion.predictionLog.map(p => p.prediction);
      this.driftDetectors.get(modelName)?.setReference(predictions);
    }

    this.emit('model:promoted', { modelName, version });
    return modelVersion;
  }

  /**
   * Get the active production model
   */
  getActiveModel(modelName) {
    return this.activeModels.get(modelName) || null;
  }

  /**
   * Get all versions of a model
   */
  getModelVersions(modelName) {
    return (this.models.get(modelName) || []).map(v => v.serialize());
  }

  /**
   * Record a prediction and check for drift
   */
  recordPrediction(modelName, input, prediction, actual = null) {
    const model = this.activeModels.get(modelName);
    if (model) {
      model.logPrediction(input, prediction, actual);

      // Check drift
      const detector = this.driftDetectors.get(modelName);
      if (detector) {
        const driftResult = detector.checkDrift(prediction);
        if (driftResult.isDrifting) {
          this.emit('model:drift', { modelName, ...driftResult });

          // Auto-rollback on critical drift
          if (driftResult.severity === 'critical') {
            this._autoRollback(modelName);
          }
        }
      }
    }

    // Track performance
    if (actual !== null) {
      const history = this.performanceHistory.get(modelName) || [];
      history.push({
        timestamp: Date.now(),
        error: Math.abs(prediction - actual),
        prediction,
        actual,
      });
      // Keep last 5000
      if (history.length > 5000) history.splice(0, history.length - 5000);
      this.performanceHistory.set(modelName, history);
    }
  }

  /**
   * Auto-rollback to previous stable version
   */
  _autoRollback(modelName) {
    const versions = this.models.get(modelName);
    if (!versions || versions.length < 2) return;

    const current = this.activeModels.get(modelName);
    const previousVersions = versions.filter(v =>
      v.id !== current?.id && v.status !== 'rolled-back'
    );

    if (previousVersions.length > 0) {
      const rollbackTo = previousVersions[previousVersions.length - 1];
      current?.promote('rolled-back');
      rollbackTo.promote('production');
      this.activeModels.set(modelName, rollbackTo);
      this.emit('model:rollback', {
        modelName,
        from: current?.version,
        to: rollbackTo.version,
        reason: 'critical_drift',
      });
    }
  }

  /**
   * Compare two model versions
   */
  compareModels(modelName, versionA, versionB) {
    const versions = this.models.get(modelName);
    if (!versions) return null;

    const mA = versions.find(v => v.version === versionA);
    const mB = versions.find(v => v.version === versionB);
    if (!mA || !mB) return null;

    return {
      modelName,
      versionA: { version: versionA, metrics: mA.metrics, performance: mA.getPerformanceSummary() },
      versionB: { version: versionB, metrics: mB.metrics, performance: mB.getPerformanceSummary() },
      recommendation: this._compareMetrics(mA.metrics, mB.metrics),
    };
  }

  _compareMetrics(metricsA, metricsB) {
    const checks = [];
    if (metricsA.mae !== null && metricsB.mae !== null) {
      checks.push(metricsA.mae <= metricsB.mae ? 'A' : 'B');
    }
    if (metricsA.r2 !== null && metricsB.r2 !== null) {
      checks.push(metricsA.r2 >= metricsB.r2 ? 'A' : 'B');
    }
    if (metricsA.accuracy !== null && metricsB.accuracy !== null) {
      checks.push(metricsA.accuracy >= metricsB.accuracy ? 'A' : 'B');
    }

    const aWins = checks.filter(c => c === 'A').length;
    const bWins = checks.filter(c => c === 'B').length;
    return aWins > bWins ? 'A' : bWins > aWins ? 'B' : 'tie';
  }

  /**
   * Get comprehensive dashboard data for all models
   */
  getDashboard() {
    const dashboard = {};

    for (const [modelName, versions] of this.models) {
      const active = this.activeModels.get(modelName);
      const history = this.performanceHistory.get(modelName) || [];
      const drift = this.driftDetectors.get(modelName)?.getDriftSummary() || {};

      // Recent performance (last 24h)
      const last24h = history.filter(h => Date.now() - h.timestamp < 86400000);
      const recentErrors = last24h.map(h => h.error);

      dashboard[modelName] = {
        totalVersions: versions.length,
        activeVersion: active?.version || null,
        activeStatus: active?.status || 'none',
        metrics: active?.metrics || {},
        performance: {
          total: history.length,
          last24h: last24h.length,
          recentMAE: recentErrors.length > 0 ? mean(recentErrors) : null,
          recentP95: recentErrors.length > 0 ? percentile(recentErrors, 95) : null,
          trend: this._performanceTrend(history),
        },
        drift,
        featureImportance: active?.featureImportance || {},
        versions: versions.map(v => ({
          version: v.version,
          status: v.status,
          createdAt: v.createdAt,
          algorithm: v.metadata.algorithm,
        })),
      };
    }

    return {
      models: dashboard,
      totalModels: this.models.size,
      activeTests: this.abTestManager.listTests().filter(t => t.status === 'running'),
      lastUpdated: timestamp(),
    };
  }

  _performanceTrend(history) {
    if (history.length < 10) return 'insufficient_data';
    const recent = history.slice(-50).map(h => h.error);
    const older = history.slice(-100, -50).map(h => h.error);
    if (older.length === 0) return 'insufficient_data';

    const recentMean = mean(recent);
    const olderMean = mean(older);
    const change = olderMean > 0 ? (recentMean - olderMean) / olderMean : 0;

    return change > 0.1 ? 'degrading' : change < -0.1 ? 'improving' : 'stable';
  }

  /**
   * Save entire registry to disk
   */
  async save() {
    ensureDir(MODEL_DIR);

    const state = {
      models: {},
      activeModels: {},
      driftDetectors: {},
      performanceHistory: {},
    };

    for (const [name, versions] of this.models) {
      state.models[name] = versions.map(v => ({
        ...v.serialize(),
        weights: v.weights,
      }));
    }

    for (const [name, model] of this.activeModels) {
      state.activeModels[name] = model.version;
    }

    for (const [name, detector] of this.driftDetectors) {
      state.driftDetectors[name] = detector.serialize();
    }

    for (const [name, history] of this.performanceHistory) {
      state.performanceHistory[name] = history.slice(-1000);
    }

    const json = JSON.stringify(state);
    const compressed = zlib.gzipSync(Buffer.from(json));
    fs.writeFileSync(path.join(MODEL_DIR, 'registry.gz'), compressed);
    this.emit('registry:saved', { size: compressed.length });
  }

  /**
   * Load registry from disk
   */
  async load() {
    const registryPath = path.join(MODEL_DIR, 'registry.gz');
    if (!fs.existsSync(registryPath)) {
      this._loaded = true;
      return;
    }

    try {
      const compressed = fs.readFileSync(registryPath);
      const json = zlib.gunzipSync(compressed).toString();
      const state = JSON.parse(json);

      // Restore models
      for (const [name, versions] of Object.entries(state.models || {})) {
        this.models.set(name, []);
        for (const vData of versions) {
          const mv = new ModelVersion(vData.modelName, vData.version, vData.metadata);
          Object.assign(mv, {
            id: vData.id,
            createdAt: vData.createdAt,
            status: vData.status,
            metrics: vData.metrics,
            validationMetrics: vData.validationMetrics,
            featureImportance: vData.featureImportance,
            predictionLog: vData.predictionLog || [],
            driftMetrics: vData.driftMetrics || [],
            weights: vData.weights,
          });
          this.models.get(name).push(mv);
        }
      }

      // Restore active models
      for (const [name, version] of Object.entries(state.activeModels || {})) {
        const versions = this.models.get(name);
        const active = versions?.find(v => v.version === version);
        if (active) this.activeModels.set(name, active);
      }

      // Restore drift detectors
      for (const [name, detectorData] of Object.entries(state.driftDetectors || {})) {
        this.driftDetectors.set(name, DriftDetector.deserialize(detectorData));
      }

      // Restore performance history
      for (const [name, history] of Object.entries(state.performanceHistory || {})) {
        this.performanceHistory.set(name, history);
      }

      this._loaded = true;
      this.emit('registry:loaded', { models: this.models.size });
    } catch (err) {
      console.error('Failed to load model registry:', err.message);
      this._loaded = true;
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// § 8 — SINGLETON & EXPORTS
// ────────────────────────────────────────────────────────────────────────────

const modelRegistry = new ModelRegistry();

module.exports = {
  ModelRegistry,
  modelRegistry,
  ModelVersion,
  CrossValidator,
  FeatureImportanceAnalyzer,
  DriftDetector,
  ABTestManager,
};
