import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { lightTheme, darkTheme, blackTheme } from '../theme';

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
    // Respect OS-level dark mode preference
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  // Update localStorage when theme changes
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
    // Update body class for Tailwind dark mode
    if (mode === 'dark' || mode === 'black') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mode]);

  // Toggle between light, dark, and black mode
  const toggleTheme = () => {
    setMode((prevMode) => {
      if (prevMode === 'light') return 'dark';
      if (prevMode === 'dark') return 'black';
      return 'light';
    });
  };

  // Memoize theme to prevent unnecessary re-renders
  const theme = useMemo(() => {
    if (mode === 'black') return blackTheme;
    if (mode === 'dark') return darkTheme;
    return lightTheme;
  }, [mode]);

  const value = useMemo(() => ({
    mode,
    toggleTheme,
    setMode,
    isDark: mode === 'dark' || mode === 'black',
    isLight: mode === 'light',
    isBlack: mode === 'black',
  }), [mode]);

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
