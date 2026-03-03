// ============================================================================
// State Components — Loading, Empty, Error state displays
// ============================================================================
// Enterprise-quality state management UI components with dark mode support,
// animations, and customizable content.
// ============================================================================

import React from 'react';
import {
  Inbox, Search, FileText, TrendingUp, PieChart, Target,
  CreditCard, Calendar, Shield, Zap, Brain, AlertTriangle,
  RefreshCw, Plus, ArrowRight, Download
} from 'lucide-react';

// ─── Loading Spinner ────────────────────────────────────────────────
export function LoadingSpinner({ size = 'md', text, className = '' }) {
  const sizes = { sm: 'h-6 w-6', md: 'h-10 w-10', lg: 'h-16 w-16', xl: 'h-24 w-24' };
  const isDark = document.documentElement.classList.contains('dark');
  
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className={`${sizes[size] || sizes.md} animate-spin rounded-full border-[3px] border-current border-t-transparent text-indigo-500`} />
      {text && <p className={`text-sm font-medium animate-pulse ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{text}</p>}
    </div>
  );
}

// ─── Full Page Loading ──────────────────────────────────────────────
export function PageLoading({ text = 'Loading...', icon: Icon = null }) {
  const isDark = document.documentElement.classList.contains('dark');
  
  return (
    <div className={`min-h-[60vh] flex items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
      <div className="text-center animate-fade-in">
        {Icon ? (
          <Icon className="w-12 h-12 text-indigo-500 mx-auto mb-4 animate-pulse" />
        ) : (
          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-indigo-500 border-t-transparent mx-auto mb-4" />
        )}
        <p className={`font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{text}</p>
      </div>
    </div>
  );
}

// ─── Skeleton Loader ────────────────────────────────────────────────
export function SkeletonLine({ width = '100%', height = '16px', className = '' }) {
  const isDark = document.documentElement.classList.contains('dark');
  return (
    <div
      className={`rounded animate-pulse ${isDark ? 'bg-slate-700' : 'bg-gray-200'} ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonCard({ lines = 3, className = '' }) {
  const isDark = document.documentElement.classList.contains('dark');
  return (
    <div className={`rounded-xl p-5 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} ${className}`}>
      <SkeletonLine width="40%" height="20px" className="mb-4" />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={`${80 - i * 15}%`} className="mb-2" />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4, className = '' }) {
  const isDark = document.documentElement.classList.contains('dark');
  return (
    <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} ${className}`}>
      {/* Header */}
      <div className={`flex gap-4 p-4 ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} width={`${100 / cols}%`} height="14px" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className={`flex gap-4 p-4 ${r < rows - 1 ? (isDark ? 'border-b border-slate-700' : 'border-b border-gray-100') : ''}`}>
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine key={c} width={`${100 / cols}%`} height="14px" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────
const EMPTY_PRESETS = {
  transactions: { icon: CreditCard, title: 'No Transactions Yet', message: 'Add your first transaction to start tracking your finances.', actionLabel: 'Add Transaction', actionPath: '/transactions' },
  budgets: { icon: PieChart, title: 'No Budgets Created', message: 'Create a budget to start managing your spending goals.', actionLabel: 'Create Budget', actionPath: '/budgets' },
  goals: { icon: Target, title: 'No Financial Goals', message: 'Set your first financial goal and start working towards it.', actionLabel: 'Set a Goal', actionPath: '/goals' },
  investments: { icon: TrendingUp, title: 'No Investments Tracked', message: 'Add your investments to monitor portfolio performance.', actionLabel: 'Add Investment', actionPath: '/investments' },
  reports: { icon: FileText, title: 'No Reports Yet', message: 'Generate your first financial report for detailed insights.', actionLabel: 'Generate Report', actionPath: '/reports' },
  search: { icon: Search, title: 'No Results Found', message: 'Try adjusting your search or filter criteria.' },
  data: { icon: Inbox, title: 'No Data Available', message: 'There\'s nothing to display here yet. Start by adding some data.' },
  calendar: { icon: Calendar, title: 'No Events', message: 'Your financial calendar is empty. Bills and EMIs will appear here.' },
  ai: { icon: Brain, title: 'No AI Insights Yet', message: 'Add more transactions to unlock AI-powered insights and recommendations.', actionLabel: 'View AI Dashboard', actionPath: '/ai-command-center' },
  automation: { icon: Zap, title: 'No Automation Rules', message: 'Create automation rules to let AI manage your finances.', actionLabel: 'Create Rule', actionPath: '/automation' },
};

export function EmptyState({
  preset,
  icon: CustomIcon,
  title,
  message,
  actionLabel,
  actionPath,
  onAction,
  className = '',
  compact = false,
}) {
  const isDark = document.documentElement.classList.contains('dark');
  const p = preset ? EMPTY_PRESETS[preset] : {};
  const Icon = CustomIcon || p.icon || Inbox;
  const displayTitle = title || p.title || 'Nothing Here';
  const displayMessage = message || p.message || '';
  const btnLabel = actionLabel || p.actionLabel;
  const btnPath = actionPath || p.actionPath;

  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-16'} ${className}`}>
      <div className={`inline-flex p-4 rounded-full mb-4 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
        <Icon className={`${compact ? 'w-8 h-8' : 'w-12 h-12'} ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
      </div>
      <h3 className={`${compact ? 'text-lg' : 'text-xl'} font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{displayTitle}</h3>
      {displayMessage && (
        <p className={`${compact ? 'text-xs max-w-xs' : 'text-sm max-w-md'} mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {displayMessage}
        </p>
      )}
      {(btnLabel && (onAction || btnPath)) && (
        <button
          onClick={onAction || (() => { if (btnPath) window.location.href = btnPath; })}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium text-sm"
        >
          <Plus className="w-4 h-4" /> {btnLabel}
        </button>
      )}
    </div>
  );
}

// ─── Error State ────────────────────────────────────────────────────
export function ErrorState({ error, onRetry, title, message, className = '' }) {
  const isDark = document.documentElement.classList.contains('dark');
  
  return (
    <div className={`flex flex-col items-center justify-center text-center py-16 ${className}`}>
      <div className={`inline-flex p-4 rounded-full mb-4 ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
        <AlertTriangle className="w-12 h-12 text-red-500" />
      </div>
      <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {title || 'Error Loading Data'}
      </h3>
      <p className={`text-sm max-w-md mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
        {message || error?.message || 'An unexpected error occurred. Please try again.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      )}
    </div>
  );
}

// ─── Status Badge ───────────────────────────────────────────────────
export function StatusBadge({ status, size = 'sm', className = '' }) {
  const configs = {
    active: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
    inactive: { bg: 'bg-gray-100 dark:bg-slate-700', text: 'text-gray-600 dark:text-slate-400', dot: 'bg-gray-400' },
    pending: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
    error: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
    success: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
    warning: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
    info: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  };
  const c = configs[status] || configs.info;
  const sizeClasses = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${c.bg} ${c.text} ${sizeClasses} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Data Stat Card ─────────────────────────────────────────────────
export function DataStatCard({ icon: Icon, label, value, change, changeLabel, color = 'blue', className = '' }) {
  const isDark = document.documentElement.classList.contains('dark');
  const colorMap = {
    blue: 'text-blue-500 bg-blue-500/10',
    green: 'text-emerald-500 bg-emerald-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
    amber: 'text-amber-500 bg-amber-500/10',
    red: 'text-red-500 bg-red-500/10',
    indigo: 'text-indigo-500 bg-indigo-500/10',
  };
  const c = colorMap[color] || colorMap.blue;
  const isPositive = change > 0;
  
  return (
    <div className={`rounded-xl p-5 border transition-all duration-300 hover:shadow-lg group ${isDark ? 'bg-slate-800/80 border-slate-700/50 hover:border-slate-600' : 'bg-white border-gray-200 hover:border-gray-300'} ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${c} transition-transform group-hover:scale-110 duration-300`}>
          <Icon className="w-5 h-5" />
        </div>
        {change !== undefined && change !== null && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
            {changeLabel && <span className={`ml-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{changeLabel}</span>}
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</p>
    </div>
  );
}

export default {
  LoadingSpinner,
  PageLoading,
  SkeletonLine,
  SkeletonCard,
  SkeletonTable,
  EmptyState,
  ErrorState,
  StatusBadge,
  DataStatCard,
};
