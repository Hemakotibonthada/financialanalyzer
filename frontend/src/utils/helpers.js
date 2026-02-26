// ============================================================
// Financial Analyzer - Comprehensive Utility Library
// Formatting, calculations, validators, converters, and more
// ============================================================

// ======================== CURRENCY & NUMBER FORMATTING ========================

const CURRENCY_SYMBOLS = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥',
  AUD: 'A$', CAD: 'C$', CHF: 'Fr', SGD: 'S$', HKD: 'HK$',
  KRW: '₩', BRL: 'R$', ZAR: 'R', MXN: '$', RUB: '₽',
  AED: 'د.إ', SAR: '﷼', THB: '฿', MYR: 'RM', PHP: '₱',
};

export function formatCurrency(amount, currency = 'INR', options = {}) {
  const { compact = false, showSign = false, decimals = 2 } = options;
  
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  
  const num = Number(amount);
  const sign = showSign && num > 0 ? '+' : '';
  
  if (compact) {
    return sign + formatCompactNumber(num, currency);
  }
  
  try {
    const formatted = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(Math.abs(num));
    
    return `${sign}${num < 0 ? '-' : ''}${formatted}`;
  } catch {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    return `${sign}${num < 0 ? '-' : ''}${symbol}${Math.abs(num).toFixed(decimals)}`;
  }
}

export function formatCompactNumber(num, currency = 'INR') {
  const symbol = CURRENCY_SYMBOLS[currency] || '';
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  if (currency === 'INR') {
    if (abs >= 10000000) return `${sign}${symbol}${(abs / 10000000).toFixed(2)}Cr`;
    if (abs >= 100000) return `${sign}${symbol}${(abs / 100000).toFixed(2)}L`;
    if (abs >= 1000) return `${sign}${symbol}${(abs / 1000).toFixed(1)}K`;
  } else {
    if (abs >= 1000000000) return `${sign}${symbol}${(abs / 1000000000).toFixed(2)}B`;
    if (abs >= 1000000) return `${sign}${symbol}${(abs / 1000000).toFixed(2)}M`;
    if (abs >= 1000) return `${sign}${symbol}${(abs / 1000).toFixed(1)}K`;
  }
  
  return `${sign}${symbol}${abs.toFixed(0)}`;
}

export function formatNumber(num, options = {}) {
  const { decimals = 0, compact = false, locale = 'en-IN' } = options;
  
  if (num === null || num === undefined || isNaN(num)) return '—';
  
  if (compact) {
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    if (abs >= 1000000000) return `${sign}${(abs / 1000000000).toFixed(1)}B`;
    if (abs >= 1000000) return `${sign}${(abs / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}K`;
  }
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(decimals)}%`;
}

// ======================== DATE FORMATTING ========================

export function formatDate(date, format = 'medium') {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  
  const formats = {
    short: { day: 'numeric', month: 'short' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
    datetime: { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
    time: { hour: '2-digit', minute: '2-digit' },
    iso: null,
    relative: null,
  };
  
  if (format === 'iso') return d.toISOString().split('T')[0];
  if (format === 'relative') return getRelativeTime(d);
  
  return d.toLocaleDateString('en-IN', formats[format] || formats.medium);
}

export function getRelativeTime(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);
  
  if (seconds < 30) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}

export function getDaysUntil(date) {
  if (!date) return null;
  const diff = new Date(date) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getDateRange(period) {
  const now = new Date();
  const start = new Date(now);
  
  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      now.setDate(now.getDate() - 1);
      now.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(start.getMonth() - 3);
      break;
    case 'halfYear':
      start.setMonth(start.getMonth() - 6);
      break;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      break;
    case 'mtd':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'ytd':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      start.setMonth(start.getMonth() - 1);
  }
  
  return { start: new Date(start), end: new Date(now) };
}

export function getMonthName(monthIndex) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[monthIndex] || '';
}

export function getFinancialYear(date = new Date()) {
  const d = new Date(date);
  const month = d.getMonth();
  const year = d.getFullYear();
  return month >= 3 ? `FY${year}-${year + 1}` : `FY${year - 1}-${year}`;
}

// ======================== FINANCIAL CALCULATIONS ========================

export function calculateEMI(principal, annualRate, tenureMonths) {
  if (annualRate === 0) return principal / tenureMonths;
  const monthlyRate = annualRate / 12 / 100;
  const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) / 
    (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  return Math.round(emi * 100) / 100;
}

export function calculateCompoundInterest(principal, rate, timeYears, n = 12) {
  return principal * Math.pow(1 + rate / (n * 100), n * timeYears);
}

export function calculateSIP(monthlyInvestment, annualReturn, years) {
  const monthlyRate = annualReturn / 12 / 100;
  const months = years * 12;
  const futureValue = monthlyInvestment * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
  return {
    futureValue: Math.round(futureValue),
    totalInvested: monthlyInvestment * months,
    totalReturns: Math.round(futureValue - monthlyInvestment * months),
  };
}

export function calculateCAGR(beginValue, endValue, years) {
  if (beginValue <= 0 || years <= 0) return 0;
  return (Math.pow(endValue / beginValue, 1 / years) - 1) * 100;
}

export function calculateXIRR(cashflows, dates, guess = 0.1) {
  const datesArr = dates.map(d => new Date(d).getTime());
  const dayMs = 86400000;
  
  let rate = guess;
  for (let i = 0; i < 100; i++) {
    let f = 0, df = 0;
    for (let j = 0; j < cashflows.length; j++) {
      const years = (datesArr[j] - datesArr[0]) / (365.25 * dayMs);
      f += cashflows[j] / Math.pow(1 + rate, years);
      df -= years * cashflows[j] / Math.pow(1 + rate, years + 1);
    }
    if (Math.abs(f) < 0.001) return rate * 100;
    rate -= f / df;
  }
  return rate * 100;
}

export function calculateLoanAmortization(principal, annualRate, tenureMonths) {
  const monthlyRate = annualRate / 12 / 100;
  const emi = calculateEMI(principal, annualRate, tenureMonths);
  const schedule = [];
  let balance = principal;
  
  for (let month = 1; month <= tenureMonths; month++) {
    const interest = balance * monthlyRate;
    const principalPaid = emi - interest;
    balance -= principalPaid;
    
    schedule.push({
      month,
      emi: Math.round(emi * 100) / 100,
      principal: Math.round(principalPaid * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      balance: Math.max(0, Math.round(balance * 100) / 100),
      totalPrincipal: Math.round((principal - balance) * 100) / 100,
      totalInterest: schedule.reduce((sum, s) => sum + s.interest, 0) + Math.round(interest * 100) / 100,
    });
  }
  
  return {
    emi: Math.round(emi * 100) / 100,
    totalPayment: Math.round(emi * tenureMonths * 100) / 100,
    totalInterest: Math.round((emi * tenureMonths - principal) * 100) / 100,
    schedule,
  };
}

export function calculateSavingsRate(income, expenses) {
  if (!income || income <= 0) return 0;
  return ((income - expenses) / income) * 100;
}

export function calculateDebtToIncomeRatio(totalDebtPayments, grossIncome) {
  if (!grossIncome || grossIncome <= 0) return 0;
  return (totalDebtPayments / grossIncome) * 100;
}

export function calculateEmergencyFundMonths(savings, monthlyExpenses) {
  if (!monthlyExpenses || monthlyExpenses <= 0) return 0;
  return savings / monthlyExpenses;
}

export function calculateRetirementCorpus(monthlyExpenses, inflationRate, years, withdrawalRate = 4) {
  const futureExpenses = monthlyExpenses * 12 * Math.pow(1 + inflationRate / 100, years);
  return futureExpenses / (withdrawalRate / 100);
}

export function calculateTaxOldRegime(income) {
  const slabs = [
    { limit: 250000, rate: 0 },
    { limit: 500000, rate: 5 },
    { limit: 1000000, rate: 20 },
    { limit: Infinity, rate: 30 },
  ];
  return calculateTaxFromSlabs(income, slabs);
}

export function calculateTaxNewRegime(income) {
  const slabs = [
    { limit: 300000, rate: 0 },
    { limit: 700000, rate: 5 },
    { limit: 1000000, rate: 10 },
    { limit: 1200000, rate: 15 },
    { limit: 1500000, rate: 20 },
    { limit: Infinity, rate: 30 },
  ];
  return calculateTaxFromSlabs(income, slabs);
}

function calculateTaxFromSlabs(income, slabs) {
  let tax = 0;
  let remaining = income;
  let prevLimit = 0;
  
  for (const slab of slabs) {
    const taxable = Math.min(remaining, slab.limit - prevLimit);
    if (taxable <= 0) break;
    tax += taxable * (slab.rate / 100);
    remaining -= taxable;
    prevLimit = slab.limit;
  }
  
  // Add cess
  const cess = tax * 0.04;
  return { tax, cess, total: tax + cess };
}

export function calculateROI(currentValue, investedAmount) {
  if (!investedAmount || investedAmount === 0) return 0;
  return ((currentValue - investedAmount) / investedAmount) * 100;
}

export function calculatePortfolioRisk(holdings) {
  if (!holdings?.length) return { volatility: 0, sharpeRatio: 0, beta: 1, riskLevel: 'low' };
  
  const returns = holdings.map(h => h.returnPercentage || 0);
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance);
  const riskFreeRate = 6; // Assumed risk-free rate
  const sharpeRatio = volatility > 0 ? (mean - riskFreeRate) / volatility : 0;
  
  let riskLevel = 'low';
  if (volatility > 30) riskLevel = 'very_high';
  else if (volatility > 20) riskLevel = 'high';
  else if (volatility > 12) riskLevel = 'moderate';
  
  return { volatility: Math.round(volatility * 100) / 100, sharpeRatio: Math.round(sharpeRatio * 100) / 100, beta: 1, riskLevel };
}

// ======================== VALIDATION ========================

export const validators = {
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  phone: (value) => /^(\+91)?[6-9]\d{9}$/.test(value?.replace(/[\s-]/g, '')),
  pan: (value) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value?.toUpperCase()),
  aadhaar: (value) => /^\d{12}$/.test(value?.replace(/\s/g, '')),
  gstin: (value) => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value),
  ifsc: (value) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value),
  pincode: (value) => /^[1-9][0-9]{5}$/.test(value),
  url: (value) => {
    try { new URL(value); return true; } catch { return false; }
  },
  strongPassword: (value) => {
    if (!value || value.length < 8) return false;
    return /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[!@#$%^&*]/.test(value);
  },
  amount: (value) => !isNaN(value) && Number(value) > 0,
  positiveNumber: (value) => !isNaN(value) && Number(value) > 0,
  percentage: (value) => !isNaN(value) && Number(value) >= 0 && Number(value) <= 100,
  dateNotPast: (value) => new Date(value) >= new Date(new Date().toDateString()),
  dateNotFuture: (value) => new Date(value) <= new Date(),
  minAge: (dob, minAge = 18) => {
    const age = Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));
    return age >= minAge;
  },
};

// ======================== COLOR UTILITIES ========================

export function generateChartColors(count) {
  const baseColors = [
    '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe',
    '#00f2fe', '#43e97b', '#38f9d7', '#fa709a', '#fee140',
    '#a18cd1', '#fbc2eb', '#84fab0', '#8fd3f4', '#fccb90',
    '#d57eeb', '#e0c3fc', '#a6c1ee', '#fda085', '#f6d365',
  ];
  
  if (count <= baseColors.length) return baseColors.slice(0, count);
  
  const colors = [...baseColors];
  for (let i = baseColors.length; i < count; i++) {
    const hue = (i * 137.5) % 360;
    colors.push(`hsl(${hue}, 70%, 60%)`);
  }
  return colors;
}

export function getStatusColor(status) {
  const colorMap = {
    success: '#48c78e', completed: '#48c78e', paid: '#48c78e', active: '#48c78e',
    warning: '#ffdd57', pending: '#ffdd57', due: '#ffdd57', partial: '#ffdd57',
    danger: '#f14668', overdue: '#f14668', failed: '#f14668', defaulted: '#f14668',
    error: '#f14668', cancelled: '#f14668',
    info: '#3e8ed0', processing: '#3e8ed0', in_progress: '#3e8ed0',
    primary: '#667eea', draft: '#667eea',
    neutral: '#7a7a7a', inactive: '#7a7a7a', expired: '#7a7a7a',
  };
  return colorMap[status?.toLowerCase()] || '#7a7a7a';
}

export function hexToRgba(hex, alpha = 1) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(0, 0, 0, ${alpha})`;
  return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
}

export function getScoreColor(score, max = 100) {
  const percentage = (score / max) * 100;
  if (percentage >= 80) return '#48c78e';
  if (percentage >= 60) return '#3e8ed0';
  if (percentage >= 40) return '#ffdd57';
  if (percentage >= 20) return '#ff9f43';
  return '#f14668';
}

export function getCategoryIcon(category) {
  const icons = {
    food: '🍽️', dining: '🍽️', restaurant: '🍽️', groceries: '🛒',
    transport: '🚗', fuel: '⛽', travel: '✈️', flight: '✈️',
    shopping: '🛍️', clothing: '👕', electronics: '📱',
    health: '🏥', medical: '💊', pharmacy: '💊',
    education: '📚', books: '📖', courses: '🎓',
    entertainment: '🎬', movies: '🎬', gaming: '🎮', music: '🎵',
    utilities: '💡', electricity: '⚡', water: '💧', gas: '🔥',
    internet: '🌐', mobile: '📱', phone: '📞',
    rent: '🏠', housing: '🏠', home: '🏠',
    insurance: '🛡️', investment: '📈', savings: '💰',
    salary: '💼', income: '💵', freelance: '💻',
    subscription: '📦', streaming: '📺',
    personal: '👤', fitness: '🏋️', beauty: '💅',
    charity: '❤️', donation: '🤝', gifts: '🎁',
    tax: '📋', emi: '🏦', loan: '🏦',
    other: '📌',
  };
  return icons[category?.toLowerCase()] || '📌';
}

// ======================== DATA TRANSFORMATION ========================

export function groupBy(array, key) {
  return array.reduce((groups, item) => {
    const value = typeof key === 'function' ? key(item) : item[key];
    (groups[value] = groups[value] || []).push(item);
    return groups;
  }, {});
}

export function sortBy(array, key, direction = 'asc') {
  return [...array].sort((a, b) => {
    const aVal = typeof key === 'function' ? key(a) : a[key];
    const bVal = typeof key === 'function' ? key(b) : b[key];
    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return direction === 'asc' ? comparison : -comparison;
  });
}

export function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function unique(array, key) {
  if (!key) return [...new Set(array)];
  const seen = new Set();
  return array.filter(item => {
    const value = typeof key === 'function' ? key(item) : item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

export function sum(array, key) {
  return array.reduce((total, item) => {
    const value = typeof key === 'function' ? key(item) : (key ? item[key] : item);
    return total + (Number(value) || 0);
  }, 0);
}

export function average(array, key) {
  if (array.length === 0) return 0;
  return sum(array, key) / array.length;
}

export function percentile(array, p) {
  const sorted = [...array].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

export function movingAverage(data, windowSize) {
  return data.map((_, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const window = data.slice(start, index + 1);
    return window.reduce((sum, val) => sum + val, 0) / window.length;
  });
}

export function standardDeviation(values) {
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const squareDiffs = values.map(v => Math.pow(v - avg, 2));
  return Math.sqrt(squareDiffs.reduce((s, v) => s + v, 0) / values.length);
}

// ======================== STRING UTILITIES ========================

export function truncate(str, maxLength = 50, suffix = '...') {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function titleCase(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

export function slugify(str) {
  return str?.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || '';
}

export function maskString(str, visibleChars = 4, maskChar = '*') {
  if (!str || str.length <= visibleChars) return str;
  return maskChar.repeat(str.length - visibleChars) + str.slice(-visibleChars);
}

export function maskEmail(email) {
  if (!email) return '';
  const [user, domain] = email.split('@');
  return `${user[0]}${'*'.repeat(Math.max(1, user.length - 2))}${user.slice(-1)}@${domain}`;
}

export function maskPhone(phone) {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  return `${'*'.repeat(clean.length - 4)}${clean.slice(-4)}`;
}

export function maskAccountNumber(accountNumber) {
  if (!accountNumber) return '';
  return `XXXX${accountNumber.slice(-4)}`;
}

export function pluralize(count, singular, plural) {
  return count === 1 ? singular : (plural || `${singular}s`);
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`;
}

// ======================== CHART DATA HELPERS ========================

export function prepareTimeSeriesData(transactions, groupByPeriod = 'month') {
  const grouped = {};
  
  transactions.forEach(t => {
    const date = new Date(t.date);
    let key;
    
    switch (groupByPeriod) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'quarter':
        key = `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
        break;
      case 'year':
        key = `${date.getFullYear()}`;
        break;
      default:
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    
    if (!grouped[key]) grouped[key] = { income: 0, expense: 0, count: 0 };
    
    if (t.type === 'credit') grouped[key].income += t.amount;
    else grouped[key].expense += t.amount;
    grouped[key].count++;
  });
  
  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, data]) => ({
      period,
      label: formatPeriodLabel(period, groupByPeriod),
      ...data,
      net: data.income - data.expense,
    }));
}

function formatPeriodLabel(period, type) {
  switch (type) {
    case 'day':
      return new Date(period).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    case 'month': {
      const [y, m] = period.split('-');
      return `${getMonthName(parseInt(m) - 1)} ${y.slice(2)}`;
    }
    default:
      return period;
  }
}

export function prepareCategoryData(transactions, type = 'debit') {
  const categories = {};
  const filtered = transactions.filter(t => t.type === type);
  const total = filtered.reduce((s, t) => s + t.amount, 0);
  
  filtered.forEach(t => {
    const cat = t.category || 'Other';
    categories[cat] = (categories[cat] || 0) + t.amount;
  });
  
  return Object.entries(categories)
    .map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
      percentage: total > 0 ? Math.round((value / total) * 10000) / 100 : 0,
      icon: getCategoryIcon(name),
    }))
    .sort((a, b) => b.value - a.value);
}

export function calculateTrend(current, previous) {
  if (!previous || previous === 0) return { direction: 'neutral', percentage: 0, isPositive: true };
  const change = ((current - previous) / Math.abs(previous)) * 100;
  return {
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
    percentage: Math.abs(Math.round(change * 10) / 10),
    isPositive: change >= 0,
    change: Math.round((current - previous) * 100) / 100,
  };
}

// ======================== EXPORT UTILITIES ========================

export function downloadAsJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${filename}.json`);
}

export function downloadAsCSV(data, filename) {
  if (!data?.length) return;
  
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const value = row[h];
        const escaped = String(value ?? '').replace(/"/g, '""');
        return /[,"\n]/.test(escaped) ? `"${escaped}"` : escaped;
      }).join(',')
    ),
  ];
  
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  downloadBlob(blob, `${filename}.csv`);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ======================== MISC UTILITIES ========================

export function debounce(fn, delay) {
  let timer;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

export function throttle(fn, delay) {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
}

export function deepClone(obj) {
  if (typeof structuredClone === 'function') return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

export function isEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => isEqual(a[key], b[key]));
}

export function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function lerp(start, end, t) {
  return start + (end - start) * t;
}

export function mapRange(value, inMin, inMax, outMin, outMax) {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function getFinancialQuote() {
  const quotes = [
    { text: "Do not save what is left after spending, but spend what is left after saving.", author: "Warren Buffett" },
    { text: "The best investment you can make is in yourself.", author: "Warren Buffett" },
    { text: "Financial freedom is available to those who learn about it and work for it.", author: "Robert Kiyosaki" },
    { text: "A budget tells your money where to go instead of wondering where it went.", author: "Dave Ramsey" },
    { text: "Compound interest is the eighth wonder of the world.", author: "Albert Einstein" },
    { text: "It's not how much money you make, but how much money you keep.", author: "Robert Kiyosaki" },
    { text: "Every time you borrow money, you're robbing your future self.", author: "Nathan W. Morris" },
    { text: "Money is a terrible master but an excellent servant.", author: "P.T. Barnum" },
    { text: "The more you learn, the more you earn.", author: "Warren Buffett" },
    { text: "Risk comes from not knowing what you're doing.", author: "Warren Buffett" },
  ];
  return quotes[Math.floor(Math.random() * quotes.length)];
}
