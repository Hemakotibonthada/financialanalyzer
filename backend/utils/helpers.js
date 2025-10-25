const crypto = require('crypto');

/**
 * Format currency amount with symbol
 */
const formatCurrency = (amount, currency = 'USD') => {
  const symbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    JPY: '¥',
    AUD: 'A$',
    CAD: 'C$'
  };
  
  const symbol = symbols[currency] || currency;
  return `${symbol}${Math.abs(amount).toFixed(2)}`;
};

/**
 * Format date to readable string
 */
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Calculate percentage
 */
const calculatePercentage = (value, total) => {
  if (total === 0) return 0;
  return ((value / total) * 100).toFixed(2);
};

/**
 * Generate random color for charts
 */
const generateColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

/**
 * Sanitize filename
 */
const sanitizeFilename = (filename) => {
  return filename.replace(/[^a-z0-9.-]/gi, '_').toLowerCase();
};

/**
 * Generate unique ID
 */
const generateUniqueId = () => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Calculate date range
 */
const getDateRange = (period) => {
  const now = new Date();
  let startDate;
  
  switch(period) {
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'month':
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case 'quarter':
      startDate = new Date(now.setMonth(now.getMonth() - 3));
      break;
    case 'year':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = new Date(now.setMonth(now.getMonth() - 1));
  }
  
  return {
    start: startDate,
    end: new Date()
  };
};

/**
 * Group transactions by period
 */
const groupByPeriod = (transactions, period = 'month') => {
  const grouped = {};
  
  transactions.forEach(transaction => {
    const date = new Date(transaction.date);
    let key;
    
    if (period === 'day') {
      key = date.toISOString().split('T')[0];
    } else if (period === 'month') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } else if (period === 'year') {
      key = date.getFullYear().toString();
    }
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(transaction);
  });
  
  return grouped;
};

/**
 * Calculate moving average
 */
const calculateMovingAverage = (data, period = 3) => {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - period + 1);
    const subset = data.slice(start, i + 1);
    const average = subset.reduce((sum, val) => sum + val, 0) / subset.length;
    result.push(average);
  }
  return result;
};

/**
 * Validate PAN number format
 */
const isValidPAN = (pan) => {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan);
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^\S+@\S+\.\S+$/;
  return emailRegex.test(email);
};

/**
 * Calculate financial health score
 */
const calculateHealthScore = (metrics) => {
  const {
    savingsRate = 0,
    debtRatio = 0,
    budgetCompliance = 0,
    incomeStability = 0,
    spendingControl = 0
  } = metrics;
  
  // Weight different factors
  const weights = {
    savingsRate: 0.25,
    debtRatio: 0.20,
    budgetCompliance: 0.25,
    incomeStability: 0.15,
    spendingControl: 0.15
  };
  
  const score = (
    savingsRate * weights.savingsRate +
    (100 - debtRatio) * weights.debtRatio +
    budgetCompliance * weights.budgetCompliance +
    incomeStability * weights.incomeStability +
    spendingControl * weights.spendingControl
  );
  
  return Math.min(100, Math.max(0, Math.round(score)));
};

/**
 * Get rating from score
 */
const getRating = (score) => {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'average';
  if (score >= 20) return 'poor';
  return 'critical';
};

/**
 * Encrypt sensitive data
 */
const encrypt = (text) => {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
};

/**
 * Decrypt sensitive data
 */
const decrypt = (text) => {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
  
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encrypted = parts.join(':');
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

module.exports = {
  formatCurrency,
  formatDate,
  calculatePercentage,
  generateColor,
  sanitizeFilename,
  generateUniqueId,
  getDateRange,
  groupByPeriod,
  calculateMovingAverage,
  isValidPAN,
  isValidEmail,
  calculateHealthScore,
  getRating,
  encrypt,
  decrypt
};
