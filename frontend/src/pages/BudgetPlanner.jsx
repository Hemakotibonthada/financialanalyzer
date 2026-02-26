// ============================================================
// Financial Analyzer - Budget Planner Page
// Feature #82: Interactive Budget Planning with AI suggestions
// ============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { AnimatedCard, StatCard, Badge, Modal, ProgressRing, Stepper, AnimatedTabs, SearchInput, DropdownMenu, Accordion, EmptyState } from '../components/ui/ComponentLibrary';
import { EnhancedBarChart, EnhancedDoughnutChart, EnhancedLineChart, GaugeChart, Sparkline } from '../components/ui/ChartComponents';
import { useScrollReveal, useAnimatedCounter, useLocalStorage, useForm } from '../hooks/useCustomHooks';
import { formatCurrency, formatPercentage, getCategoryIcon } from '../utils/helpers';
import '../styles/animations.css';

const BUDGET_CATEGORIES = [
  { id: 'housing', name: 'Housing/Rent', icon: '🏠', recommended: 30, color: '#667eea' },
  { id: 'food', name: 'Food & Dining', icon: '🍕', recommended: 15, color: '#f5576c' },
  { id: 'transport', name: 'Transportation', icon: '🚗', recommended: 10, color: '#4facfe' },
  { id: 'utilities', name: 'Utilities & Bills', icon: '💡', recommended: 5, color: '#43e97b' },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥', recommended: 5, color: '#fa709a' },
  { id: 'education', name: 'Education', icon: '📚', recommended: 5, color: '#fee140' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', recommended: 5, color: '#a18cd1' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', recommended: 5, color: '#fccb90' },
  { id: 'insurance', name: 'Insurance', icon: '🛡️', recommended: 5, color: '#84fab0' },
  { id: 'savings', name: 'Savings & Investments', icon: '💰', recommended: 20, color: '#10B981' },
  { id: 'personal', name: 'Personal Care', icon: '💇', recommended: 3, color: '#d57eeb' },
  { id: 'gifts', name: 'Gifts & Donations', icon: '🎁', recommended: 2, color: '#fda085' },
];

const BUDGET_RULES = {
  '50-30-20': { needs: 50, wants: 30, savings: 20, name: '50/30/20 Rule' },
  '60-20-20': { needs: 60, wants: 20, savings: 20, name: '60/20/20 Rule' },
  '70-20-10': { needs: 70, wants: 20, savings: 10, name: '70/20/10 Rule' },
  '80-20': { needs: 80, wants: 0, savings: 20, name: '80/20 Rule' },
  custom: { needs: 0, wants: 0, savings: 0, name: 'Custom' },
};

export default function BudgetPlanner() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [budgetRule, setBudgetRule] = useLocalStorage('budget_rule', '50-30-20');

  const [budgetData, setBudgetData] = useState({
    income: 0,
    totalBudget: 0,
    totalSpent: 0,
    categories: BUDGET_CATEGORIES.map(cat => ({
      ...cat,
      budgeted: 0,
      spent: 0,
      remaining: 0,
    })),
    history: [],
    alerts: [],
  });

  // Fetch budget data from API
  useEffect(() => {
    const fetchBudgets = async () => {
      setLoading(true);
      setError(null);
      try {
        const [budgetRes, summaryRes, alertsRes] = await Promise.allSettled([
          api.get('/budgets'),
          api.get('/budgets/summary/overview'),
          api.get('/budgets/alerts/check'),
        ]);

        // Extract budgets array from response
        const budgets = budgetRes.status === 'fulfilled'
          ? (budgetRes.value.data?.data?.budgets || budgetRes.value.data?.budgets || [])
          : [];

        // Extract summary (includes income context via analytics)
        const summaryData = summaryRes.status === 'fulfilled'
          ? (summaryRes.value.data?.data?.summary || summaryRes.value.data?.summary || {})
          : {};

        // Extract alerts from the alerts endpoint
        const apiAlerts = alertsRes.status === 'fulfilled'
          ? (alertsRes.value.data?.data?.alerts || alertsRes.value.data?.alerts || [])
          : [];

        // Try to fetch income from analytics summary
        let income = 0;
        try {
          const analyticsRes = await api.get('/analytics/summary');
          income = analyticsRes.data?.data?.currentMonth?.income
            || analyticsRes.data?.currentMonth?.income
            || 0;
        } catch {
          // analytics endpoint may not be available; income stays 0
        }

        // Build categories from real budget data
        const categories = BUDGET_CATEGORIES.map(cat => {
          const budget = budgets.find(
            b => b.category?.toLowerCase() === cat.id.toLowerCase()
          );
          const budgeted = budget?.amount || 0;
          const spent = budget?.spent || 0;
          return {
            ...cat,
            budgeted: Math.round(budgeted),
            spent: Math.round(spent),
            remaining: Math.round(budgeted - spent),
          };
        });

        setBudgetData({
          income,
          totalBudget: summaryData.totalBudgeted || categories.reduce((s, c) => s + c.budgeted, 0),
          totalSpent: summaryData.totalSpent || categories.reduce((s, c) => s + c.spent, 0),
          categories,
          history: [], // will be populated below
          alerts: apiAlerts,
        });

        // Fetch real history (last 12 months) in the background
        fetchBudgetHistory();
      } catch (err) {
        console.error('Budget fetch error:', err);
        setError('Failed to load budget data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    const fetchBudgetHistory = async () => {
      try {
        // Build the last 12 months of real budget data by querying summary for each month
        const months = [];
        const now = new Date(selectedMonth + '-01');
        for (let i = 0; i < 12; i++) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          months.push(d);
        }

        const historyPromises = months.map(d => {
          const monthStr = d.toISOString().slice(0, 7);
          return api.get(`/budgets/summary/overview?month=${monthStr}`).catch(() => null);
        });

        const historyResults = await Promise.allSettled(historyPromises);

        const history = months.map((d, idx) => {
          const res = historyResults[idx];
          const summary = res?.status === 'fulfilled'
            ? (res.value?.data?.data?.summary || res.value?.data?.summary || {})
            : {};
          return {
            month: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
            budgeted: summary.totalBudgeted || 0,
            spent: summary.totalSpent || 0,
          };
        });

        setBudgetData(prev => ({ ...prev, history }));
      } catch {
        // History fetch failed silently - history stays empty
      }
    };

    fetchBudgets();
  }, [selectedMonth]);

  // Computed values
  const { totalBudgeted, totalSpent, totalRemaining, savingsRate, overBudgetCategories } = useMemo(() => {
    const tb = budgetData.categories.reduce((sum, c) => sum + c.budgeted, 0);
    const ts = budgetData.categories.reduce((sum, c) => sum + c.spent, 0);
    const obc = budgetData.categories.filter(c => c.spent > c.budgeted && c.budgeted > 0);
    return {
      totalBudgeted: tb,
      totalSpent: ts,
      totalRemaining: tb - ts,
      savingsRate: budgetData.income > 0 ? ((budgetData.income - ts) / budgetData.income) * 100 : 0,
      overBudgetCategories: obc,
    };
  }, [budgetData]);

  // 50/30/20 rule analysis from real data
  const ruleAnalysis = useMemo(() => {
    const needsMap = ['housing', 'food', 'transport', 'utilities', 'healthcare', 'insurance'];
    const wantsMap = ['entertainment', 'shopping', 'personal', 'gifts', 'education'];
    const savingsMap = ['savings'];

    const needsSpent = budgetData.categories
      .filter(c => needsMap.includes(c.id))
      .reduce((s, c) => s + c.spent, 0);
    const wantsSpent = budgetData.categories
      .filter(c => wantsMap.includes(c.id))
      .reduce((s, c) => s + c.spent, 0);
    const savingsSpent = budgetData.categories
      .filter(c => savingsMap.includes(c.id))
      .reduce((s, c) => s + c.spent, 0);

    const total = needsSpent + wantsSpent + savingsSpent;
    return {
      needs: total > 0 ? Math.round((needsSpent / total) * 100) : 0,
      wants: total > 0 ? Math.round((wantsSpent / total) * 100) : 0,
      savings: total > 0 ? Math.round((savingsSpent / total) * 100) : 0,
    };
  }, [budgetData]);

  // Spending efficiency computed from real data
  const efficiencyData = useMemo(() => {
    const withBudget = budgetData.categories.filter(c => c.budgeted > 0);
    if (withBudget.length === 0) return { score: 0, best: null, worst: null };

    const avgAdherence = withBudget.reduce((sum, c) => {
      const ratio = c.spent / c.budgeted;
      // Score: 100 if at/under budget, decreasing as overspend grows
      return sum + Math.max(0, 100 - Math.max(0, (ratio - 1) * 100));
    }, 0) / withBudget.length;

    const sorted = [...withBudget].sort((a, b) => (a.spent / a.budgeted) - (b.spent / b.budgeted));
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    return {
      score: Math.round(avgAdherence),
      best,
      worst,
    };
  }, [budgetData]);

  // Apply budget rule
  const applySuggestion = useCallback((rule) => {
    const ruleConfig = BUDGET_RULES[rule];
    if (!ruleConfig) return;
    setBudgetRule(rule);
    const needsMap = ['housing', 'food', 'transport', 'utilities', 'healthcare', 'insurance'];
    const wantsMap = ['entertainment', 'shopping', 'personal', 'gifts', 'education'];
    const savingsMap = ['savings'];

    const needsBudget = (ruleConfig.needs / 100) * budgetData.income;
    const wantsBudget = (ruleConfig.wants / 100) * budgetData.income;
    const savingsBudget = (ruleConfig.savings / 100) * budgetData.income;

    setBudgetData(prev => ({
      ...prev,
      categories: prev.categories.map(cat => {
        let budgeted;
        if (savingsMap.includes(cat.id)) {
          budgeted = savingsBudget;
        } else if (needsMap.includes(cat.id)) {
          budgeted = needsBudget / needsMap.length;
        } else {
          budgeted = wantsBudget / wantsMap.length;
        }
        return {
          ...cat,
          budgeted: Math.round(budgeted),
          remaining: Math.round(budgeted - cat.spent),
        };
      }),
    }));
  }, [budgetData.income, setBudgetRule]);

  const updateCategoryBudget = (categoryId, newAmount) => {
    setBudgetData(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.id === categoryId
          ? { ...cat, budgeted: newAmount, remaining: newAmount - cat.spent }
          : cat
      ),
    }));
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'categories', label: 'Categories', icon: '📋' },
    { key: 'analysis', label: 'Analysis', icon: '📈' },
    { key: 'history', label: 'History', icon: '📅' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading budget data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <span className="text-4xl block mb-4">⚠️</span>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error Loading Budgets</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => setSelectedMonth(prev => prev)} // triggers re-fetch
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Budget Planner</h1>
            <p className="text-gray-500 mt-1">Plan, track, and optimize your spending</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm"
            />
            <button
              onClick={() => setShowSuggestions(true)}
              className="px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              🤖 AI Suggestions
            </button>
            <button
              onClick={() => setShowAddBudget(true)}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + Set Budget
            </button>
          </div>
        </div>

        {/* Tabs */}
        <AnimatedTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="pills" />

        {/* Budget Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard title="Monthly Income" value={budgetData.income} format="currency" color="#10B981" icon="💰" delay={0} />
              <StatCard title="Total Budgeted" value={totalBudgeted} format="currency" color="#667eea" icon="📊" delay={100} />
              <StatCard title="Total Spent" value={totalSpent} format="currency" color="#EF4444" icon="💳" delay={200} />
              <StatCard title="Remaining" value={totalRemaining} format="currency" color={totalRemaining >= 0 ? '#10B981' : '#EF4444'} icon="💰" delay={300} />
              <StatCard title="Savings Rate" value={savingsRate} format="percentage" color="#8B5CF6" icon="📈" delay={400} />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Budget Gauge */}
              <AnimatedCard>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Budget Usage</h3>
                <GaugeChart
                  value={totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0}
                  max={100}
                  size={220}
                  title="% of Budget Used"
                  thresholds={[
                    { value: 50, color: '#10B981', label: 'On Track' },
                    { value: 80, color: '#F59E0B', label: 'Caution' },
                    { value: 100, color: '#EF4444', label: 'Over Budget' },
                  ]}
                />
                <div className="mt-4 text-center">
                  <div className="text-sm text-gray-500">
                    {totalRemaining >= 0 ? (
                      <span className="text-green-500 font-medium">{formatCurrency(totalRemaining)} remaining</span>
                    ) : (
                      <span className="text-red-500 font-medium">{formatCurrency(Math.abs(totalRemaining))} over budget!</span>
                    )}
                  </div>
                </div>
              </AnimatedCard>

              {/* Category Breakdown Donut */}
              <AnimatedCard>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Spending by Category</h3>
                <EnhancedDoughnutChart
                  data={budgetData.categories.filter(c => c.spent > 0).map(c => c.spent)}
                  labels={budgetData.categories.filter(c => c.spent > 0).map(c => c.name)}
                  height={250}
                  cutout="65%"
                  centerValue={formatCurrency(totalSpent, 'INR', { compact: true })}
                  centerLabel="Total Spent"
                />
              </AnimatedCard>

              {/* Budget Alerts */}
              <AnimatedCard>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
                  Budget Alerts
                  {overBudgetCategories.length > 0 && (
                    <Badge variant="danger" dot pulse>{overBudgetCategories.length}</Badge>
                  )}
                </h3>
                <div className="space-y-3">
                  {overBudgetCategories.map((cat, i) => (
                    <div key={i} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-2 mb-1">
                        <span>{cat.icon}</span>
                        <span className="text-sm font-medium text-red-700 dark:text-red-300">{cat.name}</span>
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-400">
                        Over budget by {formatCurrency(cat.spent - cat.budgeted)}
                      </div>
                    </div>
                  ))}
                  {budgetData.categories
                    .filter(c => c.budgeted > 0 && c.spent / c.budgeted > 0.8 && c.spent <= c.budgeted)
                    .map((cat, i) => (
                      <div key={`warn-${i}`} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-center gap-2 mb-1">
                          <span>{cat.icon}</span>
                          <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">{cat.name}</span>
                        </div>
                        <div className="text-xs text-yellow-600 dark:text-yellow-400">
                          {((cat.spent / cat.budgeted) * 100).toFixed(0)}% used - {formatCurrency(cat.remaining)} remaining
                        </div>
                      </div>
                    ))
                  }
                  {overBudgetCategories.length === 0 && budgetData.categories.filter(c => c.budgeted > 0 && c.spent / c.budgeted > 0.8).length === 0 && (
                    <div className="py-8 text-center text-gray-400">
                      <span className="text-3xl block mb-2">✅</span>
                      <span className="text-sm">All budgets on track!</span>
                    </div>
                  )}
                </div>
              </AnimatedCard>
            </div>

            {/* Budget vs Actual */}
            <AnimatedCard>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Budget vs Actual Spending</h3>
              <EnhancedBarChart
                labels={budgetData.categories.map(c => c.name.split(' ')[0])}
                datasets={[
                  { label: 'Budgeted', data: budgetData.categories.map(c => c.budgeted) },
                  { label: 'Spent', data: budgetData.categories.map(c => c.spent) },
                ]}
                height={300}
                currency
                colors={['#667eea', '#f5576c']}
              />
            </AnimatedCard>
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="space-y-4 animate-fadeIn">
            {budgetData.categories.map((cat, i) => (
              <AnimatedCard key={cat.id} delay={i * 50}>
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{cat.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 dark:text-white">{cat.name}</span>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {formatCurrency(cat.spent)}
                          </span>
                          <span className="text-xs text-gray-400 ml-1">
                            / {formatCurrency(cat.budgeted)}
                          </span>
                        </div>
                        <Badge
                          variant={cat.spent > cat.budgeted ? 'danger' : cat.spent / cat.budgeted > 0.8 ? 'warning' : 'success'}
                          size="xs"
                        >
                          {cat.budgeted > 0 ? `${((cat.spent / cat.budgeted) * 100).toFixed(0)}%` : 'No budget'}
                        </Badge>
                      </div>
                    </div>
                    <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(cat.budgeted > 0 ? (cat.spent / cat.budgeted) * 100 : 0, 100)}%`,
                          backgroundColor: cat.spent > cat.budgeted ? '#EF4444' : cat.color,
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      <span>{cat.remaining >= 0 ? `${formatCurrency(cat.remaining)} left` : `${formatCurrency(Math.abs(cat.remaining))} over`}</span>
                      <span>Recommended: {cat.recommended}% = {formatCurrency((cat.recommended / 100) * budgetData.income)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <input
                      type="number"
                      value={cat.budgeted}
                      onChange={(e) => updateCategoryBudget(cat.id, Number(e.target.value))}
                      className="w-24 px-2 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-right"
                    />
                  </div>
                </div>
              </AnimatedCard>
            ))}

            <AnimatedCard className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-500">Total Budgeted</span>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalBudgeted)}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Unallocated</span>
                  <div className={`text-xl font-bold ${budgetData.income - totalBudgeted >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(budgetData.income - totalBudgeted)}
                  </div>
                </div>
                <button
                  onClick={() => {/* Save budgets */}}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  Save Budget
                </button>
              </div>
            </AnimatedCard>
          </div>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnimatedCard>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">50/30/20 Rule Analysis</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Needs (50%)', actual: ruleAnalysis.needs, target: 50, color: '#667eea' },
                    { label: 'Wants (30%)', actual: ruleAnalysis.wants, target: 30, color: '#f5576c' },
                    { label: 'Savings (20%)', actual: ruleAnalysis.savings, target: 20, color: '#10B981' },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.actual}%</span>
                          <Badge variant={Math.abs(item.actual - item.target) <= 5 ? 'success' : 'warning'} size="xs">
                            Target: {item.target}%
                          </Badge>
                        </div>
                      </div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${item.actual}%`, backgroundColor: item.color }}
                        />
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-gray-900 dark:bg-white"
                          style={{ left: `${item.target}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </AnimatedCard>

              <AnimatedCard>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Spending Efficiency</h3>
                <div className="flex items-center justify-center py-4">
                  <GaugeChart
                    value={efficiencyData.score}
                    max={100}
                    size={200}
                    title="Efficiency Score"
                    thresholds={[
                      { value: 40, color: '#EF4444' },
                      { value: 70, color: '#F59E0B' },
                      { value: 100, color: '#10B981' },
                    ]}
                  />
                </div>
                <div className="space-y-2 mt-4">
                  {efficiencyData.best && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Most efficient category</span>
                      <span className="font-medium text-green-600">
                        {efficiencyData.best.icon} {efficiencyData.best.name} ({efficiencyData.best.budgeted > 0 ? Math.round((efficiencyData.best.spent / efficiencyData.best.budgeted) * 100) : 0}%)
                      </span>
                    </div>
                  )}
                  {efficiencyData.worst && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Needs improvement</span>
                      <span className="font-medium text-red-600">
                        {efficiencyData.worst.icon} {efficiencyData.worst.name} ({efficiencyData.worst.budgeted > 0 ? Math.round((efficiencyData.worst.spent / efficiencyData.worst.budgeted) * 100) : 0}%)
                      </span>
                    </div>
                  )}
                  {!efficiencyData.best && !efficiencyData.worst && (
                    <div className="text-center text-sm text-gray-400 py-2">
                      No budget data to analyze yet
                    </div>
                  )}
                </div>
              </AnimatedCard>
            </div>

            <AnimatedCard>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Budget Adherence</h3>
              {budgetData.history.length > 0 ? (
                <EnhancedLineChart
                  labels={[...budgetData.history].reverse().map(h => h.month.split(' ')[0])}
                  datasets={[
                    { label: 'Budget', data: [...budgetData.history].reverse().map(h => h.budgeted) },
                    { label: 'Actual', data: [...budgetData.history].reverse().map(h => h.spent) },
                  ]}
                  height={280}
                  currency
                  colors={['#667eea', '#f5576c']}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <div className="text-center">
                    <span className="text-3xl block mb-2">📊</span>
                    <span className="text-sm">No historical data available yet</span>
                  </div>
                </div>
              )}
            </AnimatedCard>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-fadeIn">
            <AnimatedCard>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Budget Performance History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="py-3 px-4 text-left text-gray-500 font-medium">Month</th>
                      <th className="py-3 px-4 text-right text-gray-500 font-medium">Budgeted</th>
                      <th className="py-3 px-4 text-right text-gray-500 font-medium">Spent</th>
                      <th className="py-3 px-4 text-right text-gray-500 font-medium">Savings</th>
                      <th className="py-3 px-4 text-center text-gray-500 font-medium">Status</th>
                      <th className="py-3 px-4 text-center text-gray-500 font-medium">Adherence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetData.history.length > 0 ? budgetData.history.map((row, i) => {
                      const savings = row.budgeted - row.spent;
                      const adherence = row.budgeted > 0 ? (row.spent / row.budgeted) * 100 : 0;
                      return (
                        <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{row.month}</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(row.budgeted)}</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(row.spent)}</td>
                          <td className={`py-3 px-4 text-right font-medium ${savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {savings >= 0 ? '+' : ''}{formatCurrency(savings)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={savings >= 0 ? 'success' : 'danger'} size="xs">
                              {savings >= 0 ? 'Under' : 'Over'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(adherence, 100)}%`,
                                    backgroundColor: adherence <= 90 ? '#10B981' : adherence <= 100 ? '#F59E0B' : '#EF4444',
                                  }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{adherence.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-400">
                          <span className="text-3xl block mb-2">📅</span>
                          <span className="text-sm">No budget history available yet</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </AnimatedCard>
          </div>
        )}
      </div>

      {/* AI Budget Suggestions Modal */}
      <Modal isOpen={showSuggestions} onClose={() => setShowSuggestions(false)} title="🤖 AI Budget Suggestions" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Based on your spending patterns, here are recommended budget allocations:
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(BUDGET_RULES).filter(([k]) => k !== 'custom').map(([key, rule]) => (
              <button
                key={key}
                onClick={() => { applySuggestion(key); setShowSuggestions(false); }}
                className={`p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
                  budgetRule === key
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                }`}
              >
                <div className="font-semibold text-gray-900 dark:text-white mb-2">{rule.name}</div>
                <div className="space-y-1 text-xs text-gray-500">
                  <div>Needs: {rule.needs}% = {formatCurrency((rule.needs / 100) * budgetData.income)}</div>
                  <div>Wants: {rule.wants}% = {formatCurrency((rule.wants / 100) * budgetData.income)}</div>
                  <div>Savings: {rule.savings}% = {formatCurrency((rule.savings / 100) * budgetData.income)}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
            <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">💡 Tips</h4>
            <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
              {overBudgetCategories.length > 0 && (
                <li>• You are over budget in {overBudgetCategories.length} {overBudgetCategories.length === 1 ? 'category' : 'categories'} — review spending in {overBudgetCategories.map(c => c.name).join(', ')}</li>
              )}
              <li>• Your savings rate of {savingsRate.toFixed(0)}% is {savingsRate >= 20 ? 'above' : 'below'} the recommended 20%</li>
              {ruleAnalysis.needs > 55 && (
                <li>• Your needs spending ({ruleAnalysis.needs}%) exceeds the recommended 50% — look for ways to reduce fixed costs</li>
              )}
              {ruleAnalysis.wants > 35 && (
                <li>• Your wants spending ({ruleAnalysis.wants}%) exceeds the recommended 30% — consider cutting discretionary expenses</li>
              )}
              {budgetData.income === 0 && (
                <li>• No income data found — add transactions to see accurate budget analysis</li>
              )}
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
}
