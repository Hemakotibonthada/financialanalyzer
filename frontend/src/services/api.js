import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // If sending FormData, remove Content-Type to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
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
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
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
      'Content-Type': 'multipart/form-data'
    }
  }),
  getReports: (params) => api.get('/financial/reports', { params }),
  getReport: (id) => api.get(`/financial/reports/${id}`),
  getReportStatus: (id) => api.get(`/financial/reports/${id}/status`),
  deleteReport: (id) => api.delete(`/financial/reports/${id}`),
  getCharts: (reportId) => api.get(`/financial/charts/${reportId}`),
  getInsights: (reportId) => api.get(`/financial/insights/${reportId}`),
  getHealthScore: () => api.get('/financial/health-score'),
  exportReport: (reportId, format = 'json') => api.get(`/financial/export/${reportId}`, {
    params: { format },
    responseType: format === 'csv' ? 'blob' : 'json'
  }),
};

export default api;
