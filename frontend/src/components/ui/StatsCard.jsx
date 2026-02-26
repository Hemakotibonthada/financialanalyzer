import React, { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Micro sparkline SVG                                                */
/* ------------------------------------------------------------------ */
function Sparkline({ data = [], color = '#6366f1', width = 80, height = 28 }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1 || 1);

  const points = data
    .map((v, i) => `${i * step},${height - ((v - min) / range) * height}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* area fill beneath line */}
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#spark-${color})`}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Animated counter hook                                              */
/* ------------------------------------------------------------------ */
function useAnimatedCounter(target, duration = 600) {
  const [display, setDisplay] = useState(target);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = display;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + diff * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // only re-run when target changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return display;
}

/* ------------------------------------------------------------------ */
/*  Color map                                                          */
/* ------------------------------------------------------------------ */
const colorMap = {
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', hex: '#6366f1' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', hex: '#10b981' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', hex: '#f59e0b' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', hex: '#f43f5e' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', hex: '#3b82f6' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', hex: '#a855f7' },
  cyan: { bg: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', hex: '#06b6d4' },
};

/* ================================================================== */
/*  StatsCard                                                          */
/* ================================================================== */
export function StatsCard({
  title,
  value,
  change,
  changeType, // 'increase' | 'decrease' | 'neutral'
  icon: Icon,
  color = 'indigo',
  trend, // sparkline data array
  prefix = '',
  suffix = '',
  onClick,
  loading = false,
}) {
  const palette = colorMap[color] || colorMap.indigo;
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  const animatedValue = useAnimatedCounter(numericValue);

  /* ---- Loading skeleton ---- */
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="h-8 w-28 rounded bg-slate-200 dark:bg-slate-700 mb-2" />
        <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
    );
  }

  const formatDisplay = (v) => {
    if (typeof value === 'string') return value;
    return Number.isInteger(numericValue) ? Math.round(v).toLocaleString() : v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const changeColor =
    changeType === 'increase'
      ? 'text-emerald-600 dark:text-emerald-400'
      : changeType === 'decrease'
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-slate-500 dark:text-slate-400';

  const ChangeIcon =
    changeType === 'increase'
      ? TrendingUp
      : changeType === 'decrease'
        ? TrendingDown
        : Minus;

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => onClick && (e.key === 'Enter' || e.key === ' ') && onClick(e)}
      className={[
        'relative bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 transition-all duration-300',
        'hover:shadow-lg hover:shadow-slate-200/40 dark:hover:shadow-slate-900/50 hover:-translate-y-0.5',
        onClick && 'cursor-pointer',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {title}
        </span>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${palette.bg}`}>
            <Icon className={`w-5 h-5 ${palette.text}`} />
          </div>
        )}
      </div>

      {/* value */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
            {prefix}
            {formatDisplay(animatedValue)}
            {suffix}
          </p>

          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${changeColor}`}>
              <ChangeIcon className="w-3.5 h-3.5" />
              <span>{change}</span>
            </div>
          )}
        </div>

        {trend && trend.length > 1 && (
          <Sparkline data={trend} color={palette.hex} />
        )}
      </div>
    </div>
  );
}

export default StatsCard;
