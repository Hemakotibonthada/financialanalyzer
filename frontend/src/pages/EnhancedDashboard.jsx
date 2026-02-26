// ============================================================
// Financial Analyzer - Enhanced Dashboard Page
// Feature #81: Comprehensive Dashboard with animated widgets
// ============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

// UI Components
import { AnimatedCard, StatCard, Badge, SearchInput, DateRangePicker, CommandPalette, AnimatedTabs, DropdownMenu, Modal } from '../components/ui/ComponentLibrary';
import { EnhancedLineChart, EnhancedBarChart, EnhancedDoughnutChart, Sparkline, GaugeChart } from '../components/ui/ChartComponents';
import { FinancialHealthWidget, ExpenseBreakdownWidget, IncomeExpenseWidget, GoalTrackerWidget, BillReminderWidget, InvestmentOverviewWidget, QuickActionsWidget, RecentTransactionsWidget, SubscriptionTrackerWidget, NetWorthWidget, EMICalculatorWidget, CurrencyConverterWidget, ActivityFeedWidget } from '../components/ui/DashboardWidgets';

// Hooks
import { useFetch, useLocalStorage, useKeyboardShortcut, useBreakpoint } from '../hooks/useCustomHooks';
import { formatCurrency, getGreeting, getFinancialQuote } from '../utils/helpers';

// Import animations
import '../styles/animations.css';

export default function EnhancedDashboard() {
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const { isMobile, isTablet } = useBreakpoint();
  
  // State
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [dashboardLayout, setDashboardLayout] = useLocalStorage('dashboard_layout', 'default');
  const [pinnedWidgets, setPinnedWidgets] = useLocalStorage('pinned_widgets', ['health', 'expenses', 'goals']);

  // Dashboard data
  const [dashboardData, setDashboardData] = useState({
    summary: { totalIncome: 0, totalExpense: 0, savings: 0, netWorth: 0, creditScore: 0 },
    transactions: [],
    expenses: [],
    incomeExpenseHistory: [],
    goals: [],
    bills: [],
    investments: [],
    subscriptions: [],
    activities: [],
    netWorthHistory: [],
    monthlyTrend: [],
    healthScore: 72,
    healthMetrics: [],
  });

  // Keyboard shortcuts
  useKeyboardShortcut('ctrl+k', () => setShowCommandPalette(true));
  useKeyboardShortcut('ctrl+n', () => setShowAddTransaction(true));
  useKeyboardShortcut('ctrl+/', () => setShowCommandPalette(true));

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [
          summaryRes,
          transactionsRes,
          goalsRes,
          billsRes,
          dashboardRes,
        ] = await Promise.allSettled([
          api.get('/financial/summary'),
          api.get('/transactions?limit=10&sort=-date'),
          api.get('/goals'),
          api.get('/bill-reminders'),
          api.get('/analytics/dashboard'),
        ]);

        const dashData = dashboardRes.status === 'fulfilled' ? dashboardRes.value.data || {} : {};

        setDashboardData(prev => ({
          ...prev,
          summary: summaryRes.status === 'fulfilled' ? summaryRes.value.data : prev.summary,
          transactions: transactionsRes.status === 'fulfilled' ? (transactionsRes.value.data?.transactions || transactionsRes.value.data || []) : [],
          goals: goalsRes.status === 'fulfilled' ? (goalsRes.value.data?.goals || goalsRes.value.data || []) : [],
          bills: billsRes.status === 'fulfilled' ? (billsRes.value.data?.bills || billsRes.value.data || []) : [],
          expenses: dashData.expenses || [],
          incomeExpenseHistory: dashData.incomeExpenseHistory || [],
          investments: dashData.investments || [],
          subscriptions: dashData.subscriptions || [],
          activities: dashData.activities || [],
          netWorthHistory: dashData.netWorthHistory || [],
          monthlyTrend: dashData.monthlyTrend || [],
          healthScore: dashData.healthScore || 0,
          healthMetrics: dashData.healthMetrics || [],
        }));
      } catch (error) {
        console.error('Dashboard data fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [dateRange]);

  // Command palette commands
  const commands = useMemo(() => [
    { icon: '➕', label: 'Add Transaction', category: 'Actions', shortcut: 'Ctrl+N', action: () => setShowAddTransaction(true) },
    { icon: '📊', label: 'View Reports', category: 'Navigation', action: () => navigate('/reports') },
    { icon: '🎯', label: 'Financial Goals', category: 'Navigation', action: () => navigate('/goals') },
    { icon: '💰', label: 'Budget Planner', category: 'Navigation', action: () => navigate('/budget-planner') },
    { icon: '📈', label: 'Investments', category: 'Navigation', action: () => navigate('/investments') },
    { icon: '📋', label: 'Bill Reminders', category: 'Navigation', action: () => navigate('/bill-reminders') },
    { icon: '🏦', label: 'Net Worth', category: 'Navigation', action: () => navigate('/net-worth') },
    { icon: '📱', label: 'EMI Tracker', category: 'Navigation', action: () => navigate('/emi-tracker') },
    { icon: '🔍', label: 'Advanced Analytics', category: 'Navigation', action: () => navigate('/analytics') },
    { icon: '📤', label: 'Export Data', category: 'Actions', action: () => navigate('/export-center') },
    { icon: '⚙️', label: 'Settings', category: 'Actions', action: () => navigate('/settings') },
    { icon: '🌙', label: 'Toggle Dark Mode', category: 'Actions', action: () => {} },
    { icon: '🔔', label: 'Notifications', category: 'Actions', action: () => navigate('/notifications') },
    { icon: '❓', label: 'Help Center', category: 'Support', action: () => navigate('/help') },
  ], [navigate]);

  const tabs = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'analytics', label: 'Analytics', icon: '📈' },
    { key: 'goals', label: 'Goals', icon: '🎯' },
    { key: 'tools', label: 'Tools', icon: '🛠️' },
  ];

  const { summary, transactions, expenses, incomeExpenseHistory, goals, bills, investments, subscriptions, activities, netWorthHistory, monthlyTrend, healthScore, healthMetrics } = dashboardData;

  const quickActions = [
    { icon: '➕', label: 'Add Expense', color: '#EF4444', action: () => setShowAddTransaction(true) },
    { icon: '💰', label: 'Add Income', color: '#10B981', action: () => setShowAddTransaction(true) },
    { icon: '📊', label: 'Reports', color: '#667eea', action: () => navigate('/reports') },
    { icon: '🎯', label: 'New Goal', color: '#F59E0B', action: () => navigate('/goals') },
    { icon: '📤', label: 'Export', color: '#8B5CF6', action: () => navigate('/export-center') },
    { icon: '🔔', label: 'Reminders', color: '#EC4899', action: () => navigate('/bill-reminders') },
    { icon: '📱', label: 'EMI Calc', color: '#14B8A6', action: () => navigate('/emi-tracker') },
    { icon: '💱', label: 'Currency', color: '#6366F1', action: () => {} },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Command Palette */}
      <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} commands={commands} />

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white animate-fadeIn">
                {getGreeting()}, {user?.name?.split(' ')[0] || 'User'} 👋
              </h1>
              <p className="text-sm text-gray-500 mt-1 italic">"{getFinancialQuote()}"</p>
            </div>
            <div className="flex items-center gap-3">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search or press Ctrl+K..."
                className="w-64 hidden md:block"
              />
              <DateRangePicker value={dateRange} onChange={setDateRange} className="hidden lg:block" />
              <DropdownMenu
                trigger={
                  <button className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">⚙️</button>
                }
                items={[
                  { icon: '📐', label: 'Default Layout', onClick: () => setDashboardLayout('default') },
                  { icon: '📱', label: 'Compact Layout', onClick: () => setDashboardLayout('compact') },
                  { icon: '🖥️', label: 'Wide Layout', onClick: () => setDashboardLayout('wide') },
                  { divider: true },
                  { icon: '📤', label: 'Export Dashboard', onClick: () => {} },
                  { icon: '🔄', label: 'Refresh Data', onClick: () => window.location.reload() },
                ]}
              />
            </div>
          </div>

          {/* Tabs */}
          <AnimatedTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="pills" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Income"
                value={summary.totalIncome || 0}
                format="currency"
                color="#10B981"
                icon="💰"
                trend={{ isPositive: true, percentage: summary.incomeGrowth || 0 }}
                delay={0}
              />
              <StatCard
                title="Total Expenses"
                value={summary.totalExpense || 0}
                format="currency"
                color="#EF4444"
                icon="💳"
                trend={{ isPositive: false, percentage: summary.expenseGrowth || 0 }}
                delay={100}
              />
              <StatCard
                title="Net Savings"
                value={(summary.totalIncome || 0) - (summary.totalExpense || 0)}
                format="currency"
                color="#667eea"
                icon="🏦"
                trend={{ isPositive: true, percentage: summary.savingsGrowth || 0 }}
                delay={200}
              />
              <StatCard
                title="Net Worth"
                value={summary.netWorth || 0}
                format="currency"
                compact
                color="#8B5CF6"
                icon="📈"
                trend={{ isPositive: true, percentage: summary.netWorthGrowth || 0 }}
                delay={300}
              />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - 2/3 */}
              <div className="lg:col-span-2 space-y-6">
                <IncomeExpenseWidget data={incomeExpenseHistory} loading={loading} />
                <ExpenseBreakdownWidget expenses={expenses} totalBudget={100000} loading={loading} />
              </div>

              {/* Right Column - 1/3 */}
              <div className="space-y-6">
                <FinancialHealthWidget score={healthScore} metrics={healthMetrics} trend={{ change: 3.5, data: monthlyTrend }} loading={loading} />
                <QuickActionsWidget actions={quickActions} columns={4} />
              </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <RecentTransactionsWidget transactions={transactions} loading={loading} onViewAll={() => navigate('/analyzer')} />
              <GoalTrackerWidget goals={goals} loading={loading} />
              <BillReminderWidget bills={bills} loading={loading} />
            </div>

            {/* Third Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <NetWorthWidget
                assets={summary.totalAssets || 0}
                liabilities={summary.totalLiabilities || 0}
                history={netWorthHistory}
                loading={loading}
              />
              <InvestmentOverviewWidget investments={investments} loading={loading} />
              <SubscriptionTrackerWidget subscriptions={subscriptions} loading={loading} />
            </div>

            {/* Activity Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ActivityFeedWidget activities={activities} loading={loading} />
              <CurrencyConverterWidget />
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnimatedCard>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Spending Trend</h3>
                <EnhancedLineChart
                  data={[45000, 52000, 48000, 61000, 55000, 58000, 52000, 49000, 63000, 57000, 54000, 78500]}
                  labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']}
                  height={280}
                  currency
                  smooth
                  filled
                />
              </AnimatedCard>
              <AnimatedCard>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Category Comparison</h3>
                <EnhancedBarChart
                  labels={['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Entertainment']}
                  datasets={[
                    { label: 'This Month', data: [12000, 8500, 15000, 18000, 5000, 8500] },
                    { label: 'Last Month', data: [10000, 9500, 12000, 18000, 3000, 7000] },
                  ]}
                  height={280}
                  currency
                />
              </AnimatedCard>
            </div>
            <AnimatedCard>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Savings Rate Over Time</h3>
              <EnhancedLineChart
                data={[15, 22, 18, 28, 25, 32, 30, 35, 28, 33, 37, 35]}
                labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']}
                height={250}
                percentage
              />
            </AnimatedCard>
          </div>
        )}

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div className="space-y-6 animate-fadeIn">
            <GoalTrackerWidget goals={goals} loading={loading} />
          </div>
        )}

        {/* Tools Tab */}
        {activeTab === 'tools' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
            <EMICalculatorWidget />
            <CurrencyConverterWidget />
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      <Modal isOpen={showAddTransaction} onClose={() => setShowAddTransaction(false)} title="Add Transaction" size="md">
        <AddTransactionForm onClose={() => setShowAddTransaction(false)} />
      </Modal>
    </div>
  );
}

// ======================== ADD TRANSACTION FORM ========================
function AddTransactionForm({ onClose }) {
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'upi',
  });
  const [saving, setSaving] = useState(false);

  const categories = {
    expense: ['Food', 'Transport', 'Shopping', 'Entertainment', 'Utilities', 'Healthcare', 'Education', 'Rent', 'Insurance', 'Other'],
    income: ['Salary', 'Freelance', 'Investment', 'Business', 'Rental', 'Other'],
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/transactions', {
        ...formData,
        amount: Number(formData.amount),
      });
      onClose();
    } catch (error) {
      console.error('Failed to add transaction:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type Toggle */}
      <div className="flex gap-2">
        {['expense', 'income'].map(type => (
          <button
            key={type}
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, type, category: '' }))}
            className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${
              formData.type === type
                ? type === 'expense'
                  ? 'bg-red-500 text-white shadow-lg'
                  : 'bg-green-500 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            {type === 'expense' ? '💳 Expense' : '💰 Income'}
          </button>
        ))}
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
          <input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            placeholder="0.00"
            className="w-full pl-8 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-lg font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
        <div className="grid grid-cols-3 gap-2">
          {categories[formData.type].map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, category: cat }))}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                formData.category === cat
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-300'
                  : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="e.g., Grocery shopping at DMart"
          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {/* Date & Payment Method */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment</label>
          <select
            value={formData.paymentMethod}
            onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="upi">UPI</option>
            <option value="cash">Cash</option>
            <option value="credit_card">Credit Card</option>
            <option value="debit_card">Debit Card</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !formData.amount || !formData.category}
          className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Transaction'}
        </button>
      </div>
    </form>
  );
}

// ======================== MOCK DATA GENERATORS (REMOVED) ========================
