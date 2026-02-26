// ============================================================
// Financial Analyzer - Advanced Chart Components Library
// Feature-rich, animated chart wrappers for financial data
// ============================================================

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Line, Bar, Doughnut, Pie, Radar, PolarArea, Scatter, Bubble } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, RadialLinearScale, Filler, Tooltip as ChartTooltip,
  Legend, Title, SubTitle, TimeScale
} from 'chart.js';
import { Badge, AnimatedCard, SkeletonLoader, AnimatedTabs } from './ComponentLibrary';

// Register ChartJS components
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, RadialLinearScale, Filler,
  ChartTooltip, Legend, Title, SubTitle
);

// ======================== CHART COLORS ========================
const CHART_COLORS = {
  primary: ['#667eea', '#764ba2', '#4facfe', '#00f2fe', '#43e97b', '#fa709a', '#fee140'],
  gradient: [
    { start: '#667eea', end: '#764ba2' },
    { start: '#4facfe', end: '#00f2fe' },
    { start: '#43e97b', end: '#38f9d7' },
    { start: '#fa709a', end: '#fee140' },
    { start: '#a18cd1', end: '#fbc2eb' },
    { start: '#f093fb', end: '#f5576c' },
    { start: '#fccb90', end: '#d57eeb' },
  ],
  dark: ['#818cf8', '#a78bfa', '#67e8f9', '#34d399', '#fbbf24', '#fb7185', '#c084fc'],
};

// ======================== HELPER: Create Gradient ========================
function createGradient(ctx, colorStart, colorEnd, direction = 'vertical') {
  if (!ctx) return colorStart;
  const gradient = direction === 'vertical'
    ? ctx.createLinearGradient(0, 0, 0, ctx.canvas.height)
    : ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
  gradient.addColorStop(0, colorStart);
  gradient.addColorStop(1, colorEnd);
  return gradient;
}

function createAreaGradient(ctx, color, opacity = 0.3) {
  if (!ctx) return color;
  const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
  gradient.addColorStop(0, hexToRgba(color, opacity));
  gradient.addColorStop(1, hexToRgba(color, 0.01));
  return gradient;
}

function hexToRgba(hex, opacity) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${opacity})`;
}

// ======================== ENHANCED LINE CHART ========================
// Feature #55: Advanced Line Chart with gradients and animations

export function EnhancedLineChart({
  data, labels, datasets, title, subtitle, height = 300,
  showLegend = true, showGrid = true, smooth = true, filled = true,
  showPoints = true, responsive = true, animated = true,
  currency = false, percentage = false, compact = false,
  loading = false, emptyMessage = 'No data available',
  xAxisLabel, yAxisLabel, annotations = [],
  comparisonMode = false, className = '', gradient = true,
}) {
  const chartRef = useRef(null);

  if (loading) return <SkeletonLoader variant="chart" className={className} />;

  // Build chart data
  const chartData = useMemo(() => {
    if (data && !datasets) {
      // Simple single dataset
      return {
        labels: labels || data.map((_, i) => i + 1),
        datasets: [{
          label: title || 'Value',
          data: data,
          borderColor: CHART_COLORS.primary[0],
          backgroundColor: gradient ? (ctx) => {
            if (!ctx.chart?.ctx) return hexToRgba(CHART_COLORS.primary[0], 0.3);
            return createAreaGradient(ctx.chart.ctx, CHART_COLORS.primary[0]);
          } : hexToRgba(CHART_COLORS.primary[0], 0.1),
          fill: filled,
          tension: smooth ? 0.4 : 0,
          borderWidth: 2.5,
          pointRadius: showPoints ? 4 : 0,
          pointHoverRadius: 6,
          pointBackgroundColor: '#fff',
          pointBorderColor: CHART_COLORS.primary[0],
          pointBorderWidth: 2,
        }],
      };
    }

    if (datasets) {
      return {
        labels: labels || [],
        datasets: datasets.map((ds, i) => ({
          ...ds,
          borderColor: ds.borderColor || CHART_COLORS.primary[i % CHART_COLORS.primary.length],
          backgroundColor: ds.backgroundColor || (filled
            ? hexToRgba(CHART_COLORS.primary[i % CHART_COLORS.primary.length], 0.1)
            : 'transparent'),
          fill: ds.fill !== undefined ? ds.fill : filled,
          tension: ds.tension !== undefined ? ds.tension : (smooth ? 0.4 : 0),
          borderWidth: ds.borderWidth || 2.5,
          pointRadius: ds.pointRadius !== undefined ? ds.pointRadius : (showPoints ? 4 : 0),
          pointHoverRadius: ds.pointHoverRadius || 6,
          pointBackgroundColor: ds.pointBackgroundColor || '#fff',
          pointBorderColor: ds.pointBorderColor || ds.borderColor || CHART_COLORS.primary[i % CHART_COLORS.primary.length],
          pointBorderWidth: ds.pointBorderWidth || 2,
        })),
      };
    }

    return { labels: [], datasets: [] };
  }, [data, labels, datasets, title, filled, smooth, showPoints, gradient]);

  const options = useMemo(() => ({
    responsive,
    maintainAspectRatio: false,
    animation: animated ? {
      duration: 1200,
      easing: 'easeOutQuart',
      delay: (context) => context.dataIndex * 50,
    } : false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: showLegend && chartData.datasets.length > 1,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { family: "'Inter', sans-serif", size: 12 },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleFont: { family: "'Inter', sans-serif", size: 13, weight: '600' },
        bodyFont: { family: "'Inter', sans-serif", size: 12 },
        padding: 12,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 12,
        displayColors: true,
        callbacks: {
          label: (context) => {
            let value = context.parsed.y;
            if (currency) value = `₹${value.toLocaleString('en-IN')}`;
            else if (percentage) value = `${value.toFixed(1)}%`;
            else if (compact) value = formatCompact(value);
            return `${context.dataset.label}: ${value}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: showGrid, color: 'rgba(156, 163, 175, 0.1)' },
        ticks: {
          font: { family: "'Inter', sans-serif", size: 11 },
          color: '#9CA3AF',
          maxTicksLimit: 12,
        },
        title: xAxisLabel ? { display: true, text: xAxisLabel, color: '#9CA3AF' } : undefined,
      },
      y: {
        grid: { display: showGrid, color: 'rgba(156, 163, 175, 0.1)' },
        ticks: {
          font: { family: "'Inter', sans-serif", size: 11 },
          color: '#9CA3AF',
          callback: (value) => {
            if (currency) return `₹${formatCompact(value)}`;
            if (percentage) return `${value}%`;
            return formatCompact(value);
          },
        },
        title: yAxisLabel ? { display: true, text: yAxisLabel, color: '#9CA3AF' } : undefined,
        beginAtZero: false,
      },
    },
  }), [responsive, animated, showLegend, showGrid, currency, percentage, compact, xAxisLabel, yAxisLabel, chartData]);

  if (chartData.datasets.length === 0 || chartData.labels.length === 0) {
    return (
      <AnimatedCard className={className}>
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <span className="text-4xl mb-3">📊</span>
          <span className="text-sm">{emptyMessage}</span>
        </div>
      </AnimatedCard>
    );
  }

  return (
    <div className={className} style={{ height }}>
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
}

// ======================== ENHANCED BAR CHART ========================
// Feature #56: Advanced Bar Chart with animations

export function EnhancedBarChart({
  data, labels, datasets, title, height = 300,
  showLegend = true, showGrid = true, responsive = true, animated = true,
  horizontal = false, stacked = false, grouped = true,
  currency = false, percentage = false,
  loading = false, emptyMessage = 'No data available',
  barRadius = 8, maxBarWidth = 40, className = '', gradient = true,
  colors,
}) {
  if (loading) return <SkeletonLoader variant="chart" className={className} />;

  const chartColors = colors || CHART_COLORS.primary;

  const chartData = useMemo(() => {
    if (data && !datasets) {
      return {
        labels: labels || data.map((_, i) => `Item ${i + 1}`),
        datasets: [{
          label: title || 'Value',
          data: data,
          backgroundColor: data.map((_, i) => hexToRgba(chartColors[i % chartColors.length], 0.8)),
          borderColor: data.map((_, i) => chartColors[i % chartColors.length]),
          borderWidth: 1.5,
          borderRadius: barRadius,
          borderSkipped: false,
          maxBarThickness: maxBarWidth,
        }],
      };
    }

    return {
      labels: labels || [],
      datasets: (datasets || []).map((ds, i) => ({
        ...ds,
        backgroundColor: ds.backgroundColor || hexToRgba(chartColors[i % chartColors.length], 0.8),
        borderColor: ds.borderColor || chartColors[i % chartColors.length],
        borderWidth: ds.borderWidth || 1.5,
        borderRadius: ds.borderRadius || barRadius,
        borderSkipped: false,
        maxBarThickness: ds.maxBarThickness || maxBarWidth,
      })),
    };
  }, [data, labels, datasets, title, chartColors, barRadius, maxBarWidth]);

  const options = useMemo(() => ({
    responsive,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' : 'x',
    animation: animated ? {
      duration: 1000,
      easing: 'easeOutQuart',
      delay: (context) => context.dataIndex * 80,
    } : false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: showLegend && chartData.datasets.length > 1,
        position: 'top',
        labels: { usePointStyle: true, padding: 20, font: { family: "'Inter', sans-serif", size: 12 } },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleFont: { family: "'Inter', sans-serif", size: 13, weight: '600' },
        bodyFont: { family: "'Inter', sans-serif", size: 12 },
        padding: 12,
        cornerRadius: 12,
        callbacks: {
          label: (context) => {
            let value = context.parsed[horizontal ? 'x' : 'y'];
            if (currency) value = `₹${value.toLocaleString('en-IN')}`;
            else if (percentage) value = `${value.toFixed(1)}%`;
            return `${context.dataset.label}: ${value}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: horizontal ? showGrid : false, color: 'rgba(156, 163, 175, 0.1)' },
        stacked,
        ticks: { font: { family: "'Inter', sans-serif", size: 11 }, color: '#9CA3AF' },
      },
      y: {
        grid: { display: horizontal ? false : showGrid, color: 'rgba(156, 163, 175, 0.1)' },
        stacked,
        beginAtZero: true,
        ticks: {
          font: { family: "'Inter', sans-serif", size: 11 },
          color: '#9CA3AF',
          callback: (value) => {
            if (currency) return `₹${formatCompact(value)}`;
            if (percentage) return `${value}%`;
            return formatCompact(value);
          },
        },
      },
    },
  }), [responsive, animated, horizontal, stacked, showLegend, showGrid, currency, percentage, chartData]);

  return (
    <div className={className} style={{ height }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}

// ======================== ENHANCED DOUGHNUT CHART ========================
// Feature #57: Advanced Doughnut/Pie Chart

export function EnhancedDoughnutChart({
  data, labels, title, height = 300,
  showLegend = true, responsive = true, animated = true,
  currency = false, isPie = false, cutout = '70%',
  loading = false, emptyMessage = 'No data available',
  className = '', colors, centerLabel, centerValue,
}) {
  if (loading) return <SkeletonLoader variant="chart" className={className} />;

  const chartColors = colors || CHART_COLORS.primary;

  const chartData = useMemo(() => ({
    labels: labels || data.map((_, i) => `Category ${i + 1}`),
    datasets: [{
      data: data,
      backgroundColor: data.map((_, i) => hexToRgba(chartColors[i % chartColors.length], 0.85)),
      borderColor: data.map((_, i) => chartColors[i % chartColors.length]),
      borderWidth: 2,
      hoverOffset: 8,
      spacing: 2,
    }],
  }), [data, labels, chartColors]);

  const total = data.reduce((sum, val) => sum + val, 0);

  const options = useMemo(() => ({
    responsive,
    maintainAspectRatio: false,
    cutout: isPie ? 0 : cutout,
    animation: animated ? {
      animateRotate: true,
      animateScale: true,
      duration: 1200,
      easing: 'easeOutQuart',
    } : false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 16,
          font: { family: "'Inter', sans-serif", size: 12 },
          generateLabels: (chart) => {
            const ds = chart.data.datasets[0];
            return chart.data.labels.map((label, i) => ({
              text: `${label} (${((ds.data[i] / total) * 100).toFixed(1)}%)`,
              fillStyle: ds.backgroundColor[i],
              strokeStyle: ds.borderColor[i],
              lineWidth: 2,
              pointStyle: 'circle',
              index: i,
            }));
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        padding: 12,
        cornerRadius: 12,
        callbacks: {
          label: (context) => {
            const value = context.parsed;
            const pct = ((value / total) * 100).toFixed(1);
            const formatted = currency ? `₹${value.toLocaleString('en-IN')}` : value.toLocaleString();
            return `${context.label}: ${formatted} (${pct}%)`;
          },
        },
      },
    },
  }), [responsive, animated, isPie, cutout, showLegend, total, currency]);

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <span className="text-gray-400 text-sm">{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {isPie ? (
        <Pie data={chartData} options={options} />
      ) : (
        <Doughnut data={chartData} options={options} />
      )}
      {centerLabel && !isPie && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{centerValue}</span>
          <span className="text-xs text-gray-500">{centerLabel}</span>
        </div>
      )}
    </div>
  );
}

// ======================== RADAR CHART ========================
// Feature #58: Financial Radar/Spider Chart

export function FinancialRadarChart({
  data, labels, datasets, title, height = 300,
  showLegend = true, responsive = true, animated = true,
  loading = false, className = '', colors,
  maxScale,
}) {
  if (loading) return <SkeletonLoader variant="chart" className={className} />;

  const chartColors = colors || CHART_COLORS.primary;

  const chartData = useMemo(() => {
    if (data && !datasets) {
      return {
        labels: labels || [],
        datasets: [{
          label: title || 'Score',
          data: data,
          backgroundColor: hexToRgba(chartColors[0], 0.2),
          borderColor: chartColors[0],
          borderWidth: 2.5,
          pointBackgroundColor: chartColors[0],
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
        }],
      };
    }

    return {
      labels: labels || [],
      datasets: (datasets || []).map((ds, i) => ({
        ...ds,
        backgroundColor: ds.backgroundColor || hexToRgba(chartColors[i % chartColors.length], 0.15),
        borderColor: ds.borderColor || chartColors[i % chartColors.length],
        borderWidth: ds.borderWidth || 2.5,
        pointBackgroundColor: ds.pointBackgroundColor || chartColors[i % chartColors.length],
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      })),
    };
  }, [data, labels, datasets, title, chartColors]);

  const options = useMemo(() => ({
    responsive,
    maintainAspectRatio: false,
    animation: animated ? { duration: 1000, easing: 'easeOutQuart' } : false,
    plugins: {
      legend: {
        display: showLegend && chartData.datasets.length > 1,
        position: 'top',
        labels: { usePointStyle: true, padding: 20 },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        padding: 12,
        cornerRadius: 12,
      },
    },
    scales: {
      r: {
        beginAtZero: true,
        max: maxScale,
        grid: { color: 'rgba(156, 163, 175, 0.15)' },
        angleLines: { color: 'rgba(156, 163, 175, 0.15)' },
        pointLabels: {
          font: { family: "'Inter', sans-serif", size: 11, weight: '500' },
          color: '#6B7280',
        },
        ticks: {
          display: false,
          stepSize: maxScale ? maxScale / 5 : undefined,
        },
      },
    },
  }), [responsive, animated, showLegend, chartData, maxScale]);

  return (
    <div className={className} style={{ height }}>
      <Radar data={chartData} options={options} />
    </div>
  );
}

// ======================== SPARKLINE ========================
// Feature #59: Mini Sparkline Chart

export function Sparkline({ data = [], color = '#667eea', height = 40, width = 120, showDot = true, filled = true }) {
  if (!data.length) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 4;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const points = data.map((val, i) => ({
    x: padding + (i / (data.length - 1)) * innerWidth,
    y: padding + innerHeight - ((val - min) / range) * innerHeight,
  }));

  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cpx1 = prev.x + (p.x - prev.x) / 3;
    const cpx2 = prev.x + 2 * (p.x - prev.x) / 3;
    return `${acc} C ${cpx1} ${prev.y}, ${cpx2} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;
  const lastPoint = points[points.length - 1];
  const isPositive = data[data.length - 1] >= data[0];
  const lineColor = color === 'auto' ? (isPositive ? '#10B981' : '#EF4444') : color;

  return (
    <svg width={width} height={height} className="inline-block">
      {filled && (
        <defs>
          <linearGradient id={`sparkline-grad-${lineColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>
      )}
      {filled && <path d={areaD} fill={`url(#sparkline-grad-${lineColor.replace('#', '')})`} />}
      <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" />
      {showDot && (
        <circle cx={lastPoint.x} cy={lastPoint.y} r="3" fill={lineColor} stroke="white" strokeWidth="1.5" />
      )}
    </svg>
  );
}

// ======================== GAUGE CHART ========================
// Feature #60: Gauge/Meter Chart

export function GaugeChart({ value = 0, max = 100, min = 0, title, size = 200, thresholds, className = '' }) {
  const percentage = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);
  const angle = (percentage / 100) * 180;
  const radius = size / 2 - 20;
  const cx = size / 2;
  const cy = size / 2;

  const defaultThresholds = thresholds || [
    { value: 30, color: '#EF4444', label: 'Low' },
    { value: 60, color: '#F59E0B', label: 'Medium' },
    { value: 100, color: '#10B981', label: 'High' },
  ];

  const getColor = () => {
    for (const t of defaultThresholds) {
      if (percentage <= t.value) return t.color;
    }
    return defaultThresholds[defaultThresholds.length - 1].color;
  };

  const getArcPath = (startAngle, endAngle) => {
    const startRad = ((180 + startAngle) * Math.PI) / 180;
    const endRad = ((180 + endAngle) * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const color = getColor();

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
        {/* Background arc */}
        <path
          d={getArcPath(0, 180)}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="12"
          strokeLinecap="round"
          className="dark:stroke-gray-700"
        />
        
        {/* Colored segments */}
        {defaultThresholds.map((t, i) => {
          const prevValue = i > 0 ? defaultThresholds[i - 1].value : 0;
          const segStart = (prevValue / 100) * 180;
          const segEnd = Math.min((t.value / 100) * 180, angle);
          if (segStart >= angle) return null;
          return (
            <path
              key={i}
              d={getArcPath(segStart, segEnd)}
              fill="none"
              stroke={t.color}
              strokeWidth="12"
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
              style={{ filter: `drop-shadow(0 0 4px ${hexToRgba(t.color, 0.3)})` }}
            />
          );
        })}
        
        {/* Needle */}
        <g transform={`rotate(${angle}, ${cx}, ${cy})`} className="transition-transform duration-1000 ease-out">
          <line
            x1={cx}
            y1={cy}
            x2={cx - radius + 15}
            y2={cy}
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r="6" fill={color} stroke="white" strokeWidth="2" />
        </g>
        
        {/* Value label */}
        <text
          x={cx}
          y={cy + 20}
          textAnchor="middle"
          className="text-2xl font-bold fill-gray-900 dark:fill-white"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </text>
      </svg>
      
      {title && (
        <span className="text-sm font-medium text-gray-500 -mt-2">{title}</span>
      )}
      
      {/* Scale labels */}
      <div className="flex justify-between w-full px-4 mt-1">
        <span className="text-xs text-gray-400">{min}</span>
        <span className="text-xs text-gray-400">{max}</span>
      </div>
    </div>
  );
}

// ======================== TREEMAP ========================
// Feature #61: Expense Treemap Visualization

export function TreemapChart({ data, title, height = 300, className = '', currency = false }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  const colors = CHART_COLORS.primary;
  
  // Simple squarified treemap layout
  const rects = useMemo(() => {
    if (!data.length) return [];
    
    const sorted = [...data].sort((a, b) => b.value - a.value);
    const result = [];
    let x = 0, y = 0;
    const w = 100, h = 100;
    
    sorted.forEach((item, i) => {
      const pct = item.value / total;
      const rectW = Math.max(pct * w * 2, 15);
      const rectH = 100 / (Math.ceil(sorted.length / 3)) ;
      
      const row = Math.floor(i / 3);
      const col = i % 3;
      
      result.push({
        ...item,
        x: (100 / 3) * col,
        y: (100 / Math.ceil(sorted.length / 3)) * row,
        width: 100 / 3,
        height: 100 / Math.ceil(sorted.length / 3),
        percentage: pct * 100,
        color: colors[i % colors.length],
      });
    });
    
    return result;
  }, [data, total]);

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <div className="absolute inset-0 grid gap-1" style={{
        gridTemplateColumns: `repeat(3, 1fr)`,
        gridTemplateRows: `repeat(${Math.ceil(data.length / 3)}, 1fr)`,
      }}>
        {rects.map((rect, i) => (
          <div
            key={i}
            className="relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:z-10"
            style={{
              backgroundColor: hexToRgba(rect.color, hoveredIndex === i ? 0.95 : 0.75),
              border: `2px solid ${rect.color}`,
            }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-white">
              <span className="text-xs font-medium truncate w-full text-center">{rect.label}</span>
              <span className="text-sm font-bold">
                {currency ? `₹${formatCompact(rect.value)}` : formatCompact(rect.value)}
              </span>
              <span className="text-[10px] opacity-75">{rect.percentage.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ======================== WATERFALL CHART ========================
// Feature #62: Cash Flow Waterfall Chart

export function WaterfallChart({ data, height = 300, currency = true, className = '' }) {
  const chartRef = useRef(null);

  const chartData = useMemo(() => {
    let cumulative = 0;
    const datasets = {
      increases: [],
      decreases: [],
      totals: [],
      hidden: [],
    };
    const labels = [];

    data.forEach((item, i) => {
      labels.push(item.label);
      const isTotal = item.isTotal;
      const value = item.value;
      
      if (isTotal) {
        datasets.hidden.push(0);
        datasets.increases.push(0);
        datasets.decreases.push(0);
        datasets.totals.push(cumulative);
      } else if (value >= 0) {
        datasets.hidden.push(cumulative);
        datasets.increases.push(value);
        datasets.decreases.push(0);
        datasets.totals.push(0);
        cumulative += value;
      } else {
        cumulative += value;
        datasets.hidden.push(cumulative);
        datasets.increases.push(0);
        datasets.decreases.push(Math.abs(value));
        datasets.totals.push(0);
      }
    });

    return {
      labels,
      datasets: [
        {
          label: 'Hidden',
          data: datasets.hidden,
          backgroundColor: 'transparent',
          borderWidth: 0,
          barThickness: 35,
        },
        {
          label: 'Increase',
          data: datasets.increases,
          backgroundColor: hexToRgba('#10B981', 0.8),
          borderColor: '#10B981',
          borderWidth: 1,
          borderRadius: 6,
          barThickness: 35,
        },
        {
          label: 'Decrease',
          data: datasets.decreases,
          backgroundColor: hexToRgba('#EF4444', 0.8),
          borderColor: '#EF4444',
          borderWidth: 1,
          borderRadius: 6,
          barThickness: 35,
        },
        {
          label: 'Total',
          data: datasets.totals,
          backgroundColor: hexToRgba('#667eea', 0.8),
          borderColor: '#667eea',
          borderWidth: 1,
          borderRadius: 6,
          barThickness: 35,
        },
      ],
    };
  }, [data]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1200, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        padding: 12,
        cornerRadius: 12,
        filter: (item) => item.dataset.label !== 'Hidden',
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            return currency ? `₹${value.toLocaleString('en-IN')}` : value.toLocaleString();
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { font: { family: "'Inter', sans-serif", size: 11 }, color: '#9CA3AF' },
      },
      y: {
        stacked: true,
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
        ticks: {
          font: { family: "'Inter', sans-serif", size: 11 },
          color: '#9CA3AF',
          callback: (value) => currency ? `₹${formatCompact(value)}` : formatCompact(value),
        },
      },
    },
  }), [currency]);

  return (
    <div className={className} style={{ height }}>
      <Bar ref={chartRef} data={chartData} options={options} />
    </div>
  );
}

// ======================== COMPARISON CHART ========================
// Feature #63: Side-by-side Comparison Chart

export function ComparisonChart({
  data, categories, labels = ['Current', 'Previous'],
  height = 300, currency = false, className = '',
}) {
  const chartData = useMemo(() => ({
    labels: categories,
    datasets: [
      {
        label: labels[0],
        data: data[0],
        backgroundColor: hexToRgba('#667eea', 0.8),
        borderColor: '#667eea',
        borderWidth: 1.5,
        borderRadius: 6,
        maxBarThickness: 30,
      },
      {
        label: labels[1],
        data: data[1],
        backgroundColor: hexToRgba('#a78bfa', 0.5),
        borderColor: '#a78bfa',
        borderWidth: 1.5,
        borderRadius: 6,
        maxBarThickness: 30,
        borderDash: [5, 5],
      },
    ],
  }), [data, categories, labels]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1200, easing: 'easeOutQuart', delay: (ctx) => ctx.dataIndex * 100 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { usePointStyle: true, padding: 20, font: { family: "'Inter', sans-serif", size: 12 } },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        padding: 12,
        cornerRadius: 12,
        callbacks: {
          label: (context) => {
            const val = context.parsed.y;
            return `${context.dataset.label}: ${currency ? `₹${val.toLocaleString('en-IN')}` : val.toLocaleString()}`;
          },
          afterBody: (items) => {
            if (items.length >= 2) {
              const curr = items[0].parsed.y;
              const prev = items[1].parsed.y;
              const change = ((curr - prev) / prev * 100).toFixed(1);
              return [`Change: ${change > 0 ? '+' : ''}${change}%`];
            }
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: "'Inter', sans-serif", size: 11 }, color: '#9CA3AF' },
      },
      y: {
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
        beginAtZero: true,
        ticks: {
          font: { family: "'Inter', sans-serif", size: 11 },
          color: '#9CA3AF',
          callback: (v) => currency ? `₹${formatCompact(v)}` : formatCompact(v),
        },
      },
    },
  }), [currency]);

  return (
    <div className={className} style={{ height }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}

// ======================== HEATMAP ========================
// Feature #64: Spending Heatmap

export function HeatmapChart({ data, xLabels, yLabels, height = 250, colorScale, title, className = '' }) {
  const [tooltip, setTooltip] = useState(null);

  const maxVal = Math.max(...data.flat());
  const minVal = Math.min(...data.flat());

  const defaultColors = ['#e8f5e9', '#c8e6c9', '#a5d6a7', '#81c784', '#66bb6a', '#4caf50', '#43a047', '#388e3c', '#2e7d32', '#1b5e20'];

  const getColor = (value) => {
    const normalized = (value - minVal) / (maxVal - minVal || 1);
    const index = Math.min(Math.floor(normalized * (defaultColors.length - 1)), defaultColors.length - 1);
    return (colorScale || defaultColors)[index];
  };

  return (
    <div className={`relative ${className}`}>
      <div className="overflow-auto" style={{ maxHeight: height }}>
        <div className="inline-grid gap-1" style={{
          gridTemplateColumns: `80px repeat(${xLabels.length}, 1fr)`,
          minWidth: xLabels.length * 40 + 80,
        }}>
          {/* Corner */}
          <div />
          {/* X labels */}
          {xLabels.map((label, i) => (
            <div key={i} className="text-[10px] text-center text-gray-500 font-medium py-1 truncate">
              {label}
            </div>
          ))}
          
          {/* Rows */}
          {yLabels.map((yLabel, y) => (
            <React.Fragment key={y}>
              <div className="text-xs text-gray-500 font-medium flex items-center pr-2 truncate">
                {yLabel}
              </div>
              {xLabels.map((_, x) => {
                const value = data[y]?.[x] ?? 0;
                return (
                  <div
                    key={x}
                    className="rounded-sm transition-all duration-200 hover:scale-110 cursor-pointer min-h-[24px]"
                    style={{ backgroundColor: getColor(value) }}
                    onMouseEnter={() => setTooltip({ x, y, value, label: `${yLabels[y]} / ${xLabels[x]}` })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Tooltip */}
      {tooltip && (
        <div className="absolute top-2 right-2 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs shadow-lg z-10">
          <div className="font-medium">{tooltip.label}</div>
          <div>Value: {tooltip.value.toLocaleString()}</div>
        </div>
      )}
      
      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="text-xs text-gray-400">Low</span>
        <div className="flex gap-0.5">
          {defaultColors.map((c, i) => (
            <div key={i} className="w-4 h-3 rounded-sm" style={{ backgroundColor: c }} />
          ))}
        </div>
        <span className="text-xs text-gray-400">High</span>
      </div>
    </div>
  );
}

// ======================== MULTI-CHART DASHBOARD WIDGET ========================
// Feature #65: Chart Widget with Tab Switching

export function ChartWidget({
  title, subtitle, data, tabs = [], height = 300,
  headerAction, footer, loading = false, className = '',
}) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.key || 'chart');

  return (
    <AnimatedCard className={`${className} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {tabs.length > 1 && (
            <AnimatedTabs
              tabs={tabs}
              activeTab={activeTab}
              onChange={setActiveTab}
              variant="pills"
            />
          )}
          {headerAction}
        </div>
      </div>
      
      {/* Chart Content */}
      <div style={{ height }}>
        {loading ? (
          <SkeletonLoader variant="chart" />
        ) : (
          tabs.find(t => t.key === activeTab)?.content || data
        )}
      </div>
      
      {/* Footer */}
      {footer && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          {footer}
        </div>
      )}
    </AnimatedCard>
  );
}

// ======================== MINI STAT CHART ========================
// Feature #66: Inline Stat with Sparkline

export function MiniStatChart({ label, value, data = [], trend, format = 'number', color = '#667eea' }) {
  const formattedValue = format === 'currency' 
    ? `₹${Number(value).toLocaleString('en-IN')}` 
    : format === 'percentage' 
      ? `${value}%` 
      : Number(value).toLocaleString();

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500 mb-0.5 truncate">{label}</div>
        <div className="text-lg font-bold text-gray-900 dark:text-white">{formattedValue}</div>
        {trend !== undefined && (
          <div className={`text-xs font-medium ${trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {trend >= 0 ? '↗' : '↘'} {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      {data.length > 0 && (
        <Sparkline data={data} color={color} height={36} width={80} />
      )}
    </div>
  );
}

// ======================== SCATTER PLOT ========================
// Feature #67: Interactive Scatter Plot

export function ScatterPlot({
  datasets, title, height = 300, className = '',
  xLabel = 'X', yLabel = 'Y', loading = false,
}) {
  if (loading) return <SkeletonLoader variant="chart" className={className} />;

  const chartColors = CHART_COLORS.primary;

  const chartData = useMemo(() => ({
    datasets: datasets.map((ds, i) => ({
      label: ds.label || `Dataset ${i + 1}`,
      data: ds.data,
      backgroundColor: hexToRgba(chartColors[i % chartColors.length], 0.6),
      borderColor: chartColors[i % chartColors.length],
      borderWidth: 1.5,
      pointRadius: ds.pointRadius || 6,
      pointHoverRadius: (ds.pointRadius || 6) + 2,
    })),
  }), [datasets]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1200, easing: 'easeOutQuart' },
    plugins: {
      legend: {
        display: datasets.length > 1,
        position: 'top',
        labels: { usePointStyle: true, padding: 20 },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        padding: 12,
        cornerRadius: 12,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: (${ctx.parsed.x}, ${ctx.parsed.y})`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: xLabel, color: '#9CA3AF' },
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
        ticks: { color: '#9CA3AF' },
      },
      y: {
        title: { display: true, text: yLabel, color: '#9CA3AF' },
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
        ticks: { color: '#9CA3AF' },
      },
    },
  }), [xLabel, yLabel, datasets.length]);

  return (
    <div className={className} style={{ height }}>
      <Scatter data={chartData} options={options} />
    </div>
  );
}

// ======================== HELPER ========================
function formatCompact(num) {
  if (num >= 10000000) return `${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  if (num < 1 && num > 0) return num.toFixed(2);
  return Math.round(num).toLocaleString();
}

// ======================== EXPORTS ========================
export default {
  EnhancedLineChart, EnhancedBarChart, EnhancedDoughnutChart,
  FinancialRadarChart, Sparkline, GaugeChart, TreemapChart,
  WaterfallChart, ComparisonChart, HeatmapChart, ChartWidget,
  MiniStatChart, ScatterPlot,
};
