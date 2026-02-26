import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isSSR() {
  return typeof window === 'undefined';
}

function safeSerialize(value) {
  try {
    return JSON.stringify(value);
  } catch {
    console.warn('[useLocalStorage] Failed to serialize value');
    return null;
  }
}

function safeDeserialize(raw, fallback) {
  if (raw === null || raw === undefined) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// useLocalStorage
// ---------------------------------------------------------------------------

/**
 * Persisted state hook that syncs with localStorage.
 *
 * @template T
 * @param {string} key - localStorage key
 * @param {T} initialValue - Default value if key is absent
 * @returns {[T, (value: T | ((prev: T) => T)) => void, () => void]}
 *   [value, setValue, removeValue]
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    if (isSSR()) return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? safeDeserialize(raw, initialValue) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value) => {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        if (!isSSR()) {
          const serialized = safeSerialize(next);
          if (serialized !== null) {
            window.localStorage.setItem(key, serialized);
            // Dispatch a custom event so other hooks/tabs can pick it up
            window.dispatchEvent(
              new StorageEvent('storage', { key, newValue: serialized })
            );
          }
        }
        return next;
      });
    },
    [key]
  );

  const removeValue = useCallback(() => {
    if (!isSSR()) {
      window.localStorage.removeItem(key);
      window.dispatchEvent(new StorageEvent('storage', { key, newValue: null }));
    }
    setStoredValue(initialValue);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

// ---------------------------------------------------------------------------
// useSessionStorage
// ---------------------------------------------------------------------------

/**
 * Session-scoped storage hook. Data is cleared when the tab/window is closed.
 *
 * @template T
 * @param {string} key
 * @param {T} initialValue
 * @returns {[T, (value: T | ((prev: T) => T)) => void, () => void]}
 */
export function useSessionStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    if (isSSR()) return initialValue;
    try {
      const raw = window.sessionStorage.getItem(key);
      return raw !== null ? safeDeserialize(raw, initialValue) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value) => {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        if (!isSSR()) {
          const serialized = safeSerialize(next);
          if (serialized !== null) window.sessionStorage.setItem(key, serialized);
        }
        return next;
      });
    },
    [key]
  );

  const removeValue = useCallback(() => {
    if (!isSSR()) window.sessionStorage.removeItem(key);
    setStoredValue(initialValue);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

// ---------------------------------------------------------------------------
// useStorageEvent – cross-tab synchronisation
// ---------------------------------------------------------------------------

/**
 * Listens for storage changes from other tabs and calls the handler.
 *
 * @param {string} key - The localStorage key to watch
 * @param {(newValue: any) => void} handler - Called with the new deserialized value
 */
export function useStorageEvent(key, handler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (isSSR()) return;

    const listener = (event) => {
      if (event.key !== key) return;
      const parsed = safeDeserialize(event.newValue, null);
      handlerRef.current(parsed);
    };

    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }, [key]);
}

// ---------------------------------------------------------------------------
// usePersistentState – localStorage with TTL / expiry
// ---------------------------------------------------------------------------

/**
 * Like useLocalStorage but with an automatic expiry (TTL).
 * After the TTL elapses the stored value is treated as absent and the
 * initial value is returned instead.
 *
 * @template T
 * @param {string} key - localStorage key
 * @param {T} initialValue - Fallback value
 * @param {Object} options
 * @param {number} options.ttl - Time-to-live in milliseconds (default: 24 hours)
 * @returns {[T, (value: T | ((prev: T) => T)) => void, () => void]}
 */
export function usePersistentState(key, initialValue, { ttl = 86400000 } = {}) {
  const metaKey = `${key}__meta`;

  const readValue = useCallback(() => {
    if (isSSR()) return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      const meta = safeDeserialize(window.localStorage.getItem(metaKey), null);
      if (raw === null || !meta) return initialValue;

      const age = Date.now() - (meta.timestamp || 0);
      if (age > ttl) {
        // Expired – clean up
        window.localStorage.removeItem(key);
        window.localStorage.removeItem(metaKey);
        return initialValue;
      }

      return safeDeserialize(raw, initialValue);
    } catch {
      return initialValue;
    }
  }, [key, metaKey, initialValue, ttl]);

  const [storedValue, setStoredValue] = useState(readValue);

  const setValue = useCallback(
    (value) => {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        if (!isSSR()) {
          const serialized = safeSerialize(next);
          if (serialized !== null) {
            window.localStorage.setItem(key, serialized);
            window.localStorage.setItem(
              metaKey,
              JSON.stringify({ timestamp: Date.now() })
            );
          }
        }
        return next;
      });
    },
    [key, metaKey]
  );

  const removeValue = useCallback(() => {
    if (!isSSR()) {
      window.localStorage.removeItem(key);
      window.localStorage.removeItem(metaKey);
    }
    setStoredValue(initialValue);
  }, [key, metaKey, initialValue]);

  // Check expiry on mount or when ttl/key changes
  useEffect(() => {
    setStoredValue(readValue());
  }, [readValue]);

  return [storedValue, setValue, removeValue];
}

export default {
  useLocalStorage,
  useSessionStorage,
  useStorageEvent,
  usePersistentState,
};
