const RecurringTransactionService = require('../services/recurringTransactionService');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

describe('RecurringTransactionService', () => {
  let userId;

  beforeEach(() => {
    userId = new mongoose.Types.ObjectId();
  });

  describe('groupSimilarTransactions', () => {
    it('should group transactions with similar descriptions', () => {
      const transactions = [
        { description: 'Netflix Subscription', amount: 199, date: new Date('2024-01-01') },
        { description: 'Netflix Payment', amount: 199, date: new Date('2024-02-01') },
        { description: 'Amazon Prime', amount: 299, date: new Date('2024-01-15') },
        { description: 'Amazon Prime Video', amount: 299, date: new Date('2024-02-15') }
      ];

      const groups = RecurringTransactionService.groupSimilarTransactions(transactions);

      expect(groups.length).toBeGreaterThan(0);
      // Netflix transactions should be grouped together
      const netflixGroup = groups.find(g => 
        g.some(t => t.description.toLowerCase().includes('netflix'))
      );
      expect(netflixGroup).toBeDefined();
      expect(netflixGroup.length).toBe(2);
    });

    it('should not group transactions with different amounts', () => {
      const transactions = [
        { description: 'Swiggy Order', amount: 299, date: new Date('2024-01-01') },
        { description: 'Swiggy Order', amount: 599, date: new Date('2024-01-08') }
      ];

      const groups = RecurringTransactionService.groupSimilarTransactions(transactions);

      // Should be in different groups due to amount variance
      expect(groups.length).toBe(2);
    });

    it('should handle empty transaction array', () => {
      const groups = RecurringTransactionService.groupSimilarTransactions([]);
      expect(groups).toEqual([]);
    });
  });

  describe('isSimilarTransaction', () => {
    it('should return true for similar descriptions with Levenshtein distance', () => {
      const t1 = { description: 'Netflix Subscription', amount: 199 };
      const t2 = { description: 'Netflix Payment', amount: 199 };

      const result = RecurringTransactionService.isSimilarTransaction(t1, t2);
      expect(result).toBe(true);
    });

    it('should return false for different merchants', () => {
      const t1 = { description: 'Netflix', amount: 199 };
      const t2 = { description: 'Amazon Prime', amount: 199 };

      const result = RecurringTransactionService.isSimilarTransaction(t1, t2);
      expect(result).toBe(false);
    });

    it('should return false when amount variance exceeds threshold', () => {
      const t1 = { description: 'Netflix', amount: 199 };
      const t2 = { description: 'Netflix', amount: 299 }; // >5% variance

      const result = RecurringTransactionService.isSimilarTransaction(t1, t2);
      expect(result).toBe(false);
    });

    it('should handle missing descriptions gracefully', () => {
      const t1 = { amount: 199 };
      const t2 = { amount: 199 };

      const result = RecurringTransactionService.isSimilarTransaction(t1, t2);
      expect(result).toBe(true); // Similar amounts, no descriptions
    });
  });

  describe('detectPattern', () => {
    it('should detect monthly recurring pattern', () => {
      const transactions = [
        { date: new Date('2024-01-01') },
        { date: new Date('2024-02-01') },
        { date: new Date('2024-03-01') },
        { date: new Date('2024-04-01') }
      ];

      const pattern = RecurringTransactionService.detectPattern(transactions);

      expect(pattern.type).toBe('monthly');
      expect(pattern.averageInterval).toBeGreaterThanOrEqual(28);
      expect(pattern.averageInterval).toBeLessThanOrEqual(32);
    });

    it('should detect weekly recurring pattern', () => {
      const transactions = [
        { date: new Date('2024-01-01') },
        { date: new Date('2024-01-08') },
        { date: new Date('2024-01-15') },
        { date: new Date('2024-01-22') }
      ];

      const pattern = RecurringTransactionService.detectPattern(transactions);

      expect(pattern.type).toBe('weekly');
      expect(pattern.averageInterval).toBeCloseTo(7, 1);
    });

    it('should detect daily recurring pattern', () => {
      const transactions = [
        { date: new Date('2024-01-01') },
        { date: new Date('2024-01-02') },
        { date: new Date('2024-01-03') },
        { date: new Date('2024-01-04') }
      ];

      const pattern = RecurringTransactionService.detectPattern(transactions);

      expect(pattern.type).toBe('daily');
      expect(pattern.averageInterval).toBeLessThanOrEqual(1.5);
    });

    it('should detect quarterly pattern', () => {
      const transactions = [
        { date: new Date('2024-01-01') },
        { date: new Date('2024-04-01') },
        { date: new Date('2024-07-01') },
        { date: new Date('2024-10-01') }
      ];

      const pattern = RecurringTransactionService.detectPattern(transactions);

      expect(pattern.type).toBe('quarterly');
      expect(pattern.averageInterval).toBeGreaterThanOrEqual(85);
      expect(pattern.averageInterval).toBeLessThanOrEqual(95);
    });

    it('should handle irregular patterns', () => {
      const transactions = [
        { date: new Date('2024-01-01') },
        { date: new Date('2024-01-05') },
        { date: new Date('2024-02-20') },
        { date: new Date('2024-05-10') }
      ];

      const pattern = RecurringTransactionService.detectPattern(transactions);

      expect(pattern.type).toBe('custom');
      expect(pattern.averageInterval).toBeGreaterThan(0);
    });

    it('should require at least 2 transactions', () => {
      const transactions = [{ date: new Date('2024-01-01') }];

      const pattern = RecurringTransactionService.detectPattern(transactions);

      expect(pattern.type).toBe('unknown');
    });
  });

  describe('calculateConfidence', () => {
    it('should return high confidence for consistent intervals and amounts', () => {
      const intervals = [30, 30, 31, 30]; // Monthly, very consistent
      const amounts = [199, 199, 199, 199]; // Same amount

      const confidence = RecurringTransactionService.calculateConfidence(
        intervals,
        amounts,
        'monthly'
      );

      expect(confidence).toBeGreaterThan(85);
      expect(confidence).toBeLessThanOrEqual(100);
    });

    it('should return low confidence for inconsistent intervals', () => {
      const intervals = [7, 15, 30, 60]; // Irregular
      const amounts = [199, 199, 199, 199];

      const confidence = RecurringTransactionService.calculateConfidence(
        intervals,
        amounts,
        'custom'
      );

      expect(confidence).toBeLessThan(60);
    });

    it('should return medium confidence for varying amounts', () => {
      const intervals = [30, 30, 31, 30]; // Consistent
      const amounts = [199, 205, 195, 210]; // Slightly varying

      const confidence = RecurringTransactionService.calculateConfidence(
        intervals,
        amounts,
        'monthly'
      );

      expect(confidence).toBeGreaterThan(50);
      expect(confidence).toBeLessThan(85);
    });

    it('should handle edge cases', () => {
      const confidence1 = RecurringTransactionService.calculateConfidence([], [], 'unknown');
      expect(confidence1).toBeLessThanOrEqual(30);

      const confidence2 = RecurringTransactionService.calculateConfidence([30], [199], 'monthly');
      expect(confidence2).toBeGreaterThan(0);
    });
  });

  describe('detectRecurringTransactions - Integration', () => {
    beforeEach(async () => {
      // Clear transactions collection
      await Transaction.deleteMany({});
    });

    it('should detect monthly subscription patterns from database', async () => {
      // Create monthly Netflix transactions
      const netflixTransactions = [
        {
          userId,
          description: 'Netflix Subscription',
          amount: -199,
          type: 'debit',
          date: new Date('2024-01-01'),
          category: 'Entertainment'
        },
        {
          userId,
          description: 'Netflix Payment',
          amount: -199,
          type: 'debit',
          date: new Date('2024-02-01'),
          category: 'Entertainment'
        },
        {
          userId,
          description: 'Netflix Subscription',
          amount: -199,
          type: 'debit',
          date: new Date('2024-03-01'),
          category: 'Entertainment'
        },
        {
          userId,
          description: 'Netflix Subscription',
          amount: -199,
          type: 'debit',
          date: new Date('2024-04-01'),
          category: 'Entertainment'
        }
      ];

      await Transaction.insertMany(netflixTransactions);

      const patterns = await RecurringTransactionService.detectRecurringTransactions(
        userId.toString(),
        { minOccurrences: 3 }
      );

      expect(patterns.length).toBeGreaterThan(0);
      const netflixPattern = patterns.find(p => 
        p.description.toLowerCase().includes('netflix')
      );
      expect(netflixPattern).toBeDefined();
      expect(netflixPattern.frequency).toBe('monthly');
      expect(netflixPattern.transactionCount).toBe(4);
      expect(netflixPattern.averageAmount).toBe(-199);
    });

    it('should filter by minimum occurrences', async () => {
      // Create 2 Netflix transactions (below minOccurrences of 3)
      await Transaction.insertMany([
        {
          userId,
          description: 'Netflix',
          amount: -199,
          type: 'debit',
          date: new Date('2024-01-01')
        },
        {
          userId,
          description: 'Netflix',
          amount: -199,
          type: 'debit',
          date: new Date('2024-02-01')
        }
      ]);

      const patterns = await RecurringTransactionService.detectRecurringTransactions(
        userId.toString(),
        { minOccurrences: 3 }
      );

      expect(patterns.length).toBe(0);
    });

    it('should filter by confidence threshold', async () => {
      // Create inconsistent transactions (low confidence)
      await Transaction.insertMany([
        {
          userId,
          description: 'Random Payment 1',
          amount: -100,
          type: 'debit',
          date: new Date('2024-01-01')
        },
        {
          userId,
          description: 'Random Payment 2',
          amount: -200,
          type: 'debit',
          date: new Date('2024-01-15')
        },
        {
          userId,
          description: 'Random Payment 3',
          amount: -300,
          type: 'debit',
          date: new Date('2024-03-01')
        }
      ]);

      const patterns = await RecurringTransactionService.detectRecurringTransactions(
        userId.toString(),
        { minConfidence: 70 }
      );

      expect(patterns.length).toBe(0); // Low confidence patterns filtered out
    });

    it('should handle date range filtering', async () => {
      await Transaction.insertMany([
        {
          userId,
          description: 'Gym Membership',
          amount: -1500,
          type: 'debit',
          date: new Date('2024-01-01')
        },
        {
          userId,
          description: 'Gym Membership',
          amount: -1500,
          type: 'debit',
          date: new Date('2024-02-01')
        },
        {
          userId,
          description: 'Gym Membership',
          amount: -1500,
          type: 'debit',
          date: new Date('2024-03-01')
        },
        {
          userId,
          description: 'Gym Membership',
          amount: -1500,
          type: 'debit',
          date: new Date('2024-06-01') // Outside range
        }
      ]);

      const patterns = await RecurringTransactionService.detectRecurringTransactions(
        userId.toString(),
        {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-03-31')
        }
      );

      expect(patterns.length).toBeGreaterThan(0);
      const gymPattern = patterns[0];
      expect(gymPattern.transactionCount).toBe(3); // Should only include 3 transactions in range
    });
  });

  describe('predictFutureTransactions', () => {
    beforeEach(async () => {
      await Transaction.deleteMany({});
    });

    it('should predict future monthly transactions', async () => {
      // Create consistent monthly pattern
      await Transaction.insertMany([
        {
          userId,
          description: 'Spotify Premium',
          amount: -119,
          type: 'debit',
          date: new Date('2024-01-05'),
          category: 'Entertainment'
        },
        {
          userId,
          description: 'Spotify Premium',
          amount: -119,
          type: 'debit',
          date: new Date('2024-02-05'),
          category: 'Entertainment'
        },
        {
          userId,
          description: 'Spotify Premium',
          amount: -119,
          type: 'debit',
          date: new Date('2024-03-05'),
          category: 'Entertainment'
        }
      ]);

      const predictions = await RecurringTransactionService.predictFutureTransactions(
        userId.toString(),
        3 // Predict next 3 months
      );

      expect(predictions.length).toBeGreaterThan(0);
      const spotifyPredictions = predictions.filter(p => 
        p.description.toLowerCase().includes('spotify')
      );
      expect(spotifyPredictions.length).toBeGreaterThanOrEqual(1);
      expect(spotifyPredictions[0].predictedAmount).toBe(-119);
      expect(spotifyPredictions[0].frequency).toBe('monthly');
    });

    it('should predict with high confidence for consistent patterns', async () => {
      await Transaction.insertMany([
        {
          userId,
          description: 'Electricity Bill',
          amount: -2000,
          type: 'debit',
          date: new Date('2024-01-10')
        },
        {
          userId,
          description: 'Electricity Bill',
          amount: -2000,
          type: 'debit',
          date: new Date('2024-02-10')
        },
        {
          userId,
          description: 'Electricity Bill',
          amount: -2000,
          type: 'debit',
          date: new Date('2024-03-10')
        },
        {
          userId,
          description: 'Electricity Bill',
          amount: -2000,
          type: 'debit',
          date: new Date('2024-04-10')
        }
      ]);

      const predictions = await RecurringTransactionService.predictFutureTransactions(
        userId.toString(),
        2
      );

      const electricityPrediction = predictions.find(p => 
        p.description.toLowerCase().includes('electricity')
      );
      expect(electricityPrediction).toBeDefined();
      expect(electricityPrediction.confidence).toBeGreaterThan(80);
    });

    it('should return empty array when no patterns found', async () => {
      const predictions = await RecurringTransactionService.predictFutureTransactions(
        userId.toString(),
        3
      );

      expect(predictions).toEqual([]);
    });
  });

  describe('getStatistics', () => {
    beforeEach(async () => {
      await Transaction.deleteMany({});
    });

    it('should return statistics for recurring transactions', async () => {
      // Create various recurring patterns
      await Transaction.insertMany([
        // Monthly subscriptions
        {
          userId,
          description: 'Netflix',
          amount: -199,
          type: 'debit',
          date: new Date('2024-01-01'),
          category: 'Entertainment',
          isRecurring: true,
          recurringPattern: 'monthly'
        },
        {
          userId,
          description: 'Spotify',
          amount: -119,
          type: 'debit',
          date: new Date('2024-01-05'),
          category: 'Entertainment',
          isRecurring: true,
          recurringPattern: 'monthly'
        },
        // Weekly grocery
        {
          userId,
          description: 'Grocery Store',
          amount: -1500,
          type: 'debit',
          date: new Date('2024-01-01'),
          category: 'Groceries',
          isRecurring: true,
          recurringPattern: 'weekly'
        }
      ]);

      const stats = await RecurringTransactionService.getStatistics(userId.toString());

      expect(stats).toBeDefined();
      expect(stats.totalRecurring).toBeGreaterThan(0);
      expect(stats.byFrequency).toBeDefined();
      expect(stats.byCategory).toBeDefined();
    });

    it('should calculate total monthly spending on recurring transactions', async () => {
      await Transaction.insertMany([
        {
          userId,
          description: 'Netflix',
          amount: -199,
          type: 'debit',
          date: new Date('2024-01-01'),
          isRecurring: true,
          recurringPattern: 'monthly'
        },
        {
          userId,
          description: 'Gym',
          amount: -1500,
          type: 'debit',
          date: new Date('2024-01-01'),
          isRecurring: true,
          recurringPattern: 'monthly'
        }
      ]);

      const stats = await RecurringTransactionService.getStatistics(userId.toString());

      expect(stats.monthlyTotal).toBeDefined();
      // Should approximate monthly spending
    });
  });
});
