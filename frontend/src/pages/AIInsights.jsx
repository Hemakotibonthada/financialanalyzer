import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Calendar,
  Repeat,
  Target,
  ArrowRight,
  RefreshCw,
  ChevronRight,
  Zap,
  Shield,
  PiggyBank,
  CreditCard,
  TrendingDown
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useSidebar } from '../context/SidebarContext';

const AIInsights = () => {
  const { isCollapsed } = useSidebar();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetchInsights();
  }, [period]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/insights?period=${period}`);
      setInsights(response.data);
    } catch (err) {
      console.error('Error fetching insights:', err);
      setError('Failed to load insights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Sidebar />
        <div className={`${isCollapsed ? 'lg:ml-20' : 'lg:ml-72'} min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center transition-all duration-300`}>
          <div className="text-center">
            <RefreshCw className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-slate-400 font-medium">Analyzing your financial data...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Sidebar />
        <div className={`${isCollapsed ? 'lg:ml-20' : 'lg:ml-72'} min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-3 sm:p-8 transition-all duration-300`}>
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-red-800 dark:text-red-400 mb-2">Error Loading Insights</h3>
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button
                onClick={fetchInsights}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!insights) return null;

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'medium': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      default: return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="w-6 h-6 text-red-600" />;
      case 'medium': return <Lightbulb className="w-6 h-6 text-yellow-600" />;
      default: return <CheckCircle className="w-6 h-6 text-blue-600" />;
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'savings': return <PiggyBank className="w-5 h-5" />;
      case 'expenses': return <TrendingDown className="w-5 h-5" />;
      case 'debt': return <CreditCard className="w-5 h-5" />;
      case 'investment': return <TrendingUp className="w-5 h-5" />;
      case 'security': return <Shield className="w-5 h-5" />;
      case 'subscriptions': return <Repeat className="w-5 h-5" />;
      default: return <Target className="w-5 h-5" />;
    }
  };

  return (
    <>
      <Sidebar />
      <div className={`${isCollapsed ? 'lg:ml-20' : 'lg:ml-72'} min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-3 sm:p-6 transition-all duration-300`}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
                  <Zap className="w-10 h-10 text-indigo-600 mr-3" />
                  AI-Powered Financial Insights
                </h1>
                <p className="text-gray-600 dark:text-slate-400">Personalized recommendations based on your financial behavior</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="year">Last Year</option>
                </select>
                <button
                  onClick={fetchInsights}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg dark:shadow-slate-900/30 p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-green-600" />
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {insights.savingsRate.toFixed(1)}%
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-slate-400">Savings Rate</h3>
              <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                ₹{insights.savings.toLocaleString()} saved
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg dark:shadow-slate-900/30 p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="w-8 h-8 text-blue-600" />
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  ₹{(insights.totalExpenses / 1000).toFixed(1)}K
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Expenses</h3>
              <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                {period === 'week' ? 'This week' : period === 'month' ? 'This month' : 'This year'}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg dark:shadow-slate-900/30 p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-2">
                <Repeat className="w-8 h-8 text-purple-600" />
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {insights.recurringTransactions?.length || 0}
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-slate-400">Recurring Payments</h3>
              <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                ₹{insights.recurringTransactions?.reduce((sum, t) => sum + t.averageAmount, 0).toLocaleString() || 0}/mo
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg dark:shadow-slate-900/30 p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between mb-2">
                <CreditCard className="w-8 h-8 text-orange-600" />
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {insights.emiSummary?.emiToIncomeRatio || 0}%
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-slate-400">EMI Burden</h3>
              <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                ₹{insights.emiSummary?.totalMonthlyEMI?.toLocaleString() || 0}/mo
              </p>
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl dark:shadow-slate-900/30 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-3 mr-4">
                <Lightbulb className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI Recommendations</h2>
                <p className="text-gray-600 dark:text-slate-400">Personalized insights to improve your financial health</p>
              </div>
            </div>

            {insights.recommendations && insights.recommendations.length > 0 ? (
              <div className="space-y-4">
                {insights.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className={`border-l-4 rounded-xl p-6 transition-all hover:shadow-lg ${getPriorityColor(rec.priority)}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getPriorityIcon(rec.priority)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                              {rec.icon} {rec.title}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              rec.priority === 'high' ? 'bg-red-200 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                              rec.priority === 'medium' ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-blue-200 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                              {rec.priority.toUpperCase()}
                            </span>
                            <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-slate-400">
                              {getCategoryIcon(rec.category)}
                              {rec.category}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-700 dark:text-slate-300 mb-4">{rec.description}</p>

                        {rec.actionItems && rec.actionItems.length > 0 && (
                          <div className="bg-white dark:bg-slate-700/50 rounded-lg p-4 mb-3">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                              <Target className="w-4 h-4" />
                              Action Steps:
                            </h4>
                            <ul className="space-y-2">
                              {rec.actionItems.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-300">
                                  <ChevronRight className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {rec.potentialSavings > 0 && (
                          <div className="flex items-center gap-2 text-green-700 font-semibold">
                            <DollarSign className="w-5 h-5" />
                            Potential Savings: ₹{rec.potentialSavings.toLocaleString()}
                          </div>
                        )}

                        {rec.potentialGains > 0 && (
                          <div className="flex items-center gap-2 text-green-700 font-semibold">
                            <TrendingUp className="w-5 h-5" />
                            Potential Annual Gains: ₹{rec.potentialGains.toLocaleString()} (12% return)
                          </div>
                        )}

                        {rec.targetAmount && (
                          <div className="mt-3 bg-white dark:bg-slate-700/50 rounded-lg p-3">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-600 dark:text-slate-400">Progress</span>
                              <span className="font-semibold text-gray-900 dark:text-white">
                                ₹{rec.currentAmount.toLocaleString()} / ₹{rec.targetAmount.toLocaleString()}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min((rec.currentAmount / rec.targetAmount) * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Great job!</h3>
                <p className="text-gray-600 dark:text-slate-400">Your finances are in excellent shape. Keep up the good work!</p>
              </div>
            )}
          </div>

          {/* Recurring Transactions */}
          {insights.recurringTransactions && insights.recurringTransactions.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl dark:shadow-slate-900/30 p-8">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-3 mr-4">
                  <Repeat className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recurring Transactions Detected</h2>
                  <p className="text-gray-600 dark:text-slate-400">AI-detected patterns in your spending</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {insights.recurringTransactions.map((transaction, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-lg transition-all hover:border-purple-300"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-600" />
                        <h3 className="font-bold text-gray-900 dark:text-white capitalize">
                          {transaction.merchant}
                        </h3>
                      </div>
                      {transaction.isSubscription && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-xs font-semibold rounded">
                          Subscription
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-slate-400">Amount</span>
                        <span className="font-bold text-gray-900 dark:text-white">₹{transaction.averageAmount.toLocaleString()}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-slate-400">Frequency</span>
                        <span className="capitalize text-gray-900 dark:text-white font-medium">{transaction.frequency}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-slate-400">Confidence</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 dark:bg-slate-600 rounded-full h-1.5">
                            <div
                              className="bg-purple-600 h-1.5 rounded-full"
                              style={{ width: `${transaction.confidence}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">{transaction.confidence}%</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-slate-400">Occurrences</span>
                        <span className="text-gray-900 dark:text-white font-medium">{transaction.occurrences}x</span>
                      </div>

                      <div className="pt-2 border-t border-gray-200 dark:border-slate-700">
                        <div className="text-xs text-gray-500 dark:text-slate-500">
                          Next expected: {new Date(transaction.nextExpectedDate).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AIInsights;
