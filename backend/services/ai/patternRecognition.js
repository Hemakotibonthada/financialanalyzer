// ============================================================================
// Spending Pattern Recognition — ML-Based Behavioral Analysis
// ============================================================================
// Advanced pattern detection using:
//  - K-Means clustering for spending behavior segmentation
//  - Recurring transaction detection with frequency analysis
//  - Merchant loyalty scoring
//  - Impulse vs planned purchase classification
//  - Lifestyle inflation detection
//  - Spending velocity anomaly tracking
//  - Time-series decomposition (trend + seasonal + residual)
// ============================================================================

const Transaction = require('../../models/Transaction');
const logger = require('../../utils/logger');

// ─── K-Means Clustering ──────────────────────────────────────────────
class KMeansClusterer {
  constructor(k = 4, maxIterations = 50) {
    this.k = k;
    this.maxIterations = maxIterations;
    this.centroids = [];
    this.labels = [];
  }

  fit(data) {
    if (data.length < this.k) return { clusters: [], centroids: [] };

    // Initialize centroids using k-means++
    this.centroids = this._initCentroids(data);

    for (let iter = 0; iter < this.maxIterations; iter++) {
      // Assign points to nearest centroid
      this.labels = data.map(point => this._nearestCentroid(point));

      // Update centroids
      const newCentroids = this._computeCentroids(data);
      
      // Check convergence
      const moved = newCentroids.some((c, i) => 
        Object.keys(c).some(k => Math.abs(c[k] - (this.centroids[i]?.[k] || 0)) > 0.001)
      );

      this.centroids = newCentroids;
      if (!moved) break;
    }

    // Build cluster summary
    const clusters = Array.from({ length: this.k }, () => ({ points: [], center: null }));
    data.forEach((point, i) => {
      const label = this.labels[i];
      if (label < clusters.length) clusters[label].points.push(point);
    });
    clusters.forEach((c, i) => { c.center = this.centroids[i]; c.size = c.points.length; });

    return { clusters, centroids: this.centroids, labels: this.labels };
  }

  _initCentroids(data) {
    const centroids = [data[Math.floor(Math.random() * data.length)]];
    while (centroids.length < this.k) {
      const distances = data.map(p => Math.min(...centroids.map(c => this._distance(p, c))));
      const totalDist = distances.reduce((a, b) => a + b, 0);
      let r = Math.random() * totalDist;
      for (let i = 0; i < data.length; i++) {
        r -= distances[i];
        if (r <= 0) { centroids.push(data[i]); break; }
      }
    }
    return centroids;
  }

  _nearestCentroid(point) {
    let minDist = Infinity, label = 0;
    this.centroids.forEach((c, i) => {
      const d = this._distance(point, c);
      if (d < minDist) { minDist = d; label = i; }
    });
    return label;
  }

  _computeCentroids(data) {
    return Array.from({ length: this.k }, (_, i) => {
      const clusterPoints = data.filter((_, j) => this.labels[j] === i);
      if (clusterPoints.length === 0) return this.centroids[i];
      
      const centroid = {};
      const keys = Object.keys(clusterPoints[0]);
      keys.forEach(key => {
        if (typeof clusterPoints[0][key] === 'number') {
          centroid[key] = clusterPoints.reduce((s, p) => s + p[key], 0) / clusterPoints.length;
        }
      });
      return centroid;
    });
  }

  _distance(a, b) {
    let sum = 0;
    const keys = Object.keys(a).filter(k => typeof a[k] === 'number' && typeof b[k] === 'number');
    keys.forEach(k => { sum += Math.pow((a[k] || 0) - (b[k] || 0), 2); });
    return Math.sqrt(sum);
  }
}

// ─── Recurring Transaction Detector ──────────────────────────────────
class RecurringDetector {
  detect(transactions) {
    // Group by merchant/description similarity
    const groups = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const key = this._normalizeDescription(t.description || t.merchant || '');
      if (!key) return;
      if (!groups[key]) groups[key] = [];
      groups[key].push({ amount: t.amount, date: new Date(t.date), id: t._id });
    });

    const recurring = [];

    Object.entries(groups).forEach(([description, txns]) => {
      if (txns.length < 2) return;

      // Sort by date
      txns.sort((a, b) => a.date - b.date);

      // Calculate intervals
      const intervals = [];
      for (let i = 1; i < txns.length; i++) {
        intervals.push((txns[i].date - txns[i - 1].date) / (1000 * 60 * 60 * 24));
      }

      if (intervals.length === 0) return;

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((s, i) => s + Math.pow(i - avgInterval, 2), 0) / intervals.length;
      const cv = avgInterval > 0 ? Math.sqrt(variance) / avgInterval : 1;

      // Determine frequency
      let frequency = 'irregular';
      let confidence = 0;

      if (cv < 0.3) {
        if (avgInterval >= 25 && avgInterval <= 35) { frequency = 'monthly'; confidence = 0.9; }
        else if (avgInterval >= 6 && avgInterval <= 8) { frequency = 'weekly'; confidence = 0.85; }
        else if (avgInterval >= 13 && avgInterval <= 16) { frequency = 'biweekly'; confidence = 0.85; }
        else if (avgInterval >= 85 && avgInterval <= 100) { frequency = 'quarterly'; confidence = 0.8; }
        else if (avgInterval >= 355 && avgInterval <= 375) { frequency = 'annual'; confidence = 0.8; }
        else { frequency = `every ${Math.round(avgInterval)} days`; confidence = 0.6; }
      } else if (cv < 0.5) {
        confidence = 0.5;
        if (avgInterval >= 25 && avgInterval <= 35) frequency = 'roughly_monthly';
      }

      if (confidence >= 0.5) {
        const amounts = txns.map(t => t.amount);
        const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const amountVariance = amounts.reduce((s, a) => s + Math.pow(a - avgAmount, 2), 0) / amounts.length;
        const amountStable = Math.sqrt(amountVariance) / avgAmount < 0.1;

        // Predict next occurrence
        const lastDate = txns[txns.length - 1].date;
        const nextDate = new Date(lastDate.getTime() + avgInterval * 24 * 60 * 60 * 1000);

        recurring.push({
          description,
          frequency,
          confidence: Math.round(confidence * 100) / 100,
          occurrences: txns.length,
          avgAmount: Math.round(avgAmount),
          amountStable,
          avgIntervalDays: Math.round(avgInterval),
          lastOccurrence: lastDate,
          nextExpected: nextDate,
          annualCost: Math.round(avgAmount * (365 / avgInterval)),
          isSubscription: amountStable && frequency === 'monthly',
        });
      }
    });

    return recurring.sort((a, b) => b.annualCost - a.annualCost);
  }

  _normalizeDescription(desc) {
    return desc.toLowerCase()
      .replace(/[0-9#]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/ref|upi|neft|imps|txn|transaction|payment/gi, '')
      .trim()
      .substring(0, 30);
  }
}

// ─── Impulse Purchase Detector ───────────────────────────────────────
class ImpulseDetector {
  analyze(transactions) {
    const expenses = transactions.filter(t => t.type === 'expense');
    if (expenses.length < 10) return { impulseRate: 0, impulseTransactions: [], planned: [] };

    // Calculate baseline per day-of-week and time
    const baseline = this._buildBaseline(expenses);

    const impulse = [];
    const planned = [];

    expenses.forEach(t => {
      const score = this._impulseScore(t, baseline);
      const item = {
        _id: t._id,
        amount: t.amount,
        description: t.description,
        category: t.category,
        date: t.date,
        impulseScore: score,
      };

      if (score >= 0.6) impulse.push(item);
      else planned.push(item);
    });

    const totalImpulse = impulse.reduce((s, t) => s + (t.amount || 0), 0);
    const totalExpense = expenses.reduce((s, t) => s + (t.amount || 0), 0);

    return {
      impulseRate: totalExpense > 0 ? Math.round(totalImpulse / totalExpense * 100) : 0,
      impulseTotal: Math.round(totalImpulse),
      impulseCount: impulse.length,
      plannedCount: planned.length,
      impulseTransactions: impulse.sort((a, b) => b.impulseScore - a.impulseScore).slice(0, 20),
      topImpulseCategories: this._categorize(impulse),
      savingsPotential: Math.round(totalImpulse * 0.5), // If they cut impulse by 50%
    };
  }

  _buildBaseline(expenses) {
    const byHour = new Array(24).fill(0).map(() => ({ total: 0, count: 0 }));
    const byDow = new Array(7).fill(0).map(() => ({ total: 0, count: 0 }));
    const byCat = {};

    expenses.forEach(t => {
      const d = new Date(t.date);
      const h = d.getHours();
      const dow = d.getDay();
      const cat = t.category || 'other';

      byHour[h].total += t.amount || 0;
      byHour[h].count++;
      byDow[dow].total += t.amount || 0;
      byDow[dow].count++;
      if (!byCat[cat]) byCat[cat] = { total: 0, count: 0 };
      byCat[cat].total += t.amount || 0;
      byCat[cat].count++;
    });

    return { byHour, byDow, byCat };
  }

  _impulseScore(txn, baseline) {
    let score = 0;
    const d = new Date(txn.date);
    const hour = d.getHours();
    const dow = d.getDay();
    const cat = (txn.category || 'other').toLowerCase();
    const amt = txn.amount || 0;

    // Late night purchases (10pm-4am) are more likely impulse
    if (hour >= 22 || hour <= 4) score += 0.2;

    // Weekend spending tends to be more impulsive
    if (dow === 0 || dow === 6) score += 0.1;

    // Shopping/entertainment/dining categories
    const impulsiveCategories = ['shopping', 'entertainment', 'dining', 'food', 'gift', 'personal'];
    if (impulsiveCategories.includes(cat)) score += 0.2;

    // Amount significantly above average for category
    const catBaseline = baseline.byCat[cat];
    if (catBaseline && catBaseline.count > 0) {
      const catAvg = catBaseline.total / catBaseline.count;
      if (amt > catAvg * 2) score += 0.2;
      else if (amt > catAvg * 1.5) score += 0.1;
    }

    // Small transactions are often impulse
    if (amt < 500 && impulsiveCategories.includes(cat)) score += 0.1;

    return Math.min(1, score);
  }

  _categorize(transactions) {
    const cats = {};
    transactions.forEach(t => {
      const cat = t.category || 'other';
      if (!cats[cat]) cats[cat] = { count: 0, total: 0 };
      cats[cat].count++;
      cats[cat].total += t.amount || 0;
    });
    return Object.entries(cats)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  }
}

// ─── Lifestyle Inflation Detector ────────────────────────────────────
class LifestyleInflationDetector {
  async detect(userId, months = 12) {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const transactions = await Transaction.find({ userId, date: { $gte: since } }).sort({ date: 1 }).lean();

    // Monthly spending by category
    const monthlyData = {};
    transactions.forEach(t => {
      const key = new Date(t.date).toISOString().substring(0, 7);
      if (!monthlyData[key]) monthlyData[key] = { income: 0, expense: 0, categories: {} };
      if (t.type === 'income') monthlyData[key].income += t.amount || 0;
      else {
        monthlyData[key].expense += t.amount || 0;
        const cat = t.category || 'other';
        monthlyData[key].categories[cat] = (monthlyData[key].categories[cat] || 0) + (t.amount || 0);
      }
    });

    const timeline = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    if (timeline.length < 3) return { detected: false, message: 'Need at least 3 months of data' };

    // Check income growth vs expense growth
    const firstHalf = timeline.slice(0, Math.ceil(timeline.length / 2));
    const secondHalf = timeline.slice(Math.ceil(timeline.length / 2));

    const avgIncomeFirst = firstHalf.reduce((s, m) => s + m.income, 0) / firstHalf.length;
    const avgIncomeSecond = secondHalf.reduce((s, m) => s + m.income, 0) / secondHalf.length;
    const avgExpenseFirst = firstHalf.reduce((s, m) => s + m.expense, 0) / firstHalf.length;
    const avgExpenseSecond = secondHalf.reduce((s, m) => s + m.expense, 0) / secondHalf.length;

    const incomeGrowth = avgIncomeFirst > 0 ? ((avgIncomeSecond - avgIncomeFirst) / avgIncomeFirst * 100) : 0;
    const expenseGrowth = avgExpenseFirst > 0 ? ((avgExpenseSecond - avgExpenseFirst) / avgExpenseFirst * 100) : 0;

    const lifestyleInflation = expenseGrowth > incomeGrowth && expenseGrowth > 5;

    // Category-level inflation
    const catInflation = [];
    const allCats = new Set();
    timeline.forEach(m => Object.keys(m.categories).forEach(c => allCats.add(c)));

    allCats.forEach(cat => {
      const firstVals = firstHalf.map(m => m.categories[cat] || 0);
      const secondVals = secondHalf.map(m => m.categories[cat] || 0);
      const avgFirst = firstVals.reduce((a, b) => a + b, 0) / firstVals.length;
      const avgSecond = secondVals.reduce((a, b) => a + b, 0) / secondVals.length;
      const growth = avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst * 100) : (avgSecond > 0 ? 100 : 0);

      if (growth > 15) {
        catInflation.push({
          category: cat,
          growth: Math.round(growth),
          previousAvg: Math.round(avgFirst),
          currentAvg: Math.round(avgSecond),
          monthlyIncrease: Math.round(avgSecond - avgFirst),
        });
      }
    });

    return {
      detected: lifestyleInflation,
      incomeGrowth: Math.round(incomeGrowth * 10) / 10,
      expenseGrowth: Math.round(expenseGrowth * 10) / 10,
      savingsRateFirst: avgIncomeFirst > 0 ? Math.round((avgIncomeFirst - avgExpenseFirst) / avgIncomeFirst * 100) : 0,
      savingsRateSecond: avgIncomeSecond > 0 ? Math.round((avgIncomeSecond - avgExpenseSecond) / avgIncomeSecond * 100) : 0,
      categoryInflation: catInflation.sort((a, b) => b.growth - a.growth),
      timeline: timeline.map(m => ({
        month: m.month,
        income: Math.round(m.income),
        expense: Math.round(m.expense),
        savingsRate: m.income > 0 ? Math.round((m.income - m.expense) / m.income * 100) : 0,
      })),
      recommendation: lifestyleInflation
        ? 'Your expenses are growing faster than income. Review the inflating categories and set stricter budgets.'
        : 'No significant lifestyle inflation detected. Keep maintaining discipline!',
    };
  }
}

// ─── Merchant Intelligence ──────────────────────────────────────────
class MerchantIntelligence {
  async analyze(userId, days = 90) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const transactions = await Transaction.find({ userId, type: 'expense', date: { $gte: since } }).lean();

    const merchants = {};
    transactions.forEach(t => {
      const name = (t.merchant || t.description || 'Unknown').substring(0, 40);
      if (!merchants[name]) merchants[name] = { visits: 0, total: 0, amounts: [], dates: [], categories: new Set() };
      merchants[name].visits++;
      merchants[name].total += t.amount || 0;
      merchants[name].amounts.push(t.amount || 0);
      merchants[name].dates.push(new Date(t.date));
      merchants[name].categories.add(t.category || 'other');
    });

    const analysis = Object.entries(merchants).map(([name, data]) => {
      const avgSpend = data.total / data.visits;
      const maxSpend = Math.max(...data.amounts);
      const minSpend = Math.min(...data.amounts);
      
      // Loyalty score (0-100)
      const frequencyScore = Math.min(40, data.visits * 5);
      const recencyScore = (() => {
        const lastVisit = Math.max(...data.dates.map(d => d.getTime()));
        const daysSince = (Date.now() - lastVisit) / (1000 * 60 * 60 * 24);
        return daysSince < 7 ? 30 : daysSince < 14 ? 25 : daysSince < 30 ? 15 : 5;
      })();
      const spendScore = Math.min(30, data.total / 1000);
      const loyaltyScore = Math.min(100, Math.round(frequencyScore + recencyScore + spendScore));

      return {
        name,
        visits: data.visits,
        totalSpent: Math.round(data.total),
        avgSpend: Math.round(avgSpend),
        maxSpend: Math.round(maxSpend),
        minSpend: Math.round(minSpend),
        loyaltyScore,
        categories: [...data.categories],
        lastVisit: new Date(Math.max(...data.dates.map(d => d.getTime()))),
        isFrequent: data.visits >= 5,
      };
    });

    return {
      merchants: analysis.sort((a, b) => b.totalSpent - a.totalSpent),
      topBySpend: analysis.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10),
      topByVisits: analysis.sort((a, b) => b.visits - a.visits).slice(0, 10),
      mostLoyal: analysis.sort((a, b) => b.loyaltyScore - a.loyaltyScore).slice(0, 5),
      uniqueMerchants: analysis.length,
      totalSpent: analysis.reduce((s, m) => s + m.totalSpent, 0),
    };
  }
}

// ─── Main Pattern Recognition Engine ─────────────────────────────────
class PatternRecognitionEngine {
  constructor() {
    this.kmeans = new KMeansClusterer(4);
    this.recurringDetector = new RecurringDetector();
    this.impulseDetector = new ImpulseDetector();
    this.lifestyleDetector = new LifestyleInflationDetector();
    this.merchantIntel = new MerchantIntelligence();
  }

  async fullAnalysis(userId) {
    const since = new Date();
    since.setMonth(since.getMonth() - 6);
    const transactions = await Transaction.find({ userId, date: { $gte: since } }).sort({ date: -1 }).lean();

    if (transactions.length < 10) return { error: 'insufficient_data', message: 'Need at least 10 transactions' };

    // Run all analyses in parallel
    const [recurring, impulse, lifestyle, merchants] = await Promise.all([
      Promise.resolve(this.recurringDetector.detect(transactions)),
      Promise.resolve(this.impulseDetector.analyze(transactions)),
      this.lifestyleDetector.detect(userId),
      this.merchantIntel.analyze(userId),
    ]);

    // K-Means clustering on spending behavior
    const clusterData = transactions.filter(t => t.type === 'expense').map(t => ({
      amount: t.amount || 0,
      dayOfWeek: new Date(t.date).getDay(),
      hour: new Date(t.date).getHours(),
      isWeekend: [0, 6].includes(new Date(t.date).getDay()) ? 1 : 0,
    }));
    const clusters = clusterData.length >= 4 ? this.kmeans.fit(clusterData) : null;

    // Spending velocity
    const expenses = transactions.filter(t => t.type === 'expense');
    const dailyMap = {};
    expenses.forEach(t => {
      const day = new Date(t.date).toISOString().split('T')[0];
      dailyMap[day] = (dailyMap[day] || 0) + (t.amount || 0);
    });
    const dailyValues = Object.values(dailyMap);
    const avgDaily = dailyValues.reduce((a, b) => a + b, 0) / (dailyValues.length || 1);
    const last7 = dailyValues.slice(-7);
    const recentDaily = last7.reduce((a, b) => a + b, 0) / (last7.length || 1);

    return {
      transactionsAnalyzed: transactions.length,
      timespan: { from: since, to: new Date() },

      recurring: {
        found: recurring.length,
        items: recurring.slice(0, 15),
        totalAnnualCost: recurring.reduce((s, r) => s + r.annualCost, 0),
        subscriptions: recurring.filter(r => r.isSubscription),
      },

      impulseSpending: impulse,

      lifestyleInflation: lifestyle,

      merchants,

      spendingVelocity: {
        avgDaily: Math.round(avgDaily),
        recentDaily: Math.round(recentDaily),
        velocityChange: avgDaily > 0 ? Math.round((recentDaily - avgDaily) / avgDaily * 100) : 0,
        trend: recentDaily > avgDaily * 1.2 ? 'accelerating' : recentDaily < avgDaily * 0.8 ? 'decelerating' : 'stable',
      },

      behaviorClusters: clusters ? {
        clusterCount: clusters.clusters.filter(c => c.size > 0).length,
        segments: clusters.clusters.filter(c => c.size > 0).map((c, i) => ({
          id: i,
          size: c.size,
          center: c.center,
          label: this._labelCluster(c.center),
        })),
      } : null,
    };
  }

  _labelCluster(center) {
    if (!center) return 'unknown';
    if (center.amount > 5000 && !center.isWeekend) return 'High-value Weekday';
    if (center.amount > 5000 && center.isWeekend) return 'High-value Weekend';
    if (center.amount < 500 && center.hour >= 11 && center.hour <= 14) return 'Daily Essentials';
    if (center.isWeekend) return 'Weekend Spending';
    return 'Regular Purchases';
  }
}

module.exports = {
  PatternRecognitionEngine,
  KMeansClusterer,
  RecurringDetector,
  ImpulseDetector,
  LifestyleInflationDetector,
  MerchantIntelligence,
};
