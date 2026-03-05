// ============================================================================
// MODEL MONITORING & DRIFT DETECTION — Production ML Model Observability
// ============================================================================
// Tracks model performance, detects data drift, concept drift, and feature
// drift. Generates alerts and triggers retraining when needed.
// Runs entirely locally.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

const sum = (a) => a.reduce((s, v) => s + v, 0);
const mean = (a) => (a.length ? sum(a) / a.length : 0);
const stdDev = (a) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(mean(a.map(v => (v - m) ** 2)));
};

// ============================================================================
// §1  DATA DRIFT DETECTOR — Detect Changes in Input Data Distribution
// ============================================================================

class DataDriftDetector {
  constructor(config = {}) {
    this.windowSize = config.windowSize || 100;
    this.threshold = config.threshold || 0.05;
    this.referenceStats = null;
    this.currentWindow = [];
  }

  setReference(data) {
    this.referenceStats = this._computeStats(data);
    return this.referenceStats;
  }

  addObservation(dataPoint) {
    this.currentWindow.push(dataPoint);
    if (this.currentWindow.length > this.windowSize) {
      this.currentWindow.shift();
    }
  }

  checkDrift() {
    if (!this.referenceStats || this.currentWindow.length < 10) {
      return { driftDetected: false, score: 0, details: {} };
    }

    const currentStats = this._computeStats(this.currentWindow);
    const driftScores = {};
    let totalDrift = 0;
    let featureCount = 0;

    for (const feature of Object.keys(this.referenceStats)) {
      const refStat = this.referenceStats[feature];
      const curStat = currentStats[feature];

      if (!refStat || !curStat) continue;

      // Kolmogorov-Smirnov-like test (simplified)
      const meanDrift = refStat.std > 0
        ? Math.abs(curStat.mean - refStat.mean) / refStat.std
        : 0;

      // Variance ratio test
      const varianceRatio = refStat.std > 0 && curStat.std > 0
        ? Math.max(curStat.std / refStat.std, refStat.std / curStat.std)
        : 1;

      // Distribution overlap (simplified)
      const overlap = this._distributionOverlap(refStat, curStat);

      const featureDrift = meanDrift * 0.4 + (varianceRatio - 1) * 0.3 + (1 - overlap) * 0.3;

      driftScores[feature] = {
        score: featureDrift,
        meanShift: curStat.mean - refStat.mean,
        varianceRatio,
        overlap,
        drifted: featureDrift > this.threshold
      };

      totalDrift += featureDrift;
      featureCount++;
    }

    const avgDrift = featureCount > 0 ? totalDrift / featureCount : 0;
    const driftedFeatures = Object.entries(driftScores)
      .filter(([, v]) => v.drifted)
      .sort((a, b) => b[1].score - a[1].score);

    return {
      driftDetected: avgDrift > this.threshold || driftedFeatures.length > featureCount * 0.3,
      score: avgDrift,
      driftedFeatures: driftedFeatures.map(([name, data]) => ({ feature: name, ...data })),
      totalFeatures: featureCount,
      severity: avgDrift > 0.3 ? 'critical' : avgDrift > 0.15 ? 'high' : avgDrift > 0.05 ? 'medium' : 'low',
      recommendation: avgDrift > 0.15 ? 'Retrain model immediately' :
                       avgDrift > 0.05 ? 'Schedule model retraining' : 'No action needed',
      details: driftScores
    };
  }

  _computeStats(data) {
    if (!data || data.length === 0) return {};

    const stats = {};
    const numFeatures = Array.isArray(data[0]) ? data[0].length : Object.keys(data[0]).length;

    for (let f = 0; f < numFeatures; f++) {
      const values = data.map(d => Array.isArray(d) ? d[f] : Object.values(d)[f]).filter(v => v !== undefined);

      if (values.length === 0) continue;

      stats[`feature_${f}`] = {
        mean: mean(values),
        std: stdDev(values),
        min: Math.min(...values),
        max: Math.max(...values),
        median: this._median(values),
        q1: values.sort((a, b) => a - b)[Math.floor(values.length * 0.25)],
        q3: values.sort((a, b) => a - b)[Math.floor(values.length * 0.75)]
      };
    }

    return stats;
  }

  _distributionOverlap(refStat, curStat) {
    // Simplified Bhattacharyya coefficient
    if (refStat.std === 0 || curStat.std === 0) return refStat.mean === curStat.mean ? 1 : 0;

    const bc = 0.25 * Math.log(0.25 * (refStat.std / curStat.std + curStat.std / refStat.std + 2)) +
      0.25 * ((refStat.mean - curStat.mean) ** 2 / (refStat.std ** 2 + curStat.std ** 2));

    return Math.exp(-bc);
  }

  _median(arr) {
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }
}

// ============================================================================
// §2  CONCEPT DRIFT DETECTOR — Track Changes in Model Target Relationship
// ============================================================================

class ConceptDriftDetector {
  constructor(config = {}) {
    this.windowSize = config.windowSize || 50;
    this.threshold = config.threshold || 0.1;
    this.method = config.method || 'page_hinkley'; // page_hinkley, adwin, ddm
    this.errorWindow = [];
    this.minSamples = config.minSamples || 30;

    // Page-Hinkley test parameters
    this.phSum = 0;
    this.phMin = Infinity;
    this.phDelta = config.phDelta || 0.005;
    this.phThreshold = config.phThreshold || 50;

    // DDM parameters
    this.ddmMinErrors = 0;
    this.ddmMinStd = 0;
    this.ddmN = 0;
    this.ddmP = 0;
    this.ddmS = 0;
  }

  addPrediction(predicted, actual) {
    const error = typeof predicted === 'number'
      ? (predicted - actual) ** 2
      : (predicted === actual ? 0 : 1);

    this.errorWindow.push({
      error,
      timestamp: new Date()
    });

    if (this.errorWindow.length > this.windowSize * 2) {
      this.errorWindow.shift();
    }

    return this._checkDrift(error);
  }

  _checkDrift(error) {
    switch (this.method) {
      case 'page_hinkley': return this._pageHinkleyTest(error);
      case 'ddm': return this._ddmTest(error);
      case 'adwin': return this._adwinTest();
      default: return this._pageHinkleyTest(error);
    }
  }

  _pageHinkleyTest(error) {
    const errors = this.errorWindow.map(e => e.error);
    const avgError = mean(errors);

    this.phSum += error - avgError - this.phDelta;
    this.phMin = Math.min(this.phMin, this.phSum);

    const phTest = this.phSum - this.phMin;

    return {
      driftDetected: phTest > this.phThreshold && this.errorWindow.length >= this.minSamples,
      score: phTest / this.phThreshold,
      currentError: error,
      avgError,
      method: 'page_hinkley',
      windowSize: this.errorWindow.length,
      severity: phTest > this.phThreshold * 2 ? 'critical' :
                phTest > this.phThreshold ? 'warning' : 'normal'
    };
  }

  _ddmTest(error) {
    this.ddmN++;
    this.ddmP += (error - this.ddmP) / this.ddmN;
    this.ddmS = Math.sqrt(this.ddmP * (1 - this.ddmP) / this.ddmN);

    if (this.ddmN < this.minSamples) {
      this.ddmMinErrors = this.ddmP + 2 * this.ddmS;
      this.ddmMinStd = this.ddmS;
      return { driftDetected: false, score: 0, method: 'ddm' };
    }

    if (this.ddmP + this.ddmS < this.ddmMinErrors + this.ddmMinStd) {
      this.ddmMinErrors = this.ddmP;
      this.ddmMinStd = this.ddmS;
    }

    const warningLevel = this.ddmMinErrors + 2 * this.ddmMinStd;
    const driftLevel = this.ddmMinErrors + 3 * this.ddmMinStd;

    return {
      driftDetected: this.ddmP + this.ddmS > driftLevel,
      warning: this.ddmP + this.ddmS > warningLevel,
      score: (this.ddmP + this.ddmS) / Math.max(driftLevel, 0.001),
      currentError: this.ddmP,
      method: 'ddm',
      severity: this.ddmP + this.ddmS > driftLevel ? 'critical' :
                this.ddmP + this.ddmS > warningLevel ? 'warning' : 'normal'
    };
  }

  _adwinTest() {
    const errors = this.errorWindow.map(e => e.error);
    if (errors.length < this.minSamples) {
      return { driftDetected: false, score: 0, method: 'adwin' };
    }

    // Find the best split point
    let bestDrift = 0;
    let bestSplit = -1;

    for (let i = Math.floor(errors.length * 0.3); i < Math.floor(errors.length * 0.7); i++) {
      const left = errors.slice(0, i);
      const right = errors.slice(i);

      const leftMean = mean(left);
      const rightMean = mean(right);
      const diff = Math.abs(leftMean - rightMean);

      const epsilon = Math.sqrt(
        (1 / (2 * left.length) + 1 / (2 * right.length)) *
        Math.log(4 * errors.length / this.threshold)
      );

      if (diff > epsilon && diff > bestDrift) {
        bestDrift = diff;
        bestSplit = i;
      }
    }

    return {
      driftDetected: bestDrift > 0,
      score: bestDrift,
      splitPoint: bestSplit,
      method: 'adwin',
      windowSize: errors.length,
      severity: bestDrift > 0.3 ? 'critical' : bestDrift > 0 ? 'warning' : 'normal'
    };
  }

  getErrorTrend() {
    if (this.errorWindow.length < 2) return { trend: 'insufficient_data' };

    const recentErrors = this.errorWindow.slice(-20).map(e => e.error);
    const olderErrors = this.errorWindow.slice(-40, -20).map(e => e.error);

    if (olderErrors.length === 0) return { trend: 'insufficient_data' };

    const recentAvg = mean(recentErrors);
    const olderAvg = mean(olderErrors);
    const change = (recentAvg - olderAvg) / (olderAvg || 1);

    return {
      trend: change > 0.1 ? 'degrading' : change < -0.1 ? 'improving' : 'stable',
      recentAvgError: recentAvg,
      previousAvgError: olderAvg,
      changePercent: change * 100,
      windowSize: this.errorWindow.length
    };
  }

  reset() {
    this.errorWindow = [];
    this.phSum = 0;
    this.phMin = Infinity;
    this.ddmN = 0;
    this.ddmP = 0;
    this.ddmS = 0;
    this.ddmMinErrors = 0;
    this.ddmMinStd = 0;
  }
}

// ============================================================================
// §3  PERFORMANCE TRACKER — Track Model Metrics Over Time
// ============================================================================

class PerformanceTracker {
  constructor(config = {}) {
    this.metrics = {};
    this.maxHistory = config.maxHistory || 1000;
    this.alertThresholds = config.alertThresholds || {
      accuracy: { min: 0.7, warning: 0.8 },
      latency: { max: 5000, warning: 2000 },
      errorRate: { max: 0.1, warning: 0.05 }
    };
    this.alerts = [];
  }

  recordPrediction(modelId, data) {
    if (!this.metrics[modelId]) {
      this.metrics[modelId] = {
        predictions: [],
        latencies: [],
        errors: [],
        correctPredictions: 0,
        totalPredictions: 0,
        created: new Date()
      };
    }

    const m = this.metrics[modelId];

    m.predictions.push({
      predicted: data.predicted,
      actual: data.actual,
      correct: data.predicted === data.actual ||
               (typeof data.predicted === 'number' && Math.abs(data.predicted - data.actual) < data.tolerance),
      timestamp: new Date(),
      latency: data.latency || 0
    });

    if (data.latency) m.latencies.push(data.latency);
    if (data.error) m.errors.push({ error: data.error, timestamp: new Date() });

    m.totalPredictions++;
    if (m.predictions[m.predictions.length - 1].correct) m.correctPredictions++;

    // Trim history
    if (m.predictions.length > this.maxHistory) m.predictions.shift();
    if (m.latencies.length > this.maxHistory) m.latencies.shift();
    if (m.errors.length > 100) m.errors.shift();

    // Check alerts
    this._checkAlerts(modelId);

    return m.predictions[m.predictions.length - 1];
  }

  getMetrics(modelId) {
    const m = this.metrics[modelId];
    if (!m) return null;

    const recentPreds = m.predictions.slice(-100);
    const accuracy = recentPreds.length > 0
      ? recentPreds.filter(p => p.correct).length / recentPreds.length
      : 0;

    const latencies = m.latencies.slice(-100);
    const avgLatency = latencies.length > 0 ? mean(latencies) : 0;
    const p95Latency = latencies.length > 0
      ? [...latencies].sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)]
      : 0;

    return {
      modelId,
      totalPredictions: m.totalPredictions,
      accuracy,
      avgLatency,
      p95Latency,
      errorRate: m.errors.length / Math.max(m.totalPredictions, 1),
      recentErrors: m.errors.slice(-5),
      uptime: Date.now() - new Date(m.created).getTime(),
      status: accuracy >= 0.8 ? 'healthy' : accuracy >= 0.6 ? 'degraded' : 'critical'
    };
  }

  getAllMetrics() {
    const result = {};
    for (const modelId of Object.keys(this.metrics)) {
      result[modelId] = this.getMetrics(modelId);
    }
    return result;
  }

  _checkAlerts(modelId) {
    const metrics = this.getMetrics(modelId);
    if (!metrics) return;

    const thresholds = this.alertThresholds;

    if (metrics.accuracy < thresholds.accuracy.min) {
      this._addAlert(modelId, 'critical', `Model accuracy (${(metrics.accuracy * 100).toFixed(1)}%) below minimum threshold (${thresholds.accuracy.min * 100}%)`);
    } else if (metrics.accuracy < thresholds.accuracy.warning) {
      this._addAlert(modelId, 'warning', `Model accuracy (${(metrics.accuracy * 100).toFixed(1)}%) approaching minimum threshold`);
    }

    if (metrics.avgLatency > thresholds.latency.max) {
      this._addAlert(modelId, 'critical', `Average latency (${metrics.avgLatency.toFixed(0)}ms) exceeds maximum (${thresholds.latency.max}ms)`);
    }

    if (metrics.errorRate > thresholds.errorRate.max) {
      this._addAlert(modelId, 'critical', `Error rate (${(metrics.errorRate * 100).toFixed(1)}%) exceeds maximum (${thresholds.errorRate.max * 100}%)`);
    }
  }

  _addAlert(modelId, severity, message) {
    this.alerts.push({
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      modelId,
      severity,
      message,
      timestamp: new Date(),
      acknowledged: false
    });

    if (this.alerts.length > 200) this.alerts.shift();
  }

  getAlerts(modelId = null, acknowledged = false) {
    let filtered = this.alerts;
    if (modelId) filtered = filtered.filter(a => a.modelId === modelId);
    if (!acknowledged) filtered = filtered.filter(a => !a.acknowledged);
    return filtered;
  }

  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date();
      return true;
    }
    return false;
  }
}

// ============================================================================
// §4  PREDICTION LOGGING — Comprehensive Prediction Audit Log
// ============================================================================

class PredictionLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 10000;
    this.dataDir = path.join(__dirname, '../../data/prediction-logs');
  }

  async _ensureDir() {
    await fs.promises.mkdir(this.dataDir, { recursive: true }).catch(() => {});
  }

  log(entry) {
    const record = {
      id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date(),
      ...entry,
      metadata: {
        ...entry.metadata,
        environmentVersion: process.env.APP_VERSION || '2.0.0'
      }
    };

    this.logs.push(record);
    if (this.logs.length > this.maxLogs) this.logs.shift();

    return record;
  }

  query(filters = {}) {
    let result = [...this.logs];

    if (filters.modelId) result = result.filter(l => l.modelId === filters.modelId);
    if (filters.userId) result = result.filter(l => l.userId === filters.userId);
    if (filters.type) result = result.filter(l => l.type === filters.type);
    if (filters.since) result = result.filter(l => new Date(l.timestamp) >= new Date(filters.since));
    if (filters.until) result = result.filter(l => new Date(l.timestamp) <= new Date(filters.until));
    if (filters.correct !== undefined) result = result.filter(l => l.correct === filters.correct);

    if (filters.limit) result = result.slice(-filters.limit);

    return result;
  }

  getStats(modelId) {
    const logs = this.logs.filter(l => l.modelId === modelId);
    if (logs.length === 0) return null;

    const correct = logs.filter(l => l.correct).length;
    const total = logs.length;
    const latencies = logs.map(l => l.latency).filter(Boolean);

    return {
      totalPredictions: total,
      accuracy: total > 0 ? correct / total : 0,
      avgLatency: latencies.length > 0 ? mean(latencies) : 0,
      p50Latency: this._percentile(latencies, 50),
      p95Latency: this._percentile(latencies, 95),
      p99Latency: this._percentile(latencies, 99),
      firstPrediction: logs[0]?.timestamp,
      lastPrediction: logs[logs.length - 1]?.timestamp,
      uniqueUsers: new Set(logs.map(l => l.userId)).size
    };
  }

  async exportLogs(modelId) {
    await this._ensureDir();
    const logs = modelId ? this.logs.filter(l => l.modelId === modelId) : this.logs;
    const filePath = path.join(this.dataDir, `predictions_${modelId || 'all'}_${Date.now()}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(logs, null, 2));
    return filePath;
  }

  _percentile(arr, p) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }
}

// ============================================================================
// §5  A/B TEST MANAGER — Compare Model Versions
// ============================================================================

class ABTestManager {
  constructor() {
    this.tests = {};
    this.results = {};
  }

  createTest(testId, config) {
    this.tests[testId] = {
      id: testId,
      modelA: config.modelA,
      modelB: config.modelB,
      trafficSplit: config.trafficSplit || 0.5,
      metric: config.metric || 'accuracy',
      minSamples: config.minSamples || 100,
      created: new Date(),
      status: 'running',
      resultsA: { predictions: 0, correct: 0, totalReward: 0, latencies: [] },
      resultsB: { predictions: 0, correct: 0, totalReward: 0, latencies: [] }
    };

    return this.tests[testId];
  }

  getTestAssignment(testId) {
    const test = this.tests[testId];
    if (!test || test.status !== 'running') return null;
    return Math.random() < test.trafficSplit ? 'A' : 'B';
  }

  recordResult(testId, variant, data) {
    const test = this.tests[testId];
    if (!test) return null;

    const results = variant === 'A' ? test.resultsA : test.resultsB;
    results.predictions++;
    if (data.correct) results.correct++;
    results.totalReward += data.reward || 0;
    if (data.latency) results.latencies.push(data.latency);

    // Check if we have enough samples for statistical significance
    if (test.resultsA.predictions >= test.minSamples &&
        test.resultsB.predictions >= test.minSamples) {
      this._evaluateTest(testId);
    }

    return results;
  }

  _evaluateTest(testId) {
    const test = this.tests[testId];
    if (!test) return;

    const accA = test.resultsA.predictions > 0 ? test.resultsA.correct / test.resultsA.predictions : 0;
    const accB = test.resultsB.predictions > 0 ? test.resultsB.correct / test.resultsB.predictions : 0;

    // Z-test for proportions
    const n1 = test.resultsA.predictions;
    const n2 = test.resultsB.predictions;
    const p1 = accA;
    const p2 = accB;
    const pPooled = (test.resultsA.correct + test.resultsB.correct) / (n1 + n2);
    const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / n1 + 1 / n2));
    const zScore = se > 0 ? (p1 - p2) / se : 0;
    const pValue = 2 * (1 - this._normalCDF(Math.abs(zScore)));

    this.results[testId] = {
      testId,
      accuracyA: accA,
      accuracyB: accB,
      winner: accA > accB ? 'A' : accB > accA ? 'B' : 'tie',
      improvement: accA > 0 ? ((accB - accA) / accA) * 100 : 0,
      zScore,
      pValue,
      significant: pValue < 0.05,
      samplesA: n1,
      samplesB: n2,
      latencyA: test.resultsA.latencies.length > 0 ? mean(test.resultsA.latencies) : 0,
      latencyB: test.resultsB.latencies.length > 0 ? mean(test.resultsB.latencies) : 0,
      evaluatedAt: new Date()
    };

    if (pValue < 0.05) {
      test.status = 'completed';
    }

    return this.results[testId];
  }

  _normalCDF(x) {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429;
    const p = 0.3275911;
    const t = 1.0 / (1.0 + p * Math.abs(x));
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x / 2);
    return x >= 0 ? y : 1 - y;
  }

  getTestResults(testId) {
    return this.results[testId] || null;
  }

  getAllTests() {
    return Object.values(this.tests).map(test => ({
      ...test,
      resultsA: { ...test.resultsA, latencies: undefined },
      resultsB: { ...test.resultsB, latencies: undefined },
      evaluation: this.results[test.id] || null
    }));
  }

  endTest(testId) {
    const test = this.tests[testId];
    if (test) {
      test.status = 'ended';
      this._evaluateTest(testId);
    }
    return this.results[testId];
  }
}

// ============================================================================
// §6  INTEGRATED MONITORING SERVICE
// ============================================================================

class ModelMonitoringService {
  constructor() {
    this.dataDriftDetectors = {};
    this.conceptDriftDetectors = {};
    this.performanceTracker = new PerformanceTracker();
    this.predictionLogger = new PredictionLogger();
    this.abTestManager = new ABTestManager();
    this.retrainingCallbacks = {};
    this.monitoringInterval = null;
  }

  // Register a model for monitoring
  registerModel(modelId, config = {}) {
    this.dataDriftDetectors[modelId] = new DataDriftDetector({
      windowSize: config.windowSize || 100,
      threshold: config.driftThreshold || 0.05
    });

    this.conceptDriftDetectors[modelId] = new ConceptDriftDetector({
      windowSize: config.windowSize || 50,
      threshold: config.conceptDriftThreshold || 0.1,
      method: config.driftMethod || 'page_hinkley'
    });

    logger.info(`Model ${modelId} registered for monitoring`);
    return true;
  }

  // Set reference data for drift detection
  setReferenceData(modelId, data) {
    if (this.dataDriftDetectors[modelId]) {
      this.dataDriftDetectors[modelId].setReference(data);
    }
  }

  // Record a prediction and check for issues
  recordPrediction(modelId, data) {
    const { input, predicted, actual, latency, userId } = data;

    // Log prediction
    this.predictionLogger.log({
      modelId,
      userId,
      input,
      predicted,
      actual,
      correct: predicted === actual || (typeof predicted === 'number' && actual !== undefined && Math.abs(predicted - actual) < (data.tolerance || 0.1)),
      latency,
      type: data.type || 'prediction'
    });

    // Track performance
    this.performanceTracker.recordPrediction(modelId, {
      predicted,
      actual,
      latency,
      tolerance: data.tolerance
    });

    // Check data drift
    if (input && this.dataDriftDetectors[modelId]) {
      this.dataDriftDetectors[modelId].addObservation(input);
    }

    // Check concept drift
    if (actual !== undefined && this.conceptDriftDetectors[modelId]) {
      const driftResult = this.conceptDriftDetectors[modelId].addPrediction(predicted, actual);

      if (driftResult.driftDetected) {
        logger.warn(`Concept drift detected for model ${modelId}`);
        this._triggerRetraining(modelId, 'concept_drift', driftResult);
      }
    }
  }

  // Get comprehensive monitoring dashboard
  getDashboard(modelId = null) {
    const dashboard = {
      timestamp: new Date(),
      models: {}
    };

    const modelIds = modelId ? [modelId] : Object.keys(this.dataDriftDetectors);

    for (const id of modelIds) {
      const metrics = this.performanceTracker.getMetrics(id);
      const dataDrift = this.dataDriftDetectors[id]?.checkDrift();
      const conceptDrift = this.conceptDriftDetectors[id]?.getErrorTrend();
      const predStats = this.predictionLogger.getStats(id);

      dashboard.models[id] = {
        performance: metrics,
        dataDrift,
        conceptDrift,
        predictionStats: predStats,
        alerts: this.performanceTracker.getAlerts(id)
      };
    }

    dashboard.summary = {
      totalModels: modelIds.length,
      healthyModels: Object.values(dashboard.models).filter(m => m.performance?.status === 'healthy').length,
      degradedModels: Object.values(dashboard.models).filter(m => m.performance?.status === 'degraded').length,
      criticalModels: Object.values(dashboard.models).filter(m => m.performance?.status === 'critical').length,
      totalAlerts: this.performanceTracker.getAlerts().length,
      modelsWithDrift: Object.values(dashboard.models).filter(m => m.dataDrift?.driftDetected).length
    };

    return dashboard;
  }

  // Register retraining callback
  onRetrainingNeeded(modelId, callback) {
    this.retrainingCallbacks[modelId] = callback;
  }

  _triggerRetraining(modelId, reason, details) {
    const callback = this.retrainingCallbacks[modelId];
    if (callback) {
      try {
        callback({ modelId, reason, details, triggeredAt: new Date() });
      } catch (e) {
        logger.error(`Retraining callback failed for ${modelId}:`, e.message);
      }
    }
  }

  // Start periodic monitoring
  startMonitoring(intervalMs = 60000) {
    if (this.monitoringInterval) clearInterval(this.monitoringInterval);

    this.monitoringInterval = setInterval(() => {
      for (const modelId of Object.keys(this.dataDriftDetectors)) {
        const drift = this.dataDriftDetectors[modelId].checkDrift();
        if (drift.driftDetected) {
          this._triggerRetraining(modelId, 'data_drift', drift);
        }
      }
    }, intervalMs);

    logger.info(`Model monitoring started (interval: ${intervalMs}ms)`);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Get all active A/B tests
  getABTests() {
    return this.abTestManager.getAllTests();
  }

  // Create A/B test
  createABTest(config) {
    return this.abTestManager.createTest(config.id || `test_${Date.now()}`, config);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  DataDriftDetector,
  ConceptDriftDetector,
  PerformanceTracker,
  PredictionLogger,
  ABTestManager,
  ModelMonitoringService
};
