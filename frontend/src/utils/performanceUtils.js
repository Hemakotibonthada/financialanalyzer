// ============================================================================
// Enterprise Performance Utilities — Memoization, Debounce, Virtual Lists
// ============================================================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ============================================================================
// § 1 — Debounce & Throttle
// ============================================================================

/**
 * Returns a debounced version of the callback
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Returns a debounced callback function
 */
export function useDebouncedCallback(callback, delay = 300) {
  const timerRef = useRef(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const debouncedFn = useCallback((...args) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => callbackRef.current(...args), delay);
  }, [delay]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return debouncedFn;
}

/**
 * Throttle — max one call per interval
 */
export function useThrottledCallback(callback, limit = 250) {
  const lastRef = useRef(0);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback((...args) => {
    const now = Date.now();
    if (now - lastRef.current >= limit) {
      lastRef.current = now;
      callbackRef.current(...args);
    }
  }, [limit]);
}

// ============================================================================
// § 2 — Intersection Observer (Lazy Load / Infinite Scroll)
// ============================================================================

/**
 * Detect when element enters viewport
 */
export function useIntersectionObserver(options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState(null);
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([e]) => {
        setIsIntersecting(e.isIntersecting);
        setEntry(e);
      },
      {
        threshold: options.threshold || 0,
        rootMargin: options.rootMargin || '0px',
        root: options.root || null,
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [options.threshold, options.rootMargin]);

  return { ref: elementRef, isIntersecting, entry };
}

/**
 * Infinite scroll hook
 */
export function useInfiniteScroll({ fetchMore, hasMore, loading, threshold = 200 }) {
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

  useEffect(() => {
    if (loading || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          fetchMore();
        }
      },
      { rootMargin: `${threshold}px` }
    );

    const el = loadMoreRef.current;
    if (el) observer.observe(el);

    observerRef.current = observer;
    return () => observer.disconnect();
  }, [loading, hasMore, fetchMore, threshold]);

  return loadMoreRef;
}

// ============================================================================
// § 3 — Performance Measurement
// ============================================================================

/**
 * Measure render performance of a component
 */
export function useRenderCount(componentName) {
  const countRef = useRef(0);
  countRef.current++;

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Perf] ${componentName} rendered ${countRef.current} times`);
    }
  });

  return countRef.current;
}

/**
 * Measure execution time
 */
export function usePerformanceTimer(label) {
  const startRef = useRef(null);

  const start = useCallback(() => {
    startRef.current = performance.now();
  }, []);

  const stop = useCallback(() => {
    if (startRef.current !== null) {
      const duration = performance.now() - startRef.current;
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Perf] ${label}: ${duration.toFixed(2)}ms`);
      }
      startRef.current = null;
      return duration;
    }
    return 0;
  }, [label]);

  return { start, stop };
}

// ============================================================================
// § 4 — Data Caching
// ============================================================================

const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Cache API responses with automatic expiry
 */
export function useCachedFetch(key, fetchFn, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    ttl = CACHE_DURATION,
    enabled = true,
    refreshOnFocus = false,
    refetchInterval = 0,
  } = options;

  const fetchData = useCallback(async (force = false) => {
    if (!enabled) return;

    // Check cache first
    if (!force && cache.has(key)) {
      const cached = cache.get(key);
      if (Date.now() - cached.timestamp < ttl) {
        setData(cached.data);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      cache.set(key, { data: result, timestamp: Date.now() });
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [key, fetchFn, ttl, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch on window focus
  useEffect(() => {
    if (!refreshOnFocus) return;
    const onFocus = () => fetchData(false);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshOnFocus, fetchData]);

  // Periodic refetch
  useEffect(() => {
    if (!refetchInterval) return;
    const timer = setInterval(() => fetchData(true), refetchInterval);
    return () => clearInterval(timer);
  }, [refetchInterval, fetchData]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  return { data, loading, error, refetch };
}

/**
 * Clear all cached data
 */
export function clearCache(keyPattern) {
  if (keyPattern) {
    for (const key of cache.keys()) {
      if (key.includes(keyPattern)) cache.delete(key);
    }
  } else {
    cache.clear();
  }
}

// ============================================================================
// § 5 — Pagination Hook
// ============================================================================

export function usePagination(items = [], options = {}) {
  const { pageSize = 20, initialPage = 1 } = options;
  const [currentPage, setCurrentPage] = useState(initialPage);

  const totalPages = Math.ceil(items.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, items.length);
  const pageItems = items.slice(startIndex, endIndex);

  const goToPage = useCallback((page) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages || 1));
  }, [totalPages]);

  const nextPage = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage]);
  const prevPage = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage]);

  // Reset to page 1 when items change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [items.length, totalPages, currentPage]);

  return {
    items: pageItems,
    currentPage,
    totalPages,
    totalItems: items.length,
    pageSize,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    goToPage,
    nextPage,
    prevPage,
    startIndex,
    endIndex,
  };
}

// ============================================================================
// § 6 — Sort & Filter Hook
// ============================================================================

export function useSortAndFilter(items = [], options = {}) {
  const [sortField, setSortField] = useState(options.defaultSortField || null);
  const [sortDirection, setSortDirection] = useState(options.defaultSortDirection || 'asc');
  const [filters, setFilters] = useState(options.defaultFilters || {});
  const [searchQuery, setSearchQuery] = useState('');

  const debouncedSearch = useDebounce(searchQuery, 300);

  const processedItems = useMemo(() => {
    let result = [...items];

    // Apply filters
    for (const [field, value] of Object.entries(filters)) {
      if (value === null || value === undefined || value === '' || value === 'all') continue;

      result = result.filter(item => {
        const itemValue = item[field];
        if (Array.isArray(value)) return value.includes(itemValue);
        if (typeof value === 'function') return value(itemValue, item);
        return String(itemValue).toLowerCase() === String(value).toLowerCase();
      });
    }

    // Apply search
    if (debouncedSearch) {
      const searchFields = options.searchFields || Object.keys(items[0] || {});
      const query = debouncedSearch.toLowerCase();
      result = result.filter(item =>
        searchFields.some(field => {
          const val = item[field];
          return val && String(val).toLowerCase().includes(query);
        })
      );
    }

    // Apply sort
    if (sortField) {
      result.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];

        // Handle nullish values
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        // Numeric sort
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // Date sort
        if (aVal instanceof Date || (typeof aVal === 'string' && !isNaN(Date.parse(aVal)))) {
          return sortDirection === 'asc'
            ? new Date(aVal) - new Date(bVal)
            : new Date(bVal) - new Date(aVal);
        }

        // String sort
        const comparison = String(aVal).localeCompare(String(bVal));
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [items, filters, debouncedSearch, sortField, sortDirection]);

  const toggleSort = useCallback((field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const setFilter = useCallback((field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchQuery('');
  }, []);

  return {
    items: processedItems,
    sortField,
    sortDirection,
    toggleSort,
    filters,
    setFilter,
    clearFilters,
    searchQuery,
    setSearchQuery,
    totalFiltered: processedItems.length,
    totalOriginal: items.length,
  };
}

// ============================================================================
// § 7 — Local Storage State
// ============================================================================

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('[useLocalStorage] Error setting value:', error);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error('[useLocalStorage] Error removing value:', error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

// ============================================================================
// § 8 — Media Query Hook
// ============================================================================

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);

    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export function useBreakpoint() {
  const isMobile = useMediaQuery('(max-width: 639px)');
  const isTablet = useMediaQuery('(min-width: 640px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isLargeDesktop = useMediaQuery('(min-width: 1280px)');

  return { isMobile, isTablet, isDesktop, isLargeDesktop };
}

// ============================================================================
// § 9 — Number & Currency Formatting
// ============================================================================

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const INR_FULL = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

export function formatINR(amount) {
  if (amount == null || isNaN(amount)) return '₹0';
  const absAmount = Math.abs(amount);

  if (absAmount >= 10000000) return `${amount < 0 ? '-' : ''}₹${(absAmount / 10000000).toFixed(2)} Cr`;
  if (absAmount >= 100000) return `${amount < 0 ? '-' : ''}₹${(absAmount / 100000).toFixed(2)} L`;
  if (absAmount >= 1000) return `${amount < 0 ? '-' : ''}₹${(absAmount / 1000).toFixed(1)}K`;

  return INR.format(amount);
}

export function formatINRFull(amount) {
  if (amount == null || isNaN(amount)) return '₹0.00';
  return INR_FULL.format(amount);
}

export function formatPercent(value, decimals = 1) {
  if (value == null || isNaN(value)) return '0%';
  return `${Number(value).toFixed(decimals)}%`;
}

export function formatNumber(num) {
  if (num == null || isNaN(num)) return '0';
  return new Intl.NumberFormat('en-IN').format(num);
}

export function formatRelativeTime(date) {
  const now = new Date();
  const d = new Date(date);
  const diff = now - d;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  if (months < 12) return `${months}mo ago`;
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });
}

// ============================================================================
// § 10 — Keyboard Shortcut Hook
// ============================================================================

export function useKeyboardShortcut(keys, callback, options = {}) {
  const { enabled = true, preventDefault = true } = options;
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    const handler = (event) => {
      const keyCombo = [];
      if (event.ctrlKey || event.metaKey) keyCombo.push('ctrl');
      if (event.shiftKey) keyCombo.push('shift');
      if (event.altKey) keyCombo.push('alt');
      keyCombo.push(event.key.toLowerCase());

      const combo = keyCombo.join('+');
      const target = Array.isArray(keys) ? keys : [keys];

      if (target.includes(combo)) {
        if (preventDefault) event.preventDefault();
        callbackRef.current(event);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [keys, enabled, preventDefault]);
}

// ============================================================================
// § 11 — Copy to Clipboard
// ============================================================================

export function useClipboard(resetDelay = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), resetDelay);
      return true;
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), resetDelay);
      return true;
    }
  }, [resetDelay]);

  return { copied, copy };
}

// ============================================================================
// § 12 — Window Size Hook
// ============================================================================

export function useWindowSize() {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    let raf;
    const handler = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setSize({ width: window.innerWidth, height: window.innerHeight });
      });
    };

    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('resize', handler);
      cancelAnimationFrame(raf);
    };
  }, []);

  return size;
}

// ============================================================================
// § 13 — Previous Value Hook
// ============================================================================

export function usePrevious(value) {
  const ref = useRef();
  useEffect(() => { ref.current = value; });
  return ref.current;
}
