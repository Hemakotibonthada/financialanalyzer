import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { BarChart3, TrendingUp, DollarSign, FileText, Plus, LogOut, User, RefreshCw, Mail, Sparkles, CreditCard, Shield, Search, Upload, Target, PieChart, Wallet, Menu, X, ChevronDown, Home, LayoutDashboard } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import NotificationBell from '../components/NotificationBell';
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
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownOpen && !event.target.closest('.profile-dropdown')) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileDropdownOpen]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get('/analytics/dashboard');
      setDashboardData(response.data.data);
      
    } catch (error) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', error);
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
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header */}
      <nav className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-3">
              <div className="bg-white p-2 rounded-lg shadow-md">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Financial Analyzer</h1>
                <p className="text-xs text-blue-100 hidden sm:block">Smart Money Management</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-2">
              <Link 
                to="/dashboard" 
                className="flex items-center px-3 py-2 text-white hover:bg-white/20 rounded-lg transition-all"
              >
                <Home className="w-4 h-4 mr-1.5" />
                Dashboard
              </Link>
              
              <Link 
                to="/search" 
                className="flex items-center px-3 py-2 text-white hover:bg-white/20 rounded-lg transition-all"
              >
                <Search className="w-4 h-4 mr-1.5" />
                Search
              </Link>
              
              <Link 
                to="/emi-tracker" 
                className="flex items-center px-3 py-2 text-white hover:bg-white/20 rounded-lg transition-all"
              >
                <CreditCard className="w-4 h-4 mr-1.5" />
                EMI
              </Link>
              
              <Link 
                to="/investments" 
                className="flex items-center px-3 py-2 text-white hover:bg-white/20 rounded-lg transition-all"
              >
                <PieChart className="w-4 h-4 mr-1.5" />
                Investments
              </Link>
              
              <Link 
                to="/goals" 
                className="flex items-center px-3 py-2 text-white hover:bg-white/20 rounded-lg transition-all"
              >
                <Target className="w-4 h-4 mr-1.5" />
                Goals
              </Link>
              
              <Link 
                to="/networth" 
                className="flex items-center px-3 py-2 text-white hover:bg-white/20 rounded-lg transition-all"
              >
                <Wallet className="w-4 h-4 mr-1.5" />
                Net Worth
              </Link>
              
              {(user?.role === 'lender' || user?.role === 'admin') && (
                <Link 
                  to="/lender-dashboard" 
                  className="flex items-center px-3 py-2 text-white hover:bg-white/20 rounded-lg transition-all"
                >
                  <DollarSign className="w-4 h-4 mr-1.5" />
                  Lender
                </Link>
              )}
              
              <Link 
                to="/advanced-analytics" 
                className="flex items-center px-3 py-2 text-white hover:bg-white/20 rounded-lg transition-all"
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                Analytics
              </Link>

              {user?.role === 'admin' && (
                <Link 
                  to="/admin" 
                  className="flex items-center px-3 py-2 bg-white/10 text-white border border-white/30 rounded-lg hover:bg-white/20 transition-all"
                >
                  <Shield className="w-4 h-4 mr-1.5" />
                  Admin
                </Link>
              )}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-3">
              <Link 
                to="/import-export" 
                className="hidden md:flex items-center px-3 py-2 text-white hover:bg-white/20 rounded-lg transition-all"
              >
                <Upload className="w-4 h-4 mr-1.5" />
                Import
              </Link>
              
              <NotificationBell />
              <ThemeToggle />
              
              {/* Profile Dropdown */}
              <div className="relative profile-dropdown">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center space-x-2 px-3 py-2 text-white hover:bg-white/20 rounded-lg transition-all"
                >
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="hidden md:block font-medium">{user?.name?.split(' ')[0]}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {/* Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                      <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {user?.role}
                      </span>
                    </div>
                    
                    <Link 
                      to="/profile" 
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      <User className="w-4 h-4 mr-3 text-gray-400" />
                      My Profile
                    </Link>
                    
                    <button 
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Logout
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-white hover:bg-white/20 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden pb-4 space-y-2 animate-in slide-in-from-top">
              <Link 
                to="/dashboard" 
                className="block px-3 py-2 text-white hover:bg-white/20 rounded-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Home className="w-4 h-4 inline mr-2" />
                Dashboard
              </Link>
              
              <Link 
                to="/search" 
                className="block px-3 py-2 text-white hover:bg-white/20 rounded-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Search className="w-4 h-4 inline mr-2" />
                Search
              </Link>
              
              <Link 
                to="/import-export" 
                className="block px-3 py-2 text-white hover:bg-white/20 rounded-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Import/Export
              </Link>
              
              <Link 
                to="/emi-tracker" 
                className="block px-3 py-2 text-white hover:bg-white/20 rounded-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                <CreditCard className="w-4 h-4 inline mr-2" />
                EMI Tracker
              </Link>
              
              <Link 
                to="/investments" 
                className="block px-3 py-2 text-white hover:bg-white/20 rounded-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                <PieChart className="w-4 h-4 inline mr-2" />
                Investments
              </Link>
              
              <Link 
                to="/goals" 
                className="block px-3 py-2 text-white hover:bg-white/20 rounded-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Target className="w-4 h-4 inline mr-2" />
                Financial Goals
              </Link>
              
              <Link 
                to="/networth" 
                className="block px-3 py-2 text-white hover:bg-white/20 rounded-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Wallet className="w-4 h-4 inline mr-2" />
                Net Worth
              </Link>
              
              {(user?.role === 'lender' || user?.role === 'admin') && (
                <Link 
                  to="/lender-dashboard" 
                  className="block px-3 py-2 text-white hover:bg-white/20 rounded-lg transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <DollarSign className="w-4 h-4 inline mr-2" />
                  Lender Dashboard
                </Link>
              )}
              
              <Link 
                to="/advanced-analytics" 
                className="block px-3 py-2 text-white hover:bg-white/20 rounded-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Sparkles className="w-4 h-4 inline mr-2" />
                Advanced Analytics
              </Link>

              {user?.role === 'admin' && (
                <Link 
                  to="/admin" 
                  className="block px-3 py-2 bg-white/10 text-white border border-white/30 rounded-lg hover:bg-white/20 transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Shield className="w-4 h-4 inline mr-2" />
                  Admin Panel
                </Link>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Dashboard Header with Actions */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name}!</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
              <p className="text-gray-600 mt-1">
                {dashboardData?.summary?.lastSyncDate ? 
                  `Last sync: ${new Date(dashboardData.summary.lastSyncDate).toLocaleString()}` :
                  'Here\'s your comprehensive financial overview'
                }
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 shadow-sm transition-all"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={triggerGmailSync}
                disabled={refreshing}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 shadow-sm transition-all"
              >
                <Mail className="h-4 w-4 mr-2" />
                Sync Gmail
              </button>
              <Link
                to="/analyze"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-sm transition-all"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Analysis
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      </div>

      {/* Quick Expense Entry - Floating Button */}
      <QuickExpenseEntry onExpenseAdded={fetchDashboardData} />
    </div>
  );
};

export default Dashboard;
