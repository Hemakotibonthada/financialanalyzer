const logger = require('../utils/logger');

// Common currency symbols
const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  CNY: '¥',
  CHF: 'Fr'
};

// Default exchange rates (relative to USD)
// In production, fetch from API like exchangerate-api.com
let exchangeRates = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.12,
  JPY: 149.50,
  AUD: 1.53,
  CAD: 1.37,
  CNY: 7.24,
  CHF: 0.89
};

let lastUpdated = new Date();
const UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch latest exchange rates from API
 */
async function updateExchangeRates() {
  try {
    // Using exchangerate-api.com free tier
    const API_KEY = process.env.EXCHANGE_RATE_API_KEY || 'demo';
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.rates) {
        exchangeRates = {
          USD: 1.0,
          ...data.rates
        };
        lastUpdated = new Date();
        logger.info('Exchange rates updated successfully');
      }
    }
  } catch (error) {
    logger.error('Failed to update exchange rates:', error);
    // Continue using cached rates
  }
}

/**
 * Convert amount from one currency to another
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {number} Converted amount
 */
function convertCurrency(amount, fromCurrency = 'USD', toCurrency = 'USD') {
  if (!amount || amount === 0) return 0;
  if (fromCurrency === toCurrency) return amount;
  
  // Check if rates need updating
  const timeSinceUpdate = Date.now() - lastUpdated.getTime();
  if (timeSinceUpdate > UPDATE_INTERVAL) {
    updateExchangeRates().catch(err => 
      logger.error('Background rate update failed:', err)
    );
  }
  
  const fromRate = exchangeRates[fromCurrency.toUpperCase()] || 1;
  const toRate = exchangeRates[toCurrency.toUpperCase()] || 1;
  
  // Convert to USD first, then to target currency
  const usdAmount = amount / fromRate;
  const convertedAmount = usdAmount * toRate;
  
  return Math.round(convertedAmount * 100) / 100; // Round to 2 decimals
}

/**
 * Get currency symbol
 * @param {string} currencyCode - Currency code (USD, EUR, etc.)
 * @returns {string} Currency symbol
 */
function getCurrencySymbol(currencyCode) {
  return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || currencyCode;
}

/**
 * Format amount with currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted string (e.g., "$100.00")
 */
function formatCurrency(amount, currency = 'USD') {
  const symbol = getCurrencySymbol(currency);
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  // Some currencies put symbol after
  if (currency === 'EUR') {
    return `${formatted}${symbol}`;
  }
  
  return `${symbol}${formatted}`;
}

/**
 * Get all supported currencies
 * @returns {Array} Array of currency objects
 */
function getSupportedCurrencies() {
  return [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' }
  ];
}

/**
 * Get current exchange rates
 * @returns {Object} Current exchange rates
 */
function getExchangeRates() {
  return {
    rates: exchangeRates,
    lastUpdated: lastUpdated.toISOString()
  };
}

/**
 * Convert multiple amounts
 * @param {Array} amounts - Array of {amount, currency} objects
 * @param {string} toCurrency - Target currency
 * @returns {Array} Converted amounts
 */
function convertMultiple(amounts, toCurrency) {
  return amounts.map(item => ({
    ...item,
    originalAmount: item.amount,
    originalCurrency: item.currency,
    convertedAmount: convertCurrency(item.amount, item.currency, toCurrency),
    convertedCurrency: toCurrency
  }));
}

// Initialize rates on module load
updateExchangeRates().catch(err => 
  logger.warn('Initial rate fetch failed, using defaults:', err)
);

// Update rates periodically
setInterval(() => {
  updateExchangeRates().catch(err => 
    logger.error('Periodic rate update failed:', err)
  );
}, UPDATE_INTERVAL);

module.exports = {
  convertCurrency,
  getCurrencySymbol,
  formatCurrency,
  getSupportedCurrencies,
  getExchangeRates,
  convertMultiple,
  updateExchangeRates
};
