const axios = require('axios');
const logger = require('../utils/logger');
const { calculateHealthScore, getRating, formatCurrency } = require('../utils/helpers');

/**
 * Generate financial analysis using Ollama (local AI)
 */
const analyzeWithOllama = async (transactions, profile) => {
  try {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
    
    const prompt = generateAnalysisPrompt(transactions, profile);
    
    const response = await axios.post(`${ollamaUrl}/api/generate`, {
      model,
      prompt,
      stream: false
    });
    
    return parseAIResponse(response.data.response);
  } catch (error) {
    logger.error('Ollama analysis error:', error);
    throw new Error('Failed to generate AI analysis with Ollama');
  }
};

/**
 * Generate financial analysis using OpenAI
 */
const analyzeWithOpenAI = async (transactions, profile, apiKey) => {
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey });
    
    const prompt = generateAnalysisPrompt(transactions, profile);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert financial analyst. Provide detailed, actionable insights about spending patterns, budgeting, and financial health.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });
    
    return parseAIResponse(response.choices[0].message.content);
  } catch (error) {
    logger.error('OpenAI analysis error:', error);
    throw new Error('Failed to generate AI analysis with OpenAI');
  }
};

/**
 * Generate enhanced analysis prompt for AI
 */
const generateAnalysisPrompt = (transactions, profile) => {
  const totalSpent = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalIncome = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
  
  // Group by category
  const byCategory = {};
  const byCategoryCount = {};
  transactions.forEach(t => {
    if (t.type === 'debit') {
      byCategory[t.category] = (byCategory[t.category] || 0) + Math.abs(t.amount);
      byCategoryCount[t.category] = (byCategoryCount[t.category] || 0) + 1;
    }
  });
  
  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, amt]) => `${cat}: ${formatCurrency(amt, profile.currency)} (${byCategoryCount[cat]} transactions)`);

  // Monthly trends
  const monthlyData = {};
  transactions.forEach(t => {
    const month = new Date(t.date).toISOString().slice(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { income: 0, expenses: 0 };
    }
    if (t.type === 'credit') {
      monthlyData[month].income += t.amount;
    } else {
      monthlyData[month].expenses += Math.abs(t.amount);
    }
  });

  const months = Object.keys(monthlyData).sort();
  const recentMonths = months.slice(-3);
  
  // Recurring transactions analysis
  const recurringPatterns = analyzeRecurringTransactions(transactions);
  
  return `As a financial advisor, analyze this comprehensive financial data and provide detailed insights:

USER PROFILE:
- Name: ${profile.fullName}
- Monthly Income Target: ${formatCurrency(profile.monthlyIncome, profile.currency)}
- Currency: ${profile.currency}
- Savings Goal: ${profile.savingsGoal ? formatCurrency(profile.savingsGoal.amount, profile.currency) : 'Not set'}

FINANCIAL SUMMARY (Period Analysis):
- Total Income: ${formatCurrency(totalIncome, profile.currency)}
- Total Expenses: ${formatCurrency(totalSpent, profile.currency)}
- Net Savings: ${formatCurrency(totalIncome - totalSpent, profile.currency)}
- Savings Rate: ${totalIncome > 0 ? ((totalIncome - totalSpent) / totalIncome * 100).toFixed(2) : 0}%
- Total Transactions: ${transactions.length} (${transactions.filter(t => t.type === 'debit').length} expenses, ${transactions.filter(t => t.type === 'credit').length} income)
- Average Transaction: ${formatCurrency(totalSpent / transactions.filter(t => t.type === 'debit').length || 0, profile.currency)}

TOP SPENDING CATEGORIES:
${topCategories.join('\n')}

MONTHLY TRENDS (Recent 3 months):
${recentMonths.map(month => 
  `${month}: Income ${formatCurrency(monthlyData[month].income, profile.currency)}, Expenses ${formatCurrency(monthlyData[month].expenses, profile.currency)}, Net ${formatCurrency(monthlyData[month].income - monthlyData[month].expenses, profile.currency)}`
).join('\n')}

RECURRING PATTERNS:
${recurringPatterns.length > 0 ? recurringPatterns.map(p => 
  `${p.description}: ${formatCurrency(p.amount, profile.currency)} (${p.frequency}, ${p.occurrences} times)`
).join('\n') : 'No clear recurring patterns detected'}

${profile.budgetLimits && profile.budgetLimits.size > 0 ? `
BUDGET LIMITS SET:
${Array.from(profile.budgetLimits.entries()).map(([cat, limit]) => `${cat}: ${formatCurrency(limit, profile.currency)}`).join('\n')}
` : 'No budget limits set'}

ANALYSIS REQUIREMENTS:
Provide comprehensive financial analysis with these sections:

1. FINANCIAL HEALTH SUMMARY (2-3 sentences describing overall financial position)
2. KEY INSIGHTS (4-6 bullet points highlighting most important findings)
3. SPENDING ANALYSIS (detailed breakdown of patterns and behaviors)
4. FUTURE PROJECTIONS (realistic forecasts based on trends)
5. ACTIONABLE RECOMMENDATIONS (specific, prioritized suggestions)

Format the response as JSON with these exact keys:
{
  "summary": "Comprehensive 2-3 sentence summary of financial health and position",
  "keyFindings": [
    "Most important insight about spending",
    "Key observation about income vs expenses", 
    "Notable trend or pattern",
    "Budget adherence or deviation finding",
    "Savings opportunity or risk factor"
  ],
  "spendingPatterns": {
    "highSpendingAreas": ["Category or merchant with excessive spending"],
    "savingsOpportunities": ["Specific areas where spending can be reduced"],
    "unusualTransactions": ["Transactions that deviate from normal patterns"],
    "positiveHabits": ["Good financial behaviors observed"]
  },
  "projections": {
    "nextMonthIncome": "Projected income based on trends",
    "nextMonthExpenses": "Projected expenses based on patterns", 
    "projectedSavings": "Expected savings if trends continue",
    "yearEndProjection": "Annual projection extrapolated from data",
    "goalProgress": "Progress toward savings goal if applicable",
    "riskFactors": ["Potential financial risks identified"]
  },
  "recommendations": [
    {
      "title": "Clear, actionable recommendation title",
      "description": "Detailed explanation of what to do and why",
      "category": "budgeting|saving|spending|investing|planning",
      "potentialSavings": "Number - estimated monthly savings from this action",
      "priority": "Number 1-10 (10 = most urgent)",
      "timeframe": "immediate|short_term|medium_term|long_term",
      "effort": "low|medium|high",
      "impact": "low|medium|high|critical"
    }
  ],
  "futureStrategy": {
    "emergencyFund": "Recommendation for emergency fund building",
    "spendingOptimization": "Strategy for optimizing spending",
    "savingsStrategy": "Approach to increase savings rate",
    "investmentReadiness": "Assessment of readiness for investments"
  }
}`;
};

/**
 * Analyze recurring transaction patterns
 */
const analyzeRecurringTransactions = (transactions) => {
  const grouped = {};
  
  // Group similar transactions by description and amount
  transactions.filter(t => t.type === 'debit').forEach(t => {
    const key = `${t.description.toLowerCase().substring(0, 20)}_${Math.round(t.amount)}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(t);
  });
  
  const recurring = [];
  
  Object.entries(grouped).forEach(([key, txns]) => {
    if (txns.length >= 3) { // At least 3 occurrences to be considered recurring
      txns.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Calculate intervals between transactions
      const intervals = [];
      for (let i = 1; i < txns.length; i++) {
        const days = Math.round((new Date(txns[i].date) - new Date(txns[i-1].date)) / (1000 * 60 * 60 * 24));
        intervals.push(days);
      }
      
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
      const standardDeviation = Math.sqrt(variance);
      
      // Consider it recurring if standard deviation is less than 7 days
      if (standardDeviation <= 7) {
        let frequency = 'irregular';
        if (avgInterval <= 7) frequency = 'weekly';
        else if (avgInterval <= 35) frequency = 'monthly';
        else if (avgInterval <= 95) frequency = 'quarterly';
        else if (avgInterval <= 400) frequency = 'yearly';
        
        recurring.push({
          description: txns[0].description,
          amount: txns[0].amount,
          frequency,
          occurrences: txns.length,
          averageInterval: Math.round(avgInterval),
          reliability: Math.max(0, 100 - standardDeviation * 10) // Reliability score
        });
      }
    }
  });
  
  return recurring.sort((a, b) => b.occurrences - a.occurrences).slice(0, 10);
};

/**
 * Parse AI response to structured format
 */
const parseAIResponse = (responseText) => {
  try {
    // Try to extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback: create basic structure from text
    return {
      summary: responseText.split('\n')[0] || 'Analysis completed',
      keyFindings: responseText.split('\n').slice(1, 6).filter(s => s.trim()),
      spendingPatterns: {
        highSpendingAreas: [],
        savingsOpportunities: [],
        unusualTransactions: []
      },
      projections: {
        nextMonthExpenses: 0,
        savingsPotential: 0,
        riskFactors: []
      },
      suggestions: []
    };
  } catch (error) {
    logger.error('AI response parsing error:', error);
    return {
      summary: 'Analysis completed but formatting failed',
      keyFindings: [],
      spendingPatterns: { highSpendingAreas: [], savingsOpportunities: [], unusualTransactions: [] },
      projections: { nextMonthExpenses: 0, savingsPotential: 0, riskFactors: [] },
      suggestions: []
    };
  }
};

/**
 * Calculate basic financial metrics
 */
const calculateMetrics = (transactions) => {
  const debits = transactions.filter(t => t.type === 'debit');
  const credits = transactions.filter(t => t.type === 'credit');
  
  const totalSpent = debits.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalIncome = credits.reduce((sum, t) => sum + t.amount, 0);
  const netFlow = totalIncome - totalSpent;
  const savingsRate = totalIncome > 0 ? (netFlow / totalIncome) * 100 : 0;
  
  // Average transaction
  const avgTransaction = transactions.length > 0 ? totalSpent / debits.length : 0;
  
  // By category
  const byCategory = {};
  debits.forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + Math.abs(t.amount);
  });
  
  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, amount]) => ({ category, amount, percentage: (amount / totalSpent) * 100 }));
  
  // By merchant
  const byMerchant = {};
  transactions.forEach(t => {
    if (t.merchant) {
      byMerchant[t.merchant] = (byMerchant[t.merchant] || 0) + Math.abs(t.amount);
    }
  });
  
  const topMerchants = Object.entries(byMerchant)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([merchant, amount]) => ({ merchant, amount }));
  
  // Monthly trends
  const byMonth = {};
  transactions.forEach(t => {
    const month = new Date(t.date).toISOString().slice(0, 7); // YYYY-MM
    if (!byMonth[month]) {
      byMonth[month] = { income: 0, expenses: 0 };
    }
    if (t.type === 'credit') {
      byMonth[month].income += t.amount;
    } else {
      byMonth[month].expenses += Math.abs(t.amount);
    }
  });
  
  const monthlyTrends = Object.entries(byMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      net: data.income - data.expenses
    }));
  
  // Unusual spikes (expenses > 2x average)
  const avgMonthlyExpense = monthlyTrends.reduce((sum, m) => sum + m.expenses, 0) / monthlyTrends.length || 0;
  const unusualSpikes = monthlyTrends
    .filter(m => m.expenses > avgMonthlyExpense * 2)
    .map(m => ({ month: m.month, amount: m.expenses }));
  
  return {
    totalSpent,
    totalIncome,
    netFlow,
    avgTransaction,
    savingsRate,
    topCategories,
    topMerchants,
    monthlyTrends,
    unusualSpikes
  };
};

/**
 * Calculate financial health score
 */
const calculateFinancialHealth = (metrics, profile, budgetComparison) => {
  // Savings rate score (0-100)
  const savingsScore = Math.min(100, Math.max(0, metrics.savingsRate * 2));
  
  // Debt ratio (assume 0 for now, can be enhanced)
  const debtRatio = 0;
  
  // Budget compliance
  const budgetScores = Object.values(budgetComparison).map(b => b.percentageUsed <= 100 ? 100 : Math.max(0, 200 - b.percentageUsed));
  const budgetCompliance = budgetScores.length > 0 ? budgetScores.reduce((a, b) => a + b, 0) / budgetScores.length : 75;
  
  // Income stability (based on variance in monthly income)
  const incomeVariance = metrics.monthlyTrends.length > 1
    ? Math.abs(metrics.monthlyTrends[metrics.monthlyTrends.length - 1].income - metrics.monthlyTrends[0].income) / metrics.monthlyTrends[0].income * 100
    : 0;
  const incomeStability = Math.max(0, 100 - incomeVariance);
  
  // Spending control (inverse of variance)
  const expenseVariance = metrics.monthlyTrends.length > 1
    ? Math.abs(metrics.monthlyTrends[metrics.monthlyTrends.length - 1].expenses - metrics.monthlyTrends[0].expenses) / metrics.monthlyTrends[0].expenses * 100
    : 0;
  const spendingControl = Math.max(0, 100 - expenseVariance);
  
  const components = {
    savings: Math.round(savingsScore),
    debtRatio: Math.round(100 - debtRatio),
    budgetCompliance: Math.round(budgetCompliance),
    incomeStability: Math.round(incomeStability),
    spendingControl: Math.round(spendingControl)
  };
  
  const overall = calculateHealthScore(components);
  const rating = getRating(overall);
  
  return {
    overall,
    components,
    rating,
    lastCalculated: new Date()
  };
};

/**
 * Compare spending against budget
 */
const compareBudget = (transactions, budgetLimits, currency) => {
  if (!budgetLimits || budgetLimits.size === 0) {
    return {};
  }
  
  const spending = {};
  transactions.filter(t => t.type === 'debit').forEach(t => {
    spending[t.category] = (spending[t.category] || 0) + Math.abs(t.amount);
  });
  
  const comparison = {};
  budgetLimits.forEach((limit, category) => {
    const spent = spending[category] || 0;
    comparison[category] = {
      limit,
      spent,
      remaining: limit - spent,
      percentageUsed: (spent / limit) * 100,
      status: spent > limit ? 'over' : spent > limit * 0.8 ? 'warning' : 'good'
    };
  });
  
  return comparison;
};

/**
 * Main analysis function
 */
const performFinancialAnalysis = async (transactions, profile) => {
  try {
    logger.info('Starting financial analysis');
    
    // Calculate metrics
    const metrics = calculateMetrics(transactions);
    
    // Compare budget
    const budgetComparison = compareBudget(transactions, profile.budgetLimits, profile.currency);
    
    // Calculate health score
    const healthScore = calculateFinancialHealth(metrics, profile, budgetComparison);
    
    // Get AI insights
    let aiInsights;
    try {
      if (profile.preferences.aiProvider === 'openai' && profile.preferences.openAIKey) {
        aiInsights = await analyzeWithOpenAI(transactions, profile, profile.preferences.openAIKey);
      } else {
        aiInsights = await analyzeWithOllama(transactions, profile);
      }
    } catch (error) {
      logger.warn('AI analysis failed, using basic analysis:', error);
      aiInsights = {
        summary: 'AI analysis unavailable. Basic analysis completed.',
        keyFindings: [
          `Total spending: ${formatCurrency(metrics.totalSpent, profile.currency)}`,
          `Savings rate: ${metrics.savingsRate.toFixed(2)}%`,
          `Top category: ${metrics.topCategories[0]?.category || 'N/A'}`
        ],
        spendingPatterns: { highSpendingAreas: [], savingsOpportunities: [], unusualTransactions: [] },
        projections: { nextMonthExpenses: 0, savingsPotential: 0, riskFactors: [] },
        suggestions: []
      };
    }
    
    logger.info('Financial analysis completed');
    
    return {
      analysis: metrics,
      financialHealthScore: healthScore,
      budgetComparison,
      aiInsights
    };
  } catch (error) {
    logger.error('Financial analysis error:', error);
    throw error;
  }
};

module.exports = {
  performFinancialAnalysis,
  calculateMetrics,
  calculateFinancialHealth,
  compareBudget,
  analyzeWithOllama,
  analyzeWithOpenAI
};
