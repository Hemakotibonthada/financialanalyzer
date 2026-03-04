// ============================================================================
// Spending Trends Chart — Interactive Time Series Visualization
// ============================================================================
// Enterprise-grade area chart with income vs expenses overlay,
// moving averages, annotations, and AI trend analysis.
// ============================================================================

import React, { useState, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Line, ComposedChart, Bar
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Calendar, BarChart3 } from 'lucide-react';

function CustomTooltip({ active, payload, label, dk }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={`px-4 py-3 rounded-xl shadow-xl border ${
      dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
    }`}>
      <p className={`text-xs font-medium mb-2 ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className={dk ? 'text-slate-300' : 'text-gray-600'}>{p.name}:</span>
          <span className={`font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>
            ₹{(p.value || 0).toLocaleString('en-IN')}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function SpendingTrendsChart({
  data = [],
  height = 320,
  showIncome = true,
  showAverage = true,
  title = 'Income vs Expenses Trend',
  period = '6 months'
}) {
  const { mode } = useTheme();
  const dk = mode === 'dark' || mode === 'black';
  const [chartType, setChartType] = useState('area'); // area | bar

  const gridColor = dk ? '#334155' : '#e5e7eb';
  const tickColor = dk ? '#94a3b8' : '#6b7280';

  // Compute average line
  const avgExpense = useMemo(() => {
    if (data.length === 0) return 0;
    return data.reduce((s, d) => s + (d.expense || 0), 0) / data.length;
  }, [data]);

  // Trend direction
  const trend = useMemo(() => {
    if (data.length < 2) return 'stable';
    const first = data.slice(0, Math.ceil(data.length / 2));
    const second = data.slice(Math.ceil(data.length / 2));
    const avgFirst = first.reduce((s, d) => s + (d.expense || 0), 0) / first.length;
    const avgSecond = second.reduce((s, d) => s + (d.expense || 0), 0) / second.length;
    const change = avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst * 100) : 0;
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }, [data]);

  const TrendIcon = trend === 'increasing' ? TrendingUp : trend === 'decreasing' ? TrendingDown : Minus;
  const trendColor = trend === 'decreasing' ? 'text-emerald-500' : trend === 'increasing' ? 'text-red-500' : 'text-gray-400';

  if (!data || data.length === 0) {
    return (
      <div className={`rounded-2xl p-6 border ${dk ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-gray-200'}`}>
        <div className={`text-center py-12 ${dk ? 'text-slate-500' : 'text-gray-400'}`}>
          <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No trend data available yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl p-6 border ${dk ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-gray-200'} shadow-sm`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Calendar className={`w-3.5 h-3.5 ${dk ? 'text-slate-500' : 'text-gray-400'}`} />
            <span className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{period}</span>
            <span className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
              <TrendIcon className="w-3.5 h-3.5" />
              {trend === 'increasing' ? 'Expenses Rising' : trend === 'decreasing' ? 'Expenses Falling' : 'Stable'}
            </span>
          </div>
        </div>
        <div className={`flex gap-1 p-1 rounded-lg ${dk ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
          <button onClick={() => setChartType('area')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              chartType === 'area' ? 'bg-indigo-600 text-white' : dk ? 'text-slate-400' : 'text-gray-500'
            }`}>Area</button>
          <button onClick={() => setChartType('bar')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              chartType === 'bar' ? 'bg-indigo-600 text-white' : dk ? 'text-slate-400' : 'text-gray-500'
            }`}>Bar</button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3">
        {showIncome && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1.5 rounded-full bg-emerald-500" />
            <span className={`text-[11px] ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Income</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded-full bg-indigo-500" />
          <span className={`text-[11px] ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Expenses</span>
        </div>
        {showAverage && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-amber-500 border-dashed" style={{ borderTop: '2px dashed #f59e0b', height: 0 }} />
            <span className={`text-[11px] ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Avg Expense</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        {chartType === 'area' ? (
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={v => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
            <Tooltip content={<CustomTooltip dk={dk} />} />
            {showIncome && (
              <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" fill="url(#incomeGrad)"
                strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5, strokeWidth: 2 }} />
            )}
            <Area type="monotone" dataKey="expense" name="Expenses" stroke="#6366f1" fill="url(#expenseGrad)"
              strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5, strokeWidth: 2 }} />
            {showAverage && <ReferenceLine y={avgExpense} stroke="#f59e0b" strokeDasharray="5 5" strokeWidth={1.5} />}
          </AreaChart>
        ) : (
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={v => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
            <Tooltip content={<CustomTooltip dk={dk} />} />
            {showIncome && <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.8} />}
            <Bar dataKey="expense" name="Expenses" fill="#6366f1" radius={[4, 4, 0, 0]} />
            {showAverage && <ReferenceLine y={avgExpense} stroke="#f59e0b" strokeDasharray="5 5" strokeWidth={1.5} />}
          </ComposedChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
