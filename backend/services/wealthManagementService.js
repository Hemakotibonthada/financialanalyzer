/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  WEALTH MANAGEMENT SERVICE - Comprehensive Wealth & Portfolio Analysis Engine
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

class WealthManagementService {
  constructor() {
    this.riskFreeRate = 6.5; // India 10Y GOI bond yield approx
    this.inflationRate = 5.5;
    this.benchmarks = {
      'Nifty 50': 12.5,
      'Sensex': 12.0,
      'Nifty Midcap': 15.0,
      'FD Rate': 7.0,
      'Gold': 8.5,
      'PPF Rate': 7.1
    };
  }

  /**
   * Get comprehensive wealth overview for a user
   */
  async getWealthOverview(userId) {
    try {
      const [assets, liabilities, transactions, investments, goals] = await Promise.allSettled([
        this._getAssets(userId),
        this._getLiabilities(userId),
        this._getRecentTransactions(userId, 365),
        this._getInvestments(userId),
        this._getGoals(userId)
      ]);

      const assetList = assets.status === 'fulfilled' ? assets.value : [];
      const liabilityList = liabilities.status === 'fulfilled' ? liabilities.value : [];
      const txnList = transactions.status === 'fulfilled' ? transactions.value : [];
      const investList = investments.status === 'fulfilled' ? investments.value : [];
      const goalList = goals.status === 'fulfilled' ? goals.value : [];

      const totalAssets = assetList.reduce((s, a) => s + (a.currentValue || 0), 0);
      const totalLiabilities = liabilityList.reduce((s, l) => s + (l.currentBalance || l.amount || 0), 0);
      const netWorth = totalAssets - totalLiabilities;

      // Calculate income and expenses from transactions
      const monthlyIncome = this._calculateMonthlyAverage(txnList.filter(t => t.type === 'income'));
      const monthlyExpenses = this._calculateMonthlyAverage(txnList.filter(t => t.type === 'expense'));
      const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

      // Emergency fund calculation
      const cashAssets = assetList.filter(a => a.category === 'cash' || a.isLiquid).reduce((s, a) => s + (a.currentValue || 0), 0);
      const emergencyFundMonths = monthlyExpenses > 0 ? cashAssets / monthlyExpenses : 0;

      // Liquidity ratio
      const liquidAssets = assetList.filter(a => a.isLiquid !== false).reduce((s, a) => s + (a.currentValue || 0), 0);
      const shortTermLiabilities = liabilityList.filter(l => (l.remainingTerm || 999) <= 12).reduce((s, l) => s + (l.currentBalance || 0), 0);
      const liquidityRatio = shortTermLiabilities > 0 ? liquidAssets / shortTermLiabilities : liquidAssets > 0 ? 10 : 0;

      // Diversification score
      const diversificationScore = this._calculateDiversificationScore(assetList);

      // Investment returns
      const yearlyReturn = this._calculatePortfolioReturn(investList, txnList);

      // Risk metrics
      const riskMetrics = this._calculateRiskMetrics(assetList, liabilityList, investList);

      // Wealth score (0-100)
      const wealthScore = this._calculateWealthScore({
        savingsRate, emergencyFundMonths, diversificationScore,
        debtToAsset: totalAssets > 0 ? totalLiabilities / totalAssets : 0,
        liquidityRatio, yearlyReturn
      });

      // Tax savings opportunities
      const taxSavings = this._estimateTaxSavings(investList, assetList);

      // Monthly change calculation
      const lastMonthNetWorth = await this._getHistoricalNetWorth(userId, 30);
      const monthlyChange = lastMonthNetWorth > 0 ? ((netWorth - lastMonthNetWorth) / lastMonthNetWorth) * 100 : 0;

      return {
        totalAssets,
        totalLiabilities,
        netWorth,
        monthlyChange,
        yearlyReturn,
        wealthScore,
        liquidityRatio,
        emergencyFundMonths,
        diversificationScore,
        savingsRate,
        taxSavings,
        monthlyIncome,
        monthlyExpenses,
        ...riskMetrics,
        assetCount: assetList.length,
        liabilityCount: liabilityList.length,
        goalCount: goalList.length
      };
    } catch (error) {
      logger.error('Wealth overview calculation error:', error);
      throw error;
    }
  }

  /**
   * Calculate portfolio diversification score
   */
  _calculateDiversificationScore(assets) {
    if (!assets || assets.length === 0) return 0;

    const totalValue = assets.reduce((s, a) => s + (a.currentValue || 0), 0);
    if (totalValue === 0) return 0;

    // Category breakdown
    const categories = {};
    assets.forEach(a => {
      const cat = a.category || 'other';
      categories[cat] = (categories[cat] || 0) + (a.currentValue || 0);
    });

    // Herfindahl-Hirschman Index (HHI) for concentration
    const categoryCount = Object.keys(categories).length;
    const hhi = Object.values(categories).reduce((sum, val) => {
      const share = val / totalValue;
      return sum + share * share;
    }, 0);

    // Perfect diversification HHI = 1/n where n = number of categories
    const perfectHHI = 1 / Math.max(categoryCount, 1);
    const maxHHI = 1; // Complete concentration

    // Normalize to 0-100 score (lower HHI = better diversification)
    const rawScore = ((maxHHI - hhi) / (maxHHI - perfectHHI)) * 100;

    // Bonus for having multiple asset classes
    const assetClassBonus = Math.min(categoryCount * 5, 25);

    // Penalty for missing key asset classes
    const keyClasses = ['stocks', 'bonds', 'realEstate', 'cash', 'mutualFunds'];
    const missingKeyClasses = keyClasses.filter(c => !categories[c]).length;
    const missingPenalty = missingKeyClasses * 5;

    return Math.max(0, Math.min(100, rawScore + assetClassBonus - missingPenalty));
  }

  /**
   * Calculate portfolio return (simplified XIRR approximation)
   */
  _calculatePortfolioReturn(investments, transactions) {
    if (!investments || investments.length === 0) return 0;

    let totalInvested = 0;
    let totalCurrent = 0;
    let weightedReturn = 0;

    investments.forEach(inv => {
      const invested = inv.purchasePrice || inv.investedAmount || 0;
      const current = inv.currentValue || inv.marketValue || 0;
      totalInvested += invested;
      totalCurrent += current;

      if (invested > 0) {
        const holdingDays = inv.purchaseDate
          ? Math.max(1, (Date.now() - new Date(inv.purchaseDate).getTime()) / (1000 * 60 * 60 * 24))
          : 365;
        const holdingYears = holdingDays / 365.25;
        const returnPct = holdingYears > 0 ? ((Math.pow(current / invested, 1 / holdingYears) - 1) * 100) : 0;
        weightedReturn += returnPct * invested;
      }
    });

    return totalInvested > 0 ? weightedReturn / totalInvested : 0;
  }

  /**
   * Calculate comprehensive risk metrics
   */
  _calculateRiskMetrics(assets, liabilities, investments) {
    const totalAssets = assets.reduce((s, a) => s + (a.currentValue || 0), 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + (l.currentBalance || 0), 0);

    // Portfolio volatility estimation based on asset class
    const volatilityByClass = {
      cash: 1, bonds: 5, mutualFunds: 15, stocks: 25, realEstate: 10,
      crypto: 60, commodities: 20, retirement: 8, insurance: 3,
      alternative: 30, business: 35, other: 15
    };

    let weightedVolatility = 0;
    if (totalAssets > 0) {
      assets.forEach(a => {
        const cat = a.category || 'other';
        const weight = (a.currentValue || 0) / totalAssets;
        weightedVolatility += (volatilityByClass[cat] || 15) * weight;
      });
    }

    // Concentration risk
    const maxAssetValue = Math.max(...assets.map(a => a.currentValue || 0), 0);
    const concentrationRisk = totalAssets > 0 ? (maxAssetValue / totalAssets) * 100 : 0;

    // Liquidity risk
    const liquidAssets = assets.filter(a => a.isLiquid !== false && !['realEstate', 'business', 'alternative'].includes(a.category))
      .reduce((s, a) => s + (a.currentValue || 0), 0);
    const liquidityRisk = totalAssets > 0 ? ((totalAssets - liquidAssets) / totalAssets) * 100 : 0;

    // Interest rate risk (exposure to rate-sensitive assets)
    const rateSensitiveAssets = assets.filter(a => ['bonds', 'realEstate'].includes(a.category))
      .reduce((s, a) => s + (a.currentValue || 0), 0);
    const rateSensitiveLiabilities = liabilities.filter(l => l.interestRate && !l.isFixed)
      .reduce((s, l) => s + (l.currentBalance || 0), 0);
    const interestRateRisk = Math.min(100, ((rateSensitiveAssets + rateSensitiveLiabilities) / Math.max(totalAssets, 1)) * 50);

    // Inflation risk
    const inflationHedgeAssets = assets.filter(a => ['stocks', 'realEstate', 'commodities', 'crypto'].includes(a.category))
      .reduce((s, a) => s + (a.currentValue || 0), 0);
    const inflationRisk = totalAssets > 0 ? Math.max(0, 100 - (inflationHedgeAssets / totalAssets) * 100) : 50;

    // Currency risk
    const foreignAssets = assets.filter(a => a.currency && a.currency !== 'INR')
      .reduce((s, a) => s + (a.currentValue || 0), 0);
    const currencyRisk = totalAssets > 0 ? (foreignAssets / totalAssets) * 100 : 0;

    // Overall risk score (weighted average)
    const overallRiskScore = (
      weightedVolatility * 0.25 +
      concentrationRisk * 0.20 +
      liquidityRisk * 0.15 +
      interestRateRisk * 0.15 +
      inflationRisk * 0.15 +
      currencyRisk * 0.10
    );

    return {
      volatility: Math.min(100, weightedVolatility),
      concentrationRisk: Math.min(100, concentrationRisk),
      liquidityRisk: Math.min(100, liquidityRisk),
      interestRateRisk: Math.min(100, interestRateRisk),
      inflationRisk: Math.min(100, inflationRisk),
      currencyRisk: Math.min(100, currencyRisk),
      overallRiskScore: Math.min(100, overallRiskScore)
    };
  }

  /**
   * Calculate overall wealth score (0-100)
   */
  _calculateWealthScore({ savingsRate, emergencyFundMonths, diversificationScore, debtToAsset, liquidityRatio, yearlyReturn }) {
    let score = 0;

    // Savings rate (0-20 points)
    if (savingsRate >= 30) score += 20;
    else if (savingsRate >= 20) score += 15;
    else if (savingsRate >= 10) score += 10;
    else if (savingsRate >= 5) score += 5;

    // Emergency fund (0-15 points)
    if (emergencyFundMonths >= 12) score += 15;
    else if (emergencyFundMonths >= 6) score += 12;
    else if (emergencyFundMonths >= 3) score += 8;
    else if (emergencyFundMonths >= 1) score += 4;

    // Diversification (0-20 points, maps from 0-100 score)
    score += (diversificationScore / 100) * 20;

    // Debt management (0-20 points)
    if (debtToAsset === 0) score += 20;
    else if (debtToAsset < 0.2) score += 16;
    else if (debtToAsset < 0.4) score += 12;
    else if (debtToAsset < 0.6) score += 8;
    else if (debtToAsset < 0.8) score += 4;

    // Liquidity (0-10 points)
    if (liquidityRatio >= 5) score += 10;
    else if (liquidityRatio >= 3) score += 8;
    else if (liquidityRatio >= 2) score += 6;
    else if (liquidityRatio >= 1) score += 4;

    // Investment returns (0-15 points)
    if (yearlyReturn >= 18) score += 15;
    else if (yearlyReturn >= 12) score += 12;
    else if (yearlyReturn >= 8) score += 9;
    else if (yearlyReturn >= 5) score += 6;
    else if (yearlyReturn >= 0) score += 3;

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Estimate potential tax savings
   */
  _estimateTaxSavings(investments, assets) {
    let potentialSavings = 0;

    // Section 80C limit check (₹1.5 lakh)
    const section80C = investments
      .filter(i => ['ELSS', 'PPF', 'NPS', 'LIC', 'FD_TAX_SAVER'].includes(i.type))
      .reduce((s, i) => s + (i.investedAmount || 0), 0);
    if (section80C < 150000) {
      potentialSavings += (150000 - section80C) * 0.3; // 30% tax bracket
    }

    // Section 80D health insurance
    const healthInsurance = assets
      .filter(a => a.category === 'insurance' && a.type === 'health')
      .reduce((s, a) => s + (a.premium || 0), 0);
    if (healthInsurance < 25000) {
      potentialSavings += (25000 - healthInsurance) * 0.3;
    }

    // NPS additional deduction (₹50,000)
    const npsInvestment = investments
      .filter(i => i.type === 'NPS')
      .reduce((s, i) => s + (i.investedAmount || 0), 0);
    if (npsInvestment < 50000) {
      potentialSavings += (50000 - npsInvestment) * 0.3;
    }

    // Home loan principal & interest deductions
    const homeLoan = assets.find(a => a.type === 'mortgage' || a.category === 'realEstate');
    if (!homeLoan) {
      potentialSavings += 50000; // Potential HRA savings
    }

    return Math.round(potentialSavings);
  }

  /**
   * Get wealth growth history
   */
  async getWealthHistory(userId, days = 365) {
    try {
      const NetWorthSnapshot = mongoose.model('NetWorthSnapshot');
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const snapshots = await NetWorthSnapshot.find({
        userId,
        date: { $gte: cutoff }
      }).sort({ date: 1 }).lean();

      return snapshots.map(s => ({
        date: s.date,
        netWorth: (s.totalAssets || 0) - (s.totalLiabilities || 0),
        totalAssets: s.totalAssets || 0,
        totalLiabilities: s.totalLiabilities || 0
      }));
    } catch (error) {
      logger.debug('Wealth history fetch error:', error.message);
      return [];
    }
  }

  /**
   * Generate wealth rebalancing recommendations
   */
  async getRebalancingRecommendations(userId, targetAllocation) {
    try {
      const assets = await this._getAssets(userId);
      const totalValue = assets.reduce((s, a) => s + (a.currentValue || 0), 0);
      if (totalValue === 0) return [];

      const defaultTargets = targetAllocation || {
        stocks: 40, bonds: 20, mutualFunds: 15, realEstate: 10,
        cash: 10, commodities: 5
      };

      const currentAllocation = {};
      assets.forEach(a => {
        const cat = a.category || 'other';
        currentAllocation[cat] = ((currentAllocation[cat] || 0) + (a.currentValue || 0));
      });

      const recommendations = [];
      Object.entries(defaultTargets).forEach(([category, targetPct]) => {
        const currentValue = currentAllocation[category] || 0;
        const currentPct = (currentValue / totalValue) * 100;
        const diff = targetPct - currentPct;
        const amountDiff = (diff / 100) * totalValue;

        if (Math.abs(diff) > 2) { // Only recommend if deviation > 2%
          recommendations.push({
            category,
            currentPct: currentPct.toFixed(1),
            targetPct,
            currentValue,
            targetValue: (targetPct / 100) * totalValue,
            action: diff > 0 ? 'increase' : 'decrease',
            amount: Math.abs(amountDiff),
            priority: Math.abs(diff) > 10 ? 'high' : Math.abs(diff) > 5 ? 'medium' : 'low'
          });
        }
      });

      return recommendations.sort((a, b) => b.amount - a.amount);
    } catch (error) {
      logger.error('Rebalancing recommendations error:', error);
      return [];
    }
  }

  /**
   * Calculate FIRE (Financial Independence) metrics
   */
  async calculateFIREMetrics(userId, retirementAge = 60) {
    try {
      const overview = await this.getWealthOverview(userId);
      const currentAge = 30; // Default, should come from user profile
      const yearsToRetirement = Math.max(0, retirementAge - currentAge);

      const annualExpenses = overview.monthlyExpenses * 12;
      const annualIncome = overview.monthlyIncome * 12;
      const annualSavings = annualIncome - annualExpenses;
      const savingsRate = annualIncome > 0 ? (annualSavings / annualIncome) : 0;

      // FIRE number (25x annual expenses - 4% rule)
      const fireNumber = annualExpenses * 25;

      // Lean FIRE (basic expenses only, estimated at 60% of current)
      const leanFireNumber = annualExpenses * 0.6 * 25;

      // Fat FIRE (lifestyle upgrade, 150% of current)
      const fatFireNumber = annualExpenses * 1.5 * 25;

      // Current net worth
      const currentNetWorth = overview.netWorth;

      // Years to FIRE (using compound growth)
      const expectedReturn = 0.12; // 12% expected return
      const realReturn = expectedReturn - (this.inflationRate / 100);
      let yearsToFIRE = 0;

      if (annualSavings > 0 && realReturn > 0) {
        // FV = PV * (1+r)^n + PMT * ((1+r)^n - 1) / r = fireTarget
        // Solving iteratively
        let futureValue = currentNetWorth;
        while (futureValue < fireNumber && yearsToFIRE < 100) {
          futureValue = (futureValue + annualSavings) * (1 + realReturn);
          yearsToFIRE++;
        }
      }

      // Safe withdrawal amount
      const safeWithdrawal = currentNetWorth * 0.04;

      // Coast FIRE age (age at which you can stop saving and still retire on time)
      let coastFireAge = currentAge;
      let coastValue = currentNetWorth;
      const targetAtRetirement = fireNumber / Math.pow(1 + this.inflationRate / 100, yearsToRetirement);
      while (coastValue < targetAtRetirement && coastFireAge < retirementAge) {
        coastValue *= (1 + realReturn);
        coastFireAge++;
      }

      return {
        fireNumber,
        leanFireNumber,
        fatFireNumber,
        currentNetWorth,
        progressPercent: fireNumber > 0 ? (currentNetWorth / fireNumber) * 100 : 0,
        yearsToFIRE: Math.min(yearsToFIRE, 99),
        fireAge: currentAge + yearsToFIRE,
        coastFireAge,
        safeWithdrawal,
        annualExpenses,
        annualIncome,
        savingsRate: savingsRate * 100,
        monthlyInvestmentNeeded: this._calculateMonthlyInvestmentForFIRE(fireNumber, currentNetWorth, expectedReturn, yearsToRetirement)
      };
    } catch (error) {
      logger.error('FIRE calculation error:', error);
      throw error;
    }
  }

  _calculateMonthlyInvestmentForFIRE(target, current, rate, years) {
    if (years <= 0 || rate <= 0) return 0;
    const monthlyRate = rate / 12;
    const months = years * 12;
    const fvCurrent = current * Math.pow(1 + monthlyRate, months);
    const remaining = target - fvCurrent;
    if (remaining <= 0) return 0;
    return remaining / ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  }

  // Helper methods
  async _getAssets(userId) {
    try {
      const NetWorthSnapshot = mongoose.model('NetWorthSnapshot');
      const latest = await NetWorthSnapshot.findOne({ userId }).sort({ date: -1 }).lean();
      return latest?.assets || [];
    } catch { return []; }
  }

  async _getLiabilities(userId) {
    try {
      const NetWorthSnapshot = mongoose.model('NetWorthSnapshot');
      const latest = await NetWorthSnapshot.findOne({ userId }).sort({ date: -1 }).lean();
      return latest?.liabilities || [];
    } catch { return []; }
  }

  async _getRecentTransactions(userId, days) {
    try {
      const Transaction = mongoose.model('Transaction');
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      return await Transaction.find({ userId, date: { $gte: cutoff } }).lean();
    } catch { return []; }
  }

  async _getInvestments(userId) {
    try {
      const Investment = mongoose.model('Investment');
      return await Investment.find({ userId }).lean();
    } catch { return []; }
  }

  async _getGoals(userId) {
    try {
      const FinancialGoal = mongoose.model('FinancialGoal');
      return await FinancialGoal.find({ userId }).lean();
    } catch { return []; }
  }

  _calculateMonthlyAverage(transactions) {
    if (!transactions || transactions.length === 0) return 0;
    const total = transactions.reduce((s, t) => s + (t.amount || 0), 0);
    const dates = transactions.map(t => new Date(t.date).getTime());
    const spanMs = Math.max(...dates) - Math.min(...dates);
    const spanMonths = Math.max(1, spanMs / (30 * 24 * 60 * 60 * 1000));
    return total / spanMonths;
  }

  async _getHistoricalNetWorth(userId, daysAgo) {
    try {
      const NetWorthSnapshot = mongoose.model('NetWorthSnapshot');
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - daysAgo);
      const snapshot = await NetWorthSnapshot.findOne({
        userId,
        date: { $lte: targetDate }
      }).sort({ date: -1 }).lean();
      return snapshot ? (snapshot.totalAssets || 0) - (snapshot.totalLiabilities || 0) : 0;
    } catch { return 0; }
  }
}

module.exports = new WealthManagementService();
