// ============================================================================
// SPENDING INTELLIGENCE SERVICE — Deep Spending Pattern Analysis
// ============================================================================
// Implements merchant clustering, spending velocity analysis, subscription
// detection, impulse spending identification, and spending personality
// classification. All running locally.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');

const sum = (a) => a.reduce((s, v) => s + v, 0);
const mean = (a) => a.length ? sum(a) / a.length : 0;
const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const stdDev = (a) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(sum(a.map(v => (v - m) ** 2)) / (a.length - 1));
};

// ============================================================================
// §1  MERCHANT INTELLIGENCE — Clustering & Analysis
// ============================================================================

class MerchantIntelligence {
  constructor() {
    this.merchantProfiles = {};
  }

  analyze(transactions) {
    // Build merchant profiles
    for (const t of transactions.filter(t => t.type === 'expense')) {
      const merchant = this._normalizeMerchant(t.merchant || t.description || 'Unknown');
      if (!this.merchantProfiles[merchant]) {
        this.merchantProfiles[merchant] = {
          name: merchant,
          transactions: [],
          totalSpent: 0,
          count: 0,
          firstSeen: t.date,
          lastSeen: t.date,
          categories: {}
        };
      }

      const profile = this.merchantProfiles[merchant];
      profile.transactions.push({
        amount: Math.abs(t.amount || 0),
        date: t.date,
        category: t.category
      });
      profile.totalSpent += Math.abs(t.amount || 0);
      profile.count++;
      profile.lastSeen = t.date;
      const cat = t.category || 'unknown';
      profile.categories[cat] = (profile.categories[cat] || 0) + 1;
    }

    // Calculate merchant insights
    const merchantInsights = [];
    for (const [merchant, profile] of Object.entries(this.merchantProfiles)) {
      if (profile.count < 2) continue;

      const amounts = profile.transactions.map(t => t.amount);
      const dates = profile.transactions.map(t => new Date(t.date || 0));
      const daysBetween = [];
      for (let i = 1; i < dates.length; i++) {
        daysBetween.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
      }

      const avgFrequency = daysBetween.length > 0 ? mean(daysBetween) : 0;
      const isRecurring = daysBetween.length >= 2 &&
        stdDev(daysBetween) < mean(daysBetween) * 0.5 &&
        avgFrequency < 35;

      const topCategory = Object.entries(profile.categories)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

      merchantInsights.push({
        merchant: profile.name,
        totalSpent: Math.round(profile.totalSpent),
        transactionCount: profile.count,
        avgAmount: Math.round(mean(amounts)),
        medianAmount: Math.round(median(amounts)),
        maxAmount: Math.round(Math.max(...amounts)),
        minAmount: Math.round(Math.min(...amounts)),
        category: topCategory,
        firstSeen: profile.firstSeen,
        lastSeen: profile.lastSeen,
        avgFrequencyDays: Math.round(avgFrequency),
        isRecurring,
        isSubscription: isRecurring && avgFrequency >= 25 && avgFrequency <= 35,
        priceConsistency: amounts.length > 1
          ? 1 - (stdDev(amounts) / (mean(amounts) || 1))
          : 0,
        loyaltyScore: this._calculateLoyalty(profile, transactions)
      });
    }

    // Sort by total spent
    merchantInsights.sort((a, b) => b.totalSpent - a.totalSpent);

    // Merchant clusters
    const clusters = this._clusterMerchants(merchantInsights);

    // Top merchants summary
    const topMerchants = merchantInsights.slice(0, 10);
    const subscriptions = merchantInsights.filter(m => m.isSubscription);
    const recurringMerchants = merchantInsights.filter(m => m.isRecurring && !m.isSubscription);

    return {
      totalMerchants: merchantInsights.length,
      topMerchants,
      subscriptions,
      recurringMerchants,
      clusters,
      subscriptionTotal: Math.round(sum(subscriptions.map(s => s.avgAmount))),
      concentrationRisk: this._calculateConcentration(merchantInsights),
      diversityScore: Math.min(100, merchantInsights.length * 5),
      insights: this._generateMerchantInsights(merchantInsights, subscriptions)
    };
  }

  _normalizeMerchant(name) {
    return (name || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .slice(0, 3)
      .join(' ') || 'unknown';
  }

  _calculateLoyalty(profile, allTransactions) {
    const totalExpenses = allTransactions.filter(t => t.type === 'expense').length;
    return totalExpenses > 0 ? Math.min(100, (profile.count / totalExpenses) * 500) : 0;
  }

  _clusterMerchants(merchants) {
    const clusters = {};
    for (const m of merchants) {
      const cluster = m.category || 'other';
      if (!clusters[cluster]) clusters[cluster] = { merchants: [], totalSpent: 0, count: 0 };
      clusters[cluster].merchants.push(m.merchant);
      clusters[cluster].totalSpent += m.totalSpent;
      clusters[cluster].count += m.transactionCount;
    }

    return Object.entries(clusters)
      .map(([name, data]) => ({
        category: name,
        merchantCount: data.merchants.length,
        totalSpent: Math.round(data.totalSpent),
        transactionCount: data.count,
        topMerchants: data.merchants.slice(0, 3)
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }

  _calculateConcentration(merchants) {
    const totalSpent = sum(merchants.map(m => m.totalSpent));
    if (totalSpent === 0 || merchants.length === 0) return 0;

    // Herfindahl-Hirschman Index
    const hhi = sum(merchants.map(m => (m.totalSpent / totalSpent) ** 2));
    return Math.round(hhi * 10000);
  }

  _generateMerchantInsights(merchants, subscriptions) {
    const insights = [];

    if (subscriptions.length > 0) {
      const monthlySubCost = sum(subscriptions.map(s => s.avgAmount));
      insights.push({
        type: 'subscription_alert',
        message: `You have ${subscriptions.length} subscriptions totaling ₹${monthlySubCost.toLocaleString()}/month (₹${(monthlySubCost * 12).toLocaleString()}/year)`,
        priority: 'medium'
      });
    }

    const topMerchant = merchants[0];
    if (topMerchant) {
      const totalSpent = sum(merchants.map(m => m.totalSpent));
      const topPct = totalSpent > 0 ? (topMerchant.totalSpent / totalSpent * 100) : 0;
      if (topPct > 25) {
        insights.push({
          type: 'concentration',
          message: `${topMerchant.merchant} accounts for ${topPct.toFixed(0)}% of all spending. Consider if this concentration is intentional.`,
          priority: 'low'
        });
      }
    }

    return insights;
  }
}

// ============================================================================
// §2  SPENDING VELOCITY TRACKER
// ============================================================================

class SpendingVelocityTracker {
  analyze(transactions) {
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

    if (expenses.length < 10) {
      return { daily: [], weekly: [], velocity: 0, burnRate: 0 };
    }

    // Daily spending velocity
    const dailySpend = {};
    for (const t of expenses) {
      const day = new Date(t.date || 0).toISOString().split('T')[0];
      dailySpend[day] = (dailySpend[day] || 0) + Math.abs(t.amount || 0);
    }

    const dailyValues = Object.entries(dailySpend)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Weekly aggregation
    const weeklySpend = {};
    for (const { date, amount } of dailyValues) {
      const d = new Date(date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      weeklySpend[weekKey] = (weeklySpend[weekKey] || 0) + amount;
    }

    const weeklyValues = Object.entries(weeklySpend)
      .map(([week, amount]) => ({ week, amount }))
      .sort((a, b) => a.week.localeCompare(b.week));

    // Velocity analysis
    const dailyAmounts = dailyValues.map(d => d.amount);
    const currentVelocity = dailyAmounts.length >= 7
      ? mean(dailyAmounts.slice(-7))
      : mean(dailyAmounts);
    const historicalVelocity = mean(dailyAmounts);

    // Burn rate analysis
    const monthlyBurn = currentVelocity * 30;
    const remainingDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();
    const projectedMonthEnd = currentVelocity * remainingDays;

    // Acceleration
    const recentWeeks = weeklyValues.slice(-4).map(w => w.amount);
    const olderWeeks = weeklyValues.slice(-8, -4).map(w => w.amount);
    const acceleration = olderWeeks.length > 0 && recentWeeks.length > 0
      ? (mean(recentWeeks) - mean(olderWeeks)) / (mean(olderWeeks) || 1)
      : 0;

    // Day-of-week patterns
    const dowSpending = Array(7).fill(0);
    const dowCounts = Array(7).fill(0);
    for (const t of expenses) {
      const dow = new Date(t.date || 0).getDay();
      dowSpending[dow] += Math.abs(t.amount || 0);
      dowCounts[dow]++;
    }
    const dowAverage = dowSpending.map((total, i) => ({
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
      average: dowCounts[i] > 0 ? Math.round(total / dowCounts[i]) : 0
    }));

    // Hour-of-day patterns
    const hourSpending = Array(24).fill(0);
    const hourCounts = Array(24).fill(0);
    for (const t of expenses) {
      const h = new Date(t.date || Date.now()).getHours();
      hourSpending[h] += Math.abs(t.amount || 0);
      hourCounts[h]++;
    }
    const peakHour = hourSpending.indexOf(Math.max(...hourSpending));

    return {
      daily: dailyValues.slice(-30),
      weekly: weeklyValues.slice(-12),
      currentDailyVelocity: Math.round(currentVelocity),
      historicalDailyVelocity: Math.round(historicalVelocity),
      monthlyBurnRate: Math.round(monthlyBurn),
      projectedRemainder: Math.round(projectedMonthEnd),
      acceleration: (acceleration * 100).toFixed(1) + '%',
      accelerating: acceleration > 0.1,
      decelerating: acceleration < -0.1,
      dowPattern: dowAverage,
      peakSpendingDay: dowAverage.sort((a, b) => b.average - a.average)[0]?.day,
      peakSpendingHour: `${peakHour}:00-${peakHour + 1}:00`,
      volatility: dailyAmounts.length > 1 ? (stdDev(dailyAmounts) / mean(dailyAmounts) * 100).toFixed(1) + '%' : '0%'
    };
  }
}

// ============================================================================
// §3  IMPULSE SPENDING DETECTOR
// ============================================================================

class ImpulseSpendingDetector {
  detect(transactions) {
    const expenses = transactions.filter(t => t.type === 'expense');
    if (expenses.length < 20) return { impulseTransactions: [], impulseScore: 0 };

    const amounts = expenses.map(t => Math.abs(t.amount || 0));
    const avgAmount = mean(amounts);
    const stdAmount = stdDev(amounts);

    const impulseIndicators = expenses.map(t => {
      const amount = Math.abs(t.amount || 0);
      const d = new Date(t.date || Date.now());
      const indicators = [];
      let impulseScore = 0;

      // Large amount (z-score > 1.5)
      if (stdAmount > 0 && (amount - avgAmount) / stdAmount > 1.5) {
        indicators.push('unusually_large_amount');
        impulseScore += 30;
      }

      // Late night (10pm - 2am)
      const hour = d.getHours();
      if (hour >= 22 || hour < 2) {
        indicators.push('late_night_purchase');
        impulseScore += 20;
      }

      // Weekend
      if (d.getDay() === 0 || d.getDay() === 6) {
        indicators.push('weekend');
        impulseScore += 5;
      }

      // Non-essential category
      const cat = (t.category || '').toLowerCase();
      const nonEssential = ['entertainment', 'shopping', 'dining', 'fashion', 'luxury'];
      if (nonEssential.some(ne => cat.includes(ne))) {
        indicators.push('non_essential');
        impulseScore += 15;
      }

      // Quick succession (within 1 hour of another purchase)
      const nearbyTxns = expenses.filter(other => {
        if (other === t) return false;
        const timeDiff = Math.abs(new Date(other.date || 0) - d);
        return timeDiff < 3600000; // 1 hour
      });
      if (nearbyTxns.length > 0) {
        indicators.push('rapid_succession');
        impulseScore += 20;
      }

      // Online purchase indicators
      const desc = (t.description || '').toLowerCase();
      if (desc.includes('amazon') || desc.includes('flipkart') || desc.includes('myntra')) {
        indicators.push('e_commerce');
        impulseScore += 10;
      }

      return {
        transaction: {
          amount,
          date: t.date,
          category: t.category,
          description: t.description
        },
        indicators,
        impulseScore: Math.min(100, impulseScore),
        isImpulse: impulseScore >= 40
      };
    });

    const impulseTxns = impulseIndicators.filter(i => i.isImpulse);
    const totalImpulseSpend = sum(impulseTxns.map(i => i.transaction.amount));
    const totalSpend = sum(amounts);

    // Identify impulse patterns
    const patterns = this._identifyPatterns(impulseTxns);

    return {
      impulseTransactions: impulseTxns.sort((a, b) => b.impulseScore - a.impulseScore).slice(0, 20),
      totalImpulseSpend: Math.round(totalImpulseSpend),
      impulseSpendPercent: totalSpend > 0 ? ((totalImpulseSpend / totalSpend) * 100).toFixed(1) : 0,
      impulseCount: impulseTxns.length,
      overallImpulseScore: Math.min(100,
        impulseTxns.length > 0 ? mean(impulseTxns.map(i => i.impulseScore)) : 0
      ),
      patterns,
      recommendations: this._getRecommendations(impulseTxns, totalImpulseSpend, patterns)
    };
  }

  _identifyPatterns(impulseTxns) {
    const patterns = [];
    const indicatorCounts = {};

    for (const txn of impulseTxns) {
      for (const ind of txn.indicators) {
        indicatorCounts[ind] = (indicatorCounts[ind] || 0) + 1;
      }
    }

    const sorted = Object.entries(indicatorCounts).sort((a, b) => b[1] - a[1]);
    for (const [indicator, count] of sorted) {
      if (count >= 3) {
        patterns.push({
          pattern: indicator,
          frequency: count,
          description: this._getPatternDescription(indicator)
        });
      }
    }

    return patterns;
  }

  _getPatternDescription(indicator) {
    const descriptions = {
      unusually_large_amount: 'You tend to make large impulse purchases above your normal spending range',
      late_night_purchase: 'Late-night shopping (10pm-2am) is a common impulse trigger for you',
      weekend: 'Weekend spending tends to be more impulsive',
      non_essential: 'Non-essential categories (entertainment, shopping) see more impulse purchases',
      rapid_succession: 'Multiple quick purchases in a row indicate impulse buying sessions',
      e_commerce: 'Online shopping platforms are a significant impulse spending source'
    };
    return descriptions[indicator] || indicator;
  }

  _getRecommendations(impulseTxns, totalImpulse, patterns) {
    const recs = [];

    if (totalImpulse > 0) {
      recs.push({
        type: 'awareness',
        message: `You spent ₹${totalImpulse.toLocaleString()} on potential impulse purchases. The 24-hour rule can reduce this by 40-60%.`
      });
    }

    for (const pattern of patterns.slice(0, 2)) {
      if (pattern.pattern === 'late_night_purchase') {
        recs.push({
          type: 'action',
          message: 'Remove saved payment methods from shopping apps and set a "no shopping after 10pm" rule.'
        });
      }
      if (pattern.pattern === 'e_commerce') {
        recs.push({
          type: 'action',
          message: 'Uninstall shopping apps or disable push notifications to reduce temptation. Use a wishlist and wait 48 hours.'
        });
      }
      if (pattern.pattern === 'rapid_succession') {
        recs.push({
          type: 'action',
          message: 'When you feel the urge to keep buying, close the app/browser and do something else for 10 minutes.'
        });
      }
    }

    return recs;
  }
}

// ============================================================================
// §4  SPENDING PERSONALITY CLASSIFIER
// ============================================================================

class SpendingPersonalityClassifier {
  classify(data) {
    const { transactions, budgets, savings, goals } = data;

    if (!transactions || transactions.length < 20) {
      return { personality: 'Unknown', confidence: 0, details: 'Insufficient data' };
    }

    const expenses = transactions.filter(t => t.type === 'expense');
    const amounts = expenses.map(t => Math.abs(t.amount || 0));
    const totalIncome = sum(transactions.filter(t => t.type === 'income').map(t => Math.abs(t.amount || 0)));
    const totalExpense = sum(amounts);
    const savingsRate = totalIncome > 0 ? (totalIncome - totalExpense) / totalIncome : 0;

    // Calculate traits
    const traits = {
      frugality: Math.min(100, savingsRate * 400), // 25% savings = 100
      consistency: this._calculateConsistency(expenses),
      impulsiveness: this._calculateImpulsiveness(expenses, amounts),
      diversity: Math.min(100, new Set(expenses.map(t => t.category)).size * 12),
      planning: this._calculatePlanning(budgets, goals),
      riskTolerance: this._calculateRiskTolerance(data),
      generosity: this._calculateGenerosity(expenses),
      techSavvy: this._calculateTechSavviness(expenses)
    };

    // Classify personality
    const personality = this._determinePersonality(traits);

    return {
      personality: personality.name,
      description: personality.description,
      traits,
      strengths: personality.strengths,
      weaknesses: personality.weaknesses,
      tips: personality.tips,
      confidence: personality.confidence,
      matchedTraits: personality.matchedTraits
    };
  }

  _calculateConsistency(expenses) {
    if (expenses.length < 10) return 50;
    const monthly = {};
    for (const t of expenses) {
      const m = new Date(t.date || Date.now()).toISOString().substring(0, 7);
      monthly[m] = (monthly[m] || 0) + Math.abs(t.amount || 0);
    }
    const values = Object.values(monthly);
    if (values.length < 2) return 50;
    const cv = stdDev(values) / (mean(values) || 1);
    return Math.max(0, 100 - cv * 200);
  }

  _calculateImpulsiveness(expenses, amounts) {
    const lateNight = expenses.filter(t => {
      const h = new Date(t.date || Date.now()).getHours();
      return h >= 22 || h < 4;
    }).length;

    const largePurchases = amounts.filter(a => a > mean(amounts) * 2.5).length;
    const weekendPct = expenses.filter(t => {
      const d = new Date(t.date || Date.now()).getDay();
      return d === 0 || d === 6;
    }).length / (expenses.length || 1);

    return Math.min(100,
      (lateNight / expenses.length) * 200 +
      (largePurchases / expenses.length) * 300 +
      weekendPct * 50
    );
  }

  _calculatePlanning(budgets, goals) {
    let score = 0;
    if (budgets && budgets.length > 0) score += 40;
    if (goals && goals.length > 0) score += 30;
    if (goals?.some(g => g.deadline || g.targetDate)) score += 15;
    if (budgets?.length > 3) score += 15;
    return Math.min(100, score);
  }

  _calculateRiskTolerance(data) {
    const investments = data.investments || [];
    if (investments.length === 0) return 30;

    const equityRatio = investments.filter(i =>
      (i.type || i.assetClass || '').toLowerCase().includes('equit')
    ).length / investments.length;

    return Math.min(100, equityRatio * 120 + investments.length * 5);
  }

  _calculateGenerosity(expenses) {
    const generousCategories = ['gifts', 'donation', 'charity', 'tips'];
    const generousSpend = expenses.filter(t =>
      generousCategories.some(g => (t.category || '').toLowerCase().includes(g) ||
        (t.description || '').toLowerCase().includes(g))
    ).length;
    return Math.min(100, (generousSpend / (expenses.length || 1)) * 500);
  }

  _calculateTechSavviness(expenses) {
    const digitalPayments = expenses.filter(t => {
      const desc = (t.description || '').toLowerCase();
      return desc.includes('upi') || desc.includes('gpay') || desc.includes('phonepe') ||
        desc.includes('paytm') || desc.includes('cred') || desc.includes('online');
    }).length;
    return Math.min(100, (digitalPayments / (expenses.length || 1)) * 200);
  }

  _determinePersonality(traits) {
    const personalities = [
      {
        name: 'The Saver',
        condition: (t) => t.frugality > 70 && t.consistency > 60,
        confidence: (t) => (t.frugality + t.consistency) / 2,
        description: 'You prioritize saving and are consistent with spending. Money security is important to you.',
        strengths: ['Strong savings discipline', 'Consistent spending patterns', 'Future-oriented mindset'],
        weaknesses: ['May miss opportunities by being too conservative', 'Could benefit from strategic spending on experiences'],
        tips: ['Consider investing surplus savings for growth', 'Reward yourself occasionally for discipline', 'Explore higher-return investment options'],
        matchedTraits: ['frugality', 'consistency']
      },
      {
        name: 'The Planner',
        condition: (t) => t.planning > 60 && t.consistency > 50,
        confidence: (t) => (t.planning + t.consistency) / 2,
        description: 'You\'re organized with budgets and goals. Financial planning is a strength.',
        strengths: ['Goal-oriented', 'Budget-conscious', 'Long-term thinker'],
        weaknesses: ['May over-plan and miss spontaneous opportunities', 'Could feel anxious when plans go off-track'],
        tips: ['Build flexibility into your budgets (10% buffer)', 'Automate routine financial tasks', 'Review and adjust goals quarterly'],
        matchedTraits: ['planning', 'consistency']
      },
      {
        name: 'The Adventurer',
        condition: (t) => t.riskTolerance > 60 && t.diversity > 60,
        confidence: (t) => (t.riskTolerance + t.diversity) / 2,
        description: 'You\'re comfortable with risk and explore diverse spending and investment options.',
        strengths: ['Open to new opportunities', 'Diversified interests', 'Growth-oriented'],
        weaknesses: ['May take on too much risk', 'Spending could be unpredictable', 'May neglect emergency savings'],
        tips: ['Balance adventure with a safety net (6-month emergency fund)', 'Track spending to identify patterns', 'Set stop-losses for investments'],
        matchedTraits: ['riskTolerance', 'diversity']
      },
      {
        name: 'The Impulse Buyer',
        condition: (t) => t.impulsiveness > 60,
        confidence: (t) => t.impulsiveness,
        description: 'You tend to make spontaneous purchases, especially when emotions are high.',
        strengths: ['Enjoys life experiences', 'Decisiveness', 'Generosity'],
        weaknesses: ['Inconsistent savings', 'Buyer\'s remorse', 'Emotional spending'],
        tips: ['Use the 24-hour rule for non-essentials over ₹1,000', 'Remove saved payment cards from apps', 'Set weekly spending limits'],
        matchedTraits: ['impulsiveness']
      },
      {
        name: 'The Balanced Spender',
        condition: (t) => t.frugality > 40 && t.frugality < 70 && t.impulsiveness < 50,
        confidence: (t) => 50 + (100 - Math.abs(t.frugality - 55)) / 2,
        description: 'You maintain a healthy balance between saving and spending. Money is a tool for well-being.',
        strengths: ['Balanced approach', 'Flexible mindset', 'Moderate risk tolerance'],
        weaknesses: ['May lack extreme discipline in savings', 'Could benefit from more specific goals'],
        tips: ['Set specific financial goals to channel your balance', 'Consider automating savings to maintain discipline', 'Track emotional spending triggers'],
        matchedTraits: ['frugality', 'consistency']
      }
    ];

    // Find best matching personality
    let bestMatch = null;
    let bestConfidence = 0;

    for (const p of personalities) {
      if (p.condition(traits)) {
        const conf = p.confidence(traits);
        if (conf > bestConfidence) {
          bestConfidence = conf;
          bestMatch = p;
        }
      }
    }

    if (!bestMatch) {
      bestMatch = personalities[personalities.length - 1]; // Default to Balanced
      bestConfidence = 50;
    }

    return { ...bestMatch, confidence: Math.round(Math.min(100, bestConfidence)) };
  }
}

// ============================================================================
// §5  SPENDING FORECAST (Daily Granularity)
// ============================================================================

class DailySpendingForecaster {
  forecast(transactions, daysAhead = 30) {
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

    if (expenses.length < 14) {
      return { forecast: [], error: 'Need at least 14 days of data' };
    }

    // Aggregate daily spending
    const daily = {};
    for (const t of expenses) {
      const day = new Date(t.date || 0).toISOString().split('T')[0];
      daily[day] = (daily[day] || 0) + Math.abs(t.amount || 0);
    }

    const allDays = Object.entries(daily).sort((a, b) => a[0].localeCompare(b[0]));
    const values = allDays.map(([, v]) => v);

    // Day-of-week seasonality
    const dowPattern = Array(7).fill(0);
    const dowCounts = Array(7).fill(0);
    for (const [date, amount] of allDays) {
      const dow = new Date(date).getDay();
      dowPattern[dow] += amount;
      dowCounts[dow]++;
    }
    for (let i = 0; i < 7; i++) {
      dowPattern[i] = dowCounts[i] > 0 ? dowPattern[i] / dowCounts[i] : 0;
    }
    const dowAvg = mean(dowPattern.filter(d => d > 0));
    const dowMultiplier = dowPattern.map(d => dowAvg > 0 ? d / dowAvg : 1);

    // Day-of-month pattern
    const domPattern = Array(31).fill(0);
    const domCounts = Array(31).fill(0);
    for (const [date, amount] of allDays) {
      const dom = new Date(date).getDate() - 1;
      domPattern[dom] += amount;
      domCounts[dom]++;
    }
    for (let i = 0; i < 31; i++) {
      domPattern[i] = domCounts[i] > 0 ? domPattern[i] / domCounts[i] : 0;
    }

    // Trend
    const recentAvg = mean(values.slice(-7));
    const olderAvg = mean(values.slice(-14, -7));
    const trend = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;

    // Generate forecast
    const lastDate = new Date(allDays[allDays.length - 1][0]);
    const forecast = [];
    const baseAmount = recentAvg;

    for (let d = 1; d <= daysAhead; d++) {
      const date = new Date(lastDate.getTime() + d * 86400000);
      const dow = date.getDay();
      const dom = date.getDate() - 1;
      const dowEffect = dowMultiplier[dow] || 1;
      const domEffect = domPattern[dom] > 0 ? domPattern[dom] / (mean(domPattern.filter(p => p > 0)) || 1) : 1;

      const trendAdjustment = 1 + trend * (d / 30);
      const predicted = baseAmount * dowEffect * 0.5 + baseAmount * domEffect * 0.3 + baseAmount * trendAdjustment * 0.2;

      forecast.push({
        date: date.toISOString().split('T')[0],
        predicted: Math.max(0, Math.round(predicted)),
        dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dow],
        lower: Math.max(0, Math.round(predicted * 0.7)),
        upper: Math.round(predicted * 1.3)
      });
    }

    // Summary
    const totalForecast = sum(forecast.map(f => f.predicted));
    const weeklyForecast = [];
    for (let w = 0; w < Math.ceil(daysAhead / 7); w++) {
      weeklyForecast.push({
        week: w + 1,
        total: sum(forecast.slice(w * 7, (w + 1) * 7).map(f => f.predicted))
      });
    }

    return {
      forecast,
      totalForecast: Math.round(totalForecast),
      dailyAverage: Math.round(totalForecast / daysAhead),
      weeklyForecast,
      trend: trend > 0.05 ? 'increasing' : trend < -0.05 ? 'decreasing' : 'stable',
      trendPercent: (trend * 100).toFixed(1) + '%',
      peakDays: forecast.sort((a, b) => b.predicted - a.predicted).slice(0, 3).map(f => f.date),
      lowDays: [...forecast].sort((a, b) => a.predicted - b.predicted).slice(0, 3).map(f => f.date)
    };
  }
}

// ============================================================================
// §6  UNIFIED SPENDING INTELLIGENCE SERVICE
// ============================================================================

class SpendingIntelligenceService {
  constructor() {
    this.merchantIntel = new MerchantIntelligence();
    this.velocityTracker = new SpendingVelocityTracker();
    this.impulseDetector = new ImpulseSpendingDetector();
    this.personalityClassifier = new SpendingPersonalityClassifier();
    this.dailyForecaster = new DailySpendingForecaster();
  }

  async analyzeComprehensive(userId, data) {
    const { transactions, budgets, goals, investments } = data;

    return {
      merchantAnalysis: this.merchantIntel.analyze(transactions || []),
      velocity: this.velocityTracker.analyze(transactions || []),
      impulseAnalysis: this.impulseDetector.detect(transactions || []),
      personality: this.personalityClassifier.classify(data),
      forecast: this.dailyForecaster.forecast(transactions || [], 30),
      generatedAt: new Date(),
      userId
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  MerchantIntelligence,
  SpendingVelocityTracker,
  ImpulseSpendingDetector,
  SpendingPersonalityClassifier,
  DailySpendingForecaster,
  SpendingIntelligenceService
};
