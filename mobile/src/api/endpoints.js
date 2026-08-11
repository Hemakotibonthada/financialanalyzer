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
  forgotPassword: (email) => post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => post('/auth/reset-password', { token, password })
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
  categories: (months = 6) => get(`/analytics/categories/${months}`)
};

/* ---------------------------------------------------------------- emi */
/*
 * emiRoutes has no root list or create route. `GET /emi` and `POST /emi`
 * both 404; the list lives inside /emi/overview and creation is /emi/manual.
 */

export const emiApi = {
  overview: () => getCached('/emi/overview'),
  // Derived from /emi/overview, which returns { overview, activeEMIs, completedEMIs }.
  list: async () => {
    const data = await get('/emi/overview');
    return [...(data?.activeEMIs || []), ...(data?.completedEMIs || [])];
  },
  upcoming: (months = 12) => get('/emi/upcoming', { params: { months } }),
  detail: (id) => get(`/emi/${id}`),
  create: (body) => post('/emi/manual', body),
  update: (id, body) => put(`/emi/${id}`, body),
  remove: (id) => del(`/emi/${id}`),
  markPaid: (id, body) => post(`/emi/${id}/mark-paid`, body),
  foreclose: (id, body) => post(`/emi/${id}/foreclose`, body),
  foreclosureQuote: (emiId) => get(`/emi/foreclosure/${emiId}`),
  timeline: (params) => get('/emi/timeline', { params }),
  charts: () => get('/emi/charts'),
  byProvider: () => get('/emi/by-provider'),
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
  update: (id, body) => put(`/loans-given/${id}`, body),
  addRepayment: (id, body) => post(`/loans-given/${id}/repayment`, body),
  writeOff: (id, body) => put(`/loans-given/${id}/write-off`, body)
};

export const personalLoansApi = {
  list: (params) => get('/personal-loans', { params }),
  summary: () => get('/personal-loans/summary'),
  create: (body) => post('/personal-loans', body),
  update: (id, body) => put(`/personal-loans/${id}`, body),
  addRepayment: (id, body) => post(`/personal-loans/${id}/repayment`, body),
  markRepaid: (id, body = {}) => put(`/personal-loans/${id}/mark-repaid`, body)
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
  // netWorthRoutes has no root route; the current snapshot is /networth/latest.
  current: () => getCached('/networth/latest'),
  history: (params) => get('/networth/history', { params }),
  trend: (params) => get('/networth/trend', { params }),
  projections: (params) => get('/networth/projections', { params }),
  assets: () => get('/networth/assets'),
  snapshot: (body) => post('/networth/snapshot', body)
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
  // analyticsRoutes only exposes the :months forms; the bare paths 404.
  categories: (months = 6) => get(`/analytics/categories/${months}`),
  trends: (months = 6) => get(`/analytics/trends/${months}`),
  health: () => get('/analytics/health'),
  recommendations: () => get('/analytics/recommendations'),
  patterns: () => get('/analytics/patterns'),
  anomalies: () => get('/analytics/advanced/anomalies'),
  forecast: () => get('/analytics/advanced/forecast'),
  healthScore: () => get('/analytics/advanced/health-score'),
  savingsOpportunities: () => get('/analytics/advanced/savings-opportunities')
};

/* ------------------------------------------------------------ profile */

export const profileApi = {
  get: () => get('/profile'),
  // profileRoutes exposes GET '/' and POST '/' - there is no PUT '/'.
  update: (body) => post('/profile', body),
  updatePreferences: (body) => put('/profile/preferences', body),
  changePassword: (currentPassword, newPassword) =>
    put('/auth/password', { currentPassword, newPassword }),
  signOutAllDevices: () => post('/auth/revoke-all', {}),
  notifications: (params) => get('/notifications', { params }),
  unreadCount: () => get('/notifications/unread-count'),
  // notificationRoutes uses PUT for this, not PATCH.
  markRead: (id) => put(`/notifications/${id}/read`, {})
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
  list: (params) => get('/receipts', { params }),
  detail: (id) => get(`/receipts/${id}`),
  analytics: (params) => get('/receipts/analytics', { params }),
  update: (id, body) => put(`/receipts/${id}`, body),
  remove: (id) => del(`/receipts/${id}`),
  batch: (body) => post('/receipts/batch', body)
};

/* ------------------------------------------------------ bank accounts */

export const bankAccountsApi = {
  list: () => get('/bank-accounts'),
  detail: (id) => get(`/bank-accounts/${id}`),
  totalBalance: () => getCached('/bank-accounts/total-balance'),
  analytics: () => get('/bank-accounts/analytics'),
  create: (body) => post('/bank-accounts', body),
  update: (id, body) => put(`/bank-accounts/${id}`, body),
  remove: (id) => del(`/bank-accounts/${id}`),
  transfer: (body) => post('/bank-accounts/transfer', body)
};

/* -------------------------------------------------- credit card bills */

export const creditCardsApi = {
  bills: (params) => get('/cc-bills', { params }),
  summary: () => getCached('/cc-bills/summary'),
  cards: () => get('/cc-bills/cards'),
  detail: (id) => get(`/cc-bills/${id}`),
  create: (body) => post('/cc-bills', body),
  update: (id, body) => put(`/cc-bills/${id}`, body),
  remove: (id) => del(`/cc-bills/${id}`),
  pay: (id, body) => post(`/cc-bills/${id}/pay`, body),
  syncGmail: () => post('/cc-bills/sync-gmail', {}),
  spendingAnalytics: (params) => get('/cc-bills/analytics/spending', { params })
};

/* -------------------------------------------- recurring transactions */

export const recurringApi = {
  detect: (params) => get('/recurring/detect', { params }),
  predictions: () => get('/recurring/predictions'),
  statistics: () => get('/recurring/statistics'),
  pattern: (patternId) => get(`/recurring/patterns/${patternId}`),
  mark: (body) => post('/recurring/mark', body),
  autoCategorize: (body) => post('/recurring/auto-categorize', body)
};

/* ------------------------------------------------------ subscriptions */

export const subscriptionsApi = {
  list: (params) => get('/subscriptions', { params }),
  detail: (id) => get(`/subscriptions/${id}`),
  summary: () => getCached('/subscriptions/dashboard/summary'),
  create: (body) => post('/subscriptions', body),
  update: (id, body) => put(`/subscriptions/${id}`, body),
  remove: (id) => del(`/subscriptions/${id}`),
  projectedCost: (id) => get(`/subscriptions/${id}/projected-cost`),
  assessUtilization: (id, body) => post(`/subscriptions/${id}/assess-utilization`, body),
  renewalAlerts: () => get('/subscriptions/alerts/renewals'),
  unusedAlerts: () => get('/subscriptions/alerts/unused')
};

/* ---------------------------------------------------- split expenses */

export const splitExpensesApi = {
  groups: () => get('/split-expenses/groups'),
  createGroup: (body) => post('/split-expenses/groups', body),
  addMember: (id, body) => post(`/split-expenses/groups/${id}/members`, body),
  removeMember: (id, memberId) => del(`/split-expenses/groups/${id}/members/${memberId}`),
  expenses: (id) => get(`/split-expenses/groups/${id}/expenses`),
  addExpense: (id, body) => post(`/split-expenses/groups/${id}/expenses`, body),
  removeExpense: (id, expenseId) => del(`/split-expenses/groups/${id}/expenses/${expenseId}`),
  balances: (id) => get(`/split-expenses/groups/${id}/balances`),
  settlements: (id) => get(`/split-expenses/groups/${id}/settlements`)
};

/* ---------------------------------------------------------- insurance */

export const insuranceApi = {
  list: (params) => get('/insurance', { params }),
  detail: (id) => get(`/insurance/${id}`),
  create: (body) => post('/insurance', body),
  update: (id, body) => put(`/insurance/${id}`, body),
  remove: (id) => del(`/insurance/${id}`),
  addPremium: (id, body) => post(`/insurance/${id}/premiums`, body),
  fileClaim: (id, body) => post(`/insurance/${id}/claims`, body),
  updateClaim: (id, claimId, body) => put(`/insurance/${id}/claims/${claimId}`, body),
  returns: (id) => get(`/insurance/${id}/returns`),
  riskAssessment: (id, body) => post(`/insurance/${id}/risk-assessment`, body),
  expiring: () => get('/insurance/alerts/expiring'),
  premiumsDue: () => get('/insurance/alerts/premiums-due'),
  coverageAnalysis: () => get('/insurance/analysis/coverage')
};

/* ---------------------------------------------------------------- tax */

export const taxApi = {
  list: (params) => get('/tax', { params }),
  detail: (id) => get(`/tax/${id}`),
  create: (body) => post('/tax', body),
  update: (id, body) => put(`/tax/${id}`, body),
  remove: (id) => del(`/tax/${id}`),
  calculate: (id, body) => post(`/tax/${id}/calculate`, body),
  optimize: (id, body) => post(`/tax/${id}/optimize`, body),
  compareRegimes: (id, body) => post(`/tax/${id}/compare-regimes`, body),
  summary: (assessmentYear) => get(`/tax/summary/${assessmentYear}`)
};

/* --------------------------------------------------------- retirement */

export const retirementApi = {
  list: () => get('/retirement'),
  detail: (id) => get(`/retirement/${id}`),
  summary: () => getCached('/retirement/dashboard/summary'),
  create: (body) => post('/retirement', body),
  update: (id, body) => put(`/retirement/${id}`, body),
  remove: (id) => del(`/retirement/${id}`),
  calculateCorpus: (id, body) => post(`/retirement/${id}/calculate-corpus`, body),
  calculateSavings: (id, body) => post(`/retirement/${id}/calculate-savings`, body),
  projections: (id, body) => post(`/retirement/${id}/projections`, body),
  scenarios: (id, body) => post(`/retirement/${id}/scenarios`, body),
  assessRisks: (id, body) => post(`/retirement/${id}/assess-risks`, body),
  addInvestment: (id, body) => post(`/retirement/${id}/investments`, body),
  removeInvestment: (id, investmentId) => del(`/retirement/${id}/investments/${investmentId}`)
};

/* ------------------------------------------------------- credit score */

export const creditApi = {
  profile: () => getCached('/real-cibil/profile'),
  updateProfile: (body) => post('/real-cibil/update-profile', body),
  analytics: () => get('/borrowing-intelligence/analytics'),
  healthScore: () => get('/borrowing-intelligence/health-score'),
  predictions: () => get('/borrowing-intelligence/predictions'),
  recommendations: () => get('/borrowing-intelligence/recommendations'),
  borrowingInsights: () => get('/borrowing-intelligence/insights'),
  risk: () => get('/borrowing-intelligence/risk')
};

/* ---------------------------------------------------------- documents */

export const documentsApi = {
  list: (params) => get('/documents', { params }),
  remove: (id) => del(`/documents/${id}`),
  process: (id) => post(`/documents/${id}/process`, {}),
  retry: (id) => post(`/documents/${id}/retry`, {}),
  transactions: (id) => get(`/documents/${id}/transactions`),
  batchProcess: (body) => post('/documents/batch-process', body),
  upload: (asset) => {
    const form = new FormData();
    form.append('document', {
      uri: asset.uri,
      name: asset.name || asset.fileName || `document-${Date.now()}.pdf`,
      type: asset.mimeType || 'application/pdf'
    });
    return post('/documents/upload', form);
  }
};

/* ------------------------------------------------- reports and export */

export const reportsApi = {
  templates: () => get('/financial-reports/templates'),
  summary: (params) => get('/financial-reports/summary', { params }),
  generate: (body) => post('/financial-reports/generate', body),
  schedule: (body) => post('/financial-reports/schedule', body),
  exportTransactions: (body) => post('/export/transactions/excel', body),
  exportEmi: () => get('/export/emi/excel'),
  exportAll: () => get('/export/all/excel')
};

/* ------------------------------------------------------------- search */

export const searchApi = {
  global: (q, params) => get('/search/global', { params: { q, ...params } }),
  transactions: (q, params) => get('/search/transactions', { params: { q, ...params } }),
  suggestions: (q) => get('/search/suggestions', { params: { q } }),
  popular: () => get('/search/popular'),
  advanced: (body) => post('/search/advanced', body),
  quick: (type, params) => get(`/search/quick/${type}`, { params })
};

/* ------------------------------------------------------ notifications */

export const notificationsApi = {
  list: (params) => get('/notifications', { params }),
  unreadCount: () => get('/notifications/unread-count'),
  stats: () => get('/notifications/stats'),
  preferences: () => get('/notifications/preferences'),
  updatePreferences: (body) => put('/notifications/preferences', body),
  markRead: (id) => put(`/notifications/${id}/read`, {}),
  markAllRead: () => put('/notifications/mark-all-read', {}),
  archive: (id) => put(`/notifications/${id}/archive`, {}),
  remove: (id) => del(`/notifications/${id}`)
};

/* --------------------------------------------------------------- chat */

export const chatApi = {
  send: (message, conversationId) =>
    post('/chat/message', conversationId ? { message, conversationId } : { message }),
  conversations: () => get('/chat/conversations'),
  conversation: (id) => get(`/chat/conversations/${id}`),
  removeConversation: (id) => del(`/chat/conversations/${id}`),
  suggestions: () => get('/chat/suggestions')
};

/* ------------------------------------------------------- achievements */

export const achievementsApi = {
  profile: () => get('/achievements/profile'),
  check: () => post('/achievements/check', {}),
  leaderboard: (params) => get('/achievements/leaderboard', { params }),
  challenges: () => get('/achievements/challenges'),
  daily: () => get('/achievements/daily')
};

/* ------------------------------------------------------------- family */

export const familyApi = {
  members: () => get('/family/members'),
  addMember: (body) => post('/family/members', body),
  updateMember: (id, body) => put(`/family/members/${id}`, body),
  removeMember: (id) => del(`/family/members/${id}`),
  budget: () => get('/family/budget'),
  spending: (params) => get('/family/spending', { params }),
  giveAllowance: (id, body) => post(`/family/allowance/${id}`, body)
};

/* ---------------------------------------------------- goal  tracking */

export const goalTrackingApi = {
  list: (params) => get('/goal-tracking', { params }),
  detail: (id) => get(`/goal-tracking/${id}`),
  statistics: () => get('/goal-tracking/statistics'),
  create: (body) => post('/goal-tracking', body),
  update: (id, body) => put(`/goal-tracking/${id}`, body),
  remove: (id) => del(`/goal-tracking/${id}`),
  addMilestone: (id, body) => post(`/goal-tracking/${id}/milestones`, body),
  updateProgress: (id, body) => patch(`/goal-tracking/${id}/progress`, body)
};

/* -------------------------------------------------- statement import */

export const statementsApi = {
  parse: (asset) => {
    const form = new FormData();
    form.append('statement', {
      uri: asset.uri,
      name: asset.name || asset.fileName || `statement-${Date.now()}.pdf`,
      type: asset.mimeType || 'application/pdf'
    });
    return post('/statements/parse', form);
  },
  import: (body) => post('/statements/import', body)
};

/* ------------------------------------------------------- legacy guard */
/*
 * The estate-settlement module. These endpoints act on a person's death and
 * on money owed to their family, so screens must never invent or assume
 * state: render exactly what the API returns, and surface refusals verbatim.
 */

export const dormancyApi = {
  list: (params) => get('/legacy/dormancy', { params }),
  detail: (id) => get(`/legacy/dormancy/${id}`),
  slaBreaches: () => get('/legacy/dormancy/sla-breaches'),
  inactivityReport: (userId) => get(`/legacy/dormancy/user/${userId}/inactivity-report`),
  scan: (body) => post('/legacy/dormancy/scan', body),
  open: (body) => post('/legacy/dormancy/open', body),
  assign: (id, body) => patch(`/legacy/dormancy/${id}/assign`, body),
  recordOutreach: (id, body) => post(`/legacy/dormancy/${id}/outreach`, body),
  resolveAlive: (id, body) => post(`/legacy/dormancy/${id}/resolve-alive`, body),
  escalate: (id, body) => post(`/legacy/dormancy/${id}/escalate`, body)
};

export const estateApi = {
  list: (params) => get('/legacy/estate', { params }),
  detail: (id) => get(`/legacy/estate/${id}`),
  create: (body) => post('/legacy/estate', body),
  proposeDeceased: (id, body) => post(`/legacy/estate/${id}/propose-deceased`, body),
  approveDeceased: (id, body) => post(`/legacy/estate/${id}/approve-deceased`, body),
  rejectDeceased: (id, body) => post(`/legacy/estate/${id}/reject-deceased`, body),
  revoke: (id, body) => post(`/legacy/estate/${id}/revoke`, body),
  addClaimant: (id, body) => post(`/legacy/estate/${id}/claimant`, body),
  discoverAssets: (id, body) => post(`/legacy/estate/${id}/discover-assets`, body),
  assets: (id) => get(`/legacy/estate/${id}/assets`),
  timeline: (id) => get(`/legacy/estate/${id}/timeline`),
  auditTrail: (id) => get(`/legacy/estate/${id}/audit-trail`),
  reviewDocument: (id, documentId, body) =>
    patch(`/legacy/estate/${id}/documents/${documentId}/review`, body),
  close: (id, body) => post(`/legacy/estate/${id}/close`, body),
  uploadDocument: (id, asset, fields = {}) => {
    const form = new FormData();
    form.append('document', {
      uri: asset.uri,
      name: asset.name || asset.fileName || `evidence-${Date.now()}.pdf`,
      type: asset.mimeType || 'application/pdf'
    });
    Object.entries(fields).forEach(([k, v]) => form.append(k, String(v)));
    return post(`/legacy/estate/${id}/documents`, form);
  }
};

export const claimsApi = {
  list: (params) => get('/legacy/claims', { params }),
  detail: (id) => get(`/legacy/claims/${id}`),
  playbook: (claimType) => get(`/legacy/claims/playbooks/${claimType}`),
  create: (body) => post('/legacy/claims', body),
  transition: (id, body) => patch(`/legacy/claims/${id}/transition`, body),
  addCorrespondence: (id, body) => post(`/legacy/claims/${id}/correspondence`, body),
  recordSettlement: (id, body) => post(`/legacy/claims/${id}/settlement`, body)
};

export const settlementApi = {
  list: (params) => get('/legacy/settlement', { params }),
  statement: (estateCaseId) => get(`/legacy/settlement/${estateCaseId}/statement`),
  compute: (estateCaseId, body) => post(`/legacy/settlement/${estateCaseId}/compute`, body),
  invoice: (estateCaseId, body) => post(`/legacy/settlement/${estateCaseId}/invoice`, body),
  recordPayment: (estateCaseId, body) => post(`/legacy/settlement/${estateCaseId}/payments`, body),
  waiver: (estateCaseId, body) => post(`/legacy/settlement/${estateCaseId}/waiver`, body)
};

export const nomineePortalApi = {
  case: () => get('/nominee-portal/case'),
  documents: () => get('/nominee-portal/documents'),
  timeline: () => get('/nominee-portal/timeline'),
  registerClaimant: (body) => post('/nominee-portal/claimant', body),
  giveConsent: (body) => post('/nominee-portal/consent', body),
  uploadDocument: (asset, fields = {}) => {
    const form = new FormData();
    form.append('document', {
      uri: asset.uri,
      name: asset.name || asset.fileName || `document-${Date.now()}.pdf`,
      type: asset.mimeType || 'application/pdf'
    });
    Object.entries(fields).forEach(([k, v]) => form.append(k, String(v)));
    return post('/nominee-portal/documents', form);
  }
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
  receiptsApi,
  bankAccountsApi,
  creditCardsApi,
  recurringApi,
  subscriptionsApi,
  splitExpensesApi,
  insuranceApi,
  taxApi,
  retirementApi,
  creditApi,
  documentsApi,
  reportsApi,
  searchApi,
  notificationsApi,
  chatApi,
  achievementsApi,
  familyApi,
  goalTrackingApi,
  statementsApi,
  dormancyApi,
  estateApi,
  claimsApi,
  settlementApi,
  nomineePortalApi
};
