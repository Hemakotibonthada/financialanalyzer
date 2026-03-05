// ============================================================================
// EXPLAINABLE AI (XAI) ENGINE — Model Interpretability & Transparency
// ============================================================================
// Implements SHAP-like feature importance, LIME-like local explanations,
// counterfactual analysis, and natural language explanation generation
// for financial AI decisions. Runs entirely locally.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');

// ============================================================================
// §1  UTILITIES
// ============================================================================

const sum = (a) => a.reduce((s, v) => s + v, 0);
const mean = (a) => (a.length ? sum(a) / a.length : 0);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ============================================================================
// §2  FEATURE IMPORTANCE — Permutation-Based Feature Importance
// ============================================================================

class PermutationFeatureImportance {
  constructor(config = {}) {
    this.nRepeats = config.nRepeats || 10;
    this.metric = config.metric || 'mse';
  }

  compute(model, X, y, featureNames = null) {
    const baselineScore = this._score(model, X, y);
    const numFeatures = X[0]?.length || 0;
    const importances = {};

    for (let f = 0; f < numFeatures; f++) {
      const scores = [];

      for (let r = 0; r < this.nRepeats; r++) {
        const permutedX = X.map(row => [...row]);

        // Shuffle feature f
        const featureValues = permutedX.map(row => row[f]);
        for (let i = featureValues.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [featureValues[i], featureValues[j]] = [featureValues[j], featureValues[i]];
        }
        permutedX.forEach((row, i) => row[f] = featureValues[i]);

        const permutedScore = this._score(model, permutedX, y);
        scores.push(baselineScore - permutedScore);
      }

      const name = featureNames?.[f] || `feature_${f}`;
      importances[name] = {
        mean: mean(scores),
        std: Math.sqrt(mean(scores.map(s => (s - mean(scores)) ** 2))),
        rank: 0
      };
    }

    // Assign ranks
    const sorted = Object.entries(importances).sort((a, b) => b[1].mean - a[1].mean);
    sorted.forEach(([name], idx) => importances[name].rank = idx + 1);

    return {
      baselineScore,
      importances,
      topFeatures: sorted.slice(0, 10).map(([name, data]) => ({ name, ...data }))
    };
  }

  _score(model, X, y) {
    const predictions = model.predict(X);
    if (this.metric === 'accuracy') {
      let correct = 0;
      for (let i = 0; i < y.length; i++) {
        if (predictions[i] === y[i] || predictions[i] == y[i]) correct++;
      }
      return y.length > 0 ? correct / y.length : 0;
    }

    // MSE (for regression)
    let mse = 0;
    for (let i = 0; i < y.length; i++) {
      mse += (predictions[i] - y[i]) ** 2;
    }
    return -(mse / (y.length || 1)); // Negative because higher is better
  }
}

// ============================================================================
// §3  SHAPLEY VALUES — Approximate SHAP Explanation
// ============================================================================

class ShapleyExplainer {
  constructor(config = {}) {
    this.nSamples = config.nSamples || 100;
    this.backgroundData = null;
  }

  fit(backgroundData) {
    this.backgroundData = backgroundData;
    return this;
  }

  explain(model, instance) {
    if (!this.backgroundData || this.backgroundData.length === 0) {
      throw new Error('No background data provided. Call fit() first.');
    }

    const numFeatures = instance.length;
    const shapValues = new Array(numFeatures).fill(0);
    const bgMean = this.backgroundData[0].map((_, j) =>
      mean(this.backgroundData.map(d => d[j] || 0))
    );

    // Monte Carlo approximation of Shapley values
    for (let sample = 0; sample < this.nSamples; sample++) {
      // Random permutation
      const permutation = Array.from({ length: numFeatures }, (_, i) => i);
      for (let i = permutation.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
      }

      // Random background sample
      const bgSample = this.backgroundData[Math.floor(Math.random() * this.backgroundData.length)];

      // Compute marginal contributions
      let currentInput = [...bgSample];
      let prevPrediction = model.predict([currentInput])[0];

      for (const featureIdx of permutation) {
        currentInput[featureIdx] = instance[featureIdx];
        const newPrediction = model.predict([currentInput])[0];
        shapValues[featureIdx] += (typeof newPrediction === 'number' ? newPrediction : 0) -
                                  (typeof prevPrediction === 'number' ? prevPrediction : 0);
        prevPrediction = newPrediction;
      }
    }

    // Average over samples
    for (let i = 0; i < numFeatures; i++) {
      shapValues[i] /= this.nSamples;
    }

    // Base value (expected prediction)
    const predictions = this.backgroundData.map(d => {
      const pred = model.predict([d])[0];
      return typeof pred === 'number' ? pred : 0;
    });
    const baseValue = mean(predictions);

    return {
      shapValues,
      baseValue,
      instancePrediction: model.predict([instance])[0],
      featureContributions: shapValues.map((v, i) => ({
        feature: i,
        shapValue: v,
        absoluteValue: Math.abs(v),
        direction: v > 0 ? 'positive' : v < 0 ? 'negative' : 'neutral',
        featureValue: instance[i]
      })).sort((a, b) => b.absoluteValue - a.absoluteValue)
    };
  }

  explainBatch(model, instances) {
    return instances.map(instance => this.explain(model, instance));
  }
}

// ============================================================================
// §4  LIME — Local Interpretable Model-agnostic Explanations
// ============================================================================

class LIMEExplainer {
  constructor(config = {}) {
    this.nSamples = config.nSamples || 200;
    this.kernelWidth = config.kernelWidth || 0.75;
  }

  explain(model, instance, featureNames = null) {
    const numFeatures = instance.length;
    const perturbations = [];
    const predictions = [];
    const weights = [];

    // Generate perturbed samples
    for (let s = 0; s < this.nSamples; s++) {
      const perturbed = [...instance];
      const mask = [];

      for (let f = 0; f < numFeatures; f++) {
        const keep = Math.random() > 0.5;
        mask.push(keep ? 1 : 0);
        if (!keep) {
          // Random perturbation
          perturbed[f] = perturbed[f] + (Math.random() * 2 - 1) * Math.abs(perturbed[f] || 1) * 0.5;
        }
      }

      perturbations.push(perturbed);

      const pred = model.predict([perturbed])[0];
      predictions.push(typeof pred === 'number' ? pred : (pred === true ? 1 : 0));

      // Kernel weight (proximity to original instance)
      const distance = Math.sqrt(sum(instance.map((v, i) =>
        ((v - perturbed[i]) / (Math.abs(v) || 1)) ** 2
      )));
      weights.push(Math.exp(-distance * distance / (2 * this.kernelWidth * this.kernelWidth)));
    }

    // Fit weighted linear regression
    const coefficients = this._weightedLinearRegression(perturbations, predictions, weights);

    const instancePred = model.predict([instance])[0];

    return {
      coefficients,
      instancePrediction: instancePred,
      featureExplanations: coefficients.map((coeff, i) => ({
        feature: featureNames?.[i] || `feature_${i}`,
        featureIndex: i,
        coefficient: coeff,
        absoluteImportance: Math.abs(coeff),
        direction: coeff > 0 ? 'increases' : coeff < 0 ? 'decreases' : 'neutral',
        featureValue: instance[i]
      })).sort((a, b) => b.absoluteImportance - a.absoluteImportance),
      fidelity: this._computeFidelity(perturbations, predictions, coefficients),
      localAccuracy: 0
    };
  }

  _weightedLinearRegression(X, y, weights) {
    const n = X.length;
    const dims = X[0]?.length || 0;
    const coefficients = new Array(dims).fill(0);
    const lr = 0.001;
    const epochs = 100;

    for (let epoch = 0; epoch < epochs; epoch++) {
      for (let i = 0; i < n; i++) {
        let pred = 0;
        for (let j = 0; j < dims; j++) {
          pred += X[i][j] * coefficients[j];
        }
        const error = pred - y[i];

        for (let j = 0; j < dims; j++) {
          coefficients[j] -= lr * weights[i] * error * X[i][j] / n;
        }
      }
    }

    return coefficients;
  }

  _computeFidelity(X, y, coefficients) {
    const predictions = X.map(x => sum(x.map((v, i) => v * (coefficients[i] || 0))));
    const yMean = mean(y);
    const ssRes = sum(y.map((v, i) => (v - predictions[i]) ** 2));
    const ssTot = sum(y.map(v => (v - yMean) ** 2));
    return ssTot > 0 ? 1 - ssRes / ssTot : 0;
  }
}

// ============================================================================
// §5  COUNTERFACTUAL EXPLANATIONS — "What If" Analysis
// ============================================================================

class CounterfactualExplainer {
  constructor(config = {}) {
    this.maxIterations = config.maxIterations || 100;
    this.stepSize = config.stepSize || 0.05;
    this.proximityWeight = config.proximityWeight || 1.0;
    this.diversityWeight = config.diversityWeight || 0.5;
    this.numCounterfactuals = config.numCounterfactuals || 3;
  }

  explain(model, instance, desiredOutcome, featureNames = null, featureRanges = null) {
    const numFeatures = instance.length;
    const counterfactuals = [];

    for (let n = 0; n < this.numCounterfactuals; n++) {
      let currentCf = [...instance];
      let bestCf = null;
      let bestScore = Infinity;

      // Add randomness for diversity
      for (let f = 0; f < numFeatures; f++) {
        currentCf[f] += (Math.random() * 2 - 1) * 0.1 * n;
      }

      for (let iter = 0; iter < this.maxIterations; iter++) {
        const pred = model.predict([currentCf])[0];
        const predValue = typeof pred === 'number' ? pred : (pred === desiredOutcome ? 1 : 0);

        // Check if desired outcome is reached
        const isDesired = typeof desiredOutcome === 'number'
          ? Math.abs(predValue - desiredOutcome) < 0.1
          : pred === desiredOutcome;

        if (isDesired) {
          const proximity = Math.sqrt(sum(instance.map((v, i) =>
            ((v - currentCf[i]) / (Math.abs(v) || 1)) ** 2
          )));

          if (proximity < bestScore) {
            bestScore = proximity;
            bestCf = [...currentCf];
          }
        }

        // Gradient-free optimization: try small perturbations
        for (let f = 0; f < numFeatures; f++) {
          const delta = (Math.random() * 2 - 1) * this.stepSize * (Math.abs(instance[f]) || 1);
          const testCf = [...currentCf];
          testCf[f] += delta;

          // Apply range constraints
          if (featureRanges?.[f]) {
            testCf[f] = clamp(testCf[f], featureRanges[f].min, featureRanges[f].max);
          }

          const testPred = model.predict([testCf])[0];
          const testValue = typeof testPred === 'number' ? testPred : (testPred === desiredOutcome ? 1 : 0);
          const desiredValue = typeof desiredOutcome === 'number' ? desiredOutcome : 1;

          const currentDist = Math.abs(predValue - desiredValue);
          const testDist = Math.abs(testValue - desiredValue);

          // Proximity penalty
          const testProximity = Math.sqrt(sum(instance.map((v, i) =>
            ((v - testCf[i]) / (Math.abs(v) || 1)) ** 2
          )));

          const currentScore = currentDist + this.proximityWeight * 0;
          const testScore = testDist + this.proximityWeight * testProximity * 0.01;

          if (testScore <= currentScore) {
            currentCf = testCf;
          }
        }
      }

      if (bestCf) {
        const changes = [];
        for (let f = 0; f < numFeatures; f++) {
          if (Math.abs(bestCf[f] - instance[f]) > 1e-6) {
            changes.push({
              feature: featureNames?.[f] || `feature_${f}`,
              featureIndex: f,
              originalValue: instance[f],
              counterfactualValue: bestCf[f],
              change: bestCf[f] - instance[f],
              changePercent: instance[f] !== 0
                ? ((bestCf[f] - instance[f]) / Math.abs(instance[f])) * 100
                : 0
            });
          }
        }

        counterfactuals.push({
          instance: bestCf,
          changes: changes.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)),
          originalPrediction: model.predict([instance])[0],
          counterfactualPrediction: model.predict([bestCf])[0],
          proximity: bestScore,
          numChanges: changes.length
        });
      }
    }

    return {
      originalInstance: [...instance],
      originalPrediction: model.predict([instance])[0],
      desiredOutcome,
      counterfactuals: counterfactuals.sort((a, b) => a.proximity - b.proximity),
      feasible: counterfactuals.length > 0,
      summary: this._summarize(counterfactuals, featureNames)
    };
  }

  _summarize(counterfactuals, featureNames) {
    if (counterfactuals.length === 0) return 'No feasible counterfactual found.';

    const best = counterfactuals[0];
    const changes = best.changes.slice(0, 3);

    return `To change the outcome: ${changes.map(c =>
      `${c.feature} from ${c.originalValue.toFixed(2)} to ${c.counterfactualValue.toFixed(2)} (${c.changePercent.toFixed(1)}%)`
    ).join(', ')}`;
  }
}

// ============================================================================
// §6  DECISION AUDIT TRAIL — Track and Explain AI Decisions
// ============================================================================

class DecisionAuditTrail {
  constructor() {
    this.decisions = [];
    this.maxDecisions = 10000;
  }

  recordDecision(decision) {
    const record = {
      id: `dec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date(),
      ...decision,
      metadata: {
        ...decision.metadata,
        recordedAt: new Date()
      }
    };

    this.decisions.push(record);
    if (this.decisions.length > this.maxDecisions) {
      this.decisions.shift();
    }

    return record;
  }

  getDecision(decisionId) {
    return this.decisions.find(d => d.id === decisionId);
  }

  getDecisions(filters = {}) {
    let filtered = [...this.decisions];

    if (filters.userId) {
      filtered = filtered.filter(d => d.userId === filters.userId);
    }
    if (filters.type) {
      filtered = filtered.filter(d => d.type === filters.type);
    }
    if (filters.since) {
      const since = new Date(filters.since);
      filtered = filtered.filter(d => new Date(d.timestamp) >= since);
    }
    if (filters.until) {
      const until = new Date(filters.until);
      filtered = filtered.filter(d => new Date(d.timestamp) <= until);
    }

    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  getSummary(userId) {
    const userDecisions = this.decisions.filter(d => d.userId === userId);

    const typeCounts = {};
    const accuracyByType = {};
    let totalCorrect = 0;

    for (const d of userDecisions) {
      typeCounts[d.type] = (typeCounts[d.type] || 0) + 1;
      if (d.feedback) {
        if (!accuracyByType[d.type]) accuracyByType[d.type] = { correct: 0, total: 0 };
        accuracyByType[d.type].total++;
        if (d.feedback.correct) {
          accuracyByType[d.type].correct++;
          totalCorrect++;
        }
      }
    }

    return {
      totalDecisions: userDecisions.length,
      typeCounts,
      accuracyByType: Object.fromEntries(
        Object.entries(accuracyByType).map(([type, { correct, total }]) => [
          type,
          { accuracy: total > 0 ? correct / total : null, total }
        ])
      ),
      overallAccuracy: userDecisions.filter(d => d.feedback).length > 0
        ? totalCorrect / userDecisions.filter(d => d.feedback).length
        : null,
      recentDecisions: userDecisions.slice(-10)
    };
  }

  addFeedback(decisionId, feedback) {
    const decision = this.decisions.find(d => d.id === decisionId);
    if (decision) {
      decision.feedback = { ...feedback, feedbackAt: new Date() };
      return true;
    }
    return false;
  }
}

// ============================================================================
// §7  NATURAL LANGUAGE EXPLANATION GENERATOR
// ============================================================================

class NaturalLanguageExplainer {
  constructor() {
    this.templates = {
      budget: {
        over: 'Your {category} spending of ₹{amount} exceeds the budget by ₹{excess} ({percent}% over). The AI recommends {recommendation}.',
        under: 'Great news! Your {category} spending is ₹{savings} under budget. Consider allocating the surplus to {suggestion}.',
        onTrack: 'Your {category} spending is on track at {percent}% of budget.'
      },
      anomaly: {
        high: 'An unusual transaction of ₹{amount} at {merchant} was detected. This is {deviation}x higher than your typical {category} spending.',
        frequent: 'Multiple transactions detected: {count} transactions at {merchant} today, which is {deviation}x your usual frequency.',
        newMerchant: 'First-time transaction at {merchant} for ₹{amount}. This is a new merchant not seen in your history.',
        timeAnomaly: 'Late-night transaction at {time}: ₹{amount} at {merchant}. This is unusual based on your transaction patterns.'
      },
      forecast: {
        increasing: 'Based on your spending trends, {category} expenses are projected to increase by {percent}% next month (₹{predicted} vs ₹{current} average).',
        decreasing: 'Good trend! {category} expenses are projected to decrease by {percent}% next month.',
        stable: '{category} spending is expected to remain stable around ₹{predicted} next month.'
      },
      investment: {
        underperforming: 'Your {asset} investment has returned {returnPercent}% vs the benchmark\'s {benchmarkPercent}%. Consider rebalancing.',
        overweight: 'Your portfolio has {percent}% in {asset}, which is {deviation}% above recommended allocation.',
        recommendation: 'Based on your risk profile ({riskLevel}), the AI suggests allocating {percent}% to {asset} for optimal returns.'
      },
      health: {
        excellent: 'Your financial health score is {score}/100 (Excellent). Key strengths: {strengths}.',
        good: 'Your financial health score is {score}/100 (Good). Areas for improvement: {improvements}.',
        needsAttention: 'Your financial health score is {score}/100 (Needs Attention). Priority actions: {actions}.',
        critical: 'Financial alert! Your health score is {score}/100 (Critical). Immediate actions needed: {urgentActions}.'
      }
    };
  }

  explainBudgetDecision(data) {
    const { category, spent, budget, recommendation, suggestion } = data;
    const percent = budget > 0 ? ((spent / budget) * 100).toFixed(1) : 0;

    if (spent > budget) {
      return this._fillTemplate(this.templates.budget.over, {
        category,
        amount: spent.toLocaleString(),
        excess: (spent - budget).toLocaleString(),
        percent: ((spent - budget) / budget * 100).toFixed(1),
        recommendation: recommendation || 'reducing non-essential expenses'
      });
    } else if (spent < budget * 0.8) {
      return this._fillTemplate(this.templates.budget.under, {
        category,
        savings: (budget - spent).toLocaleString(),
        suggestion: suggestion || 'savings or investments'
      });
    }
    return this._fillTemplate(this.templates.budget.onTrack, { category, percent });
  }

  explainAnomaly(data) {
    const { type, amount, merchant, category, deviation, count, time } = data;

    switch (type) {
      case 'high_amount':
        return this._fillTemplate(this.templates.anomaly.high, {
          amount: amount.toLocaleString(),
          merchant: merchant || 'unknown',
          deviation: deviation?.toFixed(1) || '2+',
          category: category || 'general'
        });
      case 'high_frequency':
        return this._fillTemplate(this.templates.anomaly.frequent, {
          count: count || 'several',
          merchant: merchant || 'unknown',
          deviation: deviation?.toFixed(1) || '2+'
        });
      case 'new_merchant':
        return this._fillTemplate(this.templates.anomaly.newMerchant, {
          merchant: merchant || 'unknown',
          amount: amount.toLocaleString()
        });
      case 'time_anomaly':
        return this._fillTemplate(this.templates.anomaly.timeAnomaly, {
          time: time || 'unusual hours',
          amount: amount.toLocaleString(),
          merchant: merchant || 'unknown'
        });
      default:
        return `Unusual financial activity detected: ₹${amount.toLocaleString()} at ${merchant || 'unknown'}.`;
    }
  }

  explainForecast(data) {
    const { category, predicted, current, trend } = data;
    const percent = current > 0 ? (Math.abs(predicted - current) / current * 100).toFixed(1) : 0;

    if (predicted > current * 1.1) {
      return this._fillTemplate(this.templates.forecast.increasing, {
        category, percent, predicted: predicted.toLocaleString(), current: current.toLocaleString()
      });
    } else if (predicted < current * 0.9) {
      return this._fillTemplate(this.templates.forecast.decreasing, {
        category, percent
      });
    }
    return this._fillTemplate(this.templates.forecast.stable, {
      category, predicted: predicted.toLocaleString()
    });
  }

  explainHealthScore(data) {
    const { score, strengths, improvements, actions, urgentActions } = data;

    if (score >= 80) {
      return this._fillTemplate(this.templates.health.excellent, {
        score, strengths: (strengths || ['Strong savings habits']).join(', ')
      });
    } else if (score >= 60) {
      return this._fillTemplate(this.templates.health.good, {
        score, improvements: (improvements || ['Increase savings rate']).join(', ')
      });
    } else if (score >= 40) {
      return this._fillTemplate(this.templates.health.needsAttention, {
        score, actions: (actions || ['Review budget allocations']).join(', ')
      });
    }
    return this._fillTemplate(this.templates.health.critical, {
      score, urgentActions: (urgentActions || ['Reduce non-essential spending immediately']).join(', ')
    });
  }

  generateInsightNarrative(insights) {
    const parts = [];

    if (insights.topSpendingCategory) {
      parts.push(`Your highest spending category is **${insights.topSpendingCategory.name}** at ₹${insights.topSpendingCategory.amount.toLocaleString()}.`);
    }

    if (insights.savingsRate !== undefined) {
      const rate = (insights.savingsRate * 100).toFixed(1);
      parts.push(
        insights.savingsRate > 0.2
          ? `Your savings rate of ${rate}% is above the recommended 20%.`
          : `Your savings rate of ${rate}% is below the recommended 20% — target to save more.`
      );
    }

    if (insights.monthOverMonthChange) {
      const change = insights.monthOverMonthChange;
      parts.push(
        change > 0
          ? `Spending increased ${(change * 100).toFixed(1)}% compared to last month.`
          : `Spending decreased ${(Math.abs(change) * 100).toFixed(1)}% compared to last month — keep it up!`
      );
    }

    if (insights.upcomingPayments?.length > 0) {
      parts.push(`Upcoming: ${insights.upcomingPayments.slice(0, 3).map(p =>
        `${p.name} (₹${p.amount.toLocaleString()})`
      ).join(', ')} due soon.`);
    }

    return parts.join(' ');
  }

  _fillTemplate(template, data) {
    return template.replace(/\{(\w+)\}/g, (match, key) =>
      data[key] !== undefined ? data[key] : match
    );
  }
}

// ============================================================================
// §8  CONFIDENCE CALIBRATION — Ensure AI Predictions Are Well-Calibrated
// ============================================================================

class ConfidenceCalibrator {
  constructor(config = {}) {
    this.numBins = config.numBins || 10;
    this.calibrationMap = null;
    this.history = [];
  }

  calibrate(predictions, actuals) {
    const bins = new Array(this.numBins).fill(null).map(() => ({
      predicted: [],
      actual: [],
      count: 0
    }));

    for (let i = 0; i < predictions.length; i++) {
      const conf = typeof predictions[i] === 'number' ? predictions[i] : 0.5;
      const binIdx = Math.min(Math.floor(conf * this.numBins), this.numBins - 1);
      bins[binIdx].predicted.push(conf);
      bins[binIdx].actual.push(actuals[i] ? 1 : 0);
      bins[binIdx].count++;
    }

    this.calibrationMap = bins.map(bin => ({
      predictedMean: bin.predicted.length > 0 ? mean(bin.predicted) : 0,
      actualMean: bin.actual.length > 0 ? mean(bin.actual) : 0,
      count: bin.count,
      gap: Math.abs(
        (bin.predicted.length > 0 ? mean(bin.predicted) : 0) -
        (bin.actual.length > 0 ? mean(bin.actual) : 0)
      )
    }));

    // Expected Calibration Error
    const ece = this.calibrationMap.reduce((s, bin) =>
      s + (bin.count / predictions.length) * bin.gap, 0
    );

    return {
      calibrationMap: this.calibrationMap,
      expectedCalibrationError: ece,
      isWellCalibrated: ece < 0.1,
      recommendations: ece > 0.15
        ? ['Model predictions are overconfident — consider using temperature scaling']
        : ['Model calibration is acceptable']
    };
  }

  adjustConfidence(rawConfidence) {
    if (!this.calibrationMap) return rawConfidence;

    const binIdx = Math.min(Math.floor(rawConfidence * this.numBins), this.numBins - 1);
    const bin = this.calibrationMap[binIdx];

    if (bin && bin.predictedMean > 0) {
      // Platt scaling approximation
      const ratio = bin.actualMean / bin.predictedMean;
      return clamp(rawConfidence * ratio, 0, 1);
    }

    return rawConfidence;
  }
}

// ============================================================================
// §9  INTEGRATED EXPLAINABILITY SERVICE
// ============================================================================

class ExplainabilityService {
  constructor() {
    this.permImportance = new PermutationFeatureImportance();
    this.shapExplainer = new ShapleyExplainer();
    this.limeExplainer = new LIMEExplainer();
    this.counterfactualExplainer = new CounterfactualExplainer();
    this.nlExplainer = new NaturalLanguageExplainer();
    this.auditTrail = new DecisionAuditTrail();
    this.calibrator = new ConfidenceCalibrator();
  }

  async explainPrediction(model, instance, options = {}) {
    const {
      featureNames = null,
      backgroundData = null,
      desiredOutcome = null,
      userId = null,
      decisionType = 'prediction'
    } = options;

    const explanation = {
      prediction: model.predict([instance])[0],
      timestamp: new Date()
    };

    // SHAP values
    if (backgroundData) {
      try {
        this.shapExplainer.fit(backgroundData);
        explanation.shap = this.shapExplainer.explain(model, instance);
      } catch (e) {
        logger.debug('SHAP explanation failed:', e.message);
      }
    }

    // LIME explanation
    try {
      explanation.lime = this.limeExplainer.explain(model, instance, featureNames);
    } catch (e) {
      logger.debug('LIME explanation failed:', e.message);
    }

    // Counterfactual
    if (desiredOutcome !== null) {
      try {
        explanation.counterfactual = this.counterfactualExplainer.explain(
          model, instance, desiredOutcome, featureNames
        );
      } catch (e) {
        logger.debug('Counterfactual explanation failed:', e.message);
      }
    }

    // Record in audit trail
    if (userId) {
      explanation.auditId = this.auditTrail.recordDecision({
        userId,
        type: decisionType,
        prediction: explanation.prediction,
        topFactors: (explanation.shap?.featureContributions || explanation.lime?.featureExplanations || [])
          .slice(0, 5)
          .map(f => ({ feature: f.feature || f.featureIndex, impact: f.shapValue || f.coefficient })),
        timestamp: new Date()
      }).id;
    }

    // Generate natural language summary
    explanation.summary = this._generateSummary(explanation, featureNames);

    return explanation;
  }

  _generateSummary(explanation, featureNames) {
    const parts = [];

    if (explanation.prediction !== undefined) {
      parts.push(`Prediction: ${JSON.stringify(explanation.prediction)}`);
    }

    // Top contributing features
    const topFeatures = (
      explanation.shap?.featureContributions ||
      explanation.lime?.featureExplanations ||
      []
    ).slice(0, 3);

    if (topFeatures.length > 0) {
      parts.push('Key factors: ' + topFeatures.map(f => {
        const name = f.feature || featureNames?.[f.featureIndex] || `Feature ${f.featureIndex}`;
        const impact = f.shapValue || f.coefficient || 0;
        return `${name} (${impact > 0 ? 'positive' : 'negative'} impact: ${Math.abs(impact).toFixed(4)})`;
      }).join(', '));
    }

    if (explanation.counterfactual?.feasible) {
      parts.push(explanation.counterfactual.summary);
    }

    return parts.join('. ');
  }

  getAuditTrail(userId) {
    return this.auditTrail.getSummary(userId);
  }

  addFeedback(decisionId, feedback) {
    return this.auditTrail.addFeedback(decisionId, feedback);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  PermutationFeatureImportance,
  ShapleyExplainer,
  LIMEExplainer,
  CounterfactualExplainer,
  DecisionAuditTrail,
  NaturalLanguageExplainer,
  ConfidenceCalibrator,
  ExplainabilityService
};
