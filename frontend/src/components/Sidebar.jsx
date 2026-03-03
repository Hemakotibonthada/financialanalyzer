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
    money: false,
    invest: false,
    debt: false,
    plan: false,
    insights: false,
    more: false,
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // — Quick-access top-level links (always visible, no collapse) —
  const quickLinks = [
    { label: 'Dashboard', icon: Home, path: '/dashboard', color: 'blue' },
    { label: 'Financial Health', icon: Activity, path: '/financial-health', color: 'teal' },
    { label: 'Notifications', icon: Bell, path: '/smart-notifications', color: 'yellow' },
  ];

  // — Consolidated navigation: 6 groups instead of 16 —
  const navigationSections = [
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
        { label: 'Financial Chat', icon: Bot, path: '/financial-chat', color: 'blue' },
        { label: 'Spending Insights', icon: TrendingDown, path: '/spending-insights', color: 'rose' },
        { label: 'Reports Hub', icon: FileBarChart, path: '/reports-hub', color: 'indigo' },
        { label: 'Analytics', icon: Sparkles, path: '/advanced-analytics', color: 'purple' },
        { label: 'Risk Dashboard', icon: Activity, path: '/risk-dashboard', color: 'red' },
        { label: 'Scorecard', icon: FileBarChart, path: '/scorecard', color: 'emerald' },
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
        { label: 'Company Expenses', icon: Receipt, path: '/company-expenses', color: 'amber' },
        { label: 'System Dashboard', icon: Settings, path: '/system-dashboard', color: 'slate', badge: 'NEW' },
      ]
    },
  ];

  // — Bottom pinned items (always visible) —
  const bottomLinks = [
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

        <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-1" />

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
          <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700 space-y-0.5">
            {advancedItems
              .filter(hasAccess)
              .map((item) => (
                <NavItem key={item.path} item={item} collapsed={collapsed} />
              ))}
          </div>
        )}
      </div>

      {/* Pinned bottom: Settings + Profile */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-2 py-2 space-y-0.5">
        {bottomLinks.map((item) => (
          <NavItem key={item.path} item={item} collapsed={collapsed} />
        ))}
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
