// Utility functions for EMI Tracker

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const getOrdinalSuffix = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const estimateEndDate = (emi) => {
  if (!emi.startDate || !emi.tenure) return 'N/A';
  
  const start = new Date(emi.startDate);
  const endDate = new Date(start);
  endDate.setMonth(endDate.getMonth() + parseInt(emi.tenure));
  
  return formatDate(endDate);
};

export const getSeverityColor = (severity) => {
  switch (severity) {
    case 'success': return 'success';
    case 'warning': return 'warning';
    case 'error': return 'error';
    default: return 'info';
  }
};

export const getDisplayedMonths = (upcomingPayments, upcomingMonthsToShow) => {
  if (!upcomingPayments?.upcoming) return [];
  const now = new Date();
  const cutoffDate = new Date(now.getFullYear(), now.getMonth() + upcomingMonthsToShow, 0);
  return upcomingPayments.upcoming.filter(emi => {
    const dueDate = new Date(emi.nextDueDate);
    return dueDate <= cutoffDate;
  });
};
