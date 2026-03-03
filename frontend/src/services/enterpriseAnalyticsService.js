// ============================================================================
// Enterprise Analytics Service — Frontend API Client for Analytics V2
// ============================================================================
// Provides functions and React hooks for consuming enterprise analytics APIs.
// ============================================================================

import api from './api';

// ============================================================================
// § 1 — Analytics API Functions
// ============================================================================

/**
 * Fetch comprehensive enterprise dashboard data
 */
export async function fetchComprehensiveDashboard(days = 30) {
  const res = await api.get(`/analytics/v2/comprehensive?days=${days}`);
  return res.data?.data || res.data;
}

/**
 * Fetch spending analytics with category breakdown
 */
export async function fetchSpendingAnalytics(days = 30) {
  const res = await api.get(`/analytics/v2/spending?days=${days}`);
  return res.data?.data || res.data;
}

/**
 * Fetch income analytics with stability score
 */
export async function fetchIncomeAnalytics(days = 90) {
  const res = await api.get(`/analytics/v2/income?days=${days}`);
  return res.data?.data || res.data;
}

/**
 * Fetch financial ratios — savings rate, debt ratio, etc.
 */
export async function fetchFinancialRatios(days = 30) {
  const res = await api.get(`/analytics/v2/ratios?days=${days}`);
  return res.data?.data || res.data;
}

/**
 * Fetch month-over-month comparison
 */
export async function fetchMonthlyComparison(months = 6) {
  const res = await api.get(`/analytics/v2/monthly?months=${months}`);
  return res.data?.data || res.data;
}

/**
 * Fetch merchant-level analytics
 */
export async function fetchMerchantAnalytics(days = 90) {
  const res = await api.get(`/analytics/v2/merchants?days=${days}`);
  return res.data?.data || res.data;
}

/**
 * Fetch net worth calculation
 */
export async function fetchNetWorth() {
  const res = await api.get('/analytics/v2/networth');
  return res.data?.data || res.data;
}

/**
 * Fetch budget status with utilization
 */
export async function fetchBudgetStatus() {
  const res = await api.get('/analytics/v2/budget-status');
  return res.data?.data || res.data;
}

/**
 * Fetch cashflow projection
 */
export async function fetchCashflowProjection(months = 6) {
  const res = await api.get(`/analytics/v2/cashflow?months=${months}`);
  return res.data?.data || res.data;
}

/**
 * Fetch goal analytics
 */
export async function fetchGoalAnalytics() {
  const res = await api.get('/analytics/v2/goals');
  return res.data?.data || res.data;
}

// ============================================================================
// § 2 — Financial Planning API Functions
// ============================================================================

export async function calculateSIP(params) {
  const res = await api.post('/planning/sip', params);
  return res.data?.data || res.data;
}

export async function calculateLumpsum(params) {
  const res = await api.post('/planning/lumpsum', params);
  return res.data?.data || res.data;
}

export async function calculateSIPForGoal(params) {
  const res = await api.post('/planning/sip-for-goal', params);
  return res.data?.data || res.data;
}

export async function calculateSIPDelayCost(params) {
  const res = await api.post('/planning/sip-delay', params);
  return res.data?.data || res.data;
}

export async function calculateEMI(params) {
  const res = await api.post('/planning/emi', params);
  return res.data?.data || res.data;
}

export async function getRetirementPlan(params) {
  const res = await api.post('/planning/retirement', params);
  return res.data?.data || res.data;
}

export async function getDebtPayoff(params) {
  const res = await api.post('/planning/debt-payoff', params);
  return res.data?.data || res.data;
}

export async function getEmergencyFundPlan(params) {
  const res = await api.post('/planning/emergency-fund', params);
  return res.data?.data || res.data;
}

export async function calculateTax(params) {
  const res = await api.post('/planning/tax', params);
  return res.data?.data || res.data;
}

export async function getTaxTips(params) {
  const res = await api.post('/planning/tax-tips', params);
  return res.data?.data || res.data;
}

export async function getWealthProjection(params) {
  const res = await api.post('/planning/wealth-projection', params);
  return res.data?.data || res.data;
}

export async function getInsuranceNeeds(params) {
  const res = await api.post('/planning/insurance', params);
  return res.data?.data || res.data;
}

export async function getComprehensivePlan(params) {
  const res = await api.post('/planning/comprehensive', params);
  return res.data?.data || res.data;
}

// ============================================================================
// § 3 — Notification API Functions
// ============================================================================

export async function fetchNotifications(options = {}) {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', options.limit);
  if (options.unreadOnly) params.set('unreadOnly', 'true');
  if (options.category) params.set('category', options.category);
  const res = await api.get(`/enterprise-notifications?${params.toString()}`);
  return res.data?.data || res.data;
}

export async function fetchUnreadCount() {
  const res = await api.get('/enterprise-notifications/unread-count');
  return res.data?.data?.count || 0;
}

export async function markNotificationRead(id) {
  const res = await api.patch(`/enterprise-notifications/${id}/read`);
  return res.data;
}

export async function markAllNotificationsRead() {
  const res = await api.patch('/enterprise-notifications/read-all');
  return res.data;
}

export async function dismissNotification(id) {
  const res = await api.delete(`/enterprise-notifications/${id}`);
  return res.data;
}

export async function fetchNotificationPreferences() {
  const res = await api.get('/enterprise-notifications/preferences');
  return res.data?.data || res.data;
}

export async function updateNotificationPreferences(prefs) {
  const res = await api.put('/enterprise-notifications/preferences', prefs);
  return res.data?.data || res.data;
}

// ============================================================================
// § 4 — Batch Data Fetcher (Parallel)
// ============================================================================

/**
 * Fetch all enterprise analytics in parallel for dashboard rendering
 */
export async function fetchAllEnterpriseData(options = {}) {
  const { days = 30, months = 6 } = options;

  const [
    comprehensive,
    spending,
    income,
    ratios,
    monthly,
    merchants,
    netWorth,
    budgetStatus,
    cashflow,
    goals,
  ] = await Promise.allSettled([
    fetchComprehensiveDashboard(days),
    fetchSpendingAnalytics(days),
    fetchIncomeAnalytics(days * 3),
    fetchFinancialRatios(days),
    fetchMonthlyComparison(months),
    fetchMerchantAnalytics(days * 3),
    fetchNetWorth(),
    fetchBudgetStatus(),
    fetchCashflowProjection(months),
    fetchGoalAnalytics(),
  ]);

  return {
    comprehensive: comprehensive.status === 'fulfilled' ? comprehensive.value : null,
    spending: spending.status === 'fulfilled' ? spending.value : null,
    income: income.status === 'fulfilled' ? income.value : null,
    ratios: ratios.status === 'fulfilled' ? ratios.value : null,
    monthly: monthly.status === 'fulfilled' ? monthly.value : null,
    merchants: merchants.status === 'fulfilled' ? merchants.value : null,
    netWorth: netWorth.status === 'fulfilled' ? netWorth.value : null,
    budgetStatus: budgetStatus.status === 'fulfilled' ? budgetStatus.value : null,
    cashflow: cashflow.status === 'fulfilled' ? cashflow.value : null,
    goals: goals.status === 'fulfilled' ? goals.value : null,
    fetchedAt: new Date().toISOString(),
  };
}

// ============================================================================
// § 5 — React Hooks
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook to fetch and manage enterprise analytics data
 */
export function useEnterpriseAnalytics(options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAllEnterpriseData(options);
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message);
      }
    }
    if (mountedRef.current) {
      setLoading(false);
    }
  }, [options.days, options.months]);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => { mountedRef.current = false; };
  }, [refresh]);

  return { data, loading, error, refresh };
}

/**
 * Hook for enterprise notifications with polling
 */
export function useEnterpriseNotifications(pollInterval = 60000) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchAll = useCallback(async () => {
    try {
      const [notifData, count] = await Promise.allSettled([
        fetchNotifications({ limit: 50 }),
        fetchUnreadCount(),
      ]);
      if (mountedRef.current) {
        if (notifData.status === 'fulfilled') {
          setNotifications(notifData.value?.notifications || []);
        }
        if (count.status === 'fulfilled') {
          setUnreadCount(count.value);
        }
      }
    } catch { /* noop */ }
    if (mountedRef.current) setLoading(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchAll();
    const interval = setInterval(fetchAll, pollInterval);
    return () => { mountedRef.current = false; clearInterval(interval); };
  }, [fetchAll, pollInterval]);

  const markRead = async (id) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const dismiss = async (id) => {
    await dismissNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return {
    notifications, unreadCount, loading,
    markRead, markAllRead, dismiss, refresh: fetchAll,
  };
}

// ============================================================================
// § 6 — Currency Formatting Utilities
// ============================================================================

export function formatINR(amount) {
  if (amount === undefined || amount === null) return '₹0';
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (absAmount >= 10000000) return `${sign}₹${(absAmount / 10000000).toFixed(2)} Cr`;
  if (absAmount >= 100000) return `${sign}₹${(absAmount / 100000).toFixed(2)} L`;
  if (absAmount >= 1000) return `${sign}₹${(absAmount / 1000).toFixed(1)}K`;
  return `${sign}₹${absAmount.toLocaleString('en-IN')}`;
}

export function formatINRFull(amount) {
  if (amount === undefined || amount === null) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value, decimals = 1) {
  if (value === undefined || value === null) return '0%';
  return `${parseFloat(value).toFixed(decimals)}%`;
}

export function formatNumber(value) {
  if (value === undefined || value === null) return '0';
  if (value >= 10000000) return `${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(2)} L`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString('en-IN');
}
