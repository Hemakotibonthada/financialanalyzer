import React, { useState, useEffect } from 'react';
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
  AlertTriangle,
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
  Heart,
  Boxes,
  ScrollText,
  Bot,
  Mail,
  Cloud,
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
  const [expandedSections, setExpandedSections] = useState(() => {
    // On initial load, restore from localStorage if available
    const saved = localStorage.getItem('sidebarExpandedSections');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* fall through */ }
    }
    return {
      enterprise: false,
      money: false,
      invest: false,
      debt: false,
      plan: false,
      insights: false,
      wealth: false,
      ailab: false,
      gmail: false,
      more: false,
    };
  });

  // Persist expanded state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarExpandedSections', JSON.stringify(expandedSections));
  }, [expandedSections]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // — Quick-access top-level links (always visible, no collapse) —
  const quickLinks = [
    { label: 'Dashboard', icon: Home, path: '/dashboard', color: 'blue' },
    { label: 'All Features', icon: Sparkles, path: '/features', color: 'purple' },
    { label: 'Financial Health', icon: Activity, path: '/financial-health', color: 'teal' },
    { label: 'Notifications', icon: Bell, path: '/smart-notifications', color: 'yellow' },
  ];

  // — Standalone special items (shown as top-level, outside collapsible groups) —
  const specialItems = [
    { label: 'Company', icon: Building2, path: '/company-expenses', color: 'amber', badge: 'PRO', special: true },
  ];

  // — Consolidated navigation: 7 groups —
  const navigationSections = [
    {
      id: 'enterprise',
      label: '✨ Enterprise V2',
      icon: Zap,
      items: [
        { label: 'Dashboard V2', icon: LayoutDashboard, path: '/dashboard-v2', color: 'blue' },
        { label: 'Health V2', icon: Activity, path: '/financial-health-v2', color: 'teal' },
        { label: 'Spending V2', icon: BarChart3, path: '/spending-insights-v2', color: 'red' },
        { label: 'Portfolio V2', icon: Briefcase, path: '/investment-portfolio-v2', color: 'indigo' },
        { label: 'Budget V2', icon: Calculator, path: '/budget-planner-v2', color: 'green' },
        { label: 'Debt V2', icon: Shield, path: '/debt-management-v2', color: 'rose' },
        { label: 'Goals V2', icon: Target, path: '/goals-v2', color: 'amber' },
        { label: 'Transactions V2', icon: ArrowLeftRight, path: '/transactions-v2', color: 'blue' },
        { label: 'AI Chat V2', icon: MessageSquare, path: '/financial-chat-v2', color: 'purple' },
        { label: 'AI Command', icon: Brain, path: '/ai-command-center', color: 'violet' },
        { label: 'Planning V2', icon: Calculator, path: '/planning-v2', color: 'sky' },
        { label: 'Reports V2', icon: BarChart3, path: '/reports-v2', color: 'orange' },
        { label: 'Settings V2', icon: Settings, path: '/settings-v2', color: 'gray' },
      ]
    },
    {
      id: 'money',
      label: 'Money',
      icon: Banknote,
      items: [
        { label: 'Transactions', icon: ArrowLeftRight, path: '/transactions', color: 'blue' },
        { label: 'Bank Accounts', icon: Landmark, path: '/bank-accounts', color: 'green' },
        { label: 'Credit Cards', icon: CreditCard, path: '/credit-cards', color: 'purple' },
        { label: 'Budget Planner', icon: ClipboardList, path: '/budget-planner', color: 'indigo' },
        { label: 'Income Tracker', icon: Banknote, path: '/income-tracker', color: 'green' },
        { label: 'Cash Flow', icon: TrendingUp, path: '/cash-flow', color: 'teal' },
        { label: 'Bills & Recurring', icon: Repeat, path: '/recurring-payments', color: 'orange' },
        { label: 'Subscriptions', icon: Boxes, path: '/subscriptions', color: 'pink' },
        { label: 'Split Expenses', icon: Users, path: '/split-expenses', color: 'purple' },
        { label: 'Receipt Scanner', icon: ScanLine, path: '/receipt-scanner', color: 'amber' },
        { label: 'Currency Converter', icon: Coins, path: '/currency-converter', color: 'yellow' },
      ]
    },
    {
      id: 'invest',
      label: 'Invest & Wealth',
      icon: LineChart,
      items: [
        { label: 'Portfolio', icon: PieChart, path: '/investments', color: 'indigo' },
        { label: 'Mutual Funds', icon: BarChart3, path: '/mutual-funds', color: 'green' },
        { label: 'Fixed Deposits', icon: Landmark, path: '/fixed-deposits', color: 'teal' },
        { label: 'Gold', icon: Gem, path: '/gold', color: 'yellow' },
        { label: 'Crypto', icon: Bitcoin, path: '/crypto', color: 'orange' },
        { label: 'Net Worth', icon: Wallet, path: '/networth-enhanced', color: 'emerald' },
        { label: 'Property', icon: Building2, path: '/property', color: 'orange' },
        { label: 'Retirement', icon: Clock, path: '/retirement', color: 'blue' },
        { label: 'PPF / EPF / NPS', icon: PiggyBank, path: '/ppf', color: 'indigo' },
        { label: 'SIP Calculator', icon: Calculator, path: '/sip-calculator', color: 'purple' },
        { label: 'Market Insights', icon: Globe, path: '/market-insights', color: 'cyan' },
      ]
    },
    {
      id: 'debt',
      label: 'Debt & EMI',
      icon: Scale,
      items: [
        { label: 'EMI Tracker', icon: CreditCard, path: '/emi-tracker', color: 'yellow' },
        { label: 'Debt Spiral Monitor', icon: AlertTriangle, path: '/debt-spiral', color: 'rose', badge: 'NEW' },
        { label: 'Borrowings', icon: Users, path: '/personal-borrowings', color: 'indigo', badge: 'NEW' },
        { label: 'Debt Management', icon: Target, path: '/debt-management', color: 'red' },
        { label: 'Debt Payoff', icon: TrendingDown, path: '/debt-payoff', color: 'orange' },
        { label: 'Loan Calculator', icon: Calculator, path: '/loan-calculator', color: 'blue' },
        { label: 'Emergency Fund', icon: Shield, path: '/emergency-fund', color: 'green' },
      ]
    },
    {
      id: 'plan',
      label: 'Plan & Goals',
      icon: Target,
      items: [
        { label: 'Financial Goals', icon: Target, path: '/goals', color: 'orange' },
        { label: 'Goal Timeline', icon: GanttChart, path: '/goal-timeline', color: 'blue' },
        { label: 'Savings Challenges', icon: Flame, path: '/savings-challenges', color: 'red' },
        { label: 'Tax Planner', icon: Calculator, path: '/tax-planner', color: 'red' },
        { label: 'Insurance', icon: Umbrella, path: '/insurance-planner', color: 'cyan' },
        { label: 'Financial Calendar', icon: CalendarDays, path: '/financial-calendar', color: 'orange' },
      ]
    },
    {
      id: 'insights',
      label: 'Insights & Reports',
      icon: Brain,
      items: [
        { label: 'AI Command Center', icon: Brain, path: '/ai-command-center', color: 'violet', badge: 'NEW' },
        { label: 'AI Training', icon: Brain, path: '/ai-training', color: 'purple', badge: 'ML' },
        { label: 'Smart Budget', icon: Sparkles, path: '/smart-budget-optimizer', color: 'emerald', badge: 'AI' },
        { label: 'Risk Assessment', icon: Activity, path: '/risk-assessment', color: 'red', badge: 'AI' },
        { label: 'Deep Insights', icon: Activity, path: '/financial-insights-dashboard', color: 'cyan', badge: 'NEW' },
        { label: 'AI Insights', icon: Brain, path: '/ai-insights', color: 'violet', badge: 'AI' },
        { label: 'AI Intelligence Hub', icon: Brain, path: '/ai-hub', color: 'indigo', badge: 'NEW' },
        { label: 'Financial Chat', icon: Bot, path: '/financial-chat', color: 'blue' },
        { label: 'Spending Insights', icon: TrendingDown, path: '/spending-insights', color: 'rose' },
        { label: 'Reports Hub', icon: FileBarChart, path: '/reports-hub', color: 'indigo' },
        { label: 'Analytics', icon: Sparkles, path: '/advanced-analytics', color: 'purple' },
        { label: 'Risk Dashboard', icon: Activity, path: '/risk-dashboard', color: 'red' },
        { label: 'Scorecard', icon: FileBarChart, path: '/scorecard', color: 'emerald' },
        { label: 'Merchant Intel', icon: Activity, path: '/merchant-intelligence', color: 'blue', badge: 'AI' },
        { label: 'Lifestyle', icon: Sparkles, path: '/lifestyle-analytics', color: 'pink', badge: 'AI' },
        { label: 'Spend Forecast', icon: TrendingDown, path: '/spending-forecast', color: 'cyan', badge: 'AI' },
        { label: 'Sentiment', icon: Brain, path: '/sentiment', color: 'rose', badge: 'AI' },
        { label: 'Income Forecast', icon: Sparkles, path: '/income-forecast', color: 'green', badge: 'AI' },
        { label: 'Goal Forecaster', icon: Target, path: '/goal-forecaster', color: 'orange', badge: 'AI' },
        { label: 'Anomaly Detector', icon: Shield, path: '/anomaly-detector', color: 'red', badge: 'AI' },
        { label: 'Expense Intel', icon: Activity, path: '/expense-intelligence', color: 'teal', badge: 'NEW' },
      ]
    },
    {
      id: 'wealth',
      label: 'Wealth',
      icon: Sparkles,
      items: [
        { label: 'Wealth Mgmt', icon: TrendingUp, path: '/wealth-management', color: 'emerald', badge: 'NEW' },
        { label: 'Financial Wellness', icon: Heart, path: '/financial-wellness', color: 'pink', badge: 'NEW' },
        { label: 'Smart Advisor', icon: Brain, path: '/smart-advisor', color: 'violet', badge: 'AI' },
        { label: 'Tax Center', icon: Receipt, path: '/tax-optimization', color: 'amber', badge: 'NEW' },
        { label: 'FIRE Tracker', icon: Flame, path: '/fire-tracker', color: 'orange', badge: 'NEW' },
      ]
    },
    {
      id: 'ailab',
      label: 'AI Lab',
      icon: Brain,
      items: [
        { label: 'AI Command V3', icon: Brain, path: '/ai-command-center-v3', color: 'violet', badge: 'AI' },
        { label: 'AI Chatbot', icon: Bot, path: '/ai-chatbot', color: 'blue', badge: 'AI' },
        { label: 'RL Optimizer', icon: Target, path: '/rl-optimizer', color: 'purple', badge: 'AI' },
        { label: 'Model Observatory', icon: Activity, path: '/ai-observatory', color: 'cyan', badge: 'AI' },
        { label: 'Anomaly Lab', icon: Shield, path: '/advanced-anomaly-detector', color: 'red', badge: 'AI' },
        { label: 'Financial Planner', icon: Calculator, path: '/smart-financial-planner', color: 'green', badge: 'AI' },
        { label: 'Spending Intel', icon: BarChart3, path: '/spending-intelligence', color: 'orange', badge: 'AI' },
        { label: 'Portfolio AI', icon: Briefcase, path: '/portfolio-optimizer', color: 'indigo', badge: 'AI' },
        { label: 'Credit Predictor', icon: CreditCard, path: '/credit-score-predictor', color: 'teal', badge: 'AI' },
        { label: 'Cash Flow AI', icon: TrendingUp, path: '/cashflow-intelligence', color: 'emerald', badge: 'AI' },
        { label: 'Sub Manager', icon: Boxes, path: '/subscription-manager', color: 'pink', badge: 'AI' },
        { label: 'Goal & Tax AI', icon: Target, path: '/goal-tax-optimizer', color: 'amber', badge: 'AI' },
        { label: 'Wellness AI', icon: Heart, path: '/financial-wellness-ai', color: 'rose', badge: 'AI' },
      ]
    },
    {
      id: 'gmail',
      label: 'Gmail',
      icon: Mail,
      items: [
        { label: 'Gmail Inbox', icon: Mail, path: '/gmail-inbox', color: 'blue', badge: 'NEW' },
        { label: 'Gmail Analytics', icon: BarChart3, path: '/gmail-analytics', color: 'purple', badge: 'AI' },
        { label: 'Gmail Browser', icon: Search, path: '/gmail-browser', color: 'teal' },
      ]
    },
    {
      id: 'more',
      label: 'More',
      icon: Zap,
      items: [
        { label: 'Documents', icon: FileText, path: '/financial-documents', color: 'purple' },
        { label: 'Automation', icon: Zap, path: '/automation', color: 'blue', badge: 'NEW' },
        { label: 'Family Finance', icon: Users, path: '/family-finance', color: 'blue' },
        { label: 'Learning Center', icon: BookOpen, path: '/education', color: 'blue' },
        { label: 'Achievements', icon: Award, path: '/achievements', color: 'yellow' },
        { label: 'Search', icon: Search, path: '/search', color: 'gray' },
        { label: 'Import / Export', icon: Upload, path: '/import-export', color: 'green' },
        { label: 'Cloud Backup', icon: Cloud, path: '/cloud-backup', color: 'cyan', badge: 'GCP' },
        { label: 'System Dashboard', icon: Settings, path: '/system-dashboard', color: 'slate', badge: 'NEW' },
      ]
    },
  ];

  // Auto-expand the section that contains the currently active route.
  // This ensures that when a user clicks a sub-item (navigates), the parent
  // section stays expanded instead of collapsing.
  useEffect(() => {
    const currentPath = location.pathname;
    for (const section of navigationSections) {
      const hasActive = section.items?.some(item => item.path === currentPath);
      if (hasActive) {
        setExpandedSections(prev => {
          // Only update if not already expanded (prevents unnecessary re-renders)
          if (prev[section.id]) return prev;
          return { ...prev, [section.id]: true };
        });
        break;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // — Bottom pinned items (always visible) —
  const bottomLinks = [
    { label: 'Upgrade / Billing', icon: CreditCard, path: '/billing', color: 'teal' },
    { label: 'Settings', icon: Settings, path: '/settings', color: 'gray' },
    { label: 'Profile', icon: User, path: '/profile', color: 'blue' },
  ];

  const advancedItems = [
    { label: 'Lender Dashboard', icon: DollarSign, path: '/lender-dashboard', color: 'green', roles: ['lender', 'admin'] },
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

    if (item.special) {
      const colorMap = {
        amber: {
          active: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-400 shadow-lg shadow-amber-500/25 font-semibold',
          idle: 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/50 hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-900/30 dark:hover:to-orange-900/30 hover:shadow-md',
          iconBg: active ? 'bg-white/20' : 'bg-amber-100 dark:bg-amber-800/30',
          badgeIdle: 'bg-amber-200 text-amber-800 dark:bg-amber-800/40 dark:text-amber-200',
        },
        emerald: {
          active: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/25 font-semibold',
          idle: 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/30 dark:hover:to-teal-900/30 hover:shadow-md',
          iconBg: active ? 'bg-white/20' : 'bg-emerald-100 dark:bg-emerald-800/30',
          badgeIdle: 'bg-emerald-200 text-emerald-800 dark:bg-emerald-800/40 dark:text-emerald-200',
        },
      };
      const c = colorMap[item.color] || colorMap.amber;

      return (
        <Link
          to={item.path}
          onClick={() => setIsMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm border ${
            active ? c.active : c.idle
          }`}
          title={collapsed ? item.label : ''}
        >
          <div className={`p-1 rounded-lg ${c.iconBg}`}>
            <Icon className="w-4 h-4 flex-shrink-0" />
          </div>
          {!collapsed && <span className="truncate font-medium">{item.label}</span>}
          {item.badge && !collapsed && (
            <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              active ? 'bg-white/20 text-white' : c.badgeIdle
            }`}>{item.badge}</span>
          )}
        </Link>
      );
    }
    
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
        <div className="w-full h-px bg-gray-200/50 dark:bg-white/[0.06] my-2" />
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
      <div className={`p-4 border-b border-white/20 dark:border-white/[0.06] ${mobile ? '' : 'sticky top-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl z-10'}`}>
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
        {/* Quick Access Links (always visible, no collapse) */}
        <div className="space-y-0.5 mb-2">
          {!collapsed && (
            <p className="px-3 pt-1 pb-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Quick Access
            </p>
          )}
          {quickLinks.map((item) => (
            <NavItem key={item.path} item={item} collapsed={collapsed} />
          ))}
        </div>

        <div className="w-full h-px bg-gray-200/50 dark:bg-white/[0.06] my-1" />

        {/* Special standalone items (outside collapsible groups) */}
        <div className="space-y-1.5 mb-2">
          {specialItems.map((item) => (
            <NavItem key={item.path} item={item} collapsed={collapsed} />
          ))}
        </div>

        <div className="w-full h-px bg-gray-200/50 dark:bg-white/[0.06] my-1" />

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

        {/* Role-based items */}
        {advancedItems.filter(hasAccess).length > 0 && (
          <div className="pt-2 mt-2 border-t border-white/20 dark:border-white/[0.06] space-y-0.5">
            {advancedItems
              .filter(hasAccess)
              .map((item) => (
                <NavItem key={item.path} item={item} collapsed={collapsed} />
              ))}
          </div>
        )}
      </div>

      {/* Collapse Toggle Button (Desktop Only) */}
      {!mobile && (
        <div className="p-3 border-t border-white/20 dark:border-white/[0.06]">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/40 dark:bg-white/[0.05] hover:bg-white/60 dark:hover:bg-white/[0.08] backdrop-blur-sm rounded-lg transition-all text-gray-700 dark:text-gray-300"
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
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-xl shadow-lg hover:shadow-xl transition-all border border-white/30 dark:border-white/[0.06]"
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
        className={`lg:hidden fixed top-0 left-0 bottom-0 w-72 bg-white/70 dark:bg-slate-900/80 backdrop-blur-2xl shadow-[0_16px_70px_rgba(31,38,135,0.15)] dark:shadow-[0_16px_70px_rgba(0,0,0,0.5)] border-r border-white/30 dark:border-white/[0.06] z-50 transform transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
      >
        <SidebarContent collapsed={false} mobile={true} />
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed top-0 left-0 bottom-0 bg-white/60 dark:bg-slate-900/50 backdrop-blur-2xl border-r border-white/30 dark:border-white/[0.06] shadow-[0_8px_40px_rgba(31,38,135,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)] z-30 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        <SidebarContent collapsed={isCollapsed} />
      </aside>
    </>
  );
};

export default Sidebar;
