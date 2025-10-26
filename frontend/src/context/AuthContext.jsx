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
  const [token, setToken] = useState(localStorage.getItem('token'));

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

  const login = async (email, password) => {
    try {
      const response = await authService.login({ email, password });
      const { user, accessToken, token: legacyToken } = response.data.data;
      
      // Handle both accessToken (new) and token (legacy) naming
      const authToken = accessToken || legacyToken;
      
      if (!authToken) {
        throw new Error('No authentication token received');
      }
      
      // Set token first, then user to trigger proper state updates
      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(user));
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
      const { user, accessToken, token: legacyToken } = response.data.data;
      
      // Handle both accessToken (new) and token (legacy) naming
      const authToken = accessToken || legacyToken;
      
      if (!authToken) {
        throw new Error('No authentication token received');
      }
      
      // Set token first, then user to trigger proper state updates
      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(user));
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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
