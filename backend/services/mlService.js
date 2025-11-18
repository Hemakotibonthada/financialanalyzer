const logger = require('../utils/logger');

class MLService {
  constructor() {
    this.models = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    logger.info('🤖 Initializing ML Service...');
    
    // Initialize model cache
    this.modelCache = new Map();
    this.predictionCache = new Map();
    
    this.initialized = true;
    logger.info('✅ ML Service initialized');
  }

  // Spending Prediction
  async predictSpending(userId, category, timeframe = '30days') {
    try {
      const Transaction = require('../models/Transaction');
      const Prediction = require('../models/Prediction');
      
      const days = this.parseTimeframe(timeframe);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days * 2); // Use 2x data for better prediction
      
      // Get historical transactions
      const transactions = await Transaction.find({
        userId,
        type: 'debit',
        ...(category && { category }),
        date: { $gte: startDate }
      }).sort({ date: 1 });
      
      if (transactions.length < 10) {
        return {
          prediction: null,
          confidence: 0,
          message: 'Insufficient data for prediction'
        };
      }
      
      // Calculate time series data
      const timeSeries = this.aggregateByPeriod(transactions, 'daily');
      
      // Apply exponential smoothing
      const alpha = 0.3;
      const predictions = this.exponentialSmoothing(timeSeries, alpha);
      
      // Calculate trend
      const trend = this.calculateTrend(timeSeries);
      
      // Predict next period
      const lastValue = timeSeries[timeSeries.length - 1].value;
      const trendAdjustment = trend * days;
      const seasonalityFactor = this.calculateSeasonality(timeSeries);
      
      const predictedValue = (lastValue + trendAdjustment) * seasonalityFactor;
      const confidence = this.calculateConfidence(timeSeries, predictions);
      
      // Calculate prediction range
      const stdDev = this.calculateStdDev(timeSeries.map(t => t.value));
      const range = {
        min: Math.max(0, predictedValue - stdDev * 2),
        max: predictedValue + stdDev * 2,
        median: predictedValue
      };
      
      // Identify contributing factors
      const factors = await this.identifySpendingFactors(userId, category, transactions);
      
      // Save prediction
      const prediction = new Prediction({
        userId,
        predictionType: category ? 'category_spend' : 'spending',
        targetDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
        predictedValue,
        confidence,
        range,
        factors,
        metadata: {
          algorithm: 'exponential_smoothing',
          features: ['historical_spending', 'trend', 'seasonality'],
          dataPoints: transactions.length,
          timeframe
        }
      });
      
      await prediction.save();
      
      return {
        prediction: predictedValue,
        confidence,
        range,
        factors,
        trend: trend > 0 ? 'increasing' : 'decreasing',
        trendPercentage: (trend / lastValue) * 100,
        predictionId: prediction._id
      };
      
    } catch (error) {
      logger.error('Spending prediction error:', error);
      throw error;
    }
  }

  // Anomaly Detection
  async detectAnomalies(userId, transactionId = null) {
    try {
      const Transaction = require('../models/Transaction');
      const Anomaly = require('../models/Anomaly');
      
      const transactions = transactionId
        ? await Transaction.find({ _id: transactionId, userId })
        : await Transaction.find({ userId }).sort({ date: -1 }).limit(100);
      
      const anomalies = [];
      
      for (const transaction of transactions) {
        const anomalyScore = await this.calculateAnomalyScore(userId, transaction);
        
        if (anomalyScore.score > 70) {
          const anomaly = new Anomaly({
            userId,
            anomalyType: anomalyScore.type,
            severity: this.getSeverity(anomalyScore.score),
            score: anomalyScore.score,
            relatedTransactions: [transaction._id],
            detectionMethod: anomalyScore.method,
            details: anomalyScore.details,
            context: anomalyScore.context,
            recommendations: anomalyScore.recommendations
          });
          
          await anomaly.save();
          anomalies.push(anomaly);
        }
      }
      
      return anomalies;
      
    } catch (error) {
      logger.error('Anomaly detection error:', error);
      throw error;
    }
  }

  async calculateAnomalyScore(userId, transaction) {
    const Transaction = require('../models/Transaction');
    
    // Get historical data
    const historicalData = await Transaction.find({
      userId,
      category: transaction.category,
      date: { $lt: transaction.date }
    }).sort({ date: -1 }).limit(100);
    
    if (historicalData.length < 5) {
      return { score: 0, type: 'insufficient_data', method: 'statistical' };
    }
    
    const amounts = historicalData.map(t => t.amount);
    const mean = this.calculateMean(amounts);
    const stdDev = this.calculateStdDev(amounts);
    
    // Z-Score calculation
    const zScore = Math.abs((transaction.amount - mean) / stdDev);
    
    let score = 0;
    let type = 'amount_anomaly';
    let details = {
      expectedValue: mean,
      actualValue: transaction.amount,
      deviation: zScore,
      threshold: 3
    };
    
    // Score based on Z-score
    if (zScore > 3) {
      score = 90;
      type = 'unusual_spending';
    } else if (zScore > 2) {
      score = 70;
    } else if (zScore > 1.5) {
      score = 50;
    }
    
    // Check for time anomalies
    const hour = new Date(transaction.date).getHours();
    if (hour < 6 || hour > 23) {
      score += 15;
      type = 'time_anomaly';
    }
    
    // Check for duplicate transactions
    const duplicates = await Transaction.find({
      userId,
      amount: transaction.amount,
      merchantName: transaction.merchantName,
      date: {
        $gte: new Date(transaction.date.getTime() - 60000), // Within 1 minute
        $lte: new Date(transaction.date.getTime() + 60000)
      },
      _id: { $ne: transaction._id }
    });
    
    if (duplicates.length > 0) {
      score += 30;
      type = 'duplicate_transaction';
    }
    
    const context = {
      historicalAverage: mean,
      historicalStdDev: stdDev,
      dataPoints: historicalData.length,
      comparisonPeriod: '90days'
    };
    
    const recommendations = [];
    if (score > 70) {
      recommendations.push({
        title: 'Review Transaction',
        description: 'This transaction appears unusual based on your spending patterns',
        action: 'verify_transaction',
        priority: score > 85 ? 'high' : 'medium'
      });
    }
    
    return {
      score: Math.min(100, score),
      type,
      method: 'statistical',
      details,
      context,
      recommendations
    };
  }

  // Fraud Detection
  async detectFraud(userId, transactionId) {
    try {
      const Transaction = require('../models/Transaction');
      const Anomaly = require('../models/Anomaly');
      
      const transaction = await Transaction.findOne({ _id: transactionId, userId });
      if (!transaction) return null;
      
      let fraudScore = 0;
      const indicators = [];
      
      // Check amount threshold
      if (transaction.amount > 10000) {
        fraudScore += 20;
        indicators.push('high_amount');
      }
      
      // Check velocity (multiple transactions in short time)
      const recentCount = await Transaction.countDocuments({
        userId,
        date: {
          $gte: new Date(Date.now() - 3600000), // Last hour
          $lt: new Date()
        }
      });
      
      if (recentCount > 5) {
        fraudScore += 25;
        indicators.push('high_velocity');
      }
      
      // Check for unusual location (if available)
      if (transaction.location) {
        const usualLocations = await this.getUsualLocations(userId);
        if (!usualLocations.includes(transaction.location)) {
          fraudScore += 15;
          indicators.push('unusual_location');
        }
      }
      
      // Check merchant history
      const merchantHistory = await Transaction.countDocuments({
        userId,
        merchantName: transaction.merchantName
      });
      
      if (merchantHistory === 0) {
        fraudScore += 10;
        indicators.push('new_merchant');
      }
      
      // Check time pattern
      const hour = new Date(transaction.date).getHours();
      if (hour < 5 || hour > 23) {
        fraudScore += 15;
        indicators.push('unusual_time');
      }
      
      if (fraudScore > 60) {
        const anomaly = new Anomaly({
          userId,
          anomalyType: 'suspicious_transaction',
          severity: fraudScore > 80 ? 'critical' : 'high',
          score: fraudScore,
          relatedTransactions: [transactionId],
          detectionMethod: 'rule_based',
          isFraud: fraudScore > 80,
          details: {
            indicators,
            confidence: fraudScore / 100
          },
          recommendations: [{
            title: 'Potential Fraud Detected',
            description: 'This transaction shows signs of fraudulent activity',
            action: 'contact_bank',
            priority: 'critical'
          }]
        });
        
        await anomaly.save();
        return anomaly;
      }
      
      return null;
      
    } catch (error) {
      logger.error('Fraud detection error:', error);
      throw error;
    }
  }

  // Budget Forecasting
  async forecastBudget(userId, category, months = 3) {
    try {
      const Transaction = require('../models/Transaction');
      const Budget = require('../models/Budget');
      
      // Get historical spending
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);
      
      const spending = await Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            type: 'debit',
            ...(category && { category }),
            date: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' }
            },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]);
      
      if (spending.length < 3) {
        return {
          forecast: [],
          confidence: 0,
          message: 'Insufficient historical data'
        };
      }
      
      const values = spending.map(s => s.total);
      const forecasts = [];
      
      // Use simple moving average and trend
      const windowSize = 3;
      for (let i = 0; i < months; i++) {
        const recent = values.slice(-windowSize);
        const avg = this.calculateMean(recent);
        const trend = this.calculateTrend(values.map((v, idx) => ({ value: v, period: idx })));
        
        const forecast = avg + (trend * (i + 1));
        forecasts.push({
          month: i + 1,
          predictedSpend: Math.max(0, forecast),
          confidence: Math.max(0, 1 - (i * 0.15))
        });
        
        values.push(forecast);
      }
      
      return {
        forecast: forecasts,
        historicalAverage: this.calculateMean(values.slice(0, spending.length)),
        trend: trend > 0 ? 'increasing' : 'decreasing',
        confidence: 0.75
      };
      
    } catch (error) {
      logger.error('Budget forecast error:', error);
      throw error;
    }
  }

  // Helper methods
  parseTimeframe(timeframe) {
    const match = timeframe.match(/(\d+)(day|week|month)s?/);
    if (!match) return 30;
    
    const [, num, unit] = match;
    const multipliers = { day: 1, week: 7, month: 30 };
    return parseInt(num) * multipliers[unit];
  }

  aggregateByPeriod(transactions, period = 'daily') {
    const grouped = new Map();
    
    transactions.forEach(t => {
      let key;
      const date = new Date(t.date);
      
      if (period === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (period === 'weekly') {
        const week = Math.floor(date.getDate() / 7);
        key = `${date.getFullYear()}-${date.getMonth()}-W${week}`;
      } else if (period === 'monthly') {
        key = `${date.getFullYear()}-${date.getMonth()}`;
      }
      
      if (!grouped.has(key)) {
        grouped.set(key, { period: key, value: 0, count: 0 });
      }
      
      const entry = grouped.get(key);
      entry.value += t.amount;
      entry.count++;
    });
    
    return Array.from(grouped.values());
  }

  exponentialSmoothing(data, alpha = 0.3) {
    const smoothed = [data[0].value];
    
    for (let i = 1; i < data.length; i++) {
      const value = alpha * data[i].value + (1 - alpha) * smoothed[i - 1];
      smoothed.push(value);
    }
    
    return smoothed;
  }

  calculateTrend(data) {
    if (data.length < 2) return 0;
    
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    data.forEach((point, i) => {
      const x = i;
      const y = point.value;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  calculateSeasonality(data) {
    if (data.length < 7) return 1;
    
    const recent = data.slice(-7).map(d => d.value);
    const older = data.slice(-14, -7).map(d => d.value);
    
    const recentAvg = this.calculateMean(recent);
    const olderAvg = this.calculateMean(older);
    
    return olderAvg > 0 ? recentAvg / olderAvg : 1;
  }

  calculateConfidence(actual, predicted) {
    if (actual.length !== predicted.length || actual.length === 0) return 0;
    
    let errorSum = 0;
    actual.forEach((point, i) => {
      errorSum += Math.abs(point.value - predicted[i]);
    });
    
    const mape = (errorSum / actual.length) / this.calculateMean(actual.map(a => a.value));
    return Math.max(0, Math.min(1, 1 - mape));
  }

  calculateMean(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  calculateStdDev(values) {
    const mean = this.calculateMean(values);
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = this.calculateMean(squaredDiffs);
    return Math.sqrt(variance);
  }

  getSeverity(score) {
    if (score >= 85) return 'critical';
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  async identifySpendingFactors(userId, category, transactions) {
    const factors = [];
    
    // Top merchants
    const merchantSpending = {};
    transactions.forEach(t => {
      if (t.merchantName) {
        merchantSpending[t.merchantName] = (merchantSpending[t.merchantName] || 0) + t.amount;
      }
    });
    
    const topMerchants = Object.entries(merchantSpending)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    topMerchants.forEach(([merchant, amount]) => {
      factors.push({
        name: `Spending at ${merchant}`,
        impact: (amount / transactions.reduce((sum, t) => sum + t.amount, 0)) * 100,
        value: amount
      });
    });
    
    // Day of week pattern
    const daySpending = [0, 0, 0, 0, 0, 0, 0];
    transactions.forEach(t => {
      const day = new Date(t.date).getDay();
      daySpending[day] += t.amount;
    });
    
    const maxDay = daySpending.indexOf(Math.max(...daySpending));
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    factors.push({
      name: `Peak spending on ${days[maxDay]}`,
      impact: (daySpending[maxDay] / transactions.reduce((sum, t) => sum + t.amount, 0)) * 100,
      value: daySpending[maxDay]
    });
    
    return factors;
  }

  async getUsualLocations(userId) {
    const Transaction = require('../models/Transaction');
    
    const locations = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          location: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$location',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);
    
    return locations.map(l => l._id);
  }
}

const mlService = new MLService();

module.exports = mlService;
