import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
// Change this to your backend IP address when testing on physical device
// Example: const API_URL = 'http://192.168.1.100:5001/api';
const API_URL = __DEV__ 
  ? 'http://10.0.2.2:5001/api' // Android Emulator
  : 'https://your-production-api.com/api';

// For iOS Simulator, use: 'http://localhost:5001/api'
// For Physical Device, use your computer's IP: 'http://192.168.x.x:5001/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - Add token to requests
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const expiry = await AsyncStorage.getItem('token_expiry');
      
      if (token && expiry) {
        const expDate = new Date(expiry);
        const now = new Date();
        
        if (!isNaN(expDate.getTime()) && now <= expDate) {
          config.headers.Authorization = `Bearer ${token}`;
        } else {
          // Token expired - clear storage
          await AsyncStorage.multiRemove(['token', 'token_expiry', 'user']);
        }
      } else if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('[API] Error getting token:', error);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timeout. Please try again.';
    } else if (error.code === 'ERR_NETWORK') {
      error.message = 'Network error. Please check your connection.';
    } else if (!error.response) {
      error.message = 'Unable to connect to server.';
    }

    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['token', 'token_expiry', 'user']);
    } else if (error.response?.status === 503) {
      error.message = 'Service temporarily unavailable.';
    } else if (error.response?.status >= 500) {
      error.message = 'Server error. Please try again later.';
    }

    return Promise.reject(error);
  }
);

// Auth Services
export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  changePassword: (data) => api.put('/auth/password', data),
};

// Profile Services
export const profileService = {
  getProfile: () => api.get('/profile'),
  createOrUpdateProfile: (data) => api.post('/profile', data),
  updatePreferences: (data) => api.put('/profile/preferences', data),
  setBudget: (data) => api.put('/profile/budget', data),
  setSavingsGoal: (data) => api.put('/profile/savings-goal', data),
  addCategory: (data) => api.post('/profile/categories', data),
  removeCategory: (index) => api.delete(`/profile/categories/${index}`),
  deleteProfile: () => api.delete('/profile'),
};

// Financial Services
export const financialService = {
  analyzeDocuments: (formData) => api.post('/financial/analyze', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getReports: (params) => api.get('/financial/reports', { params }),
  getReport: (id) => api.get(`/financial/reports/${id}`),
  getReportStatus: (id) => api.get(`/financial/reports/${id}/status`),
  deleteReport: (id) => api.delete(`/financial/reports/${id}`),
  getCharts: (reportId) => api.get(`/financial/charts/${reportId}`),
  getInsights: (reportId) => api.get(`/financial/insights/${reportId}`),
  getHealthScore: () => api.get('/financial/health-score'),
};

// Dashboard Services
export const dashboardService = {
  getDashboard: () => api.get('/dashboard'),
  getOverview: () => api.get('/dashboard/overview'),
};

// EMI Services
export const emiService = {
  getEMIs: (params) => api.get('/emis', { params }),
  getEMI: (id) => api.get(`/emis/${id}`),
  createEMI: (data) => api.post('/emis', data),
  updateEMI: (id, data) => api.put(`/emis/${id}`, data),
  deleteEMI: (id) => api.delete(`/emis/${id}`),
  markAsPaid: (id) => api.post(`/emis/${id}/mark-paid`),
};

// Bill Reminder Services
export const billReminderService = {
  getBills: (params) => api.get('/bill-reminders', { params }),
  getBill: (id) => api.get(`/bill-reminders/${id}`),
  getDashboard: () => api.get('/bill-reminders/dashboard'),
  createBill: (data) => api.post('/bill-reminders', data),
  updateBill: (id, data) => api.put(`/bill-reminders/${id}`, data),
  deleteBill: (id) => api.delete(`/bill-reminders/${id}`),
  approveBill: (id, data) => api.post(`/bill-reminders/${id}/approve`, data),
  rejectBill: (id, data) => api.post(`/bill-reminders/${id}/reject`, data),
  markAsPaid: (id, data) => api.post(`/bill-reminders/${id}/mark-paid`, data),
};

// Investment Services
export const investmentService = {
  getInvestments: (params) => api.get('/investments', { params }),
  getInvestment: (id) => api.get(`/investments/${id}`),
  createInvestment: (data) => api.post('/investments', data),
  updateInvestment: (id, data) => api.put(`/investments/${id}`, data),
  deleteInvestment: (id) => api.delete(`/investments/${id}`),
  getDashboard: () => api.get('/investments/dashboard'),
};

// Goals Services
export const goalsService = {
  getGoals: (params) => api.get('/goals', { params }),
  getGoal: (id) => api.get(`/goals/${id}`),
  createGoal: (data) => api.post('/goals', data),
  updateGoal: (id, data) => api.put(`/goals/${id}`, data),
  deleteGoal: (id) => api.delete(`/goals/${id}`),
  addContribution: (id, data) => api.post(`/goals/${id}/contribute`, data),
};

// Net Worth Services
export const netWorthService = {
  getNetWorth: () => api.get('/net-worth'),
  getHistory: (params) => api.get('/net-worth/history', { params }),
  updateAssets: (data) => api.put('/net-worth/assets', data),
  updateLiabilities: (data) => api.put('/net-worth/liabilities', data),
};

// Transaction Services
export const transactionService = {
  getTransactions: (params) => api.get('/transactions', { params }),
  getTransaction: (id) => api.get(`/transactions/${id}`),
  createTransaction: (data) => api.post('/transactions', data),
  updateTransaction: (id, data) => api.put(`/transactions/${id}`, data),
  deleteTransaction: (id) => api.delete(`/transactions/${id}`),
  getCategories: () => api.get('/transactions/categories'),
};

// Notification Services
export const notificationService = {
  getNotifications: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
  getUnreadCount: () => api.get('/notifications/unread-count'),
};

export { API_URL };
export default api;
