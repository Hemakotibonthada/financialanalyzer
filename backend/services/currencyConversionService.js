const axios = require('axios');
const NodeCache = require('node-cache');

class CurrencyConversionService {
  constructor() {
    // Cache exchange rates for 1 hour
    this.cache = new NodeCache({ stdTTL: 3600 });
    
    // Base currency (can be configured)
    this.baseCurrency = process.env.BASE_CURRENCY || 'INR';
    
    // API endpoints (using multiple providers for redundancy)
    this.providers = {
      exchangerate: {
        url: 'https://api.exchangerate-api.com/v4/latest',
        apiKey: process.env.EXCHANGERATE_API_KEY,
      },
      fixer: {
        url: 'https://api.fixer.io/latest',
        apiKey: process.env.FIXER_API_KEY,
      },
      currencyapi: {
        url: 'https://api.currencyapi.com/v3/latest',
        apiKey: process.env.CURRENCYAPI_KEY,
      },
    };

    // Popular currencies
    this.currencies = [
      { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
      { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
      { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
      { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR' },
    ];
  }

  /**
   * Get all supported currencies
   */
  getSupportedCurrencies() {
    return this.currencies;
  }

  /**
   * Get currency symbol
   */
  getCurrencySymbol(currencyCode) {
    const currency = this.currencies.find(c => c.code === currencyCode);
    return currency ? currency.symbol : currencyCode;
  }

  /**
   * Fetch latest exchange rates
   */
  async fetchExchangeRates(baseCurrency = this.baseCurrency) {
    const cacheKey = `rates_${baseCurrency}`;
    
    // Check cache first
    const cachedRates = this.cache.get(cacheKey);
    if (cachedRates) {
      return cachedRates;
    }

    try {
      // Try primary provider (exchangerate-api)
      const response = await axios.get(`${this.providers.exchangerate.url}/${baseCurrency}`);
      
      const rates = {
        base: response.data.base,
        date: response.data.date || new Date().toISOString().split('T')[0],
        rates: response.data.rates,
        timestamp: Date.now(),
      };

      // Cache the rates
      this.cache.set(cacheKey, rates);
      
      return rates;
    } catch (error) {
      console.error('Error fetching from primary provider:', error.message);
      
      // Try fallback provider (fixer.io) if API key available
      if (this.providers.fixer.apiKey) {
        try {
          const response = await axios.get(this.providers.fixer.url, {
            params: {
              access_key: this.providers.fixer.apiKey,
              base: baseCurrency,
            },
          });

          const rates = {
            base: response.data.base,
            date: response.data.date,
            rates: response.data.rates,
            timestamp: Date.now(),
          };

          this.cache.set(cacheKey, rates);
          return rates;
        } catch (fixerError) {
          console.error('Error fetching from fallback provider:', fixerError.message);
        }
      }

      // Return cached data if available (even if expired)
      const expiredCache = this.cache.get(cacheKey);
      if (expiredCache) {
        console.warn('Using expired exchange rates');
        return expiredCache;
      }

      throw new Error('Unable to fetch exchange rates from any provider');
    }
  }

  /**
   * Convert amount from one currency to another
   */
  async convert(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return {
        amount,
        fromCurrency,
        toCurrency,
        rate: 1,
        result: amount,
      };
    }

    try {
      const rates = await this.fetchExchangeRates(fromCurrency);
      const rate = rates.rates[toCurrency];

      if (!rate) {
        throw new Error(`Exchange rate not found for ${toCurrency}`);
      }

      const result = amount * rate;

      return {
        amount,
        fromCurrency,
        toCurrency,
        rate,
        result: Math.round(result * 100) / 100,
        date: rates.date,
      };
    } catch (error) {
      console.error('Conversion error:', error);
      throw error;
    }
  }

  /**
   * Convert to base currency
   */
  async convertToBase(amount, fromCurrency) {
    return this.convert(amount, fromCurrency, this.baseCurrency);
  }

  /**
   * Get exchange rate between two currencies
   */
  async getExchangeRate(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    try {
      const rates = await this.fetchExchangeRates(fromCurrency);
      return rates.rates[toCurrency] || null;
    } catch (error) {
      console.error('Error getting exchange rate:', error);
      throw error;
    }
  }

  /**
   * Get historical exchange rates
   */
  async getHistoricalRates(date, baseCurrency = this.baseCurrency) {
    const cacheKey = `historical_${date}_${baseCurrency}`;
    
    // Check cache
    const cachedRates = this.cache.get(cacheKey);
    if (cachedRates) {
      return cachedRates;
    }

    try {
      // Using exchangerate-api historical endpoint
      const response = await axios.get(
        `https://api.exchangerate-api.com/v4/history/${baseCurrency}/${date}`
      );

      const rates = {
        base: baseCurrency,
        date: date,
        rates: response.data.rates,
        timestamp: Date.now(),
      };

      // Cache historical rates (longer TTL as they don't change)
      this.cache.set(cacheKey, rates, 86400); // 24 hours

      return rates;
    } catch (error) {
      console.error('Error fetching historical rates:', error);
      throw error;
    }
  }

  /**
   * Convert amount with historical rate
   */
  async convertHistorical(amount, fromCurrency, toCurrency, date) {
    try {
      const rates = await this.getHistoricalRates(date, fromCurrency);
      const rate = rates.rates[toCurrency];

      if (!rate) {
        throw new Error(`Historical rate not found for ${toCurrency} on ${date}`);
      }

      const result = amount * rate;

      return {
        amount,
        fromCurrency,
        toCurrency,
        rate,
        result: Math.round(result * 100) / 100,
        date,
        historical: true,
      };
    } catch (error) {
      console.error('Historical conversion error:', error);
      throw error;
    }
  }

  /**
   * Get multiple currency conversions at once
   */
  async convertMultiple(amount, fromCurrency, toCurrencies) {
    try {
      const rates = await this.fetchExchangeRates(fromCurrency);
      
      const conversions = toCurrencies.map(toCurrency => {
        if (fromCurrency === toCurrency) {
          return {
            currency: toCurrency,
            rate: 1,
            amount: amount,
          };
        }

        const rate = rates.rates[toCurrency];
        return {
          currency: toCurrency,
          symbol: this.getCurrencySymbol(toCurrency),
          rate: rate || null,
          amount: rate ? Math.round(amount * rate * 100) / 100 : null,
        };
      });

      return {
        baseAmount: amount,
        baseCurrency: fromCurrency,
        conversions: conversions.filter(c => c.amount !== null),
        date: rates.date,
      };
    } catch (error) {
      console.error('Multiple conversion error:', error);
      throw error;
    }
  }

  /**
   * Format currency with symbol
   */
  formatCurrency(amount, currencyCode, locale = 'en-IN') {
    try {
      const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      return formatter.format(amount);
    } catch (error) {
      // Fallback formatting
      const symbol = this.getCurrencySymbol(currencyCode);
      return `${symbol}${amount.toFixed(2)}`;
    }
  }

  /**
   * Calculate currency trend (daily change)
   */
  async getCurrencyTrend(currencyCode, baseCurrency = this.baseCurrency) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [currentRates, previousRates] = await Promise.all([
        this.fetchExchangeRates(baseCurrency),
        this.getHistoricalRates(yesterday, baseCurrency)
      ]);

      const currentRate = currentRates.rates[currencyCode];
      const previousRate = previousRates.rates[currencyCode];

      if (!currentRate || !previousRate) {
        return null;
      }

      const change = currentRate - previousRate;
      const percentChange = (change / previousRate) * 100;

      return {
        currency: currencyCode,
        currentRate,
        previousRate,
        change,
        percentChange: Math.round(percentChange * 100) / 100,
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      };
    } catch (error) {
      console.error('Error calculating trend:', error);
      return null;
    }
  }

  /**
   * Get popular currency pairs
   */
  async getPopularPairs() {
    const pairs = [
      { from: 'USD', to: 'INR', name: 'USD to INR' },
      { from: 'EUR', to: 'INR', name: 'EUR to INR' },
      { from: 'GBP', to: 'INR', name: 'GBP to INR' },
      { from: 'USD', to: 'EUR', name: 'USD to EUR' },
      { from: 'USD', to: 'GBP', name: 'USD to GBP' },
      { from: 'INR', to: 'USD', name: 'INR to USD' },
    ];

    try {
      const results = await Promise.all(
        pairs.map(async pair => {
          try {
            const rate = await this.getExchangeRate(pair.from, pair.to);
            const trend = await this.getCurrencyTrend(pair.to, pair.from);
            
            return {
              ...pair,
              rate,
              trend: trend?.direction || 'neutral',
              change: trend?.percentChange || 0,
            };
          } catch (error) {
            return {
              ...pair,
              rate: null,
              trend: 'neutral',
              change: 0,
            };
          }
        })
      );

      return results.filter(r => r.rate !== null);
    } catch (error) {
      console.error('Error fetching popular pairs:', error);
      return [];
    }
  }

  /**
   * Bulk convert transactions
   */
  async convertTransactions(transactions, targetCurrency) {
    try {
      const results = await Promise.all(
        transactions.map(async txn => {
          try {
            const date = txn.date || new Date().toISOString().split('T')[0];
            const conversion = await this.convertHistorical(
              txn.amount,
              txn.currency,
              targetCurrency,
              date
            );

            return {
              ...txn,
              originalAmount: txn.amount,
              originalCurrency: txn.currency,
              convertedAmount: conversion.result,
              convertedCurrency: targetCurrency,
              exchangeRate: conversion.rate,
              conversionDate: date,
            };
          } catch (error) {
            console.error(`Error converting transaction ${txn._id}:`, error);
            return {
              ...txn,
              conversionError: error.message,
            };
          }
        })
      );

      return {
        total: transactions.length,
        successful: results.filter(r => !r.conversionError).length,
        failed: results.filter(r => r.conversionError).length,
        transactions: results,
      };
    } catch (error) {
      console.error('Bulk conversion error:', error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.flushAll();
    return { success: true, message: 'Cache cleared' };
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }
}

module.exports = new CurrencyConversionService();
