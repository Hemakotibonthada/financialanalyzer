/**
 * Currency Utility Functions
 * Supports USD and INR input with INR as reporting currency
 */

// Current USD to INR exchange rate (update regularly or fetch from API)
const USD_TO_INR_RATE = 83.12;

/**
 * Convert amount from one currency to INR
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency ('USD' or 'INR')
 * @returns {number} Amount in INR
 */
export const convertToINR = (amount, fromCurrency = 'INR') => {
  const numAmount = parseFloat(amount) || 0;
  
  if (fromCurrency === 'USD') {
    return numAmount * USD_TO_INR_RATE;
  }
  
  return numAmount; // Already in INR
};

/**
 * Convert amount from INR to target currency
 * @param {number} amount - Amount in INR
 * @param {string} toCurrency - Target currency ('USD' or 'INR')
 * @returns {number} Converted amount
 */
export const convertFromINR = (amount, toCurrency = 'INR') => {
  const numAmount = parseFloat(amount) || 0;
  
  if (toCurrency === 'USD') {
    return numAmount / USD_TO_INR_RATE;
  }
  
  return numAmount; // Already in INR
};

/**
 * Format amount in INR for display
 * @param {number} amount - Amount in INR
 * @param {boolean} showSymbol - Whether to show ₹ symbol
 * @returns {string} Formatted amount
 */
export const formatINR = (amount, showSymbol = true) => {
  const numAmount = parseFloat(amount) || 0;
  const formatted = numAmount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return showSymbol ? `₹${formatted}` : formatted;
};

/**
 * Format amount in USD for display
 * @param {number} amount - Amount in USD
 * @param {boolean} showSymbol - Whether to show $ symbol
 * @returns {string} Formatted amount
 */
export const formatUSD = (amount, showSymbol = true) => {
  const numAmount = parseFloat(amount) || 0;
  const formatted = numAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return showSymbol ? `$${formatted}` : formatted;
};

/**
 * Format amount in the given currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code ('USD' or 'INR')
 * @param {boolean} showSymbol - Whether to show currency symbol
 * @returns {string} Formatted amount
 */
export const formatCurrency = (amount, currency = 'INR', showSymbol = true) => {
  if (currency === 'USD') {
    return formatUSD(amount, showSymbol);
  }
  return formatINR(amount, showSymbol);
};

/**
 * Parse currency input string to number
 * Removes currency symbols, commas, and handles various formats
 * @param {string} input - Input string
 * @returns {number} Parsed number
 */
export const parseCurrencyInput = (input) => {
  if (typeof input === 'number') return input;
  if (!input) return 0;
  
  // Remove currency symbols, commas, and spaces
  const cleaned = String(input)
    .replace(/[₹$,\s]/g, '')
    .trim();
  
  return parseFloat(cleaned) || 0;
};

/**
 * Get currency symbol
 * @param {string} currency - Currency code
 * @returns {string} Currency symbol
 */
export const getCurrencySymbol = (currency = 'INR') => {
  return currency === 'USD' ? '$' : '₹';
};

/**
 * Get current USD to INR exchange rate
 * @returns {number} Exchange rate
 */
export const getExchangeRate = () => {
  return USD_TO_INR_RATE;
};

/**
 * Currency options for dropdowns
 */
export const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR (₹)', symbol: '₹' },
  { value: 'USD', label: 'USD ($)', symbol: '$' }
];

/**
 * Validate currency code
 * @param {string} currency - Currency code to validate
 * @returns {boolean} Is valid
 */
export const isValidCurrency = (currency) => {
  return ['INR', 'USD'].includes(currency);
};

/**
 * Create currency input data object
 * @param {number} amount - Amount entered
 * @param {string} currency - Currency of input
 * @returns {object} Currency data with INR conversion
 */
export const createCurrencyData = (amount, currency = 'INR') => {
  const inputAmount = parseCurrencyInput(amount);
  const amountInINR = convertToINR(inputAmount, currency);
  
  return {
    amount: inputAmount,
    currency: currency,
    amountInINR: amountInINR,
    exchangeRate: currency === 'USD' ? USD_TO_INR_RATE : 1
  };
};

/**
 * Format for reports (always in INR)
 * @param {object} currencyData - Currency data object
 * @returns {string} Formatted INR amount
 */
export const formatForReport = (currencyData) => {
  if (currencyData && typeof currencyData === 'object') {
    return formatINR(currencyData.amountInINR || 0);
  }
  // Fallback if plain number passed
  return formatINR(currencyData || 0);
};

export default {
  convertToINR,
  convertFromINR,
  formatINR,
  formatUSD,
  formatCurrency,
  parseCurrencyInput,
  getCurrencySymbol,
  getExchangeRate,
  CURRENCY_OPTIONS,
  isValidCurrency,
  createCurrencyData,
  formatForReport
};
