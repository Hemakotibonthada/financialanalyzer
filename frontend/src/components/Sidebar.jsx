import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Search,
  Upload,
  CreditCard,
  PieChart,
  Target,
  Wallet,
  DollarSign,
  Sparkles,
  Shield,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Menu,
  X,
  Bell,
  Brain,
  Calculator,
  Building2,
  Briefcase,
  TrendingUp,
  FileText,
  Activity,
  TrendingDown,
  Receipt,
  ArrowLeftRight,
  Landmark,
  Banknote,
  PiggyBank,
  CalendarDays,
  Repeat,
  ScanLine,
  LineChart,
  Coins,
  Bitcoin,
  GanttChart,
  Globe,
  Award,
  BookOpen,
  HelpCircle,
  MessageSquare,
  Settings,
  Palette,
  Lock,
  Users,
  Zap,
  LayoutDashboard,
  ClipboardList,
  Gem,
  FileBarChart,
  Scale,
  Umbrella,
  Clock,
  Flame,
  Trophy,
  Boxes,
  ScrollText,
  Bot,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    transactions: false,
    budgeting: false,
    investments: false,
    wealth: false,
    tax: false,
    retirement: false,
    debt: false,
    goals: false,
    reports: false,
    ai: false,
    education: false,
    tools: false,
    social: false,
    settings: false,
    advanced: false,
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const navigationSections = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      items: [
        { label: 'Dashboard', icon: Home, path: '/dashboard', color: 'blue' },
        { label: 'Dashboard V2', icon: LayoutDashboard, path: '/dashboard-v2', color: 'indigo', badge: 'NEW' },
        { label: 'Financial Health', icon: Activity, path: '/financial-health', color: 'teal' },
        { label: 'Scorecard', icon: FileBarChart, path: '/scorecard', color: 'emerald' },
      ]
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: ArrowLeftRight,
      items: [
        { label: 'Transactions', icon: ArrowLeftRight, path: '/transactions', color: 'blue' },
        { label: 'Bank Accounts', icon: Landmark, path: '/bank-accounts', color: 'green' },
        { label: 'Credit Cards', icon: CreditCard, path: '/credit-cards', color: 'purple' },
        { label: 'Net Banking', icon: Globe, path: '/net-banking', color: 'cyan' },
        { label: 'Currency Converter', icon: Coins, path: '/currency-converter', color: 'yellow' },
        { label: 'Receipt Scanner', icon: ScanLine, path: '/receipt-scanner', color: 'orange' },
      ]
    },
    {
      id: 'budgeting',
      label: 'Budgeting',
      icon: ClipboardList,
      items: [
        { label: 'Budget Planner', icon: ClipboardList, path: '/budget-planner', color: 'blue' },
        { label: 'Budget Wizard', icon: Sparkles, path: '/budget-wizard', color: 'purple', badge: 'NEW' },
        { label: 'Cash Flow', icon: TrendingUp, path: '/cash-flow', color: 'green' },
        { label: 'Financial Calendar', icon: CalendarDays, path: '/financial-calendar', color: 'orange' },
        { label: 'Templates', icon: ScrollText, path: '/templates', color: 'indigo' },
      ]
    },
    {
      id: 'income',
      label: 'Income & Expenses',
      icon: Banknote,
      items: [
        { label: 'Income Tracker', icon: Banknote, path: '/income-tracker', color: 'green' },
        { label: 'Recurring Payments', icon: Repeat, path: '/recurring-payments', color: 'blue' },
        { label: 'Split Expenses', icon: Users, path: '/split-expenses', color: 'purple' },
        { label: 'Subscriptions', icon: Boxes, path: '/subscriptions', color: 'pink' },
        { label: 'Bill Tracker', icon: Receipt, path: '/bill-tracker', color: 'orange' },
        { label: 'Bill Reminders', icon: Bell, path: '/bill-reminders', color: 'yellow' },
      ]
    },
    {
      id: 'investments',
      label: 'Investments',
      icon: LineChart,
      items: [
        { label: 'Portfolio', icon: PieChart, path: '/investments', color: 'indigo' },
        { label: 'Investment Analyzer', icon: LineChart, path: '/investment-analyzer', color: 'blue' },
        { label: 'Mutual Funds', icon: BarChart3, path: '/mutual-funds', color: 'green' },
        { label: 'Crypto', icon: Bitcoin, path: '/crypto', color: 'orange' },
        { label: 'Fixed Deposits', icon: Landmark, path: '/fixed-deposits', color: 'teal' },
        { label: 'Gold', icon: Gem, path: '/gold', color: 'yellow' },
        { label: 'SIP Calculator', icon: Calculator, path: '/sip-calculator', color: 'purple' },
        { label: 'Market Insights', icon: Globe, path: '/market-insights', color: 'cyan' },
        { label: 'Watchlist', icon: Target, path: '/watchlist', color: 'red' },
        { label: 'Portfolio Analytics', icon: BarChart3, path: '/portfolio-analytics', color: 'indigo' },
      ]
    },
    {
      id: 'wealth',
      label: 'Wealth & Assets',
      icon: Wallet,
      items: [
        { label: 'Net Worth', icon: Wallet, path: '/networth', color: 'emerald' },
        { label: 'Net Worth V2', icon: Wallet, path: '/networth-enhanced', color: 'green', badge: 'NEW' },
        { label: 'Property', icon: Building2, path: '/property', color: 'orange' },
        { label: 'Company Expenses', icon: Receipt, path: '/company-expenses', color: 'amber' },
      ]
    },
    {
      id: 'tax',
      label: 'Tax & Insurance',
      icon: Calculator,
      items: [
        { label: 'Tax Planner', icon: Calculator, path: '/tax-planner', color: 'red' },
        { label: 'Tax Estimator', icon: Calculator, path: '/tax-estimator', color: 'orange' },
        { label: 'Insurance', icon: Shield, path: '/insurance', color: 'blue' },
        { label: 'Insurance Planner', icon: Umbrella, path: '/insurance-planner', color: 'cyan' },
      ]
    },
    {
      id: 'retirement',
      label: 'Retirement',
      icon: Clock,
      items: [
        { label: 'Retirement Planner', icon: Clock, path: '/retirement', color: 'green' },
        { label: 'PPF', icon: PiggyBank, path: '/ppf', color: 'blue' },
        { label: 'EPF', icon: Landmark, path: '/epf', color: 'indigo' },
        { label: 'NPS', icon: TrendingUp, path: '/nps', color: 'purple' },
      ]
    },
    {
      id: 'debt',
      label: 'Debt & Loans',
      icon: Scale,
      items: [
        { label: 'Debt Management', icon: Target, path: '/debt-management', color: 'red' },
        { label: 'Debt Payoff', icon: TrendingDown, path: '/debt-payoff', color: 'orange' },
        { label: 'Loan Calculator', icon: Calculator, path: '/loan-calculator', color: 'blue' },
        { label: 'EMI Tracker', icon: CreditCard, path: '/emi-tracker', color: 'yellow' },
        { label: 'Emergency Fund', icon: Shield, path: '/emergency-fund', color: 'green' },
      ]
    },
    {
      id: 'goals',
      label: 'Goals & Savings',
      icon: Target,
      items: [
        { label: 'Financial Goals', icon: Target, path: '/goals', color: 'orange' },
        { label: 'Goal Timeline', icon: GanttChart, path: '/goal-timeline', color: 'blue' },
        { label: 'Savings Challenges', icon: Flame, path: '/savings-challenges', color: 'red' },
      ]
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      items: [
        { label: 'Reports', icon: FileText, path: '/reports', color: 'blue' },
        { label: 'Reports Hub', icon: FileBarChart, path: '/reports-hub', color: 'indigo' },
        { label: 'Data Lab', icon: Sparkles, path: '/data-lab', color: 'purple' },
        { label: 'Export Center', icon: Upload, path: '/export-center', color: 'green' },
        { label: 'Comparison Tool', icon: Scale, path: '/comparison', color: 'orange' },
        { label: 'Risk Dashboard', icon: Activity, path: '/risk-dashboard', color: 'red' },
        { label: 'Advanced Analytics', icon: Sparkles, path: '/advanced-analytics', color: 'purple' },
      ]
    },
    {
      id: 'ai',
      label: 'AI & Insights',
      icon: Brain,
      items: [
        { label: 'AI Insights', icon: Brain, path: '/ai-insights', color: 'violet', badge: 'AI' },
        { label: 'ML Dashboard', icon: Brain, path: '/ml-dashboard', color: 'purple' },
        { label: 'Spending Insights', icon: TrendingDown, path: '/spending-insights', color: 'rose' },
        { label: 'Financial Chat', icon: Bot, path: '/financial-chat', color: 'blue', badge: 'NEW' },
      ]
    },
    {
      id: 'education',
      label: 'Education',
      icon: BookOpen,
      items: [
        { label: 'Learning Center', icon: BookOpen, path: '/education', color: 'blue' },
        { label: 'Financial Quiz', icon: HelpCircle, path: '/quiz', color: 'green' },
        { label: 'Achievements', icon: Award, path: '/achievements', color: 'yellow' },
        { label: 'Milestones', icon: Trophy, path: '/milestones', color: 'orange' },
      ]
    },
    {
      id: 'tools',
      label: 'Tools',
      icon: Zap,
      items: [
        { label: 'Documents', icon: FileText, path: '/financial-documents', color: 'purple' },
        { label: 'Automation', icon: Zap, path: '/automation', color: 'blue', badge: 'NEW' },
        { label: 'Search', icon: Search, path: '/search', color: 'gray' },
        { label: 'Import/Export', icon: Upload, path: '/import-export', color: 'green' },
      ]
    },
    {
      id: 'social',
      label: 'Social & Family',
      icon: Users,
      items: [
        { label: 'Family Finance', icon: Users, path: '/family-finance', color: 'blue' },
        { label: 'Notifications', icon: Bell, path: '/smart-notifications', color: 'yellow' },
      ]
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      items: [
        { label: 'Account Settings', icon: Settings, path: '/settings', color: 'gray' },
        { label: 'Appearance', icon: Palette, path: '/appearance', color: 'purple' },
        { label: 'Security', icon: Lock, path: '/security', color: 'red' },
        { label: 'Profile', icon: User, path: '/profile', color: 'blue' },
      ]
    },
  ];

  const advancedItems = [
    { label: 'Advanced Search', icon: Search, path: '/advanced-search', color: 'cyan' },
    { label: 'Lender Dashboard', icon: DollarSign, path: '/lender-dashboard', color: 'green', roles: ['lender', 'admin'] },
    { label: 'Real Estate', icon: Building2, path: '/real-estate', color: 'orange' },
    { label: 'Business', icon: Briefcase, path: '/business', color: 'indigo' },
    { label: 'Admin Panel', icon: Shield, path: '/admin', color: 'red', roles: ['admin'] },
  ];

  const isActive = (path) => location.pathname === path;

  const hasAccess = (item) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role);
  };

  const getColorClasses = (color, active) => {
    const colors = {
      blue: active ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600',
      gray: active ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900',
      green: active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600',
      yellow: active ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' : 'text-gray-700 dark:text-gray-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:text-yellow-600',
      indigo: active ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600',
      orange: active ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : 'text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600',
      emerald: active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600',
      purple: active ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600',
      red: active ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600',
      pink: active ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' : 'text-gray-700 dark:text-gray-300 hover:bg-pink-50 dark:hover:bg-pink-900/20 hover:text-pink-600',
      cyan: active ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' : 'text-gray-700 dark:text-gray-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:text-cyan-600',
      teal: active ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' : 'text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-600',
      violet: active ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' : 'text-gray-700 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600',
      rose: active ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : 'text-gray-700 dark:text-gray-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600',
      amber: active ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600',
    };
    return colors[color] || colors.gray;
  };

  const NavItem = ({ item, collapsed }) => {
    const active = isActive(item.path);
    const Icon = item.icon;
    
    return (
      <Link
        to={item.path}
        onClick={() => setIsMobileOpen(false)}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm ${getColorClasses(item.color, active)} ${
          active ? 'font-semibold shadow-sm' : ''
        }`}
        title={collapsed ? item.label : ''}
      >
        <Icon className={`w-4 h-4 flex-shrink-0`} />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {item.badge && !collapsed && (
          <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            item.badge === 'NEW' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
            item.badge === 'AI' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
          }`}>{item.badge}</span>
        )}
        {active && !collapsed && !item.badge && (
          <div className="ml-auto w-1.5 h-1.5 bg-current rounded-full"></div>
        )}
      </Link>
    );
  };

  const SectionHeader = ({ section, collapsed }) => {
    const Icon = section.icon;
    const isExpanded = expandedSections[section.id];
    const hasActiveItem = section.items?.some(item => isActive(item.path));
    
    if (collapsed) {
      return (
        <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-2" />
      );
    }
    
    return (
      <button
        onClick={() => toggleSection(section.id)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all ${
          hasActiveItem 
            ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10' 
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }`}
      >
        <Icon className="w-3.5 h-3.5" />
        <span className="flex-1 text-left">{section.label}</span>
        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
    );
  };

  const SidebarContent = ({ collapsed, mobile = false }) => (
    <>
      {/* Logo Section */}
      <div className={`p-4 border-b border-gray-200 dark:border-gray-700 ${mobile ? '' : 'sticky top-0 bg-white dark:bg-slate-900 z-10'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white text-lg">FinAnalyzer</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">by Circuvent Technologies</p>
              </div>
            )}
          </div>
          {mobile && (
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Navigation */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 scrollbar-thin">
        {/* Collapsible Navigation Sections */}
        {navigationSections.map((section) => (
          <div key={section.id} className="mb-0.5">
            <SectionHeader section={section} collapsed={collapsed} />
            {(expandedSections[section.id] || collapsed) && (
              <div className={`space-y-0.5 ${collapsed ? '' : 'ml-2 mt-0.5'}`}>
                {section.items.map((item) => (
                  <NavItem key={item.path} item={item} collapsed={collapsed} />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Advanced Section */}
        <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700 space-y-0.5">
          {!collapsed && (
            <p className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Advanced
            </p>
          )}
          {advancedItems
            .filter(hasAccess)
            .map((item) => (
              <NavItem key={item.path} item={item} collapsed={collapsed} />
            ))}
        </div>
      </div>

      {/* Collapse Toggle Button (Desktop Only) */}
      {!mobile && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all text-gray-700 dark:text-gray-300"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Collapse</span>
              </>
            )}
          </button>
        </div>
      )}

      <style>{`
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed top-0 left-0 bottom-0 w-72 bg-white dark:bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
      >
        <SidebarContent collapsed={false} mobile={true} />
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed top-0 left-0 bottom-0 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-gray-700 shadow-lg z-30 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        <SidebarContent collapsed={isCollapsed} />
      </aside>
    </>
  );
};

export default Sidebar;
