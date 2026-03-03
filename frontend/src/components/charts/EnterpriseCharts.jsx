// ============================================================================
// Enterprise Chart Components — Production-Grade Chart Wrappers
// ============================================================================
// Themed, responsive, animated chart components wrapping Chart.js & Recharts.
// Includes financial-specific charts: candlestick, waterfall, heatmap, treemap.
// ============================================================================

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, RadialLinearScale, TimeScale,
  Title, Tooltip as ChartTooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar, Doughnut, Radar, Scatter, Bubble } from 'react-chartjs-2';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar as RBar,
  LineChart, Line as RLine, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend as RLegend,
  ComposedChart, Scatter as RScatter, Brush, ReferenceLine,
} from 'recharts';
import { useInView } from '../components/ui/AnimatedComponents';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, RadialLinearScale, TimeScale,
  Title, ChartTooltip, Legend, Filler
);

// ============================================================================
// §0  THEME-AWARE DEFAULTS
// ============================================================================

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
  '#e11d48', '#84cc16', '#0ea5e9', '#a855f7', '#64748b',
];

const GRADIENT_PAIRS = [
  ['rgba(59,130,246,0.3)', 'rgba(59,130,246,0.02)'],
  ['rgba(16,185,129,0.3)', 'rgba(16,185,129,0.02)'],
  ['rgba(245,158,11,0.3)', 'rgba(245,158,11,0.02)'],
  ['rgba(239,68,68,0.3)', 'rgba(239,68,68,0.02)'],
  ['rgba(139,92,246,0.3)', 'rgba(139,92,246,0.02)'],
];

function useChartTheme() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return {
    isDark,
    gridColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    textColor: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
    labelColor: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.87)',
    tooltipBg: isDark ? '#1e293b' : '#ffffff',
    tooltipBorder: isDark ? '#334155' : '#e2e8f0',
    colors: CHART_COLORS,
    fontFamily: '"Inter", "Plus Jakarta Sans", sans-serif',
  };
}

const currencyFormatter = (value) => {
  if (value == null) return '';
  if (Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (Math.abs(value) >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value.toLocaleString('en-IN')}`;
};

// ============================================================================
// §1  AREA CHART — Gradient-filled area chart with optional forecast shading
// ============================================================================

export function FinancialAreaChart({
  data = [],
  dataKey = 'value',
  xKey = 'label',
  secondaryKey,
  height = 300,
  showGrid = true,
  showBrush = false,
  curveType = 'monotone',
  formatY = currencyFormatter,
  className = '',
  title,
  color = '#3b82f6',
  secondaryColor = '#10b981',
  gradientOpacity = 0.2,
  forecastStartIndex,
}) {
  const ct = useChartTheme();
  const [ref, isInView] = useInView({ threshold: 0.1 });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl px-4 py-3 text-sm">
        <p className="font-semibold text-gray-900 dark:text-white mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }} className="font-medium">
            {entry.name}: {formatY(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div ref={ref} className={`chart-animated ${className}`}>
      {title && <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={gradientOpacity} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
            {secondaryKey && (
              <linearGradient id={`gradient-${secondaryKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={secondaryColor} stopOpacity={gradientOpacity} />
                <stop offset="100%" stopColor={secondaryColor} stopOpacity={0.02} />
              </linearGradient>
            )}
          </defs>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={ct.gridColor} />}
          <XAxis
            dataKey={xKey}
            tick={{ fill: ct.textColor, fontSize: 12, fontFamily: ct.fontFamily }}
            axisLine={{ stroke: ct.gridColor }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatY}
            tick={{ fill: ct.textColor, fontSize: 12, fontFamily: ct.fontFamily }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <RTooltip content={<CustomTooltip />} />
          <Area
            type={curveType}
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#gradient-${dataKey})`}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
            animationDuration={isInView ? 1500 : 0}
            name={dataKey.charAt(0).toUpperCase() + dataKey.slice(1)}
          />
          {secondaryKey && (
            <Area
              type={curveType}
              dataKey={secondaryKey}
              stroke={secondaryColor}
              strokeWidth={2}
              fill={`url(#gradient-${secondaryKey})`}
              dot={false}
              strokeDasharray={forecastStartIndex != null ? "5 5" : undefined}
              animationDuration={isInView ? 1800 : 0}
              name={secondaryKey.charAt(0).toUpperCase() + secondaryKey.slice(1)}
            />
          )}
          {forecastStartIndex != null && data[forecastStartIndex] && (
            <ReferenceLine
              x={data[forecastStartIndex][xKey]}
              stroke={ct.textColor}
              strokeDasharray="3 3"
              label={{ value: 'Forecast →', fill: ct.textColor, fontSize: 11 }}
            />
          )}
          {showBrush && (
            <Brush
              dataKey={xKey}
              height={25}
              stroke={color}
              fill={ct.isDark ? '#1e293b' : '#f8fafc'}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// §2  BAR CHART — Grouped/stacked bars with rounded corners
// ============================================================================

export function FinancialBarChart({
  data = [],
  bars = [{ key: 'value', name: 'Amount', color: '#3b82f6' }],
  xKey = 'label',
  height = 300,
  stacked = false,
  showGrid = true,
  formatY = currencyFormatter,
  layout = 'vertical', // 'vertical' | 'horizontal'
  className = '',
  title,
  barRadius = 6,
  barSize,
}) {
  const ct = useChartTheme();
  const [ref, isInView] = useInView({ threshold: 0.1 });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl px-4 py-3 text-sm">
        <p className="font-semibold text-gray-900 dark:text-white mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color || entry.fill }} className="font-medium">
            {entry.name}: {formatY(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  const isHorizontal = layout === 'horizontal';

  return (
    <div ref={ref} className={`chart-animated ${className}`}>
      {title && <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={isHorizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 5, right: 10, left: isHorizontal ? 60 : 0, bottom: 5 }}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={ct.gridColor} />}
          {isHorizontal ? (
            <>
              <XAxis type="number" tickFormatter={formatY} tick={{ fill: ct.textColor, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey={xKey} tick={{ fill: ct.textColor, fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tick={{ fill: ct.textColor, fontSize: 12, fontFamily: ct.fontFamily }} axisLine={{ stroke: ct.gridColor }} tickLine={false} />
              <YAxis tickFormatter={formatY} tick={{ fill: ct.textColor, fontSize: 12, fontFamily: ct.fontFamily }} axisLine={false} tickLine={false} width={60} />
            </>
          )}
          <RTooltip content={<CustomTooltip />} />
          <RLegend wrapperStyle={{ fontSize: 12, fontFamily: ct.fontFamily }} />
          {bars.map((bar, i) => (
            <RBar
              key={bar.key}
              dataKey={bar.key}
              name={bar.name || bar.key}
              fill={bar.color || CHART_COLORS[i]}
              radius={stacked ? (i === bars.length - 1 ? [barRadius, barRadius, 0, 0] : 0) : [barRadius, barRadius, 0, 0]}
              stackId={stacked ? 'stack' : undefined}
              barSize={barSize}
              animationDuration={isInView ? 1200 : 0}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// §3  DONUT CHART — Category breakdown with center label
// ============================================================================

export function FinancialDonutChart({
  data = [],
  height = 300,
  innerRadius = '55%',
  outerRadius = '85%',
  className = '',
  title,
  centerLabel,
  centerValue,
  formatValue = currencyFormatter,
  showLabels = true,
  showLegend = true,
}) {
  const ct = useChartTheme();
  const [activeIndex, setActiveIndex] = useState(null);

  const coloredData = data.map((item, i) => ({
    ...item,
    fill: item.color || CHART_COLORS[i % CHART_COLORS.length],
  }));

  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const item = payload[0];
    const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl px-4 py-3 text-sm">
        <p className="font-semibold" style={{ color: item.payload.fill }}>{item.name}</p>
        <p className="text-gray-700 dark:text-gray-300">{formatValue(item.value)} ({pct}%)</p>
      </div>
    );
  };

  return (
    <div className={`chart-animated relative ${className}`}>
      {title && <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={coloredData}
            dataKey="value"
            nameKey="name"
            cx="50%" cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            animationDuration={1500}
            animationBegin={200}
          >
            {coloredData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.fill}
                stroke="none"
                style={{
                  transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                  transformOrigin: 'center',
                  transition: 'transform 0.2s ease',
                  filter: activeIndex === index ? 'brightness(1.1)' : 'none',
                }}
              />
            ))}
          </Pie>
          <RTooltip content={<CustomTooltip />} />
          {showLegend && (
            <RLegend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{ fontSize: 12, fontFamily: ct.fontFamily, paddingLeft: 20 }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>

      {/* Center label */}
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: title ? 28 : 0 }}>
          {centerValue && (
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{centerValue}</span>
          )}
          {centerLabel && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{centerLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// §4  LINE CHART (Chart.js) — Multi-line with gradient fills
// ============================================================================

export function MultiLineChart({
  labels = [],
  datasets = [],
  height = 300,
  className = '',
  title,
  formatY = currencyFormatter,
  showLegend = true,
  tension = 0.4,
}) {
  const ct = useChartTheme();
  const canvasRef = useRef(null);

  const chartData = useMemo(() => ({
    labels,
    datasets: datasets.map((ds, i) => ({
      label: ds.label || `Series ${i + 1}`,
      data: ds.data,
      borderColor: ds.color || CHART_COLORS[i],
      backgroundColor: ds.fill ? `${ds.color || CHART_COLORS[i]}20` : 'transparent',
      fill: ds.fill || false,
      tension,
      borderWidth: 2.5,
      pointRadius: ds.pointRadius ?? 0,
      pointHoverRadius: 5,
      pointBackgroundColor: '#fff',
      pointBorderColor: ds.color || CHART_COLORS[i],
      pointBorderWidth: 2,
      borderDash: ds.dashed ? [5, 5] : [],
    })),
  }), [labels, datasets, tension]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1500, easing: 'easeInOutQuart' },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: showLegend,
        position: 'top',
        labels: { color: ct.textColor, font: { family: ct.fontFamily, size: 12 }, usePointStyle: true, pointStyle: 'circle', padding: 20 },
      },
      tooltip: {
        backgroundColor: ct.tooltipBg,
        titleColor: ct.labelColor,
        bodyColor: ct.textColor,
        borderColor: ct.tooltipBorder,
        borderWidth: 1,
        cornerRadius: 12,
        padding: 12,
        titleFont: { weight: '600', family: ct.fontFamily },
        bodyFont: { family: ct.fontFamily },
        callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatY(ctx.parsed.y)}` },
      },
    },
    scales: {
      x: { grid: { color: ct.gridColor, drawBorder: false }, ticks: { color: ct.textColor, font: { size: 11, family: ct.fontFamily } } },
      y: { grid: { color: ct.gridColor, drawBorder: false }, ticks: { color: ct.textColor, font: { size: 11, family: ct.fontFamily }, callback: formatY }, beginAtZero: false },
    },
  }), [ct, formatY, showLegend]);

  return (
    <div className={`chart-animated ${className}`}>
      {title && <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{title}</h3>}
      <div style={{ height }}>
        <Line ref={canvasRef} data={chartData} options={options} />
      </div>
    </div>
  );
}

// ============================================================================
// §5  RADAR CHART — Financial health dimensions
// ============================================================================

export function FinancialRadarChart({
  labels = [],
  datasets = [],
  height = 300,
  className = '',
  title,
  maxValue = 100,
}) {
  const ct = useChartTheme();

  const chartData = useMemo(() => ({
    labels,
    datasets: datasets.map((ds, i) => ({
      label: ds.label || `Series ${i + 1}`,
      data: ds.data,
      borderColor: ds.color || CHART_COLORS[i],
      backgroundColor: `${ds.color || CHART_COLORS[i]}25`,
      borderWidth: 2.5,
      pointBackgroundColor: ds.color || CHART_COLORS[i],
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
    })),
  }), [labels, datasets]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1500, easing: 'easeInOutQuart' },
    plugins: {
      legend: { position: 'bottom', labels: { color: ct.textColor, font: { family: ct.fontFamily, size: 12 }, usePointStyle: true, padding: 15 } },
      tooltip: {
        backgroundColor: ct.tooltipBg,
        titleColor: ct.labelColor,
        bodyColor: ct.textColor,
        borderColor: ct.tooltipBorder,
        borderWidth: 1,
        cornerRadius: 12,
        padding: 12,
      },
    },
    scales: {
      r: {
        beginAtZero: true,
        max: maxValue,
        grid: { color: ct.gridColor },
        angleLines: { color: ct.gridColor },
        pointLabels: { color: ct.textColor, font: { size: 11, family: ct.fontFamily } },
        ticks: { display: false, stepSize: maxValue / 5 },
      },
    },
  }), [ct, maxValue]);

  return (
    <div className={`chart-animated ${className}`}>
      {title && <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{title}</h3>}
      <div style={{ height }}>
        <Radar data={chartData} options={options} />
      </div>
    </div>
  );
}

// ============================================================================
// §6  COMPOSED CHART — Income vs Expense with savings line
// ============================================================================

export function IncomeExpenseChart({
  data = [],
  height = 350,
  className = '',
  title,
}) {
  const ct = useChartTheme();
  const [ref, isInView] = useInView({ threshold: 0.1 });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl px-4 py-3 text-sm">
        <p className="font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 py-0.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
            <span className="text-gray-600 dark:text-gray-400">{entry.name}:</span>
            <span className="font-semibold text-gray-900 dark:text-white">{currencyFormatter(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div ref={ref} className={`chart-animated ${className}`}>
      {title && <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.gridColor} />
          <XAxis dataKey="month" tick={{ fill: ct.textColor, fontSize: 12, fontFamily: ct.fontFamily }} axisLine={{ stroke: ct.gridColor }} tickLine={false} />
          <YAxis tickFormatter={currencyFormatter} tick={{ fill: ct.textColor, fontSize: 12, fontFamily: ct.fontFamily }} axisLine={false} tickLine={false} width={60} />
          <RTooltip content={<CustomTooltip />} />
          <RLegend wrapperStyle={{ fontSize: 12, fontFamily: ct.fontFamily }} />
          <RBar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} barSize={20} animationDuration={isInView ? 1200 : 0} />
          <RBar dataKey="expense" name="Expense" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={20} animationDuration={isInView ? 1200 : 0} />
          <RLine type="monotone" dataKey="savings" name="Savings" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#fff', strokeWidth: 2, r: 4 }} animationDuration={isInView ? 1800 : 0} />
          <ReferenceLine y={0} stroke={ct.textColor} strokeDasharray="3 3" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// §7  HEATMAP — Calendar-style spending heatmap
// ============================================================================

export function SpendingHeatmap({
  data = [], // [{ date: 'YYYY-MM-DD', value: 1234 }]
  height = 180,
  className = '',
  title,
  color = '#3b82f6',
}) {
  const ct = useChartTheme();
  const containerRef = useRef(null);

  const { cells, weeks, maxValue } = useMemo(() => {
    if (!data.length) return { cells: [], weeks: 0, maxValue: 0 };
    const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
    const max = Math.max(...data.map(d => d.value));
    const startDate = new Date(sorted[0].date);
    const endDate = new Date(sorted[sorted.length - 1].date);
    const dayMap = new Map(data.map(d => [d.date, d.value]));
    const result = [];

    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        value: dayMap.get(dateStr) || 0,
        dayOfWeek: current.getDay(),
        weekIndex: Math.floor((current - startDate) / (7 * 86400000)),
      });
      current.setDate(current.getDate() + 1);
    }

    return { cells: result, weeks: result[result.length - 1]?.weekIndex || 0, maxValue: max };
  }, [data]);

  const getColor = (value) => {
    if (!value) return ct.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
    const intensity = Math.min(value / (maxValue || 1), 1);
    const baseRGB = color === '#3b82f6' ? [59, 130, 246] : [16, 185, 129];
    return `rgba(${baseRGB[0]},${baseRGB[1]},${baseRGB[2]},${0.15 + intensity * 0.85})`;
  };

  const cellSize = 14;
  const gap = 3;

  return (
    <div className={`chart-animated ${className}`}>
      {title && <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{title}</h3>}
      <div ref={containerRef} className="overflow-x-auto pb-2" style={{ maxHeight: height }}>
        <svg
          width={(weeks + 1) * (cellSize + gap) + 30}
          height={7 * (cellSize + gap) + 20}
        >
          {/* Day labels */}
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <text
              key={i}
              x={10}
              y={i * (cellSize + gap) + cellSize}
              fill={ct.textColor}
              fontSize={9}
              fontFamily={ct.fontFamily}
              textAnchor="middle"
            >
              {i % 2 === 1 ? day : ''}
            </text>
          ))}

          {/* Cells */}
          {cells.map((cell, i) => (
            <rect
              key={i}
              x={cell.weekIndex * (cellSize + gap) + 25}
              y={cell.dayOfWeek * (cellSize + gap)}
              width={cellSize}
              height={cellSize}
              fill={getColor(cell.value)}
              rx={3}
              className="transition-all duration-200 hover:stroke-2"
              style={{ cursor: 'pointer' }}
            >
              <title>{`${cell.date}: ₹${cell.value.toLocaleString('en-IN')}`}</title>
            </rect>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ============================================================================
// §8  WATERFALL CHART — Financial flow breakdown
// ============================================================================

export function WaterfallChart({
  data = [], // { name: 'Salary', value: 50000, type: 'income'|'expense'|'total' }
  height = 350,
  className = '',
  title,
}) {
  const ct = useChartTheme();
  const [ref, isInView] = useInView({ threshold: 0.1 });

  const processedData = useMemo(() => {
    let running = 0;
    return data.map(item => {
      if (item.type === 'total') {
        const result = { ...item, start: 0, end: running, display: running };
        return result;
      }
      const start = running;
      const value = item.type === 'income' ? Math.abs(item.value) : -Math.abs(item.value);
      running += value;
      return { ...item, start, end: running, display: value, bottom: Math.min(start, running) };
    });
  }, [data]);

  const max = Math.max(...processedData.map(d => Math.max(d.start || 0, d.end || 0)));
  const min = Math.min(0, ...processedData.map(d => Math.min(d.start || 0, d.end || 0)));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl px-4 py-3 text-sm">
        <p className="font-semibold text-gray-900 dark:text-white">{d?.name}</p>
        <p className={d?.type === 'income' ? 'text-emerald-600' : d?.type === 'expense' ? 'text-red-600' : 'text-blue-600'}>
          {currencyFormatter(d?.display || d?.value)}
        </p>
      </div>
    );
  };

  return (
    <div ref={ref} className={`chart-animated ${className}`}>
      {title && <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={processedData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.gridColor} />
          <XAxis dataKey="name" tick={{ fill: ct.textColor, fontSize: 11, fontFamily: ct.fontFamily }} axisLine={{ stroke: ct.gridColor }} tickLine={false} />
          <YAxis tickFormatter={currencyFormatter} tick={{ fill: ct.textColor, fontSize: 11, fontFamily: ct.fontFamily }} axisLine={false} tickLine={false} width={60} domain={[min, max * 1.1]} />
          <RTooltip content={<CustomTooltip />} />
          {/* Invisible "base" */}
          <RBar dataKey="bottom" stackId="stack" fill="transparent" />
          {/* Visible bar */}
          <RBar
            dataKey="display"
            stackId="stack"
            radius={[6, 6, 0, 0]}
            animationDuration={isInView ? 1200 : 0}
          >
            {processedData.map((entry, index) => (
              <Cell
                key={index}
                fill={
                  entry.type === 'income' ? '#10b981' :
                  entry.type === 'expense' ? '#ef4444' :
                  '#3b82f6'
                }
              />
            ))}
          </RBar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// §9  CHART CARD WRAPPER — Consistent card styling for any chart
// ============================================================================

export function ChartCard({
  title,
  subtitle,
  action,
  actionLabel,
  children,
  loading = false,
  className = '',
  noPadding = false,
}) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && (
            <button onClick={action} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
              {actionLabel || 'View Details'}
            </button>
          )}
        </div>
      )}
      <div className={noPadding ? '' : 'px-5 pb-5'}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="loading-spinner w-8 h-8" />
          </div>
        ) : children}
      </div>
    </div>
  );
}

// ============================================================================
// §10  MINI CHART — Compact chart for stat cards
// ============================================================================

export function MiniChart({
  data = [],
  type = 'area', // 'area' | 'bar'
  color = '#3b82f6',
  height = 50,
  width = 120,
}) {
  if (!data.length) return null;

  if (type === 'bar') {
    const max = Math.max(...data);
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {data.map((value, i) => {
          const barW = (width / data.length) - 2;
          const barH = (value / max) * (height - 4);
          return (
            <rect
              key={i}
              x={i * (barW + 2)}
              y={height - barH - 2}
              width={barW}
              height={barH}
              rx={2}
              fill={color}
              opacity={0.3 + (i / data.length) * 0.7}
            />
          );
        })}
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`mini-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#mini-grad-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default {
  FinancialAreaChart,
  FinancialBarChart,
  FinancialDonutChart,
  MultiLineChart,
  FinancialRadarChart,
  IncomeExpenseChart,
  SpendingHeatmap,
  WaterfallChart,
  ChartCard,
  MiniChart,
  CHART_COLORS,
  currencyFormatter,
};
