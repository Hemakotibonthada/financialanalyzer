// ============================================================================
// Enterprise KPI Dashboard Cards — Animated Stats with AI Insights
// ============================================================================
// Reusable stat cards with animated counters, sparklines, trend indicators,
// and AI-powered contextual tips. Used across Dashboard and Analytics pages.
// ============================================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
  TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight,
  DollarSign, Wallet, PiggyBank, CreditCard, BarChart3, Target, Shield,
  Lightbulb, Info
} from 'lucide-react';

// ─── Animated Counter ───────────────────────────────────────────────
function AnimCounter({ end, duration = 1200, prefix = '', suffix = '', decimals = 0 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const startTime = useRef(null);

  useEffect(() => {
    if (typeof end !== 'number' || isNaN(end)) { setCount(end || 0); return; }

    const target = end;
    const animate = (timestamp) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(eased * target);
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };

    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); startTime.current = null; };
  }, [end, duration]);

  const formatted = useMemo(() => {
    const val = typeof count === 'number' ? count : 0;
    if (val >= 10000000) return `${prefix}${(val / 10000000).toFixed(1)}Cr${suffix}`;
    if (val >= 100000) return `${prefix}${(val / 100000).toFixed(1)}L${suffix}`;
    if (val >= 1000) return `${prefix}${(val / 1000).toFixed(decimals > 0 ? 1 : 0)}K${suffix}`;
    return `${prefix}${val.toFixed(decimals)}${suffix}`;
  }, [count, prefix, suffix, decimals]);

  return <span className="tabular-nums">{formatted}</span>;
}

// ─── Mini Sparkline ─────────────────────────────────────────────────
function Sparkline({ data = [], color = '#6366f1', width = 80, height = 24 }) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range * height * 0.8 + height * 0.1);
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#spark-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      {data.length > 0 && (() => {
        const lastX = (data.length - 1) * step;
        const lastY = height - ((data[data.length - 1] - min) / range * height * 0.8 + height * 0.1);
        return <circle cx={lastX} cy={lastY} r="2" fill={color} />;
      })()}
    </svg>
  );
}

// ─── Trend Badge ────────────────────────────────────────────────────
function TrendBadge({ value, inverse = false }) {
  if (value == null || isNaN(value)) return null;
  const isPositive = inverse ? value < 0 : value > 0;
  const color = isPositive ? 'text-emerald-500' : value === 0 ? 'text-gray-400' : 'text-red-500';
  const bgColor = isPositive ? 'bg-emerald-500/10' : value === 0 ? 'bg-gray-500/10' : 'bg-red-500/10';
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;

  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-semibold ${color} ${bgColor}`}>
      <Icon className="w-3 h-3" />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

// ─── KPI Stat Card ──────────────────────────────────────────────────
export function KPICard({
  title,
  value,
  prefix = '₹',
  suffix = '',
  change,
  changeLabel = 'vs last period',
  inverse = false,
  icon: IconProp,
  color = 'indigo',
  sparkData,
  tip,
  className = '',
  animate = true,
}) {
  const { mode } = useTheme();
  const dk = mode === 'dark' || mode === 'black';
  const [isHovered, setIsHovered] = useState(false);
  const [showTip, setShowTip] = useState(false);

  const colorMap = {
    indigo: { icon: 'text-indigo-500', iconBg: dk ? 'bg-indigo-900/30' : 'bg-indigo-100', spark: '#6366f1' },
    green: { icon: 'text-emerald-500', iconBg: dk ? 'bg-emerald-900/30' : 'bg-emerald-100', spark: '#10b981' },
    blue: { icon: 'text-blue-500', iconBg: dk ? 'bg-blue-900/30' : 'bg-blue-100', spark: '#3b82f6' },
    red: { icon: 'text-red-500', iconBg: dk ? 'bg-red-900/30' : 'bg-red-100', spark: '#ef4444' },
    purple: { icon: 'text-purple-500', iconBg: dk ? 'bg-purple-900/30' : 'bg-purple-100', spark: '#8b5cf6' },
    amber: { icon: 'text-amber-500', iconBg: dk ? 'bg-amber-900/30' : 'bg-amber-100', spark: '#f59e0b' },
    cyan: { icon: 'text-cyan-500', iconBg: dk ? 'bg-cyan-900/30' : 'bg-cyan-100', spark: '#06b6d4' },
    pink: { icon: 'text-pink-500', iconBg: dk ? 'bg-pink-900/30' : 'bg-pink-100', spark: '#ec4899' },
  };

  const c = colorMap[color] || colorMap.indigo;
  const Icon = IconProp || DollarSign;

  return (
    <div
      className={`rounded-2xl p-5 border transition-all duration-300 ${
        dk
          ? 'bg-slate-800/80 border-slate-700/50 hover:border-slate-600 hover:shadow-lg hover:shadow-slate-900/30'
          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg'
      } ${isHovered ? 'hover-lift' : ''} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowTip(false); }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${c.iconBg} transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`}>
            <Icon className={`w-5 h-5 ${c.icon}`} />
          </div>
          <div>
            <p className={`text-xs font-medium ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{title}</p>
            <div className={`text-2xl font-bold mt-0.5 ${dk ? 'text-white' : 'text-gray-900'}`}>
              {animate ? (
                <AnimCounter end={typeof value === 'number' ? value : 0} prefix={prefix} suffix={suffix} />
              ) : (
                `${prefix}${typeof value === 'number' ? value.toLocaleString('en-IN') : value}${suffix}`
              )}
            </div>
          </div>
        </div>

        {tip && (
          <button
            onClick={() => setShowTip(!showTip)}
            className={`p-1 rounded-lg transition-colors ${dk ? 'hover:bg-slate-700 text-slate-500' : 'hover:bg-gray-100 text-gray-400'}`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {change != null && <TrendBadge value={change} inverse={inverse} />}
          {changeLabel && change != null && (
            <span className={`text-[10px] ${dk ? 'text-slate-500' : 'text-gray-400'}`}>{changeLabel}</span>
          )}
        </div>
        {sparkData && <Sparkline data={sparkData} color={c.spark} />}
      </div>

      {/* AI Tip */}
      {showTip && tip && (
        <div className={`mt-3 p-2.5 rounded-lg text-xs ${
          dk ? 'bg-slate-700/50 text-slate-300' : 'bg-gray-50 text-gray-600'
        }`} style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div className="flex items-start gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
            <span>{tip}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── KPI Grid ───────────────────────────────────────────────────────
export function KPIGrid({ cards = [], columns = 4 }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns} gap-4`}>
      {cards.map((card, i) => (
        <div key={i} className="card-appear" style={{ animationDelay: `${i * 60}ms`, opacity: 0 }}>
          <KPICard {...card} />
        </div>
      ))}
    </div>
  );
}

// ─── Dashboard Summary Row ──────────────────────────────────────────
export function DashboardSummary({ data }) {
  if (!data) return null;

  const cards = [
    {
      title: 'Total Income',
      value: data.summary?.income || 0,
      change: data.comparison?.incomeChange,
      icon: Wallet,
      color: 'green',
      tip: data.summary?.income > 0 ? 'Your income is on track. Consider automating savings.' : 'Start tracking your income sources for better insights.',
    },
    {
      title: 'Total Expenses',
      value: data.summary?.expense || 0,
      change: data.comparison?.expenseChange,
      inverse: true,
      icon: CreditCard,
      color: 'red',
      tip: data.comparison?.expenseChange > 10 ? 'Spending increased significantly. Review recent purchases.' : 'Spending is under control.',
    },
    {
      title: 'Net Savings',
      value: data.summary?.net || 0,
      icon: PiggyBank,
      color: (data.summary?.net || 0) >= 0 ? 'green' : 'red',
      tip: (data.summary?.net || 0) < 0 ? 'You\'re spending more than earning. Create a budget plan.' : 'Great! You\'re saving money.',
    },
    {
      title: 'Savings Rate',
      value: data.summary?.savingsRate || 0,
      prefix: '',
      suffix: '%',
      icon: Target,
      color: (data.summary?.savingsRate || 0) >= 20 ? 'green' : 'amber',
      tip: (data.summary?.savingsRate || 0) < 20 ? 'Aim for at least 20% savings rate for financial security.' : 'Excellent savings rate! Consider investing the surplus.',
    },
  ];

  return <KPIGrid cards={cards} />;
}

export default KPICard;
