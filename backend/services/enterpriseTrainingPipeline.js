// ============================================================================
// ENTERPRISE AI SELF-TRAINING PIPELINE
// Continuously learns from user data to improve predictions
// ============================================================================
const EventEmitter = require('events');

// ============================================================================
// § 1 — FEATURE ENGINEERING
// ============================================================================
class FeatureEngineering {
  /**
   * Extract statistical features from a numeric array
   */
  static extractStatFeatures(values) {
    if (!values.length) return { mean: 0, std: 0, min: 0, max: 0, median: 0, skew: 0 };
    const n = values.length;
    const mean = values.reduce((s, v) => s + v, 0) / n;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const std = Math.sqrt(variance);
    const sorted = [...values].sort((a, b) => a - b);
    const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
    const skew = std > 0 ? values.reduce((s, v) => s + ((v - mean) / std) ** 3, 0) / n : 0;
    return { mean, std, min: sorted[0], max: sorted[n - 1], median, skew };
  }

  /**
   * Normalize values to [0,1]
   */
  static minMaxNormalize(values) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return values.map(v => (v - min) / range);
  }

  /**
   * Extract temporal features from a date
   */
  static temporalFeatures(date) {
    const d = new Date(date);
    return {
      dayOfWeek: d.getDay() / 6,           // 0-1
      dayOfMonth: d.getDate() / 31,         // 0-1
      monthOfYear: d.getMonth() / 11,       // 0-1
      isWeekend: d.getDay() === 0 || d.getDay() === 6 ? 1 : 0,
      quarterOfYear: Math.floor(d.getMonth() / 3) / 3,
      hourOfDay: d.getHours() / 23,
    };
  }

  /**
   * Extract transaction features for ML model
   */
  static transactionFeatures(transaction) {
    const amount = Math.abs(transaction.amount || 0);
    const temporal = this.temporalFeatures(transaction.date || new Date());
    return {
      amount,
      logAmount: Math.log1p(amount),
      isExpense: (transaction.amount || 0) < 0 ? 1 : 0,
      ...temporal,
      categoryHash: this.simpleHash(transaction.category || 'other') % 20 / 20,
      descriptionLength: (transaction.description || '').length / 100,
    };
  }

  static simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}

// ============================================================================
// § 2 — ONLINE LEARNING MODEL (SGD)
// ============================================================================
class OnlineLearningModel {
  constructor(featureCount, learningRate = 0.01) {
    this.weights = new Array(featureCount).fill(0).map(() => (Math.random() - 0.5) * 0.1);
    this.bias = 0;
    this.learningRate = learningRate;
    this.trainingCount = 0;
    this.loss = [];
  }

  predict(features) {
    let z = this.bias;
    for (let i = 0; i < features.length && i < this.weights.length; i++) {
      z += this.weights[i] * features[i];
    }
    return z;
  }

  sigmoid(z) {
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, z))));
  }

  train(features, target, isClassification = false) {
    const prediction = isClassification ? this.sigmoid(this.predict(features)) : this.predict(features);
    const error = target - prediction;
    const lr = this.learningRate / (1 + this.trainingCount * 0.0001); // decay

    for (let i = 0; i < features.length && i < this.weights.length; i++) {
      this.weights[i] += lr * error * features[i];
    }
    this.bias += lr * error;

    this.trainingCount++;
    const loss = error ** 2;
    this.loss.push(loss);
    if (this.loss.length > 1000) this.loss.shift();

    return { prediction, error, loss };
  }

  getMetrics() {
    const recentLoss = this.loss.slice(-100);
    return {
      trainingCount: this.trainingCount,
      avgLoss: recentLoss.length > 0 ? recentLoss.reduce((s, v) => s + v, 0) / recentLoss.length : 0,
      weightsMagnitude: Math.sqrt(this.weights.reduce((s, w) => s + w ** 2, 0)),
    };
  }

  serialize() {
    return { weights: [...this.weights], bias: this.bias, trainingCount: this.trainingCount, learningRate: this.learningRate };
  }

  static deserialize(data) {
    const model = new OnlineLearningModel(data.weights.length, data.learningRate);
    model.weights = [...data.weights];
    model.bias = data.bias;
    model.trainingCount = data.trainingCount;
    return model;
  }
}

// ============================================================================
// § 3 — PATTERN MEMORY (User Behavior Store)
// ============================================================================
class PatternMemory {
  constructor(maxPatterns = 5000) {
    this.patterns = new Map();
    this.maxPatterns = maxPatterns;
    this.accessCount = new Map();
  }

  store(key, pattern) {
    if (this.patterns.size >= this.maxPatterns) {
      // Evict least accessed
      let minKey = null, minCount = Infinity;
      for (const [k, count] of this.accessCount) {
        if (count < minCount) { minCount = count; minKey = k; }
      }
      if (minKey) { this.patterns.delete(minKey); this.accessCount.delete(minKey); }
    }
    this.patterns.set(key, { ...pattern, storedAt: Date.now() });
    this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
  }

  retrieve(key) {
    if (this.patterns.has(key)) {
      this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
      return this.patterns.get(key);
    }
    return null;
  }

  findSimilar(pattern, topK = 5) {
    const entries = [...this.patterns.entries()];
    if (!entries.length) return [];
    return entries
      .map(([key, stored]) => ({ key, pattern: stored, similarity: this.cosineSimilarity(pattern, stored) }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  cosineSimilarity(a, b) {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => typeof a[k] === 'number' && typeof b[k] === 'number');
    if (!keys.length) return 0;
    let dot = 0, magA = 0, magB = 0;
    for (const k of keys) {
      const av = a[k] || 0, bv = b[k] || 0;
      dot += av * bv;
      magA += av ** 2;
      magB += bv ** 2;
    }
    const mag = Math.sqrt(magA) * Math.sqrt(magB);
    return mag > 0 ? dot / mag : 0;
  }

  get size() { return this.patterns.size; }

  serialize() {
    return {
      patterns: Object.fromEntries(this.patterns),
      accessCount: Object.fromEntries(this.accessCount),
    };
  }

  static deserialize(data, maxPatterns = 5000) {
    const mem = new PatternMemory(maxPatterns);
    if (data.patterns) {
      for (const [k, v] of Object.entries(data.patterns)) mem.patterns.set(k, v);
    }
    if (data.accessCount) {
      for (const [k, v] of Object.entries(data.accessCount)) mem.accessCount.set(k, v);
    }
    return mem;
  }
}

// ============================================================================
// § 4 — CATEGORY CLASSIFIER (Naive Bayes — self-improving)
// ============================================================================
class SelfTrainingCategorizer {
  constructor() {
    this.wordCounts = {};     // category -> { word -> count }
    this.categoryCounts = {};  // category -> total docs
    this.totalDocs = 0;
    this.vocabulary = new Set();
  }

  tokenize(text) {
    return (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(t => t.length > 1);
  }

  train(text, category) {
    const tokens = this.tokenize(text);
    if (!tokens.length || !category) return;

    if (!this.wordCounts[category]) this.wordCounts[category] = {};
    this.categoryCounts[category] = (this.categoryCounts[category] || 0) + 1;
    this.totalDocs++;

    tokens.forEach(token => {
      this.vocabulary.add(token);
      this.wordCounts[category][token] = (this.wordCounts[category][token] || 0) + 1;
    });
  }

  predict(text) {
    const tokens = this.tokenize(text);
    if (!tokens.length || !this.totalDocs) return { category: 'other', confidence: 0 };

    const scores = {};
    const vocabSize = this.vocabulary.size || 1;

    for (const [category, count] of Object.entries(this.categoryCounts)) {
      let logProb = Math.log(count / this.totalDocs);
      const wordTotal = Object.values(this.wordCounts[category] || {}).reduce((s, v) => s + v, 0);

      tokens.forEach(token => {
        const tokenCount = this.wordCounts[category]?.[token] || 0;
        logProb += Math.log((tokenCount + 1) / (wordTotal + vocabSize)); // Laplace smoothing
      });

      scores[category] = logProb;
    }

    const entries = Object.entries(scores).sort(([, a], [, b]) => b - a);
    if (!entries.length) return { category: 'other', confidence: 0 };

    const topScore = entries[0][1];
    const secondScore = entries.length > 1 ? entries[1][1] : topScore - 10;
    const confidence = Math.min(1, 1 / (1 + Math.exp(-(topScore - secondScore))));

    return {
      category: entries[0][0],
      confidence,
      alternatives: entries.slice(1, 4).map(([cat, score]) => ({ category: cat, score })),
    };
  }

  getStats() {
    return {
      totalDocs: this.totalDocs,
      categories: Object.keys(this.categoryCounts).length,
      vocabularySize: this.vocabulary.size,
      categoryDistribution: { ...this.categoryCounts },
    };
  }

  serialize() {
    return {
      wordCounts: this.wordCounts,
      categoryCounts: this.categoryCounts,
      totalDocs: this.totalDocs,
      vocabulary: [...this.vocabulary],
    };
  }

  static deserialize(data) {
    const c = new SelfTrainingCategorizer();
    c.wordCounts = data.wordCounts || {};
    c.categoryCounts = data.categoryCounts || {};
    c.totalDocs = data.totalDocs || 0;
    c.vocabulary = new Set(data.vocabulary || []);
    return c;
  }
}

// ============================================================================
// § 5 — ANOMALY FEEDBACK LOOP
// ============================================================================
class AnomalyFeedbackLoop {
  constructor() {
    this.confirmedAnomalies = [];
    this.falsePositives = [];
    this.threshold = 2.0; // initial Z-score threshold
    this.adaptiveHistory = [];
  }

  recordFeedback(transaction, isAnomaly) {
    if (isAnomaly) {
      this.confirmedAnomalies.push({ amount: Math.abs(transaction.amount), category: transaction.category, date: transaction.date });
    } else {
      this.falsePositives.push({ amount: Math.abs(transaction.amount), category: transaction.category, date: transaction.date });
    }
    this.adaptThreshold();
  }

  adaptThreshold() {
    const fpRate = this.falsePositives.length / (this.confirmedAnomalies.length + this.falsePositives.length + 1);
    // If too many false positives, raise threshold; if too few detections, lower it
    if (fpRate > 0.3) {
      this.threshold = Math.min(4.0, this.threshold + 0.1);
    } else if (fpRate < 0.1 && this.confirmedAnomalies.length > 5) {
      this.threshold = Math.max(1.5, this.threshold - 0.05);
    }
    this.adaptiveHistory.push({ threshold: this.threshold, fpRate, timestamp: Date.now() });
  }

  getAdaptiveThreshold() {
    return this.threshold;
  }

  getStats() {
    return {
      confirmedAnomalies: this.confirmedAnomalies.length,
      falsePositives: this.falsePositives.length,
      currentThreshold: this.threshold,
      precision: this.confirmedAnomalies.length / (this.confirmedAnomalies.length + this.falsePositives.length + 1),
    };
  }

  serialize() {
    return {
      confirmedAnomalies: this.confirmedAnomalies.slice(-100),
      falsePositives: this.falsePositives.slice(-100),
      threshold: this.threshold,
    };
  }

  static deserialize(data) {
    const loop = new AnomalyFeedbackLoop();
    loop.confirmedAnomalies = data.confirmedAnomalies || [];
    loop.falsePositives = data.falsePositives || [];
    loop.threshold = data.threshold || 2.0;
    return loop;
  }
}

// ============================================================================
// § 6 — SPENDING TREND DETECTOR
// ============================================================================
class SpendingTrendDetector {
  constructor() {
    this.monthlyData = {};
  }

  addData(transactions) {
    transactions.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!this.monthlyData[key]) this.monthlyData[key] = { income: 0, expenses: 0, count: 0 };
      if ((t.amount || 0) > 0) this.monthlyData[key].income += Math.abs(t.amount);
      else this.monthlyData[key].expenses += Math.abs(t.amount);
      this.monthlyData[key].count++;
    });
  }

  detectTrends() {
    const months = Object.entries(this.monthlyData).sort(([a], [b]) => a.localeCompare(b));
    if (months.length < 3) return { trends: [], confidence: 'low' };

    const incomes = months.map(([, d]) => d.income);
    const expenses = months.map(([, d]) => d.expenses);

    const incomeTrend = this.linearRegression(incomes);
    const expenseTrend = this.linearRegression(expenses);

    const trends = [];

    if (incomeTrend.slope > 0) trends.push({ type: 'positive', area: 'income', message: `Income trending upward by ₹${Math.round(incomeTrend.slope)}/month` });
    else if (incomeTrend.slope < -100) trends.push({ type: 'negative', area: 'income', message: `Income declining by ₹${Math.abs(Math.round(incomeTrend.slope))}/month` });

    if (expenseTrend.slope > 500) trends.push({ type: 'warning', area: 'expenses', message: `Expenses growing by ₹${Math.round(expenseTrend.slope)}/month — review spending` });
    else if (expenseTrend.slope < 0) trends.push({ type: 'positive', area: 'expenses', message: `Expenses decreasing — good spending discipline` });

    // Savings rate trend
    const savingsRates = months.map(([, d]) => d.income > 0 ? (d.income - d.expenses) / d.income * 100 : 0);
    const savingsTrend = this.linearRegression(savingsRates);
    if (savingsTrend.slope > 0.5) trends.push({ type: 'positive', area: 'savings', message: `Savings rate improving by ${savingsTrend.slope.toFixed(1)}% per month` });
    else if (savingsTrend.slope < -0.5) trends.push({ type: 'negative', area: 'savings', message: `Savings rate declining by ${Math.abs(savingsTrend.slope).toFixed(1)}% per month` });

    return {
      trends,
      confidence: months.length >= 6 ? 'high' : months.length >= 3 ? 'medium' : 'low',
      monthsAnalyzed: months.length,
      incomeTrend, expenseTrend, savingsTrend,
    };
  }

  linearRegression(values) {
    const n = values.length;
    if (n < 2) return { slope: 0, intercept: values[0] || 0, r2: 0 };
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((s, v) => s + v, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (values[i] - yMean);
      den += (i - xMean) ** 2;
    }
    const slope = den > 0 ? num / den : 0;
    const intercept = yMean - slope * xMean;

    // R² coefficient
    const ssRes = values.reduce((s, v, i) => s + (v - (intercept + slope * i)) ** 2, 0);
    const ssTot = values.reduce((s, v) => s + (v - yMean) ** 2, 0);
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return { slope, intercept, r2 };
  }
}

// ============================================================================
// § 7 — MAIN TRAINING PIPELINE ORCHESTRATOR
// ============================================================================
class EnterpriseTrainingPipeline extends EventEmitter {
  constructor() {
    super();
    this.spendingModel = new OnlineLearningModel(10);
    this.categoryClassifier = new SelfTrainingCategorizer();
    this.patternMemory = new PatternMemory(5000);
    this.anomalyLoop = new AnomalyFeedbackLoop();
    this.trendDetector = new SpendingTrendDetector();
    this.trainingLog = [];
    this.isTraining = false;
    this.lastTrainedAt = null;

    // Auto-train interval (every 30 minutes if data available)
    this._autoTrainInterval = null;
    this._pendingData = [];
  }

  /**
   * Ingest a batch of transactions for training
   */
  async ingestTransactions(transactions) {
    if (!Array.isArray(transactions) || !transactions.length) return { trained: 0 };

    this.isTraining = true;
    this.emit('training:start', { count: transactions.length });
    let trained = 0;

    try {
      for (const tx of transactions) {
        // 1. Train spending model
        const features = FeatureEngineering.transactionFeatures(tx);
        const featureArray = Object.values(features);
        const target = Math.abs(tx.amount || 0);
        this.spendingModel.train(featureArray, target / 10000); // normalize target
        trained++;

        // 2. Train category classifier
        const text = [tx.description, tx.merchant, tx.category].filter(Boolean).join(' ');
        if (tx.category && text) {
          this.categoryClassifier.train(text, tx.category);
        }

        // 3. Store pattern
        const patternKey = `${tx.category || 'unknown'}_${new Date(tx.date).getDay()}`;
        this.patternMemory.store(patternKey, {
          amount: Math.abs(tx.amount || 0),
          dayOfWeek: new Date(tx.date).getDay(),
          category: tx.category,
        });
      }

      // 4. Train trend detector
      this.trendDetector.addData(transactions);

      this.lastTrainedAt = new Date().toISOString();
      this.trainingLog.push({
        timestamp: this.lastTrainedAt,
        count: trained,
        modelMetrics: this.spendingModel.getMetrics(),
        classifierStats: this.categoryClassifier.getStats(),
        memorySize: this.patternMemory.size,
      });
      if (this.trainingLog.length > 100) this.trainingLog.shift();

      this.emit('training:complete', { trained, metrics: this.getMetrics() });
    } catch (err) {
      this.emit('training:error', { error: err.message });
    } finally {
      this.isTraining = false;
    }

    return { trained, metrics: this.getMetrics() };
  }

  /**
   * Predict spending for given features
   */
  predictSpending(transactionPartial) {
    const features = FeatureEngineering.transactionFeatures(transactionPartial);
    const featureArray = Object.values(features);
    const predicted = this.spendingModel.predict(featureArray) * 10000;
    return { predictedAmount: Math.max(0, predicted), confidence: Math.min(1, this.spendingModel.trainingCount / 100) };
  }

  /**
   * Classify a transaction category
   */
  classifyCategory(description) {
    return this.categoryClassifier.predict(description);
  }

  /**
   * Record anomaly feedback
   */
  recordAnomalyFeedback(transaction, isAnomaly) {
    this.anomalyLoop.recordFeedback(transaction, isAnomaly);
    return { adaptiveThreshold: this.anomalyLoop.getAdaptiveThreshold() };
  }

  /**
   * Detect spending trends
   */
  detectTrends() {
    return this.trendDetector.detectTrends();
  }

  /**
   * Find similar spending patterns
   */
  findSimilarPatterns(transaction) {
    const pattern = {
      amount: Math.abs(transaction.amount || 0),
      dayOfWeek: new Date(transaction.date || new Date()).getDay(),
    };
    return this.patternMemory.findSimilar(pattern, 5);
  }

  /**
   * Get comprehensive pipeline metrics
   */
  getMetrics() {
    return {
      spendingModel: this.spendingModel.getMetrics(),
      categoryClassifier: this.categoryClassifier.getStats(),
      patternMemory: { size: this.patternMemory.size, maxSize: this.patternMemory.maxPatterns },
      anomalyDetection: this.anomalyLoop.getStats(),
      trends: this.trendDetector.detectTrends(),
      lastTrainedAt: this.lastTrainedAt,
      trainingHistory: this.trainingLog.slice(-10),
      isTraining: this.isTraining,
    };
  }

  /**
   * Start auto-training on a schedule
   */
  startAutoTraining(intervalMs = 30 * 60 * 1000) {
    if (this._autoTrainInterval) clearInterval(this._autoTrainInterval);
    this._autoTrainInterval = setInterval(() => {
      if (this._pendingData.length > 0) {
        const batch = this._pendingData.splice(0);
        this.ingestTransactions(batch);
      }
    }, intervalMs);
    this.emit('autoTrain:started', { intervalMs });
  }

  stopAutoTraining() {
    if (this._autoTrainInterval) {
      clearInterval(this._autoTrainInterval);
      this._autoTrainInterval = null;
    }
    this.emit('autoTrain:stopped');
  }

  /**
   * Queue data for next auto-training cycle
   */
  queueForTraining(transactions) {
    this._pendingData.push(...transactions);
    return { queued: transactions.length, pendingTotal: this._pendingData.length };
  }

  /**
   * Serialize entire pipeline state
   */
  serialize() {
    return {
      spendingModel: this.spendingModel.serialize(),
      categoryClassifier: this.categoryClassifier.serialize(),
      patternMemory: this.patternMemory.serialize(),
      anomalyLoop: this.anomalyLoop.serialize(),
      lastTrainedAt: this.lastTrainedAt,
      trainingLog: this.trainingLog.slice(-20),
    };
  }

  /**
   * Restore pipeline from serialized state
   */
  static deserialize(data) {
    const pipeline = new EnterpriseTrainingPipeline();
    if (data.spendingModel) pipeline.spendingModel = OnlineLearningModel.deserialize(data.spendingModel);
    if (data.categoryClassifier) pipeline.categoryClassifier = SelfTrainingCategorizer.deserialize(data.categoryClassifier);
    if (data.patternMemory) pipeline.patternMemory = PatternMemory.deserialize(data.patternMemory);
    if (data.anomalyLoop) pipeline.anomalyLoop = AnomalyFeedbackLoop.deserialize(data.anomalyLoop);
    pipeline.lastTrainedAt = data.lastTrainedAt;
    pipeline.trainingLog = data.trainingLog || [];
    return pipeline;
  }
}

// ── Singleton ──
const trainingPipeline = new EnterpriseTrainingPipeline();

module.exports = {
  trainingPipeline,
  EnterpriseTrainingPipeline,
  OnlineLearningModel,
  FeatureEngineering,
  PatternMemory,
  SelfTrainingCategorizer,
  AnomalyFeedbackLoop,
  SpendingTrendDetector,
};
