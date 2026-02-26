// ============================================================
// Financial Analyzer - Reusable UI Component Library
// Feature-rich, animated, accessible components
// ============================================================

import React, { useState, useRef, useCallback, useEffect, useMemo, forwardRef } from 'react';
import { useScrollReveal, useAnimatedCounter, useClickOutside, useElementSize } from '../../hooks/useCustomHooks';
import { formatCurrency, formatNumber, formatPercentage, getStatusColor, hexToRgba, getScoreColor, getCategoryIcon } from '../../utils/helpers';

// ======================== ANIMATED CARD ========================
// Feature #33: Animated Cards with glassmorphism and hover effects

export function AnimatedCard({ children, className = '', variant = 'default', delay = 0, onClick, hover = true, glass = false, gradient, ...props }) {
  const [ref, isVisible] = useScrollReveal({ threshold: 0.1, triggerOnce: true });

  const variants = {
    default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
    elevated: 'bg-white dark:bg-gray-800 shadow-lg',
    outlined: 'bg-transparent border-2 border-gray-300 dark:border-gray-600',
    glass: 'backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20',
    gradient: '',
    flat: 'bg-gray-50 dark:bg-gray-900',
  };

  const hoverClass = hover ? 'card-hover cursor-pointer' : '';
  const glassClass = glass ? 'backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20' : '';
  const gradientStyle = gradient ? { background: gradient } : {};

  return (
    <div
      ref={ref}
      className={`rounded-2xl p-6 transition-all duration-500 ${variants[variant] || variants.default} ${hoverClass} ${glassClass} ${className}`}
      style={{
        ...gradientStyle,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transitionDelay: `${delay}ms`,
      }}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

// ======================== STAT CARD ========================
// Feature #34: Animated Stat Cards with trend indicators

export function StatCard({ title, value, prefix = '', suffix = '', trend, icon, color = '#667eea', format = 'number', compact = false, loading = false, onClick, delay = 0 }) {
  const { count } = useAnimatedCounter(typeof value === 'number' ? value : 0, 1500, format === 'currency' ? 2 : 0);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 animate-pulse">
        <div className="skeleton skeleton-text w-24 mb-4" />
        <div className="skeleton skeleton-title w-32 mb-2" />
        <div className="skeleton skeleton-text w-20" />
      </div>
    );
  }

  const displayValue = format === 'currency' 
    ? formatCurrency(count, 'INR', { compact })
    : format === 'percentage' 
      ? formatPercentage(count)
      : formatNumber(count, { compact });

  return (
    <AnimatedCard delay={delay} onClick={onClick} className="relative overflow-hidden group">
      {/* Background decoration */}
      <div 
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity"
        style={{ background: color }}
      />
      
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</span>
        {icon && (
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-transform group-hover:scale-110"
            style={{ background: `linear-gradient(135deg, ${color}, ${hexToRgba(color, 0.7)})` }}
          >
            {icon}
          </div>
        )}
      </div>
      
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        {prefix}{displayValue}{suffix}
      </div>
      
      {trend && (
        <div className={`flex items-center gap-1 text-sm ${trend.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
          <span>{trend.isPositive ? '↗' : '↘'}</span>
          <span className="font-medium">{trend.percentage}%</span>
          <span className="text-gray-400 dark:text-gray-500">vs last period</span>
        </div>
      )}
    </AnimatedCard>
  );
}

// ======================== PROGRESS RING ========================
// Feature #35: Animated Circular Progress Ring

export function ProgressRing({ value = 0, max = 100, size = 120, strokeWidth = 8, color, label, sublabel, showValue = true, animate = true }) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const progressColor = color || getScoreColor(value, max);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={progressColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={animate ? offset : circumference}
            strokeLinecap="round"
            className="transition-all duration-1500 ease-out"
            style={{ 
              '--circumference': circumference,
              filter: `drop-shadow(0 0 6px ${hexToRgba(progressColor, 0.4)})`,
            }}
          />
        </svg>
        
        {showValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.round(percentage)}%
            </span>
          </div>
        )}
      </div>
      
      {label && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>}
      {sublabel && <span className="text-xs text-gray-500">{sublabel}</span>}
    </div>
  );
}

// ======================== DATA TABLE ========================
// Feature #36: Advanced Data Table with sorting, filtering, pagination

export function DataTable({ columns, data, loading = false, emptyMessage = 'No data found', onRowClick, selectable = false, selectedRows = new Set(), onSelectionChange, stickyHeader = true, striped = true, compact = false, maxHeight, actions, bulkActions }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });
  }, [data, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === data.length) {
      onSelectionChange?.(new Set());
    } else {
      onSelectionChange?.(new Set(data.map((_, i) => i)));
    }
  };

  const toggleRow = (index) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(index)) newSelection.delete(index);
    else newSelection.add(index);
    onSelectionChange?.(newSelection);
  };

  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-12 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3';

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      {bulkActions && selectedRows.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm text-blue-700 dark:text-blue-300">
            {selectedRows.size} item{selectedRows.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">{bulkActions}</div>
        </div>
      )}
      
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full text-sm">
          <thead className={`bg-gray-50 dark:bg-gray-800/80 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
            <tr>
              {selectable && (
                <th className={`${cellPadding} w-10`}>
                  <input
                    type="checkbox"
                    checked={selectedRows.size === data.length && data.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`${cellPadding} text-left font-semibold text-gray-600 dark:text-gray-300 ${col.sortable !== false ? 'cursor-pointer select-none hover:text-gray-900 dark:hover:text-white' : ''} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
                  style={{ width: col.width, minWidth: col.minWidth }}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.header || col.key}
                    {sortConfig.key === col.key && (
                      <span className="text-blue-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
              {actions && <th className={`${cellPadding} text-right font-semibold text-gray-600 dark:text-gray-300`}>Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} className="px-4 py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl">📭</span>
                    <span>{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              sortedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10' : ''} ${striped && rowIndex % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-800/30' : ''} ${selectedRows.has(rowIndex) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  onClick={() => onRowClick?.(row, rowIndex)}
                >
                  {selectable && (
                    <td className={cellPadding} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedRows.has(rowIndex)}
                        onChange={() => toggleRow(rowIndex)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  )}
                  {columns.map((col, colIndex) => (
                    <td
                      key={colIndex}
                      className={`${cellPadding} text-gray-700 dark:text-gray-300 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
                    >
                      {col.render ? col.render(row[col.key], row, rowIndex) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                  {actions && (
                    <td className={`${cellPadding} text-right`} onClick={(e) => e.stopPropagation()}>
                      {actions(row, rowIndex)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ======================== PAGINATION ========================
// Feature #37: Pagination Component

export function Pagination({ currentPage, totalPages, onPageChange, showFirst = true, showLast = true, maxVisible = 5, totalItems, itemsPerPage }) {
  if (totalPages <= 1) return null;

  const pages = [];
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  const fromItem = (currentPage - 1) * itemsPerPage + 1;
  const toItem = Math.min(currentPage * itemsPerPage, totalItems || 0);

  return (
    <div className="flex items-center justify-between px-4 py-3">
      {totalItems !== undefined && (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Showing {fromItem}–{toItem} of {totalItems}
        </span>
      )}
      
      <div className="flex items-center gap-1">
        {showFirst && (
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="px-2 py-1 rounded-lg text-sm disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            ««
          </button>
        )}
        
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-2 py-1 rounded-lg text-sm disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          ‹
        </button>

        {start > 1 && <span className="px-1 text-gray-400">…</span>}

        {pages.map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
              page === currentPage
                ? 'bg-blue-600 text-white shadow-md scale-105'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            {page}
          </button>
        ))}

        {end < totalPages && <span className="px-1 text-gray-400">…</span>}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-2 py-1 rounded-lg text-sm disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          ›
        </button>
        
        {showLast && (
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 rounded-lg text-sm disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            »»
          </button>
        )}
      </div>
    </div>
  );
}

// ======================== STEPPER ========================
// Feature #38: Multi-step Wizard Stepper

export function Stepper({ steps, currentStep, onStepClick, orientation = 'horizontal', variant = 'numbered' }) {
  return (
    <div className={`flex ${orientation === 'vertical' ? 'flex-col gap-4' : 'items-center gap-2'}`}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const isClickable = onStepClick && (isCompleted || index <= currentStep + 1);

        return (
          <React.Fragment key={index}>
            <div
              className={`flex items-center gap-3 ${isClickable ? 'cursor-pointer' : ''}`}
              onClick={() => isClickable && onStepClick(index)}
            >
              {/* Step indicator */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                isCompleted
                  ? 'bg-green-500 text-white scale-100'
                  : isActive
                    ? 'bg-blue-600 text-white scale-110 ring-4 ring-blue-200 dark:ring-blue-800'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
              }`}>
                {isCompleted ? '✓' : variant === 'numbered' ? index + 1 : (step.icon || index + 1)}
              </div>
              
              {/* Step label */}
              <div className={orientation === 'horizontal' && !isActive ? 'hidden md:block' : ''}>
                <div className={`text-sm font-medium ${isActive ? 'text-blue-600 dark:text-blue-400' : isCompleted ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}`}>
                  {step.label || step}
                </div>
                {step.description && isActive && (
                  <div className="text-xs text-gray-500 mt-0.5">{step.description}</div>
                )}
              </div>
            </div>
            
            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className={`${orientation === 'vertical' ? 'ml-5 h-8 w-0.5' : 'flex-1 h-0.5 min-w-[20px]'} transition-all duration-500 ${
                index < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ======================== TIMELINE ========================
// Feature #39: Interactive Timeline Component

export function Timeline({ items, variant = 'default', maxItems, showMore = false }) {
  const [expanded, setExpanded] = useState(false);
  const displayItems = maxItems && !expanded ? items.slice(0, maxItems) : items;

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
      
      <div className="space-y-6">
        {displayItems.map((item, index) => (
          <div key={index} className="relative flex gap-4 stagger-children">
            {/* Dot */}
            <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
              item.status === 'completed' ? 'bg-green-500 text-white' :
              item.status === 'active' ? 'bg-blue-500 text-white animate-pulse' :
              item.status === 'error' ? 'bg-red-500 text-white' :
              'bg-gray-200 dark:bg-gray-700 text-gray-500'
            }`}>
              {item.icon || (item.status === 'completed' ? '✓' : '●')}
            </div>
            
            {/* Content */}
            <div className="flex-1 pb-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-gray-900 dark:text-white">{item.title}</span>
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    item.badge.variant === 'success' ? 'bg-green-100 text-green-700' :
                    item.badge.variant === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                    item.badge.variant === 'error' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {item.badge.text}
                  </span>
                )}
              </div>
              {item.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{item.description}</p>
              )}
              {item.date && (
                <span className="text-xs text-gray-400">{item.date}</span>
              )}
              {item.content && <div className="mt-2">{item.content}</div>}
            </div>
          </div>
        ))}
      </div>
      
      {showMore && maxItems && items.length > maxItems && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 ml-14 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          {expanded ? 'Show less' : `Show ${items.length - maxItems} more`}
        </button>
      )}
    </div>
  );
}

// ======================== BADGE ========================
// Feature #40: Status Badge Component

export function Badge({ children, variant = 'default', size = 'sm', dot = false, pulse = false, icon, removable, onRemove }) {
  const variants = {
    default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    primary: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  };

  const sizes = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${variants[variant]} ${sizes[size]}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full bg-current ${pulse ? 'animate-pulse' : ''}`} />
      )}
      {icon && <span className="text-sm">{icon}</span>}
      {children}
      {removable && (
        <button onClick={onRemove} className="ml-0.5 hover:bg-black/10 rounded-full p-0.5 transition-colors">
          ×
        </button>
      )}
    </span>
  );
}

// ======================== EMPTY STATE ========================
// Feature #41: Empty State Component

export function EmptyState({ icon = '📭', title = 'No data yet', description, action, actionLabel = 'Get Started', illustration }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fadeInUp">
      {illustration ? (
        <div className="mb-6">{illustration}</div>
      ) : (
        <div className="text-6xl mb-6 animate-float">{icon}</div>
      )}
      <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">{description}</p>
      )}
      {action && (
        <button
          onClick={action}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-blue-500/25 active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ======================== SKELETON LOADER ========================
// Feature #42: Skeleton Loading Components

export function SkeletonLoader({ variant = 'card', count = 1, className = '' }) {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  const renderSkeleton = (key) => {
    switch (variant) {
      case 'card':
        return (
          <div key={key} className={`bg-white dark:bg-gray-800 rounded-2xl p-6 space-y-4 ${className}`}>
            <div className="flex items-center gap-3">
              <div className="skeleton w-10 h-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-24 rounded" />
                <div className="skeleton h-3 w-16 rounded" />
              </div>
            </div>
            <div className="skeleton h-8 w-32 rounded" />
            <div className="skeleton h-3 w-20 rounded" />
          </div>
        );
      
      case 'list':
        return (
          <div key={key} className={`flex items-center gap-4 p-4 ${className}`}>
            <div className="skeleton w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
            <div className="skeleton h-4 w-16 rounded" />
          </div>
        );

      case 'chart':
        return (
          <div key={key} className={`bg-white dark:bg-gray-800 rounded-2xl p-6 ${className}`}>
            <div className="skeleton h-5 w-40 rounded mb-4" />
            <div className="skeleton h-64 rounded-xl" />
          </div>
        );

      case 'table':
        return (
          <div key={key} className={`p-4 space-y-3 ${className}`}>
            <div className="skeleton h-10 rounded-lg" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-12 rounded-lg" />
            ))}
          </div>
        );

      case 'profile':
        return (
          <div key={key} className={`flex flex-col items-center gap-4 p-6 ${className}`}>
            <div className="skeleton w-20 h-20 rounded-full" />
            <div className="skeleton h-5 w-32 rounded" />
            <div className="skeleton h-4 w-48 rounded" />
            <div className="flex gap-6 mt-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="skeleton h-6 w-12 rounded" />
                  <div className="skeleton h-3 w-16 rounded" />
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return <div key={key} className={`skeleton h-16 rounded-xl ${className}`} />;
    }
  };

  return <>{skeletons.map(renderSkeleton)}</>;
}

// ======================== MODAL ========================
// Feature #43: Animated Modal Component

export function Modal({ isOpen, onClose, title, children, size = 'md', showClose = true, footer, className = '' }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw] max-h-[95vh]',
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === overlayRef.current && onClose?.()}
    >
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full ${sizes[size]} modal-content overflow-hidden ${className}`}>
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
            {showClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        )}
        
        {/* Body */}
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ======================== DROPDOWN MENU ========================
// Feature #44: Animated Dropdown Menu

export function DropdownMenu({ trigger, items, align = 'right', className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useClickOutside(() => setIsOpen(false));

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      
      {isOpen && (
        <div className={`absolute z-50 mt-2 min-w-[200px] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-fadeInScale ${
          align === 'right' ? 'right-0' : 'left-0'
        }`}>
          {items.map((item, index) => {
            if (item.divider) {
              return <div key={index} className="border-t border-gray-100 dark:border-gray-700 my-1" />;
            }
            
            return (
              <button
                key={index}
                onClick={() => {
                  item.onClick?.();
                  setIsOpen(false);
                }}
                disabled={item.disabled}
                className={`w-full px-4 py-2.5 flex items-center gap-3 text-sm text-left transition-colors ${
                  item.danger
                    ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {item.icon && <span>{item.icon}</span>}
                <span className="flex-1">{item.label}</span>
                {item.badge && <Badge size="xs" variant={item.badge.variant}>{item.badge.text}</Badge>}
                {item.shortcut && <span className="text-xs text-gray-400">{item.shortcut}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ======================== TOOLTIP ========================
// Feature #45: Enhanced Tooltip

export function Tooltip({ children, content, position = 'top', delay = 300 }) {
  const [show, setShow] = useState(false);
  const timerRef = useRef(null);

  const handleEnter = () => {
    timerRef.current = setTimeout(() => setShow(true), delay);
  };

  const handleLeave = () => {
    clearTimeout(timerRef.current);
    setShow(false);
  };

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-flex" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {children}
      {show && content && (
        <div className={`absolute ${positions[position]} z-50 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 dark:bg-gray-600 rounded-lg whitespace-nowrap tooltip-animated pointer-events-none`}>
          {content}
        </div>
      )}
    </div>
  );
}

// ======================== ACCORDION ========================
// Feature #46: Animated Accordion

export function Accordion({ items, allowMultiple = false, className = '' }) {
  const [openItems, setOpenItems] = useState(new Set());

  const toggle = (index) => {
    setOpenItems(prev => {
      const next = new Set(allowMultiple ? prev : []);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((item, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => toggle(index)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              {item.icon && <span>{item.icon}</span>}
              <span className="font-medium text-gray-900 dark:text-white">{item.title}</span>
            </div>
            <span className={`transition-transform duration-300 ${openItems.has(index) ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </button>
          
          <div className={`overflow-hidden transition-all duration-300 ease-out ${openItems.has(index) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
              {item.content}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ======================== TABS ========================
// Feature #47: Animated Tabs

export function AnimatedTabs({ tabs, activeTab, onChange, variant = 'default', className = '' }) {
  const tabsRef = useRef([]);
  const [indicatorStyle, setIndicatorStyle] = useState({});

  useEffect(() => {
    const activeIndex = tabs.findIndex(t => t.key === activeTab);
    const tabEl = tabsRef.current[activeIndex];
    if (tabEl) {
      setIndicatorStyle({
        left: tabEl.offsetLeft,
        width: tabEl.offsetWidth,
      });
    }
  }, [activeTab, tabs]);

  const variants = {
    default: 'border-b border-gray-200 dark:border-gray-700',
    pills: 'bg-gray-100 dark:bg-gray-800 rounded-xl p-1',
    enclosed: 'border-b border-gray-200 dark:border-gray-700',
  };

  return (
    <div className={className}>
      <div className={`relative flex ${variants[variant]} overflow-x-auto`}>
        {/* Animated indicator */}
        {variant === 'default' && (
          <div
            className="absolute bottom-0 h-0.5 bg-blue-600 transition-all duration-300 ease-out rounded-full"
            style={indicatorStyle}
          />
        )}
        {variant === 'pills' && (
          <div
            className="absolute top-1 h-[calc(100%-8px)] bg-white dark:bg-gray-700 rounded-lg shadow-sm transition-all duration-300 ease-out"
            style={indicatorStyle}
          />
        )}
        
        {tabs.map((tab, index) => (
          <button
            key={tab.key}
            ref={el => tabsRef.current[index] = el}
            onClick={() => onChange(tab.key)}
            className={`relative z-10 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? variant === 'pills'
                  ? 'text-gray-900 dark:text-white'
                  : 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {tab.icon && <span>{tab.icon}</span>}
              {tab.label}
              {tab.count !== undefined && (
                <Badge size="xs" variant={activeTab === tab.key ? 'primary' : 'default'}>
                  {tab.count}
                </Badge>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ======================== SEARCH INPUT ========================
// Feature #48: Enhanced Search Input

export function SearchInput({ value, onChange, placeholder = 'Search...', onSubmit, suggestions = [], loading = false, className = '', autoFocus = false, clearable = true, icon }) {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const wrapperRef = useClickOutside(() => setShowSuggestions(false));

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className={`relative flex items-center bg-white dark:bg-gray-800 border rounded-xl transition-all ${
        isFocused
          ? 'border-blue-400 ring-4 ring-blue-100 dark:ring-blue-900/30'
          : 'border-gray-200 dark:border-gray-700'
      }`}>
        <span className="pl-3 text-gray-400">
          {loading ? (
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
            </svg>
          ) : (
            icon || '🔍'
          )}
        </span>
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => {
            setIsFocused(true);
            if (suggestions.length) setShowSuggestions(true);
          }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit?.()}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="flex-1 px-3 py-2.5 bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400"
        />
        
        {clearable && value && (
          <button
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            className="pr-3 text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        )}
      </div>
      
      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-h-60 overflow-auto animate-fadeInScale">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => {
                onChange(suggestion.text || suggestion);
                setShowSuggestions(false);
                onSubmit?.();
              }}
              className="w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 flex items-center gap-2"
            >
              {suggestion.icon && <span>{suggestion.icon}</span>}
              <span>{suggestion.text || suggestion}</span>
              {suggestion.category && (
                <Badge size="xs" variant="default">{suggestion.category}</Badge>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ======================== AVATAR ========================
// Feature #49: Avatar with Status

export function Avatar({ src, name, size = 'md', status, className = '' }) {
  const [imgError, setImgError] = useState(false);
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl',
  };

  const statusSizes = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
    xl: 'w-4 h-4',
  };

  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
    'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500',
  ];
  
  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;

  return (
    <div className={`relative inline-flex ${className}`}>
      {src && !imgError ? (
        <img
          src={src}
          alt={name}
          onError={() => setImgError(true)}
          className={`${sizes[size]} rounded-full object-cover`}
        />
      ) : (
        <div className={`${sizes[size]} ${colors[colorIndex]} rounded-full flex items-center justify-center text-white font-medium`}>
          {initials}
        </div>
      )}
      
      {status && (
        <span className={`absolute bottom-0 right-0 ${statusSizes[size]} rounded-full border-2 border-white dark:border-gray-800 ${
          status === 'online' ? 'bg-green-500' :
          status === 'busy' ? 'bg-red-500' :
          status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
        }`} />
      )}
    </div>
  );
}

// ======================== COMMAND PALETTE ========================
// Feature #50: Command Palette (Ctrl+K)

export function CommandPalette({ isOpen, onClose, commands = [] }) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const filteredCommands = useMemo(() => {
    if (!search) return commands;
    const searchLower = search.toLowerCase();
    return commands.filter(cmd => 
      cmd.label.toLowerCase().includes(searchLower) ||
      cmd.category?.toLowerCase().includes(searchLower) ||
      cmd.keywords?.some(k => k.toLowerCase().includes(searchLower))
    );
  }, [commands, search]);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action?.();
          onClose();
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  };

  if (!isOpen) return null;

  const grouped = {};
  filteredCommands.forEach(cmd => {
    const cat = cmd.category || 'Actions';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(cmd);
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] modal-overlay bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 modal-content overflow-hidden"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a command or search..."
            className="w-full bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>
        
        <div className="max-h-80 overflow-auto py-2">
          {Object.entries(grouped).length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400">No matching commands</div>
          ) : (
            Object.entries(grouped).map(([category, cmds]) => (
              <div key={category}>
                <div className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{category}</div>
                {cmds.map((cmd) => {
                  const globalIndex = filteredCommands.indexOf(cmd);
                  return (
                    <button
                      key={globalIndex}
                      onClick={() => {
                        cmd.action?.();
                        onClose();
                      }}
                      className={`w-full px-4 py-2.5 flex items-center gap-3 text-sm transition-colors ${
                        globalIndex === selectedIndex
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      {cmd.icon && <span className="text-lg">{cmd.icon}</span>}
                      <span className="flex-1 text-left">{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 font-mono">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex items-center gap-4 text-xs text-gray-400">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}

// ======================== TOAST CONTAINER ========================
// Feature #51: Toast Notification System

export function ToastContainer({ toasts = [], onRemove }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto notification-enter"
        >
          <div className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm ${
            toast.type === 'success' ? 'bg-green-50 dark:bg-green-900/40 border-green-200 dark:border-green-800' :
            toast.type === 'error' ? 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-800' :
            toast.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/40 border-yellow-200 dark:border-yellow-800' :
            'bg-blue-50 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800'
          }`}>
            <span className="text-lg flex-shrink-0">
              {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <div className="flex-1 min-w-0">
              {toast.title && <div className="font-medium text-sm text-gray-900 dark:text-white">{toast.title}</div>}
              <div className="text-sm text-gray-600 dark:text-gray-300">{toast.message}</div>
            </div>
            {toast.dismissible && (
              <button
                onClick={() => onRemove(toast.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ======================== FILE UPLOADER ========================
// Feature #52: Drag & Drop File Uploader

export function FileUploader({ onUpload, accept, maxSize = 10485760, maxFiles = 5, multiple = true, className = '' }) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState([]);
  const inputRef = useRef(null);
  const dragCounter = useRef(0);

  const validateFiles = (fileList) => {
    const newErrors = [];
    const validFiles = [];

    Array.from(fileList).forEach(file => {
      if (maxSize && file.size > maxSize) {
        newErrors.push(`${file.name} exceeds max size of ${(maxSize / 1048576).toFixed(0)}MB`);
      } else if (accept) {
        const acceptedTypes = accept.split(',').map(t => t.trim());
        const isAccepted = acceptedTypes.some(type => {
          if (type.startsWith('.')) return file.name.endsWith(type);
          if (type.endsWith('/*')) return file.type.startsWith(type.replace('/*', ''));
          return file.type === type;
        });
        if (!isAccepted) newErrors.push(`${file.name} is not an accepted file type`);
        else validFiles.push(file);
      } else {
        validFiles.push(file);
      }
    });

    if (files.length + validFiles.length > maxFiles) {
      newErrors.push(`Maximum ${maxFiles} files allowed`);
      validFiles.splice(maxFiles - files.length);
    }

    setErrors(newErrors);
    if (validFiles.length > 0) {
      const newFiles = [...files, ...validFiles];
      setFiles(newFiles);
      onUpload?.(newFiles);
    }
  };

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onUpload?.(newFiles);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className={className}>
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
        onDragEnter={(e) => { e.preventDefault(); dragCounter.current++; setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); dragCounter.current--; if (dragCounter.current === 0) setIsDragging(false); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          dragCounter.current = 0;
          validateFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => validateFiles(e.target.files)}
        />
        
        <div className="text-4xl mb-3">{isDragging ? '📥' : '📤'}</div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {isDragging ? 'Drop files here...' : 'Drag & drop files or click to browse'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Max {(maxSize / 1048576).toFixed(0)}MB per file · {maxFiles} files max
          {accept && ` · ${accept}`}
        </p>
      </div>

      {errors.length > 0 && (
        <div className="mt-2 space-y-1">
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-red-500">{err}</p>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-lg">📄</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
              </div>
              <button onClick={() => removeFile(index)} className="text-gray-400 hover:text-red-500 transition-colors">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ======================== COLOR PICKER ========================
// Feature #53: Category Color Picker

export function ColorPicker({ value, onChange, colors, label }) {
  const defaultColors = [
    '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe',
    '#00f2fe', '#43e97b', '#fa709a', '#fee140', '#a18cd1',
    '#f6d365', '#84fab0', '#fda085', '#d57eeb', '#fccb90',
  ];

  const colorList = colors || defaultColors;

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</label>}
      <div className="flex flex-wrap gap-2">
        {colorList.map((color) => (
          <button
            key={color}
            onClick={() => onChange(color)}
            className={`w-8 h-8 rounded-lg transition-all ${
              value === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-110'
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
}

// ======================== DATE RANGE PICKER ========================
// Feature #54: Date Range Picker

export function DateRangePicker({ value, onChange, presets = true, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useClickOutside(() => setIsOpen(false));

  const datePresets = [
    { label: 'Today', key: 'today' },
    { label: 'Yesterday', key: 'yesterday' },
    { label: 'Last 7 days', key: 'week' },
    { label: 'Last 30 days', key: 'month' },
    { label: 'This Quarter', key: 'quarter' },
    { label: 'This Year', key: 'ytd' },
    { label: 'Last Year', key: 'year' },
  ];

  const handlePreset = (key) => {
    const now = new Date();
    const start = new Date(now);
    
    switch (key) {
      case 'today': start.setHours(0, 0, 0, 0); break;
      case 'yesterday': start.setDate(start.getDate() - 1); break;
      case 'week': start.setDate(start.getDate() - 7); break;
      case 'month': start.setMonth(start.getMonth() - 1); break;
      case 'quarter': start.setMonth(start.getMonth() - 3); break;
      case 'ytd': start.setMonth(0, 1); break;
      case 'year': start.setFullYear(start.getFullYear() - 1); break;
    }
    
    onChange({ start, end: new Date(now) });
    setIsOpen(false);
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm hover:border-blue-400 transition-colors"
      >
        <span>📅</span>
        <span className="text-gray-700 dark:text-gray-300">
          {value?.start ? `${formatDateShort(value.start)} - ${formatDateShort(value.end)}` : 'Select dates'}
        </span>
        <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
      </button>
      
      {isOpen && (
        <div className="absolute z-50 mt-2 right-0 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 min-w-[280px] animate-fadeInScale">
          {presets && (
            <div className="space-y-1 mb-4">
              {datePresets.map(preset => (
                <button
                  key={preset.key}
                  onClick={() => handlePreset(preset.key)}
                  className="w-full px-3 py-2 text-sm text-left rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
          
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={value?.start ? new Date(value.start).toISOString().split('T')[0] : ''}
                onChange={(e) => onChange({ ...value, start: new Date(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                value={value?.end ? new Date(value.end).toISOString().split('T')[0] : ''}
                onChange={(e) => onChange({ ...value, end: new Date(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDateShort(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ======================== EXPORTS ========================

export default {
  AnimatedCard, StatCard, ProgressRing, DataTable, Pagination,
  Stepper, Timeline, Badge, EmptyState, SkeletonLoader,
  Modal, DropdownMenu, Tooltip, Accordion, AnimatedTabs,
  SearchInput, Avatar, CommandPalette, ToastContainer,
  FileUploader, ColorPicker, DateRangePicker,
};
