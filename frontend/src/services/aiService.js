// ============================================================================
// AI Service — Frontend integration layer for all AI endpoints
// ============================================================================
// Handles communication with the enhanced AI backend modules:
// Neural networks, NLP, time series, clustering, decision trees, training pipeline
// ============================================================================

import api from './api';

// ============================================================================
// §1  AI DASHBOARD & HEALTH
// ============================================================================

export const getAIDashboard = async () => {
  const response = await api.get('/ai/dashboard');
  return response.data;
};

export const getFinancialHealthScore = async () => {
  const response = await api.get('/ai/health-score');
  return response.data;
};

export const getAIRecommendations = async () => {
  const response = await api.get('/ai/recommendations');
  return response.data;
};

// ============================================================================
// §2  FORECASTING
// ============================================================================

export const getSpendingForecast = async (months = 3) => {
  const response = await api.get(`/ai/forecast/spending?months=${months}`);
  return response.data;
};

export const getIncomeForecast = async (months = 3) => {
  const response = await api.get(`/ai/forecast/income?months=${months}`);
  return response.data;
};

export const getSavingsForecast = async (months = 6) => {
  const response = await api.get(`/ai/forecast/savings?months=${months}`);
  return response.data;
};

export const getCashflowProjection = async (months = 6) => {
  const response = await api.get(`/ai/forecast/cashflow?months=${months}`);
  return response.data;
};

export const getMovingAverages = async (period = 30) => {
  const response = await api.get(`/ai/moving-averages?period=${period}`);
  return response.data;
};

// ============================================================================
// §3  ANOMALY DETECTION & PATTERNS
// ============================================================================

export const getAnomalies = async () => {
  const response = await api.get('/ai/anomalies');
  return response.data;
};

export const getRecurringPatterns = async () => {
  const response = await api.get('/ai/patterns/recurring');
  return response.data;
};

export const getSpendingPatterns = async () => {
  const response = await api.get('/ai/patterns/spending');
  return response.data;
};

export const getChangepoints = async () => {
  const response = await api.get('/ai/changepoints');
  return response.data;
};

// ============================================================================
// §4  ANALYTICS
// ============================================================================

export const getMerchantAnalysis = async () => {
  const response = await api.get('/ai/merchant-analysis');
  return response.data;
};

export const getVelocityAnalysis = async () => {
  const response = await api.get('/ai/velocity');
  return response.data;
};

export const getInsights = async () => {
  const response = await api.get('/ai/insights');
  return response.data;
};

export const getRiskAssessment = async () => {
  const response = await api.get('/ai/risk-assessment');
  return response.data;
};

// ============================================================================
// §5  NLP & CONVERSATIONAL AI
// ============================================================================

export const getSentimentAnalysis = async (texts) => {
  const response = await api.post('/ai/sentiment', { texts });
  return response.data;
};

export const extractEntities = async (text) => {
  const response = await api.post('/ai/entities', { text });
  return response.data;
};

export const processAIQuery = async (query, sessionId = null) => {
  const response = await api.post('/ai/query', { query, sessionId });
  return response.data;
};

export const getFinancialSummary = async (period = 30) => {
  const response = await api.get(`/ai/summary?days=${period}`);
  return response.data;
};

// ============================================================================
// §6  TRAINING & CATEGORIZATION
// ============================================================================

export const trainAIModels = async () => {
  const response = await api.post('/ai/train');
  return response.data;
};

export const categorizeTransaction = async (description, amount) => {
  const response = await api.post('/ai/categorize', { description, amount });
  return response.data;
};

export const getPipelineStatus = async () => {
  const response = await api.get('/ai/pipeline/status');
  return response.data;
};

// ============================================================================
// §7  COMPREHENSIVE AI DATA FETCHER — Fetches multiple datasets in parallel
// ============================================================================

export const fetchAllAIData = async () => {
  const results = {};
  const endpoints = [
    { key: 'dashboard', fn: getAIDashboard },
    { key: 'healthScore', fn: getFinancialHealthScore },
    { key: 'recommendations', fn: getAIRecommendations },
    { key: 'anomalies', fn: getAnomalies },
    { key: 'insights', fn: getInsights },
    { key: 'recurringPatterns', fn: getRecurringPatterns },
    { key: 'spendingForecast', fn: () => getSpendingForecast(3) },
  ];

  const settled = await Promise.allSettled(endpoints.map(e => e.fn()));

  endpoints.forEach((endpoint, idx) => {
    const result = settled[idx];
    results[endpoint.key] = result.status === 'fulfilled' ? result.value : null;
  });

  return results;
};

// ============================================================================
// §8  AI CHAT SESSION MANAGER
// ============================================================================

export class AIChatSession {
  constructor() {
    this.sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.history = [];
  }

  async sendMessage(message) {
    this.history.push({ role: 'user', content: message, timestamp: new Date() });
    try {
      const response = await processAIQuery(message, this.sessionId);
      const assistantMessage = {
        role: 'assistant',
        content: response.response || response.answer || 'I couldn\'t process that query.',
        data: response.data || null,
        intent: response.intent || null,
        timestamp: new Date(),
      };
      this.history.push(assistantMessage);
      return assistantMessage;
    } catch (error) {
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        error: true,
        timestamp: new Date(),
      };
      this.history.push(errorMessage);
      return errorMessage;
    }
  }

  getHistory() { return [...this.history]; }
  clearHistory() { this.history = []; }

  getSuggestedQueries() {
    return [
      'What are my spending patterns this month?',
      'How is my financial health?',
      'Show me unusual transactions',
      'What\'s my savings forecast?',
      'How can I reduce expenses?',
      'What are my recurring payments?',
      'Analyze my income trends',
      'What\'s my budget utilization?',
      'Show me investment opportunities',
      'Predict next month\'s expenses',
    ];
  }
}

// ============================================================================
// §9  REAL-TIME AI MONITORING
// ============================================================================

export class AIMonitor {
  constructor() {
    this.pollInterval = null;
    this.listeners = new Map();
  }

  startMonitoring(interval = 30000) {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(async () => {
      try {
        const [health, anomalies] = await Promise.allSettled([
          getFinancialHealthScore(),
          getAnomalies(),
        ]);

        if (health.status === 'fulfilled') {
          this.emit('healthUpdate', health.value);
        }
        if (anomalies.status === 'fulfilled' && anomalies.value?.anomalies?.length > 0) {
          this.emit('anomalyDetected', anomalies.value);
        }
      } catch (e) {
        // Silently fail — monitoring is best-effort
      }
    }, interval);
  }

  stopMonitoring() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const cbs = this.listeners.get(event);
    if (cbs) this.listeners.set(event, cbs.filter(cb => cb !== callback));
  }

  emit(event, data) {
    const cbs = this.listeners.get(event);
    if (cbs) cbs.forEach(cb => cb(data));
  }
}

// ============================================================================
// §10  DATA FORMATTERS & UTILITIES
// ============================================================================

export const formatCurrency = (amount, currency = 'INR') => {
  if (amount == null || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: amount < 100 ? 2 : 0,
  }).format(amount);
};

export const formatPercentage = (value, decimals = 1) => {
  if (value == null || isNaN(value)) return '0%';
  return `${Number(value).toFixed(decimals)}%`;
};

export const formatNumber = (num) => {
  if (num == null || isNaN(num)) return '0';
  if (Math.abs(num) >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`;
  if (Math.abs(num) >= 100000) return `${(num / 100000).toFixed(2)} L`;
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(1)} K`;
  return num.toLocaleString('en-IN');
};

export const getScoreColor = (score) => {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#22c55e';
  if (score >= 40) return '#f59e0b';
  if (score >= 20) return '#f97316';
  return '#ef4444';
};

export const getScoreLabel = (score) => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  if (score >= 20) return 'Poor';
  return 'Critical';
};

export const getTrendIcon = (trend) => {
  if (trend > 0) return '↑';
  if (trend < 0) return '↓';
  return '→';
};

export const getCategoryColor = (category) => {
  const colors = {
    food: '#f97316', transport: '#3b82f6', shopping: '#ec4899',
    entertainment: '#8b5cf6', health: '#ef4444', education: '#6366f1',
    utilities: '#06b6d4', salary: '#10b981', investment: '#14b8a6',
    rent: '#f59e0b', insurance: '#64748b', emi: '#dc2626',
    transfer: '#6b7280', recharge: '#0ea5e9', travel: '#a855f7',
    other: '#9ca3af',
  };
  return colors[(category || '').toLowerCase()] || colors.other;
};

// ============================================================================
// §11  HOOKS — React hooks for AI data
// ============================================================================

import { useState as useStateHook, useEffect as useEffectHook, useCallback as useCallbackHook, useRef as useRefHook } from 'react';

export const useAIData = (fetchFn, deps = []) => {
  const [data, setData] = useStateHook(null);
  const [loading, setLoading] = useStateHook(true);
  const [error, setError] = useStateHook(null);

  const fetchData = useCallbackHook(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffectHook(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

export const useAIChat = () => {
  const sessionRef = useRefHook(new AIChatSession());
  const [messages, setMessages] = useStateHook([]);
  const [loading, setLoading] = useStateHook(false);

  const sendMessage = useCallbackHook(async (message) => {
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: message, timestamp: new Date() }]);
    const response = await sessionRef.current.sendMessage(message);
    setMessages(sessionRef.current.getHistory());
    setLoading(false);
    return response;
  }, []);

  const clearChat = useCallbackHook(() => {
    sessionRef.current.clearHistory();
    setMessages([]);
  }, []);

  return {
    messages,
    loading,
    sendMessage,
    clearChat,
    suggestedQueries: sessionRef.current.getSuggestedQueries(),
  };
};

export const useAIMonitor = (interval = 30000) => {
  const monitorRef = useRefHook(new AIMonitor());
  const [healthScore, setHealthScore] = useStateHook(null);
  const [alerts, setAlerts] = useStateHook([]);

  useEffectHook(() => {
    const monitor = monitorRef.current;
    const unsub1 = monitor.on('healthUpdate', (data) => setHealthScore(data));
    const unsub2 = monitor.on('anomalyDetected', (data) => {
      setAlerts(prev => [...prev.slice(-10), ...data.anomalies.map(a => ({
        ...a,
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp: new Date(),
      }))]);
    });
    monitor.startMonitoring(interval);
    return () => {
      monitor.stopMonitoring();
      unsub1();
      unsub2();
    };
  }, [interval]);

  const dismissAlert = useCallbackHook((id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  return { healthScore, alerts, dismissAlert };
};

export default {
  getAIDashboard,
  getFinancialHealthScore,
  getAIRecommendations,
  getSpendingForecast,
  getIncomeForecast,
  getSavingsForecast,
  getCashflowProjection,
  getMovingAverages,
  getAnomalies,
  getRecurringPatterns,
  getSpendingPatterns,
  getChangepoints,
  getMerchantAnalysis,
  getVelocityAnalysis,
  getInsights,
  getRiskAssessment,
  getSentimentAnalysis,
  extractEntities,
  processAIQuery,
  getFinancialSummary,
  trainAIModels,
  categorizeTransaction,
  getPipelineStatus,
  fetchAllAIData,
  formatCurrency,
  formatPercentage,
  formatNumber,
  getScoreColor,
  getScoreLabel,
  getCategoryColor,
  useAIData,
  useAIChat,
  useAIMonitor,
};
