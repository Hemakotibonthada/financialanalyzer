import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  JPY: '¥',
  CNY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  SGD: 'S$',
  AED: 'د.إ',
  SAR: '﷼',
  BRL: 'R$',
  MXN: 'MX$',
  KRW: '₩',
  ZAR: 'R',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  NZD: 'NZ$',
};

const AVAILABLE_CURRENCIES = Object.keys(CURRENCY_SYMBOLS);

const RATE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const CurrencyContext = createContext(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function CurrencyProvider({ children, defaultCurrency = 'INR' }) {
  const [currency, setCurrencyState] = useState(() => {
    if (typeof window === 'undefined') return defaultCurrency;
    return localStorage.getItem('fa_currency') || defaultCurrency;
  });

  const [rates, setRates] = useState({});
  const [ratesLoading, setRatesLoading] = useState(false);
  const cacheRef = useRef({ timestamp: 0, base: null, rates: {} });

  // Persist selection
  const setCurrency = useCallback((code) => {
    const upper = code.toUpperCase();
    if (!CURRENCY_SYMBOLS[upper]) {
      console.warn(`[CurrencyContext] Unknown currency code: ${code}`);
      return;
    }
    setCurrencyState(upper);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fa_currency', upper);
    }
  }, []);

  // Fetch exchange rates (cached)
  const fetchRates = useCallback(async (base) => {
    const cache = cacheRef.current;
    const now = Date.now();
    if (cache.base === base && now - cache.timestamp < RATE_CACHE_TTL && Object.keys(cache.rates).length > 0) {
      setRates(cache.rates);
      return cache.rates;
    }

    setRatesLoading(true);
    try {
      // Using a free exchange-rate API (can be swapped for any provider)
      const res = await fetch(`https://api.exchangerate-data.com/v1/latest?base=${base}`);
      if (!res.ok) throw new Error('Failed to fetch exchange rates');
      const json = await res.json();
      const fetched = json.rates ?? json.conversion_rates ?? {};
      cacheRef.current = { timestamp: Date.now(), base, rates: fetched };
      setRates(fetched);
      return fetched;
    } catch (err) {
      console.error('[CurrencyContext] Rate fetch error:', err.message);
      // Fallback: return identity rates so the app doesn't break
      return {};
    } finally {
      setRatesLoading(false);
    }
  }, []);

  // Refresh rates whenever the base currency changes
  useEffect(() => {
    fetchRates(currency);
  }, [currency, fetchRates]);

  // Convert an amount from one currency to another
  const convertAmount = useCallback(
    (amount, fromCurrency, toCurrency) => {
      if (fromCurrency === toCurrency) return amount;
      const from = fromCurrency?.toUpperCase() ?? currency;
      const to = toCurrency?.toUpperCase() ?? currency;

      // If rates are based on the `from` currency
      if (cacheRef.current.base === from && rates[to]) {
        return amount * rates[to];
      }
      // If rates are based on the `to` currency
      if (cacheRef.current.base === to && rates[from]) {
        return amount / rates[from];
      }
      // Cross conversion through base
      if (rates[from] && rates[to]) {
        return (amount / rates[from]) * rates[to];
      }

      // No rate available – return as-is
      return amount;
    },
    [currency, rates]
  );

  // Format an amount in the selected (or specified) currency
  const formatAmount = useCallback(
    (amount, overrideCurrency, options = {}) => {
      const code = overrideCurrency?.toUpperCase() ?? currency;
      const { decimals = 2, compact = false } = options;
      try {
        return new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: code,
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
          notation: compact ? 'compact' : 'standard',
        }).format(amount);
      } catch {
        // Fallback for unknown locale/currency
        const symbol = CURRENCY_SYMBOLS[code] || code;
        return `${symbol}${Number(amount).toFixed(decimals)}`;
      }
    },
    [currency]
  );

  const getSymbol = useCallback(
    (code) => CURRENCY_SYMBOLS[(code || currency).toUpperCase()] || code || currency,
    [currency]
  );

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      formatAmount,
      convertAmount,
      getSymbol,
      rates,
      ratesLoading,
      availableCurrencies: AVAILABLE_CURRENCIES,
      currencySymbols: CURRENCY_SYMBOLS,
    }),
    [currency, setCurrency, formatAmount, convertAmount, getSymbol, rates, ratesLoading]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error('useCurrency must be used within a <CurrencyProvider>');
  }
  return ctx;
}

export default CurrencyContext;
