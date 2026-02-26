import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const cache = new Map();
const CACHE_STALE_MS = 2 * 60 * 1000; // 2 minutes
const CACHE_EXPIRE_MS = 10 * 60 * 1000; // 10 minutes

function getCacheEntry(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  const age = Date.now() - entry.timestamp;
  if (age > CACHE_EXPIRE_MS) {
    cache.delete(key);
    return null;
  }
  return { ...entry, isStale: age > CACHE_STALE_MS };
}

function setCacheEntry(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

function buildQueryString(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.append(k, v);
  });
  const str = qs.toString();
  return str ? `?${str}` : '';
}

async function apiFetch(url, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed with status ${res.status}`);
  }
  return res.json();
}

/**
 * Debounce a value – returns the value after `delay` ms of inactivity.
 */
function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const API_BASE = import.meta.env?.VITE_API_URL || '/api';

// ---------------------------------------------------------------------------
// Generic data-fetching hook with SWR-style caching
// ---------------------------------------------------------------------------

function useDataFetcher(endpoint, params = {}, { enabled = true, cacheKey: customCacheKey } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const fetchIdRef = useRef(0);

  const serializedParams = JSON.stringify(params);
  const cacheKey = customCacheKey || `${endpoint}::${serializedParams}`;

  const fetchData = useCallback(
    async (skipCache = false) => {
      if (!enabled) return;

      const fetchId = ++fetchIdRef.current;

      // Stale-while-revalidate: serve cache immediately, refetch in background
      if (!skipCache) {
        const cached = getCacheEntry(cacheKey);
        if (cached) {
          setData(cached.data);
          if (!cached.isStale) {
            setLoading(false);
            return;
          }
        }
      }

      setLoading(true);
      setError(null);

      try {
        const qs = buildQueryString(JSON.parse(serializedParams));
        const url = `${API_BASE}${endpoint}${qs}`;
        const result = await apiFetch(url);

        if (fetchId !== fetchIdRef.current) return; // stale request
        if (!mountedRef.current) return;

        const payload = result.data ?? result;
        setCacheEntry(cacheKey, payload);
        setData(payload);
      } catch (err) {
        if (fetchId === fetchIdRef.current && mountedRef.current) {
          setError(err.message || 'An error occurred');
        }
      } finally {
        if (fetchId === fetchIdRef.current && mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [endpoint, serializedParams, cacheKey, enabled]
  );

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  return { data, loading, error, refetch };
}

// ---------------------------------------------------------------------------
// Public hooks
// ---------------------------------------------------------------------------

/**
 * Fetch aggregated dashboard summary data.
 * @param {Object} options
 * @param {string} options.period - 'week' | 'month' | 'year'
 * @returns {{ data, loading, error, refetch }}
 */
export function useDashboardData({ period = 'month' } = {}) {
  return useDataFetcher('/dashboard/summary', { period });
}

/**
 * Paginated transaction list with search / filter support.
 * @param {Object} filters
 * @param {string} filters.search - Free-text search (debounced)
 * @param {string} filters.category - Category filter
 * @param {string} filters.type - 'income' | 'expense'
 * @param {string} filters.startDate - ISO date string
 * @param {string} filters.endDate - ISO date string
 * @param {number} filters.page - Page number (1-based)
 * @param {number} filters.limit - Items per page
 * @param {string} filters.sort - Sort field
 * @param {string} filters.order - 'asc' | 'desc'
 * @returns {{ data, loading, error, refetch, pagination }}
 */
export function useTransactions({
  search = '',
  category,
  type,
  startDate,
  endDate,
  page = 1,
  limit = 20,
  sort = 'date',
  order = 'desc',
} = {}) {
  const debouncedSearch = useDebounce(search, 400);

  const params = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      category,
      type,
      startDate,
      endDate,
      page,
      limit,
      sort,
      order,
    }),
    [debouncedSearch, category, type, startDate, endDate, page, limit, sort, order]
  );

  const result = useDataFetcher('/transactions', params);

  const pagination = useMemo(() => {
    if (!result.data) return { page: 1, totalPages: 1, total: 0 };
    return {
      page: result.data.page ?? page,
      totalPages: result.data.totalPages ?? 1,
      total: result.data.total ?? 0,
    };
  }, [result.data, page]);

  return {
    ...result,
    transactions: result.data?.transactions ?? result.data ?? [],
    pagination,
  };
}

/**
 * Budget data with spending calculations.
 * @param {Object} options
 * @param {string} options.month - 'YYYY-MM'
 * @returns {{ data, loading, error, refetch }}
 */
export function useBudgets({ month } = {}) {
  const params = useMemo(() => ({ month }), [month]);
  const result = useDataFetcher('/budgets', params);

  const budgetsWithProgress = useMemo(() => {
    if (!result.data) return [];
    const list = Array.isArray(result.data) ? result.data : result.data.budgets ?? [];
    return list.map((b) => {
      const spent = b.spent ?? 0;
      const limit = b.limit ?? b.amount ?? 0;
      const remaining = Math.max(limit - spent, 0);
      const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
      const status =
        percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'on_track';
      return { ...b, spent, remaining, percentage: Math.round(percentage), status };
    });
  }, [result.data]);

  return { ...result, budgets: budgetsWithProgress };
}

/**
 * Financial goals with progress tracking.
 * @returns {{ data, loading, error, refetch, goals }}
 */
export function useGoals() {
  const result = useDataFetcher('/goals');

  const goals = useMemo(() => {
    if (!result.data) return [];
    const list = Array.isArray(result.data) ? result.data : result.data.goals ?? [];
    return list.map((g) => {
      const current = g.currentAmount ?? g.saved ?? 0;
      const target = g.targetAmount ?? g.target ?? 0;
      const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
      const remaining = Math.max(target - current, 0);

      let daysLeft = null;
      if (g.targetDate) {
        const diff = new Date(g.targetDate) - new Date();
        daysLeft = Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
      }

      const monthlyRequired =
        daysLeft && daysLeft > 0 ? remaining / (daysLeft / 30) : null;

      return {
        ...g,
        current,
        target,
        remaining,
        progress: Math.round(progress * 10) / 10,
        daysLeft,
        monthlyRequired: monthlyRequired ? Math.round(monthlyRequired) : null,
        isComplete: progress >= 100,
      };
    });
  }, [result.data]);

  return { ...result, goals };
}

/**
 * Net worth computation (assets minus liabilities).
 * @returns {{ data, loading, error, refetch, netWorth, assets, liabilities, history }}
 */
export function useNetWorth() {
  const result = useDataFetcher('/net-worth');

  const computed = useMemo(() => {
    if (!result.data) {
      return { netWorth: 0, assets: 0, liabilities: 0, history: [], breakdown: {} };
    }

    const d = result.data;
    const assets = d.totalAssets ?? d.assets ?? 0;
    const liabilities = d.totalLiabilities ?? d.liabilities ?? 0;
    const netWorth = assets - liabilities;
    const history = d.history ?? [];

    const breakdown = {
      cash: d.cash ?? 0,
      investments: d.investments ?? 0,
      property: d.property ?? 0,
      loans: d.loans ?? 0,
      creditCards: d.creditCards ?? 0,
      other: d.otherAssets ?? 0,
    };

    let trend = 'stable';
    if (history.length >= 2) {
      const prev = history[history.length - 2]?.netWorth ?? 0;
      trend = netWorth > prev ? 'up' : netWorth < prev ? 'down' : 'stable';
    }

    return { netWorth, assets, liabilities, history, breakdown, trend };
  }, [result.data]);

  return { ...result, ...computed };
}

/**
 * Income/expense summary for a given period.
 * @param {Object} options
 * @param {string} options.period - 'week' | 'month' | 'year' | 'custom'
 * @param {string} options.startDate - ISO date (for custom period)
 * @param {string} options.endDate - ISO date (for custom period)
 * @returns {{ data, loading, error, refetch, income, expenses, savings, savingsRate }}
 */
export function useIncomeExpense({ period = 'month', startDate, endDate } = {}) {
  const params = useMemo(
    () => ({ period, startDate, endDate }),
    [period, startDate, endDate]
  );

  const result = useDataFetcher('/income-expense', params);

  const summary = useMemo(() => {
    if (!result.data) {
      return { income: 0, expenses: 0, savings: 0, savingsRate: 0, breakdown: [] };
    }

    const d = result.data;
    const income = d.totalIncome ?? d.income ?? 0;
    const expenses = d.totalExpenses ?? d.expenses ?? 0;
    const savings = income - expenses;
    const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;

    const breakdown = d.categories ?? d.breakdown ?? [];

    const topCategories = [...breakdown]
      .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
      .slice(0, 5);

    return { income, expenses, savings, savingsRate, breakdown, topCategories };
  }, [result.data]);

  return { ...result, ...summary };
}

// ---------------------------------------------------------------------------
// Cache utilities
// ---------------------------------------------------------------------------

/** Invalidate all cached data. */
export function clearFinancialCache() {
  cache.clear();
}

/** Invalidate cache entries matching a prefix. */
export function invalidateCache(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

export default {
  useDashboardData,
  useTransactions,
  useBudgets,
  useGoals,
  useNetWorth,
  useIncomeExpense,
  clearFinancialCache,
  invalidateCache,
};
