// ============================================================================
// ENTERPRISE NAVIGATION SIDEBAR — V3 Enterprise Pages
// ============================================================================
import React, { useState, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard, ArrowLeftRight, Wallet, TrendingUp, Target,
  CreditCard, Heart, BarChart3, FileText, Settings, MessageSquare,
  LineChart, ChevronDown, ChevronRight, Sparkles, Shield, Zap,
  Menu, X, Sun, Moon, Mail,
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'Enterprise V3',
    badge: 'NEW',
    items: [
      { path: '/dashboard-v3', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/transactions-v3', label: 'Transactions', icon: ArrowLeftRight },
      { path: '/budget-intelligence', label: 'Budget Intelligence', icon: Wallet },
      { path: '/investment-advisor', label: 'Investment Advisor', icon: TrendingUp },
      { path: '/goals-v3', label: 'Goals Tracker', icon: Target },
      { path: '/debt-management-v3', label: 'Debt Management', icon: CreditCard },
      { path: '/financial-health-v3', label: 'Financial Health', icon: Heart },
      { path: '/analytics-v3', label: 'Analytics', icon: BarChart3 },
      { path: '/reports-v3', label: 'Reports', icon: FileText },
      { path: '/ai-chat-v3', label: 'AI Assistant', icon: MessageSquare },
      { path: '/cashflow-forecaster', label: 'Cash Flow Forecast', icon: LineChart },
      { path: '/gmail-browser', label: 'Gmail Intelligence', icon: Mail },
      { path: '/settings-v3', label: 'Settings', icon: Settings },
    ],
  },
  {
    label: 'Classic V2',
    collapsed: true,
    items: [
      { path: '/dashboard-v2', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/transactions-v2', label: 'Transactions', icon: ArrowLeftRight },
      { path: '/budget-planner-v2', label: 'Budget Planner', icon: Wallet },
      { path: '/investment-portfolio-v2', label: 'Investments', icon: TrendingUp },
      { path: '/goals-v2', label: 'Goals', icon: Target },
      { path: '/debt-management-v2', label: 'Debt', icon: CreditCard },
      { path: '/financial-health-v2', label: 'Health Score', icon: Heart },
      { path: '/reports-v2', label: 'Reports', icon: FileText },
      { path: '/settings-v2', label: 'Settings', icon: Settings },
    ],
  },
];

function NavItem({ item, isCollapsed }) {
  const Icon = item.icon;
  return (
    <NavLink to={item.path}
      className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group ${
        isActive
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
      }`}>
      <Icon size={18} className="flex-shrink-0" />
      {!isCollapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}

function NavSection({ section, isCollapsed }) {
  const [expanded, setExpanded] = useState(!section.collapsed);
  const location = useLocation();
  const hasActive = section.items.some(item => location.pathname === item.path);

  return (
    <div className="mb-2">
      {!isCollapsed && (
        <button onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <span className="flex items-center gap-1.5">
            {section.label}
            {section.badge && (
              <span className="px-1.5 py-0.5 text-[8px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full font-bold">
                {section.badge}
              </span>
            )}
            {hasActive && !expanded && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-1" />}
          </span>
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
      )}
      {(expanded || isCollapsed) && (
        <div className="space-y-0.5 mt-0.5">
          {section.items.map(item => <NavItem key={item.path} item={item} isCollapsed={isCollapsed} />)}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN SIDEBAR
// ============================================================================
export default function EnterpriseNavSidebar({ isOpen, onToggle }) {
  const { theme, setTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onToggle} />
      )}

      <aside className={`fixed lg:sticky top-0 left-0 h-screen z-50 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${isCollapsed ? 'w-16' : 'w-64'}`}>

        {/* Logo / Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <Zap size={16} className="text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900 dark:text-white">FinAnalyzer</h1>
                <p className="text-[10px] text-gray-400">Enterprise</p>
              </div>
            </div>
          )}
          <button onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors hidden lg:block">
            <Menu size={16} />
          </button>
          <button onClick={onToggle}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors lg:hidden">
            <X size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-auto p-2 space-y-1">
          {NAV_SECTIONS.map((section, i) => (
            <NavSection key={i} section={section} isCollapsed={isCollapsed} />
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800">
          {!isCollapsed && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles size={12} className="text-blue-500" />
                <span className="text-[10px] text-gray-400">AI Powered</span>
              </div>
            </div>
          )}
          {isCollapsed && (
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mx-auto block">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
