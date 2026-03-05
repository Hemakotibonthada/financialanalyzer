// ============================================================================
// Enterprise UI Component Library — Production-Grade Reusable Components
// ============================================================================
// Comprehensive library of themed, animated, accessible components.
// All components are theme-aware via MUI + Tailwind CSS integration.
// ============================================================================

import React, { useState, useRef, useEffect, useCallback, useMemo, forwardRef } from 'react';
import { useTheme } from '@mui/material/styles';
import { Box, Typography, IconButton, Chip, Avatar, LinearProgress, CircularProgress, Tooltip as MUITooltip } from '@mui/material';
import {
  TrendingUp, TrendingDown, TrendingFlat,
  ArrowUpward, ArrowDownward,
  CheckCircle, Warning, Error as ErrorIcon, Info,
  Close, ExpandMore, ExpandLess,
  Refresh,
} from '@mui/icons-material';
import { AnimatedCounter, useInView, FadeIn, StaggerChildren } from './AnimatedComponents';

// ============================================================================
// §1  STAT CARD — Key metric display with trend indicators
// ============================================================================

export function StatCard({
  title,
  value,
  prefix = '',
  suffix = '',
  trend,
  trendValue,
  trendLabel,
  icon,
  color = 'primary',
  variant = 'default', // 'default' | 'gradient' | 'glass' | 'outlined'
  loading = false,
  onClick,
  className = '',
  animateValue = true,
  decimals = 0,
  size = 'medium', // 'small' | 'medium' | 'large'
}) {
  const theme = useTheme();
  const [ref, isInView] = useInView({ threshold: 0.2 });

  const colorMap = {
    primary: { bg: 'from-blue-500 to-blue-600', light: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
    success: { bg: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
    warning: { bg: 'from-amber-500 to-amber-600', light: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
    danger: { bg: 'from-red-500 to-red-600', light: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
    purple: { bg: 'from-violet-500 to-violet-600', light: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800' },
    indigo: { bg: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
  };

  const colors = colorMap[color] || colorMap.primary;
  const sizeClasses = {
    small: 'p-3',
    medium: 'p-5',
    large: 'p-6',
  };

  const valueSizes = {
    small: 'text-xl',
    medium: 'text-2xl sm:text-3xl',
    large: 'text-3xl sm:text-4xl',
  };

  const variantClasses = {
    default: `bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md`,
    gradient: `bg-gradient-to-br ${colors.bg} text-white shadow-lg hover:shadow-xl`,
    glass: `bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 shadow-lg`,
    outlined: `bg-transparent border-2 ${colors.border}`,
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : TrendingFlat;
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400';

  if (loading) {
    return (
      <div className={`rounded-2xl ${sizeClasses[size]} ${variantClasses[variant]} ${className} animate-pulse`}>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      onClick={onClick}
      className={`
        rounded-2xl ${sizeClasses[size]} ${variantClasses[variant]}
        transition-all duration-300 card-animated
        ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}
        ${className}
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <p className={`text-sm font-medium ${variant === 'gradient' ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
          {title}
        </p>
        {icon && (
          <div className={`${variant === 'gradient' ? 'bg-white/20' : colors.light} p-2 rounded-xl`}>
            {icon}
          </div>
        )}
      </div>

      <div className={`${valueSizes[size]} font-bold tracking-tight ${variant === 'gradient' ? '' : 'text-gray-900 dark:text-white'}`}>
        {animateValue && typeof value === 'number' ? (
          <AnimatedCounter end={value} prefix={prefix} suffix={suffix} decimals={decimals} />
        ) : (
          <>{prefix}{value}{suffix}</>
        )}
      </div>

      {(trend || trendValue) && (
        <div className={`flex items-center gap-1.5 mt-2 text-sm ${variant === 'gradient' ? 'text-white/70' : ''}`}>
          <TrendIcon className={`w-4 h-4 ${variant === 'gradient' ? '' : trendColor}`} />
          <span className={`font-medium ${variant === 'gradient' ? '' : trendColor}`}>
            {trendValue}
          </span>
          {trendLabel && (
            <span className={variant === 'gradient' ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'}>
              {trendLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// §2  STATUS INDICATOR — Dot + label with animation
// ============================================================================

export function StatusIndicator({ status = 'success', label, pulse = true, size = 'sm', className = '' }) {
  const statusConfig = {
    success: { color: 'bg-emerald-500', ring: 'ring-emerald-200 dark:ring-emerald-800' },
    warning: { color: 'bg-amber-500', ring: 'ring-amber-200 dark:ring-amber-800' },
    error: { color: 'bg-red-500', ring: 'ring-red-200 dark:ring-red-800' },
    info: { color: 'bg-blue-500', ring: 'ring-blue-200 dark:ring-blue-800' },
    inactive: { color: 'bg-gray-400', ring: 'ring-gray-200 dark:ring-gray-700' },
  };

  const cfg = statusConfig[status] || statusConfig.info;
  const dotSize = size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative flex">
        {pulse && status !== 'inactive' && (
          <span className={`absolute inline-flex h-full w-full rounded-full ${cfg.color} opacity-75 animate-ping`} />
        )}
        <span className={`relative inline-flex rounded-full ${dotSize} ${cfg.color}`} />
      </span>
      {label && <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">{label}</span>}
    </div>
  );
}

// ============================================================================
// §3  METRIC COMPARISON — Side-by-side metric comparison
// ============================================================================

export function MetricComparison({
  label,
  current,
  previous,
  // Alternate prop names used by some callers
  label1,
  value1,
  label2,
  value2,
  prefix = '₹',
  format = 'number',
  className = '',
}) {
  // Support both naming conventions: (current/previous) and (value1/value2)
  const cur = current ?? value1 ?? 0;
  const prev = previous ?? value2 ?? 0;
  const displayLabel = label || (label1 && label2 ? `${label1} vs ${label2}` : 'Comparison');

  const diff = cur - prev;
  const percentChange = prev !== 0 ? ((diff / Math.abs(prev)) * 100).toFixed(1) : (diff === 0 ? '0.0' : '∞');
  const isPositive = diff > 0;
  const isNeutral = diff === 0;

  return (
    <div className={`flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700/50 last:border-0 ${className}`}>
      <span className="text-sm text-gray-600 dark:text-gray-400">{displayLabel}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {prefix}{Number(cur).toLocaleString('en-IN')}
        </span>
        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
          isNeutral ? 'bg-gray-100 dark:bg-gray-700 text-gray-500' :
          isPositive ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' :
          'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
        }`}>
          {!isNeutral && (isPositive ? <ArrowUpward sx={{ fontSize: 12 }} /> : <ArrowDownward sx={{ fontSize: 12 }} />)}
          {percentChange}%
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// §4  PROGRESS RING — Circular progress with value display
// ============================================================================

export function ProgressRing({
  value = 0,
  max = 100,
  size = 120,
  strokeWidth = 8,
  color = '#3b82f6',
  trackColor,
  label,
  sublabel,
  animated = true,
  className = '',
}) {
  const [ref, isInView] = useInView({ threshold: 0.3 });
  const theme = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min(100, (value / max) * 100);
  const offset = circumference - (percentage / 100) * circumference;

  const tc = trackColor || (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)');

  return (
    <div ref={ref} className={`inline-flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={tc} strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={isInView && animated ? offset : circumference}
            style={{ transition: animated ? 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' : 'none' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {Math.round(percentage)}%
          </span>
          {sublabel && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{sublabel}</span>
          )}
        </div>
      </div>
      {label && (
        <span className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">{label}</span>
      )}
    </div>
  );
}

// ============================================================================
// §5  EMPTY STATE — Beautiful empty/error/loading states
// ============================================================================

export function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  variant = 'empty', // 'empty' | 'error' | 'no-results' | 'success'
  className = '',
}) {
  const iconMap = {
    empty: <Info sx={{ fontSize: 48 }} className="text-gray-300 dark:text-gray-600" />,
    error: <ErrorIcon sx={{ fontSize: 48 }} className="text-red-300 dark:text-red-600" />,
    'no-results': <Info sx={{ fontSize: 48 }} className="text-amber-300 dark:text-amber-600" />,
    success: <CheckCircle sx={{ fontSize: 48 }} className="text-emerald-300 dark:text-emerald-600" />,
  };

  return (
    <FadeIn className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
      <div className="mb-4">
        {icon || iconMap[variant]}
      </div>
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
        {title || 'No data available'}
      </h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {actionLabel || 'Take Action'}
        </button>
      )}
    </FadeIn>
  );
}

// ============================================================================
// §6  DATA TABLE — Enhanced sortable, filterable data table
// ============================================================================

export function EnhancedDataTable({
  columns,
  data,
  loading = false,
  sortable = true,
  pageSize = 10,
  emptyMessage = 'No data to display',
  onRowClick,
  className = '',
  stickyHeader = true,
  striped = true,
  hoverable = true,
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(0);

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortable) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });
  }, [data, sortConfig, sortable]);

  const paginatedData = sortedData.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const totalPages = Math.ceil(data.length / pageSize);

  const handleSort = (key) => {
    if (!sortable) return;
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden ${className}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-100 dark:border-gray-700/50 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6" />
          </div>
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/50 ${className}`}>
        <EmptyState title={emptyMessage} variant="empty" />
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={`${stickyHeader ? 'sticky top-0 z-10' : ''} bg-gray-50 dark:bg-gray-800/90 backdrop-blur-sm`}>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider
                    ${sortable ? 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none' : ''}
                    ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}
                  `}
                  style={{ width: col.width }}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortConfig.key === col.key && (
                      sortConfig.direction === 'asc' ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/30">
            {paginatedData.map((row, rowIdx) => (
              <tr
                key={row.id || rowIdx}
                onClick={() => onRowClick?.(row)}
                className={`
                  transition-colors duration-150 table-row-animated
                  ${striped && rowIdx % 2 === 1 ? 'bg-gray-25 dark:bg-gray-800/50' : ''}
                  ${hoverable ? 'hover:bg-blue-50/50 dark:hover:bg-blue-900/10' : ''}
                  ${onRowClick ? 'cursor-pointer' : ''}
                `}
                style={{ animationDelay: `${rowIdx * 30}ms` }}
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm text-gray-700 dark:text-gray-300
                      ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}
                    `}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700/50">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, data.length)} of {data.length}
          </span>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === i
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// §7  FINANCIAL SCORE GAUGE — Health/Credit score visualization
// ============================================================================

export function ScoreGauge({
  score = 0,
  maxScore = 100,
  label = 'Score',
  size = 200,
  levels = [
    { min: 0, max: 30, color: '#ef4444', label: 'Poor' },
    { min: 30, max: 50, color: '#f59e0b', label: 'Fair' },
    { min: 50, max: 70, color: '#eab308', label: 'Good' },
    { min: 70, max: 85, color: '#22c55e', label: 'Very Good' },
    { min: 85, max: 100, color: '#10b981', label: 'Excellent' },
  ],
  animated = true,
  className = '',
}) {
  const [ref, isInView] = useInView({ threshold: 0.3 });
  const [displayScore, setDisplayScore] = useState(0);
  const percentage = Math.min(100, (score / maxScore) * 100);
  const currentLevel = levels.find(l => percentage >= l.min && percentage <= l.max) || levels[0];

  useEffect(() => {
    if (!isInView || !animated) {
      setDisplayScore(score);
      return;
    }
    let start = 0;
    const duration = 1500;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplayScore(Math.round(eased * score));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [isInView, score, animated]);

  const strokeWidth = 12;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = Math.PI * radius; // Semi-circle
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div ref={ref} className={`inline-flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width: size, height: size / 2 + 30 }}>
        <svg width={size} height={size / 2 + strokeWidth} viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}>
          {/* Track */}
          <path
            d={`M ${strokeWidth} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth} ${size / 2}`}
            fill="none"
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Progress */}
          <path
            d={`M ${strokeWidth} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth} ${size / 2}`}
            fill="none"
            stroke={currentLevel.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={isInView ? offset : circumference}
            style={{ transition: animated ? 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">{displayScore}</span>
          <span className="text-sm font-semibold" style={{ color: currentLevel.color }}>{currentLevel.label}</span>
        </div>
      </div>
      <span className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">{label}</span>
    </div>
  );
}

// ============================================================================
// §8  TIMELINE — Activity/Transaction timeline
// ============================================================================

export function Timeline({ items = [], className = '' }) {
  return (
    <div className={`relative ${className}`}>
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

      <StaggerChildren staggerDelay={80} className="space-y-4">
        {items.map((item, idx) => (
          <div key={item.id || idx} className="relative flex items-start gap-4 pl-10">
            {/* Dot */}
            <div className={`absolute left-2.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 ${
              item.type === 'success' ? 'bg-emerald-500' :
              item.type === 'warning' ? 'bg-amber-500' :
              item.type === 'error' ? 'bg-red-500' :
              'bg-blue-500'
            }`} />

            {/* Content */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</h4>
                  {item.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.description}</p>
                  )}
                </div>
                {item.amount && (
                  <span className={`text-sm font-bold ${item.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {item.amount > 0 ? '+' : ''}₹{Math.abs(item.amount).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              {item.timestamp && (
                <span className="text-xs text-gray-400 mt-2 block">{item.timestamp}</span>
              )}
              {item.tags && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </StaggerChildren>
    </div>
  );
}

// ============================================================================
// §9  INSIGHT CARD — AI insight/recommendation display
// ============================================================================

export function InsightCard({
  type = 'info', // 'info' | 'warning' | 'success' | 'danger' | 'tip'
  title,
  description,
  action,
  actionLabel,
  impact,
  confidence,
  icon,
  dismissible = true,
  className = '',
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const typeConfig = {
    info: { bg: 'bg-blue-50 dark:bg-blue-900/15', border: 'border-blue-200 dark:border-blue-800/50', icon: <Info className="text-blue-500" />, accent: 'text-blue-700 dark:text-blue-300' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-900/15', border: 'border-amber-200 dark:border-amber-800/50', icon: <Warning className="text-amber-500" />, accent: 'text-amber-700 dark:text-amber-300' },
    success: { bg: 'bg-emerald-50 dark:bg-emerald-900/15', border: 'border-emerald-200 dark:border-emerald-800/50', icon: <CheckCircle className="text-emerald-500" />, accent: 'text-emerald-700 dark:text-emerald-300' },
    danger: { bg: 'bg-red-50 dark:bg-red-900/15', border: 'border-red-200 dark:border-red-800/50', icon: <ErrorIcon className="text-red-500" />, accent: 'text-red-700 dark:text-red-300' },
    tip: { bg: 'bg-violet-50 dark:bg-violet-900/15', border: 'border-violet-200 dark:border-violet-800/50', icon: <Info className="text-violet-500" />, accent: 'text-violet-700 dark:text-violet-300' },
  };

  const cfg = typeConfig[type];

  return (
    <FadeIn className={`${cfg.bg} border ${cfg.border} rounded-xl p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {icon || cfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-semibold ${cfg.accent}`}>{title}</h4>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            {action && (
              <button
                onClick={action}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                {actionLabel || 'Learn more'}
              </button>
            )}
            {impact && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Impact: <strong>{impact}</strong>
              </span>
            )}
            {confidence != null && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Confidence: {Math.round(confidence * 100)}%
              </span>
            )}
          </div>
        </div>
        {dismissible && (
          <IconButton size="small" onClick={() => setDismissed(true)} className="flex-shrink-0">
            <Close sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </div>
    </FadeIn>
  );
}

// ============================================================================
// §10  MINI SPARKLINE — Inline trend chart
// ============================================================================

export function Sparkline({
  data = [],
  width = 100,
  height = 30,
  color = '#3b82f6',
  fillOpacity = 0.1,
  strokeWidth = 1.5,
  animated = true,
  className = '',
}) {
  const [ref, isInView] = useInView({ threshold: 0.3 });

  if (!data.length) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  const fillPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg
      ref={ref}
      width={width}
      height={height}
      className={`overflow-visible ${className}`}
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* Fill */}
      <polygon
        points={fillPoints}
        fill={color}
        opacity={fillOpacity}
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animated && isInView ? 'sparkline-animated' : ''}
        style={{ strokeDasharray: animated ? 500 : 'none' }}
      />
    </svg>
  );
}

// ============================================================================
// §11  CATEGORY PILL — Color-coded category tag
// ============================================================================

const categoryColors = {
  food: { bg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  transport: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  shopping: { bg: 'bg-pink-100 dark:bg-pink-900/20', text: 'text-pink-700 dark:text-pink-400', dot: 'bg-pink-500' },
  entertainment: { bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-400', dot: 'bg-purple-500' },
  health: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  education: { bg: 'bg-indigo-100 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-400', dot: 'bg-indigo-500' },
  utilities: { bg: 'bg-cyan-100 dark:bg-cyan-900/20', text: 'text-cyan-700 dark:text-cyan-400', dot: 'bg-cyan-500' },
  salary: { bg: 'bg-emerald-100 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  investment: { bg: 'bg-teal-100 dark:bg-teal-900/20', text: 'text-teal-700 dark:text-teal-400', dot: 'bg-teal-500' },
  rent: { bg: 'bg-amber-100 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  other: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400', dot: 'bg-gray-400' },
};

export function CategoryPill({ category, className = '' }) {
  const cat = (category || 'other').toLowerCase();
  const colors = categoryColors[cat] || categoryColors.other;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {category || 'Other'}
    </span>
  );
}

// ============================================================================
// §12  SECTION HEADER — Page section with optional action
// ============================================================================

export function SectionHeader({
  title,
  subtitle,
  action,
  actionLabel,
  actionIcon,
  badge,
  className = '',
}) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
          {badge && (
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-full">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && (
        <button
          onClick={action}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
        >
          {actionIcon}
          {actionLabel || 'View All'}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// §13  LOADING OVERLAY — Full-page loading with animation
// ============================================================================

export function LoadingOverlay({ message = 'Loading...', variant = 'spinner' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm modal-backdrop-enter">
      <div className="flex flex-col items-center gap-4 modal-content-enter">
        {variant === 'spinner' && (
          <CircularProgress size={48} thickness={3} />
        )}
        {variant === 'dots' && (
          <div className="loading-dots flex gap-2">
            <span className="bg-blue-500" />
            <span className="bg-blue-500" />
            <span className="bg-blue-500" />
          </div>
        )}
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{message}</p>
      </div>
    </div>
  );
}

// ============================================================================
// §14  QUICK ACTION BUTTON — Compact action with icon
// ============================================================================

export function QuickAction({ icon, label, onClick, color = 'blue', disabled = false, className = '' }) {
  const colorMap = {
    blue: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    red: 'bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400',
    purple: 'bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/20 dark:hover:bg-violet-900/30 text-violet-600 dark:text-violet-400',
    amber: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl ${colorMap[color]} 
        transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      <div className="text-2xl">{icon}</div>
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}

// ============================================================================
// §15  ANIMATED NUMBER DISPLAY — Large animated financial number
// ============================================================================

export function AnimatedNumber({
  value,
  prefix = '₹',
  suffix = '',
  trend,
  trendValue,
  label,
  size = 'xl',
  className = '',
}) {
  const [ref, isInView] = useInView({ threshold: 0.3 });
  const sizeMap = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
    '2xl': 'text-5xl',
  };

  return (
    <div ref={ref} className={`${className}`}>
      {label && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      )}
      <div className={`${sizeMap[size]} font-bold text-gray-900 dark:text-white tabular-nums`}>
        <AnimatedCounter
          end={typeof value === 'number' ? value : 0}
          prefix={prefix}
          suffix={suffix}
          decimals={value < 100 ? 2 : 0}
        />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 mt-1 text-sm ${
          trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400'
        }`}>
          {trend === 'up' ? <TrendingUp sx={{ fontSize: 16 }} /> : trend === 'down' ? <TrendingDown sx={{ fontSize: 16 }} /> : <TrendingFlat sx={{ fontSize: 16 }} />}
          <span className="font-medium">{trendValue}</span>
        </div>
      )}
    </div>
  );
}

export default {
  StatCard,
  StatusIndicator,
  MetricComparison,
  ProgressRing,
  EmptyState,
  EnhancedDataTable,
  ScoreGauge,
  Timeline,
  InsightCard,
  Sparkline,
  CategoryPill,
  SectionHeader,
  LoadingOverlay,
  QuickAction,
  AnimatedNumber,
};
