// ============================================================================
// AUTO-ML PIPELINE — Automated Machine Learning for Financial Data
// ============================================================================
// Automatic feature engineering, model selection, hyperparameter tuning,
// cross-validation, and model ensembling. Runs entirely locally with
// custom implementations of common ML algorithms.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

// ============================================================================
// §1  FEATURE ENGINEERING — Automated Feature Generation
// ============================================================================

class FeatureEngineer {
  constructor() {
    this.featureRegistry = [];
    this.scalerParams = {};
    this.encoderMaps = {};
    this.importances = {};
  }

  // Generate comprehensive features from transactions
  generateTransactionFeatures(transactions) {
    const features = [];

    for (const txn of transactions) {
      const feat = {};
      const amount = Math.abs(txn.amount || 0);
      const date = new Date(txn.date || Date.now());

      // Amount features
      feat.amount_raw = amount;
      feat.amount_log = Math.log1p(amount);
      feat.amount_sqrt = Math.sqrt(amount);
      feat.amount_sq = amount * amount;
      feat.amount_bin_small = amount < 500 ? 1 : 0;
      feat.amount_bin_medium = amount >= 500 && amount < 5000 ? 1 : 0;
      feat.amount_bin_large = amount >= 5000 && amount < 50000 ? 1 : 0;
      feat.amount_bin_huge = amount >= 50000 ? 1 : 0;

      // Time features
      feat.day_of_week = date.getDay();
      feat.day_of_month = date.getDate();
      feat.month = date.getMonth();
      feat.quarter = Math.floor(date.getMonth() / 3);
      feat.hour = date.getHours();
      feat.is_weekend = date.getDay() === 0 || date.getDay() === 6 ? 1 : 0;
      feat.is_month_start = date.getDate() <= 5 ? 1 : 0;
      feat.is_month_end = date.getDate() >= 25 ? 1 : 0;
      feat.is_salary_time = date.getDate() >= 28 || date.getDate() <= 3 ? 1 : 0;

      // Cyclical time features (sin/cos encoding)
      feat.dow_sin = Math.sin(2 * Math.PI * date.getDay() / 7);
      feat.dow_cos = Math.cos(2 * Math.PI * date.getDay() / 7);
      feat.dom_sin = Math.sin(2 * Math.PI * date.getDate() / 31);
      feat.dom_cos = Math.cos(2 * Math.PI * date.getDate() / 31);
      feat.month_sin = Math.sin(2 * Math.PI * date.getMonth() / 12);
      feat.month_cos = Math.cos(2 * Math.PI * date.getMonth() / 12);
      feat.hour_sin = Math.sin(2 * Math.PI * date.getHours() / 24);
      feat.hour_cos = Math.cos(2 * Math.PI * date.getHours() / 24);

      // Type features
      feat.is_income = txn.type === 'income' ? 1 : 0;
      feat.is_expense = txn.type === 'expense' ? 1 : 0;
      feat.is_transfer = txn.type === 'transfer' ? 1 : 0;

      // Text features
      const desc = (txn.description || '').toLowerCase();
      feat.desc_length = desc.length;
      feat.desc_word_count = desc.split(/\s+/).filter(Boolean).length;
      feat.has_upi = desc.includes('upi') ? 1 : 0;
      feat.has_card = desc.includes('card') || desc.includes('pos') ? 1 : 0;
      feat.has_atm = desc.includes('atm') || desc.includes('cash') ? 1 : 0;
      feat.has_transfer = desc.includes('transfer') || desc.includes('neft') || desc.includes('imps') ? 1 : 0;
      feat.has_emi = desc.includes('emi') || desc.includes('loan') ? 1 : 0;
      feat.has_subscription = desc.includes('subscription') || desc.includes('renewal') ? 1 : 0;

      features.push(feat);
    }

    return features;
  }

  // Generate aggregate features for a time period
  generateAggregateFeatures(transactions, windowDays = 30) {
    const sortedTxns = [...transactions].sort((a, b) =>
      new Date(a.date || 0) - new Date(b.date || 0)
    );

    const windows = [];
    const endDate = new Date(sortedTxns[sortedTxns.length - 1]?.date || Date.now());
    const startDate = new Date(sortedTxns[0]?.date || Date.now());
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    for (let start = 0; start < totalDays; start += windowDays) {
      const windowStart = new Date(startDate.getTime() + start * 24 * 60 * 60 * 1000);
      const windowEnd = new Date(windowStart.getTime() + windowDays * 24 * 60 * 60 * 1000);

      const windowTxns = sortedTxns.filter(t => {
        const d = new Date(t.date || 0);
        return d >= windowStart && d < windowEnd;
      });

      if (windowTxns.length === 0) continue;

      const amounts = windowTxns.map(t => Math.abs(t.amount || 0));
      const incomes = windowTxns.filter(t => t.type === 'income').map(t => Math.abs(t.amount || 0));
      const expenses = windowTxns.filter(t => t.type === 'expense').map(t => Math.abs(t.amount || 0));

      const agg = {
        // Basic stats
        total_amount: amounts.reduce((s, v) => s + v, 0),
        mean_amount: amounts.length > 0 ? amounts.reduce((s, v) => s + v, 0) / amounts.length : 0,
        median_amount: this._median(amounts),
        std_amount: this._stdDev(amounts),
        min_amount: Math.min(...amounts),
        max_amount: Math.max(...amounts),
        count: windowTxns.length,

        // Income/Expense
        total_income: incomes.reduce((s, v) => s + v, 0),
        total_expense: expenses.reduce((s, v) => s + v, 0),
        income_count: incomes.length,
        expense_count: expenses.length,
        savings_rate: 0,

        // Diversity
        unique_categories: new Set(windowTxns.map(t => t.category)).size,
        unique_merchants: new Set(windowTxns.map(t => t.merchant || t.description)).size,

        // Timing
        avg_day_of_month: windowTxns.reduce((s, t) => s + new Date(t.date || 0).getDate(), 0) / windowTxns.length,
        weekend_ratio: windowTxns.filter(t => {
          const d = new Date(t.date || 0).getDay();
          return d === 0 || d === 6;
        }).length / windowTxns.length,

        // Distribution
        skewness: this._skewness(amounts),
        kurtosis: this._kurtosis(amounts),
        coeff_variation: 0,

        // Window info
        window_start: windowStart,
        window_end: windowEnd
      };

      // Derived features
      const totalIncome = incomes.reduce((s, v) => s + v, 0);
      const totalExpense = expenses.reduce((s, v) => s + v, 0);
      agg.savings_rate = totalIncome > 0 ? (totalIncome - totalExpense) / totalIncome : 0;
      agg.coeff_variation = agg.mean_amount > 0 ? agg.std_amount / agg.mean_amount : 0;

      windows.push(agg);
    }

    return windows;
  }

  // Lag features for time series
  generateLagFeatures(values, lags = [1, 2, 3, 7, 14, 30]) {
    const features = [];
    for (let i = Math.max(...lags); i < values.length; i++) {
      const feat = { value: values[i] };
      for (const lag of lags) {
        feat[`lag_${lag}`] = values[i - lag] || 0;
      }
      // Rolling statistics
      for (const window of [7, 14, 30]) {
        if (i >= window) {
          const windowVals = values.slice(i - window, i);
          feat[`rolling_mean_${window}`] = windowVals.reduce((s, v) => s + v, 0) / window;
          feat[`rolling_std_${window}`] = this._stdDev(windowVals);
          feat[`rolling_min_${window}`] = Math.min(...windowVals);
          feat[`rolling_max_${window}`] = Math.max(...windowVals);
        }
      }
      features.push(feat);
    }
    return features;
  }

  // Normalize features
  fitTransform(features) {
    if (features.length === 0) return [];

    const keys = Object.keys(features[0]);
    this.scalerParams = {};

    for (const key of keys) {
      const values = features.map(f => f[key] || 0);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      const std = this._stdDev(values);

      this.scalerParams[key] = { min, max, mean, std };
    }

    return features.map(feat => {
      const scaled = {};
      for (const key of keys) {
        const params = this.scalerParams[key];
        // Standard scaling (z-score)
        scaled[key] = params.std > 0 ? (feat[key] - params.mean) / params.std : 0;
      }
      return scaled;
    });
  }

  transform(features) {
    return features.map(feat => {
      const scaled = {};
      for (const key of Object.keys(feat)) {
        const params = this.scalerParams[key];
        if (params && params.std > 0) {
          scaled[key] = (feat[key] - params.mean) / params.std;
        } else {
          scaled[key] = feat[key] || 0;
        }
      }
      return scaled;
    });
  }

  // Feature importance via correlation with target
  computeFeatureImportance(features, targets) {
    if (features.length === 0 || targets.length === 0) return {};

    const keys = Object.keys(features[0]);
    const importances = {};

    for (const key of keys) {
      const featureVals = features.map(f => f[key] || 0);
      importances[key] = Math.abs(this._correlation(featureVals, targets));
    }

    this.importances = importances;
    return importances;
  }

  // Select top-k features
  selectTopFeatures(features, k = 20) {
    if (Object.keys(this.importances).length === 0) return features;

    const topKeys = Object.entries(this.importances)
      .sort((a, b) => b[1] - a[1])
      .slice(0, k)
      .map(([key]) => key);

    return features.map(feat => {
      const selected = {};
      for (const key of topKeys) {
        selected[key] = feat[key] || 0;
      }
      return selected;
    });
  }

  // Convert feature dict to array
  toArray(featureDict) {
    return Object.values(featureDict);
  }

  toArrayBatch(features) {
    if (features.length === 0) return [];
    const keys = Object.keys(features[0]);
    return features.map(f => keys.map(k => f[k] || 0));
  }

  _median(arr) {
    if (arr.length === 0) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  _stdDev(arr) {
    if (arr.length < 2) return 0;
    const m = arr.reduce((s, v) => s + v, 0) / arr.length;
    return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
  }

  _skewness(arr) {
    if (arr.length < 3) return 0;
    const m = arr.reduce((s, v) => s + v, 0) / arr.length;
    const s = this._stdDev(arr);
    if (s === 0) return 0;
    const n = arr.length;
    return (n / ((n - 1) * (n - 2))) * arr.reduce((sum, v) => sum + ((v - m) / s) ** 3, 0);
  }

  _kurtosis(arr) {
    if (arr.length < 4) return 0;
    const m = arr.reduce((s, v) => s + v, 0) / arr.length;
    const s = this._stdDev(arr);
    if (s === 0) return 0;
    const n = arr.length;
    return arr.reduce((sum, v) => sum + ((v - m) / s) ** 4, 0) / n - 3;
  }

  _correlation(x, y) {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    const mx = x.reduce((s, v) => s + v, 0) / n;
    const my = y.reduce((s, v) => s + v, 0) / n;
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
      num += (x[i] - mx) * (y[i] - my);
      denX += (x[i] - mx) ** 2;
      denY += (y[i] - my) ** 2;
    }
    const den = Math.sqrt(denX * denY);
    return den > 0 ? num / den : 0;
  }
}

// ============================================================================
// §2  MODEL IMPLEMENTATIONS — Core ML Algorithms
// ============================================================================

class LinearRegressionModel {
  constructor() {
    this.weights = null;
    this.bias = 0;
    this.trained = false;
  }

  fit(X, y, config = {}) {
    const epochs = config.epochs || 100;
    const lr = config.learningRate || 0.01;
    const l2 = config.l2Penalty || 0.001;

    const n = X.length;
    const dims = X[0]?.length || 0;
    this.weights = new Array(dims).fill(0);
    this.bias = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
      const dw = new Array(dims).fill(0);
      let db = 0;
      let loss = 0;

      for (let i = 0; i < n; i++) {
        let pred = this.bias;
        for (let j = 0; j < dims; j++) {
          pred += (X[i][j] || 0) * this.weights[j];
        }
        const error = pred - y[i];
        loss += error * error;

        for (let j = 0; j < dims; j++) {
          dw[j] += error * (X[i][j] || 0) + l2 * this.weights[j];
        }
        db += error;
      }

      for (let j = 0; j < dims; j++) {
        this.weights[j] -= lr * dw[j] / n;
      }
      this.bias -= lr * db / n;
    }

    this.trained = true;
    return this;
  }

  predict(X) {
    return X.map(x => {
      let pred = this.bias;
      for (let j = 0; j < this.weights.length; j++) {
        pred += (x[j] || 0) * this.weights[j];
      }
      return pred;
    });
  }

  score(X, y) {
    const predictions = this.predict(X);
    const m = y.reduce((s, v) => s + v, 0) / y.length;
    let ssRes = 0, ssTot = 0;
    for (let i = 0; i < y.length; i++) {
      ssRes += (y[i] - predictions[i]) ** 2;
      ssTot += (y[i] - m) ** 2;
    }
    return ssTot > 0 ? 1 - ssRes / ssTot : 0;
  }
}

class LogisticRegressionModel {
  constructor() {
    this.weights = null;
    this.bias = 0;
    this.classes = [];
    this.trained = false;
  }

  _sigmoid(z) { return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, z)))); }

  fit(X, y, config = {}) {
    const epochs = config.epochs || 200;
    const lr = config.learningRate || 0.01;
    const l2 = config.l2Penalty || 0.001;

    this.classes = [...new Set(y)];
    const n = X.length;
    const dims = X[0]?.length || 0;

    if (this.classes.length === 2) {
      // Binary classification
      this.weights = new Array(dims).fill(0);
      this.bias = 0;
      const positiveClass = this.classes[1];
      const yBinary = y.map(v => v === positiveClass ? 1 : 0);

      for (let epoch = 0; epoch < epochs; epoch++) {
        const dw = new Array(dims).fill(0);
        let db = 0;

        for (let i = 0; i < n; i++) {
          let z = this.bias;
          for (let j = 0; j < dims; j++) {
            z += (X[i][j] || 0) * this.weights[j];
          }
          const pred = this._sigmoid(z);
          const error = pred - yBinary[i];

          for (let j = 0; j < dims; j++) {
            dw[j] += error * (X[i][j] || 0) + l2 * this.weights[j];
          }
          db += error;
        }

        for (let j = 0; j < dims; j++) {
          this.weights[j] -= lr * dw[j] / n;
        }
        this.bias -= lr * db / n;
      }
    } else {
      // One-vs-rest for multiclass
      this.multiWeights = {};
      for (const cls of this.classes) {
        const model = new LogisticRegressionModel();
        const binaryY = y.map(v => v === cls ? cls : '__other__');
        model.classes = [cls, '__other__'];
        model.fit(X, binaryY, config);
        this.multiWeights[cls] = { weights: model.weights, bias: model.bias };
      }
    }

    this.trained = true;
    return this;
  }

  predict(X) {
    if (this.classes.length === 2) {
      return X.map(x => {
        let z = this.bias;
        for (let j = 0; j < this.weights.length; j++) {
          z += (x[j] || 0) * this.weights[j];
        }
        return this._sigmoid(z) >= 0.5 ? this.classes[1] : this.classes[0];
      });
    }

    // Multiclass
    return X.map(x => {
      let bestClass = this.classes[0];
      let bestScore = -Infinity;
      for (const cls of this.classes) {
        const w = this.multiWeights[cls];
        if (!w) continue;
        let z = w.bias;
        for (let j = 0; j < w.weights.length; j++) {
          z += (x[j] || 0) * w.weights[j];
        }
        if (z > bestScore) {
          bestScore = z;
          bestClass = cls;
        }
      }
      return bestClass;
    });
  }

  predictProba(X) {
    if (this.classes.length === 2) {
      return X.map(x => {
        let z = this.bias;
        for (let j = 0; j < this.weights.length; j++) {
          z += (x[j] || 0) * this.weights[j];
        }
        const p = this._sigmoid(z);
        return { [this.classes[0]]: 1 - p, [this.classes[1]]: p };
      });
    }

    return X.map(x => {
      const scores = {};
      for (const cls of this.classes) {
        const w = this.multiWeights[cls];
        if (!w) { scores[cls] = 0; continue; }
        let z = w.bias;
        for (let j = 0; j < w.weights.length; j++) {
          z += (x[j] || 0) * w.weights[j];
        }
        scores[cls] = this._sigmoid(z);
      }
      const total = Object.values(scores).reduce((s, v) => s + v, 0) || 1;
      for (const cls of this.classes) scores[cls] /= total;
      return scores;
    });
  }

  score(X, y) {
    const predictions = this.predict(X);
    let correct = 0;
    for (let i = 0; i < y.length; i++) {
      if (predictions[i] === y[i]) correct++;
    }
    return y.length > 0 ? correct / y.length : 0;
  }
}

class KNearestNeighbors {
  constructor(k = 5) {
    this.k = k;
    this.data = [];
    this.labels = [];
    this.trained = false;
  }

  fit(X, y) {
    this.data = X.map(x => [...x]);
    this.labels = [...y];
    this.trained = true;
    return this;
  }

  _distance(a, b) {
    return Math.sqrt(a.reduce((s, v, i) => s + (v - (b[i] || 0)) ** 2, 0));
  }

  predict(X) {
    return X.map(x => {
      const distances = this.data.map((d, i) => ({
        distance: this._distance(x, d),
        label: this.labels[i]
      }));
      distances.sort((a, b) => a.distance - b.distance);
      const neighbors = distances.slice(0, this.k);

      // Majority vote (classification) or average (regression)
      const labelCounts = {};
      for (const n of neighbors) {
        labelCounts[n.label] = (labelCounts[n.label] || 0) + 1;
      }
      let bestLabel = neighbors[0]?.label;
      let bestCount = 0;
      for (const [label, count] of Object.entries(labelCounts)) {
        if (count > bestCount) {
          bestCount = count;
          bestLabel = label;
        }
      }
      return bestLabel;
    });
  }

  score(X, y) {
    const predictions = this.predict(X);
    let correct = 0;
    for (let i = 0; i < y.length; i++) {
      if (predictions[i] == y[i]) correct++;
    }
    return y.length > 0 ? correct / y.length : 0;
  }
}

class GradientBoostingRegressor {
  constructor(config = {}) {
    this.numTrees = config.numTrees || 50;
    this.maxDepth = config.maxDepth || 4;
    this.learningRate = config.learningRate || 0.1;
    this.minSamplesLeaf = config.minSamplesLeaf || 5;
    this.trees = [];
    this.initialPrediction = 0;
    this.trained = false;
  }

  fit(X, y) {
    const n = X.length;
    this.initialPrediction = y.reduce((s, v) => s + v, 0) / n;
    let predictions = new Array(n).fill(this.initialPrediction);

    for (let t = 0; t < this.numTrees; t++) {
      // Compute residuals
      const residuals = y.map((v, i) => v - predictions[i]);

      // Fit tree to residuals
      const tree = this._buildTree(X, residuals, 0);
      this.trees.push(tree);

      // Update predictions
      for (let i = 0; i < n; i++) {
        predictions[i] += this.learningRate * this._predictTree(tree, X[i]);
      }
    }

    this.trained = true;
    return this;
  }

  _buildTree(X, y, depth) {
    const n = X.length;

    if (n <= this.minSamplesLeaf || depth >= this.maxDepth) {
      return { type: 'leaf', value: y.reduce((s, v) => s + v, 0) / (n || 1) };
    }

    let bestFeature = 0, bestThreshold = 0, bestGain = -Infinity;
    const dims = X[0]?.length || 0;

    for (let f = 0; f < dims; f++) {
      const values = [...new Set(X.map(x => x[f] || 0))].sort((a, b) => a - b);
      for (let v = 0; v < values.length - 1; v++) {
        const threshold = (values[v] + values[v + 1]) / 2;
        const leftIdx = [], rightIdx = [];
        for (let i = 0; i < n; i++) {
          if ((X[i][f] || 0) <= threshold) leftIdx.push(i);
          else rightIdx.push(i);
        }

        if (leftIdx.length < this.minSamplesLeaf || rightIdx.length < this.minSamplesLeaf) continue;

        const gain = this._computeGain(y, leftIdx, rightIdx);
        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = f;
          bestThreshold = threshold;
        }
      }
    }

    if (bestGain <= 0) {
      return { type: 'leaf', value: y.reduce((s, v) => s + v, 0) / (n || 1) };
    }

    const leftIdx = [], rightIdx = [];
    for (let i = 0; i < n; i++) {
      if ((X[i][bestFeature] || 0) <= bestThreshold) leftIdx.push(i);
      else rightIdx.push(i);
    }

    return {
      type: 'split',
      feature: bestFeature,
      threshold: bestThreshold,
      left: this._buildTree(leftIdx.map(i => X[i]), leftIdx.map(i => y[i]), depth + 1),
      right: this._buildTree(rightIdx.map(i => X[i]), rightIdx.map(i => y[i]), depth + 1)
    };
  }

  _computeGain(y, leftIdx, rightIdx) {
    const parentVar = this._variance(y);
    const leftVar = this._variance(leftIdx.map(i => y[i]));
    const rightVar = this._variance(rightIdx.map(i => y[i]));
    const n = y.length;
    return parentVar - (leftIdx.length / n) * leftVar - (rightIdx.length / n) * rightVar;
  }

  _variance(arr) {
    if (arr.length < 2) return 0;
    const m = arr.reduce((s, v) => s + v, 0) / arr.length;
    return arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
  }

  _predictTree(node, x) {
    if (node.type === 'leaf') return node.value;
    if ((x[node.feature] || 0) <= node.threshold) return this._predictTree(node.left, x);
    return this._predictTree(node.right, x);
  }

  predict(X) {
    return X.map(x => {
      let pred = this.initialPrediction;
      for (const tree of this.trees) {
        pred += this.learningRate * this._predictTree(tree, x);
      }
      return pred;
    });
  }

  score(X, y) {
    const predictions = this.predict(X);
    const m = y.reduce((s, v) => s + v, 0) / y.length;
    let ssRes = 0, ssTot = 0;
    for (let i = 0; i < y.length; i++) {
      ssRes += (y[i] - predictions[i]) ** 2;
      ssTot += (y[i] - m) ** 2;
    }
    return ssTot > 0 ? 1 - ssRes / ssTot : 0;
  }
}

class SupportVectorRegressor {
  constructor(config = {}) {
    this.C = config.C || 1.0;
    this.epsilon = config.epsilon || 0.1;
    this.learningRate = config.learningRate || 0.001;
    this.epochs = config.epochs || 200;
    this.weights = null;
    this.bias = 0;
    this.trained = false;
  }

  fit(X, y) {
    const n = X.length;
    const dims = X[0]?.length || 0;
    this.weights = new Array(dims).fill(0);
    this.bias = 0;

    for (let epoch = 0; epoch < this.epochs; epoch++) {
      for (let i = 0; i < n; i++) {
        let pred = this.bias;
        for (let j = 0; j < dims; j++) {
          pred += (X[i][j] || 0) * this.weights[j];
        }
        const error = pred - y[i];

        if (Math.abs(error) > this.epsilon) {
          const sign = error > 0 ? 1 : -1;
          for (let j = 0; j < dims; j++) {
            this.weights[j] -= this.learningRate * (this.C * sign * (X[i][j] || 0) + this.weights[j] / n);
          }
          this.bias -= this.learningRate * this.C * sign;
        } else {
          for (let j = 0; j < dims; j++) {
            this.weights[j] -= this.learningRate * this.weights[j] / n;
          }
        }
      }
    }

    this.trained = true;
    return this;
  }

  predict(X) {
    return X.map(x => {
      let pred = this.bias;
      for (let j = 0; j < this.weights.length; j++) {
        pred += (x[j] || 0) * this.weights[j];
      }
      return pred;
    });
  }

  score(X, y) {
    const predictions = this.predict(X);
    const m = y.reduce((s, v) => s + v, 0) / y.length;
    let ssRes = 0, ssTot = 0;
    for (let i = 0; i < y.length; i++) {
      ssRes += (y[i] - predictions[i]) ** 2;
      ssTot += (y[i] - m) ** 2;
    }
    return ssTot > 0 ? 1 - ssRes / ssTot : 0;
  }
}

// ============================================================================
// §3  CROSS VALIDATION — Model Evaluation Framework
// ============================================================================

class CrossValidator {
  constructor(config = {}) {
    this.folds = config.folds || 5;
    this.shuffle = config.shuffle !== false;
  }

  validate(model, X, y, config = {}) {
    const n = X.length;
    const indices = Array.from({ length: n }, (_, i) => i);

    if (this.shuffle) {
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
    }

    const foldSize = Math.ceil(n / this.folds);
    const scores = [];
    const foldResults = [];

    for (let fold = 0; fold < this.folds; fold++) {
      const testStart = fold * foldSize;
      const testEnd = Math.min(testStart + foldSize, n);
      const testIdx = indices.slice(testStart, testEnd);
      const trainIdx = [...indices.slice(0, testStart), ...indices.slice(testEnd)];

      const trainX = trainIdx.map(i => X[i]);
      const trainY = trainIdx.map(i => y[i]);
      const testX = testIdx.map(i => X[i]);
      const testY = testIdx.map(i => y[i]);

      // Create fresh model instance
      const foldModel = this._cloneModel(model);
      foldModel.fit(trainX, trainY, config);
      const score = foldModel.score(testX, testY);
      scores.push(score);

      foldResults.push({
        fold: fold + 1,
        trainSize: trainIdx.length,
        testSize: testIdx.length,
        score
      });
    }

    const meanScore = scores.reduce((s, v) => s + v, 0) / scores.length;
    const stdScore = Math.sqrt(scores.reduce((s, v) => s + (v - meanScore) ** 2, 0) / scores.length);

    return {
      meanScore,
      stdScore,
      scores,
      foldResults,
      confidenceInterval: {
        lower: meanScore - 1.96 * stdScore / Math.sqrt(this.folds),
        upper: meanScore + 1.96 * stdScore / Math.sqrt(this.folds)
      }
    };
  }

  _cloneModel(model) {
    if (model instanceof LinearRegressionModel) return new LinearRegressionModel();
    if (model instanceof LogisticRegressionModel) return new LogisticRegressionModel();
    if (model instanceof KNearestNeighbors) return new KNearestNeighbors(model.k);
    if (model instanceof GradientBoostingRegressor) return new GradientBoostingRegressor({
      numTrees: model.numTrees, maxDepth: model.maxDepth, learningRate: model.learningRate
    });
    if (model instanceof SupportVectorRegressor) return new SupportVectorRegressor({
      C: model.C, epsilon: model.epsilon
    });
    return model;
  }
}

// ============================================================================
// §4  HYPERPARAMETER TUNER — Grid Search & Random Search
// ============================================================================

class HyperparameterTuner {
  constructor(config = {}) {
    this.strategy = config.strategy || 'random'; // 'grid', 'random'
    this.maxTrials = config.maxTrials || 20;
    this.cv = new CrossValidator({ folds: config.folds || 3 });
  }

  tune(modelClass, paramGrid, X, y) {
    const configs = this.strategy === 'grid'
      ? this._gridConfigs(paramGrid)
      : this._randomConfigs(paramGrid, this.maxTrials);

    const results = [];

    for (const config of configs) {
      try {
        const model = new modelClass(config);
        const cvResult = this.cv.validate(model, X, y, config);
        results.push({
          config,
          meanScore: cvResult.meanScore,
          stdScore: cvResult.stdScore,
          scores: cvResult.scores
        });
      } catch (e) {
        logger.debug(`Hyperparameter trial failed: ${e.message}`);
      }
    }

    results.sort((a, b) => b.meanScore - a.meanScore);

    return {
      bestConfig: results[0]?.config || {},
      bestScore: results[0]?.meanScore || 0,
      allResults: results,
      trialsRun: results.length
    };
  }

  _gridConfigs(paramGrid) {
    const keys = Object.keys(paramGrid);
    if (keys.length === 0) return [{}];

    const configs = [];
    const generate = (idx, current) => {
      if (idx === keys.length) {
        configs.push({ ...current });
        return;
      }
      const key = keys[idx];
      for (const value of paramGrid[key]) {
        current[key] = value;
        generate(idx + 1, current);
      }
    };
    generate(0, {});
    return configs;
  }

  _randomConfigs(paramGrid, n) {
    const configs = [];
    const keys = Object.keys(paramGrid);

    for (let i = 0; i < n; i++) {
      const config = {};
      for (const key of keys) {
        const values = paramGrid[key];
        config[key] = values[Math.floor(Math.random() * values.length)];
      }
      configs.push(config);
    }
    return configs;
  }
}

// ============================================================================
// §5  AUTO-ML PIPELINE — Orchestrates the Full ML Workflow
// ============================================================================

class AutoMLPipeline {
  constructor(config = {}) {
    this.featureEngineer = new FeatureEngineer();
    this.cv = new CrossValidator({ folds: config.folds || 5 });
    this.tuner = new HyperparameterTuner({ maxTrials: config.maxTrials || 15 });
    this.dataDir = path.join(__dirname, '../../data/automl-models');
    this.bestModel = null;
    this.bestConfig = null;
    this.history = [];
  }

  async _ensureDir() {
    await fs.promises.mkdir(this.dataDir, { recursive: true }).catch(() => {});
  }

  // Main pipeline: automatically selects and trains best model
  async run(task, X, y, config = {}) {
    const startTime = Date.now();
    const results = [];

    logger.info(`AutoML: Starting ${task} pipeline with ${X.length} samples`);

    if (task === 'regression') {
      results.push(...this._evaluateRegressionModels(X, y, config));
    } else if (task === 'classification') {
      results.push(...this._evaluateClassificationModels(X, y, config));
    } else {
      // Auto-detect task
      const uniqueValues = new Set(y).size;
      const isClassification = uniqueValues < 20 || typeof y[0] === 'string';
      if (isClassification) {
        results.push(...this._evaluateClassificationModels(X, y, config));
      } else {
        results.push(...this._evaluateRegressionModels(X, y, config));
      }
    }

    results.sort((a, b) => b.score - a.score);
    const best = results[0];

    if (best) {
      this.bestModel = best.model;
      this.bestConfig = best.config;
    }

    const duration = Date.now() - startTime;

    const pipelineResult = {
      task,
      bestModel: best?.name || 'none',
      bestScore: best?.score || 0,
      bestConfig: best?.config || {},
      allModels: results.map(r => ({
        name: r.name,
        score: r.score,
        stdScore: r.stdScore,
        config: r.config
      })),
      samplesUsed: X.length,
      featuresUsed: X[0]?.length || 0,
      duration,
      timestamp: new Date()
    };

    this.history.push(pipelineResult);
    return pipelineResult;
  }

  _evaluateRegressionModels(X, y, config = {}) {
    const results = [];

    // Linear Regression
    try {
      const lr = new LinearRegressionModel();
      const cvResult = this.cv.validate(lr, X, y, { epochs: 100, learningRate: 0.01 });
      results.push({
        name: 'LinearRegression',
        model: lr,
        score: cvResult.meanScore,
        stdScore: cvResult.stdScore,
        config: { epochs: 100, learningRate: 0.01 }
      });
    } catch (e) { logger.debug('LR failed:', e.message); }

    // Gradient Boosting
    try {
      const gb = new GradientBoostingRegressor({ numTrees: 30, maxDepth: 4 });
      const cvResult = this.cv.validate(gb, X, y);
      results.push({
        name: 'GradientBoosting',
        model: gb,
        score: cvResult.meanScore,
        stdScore: cvResult.stdScore,
        config: { numTrees: 30, maxDepth: 4 }
      });
    } catch (e) { logger.debug('GB failed:', e.message); }

    // SVR
    try {
      const svr = new SupportVectorRegressor({ C: 1.0, epsilon: 0.1, epochs: 100 });
      const cvResult = this.cv.validate(svr, X, y, { C: 1.0, epsilon: 0.1, epochs: 100 });
      results.push({
        name: 'SVR',
        model: svr,
        score: cvResult.meanScore,
        stdScore: cvResult.stdScore,
        config: { C: 1.0, epsilon: 0.1 }
      });
    } catch (e) { logger.debug('SVR failed:', e.message); }

    // KNN Regression
    try {
      const knn = new KNearestNeighbors(5);
      const cvResult = this.cv.validate(knn, X, y);
      results.push({
        name: 'KNN',
        model: knn,
        score: cvResult.meanScore,
        stdScore: cvResult.stdScore,
        config: { k: 5 }
      });
    } catch (e) { logger.debug('KNN failed:', e.message); }

    return results;
  }

  _evaluateClassificationModels(X, y, config = {}) {
    const results = [];

    // Logistic Regression
    try {
      const lr = new LogisticRegressionModel();
      const cvResult = this.cv.validate(lr, X, y, { epochs: 200, learningRate: 0.01 });
      results.push({
        name: 'LogisticRegression',
        model: lr,
        score: cvResult.meanScore,
        stdScore: cvResult.stdScore,
        config: { epochs: 200 }
      });
    } catch (e) { logger.debug('LogReg failed:', e.message); }

    // KNN Classification
    try {
      const knn = new KNearestNeighbors(5);
      const cvResult = this.cv.validate(knn, X, y);
      results.push({
        name: 'KNN',
        model: knn,
        score: cvResult.meanScore,
        stdScore: cvResult.stdScore,
        config: { k: 5 }
      });
    } catch (e) { logger.debug('KNN failed:', e.message); }

    return results;
  }

  // Predict with best model
  predict(X) {
    if (!this.bestModel) throw new Error('No model has been trained. Run pipeline first.');
    return this.bestModel.predict(X);
  }

  // Specialized pipelines
  async forecastSpending(transactions) {
    const engineer = new FeatureEngineer();
    const aggFeatures = engineer.generateAggregateFeatures(transactions, 7);

    if (aggFeatures.length < 10) {
      return { error: 'Not enough data for forecasting', minRequired: 10 };
    }

    const amounts = aggFeatures.map(a => a.total_expense);
    const lagFeatures = engineer.generateLagFeatures(amounts, [1, 2, 3, 7]);

    if (lagFeatures.length < 5) {
      return { error: 'Not enough lag data', minRequired: 5 };
    }

    const X = lagFeatures.map(f => {
      const { value, ...features } = f;
      return Object.values(features);
    });
    const y = lagFeatures.map(f => f.value);

    const result = await this.run('regression', X, y);

    // Generate forecast
    const lastFeatures = X[X.length - 1];
    const forecast = [];
    let currentFeatures = [...lastFeatures];

    for (let i = 0; i < 4; i++) {
      const pred = this.predict([currentFeatures])[0];
      forecast.push({
        week: i + 1,
        predicted: Math.max(0, pred),
        model: result.bestModel
      });
      currentFeatures = [pred, ...currentFeatures.slice(0, -1)];
    }

    return {
      ...result,
      forecast,
      historicalAvg: amounts.reduce((s, v) => s + v, 0) / amounts.length
    };
  }

  async categorizeTransactions(labeledTransactions) {
    const engineer = new FeatureEngineer();
    const features = engineer.generateTransactionFeatures(labeledTransactions);
    const scaledFeatures = engineer.fitTransform(features);
    const X = engineer.toArrayBatch(scaledFeatures);
    const y = labeledTransactions.map(t => t.category || 'uncategorized');

    return this.run('classification', X, y);
  }

  async predictAnomalies(transactions) {
    const engineer = new FeatureEngineer();
    const features = engineer.generateTransactionFeatures(transactions);
    const scaledFeatures = engineer.fitTransform(features);
    const X = engineer.toArrayBatch(scaledFeatures);

    // Generate synthetic anomaly labels based on z-score
    const amounts = transactions.map(t => Math.abs(t.amount || 0));
    const m = amounts.reduce((s, v) => s + v, 0) / amounts.length;
    const s = Math.sqrt(amounts.reduce((acc, v) => acc + (v - m) ** 2, 0) / amounts.length);
    const y = amounts.map(a => s > 0 && Math.abs(a - m) / s > 2 ? 'anomaly' : 'normal');

    return this.run('classification', X, y);
  }

  getHistory() { return this.history; }
}

// ============================================================================
// §6  MODEL REGISTRY — Manage and Version Models
// ============================================================================

class AutoMLModelRegistry {
  constructor() {
    this.dataDir = path.join(__dirname, '../../data/automl-registry');
    this.registry = {};
  }

  async _ensureDir() {
    await fs.promises.mkdir(this.dataDir, { recursive: true }).catch(() => {});
  }

  async register(userId, modelName, model, metadata = {}) {
    await this._ensureDir();

    const entry = {
      userId,
      modelName,
      version: (this.registry[`${userId}:${modelName}`]?.version || 0) + 1,
      metadata,
      registeredAt: new Date(),
      status: 'active'
    };

    this.registry[`${userId}:${modelName}`] = entry;

    const filePath = path.join(this.dataDir, `${userId}_${modelName}.json`);
    try {
      await fs.promises.writeFile(filePath, JSON.stringify({
        entry,
        modelType: model.constructor.name,
        trained: model.trained
      }));
    } catch (e) {
      logger.debug(`Model registry save failed: ${e.message}`);
    }

    return entry;
  }

  getModel(userId, modelName) {
    return this.registry[`${userId}:${modelName}`] || null;
  }

  listModels(userId) {
    return Object.entries(this.registry)
      .filter(([key]) => key.startsWith(userId))
      .map(([, entry]) => entry);
  }

  async deleteModel(userId, modelName) {
    delete this.registry[`${userId}:${modelName}`];
    const filePath = path.join(this.dataDir, `${userId}_${modelName}.json`);
    try { await fs.promises.unlink(filePath); } catch { }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Feature Engineering
  FeatureEngineer,

  // Models
  LinearRegressionModel,
  LogisticRegressionModel,
  KNearestNeighbors,
  GradientBoostingRegressor,
  SupportVectorRegressor,

  // Evaluation
  CrossValidator,
  HyperparameterTuner,

  // Pipeline
  AutoMLPipeline,
  AutoMLModelRegistry
};
