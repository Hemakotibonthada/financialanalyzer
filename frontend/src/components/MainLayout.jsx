import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
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
  Building2
} from 'lucide-react';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';

/**
 * MainLayout Component
 * Provides consistent layout structure with sidebar, header, and main content area
 * Handles responsive design for mobile, tablet, and desktop
 */
const MainLayout = ({ children, title, subtitle, headerActions }) => {
  const { user, logout } = useAuth();
  const { isCollapsed } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  useEffect(() => {
    // Close profile dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setProfileDropdownOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="min-h-screen bg-gray-50">
        {/* Fixed Header */}
        <header className={`bg-white border-b border-gray-200 fixed top-0 right-0 left-0 z-40 shadow-sm transition-all duration-300 ${
          isCollapsed ? 'lg:left-20' : 'lg:left-72'
        }`}>
          <div className="px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Page Title */}
              <div className="flex-1 min-w-0">
                {title && (
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 truncate">{title}</h1>
                    {subtitle && (
                      <p className="text-sm text-gray-500 truncate">{subtitle}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Header Actions (Custom buttons from pages) */}
              {headerActions && (
                <div className="hidden sm:flex items-center gap-2">
                  {headerActions}
                </div>
              )}

              {/* Right Side Actions */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Notifications */}
                <NotificationBell />
                
                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Profile Dropdown */}
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-all"
                    aria-label="Open profile menu"
                    aria-expanded={profileDropdownOpen}
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md ring-2 ring-white">
                      {user?.name ? user.name.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <ChevronDown className={`hidden sm:block h-4 w-4 text-gray-600 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 max-h-[85vh] overflow-y-auto">
                      {/* Company Branding */}
                      <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="w-5 h-5" />
                          <span className="font-bold text-sm">Circuvent Technologies</span>
                        </div>
                        <p className="text-xs text-blue-100">Enterprise Financial Management</p>
                      </div>

                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                            {user?.name ? user.name.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{user?.name || user?.email?.split('@')[0] || 'User'}</p>
                            <p className="text-xs text-gray-600 truncate">{user?.email || 'No email'}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full capitalize">
                            {user?.role || 'user'}
                          </span>
                          <span className="text-xs text-gray-500">ID: {user?._id?.slice(-6) || user?.id?.slice(-6) || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Account Section */}
                      <div className="py-2">
                        <div className="px-4 py-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Account</p>
                        </div>
                        <Link
                          to="/profile"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          <User className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">Profile Settings</p>
                            <p className="text-xs text-gray-500">Manage your account</p>
                          </div>
                        </Link>
                        <Link
                          to="/profile"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          <Bell className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">Notifications</p>
                            <p className="text-xs text-gray-500">Alerts & preferences</p>
                          </div>
                        </Link>
                        <Link
                          to="/profile"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          <Lock className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">Security & Privacy</p>
                            <p className="text-xs text-gray-500">Password & 2FA</p>
                          </div>
                        </Link>
                      </div>

                      {/* Preferences Section */}
                      <div className="py-2 border-t border-gray-200">
                        <div className="px-4 py-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Preferences</p>
                        </div>
                        <Link
                          to="/profile"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">General Settings</p>
                            <p className="text-xs text-gray-500">App configuration</p>
                          </div>
                        </Link>
                        <Link
                          to="/profile"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          <Palette className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">Appearance</p>
                            <p className="text-xs text-gray-500">Theme & display</p>
                          </div>
                        </Link>
                        <Link
                          to="/profile"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          <Globe className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">Language & Region</p>
                            <p className="text-xs text-gray-500">Localization</p>
                          </div>
                        </Link>
                      </div>

                      {/* Data & Integrations */}
                      <div className="py-2 border-t border-gray-200">
                        <div className="px-4 py-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Data & Integrations</p>
                        </div>
                        <Link
                          to="/import-export"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          <Database className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">Data Management</p>
                            <p className="text-xs text-gray-500">Import & export</p>
                          </div>
                        </Link>
                        <Link
                          to="/profile"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          <Key className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">API & Integrations</p>
                            <p className="text-xs text-gray-500">Connect services</p>
                          </div>
                        </Link>
                        <Link
                          to="/profile"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">Backup & Restore</p>
                            <p className="text-xs text-gray-500">Data protection</p>
                          </div>
                        </Link>
                      </div>

                      {/* Help & Support */}
                      <div className="py-2 border-t border-gray-200">
                        <div className="px-4 py-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Help & Support</p>
                        </div>
                        <Link
                          to="/help"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          <HelpCircle className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">Help Center</p>
                            <p className="text-xs text-gray-500">FAQs & guides</p>
                          </div>
                        </Link>
                        <Link
                          to="/docs"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          <BookOpen className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">Documentation</p>
                            <p className="text-xs text-gray-500">User manual</p>
                          </div>
                        </Link>
                        <Link
                          to="/contact"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">Contact Support</p>
                            <p className="text-xs text-gray-500">Get assistance</p>
                          </div>
                        </Link>
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            // Open feedback modal
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors w-full text-left"
                        >
                          <FileQuestion className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">Send Feedback</p>
                            <p className="text-xs text-gray-500">Share your thoughts</p>
                          </div>
                        </button>
                      </div>

                      {/* Enterprise Features (Admin/Lender only) */}
                      {(user?.role === 'admin' || user?.role === 'lender') && (
                        <div className="py-2 border-t border-gray-200 bg-purple-50">
                          <div className="px-4 py-1">
                            <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Enterprise</p>
                          </div>
                          {user?.role === 'admin' && (
                            <Link
                              to="/admin"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-purple-700 hover:bg-purple-100 transition-colors"
                            >
                              <Shield className="w-4 h-4" />
                              <div className="flex-1">
                                <p className="font-medium">Admin Console</p>
                                <p className="text-xs text-purple-600">System management</p>
                              </div>
                            </Link>
                          )}
                          <Link
                            to="/profile"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-purple-700 hover:bg-purple-100 transition-colors"
                          >
                            <Users className="w-4 h-4" />
                            <div className="flex-1">
                              <p className="font-medium">Team Management</p>
                              <p className="text-xs text-purple-600">Manage users</p>
                            </div>
                          </Link>
                          <Link
                            to="/profile"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-purple-700 hover:bg-purple-100 transition-colors"
                          >
                            <Activity className="w-4 h-4" />
                            <div className="flex-1">
                              <p className="font-medium">Activity Logs</p>
                              <p className="text-xs text-purple-600">Audit trail</p>
                            </div>
                          </Link>
                        </div>
                      )}

                      {/* App Info */}
                      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Version 2.0.0</span>
                          <span>© 2025 Circuvent Technologies</span>
                        </div>
                      </div>

                      {/* Logout */}
                      <div className="border-t border-gray-200 pt-2">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
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

        {/* Main Content with proper spacing for fixed header and sidebar */}
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
