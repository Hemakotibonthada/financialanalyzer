// ============================================================================
// AI ORCHESTRATOR SERVICE — Central Hub for All AI Features
// ============================================================================
// Coordinates all AI modules: RL optimization, anomaly detection, knowledge
// graph, AutoML, explainability, conversation AI, and model monitoring.
// Provides unified API for the backend routes and frontend.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');
const path = require('path');
const fs = require('fs');

// Import all AI modules
const { RLBudgetOptimizer, MultiArmedBandit } = require('./reinforcementLearning');
const { FinancialAnomalyAnalyzer } = require('./advancedAnomalyDetection');
const { FinancialKnowledgeGraphBuilder, GraphReasoningEngine } = require('./knowledgeGraph');
const { AutoMLPipeline, FeatureEngineer } = require('./autoMLPipeline');
const { ExplainabilityService, NaturalLanguageExplainer } = require('./explainableAI');
const { ConversationalAIEngine } = require('./conversationalAI');
const { ModelMonitoringService } = require('./modelMonitoring');

// ============================================================================
// §1  SINGLETON INSTANCES
// ============================================================================

let instance = null;

class AIOrchestrator {
  constructor() {
    if (instance) return instance;
    instance = this;

    // Initialize all AI services
    this.rlOptimizer = new RLBudgetOptimizer();
    this.anomalyAnalyzer = new FinancialAnomalyAnalyzer();
    this.knowledgeGraphBuilder = new FinancialKnowledgeGraphBuilder();
    this.autoML = new AutoMLPipeline();
    this.explainability = new ExplainabilityService();
    this.conversationEngine = new ConversationalAIEngine();
    this.monitoring = new ModelMonitoringService();
    this.nlExplainer = new NaturalLanguageExplainer();
    this.featureEngineer = new FeatureEngineer();

    // Multi-armed bandit for recommendation optimization
    this.recommendationBandit = new MultiArmedBandit(10, { strategy: 'thompson' });

    // User-level caches
    this.userGraphs = {};
    this.userModels = {};

    // State
    this.initialized = false;
    this.startTime = Date.now();
    this.stats = {
      totalRequests: 0,
      requestsByType: {},
      averageLatency: 0,
      totalLatency: 0
    };

    // Data directory
    this.dataDir = path.join(__dirname, '../../data/ai-orchestrator');

    // Register conversation handlers
    this._registerConversationHandlers();

    logger.info('AI Orchestrator initialized');
  }

  // ============================================================================
  // §2  INITIALIZATION
  // ============================================================================

  async initialize() {
    if (this.initialized) return;

    try {
      await fs.promises.mkdir(this.dataDir, { recursive: true }).catch(() => {});

      // Register models for monitoring
      this.monitoring.registerModel('spending_predictor');
      this.monitoring.registerModel('anomaly_detector');
      this.monitoring.registerModel('category_classifier');
      this.monitoring.registerModel('health_scorer');
      this.monitoring.registerModel('investment_advisor');

      // Set retraining callbacks
      this.monitoring.onRetrainingNeeded('spending_predictor', async (data) => {
        logger.info(`Retraining triggered for ${data.modelId}: ${data.reason}`);
      });

      this.initialized = true;
      logger.info('AI Orchestrator fully initialized');
    } catch (error) {
      logger.error('AI Orchestrator initialization error:', error.message);
    }
  }

  // ============================================================================
  // §3  COMPREHENSIVE FINANCIAL ANALYSIS
  // ============================================================================

  async analyzeUserFinances(userId, data) {
    const startTime = Date.now();
    this._trackRequest('comprehensive_analysis');

    const results = {
      timestamp: new Date(),
      userId
    };

    try {
      const { transactions, budgets, goals, loans, investments } = data;

      // Run analyses in parallel where possible
      const [
        anomalyResults,
        healthScore,
        spendingForecast
      ] = await Promise.all([
        this._safeExecute(() => this.anomalyAnalyzer.analyzeTransactions(userId, transactions || [])),
        this._safeExecute(() => this.computeFinancialHealthScore(userId, data)),
        this._safeExecute(() => this.autoML.forecastSpending(transactions || []))
      ]);

      results.anomalies = anomalyResults;
      results.healthScore = healthScore;
      results.spendingForecast = spendingForecast;

      // Build/update knowledge graph
      try {
        await this.knowledgeGraphBuilder.buildFromUserData(userId, data);
        results.recommendations = this.knowledgeGraphBuilder.getRecommendations(userId);
        this.userGraphs[userId] = this.knowledgeGraphBuilder;
      } catch (e) {
        logger.debug('Knowledge graph error:', e.message);
        results.recommendations = [];
      }

      // Generate natural language summary
      results.summary = this._generateAnalysisSummary(results, data);
      results.latency = Date.now() - startTime;

    } catch (error) {
      logger.error('Comprehensive analysis error:', error.message);
      results.error = error.message;
    }

    return results;
  }

  // ============================================================================
  // §4  BUDGET OPTIMIZATION (RL-Based)
  // ============================================================================

  async optimizeBudget(userId, financialData) {
    this._trackRequest('budget_optimization');
    const startTime = Date.now();

    try {
      const result = await this.rlOptimizer.optimizeBudget(userId, financialData);

      // Record in monitoring
      this.monitoring.recordPrediction('spending_predictor', {
        input: financialData,
        predicted: result.optimizedAllocations,
        userId,
        latency: Date.now() - startTime,
        type: 'budget_optimization'
      });

      // Generate explanation
      result.explanation = this.nlExplainer.explainBudgetDecision({
        category: 'overall',
        spent: Object.values(result.optimizedAllocations).reduce((s, v) => s + v, 0),
        budget: financialData.monthlyIncome,
        recommendation: result.recommendations?.[0]?.message
      });

      return result;
    } catch (error) {
      logger.error('Budget optimization error:', error.message);
      return { error: error.message, fallback: this._fallbackBudgetAdvice(financialData) };
    }
  }

  // ============================================================================
  // §5  INVESTMENT OPTIMIZATION (RL-Based)
  // ============================================================================

  async optimizeInvestments(userId, investmentData) {
    this._trackRequest('investment_optimization');

    try {
      const result = await this.rlOptimizer.optimizeInvestments(userId, investmentData);

      this.monitoring.recordPrediction('investment_advisor', {
        input: investmentData,
        predicted: result.optimalAllocations,
        userId,
        type: 'investment_optimization'
      });

      return result;
    } catch (error) {
      logger.error('Investment optimization error:', error.message);
      return { error: error.message };
    }
  }

  // ============================================================================
  // §6  DEBT PAYOFF STRATEGY (RL-Based)
  // ============================================================================

  async optimizeDebtPayoff(userId, debtData) {
    this._trackRequest('debt_payoff');

    try {
      return await this.rlOptimizer.optimizeDebtPayoff(userId, debtData);
    } catch (error) {
      logger.error('Debt payoff optimization error:', error.message);
      return { error: error.message };
    }
  }

  // ============================================================================
  // §7  ANOMALY DETECTION
  // ============================================================================

  async detectAnomalies(userId, transactions) {
    this._trackRequest('anomaly_detection');

    try {
      const results = await this.anomalyAnalyzer.analyzeTransactions(userId, transactions);

      // Add natural language explanations
      if (results.anomalies) {
        results.anomalies = results.anomalies.map(anomaly => ({
          ...anomaly,
          explanation: this.nlExplainer.explainAnomaly({
            type: anomaly.severity === 'critical' ? 'high_amount' : 'high_amount',
            amount: anomaly.transaction?.amount || 0,
            merchant: anomaly.transaction?.description || 'Unknown',
            category: anomaly.transaction?.category || 'Unknown',
            deviation: anomaly.score
          })
        }));
      }

      return results;
    } catch (error) {
      logger.error('Anomaly detection error:', error.message);
      return { anomalies: [], error: error.message };
    }
  }

  // ============================================================================
  // §8  CONVERSATIONAL AI
  // ============================================================================

  async chat(userId, message, context = {}) {
    this._trackRequest('chat');

    try {
      await this.conversationEngine.loadState(userId);
      const response = await this.conversationEngine.chat(userId, message, context);
      await this.conversationEngine.saveState(userId);
      return response;
    } catch (error) {
      logger.error('Chat error:', error.message);
      return {
        message: 'I encountered an issue processing your request. Could you try rephrasing?',
        error: true,
        intent: 'error'
      };
    }
  }

  // ============================================================================
  // §9  KNOWLEDGE GRAPH QUERIES
  // ============================================================================

  async queryKnowledgeGraph(userId, question, data = null) {
    this._trackRequest('knowledge_graph_query');

    try {
      // Build graph if not exists
      if (!this.userGraphs[userId] && data) {
        const builder = new FinancialKnowledgeGraphBuilder();
        await builder.buildFromUserData(userId, data);
        this.userGraphs[userId] = builder;
      }

      const builder = this.userGraphs[userId];
      if (!builder) {
        return { answer: 'Please provide financial data first.', data: {} };
      }

      const result = builder.queryGraph(userId, question);

      // Use reasoning engine
      const reasoner = new GraphReasoningEngine(builder.graph);
      const reasoning = reasoner.reason(userId, question);

      return {
        ...result,
        reasoning: reasoning.conclusion,
        confidence: reasoning.confidence,
        chain: reasoning.chain
      };
    } catch (error) {
      logger.error('Knowledge graph query error:', error.message);
      return { answer: 'Unable to process query.', error: error.message };
    }
  }

  // ============================================================================
  // §10  EXPLAINABLE AI
  // ============================================================================

  async explainDecision(userId, decisionType, data) {
    this._trackRequest('explain_decision');

    try {
      switch (decisionType) {
        case 'budget':
          return this.nlExplainer.explainBudgetDecision(data);
        case 'anomaly':
          return this.nlExplainer.explainAnomaly(data);
        case 'forecast':
          return this.nlExplainer.explainForecast(data);
        case 'health':
          return this.nlExplainer.explainHealthScore(data);
        default:
          return this.nlExplainer.generateInsightNarrative(data);
      }
    } catch (error) {
      return `Unable to generate explanation: ${error.message}`;
    }
  }

  async getAuditTrail(userId) {
    return this.explainability.getAuditTrail(userId);
  }

  // ============================================================================
  // §11  AUTO-ML
  // ============================================================================

  async runAutoML(userId, task, data) {
    this._trackRequest('automl');

    try {
      const { features, labels, transactions } = data;

      if (task === 'forecast' && transactions) {
        return await this.autoML.forecastSpending(transactions);
      }

      if (task === 'categorize' && transactions) {
        return await this.autoML.categorizeTransactions(transactions);
      }

      if (task === 'anomaly' && transactions) {
        return await this.autoML.predictAnomalies(transactions);
      }

      if (features && labels) {
        return await this.autoML.run(task, features, labels);
      }

      return { error: 'Invalid AutoML task configuration' };
    } catch (error) {
      logger.error('AutoML error:', error.message);
      return { error: error.message };
    }
  }

  // ============================================================================
  // §12  FINANCIAL HEALTH SCORE
  // ============================================================================

  async computeFinancialHealthScore(userId, data) {
    this._trackRequest('health_score');

    const { transactions, budgets, goals, loans, investments } = data;
    const scores = {};

    // Spending discipline (0-100)
    if (transactions && transactions.length > 0) {
      const expenses = transactions.filter(t => t.type === 'expense').map(t => Math.abs(t.amount || 0));
      const incomes = transactions.filter(t => t.type === 'income').map(t => Math.abs(t.amount || 0));
      const totalExpense = expenses.reduce((s, v) => s + v, 0);
      const totalIncome = incomes.reduce((s, v) => s + v, 0);
      const savingsRate = totalIncome > 0 ? (totalIncome - totalExpense) / totalIncome : 0;

      scores.savingsRate = Math.min(100, savingsRate * 500); // 20% savings = 100
      scores.spendingDiversity = Math.min(100,
        new Set(transactions.map(t => t.category)).size * 10
      );
    }

    // Budget adherence
    if (budgets && budgets.length > 0) {
      const onBudget = budgets.filter(b =>
        (b.spent || 0) <= (b.limit || b.amount || Infinity)
      ).length;
      scores.budgetAdherence = (onBudget / budgets.length) * 100;
    }

    // Goal progress
    if (goals && goals.length > 0) {
      const avgProgress = goals.reduce((s, g) => {
        const progress = g.targetAmount > 0
          ? (g.currentAmount || g.saved || 0) / g.targetAmount
          : 0;
        return s + Math.min(progress, 1);
      }, 0) / goals.length;
      scores.goalProgress = avgProgress * 100;
    }

    // Debt health
    if (loans && loans.length > 0) {
      const activeLoans = loans.filter(l => l.status === 'active');
      const totalOutstanding = activeLoans.reduce((s, l) => s + (l.outstandingAmount || l.outstanding || 0), 0);
      const totalEmi = activeLoans.reduce((s, l) => s + (l.emiAmount || l.emi || 0), 0);
      const monthlyIncome = data.monthlyIncome || 50000;
      const debtToIncome = monthlyIncome > 0 ? totalEmi / monthlyIncome : 0;

      scores.debtHealth = Math.max(0, 100 - debtToIncome * 250); // <40% DTI = healthy
      scores.loanManagement = activeLoans.length <= 3 ? 80 : Math.max(0, 100 - activeLoans.length * 10);
    }

    // Investment health
    if (investments && investments.length > 0) {
      const diversification = new Set(investments.map(i => i.type || i.assetClass)).size;
      scores.investmentDiversity = Math.min(100, diversification * 20);

      const totalReturns = investments.reduce((s, i) => {
        const invested = i.investedAmount || i.invested || 0;
        const current = i.currentValue || i.value || 0;
        return s + (invested > 0 ? (current - invested) / invested : 0);
      }, 0) / investments.length;
      scores.investmentReturns = Math.max(0, Math.min(100, 50 + totalReturns * 500));
    }

    // Calculate overall score
    const weights = {
      savingsRate: 0.25,
      budgetAdherence: 0.15,
      goalProgress: 0.15,
      debtHealth: 0.20,
      investmentDiversity: 0.10,
      investmentReturns: 0.10,
      spendingDiversity: 0.03,
      loanManagement: 0.02
    };

    let overallScore = 0;
    let totalWeight = 0;

    for (const [metric, weight] of Object.entries(weights)) {
      if (scores[metric] !== undefined) {
        overallScore += scores[metric] * weight;
        totalWeight += weight;
      }
    }

    overallScore = totalWeight > 0 ? overallScore / totalWeight : 50;

    // Generate recommendations
    const recommendations = [];
    if ((scores.savingsRate || 0) < 50) {
      recommendations.push({
        area: 'savings',
        priority: 'high',
        message: 'Increase your savings rate to at least 20% of income'
      });
    }
    if ((scores.debtHealth || 100) < 60) {
      recommendations.push({
        area: 'debt',
        priority: 'high',
        message: 'Your debt-to-income ratio is high. Consider debt consolidation or accelerated repayment'
      });
    }
    if ((scores.budgetAdherence || 0) < 70) {
      recommendations.push({
        area: 'budget',
        priority: 'medium',
        message: 'You\'re exceeding budget in multiple categories. Review and adjust allocations'
      });
    }
    if ((scores.investmentDiversity || 0) < 40) {
      recommendations.push({
        area: 'investment',
        priority: 'medium',
        message: 'Diversify your investments across different asset classes'
      });
    }
    if ((scores.goalProgress || 0) < 50) {
      recommendations.push({
        area: 'goals',
        priority: 'medium',
        message: 'Your financial goals are behind schedule. Increase monthly contributions'
      });
    }

    const explanation = this.nlExplainer.explainHealthScore({
      score: Math.round(overallScore),
      strengths: Object.entries(scores)
        .filter(([, v]) => v >= 70)
        .map(([k]) => k.replace(/([A-Z])/g, ' $1').trim()),
      improvements: Object.entries(scores)
        .filter(([, v]) => v < 50)
        .map(([k]) => k.replace(/([A-Z])/g, ' $1').trim()),
      actions: recommendations.filter(r => r.priority === 'high').map(r => r.message),
      urgentActions: recommendations.filter(r => r.priority === 'high').map(r => r.message)
    });

    return {
      overallScore: Math.round(overallScore),
      breakdown: scores,
      rating: overallScore >= 80 ? 'Excellent' : overallScore >= 60 ? 'Good' :
              overallScore >= 40 ? 'Fair' : 'Needs Attention',
      recommendations,
      explanation,
      calculatedAt: new Date()
    };
  }

  // ============================================================================
  // §13  SPENDING PREDICTION
  // ============================================================================

  async predictSpending(userId, transactions, horizonWeeks = 4) {
    this._trackRequest('spending_prediction');

    try {
      const result = await this.autoML.forecastSpending(transactions);

      if (result.forecast) {
        result.forecast = result.forecast.map((pred, i) => ({
          ...pred,
          explanation: this.nlExplainer.explainForecast({
            category: 'Total',
            predicted: pred.predicted,
            current: result.historicalAvg || 0,
            trend: pred.predicted > (result.historicalAvg || 0) ? 'increasing' : 'decreasing'
          })
        }));
      }

      return result;
    } catch (error) {
      return { error: error.message };
    }
  }

  // ============================================================================
  // §14  MODEL MONITORING DASHBOARD
  // ============================================================================

  getMonitoringDashboard() {
    return this.monitoring.getDashboard();
  }

  getModelMetrics(modelId) {
    return this.monitoring.performanceTracker.getMetrics(modelId);
  }

  // ============================================================================
  // §15  WHAT-IF ANALYSIS
  // ============================================================================

  async whatIfAnalysis(userId, scenario) {
    this._trackRequest('what_if');

    try {
      const builder = this.userGraphs[userId];
      if (!builder) {
        return { error: 'No financial data available. Run comprehensive analysis first.' };
      }

      const reasoner = new GraphReasoningEngine(builder.graph);
      return reasoner.whatIf(userId, scenario);
    } catch (error) {
      return { error: error.message };
    }
  }

  // ============================================================================
  // §16  SMART CATEGORIZATION
  // ============================================================================

  async smartCategorize(userId, transaction) {
    this._trackRequest('categorization');

    try {
      const features = this.featureEngineer.generateTransactionFeatures([transaction]);
      const featureArray = this.featureEngineer.toArrayBatch(features);

      if (this.userModels[userId]?.categorizer) {
        const prediction = this.userModels[userId].categorizer.predict(featureArray);
        return {
          category: prediction[0],
          confidence: 0.8,
          source: 'user_model'
        };
      }

      // Fallback to rule-based categorization
      return this._ruleBasedCategorize(transaction);
    } catch (error) {
      return this._ruleBasedCategorize(transaction);
    }
  }

  _ruleBasedCategorize(transaction) {
    const desc = (transaction.description || '').toLowerCase();
    const rules = [
      { pattern: /swiggy|zomato|restaurant|food|pizza|burger|cafe|canteen|mess|tiffin|grocery|bigbasket|blinkit|zepto/i, category: 'food' },
      { pattern: /uber|ola|cab|taxi|petrol|diesel|fuel|metro|bus|train|irctc|flight|airline/i, category: 'transport' },
      { pattern: /amazon|flipkart|myntra|ajio|shopping|mall|store|market/i, category: 'shopping' },
      { pattern: /electric|water|gas|phone|mobile|internet|wifi|broadband|airtel|jio|vodafone|bsnl/i, category: 'utilities' },
      { pattern: /netflix|spotify|prime|hotstar|movie|cinema|game|entertainment|subscription/i, category: 'entertainment' },
      { pattern: /hospital|doctor|pharmacy|medicine|medical|health|gym|fitness/i, category: 'healthcare' },
      { pattern: /school|college|university|course|tuition|education|book|udemy|coursera/i, category: 'education' },
      { pattern: /rent|housing|apartment|flat|maintenance|society/i, category: 'rent' },
      { pattern: /insurance|premium|lic|term plan|health cover/i, category: 'insurance' },
      { pattern: /salary|wages|income|bonus|freelance|payment received/i, category: 'income' },
      { pattern: /emi|loan|interest|repay/i, category: 'loan_payment' },
      { pattern: /invest|sip|mutual fund|stock|share|fd|ppf|nps/i, category: 'investment' },
      { pattern: /transfer|sent|paid|upi|neft|imps|rtgs/i, category: 'transfer' },
      { pattern: /atm|withdraw|cash/i, category: 'cash_withdrawal' }
    ];

    for (const rule of rules) {
      if (rule.pattern.test(desc)) {
        return {
          category: rule.category,
          confidence: 0.7,
          source: 'rule_based'
        };
      }
    }

    return {
      category: 'miscellaneous',
      confidence: 0.3,
      source: 'default'
    };
  }

  // ============================================================================
  // §17  INSIGHTS GENERATION
  // ============================================================================

  async generateInsights(userId, data) {
    this._trackRequest('insights');

    const insights = [];
    const { transactions, budgets, goals, loans } = data;

    if (transactions && transactions.length > 0) {
      // Spending trend insight
      const amounts = transactions
        .filter(t => t.type === 'expense')
        .map(t => Math.abs(t.amount || 0));

      if (amounts.length >= 10) {
        const recentAvg = amounts.slice(-10).reduce((s, v) => s + v, 0) / 10;
        const olderAvg = amounts.slice(0, -10).reduce((s, v) => s + v, 0) / Math.max(amounts.length - 10, 1);

        if (recentAvg > olderAvg * 1.2) {
          insights.push({
            type: 'spending_trend',
            severity: 'warning',
            title: 'Spending Increasing',
            message: `Your recent spending is ${((recentAvg / olderAvg - 1) * 100).toFixed(0)}% higher than your historical average.`,
            actionable: true,
            action: 'Review recent expenses and identify areas to cut back.'
          });
        } else if (recentAvg < olderAvg * 0.8) {
          insights.push({
            type: 'spending_trend',
            severity: 'positive',
            title: 'Great Savings Progress!',
            message: `You've reduced spending by ${((1 - recentAvg / olderAvg) * 100).toFixed(0)}% recently.`,
            actionable: false
          });
        }
      }

      // Category insights
      const categoryTotals = {};
      for (const t of transactions.filter(t => t.type === 'expense')) {
        const cat = t.category || 'uncategorized';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(t.amount || 0);
      }

      const totalExpense = Object.values(categoryTotals).reduce((s, v) => s + v, 0);
      const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

      if (sortedCategories.length > 0) {
        const topCategory = sortedCategories[0];
        const topPct = totalExpense > 0 ? (topCategory[1] / totalExpense * 100) : 0;

        if (topPct > 40) {
          insights.push({
            type: 'category_dominance',
            severity: 'info',
            title: `${topCategory[0]} Dominates Spending`,
            message: `${topCategory[0]} accounts for ${topPct.toFixed(0)}% of your spending (₹${topCategory[1].toLocaleString()}).`,
            actionable: true,
            action: `Look for ways to reduce ${topCategory[0]} expenses.`
          });
        }
      }

      // Unusual transaction patterns
      const weekendTxns = transactions.filter(t => {
        const d = new Date(t.date || 0).getDay();
        return d === 0 || d === 6;
      });
      const weekdayTxns = transactions.filter(t => {
        const d = new Date(t.date || 0).getDay();
        return d >= 1 && d <= 5;
      });

      if (weekendTxns.length > 0 && weekdayTxns.length > 0) {
        const weekendAvg = weekendTxns.reduce((s, t) => s + Math.abs(t.amount || 0), 0) / weekendTxns.length;
        const weekdayAvg = weekdayTxns.reduce((s, t) => s + Math.abs(t.amount || 0), 0) / weekdayTxns.length;

        if (weekendAvg > weekdayAvg * 2) {
          insights.push({
            type: 'weekend_spending',
            severity: 'info',
            title: 'Weekend Spending Alert',
            message: `You spend ${(weekendAvg / weekdayAvg).toFixed(1)}x more on weekends compared to weekdays.`,
            actionable: true,
            action: 'Set a weekend spending budget to keep expenses in check.'
          });
        }
      }
    }

    // Loan insights
    if (loans && loans.length > 0) {
      const activeLoans = loans.filter(l => l.status === 'active');
      const highInterestLoans = activeLoans.filter(l => (l.interestRate || l.rate || 0) > 0.15);

      if (highInterestLoans.length > 0) {
        insights.push({
          type: 'high_interest_debt',
          severity: 'warning',
          title: 'High-Interest Debt Alert',
          message: `You have ${highInterestLoans.length} loan(s) with interest rates above 15%. Total outstanding: ₹${
            highInterestLoans.reduce((s, l) => s + (l.outstandingAmount || l.outstanding || 0), 0).toLocaleString()
          }`,
          actionable: true,
          action: 'Consider prepaying or refinancing high-interest loans.'
        });
      }
    }

    // Goal insights
    if (goals && goals.length > 0) {
      const atRiskGoals = goals.filter(g => {
        const progress = g.targetAmount > 0 ? (g.currentAmount || g.saved || 0) / g.targetAmount : 0;
        const deadline = g.deadline || g.targetDate;
        if (!deadline) return false;
        const daysLeft = (new Date(deadline) - Date.now()) / (1000 * 60 * 60 * 24);
        return progress < 0.5 && daysLeft < 365 && daysLeft > 0;
      });

      if (atRiskGoals.length > 0) {
        insights.push({
          type: 'goals_at_risk',
          severity: 'warning',
          title: 'Financial Goals Need Attention',
          message: `${atRiskGoals.length} goal(s) are behind schedule: ${atRiskGoals.map(g => g.name || g.title).join(', ')}`,
          actionable: true,
          action: 'Increase monthly contributions to get back on track.'
        });
      }
    }

    return {
      insights: insights.sort((a, b) => {
        const severityOrder = { warning: 0, info: 1, positive: 2 };
        return (severityOrder[a.severity] || 1) - (severityOrder[b.severity] || 1);
      }),
      generatedAt: new Date(),
      totalInsights: insights.length
    };
  }

  // ============================================================================
  // §18  HELPER METHODS
  // ============================================================================

  _registerConversationHandlers() {
    // Register intent handlers that connect to data services
    this.conversationEngine.registerHandler('spending_query', async (userId, slots, context) => {
      const transactions = context.transactions || [];
      const category = slots.category;
      const expenses = category
        ? transactions.filter(t => t.type === 'expense' && (t.category || '').toLowerCase() === category)
        : transactions.filter(t => t.type === 'expense');

      const total = expenses.reduce((s, t) => s + Math.abs(t.amount || 0), 0);

      const breakdown = {};
      for (const t of expenses) {
        const cat = t.category || 'uncategorized';
        breakdown[cat] = (breakdown[cat] || 0) + Math.abs(t.amount || 0);
      }

      return {
        total,
        breakdown,
        timePeriod: slots.time_period || 'recent',
        category,
        count: expenses.length
      };
    });

    this.conversationEngine.registerHandler('health_query', async (userId, slots, context) => {
      try {
        const result = await this.computeFinancialHealthScore(userId, context);
        return result;
      } catch {
        return { score: 0, message: 'Unable to compute health score. Please provide more financial data.' };
      }
    });

    this.conversationEngine.registerHandler('forecast_query', async (userId, slots, context) => {
      try {
        const result = await this.predictSpending(userId, context.transactions || []);
        return {
          predictions: result.forecast || [],
          trend: result.bestModel || 'statistical',
          confidence: 0.7,
          category: slots.category || 'Total'
        };
      } catch {
        return { predictions: [], message: 'Unable to generate forecast.' };
      }
    });
  }

  _generateAnalysisSummary(results, data) {
    const parts = [];

    if (results.healthScore) {
      parts.push(`Financial Health: ${results.healthScore.overallScore}/100 (${results.healthScore.rating})`);
    }

    if (results.anomalies?.summary) {
      parts.push(`Anomalies: ${results.anomalies.summary.anomaliesFound} detected out of ${results.anomalies.summary.totalAnalyzed} transactions`);
    }

    if (results.recommendations?.length > 0) {
      parts.push(`Top Recommendation: ${results.recommendations[0].message}`);
    }

    if (results.spendingForecast?.forecast?.length > 0) {
      const nextWeek = results.spendingForecast.forecast[0];
      parts.push(`Next Week Forecast: ₹${Math.round(nextWeek.predicted).toLocaleString()}`);
    }

    return this.nlExplainer.generateInsightNarrative({
      savingsRate: data.transactions ? (() => {
        const inc = data.transactions.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
        const exp = data.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
        return inc > 0 ? (inc - exp) / inc : 0;
      })() : undefined,
      topSpendingCategory: data.transactions ? (() => {
        const cats = {};
        for (const t of data.transactions.filter(t => t.type === 'expense')) {
          cats[t.category || 'unknown'] = (cats[t.category || 'unknown'] || 0) + Math.abs(t.amount || 0);
        }
        const top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
        return top ? { name: top[0], amount: top[1] } : null;
      })() : undefined
    }) + '\n\n' + parts.join('. ');
  }

  _fallbackBudgetAdvice(financialData) {
    const income = financialData.monthlyIncome || 50000;
    return {
      needs: { amount: income * 0.5, percent: 50, categories: ['rent', 'food', 'utilities', 'healthcare'] },
      wants: { amount: income * 0.3, percent: 30, categories: ['entertainment', 'shopping', 'dining'] },
      savings: { amount: income * 0.2, percent: 20, categories: ['emergency fund', 'investments', 'goals'] },
      rule: '50/30/20',
      message: 'Using the 50/30/20 rule as baseline budget allocation.'
    };
  }

  async _safeExecute(fn) {
    try {
      return await fn();
    } catch (error) {
      logger.debug(`Safe execute error: ${error.message}`);
      return null;
    }
  }

  _trackRequest(type) {
    this.stats.totalRequests++;
    this.stats.requestsByType[type] = (this.stats.requestsByType[type] || 0) + 1;
  }

  // ============================================================================
  // §19  STATUS & STATS
  // ============================================================================

  getStatus() {
    return {
      initialized: this.initialized,
      uptime: Date.now() - this.startTime,
      stats: this.stats,
      modules: {
        reinforcementLearning: true,
        anomalyDetection: true,
        knowledgeGraph: true,
        autoML: true,
        explainableAI: true,
        conversationalAI: true,
        modelMonitoring: true
      },
      monitoring: this.monitoring.getDashboard()?.summary || {},
      version: '3.0.0'
    };
  }
}

// ============================================================================
// EXPORTS — Singleton
// ============================================================================

module.exports = new AIOrchestrator();
