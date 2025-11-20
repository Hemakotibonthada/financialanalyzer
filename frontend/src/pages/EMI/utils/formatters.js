// Currency formatter
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Date formatter
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Ordinal suffix for day numbers (e.g., 1st, 2nd)
export const getOrdinalSuffix = (n) => {
  const s = ["th","st","nd","rd"], v = n%100;
  return n + (s[(v-20)%10] || s[v] || s[0]);
};

// Estimate end date for an EMI
export const estimateEndDate = (emi) => {
  if (!emi) return null;
  if (emi.endDate) return emi.endDate;
  if (emi.schedule && emi.schedule.length) return emi.schedule[emi.schedule.length - 1].dueDate;
  try {
    const start = emi.startDate ? new Date(emi.startDate) : null;
    const months = parseInt(emi.totalTenure || 0, 10);
    if (!start || !months) return null;
    const d = new Date(start);
    d.setMonth(d.getMonth() + months - 1);
    return d.toISOString();
  } catch (e) {
    return null;
  }
};

// Get severity color for insights
export const getSeverityColor = (severity) => {
  switch (severity) {
    case 'success': return 'success';
    case 'warning': return 'warning';
    case 'error': return 'error';
    default: return 'info';
  }
};
