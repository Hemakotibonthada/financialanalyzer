// ============================================================================
// NLP CHAT ENGINE — Local Natural Language Processing for Financial Chat
// ============================================================================
// Provides intelligent financial chat without external AI APIs.
// Features: intent detection, entity extraction, context-aware responses,
//           financial Q&A, command parsing, and suggestion generation.
// ============================================================================

const logger = require('../utils/logger');

// ============================================================================
// §0  INTENT DEFINITIONS
// ============================================================================

const INTENTS = {
  // Spending queries
  SPENDING_TOTAL:     { keywords: ['how much', 'spent', 'spending', 'total spend', 'expenses', 'expenditure'], category: 'spending' },
  SPENDING_CATEGORY:  { keywords: ['spend on', 'spent on', 'category', 'where did', 'breakdown'], category: 'spending' },
  SPENDING_COMPARE:   { keywords: ['compared to', 'vs last', 'more than', 'less than', 'this month vs'], category: 'spending' },
  SPENDING_FORECAST:  { keywords: ['forecast', 'predict', 'will i spend', 'project', 'expected spending'], category: 'spending' },
  SPENDING_TREND:     { keywords: ['trend', 'pattern', 'over time', 'monthly trend', 'habit'], category: 'spending' },

  // Income queries
  INCOME_TOTAL:       { keywords: ['income', 'earned', 'salary', 'received', 'earn'], category: 'income' },
  INCOME_FORECAST:    { keywords: ['next salary', 'when salary', 'income forecast', 'expect to earn'], category: 'income' },
  INCOME_SOURCES:     { keywords: ['income source', 'where income', 'from where', 'earning from'], category: 'income' },

  // Savings queries
  SAVINGS_STATUS:     { keywords: ['savings', 'saved', 'how much saved', 'money saved', 'net savings'], category: 'savings' },
  SAVINGS_GOAL:       { keywords: ['save for', 'savings goal', 'target savings', 'goal progress'], category: 'savings' },
  SAVINGS_TIPS:       { keywords: ['save more', 'saving tips', 'reduce spending', 'cut costs', 'budget tips'], category: 'savings' },

  // Budget queries
  BUDGET_STATUS:      { keywords: ['budget', 'within budget', 'over budget', 'budget left', 'remaining budget'], category: 'budget' },
  BUDGET_OPTIMIZE:    { keywords: ['optimize budget', 'better budget', 'ideal budget', 'budget suggestion', 'budget recommend'], category: 'budget' },
  BUDGET_CREATE:      { keywords: ['create budget', 'set budget', 'new budget', 'make budget'], category: 'budget' },

  // Investment queries
  INVESTMENT_STATUS:  { keywords: ['investments', 'portfolio', 'invested', 'returns', 'roi'], category: 'investment' },
  INVESTMENT_SUGGEST: { keywords: ['invest', 'where to invest', 'investment suggestion', 'investment recommend'], category: 'investment' },
  INVESTMENT_RISK:    { keywords: ['risk', 'risk score', 'risk level', 'risk profile', 'risk assessment'], category: 'investment' },

  // EMI/Debt queries
  EMI_STATUS:         { keywords: ['emi', 'loan', 'debt', 'installment', 'repayment'], category: 'emi' },
  EMI_UPCOMING:       { keywords: ['upcoming emi', 'next emi', 'due emi', 'payment due', 'next payment'], category: 'emi' },
  EMI_PAYOFF:         { keywords: ['pay off', 'close loan', 'prepay', 'foreclose', 'payoff strategy'], category: 'emi' },

  // Goal queries
  GOAL_STATUS:        { keywords: ['goal', 'target', 'progress', 'milestone', 'achieve'], category: 'goal' },
  GOAL_CREATE:        { keywords: ['create goal', 'new goal', 'set goal', 'add goal'], category: 'goal' },

  // Health/Score queries
  HEALTH_SCORE:       { keywords: ['health score', 'financial health', 'score', 'credit score', 'cibil'], category: 'health' },
  HEALTH_IMPROVE:     { keywords: ['improve score', 'improve health', 'better score', 'increase score'], category: 'health' },

  // Anomaly queries
  ANOMALY_CHECK:      { keywords: ['unusual', 'suspicious', 'anomaly', 'abnormal', 'fraud', 'strange'], category: 'anomaly' },

  // General
  GREETING:           { keywords: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'namaste'], category: 'general' },
  HELP:               { keywords: ['help', 'what can you', 'commands', 'features', 'how to'], category: 'general' },
  THANK:              { keywords: ['thank', 'thanks', 'appreciate', 'great', 'awesome'], category: 'general' },
  SUMMARY:            { keywords: ['summary', 'overview', 'dashboard', 'quick look', 'snapshot'], category: 'general' },
};

// ============================================================================
// §1  ENTITY EXTRACTION
// ============================================================================

function extractEntities(text) {
  const entities = {};
  const lower = text.toLowerCase();

  // Time periods
  const periodPatterns = [
    { pattern: /this month/i, value: 'this_month' },
    { pattern: /last month/i, value: 'last_month' },
    { pattern: /this week/i, value: 'this_week' },
    { pattern: /last week/i, value: 'last_week' },
    { pattern: /today/i, value: 'today' },
    { pattern: /yesterday/i, value: 'yesterday' },
    { pattern: /this year/i, value: 'this_year' },
    { pattern: /last year/i, value: 'last_year' },
    { pattern: /last (\d+) (?:days?|months?|weeks?|years?)/i, value: null },
    { pattern: /(?:in|for) (\w+ \d{4})/i, value: null },
    { pattern: /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w* \d{4}/i, value: null },
  ];

  for (const { pattern, value } of periodPatterns) {
    const match = lower.match(pattern);
    if (match) {
      entities.period = value || match[0];
      break;
    }
  }

  // Categories
  const categoryKeywords = {
    food: ['food', 'restaurant', 'dining', 'eat', 'swiggy', 'zomato', 'lunch', 'dinner'],
    shopping: ['shopping', 'amazon', 'flipkart', 'clothes', 'electronics', 'myntra'],
    entertainment: ['entertainment', 'movies', 'netflix', 'games', 'spotify', 'hotstar'],
    transport: ['transport', 'uber', 'ola', 'fuel', 'petrol', 'cab', 'travel'],
    utilities: ['utilities', 'electricity', 'water', 'internet', 'phone', 'bill'],
    groceries: ['groceries', 'grocery', 'vegetables', 'bigbasket', 'blinkit'],
    healthcare: ['healthcare', 'medical', 'doctor', 'hospital', 'medicine'],
    education: ['education', 'school', 'course', 'books', 'tuition'],
    rent: ['rent', 'housing', 'apartment'],
    investment: ['investment', 'mutual fund', 'stocks', 'sip', 'fd'],
    insurance: ['insurance', 'premium', 'lic', 'policy'],
    emi: ['emi', 'loan', 'installment', 'repayment'],
  };

  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => lower.includes(kw))) {
      entities.category = cat;
      break;
    }
  }

  // Amounts
  const amountMatch = lower.match(/(?:₹|rs\.?|inr)\s*([0-9,]+(?:\.\d{2})?)/);
  if (amountMatch) {
    entities.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }
  // Also match plain amounts with currency context
  const plainAmount = lower.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:rupees?|rs|inr)/);
  if (plainAmount && !entities.amount) {
    entities.amount = parseFloat(plainAmount[1].replace(/,/g, ''));
  }

  // Merchant names
  const merchantPatterns = ['at (\\w+)', 'from (\\w+)', 'to (\\w+)', 'on (\\w+)'];
  for (const mp of merchantPatterns) {
    const match = lower.match(new RegExp(mp));
    if (match) {
      const name = match[1];
      // Skip common prepositions and time words
      if (!['the', 'a', 'an', 'my', 'this', 'last', 'next', 'end', 'start', 'monday', 'tuesday',
            'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(name)) {
        entities.merchant = name;
        break;
      }
    }
  }

  // Numbers for limits/counts
  const numMatch = lower.match(/(?:top|last|first|recent)\s+(\d+)/);
  if (numMatch) {
    entities.limit = parseInt(numMatch[1]);
  }

  return entities;
}

// ============================================================================
// §2  INTENT DETECTION
// ============================================================================

function detectIntent(text) {
  const lower = text.toLowerCase().trim();
  let bestIntent = null;
  let bestScore = 0;

  for (const [intent, config] of Object.entries(INTENTS)) {
    let score = 0;
    for (const keyword of config.keywords) {
      if (lower.includes(keyword)) {
        score += keyword.split(' ').length; // Multi-word matches score higher
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  // If no intent matched, try n-gram matching
  if (!bestIntent) {
    const words = lower.split(/\s+/);
    for (const [intent, config] of Object.entries(INTENTS)) {
      for (const keyword of config.keywords) {
        const kWords = keyword.split(' ');
        const overlap = kWords.filter(kw => words.includes(kw)).length;
        const score = overlap / kWords.length;
        if (score > 0.5 && score > bestScore) {
          bestScore = score;
          bestIntent = intent;
        }
      }
    }
  }

  return {
    intent: bestIntent || 'UNKNOWN',
    category: bestIntent ? INTENTS[bestIntent]?.category : 'unknown',
    confidence: bestScore > 3 ? 95 : bestScore > 2 ? 85 : bestScore > 1 ? 70 : bestScore > 0 ? 55 : 30,
  };
}

// ============================================================================
// §3  RESPONSE GENERATORS
// ============================================================================

function getPeriodBounds(period) {
  const now = new Date();
  switch (period) {
    case 'today':
      return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end: now };
    case 'yesterday': {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return { start: new Date(y.getFullYear(), y.getMonth(), y.getDate()), end: new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59) };
    }
    case 'this_week': {
      const day = now.getDay();
      const start = new Date(now); start.setDate(now.getDate() - day); start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }
    case 'last_week': {
      const day = now.getDay();
      const end = new Date(now); end.setDate(now.getDate() - day - 1); end.setHours(23, 59, 59);
      const start = new Date(end); start.setDate(end.getDate() - 6); start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case 'this_month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    case 'last_month':
      return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59) };
    case 'this_year':
      return { start: new Date(now.getFullYear(), 0, 1), end: now };
    case 'last_year':
      return { start: new Date(now.getFullYear() - 1, 0, 1), end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59) };
    default: {
      // Default to this month
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    }
  }
}

function formatCurrency(amount) {
  return `₹${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function periodLabel(period) {
  const labels = {
    today: 'today',
    yesterday: 'yesterday',
    this_week: 'this week',
    last_week: 'last week',
    this_month: 'this month',
    last_month: 'last month',
    this_year: 'this year',
    last_year: 'last year',
  };
  return labels[period] || 'this month';
}

// ============================================================================
// §4  FINANCIAL DATA PROCESSORS
// ============================================================================

function processSpendingTotal(transactions, entities) {
  const period = entities.period || 'this_month';
  const { start, end } = getPeriodBounds(period);
  const filtered = transactions.filter(t =>
    t.type === 'debit' &&
    new Date(t.date) >= start &&
    new Date(t.date) <= end &&
    (!entities.category || t.category === entities.category)
  );

  const total = filtered.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const count = filtered.length;

  if (entities.category) {
    return {
      text: `You spent **${formatCurrency(total)}** on **${entities.category}** ${periodLabel(period)} across ${count} transactions.`,
      data: { total, count, category: entities.category, period },
      suggestions: [`Compare ${entities.category} spending to last month`, `Show ${entities.category} spending trend`, 'How to reduce spending?'],
    };
  }

  return {
    text: `Your total spending ${periodLabel(period)} is **${formatCurrency(total)}** across **${count} transactions**.`,
    data: { total, count, period },
    suggestions: ['Show category breakdown', 'Compare with last month', 'Top spending categories'],
  };
}

function processSpendingCategory(transactions, entities) {
  const period = entities.period || 'this_month';
  const { start, end } = getPeriodBounds(period);
  const filtered = transactions.filter(t =>
    t.type === 'debit' &&
    new Date(t.date) >= start &&
    new Date(t.date) <= end
  );

  const categories = {};
  for (const t of filtered) {
    const cat = t.category || 'other';
    categories[cat] = (categories[cat] || 0) + Math.abs(t.amount);
  }

  const sorted = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, entities.limit || 10);

  const total = Object.values(categories).reduce((s, v) => s + v, 0);
  const breakdown = sorted.map(([cat, amt]) => ({
    category: cat,
    amount: Math.round(amt),
    percentage: total > 0 ? Math.round(amt / total * 100) : 0,
  }));

  let text = `Here's your spending breakdown ${periodLabel(period)}:\n\n`;
  for (const { category, amount, percentage } of breakdown) {
    text += `• **${category}**: ${formatCurrency(amount)} (${percentage}%)\n`;
  }
  text += `\n**Total**: ${formatCurrency(total)}`;

  return {
    text,
    data: { breakdown, total, period },
    chartType: 'pie',
    suggestions: ['Show monthly trend', 'Where can I save?', 'Compare with last month'],
  };
}

function processSpendingCompare(transactions, entities) {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const thisMonthTxns = transactions.filter(t => t.type === 'debit' && new Date(t.date) >= thisMonth);
  const lastMonthTxns = transactions.filter(t => t.type === 'debit' && new Date(t.date) >= lastMonthStart && new Date(t.date) <= lastMonthEnd);

  const thisTotal = thisMonthTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
  const lastTotal = lastMonthTxns.reduce((s, t) => s + Math.abs(t.amount), 0);

  const change = lastTotal > 0 ? Math.round((thisTotal - lastTotal) / lastTotal * 100) : 0;
  const direction = change > 0 ? 'increased' : change < 0 ? 'decreased' : 'remained the same';
  const emoji = change > 5 ? '📈' : change < -5 ? '📉' : '➡️';

  // Category-level comparison
  const catThis = {}, catLast = {};
  for (const t of thisMonthTxns) { catThis[t.category || 'other'] = (catThis[t.category || 'other'] || 0) + Math.abs(t.amount); }
  for (const t of lastMonthTxns) { catLast[t.category || 'other'] = (catLast[t.category || 'other'] || 0) + Math.abs(t.amount); }

  const allCats = [...new Set([...Object.keys(catThis), ...Object.keys(catLast)])];
  const catChanges = allCats.map(cat => ({
    category: cat,
    thisMonth: Math.round(catThis[cat] || 0),
    lastMonth: Math.round(catLast[cat] || 0),
    change: Math.round((catThis[cat] || 0) - (catLast[cat] || 0)),
  })).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  const biggestIncrease = catChanges.find(c => c.change > 0);
  const biggestDecrease = catChanges.find(c => c.change < 0);

  let text = `${emoji} Your spending this month has **${direction}** by **${Math.abs(change)}%**.\n\n`;
  text += `• **This month**: ${formatCurrency(thisTotal)}\n`;
  text += `• **Last month**: ${formatCurrency(lastTotal)}\n`;
  text += `• **Difference**: ${formatCurrency(Math.abs(thisTotal - lastTotal))} ${change > 0 ? 'more' : 'less'}\n\n`;

  if (biggestIncrease) text += `📊 Biggest increase: **${biggestIncrease.category}** (+${formatCurrency(biggestIncrease.change)})\n`;
  if (biggestDecrease) text += `📊 Biggest decrease: **${biggestDecrease.category}** (${formatCurrency(biggestDecrease.change)})\n`;

  return {
    text,
    data: { thisTotal, lastTotal, change, catChanges: catChanges.slice(0, 8) },
    chartType: 'bar',
    suggestions: ['Show spending trend over 6 months', 'Category breakdown this month', 'How to reduce spending?'],
  };
}

function processIncomeTotal(transactions, entities) {
  const period = entities.period || 'this_month';
  const { start, end } = getPeriodBounds(period);
  const credits = transactions.filter(t =>
    t.type === 'credit' &&
    new Date(t.date) >= start &&
    new Date(t.date) <= end
  );

  const total = credits.reduce((s, t) => s + Math.abs(t.amount), 0);
  const sources = {};
  for (const t of credits) {
    const source = t.category || t.merchantName || 'Other';
    sources[source] = (sources[source] || 0) + Math.abs(t.amount);
  }

  let text = `Your total income ${periodLabel(period)} is **${formatCurrency(total)}**.\n\n`;
  const sortedSources = Object.entries(sources).sort((a, b) => b[1] - a[1]);
  if (sortedSources.length > 0) {
    text += 'Income sources:\n';
    for (const [source, amt] of sortedSources.slice(0, 5)) {
      text += `• **${source}**: ${formatCurrency(amt)}\n`;
    }
  }

  return {
    text,
    data: { total, sources: Object.fromEntries(sortedSources), period },
    suggestions: ['Show income trend', 'How does income compare to expenses?', 'Savings rate this month'],
  };
}

function processSavingsStatus(transactions, entities) {
  const period = entities.period || 'this_month';
  const { start, end } = getPeriodBounds(period);
  const filtered = transactions.filter(t =>
    new Date(t.date) >= start &&
    new Date(t.date) <= end
  );

  const income = filtered.filter(t => t.type === 'credit').reduce((s, t) => s + Math.abs(t.amount), 0);
  const expenses = filtered.filter(t => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0);
  const savings = income - expenses;
  const savingsRate = income > 0 ? Math.round(savings / income * 100) : 0;

  let text = `Your savings ${periodLabel(period)}:\n\n`;
  text += `• **Income**: ${formatCurrency(income)}\n`;
  text += `• **Expenses**: ${formatCurrency(expenses)}\n`;
  text += `• **Savings**: ${formatCurrency(savings)} (${savingsRate}% savings rate)\n\n`;

  if (savingsRate >= 30) text += '🌟 Excellent! You\'re saving more than 30% of your income.';
  else if (savingsRate >= 20) text += '👍 Good job! You\'re hitting the recommended 20% savings rate.';
  else if (savingsRate >= 10) text += '💡 You\'re saving, but try to aim for 20% for better financial health.';
  else if (savingsRate > 0) text += '⚠️ Your savings rate is low. Consider reviewing your discretionary spending.';
  else text += '🚨 You\'re spending more than you earn. Let me help you find areas to cut back.';

  return {
    text,
    data: { income, expenses, savings, savingsRate, period },
    suggestions: ['Where can I save more?', 'Show budget status', 'Set a savings goal'],
  };
}

function processBudgetStatus(transactions, budgets, entities) {
  if (budgets.length === 0) {
    return {
      text: 'You don\'t have any budgets set up yet. Would you like me to help you create one based on your spending patterns?',
      data: { hasBudgets: false },
      suggestions: ['Create a budget from spending patterns', 'What\'s the 50/30/20 rule?', 'Show spending breakdown'],
    };
  }

  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthTxns = transactions.filter(t =>
    t.type === 'debit' && new Date(t.date) >= thisMonth
  );

  let text = 'Here\'s your budget status for this month:\n\n';
  let overBudgetCount = 0;
  const budgetDetails = [];

  for (const b of budgets) {
    const cat = b.category || 'other';
    const limit = b.amount || b.limit || 0;
    const spent = thisMonthTxns
      .filter(t => (t.category || 'other') === cat)
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    const remaining = limit - spent;
    const percentage = limit > 0 ? Math.round(spent / limit * 100) : 0;
    const isOver = spent > limit;
    if (isOver) overBudgetCount++;

    const bar = percentage <= 100
      ? '█'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10))
      : '█'.repeat(10) + '🔴';

    text += `**${cat}**: ${bar} ${percentage}% (${formatCurrency(spent)} / ${formatCurrency(limit)})\n`;
    if (isOver) text += `   ⚠️ Over by ${formatCurrency(Math.abs(remaining))}\n`;

    budgetDetails.push({ category: cat, limit, spent: Math.round(spent), remaining: Math.round(remaining), percentage, isOver });
  }

  text += `\n**Summary**: ${overBudgetCount} of ${budgets.length} budgets exceeded`;

  return {
    text,
    data: { budgets: budgetDetails, overBudgetCount, totalBudgets: budgets.length },
    suggestions: ['How to get back on budget?', 'Optimize my budgets', 'Show spending forecast'],
  };
}

function processHealthScore(healthData) {
  if (!healthData) {
    return {
      text: 'I couldn\'t calculate your financial health score. Make sure you have sufficient transaction data.',
      data: null,
      suggestions: ['Add transactions', 'What is financial health?'],
    };
  }

  const score = healthData.score || 0;
  const grade = healthData.grade || 'N/A';
  const subScores = healthData.subScores || {};

  let emoji = '🌟';
  if (score < 40) emoji = '🔴';
  else if (score < 60) emoji = '🟠';
  else if (score < 80) emoji = '🟢';

  let text = `${emoji} Your Financial Health Score: **${score}/100** (Grade: **${grade}**)\n\n`;
  text += 'Score Breakdown:\n';

  const subScoreEntries = Object.entries(subScores);
  for (const [key, value] of subScoreEntries) {
    const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
    const bar = '█'.repeat(Math.floor((value || 0) / 10)) + '░'.repeat(10 - Math.floor((value || 0) / 10));
    text += `• ${formattedKey}: ${bar} ${value || 0}/100\n`;
  }

  // Find weakest and strongest areas
  const sorted = subScoreEntries.sort((a, b) => (a[1] || 0) - (b[1] || 0));
  if (sorted.length > 0) {
    text += `\n💪 **Strongest**: ${sorted[sorted.length - 1][0].replace(/([A-Z])/g, ' $1')} (${sorted[sorted.length - 1][1]})\n`;
    text += `🎯 **Needs work**: ${sorted[0][0].replace(/([A-Z])/g, ' $1')} (${sorted[0][1]})\n`;
  }

  return {
    text,
    data: healthData,
    suggestions: ['How to improve my score?', 'Show detailed breakdown', 'Compare with recommendations'],
  };
}

function processEMIStatus(emis) {
  const active = emis.filter(e => e.status === 'active');
  if (active.length === 0) {
    return {
      text: '✅ You have no active EMIs or loans. Great job staying debt-free!',
      data: { activeCount: 0 },
      suggestions: ['Show investment suggestions', 'Should I take a loan?', 'Check financial health'],
    };
  }

  const totalMonthly = active.reduce((s, e) => s + (e.emiAmountInINR || e.emiAmount || 0), 0);
  const totalOutstanding = active.reduce((s, e) => s + (e.remainingAmount || e.principalAmountInINR || 0), 0);

  let text = `You have **${active.length} active EMIs/loans**:\n\n`;
  for (const emi of active) {
    const name = emi.lenderName || emi.name || 'Loan';
    const monthly = emi.emiAmountInINR || emi.emiAmount || 0;
    const remaining = emi.remainingAmount || emi.principalAmountInINR || 0;
    const nextDue = emi.nextPaymentDate ? new Date(emi.nextPaymentDate).toLocaleDateString('en-IN') : 'N/A';
    text += `• **${name}**: ${formatCurrency(monthly)}/month | Remaining: ${formatCurrency(remaining)} | Next: ${nextDue}\n`;
  }

  text += `\n**Total Monthly EMI**: ${formatCurrency(totalMonthly)}`;
  text += `\n**Total Outstanding**: ${formatCurrency(totalOutstanding)}`;

  return {
    text,
    data: { activeCount: active.length, totalMonthly: Math.round(totalMonthly), totalOutstanding: Math.round(totalOutstanding) },
    suggestions: ['Debt payoff strategy', 'Should I prepay?', 'EMI to income ratio'],
  };
}

function processGreeting() {
  const hours = new Date().getHours();
  let greeting;
  if (hours < 12) greeting = 'Good morning! ☀️';
  else if (hours < 17) greeting = 'Good afternoon! 🌤️';
  else greeting = 'Good evening! 🌙';

  return {
    text: `${greeting} I'm your AI financial assistant. I can help you understand your spending, income, savings, budgets, investments, and more.\n\nTry asking me things like:\n• "How much did I spend this month?"\n• "Show my budget status"\n• "What's my savings rate?"\n• "Any unusual transactions?"`,
    data: null,
    suggestions: ['Show summary', 'Budget status', 'Spending breakdown', 'Financial health score'],
  };
}

function processHelp() {
  return {
    text: `Here's what I can help you with:\n\n**💰 Spending Analysis**\n• Total spending by period\n• Category breakdown\n• Month-over-month comparison\n• Spending trends and patterns\n\n**📈 Income & Savings**\n• Income tracking\n• Savings rate calculation\n• Savings tips\n\n**📊 Budget Management**\n• Budget status check\n• Budget optimization suggestions\n\n**🏦 Investments & Debt**\n• Investment portfolio overview\n• EMI/loan status\n• Debt payoff strategies\n\n**🏥 Financial Health**\n• Health score analysis\n• Risk assessment\n• Anomaly detection\n\n**🎯 Goals**\n• Goal progress tracking\n• Goal feasibility analysis\n\nJust ask naturally — I'll understand!`,
    data: null,
    suggestions: ['Show spending this month', 'Budget status', 'Financial health score', 'Summary'],
  };
}

function processThank() {
  const responses = [
    'You\'re welcome! Let me know if you need anything else. 😊',
    'Happy to help! Feel free to ask more questions.',
    'Anytime! Your financial health is my priority. 💪',
    'Glad I could assist! Keep up the great financial habits!',
  ];
  return {
    text: responses[Math.floor(Math.random() * responses.length)],
    data: null,
    suggestions: ['Show summary', 'Anything else I should check?', 'Tips to save more'],
  };
}

function processSummary(transactions, budgets, emis, investments, goals) {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthTxns = transactions.filter(t => new Date(t.date) >= thisMonth);

  const income = thisMonthTxns.filter(t => t.type === 'credit').reduce((s, t) => s + Math.abs(t.amount), 0);
  const expenses = thisMonthTxns.filter(t => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0);
  const savings = income - expenses;
  const savingsRate = income > 0 ? Math.round(savings / income * 100) : 0;

  const activeEMIs = (emis || []).filter(e => e.status === 'active');
  const monthlyEMI = activeEMIs.reduce((s, e) => s + (e.emiAmountInINR || e.emiAmount || 0), 0);
  const totalInvestments = (investments || []).reduce((s, i) => s + (i.currentValue || i.investedAmount || 0), 0);
  const activeGoals = (goals || []).filter(g => g.status !== 'completed');

  let text = `📊 **Monthly Financial Summary** (${now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })})\n\n`;
  text += `**Income**: ${formatCurrency(income)}\n`;
  text += `**Expenses**: ${formatCurrency(expenses)}\n`;
  text += `**Net Savings**: ${formatCurrency(savings)} (${savingsRate}%)\n\n`;

  if (activeEMIs.length > 0) text += `**Active EMIs**: ${activeEMIs.length} (${formatCurrency(monthlyEMI)}/month)\n`;
  if (totalInvestments > 0) text += `**Investment Value**: ${formatCurrency(totalInvestments)}\n`;
  if (activeGoals.length > 0) text += `**Active Goals**: ${activeGoals.length}\n`;
  if (budgets.length > 0) {
    const overBudget = budgets.filter(b => {
      const cat = b.category || 'other';
      const spent = thisMonthTxns.filter(t => t.type === 'debit' && (t.category || 'other') === cat)
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      return spent > (b.amount || b.limit || Infinity);
    });
    text += `**Budget Alerts**: ${overBudget.length}/${budgets.length} over budget\n`;
  }

  return {
    text,
    data: { income, expenses, savings, savingsRate, activeEMIs: activeEMIs.length, monthlyEMI, totalInvestments },
    suggestions: ['Detailed spending breakdown', 'Budget status', 'Financial health score', 'Savings tips'],
  };
}

function processUnknown(originalText) {
  return {
    text: `I wasn't able to fully understand your question: "${originalText}". Here are some things I can help with:\n\n• Spending analysis: "How much did I spend this month?"\n• Budget status: "Am I within budget?"\n• Savings: "What's my savings rate?"\n• EMI info: "Show my active EMIs"\n• Health score: "What's my financial health?"\n• Anomalies: "Any unusual transactions?"`,
    data: null,
    suggestions: ['Show spending this month', 'Budget status', 'Financial health', 'Help'],
  };
}

// ============================================================================
// §5  MAIN CHAT PROCESSOR
// ============================================================================

async function processMessage(userId, message, context = {}) {
  try {
    const startTime = Date.now();

    // Detect intent
    const { intent, category, confidence } = detectIntent(message);

    // Extract entities
    const entities = extractEntities(message);

    // Get user data based on intent category
    const Transaction = (() => { try { return require('../models/Transaction'); } catch { return null; } })();
    const Budget = (() => { try { return require('../models/Budget'); } catch { return null; } })();
    const EMI = (() => { try { return require('../models/EMI'); } catch { return null; } })();
    const Investment = (() => { try { return require('../models/Investment'); } catch { return null; } })();
    const FinancialGoal = (() => { try { return require('../models/FinancialGoal'); } catch { return null; } })();

    let transactions = [];
    let budgets = [];
    let emis = [];
    let investments = [];
    let goals = [];

    // Fetch only what we need
    if (['spending', 'income', 'savings', 'budget', 'general', 'anomaly'].includes(category)) {
      if (Transaction) {
        transactions = await Transaction.find({ userId, date: { $gte: new Date(Date.now() - 365 * 86400000) } }).sort({ date: -1 }).lean();
      }
    }
    if (['budget', 'general'].includes(category)) {
      if (Budget) budgets = await Budget.find({ userId }).lean();
    }
    if (['emi', 'general'].includes(category)) {
      if (EMI) emis = await EMI.find({ userId }).lean();
    }
    if (['investment', 'general'].includes(category)) {
      if (Investment) investments = await Investment.find({ userId }).lean();
    }
    if (['goal', 'general'].includes(category)) {
      if (FinancialGoal) goals = await FinancialGoal.find({ userId }).lean();
    }

    // Route to appropriate handler
    let response;

    switch (intent) {
      case 'SPENDING_TOTAL':
        response = processSpendingTotal(transactions, entities);
        break;
      case 'SPENDING_CATEGORY':
        response = processSpendingCategory(transactions, entities);
        break;
      case 'SPENDING_COMPARE':
        response = processSpendingCompare(transactions, entities);
        break;
      case 'SPENDING_FORECAST':
      case 'SPENDING_TREND':
        response = processSpendingCategory(transactions, { ...entities, period: entities.period || 'this_year' });
        break;
      case 'INCOME_TOTAL':
      case 'INCOME_SOURCES':
      case 'INCOME_FORECAST':
        response = processIncomeTotal(transactions, entities);
        break;
      case 'SAVINGS_STATUS':
      case 'SAVINGS_GOAL':
      case 'SAVINGS_TIPS':
        response = processSavingsStatus(transactions, entities);
        break;
      case 'BUDGET_STATUS':
      case 'BUDGET_OPTIMIZE':
        response = processBudgetStatus(transactions, budgets, entities);
        break;
      case 'BUDGET_CREATE':
        response = processBudgetStatus(transactions, budgets, entities);
        break;
      case 'EMI_STATUS':
      case 'EMI_UPCOMING':
      case 'EMI_PAYOFF':
        response = processEMIStatus(emis);
        break;
      case 'HEALTH_SCORE':
      case 'HEALTH_IMPROVE':
        // Delegate to localAIEngine for health scoring
        try {
          const localAI = require('./localAIEngine');
          const healthData = await localAI.getFinancialHealth(userId);
          response = processHealthScore(healthData);
        } catch {
          response = { text: 'Health score calculation requires more data. Try adding more transactions.', data: null, suggestions: ['Add transactions', 'Show summary'] };
        }
        break;
      case 'INVESTMENT_STATUS':
      case 'INVESTMENT_SUGGEST':
      case 'INVESTMENT_RISK':
        if (investments.length === 0) {
          response = {
            text: 'You don\'t have any investments tracked yet. Consider starting with:\n\n• **Mutual Funds (SIP)**: Start with as low as ₹500/month\n• **Fixed Deposits**: Safe, guaranteed returns\n• **PPF/NPS**: Tax-saving with compounding\n• **Stocks**: Higher risk, higher potential returns',
            data: null,
            suggestions: ['What should I invest in?', 'Risk profile', 'Show savings rate'],
          };
        } else {
          const totalValue = investments.reduce((s, i) => s + (i.currentValue || i.investedAmount || 0), 0);
          const totalInvested = investments.reduce((s, i) => s + (i.investedAmount || 0), 0);
          const returns = totalValue - totalInvested;
          response = {
            text: `Your Investment Portfolio:\n\n• **Total Invested**: ${formatCurrency(totalInvested)}\n• **Current Value**: ${formatCurrency(totalValue)}\n• **Returns**: ${formatCurrency(returns)} (${totalInvested > 0 ? Math.round(returns / totalInvested * 100) : 0}%)`,
            data: { totalValue, totalInvested, returns, count: investments.length },
            suggestions: ['Investment breakdown', 'Diversification check', 'Risk assessment'],
          };
        }
        break;
      case 'GOAL_STATUS':
      case 'GOAL_CREATE':
        if (goals.length === 0) {
          response = {
            text: 'You haven\'t set any financial goals yet. Setting goals is crucial for financial planning!\n\nPopular goals to consider:\n• Emergency fund (6 months expenses)\n• Vacation fund\n• Down payment for a home\n• Education fund\n• Retirement corpus',
            data: null,
            suggestions: ['Create a goal', 'What goals should I have?', 'Show savings rate'],
          };
        } else {
          let text = `Your Financial Goals:\n\n`;
          for (const g of goals) {
            const progress = g.targetAmount > 0 ? Math.round((g.currentAmount || 0) / g.targetAmount * 100) : 0;
            const bar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
            text += `• **${g.name}**: ${bar} ${progress}% — ${formatCurrency(g.currentAmount || 0)} / ${formatCurrency(g.targetAmount)}\n`;
          }
          response = { text, data: { goals: goals.length }, suggestions: ['Goal forecasts', 'Can I reach my goals?', 'Add a new goal'] };
        }
        break;
      case 'ANOMALY_CHECK':
        try {
          const localAI = require('./localAIEngine');
          const anomalies = await localAI.detectAnomalies(userId);
          if (anomalies && anomalies.anomalies && anomalies.anomalies.length > 0) {
            let text = `⚠️ Found **${anomalies.anomalies.length} potential anomalies**:\n\n`;
            for (const a of anomalies.anomalies.slice(0, 5)) {
              text += `• **${a.type}**: ${a.description} (${formatCurrency(a.amount || 0)})\n`;
            }
            response = { text, data: anomalies, suggestions: ['Show details', 'Is this fraud?', 'Mark as normal'] };
          } else {
            response = {
              text: '✅ No unusual transactions detected! Your spending patterns look normal.',
              data: { anomalyCount: 0 },
              suggestions: ['Show spending pattern', 'Check last month', 'Financial health'],
            };
          }
        } catch {
          response = {
            text: 'Anomaly detection requires sufficient transaction history. Keep tracking your transactions!',
            data: null,
            suggestions: ['Add transactions', 'Show summary'],
          };
        }
        break;
      case 'GREETING':
        response = processGreeting();
        break;
      case 'HELP':
        response = processHelp();
        break;
      case 'THANK':
        response = processThank();
        break;
      case 'SUMMARY':
        response = processSummary(transactions, budgets, emis, investments, goals);
        break;
      default:
        response = processUnknown(message);
    }

    const elapsed = Date.now() - startTime;

    return {
      ...response,
      intent,
      entities,
      confidence,
      processingTime: elapsed,
      source: 'local_nlp_engine',
    };
  } catch (error) {
    logger.error('Chat processing error:', error.message);
    return {
      text: 'I encountered an error processing your request. Please try rephrasing your question.',
      data: null,
      intent: 'ERROR',
      error: error.message,
      suggestions: ['Help', 'Show summary', 'Start again'],
    };
  }
}

// ============================================================================
// §6  SMART SUGGESTION ENGINE
// ============================================================================

async function generateSmartSuggestions(userId) {
  try {
    const Transaction = (() => { try { return require('../models/Transaction'); } catch { return null; } })();
    if (!Transaction) return { suggestions: ['Add your first transaction'] };

    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 86400000);
    const txns = await Transaction.find({ userId, date: { $gte: thirtyDaysAgo } }).lean();

    const suggestions = [];

    // If few transactions, suggest adding more
    if (txns.length < 10) {
      suggestions.push({ text: 'Add more transactions for better insights', priority: 'high', category: 'setup' });
      return { suggestions };
    }

    // Check spending trend
    const debits = txns.filter(t => t.type === 'debit');
    const totalSpend = debits.reduce((s, t) => s + Math.abs(t.amount), 0);
    const dailyAvg = totalSpend / 30;
    const daysRemaining = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
    const projectedSpend = totalSpend + dailyAvg * daysRemaining;

    suggestions.push({
      text: `Projected spending this month: ${formatCurrency(projectedSpend)}`,
      priority: 'medium',
      category: 'forecast',
    });

    // Find top spending category
    const categories = {};
    for (const t of debits) {
      const cat = t.category || 'other';
      categories[cat] = (categories[cat] || 0) + Math.abs(t.amount);
    }
    const topCat = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
    if (topCat) {
      suggestions.push({
        text: `Your top expense: ${topCat[0]} (${formatCurrency(topCat[1])})`,
        priority: 'low',
        category: 'insight',
      });
    }

    // Check savings rate
    const credits = txns.filter(t => t.type === 'credit');
    const totalIncome = credits.reduce((s, t) => s + Math.abs(t.amount), 0);
    if (totalIncome > 0) {
      const savingsRate = Math.round((totalIncome - totalSpend) / totalIncome * 100);
      if (savingsRate < 20) {
        suggestions.push({
          text: `Savings rate is ${savingsRate}%. Aim for 20%+ for financial fitness.`,
          priority: 'high',
          category: 'advice',
        });
      }
    }

    return { suggestions: suggestions.slice(0, 5) };
  } catch (error) {
    logger.error('Smart suggestion error:', error.message);
    return { suggestions: [{ text: 'Ask me anything about your finances!', priority: 'low', category: 'general' }] };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  processMessage,
  detectIntent,
  extractEntities,
  generateSmartSuggestions,
  INTENTS,
};
