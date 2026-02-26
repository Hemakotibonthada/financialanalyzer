import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { useTheme } from '../context/ThemeContext';
import {
  User,
  LogOut,
  ChevronDown,
  Bell,
  Settings,
  Lock,
  HelpCircle,
  BookOpen,
  Phone,
  FileQuestion,
  Palette,
  Globe,
  Database,
  Key,
  Users,
  Activity,
  Download,
  Shield,
  Building2,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';
import ThemePicker from './ThemePicker';
import NotificationBell from './NotificationBell';

/**
 * MainLayout Component
 * Provides consistent layout structure with sidebar, header, and main content area
 * Handles responsive design for mobile, tablet, and desktop
 * Full dark / black mode support
 */
const MainLayout = ({ children, title, subtitle, headerActions }) => {
  const { user, logout } = useAuth();
  const { isCollapsed } = useSidebar();
  const { mode, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setProfileDropdownOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  /* ── Reusable dropdown link class ── */
  const dropdownLinkClass =
    'flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-400 transition-colors';

  return (
    <>
      <Sidebar />

      {/* Main Content Area */}
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        {/* Fixed Header — glassmorphism */}
        <header className={`
          fixed top-0 right-0 left-0 z-40 transition-all duration-300
          bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl
          border-b border-slate-200/60 dark:border-slate-700/40
          shadow-sm dark:shadow-slate-900/30
          ${isCollapsed ? 'lg:left-20' : 'lg:left-72'}
        `}>
          <div className="px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Page Title */}
              <div className="flex-1 min-w-0">
                {title && (
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">{title}</h1>
                    {subtitle && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>
                    )}
                  </div>
                )}
              </div>

              {headerActions && (
                <div className="hidden sm:flex items-center gap-2">{headerActions}</div>
              )}

              {/* Right Side Actions */}
              <div className="flex items-center gap-2 sm:gap-3">
                <NotificationBell />
                <ThemeToggle />
                <ThemePicker />

                {/* Profile Dropdown */}
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    aria-label="Open profile menu"
                    aria-expanded={profileDropdownOpen}
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-lg ring-2 ring-white dark:ring-slate-800">
                      {user?.name ? user.name.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <ChevronDown className={`hidden sm:block h-4 w-4 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown */}
                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl dark:shadow-black/40 border border-slate-200 dark:border-slate-700 py-0 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 max-h-[85vh] overflow-y-auto">
                      {/* Company Branding */}
                      <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="w-5 h-5" />
                          <span className="font-bold text-sm">Circuvent Technologies</span>
                        </div>
                        <p className="text-xs text-blue-100">Enterprise Financial Management</p>
                      </div>

                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                            {user?.name ? user.name.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-white truncate">{user?.name || user?.email?.split('@')[0] || 'User'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email || 'No email'}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-full capitalize">
                            {user?.role || 'user'}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">ID: {user?._id?.slice(-6) || user?.id?.slice(-6) || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Account Section */}
                      <div className="py-2">
                        <div className="px-4 py-1">
                          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Account</p>
                        </div>
                        <Link to="/profile" onClick={() => setProfileDropdownOpen(false)} className={dropdownLinkClass}>
                          <User className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">Profile Settings</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Manage your account</p>
                          </div>
                        </Link>
                        <Link to="/profile" onClick={() => setProfileDropdownOpen(false)} className={dropdownLinkClass}>
                          <Bell className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">Notifications</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Alerts & preferences</p>
                          </div>
                        </Link>
                        <Link to="/profile" onClick={() => setProfileDropdownOpen(false)} className={dropdownLinkClass}>
                          <Lock className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">Security & Privacy</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Password & 2FA</p>
                          </div>
                        </Link>
                      </div>

                      {/* Preferences */}
                      <div className="py-2 border-t border-slate-200 dark:border-slate-700">
                        <div className="px-4 py-1">
                          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Preferences</p>
                        </div>
                        <Link to="/profile" onClick={() => setProfileDropdownOpen(false)} className={dropdownLinkClass}>
                          <Settings className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">General Settings</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">App configuration</p>
                          </div>
                        </Link>
                        <Link to="/profile" onClick={() => setProfileDropdownOpen(false)} className={dropdownLinkClass}>
                          <Palette className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">Appearance</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Theme & display</p>
                          </div>
                        </Link>
                        <Link to="/profile" onClick={() => setProfileDropdownOpen(false)} className={dropdownLinkClass}>
                          <Globe className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">Language & Region</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Localization</p>
                          </div>
                        </Link>
                      </div>

                      {/* Data & Integrations */}
                      <div className="py-2 border-t border-slate-200 dark:border-slate-700">
                        <div className="px-4 py-1">
                          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Data & Integrations</p>
                        </div>
                        <Link to="/import-export" onClick={() => setProfileDropdownOpen(false)} className={dropdownLinkClass}>
                          <Database className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">Data Management</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Import & export</p>
                          </div>
                        </Link>
                        <Link to="/profile" onClick={() => setProfileDropdownOpen(false)} className={dropdownLinkClass}>
                          <Key className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">API & Integrations</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Connect services</p>
                          </div>
                        </Link>
                        <Link to="/profile" onClick={() => setProfileDropdownOpen(false)} className={dropdownLinkClass}>
                          <Download className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">Backup & Restore</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Data protection</p>
                          </div>
                        </Link>
                      </div>

                      {/* Help & Support */}
                      <div className="py-2 border-t border-slate-200 dark:border-slate-700">
                        <div className="px-4 py-1">
                          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Help & Support</p>
                        </div>
                        <Link to="/help" onClick={() => setProfileDropdownOpen(false)} className={dropdownLinkClass}>
                          <HelpCircle className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">Help Center</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">FAQs & guides</p>
                          </div>
                        </Link>
                        <Link to="/docs" onClick={() => setProfileDropdownOpen(false)} className={dropdownLinkClass}>
                          <BookOpen className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">Documentation</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">User manual</p>
                          </div>
                        </Link>
                        <Link to="/contact" onClick={() => setProfileDropdownOpen(false)} className={dropdownLinkClass}>
                          <Phone className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">Contact Support</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Get assistance</p>
                          </div>
                        </Link>
                        <button
                          onClick={() => setProfileDropdownOpen(false)}
                          className={`${dropdownLinkClass} w-full text-left`}
                        >
                          <FileQuestion className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">Send Feedback</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Share your thoughts</p>
                          </div>
                        </button>
                      </div>

                      {/* Enterprise Features (Admin/Lender only) */}
                      {(user?.role === 'admin' || user?.role === 'lender') && (
                        <div className="py-2 border-t border-slate-200 dark:border-slate-700 bg-purple-50 dark:bg-purple-500/10">
                          <div className="px-4 py-1">
                            <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Enterprise</p>
                          </div>
                          {user?.role === 'admin' && (
                            <Link
                              to="/admin"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors"
                            >
                              <Shield className="w-4 h-4" />
                              <div className="flex-1">
                                <p className="font-medium">Admin Console</p>
                                <p className="text-xs text-purple-500 dark:text-purple-400">System management</p>
                              </div>
                            </Link>
                          )}
                          <Link
                            to="/profile"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors"
                          >
                            <Users className="w-4 h-4" />
                            <div className="flex-1">
                              <p className="font-medium">Team Management</p>
                              <p className="text-xs text-purple-500 dark:text-purple-400">Manage users</p>
                            </div>
                          </Link>
                          <Link
                            to="/profile"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors"
                          >
                            <Activity className="w-4 h-4" />
                            <div className="flex-1">
                              <p className="font-medium">Activity Logs</p>
                              <p className="text-xs text-purple-500 dark:text-purple-400">Audit trail</p>
                            </div>
                          </Link>
                        </div>
                      )}

                      {/* App Info */}
                      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                          <span>Version 2.0.0</span>
                          <span>&copy; {new Date().getFullYear()} Circuvent Technologies</span>
                        </div>
                      </div>

                      {/* Logout */}
                      <div className="border-t border-slate-200 dark:border-slate-700">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors font-medium"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className={`pt-16 min-h-screen transition-all duration-300 ${
          isCollapsed ? 'lg:ml-20' : 'lg:ml-72'
        }`}>
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </>
  );
};

export default MainLayout;
