import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/api';
import { toast } from 'react-toastify';
import { getStorageType, setUserId } from '../services/storage';
import { 
  signInWithFirebase, 
  registerWithFirebase, 
  signOutFromFirebase,
  onFirebaseAuthStateChanged 
} from '../services/firebaseAuth';

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

  // Listen to Firebase auth state changes to restore session
  useEffect(() => {
    const storageType = getStorageType();
    
    if (storageType === 'online') {
      // Set up Firebase auth state listener
      const unsubscribe = onFirebaseAuthStateChanged(async (firebaseUser) => {
        if (firebaseUser) {
          try {
            // Get fresh token
            const idToken = await firebaseUser.getIdToken();
            
            // Get user data from Firestore if available
            const { getFirebaseDb } = await import('../services/firebase');
            const db = getFirebaseDb();
            const { doc, getDoc } = await import('firebase/firestore');
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            const userData = userDoc.exists() ? userDoc.data() : {};
            
            const userObj = {
              id: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName || userData.name || firebaseUser.email?.split('@')[0],
              ...userData
            };
            
            // Update state
            setUser(userObj);
            setToken(idToken);
            
            // Update storage
            const storedToken = getStoredToken();
            if (storedToken) {
              // Token exists in storage, update it
              if (localStorage.getItem('token')) {
                localStorage.setItem('token', idToken);
                localStorage.setItem('user', JSON.stringify(userObj));
              } else if (sessionStorage.getItem('token')) {
                sessionStorage.setItem('token', idToken);
                sessionStorage.setItem('user', JSON.stringify(userObj));
              }
            }
            
            // Set user ID for Firestore queries
            setUserId(firebaseUser.uid);
            
            console.log('[auth] Firebase user session restored:', firebaseUser.uid);
          } catch (error) {
            console.error('[auth] Error restoring Firebase session:', error);
            setUser(null);
            setToken(null);
          } finally {
            setLoading(false);
          }
        } else {
          // No Firebase user - clear state if using Firebase
          console.log('[auth] No Firebase user found');
          setUser(null);
          setToken(null);
          setLoading(false);
        }
      });
      
      return () => unsubscribe();
    } else {
      // Not using Firebase, proceed with normal token check
      if (token) {
        fetchUser();
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const storageType = getStorageType();
    
    // Skip this effect if using Firebase (handled by onAuthStateChanged)
    if (storageType === 'online') {
      return;
    }
    
    if (token) {
      // Skip fetchUser if using Firebase Auth (user already set)
      const storageType = getStorageType();
      if (storageType === 'online' && user) {
        setLoading(false);
      } else if (storageType !== 'online') {
        fetchUser();
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const storageType = getStorageType();
      
      // Don't fetch from backend if using Firebase
      if (storageType === 'online') {
        // User already set from Firebase Auth
        setLoading(false);
        return;
      }
      
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
      const rememberMe = options.rememberThisMonth || false;
      const storageType = getStorageType();
      
      let response;
      let user;
      let authToken;
      
      // Use Firebase Auth if storage is 'online', otherwise use local MongoDB
      if (storageType === 'online') {
        console.log('[auth] Using Firebase Authentication');
        response = await signInWithFirebase(email, password);
        user = response.user;
        authToken = response.token;
        
        // Set user ID for Firestore queries
        setUserId(user.id);
      } else {
        console.log('[auth] Using Local MongoDB Authentication');
        response = await authService.login({ email, password, rememberMe });
        const data = response.data.data;
        user = data.user;
        authToken = data.accessToken || data.token;
      }
      
      if (!authToken) {
        throw new Error('No authentication token received');
      }
      
      // Store token based on remember preference
      // If remember me is enabled, store in localStorage with end-of-month expiry
      // Otherwise, store in sessionStorage (cleared when browser closes)
      const shouldRemember = rememberMe || response.data?.data?.rememberMe;
      
      if (shouldRemember) {
        // Calculate end of current month in local time
        const now = new Date();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        
        localStorage.setItem('token', authToken);
        localStorage.setItem('token_expiry', endOfMonth.toISOString());
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('storageType', storageType);
        
        // Remove any session token
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        
        if (import.meta.env.DEV) {
          console.debug('[auth] Login with remember - stored token with expiry:', {
            now: now.toISOString(),
            endOfMonth: endOfMonth.toISOString(),
            daysRemaining: Math.ceil((endOfMonth - now) / (1000 * 60 * 60 * 24))
          });
        }
      } else {
        // Session storage - cleared when browser closes
        sessionStorage.setItem('token', authToken);
        sessionStorage.setItem('user', JSON.stringify(user));
        sessionStorage.setItem('storageType', storageType);
        
        // Ensure no persistent token exists
        localStorage.removeItem('token');
        localStorage.removeItem('token_expiry');
        localStorage.removeItem('user');
        
        if (import.meta.env.DEV) {
          console.debug('[auth] Login without remember - using session storage');
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
      const storageType = getStorageType();
      
      let response;
      let user;
      let authToken;
      
      // Use Firebase Auth if storage is 'online', otherwise use local MongoDB
      if (storageType === 'online') {
        console.log('[auth] Registering with Firebase Authentication');
        response = await registerWithFirebase(name, email, password);
        user = response.user;
        authToken = response.token;
        
        // Set user ID for Firestore queries
        setUserId(user.id);
      } else {
        console.log('[auth] Registering with Local MongoDB');
        response = await authService.register({ name, email, password });
        const data = response.data.data;
        user = data.user;
        authToken = data.accessToken || data.token;
      }
      
      if (!authToken) {
        throw new Error('No authentication token received');
      }
      
      // For registration, store in localStorage with 30-day expiry by default
      // so new users don't get immediately logged out
      const now = new Date();
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      localStorage.setItem('token', authToken);
      localStorage.setItem('token_expiry', thirtyDaysLater.toISOString());
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('storageType', storageType);
      
      setToken(authToken);
      setUser(user);
      
      toast.success('Registration successful!');
      return { success: true, user, token: authToken };
    } catch (error) {
      // Show detailed validation errors if available
      const data = error.response?.data;
      let message = data?.message || error.message || 'Registration failed';
      if (data?.errors?.length) {
        message = data.errors.map(e => e.message || e.msg).join('. ');
      }
      toast.error(message);
      console.error('Registration error:', error);
      console.error('Registration error details:', data);
      return { success: false, message };
    }
  };

  const logout = () => {
    const storageType = getStorageType();
    
    // Sign out from Firebase if using cloud storage
    if (storageType === 'online') {
      signOutFromFirebase().catch(error => {
        console.error('Firebase sign out error:', error);
      });
    }
    
    setUser(null);
    setToken(null);
    // remove from both storages
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('token_expiry');
    localStorage.removeItem('storageType');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('storageType');
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
