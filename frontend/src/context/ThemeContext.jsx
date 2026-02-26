import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { lightTheme, darkTheme, blackTheme } from '../theme';

/* ============================================
   ACCENT COLOR PRESETS
   Each accent modifies CSS custom properties
   ============================================ */
export const ACCENT_PRESETS = {
  blue:   { name: 'Ocean Blue',   primary: '#3b82f6', gradient: 'from-blue-500 to-cyan-500',    ring: 'ring-blue-400/30' },
  purple: { name: 'Royal Purple', primary: '#8b5cf6', gradient: 'from-purple-500 to-pink-500',  ring: 'ring-purple-400/30' },
  green:  { name: 'Emerald',      primary: '#10b981', gradient: 'from-emerald-500 to-teal-500', ring: 'ring-emerald-400/30' },
  rose:   { name: 'Rose',         primary: '#f43f5e', gradient: 'from-rose-500 to-orange-500',  ring: 'ring-rose-400/30' },
  amber:  { name: 'Amber',        primary: '#f59e0b', gradient: 'from-amber-500 to-yellow-500', ring: 'ring-amber-400/30' },
  teal:   { name: 'Teal',         primary: '#14b8a6', gradient: 'from-teal-500 to-cyan-500',    ring: 'ring-teal-400/30' },
  indigo: { name: 'Indigo',       primary: '#6366f1', gradient: 'from-indigo-500 to-blue-500',  ring: 'ring-indigo-400/30' },
  sky:    { name: 'Sky',          primary: '#0ea5e9', gradient: 'from-sky-500 to-blue-400',     ring: 'ring-sky-400/30' },
};

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Get initial theme from localStorage, then OS preference, then default to light
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('themeMode');
    if (savedMode) return savedMode;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('themeAccent') || 'blue';
  });

  // Sync mode → localStorage + DOM classes + data-theme attribute
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
    const root = document.documentElement;

    // Tailwind dark class
    if (mode === 'dark' || mode === 'black') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // data-theme attribute for CSS selectors
    root.setAttribute('data-theme', mode);

    // Set mode-specific CSS variables on :root
    if (mode === 'light') {
      root.style.setProperty('--theme-bg', '#f8fafc');
      root.style.setProperty('--theme-surface', '#ffffff');
      root.style.setProperty('--theme-text', '#0f172a');
      root.style.setProperty('--theme-text-secondary', '#475569');
      root.style.setProperty('--theme-border', 'rgba(0,0,0,0.06)');
      root.style.setProperty('--theme-shadow-color', '0 0% 0%');
    } else if (mode === 'dark') {
      root.style.setProperty('--theme-bg', '#0f172a');
      root.style.setProperty('--theme-surface', '#1e293b');
      root.style.setProperty('--theme-text', '#f1f5f9');
      root.style.setProperty('--theme-text-secondary', '#94a3b8');
      root.style.setProperty('--theme-border', 'rgba(255,255,255,0.06)');
      root.style.setProperty('--theme-shadow-color', '215 28% 6%');
    } else {
      root.style.setProperty('--theme-bg', '#000000');
      root.style.setProperty('--theme-surface', '#0a0a0a');
      root.style.setProperty('--theme-text', '#fafafa');
      root.style.setProperty('--theme-text-secondary', '#a1a1aa');
      root.style.setProperty('--theme-border', 'rgba(255,255,255,0.05)');
      root.style.setProperty('--theme-shadow-color', '0 0% 0%');
    }
  }, [mode]);

  // Sync accent → localStorage + CSS custom property
  useEffect(() => {
    localStorage.setItem('themeAccent', accentColor);
    const preset = ACCENT_PRESETS[accentColor] || ACCENT_PRESETS.blue;
    document.documentElement.style.setProperty('--accent-primary', preset.primary);
    document.documentElement.setAttribute('data-accent', accentColor);
  }, [accentColor]);

  // Toggle between light, dark, and black mode
  const toggleTheme = useCallback(() => {
    setMode((prevMode) => {
      if (prevMode === 'light') return 'dark';
      if (prevMode === 'dark') return 'black';
      return 'light';
    });
  }, []);

  // Memoize theme to prevent unnecessary re-renders
  const theme = useMemo(() => {
    if (mode === 'black') return blackTheme;
    if (mode === 'dark') return darkTheme;
    return lightTheme;
  }, [mode]);

  const accent = ACCENT_PRESETS[accentColor] || ACCENT_PRESETS.blue;

  const value = useMemo(() => ({
    mode,
    toggleTheme,
    setMode,
    isDark: mode === 'dark' || mode === 'black',
    isLight: mode === 'light',
    isBlack: mode === 'black',
    accentColor,
    setAccentColor,
    accent,
  }), [mode, toggleTheme, accentColor, accent]);

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
