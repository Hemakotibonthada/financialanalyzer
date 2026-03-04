import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { Plus, RefreshCw, Mail, AlertCircle } from 'lucide-react';
import MainLayout from '../components/MainLayout';
import {
  PageShell, PageLoader, EmptyPlaceholder, ThemeButton
} from '../components/ui/ThemePageComponents';
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
import QuickIncomeEntry from '../components/QuickIncomeEntry';
import NewFeaturesShowcase from '../components/NewFeaturesShowcase';
import AIFinancialPredictions from '../components/AIFinancialPredictions';
import { FadeIn, StaggerChildren, CardSkeleton, PageTransition } from '../components/ui/AnimatedComponents';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { mode, accent } = useTheme();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const isDark = mode === 'dark' || mode === 'black';
  const isBlack = mode === 'black';
  const p = useMemo(() => ({
    bg: isBlack ? 'bg-black' : isDark ? 'bg-slate-950' : 'bg-gray-50',
    card: isBlack ? 'bg-zinc-900 border-zinc-800' : isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200',
    text: isBlack ? 'text-zinc-100' : isDark ? 'text-slate-100' : 'text-gray-900',
    textSub: isBlack ? 'text-zinc-400' : isDark ? 'text-slate-400' : 'text-gray-600',
    textMuted: isBlack ? 'text-zinc-500' : isDark ? 'text-slate-500' : 'text-gray-500',
    border: isBlack ? 'border-zinc-800' : isDark ? 'border-slate-700' : 'border-gray-200',
    btnBg: isBlack ? 'bg-zinc-800 hover:bg-zinc-700' : isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-gray-50',
    btnBorder: isBlack ? 'border-zinc-700' : isDark ? 'border-slate-600' : 'border-gray-300',
  }), [isDark, isBlack]);

  useEffect(() => {
    fetchDashboardData(true); // Always fetch fresh data on page load
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchDashboardData(true);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchDashboardData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get('/analytics/dashboard', {
        params: forceRefresh ? { refresh: 'true' } : {}
      });
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
      <PageShell>
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <CardSkeleton key={i} lines={2} />)}
          </div>
          <CardSkeleton lines={6} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CardSkeleton lines={8} />
            <CardSkeleton lines={8} />
          </div>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <EmptyPlaceholder
              icon={AlertCircle}
              title="Unable to Load Dashboard"
              message={error}
            />
            <div className="flex justify-center mt-6">
              <ThemeButton onClick={fetchDashboardData} icon={RefreshCw}>
                Try Again
              </ThemeButton>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  // Header action buttons
  const headerActions = (
    <>
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className={`inline-flex items-center gap-2 px-3 py-2 border ${p.btnBorder} rounded-lg text-sm font-medium ${p.textSub} ${p.btnBg} disabled:opacity-50 transition-all`}
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
      <PageTransition>
      {/* Financial Summary */}
      <FadeIn direction="up" delay={0}>
      <div className="mb-6">
        <FinancialSummary summary={dashboardData?.summary} />
      </div>
      </FadeIn>

      {/* Financial Health Score */}
      <FadeIn direction="up" delay={100}>
      <div className="mb-6">
        <FinancialHealth healthData={dashboardData?.charts?.financialHealth} />
      </div>
      </FadeIn>

      {/* AI Financial Predictions */}
      <FadeIn direction="up" delay={150}>
      <div className="mb-6">
        <AIFinancialPredictions />
      </div>
      </FadeIn>

      {/* Charts Grid */}
      <StaggerChildren staggerMs={80} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
            } else if (rawMonthly && !rawMonthly.trends && !Array.isArray(rawMonthly)) {
              monthlyProp = {
                trends: [],
                summary: rawMonthly
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
      </StaggerChildren>

      {/* Budget, Savings, and Credit Score */}
      <StaggerChildren staggerMs={100} className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <BudgetTracker budgetData={dashboardData?.charts?.budgetAnalysis} />
        <SavingsGoals savingsData={dashboardData?.insights?.savingsGoals} />
        <CreditScoreCard />
      </StaggerChildren>

      {/* Insights Section */}
      <FadeIn direction="up" delay={300}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <RecommendationsPanel recommendations={dashboardData?.insights?.recommendations} />
        </div>
        <div>
          <RecurringTransactions recurringData={dashboardData?.insights?.recurringTransactions} />
        </div>
      </div>
      </FadeIn>

      {/* New Features Showcase */}
      <FadeIn direction="up" delay={350}>
      <div className="mb-6">
        <NewFeaturesShowcase />
      </div>
      </FadeIn>

      {/* Recent Activity */}
      {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 && (
        <FadeIn direction="up" delay={400}>
        <div className={`${p.card} border rounded-xl shadow-sm transition-all duration-300 hover:shadow-lg`}>
          <div className={`px-6 py-4 border-b ${p.border}`}>
            <h3 className={`text-lg font-medium ${p.text}`}>Recent Analysis Activity</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {dashboardData.recentActivity.slice(0, 5).map((activity) => (
                <div key={activity._id} className={`flex items-center justify-between py-3 border-b ${p.border} last:border-0`}>
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      activity.status === 'completed' ? 'bg-green-500' : 
                      activity.status === 'processing' ? 'bg-yellow-500' : 
                      activity.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                    }`}></div>
                    <div>
                      <p className={`text-sm font-medium ${p.text} capitalize`}>
                        {activity.analysisType?.replace(/_/g, ' ')}
                      </p>
                      <p className={`text-xs ${p.textMuted}`}>
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
                    <p className={`text-sm ${p.textSub}`}>
                      {activity.status === 'completed' && activity.summary?.totalExpenses ? 
                        `₹${activity.summary.totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : 
                        '-'
                      }
                    </p>
                    <p className={`text-xs ${p.textMuted}`}>
                      {new Date(activity.createdAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </FadeIn>
      )}

      {/* Quick Entry Components */}
      <QuickExpenseEntry onExpenseAdded={fetchDashboardData} />
      <QuickIncomeEntry onIncomeAdded={fetchDashboardData} />
      </PageTransition>
    </MainLayout>
  );
};



export default Dashboard;
