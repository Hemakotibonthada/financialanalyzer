import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { StyleSheet } from 'react-native';
import { setUnauthorizedHandler } from '../api/client';
import { authApi } from '../api/endpoints';
import {
  clearAll,
  getAccessToken,
  getPreference,
  getUser,
  saveTokens,
  saveUser,
  setPreference
} from '../utils/storage';
import * as biometrics from '../utils/biometrics';

const AuthContext = createContext(null);
const BIOMETRIC_KEY = 'biometricEnabled';

function extractSession(payload) {
  const source = payload?.data || payload || {};
  const likelyUser = source.id || source._id || source.email;
  return {
    user: source.user || source.profile || (likelyUser ? source : null),
    accessToken: source.accessToken || source.token,
    refreshToken: source.refreshToken
  };
}

export function AuthProvider({ children }) {
  const mountedRef = useRef(false);
  const logoutRef = useRef(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const applyUser = useCallback(async (nextUser) => {
    if (mountedRef.current) setUser(nextUser || null);
    if (nextUser) await saveUser(nextUser);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    await clearAll();
    await setPreference(BIOMETRIC_KEY, false);
    if (mountedRef.current) {
      setUser(null);
      setBiometricEnabled(false);
      setLoading(false);
    }
  }, []);

  logoutRef.current = logout;

  const refreshUser = useCallback(async () => {
    const profile = await authApi.me();
    const nextUser = profile?.user || profile;
    await applyUser(nextUser);
    return nextUser;
  }, [applyUser]);

  useEffect(() => {
    mountedRef.current = true;
    setUnauthorizedHandler(() => logoutRef.current?.());

    async function restoreSession() {
      const [cachedUser, token, biometricPref] = await Promise.all([
        getUser(),
        getAccessToken(),
        getPreference(BIOMETRIC_KEY, false)
      ]);

      if (!mountedRef.current) return;
      setUser(cachedUser || null);
      setBiometricEnabled(Boolean(biometricPref));
      setLoading(false);

      if (token) {
        refreshUser().catch((error) => {
          if (error?.status === 401) logoutRef.current?.();
        });
      }
    }

    restoreSession();

    return () => {
      mountedRef.current = false;
      setUnauthorizedHandler(null);
    };
  }, [refreshUser]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const payload = await authApi.login(email, password);
      const session = extractSession(payload);
      await saveTokens({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken
      });
      const nextUser = session.user || await refreshUser();
      await applyUser(nextUser);
      return nextUser;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [applyUser, refreshUser]);

  const register = useCallback(async (name, email, password) => {
    setLoading(true);
    try {
      const payload = await authApi.register(name, email, password);
      const session = extractSession(payload);
      if (session.accessToken || session.refreshToken) {
        await saveTokens({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken
        });
      }
      const nextUser = session.user || (
        session.accessToken ? await refreshUser().catch(() => null) : null
      );
      if (nextUser) await applyUser(nextUser);
      return nextUser || payload;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [applyUser, refreshUser]);

  const enableBiometric = useCallback(async () => {
    const result = await biometrics.authenticate('Confirm to enable biometric unlock');
    if (!result.success) return result;

    await setPreference(BIOMETRIC_KEY, true);
    if (mountedRef.current) setBiometricEnabled(true);
    return result;
  }, []);

  const disableBiometric = useCallback(async () => {
    await setPreference(BIOMETRIC_KEY, false);
    if (mountedRef.current) setBiometricEnabled(false);
  }, []);

  const authenticateWithBiometric = useCallback(async () => {
    if (!biometricEnabled) {
      return { success: false, error: 'Biometric unlock is not enabled.' };
    }
    return biometrics.authenticate('Unlock Financial Analyzer');
  }, [biometricEnabled]);

  const value = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user),
    loading,
    biometricEnabled,
    login,
    register,
    logout,
    refreshUser,
    enableBiometric,
    disableBiometric,
    authenticateWithBiometric
  }), [
    user,
    loading,
    biometricEnabled,
    login,
    register,
    logout,
    refreshUser,
    enableBiometric,
    disableBiometric,
    authenticateWithBiometric
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

export default AuthProvider;

const styles = StyleSheet.create({});
