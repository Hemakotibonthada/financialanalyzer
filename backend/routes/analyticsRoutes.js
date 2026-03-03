const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');
const advancedAnalyticsService = require('../services/advancedAnalyticsService');
const { authenticate } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');
const logger = require('../utils/logger');

/**
 * GET /api/analytics/test
 * Test route to debug the issue
 */
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Analytics routes working' });
});

/**
 * GET /api/analytics/dashboard
 * Get comprehensive financial dashboard
 */
router.get('/dashboard', authenticate, cacheMiddleware(60), async (req, res) => {
  try {
    logger.info(`Dashboard request from user: ${req.user._id}`);
    
    const dashboard = await analyticsService.generateDashboard(req.user._id);
    
    res.json({
      success: true,
      data: dashboard,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Dashboard generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate dashboard',
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/trends/:months
 * Get monthly spending/income trends
 */
router.get('/trends/:months', authenticate, async (req, res) => {
  try {
    const months = parseInt(req.params.months) || 6;
    
    if (months < 1 || months > 24) {
      return res.status(400).json({
        success: false,
        message: 'Months parameter must be between 1 and 24'
      });
    }
    
    logger.info(`Monthly trends request: ${months} months for user ${req.user._id}`);
    
    const trends = await analyticsService.getMonthlyTrends(req.user._id, months);
    
    res.json({
      success: true,
      data: trends,
      requestedMonths: months
    });
    
  } catch (error) {
    logger.error('Monthly trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get monthly trends',
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/categories/:months
 * Get category breakdown for pie charts
 */
router.get('/categories/:months', authenticate, async (req, res) => {
  try {
    const months = parseInt(req.params.months) || 6;
    
    logger.info(`Category breakdown request: ${months} months for user ${req.user._id}`);
    
    const categoryBreakdown = await analyticsService.getCategoryBreakdown(req.user._id, months);
    
    res.json({
      success: true,
      data: categoryBreakdown,
      requestedMonths: months
    });
    
  } catch (error) {
    logger.error('Category breakdown error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get category breakdown',
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/patterns
 * Get spending patterns analysis
 */
router.get('/patterns', authenticate, async (req, res) => {
  try {
    logger.info(`Spending patterns request for user ${req.user._id}`);
    
    const patterns = await analyticsService.getSpendingPatterns(req.user._id);
    
    res.json({
      success: true,
      data: patterns
    });
    
  } catch (error) {
    logger.error('Spending patterns error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get spending patterns',
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/budget
 * Get budget analysis and tracking
 */
router.get('/budget', authenticate, async (req, res) => {
  try {
    logger.info(`Budget analysis request for user ${req.user._id}`);
    
    const budgetAnalysis = await analyticsService.getBudgetAnalysis(req.user._id);
    
    res.json({
      success: true,
      data: budgetAnalysis
    });
    
  } catch (error) {
    logger.error('Budget analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get budget analysis',
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/savings-goals
 * Get savings goals progress
 */
router.get('/savings-goals', authenticate, async (req, res) => {
  try {
    logger.info(`Savings goals request for user ${req.user._id}`);
    
    const savingsGoals = await analyticsService.getSavingsGoals(req.user._id);
    
    res.json({
      success: true,
      data: savingsGoals
    });
    
  } catch (error) {
    logger.error('Savings goals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get savings goals',
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/recurring
 * Get recurring transactions and subscriptions
 */
router.get('/recurring', authenticate, async (req, res) => {
  try {
    logger.info(`Recurring transactions request for user ${req.user._id}`);
    
    const recurringTransactions = await analyticsService.getRecurringTransactions(req.user._id);
    
    res.json({
      success: true,
      data: recurringTransactions,
      count: recurringTransactions.length
    });
    
  } catch (error) {
    logger.error('Recurring transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recurring transactions',
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/health
 * Get financial health score and analysis
 */
router.get('/health', authenticate, async (req, res) => {
  try {
    logger.info(`Financial health request for user ${req.user._id}`);
    
    const healthAnalysis = await analyticsService.calculateFinancialHealth(req.user._id);
    
    res.json({
      success: true,
      data: healthAnalysis
    });
    
  } catch (error) {
    logger.error('Financial health error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate financial health',
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/recommendations
 * Get personalized financial recommendations
 */
router.get('/recommendations', authenticate, async (req, res) => {
  try {
    logger.info(`Recommendations request for user ${req.user._id}`);
    
    // Get financial health first
    const financialHealth = await analyticsService.calculateFinancialHealth(req.user._id);
    
    // Generate recommendations based on health
    const recommendations = await analyticsService.generateRecommendations(req.user._id, financialHealth);
    
    res.json({
      success: true,
      data: {
        recommendations,
        financialHealthScore: financialHealth.score,
        totalRecommendations: recommendations.length,
        highPriorityCount: recommendations.filter(r => r.priority === 'high').length
      }
    });
    
  } catch (error) {
    logger.error('Recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate recommendations',
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/summary
 * Get quick financial summary
 */
router.get('/summary', authenticate, async (req, res) => {
  try {
    logger.info(`Financial summary request for user ${req.user._id}`);
    
    // Get key metrics
    const [monthlyTrends, budgetAnalysis, healthAnalysis] = await Promise.all([
      analyticsService.getMonthlyTrends(req.user._id, 2),
      analyticsService.getBudgetAnalysis(req.user._id),
      analyticsService.calculateFinancialHealth(req.user._id)
    ]);
    
    const currentMonth = monthlyTrends.currentMonth || {};
    const previousMonth = monthlyTrends.previousMonth || {};
    
    const summary = {
      currentMonth: {
        spending: currentMonth.totalSpending || 0,
        income: currentMonth.totalIncome || 0,
        netSavings: (currentMonth.totalIncome || 0) - (currentMonth.totalSpending || 0),
        transactionCount: currentMonth.transactionCount || 0
      },
      monthOverMonth: {
        spendingChange: (currentMonth.totalSpending || 0) - (previousMonth.totalSpending || 0),
        incomeChange: (currentMonth.totalIncome || 0) - (previousMonth.totalIncome || 0),
        spendingChangePercent: previousMonth.totalSpending ? 
          Math.round(((currentMonth.totalSpending - previousMonth.totalSpending) / previousMonth.totalSpending) * 100) : 0,
        incomeChangePercent: previousMonth.totalIncome ? 
          Math.round(((currentMonth.totalIncome - previousMonth.totalIncome) / previousMonth.totalIncome) * 100) : 0
      },
      budget: {
        hasBudget: budgetAnalysis.hasBudget,
        status: budgetAnalysis.overallStatus || 'no_budget',
        remaining: budgetAnalysis.totalRemaining || 0,
        utilizationPercent: budgetAnalysis.totalBudget ? 
          Math.round((budgetAnalysis.totalSpent / budgetAnalysis.totalBudget) * 100) : 0
      },
      health: {
        score: healthAnalysis.score,
        grade: healthAnalysis.grade,
        trend: 'stable' // Would need historical data to calculate
      }
    };
    
    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Financial summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get financial summary',
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/export/:type
 * Export analytics data in different formats
 */
router.get('/export/:type', authenticate, async (req, res) => {
  try {
    const { type } = req.params;
    const { format = 'json', months = 6 } = req.query;
    
    logger.info(`Export request: ${type} (${format}) for user ${req.user._id}`);
    
    let data;
    
    switch (type) {
      case 'dashboard':
        data = await analyticsService.generateDashboard(req.user._id);
        break;
      case 'trends':
        data = await analyticsService.getMonthlyTrends(req.user._id, parseInt(months));
        break;
      case 'categories':
        data = await analyticsService.getCategoryBreakdown(req.user._id, parseInt(months));
        break;
      case 'budget':
        data = await analyticsService.getBudgetAnalysis(req.user._id);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export type. Supported: dashboard, trends, categories, budget'
        });
    }
    
    // Set appropriate headers for download
    const filename = `financial-${type}-${new Date().toISOString().split('T')[0]}.${format}`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    if (format === 'csv') {
      // Simple CSV conversion for basic data
      res.setHeader('Content-Type', 'text/csv');
      const csv = convertToCSV(data);
      res.send(csv);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.json({
        success: true,
        exportType: type,
        format: format,
        generatedAt: new Date().toISOString(),
        data: data
      });
    }
    
  } catch (error) {
    logger.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data',
      error: error.message
    });
  }
});

/**
 * Helper function to convert data to CSV
 */
function convertToCSV(data) {
  if (!data) return '';
  
  // Simple CSV conversion - would need to be enhanced for complex nested data
  if (Array.isArray(data)) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value}"` : value;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }
  
  // For non-array data, convert to key-value pairs
  const entries = Object.entries(data);
  return entries.map(([key, value]) => `"${key}","${value}"`).join('\n');
}

/**
 * GET /api/analytics/advanced/forecast
 * Get spending forecast for next N days
 */
router.get('/advanced/forecast', authenticate, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysToForecast = Math.min(Math.max(parseInt(days), 7), 90);
    
    logger.info(`Spending forecast request: ${daysToForecast} days for user ${req.user._id}`);
    
    const forecast = await advancedAnalyticsService.generateSpendingForecast(req.user._id, daysToForecast);
    
    res.json({
      success: true,
      data: forecast,
      daysForecasted: daysToForecast
    });
    
  } catch (error) {
    logger.error('Spending forecast error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate spending forecast',
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/advanced/anomalies
 * Detect unusual spending patterns
 */
router.get('/advanced/anomalies', authenticate, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const lookbackDays = Math.min(Math.max(parseInt(days), 7), 90);
    
    logger.info(`Anomaly detection request: ${lookbackDays} days for user ${req.user._id}`);
    
    const anomalies = await advancedAnalyticsService.detectAnomalies(req.user._id, lookbackDays);
    
    res.json({
      success: true,
      data: anomalies,
      lookbackDays
    });
    
  } catch (error) {
    logger.error('Anomaly detection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect anomalies',
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/advanced/heatmap
 * Get spending heatmap by day/hour
 */
router.get('/advanced/heatmap', authenticate, async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const lookbackDays = Math.min(Math.max(parseInt(days), 30), 180);
    
    logger.info(`Spending heatmap request: ${lookbackDays} days for user ${req.user._id}`);
    
    const heatmap = await advancedAnalyticsService.generateSpendingHeatmap(req.user._id, lookbackDays);
    
    res.json({
      success: true,
      data: heatmap,
      lookbackDays
    });
    
  } catch (error) {
    logger.error('Spending heatmap error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate spending heatmap',
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/advanced/health-score
 * Calculate comprehensive financial health score
 */
router.get('/advanced/health-score', authenticate, async (req, res) => {
  try {
    logger.info(`Health score calculation for user ${req.user._id}`);
    
    const healthScore = await advancedAnalyticsService.calculateFinancialHealthScore(req.user._id);
    
    res.json({
      success: true,
      data: healthScore
    });
    
  } catch (error) {
    logger.error('Health score calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate financial health score',
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/advanced/savings-opportunities
 * Identify areas where user can save money
 */
router.get('/advanced/savings-opportunities', authenticate, async (req, res) => {
  try {
    logger.info(`Savings opportunities request for user ${req.user._id}`);
    
    const opportunities = await advancedAnalyticsService.identifySavingsOpportunities(req.user._id);
    
    res.json({
      success: true,
      data: opportunities
    });
    
  } catch (error) {
    logger.error('Savings opportunities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to identify savings opportunities',
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/advanced/complete-dashboard
 * Get all advanced analytics in one call
 */
router.get('/advanced/complete-dashboard', authenticate, async (req, res) => {
  try {
    logger.info(`Complete advanced analytics dashboard for user ${req.user._id}`);
    
    const [forecast, anomalies, heatmap, healthScore, savingsOpportunities] = await Promise.all([
      advancedAnalyticsService.generateSpendingForecast(req.user._id, 30),
      advancedAnalyticsService.detectAnomalies(req.user._id, 30),
      advancedAnalyticsService.generateSpendingHeatmap(req.user._id, 90),
      advancedAnalyticsService.calculateFinancialHealthScore(req.user._id),
      advancedAnalyticsService.identifySavingsOpportunities(req.user._id)
    ]);
    
    res.json({
      success: true,
      data: {
        forecast: {
          next30Days: forecast.forecast,
          confidence: forecast.confidence,
          summary: forecast.summary
        },
        anomalies: {
          detected: anomalies.anomalies,
          summary: anomalies.summary
        },
        heatmap: {
          data: heatmap.heatmap,
          peakTimes: heatmap.peakTimes,
          dayTotals: heatmap.dayTotals
        },
        healthScore: {
          score: healthScore.score,
          rating: healthScore.rating,
          factors: healthScore.factors,
          recommendations: healthScore.recommendations
        },
        savingsOpportunities: {
          opportunities: savingsOpportunities.opportunities,
          totalPotentialSavings: savingsOpportunities.totalPotentialSavings
        }
      },
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Complete advanced dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate complete advanced analytics dashboard',
      error: error.message
    });
  }
});

// ============================================================================
// ENTERPRISE V2 ANALYTICS ENDPOINTS (powered by AnalyticsEngine)
// ============================================================================

const analyticsController = require('../controllers/analyticsController');

// GET /api/analytics/v2/comprehensive — Full enterprise dashboard
router.get('/v2/comprehensive', authenticate, analyticsController.getComprehensiveDashboard);

// GET /api/analytics/v2/spending — Deep spending analysis
router.get('/v2/spending', authenticate, analyticsController.getSpendingAnalytics);

// GET /api/analytics/v2/income — Income analytics with stability score
router.get('/v2/income', authenticate, analyticsController.getIncomeAnalytics);

// GET /api/analytics/v2/ratios — Financial health ratios
router.get('/v2/ratios', authenticate, analyticsController.getFinancialRatios);

// GET /api/analytics/v2/monthly — Month-over-month comparison
router.get('/v2/monthly', authenticate, analyticsController.getMonthlyComparison);

// GET /api/analytics/v2/merchants — Merchant-level analytics
router.get('/v2/merchants', authenticate, analyticsController.getMerchantAnalytics);

// GET /api/analytics/v2/networth — Net worth calculation
router.get('/v2/networth', authenticate, analyticsController.getNetWorth);

// GET /api/analytics/v2/budget-status — Real-time budget utilization
router.get('/v2/budget-status', authenticate, analyticsController.getBudgetStatus);

// GET /api/analytics/v2/cashflow — Forward-looking cashflow projection
router.get('/v2/cashflow', authenticate, analyticsController.getCashflowProjection);

// GET /api/analytics/v2/goals — Goal progress analytics
router.get('/v2/goals', authenticate, analyticsController.getGoalAnalytics);

module.exports = router;