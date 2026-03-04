// ============================================================================
// AI Self-Learning Pipeline — Autonomous Model Training & Improvement
// ============================================================================
// Continuously learns from user's financial data to improve:
//  - Transaction categorization accuracy
//  - Spending pattern prediction
//  - Anomaly detection sensitivity
//  - Personalized recommendation quality
//  - Budget optimization suggestions
//
// Runs locally — no data leaves the server. Models persist in MongoDB.
// ============================================================================

const Transaction = require('../../models/Transaction');
const Budget = require('../../models/Budget');
const EMI = require('../../models/EMI');
const logger = require('../../utils/logger');

// ─── Feature Extraction ─────────────────────────────────────────────
class FeatureExtractor {
  /**
   * Extract numerical features from a transaction for ML processing
   */
  static extractTransactionFeatures(txn) {
    const date = new Date(txn.date || Date.now());
    const desc = (txn.description || '').toLowerCase();
    const amt = txn.amount || 0;

    return {
      // Temporal features
      dayOfWeek: date.getDay(),
      dayOfMonth: date.getDate(),
      month: date.getMonth(),
      hour: date.getHours(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6 ? 1 : 0,
      isMonthEnd: date.getDate() >= 25 ? 1 : 0,
      isMonthStart: date.getDate() <= 5 ? 1 : 0,

      // Amount features
      amount: amt,
      amountLog: amt > 0 ? Math.log10(amt) : 0,
      amountBucket: amt < 100 ? 0 : amt < 500 ? 1 : amt < 1000 ? 2 : amt < 5000 ? 3 : amt < 10000 ? 4 : 5,

      // Text features (bag of keywords)
      hasFood: /food|swiggy|zomato|restaurant|cafe|pizza|biryani|burger|dining/i.test(desc) ? 1 : 0,
      hasTransport: /uber|ola|metro|bus|train|petrol|fuel|parking|toll|rapido/i.test(desc) ? 1 : 0,
      hasShopping: /amazon|flipkart|myntra|shopping|mall|store|purchase/i.test(desc) ? 1 : 0,
      hasUtility: /electricity|water|gas|broadband|wifi|recharge|mobile|internet/i.test(desc) ? 1 : 0,
      hasHealth: /hospital|doctor|pharmacy|medicine|medical|health|lab/i.test(desc) ? 1 : 0,
      hasEntertainment: /netflix|spotify|hotstar|movie|game|subscription|gym/i.test(desc) ? 1 : 0,
      hasRent: /rent|maintenance|society|apartment|housing/i.test(desc) ? 1 : 0,
      hasEducation: /school|college|tuition|course|udemy|book|education/i.test(desc) ? 1 : 0,
      hasTransfer: /transfer|upi|neft|imps|rtgs|paid to|received from/i.test(desc) ? 1 : 0,
      hasInvestment: /invest|mutual|sip|stock|share|zerodha|groww|fd|ppf/i.test(desc) ? 1 : 0,
      hasInsurance: /insurance|lic|policy|premium/i.test(desc) ? 1 : 0,
      hasEMI: /emi|loan|installment/i.test(desc) ? 1 : 0,

      // Description length
      descLength: desc.length,
      wordCount: desc.split(/\s+/).length,
    };
  }

  /**
   * Extract spending pattern features for a user over a period
   */
  static extractSpendingPattern(transactions) {
    if (!transactions || transactions.length === 0) {
      return { avgDaily: 0, stdDev: 0, trend: 0, volatility: 0, categories: 0, regularity: 0 };
    }

    const expenses = transactions.filter(t => t.type === 'expense');
    const amounts = expenses.map(t => t.amount || 0);

    if (amounts.length === 0) {
      return { avgDaily: 0, stdDev: 0, trend: 0, volatility: 0, categories: 0, regularity: 0 };
    }

    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    // Category diversity
    const cats = new Set(expenses.map(t => t.category || 'other'));

    // Spending regularity (coefficient of variation)
    const cv = mean > 0 ? stdDev / mean : 0;

    // Trend (linear regression slope normalized)
    let trend = 0;
    if (amounts.length >= 3) {
      const n = amounts.length;
      let sx = 0, sy = 0, sxy = 0, sx2 = 0;
      for (let i = 0; i < n; i++) {
        sx += i; sy += amounts[i]; sxy += i * amounts[i]; sx2 += i * i;
      }
      const slope = (n * sxy - sx * sy) / (n * sx2 - sx * sx);
      trend = mean > 0 ? slope / mean : 0;
    }

    return {
      avgDaily: mean,
      stdDev,
      trend: Math.round(trend * 1000) / 1000,
      volatility: Math.round(cv * 100) / 100,
      categories: cats.size,
      regularity: Math.round((1 - Math.min(1, cv)) * 100),
    };
  }
}

// ─── Naive Bayes Classifier ─────────────────────────────────────────
class NaiveBayesClassifier {
  constructor() {
    this.classCounts = {};
    this.featureSums = {};
    this.featureSqSums = {};
    this.totalSamples = 0;
    this.classes = [];
  }

  train(features, label) {
    if (!this.classCounts[label]) {
      this.classCounts[label] = 0;
      this.featureSums[label] = {};
      this.featureSqSums[label] = {};
      this.classes.push(label);
    }

    this.classCounts[label]++;
    this.totalSamples++;

    Object.entries(features).forEach(([key, value]) => {
      if (typeof value !== 'number') return;
      this.featureSums[label][key] = (this.featureSums[label][key] || 0) + value;
      this.featureSqSums[label][key] = (this.featureSqSums[label][key] || 0) + value * value;
    });
  }

  predict(features) {
    if (this.totalSamples === 0) return { label: 'other', confidence: 0 };

    let bestLabel = 'other';
    let bestLogProb = -Infinity;
    const scores = {};

    this.classes.forEach(cls => {
      const count = this.classCounts[cls];
      let logProb = Math.log(count / this.totalSamples); // Prior

      Object.entries(features).forEach(([key, value]) => {
        if (typeof value !== 'number') return;
        const sum = this.featureSums[cls]?.[key] || 0;
        const sqSum = this.featureSqSums[cls]?.[key] || 0;
        const mean = count > 0 ? sum / count : 0;
        const variance = count > 1 ? (sqSum / count - mean * mean) : 1;
        const std = Math.sqrt(Math.max(variance, 0.01));

        // Gaussian probability
        const exponent = -0.5 * Math.pow((value - mean) / std, 2);
        const prob = Math.log(1 / (std * Math.sqrt(2 * Math.PI))) + exponent;
        logProb += prob;
      });

      scores[cls] = logProb;
      if (logProb > bestLogProb) {
        bestLogProb = logProb;
        bestLabel = cls;
      }
    });

    // Convert to confidence (softmax-like)
    const maxScore = Math.max(...Object.values(scores));
    const expSum = Object.values(scores).reduce((s, v) => s + Math.exp(v - maxScore), 0);
    const confidence = expSum > 0 ? Math.exp(bestLogProb - maxScore) / expSum : 0;

    return { label: bestLabel, confidence: Math.round(confidence * 100) / 100, scores };
  }

  serialize() {
    return {
      classCounts: this.classCounts,
      featureSums: this.featureSums,
      featureSqSums: this.featureSqSums,
      totalSamples: this.totalSamples,
      classes: this.classes,
    };
  }

  deserialize(data) {
    if (!data) return;
    this.classCounts = data.classCounts || {};
    this.featureSums = data.featureSums || {};
    this.featureSqSums = data.featureSqSums || {};
    this.totalSamples = data.totalSamples || 0;
    this.classes = data.classes || [];
  }
}

// ─── Anomaly Detector ───────────────────────────────────────────────
class AnomalyDetector {
  constructor() {
    this.categoryStats = {};
    this.globalStats = { mean: 0, stdDev: 0, count: 0 };
  }

  train(transactions) {
    const expenses = transactions.filter(t => t.type === 'expense' && t.amount > 0);
    if (expenses.length < 5) return;

    // Global stats
    const amounts = expenses.map(t => t.amount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / amounts.length;
    this.globalStats = { mean, stdDev: Math.sqrt(variance), count: amounts.length };

    // Per-category stats
    this.categoryStats = {};
    expenses.forEach(t => {
      const cat = t.category || 'other';
      if (!this.categoryStats[cat]) this.categoryStats[cat] = { amounts: [] };
      this.categoryStats[cat].amounts.push(t.amount);
    });

    Object.entries(this.categoryStats).forEach(([cat, data]) => {
      const m = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length;
      const v = data.amounts.reduce((s, a) => s + Math.pow(a - m, 2), 0) / data.amounts.length;
      this.categoryStats[cat] = {
        mean: m,
        stdDev: Math.sqrt(v),
        count: data.amounts.length,
        min: Math.min(...data.amounts),
        max: Math.max(...data.amounts),
        p95: this._percentile(data.amounts, 95),
      };
    });
  }

  detect(transaction) {
    const amt = transaction.amount || 0;
    const cat = transaction.category || 'other';
    const stats = this.categoryStats[cat] || this.globalStats;

    if (stats.count < 3 || stats.stdDev === 0) return { isAnomaly: false };

    const zScore = (amt - stats.mean) / stats.stdDev;
    const isAnomaly = Math.abs(zScore) > 2;
    const severity = Math.abs(zScore) > 3 ? 'high' : Math.abs(zScore) > 2 ? 'medium' : 'low';

    return {
      isAnomaly,
      zScore: Math.round(zScore * 100) / 100,
      severity,
      expectedRange: {
        low: Math.max(0, Math.round(stats.mean - stats.stdDev)),
        high: Math.round(stats.mean + stats.stdDev),
      },
      categoryMean: Math.round(stats.mean),
      message: isAnomaly
        ? `This ₹${amt.toLocaleString('en-IN')} ${cat} transaction is ${zScore > 0 ? 'unusually high' : 'unusually low'} (${Math.abs(zScore).toFixed(1)} std devs from average ₹${Math.round(stats.mean).toLocaleString('en-IN')})`
        : null,
    };
  }

  _percentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil(p / 100 * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }

  serialize() {
    return { categoryStats: this.categoryStats, globalStats: this.globalStats };
  }

  deserialize(data) {
    if (!data) return;
    this.categoryStats = data.categoryStats || {};
    this.globalStats = data.globalStats || { mean: 0, stdDev: 0, count: 0 };
  }
}

// ─── Spending Predictor ─────────────────────────────────────────────
class SpendingPredictor {
  constructor() {
    this.monthlyHistory = [];
    this.categoryHistory = {};
    this.dayOfWeekWeights = new Array(7).fill(1);
    this.seasonalFactors = new Array(12).fill(1);
  }

  train(transactions) {
    const expenses = transactions.filter(t => t.type === 'expense' && t.amount > 0);
    if (expenses.length < 10) return;

    // Monthly totals
    const monthly = {};
    const catMonthly = {};
    expenses.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthly[key] = (monthly[key] || 0) + t.amount;

      const cat = t.category || 'other';
      if (!catMonthly[cat]) catMonthly[cat] = {};
      catMonthly[cat][key] = (catMonthly[cat][key] || 0) + t.amount;
    });

    this.monthlyHistory = Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({ month, total }));

    this.categoryHistory = {};
    Object.entries(catMonthly).forEach(([cat, data]) => {
      this.categoryHistory[cat] = Object.entries(data)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, total]) => ({ month, total }));
    });

    // Day of week weights
    const dayTotals = new Array(7).fill(0);
    const dayCounts = new Array(7).fill(0);
    expenses.forEach(t => {
      const day = new Date(t.date).getDay();
      dayTotals[day] += t.amount;
      dayCounts[day]++;
    });
    const avgAll = expenses.reduce((s, t) => s + t.amount, 0) / expenses.length;
    this.dayOfWeekWeights = dayTotals.map((total, i) => {
      const avg = dayCounts[i] > 0 ? total / dayCounts[i] : avgAll;
      return avgAll > 0 ? avg / avgAll : 1;
    });

    // Seasonal factors
    const monthTotals = new Array(12).fill(0);
    const monthCounts = new Array(12).fill(0);
    expenses.forEach(t => {
      const m = new Date(t.date).getMonth();
      monthTotals[m] += t.amount;
      monthCounts[m]++;
    });
    const overallAvg = monthTotals.reduce((a, b) => a + b, 0) / 12;
    this.seasonalFactors = monthTotals.map((total, i) => {
      return overallAvg > 0 && monthCounts[i] > 0 ? (total / monthCounts[i]) / (overallAvg / Math.max(1, ...monthCounts)) : 1;
    });
  }

  predict(months = 3) {
    if (this.monthlyHistory.length < 2) return [];

    // Exponential smoothing
    const values = this.monthlyHistory.map(h => h.total);
    const alpha = 0.3;
    let level = values[0];
    let trend = values.length > 1 ? (values[1] - values[0]) : 0;

    // Holt's method (double exponential smoothing)
    const beta = 0.1;
    for (let i = 1; i < values.length; i++) {
      const prevLevel = level;
      level = alpha * values[i] + (1 - alpha) * (level + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
    }

    const predictions = [];
    const now = new Date();
    for (let i = 1; i <= months; i++) {
      const futureDate = new Date(now);
      futureDate.setMonth(futureDate.getMonth() + i);
      const monthKey = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;
      const seasonalFactor = this.seasonalFactors[futureDate.getMonth()] || 1;

      const predicted = Math.max(0, Math.round((level + trend * i) * seasonalFactor));
      const uncertainty = Math.round(predicted * 0.15 * Math.sqrt(i));

      predictions.push({
        month: monthKey,
        predicted,
        lower: Math.max(0, predicted - uncertainty),
        upper: predicted + uncertainty,
        confidence: Math.max(50, Math.round(100 - i * 8)),
        seasonalFactor: Math.round(seasonalFactor * 100) / 100,
      });
    }

    return predictions;
  }

  predictByCategory(months = 3) {
    const result = {};
    Object.entries(this.categoryHistory).forEach(([cat, history]) => {
      if (history.length < 2) return;
      const values = history.map(h => h.total);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const last = values[values.length - 1] || avg;
      const trend = values.length >= 3 ? (last - values[0]) / values.length : 0;

      result[cat] = [];
      for (let i = 1; i <= months; i++) {
        result[cat].push({
          month: i,
          predicted: Math.max(0, Math.round(last + trend * i)),
        });
      }
    });
    return result;
  }

  serialize() {
    return {
      monthlyHistory: this.monthlyHistory,
      categoryHistory: this.categoryHistory,
      dayOfWeekWeights: this.dayOfWeekWeights,
      seasonalFactors: this.seasonalFactors,
    };
  }

  deserialize(data) {
    if (!data) return;
    this.monthlyHistory = data.monthlyHistory || [];
    this.categoryHistory = data.categoryHistory || {};
    this.dayOfWeekWeights = data.dayOfWeekWeights || new Array(7).fill(1);
    this.seasonalFactors = data.seasonalFactors || new Array(12).fill(1);
  }
}

// ─── Recommendation Engine ──────────────────────────────────────────
class RecommendationEngine {
  constructor() {
    this.rules = [];
    this.userProfile = {};
  }

  analyze(context) {
    const { spending, income, savings, categories, emis, goals } = context;
    const recommendations = [];

    // Rule 1: Savings rate
    const savingsRate = income > 0 ? ((income - spending) / income * 100) : 0;
    if (savingsRate < 10) {
      recommendations.push({
        id: 'low_savings',
        priority: 'critical',
        category: 'savings',
        title: 'Critical: Very Low Savings Rate',
        description: `Your savings rate is only ${savingsRate.toFixed(1)}%. You need at least 20% for financial security.`,
        actionItems: [
          'Review and cancel unused subscriptions',
          'Set up automatic savings of 10% of income',
          'Use the 50/30/20 budget rule',
          'Track every expense for 2 weeks to find leaks',
        ],
        potentialImpact: Math.round(income * 0.1),
        timeframe: 'immediate',
      });
    } else if (savingsRate < 20) {
      recommendations.push({
        id: 'moderate_savings',
        priority: 'high',
        category: 'savings',
        title: 'Increase Savings Rate',
        description: `Your savings rate of ${savingsRate.toFixed(1)}% is below the recommended 20%.`,
        actionItems: [
          'Increase automatic savings by ₹1,000/month',
          'Find 2-3 expenses to reduce by 20%',
          'Consider switching to cheaper alternatives',
        ],
        potentialImpact: Math.round((0.2 - savingsRate / 100) * income),
        timeframe: '1-3 months',
      });
    }

    // Rule 2: High spending categories
    if (categories && Object.keys(categories).length > 0) {
      const totalSpend = Object.values(categories).reduce((a, b) => a + b, 0);
      const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);

      sorted.forEach(([cat, amount]) => {
        const pct = totalSpend > 0 ? (amount / totalSpend * 100) : 0;
        if (pct > 35) {
          recommendations.push({
            id: `high_${cat}`,
            priority: 'high',
            category: 'spending',
            title: `Reduce ${cat} Spending`,
            description: `${cat} takes ${pct.toFixed(0)}% of your budget (₹${amount.toLocaleString('en-IN')}).`,
            actionItems: this._getCategoryTips(cat),
            potentialImpact: Math.round(amount * 0.2),
            timeframe: '1-2 months',
          });
        }
      });
    }

    // Rule 3: EMI burden
    if (emis && emis.length > 0) {
      const totalEmi = emis.reduce((s, e) => s + (e.emiAmount || 0), 0);
      const emiRatio = income > 0 ? (totalEmi / income * 100) : 0;
      if (emiRatio > 40) {
        recommendations.push({
          id: 'high_emi',
          priority: 'critical',
          category: 'debt',
          title: 'EMI Burden Too High',
          description: `EMIs consume ${emiRatio.toFixed(0)}% of your income (₹${totalEmi.toLocaleString('en-IN')}).`,
          actionItems: [
            'Prioritize paying off highest-interest EMIs first',
            'Consider refinancing at lower rates',
            'Avoid new credit card EMIs',
            'Look into EMI foreclosure for small remaining balances',
          ],
          potentialImpact: totalEmi,
          timeframe: '3-12 months',
        });
      }
    }

    // Rule 4: No emergency fund
    if (savingsRate < 5 && income > 0) {
      recommendations.push({
        id: 'emergency_fund',
        priority: 'high',
        category: 'safety',
        title: 'Build Emergency Fund',
        description: 'You need 3-6 months of expenses saved for emergencies.',
        actionItems: [
          `Target: ₹${Math.round(spending * 3).toLocaleString('en-IN')} minimum`,
          'Start with ₹1,000/month in a liquid fund',
          'Keep emergency fund in a high-interest savings account',
          'Do not invest emergency fund in stocks',
        ],
        potentialImpact: Math.round(spending * 3),
        timeframe: '6-12 months',
      });
    }

    // Rule 5: Investment opportunity
    if (savingsRate > 25 && income > spending * 1.3) {
      recommendations.push({
        id: 'invest_surplus',
        priority: 'medium',
        category: 'investment',
        title: 'Invest Your Surplus',
        description: `You have ₹${Math.round(income - spending).toLocaleString('en-IN')} surplus. Consider investing.`,
        actionItems: [
          'Start SIP in a diversified index fund',
          'Max out PPF contribution (₹1.5L/year)',
          'Consider ELSS for tax benefits',
          'Explore NPS for additional tax savings',
        ],
        potentialImpact: Math.round((income - spending) * 12 * 0.12),
        timeframe: 'ongoing',
      });
    }

    return recommendations.sort((a, b) => {
      const pri = { critical: 4, high: 3, medium: 2, low: 1 };
      return (pri[b.priority] || 0) - (pri[a.priority] || 0);
    });
  }

  _getCategoryTips(category) {
    const tips = {
      food: ['Meal prep on weekends', 'Set daily food budget of ₹300-500', 'Cook at home 4+ days/week', 'Use Zomato/Swiggy only on weekends'],
      dining: ['Limit dining out to 2x/week', 'Look for restaurant deals', 'Cook at home more often'],
      transport: ['Use public transport 3x/week', 'Carpool with colleagues', 'Consider an electric vehicle for savings'],
      shopping: ['Wait 48 hours before buying', 'Use price comparison tools', 'Unsubscribe from shopping emails', 'Set monthly shopping budget'],
      entertainment: ['Audit all subscriptions', 'Share streaming accounts', 'Find free entertainment options'],
      utilities: ['Switch to LED bulbs', 'Use energy-efficient appliances', 'Compare internet/phone plans'],
    };
    return tips[category.toLowerCase()] || ['Track spending daily', 'Set a category budget', 'Look for cheaper alternatives'];
  }

  serialize() { return { rules: this.rules, userProfile: this.userProfile }; }
  deserialize(data) {
    if (!data) return;
    this.rules = data.rules || [];
    this.userProfile = data.userProfile || {};
  }
}

// ─── Main Pipeline ──────────────────────────────────────────────────
class SelfLearningPipeline {
  constructor() {
    this.classifier = new NaiveBayesClassifier();
    this.anomalyDetector = new AnomalyDetector();
    this.spendingPredictor = new SpendingPredictor();
    this.recommendationEngine = new RecommendationEngine();
    this.featureExtractor = FeatureExtractor;

    this.metadata = {
      lastTrainedAt: null,
      trainingSamples: 0,
      accuracy: 0,
      version: '2.0.0',
      trainingRuns: 0,
    };

    this.isTraining = false;
  }

  /**
   * Full training pipeline — call periodically or on-demand
   */
  async train(userId) {
    if (this.isTraining) {
      return { status: 'already_training', message: 'Training is already in progress' };
    }

    this.isTraining = true;
    const startTime = Date.now();

    try {
      logger.info(`[SelfLearning] Starting training for user ${userId}`);

      // 1. Fetch training data
      const transactions = await Transaction.find({ userId })
        .sort({ date: -1 })
        .limit(2000)
        .lean();

      if (transactions.length < 10) {
        this.isTraining = false;
        return { status: 'insufficient_data', message: 'Need at least 10 transactions to train', count: transactions.length };
      }

      // 2. Train categorizer
      const labeled = transactions.filter(t => t.category && t.category !== 'other' && t.category !== 'uncategorized');
      labeled.forEach(txn => {
        const features = FeatureExtractor.extractTransactionFeatures(txn);
        this.classifier.train(features, txn.category);
      });

      // 3. Train anomaly detector
      this.anomalyDetector.train(transactions);

      // 4. Train spending predictor
      this.spendingPredictor.train(transactions);

      // 5. Evaluate accuracy (cross-validation on last 20%)
      let correct = 0;
      let total = 0;
      const testSet = labeled.slice(0, Math.ceil(labeled.length * 0.2));
      testSet.forEach(txn => {
        const features = FeatureExtractor.extractTransactionFeatures(txn);
        const prediction = this.classifier.predict(features);
        if (prediction.label === txn.category) correct++;
        total++;
      });

      const accuracy = total > 0 ? Math.round(correct / total * 100) : 0;

      // 6. Update metadata
      this.metadata = {
        lastTrainedAt: new Date(),
        trainingSamples: transactions.length,
        labeledSamples: labeled.length,
        accuracy,
        version: '2.0.0',
        trainingRuns: (this.metadata.trainingRuns || 0) + 1,
        trainingTimeMs: Date.now() - startTime,
        classCount: this.classifier.classes.length,
        classes: this.classifier.classes,
      };

      logger.info(`[SelfLearning] Training complete: ${accuracy}% accuracy, ${labeled.length} labeled samples, ${Date.now() - startTime}ms`);

      this.isTraining = false;
      return {
        status: 'success',
        message: 'Training completed successfully',
        metadata: this.metadata,
      };
    } catch (error) {
      this.isTraining = false;
      logger.error('[SelfLearning] Training error:', error);
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Classify a new transaction
   */
  categorize(description, amount) {
    const features = FeatureExtractor.extractTransactionFeatures({
      description,
      amount,
      date: new Date(),
    });
    return this.classifier.predict(features);
  }

  /**
   * Check if a transaction is anomalous
   */
  checkAnomaly(transaction) {
    return this.anomalyDetector.detect(transaction);
  }

  /**
   * Get spending predictions
   */
  getPredictions(months = 3) {
    return {
      monthly: this.spendingPredictor.predict(months),
      byCategory: this.spendingPredictor.predictByCategory(months),
    };
  }

  /**
   * Get recommendations
   */
  async getRecommendations(userId) {
    try {
      const [transactions, emis] = await Promise.all([
        Transaction.find({ userId }).sort({ date: -1 }).limit(500).lean(),
        EMI.find({ userId, status: 'active' }).lean().catch(() => []),
      ]);

      const expenses = transactions.filter(t => t.type === 'expense');
      const income = transactions.filter(t => t.type === 'income');

      const totalSpending = expenses.reduce((s, t) => s + (t.amount || 0), 0);
      const totalIncome = income.reduce((s, t) => s + (t.amount || 0), 0);

      const categories = {};
      expenses.forEach(t => {
        const cat = t.category || 'other';
        categories[cat] = (categories[cat] || 0) + (t.amount || 0);
      });

      return this.recommendationEngine.analyze({
        spending: totalSpending,
        income: totalIncome,
        savings: totalIncome - totalSpending,
        categories,
        emis,
        goals: [],
      });
    } catch (error) {
      logger.error('[SelfLearning] Recommendations error:', error);
      return [];
    }
  }

  /**
   * Get pipeline status
   */
  getStatus() {
    return {
      ...this.metadata,
      isTraining: this.isTraining,
      models: {
        classifier: { classes: this.classifier.classes.length, samples: this.classifier.totalSamples },
        anomalyDetector: { categories: Object.keys(this.anomalyDetector.categoryStats).length },
        spendingPredictor: { monthsOfHistory: this.spendingPredictor.monthlyHistory.length },
      },
    };
  }

  /**
   * Serialize all models for persistence
   */
  serialize() {
    return {
      classifier: this.classifier.serialize(),
      anomalyDetector: this.anomalyDetector.serialize(),
      spendingPredictor: this.spendingPredictor.serialize(),
      recommendationEngine: this.recommendationEngine.serialize(),
      metadata: this.metadata,
    };
  }

  /**
   * Restore from persisted state
   */
  deserialize(data) {
    if (!data) return;
    this.classifier.deserialize(data.classifier);
    this.anomalyDetector.deserialize(data.anomalyDetector);
    this.spendingPredictor.deserialize(data.spendingPredictor);
    this.recommendationEngine.deserialize(data.recommendationEngine);
    if (data.metadata) this.metadata = data.metadata;
  }
}

// Export singleton per-user cache
const userPipelines = new Map();

function getPipeline(userId) {
  const key = userId.toString();
  if (!userPipelines.has(key)) {
    userPipelines.set(key, new SelfLearningPipeline());
  }
  return userPipelines.get(key);
}

module.exports = {
  SelfLearningPipeline,
  FeatureExtractor,
  NaiveBayesClassifier,
  AnomalyDetector,
  SpendingPredictor,
  RecommendationEngine,
  getPipeline,
};
