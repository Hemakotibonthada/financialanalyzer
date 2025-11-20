import axios from 'axios';
import { API_URL } from './constants';

const getAuthConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

// User Profile API
export const fetchUserProfile = async () => {
  const response = await axios.get(`${API_URL}/profile`, getAuthConfig());
  return response.data.data;
};

// EMI Overview API
export const fetchOverview = async () => {
  const response = await axios.get(`${API_URL}/emi/overview`, getAuthConfig());
  return response.data.data;
};

// Upcoming Payments API
export const fetchUpcomingPayments = async (months = 12) => {
  const response = await axios.get(`${API_URL}/emi/upcoming?months=${months}`, getAuthConfig());
  return response.data.data;
};

// Charts Data API
export const fetchCharts = async () => {
  const response = await axios.get(`${API_URL}/emi/charts`, getAuthConfig());
  return response.data.data;
};

// Insights API
export const fetchInsights = async () => {
  const response = await axios.get(`${API_URL}/emi/insights`, getAuthConfig());
  return response.data.data;
};

// Monthly Trends API
export const fetchMonthlyTrends = async (months = 6) => {
  const response = await axios.get(`${API_URL}/emi/monthly-trends?months=${months}`, getAuthConfig());
  return response.data.data;
};

// Export Monthly Trends API
export const exportMonthlyTrends = async (format) => {
  const response = await axios.get(`${API_URL}/emi/export-monthly-trends?format=${format}`, {
    ...getAuthConfig(),
    responseType: 'blob'
  });
  return response.data;
};

// Sync Statements API
export const syncStatements = async (maxResults = 50) => {
  const response = await axios.post(
    `${API_URL}/emi/sync-statements`,
    { maxResults },
    getAuthConfig()
  );
  return response.data;
};

// Export Report API
export const exportReport = async (format, dateRange) => {
  const response = await axios.post(
    `${API_URL}/emi/export`,
    { format, ...dateRange },
    {
      ...getAuthConfig(),
      responseType: 'blob'
    }
  );
  return response.data;
};

// Manual EMI APIs
export const createManualEMI = async (emiData) => {
  const response = await axios.post(`${API_URL}/emi/manual`, emiData, getAuthConfig());
  return response.data;
};

export const deleteEMI = async (emiId) => {
  const response = await axios.delete(`${API_URL}/emi/${emiId}`, getAuthConfig());
  return response.data;
};

export const markPaymentAsPaid = async (emiId, installmentNumber) => {
  const response = await axios.post(
    `${API_URL}/emi/${emiId}/mark-paid`,
    { installmentNumber },
    getAuthConfig()
  );
  return response.data;
};

// Loans Given APIs
export const fetchLoansGiven = async () => {
  const response = await axios.get(`${API_URL}/loans-given`, getAuthConfig());
  return response.data.data;
};

export const createOrUpdateLoanGiven = async (loanData, loanId = null) => {
  if (loanId) {
    const response = await axios.put(`${API_URL}/loans-given/${loanId}`, loanData, getAuthConfig());
    return response.data;
  } else {
    const response = await axios.post(`${API_URL}/loans-given`, loanData, getAuthConfig());
    return response.data;
  }
};

export const addRepaymentToLoan = async (loanId, repaymentData) => {
  const response = await axios.post(
    `${API_URL}/loans-given/${loanId}/repayment`,
    repaymentData,
    getAuthConfig()
  );
  return response.data;
};

export const deleteLoanGiven = async (loanId) => {
  const response = await axios.delete(`${API_URL}/loans-given/${loanId}`, getAuthConfig());
  return response.data;
};

export const writeOffLoan = async (loanId) => {
  const response = await axios.post(`${API_URL}/loans-given/${loanId}/write-off`, {}, getAuthConfig());
  return response.data;
};

// Personal Loans APIs
export const fetchPersonalLoans = async () => {
  const response = await axios.get(`${API_URL}/personal-loans`, getAuthConfig());
  return response.data.data;
};

export const createOrUpdatePersonalLoan = async (loanData, loanId = null) => {
  if (loanId) {
    const response = await axios.put(`${API_URL}/personal-loans/${loanId}`, loanData, getAuthConfig());
    return response.data;
  } else {
    const response = await axios.post(`${API_URL}/personal-loans`, loanData, getAuthConfig());
    return response.data;
  }
};

export const addPersonalLoanRepayment = async (loanId, repaymentData) => {
  const response = await axios.post(
    `${API_URL}/personal-loans/${loanId}/repayment`,
    repaymentData,
    getAuthConfig()
  );
  return response.data;
};

export const markPersonalLoanAsRepaid = async (loanId) => {
  const response = await axios.post(`${API_URL}/personal-loans/${loanId}/mark-repaid`, {}, getAuthConfig());
  return response.data;
};

export const deletePersonalLoan = async (loanId) => {
  const response = await axios.delete(`${API_URL}/personal-loans/${loanId}`, getAuthConfig());
  return response.data;
};
