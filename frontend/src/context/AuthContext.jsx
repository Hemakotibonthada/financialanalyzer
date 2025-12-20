import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/api';
import { toast } from 'react-toastify';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Token can be stored either in sessionStorage (session-only) or localStorage (remembered)
  const getStoredToken = () => {
    // Debug token state at runtime
    if (import.meta.env.DEV) {
      console.debug('[auth] getStoredToken - checking token and expiry state:', {
        'ls.token?': !!localStorage.getItem('token'),
        'ls.expiry?': !!localStorage.getItem('token_expiry'),
        'ls.expiry': localStorage.getItem('token_expiry'),
        'sess.token?': !!sessionStorage.getItem('token')
      });
    }

    // First check localStorage token + expiry
    const lsToken = localStorage.getItem('token');
    const expiry = localStorage.getItem('token_expiry');
    if (lsToken) {
      if (expiry) {
        const expDate = new Date(expiry);
        const now = new Date();
        // Debug token expiry check at runtime
        if (import.meta.env.DEV) {
          console.debug('[auth] getStoredToken - expiry check:', {
            expiry,
            expDate: expDate.toISOString(),
            now: now.toISOString(),
            isExpired: now > expDate
          });
        }
        
        // Clear if expiry is invalid or token has expired
        if (isNaN(expDate.getTime())) {
          console.warn('[auth] Invalid token_expiry date - clearing localStorage token');
          localStorage.removeItem('token');
          localStorage.removeItem('token_expiry');
          localStorage.removeItem('user');
        } else if (now > expDate) {
          console.info('[auth] Token expired - clearing localStorage token');
          localStorage.removeItem('token');
          localStorage.removeItem('token_expiry');
          localStorage.removeItem('user');
        } else {
          // Valid unexpired token
          return lsToken; 
        }
      } else {
        // token without expiry in localStorage - treat as persistent
        return lsToken;
      }
    }

    // fallback to sessionStorage
    return sessionStorage.getItem('token');
  };

  const [token, setToken] = useState(getStoredToken());

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await authService.getMe();
      setUser(response.data.data.user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  // options: { rememberThisMonth: boolean }
  const login = async (email, password, options = {}) => {
    try {
      const response = await authService.login({ email, password });
      const { user, accessToken, refreshToken, token: legacyToken } = response.data.data;
      
      // Handle both accessToken (new) and token (legacy) naming
      const authToken = accessToken || legacyToken;
      
      if (!authToken) {
        throw new Error('No authentication token received');
      }
      
      // Store token either in sessionStorage (default) or localStorage (when rememberThisMonth)
      const remember = options.rememberThisMonth;
      if (remember) {
        // compute end of current month local time
        const now = new Date();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        localStorage.setItem('token', authToken);
        localStorage.setItem('token_expiry', endOfMonth.toISOString());
        localStorage.setItem('user', JSON.stringify(user));
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
        // remove any session token
        sessionStorage.removeItem('token');
        
        // Debug token storage at runtime
        if (import.meta.env.DEV) {
          const storedExpiry = localStorage.getItem('token_expiry');
          console.debug('[auth] Login with remember - stored token with expiry:', {
            now: now.toISOString(),
            endOfMonth: endOfMonth.toISOString(),
            storedExpiry,
            validDate: !isNaN(new Date(storedExpiry).getTime()),
            hasRefreshToken: !!refreshToken
          });
        }
      } else {
        // For session-only, use 24 hours expiry (token lifetime)
        const now = new Date();
        const expiry24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        localStorage.setItem('token', authToken);
        localStorage.setItem('token_expiry', expiry24h.toISOString());
        localStorage.setItem('user', JSON.stringify(user));
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
        
        if (import.meta.env.DEV) {
          console.debug('[auth] Login without remember - using 24h token expiry', {
            expiry: expiry24h.toISOString(),
            hasRefreshToken: !!refreshToken
          });
        }
      }

      setToken(authToken);
      setUser(user);
      
      toast.success('Login successful!');
      return { success: true, user, token: authToken };
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Login failed';
      toast.error(message);
      console.error('Login error:', error);
      return { success: false, message };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await authService.register({ name, email, password });
      const { user, accessToken, refreshToken, token: legacyToken } = response.data.data;
      
      // Handle both accessToken (new) and token (legacy) naming
      const authToken = accessToken || legacyToken;
      
      if (!authToken) {
        throw new Error('No authentication token received');
      }
      
      // Set token with 24 hours expiry
      const now = new Date();
      const expiry24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      localStorage.setItem('token', authToken);
      localStorage.setItem('token_expiry', expiry24h.toISOString());
      localStorage.setItem('user', JSON.stringify(user));
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      setToken(authToken);
      setUser(user);
      
      toast.success('Registration successful!');
      return { success: true, user, token: authToken };
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Registration failed';
      toast.error(message);
      console.error('Registration error:', error);
      return { success: false, message };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    // remove from both storages
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('token_expiry');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    toast.info('Logged out successfully');
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user && !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
