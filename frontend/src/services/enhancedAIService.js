// ============================================================================
// ENHANCED AI SERVICE — Frontend Integration for All AI Features
// ============================================================================
// Complete API client for: RL optimization, anomaly detection, knowledge
// graph, AutoML, explainable AI, conversational AI, model monitoring,
// financial health scoring, and smart categorization.
// ============================================================================

import api from './api';

const AI_BASE = '/api/ai-enhanced';

// ============================================================================
// §1  COMPREHENSIVE ANALYSIS
// ============================================================================

export const runComprehensiveAnalysis = async (data = {}) => {
  const response = await api.post(`${AI_BASE}/analyze`, data);
  return response.data;
};

export const getAIStatus = async () => {
  const response = await api.get(`${AI_BASE}/status`);
  return response.data;
};

// ============================================================================
// §2  CONVERSATIONAL AI
// ============================================================================

export const sendChatMessage = async (message, history = []) => {
  const response = await api.post(`${AI_BASE}/chat`, { message, history });
  return response.data;
};

export const getChatSummary = async () => {
  const response = await api.get(`${AI_BASE}/chat/summary`);
  return response.data;
};

// ============================================================================
// §3  BUDGET OPTIMIZATION (RL)
// ============================================================================

export const optimizeBudget = async (data = {}) => {
  const response = await api.post(`${AI_BASE}/optimize/budget`, data);
  return response.data;
};

export const optimizeInvestments = async (data = {}) => {
  const response = await api.post(`${AI_BASE}/optimize/investments`, data);
  return response.data;
};

export const optimizeDebtPayoff = async (data = {}) => {
  const response = await api.post(`${AI_BASE}/optimize/debt`, data);
  return response.data;
};

// ============================================================================
// §4  ANOMALY DETECTION
// ============================================================================

export const getAnomalies = async (days = 90) => {
  const response = await api.get(`${AI_BASE}/anomalies`, { params: { days } });
  return response.data;
};

export const checkTransactionAnomaly = async (transaction) => {
  const response = await api.post(`${AI_BASE}/anomalies/check`, { transaction });
  return response.data;
};

// ============================================================================
// §5  KNOWLEDGE GRAPH
// ============================================================================

export const queryKnowledgeGraph = async (question) => {
  const response = await api.post(`${AI_BASE}/knowledge/query`, { question });
  return response.data;
};

export const getKnowledgeGraphData = async () => {
  const response = await api.get(`${AI_BASE}/knowledge/graph`);
  return response.data;
};

// ============================================================================
// §6  FINANCIAL HEALTH
// ============================================================================

export const getHealthScore = async () => {
  const response = await api.get(`${AI_BASE}/health-score`);
  return response.data;
};

// ============================================================================
// §7  SPENDING PREDICTION
// ============================================================================

export const predictSpending = async (weeks = 4) => {
  const response = await api.get(`${AI_BASE}/predict/spending`, { params: { weeks } });
  return response.data;
};

// ============================================================================
// §8  SMART CATEGORIZATION
// ============================================================================

export const smartCategorize = async (transaction) => {
  const response = await api.post(`${AI_BASE}/categorize`, { transaction });
  return response.data;
};

export const batchCategorize = async (transactions) => {
  const response = await api.post(`${AI_BASE}/categorize`, { transactions });
  return response.data;
};

// ============================================================================
// §9  INSIGHTS
// ============================================================================

export const getAIInsights = async () => {
  const response = await api.get(`${AI_BASE}/insights`);
  return response.data;
};

// ============================================================================
// §10  WHAT-IF ANALYSIS
// ============================================================================

export const runWhatIfAnalysis = async (scenario) => {
  const response = await api.post(`${AI_BASE}/what-if`, { scenario });
  return response.data;
};

// ============================================================================
// §11  EXPLAINABILITY
// ============================================================================

export const explainDecision = async (decisionType, data) => {
  const response = await api.post(`${AI_BASE}/explain`, { decisionType, data });
  return response.data;
};

export const getAuditTrail = async () => {
  const response = await api.get(`${AI_BASE}/audit-trail`);
  return response.data;
};

// ============================================================================
// §12  AUTO-ML
// ============================================================================

export const runAutoML = async (task, data = {}) => {
  const response = await api.post(`${AI_BASE}/automl/run`, { task, data });
  return response.data;
};

export const getAutoMLHistory = async () => {
  const response = await api.get(`${AI_BASE}/automl/history`);
  return response.data;
};

// ============================================================================
// §13  MODEL MONITORING
// ============================================================================

export const getMonitoringDashboard = async (modelId = null) => {
  const params = modelId ? { modelId } : {};
  const response = await api.get(`${AI_BASE}/monitoring/dashboard`, { params });
  return response.data;
};

export const getModelMetrics = async (modelId) => {
  const response = await api.get(`${AI_BASE}/monitoring/metrics/${modelId}`);
  return response.data;
};

export const getMonitoringAlerts = async (modelId = null) => {
  const params = modelId ? { modelId } : {};
  const response = await api.get(`${AI_BASE}/monitoring/alerts`, { params });
  return response.data;
};

export const acknowledgeAlert = async (alertId) => {
  const response = await api.post(`${AI_BASE}/monitoring/alerts/${alertId}/acknowledge`);
  return response.data;
};

// ============================================================================
// §14  A/B TESTING
// ============================================================================

export const createABTest = async (config) => {
  const response = await api.post(`${AI_BASE}/ab-test/create`, config);
  return response.data;
};

export const getABTests = async () => {
  const response = await api.get(`${AI_BASE}/ab-test/list`);
  return response.data;
};

// ============================================================================
// §15  FEEDBACK
// ============================================================================

export const submitFeedback = async (data) => {
  const response = await api.post(`${AI_BASE}/feedback`, data);
  return response.data;
};

// ============================================================================
// §16  FRAUD DETECTION (Extended API)
// ============================================================================

const AI_EXT = '/api/ai-extended';

export const screenTransaction = async (transaction) => {
  const response = await api.post(`${AI_EXT}/fraud/screen`, { transaction });
  return response.data;
};

export const screenTransactionBatch = async (transactions) => {
  const response = await api.post(`${AI_EXT}/fraud/screen-batch`, { transactions });
  return response.data;
};

export const initializeFraudProfile = async () => {
  const response = await api.post(`${AI_EXT}/fraud/initialize`);
  return response.data;
};

export const getFraudAlerts = async (filters = {}) => {
  const response = await api.get(`${AI_EXT}/fraud/alerts`, { params: filters });
  return response.data;
};

export const resolveFraudAlert = async (alertId, resolution) => {
  const response = await api.post(`${AI_EXT}/fraud/alerts/${alertId}/resolve`, { resolution });
  return response.data;
};

export const getFraudStats = async () => {
  const response = await api.get(`${AI_EXT}/fraud/stats`);
  return response.data;
};

// ============================================================================
// §17  NL REPORTS (Extended API)
// ============================================================================

export const generateReport = async (period = 'monthly') => {
  const response = await api.get(`${AI_EXT}/reports/generate`, { params: { period } });
  return response.data;
};

export const getQuickSummary = async () => {
  const response = await api.get(`${AI_EXT}/reports/quick-summary`);
  return response.data;
};

export const getCategoryReport = async (category) => {
  const response = await api.get(`${AI_EXT}/reports/category/${category}`);
  return response.data;
};

// ============================================================================
// §18  DOCUMENT INTELLIGENCE (Extended API)
// ============================================================================

export const analyzeDocument = async (text, documentType = null) => {
  const response = await api.post(`${AI_EXT}/documents/analyze`, { text, documentType });
  return response.data;
};

export const extractAmounts = async (text) => {
  const response = await api.post(`${AI_EXT}/documents/extract-amounts`, { text });
  return response.data;
};

// ============================================================================
// §19  BEHAVIORAL FINANCE (Extended API)
// ============================================================================

export const getBehavioralAnalysis = async () => {
  const response = await api.get(`${AI_EXT}/behavioral/analyze`);
  return response.data;
};

// ============================================================================
// §20  SPENDING INTELLIGENCE (Extended API)
// ============================================================================

export const getSpendingIntelligence = async () => {
  const response = await api.get(`${AI_EXT}/spending/intelligence`);
  return response.data;
};

// ============================================================================
// §21  RECOMMENDATIONS (Extended API)
// ============================================================================

export const getRecommendations = async () => {
  const response = await api.get(`${AI_EXT}/recommendations`);
  return response.data;
};

export const submitRecommendationFeedback = async (recommendationId, action) => {
  const response = await api.post(`${AI_EXT}/recommendations/feedback`, { recommendationId, action });
  return response.data;
};

// ============================================================================
// §22  FINANCIAL FORECASTING (Extended API)
// ============================================================================

export const getEnsembleForecast = async (days = 30) => {
  const response = await api.get(`${AI_EXT}/forecast/ensemble`, { params: { days } });
  return response.data;
};

export const runMonteCarloSimulation = async (type, config, simulations = 500) => {
  const response = await api.post(`${AI_EXT}/forecast/monte-carlo`, { type, config, simulations });
  return response.data;
};

// ============================================================================
// §23  FINANCIAL PLANNING (Extended API)
// ============================================================================

export const getComprehensivePlan = async (data = {}) => {
  const response = await api.post(`${AI_EXT}/planning/comprehensive`, data);
  return response.data;
};

export const compareTaxRegimes = async (income, deductions = {}) => {
  const response = await api.post(`${AI_EXT}/planning/tax-comparison`, { income, deductions });
  return response.data;
};

export const planRetirement = async (config = {}) => {
  const response = await api.post(`${AI_EXT}/planning/retirement`, config);
  return response.data;
};

export const analyzeInsuranceGaps = async (config = {}) => {
  const response = await api.post(`${AI_EXT}/planning/insurance-gap`, config);
  return response.data;
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

const enhancedAIService = {
  // Analysis
  runComprehensiveAnalysis,
  getAIStatus,

  // Chat
  sendChatMessage,
  getChatSummary,

  // Optimization
  optimizeBudget,
  optimizeInvestments,
  optimizeDebtPayoff,

  // Anomalies
  getAnomalies,
  checkTransactionAnomaly,

  // Knowledge Graph
  queryKnowledgeGraph,
  getKnowledgeGraphData,

  // Health
  getHealthScore,

  // Predictions
  predictSpending,

  // Categorization
  smartCategorize,
  batchCategorize,

  // Insights
  getAIInsights,

  // What-If
  runWhatIfAnalysis,

  // Explainability
  explainDecision,
  getAuditTrail,

  // AutoML
  runAutoML,
  getAutoMLHistory,

  // Monitoring
  getMonitoringDashboard,
  getModelMetrics,
  getMonitoringAlerts,
  acknowledgeAlert,

  // A/B Testing
  createABTest,
  getABTests,

  // Feedback
  submitFeedback,

  // Fraud Detection
  screenTransaction,
  screenTransactionBatch,
  initializeFraudProfile,
  getFraudAlerts,
  resolveFraudAlert,
  getFraudStats,

  // NL Reports
  generateReport,
  getQuickSummary,
  getCategoryReport,

  // Document Intelligence
  analyzeDocument,
  extractAmounts,

  // Behavioral Finance
  getBehavioralAnalysis,

  // Spending Intelligence
  getSpendingIntelligence,

  // Recommendations
  getRecommendations,
  submitRecommendationFeedback,

  // Financial Forecasting
  getEnsembleForecast,
  runMonteCarloSimulation,

  // Financial Planning
  getComprehensivePlan,
  compareTaxRegimes,
  planRetirement,
  analyzeInsuranceGaps
};

export default enhancedAIService;
