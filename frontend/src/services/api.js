import axios from 'axios';

// Compute API URL dynamically:
// - If VITE_API_URL is provided (override), use it.
// - Otherwise construct from the current hostname so mobile devices
//   that load the frontend from the laptop's IP will call the laptop backend.
const computeApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;

  // If developer explicitly set VITE_API_URL to something other than localhost, use it
  if (envUrl && !/localhost|127\.0\.0\.1/.test(envUrl)) {
    return envUrl;
  }

  // Check if deployed on Firebase Hosting
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Firebase Hosting detection
    if (hostname.includes('firebaseapp.com') || hostname.includes('web.app')) {
      // Use Cloud Functions API URL for Mumbai region
      return 'https://asia-south1-finserveassist.cloudfunctions.net/api';
    }
    
    // If VITE_API_URL points to localhost (common dev default), prefer using
    // the host serving the frontend when available (so mobile devices call
    // the laptop backend IP), otherwise fall back to the env value.
    const pageHost = hostname || 'localhost';
    if (pageHost && !/localhost|127\.0\.0\.1/.test(pageHost)) {
      return `http://${pageHost}:5001/api`;
    }
  }

  // Fallback to env or localhost
  return envUrl || 'http://localhost:5001/api';
};

const API_URL = computeApiUrl();

// Host without the trailing /api - useful for code that expects the base host
const API_HOST = API_URL.replace(/\/api\/?$/, '');

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 seconds timeout
});

// Retry configuration for transient failures
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,           // 1 second base delay
  retryStatusCodes: [408, 429, 500, 502, 503, 504],
};

// Retry interceptor - automatically retry failed requests for transient errors
api.interceptors.response.use(undefined, async (error) => {
  const config = error.config;
  
  // Don't retry if explicitly disabled or if it's a mutation (POST/PUT/DELETE)
  if (!config || config.__retryCount >= RETRY_CONFIG.maxRetries) {
    return Promise.reject(error);
  }
  
  // Only retry on specific status codes or network errors
  const shouldRetry = 
    !error.response || // Network error
    RETRY_CONFIG.retryStatusCodes.includes(error.response.status);
  
  // Don't retry auth endpoints or mutations
  const isAuthEndpoint = /\/auth\//.test(config.url);
  const isSafe = (config.method === 'get' || config.method === 'head') && !isAuthEndpoint;
  
  if (shouldRetry && isSafe) {
    config.__retryCount = (config.__retryCount || 0) + 1;
    
    // Exponential backoff with jitter
    const delay = RETRY_CONFIG.retryDelay * Math.pow(2, config.__retryCount - 1) 
                  + Math.random() * 500;
    
    if (import.meta.env.DEV) {
      console.debug(`[api] Retry ${config.__retryCount}/${RETRY_CONFIG.maxRetries} for ${config.url} in ${Math.round(delay)}ms`);
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return api(config);
  }
  
  return Promise.reject(error);
});

// Request interceptor - Add token to requests
api.interceptors.request.use(
  (config) => {
    // First check localStorage for valid token with expiry
    let token = null;
    let tokenSource = '';
    try {
      const lsToken = localStorage.getItem('token');
      const expiry = localStorage.getItem('token_expiry');
      
      if (lsToken && expiry) {
        const expDate = new Date(expiry);
        const now = new Date();
        
        // Debug token state at runtime
        if (import.meta.env.DEV) {
          console.debug('[api] Request interceptor - checking token:', {
            url: config.url,
            'ls.token?': !!lsToken,
            'ls.expiry?': !!expiry,
            expDate: expDate.toISOString(),
            now: now.toISOString(),
            isExpired: isNaN(expDate.getTime()) || now > expDate
          });
        }
        
        if (!isNaN(expDate.getTime()) && now <= expDate) {
          // Valid unexpired token
          token = lsToken;
          tokenSource = 'localStorage';
        } else {
          // Invalid or expired - clear localStorage
          localStorage.removeItem('token');
          localStorage.removeItem('token_expiry');
          localStorage.removeItem('user');
        }
      } else if (lsToken) {
        // Token without expiry - treat as persistent
        token = lsToken;
        tokenSource = 'localStorage (no expiry)';
      }
      
      // Fallback to sessionStorage if needed
      if (!token) {
        token = sessionStorage.getItem('token');
        if (token) tokenSource = 'sessionStorage';
      }
      
    } catch (e) {
      console.error('[api] Error accessing storage:', e);
      // Last resort: try direct localStorage access
      token = localStorage.getItem('token') || sessionStorage.getItem('token');
      tokenSource = 'direct fallback';
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (import.meta.env.DEV) {
        console.debug(`[api] Using token from ${tokenSource} for ${config.url}`);
      }
    } else if (import.meta.env.DEV && !config.url.includes('/auth/')) {
      console.debug(`[api] No token available for ${config.url}`);
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
    // Handle network errors
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout');
      error.message = 'Request timeout. Please try again.';
    } else if (error.code === 'ERR_NETWORK') {
      console.error('Network error - Backend may be offline');
      error.message = 'Network error. Please check your connection and ensure the backend server is running.';
    } else if (!error.response) {
      console.error('No response from server');
      error.message = 'Unable to connect to server. Please try again.';
    }

    // Handle specific HTTP status codes
    if (error.response?.status === 401) {
      // Unauthorized - clear token (avoid full-page reload race condition with React Router)
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('token_expiry');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      // Dispatch a custom event so AuthContext can handle the redirect via React Router
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    } else if (error.response?.status === 503) {
      error.message = 'Service temporarily unavailable. Please try again later.';
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
  getMe: () => api.get('/auth/me', { timeout: 5000 }),
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

// Debug: log computed API URL at runtime (only in development)
if (typeof window !== 'undefined' && (import.meta.env.DEV || import.meta.env.MODE === 'development')) {
  // eslint-disable-next-line no-console
  console.debug('[runtime] API_URL =', API_URL);
}

export { API_URL, API_HOST };
export default api;
