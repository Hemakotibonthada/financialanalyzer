const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

/**
 * Recurring Transaction Detection Service
 * Detects patterns in transactions to identify recurring payments
 */
class RecurringTransactionService {
  constructor() {
    // Configuration for pattern detection
    this.config = {
      minOccurrences: 2, // Minimum number of occurrences to consider as recurring
      amountTolerance: 0.05, // 5% tolerance for amount variation
      daysTolerance: 3, // Days tolerance for date variation
      minDaysBetween: 7, // Minimum days between transactions to consider as recurring
      maxDaysBetween: 400, // Maximum days between transactions (13 months)
      patterns: {
        daily: { days: 1, tolerance: 1 },
        weekly: { days: 7, tolerance: 2 },
        biweekly: { days: 14, tolerance: 3 },
        monthly: { days: 30, tolerance: 3 },
        quarterly: { days: 90, tolerance: 5 },
        yearly: { days: 365, tolerance: 7 }
      }
    };
  }

  /**
   * Detect recurring transactions for a user
   */
  async detectRecurringTransactions(userId, options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last 1 year
        endDate = new Date(),
        minAmount = null,
        category = null
      } = options;

      // Fetch user transactions
      const query = {
        userId,
        date: { $gte: startDate, $lte: endDate },
        isRecurring: { $ne: true } // Exclude already marked recurring
      };

      if (minAmount) query.amount = { $gte: minAmount };
      if (category) query.category = category;

      const transactions = await Transaction.find(query)
        .sort({ date: 1 })
        .lean();

      logger.info(`Analyzing ${transactions.length} transactions for recurring patterns`);

      // Group transactions by similar characteristics
      const groups = this.groupSimilarTransactions(transactions);
      
      // Detect patterns in each group
      const recurringPatterns = [];
      for (const group of groups) {
        const pattern = this.detectPattern(group);
        if (pattern) {
          recurringPatterns.push(pattern);
        }
      }

      logger.info(`Found ${recurringPatterns.length} recurring patterns`);

      return {
        success: true,
        patterns: recurringPatterns,
        totalTransactions: transactions.length,
        recurringCount: recurringPatterns.reduce((sum, p) => sum + p.transactions.length, 0)
      };
    } catch (error) {
      logger.error('Error detecting recurring transactions:', error);
      throw error;
    }
  }

  /**
   * Group transactions with similar characteristics
   */
  groupSimilarTransactions(transactions) {
    const groups = [];

    for (const transaction of transactions) {
      let foundGroup = false;

      // Try to find an existing group that matches
      for (const group of groups) {
        if (this.isSimilarTransaction(transaction, group[0])) {
          group.push(transaction);
          foundGroup = true;
          break;
        }
      }

      // Create new group if no match found
      if (!foundGroup) {
        groups.push([transaction]);
      }
    }

    // Filter out groups with less than minimum occurrences
    return groups.filter(group => group.length >= this.config.minOccurrences);
  }

  /**
   * Check if two transactions are similar
   */
  isSimilarTransaction(t1, t2) {
    // Check amount similarity (within tolerance)
    const amountDiff = Math.abs(t1.amount - t2.amount);
    const amountAvg = (t1.amount + t2.amount) / 2;
    const amountWithinTolerance = amountDiff / amountAvg <= this.config.amountTolerance;

    if (!amountWithinTolerance) return false;

    // Check merchant/description similarity
    const desc1 = (t1.description || '').toLowerCase();
    const desc2 = (t2.description || '').toLowerCase();
    const merchant1 = (t1.merchantName || '').toLowerCase();
    const merchant2 = (t2.merchantName || '').toLowerCase();

    // Exact match or high similarity
    const descMatch = desc1 === desc2 || this.calculateSimilarity(desc1, desc2) > 0.8;
    const merchantMatch = merchant1 && merchant2 && 
      (merchant1 === merchant2 || this.calculateSimilarity(merchant1, merchant2) > 0.8);

    return descMatch || merchantMatch;
  }

  /**
   * Calculate string similarity (Levenshtein distance based)
   */
  calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Levenshtein distance algorithm
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Detect pattern in a group of transactions
   */
  detectPattern(transactions) {
    if (transactions.length < this.config.minOccurrences) {
      return null;
    }

    // Sort by date
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate intervals between transactions
    const intervals = [];
    for (let i = 1; i < transactions.length; i++) {
      const days = this.daysBetween(transactions[i - 1].date, transactions[i].date);
      intervals.push(days);
    }

    // Identify the pattern type
    const patternType = this.identifyPatternType(intervals);
    if (!patternType) return null;

    // Calculate statistics
    const amounts = transactions.map(t => t.amount);
    const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;

    // Predict next occurrence
    const lastDate = new Date(transactions[transactions.length - 1].date);
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + Math.round(avgInterval));

    // Calculate confidence score
    const confidence = this.calculateConfidence(intervals, amounts, patternType);

    return {
      id: `${transactions[0].userId}_${transactions[0]._id}`,
      patternType,
      frequency: patternType,
      description: transactions[0].description,
      merchantName: transactions[0].merchantName,
      category: transactions[0].category,
      avgAmount,
      minAmount: Math.min(...amounts),
      maxAmount: Math.max(...amounts),
      avgInterval: Math.round(avgInterval),
      occurrences: transactions.length,
      transactions: transactions.map(t => ({
        id: t._id,
        date: t.date,
        amount: t.amount,
        description: t.description
      })),
      firstOccurrence: transactions[0].date,
      lastOccurrence: transactions[transactions.length - 1].date,
      nextPredicted: nextDate,
      confidence,
      isActive: this.isPatternActive(transactions[transactions.length - 1].date, avgInterval)
    };
  }

  /**
   * Identify pattern type from intervals
   */
  identifyPatternType(intervals) {
    const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;

    // Check against known patterns
    for (const [type, pattern] of Object.entries(this.config.patterns)) {
      if (Math.abs(avgInterval - pattern.days) <= pattern.tolerance) {
        // Verify consistency
        const consistent = intervals.every(
          interval => Math.abs(interval - pattern.days) <= pattern.tolerance * 2
        );
        if (consistent) return type;
      }
    }

    // Custom interval if consistent but doesn't match standard patterns
    const maxDeviation = Math.max(...intervals) - Math.min(...intervals);
    if (maxDeviation <= this.config.daysTolerance * 2) {
      return `custom_${Math.round(avgInterval)}_days`;
    }

    return null;
  }

  /**
   * Calculate confidence score for a pattern
   */
  calculateConfidence(intervals, amounts, patternType) {
    let score = 100;

    // Interval consistency (40 points)
    const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
    const intervalVariance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
    const intervalScore = Math.max(0, 40 - (Math.sqrt(intervalVariance) / avgInterval) * 40);
    score = intervalScore;

    // Amount consistency (30 points)
    const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const amountVariance = amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) / amounts.length;
    const amountScore = Math.max(0, 30 - (Math.sqrt(amountVariance) / avgAmount) * 30);
    score += amountScore;

    // Number of occurrences (20 points)
    const occurrenceScore = Math.min(20, (intervals.length + 1) * 4);
    score += occurrenceScore;

    // Pattern type match (10 points)
    const isStandardPattern = !patternType.startsWith('custom_');
    score += isStandardPattern ? 10 : 5;

    return Math.round(Math.min(100, score));
  }

  /**
   * Check if pattern is still active
   */
  isPatternActive(lastDate, avgInterval) {
    const daysSinceLastOccurrence = this.daysBetween(lastDate, new Date());
    return daysSinceLastOccurrence <= avgInterval * 1.5;
  }

  /**
   * Calculate days between two dates
   */
  daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Mark transactions as recurring
   */
  async markAsRecurring(transactionIds, patternId, frequency) {
    try {
      const result = await Transaction.updateMany(
        { _id: { $in: transactionIds } },
        {
          $set: {
            isRecurring: true,
            recurringPattern: patternId,
            recurringFrequency: frequency,
            updatedAt: new Date()
          }
        }
      );

      logger.info(`Marked ${result.modifiedCount} transactions as recurring`);
      return result;
    } catch (error) {
      logger.error('Error marking transactions as recurring:', error);
      throw error;
    }
  }

  /**
   * Predict future recurring transactions
   */
  async predictFutureTransactions(userId, months = 3) {
    try {
      const patterns = await this.detectRecurringTransactions(userId);
      const predictions = [];

      for (const pattern of patterns.patterns) {
        if (!pattern.isActive) continue;

        const predictionsForPattern = [];
        let currentDate = new Date(pattern.nextPredicted);
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + months);

        while (currentDate <= endDate) {
          predictionsForPattern.push({
            date: new Date(currentDate),
            amount: pattern.avgAmount,
            description: pattern.description,
            merchantName: pattern.merchantName,
            category: pattern.category,
            confidence: pattern.confidence,
            patternType: pattern.patternType
          });

          currentDate.setDate(currentDate.getDate() + pattern.avgInterval);
        }

        predictions.push(...predictionsForPattern);
      }

      // Sort by date
      predictions.sort((a, b) => a.date - b.date);

      return {
        success: true,
        predictions,
        months,
        totalPredicted: predictions.length
      };
    } catch (error) {
      logger.error('Error predicting future transactions:', error);
      throw error;
    }
  }

  /**
   * Get recurring transaction statistics
   */
  async getStatistics(userId) {
    try {
      const patterns = await this.detectRecurringTransactions(userId);
      
      const activePatterns = patterns.patterns.filter(p => p.isActive);
      const totalMonthlyAmount = activePatterns
        .filter(p => p.patternType === 'monthly' || p.patternType.includes('30'))
        .reduce((sum, p) => sum + p.avgAmount, 0);

      const byCategory = {};
      const byFrequency = {};

      for (const pattern of patterns.patterns) {
        // By category
        byCategory[pattern.category] = (byCategory[pattern.category] || 0) + pattern.avgAmount;
        
        // By frequency
        byFrequency[pattern.patternType] = (byFrequency[pattern.patternType] || 0) + 1;
      }

      return {
        totalPatterns: patterns.patterns.length,
        activePatterns: activePatterns.length,
        inactivePatterns: patterns.patterns.length - activePatterns.length,
        estimatedMonthlyRecurring: totalMonthlyAmount,
        byCategory,
        byFrequency,
        highConfidencePatterns: patterns.patterns.filter(p => p.confidence >= 80).length
      };
    } catch (error) {
      logger.error('Error getting recurring statistics:', error);
      throw error;
    }
  }
}

module.exports = new RecurringTransactionService();
