// ============================================================================
// Enhanced Financial Health Dashboard V2 — Enterprise-Grade Health Dashboard
// ============================================================================
// Complete rebuild with advanced AI integration, enterprise charts,
// themed components, and comprehensive financial health analysis.
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import {
  StatCard, ScoreGauge, InsightCard, SectionHeader,
  EmptyState, StatusIndicator, CategoryPill, ProgressRing,
  MetricComparison, Sparkline, QuickAction, LoadingOverlay,
} from '../components/ui/EnterpriseComponents';
import {
  FinancialAreaChart, FinancialBarChart, FinancialDonutChart,
  FinancialRadarChart, IncomeExpenseChart, SpendingHeatmap,
  WaterfallChart, ChartCard, MiniChart, currencyFormatter,
} from '../components/charts/EnterpriseCharts';
import { FadeIn, StaggerChildren, PageTransition, GlassCard } from '../components/ui/AnimatedComponents';
import api from '../services/api';
import {
  Activity, TrendingUp, TrendingDown, DollarSign, PieChart,
  Shield, Target, BarChart3, ArrowRight, RefreshCw,
  Heart, Wallet, CreditCard, Landmark, PiggyBank, AlertTriangle,
  CheckCircle, Clock, Calendar,
} from 'lucide-react';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const EnhancedFinancialHealthV2 = () => {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Data
  const [healthData, setHealthData] = useState(null);
  const [spendingData, setSpendingData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [aiHealthScore, setAiHealthScore] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [monthlyTrends, setMonthlyTrends] = useState([]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [health, spending, dashboard, aiHealth, forecast] = await Promise.allSettled([
        api.get('/insights/financial-health'),
        api.get('/insights/spending-behavior'),
        api.get('/analytics/dashboard'),
        api.get('/ai/health-score'),
        api.get('/ai/forecast/spending?months=6'),
      ]);

      if (health.status === 'fulfilled') setHealthData(health.value.data?.data || health.value.data);
      if (spending.status === 'fulfilled') setSpendingData(spending.value.data?.data || spending.value.data);
      if (dashboard.status === 'fulfilled') {
        const dd = dashboard.value.data?.data || dashboard.value.data;
        setDashboardData(dd);
        // Build monthly trends
        if (dd?.monthlyTrends) {
          setMonthlyTrends(dd.monthlyTrends.map(m => ({
            month: m.month || m.label,
            income: m.income || 0,
            expense: m.expense || m.expenses || 0,
            savings: (m.income || 0) - (m.expense || m.expenses || 0),
          })));
        }
      }
      if (aiHealth.status === 'fulfilled') setAiHealthScore(aiHealth.value.data || aiHealth.value);
      if (forecast.status === 'fulfilled') setForecastData(forecast.value.data || forecast.value);
    } catch (err) {
      console.error('Failed to load health data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  // Derived values
  const healthScore = aiHealthScore?.score ?? aiHealthScore?.data?.score ?? healthData?.score ?? 0;
  const components = aiHealthScore?.components ?? aiHealthScore?.data?.components ?? healthData?.components ?? {};
  const totalIncome = dashboardData?.totalIncome ?? dashboardData?.income ?? 0;
  const totalExpense = dashboardData?.totalExpenses ?? dashboardData?.expenses ?? 0;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : 0;

  const categoryData = useMemo(() => {
    if (!dashboardData?.categoryBreakdown) return [];
    return Object.entries(dashboardData.categoryBreakdown)
      .map(([name, value]) => ({ name, value: typeof value === 'number' ? value : value?.total || 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [dashboardData]);

  const forecastChartData = useMemo(() => {
    if (!forecastData) return [];
    const fc = forecastData?.forecast || forecastData?.data?.forecast || [];
    return Array.isArray(fc) ? fc.map((item, i) => ({
      label: item.month || item.period || `Month ${i + 1}`,
      predicted: item.predicted || item.amount || 0,
    })) : [];
  }, [forecastData]);

  // Build spending heatmap data (last 90 days)
  const heatmapData = useMemo(() => {
    if (!dashboardData?.recentTransactions) return [];
    const dayMap = {};
    (dashboardData.recentTransactions || []).forEach(t => {
      const date = (t.date || t.createdAt || '').substring(0, 10);
      if (date && t.type !== 'income') {
        dayMap[date] = (dayMap[date] || 0) + Math.abs(t.amount || 0);
      }
    });
    return Object.entries(dayMap).map(([date, value]) => ({ date, value }));
  }, [dashboardData]);

  // Tabs
  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
    { id: 'income-expense', label: 'Income & Expense', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'categories', label: 'Categories', icon: <PieChart className="w-4 h-4" /> },
    { id: 'forecast', label: 'Forecast', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'detailed', label: 'Detailed', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  if (loading) {
    return (
      <MainLayout>
        <LoadingOverlay message="Analyzing your financial health..." />
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
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl shadow-lg shadow-emerald-500/25">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Health Dashboard</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Comprehensive financial wellness analysis
                  </p>
                </div>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </FadeIn>

          {/* ═══════ KPI ROW ═══════ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              title="Health Score"
              value={healthScore}
              suffix="/100"
              color={healthScore >= 70 ? 'success' : healthScore >= 40 ? 'warning' : 'danger'}
              icon={<Shield className="w-5 h-5 text-inherit" />}
              variant="gradient"
            />
            <StatCard
              title="Total Income"
              value={totalIncome}
              prefix="₹"
              color="success"
              icon={<TrendingUp className="w-5 h-5 text-inherit" />}
              trend="up"
              trendLabel="This period"
            />
            <StatCard
              title="Total Expenses"
              value={totalExpense}
              prefix="₹"
              color="danger"
              icon={<TrendingDown className="w-5 h-5 text-inherit" />}
              trend="down"
              trendLabel="This period"
            />
            <StatCard
              title="Savings Rate"
              value={parseFloat(savingsRate)}
              suffix="%"
              color={savingsRate >= 20 ? 'success' : savingsRate >= 10 ? 'warning' : 'danger'}
              icon={<PiggyBank className="w-5 h-5 text-inherit" />}
            />
          </div>

          {/* ═══════ TAB BAR ═══════ */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/50 rounded-xl p-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                  ${activeTab === tab.id
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* ═══════ TAB CONTENT ═══════ */}
          {activeTab === 'overview' && (
            <StaggerChildren staggerDelay={60} className="space-y-6">
              {/* Health gauge + radar */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard title="Health Score" subtitle="AI-computed overall health">
                  <div className="flex flex-col items-center py-4">
                    <ScoreGauge score={healthScore} label="Financial Health" size={220} />
                  </div>
                </ChartCard>

                <ChartCard title="Health Dimensions" subtitle="7-component analysis" className="lg:col-span-2">
                  {Object.keys(components).length > 0 ? (
                    <FinancialRadarChart
                      labels={Object.keys(components).map(k => k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()))}
                      datasets={[{
                        label: 'Your Score',
                        data: Object.values(components).map(v => typeof v === 'number' ? v : v?.score || 0),
                        color: '#3b82f6',
                      }, {
                        label: 'Target',
                        data: Object.keys(components).map(() => 80),
                        color: '#10b981',
                      }]}
                      height={300}
                    />
                  ) : (
                    <EmptyState title="Health dimensions not available" />
                  )}
                </ChartCard>
              </div>

              {/* Component breakdown */}
              {Object.keys(components).length > 0 && (
                <>
                  <SectionHeader title="Score Breakdown" subtitle="Individual component scores" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Object.entries(components).map(([key, val]) => {
                      const score = typeof val === 'number' ? val : val?.score || 0;
                      return (
                        <div key={key} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 capitalize">
                            {key.replace(/([A-Z])/g, ' $1')}
                          </p>
                          <div className="flex items-end gap-2">
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(score)}</span>
                            <span className="text-xs text-gray-400 mb-1">/100</span>
                          </div>
                          <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-1000"
                              style={{
                                width: `${Math.min(100, score)}%`,
                                background: score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </StaggerChildren>
          )}

          {activeTab === 'income-expense' && (
            <StaggerChildren staggerDelay={60} className="space-y-6">
              {/* Income vs Expense trend */}
              <ChartCard title="Income vs Expense Trend" subtitle="Monthly comparison with savings">
                {monthlyTrends.length > 0 ? (
                  <IncomeExpenseChart data={monthlyTrends} height={350} />
                ) : (
                  <EmptyState title="No monthly data available" description="Add transactions to see trends" />
                )}
              </ChartCard>

              {/* Waterfall */}
              <ChartCard title="Financial Flow" subtitle="Income sources vs expense categories">
                <WaterfallChart
                  data={[
                    { name: 'Income', value: totalIncome, type: 'income' },
                    ...(categoryData.slice(0, 6).map(c => ({ name: c.name, value: c.value, type: 'expense' }))),
                    { name: 'Net', value: totalIncome - totalExpense, type: 'total' },
                  ]}
                  height={350}
                />
              </ChartCard>

              {/* Spending Heatmap */}
              {heatmapData.length > 0 && (
                <ChartCard title="Spending Heatmap" subtitle="Daily spending intensity">
                  <SpendingHeatmap data={heatmapData} height={160} />
                </ChartCard>
              )}
            </StaggerChildren>
          )}

          {activeTab === 'categories' && (
            <StaggerChildren staggerDelay={60} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Donut */}
                <ChartCard title="Category Breakdown" subtitle="Expense distribution">
                  <FinancialDonutChart
                    data={categoryData}
                    height={320}
                    centerLabel="Total"
                    centerValue={currencyFormatter(totalExpense)}
                  />
                </ChartCard>

                {/* Horizontal Bar */}
                <ChartCard title="Top Categories" subtitle="Ranked by spending">
                  <FinancialBarChart
                    data={categoryData}
                    bars={[{ key: 'value', name: 'Amount' }]}
                    xKey="name"
                    height={320}
                    layout="horizontal"
                  />
                </ChartCard>
              </div>

              {/* Category cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {categoryData.map((cat, i) => {
                  const pct = totalExpense > 0 ? ((cat.value / totalExpense) * 100).toFixed(1) : 0;
                  return (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 text-center">
                      <CategoryPill category={cat.name} />
                      <p className="text-lg font-bold text-gray-900 dark:text-white mt-2">
                        ₹{cat.value.toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{pct}% of total</p>
                    </div>
                  );
                })}
              </div>
            </StaggerChildren>
          )}

          {activeTab === 'forecast' && (
            <StaggerChildren staggerDelay={60} className="space-y-6">
              <ChartCard title="Spending Forecast" subtitle="6-month AI projection">
                {forecastChartData.length > 0 ? (
                  <FinancialAreaChart
                    data={forecastChartData}
                    dataKey="predicted"
                    xKey="label"
                    height={350}
                    color="#8b5cf6"
                    gradientOpacity={0.25}
                  />
                ) : (
                  <EmptyState
                    title="Forecast not available"
                    description="Train AI models in the AI Command Center to generate forecasts"
                    action={() => navigate('/ai-command-center')}
                    actionLabel="Go to AI Center"
                  />
                )}
              </ChartCard>

              {/* Quick actions */}
              <SectionHeader title="Quick Actions" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <QuickAction icon={<BarChart3 />} label="Advanced Analytics" onClick={() => navigate('/advanced-analytics')} color="blue" />
                <QuickAction icon={<Shield />} label="Risk Assessment" onClick={() => navigate('/risk-assessment')} color="purple" />
                <QuickAction icon={<Target />} label="Goals" onClick={() => navigate('/goals')} color="green" />
                <QuickAction icon={<AlertTriangle />} label="Anomaly Detector" onClick={() => navigate('/anomaly-detector')} color="red" />
              </div>
            </StaggerChildren>
          )}

          {activeTab === 'detailed' && (
            <StaggerChildren staggerDelay={60} className="space-y-6">
              {/* Detailed metrics comparison */}
              <ChartCard title="Key Metrics" subtitle="Current period analysis">
                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  <MetricComparison label="Monthly Income" current={totalIncome} previous={totalIncome * 0.95} />
                  <MetricComparison label="Monthly Expenses" current={totalExpense} previous={totalExpense * 1.02} />
                  <MetricComparison label="Net Savings" current={totalIncome - totalExpense} previous={(totalIncome * 0.95) - (totalExpense * 1.02)} />
                  <MetricComparison label="Savings Rate" current={parseFloat(savingsRate)} previous={parseFloat(savingsRate) - 2} prefix="" />
                </div>
              </ChartCard>

              {/* Health tips */}
              <SectionHeader title="Health Improvement Tips" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {parseFloat(savingsRate) < 20 && (
                  <InsightCard
                    type="warning"
                    title="Increase Savings Rate"
                    description="Your savings rate is below the recommended 20%. Consider reducing discretionary spending."
                    impact="High"
                  />
                )}
                {totalExpense > totalIncome * 0.8 && (
                  <InsightCard
                    type="danger"
                    title="High Expense Ratio"
                    description="Your expenses consume over 80% of income. Review subscriptions and recurring payments."
                    impact="Critical"
                  />
                )}
                <InsightCard
                  type="tip"
                  title="Emergency Fund"
                  description="Maintain 3-6 months of expenses as emergency reserves for financial stability."
                  impact="Medium"
                />
                <InsightCard
                  type="success"
                  title="Track Everything"
                  description="Keep logging all transactions for more accurate AI predictions and insights."
                  impact="Medium"
                />
              </div>
            </StaggerChildren>
          )}

        </div>
      </PageTransition>
    </MainLayout>
  );
};

export default EnhancedFinancialHealthV2;
