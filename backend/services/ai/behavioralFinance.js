// ============================================================================
// BEHAVIORAL FINANCE ENGINE — Psychology-Based Financial Analysis
// ============================================================================
// Implements behavioral economics models: loss aversion detection, anchoring
// bias analysis, mental accounting, sunk cost identification, herd behavior
// analysis, and nudge-based recommendations.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');

const sum = (a) => a.reduce((s, v) => s + v, 0);
const mean = (a) => a.length ? sum(a) / a.length : 0;
const stdDev = (a) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(sum(a.map(v => (v - m) ** 2)) / (a.length - 1));
};

// ============================================================================
// §1  LOSS AVERSION DETECTOR
// ============================================================================

class LossAversionDetector {
  constructor() {
    this.lossAversionRatio = 2.5; // Kahneman & Tversky: losses feel 2-2.5x stronger
  }

  analyze(transactions, investments = []) {
    const results = {
      transactionBias: this._analyzeTransactionBias(transactions),
      investmentBias: this._analyzeInvestmentBias(investments),
      overallLossAversion: 0,
      recommendations: []
    };

    // Calculate overall loss aversion score
    const scores = [results.transactionBias.score, results.investmentBias.score].filter(s => s > 0);
    results.overallLossAversion = scores.length > 0 ? mean(scores) : 0;

    // Generate recommendations
    if (results.overallLossAversion > 60) {
      results.recommendations.push({
        type: 'awareness',
        message: 'You may be exhibiting strong loss aversion. Remember: avoiding all risk can cost more in the long run through inflation erosion.',
        priority: 'medium'
      });
    }

    if (results.investmentBias.holdingLosers) {
      results.recommendations.push({
        type: 'action',
        message: 'Consider rebalancing underperforming investments. Holding losing positions hoping for recovery (disposition effect) often leads to worse outcomes.',
        priority: 'high'
      });
    }

    if (results.transactionBias.panicSaving) {
      results.recommendations.push({
        type: 'nudge',
        message: 'Your spending drops significantly after losses. Automate savings and investments to remove emotional decision-making.',
        priority: 'medium'
      });
    }

    return results;
  }

  _analyzeTransactionBias(transactions) {
    if (!transactions || transactions.length < 20) {
      return { score: 0, details: 'Insufficient data' };
    }

    const expenses = transactions.filter(t => t.type === 'expense');
    const amounts = expenses.map(t => Math.abs(t.amount || 0));

    // Analyze reaction to large expenses (do they cut spending afterward?)
    const avgAmount = mean(amounts);
    const largeTxnThreshold = avgAmount * 2;

    let panicCuts = 0;
    let largeTxnCount = 0;

    for (let i = 0; i < amounts.length - 5; i++) {
      if (amounts[i] > largeTxnThreshold) {
        largeTxnCount++;
        const next5Avg = mean(amounts.slice(i + 1, i + 6));
        if (next5Avg < avgAmount * 0.7) {
          panicCuts++;
        }
      }
    }

    const panicRatio = largeTxnCount > 0 ? panicCuts / largeTxnCount : 0;

    // Analyze price sensitivity patterns
    const priceVariance = stdDev(amounts) / (mean(amounts) || 1);
    const isHighlyPriceSensitive = priceVariance < 0.3;

    return {
      score: Math.min(100, panicRatio * 80 + (isHighlyPriceSensitive ? 20 : 0)),
      panicSaving: panicRatio > 0.3,
      panicRatio: (panicRatio * 100).toFixed(1) + '%',
      priceSensitive: isHighlyPriceSensitive,
      details: panicRatio > 0.5
        ? 'Strong loss aversion: spending drops significantly after large expenses'
        : panicRatio > 0.3
          ? 'Moderate loss aversion detected in spending patterns'
          : 'Healthy spending resilience'
    };
  }

  _analyzeInvestmentBias(investments) {
    if (!investments || investments.length < 2) {
      return { score: 0, holdingLosers: false, details: 'Insufficient investment data' };
    }

    let losers = 0;
    let winners = 0;
    let totalLoss = 0;
    let totalGain = 0;

    for (const inv of investments) {
      const invested = inv.investedAmount || inv.invested || 0;
      const current = inv.currentValue || inv.value || 0;
      const pnl = current - invested;

      if (pnl < 0) {
        losers++;
        totalLoss += Math.abs(pnl);
      } else {
        winners++;
        totalGain += pnl;
      }
    }

    // Disposition effect: tendency to sell winners and hold losers
    const holdingLosers = losers > winners && totalLoss > totalGain;
    const loserRatio = investments.length > 0 ? losers / investments.length : 0;

    return {
      score: Math.min(100, loserRatio * 80 + (holdingLosers ? 20 : 0)),
      holdingLosers,
      winners,
      losers,
      totalGain: Math.round(totalGain),
      totalLoss: Math.round(totalLoss),
      details: holdingLosers
        ? 'Disposition effect detected: holding losing investments while selling winners'
        : 'Investment behavior appears rational'
    };
  }
}

// ============================================================================
// §2  ANCHORING BIAS ANALYZER
// ============================================================================

class AnchoringBiasAnalyzer {
  analyze(transactions, budgets = []) {
    const results = {
      priceAnchoring: this._analyzePriceAnchoring(transactions),
      budgetAnchoring: this._analyzeBudgetAnchoring(transactions, budgets),
      roundNumberBias: this._analyzeRoundNumberBias(transactions),
      score: 0,
      recommendations: []
    };

    results.score = mean([
      results.priceAnchoring.score,
      results.budgetAnchoring.score,
      results.roundNumberBias.score
    ].filter(s => s > 0));

    if (results.roundNumberBias.isStrong) {
      results.recommendations.push({
        type: 'awareness',
        message: 'You tend to spend in round numbers (₹500, ₹1000). This may indicate less deliberate spending — try setting specific budget amounts.',
        priority: 'low'
      });
    }

    if (results.priceAnchoring.isAnchored) {
      results.recommendations.push({
        type: 'awareness',
        message: 'Your spending in certain categories is anchored to specific price points. Compare prices across merchants periodically.',
        priority: 'medium'
      });
    }

    return results;
  }

  _analyzePriceAnchoring(transactions) {
    if (!transactions || transactions.length < 20) {
      return { score: 0, isAnchored: false };
    }

    // Group by category and check if amounts cluster around specific values
    const categoryAmounts = {};
    for (const t of transactions.filter(t => t.type === 'expense')) {
      const cat = t.category || 'unknown';
      if (!categoryAmounts[cat]) categoryAmounts[cat] = [];
      categoryAmounts[cat].push(Math.abs(t.amount || 0));
    }

    let anchoredCategories = 0;
    let totalCategories = 0;
    const details = [];

    for (const [cat, amounts] of Object.entries(categoryAmounts)) {
      if (amounts.length < 5) continue;
      totalCategories++;

      // Check if more than 40% of amounts are within 10% of the mode
      const rounded = amounts.map(a => Math.round(a / 100) * 100);
      const modeCounts = {};
      for (const r of rounded) modeCounts[r] = (modeCounts[r] || 0) + 1;
      const maxCount = Math.max(...Object.values(modeCounts));
      const anchoredRatio = maxCount / amounts.length;

      if (anchoredRatio > 0.4) {
        anchoredCategories++;
        const anchorAmount = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0][0];
        details.push({
          category: cat,
          anchorAmount: Number(anchorAmount),
          anchoredRatio: (anchoredRatio * 100).toFixed(0) + '%'
        });
      }
    }

    return {
      score: totalCategories > 0 ? (anchoredCategories / totalCategories) * 100 : 0,
      isAnchored: anchoredCategories > totalCategories * 0.3,
      anchoredCategories: details,
      totalCategories
    };
  }

  _analyzeBudgetAnchoring(transactions, budgets) {
    if (!budgets || budgets.length === 0) {
      return { score: 0, details: 'No budgets set' };
    }

    // Check if actual spending clusters right at or just below budget limits
    let nearBudgetCount = 0;
    const analysis = [];

    for (const budget of budgets) {
      const limit = budget.limit || budget.amount || 0;
      const spent = budget.spent || 0;
      if (limit <= 0) continue;

      const ratio = spent / limit;
      if (ratio > 0.9 && ratio < 1.05) {
        nearBudgetCount++;
        analysis.push({
          category: budget.category,
          limit,
          spent,
          ratio: (ratio * 100).toFixed(0) + '%',
          behavior: 'spending_to_budget'
        });
      }
    }

    return {
      score: budgets.length > 0 ? (nearBudgetCount / budgets.length) * 100 : 0,
      nearBudgetCategories: nearBudgetCount,
      details: analysis,
      isAnchored: nearBudgetCount > budgets.length * 0.5,
      explanation: nearBudgetCount > budgets.length * 0.5
        ? 'You may be anchoring to budget limits — spending up to the maximum because it feels "allowed"'
        : 'Budget usage appears natural'
    };
  }

  _analyzeRoundNumberBias(transactions) {
    if (!transactions || transactions.length < 20) {
      return { score: 0, isStrong: false };
    }

    const amounts = transactions.map(t => Math.abs(t.amount || 0));
    const roundNumbers = amounts.filter(a => a % 100 === 0 || a % 500 === 0 || a % 1000 === 0);
    const roundRatio = roundNumbers.length / amounts.length;

    // Expected ratio of round numbers if spending were random is ~2%
    return {
      score: Math.min(100, roundRatio * 200), // 50% round = 100 score
      isStrong: roundRatio > 0.3,
      roundRatio: (roundRatio * 100).toFixed(1) + '%',
      roundTransactions: roundNumbers.length,
      totalTransactions: amounts.length
    };
  }
}

// ============================================================================
// §3  MENTAL ACCOUNTING DETECTOR
// ============================================================================

class MentalAccountingAnalyzer {
  analyze(transactions) {
    if (!transactions || transactions.length < 20) {
      return { score: 0, details: 'Insufficient data' };
    }

    const results = {
      categoryRigidity: this._analyzeCategoryRigidity(transactions),
      windfall: this._analyzeWindfallEffect(transactions),
      paymentMethodBias: this._analyzePaymentMethodBias(transactions),
      score: 0,
      recommendations: []
    };

    results.score = mean([
      results.categoryRigidity.score,
      results.windfall.score,
      results.paymentMethodBias.score
    ].filter(s => s > 0));

    if (results.windfall.detected) {
      results.recommendations.push({
        type: 'nudge',
        message: 'You tend to spend more after income windfalls (bonuses, refunds). Treat all income equally — consider auto-investing bonus income.',
        priority: 'medium'
      });
    }

    if (results.paymentMethodBias.detected) {
      results.recommendations.push({
        type: 'awareness',
        message: 'You may be mentally categorizing money differently based on payment method. Money is fungible — ₹100 on card = ₹100 in cash.',
        priority: 'low'
      });
    }

    return results;
  }

  _analyzeCategoryRigidity(transactions) {
    // Check if spending in each category is very consistent (mental budgeting)
    const monthly = {};
    for (const t of transactions.filter(t => t.type === 'expense')) {
      const month = new Date(t.date || Date.now()).toISOString().substring(0, 7);
      const cat = t.category || 'unknown';
      const key = `${month}_${cat}`;
      monthly[key] = (monthly[key] || 0) + Math.abs(t.amount || 0);
    }

    const categories = {};
    for (const [key, amount] of Object.entries(monthly)) {
      const cat = key.split('_')[1];
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(amount);
    }

    let rigidCategories = 0;
    let totalCats = 0;

    for (const [cat, amounts] of Object.entries(categories)) {
      if (amounts.length < 3) continue;
      totalCats++;
      const cv = stdDev(amounts) / (mean(amounts) || 1);
      if (cv < 0.15) rigidCategories++; // Very consistent spending
    }

    return {
      score: totalCats > 0 ? (rigidCategories / totalCats) * 70 : 0,
      rigidCategories,
      totalCategories: totalCats,
      isRigid: rigidCategories > totalCats * 0.5
    };
  }

  _analyzeWindfallEffect(transactions) {
    const sorted = [...transactions].sort((a, b) =>
      new Date(a.date || 0) - new Date(b.date || 0)
    );

    // Find large income events (windfalls)
    const incomes = sorted.filter(t => t.type === 'income');
    if (incomes.length < 3) return { score: 0, detected: false };

    const avgIncome = mean(incomes.map(t => Math.abs(t.amount || 0)));
    const windfall = incomes.filter(t => Math.abs(t.amount || 0) > avgIncome * 1.5);

    let increasedSpendingAfter = 0;

    for (const wf of windfall) {
      const wfDate = new Date(wf.date || 0);
      const weekBefore = sorted.filter(t => {
        const td = new Date(t.date || 0);
        return t.type === 'expense' && td < wfDate && td > new Date(wfDate - 7 * 86400000);
      }).map(t => Math.abs(t.amount || 0));

      const weekAfter = sorted.filter(t => {
        const td = new Date(t.date || 0);
        return t.type === 'expense' && td > wfDate && td < new Date(wfDate.getTime() + 7 * 86400000);
      }).map(t => Math.abs(t.amount || 0));

      if (weekBefore.length > 0 && weekAfter.length > 0) {
        if (mean(weekAfter) > mean(weekBefore) * 1.3) {
          increasedSpendingAfter++;
        }
      }
    }

    const windfallEffect = windfall.length > 0 ? increasedSpendingAfter / windfall.length : 0;

    return {
      score: Math.min(100, windfallEffect * 100),
      detected: windfallEffect > 0.3,
      windfallCount: windfall.length,
      spendingIncreasedAfter: increasedSpendingAfter,
      ratio: (windfallEffect * 100).toFixed(0) + '%'
    };
  }

  _analyzePaymentMethodBias(transactions) {
    const methods = {};
    for (const t of transactions.filter(t => t.type === 'expense')) {
      const desc = (t.description || '').toLowerCase();
      let method = 'other';
      if (desc.includes('upi') || desc.includes('gpay') || desc.includes('phonepe')) method = 'upi';
      else if (desc.includes('card') || desc.includes('pos')) method = 'card';
      else if (desc.includes('cash') || desc.includes('atm')) method = 'cash';
      else if (desc.includes('neft') || desc.includes('imps') || desc.includes('transfer')) method = 'transfer';

      if (!methods[method]) methods[method] = [];
      methods[method].push(Math.abs(t.amount || 0));
    }

    // Check if average amounts differ significantly by method
    const avgByMethod = {};
    for (const [method, amounts] of Object.entries(methods)) {
      if (amounts.length >= 5) {
        avgByMethod[method] = mean(amounts);
      }
    }

    const values = Object.values(avgByMethod);
    if (values.length < 2) return { score: 0, detected: false };

    const maxAvg = Math.max(...values);
    const minAvg = Math.min(...values);
    const ratio = minAvg > 0 ? maxAvg / minAvg : 1;

    return {
      score: Math.min(100, (ratio - 1) * 30),
      detected: ratio > 2,
      avgByMethod,
      spread: (ratio * 100 - 100).toFixed(0) + '% difference'
    };
  }
}

// ============================================================================
// §4  HERD BEHAVIOR ANALYZER
// ============================================================================

class HerdBehaviorAnalyzer {
  analyze(transactions, marketEvents = []) {
    const results = {
      trendFollowing: this._analyzeTrendFollowing(transactions),
      socialInfluence: this._analyzeSocialSpendingPatterns(transactions),
      festivalEffect: this._analyzeFestivalSpending(transactions),
      score: 0,
      recommendations: []
    };

    results.score = mean([
      results.trendFollowing.score,
      results.socialInfluence.score,
      results.festivalEffect.score
    ].filter(s => s > 0));

    if (results.festivalEffect.isStrong) {
      results.recommendations.push({
        type: 'nudge',
        message: 'Your spending spikes significantly during festivals/sales. Set a pre-festival budget and stick to it — sales create artificial urgency.',
        priority: 'medium'
      });
    }

    return results;
  }

  _analyzeTrendFollowing(transactions) {
    // Simplified: check if shopping spikes during known sale periods
    const shoppingExpenses = transactions.filter(t =>
      t.type === 'expense' && (t.category || '').toLowerCase().includes('shop')
    );

    if (shoppingExpenses.length < 10) return { score: 0, details: 'Insufficient shopping data' };

    const monthlyAvg = {};
    for (const t of shoppingExpenses) {
      const m = new Date(t.date || Date.now()).getMonth();
      if (!monthlyAvg[m]) monthlyAvg[m] = [];
      monthlyAvg[m].push(Math.abs(t.amount || 0));
    }

    // Known sale months: Oct (festive), Jan (New Year), Nov (Black Friday/Diwali)
    const saleMonths = [0, 9, 10]; // Jan, Oct, Nov
    const saleSums = saleMonths.map(m => sum(monthlyAvg[m] || []));
    const normalSums = Object.entries(monthlyAvg)
      .filter(([m]) => !saleMonths.includes(parseInt(m)))
      .map(([, amounts]) => sum(amounts));

    const saleAvg = mean(saleSums.filter(s => s > 0));
    const normalAvg = mean(normalSums.filter(s => s > 0));
    const ratio = normalAvg > 0 ? saleAvg / normalAvg : 1;

    return {
      score: Math.min(100, (ratio - 1) * 50),
      isStrong: ratio > 2,
      saleMonthIncrease: ((ratio - 1) * 100).toFixed(0) + '%',
      details: ratio > 2
        ? 'Strong tendency to follow sale trends — spending doubles during sale months'
        : 'Moderate sale sensitivity'
    };
  }

  _analyzeSocialSpendingPatterns(transactions) {
    // Check for status-signaling purchases
    const expenses = transactions.filter(t => t.type === 'expense');
    const highValueCount = expenses.filter(t =>
      Math.abs(t.amount || 0) > mean(expenses.map(e => Math.abs(e.amount || 0))) * 3
    ).length;

    const socialCategories = ['entertainment', 'dining', 'shopping', 'travel'];
    const socialSpending = expenses.filter(t =>
      socialCategories.some(c => (t.category || '').toLowerCase().includes(c))
    );

    const socialRatio = expenses.length > 0 ? socialSpending.length / expenses.length : 0;

    return {
      score: Math.min(100, socialRatio * 150 + highValueCount * 5),
      socialSpendingRatio: (socialRatio * 100).toFixed(1) + '%',
      highValuePurchases: highValueCount,
      details: socialRatio > 0.4
        ? 'High proportion of social/lifestyle spending may indicate social influence'
        : 'Social spending appears balanced'
    };
  }

  _analyzeFestivalSpending(transactions) {
    // Indian festival months: March (Holi), August (Raksha Bandhan), October (Dussehra/Diwali), December (Christmas)
    const festivalMonths = [2, 7, 9, 10, 11]; // 0-indexed
    const expenses = transactions.filter(t => t.type === 'expense');
    const monthlySpend = {};

    for (const t of expenses) {
      const m = new Date(t.date || Date.now()).getMonth();
      monthlySpend[m] = (monthlySpend[m] || 0) + Math.abs(t.amount || 0);
    }

    const festivalAvg = mean(festivalMonths.map(m => monthlySpend[m] || 0).filter(s => s > 0));
    const normalAvg = mean(
      Object.entries(monthlySpend)
        .filter(([m]) => !festivalMonths.includes(parseInt(m)))
        .map(([, s]) => s)
        .filter(s => s > 0)
    );

    const ratio = normalAvg > 0 ? festivalAvg / normalAvg : 1;

    return {
      score: Math.min(100, (ratio - 1) * 60),
      isStrong: ratio > 1.5,
      festivalIncrease: ((ratio - 1) * 100).toFixed(0) + '%',
      details: ratio > 1.5
        ? `Festival spending is ${((ratio - 1) * 100).toFixed(0)}% higher than normal months`
        : 'Festival spending is within normal range'
    };
  }
}

// ============================================================================
// §5  NUDGE ENGINE — Behavioral Nudges for Better Financial Decisions
// ============================================================================

class NudgeEngine {
  constructor() {
    this.nudgeTemplates = this._buildNudgeLibrary();
    this.deliveredNudges = {};
    this.maxNudgesPerDay = 3;
  }

  _buildNudgeLibrary() {
    return [
      // Commitment devices
      {
        id: 'nudge_precommit_savings',
        trigger: (ctx) => ctx.savingsRate < 0.2 && ctx.dayOfMonth <= 5,
        message: '🎯 Payday is here! Set up an auto-transfer of 20% to savings before spending kicks in.',
        type: 'commitment_device',
        category: 'savings',
        effectiveness: 0.8
      },
      {
        id: 'nudge_cooling_period',
        trigger: (ctx) => ctx.lastTransactionAmount > ctx.avgExpense * 3,
        message: '⏰ That was a large purchase. For future big purchases, try the 48-hour rule: wait 2 days before buying to avoid impulse spending.',
        type: 'friction',
        category: 'spending',
        effectiveness: 0.7
      },

      // Social proof
      {
        id: 'nudge_peer_savings',
        trigger: (ctx) => ctx.savingsRate < 0.15,
        message: '👥 People with similar income save an average of 22% of their income. You\'re currently at ' + '${savingsRate}%. Small increases compound dramatically!',
        type: 'social_proof',
        category: 'savings',
        effectiveness: 0.6
      },

      // Default effects
      {
        id: 'nudge_sip_stepup',
        trigger: (ctx) => ctx.hasInvestments && ctx.monthsSinceLastSIPIncrease > 12,
        message: '📈 It\'s been over a year since you increased your SIP. A 10% annual step-up can double your final corpus!',
        type: 'default_effect',
        category: 'investment',
        effectiveness: 0.75
      },

      // Loss framing
      {
        id: 'nudge_missed_returns',
        trigger: (ctx) => !ctx.hasInvestments && ctx.savingsRate > 0.1,
        message: '💸 By not investing your savings, you\'re losing ~₹' + '${monthlyLoss}/month to inflation. Even a basic FD beats keeping cash in savings.',
        type: 'loss_framing',
        category: 'investment',
        effectiveness: 0.65
      },

      // Present bias correction
      {
        id: 'nudge_future_self',
        trigger: (ctx) => ctx.spendingTrend > 0.1,
        message: '🔮 Your future self will thank you. Every ₹1,000 saved today at 12% return becomes ₹6,727 in 20 years.',
        type: 'temporal_framing',
        category: 'savings',
        effectiveness: 0.55
      },

      // Anchoring counter
      {
        id: 'nudge_real_cost',
        trigger: (ctx) => ctx.recentLargeSubscription,
        message: '💡 That ₹999/month subscription costs ₹11,988/year. If invested at 12%, that\'s ₹21 lakhs over 20 years. Is it worth it?',
        type: 'anchoring_counter',
        category: 'spending',
        effectiveness: 0.6
      },

      // Goal proximity
      {
        id: 'nudge_goal_progress',
        trigger: (ctx) => ctx.nearestGoalProgress > 0.7 && ctx.nearestGoalProgress < 0.95,
        message: '🏁 You\'re ${goalProgress}% towards your ${goalName} goal! A small push will get you there. Consider a one-time extra contribution.',
        type: 'goal_gradient',
        category: 'goals',
        effectiveness: 0.85
      },

      // Scarcity framing
      {
        id: 'nudge_budget_remaining',
        trigger: (ctx) => ctx.budgetUtilization > 0.8 && ctx.daysRemaining > 5,
        message: '⚡ Only ₹${remaining} left in your ${category} budget for ${daysRemaining} days. That\'s ₹${dailyBudget}/day.',
        type: 'scarcity',
        category: 'budget',
        effectiveness: 0.7
      },

      // Positive reinforcement
      {
        id: 'nudge_streak',
        trigger: (ctx) => ctx.consecutiveDaysUnderBudget >= 7,
        message: '🔥 ${streak}-day streak of staying under budget! Keep it up — you\'ve saved ₹${streakSavings} this week.',
        type: 'positive_reinforcement',
        category: 'budget',
        effectiveness: 0.9
      },

      // Implementation intention
      {
        id: 'nudge_emergency_plan',
        trigger: (ctx) => ctx.emergencyFundMonths < 3,
        message: '🛡️ "If I get a bonus, I will put 50% into my emergency fund." Making this plan now makes it 2x more likely to happen.',
        type: 'implementation_intention',
        category: 'savings',
        effectiveness: 0.7
      }
    ];
  }

  generateNudges(context) {
    const userId = context.userId || 'default';
    const today = new Date().toISOString().split('T')[0];

    if (!this.deliveredNudges[userId]) this.deliveredNudges[userId] = {};
    const todayCount = Object.values(this.deliveredNudges[userId])
      .filter(d => d.date === today).length;

    if (todayCount >= this.maxNudgesPerDay) return [];

    const applicableNudges = [];
    for (const template of this.nudgeTemplates) {
      try {
        if (template.trigger(context)) {
          // Check if recently delivered
          const lastDelivered = this.deliveredNudges[userId]?.[template.id];
          if (lastDelivered) {
            const daysSince = (Date.now() - new Date(lastDelivered.date).getTime()) / 86400000;
            if (daysSince < 7) continue; // Don't repeat within 7 days
          }

          applicableNudges.push({
            ...template,
            message: this._personalizeMessage(template.message, context),
            trigger: undefined
          });
        }
      } catch (e) {
        // Skip failing triggers
      }
    }

    // Sort by effectiveness and limit
    const selected = applicableNudges
      .sort((a, b) => b.effectiveness - a.effectiveness)
      .slice(0, this.maxNudgesPerDay - todayCount);

    // Record delivery
    for (const nudge of selected) {
      this.deliveredNudges[userId][nudge.id] = { date: today };
    }

    return selected;
  }

  _personalizeMessage(message, context) {
    return message
      .replace(/\$\{savingsRate\}/g, ((context.savingsRate || 0) * 100).toFixed(1) + '%')
      .replace(/\$\{monthlyLoss\}/g, Math.round((context.totalSavings || 50000) * 0.06 / 12).toLocaleString())
      .replace(/\$\{goalProgress\}/g, ((context.nearestGoalProgress || 0) * 100).toFixed(0))
      .replace(/\$\{goalName\}/g, context.nearestGoalName || 'financial')
      .replace(/\$\{remaining\}/g, Math.round(context.budgetRemaining || 0).toLocaleString())
      .replace(/\$\{category\}/g, context.budgetCategory || 'monthly')
      .replace(/\$\{daysRemaining\}/g, context.daysRemaining || 0)
      .replace(/\$\{dailyBudget\}/g, Math.round((context.budgetRemaining || 0) / (context.daysRemaining || 1)).toLocaleString())
      .replace(/\$\{streak\}/g, context.consecutiveDaysUnderBudget || 0)
      .replace(/\$\{streakSavings\}/g, Math.round(context.streakSavings || 0).toLocaleString());
  }

  recordResponse(userId, nudgeId, response) {
    if (!this.deliveredNudges[userId]) this.deliveredNudges[userId] = {};
    if (!this.deliveredNudges[userId][nudgeId]) {
      this.deliveredNudges[userId][nudgeId] = { date: new Date().toISOString().split('T')[0] };
    }
    this.deliveredNudges[userId][nudgeId].response = response;
    this.deliveredNudges[userId][nudgeId].respondedAt = new Date();
  }

  getEffectivenessStats() {
    const stats = {};
    for (const [userId, nudges] of Object.entries(this.deliveredNudges)) {
      for (const [nudgeId, data] of Object.entries(nudges)) {
        if (!stats[nudgeId]) stats[nudgeId] = { delivered: 0, responded: 0, positive: 0 };
        stats[nudgeId].delivered++;
        if (data.response) {
          stats[nudgeId].responded++;
          if (data.response === 'helpful' || data.response === 'applied') {
            stats[nudgeId].positive++;
          }
        }
      }
    }

    for (const [nudgeId, data] of Object.entries(stats)) {
      data.responseRate = data.delivered > 0 ? (data.responded / data.delivered * 100).toFixed(0) + '%' : '0%';
      data.positiveRate = data.responded > 0 ? (data.positive / data.responded * 100).toFixed(0) + '%' : '0%';
    }

    return stats;
  }
}

// ============================================================================
// §6  INTEGRATED BEHAVIORAL FINANCE SERVICE
// ============================================================================

class BehavioralFinanceService {
  constructor() {
    this.lossAversionDetector = new LossAversionDetector();
    this.anchoringAnalyzer = new AnchoringBiasAnalyzer();
    this.mentalAccountingAnalyzer = new MentalAccountingAnalyzer();
    this.herdBehaviorAnalyzer = new HerdBehaviorAnalyzer();
    this.nudgeEngine = new NudgeEngine();
  }

  async analyzeUserBehavior(userId, data) {
    const { transactions, investments, budgets, goals } = data;

    const analysis = {};

    // Run all behavioral analyses
    analysis.lossAversion = this.lossAversionDetector.analyze(transactions, investments);
    analysis.anchoringBias = this.anchoringAnalyzer.analyze(transactions, budgets);
    analysis.mentalAccounting = this.mentalAccountingAnalyzer.analyze(transactions);
    analysis.herdBehavior = this.herdBehaviorAnalyzer.analyze(transactions);

    // Calculate overall behavioral score
    const scores = [
      analysis.lossAversion.overallLossAversion,
      analysis.anchoringBias.score,
      analysis.mentalAccounting.score,
      analysis.herdBehavior.score
    ].filter(s => s > 0);

    analysis.overallBehavioralScore = 100 - (scores.length > 0 ? mean(scores) : 0);
    analysis.rating = analysis.overallBehavioralScore >= 80 ? 'Rational'
      : analysis.overallBehavioralScore >= 60 ? 'Mostly Rational'
      : analysis.overallBehavioralScore >= 40 ? 'Bias-Prone'
      : 'Highly Emotional';

    // Collect all recommendations
    analysis.allRecommendations = [
      ...analysis.lossAversion.recommendations,
      ...analysis.anchoringBias.recommendations,
      ...analysis.mentalAccounting.recommendations,
      ...analysis.herdBehavior.recommendations
    ];

    // Generate personalized nudges
    const expenses = transactions?.filter(t => t.type === 'expense') || [];
    const avgExpense = expenses.length > 0
      ? mean(expenses.map(t => Math.abs(t.amount || 0)))
      : 0;

    analysis.nudges = this.nudgeEngine.generateNudges({
      userId,
      savingsRate: data.savingsRate || 0,
      hasInvestments: investments?.length > 0,
      avgExpense,
      lastTransactionAmount: expenses.length > 0
        ? Math.abs(expenses[expenses.length - 1].amount || 0)
        : 0,
      spendingTrend: 0,
      dayOfMonth: new Date().getDate(),
      emergencyFundMonths: data.emergencyFundMonths || 0,
      totalSavings: data.totalSavings || 0
    });

    analysis.generatedAt = new Date();
    return analysis;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  LossAversionDetector,
  AnchoringBiasAnalyzer,
  MentalAccountingAnalyzer,
  HerdBehaviorAnalyzer,
  NudgeEngine,
  BehavioralFinanceService
};
