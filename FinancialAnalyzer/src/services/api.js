import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Update this to your backend URL
const API_BASE_URL = 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      // You can navigate to login screen here if needed
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (passwords) => api.put('/auth/change-password', passwords),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
};

// Company Expenses endpoints
export const expensesAPI = {
  getAll: (params) => api.get('/company-expenses', { params }),
  getById: (id) => api.get(`/company-expenses/${id}`),
  create: (data) => api.post('/company-expenses', data),
  update: (id, data) => api.put(`/company-expenses/${id}`, data),
  delete: (id) => api.delete(`/company-expenses/${id}`),
  getAnalytics: (params) => api.get('/company-expenses/analytics', { params }),
  generateReport: (data) => api.post('/company-expenses/reports/generate', data),
};

// EMI endpoints
export const emiAPI = {
  getAll: (params) => api.get('/emi', { params }),
  getById: (id) => api.get(`/emi/${id}`),
  create: (data) => api.post('/emi', data),
  update: (id, data) => api.put(`/emi/${id}`, data),
  delete: (id) => api.delete(`/emi/${id}`),
  getUpcoming: () => api.get('/emi/upcoming'),
  recordPayment: (id, data) => api.post(`/emi/${id}/payment`, data),
  getHealthScore: () => api.get('/emi/health-score'),
  getMonthlyTrends: (months) => api.get('/emi/monthly-trends', { params: { months } }),
  exportData: (format) => api.post('/emi/export', { format }),
};

// Lender (Loans Given) endpoints
export const lenderAPI = {
  getAll: (params) => api.get('/lender', { params }),
  getById: (id) => api.get(`/lender/${id}`),
  create: (data) => api.post('/lender', data),
  update: (id, data) => api.put(`/lender/${id}`, data),
  delete: (id) => api.delete(`/lender/${id}`),
  getDashboard: () => api.get('/lender/dashboard'),
  recordRepayment: (id, data) => api.post(`/lender/${id}/repayment`, data),
  exportData: (format) => api.post('/lender/export', { format }),
};

// Bill Reminders endpoints
export const billRemindersAPI = {
  getAll: (params) => api.get('/bill-reminders', { params }),
  getById: (id) => api.get(`/bill-reminders/${id}`),
  create: (data) => api.post('/bill-reminders', data),
  update: (id, data) => api.put(`/bill-reminders/${id}`, data),
  delete: (id) => api.delete(`/bill-reminders/${id}`),
  markAsPaid: (id) => api.post(`/bill-reminders/${id}/mark-paid`),
  getUpcoming: () => api.get('/bill-reminders/upcoming'),
};

// Financial Health endpoints
export const financialHealthAPI = {
  getDashboard: () => api.get('/financial-health/dashboard'),
  getInsights: () => api.get('/financial-health/insights'),
  getRecommendations: () => api.get('/financial-health/recommendations'),
};

// Reports endpoints
export const reportsAPI = {
  generateMonthly: (month, year) => api.post('/reports/monthly', { month, year }),
  generateCustom: (params) => api.post('/reports/custom', params),
  getHistory: () => api.get('/reports/history'),
};
