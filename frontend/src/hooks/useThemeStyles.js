// ============================================================================
// ENTERPRISE THEME STYLES HOOK
// ============================================================================
// Drop-in hook for any page/component to get theme-aware styles.
// Provides pre-computed CSS classes, style objects, and color tokens
// for light / dark / black modes with accent color integration.
// ============================================================================

import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

// ── Color Palettes per Mode ──────────────────────────────────────────────────

const PALETTES = {
  light: {
    bg:               '#f8fafc',
    bgAlt:            '#f1f5f9',
    surface:          '#ffffff',
    surfaceHover:     '#f8fafc',
    surfaceElevated:  '#ffffff',
    text:             '#0f172a',
    textSecondary:    '#475569',
    textTertiary:     '#64748b',
    textMuted:        '#94a3b8',
    border:           '#e2e8f0',
    borderSubtle:     '#f1f5f9',
    divider:          '#e2e8f0',
    shadow:           'rgba(0,0,0,0.08)',
    shadowStrong:     'rgba(0,0,0,0.15)',
    overlay:          'rgba(0,0,0,0.4)',
    success:          '#16a34a',
    successBg:        '#f0fdf4',
    warning:          '#d97706',
    warningBg:        '#fffbeb',
    error:            '#dc2626',
    errorBg:          '#fef2f2',
    info:             '#2563eb',
    infoBg:           '#eff6ff',
    cardGlass:        'rgba(255,255,255,0.8)',
    cardGlassBorder:  'rgba(255,255,255,0.6)',
    inputBg:          '#ffffff',
    inputBorder:      '#d1d5db',
    inputFocus:       '#3b82f6',
    badgeBg:          '#f1f5f9',
    scrollbar:        '#cbd5e1',
    scrollbarHover:   '#94a3b8',
    skeleton:         '#e2e8f0',
    skeletonShimmer:  '#f8fafc',
    chartGrid:        '#f1f5f9',
    chartText:        '#64748b',
  },
  dark: {
    bg:               '#0f172a',
    bgAlt:            '#0c1322',
    surface:          '#1e293b',
    surfaceHover:     '#273548',
    surfaceElevated:  '#1e293b',
    text:             '#f1f5f9',
    textSecondary:    '#94a3b8',
    textTertiary:     '#64748b',
    textMuted:        '#475569',
    border:           '#334155',
    borderSubtle:     '#1e293b',
    divider:          '#334155',
    shadow:           'rgba(0,0,0,0.3)',
    shadowStrong:     'rgba(0,0,0,0.5)',
    overlay:          'rgba(0,0,0,0.6)',
    success:          '#22c55e',
    successBg:        'rgba(34,197,94,0.1)',
    warning:          '#f59e0b',
    warningBg:        'rgba(245,158,11,0.1)',
    error:            '#ef4444',
    errorBg:          'rgba(239,68,68,0.1)',
    info:             '#3b82f6',
    infoBg:           'rgba(59,130,246,0.1)',
    cardGlass:        'rgba(30,41,59,0.8)',
    cardGlassBorder:  'rgba(255,255,255,0.08)',
    inputBg:          '#1e293b',
    inputBorder:      '#334155',
    inputFocus:       '#3b82f6',
    badgeBg:          'rgba(255,255,255,0.06)',
    scrollbar:        '#334155',
    scrollbarHover:   '#475569',
    skeleton:         '#1e293b',
    skeletonShimmer:  '#273548',
    chartGrid:        '#1e293b',
    chartText:        '#64748b',
  },
  black: {
    bg:               '#000000',
    bgAlt:            '#050505',
    surface:          '#0a0a0a',
    surfaceHover:     '#141414',
    surfaceElevated:  '#111111',
    text:             '#fafafa',
    textSecondary:    '#a1a1aa',
    textTertiary:     '#71717a',
    textMuted:        '#52525b',
    border:           '#27272a',
    borderSubtle:     '#18181b',
    divider:          '#27272a',
    shadow:           'rgba(0,0,0,0.6)',
    shadowStrong:     'rgba(0,0,0,0.8)',
    overlay:          'rgba(0,0,0,0.8)',
    success:          '#22c55e',
    successBg:        'rgba(34,197,94,0.08)',
    warning:          '#f59e0b',
    warningBg:        'rgba(245,158,11,0.08)',
    error:            '#ef4444',
    errorBg:          'rgba(239,68,68,0.08)',
    info:             '#3b82f6',
    infoBg:           'rgba(59,130,246,0.08)',
    cardGlass:        'rgba(10,10,10,0.9)',
    cardGlassBorder:  'rgba(255,255,255,0.05)',
    inputBg:          '#0a0a0a',
    inputBorder:      '#27272a',
    inputFocus:       '#3b82f6',
    badgeBg:          'rgba(255,255,255,0.04)',
    scrollbar:        '#27272a',
    scrollbarHover:   '#3f3f46',
    skeleton:         '#18181b',
    skeletonShimmer:  '#27272a',
    chartGrid:        '#18181b',
    chartText:        '#71717a',
  },
};

// ── Recharts Theme Config ────────────────────────────────────────────────────

function getChartTheme(colors, accent) {
  return {
    colors: [accent, '#8b5cf6', '#06b6d4', '#22c55e', '#f97316', '#ec4899', '#eab308', '#14b8a6'],
    grid: { stroke: colors.chartGrid, strokeDasharray: '3 3' },
    axis: { stroke: colors.border, tick: { fill: colors.chartText, fontSize: 12 } },
    tooltip: {
      contentStyle: {
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: '12px',
        boxShadow: `0 8px 32px ${colors.shadow}`,
        color: colors.text,
      },
    },
    legend: { iconSize: 10, wrapperStyle: { color: colors.textSecondary } },
    area: { fillOpacity: 0.15 },
    bar: { radius: [6, 6, 0, 0] },
  };
}

// ── Pre-computed Style Objects ────────────────────────────────────────────────

function buildStyles(colors, accent, mode) {
  return {
    // Page wrapper
    pageContainer: {
      backgroundColor: colors.bg,
      color: colors.text,
      minHeight: '100vh',
    },

    // Cards
    card: {
      backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: '16px',
      boxShadow: `0 1px 3px ${colors.shadow}`,
    },
    cardHover: {
      backgroundColor: colors.surfaceHover,
      borderColor: accent,
      boxShadow: `0 8px 32px ${colors.shadow}, 0 0 0 1px ${accent}20`,
    },
    cardElevated: {
      backgroundColor: colors.surfaceElevated,
      border: `1px solid ${colors.border}`,
      borderRadius: '20px',
      boxShadow: `0 4px 16px ${colors.shadow}`,
    },
    cardGlass: {
      background: colors.cardGlass,
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: `1px solid ${colors.cardGlassBorder}`,
      borderRadius: '20px',
    },

    // Inputs
    input: {
      backgroundColor: colors.inputBg,
      border: `1px solid ${colors.inputBorder}`,
      borderRadius: '12px',
      color: colors.text,
      padding: '10px 14px',
    },
    inputFocus: {
      borderColor: accent,
      boxShadow: `0 0 0 3px ${accent}25`,
    },

    // Buttons
    btnPrimary: {
      background: `linear-gradient(135deg, ${accent}, ${accent}dd)`,
      color: '#ffffff',
      border: 'none',
      borderRadius: '12px',
      padding: '10px 20px',
      fontWeight: 600,
      cursor: 'pointer',
      boxShadow: `0 4px 14px ${accent}40`,
    },
    btnSecondary: {
      backgroundColor: colors.badgeBg,
      color: colors.text,
      border: `1px solid ${colors.border}`,
      borderRadius: '12px',
      padding: '10px 20px',
      fontWeight: 500,
      cursor: 'pointer',
    },
    btnGhost: {
      backgroundColor: 'transparent',
      color: colors.textSecondary,
      border: 'none',
      borderRadius: '12px',
      padding: '10px 20px',
      cursor: 'pointer',
    },

    // Headers & text
    heading: { color: colors.text, fontWeight: 800 },
    subheading: { color: colors.textSecondary, fontWeight: 500 },
    muted: { color: colors.textTertiary },
    link: { color: accent, textDecoration: 'none', cursor: 'pointer' },

    // Badges
    badge: {
      backgroundColor: colors.badgeBg,
      color: colors.textSecondary,
      borderRadius: '9999px',
      padding: '4px 12px',
      fontSize: '12px',
      fontWeight: 600,
    },
    badgeAccent: {
      backgroundColor: `${accent}15`,
      color: accent,
      borderRadius: '9999px',
      padding: '4px 12px',
      fontSize: '12px',
      fontWeight: 600,
    },
    badgeSuccess: {
      backgroundColor: colors.successBg,
      color: colors.success,
      borderRadius: '9999px',
      padding: '4px 12px',
      fontSize: '12px',
      fontWeight: 600,
    },
    badgeWarning: {
      backgroundColor: colors.warningBg,
      color: colors.warning,
      borderRadius: '9999px',
      padding: '4px 12px',
      fontSize: '12px',
      fontWeight: 600,
    },
    badgeError: {
      backgroundColor: colors.errorBg,
      color: colors.error,
      borderRadius: '9999px',
      padding: '4px 12px',
      fontSize: '12px',
      fontWeight: 600,
    },

    // Status colors
    statusColors: {
      success:  colors.success,
      warning:  colors.warning,
      error:    colors.error,
      info:     colors.info,
    },

    // Divider
    divider: {
      borderTop: `1px solid ${colors.divider}`,
    },

    // Loading skeleton
    skeleton: {
      backgroundColor: colors.skeleton,
      backgroundImage: `linear-gradient(90deg, ${colors.skeleton} 25%, ${colors.skeletonShimmer} 50%, ${colors.skeleton} 75%)`,
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      borderRadius: '8px',
    },

    // Overlay
    overlay: {
      backgroundColor: colors.overlay,
      backdropFilter: 'blur(4px)',
    },

    // Table
    table: {
      header: { backgroundColor: colors.bgAlt, color: colors.textSecondary, fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' },
      row: { borderBottom: `1px solid ${colors.borderSubtle}` },
      rowHover: { backgroundColor: colors.surfaceHover },
      cell: { padding: '12px 16px', color: colors.text },
    },

    // Scrollbar
    scrollbar: {
      '&::-webkit-scrollbar': { width: '6px', height: '6px' },
      '&::-webkit-scrollbar-track': { background: 'transparent' },
      '&::-webkit-scrollbar-thumb': { background: colors.scrollbar, borderRadius: '3px' },
      '&::-webkit-scrollbar-thumb:hover': { background: colors.scrollbarHover },
    },

    // Section
    section: {
      backgroundColor: colors.bgAlt,
      borderRadius: '20px',
      padding: '24px',
      border: `1px solid ${colors.borderSubtle}`,
    },

    // Stat card
    statCard: {
      backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: '16px',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    },
  };
}

// ── Tailwind Class Generators ────────────────────────────────────────────────

function buildTw(isDark, isBlack) {
  const d = isDark; // shorthand
  return {
    // Backgrounds
    pageBg:     d ? (isBlack ? 'bg-black'          : 'bg-slate-900')        : 'bg-slate-50',
    surfaceBg:  d ? (isBlack ? 'bg-zinc-950'       : 'bg-slate-800')        : 'bg-white',
    altBg:      d ? (isBlack ? 'bg-zinc-900'       : 'bg-slate-800/50')     : 'bg-slate-100',
    cardBg:     d ? (isBlack ? 'bg-zinc-950'       : 'bg-slate-800')        : 'bg-white',
    hoverBg:    d ? (isBlack ? 'hover:bg-zinc-900' : 'hover:bg-slate-700')  : 'hover:bg-slate-50',

    // Text
    textPrimary:   d ? 'text-slate-100'   : 'text-slate-900',
    textSecondary: d ? 'text-slate-400'   : 'text-slate-600',
    textTertiary:  d ? 'text-slate-500'   : 'text-slate-500',
    textMuted:     d ? 'text-slate-600'   : 'text-slate-400',

    // Borders
    border:       d ? (isBlack ? 'border-zinc-800'  : 'border-slate-700')   : 'border-slate-200',
    borderSubtle: d ? (isBlack ? 'border-zinc-900'  : 'border-slate-700/50'): 'border-slate-100',
    divider:      d ? (isBlack ? 'divide-zinc-800'  : 'divide-slate-700')   : 'divide-slate-200',

    // Ring / Focus
    ring:        `ring-2 ring-offset-2 ${d ? 'ring-offset-slate-900' : 'ring-offset-white'}`,
    focusRing:   'focus:ring-2 focus:ring-blue-500/40 focus:outline-none',

    // Shadows
    shadow:      d ? 'shadow-xl shadow-black/20'  : 'shadow-lg shadow-slate-200/60',
    shadowSm:    d ? 'shadow-md shadow-black/20'  : 'shadow-sm shadow-slate-200/60',

    // Transitions
    transition: 'transition-all duration-200 ease-in-out',
    transitionSlow: 'transition-all duration-500 ease-out',

    // Rounded
    rounded:   'rounded-2xl',
    roundedSm: 'rounded-xl',
    roundedFull: 'rounded-full',

    // Grid helpers
    grid2: 'grid grid-cols-1 md:grid-cols-2 gap-6',
    grid3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
    grid4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6',

    // Flex helpers
    flexBetween: 'flex items-center justify-between',
    flexCenter:  'flex items-center justify-center',
    flexCol:     'flex flex-col',
    flexGap:     'flex items-center gap-3',

    // Animations
    fadeIn:      'animate-fadeIn',
    slideUp:     'animate-slideUp',
    scaleIn:     'animate-scaleIn',
    pulse:       'animate-pulse',
  };
}

// ── Main Hook ────────────────────────────────────────────────────────────────

export function useThemeStyles() {
  const { mode, isDark, isBlack, accent } = useTheme();

  return useMemo(() => {
    const colors  = PALETTES[mode] || PALETTES.light;
    const accentColor = accent?.primary || '#3b82f6';
    const styles  = buildStyles(colors, accentColor, mode);
    const tw      = buildTw(isDark, isBlack);
    const chart   = getChartTheme(colors, accentColor);

    return {
      // Raw tokens
      mode,
      isDark,
      isBlack,
      colors,
      accent: accentColor,

      // Pre-built style objects
      styles,

      // Tailwind classname helpers
      tw,

      // Chart theme
      chart,

      // Convenience: build inline style merging multiple presets
      mergeStyles: (...styleKeys) => {
        return styleKeys.reduce((merged, key) => {
          if (typeof key === 'string' && styles[key]) return { ...merged, ...styles[key] };
          if (typeof key === 'object') return { ...merged, ...key };
          return merged;
        }, {});
      },

      // Convenience: build className string
      cx: (...classes) => classes.filter(Boolean).join(' '),

      // Status color lookup
      statusColor: (status) => {
        const map = { success: colors.success, warning: colors.warning, error: colors.error, info: colors.info };
        return map[status] || colors.textSecondary;
      },

      // Gradient builder
      gradient: (from, to, direction = '135deg') => ({
        background: `linear-gradient(${direction}, ${from || accentColor}, ${to || '#8b5cf6'})`,
      }),
    };
  }, [mode, isDark, isBlack, accent]);
}

export default useThemeStyles;
