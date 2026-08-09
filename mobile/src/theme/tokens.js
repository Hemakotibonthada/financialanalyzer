/**
 * Design tokens.
 *
 * Screens must never use a raw hex value - always pull a semantic token from
 * useTheme(). That is what makes dark mode work everywhere without auditing
 * every file afterwards.
 *
 * The palette mirrors the web app's teal identity so the two products feel
 * like one product.
 */

const palette = {
  teal50: '#f0fdfa',
  teal100: '#ccfbf1',
  teal500: '#14b8a6',
  teal600: '#0d9488',
  teal700: '#0f766e',
  teal900: '#134e4a',

  green500: '#22c55e',
  green600: '#16a34a',
  red500: '#ef4444',
  red600: '#dc2626',
  amber500: '#f59e0b',
  amber600: '#d97706',
  blue500: '#3b82f6',
  violet500: '#8b5cf6',

  white: '#ffffff',
  black: '#000000',

  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate300: '#cbd5e1',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1e293b',
  slate900: '#0f172a',
  slate950: '#020617'
};

export const lightColors = {
  primary: palette.teal600,
  primaryDark: palette.teal700,
  primarySoft: palette.teal50,
  onPrimary: palette.white,

  background: palette.slate50,
  surface: palette.white,
  surfaceAlt: palette.slate100,
  border: palette.slate200,

  text: palette.slate900,
  textMuted: palette.slate500,
  textFaint: palette.slate400,

  success: palette.green600,
  successSoft: '#dcfce7',
  danger: palette.red600,
  dangerSoft: '#fee2e2',
  warning: palette.amber600,
  warningSoft: '#fef3c7',
  info: palette.blue500,
  accent: palette.violet500,

  // Money direction. Credit is green; debit uses the neutral text colour
  // rather than red, because most transactions are debits and a wall of red
  // reads as a screen full of errors.
  credit: palette.green600,
  debit: palette.slate900,

  overlay: 'rgba(15, 23, 42, 0.45)',
  skeleton: palette.slate200,
  chartGrid: palette.slate200
};

export const darkColors = {
  primary: palette.teal500,
  primaryDark: palette.teal600,
  primarySoft: 'rgba(20, 184, 166, 0.12)',
  onPrimary: palette.slate950,

  background: palette.slate950,
  surface: palette.slate900,
  surfaceAlt: palette.slate800,
  border: palette.slate800,

  text: palette.slate50,
  textMuted: palette.slate400,
  textFaint: palette.slate500,

  success: palette.green500,
  successSoft: 'rgba(34, 197, 94, 0.14)',
  danger: palette.red500,
  dangerSoft: 'rgba(239, 68, 68, 0.14)',
  warning: palette.amber500,
  warningSoft: 'rgba(245, 158, 11, 0.14)',
  info: palette.blue500,
  accent: palette.violet500,

  credit: palette.green500,
  debit: palette.slate50,

  overlay: 'rgba(0, 0, 0, 0.6)',
  skeleton: palette.slate800,
  chartGrid: palette.slate800
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999
};

export const typography = {
  display: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontSize: 18, fontWeight: '700' },
  subheading: { fontSize: 16, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  bodyStrong: { fontSize: 15, fontWeight: '600' },
  caption: { fontSize: 13, fontWeight: '400' },
  micro: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4 }
};

/**
 * Elevation. iOS reads the shadow* properties and Android reads elevation;
 * setting both and letting each platform ignore the other keeps call sites
 * free of Platform.select.
 */
export const elevation = {
  none: {},
  low: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  medium: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6
  }
};

// Minimum comfortable touch target. Anything tappable must reach this in both
// dimensions - use hitSlop when the visual element is smaller.
export const HIT_TARGET = 44;

// Ordered colours for category charts, chosen to stay distinguishable for the
// most common forms of colour blindness.
export const chartPalette = [
  palette.teal600,
  palette.blue500,
  palette.violet500,
  palette.amber500,
  palette.green600,
  palette.red500,
  palette.teal900,
  palette.slate500
];

export default {
  lightColors,
  darkColors,
  spacing,
  radii,
  typography,
  elevation,
  chartPalette,
  HIT_TARGET
};
