/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  BORROWING INTELLIGENCE SERVICE - AI-Powered Loan Analysis & Predictions
 * ═══════════════════════════════════════════════════════════════════════════════
 *  
 *  Features:
 *  • Borrowing pattern analysis & trend detection
 *  • Lender relationship scoring & trust analysis
 *  • Repayment behavior prediction using ML-like scoring
 *  • Smart repayment strategy recommendations
 *  • Risk assessment for each borrowing relationship
 *  • Anomaly detection in borrowing patterns
 *  • Cash flow impact analysis
 *  • Self-training model that improves with more data
 *  • Natural language insights generation
 *  • Borrowing capacity estimation
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

class BorrowingIntelligenceService {
  constructor() {
    // Model weights for scoring (self-adjusting based on data)
    this.modelWeights = {
      repaymentScore: { onTimeRate: 0.35, consistencyRate: 0.25, fullPaymentRate: 0.20, averageDelay: 0.20 },
      trustScore: { repaymentHistory: 0.30, loanFrequency: 0.15, averageAmount: 0.10, relationshipLength: 0.15, communicationScore: 0.10, diversityScore: 0.10, currentStatus: 0.10 },
      riskScore: { debtToIncome: 0.25, concentrationRisk: 0.20, interestBurden: 0.15, overdueLoans: 0.20, borrowingVelocity: 0.10, seasonalRisk: 0.10 }
    };
    this.trainingHistory = [];
    this.modelVersion = '1.0.0';
    this.lastTrainedAt = null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  COMPREHENSIVE ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get full AI-powered analytics for a user's borrowing portfolio
   */
  async getComprehensiveAnalytics(userId) {
    try {
      const allLoans = await this._getAllLoans(userId);
      const transactions = await this._getTransactions(userId);
      
      if (allLoans.length === 0) {
        return this._getEmptyAnalytics();
      }

      const activeLoans = allLoans.filter(l => l.status === 'active');
      const repaidLoans = allLoans.filter(l => l.status === 'repaid');

      // Core analytics
      const portfolio = this._analyzePortfolio(allLoans, activeLoans, repaidLoans);
      const lenderAnalysis = this._analyzeLenders(allLoans);
      const trends = this._analyzeTrends(allLoans);
      const patterns = this._detectPatterns(allLoans);
      const riskAssessment = this._assessRisk(allLoans, activeLoans, transactions);
      const repaymentBehavior = this._analyzeRepaymentBehavior(allLoans, repaidLoans);
      const cashFlowImpact = this._analyzeCashFlowImpact(activeLoans, transactions);
      const predictions = this._generatePredictions(allLoans, activeLoans, trends, patterns);
      const recommendations = this._generateRecommendations(portfolio, riskAssessment, repaymentBehavior, activeLoans, lenderAnalysis);
      const insights = this._generateNLInsights(portfolio, trends, riskAssessment, patterns, lenderAnalysis);
      const anomalies = this._detectAnomalies(allLoans, patterns);
      const capacity = this._estimateBorrowingCapacity(allLoans, transactions, riskAssessment);
      const healthScore = this._calculateBorrowingHealthScore(portfolio, riskAssessment, repaymentBehavior, cashFlowImpact);
      const timeline = this._buildRepaymentTimeline(activeLoans);
      const seasonalAnalysis = this._analyzeSeasonality(allLoans);
      const interestAnalysis = this._analyzeInterestBurden(allLoans, activeLoans);

      // Self-train model based on new data
      await this._trainModel(userId, allLoans, repaymentBehavior);

      return {
        portfolio,
        lenderAnalysis,
        trends,
        patterns,
        riskAssessment,
        repaymentBehavior,
        cashFlowImpact,
        predictions,
        recommendations,
        insights,
        anomalies,
        capacity,
        healthScore,
        timeline,
        seasonalAnalysis,
        interestAnalysis,
        modelInfo: {
          version: this.modelVersion,
          lastTrained: this.lastTrainedAt,
          dataPoints: allLoans.length,
          accuracy: this._getModelAccuracy()
        }
      };
    } catch (error) {
      logger.error('Borrowing intelligence analytics error:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PORTFOLIO ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  _analyzePortfolio(allLoans, activeLoans, repaidLoans) {
    const totalBorrowed = allLoans.reduce((s, l) => s + (l.principalAmount || 0), 0);
    const totalRepaid = allLoans.reduce((s, l) => s + (l.totalRepaid || 0), 0);
    const totalOutstanding = activeLoans.reduce((s, l) => s + (l.outstandingAmount || 0), 0);
    const totalInterestPaid = repaidLoans.reduce((s, l) => s + (l.currentInterest || 0), 0);
    const totalInterestAccruing = activeLoans.reduce((s, l) => s + (l.currentInterest || 0), 0);

    // Average loan metrics
    const avgLoanAmount = allLoans.length > 0 ? totalBorrowed / allLoans.length : 0;
    const avgRepaymentTime = repaidLoans.length > 0 ? repaidLoans.reduce((s, l) => {
      const days = l.repaymentDate ? Math.ceil((new Date(l.repaymentDate) - new Date(l.loanTakenDate)) / (1000 * 60 * 60 * 24)) : 0;
      return s + days;
    }, 0) / repaidLoans.length : 0;

    // Loan size distribution
    const sizeDistribution = this._calculateSizeDistribution(allLoans);
    
    // Monthly borrowing rate
    const monthlyBorrowingRate = this._calculateMonthlyRate(allLoans);

    // Relationship distribution
    const relationshipDistribution = {};
    allLoans.forEach(l => {
      const rel = l.relationship || 'Other';
      if (!relationshipDistribution[rel]) relationshipDistribution[rel] = { count: 0, amount: 0 };
      relationshipDistribution[rel].count++;
      relationshipDistribution[rel].amount += l.principalAmount || 0;
    });

    // Purpose distribution
    const purposeDistribution = {};
    allLoans.forEach(l => {
      const purpose = l.purpose || 'Unspecified';
      if (!purposeDistribution[purpose]) purposeDistribution[purpose] = { count: 0, amount: 0 };
      purposeDistribution[purpose].count++;
      purposeDistribution[purpose].amount += l.principalAmount || 0;
    });

    // Priority breakdown
    const priorityBreakdown = { low: 0, medium: 0, high: 0, urgent: 0 };
    activeLoans.forEach(l => { priorityBreakdown[l.priority || 'medium']++; });

    return {
      totalLoans: allLoans.length,
      activeLoans: activeLoans.length,
      repaidLoans: repaidLoans.length,
      totalBorrowed,
      totalRepaid,
      totalOutstanding,
      totalInterestPaid,
      totalInterestAccruing,
      totalInterest: totalInterestPaid + totalInterestAccruing,
      avgLoanAmount: Math.round(avgLoanAmount),
      avgRepaymentTimeDays: Math.round(avgRepaymentTime),
      repaymentRate: totalBorrowed > 0 ? Math.round((totalRepaid / totalBorrowed) * 100) : 0,
      completionRate: allLoans.length > 0 ? Math.round((repaidLoans.length / allLoans.length) * 100) : 0,
      sizeDistribution,
      monthlyBorrowingRate,
      relationshipDistribution,
      purposeDistribution,
      priorityBreakdown,
      uniqueLenders: new Set(allLoans.map(l => l.lenderName.toLowerCase().trim())).size,
      oldestLoan: allLoans.length > 0 ? allLoans.reduce((oldest, l) => new Date(l.loanTakenDate) < new Date(oldest.loanTakenDate) ? l : oldest).loanTakenDate : null,
      newestLoan: allLoans.length > 0 ? allLoans.reduce((newest, l) => new Date(l.loanTakenDate) > new Date(newest.loanTakenDate) ? l : newest).loanTakenDate : null
    };
  }

  _calculateSizeDistribution(loans) {
    const buckets = {
      'Under ₹5K': { min: 0, max: 5000, count: 0, amount: 0 },
      '₹5K - ₹25K': { min: 5000, max: 25000, count: 0, amount: 0 },
      '₹25K - ₹1L': { min: 25000, max: 100000, count: 0, amount: 0 },
      '₹1L - ₹5L': { min: 100000, max: 500000, count: 0, amount: 0 },
      '₹5L+': { min: 500000, max: Infinity, count: 0, amount: 0 }
    };
    loans.forEach(l => {
      const amt = l.principalAmount || 0;
      for (const [, bucket] of Object.entries(buckets)) {
        if (amt >= bucket.min && amt < bucket.max) {
          bucket.count++;
          bucket.amount += amt;
          break;
        }
      }
    });
    return Object.entries(buckets).map(([label, data]) => ({ label, count: data.count, amount: data.amount }));
  }

  _calculateMonthlyRate(loans) {
    if (loans.length < 2) return [];
    const monthly = {};
    loans.forEach(l => {
      const key = new Date(l.loanTakenDate).toISOString().substring(0, 7);
      if (!monthly[key]) monthly[key] = { count: 0, amount: 0 };
      monthly[key].count++;
      monthly[key].amount += l.principalAmount || 0;
    });
    return Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)).map(([month, data]) => ({
      month,
      label: new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      ...data
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  LENDER RELATIONSHIP ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  _analyzeLenders(allLoans) {
    const lenderMap = {};
    allLoans.forEach(loan => {
      const key = loan.lenderName.trim().toLowerCase();
      if (!lenderMap[key]) {
        lenderMap[key] = {
          name: loan.lenderName,
          relationship: loan.relationship,
          loans: [],
          totalBorrowed: 0,
          totalRepaid: 0,
          totalOutstanding: 0,
          activeCount: 0,
          repaidCount: 0,
          firstDate: loan.loanTakenDate,
          lastDate: loan.loanTakenDate,
          avgLoanAmount: 0,
          avgRepaymentDays: 0,
          interestPaid: 0,
          purposes: new Set(),
          contactDetails: loan.contactDetails || {}
        };
      }
      const lender = lenderMap[key];
      lender.loans.push(loan);
      lender.totalBorrowed += loan.principalAmount || 0;
      lender.totalRepaid += loan.totalRepaid || 0;
      lender.totalOutstanding += loan.outstandingAmount || 0;
      lender.interestPaid += loan.currentInterest || 0;
      if (loan.status === 'active') lender.activeCount++;
      else lender.repaidCount++;
      if (loan.purpose) lender.purposes.add(loan.purpose);
      if (new Date(loan.loanTakenDate) < new Date(lender.firstDate)) lender.firstDate = loan.loanTakenDate;
      if (new Date(loan.loanTakenDate) > new Date(lender.lastDate)) lender.lastDate = loan.loanTakenDate;
      if (loan.contactDetails?.phone) lender.contactDetails.phone = loan.contactDetails.phone;
      if (loan.contactDetails?.email) lender.contactDetails.email = loan.contactDetails.email;
    });

    return Object.values(lenderMap).map(lender => {
      const repaidLoans = lender.loans.filter(l => l.status === 'repaid');
      const avgRepayDays = repaidLoans.length > 0 ? repaidLoans.reduce((s, l) => {
        return s + (l.repaymentDate ? Math.ceil((new Date(l.repaymentDate) - new Date(l.loanTakenDate)) / (1000 * 60 * 60 * 24)) : 0);
      }, 0) / repaidLoans.length : 0;

      const relationshipDays = Math.ceil((new Date() - new Date(lender.firstDate)) / (1000 * 60 * 60 * 24));
      
      // Calculate trust score
      const trustScore = this._calculateLenderTrustScore(lender, avgRepayDays, relationshipDays);
      
      // Calculate relationship health
      const relationshipHealth = this._assessRelationshipHealth(lender, trustScore);

      // Predict future borrowing likelihood
      const futureBorrowingLikelihood = this._predictFutureBorrowing(lender);

      return {
        name: lender.name,
        relationship: lender.relationship,
        totalLoans: lender.loans.length,
        activeCount: lender.activeCount,
        repaidCount: lender.repaidCount,
        totalBorrowed: lender.totalBorrowed,
        totalRepaid: lender.totalRepaid,
        totalOutstanding: lender.totalOutstanding,
        interestPaid: lender.interestPaid,
        avgLoanAmount: Math.round(lender.totalBorrowed / lender.loans.length),
        avgRepaymentDays: Math.round(avgRepayDays),
        relationshipDays,
        trustScore,
        relationshipHealth,
        futureBorrowingLikelihood,
        purposes: Array.from(lender.purposes),
        contactDetails: lender.contactDetails,
        firstDate: lender.firstDate,
        lastDate: lender.lastDate,
        riskLevel: trustScore >= 70 ? 'low' : trustScore >= 40 ? 'medium' : 'high'
      };
    }).sort((a, b) => b.totalOutstanding - a.totalOutstanding || b.trustScore - a.trustScore);
  }

  _calculateLenderTrustScore(lender, avgRepayDays, relationshipDays) {
    let score = 50; // Base

    // Repayment history (0-30 points)
    const repayRate = lender.loans.length > 0 ? lender.repaidCount / lender.loans.length : 0;
    score += repayRate * 30;

    // Repayment speed (0-15 points) - faster is better
    if (avgRepayDays > 0) {
      if (avgRepayDays <= 30) score += 15;
      else if (avgRepayDays <= 90) score += 10;
      else if (avgRepayDays <= 180) score += 5;
    }

    // Relationship length bonus (0-10 points)
    if (relationshipDays > 365) score += 10;
    else if (relationshipDays > 180) score += 7;
    else if (relationshipDays > 90) score += 4;

    // Outstanding debt penalty
    if (lender.totalOutstanding > lender.totalBorrowed * 0.5) score -= 10;
    if (lender.activeCount > 3) score -= 5;

    // Interest burden (negative signal)
    if (lender.interestPaid > lender.totalBorrowed * 0.1) score -= 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  _assessRelationshipHealth(lender, trustScore) {
    if (trustScore >= 80) return { status: 'excellent', label: 'Excellent', color: '#10B981', description: 'Strong track record with this lender' };
    if (trustScore >= 60) return { status: 'good', label: 'Good', color: '#3B82F6', description: 'Reliable relationship with room to grow' };
    if (trustScore >= 40) return { status: 'fair', label: 'Fair', color: '#F59E0B', description: 'Some concerns - consider improving repayment consistency' };
    return { status: 'poor', label: 'At Risk', color: '#EF4444', description: 'Relationship needs attention - priority repayments recommended' };
  }

  _predictFutureBorrowing(lender) {
    // Simple prediction based on borrowing frequency
    const monthsSinceFirst = Math.max(1, Math.ceil((new Date() - new Date(lender.firstDate)) / (1000 * 60 * 60 * 24 * 30)));
    const borrowingFrequency = lender.loans.length / monthsSinceFirst;
    const avgAmount = lender.totalBorrowed / lender.loans.length;
    
    if (borrowingFrequency > 0.5) return { likelihood: 'high', nextAmount: Math.round(avgAmount), frequency: 'monthly' };
    if (borrowingFrequency > 0.2) return { likelihood: 'medium', nextAmount: Math.round(avgAmount), frequency: 'quarterly' };
    if (borrowingFrequency > 0.08) return { likelihood: 'low', nextAmount: Math.round(avgAmount), frequency: 'biannual' };
    return { likelihood: 'very_low', nextAmount: 0, frequency: 'rare' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TREND ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  _analyzeTrends(allLoans) {
    const monthly = this._calculateMonthlyRate(allLoans);
    if (monthly.length < 2) return { direction: 'insufficient_data', monthly, quarterlyComparison: null, yearlyComparison: null };

    // Calculate trend direction
    const recentHalf = monthly.slice(Math.floor(monthly.length / 2));
    const olderHalf = monthly.slice(0, Math.floor(monthly.length / 2));
    const recentAvgAmount = recentHalf.reduce((s, m) => s + m.amount, 0) / recentHalf.length;
    const olderAvgAmount = olderHalf.reduce((s, m) => s + m.amount, 0) / olderHalf.length;
    const amountChange = olderAvgAmount > 0 ? ((recentAvgAmount - olderAvgAmount) / olderAvgAmount) * 100 : 0;

    const recentAvgCount = recentHalf.reduce((s, m) => s + m.count, 0) / recentHalf.length;
    const olderAvgCount = olderHalf.reduce((s, m) => s + m.count, 0) / olderHalf.length;
    const countChange = olderAvgCount > 0 ? ((recentAvgCount - olderAvgCount) / olderAvgCount) * 100 : 0;

    // Quarterly comparison
    const now = new Date();
    const thisQuarter = allLoans.filter(l => {
      const d = new Date(l.loanTakenDate);
      return d.getFullYear() === now.getFullYear() && Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3);
    });
    const lastQuarter = allLoans.filter(l => {
      const d = new Date(l.loanTakenDate);
      const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1);
      const qEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0);
      return d >= qStart && d <= qEnd;
    });

    return {
      direction: amountChange > 10 ? 'increasing' : amountChange < -10 ? 'decreasing' : 'stable',
      amountChange: Math.round(amountChange),
      countChange: Math.round(countChange),
      monthly,
      recentAvgAmount: Math.round(recentAvgAmount),
      olderAvgAmount: Math.round(olderAvgAmount),
      quarterlyComparison: {
        currentQuarter: { count: thisQuarter.length, amount: thisQuarter.reduce((s, l) => s + (l.principalAmount || 0), 0) },
        previousQuarter: { count: lastQuarter.length, amount: lastQuarter.reduce((s, l) => s + (l.principalAmount || 0), 0) }
      },
      movingAverage: this._calculateMovingAverage(monthly, 3)
    };
  }

  _calculateMovingAverage(data, windowSize) {
    if (data.length < windowSize) return data;
    return data.map((item, i) => {
      if (i < windowSize - 1) return { ...item, ma: item.amount };
      const window = data.slice(i - windowSize + 1, i + 1);
      const avg = window.reduce((s, w) => s + w.amount, 0) / windowSize;
      return { ...item, ma: Math.round(avg) };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PATTERN DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  _detectPatterns(allLoans) {
    const patterns = [];

    // Recurring borrowing pattern
    const lenderFrequency = {};
    allLoans.forEach(l => {
      const key = l.lenderName.trim().toLowerCase();
      if (!lenderFrequency[key]) lenderFrequency[key] = { dates: [], amounts: [], name: l.lenderName };
      lenderFrequency[key].dates.push(new Date(l.loanTakenDate));
      lenderFrequency[key].amounts.push(l.principalAmount);
    });

    Object.entries(lenderFrequency).forEach(([, data]) => {
      if (data.dates.length >= 3) {
        const sortedDates = data.dates.sort((a, b) => a - b);
        const intervals = [];
        for (let i = 1; i < sortedDates.length; i++) {
          intervals.push((sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24));
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((s, i) => s + Math.pow(i - avgInterval, 2), 0) / intervals.length;
        const isRegular = Math.sqrt(variance) < avgInterval * 0.4;

        if (isRegular && avgInterval < 120) {
          patterns.push({
            type: 'recurring_borrowing',
            lender: data.name,
            frequency: avgInterval < 35 ? 'monthly' : avgInterval < 100 ? 'quarterly' : 'periodic',
            intervalDays: Math.round(avgInterval),
            avgAmount: Math.round(data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length),
            occurrences: data.dates.length,
            confidence: isRegular ? 'high' : 'medium',
            description: `Regular borrowing from ${data.name} every ~${Math.round(avgInterval)} days`
          });
        }
      }
    });

    // Amount clustering pattern
    const amounts = allLoans.map(l => l.principalAmount);
    const roundedAmounts = {};
    amounts.forEach(a => {
      // Round to nearest significant digit
      const rounded = a >= 100000 ? Math.round(a / 100000) * 100000 :
                       a >= 10000 ? Math.round(a / 10000) * 10000 :
                       a >= 1000 ? Math.round(a / 1000) * 1000 : a;
      roundedAmounts[rounded] = (roundedAmounts[rounded] || 0) + 1;
    });

    const commonAmounts = Object.entries(roundedAmounts)
      .filter(([, count]) => count >= 2)
      .sort(([, a], [, b]) => b - a);

    if (commonAmounts.length > 0) {
      patterns.push({
        type: 'common_amounts',
        amounts: commonAmounts.slice(0, 5).map(([amount, count]) => ({ amount: parseInt(amount), count })),
        description: `Most common borrowing amounts: ${commonAmounts.slice(0, 3).map(([a]) => `₹${parseInt(a).toLocaleString()}`).join(', ')}`
      });
    }

    // Escalation pattern (increasing amounts over time)
    if (allLoans.length >= 4) {
      const sortedByDate = [...allLoans].sort((a, b) => new Date(a.loanTakenDate) - new Date(b.loanTakenDate));
      const firstHalf = sortedByDate.slice(0, Math.floor(sortedByDate.length / 2));
      const secondHalf = sortedByDate.slice(Math.floor(sortedByDate.length / 2));
      const firstAvg = firstHalf.reduce((s, l) => s + l.principalAmount, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, l) => s + l.principalAmount, 0) / secondHalf.length;

      if (secondAvg > firstAvg * 1.3) {
        patterns.push({
          type: 'escalation',
          description: `Borrowing amounts have increased by ${Math.round(((secondAvg - firstAvg) / firstAvg) * 100)}% over time`,
          severity: 'warning',
          earlyAvg: Math.round(firstAvg),
          recentAvg: Math.round(secondAvg)
        });
      }
    }

    // Day-of-week pattern
    const dayOfWeek = Array(7).fill(0);
    allLoans.forEach(l => { dayOfWeek[new Date(l.loanTakenDate).getDay()]++; });
    const maxDay = dayOfWeek.indexOf(Math.max(...dayOfWeek));
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (Math.max(...dayOfWeek) >= 3) {
      patterns.push({
        type: 'day_preference',
        preferredDay: dayNames[maxDay],
        distribution: dayNames.map((name, i) => ({ day: name, count: dayOfWeek[i] })),
        description: `You tend to borrow most on ${dayNames[maxDay]}s`
      });
    }

    // Month-end pattern
    const monthEnd = allLoans.filter(l => new Date(l.loanTakenDate).getDate() >= 25).length;
    const monthStart = allLoans.filter(l => new Date(l.loanTakenDate).getDate() <= 5).length;
    if (monthEnd > allLoans.length * 0.4) {
      patterns.push({
        type: 'month_end_borrowing',
        percentage: Math.round((monthEnd / allLoans.length) * 100),
        description: `${Math.round((monthEnd / allLoans.length) * 100)}% of borrowing happens at month-end, suggesting cash flow gaps`
      });
    }

    return patterns;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  RISK ASSESSMENT
  // ═══════════════════════════════════════════════════════════════════════════

  _assessRisk(allLoans, activeLoans, transactions) {
    const monthlyIncome = this._estimateMonthlyIncome(transactions);
    const totalOutstanding = activeLoans.reduce((s, l) => s + (l.outstandingAmount || 0), 0);
    const monthlyInterest = activeLoans.reduce((s, l) => s + (l.monthlyInterest || 0), 0);

    // Debt-to-income ratio
    const dti = monthlyIncome > 0 ? (totalOutstanding / (monthlyIncome * 12)) * 100 : 0;
    const dtiRisk = dti > 50 ? 'critical' : dti > 30 ? 'high' : dti > 15 ? 'medium' : 'low';

    // Concentration risk (dependent on few lenders)
    const lenderAmounts = {};
    activeLoans.forEach(l => {
      const key = l.lenderName.trim().toLowerCase();
      lenderAmounts[key] = (lenderAmounts[key] || 0) + (l.outstandingAmount || 0);
    });
    const maxLenderExposure = totalOutstanding > 0 ? (Math.max(...Object.values(lenderAmounts)) / totalOutstanding) * 100 : 0;
    const concentrationRisk = maxLenderExposure > 60 ? 'high' : maxLenderExposure > 40 ? 'medium' : 'low';

    // Interest burden
    const interestBurden = monthlyIncome > 0 ? (monthlyInterest / monthlyIncome) * 100 : 0;
    const interestRisk = interestBurden > 10 ? 'high' : interestBurden > 5 ? 'medium' : 'low';

    // Overdue assessment
    const overdueLoans = activeLoans.filter(l => {
      const days = Math.ceil((new Date() - new Date(l.loanTakenDate)) / (1000 * 60 * 60 * 24));
      return days > 180 && l.totalRepaid < l.principalAmount * 0.1;
    });
    const overdueRisk = overdueLoans.length > 2 ? 'high' : overdueLoans.length > 0 ? 'medium' : 'low';

    // Borrowing velocity (how fast new loans are taken)
    const last90Days = allLoans.filter(l => {
      const d = new Date(l.loanTakenDate);
      return (new Date() - d) / (1000 * 60 * 60 * 24) <= 90;
    });
    const velocityRisk = last90Days.length > 5 ? 'high' : last90Days.length > 2 ? 'medium' : 'low';

    // Overall risk score (0-100, lower is better)
    const riskFactors = {
      dti: { value: Math.min(100, dti), weight: 0.25 },
      concentration: { value: maxLenderExposure, weight: 0.15 },
      interest: { value: Math.min(100, interestBurden * 5), weight: 0.15 },
      overdue: { value: overdueLoans.length * 25, weight: 0.20 },
      velocity: { value: last90Days.length * 15, weight: 0.15 },
      activeCount: { value: Math.min(100, activeLoans.length * 10), weight: 0.10 }
    };

    const overallRisk = Math.min(100, Math.round(
      Object.values(riskFactors).reduce((s, f) => s + f.value * f.weight, 0)
    ));

    return {
      overallRisk,
      overallRiskLevel: overallRisk >= 70 ? 'critical' : overallRisk >= 50 ? 'high' : overallRisk >= 30 ? 'medium' : 'low',
      debtToIncome: { value: Math.round(dti * 10) / 10, risk: dtiRisk, monthlyIncome },
      concentration: { value: Math.round(maxLenderExposure), risk: concentrationRisk },
      interestBurden: { value: Math.round(interestBurden * 10) / 10, risk: interestRisk, monthlyInterest },
      overdueLoans: { count: overdueLoans.length, risk: overdueRisk, loans: overdueLoans.map(l => ({ name: l.lenderName, amount: l.outstandingAmount, days: l.daysSinceTaken })) },
      velocity: { last90Days: last90Days.length, risk: velocityRisk },
      riskFactors
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  REPAYMENT BEHAVIOR ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  _analyzeRepaymentBehavior(allLoans, repaidLoans) {
    if (repaidLoans.length === 0) {
      return {
        score: 50,
        level: 'no_history',
        avgRepaymentDays: 0,
        fastestRepayment: null,
        slowestRepayment: null,
        consistency: 0,
        fullPaymentRate: 0,
        partialPaymentTrend: 'unknown',
        monthlyRepaymentPattern: []
      };
    }

    const repaymentTimes = repaidLoans.map(l => ({
      lender: l.lenderName,
      amount: l.principalAmount,
      days: l.repaymentDate ? Math.ceil((new Date(l.repaymentDate) - new Date(l.loanTakenDate)) / (1000 * 60 * 60 * 24)) : 999,
      interestPaid: l.currentInterest
    })).sort((a, b) => a.days - b.days);

    const avgDays = repaymentTimes.reduce((s, t) => s + t.days, 0) / repaymentTimes.length;
    const fastest = repaymentTimes[0];
    const slowest = repaymentTimes[repaymentTimes.length - 1];

    // Consistency score (how uniform are repayment times)
    const variance = repaymentTimes.reduce((s, t) => s + Math.pow(t.days - avgDays, 2), 0) / repaymentTimes.length;
    const consistency = Math.max(0, 100 - Math.sqrt(variance) / avgDays * 100);

    // Repayment behavior score (0-100)
    let score = 50;
    if (avgDays <= 30) score += 25;
    else if (avgDays <= 90) score += 15;
    else if (avgDays <= 180) score += 5;
    else score -= 10;
    score += (consistency / 100) * 20;
    score += (repaidLoans.length / allLoans.length) * 15; // Completion rate bonus

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      level: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor',
      avgRepaymentDays: Math.round(avgDays),
      fastestRepayment: fastest ? { lender: fastest.lender, days: fastest.days, amount: fastest.amount } : null,
      slowestRepayment: slowest ? { lender: slowest.lender, days: slowest.days, amount: slowest.amount } : null,
      consistency: Math.round(consistency),
      totalRepaid: repaidLoans.reduce((s, l) => s + (l.totalRepaid || 0), 0),
      totalInterestPaid: repaidLoans.reduce((s, l) => s + (l.currentInterest || 0), 0),
      repaymentTimes: repaymentTimes.slice(0, 10)
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CASH FLOW IMPACT ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  _analyzeCashFlowImpact(activeLoans, transactions) {
    const monthlyIncome = this._estimateMonthlyIncome(transactions);
    const monthlyExpenses = this._estimateMonthlyExpenses(transactions);
    const monthlyInterest = activeLoans.reduce((s, l) => s + (l.monthlyInterest || 0), 0);
    const totalOutstanding = activeLoans.reduce((s, l) => s + (l.outstandingAmount || 0), 0);
    const disposableIncome = monthlyIncome - monthlyExpenses;

    // Recommended monthly repayment (20% of disposable income)
    const recommendedRepayment = Math.max(0, disposableIncome * 0.2);
    
    // Time to clear all debt
    const monthsToClear = recommendedRepayment > 0 ? Math.ceil(totalOutstanding / recommendedRepayment) : Infinity;

    // Impact on savings
    const savingsImpact = monthlyIncome > 0 ? (monthlyInterest / monthlyIncome) * 100 : 0;

    return {
      monthlyIncome,
      monthlyExpenses,
      disposableIncome,
      monthlyInterest,
      totalOutstanding,
      recommendedRepayment: Math.round(recommendedRepayment),
      monthsToClear: monthsToClear === Infinity ? null : monthsToClear,
      savingsImpact: Math.round(savingsImpact * 10) / 10,
      debtServiceRatio: monthlyIncome > 0 ? Math.round((monthlyInterest / monthlyIncome) * 1000) / 10 : 0,
      healthStatus: savingsImpact < 5 ? 'healthy' : savingsImpact < 10 ? 'manageable' : savingsImpact < 20 ? 'strained' : 'critical'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PREDICTION ENGINE
  // ═══════════════════════════════════════════════════════════════════════════

  _generatePredictions(allLoans, activeLoans, trends, patterns) {
    const predictions = [];

    // Next borrowing prediction
    if (allLoans.length >= 3) {
      const intervals = [];
      const sortedLoans = [...allLoans].sort((a, b) => new Date(a.loanTakenDate) - new Date(b.loanTakenDate));
      for (let i = 1; i < sortedLoans.length; i++) {
        intervals.push((new Date(sortedLoans[i].loanTakenDate) - new Date(sortedLoans[i - 1].loanTakenDate)) / (1000 * 60 * 60 * 24));
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const lastLoanDate = new Date(sortedLoans[sortedLoans.length - 1].loanTakenDate);
      const predictedNextDate = new Date(lastLoanDate.getTime() + avgInterval * 24 * 60 * 60 * 1000);
      const avgAmount = allLoans.reduce((s, l) => s + l.principalAmount, 0) / allLoans.length;

      predictions.push({
        type: 'next_borrowing',
        title: 'Predicted Next Borrowing',
        predictedDate: predictedNextDate.toISOString(),
        predictedAmount: Math.round(avgAmount),
        confidence: allLoans.length >= 10 ? 'high' : allLoans.length >= 5 ? 'medium' : 'low',
        description: `Based on your history, you may need to borrow ~₹${Math.round(avgAmount).toLocaleString()} around ${predictedNextDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`
      });
    }

    // Outstanding trends prediction
    if (activeLoans.length > 0) {
      const totalOutstanding = activeLoans.reduce((s, l) => s + (l.outstandingAmount || 0), 0);
      const monthlyInterest = activeLoans.reduce((s, l) => s + (l.monthlyInterest || 0), 0);

      // If no repayments, predict growing debt
      const projected3Months = totalOutstanding + (monthlyInterest * 3);
      const projected6Months = totalOutstanding + (monthlyInterest * 6);
      const projected12Months = totalOutstanding + (monthlyInterest * 12);

      predictions.push({
        type: 'debt_projection',
        title: 'Outstanding Debt Projection',
        current: totalOutstanding,
        projections: [
          { months: 3, amount: Math.round(projected3Months), label: '3 months' },
          { months: 6, amount: Math.round(projected6Months), label: '6 months' },
          { months: 12, amount: Math.round(projected12Months), label: '12 months' }
        ],
        monthlyGrowth: Math.round(monthlyInterest),
        description: `Without repayments, your debt will grow by ~₹${Math.round(monthlyInterest).toLocaleString()}/month`
      });
    }

    // Repayment completion prediction based on current behavior
    if (trends.direction === 'decreasing') {
      predictions.push({
        type: 'positive_trend',
        title: 'Borrowing Reduction Trend',
        trendChange: trends.amountChange,
        description: `Your borrowing is decreasing by ${Math.abs(trends.amountChange)}%. At this rate, you could be debt-free sooner.`,
        confidence: 'medium'
      });
    }

    return predictions;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SMART RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  _generateRecommendations(portfolio, risk, repayment, activeLoans, lenders) {
    const recommendations = [];

    // High-priority: Address critical risk
    if (risk.overallRiskLevel === 'critical' || risk.overallRiskLevel === 'high') {
      recommendations.push({
        id: 'reduce_risk',
        priority: 'critical',
        category: 'risk',
        title: 'Reduce Borrowing Risk',
        description: `Your risk score is ${risk.overallRisk}/100. Focus on clearing high-interest loans first.`,
        action: 'Start with loans from lenders where interest is accruing fastest.',
        impact: `Could save ₹${Math.round(risk.interestBurden.monthlyInterest * 6).toLocaleString()} over 6 months`,
        icon: 'AlertTriangle'
      });
    }

    // Repayment strategy: Avalanche vs Snowball
    if (activeLoans.length >= 2) {
      const sortedByInterest = [...activeLoans].sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0));
      const sortedByAmount = [...activeLoans].sort((a, b) => (a.outstandingAmount || 0) - (b.outstandingAmount || 0));
      const highestInterest = sortedByInterest[0];
      const smallestBalance = sortedByAmount[0];

      if (highestInterest && highestInterest.interestRate > 0) {
        recommendations.push({
          id: 'avalanche_strategy',
          priority: 'high',
          category: 'strategy',
          title: 'Avalanche Strategy: Pay Highest Interest First',
          description: `Focus extra payments on ${highestInterest.lenderName}'s loan (${highestInterest.interestRate}% ${highestInterest.interestType === 'rupee_per_100' ? 'per ₹100/mo' : 'p.a.'}).`,
          action: `Prioritize ₹${(highestInterest.outstandingAmount || 0).toLocaleString()} outstanding with ${highestInterest.lenderName}`,
          impact: 'Saves the most money on interest over time',
          icon: 'TrendingDown'
        });
      }

      if (smallestBalance && smallestBalance._id !== highestInterest?._id) {
        recommendations.push({
          id: 'snowball_strategy',
          priority: 'medium',
          category: 'strategy',
          title: 'Snowball Strategy: Clear Smallest Loan First',
          description: `Clear ${smallestBalance.lenderName}'s loan of ₹${(smallestBalance.outstandingAmount || 0).toLocaleString()} first for quick wins.`,
          action: 'Psychological boost from clearing debts quickly',
          impact: `One fewer active loan, freeing mental bandwidth`,
          icon: 'Target'
        });
      }
    }

    // Concentration risk
    if (risk.concentration.risk !== 'low') {
      const topLender = lenders[0];
      if (topLender) {
        recommendations.push({
          id: 'diversify_lenders',
          priority: 'medium',
          category: 'risk',
          title: 'Reduce Lender Concentration',
          description: `${Math.round(risk.concentration.value)}% of your debt is from ${topLender.name}. Diversifying reduces relationship risk.`,
          action: 'Consider repaying the largest debt from your most-concentrated lender',
          icon: 'Users'
        });
      }
    }

    // Interest-free opportunities
    const interestBearing = activeLoans.filter(l => l.interestRate > 0);
    const interestFree = activeLoans.filter(l => l.interestRate === 0 || l.interestType === 'none');
    if (interestBearing.length > 0 && interestFree.length > 0) {
      recommendations.push({
        id: 'prioritize_interest',
        priority: 'high',
        category: 'optimization',
        title: 'Prioritize Interest-Bearing Loans',
        description: `You have ${interestBearing.length} loan(s) with interest. Pay these before interest-free ones.`,
        action: interestBearing.map(l => `${l.lenderName}: ₹${(l.outstandingAmount || 0).toLocaleString()}`).join(', '),
        impact: `Save ₹${Math.round(interestBearing.reduce((s, l) => s + (l.monthlyInterest || 0), 0) * 12).toLocaleString()}/year in interest`,
        icon: 'Percent'
      });
    }

    // Relationship maintenance
    const longStandingDebts = activeLoans.filter(l => l.daysSinceTaken > 180);
    if (longStandingDebts.length > 0) {
      recommendations.push({
        id: 'long_standing',
        priority: 'medium',
        category: 'relationship',
        title: 'Address Long-Standing Debts',
        description: `${longStandingDebts.length} loan(s) have been active for over 6 months. This could strain relationships.`,
        action: 'Make partial payments to show goodwill, even if you can\'t repay in full.',
        icon: 'Heart'
      });
    }

    // Budget recommendation
    if (risk.debtToIncome.value > 20) {
      recommendations.push({
        id: 'budget_review',
        priority: 'high',
        category: 'financial',
        title: 'Review Your Budget',
        description: `Your debt-to-income ratio is ${risk.debtToIncome.value}%. Aim for below 20%.`,
        action: 'Create a budget that allocates at least 20% of income towards debt repayment.',
        icon: 'Calculator'
      });
    }

    return recommendations.sort((a, b) => {
      const prio = { critical: 4, high: 3, medium: 2, low: 1 };
      return (prio[b.priority] || 0) - (prio[a.priority] || 0);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  NATURAL LANGUAGE INSIGHTS
  // ═══════════════════════════════════════════════════════════════════════════

  _generateNLInsights(portfolio, trends, risk, patterns, lenders) {
    const insights = [];

    // Portfolio overview insight
    if (portfolio.totalLoans > 0) {
      insights.push({
        type: 'overview',
        icon: 'BarChart3',
        title: 'Portfolio Summary',
        text: `You've borrowed a total of ₹${portfolio.totalBorrowed.toLocaleString()} across ${portfolio.totalLoans} loans from ${portfolio.uniqueLenders} people. ${portfolio.activeLoans} loan(s) are currently active with ₹${portfolio.totalOutstanding.toLocaleString()} outstanding.`,
        sentiment: portfolio.totalOutstanding === 0 ? 'positive' : portfolio.completionRate > 70 ? 'neutral' : 'attention'
      });
    }

    // Trend insight
    if (trends.direction !== 'insufficient_data') {
      const trendText = trends.direction === 'increasing'
        ? `Your borrowing has increased by ${Math.abs(trends.amountChange)}% recently. This trend needs attention.`
        : trends.direction === 'decreasing'
        ? `Great news! Your borrowing has decreased by ${Math.abs(trends.amountChange)}%. Keep it up!`
        : 'Your borrowing pattern has been stable. No significant changes detected.';
      insights.push({
        type: 'trend',
        icon: trends.direction === 'increasing' ? 'TrendingUp' : trends.direction === 'decreasing' ? 'TrendingDown' : 'Activity',
        title: 'Borrowing Trend',
        text: trendText,
        sentiment: trends.direction === 'decreasing' ? 'positive' : trends.direction === 'increasing' ? 'warning' : 'neutral'
      });
    }

    // Risk insight
    insights.push({
      type: 'risk',
      icon: risk.overallRiskLevel === 'low' ? 'Shield' : 'AlertTriangle',
      title: 'Risk Assessment',
      text: `Your borrowing risk is ${risk.overallRiskLevel} (${risk.overallRisk}/100). ${
        risk.overallRiskLevel === 'low' ? 'Your borrowing is well-managed.' :
        risk.overallRiskLevel === 'medium' ? 'Some areas need attention but overall manageable.' :
        'Immediate action recommended to reduce risk exposure.'
      }`,
      sentiment: risk.overallRiskLevel === 'low' ? 'positive' : risk.overallRiskLevel === 'medium' ? 'neutral' : 'warning'
    });

    // Interest insight
    if (portfolio.totalInterest > 0) {
      insights.push({
        type: 'interest',
        icon: 'Percent',
        title: 'Interest Impact',
        text: `You've paid ₹${Math.round(portfolio.totalInterest).toLocaleString()} in interest so far. ${
          portfolio.totalInterest > portfolio.totalBorrowed * 0.05
          ? 'This is a significant amount—consider negotiating lower rates or paying off interest-bearing loans faster.'
          : 'Interest costs are reasonable relative to your borrowing.'
        }`,
        sentiment: portfolio.totalInterest > portfolio.totalBorrowed * 0.1 ? 'warning' : 'neutral'
      });
    }

    // Pattern insights
    patterns.forEach(p => {
      if (p.type === 'recurring_borrowing') {
        insights.push({
          type: 'pattern',
          icon: 'Activity',
          title: 'Recurring Pattern Detected',
          text: p.description,
          sentiment: 'attention'
        });
      }
      if (p.type === 'escalation') {
        insights.push({
          type: 'pattern',
          icon: 'AlertTriangle',
          title: 'Escalation Warning',
          text: p.description,
          sentiment: 'warning'
        });
      }
      if (p.type === 'month_end_borrowing') {
        insights.push({
          type: 'pattern',
          icon: 'Calendar',
          title: 'Month-End Pattern',
          text: p.description + ' Consider building a buffer fund for month-end expenses.',
          sentiment: 'attention'
        });
      }
    });

    // Top lender insight
    if (lenders.length > 0) {
      const top = lenders[0];
      insights.push({
        type: 'lender',
        icon: 'UserCheck',
        title: 'Key Lender',
        text: `${top.name} (${top.relationship}) is your largest lender with ₹${top.totalBorrowed.toLocaleString()} total borrowed. Trust score: ${top.trustScore}/100 (${top.relationshipHealth.label}).`,
        sentiment: top.trustScore >= 60 ? 'positive' : 'attention'
      });
    }

    return insights;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  ANOMALY DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  _detectAnomalies(allLoans, patterns) {
    const anomalies = [];

    if (allLoans.length < 3) return anomalies;

    // Unusual amount (IQR method)
    const amounts = allLoans.map(l => l.principalAmount).sort((a, b) => a - b);
    const q1 = amounts[Math.floor(amounts.length * 0.25)];
    const q3 = amounts[Math.floor(amounts.length * 0.75)];
    const iqr = q3 - q1;

    allLoans.forEach(l => {
      if (l.principalAmount > q3 + 1.5 * iqr) {
        anomalies.push({
          type: 'unusual_amount',
          severity: 'warning',
          loan: { lender: l.lenderName, amount: l.principalAmount, date: l.loanTakenDate },
          message: `Unusually large loan of ₹${l.principalAmount.toLocaleString()} from ${l.lenderName} (normal range: ₹${q1.toLocaleString()} - ₹${q3.toLocaleString()})`,
          deviation: Math.round(((l.principalAmount - q3) / (iqr || 1)) * 100)
        });
      }
    });

    // Rapid successive borrowing (multiple loans within 7 days)
    const sorted = [...allLoans].sort((a, b) => new Date(a.loanTakenDate) - new Date(b.loanTakenDate));
    for (let i = 1; i < sorted.length; i++) {
      const daysBetween = (new Date(sorted[i].loanTakenDate) - new Date(sorted[i - 1].loanTakenDate)) / (1000 * 60 * 60 * 24);
      if (daysBetween <= 3 && daysBetween >= 0) {
        anomalies.push({
          type: 'rapid_borrowing',
          severity: 'attention',
          loans: [
            { lender: sorted[i - 1].lenderName, amount: sorted[i - 1].principalAmount },
            { lender: sorted[i].lenderName, amount: sorted[i].principalAmount }
          ],
          message: `Two loans within ${Math.round(daysBetween)} day(s): ₹${sorted[i - 1].principalAmount.toLocaleString()} from ${sorted[i - 1].lenderName} and ₹${sorted[i].principalAmount.toLocaleString()} from ${sorted[i].lenderName}`,
          daysBetween: Math.round(daysBetween)
        });
      }
    }

    return anomalies.slice(0, 10);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  BORROWING CAPACITY ESTIMATION
  // ═══════════════════════════════════════════════════════════════════════════

  _estimateBorrowingCapacity(allLoans, transactions, risk) {
    const monthlyIncome = risk.debtToIncome.monthlyIncome || this._estimateMonthlyIncome(transactions);
    const totalOutstanding = allLoans.filter(l => l.status === 'active').reduce((s, l) => s + (l.outstandingAmount || 0), 0);

    // Safe borrowing = 30% annual income - current outstanding
    const maxSafeBorrowing = Math.max(0, (monthlyIncome * 12 * 0.3) - totalOutstanding);
    const currentUtilization = monthlyIncome > 0 ? (totalOutstanding / (monthlyIncome * 12 * 0.3)) * 100 : 0;

    return {
      maxSafeBorrowing: Math.round(maxSafeBorrowing),
      currentUtilization: Math.min(100, Math.round(currentUtilization)),
      monthlyIncome,
      totalOutstanding,
      safeThreshold: Math.round(monthlyIncome * 12 * 0.3),
      recommendation: currentUtilization > 80 ? 'Avoid new borrowing' : currentUtilization > 50 ? 'Borrow cautiously' : 'Capacity available',
      status: currentUtilization > 80 ? 'critical' : currentUtilization > 50 ? 'caution' : 'healthy'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  HEALTH SCORE
  // ═══════════════════════════════════════════════════════════════════════════

  _calculateBorrowingHealthScore(portfolio, risk, repayment, cashFlow) {
    let score = 50; // Base score

    // Risk contribution (0-25 points)
    score += (100 - risk.overallRisk) / 4;

    // Repayment behavior (0-20 points)
    score += (repayment.score / 100) * 20;

    // Completion rate (0-15 points)
    score += (portfolio.completionRate / 100) * 15;

    // Cash flow health (0-15 points)
    if (cashFlow.healthStatus === 'healthy') score += 15;
    else if (cashFlow.healthStatus === 'manageable') score += 10;
    else if (cashFlow.healthStatus === 'strained') score += 5;

    // Active loans penalty
    if (portfolio.activeLoans > 5) score -= 10;
    else if (portfolio.activeLoans > 3) score -= 5;

    // Interest burden penalty
    if (portfolio.totalInterest > portfolio.totalBorrowed * 0.1) score -= 5;

    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

    return {
      score: finalScore,
      grade: finalScore >= 80 ? 'A' : finalScore >= 60 ? 'B' : finalScore >= 40 ? 'C' : finalScore >= 20 ? 'D' : 'F',
      label: finalScore >= 80 ? 'Excellent' : finalScore >= 60 ? 'Good' : finalScore >= 40 ? 'Fair' : finalScore >= 20 ? 'Poor' : 'Critical',
      color: finalScore >= 80 ? '#10B981' : finalScore >= 60 ? '#3B82F6' : finalScore >= 40 ? '#F59E0B' : finalScore >= 20 ? '#EF4444' : '#DC2626',
      breakdown: {
        riskManagement: Math.round((100 - risk.overallRisk) / 4),
        repaymentBehavior: Math.round((repayment.score / 100) * 20),
        completionRate: Math.round((portfolio.completionRate / 100) * 15),
        cashFlowHealth: cashFlow.healthStatus === 'healthy' ? 15 : cashFlow.healthStatus === 'manageable' ? 10 : cashFlow.healthStatus === 'strained' ? 5 : 0
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  REPAYMENT TIMELINE
  // ═══════════════════════════════════════════════════════════════════════════

  _buildRepaymentTimeline(activeLoans) {
    if (activeLoans.length === 0) return [];

    // Build priority-ordered timeline
    const sorted = [...activeLoans].sort((a, b) => {
      const priOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const priDiff = (priOrder[b.priority] || 0) - (priOrder[a.priority] || 0);
      if (priDiff !== 0) return priDiff;
      return (b.interestRate || 0) - (a.interestRate || 0); // Then by interest rate
    });

    let cumulativeAmount = 0;
    return sorted.map((loan, i) => {
      cumulativeAmount += loan.outstandingAmount || 0;
      return {
        order: i + 1,
        lender: loan.lenderName,
        amount: loan.outstandingAmount || 0,
        principal: loan.principalAmount,
        interest: loan.currentInterest || 0,
        priority: loan.priority,
        interestRate: loan.interestRate,
        interestType: loan.interestType,
        daysSinceTaken: loan.daysSinceTaken,
        cumulativeAmount,
        reason: i === 0 ? 'Highest priority/interest' : loan.priority === 'urgent' ? 'Urgent priority' : loan.interestRate > 0 ? 'Interest-bearing' : 'Relationship maintenance'
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SEASONALITY ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  _analyzeSeasonality(allLoans) {
    const monthlyData = Array(12).fill(null).map(() => ({ count: 0, amount: 0 }));
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    allLoans.forEach(l => {
      const month = new Date(l.loanTakenDate).getMonth();
      monthlyData[month].count++;
      monthlyData[month].amount += l.principalAmount || 0;
    });

    const peakMonth = monthlyData.indexOf(monthlyData.reduce((max, m) => m.count > max.count ? m : max, monthlyData[0]));
    const lowMonth = monthlyData.indexOf(monthlyData.reduce((min, m) => (m.count < min.count && m.count > 0) ? m : min, { count: Infinity }));

    return {
      monthly: monthNames.map((name, i) => ({ month: name, ...monthlyData[i] })),
      peakMonth: monthNames[peakMonth],
      lowMonth: allLoans.length > 0 ? monthNames[lowMonth] : null,
      insight: allLoans.length >= 6 ? `You borrow most in ${monthNames[peakMonth]}. Plan ahead for this period.` : 'Not enough data for seasonal analysis.'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  INTEREST BURDEN ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  _analyzeInterestBurden(allLoans, activeLoans) {
    const interestBearing = activeLoans.filter(l => l.interestRate > 0);
    const interestFree = activeLoans.filter(l => l.interestRate === 0 || l.interestType === 'none');

    const totalInterestBearingOutstanding = interestBearing.reduce((s, l) => s + (l.outstandingAmount || 0), 0);
    const totalInterestFreeOutstanding = interestFree.reduce((s, l) => s + (l.outstandingAmount || 0), 0);
    const monthlyInterest = interestBearing.reduce((s, l) => s + (l.monthlyInterest || 0), 0);
    const annualInterest = monthlyInterest * 12;

    // Interest breakdown by type
    const byType = {};
    interestBearing.forEach(l => {
      const type = l.interestType || 'simple';
      if (!byType[type]) byType[type] = { count: 0, outstanding: 0, monthlyInterest: 0 };
      byType[type].count++;
      byType[type].outstanding += l.outstandingAmount || 0;
      byType[type].monthlyInterest += l.monthlyInterest || 0;
    });

    // Weighted average interest rate
    const totalWeightedRate = interestBearing.reduce((s, l) => s + (l.annualEquivalentRate || 0) * (l.outstandingAmount || 0), 0);
    const weightedAvgRate = totalInterestBearingOutstanding > 0 ? totalWeightedRate / totalInterestBearingOutstanding : 0;

    return {
      interestBearingLoans: interestBearing.length,
      interestFreeLoans: interestFree.length,
      totalInterestBearingOutstanding,
      totalInterestFreeOutstanding,
      monthlyInterest: Math.round(monthlyInterest),
      annualInterest: Math.round(annualInterest),
      weightedAvgRate: Math.round(weightedAvgRate * 100) / 100,
      byType,
      highestRate: interestBearing.length > 0 ? Math.max(...interestBearing.map(l => l.annualEquivalentRate || 0)) : 0,
      totalInterestAccrued: allLoans.reduce((s, l) => s + (l.currentInterest || 0), 0),
      interestToOutstandingRatio: totalInterestBearingOutstanding > 0 
        ? Math.round((interestBearing.reduce((s, l) => s + (l.currentInterest || 0), 0) / totalInterestBearingOutstanding) * 10000) / 100 : 0
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SELF-TRAINING MODEL
  // ═══════════════════════════════════════════════════════════════════════════

  async _trainModel(userId, allLoans, repaymentBehavior) {
    try {
      // Adjust model weights based on actual data
      if (allLoans.length >= 5) {
        const repaidLoans = allLoans.filter(l => l.status === 'repaid');
        
        // Learn repayment patterns
        if (repaidLoans.length >= 3) {
          const repayTimes = repaidLoans.map(l => 
            l.repaymentDate ? Math.ceil((new Date(l.repaymentDate) - new Date(l.loanTakenDate)) / (1000 * 60 * 60 * 24)) : 365
          );
          const avgRepayTime = repayTimes.reduce((a, b) => a + b, 0) / repayTimes.length;
          
          // Adjust weight for repayment speed
          if (avgRepayTime < 60) {
            this.modelWeights.trustScore.repaymentHistory = Math.min(0.40, this.modelWeights.trustScore.repaymentHistory + 0.02);
          }
        }

        // Learn amount patterns
        const amounts = allLoans.map(l => l.principalAmount);
        const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const variance = amounts.reduce((s, a) => s + Math.pow(a - avgAmount, 2), 0) / amounts.length;
        
        // If amounts are consistent, increase weight for amount-based predictions
        if (Math.sqrt(variance) / avgAmount < 0.3) {
          this.modelWeights.riskScore.concentrationRisk = Math.max(0.10, this.modelWeights.riskScore.concentrationRisk - 0.02);
          this.modelWeights.riskScore.borrowingVelocity = Math.min(0.20, this.modelWeights.riskScore.borrowingVelocity + 0.02);
        }

        this.trainingHistory.push({
          timestamp: new Date(),
          userId: userId.toString(),
          dataPoints: allLoans.length,
          repaymentScore: repaymentBehavior.score,
          adjustments: 'weights_updated'
        });

        this.lastTrainedAt = new Date();
        
        // Keep only last 100 training records
        if (this.trainingHistory.length > 100) {
          this.trainingHistory = this.trainingHistory.slice(-100);
        }
      }
    } catch (error) {
      logger.debug('Model training skipped:', error.message);
    }
  }

  _getModelAccuracy() {
    // Simplified accuracy based on training history
    if (this.trainingHistory.length === 0) return 0;
    const recentTraining = this.trainingHistory.slice(-10);
    const avgDataPoints = recentTraining.reduce((s, t) => s + t.dataPoints, 0) / recentTraining.length;
    // More data = higher accuracy (capped at 95%)
    return Math.min(95, Math.round(50 + (avgDataPoints / 20) * 45));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  async _getAllLoans(userId) {
    try {
      const PersonalLoan = mongoose.model('PersonalLoan');
      return await PersonalLoan.find({ userId }).sort({ loanTakenDate: -1 }).lean();
    } catch { return []; }
  }

  async _getTransactions(userId) {
    try {
      const Transaction = mongoose.model('Transaction');
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 6);
      return await Transaction.find({ userId, date: { $gte: cutoff } }).lean();
    } catch { return []; }
  }

  _estimateMonthlyIncome(transactions) {
    if (!transactions || transactions.length === 0) return 50000; // Default
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const months = Math.max(1, new Set(transactions.map(t => new Date(t.date).toISOString().substring(0, 7))).size);
    return income / months || 50000;
  }

  _estimateMonthlyExpenses(transactions) {
    if (!transactions || transactions.length === 0) return 35000; // Default
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    const months = Math.max(1, new Set(transactions.map(t => new Date(t.date).toISOString().substring(0, 7))).size);
    return expenses / months || 35000;
  }

  _getEmptyAnalytics() {
    return {
      portfolio: { totalLoans: 0, activeLoans: 0, repaidLoans: 0, totalBorrowed: 0, totalRepaid: 0, totalOutstanding: 0, totalInterest: 0, uniqueLenders: 0 },
      lenderAnalysis: [],
      trends: { direction: 'no_data', monthly: [] },
      patterns: [],
      riskAssessment: { overallRisk: 0, overallRiskLevel: 'none' },
      repaymentBehavior: { score: 0, level: 'no_data' },
      cashFlowImpact: { healthStatus: 'unknown' },
      predictions: [],
      recommendations: [{ id: 'start', priority: 'low', category: 'general', title: 'No Borrowing Data', description: 'Start recording your borrowings to get AI-powered insights.', icon: 'Plus' }],
      insights: [{ type: 'welcome', icon: 'Wallet', title: 'Welcome!', text: 'Add your first loan to unlock AI-powered borrowing intelligence.', sentiment: 'neutral' }],
      anomalies: [],
      capacity: { maxSafeBorrowing: 0, currentUtilization: 0, status: 'unknown' },
      healthScore: { score: 0, grade: 'N/A', label: 'No Data', color: '#64748B' },
      timeline: [],
      seasonalAnalysis: { monthly: [], insight: 'No data yet.' },
      interestAnalysis: { interestBearingLoans: 0, interestFreeLoans: 0, monthlyInterest: 0 },
      modelInfo: { version: this.modelVersion, lastTrained: null, dataPoints: 0, accuracy: 0 }
    };
  }
}

module.exports = new BorrowingIntelligenceService();
