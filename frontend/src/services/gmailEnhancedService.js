/**
 * Gmail Enhanced Service
 * Frontend API client for the enhanced Gmail integration.
 */
import api from './api';

const gmailEnhancedService = {
  // ── Sync & Status ──
  getStatus: () => api.get('/gmail-enhanced/sync/status'),
  sync: (options = {}) => api.post('/gmail-enhanced/sync', options),
  getStats: () => api.get('/gmail-enhanced/stats'),

  // ── Emails ──
  listEmails: (params = {}) => api.get('/gmail-enhanced/emails', { params }),
  getEmail: (id) => api.get(`/gmail-enhanced/emails/${id}`),
  starEmail: (id) => api.post(`/gmail-enhanced/emails/${id}/star`),
  markRead: (id) => api.post(`/gmail-enhanced/emails/${id}/read`),
  deleteEmail: (id) => api.delete(`/gmail-enhanced/emails/${id}`),

  // ── Transactions ──
  getTransactions: (params = {}) => api.get('/gmail-enhanced/transactions', { params }),

  // ── Attachments ──
  listAttachments: (params = {}) => api.get('/gmail-enhanced/attachments', { params }),
  processAttachment: (id) => api.post(`/gmail-enhanced/attachments/${id}/process`),

  // ── Analytics & AI ──
  getAnalytics: (days = 90) => api.get('/gmail-enhanced/analytics', { params: { days } }),
  runAnalysis: (days = 90) => api.post('/gmail-enhanced/analyze', { days }),
  getReport: (days = 30) => api.get('/gmail-enhanced/report', { params: { days } }),

  // ── Gmail AI Agent ──
  trainAgent: () => api.post('/gmail-enhanced/agent/train'),
  getAgentStatus: () => api.get('/gmail-enhanced/agent/status'),
  agentAnalyze: (params = {}) => api.post('/gmail-enhanced/agent/analyze', params),
  getAgentInsights: () => api.get('/gmail-enhanced/agent/insights'),

  // ── Data Management ──
  clearAllData: () => api.delete('/gmail-enhanced/data'),
};

export default gmailEnhancedService;
