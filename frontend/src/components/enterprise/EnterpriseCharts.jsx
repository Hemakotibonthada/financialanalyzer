// ============================================================================
// ENTERPRISE DATA VISUALIZATION LIBRARY
// Reusable, theme-aware chart components built on Recharts
// ============================================================================
import React, { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Treemap,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Label,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

// ── Color Palettes ──────────────────────────────────────────────────────────
export const CHART_PALETTES = {
  default: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#F97316'],
  cool:    ['#06B6D4', '#3B82F6', '#8B5CF6', '#A855F7', '#6366F1', '#2DD4BF', '#22D3EE', '#818CF8'],
  warm:    ['#F97316', '#EF4444', '#EC4899', '#F59E0B', '#E11D48', '#FB923C', '#F472B6', '#FCD34D'],
  nature:  ['#10B981', '#059669', '#14B8A6', '#34D399', '#6EE7B7', '#065F46', '#047857', '#A7F3D0'],
  mono:    ['#1F2937', '#374151', '#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB', '#F3F4F6'],
};

// ── Formatters ──────────────────────────────────────────────────────────────
export function formatINR(value) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value}`;
}

export function formatPercent(value) {
  return `${value.toFixed(1)}%`;
}

// ── Shared Tooltip ──────────────────────────────────────────────────────────
function SharedTooltip({ active, payload, label, formatter = 'inr' }) {
  if (!active || !payload?.length) return null;
  const format = formatter === 'percent' ? formatPercent : formatter === 'raw' ? (v) => v : formatINR;
  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 min-w-[140px]">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-600 dark:text-gray-300">{entry.name}</span>
          </span>
          <span className="font-medium text-gray-900 dark:text-white">
            {typeof entry.value === 'number' ? format(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Shared Axis Defaults ────────────────────────────────────────────────────
function getAxisDefaults(theme) {
  const isDark = theme === 'dark' || theme === 'black';
  return {
    tick: { fontSize: 11, fill: isDark ? '#9CA3AF' : '#6B7280' },
    axisLine: { stroke: isDark ? '#374151' : '#E5E7EB' },
    tickLine: false,
    gridStroke: isDark ? '#1F2937' : '#F3F4F6',
  };
}

// ============================================================================
// ENTERPRISE AREA CHART
// ============================================================================
export function EnterpriseAreaChart({
  data, dataKey, xKey = 'label', height = 300, palette = 'default',
  stacked = false, gradient = true, formatter = 'inr', showGrid = true,
  showLegend = true, reference, areaKeys, ...rest
}) {
  const { theme } = useTheme();
  const ax = getAxisDefaults(theme);
  const colors = CHART_PALETTES[palette] || CHART_PALETTES.default;
  const keys = areaKeys || (dataKey ? [dataKey] : Object.keys(data[0] || {}).filter(k => k !== xKey));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} {...rest}>
        {keys.map((key, i) => gradient && (
          <defs key={`grad-${key}`}>
            <linearGradient id={`areaGrad${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors[i % colors.length]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0.02} />
            </linearGradient>
          </defs>
        ))}
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={ax.gridStroke} />}
        <XAxis dataKey={xKey} {...ax} />
        <YAxis {...ax} tickFormatter={formatter === 'inr' ? v => formatINR(v) : formatter === 'percent' ? v => `${v}%` : undefined} />
        <Tooltip content={<SharedTooltip formatter={formatter} />} />
        {showLegend && <Legend />}
        {reference !== undefined && <ReferenceLine y={reference} stroke="#EF4444" strokeDasharray="5 5" />}
        {keys.map((key, i) => (
          <Area key={key} type="monotone" dataKey={key} stackId={stacked ? 'stack' : undefined}
            stroke={colors[i % colors.length]} fill={gradient ? `url(#areaGrad${i})` : colors[i % colors.length]}
            strokeWidth={2} dot={false} name={key} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// ENTERPRISE BAR CHART
// ============================================================================
export function EnterpriseBarChart({
  data, dataKey, xKey = 'label', height = 300, palette = 'default',
  stacked = false, horizontal = false, formatter = 'inr', showGrid = true,
  showLegend = true, radius = [4, 4, 0, 0], barKeys, ...rest
}) {
  const { theme } = useTheme();
  const ax = getAxisDefaults(theme);
  const colors = CHART_PALETTES[palette] || CHART_PALETTES.default;
  const keys = barKeys || (dataKey ? [dataKey] : Object.keys(data[0] || {}).filter(k => k !== xKey));
  const Chart = horizontal ? BarChart : BarChart;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} {...rest}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={ax.gridStroke} />}
        {horizontal ? (
          <>
            <XAxis type="number" {...ax} tickFormatter={formatter === 'inr' ? v => formatINR(v) : undefined} />
            <YAxis type="category" dataKey={xKey} {...ax} width={80} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} {...ax} />
            <YAxis {...ax} tickFormatter={formatter === 'inr' ? v => formatINR(v) : formatter === 'percent' ? v => `${v}%` : undefined} />
          </>
        )}
        <Tooltip content={<SharedTooltip formatter={formatter} />} />
        {showLegend && keys.length > 1 && <Legend />}
        {keys.map((key, i) => (
          <Bar key={key} dataKey={key} stackId={stacked ? 'stack' : undefined}
            fill={colors[i % colors.length]} radius={radius} name={key} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// ENTERPRISE LINE CHART
// ============================================================================
export function EnterpriseLineChart({
  data, dataKey, xKey = 'label', height = 300, palette = 'default',
  formatter = 'inr', showGrid = true, showLegend = true, showDots = false,
  smooth = true, reference, lineKeys, ...rest
}) {
  const { theme } = useTheme();
  const ax = getAxisDefaults(theme);
  const colors = CHART_PALETTES[palette] || CHART_PALETTES.default;
  const keys = lineKeys || (dataKey ? [dataKey] : Object.keys(data[0] || {}).filter(k => k !== xKey));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} {...rest}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={ax.gridStroke} />}
        <XAxis dataKey={xKey} {...ax} />
        <YAxis {...ax} tickFormatter={formatter === 'inr' ? v => formatINR(v) : formatter === 'percent' ? v => `${v}%` : undefined} />
        <Tooltip content={<SharedTooltip formatter={formatter} />} />
        {showLegend && keys.length > 1 && <Legend />}
        {reference !== undefined && <ReferenceLine y={reference} stroke="#EF4444" strokeDasharray="5 5" />}
        {keys.map((key, i) => (
          <Line key={key} type={smooth ? 'monotone' : 'linear'} dataKey={key}
            stroke={colors[i % colors.length]} strokeWidth={2}
            dot={showDots ? { r: 3, fill: colors[i % colors.length] } : false}
            name={key} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// ENTERPRISE DONUT / PIE CHART
// ============================================================================
export function EnterpriseDonutChart({
  data, dataKey = 'value', nameKey = 'name', height = 300,
  palette = 'default', innerRadius = 55, outerRadius = 90,
  showLabels = true, formatter = 'inr', centerLabel, ...rest
}) {
  const colors = CHART_PALETTES[palette] || CHART_PALETTES.default;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart {...rest}>
        <Pie data={data} cx="50%" cy="50%" innerRadius={innerRadius} outerRadius={outerRadius}
          paddingAngle={2} dataKey={dataKey}
          label={showLabels ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%` : false}>
          {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Pie>
        <Tooltip content={<SharedTooltip formatter={formatter} />} />
        {centerLabel && (
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-gray-800 dark:fill-gray-200 text-lg font-bold">
            {centerLabel}
          </text>
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// ENTERPRISE RADAR CHART
// ============================================================================
export function EnterpriseRadarChart({
  data, dataKey = 'value', axisKey = 'label', height = 300,
  palette = 'default', radarKeys, showLegend = true, ...rest
}) {
  const colors = CHART_PALETTES[palette] || CHART_PALETTES.default;
  const keys = radarKeys || [dataKey];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} {...rest}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey={axisKey} tick={{ fontSize: 11 }} />
        <PolarRadiusAxis tick={{ fontSize: 10 }} />
        {keys.map((key, i) => (
          <Radar key={key} name={key} dataKey={key}
            stroke={colors[i % colors.length]} fill={colors[i % colors.length]}
            fillOpacity={0.2} strokeWidth={2} />
        ))}
        {showLegend && keys.length > 1 && <Legend />}
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// ENTERPRISE COMBO CHART (ComposedChart)
// ============================================================================
export function EnterpriseComboChart({
  data, xKey = 'label', height = 350, palette = 'default', formatter = 'inr',
  showGrid = true, showLegend = true, reference,
  bars = [], lines = [], areas = [], ...rest
}) {
  const { theme } = useTheme();
  const ax = getAxisDefaults(theme);
  const colors = CHART_PALETTES[palette] || CHART_PALETTES.default;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} {...rest}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={ax.gridStroke} />}
        <XAxis dataKey={xKey} {...ax} />
        <YAxis {...ax} tickFormatter={formatter === 'inr' ? v => formatINR(v) : undefined} />
        <Tooltip content={<SharedTooltip formatter={formatter} />} />
        {showLegend && <Legend />}
        {reference !== undefined && <ReferenceLine y={reference} stroke="#9CA3AF" strokeDasharray="5 5" />}
        {areas.map((key, i) => (
          <Area key={key} type="monotone" dataKey={key} stroke={colors[(bars.length + lines.length + i) % colors.length]}
            fill={colors[(bars.length + lines.length + i) % colors.length]} fillOpacity={0.1} strokeWidth={2} dot={false} name={key} />
        ))}
        {bars.map((key, i) => (
          <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} name={key} />
        ))}
        {lines.map((key, i) => (
          <Line key={key} type="monotone" dataKey={key} stroke={colors[(bars.length + i) % colors.length]}
            strokeWidth={2} dot={false} name={key} />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// ENTERPRISE MINI SPARKLINE
// ============================================================================
export function Sparkline({ data, dataKey = 'value', color = '#3B82F6', height = 40, width = 120, showArea = true }) {
  return (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={dataKey} stroke={color} fill={showArea ? `url(#spark-${color})` : 'transparent'}
          strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// ENTERPRISE STAT CARD with Sparkline
// ============================================================================
export function StatCard({ label, value, change, changeLabel, trend = [], color = '#3B82F6', formatter = 'inr' }) {
  const format = formatter === 'percent' ? formatPercent : formatter === 'raw' ? (v) => v : formatINR;
  const isPositive = typeof change === 'number' ? change >= 0 : true;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {typeof value === 'number' ? format(value) : value}
          </p>
          {change !== undefined && (
            <p className={`text-xs mt-1 ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
              {isPositive ? '▲' : '▼'} {Math.abs(change).toFixed(1)}% {changeLabel || ''}
            </p>
          )}
        </div>
        {trend.length > 0 && (
          <Sparkline data={trend} color={color} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ENTERPRISE PROGRESS BAR
// ============================================================================
export function ProgressBar({ value = 0, max = 100, label, color = '#3B82F6', showValue = true, size = 'md' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const h = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-4' : 'h-2.5';

  return (
    <div>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>}
          {showValue && <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{pct.toFixed(0)}%</span>}
        </div>
      )}
      <div className={`w-full ${h} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}>
        <div className={`${h} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ============================================================================
// ENTERPRISE GAUGE
// ============================================================================
export function Gauge({ value = 0, max = 100, label, size = 120, color = '#3B82F6' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = size / 2 - 10;
  const circumference = Math.PI * radius; // semicircle
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 15} viewBox={`0 0 ${size} ${size / 2 + 15}`}>
        {/* Background arc */}
        <path d={`M 10 ${size / 2 + 5} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2 + 5}`}
          fill="none" stroke="#E5E7EB" strokeWidth={8} strokeLinecap="round" />
        {/* Value arc */}
        <path d={`M 10 ${size / 2 + 5} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2 + 5}`}
          fill="none" stroke={color} strokeWidth={8} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
        {/* Value text */}
        <text x="50%" y={size / 2 - 2} textAnchor="middle" className="fill-gray-900 dark:fill-white text-lg font-bold" fontSize={size / 5}>
          {Math.round(value)}
        </text>
      </svg>
      {label && <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">{label}</p>}
    </div>
  );
}

// ============================================================================
// EXPORT ALL
// ============================================================================
const EnterpriseCharts = {
  AreaChart: EnterpriseAreaChart,
  BarChart: EnterpriseBarChart,
  LineChart: EnterpriseLineChart,
  DonutChart: EnterpriseDonutChart,
  RadarChart: EnterpriseRadarChart,
  ComboChart: EnterpriseComboChart,
  Sparkline,
  StatCard,
  ProgressBar,
  Gauge,
  formatINR,
  formatPercent,
  CHART_PALETTES,
};

export default EnterpriseCharts;
