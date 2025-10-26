import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { BarChart3, TrendingUp, DollarSign, FileText, Plus, LogOut, User, RefreshCw, Mail, Sparkles, CreditCard, Shield, Search, Upload, Target, PieChart, Wallet, Menu, X, ChevronDown, Home, LayoutDashboard, Settings, Bell, Lock, HelpCircle, FileQuestion, Phone, BookOpen, Globe, Palette, Database, Key, Users, Activity, Download, Share2, Building2 } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import NotificationBell from '../components/NotificationBell';
import Sidebar from '../components/Sidebar';
import FinancialSummary from '../components/FinancialSummary';
import MonthlyTrends from '../components/MonthlyTrends';
import CategoryBreakdown from '../components/CategoryBreakdown';
import SpendingPatterns from '../components/SpendingPatterns';
import BudgetTracker from '../components/BudgetTracker';
import SavingsGoals from '../components/SavingsGoals';
import RecurringTransactions from '../components/RecurringTransactions';
import FinancialHealth from '../components/FinancialHealth';
import RecommendationsPanel from '../components/RecommendationsPanel';
import CreditScoreCard from '../components/CreditScoreCard';
import QuickExpenseEntry from '../components/QuickExpenseEntry';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  useEffect(() => {
    fetchDashboardData();
    
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get('/analytics/dashboard');
      setDashboardData(response.data.data);
      
    } catch (error) {
      const errorMessage = error.message || 'Failed to load dashboard data';
      setError(errorMessage);
      console.error('Dashboard error:', error);
      
      // Show user-friendly error message
      if (error.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please ensure the backend is running on port 5001.');
      } else if (error.response?.status === 500) {
        setError('Server error. Please try refreshing the page.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchDashboardData();
    } finally {
      setRefreshing(false);
    }
  };

  const triggerGmailSync = async () => {
    try {
      setRefreshing(true);
      
      // Check if user is authenticated
      if (!user) {
        alert('Please log in to continue');
        return;
      }
      
      console.log('Starting Gmail sync for user:', user);
      
      // Prepare request payload
      const payload = {
        analysisType: 'spending_analysis',
        syncGmail: true,
        dateRange: {
          startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
          endDate: new Date()
        }
      };
      
      console.log('Sending request with payload:', payload);
      
      const response = await api.post('/financial/analyze-all', payload);
      
      if (response.data.success) {
        console.log('Gmail sync started successfully:', response.data);
        alert('Gmail sync started! Analysis is running in the background.');
        // Wait a moment then refresh dashboard
        setTimeout(() => {
          fetchDashboardData();
        }, 2000);
      }
    } catch (error) {
      console.error('Gmail sync error:', error);
      console.error('Error response:', error.response?.data);
      const requiresReauth = error.response?.data?.requiresReauth || error.response?.data?.details?.gmailSyncRequiresReauth;
      const apiMessage = error.response?.data?.message;
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        const message = apiMessage || 'Bad request';
        if (requiresReauth) {
          alert('Gmail permissions have expired. Please disconnect and reconnect Gmail in the Profile page to continue.');
        } else if (message.includes('profile')) {
          alert(`Please set up your profile first. Go to Profile page to complete setup.`);
        } else {
          alert(`Gmail sync failed: ${message}`);
        }
      } else if (error.response?.status === 401) {
        if (requiresReauth) {
          alert('Gmail permissions have expired. Please disconnect and reconnect Gmail in the Profile page to continue.');
        } else {
          alert('Authentication failed. Please log in again.');
          logout();
        }
      } else {
        alert(`Gmail sync failed: ${apiMessage || error.message}`);
      }
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your financial dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Dashboard</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="lg:ml-72 min-h-screen bg-gray-50 pb-8">
        {/* Clean Header - Only Essential Items */}
        <header className="bg-white border-b border-gray-200 fixed top-0 right-0 left-0 lg:left-72 z-40 shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              {/* Page Title */}
              <div className="flex items-center space-x-4">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
                  <p className="text-sm text-gray-500">Welcome back, {user?.name}!</p>
                </div>
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center space-x-3">
                {/* Notifications */}
                <NotificationBell />
                
                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Quick Actions Dropdown */}
                <div className="hidden sm:flex items-center space-x-2">
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-all"
                    title="Refresh Data"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                  
                  <button
                    onClick={triggerGmailSync}
                    disabled={refreshing}
                    className="inline-flex items-center px-3 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all"
                    title="Sync Gmail"
                  >
                    <Mail className="h-4 w-4" />
                  </button>
                  
                  <Link
                    to="/analyze"
                    className="inline-flex items-center px-3 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-all"
                    title="New Analysis"
                  >
                    <Plus className="h-4 w-4" />
                  </Link>
                </div>

                {/* Profile Dropdown */}
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-100 transition-all"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 max-h-[85vh] overflow-y-auto">
                      {/* Company Branding */}
                      <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <Building2 className="w-5 h-5" />
                          <span className="font-bold text-sm">Circuvent Technologies</span>
                        </div>
                        <p className="text-xs text-blue-100">Enterprise Financial Management</p>
                      </div>

                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                            {user?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{user?.name}</p>
                            <p className="text-xs text-gray-600 truncate">{user?.email}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                            {user?.role}
                          </span>
                          <span className="text-xs text-gray-500">ID: {user?._id?.slice(-6)}</span>
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
                          className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
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
                          className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
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
                          className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
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
                          className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
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
                          className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
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
                          className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
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
                          className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
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
                          className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
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
                          className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
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
                          className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
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
                          className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
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
                          className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
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
                          className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors w-full"
                        >
                          <FileQuestion className="w-4 h-4" />
                          <div className="flex-1 text-left">
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
                              className="flex items-center space-x-3 px-4 py-2.5 text-sm text-purple-700 hover:bg-purple-100 transition-colors"
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
                            className="flex items-center space-x-3 px-4 py-2.5 text-sm text-purple-700 hover:bg-purple-100 transition-colors"
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
                            className="flex items-center space-x-3 px-4 py-2.5 text-sm text-purple-700 hover:bg-purple-100 transition-colors"
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
                          className="flex items-center space-x-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
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

        {/* Dashboard Content */}
        <main className="pt-20 px-4 sm:px-6 lg:px-8 py-8">
          {/* Financial Summary */}
          <div className="mb-8">
            <FinancialSummary summary={dashboardData?.summary} />
          </div>

          {/* Financial Health Score */}
          <div className="mb-8">
            <FinancialHealth healthData={dashboardData?.charts?.financialHealth} />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Monthly Trends */}
            <div className="lg:col-span-2">
              <MonthlyTrends trendsData={dashboardData?.charts?.monthlyTrends} />
            </div>
            
            {/* Category Breakdown */}
            <div>
              <CategoryBreakdown categoryData={dashboardData?.charts?.categoryBreakdown} />
            </div>
            
            {/* Spending Patterns */}
            <div>
              <SpendingPatterns patternsData={dashboardData?.charts?.spendingPatterns} />
            </div>
          </div>

          {/* Budget, Savings, and Credit Score */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <BudgetTracker budgetData={dashboardData?.charts?.budgetAnalysis} />
            <SavingsGoals savingsData={dashboardData?.insights?.savingsGoals} />
            <CreditScoreCard />
          </div>

          {/* Insights Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recommendations */}
            <div className="lg:col-span-2">
              <RecommendationsPanel recommendations={dashboardData?.insights?.recommendations} />
            </div>
            
            {/* Recurring Transactions */}
            <div>
              <RecurringTransactions recurringData={dashboardData?.insights?.recurringTransactions} />
            </div>
          </div>

          {/* Recent Activity */}
          {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 && (
            <div className="mt-8">
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Recent Analysis Activity</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {dashboardData.recentActivity.slice(0, 5).map((activity) => (
                      <div key={activity._id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                        <div className="flex items-center space-x-3">
                          <div className={`h-2 w-2 rounded-full ${
                            activity.status === 'completed' ? 'bg-green-500' : 
                            activity.status === 'processing' ? 'bg-yellow-500' : 
                            activity.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                          }`}></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 capitalize">
                              {activity.analysisType?.replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-gray-500">
                              {activity.status === 'completed' && activity.transactionsAnalyzed ? 
                                `${activity.transactionsAnalyzed} transactions analyzed` : 
                                activity.status === 'processing' ? 'Processing...' :
                                activity.status === 'failed' ? 'Failed' :
                                'Pending...'
                              }
                            </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          {activity.status === 'completed' && activity.summary?.totalExpenses ? 
                            `₹${activity.summary.totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : 
                            '-'
                          }
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(activity.createdAt).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          )}
        </main>

        {/* Quick Expense Entry - Floating Button */}
        <QuickExpenseEntry onExpenseAdded={fetchDashboardData} />
      </div>
    </>
  );
};

export default Dashboard;
