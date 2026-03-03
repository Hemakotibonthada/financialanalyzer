// ============================================================
// Enhanced AI Controller — Business Logic for AI Endpoints
// ============================================================
// Separates business logic from routes. Integrates new AI modules
// (neural networks, decision trees, clustering, NLP, time series)
// with the existing localAIEngine.
// ============================================================

'use strict';

const localAIEngine = require('../services/localAIEngine');
const Transaction = require('../models/Transaction');

let aiPipeline = null;
try {
  const { AITrainingPipeline } = require('../services/ai/trainingPipeline');
  aiPipeline = new AITrainingPipeline();
  aiPipeline.initialize().catch(err => console.error('AI Pipeline init error:', err.message));
} catch (err) {
  console.warn('AI Pipeline not available:', err.message);
}

let nlpModules = null;
try {
  const { SentimentAnalyzer, FinancialNER, QueryUnderstanding, TextSummarizer, ConversationManager } = require('../services/ai/nlpEngine');
  nlpModules = {
    sentiment: new SentimentAnalyzer(),
    ner: new FinancialNER(),
    queryEngine: new QueryUnderstanding(),
    summarizer: new TextSummarizer(),
    conversations: new ConversationManager(),
  };
} catch (err) {
  console.warn('NLP modules not available:', err.message);
}

let timeSeriesModules = null;
try {
  const { FinancialForecaster, CashflowProjector, ChangepointDetector, RecurringTransactionDetector, MovingAverage } = require('../services/ai/timeSeries');
  timeSeriesModules = {
    forecaster: new FinancialForecaster(),
    cashflow: new CashflowProjector(),
    changepoint: new ChangepointDetector(),
    recurring: new RecurringTransactionDetector(),
    movingAverage: MovingAverage,
  };
} catch (err) {
  console.warn('Time series modules not available:', err.message);
}

let clusteringModules = null;
try {
  const { CustomerSegmentation, SpendingPatternDiscovery } = require('../services/ai/clustering');
  clusteringModules = {
    segmentation: new CustomerSegmentation(),
    patternDiscovery: new SpendingPatternDiscovery(),
  };
} catch (err) {
  console.warn('Clustering modules not available:', err.message);
}

let riskModules = null;
try {
  const { FinancialRiskClassifier } = require('../services/ai/decisionTree');
  riskModules = {
    riskClassifier: new FinancialRiskClassifier(),
  };
} catch (err) {
  console.warn('Risk modules not available:', err.message);
}

// ============================================================
// HELPER: Get user transactions
// ============================================================

async function getUserTransactions(userId, daysBack = 365) {
  return Transaction.find({
    userId,
    date: { $gte: new Date(Date.now() - daysBack * 86400000) },
  }).sort({ date: -1 }).lean();
}

// ============================================================
// CONTROLLERS
// ============================================================

const aiController = {

  // ─── Dashboard ───────────────────────────────────────────────
  async getDashboard(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const [
        dashboard,
        pipelineStatus,
      ] = await Promise.all([
        localAIEngine.getAIDashboard(userId),
        Promise.resolve(aiPipeline?.getStatus?.() || null),
      ]);

      res.json({
        success: true,
        ...dashboard,
        aiPipeline: pipelineStatus,
      });
    } catch (error) {
      console.error('AI Dashboard error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── Health Score ────────────────────────────────────────────
  async getHealthScore(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const score = await localAIEngine.health.calculateHealthScore(userId);
      res.json({ success: true, ...score });
    } catch (error) {
      console.error('Health score error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── Recommendations ────────────────────────────────────────
  async getRecommendations(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const result = await localAIEngine.recommendations.generateRecommendations(userId);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Recommendations error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── Spending Forecast ──────────────────────────────────────
  async getSpendingForecast(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const days = parseInt(req.query.days) || 30;
      const result = await localAIEngine.forecast.generateSpendingForecast(userId, days);

      // Enhance with new time series module
      let advancedForecast = null;
      if (timeSeriesModules) {
        try {
          const transactions = await getUserTransactions(userId, 365);
          advancedForecast = timeSeriesModules.forecaster.comprehensiveForecast(transactions, Math.ceil(days / 30));
        } catch (err) {
          console.warn('Advanced forecast unavailable:', err.message);
        }
      }

      res.json({
        ...result,
        advancedForecast,
      });
    } catch (error) {
      console.error('Spending forecast error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── Income Forecast ────────────────────────────────────────
  async getIncomeForecast(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const months = parseInt(req.query.months) || 3;
      const result = await localAIEngine.forecast.predictIncome(userId, months);
      res.json(result);
    } catch (error) {
      console.error('Income forecast error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── Savings Forecast ───────────────────────────────────────
  async getSavingsForecast(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const result = await localAIEngine.forecast.analyzeSavingsPotential(userId);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Savings analysis error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── Anomalies ──────────────────────────────────────────────
  async getAnomalies(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const result = await localAIEngine.anomaly.detectAnomalies(userId);

      // Enhanced anomaly detection with neural network
      let advancedAnomalies = null;
      if (aiPipeline) {
        try {
          const transactions = await getUserTransactions(userId, 90);
          advancedAnomalies = aiPipeline.detectAnomalies(transactions);
        } catch (err) {
          console.warn('Advanced anomaly detection unavailable:', err.message);
        }
      }

      res.json({ success: true, ...result, advancedAnomalies });
    } catch (error) {
      console.error('Anomaly detection error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── Insights ───────────────────────────────────────────────
  async getInsights(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const period = req.query.period || 'month';
      const result = await localAIEngine.insights.generateInsights(userId, period);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Insights error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── Recurring Patterns ─────────────────────────────────────
  async getRecurringPatterns(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const transactions = await getUserTransactions(userId, 180);
      const debitTxns = transactions.filter(t => t.type === 'debit');
      const patterns = localAIEngine.patterns.detectRecurringPatterns(debitTxns);

      // Enhanced recurring detection
      let advancedRecurring = null;
      if (timeSeriesModules) {
        try {
          advancedRecurring = timeSeriesModules.recurring.detect(transactions);
        } catch (err) {
          console.warn('Advanced recurring detection unavailable:', err.message);
        }
      }

      res.json({ success: true, patterns, advancedRecurring, count: patterns.length });
    } catch (error) {
      console.error('Recurring pattern error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── Merchant Analysis ──────────────────────────────────────
  async getMerchantAnalysis(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const transactions = await getUserTransactions(userId, 180);
      const merchants = localAIEngine.patterns.analyzeMerchantAffinity(transactions);
      res.json({ success: true, merchants: merchants.slice(0, 30) });
    } catch (error) {
      console.error('Merchant analysis error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── Velocity Analysis ──────────────────────────────────────
  async getVelocityAnalysis(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const days = parseInt(req.query.days) || 7;
      const transactions = await getUserTransactions(userId, 60);
      const debitTxns = transactions.filter(t => t.type === 'debit');
      const velocity = localAIEngine.patterns.detectVelocityChanges(debitTxns, days);
      res.json({ success: true, ...velocity });
    } catch (error) {
      console.error('Velocity analysis error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── Train Models ───────────────────────────────────────────
  async trainModels(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const results = await localAIEngine.trainModels(userId);

      // Also train new AI pipeline if available
      let pipelineResults = null;
      if (aiPipeline) {
        try {
          const transactions = await getUserTransactions(userId, 365);
          pipelineResults = await aiPipeline.trainAll({ transactions });
        } catch (err) {
          console.warn('Pipeline training unavailable:', err.message);
        }
      }

      res.json({ success: true, results, pipelineResults });
    } catch (error) {
      console.error('Model training error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── Categorize ─────────────────────────────────────────────
  async categorize(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const { description, amount, merchantName } = req.body;
      const result = await localAIEngine.categorize(userId, description, amount, merchantName);

      // Enhanced categorization via neural network
      let advancedCategory = null;
      if (aiPipeline) {
        try {
          advancedCategory = aiPipeline.classifyCategory(description);
        } catch (err) {
          console.warn('Advanced categorization unavailable:', err.message);
        }
      }

      res.json({ success: true, ...result, advancedCategory });
    } catch (error) {
      console.error('Categorization error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ──────────────────────────────────────────────────────────────
  // NEW ENDPOINTS (Enhanced AI Features)
  // ──────────────────────────────────────────────────────────────

  // ─── Sentiment Analysis ─────────────────────────────────────
  async getSentiment(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const transactions = await getUserTransactions(userId, 90);

      if (!nlpModules) {
        return res.json({ success: true, sentiment: null, message: 'NLP module not available' });
      }

      const result = nlpModules.sentiment.analyzeTransactions(transactions);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── Entity Extraction ──────────────────────────────────────
  async extractEntities(req, res) {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ success: false, error: 'Text is required' });

      if (!nlpModules) {
        return res.json({ success: true, entities: null, message: 'NLP module not available' });
      }

      const result = nlpModules.ner.extract(text);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Entity extraction error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── NLP Chat / Query ───────────────────────────────────────
  async processQuery(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const { query } = req.body;
      if (!query) return res.status(400).json({ success: false, error: 'Query is required' });

      if (!nlpModules) {
        return res.json({ success: true, response: 'NLP module not available' });
      }

      // Understand the query
      const understanding = nlpModules.queryEngine.understand(query);

      // Store conversation
      nlpModules.conversations.addMessage(userId, 'user', query, { intent: understanding.intent });

      // Get data based on intent
      let responseData = {};
      try {
        switch (understanding.intent) {
          case 'spending_query':
          case 'budget_query': {
            const transactions = await getUserTransactions(userId, 90);
            const total = transactions
              .filter(t => t.type === 'debit' || t.type === 'expense')
              .reduce((s, t) => s + Math.abs(t.amount || 0), 0);
            const categories = {};
            for (const t of transactions) {
              const cat = t.category || 'other';
              categories[cat] = (categories[cat] || 0) + Math.abs(t.amount || 0);
            }
            responseData = {
              total,
              topCategory: Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0],
              categoryCount: Object.keys(categories).length,
            };
            break;
          }
          case 'health_query': {
            const score = await localAIEngine.health.calculateHealthScore(userId);
            responseData = { score: score.score, grade: score.grade, topRecommendation: score.recommendations?.[0]?.message };
            break;
          }
          case 'forecast_query': {
            const transactions = await getUserTransactions(userId, 365);
            if (timeSeriesModules) {
              const forecast = timeSeriesModules.forecaster.comprehensiveForecast(transactions, 3);
              responseData = { forecast: forecast.totalExpense?.[0]?.value, trend: forecast.trends?.shortTerm?.direction };
            }
            break;
          }
          default:
            responseData = {};
        }
      } catch (err) {
        console.warn('Query data retrieval error:', err.message);
      }

      // Generate response
      const response = nlpModules.queryEngine.generateResponse(understanding.intent, responseData);
      nlpModules.conversations.addMessage(userId, 'assistant', response);

      res.json({
        success: true,
        response,
        intent: understanding.intent,
        confidence: understanding.confidence,
        sentiment: understanding.sentiment,
        conversationHistory: nlpModules.conversations.getHistory(userId, 5),
      });
    } catch (error) {
      console.error('Query processing error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── Cashflow Projection ────────────────────────────────────
  async getCashflowProjection(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const months = parseInt(req.query.months) || 12;
      const balance = parseFloat(req.query.balance) || 0;

      if (!timeSeriesModules) {
        return res.json({ success: true, projection: null, message: 'Time series module not available' });
      }

      const transactions = await getUserTransactions(userId, 365);
      const projection = timeSeriesModules.cashflow.project(transactions, balance, months);
      res.json({ success: true, ...projection });
    } catch (error) {
      console.error('Cashflow projection error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── Changepoint Detection ──────────────────────────────────
  async getChangepoints(req, res) {
    try {
      const userId = req.user._id || req.user.id;

      if (!timeSeriesModules) {
        return res.json({ success: true, changepoints: null, message: 'Time series module not available' });
      }

      const transactions = await getUserTransactions(userId, 180);
      // Create daily spending series
      const dailySpending = {};
      for (const t of transactions) {
        if (t.type === 'debit' || t.type === 'expense') {
          const day = new Date(t.date).toISOString().slice(0, 10);
          dailySpending[day] = (dailySpending[day] || 0) + Math.abs(t.amount || 0);
        }
      }

      const sortedDays = Object.keys(dailySpending).sort();
      const spendingArray = sortedDays.map(d => dailySpending[d]);

      const result = timeSeriesModules.changepoint.detectSpendingChanges(spendingArray);
      res.json({ success: true, ...result, dates: sortedDays });
    } catch (error) {
      console.error('Changepoint detection error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── Risk Assessment ────────────────────────────────────────
  async getRiskAssessment(req, res) {
    try {
      const userId = req.user._id || req.user.id;

      if (!riskModules) {
        return res.json({ success: true, risk: null, message: 'Risk module not available' });
      }

      const transactions = await getUserTransactions(userId, 365);

      // Prepare user financial data
      const income = transactions
        .filter(t => t.type === 'credit' || t.type === 'income')
        .reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const expenses = transactions
        .filter(t => t.type === 'debit' || t.type === 'expense')
        .reduce((s, t) => s + Math.abs(t.amount || 0), 0);

      const userData = {
        monthlyIncome: income / 12,
        monthlyExpenses: expenses / 12,
        totalDebt: 0,
        savingsBalance: income - expenses,
        investmentValue: 0,
        creditScore: 700,
        age: 30,
        dependents: 0,
        has_insurance: true,
        has_emergency_fund: income - expenses > expenses * 3,
        debt_to_income_ratio: 0,
        payment_history_score: 0.9,
        employment_stability: 0.8,
        diversification_score: 0.5,
      };

      riskModules.riskClassifier.train([userData]);
      const risk = riskModules.riskClassifier.predict(userData);

      res.json({ success: true, ...risk });
    } catch (error) {
      console.error('Risk assessment error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── Spending Patterns (Clustering) ─────────────────────────
  async getSpendingPatterns(req, res) {
    try {
      const userId = req.user._id || req.user.id;

      if (!clusteringModules) {
        return res.json({ success: true, patterns: null, message: 'Clustering module not available' });
      }

      const transactions = await getUserTransactions(userId, 180);
      const patterns = clusteringModules.patternDiscovery.discover(transactions);
      res.json({ success: true, ...patterns });
    } catch (error) {
      console.error('Spending patterns error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── Financial Summary (NLP) ────────────────────────────────
  async getFinancialSummary(req, res) {
    try {
      const userId = req.user._id || req.user.id;

      const transactions = await getUserTransactions(userId, 30);
      const income = transactions
        .filter(t => t.type === 'credit' || t.type === 'income')
        .reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const expenses = transactions
        .filter(t => t.type === 'debit' || t.type === 'expense')
        .reduce((s, t) => s + Math.abs(t.amount || 0), 0);

      // Category breakdown
      const categories = {};
      for (const t of transactions) {
        if (t.type === 'debit' || t.type === 'expense') {
          const cat = t.category || 'other';
          categories[cat] = (categories[cat] || 0) + Math.abs(t.amount || 0);
        }
      }
      const topCategories = Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, amount]) => ({ name, amount }));

      let summary = '';
      if (nlpModules) {
        const healthScore = await localAIEngine.health.calculateHealthScore(userId).catch(() => ({}));
        summary = nlpModules.summarizer.summarizeFinancialData({
          income,
          expenses,
          topCategories,
          healthScore: healthScore.score,
          recommendations: healthScore.recommendations,
        });
      }

      res.json({
        success: true,
        summary,
        data: { income, expenses, savings: income - expenses, topCategories },
      });
    } catch (error) {
      console.error('Financial summary error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── Pipeline Status ────────────────────────────────────────
  async getPipelineStatus(req, res) {
    try {
      if (!aiPipeline) {
        return res.json({ success: true, status: null, message: 'AI Pipeline not available' });
      }

      const status = aiPipeline.getStatus();
      const dashboard = aiPipeline.getDashboardData();

      res.json({ success: true, status, dashboard });
    } catch (error) {
      console.error('Pipeline status error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── Moving Averages ────────────────────────────────────────
  async getMovingAverages(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const window = parseInt(req.query.window) || 7;

      if (!timeSeriesModules) {
        return res.json({ success: true, data: null, message: 'Time series module not available' });
      }

      const transactions = await getUserTransactions(userId, 180);

      // Build daily spending series
      const dailySpending = {};
      for (const t of transactions) {
        if (t.type === 'debit' || t.type === 'expense') {
          const day = new Date(t.date).toISOString().slice(0, 10);
          dailySpending[day] = (dailySpending[day] || 0) + Math.abs(t.amount || 0);
        }
      }

      const sortedDays = Object.keys(dailySpending).sort();
      const values = sortedDays.map(d => dailySpending[d]);

      res.json({
        success: true,
        dates: sortedDays,
        values,
        sma: timeSeriesModules.movingAverage.SMA(values, window),
        ema: timeSeriesModules.movingAverage.EMA(values, window),
        bollinger: timeSeriesModules.movingAverage.BollingerBands(values, window),
      });
    } catch (error) {
      console.error('Moving averages error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
};

module.exports = aiController;
