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
  Receipt
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navigationItems = [
    {
      label: 'Dashboard',
      icon: Home,
      path: '/dashboard',
      color: 'blue'
    },
    {
      label: 'Search',
      icon: Search,
      path: '/search',
      color: 'gray'
    },
    {
      label: 'Import/Export',
      icon: Upload,
      path: '/import-export',
      color: 'green'
    },
    {
      label: 'EMI Tracker',
      icon: CreditCard,
      path: '/emi-tracker',
      color: 'yellow'
    },
    {
      label: 'Investments',
      icon: PieChart,
      path: '/investments',
      color: 'indigo'
    },
    {
      label: 'Financial Goals',
      icon: Target,
      path: '/goals',
      color: 'orange'
    },
    {
      label: 'Net Worth',
      icon: Wallet,
      path: '/networth',
      color: 'emerald'
    },
    {
      label: 'Bill Reminders',
      icon: Bell,
      path: '/bill-reminders',
      color: 'pink'
    },
    {
      label: 'Company Expenses',
      icon: Receipt,
      path: '/company-expenses',
      color: 'amber'
    },
    {
      label: 'Documents',
      icon: FileText,
      path: '/documents',
      color: 'purple'
    },
    {
      label: 'Financial Health',
      icon: Activity,
      path: '/financial-health',
      color: 'teal'
    },
    {
      label: '🤖 AI Insights',
      icon: Brain,
      path: '/ai-insights',
      color: 'violet',
      badge: 'NEW'
    },
    {
      label: 'Spending Insights',
      icon: TrendingDown,
      path: '/spending-insights',
      color: 'rose'
    },
    {
      label: 'Debt Management',
      icon: Target,
      path: '/debt-management',
      color: 'red'
    },
    {
      label: 'Portfolio Analytics',
      icon: BarChart3,
      path: '/portfolio-analytics',
      color: 'indigo'
    },
    {
      label: 'AI & ML Insights',
      icon: Brain,
      path: '/ml-dashboard',
      color: 'purple'
    },
    {
      label: 'Tax Planner',
      icon: Calculator,
      path: '/tax-planner',
      color: 'red'
    },
    {
      label: 'Insurance',
      icon: Shield,
      path: '/insurance',
      color: 'blue'
    },
    {
      label: 'Retirement',
      icon: TrendingUp,
      path: '/retirement',
      color: 'green'
    },
    {
      label: 'Real Estate',
      icon: Building2,
      path: '/real-estate',
      color: 'orange'
    },
    {
      label: 'Business',
      icon: Briefcase,
      path: '/business',
      color: 'indigo'
    },
    {
      label: 'Notifications',
      icon: Bell,
      path: '/notifications',
      color: 'yellow'
    }
  ];

  const advancedItems = [
    {
      label: 'Advanced Search',
      icon: Search,
      path: '/advanced-search',
      color: 'cyan'
    },
    {
      label: 'Lender Dashboard',
      icon: DollarSign,
      path: '/lender-dashboard',
      color: 'green',
      roles: ['lender', 'admin']
    },
    {
      label: 'Advanced Analytics',
      icon: Sparkles,
      path: '/advanced-analytics',
      color: 'purple'
    },
    {
      label: 'Admin Panel',
      icon: Shield,
      path: '/admin',
      color: 'red',
      roles: ['admin']
    }
  ];

  const isActive = (path) => location.pathname === path;

  const hasAccess = (item) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role);
  };

  const getColorClasses = (color, active) => {
    const colors = {
      blue: active ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600',
      gray: active ? 'bg-gray-100 text-gray-700' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
      green: active ? 'bg-green-100 text-green-700' : 'text-gray-700 hover:bg-green-50 hover:text-green-600',
      yellow: active ? 'bg-yellow-100 text-yellow-700' : 'text-gray-700 hover:bg-yellow-50 hover:text-yellow-600',
      indigo: active ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600',
      orange: active ? 'bg-orange-100 text-orange-700' : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600',
      emerald: active ? 'bg-emerald-100 text-emerald-700' : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-600',
      purple: active ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-purple-50 hover:text-purple-600',
      red: active ? 'bg-red-100 text-red-700' : 'text-gray-700 hover:bg-red-50 hover:text-red-600',
      pink: active ? 'bg-pink-100 text-pink-700' : 'text-gray-700 hover:bg-pink-50 hover:text-pink-600',
      cyan: active ? 'bg-cyan-100 text-cyan-700' : 'text-gray-700 hover:bg-cyan-50 hover:text-cyan-600'
    };
    return colors[color] || colors.gray;
  };

  const NavItem = ({ item, collapsed }) => {
    const active = isActive(item.path);
    const Icon = item.icon;
    
    return (
      <Link
        to={item.path}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${getColorClasses(item.color, active)} ${
          active ? 'font-semibold shadow-sm' : ''
        }`}
        title={collapsed ? item.label : ''}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'animate-pulse-slow' : ''}`} />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {active && !collapsed && (
          <div className="ml-auto w-2 h-2 bg-current rounded-full"></div>
        )}
      </Link>
    );
  };

  const SidebarContent = ({ collapsed, mobile = false }) => (
    <>
      {/* Logo Section */}
      <div className={`p-4 border-b border-gray-200 ${mobile ? '' : 'sticky top-0 bg-white z-10'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h2 className="font-bold text-gray-900 text-lg">FinAnalyzer</h2>
                <p className="text-xs text-gray-500">by Circuvent Technologies</p>
              </div>
            )}
          </div>
          {mobile && (
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {/* Main Navigation */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Main Menu
            </p>
          )}
          {navigationItems.map((item) => (
            <NavItem key={item.path} item={item} collapsed={collapsed} />
          ))}
        </div>

        {/* Advanced Section */}
        <div className="pt-4 mt-4 border-t border-gray-200 space-y-1">
          {!collapsed && (
            <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all text-gray-700"
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
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg hover:shadow-xl transition-all border border-gray-200"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed top-0 left-0 bottom-0 w-72 bg-white shadow-2xl z-50 transform transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
      >
        <SidebarContent collapsed={false} mobile={true} />
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed top-0 left-0 bottom-0 bg-white border-r border-gray-200 shadow-lg z-30 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        <SidebarContent collapsed={isCollapsed} />
      </aside>
    </>
  );
};

export default Sidebar;
