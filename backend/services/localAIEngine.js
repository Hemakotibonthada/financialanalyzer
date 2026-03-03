// ============================================================================
// LOCAL AI ENGINE — Self-Training Financial Intelligence
// ============================================================================
// Fully local ML engine: no external APIs needed.
// Implements: health scoring, recommendations, forecasting, anomaly detection,
//             pattern recognition, auto-categorization, insights generation,
//             and self-training model persistence.
// ============================================================================

const logger = require('../utils/logger');
const path   = require('path');
const fs     = require('fs');

// Lazy-loaded Mongoose models
const model = (name) => {
  try { return require(`../models/${name}`); }
  catch { return null; }
};

// ============================================================================
// §0  UTILITIES
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
const lerp  = (a, b, t) => a + (b - a) * t;
const fmt   = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const pct   = (n) => `${(n * 100).toFixed(1)}%`;
const ago   = (d) => new Date(Date.now() - d * DAY);

// Simple linear regression: returns { slope, intercept, r2 }
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

// Exponential smoothing
function expSmooth(data, alpha = 0.3) {
  if (!data.length) return [];
  const result = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

// Holt-Winters double exponential smoothing (trend-aware)
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

// Moving average
function movingAverage(data, window = 7) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    result.push(mean(slice));
  }
  return result;
}

// Z-score for anomaly detection
function zScore(value, arr) {
  const m = mean(arr);
  const s = stdDev(arr);
  return s ? (value - m) / s : 0;
}

// Cosine similarity between two arrays
function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] ** 2;
    magB += b[i] ** 2;
  }
  return (magA && magB) ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
}

// ============================================================================
// §1  MODEL PERSISTENCE — Save / load trained models to disk
// ============================================================================

const MODEL_DIR = path.join(__dirname, '..', 'data', 'models');

function ensureModelDir() {
  if (!fs.existsSync(MODEL_DIR)) fs.mkdirSync(MODEL_DIR, { recursive: true });
}

function saveModel(userId, modelName, data) {
  try {
    ensureModelDir();
    const filePath = path.join(MODEL_DIR, `${userId}_${modelName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
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

// ============================================================================
// §2  DATA FETCHERS — Gather user financial data from MongoDB
// ============================================================================

async function fetchTransactions(userId, days = 365) {
  const Transaction = model('Transaction');
  if (!Transaction) return [];
  return Transaction.find({
    userId,
    date: { $gte: ago(days) },
  }).sort({ date: 1 }).lean();
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

async function fetchProfile(userId) {
  const FinancialProfile = model('FinancialProfile');
  if (!FinancialProfile) return null;
  return FinancialProfile.findOne({ userId }).lean();
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

// Aggregate helper: fetch everything in parallel
async function fetchAllData(userId) {
  const [transactions, budgets, emis, investments, goals, debts, profile, accounts, insurance, subscriptions] =
    await Promise.all([
      fetchTransactions(userId, 365),
      fetchBudgets(userId),
      fetchEMIs(userId),
      fetchInvestments(userId),
      fetchGoals(userId),
      fetchDebts(userId),
      fetchProfile(userId),
      fetchBankAccounts(userId),
      fetchInsurance(userId),
      fetchSubscriptions(userId),
    ]);
  return { transactions, budgets, emis, investments, goals, debts, profile, accounts, insurance, subscriptions };
}

// ============================================================================
// §3  TRANSACTION ANALYTICS — Core computation layer
// ============================================================================

function computeMonthlyAggregates(transactions) {
  const months = {};
  for (const t of transactions) {
    const key = new Date(t.date).toISOString().slice(0, 7);
    if (!months[key]) months[key] = { income: 0, expenses: 0, count: 0, categories: {} };
    if (t.type === 'credit') months[key].income += Math.abs(t.amount);
    else {
      months[key].expenses += Math.abs(t.amount);
      const cat = t.category || 'other';
      months[key].categories[cat] = (months[key].categories[cat] || 0) + Math.abs(t.amount);
    }
    months[key].count++;
  }
  return months;
}

function computeWeeklyAggregates(transactions) {
  const weeks = {};
  for (const t of transactions) {
    const d = new Date(t.date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    if (!weeks[key]) weeks[key] = { income: 0, expenses: 0, count: 0 };
    if (t.type === 'credit') weeks[key].income += Math.abs(t.amount);
    else weeks[key].expenses += Math.abs(t.amount);
    weeks[key].count++;
  }
  return weeks;
}

function computeDailyAggregates(transactions) {
  const days = {};
  for (const t of transactions) {
    const key = new Date(t.date).toISOString().slice(0, 10);
    if (!days[key]) days[key] = { income: 0, expenses: 0, count: 0 };
    if (t.type === 'credit') days[key].income += Math.abs(t.amount);
    else days[key].expenses += Math.abs(t.amount);
    days[key].count++;
  }
  return days;
}

function computeCategoryBreakdown(transactions) {
  const cats = {};
  let total = 0;
  for (const t of transactions) {
    if (t.type !== 'debit') continue;
    const cat = t.category || 'other';
    const amt = Math.abs(t.amount);
    cats[cat] = (cats[cat] || 0) + amt;
    total += amt;
  }
  return Object.entries(cats)
    .map(([category, amount]) => ({ category, amount, percentage: total ? amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

function computeMerchantBreakdown(transactions) {
  const merchants = {};
  for (const t of transactions) {
    if (t.type !== 'debit') continue;
    const name = (t.merchantName || t.description || 'Unknown').toLowerCase().trim();
    if (!merchants[name]) merchants[name] = { count: 0, total: 0, amounts: [], category: t.category };
    merchants[name].count++;
    merchants[name].total += Math.abs(t.amount);
    merchants[name].amounts.push(Math.abs(t.amount));
  }
  return Object.entries(merchants)
    .map(([name, data]) => ({
      name,
      ...data,
      average: mean(data.amounts),
      stdDev: stdDev(data.amounts),
    }))
    .sort((a, b) => b.total - a.total);
}

// ============================================================================
// §4  HEALTH SCORE ENGINE — Comprehensive financial health (0-100)
// ============================================================================

const health = {
  async calculateHealthScore(userId) {
    const data = await fetchAllData(userId);
    const txns = data.transactions;
    const months = computeMonthlyAggregates(txns);
    const sortedKeys = Object.keys(months).sort();
    const recentMonths = sortedKeys.slice(-3);

    // --- Sub-scores (each 0-100) ---
    const scores = {};

    // 1. Savings Rate (25%)
    const recentIncome = sum(recentMonths.map((k) => months[k]?.income || 0));
    const recentExpenses = sum(recentMonths.map((k) => months[k]?.expenses || 0));
    const savingsRate = recentIncome > 0 ? (recentIncome - recentExpenses) / recentIncome : 0;
    scores.savingsRate = {
      score: clamp(Math.round(savingsRate * 200), 0, 100), // 50% savings = 100 score
      value: savingsRate,
      label: 'Savings Rate',
      detail: `${pct(savingsRate)} of income saved`,
      weight: 25,
      benchmark: 0.2,
      status: savingsRate >= 0.3 ? 'excellent' : savingsRate >= 0.2 ? 'good' : savingsRate >= 0.1 ? 'fair' : 'poor',
    };

    // 2. Budget Adherence (15%)
    const budgets = data.budgets;
    let budgetScore = 80; // default if no budgets
    if (budgets.length > 0) {
      const adherences = budgets.map((b) => {
        const spent = b.spent || 0;
        const limit = b.amount || b.limit || 1;
        return clamp(1 - Math.max(0, spent - limit) / limit, 0, 1);
      });
      budgetScore = Math.round(mean(adherences) * 100);
    }
    scores.budgetAdherence = {
      score: budgetScore,
      value: budgetScore / 100,
      label: 'Budget Discipline',
      detail: `${budgets.length} budgets tracked`,
      weight: 15,
      status: budgetScore >= 80 ? 'excellent' : budgetScore >= 60 ? 'good' : budgetScore >= 40 ? 'fair' : 'poor',
    };

    // 3. Debt-to-Income Ratio (20%)
    const monthlyEMI = sum((data.emis || []).filter((e) => e.status === 'active').map((e) => e.emiAmountInINR || e.emiAmount || 0));
    const monthlyIncome = recentMonths.length > 0 ? recentIncome / recentMonths.length : 0;
    const dtiRatio = monthlyIncome > 0 ? monthlyEMI / monthlyIncome : 0;
    scores.debtToIncome = {
      score: clamp(Math.round((1 - dtiRatio * 2.5) * 100), 0, 100),
      value: dtiRatio,
      label: 'Debt-to-Income',
      detail: `${pct(dtiRatio)} of income goes to EMIs`,
      weight: 20,
      benchmark: 0.36,
      status: dtiRatio <= 0.2 ? 'excellent' : dtiRatio <= 0.36 ? 'good' : dtiRatio <= 0.5 ? 'fair' : 'poor',
    };

    // 4. Emergency Fund (15%)
    const totalBalance = sum((data.accounts || []).map((a) => a.balance || 0));
    const avgMonthlyExpense = recentMonths.length > 0 ? recentExpenses / recentMonths.length : 1;
    const emergencyMonths = avgMonthlyExpense > 0 ? totalBalance / avgMonthlyExpense : 0;
    scores.emergencyFund = {
      score: clamp(Math.round((emergencyMonths / 6) * 100), 0, 100),
      value: emergencyMonths,
      label: 'Emergency Fund',
      detail: `${emergencyMonths.toFixed(1)} months of expenses covered`,
      weight: 15,
      benchmark: 6,
      status: emergencyMonths >= 6 ? 'excellent' : emergencyMonths >= 3 ? 'good' : emergencyMonths >= 1 ? 'fair' : 'poor',
    };

    // 5. Investment Diversity (10%)
    const investmentTypes = new Set((data.investments || []).map((i) => i.investmentType || i.type));
    const diversityScore = clamp(Math.round((investmentTypes.size / 5) * 100), 0, 100);
    scores.investmentDiversity = {
      score: diversityScore,
      value: investmentTypes.size,
      label: 'Investment Diversity',
      detail: `${investmentTypes.size} asset classes`,
      weight: 10,
      benchmark: 5,
      status: investmentTypes.size >= 5 ? 'excellent' : investmentTypes.size >= 3 ? 'good' : investmentTypes.size >= 1 ? 'fair' : 'poor',
    };

    // 6. Insurance Coverage (10%)
    const insuranceTypes = new Set((data.insurance || []).map((p) => p.policyType || p.type));
    const hasLife = insuranceTypes.has('life_term') || insuranceTypes.has('life_endowment') || insuranceTypes.has('life_ulip');
    const hasHealth = insuranceTypes.has('health_individual') || insuranceTypes.has('health_family');
    const insuranceScore = (hasLife ? 50 : 0) + (hasHealth ? 50 : 0);
    scores.insuranceCoverage = {
      score: insuranceScore,
      value: insuranceTypes.size,
      label: 'Insurance Coverage',
      detail: `${insuranceTypes.size} policies${hasLife ? ' (Life ✓)' : ''}${hasHealth ? ' (Health ✓)' : ''}`,
      weight: 10,
      status: insuranceScore >= 100 ? 'excellent' : insuranceScore >= 50 ? 'good' : insuranceScore > 0 ? 'fair' : 'poor',
    };

    // 7. Spending Consistency (5%)
    const monthlyExpenseValues = sortedKeys.slice(-6).map((k) => months[k]?.expenses || 0);
    const expenseVariation = monthlyExpenseValues.length > 1 ? stdDev(monthlyExpenseValues) / (mean(monthlyExpenseValues) || 1) : 0;
    const consistencyScore = clamp(Math.round((1 - expenseVariation) * 100), 0, 100);
    scores.spendingConsistency = {
      score: consistencyScore,
      value: expenseVariation,
      label: 'Spending Consistency',
      detail: `${pct(1 - expenseVariation)} consistency`,
      weight: 5,
      status: consistencyScore >= 80 ? 'excellent' : consistencyScore >= 60 ? 'good' : consistencyScore >= 40 ? 'fair' : 'poor',
    };

    // --- Weighted total ---
    let totalScore = 0;
    let totalWeight = 0;
    for (const s of Object.values(scores)) {
      totalScore += s.score * s.weight;
      totalWeight += s.weight;
    }
    const overallScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;

    const grade =
      overallScore >= 90 ? 'A+' : overallScore >= 80 ? 'A' : overallScore >= 70 ? 'B+'
      : overallScore >= 60 ? 'B' : overallScore >= 50 ? 'C' : overallScore >= 40 ? 'D' : 'F';

    const status =
      overallScore >= 80 ? 'excellent' : overallScore >= 60 ? 'good'
      : overallScore >= 40 ? 'fair' : 'poor';

    return {
      score: overallScore,
      grade,
      status,
      components: scores,
      summary: {
        monthlyIncome: monthlyIncome,
        monthlyExpenses: avgMonthlyExpense,
        savingsRate: savingsRate,
        totalBalance: totalBalance,
        totalDebt: sum((data.debts || []).map((d) => d.loanDetails?.currentBalance || 0)),
        totalInvestments: sum((data.investments || []).map((i) => i.currentValue || i.investedAmount || 0)),
      },
      generatedAt: new Date(),
    };
  },
};

// ============================================================================
// §5  RECOMMENDATIONS ENGINE — Personalized financial advice
// ============================================================================

const recommendations = {
  async generateRecommendations(userId) {
    const data = await fetchAllData(userId);
    const txns = data.transactions;
    const months = computeMonthlyAggregates(txns);
    const sortedKeys = Object.keys(months).sort();
    const recentKeys = sortedKeys.slice(-3);
    const catBreakdown = computeCategoryBreakdown(txns.filter((t) => recentKeys.some((k) => new Date(t.date).toISOString().startsWith(k))));
    const recs = [];

    // --- Income/Savings ---
    const totalIncome = sum(recentKeys.map((k) => months[k]?.income || 0)) / (recentKeys.length || 1);
    const totalExpenses = sum(recentKeys.map((k) => months[k]?.expenses || 0)) / (recentKeys.length || 1);
    const savingsRate = totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0;

    if (savingsRate < 0.1) {
      recs.push({
        id: 'low_savings',
        category: 'savings',
        priority: 'high',
        title: 'Critically Low Savings Rate',
        description: `You're saving only ${pct(savingsRate)} of income. Aim for at least 20%.`,
        impact: fmt(totalIncome * 0.1),
        impactLabel: 'potential monthly savings',
        actionItems: [
          'Review top 3 spending categories for cuts',
          'Set up auto-transfer of 10% salary to savings account',
          'Cancel unnecessary subscriptions',
        ],
        metrics: { current: savingsRate, target: 0.2, improvement: 0.2 - savingsRate },
      });
    } else if (savingsRate < 0.2) {
      recs.push({
        id: 'improve_savings',
        category: 'savings',
        priority: 'medium',
        title: 'Boost Your Savings Rate',
        description: `Your savings rate is ${pct(savingsRate)}. Top performers save 30%+.`,
        impact: fmt(totalIncome * 0.1),
        impactLabel: 'additional monthly savings possible',
        actionItems: [
          'Increase SIP contributions by 5%',
          'Switch to lower-cost alternatives for top spending categories',
          'Set specific savings goals with deadlines',
        ],
        metrics: { current: savingsRate, target: 0.3, improvement: 0.3 - savingsRate },
      });
    }

    // --- High spending categories ---
    for (const cat of catBreakdown.slice(0, 5)) {
      if (cat.percentage > 0.3 && cat.category !== 'emi' && cat.category !== 'rent') {
        recs.push({
          id: `high_spend_${cat.category}`,
          category: 'spending',
          priority: 'medium',
          title: `High ${cat.category.charAt(0).toUpperCase() + cat.category.slice(1)} Spending`,
          description: `${cat.category} accounts for ${pct(cat.percentage)} of your expenses (${fmt(cat.amount / (recentKeys.length || 1))}/month).`,
          impact: fmt(cat.amount * 0.15 / (recentKeys.length || 1)),
          impactLabel: 'potential monthly savings',
          actionItems: [
            `Set a monthly budget of ${fmt(cat.amount * 0.85 / (recentKeys.length || 1))} for ${cat.category}`,
            `Track ${cat.category} spending daily for awareness`,
            'Look for discount alternatives',
          ],
          metrics: { current: cat.amount / (recentKeys.length || 1), recommended: cat.amount * 0.85 / (recentKeys.length || 1) },
        });
      }
    }

    // --- Emergency Fund ---
    const totalBalance = sum((data.accounts || []).map((a) => a.balance || 0));
    const emergencyMonths = totalExpenses > 0 ? totalBalance / totalExpenses : 0;
    if (emergencyMonths < 3) {
      recs.push({
        id: 'emergency_fund',
        category: 'safety',
        priority: 'high',
        title: 'Build Emergency Fund',
        description: `You have ${emergencyMonths.toFixed(1)} months of expenses in savings. Target: 6 months.`,
        impact: fmt(totalExpenses * (6 - emergencyMonths)),
        impactLabel: 'to reach 6-month target',
        actionItems: [
          `Save ${fmt(totalExpenses * (6 - emergencyMonths) / 12)}/month to reach target in 1 year`,
          'Keep emergency fund in liquid FDs or savings account',
          'Avoid using emergency fund for planned expenses',
        ],
        metrics: { current: emergencyMonths, target: 6 },
      });
    }

    // --- Debt Optimization ---
    const emis = (data.emis || []).filter((e) => e.status === 'active');
    const highInterestEMIs = emis.filter((e) => (e.interestRate || 0) > 12);
    if (highInterestEMIs.length > 0) {
      const totalHighInterestDebt = sum(highInterestEMIs.map((e) => e.remainingAmount || e.principalAmountInINR || 0));
      recs.push({
        id: 'high_interest_debt',
        category: 'debt',
        priority: 'high',
        title: 'Tackle High-Interest Debt',
        description: `You have ${highInterestEMIs.length} EMI(s) with interest rates above 12%.`,
        impact: fmt(totalHighInterestDebt * 0.05),
        impactLabel: 'potential annual interest savings',
        actionItems: [
          'Consider balance transfer to a lower rate',
          'Prioritize prepaying the highest-rate EMI',
          'Negotiate with lender for rate reduction',
        ],
        metrics: { highInterestCount: highInterestEMIs.length, totalAmount: totalHighInterestDebt },
      });
    }

    // --- Investment diversification ---
    const investments = data.investments || [];
    const investmentTypes = new Set(investments.map((i) => i.investmentType || i.type));
    if (investments.length > 0 && investmentTypes.size < 3) {
      recs.push({
        id: 'diversify_investments',
        category: 'investment',
        priority: 'medium',
        title: 'Diversify Your Portfolio',
        description: `Your investments are concentrated in ${investmentTypes.size} asset class(es). Consider diversifying.`,
        impact: 'Reduced risk',
        impactLabel: 'through diversification',
        actionItems: [
          'Add debt funds or FDs for stability',
          'Consider international equity exposure',
          'Explore gold ETFs as a hedge',
          'Look into REITs for real estate exposure',
        ],
        metrics: { currentTypes: investmentTypes.size, recommended: 5 },
      });
    }

    // --- Insurance gaps ---
    const insuranceTypes = new Set((data.insurance || []).map((p) => p.policyType || p.type));
    const missingInsurance = [];
    if (!insuranceTypes.has('life_term') && !insuranceTypes.has('life_endowment'))
      missingInsurance.push('Term Life Insurance');
    if (!insuranceTypes.has('health_individual') && !insuranceTypes.has('health_family'))
      missingInsurance.push('Health Insurance');
    if (missingInsurance.length > 0) {
      recs.push({
        id: 'missing_insurance',
        category: 'insurance',
        priority: 'high',
        title: 'Critical Insurance Gaps',
        description: `You're missing: ${missingInsurance.join(', ')}.`,
        impact: 'Financial protection',
        impactLabel: 'against unexpected events',
        actionItems: missingInsurance.map((type) => `Get ${type} coverage immediately`),
        metrics: { missing: missingInsurance },
      });
    }

    // --- Subscription audit ---
    const subs = data.subscriptions || [];
    const monthlySubs = sum(subs.filter((s) => s.status === 'active').map((s) => s.amount || s.price || 0));
    if (monthlySubs > totalIncome * 0.05 && subs.length > 3) {
      recs.push({
        id: 'subscription_audit',
        category: 'spending',
        priority: 'low',
        title: 'Review Subscriptions',
        description: `You spend ${fmt(monthlySubs)}/month on ${subs.length} subscriptions (${pct(monthlySubs / (totalIncome || 1))} of income).`,
        impact: fmt(monthlySubs * 0.3),
        impactLabel: 'potential monthly savings',
        actionItems: [
          'Review each subscription for usage frequency',
          'Cancel unused or rarely-used subscriptions',
          'Look for annual plans for better rates',
        ],
        metrics: { totalMonthly: monthlySubs, count: subs.length },
      });
    }

    // --- Goal progress ---
    const goals = data.goals || [];
    const behindGoals = goals.filter((g) => {
      if (g.status !== 'active') return false;
      const progress = g.currentAmount / (g.targetAmount || 1);
      const timeElapsed = (Date.now() - new Date(g.createdAt).getTime()) / (new Date(g.targetDate).getTime() - new Date(g.createdAt).getTime());
      return progress < timeElapsed * 0.8;
    });

    if (behindGoals.length > 0) {
      recs.push({
        id: 'behind_goals',
        category: 'goals',
        priority: 'medium',
        title: `${behindGoals.length} Goal(s) Behind Schedule`,
        description: `You need to increase contributions to stay on track.`,
        impact: 'Goal achievement',
        impactLabel: 'at risk',
        actionItems: behindGoals.map((g) => {
          const remaining = (g.targetAmount || 0) - (g.currentAmount || 0);
          const monthsLeft = Math.max(1, Math.round((new Date(g.targetDate) - Date.now()) / (30 * DAY)));
          return `${g.name}: Save ${fmt(remaining / monthsLeft)}/month to stay on track`;
        }),
        metrics: { behindCount: behindGoals.length, totalGoals: goals.length },
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recs.sort((a, b) => (priorityOrder[a.priority] || 9) - (priorityOrder[b.priority] || 9));

    return {
      recommendations: recs,
      count: recs.length,
      generatedAt: new Date(),
    };
  },
};

// ============================================================================
// §6  FORECAST ENGINE — Spending, Income, Savings projections
// ============================================================================

const forecast = {
  async generateSpendingForecast(userId, days = 30) {
    const txns = await fetchTransactions(userId, 365);
    const debits = txns.filter((t) => t.type === 'debit');
    const months = computeMonthlyAggregates(debits);
    const sortedKeys = Object.keys(months).sort();
    const values = sortedKeys.map((k) => months[k]?.expenses || 0);

    if (values.length < 3) {
      return { success: false, error: 'Need at least 3 months of data for forecasting' };
    }

    // Apply Holt-Winters
    const hw = holtWinters(values, 0.3, 0.1, Math.ceil(days / 30));
    const catBreakdown = computeCategoryBreakdown(debits);

    // Per-category forecast
    const categoryForecasts = {};
    for (const cat of catBreakdown.slice(0, 10)) {
      const catTxns = debits.filter((t) => t.category === cat.category);
      const catMonths = computeMonthlyAggregates(catTxns);
      const catValues = sortedKeys.map((k) => catMonths[k]?.expenses || 0);
      if (catValues.length >= 3) {
        const catHW = holtWinters(catValues, 0.3, 0.1, Math.ceil(days / 30));
        categoryForecasts[cat.category] = {
          predicted: Math.round(catHW.forecast[0]),
          trend: catHW.trend > 0 ? 'increasing' : 'decreasing',
          trendRate: catValues.length > 1 ? pct((catHW.forecast[0] - catValues[catValues.length - 1]) / (catValues[catValues.length - 1] || 1)) : '0%',
        };
      }
    }

    // Confidence calculation
    const predicted = hw.forecast[0];
    const recent = values.slice(-3);
    const recentStd = stdDev(recent);
    const confidence = clamp(Math.round(100 - (recentStd / (mean(recent) || 1)) * 100), 30, 95);

    return {
      success: true,
      forecast: {
        period: `Next ${days} days`,
        predictedTotal: Math.round(predicted),
        range: {
          low: Math.round(Math.max(0, predicted - recentStd * 1.5)),
          mid: Math.round(predicted),
          high: Math.round(predicted + recentStd * 1.5),
        },
        confidence,
        trend: hw.trend > 0 ? 'increasing' : 'decreasing',
        trendAmount: Math.round(Math.abs(hw.trend)),
        monthlyPredictions: hw.forecast.map((v, i) => ({
          month: new Date(Date.now() + (i + 1) * 30 * DAY).toISOString().slice(0, 7),
          predicted: Math.round(v),
        })),
      },
      categoryForecasts,
      historical: sortedKeys.map((k, i) => ({
        month: k,
        actual: values[i],
        smoothed: Math.round(hw.smoothed[i] || values[i]),
      })),
      algorithm: 'holt_winters_double_exponential',
      dataPoints: txns.length,
      generatedAt: new Date(),
    };
  },

  async predictIncome(userId, months = 3) {
    const txns = await fetchTransactions(userId, 365);
    const credits = txns.filter((t) => t.type === 'credit');
    const monthAgg = computeMonthlyAggregates(credits);
    const sortedKeys = Object.keys(monthAgg).sort();
    const values = sortedKeys.map((k) => monthAgg[k]?.income || 0);

    if (values.length < 3) {
      return { success: false, error: 'Insufficient income data for prediction' };
    }

    const hw = holtWinters(values, 0.4, 0.1, months);
    const recent = values.slice(-3);
    const confidence = clamp(Math.round(100 - (stdDev(recent) / (mean(recent) || 1)) * 100), 30, 95);

    // Identify income sources
    const sources = {};
    for (const t of credits) {
      const src = t.category || t.merchantName || 'Other';
      sources[src] = (sources[src] || 0) + Math.abs(t.amount);
    }

    return {
      success: true,
      predictions: hw.forecast.map((v, i) => ({
        month: new Date(Date.now() + (i + 1) * 30 * DAY).toISOString().slice(0, 7),
        predicted: Math.round(v),
      })),
      confidence,
      trend: hw.trend > 0 ? 'growing' : 'declining',
      averageMonthly: Math.round(mean(recent)),
      sources: Object.entries(sources)
        .sort((a, b) => b[1] - a[1])
        .map(([source, total]) => ({ source, total: Math.round(total), monthly: Math.round(total / sortedKeys.length) })),
      generatedAt: new Date(),
    };
  },

  async analyzeSavingsPotential(userId) {
    const data = await fetchAllData(userId);
    const txns = data.transactions;
    const months = computeMonthlyAggregates(txns);
    const sortedKeys = Object.keys(months).sort();
    const recentKeys = sortedKeys.slice(-3);

    const avgIncome = mean(recentKeys.map((k) => months[k]?.income || 0));
    const avgExpenses = mean(recentKeys.map((k) => months[k]?.expenses || 0));
    const currentSavings = avgIncome - avgExpenses;
    const catBreakdown = computeCategoryBreakdown(
      txns.filter((t) => t.type === 'debit' && recentKeys.some((k) => new Date(t.date).toISOString().startsWith(k)))
    );

    // Identify discretionary spending that can be optimized
    const discretionary = ['entertainment', 'shopping', 'dining', 'food', 'travel', 'subscriptions'];
    const savingsOpportunities = catBreakdown
      .filter((c) => discretionary.includes(c.category?.toLowerCase()))
      .map((c) => ({
        category: c.category,
        currentMonthly: Math.round(c.amount / (recentKeys.length || 1)),
        suggestedCut: Math.round(c.amount * 0.2 / (recentKeys.length || 1)),
        reason: `Reduce by 20% through mindful spending`,
      }));

    const totalPotentialSavings = sum(savingsOpportunities.map((o) => o.suggestedCut));

    return {
      currentMonthlySavings: Math.round(currentSavings),
      savingsRate: avgIncome ? currentSavings / avgIncome : 0,
      potentialAdditional: totalPotentialSavings,
      optimizedSavings: Math.round(currentSavings + totalPotentialSavings),
      optimizedRate: avgIncome ? (currentSavings + totalPotentialSavings) / avgIncome : 0,
      opportunities: savingsOpportunities,
      projections: {
        oneYear: Math.round((currentSavings + totalPotentialSavings) * 12),
        threeYear: Math.round((currentSavings + totalPotentialSavings) * 12 * 3 * 1.08),
        fiveYear: Math.round((currentSavings + totalPotentialSavings) * 12 * 5 * 1.15),
      },
      generatedAt: new Date(),
    };
  },
};

// ============================================================================
// §7  ANOMALY DETECTION — Statistical outlier identification
// ============================================================================

const anomaly = {
  async detectAnomalies(userId) {
    const txns = await fetchTransactions(userId, 180);
    const debits = txns.filter((t) => t.type === 'debit');
    const anomalies = [];

    // --- 1. Amount anomalies per category ---
    const catGroups = {};
    for (const t of debits) {
      const cat = t.category || 'other';
      if (!catGroups[cat]) catGroups[cat] = [];
      catGroups[cat].push(t);
    }

    for (const [cat, catTxns] of Object.entries(catGroups)) {
      if (catTxns.length < 5) continue;
      const amounts = catTxns.map((t) => Math.abs(t.amount));
      const m = mean(amounts);
      const s = stdDev(amounts);
      if (s === 0) continue;

      for (const t of catTxns) {
        const z = Math.abs((Math.abs(t.amount) - m) / s);
        if (z > 2.5) {
          anomalies.push({
            id: `amt_${t._id || Date.now()}`,
            type: 'unusual_spending',
            severity: z > 3.5 ? 'critical' : z > 3 ? 'high' : 'medium',
            score: Math.min(100, Math.round(z * 25)),
            transaction: {
              id: t._id,
              amount: t.amount,
              description: t.description || t.merchantName,
              category: cat,
              date: t.date,
            },
            details: {
              expectedRange: { min: Math.round(m - s * 2), max: Math.round(m + s * 2) },
              averageForCategory: Math.round(m),
              zScore: Math.round(z * 100) / 100,
              deviationPercent: Math.round(((Math.abs(t.amount) - m) / m) * 100),
            },
            message: `${fmt(Math.abs(t.amount))} in ${cat} is ${Math.round(((Math.abs(t.amount) - m) / m) * 100)}% above average (${fmt(m)})`,
          });
        }
      }
    }

    // --- 2. Time-based anomalies (unusual time of day) ---
    for (const t of debits) {
      const hour = new Date(t.date).getHours();
      if ((hour >= 0 && hour < 5) && Math.abs(t.amount) > 500) {
        anomalies.push({
          id: `time_${t._id || Date.now()}`,
          type: 'time_anomaly',
          severity: 'medium',
          score: 65,
          transaction: {
            id: t._id,
            amount: t.amount,
            description: t.description || t.merchantName,
            category: t.category,
            date: t.date,
          },
          details: { hour, reason: 'Unusual transaction between midnight and 5 AM' },
          message: `Transaction at ${hour}:00 (${fmt(Math.abs(t.amount))}) — unusual activity time`,
        });
      }
    }

    // --- 3. Velocity anomalies (spending spikes) ---
    const daily = computeDailyAggregates(debits);
    const dailyValues = Object.values(daily).map((d) => d.expenses);
    if (dailyValues.length > 14) {
      const dailyMean = mean(dailyValues);
      const dailyStd = stdDev(dailyValues);
      for (const [date, data] of Object.entries(daily)) {
        const z = dailyStd ? (data.expenses - dailyMean) / dailyStd : 0;
        if (z > 2.5) {
          anomalies.push({
            id: `vel_${date}`,
            type: 'spending_spike',
            severity: z > 3.5 ? 'high' : 'medium',
            score: Math.min(100, Math.round(z * 25)),
            transaction: null,
            details: {
              date,
              dailySpend: Math.round(data.expenses),
              averageDaily: Math.round(dailyMean),
              multiplier: Math.round((data.expenses / (dailyMean || 1)) * 10) / 10,
            },
            message: `${date}: Spent ${fmt(data.expenses)} — ${Math.round(data.expenses / (dailyMean || 1))}x your daily average`,
          });
        }
      }
    }

    // --- 4. Duplicate transaction detection ---
    for (let i = 0; i < debits.length; i++) {
      for (let j = i + 1; j < Math.min(i + 10, debits.length); j++) {
        const a = debits[i], b = debits[j];
        if (
          Math.abs(a.amount) === Math.abs(b.amount) &&
          a.category === b.category &&
          Math.abs(new Date(a.date) - new Date(b.date)) < 2 * DAY &&
          (a.description || '').toLowerCase() === (b.description || '').toLowerCase()
        ) {
          anomalies.push({
            id: `dup_${a._id}_${b._id}`,
            type: 'duplicate_transaction',
            severity: 'medium',
            score: 70,
            transaction: {
              id: a._id,
              amount: a.amount,
              description: a.description,
              category: a.category,
              date: a.date,
            },
            details: { duplicateId: b._id, duplicateDate: b.date },
            message: `Possible duplicate: ${fmt(Math.abs(a.amount))} — ${a.description}`,
          });
          break;
        }
      }
    }

    anomalies.sort((a, b) => b.score - a.score);

    return {
      anomalies: anomalies.slice(0, 25),
      totalDetected: anomalies.length,
      summary: {
        critical: anomalies.filter((a) => a.severity === 'critical').length,
        high: anomalies.filter((a) => a.severity === 'high').length,
        medium: anomalies.filter((a) => a.severity === 'medium').length,
        low: anomalies.filter((a) => a.severity === 'low').length,
      },
      generatedAt: new Date(),
    };
  },
};

// ============================================================================
// §8  INSIGHTS ENGINE — Natural language financial insights
// ============================================================================

const insights = {
  async generateInsights(userId, period = 'month') {
    const days = period === 'week' ? 7 : period === 'quarter' ? 90 : 30;
    const txns = await fetchTransactions(userId, days * 3);
    const currentTxns = txns.filter((t) => new Date(t.date) >= ago(days));
    const prevTxns = txns.filter((t) => new Date(t.date) >= ago(days * 2) && new Date(t.date) < ago(days));

    const currentExpenses = sum(currentTxns.filter((t) => t.type === 'debit').map((t) => Math.abs(t.amount)));
    const prevExpenses = sum(prevTxns.filter((t) => t.type === 'debit').map((t) => Math.abs(t.amount)));
    const currentIncome = sum(currentTxns.filter((t) => t.type === 'credit').map((t) => Math.abs(t.amount)));
    const prevIncome = sum(prevTxns.filter((t) => t.type === 'credit').map((t) => Math.abs(t.amount)));

    const expenseChange = prevExpenses ? (currentExpenses - prevExpenses) / prevExpenses : 0;
    const incomeChange = prevIncome ? (currentIncome - prevIncome) / prevIncome : 0;
    const savingsRate = currentIncome > 0 ? (currentIncome - currentExpenses) / currentIncome : 0;

    const currentCats = computeCategoryBreakdown(currentTxns.filter((t) => t.type === 'debit'));
    const prevCats = computeCategoryBreakdown(prevTxns.filter((t) => t.type === 'debit'));

    const insightsList = [];

    // Overall spending trend
    insightsList.push({
      type: expenseChange > 0.1 ? 'warning' : expenseChange < -0.05 ? 'achievement' : 'trend',
      title: expenseChange > 0 ? 'Spending Increased' : 'Spending Decreased',
      description: `Your spending ${expenseChange > 0 ? 'increased' : 'decreased'} by ${pct(Math.abs(expenseChange))} compared to last ${period}. Current total: ${fmt(currentExpenses)}.`,
      impact: Math.abs(expenseChange) > 0.15 ? 'high' : Math.abs(expenseChange) > 0.05 ? 'medium' : 'low',
      actionable: expenseChange > 0.1,
      suggestedAction: expenseChange > 0.1 ? 'Review recent transactions for unnecessary expenses' : null,
      metrics: { current: currentExpenses, previous: prevExpenses, change: expenseChange },
    });

    // Savings rate
    insightsList.push({
      type: savingsRate >= 0.2 ? 'achievement' : savingsRate >= 0.1 ? 'suggestion' : 'warning',
      title: `Savings Rate: ${pct(savingsRate)}`,
      description: savingsRate >= 0.2
        ? `Excellent! You're saving ${pct(savingsRate)} of your income.`
        : `Your savings rate of ${pct(savingsRate)} is below the recommended 20%.`,
      impact: savingsRate < 0.1 ? 'high' : 'medium',
      actionable: savingsRate < 0.2,
      suggestedAction: savingsRate < 0.2 ? 'Set up auto-debit for savings on salary day' : null,
      metrics: { savingsRate, income: currentIncome, expenses: currentExpenses },
    });

    // Category changes
    for (const current of currentCats.slice(0, 5)) {
      const prev = prevCats.find((p) => p.category === current.category);
      if (prev) {
        const change = (current.amount - prev.amount) / (prev.amount || 1);
        if (Math.abs(change) > 0.2) {
          insightsList.push({
            type: change > 0 ? 'warning' : 'achievement',
            title: `${current.category.charAt(0).toUpperCase() + current.category.slice(1)} ${change > 0 ? 'Spike' : 'Drop'}`,
            description: `${current.category} spending ${change > 0 ? 'rose' : 'fell'} by ${pct(Math.abs(change))} (${fmt(current.amount)} vs ${fmt(prev.amount)}).`,
            impact: Math.abs(change) > 0.5 ? 'high' : 'medium',
            actionable: change > 0.2,
            suggestedAction: change > 0.3 ? `Set a budget cap for ${current.category}` : null,
            metrics: { category: current.category, current: current.amount, previous: prev.amount, change },
          });
        }
      }
    }

    // Largest single transaction insight
    const largestTxn = currentTxns.filter((t) => t.type === 'debit').sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];
    if (largestTxn && Math.abs(largestTxn.amount) > currentExpenses * 0.2) {
      insightsList.push({
        type: 'trend',
        title: 'Largest Transaction',
        description: `Your biggest expense was ${fmt(Math.abs(largestTxn.amount))} at ${largestTxn.description || largestTxn.merchantName || 'Unknown'} (${pct(Math.abs(largestTxn.amount) / currentExpenses)} of total spending).`,
        impact: Math.abs(largestTxn.amount) > currentExpenses * 0.4 ? 'high' : 'medium',
        actionable: false,
        metrics: { amount: largestTxn.amount, percentage: Math.abs(largestTxn.amount) / currentExpenses },
      });
    }

    // Transaction frequency
    const txnCount = currentTxns.filter((t) => t.type === 'debit').length;
    const avgPerDay = txnCount / (days || 1);
    insightsList.push({
      type: 'trend',
      title: 'Transaction Activity',
      description: `You made ${txnCount} transactions (avg ${avgPerDay.toFixed(1)}/day) this ${period}.`,
      impact: 'low',
      actionable: false,
      metrics: { total: txnCount, perDay: avgPerDay },
    });

    return {
      insights: insightsList,
      period,
      dateRange: { from: ago(days), to: new Date() },
      summary: {
        totalIncome: currentIncome,
        totalExpenses: currentExpenses,
        netSavings: currentIncome - currentExpenses,
        expenseChange,
        incomeChange,
        savingsRate,
        transactionCount: currentTxns.length,
      },
      generatedAt: new Date(),
    };
  },
};

// ============================================================================
// §9  PATTERN RECOGNITION — Recurring, merchant affinity, velocity
// ============================================================================

const patterns = {
  detectRecurringPatterns(transactions) {
    const merchantGroups = {};
    for (const t of transactions) {
      const key = (t.merchantName || t.description || '').toLowerCase().trim();
      if (!key) continue;
      if (!merchantGroups[key]) merchantGroups[key] = [];
      merchantGroups[key].push({ amount: Math.abs(t.amount), date: new Date(t.date) });
    }

    const recurring = [];
    for (const [merchant, txns] of Object.entries(merchantGroups)) {
      if (txns.length < 3) continue;
      txns.sort((a, b) => a.date - b.date);

      // Calculate intervals between transactions
      const intervals = [];
      for (let i = 1; i < txns.length; i++) {
        intervals.push((txns[i].date - txns[i - 1].date) / DAY);
      }

      const avgInterval = mean(intervals);
      const intervalStd = stdDev(intervals);
      const amounts = txns.map((t) => t.amount);
      const avgAmount = mean(amounts);
      const amountStd = stdDev(amounts);

      // Determine frequency
      let frequency = 'irregular';
      let isRecurring = false;
      const cv = avgInterval > 0 ? intervalStd / avgInterval : 999;

      if (cv < 0.3) {
        isRecurring = true;
        if (avgInterval >= 25 && avgInterval <= 35) frequency = 'monthly';
        else if (avgInterval >= 12 && avgInterval <= 17) frequency = 'bi-weekly';
        else if (avgInterval >= 5 && avgInterval <= 9) frequency = 'weekly';
        else if (avgInterval >= 85 && avgInterval <= 95) frequency = 'quarterly';
        else if (avgInterval >= 355 && avgInterval <= 375) frequency = 'yearly';
        else frequency = `every ${Math.round(avgInterval)} days`;
      }

      if (isRecurring) {
        const nextExpected = new Date(txns[txns.length - 1].date.getTime() + avgInterval * DAY);
        recurring.push({
          merchant: merchant.charAt(0).toUpperCase() + merchant.slice(1),
          frequency,
          averageAmount: Math.round(avgAmount),
          amountVariation: amountStd > 0 ? pct(amountStd / avgAmount) : '0%',
          lastDate: txns[txns.length - 1].date,
          nextExpected,
          occurrences: txns.length,
          totalSpent: Math.round(sum(amounts)),
          confidence: Math.round((1 - cv) * 100),
          isSubscription: frequency === 'monthly' && amountStd / (avgAmount || 1) < 0.05,
        });
      }
    }

    return recurring.sort((a, b) => b.confidence - a.confidence);
  },

  analyzeMerchantAffinity(transactions) {
    const debits = transactions.filter((t) => t.type === 'debit');
    const merchants = computeMerchantBreakdown(debits);

    return merchants.slice(0, 30).map((m) => ({
      name: m.name.charAt(0).toUpperCase() + m.name.slice(1),
      totalSpent: Math.round(m.total),
      transactionCount: m.count,
      averageAmount: Math.round(m.average),
      category: m.category || 'other',
      frequency: m.count >= 20 ? 'frequent' : m.count >= 10 ? 'regular' : m.count >= 5 ? 'occasional' : 'rare',
      loyaltyScore: Math.min(100, Math.round(m.count * 5 + m.total / 1000)),
    }));
  },

  detectVelocityChanges(transactions, windowDays = 7) {
    const daily = computeDailyAggregates(transactions);
    const dates = Object.keys(daily).sort();

    if (dates.length < windowDays * 2) {
      return { currentVelocity: 0, previousVelocity: 0, change: 0, status: 'insufficient_data' };
    }

    const recent = dates.slice(-windowDays);
    const previous = dates.slice(-windowDays * 2, -windowDays);
    const recentAvg = mean(recent.map((d) => daily[d]?.expenses || 0));
    const previousAvg = mean(previous.map((d) => daily[d]?.expenses || 0));
    const change = previousAvg ? (recentAvg - previousAvg) / previousAvg : 0;

    return {
      currentVelocity: Math.round(recentAvg),
      previousVelocity: Math.round(previousAvg),
      change,
      changePercent: pct(change),
      status: Math.abs(change) > 0.3 ? 'alert' : Math.abs(change) > 0.15 ? 'watch' : 'normal',
      direction: change > 0 ? 'accelerating' : 'decelerating',
      dailyBreakdown: dates.slice(-14).map((d) => ({
        date: d,
        spending: daily[d]?.expenses || 0,
        transactions: daily[d]?.count || 0,
      })),
    };
  },
};

// ============================================================================
// §10  AUTO-CATEGORIZATION — Self-training Naive Bayes classifier
// ============================================================================

// Token weight map (trained per user)
function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

async function trainCategorizer(userId) {
  const txns = await fetchTransactions(userId, 730);
  const categorized = txns.filter((t) => t.category && t.category !== 'other' && (t.description || t.merchantName));

  if (categorized.length < 20) {
    return { success: false, message: 'Need at least 20 categorized transactions to train' };
  }

  // Build word frequency maps per category
  const catCounts = {};
  const wordCounts = {};
  let totalDocs = 0;

  for (const t of categorized) {
    const cat = t.category;
    const words = tokenize(`${t.description || ''} ${t.merchantName || ''}`);
    if (words.length === 0) continue;

    catCounts[cat] = (catCounts[cat] || 0) + 1;
    if (!wordCounts[cat]) wordCounts[cat] = {};

    for (const w of words) {
      wordCounts[cat][w] = (wordCounts[cat][w] || 0) + 1;
    }
    totalDocs++;
  }

  // Build amount ranges per category
  const amountRanges = {};
  for (const t of categorized) {
    const cat = t.category;
    if (!amountRanges[cat]) amountRanges[cat] = [];
    amountRanges[cat].push(Math.abs(t.amount));
  }
  const amountStats = {};
  for (const [cat, amounts] of Object.entries(amountRanges)) {
    amountStats[cat] = { mean: mean(amounts), stdDev: stdDev(amounts), median: median(amounts) };
  }

  const modelData = { catCounts, wordCounts, totalDocs, amountStats, trainedAt: new Date().toISOString() };
  saveModel(userId, 'categorizer', modelData);

  return {
    success: true,
    categories: Object.keys(catCounts).length,
    dataPoints: totalDocs,
    topCategories: Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 10),
    trainedAt: new Date(),
  };
}

function classifyTransaction(userId, description, amount, merchantName) {
  const modelData = loadModel(userId, 'categorizer');

  // Fallback: keyword-based classification
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
  const words = tokenize(text);

  // If trained model exists, use Naive Bayes
  if (modelData && modelData.catCounts) {
    const { catCounts, wordCounts, totalDocs, amountStats } = modelData;
    const categories = Object.keys(catCounts);
    let bestCat = 'other';
    let bestScore = -Infinity;

    for (const cat of categories) {
      const catProb = Math.log((catCounts[cat] || 0) / totalDocs);
      let wordScore = 0;
      const vocabSize = new Set(Object.values(wordCounts).flatMap(Object.keys)).size;
      const catWordTotal = sum(Object.values(wordCounts[cat] || {}));

      for (const w of words) {
        const wordFreq = (wordCounts[cat]?.[w] || 0) + 1; // Laplace smoothing
        wordScore += Math.log(wordFreq / (catWordTotal + vocabSize));
      }

      // Amount likelihood
      let amountScore = 0;
      if (amount && amountStats[cat]) {
        const { mean: m, stdDev: s } = amountStats[cat];
        if (s > 0) {
          const z = Math.abs((Math.abs(amount) - m) / s);
          amountScore = -z * 0.5; // Penalize amounts far from category mean
        }
      }

      const totalScore = catProb + wordScore + amountScore;
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestCat = cat;
      }
    }

    return {
      category: bestCat,
      confidence: Math.min(95, Math.max(30, Math.round(60 + bestScore / 5))),
      method: 'naive_bayes',
      alternates: categories
        .map((c) => ({ category: c, probability: catCounts[c] / totalDocs }))
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 3),
    };
  }

  // Fallback: keyword matching
  let bestMatch = 'other';
  let bestCount = 0;
  for (const [cat, keywords] of Object.entries(KEYWORD_MAP)) {
    const matchCount = keywords.filter((kw) => text.includes(kw)).length;
    if (matchCount > bestCount) {
      bestCount = matchCount;
      bestMatch = cat;
    }
  }

  return {
    category: bestMatch,
    confidence: bestCount > 2 ? 85 : bestCount > 0 ? 65 : 30,
    method: 'keyword_matching',
    alternates: [],
  };
}

// ============================================================================
// §11  MODEL TRAINING — Train all models for a user
// ============================================================================

async function trainModels(userId) {
  const results = {};

  // 1. Train categorizer
  results.categorizer = await trainCategorizer(userId);

  // 2. Train spending predictor (save statistical model)
  const txns = await fetchTransactions(userId, 365);
  const debits = txns.filter((t) => t.type === 'debit');
  const months = computeMonthlyAggregates(debits);
  const sortedKeys = Object.keys(months).sort();
  const values = sortedKeys.map((k) => months[k]?.expenses || 0);

  if (values.length >= 3) {
    const hw = holtWinters(values, 0.3, 0.1, 6);
    const spendingModel = {
      level: hw.level,
      trend: hw.trend,
      lastValues: values.slice(-6),
      monthKeys: sortedKeys.slice(-6),
      trainedAt: new Date().toISOString(),
    };
    saveModel(userId, 'spending_predictor', spendingModel);
    results.spendingPredictor = { success: true, months: values.length, level: Math.round(hw.level), trend: Math.round(hw.trend) };
  } else {
    results.spendingPredictor = { success: false, message: 'Insufficient data' };
  }

  // 3. Category risk profile (anomaly baselines)
  const catGroups = {};
  for (const t of debits) {
    const cat = t.category || 'other';
    if (!catGroups[cat]) catGroups[cat] = [];
    catGroups[cat].push(Math.abs(t.amount));
  }
  const anomalyBaselines = {};
  for (const [cat, amounts] of Object.entries(catGroups)) {
    anomalyBaselines[cat] = { mean: mean(amounts), stdDev: stdDev(amounts), count: amounts.length, p95: percentile(amounts, 95) };
  }
  saveModel(userId, 'anomaly_baselines', { baselines: anomalyBaselines, trainedAt: new Date().toISOString() });
  results.anomalyBaselines = { success: true, categories: Object.keys(anomalyBaselines).length };

  // 4. Merchant frequency model
  const merchantData = computeMerchantBreakdown(debits);
  saveModel(userId, 'merchant_model', {
    merchants: merchantData.slice(0, 50).map((m) => ({
      name: m.name,
      count: m.count,
      avgAmount: Math.round(m.average),
      category: m.category,
    })),
    trainedAt: new Date().toISOString(),
  });
  results.merchantModel = { success: true, merchants: Math.min(50, merchantData.length) };

  return {
    success: true,
    models: results,
    totalTransactions: txns.length,
    trainedAt: new Date(),
  };
}

// ============================================================================
// §12  CATEGORIZE (convenience wrapper for routes)
// ============================================================================

async function categorize(userId, description, amount, merchantName) {
  return classifyTransaction(userId, description, amount, merchantName);
}

// ============================================================================
// §13  AI DASHBOARD — Single endpoint with all AI data
// ============================================================================

async function getAIDashboard(userId) {
  try {
    const [healthScore, recs, spendForecast, anomalies, insightsData] = await Promise.all([
      health.calculateHealthScore(userId),
      recommendations.generateRecommendations(userId),
      forecast.generateSpendingForecast(userId, 30),
      anomaly.detectAnomalies(userId),
      insights.generateInsights(userId, 'month'),
    ]);

    // Get some pattern data
    const txns = await fetchTransactions(userId, 180);
    const debits = txns.filter((t) => t.type === 'debit');
    const recurringPatterns = patterns.detectRecurringPatterns(debits);

    return {
      success: true,
      healthScore,
      recommendations: recs,
      forecast: spendForecast,
      anomalies,
      insights: insightsData,
      patterns: {
        recurring: recurringPatterns.slice(0, 10),
        totalRecurring: recurringPatterns.length,
        monthlyRecurringCost: sum(recurringPatterns.filter((p) => p.frequency === 'monthly').map((p) => p.averageAmount)),
      },
      generatedAt: new Date(),
    };
  } catch (error) {
    logger.error('AI Dashboard error:', error);
    return {
      success: false,
      error: error.message,
      healthScore: { score: 50, grade: 'N/A', status: 'unknown', components: {} },
      recommendations: { recommendations: [], count: 0 },
      forecast: { success: false },
      anomalies: { anomalies: [], totalDetected: 0 },
      insights: { insights: [], period: 'month' },
      patterns: { recurring: [], totalRecurring: 0 },
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Dashboard
  getAIDashboard,

  // Sub-engines (used by routes)
  health,
  recommendations,
  forecast,
  anomaly,
  insights,
  patterns,

  // Training
  trainModels,

  // Categorization
  categorize,

  // Utilities (exposed for testing)
  _utils: { linearRegression, holtWinters, expSmooth, movingAverage, zScore, cosineSimilarity },
};
