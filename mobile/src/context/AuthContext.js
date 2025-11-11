import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [token, storedUser, expiry] = await AsyncStorage.multiGet([
        'token',
        'user',
        'token_expiry',
      ]);

      const tokenValue = token[1];
      const userValue = storedUser[1];
      const expiryValue = expiry[1];

      if (tokenValue && userValue) {
        // Check if token is expired
        if (expiryValue) {
          const expDate = new Date(expiryValue);
          const now = new Date();
          
          if (isNaN(expDate.getTime()) || now > expDate) {
            // Token expired
            await logout();
            setLoading(false);
            return;
          }
        }

        setUser(JSON.parse(userValue));
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authService.login({ email, password });
      const { token, user: userData, expiresIn } = response.data;

      // Calculate expiry time
      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + (expiresIn || 86400)); // Default 24 hours

      await AsyncStorage.multiSet([
        ['token', token],
        ['user', JSON.stringify(userData)],
        ['token_expiry', expiryDate.toISOString()],
      ]);

      setUser(userData);
      setIsAuthenticated(true);

      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      const { token, user: newUser, expiresIn } = response.data;

      // Calculate expiry time
      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + (expiresIn || 86400));

      await AsyncStorage.multiSet([
        ['token', token],
        ['user', JSON.stringify(newUser)],
        ['token_expiry', expiryDate.toISOString()],
      ]);

      setUser(newUser);
      setIsAuthenticated(true);

      return { success: true, user: newUser };
    } catch (error) {
      console.error('Register error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed',
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      await AsyncStorage.multiRemove(['token', 'user', 'token_expiry']);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const updateUser = async (updatedUser) => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
