// ============================================================================
// TIME SERIES ENGINE — Advanced Forecasting and Temporal Analysis
// ============================================================================
// ARIMA-like models, exponential smoothing, seasonal decomposition,
// changepoint detection, and financial-specific time series tools.
// All local, no external APIs.
// ============================================================================

'use strict';

// ============================================================================
// §0  UTILITY FUNCTIONS
// ============================================================================

function mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function variance(arr) { const m = mean(arr); return arr.length > 1 ? arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1) : 0; }
function std(arr) { return Math.sqrt(variance(arr)); }
function sum(arr) { return arr.reduce((a, b) => a + b, 0); }
function range(n) { return Array.from({ length: n }, (_, i) => i); }
function diff(arr, d = 1) { const r = []; for (let i = d; i < arr.length; i++) r.push(arr[i] - arr[i - d]); return r; }
function cumsum(arr) { const r = []; let s = 0; for (const v of arr) { s += v; r.push(s); } return r; }

function autocorrelation(data, lag) {
  const m = mean(data);
  const n = data.length;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    den += (data[i] - m) ** 2;
    if (i >= lag) num += (data[i] - m) * (data[i - lag] - m);
  }
  return den !== 0 ? num / den : 0;
}

function partialAutocorrelation(data, maxLag) {
  const pacf = [1.0];
  for (let k = 1; k <= maxLag; k++) {
    // Levinson-Durbin recursion
    const acf = range(k + 1).map(i => autocorrelation(data, i));
    const phi = new Array(k + 1).fill(0);
    phi[1] = acf[1];

    if (k === 1) { pacf.push(phi[1]); continue; }

    const prevPhi = new Array(k).fill(0);
    prevPhi[1] = acf[1];

    for (let j = 2; j <= k; j++) {
      let num = acf[j];
      let den = 1;
      for (let i = 1; i < j; i++) {
        num -= prevPhi[i] * acf[j - i];
        den -= prevPhi[i] * acf[i];
      }
      phi[j] = den !== 0 ? num / den : 0;

      const newPhi = new Array(k + 1).fill(0);
      newPhi[j] = phi[j];
      for (let i = 1; i < j; i++) {
        newPhi[i] = prevPhi[i] - phi[j] * prevPhi[j - i];
      }
      for (let i = 1; i <= j; i++) prevPhi[i] = newPhi[i];
    }
    pacf.push(prevPhi[k] || phi[k]);
  }
  return pacf;
}

// ============================================================================
// §1  EXPONENTIAL SMOOTHING (Triple — Holt-Winters)
// ============================================================================

class HoltWinters {
  constructor(config = {}) {
    this.alpha = config.alpha || null;
    this.beta = config.beta || null;
    this.gamma = config.gamma || null;
    this.seasonLength = config.seasonLength || 12;
    this.damped = config.damped || false;
    this.phi = config.phi || 0.98; // damping factor
    this.multiplicative = config.multiplicative || false;
  }

  _initSeasonal(data) {
    const s = this.seasonLength;
    const nSeasons = Math.floor(data.length / s);
    const seasonal = new Array(s).fill(0);

    for (let i = 0; i < s; i++) {
      let sum = 0;
      for (let j = 0; j < nSeasons; j++) {
        sum += data[i + j * s];
      }
      seasonal[i] = sum / nSeasons;
    }

    const avg = mean(seasonal);
    if (this.multiplicative) {
      return seasonal.map(v => v / avg);
    }
    return seasonal.map(v => v - avg);
  }

  _optimizeParams(data) {
    let bestAlpha = 0.2, bestBeta = 0.1, bestGamma = 0.1;
    let bestError = Infinity;

    const alphas = [0.05, 0.1, 0.2, 0.3, 0.5, 0.7, 0.9];
    const betas = [0.01, 0.05, 0.1, 0.2, 0.3];
    const gammas = [0.01, 0.05, 0.1, 0.2, 0.3, 0.5];

    for (const alpha of alphas) {
      for (const beta of betas) {
        for (const gamma of gammas) {
          try {
            const error = this._computeError(data, alpha, beta, gamma);
            if (error < bestError) {
              bestError = error;
              bestAlpha = alpha;
              bestBeta = beta;
              bestGamma = gamma;
            }
          } catch { /* skip invalid combos */ }
        }
      }
    }

    this.alpha = bestAlpha;
    this.beta = bestBeta;
    this.gamma = bestGamma;
  }

  _computeError(data, alpha, beta, gamma) {
    const s = this.seasonLength;
    const seasonal = this._initSeasonal(data);
    let level = mean(data.slice(0, s));
    let trend = (mean(data.slice(s, 2 * s)) - mean(data.slice(0, s))) / s;
    let sse = 0;
    let count = 0;

    for (let i = 0; i < data.length; i++) {
      const seasonIdx = i % s;
      let forecast;

      if (this.multiplicative) {
        forecast = (level + trend) * seasonal[seasonIdx];
      } else {
        forecast = level + trend + seasonal[seasonIdx];
      }

      if (i >= s) {
        sse += (data[i] - forecast) ** 2;
        count++;
      }

      if (this.multiplicative) {
        const newLevel = alpha * (data[i] / seasonal[seasonIdx]) + (1 - alpha) * (level + trend);
        const newTrend = beta * (newLevel - level) + (1 - beta) * trend;
        seasonal[seasonIdx] = gamma * (data[i] / newLevel) + (1 - gamma) * seasonal[seasonIdx];
        level = newLevel;
        trend = newTrend;
      } else {
        const newLevel = alpha * (data[i] - seasonal[seasonIdx]) + (1 - alpha) * (level + trend);
        const newTrend = beta * (newLevel - level) + (1 - beta) * trend;
        seasonal[seasonIdx] = gamma * (data[i] - newLevel) + (1 - gamma) * seasonal[seasonIdx];
        level = newLevel;
        trend = newTrend;
      }
    }

    return count > 0 ? Math.sqrt(sse / count) : Infinity;
  }

  fit(data) {
    if (data.length < this.seasonLength * 2) {
      this.seasonLength = Math.max(2, Math.floor(data.length / 3));
    }

    if (!this.alpha) this._optimizeParams(data);

    const s = this.seasonLength;
    this.seasonal = this._initSeasonal(data);
    this.level = mean(data.slice(0, s));
    this.trend = (mean(data.slice(s, 2 * s)) - mean(data.slice(0, s))) / s;
    this.fitted = [];
    this.residuals = [];

    for (let i = 0; i < data.length; i++) {
      const seasonIdx = i % s;
      let forecast;

      if (this.multiplicative) {
        forecast = (this.level + this.trend) * this.seasonal[seasonIdx];
      } else {
        forecast = this.level + this.trend + this.seasonal[seasonIdx];
      }

      this.fitted.push(forecast);
      this.residuals.push(data[i] - forecast);

      if (this.multiplicative) {
        const newLevel = this.alpha * (data[i] / this.seasonal[seasonIdx]) + (1 - this.alpha) * (this.level + this.trend);
        const newTrend = this.beta * (newLevel - this.level) + (1 - this.beta) * this.trend;
        this.seasonal[seasonIdx] = this.gamma * (data[i] / newLevel) + (1 - this.gamma) * this.seasonal[seasonIdx];
        this.level = newLevel;
        this.trend = this.damped ? this.phi * newTrend : newTrend;
      } else {
        const newLevel = this.alpha * (data[i] - this.seasonal[seasonIdx]) + (1 - this.alpha) * (this.level + this.trend);
        const newTrend = this.beta * (newLevel - this.level) + (1 - this.beta) * this.trend;
        this.seasonal[seasonIdx] = this.gamma * (data[i] - newLevel) + (1 - this.gamma) * this.seasonal[seasonIdx];
        this.level = newLevel;
        this.trend = this.damped ? this.phi * newTrend : newTrend;
      }
    }

    return this;
  }

  forecast(steps) {
    const predictions = [];
    const s = this.seasonLength;
    let cumulativeTrend = 0;

    for (let h = 1; h <= steps; h++) {
      const seasonIdx = (this.fitted.length + h - 1) % s;
      const dampingFactor = this.damped ? sum(range(h).map(i => this.phi ** (i + 1))) : h;

      let forecast;
      if (this.multiplicative) {
        forecast = (this.level + dampingFactor * this.trend) * this.seasonal[seasonIdx];
      } else {
        forecast = this.level + dampingFactor * this.trend + this.seasonal[seasonIdx];
      }

      // Confidence interval
      const residualStd = std(this.residuals);
      const ci95 = 1.96 * residualStd * Math.sqrt(h);

      predictions.push({
        value: forecast,
        lower: forecast - ci95,
        upper: forecast + ci95,
        step: h,
      });
    }

    return predictions;
  }

  serialize() {
    return {
      alpha: this.alpha, beta: this.beta, gamma: this.gamma,
      seasonLength: this.seasonLength, damped: this.damped, phi: this.phi,
      multiplicative: this.multiplicative, level: this.level,
      trend: this.trend, seasonal: this.seasonal,
    };
  }

  static deserialize(obj) {
    const hw = new HoltWinters(obj);
    hw.level = obj.level;
    hw.trend = obj.trend;
    hw.seasonal = obj.seasonal;
    return hw;
  }
}

// ============================================================================
// §2  ARIMA MODEL
// ============================================================================

class ARIMA {
  constructor(config = {}) {
    this.p = config.p || 1; // AR order
    this.d = config.d || 1; // Differencing
    this.q = config.q || 1; // MA order
    this.arCoeffs = null;
    this.maCoeffs = null;
    this.intercept = 0;
    this.data = null;
    this.diffData = null;
    this.residuals = null;
  }

  _difference(data, d) {
    let result = [...data];
    for (let i = 0; i < d; i++) {
      result = diff(result);
    }
    return result;
  }

  _undifference(diffValues, origData, d) {
    let result = [...diffValues];
    for (let i = 0; i < d; i++) {
      const base = origData[origData.length - d + i];
      const undiffed = [];
      let prev = base;
      for (const v of result) {
        prev = prev + v;
        undiffed.push(prev);
      }
      result = undiffed;
    }
    return result;
  }

  // Estimate AR coefficients using Yule-Walker equations
  _estimateAR(data, p) {
    if (p === 0) return [];

    const n = data.length;
    const acfs = range(p + 1).map(k => autocorrelation(data, k));

    // Build Toeplitz matrix and solve
    const R = [];
    for (let i = 0; i < p; i++) {
      R[i] = [];
      for (let j = 0; j < p; j++) {
        R[i][j] = acfs[Math.abs(i - j)];
      }
    }

    const r = acfs.slice(1, p + 1);

    // Solve R * phi = r using Gaussian elimination
    return this._solveLinearSystem(R, r);
  }

  _solveLinearSystem(A, b) {
    const n = b.length;
    const M = A.map((row, i) => [...row, b[i]]);

    for (let col = 0; col < n; col++) {
      // Find pivot
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
      }
      [M[col], M[maxRow]] = [M[maxRow], M[col]];

      if (Math.abs(M[col][col]) < 1e-10) continue;

      for (let row = col + 1; row < n; row++) {
        const factor = M[row][col] / M[col][col];
        for (let j = col; j <= n; j++) {
          M[row][j] -= factor * M[col][j];
        }
      }
    }

    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let s = M[i][n];
      for (let j = i + 1; j < n; j++) {
        s -= M[i][j] * x[j];
      }
      x[i] = Math.abs(M[i][i]) > 1e-10 ? s / M[i][i] : 0;
    }

    return x;
  }

  // Estimate MA coefficients using innovations algorithm
  _estimateMA(data, arCoeffs, q) {
    if (q === 0) return [];

    // Compute AR residuals
    const residuals = new Array(data.length).fill(0);
    for (let t = arCoeffs.length; t < data.length; t++) {
      let pred = this.intercept;
      for (let j = 0; j < arCoeffs.length; j++) {
        pred += arCoeffs[j] * data[t - j - 1];
      }
      residuals[t] = data[t] - pred;
    }

    // Estimate MA coefficients from residual autocorrelations
    const maCoeffs = [];
    for (let j = 0; j < q; j++) {
      maCoeffs.push(autocorrelation(residuals, j + 1) * 0.5);
    }

    return maCoeffs;
  }

  fit(data) {
    this.data = [...data];

    // Difference the data
    this.diffData = this._difference(data, this.d);
    this.intercept = mean(this.diffData);

    // Center the data
    const centered = this.diffData.map(v => v - this.intercept);

    // Estimate AR coefficients
    this.arCoeffs = this._estimateAR(centered, this.p);

    // Estimate MA coefficients
    this.maCoeffs = this._estimateMA(centered, this.arCoeffs, this.q);

    // Compute fitted values and residuals
    this.residuals = new Array(this.diffData.length).fill(0);
    const fitted = new Array(this.diffData.length).fill(0);

    for (let t = Math.max(this.p, this.q); t < this.diffData.length; t++) {
      let pred = this.intercept;

      // AR component
      for (let j = 0; j < this.p; j++) {
        pred += this.arCoeffs[j] * (this.diffData[t - j - 1] - this.intercept);
      }

      // MA component
      for (let j = 0; j < this.q; j++) {
        if (t - j - 1 >= 0) {
          pred += this.maCoeffs[j] * this.residuals[t - j - 1];
        }
      }

      fitted[t] = pred;
      this.residuals[t] = this.diffData[t] - pred;
    }

    return this;
  }

  forecast(steps) {
    const predictions = [];
    const extendedDiff = [...this.diffData];
    const extendedResiduals = [...this.residuals];
    const residualStd = std(this.residuals.filter(r => r !== 0));

    for (let h = 0; h < steps; h++) {
      let pred = this.intercept;

      // AR component
      for (let j = 0; j < this.p; j++) {
        const idx = extendedDiff.length - j - 1;
        if (idx >= 0) {
          pred += this.arCoeffs[j] * (extendedDiff[idx] - this.intercept);
        }
      }

      // MA component (residuals become 0 for future)
      for (let j = 0; j < this.q; j++) {
        const idx = extendedResiduals.length - j - 1;
        if (idx >= 0 && idx < this.residuals.length) {
          pred += this.maCoeffs[j] * extendedResiduals[idx];
        }
      }

      extendedDiff.push(pred);
      extendedResiduals.push(0);

      predictions.push(pred);
    }

    // Un-difference
    const forecastValues = this._undifference(predictions, this.data, this.d);

    return forecastValues.map((value, i) => ({
      value,
      lower: value - 1.96 * residualStd * Math.sqrt(i + 1),
      upper: value + 1.96 * residualStd * Math.sqrt(i + 1),
      step: i + 1,
    }));
  }

  // Auto-select best (p,d,q) using AIC
  static autoFit(data, maxP = 5, maxD = 2, maxQ = 5) {
    let bestAIC = Infinity;
    let bestModel = null;
    let bestOrder = [1, 1, 1];

    // Test stationarity for d selection
    const testD = (data) => {
      const v1 = variance(data);
      const v2 = variance(diff(data));
      return v2 < v1 ? 1 : 0;
    };

    const d = Math.min(testD(data), maxD);

    for (let p = 0; p <= Math.min(maxP, 3); p++) {
      for (let q = 0; q <= Math.min(maxQ, 3); q++) {
        if (p === 0 && q === 0) continue;
        try {
          const model = new ARIMA({ p, d, q });
          model.fit(data);

          const n = model.residuals.length;
          const rss = model.residuals.reduce((s, r) => s + r * r, 0);
          const k = p + q + 1;
          const aic = n * Math.log(rss / n) + 2 * k;

          if (aic < bestAIC) {
            bestAIC = aic;
            bestModel = model;
            bestOrder = [p, d, q];
          }
        } catch { /* skip invalid */ }
      }
    }

    return { model: bestModel || new ARIMA({ p: 1, d, q: 1 }).fit(data), order: bestOrder, aic: bestAIC };
  }

  serialize() {
    return {
      p: this.p, d: this.d, q: this.q,
      arCoeffs: this.arCoeffs, maCoeffs: this.maCoeffs,
      intercept: this.intercept, data: this.data,
      diffData: this.diffData, residuals: this.residuals,
    };
  }

  static deserialize(obj) {
    const model = new ARIMA({ p: obj.p, d: obj.d, q: obj.q });
    Object.assign(model, obj);
    return model;
  }
}

// ============================================================================
// §3  SEASONAL DECOMPOSITION
// ============================================================================

class SeasonalDecomposition {
  constructor(config = {}) {
    this.period = config.period || 12;
    this.model = config.model || 'additive'; // 'additive' or 'multiplicative'
  }

  decompose(data) {
    const n = data.length;
    const p = Math.min(this.period, Math.floor(n / 2));

    // Step 1: Compute trend using centered moving average
    const trend = new Array(n).fill(null);
    const halfP = Math.floor(p / 2);

    for (let i = halfP; i < n - halfP; i++) {
      let s = 0;
      for (let j = -halfP; j <= halfP; j++) {
        s += data[i + j];
      }
      trend[i] = s / (2 * halfP + 1);
    }

    // Extend trend to edges using linear extrapolation
    const firstValid = trend.findIndex(v => v !== null);
    const lastValid = trend.length - 1 - [...trend].reverse().findIndex(v => v !== null);

    if (firstValid >= 0 && lastValid > firstValid) {
      const slope = (trend[lastValid] - trend[firstValid]) / (lastValid - firstValid);
      for (let i = 0; i < firstValid; i++) {
        trend[i] = trend[firstValid] - slope * (firstValid - i);
      }
      for (let i = lastValid + 1; i < n; i++) {
        trend[i] = trend[lastValid] + slope * (i - lastValid);
      }
    }

    // Step 2: Detrend
    const detrended = data.map((v, i) => {
      if (trend[i] === null) return 0;
      return this.model === 'multiplicative' ? v / trend[i] : v - trend[i];
    });

    // Step 3: Compute seasonal component
    const seasonalAvg = new Array(p).fill(0);
    const counts = new Array(p).fill(0);

    for (let i = 0; i < n; i++) {
      seasonalAvg[i % p] += detrended[i];
      counts[i % p]++;
    }

    for (let i = 0; i < p; i++) {
      seasonalAvg[i] = counts[i] > 0 ? seasonalAvg[i] / counts[i] : 0;
    }

    // Center seasonal
    const seasonalMean = mean(seasonalAvg);
    const centered = this.model === 'multiplicative'
      ? seasonalAvg.map(v => v / seasonalMean)
      : seasonalAvg.map(v => v - seasonalMean);

    const seasonal = data.map((_, i) => centered[i % p]);

    // Step 4: Residual
    const residual = data.map((v, i) => {
      if (this.model === 'multiplicative') {
        return trend[i] && seasonal[i] ? v / (trend[i] * seasonal[i]) : 1;
      }
      return v - (trend[i] || 0) - seasonal[i];
    });

    return { trend, seasonal, residual, period: p, model: this.model };
  }

  // Detect seasonality strength
  static detectSeasonality(data, maxPeriod = 30) {
    const n = data.length;
    const results = [];

    for (let period = 2; period <= Math.min(maxPeriod, Math.floor(n / 3)); period++) {
      const acf = autocorrelation(data, period);
      results.push({ period, strength: Math.abs(acf) });
    }

    results.sort((a, b) => b.strength - a.strength);
    return results.slice(0, 5);
  }
}

// ============================================================================
// §4  CHANGEPOINT DETECTION (CUSUM & Binary Segmentation)
// ============================================================================

class ChangepointDetector {
  constructor(config = {}) {
    this.minSegmentLength = config.minSegmentLength || 5;
    this.penalty = config.penalty || 'bic'; // 'bic', 'aic', or numeric
    this.maxChangepoints = config.maxChangepoints || 10;
  }

  // CUSUM (Cumulative Sum) method
  cusum(data, threshold = null) {
    const m = mean(data);
    const s = std(data);
    const h = threshold || 4 * s;

    const cusumPos = [0];
    const cusumNeg = [0];
    const changepoints = [];

    for (let i = 1; i < data.length; i++) {
      const z = (data[i] - m) / (s || 1);
      cusumPos.push(Math.max(0, cusumPos[i - 1] + z - 0.5));
      cusumNeg.push(Math.max(0, cusumNeg[i - 1] - z - 0.5));

      if (cusumPos[i] > h || cusumNeg[i] > h) {
        changepoints.push({
          index: i,
          direction: cusumPos[i] > h ? 'increase' : 'decrease',
          magnitude: cusumPos[i] > h ? cusumPos[i] : cusumNeg[i],
        });
        cusumPos[i] = 0;
        cusumNeg[i] = 0;
      }
    }

    return { changepoints, cusumPos, cusumNeg };
  }

  // Binary Segmentation
  binarySegmentation(data) {
    const changepoints = [];
    const _getPenalty = (n) => {
      if (typeof this.penalty === 'number') return this.penalty;
      if (this.penalty === 'aic') return 2;
      return Math.log(n); // BIC
    };

    const _cost = (segment) => {
      if (segment.length < 2) return 0;
      const v = variance(segment);
      return segment.length * Math.log(v + 1e-10);
    };

    const _findBestSplit = (data, start, end) => {
      const segment = data.slice(start, end);
      const fullCost = _cost(segment);
      let bestGain = -Infinity;
      let bestSplit = -1;

      for (let i = start + this.minSegmentLength; i < end - this.minSegmentLength; i++) {
        const leftCost = _cost(data.slice(start, i));
        const rightCost = _cost(data.slice(i, end));
        const gain = fullCost - leftCost - rightCost;
        if (gain > bestGain) {
          bestGain = gain;
          bestSplit = i;
        }
      }

      return { split: bestSplit, gain: bestGain };
    };

    const queue = [{ start: 0, end: data.length }];
    const penalty = _getPenalty(data.length);

    while (queue.length > 0 && changepoints.length < this.maxChangepoints) {
      const { start, end } = queue.shift();
      if (end - start < 2 * this.minSegmentLength) continue;

      const { split, gain } = _findBestSplit(data, start, end);
      if (split !== -1 && gain > penalty) {
        changepoints.push({
          index: split,
          meanBefore: mean(data.slice(start, split)),
          meanAfter: mean(data.slice(split, end)),
          gain,
        });
        queue.push({ start, end: split });
        queue.push({ start: split, end });
      }
    }

    changepoints.sort((a, b) => a.index - b.index);
    return changepoints;
  }

  // Financial-specific: detect spending pattern changes
  detectSpendingChanges(dailySpending) {
    const changepoints = this.binarySegmentation(dailySpending);
    const cusumResult = this.cusum(dailySpending);

    return {
      structuralChanges: changepoints.map(cp => ({
        dayIndex: cp.index,
        avgBefore: cp.meanBefore,
        avgAfter: cp.meanAfter,
        percentChange: ((cp.meanAfter - cp.meanBefore) / cp.meanBefore * 100).toFixed(1) + '%',
        type: cp.meanAfter > cp.meanBefore ? 'spending_increase' : 'spending_decrease',
      })),
      anomalousShifts: cusumResult.changepoints.map(cp => ({
        dayIndex: cp.index,
        direction: cp.direction,
        severity: cp.magnitude > 8 ? 'high' : cp.magnitude > 5 ? 'medium' : 'low',
      })),
    };
  }
}

// ============================================================================
// §5  MOVING AVERAGES & SMOOTHING
// ============================================================================

class MovingAverage {
  // Simple Moving Average
  static SMA(data, window) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < window - 1) { result.push(null); continue; }
      const slice = data.slice(i - window + 1, i + 1);
      result.push(mean(slice));
    }
    return result;
  }

  // Exponential Moving Average
  static EMA(data, window) {
    const k = 2 / (window + 1);
    const result = [data[0]];
    for (let i = 1; i < data.length; i++) {
      result.push(data[i] * k + result[i - 1] * (1 - k));
    }
    return result;
  }

  // Weighted Moving Average
  static WMA(data, window) {
    const result = [];
    const denominator = (window * (window + 1)) / 2;
    for (let i = 0; i < data.length; i++) {
      if (i < window - 1) { result.push(null); continue; }
      let weightedSum = 0;
      for (let j = 0; j < window; j++) {
        weightedSum += data[i - window + 1 + j] * (j + 1);
      }
      result.push(weightedSum / denominator);
    }
    return result;
  }

  // Bollinger Bands
  static BollingerBands(data, window = 20, numStd = 2) {
    const sma = MovingAverage.SMA(data, window);
    const upper = [];
    const lower = [];

    for (let i = 0; i < data.length; i++) {
      if (sma[i] === null) { upper.push(null); lower.push(null); continue; }
      const slice = data.slice(i - window + 1, i + 1);
      const s = std(slice);
      upper.push(sma[i] + numStd * s);
      lower.push(sma[i] - numStd * s);
    }

    return { middle: sma, upper, lower };
  }

  // MACD (Moving Average Convergence Divergence)
  static MACD(data, shortPeriod = 12, longPeriod = 26, signalPeriod = 9) {
    const shortEMA = MovingAverage.EMA(data, shortPeriod);
    const longEMA = MovingAverage.EMA(data, longPeriod);
    const macdLine = shortEMA.map((v, i) => v - longEMA[i]);
    const signalLine = MovingAverage.EMA(macdLine, signalPeriod);
    const histogram = macdLine.map((v, i) => v - signalLine[i]);

    return { macdLine, signalLine, histogram };
  }
}

// ============================================================================
// §6  FINANCIAL FORECASTING ENGINE
// ============================================================================

class FinancialForecaster {
  constructor() {
    this.models = {};
    this.modelPerformance = {};
  }

  // Prepare time series from transactions
  prepareTimeSeries(transactions, frequency = 'monthly') {
    const grouped = {};

    for (const t of transactions) {
      const date = new Date(t.date);
      let key;

      switch (frequency) {
        case 'daily':
          key = date.toISOString().slice(0, 10);
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().slice(0, 10);
          break;
        case 'monthly':
        default:
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      if (!grouped[key]) grouped[key] = { income: 0, expense: 0, count: 0 };

      const amount = Math.abs(t.amount || 0);
      if (t.type === 'income' || t.type === 'credit') {
        grouped[key].income += amount;
      } else {
        grouped[key].expense += amount;
      }
      grouped[key].count++;
    }

    const sortedKeys = Object.keys(grouped).sort();
    return {
      dates: sortedKeys,
      income: sortedKeys.map(k => grouped[k].income),
      expense: sortedKeys.map(k => grouped[k].expense),
      net: sortedKeys.map(k => grouped[k].income - grouped[k].expense),
      counts: sortedKeys.map(k => grouped[k].count),
    };
  }

  // Forecast spending by category
  forecastByCategory(transactions, steps = 3) {
    const categories = {};

    for (const t of transactions) {
      const cat = t.category || 'other';
      if (!categories[cat]) categories[cat] = {};

      const month = new Date(t.date).toISOString().slice(0, 7);
      categories[cat][month] = (categories[cat][month] || 0) + Math.abs(t.amount || 0);
    }

    const forecasts = {};

    for (const [category, monthlyData] of Object.entries(categories)) {
      const sortedMonths = Object.keys(monthlyData).sort();
      const values = sortedMonths.map(k => monthlyData[k]);

      if (values.length < 3) {
        forecasts[category] = {
          forecast: new Array(steps).fill(mean(values)),
          method: 'mean',
          confidence: 'low',
        };
        continue;
      }

      try {
        // Try Holt-Winters first
        const hw = new HoltWinters({
          seasonLength: Math.min(12, Math.floor(values.length / 2)),
        });
        hw.fit(values);
        const pred = hw.forecast(steps);

        // Check model quality
        const mape = this._computeMAPE(values, hw.fitted);

        forecasts[category] = {
          forecast: pred.map(p => ({ value: Math.max(0, p.value), lower: Math.max(0, p.lower), upper: p.upper })),
          method: 'holt_winters',
          confidence: mape < 0.15 ? 'high' : mape < 0.3 ? 'medium' : 'low',
          mape,
          lastMonths: sortedMonths.slice(-3),
        };
      } catch {
        // Fallback to simple EMA forecast
        const ema = MovingAverage.EMA(values, Math.min(3, values.length));
        const lastEMA = ema[ema.length - 1];
        const trend = values.length >= 2 ? values[values.length - 1] - values[values.length - 2] : 0;

        forecasts[category] = {
          forecast: range(steps).map(i => ({
            value: Math.max(0, lastEMA + trend * (i + 1)),
            lower: Math.max(0, lastEMA + trend * (i + 1) - std(values)),
            upper: lastEMA + trend * (i + 1) + std(values),
          })),
          method: 'ema',
          confidence: 'low',
        };
      }
    }

    return forecasts;
  }

  // Comprehensive forecast
  comprehensiveForecast(transactions, steps = 6) {
    const ts = this.prepareTimeSeries(transactions, 'monthly');

    if (ts.expense.length < 3) {
      return { error: 'Insufficient data for forecasting. Need at least 3 months.' };
    }

    const results = {
      totalExpense: null,
      totalIncome: null,
      netSavings: null,
      byCategory: this.forecastByCategory(transactions, steps),
      trends: {},
      seasonality: null,
    };

    // Expense forecast
    try {
      const { model: expModel } = ARIMA.autoFit(ts.expense);
      results.totalExpense = expModel.forecast(steps);
    } catch {
      const hw = new HoltWinters({ seasonLength: Math.min(12, Math.floor(ts.expense.length / 2)) });
      hw.fit(ts.expense);
      results.totalExpense = hw.forecast(steps);
    }

    // Income forecast
    if (ts.income.some(v => v > 0)) {
      try {
        const hw = new HoltWinters({ seasonLength: Math.min(12, Math.floor(ts.income.length / 2)) });
        hw.fit(ts.income);
        results.totalIncome = hw.forecast(steps);
      } catch { /* insufficient data */ }
    }

    // Net savings forecast
    if (results.totalExpense && results.totalIncome) {
      results.netSavings = results.totalExpense.map((exp, i) => ({
        value: (results.totalIncome[i]?.value || 0) - exp.value,
        step: exp.step,
      }));
    }

    // Trend analysis
    results.trends = {
      shortTerm: this._computeTrend(ts.expense.slice(-3)),
      mediumTerm: this._computeTrend(ts.expense.slice(-6)),
      longTerm: this._computeTrend(ts.expense),
    };

    // Seasonality
    if (ts.expense.length >= 12) {
      const decomp = new SeasonalDecomposition({ period: 12 });
      const result = decomp.decompose(ts.expense);
      results.seasonality = {
        pattern: result.seasonal.slice(0, 12),
        strength: this._seasonalityStrength(result),
        peakMonths: this._findPeakSeasons(result.seasonal.slice(0, 12)),
      };
    }

    return results;
  }

  _computeMAPE(actual, predicted) {
    let totalError = 0;
    let count = 0;
    for (let i = 0; i < actual.length; i++) {
      if (actual[i] !== 0 && predicted[i] != null) {
        totalError += Math.abs((actual[i] - predicted[i]) / actual[i]);
        count++;
      }
    }
    return count > 0 ? totalError / count : 1;
  }

  _computeTrend(values) {
    if (values.length < 2) return { direction: 'stable', rate: 0 };

    // Linear regression slope
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = mean(values);
    let num = 0, den = 0;

    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (values[i] - yMean);
      den += (i - xMean) ** 2;
    }

    const slope = den !== 0 ? num / den : 0;
    const percentChange = yMean !== 0 ? (slope / yMean) * 100 : 0;

    return {
      direction: percentChange > 2 ? 'increasing' : percentChange < -2 ? 'decreasing' : 'stable',
      rate: percentChange,
      slope,
    };
  }

  _seasonalityStrength(decomposition) {
    const seasonalVar = variance(decomposition.seasonal);
    const residualVar = variance(decomposition.residual);
    return 1 - residualVar / (seasonalVar + residualVar + 1e-10);
  }

  _findPeakSeasons(seasonal) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return seasonal
      .map((v, i) => ({ month: months[i % 12], value: v }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map(m => m.month);
  }

  serialize() {
    return { models: this.models, performance: this.modelPerformance };
  }
}

// ============================================================================
// §7  CASHFLOW PROJECTION
// ============================================================================

class CashflowProjector {
  constructor() {
    this.recurringDetector = new RecurringTransactionDetector();
  }

  project(transactions, balance, months = 12) {
    // Detect recurring items
    const recurring = this.recurringDetector.detect(transactions);

    // Project monthly
    const projections = [];
    let runningBalance = balance;

    for (let m = 0; m < months; m++) {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + m + 1);
      const monthLabel = futureDate.toISOString().slice(0, 7);

      let projectedIncome = 0;
      let projectedExpenses = 0;

      for (const item of recurring) {
        if (item.type === 'income') {
          projectedIncome += item.amount;
        } else {
          projectedExpenses += item.amount;
        }
      }

      const net = projectedIncome - projectedExpenses;
      runningBalance += net;

      projections.push({
        month: monthLabel,
        projectedIncome,
        projectedExpenses,
        netCashflow: net,
        projectedBalance: runningBalance,
        isNegative: runningBalance < 0,
      });
    }

    // Risk assessment
    const negativeMonths = projections.filter(p => p.isNegative);
    const monthsUntilNegative = negativeMonths.length > 0 ? projections.indexOf(negativeMonths[0]) + 1 : null;

    return {
      projections,
      recurring,
      startingBalance: balance,
      endingBalance: runningBalance,
      monthsUntilNegative,
      riskLevel: monthsUntilNegative
        ? monthsUntilNegative <= 3 ? 'critical' : monthsUntilNegative <= 6 ? 'high' : 'moderate'
        : 'low',
    };
  }
}

// ============================================================================
// §8  RECURRING TRANSACTION DETECTOR
// ============================================================================

class RecurringTransactionDetector {
  detect(transactions) {
    // Group by merchant/description
    const groups = {};

    for (const t of transactions) {
      const key = this._normalizeKey(t.description || t.merchant || '');
      if (!key) continue;

      if (!groups[key]) groups[key] = [];
      groups[key].push({
        date: new Date(t.date),
        amount: Math.abs(t.amount || 0),
        type: t.type || (t.amount > 0 ? 'income' : 'expense'),
      });
    }

    const recurring = [];

    for (const [key, items] of Object.entries(groups)) {
      if (items.length < 2) continue;

      items.sort((a, b) => a.date - b.date);

      // Check regularity
      const intervals = [];
      for (let i = 1; i < items.length; i++) {
        intervals.push((items[i].date - items[i - 1].date) / 86400000);
      }

      if (intervals.length === 0) continue;

      const avgInterval = mean(intervals);
      const intervalStd = std(intervals);
      const cv = avgInterval > 0 ? intervalStd / avgInterval : Infinity;

      // Classify frequency
      let frequency = null;
      if (avgInterval >= 25 && avgInterval <= 35 && cv < 0.3) frequency = 'monthly';
      else if (avgInterval >= 6 && avgInterval <= 8 && cv < 0.3) frequency = 'weekly';
      else if (avgInterval >= 13 && avgInterval <= 16 && cv < 0.3) frequency = 'biweekly';
      else if (avgInterval >= 85 && avgInterval <= 95 && cv < 0.3) frequency = 'quarterly';
      else if (avgInterval >= 355 && avgInterval <= 375 && cv < 0.3) frequency = 'yearly';

      if (!frequency) continue;

      const amounts = items.map(i => i.amount);
      const amountCV = mean(amounts) > 0 ? std(amounts) / mean(amounts) : Infinity;

      recurring.push({
        description: key,
        frequency,
        amount: mean(amounts),
        amountVariation: amountCV,
        isFixedAmount: amountCV < 0.05,
        type: items[0].type,
        occurrences: items.length,
        lastDate: items[items.length - 1].date,
        nextExpected: new Date(items[items.length - 1].date.getTime() + avgInterval * 86400000),
        confidence: Math.max(0, 1 - cv) * Math.min(1, items.length / 5),
      });
    }

    return recurring.sort((a, b) => b.confidence - a.confidence);
  }

  _normalizeKey(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .slice(0, 3)
      .join(' ');
  }
}

// ============================================================================
// §9  EXPORTS
// ============================================================================

module.exports = {
  HoltWinters,
  ARIMA,
  SeasonalDecomposition,
  ChangepointDetector,
  MovingAverage,
  FinancialForecaster,
  CashflowProjector,
  RecurringTransactionDetector,
  autocorrelation,
  partialAutocorrelation,
};
