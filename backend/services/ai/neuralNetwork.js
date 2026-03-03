// ============================================================================
// NEURAL NETWORK ENGINE — From-Scratch Deep Learning for Finance
// ============================================================================
// Production-grade neural network with backpropagation, multiple layer types,
// optimizers (SGD, Adam, RMSProp), regularization, batch normalization,
// dropout, learning rate scheduling, and model serialization.
// No external ML libraries required.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');

// ============================================================================
// §0  MATH UTILITIES
// ============================================================================

class Matrix {
  constructor(rows, cols, data = null) {
    this.rows = rows;
    this.cols = cols;
    this.data = data || new Float64Array(rows * cols);
  }

  static fromArray(arr) {
    const m = new Matrix(arr.length, 1);
    for (let i = 0; i < arr.length; i++) m.data[i] = arr[i];
    return m;
  }

  static from2D(arr2d) {
    const rows = arr2d.length;
    const cols = arr2d[0]?.length || 0;
    const m = new Matrix(rows, cols);
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        m.data[i * cols + j] = arr2d[i][j] || 0;
      }
    }
    return m;
  }

  get(r, c) { return this.data[r * this.cols + c]; }
  set(r, c, v) { this.data[r * this.cols + c] = v; }

  clone() {
    const m = new Matrix(this.rows, this.cols);
    m.data.set(this.data);
    return m;
  }

  toArray() {
    return Array.from(this.data);
  }

  to2D() {
    const result = [];
    for (let i = 0; i < this.rows; i++) {
      result.push(Array.from(this.data.slice(i * this.cols, (i + 1) * this.cols)));
    }
    return result;
  }

  add(other) {
    const result = new Matrix(this.rows, this.cols);
    if (other instanceof Matrix) {
      if (other.rows === 1 && other.cols === this.cols) {
        // Broadcasting: add row vector to each row
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.cols; j++) {
            result.data[i * this.cols + j] = this.data[i * this.cols + j] + other.data[j];
          }
        }
      } else {
        for (let i = 0; i < this.data.length; i++) {
          result.data[i] = this.data[i] + other.data[i];
        }
      }
    } else {
      for (let i = 0; i < this.data.length; i++) {
        result.data[i] = this.data[i] + other;
      }
    }
    return result;
  }

  subtract(other) {
    const result = new Matrix(this.rows, this.cols);
    if (other instanceof Matrix) {
      for (let i = 0; i < this.data.length; i++) {
        result.data[i] = this.data[i] - other.data[i];
      }
    } else {
      for (let i = 0; i < this.data.length; i++) {
        result.data[i] = this.data[i] - other;
      }
    }
    return result;
  }

  multiply(other) {
    if (other instanceof Matrix) {
      // Element-wise (Hadamard product)
      const result = new Matrix(this.rows, this.cols);
      for (let i = 0; i < this.data.length; i++) {
        result.data[i] = this.data[i] * other.data[i];
      }
      return result;
    }
    const result = new Matrix(this.rows, this.cols);
    for (let i = 0; i < this.data.length; i++) {
      result.data[i] = this.data[i] * other;
    }
    return result;
  }

  dot(other) {
    if (this.cols !== other.rows) {
      throw new Error(`Matrix dimension mismatch: ${this.rows}x${this.cols} dot ${other.rows}x${other.cols}`);
    }
    const result = new Matrix(this.rows, other.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < other.cols; j++) {
        let sum = 0;
        for (let k = 0; k < this.cols; k++) {
          sum += this.data[i * this.cols + k] * other.data[k * other.cols + j];
        }
        result.data[i * other.cols + j] = sum;
      }
    }
    return result;
  }

  transpose() {
    const result = new Matrix(this.cols, this.rows);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        result.data[j * this.rows + i] = this.data[i * this.cols + j];
      }
    }
    return result;
  }

  map(fn) {
    const result = new Matrix(this.rows, this.cols);
    for (let i = 0; i < this.data.length; i++) {
      result.data[i] = fn(this.data[i], i);
    }
    return result;
  }

  sum() {
    let s = 0;
    for (let i = 0; i < this.data.length; i++) s += this.data[i];
    return s;
  }

  mean() {
    return this.sum() / this.data.length;
  }

  max() {
    let m = -Infinity;
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i] > m) m = this.data[i];
    }
    return m;
  }

  argmax() {
    let maxVal = -Infinity, maxIdx = 0;
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i] > maxVal) { maxVal = this.data[i]; maxIdx = i; }
    }
    return maxIdx;
  }

  static random(rows, cols, scale = 1) {
    const m = new Matrix(rows, cols);
    for (let i = 0; i < m.data.length; i++) {
      m.data[i] = (Math.random() * 2 - 1) * scale;
    }
    return m;
  }

  static zeros(rows, cols) {
    return new Matrix(rows, cols);
  }

  static ones(rows, cols) {
    const m = new Matrix(rows, cols);
    m.data.fill(1);
    return m;
  }

  // Xavier/Glorot initialization
  static xavier(rows, cols) {
    const scale = Math.sqrt(2 / (rows + cols));
    return Matrix.random(rows, cols, scale);
  }

  // He initialization (for ReLU)
  static he(rows, cols) {
    const scale = Math.sqrt(2 / rows);
    return Matrix.random(rows, cols, scale);
  }

  // Kaiming initialization
  static kaiming(rows, cols) {
    const scale = Math.sqrt(2 / cols);
    return Matrix.random(rows, cols, scale);
  }

  serialize() {
    return { rows: this.rows, cols: this.cols, data: Array.from(this.data) };
  }

  static deserialize(obj) {
    const m = new Matrix(obj.rows, obj.cols);
    m.data = new Float64Array(obj.data);
    return m;
  }
}

// ============================================================================
// §1  ACTIVATION FUNCTIONS
// ============================================================================

const Activations = {
  sigmoid: {
    forward: (x) => 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x)))),
    backward: (y) => y * (1 - y),
  },
  tanh: {
    forward: (x) => Math.tanh(x),
    backward: (y) => 1 - y * y,
  },
  relu: {
    forward: (x) => Math.max(0, x),
    backward: (y) => y > 0 ? 1 : 0,
  },
  leakyRelu: {
    forward: (x) => x > 0 ? x : 0.01 * x,
    backward: (y) => y > 0 ? 1 : 0.01,
  },
  elu: {
    forward: (x) => x >= 0 ? x : 1.0 * (Math.exp(x) - 1),
    backward: (y) => y >= 0 ? 1 : y + 1.0,
  },
  swish: {
    forward: (x) => {
      const s = 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
      return x * s;
    },
    backward: (y, x) => {
      const s = 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
      return s + x * s * (1 - s);
    },
  },
  gelu: {
    forward: (x) => {
      const cdf = 0.5 * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x * x * x)));
      return x * cdf;
    },
    backward: (y, x) => {
      const k = Math.sqrt(2 / Math.PI);
      const inner = k * (x + 0.044715 * x * x * x);
      const sech2 = 1 - Math.tanh(inner) ** 2;
      const cdf = 0.5 * (1 + Math.tanh(inner));
      return cdf + x * 0.5 * sech2 * k * (1 + 3 * 0.044715 * x * x);
    },
  },
  softmax: {
    forward: (arr) => {
      const max = Math.max(...arr);
      const exps = arr.map(x => Math.exp(x - max));
      const sum = exps.reduce((a, b) => a + b, 0);
      return exps.map(e => e / sum);
    },
    backward: (y) => y, // Combined with cross-entropy loss
  },
  linear: {
    forward: (x) => x,
    backward: () => 1,
  },
};

// ============================================================================
// §2  LOSS FUNCTIONS
// ============================================================================

const LossFunctions = {
  mse: {
    compute: (predicted, actual) => {
      let sum = 0;
      for (let i = 0; i < predicted.data.length; i++) {
        sum += (predicted.data[i] - actual.data[i]) ** 2;
      }
      return sum / predicted.data.length;
    },
    gradient: (predicted, actual) => {
      return predicted.subtract(actual).multiply(2 / predicted.data.length);
    },
  },
  mae: {
    compute: (predicted, actual) => {
      let sum = 0;
      for (let i = 0; i < predicted.data.length; i++) {
        sum += Math.abs(predicted.data[i] - actual.data[i]);
      }
      return sum / predicted.data.length;
    },
    gradient: (predicted, actual) => {
      const result = new Matrix(predicted.rows, predicted.cols);
      for (let i = 0; i < predicted.data.length; i++) {
        result.data[i] = predicted.data[i] > actual.data[i] ? 1 / predicted.data.length : -1 / predicted.data.length;
      }
      return result;
    },
  },
  huber: {
    delta: 1.0,
    compute: (predicted, actual) => {
      let sum = 0;
      const delta = LossFunctions.huber.delta;
      for (let i = 0; i < predicted.data.length; i++) {
        const diff = Math.abs(predicted.data[i] - actual.data[i]);
        sum += diff <= delta ? 0.5 * diff * diff : delta * (diff - 0.5 * delta);
      }
      return sum / predicted.data.length;
    },
    gradient: (predicted, actual) => {
      const result = new Matrix(predicted.rows, predicted.cols);
      const delta = LossFunctions.huber.delta;
      for (let i = 0; i < predicted.data.length; i++) {
        const diff = predicted.data[i] - actual.data[i];
        result.data[i] = Math.abs(diff) <= delta ? diff / predicted.data.length : (delta * Math.sign(diff)) / predicted.data.length;
      }
      return result;
    },
  },
  crossEntropy: {
    compute: (predicted, actual) => {
      let sum = 0;
      const eps = 1e-15;
      for (let i = 0; i < predicted.data.length; i++) {
        const p = Math.max(eps, Math.min(1 - eps, predicted.data[i]));
        sum -= actual.data[i] * Math.log(p) + (1 - actual.data[i]) * Math.log(1 - p);
      }
      return sum / predicted.rows;
    },
    gradient: (predicted, actual) => {
      const result = new Matrix(predicted.rows, predicted.cols);
      const eps = 1e-15;
      for (let i = 0; i < predicted.data.length; i++) {
        const p = Math.max(eps, Math.min(1 - eps, predicted.data[i]));
        result.data[i] = (-actual.data[i] / p + (1 - actual.data[i]) / (1 - p)) / predicted.rows;
      }
      return result;
    },
  },
};

// ============================================================================
// §3  OPTIMIZER IMPLEMENTATIONS
// ============================================================================

class SGDOptimizer {
  constructor(lr = 0.01, momentum = 0.9, weightDecay = 0) {
    this.lr = lr;
    this.momentum = momentum;
    this.weightDecay = weightDecay;
    this.velocities = new Map();
  }

  update(paramId, param, gradient) {
    if (!this.velocities.has(paramId)) {
      this.velocities.set(paramId, Matrix.zeros(gradient.rows, gradient.cols));
    }
    const velocity = this.velocities.get(paramId);
    const newVelocity = velocity.multiply(this.momentum).subtract(gradient.multiply(this.lr));
    this.velocities.set(paramId, newVelocity);

    let updated = param.add(newVelocity);
    if (this.weightDecay > 0) {
      updated = updated.subtract(param.multiply(this.weightDecay * this.lr));
    }
    return updated;
  }
}

class AdamOptimizer {
  constructor(lr = 0.001, beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8, weightDecay = 0) {
    this.lr = lr;
    this.beta1 = beta1;
    this.beta2 = beta2;
    this.epsilon = epsilon;
    this.weightDecay = weightDecay;
    this.m = new Map();
    this.v = new Map();
    this.t = 0;
  }

  step() { this.t++; }

  update(paramId, param, gradient) {
    if (!this.m.has(paramId)) {
      this.m.set(paramId, Matrix.zeros(gradient.rows, gradient.cols));
      this.v.set(paramId, Matrix.zeros(gradient.rows, gradient.cols));
    }

    let grad = gradient;
    if (this.weightDecay > 0) {
      grad = gradient.add(param.multiply(this.weightDecay));
    }

    const m = this.m.get(paramId).multiply(this.beta1).add(grad.multiply(1 - this.beta1));
    const v = this.v.get(paramId).multiply(this.beta2).add(grad.multiply(grad).multiply(1 - this.beta2));
    this.m.set(paramId, m);
    this.v.set(paramId, v);

    const mHat = m.multiply(1 / (1 - Math.pow(this.beta1, this.t)));
    const vHat = v.multiply(1 / (1 - Math.pow(this.beta2, this.t)));

    const update = mHat.multiply(this.lr).map((val, idx) => val / (Math.sqrt(vHat.data[idx]) + this.epsilon));
    return param.subtract(update);
  }
}

class RMSPropOptimizer {
  constructor(lr = 0.001, decay = 0.9, epsilon = 1e-8) {
    this.lr = lr;
    this.decay = decay;
    this.epsilon = epsilon;
    this.cache = new Map();
  }

  step() {}

  update(paramId, param, gradient) {
    if (!this.cache.has(paramId)) {
      this.cache.set(paramId, Matrix.zeros(gradient.rows, gradient.cols));
    }
    const cache = this.cache.get(paramId);
    const newCache = cache.multiply(this.decay).add(gradient.multiply(gradient).multiply(1 - this.decay));
    this.cache.set(paramId, newCache);

    const update = gradient.multiply(this.lr).map((val, idx) => val / (Math.sqrt(newCache.data[idx]) + this.epsilon));
    return param.subtract(update);
  }
}

class AdaGradOptimizer {
  constructor(lr = 0.01, epsilon = 1e-8) {
    this.lr = lr;
    this.epsilon = epsilon;
    this.cache = new Map();
  }

  step() {}

  update(paramId, param, gradient) {
    if (!this.cache.has(paramId)) {
      this.cache.set(paramId, Matrix.zeros(gradient.rows, gradient.cols));
    }
    const cache = this.cache.get(paramId);
    const newCache = cache.add(gradient.multiply(gradient));
    this.cache.set(paramId, newCache);

    const update = gradient.multiply(this.lr).map((val, idx) => val / (Math.sqrt(newCache.data[idx]) + this.epsilon));
    return param.subtract(update);
  }
}

// ============================================================================
// §4  LEARNING RATE SCHEDULERS
// ============================================================================

class LRScheduler {
  static step(baseLR, epoch, stepSize = 10, gamma = 0.5) {
    return baseLR * Math.pow(gamma, Math.floor(epoch / stepSize));
  }

  static exponential(baseLR, epoch, gamma = 0.95) {
    return baseLR * Math.pow(gamma, epoch);
  }

  static cosineAnnealing(baseLR, epoch, totalEpochs, minLR = 1e-6) {
    return minLR + (baseLR - minLR) * 0.5 * (1 + Math.cos(Math.PI * epoch / totalEpochs));
  }

  static warmupCosine(baseLR, epoch, totalEpochs, warmupEpochs = 5) {
    if (epoch < warmupEpochs) {
      return baseLR * (epoch + 1) / warmupEpochs;
    }
    const progress = (epoch - warmupEpochs) / (totalEpochs - warmupEpochs);
    return baseLR * 0.5 * (1 + Math.cos(Math.PI * progress));
  }

  static oneCycleLR(baseLR, epoch, totalEpochs, maxLR = null) {
    maxLR = maxLR || baseLR * 10;
    const midPoint = Math.floor(totalEpochs * 0.3);
    if (epoch <= midPoint) {
      return baseLR + (maxLR - baseLR) * epoch / midPoint;
    }
    const progress = (epoch - midPoint) / (totalEpochs - midPoint);
    return maxLR - (maxLR - baseLR * 0.01) * progress;
  }

  static reduceLROnPlateau(currentLR, patience, stagnationCount, factor = 0.5, minLR = 1e-6) {
    if (stagnationCount >= patience) {
      return Math.max(minLR, currentLR * factor);
    }
    return currentLR;
  }
}

// ============================================================================
// §5  LAYER IMPLEMENTATIONS
// ============================================================================

class DenseLayer {
  constructor(inputSize, outputSize, activation = 'relu', options = {}) {
    this.inputSize = inputSize;
    this.outputSize = outputSize;
    this.activationName = activation;
    this.activation = Activations[activation] || Activations.relu;
    this.dropoutRate = options.dropout || 0;
    this.useBatchNorm = options.batchNorm || false;
    this.l2Lambda = options.l2 || 0;

    // Initialize weights
    if (activation === 'relu' || activation === 'leakyRelu' || activation === 'elu') {
      this.weights = Matrix.he(inputSize, outputSize);
    } else {
      this.weights = Matrix.xavier(inputSize, outputSize);
    }
    this.biases = Matrix.zeros(1, outputSize);

    // Batch Normalization parameters
    if (this.useBatchNorm) {
      this.gamma = Matrix.ones(1, outputSize);
      this.beta = Matrix.zeros(1, outputSize);
      this.runningMean = Matrix.zeros(1, outputSize);
      this.runningVar = Matrix.ones(1, outputSize);
      this.bnMomentum = 0.1;
    }

    // Cache for backward pass
    this.input = null;
    this.preActivation = null;
    this.output = null;
    this.dropoutMask = null;
    this.bnInput = null;
    this.bnNormalized = null;
    this.bnMeanCache = null;
    this.bnVarCache = null;
  }

  forward(input, training = true) {
    this.input = input;

    // Linear transformation: input × weights + bias
    let z = input.dot(this.weights);
    for (let i = 0; i < z.rows; i++) {
      for (let j = 0; j < z.cols; j++) {
        z.set(i, j, z.get(i, j) + this.biases.get(0, j));
      }
    }

    // Batch Normalization
    if (this.useBatchNorm) {
      this.bnInput = z;
      z = this._batchNormForward(z, training);
    }

    this.preActivation = z;

    // Activation
    if (this.activationName === 'softmax') {
      const result = new Matrix(z.rows, z.cols);
      for (let i = 0; i < z.rows; i++) {
        const row = [];
        for (let j = 0; j < z.cols; j++) row.push(z.get(i, j));
        const activated = this.activation.forward(row);
        for (let j = 0; j < z.cols; j++) result.set(i, j, activated[j]);
      }
      this.output = result;
    } else {
      this.output = z.map(v => this.activation.forward(v));
    }

    // Dropout
    if (training && this.dropoutRate > 0) {
      this.dropoutMask = new Matrix(this.output.rows, this.output.cols);
      const scale = 1 / (1 - this.dropoutRate);
      for (let i = 0; i < this.dropoutMask.data.length; i++) {
        this.dropoutMask.data[i] = Math.random() > this.dropoutRate ? scale : 0;
      }
      this.output = this.output.multiply(this.dropoutMask);
    }

    return this.output;
  }

  _batchNormForward(z, training) {
    if (training) {
      // Compute batch mean and variance
      const mean = Matrix.zeros(1, z.cols);
      const variance = Matrix.zeros(1, z.cols);

      for (let j = 0; j < z.cols; j++) {
        let sum = 0;
        for (let i = 0; i < z.rows; i++) sum += z.get(i, j);
        mean.set(0, j, sum / z.rows);
      }

      for (let j = 0; j < z.cols; j++) {
        let sum = 0;
        const m = mean.get(0, j);
        for (let i = 0; i < z.rows; i++) sum += (z.get(i, j) - m) ** 2;
        variance.set(0, j, sum / z.rows);
      }

      this.bnMeanCache = mean;
      this.bnVarCache = variance;

      // Update running statistics
      for (let j = 0; j < z.cols; j++) {
        this.runningMean.set(0, j, (1 - this.bnMomentum) * this.runningMean.get(0, j) + this.bnMomentum * mean.get(0, j));
        this.runningVar.set(0, j, (1 - this.bnMomentum) * this.runningVar.get(0, j) + this.bnMomentum * variance.get(0, j));
      }

      // Normalize
      const normalized = new Matrix(z.rows, z.cols);
      for (let i = 0; i < z.rows; i++) {
        for (let j = 0; j < z.cols; j++) {
          normalized.set(i, j, (z.get(i, j) - mean.get(0, j)) / Math.sqrt(variance.get(0, j) + 1e-8));
        }
      }
      this.bnNormalized = normalized;

      // Scale and shift
      const result = new Matrix(z.rows, z.cols);
      for (let i = 0; i < z.rows; i++) {
        for (let j = 0; j < z.cols; j++) {
          result.set(i, j, this.gamma.get(0, j) * normalized.get(i, j) + this.beta.get(0, j));
        }
      }
      return result;
    } else {
      // Inference: use running statistics
      const result = new Matrix(z.rows, z.cols);
      for (let i = 0; i < z.rows; i++) {
        for (let j = 0; j < z.cols; j++) {
          const norm = (z.get(i, j) - this.runningMean.get(0, j)) / Math.sqrt(this.runningVar.get(0, j) + 1e-8);
          result.set(i, j, this.gamma.get(0, j) * norm + this.beta.get(0, j));
        }
      }
      return result;
    }
  }

  backward(gradOutput, optimizer, layerIdx) {
    let grad = gradOutput;

    // Dropout backward
    if (this.dropoutMask) {
      grad = grad.multiply(this.dropoutMask);
    }

    // Activation backward
    if (this.activationName !== 'softmax') {
      grad = grad.multiply(this.output.map(v => this.activation.backward(v)));
    }

    // Batch Norm backward
    if (this.useBatchNorm && this.bnNormalized) {
      grad = this._batchNormBackward(grad, optimizer, layerIdx);
    }

    // Compute gradients
    const weightGrad = this.input.transpose().dot(grad);
    const biasGrad = Matrix.zeros(1, this.outputSize);
    for (let j = 0; j < this.outputSize; j++) {
      let sum = 0;
      for (let i = 0; i < grad.rows; i++) sum += grad.get(i, j);
      biasGrad.set(0, j, sum);
    }

    // L2 regularization
    if (this.l2Lambda > 0) {
      const l2Grad = this.weights.multiply(this.l2Lambda);
      weightGrad.data = weightGrad.add(l2Grad).data;
    }

    // Input gradient for previous layer
    const inputGrad = grad.dot(this.weights.transpose());

    // Update parameters
    if (optimizer) {
      this.weights = optimizer.update(`dense_${layerIdx}_w`, this.weights, weightGrad);
      this.biases = optimizer.update(`dense_${layerIdx}_b`, this.biases, biasGrad);
    }

    return inputGrad;
  }

  _batchNormBackward(grad, optimizer, layerIdx) {
    const N = grad.rows;
    const dGamma = Matrix.zeros(1, this.outputSize);
    const dBeta = Matrix.zeros(1, this.outputSize);

    for (let j = 0; j < this.outputSize; j++) {
      let gSum = 0, bSum = 0;
      for (let i = 0; i < N; i++) {
        gSum += grad.get(i, j) * this.bnNormalized.get(i, j);
        bSum += grad.get(i, j);
      }
      dGamma.set(0, j, gSum);
      dBeta.set(0, j, bSum);
    }

    const dNorm = new Matrix(grad.rows, grad.cols);
    for (let i = 0; i < grad.rows; i++) {
      for (let j = 0; j < grad.cols; j++) {
        dNorm.set(i, j, grad.get(i, j) * this.gamma.get(0, j));
      }
    }

    const result = new Matrix(grad.rows, grad.cols);
    for (let j = 0; j < grad.cols; j++) {
      const stdInv = 1 / Math.sqrt(this.bnVarCache.get(0, j) + 1e-8);
      let dNormSum = 0, dNormXSum = 0;
      for (let i = 0; i < N; i++) {
        dNormSum += dNorm.get(i, j);
        dNormXSum += dNorm.get(i, j) * this.bnNormalized.get(i, j);
      }
      for (let i = 0; i < N; i++) {
        result.set(i, j, stdInv * (dNorm.get(i, j) - dNormSum / N - this.bnNormalized.get(i, j) * dNormXSum / N));
      }
    }

    if (optimizer) {
      this.gamma = optimizer.update(`bn_${layerIdx}_g`, this.gamma, dGamma);
      this.beta = optimizer.update(`bn_${layerIdx}_b`, this.beta, dBeta);
    }

    return result;
  }

  serialize() {
    const obj = {
      type: 'dense',
      inputSize: this.inputSize,
      outputSize: this.outputSize,
      activation: this.activationName,
      dropoutRate: this.dropoutRate,
      useBatchNorm: this.useBatchNorm,
      l2Lambda: this.l2Lambda,
      weights: this.weights.serialize(),
      biases: this.biases.serialize(),
    };
    if (this.useBatchNorm) {
      obj.gamma = this.gamma.serialize();
      obj.beta = this.beta.serialize();
      obj.runningMean = this.runningMean.serialize();
      obj.runningVar = this.runningVar.serialize();
    }
    return obj;
  }

  static deserialize(obj) {
    const layer = new DenseLayer(obj.inputSize, obj.outputSize, obj.activation, {
      dropout: obj.dropoutRate,
      batchNorm: obj.useBatchNorm,
      l2: obj.l2Lambda,
    });
    layer.weights = Matrix.deserialize(obj.weights);
    layer.biases = Matrix.deserialize(obj.biases);
    if (obj.useBatchNorm && obj.gamma) {
      layer.gamma = Matrix.deserialize(obj.gamma);
      layer.beta = Matrix.deserialize(obj.beta);
      layer.runningMean = Matrix.deserialize(obj.runningMean);
      layer.runningVar = Matrix.deserialize(obj.runningVar);
    }
    return layer;
  }
}

// ============================================================================
// §6  NEURAL NETWORK MODEL
// ============================================================================

class NeuralNetwork {
  constructor(config = {}) {
    this.layers = [];
    this.optimizer = null;
    this.lossFunction = LossFunctions[config.loss || 'mse'];
    this.lossName = config.loss || 'mse';
    this.metrics = { trainLoss: [], valLoss: [], trainAccuracy: [], valAccuracy: [] };
    this.bestLoss = Infinity;
    this.bestWeights = null;
    this.patience = config.patience || 10;
    this.stagnationCount = 0;
    this.config = config;
  }

  addLayer(inputSize, outputSize, activation = 'relu', options = {}) {
    this.layers.push(new DenseLayer(inputSize, outputSize, activation, options));
    return this;
  }

  compile(optimizerConfig = {}) {
    const type = optimizerConfig.type || 'adam';
    const lr = optimizerConfig.lr || 0.001;

    switch (type) {
      case 'sgd':
        this.optimizer = new SGDOptimizer(lr, optimizerConfig.momentum || 0.9, optimizerConfig.weightDecay || 0);
        break;
      case 'rmsprop':
        this.optimizer = new RMSPropOptimizer(lr, optimizerConfig.decay || 0.9);
        break;
      case 'adagrad':
        this.optimizer = new AdaGradOptimizer(lr);
        break;
      case 'adam':
      default:
        this.optimizer = new AdamOptimizer(lr, optimizerConfig.beta1 || 0.9, optimizerConfig.beta2 || 0.999, 1e-8, optimizerConfig.weightDecay || 0);
        break;
    }
    return this;
  }

  forward(input, training = true) {
    let current = input instanceof Matrix ? input : Matrix.from2D(Array.isArray(input[0]) ? input : [input]);
    for (const layer of this.layers) {
      current = layer.forward(current, training);
    }
    return current;
  }

  predict(input) {
    return this.forward(input, false);
  }

  backward(loss_gradient) {
    let grad = loss_gradient;
    if (this.optimizer.step) this.optimizer.step();
    for (let i = this.layers.length - 1; i >= 0; i--) {
      grad = this.layers[i].backward(grad, this.optimizer, i);
    }
  }

  train(trainX, trainY, config = {}) {
    const epochs = config.epochs || 100;
    const batchSize = config.batchSize || 32;
    const validationSplit = config.validationSplit || 0.1;
    const verbose = config.verbose !== false;
    const lrSchedule = config.lrSchedule || 'constant';
    const baseLR = this.optimizer.lr;
    const earlyStopPatience = config.earlyStopPatience || this.patience;

    // Split data
    const splitIdx = Math.floor(trainX.length * (1 - validationSplit));
    const xTrain = trainX.slice(0, splitIdx);
    const yTrain = trainY.slice(0, splitIdx);
    const xVal = trainX.slice(splitIdx);
    const yVal = trainY.slice(splitIdx);

    const history = { trainLoss: [], valLoss: [], lr: [] };
    let bestValLoss = Infinity;
    let stagnation = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
      // Learning rate scheduling
      switch (lrSchedule) {
        case 'step': this.optimizer.lr = LRScheduler.step(baseLR, epoch); break;
        case 'exponential': this.optimizer.lr = LRScheduler.exponential(baseLR, epoch); break;
        case 'cosine': this.optimizer.lr = LRScheduler.cosineAnnealing(baseLR, epoch, epochs); break;
        case 'warmupCosine': this.optimizer.lr = LRScheduler.warmupCosine(baseLR, epoch, epochs); break;
        case 'oneCycle': this.optimizer.lr = LRScheduler.oneCycleLR(baseLR, epoch, epochs); break;
      }

      // Shuffle training data
      const indices = Array.from({ length: xTrain.length }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }

      let epochLoss = 0;
      let batchCount = 0;

      // Mini-batch training
      for (let b = 0; b < xTrain.length; b += batchSize) {
        const batchIndices = indices.slice(b, b + batchSize);
        const batchX = batchIndices.map(i => xTrain[i]);
        const batchY = batchIndices.map(i => yTrain[i]);

        const inputMatrix = Matrix.from2D(batchX);
        const targetMatrix = Matrix.from2D(batchY);

        // Forward
        const output = this.forward(inputMatrix, true);

        // Compute loss
        const loss = this.lossFunction.compute(output, targetMatrix);
        epochLoss += loss;
        batchCount++;

        // Backward
        const lossGrad = this.lossFunction.gradient(output, targetMatrix);
        this.backward(lossGrad);
      }

      epochLoss /= batchCount;

      // Validation loss
      let valLoss = 0;
      if (xVal.length > 0) {
        const valInput = Matrix.from2D(xVal);
        const valTarget = Matrix.from2D(yVal);
        const valOutput = this.predict(valInput);
        valLoss = this.lossFunction.compute(valOutput, valTarget);
      }

      history.trainLoss.push(epochLoss);
      history.valLoss.push(valLoss);
      history.lr.push(this.optimizer.lr);

      // Early stopping
      if (valLoss < bestValLoss) {
        bestValLoss = valLoss;
        stagnation = 0;
        this.bestWeights = this.layers.map(l => l.serialize());
      } else {
        stagnation++;
        if (lrSchedule === 'plateau') {
          this.optimizer.lr = LRScheduler.reduceLROnPlateau(this.optimizer.lr, 5, stagnation);
        }
      }

      if (stagnation >= earlyStopPatience) {
        if (verbose) logger.info(`Early stopping at epoch ${epoch + 1}`);
        break;
      }

      if (verbose && (epoch % 10 === 0 || epoch === epochs - 1)) {
        logger.info(`Epoch ${epoch + 1}/${epochs} — loss: ${epochLoss.toFixed(6)}, val_loss: ${valLoss.toFixed(6)}, lr: ${this.optimizer.lr.toFixed(8)}`);
      }
    }

    // Restore best weights
    if (this.bestWeights) {
      this.layers = this.bestWeights.map(w => DenseLayer.deserialize(w));
    }

    return history;
  }

  evaluate(testX, testY) {
    const input = Matrix.from2D(testX);
    const target = Matrix.from2D(testY);
    const output = this.predict(input);
    const loss = this.lossFunction.compute(output, target);

    // Calculate metrics
    let correct = 0;
    const predictions = [];
    for (let i = 0; i < output.rows; i++) {
      const row = [];
      for (let j = 0; j < output.cols; j++) row.push(output.get(i, j));
      predictions.push(row);

      if (output.cols > 1) {
        // Classification
        const predIdx = row.indexOf(Math.max(...row));
        const targetRow = [];
        for (let j = 0; j < target.cols; j++) targetRow.push(target.get(i, j));
        const targetIdx = targetRow.indexOf(Math.max(...targetRow));
        if (predIdx === targetIdx) correct++;
      }
    }

    return {
      loss,
      accuracy: output.cols > 1 ? correct / output.rows : null,
      predictions,
      mse: loss,
      rmse: Math.sqrt(loss),
    };
  }

  serialize() {
    return {
      layers: this.layers.map(l => l.serialize()),
      lossName: this.lossName,
      config: this.config,
      metrics: this.metrics,
    };
  }

  static deserialize(obj) {
    const nn = new NeuralNetwork({ loss: obj.lossName, ...obj.config });
    nn.layers = obj.layers.map(l => DenseLayer.deserialize(l));
    nn.metrics = obj.metrics || { trainLoss: [], valLoss: [] };
    return nn;
  }
}

// ============================================================================
// §7  SPECIALIZED FINANCIAL NEURAL NETWORKS
// ============================================================================

class SpendingPredictorNN {
  constructor() {
    this.network = null;
    this.featureScaler = null;
    this.targetScaler = null;
  }

  _createNetwork(inputSize) {
    const nn = new NeuralNetwork({ loss: 'huber' });
    nn.addLayer(inputSize, 128, 'relu', { dropout: 0.2, batchNorm: true });
    nn.addLayer(128, 64, 'relu', { dropout: 0.1, batchNorm: true });
    nn.addLayer(64, 32, 'relu');
    nn.addLayer(32, 16, 'relu');
    nn.addLayer(16, 1, 'linear');
    nn.compile({ type: 'adam', lr: 0.001, weightDecay: 0.0001 });
    return nn;
  }

  _normalizeFeatures(features) {
    if (!this.featureScaler) {
      this.featureScaler = { min: [], max: [] };
      for (let j = 0; j < features[0].length; j++) {
        const col = features.map(f => f[j]);
        this.featureScaler.min.push(Math.min(...col));
        this.featureScaler.max.push(Math.max(...col));
      }
    }
    return features.map(row =>
      row.map((v, j) => {
        const range = this.featureScaler.max[j] - this.featureScaler.min[j];
        return range > 0 ? (v - this.featureScaler.min[j]) / range : 0;
      })
    );
  }

  _normalizeTargets(targets) {
    if (!this.targetScaler) {
      const flat = targets.map(t => t[0]);
      this.targetScaler = { min: Math.min(...flat), max: Math.max(...flat) };
    }
    const range = this.targetScaler.max - this.targetScaler.min;
    return targets.map(t => [range > 0 ? (t[0] - this.targetScaler.min) / range : 0]);
  }

  _denormalizeTarget(normalized) {
    const range = this.targetScaler.max - this.targetScaler.min;
    return normalized * range + this.targetScaler.min;
  }

  extractFeatures(transactions) {
    const monthlyData = {};
    for (const t of transactions) {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[key]) monthlyData[key] = { expenses: 0, income: 0, count: 0, categories: {} };
      if (t.type === 'debit') {
        monthlyData[key].expenses += Math.abs(t.amount);
        const cat = t.category || 'other';
        monthlyData[key].categories[cat] = (monthlyData[key].categories[cat] || 0) + Math.abs(t.amount);
      } else {
        monthlyData[key].income += Math.abs(t.amount);
      }
      monthlyData[key].count++;
    }

    const months = Object.keys(monthlyData).sort();
    if (months.length < 4) return { features: [], targets: [], months: [] };

    const features = [];
    const targets = [];
    const windowSize = 3;

    for (let i = windowSize; i < months.length; i++) {
      const feature = [];
      for (let w = 0; w < windowSize; w++) {
        const m = monthlyData[months[i - windowSize + w]];
        feature.push(
          m.expenses,
          m.income,
          m.count,
          m.expenses > 0 ? m.income / m.expenses : 0,
          i - windowSize + w, // month index
          new Date(months[i - windowSize + w]).getMonth() + 1, // month of year (seasonality)
        );
      }
      features.push(feature);
      targets.push([monthlyData[months[i]].expenses]);
    }

    return { features, targets, months };
  }

  async train(transactions, config = {}) {
    const { features, targets } = this.extractFeatures(transactions);
    if (features.length < 5) {
      return { success: false, message: 'Insufficient data for training (need at least 7 months)' };
    }

    const normFeatures = this._normalizeFeatures(features);
    const normTargets = this._normalizeTargets(targets);

    this.network = this._createNetwork(normFeatures[0].length);
    const history = this.network.train(normFeatures, normTargets, {
      epochs: config.epochs || 200,
      batchSize: config.batchSize || 8,
      validationSplit: 0.15,
      lrSchedule: 'warmupCosine',
      earlyStopPatience: 20,
      verbose: config.verbose || false,
    });

    return { success: true, history, epochs: history.trainLoss.length };
  }

  predict(recentMonths) {
    if (!this.network || !this.featureScaler) return null;
    const normInput = this._normalizeFeatures([recentMonths]);
    const output = this.network.predict(normInput);
    return this._denormalizeTarget(output.get(0, 0));
  }

  serialize() {
    return {
      network: this.network?.serialize(),
      featureScaler: this.featureScaler,
      targetScaler: this.targetScaler,
    };
  }

  static deserialize(obj) {
    const predictor = new SpendingPredictorNN();
    if (obj.network) predictor.network = NeuralNetwork.deserialize(obj.network);
    predictor.featureScaler = obj.featureScaler;
    predictor.targetScaler = obj.targetScaler;
    return predictor;
  }
}

class AnomalyDetectorNN {
  constructor() {
    this.encoder = null;
    this.decoder = null;
    this.threshold = null;
    this.featureScaler = null;
  }

  _createAutoencoder(inputSize) {
    const encodingSize = Math.max(2, Math.floor(inputSize / 4));
    const hiddenSize = Math.max(4, Math.floor(inputSize / 2));

    // Encoder
    this.encoder = new NeuralNetwork({ loss: 'mse' });
    this.encoder.addLayer(inputSize, hiddenSize, 'relu', { batchNorm: true });
    this.encoder.addLayer(hiddenSize, encodingSize, 'relu');
    this.encoder.compile({ type: 'adam', lr: 0.001 });

    // Decoder
    this.decoder = new NeuralNetwork({ loss: 'mse' });
    this.decoder.addLayer(encodingSize, hiddenSize, 'relu', { batchNorm: true });
    this.decoder.addLayer(hiddenSize, inputSize, 'linear');
    this.decoder.compile({ type: 'adam', lr: 0.001 });
  }

  extractFeatures(transaction, categoryStats) {
    const amount = Math.abs(transaction.amount);
    const catStats = categoryStats[transaction.category] || { mean: amount, std: 1 };
    const hour = new Date(transaction.date).getHours();
    const dayOfWeek = new Date(transaction.date).getDay();
    const monthOfYear = new Date(transaction.date).getMonth();

    return [
      amount,
      catStats.mean > 0 ? amount / catStats.mean : 0,
      catStats.std > 0 ? (amount - catStats.mean) / catStats.std : 0,
      hour / 24,
      dayOfWeek / 7,
      monthOfYear / 12,
      transaction.type === 'debit' ? 1 : 0,
    ];
  }

  async train(transactions) {
    if (transactions.length < 20) {
      return { success: false, message: 'Insufficient data for anomaly detection training' };
    }

    // Compute category statistics
    const categoryStats = {};
    for (const t of transactions) {
      const cat = t.category || 'other';
      if (!categoryStats[cat]) categoryStats[cat] = { amounts: [] };
      categoryStats[cat].amounts.push(Math.abs(t.amount));
    }
    for (const cat of Object.keys(categoryStats)) {
      const amounts = categoryStats[cat].amounts;
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const std = Math.sqrt(amounts.reduce((s, v) => s + (v - mean) ** 2, 0) / amounts.length);
      categoryStats[cat] = { mean, std: std || 1 };
    }

    const features = transactions.map(t => this.extractFeatures(t, categoryStats));
    const normFeatures = this._normalize(features);

    this._createAutoencoder(normFeatures[0].length);

    // Train autoencoder (encoder + decoder)
    for (let epoch = 0; epoch < 100; epoch++) {
      for (let i = 0; i < normFeatures.length; i += 16) {
        const batch = normFeatures.slice(i, Math.min(i + 16, normFeatures.length));
        const input = Matrix.from2D(batch);
        const encoded = this.encoder.forward(input, true);
        const decoded = this.decoder.forward(encoded, true);
        const target = input;

        const lossGrad = LossFunctions.mse.gradient(decoded, target);
        const decoderGrad = lossGrad;
        let grad = decoderGrad;
        if (this.decoder.optimizer?.step) this.decoder.optimizer.step();
        for (let l = this.decoder.layers.length - 1; l >= 0; l--) {
          grad = this.decoder.layers[l].backward(grad, this.decoder.optimizer, l + 100);
        }
        if (this.encoder.optimizer?.step) this.encoder.optimizer.step();
        for (let l = this.encoder.layers.length - 1; l >= 0; l--) {
          grad = this.encoder.layers[l].backward(grad, this.encoder.optimizer, l);
        }
      }
    }

    // Compute reconstruction errors for threshold
    const errors = [];
    for (const f of normFeatures) {
      const input = Matrix.from2D([f]);
      const encoded = this.encoder.predict(input);
      const decoded = this.decoder.predict(encoded);
      let error = 0;
      for (let j = 0; j < f.length; j++) {
        error += (f[j] - decoded.get(0, j)) ** 2;
      }
      errors.push(error / f.length);
    }
    errors.sort((a, b) => a - b);
    this.threshold = errors[Math.floor(errors.length * 0.95)]; // 95th percentile

    return { success: true, threshold: this.threshold, sampleSize: transactions.length };
  }

  _normalize(features) {
    if (!this.featureScaler) {
      this.featureScaler = { min: [], max: [] };
      for (let j = 0; j < features[0].length; j++) {
        const col = features.map(f => f[j]);
        this.featureScaler.min.push(Math.min(...col));
        this.featureScaler.max.push(Math.max(...col));
      }
    }
    return features.map(row =>
      row.map((v, j) => {
        const range = this.featureScaler.max[j] - this.featureScaler.min[j];
        return range > 0 ? (v - this.featureScaler.min[j]) / range : 0;
      })
    );
  }

  detectAnomaly(transaction, categoryStats) {
    if (!this.encoder || !this.decoder || !this.threshold) return null;
    const features = this.extractFeatures(transaction, categoryStats);
    const normFeatures = this._normalize([features]);
    const input = Matrix.from2D(normFeatures);
    const encoded = this.encoder.predict(input);
    const decoded = this.decoder.predict(encoded);

    let error = 0;
    for (let j = 0; j < features.length; j++) {
      error += (normFeatures[0][j] - decoded.get(0, j)) ** 2;
    }
    error /= features.length;

    return {
      isAnomaly: error > this.threshold,
      score: error / this.threshold,
      reconstructionError: error,
      threshold: this.threshold,
    };
  }

  serialize() {
    return {
      encoder: this.encoder?.serialize(),
      decoder: this.decoder?.serialize(),
      threshold: this.threshold,
      featureScaler: this.featureScaler,
    };
  }

  static deserialize(obj) {
    const det = new AnomalyDetectorNN();
    if (obj.encoder) det.encoder = NeuralNetwork.deserialize(obj.encoder);
    if (obj.decoder) det.decoder = NeuralNetwork.deserialize(obj.decoder);
    det.threshold = obj.threshold;
    det.featureScaler = obj.featureScaler;
    return det;
  }
}

class CategoryClassifierNN {
  constructor() {
    this.network = null;
    this.categories = [];
    this.vocabMap = {};
    this.featureSize = 0;
  }

  _textToFeatures(description) {
    const words = (description || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    const features = new Array(this.featureSize).fill(0);
    for (const word of words) {
      if (this.vocabMap[word] !== undefined) {
        features[this.vocabMap[word]] = 1;
      }
    }
    return features;
  }

  _buildVocabulary(transactions) {
    const wordFreq = {};
    for (const t of transactions) {
      const words = (t.description || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
      for (const w of words) {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
    }
    // Keep top 500 words
    const sorted = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 500);
    this.vocabMap = {};
    sorted.forEach(([word], idx) => { this.vocabMap[word] = idx; });
    this.featureSize = sorted.length + 5; // +5 for numeric features
  }

  _extractFeatures(transaction) {
    const textFeatures = this._textToFeatures(transaction.description);
    const amount = Math.abs(transaction.amount);
    const hour = new Date(transaction.date).getHours();
    const day = new Date(transaction.date).getDay();
    const month = new Date(transaction.date).getMonth();
    const isDebit = transaction.type === 'debit' ? 1 : 0;
    return [...textFeatures, amount / 100000, hour / 24, day / 7, month / 12, isDebit];
  }

  async train(transactions) {
    const labeled = transactions.filter(t => t.category && t.description);
    if (labeled.length < 20) {
      return { success: false, message: 'Insufficient labeled data for category training' };
    }

    // Build vocabulary and categories
    this._buildVocabulary(labeled);
    const catSet = new Set(labeled.map(t => t.category));
    this.categories = [...catSet].sort();

    const features = labeled.map(t => this._extractFeatures(t));
    const targets = labeled.map(t => {
      const oneHot = new Array(this.categories.length).fill(0);
      const idx = this.categories.indexOf(t.category);
      if (idx >= 0) oneHot[idx] = 1;
      return oneHot;
    });

    this.network = new NeuralNetwork({ loss: 'crossEntropy' });
    this.network.addLayer(this.featureSize, 256, 'relu', { dropout: 0.3, batchNorm: true });
    this.network.addLayer(256, 128, 'relu', { dropout: 0.2 });
    this.network.addLayer(128, 64, 'relu', { dropout: 0.1 });
    this.network.addLayer(64, this.categories.length, 'softmax');
    this.network.compile({ type: 'adam', lr: 0.001 });

    const history = this.network.train(features, targets, {
      epochs: 150,
      batchSize: 16,
      validationSplit: 0.15,
      lrSchedule: 'warmupCosine',
      earlyStopPatience: 15,
    });

    return { success: true, categories: this.categories, history };
  }

  classify(transaction) {
    if (!this.network || !this.categories.length) return null;
    const features = this._extractFeatures(transaction);
    const output = this.network.predict([features]);

    const probabilities = {};
    for (let i = 0; i < this.categories.length; i++) {
      probabilities[this.categories[i]] = output.get(0, i);
    }

    const sorted = Object.entries(probabilities).sort((a, b) => b[1] - a[1]);
    return {
      category: sorted[0][0],
      confidence: sorted[0][1],
      topCategories: sorted.slice(0, 3).map(([cat, prob]) => ({ category: cat, probability: prob })),
      probabilities,
    };
  }

  serialize() {
    return {
      network: this.network?.serialize(),
      categories: this.categories,
      vocabMap: this.vocabMap,
      featureSize: this.featureSize,
    };
  }

  static deserialize(obj) {
    const clf = new CategoryClassifierNN();
    if (obj.network) clf.network = NeuralNetwork.deserialize(obj.network);
    clf.categories = obj.categories || [];
    clf.vocabMap = obj.vocabMap || {};
    clf.featureSize = obj.featureSize || 0;
    return clf;
  }
}

// ============================================================================
// §8  EXPORTS
// ============================================================================

module.exports = {
  Matrix,
  Activations,
  LossFunctions,
  SGDOptimizer,
  AdamOptimizer,
  RMSPropOptimizer,
  AdaGradOptimizer,
  LRScheduler,
  DenseLayer,
  NeuralNetwork,
  SpendingPredictorNN,
  AnomalyDetectorNN,
  CategoryClassifierNN,
};
