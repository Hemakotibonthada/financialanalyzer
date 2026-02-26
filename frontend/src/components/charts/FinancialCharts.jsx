import React from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

/* ------------------------------------------------------------------ */
/*  Shared palette & helpers                                           */
/* ------------------------------------------------------------------ */
const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
  '#14b8a6', '#a855f7', '#e11d48', '#0ea5e9',
];

const fmt = (v) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v?.toLocaleString?.() ?? v;
};

const currencyFmt = (v) => `₹${fmt(v)}`;

/* ---- shared tooltip container ---- */
function ChartTooltip({ active, payload, label, prefix = '₹' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl px-4 py-3 text-xs">
      {label && (
        <p className="text-slate-500 dark:text-slate-400 mb-1.5 font-medium">{label}</p>
      )}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-600 dark:text-slate-300">{entry.name}:</span>
          <span className="font-semibold text-slate-900 dark:text-white ml-auto">
            {prefix}{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl px-4 py-3 text-xs">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.payload?.fill }} />
        <span className="text-slate-600 dark:text-slate-300">{entry.name}</span>
        <span className="font-semibold text-slate-900 dark:text-white ml-auto">
          ₹{entry.value?.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

/* axis props shared across charts */
const axisProps = {
  tick: { fontSize: 11 },
  tickLine: false,
  axisLine: false,
  stroke: '#94a3b8',
};

/* ================================================================== */
/*  1. SpendingTrendChart                                              */
/* ================================================================== */
export function SpendingTrendChart({ data = [], height = 300, className = '' }) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-20" />
          <XAxis dataKey="name" {...axisProps} />
          <YAxis tickFormatter={currencyFmt} {...axisProps} />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="amount"
            name="Spending"
            stroke="#6366f1"
            strokeWidth={2.5}
            fill="url(#spendGrad)"
            animationDuration={1200}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ================================================================== */
/*  2. CategoryDonutChart                                              */
/* ================================================================== */
export function CategoryDonutChart({ data = [], height = 300, className = '' }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={3}
            cornerRadius={4}
            animationDuration={1000}
            animationBegin={200}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={data[i]?.color || COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<PieTooltip />} />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            formatter={(val) => (
              <span className="text-xs text-slate-600 dark:text-slate-300">{val}</span>
            )}
          />
          {/* centre label */}
          <text
            x="50%"
            y="46%"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-slate-900 dark:fill-white text-lg font-bold"
          >
            ₹{fmt(total)}
          </text>
          <text
            x="50%"
            y="55%"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-slate-500 dark:fill-slate-400 text-[10px]"
          >
            Total
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ================================================================== */
/*  3. IncomeExpenseBarChart                                           */
/* ================================================================== */
export function IncomeExpenseBarChart({ data = [], height = 300, className = '' }) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} barGap={4} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-20" />
          <XAxis dataKey="name" {...axisProps} />
          <YAxis tickFormatter={currencyFmt} {...axisProps} />
          <Tooltip content={<ChartTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(val) => (
              <span className="text-xs text-slate-600 dark:text-slate-300">{val}</span>
            )}
          />
          <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} animationDuration={900} />
          <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[6, 6, 0, 0]} animationDuration={900} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ================================================================== */
/*  4. BudgetComparisonChart (horizontal bar)                          */
/* ================================================================== */
export function BudgetComparisonChart({ data = [], height = 300, className = '' }) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" barGap={2} margin={{ top: 10, right: 20, left: 60, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" className="dark:opacity-20" />
          <XAxis type="number" tickFormatter={currencyFmt} {...axisProps} />
          <YAxis type="category" dataKey="category" {...axisProps} width={80} />
          <Tooltip content={<ChartTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(val) => (
              <span className="text-xs text-slate-600 dark:text-slate-300">{val}</span>
            )}
          />
          <Bar dataKey="budget" name="Budget" fill="#6366f1" radius={[0, 4, 4, 0]} animationDuration={900} />
          <Bar dataKey="spent" name="Spent" fill="#f59e0b" radius={[0, 4, 4, 0]} animationDuration={900} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ================================================================== */
/*  5. CashFlowChart (composed: area + line)                           */
/* ================================================================== */
export function CashFlowChart({ data = [], height = 300, className = '' }) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="cashInGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="cashOutGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-20" />
          <XAxis dataKey="name" {...axisProps} />
          <YAxis tickFormatter={currencyFmt} {...axisProps} />
          <Tooltip content={<ChartTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(val) => (
              <span className="text-xs text-slate-600 dark:text-slate-300">{val}</span>
            )}
          />
          <Area type="monotone" dataKey="inflow" name="Inflow" stroke="#10b981" fill="url(#cashInGrad)" strokeWidth={2} animationDuration={1000} />
          <Area type="monotone" dataKey="outflow" name="Outflow" stroke="#f43f5e" fill="url(#cashOutGrad)" strokeWidth={2} animationDuration={1000} />
          <Line type="monotone" dataKey="net" name="Net" stroke="#6366f1" strokeWidth={2.5} dot={false} animationDuration={1200} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ================================================================== */
/*  6. GoalProgressChart (radial bar)                                  */
/* ================================================================== */
export function GoalProgressChart({ data = [], height = 300, className = '' }) {
  const chartData = data.map((d, i) => ({
    ...d,
    fill: d.color || COLORS[i % COLORS.length],
  }));

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="20%"
          outerRadius="90%"
          barSize={14}
          data={chartData}
          startAngle={180}
          endAngle={-180}
        >
          <RadialBar
            background={{ fill: '#f1f5f9', className: 'dark:fill-slate-700' }}
            dataKey="value"
            cornerRadius={8}
            animationDuration={1000}
          />
          <Legend
            iconSize={8}
            iconType="circle"
            verticalAlign="bottom"
            formatter={(val, entry) => (
              <span className="text-xs text-slate-600 dark:text-slate-300">{val}</span>
            )}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl px-4 py-3 text-xs">
                  <p className="font-semibold text-slate-900 dark:text-white">{d.name}</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">{d.value}% complete</p>
                </div>
              );
            }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ================================================================== */
/*  7. NetWorthHistoryChart (stacked area)                             */
/* ================================================================== */
export function NetWorthHistoryChart({ data = [], height = 300, className = '' }) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="assetsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="liabGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-20" />
          <XAxis dataKey="name" {...axisProps} />
          <YAxis tickFormatter={currencyFmt} {...axisProps} />
          <Tooltip content={<ChartTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(val) => (
              <span className="text-xs text-slate-600 dark:text-slate-300">{val}</span>
            )}
          />
          <Area
            type="monotone"
            dataKey="assets"
            name="Assets"
            stackId="1"
            stroke="#10b981"
            fill="url(#assetsGrad)"
            strokeWidth={2}
            animationDuration={1000}
          />
          <Area
            type="monotone"
            dataKey="liabilities"
            name="Liabilities"
            stackId="2"
            stroke="#f43f5e"
            fill="url(#liabGrad)"
            strokeWidth={2}
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ================================================================== */
/*  8. MonthlyComparisonChart (multi-line)                             */
/* ================================================================== */
export function MonthlyComparisonChart({ data = [], lines = [], height = 300, className = '' }) {
  const defaultLines = [
    { key: 'currentYear', name: 'This Year', color: '#6366f1' },
    { key: 'lastYear', name: 'Last Year', color: '#94a3b8' },
  ];
  const lineConfig = lines.length ? lines : defaultLines;

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-20" />
          <XAxis dataKey="name" {...axisProps} />
          <YAxis tickFormatter={currencyFmt} {...axisProps} />
          <Tooltip content={<ChartTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(val) => (
              <span className="text-xs text-slate-600 dark:text-slate-300">{val}</span>
            )}
          />
          {lineConfig.map((l) => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              name={l.name}
              stroke={l.color}
              strokeWidth={2.5}
              dot={{ r: 3, strokeWidth: 2 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
              animationDuration={1200}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ================================================================== */
/*  9. SavingsRateChart (area with reference line)                      */
/* ================================================================== */
export function SavingsRateChart({ data = [], target = 30, height = 300, className = '' }) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-20" />
          <XAxis dataKey="name" {...axisProps} />
          <YAxis tickFormatter={(v) => `${v}%`} {...axisProps} domain={[0, 100]} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl px-4 py-3 text-xs">
                  <p className="text-slate-500 dark:text-slate-400 mb-1 font-medium">{label}</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Savings Rate: {payload[0].value?.toFixed(1)}%
                  </p>
                  <p className="text-slate-400 dark:text-slate-500 mt-0.5">Target: {target}%</p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="rate"
            name="Savings Rate"
            stroke="#10b981"
            fill="url(#savingsGrad)"
            strokeWidth={2.5}
            animationDuration={1200}
          />
          {/* Reference line for target */}
          <Line
            type="monotone"
            dataKey={() => target}
            name="Target"
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            dot={false}
            activeDot={false}
            legendType="none"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ================================================================== */
/*  10. ExpenseHeatmapChart (simple grid visualization)                 */
/* ================================================================== */
export function ExpenseHeatmapChart({ data = [], height = 200, className = '' }) {
  /* data shape: [{ day: 'Mon', week: 1, amount: 500 }, …] */
  const max = Math.max(...data.map((d) => d.amount || 0), 1);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeks = [...new Set(data.map((d) => d.week))].sort((a, b) => a - b);

  const getColor = (amount) => {
    const ratio = amount / max;
    if (ratio < 0.2) return 'bg-emerald-100 dark:bg-emerald-900/30';
    if (ratio < 0.4) return 'bg-emerald-200 dark:bg-emerald-800/40';
    if (ratio < 0.6) return 'bg-amber-200 dark:bg-amber-700/40';
    if (ratio < 0.8) return 'bg-orange-300 dark:bg-orange-700/50';
    return 'bg-rose-400 dark:bg-rose-600/60';
  };

  return (
    <div className={`${className}`} style={{ minHeight: height }}>
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-1 pr-2">
          {days.map((d) => (
            <div
              key={d}
              className="h-6 flex items-center text-[10px] text-slate-500 dark:text-slate-400 font-medium"
            >
              {d}
            </div>
          ))}
        </div>
        {/* Grid */}
        {weeks.map((week) => (
          <div key={week} className="flex flex-col gap-1">
            {days.map((day) => {
              const cell = data.find((d) => d.day === day && d.week === week);
              const amount = cell?.amount || 0;
              return (
                <div
                  key={`${week}-${day}`}
                  title={`${day} W${week}: ₹${amount.toLocaleString()}`}
                  className={`w-6 h-6 rounded-sm transition-colors cursor-default ${getColor(amount)}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3 text-[10px] text-slate-500 dark:text-slate-400">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-emerald-100 dark:bg-emerald-900/30" />
        <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-800/40" />
        <div className="w-3 h-3 rounded-sm bg-amber-200 dark:bg-amber-700/40" />
        <div className="w-3 h-3 rounded-sm bg-orange-300 dark:bg-orange-700/50" />
        <div className="w-3 h-3 rounded-sm bg-rose-400 dark:bg-rose-600/60" />
        <span>More</span>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  ChartCard – convenience wrapper for charts inside cards            */
/* ================================================================== */
export function ChartCard({
  title,
  subtitle,
  children,
  actions,
  loading = false,
  className = '',
}) {
  if (loading) {
    return (
      <div
        className={`bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-pulse ${className}`}
      >
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
        <div className="h-[200px] bg-slate-100 dark:bg-slate-700/40 rounded-xl" />
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 ${className}`}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

/* ================================================================== */
/*  ChartLegendItem – standalone legend pill for custom layouts         */
/* ================================================================== */
export function ChartLegendItem({ color, label, value, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-slate-600 dark:text-slate-300">{label}</span>
      {value !== undefined && (
        <span className="text-xs font-semibold text-slate-900 dark:text-white ml-auto">
          {typeof value === 'number' ? `₹${value.toLocaleString()}` : value}
        </span>
      )}
    </div>
  );
}

/* ================================================================== */
/*  ChartEmptyState – placeholder when no chart data is available      */
/* ================================================================== */
export function ChartEmptyState({ height = 200, message = 'No data available', className = '' }) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ height }}
    >
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-slate-400 dark:text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 16l4-8 4 4 5-9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{message}</p>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Barrel export                                                      */
/* ================================================================== */
const FinancialCharts = {
  SpendingTrendChart,
  CategoryDonutChart,
  IncomeExpenseBarChart,
  BudgetComparisonChart,
  CashFlowChart,
  GoalProgressChart,
  NetWorthHistoryChart,
  MonthlyComparisonChart,
  SavingsRateChart,
  ExpenseHeatmapChart,
  ChartCard,
  ChartLegendItem,
  ChartEmptyState,
};

export default FinancialCharts;
