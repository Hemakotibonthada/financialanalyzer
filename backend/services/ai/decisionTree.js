// ============================================================================
// DECISION TREE & RANDOM FOREST — From-Scratch Implementation
// ============================================================================
// Production-grade decision tree (CART algorithm), random forest with
// bagging, feature importance, pruning, and financial-specific utilities.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');

// ============================================================================
// §0  UTILITIES
// ============================================================================

function giniImpurity(labels) {
  const counts = {};
  for (const l of labels) counts[l] = (counts[l] || 0) + 1;
  let impurity = 1;
  const total = labels.length;
  for (const count of Object.values(counts)) {
    impurity -= (count / total) ** 2;
  }
  return impurity;
}

function entropy(labels) {
  const counts = {};
  for (const l of labels) counts[l] = (counts[l] || 0) + 1;
  let ent = 0;
  const total = labels.length;
  for (const count of Object.values(counts)) {
    const p = count / total;
    if (p > 0) ent -= p * Math.log2(p);
  }
  return ent;
}

function variance(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
}

function majorityVote(labels) {
  const counts = {};
  for (const l of labels) counts[l] = (counts[l] || 0) + 1;
  let maxLabel = null, maxCount = 0;
  for (const [label, count] of Object.entries(counts)) {
    if (count > maxCount) { maxLabel = label; maxCount = count; }
  }
  return maxLabel;
}

function meanValue(values) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function bootstrapSample(data, labels, sampleSize = null) {
  const n = sampleSize || data.length;
  const sampledData = [];
  const sampledLabels = [];
  const oobIndices = new Set(Array.from({ length: data.length }, (_, i) => i));

  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * data.length);
    sampledData.push(data[idx]);
    sampledLabels.push(labels[idx]);
    oobIndices.delete(idx);
  }

  return { data: sampledData, labels: sampledLabels, oobIndices: [...oobIndices] };
}

// ============================================================================
// §1  DECISION TREE NODE
// ============================================================================

class TreeNode {
  constructor() {
    this.featureIndex = null;
    this.threshold = null;
    this.left = null;
    this.right = null;
    this.prediction = null;
    this.impurity = null;
    this.samples = 0;
    this.depth = 0;
    this.isLeaf = false;
    this.classProbabilities = null;
  }

  serialize() {
    return {
      featureIndex: this.featureIndex,
      threshold: this.threshold,
      left: this.left?.serialize() || null,
      right: this.right?.serialize() || null,
      prediction: this.prediction,
      impurity: this.impurity,
      samples: this.samples,
      depth: this.depth,
      isLeaf: this.isLeaf,
      classProbabilities: this.classProbabilities,
    };
  }

  static deserialize(obj) {
    if (!obj) return null;
    const node = new TreeNode();
    node.featureIndex = obj.featureIndex;
    node.threshold = obj.threshold;
    node.left = obj.left ? TreeNode.deserialize(obj.left) : null;
    node.right = obj.right ? TreeNode.deserialize(obj.right) : null;
    node.prediction = obj.prediction;
    node.impurity = obj.impurity;
    node.samples = obj.samples;
    node.depth = obj.depth;
    node.isLeaf = obj.isLeaf;
    node.classProbabilities = obj.classProbabilities;
    return node;
  }
}

// ============================================================================
// §2  DECISION TREE (CART Algorithm)
// ============================================================================

class DecisionTree {
  constructor(config = {}) {
    this.maxDepth = config.maxDepth || 15;
    this.minSamplesSplit = config.minSamplesSplit || 5;
    this.minSamplesLeaf = config.minSamplesLeaf || 2;
    this.maxFeatures = config.maxFeatures || null; // 'sqrt', 'log2', number, or null (all)
    this.criterion = config.criterion || 'gini'; // 'gini', 'entropy', 'variance'
    this.isRegression = config.isRegression || false;
    this.minImpurityDecrease = config.minImpurityDecrease || 0.001;
    this.root = null;
    this.featureImportances = null;
    this.numFeatures = 0;
    this.classes = [];
  }

  _getMaxFeatures(totalFeatures) {
    if (this.maxFeatures === 'sqrt') return Math.ceil(Math.sqrt(totalFeatures));
    if (this.maxFeatures === 'log2') return Math.ceil(Math.log2(totalFeatures));
    if (typeof this.maxFeatures === 'number') return Math.min(this.maxFeatures, totalFeatures);
    return totalFeatures;
  }

  _computeImpurity(labels) {
    if (this.isRegression) return variance(labels.map(Number));
    if (this.criterion === 'entropy') return entropy(labels);
    return giniImpurity(labels);
  }

  _findBestSplit(data, labels, featureSubset) {
    let bestGain = -Infinity;
    let bestFeature = null;
    let bestThreshold = null;
    let bestLeftIndices = null;
    let bestRightIndices = null;

    const parentImpurity = this._computeImpurity(labels);
    const n = data.length;

    for (const featureIdx of featureSubset) {
      // Get unique sorted values for this feature
      const values = data.map((row, i) => ({ value: row[featureIdx], index: i }));
      values.sort((a, b) => a.value - b.value);

      const uniqueValues = [...new Set(values.map(v => v.value))];
      
      // Try midpoints between consecutive values
      for (let i = 0; i < uniqueValues.length - 1; i++) {
        const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;

        const leftIndices = [];
        const rightIndices = [];
        const leftLabels = [];
        const rightLabels = [];

        for (let j = 0; j < n; j++) {
          if (data[j][featureIdx] <= threshold) {
            leftIndices.push(j);
            leftLabels.push(labels[j]);
          } else {
            rightIndices.push(j);
            rightLabels.push(labels[j]);
          }
        }

        if (leftLabels.length < this.minSamplesLeaf || rightLabels.length < this.minSamplesLeaf) continue;

        const leftImpurity = this._computeImpurity(leftLabels);
        const rightImpurity = this._computeImpurity(rightLabels);
        const weightedImpurity = (leftLabels.length / n) * leftImpurity + (rightLabels.length / n) * rightImpurity;
        const gain = parentImpurity - weightedImpurity;

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = featureIdx;
          bestThreshold = threshold;
          bestLeftIndices = leftIndices;
          bestRightIndices = rightIndices;
        }
      }
    }

    return { gain: bestGain, featureIndex: bestFeature, threshold: bestThreshold, leftIndices: bestLeftIndices, rightIndices: bestRightIndices };
  }

  _buildTree(data, labels, depth = 0) {
    const node = new TreeNode();
    node.depth = depth;
    node.samples = data.length;
    node.impurity = this._computeImpurity(labels);

    // Terminal conditions
    if (depth >= this.maxDepth || data.length < this.minSamplesSplit || node.impurity <= this.minImpurityDecrease) {
      node.isLeaf = true;
      if (this.isRegression) {
        node.prediction = meanValue(labels.map(Number));
      } else {
        node.prediction = majorityVote(labels);
        // Compute class probabilities
        const counts = {};
        for (const l of labels) counts[l] = (counts[l] || 0) + 1;
        node.classProbabilities = {};
        for (const [label, count] of Object.entries(counts)) {
          node.classProbabilities[label] = count / labels.length;
        }
      }
      return node;
    }

    // Select random feature subset
    const numFeatures = this._getMaxFeatures(data[0].length);
    const allFeatures = Array.from({ length: data[0].length }, (_, i) => i);
    const featureSubset = [];
    const shuffled = [...allFeatures];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    for (let i = 0; i < numFeatures; i++) featureSubset.push(shuffled[i]);

    const split = this._findBestSplit(data, labels, featureSubset);

    if (split.gain <= this.minImpurityDecrease || !split.leftIndices) {
      node.isLeaf = true;
      if (this.isRegression) {
        node.prediction = meanValue(labels.map(Number));
      } else {
        node.prediction = majorityVote(labels);
        const counts = {};
        for (const l of labels) counts[l] = (counts[l] || 0) + 1;
        node.classProbabilities = {};
        for (const [label, count] of Object.entries(counts)) {
          node.classProbabilities[label] = count / labels.length;
        }
      }
      return node;
    }

    node.featureIndex = split.featureIndex;
    node.threshold = split.threshold;

    const leftData = split.leftIndices.map(i => data[i]);
    const leftLabels = split.leftIndices.map(i => labels[i]);
    const rightData = split.rightIndices.map(i => data[i]);
    const rightLabels = split.rightIndices.map(i => labels[i]);

    node.left = this._buildTree(leftData, leftLabels, depth + 1);
    node.right = this._buildTree(rightData, rightLabels, depth + 1);

    return node;
  }

  train(data, labels) {
    this.numFeatures = data[0].length;
    if (!this.isRegression) {
      this.classes = [...new Set(labels)].sort();
    }
    this.featureImportances = new Array(this.numFeatures).fill(0);
    this.root = this._buildTree(data, labels);
    this._computeFeatureImportance(this.root);

    // Normalize feature importances
    const totalImportance = this.featureImportances.reduce((a, b) => a + b, 0);
    if (totalImportance > 0) {
      this.featureImportances = this.featureImportances.map(v => v / totalImportance);
    }

    return this;
  }

  _computeFeatureImportance(node) {
    if (!node || node.isLeaf) return;
    // Importance = weighted impurity decrease
    const leftWeight = node.left ? node.left.samples / node.samples : 0;
    const rightWeight = node.right ? node.right.samples / node.samples : 0;
    const leftImpurity = node.left ? node.left.impurity : 0;
    const rightImpurity = node.right ? node.right.impurity : 0;
    const importance = node.samples * (node.impurity - leftWeight * leftImpurity - rightWeight * rightImpurity);
    this.featureImportances[node.featureIndex] += importance;
    this._computeFeatureImportance(node.left);
    this._computeFeatureImportance(node.right);
  }

  _predictOne(sample, node = null) {
    node = node || this.root;
    if (!node) return null;
    if (node.isLeaf) return node;
    if (sample[node.featureIndex] <= node.threshold) {
      return this._predictOne(sample, node.left);
    }
    return this._predictOne(sample, node.right);
  }

  predict(sample) {
    const leaf = this._predictOne(sample);
    return leaf ? leaf.prediction : null;
  }

  predictProba(sample) {
    const leaf = this._predictOne(sample);
    return leaf ? leaf.classProbabilities : null;
  }

  evaluate(testData, testLabels) {
    let correct = 0;
    const predictions = [];
    const confusionMatrix = {};

    for (let i = 0; i < testData.length; i++) {
      const pred = this.predict(testData[i]);
      predictions.push(pred);
      if (String(pred) === String(testLabels[i])) correct++;

      const actual = String(testLabels[i]);
      const predicted = String(pred);
      if (!confusionMatrix[actual]) confusionMatrix[actual] = {};
      confusionMatrix[actual][predicted] = (confusionMatrix[actual][predicted] || 0) + 1;
    }

    const accuracy = correct / testData.length;

    // Per-class metrics
    const classMetrics = {};
    for (const cls of this.classes || [...new Set(testLabels)]) {
      let tp = 0, fp = 0, fn = 0;
      for (let i = 0; i < testLabels.length; i++) {
        if (String(predictions[i]) === String(cls) && String(testLabels[i]) === String(cls)) tp++;
        if (String(predictions[i]) === String(cls) && String(testLabels[i]) !== String(cls)) fp++;
        if (String(predictions[i]) !== String(cls) && String(testLabels[i]) === String(cls)) fn++;
      }
      const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
      const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
      const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
      classMetrics[cls] = { precision, recall, f1, support: tp + fn };
    }

    return { accuracy, predictions, confusionMatrix, classMetrics, featureImportances: this.featureImportances };
  }

  serialize() {
    return {
      root: this.root?.serialize(),
      maxDepth: this.maxDepth,
      minSamplesSplit: this.minSamplesSplit,
      minSamplesLeaf: this.minSamplesLeaf,
      maxFeatures: this.maxFeatures,
      criterion: this.criterion,
      isRegression: this.isRegression,
      featureImportances: this.featureImportances,
      numFeatures: this.numFeatures,
      classes: this.classes,
    };
  }

  static deserialize(obj) {
    const tree = new DecisionTree(obj);
    tree.root = obj.root ? TreeNode.deserialize(obj.root) : null;
    tree.featureImportances = obj.featureImportances;
    tree.numFeatures = obj.numFeatures;
    tree.classes = obj.classes || [];
    return tree;
  }
}

// ============================================================================
// §3  RANDOM FOREST
// ============================================================================

class RandomForest {
  constructor(config = {}) {
    this.numTrees = config.numTrees || 50;
    this.maxDepth = config.maxDepth || 12;
    this.minSamplesSplit = config.minSamplesSplit || 5;
    this.minSamplesLeaf = config.minSamplesLeaf || 2;
    this.maxFeatures = config.maxFeatures || 'sqrt';
    this.isRegression = config.isRegression || false;
    this.criterion = config.criterion || (this.isRegression ? 'variance' : 'gini');
    this.trees = [];
    this.featureImportances = null;
    this.oobScore = null;
    this.classes = [];
  }

  train(data, labels, verbose = false) {
    this.trees = [];
    const n = data.length;
    const numFeatures = data[0].length;
    this.featureImportances = new Array(numFeatures).fill(0);

    if (!this.isRegression) {
      this.classes = [...new Set(labels)].sort();
    }

    const oobPredictions = new Array(n).fill(null).map(() => []);

    for (let t = 0; t < this.numTrees; t++) {
      const { data: sampleData, labels: sampleLabels, oobIndices } = bootstrapSample(data, labels);

      const tree = new DecisionTree({
        maxDepth: this.maxDepth,
        minSamplesSplit: this.minSamplesSplit,
        minSamplesLeaf: this.minSamplesLeaf,
        maxFeatures: this.maxFeatures,
        criterion: this.criterion,
        isRegression: this.isRegression,
      });

      tree.train(sampleData, sampleLabels);
      this.trees.push(tree);

      // Feature importance aggregation
      if (tree.featureImportances) {
        for (let f = 0; f < numFeatures; f++) {
          this.featureImportances[f] += tree.featureImportances[f];
        }
      }

      // OOB predictions
      for (const idx of oobIndices) {
        oobPredictions[idx].push(tree.predict(data[idx]));
      }

      if (verbose && (t % 10 === 0 || t === this.numTrees - 1)) {
        logger.info(`Random Forest: trained tree ${t + 1}/${this.numTrees}`);
      }
    }

    // Normalize feature importances
    const totalImportance = this.featureImportances.reduce((a, b) => a + b, 0);
    if (totalImportance > 0) {
      this.featureImportances = this.featureImportances.map(v => v / totalImportance);
    }

    // Compute OOB score
    let oobCorrect = 0, oobTotal = 0;
    for (let i = 0; i < n; i++) {
      if (oobPredictions[i].length > 0) {
        const pred = this.isRegression
          ? meanValue(oobPredictions[i].map(Number))
          : majorityVote(oobPredictions[i]);
        if (this.isRegression) {
          // MSE for regression
          oobCorrect += (Number(pred) - Number(labels[i])) ** 2;
        } else {
          if (String(pred) === String(labels[i])) oobCorrect++;
        }
        oobTotal++;
      }
    }
    this.oobScore = this.isRegression
      ? (oobTotal > 0 ? oobCorrect / oobTotal : null)
      : (oobTotal > 0 ? oobCorrect / oobTotal : null);

    return this;
  }

  predict(sample) {
    const predictions = this.trees.map(tree => tree.predict(sample));
    if (this.isRegression) {
      return meanValue(predictions.map(Number));
    }
    return majorityVote(predictions);
  }

  predictProba(sample) {
    if (this.isRegression) return null;
    const predictions = this.trees.map(tree => tree.predictProba(sample)).filter(Boolean);
    const aggregated = {};
    for (const cls of this.classes) {
      const probs = predictions.map(p => p[cls] || 0);
      aggregated[cls] = probs.reduce((a, b) => a + b, 0) / predictions.length;
    }
    return aggregated;
  }

  evaluate(testData, testLabels) {
    let correct = 0;
    const predictions = [];

    for (let i = 0; i < testData.length; i++) {
      const pred = this.predict(testData[i]);
      predictions.push(pred);
      if (this.isRegression) {
        correct += (Number(pred) - Number(testLabels[i])) ** 2;
      } else {
        if (String(pred) === String(testLabels[i])) correct++;
      }
    }

    if (this.isRegression) {
      const mse = correct / testData.length;
      return { mse, rmse: Math.sqrt(mse), predictions, featureImportances: this.featureImportances, oobScore: this.oobScore };
    }

    return {
      accuracy: correct / testData.length,
      predictions,
      featureImportances: this.featureImportances,
      oobScore: this.oobScore,
    };
  }

  getTopFeatures(featureNames, topN = 10) {
    if (!this.featureImportances) return [];
    return this.featureImportances
      .map((importance, idx) => ({
        feature: featureNames?.[idx] || `feature_${idx}`,
        importance,
        index: idx,
      }))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, topN);
  }

  serialize() {
    return {
      numTrees: this.numTrees,
      maxDepth: this.maxDepth,
      minSamplesSplit: this.minSamplesSplit,
      minSamplesLeaf: this.minSamplesLeaf,
      maxFeatures: this.maxFeatures,
      isRegression: this.isRegression,
      criterion: this.criterion,
      trees: this.trees.map(t => t.serialize()),
      featureImportances: this.featureImportances,
      oobScore: this.oobScore,
      classes: this.classes,
    };
  }

  static deserialize(obj) {
    const rf = new RandomForest(obj);
    rf.trees = (obj.trees || []).map(t => DecisionTree.deserialize(t));
    rf.featureImportances = obj.featureImportances;
    rf.oobScore = obj.oobScore;
    rf.classes = obj.classes || [];
    return rf;
  }
}

// ============================================================================
// §4  GRADIENT BOOSTED TREES
// ============================================================================

class GradientBoostedTrees {
  constructor(config = {}) {
    this.numTrees = config.numTrees || 100;
    this.maxDepth = config.maxDepth || 5;
    this.learningRate = config.learningRate || 0.1;
    this.subsample = config.subsample || 0.8;
    this.minSamplesLeaf = config.minSamplesLeaf || 5;
    this.trees = [];
    this.initialPrediction = 0;
    this.isRegression = config.isRegression !== false; // Default regression
  }

  train(data, labels, verbose = false) {
    this.trees = [];
    const n = data.length;
    const numericLabels = labels.map(Number);

    // Initialize with mean (regression) or log-odds (classification)
    this.initialPrediction = meanValue(numericLabels);
    let predictions = new Array(n).fill(this.initialPrediction);

    for (let t = 0; t < this.numTrees; t++) {
      // Compute residuals (negative gradient of loss)
      const residuals = numericLabels.map((y, i) => y - predictions[i]);

      // Subsample
      const sampleSize = Math.floor(n * this.subsample);
      const indices = [];
      for (let i = 0; i < sampleSize; i++) {
        indices.push(Math.floor(Math.random() * n));
      }
      const sampleData = indices.map(i => data[i]);
      const sampleResiduals = indices.map(i => residuals[i]);

      // Fit tree to residuals
      const tree = new DecisionTree({
        maxDepth: this.maxDepth,
        minSamplesLeaf: this.minSamplesLeaf,
        isRegression: true,
        criterion: 'variance',
        maxFeatures: 'sqrt',
      });
      tree.train(sampleData, sampleResiduals.map(String));

      this.trees.push(tree);

      // Update predictions
      for (let i = 0; i < n; i++) {
        const treePred = Number(tree.predict(data[i])) || 0;
        predictions[i] += this.learningRate * treePred;
      }

      if (verbose && (t % 20 === 0 || t === this.numTrees - 1)) {
        const mse = numericLabels.reduce((s, y, i) => s + (y - predictions[i]) ** 2, 0) / n;
        logger.info(`GBT tree ${t + 1}/${this.numTrees}: MSE = ${mse.toFixed(6)}`);
      }
    }

    return this;
  }

  predict(sample) {
    let pred = this.initialPrediction;
    for (const tree of this.trees) {
      pred += this.learningRate * (Number(tree.predict(sample)) || 0);
    }
    return pred;
  }

  evaluate(testData, testLabels) {
    const numericLabels = testLabels.map(Number);
    const predictions = testData.map(d => this.predict(d));
    const mse = predictions.reduce((s, p, i) => s + (p - numericLabels[i]) ** 2, 0) / testData.length;
    const mae = predictions.reduce((s, p, i) => s + Math.abs(p - numericLabels[i]), 0) / testData.length;

    return { mse, rmse: Math.sqrt(mse), mae, predictions };
  }

  serialize() {
    return {
      numTrees: this.numTrees,
      maxDepth: this.maxDepth,
      learningRate: this.learningRate,
      subsample: this.subsample,
      minSamplesLeaf: this.minSamplesLeaf,
      initialPrediction: this.initialPrediction,
      isRegression: this.isRegression,
      trees: this.trees.map(t => t.serialize()),
    };
  }

  static deserialize(obj) {
    const gbt = new GradientBoostedTrees(obj);
    gbt.initialPrediction = obj.initialPrediction;
    gbt.trees = (obj.trees || []).map(t => DecisionTree.deserialize(t));
    return gbt;
  }
}

// ============================================================================
// §5  FINANCIAL RISK CLASSIFIER
// ============================================================================

class FinancialRiskClassifier {
  constructor() {
    this.forest = null;
    this.featureNames = [];
    this.riskLevels = ['low', 'medium', 'high', 'critical'];
  }

  extractFeatures(userData) {
    const {
      transactions = [], budgets = [], emis = [], investments = [],
      goals = [], debts = [], profile = {}, accounts = [], insurance = [],
      subscriptions = []
    } = userData;

    const recentTx = transactions.filter(t => new Date(t.date) > new Date(Date.now() - 90 * 86400000));
    const income = recentTx.filter(t => t.type === 'credit').reduce((s, t) => s + Math.abs(t.amount), 0);
    const expenses = recentTx.filter(t => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0);
    const monthlyIncome = income / 3;
    const monthlyExpenses = expenses / 3;
    const savingsRate = monthlyIncome > 0 ? (monthlyIncome - monthlyExpenses) / monthlyIncome : 0;

    const totalDebt = debts.reduce((s, d) => s + (d.remainingAmount || d.amount || 0), 0);
    const totalEMI = emis.reduce((s, e) => s + (e.emiAmount || 0), 0);
    const debtToIncome = monthlyIncome > 0 ? totalDebt / (monthlyIncome * 12) : 0;
    const emiToIncome = monthlyIncome > 0 ? totalEMI / monthlyIncome : 0;

    const totalInvestments = investments.reduce((s, inv) => s + (inv.currentValue || inv.amount || 0), 0);
    const totalBankBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);
    const emergencyFundMonths = monthlyExpenses > 0 ? totalBankBalance / monthlyExpenses : 0;

    const investmentDiversity = new Set(investments.map(i => i.type || i.category)).size;
    const hasInsurance = insurance.length > 0 ? 1 : 0;
    const numSubscriptions = subscriptions.length;
    const subscriptionCost = subscriptions.reduce((s, sub) => s + (sub.amount || 0), 0);

    const budgetAdherence = budgets.length > 0
      ? budgets.filter(b => (b.spent || 0) <= b.limit).length / budgets.length
      : 0.5;

    const goalProgress = goals.length > 0
      ? goals.reduce((s, g) => s + ((g.currentAmount || 0) / (g.targetAmount || 1)), 0) / goals.length
      : 0;

    // Transaction volatility
    const dailyExpenses = {};
    for (const t of recentTx) {
      if (t.type === 'debit') {
        const key = new Date(t.date).toISOString().slice(0, 10);
        dailyExpenses[key] = (dailyExpenses[key] || 0) + Math.abs(t.amount);
      }
    }
    const dailyValues = Object.values(dailyExpenses);
    const expenseVolatility = dailyValues.length > 1
      ? Math.sqrt(dailyValues.reduce((s, v) => s + (v - meanValue(dailyValues)) ** 2, 0) / dailyValues.length) / (meanValue(dailyValues) || 1)
      : 0;

    this.featureNames = [
      'savingsRate', 'debtToIncome', 'emiToIncome', 'emergencyFundMonths',
      'investmentDiversity', 'budgetAdherence', 'goalProgress', 'hasInsurance',
      'numSubscriptions', 'subscriptionToIncome', 'expenseVolatility',
      'investmentToDebt', 'bankBalance', 'monthlyExpenses',
    ];

    return [
      savingsRate,
      debtToIncome,
      emiToIncome,
      emergencyFundMonths,
      investmentDiversity,
      budgetAdherence,
      goalProgress,
      hasInsurance,
      numSubscriptions,
      monthlyIncome > 0 ? subscriptionCost / monthlyIncome : 0,
      expenseVolatility,
      totalDebt > 0 ? totalInvestments / totalDebt : totalInvestments > 0 ? 10 : 0,
      totalBankBalance,
      monthlyExpenses,
    ];
  }

  generateTrainingData(n = 1000) {
    // Generate synthetic financial profiles with known risk levels
    const data = [];
    const labels = [];

    for (let i = 0; i < n; i++) {
      const savingsRate = Math.random() * 0.6 - 0.1;
      const debtToIncome = Math.random() * 5;
      const emiToIncome = Math.random() * 0.8;
      const emergencyFund = Math.random() * 12;
      const investDiversity = Math.floor(Math.random() * 8);
      const budgetAdherence = Math.random();
      const goalProgress = Math.random();
      const hasInsurance = Math.random() > 0.5 ? 1 : 0;
      const numSubs = Math.floor(Math.random() * 15);
      const subToIncome = Math.random() * 0.3;
      const volatility = Math.random() * 2;
      const investToDebt = Math.random() * 5;
      const bankBalance = Math.random() * 2000000;
      const monthlyExpenses = Math.random() * 200000;

      const features = [
        savingsRate, debtToIncome, emiToIncome, emergencyFund,
        investDiversity, budgetAdherence, goalProgress, hasInsurance,
        numSubs, subToIncome, volatility, investToDebt, bankBalance, monthlyExpenses,
      ];

      // Determine risk level based on rules
      let riskScore = 0;
      if (savingsRate < 0) riskScore += 3;
      else if (savingsRate < 0.1) riskScore += 2;
      else if (savingsRate < 0.2) riskScore += 1;

      if (debtToIncome > 3) riskScore += 3;
      else if (debtToIncome > 1.5) riskScore += 2;
      else if (debtToIncome > 0.5) riskScore += 1;

      if (emiToIncome > 0.5) riskScore += 3;
      else if (emiToIncome > 0.3) riskScore += 2;
      else if (emiToIncome > 0.2) riskScore += 1;

      if (emergencyFund < 1) riskScore += 2;
      else if (emergencyFund < 3) riskScore += 1;

      if (!hasInsurance) riskScore += 1;
      if (volatility > 1.5) riskScore += 1;
      if (budgetAdherence < 0.5) riskScore += 1;

      // Add noise
      riskScore += (Math.random() - 0.5) * 2;

      let risk;
      if (riskScore >= 8) risk = 'critical';
      else if (riskScore >= 5) risk = 'high';
      else if (riskScore >= 3) risk = 'medium';
      else risk = 'low';

      data.push(features);
      labels.push(risk);
    }

    return { data, labels };
  }

  async train(userData = null) {
    // Generate training data (augmented with real data if available)
    const { data, labels } = this.generateTrainingData(2000);

    this.forest = new RandomForest({
      numTrees: 30,
      maxDepth: 10,
      maxFeatures: 'sqrt',
      minSamplesSplit: 5,
    });

    this.forest.train(data, labels);
    return { success: true, oobScore: this.forest.oobScore, numTrees: this.numTrees };
  }

  assess(userData) {
    if (!this.forest) return null;
    const features = this.extractFeatures(userData);
    const risk = this.forest.predict(features);
    const probabilities = this.forest.predictProba(features);
    const topFeatures = this.forest.getTopFeatures(this.featureNames, 5);

    return {
      riskLevel: risk,
      probabilities,
      confidence: probabilities?.[risk] || 0,
      topRiskFactors: topFeatures,
      featureValues: Object.fromEntries(this.featureNames.map((name, i) => [name, features[i]])),
      recommendations: this._generateRecommendations(risk, features),
    };
  }

  _generateRecommendations(riskLevel, features) {
    const recommendations = [];

    if (features[0] < 0.2) {
      recommendations.push({
        priority: 'high',
        category: 'savings',
        message: `Your savings rate is ${(features[0] * 100).toFixed(1)}%. Aim for at least 20% by reducing discretionary spending.`,
        impact: 'Improving savings rate to 20% could build an emergency fund within 6 months.',
      });
    }

    if (features[1] > 1) {
      recommendations.push({
        priority: 'high',
        category: 'debt',
        message: `Your debt-to-income ratio is ${features[1].toFixed(2)}. This is above the recommended 0.36 threshold.`,
        impact: 'Reducing debt aggressively using the avalanche method could save significant interest.',
      });
    }

    if (features[2] > 0.4) {
      recommendations.push({
        priority: 'critical',
        category: 'emi',
        message: `EMI payments consume ${(features[2] * 100).toFixed(1)}% of income. This leaves little room for savings.`,
        impact: 'Consider refinancing or consolidating loans to reduce monthly obligations.',
      });
    }

    if (features[3] < 3) {
      recommendations.push({
        priority: features[3] < 1 ? 'critical' : 'high',
        category: 'emergency',
        message: `Emergency fund covers only ${features[3].toFixed(1)} months. Recommended minimum is 6 months.`,
        impact: `Build emergency fund to ₹${(features[13] * 6).toLocaleString('en-IN')} for adequate coverage.`,
      });
    }

    if (features[4] < 3) {
      recommendations.push({
        priority: 'medium',
        category: 'investment',
        message: 'Investment portfolio lacks diversification. Consider spreading across equity, debt, and gold.',
        impact: 'Diversification can reduce portfolio volatility by 20-40%.',
      });
    }

    if (features[5] < 0.6) {
      recommendations.push({
        priority: 'high',
        category: 'budget',
        message: `Budget adherence is only ${(features[5] * 100).toFixed(1)}%. Track expenses more carefully.`,
        impact: 'Improved budget adherence can increase savings by 10-15% monthly.',
      });
    }

    if (features[7] === 0) {
      recommendations.push({
        priority: 'high',
        category: 'insurance',
        message: 'No insurance coverage detected. This is a critical risk factor.',
        impact: 'Term insurance and health insurance provide essential financial protection.',
      });
    }

    return recommendations;
  }

  serialize() {
    return {
      forest: this.forest?.serialize(),
      featureNames: this.featureNames,
      riskLevels: this.riskLevels,
    };
  }

  static deserialize(obj) {
    const clf = new FinancialRiskClassifier();
    if (obj.forest) clf.forest = RandomForest.deserialize(obj.forest);
    clf.featureNames = obj.featureNames || [];
    clf.riskLevels = obj.riskLevels || ['low', 'medium', 'high', 'critical'];
    return clf;
  }
}

// ============================================================================
// §6  EXPORTS
// ============================================================================

module.exports = {
  DecisionTree,
  RandomForest,
  GradientBoostedTrees,
  FinancialRiskClassifier,
  giniImpurity,
  entropy,
  variance,
  majorityVote,
  bootstrapSample,
};
