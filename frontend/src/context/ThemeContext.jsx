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
  // Track whether the user explicitly chose a theme (vs. system auto-detection)
  const [userExplicit, setUserExplicit] = useState(() => {
    return localStorage.getItem('themeMode') !== null;
  });

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

  // Override setMode to track explicit user choice
  const setModeExplicit = useCallback((newMode) => {
    setUserExplicit(true);
    setMode(newMode);
  }, []);

  // ── System theme auto-sync: listen for OS prefers-color-scheme changes ──
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = (e) => {
      // Only auto-sync when the user has NOT explicitly chosen a theme
      if (!userExplicit) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else if (mediaQuery.addListener) {
      // Safari < 14
      mediaQuery.addListener(handleSystemThemeChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    };
  }, [userExplicit]);

  // Allow user to reset to system preference
  const resetToSystemTheme = useCallback(() => {
    setUserExplicit(false);
    localStorage.removeItem('themeMode');
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      setMode('dark');
    } else {
      setMode('light');
    }
  }, []);

  // Sync mode → localStorage + DOM classes + data-theme attribute
  useEffect(() => {
    if (userExplicit) {
      localStorage.setItem('themeMode', mode);
    }
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
      root.style.setProperty('--theme-surface-hover', '#f1f5f9');
      root.style.setProperty('--theme-text-tertiary', '#64748b');
      root.style.setProperty('--theme-glass-bg', 'rgba(255,255,255,0.75)');
      root.style.setProperty('--theme-glass-border', 'rgba(255,255,255,0.6)');
      root.style.setProperty('--theme-gradient-subtle', 'rgba(59,130,246,0.04)');
    } else if (mode === 'dark') {
      root.style.setProperty('--theme-bg', '#0f172a');
      root.style.setProperty('--theme-surface', '#1e293b');
      root.style.setProperty('--theme-text', '#f1f5f9');
      root.style.setProperty('--theme-text-secondary', '#94a3b8');
      root.style.setProperty('--theme-border', 'rgba(255,255,255,0.06)');
      root.style.setProperty('--theme-shadow-color', '215 28% 6%');
      root.style.setProperty('--theme-surface-hover', '#273548');
      root.style.setProperty('--theme-text-tertiary', '#64748b');
      root.style.setProperty('--theme-glass-bg', 'rgba(255,255,255,0.08)');
      root.style.setProperty('--theme-glass-border', 'rgba(255,255,255,0.12)');
      root.style.setProperty('--theme-gradient-subtle', 'rgba(59,130,246,0.08)');
    } else {
      root.style.setProperty('--theme-bg', '#000000');
      root.style.setProperty('--theme-surface', '#0a0a0a');
      root.style.setProperty('--theme-text', '#fafafa');
      root.style.setProperty('--theme-text-secondary', '#a1a1aa');
      root.style.setProperty('--theme-border', 'rgba(255,255,255,0.05)');
      root.style.setProperty('--theme-shadow-color', '0 0% 0%');
      root.style.setProperty('--theme-surface-hover', '#141414');
      root.style.setProperty('--theme-text-tertiary', '#71717a');
      root.style.setProperty('--theme-glass-bg', 'rgba(10,10,10,0.85)');
      root.style.setProperty('--theme-glass-border', 'rgba(255,255,255,0.06)');
      root.style.setProperty('--theme-gradient-subtle', 'rgba(59,130,246,0.06)');
    }
  }, [mode, userExplicit]);

  // Sync accent → localStorage + CSS custom property
  useEffect(() => {
    localStorage.setItem('themeAccent', accentColor);
    const preset = ACCENT_PRESETS[accentColor] || ACCENT_PRESETS.blue;
    document.documentElement.style.setProperty('--accent-primary', preset.primary);
    document.documentElement.setAttribute('data-accent', accentColor);
  }, [accentColor]);

  // Toggle between light, dark, and black mode
  const toggleTheme = useCallback(() => {
    setUserExplicit(true);
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
    setMode: setModeExplicit,
    isDark: mode === 'dark' || mode === 'black',
    isLight: mode === 'light',
    isBlack: mode === 'black',
    accentColor,
    setAccentColor,
    accent,
    userExplicit,
    resetToSystemTheme,
  }), [mode, toggleTheme, setModeExplicit, accentColor, accent, userExplicit, resetToSystemTheme]);

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
