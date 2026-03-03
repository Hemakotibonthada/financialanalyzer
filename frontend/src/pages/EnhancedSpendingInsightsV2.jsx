// ============================================================================
// Enhanced Spending Insights V2 — AI-Powered Spending Analysis
// ============================================================================
// Deep spending analysis with machine learning pattern detection,
// category clustering, anomaly highlighting, and predictive forecasts.
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import {
  StatCard, SectionHeader, InsightCard, EmptyState,
  CategoryPill, MetricComparison, ProgressRing,
  Sparkline, QuickAction, LoadingOverlay,
} from '../components/ui/EnterpriseComponents';
import {
  FinancialAreaChart, FinancialBarChart, FinancialDonutChart,
  SpendingHeatmap, WaterfallChart, ChartCard, MiniChart,
  currencyFormatter,
} from '../components/charts/EnterpriseCharts';
import { FadeIn, StaggerChildren, PageTransition } from '../components/ui/AnimatedComponents';
import api from '../services/api';
import {
  getSpendingForecast, getSpendingPatterns, getAnomalies,
  getInsights, getMerchantAnalysis, getRecurringPatterns,
  getChangepoints,
} from '../services/aiService';
import {
  TrendingUp, TrendingDown, DollarSign, PieChart, Target,
  BarChart3, Calendar, RefreshCw, Filter, Download,
  ArrowUpRight, ArrowDownRight, ShoppingCart, Utensils,
  Car, Heart, Gamepad2, Home, Zap, Wifi, AlertTriangle,
  Map, Clock, Repeat,
} from 'lucide-react';

// ============================================================================
// CATEGORY ICONS
// ============================================================================

const CATEGORY_ICONS = {
  food: Utensils, transport: Car, shopping: ShoppingCart,
  entertainment: Gamepad2, health: Heart, utilities: Wifi,
  rent: Home, other: DollarSign,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const EnhancedSpendingInsightsV2 = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [activeView, setActiveView] = useState('overview');

  // Data
  const [transactions, setTransactions] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [dailySpending, setDailySpending] = useState([]);
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [insights, setInsights] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [changepoints, setChangepoints] = useState([]);
  const [spendingClusters, setSpendingClusters] = useState(null);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.get(`/analytics/dashboard?days=${timeRange}`),
        api.get(`/transactions?limit=500&days=${timeRange}`),
        getSpendingForecast(3),
        getAnomalies(),
        getInsights(),
        getRecurringPatterns(),
        getMerchantAnalysis(),
        getChangepoints(),
        getSpendingPatterns(),
      ]);

      const get = (idx) => results[idx]?.status === 'fulfilled' ? results[idx].value : null;

      // Dashboard data
      const dd = get(0)?.data?.data || get(0)?.data || {};

      // Category breakdown
      if (dd?.categoryBreakdown) {
        const cats = Object.entries(dd.categoryBreakdown)
          .map(([name, value]) => ({
            name,
            value: typeof value === 'number' ? value : value?.total || 0,
            count: value?.count || 0,
          }))
          .sort((a, b) => b.value - a.value);
        setCategoryData(cats);
      }

      // Monthly trends
      if (dd?.monthlyTrends) {
        setMonthlyTrends(dd.monthlyTrends.map(m => ({
          month: m.month || m.label,
          income: m.income || 0,
          expense: m.expense || m.expenses || 0,
        })));
      }

      // Transactions
      const txns = get(1)?.data?.data?.transactions || get(1)?.data?.transactions || get(1)?.data?.data || [];
      setTransactions(txns);

      // Build daily spending
      if (txns.length > 0) {
        const dayMap = {};
        txns.forEach(t => {
          if (t.type !== 'income' && t.amount) {
            const date = (t.date || t.createdAt || '').substring(0, 10);
            if (date) dayMap[date] = (dayMap[date] || 0) + Math.abs(t.amount);
          }
        });
        setDailySpending(Object.entries(dayMap).sort().map(([date, value]) => ({ date, value })));
      }

      // AI data
      const fc = get(2)?.data?.forecast || get(2)?.forecast || [];
      setForecast(Array.isArray(fc) ? fc.map((f, i) => ({
        label: f.month || f.period || `Month ${i + 1}`,
        predicted: f.predicted || f.amount || 0,
      })) : []);

      setAnomalies(get(3)?.anomalies || get(3)?.data?.anomalies || []);
      setInsights(get(4)?.insights || get(4)?.data?.insights || []);
      setPatterns(get(5)?.patterns || get(5)?.data?.patterns || []);
      setMerchants(get(6)?.merchants || get(6)?.data?.merchants || get(6)?.data?.topMerchants || []);
      setChangepoints(get(7)?.changepoints || get(7)?.data?.changepoints || []);
      setSpendingClusters(get(8));

    } catch (err) {
      console.error('Failed to load spending data:', err);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // Derived
  const totalSpending = categoryData.reduce((s, c) => s + c.value, 0);
  const avgDaily = dailySpending.length > 0 ? totalSpending / dailySpending.length : 0;
  const topCategory = categoryData[0];
  const weekdayAvg = useMemo(() => {
    if (!dailySpending.length) return { weekday: 0, weekend: 0 };
    let wdTotal = 0, wdCount = 0, weTotal = 0, weCount = 0;
    dailySpending.forEach(d => {
      const dow = new Date(d.date).getDay();
      if (dow === 0 || dow === 6) { weTotal += d.value; weCount++; }
      else { wdTotal += d.value; wdCount++; }
    });
    return { weekday: wdCount ? wdTotal / wdCount : 0, weekend: weCount ? weTotal / weCount : 0 };
  }, [dailySpending]);

  // Views
  const views = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'categories', label: 'Categories', icon: <PieChart className="w-4 h-4" /> },
    { id: 'patterns', label: 'Patterns', icon: <Repeat className="w-4 h-4" /> },
    { id: 'merchants', label: 'Merchants', icon: <Map className="w-4 h-4" /> },
    { id: 'anomalies', label: 'Anomalies', icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  if (loading) {
    return (
      <MainLayout>
        <LoadingOverlay message="Analyzing spending patterns..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageTransition>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* ═══════ HEADER ═══════ */}
          <FadeIn>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-red-500 to-orange-600 p-2.5 rounded-xl shadow-lg shadow-red-500/25">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Spending Insights</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">AI-powered spending analysis & predictions</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 3 months</option>
                  <option value="180">Last 6 months</option>
                  <option value="365">Last year</option>
                </select>
                <button
                  onClick={fetchAllData}
                  className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  <RefreshCw className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          </FadeIn>

          {/* ═══════ KPI ROW ═══════ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              title="Total Spending"
              value={totalSpending}
              prefix="₹"
              color="danger"
              icon={<DollarSign className="w-5 h-5 text-inherit" />}
              variant="gradient"
            />
            <StatCard
              title="Daily Average"
              value={Math.round(avgDaily)}
              prefix="₹"
              color="warning"
              icon={<Calendar className="w-5 h-5 text-inherit" />}
            />
            <StatCard
              title="Top Category"
              value={topCategory?.name || 'N/A'}
              color="purple"
              icon={<PieChart className="w-5 h-5 text-inherit" />}
              animateValue={false}
            />
            <StatCard
              title="Anomalies Found"
              value={anomalies.length}
              color={anomalies.length > 0 ? 'danger' : 'success'}
              icon={<AlertTriangle className="w-5 h-5 text-inherit" />}
            />
          </div>

          {/* ═══════ VIEW TABS ═══════ */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/50 rounded-xl p-1 overflow-x-auto">
            {views.map(v => (
              <button
                key={v.id}
                onClick={() => setActiveView(v.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeView === v.id
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {v.icon}
                {v.label}
              </button>
            ))}
          </div>

          {/* ═══════ VIEW CONTENT ═══════ */}
          {activeView === 'overview' && (
            <StaggerChildren staggerDelay={60} className="space-y-6">
              {/* Spending trend */}
              <ChartCard title="Spending Trend" subtitle="Daily spending with AI trendline">
                {dailySpending.length > 0 ? (
                  <FinancialAreaChart
                    data={dailySpending}
                    dataKey="value"
                    xKey="date"
                    color="#ef4444"
                    gradientOpacity={0.2}
                    height={300}
                  />
                ) : (
                  <EmptyState title="No spending data" />
                )}
              </ChartCard>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Spending heatmap */}
                {dailySpending.length > 0 && (
                  <ChartCard title="Spending Heatmap" subtitle="Daily spending intensity">
                    <SpendingHeatmap data={dailySpending} height={160} color="#ef4444" />
                  </ChartCard>
                )}

                {/* Weekday vs Weekend */}
                <ChartCard title="Weekday vs Weekend" subtitle="Average daily spending">
                  <FinancialBarChart
                    data={[
                      { name: 'Weekdays', value: Math.round(weekdayAvg.weekday) },
                      { name: 'Weekends', value: Math.round(weekdayAvg.weekend) },
                    ]}
                    bars={[{ key: 'value', name: 'Avg Daily', color: weekdayAvg.weekend > weekdayAvg.weekday ? '#f59e0b' : '#3b82f6' }]}
                    xKey="name"
                    height={180}
                  />
                </ChartCard>
              </div>

              {/* Forecast */}
              {forecast.length > 0 && (
                <ChartCard title="Spending Forecast" subtitle="AI neural network prediction">
                  <FinancialAreaChart
                    data={forecast}
                    dataKey="predicted"
                    xKey="label"
                    color="#8b5cf6"
                    height={250}
                  />
                </ChartCard>
              )}

              {/* AI Insights */}
              {insights.length > 0 && (
                <>
                  <SectionHeader title="AI Spending Insights" badge={`${insights.length}`} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {insights.slice(0, 4).map((insight, i) => (
                      <InsightCard
                        key={i}
                        type={insight.priority === 'high' ? 'warning' : 'info'}
                        title={insight.title || insight.type}
                        description={insight.message || insight.description}
                        impact={insight.impact}
                        confidence={insight.confidence}
                      />
                    ))}
                  </div>
                </>
              )}
            </StaggerChildren>
          )}

          {activeView === 'categories' && (
            <StaggerChildren staggerDelay={60} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Category Distribution" subtitle="Where your money goes">
                  <FinancialDonutChart
                    data={categoryData}
                    height={320}
                    centerLabel="Categories"
                    centerValue={`${categoryData.length}`}
                  />
                </ChartCard>
                <ChartCard title="Top Spending Categories" subtitle="Ranked by total amount">
                  <FinancialBarChart
                    data={categoryData.slice(0, 8)}
                    bars={[{ key: 'value', name: 'Amount' }]}
                    xKey="name"
                    height={320}
                    layout="horizontal"
                  />
                </ChartCard>
              </div>

              {/* Category cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {categoryData.map((cat, i) => {
                  const pct = totalSpending > 0 ? ((cat.value / totalSpending) * 100).toFixed(1) : 0;
                  const Icon = CATEGORY_ICONS[cat.name.toLowerCase()] || DollarSign;
                  return (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className="w-4 h-4 text-gray-400" />
                        <CategoryPill category={cat.name} />
                      </div>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        ₹{cat.value.toLocaleString('en-IN')}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">{pct}% of total</span>
                        <span className="text-xs text-gray-400">{cat.count || 0} txns</span>
                      </div>
                      <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Waterfall */}
              <ChartCard title="Financial Flow" subtitle="How money flows through categories">
                <WaterfallChart
                  data={categoryData.slice(0, 6).map(c => ({
                    name: c.name, value: c.value, type: 'expense',
                  }))}
                  height={300}
                />
              </ChartCard>
            </StaggerChildren>
          )}

          {activeView === 'patterns' && (
            <StaggerChildren staggerDelay={60} className="space-y-6">
              <SectionHeader title="Recurring Patterns" subtitle="AI-detected recurring transactions" badge={`${patterns.length} found`} />
              {patterns.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patterns.map((p, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Repeat className="w-4 h-4 text-blue-500" />
                          <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                            {p.merchant || p.description || p.name || `Pattern ${i + 1}`}
                          </span>
                        </div>
                        <CategoryPill category={p.category} />
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-xs text-gray-400">Amount</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">₹{(p.amount || p.avgAmount || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Frequency</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{p.frequency || 'Monthly'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Confidence</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{p.confidence ? `${Math.round(p.confidence * 100)}%` : 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No recurring patterns detected" description="Continue logging transactions for pattern recognition" />
              )}

              {/* Changepoints */}
              {changepoints.length > 0 && (
                <>
                  <SectionHeader title="Spending Changepoints" subtitle="Significant shifts in spending behavior" badge={`${changepoints.length}`} />
                  <div className="space-y-3">
                    {changepoints.map((cp, i) => (
                      <InsightCard
                        key={i}
                        type="warning"
                        title={`Changepoint at ${cp.date || cp.index || `Position ${i + 1}`}`}
                        description={cp.description || `Significant spending shift detected. Before: ₹${(cp.meanBefore || 0).toLocaleString('en-IN')}/day → After: ₹${(cp.meanAfter || 0).toLocaleString('en-IN')}/day`}
                        confidence={cp.confidence}
                      />
                    ))}
                  </div>
                </>
              )}
            </StaggerChildren>
          )}

          {activeView === 'merchants' && (
            <StaggerChildren staggerDelay={60} className="space-y-6">
              <SectionHeader title="Top Merchants" subtitle="Where you spend the most" badge={`${merchants.length}`} />
              {merchants.length > 0 ? (
                <>
                  <ChartCard title="Merchant Spending Distribution">
                    <FinancialBarChart
                      data={merchants.slice(0, 10).map(m => ({
                        name: m.name || m.merchant || m.description || `Merchant ${merchants.indexOf(m) + 1}`,
                        value: m.totalSpent || m.total || m.amount || 0,
                      }))}
                      bars={[{ key: 'value', name: 'Total Spent', color: '#8b5cf6' }]}
                      xKey="name"
                      height={350}
                      layout="horizontal"
                    />
                  </ChartCard>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {merchants.slice(0, 12).map((m, i) => (
                      <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                            {m.name || m.merchant || `Merchant ${i + 1}`}
                          </span>
                          <span className="text-xs text-gray-400">{m.count || m.transactions || 0} txns</span>
                        </div>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          ₹{(m.totalSpent || m.total || m.amount || 0).toLocaleString('en-IN')}
                        </p>
                        {m.category && <CategoryPill category={m.category} className="mt-2" />}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState title="No merchant data available" description="Add transactions with merchant details" />
              )}
            </StaggerChildren>
          )}

          {activeView === 'anomalies' && (
            <StaggerChildren staggerDelay={60} className="space-y-6">
              <SectionHeader
                title="Anomalous Transactions"
                subtitle="AI-flagged unusual spending"
                badge={anomalies.length > 0 ? `${anomalies.length} found` : 'All clear'}
              />
              {anomalies.length > 0 ? (
                <div className="space-y-3">
                  {anomalies.map((a, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-red-100 dark:border-red-800/30 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        <div className="bg-red-50 dark:bg-red-900/20 p-2.5 rounded-xl flex-shrink-0">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                              {a.description || a.merchant || `Transaction ${i + 1}`}
                            </h4>
                            <span className="text-lg font-bold text-red-600">
                              ₹{Math.abs(a.amount || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {a.reason || 'This transaction deviates significantly from your normal spending patterns.'}
                          </p>
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                            {a.date && <span>{new Date(a.date).toLocaleDateString('en-IN')}</span>}
                            {a.category && <CategoryPill category={a.category} />}
                            {a.zscore && <span>Z-score: {a.zscore.toFixed(2)}</span>}
                            {a.confidence && <span>Confidence: {Math.round(a.confidence * 100)}%</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No anomalies detected"
                  description="All your transactions appear to follow normal spending patterns."
                  variant="success"
                />
              )}
            </StaggerChildren>
          )}

        </div>
      </PageTransition>
    </MainLayout>
  );
};

export default EnhancedSpendingInsightsV2;
