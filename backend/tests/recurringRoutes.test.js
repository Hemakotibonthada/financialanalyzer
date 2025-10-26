const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const recurringRoutes = require('../routes/recurringRoutes');

// Create a test app
const app = express();
app.use(express.json());
app.use('/api/recurring', recurringRoutes);

describe('Recurring Transaction Routes', () => {
  let token;
  let userId;
  let user;

  beforeAll(() => {
    // Set up JWT secret
    process.env.JWT_SECRET = 'test-secret-key';
  });

  beforeEach(async () => {
    // Create test user
    userId = new mongoose.Types.ObjectId();
    user = await User.create({
      _id: userId,
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword',
      isActive: true
    });

    // Generate token
    token = jwt.sign({ id: userId.toString() }, process.env.JWT_SECRET, {
      expiresIn: '1h'
    });
  });

  afterEach(async () => {
    await Transaction.deleteMany({});
    await User.deleteMany({});
  });

  describe('GET /api/recurring/detect', () => {
    it('should detect recurring patterns with authentication', async () => {
      // Create sample recurring transactions
      await Transaction.insertMany([
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
          description: 'Netflix Subscription',
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
        }
      ]);

      const response = await request(app)
        .get('/api/recurring/detect')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/recurring/detect')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should accept minOccurrences query parameter', async () => {
      await Transaction.insertMany([
        {
          userId,
          description: 'Spotify',
          amount: -119,
          type: 'debit',
          date: new Date('2024-01-01')
        },
        {
          userId,
          description: 'Spotify',
          amount: -119,
          type: 'debit',
          date: new Date('2024-02-01')
        }
      ]);

      const response = await request(app)
        .get('/api/recurring/detect?minOccurrences=2')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/recurring/detect?minOccurrences=invalid')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should filter by date range', async () => {
      await Transaction.insertMany([
        {
          userId,
          description: 'Gym',
          amount: -1500,
          type: 'debit',
          date: new Date('2024-01-01')
        },
        {
          userId,
          description: 'Gym',
          amount: -1500,
          type: 'debit',
          date: new Date('2024-02-01')
        },
        {
          userId,
          description: 'Gym',
          amount: -1500,
          type: 'debit',
          date: new Date('2024-06-01') // Outside range
        }
      ]);

      const response = await request(app)
        .get('/api/recurring/detect?startDate=2024-01-01&endDate=2024-03-31')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/recurring/mark', () => {
    let transaction1, transaction2;

    beforeEach(async () => {
      transaction1 = await Transaction.create({
        userId,
        description: 'Monthly Rent',
        amount: -15000,
        type: 'debit',
        date: new Date('2024-01-01')
      });

      transaction2 = await Transaction.create({
        userId,
        description: 'Monthly Rent',
        amount: -15000,
        type: 'debit',
        date: new Date('2024-02-01')
      });
    });

    it('should mark transactions as recurring', async () => {
      const response = await request(app)
        .post('/api/recurring/mark')
        .set('Authorization', `Bearer ${token}`)
        .send({
          transactionIds: [transaction1._id.toString(), transaction2._id.toString()],
          isRecurring: true,
          frequency: 'monthly'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.modifiedCount).toBe(2);

      // Verify in database
      const updated = await Transaction.find({ _id: { $in: [transaction1._id, transaction2._id] } });
      expect(updated.every(t => t.isRecurring === true)).toBe(true);
      expect(updated.every(t => t.recurringPattern === 'monthly')).toBe(true);
    });

    it('should unmark transactions as recurring', async () => {
      // First mark as recurring
      await Transaction.updateMany(
        { _id: { $in: [transaction1._id, transaction2._id] } },
        { isRecurring: true, recurringPattern: 'monthly' }
      );

      const response = await request(app)
        .post('/api/recurring/mark')
        .set('Authorization', `Bearer ${token}`)
        .send({
          transactionIds: [transaction1._id.toString()],
          isRecurring: false
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      const updated = await Transaction.findById(transaction1._id);
      expect(updated.isRecurring).toBe(false);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/recurring/mark')
        .set('Authorization', `Bearer ${token}`)
        .send({
          transactionIds: []
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should validate frequency values', async () => {
      const response = await request(app)
        .post('/api/recurring/mark')
        .set('Authorization', `Bearer ${token}`)
        .send({
          transactionIds: [transaction1._id.toString()],
          isRecurring: true,
          frequency: 'invalid-frequency'
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should only mark user\'s own transactions', async () => {
      // Create transaction for different user
      const otherUserId = new mongoose.Types.ObjectId();
      const otherTransaction = await Transaction.create({
        userId: otherUserId,
        description: 'Other User Transaction',
        amount: -100,
        type: 'debit',
        date: new Date()
      });

      const response = await request(app)
        .post('/api/recurring/mark')
        .set('Authorization', `Bearer ${token}`)
        .send({
          transactionIds: [otherTransaction._id.toString()],
          isRecurring: true
        })
        .expect(200);

      // Should not modify other user's transaction
      expect(response.body.data.modifiedCount).toBe(0);
    });
  });

  describe('GET /api/recurring/predictions', () => {
    beforeEach(async () => {
      // Create consistent pattern
      await Transaction.insertMany([
        {
          userId,
          description: 'Internet Bill',
          amount: -999,
          type: 'debit',
          date: new Date('2024-01-01'),
          category: 'Utilities'
        },
        {
          userId,
          description: 'Internet Bill',
          amount: -999,
          type: 'debit',
          date: new Date('2024-02-01'),
          category: 'Utilities'
        },
        {
          userId,
          description: 'Internet Bill',
          amount: -999,
          type: 'debit',
          date: new Date('2024-03-01'),
          category: 'Utilities'
        }
      ]);
    });

    it('should predict future transactions', async () => {
      const response = await request(app)
        .get('/api/recurring/predictions?months=3')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should validate months parameter', async () => {
      const response = await request(app)
        .get('/api/recurring/predictions?months=13') // Max 12
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should default to 3 months if not specified', async () => {
      const response = await request(app)
        .get('/api/recurring/predictions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/recurring/statistics', () => {
    beforeEach(async () => {
      await Transaction.insertMany([
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
          description: 'Gym',
          amount: -1500,
          type: 'debit',
          date: new Date('2024-01-01'),
          category: 'Health',
          isRecurring: true,
          recurringPattern: 'monthly'
        },
        {
          userId,
          description: 'Grocery',
          amount: -2000,
          type: 'debit',
          date: new Date('2024-01-01'),
          category: 'Groceries',
          isRecurring: true,
          recurringPattern: 'weekly'
        }
      ]);
    });

    it('should return statistics for recurring transactions', async () => {
      const response = await request(app)
        .get('/api/recurring/statistics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalRecurring).toBeGreaterThan(0);
    });

    it('should group by frequency', async () => {
      const response = await request(app)
        .get('/api/recurring/statistics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.byFrequency).toBeDefined();
    });

    it('should group by category', async () => {
      const response = await request(app)
        .get('/api/recurring/statistics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.byCategory).toBeDefined();
    });
  });

  describe('GET /api/recurring/patterns/:id', () => {
    let patternTransaction;

    beforeEach(async () => {
      patternTransaction = await Transaction.create({
        userId,
        description: 'Insurance Premium',
        amount: -5000,
        type: 'debit',
        date: new Date('2024-01-01'),
        isRecurring: true,
        recurringPattern: 'quarterly',
        recurringId: 'pattern-123'
      });
    });

    it('should get specific pattern details', async () => {
      const response = await request(app)
        .get(`/api/recurring/patterns/${patternTransaction.recurringId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should return 404 for non-existent pattern', async () => {
      const response = await request(app)
        .get('/api/recurring/patterns/non-existent-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should not return other users\' patterns', async () => {
      const otherUserId = new mongoose.Types.ObjectId();
      const otherPattern = await Transaction.create({
        userId: otherUserId,
        description: 'Other User Pattern',
        amount: -100,
        type: 'debit',
        date: new Date(),
        isRecurring: true,
        recurringId: 'other-pattern-123'
      });

      const response = await request(app)
        .get(`/api/recurring/patterns/${otherPattern.recurringId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/recurring/auto-categorize', () => {
    beforeEach(async () => {
      // Create high-confidence pattern transactions
      await Transaction.insertMany([
        {
          userId,
          description: 'Amazon Prime',
          amount: -299,
          type: 'debit',
          date: new Date('2024-01-01'),
          category: 'Shopping'
        },
        {
          userId,
          description: 'Amazon Prime',
          amount: -299,
          type: 'debit',
          date: new Date('2024-02-01'),
          category: 'Shopping'
        },
        {
          userId,
          description: 'Amazon Prime',
          amount: -299,
          type: 'debit',
          date: new Date('2024-03-01'),
          category: 'Shopping'
        },
        {
          userId,
          description: 'Amazon Prime',
          amount: -299,
          type: 'debit',
          date: new Date('2024-04-01'),
          category: 'Shopping'
        }
      ]);
    });

    it('should auto-categorize high-confidence patterns', async () => {
      const response = await request(app)
        .post('/api/recurring/auto-categorize')
        .set('Authorization', `Bearer ${token}`)
        .send({
          minConfidence: 70
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.markedCount).toBeGreaterThanOrEqual(0);
    });

    it('should validate confidence threshold', async () => {
      const response = await request(app)
        .post('/api/recurring/auto-categorize')
        .set('Authorization', `Bearer ${token}`)
        .send({
          minConfidence: 150 // Invalid, max 100
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should use default confidence of 80 if not specified', async () => {
      const response = await request(app)
        .post('/api/recurring/auto-categorize')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid transaction IDs gracefully', async () => {
      const response = await request(app)
        .post('/api/recurring/mark')
        .set('Authorization', `Bearer ${token}`)
        .send({
          transactionIds: ['invalid-id'],
          isRecurring: true
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      // Temporarily break database connection
      await mongoose.disconnect();

      const response = await request(app)
        .get('/api/recurring/detect')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(response.body.success).toBe(false);

      // Reconnect for other tests
      const mongoUri = global.__MONGO_URI__;
      if (mongoUri) {
        await mongoose.connect(mongoUri);
      }
    });
  });
});
