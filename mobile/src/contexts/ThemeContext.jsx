import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { darkColors, lightColors } from '../theme/tokens';
import { getPreference, setPreference } from '../utils/storage';

const ThemeContext = createContext(null);
const THEME_KEY = 'themeMode';
const MODES = ['light', 'dark', 'system'];

function normaliseMode(value) {
  return MODES.includes(value) ? value : 'system';
}

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState('system');

  useEffect(() => {
    let alive = true;

    getPreference(THEME_KEY, 'system').then((storedMode) => {
      if (alive) setModeState(normaliseMode(storedMode));
    });

    return () => {
      alive = false;
    };
  }, []);

  const setMode = useCallback((nextMode) => {
    const safeMode = normaliseMode(nextMode);
    setModeState(safeMode);
    setPreference(THEME_KEY, safeMode);
  }, []);

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const colors = isDark ? darkColors : lightColors;

  const toggle = useCallback(() => {
    setMode(isDark ? 'light' : 'dark');
  }, [isDark, setMode]);

  const value = useMemo(
    () => ({ colors, mode, setMode, isDark, toggle }),
    [colors, mode, setMode, isDark, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}

export default ThemeProvider;

const styles = StyleSheet.create({});
