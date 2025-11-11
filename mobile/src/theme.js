import { DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6366f1', // Indigo
    secondary: '#8b5cf6', // Purple
    accent: '#ec4899', // Pink
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#1e293b',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    info: '#3b82f6',
    card: '#ffffff',
    border: '#e2e8f0',
    notification: '#f59e0b',
    placeholder: '#94a3b8',
  },
  roundness: 12,
  fonts: {
    ...DefaultTheme.fonts,
    regular: {
      fontFamily: 'System',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    bold: {
      fontFamily: 'System',
      fontWeight: '700',
    },
  },
};

export const gradients = {
  primary: ['#6366f1', '#8b5cf6'],
  success: ['#10b981', '#059669'],
  warning: ['#f59e0b', '#d97706'],
  danger: ['#ef4444', '#dc2626'],
  info: ['#3b82f6', '#2563eb'],
  purple: ['#8b5cf6', '#a855f7'],
  pink: ['#ec4899', '#f472b6'],
  blue: ['#3b82f6', '#60a5fa'],
  green: ['#10b981', '#34d399'],
  orange: ['#f97316', '#fb923c'],
};

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};
