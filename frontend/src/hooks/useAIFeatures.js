// ============================================================================
// AI HOOKS — React Hooks for Enhanced AI Features
// ============================================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import enhancedAIService from '../services/enhancedAIService';

// ============================================================================
// §1  useAIChat — Conversational AI Hook
// ============================================================================

export function useAIChat() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conversationMeta, setConversationMeta] = useState({});

  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setError(null);

    try {
      const response = await enhancedAIService.sendChatMessage(text);

      if (response.success) {
        const aiMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date(),
          intent: response.data.intent,
          confidence: response.data.confidence,
          entities: response.data.entities,
          followUp: response.data.followUp,
          suggestions: response.data.suggestions,
          data: response.data.data
        };

        setMessages(prev => [...prev, aiMessage]);
        setConversationMeta({
          intent: response.data.intent,
          turnCount: response.data.turnCount,
          slots: response.data.slots
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        error: true
      }]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationMeta({});
    setError(null);
  }, []);

  return { messages, loading, error, conversationMeta, sendMessage, clearMessages };
}

// ============================================================================
// §2  useAIHealthScore — Financial Health Score Hook
// ============================================================================

export function useAIHealthScore() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHealthScore = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await enhancedAIService.getHealthScore();
      if (response.success) {
        setHealthData(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { healthData, loading, error, fetchHealthScore };
}

// ============================================================================
// §3  useAIAnomalies — Anomaly Detection Hook
// ============================================================================

export function useAIAnomalies(days = 90) {
  const [anomalies, setAnomalies] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnomalies = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await enhancedAIService.getAnomalies(days);
      if (response.success) {
        setAnomalies(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  return { anomalies, loading, error, fetchAnomalies };
}

// ============================================================================
// §4  useAIBudgetOptimizer — RL Budget Optimization Hook
// ============================================================================

export function useAIBudgetOptimizer() {
  const [optimization, setOptimization] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const optimize = useCallback(async (data = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await enhancedAIService.optimizeBudget(data);
      if (response.success) {
        setOptimization(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { optimization, loading, error, optimize };
}

// ============================================================================
// §5  useAIInvestmentOptimizer — Investment Optimization Hook
// ============================================================================

export function useAIInvestmentOptimizer() {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const optimize = useCallback(async (data = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await enhancedAIService.optimizeInvestments(data);
      if (response.success) {
        setPortfolio(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { portfolio, loading, error, optimize };
}

// ============================================================================
// §6  useAIDebtOptimizer — Debt Payoff Optimization Hook
// ============================================================================

export function useAIDebtOptimizer() {
  const [strategy, setStrategy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const optimize = useCallback(async (data = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await enhancedAIService.optimizeDebtPayoff(data);
      if (response.success) {
        setStrategy(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { strategy, loading, error, optimize };
}

// ============================================================================
// §7  useAIInsights — AI Insights Hook
// ============================================================================

export function useAIInsights() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await enhancedAIService.getAIInsights();
      if (response.success) {
        setInsights(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { insights, loading, error, fetchInsights };
}

// ============================================================================
// §8  useAIPredictions — Spending Prediction Hook
// ============================================================================

export function useAIPredictions(weeks = 4) {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await enhancedAIService.predictSpending(weeks);
      if (response.success) {
        setPredictions(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [weeks]);

  return { predictions, loading, error, fetchPredictions };
}

// ============================================================================
// §9  useKnowledgeGraph — Knowledge Graph Hook
// ============================================================================

export function useKnowledgeGraph() {
  const [graphData, setGraphData] = useState(null);
  const [queryResult, setQueryResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    try {
      const response = await enhancedAIService.getKnowledgeGraphData();
      if (response.success) setGraphData(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const query = useCallback(async (question) => {
    setLoading(true);
    try {
      const response = await enhancedAIService.queryKnowledgeGraph(question);
      if (response.success) setQueryResult(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { graphData, queryResult, loading, error, fetchGraph, query };
}

// ============================================================================
// §10  useAIMonitoring — Model Monitoring Hook
// ============================================================================

export function useAIMonitoring() {
  const [dashboard, setDashboard] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const response = await enhancedAIService.getMonitoringDashboard();
      if (response.success) setDashboard(response.data);
    } catch (err) {
      console.error('Monitoring fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await enhancedAIService.getMonitoringAlerts();
      if (response.success) setAlerts(response.data);
    } catch (err) {
      console.error('Alerts fetch error:', err);
    }
  }, []);

  const ackAlert = useCallback(async (alertId) => {
    try {
      await enhancedAIService.acknowledgeAlert(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      console.error('Alert ack error:', err);
    }
  }, []);

  return { dashboard, alerts, loading, fetchDashboard, fetchAlerts, ackAlert };
}

// ============================================================================
// §11  useWhatIfAnalysis — What-If Scenario Hook
// ============================================================================

export function useWhatIfAnalysis() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyze = useCallback(async (scenario) => {
    setLoading(true);
    setError(null);

    try {
      const response = await enhancedAIService.runWhatIfAnalysis(scenario);
      if (response.success) setResult(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, analyze };
}

// ============================================================================
// §12  useAutoML — AutoML Pipeline Hook
// ============================================================================

export function useAutoML() {
  const [pipelineResult, setPipelineResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runPipeline = useCallback(async (task, data = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await enhancedAIService.runAutoML(task, data);
      if (response.success) setPipelineResult(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await enhancedAIService.getAutoMLHistory();
      if (response.success) setHistory(response.data);
    } catch (err) {
      console.error('AutoML history error:', err);
    }
  }, []);

  return { pipelineResult, history, loading, error, runPipeline, fetchHistory };
}

// ============================================================================
// §13  useAIFeedback — Feedback Hook
// ============================================================================

export function useAIFeedback() {
  const [submitting, setSubmitting] = useState(false);

  const submitFeedback = useCallback(async (decisionId, correct, feedback = '') => {
    setSubmitting(true);
    try {
      await enhancedAIService.submitFeedback({ decisionId, correct, feedback });
    } catch (err) {
      console.error('Feedback submission error:', err);
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitting, submitFeedback };
}

// ============================================================================
// §14  useComprehensiveAnalysis — Full Analysis Hook
// ============================================================================

export function useComprehensiveAnalysis() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runAnalysis = useCallback(async (data = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await enhancedAIService.runComprehensiveAnalysis(data);
      if (response.success) setAnalysis(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { analysis, loading, error, runAnalysis };
}
