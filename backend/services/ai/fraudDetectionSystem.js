// ============================================================================
// FRAUD DETECTION SYSTEM — Multi-Layer Financial Fraud Prevention
// ============================================================================
// Implements rule-based fraud screening, ML anomaly scoring, behavioral
// biometrics analysis, velocity checks, geolocation analysis, and
// real-time fraud alerting. Runs entirely locally.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

const sum = (a) => a.reduce((s, v) => s + v, 0);
const mean = (a) => (a.length ? sum(a) / a.length : 0);
const stdDev = (a) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(sum(a.map(v => (v - m) ** 2)) / (a.length - 1));
};

// ============================================================================
// §1  RULE ENGINE — Configurable Fraud Detection Rules
// ============================================================================

class FraudRuleEngine {
  constructor() {
    this.rules = [];
    this.ruleStats = {};
    this._registerDefaultRules();
  }

  _registerDefaultRules() {
    // High-value transaction rules
    this.addRule({
      id: 'rule_high_value_single',
      name: 'High-Value Single Transaction',
      description: 'Transaction exceeds user-specific high-value threshold',
      severity: 'high',
      category: 'amount',
      check: (txn, profile) => {
        const threshold = profile.avgExpense * 5 || 50000;
        const amount = Math.abs(txn.amount || 0);
        return {
          triggered: amount > threshold,
          score: Math.min(100, (amount / threshold) * 50),
          details: `Amount ₹${amount.toLocaleString()} exceeds threshold ₹${threshold.toLocaleString()}`
        };
      }
    });

    this.addRule({
      id: 'rule_high_value_daily',
      name: 'High Daily Spending',
      description: 'Total daily spending exceeds normal by 3x',
      severity: 'high',
      category: 'amount',
      check: (txn, profile, context) => {
        const dailyTotal = context.dailyTotal || 0;
        const threshold = (profile.avgDailySpend || 5000) * 3;
        return {
          triggered: dailyTotal > threshold,
          score: Math.min(100, (dailyTotal / threshold) * 60),
          details: `Daily total ₹${dailyTotal.toLocaleString()} exceeds ₹${threshold.toLocaleString()}`
        };
      }
    });

    // Velocity rules
    this.addRule({
      id: 'rule_rapid_transactions',
      name: 'Rapid Transaction Sequence',
      description: 'Multiple transactions within a very short time window',
      severity: 'medium',
      category: 'velocity',
      check: (txn, profile, context) => {
        const recentCount = context.transactionsLastHour || 0;
        const threshold = profile.avgHourlyTxns ? profile.avgHourlyTxns * 3 : 5;
        return {
          triggered: recentCount > threshold,
          score: Math.min(100, (recentCount / threshold) * 70),
          details: `${recentCount} transactions in last hour (normal: ${Math.round(threshold / 3)})`
        };
      }
    });

    this.addRule({
      id: 'rule_card_testing',
      name: 'Card Testing Pattern',
      description: 'Multiple small transactions followed by a large one (card testing pattern)',
      severity: 'critical',
      category: 'pattern',
      check: (txn, profile, context) => {
        const recentSmall = (context.recentTransactions || [])
          .filter(t => Math.abs(t.amount || 0) < 100)
          .length;
        const isLargeAfterSmall = recentSmall >= 3 && Math.abs(txn.amount || 0) > 5000;
        return {
          triggered: isLargeAfterSmall,
          score: isLargeAfterSmall ? 90 : 0,
          details: isLargeAfterSmall
            ? `Large transaction after ${recentSmall} small ones — possible card testing`
            : 'No card testing pattern detected'
        };
      }
    });

    // Time-based rules
    this.addRule({
      id: 'rule_unusual_hours',
      name: 'Unusual Transaction Time',
      description: 'Transaction at a time the user rarely transacts',
      severity: 'low',
      category: 'time',
      check: (txn, profile) => {
        const hour = new Date(txn.date || Date.now()).getHours();
        const isUnusual = (hour >= 1 && hour <= 5);
        const userNeverTransacts = profile.hourlyDistribution &&
          (profile.hourlyDistribution[hour] || 0) === 0;
        return {
          triggered: isUnusual || userNeverTransacts,
          score: userNeverTransacts ? 40 : (isUnusual ? 20 : 0),
          details: `Transaction at ${hour}:00 — ${isUnusual ? 'unusual hours' : 'normal'}`
        };
      }
    });

    this.addRule({
      id: 'rule_first_time_merchant',
      name: 'First-Time Merchant',
      description: 'Transaction with a merchant never seen before with high amount',
      severity: 'medium',
      category: 'merchant',
      check: (txn, profile) => {
        const merchant = (txn.merchant || txn.description || '').toLowerCase();
        const isNew = !profile.knownMerchants?.has(merchant);
        const isHighAmount = Math.abs(txn.amount || 0) > (profile.avgExpense || 2000) * 2;
        return {
          triggered: isNew && isHighAmount,
          score: isNew && isHighAmount ? 50 : (isNew ? 15 : 0),
          details: isNew
            ? `New merchant "${merchant}" with ${isHighAmount ? 'high' : 'normal'} amount`
            : 'Known merchant'
        };
      }
    });

    // Category-specific rules
    this.addRule({
      id: 'rule_unusual_category_amount',
      name: 'Unusual Category Amount',
      description: 'Amount significantly deviates from user category average',
      severity: 'medium',
      category: 'statistical',
      check: (txn, profile) => {
        const cat = (txn.category || 'unknown').toLowerCase();
        const amount = Math.abs(txn.amount || 0);
        const catAvg = profile.categoryAverages?.[cat];
        const catStd = profile.categoryStdDevs?.[cat];

        if (!catAvg || !catStd || catStd === 0) return { triggered: false, score: 0 };

        const zScore = (amount - catAvg) / catStd;
        return {
          triggered: zScore > 3,
          score: Math.min(100, Math.max(0, (zScore - 2) * 30)),
          details: `Z-score: ${zScore.toFixed(1)} in category "${cat}" (avg: ₹${catAvg.toFixed(0)})`
        };
      }
    });

    // Duplicate detection
    this.addRule({
      id: 'rule_duplicate_transaction',
      name: 'Duplicate Transaction',
      description: 'Same amount, merchant, and time within short window',
      severity: 'medium',
      category: 'pattern',
      check: (txn, profile, context) => {
        const recentTxns = context.recentTransactions || [];
        const amount = Math.abs(txn.amount || 0);
        const merchant = (txn.merchant || txn.description || '').toLowerCase();
        const date = new Date(txn.date || Date.now());

        const duplicates = recentTxns.filter(t => {
          const tDate = new Date(t.date || 0);
          const timeDiff = Math.abs(date - tDate) / (1000 * 60); // minutes
          return Math.abs(Math.abs(t.amount || 0) - amount) < 1 &&
            (t.merchant || t.description || '').toLowerCase() === merchant &&
            timeDiff < 10;
        });

        return {
          triggered: duplicates.length > 0,
          score: duplicates.length > 0 ? 70 : 0,
          details: duplicates.length > 0
            ? `${duplicates.length} duplicate(s) found within 10 minutes`
            : 'No duplicates'
        };
      }
    });

    // Round number suspicion
    this.addRule({
      id: 'rule_round_number_large',
      name: 'Large Round Number Transaction',
      description: 'Suspiciously round amounts for large transactions',
      severity: 'low',
      category: 'pattern',
      check: (txn) => {
        const amount = Math.abs(txn.amount || 0);
        const isRound = amount >= 10000 && amount % 1000 === 0;
        return {
          triggered: isRound && amount >= 50000,
          score: isRound && amount >= 50000 ? 25 : 0,
          details: isRound ? `Round number: ₹${amount.toLocaleString()}` : 'Normal amount'
        };
      }
    });

    // Weekend high-value
    this.addRule({
      id: 'rule_weekend_high_value',
      name: 'Weekend High-Value Transaction',
      description: 'High-value transaction on weekend (potential unauthorized access)',
      severity: 'medium',
      category: 'time',
      check: (txn, profile) => {
        const d = new Date(txn.date || Date.now());
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const amount = Math.abs(txn.amount || 0);
        const threshold = (profile.avgExpense || 5000) * 3;
        return {
          triggered: isWeekend && amount > threshold,
          score: isWeekend && amount > threshold ? 35 : 0,
          details: isWeekend && amount > threshold
            ? `Weekend transaction of ₹${amount.toLocaleString()}`
            : 'Normal'
        };
      }
    });

    // International/cross-border indicator
    this.addRule({
      id: 'rule_foreign_transaction',
      name: 'Foreign Transaction Indicator',
      description: 'Transaction description suggests foreign origin',
      severity: 'medium',
      category: 'geography',
      check: (txn) => {
        const desc = (txn.description || '').toLowerCase();
        const foreignIndicators = ['usd', 'eur', 'gbp', 'forex', 'international',
          'foreign', 'abroad', 'overseas', 'paypal.com', 'stripe.com'];
        const isForeign = foreignIndicators.some(f => desc.includes(f));
        return {
          triggered: isForeign,
          score: isForeign ? 30 : 0,
          details: isForeign ? 'Foreign transaction indicator detected' : 'Domestic transaction'
        };
      }
    });
  }

  addRule(rule) {
    this.rules.push(rule);
    this.ruleStats[rule.id] = { triggered: 0, total: 0, falsePositives: 0 };
  }

  removeRule(ruleId) {
    this.rules = this.rules.filter(r => r.id !== ruleId);
    delete this.ruleStats[ruleId];
  }

  evaluate(transaction, profile, context = {}) {
    const results = [];
    let totalScore = 0;
    let maxSeverity = 'low';

    for (const rule of this.rules) {
      try {
        this.ruleStats[rule.id].total++;
        const result = rule.check(transaction, profile, context);

        if (result.triggered) {
          this.ruleStats[rule.id].triggered++;
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            category: rule.category,
            score: result.score,
            details: result.details
          });
          totalScore += result.score;

          const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
          if ((severityOrder[rule.severity] || 0) > (severityOrder[maxSeverity] || 0)) {
            maxSeverity = rule.severity;
          }
        }
      } catch (e) {
        logger.debug(`Rule ${rule.id} evaluation error: ${e.message}`);
      }
    }

    const normalizedScore = Math.min(100, totalScore / Math.max(results.length, 1));

    return {
      fraudScore: normalizedScore,
      maxSeverity: results.length > 0 ? maxSeverity : 'none',
      triggeredRules: results,
      ruleCount: results.length,
      totalRules: this.rules.length,
      isFraudulent: normalizedScore > 70,
      isSuspicious: normalizedScore > 40,
      recommendation: normalizedScore > 70
        ? 'BLOCK — High fraud probability. Verify identity before processing.'
        : normalizedScore > 50
          ? 'FLAG — Review transaction manually before clearing.'
          : normalizedScore > 30
            ? 'MONITOR — Keep under observation for follow-up patterns.'
            : 'ALLOW — Transaction appears legitimate.'
    };
  }

  getRuleStats() {
    return Object.entries(this.ruleStats).map(([id, stats]) => ({
      ruleId: id,
      ruleName: this.rules.find(r => r.id === id)?.name || id,
      ...stats,
      triggerRate: stats.total > 0 ? ((stats.triggered / stats.total) * 100).toFixed(1) + '%' : '0%',
      falsePositiveRate: stats.triggered > 0
        ? ((stats.falsePositives / stats.triggered) * 100).toFixed(1) + '%'
        : 'N/A'
    }));
  }

  markFalsePositive(ruleId) {
    if (this.ruleStats[ruleId]) {
      this.ruleStats[ruleId].falsePositives++;
    }
  }
}

// ============================================================================
// §2  USER PROFILE BUILDER — Behavioral Baseline for Fraud Detection
// ============================================================================

class FraudUserProfileBuilder {
  buildProfile(transactions) {
    if (!transactions || transactions.length === 0) {
      return this._defaultProfile();
    }

    const expenses = transactions.filter(t => t.type === 'expense');
    const amounts = expenses.map(t => Math.abs(t.amount || 0));

    // Basic stats
    const profile = {
      avgExpense: mean(amounts),
      stdExpense: stdDev(amounts),
      medianExpense: this._median(amounts),
      maxExpense: amounts.length > 0 ? Math.max(...amounts) : 0,
      totalTransactions: transactions.length,
      avgDailySpend: 0,
      avgHourlyTxns: 0,
      knownMerchants: new Set(),
      categoryAverages: {},
      categoryStdDevs: {},
      hourlyDistribution: new Array(24).fill(0),
      dayOfWeekDistribution: new Array(7).fill(0),
      typicalAmountRange: { min: 0, max: 0 },
      transactionFrequency: 0,
      commonPaymentMethods: {},
      deviceFingerprints: new Set(),
      riskScore: 0
    };

    // Daily spending
    const dailyTotals = {};
    for (const t of expenses) {
      const day = new Date(t.date || Date.now()).toISOString().split('T')[0];
      dailyTotals[day] = (dailyTotals[day] || 0) + Math.abs(t.amount || 0);
    }
    const dailyValues = Object.values(dailyTotals);
    profile.avgDailySpend = dailyValues.length > 0 ? mean(dailyValues) : 0;

    // Hourly distribution
    const hourCounts = new Array(24).fill(0);
    for (const t of transactions) {
      const h = new Date(t.date || Date.now()).getHours();
      hourCounts[h]++;
    }
    const totalDays = Math.max(1, Object.keys(dailyTotals).length);
    profile.hourlyDistribution = hourCounts.map(c => c / totalDays);
    profile.avgHourlyTxns = transactions.length / (totalDays * 24);

    // Day of week distribution
    for (const t of transactions) {
      const d = new Date(t.date || Date.now()).getDay();
      profile.dayOfWeekDistribution[d]++;
    }

    // Known merchants
    for (const t of transactions) {
      const merchant = (t.merchant || t.description || '').toLowerCase().trim();
      if (merchant) profile.knownMerchants.add(merchant);
    }

    // Category averages
    const categoryAmounts = {};
    for (const t of expenses) {
      const cat = (t.category || 'unknown').toLowerCase();
      if (!categoryAmounts[cat]) categoryAmounts[cat] = [];
      categoryAmounts[cat].push(Math.abs(t.amount || 0));
    }
    for (const [cat, catAmounts] of Object.entries(categoryAmounts)) {
      profile.categoryAverages[cat] = mean(catAmounts);
      profile.categoryStdDevs[cat] = stdDev(catAmounts);
    }

    // Typical amount range (5th to 95th percentile)
    const sorted = [...amounts].sort((a, b) => a - b);
    profile.typicalAmountRange = {
      min: sorted[Math.floor(sorted.length * 0.05)] || 0,
      max: sorted[Math.floor(sorted.length * 0.95)] || amounts[amounts.length - 1] || 0
    };

    // Transaction frequency
    if (transactions.length >= 2) {
      const dates = transactions.map(t => new Date(t.date || Date.now())).sort((a, b) => a - b);
      const totalDaySpan = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
      profile.transactionFrequency = totalDaySpan > 0 ? transactions.length / totalDaySpan : 0;
    }

    // Payment method distribution
    for (const t of transactions) {
      const desc = (t.description || '').toLowerCase();
      let method = 'unknown';
      if (desc.includes('upi')) method = 'upi';
      else if (desc.includes('card') || desc.includes('pos')) method = 'card';
      else if (desc.includes('neft') || desc.includes('imps')) method = 'bank_transfer';
      else if (desc.includes('cash') || desc.includes('atm')) method = 'cash';
      profile.commonPaymentMethods[method] = (profile.commonPaymentMethods[method] || 0) + 1;
    }

    return profile;
  }

  _defaultProfile() {
    return {
      avgExpense: 2000,
      stdExpense: 1500,
      medianExpense: 1000,
      maxExpense: 10000,
      totalTransactions: 0,
      avgDailySpend: 3000,
      avgHourlyTxns: 0.5,
      knownMerchants: new Set(),
      categoryAverages: {},
      categoryStdDevs: {},
      hourlyDistribution: new Array(24).fill(0.5),
      dayOfWeekDistribution: new Array(7).fill(5),
      typicalAmountRange: { min: 50, max: 10000 },
      transactionFrequency: 3,
      commonPaymentMethods: {},
      deviceFingerprints: new Set(),
      riskScore: 50
    };
  }

  _median(arr) {
    if (arr.length === 0) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }
}

// ============================================================================
// §3  VELOCITY ANALYZER — Transaction Frequency & Acceleration
// ============================================================================

class VelocityAnalyzer {
  constructor() {
    this.windowSizes = {
      '1min': 60 * 1000,
      '5min': 5 * 60 * 1000,
      '15min': 15 * 60 * 1000,
      '1hour': 60 * 60 * 1000,
      '1day': 24 * 60 * 60 * 1000
    };
    this.thresholds = {
      '1min': 3,
      '5min': 5,
      '15min': 8,
      '1hour': 15,
      '1day': 50
    };
  }

  analyze(currentTxn, recentTransactions) {
    const txnTime = new Date(currentTxn.date || Date.now()).getTime();
    const results = {};
    let maxSeverity = 'none';

    for (const [window, duration] of Object.entries(this.windowSizes)) {
      const windowStart = txnTime - duration;
      const inWindow = recentTransactions.filter(t =>
        new Date(t.date || 0).getTime() >= windowStart &&
        new Date(t.date || 0).getTime() <= txnTime
      );

      const count = inWindow.length;
      const total = sum(inWindow.map(t => Math.abs(t.amount || 0)));
      const threshold = this.thresholds[window];
      const exceeded = count >= threshold;

      results[window] = {
        count,
        total: Math.round(total),
        threshold,
        exceeded,
        ratio: threshold > 0 ? (count / threshold).toFixed(2) : '0'
      };

      if (exceeded) {
        const severity = count > threshold * 2 ? 'critical' : 'high';
        const severityOrder = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };
        if ((severityOrder[severity] || 0) > (severityOrder[maxSeverity] || 0)) {
          maxSeverity = severity;
        }
      }
    }

    // Check for acceleration pattern
    const acceleration = this._checkAcceleration(currentTxn, recentTransactions);

    // Check for amount escalation
    const escalation = this._checkAmountEscalation(currentTxn, recentTransactions);

    return {
      windows: results,
      maxSeverity,
      isVelocityBreach: maxSeverity !== 'none',
      acceleration,
      escalation,
      overallRisk: this._calculateVelocityRisk(results, acceleration, escalation)
    };
  }

  _checkAcceleration(currentTxn, recent) {
    if (recent.length < 5) return { accelerating: false, rate: 0 };

    const times = recent.map(t => new Date(t.date || 0).getTime()).sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < times.length; i++) {
      gaps.push(times[i] - times[i - 1]);
    }

    if (gaps.length < 3) return { accelerating: false, rate: 0 };

    const recentGaps = gaps.slice(-3);
    const olderGaps = gaps.slice(0, -3);
    const recentAvg = mean(recentGaps);
    const olderAvg = mean(olderGaps);

    const acceleration = olderAvg > 0 ? (olderAvg - recentAvg) / olderAvg : 0;

    return {
      accelerating: acceleration > 0.3,
      rate: acceleration,
      recentAvgGap: Math.round(recentAvg / 1000) + 's',
      previousAvgGap: Math.round(olderAvg / 1000) + 's',
      detail: acceleration > 0.5
        ? 'Transactions are rapidly accelerating — possible automated attack'
        : acceleration > 0.3
          ? 'Transaction frequency is increasing'
          : 'Normal transaction pacing'
    };
  }

  _checkAmountEscalation(currentTxn, recent) {
    if (recent.length < 3) return { escalating: false };

    const amounts = recent
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
      .map(t => Math.abs(t.amount || 0));

    // Check if amounts are monotonically increasing
    let increasing = 0;
    for (let i = 1; i < amounts.length; i++) {
      if (amounts[i] > amounts[i - 1]) increasing++;
    }

    const escalationRate = amounts.length > 1 ? increasing / (amounts.length - 1) : 0;
    const currentAmount = Math.abs(currentTxn.amount || 0);
    const lastAmount = amounts[amounts.length - 1] || 0;

    return {
      escalating: escalationRate > 0.7 && currentAmount > lastAmount,
      rate: escalationRate,
      pattern: amounts.slice(-5).map(a => Math.round(a)),
      detail: escalationRate > 0.7
        ? 'Amount escalation detected — possible probing attack'
        : 'No escalation pattern'
    };
  }

  _calculateVelocityRisk(windows, acceleration, escalation) {
    let risk = 0;

    for (const [, w] of Object.entries(windows)) {
      if (w.exceeded) risk += 30;
      else if (parseFloat(w.ratio) > 0.7) risk += 10;
    }

    if (acceleration.accelerating) risk += 25;
    if (escalation.escalating) risk += 25;

    return Math.min(100, risk);
  }
}

// ============================================================================
// §4  BEHAVIORAL BIOMETRICS — Transaction Pattern Analysis
// ============================================================================

class BehavioralBiometrics {
  constructor() {
    this.userBaselines = {};
  }

  buildBaseline(userId, transactions) {
    if (!transactions || transactions.length < 20) return null;

    const expenses = transactions.filter(t => t.type === 'expense');

    const baseline = {
      // Temporal patterns
      typicalHours: this._getTypicalHours(expenses),
      typicalDays: this._getTypicalDays(expenses),
      sessionPatterns: this._getSessionPatterns(expenses),

      // Amount patterns
      amountDistribution: this._getAmountDistribution(expenses),
      categoryPreferences: this._getCategoryPreferences(expenses),

      // Merchant patterns
      merchantLoyalty: this._getMerchantLoyalty(expenses),
      newMerchantRate: this._getNewMerchantRate(expenses),

      // Payment method patterns
      paymentMethodPreferences: this._getPaymentMethodPreferences(expenses),

      // Behavioral patterns
      spendingRhythm: this._getSpendingRhythm(expenses),
      impulseScore: this._getImpulseScore(expenses),

      buildDate: new Date(),
      transactionCount: expenses.length
    };

    this.userBaselines[userId] = baseline;
    return baseline;
  }

  compareToBaseline(userId, transaction) {
    const baseline = this.userBaselines[userId];
    if (!baseline) return { deviationScore: 0, details: 'No baseline available' };

    const deviations = [];

    // Check temporal deviation
    const hour = new Date(transaction.date || Date.now()).getHours();
    if (baseline.typicalHours.length > 0 && !baseline.typicalHours.includes(hour)) {
      deviations.push({ factor: 'unusual_time', score: 25, detail: `Hour ${hour} is unusual` });
    }

    // Check day deviation
    const day = new Date(transaction.date || Date.now()).getDay();
    if (baseline.typicalDays.length > 0 && !baseline.typicalDays.includes(day)) {
      deviations.push({ factor: 'unusual_day', score: 15, detail: `Day ${day} is unusual` });
    }

    // Check amount deviation
    const amount = Math.abs(transaction.amount || 0);
    const amountDist = baseline.amountDistribution;
    if (amountDist.mean > 0 && amountDist.std > 0) {
      const zScore = (amount - amountDist.mean) / amountDist.std;
      if (zScore > 3) {
        deviations.push({
          factor: 'extreme_amount',
          score: Math.min(50, (zScore - 2) * 20),
          detail: `Amount z-score: ${zScore.toFixed(1)}`
        });
      }
    }

    // Check category deviation
    const cat = (transaction.category || 'unknown').toLowerCase();
    if (baseline.categoryPreferences[cat] === undefined) {
      deviations.push({ factor: 'new_category', score: 20, detail: `Never spent in "${cat}" before` });
    }

    // Check merchant deviation
    const merchant = (transaction.merchant || transaction.description || '').toLowerCase();
    if (!baseline.merchantLoyalty.topMerchants?.includes(merchant) && amount > amountDist.mean * 2) {
      deviations.push({ factor: 'new_merchant_high_value', score: 30, detail: `New merchant with high amount` });
    }

    const totalDeviation = sum(deviations.map(d => d.score));

    return {
      deviationScore: Math.min(100, totalDeviation),
      isAnomalous: totalDeviation > 50,
      deviations,
      baselineAge: Math.round((Date.now() - new Date(baseline.buildDate).getTime()) / (1000 * 60 * 60 * 24)) + ' days',
      baselineTransactions: baseline.transactionCount
    };
  }

  _getTypicalHours(transactions) {
    const hourCounts = new Array(24).fill(0);
    for (const t of transactions) {
      hourCounts[new Date(t.date || Date.now()).getHours()]++;
    }
    const total = sum(hourCounts);
    return hourCounts
      .map((count, hour) => ({ hour, ratio: total > 0 ? count / total : 0 }))
      .filter(h => h.ratio > 0.03)
      .map(h => h.hour);
  }

  _getTypicalDays(transactions) {
    const dayCounts = new Array(7).fill(0);
    for (const t of transactions) {
      dayCounts[new Date(t.date || Date.now()).getDay()]++;
    }
    const total = sum(dayCounts);
    return dayCounts
      .map((count, day) => ({ day, ratio: total > 0 ? count / total : 0 }))
      .filter(d => d.ratio > 0.05)
      .map(d => d.day);
  }

  _getSessionPatterns(transactions) {
    const sorted = [...transactions].sort((a, b) =>
      new Date(a.date || 0) - new Date(b.date || 0)
    );
    const sessions = [];
    let currentSession = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const gap = new Date(sorted[i].date || 0) - new Date(sorted[i - 1].date || 0);
      if (gap < 30 * 60 * 1000) {
        currentSession.push(sorted[i]);
      } else {
        if (currentSession.length > 1) sessions.push(currentSession.length);
        currentSession = [sorted[i]];
      }
    }
    if (currentSession.length > 1) sessions.push(currentSession.length);

    return {
      avgSessionLength: sessions.length > 0 ? mean(sessions) : 1,
      maxSessionLength: sessions.length > 0 ? Math.max(...sessions) : 1,
      sessionCount: sessions.length
    };
  }

  _getAmountDistribution(transactions) {
    const amounts = transactions.map(t => Math.abs(t.amount || 0));
    return {
      mean: mean(amounts),
      std: stdDev(amounts),
      median: this._median(amounts),
      p25: amounts.sort((a, b) => a - b)[Math.floor(amounts.length * 0.25)] || 0,
      p75: amounts.sort((a, b) => a - b)[Math.floor(amounts.length * 0.75)] || 0,
      p95: amounts.sort((a, b) => a - b)[Math.floor(amounts.length * 0.95)] || 0
    };
  }

  _getCategoryPreferences(transactions) {
    const cats = {};
    for (const t of transactions) {
      const cat = (t.category || 'unknown').toLowerCase();
      cats[cat] = (cats[cat] || 0) + 1;
    }
    const total = transactions.length;
    for (const cat of Object.keys(cats)) {
      cats[cat] = cats[cat] / total;
    }
    return cats;
  }

  _getMerchantLoyalty(transactions) {
    const merchants = {};
    for (const t of transactions) {
      const m = (t.merchant || t.description || '').toLowerCase();
      merchants[m] = (merchants[m] || 0) + 1;
    }
    const sorted = Object.entries(merchants).sort((a, b) => b[1] - a[1]);
    return {
      topMerchants: sorted.slice(0, 20).map(([m]) => m),
      uniqueMerchants: Object.keys(merchants).length,
      concentration: sorted.length > 0
        ? sorted[0][1] / transactions.length
        : 0
    };
  }

  _getNewMerchantRate(transactions) {
    const sorted = [...transactions].sort((a, b) =>
      new Date(a.date || 0) - new Date(b.date || 0)
    );
    const seen = new Set();
    let newCount = 0;
    const recentCount = Math.min(20, sorted.length);

    for (let i = 0; i < sorted.length; i++) {
      const m = (sorted[i].merchant || sorted[i].description || '').toLowerCase();
      if (!seen.has(m)) {
        if (i >= sorted.length - recentCount) newCount++;
        seen.add(m);
      }
    }

    return recentCount > 0 ? newCount / recentCount : 0;
  }

  _getPaymentMethodPreferences(transactions) {
    const methods = {};
    for (const t of transactions) {
      const desc = (t.description || '').toLowerCase();
      let method = 'other';
      if (desc.includes('upi')) method = 'upi';
      else if (desc.includes('card')) method = 'card';
      else if (desc.includes('neft') || desc.includes('imps')) method = 'transfer';
      else if (desc.includes('cash')) method = 'cash';
      methods[method] = (methods[method] || 0) + 1;
    }
    return methods;
  }

  _getSpendingRhythm(transactions) {
    const daily = {};
    for (const t of transactions) {
      const d = new Date(t.date || Date.now()).toISOString().split('T')[0];
      daily[d] = (daily[d] || 0) + Math.abs(t.amount || 0);
    }
    const values = Object.values(daily);
    return {
      avgDaily: mean(values),
      stdDaily: stdDev(values),
      consistency: values.length > 1
        ? 1 - (stdDev(values) / (mean(values) || 1))
        : 0
    };
  }

  _getImpulseScore(transactions) {
    let impulseCount = 0;
    for (const t of transactions) {
      const hour = new Date(t.date || Date.now()).getHours();
      const isLateNight = hour >= 22 || hour < 4;
      const cat = (t.category || '').toLowerCase();
      const isNonEssential = ['entertainment', 'shopping', 'dining'].some(c => cat.includes(c));
      if (isLateNight && isNonEssential) impulseCount++;
    }
    return transactions.length > 0 ? impulseCount / transactions.length : 0;
  }

  _median(arr) {
    if (arr.length === 0) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }
}

// ============================================================================
// §5  RISK SCORING ENGINE — Aggregate Multi-Factor Risk Score
// ============================================================================

class RiskScoringEngine {
  constructor() {
    this.weights = {
      ruleEngine: 0.35,
      velocity: 0.20,
      behavioral: 0.25,
      historical: 0.20
    };
    this.riskHistory = {};
  }

  calculateRiskScore(ruleResult, velocityResult, behavioralResult, historicalRisk = 0) {
    const components = {
      ruleScore: ruleResult?.fraudScore || 0,
      velocityScore: velocityResult?.overallRisk || 0,
      behavioralScore: behavioralResult?.deviationScore || 0,
      historicalScore: historicalRisk
    };

    const weightedScore =
      components.ruleScore * this.weights.ruleEngine +
      components.velocityScore * this.weights.velocity +
      components.behavioralScore * this.weights.behavioral +
      components.historicalScore * this.weights.historical;

    // Apply boosting for critical indicators
    let boostedScore = weightedScore;
    if (ruleResult?.maxSeverity === 'critical') boostedScore = Math.max(boostedScore, 80);
    if (velocityResult?.acceleration?.accelerating && velocityResult?.escalation?.escalating) {
      boostedScore = Math.max(boostedScore, 75);
    }

    const finalScore = Math.min(100, boostedScore);

    // Determine risk level
    let riskLevel, action;
    if (finalScore >= 80) {
      riskLevel = 'critical';
      action = 'BLOCK';
    } else if (finalScore >= 60) {
      riskLevel = 'high';
      action = 'REVIEW';
    } else if (finalScore >= 40) {
      riskLevel = 'medium';
      action = 'MONITOR';
    } else if (finalScore >= 20) {
      riskLevel = 'low';
      action = 'ALLOW';
    } else {
      riskLevel = 'minimal';
      action = 'ALLOW';
    }

    return {
      overallScore: Math.round(finalScore),
      riskLevel,
      action,
      components,
      weights: this.weights,
      boosted: boostedScore > weightedScore,
      breakdown: {
        rules: `${Math.round(components.ruleScore)} × ${this.weights.ruleEngine} = ${(components.ruleScore * this.weights.ruleEngine).toFixed(1)}`,
        velocity: `${Math.round(components.velocityScore)} × ${this.weights.velocity} = ${(components.velocityScore * this.weights.velocity).toFixed(1)}`,
        behavioral: `${Math.round(components.behavioralScore)} × ${this.weights.behavioral} = ${(components.behavioralScore * this.weights.behavioral).toFixed(1)}`,
        historical: `${Math.round(components.historicalScore)} × ${this.weights.historical} = ${(components.historicalScore * this.weights.historical).toFixed(1)}`
      }
    };
  }

  updateHistoricalRisk(userId, score) {
    if (!this.riskHistory[userId]) this.riskHistory[userId] = [];
    this.riskHistory[userId].push({ score, timestamp: new Date() });
    if (this.riskHistory[userId].length > 100) this.riskHistory[userId].shift();
  }

  getHistoricalRisk(userId) {
    const history = this.riskHistory[userId] || [];
    if (history.length === 0) return 0;
    // Weighted average favoring recent scores
    const recentScores = history.slice(-10);
    const weights = recentScores.map((_, i) => i + 1);
    const totalWeight = sum(weights);
    return sum(recentScores.map((h, i) => h.score * weights[i])) / totalWeight;
  }
}

// ============================================================================
// §6  ALERT MANAGER — Generate and Manage Fraud Alerts
// ============================================================================

class FraudAlertManager {
  constructor() {
    this.alerts = [];
    this.maxAlerts = 5000;
    this.alertCallbacks = [];
  }

  createAlert(transaction, riskAssessment, details = {}) {
    const alert = {
      id: `fraud_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date(),
      transactionId: transaction._id || transaction.id,
      transactionAmount: Math.abs(transaction.amount || 0),
      transactionDate: transaction.date,
      merchant: transaction.merchant || transaction.description,
      category: transaction.category,
      riskScore: riskAssessment.overallScore,
      riskLevel: riskAssessment.riskLevel,
      action: riskAssessment.action,
      triggeredRules: details.triggeredRules || [],
      velocityFlags: details.velocityFlags || [],
      behavioralDeviations: details.behavioralDeviations || [],
      status: 'open', // open, investigating, resolved, false_positive
      resolution: null,
      resolvedAt: null,
      resolvedBy: null,
      notes: []
    };

    this.alerts.push(alert);
    if (this.alerts.length > this.maxAlerts) this.alerts.shift();

    // Fire callbacks
    for (const cb of this.alertCallbacks) {
      try { cb(alert); } catch (e) { logger.debug('Alert callback error:', e.message); }
    }

    return alert;
  }

  onAlert(callback) {
    this.alertCallbacks.push(callback);
  }

  resolveAlert(alertId, resolution, resolvedBy = 'system') {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return null;

    alert.status = resolution === 'false_positive' ? 'false_positive' : 'resolved';
    alert.resolution = resolution;
    alert.resolvedAt = new Date();
    alert.resolvedBy = resolvedBy;

    return alert;
  }

  addNote(alertId, note, author = 'system') {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return null;

    alert.notes.push({ text: note, author, timestamp: new Date() });
    return alert;
  }

  getAlerts(filters = {}) {
    let filtered = [...this.alerts];

    if (filters.status) filtered = filtered.filter(a => a.status === filters.status);
    if (filters.riskLevel) filtered = filtered.filter(a => a.riskLevel === filters.riskLevel);
    if (filters.minScore) filtered = filtered.filter(a => a.riskScore >= filters.minScore);
    if (filters.since) {
      const since = new Date(filters.since);
      filtered = filtered.filter(a => new Date(a.timestamp) >= since);
    }

    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  getAlertStats() {
    const total = this.alerts.length;
    const open = this.alerts.filter(a => a.status === 'open').length;
    const resolved = this.alerts.filter(a => a.status === 'resolved').length;
    const falsePositives = this.alerts.filter(a => a.status === 'false_positive').length;

    const riskDistribution = {};
    for (const alert of this.alerts) {
      riskDistribution[alert.riskLevel] = (riskDistribution[alert.riskLevel] || 0) + 1;
    }

    const avgResolutionTime = (() => {
      const resolvedAlerts = this.alerts.filter(a => a.resolvedAt);
      if (resolvedAlerts.length === 0) return 0;
      return mean(resolvedAlerts.map(a =>
        (new Date(a.resolvedAt) - new Date(a.timestamp)) / (1000 * 60 * 60)
      ));
    })();

    return {
      total,
      open,
      resolved,
      falsePositives,
      falsePositiveRate: total > 0 ? ((falsePositives / total) * 100).toFixed(1) + '%' : '0%',
      riskDistribution,
      avgResolutionTimeHours: avgResolutionTime.toFixed(1),
      last24h: this.alerts.filter(a =>
        Date.now() - new Date(a.timestamp).getTime() < 24 * 60 * 60 * 1000
      ).length
    };
  }
}

// ============================================================================
// §7  UNIFIED FRAUD DETECTION SERVICE
// ============================================================================

class FraudDetectionService {
  constructor() {
    this.ruleEngine = new FraudRuleEngine();
    this.profileBuilder = new FraudUserProfileBuilder();
    this.velocityAnalyzer = new VelocityAnalyzer();
    this.biometrics = new BehavioralBiometrics();
    this.riskScorer = new RiskScoringEngine();
    this.alertManager = new FraudAlertManager();
    this.userProfiles = {};
    this.dataDir = path.join(__dirname, '../../data/fraud-detection');
  }

  async _ensureDir() {
    await fs.promises.mkdir(this.dataDir, { recursive: true }).catch(() => {});
  }

  async initializeUser(userId, transactions) {
    // Build user profile
    this.userProfiles[userId] = this.profileBuilder.buildProfile(transactions);

    // Build behavioral baseline
    this.biometrics.buildBaseline(userId, transactions);

    logger.info(`Fraud detection initialized for user ${userId} (${transactions.length} transactions)`);
    return this.userProfiles[userId];
  }

  async screenTransaction(userId, transaction, recentTransactions = []) {
    const startTime = Date.now();

    // Ensure profile exists
    let profile = this.userProfiles[userId];
    if (!profile) {
      profile = this.profileBuilder.buildProfile(recentTransactions);
      this.userProfiles[userId] = profile;
    }

    // Build context
    const now = new Date(transaction.date || Date.now());
    const dailyTotal = sum(
      recentTransactions
        .filter(t => {
          const d = new Date(t.date || 0);
          return d.toISOString().split('T')[0] === now.toISOString().split('T')[0];
        })
        .map(t => Math.abs(t.amount || 0))
    ) + Math.abs(transaction.amount || 0);

    const transactionsLastHour = recentTransactions.filter(t => {
      const diff = now - new Date(t.date || 0);
      return diff >= 0 && diff < 3600000;
    }).length;

    const context = {
      dailyTotal,
      transactionsLastHour,
      recentTransactions: recentTransactions.slice(-20)
    };

    // Run fraud rule engine
    const ruleResult = this.ruleEngine.evaluate(transaction, profile, context);

    // Run velocity analysis
    const velocityResult = this.velocityAnalyzer.analyze(transaction, recentTransactions);

    // Run behavioral biometrics check
    const behavioralResult = this.biometrics.compareToBaseline(userId, transaction);

    // Get historical risk
    const historicalRisk = this.riskScorer.getHistoricalRisk(userId);

    // Calculate composite risk score
    const riskAssessment = this.riskScorer.calculateRiskScore(
      ruleResult, velocityResult, behavioralResult, historicalRisk
    );

    // Update historical risk
    this.riskScorer.updateHistoricalRisk(userId, riskAssessment.overallScore);

    // Generate alert if needed
    let alert = null;
    if (riskAssessment.overallScore >= 40) {
      alert = this.alertManager.createAlert(transaction, riskAssessment, {
        triggeredRules: ruleResult.triggeredRules,
        velocityFlags: velocityResult.isVelocityBreach ? [velocityResult] : [],
        behavioralDeviations: behavioralResult.deviations || []
      });
    }

    const latency = Date.now() - startTime;

    return {
      transactionId: transaction._id || transaction.id,
      amount: Math.abs(transaction.amount || 0),
      riskAssessment,
      ruleResult: {
        fraudScore: ruleResult.fraudScore,
        triggeredRules: ruleResult.triggeredRules.length,
        maxSeverity: ruleResult.maxSeverity,
        rules: ruleResult.triggeredRules
      },
      velocityResult: {
        isVelocityBreach: velocityResult.isVelocityBreach,
        acceleration: velocityResult.acceleration?.accelerating,
        escalation: velocityResult.escalation?.escalating,
        overallRisk: velocityResult.overallRisk
      },
      behavioralResult: {
        deviationScore: behavioralResult.deviationScore,
        isAnomalous: behavioralResult.isAnomalous,
        deviations: behavioralResult.deviations?.length || 0
      },
      alert: alert ? { id: alert.id, riskLevel: alert.riskLevel, action: alert.action } : null,
      decision: riskAssessment.action,
      latency: latency + 'ms',
      timestamp: new Date()
    };
  }

  async screenBatch(userId, transactions, allTransactions = []) {
    const results = [];
    for (const txn of transactions) {
      const result = await this.screenTransaction(userId, txn, allTransactions);
      results.push(result);
    }

    const flagged = results.filter(r => r.riskAssessment.overallScore >= 40);
    const blocked = results.filter(r => r.decision === 'BLOCK');

    return {
      total: results.length,
      flagged: flagged.length,
      blocked: blocked.length,
      allowed: results.length - flagged.length,
      avgRiskScore: Math.round(mean(results.map(r => r.riskAssessment.overallScore))),
      maxRiskScore: Math.max(...results.map(r => r.riskAssessment.overallScore)),
      results: results.sort((a, b) => b.riskAssessment.overallScore - a.riskAssessment.overallScore),
      summary: {
        criticalCount: results.filter(r => r.riskAssessment.riskLevel === 'critical').length,
        highCount: results.filter(r => r.riskAssessment.riskLevel === 'high').length,
        mediumCount: results.filter(r => r.riskAssessment.riskLevel === 'medium').length,
        lowCount: results.filter(r => r.riskAssessment.riskLevel === 'low').length
      }
    };
  }

  getAlerts(filters = {}) {
    return this.alertManager.getAlerts(filters);
  }

  resolveAlert(alertId, resolution, user) {
    return this.alertManager.resolveAlert(alertId, resolution, user);
  }

  getStats() {
    return {
      alertStats: this.alertManager.getAlertStats(),
      ruleStats: this.ruleEngine.getRuleStats(),
      usersMonitored: Object.keys(this.userProfiles).length,
      totalRules: this.ruleEngine.rules.length
    };
  }

  async save(userId) {
    await this._ensureDir();
    const filePath = path.join(this.dataDir, `${userId}_fraud_profile.json`);
    try {
      const profile = this.userProfiles[userId];
      if (profile) {
        const serialized = {
          ...profile,
          knownMerchants: [...(profile.knownMerchants || [])],
          deviceFingerprints: [...(profile.deviceFingerprints || [])]
        };
        await fs.promises.writeFile(filePath, JSON.stringify(serialized));
      }
    } catch (e) {
      logger.debug(`Fraud profile save error: ${e.message}`);
    }
  }

  async load(userId) {
    const filePath = path.join(this.dataDir, `${userId}_fraud_profile.json`);
    try {
      const raw = await fs.promises.readFile(filePath, 'utf8');
      const data = JSON.parse(raw);
      data.knownMerchants = new Set(data.knownMerchants || []);
      data.deviceFingerprints = new Set(data.deviceFingerprints || []);
      this.userProfiles[userId] = data;
      return true;
    } catch { return false; }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  FraudRuleEngine,
  FraudUserProfileBuilder,
  VelocityAnalyzer,
  BehavioralBiometrics,
  RiskScoringEngine,
  FraudAlertManager,
  FraudDetectionService
};
