// ============================================================================
// Theme Utilities — Consistent dark mode styling helpers
// ============================================================================
// Provides reusable style objects for MUI sx props and Tailwind classNames
// to ensure consistent dark-mode theming across the entire application.
// ============================================================================

// ---------------------------------------------------------------------------
// §1  MUI sx-prop helpers (use with spread: sx={{ ...cardSx(isDark) }})
// ---------------------------------------------------------------------------

export const containerSx = (isDark) => ({
  bgcolor: isDark ? '#0f172a' : 'transparent',
  color: isDark ? '#f1f5f9' : 'inherit',
  minHeight: '100vh',
  transition: 'background-color 0.3s ease',
});

export const cardSx = (isDark) => ({
  bgcolor: isDark ? '#1e293b' : '#fff',
  color: isDark ? '#f1f5f9' : 'inherit',
  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
  boxShadow: isDark ? '0 4px 6px -1px rgba(0,0,0,0.3)' : undefined,
  transition: 'background-color 0.3s ease, border-color 0.3s ease',
});

export const dialogSx = (isDark) => ({
  '& .MuiDialog-paper': {
    bgcolor: isDark ? '#1e293b' : '#fff',
    backgroundImage: 'none',
    color: isDark ? '#f1f5f9' : 'inherit',
    border: isDark ? '1px solid #334155' : undefined,
  },
});

export const drawerSx = (isDark) => ({
  '& .MuiDrawer-paper': {
    bgcolor: isDark ? '#1e293b' : '#fff',
    backgroundImage: 'none',
    color: isDark ? '#f1f5f9' : 'inherit',
    borderLeft: isDark ? '1px solid #334155' : undefined,
  },
});

export const inputSx = (isDark) => ({
  '& .MuiOutlinedInput-root': {
    bgcolor: isDark ? '#0f172a' : '#fff',
    color: isDark ? '#f1f5f9' : 'inherit',
    '& fieldset': { borderColor: isDark ? '#334155' : '#e2e8f0' },
    '&:hover fieldset': { borderColor: isDark ? '#475569' : '#94a3b8' },
    '&.Mui-focused fieldset': { borderColor: isDark ? '#60a5fa' : '#3b82f6' },
  },
  '& .MuiInputLabel-root': {
    color: isDark ? '#94a3b8' : 'inherit',
    '&.Mui-focused': { color: isDark ? '#60a5fa' : '#3b82f6' },
  },
  '& .MuiSelect-icon': { color: isDark ? '#94a3b8' : 'inherit' },
});

export const tabsSx = (isDark) => ({
  '& .MuiTab-root': {
    color: isDark ? '#94a3b8' : 'inherit',
    '&.Mui-selected': { color: isDark ? '#60a5fa' : '#3b82f6' },
  },
  '& .MuiTabs-indicator': {
    bgcolor: isDark ? '#60a5fa' : '#3b82f6',
  },
  borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
});

export const tableSx = (isDark) => ({
  '& .MuiTableHead-root': {
    '& .MuiTableCell-root': {
      bgcolor: isDark ? '#0f172a' : '#f8fafc',
      color: isDark ? '#94a3b8' : '#64748b',
      borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      fontWeight: 600,
    },
  },
  '& .MuiTableBody-root .MuiTableCell-root': {
    color: isDark ? '#f1f5f9' : 'inherit',
    borderBottom: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`,
  },
  '& .MuiTableRow-root:hover': {
    bgcolor: isDark ? '#334155' : '#f8fafc',
  },
});

export const tooltipSx = (isDark) => ({
  '& .MuiTooltip-tooltip': {
    bgcolor: isDark ? '#475569' : '#1e293b',
    color: '#f8fafc',
    fontSize: '0.75rem',
  },
});

export const chipSx = (isDark) => ({
  bgcolor: isDark ? '#334155' : '#f1f5f9',
  color: isDark ? '#f1f5f9' : '#334155',
  '&:hover': { bgcolor: isDark ? '#475569' : '#e2e8f0' },
});

export const menuSx = (isDark) => ({
  '& .MuiPaper-root': {
    bgcolor: isDark ? '#1e293b' : '#fff',
    color: isDark ? '#f1f5f9' : 'inherit',
    border: isDark ? '1px solid #334155' : undefined,
    backgroundImage: 'none',
  },
  '& .MuiMenuItem-root': {
    '&:hover': { bgcolor: isDark ? '#334155' : '#f1f5f9' },
  },
});

// ---------------------------------------------------------------------------
// §2  Color constants
// ---------------------------------------------------------------------------

export const DARK = {
  bg: { page: '#0f172a', card: '#1e293b', elevated: '#334155', input: '#0f172a' },
  text: { primary: '#f1f5f9', secondary: '#94a3b8', muted: '#64748b' },
  border: { default: '#334155', subtle: '#1e293b', strong: '#475569' },
  accent: { blue: '#60a5fa', green: '#4ade80', red: '#f87171', yellow: '#fbbf24', purple: '#a78bfa' },
};

export const LIGHT = {
  bg: { page: '#f8fafc', card: '#ffffff', elevated: '#f1f5f9', input: '#ffffff' },
  text: { primary: '#1e293b', secondary: '#64748b', muted: '#94a3b8' },
  border: { default: '#e2e8f0', subtle: '#f1f5f9', strong: '#cbd5e1' },
  accent: { blue: '#3b82f6', green: '#22c55e', red: '#ef4444', yellow: '#f59e0b', purple: '#8b5cf6' },
};

export const colors = (isDark) => isDark ? DARK : LIGHT;

// ---------------------------------------------------------------------------
// §3  Tailwind className builders
// ---------------------------------------------------------------------------

export const tw = {
  card: 'bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-200 dark:border-gray-700',
  cardHover: 'bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-200 dark:border-gray-700 hover:shadow-xl dark:hover:shadow-gray-900/50 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300',
  input: 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500',
  heading: 'text-gray-900 dark:text-white font-bold',
  subheading: 'text-gray-700 dark:text-gray-300 font-semibold',
  text: 'text-gray-700 dark:text-gray-300',
  textMuted: 'text-gray-500 dark:text-gray-400',
  textSecondary: 'text-gray-600 dark:text-gray-400',
  divider: 'border-gray-200 dark:border-gray-700',
  badge: (variant = 'blue') => {
    const map = {
      blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    };
    return `px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[variant] || map.blue}`;
  },
  gradient: {
    primary: 'bg-gradient-to-r from-blue-600 to-indigo-600',
    success: 'bg-gradient-to-r from-green-500 to-emerald-500',
    warning: 'bg-gradient-to-r from-yellow-500 to-orange-500',
    danger: 'bg-gradient-to-r from-red-500 to-rose-500',
    purple: 'bg-gradient-to-r from-purple-600 to-pink-600',
    page: 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950',
  },
  button: {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-4 py-2 transition-colors duration-200',
    secondary: 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-lg px-4 py-2 transition-colors duration-200',
    danger: 'bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg px-4 py-2 transition-colors duration-200',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg px-4 py-2 transition-colors duration-200',
    outline: 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg px-4 py-2 transition-colors duration-200',
  },
};

// ---------------------------------------------------------------------------
// §4  Chart color palettes
// ---------------------------------------------------------------------------

export const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
  '#84cc16', '#e11d48', '#0ea5e9', '#d946ef', '#22c55e',
];

export const CHART_COLORS_DARK = [
  '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa',
  '#f472b6', '#22d3ee', '#fb923c', '#2dd4bf', '#818cf8',
  '#a3e635', '#fb7185', '#38bdf8', '#e879f9', '#4ade80',
];

export const chartColors = (isDark) => isDark ? CHART_COLORS_DARK : CHART_COLORS;

export const chartTheme = (isDark) => ({
  tooltip: {
    contentStyle: {
      backgroundColor: isDark ? '#1e293b' : '#fff',
      borderColor: isDark ? '#334155' : '#e2e8f0',
      color: isDark ? '#f1f5f9' : '#1e293b',
      borderRadius: '0.75rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    },
  },
  grid: {
    stroke: isDark ? '#1e293b' : '#f1f5f9',
    strokeDasharray: '3 3',
  },
  axis: {
    tick: { fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 },
    line: { stroke: isDark ? '#334155' : '#e2e8f0' },
  },
  legend: {
    color: isDark ? '#f1f5f9' : '#1e293b',
  },
});

// ---------------------------------------------------------------------------
// §5  Empty state helpers
// ---------------------------------------------------------------------------

export const emptyState = (isDark) => ({
  container: `text-center py-16 ${isDark ? 'text-gray-400' : 'text-gray-500'}`,
  icon: `mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`,
  title: `text-xl font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`,
  description: `text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`,
});

export default { containerSx, cardSx, dialogSx, drawerSx, inputSx, tabsSx, tableSx, tooltipSx, chipSx, menuSx, tw, colors, CHART_COLORS, chartColors, chartTheme, emptyState };
