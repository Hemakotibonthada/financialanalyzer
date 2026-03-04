// ============================================================================
// ENTERPRISE CASHFLOW FORECASTER — AI-Powered Cash Flow Projection
// ============================================================================
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import MainLayout from '../../components/MainLayout';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import {
  PageTransition, AnimatedCard, AnimatedNumber, AnimatedTabs, GlassCard,
  Badge, Shimmer, EmptyState,
} from '../../components/enterprise/EnterpriseAnimationSystem';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Calendar, AlertTriangle, Target, Zap,
  ArrowUp, ArrowDown, DollarSign, BarChart3, Clock, Lightbulb,
  CheckCircle, XCircle, RefreshCw, Settings,
} from 'lucide-react';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: ₹{typeof entry.value === 'number' ? entry.value.toLocaleString('en-IN') : entry.value}
        </p>
      ))}
    </div>
  );
}

// ── Simple Exponential Smoothing Forecaster ──
function forecastTimeSeries(data, periods = 6) {
  if (!data.length) return Array(periods).fill(0);
  const alpha = 0.3; // smoothing factor
  let forecast = data[0];
  data.forEach(val => { forecast = alpha * val + (1 - alpha) * forecast; });
  const trend = data.length >= 2 ? (data[data.length - 1] - data[data.length - 2]) * 0.5 : 0;
  return Array.from({ length: periods }, (_, i) => Math.max(0, Math.round(forecast + trend * (i + 1))));
}

// ── Scenario Card ──
function ScenarioCard({ title, icon: Icon, color, values, description, isActive, onClick }) {
  return (
    <button onClick={onClick}
      className={`p-4 rounded-xl border-2 text-left transition-all w-full ${
        isActive ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-900/20` : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}>
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color === 'green' ? '#10B981' : color === 'yellow' ? '#F59E0B' : '#EF4444'}15` }}>
          <Icon size={16} style={{ color: color === 'green' ? '#10B981' : color === 'yellow' ? '#F59E0B' : '#EF4444' }} />
        </div>
        <h4 className="text-sm font-semibold text-gray-800 dark:text-white">{title}</h4>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      {values && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            ₹<AnimatedNumber value={values.netCashflow} />
            <span className="text-xs font-normal text-gray-500 ml-1">projected net</span>
          </p>
        </div>
      )}
    </button>
  );
}

// ============================================================================
// MAIN
// ============================================================================
export default function EnterpriseCashflowForecaster() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [forecastMonths, setForecastMonths] = useState(6);
  const [activeScenario, setActiveScenario] = useState('base');
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [txRes] = await Promise.allSettled([
          api.get('/financial/transactions'),
        ]);
        setTransactions(txRes.status === 'fulfilled' ? (txRes.value?.data?.transactions || txRes.value?.data || []) : []);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Process historical data by month
  const monthlyData = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map[key]) map[key] = { income: 0, expenses: 0, count: 0 };
      if ((t.amount || 0) > 0) map[key].income += Math.abs(t.amount);
      else map[key].expenses += Math.abs(t.amount);
      map[key].count++;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        label: MONTH_NAMES[parseInt(month.split('-')[1]) - 1] + ' ' + month.split('-')[0].slice(2),
        ...data,
        net: data.income - data.expenses,
        savingsRate: data.income > 0 ? ((data.income - data.expenses) / data.income * 100) : 0,
      }));
  }, [transactions]);

  // Generate forecasts
  const forecast = useMemo(() => {
    const incomeHistory = monthlyData.map(d => d.income);
    const expenseHistory = monthlyData.map(d => d.expenses);

    const baseIncome = forecastTimeSeries(incomeHistory, forecastMonths);
    const baseExpenses = forecastTimeSeries(expenseHistory, forecastMonths);

    const now = new Date();
    const scenarios = {
      base: { label: 'Base Case', factor: 1.0 },
      optimistic: { label: 'Optimistic', factor: 1.15 },
      pessimistic: { label: 'Pessimistic', factor: 0.85 },
    };

    const forecastData = {};
    Object.entries(scenarios).forEach(([key, scenario]) => {
      forecastData[key] = Array.from({ length: forecastMonths }, (_, i) => {
        const futureDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
        const income = Math.round(baseIncome[i] * (key === 'pessimistic' ? 0.9 : key === 'optimistic' ? 1.1 : 1));
        const expenses = Math.round(baseExpenses[i] * (key === 'pessimistic' ? 1.1 : key === 'optimistic' ? 0.9 : 1));
        return {
          month: `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`,
          label: MONTH_NAMES[futureDate.getMonth()] + ' ' + String(futureDate.getFullYear()).slice(2),
          income, expenses,
          net: income - expenses,
          cumulative: 0,
          isForecast: true,
        };
      });
      // Calculate cumulative
      let cum = 0;
      forecastData[key].forEach(d => { cum += d.net; d.cumulative = cum; });
    });

    return forecastData;
  }, [monthlyData, forecastMonths]);

  // Combined chart data (historical + forecast)
  const chartData = useMemo(() => {
    const historical = monthlyData.slice(-6).map(d => ({
      ...d, isForecast: false,
    }));
    const active = forecast[activeScenario] || [];
    return [...historical, ...active];
  }, [monthlyData, forecast, activeScenario]);

  // KPIs
  const kpis = useMemo(() => {
    const active = forecast[activeScenario] || [];
    const totalProjectedIncome = active.reduce((s, d) => s + d.income, 0);
    const totalProjectedExpenses = active.reduce((s, d) => s + d.expenses, 0);
    const avgMonthly = monthlyData.length > 0 ? monthlyData.reduce((s, d) => s + d.net, 0) / monthlyData.length : 0;
    const negativeMonths = active.filter(d => d.net < 0).length;

    return {
      projectedIncome: totalProjectedIncome,
      projectedExpenses: totalProjectedExpenses,
      projectedNet: totalProjectedIncome - totalProjectedExpenses,
      avgHistorical: Math.round(avgMonthly),
      negativeMonths,
      confidence: monthlyData.length >= 6 ? 'High' : monthlyData.length >= 3 ? 'Medium' : 'Low',
    };
  }, [forecast, activeScenario, monthlyData]);

  // AI Insights
  const insights = useMemo(() => {
    const list = [];
    if (kpis.projectedNet > 0) {
      list.push({ type: 'positive', text: `Projected positive cash flow of ₹${kpis.projectedNet.toLocaleString('en-IN')} over ${forecastMonths} months.` });
    } else {
      list.push({ type: 'negative', text: `⚠️ Projected negative cash flow of ₹${Math.abs(kpis.projectedNet).toLocaleString('en-IN')}. Consider reducing expenses.` });
    }

    const trend = monthlyData.slice(-3);
    if (trend.length >= 3) {
      const savingsImproving = trend.every((d, i) => i === 0 || d.savingsRate >= trend[i - 1].savingsRate);
      if (savingsImproving) list.push({ type: 'positive', text: 'Your savings rate has been improving — keep it up!' });
    }

    if (kpis.negativeMonths > 0) {
      list.push({ type: 'warning', text: `${kpis.negativeMonths} months in the forecast show negative cash flow. Plan for these periods.` });
    }

    const avgExpense = monthlyData.length > 0 ? monthlyData.reduce((s, d) => s + d.expenses, 0) / monthlyData.length : 0;
    if (avgExpense > 0) {
      const emergencyMonths = (kpis.projectedNet / avgExpense).toFixed(1);
      list.push({ type: 'info', text: `Projected savings could cover ~${emergencyMonths} months of average expenses as emergency fund.` });
    }

    list.push({ type: 'tip', text: 'Automate savings via SIP on salary day to ensure consistent investing before spending.' });

    return list;
  }, [kpis, monthlyData, forecastMonths]);

  const tabs = ['Forecast', 'Scenarios', 'Analysis'];

  if (loading) {
    return (
      <MainLayout title="Cash Flow Forecaster" subtitle="Loading...">
        <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <Shimmer key={i} className="h-24 rounded-xl" />)}
          <Shimmer className="md:col-span-4 h-80 rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Cash Flow Forecaster" subtitle="AI-Powered Financial Projections">
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cash Flow Forecaster</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {forecastMonths}-month projection
                <Badge variant={kpis.confidence === 'High' ? 'success' : kpis.confidence === 'Medium' ? 'warning' : 'error'} className="ml-2">
                  {kpis.confidence} Confidence
                </Badge>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select value={forecastMonths} onChange={e => setForecastMonths(Number(e.target.value))}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-2 text-sm">
                <option value={3}>3 months</option>
                <option value={6}>6 months</option>
                <option value={12}>12 months</option>
              </select>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Projected Income', value: kpis.projectedIncome, color: 'text-green-600', icon: ArrowUp },
              { label: 'Projected Expenses', value: kpis.projectedExpenses, color: 'text-red-500', icon: ArrowDown },
              { label: 'Net Cash Flow', value: kpis.projectedNet, color: kpis.projectedNet >= 0 ? 'text-green-600' : 'text-red-500', icon: DollarSign },
              { label: 'Avg Monthly', value: kpis.avgHistorical, color: 'text-blue-600', icon: BarChart3 },
            ].map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <AnimatedCard key={i} className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={14} className={kpi.color} />
                    <p className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</p>
                  </div>
                  <p className={`text-xl font-bold ${kpi.color}`}>
                    ₹<AnimatedNumber value={kpi.value} />
                  </p>
                </AnimatedCard>
              );
            })}
          </div>

          <AnimatedTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

          {/* Forecast Tab */}
          {activeTab === 0 && (
            <div className="space-y-6">
              {/* Main forecast chart */}
              <AnimatedCard className="p-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">
                  INCOME vs EXPENSES — Historical + Forecast
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={chartData}>
                    <defs>
                      <linearGradient id="forecastArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <ReferenceLine x={chartData.findIndex(d => d.isForecast) > 0 ? chartData[chartData.findIndex(d => d.isForecast)].label : ''} stroke="#9CA3AF" strokeDasharray="5 5" label="Forecast →" />
                    <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="Income" opacity={0.8} />
                    <Bar dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} name="Expenses" opacity={0.8} />
                    <Line dataKey="net" stroke="#3B82F6" strokeWidth={2} dot={false} name="Net Cash Flow" />
                  </ComposedChart>
                </ResponsiveContainer>
              </AnimatedCard>

              {/* Cumulative projection */}
              <AnimatedCard className="p-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">CUMULATIVE CASH FLOW PROJECTION</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={forecast[activeScenario] || []}>
                    <defs>
                      <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="3 3" />
                    <Area type="monotone" dataKey="cumulative" stroke="#3B82F6" fill="url(#cumGrad)" strokeWidth={2} name="Cumulative" />
                  </AreaChart>
                </ResponsiveContainer>
              </AnimatedCard>
            </div>
          )}

          {/* Scenarios Tab */}
          {activeTab === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ScenarioCard title="Optimistic" icon={TrendingUp} color="green"
                  description="10% higher income, 10% lower expenses"
                  values={{ netCashflow: (forecast.optimistic || []).reduce((s, d) => s + d.net, 0) }}
                  isActive={activeScenario === 'optimistic'}
                  onClick={() => setActiveScenario('optimistic')} />
                <ScenarioCard title="Base Case" icon={Target} color="yellow"
                  description="Current trends continue as-is"
                  values={{ netCashflow: (forecast.base || []).reduce((s, d) => s + d.net, 0) }}
                  isActive={activeScenario === 'base'}
                  onClick={() => setActiveScenario('base')} />
                <ScenarioCard title="Pessimistic" icon={AlertTriangle} color="red"
                  description="10% lower income, 10% higher expenses"
                  values={{ netCashflow: (forecast.pessimistic || []).reduce((s, d) => s + d.net, 0) }}
                  isActive={activeScenario === 'pessimistic'}
                  onClick={() => setActiveScenario('pessimistic')} />
              </div>

              {/* Comparison chart */}
              <AnimatedCard className="p-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">SCENARIO COMPARISON</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={(forecast.base || []).map((d, i) => ({
                    label: d.label,
                    base: d.net,
                    optimistic: forecast.optimistic?.[i]?.net || 0,
                    pessimistic: forecast.pessimistic?.[i]?.net || 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="optimistic" stroke="#10B981" strokeWidth={2} name="Optimistic" dot={false} />
                    <Line type="monotone" dataKey="base" stroke="#F59E0B" strokeWidth={2} name="Base" dot={false} />
                    <Line type="monotone" dataKey="pessimistic" stroke="#EF4444" strokeWidth={2} name="Pessimistic" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </AnimatedCard>

              {/* Monthly breakdown table */}
              <AnimatedCard className="p-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">MONTHLY BREAKDOWN — {activeScenario.toUpperCase()}</h3>
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 text-gray-500 dark:text-gray-400 font-medium">Month</th>
                        <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">Income</th>
                        <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">Expenses</th>
                        <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">Net</th>
                        <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">Cumulative</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(forecast[activeScenario] || []).map((d, i) => (
                        <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-2 text-gray-800 dark:text-white">{d.label}</td>
                          <td className="py-2 text-right text-green-600">₹{d.income.toLocaleString('en-IN')}</td>
                          <td className="py-2 text-right text-red-500">₹{d.expenses.toLocaleString('en-IN')}</td>
                          <td className={`py-2 text-right font-medium ${d.net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {d.net >= 0 ? '+' : ''}₹{d.net.toLocaleString('en-IN')}
                          </td>
                          <td className={`py-2 text-right ${d.cumulative >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                            ₹{d.cumulative.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AnimatedCard>
            </div>
          )}

          {/* Analysis Tab */}
          {activeTab === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* AI Insights */}
              <AnimatedCard className="p-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">
                  <Lightbulb size={14} className="inline mr-1" />AI INSIGHTS
                </h3>
                <div className="space-y-3">
                  {insights.map((insight, i) => (
                    <div key={i} className={`p-3 rounded-lg border ${
                      insight.type === 'positive' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                      insight.type === 'negative' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                      insight.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
                      'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    }`}>
                      <div className="flex items-start gap-2">
                        {insight.type === 'positive' ? <CheckCircle size={16} className="text-green-600 mt-0.5" /> :
                         insight.type === 'negative' ? <XCircle size={16} className="text-red-600 mt-0.5" /> :
                         insight.type === 'warning' ? <AlertTriangle size={16} className="text-yellow-600 mt-0.5" /> :
                         <Lightbulb size={16} className="text-blue-600 mt-0.5" />}
                        <p className="text-sm text-gray-700 dark:text-gray-300">{insight.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </AnimatedCard>

              {/* Historical savings rate trend */}
              <AnimatedCard className="p-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">SAVINGS RATE TREND</h3>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={monthlyData.slice(-12)}>
                      <defs>
                        <linearGradient id="srGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v.toFixed(0)}%`} />
                      <Tooltip formatter={v => [`${v.toFixed(1)}%`, 'Savings Rate']} />
                      <ReferenceLine y={20} stroke="#10B981" strokeDasharray="5 5" label="Target 20%" />
                      <Area type="monotone" dataKey="savingsRate" stroke="#8B5CF6" fill="url(#srGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState icon={<BarChart3 size={48} />} title="No Data" description="Add transactions to see savings rate trends." />
                )}
              </AnimatedCard>

              {/* Income vs Expenses breakdown */}
              <AnimatedCard className="p-4 lg:col-span-2">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">MONTHLY CASH FLOW HISTORY</h3>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthlyData.slice(-12)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend />
                      <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="Income" />
                      <Bar dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} name="Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState icon={<BarChart3 size={48} />} title="No Transaction History"
                    description="Import or add transactions to see cash flow history." />
                )}
              </AnimatedCard>
            </div>
          )}
        </div>
      </PageTransition>
    </MainLayout>
  );
}
