import client, { unwrap, getCached } from './client';

/**
 * Every backend call the app makes, grouped by domain.
 *
 * Paths must NOT begin with /api - the client's baseURL already ends in /api.
 * Each function returns the unwrapped payload, so screens never touch the
 * { success, data } envelope.
 *
 * Verified against backend/routes/*.js.
 */

const get = async (path, config) => unwrap(await client.get(path, config));
const post = async (path, body, config) => unwrap(await client.post(path, body, config));
const put = async (path, body) => unwrap(await client.put(path, body));
const patch = async (path, body) => unwrap(await client.patch(path, body));
const del = async (path) => unwrap(await client.delete(path));

/* -------------------------------------------------------------- auth */

export const authApi = {
  login: (email, password) => post('/auth/login', { email, password }),
  register: (name, email, password) => post('/auth/register', { name, email, password }),
  me: () => get('/auth/me'),
  logout: () => post('/auth/logout', {}),
  forgotPassword: (email) => post('/auth/forgot-password', { email })
};

/* --------------------------------------------------------- dashboard */

export const dashboardApi = {
  // Cached: this is the first screen after sign-in, so it must render
  // something useful on a train with no signal.
  summary: () => getCached('/analytics/dashboard'),
  financialSummary: () => getCached('/financial/summary')
};

/* ------------------------------------------------------ transactions */

export const transactionsApi = {
  list: (params) => get('/financial/transactions', { params }),
  create: (body) => post('/financial/transactions', body),
  update: (id, body) => put(`/financial/transactions/${id}`, body),
  remove: (id) => del(`/financial/transactions/${id}`),
  categories: () => get('/analytics/categories')
};

/* ---------------------------------------------------------------- emi */

export const emiApi = {
  overview: () => getCached('/emi/overview'),
  list: (params) => get('/emi', { params }),
  upcoming: (months = 12) => get('/emi/upcoming', { params: { months } }),
  detail: (id) => get(`/emi/${id}`),
  create: (body) => post('/emi', body),
  update: (id, body) => put(`/emi/${id}`, body),
  remove: (id) => del(`/emi/${id}`),
  markPaid: (id, body) => post(`/emi/${id}/mark-paid`, body),
  insights: () => get('/emi/insights'),
  statistics: () => get('/emi/statistics/summary')
};

/* ------------------------------------------------------------ budgets */

export const budgetsApi = {
  list: () => get('/budgets'),
  summary: () => get('/budgets/summary'),
  create: (body) => post('/budgets', body),
  update: (id, body) => put(`/budgets/${id}`, body),
  remove: (id) => del(`/budgets/${id}`)
};

/* -------------------------------------------------------------- bills */

export const billsApi = {
  list: (params) => get('/bill-reminders', { params }),
  create: (body) => post('/bill-reminders', body),
  update: (id, body) => put(`/bill-reminders/${id}`, body),
  remove: (id) => del(`/bill-reminders/${id}`),
  markPaid: (id, body) => post(`/bill-reminders/${id}/mark-paid`, body)
};

/* -------------------------------------------------------------- loans */

export const loansGivenApi = {
  list: (params) => get('/loans-given', { params }),
  summary: () => get('/loans-given/summary'),
  create: (body) => post('/loans-given', body),
  addRepayment: (id, body) => post(`/loans-given/${id}/repayment`, body),
  writeOff: (id, body) => post(`/loans-given/${id}/write-off`, body)
};

export const personalLoansApi = {
  list: (params) => get('/personal-loans', { params }),
  summary: () => get('/personal-loans/summary'),
  create: (body) => post('/personal-loans', body),
  addRepayment: (id, body) => post(`/personal-loans/${id}/repayment`, body),
  markRepaid: (id) => post(`/personal-loans/${id}/mark-repaid`, {})
};

/* -------------------------------------------------------- investments */

export const investmentsApi = {
  list: (params) => get('/investments', { params }),
  portfolio: () => getCached('/investments/portfolio'),
  create: (body) => post('/investments', body),
  update: (id, body) => put(`/investments/${id}`, body),
  remove: (id) => del(`/investments/${id}`),
  syncPrices: () => post('/investments/sync-prices', {})
};

export const netWorthApi = {
  current: () => getCached('/networth'),
  history: (params) => get('/networth/history', { params })
};

/* -------------------------------------------------------------- goals */

export const goalsApi = {
  list: () => get('/goals'),
  summary: () => get('/goals/summary'),
  create: (body) => post('/goals', body),
  update: (id, body) => put(`/goals/${id}`, body),
  remove: (id) => del(`/goals/${id}`),
  contribute: (id, body) => post(`/goals/${id}/contribute`, body)
};

/* ----------------------------------------------------------- nominees */

export const nomineesApi = {
  list: (params) => get('/nominees', { params }),
  shareValidation: () => get('/nominees/share-validation'),
  create: (body) => post('/nominees', body),
  update: (id, body) => put(`/nominees/${id}`, body),
  remove: (id) => del(`/nominees/${id}`)
};

/* ----------------------------------------------------------- insights */

export const insightsApi = {
  dashboard: () => getCached('/insights/dashboard'),
  categories: (params) => get('/analytics/categories', { params }),
  trends: (params) => get('/analytics/trends', { params }),
  health: () => get('/analytics/health')
};

/* ------------------------------------------------------------ profile */

export const profileApi = {
  get: () => get('/profile'),
  update: (body) => put('/profile', body),
  notifications: () => get('/notifications'),
  unreadCount: () => get('/notifications/unread-count'),
  markRead: (id) => patch(`/notifications/${id}/read`, {})
};

/* ----------------------------------------------------------- receipts */

export const receiptsApi = {
  /**
   * Upload a captured receipt for parsing. React Native's FormData needs the
   * { uri, name, type } shape rather than a Blob.
   */
  scan: (asset) => {
    const form = new FormData();
    form.append('receipt', {
      uri: asset.uri,
      name: asset.fileName || `receipt-${Date.now()}.jpg`,
      type: asset.mimeType || 'image/jpeg'
    });
    return post('/receipts/scan', form);
  },
  list: (params) => get('/receipts', { params })
};

export default {
  authApi,
  dashboardApi,
  transactionsApi,
  emiApi,
  budgetsApi,
  billsApi,
  loansGivenApi,
  personalLoansApi,
  investmentsApi,
  netWorthApi,
  goalsApi,
  nomineesApi,
  insightsApi,
  profileApi,
  receiptsApi
};
