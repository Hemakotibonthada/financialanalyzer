import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { BarChart3, TrendingUp, DollarSign, FileText, Plus, LogOut, User, RefreshCw, Mail, Sparkles, CreditCard } from 'lucide-react';
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-blue-600">Financial Analyzer</h1>
            <div className="flex items-center space-x-4">
              <Link 
                to="/emi-tracker" 
                className="flex items-center px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              >
                <CreditCard className="w-5 h-5 mr-1" />
                EMI Tracker
              </Link>
              <Link 
                to="/advanced-analytics" 
                className="flex items-center px-3 py-2 text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-sm"
              >
                <Sparkles className="w-5 h-5 mr-1" />
                Advanced Analytics
              </Link>
              <Link to="/profile" className="flex items-center text-gray-700 hover:text-blue-600">
                <User className="w-5 h-5 mr-1" />
                Profile
              </Link>
              <button onClick={logout} className="flex items-center text-gray-700 hover:text-red-600">
                <LogOut className="w-5 h-5 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Dashboard Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name}!</h2>
              <p className="text-gray-600">
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
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={triggerGmailSync}
                disabled={refreshing}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <Mail className="h-4 w-4 mr-2" />
                Sync Gmail
              </button>
              <Link
                to="/analyze"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700"
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
                <div className="space-y-4">
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
