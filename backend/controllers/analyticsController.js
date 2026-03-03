// ============================================================================
// Enhanced Analytics Controller — Enterprise Analytics API Handlers
// ============================================================================

const AnalyticsEngine = require('../services/analyticsEngine');

const analyticsController = {
  // GET /api/analytics/comprehensive
  async getComprehensiveDashboard(req, res) {
    try {
      const days = parseInt(req.query.days) || 30;
      const data = await AnalyticsEngine.getComprehensiveDashboard(req.user.id || req.user._id, days);
      res.json({ success: true, data });
    } catch (err) {
      console.error('Comprehensive dashboard error:', err);
      res.status(500).json({ success: false, message: 'Analytics failed', error: err.message });
    }
  },

  // GET /api/analytics/spending
  async getSpendingAnalytics(req, res) {
    try {
      const days = parseInt(req.query.days) || 30;
      const data = await AnalyticsEngine.getSpendingAnalytics(req.user.id || req.user._id, { days });
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Spending analytics failed', error: err.message });
    }
  },

  // GET /api/analytics/income
  async getIncomeAnalytics(req, res) {
    try {
      const days = parseInt(req.query.days) || 90;
      const data = await AnalyticsEngine.getIncomeAnalytics(req.user.id || req.user._id, days);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Income analytics failed', error: err.message });
    }
  },

  // GET /api/analytics/ratios
  async getFinancialRatios(req, res) {
    try {
      const days = parseInt(req.query.days) || 30;
      const data = await AnalyticsEngine.getFinancialRatios(req.user.id || req.user._id, days);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Financial ratios failed', error: err.message });
    }
  },

  // GET /api/analytics/monthly-comparison
  async getMonthlyComparison(req, res) {
    try {
      const months = parseInt(req.query.months) || 6;
      const data = await AnalyticsEngine.getMonthlyComparison(req.user.id || req.user._id, months);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Monthly comparison failed', error: err.message });
    }
  },

  // GET /api/analytics/merchants
  async getMerchantAnalytics(req, res) {
    try {
      const days = parseInt(req.query.days) || 90;
      const data = await AnalyticsEngine.getMerchantAnalytics(req.user.id || req.user._id, days);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Merchant analytics failed', error: err.message });
    }
  },

  // GET /api/analytics/networth
  async getNetWorth(req, res) {
    try {
      const data = await AnalyticsEngine.getNetWorth(req.user.id || req.user._id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Net worth calculation failed', error: err.message });
    }
  },

  // GET /api/analytics/budget-status
  async getBudgetStatus(req, res) {
    try {
      const data = await AnalyticsEngine.getBudgetStatus(req.user.id || req.user._id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Budget status failed', error: err.message });
    }
  },

  // GET /api/analytics/cashflow-projection
  async getCashflowProjection(req, res) {
    try {
      const months = parseInt(req.query.months) || 6;
      const data = await AnalyticsEngine.getCashflowProjection(req.user.id || req.user._id, months);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Cashflow projection failed', error: err.message });
    }
  },

  // GET /api/analytics/goals
  async getGoalAnalytics(req, res) {
    try {
      const data = await AnalyticsEngine.getGoalAnalytics(req.user.id || req.user._id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Goal analytics failed', error: err.message });
    }
  },
};

module.exports = analyticsController;
