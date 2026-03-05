// ============================================================================
// NATURAL LANGUAGE REPORT GENERATOR — AI-Powered Financial Report Narratives
// ============================================================================
// Generates comprehensive natural language financial reports with contextual
// analysis, trend narration, actionable recommendations, and personalized
// insights. Runs entirely locally.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');

const sum = (a) => a.reduce((s, v) => s + v, 0);
const mean = (a) => (a.length ? sum(a) / a.length : 0);
const fmt = (n) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0
}).format(n);
const pct = (n) => `${(n * 100).toFixed(1)}%`;

// ============================================================================
// §1  REPORT DATA AGGREGATOR
// ============================================================================

class ReportDataAggregator {
  aggregate(data, period = 'monthly') {
    const { transactions, budgets, goals, loans, investments } = data;

    const agg = {
      period,
      dateRange: this._getDateRange(transactions, period),
      income: { total: 0, sources: {}, count: 0 },
      expenses: { total: 0, categories: {}, count: 0, merchants: {} },
      savings: { amount: 0, rate: 0, trend: 'stable' },
      netFlow: 0,
      budgetAnalysis: [],
      goalProgress: [],
      loanSummary: null,
      investmentSummary: null,
      monthOverMonth: null,
      topInsights: []
    };

    if (!transactions || transactions.length === 0) return agg;

    // Filter transactions to period
    const { start, end } = agg.dateRange;
    const periodTxns = transactions.filter(t => {
      const d = new Date(t.date || 0);
      return d >= start && d <= end;
    });

    // Income analysis
    const incomeTxns = periodTxns.filter(t => t.type === 'income');
    agg.income.total = sum(incomeTxns.map(t => Math.abs(t.amount || 0)));
    agg.income.count = incomeTxns.length;
    for (const t of incomeTxns) {
      const source = t.category || t.description || 'Other';
      agg.income.sources[source] = (agg.income.sources[source] || 0) + Math.abs(t.amount || 0);
    }

    // Expense analysis
    const expenseTxns = periodTxns.filter(t => t.type === 'expense');
    agg.expenses.total = sum(expenseTxns.map(t => Math.abs(t.amount || 0)));
    agg.expenses.count = expenseTxns.length;
    for (const t of expenseTxns) {
      const cat = t.category || 'Uncategorized';
      agg.expenses.categories[cat] = (agg.expenses.categories[cat] || 0) + Math.abs(t.amount || 0);
      const merchant = t.merchant || t.description || 'Unknown';
      agg.expenses.merchants[merchant] = (agg.expenses.merchants[merchant] || 0) + Math.abs(t.amount || 0);
    }

    // Savings
    agg.savings.amount = agg.income.total - agg.expenses.total;
    agg.savings.rate = agg.income.total > 0
      ? (agg.income.total - agg.expenses.total) / agg.income.total
      : 0;

    agg.netFlow = agg.savings.amount;

    // Month-over-month comparison
    agg.monthOverMonth = this._getMonthOverMonth(transactions, start);

    // Budget analysis
    if (budgets && budgets.length > 0) {
      agg.budgetAnalysis = budgets.map(b => {
        const spent = agg.expenses.categories[b.category] || b.spent || 0;
        const limit = b.limit || b.amount || 0;
        return {
          category: b.category,
          limit,
          spent,
          remaining: limit - spent,
          utilization: limit > 0 ? spent / limit : 0,
          status: spent > limit ? 'over_budget' : spent > limit * 0.9 ? 'near_limit' : 'on_track'
        };
      });
    }

    // Goal progress
    if (goals && goals.length > 0) {
      agg.goalProgress = goals.map(g => ({
        name: g.name || g.title,
        target: g.targetAmount || g.target,
        current: g.currentAmount || g.saved || 0,
        progress: g.targetAmount > 0
          ? (g.currentAmount || g.saved || 0) / g.targetAmount
          : 0,
        deadline: g.deadline || g.targetDate,
        daysLeft: g.deadline
          ? Math.max(0, Math.round((new Date(g.deadline) - Date.now()) / (86400000)))
          : null
      }));
    }

    // Loan summary
    if (loans && loans.length > 0) {
      const active = loans.filter(l => l.status === 'active');
      agg.loanSummary = {
        activeLoans: active.length,
        totalOutstanding: sum(active.map(l => l.outstandingAmount || l.outstanding || l.principalAmount || 0)),
        monthlyEMI: sum(active.map(l => l.emiAmount || l.emi || 0)),
        highestRate: Math.max(...active.map(l => l.interestRate || l.rate || 0)),
        loans: active.map(l => ({
          name: l.name || l.loanType,
          outstanding: l.outstandingAmount || l.outstanding || 0,
          emi: l.emiAmount || l.emi || 0,
          rate: l.interestRate || l.rate || 0
        }))
      };
    }

    // Investment summary
    if (investments && investments.length > 0) {
      const totalInvested = sum(investments.map(i => i.investedAmount || i.invested || 0));
      const totalValue = sum(investments.map(i => i.currentValue || i.value || 0));
      agg.investmentSummary = {
        totalInvested,
        currentValue: totalValue,
        totalReturns: totalValue - totalInvested,
        returnPercent: totalInvested > 0 ? (totalValue - totalInvested) / totalInvested : 0,
        holdings: investments.length,
        diversification: new Set(investments.map(i => i.type || i.assetClass)).size
      };
    }

    return agg;
  }

  _getDateRange(transactions, period) {
    const now = new Date();
    let start, end;

    switch (period) {
      case 'weekly':
        end = now;
        start = new Date(now.getTime() - 7 * 86400000);
        break;
      case 'monthly':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
        break;
      case 'quarterly':
        const q = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), q * 3, 1);
        end = now;
        break;
      case 'yearly':
        start = new Date(now.getFullYear(), 0, 1);
        end = now;
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
    }

    return { start, end, label: this._periodLabel(period, start, end) };
  }

  _periodLabel(period, start, end) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    switch (period) {
      case 'weekly':
        return `Week of ${start.toLocaleDateString('en-IN')}`;
      case 'monthly':
        return `${months[start.getMonth()]} ${start.getFullYear()}`;
      case 'quarterly':
        return `Q${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}`;
      case 'yearly':
        return `${start.getFullYear()}`;
      default:
        return `${start.toLocaleDateString('en-IN')} to ${end.toLocaleDateString('en-IN')}`;
    }
  }

  _getMonthOverMonth(transactions, currentStart) {
    const prevStart = new Date(currentStart);
    prevStart.setMonth(prevStart.getMonth() - 1);
    const prevEnd = new Date(currentStart.getTime() - 1);

    const currentExpenses = transactions
      .filter(t => t.type === 'expense' && new Date(t.date || 0) >= currentStart)
      .reduce((s, t) => s + Math.abs(t.amount || 0), 0);

    const previousExpenses = transactions
      .filter(t => {
        const d = new Date(t.date || 0);
        return t.type === 'expense' && d >= prevStart && d <= prevEnd;
      })
      .reduce((s, t) => s + Math.abs(t.amount || 0), 0);

    const currentIncome = transactions
      .filter(t => t.type === 'income' && new Date(t.date || 0) >= currentStart)
      .reduce((s, t) => s + Math.abs(t.amount || 0), 0);

    const previousIncome = transactions
      .filter(t => {
        const d = new Date(t.date || 0);
        return t.type === 'income' && d >= prevStart && d <= prevEnd;
      })
      .reduce((s, t) => s + Math.abs(t.amount || 0), 0);

    return {
      expenseChange: previousExpenses > 0
        ? (currentExpenses - previousExpenses) / previousExpenses
        : 0,
      incomeChange: previousIncome > 0
        ? (currentIncome - previousIncome) / previousIncome
        : 0,
      currentExpenses,
      previousExpenses,
      currentIncome,
      previousIncome
    };
  }
}

// ============================================================================
// §2  NARRATIVE GENERATOR — Convert Data to Natural Language
// ============================================================================

class NarrativeGenerator {
  constructor() {
    this.tone = 'professional'; // professional, friendly, concise
  }

  setTone(tone) {
    this.tone = tone;
  }

  generateExecutiveSummary(agg) {
    const parts = [];

    // Opening
    parts.push(`## 📊 Financial Report — ${agg.dateRange.label}\n`);

    // Net position
    if (agg.netFlow >= 0) {
      parts.push(`You had a **positive cash flow** of ${fmt(agg.netFlow)} this period. ` +
        `Total income was ${fmt(agg.income.total)} against expenses of ${fmt(agg.expenses.total)}, ` +
        `achieving a savings rate of **${pct(agg.savings.rate)}**.`);
    } else {
      parts.push(`⚠️ You spent more than you earned this period. ` +
        `Expenses of ${fmt(agg.expenses.total)} exceeded income of ${fmt(agg.income.total)} ` +
        `by ${fmt(Math.abs(agg.netFlow))}. Review your spending to get back on track.`);
    }

    // Month-over-month
    if (agg.monthOverMonth) {
      const mom = agg.monthOverMonth;
      if (mom.expenseChange > 0.1) {
        parts.push(`\nSpending increased by ${pct(mom.expenseChange)} compared to last month ` +
          `(${fmt(mom.previousExpenses)} → ${fmt(mom.currentExpenses)}). ` +
          `${mom.expenseChange > 0.25 ? 'This significant increase warrants attention.' : 'Monitor this trend.'}`);
      } else if (mom.expenseChange < -0.1) {
        parts.push(`\n✅ Great news — spending decreased by ${pct(Math.abs(mom.expenseChange))} vs last month ` +
          `(${fmt(mom.previousExpenses)} → ${fmt(mom.currentExpenses)}).`);
      } else {
        parts.push(`\nSpending remained stable compared to last month.`);
      }
    }

    return parts.join('\n');
  }

  generateIncomeSection(agg) {
    const parts = [];
    parts.push(`\n## 💰 Income Analysis\n`);
    parts.push(`Total income: **${fmt(agg.income.total)}** across ${agg.income.count} transactions.\n`);

    const sources = Object.entries(agg.income.sources)
      .sort((a, b) => b[1] - a[1]);

    if (sources.length > 0) {
      parts.push(`**Income Sources:**`);
      for (const [source, amount] of sources.slice(0, 5)) {
        const share = agg.income.total > 0 ? (amount / agg.income.total * 100).toFixed(0) : 0;
        parts.push(`- ${source}: ${fmt(amount)} (${share}%)`);
      }
    }

    if (sources.length === 1) {
      parts.push(`\n💡 Single income source detected. Consider diversifying with freelancing, investments, or passive income.`);
    }

    return parts.join('\n');
  }

  generateExpenseSection(agg) {
    const parts = [];
    parts.push(`\n## 💸 Expense Analysis\n`);
    parts.push(`Total expenses: **${fmt(agg.expenses.total)}** across ${agg.expenses.count} transactions.\n`);

    const categories = Object.entries(agg.expenses.categories)
      .sort((a, b) => b[1] - a[1]);

    if (categories.length > 0) {
      parts.push(`**Top Spending Categories:**`);
      for (const [cat, amount] of categories.slice(0, 8)) {
        const share = agg.expenses.total > 0 ? (amount / agg.expenses.total * 100).toFixed(0) : 0;
        const bar = '█'.repeat(Math.round(share / 5)) + '░'.repeat(20 - Math.round(share / 5));
        parts.push(`- **${cat}**: ${fmt(amount)} (${share}%) ${bar}`);
      }

      // Category insights
      const topCat = categories[0];
      if (topCat && agg.expenses.total > 0) {
        const topPct = topCat[1] / agg.expenses.total;
        if (topPct > 0.4) {
          parts.push(`\n⚠️ **${topCat[0]}** dominates at ${pct(topPct)} of total spending. ` +
            `Diversified spending is healthier financially.`);
        }
      }
    }

    // Top merchants
    const merchants = Object.entries(agg.expenses.merchants)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (merchants.length > 0) {
      parts.push(`\n**Top Merchants:**`);
      for (const [m, amount] of merchants) {
        parts.push(`- ${m}: ${fmt(amount)}`);
      }
    }

    return parts.join('\n');
  }

  generateBudgetSection(agg) {
    if (!agg.budgetAnalysis || agg.budgetAnalysis.length === 0) return '';

    const parts = [];
    parts.push(`\n## 📋 Budget Performance\n`);

    const overBudget = agg.budgetAnalysis.filter(b => b.status === 'over_budget');
    const nearLimit = agg.budgetAnalysis.filter(b => b.status === 'near_limit');
    const onTrack = agg.budgetAnalysis.filter(b => b.status === 'on_track');

    parts.push(`${onTrack.length}/${agg.budgetAnalysis.length} budgets on track. ` +
      `${overBudget.length > 0 ? `**${overBudget.length} exceeded.** ` : ''}` +
      `${nearLimit.length > 0 ? `${nearLimit.length} near limit.` : ''}\n`);

    for (const b of agg.budgetAnalysis) {
      const util = (b.utilization * 100).toFixed(0);
      const icon = b.status === 'over_budget' ? '🔴' : b.status === 'near_limit' ? '🟡' : '🟢';
      parts.push(`${icon} **${b.category}**: ${fmt(b.spent)} / ${fmt(b.limit)} (${util}%)` +
        `${b.remaining < 0 ? ` — Over by ${fmt(Math.abs(b.remaining))}` : ` — ${fmt(b.remaining)} remaining`}`);
    }

    if (overBudget.length > 0) {
      parts.push(`\n💡 **Action:** Review spending in ${overBudget.map(b => b.category).join(', ')} and adjust allocations for next month.`);
    }

    return parts.join('\n');
  }

  generateGoalSection(agg) {
    if (!agg.goalProgress || agg.goalProgress.length === 0) return '';

    const parts = [];
    parts.push(`\n## 🎯 Financial Goals\n`);

    for (const g of agg.goalProgress) {
      const progressPct = (g.progress * 100).toFixed(0);
      const progressBar = '▓'.repeat(Math.round(g.progress * 20)) +
        '░'.repeat(20 - Math.round(g.progress * 20));
      parts.push(`**${g.name}**: ${progressBar} ${progressPct}%`);
      parts.push(`  ${fmt(g.current)} / ${fmt(g.target)}` +
        `${g.daysLeft !== null ? ` — ${g.daysLeft} days left` : ''}`);

      if (g.progress < 0.5 && g.daysLeft && g.daysLeft < 180) {
        parts.push(`  ⚠️ Behind schedule — increase monthly contributions`);
      } else if (g.progress > 0.9) {
        parts.push(`  🎉 Almost there!`);
      }
    }

    return parts.join('\n');
  }

  generateDebtSection(agg) {
    if (!agg.loanSummary) return '';

    const parts = [];
    const ls = agg.loanSummary;
    parts.push(`\n## 🏦 Debt Overview\n`);
    parts.push(`**${ls.activeLoans} active loans** | Outstanding: **${fmt(ls.totalOutstanding)}** | Monthly EMI: **${fmt(ls.monthlyEMI)}**\n`);

    if (agg.income.total > 0) {
      const emiToIncome = ls.monthlyEMI / (agg.income.total || 1);
      parts.push(`EMI-to-income ratio: **${pct(emiToIncome)}** ${emiToIncome > 0.4 ? '⚠️ Above recommended 40%' : '✅ Within healthy range'}\n`);
    }

    for (const l of ls.loans) {
      parts.push(`- **${l.name}**: ${fmt(l.outstanding)} @ ${(l.rate * 100).toFixed(1)}% (EMI: ${fmt(l.emi)})`);
    }

    if (ls.highestRate > 0.15) {
      parts.push(`\n💡 **Recommendation:** Your highest interest rate is ${(ls.highestRate * 100).toFixed(1)}%. ` +
        `Consider prepaying this loan or exploring refinancing options.`);
    }

    return parts.join('\n');
  }

  generateInvestmentSection(agg) {
    if (!agg.investmentSummary) return '';

    const parts = [];
    const inv = agg.investmentSummary;
    parts.push(`\n## 📈 Investment Portfolio\n`);
    parts.push(`**Portfolio Value:** ${fmt(inv.currentValue)} | **Invested:** ${fmt(inv.totalInvested)} | **Returns:** ${fmt(inv.totalReturns)} (${pct(inv.returnPercent)})\n`);
    parts.push(`Holdings: ${inv.holdings} | Asset classes: ${inv.diversification}\n`);

    if (inv.diversification < 3) {
      parts.push(`💡 Portfolio lacks diversification. Consider adding different asset classes for better risk management.`);
    }

    if (inv.returnPercent < 0) {
      parts.push(`⚠️ Portfolio in negative territory. If investments are long-term (5+ years), stay invested. Don't panic-sell.`);
    } else if (inv.returnPercent > 0.15) {
      parts.push(`✅ Strong returns! Consider booking partial profits and rebalancing.`);
    }

    return parts.join('\n');
  }

  generateRecommendations(agg) {
    const parts = [];
    parts.push(`\n## 💡 AI Recommendations\n`);

    const recs = [];

    // Savings recommendations
    if (agg.savings.rate < 0.1) {
      recs.push({
        priority: 'critical',
        area: 'savings',
        text: `Your savings rate of ${pct(agg.savings.rate)} is critically low. Target at least 20%. ` +
          `Reduce discretionary spending by ${fmt(agg.expenses.total * 0.1)} per month.`
      });
    } else if (agg.savings.rate < 0.2) {
      recs.push({
        priority: 'high',
        area: 'savings',
        text: `Savings rate is ${pct(agg.savings.rate)} — below the recommended 20%. ` +
          `Small cuts across categories can help bridge the ${fmt((0.2 * agg.income.total) - agg.savings.amount)} gap.`
      });
    }

    // Over-budget recommendations
    const overBudget = (agg.budgetAnalysis || []).filter(b => b.status === 'over_budget');
    if (overBudget.length > 0) {
      recs.push({
        priority: 'high',
        area: 'budget',
        text: `${overBudget.length} categories exceeded budget: ${overBudget.map(b =>
          `${b.category} (${fmt(Math.abs(b.remaining))} over)`).join(', ')}. ` +
          `Either increase budget limits or reduce spending.`
      });
    }

    // Spending trend
    if (agg.monthOverMonth?.expenseChange > 0.2) {
      recs.push({
        priority: 'medium',
        area: 'spending',
        text: `Spending jumped ${pct(agg.monthOverMonth.expenseChange)} month-over-month. ` +
          `Review the largest category increases and set stricter limits.`
      });
    }

    // Goal at risk
    const goalsAtRisk = (agg.goalProgress || []).filter(g =>
      g.progress < 0.5 && g.daysLeft && g.daysLeft < 365
    );
    if (goalsAtRisk.length > 0) {
      recs.push({
        priority: 'medium',
        area: 'goals',
        text: `${goalsAtRisk.length} goal(s) behind schedule: ${goalsAtRisk.map(g => g.name).join(', ')}. ` +
          `Increase monthly contributions or extend deadlines.`
      });
    }

    // High EMI
    if (agg.loanSummary && agg.income.total > 0) {
      const emiRatio = agg.loanSummary.monthlyEMI / agg.income.total;
      if (emiRatio > 0.4) {
        recs.push({
          priority: 'high',
          area: 'debt',
          text: `EMI-to-income ratio is ${pct(emiRatio)} (above 40%). This is financially stressful. ` +
            `Consider debt consolidation or accelerated payoff of the highest-rate loan.`
        });
      }
    }

    // Positive reinforcement
    if (agg.savings.rate >= 0.2) {
      recs.push({
        priority: 'positive',
        area: 'savings',
        text: `Excellent savings discipline! ${pct(agg.savings.rate)} savings rate exceeds the 20% benchmark. ` +
          `Consider channeling surplus into investments for wealth growth.`
      });
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, positive: 3 };
    recs.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));

    for (const rec of recs) {
      const icon = rec.priority === 'critical' ? '🔴' : rec.priority === 'high' ? '🟠' :
        rec.priority === 'positive' ? '🟢' : '🟡';
      parts.push(`${icon} **${rec.area.toUpperCase()}**: ${rec.text}`);
    }

    if (recs.length === 0) {
      parts.push(`✅ No immediate concerns. Your finances are in good shape!`);
    }

    return parts.join('\n\n');
  }

  generateClosing(agg) {
    const parts = [];
    parts.push(`\n---\n`);

    const score = this._calculateOverallScore(agg);
    parts.push(`**Overall Financial Health: ${score}/100** ${score >= 80 ? '🌟' : score >= 60 ? '👍' : score >= 40 ? '⚠️' : '🔴'}`);
    parts.push(`\n*Report generated by AI Financial Analyzer on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}.*`);
    parts.push(`*All analysis is performed locally — no data leaves your machine.*`);

    return parts.join('\n');
  }

  _calculateOverallScore(agg) {
    let score = 50;

    // Savings rate impact (±20)
    if (agg.savings.rate >= 0.3) score += 20;
    else if (agg.savings.rate >= 0.2) score += 15;
    else if (agg.savings.rate >= 0.1) score += 5;
    else if (agg.savings.rate < 0) score -= 20;

    // Budget adherence (±15)
    if (agg.budgetAnalysis.length > 0) {
      const onTrack = agg.budgetAnalysis.filter(b => b.status === 'on_track').length;
      score += Math.round((onTrack / agg.budgetAnalysis.length) * 15);
    }

    // Goal progress (±10)
    if (agg.goalProgress.length > 0) {
      const avgProgress = mean(agg.goalProgress.map(g => g.progress));
      score += Math.round(avgProgress * 10);
    }

    // Debt health (±10)
    if (agg.loanSummary && agg.income.total > 0) {
      const emiRatio = agg.loanSummary.monthlyEMI / agg.income.total;
      if (emiRatio < 0.3) score += 10;
      else if (emiRatio > 0.5) score -= 10;
    } else {
      score += 5; // No debt bonus
    }

    // Investment health (±5)
    if (agg.investmentSummary) {
      if (agg.investmentSummary.returnPercent > 0) score += 5;
      if (agg.investmentSummary.diversification >= 3) score += 3;
    }

    return Math.max(0, Math.min(100, score));
  }
}

// ============================================================================
// §3  REPORT COMPOSER — Assemble Complete Reports
// ============================================================================

class ReportComposer {
  constructor() {
    this.aggregator = new ReportDataAggregator();
    this.narrator = new NarrativeGenerator();
  }

  generateFullReport(data, period = 'monthly') {
    const agg = this.aggregator.aggregate(data, period);

    const sections = [
      this.narrator.generateExecutiveSummary(agg),
      this.narrator.generateIncomeSection(agg),
      this.narrator.generateExpenseSection(agg),
      this.narrator.generateBudgetSection(agg),
      this.narrator.generateGoalSection(agg),
      this.narrator.generateDebtSection(agg),
      this.narrator.generateInvestmentSection(agg),
      this.narrator.generateRecommendations(agg),
      this.narrator.generateClosing(agg)
    ].filter(Boolean);

    return {
      markdown: sections.join('\n'),
      aggregatedData: agg,
      wordCount: sections.join(' ').split(/\s+/).length,
      generatedAt: new Date(),
      period
    };
  }

  generateQuickSummary(data) {
    const agg = this.aggregator.aggregate(data, 'monthly');
    const parts = [];

    parts.push(`💰 Income: ${fmt(agg.income.total)} | 💸 Expenses: ${fmt(agg.expenses.total)}`);
    parts.push(`💵 Savings: ${fmt(agg.savings.amount)} (${pct(agg.savings.rate)})`);

    if (agg.monthOverMonth) {
      const change = agg.monthOverMonth.expenseChange;
      parts.push(`📊 vs Last Month: ${change > 0 ? '↑' : '↓'} ${pct(Math.abs(change))}`);
    }

    const topCats = Object.entries(agg.expenses.categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    if (topCats.length > 0) {
      parts.push(`🏷️ Top: ${topCats.map(([c, a]) => `${c} ${fmt(a)}`).join(' | ')}`);
    }

    return { text: parts.join('\n'), data: agg };
  }

  generateCategoryReport(data, category) {
    const agg = this.aggregator.aggregate(data, 'monthly');
    const catAmount = agg.expenses.categories[category] || 0;
    const catPct = agg.expenses.total > 0 ? catAmount / agg.expenses.total : 0;

    const merchants = Object.entries(agg.expenses.merchants)
      .filter(([m]) => {
        const txns = (data.transactions || []).filter(t =>
          (t.category || '') === category &&
          (t.merchant || t.description || '') === m
        );
        return txns.length > 0;
      })
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      category,
      total: catAmount,
      percentage: catPct,
      merchants: merchants.map(([m, a]) => ({ merchant: m, amount: a })),
      narrative: `You spent ${fmt(catAmount)} (${pct(catPct)} of total) on **${category}**. ` +
        `${merchants.length > 0
          ? `Top merchants: ${merchants.slice(0, 3).map(([m, a]) => `${m} (${fmt(a)})`).join(', ')}.`
          : ''}`
    };
  }

  generateComparativeReport(currentData, previousData) {
    const current = this.aggregator.aggregate(currentData, 'monthly');
    const previous = this.aggregator.aggregate(previousData, 'monthly');

    const parts = [];
    parts.push(`## 📊 Comparative Analysis\n`);
    parts.push(`| Metric | Current | Previous | Change |`);
    parts.push(`|--------|---------|----------|--------|`);
    parts.push(`| Income | ${fmt(current.income.total)} | ${fmt(previous.income.total)} | ${this._changeStr(current.income.total, previous.income.total)} |`);
    parts.push(`| Expenses | ${fmt(current.expenses.total)} | ${fmt(previous.expenses.total)} | ${this._changeStr(current.expenses.total, previous.expenses.total)} |`);
    parts.push(`| Savings | ${fmt(current.savings.amount)} | ${fmt(previous.savings.amount)} | ${this._changeStr(current.savings.amount, previous.savings.amount)} |`);
    parts.push(`| Savings Rate | ${pct(current.savings.rate)} | ${pct(previous.savings.rate)} | ${this._changeStr(current.savings.rate * 100, previous.savings.rate * 100, '%')} |`);

    return {
      markdown: parts.join('\n'),
      current,
      previous,
      improvements: this._findImprovements(current, previous)
    };
  }

  _changeStr(current, previous, suffix = '') {
    if (previous === 0) return 'N/A';
    const change = ((current - previous) / Math.abs(previous)) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%${suffix}`;
  }

  _findImprovements(current, previous) {
    const improvements = [];
    if (current.savings.rate > previous.savings.rate) {
      improvements.push('Savings rate improved');
    }
    if (current.expenses.total < previous.expenses.total) {
      improvements.push('Overall spending decreased');
    }
    return improvements;
  }
}

// ============================================================================
// §4  REPORT SCHEDULER — Automated Report Generation
// ============================================================================

class ReportScheduler {
  constructor() {
    this.schedules = {};
    this.generatedReports = {};
    this.composer = new ReportComposer();
  }

  schedule(userId, frequency, dataProvider) {
    this.schedules[userId] = {
      frequency, // daily, weekly, monthly
      dataProvider,
      lastGenerated: null,
      enabled: true
    };
  }

  async checkAndGenerate() {
    const now = new Date();
    const generated = [];

    for (const [userId, schedule] of Object.entries(this.schedules)) {
      if (!schedule.enabled) continue;

      const shouldGenerate = !schedule.lastGenerated ||
        this._shouldRegenerate(schedule, now);

      if (shouldGenerate) {
        try {
          const data = typeof schedule.dataProvider === 'function'
            ? await schedule.dataProvider(userId)
            : schedule.dataProvider;

          const report = this.composer.generateFullReport(data, schedule.frequency);
          schedule.lastGenerated = now;

          if (!this.generatedReports[userId]) this.generatedReports[userId] = [];
          this.generatedReports[userId].push(report);
          if (this.generatedReports[userId].length > 12) {
            this.generatedReports[userId].shift();
          }

          generated.push({ userId, report });
        } catch (e) {
          logger.debug(`Report generation failed for ${userId}: ${e.message}`);
        }
      }
    }

    return generated;
  }

  getReport(userId, index = -1) {
    const reports = this.generatedReports[userId] || [];
    if (index < 0) index = reports.length + index;
    return reports[index] || null;
  }

  getReportHistory(userId) {
    return (this.generatedReports[userId] || []).map((r, i) => ({
      index: i,
      period: r.period,
      generatedAt: r.generatedAt,
      wordCount: r.wordCount
    }));
  }

  _shouldRegenerate(schedule, now) {
    const last = new Date(schedule.lastGenerated || 0);
    switch (schedule.frequency) {
      case 'daily': return now.getDate() !== last.getDate();
      case 'weekly': return Math.floor((now - last) / (7 * 86400000)) >= 1;
      case 'monthly': return now.getMonth() !== last.getMonth();
      default: return false;
    }
  }
}

// ============================================================================
// §5  UNIFIED REPORT SERVICE
// ============================================================================

class NLReportService {
  constructor() {
    this.composer = new ReportComposer();
    this.scheduler = new ReportScheduler();
  }

  generateReport(data, period = 'monthly') {
    return this.composer.generateFullReport(data, period);
  }

  generateQuickSummary(data) {
    return this.composer.generateQuickSummary(data);
  }

  generateCategoryReport(data, category) {
    return this.composer.generateCategoryReport(data, category);
  }

  generateComparison(currentData, previousData) {
    return this.composer.generateComparativeReport(currentData, previousData);
  }

  scheduleReport(userId, frequency, dataProvider) {
    this.scheduler.schedule(userId, frequency, dataProvider);
  }

  async runScheduledReports() {
    return this.scheduler.checkAndGenerate();
  }

  getReportHistory(userId) {
    return this.scheduler.getReportHistory(userId);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  ReportDataAggregator,
  NarrativeGenerator,
  ReportComposer,
  ReportScheduler,
  NLReportService
};
