import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, RefreshCw, Mail } from 'lucide-react';
import MainLayout from '../components/MainLayout';
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
import NewFeaturesShowcase from '../components/NewFeaturesShowcase';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchDashboardData();
    } finally {
      setRefreshing(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get('/analytics/dashboard');
      // Debug: log response shape to help diagnose empty/zero charts
      if (typeof window !== 'undefined' && (import.meta.env.DEV || import.meta.env.MODE === 'development')) {
        // eslint-disable-next-line no-console
        console.debug('[runtime] fetchDashboardData - API baseURL:', api.defaults.baseURL);
        // eslint-disable-next-line no-console
        console.debug('[runtime] fetchDashboardData - response keys:', Object.keys(response.data || {}));
        // eslint-disable-next-line no-console
        console.debug('[runtime] fetchDashboardData - dashboardData keys:', response.data?.data ? Object.keys(response.data.data) : 'no-data');
        // log monthlyTrends length/shape if available
        const monthly = response.data?.data?.charts?.monthlyTrends;
        // eslint-disable-next-line no-console
        console.debug('[runtime] fetchDashboardData - monthlyTrends type/len:', Array.isArray(monthly) ? `array(${monthly.length})` : typeof monthly, monthly && (monthly.length || Object.keys(monthly || {}).length));
      }

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

  // Header action buttons
  const headerActions = (
    <>
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-all"
        title="Refresh Data"
      >
        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        <span className="hidden md:inline">Refresh</span>
      </button>
      
      <button
        onClick={triggerGmailSync}
        disabled={refreshing}
        className="inline-flex items-center gap-2 px-3 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all"
        title="Sync Gmail"
      >
        <Mail className="h-4 w-4" />
        <span className="hidden md:inline">Sync Gmail</span>
      </button>
      
      <button
        onClick={() => navigate('/analyze')}
        className="inline-flex items-center gap-2 px-3 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-all"
        title="New Analysis"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden md:inline">New Analysis</span>
      </button>
    </>
  );

  return (
    <MainLayout
      title="Dashboard"
      subtitle={`Welcome back, ${user?.name}!`}
      headerActions={headerActions}
    >
      {/* Financial Summary */}
      <div className="mb-6">
        <FinancialSummary summary={dashboardData?.summary} />
      </div>

      {/* Financial Health Score */}
      <div className="mb-6">
        <FinancialHealth healthData={dashboardData?.charts?.financialHealth} />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Trends */}
        <div className="lg:col-span-2">
          {(() => {
            const rawMonthly = dashboardData?.charts?.monthlyTrends;
            let monthlyProp = rawMonthly;
            if (Array.isArray(rawMonthly)) {
              monthlyProp = {
                trends: rawMonthly,
                summary: dashboardData?.summary || {}
              };
            }
            return <MonthlyTrends trendsData={monthlyProp} />;
          })()}
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <BudgetTracker budgetData={dashboardData?.charts?.budgetAnalysis} />
        <SavingsGoals savingsData={dashboardData?.insights?.savingsGoals} />
        <CreditScoreCard />
      </div>

      {/* Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <RecommendationsPanel recommendations={dashboardData?.insights?.recommendations} />
        </div>
        <div>
          <RecurringTransactions recurringData={dashboardData?.insights?.recurringTransactions} />
        </div>
      </div>

      {/* New Features Showcase */}
      <div className="mb-6">
        <NewFeaturesShowcase />
      </div>

      {/* Recent Activity */}
      {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Analysis Activity</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {dashboardData.recentActivity.slice(0, 5).map((activity) => (
                <div key={activity._id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
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
      )}

      {/* Quick Expense Entry - Floating Button */}
      <QuickExpenseEntry onExpenseAdded={fetchDashboardData} />
    </MainLayout>
  );
};



export default Dashboard;
