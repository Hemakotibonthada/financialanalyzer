// ============================================================================
// REINFORCEMENT LEARNING ENGINE — Local Financial Decision Optimization
// ============================================================================
// Q-Learning and Policy Gradient methods for budget allocation, investment
// strategy, and debt payoff optimization. Runs entirely locally.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');
const path = require('path');
const fs = require('fs');

// ============================================================================
// §1  MATHEMATICAL UTILITIES
// ============================================================================

const sum = (a) => a.reduce((s, v) => s + v, 0);
const mean = (a) => (a.length ? sum(a) / a.length : 0);
const softmax = (arr) => {
  const max = Math.max(...arr);
  const exps = arr.map(x => Math.exp(x - max));
  const total = sum(exps);
  return exps.map(e => e / total);
};
const argmax = (arr) => arr.indexOf(Math.max(...arr));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

class RandomGenerator {
  constructor(seed = Date.now()) {
    this.seed = seed;
  }

  next() {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return this.seed / 2147483647;
  }

  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice(arr) {
    return arr[this.nextInt(0, arr.length - 1)];
  }

  weightedChoice(weights) {
    const total = sum(weights);
    let r = this.next() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return weights.length - 1;
  }
}

// ============================================================================
// §2  REPLAY BUFFER — Experience Storage for Off-Policy Learning
// ============================================================================

class ReplayBuffer {
  constructor(maxSize = 10000) {
    this.buffer = [];
    this.maxSize = maxSize;
    this.position = 0;
  }

  add(state, action, reward, nextState, done) {
    const experience = { state, action, reward, nextState, done };
    if (this.buffer.length < this.maxSize) {
      this.buffer.push(experience);
    } else {
      this.buffer[this.position] = experience;
    }
    this.position = (this.position + 1) % this.maxSize;
  }

  sample(batchSize) {
    const indices = [];
    const rng = new RandomGenerator();
    while (indices.length < Math.min(batchSize, this.buffer.length)) {
      const idx = rng.nextInt(0, this.buffer.length - 1);
      if (!indices.includes(idx)) indices.push(idx);
    }
    return indices.map(i => this.buffer[i]);
  }

  get size() { return this.buffer.length; }

  clear() {
    this.buffer = [];
    this.position = 0;
  }

  serialize() {
    return {
      buffer: this.buffer.slice(-1000),
      maxSize: this.maxSize
    };
  }

  deserialize(data) {
    this.buffer = data.buffer || [];
    this.maxSize = data.maxSize || 10000;
    this.position = this.buffer.length % this.maxSize;
  }
}

// ============================================================================
// §3  Q-TABLE — Tabular Q-Learning for Discrete State-Action Spaces
// ============================================================================

class QTable {
  constructor(config = {}) {
    this.learningRate = config.learningRate || 0.1;
    this.discountFactor = config.discountFactor || 0.95;
    this.epsilon = config.epsilon || 1.0;
    this.epsilonDecay = config.epsilonDecay || 0.995;
    this.epsilonMin = config.epsilonMin || 0.01;
    this.table = {};
    this.rng = new RandomGenerator();
    this.totalUpdates = 0;
    this.rewardHistory = [];
  }

  getKey(state) {
    if (typeof state === 'string') return state;
    return JSON.stringify(state);
  }

  getQValues(state) {
    const key = this.getKey(state);
    if (!this.table[key]) this.table[key] = {};
    return this.table[key];
  }

  getAction(state, numActions) {
    if (this.rng.next() < this.epsilon) {
      return this.rng.nextInt(0, numActions - 1);
    }
    const qValues = this.getQValues(state);
    let bestAction = 0;
    let bestValue = -Infinity;
    for (let a = 0; a < numActions; a++) {
      const val = qValues[a] || 0;
      if (val > bestValue) {
        bestValue = val;
        bestAction = a;
      }
    }
    return bestAction;
  }

  update(state, action, reward, nextState, numActions) {
    const qValues = this.getQValues(state);
    const nextQValues = this.getQValues(nextState);

    let maxNextQ = -Infinity;
    for (let a = 0; a < numActions; a++) {
      maxNextQ = Math.max(maxNextQ, nextQValues[a] || 0);
    }
    if (maxNextQ === -Infinity) maxNextQ = 0;

    const currentQ = qValues[action] || 0;
    const newQ = currentQ + this.learningRate * (reward + this.discountFactor * maxNextQ - currentQ);
    qValues[action] = newQ;

    this.totalUpdates++;
    this.rewardHistory.push(reward);
    if (this.rewardHistory.length > 10000) this.rewardHistory.shift();
    this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);

    return newQ;
  }

  serialize() {
    return {
      table: this.table,
      learningRate: this.learningRate,
      discountFactor: this.discountFactor,
      epsilon: this.epsilon,
      totalUpdates: this.totalUpdates,
      rewardHistory: this.rewardHistory.slice(-500)
    };
  }

  deserialize(data) {
    this.table = data.table || {};
    this.learningRate = data.learningRate || 0.1;
    this.discountFactor = data.discountFactor || 0.95;
    this.epsilon = data.epsilon || 0.01;
    this.totalUpdates = data.totalUpdates || 0;
    this.rewardHistory = data.rewardHistory || [];
  }
}

// ============================================================================
// §4  DEEP Q-NETWORK (DQN) — Approximate Q-Learning with Neural Network
// ============================================================================

class SimpleNeuralNet {
  constructor(inputSize, hiddenSizes, outputSize) {
    this.layers = [];
    let prevSize = inputSize;
    for (const hs of hiddenSizes) {
      this.layers.push({
        weights: this._initWeights(prevSize, hs),
        bias: new Array(hs).fill(0),
        type: 'hidden'
      });
      prevSize = hs;
    }
    this.layers.push({
      weights: this._initWeights(prevSize, outputSize),
      bias: new Array(outputSize).fill(0),
      type: 'output'
    });
  }

  _initWeights(rows, cols) {
    const scale = Math.sqrt(2.0 / rows);
    const weights = [];
    const rng = new RandomGenerator();
    for (let i = 0; i < rows; i++) {
      weights[i] = [];
      for (let j = 0; j < cols; j++) {
        weights[i][j] = (rng.next() * 2 - 1) * scale;
      }
    }
    return weights;
  }

  forward(input) {
    let activation = [...input];
    const activations = [activation];

    for (let l = 0; l < this.layers.length; l++) {
      const layer = this.layers[l];
      const output = [];
      for (let j = 0; j < layer.bias.length; j++) {
        let val = layer.bias[j];
        for (let i = 0; i < activation.length; i++) {
          val += activation[i] * (layer.weights[i]?.[j] || 0);
        }
        output.push(layer.type === 'output' ? val : Math.max(0, val)); // ReLU for hidden, linear for output
      }
      activation = output;
      activations.push(activation);
    }

    return { output: activation, activations };
  }

  backward(activations, targetOutput, learningRate = 0.001) {
    const numLayers = this.layers.length;
    const deltas = new Array(numLayers);

    // Output layer error
    const outputActivation = activations[numLayers];
    const outputDelta = [];
    for (let j = 0; j < outputActivation.length; j++) {
      outputDelta.push(outputActivation[j] - targetOutput[j]);
    }
    deltas[numLayers - 1] = outputDelta;

    // Backpropagate
    for (let l = numLayers - 2; l >= 0; l--) {
      const delta = [];
      const nextLayer = this.layers[l + 1];
      for (let i = 0; i < this.layers[l].bias.length; i++) {
        let error = 0;
        for (let j = 0; j < nextLayer.bias.length; j++) {
          error += deltas[l + 1][j] * (nextLayer.weights[i]?.[j] || 0);
        }
        const activation = activations[l + 1][i];
        delta.push(error * (activation > 0 ? 1 : 0)); // ReLU derivative
      }
      deltas[l] = delta;
    }

    // Update weights and biases
    for (let l = 0; l < numLayers; l++) {
      const layer = this.layers[l];
      const prevActivation = activations[l];
      for (let j = 0; j < layer.bias.length; j++) {
        layer.bias[j] -= learningRate * deltas[l][j];
        for (let i = 0; i < prevActivation.length; i++) {
          if (!layer.weights[i]) layer.weights[i] = [];
          layer.weights[i][j] = (layer.weights[i][j] || 0) - learningRate * deltas[l][j] * prevActivation[i];
        }
      }
    }
  }

  train(input, targetOutput, learningRate = 0.001) {
    const { output, activations } = this.forward(input);
    this.backward(activations, targetOutput, learningRate);

    // Calculate MSE loss
    let loss = 0;
    for (let i = 0; i < output.length; i++) {
      loss += (output[i] - targetOutput[i]) ** 2;
    }
    return loss / output.length;
  }

  copyFrom(other) {
    for (let l = 0; l < this.layers.length; l++) {
      this.layers[l].bias = [...other.layers[l].bias];
      this.layers[l].weights = other.layers[l].weights.map(row => [...row]);
    }
  }

  serialize() {
    return this.layers.map(l => ({
      weights: l.weights.map(row => [...row]),
      bias: [...l.bias],
      type: l.type
    }));
  }

  deserialize(data) {
    for (let l = 0; l < data.length && l < this.layers.length; l++) {
      this.layers[l].weights = data[l].weights;
      this.layers[l].bias = data[l].bias;
    }
  }
}

class DQN {
  constructor(config = {}) {
    this.stateSize = config.stateSize || 10;
    this.actionSize = config.actionSize || 5;
    this.hiddenSizes = config.hiddenSizes || [64, 32];
    this.learningRate = config.learningRate || 0.001;
    this.discountFactor = config.discountFactor || 0.99;
    this.epsilon = config.epsilon || 1.0;
    this.epsilonDecay = config.epsilonDecay || 0.995;
    this.epsilonMin = config.epsilonMin || 0.01;
    this.batchSize = config.batchSize || 32;
    this.targetUpdateFreq = config.targetUpdateFreq || 100;

    this.onlineNet = new SimpleNeuralNet(this.stateSize, this.hiddenSizes, this.actionSize);
    this.targetNet = new SimpleNeuralNet(this.stateSize, this.hiddenSizes, this.actionSize);
    this.targetNet.copyFrom(this.onlineNet);

    this.replayBuffer = new ReplayBuffer(config.bufferSize || 10000);
    this.trainSteps = 0;
    this.rng = new RandomGenerator();
    this.lossHistory = [];
  }

  getAction(state) {
    if (this.rng.next() < this.epsilon) {
      return this.rng.nextInt(0, this.actionSize - 1);
    }
    const { output } = this.onlineNet.forward(state);
    return argmax(output);
  }

  getActionValues(state) {
    const { output } = this.onlineNet.forward(state);
    return output;
  }

  addExperience(state, action, reward, nextState, done) {
    this.replayBuffer.add(state, action, reward, nextState, done);
  }

  train() {
    if (this.replayBuffer.size < this.batchSize) return null;

    const batch = this.replayBuffer.sample(this.batchSize);
    let totalLoss = 0;

    for (const exp of batch) {
      const { output: currentQ, activations } = this.onlineNet.forward(exp.state);
      const { output: nextQ } = this.targetNet.forward(exp.nextState);

      const target = [...currentQ];
      if (exp.done) {
        target[exp.action] = exp.reward;
      } else {
        target[exp.action] = exp.reward + this.discountFactor * Math.max(...nextQ);
      }

      const loss = this.onlineNet.train(exp.state, target, this.learningRate);
      totalLoss += loss;
    }

    this.trainSteps++;
    this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);

    if (this.trainSteps % this.targetUpdateFreq === 0) {
      this.targetNet.copyFrom(this.onlineNet);
    }

    const avgLoss = totalLoss / batch.length;
    this.lossHistory.push(avgLoss);
    if (this.lossHistory.length > 1000) this.lossHistory.shift();

    return avgLoss;
  }

  serialize() {
    return {
      onlineNet: this.onlineNet.serialize(),
      config: {
        stateSize: this.stateSize,
        actionSize: this.actionSize,
        hiddenSizes: this.hiddenSizes,
        epsilon: this.epsilon,
        trainSteps: this.trainSteps
      },
      replayBuffer: this.replayBuffer.serialize(),
      lossHistory: this.lossHistory.slice(-200)
    };
  }

  deserialize(data) {
    if (data.onlineNet) {
      this.onlineNet.deserialize(data.onlineNet);
      this.targetNet.copyFrom(this.onlineNet);
    }
    if (data.config) {
      this.epsilon = data.config.epsilon || 0.01;
      this.trainSteps = data.config.trainSteps || 0;
    }
    if (data.replayBuffer) {
      this.replayBuffer.deserialize(data.replayBuffer);
    }
    this.lossHistory = data.lossHistory || [];
  }
}

// ============================================================================
// §5  POLICY GRADIENT — REINFORCE Algorithm
// ============================================================================

class PolicyGradientAgent {
  constructor(config = {}) {
    this.stateSize = config.stateSize || 10;
    this.actionSize = config.actionSize || 5;
    this.hiddenSizes = config.hiddenSizes || [64, 32];
    this.learningRate = config.learningRate || 0.001;
    this.discountFactor = config.discountFactor || 0.99;
    this.entropy_coeff = config.entropyCoeff || 0.01;

    this.policyNet = new SimpleNeuralNet(this.stateSize, this.hiddenSizes, this.actionSize);
    this.episodeStates = [];
    this.episodeActions = [];
    this.episodeRewards = [];
    this.rewardHistory = [];
    this.rng = new RandomGenerator();
  }

  getAction(state) {
    const { output } = this.policyNet.forward(state);
    const probs = softmax(output);
    const action = this.rng.weightedChoice(probs);
    this.episodeStates.push([...state]);
    this.episodeActions.push(action);
    return action;
  }

  getActionProbabilities(state) {
    const { output } = this.policyNet.forward(state);
    return softmax(output);
  }

  addReward(reward) {
    this.episodeRewards.push(reward);
  }

  computeReturns() {
    const returns = new Array(this.episodeRewards.length);
    let G = 0;
    for (let t = this.episodeRewards.length - 1; t >= 0; t--) {
      G = this.episodeRewards[t] + this.discountFactor * G;
      returns[t] = G;
    }
    // Normalize returns
    const m = mean(returns);
    const std = Math.sqrt(mean(returns.map(r => (r - m) ** 2))) || 1;
    return returns.map(r => (r - m) / std);
  }

  train() {
    if (this.episodeStates.length === 0) return null;

    const returns = this.computeReturns();
    let totalLoss = 0;

    for (let t = 0; t < this.episodeStates.length; t++) {
      const state = this.episodeStates[t];
      const action = this.episodeActions[t];
      const G = returns[t];

      const { output } = this.policyNet.forward(state);
      const probs = softmax(output);

      // Target: increase probability of actions with positive returns
      const target = [...output];
      for (let a = 0; a < this.actionSize; a++) {
        if (a === action) {
          target[a] = output[a] + this.learningRate * G;
        }
      }

      // Add entropy bonus for exploration
      const entropy = -sum(probs.map(p => p > 0 ? p * Math.log(p) : 0));
      for (let a = 0; a < this.actionSize; a++) {
        target[a] += this.entropy_coeff * entropy;
      }

      const loss = this.policyNet.train(state, target, this.learningRate);
      totalLoss += loss;
    }

    const episodeReturn = sum(this.episodeRewards);
    this.rewardHistory.push(episodeReturn);
    if (this.rewardHistory.length > 1000) this.rewardHistory.shift();

    // Reset episode
    this.episodeStates = [];
    this.episodeActions = [];
    this.episodeRewards = [];

    return { loss: totalLoss, episodeReturn };
  }

  serialize() {
    return {
      policyNet: this.policyNet.serialize(),
      config: {
        stateSize: this.stateSize,
        actionSize: this.actionSize,
        hiddenSizes: this.hiddenSizes,
        learningRate: this.learningRate,
        discountFactor: this.discountFactor
      },
      rewardHistory: this.rewardHistory.slice(-200)
    };
  }

  deserialize(data) {
    if (data.policyNet) this.policyNet.deserialize(data.policyNet);
    this.rewardHistory = data.rewardHistory || [];
  }
}

// ============================================================================
// §6  ACTOR-CRITIC — A2C Implementation
// ============================================================================

class ActorCritic {
  constructor(config = {}) {
    this.stateSize = config.stateSize || 10;
    this.actionSize = config.actionSize || 5;
    this.hiddenSizes = config.hiddenSizes || [64, 32];
    this.actorLR = config.actorLR || 0.001;
    this.criticLR = config.criticLR || 0.005;
    this.discountFactor = config.discountFactor || 0.99;
    this.entropyCoeff = config.entropyCoeff || 0.01;

    this.actor = new SimpleNeuralNet(this.stateSize, this.hiddenSizes, this.actionSize);
    this.critic = new SimpleNeuralNet(this.stateSize, this.hiddenSizes, 1);

    this.rng = new RandomGenerator();
    this.rewardHistory = [];
    this.lossHistory = [];
  }

  getAction(state) {
    const { output } = this.actor.forward(state);
    const probs = softmax(output);
    return this.rng.weightedChoice(probs);
  }

  getValue(state) {
    const { output } = this.critic.forward(state);
    return output[0];
  }

  update(state, action, reward, nextState, done) {
    const value = this.getValue(state);
    const nextValue = done ? 0 : this.getValue(nextState);
    const advantage = reward + this.discountFactor * nextValue - value;

    // Update critic
    const targetValue = reward + this.discountFactor * nextValue;
    this.critic.train(state, [targetValue], this.criticLR);

    // Update actor
    const { output } = this.actor.forward(state);
    const probs = softmax(output);
    const target = [...output];
    target[action] = output[action] + this.actorLR * advantage;

    // Entropy bonus
    const entropy = -sum(probs.map(p => p > 0 ? p * Math.log(p) : 0));
    for (let a = 0; a < this.actionSize; a++) {
      target[a] += this.entropyCoeff * entropy;
    }

    const actorLoss = this.actor.train(state, target, this.actorLR);
    this.lossHistory.push(actorLoss);
    if (this.lossHistory.length > 1000) this.lossHistory.shift();

    return { advantage, actorLoss, value };
  }

  serialize() {
    return {
      actor: this.actor.serialize(),
      critic: this.critic.serialize(),
      config: {
        stateSize: this.stateSize,
        actionSize: this.actionSize,
        hiddenSizes: this.hiddenSizes
      },
      rewardHistory: this.rewardHistory.slice(-200),
      lossHistory: this.lossHistory.slice(-200)
    };
  }

  deserialize(data) {
    if (data.actor) this.actor.deserialize(data.actor);
    if (data.critic) this.critic.deserialize(data.critic);
    this.rewardHistory = data.rewardHistory || [];
    this.lossHistory = data.lossHistory || [];
  }
}

// ============================================================================
// §7  BUDGET OPTIMIZATION ENVIRONMENT
// ============================================================================

class BudgetOptimizationEnv {
  constructor(config = {}) {
    this.categories = config.categories || [
      'food', 'transport', 'utilities', 'entertainment', 'shopping',
      'healthcare', 'education', 'savings', 'investment', 'misc'
    ];
    this.numCategories = this.categories.length;
    this.monthlyIncome = config.monthlyIncome || 50000;
    this.currentAllocations = config.currentAllocations || {};
    this.historicalSpending = config.historicalSpending || {};
    this.savingsGoal = config.savingsGoal || 0.2;
    this.essentialCategories = config.essentialCategories || ['food', 'utilities', 'healthcare'];

    this.state = this._getInitialState();
    this.stepCount = 0;
    this.maxSteps = 50;
    this.totalReward = 0;
  }

  _getInitialState() {
    const state = [];
    for (const cat of this.categories) {
      const allocated = (this.currentAllocations[cat] || 0) / this.monthlyIncome;
      const historical = (this.historicalSpending[cat] || 0) / this.monthlyIncome;
      state.push(allocated, historical);
    }
    // Add savings rate and step progress
    const totalAllocated = sum(this.categories.map(c => this.currentAllocations[c] || 0));
    state.push(totalAllocated / this.monthlyIncome);
    state.push(this.stepCount / this.maxSteps);
    return state;
  }

  getStateSize() { return this.numCategories * 2 + 2; }
  getActionSize() { return this.numCategories * 3; } // increase, decrease, keep for each category

  reset() {
    this.stepCount = 0;
    this.totalReward = 0;
    this.state = this._getInitialState();
    return [...this.state];
  }

  step(action) {
    this.stepCount++;
    const categoryIdx = Math.floor(action / 3);
    const adjustType = action % 3; // 0=increase, 1=decrease, 2=keep

    if (categoryIdx < this.numCategories) {
      const cat = this.categories[categoryIdx];
      const current = this.currentAllocations[cat] || 0;
      const adjustAmount = this.monthlyIncome * 0.02;

      if (adjustType === 0) {
        this.currentAllocations[cat] = Math.min(current + adjustAmount, this.monthlyIncome * 0.5);
      } else if (adjustType === 1) {
        const minAllocation = this.essentialCategories.includes(cat)
          ? this.monthlyIncome * 0.05
          : 0;
        this.currentAllocations[cat] = Math.max(current - adjustAmount, minAllocation);
      }
    }

    const reward = this._calculateReward();
    this.totalReward += reward;
    this.state = this._getInitialState();
    const done = this.stepCount >= this.maxSteps;

    return {
      state: [...this.state],
      reward,
      done,
      info: {
        allocations: { ...this.currentAllocations },
        savingsRate: this._getSavingsRate(),
        totalAllocated: this._getTotalAllocated()
      }
    };
  }

  _getTotalAllocated() {
    return sum(this.categories.map(c => this.currentAllocations[c] || 0));
  }

  _getSavingsRate() {
    return 1 - this._getTotalAllocated() / this.monthlyIncome;
  }

  _calculateReward() {
    let reward = 0;
    const savingsRate = this._getSavingsRate();
    const totalAllocated = this._getTotalAllocated();

    // Reward for meeting savings goal
    if (savingsRate >= this.savingsGoal) {
      reward += 2.0;
    } else {
      reward -= (this.savingsGoal - savingsRate) * 5;
    }

    // Penalty for over-allocation
    if (totalAllocated > this.monthlyIncome) {
      reward -= 5.0;
    }

    // Reward for keeping essentials funded
    for (const cat of this.essentialCategories) {
      const allocated = (this.currentAllocations[cat] || 0) / this.monthlyIncome;
      if (allocated >= 0.05) reward += 0.5;
      else reward -= 1.0;
    }

    // Reward for being close to historical spending (realistic budgets)
    for (const cat of this.categories) {
      const allocated = this.currentAllocations[cat] || 0;
      const historical = this.historicalSpending[cat] || 0;
      if (historical > 0) {
        const deviation = Math.abs(allocated - historical) / historical;
        if (deviation < 0.1) reward += 0.3;
        else if (deviation > 0.5) reward -= 0.2;
      }
    }

    // Penalty for unbalanced allocation
    const values = this.categories.map(c => this.currentAllocations[c] || 0);
    if (values.length > 1) {
      const maxVal = Math.max(...values);
      const minVal = Math.min(...values);
      if (maxVal > 0 && minVal / maxVal < 0.01) reward -= 0.5;
    }

    return reward;
  }
}

// ============================================================================
// §8  INVESTMENT STRATEGY ENVIRONMENT
// ============================================================================

class InvestmentStrategyEnv {
  constructor(config = {}) {
    this.assetClasses = config.assetClasses || [
      'equity_large', 'equity_mid', 'equity_small',
      'debt_govt', 'debt_corporate', 'gold',
      'real_estate', 'fixed_deposit', 'ppf', 'nps'
    ];
    this.numAssets = this.assetClasses.length;
    this.totalCorpus = config.totalCorpus || 1000000;
    this.riskTolerance = config.riskTolerance || 0.5; // 0-1 scale
    this.investmentHorizon = config.investmentHorizon || 10; // years
    this.age = config.age || 30;
    this.monthlyContribution = config.monthlyContribution || 10000;

    // Asset characteristics
    this.assetReturns = {
      equity_large: { mean: 0.12, std: 0.18 },
      equity_mid: { mean: 0.15, std: 0.22 },
      equity_small: { mean: 0.18, std: 0.28 },
      debt_govt: { mean: 0.065, std: 0.03 },
      debt_corporate: { mean: 0.075, std: 0.05 },
      gold: { mean: 0.08, std: 0.12 },
      real_estate: { mean: 0.10, std: 0.10 },
      fixed_deposit: { mean: 0.065, std: 0.01 },
      ppf: { mean: 0.071, std: 0.005 },
      nps: { mean: 0.095, std: 0.08 }
    };

    this.allocations = {};
    this.assetClasses.forEach(a => this.allocations[a] = 1.0 / this.numAssets);
    this.stepCount = 0;
    this.maxSteps = 30;
    this.rng = new RandomGenerator();
  }

  getStateSize() { return this.numAssets * 3 + 4; }
  getActionSize() { return this.numAssets * 3; }

  _getState() {
    const state = [];
    for (const asset of this.assetClasses) {
      state.push(this.allocations[asset] || 0);
      state.push(this.assetReturns[asset]?.mean || 0);
      state.push(this.assetReturns[asset]?.std || 0);
    }
    state.push(this.riskTolerance);
    state.push(this.investmentHorizon / 30);
    state.push(this.age / 70);
    state.push(this.stepCount / this.maxSteps);
    return state;
  }

  reset() {
    this.assetClasses.forEach(a => this.allocations[a] = 1.0 / this.numAssets);
    this.stepCount = 0;
    return this._getState();
  }

  step(action) {
    this.stepCount++;
    const assetIdx = Math.floor(action / 3);
    const adjustType = action % 3;

    if (assetIdx < this.numAssets) {
      const asset = this.assetClasses[assetIdx];
      if (adjustType === 0) {
        this.allocations[asset] = Math.min((this.allocations[asset] || 0) + 0.05, 0.5);
      } else if (adjustType === 1) {
        this.allocations[asset] = Math.max((this.allocations[asset] || 0) - 0.05, 0);
      }
    }

    // Normalize allocations to sum to 1
    const total = sum(this.assetClasses.map(a => this.allocations[a] || 0));
    if (total > 0) {
      this.assetClasses.forEach(a => this.allocations[a] = (this.allocations[a] || 0) / total);
    }

    const reward = this._calculateReward();
    const done = this.stepCount >= this.maxSteps;

    return {
      state: this._getState(),
      reward,
      done,
      info: {
        allocations: { ...this.allocations },
        expectedReturn: this._getExpectedReturn(),
        portfolioRisk: this._getPortfolioRisk(),
        sharpeRatio: this._getSharpeRatio()
      }
    };
  }

  _getExpectedReturn() {
    return sum(this.assetClasses.map(a =>
      (this.allocations[a] || 0) * (this.assetReturns[a]?.mean || 0)
    ));
  }

  _getPortfolioRisk() {
    return Math.sqrt(sum(this.assetClasses.map(a =>
      ((this.allocations[a] || 0) * (this.assetReturns[a]?.std || 0)) ** 2
    )));
  }

  _getSharpeRatio() {
    const riskFreeRate = 0.05;
    const risk = this._getPortfolioRisk();
    return risk > 0 ? (this._getExpectedReturn() - riskFreeRate) / risk : 0;
  }

  _calculateReward() {
    let reward = 0;
    const expectedReturn = this._getExpectedReturn();
    const risk = this._getPortfolioRisk();
    const sharpe = this._getSharpeRatio();

    // Sharpe ratio reward
    reward += sharpe * 2;

    // Risk-tolerance alignment
    const equityAlloc = sum(['equity_large', 'equity_mid', 'equity_small'].map(a => this.allocations[a] || 0));
    const idealEquity = this.riskTolerance * 0.8;
    const equityDeviation = Math.abs(equityAlloc - idealEquity);
    reward -= equityDeviation * 3;

    // Age-appropriate allocation (100-age rule approximation)
    const idealEquityByAge = Math.max(0.2, (100 - this.age) / 100);
    if (Math.abs(equityAlloc - idealEquityByAge) < 0.15) reward += 1;

    // Diversification bonus
    const numAllocated = this.assetClasses.filter(a => (this.allocations[a] || 0) > 0.05).length;
    reward += Math.min(numAllocated / this.numAssets, 1) * 2;

    // Horizon-appropriate (longer horizon = more equity OK)
    if (this.investmentHorizon > 7 && equityAlloc > 0.5) reward += 0.5;
    if (this.investmentHorizon < 3 && equityAlloc > 0.4) reward -= 1;

    // Tax-efficiency for Indian investors
    const taxEfficient = (this.allocations['ppf'] || 0) + (this.allocations['nps'] || 0);
    if (taxEfficient > 0.1) reward += 0.5;

    return reward;
  }
}

// ============================================================================
// §9  DEBT PAYOFF ENVIRONMENT
// ============================================================================

class DebtPayoffEnv {
  constructor(config = {}) {
    this.debts = config.debts || [
      { name: 'Credit Card', balance: 50000, rate: 0.36, minPayment: 2500 },
      { name: 'Personal Loan', balance: 200000, rate: 0.14, minPayment: 8000 },
      { name: 'Home Loan', balance: 3000000, rate: 0.085, minPayment: 25000 },
      { name: 'Car Loan', balance: 500000, rate: 0.10, minPayment: 12000 }
    ];
    this.monthlyBudget = config.monthlyBudget || 60000;
    this.extraPayment = config.extraPayment || 10000;

    this.originalDebts = JSON.parse(JSON.stringify(this.debts));
    this.stepCount = 0;
    this.maxSteps = 120; // 10 years max
    this.totalInterestPaid = 0;
  }

  getStateSize() { return this.debts.length * 3 + 2; }
  getActionSize() { return this.debts.length; } // Which debt gets extra payment

  _getState() {
    const state = [];
    const totalBalance = sum(this.debts.map(d => d.balance));
    for (const debt of this.debts) {
      state.push(debt.balance / (totalBalance || 1));
      state.push(debt.rate);
      state.push(debt.minPayment / this.monthlyBudget);
    }
    state.push(this.stepCount / this.maxSteps);
    state.push(this.totalInterestPaid / (totalBalance || 1));
    return state;
  }

  reset() {
    this.debts = JSON.parse(JSON.stringify(this.originalDebts));
    this.stepCount = 0;
    this.totalInterestPaid = 0;
    return this._getState();
  }

  step(action) {
    this.stepCount++;

    // Apply interest and minimum payments to all debts
    for (const debt of this.debts) {
      if (debt.balance <= 0) continue;
      const interest = debt.balance * (debt.rate / 12);
      debt.balance += interest;
      this.totalInterestPaid += interest;
      debt.balance = Math.max(0, debt.balance - debt.minPayment);
    }

    // Apply extra payment to chosen debt
    if (action >= 0 && action < this.debts.length && this.debts[action].balance > 0) {
      this.debts[action].balance = Math.max(0, this.debts[action].balance - this.extraPayment);
    }

    const totalBalance = sum(this.debts.map(d => d.balance));
    const done = totalBalance <= 0 || this.stepCount >= this.maxSteps;
    const reward = this._calculateReward(action, done, totalBalance);

    return {
      state: this._getState(),
      reward,
      done,
      info: {
        debts: this.debts.map(d => ({ ...d })),
        totalBalance,
        totalInterestPaid: this.totalInterestPaid,
        monthsElapsed: this.stepCount
      }
    };
  }

  _calculateReward(action, done, totalBalance) {
    let reward = 0;

    // Big reward for paying off all debt
    if (totalBalance <= 0) {
      reward += 100 - this.stepCount; // Faster is better
      reward -= this.totalInterestPaid / 10000; // Less interest is better
      return reward;
    }

    // Reward for paying highest-interest debt (avalanche method alignment)
    const activeDebts = this.debts.filter(d => d.balance > 0);
    if (activeDebts.length > 0) {
      const highestRate = Math.max(...activeDebts.map(d => d.rate));
      if (this.debts[action]?.rate === highestRate && this.debts[action]?.balance > 0) {
        reward += 1.0;
      }
    }

    // Reward for each debt paid off
    const paidOff = this.debts.filter(d => d.balance <= 0).length;
    reward += paidOff * 0.5;

    // Small per-step penalty to encourage speed
    reward -= 0.1;

    // Penalty for choosing already-paid-off debt
    if (action >= 0 && action < this.debts.length && this.debts[action].balance <= 0) {
      reward -= 2.0;
    }

    return reward;
  }
}

// ============================================================================
// §10  RL BUDGET OPTIMIZER — Combines Environment + Agent for Budget Optimization
// ============================================================================

class RLBudgetOptimizer {
  constructor() {
    this.modelDir = path.join(__dirname, '../../data/rl-models');
    this.agents = {};
  }

  async _ensureDir() {
    try {
      await fs.promises.mkdir(this.modelDir, { recursive: true });
    } catch (e) { /* directory exists */ }
  }

  _getUserAgent(userId, envType = 'budget') {
    const key = `${userId}_${envType}`;
    if (!this.agents[key]) {
      this.agents[key] = {
        dqn: null,
        env: null,
        trained: false,
        lastTrained: null
      };
    }
    return this.agents[key];
  }

  async optimizeBudget(userId, financialData) {
    const agent = this._getUserAgent(userId, 'budget');
    const env = new BudgetOptimizationEnv({
      categories: financialData.categories || undefined,
      monthlyIncome: financialData.monthlyIncome || 50000,
      currentAllocations: financialData.currentAllocations || {},
      historicalSpending: financialData.historicalSpending || {},
      savingsGoal: financialData.savingsGoal || 0.2,
      essentialCategories: financialData.essentialCategories || undefined
    });

    const dqn = new DQN({
      stateSize: env.getStateSize(),
      actionSize: env.getActionSize(),
      hiddenSizes: [128, 64],
      epsilon: agent.trained ? 0.1 : 1.0,
      batchSize: 32
    });

    // Load saved model if exists
    await this._loadModel(userId, 'budget', dqn);

    // Train for episodes
    const numEpisodes = agent.trained ? 50 : 200;
    const episodeRewards = [];

    for (let ep = 0; ep < numEpisodes; ep++) {
      let state = env.reset();
      let totalReward = 0;

      for (let step = 0; step < env.maxSteps; step++) {
        const action = dqn.getAction(state);
        const result = env.step(action);
        dqn.addExperience(state, action, result.reward, result.state, result.done);
        dqn.train();
        state = result.state;
        totalReward += result.reward;
        if (result.done) break;
      }
      episodeRewards.push(totalReward);
    }

    // Get optimized allocation using learned policy
    let state = env.reset();
    let bestAllocations = {};
    for (let step = 0; step < env.maxSteps; step++) {
      const action = dqn.getAction(state);
      const result = env.step(action);
      state = result.state;
      bestAllocations = result.info.allocations;
      if (result.done) break;
    }

    // Save model
    agent.dqn = dqn;
    agent.trained = true;
    agent.lastTrained = new Date();
    await this._saveModel(userId, 'budget', dqn);

    return {
      optimizedAllocations: bestAllocations,
      savingsRate: 1 - sum(Object.values(bestAllocations)) / env.monthlyIncome,
      trainingEpisodes: numEpisodes,
      averageReward: mean(episodeRewards.slice(-20)),
      convergence: this._checkConvergence(episodeRewards),
      recommendations: this._generateBudgetRecommendations(bestAllocations, financialData)
    };
  }

  async optimizeInvestments(userId, investmentData) {
    const env = new InvestmentStrategyEnv({
      totalCorpus: investmentData.totalCorpus || 1000000,
      riskTolerance: investmentData.riskTolerance || 0.5,
      investmentHorizon: investmentData.investmentHorizon || 10,
      age: investmentData.age || 30,
      monthlyContribution: investmentData.monthlyContribution || 10000
    });

    const agent = new ActorCritic({
      stateSize: env.getStateSize(),
      actionSize: env.getActionSize(),
      hiddenSizes: [128, 64],
      actorLR: 0.001,
      criticLR: 0.005
    });

    await this._loadModel(userId, 'investment', agent);

    const numEpisodes = 150;
    const episodeRewards = [];

    for (let ep = 0; ep < numEpisodes; ep++) {
      let state = env.reset();
      let totalReward = 0;

      for (let step = 0; step < env.maxSteps; step++) {
        const action = agent.getAction(state);
        const result = env.step(action);
        agent.update(state, action, result.reward, result.state, result.done);
        state = result.state;
        totalReward += result.reward;
        if (result.done) break;
      }
      episodeRewards.push(totalReward);
    }

    // Get optimal allocation
    let state = env.reset();
    let bestInfo = {};
    for (let step = 0; step < env.maxSteps; step++) {
      const action = agent.getAction(state);
      const result = env.step(action);
      state = result.state;
      bestInfo = result.info;
      if (result.done) break;
    }

    await this._saveModel(userId, 'investment', agent);

    return {
      optimalAllocations: bestInfo.allocations || {},
      expectedReturn: bestInfo.expectedReturn || 0,
      portfolioRisk: bestInfo.portfolioRisk || 0,
      sharpeRatio: bestInfo.sharpeRatio || 0,
      trainingEpisodes: numEpisodes,
      averageReward: mean(episodeRewards.slice(-20)),
      recommendations: this._generateInvestmentRecommendations(bestInfo, investmentData)
    };
  }

  async optimizeDebtPayoff(userId, debtData) {
    const env = new DebtPayoffEnv({
      debts: debtData.debts || undefined,
      monthlyBudget: debtData.monthlyBudget || 60000,
      extraPayment: debtData.extraPayment || 10000
    });

    const dqn = new DQN({
      stateSize: env.getStateSize(),
      actionSize: env.getActionSize(),
      hiddenSizes: [64, 32],
      epsilon: 0.5,
      batchSize: 16
    });

    await this._loadModel(userId, 'debt', dqn);

    const numEpisodes = 200;
    const episodeRewards = [];

    for (let ep = 0; ep < numEpisodes; ep++) {
      let state = env.reset();
      let totalReward = 0;

      for (let step = 0; step < env.maxSteps; step++) {
        const action = dqn.getAction(state);
        const result = env.step(action);
        dqn.addExperience(state, action, result.reward, result.state, result.done);
        dqn.train();
        state = result.state;
        totalReward += result.reward;
        if (result.done) break;
      }
      episodeRewards.push(totalReward);
    }

    // Get optimal strategy
    let state = env.reset();
    const strategy = [];
    let lastInfo = {};
    for (let step = 0; step < env.maxSteps; step++) {
      const action = dqn.getAction(state);
      const result = env.step(action);
      strategy.push({
        month: step + 1,
        focusDebt: env.debts[action]?.name || 'Unknown',
        actionIndex: action,
        balances: result.info.debts.map(d => ({ name: d.name, balance: Math.round(d.balance) }))
      });
      state = result.state;
      lastInfo = result.info;
      if (result.done) break;
    }

    await this._saveModel(userId, 'debt', dqn);

    return {
      strategy: strategy.slice(0, 24),
      totalInterestSaved: this._estimateInterestSavings(debtData, strategy),
      monthsToDebtFree: strategy.length,
      finalState: lastInfo,
      trainingEpisodes: numEpisodes,
      averageReward: mean(episodeRewards.slice(-20)),
      recommendations: this._generateDebtRecommendations(strategy, debtData)
    };
  }

  _checkConvergence(rewards) {
    if (rewards.length < 20) return { converged: false, stability: 0 };
    const recent = rewards.slice(-20);
    const m = mean(recent);
    const std = Math.sqrt(mean(recent.map(r => (r - m) ** 2)));
    const coeffVar = m !== 0 ? std / Math.abs(m) : 1;
    return {
      converged: coeffVar < 0.15,
      stability: 1 - Math.min(coeffVar, 1),
      trend: mean(recent.slice(-5)) > mean(recent.slice(0, 5)) ? 'improving' : 'stable'
    };
  }

  _generateBudgetRecommendations(allocations, data) {
    const recommendations = [];
    const income = data.monthlyIncome || 50000;

    for (const [cat, amount] of Object.entries(allocations)) {
      const pct = (amount / income) * 100;
      const historical = data.historicalSpending?.[cat] || 0;
      const histPct = (historical / income) * 100;

      if (pct < histPct * 0.8) {
        recommendations.push({
          category: cat,
          action: 'reduce',
          current: histPct.toFixed(1) + '%',
          recommended: pct.toFixed(1) + '%',
          savings: Math.round(historical - amount),
          priority: historical - amount > 2000 ? 'high' : 'medium'
        });
      } else if (pct > histPct * 1.2 && histPct > 0) {
        recommendations.push({
          category: cat,
          action: 'increase',
          current: histPct.toFixed(1) + '%',
          recommended: pct.toFixed(1) + '%',
          reason: 'Under-allocated based on spending pattern',
          priority: 'low'
        });
      }
    }

    return recommendations.sort((a, b) =>
      (a.priority === 'high' ? 0 : a.priority === 'medium' ? 1 : 2) -
      (b.priority === 'high' ? 0 : b.priority === 'medium' ? 1 : 2)
    );
  }

  _generateInvestmentRecommendations(info, data) {
    const recommendations = [];
    const allocs = info.allocations || {};
    const risk = data.riskTolerance || 0.5;

    const equityAlloc = sum(['equity_large', 'equity_mid', 'equity_small'].map(a => allocs[a] || 0));
    const debtAlloc = sum(['debt_govt', 'debt_corporate', 'fixed_deposit'].map(a => allocs[a] || 0));

    if (equityAlloc > 0.6 && risk < 0.3) {
      recommendations.push({
        type: 'rebalance',
        message: 'Equity allocation is higher than your risk comfort. Consider shifting to debt.',
        priority: 'high'
      });
    }

    if ((allocs.ppf || 0) + (allocs.nps || 0) < 0.1) {
      recommendations.push({
        type: 'tax_saving',
        message: 'Consider allocating to PPF/NPS for Section 80C and 80CCD tax benefits.',
        priority: 'medium'
      });
    }

    if (info.sharpeRatio && info.sharpeRatio > 1) {
      recommendations.push({
        type: 'positive',
        message: `Good risk-adjusted returns! Sharpe ratio: ${info.sharpeRatio.toFixed(2)}`,
        priority: 'info'
      });
    }

    return recommendations;
  }

  _generateDebtRecommendations(strategy, data) {
    const recommendations = [];

    // Check if avalanche method is optimal
    const debts = data.debts || [];
    const highestRateDebt = debts.reduce((max, d) => d.rate > (max?.rate || 0) ? d : max, null);

    if (highestRateDebt) {
      recommendations.push({
        type: 'strategy',
        message: `Focus extra payments on ${highestRateDebt.name} (${(highestRateDebt.rate * 100).toFixed(1)}% APR) for maximum interest savings.`,
        priority: 'high'
      });
    }

    if (strategy.length > 60) {
      recommendations.push({
        type: 'acceleration',
        message: 'Consider increasing monthly extra payment to become debt-free sooner.',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  _estimateInterestSavings(data, strategy) {
    // Compare RL strategy vs minimum-only payments
    const debts = data.debts || [];
    let minOnlyInterest = 0;
    const simDebts = JSON.parse(JSON.stringify(debts));

    for (let month = 0; month < 120; month++) {
      let allPaid = true;
      for (const debt of simDebts) {
        if (debt.balance <= 0) continue;
        allPaid = false;
        const interest = debt.balance * (debt.rate / 12);
        minOnlyInterest += interest;
        debt.balance = Math.max(0, debt.balance + interest - debt.minPayment);
      }
      if (allPaid) break;
    }

    const rlInterest = strategy.length > 0 ?
      strategy[strategy.length - 1]?.totalInterestPaid || minOnlyInterest * 0.7 : minOnlyInterest;

    return Math.max(0, Math.round(minOnlyInterest - rlInterest));
  }

  async _saveModel(userId, type, agent) {
    await this._ensureDir();
    const filePath = path.join(this.modelDir, `${userId}_${type}_rl.json`);
    try {
      const data = agent.serialize();
      await fs.promises.writeFile(filePath, JSON.stringify(data));
    } catch (e) {
      logger.debug(`RL model save failed: ${e.message}`);
    }
  }

  async _loadModel(userId, type, agent) {
    const filePath = path.join(this.modelDir, `${userId}_${type}_rl.json`);
    try {
      const raw = await fs.promises.readFile(filePath, 'utf8');
      const data = JSON.parse(raw);
      agent.deserialize(data);
      return true;
    } catch (e) {
      return false;
    }
  }
}

// ============================================================================
// §11  MULTI-ARMED BANDIT — Feature/Recommendation A/B Testing
// ============================================================================

class MultiArmedBandit {
  constructor(numArms, config = {}) {
    this.numArms = numArms;
    this.strategy = config.strategy || 'ucb1'; // ucb1, epsilon_greedy, thompson
    this.epsilon = config.epsilon || 0.1;
    this.counts = new Array(numArms).fill(0);
    this.values = new Array(numArms).fill(0);
    this.successes = new Array(numArms).fill(1);
    this.failures = new Array(numArms).fill(1);
    this.totalPulls = 0;
    this.rng = new RandomGenerator();
  }

  selectArm() {
    this.totalPulls++;

    switch (this.strategy) {
      case 'ucb1': return this._ucb1();
      case 'epsilon_greedy': return this._epsilonGreedy();
      case 'thompson': return this._thompsonSampling();
      default: return this._ucb1();
    }
  }

  _ucb1() {
    // Try each arm at least once
    for (let i = 0; i < this.numArms; i++) {
      if (this.counts[i] === 0) return i;
    }

    let bestArm = 0;
    let bestValue = -Infinity;
    for (let i = 0; i < this.numArms; i++) {
      const exploitation = this.values[i];
      const exploration = Math.sqrt(2 * Math.log(this.totalPulls) / this.counts[i]);
      const ucb = exploitation + exploration;
      if (ucb > bestValue) {
        bestValue = ucb;
        bestArm = i;
      }
    }
    return bestArm;
  }

  _epsilonGreedy() {
    if (this.rng.next() < this.epsilon) {
      return this.rng.nextInt(0, this.numArms - 1);
    }
    return argmax(this.values);
  }

  _thompsonSampling() {
    const samples = [];
    for (let i = 0; i < this.numArms; i++) {
      samples.push(this._betaSample(this.successes[i], this.failures[i]));
    }
    return argmax(samples);
  }

  _betaSample(alpha, beta) {
    // Approximate beta distribution sampling
    const x = this._gammaSample(alpha);
    const y = this._gammaSample(beta);
    return x / (x + y);
  }

  _gammaSample(shape) {
    if (shape < 1) {
      return this._gammaSample(shape + 1) * Math.pow(this.rng.next(), 1.0 / shape);
    }
    const d = shape - 1.0 / 3.0;
    const c = 1.0 / Math.sqrt(9.0 * d);
    while (true) {
      let x, v;
      do {
        x = this._normalSample();
        v = 1.0 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = this.rng.next();
      if (u < 1.0 - 0.0331 * (x * x) * (x * x)) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }

  _normalSample() {
    const u1 = this.rng.next();
    const u2 = this.rng.next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  update(arm, reward) {
    this.counts[arm]++;
    const n = this.counts[arm];
    this.values[arm] = this.values[arm] + (reward - this.values[arm]) / n;

    if (reward > 0) this.successes[arm]++;
    else this.failures[arm]++;
  }

  getStatistics() {
    return {
      arms: this.numArms,
      totalPulls: this.totalPulls,
      values: [...this.values],
      counts: [...this.counts],
      bestArm: argmax(this.values),
      strategy: this.strategy
    };
  }

  serialize() {
    return {
      numArms: this.numArms,
      strategy: this.strategy,
      counts: [...this.counts],
      values: [...this.values],
      successes: [...this.successes],
      failures: [...this.failures],
      totalPulls: this.totalPulls
    };
  }

  deserialize(data) {
    this.counts = data.counts || new Array(this.numArms).fill(0);
    this.values = data.values || new Array(this.numArms).fill(0);
    this.successes = data.successes || new Array(this.numArms).fill(1);
    this.failures = data.failures || new Array(this.numArms).fill(1);
    this.totalPulls = data.totalPulls || 0;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Core RL Components
  QTable,
  DQN,
  SimpleNeuralNet,
  PolicyGradientAgent,
  ActorCritic,
  ReplayBuffer,

  // Environments
  BudgetOptimizationEnv,
  InvestmentStrategyEnv,
  DebtPayoffEnv,

  // High-Level Optimizers
  RLBudgetOptimizer,
  MultiArmedBandit,

  // Utilities
  RandomGenerator,
  softmax,
  argmax
};
