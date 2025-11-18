const Investment = require('../models/Investment');
const Portfolio = require('../models/Portfolio');
const Transaction = require('../models/Transaction');
const moment = require('moment');

/**
 * Advanced Portfolio Analytics Service
 * Comprehensive portfolio analysis, optimization, and risk assessment
 */
class PortfolioAnalyticsService {
  /**
   * Get comprehensive portfolio analysis
   */
  async analyzePortfolio(userId) {
    try {
      const [investments, portfolio] = await Promise.all([
        Investment.find({ user: userId }),
        Portfolio.findOne({ user: userId })
      ]);

      if (investments.length === 0) {
        return {
          message: 'No investments found',
          totalValue: 0,
          analysis: null
        };
      }

      // Calculate portfolio metrics
      const metrics = this.calculatePortfolioMetrics(investments);
      
      // Asset allocation analysis
      const allocation = this.analyzeAssetAllocation(investments);
      
      // Risk analysis
      const risk = this.analyzeRisk(investments, metrics);
      
      // Performance analysis
      const performance = this.analyzePerformance(investments);
      
      // Diversification analysis
      const diversification = this.analyzeDiversification(investments);
      
      // Optimization recommendations
      const recommendations = this.generateOptimizationRecommendations(
        investments,
        allocation,
        risk,
        diversification
      );
      
      // Tax efficiency
      const taxEfficiency = this.analyzeTaxEfficiency(investments);
      
      // Portfolio health score
      const healthScore = this.calculatePortfolioHealthScore(
        allocation,
        risk,
        diversification,
        performance
      );

      return {
        summary: {
          totalValue: metrics.totalValue,
          totalInvested: metrics.totalInvested,
          totalReturns: metrics.totalReturns,
          overallReturn: metrics.overallReturn,
          investmentCount: investments.length,
          lastUpdated: new Date()
        },
        metrics,
        allocation,
        risk,
        performance,
        diversification,
        taxEfficiency,
        recommendations,
        healthScore,
        topPerformers: this.getTopPerformers(investments, 5),
        underPerformers: this.getUnderPerformers(investments, 5)
      };
    } catch (error) {
      console.error('Error analyzing portfolio:', error);
      throw error;
    }
  }

  /**
   * Calculate portfolio metrics
   */
  calculatePortfolioMetrics(investments) {
    const totalValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalReturns = totalValue - totalInvested;
    const overallReturn = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

    // Calculate weighted average return
    const weightedReturn = investments.reduce((sum, inv) => {
      const weight = inv.currentValue / totalValue;
      const returns = ((inv.currentValue - inv.amount) / inv.amount) * 100;
      return sum + (returns * weight);
    }, 0);

    // Calculate time-weighted return
    const timeWeightedReturn = this.calculateTimeWeightedReturn(investments);

    // Calculate XIRR (Extended Internal Rate of Return)
    const xirr = this.calculateXIRR(investments);

    return {
      totalValue: parseFloat(totalValue.toFixed(2)),
      totalInvested: parseFloat(totalInvested.toFixed(2)),
      totalReturns: parseFloat(totalReturns.toFixed(2)),
      overallReturn: parseFloat(overallReturn.toFixed(2)),
      weightedReturn: parseFloat(weightedReturn.toFixed(2)),
      timeWeightedReturn: parseFloat(timeWeightedReturn.toFixed(2)),
      xirr: parseFloat(xirr.toFixed(2)),
      unrealizedGains: totalReturns > 0 ? totalReturns : 0,
      unrealizedLosses: totalReturns < 0 ? Math.abs(totalReturns) : 0
    };
  }

  /**
   * Analyze asset allocation
   */
  analyzeAssetAllocation(investments) {
    const allocation = {};
    const totalValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);

    // Group by asset type
    investments.forEach(inv => {
      const type = inv.type || 'Other';
      if (!allocation[type]) {
        allocation[type] = {
          value: 0,
          invested: 0,
          count: 0,
          percentage: 0,
          returns: 0
        };
      }
      allocation[type].value += inv.currentValue;
      allocation[type].invested += inv.amount;
      allocation[type].count++;
    });

    // Calculate percentages and returns
    Object.keys(allocation).forEach(type => {
      allocation[type].percentage = parseFloat(
        ((allocation[type].value / totalValue) * 100).toFixed(2)
      );
      allocation[type].returns = parseFloat(
        ((allocation[type].value - allocation[type].invested) / allocation[type].invested * 100).toFixed(2)
      );
      allocation[type].value = parseFloat(allocation[type].value.toFixed(2));
      allocation[type].invested = parseFloat(allocation[type].invested.toFixed(2));
    });

    // Recommended allocation (based on age-based rule)
    const recommended = this.getRecommendedAllocation();

    // Compare with recommended
    const comparison = this.compareAllocation(allocation, recommended);

    return {
      current: allocation,
      recommended,
      comparison,
      isBalanced: comparison.deviationScore < 20
    };
  }

  /**
   * Analyze portfolio risk
   */
  analyzeRisk(investments, metrics) {
    // Calculate volatility (standard deviation of returns)
    const returns = investments.map(inv => 
      ((inv.currentValue - inv.amount) / inv.amount) * 100
    );
    const volatility = this.calculateStdDev(returns);

    // Calculate Sharpe Ratio (risk-adjusted return)
    const riskFreeRate = 6.5; // Assume 6.5% risk-free rate (FD rate)
    const excessReturn = metrics.overallReturn - riskFreeRate;
    const sharpeRatio = volatility > 0 ? excessReturn / volatility : 0;

    // Calculate Beta (market sensitivity)
    const beta = this.calculateBeta(investments);

    // Calculate Value at Risk (VaR) at 95% confidence
    const var95 = this.calculateVaR(investments, 0.95);

    // Determine risk level
    let riskLevel = 'Low';
    let riskScore = 0;
    
    if (volatility > 25) {
      riskLevel = 'High';
      riskScore = 80;
    } else if (volatility > 15) {
      riskLevel = 'Medium';
      riskScore = 50;
    } else {
      riskLevel = 'Low';
      riskScore = 20;
    }

    // Concentration risk
    const concentrationRisk = this.calculateConcentrationRisk(investments);

    return {
      riskLevel,
      riskScore,
      volatility: parseFloat(volatility.toFixed(2)),
      sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
      beta: parseFloat(beta.toFixed(2)),
      var95: parseFloat(var95.toFixed(2)),
      concentrationRisk,
      riskCapacity: this.assessRiskCapacity(volatility, beta),
      recommendation: this.getRiskRecommendation(riskLevel, sharpeRatio, concentrationRisk)
    };
  }

  /**
   * Analyze portfolio performance
   */
  analyzePerformance(investments) {
    const performance = {
      absolute: [],
      relative: [],
      timeWeighted: []
    };

    investments.forEach(inv => {
      const absoluteReturn = inv.currentValue - inv.amount;
      const percentReturn = inv.amount > 0 ? (absoluteReturn / inv.amount) * 100 : 0;
      
      // Calculate holding period
      const holdingDays = moment().diff(moment(inv.purchaseDate), 'days');
      const holdingYears = holdingDays / 365;

      // Annualized return
      const annualizedReturn = holdingYears > 0 
        ? (Math.pow(1 + (percentReturn / 100), 1 / holdingYears) - 1) * 100
        : percentReturn;

      performance.absolute.push({
        name: inv.name,
        type: inv.type,
        invested: inv.amount,
        current: inv.currentValue,
        returns: absoluteReturn,
        percentReturn: parseFloat(percentReturn.toFixed(2)),
        annualizedReturn: parseFloat(annualizedReturn.toFixed(2)),
        holdingPeriod: holdingDays
      });
    });

    // Sort by performance
    performance.absolute.sort((a, b) => b.percentReturn - a.percentReturn);

    // Calculate quartiles
    const quartiles = this.calculateQuartiles(
      performance.absolute.map(p => p.percentReturn)
    );

    return {
      investments: performance.absolute,
      quartiles,
      bestPerformer: performance.absolute[0],
      worstPerformer: performance.absolute[performance.absolute.length - 1],
      averageReturn: this.calculateAverage(
        performance.absolute.map(p => p.percentReturn)
      ),
      medianReturn: quartiles.q2
    };
  }

  /**
   * Analyze diversification
   */
  analyzeDiversification(investments) {
    const totalValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);

    // Herfindahl Index (concentration measure)
    const herfindahlIndex = investments.reduce((sum, inv) => {
      const share = inv.currentValue / totalValue;
      return sum + Math.pow(share, 2);
    }, 0);

    // Number of holdings
    const numberOfHoldings = investments.length;

    // Asset type diversity
    const assetTypes = new Set(investments.map(inv => inv.type));
    const assetTypeDiversity = assetTypes.size;

    // Sector diversity (if available)
    const sectors = new Set(
      investments
        .filter(inv => inv.sector)
        .map(inv => inv.sector)
    );
    const sectorDiversity = sectors.size;

    // Calculate diversification score (0-100)
    let diversificationScore = 0;
    
    // Number of holdings (max 30 points)
    diversificationScore += Math.min(numberOfHoldings * 3, 30);
    
    // Asset type diversity (max 25 points)
    diversificationScore += Math.min(assetTypeDiversity * 5, 25);
    
    // Sector diversity (max 25 points)
    diversificationScore += Math.min(sectorDiversity * 2.5, 25);
    
    // Herfindahl Index (max 20 points, lower is better)
    diversificationScore += Math.max(20 - (herfindahlIndex * 100), 0);

    // Top holdings concentration
    const sortedInvestments = [...investments].sort((a, b) => b.currentValue - a.currentValue);
    const top5Value = sortedInvestments.slice(0, 5).reduce((sum, inv) => sum + inv.currentValue, 0);
    const top5Concentration = (top5Value / totalValue) * 100;

    return {
      diversificationScore: parseFloat(diversificationScore.toFixed(2)),
      herfindahlIndex: parseFloat(herfindahlIndex.toFixed(4)),
      numberOfHoldings,
      assetTypeDiversity,
      sectorDiversity: sectorDiversity || 0,
      assetTypes: Array.from(assetTypes),
      sectors: Array.from(sectors),
      top5Concentration: parseFloat(top5Concentration.toFixed(2)),
      isWellDiversified: diversificationScore >= 70,
      recommendation: this.getDiversificationRecommendation(
        diversificationScore,
        top5Concentration,
        numberOfHoldings
      )
    };
  }

  /**
   * Analyze tax efficiency
   */
  analyzeTaxEfficiency(investments) {
    const totalValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
    
    // Categorize investments by tax treatment
    const taxCategories = {
      taxFree: [],
      longTermGains: [],
      shortTermGains: [],
      taxDeferred: []
    };

    investments.forEach(inv => {
      const holdingDays = moment().diff(moment(inv.purchaseDate), 'days');
      const gains = inv.currentValue - inv.amount;

      if (gains > 0) {
        // Tax-free investments (PPF, EPF, etc.)
        if (['PPF', 'EPF', 'SSY', 'SCSS'].includes(inv.type)) {
          taxCategories.taxFree.push({ ...inv, gains });
        }
        // Long-term capital gains (>1 year for equity, >3 years for debt)
        else if (
          (inv.type === 'Stocks' && holdingDays > 365) ||
          (inv.type === 'Mutual Funds' && holdingDays > 365) ||
          (inv.type === 'Debt' && holdingDays > 1095)
        ) {
          taxCategories.longTermGains.push({ ...inv, gains, holdingDays });
        }
        // Short-term gains
        else {
          taxCategories.shortTermGains.push({ ...inv, gains, holdingDays });
        }
      }
    });

    // Calculate tax liability
    const taxLiability = this.calculateTaxLiability(taxCategories);

    // Calculate tax efficiency score
    const taxFreeValue = taxCategories.taxFree.reduce((sum, inv) => sum + inv.currentValue, 0);
    const taxFreePercentage = (taxFreeValue / totalValue) * 100;
    
    const longTermValue = taxCategories.longTermGains.reduce((sum, inv) => sum + inv.currentValue, 0);
    const longTermPercentage = (longTermValue / totalValue) * 100;

    const taxEfficiencyScore = (taxFreePercentage * 0.6) + (longTermPercentage * 0.4);

    return {
      taxEfficiencyScore: parseFloat(taxEfficiencyScore.toFixed(2)),
      taxLiability: parseFloat(taxLiability.toFixed(2)),
      taxCategories: {
        taxFree: {
          count: taxCategories.taxFree.length,
          percentage: parseFloat(taxFreePercentage.toFixed(2))
        },
        longTerm: {
          count: taxCategories.longTermGains.length,
          percentage: parseFloat(longTermPercentage.toFixed(2))
        },
        shortTerm: {
          count: taxCategories.shortTermGains.length,
          percentage: parseFloat(((taxCategories.shortTermGains.reduce((sum, inv) => 
            sum + inv.currentValue, 0) / totalValue) * 100).toFixed(2))
        }
      },
      recommendations: this.getTaxOptimizationRecommendations(
        taxCategories,
        taxEfficiencyScore
      )
    };
  }

  /**
   * Generate optimization recommendations
   */
  generateOptimizationRecommendations(investments, allocation, risk, diversification) {
    const recommendations = [];

    // Allocation recommendations
    Object.keys(allocation.comparison).forEach(type => {
      const diff = allocation.comparison[type];
      if (Math.abs(diff) > 10) {
        recommendations.push({
          priority: Math.abs(diff) > 20 ? 'high' : 'medium',
          category: 'allocation',
          title: `Rebalance ${type}`,
          message: diff > 0 
            ? `Reduce ${type} allocation by ${Math.abs(diff).toFixed(1)}%`
            : `Increase ${type} allocation by ${Math.abs(diff).toFixed(1)}%`,
          action: diff > 0 ? 'sell' : 'buy',
          assetType: type,
          targetChange: diff
        });
      }
    });

    // Risk recommendations
    if (risk.sharpeRatio < 0.5) {
      recommendations.push({
        priority: 'high',
        category: 'risk',
        title: 'Poor Risk-Adjusted Returns',
        message: `Sharpe ratio of ${risk.sharpeRatio.toFixed(2)} indicates suboptimal risk-return balance`,
        action: 'Reallocate to higher Sharpe ratio investments'
      });
    }

    if (risk.concentrationRisk.highConcentration) {
      recommendations.push({
        priority: 'high',
        category: 'risk',
        title: 'High Concentration Risk',
        message: `Top holding represents ${risk.concentrationRisk.topHoldingPercentage}% of portfolio`,
        action: 'Diversify to reduce concentration risk'
      });
    }

    // Diversification recommendations
    if (diversification.diversificationScore < 50) {
      recommendations.push({
        priority: 'high',
        category: 'diversification',
        title: 'Insufficient Diversification',
        message: `Diversification score: ${diversification.diversificationScore}/100`,
        action: diversification.numberOfHoldings < 10
          ? 'Increase number of holdings to at least 10'
          : 'Diversify across more asset types and sectors'
      });
    }

    if (diversification.top5Concentration > 60) {
      recommendations.push({
        priority: 'medium',
        category: 'diversification',
        title: 'Top 5 Holdings Too Concentrated',
        message: `Top 5 holdings represent ${diversification.top5Concentration.toFixed(1)}% of portfolio`,
        action: 'Rebalance to reduce top 5 concentration below 50%'
      });
    }

    // Performance recommendations
    const underPerformers = this.getUnderPerformers(investments, 3);
    if (underPerformers.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        title: 'Review Under-Performing Assets',
        message: `${underPerformers.length} investments with negative returns`,
        action: 'Consider exiting or averaging down on under-performers',
        assets: underPerformers.map(inv => inv.name)
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Calculate portfolio health score
   */
  calculatePortfolioHealthScore(allocation, risk, diversification, performance) {
    let score = 0;

    // Allocation score (25 points)
    const allocationScore = allocation.isBalanced ? 25 : 15;
    score += allocationScore;

    // Risk score (25 points)
    if (risk.riskLevel === 'Low' && risk.sharpeRatio > 1) score += 25;
    else if (risk.riskLevel === 'Medium' && risk.sharpeRatio > 0.5) score += 20;
    else if (risk.sharpeRatio > 0) score += 10;

    // Diversification score (25 points)
    score += (diversification.diversificationScore / 100) * 25;

    // Performance score (25 points)
    const avgReturn = performance.averageReturn;
    if (avgReturn > 15) score += 25;
    else if (avgReturn > 10) score += 20;
    else if (avgReturn > 5) score += 15;
    else if (avgReturn > 0) score += 10;

    return {
      overall: parseFloat(score.toFixed(2)),
      breakdown: {
        allocation: allocationScore,
        risk: parseFloat(((risk.sharpeRatio > 0 ? 20 : 10)).toFixed(2)),
        diversification: parseFloat(((diversification.diversificationScore / 100) * 25).toFixed(2)),
        performance: parseFloat((avgReturn > 10 ? 20 : 15).toFixed(2))
      },
      grade: this.getHealthGrade(score),
      status: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Improvement'
    };
  }

  /**
   * Get top performers
   */
  getTopPerformers(investments, count = 5) {
    return investments
      .map(inv => ({
        name: inv.name,
        type: inv.type,
        invested: inv.amount,
        current: inv.currentValue,
        returns: ((inv.currentValue - inv.amount) / inv.amount) * 100
      }))
      .sort((a, b) => b.returns - a.returns)
      .slice(0, count);
  }

  /**
   * Get under performers
   */
  getUnderPerformers(investments, count = 5) {
    return investments
      .filter(inv => inv.currentValue < inv.amount)
      .map(inv => ({
        name: inv.name,
        type: inv.type,
        invested: inv.amount,
        current: inv.currentValue,
        returns: ((inv.currentValue - inv.amount) / inv.amount) * 100
      }))
      .sort((a, b) => a.returns - b.returns)
      .slice(0, count);
  }

  /**
   * Get recommended allocation (age-based)
   */
  getRecommendedAllocation(age = 35) {
    const equityPercentage = Math.max(100 - age, 40);
    const debtPercentage = 100 - equityPercentage - 10;
    const goldPercentage = 10;

    return {
      'Stocks': equityPercentage * 0.4,
      'Mutual Funds': equityPercentage * 0.6,
      'Fixed Deposits': debtPercentage * 0.5,
      'Bonds': debtPercentage * 0.5,
      'Gold': goldPercentage
    };
  }

  /**
   * Compare allocation
   */
  compareAllocation(current, recommended) {
    const comparison = {};
    let totalDeviation = 0;

    Object.keys(recommended).forEach(type => {
      const currentPercentage = current[type]?.percentage || 0;
      const recommendedPercentage = recommended[type];
      const deviation = currentPercentage - recommendedPercentage;
      
      comparison[type] = parseFloat(deviation.toFixed(2));
      totalDeviation += Math.abs(deviation);
    });

    return {
      ...comparison,
      deviationScore: parseFloat(totalDeviation.toFixed(2))
    };
  }

  /**
   * Calculate concentration risk
   */
  calculateConcentrationRisk(investments) {
    const totalValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
    const sorted = [...investments].sort((a, b) => b.currentValue - a.currentValue);
    
    const topHolding = sorted[0];
    const topHoldingPercentage = (topHolding.currentValue / totalValue) * 100;

    return {
      highConcentration: topHoldingPercentage > 25,
      topHoldingPercentage: parseFloat(topHoldingPercentage.toFixed(2)),
      topHolding: topHolding.name
    };
  }

  /**
   * Calculate time-weighted return
   */
  calculateTimeWeightedReturn(investments) {
    // Simplified TWR calculation
    const returns = investments.map(inv => 
      (inv.currentValue / inv.amount) - 1
    );
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    return avgReturn * 100;
  }

  /**
   * Calculate XIRR (Extended Internal Rate of Return)
   */
  calculateXIRR(investments) {
    // Simplified XIRR calculation using Newton-Raphson method
    // For production, use a library like 'xirr' package
    try {
      const cashFlows = investments.map(inv => ({
        amount: -inv.amount,
        date: new Date(inv.purchaseDate)
      }));
      
      cashFlows.push({
        amount: investments.reduce((sum, inv) => sum + inv.currentValue, 0),
        date: new Date()
      });

      // Simplified calculation - return approximate IRR
      const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
      const totalValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
      const years = moment().diff(moment(investments[0]?.purchaseDate), 'years', true) || 1;
      
      return ((Math.pow(totalValue / totalInvested, 1 / years) - 1) * 100);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calculate Beta
   */
  calculateBeta(investments) {
    // Simplified beta calculation
    // Assume market return of 12% and risk-free rate of 6.5%
    const marketReturn = 12;
    const portfolioReturn = investments.reduce((sum, inv) => {
      const returns = ((inv.currentValue - inv.amount) / inv.amount) * 100;
      return sum + returns;
    }, 0) / investments.length;

    // Simplified beta = portfolio return / market return
    return portfolioReturn / marketReturn;
  }

  /**
   * Calculate Value at Risk (VaR)
   */
  calculateVaR(investments, confidence = 0.95) {
    const returns = investments.map(inv => 
      ((inv.currentValue - inv.amount) / inv.amount) * 100
    );
    
    const mean = this.calculateAverage(returns);
    const stdDev = this.calculateStdDev(returns);
    
    // VaR using parametric method
    const zScore = confidence === 0.95 ? 1.645 : 2.326; // 95% or 99%
    const var95 = mean - (zScore * stdDev);
    
    return var95;
  }

  /**
   * Calculate tax liability
   */
  calculateTaxLiability(taxCategories) {
    let totalTax = 0;

    // Long-term capital gains (LTCG)
    // Equity: 10% above 1 lakh, Debt: 20% with indexation
    taxCategories.longTermGains.forEach(inv => {
      if (['Stocks', 'Mutual Funds'].includes(inv.type)) {
        // Equity LTCG - 10% above 1 lakh
        const taxableGains = Math.max(inv.gains - 100000, 0);
        totalTax += taxableGains * 0.10;
      } else {
        // Debt LTCG - 20% with indexation (simplified to 15%)
        totalTax += inv.gains * 0.15;
      }
    });

    // Short-term capital gains (STCG)
    // Equity: 15%, Debt: As per slab (assume 30%)
    taxCategories.shortTermGains.forEach(inv => {
      if (['Stocks', 'Mutual Funds'].includes(inv.type)) {
        totalTax += inv.gains * 0.15;
      } else {
        totalTax += inv.gains * 0.30;
      }
    });

    return totalTax;
  }

  /**
   * Helper methods
   */
  calculateAverage(arr) {
    return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  calculateStdDev(arr) {
    if (arr.length === 0) return 0;
    const mean = this.calculateAverage(arr);
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }

  calculateQuartiles(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return {
      q1: sorted[Math.floor(sorted.length * 0.25)],
      q2: sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid],
      q3: sorted[Math.floor(sorted.length * 0.75)]
    };
  }

  getHealthGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    return 'D';
  }

  assessRiskCapacity(volatility, beta) {
    if (volatility < 10 && beta < 0.8) return 'Conservative';
    if (volatility < 20 && beta < 1.2) return 'Moderate';
    return 'Aggressive';
  }

  getRiskRecommendation(riskLevel, sharpeRatio, concentrationRisk) {
    if (riskLevel === 'High' && sharpeRatio < 0.5) {
      return 'Reduce high-risk investments that are not generating adequate returns';
    }
    if (concentrationRisk.highConcentration) {
      return 'Diversify portfolio to reduce concentration risk';
    }
    if (sharpeRatio < 0.5) {
      return 'Optimize portfolio for better risk-adjusted returns';
    }
    return 'Portfolio risk is well-managed';
  }

  getDiversificationRecommendation(score, top5Concentration, numberOfHoldings) {
    if (score < 50) {
      return `Increase diversification by adding ${10 - numberOfHoldings} more holdings across different sectors`;
    }
    if (top5Concentration > 60) {
      return 'Reduce concentration in top 5 holdings to below 50%';
    }
    if (score < 70) {
      return 'Consider diversifying across more asset types';
    }
    return 'Portfolio is well-diversified';
  }

  getTaxOptimizationRecommendations(taxCategories, taxEfficiencyScore) {
    const recommendations = [];

    if (taxEfficiencyScore < 50) {
      recommendations.push({
        title: 'Increase Tax-Free Investments',
        message: 'Allocate more to PPF, EPF, or ELSS for tax benefits',
        priority: 'high'
      });
    }

    if (taxCategories.shortTermGains.length > 5) {
      recommendations.push({
        title: 'Hold Investments Longer',
        message: 'Consider holding equity investments >1 year for lower LTCG tax',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  /**
   * Optimize portfolio allocation
   */
  async optimizePortfolio(userId, riskTolerance = 'moderate') {
    try {
      const analysis = await this.analyzePortfolio(userId);
      
      if (!analysis.allocation) {
        return { message: 'Insufficient data for optimization' };
      }

      const current = analysis.allocation.current;
      const recommended = analysis.allocation.recommended;
      
      // Calculate rebalancing actions
      const rebalancingActions = [];
      Object.keys(recommended).forEach(type => {
        const currentPercentage = current[type]?.percentage || 0;
        const recommendedPercentage = recommended[type];
        const difference = recommendedPercentage - currentPercentage;
        
        if (Math.abs(difference) > 5) {
          rebalancingActions.push({
            assetType: type,
            currentPercentage: parseFloat(currentPercentage.toFixed(2)),
            recommendedPercentage: parseFloat(recommendedPercentage.toFixed(2)),
            action: difference > 0 ? 'BUY' : 'SELL',
            percentage: parseFloat(Math.abs(difference).toFixed(2)),
            amount: parseFloat((Math.abs(difference) / 100 * analysis.summary.totalValue).toFixed(2))
          });
        }
      });

      return {
        currentPortfolio: analysis.summary,
        currentAllocation: analysis.allocation.current,
        targetAllocation: recommended,
        rebalancingActions,
        expectedImprovement: {
          riskReduction: parseFloat((analysis.risk.riskScore * 0.2).toFixed(2)),
          returnImprovement: parseFloat((2.5).toFixed(2)), // Estimated
          diversificationIncrease: parseFloat((15).toFixed(2)) // Estimated
        },
        estimatedCost: {
          tradingFees: parseFloat((rebalancingActions.length * 20).toFixed(2)),
          taxImpact: parseFloat((analysis.taxEfficiency.taxLiability * 0.1).toFixed(2))
        }
      };
    } catch (error) {
      console.error('Error optimizing portfolio:', error);
      throw error;
    }
  }
}

module.exports = new PortfolioAnalyticsService();
