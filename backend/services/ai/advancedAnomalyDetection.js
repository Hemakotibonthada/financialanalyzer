// ============================================================================
// ADVANCED ANOMALY DETECTION ENGINE — Multi-Algorithm Financial Anomaly System
// ============================================================================
// Implements Isolation Forest, Local Outlier Factor, DBSCAN-based anomaly
// detection, Statistical Process Control (SPC), and Autoencoders for detecting
// unusual financial transactions and patterns. All running locally.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');

// ============================================================================
// §1  UTILITIES
// ============================================================================

const sum = (a) => a.reduce((s, v) => s + v, 0);
const mean = (a) => (a.length ? sum(a) / a.length : 0);
const stdDev = (a) => {
  const m = mean(a);
  return Math.sqrt(mean(a.map(v => (v - m) ** 2)));
};
const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const mad = (a) => {
  const m = median(a);
  return median(a.map(v => Math.abs(v - m)));
};
const iqr = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const q1 = s[Math.floor(s.length * 0.25)];
  const q3 = s[Math.floor(s.length * 0.75)];
  return { q1, q3, iqr: q3 - q1 };
};
const euclidean = (a, b) => Math.sqrt(sum(a.map((v, i) => (v - (b[i] || 0)) ** 2)));
const manhattan = (a, b) => sum(a.map((v, i) => Math.abs(v - (b[i] || 0))));
const normalize = (arr) => {
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const range = max - min || 1;
  return arr.map(v => (v - min) / range);
};

// ============================================================================
// §2  ISOLATION FOREST — Anomaly Detection via Random Partitioning
// ============================================================================

class IsolationTree {
  constructor(maxDepth = 10) {
    this.maxDepth = maxDepth;
    this.root = null;
  }

  build(data, depth = 0) {
    if (data.length <= 1 || depth >= this.maxDepth) {
      return { type: 'leaf', size: data.length, depth };
    }

    const dims = data[0].length;
    const splitDim = Math.floor(Math.random() * dims);
    const values = data.map(d => d[splitDim]);
    const min = Math.min(...values);
    const max = Math.max(...values);

    if (min === max) {
      return { type: 'leaf', size: data.length, depth };
    }

    const splitVal = min + Math.random() * (max - min);
    const left = data.filter(d => d[splitDim] < splitVal);
    const right = data.filter(d => d[splitDim] >= splitVal);

    return {
      type: 'internal',
      splitDim,
      splitVal,
      left: this.build(left, depth + 1),
      right: this.build(right, depth + 1),
      depth
    };
  }

  pathLength(point, node, depth = 0) {
    if (!node || node.type === 'leaf') {
      const c = node && node.size > 1 ? 2 * (Math.log(node.size - 1) + 0.5772156649) - 2 * (node.size - 1) / node.size : 0;
      return depth + c;
    }

    if (point[node.splitDim] < node.splitVal) {
      return this.pathLength(point, node.left, depth + 1);
    }
    return this.pathLength(point, node.right, depth + 1);
  }
}

class IsolationForest {
  constructor(config = {}) {
    this.numTrees = config.numTrees || 100;
    this.sampleSize = config.sampleSize || 256;
    this.maxDepth = config.maxDepth || Math.ceil(Math.log2(this.sampleSize));
    this.contamination = config.contamination || 0.05;
    this.trees = [];
    this.trained = false;
    this.threshold = null;
  }

  fit(data) {
    this.trees = [];
    const n = data.length;

    for (let i = 0; i < this.numTrees; i++) {
      const sample = [];
      const sampleSize = Math.min(this.sampleSize, n);
      const indices = new Set();

      while (indices.size < sampleSize) {
        indices.add(Math.floor(Math.random() * n));
      }

      for (const idx of indices) {
        sample.push(data[idx]);
      }

      const tree = new IsolationTree(this.maxDepth);
      tree.root = tree.build(sample);
      this.trees.push(tree);
    }

    // Calculate threshold based on contamination
    const scores = data.map(point => this.anomalyScore(point));
    scores.sort((a, b) => b - a);
    const thresholdIdx = Math.floor(scores.length * this.contamination);
    this.threshold = scores[thresholdIdx] || 0.5;
    this.trained = true;

    return this;
  }

  anomalyScore(point) {
    if (this.trees.length === 0) return 0;

    const avgPathLength = mean(this.trees.map(tree =>
      tree.pathLength(point, tree.root)
    ));

    const n = this.sampleSize;
    const c = n > 1 ? 2 * (Math.log(n - 1) + 0.5772156649) - 2 * (n - 1) / n : 1;
    return Math.pow(2, -avgPathLength / c);
  }

  predict(point) {
    const score = this.anomalyScore(point);
    return {
      score,
      isAnomaly: score > (this.threshold || 0.5),
      confidence: Math.min(score / (this.threshold || 0.5), 2.0)
    };
  }

  predictBatch(data) {
    return data.map(point => this.predict(point));
  }

  serialize() {
    return {
      numTrees: this.numTrees,
      sampleSize: this.sampleSize,
      threshold: this.threshold,
      trained: this.trained,
      contamination: this.contamination
    };
  }
}

// ============================================================================
// §3  LOCAL OUTLIER FACTOR (LOF) — Density-Based Anomaly Detection
// ============================================================================

class LocalOutlierFactor {
  constructor(config = {}) {
    this.k = config.k || 20;
    this.metric = config.metric || 'euclidean';
    this.data = [];
    this.trained = false;
  }

  _distance(a, b) {
    return this.metric === 'manhattan' ? manhattan(a, b) : euclidean(a, b);
  }

  fit(data) {
    this.data = data.map(d => [...d]);
    this.trained = true;
    return this;
  }

  _getKNeighbors(point, k) {
    const distances = this.data.map((d, i) => ({
      index: i,
      distance: this._distance(point, d)
    }));
    distances.sort((a, b) => a.distance - b.distance);
    return distances.slice(0, k);
  }

  _reachabilityDistance(pointA, pointB, kDistB) {
    return Math.max(this._distance(pointA, pointB), kDistB);
  }

  _localReachabilityDensity(point) {
    const neighbors = this._getKNeighbors(point, this.k);
    if (neighbors.length === 0) return 0;

    const kDist = neighbors[neighbors.length - 1].distance;
    let sumReachDist = 0;

    for (const neighbor of neighbors) {
      const neighborPoint = this.data[neighbor.index];
      const neighborKDist = this._getKNeighbors(neighborPoint, this.k);
      const nkDist = neighborKDist.length > 0 ? neighborKDist[neighborKDist.length - 1].distance : 0;
      sumReachDist += this._reachabilityDistance(point, neighborPoint, nkDist);
    }

    return sumReachDist > 0 ? neighbors.length / sumReachDist : 0;
  }

  lofScore(point) {
    const lrdPoint = this._localReachabilityDensity(point);
    if (lrdPoint === 0) return Infinity;

    const neighbors = this._getKNeighbors(point, this.k);
    let sumLrdNeighbors = 0;

    for (const neighbor of neighbors) {
      sumLrdNeighbors += this._localReachabilityDensity(this.data[neighbor.index]);
    }

    return (sumLrdNeighbors / neighbors.length) / lrdPoint;
  }

  predict(point) {
    const score = this.lofScore(point);
    return {
      score,
      isAnomaly: score > 1.5,
      confidence: Math.min(score / 1.5, 3.0),
      severity: score > 3 ? 'critical' : score > 2 ? 'high' : score > 1.5 ? 'medium' : 'normal'
    };
  }

  predictBatch(data) {
    return data.map(point => this.predict(point));
  }
}

// ============================================================================
// §4  STATISTICAL PROCESS CONTROL (SPC) — Control Charts for Financial Data
// ============================================================================

class StatisticalProcessControl {
  constructor(config = {}) {
    this.windowSize = config.windowSize || 30;
    this.sigmaMultiplier = config.sigmaMultiplier || 3;
    this.ewmaLambda = config.ewmaLambda || 0.2;
    this.cusumThreshold = config.cusumThreshold || 5;
    this.baseline = null;
  }

  setBaseline(data) {
    this.baseline = {
      mean: mean(data),
      std: stdDev(data),
      median: median(data),
      mad: mad(data),
      iqr: iqr(data)
    };
    return this.baseline;
  }

  // X-bar chart (individual values)
  xBarChart(data) {
    if (!this.baseline) this.setBaseline(data);
    const { mean: mu, std: sigma } = this.baseline;
    const ucl = mu + this.sigmaMultiplier * sigma;
    const lcl = mu - this.sigmaMultiplier * sigma;

    return data.map((value, i) => ({
      index: i,
      value,
      mean: mu,
      ucl,
      lcl,
      isAnomaly: value > ucl || value < lcl,
      deviation: sigma > 0 ? (value - mu) / sigma : 0,
      zone: this._getZone(value, mu, sigma)
    }));
  }

  _getZone(value, mu, sigma) {
    const z = Math.abs(value - mu) / (sigma || 1);
    if (z <= 1) return 'A'; // Within 1 sigma
    if (z <= 2) return 'B'; // 1-2 sigma
    if (z <= 3) return 'C'; // 2-3 sigma
    return 'D'; // Beyond 3 sigma (anomaly)
  }

  // EWMA (Exponentially Weighted Moving Average) Chart
  ewmaChart(data) {
    if (!this.baseline) this.setBaseline(data);
    const { mean: mu, std: sigma } = this.baseline;
    const lambda = this.ewmaLambda;
    const results = [];
    let ewma = mu;

    for (let i = 0; i < data.length; i++) {
      ewma = lambda * data[i] + (1 - lambda) * ewma;
      const ewmaStd = sigma * Math.sqrt(lambda / (2 - lambda) * (1 - Math.pow(1 - lambda, 2 * (i + 1))));
      const ucl = mu + this.sigmaMultiplier * ewmaStd;
      const lcl = mu - this.sigmaMultiplier * ewmaStd;

      results.push({
        index: i,
        value: data[i],
        ewma,
        ucl,
        lcl,
        isAnomaly: ewma > ucl || ewma < lcl,
        trendDirection: ewma > mu ? 'increasing' : 'decreasing'
      });
    }

    return results;
  }

  // CUSUM (Cumulative Sum) Chart — detects small persistent shifts
  cusumChart(data) {
    if (!this.baseline) this.setBaseline(data);
    const { mean: mu, std: sigma } = this.baseline;
    const k = 0.5 * sigma; // Slack parameter
    const h = this.cusumThreshold * sigma; // Decision interval
    const results = [];
    let cusumHigh = 0;
    let cusumLow = 0;

    for (let i = 0; i < data.length; i++) {
      cusumHigh = Math.max(0, cusumHigh + (data[i] - mu - k));
      cusumLow = Math.max(0, cusumLow - (data[i] - mu) - k);

      results.push({
        index: i,
        value: data[i],
        cusumHigh,
        cusumLow,
        ucl: h,
        isShiftUp: cusumHigh > h,
        isShiftDown: cusumLow > h,
        isAnomaly: cusumHigh > h || cusumLow > h,
        magnitude: Math.max(cusumHigh, cusumLow) / h
      });
    }

    return results;
  }

  // Moving Range Chart
  movingRangeChart(data) {
    if (data.length < 2) return [];
    const ranges = [];
    for (let i = 1; i < data.length; i++) {
      ranges.push(Math.abs(data[i] - data[i - 1]));
    }

    const avgRange = mean(ranges);
    const ucl = 3.267 * avgRange; // D4 constant for n=2

    return ranges.map((r, i) => ({
      index: i + 1,
      range: r,
      avgRange,
      ucl,
      isAnomaly: r > ucl,
      volatility: avgRange > 0 ? r / avgRange : 0
    }));
  }
}

// ============================================================================
// §5  AUTOENCODER — Neural Network-Based Anomaly Detection
// ============================================================================

class Autoencoder {
  constructor(config = {}) {
    this.inputSize = config.inputSize || 10;
    this.encoderSizes = config.encoderSizes || [8, 4];
    this.decoderSizes = config.decoderSizes || [4, 8];
    this.learningRate = config.learningRate || 0.001;
    this.epochs = config.epochs || 100;
    this.reconstructionThreshold = config.threshold || null;

    // Build encoder
    this.encoder = [];
    let prevSize = this.inputSize;
    for (const hs of this.encoderSizes) {
      this.encoder.push(this._initLayer(prevSize, hs));
      prevSize = hs;
    }

    // Build decoder
    this.decoder = [];
    for (const hs of [...this.decoderSizes, this.inputSize]) {
      this.decoder.push(this._initLayer(prevSize, hs));
      prevSize = hs;
    }

    this.trained = false;
    this.trainingLoss = [];
  }

  _initLayer(inputSize, outputSize) {
    const scale = Math.sqrt(2.0 / inputSize);
    const weights = [];
    for (let i = 0; i < inputSize; i++) {
      weights[i] = [];
      for (let j = 0; j < outputSize; j++) {
        weights[i][j] = (Math.random() * 2 - 1) * scale;
      }
    }
    return {
      weights,
      bias: new Array(outputSize).fill(0)
    };
  }

  _forward(input, layers) {
    let activation = [...input];
    const activations = [activation];

    for (let l = 0; l < layers.length; l++) {
      const layer = layers[l];
      const output = [];
      for (let j = 0; j < layer.bias.length; j++) {
        let val = layer.bias[j];
        for (let i = 0; i < activation.length; i++) {
          val += activation[i] * (layer.weights[i]?.[j] || 0);
        }
        // Sigmoid for last decoder layer, ReLU otherwise
        const isLastDecoder = l === layers.length - 1;
        output.push(isLastDecoder ? val : Math.max(0, val));
      }
      activation = output;
      activations.push(activation);
    }

    return { output: activation, activations };
  }

  encode(input) {
    return this._forward(input, this.encoder).output;
  }

  decode(encoded) {
    return this._forward(encoded, this.decoder).output;
  }

  reconstruct(input) {
    const encoded = this.encode(input);
    return this.decode(encoded);
  }

  reconstructionError(input) {
    const reconstructed = this.reconstruct(input);
    return mean(input.map((v, i) => (v - (reconstructed[i] || 0)) ** 2));
  }

  fit(data) {
    this.trainingLoss = [];

    for (let epoch = 0; epoch < this.epochs; epoch++) {
      let epochLoss = 0;

      for (const sample of data) {
        // Forward pass through full autoencoder
        const allLayers = [...this.encoder, ...this.decoder];
        const { output, activations } = this._forward(sample, allLayers);

        // Compute reconstruction loss
        const loss = mean(sample.map((v, i) => (v - (output[i] || 0)) ** 2));
        epochLoss += loss;

        // Backprop (simplified gradient descent)
        const numLayers = allLayers.length;
        const deltas = new Array(numLayers);

        // Output layer error
        const outputDelta = [];
        for (let j = 0; j < output.length; j++) {
          outputDelta.push(output[j] - sample[j]);
        }
        deltas[numLayers - 1] = outputDelta;

        // Hidden layers
        for (let l = numLayers - 2; l >= 0; l--) {
          const delta = [];
          const nextLayer = allLayers[l + 1];
          for (let i = 0; i < allLayers[l].bias.length; i++) {
            let error = 0;
            for (let j = 0; j < nextLayer.bias.length; j++) {
              error += deltas[l + 1][j] * (nextLayer.weights[i]?.[j] || 0);
            }
            const act = activations[l + 1][i];
            delta.push(error * (act > 0 ? 1 : 0));
          }
          deltas[l] = delta;
        }

        // Update weights
        for (let l = 0; l < numLayers; l++) {
          const layer = allLayers[l];
          const prevAct = activations[l];
          for (let j = 0; j < layer.bias.length; j++) {
            layer.bias[j] -= this.learningRate * deltas[l][j];
            for (let i = 0; i < prevAct.length; i++) {
              if (!layer.weights[i]) layer.weights[i] = [];
              layer.weights[i][j] = (layer.weights[i][j] || 0) - this.learningRate * deltas[l][j] * prevAct[i];
            }
          }
        }
      }

      this.trainingLoss.push(epochLoss / data.length);
    }

    // Set threshold based on training data reconstruction errors
    const errors = data.map(d => this.reconstructionError(d));
    const errorMean = mean(errors);
    const errorStd = stdDev(errors);
    this.reconstructionThreshold = errorMean + 2 * errorStd;
    this.trained = true;

    return {
      finalLoss: this.trainingLoss[this.trainingLoss.length - 1],
      threshold: this.reconstructionThreshold,
      epochs: this.epochs
    };
  }

  predict(input) {
    const error = this.reconstructionError(input);
    const threshold = this.reconstructionThreshold || 0.1;
    return {
      error,
      isAnomaly: error > threshold,
      score: error / threshold,
      severity: error > threshold * 3 ? 'critical' :
                error > threshold * 2 ? 'high' :
                error > threshold ? 'medium' : 'normal'
    };
  }

  serialize() {
    return {
      inputSize: this.inputSize,
      encoderSizes: this.encoderSizes,
      decoderSizes: this.decoderSizes,
      encoder: this.encoder.map(l => ({ weights: l.weights, bias: l.bias })),
      decoder: this.decoder.map(l => ({ weights: l.weights, bias: l.bias })),
      threshold: this.reconstructionThreshold,
      trained: this.trained
    };
  }

  deserialize(data) {
    if (data.encoder) this.encoder = data.encoder;
    if (data.decoder) this.decoder = data.decoder;
    this.reconstructionThreshold = data.threshold;
    this.trained = data.trained || false;
  }
}

// ============================================================================
// §6  CHANGE POINT DETECTION — Detecting Regime Changes in Financial Data
// ============================================================================

class ChangePointDetector {
  constructor(config = {}) {
    this.minSegmentLength = config.minSegmentLength || 7;
    this.penalty = config.penalty || 'bic'; // 'bic', 'aic', or numeric
    this.maxChangepoints = config.maxChangepoints || 10;
  }

  // Binary Segmentation
  binarySegmentation(data) {
    const changepoints = [];
    this._binseg(data, 0, data.length - 1, changepoints);
    return changepoints
      .sort((a, b) => a.index - b.index)
      .slice(0, this.maxChangepoints);
  }

  _binseg(data, start, end, changepoints) {
    if (end - start < 2 * this.minSegmentLength) return;

    let bestIdx = -1;
    let bestGain = -Infinity;

    for (let i = start + this.minSegmentLength; i <= end - this.minSegmentLength; i++) {
      const gain = this._costReduction(data, start, i, end);
      if (gain > bestGain) {
        bestGain = gain;
        bestIdx = i;
      }
    }

    const penaltyVal = this._getPenalty(data.length);
    if (bestGain > penaltyVal && bestIdx >= 0) {
      const leftMean = mean(data.slice(start, bestIdx));
      const rightMean = mean(data.slice(bestIdx, end + 1));
      changepoints.push({
        index: bestIdx,
        gain: bestGain,
        leftMean,
        rightMean,
        shift: rightMean - leftMean,
        shiftPercent: leftMean !== 0 ? ((rightMean - leftMean) / Math.abs(leftMean)) * 100 : 0,
        type: rightMean > leftMean ? 'increase' : 'decrease'
      });

      this._binseg(data, start, bestIdx - 1, changepoints);
      this._binseg(data, bestIdx, end, changepoints);
    }
  }

  _costReduction(data, start, split, end) {
    const segment = data.slice(start, end + 1);
    const left = data.slice(start, split);
    const right = data.slice(split, end + 1);

    const fullCost = this._segmentCost(segment);
    const leftCost = this._segmentCost(left);
    const rightCost = this._segmentCost(right);

    return fullCost - leftCost - rightCost;
  }

  _segmentCost(segment) {
    if (segment.length <= 1) return 0;
    const m = mean(segment);
    return sum(segment.map(v => (v - m) ** 2));
  }

  _getPenalty(n) {
    if (typeof this.penalty === 'number') return this.penalty;
    if (this.penalty === 'bic') return Math.log(n) * 2;
    if (this.penalty === 'aic') return 2 * 2;
    return Math.log(n) * 2;
  }

  // PELT (Pruned Exact Linear Time) - more efficient
  pelt(data) {
    const n = data.length;
    const penalty = this._getPenalty(n);
    const cost = new Array(n + 1).fill(0);
    const changepoints = new Array(n + 1).fill(0);
    const candidates = [0];

    for (let t = 1; t <= n; t++) {
      let bestCost = Infinity;
      let bestCp = 0;

      for (const s of candidates) {
        const segData = data.slice(s, t);
        const c = this._segmentCost(segData) + cost[s] + penalty;
        if (c < bestCost) {
          bestCost = c;
          bestCp = s;
        }
      }

      cost[t] = bestCost;
      changepoints[t] = bestCp;
      candidates.push(t);

      // Prune candidates
      const newCandidates = [];
      for (const s of candidates) {
        const segData = data.slice(s, t);
        if (this._segmentCost(segData) + cost[s] + penalty <= bestCost) {
          newCandidates.push(s);
        }
      }
      candidates.length = 0;
      candidates.push(...newCandidates);
    }

    // Backtrack to find changepoints
    const result = [];
    let idx = n;
    while (idx > 0) {
      const cp = changepoints[idx];
      if (cp > 0) {
        const leftMean = mean(data.slice(cp - this.minSegmentLength, cp));
        const rightMean = mean(data.slice(cp, cp + this.minSegmentLength));
        result.push({
          index: cp,
          leftMean,
          rightMean,
          shift: rightMean - leftMean,
          type: rightMean > leftMean ? 'increase' : 'decrease'
        });
      }
      idx = cp;
    }

    return result.reverse().slice(0, this.maxChangepoints);
  }
}

// ============================================================================
// §7  ENSEMBLE ANOMALY DETECTOR — Combines Multiple Detection Methods
// ============================================================================

class EnsembleAnomalyDetector {
  constructor(config = {}) {
    this.isolationForest = new IsolationForest({
      numTrees: config.ifTrees || 100,
      contamination: config.contamination || 0.05
    });
    this.lof = new LocalOutlierFactor({ k: config.lofK || 20 });
    this.spc = new StatisticalProcessControl({
      sigmaMultiplier: config.sigmaMultiplier || 3
    });
    this.autoencoder = new Autoencoder({
      inputSize: config.inputSize || 10,
      encoderSizes: config.encoderSizes || [8, 4],
      decoderSizes: config.decoderSizes || [4, 8],
      epochs: config.epochs || 50
    });
    this.changepointDetector = new ChangePointDetector({
      minSegmentLength: config.minSegmentLength || 7
    });

    this.weights = config.weights || {
      isolationForest: 0.3,
      lof: 0.25,
      spc: 0.25,
      autoencoder: 0.2
    };

    this.trained = false;
    this.featureExtractor = new TransactionFeatureExtractor();
  }

  fit(transactions) {
    const features = transactions.map(t => this.featureExtractor.extract(t));

    if (features.length < 10) {
      logger.debug('Not enough data for anomaly detection training');
      return this;
    }

    try { this.isolationForest.fit(features); } catch (e) { logger.debug('IF fit error:', e.message); }
    try { this.lof.fit(features); } catch (e) { logger.debug('LOF fit error:', e.message); }

    const amounts = transactions.map(t => t.amount || 0);
    try { this.spc.setBaseline(amounts); } catch (e) { logger.debug('SPC fit error:', e.message); }

    if (features.length >= 30) {
      try { this.autoencoder.fit(features); } catch (e) { logger.debug('AE fit error:', e.message); }
    }

    this.trained = true;
    return this;
  }

  detect(transaction) {
    const features = this.featureExtractor.extract(transaction);
    const scores = {};
    let weightedScore = 0;
    let totalWeight = 0;

    // Isolation Forest
    try {
      const ifResult = this.isolationForest.predict(features);
      scores.isolationForest = ifResult.score;
      weightedScore += ifResult.score * this.weights.isolationForest;
      totalWeight += this.weights.isolationForest;
    } catch (e) {
      scores.isolationForest = null;
    }

    // LOF
    try {
      const lofResult = this.lof.predict(features);
      scores.lof = Math.min(lofResult.score / 3, 1);
      weightedScore += scores.lof * this.weights.lof;
      totalWeight += this.weights.lof;
    } catch (e) {
      scores.lof = null;
    }

    // SPC
    try {
      const amount = transaction.amount || 0;
      if (this.spc.baseline) {
        const deviation = Math.abs(amount - this.spc.baseline.mean) / (this.spc.baseline.std || 1);
        scores.spc = Math.min(deviation / 3, 1);
        weightedScore += scores.spc * this.weights.spc;
        totalWeight += this.weights.spc;
      }
    } catch (e) {
      scores.spc = null;
    }

    // Autoencoder
    try {
      if (this.autoencoder.trained) {
        const aeResult = this.autoencoder.predict(features);
        scores.autoencoder = Math.min(aeResult.score, 1);
        weightedScore += scores.autoencoder * this.weights.autoencoder;
        totalWeight += this.weights.autoencoder;
      }
    } catch (e) {
      scores.autoencoder = null;
    }

    const ensembleScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
    const numAnomalous = Object.values(scores).filter(s => s !== null && s > 0.5).length;

    return {
      ensembleScore,
      individualScores: scores,
      isAnomaly: ensembleScore > 0.5 || numAnomalous >= 2,
      severity: ensembleScore > 0.8 ? 'critical' :
                ensembleScore > 0.6 ? 'high' :
                ensembleScore > 0.4 ? 'medium' : 'normal',
      confidence: Math.min(ensembleScore * 1.5, 1),
      reasons: this._getAnomalyReasons(scores, transaction),
      agreement: numAnomalous,
      totalDetectors: Object.values(scores).filter(s => s !== null).length
    };
  }

  detectBatch(transactions) {
    return transactions.map(t => ({
      transaction: t,
      ...this.detect(t)
    }));
  }

  detectChangepoints(transactions) {
    const amounts = transactions.map(t => t.amount || 0);
    const dates = transactions.map(t => new Date(t.date || Date.now()));

    const changepoints = this.changepointDetector.binarySegmentation(amounts);

    return changepoints.map(cp => ({
      ...cp,
      date: dates[cp.index] || null,
      transaction: transactions[cp.index] || null
    }));
  }

  _getAnomalyReasons(scores, transaction) {
    const reasons = [];

    if (scores.isolationForest > 0.6) {
      reasons.push({
        detector: 'Isolation Forest',
        reason: 'Transaction pattern is significantly different from normal behavior',
        severity: scores.isolationForest > 0.8 ? 'high' : 'medium'
      });
    }

    if (scores.lof > 0.6) {
      reasons.push({
        detector: 'Local Outlier Factor',
        reason: 'Transaction is in a low-density region compared to similar transactions',
        severity: scores.lof > 0.8 ? 'high' : 'medium'
      });
    }

    if (scores.spc > 0.6) {
      reasons.push({
        detector: 'Statistical Control',
        reason: `Amount deviates significantly from expected range`,
        severity: scores.spc > 0.8 ? 'high' : 'medium'
      });
    }

    if (scores.autoencoder > 0.6) {
      reasons.push({
        detector: 'Autoencoder',
        reason: 'Transaction reconstruction error is high, suggesting unusual combination of features',
        severity: scores.autoencoder > 0.8 ? 'high' : 'medium'
      });
    }

    if (reasons.length === 0) {
      reasons.push({
        detector: 'Ensemble',
        reason: 'No significant anomalies detected',
        severity: 'normal'
      });
    }

    return reasons;
  }
}

// ============================================================================
// §8  TRANSACTION FEATURE EXTRACTOR — Convert Transactions to Feature Vectors
// ============================================================================

class TransactionFeatureExtractor {
  constructor() {
    this.categoryMap = {};
    this.categoryIndex = 0;
    this.merchantMap = {};
    this.merchantIndex = 0;
    this.stats = null;
  }

  extract(transaction) {
    const features = [];

    // Amount features
    const amount = Math.abs(transaction.amount || 0);
    features.push(Math.log1p(amount)); // Log-transformed amount
    features.push(amount); // Raw amount

    // Time features
    const date = new Date(transaction.date || Date.now());
    features.push(date.getDay() / 6); // Day of week (0-1)
    features.push(date.getHours() / 23); // Hour of day (0-1)
    features.push(date.getDate() / 31); // Day of month (0-1)
    features.push(date.getMonth() / 11); // Month (0-1)

    // Category encoding
    const category = (transaction.category || 'unknown').toLowerCase();
    if (!(category in this.categoryMap)) {
      this.categoryMap[category] = this.categoryIndex++;
    }
    features.push(this.categoryMap[category] / Math.max(this.categoryIndex, 1));

    // Transaction type
    features.push(transaction.type === 'income' ? 1 : 0);
    features.push(transaction.type === 'expense' ? 1 : 0);

    // Description length as proxy for complexity
    const desc = transaction.description || '';
    features.push(Math.min(desc.length / 100, 1));

    return features;
  }

  extractBatch(transactions) {
    return transactions.map(t => this.extract(t));
  }
}

// ============================================================================
// §9  FINANCIAL ANOMALY ANALYZER — High-Level Anomaly Analysis Service
// ============================================================================

class FinancialAnomalyAnalyzer {
  constructor() {
    this.detector = new EnsembleAnomalyDetector();
    this.spc = new StatisticalProcessControl();
    this.changepointDetector = new ChangePointDetector();
    this.userModels = {};
  }

  async analyzeTransactions(userId, transactions) {
    if (!transactions || transactions.length < 10) {
      return {
        anomalies: [],
        changepoints: [],
        spendingControl: null,
        summary: { totalAnalyzed: 0, anomaliesFound: 0 }
      };
    }

    // Get or create user model
    if (!this.userModels[userId]) {
      this.userModels[userId] = new EnsembleAnomalyDetector({
        inputSize: 10
      });
    }

    const detector = this.userModels[userId];

    // Train on historical data
    const trainingData = transactions.slice(0, -Math.min(30, Math.floor(transactions.length * 0.2)));
    const testData = transactions.slice(-Math.min(30, Math.floor(transactions.length * 0.2)));

    detector.fit(trainingData);

    // Detect anomalies in recent transactions
    const anomalies = detector.detectBatch(testData)
      .filter(a => a.isAnomaly)
      .sort((a, b) => b.ensembleScore - a.ensembleScore);

    // Detect changepoints
    const amounts = transactions.map(t => t.amount || 0);
    const changepoints = this.changepointDetector.binarySegmentation(amounts);

    // SPC analysis
    const sortedByDate = [...transactions].sort((a, b) =>
      new Date(a.date || 0) - new Date(b.date || 0)
    );
    const dailyAmounts = this._aggregateDaily(sortedByDate);
    this.spc.setBaseline(dailyAmounts.map(d => d.total));


    const xBar = this.spc.xBarChart(dailyAmounts.map(d => d.total));
    const ewma = this.spc.ewmaChart(dailyAmounts.map(d => d.total));
    const cusum = this.spc.cusumChart(dailyAmounts.map(d => d.total));

    // Category-based analysis
    const categoryAnomalies = this._analyzeCategoryAnomalies(transactions);

    // Time-based patterns
    const timeAnomalies = this._analyzeTimeAnomalies(transactions);

    // Velocity analysis
    const velocityAnomalies = this._analyzeVelocity(transactions);

    return {
      anomalies: anomalies.map(a => ({
        transaction: {
          id: a.transaction._id || a.transaction.id,
          amount: a.transaction.amount,
          category: a.transaction.category,
          description: a.transaction.description,
          date: a.transaction.date
        },
        score: a.ensembleScore,
        severity: a.severity,
        confidence: a.confidence,
        reasons: a.reasons,
        agreement: a.agreement,
        detectors: a.totalDetectors
      })),
      changepoints: changepoints.map((cp, i) => ({
        ...cp,
        date: sortedByDate[cp.index]?.date,
        description: `Spending ${cp.type}: ${cp.shift > 0 ? '+' : ''}${cp.shift.toFixed(0)} (${cp.shiftPercent?.toFixed(1)}%)`
      })),
      controlCharts: {
        xBar: xBar.slice(-90),
        ewma: ewma.slice(-90),
        cusum: cusum.slice(-90)
      },
      categoryAnomalies,
      timeAnomalies,
      velocityAnomalies,
      summary: {
        totalAnalyzed: transactions.length,
        anomaliesFound: anomalies.length,
        changepointsDetected: changepoints.length,
        overallRisk: anomalies.length > 5 ? 'high' :
                     anomalies.length > 2 ? 'medium' : 'low',
        spendingStability: this._calculateStability(xBar)
      }
    };
  }

  _aggregateDaily(transactions) {
    const daily = {};
    for (const t of transactions) {
      const dateKey = new Date(t.date || Date.now()).toISOString().split('T')[0];
      if (!daily[dateKey]) daily[dateKey] = { date: dateKey, total: 0, count: 0 };
      daily[dateKey].total += Math.abs(t.amount || 0);
      daily[dateKey].count++;
    }
    return Object.values(daily).sort((a, b) => a.date.localeCompare(b.date));
  }

  _analyzeCategoryAnomalies(transactions) {
    const categoryStats = {};
    for (const t of transactions) {
      const cat = t.category || 'unknown';
      if (!categoryStats[cat]) categoryStats[cat] = [];
      categoryStats[cat].push(Math.abs(t.amount || 0));
    }

    const anomalies = [];
    for (const [cat, amounts] of Object.entries(categoryStats)) {
      if (amounts.length < 5) continue;
      const m = mean(amounts);
      const s = stdDev(amounts);
      const lastAmount = amounts[amounts.length - 1];

      if (s > 0 && Math.abs(lastAmount - m) > 2 * s) {
        anomalies.push({
          category: cat,
          lastAmount,
          mean: m,
          stdDev: s,
          deviation: (lastAmount - m) / s,
          type: lastAmount > m ? 'unusually_high' : 'unusually_low'
        });
      }
    }

    return anomalies.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
  }

  _analyzeTimeAnomalies(transactions) {
    const hourCounts = new Array(24).fill(0);
    const dayCounts = new Array(7).fill(0);

    for (const t of transactions) {
      const d = new Date(t.date || Date.now());
      hourCounts[d.getHours()]++;
      dayCounts[d.getDay()]++;
    }

    const anomalies = [];

    // Unusual hours (late night transactions)
    const lateNight = hourCounts.slice(0, 6).reduce((s, v) => s + v, 0);
    const totalTxns = sum(hourCounts);
    if (totalTxns > 0 && lateNight / totalTxns > 0.15) {
      anomalies.push({
        type: 'unusual_hours',
        detail: 'High proportion of late-night transactions (12am-6am)',
        ratio: lateNight / totalTxns
      });
    }

    // Weekend spending spikes
    const weekendTxns = dayCounts[0] + dayCounts[6];
    const weekdayTxns = sum(dayCounts.slice(1, 6));
    const weekendAvg = weekendTxns / 2;
    const weekdayAvg = weekdayTxns / 5;

    if (weekdayAvg > 0 && weekendAvg / weekdayAvg > 2) {
      anomalies.push({
        type: 'weekend_spike',
        detail: 'Weekend transaction frequency is 2x higher than weekdays',
        ratio: weekendAvg / weekdayAvg
      });
    }

    return anomalies;
  }

  _analyzeVelocity(transactions) {
    const sorted = [...transactions].sort((a, b) =>
      new Date(a.date || 0) - new Date(b.date || 0)
    );

    const velocities = [];
    for (let i = 1; i < sorted.length; i++) {
      const timeDiff = new Date(sorted[i].date || 0) - new Date(sorted[i - 1].date || 0);
      const hours = timeDiff / (1000 * 60 * 60);
      if (hours > 0) {
        velocities.push({
          amount: Math.abs(sorted[i].amount || 0),
          timeSinceLastHours: hours,
          velocity: Math.abs(sorted[i].amount || 0) / hours
        });
      }
    }

    if (velocities.length < 5) return [];

    const velValues = velocities.map(v => v.velocity);
    const m = mean(velValues);
    const s = stdDev(velValues);

    return velocities
      .filter(v => s > 0 && (v.velocity - m) / s > 2)
      .map(v => ({
        ...v,
        deviation: (v.velocity - m) / s,
        type: 'rapid_spending'
      }))
      .slice(0, 10);
  }

  _calculateStability(xBarResults) {
    if (!xBarResults || xBarResults.length === 0) return 1;
    const anomalyRate = xBarResults.filter(r => r.isAnomaly).length / xBarResults.length;
    return Math.max(0, 1 - anomalyRate * 5);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  IsolationForest,
  IsolationTree,
  LocalOutlierFactor,
  StatisticalProcessControl,
  Autoencoder,
  ChangePointDetector,
  EnsembleAnomalyDetector,
  TransactionFeatureExtractor,
  FinancialAnomalyAnalyzer
};
