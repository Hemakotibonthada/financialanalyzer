// ============================================================================
// Debt Payoff Strategy Engine — AI-Powered Debt Freedom Planning
// ============================================================================
// Implements multiple debt payoff strategies:
//  - Snowball (smallest balance first) for psychological wins
//  - Avalanche (highest interest first) for optimal savings
//  - Hybrid (balance urgency + interest rate optimization)
//  - Custom (user-priority-based ordering)
//  - Foreclosure analysis for EMIs
// ============================================================================

const EMI = require('../../models/EMI');
const Transaction = require('../../models/Transaction');
const logger = require('../../utils/logger');

class DebtPayoffEngine {
  /**
   * Analyze all debts and generate comprehensive payoff plan
   */
  async analyzeDebts(userId, extraMonthly = 0) {
    const emis = await EMI.find({ userId, status: 'active', remainingInstallments: { $gt: 0 } }).lean();

    if (emis.length === 0) {
      return { message: 'Congratulations! You have no active debts.', debts: [], strategies: {} };
    }

    const debts = emis.map(emi => ({
      id: emi._id,
      name: emi.merchantName || `${emi.cardProvider} EMI`,
      provider: emi.cardProvider,
      principalRemaining: (emi.emiAmount || 0) * (emi.remainingInstallments || 0),
      monthlyPayment: emi.emiAmount || 0,
      interestRate: emi.interestRate || 0,
      remainingMonths: emi.remainingInstallments || 0,
      totalRemaining: (emi.emiAmount || 0) * (emi.remainingInstallments || 0),
      paidSoFar: (emi.emiAmount || 0) * (emi.paidInstallments || 0),
      progress: emi.totalTenure > 0 ? Math.round((emi.paidInstallments / emi.totalTenure) * 100) : 0,
      nextDueDate: emi.nextDueDate,
      canForeclosure: emi.canForeclosure !== false,
      foreclosureAmount: emi.foreclosureAmount || 0,
    }));

    const totalDebt = debts.reduce((s, d) => s + d.totalRemaining, 0);
    const totalMonthlyPayment = debts.reduce((s, d) => s + d.monthlyPayment, 0);
    const avgInterestRate = debts.length > 0
      ? debts.reduce((s, d) => s + d.interestRate, 0) / debts.length
      : 0;

    // Generate strategies
    const snowball = this._snowballStrategy(debts, extraMonthly);
    const avalanche = this._avalancheStrategy(debts, extraMonthly);
    const hybrid = this._hybridStrategy(debts, extraMonthly);

    // Calculate savings between strategies
    const snowballTotal = snowball.totalInterestPaid || snowball.totalPaid || 0;
    const avalancheTotal = avalanche.totalInterestPaid || avalanche.totalPaid || 0;

    return {
      summary: {
        totalDebt: Math.round(totalDebt),
        totalMonthlyPayment: Math.round(totalMonthlyPayment),
        debtCount: debts.length,
        avgInterestRate: Math.round(avgInterestRate * 100) / 100,
        extraMonthlyAvailable: extraMonthly,
        weightedInterestRate: this._calculateWeightedRate(debts),
      },
      debts: debts.sort((a, b) => b.totalRemaining - a.totalRemaining),
      strategies: {
        snowball: { ...snowball, description: 'Pay off smallest balances first for quick psychological wins' },
        avalanche: { ...avalanche, description: 'Pay off highest interest rate first to minimize total interest paid' },
        hybrid: { ...hybrid, description: 'Balanced approach considering both balance and interest rate' },
      },
      recommendation: {
        strategy: avalancheTotal < snowballTotal ? 'avalanche' : 'snowball',
        reason: avalancheTotal < snowballTotal
          ? `Avalanche saves ₹${Math.round(snowballTotal - avalancheTotal).toLocaleString('en-IN')} in interest`
          : 'Snowball provides faster wins to maintain motivation',
        potentialSavings: Math.abs(Math.round(snowballTotal - avalancheTotal)),
      },
      debtFreeDate: this._estimateDebtFreeDate(debts, extraMonthly),
      monthlySchedule: this._generateMonthlySchedule(debts, extraMonthly, 'avalanche'),
    };
  }

  /**
   * Snowball strategy — smallest balance first
   */
  _snowballStrategy(debts, extra) {
    const sorted = [...debts].sort((a, b) => a.totalRemaining - b.totalRemaining);
    return this._simulatePayoff(sorted, extra, 'snowball');
  }

  /**
   * Avalanche strategy — highest interest first
   */
  _avalancheStrategy(debts, extra) {
    const sorted = [...debts].sort((a, b) => b.interestRate - a.interestRate);
    return this._simulatePayoff(sorted, extra, 'avalanche');
  }

  /**
   * Hybrid strategy — weighted score of balance and interest
   */
  _hybridStrategy(debts, extra) {
    const maxRate = Math.max(...debts.map(d => d.interestRate), 1);
    const maxBalance = Math.max(...debts.map(d => d.totalRemaining), 1);

    const sorted = [...debts]
      .map(d => ({
        ...d,
        score: (d.interestRate / maxRate) * 0.6 + (1 - d.totalRemaining / maxBalance) * 0.4,
      }))
      .sort((a, b) => b.score - a.score);

    return this._simulatePayoff(sorted, extra, 'hybrid');
  }

  /**
   * Simulate payoff for a given order
   */
  _simulatePayoff(orderedDebts, extra, strategyName) {
    const debts = orderedDebts.map(d => ({
      ...d,
      remaining: d.totalRemaining,
      monthsLeft: d.remainingMonths,
    }));

    let totalPaid = 0;
    let totalMonths = 0;
    let freedUpMonthly = 0;
    const payoffOrder = [];
    const maxMonths = 360; // 30 year cap

    while (debts.some(d => d.remaining > 0) && totalMonths < maxMonths) {
      totalMonths++;
      let extraPool = extra + freedUpMonthly;

      debts.forEach((debt, idx) => {
        if (debt.remaining <= 0) return;

        // Regular payment
        const payment = Math.min(debt.monthlyPayment, debt.remaining);
        debt.remaining -= payment;
        totalPaid += payment;

        // Extra payment goes to first unpaid debt
        if (idx === debts.findIndex(d => d.remaining > 0) && extraPool > 0) {
          const extraPayment = Math.min(extraPool, debt.remaining);
          debt.remaining -= extraPayment;
          totalPaid += extraPayment;
          extraPool -= extraPayment;
        }

        // Check if paid off
        if (debt.remaining <= 0 && !payoffOrder.find(p => p.id === debt.id)) {
          payoffOrder.push({
            id: debt.id,
            name: debt.name,
            month: totalMonths,
            originalBalance: debt.totalRemaining,
          });
          freedUpMonthly += debt.monthlyPayment;
        }
      });
    }

    return {
      strategyName,
      totalMonths,
      totalPaid: Math.round(totalPaid),
      payoffOrder,
      freedUpMonthly: Math.round(freedUpMonthly),
      estimatedCompletion: (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + totalMonths);
        return d;
      })(),
    };
  }

  /**
   * Foreclosure analysis for a specific EMI
   */
  async analyzeForeclosure(userId, emiId) {
    const emi = await EMI.findOne({ _id: emiId, userId }).lean();
    if (!emi) return { error: 'EMI not found' };

    const remainingAmount = (emi.emiAmount || 0) * (emi.remainingInstallments || 0);
    const interestRate = emi.interestRate || 0;

    // Estimate interest saved by foreclosure
    const monthlyInterest = remainingAmount * (interestRate / 100 / 12);
    const totalInterestRemaining = monthlyInterest * (emi.remainingInstallments || 0) / 2; // Approximate

    // Foreclosure fees (typically 2-5% of remaining principal)
    const foreclosureFee = remainingAmount * 0.03;
    const totalForeclosureCost = remainingAmount + foreclosureFee;
    const netSavings = totalInterestRemaining - foreclosureFee;

    return {
      emi: {
        name: emi.merchantName,
        provider: emi.cardProvider,
        monthlyAmount: emi.emiAmount,
        remainingInstallments: emi.remainingInstallments,
        interestRate,
      },
      analysis: {
        remainingPrincipal: Math.round(remainingAmount),
        estimatedInterestRemaining: Math.round(totalInterestRemaining),
        foreclosureFee: Math.round(foreclosureFee),
        totalForeclosureCost: Math.round(totalForeclosureCost),
        netSavings: Math.round(netSavings),
        monthsFreed: emi.remainingInstallments,
        monthlyFreedUp: emi.emiAmount,
      },
      recommendation: netSavings > 0
        ? { action: 'foreclose', message: `Foreclosing saves ₹${Math.round(netSavings).toLocaleString('en-IN')} in interest and frees ₹${(emi.emiAmount || 0).toLocaleString('en-IN')}/month` }
        : { action: 'continue', message: 'Low interest rate — continuing payments is more cost-effective' },
      canForeclosure: emi.canForeclosure !== false,
    };
  }

  /**
   * Generate monthly payment schedule
   */
  _generateMonthlySchedule(debts, extra, strategy = 'avalanche') {
    const sorted = strategy === 'snowball'
      ? [...debts].sort((a, b) => a.totalRemaining - b.totalRemaining)
      : [...debts].sort((a, b) => b.interestRate - a.interestRate);

    const schedule = [];
    const remaining = sorted.map(d => ({ ...d, left: d.totalRemaining }));
    let freed = 0;

    for (let month = 1; month <= Math.min(36, Math.max(...debts.map(d => d.remainingMonths))); month++) {
      const monthData = { month, payments: [], totalPayment: 0, totalRemaining: 0 };
      let extraPool = extra + freed;

      remaining.forEach((debt, idx) => {
        if (debt.left <= 0) return;

        let payment = Math.min(debt.monthlyPayment, debt.left);

        // Extra to priority debt
        if (idx === remaining.findIndex(d => d.left > 0) && extraPool > 0) {
          const extraPmt = Math.min(extraPool, debt.left - payment);
          payment += extraPmt;
          extraPool -= extraPmt;
        }

        debt.left = Math.max(0, debt.left - payment);

        monthData.payments.push({
          name: debt.name,
          payment: Math.round(payment),
          remaining: Math.round(debt.left),
        });

        monthData.totalPayment += payment;
        monthData.totalRemaining += debt.left;

        if (debt.left <= 0 && month > 0) {
          freed += debt.monthlyPayment;
        }
      });

      schedule.push({
        ...monthData,
        totalPayment: Math.round(monthData.totalPayment),
        totalRemaining: Math.round(monthData.totalRemaining),
      });

      if (monthData.totalRemaining <= 0) break;
    }

    return schedule;
  }

  _calculateWeightedRate(debts) {
    const totalBalance = debts.reduce((s, d) => s + d.totalRemaining, 0);
    if (totalBalance === 0) return 0;
    const weighted = debts.reduce((s, d) => s + d.interestRate * (d.totalRemaining / totalBalance), 0);
    return Math.round(weighted * 100) / 100;
  }

  _estimateDebtFreeDate(debts, extra) {
    const totalBalance = debts.reduce((s, d) => s + d.totalRemaining, 0);
    const totalMonthly = debts.reduce((s, d) => s + d.monthlyPayment, 0) + extra;
    const months = totalMonthly > 0 ? Math.ceil(totalBalance / totalMonthly) : 999;
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return { date, months };
  }
}

module.exports = new DebtPayoffEngine();
