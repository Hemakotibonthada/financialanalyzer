// ============================================================================
// ENTERPRISE PREDICTION ENGINE — Advanced AI-Powered Financial Predictions
// ============================================================================
// Self-training ML engine for financial predictions, behavioral analysis,
// and intelligent recommendations. Uses ensemble methods, time-series
// forecasting, and adaptive learning.
// ============================================================================

const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

const model = (name) => {
  try { return require(`../models/${name}`); } catch { return null; }
};

// ============================================================================
// §0  MATHEMATICAL FOUNDATIONS
// ============================================================================

const DAY = 86400000;
const ago = (d) => new Date(Date.now() - d * DAY);
const sum = (a) => a.reduce((s, v) => s + v, 0);
const mean = (a) => (a.length ? sum(a) / a.length : 0);
const stdDev = (a) => { const m = mean(a); return Math.sqrt(mean(a.map(v => (v - m) ** 2))); };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

class Matrix {
  constructor(rows, cols, data = null) {
    this.rows = rows;
    this.cols = cols;
    this.data = data || new Float64Array(rows * cols);
  }
  get(r, c) { return this.data[r * this.cols + c]; }
  set(r, c, v) { this.data[r * this.cols + c] = v; }
  static multiply(a, b) {
    const result = new Matrix(a.rows, b.cols);
    for (let i = 0; i < a.rows; i++)
      for (let j = 0; j < b.cols; j++) {
        let s = 0;
        for (let k = 0; k < a.cols; k++) s += a.get(i, k) * b.get(k, j);
        result.set(i, j, s);
      }
    return result;
  }
  static fromArray(arr) {
    const m = new Matrix(arr.length, 1);
    arr.forEach((v, i) => m.set(i, 0, v));
    return m;
  }
  toArray() { return Array.from(this.data); }
  map(fn) {
    const result = new Matrix(this.rows, this.cols);
    for (let i = 0; i < this.data.length; i++) result.data[i] = fn(this.data[i], i);
    return result;
  }
  add(other) {
    const result = new Matrix(this.rows, this.cols);
    for (let i = 0; i < this.data.length; i++) result.data[i] = this.data[i] + other.data[i];
    return result;
  }
}

// ============================================================================
// §1  ACTIVATION FUNCTIONS & LOSS FUNCTIONS
// ============================================================================

const Activations = {
  relu: (x) => Math.max(0, x),
  reluDerivative: (x) => x > 0 ? 1 : 0,
  sigmoid: (x) => 1 / (1 + Math.exp(-clamp(x, -500, 500))),
  sigmoidDerivative: (x) => { const s = Activations.sigmoid(x); return s * (1 - s); },
  tanh: (x) => Math.tanh(x),
  tanhDerivative: (x) => 1 - Math.tanh(x) ** 2,
  leakyRelu: (x) => x > 0 ? x : 0.01 * x,
  leakyReluDerivative: (x) => x > 0 ? 1 : 0.01,
  softplus: (x) => Math.log(1 + Math.exp(clamp(x, -500, 500))),
  swish: (x) => x * Activations.sigmoid(x),
  gelu: (x) => 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3))),
};

const LossFunctions = {
  mse: (predicted, actual) => mean(predicted.map((p, i) => (p - actual[i]) ** 2)),
  mae: (predicted, actual) => mean(predicted.map((p, i) => Math.abs(p - actual[i]))),
  huber: (predicted, actual, delta = 1) => {
    return mean(predicted.map((p, i) => {
      const a = Math.abs(p - actual[i]);
      return a <= delta ? 0.5 * a ** 2 : delta * (a - 0.5 * delta);
    }));
  },
  crossEntropy: (predicted, actual) => {
    return -mean(predicted.map((p, i) => {
      const clamped = clamp(p, 1e-15, 1 - 1e-15);
      return actual[i] * Math.log(clamped) + (1 - actual[i]) * Math.log(1 - clamped);
    }));
  },
};

// ============================================================================
// §2  ENSEMBLE PREDICTOR — Combines Multiple Models
// ============================================================================

class EnsemblePredictor {
  constructor(config = {}) {
    this.models = [];
    this.weights = [];
    this.config = {
      maxModels: config.maxModels || 5,
      learningRate: config.learningRate || 0.01,
      regularization: config.regularization || 0.001,
      ...config,
    };
    this.performanceHistory = [];
    this.trainingMetrics = { iterations: 0, bestLoss: Infinity, convergenceRate: 0 };
  }

  addModel(model, weight = 1.0) {
    this.models.push(model);
    this.weights.push(weight);
    this._normalizeWeights();
  }

  _normalizeWeights() {
    const total = sum(this.weights);
    if (total > 0) this.weights = this.weights.map(w => w / total);
  }

  predict(features) {
    if (!this.models.length) return { prediction: 0, confidence: 0 };

    const predictions = this.models.map(m => {
      try { return m.predict(features); }
      catch { return 0; }
    });

    const weightedPrediction = sum(predictions.map((p, i) => p * this.weights[i]));
    const variance = mean(predictions.map(p => (p - weightedPrediction) ** 2));
    const confidence = clamp(1 - Math.sqrt(variance) / (Math.abs(weightedPrediction) + 1), 0, 1);

    return {
      prediction: weightedPrediction,
      confidence,
      individual: predictions,
      weights: [...this.weights],
      variance,
    };
  }

  updateWeights(actual) {
    if (!this.models.length) return;

    const predictions = this.models.map(m => {
      try { return m.lastPrediction || 0; }
      catch { return 0; }
    });

    const errors = predictions.map(p => Math.abs(p - actual));
    const maxError = Math.max(...errors) + 1e-10;
    const inverseErrors = errors.map(e => 1 - e / maxError);

    this.weights = this.weights.map((w, i) =>
      w * (1 - this.config.learningRate) + this.config.learningRate * inverseErrors[i]
    );
    this._normalizeWeights();
  }

  getPerformanceReport() {
    return {
      modelCount: this.models.length,
      weights: [...this.weights],
      metrics: { ...this.trainingMetrics },
      history: this.performanceHistory.slice(-50),
    };
  }

  serialize() {
    return {
      weights: [...this.weights],
      config: { ...this.config },
      metrics: { ...this.trainingMetrics },
      modelCount: this.models.length,
    };
  }
}

// ============================================================================
// §3  SPENDING PREDICTOR — Multi-Feature Spending Forecasting
// ============================================================================

class SpendingPredictor {
  constructor() {
    this.model = null;
    this.featureScalers = {};
    this.trainingHistory = [];
    this.categoryModels = {};
    this.merchantModels = {};
    this.seasonalFactors = Array(12).fill(1);
    this.dayOfWeekFactors = Array(7).fill(1);
    this.trained = false;
  }

  extractFeatures(transaction, context = {}) {
    const date = new Date(transaction.date);
    const features = {
      dayOfWeek: date.getDay() / 6,
      dayOfMonth: date.getDate() / 31,
      monthOfYear: date.getMonth() / 11,
      weekOfYear: Math.ceil((date - new Date(date.getFullYear(), 0, 1)) / (7 * DAY)) / 52,
      isWeekend: (date.getDay() === 0 || date.getDay() === 6) ? 1 : 0,
      isMonthStart: date.getDate() <= 5 ? 1 : 0,
      isMonthEnd: date.getDate() >= 25 ? 1 : 0,
      isSalaryWeek: (date.getDate() >= 25 || date.getDate() <= 5) ? 1 : 0,
      quarter: Math.floor(date.getMonth() / 3) / 3,
      categoryIndex: this._getCategoryIndex(transaction.category) / 20,
      amountNormalized: this._normalizeAmount(transaction.amount),
      recurringScore: transaction.isRecurring ? 1 : 0,
      daysSinceLastTransaction: context.daysSinceLastTransaction || 0,
      avgDailySpend: context.avgDailySpend || 0,
      monthlyBudgetUsage: context.monthlyBudgetUsage || 0,
      trendDirection: context.trendDirection || 0,
    };
    return Object.values(features);
  }

  _getCategoryIndex(category) {
    const categories = [
      'Food', 'Transport', 'Shopping', 'Bills', 'Entertainment',
      'Healthcare', 'Education', 'Rent', 'Groceries', 'Fuel',
      'Travel', 'Subscriptions', 'Insurance', 'Investment', 'Salary',
      'Freelance', 'Gift', 'Recharge', 'EMI', 'Other',
    ];
    const idx = categories.indexOf(category);
    return idx >= 0 ? idx : categories.length - 1;
  }

  _normalizeAmount(amount) {
    return clamp(Math.log1p(Math.abs(amount)) / 15, 0, 1);
  }

  train(transactions) {
    if (transactions.length < 30) {
      logger.info('SpendingPredictor: Not enough data for training (need 30+)');
      return { success: false, reason: 'insufficient_data' };
    }

    // Calculate seasonal factors
    const monthlySpend = Array(12).fill(null).map(() => []);
    const dailySpend = Array(7).fill(null).map(() => []);

    transactions.forEach(t => {
      const d = new Date(t.date);
      if (t.type === 'expense' || t.amount < 0) {
        monthlySpend[d.getMonth()].push(Math.abs(t.amount));
        dailySpend[d.getDay()].push(Math.abs(t.amount));
      }
    });

    const avgMonthly = mean(monthlySpend.map(m => mean(m)));
    this.seasonalFactors = monthlySpend.map(m => mean(m) / (avgMonthly || 1));
    this.dayOfWeekFactors = dailySpend.map(d => mean(d) / (mean(dailySpend.map(x => mean(x))) || 1));

    // Train category-specific models
    const categoryGroups = {};
    transactions.forEach(t => {
      const cat = t.category || 'Other';
      if (!categoryGroups[cat]) categoryGroups[cat] = [];
      categoryGroups[cat].push(t);
    });

    Object.entries(categoryGroups).forEach(([cat, txns]) => {
      if (txns.length < 5) return;
      const amounts = txns.map(t => Math.abs(t.amount));
      const dates = txns.map(t => new Date(t.date).getTime());

      this.categoryModels[cat] = {
        mean: mean(amounts),
        stdDev: stdDev(amounts),
        median: amounts.sort((a, b) => a - b)[Math.floor(amounts.length / 2)],
        frequency: txns.length / Math.max(1, (Math.max(...dates) - Math.min(...dates)) / DAY),
        trend: this._calculateTrend(amounts),
        recentAvg: mean(amounts.slice(-10)),
        growthRate: this._calculateGrowthRate(amounts),
        count: txns.length,
      };
    });

    // Train merchant models
    const merchantGroups = {};
    transactions.forEach(t => {
      const merchant = (t.merchant || t.description || '').toLowerCase().trim();
      if (!merchant) return;
      if (!merchantGroups[merchant]) merchantGroups[merchant] = [];
      merchantGroups[merchant].push(t);
    });

    Object.entries(merchantGroups).forEach(([merchant, txns]) => {
      if (txns.length < 3) return;
      const amounts = txns.map(t => Math.abs(t.amount));
      this.merchantModels[merchant] = {
        mean: mean(amounts),
        stdDev: stdDev(amounts),
        frequency: txns.length,
        lastAmount: amounts[amounts.length - 1],
        category: txns[0].category || 'Other',
      };
    });

    // Build simple neural weights (shallow network approximation)
    const features = transactions.map((t, i) => 
      this.extractFeatures(t, { daysSinceLastTransaction: i > 0 ? 
        (new Date(t.date) - new Date(transactions[i-1].date)) / DAY : 0 })
    );
    const targets = transactions.map(t => this._normalizeAmount(t.amount));

    // Train via gradient descent
    this.model = {
      weights: features[0].map(() => (Math.random() - 0.5) * 0.1),
      bias: 0,
    };

    const lr = 0.001;
    const epochs = 100;
    for (let epoch = 0; epoch < epochs; epoch++) {
      let totalLoss = 0;
      features.forEach((f, i) => {
        const pred = sum(f.map((x, j) => x * this.model.weights[j])) + this.model.bias;
        const error = pred - targets[i];
        totalLoss += error ** 2;
        f.forEach((x, j) => { this.model.weights[j] -= lr * error * x; });
        this.model.bias -= lr * error;
      });
      this.trainingHistory.push({ epoch, loss: totalLoss / features.length });
    }

    this.trained = true;
    logger.info(`SpendingPredictor: Trained on ${transactions.length} transactions, ` +
      `${Object.keys(this.categoryModels).length} categories, ` +
      `${Object.keys(this.merchantModels).length} merchants`);

    return {
      success: true,
      transactionsUsed: transactions.length,
      categoriesTrained: Object.keys(this.categoryModels).length,
      merchantsTrained: Object.keys(this.merchantModels).length,
      finalLoss: this.trainingHistory[this.trainingHistory.length - 1]?.loss || 0,
    };
  }

  _calculateTrend(values) {
    if (values.length < 3) return 0;
    const recent = mean(values.slice(-Math.ceil(values.length / 3)));
    const older = mean(values.slice(0, Math.ceil(values.length / 3)));
    return older ? (recent - older) / older : 0;
  }

  _calculateGrowthRate(values) {
    if (values.length < 2) return 0;
    const first = values[0] || 1;
    const last = values[values.length - 1];
    return (last - first) / first;
  }

  predictNextMonth(category = null) {
    if (!this.trained) return { prediction: 0, confidence: 0 };

    const month = new Date().getMonth();
    const seasonalFactor = this.seasonalFactors[month] || 1;

    if (category && this.categoryModels[category]) {
      const cm = this.categoryModels[category];
      const prediction = cm.recentAvg * seasonalFactor * (1 + cm.growthRate * 0.1);
      const confidence = clamp(1 - cm.stdDev / (cm.mean || 1), 0.3, 0.95);
      return {
        prediction: Math.round(prediction),
        confidence: Math.round(confidence * 100),
        trend: cm.trend > 0.05 ? 'increasing' : cm.trend < -0.05 ? 'decreasing' : 'stable',
        seasonalImpact: Math.round((seasonalFactor - 1) * 100),
        category,
      };
    }

    // Overall prediction
    const totalPrediction = Object.values(this.categoryModels)
      .reduce((sum, cm) => sum + cm.recentAvg * seasonalFactor * (1 + cm.growthRate * 0.1), 0);

    const avgConfidence = mean(
      Object.values(this.categoryModels)
        .map(cm => clamp(1 - cm.stdDev / (cm.mean || 1), 0.3, 0.95))
    );

    return {
      prediction: Math.round(totalPrediction),
      confidence: Math.round(avgConfidence * 100),
      byCategory: Object.entries(this.categoryModels).map(([cat, cm]) => ({
        category: cat,
        predicted: Math.round(cm.recentAvg * seasonalFactor),
        trend: cm.trend > 0.05 ? 'increasing' : cm.trend < -0.05 ? 'decreasing' : 'stable',
      })),
      seasonalFactor: Math.round(seasonalFactor * 100),
    };
  }

  predictCashflow(months = 6) {
    if (!this.trained) return [];

    const results = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const targetMonth = (now.getMonth() + i) % 12;
      const seasonalFactor = this.seasonalFactors[targetMonth] || 1;

      const expense = Object.values(this.categoryModels)
        .reduce((s, cm) => s + cm.recentAvg * seasonalFactor * Math.pow(1 + cm.growthRate * 0.01, i), 0);

      const incomeCategories = ['Salary', 'Freelance', 'Investment', 'Rental'];
      const income = Object.entries(this.categoryModels)
        .filter(([cat]) => incomeCategories.includes(cat))
        .reduce((s, [, cm]) => s + cm.recentAvg * Math.pow(1 + cm.growthRate * 0.01, i), 0);

      results.push({
        month: new Date(now.getFullYear(), now.getMonth() + i, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        monthIndex: targetMonth,
        predictedExpense: Math.round(expense),
        predictedIncome: Math.round(income),
        predictedSavings: Math.round(income - expense),
        seasonalFactor: Math.round(seasonalFactor * 100),
        confidence: Math.round(clamp(85 - i * 5, 50, 95)),
      });
    }

    return results;
  }

  serialize() {
    return {
      model: this.model,
      seasonalFactors: this.seasonalFactors,
      dayOfWeekFactors: this.dayOfWeekFactors,
      categoryModels: this.categoryModels,
      merchantModels: this.merchantModels,
      trained: this.trained,
      trainingHistory: this.trainingHistory.slice(-20),
    };
  }

  deserialize(data) {
    if (!data) return;
    Object.assign(this, data);
  }
}

// ============================================================================
// §4  ANOMALY DETECTOR — Multi-Method Anomaly Detection
// ============================================================================

class AnomalyDetector {
  constructor() {
    this.baselines = {};
    this.velocityBaseline = {};
    this.timeBaseline = {};
    this.isolationForest = null;
    this.trained = false;
  }

  train(transactions) {
    if (transactions.length < 20) return { success: false, reason: 'insufficient_data' };

    // Build category baselines
    const categoryGroups = {};
    transactions.forEach(t => {
      const cat = t.category || 'Other';
      if (!categoryGroups[cat]) categoryGroups[cat] = [];
      categoryGroups[cat].push(Math.abs(t.amount));
    });

    Object.entries(categoryGroups).forEach(([cat, amounts]) => {
      this.baselines[cat] = {
        mean: mean(amounts),
        stdDev: stdDev(amounts),
        q1: amounts.sort((a, b) => a - b)[Math.floor(amounts.length * 0.25)],
        q3: amounts.sort((a, b) => a - b)[Math.floor(amounts.length * 0.75)],
        min: Math.min(...amounts),
        max: Math.max(...amounts),
        count: amounts.length,
        median: amounts[Math.floor(amounts.length / 2)],
      };
      const iqr = this.baselines[cat].q3 - this.baselines[cat].q1;
      this.baselines[cat].lowerFence = this.baselines[cat].q1 - 1.5 * iqr;
      this.baselines[cat].upperFence = this.baselines[cat].q3 + 1.5 * iqr;
    });

    // Velocity baseline (spending rate)
    const dailyTotals = {};
    transactions.forEach(t => {
      const dateKey = new Date(t.date).toISOString().split('T')[0];
      dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + Math.abs(t.amount);
    });
    const dailyAmounts = Object.values(dailyTotals);
    this.velocityBaseline = {
      mean: mean(dailyAmounts),
      stdDev: stdDev(dailyAmounts),
      p95: dailyAmounts.sort((a, b) => a - b)[Math.floor(dailyAmounts.length * 0.95)],
    };

    // Time-of-day baseline
    const hourBuckets = Array(24).fill(null).map(() => []);
    transactions.forEach(t => {
      const hour = new Date(t.date).getHours();
      hourBuckets[hour].push(Math.abs(t.amount));
    });
    this.timeBaseline = hourBuckets.map(bucket => ({
      mean: mean(bucket),
      stdDev: stdDev(bucket),
      count: bucket.length,
    }));

    // Simple isolation forest approximation
    this.isolationForest = this._buildIsolationForest(transactions);

    this.trained = true;
    return {
      success: true,
      categoriesBaselined: Object.keys(this.baselines).length,
      transactionsAnalyzed: transactions.length,
    };
  }

  _buildIsolationForest(transactions) {
    const features = transactions.map(t => [
      Math.abs(t.amount),
      new Date(t.date).getHours(),
      new Date(t.date).getDay(),
      this._getCategoryFrequency(t.category, transactions),
    ]);

    // Build random split trees
    const trees = [];
    for (let i = 0; i < 10; i++) {
      trees.push(this._buildTree(features, 0, 10));
    }
    return trees;
  }

  _buildTree(data, depth, maxDepth) {
    if (depth >= maxDepth || data.length <= 2) {
      return { leaf: true, size: data.length, depth };
    }

    const featureIdx = Math.floor(Math.random() * data[0].length);
    const values = data.map(d => d[featureIdx]);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const splitVal = minVal + Math.random() * (maxVal - minVal);

    const left = data.filter(d => d[featureIdx] < splitVal);
    const right = data.filter(d => d[featureIdx] >= splitVal);

    return {
      featureIdx,
      splitVal,
      left: this._buildTree(left, depth + 1, maxDepth),
      right: this._buildTree(right, depth + 1, maxDepth),
    };
  }

  _getIsolationScore(point, tree) {
    if (tree.leaf) return tree.depth;
    if (point[tree.featureIdx] < tree.splitVal) {
      return this._getIsolationScore(point, tree.left);
    }
    return this._getIsolationScore(point, tree.right);
  }

  _getCategoryFrequency(category, transactions) {
    const catCount = transactions.filter(t => t.category === category).length;
    return catCount / transactions.length;
  }

  detect(transaction) {
    if (!this.trained) return { isAnomaly: false, score: 0, reasons: [] };

    const reasons = [];
    let anomalyScore = 0;
    const amount = Math.abs(transaction.amount);
    const category = transaction.category || 'Other';

    // Amount-based anomaly
    if (this.baselines[category]) {
      const baseline = this.baselines[category];
      if (amount > baseline.upperFence) {
        const severity = (amount - baseline.upperFence) / (baseline.stdDev || 1);
        anomalyScore += Math.min(severity * 0.3, 0.5);
        reasons.push({
          type: 'amount_outlier',
          message: `Amount ₹${amount.toLocaleString()} is unusually high for ${category} (avg: ₹${Math.round(baseline.mean).toLocaleString()})`,
          severity: severity > 3 ? 'high' : severity > 2 ? 'medium' : 'low',
          expected: Math.round(baseline.mean),
          actual: Math.round(amount),
        });
      }
    }

    // Velocity anomaly
    if (this.velocityBaseline.stdDev > 0) {
      const velocityZ = (amount - this.velocityBaseline.mean) / this.velocityBaseline.stdDev;
      if (velocityZ > 2.5) {
        anomalyScore += Math.min(velocityZ * 0.2, 0.3);
        reasons.push({
          type: 'velocity_spike',
          message: `Spending velocity is ${velocityZ.toFixed(1)} standard deviations above normal`,
          severity: velocityZ > 3 ? 'high' : 'medium',
        });
      }
    }

    // Time-based anomaly
    const hour = new Date(transaction.date).getHours();
    if (this.timeBaseline[hour] && this.timeBaseline[hour].count < 3 && amount > 1000) {
      anomalyScore += 0.15;
      reasons.push({
        type: 'unusual_time',
        message: `Transaction at ${hour}:00 is unusual — very few transactions at this hour`,
        severity: 'low',
      });
    }

    // Isolation forest score
    if (this.isolationForest) {
      const point = [amount, hour, new Date(transaction.date).getDay(), 0.1];
      const avgDepth = mean(this.isolationForest.map(tree => this._getIsolationScore(point, tree)));
      const normalizedScore = 1 - avgDepth / 10;
      if (normalizedScore > 0.6) {
        anomalyScore += normalizedScore * 0.2;
        reasons.push({
          type: 'isolation_anomaly',
          message: 'Transaction pattern differs significantly from typical behavior',
          severity: normalizedScore > 0.8 ? 'high' : 'medium',
          score: normalizedScore,
        });
      }
    }

    return {
      isAnomaly: anomalyScore > 0.35,
      score: Math.round(anomalyScore * 100),
      severity: anomalyScore > 0.7 ? 'critical' : anomalyScore > 0.5 ? 'high' : anomalyScore > 0.35 ? 'medium' : 'low',
      reasons,
      recommendation: this._getRecommendation(reasons),
    };
  }

  detectBatch(transactions) {
    return transactions.map(t => ({
      transaction: { id: t._id, amount: t.amount, category: t.category, date: t.date },
      ...this.detect(t),
    })).filter(r => r.isAnomaly);
  }

  _getRecommendation(reasons) {
    if (!reasons.length) return null;
    const highSeverity = reasons.filter(r => r.severity === 'high' || r.severity === 'critical');
    if (highSeverity.length > 0) {
      return 'Review this transaction immediately — it significantly deviates from your normal spending pattern.';
    }
    return 'This transaction is slightly unusual. Consider categorizing it and verifying the amount.';
  }

  serialize() {
    return {
      baselines: this.baselines,
      velocityBaseline: this.velocityBaseline,
      timeBaseline: this.timeBaseline,
      trained: this.trained,
    };
  }

  deserialize(data) {
    if (!data) return;
    Object.assign(this, data);
  }
}

// ============================================================================
// §5  BEHAVIORAL ANALYZER — User Financial Behavior Profiling
// ============================================================================

class BehavioralAnalyzer {
  constructor() {
    this.profile = null;
    this.patterns = {};
    this.riskProfile = null;
  }

  analyze(transactions, budgets = [], goals = [], debts = []) {
    if (transactions.length < 10) return { profile: 'insufficient_data' };

    const expenses = transactions.filter(t => t.type === 'expense' || t.amount < 0);
    const incomes = transactions.filter(t => t.type === 'income' || t.amount > 0);

    // Spending behavior analysis
    const monthlyExpense = this._getMonthlyAggregates(expenses);
    const monthlyIncome = this._getMonthlyAggregates(incomes);

    // Calculate saving rate
    const totalIncome = sum(incomes.map(t => Math.abs(t.amount)));
    const totalExpense = sum(expenses.map(t => Math.abs(t.amount)));
    const savingRate = totalIncome > 0 ? (totalIncome - totalExpense) / totalIncome : 0;

    // Impulse spending detection
    const weekendSpend = expenses.filter(t => {
      const day = new Date(t.date).getDay();
      return day === 0 || day === 6;
    });
    const weekdaySpend = expenses.filter(t => {
      const day = new Date(t.date).getDay();
      return day > 0 && day < 6;
    });
    const weekendAvg = mean(weekendSpend.map(t => Math.abs(t.amount)));
    const weekdayAvg = mean(weekdaySpend.map(t => Math.abs(t.amount)));
    const impulseScore = weekendAvg > weekdayAvg * 1.3 ? 
      clamp((weekendAvg / weekdayAvg - 1) * 50, 0, 100) : 0;

    // Budget adherence
    const budgetAdherence = this._calculateBudgetAdherence(expenses, budgets);

    // Goal progress
    const goalProgress = goals.map(g => ({
      name: g.name,
      target: g.targetAmount,
      current: g.currentAmount || 0,
      progress: g.targetAmount > 0 ? (g.currentAmount || 0) / g.targetAmount : 0,
      onTrack: this._isGoalOnTrack(g),
    }));

    // Debt health
    const totalDebt = sum(debts.map(d => d.currentBalance || d.balance || 0));
    const monthlyDebtPayment = sum(debts.map(d => d.monthlyPayment || d.emi || 0));
    const dti = monthlyIncome.length > 0 ? monthlyDebtPayment / mean(monthlyIncome) : 0;

    // Spending consistency (lower is better)
    const spendingVariability = monthlyExpense.length > 1 ? 
      stdDev(monthlyExpense) / mean(monthlyExpense) : 0;

    // Category diversification
    const categorySpend = {};
    expenses.forEach(t => {
      const cat = t.category || 'Other';
      categorySpend[cat] = (categorySpend[cat] || 0) + Math.abs(t.amount);
    });
    const categoryShares = Object.values(categorySpend).map(v => v / totalExpense);
    const herfindahl = sum(categoryShares.map(s => s ** 2)); // Lower = more diversified

    // Build profile
    this.profile = {
      type: this._classifySpender(savingRate, impulseScore, spendingVariability),
      savingRate: Math.round(savingRate * 100),
      impulseScore: Math.round(impulseScore),
      budgetAdherence: Math.round(budgetAdherence * 100),
      spendingVariability: Math.round(spendingVariability * 100),
      debtToIncome: Math.round(dti * 100),
      categoryDiversification: Math.round((1 - herfindahl) * 100),
      totalDebt,
      monthlyIncome: mean(monthlyIncome),
      monthlyExpense: mean(monthlyExpense),
      goalProgress,
      topCategories: Object.entries(categorySpend)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([cat, amount]) => ({
          category: cat,
          amount: Math.round(amount),
          percentage: Math.round((amount / totalExpense) * 100),
        })),
      trends: {
        spending: this._getTrendDirection(monthlyExpense),
        income: this._getTrendDirection(monthlyIncome),
        savings: this._getTrendDirection(monthlyExpense.map((e, i) => (monthlyIncome[i] || 0) - e)),
      },
      riskFactors: this._identifyRiskFactors(savingRate, dti, budgetAdherence, debts),
      strengths: this._identifyStrengths(savingRate, budgetAdherence, goalProgress),
    };

    this.riskProfile = this._assessRisk(this.profile);

    return {
      profile: this.profile,
      riskProfile: this.riskProfile,
      recommendations: this._generateRecommendations(this.profile),
    };
  }

  _getMonthlyAggregates(transactions) {
    const monthly = {};
    transactions.forEach(t => {
      const key = new Date(t.date).toISOString().slice(0, 7);
      monthly[key] = (monthly[key] || 0) + Math.abs(t.amount);
    });
    return Object.values(monthly);
  }

  _calculateBudgetAdherence(expenses, budgets) {
    if (!budgets.length) return 0.5;
    const categorySpend = {};
    expenses.forEach(t => {
      const cat = t.category || 'Other';
      categorySpend[cat] = (categorySpend[cat] || 0) + Math.abs(t.amount);
    });
    let adherent = 0;
    budgets.forEach(b => {
      const spent = categorySpend[b.category] || 0;
      if (spent <= (b.limit || b.amount || Infinity)) adherent++;
    });
    return adherent / budgets.length;
  }

  _isGoalOnTrack(goal) {
    if (!goal.deadline) return true;
    const remaining = new Date(goal.deadline) - new Date();
    const monthsLeft = remaining / (30 * DAY);
    if (monthsLeft <= 0) return (goal.currentAmount || 0) >= goal.targetAmount;
    const needed = goal.targetAmount - (goal.currentAmount || 0);
    const monthlyNeeded = needed / monthsLeft;
    return monthlyNeeded < (goal.monthlyContribution || needed / 12);
  }

  _classifySpender(savingRate, impulseScore, variability) {
    if (savingRate > 0.3 && impulseScore < 20) return 'disciplined_saver';
    if (savingRate > 0.2 && impulseScore < 30) return 'moderate_saver';
    if (savingRate < 0.05 && impulseScore > 50) return 'impulse_spender';
    if (variability > 0.5) return 'irregular_spender';
    if (savingRate < 0.1) return 'high_spender';
    return 'balanced_spender';
  }

  _getTrendDirection(values) {
    if (values.length < 3) return 'stable';
    const recent = mean(values.slice(-3));
    const earlier = mean(values.slice(0, 3));
    const change = earlier ? (recent - earlier) / earlier : 0;
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  _identifyRiskFactors(savingRate, dti, budgetAdherence, debts) {
    const risks = [];
    if (savingRate < 0.1) risks.push({ factor: 'Low savings rate', severity: 'high', detail: `Only ${Math.round(savingRate * 100)}% of income is being saved` });
    if (dti > 0.4) risks.push({ factor: 'High debt-to-income ratio', severity: 'critical', detail: `DTI of ${Math.round(dti * 100)}% exceeds safe threshold of 40%` });
    if (budgetAdherence < 0.5) risks.push({ factor: 'Poor budget adherence', severity: 'medium', detail: 'More than half of budgets are being exceeded' });
    if (debts.some(d => d.status === 'overdue' || d.daysOverdue > 0)) {
      risks.push({ factor: 'Overdue debt payments', severity: 'critical', detail: 'One or more debt payments are overdue' });
    }
    return risks;
  }

  _identifyStrengths(savingRate, budgetAdherence, goalProgress) {
    const strengths = [];
    if (savingRate > 0.2) strengths.push('Strong saving habit');
    if (budgetAdherence > 0.8) strengths.push('Excellent budget discipline');
    const goalsOnTrack = goalProgress.filter(g => g.progress > 0.5);
    if (goalsOnTrack.length > 0) strengths.push(`${goalsOnTrack.length} financial goals on track`);
    return strengths;
  }

  _assessRisk(profile) {
    let score = 50;
    if (profile.savingRate > 20) score += 10;
    if (profile.savingRate > 30) score += 10;
    if (profile.debtToIncome < 20) score += 10;
    if (profile.budgetAdherence > 80) score += 10;
    if (profile.impulseScore < 20) score += 5;
    if (profile.debtToIncome > 40) score -= 20;
    if (profile.savingRate < 10) score -= 15;
    if (profile.impulseScore > 50) score -= 10;
    
    return {
      score: clamp(score, 0, 100),
      level: score >= 80 ? 'conservative' : score >= 60 ? 'moderate' : score >= 40 ? 'aggressive' : 'high_risk',
      description: score >= 80 ? 'Your financial behavior is conservative and well-managed' :
                   score >= 60 ? 'You have moderate financial risk with room for improvement' :
                   score >= 40 ? 'Your spending patterns suggest higher than average risk' :
                   'Immediate attention needed to improve financial stability',
    };
  }

  _generateRecommendations(profile) {
    const recommendations = [];

    if (profile.savingRate < 20) {
      recommendations.push({
        category: 'savings',
        priority: 'high',
        title: 'Increase Your Savings Rate',
        description: `Your current savings rate is ${profile.savingRate}%. Aim for at least 20% by reducing spending in your top categories.`,
        potentialImpact: `Could save additional ₹${Math.round(profile.monthlyExpense * 0.1).toLocaleString()} per month`,
        actionItems: [
          `Review ${profile.topCategories[0]?.category || 'top'} spending for reduction opportunities`,
          'Set up automatic transfers to savings on salary day',
          'Create specific monthly savings targets',
        ],
      });
    }

    if (profile.debtToIncome > 30) {
      recommendations.push({
        category: 'debt',
        priority: 'critical',
        title: 'Reduce Debt Burden',
        description: `Your debt-to-income ratio is ${profile.debtToIncome}%. High DTI limits financial flexibility and increases risk.`,
        potentialImpact: 'Reducing DTI below 30% improves loan eligibility and financial security',
        actionItems: [
          'Focus on paying off high-interest debt first (avalanche method)',
          'Consider consolidating multiple loans for lower rates',
          'Avoid taking on new debt until DTI drops below 30%',
        ],
      });
    }

    if (profile.impulseScore > 30) {
      recommendations.push({
        category: 'behavior',
        priority: 'medium',
        title: 'Control Impulse Spending',
        description: `Weekend spending is significantly higher than weekday spending, indicating impulse purchases.`,
        potentialImpact: `Potential savings of ₹${Math.round(profile.monthlyExpense * 0.05).toLocaleString()} per month`,
        actionItems: [
          'Wait 24 hours before making purchases over ₹2,000',
          'Set a weekly discretionary spending limit',
          'Track daily spending to build awareness',
        ],
      });
    }

    if (profile.budgetAdherence < 70) {
      recommendations.push({
        category: 'budgeting',
        priority: 'high',
        title: 'Improve Budget Compliance',
        description: `You're exceeding budgets in ${100 - profile.budgetAdherence}% of categories. Consider adjusting budgets or spending.`,
        actionItems: [
          'Set realistic budgets based on 3-month spending averages',
          'Enable budget alerts at 75% usage',
          'Review and adjust budgets monthly',
        ],
      });
    }

    if (profile.trends.spending === 'increasing') {
      recommendations.push({
        category: 'trend',
        priority: 'medium',
        title: 'Spending Trend Alert',
        description: 'Your spending has been trending upward. Without correction, this could impact savings goals.',
        actionItems: [
          'Identify categories with the highest growth',
          'Set spending caps for discretionary categories',
          'Review subscriptions and recurring charges',
        ],
      });
    }

    // Investment recommendations
    if (profile.savingRate > 15 && profile.categoryDiversification < 50) {
      recommendations.push({
        category: 'investment',
        priority: 'medium',
        title: 'Diversify Your Investments',
        description: 'Your savings rate is good but investment allocation may need diversification.',
        actionItems: [
          'Consider SIP in index funds for long-term wealth building',
          'Maintain 6 months of emergency fund before aggressive investing',
          'Review asset allocation quarterly',
        ],
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
    });
  }
}

// ============================================================================
// §6  SMART CATEGORIZER — AI Auto-Categorization with Self-Learning
// ============================================================================

class SmartCategorizer {
  constructor() {
    this.categories = [
      'Food', 'Transport', 'Shopping', 'Bills', 'Entertainment',
      'Healthcare', 'Education', 'Rent', 'Groceries', 'Fuel',
      'Travel', 'Subscriptions', 'Insurance', 'Investment', 'Salary',
      'Freelance', 'Gift', 'Recharge', 'EMI', 'Other',
    ];

    // Indian merchant keyword mappings
    this.keywordMap = {
      Food: ['swiggy', 'zomato', 'uber eats', 'dominos', 'pizza hut', 'mcdonalds', 'kfc', 'restaurant', 'café', 'cafe', 'dhaba', 'biryani', 'dosa', 'idli', 'thali', 'food', 'dining', 'eatery', 'bakery', 'starbucks', 'ccd', 'chaayos', 'haldirams', 'barbeque nation', 'burger king'],
      Transport: ['uber', 'ola', 'rapido', 'metro', 'irctc', 'redbus', 'bus', 'auto', 'cab', 'taxi', 'toll', 'parking', 'petrol', 'diesel', 'fuel', 'blablacar', 'railway', 'flybus'],
      Shopping: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'tata cliq', 'snapdeal', 'shoppers stop', 'lifestyle', 'westside', 'max fashion', 'h&m', 'zara', 'uniqlo', 'decathlon', 'croma', 'reliance digital'],
      Bills: ['electricity', 'water', 'gas', 'broadband', 'internet', 'wifi', 'jio', 'airtel', 'vi', 'bsnl', 'act fibernet', 'tata sky', 'dish tv', 'd2h', 'maintenance', 'society', 'municipal'],
      Entertainment: ['netflix', 'amazon prime', 'hotstar', 'disney', 'spotify', 'youtube', 'apple music', 'gaana', 'jiocinema', 'zee5', 'sony liv', 'pvr', 'inox', 'cinepolis', 'movie', 'cinema', 'gaming', 'xbox', 'playstation', 'steam'],
      Healthcare: ['doctor', 'hospital', 'clinic', 'pharmacy', 'medicine', 'apollo', 'max hospital', 'fortis', 'medplus', 'netmeds', 'pharmeasy', '1mg', 'practo', 'lab test', 'diagnostic', 'dental', 'eye', 'optic'],
      Education: ['school', 'college', 'university', 'course', 'udemy', 'coursera', 'unacademy', 'byjus', 'vedantu', 'toppr', 'book', 'tuition', 'coaching', 'exam', 'certification', 'upgrad'],
      Rent: ['rent', 'lease', 'housing', 'accommodation', 'pg', 'hostel', 'flat rent', 'house rent'],
      Groceries: ['bigbasket', 'grofers', 'blinkit', 'zepto', 'dunzo', 'jiomart', 'dmart', 'more', 'reliance fresh', 'star bazaar', 'spencer', 'nature basket', 'grocery', 'vegetables', 'fruits', 'milk', 'dairy'],
      Fuel: ['petrol', 'diesel', 'cng', 'hp', 'bharat petroleum', 'indian oil', 'shell', 'fuel station', 'ev charging'],
      Travel: ['makemytrip', 'goibibo', 'cleartrip', 'yatra', 'airbnb', 'oyo', 'hotel', 'flight', 'air india', 'indigo', 'spicejet', 'vistara', 'akasa', 'booking.com', 'agoda', 'hostel', 'resort'],
      Subscriptions: ['subscription', 'membership', 'annual', 'monthly plan', 'premium', 'pro plan'],
      Insurance: ['insurance', 'lic', 'hdfc ergo', 'icici lombard', 'star health', 'max bupa', 'policy', 'premium', 'claim'],
      Investment: ['mutual fund', 'sip', 'stock', 'share', 'demat', 'zerodha', 'groww', 'upstox', 'angel one', 'kite', 'nse', 'bse', 'gold', 'fixed deposit', 'fd', 'rd', 'ppf', 'nps', 'etf'],
      Salary: ['salary', 'payroll', 'wages', 'stipend', 'compensation'],
      Freelance: ['freelance', 'consulting', 'project payment', 'gig', 'contract'],
      Gift: ['gift', 'donation', 'charity', 'wedding', 'birthday', 'festival'],
      Recharge: ['recharge', 'prepaid', 'postpaid', 'mobile bill', 'data pack'],
      EMI: ['emi', 'loan', 'installment', 'equated monthly'],
    };

    // Naive Bayes model
    this.wordCounts = {};
    this.categoryCounts = {};
    this.totalDocs = 0;
    this.trained = false;
  }

  train(transactions) {
    if (transactions.length < 10) return { success: false, reason: 'insufficient_data' };

    this.wordCounts = {};
    this.categoryCounts = {};
    this.totalDocs = 0;

    const labeled = transactions.filter(t => t.category && t.category !== 'Other');
    labeled.forEach(t => {
      const category = t.category;
      const words = this._tokenize(t.description || t.merchant || '');

      if (!this.categoryCounts[category]) this.categoryCounts[category] = 0;
      this.categoryCounts[category]++;
      this.totalDocs++;

      words.forEach(word => {
        if (!this.wordCounts[word]) this.wordCounts[word] = {};
        if (!this.wordCounts[word][category]) this.wordCounts[word][category] = 0;
        this.wordCounts[word][category]++;
      });
    });

    this.trained = true;
    return {
      success: true,
      documentsUsed: labeled.length,
      vocabularySize: Object.keys(this.wordCounts).length,
      categories: Object.keys(this.categoryCounts).length,
    };
  }

  _tokenize(text) {
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
  }

  categorize(description, amount = 0) {
    const text = (description || '').toLowerCase();

    // First try keyword matching (fast path)
    for (const [category, keywords] of Object.entries(this.keywordMap)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return {
            category,
            confidence: 85,
            method: 'keyword',
            alternatives: this._getAlternatives(text, category),
          };
        }
      }
    }

    // Naive Bayes classification
    if (this.trained) {
      const words = this._tokenize(text);
      const scores = {};

      Object.keys(this.categoryCounts).forEach(cat => {
        const prior = Math.log((this.categoryCounts[cat] + 1) / (this.totalDocs + Object.keys(this.categoryCounts).length));
        let logLikelihood = prior;

        words.forEach(word => {
          const wordInCat = this.wordCounts[word]?.[cat] || 0;
          const totalInCat = this.categoryCounts[cat] || 1;
          logLikelihood += Math.log((wordInCat + 1) / (totalInCat + Object.keys(this.wordCounts).length));
        });

        scores[cat] = logLikelihood;
      });

      const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
      if (sorted.length > 0) {
        const maxScore = sorted[0][1];
        const confidence = Math.round(clamp(
          (maxScore - (sorted[1]?.[1] || maxScore - 5)) * 10 + 50, 30, 95
        ));

        return {
          category: sorted[0][0],
          confidence,
          method: 'naive_bayes',
          alternatives: sorted.slice(1, 4).map(([cat, score]) => ({
            category: cat,
            confidence: Math.round(clamp((score - sorted[sorted.length - 1][1]) / (maxScore - sorted[sorted.length - 1][1]) * 100, 10, 90)),
          })),
        };
      }
    }

    // Amount-based heuristic fallback
    if (amount > 50000) return { category: 'Investment', confidence: 30, method: 'heuristic' };
    if (amount > 20000) return { category: 'Rent', confidence: 25, method: 'heuristic' };
    if (amount > 10000) return { category: 'EMI', confidence: 20, method: 'heuristic' };

    return { category: 'Other', confidence: 10, method: 'fallback' };
  }

  _getAlternatives(text, primaryCategory) {
    const alts = [];
    for (const [category, keywords] of Object.entries(this.keywordMap)) {
      if (category === primaryCategory) continue;
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          alts.push({ category, confidence: 60 });
          break;
        }
      }
    }
    return alts.slice(0, 3);
  }

  serialize() {
    return {
      wordCounts: this.wordCounts,
      categoryCounts: this.categoryCounts,
      totalDocs: this.totalDocs,
      trained: this.trained,
    };
  }

  deserialize(data) {
    if (!data) return;
    Object.assign(this, data);
  }
}

// ============================================================================
// §7  GOAL ADVISOR — AI-Powered Financial Goal Optimization
// ============================================================================

class GoalAdvisor {
  analyze(goals, transactions, monthlyIncome) {
    if (!goals.length) return { goals: [], recommendations: [] };

    const monthlyExpense = this._getMonthlyExpenseAvg(transactions);
    const monthlySavings = monthlyIncome - monthlyExpense;

    const analyzed = goals.map(goal => {
      const remaining = goal.targetAmount - (goal.currentAmount || 0);
      const deadline = goal.deadline ? new Date(goal.deadline) : null;
      const monthsLeft = deadline ? Math.max(1, (deadline - new Date()) / (30 * DAY)) : 120;
      const requiredMonthly = remaining / monthsLeft;
      const feasibility = monthlySavings > 0 ? clamp(monthlySavings / requiredMonthly, 0, 2) : 0;

      // Calculate optimal strategy
      const strategies = this._generateStrategies(goal, remaining, monthsLeft, monthlySavings, monthlyIncome);

      return {
        goalId: goal._id,
        name: goal.name,
        category: goal.category || 'general',
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount || 0,
        remaining,
        progress: Math.round(((goal.currentAmount || 0) / goal.targetAmount) * 100),
        monthsLeft: Math.round(monthsLeft),
        requiredMonthly: Math.round(requiredMonthly),
        feasibility: Math.round(feasibility * 100),
        status: feasibility > 1 ? 'on_track' : feasibility > 0.5 ? 'at_risk' : 'behind',
        strategies,
        milestones: this._generateMilestones(goal, remaining, monthsLeft),
      };
    });

    return {
      goals: analyzed,
      summary: {
        totalGoals: goals.length,
        onTrack: analyzed.filter(g => g.status === 'on_track').length,
        atRisk: analyzed.filter(g => g.status === 'at_risk').length,
        behind: analyzed.filter(g => g.status === 'behind').length,
        totalTarget: sum(goals.map(g => g.targetAmount)),
        totalSaved: sum(goals.map(g => g.currentAmount || 0)),
        overallProgress: Math.round(sum(goals.map(g => g.currentAmount || 0)) / sum(goals.map(g => g.targetAmount)) * 100) || 0,
      },
      recommendations: this._generateGoalRecommendations(analyzed, monthlySavings),
    };
  }

  _getMonthlyExpenseAvg(transactions) {
    const expenses = transactions.filter(t => t.type === 'expense' || t.amount < 0);
    const monthly = {};
    expenses.forEach(t => {
      const key = new Date(t.date).toISOString().slice(0, 7);
      monthly[key] = (monthly[key] || 0) + Math.abs(t.amount);
    });
    const values = Object.values(monthly);
    return values.length ? mean(values) : 0;
  }

  _generateStrategies(goal, remaining, monthsLeft, monthlySavings, monthlyIncome) {
    const strategies = [];

    // Strategy 1: Fixed monthly savings
    strategies.push({
      name: 'Fixed Monthly Savings',
      description: `Save ₹${Math.round(remaining / monthsLeft).toLocaleString()} every month`,
      monthlyAmount: Math.round(remaining / monthsLeft),
      percentageOfIncome: Math.round((remaining / monthsLeft) / monthlyIncome * 100),
      feasible: remaining / monthsLeft < monthlySavings * 0.7,
    });

    // Strategy 2: SIP with returns
    const sipReturn = 0.12; // 12% annual
    const monthlyRate = sipReturn / 12;
    const sipAmount = remaining * monthlyRate / (Math.pow(1 + monthlyRate, monthsLeft) - 1);
    strategies.push({
      name: 'SIP Investment Strategy',
      description: `Invest ₹${Math.round(sipAmount).toLocaleString()}/month in equity mutual funds (12% expected return)`,
      monthlyAmount: Math.round(sipAmount),
      percentageOfIncome: Math.round(sipAmount / monthlyIncome * 100),
      expectedReturn: '12%',
      feasible: sipAmount < monthlySavings * 0.6,
    });

    // Strategy 3: Accelerated plan (increase savings by reducing expenses)
    const topExpenseReduction = monthlyIncome * 0.05; // 5% income reduction target
    const acceleratedMonths = remaining / (remaining / monthsLeft + topExpenseReduction);
    strategies.push({
      name: 'Accelerated Savings Plan',
      description: `Cut expenses by 5% (₹${Math.round(topExpenseReduction).toLocaleString()}) to achieve goal ${Math.round(monthsLeft - acceleratedMonths)} months faster`,
      monthlyAmount: Math.round(remaining / monthsLeft + topExpenseReduction),
      monthsSaved: Math.round(monthsLeft - acceleratedMonths),
      feasible: true,
    });

    return strategies;
  }

  _generateMilestones(goal, remaining, monthsLeft) {
    const milestones = [];
    const target = goal.targetAmount;
    const current = goal.currentAmount || 0;
    const percentages = [25, 50, 75, 90, 100];

    percentages.forEach(pct => {
      const amount = target * (pct / 100);
      if (amount > current) {
        const monthsToReach = ((amount - current) / remaining) * monthsLeft;
        const date = new Date();
        date.setMonth(date.getMonth() + Math.round(monthsToReach));
        milestones.push({
          percentage: pct,
          amount: Math.round(amount),
          estimatedDate: date.toISOString().split('T')[0],
          monthsAway: Math.round(monthsToReach),
        });
      }
    });

    return milestones;
  }

  _generateGoalRecommendations(analyzedGoals, monthlySavings) {
    const recs = [];

    const behind = analyzedGoals.filter(g => g.status === 'behind');
    if (behind.length > 0) {
      recs.push({
        priority: 'high',
        title: `${behind.length} Goal(s) Falling Behind`,
        description: `Goals like "${behind[0].name}" need attention. Consider reallocating funds or extending deadlines.`,
        actions: behind.map(g => `Increase ${g.name} monthly savings to ₹${g.requiredMonthly.toLocaleString()}`),
      });
    }

    const overAllocated = sum(analyzedGoals.map(g => g.requiredMonthly));
    if (overAllocated > monthlySavings) {
      recs.push({
        priority: 'critical',
        title: 'Goal Funding Exceeds Available Savings',
        description: `All goals combined need ₹${Math.round(overAllocated).toLocaleString()}/month but you save only ₹${Math.round(monthlySavings).toLocaleString()}/month.`,
        actions: [
          'Prioritize goals by urgency and importance',
          'Extend deadlines for lower-priority goals',
          'Look for additional income sources',
        ],
      });
    }

    return recs;
  }
}

// ============================================================================
// §8  SMART INSIGHTS GENERATOR — NL Financial Insights
// ============================================================================

class InsightsGenerator {
  generate(transactions, budgets = [], goals = [], healthScore = null) {
    const insights = [];
    const expenses = transactions.filter(t => t.type === 'expense' || t.amount < 0);
    const incomes = transactions.filter(t => t.type === 'income' || t.amount > 0);

    // Monthly comparison insights
    const thisMonth = expenses.filter(t => {
      const d = new Date(t.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const lastMonth = expenses.filter(t => {
      const d = new Date(t.date);
      const now = new Date();
      const lm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      return d.getMonth() === lm;
    });

    const thisMonthTotal = sum(thisMonth.map(t => Math.abs(t.amount)));
    const lastMonthTotal = sum(lastMonth.map(t => Math.abs(t.amount)));

    if (lastMonthTotal > 0) {
      const change = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
      insights.push({
        type: change > 0 ? 'warning' : 'positive',
        category: 'spending',
        title: change > 0 ? 'Spending Increased' : 'Spending Decreased',
        message: `Your spending this month is ${Math.abs(Math.round(change))}% ${change > 0 ? 'higher' : 'lower'} than last month (₹${Math.round(thisMonthTotal).toLocaleString()} vs ₹${Math.round(lastMonthTotal).toLocaleString()}).`,
        impact: change > 10 ? 'high' : 'medium',
        icon: change > 0 ? 'trending-up' : 'trending-down',
      });
    }

    // Category insights
    const categorySpend = {};
    thisMonth.forEach(t => {
      const cat = t.category || 'Other';
      categorySpend[cat] = (categorySpend[cat] || 0) + Math.abs(t.amount);
    });
    const topCat = Object.entries(categorySpend).sort(([, a], [, b]) => b - a)[0];
    if (topCat) {
      const pct = Math.round((topCat[1] / thisMonthTotal) * 100);
      insights.push({
        type: pct > 40 ? 'warning' : 'info',
        category: 'category',
        title: `${topCat[0]} is Your Biggest Expense`,
        message: `You've spent ₹${Math.round(topCat[1]).toLocaleString()} on ${topCat[0]} this month — ${pct}% of total expenses.`,
        impact: pct > 40 ? 'high' : 'low',
      });
    }

    // Income insights
    const thisMonthIncome = sum(incomes.filter(t => {
      const d = new Date(t.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).map(t => Math.abs(t.amount)));

    if (thisMonthIncome > 0 && thisMonthTotal > 0) {
      const savingRate = ((thisMonthIncome - thisMonthTotal) / thisMonthIncome) * 100;
      insights.push({
        type: savingRate > 20 ? 'positive' : savingRate > 0 ? 'warning' : 'critical',
        category: 'savings',
        title: savingRate > 0 ? `Saving ${Math.round(savingRate)}% This Month` : 'Overspending Alert',
        message: savingRate > 20 ? 
          `Great job! You're saving ₹${Math.round(thisMonthIncome - thisMonthTotal).toLocaleString()} this month.` :
          savingRate > 0 ? 
          `You're saving only ₹${Math.round(thisMonthIncome - thisMonthTotal).toLocaleString()} this month. Try to reach 20%.` :
          `You're spending more than you earn! Reduce expenses by ₹${Math.round(thisMonthTotal - thisMonthIncome).toLocaleString()}.`,
        impact: savingRate < 10 ? 'high' : 'medium',
      });
    }

    // Budget alerts
    budgets.forEach(budget => {
      const spent = categorySpend[budget.category] || 0;
      const limit = budget.limit || budget.amount || 0;
      if (limit > 0) {
        const usage = (spent / limit) * 100;
        if (usage > 90) {
          insights.push({
            type: 'critical',
            category: 'budget',
            title: `${budget.category} Budget Nearly Exhausted`,
            message: `You've used ${Math.round(usage)}% of your ₹${limit.toLocaleString()} ${budget.category} budget. Only ₹${Math.round(limit - spent).toLocaleString()} remaining.`,
            impact: 'high',
          });
        } else if (usage > 70) {
          insights.push({
            type: 'warning',
            category: 'budget',
            title: `${budget.category} Budget ${Math.round(usage)}% Used`,
            message: `You've spent ₹${Math.round(spent).toLocaleString()} of ₹${limit.toLocaleString()} budget. Pace your spending.`,
            impact: 'medium',
          });
        }
      }
    });

    // Health score insight
    if (healthScore) {
      const score = healthScore.overall || healthScore.score || 0;
      insights.push({
        type: score > 70 ? 'positive' : score > 50 ? 'warning' : 'critical',
        category: 'health',
        title: `Financial Health Score: ${score}/100`,
        message: score > 70 ? 'Your finances are in great shape! Keep up the discipline.' :
                 score > 50 ? 'Your financial health is fair. Focus on the improvement areas below.' :
                 'Your financial health needs immediate attention. Review your spending and debt.',
        impact: score < 50 ? 'high' : 'medium',
      });
    }

    // Day of week pattern
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const daySpend = Array(7).fill(0);
    const dayCounts = Array(7).fill(0);
    expenses.forEach(t => {
      const day = new Date(t.date).getDay();
      daySpend[day] += Math.abs(t.amount);
      dayCounts[day]++;
    });
    const dayAvg = daySpend.map((s, i) => dayCounts[i] > 0 ? s / dayCounts[i] : 0);
    const maxDay = dayAvg.indexOf(Math.max(...dayAvg));
    const minDay = dayAvg.indexOf(Math.min(...dayAvg.filter(d => d > 0)));

    insights.push({
      type: 'info',
      category: 'pattern',
      title: 'Spending Pattern Detected',
      message: `You spend the most on ${dayNames[maxDay]}s (avg ₹${Math.round(dayAvg[maxDay]).toLocaleString()}) and least on ${dayNames[minDay]}s (avg ₹${Math.round(dayAvg[minDay]).toLocaleString()}).`,
      impact: 'low',
    });

    // Recurring expense insight
    const recurring = expenses.filter(t => t.isRecurring);
    if (recurring.length > 0) {
      const recurringTotal = sum(recurring.map(t => Math.abs(t.amount)));
      insights.push({
        type: 'info',
        category: 'recurring',
        title: `₹${Math.round(recurringTotal).toLocaleString()} in Recurring Expenses`,
        message: `You have ${recurring.length} recurring transactions. Review these periodically to eliminate unnecessary subscriptions.`,
        impact: 'medium',
      });
    }

    return insights.sort((a, b) => {
      const impactOrder = { high: 0, medium: 1, low: 2 };
      return (impactOrder[a.impact] || 2) - (impactOrder[b.impact] || 2);
    });
  }
}

// ============================================================================
// §9  ENTERPRISE PREDICTION ENGINE — Main Orchestrator
// ============================================================================

const MODEL_DIR = path.join(__dirname, '..', 'data', 'models');

function _ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function _saveModel(userId, name, data) {
  try {
    _ensureDir(MODEL_DIR);
    fs.writeFileSync(path.join(MODEL_DIR, `${userId}_${name}.json`), JSON.stringify(data));
    return true;
  } catch (e) { logger.warn(`Save model ${name} failed:`, e.message); return false; }
}

function _loadModel(userId, name) {
  try {
    const p = path.join(MODEL_DIR, `${userId}_${name}.json`);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch { return null; }
}

class EnterprisePredictionEngine {
  constructor() {
    this.spendingPredictor = new SpendingPredictor();
    this.anomalyDetector = new AnomalyDetector();
    this.behavioralAnalyzer = new BehavioralAnalyzer();
    this.categorizer = new SmartCategorizer();
    this.goalAdvisor = new GoalAdvisor();
    this.insightsGenerator = new InsightsGenerator();
    this.ensemble = new EnsemblePredictor();
    this.trainedUsers = new Set();
  }

  async trainForUser(userId) {
    try {
      const Transaction = model('Transaction');
      const Budget = model('Budget');
      const FinancialGoal = model('FinancialGoal');
      const Debt = model('Debt');

      if (!Transaction) return { success: false, error: 'Transaction model not available' };

      const transactions = await Transaction.find({ userId, date: { $gte: ago(365) } }).sort({ date: 1 }).lean();
      if (transactions.length < 10) return { success: false, reason: 'insufficient_data', count: transactions.length };

      const budgets = Budget ? await Budget.find({ userId }).lean() : [];
      const goals = FinancialGoal ? await FinancialGoal.find({ userId }).lean() : [];
      const debts = Debt ? await Debt.find({ userId }).lean() : [];

      // Train all sub-models
      const results = {};
      results.spending = this.spendingPredictor.train(transactions);
      results.anomaly = this.anomalyDetector.train(transactions);
      results.categorizer = this.categorizer.train(transactions);
      results.behavioral = this.behavioralAnalyzer.analyze(transactions, budgets, goals, debts);

      // Persist models
      _saveModel(userId, 'spending_predictor', this.spendingPredictor.serialize());
      _saveModel(userId, 'anomaly_detector', this.anomalyDetector.serialize());
      _saveModel(userId, 'categorizer', this.categorizer.serialize());

      this.trainedUsers.add(userId.toString());

      logger.info(`EnterprisePredictionEngine: Trained all models for user ${userId}`);
      return { success: true, results };
    } catch (error) {
      logger.error('Training failed:', error);
      return { success: false, error: error.message };
    }
  }

  async loadModels(userId) {
    const uid = userId.toString();
    if (this.trainedUsers.has(uid)) return true;

    const spending = _loadModel(uid, 'spending_predictor');
    const anomaly = _loadModel(uid, 'anomaly_detector');
    const categorizer = _loadModel(uid, 'categorizer');

    if (spending) this.spendingPredictor.deserialize(spending);
    if (anomaly) this.anomalyDetector.deserialize(anomaly);
    if (categorizer) this.categorizer.deserialize(categorizer);

    if (spending || anomaly || categorizer) {
      this.trainedUsers.add(uid);
      return true;
    }

    // Auto-train if no saved models exist
    return this.trainForUser(userId);
  }

  async getFullPredictionReport(userId) {
    await this.loadModels(userId);

    const Transaction = model('Transaction');
    const Budget = model('Budget');
    const FinancialGoal = model('FinancialGoal');
    const Debt = model('Debt');

    const transactions = Transaction ? await Transaction.find({ userId, date: { $gte: ago(365) } }).sort({ date: 1 }).lean() : [];
    const budgets = Budget ? await Budget.find({ userId }).lean() : [];
    const goals = FinancialGoal ? await FinancialGoal.find({ userId }).lean() : [];
    const debts = Debt ? await Debt.find({ userId }).lean() : [];

    const incomes = transactions.filter(t => t.type === 'income' || t.amount > 0);
    const monthlyIncome = mean(this._getMonthlyAggregates(incomes));

    return {
      predictions: {
        nextMonth: this.spendingPredictor.predictNextMonth(),
        cashflow: this.spendingPredictor.predictCashflow(6),
        byCategory: Object.keys(this.spendingPredictor.categoryModels).map(cat => 
          this.spendingPredictor.predictNextMonth(cat)
        ),
      },
      anomalies: this.anomalyDetector.detectBatch(transactions.slice(-50)),
      behavior: this.behavioralAnalyzer.analyze(transactions, budgets, goals, debts),
      goals: this.goalAdvisor.analyze(goals, transactions, monthlyIncome),
      insights: this.insightsGenerator.generate(transactions, budgets, goals),
      trainingStatus: {
        spendingModel: this.spendingPredictor.trained,
        anomalyModel: this.anomalyDetector.trained,
        categorizerModel: this.categorizer.trained,
        lastTrained: new Date().toISOString(),
      },
    };
  }

  async categorizeTransaction(userId, description, amount) {
    await this.loadModels(userId);
    return this.categorizer.categorize(description, amount);
  }

  async detectAnomaly(userId, transaction) {
    await this.loadModels(userId);
    return this.anomalyDetector.detect(transaction);
  }

  async getInsights(userId) {
    const Transaction = model('Transaction');
    const Budget = model('Budget');
    const FinancialGoal = model('FinancialGoal');

    const transactions = Transaction ? await Transaction.find({ userId, date: { $gte: ago(180) } }).sort({ date: 1 }).lean() : [];
    const budgets = Budget ? await Budget.find({ userId }).lean() : [];
    const goals = FinancialGoal ? await FinancialGoal.find({ userId }).lean() : [];

    return this.insightsGenerator.generate(transactions, budgets, goals);
  }

  async getBehavioralProfile(userId) {
    await this.loadModels(userId);

    const Transaction = model('Transaction');
    const Budget = model('Budget');
    const FinancialGoal = model('FinancialGoal');
    const Debt = model('Debt');

    const transactions = Transaction ? await Transaction.find({ userId, date: { $gte: ago(365) } }).sort({ date: 1 }).lean() : [];
    const budgets = Budget ? await Budget.find({ userId }).lean() : [];
    const goals = FinancialGoal ? await FinancialGoal.find({ userId }).lean() : [];
    const debts = Debt ? await Debt.find({ userId }).lean() : [];

    return this.behavioralAnalyzer.analyze(transactions, budgets, goals, debts);
  }

  _getMonthlyAggregates(transactions) {
    const monthly = {};
    transactions.forEach(t => {
      const key = new Date(t.date).toISOString().slice(0, 7);
      monthly[key] = (monthly[key] || 0) + Math.abs(t.amount);
    });
    return Object.values(monthly);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

const predictionEngine = new EnterprisePredictionEngine();

module.exports = {
  predictionEngine,
  EnterprisePredictionEngine,
  SpendingPredictor,
  AnomalyDetector,
  BehavioralAnalyzer,
  SmartCategorizer,
  GoalAdvisor,
  InsightsGenerator,
  EnsemblePredictor,
  Matrix,
  Activations,
  LossFunctions,
};
