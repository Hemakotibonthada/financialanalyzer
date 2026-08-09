import { useCallback, useEffect, useRef, useState } from 'react';

function normalisePayload(payload) {
  if (
    payload &&
    typeof payload === 'object' &&
    Object.prototype.hasOwnProperty.call(payload, 'fromCache') &&
    Object.prototype.hasOwnProperty.call(payload, 'cachedAt')
  ) {
    return payload;
  }

  return { data: payload, fromCache: false, cachedAt: null };
}

export function useApi(fetcher, deps = [], options = {}) {
  const { immediate = true, initialData = null } = options;
  const mountedRef = useRef(false);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(Boolean(immediate));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState(null);

  const run = useCallback(async (asRefresh = false) => {
    if (mountedRef.current) {
      if (asRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
    }

    try {
      const payload = normalisePayload(await fetcher());
      if (mountedRef.current) {
        setData(payload.data);
        setFromCache(Boolean(payload.fromCache));
        setCachedAt(payload.cachedAt || null);
      }
      return payload.data;
    } catch (nextError) {
      if (mountedRef.current) setError(nextError);
      throw nextError;
    } finally {
      if (mountedRef.current) {
        if (asRefresh) setRefreshing(false);
        else setLoading(false);
      }
    }
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    if (immediate) run().catch(() => {});

    return () => {
      mountedRef.current = false;
    };
  }, [immediate, run]);

  const refetch = useCallback(() => run(false), [run]);
  const onRefresh = useCallback(() => run(true).catch(() => {}), [run]);

  return { data, loading, error, refetch, refreshing, onRefresh, fromCache, cachedAt };
}

export function useMutation(fn) {
  const mountedRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const mutate = useCallback(async (...args) => {
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      return await fn(...args);
    } catch (nextError) {
      if (mountedRef.current) setError(nextError);
      throw nextError;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fn]);

  return { mutate, loading, error };
}

export default useApi;
