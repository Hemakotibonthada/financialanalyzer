import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  Wallet,
  LineChart,
  Scale,
  Target,
  BarChart3,
  Brain,
  Mail,
  Settings,
  ArrowRight,
} from 'lucide-react';
import MainLayout from '../components/MainLayout';

/**
 * FeatureExplorer
 * ---------------
 * A single, minimal, searchable launcher for every feature in the app.
 * The sidebar only surfaces a curated subset of the ~150 routes; this page
 * lets users find and open any feature from one place.
 *
 * Data is intentionally self-contained (no sidebar coupling) so this page
 * stays simple and cannot break existing navigation.
 */

const CATEGORIES = [
  {
    id: 'core',
    label: 'Core & Dashboards',
    icon: LayoutDashboard,
    accent: 'from-blue-500 to-indigo-500',
    items: [
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Enhanced Dashboard', path: '/enhanced-dashboard' },
      { label: 'Dashboard V2', path: '/dashboard-v2' },
      { label: 'Dashboard V3', path: '/dashboard-v3', badge: 'V3' },
      { label: 'Analyzer', path: '/analyze' },
      { label: 'Financial Health', path: '/financial-health' },
      { label: 'Financial Health V2', path: '/financial-health-v2' },
      { label: 'Financial Health V3', path: '/financial-health-v3', badge: 'V3' },
      { label: 'Profile', path: '/profile' },
    ],
  },
  {
    id: 'money',
    label: 'Money & Spending',
    icon: Wallet,
    accent: 'from-green-500 to-emerald-500',
    items: [
      { label: 'Transactions', path: '/transactions' },
      { label: 'Transactions V2', path: '/transactions-v2' },
      { label: 'Transactions V3', path: '/transactions-v3', badge: 'V3' },
      { label: 'Bank Accounts', path: '/bank-accounts' },
      { label: 'Credit Cards', path: '/credit-cards' },
      { label: 'Net Banking', path: '/net-banking' },
      { label: 'Budget Planner', path: '/budget-planner' },
      { label: 'Budget Planner V2', path: '/budget-planner-v2' },
      { label: 'Smart Budget Wizard', path: '/budget-wizard' },
      { label: 'Budget Intelligence', path: '/budget-intelligence', badge: 'V3' },
      { label: 'Income Tracker', path: '/income-tracker' },
      { label: 'Cash Flow', path: '/cash-flow' },
      { label: 'Cashflow Forecaster', path: '/cashflow-forecaster', badge: 'V3' },
      { label: 'Bills & Recurring', path: '/recurring-payments' },
      { label: 'Bill Tracker', path: '/bill-tracker' },
      { label: 'Bill Reminders', path: '/bill-reminders' },
      { label: 'Subscriptions', path: '/subscriptions' },
      { label: 'Split Expenses', path: '/split-expenses' },
      { label: 'Receipt Scanner', path: '/receipt-scanner' },
      { label: 'Currency Converter', path: '/currency-converter' },
      { label: 'Company Expenses', path: '/company-expenses', badge: 'PRO' },
    ],
  },
  {
    id: 'invest',
    label: 'Invest & Wealth',
    icon: LineChart,
    accent: 'from-indigo-500 to-violet-500',
    items: [
      { label: 'Investment Portfolio', path: '/investments' },
      { label: 'Investment Portfolio V2', path: '/investment-portfolio-v2' },
      { label: 'Investment Analyzer', path: '/investment-analyzer' },
      { label: 'Portfolio Analytics', path: '/portfolio-analytics' },
      { label: 'Investment Advisor', path: '/investment-advisor', badge: 'V3' },
      { label: 'Funds & Investments', path: '/funds-investments' },
      { label: 'Mutual Funds', path: '/mutual-funds' },
      { label: 'Fixed Deposits', path: '/fixed-deposits' },
      { label: 'Gold', path: '/gold' },
      { label: 'Crypto', path: '/crypto' },
      { label: 'Net Worth', path: '/networth' },
      { label: 'Net Worth (Enhanced)', path: '/networth-enhanced' },
      { label: 'Property', path: '/property' },
      { label: 'Real Estate', path: '/real-estate' },
      { label: 'Retirement', path: '/retirement' },
      { label: 'Retirement Planner', path: '/retirement-planner' },
      { label: 'PPF', path: '/ppf' },
      { label: 'EPF', path: '/epf' },
      { label: 'NPS', path: '/nps' },
      { label: 'SIP Calculator', path: '/sip-calculator' },
      { label: 'Market Insights', path: '/market-insights' },
      { label: 'Watchlist', path: '/watchlist' },
      { label: 'Wealth Management', path: '/wealth-management' },
      { label: 'Smart Advisor', path: '/smart-advisor', badge: 'AI' },
      { label: 'FIRE Tracker', path: '/fire-tracker' },
    ],
  },
  {
    id: 'debt',
    label: 'Debt & EMI',
    icon: Scale,
    accent: 'from-rose-500 to-red-500',
    items: [
      { label: 'EMI Tracker', path: '/emi-tracker' },
      { label: 'Debt Spiral Monitor', path: '/debt-spiral', badge: 'NEW' },
      { label: 'Personal Borrowings', path: '/personal-borrowings' },
      { label: 'Debt Management', path: '/debt-management' },
      { label: 'Debt Management V2', path: '/debt-management-v2' },
      { label: 'Debt Management V3', path: '/debt-management-v3', badge: 'V3' },
      { label: 'Debt Payoff', path: '/debt-payoff' },
      { label: 'Loan Calculator', path: '/loan-calculator' },
      { label: 'Emergency Fund', path: '/emergency-fund' },
    ],
  },
  {
    id: 'plan',
    label: 'Plan, Goals & Tax',
    icon: Target,
    accent: 'from-amber-500 to-orange-500',
    items: [
      { label: 'Financial Goals', path: '/goals' },
      { label: 'Financial Goals V2', path: '/goals-v2' },
      { label: 'Goals Tracker V3', path: '/goals-v3', badge: 'V3' },
      { label: 'Goal Timeline', path: '/goal-timeline' },
      { label: 'Goal Forecaster', path: '/goal-forecaster', badge: 'AI' },
      { label: 'Savings Challenges', path: '/savings-challenges' },
      { label: 'Milestones', path: '/milestones' },
      { label: 'Tax Planner', path: '/tax-planner' },
      { label: 'Tax Planner V2', path: '/tax-planner-v2' },
      { label: 'Tax Estimator', path: '/tax-estimator' },
      { label: 'Tax Optimization', path: '/tax-optimization' },
      { label: 'Insurance', path: '/insurance' },
      { label: 'Insurance Planner', path: '/insurance-planner' },
      { label: 'Financial Calendar', path: '/financial-calendar' },
      { label: 'Templates', path: '/templates' },
      { label: 'Bill of Materials', path: '/bill-of-materials' },
      { label: 'Planning V2', path: '/planning-v2' },
    ],
  },
  {
    id: 'insights',
    label: 'Insights & Reports',
    icon: BarChart3,
    accent: 'from-cyan-500 to-blue-500',
    items: [
      { label: 'Reports', path: '/reports' },
      { label: 'Reports Hub', path: '/reports-hub' },
      { label: 'Reports V2', path: '/reports-v2' },
      { label: 'Reports V3', path: '/reports-v3', badge: 'V3' },
      { label: 'Advanced Analytics', path: '/advanced-analytics' },
      { label: 'Analytics V3', path: '/analytics-v3', badge: 'V3' },
      { label: 'Data Visualization Lab', path: '/data-lab' },
      { label: 'Export Center', path: '/export-center' },
      { label: 'Comparison Tool', path: '/comparison' },
      { label: 'Financial Scorecard', path: '/scorecard' },
      { label: 'Credit Score Detail', path: '/credit-score-detail' },
      { label: 'Risk Dashboard', path: '/risk-dashboard' },
      { label: 'Risk Assessment', path: '/risk-assessment', badge: 'AI' },
      { label: 'Spending Insights', path: '/spending-insights' },
      { label: 'Spending Insights V2', path: '/spending-insights-v2' },
      { label: 'Spending Forecast', path: '/spending-forecast', badge: 'AI' },
      { label: 'Merchant Intelligence', path: '/merchant-intelligence', badge: 'AI' },
      { label: 'Lifestyle Analytics', path: '/lifestyle-analytics', badge: 'AI' },
      { label: 'Sentiment', path: '/sentiment', badge: 'AI' },
      { label: 'Income Forecast', path: '/income-forecast', badge: 'AI' },
      { label: 'Anomaly Detector', path: '/anomaly-detector', badge: 'AI' },
      { label: 'Expense Intelligence', path: '/expense-intelligence' },
      { label: 'Deep Insights', path: '/financial-insights-dashboard' },
    ],
  },
  {
    id: 'ai',
    label: 'AI Lab',
    icon: Brain,
    accent: 'from-violet-500 to-fuchsia-500',
    items: [
      { label: 'AI Insights', path: '/ai-insights', badge: 'AI' },
      { label: 'AI Intelligence Hub', path: '/ai-hub', badge: 'AI' },
      { label: 'AI Command Center', path: '/ai-command-center', badge: 'AI' },
      { label: 'AI Command Center V3', path: '/ai-command-center-v3', badge: 'AI' },
      { label: 'Financial Chat', path: '/financial-chat' },
      { label: 'Financial Chat V2', path: '/financial-chat-v2' },
      { label: 'AI Chatbot', path: '/ai-chatbot', badge: 'AI' },
      { label: 'Enterprise AI Chat', path: '/ai-chat-v3', badge: 'V3' },
      { label: 'ML Dashboard', path: '/ml-dashboard', badge: 'ML' },
      { label: 'AI Training', path: '/ai-training', badge: 'ML' },
      { label: 'Self Training', path: '/self-training', badge: 'ML' },
      { label: 'Smart Budget Optimizer', path: '/smart-budget-optimizer', badge: 'AI' },
      { label: 'RL Optimizer', path: '/rl-optimizer', badge: 'AI' },
      { label: 'Model Observatory', path: '/ai-observatory', badge: 'AI' },
      { label: 'Advanced Anomaly Lab', path: '/advanced-anomaly-detector', badge: 'AI' },
      { label: 'Smart Financial Planner', path: '/smart-financial-planner', badge: 'AI' },
      { label: 'Spending Intelligence', path: '/spending-intelligence', badge: 'AI' },
      { label: 'Portfolio Optimizer', path: '/portfolio-optimizer', badge: 'AI' },
      { label: 'Credit Score Predictor', path: '/credit-score-predictor', badge: 'AI' },
      { label: 'Cash Flow Intelligence', path: '/cashflow-intelligence', badge: 'AI' },
      { label: 'Subscription Manager AI', path: '/subscription-manager', badge: 'AI' },
      { label: 'Goal & Tax Optimizer', path: '/goal-tax-optimizer', badge: 'AI' },
      { label: 'Financial Wellness AI', path: '/financial-wellness-ai', badge: 'AI' },
      { label: 'Financial Wellness', path: '/financial-wellness' },
    ],
  },
  {
    id: 'gmail',
    label: 'Gmail',
    icon: Mail,
    accent: 'from-red-500 to-pink-500',
    items: [
      { label: 'Gmail Inbox', path: '/gmail-inbox' },
      { label: 'Gmail Analytics', path: '/gmail-analytics', badge: 'AI' },
      { label: 'Gmail Browser', path: '/gmail-browser' },
    ],
  },
  {
    id: 'tools',
    label: 'Tools & Settings',
    icon: Settings,
    accent: 'from-slate-500 to-gray-600',
    items: [
      { label: 'Financial Documents', path: '/financial-documents' },
      { label: 'Documents', path: '/documents' },
      { label: 'Automation Rules', path: '/automation' },
      { label: 'Family Finance', path: '/family-finance' },
      { label: 'Learning Center', path: '/education' },
      { label: 'Financial Quiz', path: '/quiz' },
      { label: 'Achievements', path: '/achievements' },
      { label: 'Search', path: '/search' },
      { label: 'Advanced Search', path: '/advanced-search' },
      { label: 'Import / Export', path: '/import-export' },
      { label: 'Cloud Backup', path: '/cloud-backup', badge: 'GCP' },
      { label: 'System Dashboard', path: '/system-dashboard' },
      { label: 'Security Center', path: '/security' },
      { label: 'Appearance', path: '/appearance' },
      { label: 'Smart Notifications', path: '/smart-notifications' },
      { label: 'Settings', path: '/settings' },
      { label: 'Help Center', path: '/help' },
      { label: 'Contact Support', path: '/contact' },
    ],
  },
];

const TOTAL_FEATURES = CATEGORIES.reduce((sum, c) => sum + c.items.length, 0);

const badgeStyle = (badge) => {
  switch (badge) {
    case 'AI':
      return 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300';
    case 'ML':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';
    case 'V3':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    case 'PRO':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    case 'GCP':
      return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
  }
};

const FeatureExplorer = () => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (it) =>
          it.label.toLowerCase().includes(q) || it.path.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [query]);

  const matchCount = filtered.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <MainLayout
      title="All Features"
      subtitle={`Find and open any of the ${TOTAL_FEATURES} features in one place`}
    >
      <div className="max-w-6xl mx-auto">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search features… (e.g. budget, EMI, tax, crypto)"
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          {query.trim() && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {matchCount} result{matchCount === 1 ? '' : 's'} for “{query.trim()}”
            </p>
          )}
        </div>

        {/* Categories */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            No features match “{query.trim()}”.
          </div>
        ) : (
          <div className="space-y-8">
            {filtered.map((cat) => {
              const Icon = cat.icon;
              return (
                <section key={cat.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className={`p-1.5 rounded-lg bg-gradient-to-br ${cat.accent} text-white`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {cat.label}
                    </h2>
                    <span className="text-xs text-gray-400">({cat.items.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {cat.items.map((it) => (
                      <Link
                        key={it.path}
                        to={it.path}
                        className="group flex items-center justify-between gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-400 hover:shadow-md transition-all"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-gray-800 dark:text-gray-100 truncate">
                            {it.label}
                          </span>
                          {it.badge && (
                            <span
                              className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${badgeStyle(
                                it.badge
                              )}`}
                            >
                              {it.badge}
                            </span>
                          )}
                        </span>
                        <ArrowRight className="shrink-0 w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default FeatureExplorer;
