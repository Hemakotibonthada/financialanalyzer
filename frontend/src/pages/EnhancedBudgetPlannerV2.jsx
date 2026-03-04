// ============================================================================
// Enhanced Budget Planner V2 — Enterprise Budget Management
// ============================================================================
// Full-featured budget planning with AI-powered budget suggestions,
// category tracking, goal progress, and spending limit alerts.
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import MainLayout from '../components/MainLayout';
import {
  StatCard, SectionHeader, InsightCard, EmptyState,
  CategoryPill, ProgressRing, QuickAction, LoadingOverlay,
  MetricComparison, AnimatedNumber,
} from '../components/ui/EnterpriseComponents';
import {
  FinancialBarChart, FinancialDonutChart, FinancialAreaChart,
  ChartCard, WaterfallChart, currencyFormatter,
} from '../components/charts/EnterpriseCharts';
import { FadeIn, StaggerChildren, PageTransition, AnimatedProgress } from '../components/ui/AnimatedComponents';
import api from '../services/api';
import { getAIRecommendations, getSpendingForecast, getSpendingPatterns } from '../services/aiService';
import {
  DollarSign, Target, PieChart, TrendingUp, TrendingDown,
  Plus, RefreshCw, Settings, AlertTriangle, CheckCircle,
  ArrowRight, Edit3, Trash2, Calendar, Wallet, Zap,
  Shield, Award, BarChart3, Calculator, Bell,
} from 'lucide-react';

// ============================================================================
// BUDGET STATUS HELPER
// ============================================================================

const getBudgetStatus = (spent, budget) => {
  if (budget <= 0) return { level: 'none', color: 'gray', label: 'No Budget' };
  const pct = (spent / budget) * 100;
  if (pct >= 100) return { level: 'exceeded', color: 'red', label: 'Exceeded' };
  if (pct >= 80) return { level: 'warning', color: 'amber', label: 'Warning' };
  if (pct >= 50) return { level: 'moderate', color: 'blue', label: 'On Track' };
  return { level: 'good', color: 'green', label: 'Under Budget' };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const EnhancedBudgetPlannerV2 = () => {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [budgets, setBudgets] = useState([]);
  const [spending, setSpending] = useState({});
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [patterns, setPatterns] = useState(null);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [newBudget, setNewBudget] = useState({ category: '', amount: '', period: 'monthly' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.get('/budgets'),
        api.get('/analytics/dashboard?days=30'),
        getAIRecommendations(),
        getSpendingForecast(3),
        getSpendingPatterns(),
      ]);

      const get = (idx) => results[idx]?.status === 'fulfilled' ? results[idx].value : null;

      const budgetData = get(0)?.data?.data || get(0)?.data?.budgets || get(0)?.data || [];
      setBudgets(Array.isArray(budgetData) ? budgetData : []);

      const dashboard = get(1)?.data?.data || get(1)?.data || {};
      setMonthlySummary(dashboard);

      if (dashboard?.categoryBreakdown) {
        const catSpending = {};
        Object.entries(dashboard.categoryBreakdown).forEach(([k, v]) => {
          catSpending[k.toLowerCase()] = typeof v === 'number' ? v : v?.total || 0;
        });
        setSpending(catSpending);
      }

      const recs = get(2)?.recommendations || get(2)?.data?.recommendations || [];
      setRecommendations(Array.isArray(recs) ? recs : []);

      const fc = get(3)?.forecast || get(3)?.data?.forecast || [];
      setForecast(Array.isArray(fc) ? fc : []);

      setPatterns(get(4));
    } catch (err) {
      console.error('Budget data fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Derived
  const totalBudget = budgets.reduce((sum, b) => sum + (b.amount || b.limit || 0), 0);
  const totalSpent = Object.values(spending).reduce((sum, v) => sum + v, 0);
  const budgetUtilization = totalBudget > 0 ? ((totalSpent / totalBudget) * 100) : 0;
  const remaining = totalBudget - totalSpent;

  const budgetWithSpending = budgets.map(b => {
    const cat = (b.category || '').toLowerCase();
    const spent = spending[cat] || 0;
    const limit = b.amount || b.limit || 0;
    const status = getBudgetStatus(spent, limit);
    return { ...b, spent, limit, status, pct: limit > 0 ? ((spent / limit) * 100) : 0 };
  });

  const exceededBudgets = budgetWithSpending.filter(b => b.pct >= 100);
  const warningBudgets = budgetWithSpending.filter(b => b.pct >= 80 && b.pct < 100);

  const handleAddBudget = async () => {
    if (!newBudget.category || !newBudget.amount) return;
    try {
      await api.post('/budgets', {
        category: newBudget.category,
        amount: parseFloat(newBudget.amount),
        period: newBudget.period,
      });
      setShowAddBudget(false);
      setNewBudget({ category: '', amount: '', period: 'monthly' });
      fetchData();
    } catch (err) {
      console.error('Failed to add budget:', err);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'categories', label: 'Categories', icon: <PieChart className="w-4 h-4" /> },
    { id: 'forecast', label: 'Forecast', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'ai', label: 'AI Advisor', icon: <Zap className="w-4 h-4" /> },
  ];

  if (loading) {
    return (
      <MainLayout>
        <LoadingOverlay message="Analyzing budgets..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageTransition>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* HEADER */}
          <FadeIn>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl shadow-lg shadow-emerald-500/25">
                  <Calculator className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Budget Planner</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">AI-optimized budget management</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchData}
                  className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  <RefreshCw className="w-4 h-4 text-gray-500" />
                </button>
                <button
                  onClick={() => setShowAddBudget(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-emerald-500/25"
                >
                  <Plus className="w-4 h-4" /> Add Budget
                </button>
              </div>
            </div>
          </FadeIn>

          {/* KPI ROW */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Budget"
              value={totalBudget}
              prefix="₹"
              color="primary"
              icon={<Target className="w-5 h-5 text-inherit" />}
              variant="gradient"
            />
            <StatCard
              title="Total Spent"
              value={totalSpent}
              prefix="₹"
              color={budgetUtilization > 80 ? 'danger' : 'warning'}
              icon={<Wallet className="w-5 h-5 text-inherit" />}
              trend={`${budgetUtilization.toFixed(0)}%`}
              trendDirection={budgetUtilization > 80 ? 'down' : 'up'}
            />
            <StatCard
              title="Remaining"
              value={Math.abs(remaining)}
              prefix={remaining >= 0 ? '₹' : '-₹'}
              color={remaining >= 0 ? 'success' : 'danger'}
              icon={<DollarSign className="w-5 h-5 text-inherit" />}
            />
            <StatCard
              title="Budgets Exceeded"
              value={exceededBudgets.length}
              color={exceededBudgets.length > 0 ? 'danger' : 'success'}
              icon={<AlertTriangle className="w-5 h-5 text-inherit" />}
            />
          </div>

          {/* Alerts */}
          {exceededBudgets.length > 0 && (
            <FadeIn>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span className="font-semibold text-red-700 dark:text-red-400">
                    {exceededBudgets.length} budget{exceededBudgets.length > 1 ? 's' : ''} exceeded!
                  </span>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400">
                  {exceededBudgets.map(b => b.category).join(', ')} — consider adjusting spending or budgets.
                </p>
              </div>
            </FadeIn>
          )}

          {/* TABS */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/50 rounded-xl p-1 overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === t.id
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <StaggerChildren staggerDelay={60} className="space-y-6">
              {/* Overall progress */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Overall Budget Usage</h3>
                  <span className={`text-sm font-bold ${budgetUtilization > 100 ? 'text-red-500' : budgetUtilization > 80 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {budgetUtilization.toFixed(1)}%
                  </span>
                </div>
                <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      budgetUtilization > 100 ? 'bg-red-500' : budgetUtilization > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-400">
                  <span>₹0</span>
                  <span>₹{totalBudget.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Budget cards */}
              {budgetWithSpending.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {budgetWithSpending.map((b, i) => {
                    const statusColors = {
                      exceeded: 'border-red-200 dark:border-red-800/40',
                      warning: 'border-amber-200 dark:border-amber-800/40',
                      moderate: 'border-blue-200 dark:border-blue-800/40',
                      good: 'border-green-200 dark:border-green-800/40',
                      none: 'border-gray-200 dark:border-gray-700/40',
                    };
                    const barColors = {
                      exceeded: 'bg-red-500', warning: 'bg-amber-500',
                      moderate: 'bg-blue-500', good: 'bg-emerald-500', none: 'bg-gray-400',
                    };

                    return (
                      <div key={i} className={`bg-white dark:bg-gray-800 rounded-xl p-5 border ${statusColors[b.status.level]} hover:shadow-md transition-shadow`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <CategoryPill category={b.category} />
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              b.status.level === 'exceeded' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              b.status.level === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                              'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }`}>
                              {b.status.label}
                            </span>
                          </div>
                          <ProgressRing value={Math.min(b.pct, 100)} size={40} color={
                            b.status.level === 'exceeded' ? '#ef4444' :
                            b.status.level === 'warning' ? '#f59e0b' : '#10b981'
                          } />
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-400">Spent</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">₹{b.spent.toLocaleString('en-IN')}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Budget</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">₹{b.limit.toLocaleString('en-IN')}</p>
                          </div>
                        </div>

                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${barColors[b.status.level]}`}
                            style={{ width: `${Math.min(b.pct, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          {b.limit > b.spent
                            ? `₹${(b.limit - b.spent).toLocaleString('en-IN')} remaining`
                            : `₹${(b.spent - b.limit).toLocaleString('en-IN')} over budget`
                          }
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title="No budgets set"
                  description="Create category budgets to start tracking your spending limits."
                />
              )}

              {/* Distribution chart */}
              {budgetWithSpending.length > 0 && (
                <ChartCard title="Budget vs Spending" subtitle="Side-by-side comparison">
                  <FinancialBarChart
                    data={budgetWithSpending.map(b => ({
                      name: b.category,
                      budget: b.limit,
                      spent: b.spent,
                    }))}
                    bars={[
                      { key: 'budget', name: 'Budget', color: '#3b82f6' },
                      { key: 'spent', name: 'Spent', color: '#f59e0b' },
                    ]}
                    xKey="name"
                    height={320}
                  />
                </ChartCard>
              )}
            </StaggerChildren>
          )}

          {activeTab === 'categories' && (
            <StaggerChildren staggerDelay={60} className="space-y-6">
              {budgetWithSpending.length > 0 ? (
                <>
                  <ChartCard title="Spending Distribution" subtitle="Category-wise spending breakdown">
                    <FinancialDonutChart
                      data={budgetWithSpending.map(b => ({ name: b.category, value: b.spent }))}
                      height={320}
                      centerLabel="Spent"
                      centerValue={currencyFormatter(totalSpent)}
                    />
                  </ChartCard>

                  <ChartCard title="Budget Utilization" subtitle="Percentage of budget used per category">
                    <FinancialBarChart
                      data={budgetWithSpending.map(b => ({
                        name: b.category,
                        utilization: Math.min(b.pct, 150),
                      }))}
                      bars={[{ key: 'utilization', name: 'Usage %' }]}
                      xKey="name"
                      height={300}
                      layout="horizontal"
                    />
                  </ChartCard>
                </>
              ) : (
                <EmptyState title="No categories to display" />
              )}
            </StaggerChildren>
          )}

          {activeTab === 'forecast' && (
            <StaggerChildren staggerDelay={60} className="space-y-6">
              {forecast.length > 0 ? (
                <ChartCard title="Spending Forecast" subtitle="AI-predicted spending for upcoming months">
                  <FinancialAreaChart
                    data={forecast.map((f, i) => ({
                      label: f.month || f.period || `Month ${i + 1}`,
                      predicted: f.predicted || f.amount || 0,
                    }))}
                    dataKey="predicted"
                    xKey="label"
                    color="#8b5cf6"
                    height={300}
                  />
                </ChartCard>
              ) : (
                <EmptyState title="Forecast unavailable" description="Need more transaction history for predictions." />
              )}

              <MetricComparison
                label1="This Month (Estimated)"
                value1={forecast[0]?.predicted || forecast[0]?.amount || totalSpent}
                label2="Budget Total"
                value2={totalBudget}
                format="currency"
              />
            </StaggerChildren>
          )}

          {activeTab === 'ai' && (
            <StaggerChildren staggerDelay={60} className="space-y-6">
              <SectionHeader title="AI Budget Recommendations" badge={`${recommendations.length}`} />
              {recommendations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendations.map((rec, i) => (
                    <InsightCard
                      key={i}
                      type={rec.priority === 'high' ? 'warning' : rec.type === 'saving' ? 'success' : 'tip'}
                      title={rec.title || rec.category || 'AI Recommendation'}
                      description={rec.message || rec.description || rec.recommendation}
                      impact={rec.impact || rec.potentialSavings}
                      confidence={rec.confidence}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState title="No AI recommendations available" description="Add transactions and budgets for personalized advice." />
              )}

              {/* Quick actions */}
              <SectionHeader title="Quick Actions" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <QuickAction icon={<Calculator />} label="Auto-Budget" onClick={() => {}} />
                <QuickAction icon={<Bell />} label="Set Alerts" onClick={() => {}} />
                <QuickAction icon={<Target />} label="Set Goals" onClick={() => {}} />
                <QuickAction icon={<Award />} label="Achievements" onClick={() => {}} />
              </div>
            </StaggerChildren>
          )}

          {/* ADD BUDGET MODAL */}
          {showAddBudget && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-xl animate-scale-up">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Budget</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Category</label>
                    <input
                      type="text"
                      value={newBudget.category}
                      onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm"
                      placeholder="e.g., Food, Transport, Shopping"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Amount (₹)</label>
                    <input
                      type="number"
                      value={newBudget.amount}
                      onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm"
                      placeholder="e.g., 5000"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Period</label>
                    <select
                      value={newBudget.period}
                      onChange={(e) => setNewBudget({ ...newBudget, period: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowAddBudget(false)}
                      className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddBudget}
                      className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-emerald-500/25"
                    >
                      Add Budget
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </PageTransition>
    </MainLayout>
  );
};

export default EnhancedBudgetPlannerV2;
