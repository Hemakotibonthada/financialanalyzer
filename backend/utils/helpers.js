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
 * Sanitize filename (enhanced with path traversal protection)
 */
const sanitizeFilename = (filename) => {
  // Remove path traversal attempts
  const sanitized = filename
    .replace(/\.\.[\\/]/g, '') // Remove ../ or ..\
    .replace(/[\\/]/g, '_')    // Replace path separators
    .replace(/[^a-z0-9._-]/gi, '_') // Allow alphanumeric, dots, hyphens, underscores
    .toLowerCase()
    .substring(0, 255); // Limit filename length
  return sanitized || 'unnamed';
};

/**
 * Generate unique ID
 */
const generateUniqueId = () => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Calculate date range (FIXED: don't mutate the original Date)
 */
const getDateRange = (period) => {
  const end = new Date();
  let startDate;
  
  switch(period) {
    case 'week':
      startDate = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(end);
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'quarter':
      startDate = new Date(end);
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case 'year':
      startDate = new Date(end);
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate = new Date(end);
      startDate.setMonth(startDate.getMonth() - 1);
  }
  
  return {
    start: startDate,
    end
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
 * Validate email format (strict)
 */
const isValidEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
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
 * Encrypt sensitive data (FIXED: require ENCRYPTION_KEY, no default fallback)
 */
const encrypt = (text) => {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is required for encryption');
  }
  const algorithm = 'aes-256-cbc';
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, salt, 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return salt.toString('hex') + ':' + iv.toString('hex') + ':' + encrypted;
};

/**
 * Decrypt sensitive data (FIXED: require ENCRYPTION_KEY, support dynamic salt)
 */
const decrypt = (text) => {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is required for decryption');
  }
  const algorithm = 'aes-256-cbc';
  
  const parts = text.split(':');
  
  // Support both old format (iv:encrypted) and new format (salt:iv:encrypted)
  let salt, iv, encrypted;
  if (parts.length === 3) {
    salt = Buffer.from(parts[0], 'hex');
    iv = Buffer.from(parts[1], 'hex');
    encrypted = parts[2];
  } else {
    // Legacy format: iv:encrypted (with static salt)
    salt = Buffer.from('salt');
    iv = Buffer.from(parts[0], 'hex');
    encrypted = parts.slice(1).join(':');
  }
  
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, salt, 32);
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
