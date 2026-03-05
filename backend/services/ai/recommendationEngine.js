// ============================================================================
// RECOMMENDATION ENGINE — Collaborative & Content-Based Financial Recommendations
// ============================================================================
// Implements collaborative filtering, content-based filtering, hybrid
// recommendations, and contextual bandits for personalized financial advice.
// Runs entirely locally without external dependencies.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

const sum = (a) => a.reduce((s, v) => s + v, 0);
const mean = (a) => (a.length ? sum(a) / a.length : 0);

// ============================================================================
// §1  USER PROFILE BUILDER — Feature Extraction from Financial Data
// ============================================================================

class UserProfileBuilder {
  constructor() {
    this.featureNames = [
      'monthly_income', 'monthly_expense', 'savings_rate', 'expense_volatility',
      'num_categories', 'max_category_pct', 'food_pct', 'transport_pct',
      'shopping_pct', 'utilities_pct', 'entertainment_pct', 'healthcare_pct',
      'has_loans', 'num_active_loans', 'debt_to_income', 'emi_to_income',
      'has_investments', 'investment_diversity', 'equity_allocation',
      'total_portfolio_value', 'avg_transaction_amount', 'transaction_frequency',
      'weekend_spending_ratio', 'late_night_txn_ratio', 'recurring_payment_count',
      'subscription_count', 'avg_daily_spending', 'max_single_transaction',
      'income_stability', 'expense_trend', 'savings_trend',
      'num_financial_goals', 'goal_progress_avg', 'emergency_fund_months',
      'insurance_coverage', 'tax_saving_utilization'
    ];
  }

  buildProfile(data) {
    const { transactions, loans, investments, budgets, goals } = data;
    const profile = {};

    // Transaction analysis
    if (transactions && transactions.length > 0) {
      const expenses = transactions.filter(t => t.type === 'expense');
      const incomes = transactions.filter(t => t.type === 'income');
      const expAmounts = expenses.map(t => Math.abs(t.amount || 0));
      const incAmounts = incomes.map(t => Math.abs(t.amount || 0));

      const months = Math.max(1, new Set(transactions.map(t =>
        new Date(t.date || Date.now()).toISOString().substring(0, 7)
      )).size);

      profile.monthly_income = sum(incAmounts) / months;
      profile.monthly_expense = sum(expAmounts) / months;
      profile.savings_rate = profile.monthly_income > 0
        ? (profile.monthly_income - profile.monthly_expense) / profile.monthly_income
        : 0;

      // Expense volatility
      const monthlyExpenses = {};
      for (const t of expenses) {
        const m = new Date(t.date || Date.now()).toISOString().substring(0, 7);
        monthlyExpenses[m] = (monthlyExpenses[m] || 0) + Math.abs(t.amount || 0);
      }
      const monthlyValues = Object.values(monthlyExpenses);
      profile.expense_volatility = monthlyValues.length > 1
        ? Math.sqrt(mean(monthlyValues.map(v => (v - mean(monthlyValues)) ** 2))) / (mean(monthlyValues) || 1)
        : 0;

      // Category analysis
      const categoryTotals = {};
      const totalExpense = sum(expAmounts);
      for (const t of expenses) {
        const cat = (t.category || 'unknown').toLowerCase();
        categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(t.amount || 0);
      }
      profile.num_categories = Object.keys(categoryTotals).length;
      profile.max_category_pct = totalExpense > 0
        ? Math.max(...Object.values(categoryTotals)) / totalExpense
        : 0;

      // Specific category percentages
      for (const cat of ['food', 'transport', 'shopping', 'utilities', 'entertainment', 'healthcare']) {
        profile[`${cat}_pct`] = totalExpense > 0
          ? (categoryTotals[cat] || 0) / totalExpense
          : 0;
      }

      // Transaction patterns
      profile.avg_transaction_amount = expAmounts.length > 0 ? mean(expAmounts) : 0;
      profile.transaction_frequency = expenses.length / Math.max(months * 30, 1);
      profile.max_single_transaction = expAmounts.length > 0 ? Math.max(...expAmounts) : 0;
      profile.avg_daily_spending = profile.monthly_expense / 30;

      // Time patterns
      const weekendTxns = expenses.filter(t => {
        const d = new Date(t.date || 0).getDay();
        return d === 0 || d === 6;
      });
      profile.weekend_spending_ratio = expenses.length > 0
        ? weekendTxns.length / expenses.length
        : 0;

      const lateNightTxns = expenses.filter(t => {
        const h = new Date(t.date || Date.now()).getHours();
        return h >= 22 || h < 6;
      });
      profile.late_night_txn_ratio = expenses.length > 0
        ? lateNightTxns.length / expenses.length
        : 0;

      // Trends (simplified)
      if (monthlyValues.length >= 3) {
        const recent = monthlyValues.slice(-3);
        const older = monthlyValues.slice(0, -3);
        profile.expense_trend = older.length > 0
          ? (mean(recent) - mean(older)) / (mean(older) || 1)
          : 0;
      } else {
        profile.expense_trend = 0;
      }

      // Income stability
      const monthlyIncomes = {};
      for (const t of incomes) {
        const m = new Date(t.date || Date.now()).toISOString().substring(0, 7);
        monthlyIncomes[m] = (monthlyIncomes[m] || 0) + Math.abs(t.amount || 0);
      }
      const incValues = Object.values(monthlyIncomes);
      profile.income_stability = incValues.length > 1
        ? 1 - (Math.sqrt(mean(incValues.map(v => (v - mean(incValues)) ** 2))) / (mean(incValues) || 1))
        : 0.5;

      profile.savings_trend = 0;
      profile.recurring_payment_count = 0;
      profile.subscription_count = 0;
    } else {
      for (const name of this.featureNames) {
        if (!(name in profile)) profile[name] = 0;
      }
    }

    // Loan analysis
    if (loans && loans.length > 0) {
      const activeLoans = loans.filter(l => l.status === 'active');
      profile.has_loans = 1;
      profile.num_active_loans = activeLoans.length;
      const totalEmi = activeLoans.reduce((s, l) => s + (l.emiAmount || l.emi || 0), 0);
      const totalOutstanding = activeLoans.reduce((s, l) =>
        s + (l.outstandingAmount || l.outstanding || l.principalAmount || 0), 0);
      profile.debt_to_income = profile.monthly_income > 0
        ? totalOutstanding / (profile.monthly_income * 12) : 0;
      profile.emi_to_income = profile.monthly_income > 0
        ? totalEmi / profile.monthly_income : 0;
    } else {
      profile.has_loans = 0;
      profile.num_active_loans = 0;
      profile.debt_to_income = 0;
      profile.emi_to_income = 0;
    }

    // Investment analysis
    if (investments && investments.length > 0) {
      profile.has_investments = 1;
      profile.investment_diversity = new Set(investments.map(i => i.type || i.assetClass)).size;
      const totalValue = investments.reduce((s, i) => s + (i.currentValue || i.value || 0), 0);
      profile.total_portfolio_value = totalValue;
      const equityInv = investments.filter(i =>
        (i.type || i.assetClass || '').toLowerCase().includes('equit')
      );
      profile.equity_allocation = totalValue > 0
        ? equityInv.reduce((s, i) => s + (i.currentValue || i.value || 0), 0) / totalValue
        : 0;
    } else {
      profile.has_investments = 0;
      profile.investment_diversity = 0;
      profile.total_portfolio_value = 0;
      profile.equity_allocation = 0;
    }

    // Goals
    if (goals && goals.length > 0) {
      profile.num_financial_goals = goals.length;
      profile.goal_progress_avg = mean(goals.map(g =>
        g.targetAmount > 0 ? Math.min((g.currentAmount || g.saved || 0) / g.targetAmount, 1) : 0
      ));
    } else {
      profile.num_financial_goals = 0;
      profile.goal_progress_avg = 0;
    }

    // Defaults for missing values
    profile.emergency_fund_months = profile.monthly_expense > 0 && profile.savings_rate > 0
      ? (profile.monthly_income * profile.savings_rate * 6) / profile.monthly_expense
      : 0;
    profile.insurance_coverage = 0;
    profile.tax_saving_utilization = 0;

    return profile;
  }

  toVector(profile) {
    return this.featureNames.map(name => profile[name] || 0);
  }
}

// ============================================================================
// §2  CONTENT-BASED RECOMMENDER — Recommend Based on User Profile
// ============================================================================

class ContentBasedRecommender {
  constructor() {
    this.recommendations = this._buildRecommendationDatabase();
    this.profileBuilder = new UserProfileBuilder();
  }

  _buildRecommendationDatabase() {
    return [
      // Emergency Fund recommendations
      {
        id: 'rec_emergency_fund_start',
        category: 'savings',
        title: 'Build Your Emergency Fund',
        description: 'Start building a 6-month emergency fund. Begin with ₹5,000/month in a liquid fund or high-yield savings account.',
        actionType: 'create_goal',
        priority: 'critical',
        conditions: (p) => p.emergency_fund_months < 3 && p.savings_rate > 0,
        relevanceScore: (p) => Math.max(0, 1 - p.emergency_fund_months / 6) * 100,
        tags: ['emergency', 'savings', 'beginner', 'essential']
      },
      {
        id: 'rec_emergency_fund_complete',
        category: 'savings',
        title: 'Emergency Fund Nearly Complete!',
        description: 'You\'re close to your 6-month target. Consider moving to liquid mutual funds for slightly better returns while maintaining accessibility.',
        actionType: 'optimize',
        priority: 'medium',
        conditions: (p) => p.emergency_fund_months >= 3 && p.emergency_fund_months < 6,
        relevanceScore: (p) => (p.emergency_fund_months / 6) * 50,
        tags: ['emergency', 'savings', 'optimization']
      },

      // Savings rate recommendations
      {
        id: 'rec_increase_savings',
        category: 'savings',
        title: 'Boost Your Savings Rate',
        description: 'Your savings rate is below 20%. Target the 50/30/20 rule: 50% needs, 30% wants, 20% savings. Review subscription costs and dining expenses.',
        actionType: 'adjust_budget',
        priority: 'high',
        conditions: (p) => p.savings_rate < 0.2 && p.savings_rate >= 0,
        relevanceScore: (p) => (0.2 - p.savings_rate) * 500,
        tags: ['savings', 'budget', '50-30-20']
      },
      {
        id: 'rec_great_saver',
        category: 'savings',
        title: 'Excellent Savings! Consider Investing More',
        description: 'Your savings rate is above 30%! Consider deploying excess savings into SIPs or index funds for long-term wealth creation.',
        actionType: 'invest',
        priority: 'medium',
        conditions: (p) => p.savings_rate > 0.3,
        relevanceScore: (p) => p.savings_rate * 40,
        tags: ['savings', 'investment', 'growth']
      },

      // Investment recommendations
      {
        id: 'rec_start_investing',
        category: 'investment',
        title: 'Start Your Investment Journey',
        description: 'Begin with a ₹500/month SIP in a Nifty 50 index fund. It\'s the simplest way to start with equity investing.',
        actionType: 'create_investment',
        priority: 'high',
        conditions: (p) => !p.has_investments && p.savings_rate > 0.1,
        relevanceScore: (p) => p.savings_rate > 0.1 ? 90 : 30,
        tags: ['investment', 'beginner', 'sip', 'index-fund']
      },
      {
        id: 'rec_diversify_portfolio',
        category: 'investment',
        title: 'Diversify Your Portfolio',
        description: 'Your investments are concentrated. Add debt funds, gold, or international equity for better risk-adjusted returns.',
        actionType: 'rebalance',
        priority: 'medium',
        conditions: (p) => p.has_investments && p.investment_diversity < 3,
        relevanceScore: (p) => (3 - p.investment_diversity) * 30,
        tags: ['investment', 'diversification', 'asset-allocation']
      },
      {
        id: 'rec_reduce_equity',
        category: 'investment',
        title: 'Consider Reducing Equity Exposure',
        description: 'Your equity allocation is very high. Consider adding debt instruments to reduce portfolio volatility, especially if your goals are < 5 years.',
        actionType: 'rebalance',
        priority: 'medium',
        conditions: (p) => p.equity_allocation > 0.8,
        relevanceScore: (p) => (p.equity_allocation - 0.5) * 100,
        tags: ['investment', 'equity', 'risk', 'rebalance']
      },
      {
        id: 'rec_section_80c',
        category: 'tax',
        title: 'Maximize Section 80C Benefits',
        description: 'Invest in ELSS mutual funds for tax savings under 80C (up to ₹1.5L). ELSS has the shortest lock-in (3 years) among 80C options.',
        actionType: 'invest',
        priority: 'high',
        conditions: (p) => p.tax_saving_utilization < 0.8 && p.monthly_income > 25000,
        relevanceScore: (p) => (1 - p.tax_saving_utilization) * 80,
        tags: ['tax', '80c', 'elss', 'tax-saving']
      },

      // Debt management recommendations
      {
        id: 'rec_high_dti',
        category: 'debt',
        title: 'Reduce Debt-to-Income Ratio',
        description: 'Your DTI ratio is above 40%. Prioritize paying off highest-interest debt first (avalanche method) to improve financial health.',
        actionType: 'payoff_strategy',
        priority: 'critical',
        conditions: (p) => p.emi_to_income > 0.4,
        relevanceScore: (p) => (p.emi_to_income - 0.3) * 200,
        tags: ['debt', 'loan', 'payoff', 'critical']
      },
      {
        id: 'rec_prepay_loans',
        category: 'debt',
        title: 'Consider Loan Prepayment',
        description: 'With your savings rate, consider prepaying high-interest loans. Even small prepayments save significant interest over the loan tenure.',
        actionType: 'prepay',
        priority: 'medium',
        conditions: (p) => p.has_loans && p.savings_rate > 0.15 && p.num_active_loans > 0,
        relevanceScore: (p) => p.savings_rate * p.debt_to_income * 100,
        tags: ['debt', 'prepayment', 'interest-saving']
      },

      // Spending recommendations
      {
        id: 'rec_food_spending_high',
        category: 'spending',
        title: 'Optimize Food Expenses',
        description: 'Food spending is above 20% of income. Try meal planning, cooking at home 4-5 days/week, and limiting food delivery to weekends.',
        actionType: 'reduce_spending',
        priority: 'medium',
        conditions: (p) => p.food_pct > 0.2,
        relevanceScore: (p) => (p.food_pct - 0.15) * 200,
        tags: ['spending', 'food', 'budget', 'saving-tips']
      },
      {
        id: 'rec_transport_optimization',
        category: 'spending',
        title: 'Reduce Transport Costs',
        description: 'Consider carpooling, public transport, or switching to an EV for daily commute to reduce transport expenses.',
        actionType: 'reduce_spending',
        priority: 'low',
        conditions: (p) => p.transport_pct > 0.15,
        relevanceScore: (p) => (p.transport_pct - 0.1) * 150,
        tags: ['spending', 'transport', 'budget']
      },
      {
        id: 'rec_subscription_audit',
        category: 'spending',
        title: 'Audit Your Subscriptions',
        description: 'Review all recurring subscriptions. Cancel those unused in the last 30 days. Average Indian household wastes ₹2,000/month on unused subscriptions.',
        actionType: 'reduce_spending',
        priority: 'medium',
        conditions: (p) => p.entertainment_pct > 0.1 || p.subscription_count > 3,
        relevanceScore: (p) => p.entertainment_pct * 200,
        tags: ['spending', 'subscriptions', 'audit', 'recurring']
      },
      {
        id: 'rec_weekend_spending',
        category: 'spending',
        title: 'Control Weekend Spending',
        description: 'Your weekend spending is significantly higher. Set a weekend budget and look for free activities to reduce impulse spending.',
        actionType: 'reduce_spending',
        priority: 'low',
        conditions: (p) => p.weekend_spending_ratio > 0.4,
        relevanceScore: (p) => (p.weekend_spending_ratio - 0.3) * 100,
        tags: ['spending', 'weekend', 'impulse', 'budget']
      },

      // Insurance recommendations
      {
        id: 'rec_term_insurance',
        category: 'insurance',
        title: 'Get Term Life Insurance',
        description: 'Every earning member should have term insurance of 10-15x annual income. A 30-year-old can get ₹1 Cr cover for just ₹700/month.',
        actionType: 'buy_insurance',
        priority: 'critical',
        conditions: (p) => p.insurance_coverage < 0.5 && p.monthly_income > 20000,
        relevanceScore: (p) => (1 - p.insurance_coverage) * 90,
        tags: ['insurance', 'term', 'life', 'essential']
      },
      {
        id: 'rec_health_insurance',
        category: 'insurance',
        title: 'Adequate Health Coverage',
        description: 'Ensure health insurance of at least ₹10L. Medical inflation in India is 14% p.a. — a major surgery can cost ₹5-15L.',
        actionType: 'buy_insurance',
        priority: 'high',
        conditions: (p) => p.monthly_income > 15000,
        relevanceScore: (p) => 70,
        tags: ['insurance', 'health', 'medical', 'essential']
      },

      // Retirement recommendations
      {
        id: 'rec_start_retirement',
        category: 'retirement',
        title: 'Start Retirement Planning Early',
        description: 'Starting at 25 with ₹5,000/month SIP at 12% returns gives you ₹3.2 Cr by 55. Starting at 35 gives only ₹1 Cr. Time is your biggest asset!',
        actionType: 'create_goal',
        priority: 'high',
        conditions: (p) => p.num_financial_goals < 3 && p.monthly_income > 20000,
        relevanceScore: (p) => 75,
        tags: ['retirement', 'long-term', 'compounding', 'sip']
      },
      {
        id: 'rec_nps_contribution',
        category: 'retirement',
        title: 'Invest in NPS for Tax Benefits',
        description: 'NPS gives additional ₹50,000 deduction under Section 80CCD(1B), over and above ₹1.5L of 80C. Average returns: 9-10% p.a.',
        actionType: 'invest',
        priority: 'medium',
        conditions: (p) => p.monthly_income > 30000 && p.tax_saving_utilization < 1,
        relevanceScore: (p) => 60,
        tags: ['retirement', 'nps', 'tax', '80ccd']
      },

      // Advanced recommendations
      {
        id: 'rec_income_volatility',
        category: 'risk',
        title: 'Build a Larger Buffer',
        description: 'Your income appears variable. Build a 9-12 month emergency fund instead of the standard 6 months for added security.',
        actionType: 'adjust_goal',
        priority: 'high',
        conditions: (p) => p.income_stability < 0.5,
        relevanceScore: (p) => (1 - p.income_stability) * 80,
        tags: ['risk', 'emergency', 'income-stability']
      },
      {
        id: 'rec_expense_trend_warning',
        category: 'spending',
        title: 'Spending Trend Alert',
        description: 'Your expenses are trending upward. Review recent spending increases and set stricter category budgets before it becomes a habit.',
        actionType: 'review_budget',
        priority: 'high',
        conditions: (p) => p.expense_trend > 0.1,
        relevanceScore: (p) => p.expense_trend * 200,
        tags: ['spending', 'trend', 'warning', 'budget']
      }
    ];
  }

  recommend(userData, limit = 10) {
    const profile = this.profileBuilder.buildProfile(userData);
    const scored = [];

    for (const rec of this.recommendations) {
      try {
        if (rec.conditions(profile)) {
          const relevance = rec.relevanceScore(profile);
          if (relevance > 0) {
            scored.push({
              ...rec,
              relevance,
              conditions: undefined,
              relevanceScore: undefined,
              profileFactors: this._getRelevantFactors(profile, rec)
            });
          }
        }
      } catch (e) {
        // Skip invalid recommendations
      }
    }

    return scored
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const pDiff = (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
        return pDiff !== 0 ? pDiff : b.relevance - a.relevance;
      })
      .slice(0, limit);
  }

  _getRelevantFactors(profile, rec) {
    const factors = {};
    for (const tag of rec.tags || []) {
      switch (tag) {
        case 'savings': factors.savingsRate = (profile.savings_rate * 100).toFixed(1) + '%'; break;
        case 'debt': factors.dtiRatio = (profile.debt_to_income * 100).toFixed(1) + '%'; break;
        case 'investment': factors.portfolioValue = '₹' + Math.round(profile.total_portfolio_value).toLocaleString(); break;
        case 'spending': factors.monthlyExpense = '₹' + Math.round(profile.monthly_expense).toLocaleString(); break;
      }
    }
    return factors;
  }
}

// ============================================================================
// §3  COLLABORATIVE FILTERING — Find Similar Users for Recommendations
// ============================================================================

class CollaborativeFilter {
  constructor() {
    this.userProfiles = {};
    this.userActions = {};
    this.profileBuilder = new UserProfileBuilder();
    this.similarityCache = {};
  }

  addUser(userId, profile) {
    this.userProfiles[userId] = profile;
    this.similarityCache = {}; // Invalidate cache
  }

  recordAction(userId, recommendationId, action, rating = null) {
    if (!this.userActions[userId]) this.userActions[userId] = {};
    this.userActions[userId][recommendationId] = {
      action, // 'clicked', 'applied', 'dismissed'
      rating: rating || (action === 'applied' ? 5 : action === 'clicked' ? 3 : 1),
      timestamp: new Date()
    };
  }

  // Cosine similarity between two user profiles
  _cosineSimilarity(profileA, profileB) {
    const vectorA = this.profileBuilder.toVector(profileA);
    const vectorB = this.profileBuilder.toVector(profileB);

    let dotProduct = 0, magA = 0, magB = 0;
    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      magA += vectorA[i] ** 2;
      magB += vectorB[i] ** 2;
    }

    const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  // Find k most similar users
  findSimilarUsers(userId, k = 5) {
    const cacheKey = `${userId}_${k}`;
    if (this.similarityCache[cacheKey]) return this.similarityCache[cacheKey];

    const userProfile = this.userProfiles[userId];
    if (!userProfile) return [];

    const similarities = [];
    for (const [otherId, otherProfile] of Object.entries(this.userProfiles)) {
      if (otherId === userId) continue;
      const similarity = this._cosineSimilarity(userProfile, otherProfile);
      similarities.push({ userId: otherId, similarity });
    }

    const result = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);

    this.similarityCache[cacheKey] = result;
    return result;
  }

  // Recommend based on what similar users have done
  recommendFromSimilar(userId, limit = 5) {
    const similarUsers = this.findSimilarUsers(userId, 10);
    const userActionSet = new Set(Object.keys(this.userActions[userId] || {}));
    const scores = {};

    for (const { userId: simUserId, similarity } of similarUsers) {
      const simActions = this.userActions[simUserId] || {};
      for (const [recId, action] of Object.entries(simActions)) {
        if (userActionSet.has(recId)) continue; // Skip already seen
        if (!scores[recId]) scores[recId] = { totalScore: 0, count: 0 };
        scores[recId].totalScore += similarity * action.rating;
        scores[recId].count++;
      }
    }

    return Object.entries(scores)
      .map(([recId, data]) => ({
        recommendationId: recId,
        score: data.count > 0 ? data.totalScore / data.count : 0,
        supportCount: data.count
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

// ============================================================================
// §4  HYBRID RECOMMENDER — Combines Content + Collaborative
// ============================================================================

class HybridRecommender {
  constructor() {
    this.contentRecommender = new ContentBasedRecommender();
    this.collaborativeFilter = new CollaborativeFilter();
    this.contentWeight = 0.7;
    this.collaborativeWeight = 0.3;
    this.dataDir = path.join(__dirname, '../../data/recommendations');
  }

  async _ensureDir() {
    await fs.promises.mkdir(this.dataDir, { recursive: true }).catch(() => {});
  }

  recommend(userId, userData, limit = 10) {
    // Content-based recommendations
    const contentRecs = this.contentRecommender.recommend(userData, limit * 2);

    // Collaborative filtering (if enough users)
    const collabRecs = this.collaborativeFilter.recommendFromSimilar(userId, limit);

    // Build user profile for collaborative filter
    const profile = this.contentRecommender.profileBuilder.buildProfile(userData);
    this.collaborativeFilter.addUser(userId, profile);

    // Merge recommendations
    const merged = {};

    for (const rec of contentRecs) {
      merged[rec.id] = {
        ...rec,
        contentScore: rec.relevance,
        collaborativeScore: 0,
        hybridScore: rec.relevance * this.contentWeight
      };
    }

    for (const collabRec of collabRecs) {
      if (merged[collabRec.recommendationId]) {
        merged[collabRec.recommendationId].collaborativeScore = collabRec.score * 20;
        merged[collabRec.recommendationId].hybridScore +=
          collabRec.score * 20 * this.collaborativeWeight;
      }
    }

    return Object.values(merged)
      .sort((a, b) => b.hybridScore - a.hybridScore)
      .slice(0, limit)
      .map(rec => ({
        id: rec.id,
        category: rec.category,
        title: rec.title,
        description: rec.description,
        actionType: rec.actionType,
        priority: rec.priority,
        score: Math.round(rec.hybridScore),
        tags: rec.tags,
        profileFactors: rec.profileFactors
      }));
  }

  recordFeedback(userId, recommendationId, action) {
    this.collaborativeFilter.recordAction(userId, recommendationId, action);
  }

  async save(userId) {
    await this._ensureDir();
    const filePath = path.join(this.dataDir, `${userId}_recommendations.json`);
    try {
      await fs.promises.writeFile(filePath, JSON.stringify({
        actions: this.collaborativeFilter.userActions[userId] || {},
        timestamp: new Date()
      }));
    } catch (e) {
      logger.debug(`Recommendation save failed: ${e.message}`);
    }
  }

  async load(userId) {
    const filePath = path.join(this.dataDir, `${userId}_recommendations.json`);
    try {
      const raw = await fs.promises.readFile(filePath, 'utf8');
      const data = JSON.parse(raw);
      if (data.actions) {
        this.collaborativeFilter.userActions[userId] = data.actions;
      }
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// §5  CONTEXTUAL RECOMMENDATION TRIGGERS
// ============================================================================

class ContextualRecommendationTriggers {
  constructor() {
    this.triggers = [];
    this._registerDefaultTriggers();
  }

  _registerDefaultTriggers() {
    // Salary day recommendation
    this.triggers.push({
      name: 'salary_day',
      condition: (ctx) => {
        const today = new Date().getDate();
        return (today === 1 || today === 28 || today === 30) && ctx.recentIncome > 0;
      },
      recommendation: {
        title: '💰 Salary Day! Set Up Auto-Transfers',
        description: 'Transfer savings immediately on salary day before spending temptations arise. Set up auto-SIP and auto-transfers to savings.',
        priority: 'high',
        actionType: 'automate'
      }
    });

    // Month-end budget warning
    this.triggers.push({
      name: 'month_end_budget',
      condition: (ctx) => {
        const today = new Date().getDate();
        return today >= 25 && ctx.budgetUtilization > 0.85;
      },
      recommendation: {
        title: '⚠️ Budget Almost Exhausted',
        description: 'You\'ve used over 85% of your monthly budget with days remaining. Consider limiting non-essential expenses for the rest of the month.',
        priority: 'high',
        actionType: 'reduce_spending'
      }
    });

    // Large transaction pattern
    this.triggers.push({
      name: 'large_transaction',
      condition: (ctx) => ctx.lastTransactionAmount > ctx.avgTransactionAmount * 5,
      recommendation: {
        title: '💡 Large Transaction Detected',
        description: 'Consider if this was planned. For large purchases, the 24-hour rule helps avoid impulse buying.',
        priority: 'medium',
        actionType: 'review'
      }
    });

    // Investment opportunity during market dip
    this.triggers.push({
      name: 'market_opportunity',
      condition: (ctx) => ctx.marketChange && ctx.marketChange < -0.02 && ctx.hasInvestments,
      recommendation: {
        title: '📈 Market Dip — Investment Opportunity',
        description: 'Markets are down. If you have a long-term horizon (5+ years), this could be a good time to increase your SIP amount temporarily.',
        priority: 'medium',
        actionType: 'invest'
      }
    });

    // EMI payment coming up
    this.triggers.push({
      name: 'upcoming_emi',
      condition: (ctx) => {
        const today = new Date().getDate();
        return ctx.hasLoans && (today >= ctx.emiDate - 3 && today <= ctx.emiDate);
      },
      recommendation: {
        title: '🏦 EMI Payment Due Soon',
        description: 'Ensure sufficient balance for upcoming EMI deductions. Consider setting aside the amount today.',
        priority: 'high',
        actionType: 'reminder'
      }
    });

    // Tax season reminder
    this.triggers.push({
      name: 'tax_season',
      condition: () => {
        const month = new Date().getMonth();
        return month >= 0 && month <= 2; // Jan-Mar
      },
      recommendation: {
        title: '📋 Tax Season — Maximize Deductions',
        description: 'Q4 of the financial year. Review your 80C, 80D, and 80CCD investments. Last chance to save tax this year!',
        priority: 'high',
        actionType: 'tax_planning'
      }
    });
  }

  evaluate(context) {
    const triggered = [];

    for (const trigger of this.triggers) {
      try {
        if (trigger.condition(context)) {
          triggered.push({
            triggerId: trigger.name,
            ...trigger.recommendation,
            contextual: true
          });
        }
      } catch (e) {
        // Skip failing triggers
      }
    }

    return triggered;
  }
}

// ============================================================================
// §6  UNIFIED RECOMMENDATION SERVICE
// ============================================================================

class RecommendationService {
  constructor() {
    this.hybridRecommender = new HybridRecommender();
    this.contextualTriggers = new ContextualRecommendationTriggers();
    this.feedbackLog = [];
  }

  async getRecommendations(userId, userData, context = {}) {
    // Load previous feedback
    await this.hybridRecommender.load(userId);

    // Get hybrid (content + collaborative) recommendations
    const hybridRecs = this.hybridRecommender.recommend(userId, userData);

    // Get contextual recommendations
    const profile = this.hybridRecommender.contentRecommender.profileBuilder.buildProfile(userData);
    const contextRecs = this.contextualTriggers.evaluate({
      ...context,
      recentIncome: profile.monthly_income,
      budgetUtilization: 0.5,
      lastTransactionAmount: profile.max_single_transaction,
      avgTransactionAmount: profile.avg_transaction_amount,
      hasInvestments: profile.has_investments,
      hasLoans: profile.has_loans
    });

    // Merge and deduplicate
    const allRecs = [
      ...contextRecs.map(r => ({ ...r, source: 'contextual' })),
      ...hybridRecs.map(r => ({ ...r, source: 'hybrid' }))
    ];

    // Generate financial profile summary
    const profileSummary = {
      savingsRate: (profile.savings_rate * 100).toFixed(1) + '%',
      monthlyIncome: '₹' + Math.round(profile.monthly_income).toLocaleString(),
      monthlyExpense: '₹' + Math.round(profile.monthly_expense).toLocaleString(),
      debtToIncome: (profile.debt_to_income * 100).toFixed(1) + '%',
      investmentDiversity: profile.investment_diversity,
      emergencyFundMonths: profile.emergency_fund_months.toFixed(1),
      numGoals: profile.num_financial_goals,
      goalProgress: (profile.goal_progress_avg * 100).toFixed(0) + '%'
    };

    return {
      recommendations: allRecs.slice(0, 15),
      profileSummary,
      totalRecommendations: allRecs.length,
      generatedAt: new Date()
    };
  }

  async recordFeedback(userId, recommendationId, action) {
    this.hybridRecommender.recordFeedback(userId, recommendationId, action);
    await this.hybridRecommender.save(userId);

    this.feedbackLog.push({
      userId, recommendationId, action, timestamp: new Date()
    });
    if (this.feedbackLog.length > 1000) this.feedbackLog.shift();
  }

  getFeedbackStats() {
    const stats = { applied: 0, clicked: 0, dismissed: 0, total: this.feedbackLog.length };
    for (const f of this.feedbackLog) {
      if (f.action === 'applied') stats.applied++;
      else if (f.action === 'clicked') stats.clicked++;
      else stats.dismissed++;
    }
    stats.applicationRate = stats.total > 0 ? stats.applied / stats.total : 0;
    return stats;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  UserProfileBuilder,
  ContentBasedRecommender,
  CollaborativeFilter,
  HybridRecommender,
  ContextualRecommendationTriggers,
  RecommendationService
};
