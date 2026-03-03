// ============================================================================
// AI MODEL TRAINER — Self-Training ML Pipeline for Financial Analysis
// ============================================================================
// Comprehensive model training system that learns from user data patterns.
// Trains: categorization, spending prediction, anomaly baselines, merchant
//         affinity, budget optimization, risk profiling, goal forecasting,
//         income stability analysis, lifestyle clustering, and sentiment.
// ============================================================================

const logger = require('../utils/logger');
const path   = require('path');
const fs     = require('fs');

const MODEL_DIR = path.join(__dirname, '..', 'data', 'models');

// ============================================================================
// §0  CORE UTILITIES
// ============================================================================

const DAY = 86400000;
const sum   = (a) => a.reduce((s, v) => s + v, 0);
const mean  = (a) => (a.length ? sum(a) / a.length : 0);
const stdDev = (a) => {
  const m = mean(a);
  return Math.sqrt(mean(a.map((v) => (v - m) ** 2)));
};
const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const percentile = (a, p) => {
  const sorted = [...a].sort((x, y) => x - y);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ago   = (d) => new Date(Date.now() - d * DAY);

// Lazy model loader
const model = (name) => {
  try { return require(`../models/${name}`); }
  catch { return null; }
};

function ensureModelDir() {
  if (!fs.existsSync(MODEL_DIR)) fs.mkdirSync(MODEL_DIR, { recursive: true });
}

function saveModel(userId, modelName, data) {
  try {
    ensureModelDir();
    const filePath = path.join(MODEL_DIR, `${userId}_${modelName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    logger.info(`Model saved: ${modelName} for user ${userId}`);
    return true;
  } catch (e) {
    logger.warn(`Failed to save model ${modelName}:`, e.message);
    return false;
  }
}

function loadModel(userId, modelName) {
  try {
    const filePath = path.join(MODEL_DIR, `${userId}_${modelName}.json`);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function listModels(userId) {
  try {
    ensureModelDir();
    const files = fs.readdirSync(MODEL_DIR)
      .filter(f => f.startsWith(`${userId}_`) && f.endsWith('.json'));
    return files.map(f => {
      const stats = fs.statSync(path.join(MODEL_DIR, f));
      const name = f.replace(`${userId}_`, '').replace('.json', '');
      return { name, size: stats.size, lastTrained: stats.mtime };
    });
  } catch {
    return [];
  }
}

// ============================================================================
// §1  DATA FETCHERS
// ============================================================================

async function fetchTransactions(userId, days = 365) {
  const Transaction = model('Transaction');
  if (!Transaction) return [];
  return Transaction.find({ userId, date: { $gte: ago(days) } }).sort({ date: 1 }).lean();
}

async function fetchBudgets(userId) {
  const Budget = model('Budget');
  if (!Budget) return [];
  return Budget.find({ userId }).lean();
}

async function fetchEMIs(userId) {
  const EMI = model('EMI');
  if (!EMI) return [];
  return EMI.find({ userId }).lean();
}

async function fetchInvestments(userId) {
  const Investment = model('Investment');
  if (!Investment) return [];
  return Investment.find({ userId }).lean();
}

async function fetchGoals(userId) {
  const FinancialGoal = model('FinancialGoal');
  if (!FinancialGoal) return [];
  return FinancialGoal.find({ userId }).lean();
}

async function fetchDebts(userId) {
  const Debt = model('Debt');
  if (!Debt) return [];
  return Debt.find({ userId }).lean();
}

async function fetchBankAccounts(userId) {
  const BankAccount = model('BankAccount');
  if (!BankAccount) return [];
  return BankAccount.find({ userId }).lean();
}

async function fetchInsurance(userId) {
  const InsurancePolicy = model('InsurancePolicy');
  if (!InsurancePolicy) return [];
  return InsurancePolicy.find({ userId }).lean();
}

async function fetchSubscriptions(userId) {
  const Subscription = model('Subscription');
  if (!Subscription) return [];
  return Subscription.find({ userId }).lean();
}

async function fetchAllData(userId) {
  const [transactions, budgets, emis, investments, goals, debts, accounts, insurance, subscriptions] =
    await Promise.all([
      fetchTransactions(userId, 730),
      fetchBudgets(userId),
      fetchEMIs(userId),
      fetchInvestments(userId),
      fetchGoals(userId),
      fetchDebts(userId),
      fetchBankAccounts(userId),
      fetchInsurance(userId),
      fetchSubscriptions(userId),
    ]);
  return { transactions, budgets, emis, investments, goals, debts, accounts, insurance, subscriptions };
}

// ============================================================================
// §2  STATISTICAL UTILITIES
// ============================================================================

function linearRegression(xs, ys) {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] || 0, r2: 0 };
  const mx = mean(xs), my = mean(ys);
  let num = 0, den = 0, ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den ? num / den : 0;
  const intercept = my - slope * mx;
  for (let i = 0; i < n; i++) {
    const predicted = slope * xs[i] + intercept;
    ssRes += (ys[i] - predicted) ** 2;
    ssTot += (ys[i] - my) ** 2;
  }
  const r2 = ssTot ? 1 - ssRes / ssTot : 0;
  return { slope, intercept, r2 };
}

function holtWinters(data, alpha = 0.3, beta = 0.1, forecast = 3) {
  if (data.length < 2) return { smoothed: data, forecast: Array(forecast).fill(data[0] || 0) };
  let level = data[0];
  let trend = data[1] - data[0];
  const smoothed = [level];
  for (let i = 1; i < data.length; i++) {
    const newLevel = alpha * data[i] + (1 - alpha) * (level + trend);
    const newTrend = beta * (newLevel - level) + (1 - beta) * trend;
    level = newLevel;
    trend = newTrend;
    smoothed.push(level);
  }
  const predictions = [];
  for (let i = 1; i <= forecast; i++) {
    predictions.push(Math.max(0, level + trend * i));
  }
  return { smoothed, forecast: predictions, level, trend };
}

function seasonalDecomposition(data, period = 12) {
  if (data.length < period * 2) return null;
  // Moving average to extract trend
  const trend = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(period / 2));
    const end = Math.min(data.length, i + Math.ceil(period / 2));
    trend.push(mean(data.slice(start, end)));
  }
  // Seasonal component
  const detrended = data.map((v, i) => v - trend[i]);
  const seasonal = Array(period).fill(0);
  const counts = Array(period).fill(0);
  for (let i = 0; i < detrended.length; i++) {
    seasonal[i % period] += detrended[i];
    counts[i % period]++;
  }
  for (let i = 0; i < period; i++) {
    seasonal[i] = counts[i] ? seasonal[i] / counts[i] : 0;
  }
  // Residual
  const residual = data.map((v, i) => v - trend[i] - seasonal[i % period]);
  return { trend, seasonal, residual };
}

function kMeansClustering(points, k = 3, maxIter = 50) {
  if (points.length < k) return { clusters: [points], centroids: [mean(points.flat())], assignments: points.map(() => 0) };
  const dims = Array.isArray(points[0]) ? points[0].length : 1;
  const normalize = (p) => Array.isArray(p) ? p : [p];
  const normalized = points.map(normalize);

  // Initialize centroids with k-means++
  const centroids = [normalized[Math.floor(Math.random() * normalized.length)]];
  while (centroids.length < k) {
    const distances = normalized.map(p => {
      return Math.min(...centroids.map(c => {
        return Math.sqrt(sum(p.map((v, i) => (v - c[i]) ** 2)));
      }));
    });
    const totalDist = sum(distances);
    let r = Math.random() * totalDist;
    for (let i = 0; i < distances.length; i++) {
      r -= distances[i];
      if (r <= 0) { centroids.push([...normalized[i]]); break; }
    }
  }

  let assignments = normalized.map(() => 0);
  for (let iter = 0; iter < maxIter; iter++) {
    // Assign each point to nearest centroid
    const newAssignments = normalized.map(p => {
      let nearest = 0, nearestDist = Infinity;
      for (let j = 0; j < k; j++) {
        const dist = Math.sqrt(sum(p.map((v, d) => (v - centroids[j][d]) ** 2)));
        if (dist < nearestDist) { nearestDist = dist; nearest = j; }
      }
      return nearest;
    });

    // Check convergence
    if (newAssignments.every((a, i) => a === assignments[i])) break;
    assignments = newAssignments;

    // Update centroids
    for (let j = 0; j < k; j++) {
      const cluster = normalized.filter((_, i) => assignments[i] === j);
      if (cluster.length > 0) {
        for (let d = 0; d < dims; d++) {
          centroids[j][d] = mean(cluster.map(p => p[d]));
        }
      }
    }
  }

  const clusters = Array.from({ length: k }, () => []);
  assignments.forEach((a, i) => clusters[a].push(points[i]));
  return { clusters, centroids, assignments };
}

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
    magA += a[i] ** 2;
    magB += b[i] ** 2;
  }
  return (magA && magB) ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
}

function pearsonCorrelation(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;
  const mx = mean(x.slice(0, n)), my = mean(y.slice(0, n));
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my);
    denX += (x[i] - mx) ** 2;
    denY += (y[i] - my) ** 2;
  }
  const den = Math.sqrt(denX * denY);
  return den ? num / den : 0;
}

// ============================================================================
// §3  NAIVE BAYES CATEGORIZER (Enhanced)
// ============================================================================

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

// Bigram generation for better context
function bigrams(tokens) {
  const bg = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bg.push(`${tokens[i]}_${tokens[i + 1]}`);
  }
  return bg;
}

async function trainCategorizer(userId) {
  const txns = await fetchTransactions(userId, 730);
  const categorized = txns.filter(t => t.category && t.category !== 'other' && (t.description || t.merchantName));

  if (categorized.length < 10) {
    return { success: false, message: 'Need at least 10 categorized transactions to train', dataPoints: categorized.length };
  }

  const catCounts = {};
  const wordCounts = {};
  const bigramCounts = {};
  const amountRanges = {};
  const timePatterns = {};
  let totalDocs = 0;

  for (const t of categorized) {
    const cat = t.category;
    const tokens = tokenize(`${t.description || ''} ${t.merchantName || ''}`);
    const bgs = bigrams(tokens);
    if (tokens.length === 0) continue;

    catCounts[cat] = (catCounts[cat] || 0) + 1;
    if (!wordCounts[cat]) wordCounts[cat] = {};
    if (!bigramCounts[cat]) bigramCounts[cat] = {};
    if (!amountRanges[cat]) amountRanges[cat] = [];
    if (!timePatterns[cat]) timePatterns[cat] = { hours: Array(24).fill(0), days: Array(7).fill(0) };

    for (const w of tokens) {
      wordCounts[cat][w] = (wordCounts[cat][w] || 0) + 1;
    }
    for (const bg of bgs) {
      bigramCounts[cat][bg] = (bigramCounts[cat][bg] || 0) + 1;
    }
    amountRanges[cat].push(Math.abs(t.amount));
    if (t.date) {
      const d = new Date(t.date);
      timePatterns[cat].hours[d.getHours()]++;
      timePatterns[cat].days[d.getDay()]++;
    }
    totalDocs++;
  }

  // Compute TF-IDF weights for feature importance
  const idf = {};
  const allWords = new Set();
  for (const wc of Object.values(wordCounts)) {
    for (const w of Object.keys(wc)) allWords.add(w);
  }
  for (const word of allWords) {
    const docFreq = Object.values(wordCounts).filter(wc => wc[word]).length;
    idf[word] = Math.log((Object.keys(catCounts).length + 1) / (docFreq + 1)) + 1;
  }

  // Amount statistics per category
  const amountStats = {};
  for (const [cat, amounts] of Object.entries(amountRanges)) {
    amountStats[cat] = {
      mean: mean(amounts),
      stdDev: stdDev(amounts),
      median: median(amounts),
      min: Math.min(...amounts),
      max: Math.max(...amounts),
      p25: percentile(amounts, 25),
      p75: percentile(amounts, 75),
      count: amounts.length,
    };
  }

  const modelData = {
    version: 2,
    catCounts,
    wordCounts,
    bigramCounts,
    idf,
    totalDocs,
    amountStats,
    timePatterns,
    trainedAt: new Date().toISOString(),
    accuracy: null, // Set after validation
  };

  // Cross-validation: use last 20% as validation set
  const validationSize = Math.floor(categorized.length * 0.2);
  const validationSet = categorized.slice(-validationSize);
  let correct = 0;
  for (const t of validationSet) {
    const result = classifyWithModel(modelData, t.description, t.amount, t.merchantName);
    if (result.category === t.category) correct++;
  }
  modelData.accuracy = validationSize > 0 ? Math.round((correct / validationSize) * 100) : null;

  saveModel(userId, 'categorizer_v2', modelData);

  return {
    success: true,
    version: 2,
    categories: Object.keys(catCounts).length,
    dataPoints: totalDocs,
    accuracy: modelData.accuracy,
    topCategories: Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([cat, count]) => ({ category: cat, count, avgAmount: Math.round(amountStats[cat]?.mean || 0) })),
    featureCount: allWords.size,
    bigramCount: Object.values(bigramCounts).reduce((s, bg) => s + Object.keys(bg).length, 0),
    trainedAt: new Date(),
  };
}

function classifyWithModel(modelData, description, amount, merchantName) {
  const text = `${description || ''} ${merchantName || ''}`.toLowerCase();
  const tokens = tokenize(text);
  const bgs = bigrams(tokens);
  const { catCounts, wordCounts, bigramCounts, idf, totalDocs, amountStats } = modelData;
  const categories = Object.keys(catCounts);

  let bestCat = 'other';
  let bestScore = -Infinity;
  const scores = {};

  for (const cat of categories) {
    const catProb = Math.log((catCounts[cat] || 0) / totalDocs);
    const vocabSize = Object.keys(idf || {}).length || 1000;
    const catWordTotal = sum(Object.values(wordCounts[cat] || {}));

    // Unigram score with TF-IDF weighting
    let wordScore = 0;
    for (const w of tokens) {
      const wordFreq = (wordCounts[cat]?.[w] || 0) + 1;
      const weight = (idf && idf[w]) || 1;
      wordScore += Math.log(wordFreq / (catWordTotal + vocabSize)) * weight;
    }

    // Bigram score (higher weight for contextual matches)
    let bigramScore = 0;
    if (bigramCounts && bigramCounts[cat]) {
      const catBigramTotal = sum(Object.values(bigramCounts[cat]));
      for (const bg of bgs) {
        const bgFreq = (bigramCounts[cat][bg] || 0) + 1;
        bigramScore += Math.log(bgFreq / (catBigramTotal + vocabSize)) * 1.5;
      }
    }

    // Amount likelihood
    let amountScore = 0;
    if (amount && amountStats && amountStats[cat]) {
      const { mean: m, stdDev: s } = amountStats[cat];
      if (s > 0) {
        const z = Math.abs((Math.abs(amount) - m) / s);
        amountScore = -z * 0.3;
      }
    }

    const totalScore = catProb + wordScore + bigramScore + amountScore;
    scores[cat] = totalScore;
    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestCat = cat;
    }
  }

  // Calculate confidence using softmax-like normalization
  const maxScore = Math.max(...Object.values(scores));
  const expScores = {};
  let expSum = 0;
  for (const [cat, score] of Object.entries(scores)) {
    expScores[cat] = Math.exp(score - maxScore);
    expSum += expScores[cat];
  }
  const confidence = Math.round(clamp((expScores[bestCat] / expSum) * 100, 15, 98));

  return {
    category: bestCat,
    confidence,
    method: 'enhanced_naive_bayes_v2',
    scores: Object.entries(expScores)
      .map(([cat, exp]) => ({ category: cat, probability: Math.round((exp / expSum) * 1000) / 10 }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 5),
  };
}

// ============================================================================
// §4  SPENDING PATTERN TRAINER
// ============================================================================

async function trainSpendingPatterns(userId) {
  const txns = await fetchTransactions(userId, 730);
  const debits = txns.filter(t => t.type === 'debit');

  if (debits.length < 30) {
    return { success: false, message: 'Need at least 30 transactions for spending pattern analysis' };
  }

  // Monthly aggregation
  const months = {};
  for (const t of debits) {
    const key = new Date(t.date).toISOString().slice(0, 7);
    if (!months[key]) months[key] = { total: 0, categories: {}, count: 0, days: new Set() };
    months[key].total += Math.abs(t.amount);
    months[key].count++;
    months[key].days.add(new Date(t.date).getDate());
    const cat = t.category || 'other';
    months[key].categories[cat] = (months[key].categories[cat] || 0) + Math.abs(t.amount);
  }

  const sortedKeys = Object.keys(months).sort();
  const values = sortedKeys.map(k => months[k].total);

  // Holt-Winters forecast
  const hw = values.length >= 3 ? holtWinters(values, 0.3, 0.1, 6) : null;

  // Seasonal decomposition
  const seasonal = values.length >= 24 ? seasonalDecomposition(values, 12) : null;

  // Category trends
  const allCats = new Set();
  for (const m of Object.values(months)) {
    for (const c of Object.keys(m.categories)) allCats.add(c);
  }
  const categoryTrends = {};
  for (const cat of allCats) {
    const catValues = sortedKeys.map(k => months[k].categories[cat] || 0);
    if (catValues.length >= 3) {
      const lr = linearRegression(
        catValues.map((_, i) => i),
        catValues
      );
      categoryTrends[cat] = {
        trend: lr.slope > 0 ? 'increasing' : lr.slope < 0 ? 'decreasing' : 'stable',
        slope: Math.round(lr.slope),
        r2: Math.round(lr.r2 * 100) / 100,
        average: Math.round(mean(catValues)),
        latest: catValues[catValues.length - 1],
        volatility: mean(catValues) > 0 ? Math.round(stdDev(catValues) / mean(catValues) * 100) : 0,
      };
    }
  }

  // Day-of-week spending patterns
  const dayOfWeek = Array(7).fill(0);
  const dayOfWeekCount = Array(7).fill(0);
  for (const t of debits) {
    const day = new Date(t.date).getDay();
    dayOfWeek[day] += Math.abs(t.amount);
    dayOfWeekCount[day]++;
  }
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayPatterns = dayLabels.map((label, i) => ({
    day: label,
    avgSpend: dayOfWeekCount[i] ? Math.round(dayOfWeek[i] / dayOfWeekCount[i]) : 0,
    totalSpend: Math.round(dayOfWeek[i]),
    transactionCount: dayOfWeekCount[i],
  }));

  // Hour-of-day spending patterns
  const hourly = Array(24).fill(0);
  const hourlyCount = Array(24).fill(0);
  for (const t of debits) {
    const hour = new Date(t.date).getHours();
    hourly[hour] += Math.abs(t.amount);
    hourlyCount[hour]++;
  }
  const hourPatterns = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    avgSpend: hourlyCount[i] ? Math.round(hourly[i] / hourlyCount[i]) : 0,
    totalSpend: Math.round(hourly[i]),
    transactionCount: hourlyCount[i],
  }));

  // Day-of-month patterns (salary cycle detection)
  const dayOfMonth = Array(31).fill(0);
  const dayOfMonthCount = Array(31).fill(0);
  const creditDayOfMonth = Array(31).fill(0);
  const credits = txns.filter(t => t.type === 'credit');
  for (const t of credits) {
    const dom = new Date(t.date).getDate() - 1;
    creditDayOfMonth[dom] += Math.abs(t.amount);
  }
  for (const t of debits) {
    const dom = new Date(t.date).getDate() - 1;
    dayOfMonth[dom] += Math.abs(t.amount);
    dayOfMonthCount[dom]++;
  }

  // Detect salary day (highest credit day)
  const salaryDayIndex = creditDayOfMonth.indexOf(Math.max(...creditDayOfMonth));
  const salaryDay = salaryDayIndex + 1;

  // Spending velocity around salary
  const preSalarySpend = mean(dayOfMonth.slice(Math.max(0, salaryDayIndex - 5), salaryDayIndex));
  const postSalarySpend = mean(dayOfMonth.slice(salaryDayIndex, Math.min(31, salaryDayIndex + 5)));

  const modelData = {
    version: 1,
    monthlyTotals: sortedKeys.map((k, i) => ({ month: k, total: Math.round(values[i]) })),
    forecast: hw ? {
      level: Math.round(hw.level),
      trend: Math.round(hw.trend),
      predictions: hw.forecast.map((v, i) => ({
        month: new Date(Date.now() + (i + 1) * 30 * DAY).toISOString().slice(0, 7),
        predicted: Math.round(v),
      })),
    } : null,
    seasonality: seasonal ? {
      indices: seasonal.seasonal.map(v => Math.round(v)),
      hasSeasonal: Math.max(...seasonal.seasonal.map(Math.abs)) > mean(values) * 0.1,
    } : null,
    categoryTrends,
    dayPatterns,
    hourPatterns,
    salaryDay,
    salaryBehavior: {
      preSalaryAvgSpend: Math.round(preSalarySpend),
      postSalaryAvgSpend: Math.round(postSalarySpend),
      impulseFactor: preSalarySpend > 0 ? Math.round(postSalarySpend / preSalarySpend * 100) / 100 : 0,
    },
    trainedAt: new Date().toISOString(),
  };

  saveModel(userId, 'spending_patterns', modelData);

  return {
    success: true,
    monthsAnalyzed: sortedKeys.length,
    transactionsProcessed: debits.length,
    categoriesTracked: allCats.size,
    salaryDay,
    forecast: modelData.forecast,
    topTrends: Object.entries(categoryTrends)
      .sort((a, b) => Math.abs(b[1].slope) - Math.abs(a[1].slope))
      .slice(0, 10)
      .map(([cat, data]) => ({ category: cat, ...data })),
    trainedAt: new Date(),
  };
}

// ============================================================================
// §5  ANOMALY BASELINE TRAINER
// ============================================================================

async function trainAnomalyBaselines(userId) {
  const txns = await fetchTransactions(userId, 365);
  const debits = txns.filter(t => t.type === 'debit');

  if (debits.length < 20) {
    return { success: false, message: 'Insufficient data for anomaly baseline training' };
  }

  // Per-category baselines
  const catGroups = {};
  for (const t of debits) {
    const cat = t.category || 'other';
    if (!catGroups[cat]) catGroups[cat] = [];
    catGroups[cat].push({
      amount: Math.abs(t.amount),
      hour: new Date(t.date).getHours(),
      day: new Date(t.date).getDay(),
      dayOfMonth: new Date(t.date).getDate(),
    });
  }

  const baselines = {};
  for (const [cat, entries] of Object.entries(catGroups)) {
    const amounts = entries.map(e => e.amount);
    baselines[cat] = {
      amount: {
        mean: mean(amounts),
        stdDev: stdDev(amounts),
        median: median(amounts),
        p5: percentile(amounts, 5),
        p95: percentile(amounts, 95),
        p99: percentile(amounts, 99),
        iqr: percentile(amounts, 75) - percentile(amounts, 25),
      },
      count: amounts.length,
      hourDistribution: Array.from({ length: 24 }, (_, h) =>
        entries.filter(e => e.hour === h).length / entries.length
      ),
      dayDistribution: Array.from({ length: 7 }, (_, d) =>
        entries.filter(e => e.day === d).length / entries.length
      ),
    };
  }

  // Global spending velocity baselines
  const daily = {};
  for (const t of debits) {
    const key = new Date(t.date).toISOString().slice(0, 10);
    daily[key] = (daily[key] || 0) + Math.abs(t.amount);
  }
  const dailyAmounts = Object.values(daily);
  const velocityBaseline = {
    mean: mean(dailyAmounts),
    stdDev: stdDev(dailyAmounts),
    p95: percentile(dailyAmounts, 95),
    p99: percentile(dailyAmounts, 99),
  };

  // Weekly spending baseline
  const weekly = {};
  for (const t of debits) {
    const d = new Date(t.date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    weekly[key] = (weekly[key] || 0) + Math.abs(t.amount);
  }
  const weeklyAmounts = Object.values(weekly);
  const weeklyBaseline = {
    mean: mean(weeklyAmounts),
    stdDev: stdDev(weeklyAmounts),
    p95: percentile(weeklyAmounts, 95),
  };

  // Transaction frequency baseline
  const dailyCounts = {};
  for (const t of debits) {
    const key = new Date(t.date).toISOString().slice(0, 10);
    dailyCounts[key] = (dailyCounts[key] || 0) + 1;
  }
  const countValues = Object.values(dailyCounts);
  const frequencyBaseline = {
    mean: mean(countValues),
    stdDev: stdDev(countValues),
    p95: percentile(countValues, 95),
  };

  // Merchant-specific baselines
  const merchantGroups = {};
  for (const t of debits) {
    const name = (t.merchantName || t.description || 'unknown').toLowerCase().trim();
    if (!merchantGroups[name]) merchantGroups[name] = [];
    merchantGroups[name].push(Math.abs(t.amount));
  }
  const merchantBaselines = {};
  for (const [name, amounts] of Object.entries(merchantGroups)) {
    if (amounts.length >= 3) {
      merchantBaselines[name] = {
        mean: mean(amounts),
        stdDev: stdDev(amounts),
        max: Math.max(...amounts),
        count: amounts.length,
      };
    }
  }

  const modelData = {
    version: 1,
    categoryBaselines: baselines,
    velocityBaseline,
    weeklyBaseline,
    frequencyBaseline,
    merchantBaselines,
    totalTransactions: debits.length,
    trainedAt: new Date().toISOString(),
  };

  saveModel(userId, 'anomaly_baselines_v2', modelData);

  return {
    success: true,
    categories: Object.keys(baselines).length,
    merchants: Object.keys(merchantBaselines).length,
    transactionsProcessed: debits.length,
    velocityThreshold: Math.round(velocityBaseline.p95),
    trainedAt: new Date(),
  };
}

// ============================================================================
// §6  BUDGET OPTIMIZATION TRAINER
// ============================================================================

async function trainBudgetOptimizer(userId) {
  const data = await fetchAllData(userId);
  const txns = data.transactions.filter(t => t.type === 'debit');
  const credits = data.transactions.filter(t => t.type === 'credit');

  if (txns.length < 30) {
    return { success: false, message: 'Insufficient transaction data' };
  }

  // Monthly income calculation
  const monthlyIncome = {};
  for (const t of credits) {
    const key = new Date(t.date).toISOString().slice(0, 7);
    monthlyIncome[key] = (monthlyIncome[key] || 0) + Math.abs(t.amount);
  }
  const incomeValues = Object.values(monthlyIncome);
  const avgIncome = mean(incomeValues);

  // Monthly category spending
  const monthlyByCategory = {};
  for (const t of txns) {
    const key = new Date(t.date).toISOString().slice(0, 7);
    const cat = t.category || 'other';
    if (!monthlyByCategory[cat]) monthlyByCategory[cat] = {};
    monthlyByCategory[cat][key] = (monthlyByCategory[cat][key] || 0) + Math.abs(t.amount);
  }

  // Category analysis
  const categoryAnalysis = {};
  const allMonths = new Set();
  for (const cats of Object.values(monthlyByCategory)) {
    for (const m of Object.keys(cats)) allMonths.add(m);
  }
  const monthsList = [...allMonths].sort();

  for (const [cat, months] of Object.entries(monthlyByCategory)) {
    const values = monthsList.map(m => months[m] || 0);
    const nonZero = values.filter(v => v > 0);
    if (nonZero.length < 2) continue;

    const catMean = mean(nonZero);
    const catStd = stdDev(nonZero);
    const catMedian = median(nonZero);

    // Elasticity: how much does spending vary? High elasticity = discretionary
    const elasticity = catMean > 0 ? catStd / catMean : 0;

    // Necessity score: consistent, low-variance spending = necessity
    const necessityScore = clamp(Math.round((1 - elasticity) * 100), 0, 100);

    // Identify if essential vs discretionary
    const essentialCategories = ['rent', 'emi', 'utilities', 'groceries', 'healthcare', 'insurance', 'education'];
    const discretionaryCategories = ['entertainment', 'shopping', 'dining', 'food', 'travel', 'subscriptions'];
    const isEssential = essentialCategories.includes(cat.toLowerCase());
    const isDiscretionary = discretionaryCategories.includes(cat.toLowerCase());

    // Optimal budget recommendation
    let optimalBudget;
    if (isEssential) {
      optimalBudget = Math.round(catMean * 1.05); // 5% buffer for essentials
    } else if (isDiscretionary) {
      optimalBudget = Math.round(catMedian * 0.85); // Encourage 15% reduction
    } else {
      optimalBudget = Math.round(catMean); // Average for unknown
    }

    categoryAnalysis[cat] = {
      average: Math.round(catMean),
      median: Math.round(catMedian),
      standardDeviation: Math.round(catStd),
      elasticity: Math.round(elasticity * 100) / 100,
      necessityScore,
      type: isEssential ? 'essential' : isDiscretionary ? 'discretionary' : 'mixed',
      optimalBudget,
      savingsPotential: isDiscretionary ? Math.round(catMean * 0.15) : 0,
      trend: values.length >= 3 ? linearRegression(values.map((_, i) => i), values) : null,
      monthlyValues: monthsList.map((m, i) => ({ month: m, amount: Math.round(values[i]) })),
    };
  }

  // 50/30/20 rule analysis
  const totalExpense = mean(monthsList.map(m => {
    let total = 0;
    for (const cats of Object.values(monthlyByCategory)) {
      total += cats[m] || 0;
    }
    return total;
  }));

  const essentialSpend = sum(
    Object.entries(categoryAnalysis)
      .filter(([_, v]) => v.type === 'essential')
      .map(([_, v]) => v.average)
  );
  const discretionarySpend = sum(
    Object.entries(categoryAnalysis)
      .filter(([_, v]) => v.type === 'discretionary')
      .map(([_, v]) => v.average)
  );

  const ruleAnalysis = {
    needs: { actual: Math.round(essentialSpend), recommended: Math.round(avgIncome * 0.5), percentage: avgIncome > 0 ? Math.round(essentialSpend / avgIncome * 100) : 0 },
    wants: { actual: Math.round(discretionarySpend), recommended: Math.round(avgIncome * 0.3), percentage: avgIncome > 0 ? Math.round(discretionarySpend / avgIncome * 100) : 0 },
    savings: { actual: Math.round(avgIncome - totalExpense), recommended: Math.round(avgIncome * 0.2), percentage: avgIncome > 0 ? Math.round((avgIncome - totalExpense) / avgIncome * 100) : 0 },
  };

  const modelData = {
    version: 1,
    avgIncome: Math.round(avgIncome),
    categoryAnalysis,
    ruleAnalysis,
    totalCategories: Object.keys(categoryAnalysis).length,
    totalMonthsAnalyzed: monthsList.length,
    totalSavingsPotential: sum(Object.values(categoryAnalysis).map(c => c.savingsPotential)),
    trainedAt: new Date().toISOString(),
  };

  saveModel(userId, 'budget_optimizer', modelData);

  return {
    success: true,
    avgIncome: modelData.avgIncome,
    totalCategories: modelData.totalCategories,
    monthsAnalyzed: monthsList.length,
    ruleAnalysis,
    totalSavingsPotential: modelData.totalSavingsPotential,
    topOptimizations: Object.entries(categoryAnalysis)
      .filter(([_, v]) => v.savingsPotential > 0)
      .sort((a, b) => b[1].savingsPotential - a[1].savingsPotential)
      .slice(0, 5)
      .map(([cat, data]) => ({ category: cat, potential: data.savingsPotential, currentAvg: data.average, optimalBudget: data.optimalBudget })),
    trainedAt: new Date(),
  };
}

// ============================================================================
// §7  RISK PROFILING TRAINER
// ============================================================================

async function trainRiskProfile(userId) {
  const data = await fetchAllData(userId);
  const txns = data.transactions;
  const debits = txns.filter(t => t.type === 'debit');
  const credits = txns.filter(t => t.type === 'credit');

  // Monthly aggregation
  const months = {};
  for (const t of txns) {
    const key = new Date(t.date).toISOString().slice(0, 7);
    if (!months[key]) months[key] = { income: 0, expenses: 0 };
    if (t.type === 'credit') months[key].income += Math.abs(t.amount);
    else months[key].expenses += Math.abs(t.amount);
  }
  const sortedKeys = Object.keys(months).sort();

  // Income stability
  const incomes = sortedKeys.map(k => months[k].income);
  const incomeStability = incomes.length > 2 ? 1 - (stdDev(incomes) / (mean(incomes) || 1)) : 0.5;

  // Expense volatility
  const expenses = sortedKeys.map(k => months[k].expenses);
  const expenseVolatility = expenses.length > 2 ? stdDev(expenses) / (mean(expenses) || 1) : 0.5;

  // Debt burden
  const activeEMIs = (data.emis || []).filter(e => e.status === 'active');
  const monthlyEMI = sum(activeEMIs.map(e => e.emiAmountInINR || e.emiAmount || 0));
  const avgMonthlyIncome = mean(incomes) || 1;
  const debtBurden = monthlyEMI / avgMonthlyIncome;

  // Savings rate trend
  const savingsRates = sortedKeys.map(k =>
    months[k].income > 0 ? (months[k].income - months[k].expenses) / months[k].income : 0
  );
  const savingsRateTrend = savingsRates.length >= 3
    ? linearRegression(savingsRates.map((_, i) => i), savingsRates)
    : { slope: 0, r2: 0 };

  // Emergency fund coverage
  const totalBalance = sum((data.accounts || []).map(a => a.balance || 0));
  const avgExpense = mean(expenses) || 1;
  const emergencyMonths = totalBalance / avgExpense;

  // Investment risk (portfolio concentration)
  const investments = data.investments || [];
  const investmentTypes = {};
  for (const inv of investments) {
    const type = inv.investmentType || inv.type || 'other';
    investmentTypes[type] = (investmentTypes[type] || 0) + (inv.currentValue || inv.investedAmount || 0);
  }
  const totalInvested = sum(Object.values(investmentTypes));
  const concentrationRisk = totalInvested > 0
    ? Math.max(...Object.values(investmentTypes)) / totalInvested
    : 0;

  // Insurance coverage gaps
  const insuranceTypes = new Set((data.insurance || []).map(p => p.policyType || p.type));
  const hasLife = insuranceTypes.has('life_term') || insuranceTypes.has('life_endowment');
  const hasHealth = insuranceTypes.has('health_individual') || insuranceTypes.has('health_family');
  const insuranceCoverage = (hasLife ? 0.5 : 0) + (hasHealth ? 0.5 : 0);

  // Compute overall risk score (0-100, lower is riskier)
  const riskFactors = {
    incomeStability: { score: clamp(Math.round(incomeStability * 100), 0, 100), weight: 20 },
    expenseControl: { score: clamp(Math.round((1 - expenseVolatility) * 100), 0, 100), weight: 15 },
    debtManagement: { score: clamp(Math.round((1 - debtBurden * 2) * 100), 0, 100), weight: 20 },
    emergencyPreparedness: { score: clamp(Math.round((emergencyMonths / 6) * 100), 0, 100), weight: 15 },
    diversification: { score: clamp(Math.round((1 - concentrationRisk) * 100), 0, 100), weight: 10 },
    insuranceCoverage: { score: Math.round(insuranceCoverage * 100), weight: 10 },
    savingsTrend: { score: clamp(Math.round(50 + savingsRateTrend.slope * 500), 0, 100), weight: 10 },
  };

  let totalScore = 0, totalWeight = 0;
  for (const f of Object.values(riskFactors)) {
    totalScore += f.score * f.weight;
    totalWeight += f.weight;
  }
  const overallRisk = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;

  const riskLevel = overallRisk >= 80 ? 'low' : overallRisk >= 60 ? 'moderate' : overallRisk >= 40 ? 'elevated' : 'high';

  // Stress test scenarios
  const stressTests = {
    jobLoss: {
      scenario: 'Job loss (no income for 6 months)',
      survivalMonths: Math.round(emergencyMonths),
      impact: emergencyMonths >= 6 ? 'manageable' : emergencyMonths >= 3 ? 'concerning' : 'critical',
      recommendation: emergencyMonths < 6 ? `Build emergency fund to cover ${Math.ceil(6 - emergencyMonths)} more months` : 'Emergency fund is adequate',
    },
    interestRateHike: {
      scenario: 'Interest rate hike (+2%)',
      additionalMonthlyBurden: Math.round(sum(activeEMIs.map(e => {
        const remaining = e.remainingAmount || e.principalAmountInINR || 0;
        return remaining * 0.02 / 12;
      }))),
      impact: debtBurden > 0.3 ? 'significant' : 'minimal',
    },
    medicalEmergency: {
      scenario: 'Medical emergency (₹5 lakh)',
      canAbsorb: totalBalance > 500000,
      percentOfSavings: totalBalance > 0 ? Math.round(500000 / totalBalance * 100) : 999,
      recommendation: !hasHealth ? 'Get health insurance immediately' : totalBalance < 500000 ? 'Consider increasing emergency fund' : 'Covered by savings + insurance',
    },
    incomeReduction: {
      scenario: 'Income reduction (30% cut)',
      newSavingsRate: avgMonthlyIncome > 0
        ? Math.round(((avgMonthlyIncome * 0.7 - mean(expenses)) / (avgMonthlyIncome * 0.7)) * 100)
        : 0,
      canMeetEMIs: avgMonthlyIncome * 0.7 > monthlyEMI + mean(expenses) * 0.8,
    },
  };

  const modelData = {
    version: 1,
    overallRisk,
    riskLevel,
    riskFactors,
    stressTests,
    metrics: {
      avgMonthlyIncome: Math.round(avgMonthlyIncome),
      avgMonthlyExpenses: Math.round(mean(expenses)),
      monthlyEMI: Math.round(monthlyEMI),
      totalBalance: Math.round(totalBalance),
      totalInvested: Math.round(totalInvested),
      emergencyMonths: Math.round(emergencyMonths * 10) / 10,
      debtToIncome: Math.round(debtBurden * 100) / 100,
    },
    trainedAt: new Date().toISOString(),
  };

  saveModel(userId, 'risk_profile', modelData);

  return {
    success: true,
    overallRisk,
    riskLevel,
    riskFactors,
    stressTests,
    trainedAt: new Date(),
  };
}

// ============================================================================
// §8  GOAL FORECASTING TRAINER
// ============================================================================

async function trainGoalForecaster(userId) {
  const data = await fetchAllData(userId);
  const goals = data.goals || [];
  const txns = data.transactions;

  if (goals.length === 0) {
    return { success: false, message: 'No financial goals defined' };
  }

  // Monthly savings
  const months = {};
  for (const t of txns) {
    const key = new Date(t.date).toISOString().slice(0, 7);
    if (!months[key]) months[key] = { income: 0, expenses: 0 };
    if (t.type === 'credit') months[key].income += Math.abs(t.amount);
    else months[key].expenses += Math.abs(t.amount);
  }
  const sortedKeys = Object.keys(months).sort();
  const monthlySavings = sortedKeys.map(k => months[k].income - months[k].expenses);
  const avgSavings = mean(monthlySavings);
  const savingsTrend = monthlySavings.length >= 3
    ? linearRegression(monthlySavings.map((_, i) => i), monthlySavings)
    : { slope: 0, r2: 0 };

  const goalForecasts = goals.map(g => {
    const targetAmount = g.targetAmount || 0;
    const currentAmount = g.currentAmount || 0;
    const remaining = Math.max(0, targetAmount - currentAmount);
    const targetDate = g.targetDate ? new Date(g.targetDate) : null;
    const monthsToTarget = targetDate ? Math.max(1, Math.round((targetDate - Date.now()) / (30 * DAY))) : null;
    const requiredMonthly = monthsToTarget ? remaining / monthsToTarget : 0;

    // Can they reach the goal with current savings?
    const monthlySurplus = avgSavings;
    const allocatable = monthlySurplus * 0.5; // Assume 50% of savings can go to goals
    const canReach = allocatable >= requiredMonthly;

    // Time to reach with current savings
    const monthsNeeded = allocatable > 0 ? Math.ceil(remaining / allocatable) : Infinity;

    // Probability of reaching on time
    let probability = 0;
    if (monthsToTarget && allocatable > 0) {
      const ratio = allocatable / requiredMonthly;
      probability = clamp(Math.round(ratio * 80), 5, 95);
    }

    return {
      goalId: g._id,
      name: g.name || 'Unnamed Goal',
      targetAmount,
      currentAmount,
      remaining,
      targetDate: targetDate?.toISOString(),
      monthsToTarget,
      requiredMonthly: Math.round(requiredMonthly),
      currentAllocatable: Math.round(allocatable),
      canReach,
      monthsNeeded: monthsNeeded === Infinity ? null : monthsNeeded,
      probability,
      status: g.status,
      recommendation: !canReach
        ? `Increase monthly contribution to ${Math.round(requiredMonthly)} or extend deadline`
        : `On track — continue saving ${Math.round(allocatable)}/month`,
    };
  });

  const modelData = {
    version: 1,
    avgMonthlySavings: Math.round(avgSavings),
    savingsTrend: { slope: Math.round(savingsTrend.slope), r2: Math.round(savingsTrend.r2 * 100) / 100 },
    goalForecasts,
    totalGoals: goals.length,
    achievableCount: goalForecasts.filter(g => g.canReach).length,
    trainedAt: new Date().toISOString(),
  };

  saveModel(userId, 'goal_forecaster', modelData);

  return {
    success: true,
    avgMonthlySavings: modelData.avgMonthlySavings,
    totalGoals: goals.length,
    achievable: modelData.achievableCount,
    goalForecasts,
    trainedAt: new Date(),
  };
}

// ============================================================================
// §9  LIFESTYLE CLUSTERING
// ============================================================================

async function trainLifestyleCluster(userId) {
  const txns = await fetchTransactions(userId, 365);
  const debits = txns.filter(t => t.type === 'debit');

  if (debits.length < 50) {
    return { success: false, message: 'Need at least 50 transactions for lifestyle analysis' };
  }

  // Build feature vector per month: [essentials%, discretionary%, savings%, avgTxSize]
  const months = {};
  for (const t of debits) {
    const key = new Date(t.date).toISOString().slice(0, 7);
    if (!months[key]) months[key] = { essential: 0, discretionary: 0, other: 0, total: 0, count: 0 };
    const cat = (t.category || 'other').toLowerCase();
    const amount = Math.abs(t.amount);
    const essentialCats = ['rent', 'emi', 'utilities', 'groceries', 'healthcare', 'insurance', 'education'];
    const discCats = ['entertainment', 'shopping', 'dining', 'food', 'travel', 'subscriptions'];

    if (essentialCats.includes(cat)) months[key].essential += amount;
    else if (discCats.includes(cat)) months[key].discretionary += amount;
    else months[key].other += amount;
    months[key].total += amount;
    months[key].count++;
  }

  const sortedKeys = Object.keys(months).sort();
  const features = sortedKeys.map(k => {
    const m = months[k];
    return [
      m.total > 0 ? m.essential / m.total : 0,
      m.total > 0 ? m.discretionary / m.total : 0,
      m.count > 0 ? m.total / m.count : 0,
    ];
  });

  if (features.length < 3) {
    return { success: false, message: 'Need at least 3 months of data' };
  }

  // K-Means clustering to identify lifestyle patterns
  const k = Math.min(4, features.length);
  const { clusters, centroids, assignments } = kMeansClustering(features, k);

  // Label clusters
  const clusterLabels = centroids.map((c, i) => {
    const essentialPct = c[0];
    const discPct = c[1];
    const avgTxSize = c[2];

    let label;
    if (essentialPct > 0.6) label = 'Essentials-Focused';
    else if (discPct > 0.4) label = 'Lifestyle Spender';
    else if (avgTxSize > mean(features.map(f => f[2])) * 1.5) label = 'Big-Ticket Buyer';
    else label = 'Balanced Spender';

    return {
      id: i,
      label,
      essentialRatio: Math.round(essentialPct * 100),
      discretionaryRatio: Math.round(discPct * 100),
      avgTransactionSize: Math.round(avgTxSize),
      monthCount: clusters[i].length,
    };
  });

  // Current lifestyle (last 3 months)
  const recentAssignments = assignments.slice(-3);
  const currentCluster = recentAssignments.length > 0
    ? Math.round(mean(recentAssignments))
    : 0;

  // Lifestyle transitions
  const transitions = [];
  for (let i = 1; i < assignments.length; i++) {
    if (assignments[i] !== assignments[i - 1]) {
      transitions.push({
        month: sortedKeys[i],
        from: clusterLabels[assignments[i - 1]]?.label || 'Unknown',
        to: clusterLabels[assignments[i]]?.label || 'Unknown',
      });
    }
  }

  const modelData = {
    version: 1,
    clusters: clusterLabels,
    currentCluster,
    currentLifestyle: clusterLabels[currentCluster]?.label || 'Unknown',
    monthlyAssignments: sortedKeys.map((k, i) => ({
      month: k,
      cluster: assignments[i],
      label: clusterLabels[assignments[i]]?.label || 'Unknown',
    })),
    transitions,
    trainedAt: new Date().toISOString(),
  };

  saveModel(userId, 'lifestyle_cluster', modelData);

  return {
    success: true,
    currentLifestyle: modelData.currentLifestyle,
    clusters: clusterLabels,
    transitions: transitions.slice(-5),
    monthsAnalyzed: sortedKeys.length,
    trainedAt: new Date(),
  };
}

// ============================================================================
// §10  INCOME PREDICTOR TRAINER
// ============================================================================

async function trainIncomePredictor(userId) {
  const txns = await fetchTransactions(userId, 730);
  const credits = txns.filter(t => t.type === 'credit');

  if (credits.length < 10) {
    return { success: false, message: 'Insufficient income data' };
  }

  // Monthly income aggregation
  const months = {};
  for (const t of credits) {
    const key = new Date(t.date).toISOString().slice(0, 7);
    if (!months[key]) months[key] = { total: 0, sources: {} };
    months[key].total += Math.abs(t.amount);
    const source = t.category || t.merchantName || 'other';
    months[key].sources[source] = (months[key].sources[source] || 0) + Math.abs(t.amount);
  }

  const sortedKeys = Object.keys(months).sort();
  const values = sortedKeys.map(k => months[k].total);

  // Forecast income
  const hw = values.length >= 3 ? holtWinters(values, 0.4, 0.1, 6) : null;
  const lr = values.length >= 3 ? linearRegression(values.map((_, i) => i), values) : null;

  // Income source analysis
  const allSources = new Set();
  for (const m of Object.values(months)) {
    for (const s of Object.keys(m.sources)) allSources.add(s);
  }
  const sourceAnalysis = {};
  for (const source of allSources) {
    const sourceValues = sortedKeys.map(k => months[k].sources[source] || 0);
    const nonZero = sourceValues.filter(v => v > 0);
    if (nonZero.length >= 2) {
      sourceAnalysis[source] = {
        average: Math.round(mean(nonZero)),
        frequency: `${nonZero.length}/${sortedKeys.length} months`,
        isRegular: nonZero.length / sortedKeys.length > 0.7,
        stability: mean(nonZero) > 0 ? Math.round((1 - stdDev(nonZero) / mean(nonZero)) * 100) : 0,
        trend: nonZero.length >= 3
          ? linearRegression(nonZero.map((_, i) => i), nonZero).slope > 0 ? 'growing' : 'declining'
          : 'unknown',
      };
    }
  }

  // Income stability score
  const incomeStability = values.length > 2
    ? Math.round(clamp((1 - stdDev(values) / (mean(values) || 1)) * 100, 0, 100))
    : 50;

  // Diversification score
  const sources = Object.keys(sourceAnalysis);
  const regularSources = sources.filter(s => sourceAnalysis[s].isRegular);
  const diversification = sources.length >= 3 ? 'high' : sources.length >= 2 ? 'moderate' : 'low';

  const modelData = {
    version: 1,
    avgMonthlyIncome: Math.round(mean(values)),
    forecast: hw ? {
      predictions: hw.forecast.map((v, i) => ({
        month: new Date(Date.now() + (i + 1) * 30 * DAY).toISOString().slice(0, 7),
        predicted: Math.round(v),
      })),
      trend: hw.trend > 0 ? 'growing' : 'declining',
      trendAmount: Math.round(Math.abs(hw.trend)),
    } : null,
    linearTrend: lr ? { slope: Math.round(lr.slope), r2: Math.round(lr.r2 * 100) / 100 } : null,
    sourceAnalysis,
    incomeStability,
    diversification,
    regularSources: regularSources.length,
    totalSources: sources.length,
    trainedAt: new Date().toISOString(),
  };

  saveModel(userId, 'income_predictor', modelData);

  return {
    success: true,
    avgMonthlyIncome: modelData.avgMonthlyIncome,
    incomeStability,
    diversification,
    sourceCount: sources.length,
    forecast: modelData.forecast,
    topSources: Object.entries(sourceAnalysis)
      .sort((a, b) => b[1].average - a[1].average)
      .slice(0, 5)
      .map(([source, data]) => ({ source, ...data })),
    trainedAt: new Date(),
  };
}

// ============================================================================
// §11  MERCHANT INTELLIGENCE TRAINER
// ============================================================================

async function trainMerchantIntelligence(userId) {
  const txns = await fetchTransactions(userId, 730);
  const debits = txns.filter(t => t.type === 'debit');

  if (debits.length < 20) {
    return { success: false, message: 'Insufficient merchant data' };
  }

  const merchantGroups = {};
  for (const t of debits) {
    const name = (t.merchantName || t.description || 'unknown').toLowerCase().trim();
    if (name === 'unknown' || name.length < 2) continue;

    if (!merchantGroups[name]) {
      merchantGroups[name] = {
        transactions: [],
        category: t.category,
        totalSpent: 0,
      };
    }
    merchantGroups[name].transactions.push({
      amount: Math.abs(t.amount),
      date: new Date(t.date),
      hour: new Date(t.date).getHours(),
      day: new Date(t.date).getDay(),
    });
    merchantGroups[name].totalSpent += Math.abs(t.amount);
  }

  // Analyze each merchant
  const merchantProfiles = {};
  for (const [name, data] of Object.entries(merchantGroups)) {
    if (data.transactions.length < 2) continue;

    const amounts = data.transactions.map(t => t.amount);
    const dates = data.transactions.map(t => t.date);
    dates.sort((a, b) => a - b);

    // Calculate intervals
    const intervals = [];
    for (let i = 1; i < dates.length; i++) {
      intervals.push((dates[i] - dates[i - 1]) / DAY);
    }

    // Determine if recurring
    const avgInterval = intervals.length > 0 ? mean(intervals) : 0;
    const intervalCV = avgInterval > 0 && intervals.length > 1 ? stdDev(intervals) / avgInterval : 999;
    const isRecurring = intervalCV < 0.3 && intervals.length >= 2;

    let frequency = 'irregular';
    if (isRecurring) {
      if (avgInterval >= 25 && avgInterval <= 35) frequency = 'monthly';
      else if (avgInterval >= 12 && avgInterval <= 17) frequency = 'bi-weekly';
      else if (avgInterval >= 5 && avgInterval <= 9) frequency = 'weekly';
      else if (avgInterval >= 85 && avgInterval <= 95) frequency = 'quarterly';
      else if (avgInterval >= 355 && avgInterval <= 375) frequency = 'yearly';
      else frequency = `every ~${Math.round(avgInterval)} days`;
    }

    // Price sensitivity
    const amountCV = mean(amounts) > 0 ? stdDev(amounts) / mean(amounts) : 0;
    const isFixedPrice = amountCV < 0.05;

    // Predict next transaction
    const nextPredicted = isRecurring
      ? new Date(dates[dates.length - 1].getTime() + avgInterval * DAY)
      : null;

    // Spending trend at this merchant
    const trend = amounts.length >= 3
      ? linearRegression(amounts.map((_, i) => i), amounts)
      : null;

    merchantProfiles[name] = {
      displayName: name.charAt(0).toUpperCase() + name.slice(1),
      category: data.category || 'other',
      transactionCount: data.transactions.length,
      totalSpent: Math.round(data.totalSpent),
      avgAmount: Math.round(mean(amounts)),
      medianAmount: Math.round(median(amounts)),
      minAmount: Math.round(Math.min(...amounts)),
      maxAmount: Math.round(Math.max(...amounts)),
      isRecurring,
      frequency,
      isSubscription: isRecurring && isFixedPrice && frequency === 'monthly',
      isFixedPrice,
      nextPredicted: nextPredicted?.toISOString() || null,
      avgInterval: Math.round(avgInterval),
      priceVariation: Math.round(amountCV * 100),
      trend: trend ? (trend.slope > 0 ? 'increasing' : trend.slope < 0 ? 'decreasing' : 'stable') : 'unknown',
      loyaltyScore: Math.min(100, Math.round(data.transactions.length * 3 + data.totalSpent / 500)),
      preferredHours: data.transactions.reduce((acc, t) => {
        acc[t.hour] = (acc[t.hour] || 0) + 1;
        return acc;
      }, {}),
    };
  }

  // Find potential savings (subscriptions that can be cancelled)
  const subscriptions = Object.entries(merchantProfiles)
    .filter(([_, p]) => p.isSubscription)
    .map(([name, p]) => ({
      name: p.displayName,
      monthlyAmount: p.avgAmount,
      category: p.category,
    }));

  const modelData = {
    version: 1,
    merchantProfiles,
    totalMerchants: Object.keys(merchantProfiles).length,
    recurringMerchants: Object.values(merchantProfiles).filter(m => m.isRecurring).length,
    subscriptions,
    totalSubscriptionCost: sum(subscriptions.map(s => s.monthlyAmount)),
    trainedAt: new Date().toISOString(),
  };

  saveModel(userId, 'merchant_intelligence', modelData);

  return {
    success: true,
    totalMerchants: modelData.totalMerchants,
    recurringMerchants: modelData.recurringMerchants,
    subscriptionsDetected: subscriptions.length,
    totalSubscriptionCost: modelData.totalSubscriptionCost,
    topMerchants: Object.entries(merchantProfiles)
      .sort((a, b) => b[1].totalSpent - a[1].totalSpent)
      .slice(0, 10)
      .map(([_, p]) => ({
        name: p.displayName,
        totalSpent: p.totalSpent,
        count: p.transactionCount,
        isRecurring: p.isRecurring,
        frequency: p.frequency,
      })),
    trainedAt: new Date(),
  };
}

// ============================================================================
// §12  FINANCIAL SENTIMENT ANALYZER
// ============================================================================

async function trainSentimentAnalyzer(userId) {
  const data = await fetchAllData(userId);
  const txns = data.transactions;

  if (txns.length < 30) {
    return { success: false, message: 'Need at least 30 transactions for sentiment analysis' };
  }

  // Compute monthly financial sentiment based on multiple indicators
  const months = {};
  for (const t of txns) {
    const key = new Date(t.date).toISOString().slice(0, 7);
    if (!months[key]) months[key] = { income: 0, expenses: 0, savingsRate: 0, impulseCount: 0, totalCount: 0 };
    if (t.type === 'credit') months[key].income += Math.abs(t.amount);
    else {
      months[key].expenses += Math.abs(t.amount);
      // Detect impulse spending: late night, discretionary, above average
      const hour = new Date(t.date).getHours();
      const cat = (t.category || 'other').toLowerCase();
      const discCats = ['entertainment', 'shopping', 'dining', 'food', 'travel'];
      if (discCats.includes(cat) && (hour >= 22 || hour <= 5)) {
        months[key].impulseCount++;
      }
    }
    months[key].totalCount++;
  }

  const sortedKeys = Object.keys(months).sort();
  const sentimentScores = sortedKeys.map(k => {
    const m = months[k];
    m.savingsRate = m.income > 0 ? (m.income - m.expenses) / m.income : 0;
    let score = 50; // Neutral

    // Savings rate impact
    if (m.savingsRate >= 0.3) score += 25;
    else if (m.savingsRate >= 0.2) score += 15;
    else if (m.savingsRate >= 0.1) score += 5;
    else if (m.savingsRate >= 0) score -= 10;
    else score -= 25; // Negative savings

    // Impulse spending impact
    const impulseRate = m.totalCount > 0 ? m.impulseCount / m.totalCount : 0;
    score -= Math.round(impulseRate * 30);

    // Budget adherence impact
    const budgets = data.budgets.filter(b => {
      const budgetMonth = b.month || b.period;
      return budgetMonth === k || !budgetMonth;
    });
    if (budgets.length > 0) {
      const overBudget = budgets.filter(b => (b.spent || 0) > (b.amount || b.limit || Infinity));
      score -= overBudget.length * 5;
    }

    return { month: k, score: clamp(score, 0, 100), savingsRate: m.savingsRate, impulseRate };
  });

  // Overall sentiment
  const recentSentiments = sentimentScores.slice(-3);
  const overallSentiment = mean(recentSentiments.map(s => s.score));
  const sentimentTrend = sentimentScores.length >= 3
    ? linearRegression(sentimentScores.map((_, i) => i), sentimentScores.map(s => s.score))
    : { slope: 0, r2: 0 };

  const sentimentLabel =
    overallSentiment >= 80 ? 'Thriving' :
    overallSentiment >= 65 ? 'Positive' :
    overallSentiment >= 50 ? 'Neutral' :
    overallSentiment >= 35 ? 'Concerned' : 'Stressed';

  const modelData = {
    version: 1,
    overallSentiment: Math.round(overallSentiment),
    sentimentLabel,
    sentimentTrend: sentimentTrend.slope > 1 ? 'improving' : sentimentTrend.slope < -1 ? 'declining' : 'stable',
    monthlySentiments: sentimentScores,
    insights: {
      bestMonth: sentimentScores.reduce((best, s) => s.score > best.score ? s : best, sentimentScores[0]),
      worstMonth: sentimentScores.reduce((worst, s) => s.score < worst.score ? s : worst, sentimentScores[0]),
      avgImpulseRate: mean(sentimentScores.map(s => s.impulseRate)),
    },
    trainedAt: new Date().toISOString(),
  };

  saveModel(userId, 'sentiment_analyzer', modelData);

  return {
    success: true,
    overallSentiment: modelData.overallSentiment,
    sentimentLabel,
    sentimentTrend: modelData.sentimentTrend,
    monthsAnalyzed: sortedKeys.length,
    trainedAt: new Date(),
  };
}

// ============================================================================
// §13  MASTER TRAINING PIPELINE
// ============================================================================

async function trainAllModels(userId) {
  logger.info(`Starting comprehensive model training for user ${userId}`);
  const startTime = Date.now();
  const results = {};
  const errors = [];

  const trainers = [
    { name: 'categorizer', fn: () => trainCategorizer(userId) },
    { name: 'spendingPatterns', fn: () => trainSpendingPatterns(userId) },
    { name: 'anomalyBaselines', fn: () => trainAnomalyBaselines(userId) },
    { name: 'budgetOptimizer', fn: () => trainBudgetOptimizer(userId) },
    { name: 'riskProfile', fn: () => trainRiskProfile(userId) },
    { name: 'goalForecaster', fn: () => trainGoalForecaster(userId) },
    { name: 'lifestyleCluster', fn: () => trainLifestyleCluster(userId) },
    { name: 'incomePredictor', fn: () => trainIncomePredictor(userId) },
    { name: 'merchantIntelligence', fn: () => trainMerchantIntelligence(userId) },
    { name: 'sentimentAnalyzer', fn: () => trainSentimentAnalyzer(userId) },
  ];

  // Run all trainers in parallel
  const settledResults = await Promise.allSettled(trainers.map(t => t.fn()));

  for (let i = 0; i < trainers.length; i++) {
    const { name } = trainers[i];
    const result = settledResults[i];
    if (result.status === 'fulfilled') {
      results[name] = result.value;
    } else {
      errors.push({ model: name, error: result.reason?.message || 'Unknown error' });
      results[name] = { success: false, error: result.reason?.message };
    }
  }

  const elapsed = Date.now() - startTime;
  const successCount = Object.values(results).filter(r => r.success).length;
  const models = listModels(userId);

  logger.info(`Training complete for user ${userId}: ${successCount}/${trainers.length} models in ${elapsed}ms`);

  return {
    success: true,
    totalModels: trainers.length,
    successfulModels: successCount,
    failedModels: errors.length,
    trainingTime: elapsed,
    results,
    errors: errors.length > 0 ? errors : undefined,
    savedModels: models,
    trainedAt: new Date(),
  };
}

// ============================================================================
// §14  MODEL QUERY API
// ============================================================================

function getModelStatus(userId) {
  const models = listModels(userId);
  const expectedModels = [
    'categorizer_v2', 'spending_patterns', 'anomaly_baselines_v2',
    'budget_optimizer', 'risk_profile', 'goal_forecaster',
    'lifestyle_cluster', 'income_predictor', 'merchant_intelligence',
    'sentiment_analyzer',
  ];

  const status = expectedModels.map(name => {
    const found = models.find(m => m.name === name);
    return {
      name,
      trained: !!found,
      lastTrained: found?.lastTrained || null,
      size: found?.size || 0,
    };
  });

  return {
    totalExpected: expectedModels.length,
    totalTrained: status.filter(s => s.trained).length,
    models: status,
    needsTraining: status.filter(s => !s.trained).map(s => s.name),
    staleModels: status.filter(s => {
      if (!s.lastTrained) return false;
      const age = Date.now() - new Date(s.lastTrained).getTime();
      return age > 7 * DAY; // Stale after 7 days
    }).map(s => s.name),
  };
}

function getModelPrediction(userId, modelName) {
  const data = loadModel(userId, modelName);
  if (!data) return { success: false, error: `Model '${modelName}' not found. Run training first.` };
  return { success: true, model: modelName, data };
}

function classifyTransaction(userId, description, amount, merchantName) {
  // Try v2 model first
  let modelData = loadModel(userId, 'categorizer_v2');
  if (modelData) {
    return classifyWithModel(modelData, description, amount, merchantName);
  }

  // Try v1 model
  modelData = loadModel(userId, 'categorizer');
  if (modelData) {
    return classifyWithModel(modelData, description, amount, merchantName);
  }

  // Fallback: keyword-based classification
  return keywordClassify(description, amount, merchantName);
}

function keywordClassify(description, amount, merchantName) {
  const KEYWORD_MAP = {
    food: ['swiggy', 'zomato', 'restaurant', 'cafe', 'lunch', 'dinner', 'breakfast', 'meal', 'biryani', 'pizza', 'burger', 'kitchen', 'food', 'eat', 'hotel'],
    shopping: ['amazon', 'flipkart', 'myntra', 'ajio', 'mall', 'store', 'shop', 'mart', 'retail', 'bazaar', 'fashion'],
    entertainment: ['netflix', 'spotify', 'hotstar', 'prime', 'movie', 'cinema', 'theatre', 'game', 'concert', 'disney'],
    transport: ['uber', 'ola', 'rapido', 'metro', 'fuel', 'petrol', 'diesel', 'parking', 'toll', 'cab', 'taxi', 'auto'],
    utilities: ['electricity', 'water', 'gas', 'internet', 'wifi', 'broadband', 'airtel', 'jio', 'vi', 'bsnl', 'phone', 'recharge', 'dth'],
    healthcare: ['hospital', 'clinic', 'doctor', 'pharmacy', 'medical', 'apollo', 'medplus', 'medicine', 'lab', 'diagnostic', 'health'],
    education: ['school', 'college', 'university', 'course', 'udemy', 'coursera', 'tuition', 'coaching', 'books', 'exam'],
    rent: ['rent', 'landlord', 'lease', 'accommodation', 'pg', 'hostel'],
    investment: ['mutual fund', 'sip', 'stock', 'zerodha', 'groww', 'smallcase', 'etf', 'nps', 'ppf', 'fd', 'gold', 'coin'],
    insurance: ['lic', 'insurance', 'premium', 'policy', 'cover', 'hdfc life', 'icici pru', 'max life'],
    emi: ['emi', 'loan', 'repayment', 'installment', 'credit card bill'],
    salary: ['salary', 'payroll', 'income', 'wages', 'stipend', 'freelance', 'consulting'],
    transfer: ['neft', 'rtgs', 'imps', 'upi', 'transfer', 'sent to', 'paid to'],
    groceries: ['grocery', 'bigbasket', 'blinkit', 'instamart', 'dmart', 'supermarket', 'vegetables', 'fruits', 'kirana'],
    subscriptions: ['subscription', 'membership', 'premium', 'plan', 'monthly', 'annual'],
  };

  const text = `${description || ''} ${merchantName || ''}`.toLowerCase();
  let bestMatch = 'other', bestCount = 0;
  for (const [cat, keywords] of Object.entries(KEYWORD_MAP)) {
    const matchCount = keywords.filter(kw => text.includes(kw)).length;
    if (matchCount > bestCount) { bestCount = matchCount; bestMatch = cat; }
  }

  return {
    category: bestMatch,
    confidence: bestCount > 2 ? 85 : bestCount > 0 ? 65 : 30,
    method: 'keyword_matching',
    scores: [],
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Master training
  trainAllModels,

  // Individual trainers
  trainCategorizer,
  trainSpendingPatterns,
  trainAnomalyBaselines,
  trainBudgetOptimizer,
  trainRiskProfile,
  trainGoalForecaster,
  trainLifestyleCluster,
  trainIncomePredictor,
  trainMerchantIntelligence,
  trainSentimentAnalyzer,

  // Prediction / Query
  classifyTransaction,
  getModelStatus,
  getModelPrediction,

  // Utilities
  listModels,
  loadModel,
  saveModel,

  // ML Utilities (exposed for testing)
  _utils: {
    linearRegression,
    holtWinters,
    seasonalDecomposition,
    kMeansClustering,
    cosineSimilarity,
    pearsonCorrelation,
    tokenize,
    bigrams,
  },
};
