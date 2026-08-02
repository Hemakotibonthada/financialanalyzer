import api from "./api";

const uploadConfig = { headers: { "Content-Type": "multipart/form-data" } };

export const nomineeService = {
  list: (params) => api.get("/nominees", { params }),
  get: (id) => api.get(`/nominees/${id}`),
  create: (data) => api.post("/nominees", data),
  update: (id, data) => api.put(`/nominees/${id}`, data),
  remove: (id) => api.delete(`/nominees/${id}`),
  verify: (id, data) => api.post(`/nominees/${id}/verify`, data),
  validateShareTotals: () => api.get("/nominees/validate-shares"),
  rebalanceShares: (data) => api.post("/nominees/rebalance-shares", data),
  uploadDocument: (id, formData) => api.post(`/nominees/${id}/documents`, formData, uploadConfig),
};

export const dormancyService = {
  getQueue: (params) => api.get("/legacy/dormancy", { params }),
  getCase: (id) => api.get(`/legacy/dormancy/${id}`),
  scan: (data) => api.post("/legacy/dormancy/scan", data),
  classifyUser: (userId) => api.get(`/legacy/dormancy/users/${userId}/classification`),
  openCase: (data) => api.post("/legacy/dormancy/cases", data),
  assign: (id, data) => api.post(`/legacy/dormancy/${id}/assign`, data),
  recordOutreach: (id, data) => api.post(`/legacy/dormancy/${id}/outreach`, data),
  escalateToEstate: (id, data) => api.post(`/legacy/dormancy/${id}/escalate-estate`, data),
  resolveAlive: (id, data) => api.post(`/legacy/dormancy/${id}/resolve-alive`, data),
  getSlaBreaches: (params) => api.get("/legacy/dormancy/sla-breaches", { params }),
  getInactivityReport: (userId) => api.get(`/legacy/dormancy/users/${userId}/inactivity-report`),
};

export const estateCaseService = {
  list: (params) => api.get("/legacy/estate", { params }),
  get: (id) => api.get(`/legacy/estate/${id}`),
  initiate: (data) => api.post("/legacy/estate", data),
  proposeDeceased: (id, data) => api.post(`/legacy/estate/${id}/propose-deceased`, data),
  approveDeceased: (id, data) => api.post(`/legacy/estate/${id}/approve-deceased`, data),
  rejectDeceased: (id, data) => api.post(`/legacy/estate/${id}/reject-deceased`, data),
  revoke: (id, data) => api.post(`/legacy/estate/${id}/revoke`, data),
  attachClaimant: (id, data) => api.post(`/legacy/estate/${id}/claimant`, data),
  close: (id, data) => api.post(`/legacy/estate/${id}/close`, data),
  discoverAssets: (id) => api.post(`/legacy/estate/${id}/discover-assets`),
  listAssets: (id, params) => api.get(`/legacy/estate/${id}/assets`, { params }),
  createAsset: (id, data) => api.post(`/legacy/estate/${id}/assets`, data),
  updateAsset: (caseId, assetId, data) =>
    api.put(`/legacy/estate/${caseId}/assets/${assetId}`, data),
  uploadDocument: (id, formData) =>
    api.post(`/legacy/estate/${id}/documents`, formData, uploadConfig),
  getAuditTrail: (id) => api.get(`/legacy/estate/${id}/audit`),
  verifyAudit: (id) => api.get(`/legacy/estate/${id}/audit/verify`),
};

export const recoveryClaimService = {
  list: (params) => api.get("/legacy/claims", { params }),
  get: (id) => api.get(`/legacy/claims/${id}`),
  create: (data) => api.post("/legacy/claims", data),
  update: (id, data) => api.put(`/legacy/claims/${id}`, data),
  transition: (id, data) => api.post(`/legacy/claims/${id}/transition`, data),
  addCorrespondence: (id, data) => api.post(`/legacy/claims/${id}/correspondence`, data),
  recordSettlement: (id, data) => api.post(`/legacy/claims/${id}/settlement`, data),
  uploadDocument: (id, formData) =>
    api.post(`/legacy/claims/${id}/documents`, formData, uploadConfig),
  getPlaybook: (claimType) => api.get(`/legacy/claims/playbooks/${claimType}`),
};

export const settlementService = {
  list: (params) => api.get("/legacy/settlement", { params }),
  computeFee: (estateCaseId) => api.post(`/legacy/settlement/${estateCaseId}/compute`),
  issueInvoice: (estateCaseId, data) =>
    api.post(`/legacy/settlement/${estateCaseId}/invoice`, data),
  getStatement: (estateCaseId) => api.get(`/legacy/settlement/${estateCaseId}/statement`),
  recordPayment: (invoiceId, data) =>
    api.post(`/legacy/settlement/invoices/${invoiceId}/payments`, data),
  waive: (invoiceId, data) => api.post(`/legacy/settlement/invoices/${invoiceId}/waive`, data),
};

export const legacyAdminService = {
  getDashboard: (params) => api.get("/legacy/admin/dashboard", { params }),
  getAnalytics: (params) => api.get("/legacy/admin/analytics", { params }),
  getPolicies: () => api.get("/legacy/admin/policies"),
  getPolicy: (id) => api.get(`/legacy/admin/policies/${id}`),
  createPolicy: (data) => api.post("/legacy/admin/policies", data),
  updatePolicy: (id, data) => api.put(`/legacy/admin/policies/${id}`, data),
  activatePolicy: (id, data) => api.post(`/legacy/admin/policies/${id}/activate`, data),
  comparePolicies: (leftId, rightId) =>
    api.get("/legacy/admin/policies/compare", { params: { leftId, rightId } }),
  getReports: (params) => api.get("/legacy/admin/reports", { params }),
  exportCsv: (params) => api.get("/legacy/admin/reports/export", { params, responseType: "blob" }),
  getScheduler: () => api.get("/legacy/admin/scheduler"),
  startScheduler: () => api.post("/legacy/admin/scheduler/start"),
  stopScheduler: () => api.post("/legacy/admin/scheduler/stop"),
};

export const nomineePortalService = {
  getSession: (token) => api.get("/nominee-portal", { params: { token } }),
  getCase: (token) => api.get("/nominee-portal/case", { params: { token } }),
  uploadDocument: (token, formData) =>
    api.post("/nominee-portal/documents", formData, { ...uploadConfig, params: { token } }),
  submitChecklist: (token, data) =>
    api.post("/nominee-portal/checklist", data, { params: { token } }),
  sendMessage: (token, data) => api.post("/nominee-portal/messages", data, { params: { token } }),
  acknowledgeFee: (token, data) =>
    api.post("/nominee-portal/fee-acknowledgement", data, { params: { token } }),
};

export default {
  nomineeService,
  dormancyService,
  estateCaseService,
  recoveryClaimService,
  settlementService,
  legacyAdminService,
  nomineePortalService,
};
