import { createTheme } from '@mui/material/styles';

/* ============================================
   FINANCIAL ANALYZER — PREMIUM THEME SYSTEM
   Modern, polished, multi-mode theme
   ============================================ */

const sharedTypography = {
  fontFamily: '"Inter", "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  h1: { fontSize: '2.25rem', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.2 },
  h2: { fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.25 },
  h3: { fontSize: '1.5rem',   fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.3 },
  h4: { fontSize: '1.25rem',  fontWeight: 600, letterSpacing: '-0.01em',  lineHeight: 1.35 },
  h5: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4 },
  h6: { fontSize: '1rem',     fontWeight: 600, lineHeight: 1.5 },
  subtitle1: { fontSize: '1rem',    fontWeight: 500, lineHeight: 1.5, letterSpacing: '0.01em' },
  subtitle2: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.5, letterSpacing: '0.01em' },
  body1: { fontSize: '1rem',    fontWeight: 400, lineHeight: 1.6 },
  body2: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.6 },
  button: { fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.02em' },
  caption: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.5, letterSpacing: '0.02em' },
  overline: { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' },
};

const sharedShape = { borderRadius: 12 };

const sharedComponents = (mode) => ({
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        scrollBehavior: 'smooth',
        '&::-webkit-scrollbar': { width: 8 },
        '&::-webkit-scrollbar-thumb': {
          borderRadius: 4,
          backgroundColor: mode === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)',
        },
      },
    },
  },
  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: {
      root: {
        textTransform: 'none',
        borderRadius: 10,
        fontWeight: 600,
        padding: '8px 20px',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      contained: {
        boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
        '&:hover': {
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
          transform: 'translateY(-1px)',
        },
      },
      outlined: {
        borderWidth: 1.5,
        '&:hover': { borderWidth: 1.5 },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 16,
        border: mode === 'light' ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)',
        backgroundImage: 'none',
        transition: 'box-shadow 0.3s ease, transform 0.2s ease',
        '&:hover': {
          boxShadow: mode === 'light'
            ? '0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04)'
            : '0 10px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.3)',
        },
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        backgroundImage: 'none',
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
        backdropFilter: 'blur(12px)',
        borderBottom: mode === 'light' ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: { backgroundImage: 'none' },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 10,
          transition: 'box-shadow 0.2s ease',
          '&.Mui-focused': {
            boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.15)',
          },
        },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: { borderRadius: 8, fontWeight: 500 },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        borderRadius: 8,
        fontSize: '0.75rem',
        fontWeight: 500,
        padding: '6px 12px',
        backdropFilter: 'blur(8px)',
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 20,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      },
    },
  },
  MuiSwitch: {
    styleOverrides: {
      root: { padding: 8 },
      track: { borderRadius: 22 / 2, opacity: 0.3 },
      thumb: {
        boxShadow: '0 2px 4px 0 rgba(0,0,0,0.2)',
        width: 18,
        height: 18,
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: { textTransform: 'none', fontWeight: 600, minHeight: 44 },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: { borderRadius: 12 },
    },
  },
  MuiAvatar: {
    styleOverrides: {
      root: { fontWeight: 600 },
    },
  },
  MuiLinearProgress: {
    styleOverrides: {
      root: { borderRadius: 8, height: 6 },
    },
  },
});

// ─── Light Theme ──────────────────────────────────
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary:   { main: '#3b82f6', light: '#60a5fa', dark: '#2563eb', contrastText: '#fff' },
    secondary: { main: '#8b5cf6', light: '#a78bfa', dark: '#7c3aed', contrastText: '#fff' },
    success:   { main: '#10b981', light: '#34d399', dark: '#059669' },
    error:     { main: '#ef4444', light: '#f87171', dark: '#dc2626' },
    warning:   { main: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
    info:      { main: '#06b6d4', light: '#22d3ee', dark: '#0891b2' },
    background: { default: '#f8fafc', paper: '#ffffff' },
    text: { primary: '#0f172a', secondary: '#475569' },
    divider: 'rgba(0,0,0,0.06)',
  },
  typography: sharedTypography,
  shape: sharedShape,
  shadows: [
    'none',
    '0 1px 2px 0 rgba(0,0,0,0.05)',
    '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
    '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
    '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
    '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
    '0 25px 50px -12px rgba(0,0,0,0.25)',
    ...Array(18).fill('0 25px 50px -12px rgba(0,0,0,0.25)'),
  ],
  components: sharedComponents('light'),
});

// ─── Dark Theme ──────────────────────────────────
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary:   { main: '#60a5fa', light: '#93c5fd', dark: '#3b82f6', contrastText: '#0f172a' },
    secondary: { main: '#a78bfa', light: '#c4b5fd', dark: '#8b5cf6', contrastText: '#0f172a' },
    success:   { main: '#34d399', light: '#6ee7b7', dark: '#10b981' },
    error:     { main: '#f87171', light: '#fca5a5', dark: '#ef4444' },
    warning:   { main: '#fbbf24', light: '#fde68a', dark: '#f59e0b' },
    info:      { main: '#22d3ee', light: '#67e8f9', dark: '#06b6d4' },
    background: { default: '#0f172a', paper: '#1e293b' },
    text: { primary: '#f1f5f9', secondary: '#94a3b8' },
    divider: 'rgba(255,255,255,0.06)',
  },
  typography: sharedTypography,
  shape: sharedShape,
  shadows: [
    'none',
    '0 1px 2px 0 rgba(0,0,0,0.3)',
    '0 1px 3px 0 rgba(0,0,0,0.4), 0 1px 2px -1px rgba(0,0,0,0.3)',
    '0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -2px rgba(0,0,0,0.3)',
    '0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.3)',
    '0 20px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.4)',
    '0 25px 50px -12px rgba(0,0,0,0.6)',
    ...Array(18).fill('0 25px 50px -12px rgba(0,0,0,0.6)'),
  ],
  components: {
    ...sharedComponents('dark'),
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(15,23,42,0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        },
      },
    },
  },
});

// ─── Black (OLED) Theme ──────────────────────────
export const blackTheme = createTheme({
  palette: {
    mode: 'dark',
    primary:   { main: '#60a5fa', light: '#93c5fd', dark: '#3b82f6', contrastText: '#000' },
    secondary: { main: '#a78bfa', light: '#c4b5fd', dark: '#7c3aed', contrastText: '#000' },
    success:   { main: '#34d399', light: '#6ee7b7', dark: '#10b981' },
    error:     { main: '#f87171', light: '#fca5a5', dark: '#ef4444' },
    warning:   { main: '#fbbf24', light: '#fde68a', dark: '#f59e0b' },
    info:      { main: '#22d3ee', light: '#67e8f9', dark: '#06b6d4' },
    background: { default: '#000000', paper: '#0a0a0a' },
    text: { primary: '#fafafa', secondary: '#a1a1aa' },
    divider: 'rgba(255,255,255,0.05)',
  },
  typography: sharedTypography,
  shape: sharedShape,
  shadows: [
    'none',
    '0 1px 2px 0 rgba(0,0,0,0.6)',
    '0 1px 3px 0 rgba(0,0,0,0.7), 0 1px 2px -1px rgba(0,0,0,0.5)',
    '0 4px 6px -1px rgba(0,0,0,0.7), 0 2px 4px -2px rgba(0,0,0,0.5)',
    '0 10px 15px -3px rgba(0,0,0,0.7), 0 4px 6px -4px rgba(0,0,0,0.6)',
    '0 20px 25px -5px rgba(0,0,0,0.8), 0 8px 10px -6px rgba(0,0,0,0.7)',
    '0 25px 50px -12px rgba(0,0,0,0.9)',
    ...Array(18).fill('0 25px 50px -12px rgba(0,0,0,0.9)'),
  ],
  components: {
    ...sharedComponents('dark'),
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
          backgroundImage: 'none',
          border: '1px solid rgba(255,255,255,0.05)',
          transition: 'box-shadow 0.3s ease, transform 0.2s ease, border-color 0.3s ease',
          '&:hover': {
            borderColor: 'rgba(255,255,255,0.1)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.9)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundImage: 'none',
          border: '1px solid rgba(255,255,255,0.05)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        },
      },
    },
  },
});
