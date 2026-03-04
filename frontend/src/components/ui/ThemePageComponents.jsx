/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  Enterprise Theme-Aware Page Components
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *  Drop-in components that automatically sync with ThemeContext (light/dark/black
 *  modes + accent colors).  Every page should wrap its content in <PageShell>.
 *
 *  Components:
 *    <PageShell>        – full-page gradient background + scroll container
 *    <SectionCard>      – glassmorphism card with theme borders
 *    <StatTile>         – animated stat with label/value/trend
 *    <ChartCard>        – chart-ready card with header + optional actions
 *    <FilterBar>        – responsive filter/search bar
 *    <EmptyPlaceholder> – empty state with icon + message
 *    <PageLoader>       – full-screen spinner
 *    <ThemeGradientText>– gradient text using accent color
 *    <IconBadge>        – circle icon badge with accent glow
 *    <StatusPill>       – success/warning/error badge
 *    <DataTable>        – lightweight themed table
 *    <ProgressBar>      – themed animated progress bar
 *
 *  All components read mode/accent from ThemeContext automatically.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { forwardRef, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { RefreshCw, Inbox, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                     */
/* ──────────────────────────────────────────────────────────────────────────── */

const PALETTES = {
  light: {
    bg: 'bg-slate-50',
    bgGrad: 'from-blue-50/60 via-indigo-50/40 to-purple-50/30',
    card: 'bg-white border-slate-200/70',
    cardHover: 'hover:shadow-lg hover:shadow-blue-500/5',
    glass: 'bg-white/70 backdrop-blur-xl border-white/20',
    text: 'text-slate-900',
    textSec: 'text-slate-600',
    textTer: 'text-slate-400',
    input: 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400',
    divider: 'border-slate-200/70',
    hover: 'hover:bg-slate-100',
    ring: 'ring-slate-200',
    skeleton: 'bg-slate-200',
    badge: 'bg-slate-100 text-slate-600',
    tableBg: 'bg-white',
    tableHeader: 'bg-slate-50 text-slate-600',
    tableRow: 'border-slate-100',
    tableRowHover: 'hover:bg-blue-50/50',
  },
  dark: {
    bg: 'bg-slate-900',
    bgGrad: 'from-slate-900 via-slate-900 to-slate-900',
    card: 'bg-slate-800/90 border-slate-700/50',
    cardHover: 'hover:shadow-lg hover:shadow-blue-500/10',
    glass: 'bg-slate-800/60 backdrop-blur-xl border-slate-700/30',
    text: 'text-white',
    textSec: 'text-slate-300',
    textTer: 'text-slate-500',
    input: 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500',
    divider: 'border-slate-700/50',
    hover: 'hover:bg-slate-700/50',
    ring: 'ring-slate-700',
    skeleton: 'bg-slate-700',
    badge: 'bg-slate-700 text-slate-300',
    tableBg: 'bg-slate-800/90',
    tableHeader: 'bg-slate-800 text-slate-400',
    tableRow: 'border-slate-700/50',
    tableRowHover: 'hover:bg-slate-700/40',
  },
  black: {
    bg: 'bg-black',
    bgGrad: 'from-black via-gray-950 to-black',
    card: 'bg-gray-900/90 border-gray-800/60',
    cardHover: 'hover:shadow-lg hover:shadow-blue-500/10',
    glass: 'bg-gray-900/60 backdrop-blur-xl border-gray-800/30',
    text: 'text-white',
    textSec: 'text-gray-300',
    textTer: 'text-gray-600',
    input: 'bg-gray-900 border-gray-800 text-white placeholder:text-gray-600',
    divider: 'border-gray-800/50',
    hover: 'hover:bg-gray-800/50',
    ring: 'ring-gray-800',
    skeleton: 'bg-gray-800',
    badge: 'bg-gray-800 text-gray-300',
    tableBg: 'bg-gray-900/90',
    tableHeader: 'bg-gray-900 text-gray-500',
    tableRow: 'border-gray-800/50',
    tableRowHover: 'hover:bg-gray-800/40',
  },
};

function useP() {
  const { mode } = useTheme();
  return PALETTES[mode] || PALETTES.light;
}

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  PageShell                                                                   */
/* ──────────────────────────────────────────────────────────────────────────── */

export const PageShell = forwardRef(({ children, className = '', noPadding = false, gradient = true }, ref) => {
  const p = useP();
  return (
    <div
      ref={ref}
      className={cx(
        'min-h-screen transition-colors duration-300',
        gradient ? `bg-gradient-to-br ${p.bgGrad}` : p.bg,
        !noPadding && 'p-4 sm:p-6 lg:p-8',
        className,
      )}
    >
      {children}
    </div>
  );
});
PageShell.displayName = 'PageShell';

/* ──────────────────────────────────────────────────────────────────────────── */
/*  SectionCard                                                                 */
/* ──────────────────────────────────────────────────────────────────────────── */

export const SectionCard = forwardRef((
  { children, title, subtitle, icon: Icon, actions, className = '', glass = false, noPadding = false, onClick },
  ref
) => {
  const p = useP();
  return (
    <div
      ref={ref}
      onClick={onClick}
      className={cx(
        'rounded-2xl border transition-all duration-300',
        glass ? p.glass : p.card,
        p.cardHover,
        !noPadding && 'p-5 sm:p-6',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                <Icon className={cx('w-5 h-5', p.textSec)} />
              </div>
            )}
            <div>
              <h3 className={cx('font-semibold text-lg', p.text)}>{title}</h3>
              {subtitle && <p className={cx('text-sm mt-0.5', p.textTer)}>{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
});
SectionCard.displayName = 'SectionCard';

/* ──────────────────────────────────────────────────────────────────────────── */
/*  StatTile                                                                    */
/* ──────────────────────────────────────────────────────────────────────────── */

export function StatTile({ label, value, trend, trendValue, icon: Icon, color = 'blue', className = '' }) {
  const p = useP();
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : p.textTer;

  return (
    <div className={cx('rounded-2xl border p-5 transition-all duration-300', p.card, p.cardHover, className)}>
      <div className="flex items-center justify-between mb-3">
        <span className={cx('text-sm font-medium', p.textSec)}>{label}</span>
        {Icon && <Icon className={cx('w-5 h-5', p.textTer)} />}
      </div>
      <div className={cx('text-2xl font-bold', p.text)}>{value}</div>
      {(trend || trendValue) && (
        <div className={cx('flex items-center gap-1 mt-2 text-sm', trendColor)}>
          <TrendIcon className="w-4 h-4" />
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  ChartCard                                                                   */
/* ──────────────────────────────────────────────────────────────────────────── */

export function ChartCard({ title, subtitle, children, actions, height = 300, className = '' }) {
  const p = useP();
  return (
    <div className={cx('rounded-2xl border p-5 sm:p-6 transition-all duration-300', p.card, p.cardHover, className)}>
      {title && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={cx('font-semibold', p.text)}>{title}</h3>
            {subtitle && <p className={cx('text-sm mt-0.5', p.textTer)}>{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div style={{ height }}>{children}</div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  FilterBar                                                                   */
/* ──────────────────────────────────────────────────────────────────────────── */

export function FilterBar({ children, className = '' }) {
  const p = useP();
  return (
    <div className={cx(
      'rounded-2xl border p-3 sm:p-4 flex flex-wrap items-center gap-3 transition-all duration-300',
      p.card,
      className,
    )}>
      {children}
    </div>
  );
}

export function FilterInput({ icon: Icon, ...props }) {
  const p = useP();
  return (
    <div className="relative flex-1 min-w-[180px]">
      {Icon && <Icon className={cx('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4', p.textTer)} />}
      <input
        {...props}
        className={cx(
          'w-full rounded-xl border px-4 py-2 text-sm transition-all outline-none focus:ring-2 focus:ring-blue-500/30',
          Icon && 'pl-10',
          p.input,
        )}
      />
    </div>
  );
}

export function FilterSelect({ options = [], icon: Icon, ...props }) {
  const p = useP();
  return (
    <div className="relative min-w-[140px]">
      {Icon && <Icon className={cx('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4', p.textTer)} />}
      <select
        {...props}
        className={cx(
          'w-full rounded-xl border px-4 py-2 text-sm transition-all outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none',
          Icon && 'pl-10',
          p.input,
        )}
      >
        {options.map(opt => (
          <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
            {typeof opt === 'string' ? opt : opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  EmptyPlaceholder                                                            */
/* ──────────────────────────────────────────────────────────────────────────── */

export function EmptyPlaceholder({ icon: Icon = Inbox, title = 'No data yet', message, action, className = '' }) {
  const p = useP();
  return (
    <div className={cx('text-center py-16 px-4', className)}>
      <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 mb-4">
        <Icon className={cx('w-10 h-10', p.textTer)} />
      </div>
      <h3 className={cx('text-lg font-semibold mb-1', p.text)}>{title}</h3>
      {message && <p className={cx('text-sm max-w-md mx-auto', p.textTer)}>{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  PageLoader                                                                  */
/* ──────────────────────────────────────────────────────────────────────────── */

export function PageLoader({ text = 'Loading...', className = '' }) {
  const p = useP();
  return (
    <div className={cx('min-h-[60vh] flex items-center justify-center', className)}>
      <div className="text-center">
        <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
        <p className={cx('font-medium', p.textSec)}>{text}</p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  ThemeGradientText                                                           */
/* ──────────────────────────────────────────────────────────────────────────── */

export function ThemeGradientText({ children, as: Tag = 'span', className = '' }) {
  const { accent } = useTheme();
  return (
    <Tag className={cx('bg-gradient-to-r bg-clip-text text-transparent', accent?.gradient || 'from-blue-500 to-purple-500', className)}>
      {children}
    </Tag>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  IconBadge                                                                   */
/* ──────────────────────────────────────────────────────────────────────────── */

export function IconBadge({ icon: Icon, color = 'blue', size = 'md', className = '' }) {
  const sizes = { sm: 'p-1.5', md: 'p-2.5', lg: 'p-3.5' };
  const iconSizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };
  const colorMap = {
    blue: 'from-blue-500/15 to-cyan-500/15 text-blue-500',
    green: 'from-emerald-500/15 to-teal-500/15 text-emerald-500',
    red: 'from-red-500/15 to-orange-500/15 text-red-500',
    purple: 'from-purple-500/15 to-pink-500/15 text-purple-500',
    amber: 'from-amber-500/15 to-yellow-500/15 text-amber-500',
    teal: 'from-teal-500/15 to-cyan-500/15 text-teal-500',
  };

  return (
    <div className={cx('rounded-xl bg-gradient-to-br', sizes[size], colorMap[color] || colorMap.blue, className)}>
      <Icon className={iconSizes[size]} />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  StatusPill                                                                  */
/* ──────────────────────────────────────────────────────────────────────────── */

export function StatusPill({ status, label, className = '' }) {
  const colorMap = {
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
    neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  };

  return (
    <span className={cx('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium', colorMap[status] || colorMap.neutral, className)}>
      <span className={cx('w-1.5 h-1.5 rounded-full', {
        'bg-emerald-500': status === 'success',
        'bg-amber-500': status === 'warning',
        'bg-red-500': status === 'error',
        'bg-blue-500': status === 'info',
        'bg-slate-400': !status || status === 'neutral',
      }[status] || 'bg-slate-400')} />
      {label}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  DataTable                                                                   */
/* ──────────────────────────────────────────────────────────────────────────── */

export function DataTable({ columns = [], data = [], className = '', onRowClick }) {
  const p = useP();

  return (
    <div className={cx('overflow-x-auto rounded-xl border', p.divider)}>
      <table className={cx('w-full text-sm', p.tableBg)}>
        <thead>
          <tr className={cx('border-b text-left', p.tableHeader, p.tableRow)}>
            {columns.map((col, i) => (
              <th key={i} className={cx('px-4 py-3 font-medium', col.className)}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr
              key={row.id || rowIdx}
              onClick={() => onRowClick?.(row)}
              className={cx('border-b transition-colors', p.tableRow, p.tableRowHover, onRowClick && 'cursor-pointer')}
            >
              {columns.map((col, colIdx) => (
                <td key={colIdx} className={cx('px-4 py-3', p.text, col.cellClassName)}>
                  {col.render ? col.render(row, rowIdx) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center">
                <EmptyPlaceholder title="No data" />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  ProgressBar                                                                 */
/* ──────────────────────────────────────────────────────────────────────────── */

export function ProgressBar({ value = 0, max = 100, color = 'blue', label, showValue = true, height = 8, className = '' }) {
  const p = useP();
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const barColors = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
    dynamic: pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500',
  };

  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className={cx('text-sm font-medium', p.textSec)}>{label}</span>}
          {showValue && <span className={cx('text-sm', p.textTer)}>{Math.round(pct)}%</span>}
        </div>
      )}
      <div className={cx('rounded-full overflow-hidden', p.skeleton)} style={{ height }}>
        <div
          className={cx('h-full rounded-full transition-all duration-700 ease-out', barColors[color] || barColors.blue)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  ThemeButton                                                                 */
/* ──────────────────────────────────────────────────────────────────────────── */

export function ThemeButton({ children, variant = 'primary', size = 'md', icon: Icon, className = '', ...props }) {
  const p = useP();
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]',
    secondary: cx('border', p.card, p.text, p.hover),
    ghost: cx(p.text, p.hover),
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={cx(
        'inline-flex items-center gap-2 font-medium rounded-xl transition-all duration-200',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Default Export                                                              */
/* ──────────────────────────────────────────────────────────────────────────── */

export default {
  PageShell,
  SectionCard,
  StatTile,
  ChartCard,
  FilterBar,
  FilterInput,
  FilterSelect,
  EmptyPlaceholder,
  PageLoader,
  ThemeGradientText,
  IconBadge,
  StatusPill,
  DataTable,
  ProgressBar,
  ThemeButton,
};
