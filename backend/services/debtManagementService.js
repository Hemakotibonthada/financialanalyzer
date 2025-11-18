const Debt = require('../models/Debt');
const EMI = require('../models/EMI');
const moment = require('moment');

/**
 * Debt Management Calculator Service
 * Provides debt payoff strategies using snowball and avalanche methods
 */
class DebtManagementService {
  /**
   * Get comprehensive debt analysis and payoff strategies
   */
  async analyzeDebts(userId, extraPayment = 0) {
    try {
      // Gather all debts
      const [debts, emis] = await Promise.all([
        Debt.find({ userId: userId }),
        EMI.find({ user: userId })
      ]);

      // Separate debts into loans and credit cards
      const loans = debts.filter(d => d.debtType !== 'credit_card');
      const creditCards = debts.filter(d => d.debtType === 'credit_card');

      // Consolidate debts
      const allDebts = this.consolidateDebts(loans, creditCards, emis);

      if (allDebts.length === 0) {
        return {
          message: 'No debts found',
          totalDebt: 0,
          strategies: []
        };
      }

      // Calculate current situation
      const currentSituation = this.calculateCurrentSituation(allDebts);

      // Generate payoff strategies
      const strategies = {
        current: this.calculateCurrentPayoffPlan(allDebts),
        snowball: this.calculateSnowballMethod(allDebts, extraPayment),
        avalanche: this.calculateAvalancheMethod(allDebts, extraPayment),
        custom: this.calculateCustomMethod(allDebts, extraPayment)
      };

      // Compare strategies
      const comparison = this.compareStrategies(strategies);

      // Generate recommendations
      const recommendations = this.generateDebtRecommendations(
        allDebts,
        strategies,
        currentSituation
      );

      // Calculate debt-free date for each strategy
      const debtFreeDates = {
        current: this.calculateDebtFreeDate(strategies.current),
        snowball: this.calculateDebtFreeDate(strategies.snowball),
        avalanche: this.calculateDebtFreeDate(strategies.avalanche),
        custom: this.calculateDebtFreeDate(strategies.custom)
      };

      return {
        currentSituation,
        allDebts: allDebts.map(d => ({
          id: d.id,
          name: d.name,
          type: d.type,
          balance: d.balance,
          interestRate: d.interestRate,
          minimumPayment: d.minimumPayment,
          remainingMonths: d.remainingMonths
        })),
        strategies,
        debtFreeDates,
        comparison,
        recommendations,
        projections: this.generateDebtProjections(allDebts, strategies.avalanche)
      };
    } catch (error) {
      console.error('Error analyzing debts:', error);
      throw error;
    }
  }

  /**
   * Consolidate all debts into a unified format
   */
  consolidateDebts(loans, creditCards, emis) {
    const debts = [];

    // Add loans
    loans.forEach(loan => {
      const balance = loan.loanDetails?.currentBalance || 0;
      const interestRate = loan.loanDetails?.interestRate || 0;
      const tenure = loan.loanDetails?.remainingTenure || loan.loanDetails?.tenure || 0;
      
      const monthlyPayment = this.calculateMonthlyPayment(
        balance,
        interestRate,
        tenure
      );

      debts.push({
        id: `loan-${loan._id}`,
        name: loan.creditor?.name || loan.debtType || 'Personal Loan',
        type: 'loan',
        balance: balance,
        interestRate: interestRate,
        minimumPayment: monthlyPayment,
        remainingMonths: tenure,
        originalAmount: loan.loanDetails?.principalAmount || balance,
        startDate: loan.loanDetails?.startDate || loan.createdAt
      });
    });

    // Add credit cards
    creditCards.forEach(card => {
      const balance = card.loanDetails?.currentBalance || 0;
      const interestRate = card.loanDetails?.interestRate || 36; // Default 36% APR for credit cards
      const minPayment = balance * 0.05; // 5% minimum payment
      const remainingMonths = this.estimateRemainingMonths(
        balance,
        minPayment,
        interestRate
      );

      const creditLimit = card.collateral?.value || card.loanDetails?.principalAmount || balance;

      debts.push({
        id: `card-${card._id}`,
        name: card.creditor?.name || 'Credit Card',
        type: 'credit_card',
        balance: balance,
        interestRate: interestRate,
        minimumPayment: minPayment,
        remainingMonths: remainingMonths,
        creditLimit: creditLimit,
        utilization: creditLimit > 0 ? (balance / creditLimit) * 100 : 0
      });
    });

    return debts.filter(d => d.balance > 0);
  }

  /**
   * Calculate current situation
   */
  calculateCurrentSituation(debts) {
    const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
    const totalMinimumPayment = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
    const weightedInterestRate = debts.reduce((sum, d) => 
      sum + (d.interestRate * (d.balance / totalDebt)), 0
    );
    const totalInterestToPay = debts.reduce((sum, d) => {
      const totalPayments = d.minimumPayment * d.remainingMonths;
      return sum + (totalPayments - d.balance);
    }, 0);

    return {
      totalDebt: parseFloat(totalDebt.toFixed(2)),
      debtCount: debts.length,
      totalMinimumPayment: parseFloat(totalMinimumPayment.toFixed(2)),
      weightedInterestRate: parseFloat(weightedInterestRate.toFixed(2)),
      estimatedPayoffMonths: this.estimateOverallPayoffMonths(debts),
      totalInterestToPay: parseFloat(totalInterestToPay.toFixed(2)),
      highestInterestDebt: debts.reduce((max, d) => 
        d.interestRate > max.interestRate ? d : max
      ),
      largestDebt: debts.reduce((max, d) => 
        d.balance > max.balance ? d : max
      ),
      smallestDebt: debts.reduce((min, d) => 
        d.balance < min.balance ? d : min
      )
    };
  }

  /**
   * Calculate current payoff plan (minimum payments only)
   */
  calculateCurrentPayoffPlan(debts) {
    const plan = {
      method: 'current',
      description: 'Minimum Payments Only',
      debts: [],
      totalInterestPaid: 0,
      totalPaid: 0,
      monthsToPayoff: 0
    };

    debts.forEach(debt => {
      const schedule = this.generatePaymentSchedule(
        debt.balance,
        debt.interestRate,
        debt.minimumPayment,
        0
      );

      plan.debts.push({
        name: debt.name,
        balance: debt.balance,
        payment: debt.minimumPayment,
        interestPaid: schedule.totalInterest,
        monthsToPayoff: schedule.months,
        payoffDate: moment().add(schedule.months, 'months').format('MMM YYYY')
      });

      plan.totalInterestPaid += schedule.totalInterest;
      plan.totalPaid += schedule.totalPaid;
      plan.monthsToPayoff = Math.max(plan.monthsToPayoff, schedule.months);
    });

    plan.totalInterestPaid = parseFloat(plan.totalInterestPaid.toFixed(2));
    plan.totalPaid = parseFloat(plan.totalPaid.toFixed(2));

    return plan;
  }

  /**
   * Calculate Snowball Method (pay smallest debt first)
   */
  calculateSnowballMethod(debts, extraPayment = 0) {
    // Sort by balance (smallest first)
    const sortedDebts = [...debts].sort((a, b) => a.balance - b.balance);
    
    return this.calculateDebtPayoffStrategy(
      sortedDebts,
      extraPayment,
      'snowball',
      'Debt Snowball Method - Pay smallest debt first for psychological wins'
    );
  }

  /**
   * Calculate Avalanche Method (pay highest interest rate first)
   */
  calculateAvalancheMethod(debts, extraPayment = 0) {
    // Sort by interest rate (highest first)
    const sortedDebts = [...debts].sort((a, b) => b.interestRate - a.interestRate);
    
    return this.calculateDebtPayoffStrategy(
      sortedDebts,
      extraPayment,
      'avalanche',
      'Debt Avalanche Method - Pay highest interest first to save money'
    );
  }

  /**
   * Calculate Custom Method (balanced approach)
   */
  calculateCustomMethod(debts, extraPayment = 0) {
    // Sort by a score combining balance and interest rate
    const sortedDebts = [...debts].sort((a, b) => {
      const scoreA = (a.interestRate / 100) * Math.log(a.balance);
      const scoreB = (b.interestRate / 100) * Math.log(b.balance);
      return scoreB - scoreA;
    });
    
    return this.calculateDebtPayoffStrategy(
      sortedDebts,
      extraPayment,
      'custom',
      'Custom Method - Balanced approach considering both balance and interest'
    );
  }

  /**
   * Calculate debt payoff strategy
   */
  calculateDebtPayoffStrategy(sortedDebts, extraPayment, method, description) {
    const plan = {
      method,
      description,
      extraPayment,
      debts: [],
      totalInterestPaid: 0,
      totalPaid: 0,
      monthsToPayoff: 0,
      timeline: []
    };

    let availableExtraPayment = extraPayment;
    let currentMonth = 0;
    const activeDebts = sortedDebts.map((d, index) => ({
      ...d,
      index,
      remaining: d.balance,
      paid: 0,
      interestPaid: 0,
      completed: false
    }));

    // Simulate month-by-month payments
    while (activeDebts.some(d => !d.completed)) {
      currentMonth++;
      let monthlySnapshot = {
        month: currentMonth,
        date: moment().add(currentMonth, 'months').format('MMM YYYY'),
        payments: [],
        remainingDebt: 0
      };

      // Pay minimum on all debts
      activeDebts.forEach(debt => {
        if (!debt.completed) {
          const interest = (debt.remaining * (debt.interestRate / 100)) / 12;
          const principal = Math.min(debt.minimumPayment - interest, debt.remaining);
          
          debt.remaining -= principal;
          debt.paid += debt.minimumPayment;
          debt.interestPaid += interest;

          if (debt.remaining <= 0) {
            debt.completed = true;
            debt.remaining = 0;
            // Add this debt's minimum payment to extra payment pool
            availableExtraPayment += debt.minimumPayment;
          }

          monthlySnapshot.payments.push({
            name: debt.name,
            payment: debt.minimumPayment,
            principal,
            interest,
            remaining: debt.remaining
          });
        }
      });

      // Apply extra payment to first active debt (highest priority)
      if (availableExtraPayment > 0) {
        const targetDebt = activeDebts.find(d => !d.completed);
        if (targetDebt) {
          const extraPrincipal = Math.min(availableExtraPayment, targetDebt.remaining);
          targetDebt.remaining -= extraPrincipal;
          targetDebt.paid += extraPrincipal;

          if (targetDebt.remaining <= 0) {
            targetDebt.completed = true;
            targetDebt.remaining = 0;
            availableExtraPayment += targetDebt.minimumPayment;
          }

          // Update snapshot
          const paymentIndex = monthlySnapshot.payments.findIndex(
            p => p.name === targetDebt.name
          );
          if (paymentIndex >= 0) {
            monthlySnapshot.payments[paymentIndex].payment += extraPrincipal;
            monthlySnapshot.payments[paymentIndex].principal += extraPrincipal;
            monthlySnapshot.payments[paymentIndex].remaining = targetDebt.remaining;
          }
        }
      }

      monthlySnapshot.remainingDebt = activeDebts.reduce((sum, d) => sum + d.remaining, 0);
      plan.timeline.push(monthlySnapshot);

      // Safety limit: 30 years maximum
      if (currentMonth > 360) break;
    }

    // Compile final plan
    activeDebts.forEach(debt => {
      plan.debts.push({
        name: debt.name,
        originalBalance: debt.balance,
        minimumPayment: debt.minimumPayment,
        totalPaid: debt.paid,
        interestPaid: debt.interestPaid,
        monthsToPayoff: plan.timeline.findIndex(m => 
          m.payments.find(p => p.name === debt.name && p.remaining === 0)
        ) + 1,
        payoffDate: moment()
          .add(
            plan.timeline.findIndex(m => 
              m.payments.find(p => p.name === debt.name && p.remaining === 0)
            ) + 1,
            'months'
          )
          .format('MMM YYYY')
      });

      plan.totalInterestPaid += debt.interestPaid;
      plan.totalPaid += debt.paid;
    });

    plan.monthsToPayoff = currentMonth;
    plan.totalInterestPaid = parseFloat(plan.totalInterestPaid.toFixed(2));
    plan.totalPaid = parseFloat(plan.totalPaid.toFixed(2));

    return plan;
  }

  /**
   * Generate payment schedule
   */
  generatePaymentSchedule(principal, interestRate, monthlyPayment, extraPayment = 0) {
    let balance = principal;
    let totalInterest = 0;
    let months = 0;
    const monthlyRate = interestRate / 12 / 100;

    while (balance > 0 && months < 360) {
      const interest = balance * monthlyRate;
      const principalPayment = Math.min(
        monthlyPayment + extraPayment - interest,
        balance
      );
      
      balance -= principalPayment;
      totalInterest += interest;
      months++;

      if (principalPayment <= 0) break; // Payment doesn't cover interest
    }

    return {
      months,
      totalInterest: parseFloat(totalInterest.toFixed(2)),
      totalPaid: parseFloat((principal + totalInterest).toFixed(2))
    };
  }

  /**
   * Compare strategies
   */
  compareStrategies(strategies) {
    const comparison = [];

    Object.keys(strategies).forEach(key => {
      const strategy = strategies[key];
      comparison.push({
        method: strategy.method,
        description: strategy.description,
        monthsToPayoff: strategy.monthsToPayoff,
        totalInterestPaid: strategy.totalInterestPaid,
        totalPaid: strategy.totalPaid,
        monthlySavings: strategy.extraPayment || 0
      });
    });

    // Find best strategy (lowest interest paid)
    const bestStrategy = comparison.reduce((best, current) => 
      current.totalInterestPaid < best.totalInterestPaid ? current : best
    );

    return {
      strategies: comparison,
      recommended: bestStrategy.method,
      potentialSavings: comparison[0].totalInterestPaid - bestStrategy.totalInterestPaid
    };
  }

  /**
   * Generate debt recommendations
   */
  generateDebtRecommendations(debts, strategies, currentSituation) {
    const recommendations = [];

    // High interest debt recommendation
    const highInterestDebts = debts.filter(d => d.interestRate > 15);
    if (highInterestDebts.length > 0) {
      recommendations.push({
        priority: 'high',
        title: 'Pay Off High-Interest Debt First',
        message: `You have ${highInterestDebts.length} debt(s) with interest rates above 15%`,
        action: 'Focus extra payments on these debts using the Avalanche method',
        potentialSavings: strategies.current.totalInterestPaid - strategies.avalanche.totalInterestPaid
      });
    }

    // Debt consolidation recommendation
    if (debts.length > 3 && currentSituation.weightedInterestRate > 12) {
      recommendations.push({
        priority: 'high',
        title: 'Consider Debt Consolidation',
        message: `Consolidating ${debts.length} debts could simplify payments and reduce interest`,
        action: 'Look for personal loans with interest rates below 12%',
        potentialSavings: currentSituation.totalInterestToPay * 0.3
      });
    }

    // Extra payment recommendation
    if (strategies.snowball.extraPayment === 0) {
      const suggestedExtra = currentSituation.totalMinimumPayment * 0.1;
      recommendations.push({
        priority: 'medium',
        title: 'Add Extra Payments',
        message: `Adding just ₹${suggestedExtra.toFixed(0)} extra per month can save significant interest`,
        action: 'Try to allocate 10% more towards debt payments',
        potentialSavings: suggestedExtra * 12 * 2
      });
    }

    // Credit card utilization recommendation
    const creditCardDebts = debts.filter(d => d.type === 'credit_card');
    const highUtilization = creditCardDebts.filter(d => d.utilization > 50);
    if (highUtilization.length > 0) {
      recommendations.push({
        priority: 'high',
        title: 'Reduce Credit Card Utilization',
        message: `${highUtilization.length} credit card(s) have utilization above 50%`,
        action: 'Pay down to below 30% utilization to improve credit score',
        impact: 'Can improve credit score by 50-100 points'
      });
    }

    // Emergency fund vs debt recommendation
    if (currentSituation.totalDebt > 100000) {
      recommendations.push({
        priority: 'medium',
        title: 'Balance Debt Payoff with Emergency Fund',
        message: 'While paying off debt, maintain a small emergency fund',
        action: 'Keep at least ₹25,000 in emergency savings while focusing on debt',
        reason: 'Prevents new debt from unexpected expenses'
      });
    }

    return recommendations;
  }

  /**
   * Calculate debt-free date
   */
  calculateDebtFreeDate(strategy) {
    return {
      months: strategy.monthsToPayoff,
      date: moment().add(strategy.monthsToPayoff, 'months').format('MMMM DD, YYYY'),
      years: parseFloat((strategy.monthsToPayoff / 12).toFixed(1))
    };
  }

  /**
   * Generate debt projections
   */
  generateDebtProjections(debts, strategy) {
    const projections = [];
    const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);

    // Generate quarterly projections
    for (let month = 0; month <= strategy.monthsToPayoff; month += 3) {
      const snapshot = strategy.timeline[month] || strategy.timeline[strategy.timeline.length - 1];
      
      projections.push({
        month,
        date: moment().add(month, 'months').format('MMM YYYY'),
        remainingDebt: snapshot.remainingDebt,
        percentComplete: ((totalDebt - snapshot.remainingDebt) / totalDebt * 100).toFixed(1),
        interestPaidToDate: strategy.timeline
          .slice(0, month + 1)
          .reduce((sum, m) => sum + m.payments.reduce((s, p) => s + p.interest, 0), 0)
      });
    }

    return projections;
  }

  /**
   * Helper: Calculate monthly payment
   */
  calculateMonthlyPayment(principal, annualRate, months) {
    const monthlyRate = annualRate / 12 / 100;
    if (monthlyRate === 0) return principal / months;
    
    return principal * 
      (monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1);
  }

  /**
   * Helper: Estimate remaining months
   */
  estimateRemainingMonths(balance, monthlyPayment, interestRate) {
    if (monthlyPayment <= 0 || balance <= 0) return 0;
    
    const monthlyRate = interestRate / 12 / 100;
    if (monthlyRate === 0) return Math.ceil(balance / monthlyPayment);

    // Prevent infinite loop for payments less than interest
    if (monthlyPayment <= balance * monthlyRate) return 360;

    const months = Math.log(monthlyPayment / (monthlyPayment - balance * monthlyRate)) /
                   Math.log(1 + monthlyRate);
    
    return Math.ceil(months);
  }

  /**
   * Helper: Estimate overall payoff months
   */
  estimateOverallPayoffMonths(debts) {
    return Math.max(...debts.map(d => d.remainingMonths));
  }

  /**
   * Calculate debt payoff comparison for different extra payment amounts
   */
  async calculatePayoffComparison(userId, extraPayments = [0, 500, 1000, 2000]) {
    try {
      const [debts, emis] = await Promise.all([
        Debt.find({ userId: userId }),
        EMI.find({ user: userId })
      ]);

      // Separate debts into loans and credit cards
      const loans = debts.filter(d => d.debtType !== 'credit_card');
      const creditCards = debts.filter(d => d.debtType === 'credit_card');

      const allDebts = this.consolidateDebts(loans, creditCards, emis);
      const comparison = [];

      for (const extra of extraPayments) {
        const avalanche = this.calculateAvalancheMethod(allDebts, extra);
        const snowball = this.calculateSnowballMethod(allDebts, extra);

        comparison.push({
          extraPayment: extra,
          avalanche: {
            months: avalanche.monthsToPayoff,
            totalInterest: avalanche.totalInterestPaid,
            totalPaid: avalanche.totalPaid
          },
          snowball: {
            months: snowball.monthsToPayoff,
            totalInterest: snowball.totalInterestPaid,
            totalPaid: snowball.totalPaid
          },
          savingsVsMinimum: {
            avalanche: 0, // Will calculate against base case
            snowball: 0
          }
        });
      }

      // Calculate savings vs minimum payments
      const baseCase = comparison[0];
      comparison.forEach(c => {
        c.savingsVsMinimum.avalanche = 
          parseFloat((baseCase.avalanche.totalInterest - c.avalanche.totalInterest).toFixed(2));
        c.savingsVsMinimum.snowball = 
          parseFloat((baseCase.snowball.totalInterest - c.snowball.totalInterest).toFixed(2));
      });

      return comparison;
    } catch (error) {
      console.error('Error calculating payoff comparison:', error);
      throw error;
    }
  }
}

module.exports = new DebtManagementService();
