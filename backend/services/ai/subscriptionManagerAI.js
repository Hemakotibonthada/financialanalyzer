// ============================================================================
// SUBSCRIPTION MANAGER AI — Smart Subscription Tracking & Optimization
// ============================================================================
// Auto-detects subscriptions from transaction data, predicts renewals,
// calculates lifetime costs, finds unused subscriptions, suggests
// alternatives, and tracks price changes. Runs entirely locally.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');

const sum = (a) => a.reduce((s, v) => s + v, 0);
const mean = (a) => (a.length ? sum(a) / a.length : 0);

// ============================================================================
// §1  SUBSCRIPTION DETECTOR
// ============================================================================

class SubscriptionDetector {
  constructor() {
    // Known subscription services (Indian market)
    this.knownSubscriptions = {
      'netflix': { name: 'Netflix', category: 'streaming', typicalRange: [149, 799] },
      'spotify': { name: 'Spotify', category: 'music', typicalRange: [59, 179] },
      'prime': { name: 'Amazon Prime', category: 'streaming', typicalRange: [299, 1499] },
      'hotstar': { name: 'Disney+ Hotstar', category: 'streaming', typicalRange: [149, 499] },
      'youtube': { name: 'YouTube Premium', category: 'streaming', typicalRange: [129, 189] },
      'zee5': { name: 'ZEE5', category: 'streaming', typicalRange: [99, 499] },
      'sonyliv': { name: 'SonyLIV', category: 'streaming', typicalRange: [299, 999] },
      'jiocinema': { name: 'JioCinema', category: 'streaming', typicalRange: [29, 149] },
      'apple music': { name: 'Apple Music', category: 'music', typicalRange: [99, 149] },
      'gaana': { name: 'Gaana', category: 'music', typicalRange: [99, 399] },
      'wynk': { name: 'Wynk Music', category: 'music', typicalRange: [49, 99] },
      'linkedin': { name: 'LinkedIn Premium', category: 'professional', typicalRange: [1500, 5000] },
      'medium': { name: 'Medium', category: 'reading', typicalRange: [200, 500] },
      'notion': { name: 'Notion', category: 'productivity', typicalRange: [300, 800] },
      'canva': { name: 'Canva', category: 'design', typicalRange: [500, 1000] },
      'adobe': { name: 'Adobe Creative Cloud', category: 'design', typicalRange: [1500, 5000] },
      'dropbox': { name: 'Dropbox', category: 'storage', typicalRange: [800, 1500] },
      'icloud': { name: 'iCloud', category: 'storage', typicalRange: [75, 749] },
      'google one': { name: 'Google One', category: 'storage', typicalRange: [130, 650] },
      'microsoft 365': { name: 'Microsoft 365', category: 'productivity', typicalRange: [400, 550] },
      'airtel': { name: 'Airtel', category: 'telecom', typicalRange: [149, 999] },
      'jio': { name: 'Jio', category: 'telecom', typicalRange: [149, 999] },
      'vi': { name: 'Vi (Vodafone Idea)', category: 'telecom', typicalRange: [149, 699] },
      'gym': { name: 'Gym Membership', category: 'fitness', typicalRange: [500, 5000] },
      'cult': { name: 'Cult.fit', category: 'fitness', typicalRange: [599, 2999] },
      'swiggy one': { name: 'Swiggy One', category: 'food_delivery', typicalRange: [149, 299] },
      'zomato gold': { name: 'Zomato Gold', category: 'food_delivery', typicalRange: [149, 500] },
      'cred': { name: 'CRED', category: 'finance', typicalRange: [0, 99] },
      'newspaper': { name: 'Newspaper', category: 'news', typicalRange: [150, 500] },
      'coursera': { name: 'Coursera', category: 'education', typicalRange: [2000, 4000] },
      'udemy': { name: 'Udemy', category: 'education', typicalRange: [399, 1999] },
      'aws': { name: 'AWS', category: 'cloud', typicalRange: [500, 10000] },
      'github': { name: 'GitHub', category: 'development', typicalRange: [300, 700] },
      'vpn': { name: 'VPN Service', category: 'security', typicalRange: [200, 500] },
      'antivirus': { name: 'Antivirus', category: 'security', typicalRange: [200, 800] }
    };
  }

  detect(transactions) {
    const expenses = transactions.filter(t => t.type === 'expense');
    const detected = [];

    // Step 1: Match against known subscriptions
    for (const t of expenses) {
      const desc = (t.description || t.merchant || '').toLowerCase();
      for (const [key, info] of Object.entries(this.knownSubscriptions)) {
        if (desc.includes(key)) {
          detected.push({
            ...t,
            subscriptionName: info.name,
            subscriptionCategory: info.category,
            matchedKey: key
          });
          break;
        }
      }
    }

    // Step 2: Detect unknown recurring payments with subscription characteristics
    const merchantGroups = {};
    for (const t of expenses) {
      const key = this._merchantKey(t);
      if (!merchantGroups[key]) merchantGroups[key] = [];
      merchantGroups[key].push({
        amount: Math.abs(t.amount || 0),
        date: new Date(t.date || Date.now()),
        description: t.description || t.merchant || ''
      });
    }

    for (const [key, entries] of Object.entries(merchantGroups)) {
      if (entries.length < 2) continue;

      const amounts = entries.map(e => e.amount);
      const amountCV = amounts.length > 1 ? (Math.sqrt(sum(amounts.map(a => (a - mean(amounts)) ** 2)) / amounts.length) / (mean(amounts) || 1)) : 1;

      const dates = entries.sort((a, b) => a.date - b.date);
      const gaps = [];
      for (let i = 1; i < dates.length; i++) {
        gaps.push((dates[i].date - dates[i - 1].date) / (1000 * 60 * 60 * 24));
      }
      const avgGap = mean(gaps);
      const gapCV = gaps.length > 0 ? (Math.sqrt(sum(gaps.map(g => (g - avgGap) ** 2)) / gaps.length) / (avgGap || 1)) : 1;

      const isSubscription = amountCV < 0.08 && gapCV < 0.25 && avgGap >= 25 && avgGap <= 35;

      if (isSubscription) {
        const existingMatch = detected.find(d => this._merchantKey(d) === key);
        if (!existingMatch) {
          detected.push({
            description: entries[0].description,
            amount: mean(amounts),
            subscriptionName: entries[0].description,
            subscriptionCategory: 'unknown',
            matchedKey: key,
            autoDetected: true,
            entries
          });
        }
      }
    }

    // Step 3: Consolidate and enrich
    const subscriptions = this._consolidate(detected, expenses);
    return subscriptions;
  }

  _merchantKey(txn) {
    return (txn.description || txn.merchant || '')
      .toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15);
  }

  _consolidate(detected, allExpenses) {
    const consolidated = {};

    for (const d of detected) {
      const key = d.matchedKey || this._merchantKey(d);
      if (!consolidated[key]) {
        consolidated[key] = {
          name: d.subscriptionName || d.description,
          category: d.subscriptionCategory || 'unknown',
          payments: [],
          autoDetected: d.autoDetected || false
        };
      }

      // Find all matching transactions
      for (const t of allExpenses) {
        if (this._merchantKey(t) === key && !consolidated[key].payments.find(p =>
          Math.abs(new Date(p.date || 0) - new Date(t.date || 0)) < 86400000
        )) {
          consolidated[key].payments.push({
            amount: Math.abs(t.amount || 0),
            date: t.date
          });
        }
      }
    }

    // Build final subscription objects
    const subscriptions = [];
    for (const [key, sub] of Object.entries(consolidated)) {
      if (sub.payments.length < 2) continue;

      const amounts = sub.payments.map(p => p.amount);
      const sortedDates = sub.payments.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
      const gaps = [];
      for (let i = 1; i < sortedDates.length; i++) {
        gaps.push((new Date(sortedDates[i].date) - new Date(sortedDates[i - 1].date)) / 86400000);
      }

      const avgAmount = mean(amounts);
      const avgGap = gaps.length > 0 ? mean(gaps) : 30;
      const lastPayment = new Date(sortedDates[sortedDates.length - 1].date);
      const nextExpected = new Date(lastPayment.getTime() + avgGap * 86400000);
      const firstPayment = new Date(sortedDates[0].date);
      const lifetimeMonths = Math.max(1, (lastPayment - firstPayment) / (30 * 86400000));

      // Price trend
      const recentAvg = amounts.length >= 4 ? mean(amounts.slice(-2)) : avgAmount;
      const olderAvg = amounts.length >= 4 ? mean(amounts.slice(0, 2)) : avgAmount;
      const priceChange = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;

      subscriptions.push({
        name: sub.name,
        category: sub.category,
        currentAmount: Math.round(amounts[amounts.length - 1] || avgAmount),
        averageAmount: Math.round(avgAmount),
        frequency: avgGap <= 35 ? 'monthly' : avgGap <= 100 ? 'quarterly' : 'annual',
        totalPayments: sub.payments.length,
        totalSpent: Math.round(sum(amounts)),
        lifetimeMonths: Math.round(lifetimeMonths),
        monthlyCost: Math.round(avgGap <= 35 ? avgAmount : avgGap <= 100 ? avgAmount / 3 : avgAmount / 12),
        annualCost: Math.round(avgGap <= 35 ? avgAmount * 12 : avgGap <= 100 ? avgAmount * 4 : avgAmount),
        firstPayment,
        lastPayment,
        nextExpected,
        daysUntilNext: Math.max(0, Math.round((nextExpected - Date.now()) / 86400000)),
        priceChangePercent: (priceChange * 100).toFixed(1),
        priceDirection: priceChange > 0.05 ? 'increasing' : priceChange < -0.05 ? 'decreasing' : 'stable',
        isActive: (Date.now() - lastPayment.getTime()) < avgGap * 1.5 * 86400000,
        autoDetected: sub.autoDetected,
        costPerDay: Math.round((avgGap <= 35 ? avgAmount : avgAmount / (avgGap / 30)) / 30),
        knownService: !!this.knownSubscriptions[key]
      });
    }

    return subscriptions.sort((a, b) => b.annualCost - a.annualCost);
  }
}

// ============================================================================
// §2  SUBSCRIPTION OPTIMIZER
// ============================================================================

class SubscriptionOptimizer {
  constructor() {
    this.alternatives = {
      streaming: [
        { name: 'JioCinema (Free tier)', monthlyCost: 0 },
        { name: 'MX Player', monthlyCost: 0 },
        { name: 'YouTube (Free)', monthlyCost: 0 }
      ],
      music: [
        { name: 'YouTube Music (Free)', monthlyCost: 0 },
        { name: 'JioSaavn (Free)', monthlyCost: 0 }
      ],
      storage: [
        { name: 'Google Drive (15GB free)', monthlyCost: 0 },
        { name: 'Local backup', monthlyCost: 0 }
      ]
    };
  }

  optimize(subscriptions) {
    const analysis = {
      totalMonthlyCost: sum(subscriptions.filter(s => s.isActive).map(s => s.monthlyCost)),
      totalAnnualCost: sum(subscriptions.filter(s => s.isActive).map(s => s.annualCost)),
      activeCount: subscriptions.filter(s => s.isActive).length,
      inactiveCount: subscriptions.filter(s => !s.isActive).length,
      categoryBreakdown: {},
      recommendations: [],
      potentialSavings: 0
    };

    // Category breakdown
    for (const sub of subscriptions.filter(s => s.isActive)) {
      if (!analysis.categoryBreakdown[sub.category]) {
        analysis.categoryBreakdown[sub.category] = { count: 0, monthlyCost: 0, services: [] };
      }
      analysis.categoryBreakdown[sub.category].count++;
      analysis.categoryBreakdown[sub.category].monthlyCost += sub.monthlyCost;
      analysis.categoryBreakdown[sub.category].services.push(sub.name);
    }

    // Detect duplicates (same category, multiple paid services)
    for (const [category, data] of Object.entries(analysis.categoryBreakdown)) {
      if (data.count > 1 && category !== 'telecom' && category !== 'unknown') {
        const savings = Math.round(data.monthlyCost * 0.5); // Assume can cut half
        analysis.recommendations.push({
          type: 'duplicate_category',
          priority: 'high',
          message: `You have ${data.count} ${category} subscriptions (${data.services.join(', ')}). Consider keeping only one to save ~₹${savings}/month.`,
          potentialMonthlySavings: savings,
          category,
          services: data.services
        });
        analysis.potentialSavings += savings;
      }
    }

    // Detect price increases
    for (const sub of subscriptions.filter(s => s.isActive && s.priceDirection === 'increasing')) {
      analysis.recommendations.push({
        type: 'price_increase',
        priority: 'medium',
        message: `${sub.name} has increased by ${sub.priceChangePercent}%. Current: ₹${sub.currentAmount}/mo. Consider alternatives.`,
        service: sub.name,
        currentCost: sub.currentAmount,
        changePercent: sub.priceChangePercent
      });
    }

    // Detect potentially unused subscriptions (no recent usage data, but can infer from amount)
    for (const sub of subscriptions.filter(s => s.isActive && s.lifetimeMonths > 6 && s.monthlyCost > 200)) {
      analysis.recommendations.push({
        type: 'usage_review',
        priority: 'low',
        message: `"${sub.name}" has been active for ${sub.lifetimeMonths} months (₹${sub.totalSpent} total). Still using it?`,
        service: sub.name,
        totalSpent: sub.totalSpent,
        monthsActive: sub.lifetimeMonths
      });
    }

    // Suggest free alternatives
    for (const sub of subscriptions.filter(s => s.isActive)) {
      const alts = this.alternatives[sub.category];
      if (alts && alts.length > 0) {
        analysis.recommendations.push({
          type: 'free_alternative',
          priority: 'low',
          message: `Free alternatives for ${sub.name}: ${alts.map(a => a.name).join(', ')}`,
          service: sub.name,
          alternatives: alts
        });
      }
    }

    // Annual plan savings suggestion
    for (const sub of subscriptions.filter(s => s.isActive && s.frequency === 'monthly' && s.monthlyCost > 100)) {
      const annualDiscount = Math.round(sub.monthlyCost * 12 * 0.17); // Typical 2 months free
      analysis.recommendations.push({
        type: 'annual_plan',
        priority: 'medium',
        message: `Switch ${sub.name} to annual plan to save ~₹${annualDiscount}/year (typically 15-20% off).`,
        service: sub.name,
        potentialAnnualSavings: annualDiscount
      });
      analysis.potentialSavings += Math.round(annualDiscount / 12);
    }

    // Sort recommendations by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    analysis.recommendations.sort((a, b) =>
      (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
    );

    return analysis;
  }
}

// ============================================================================
// §3  SUBSCRIPTION LIFECYCLE TRACKER
// ============================================================================

class SubscriptionLifecycleTracker {
  trackLifecycle(subscriptions) {
    const insights = {
      active: [],
      expiringSoon: [],
      recentlyCancelled: [],
      longestRunning: null,
      mostExpensive: null,
      bestValue: null,
      worstValue: null,
      totalLifetimeSpend: 0,
      averageSubscriptionAge: 0
    };

    for (const sub of subscriptions) {
      if (sub.isActive) {
        insights.active.push({
          name: sub.name,
          monthlyCost: sub.monthlyCost,
          since: sub.firstPayment,
          ageMonths: sub.lifetimeMonths
        });
      }

      if (sub.daysUntilNext <= 7 && sub.isActive) {
        insights.expiringSoon.push({
          name: sub.name,
          amount: sub.currentAmount,
          daysUntil: sub.daysUntilNext,
          nextDate: sub.nextExpected
        });
      }

      if (!sub.isActive) {
        insights.recentlyCancelled.push({
          name: sub.name,
          lastPayment: sub.lastPayment,
          totalSpent: sub.totalSpent
        });
      }

      insights.totalLifetimeSpend += sub.totalSpent;
    }

    // Find extremes
    const activeSubs = subscriptions.filter(s => s.isActive);
    if (activeSubs.length > 0) {
      insights.longestRunning = activeSubs.sort((a, b) => b.lifetimeMonths - a.lifetimeMonths)[0];
      insights.mostExpensive = activeSubs.sort((a, b) => b.monthlyCost - a.monthlyCost)[0];

      // Value score = lifetime months / monthly cost (inverse — lower cost per month of use = better value)
      const scored = activeSubs.map(s => ({
        ...s,
        valueScore: s.monthlyCost > 0 ? s.lifetimeMonths / s.monthlyCost * 100 : 0
      }));
      insights.bestValue = scored.sort((a, b) => b.valueScore - a.valueScore)[0];
      insights.worstValue = scored.sort((a, b) => a.valueScore - b.valueScore)[0];
    }

    insights.averageSubscriptionAge = activeSubs.length > 0
      ? mean(activeSubs.map(s => s.lifetimeMonths))
      : 0;

    return insights;
  }
}

// ============================================================================
// §4  UNIFIED SUBSCRIPTION MANAGER SERVICE
// ============================================================================

class SubscriptionManagerService {
  constructor() {
    this.detector = new SubscriptionDetector();
    this.optimizer = new SubscriptionOptimizer();
    this.lifecycleTracker = new SubscriptionLifecycleTracker();
  }

  analyze(transactions) {
    // Detect subscriptions
    const subscriptions = this.detector.detect(transactions);

    // Optimize
    const optimization = this.optimizer.optimize(subscriptions);

    // Lifecycle tracking
    const lifecycle = this.lifecycleTracker.trackLifecycle(subscriptions);

    return {
      subscriptions,
      optimization,
      lifecycle,
      summary: {
        totalActive: subscriptions.filter(s => s.isActive).length,
        totalInactive: subscriptions.filter(s => !s.isActive).length,
        monthlyCost: optimization.totalMonthlyCost,
        annualCost: optimization.totalAnnualCost,
        potentialMonthlySavings: optimization.potentialSavings,
        potentialAnnualSavings: optimization.potentialSavings * 12,
        totalLifetimeSpend: lifecycle.totalLifetimeSpend,
        recommendationCount: optimization.recommendations.length
      },
      generatedAt: new Date()
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  SubscriptionDetector,
  SubscriptionOptimizer,
  SubscriptionLifecycleTracker,
  SubscriptionManagerService
};
