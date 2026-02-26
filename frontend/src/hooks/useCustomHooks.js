// ============================================================
// Financial Analyzer - Custom React Hooks Library
// 30+ hooks for animations, data, UI, and utilities
// ============================================================

import { useState, useEffect, useRef, useCallback, useMemo, useReducer, useLayoutEffect } from 'react';

// ======================== ANIMATION HOOKS ========================

/**
 * Hook for scroll-triggered reveal animations
 * Feature #1: Scroll Reveal Animation
 */
export function useScrollReveal(options = {}) {
  const { threshold = 0.15, rootMargin = '0px', triggerOnce = true } = options;
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) observer.unobserve(element);
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return [ref, isVisible];
}

/**
 * Hook for animated number counting
 * Feature #2: Animated Number Counter
 */
export function useAnimatedCounter(targetValue, duration = 1500, decimals = 0) {
  const [count, setCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousValue = useRef(0);
  const rafId = useRef(null);

  useEffect(() => {
    if (targetValue === previousValue.current) return;
    
    const startValue = previousValue.current;
    const startTime = performance.now();
    setIsAnimating(true);

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (targetValue - startValue) * eased;
      
      setCount(Number(currentValue.toFixed(decimals)));
      
      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      } else {
        setCount(Number(targetValue.toFixed(decimals)));
        previousValue.current = targetValue;
        setIsAnimating(false);
      }
    };

    rafId.current = requestAnimationFrame(animate);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [targetValue, duration, decimals]);

  return { count, isAnimating };
}

/**
 * Hook for parallax scroll effects
 * Feature #3: Parallax Effects
 */
export function useParallax(speed = 0.5) {
  const ref = useRef(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const scrolled = window.scrollY;
      const elementTop = rect.top + scrolled;
      const relativeScroll = scrolled - elementTop;
      setOffset(relativeScroll * speed);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return [ref, offset];
}

/**
 * Hook for staggered animation delays
 * Feature #4: Stagger Animation
 */
export function useStaggerAnimation(itemCount, baseDelay = 50, startDelay = 0) {
  const [visibleItems, setVisibleItems] = useState(new Set());

  useEffect(() => {
    const timers = [];
    for (let i = 0; i < itemCount; i++) {
      const timer = setTimeout(() => {
        setVisibleItems(prev => new Set([...prev, i]));
      }, startDelay + i * baseDelay);
      timers.push(timer);
    }
    return () => timers.forEach(clearTimeout);
  }, [itemCount, baseDelay, startDelay]);

  const getItemStyle = useCallback((index) => ({
    opacity: visibleItems.has(index) ? 1 : 0,
    transform: visibleItems.has(index) ? 'translateY(0)' : 'translateY(20px)',
    transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${index * baseDelay}ms`,
  }), [visibleItems, baseDelay]);

  return { visibleItems, getItemStyle };
}

/**
 * Hook for typewriter text effect
 * Feature #5: Typewriter Effect
 */
export function useTypewriter(text, speed = 50, delay = 0) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    setDisplayText('');
    setIsComplete(false);
    setIsTyping(false);
    
    const startTimer = setTimeout(() => {
      setIsTyping(true);
      let index = 0;
      const interval = setInterval(() => {
        if (index < text.length) {
          setDisplayText(text.slice(0, index + 1));
          index++;
        } else {
          clearInterval(interval);
          setIsTyping(false);
          setIsComplete(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [text, speed, delay]);

  return { displayText, isComplete, isTyping };
}

// ======================== DATA HOOKS ========================

/**
 * Hook for data fetching with loading, error, and caching
 * Feature #6: Smart Data Fetching
 */
const fetchCache = new Map();

export function useFetch(url, options = {}) {
  const { 
    immediate = true, 
    cacheTime = 30000,
    retries = 3,
    retryDelay = 1000,
    transform = null,
    dependencies = []
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const execute = useCallback(async (overrideUrl) => {
    const fetchUrl = overrideUrl || url;
    if (!fetchUrl) return;

    // Check cache
    const cached = fetchCache.get(fetchUrl);
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      setData(cached.data);
      setLoading(false);
      return cached.data;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(fetchUrl, { 
          signal: controller.signal,
          ...options.fetchOptions
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        let result = await response.json();
        if (transform) result = transform(result);
        
        fetchCache.set(fetchUrl, { data: result, timestamp: Date.now() });
        setData(result);
        setLoading(false);
        return result;
      } catch (err) {
        if (err.name === 'AbortError') return;
        lastError = err;
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, retryDelay * Math.pow(2, attempt)));
        }
      }
    }

    setError(lastError);
    setLoading(false);
    return null;
  }, [url, cacheTime, retries, retryDelay, transform, ...dependencies]);

  useEffect(() => {
    if (immediate) execute();
    return () => abortRef.current?.abort();
  }, [execute, immediate]);

  const refetch = useCallback(() => {
    fetchCache.delete(url);
    return execute();
  }, [execute, url]);

  return { data, loading, error, execute, refetch };
}

/**
 * Hook for debounced values
 * Feature #7: Debounce Hook
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
 * Hook for throttled callbacks
 * Feature #8: Throttle Hook
 */
export function useThrottle(callback, delay = 300) {
  const lastRun = useRef(Date.now());
  const timerRef = useRef(null);

  return useCallback((...args) => {
    const now = Date.now();
    if (now - lastRun.current >= delay) {
      lastRun.current = now;
      callback(...args);
    } else {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        lastRun.current = Date.now();
        callback(...args);
      }, delay - (now - lastRun.current));
    }
  }, [callback, delay]);
}

/**
 * Hook for localStorage with state sync
 * Feature #9: Persistent State
 */
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
      
      // Sync across tabs
      window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(valueToStore) }));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [key, storedValue]);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key]);

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch {}
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

/**
 * Hook for infinite scrolling / pagination
 * Feature #10: Infinite Scroll
 */
export function useInfiniteScroll(callback, options = {}) {
  const { threshold = 100, enabled = true } = options;
  const [isFetching, setIsFetching] = useState(false);
  const observerRef = useRef(null);

  const sentinelRef = useCallback((node) => {
    if (!enabled) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetching) {
          setIsFetching(true);
          Promise.resolve(callback()).finally(() => setIsFetching(false));
        }
      },
      { rootMargin: `${threshold}px` }
    );

    if (node) observerRef.current.observe(node);
  }, [callback, threshold, enabled, isFetching]);

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  return { sentinelRef, isFetching };
}

// ======================== UI HOOKS ========================

/**
 * Hook for responsive breakpoints
 * Feature #11: Responsive Hook
 */
export function useBreakpoint() {
  const getBreakpoint = () => {
    const width = window.innerWidth;
    if (width < 640) return 'xs';
    if (width < 768) return 'sm';
    if (width < 1024) return 'md';
    if (width < 1280) return 'lg';
    if (width < 1536) return 'xl';
    return '2xl';
  };

  const [breakpoint, setBreakpoint] = useState(getBreakpoint());
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    let rafId;
    const handleResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setBreakpoint(getBreakpoint());
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      });
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const isMobile = breakpoint === 'xs' || breakpoint === 'sm';
  const isTablet = breakpoint === 'md';
  const isDesktop = breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl';

  return { breakpoint, dimensions, isMobile, isTablet, isDesktop };
}

/**
 * Hook for dark mode detection
 * Feature #12: System Theme Detection
 */
export function useSystemTheme() {
  const [isDark, setIsDark] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isDark;
}

/**
 * Hook for click outside detection
 * Feature #13: Click Outside
 */
export function useClickOutside(callback) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback(event);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [callback]);

  return ref;
}

/**
 * Hook for keyboard shortcuts
 * Feature #14: Enhanced Keyboard Shortcuts
 */
export function useKeyboardShortcut(keyCombo, callback, options = {}) {
  const { enabled = true, preventDefault = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const keys = keyCombo.toLowerCase().split('+').map(k => k.trim());
    
    const handleKeyDown = (event) => {
      const ctrlMatch = keys.includes('ctrl') === (event.ctrlKey || event.metaKey);
      const shiftMatch = keys.includes('shift') === event.shiftKey;
      const altMatch = keys.includes('alt') === event.altKey;
      const key = keys.find(k => !['ctrl', 'shift', 'alt', 'meta'].includes(k));
      const keyMatch = key === event.key.toLowerCase();

      if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
        if (preventDefault) event.preventDefault();
        callback(event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [keyCombo, callback, enabled, preventDefault]);
}

/**
 * Hook for element size observation
 * Feature #15: Element Size Observer
 */
export function useElementSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}

/**
 * Hook for hover state
 * Feature #16: Hover Detection
 */
export function useHover() {
  const ref = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const onEnter = () => setIsHovered(true);
    const onLeave = () => setIsHovered(false);

    element.addEventListener('mouseenter', onEnter);
    element.addEventListener('mouseleave', onLeave);
    return () => {
      element.removeEventListener('mouseenter', onEnter);
      element.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return [ref, isHovered];
}

/**
 * Hook for managing form state with validation
 * Feature #17: Form Management
 */
export function useForm(initialValues, validationRules = {}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  const validate = useCallback((fieldValues = values) => {
    const newErrors = {};
    
    Object.entries(validationRules).forEach(([field, rules]) => {
      const value = fieldValues[field];
      
      if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
        newErrors[field] = rules.required === true ? 'This field is required' : rules.required;
      } else if (rules.minLength && value?.length < rules.minLength) {
        newErrors[field] = `Minimum ${rules.minLength} characters required`;
      } else if (rules.maxLength && value?.length > rules.maxLength) {
        newErrors[field] = `Maximum ${rules.maxLength} characters allowed`;
      } else if (rules.pattern && !rules.pattern.test(value)) {
        newErrors[field] = rules.patternMessage || 'Invalid format';
      } else if (rules.min !== undefined && Number(value) < rules.min) {
        newErrors[field] = `Minimum value is ${rules.min}`;
      } else if (rules.max !== undefined && Number(value) > rules.max) {
        newErrors[field] = `Maximum value is ${rules.max}`;
      } else if (rules.custom) {
        const customError = rules.custom(value, fieldValues);
        if (customError) newErrors[field] = customError;
      }
    });
    
    setErrors(newErrors);
    const valid = Object.keys(newErrors).length === 0;
    setIsValid(valid);
    return valid;
  }, [values, validationRules]);

  const handleChange = useCallback((field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setValues(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    if (touched[field]) {
      validate({ ...values, [field]: value });
    }
  }, [values, touched, validate]);

  const handleBlur = useCallback((field) => () => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validate();
  }, [validate]);

  const handleSubmit = useCallback((onSubmit) => async (e) => {
    e?.preventDefault();
    setTouched(Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
    
    if (!validate()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate]);

  const reset = useCallback((newValues) => {
    setValues(newValues || initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    setIsDirty(false);
  }, [initialValues]);

  const setFieldValue = useCallback((field, value) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  const setFieldError = useCallback((field, error) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  return {
    values, errors, touched, isSubmitting, isValid, isDirty,
    handleChange, handleBlur, handleSubmit, reset,
    setFieldValue, setFieldError, validate, setValues
  };
}

/**
 * Hook for undo/redo functionality
 * Feature #18: Undo/Redo
 */
export function useUndoRedo(initialState) {
  const [history, setHistory] = useState({
    past: [],
    present: initialState,
    future: [],
  });

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const set = useCallback((newState) => {
    setHistory(prev => ({
      past: [...prev.past, prev.present].slice(-50), // Keep last 50 states
      present: typeof newState === 'function' ? newState(prev.present) : newState,
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, -1);
      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: prev.future.slice(1),
      };
    });
  }, []);

  const reset = useCallback((newState) => {
    setHistory({
      past: [],
      present: newState ?? initialState,
      future: [],
    });
  }, [initialState]);

  return { state: history.present, set, undo, redo, reset, canUndo, canRedo };
}

/**
 * Hook for copy to clipboard
 * Feature #19: Clipboard Hook
 */
export function useClipboard(timeout = 2000) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const copy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setError(null);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), timeout);
    } catch (err) {
      setError(err);
      setCopied(false);
    }
  }, [timeout]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { copy, copied, error };
}

/**
 * Hook for online/offline detection
 * Feature #20: Network Status
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [since, setSince] = useState(null);
  const [downtime, setDowntime] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (since) {
        setDowntime(prev => prev + (Date.now() - since));
      }
      setSince(null);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setSince(Date.now());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [since]);

  return { isOnline, since, downtime };
}

/**
 * Hook for document title management
 * Feature #21: Dynamic Page Title
 */
export function useDocumentTitle(title, restoreOnUnmount = true) {
  const previousTitle = useRef(document.title);

  useEffect(() => {
    document.title = title ? `${title} | Financial Analyzer` : 'Financial Analyzer';
    
    return () => {
      if (restoreOnUnmount) {
        document.title = previousTitle.current;
      }
    };
  }, [title, restoreOnUnmount]);
}

/**
 * Hook for media query matching
 * Feature #22: Media Query Hook
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    window.matchMedia(query).matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Hook for managing async operations
 * Feature #23: Async State Management
 */
export function useAsync(asyncFunction, immediate = false) {
  const [status, setStatus] = useState('idle'); // idle, pending, success, error
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setStatus('pending');
    setData(null);
    setError(null);

    try {
      const result = await asyncFunction(...args);
      setData(result);
      setStatus('success');
      return result;
    } catch (err) {
      setError(err);
      setStatus('error');
      throw err;
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) execute();
  }, [immediate]); // eslint-disable-line

  return { execute, status, data, error, isLoading: status === 'pending', isSuccess: status === 'success', isError: status === 'error' };
}

/**
 * Hook for interval management
 * Feature #24: Interval Hook
 */
export function useInterval(callback, delay, immediate = false) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    
    if (immediate) savedCallback.current();
    
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay, immediate]);
}

/**
 * Hook for previous value tracking
 * Feature #25: Previous Value
 */
export function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

/**
 * Hook for table sorting, filtering, and pagination
 * Feature #26: Data Table Management
 */
export function useDataTable(data = [], options = {}) {
  const {
    initialSort = { key: null, direction: 'asc' },
    itemsPerPage = 10,
    searchFields = [],
  } = options;

  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});

  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (search && searchFields.length > 0) {
      const searchLower = search.toLowerCase();
      result = result.filter(item =>
        searchFields.some(field => {
          const value = field.split('.').reduce((obj, key) => obj?.[key], item);
          return String(value || '').toLowerCase().includes(searchLower);
        })
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        result = result.filter(item => {
          const itemValue = key.split('.').reduce((obj, k) => obj?.[k], item);
          if (Array.isArray(value)) return value.includes(itemValue);
          return itemValue === value;
        });
      }
    });

    // Apply sort
    if (sort.key) {
      result.sort((a, b) => {
        const aVal = sort.key.split('.').reduce((obj, k) => obj?.[k], a);
        const bVal = sort.key.split('.').reduce((obj, k) => obj?.[k], b);
        
        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        const comparison = typeof aVal === 'string' 
          ? aVal.localeCompare(bVal)
          : aVal - bVal;
          
        return sort.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, search, filters, sort, searchFields]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const handleSort = useCallback((key) => {
    setSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setPage(1);
  }, []);

  const handleSearch = useCallback((value) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearch('');
    setPage(1);
  }, []);

  return {
    data: paginatedData,
    allData: filteredData,
    totalItems: filteredData.length,
    page, setPage,
    totalPages,
    sort, handleSort,
    search, handleSearch,
    filters, handleFilter, clearFilters,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Hook for drag and drop
 * Feature #27: Drag & Drop
 */
export function useDragAndDrop(onDrop) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    dragCounter.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    dragCounter.current = 0;
    
    const files = Array.from(e.dataTransfer?.files || []);
    const data = e.dataTransfer?.getData('text/plain');
    
    if (onDrop) onDrop({ files, data, event: e });
  }, [onDrop]);

  const dragProps = {
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
  };

  const makeDraggable = useCallback((item) => ({
    draggable: true,
    onDragStart: (e) => {
      setDraggedItem(item);
      e.dataTransfer.setData('text/plain', JSON.stringify(item));
      e.dataTransfer.effectAllowed = 'move';
    },
    onDragEnd: () => setDraggedItem(null),
  }), []);

  return { isDragging, draggedItem, dragProps, makeDraggable };
}

/**
 * Hook for managing multi-step wizard/forms
 * Feature #28: Multi-step Wizard
 */
export function useWizard(totalSteps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [stepData, setStepData] = useState({});

  const next = useCallback(() => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1));
  }, [currentStep, totalSteps]);

  const prev = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const goTo = useCallback((step) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step);
    }
  }, [totalSteps]);

  const updateStepData = useCallback((step, data) => {
    setStepData(prev => ({ ...prev, [step]: { ...prev[step], ...data } }));
  }, []);

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const isStepCompleted = (step) => completedSteps.has(step);

  return {
    currentStep, next, prev, goTo, 
    isFirstStep, isLastStep, progress,
    completedSteps, isStepCompleted,
    stepData, updateStepData,
    totalSteps,
  };
}

/**
 * Hook for managing notifications/toasts
 * Feature #29: Toast Manager
 */
export function useToast(maxToasts = 5) {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const addToast = useCallback((message, options = {}) => {
    const id = ++counterRef.current;
    const toast = {
      id,
      message,
      type: options.type || 'info',
      duration: options.duration || 5000,
      title: options.title,
      action: options.action,
      dismissible: options.dismissible !== false,
      icon: options.icon,
      timestamp: Date.now(),
    };

    setToasts(prev => {
      const newToasts = [toast, ...prev];
      return newToasts.slice(0, maxToasts);
    });

    if (toast.duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, toast.duration);
    }
    
    return id;
  }, [maxToasts]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearAll = useCallback(() => setToasts([]), []);

  const success = useCallback((msg, opts) => addToast(msg, { ...opts, type: 'success' }), [addToast]);
  const error = useCallback((msg, opts) => addToast(msg, { ...opts, type: 'error' }), [addToast]);
  const warning = useCallback((msg, opts) => addToast(msg, { ...opts, type: 'warning' }), [addToast]);
  const info = useCallback((msg, opts) => addToast(msg, { ...opts, type: 'info' }), [addToast]);

  return { toasts, addToast, removeToast, clearAll, success, error, warning, info };
}

/**
 * Hook for selection management (list/grid selection)
 * Feature #30: Selection Manager
 */
export function useSelection(items = []) {
  const [selectedIds, setSelectedIds] = useState(new Set());

  const toggleSelection = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(item => item.id || item._id)));
  }, [items]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id) => selectedIds.has(id), [selectedIds]);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === items.length) deselectAll();
    else selectAll();
  }, [selectedIds, items, selectAll, deselectAll]);

  const selectRange = useCallback((startId, endId) => {
    const startIndex = items.findIndex(i => (i.id || i._id) === startId);
    const endIndex = items.findIndex(i => (i.id || i._id) === endId);
    if (startIndex === -1 || endIndex === -1) return;
    
    const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
    const rangeIds = items.slice(from, to + 1).map(i => i.id || i._id);
    setSelectedIds(prev => new Set([...prev, ...rangeIds]));
  }, [items]);

  const selectedItems = useMemo(
    () => items.filter(item => selectedIds.has(item.id || item._id)),
    [items, selectedIds]
  );

  return {
    selectedIds, selectedItems,
    toggleSelection, selectAll, deselectAll, selectRange,
    isSelected, toggleAll,
    selectedCount: selectedIds.size,
    isAllSelected: selectedIds.size === items.length && items.length > 0,
    isPartiallySelected: selectedIds.size > 0 && selectedIds.size < items.length,
  };
}

/**
 * Hook for fullscreen management
 * Feature #31: Fullscreen Hook
 */
export function useFullscreen() {
  const ref = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const enter = useCallback(async () => {
    const element = ref.current || document.documentElement;
    try {
      await element.requestFullscreen();
    } catch {}
  }, []);

  const exit = useCallback(async () => {
    try {
      await document.exitFullscreen();
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    isFullscreen ? exit() : enter();
  }, [isFullscreen, enter, exit]);

  return { ref, isFullscreen, enter, exit, toggle };
}

/**
 * Hook for measuring render performance
 * Feature #32: Performance Monitor
 */
export function usePerformance(componentName) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    lastRenderDuration: 0,
    averageRenderDuration: 0,
  });

  useLayoutEffect(() => {
    const now = performance.now();
    const duration = now - lastRenderTime.current;
    renderCount.current++;

    setMetrics(prev => ({
      renderCount: renderCount.current,
      lastRenderDuration: duration,
      averageRenderDuration: 
        (prev.averageRenderDuration * (renderCount.current - 1) + duration) / renderCount.current,
    }));

    lastRenderTime.current = now;
  });

  return metrics;
}

export default {
  useScrollReveal,
  useAnimatedCounter,
  useParallax,
  useStaggerAnimation,
  useTypewriter,
  useFetch,
  useDebounce,
  useThrottle,
  useLocalStorage,
  useInfiniteScroll,
  useBreakpoint,
  useSystemTheme,
  useClickOutside,
  useKeyboardShortcut,
  useElementSize,
  useHover,
  useForm,
  useUndoRedo,
  useClipboard,
  useNetworkStatus,
  useDocumentTitle,
  useMediaQuery,
  useAsync,
  useInterval,
  usePrevious,
  useDataTable,
  useDragAndDrop,
  useWizard,
  useToast,
  useSelection,
  useFullscreen,
  usePerformance,
};
