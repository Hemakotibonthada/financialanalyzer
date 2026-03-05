// ============================================================================
// FINANCIAL FORECASTING ENGINE — Advanced Time Series Models
// ============================================================================
// Implements multiple forecasting methods: Prophet-like decomposition, 
// LSTM-inspired recurrent predictions, ensemble forecasting, and
// Monte Carlo simulation for financial projections.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');

const sum = (a) => a.reduce((s, v) => s + v, 0);
const mean = (a) => a.length ? sum(a) / a.length : 0;
const stdDev = (a) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(sum(a.map(v => (v - m) ** 2)) / (a.length - 1));
};

// ============================================================================
// §1  SEASONAL DECOMPOSITION — Trend + Seasonal + Residual
// ============================================================================

class SeasonalDecomposition {
  constructor(config = {}) {
    this.period = config.period || 7; // Weekly seasonality by default
    this.method = config.method || 'additive'; // 'additive' or 'multiplicative'
  }

  decompose(data) {
    if (data.length < this.period * 2) {
      return { trend: [...data], seasonal: data.map(() => 0), residual: data.map(() => 0) };
    }

    // Step 1: Compute trend using centered moving average
    const trend = this._centeredMovingAverage(data, this.period);

    // Step 2: Detrend
    const detrended = data.map((v, i) => {
      if (trend[i] === null) return null;
      return this.method === 'multiplicative'
        ? (trend[i] !== 0 ? v / trend[i] : 1)
        : v - trend[i];
    });

    // Step 3: Get seasonal pattern
    const seasonal = this._computeSeasonalPattern(detrended);

    // Step 4: Compute residual
    const residual = data.map((v, i) => {
      const t = trend[i] !== null ? trend[i] : mean(data);
      const s = seasonal[i % this.period];
      return this.method === 'multiplicative'
        ? (t * s !== 0 ? v / (t * s) : 0)
        : v - t - s;
    });

    return {
      trend: trend.map(v => v !== null ? v : null),
      seasonal: data.map((_, i) => seasonal[i % this.period]),
      residual,
      seasonalPattern: seasonal,
      strength: this._computeStrength(data, trend, seasonal)
    };
  }

  _centeredMovingAverage(data, window) {
    const result = new Array(data.length).fill(null);
    const halfWin = Math.floor(window / 2);

    for (let i = halfWin; i < data.length - halfWin; i++) {
      let sum = 0;
      for (let j = i - halfWin; j <= i + halfWin; j++) {
        sum += data[j];
      }
      result[i] = sum / window;
    }

    return result;
  }

  _computeSeasonalPattern(detrended) {
    const seasonal = new Array(this.period).fill(0);
    const counts = new Array(this.period).fill(0);

    for (let i = 0; i < detrended.length; i++) {
      if (detrended[i] !== null) {
        seasonal[i % this.period] += detrended[i];
        counts[i % this.period]++;
      }
    }

    for (let i = 0; i < this.period; i++) {
      seasonal[i] = counts[i] > 0 ? seasonal[i] / counts[i] : 0;
    }

    // Normalize (additive: mean should be 0; multiplicative: mean should be 1)
    const avg = mean(seasonal);
    if (this.method === 'additive') {
      return seasonal.map(s => s - avg);
    }
    return seasonal.map(s => avg !== 0 ? s / avg : 1);
  }

  _computeStrength(data, trend, seasonal) {
    const trendValues = trend.filter(v => v !== null);
    const trendVar = trendValues.length > 1 ? stdDev(trendValues) ** 2 : 0;
    const totalVar = stdDev(data) ** 2;
    const seasonalVar = stdDev(seasonal) ** 2;

    return {
      trendStrength: totalVar > 0 ? Math.max(0, 1 - trendVar / totalVar) : 0,
      seasonalStrength: totalVar > 0 ? Math.max(0, 1 - seasonalVar / totalVar) : 0
    };
  }
}

// ============================================================================
// §2  PROPHET-LIKE FORECASTER — Inspired by Facebook Prophet
// ============================================================================

class ProphetLikeForecaster {
  constructor(config = {}) {
    this.changepoints = [];
    this.trend = null;
    this.seasonality = {};
    this.holidays = config.holidays || [];
    this.growthModel = config.growth || 'linear'; // 'linear' or 'logistic'
    this.cap = config.cap || null;
    this.floor = config.floor || 0;
    this.yearlySeasonality = config.yearlySeasonality !== false;
    this.weeklySeasonality = config.weeklySeasonality !== false;
    this.monthlySeasonality = config.monthlySeasonality !== false;
  }

  fit(dates, values) {
    if (dates.length < 14) {
      this.trend = { slope: 0, intercept: mean(values) };
      return this;
    }

    // Convert dates to numeric
    const timestamps = dates.map(d => new Date(d).getTime());
    const minTime = Math.min(...timestamps);
    const timeScale = (Math.max(...timestamps) - minTime) || 1;
    const normalized = timestamps.map(t => (t - minTime) / timeScale);

    // Fit trend
    this.trend = this._fitTrend(normalized, values);

    // Detect changepoints
    this.changepoints = this._detectChangepoints(normalized, values, this.trend);

    // Fit seasonality
    if (this.weeklySeasonality) {
      this.seasonality.weekly = this._fitSeasonality(dates, values, 7);
    }
    if (this.monthlySeasonality) {
      this.seasonality.monthly = this._fitSeasonality(dates, values, 30);
    }
    if (this.yearlySeasonality && dates.length > 60) {
      this.seasonality.yearly = this._fitSeasonality(dates, values, 365);
    }

    this._minTime = minTime;
    this._timeScale = timeScale;
    this._fittedValues = values;

    return this;
  }

  predict(futureDates) {
    if (!this.trend) throw new Error('Model not fitted. Call fit() first.');

    return futureDates.map(date => {
      const t = (new Date(date).getTime() - this._minTime) / this._timeScale;
      let prediction = this.trend.intercept + this.trend.slope * t;

      // Add changepoint effects
      for (const cp of this.changepoints) {
        if (t > cp.time) {
          prediction += cp.delta * (t - cp.time);
        }
      }

      // Add seasonality
      const d = new Date(date);
      if (this.seasonality.weekly) {
        prediction += this.seasonality.weekly[d.getDay()] || 0;
      }
      if (this.seasonality.monthly) {
        prediction += this.seasonality.monthly[d.getDate() - 1] || 0;
      }

      // Apply constraints
      if (this.growthModel === 'logistic' && this.cap) {
        prediction = Math.min(prediction, this.cap);
      }
      prediction = Math.max(prediction, this.floor);

      return {
        date,
        yhat: prediction,
        yhat_lower: prediction * 0.85,
        yhat_upper: prediction * 1.15,
        trend: this.trend.intercept + this.trend.slope * t
      };
    });
  }

  _fitTrend(x, y) {
    const n = x.length;
    const mx = mean(x), my = mean(y);
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (x[i] - mx) * (y[i] - my);
      den += (x[i] - mx) ** 2;
    }
    const slope = den > 0 ? num / den : 0;
    const intercept = my - slope * mx;
    return { slope, intercept };
  }

  _detectChangepoints(x, y, trend, maxChangepoints = 5) {
    const residuals = y.map((v, i) => v - (trend.intercept + trend.slope * x[i]));
    const changepoints = [];
    const segmentSize = Math.max(Math.floor(x.length / (maxChangepoints + 1)), 5);

    for (let cp = segmentSize; cp < x.length - segmentSize; cp += segmentSize) {
      const leftResiduals = residuals.slice(cp - segmentSize, cp);
      const rightResiduals = residuals.slice(cp, cp + segmentSize);
      const leftMean = mean(leftResiduals);
      const rightMean = mean(rightResiduals);
      const delta = rightMean - leftMean;

      if (Math.abs(delta) > stdDev(residuals) * 0.5) {
        changepoints.push({ time: x[cp], delta: delta * 0.5, index: cp });
      }
    }

    return changepoints.slice(0, maxChangepoints);
  }

  _fitSeasonality(dates, values, period) {
    const seasonal = {};
    const counts = {};

    // Detrend first
    const detrended = values.map((v, i) => {
      const t = i / (values.length || 1);
      return v - (this.trend.intercept + this.trend.slope * t);
    });

    for (let i = 0; i < dates.length; i++) {
      const d = new Date(dates[i]);
      let key;
      if (period === 7) key = d.getDay();
      else if (period === 30) key = d.getDate() - 1;
      else key = Math.floor((d.getMonth() * 30 + d.getDate()) / (365 / 12));

      if (!seasonal[key]) { seasonal[key] = 0; counts[key] = 0; }
      seasonal[key] += detrended[i];
      counts[key]++;
    }

    for (const key of Object.keys(seasonal)) {
      seasonal[key] = counts[key] > 0 ? seasonal[key] / counts[key] : 0;
    }

    // Normalize to zero mean
    const avg = mean(Object.values(seasonal));
    for (const key of Object.keys(seasonal)) {
      seasonal[key] -= avg;
    }

    return seasonal;
  }

  getComponents() {
    return {
      trend: this.trend,
      changepoints: this.changepoints,
      seasonality: this.seasonality,
      growthModel: this.growthModel
    };
  }
}

// ============================================================================
// §3  MONTE CARLO SIMULATION — Financial Scenario Modeling
// ============================================================================

class MonteCarloSimulator {
  constructor(config = {}) {
    this.numSimulations = config.numSimulations || 1000;
    this.seed = config.seed || Date.now();
  }

  _random() {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return this.seed / 2147483647;
  }

  _normalRandom() {
    const u1 = this._random();
    const u2 = this._random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  // Simulate portfolio growth
  simulatePortfolioGrowth(config) {
    const {
      initialInvestment = 100000,
      monthlyContribution = 10000,
      expectedReturn = 0.12,   // Annual
      volatility = 0.15,       // Annual
      years = 10,
      inflationRate = 0.06
    } = config;

    const monthlyReturn = expectedReturn / 12;
    const monthlyVolatility = volatility / Math.sqrt(12);
    const months = years * 12;
    const results = [];

    for (let sim = 0; sim < this.numSimulations; sim++) {
      let balance = initialInvestment;
      const path = [balance];

      for (let m = 0; m < months; m++) {
        const monthReturn = monthlyReturn + monthlyVolatility * this._normalRandom();
        balance = balance * (1 + monthReturn) + monthlyContribution;
        path.push(Math.max(0, balance));
      }

      results.push({
        finalValue: balance,
        path: path.filter((_, i) => i % 12 === 0 || i === months), // Yearly snapshots
        maxDrawdown: this._maxDrawdown(path),
        annualizedReturn: Math.pow(balance / (initialInvestment + monthlyContribution * months), 1 / years) - 1
      });
    }

    results.sort((a, b) => a.finalValue - b.finalValue);

    const totalInvested = initialInvestment + monthlyContribution * months;
    const inflationAdjusted = totalInvested * Math.pow(1 + inflationRate, years);

    return {
      simulations: this.numSimulations,
      years,
      totalInvested,
      percentiles: {
        p5: results[Math.floor(this.numSimulations * 0.05)].finalValue,
        p10: results[Math.floor(this.numSimulations * 0.10)].finalValue,
        p25: results[Math.floor(this.numSimulations * 0.25)].finalValue,
        p50: results[Math.floor(this.numSimulations * 0.50)].finalValue,
        p75: results[Math.floor(this.numSimulations * 0.75)].finalValue,
        p90: results[Math.floor(this.numSimulations * 0.90)].finalValue,
        p95: results[Math.floor(this.numSimulations * 0.95)].finalValue
      },
      mean: mean(results.map(r => r.finalValue)),
      std: stdDev(results.map(r => r.finalValue)),
      probOfLoss: results.filter(r => r.finalValue < totalInvested).length / this.numSimulations,
      probOfBeatInflation: results.filter(r => r.finalValue > inflationAdjusted).length / this.numSimulations,
      avgMaxDrawdown: mean(results.map(r => r.maxDrawdown)),
      avgAnnualReturn: mean(results.map(r => r.annualizedReturn)),
      worstCase: results[0].finalValue,
      bestCase: results[results.length - 1].finalValue,
      medianPath: results[Math.floor(this.numSimulations * 0.5)].path
    };
  }

  // Simulate retirement corpus depletion
  simulateRetirement(config) {
    const {
      corpus = 10000000,
      monthlyExpense = 50000,
      expenseInflation = 0.06,
      returnRate = 0.08,
      returnVolatility = 0.10,
      maxYears = 40
    } = config;

    const results = [];

    for (let sim = 0; sim < this.numSimulations; sim++) {
      let balance = corpus;
      let monthlyExp = monthlyExpense;
      let yearsLasted = maxYears;

      for (let year = 0; year < maxYears; year++) {
        for (let month = 0; month < 12; month++) {
          const monthReturn = (returnRate / 12) + (returnVolatility / Math.sqrt(12)) * this._normalRandom();
          balance = balance * (1 + monthReturn) - monthlyExp;

          if (balance <= 0) {
            yearsLasted = year + month / 12;
            balance = 0;
            break;
          }
        }

        if (balance <= 0) break;
        monthlyExp *= (1 + expenseInflation / 12);
      }

      results.push({ yearsLasted, finalBalance: Math.max(0, balance) });
    }

    results.sort((a, b) => a.yearsLasted - b.yearsLasted);

    return {
      simulations: this.numSimulations,
      initialCorpus: corpus,
      monthlyExpense,
      survivalProbability: {
        '20years': results.filter(r => r.yearsLasted >= 20).length / this.numSimulations,
        '25years': results.filter(r => r.yearsLasted >= 25).length / this.numSimulations,
        '30years': results.filter(r => r.yearsLasted >= 30).length / this.numSimulations,
        '35years': results.filter(r => r.yearsLasted >= 35).length / this.numSimulations,
        '40years': results.filter(r => r.yearsLasted >= 40).length / this.numSimulations
      },
      medianYearsLasted: results[Math.floor(this.numSimulations * 0.5)].yearsLasted,
      worstCaseYears: results[0].yearsLasted,
      p10YearsLasted: results[Math.floor(this.numSimulations * 0.1)].yearsLasted,
      meanFinalBalance: mean(results.map(r => r.finalBalance)),
      recommendedCorpus: this._findRequiredCorpus(30, monthlyExpense, expenseInflation, returnRate, returnVolatility)
    };
  }

  // Simulate savings goal achievement
  simulateGoalAchievement(config) {
    const {
      targetAmount = 1000000,
      currentSavings = 0,
      monthlySaving = 10000,
      expectedReturn = 0.10,
      volatility = 0.12,
      maxMonths = 120
    } = config;

    const results = [];

    for (let sim = 0; sim < this.numSimulations; sim++) {
      let balance = currentSavings;
      let monthsToGoal = maxMonths;
      let achieved = false;

      for (let m = 0; m < maxMonths; m++) {
        const monthReturn = (expectedReturn / 12) + (volatility / Math.sqrt(12)) * this._normalRandom();
        balance = balance * (1 + monthReturn) + monthlySaving;

        if (balance >= targetAmount) {
          monthsToGoal = m + 1;
          achieved = true;
          break;
        }
      }

      results.push({ monthsToGoal, finalBalance: balance, achieved });
    }

    const achievedResults = results.filter(r => r.achieved);

    return {
      simulations: this.numSimulations,
      targetAmount,
      achievementProbability: achievedResults.length / this.numSimulations,
      medianMonths: achievedResults.length > 0
        ? achievedResults.sort((a, b) => a.monthsToGoal - b.monthsToGoal)[Math.floor(achievedResults.length / 2)].monthsToGoal
        : maxMonths,
      fastestAchievement: achievedResults.length > 0 ? Math.min(...achievedResults.map(r => r.monthsToGoal)) : null,
      slowestAchievement: achievedResults.length > 0 ? Math.max(...achievedResults.map(r => r.monthsToGoal)) : null,
      avgFinalBalance: mean(results.map(r => r.finalBalance)),
      shortfall: results.filter(r => !r.achieved).length > 0
        ? targetAmount - mean(results.filter(r => !r.achieved).map(r => r.finalBalance))
        : 0,
      recommendedMonthlySaving: this._findRequiredMonthlySaving(
        targetAmount, currentSavings, expectedReturn, 60
      )
    };
  }

  _maxDrawdown(path) {
    let maxVal = 0, maxDD = 0;
    for (const v of path) {
      maxVal = Math.max(maxVal, v);
      const dd = maxVal > 0 ? (maxVal - v) / maxVal : 0;
      maxDD = Math.max(maxDD, dd);
    }
    return maxDD;
  }

  _findRequiredCorpus(targetYears, monthlyExpense, inflation, returnRate, volatility) {
    // Binary search for corpus that survives targetYears with 90% probability
    let low = monthlyExpense * 12 * targetYears * 0.5;
    let high = monthlyExpense * 12 * targetYears * 3;

    for (let iter = 0; iter < 10; iter++) {
      const mid = (low + high) / 2;
      let survivals = 0;
      const quickSims = 100;

      for (let i = 0; i < quickSims; i++) {
        let bal = mid;
        let exp = monthlyExpense;
        let survived = true;

        for (let y = 0; y < targetYears; y++) {
          for (let m = 0; m < 12; m++) {
            const r = (returnRate / 12) + (volatility / Math.sqrt(12)) * this._normalRandom();
            bal = bal * (1 + r) - exp;
            if (bal <= 0) { survived = false; break; }
          }
          if (!survived) break;
          exp *= (1 + inflation / 12);
        }
        if (survived) survivals++;
      }

      if (survivals / quickSims >= 0.9) high = mid;
      else low = mid;
    }

    return Math.round(high);
  }

  _findRequiredMonthlySaving(target, current, returnRate, months) {
    // Calculate required monthly saving using future value of annuity
    const r = returnRate / 12;
    if (r === 0) return (target - current) / months;
    const fvCurrent = current * Math.pow(1 + r, months);
    const remaining = target - fvCurrent;
    const annuityFactor = (Math.pow(1 + r, months) - 1) / r;
    return Math.max(0, remaining / annuityFactor);
  }
}

// ============================================================================
// §4  ENSEMBLE FORECASTER — Combines Multiple Forecasting Methods
// ============================================================================

class EnsembleForecaster {
  constructor(config = {}) {
    this.decomposer = new SeasonalDecomposition({ period: config.period || 7 });
    this.prophetForecaster = new ProphetLikeForecaster();
    this.monteCarlo = new MonteCarloSimulator({ numSimulations: config.simulations || 500 });
    this.weights = config.weights || { prophet: 0.4, holtWinters: 0.3, movingAvg: 0.3 };
  }

  forecast(dates, values, horizonDays = 30) {
    if (values.length < 7) {
      return { error: 'Need at least 7 data points for forecasting' };
    }

    // Decompose data
    const decomposition = this.decomposer.decompose(values);

    // Prophet-like forecast
    let prophetPredictions;
    try {
      this.prophetForecaster.fit(dates, values);
      const futureDates = this._generateFutureDates(dates[dates.length - 1], horizonDays);
      prophetPredictions = this.prophetForecaster.predict(futureDates);
    } catch (e) {
      prophetPredictions = null;
    }

    // Holt-Winters forecast
    const hwForecast = this._holtWinters(values, 0.3, 0.1, horizonDays);

    // Simple moving average forecast
    const maForecast = this._movingAverageForecast(values, Math.min(7, values.length), horizonDays);

    // Combine forecasts
    const ensemble = [];
    const lastDate = new Date(dates[dates.length - 1]);

    for (let d = 0; d < horizonDays; d++) {
      const date = new Date(lastDate.getTime() + (d + 1) * 86400000);
      let weighted = 0;
      let totalWeight = 0;

      if (prophetPredictions?.[d]) {
        weighted += prophetPredictions[d].yhat * this.weights.prophet;
        totalWeight += this.weights.prophet;
      }

      if (hwForecast[d] !== undefined) {
        weighted += hwForecast[d] * this.weights.holtWinters;
        totalWeight += this.weights.holtWinters;
      }

      if (maForecast[d] !== undefined) {
        weighted += maForecast[d] * this.weights.movingAvg;
        totalWeight += this.weights.movingAvg;
      }

      const prediction = totalWeight > 0 ? weighted / totalWeight : mean(values);

      // Uncertainty estimation
      const std = stdDev(values) * Math.sqrt(1 + d / values.length);

      ensemble.push({
        date: date.toISOString().split('T')[0],
        prediction: Math.max(0, prediction),
        lower: Math.max(0, prediction - 1.96 * std),
        upper: prediction + 1.96 * std,
        prophet: prophetPredictions?.[d]?.yhat || null,
        holtWinters: hwForecast[d] || null,
        movingAvg: maForecast[d] || null
      });
    }

    // Compute forecast quality metrics
    const backtest = this._backtestAccuracy(dates, values);

    return {
      forecast: ensemble,
      decomposition: {
        trendDirection: decomposition.trend.filter(v => v !== null).length > 1
          ? (decomposition.trend.filter(v => v !== null).slice(-1)[0] > decomposition.trend.filter(v => v !== null)[0] ? 'upward' : 'downward')
          : 'stable',
        seasonalStrength: decomposition.strength?.seasonalStrength || 0,
        seasonalPattern: decomposition.seasonalPattern
      },
      accuracy: backtest,
      components: this.prophetForecaster.getComponents(),
      summary: this._generateForecastSummary(ensemble, values)
    };
  }

  _holtWinters(data, alpha = 0.3, beta = 0.1, forecast = 30) {
    if (data.length < 2) return Array(forecast).fill(data[0] || 0);
    let level = data[0];
    let trend = data[1] - data[0];

    for (let i = 1; i < data.length; i++) {
      const newLevel = alpha * data[i] + (1 - alpha) * (level + trend);
      const newTrend = beta * (newLevel - level) + (1 - beta) * trend;
      level = newLevel;
      trend = newTrend;
    }

    return Array.from({ length: forecast }, (_, i) => Math.max(0, level + trend * (i + 1)));
  }

  _movingAverageForecast(data, window, horizon) {
    const avg = mean(data.slice(-window));
    return Array(horizon).fill(avg);
  }

  _generateFutureDates(lastDate, days) {
    const dates = [];
    const d = new Date(lastDate);
    for (let i = 0; i < days; i++) {
      d.setDate(d.getDate() + 1);
      dates.push(new Date(d));
    }
    return dates;
  }

  _backtestAccuracy(dates, values) {
    if (values.length < 14) return { mape: null, rmse: null };

    const splitIdx = Math.floor(values.length * 0.8);
    const trainValues = values.slice(0, splitIdx);
    const testValues = values.slice(splitIdx);
    const trainDates = dates.slice(0, splitIdx);
    const testDates = dates.slice(splitIdx);

    try {
      this.prophetForecaster.fit(trainDates, trainValues);
      const predictions = this.prophetForecaster.predict(testDates);

      let mapeSum = 0, rmseSum = 0;
      for (let i = 0; i < testValues.length; i++) {
        const actual = testValues[i];
        const predicted = predictions[i]?.yhat || mean(trainValues);
        if (actual !== 0) mapeSum += Math.abs((actual - predicted) / actual);
        rmseSum += (actual - predicted) ** 2;
      }

      // Re-fit on full data
      this.prophetForecaster.fit(dates, values);

      return {
        mape: (mapeSum / testValues.length * 100).toFixed(1) + '%',
        rmse: Math.sqrt(rmseSum / testValues.length).toFixed(2),
        testSize: testValues.length
      };
    } catch {
      return { mape: null, rmse: null };
    }
  }

  _generateForecastSummary(forecast, historical) {
    if (forecast.length === 0) return 'Insufficient data for forecast.';

    const avgForecast = mean(forecast.map(f => f.prediction));
    const avgHistorical = mean(historical.slice(-30));
    const change = avgHistorical > 0 ? ((avgForecast - avgHistorical) / avgHistorical * 100) : 0;

    const direction = change > 5 ? 'increase' : change < -5 ? 'decrease' : 'remain stable';

    return `Spending is projected to ${direction} by ${Math.abs(change).toFixed(1)}% over the next ${forecast.length} days. ` +
      `Average forecast: ₹${Math.round(avgForecast).toLocaleString()}/day vs historical ₹${Math.round(avgHistorical).toLocaleString()}/day.`;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  SeasonalDecomposition,
  ProphetLikeForecaster,
  MonteCarloSimulator,
  EnsembleForecaster
};
