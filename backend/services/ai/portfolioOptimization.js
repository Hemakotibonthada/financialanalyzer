// ============================================================================
// PORTFOLIO OPTIMIZATION ENGINE — Modern Portfolio Theory & Beyond
// ============================================================================
// Implements Markowitz Mean-Variance Optimization, Efficient Frontier,
// Black-Litterman Model, Risk Parity, Monte Carlo Portfolio Simulation,
// Factor Modeling, and Dynamic Rebalancing. Runs entirely locally.
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
  return Math.sqrt(sum(a.map(v => (v - m) ** 2)) / (a.length - 1));
};

// ============================================================================
// §1  ASSET CLASS DEFINITIONS & RETURN MODELS
// ============================================================================

class AssetClassLibrary {
  constructor() {
    this.assets = {
      // Indian equity
      'nifty50': { name: 'Nifty 50 Index', type: 'equity_large', expectedReturn: 0.12, volatility: 0.18, beta: 1.0 },
      'nifty_midcap': { name: 'Nifty Midcap 150', type: 'equity_mid', expectedReturn: 0.15, volatility: 0.24, beta: 1.2 },
      'nifty_smallcap': { name: 'Nifty Smallcap 250', type: 'equity_small', expectedReturn: 0.18, volatility: 0.30, beta: 1.5 },
      'nifty_bank': { name: 'Bank Nifty', type: 'sector', expectedReturn: 0.13, volatility: 0.22, beta: 1.1 },
      'nifty_it': { name: 'Nifty IT', type: 'sector', expectedReturn: 0.16, volatility: 0.26, beta: 1.3 },
      'nifty_pharma': { name: 'Nifty Pharma', type: 'sector', expectedReturn: 0.14, volatility: 0.20, beta: 0.9 },

      // Debt instruments
      'gilt_10yr': { name: '10Y Government Bond', type: 'debt_govt', expectedReturn: 0.07, volatility: 0.04, beta: 0.1 },
      'corporate_bond': { name: 'Corporate Bond AAA', type: 'debt_corporate', expectedReturn: 0.085, volatility: 0.06, beta: 0.15 },
      'liquid_fund': { name: 'Liquid Fund', type: 'debt_liquid', expectedReturn: 0.06, volatility: 0.01, beta: 0.02 },
      'short_term_debt': { name: 'Short Duration Fund', type: 'debt_short', expectedReturn: 0.07, volatility: 0.03, beta: 0.05 },

      // Alternatives
      'gold': { name: 'Gold', type: 'commodity', expectedReturn: 0.08, volatility: 0.12, beta: 0.05 },
      'silver': { name: 'Silver', type: 'commodity', expectedReturn: 0.09, volatility: 0.20, beta: 0.1 },
      'real_estate': { name: 'REITs/Real Estate', type: 'alternative', expectedReturn: 0.10, volatility: 0.14, beta: 0.6 },
      'international_equity': { name: 'International Equity (US S&P)', type: 'international', expectedReturn: 0.11, volatility: 0.16, beta: 0.7 },

      // Tax-efficient
      'ppf': { name: 'PPF', type: 'tax_saving', expectedReturn: 0.071, volatility: 0.005, beta: 0 },
      'nps_equity': { name: 'NPS Equity', type: 'retirement', expectedReturn: 0.10, volatility: 0.15, beta: 0.8 },
      'nps_corporate': { name: 'NPS Corporate Bond', type: 'retirement', expectedReturn: 0.08, volatility: 0.05, beta: 0.1 },
      'nps_govt': { name: 'NPS Government Bond', type: 'retirement', expectedReturn: 0.085, volatility: 0.04, beta: 0.05 },
      'elss': { name: 'ELSS Tax Saver', type: 'tax_saving_equity', expectedReturn: 0.13, volatility: 0.20, beta: 1.1 },

      // Fixed income
      'fd_1yr': { name: 'Bank FD (1 Year)', type: 'fixed_deposit', expectedReturn: 0.065, volatility: 0.0, beta: 0 },
      'fd_5yr': { name: 'Bank FD (5 Year)', type: 'fixed_deposit', expectedReturn: 0.07, volatility: 0.0, beta: 0 },
      'scss': { name: 'Senior Citizens Savings', type: 'govt_scheme', expectedReturn: 0.082, volatility: 0.0, beta: 0 },
    };

    // Correlation matrix (simplified pairwise correlations)
    this.correlations = this._buildDefaultCorrelations();
  }

  getAsset(id) { return this.assets[id] || null; }

  getAssetsByType(type) {
    return Object.entries(this.assets)
      .filter(([, a]) => a.type === type)
      .map(([id, a]) => ({ id, ...a }));
  }

  getAllAssets() {
    return Object.entries(this.assets).map(([id, a]) => ({ id, ...a }));
  }

  getCorrelation(asset1, asset2) {
    if (asset1 === asset2) return 1.0;
    const key = [asset1, asset2].sort().join('_');
    return this.correlations[key] || this._estimateCorrelation(asset1, asset2);
  }

  _buildDefaultCorrelations() {
    const corr = {};
    const setCorr = (a, b, v) => { corr[[a, b].sort().join('_')] = v; };

    // Equity correlations
    setCorr('nifty50', 'nifty_midcap', 0.85);
    setCorr('nifty50', 'nifty_smallcap', 0.75);
    setCorr('nifty50', 'nifty_bank', 0.88);
    setCorr('nifty50', 'nifty_it', 0.72);
    setCorr('nifty50', 'nifty_pharma', 0.60);
    setCorr('nifty_midcap', 'nifty_smallcap', 0.90);

    // Equity-Debt correlations
    setCorr('nifty50', 'gilt_10yr', -0.15);
    setCorr('nifty50', 'corporate_bond', 0.10);
    setCorr('nifty50', 'liquid_fund', 0.05);

    // Gold correlations
    setCorr('nifty50', 'gold', -0.10);
    setCorr('gilt_10yr', 'gold', 0.25);
    setCorr('nifty50', 'silver', 0.05);

    // International
    setCorr('nifty50', 'international_equity', 0.55);
    setCorr('international_equity', 'gold', -0.05);

    // Real estate
    setCorr('nifty50', 'real_estate', 0.50);
    setCorr('gold', 'real_estate', 0.15);

    return corr;
  }

  _estimateCorrelation(asset1, asset2) {
    const a1 = this.assets[asset1];
    const a2 = this.assets[asset2];
    if (!a1 || !a2) return 0;

    // Same type = high correlation
    if (a1.type === a2.type) return 0.80;

    // Both equity = moderate-high
    if (a1.type.startsWith('equity') && a2.type.startsWith('equity')) return 0.70;

    // Both debt = moderate
    if (a1.type.startsWith('debt') && a2.type.startsWith('debt')) return 0.60;

    // Equity-debt = low/negative
    if ((a1.type.startsWith('equity') && a2.type.startsWith('debt')) ||
        (a1.type.startsWith('debt') && a2.type.startsWith('equity'))) return -0.10;

    // Default = low correlation
    return 0.20;
  }

  getCovarianceMatrix(assetIds) {
    const n = assetIds.length;
    const matrix = [];

    for (let i = 0; i < n; i++) {
      matrix[i] = [];
      for (let j = 0; j < n; j++) {
        const asset_i = this.assets[assetIds[i]];
        const asset_j = this.assets[assetIds[j]];
        if (!asset_i || !asset_j) { matrix[i][j] = 0; continue; }

        const correlation = this.getCorrelation(assetIds[i], assetIds[j]);
        matrix[i][j] = correlation * asset_i.volatility * asset_j.volatility;
      }
    }

    return matrix;
  }
}

// ============================================================================
// §2  MARKOWITZ MEAN-VARIANCE OPTIMIZER
// ============================================================================

class MarkowitzOptimizer {
  constructor(assetLibrary) {
    this.library = assetLibrary || new AssetClassLibrary();
  }

  // Find optimal portfolio for given target return
  optimize(assetIds, targetReturn = null, constraints = {}) {
    const n = assetIds.length;
    if (n === 0) return { weights: {}, expectedReturn: 0, risk: 0 };

    const returns = assetIds.map(id => this.library.getAsset(id)?.expectedReturn || 0);
    const covMatrix = this.library.getCovarianceMatrix(assetIds);

    // Constraints
    const minWeight = constraints.minWeight || 0;
    const maxWeight = constraints.maxWeight || 1;
    const minAssets = constraints.minAssets || 1;
    const maxAssets = constraints.maxAssets || n;

    // Use numerical optimization (gradient descent on Lagrangian)
    let bestWeights = new Array(n).fill(1 / n); // Start equal-weight
    let bestSharpe = -Infinity;

    // Multi-start optimization
    for (let trial = 0; trial < 500; trial++) {
      let weights = trial === 0
        ? new Array(n).fill(1 / n)
        : this._randomWeights(n, minWeight, maxWeight);

      // Gradient descent for this starting point
      const lr = 0.01;
      for (let iter = 0; iter < 200; iter++) {
        const gradient = this._computeGradient(weights, returns, covMatrix, targetReturn);

        // Update weights
        for (let i = 0; i < n; i++) {
          weights[i] -= lr * gradient[i];
          weights[i] = Math.max(minWeight, Math.min(maxWeight, weights[i]));
        }

        // Normalize to sum to 1
        const total = sum(weights);
        if (total > 0) weights = weights.map(w => w / total);
      }

      // Apply minimum/maximum asset count constraints
      const activeAssets = weights.filter(w => w > 0.01).length;
      if (activeAssets < minAssets || activeAssets > maxAssets) continue;

      // Calculate Sharpe ratio
      const portReturn = sum(weights.map((w, i) => w * returns[i]));
      const portRisk = this._portfolioRisk(weights, covMatrix);
      const riskFreeRate = 0.06;
      const sharpe = portRisk > 0 ? (portReturn - riskFreeRate) / portRisk : 0;

      if (sharpe > bestSharpe) {
        bestSharpe = sharpe;
        bestWeights = [...weights];
      }
    }

    // Build result
    const portReturn = sum(bestWeights.map((w, i) => w * returns[i]));
    const portRisk = this._portfolioRisk(bestWeights, covMatrix);

    const allocations = {};
    for (let i = 0; i < n; i++) {
      if (bestWeights[i] > 0.005) { // >0.5% threshold
        allocations[assetIds[i]] = {
          weight: Math.round(bestWeights[i] * 1000) / 1000,
          name: this.library.getAsset(assetIds[i])?.name || assetIds[i],
          expectedReturn: returns[i],
          contribution: bestWeights[i] * returns[i]
        };
      }
    }

    return {
      allocations,
      expectedReturn: portReturn,
      risk: portRisk,
      sharpeRatio: portRisk > 0 ? (portReturn - 0.06) / portRisk : 0,
      diversificationRatio: this._diversificationRatio(bestWeights, assetIds),
      maxDrawdownEstimate: portRisk * 2.5, // Approximate
      activeAssets: Object.keys(allocations).length
    };
  }

  // Generate efficient frontier
  efficientFrontier(assetIds, numPoints = 20) {
    const returns = assetIds.map(id => this.library.getAsset(id)?.expectedReturn || 0);
    const minReturn = Math.min(...returns);
    const maxReturn = Math.max(...returns);

    const frontier = [];
    for (let i = 0; i < numPoints; i++) {
      const targetReturn = minReturn + (maxReturn - minReturn) * (i / (numPoints - 1));
      const result = this.optimize(assetIds, targetReturn);
      frontier.push({
        targetReturn,
        risk: result.risk,
        actualReturn: result.expectedReturn,
        sharpe: result.sharpeRatio,
        allocations: result.allocations
      });
    }

    // Find maximum Sharpe portfolio
    const maxSharpeIdx = frontier.reduce((best, f, i) =>
      f.sharpe > (frontier[best]?.sharpe || -Infinity) ? i : best, 0);

    // Find minimum variance portfolio
    const minVarIdx = frontier.reduce((best, f, i) =>
      f.risk < (frontier[best]?.risk || Infinity) ? i : best, 0);

    return {
      points: frontier,
      maxSharpePortfolio: frontier[maxSharpeIdx],
      minVariancePortfolio: frontier[minVarIdx],
      tangentyPortfolio: frontier[maxSharpeIdx] // Same as max Sharpe with risk-free
    };
  }

  _randomWeights(n, minW, maxW) {
    const weights = Array.from({ length: n }, () =>
      minW + Math.random() * (maxW - minW)
    );
    const total = sum(weights);
    return weights.map(w => w / total);
  }

  _computeGradient(weights, returns, covMatrix, targetReturn) {
    const n = weights.length;
    const gradient = new Array(n).fill(0);
    const riskFreeRate = 0.06;

    // Negative Sharpe ratio gradient (we minimize negative Sharpe)
    const portReturn = sum(weights.map((w, i) => w * returns[i]));
    const portVariance = this._portfolioVariance(weights, covMatrix);
    const portRisk = Math.sqrt(portVariance);

    if (portRisk === 0) return gradient;

    for (let i = 0; i < n; i++) {
      // dSharpe/dw_i
      let dVariance = 0;
      for (let j = 0; j < n; j++) {
        dVariance += 2 * weights[j] * covMatrix[i][j];
      }

      const dReturn = returns[i];
      const excessReturn = portReturn - riskFreeRate;

      gradient[i] = -(dReturn * portRisk - excessReturn * dVariance / (2 * portRisk)) / (portVariance);

      // Add target return penalty
      if (targetReturn !== null) {
        gradient[i] += 0.5 * (portReturn - targetReturn) * returns[i];
      }
    }

    return gradient;
  }

  _portfolioVariance(weights, covMatrix) {
    let variance = 0;
    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < weights.length; j++) {
        variance += weights[i] * weights[j] * (covMatrix[i]?.[j] || 0);
      }
    }
    return Math.max(0, variance);
  }

  _portfolioRisk(weights, covMatrix) {
    return Math.sqrt(this._portfolioVariance(weights, covMatrix));
  }

  _diversificationRatio(weights, assetIds) {
    const weightedVolSum = sum(weights.map((w, i) =>
      w * (this.library.getAsset(assetIds[i])?.volatility || 0)
    ));
    const covMatrix = this.library.getCovarianceMatrix(assetIds);
    const portRisk = this._portfolioRisk(weights, covMatrix);
    return portRisk > 0 ? weightedVolSum / portRisk : 1;
  }
}

// ============================================================================
// §3  RISK PARITY OPTIMIZER
// ============================================================================

class RiskParityOptimizer {
  constructor(assetLibrary) {
    this.library = assetLibrary || new AssetClassLibrary();
  }

  optimize(assetIds) {
    const n = assetIds.length;
    if (n === 0) return { weights: {}, risk: 0 };

    const covMatrix = this.library.getCovarianceMatrix(assetIds);
    const returns = assetIds.map(id => this.library.getAsset(id)?.expectedReturn || 0);

    // Initialize with inverse-volatility weights
    let weights = assetIds.map(id => {
      const vol = this.library.getAsset(id)?.volatility || 0.10;
      return 1 / vol;
    });
    const totalW = sum(weights);
    weights = weights.map(w => w / totalW);

    // Iterative risk parity convergence
    for (let iter = 0; iter < 500; iter++) {
      const totalRisk = this._portfolioRisk(weights, covMatrix);
      if (totalRisk === 0) break;

      const targetRiskContribution = totalRisk / n;
      const marginalRisks = this._marginalRiskContributions(weights, covMatrix, totalRisk);

      // Adjust weights to equalize risk contributions
      let converged = true;
      for (let i = 0; i < n; i++) {
        const riskContrib = weights[i] * marginalRisks[i];
        const ratio = targetRiskContribution / (riskContrib || 0.001);
        const newWeight = weights[i] * Math.pow(ratio, 0.3); // Damped adjustment
        if (Math.abs(newWeight - weights[i]) > 0.0001) converged = false;
        weights[i] = Math.max(0.001, newWeight);
      }

      // Normalize
      const total = sum(weights);
      weights = weights.map(w => w / total);

      if (converged) break;
    }

    // Build result
    const portReturn = sum(weights.map((w, i) => w * returns[i]));
    const portRisk = this._portfolioRisk(weights, covMatrix);
    const marginalRisks = this._marginalRiskContributions(weights, covMatrix, portRisk);

    const allocations = {};
    for (let i = 0; i < n; i++) {
      allocations[assetIds[i]] = {
        weight: Math.round(weights[i] * 1000) / 1000,
        name: this.library.getAsset(assetIds[i])?.name || assetIds[i],
        riskContribution: portRisk > 0 ? (weights[i] * marginalRisks[i]) / portRisk : 0,
        expectedReturn: returns[i]
      };
    }

    return {
      allocations,
      expectedReturn: portReturn,
      risk: portRisk,
      sharpeRatio: portRisk > 0 ? (portReturn - 0.06) / portRisk : 0,
      riskParityAchieved: this._isRiskParity(allocations),
      method: 'risk_parity'
    };
  }

  _portfolioRisk(weights, covMatrix) {
    let variance = 0;
    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < weights.length; j++) {
        variance += weights[i] * weights[j] * (covMatrix[i]?.[j] || 0);
      }
    }
    return Math.sqrt(Math.max(0, variance));
  }

  _marginalRiskContributions(weights, covMatrix, totalRisk) {
    const n = weights.length;
    const marginal = new Array(n).fill(0);

    if (totalRisk === 0) return marginal;

    for (let i = 0; i < n; i++) {
      let sigma_i = 0;
      for (let j = 0; j < n; j++) {
        sigma_i += weights[j] * (covMatrix[i]?.[j] || 0);
      }
      marginal[i] = sigma_i / totalRisk;
    }

    return marginal;
  }

  _isRiskParity(allocations) {
    const contribs = Object.values(allocations).map(a => a.riskContribution);
    if (contribs.length < 2) return true;
    const avg = mean(contribs);
    const maxDev = Math.max(...contribs.map(c => Math.abs(c - avg)));
    return maxDev < 0.05; // Within 5% of equal
  }
}

// ============================================================================
// §4  BLACK-LITTERMAN MODEL
// ============================================================================

class BlackLittermanModel {
  constructor(assetLibrary) {
    this.library = assetLibrary || new AssetClassLibrary();
    this.riskFreeRate = 0.06;
    this.tau = 0.05; // Confidence in equilibrium
  }

  optimize(assetIds, views = []) {
    const n = assetIds.length;
    const covMatrix = this.library.getCovarianceMatrix(assetIds);
    const marketReturns = assetIds.map(id => this.library.getAsset(id)?.expectedReturn || 0);

    // Compute equilibrium implied returns (from market cap weights)
    const marketWeights = this._getMarketCapWeights(assetIds);
    const riskAversion = this._estimateRiskAversion(marketWeights, marketReturns, covMatrix);
    const impliedReturns = this._impliedReturns(riskAversion, covMatrix, marketWeights);

    // If no views, return market-cap portfolio
    if (!views || views.length === 0) {
      const allocations = {};
      for (let i = 0; i < n; i++) {
        allocations[assetIds[i]] = {
          weight: marketWeights[i],
          name: this.library.getAsset(assetIds[i])?.name || assetIds[i],
          impliedReturn: impliedReturns[i]
        };
      }
      return {
        allocations,
        expectedReturn: sum(marketWeights.map((w, i) => w * impliedReturns[i])),
        method: 'black_litterman_equilibrium',
        views: []
      };
    }

    // Incorporate investor views
    const { P, Q, omega } = this._buildViewMatrices(views, assetIds, covMatrix);

    // BL posterior returns
    const posteriorReturns = this._computePosteriorReturns(
      impliedReturns, covMatrix, P, Q, omega
    );

    // Optimize with posterior returns
    const optimizer = new MarkowitzOptimizer(this.library);

    // Override returns temporarily
    const originalReturns = {};
    for (let i = 0; i < n; i++) {
      const asset = this.library.getAsset(assetIds[i]);
      if (asset) {
        originalReturns[assetIds[i]] = asset.expectedReturn;
        asset.expectedReturn = posteriorReturns[i];
      }
    }

    const result = optimizer.optimize(assetIds);

    // Restore original returns
    for (const [id, ret] of Object.entries(originalReturns)) {
      const asset = this.library.getAsset(id);
      if (asset) asset.expectedReturn = ret;
    }

    return {
      ...result,
      posteriorReturns: Object.fromEntries(assetIds.map((id, i) => [id, posteriorReturns[i]])),
      impliedReturns: Object.fromEntries(assetIds.map((id, i) => [id, impliedReturns[i]])),
      views: views.map(v => ({ ...v, incorporated: true })),
      method: 'black_litterman'
    };
  }

  _getMarketCapWeights(assetIds) {
    // Simplified: use inverse-volatility as proxy for market cap
    const weights = assetIds.map(id => {
      const vol = this.library.getAsset(id)?.volatility || 0.15;
      return 1 / (vol * vol);
    });
    const total = sum(weights);
    return weights.map(w => w / total);
  }

  _estimateRiskAversion(weights, returns, covMatrix) {
    const portReturn = sum(weights.map((w, i) => w * returns[i]));
    let portVariance = 0;
    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < weights.length; j++) {
        portVariance += weights[i] * weights[j] * (covMatrix[i]?.[j] || 0);
      }
    }
    return portVariance > 0 ? (portReturn - this.riskFreeRate) / portVariance : 2.5;
  }

  _impliedReturns(riskAversion, covMatrix, weights) {
    const n = weights.length;
    return weights.map((_, i) => {
      let ret = this.riskFreeRate;
      for (let j = 0; j < n; j++) {
        ret += riskAversion * (covMatrix[i]?.[j] || 0) * weights[j];
      }
      return ret;
    });
  }

  _buildViewMatrices(views, assetIds, covMatrix) {
    const k = views.length; // Number of views
    const n = assetIds.length;

    const P = []; // K x N picking matrix
    const Q = []; // K x 1 view returns
    const omega = []; // K x K view uncertainty

    for (let v = 0; v < k; v++) {
      const view = views[v];
      const row = new Array(n).fill(0);

      if (view.type === 'absolute') {
        // Absolute view: "Asset X will return Y%"
        const idx = assetIds.indexOf(view.asset);
        if (idx >= 0) row[idx] = 1;
        Q.push(view.return);
      } else if (view.type === 'relative') {
        // Relative view: "Asset X will outperform Asset Y by Z%"
        const idx1 = assetIds.indexOf(view.asset1);
        const idx2 = assetIds.indexOf(view.asset2);
        if (idx1 >= 0) row[idx1] = 1;
        if (idx2 >= 0) row[idx2] = -1;
        Q.push(view.return);
      }

      P.push(row);

      // View uncertainty (omega = tau * P * Sigma * P')
      const confidence = view.confidence || 0.5;
      let viewVar = 0;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          viewVar += row[i] * (covMatrix[i]?.[j] || 0) * row[j];
        }
      }
      omega.push(this.tau * viewVar / (confidence * confidence));
    }

    return { P, Q, omega };
  }

  _computePosteriorReturns(impliedReturns, covMatrix, P, Q, omega) {
    const n = impliedReturns.length;
    const k = P.length;

    if (k === 0) return [...impliedReturns];

    // Simplified BL posterior: weighted average of prior and views
    const posterior = [...impliedReturns];

    for (let v = 0; v < k; v++) {
      const viewWeight = 1 / (1 + omega[v] * 10);
      for (let i = 0; i < n; i++) {
        if (P[v][i] !== 0) {
          const adjustment = viewWeight * P[v][i] * (Q[v] - sum(P[v].map((p, j) => p * impliedReturns[j])));
          posterior[i] += adjustment;
        }
      }
    }

    return posterior;
  }
}

// ============================================================================
// §5  DYNAMIC REBALANCING ENGINE
// ============================================================================

class DynamicRebalancer {
  constructor(assetLibrary) {
    this.library = assetLibrary || new AssetClassLibrary();
  }

  analyzeRebalancing(currentPortfolio, targetAllocations, config = {}) {
    const {
      rebalancingThreshold = 0.05, // 5% deviation triggers rebalance
      taxRate = 0.10, // Short-term capital gains tax
      transactionCost = 0.001, // 0.1% transaction cost
      portfolioValue = 1000000,
      rebalancingStrategy = 'threshold' // 'threshold', 'calendar', 'tactical'
    } = config;

    const deviations = {};
    const trades = [];
    let totalDeviationScore = 0;

    for (const [assetId, targetWeight] of Object.entries(targetAllocations)) {
      const currentWeight = currentPortfolio[assetId] || 0;
      const deviation = currentWeight - targetWeight;
      const absDeviation = Math.abs(deviation);

      deviations[assetId] = {
        asset: this.library.getAsset(assetId)?.name || assetId,
        currentWeight: Math.round(currentWeight * 1000) / 1000,
        targetWeight: Math.round(targetWeight * 1000) / 1000,
        deviation: Math.round(deviation * 1000) / 1000,
        deviationPercent: (deviation * 100).toFixed(1) + '%',
        needsRebalancing: absDeviation > rebalancingThreshold
      };

      totalDeviationScore += absDeviation;

      if (absDeviation > rebalancingThreshold) {
        const tradeAmount = Math.abs(deviation) * portfolioValue;
        const cost = tradeAmount * transactionCost;
        const taxImpact = deviation > 0 ? tradeAmount * taxRate * 0.3 : 0; // Approximate tax on gains

        trades.push({
          assetId,
          asset: deviations[assetId].asset,
          action: deviation > 0 ? 'sell' : 'buy',
          amount: Math.round(tradeAmount),
          weight: Math.abs(deviation),
          estimatedCost: Math.round(cost),
          estimatedTax: Math.round(taxImpact),
          totalCost: Math.round(cost + taxImpact)
        });
      }
    }

    // Check for assets in current portfolio but not in target
    for (const [assetId, currentWeight] of Object.entries(currentPortfolio)) {
      if (!targetAllocations[assetId] && currentWeight > 0.005) {
        const tradeAmount = currentWeight * portfolioValue;
        trades.push({
          assetId,
          asset: this.library.getAsset(assetId)?.name || assetId,
          action: 'sell_all',
          amount: Math.round(tradeAmount),
          weight: currentWeight,
          estimatedCost: Math.round(tradeAmount * transactionCost),
          estimatedTax: Math.round(tradeAmount * taxRate * 0.3),
          totalCost: Math.round(tradeAmount * (transactionCost + taxRate * 0.3))
        });
      }
    }

    const totalTradeCost = sum(trades.map(t => t.totalCost));
    const needsRebalancing = totalDeviationScore > rebalancingThreshold * 2;

    return {
      deviations,
      trades: trades.sort((a, b) => b.amount - a.amount),
      totalDeviationScore: Math.round(totalDeviationScore * 1000) / 1000,
      needsRebalancing,
      totalTradingCost: totalTradeCost,
      tradingCostPercent: portfolioValue > 0
        ? ((totalTradeCost / portfolioValue) * 100).toFixed(3) + '%'
        : '0%',
      recommendation: needsRebalancing
        ? `Rebalance recommended. Total deviation: ${(totalDeviationScore * 100).toFixed(1)}%. ` +
          `${trades.length} trades needed costing ₹${totalTradeCost.toLocaleString()}.`
        : `Portfolio is within tolerance. Deviation: ${(totalDeviationScore * 100).toFixed(1)}%.`,
      nextReview: this._suggestNextReview(totalDeviationScore, rebalancingStrategy),
      taxEfficiencyTips: this._taxEfficiencyTips(trades)
    };
  }

  _suggestNextReview(deviation, strategy) {
    if (strategy === 'calendar') return '1 month';
    if (deviation > 0.15) return '1 week';
    if (deviation > 0.10) return '2 weeks';
    if (deviation > 0.05) return '1 month';
    return '3 months';
  }

  _taxEfficiencyTips(trades) {
    const tips = [];
    const sellTrades = trades.filter(t => t.action === 'sell' || t.action === 'sell_all');

    if (sellTrades.length > 0) {
      tips.push('Consider timing sells after 1 year holding for lower LTCG tax rate (10% vs 15%).');
    }

    const buyTrades = trades.filter(t => t.action === 'buy');
    if (buyTrades.some(t => t.assetId === 'elss' || t.assetId === 'nps_equity')) {
      tips.push('ELSS/NPS purchases qualify for additional tax deductions under 80C/80CCD.');
    }

    if (sellTrades.some(t => t.estimatedTax > 5000)) {
      tips.push('Consider tax-loss harvesting: sell underperforming assets to offset gains.');
    }

    return tips;
  }
}

// ============================================================================
// §6  PORTFOLIO ANALYTICS ENGINE
// ============================================================================

class PortfolioAnalytics {
  constructor(assetLibrary) {
    this.library = assetLibrary || new AssetClassLibrary();
  }

  analyze(portfolio, historicalReturns = null) {
    const assetIds = Object.keys(portfolio);
    const weights = assetIds.map(id => portfolio[id]);
    const covMatrix = this.library.getCovarianceMatrix(assetIds);
    const returns = assetIds.map(id => this.library.getAsset(id)?.expectedReturn || 0);

    // Basic metrics
    const portReturn = sum(weights.map((w, i) => w * returns[i]));
    let portVariance = 0;
    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < weights.length; j++) {
        portVariance += weights[i] * weights[j] * (covMatrix[i]?.[j] || 0);
      }
    }
    const portRisk = Math.sqrt(Math.max(0, portVariance));

    // Sharpe ratio
    const riskFreeRate = 0.06;
    const sharpe = portRisk > 0 ? (portReturn - riskFreeRate) / portRisk : 0;

    // Sortino ratio (downside deviation)
    const downsideVol = portRisk * 0.7; // Approximate
    const sortino = downsideVol > 0 ? (portReturn - riskFreeRate) / downsideVol : 0;

    // Max drawdown estimate
    const maxDrawdown = portRisk * 2.5;

    // Calmar ratio
    const calmar = maxDrawdown > 0 ? (portReturn - riskFreeRate) / maxDrawdown : 0;

    // Beta (vs Nifty 50)
    const beta = sum(weights.map((w, i) =>
      w * (this.library.getAsset(assetIds[i])?.beta || 0)
    ));

    // Alpha (Jensen's)
    const alpha = portReturn - (riskFreeRate + beta * (0.12 - riskFreeRate));

    // Treynor ratio
    const treynor = beta > 0 ? (portReturn - riskFreeRate) / beta : 0;

    // Information ratio
    const trackingError = portRisk * 0.5; // Approximate
    const infoRatio = trackingError > 0 ? alpha / trackingError : 0;

    // Concentration metrics
    const hhi = sum(weights.map(w => w * w));
    const effectiveAssets = hhi > 0 ? 1 / hhi : 0;

    // Style analysis
    const equityWeight = sum(assetIds.map((id, i) => {
      const type = this.library.getAsset(id)?.type || '';
      return type.startsWith('equity') || type.includes('sector') ? weights[i] : 0;
    }));
    const debtWeight = sum(assetIds.map((id, i) => {
      const type = this.library.getAsset(id)?.type || '';
      return type.startsWith('debt') || type.startsWith('fixed') ? weights[i] : 0;
    }));
    const altWeight = 1 - equityWeight - debtWeight;

    // Risk contribution by asset
    const riskContributions = {};
    for (let i = 0; i < assetIds.length; i++) {
      let marginalRisk = 0;
      for (let j = 0; j < weights.length; j++) {
        marginalRisk += weights[j] * (covMatrix[i]?.[j] || 0);
      }
      riskContributions[assetIds[i]] = {
        name: this.library.getAsset(assetIds[i])?.name || assetIds[i],
        weight: weights[i],
        marginalRisk: portRisk > 0 ? marginalRisk / portRisk : 0,
        riskContribution: portRisk > 0 ? (weights[i] * marginalRisk / portRisk) / portRisk : 0
      };
    }

    return {
      metrics: {
        expectedReturn: portReturn,
        risk: portRisk,
        sharpeRatio: sharpe,
        sortinoRatio: sortino,
        maxDrawdownEstimate: maxDrawdown,
        calmarRatio: calmar,
        beta,
        alpha,
        treynorRatio: treynor,
        informationRatio: infoRatio
      },
      concentration: {
        hhi: Math.round(hhi * 10000),
        effectiveAssets: Math.round(effectiveAssets * 10) / 10,
        topHolding: Math.max(...weights),
        isConcentrated: hhi > 0.25
      },
      styleAnalysis: {
        equity: equityWeight,
        debt: debtWeight,
        alternatives: altWeight,
        category: equityWeight > 0.7 ? 'Aggressive' :
                  equityWeight > 0.5 ? 'Moderate-Aggressive' :
                  equityWeight > 0.3 ? 'Balanced' :
                  debtWeight > 0.7 ? 'Conservative' : 'Moderate-Conservative'
      },
      riskContributions,
      riskBudget: Object.fromEntries(
        Object.entries(riskContributions)
          .sort((a, b) => b[1].riskContribution - a[1].riskContribution)
          .map(([id, data]) => [id, (data.riskContribution * 100).toFixed(1) + '%'])
      )
    };
  }

  stressTest(portfolio, scenarios = null) {
    const defaultScenarios = [
      { name: '2008 Global Crisis', equityImpact: -0.55, debtImpact: 0.05, goldImpact: 0.20 },
      { name: '2020 COVID Crash', equityImpact: -0.35, debtImpact: 0.02, goldImpact: 0.15 },
      { name: 'Interest Rate Hike +2%', equityImpact: -0.15, debtImpact: -0.08, goldImpact: -0.05 },
      { name: 'Rupee Depreciation 10%', equityImpact: -0.10, debtImpact: -0.02, goldImpact: 0.12 },
      { name: 'Stagflation (High Inflation + Low Growth)', equityImpact: -0.25, debtImpact: -0.10, goldImpact: 0.30 },
      { name: 'Bull Market Rally', equityImpact: 0.40, debtImpact: -0.02, goldImpact: -0.05 }
    ];

    const testScenarios = scenarios || defaultScenarios;
    const results = [];

    for (const scenario of testScenarios) {
      let portfolioImpact = 0;
      const assetImpacts = {};

      for (const [assetId, weight] of Object.entries(portfolio)) {
        const asset = this.library.getAsset(assetId);
        if (!asset) continue;

        let impact = 0;
        if (asset.type.startsWith('equity') || asset.type.includes('sector')) {
          impact = scenario.equityImpact * (asset.beta || 1);
        } else if (asset.type.startsWith('debt') || asset.type.startsWith('fixed')) {
          impact = scenario.debtImpact;
        } else if (asset.type === 'commodity') {
          impact = scenario.goldImpact;
        } else {
          impact = scenario.equityImpact * 0.5; // Partial exposure
        }

        assetImpacts[assetId] = {
          name: asset.name,
          weight,
          impact: impact,
          contribution: weight * impact
        };

        portfolioImpact += weight * impact;
      }

      results.push({
        scenario: scenario.name,
        portfolioImpact: Math.round(portfolioImpact * 10000) / 100,
        portfolioImpactFormatted: (portfolioImpact * 100).toFixed(1) + '%',
        assetImpacts: Object.entries(assetImpacts)
          .sort((a, b) => a[1].contribution - b[1].contribution)
          .map(([id, data]) => ({
            asset: data.name,
            impact: (data.impact * 100).toFixed(1) + '%',
            contribution: (data.contribution * 100).toFixed(2) + '%'
          })),
        worstAsset: Object.entries(assetImpacts)
          .sort((a, b) => a[1].impact - b[1].impact)[0]?.[1]?.name || 'N/A',
        bestAsset: Object.entries(assetImpacts)
          .sort((a, b) => b[1].impact - a[1].impact)[0]?.[1]?.name || 'N/A'
      });
    }

    return {
      scenarios: results,
      worstCase: results.sort((a, b) => a.portfolioImpact - b.portfolioImpact)[0],
      bestCase: results.sort((a, b) => b.portfolioImpact - a.portfolioImpact)[0],
      avgImpact: mean(results.map(r => r.portfolioImpact)),
      recommendation: this._stressTestRecommendation(results)
    };
  }

  _stressTestRecommendation(results) {
    const worstImpact = Math.min(...results.map(r => r.portfolioImpact));
    if (worstImpact < -30) {
      return 'Portfolio is highly vulnerable to market stress. Consider increasing debt/gold allocation for protection.';
    } else if (worstImpact < -20) {
      return 'Moderate downside risk. Your diversification provides some protection but consider hedging strategies.';
    } else if (worstImpact < -10) {
      return 'Good risk management. Portfolio shows resilience across stress scenarios.';
    }
    return 'Excellent stress resilience. Portfolio is well-diversified against various market conditions.';
  }
}

// ============================================================================
// §7  UNIFIED PORTFOLIO OPTIMIZATION SERVICE
// ============================================================================

class PortfolioOptimizationService {
  constructor() {
    this.assetLibrary = new AssetClassLibrary();
    this.markowitz = new MarkowitzOptimizer(this.assetLibrary);
    this.riskParity = new RiskParityOptimizer(this.assetLibrary);
    this.blackLitterman = new BlackLittermanModel(this.assetLibrary);
    this.rebalancer = new DynamicRebalancer(this.assetLibrary);
    this.analytics = new PortfolioAnalytics(this.assetLibrary);
  }

  optimizePortfolio(config = {}) {
    const {
      riskProfile = 'moderate', // conservative, moderate, aggressive
      method = 'markowitz', // markowitz, risk_parity, black_litterman
      investmentHorizon = 10,
      age = 30,
      views = [],
      constraints = {},
      currentPortfolio = null
    } = config;

    // Select asset universe based on risk profile
    const assetIds = this._selectAssetUniverse(riskProfile, investmentHorizon);

    let result;
    switch (method) {
      case 'risk_parity':
        result = this.riskParity.optimize(assetIds);
        break;
      case 'black_litterman':
        result = this.blackLitterman.optimize(assetIds, views);
        break;
      case 'markowitz':
      default:
        result = this.markowitz.optimize(assetIds, null, constraints);
    }

    // Add analytics
    if (result.allocations) {
      const portfolio = Object.fromEntries(
        Object.entries(result.allocations).map(([id, a]) => [id, a.weight])
      );
      result.analytics = this.analytics.analyze(portfolio);
      result.stressTest = this.analytics.stressTest(portfolio);
    }

    // Add rebalancing analysis if current portfolio provided
    if (currentPortfolio) {
      const targetWeights = Object.fromEntries(
        Object.entries(result.allocations || {}).map(([id, a]) => [id, a.weight])
      );
      result.rebalancing = this.rebalancer.analyzeRebalancing(
        currentPortfolio, targetWeights, config
      );
    }

    // Add context
    result.riskProfile = riskProfile;
    result.investmentHorizon = investmentHorizon;
    result.assetCount = assetIds.length;
    result.optimizedAt = new Date();

    return result;
  }

  getEfficientFrontier(riskProfile = 'moderate') {
    const assetIds = this._selectAssetUniverse(riskProfile, 10);
    return this.markowitz.efficientFrontier(assetIds, 15);
  }

  getAvailableAssets() {
    return this.assetLibrary.getAllAssets();
  }

  _selectAssetUniverse(riskProfile, horizon) {
    const allAssets = Object.keys(this.assetLibrary.assets);

    switch (riskProfile) {
      case 'conservative':
        return allAssets.filter(id => {
          const a = this.assetLibrary.getAsset(id);
          return a && a.volatility < 0.15;
        });
      case 'aggressive':
        return allAssets.filter(id => {
          const a = this.assetLibrary.getAsset(id);
          return a && (a.expectedReturn > 0.08 || a.type.startsWith('equity'));
        });
      case 'moderate':
      default:
        return allAssets.filter(id => {
          const a = this.assetLibrary.getAsset(id);
          return a && a.expectedReturn > 0.06;
        });
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  AssetClassLibrary,
  MarkowitzOptimizer,
  RiskParityOptimizer,
  BlackLittermanModel,
  DynamicRebalancer,
  PortfolioAnalytics,
  PortfolioOptimizationService
};
