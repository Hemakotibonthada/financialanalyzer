import { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, AlertTriangle, Calendar, DollarSign, 
  Target, Activity, Award, Lightbulb, Zap, BarChart3, PieChart,
  Clock, MapPin, Flame, Check, X, CreditCard, TrendingDown as TrendingDownIcon,
  Percent, Users, ShoppingBag, Bell, Smartphone, Wallet, ArrowUpRight,
  ArrowDownRight, Shield, Building, Package, Receipt, Star, Info
} from 'lucide-react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Scatter,
  ScatterChart, ZAxis, ComposedChart
} from 'recharts';

import { API_URL } from '../services/api';
import MainLayout from '../components/MainLayout';
import '../styles/animations.css';

// Color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];

const AdvancedAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('forecast');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [emiData, setEmiData] = useState(null);
  const [creditScore, setCreditScore] = useState(null);
  const [budgetData, setBudgetData] = useState(null);
  const [investmentData, setInvestmentData] = useState(null);
  const [billReminders, setBillReminders] = useState([]);
  const [upiTransactions, setUpiTransactions] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAllAnalytics();
  }, []);

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      
      // Fetch all analytics data in parallel
      const [advancedRes, emiRes, profileRes, transactionsRes, billsRes] = await Promise.all([
        axios.get(`${API_URL}/analytics/advanced/complete-dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/emi/overview`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { success: false } })),
        axios.get(`${API_URL}/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { success: false } })),
        axios.get(`${API_URL}/transactions/analytics`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { success: false } })),
        axios.get(`${API_URL}/bill-reminders`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { success: false } }))
      ]);

      if (advancedRes.data.success) {
        setAnalyticsData(advancedRes.data.data);
      }

      if (emiRes.data.success) {
        setEmiData(emiRes.data.data);
      }

      if (profileRes.data.success) {
        const profile = profileRes.data.data;
        setCreditScore(profile.creditScore);
        setBudgetData({
          limits: profile.budgetLimits,
          monthlyIncome: profile.monthlyIncome
        });
      }

      if (transactionsRes.data.success) {
        const txData = transactionsRes.data.data;
        // Extract UPI and Investment data
        setUpiTransactions(txData.upiStats);
        setInvestmentData(txData.investmentCategories);
      }

      if (billsRes.data.success) {
        setBillReminders(billsRes.data.data || []);
      }

    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.response?.data?.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
    if (score >= 65) return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
    if (score >= 50) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
  };

  const getSeverityColor = (severity) => {
    if (severity === 'high') return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
    if (severity === 'medium') return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
    return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'critical' || priority === 'high') return <AlertTriangle className="w-5 h-5 text-red-500" />;
    if (priority === 'medium') return <Activity className="w-5 h-5 text-yellow-500" />;
    return <Lightbulb className="w-5 h-5 text-blue-500" />;
  };

  const getConfidenceColor = (confidence) => {
    if (confidence === 'high') return 'text-green-600';
    if (confidence === 'medium') return 'text-yellow-600';
    return 'text-gray-600 dark:text-slate-400';
  };

  if (loading) {
    return (
      <MainLayout title="Analytics" subtitle="AI-powered insights">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400">Loading advanced analytics...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="Analytics" subtitle="AI-powered insights">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 max-w-md">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-300 text-center mb-2">Error Loading Analytics</h3>
            <p className="text-red-700 dark:text-red-400 text-center">{error}</p>
            <button
              onClick={fetchAllAnalytics}
              className="mt-4 w-full bg-red-600 text-white py-2.5 rounded-xl hover:bg-red-700 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const { forecast, anomalies, heatmap, healthScore, savingsOpportunities } = analyticsData || {};

  // Helper: EMI summary for both types
  const emiSummary = emiData?.overview || {};
  const activeEMIs = emiData?.activeEMIs || [];
  const completedEMIs = emiData?.completedEMIs || [];
  const onRequestEMIs = activeEMIs.filter(e => e.repaymentType === 'ON_REQUEST');
  const monthlyEMIs = activeEMIs.filter(e => !e.repaymentType || e.repaymentType === 'MONTHLY');

  // Helper: Scrollable container class
  const scrollableClass = 'max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100';

  return (
    <MainLayout title="Advanced Analytics" subtitle="AI-powered insights into your finances">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-6 md:p-8 shadow-xl">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNEgyNHYtMmgxMnYyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
            <div className="relative flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Advanced Analytics</h1>
                <p className="text-emerald-100 mt-1">AI-powered insights into your financial patterns</p>
              </div>
            </div>
          </div>
        </div>


        {/* Advanced Financial Health Score + EMI Burden */}
        {healthScore && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 mb-6 text-white shadow-lg animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Award className="w-6 h-6" />
                  <h2 className="text-xl font-semibold">Financial Health Score</h2>
                </div>
                <p className="text-blue-100 text-sm">Based on {healthScore.factors.length} key factors (including EMI Burden)</p>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold mb-1">{healthScore.score}</div>
                <div className="text-xl font-medium">{healthScore.rating}</div>
              </div>
            </div>
            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/20">
              <div className="text-center">
                <div className="text-2xl font-bold">{healthScore.factors.length}</div>
                <div className="text-sm text-blue-100">Factors Analyzed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{healthScore.recommendations?.length || 0}</div>
                <div className="text-sm text-blue-100">Recommendations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{emiSummary.monthlyBurden ? formatCurrency(emiSummary.monthlyBurden) : '₹0'}</div>
                <div className="text-sm text-blue-100">Monthly EMI Burden</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{emiSummary.totalOutstanding ? formatCurrency(emiSummary.totalOutstanding) : '₹0'}</div>
                <div className="text-sm text-blue-100">Outstanding Debt</div>
              </div>
            </div>
            {/* EMI Burden Factor */}
            {healthScore.factors?.find(f => f.name?.toLowerCase().includes('emi')) && (
              <div className="mt-6 p-4 bg-white/10 rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <CreditCard className="w-5 h-5" />
                  <span className="font-semibold">EMI Burden Factor</span>
                </div>
                <div className="text-blue-100 text-sm">
                  {healthScore.factors.find(f => f.name?.toLowerCase().includes('emi'))?.description}
                </div>
              </div>
            )}
          </div>
        )}
        {/* EMI Analytics Section - Advanced */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* EMI Summary Card */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-900/30 p-6 flex flex-col h-full">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5" /> EMI Analytics</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">Active EMIs</div>
                <div className="text-2xl font-bold text-blue-600">{emiSummary.totalActiveEMIs || 0}</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">Completed EMIs</div>
                <div className="text-2xl font-bold text-green-600">{emiSummary.totalCompletedEMIs || 0}</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">Total Paid</div>
                <div className="text-2xl font-bold text-yellow-600">{emiSummary.totalAmountPaid ? formatCurrency(emiSummary.totalAmountPaid) : '₹0'}</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">Outstanding</div>
                <div className="text-2xl font-bold text-purple-600">{emiSummary.totalOutstanding ? formatCurrency(emiSummary.totalOutstanding) : '₹0'}</div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-blue-400" /> Monthly Burden: <span className="font-semibold">{emiSummary.monthlyBurden ? formatCurrency(emiSummary.monthlyBurden) : '₹0'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingDownIcon className="w-4 h-4 text-red-400" /> Interest Outstanding: <span className="font-semibold">{emiSummary.totalInterestOutstanding ? formatCurrency(emiSummary.totalInterestOutstanding) : '₹0'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-400" /> Principal Outstanding: <span className="font-semibold">{emiSummary.totalPrincipalOutstanding ? formatCurrency(emiSummary.totalPrincipalOutstanding) : '₹0'}</span>
              </div>
            </div>
            {/* On-Request Loans */}
            {onRequestEMIs.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="font-semibold text-blue-700 dark:text-blue-400 mb-1">On-Request Loans (Personal)</div>
                <div className={scrollableClass} style={{ maxHeight: 120 }}>
                  {onRequestEMIs.map(emi => (
                    <div key={emi.id} className="flex items-center justify-between py-1 border-b border-blue-100 dark:border-blue-800 last:border-0">
                      <span className="font-medium">{emi.merchantName || emi.cardProvider}</span>
                      <span className="text-blue-700">{formatCurrency(emi.principalAmount)}</span>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-blue-500 mt-2">These loans can be repaid anytime on request. No fixed EMI or tenure.</div>
              </div>
            )}
          </div>
          {/* EMI Progress/Charts */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-900/30 p-6 flex flex-col h-full">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5" /> EMI Progress & Charts</h2>
            {/* Example: Pie chart for EMI distribution by provider */}
            {emiData && emiData.activeEMIs && emiData.activeEMIs.length > 0 && (
              <ResponsiveContainer width="100%" height={220}>
                <RechartsPie data={Object.entries(emiData.activeEMIs.reduce((acc, emi) => {
                  const key = emi.cardProvider || 'Other';
                  acc[key] = (acc[key] || 0) + emi.principalAmount;
                  return acc;
                }, {})).map(([name, value]) => ({ name, value }))} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value">
                  {Object.entries(emiData.activeEMIs.reduce((acc, emi) => {
                    const key = emi.cardProvider || 'Other';
                    acc[key] = (acc[key] || 0) + emi.principalAmount;
                    return acc;
                  }, {})).map(([name], idx) => (
                    <Cell key={`cell-${name}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </RechartsPie>
                <Tooltip />
                <Legend />
              </ResponsiveContainer>
            )}
            {/* Scrollable Active EMI List */}
            <div className={scrollableClass + ' mt-4'} style={{ maxHeight: 160 }}>
              {monthlyEMIs.map(emi => (
                <div key={emi.id} className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-slate-700 last:border-0">
                  <span className="font-medium">{emi.merchantName || emi.cardProvider}</span>
                  <span className="text-gray-700 dark:text-slate-300">{formatCurrency(emi.emiAmount)} x {emi.totalTenure} months</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-900/30 mb-6 p-2">
          <div className="flex space-x-2 overflow-x-auto">
            {[
              { id: 'forecast', label: 'Spending Forecast', icon: TrendingUp },
              { id: 'anomalies', label: 'Anomalies', icon: AlertTriangle },
              { id: 'heatmap', label: 'Spending Heatmap', icon: Flame },
              { id: 'health', label: 'Health Factors', icon: Activity },
              { id: 'savings', label: 'Savings Opportunities', icon: Target }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Spending Forecast Tab */}
          {activeTab === 'forecast' && forecast && (
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-900/30 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">30-Day Spending Forecast</h2>
                  {forecast.confidence && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(forecast.confidence)}`}>
                      {forecast.confidence.toUpperCase()} Confidence
                    </span>
                  )}
                </div>
                
                {forecast.summary && (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">Avg Daily Spending</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(forecast.summary.avgDailySpending)}
                      </div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">Expected Monthly</div>
                      <div className="text-2xl font-bold text-purple-600">
                        {formatCurrency(forecast.summary.expectedMonthlySpending)}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">Volatility</div>
                      <div className="text-2xl font-bold text-gray-700 dark:text-slate-300">
                        {forecast.summary.volatility}
                      </div>
                    </div>
                  </div>
                )}

                {/* Forecast Timeline */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Daily Predictions</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {forecast.forecast && Array.isArray(forecast.forecast) && forecast.forecast.slice(0, 14).map((day, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                        <div className="flex items-center space-x-3">
                          <Calendar className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {new Date(day.date).toLocaleDateString('en-IN', { 
                                month: 'short', 
                                day: 'numeric',
                                weekday: 'short'
                              })}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">
                              Range: {formatCurrency(day.confidenceRange.lower)} - {formatCurrency(day.confidenceRange.upper)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900 dark:text-white">{formatCurrency(day.predicted)}</div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">{day.dayOfWeek}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category Patterns */}
              {forecast.categoryPatterns && Object.keys(forecast.categoryPatterns).length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-900/30 p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Category Spending Patterns</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(forecast.categoryPatterns).map(([category, data]) => (
                      <div key={category} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                        <div className="font-medium text-gray-900 dark:text-white mb-2 capitalize">{category}</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-slate-400">Average Amount:</span>
                            <span className="font-semibold">{formatCurrency(data.avgAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-slate-400">Frequency:</span>
                            <span className="font-semibold">{(data.frequency * 30).toFixed(1)} times/month</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-slate-400">Total Transactions:</span>
                            <span className="font-semibold">{data.count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Anomalies Tab */}
          {activeTab === 'anomalies' && anomalies && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-900/30 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Unusual Transactions Detected</h2>
                {anomalies.summary ? (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">{anomalies.summary.totalAnomalies || 0}</div>
                      <div className="text-sm text-gray-600 dark:text-slate-400">Total Anomalies</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-red-600">{anomalies.summary.highSeverity || 0}</div>
                      <div className="text-sm text-gray-600 dark:text-slate-400">High Severity</div>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-yellow-600">{anomalies.summary.mediumSeverity || 0}</div>
                      <div className="text-sm text-gray-600 dark:text-slate-400">Medium Severity</div>
                    </div>
                  </div>
                ) : null}

                {/* Anomaly List */}
                {anomalies.detected.length === 0 ? (
                  <div className="text-center py-8">
                    <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-slate-400">No unusual transactions detected. Your spending is consistent!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {anomalies.detected && Array.isArray(anomalies.detected) && anomalies.detected.map((anomaly, index) => (
                      <div 
                        key={index} 
                        className={`border rounded-lg p-4 ${getSeverityColor(anomaly.severity)}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <AlertTriangle className={`w-4 h-4 ${
                                anomaly.severity === 'high' ? 'text-red-500' : 'text-yellow-500'
                              }`} />
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {anomaly.transaction.description}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                anomaly.severity === 'high' ? 'bg-red-200 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}>
                                {anomaly.severity.toUpperCase()}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-slate-400 capitalize">
                              {anomaly.transaction.category} • {new Date(anomaly.transaction.date).toLocaleDateString('en-IN')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-gray-900 dark:text-white">
                              {formatCurrency(anomaly.transaction.amount)}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-slate-400">
                              {anomaly.anomalyType === 'unusually_high' ? '↑' : '↓'} {anomaly.context.percentageDifference}
                            </div>
                          </div>
                        </div>
                        <div className="bg-white/50 dark:bg-slate-700/50 rounded p-2 text-sm">
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-600 dark:text-slate-400">Category Average:</span>
                            <span className="font-medium">{formatCurrency(anomaly.context.categoryAverage)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-slate-400">Deviation:</span>
                            <span className="font-medium">{formatCurrency(Math.abs(anomaly.context.deviation))}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Heatmap Tab */}
          {activeTab === 'heatmap' && heatmap && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-900/30 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Spending Heatmap</h2>
                <p className="text-gray-600 dark:text-slate-400 mb-6">When do you spend the most? Darker colors indicate higher spending.</p>

                {/* Peak Times */}
                {heatmap.peakTimes && Array.isArray(heatmap.peakTimes) && heatmap.peakTimes.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Peak Spending Times</h3>
                    <div className="grid grid-cols-5 gap-3">
                      {heatmap.peakTimes.map((peak, index) => (
                        <div key={index} className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-1">
                            <Flame className="w-4 h-4 text-orange-600" />
                            <span className="text-xs font-medium text-gray-600 dark:text-slate-400">#{index + 1}</span>
                          </div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">{peak.time}</div>
                          <div className="text-xs text-gray-600 dark:text-slate-400">{formatCurrency(peak.averageSpending)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Day Totals */}
                {heatmap.dayTotals && Array.isArray(heatmap.dayTotals) && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Spending by Day of Week</h3>
                    <div className="space-y-2">
                      {heatmap.dayTotals.map((day, index) => {
                        const maxTotal = Math.max(...heatmap.dayTotals.map(d => d.total));
                        const percentage = (day.total / maxTotal) * 100;
                        
                        return (
                          <div key={index}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{day.day}</span>
                              <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(day.total)}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                              Avg per transaction: {formatCurrency(day.avgPerTransaction)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Health Factors Tab */}
          {activeTab === 'health' && healthScore && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-900/30 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Financial Health Breakdown</h2>
                
                <div className="space-y-4">
                  {healthScore.factors && Array.isArray(healthScore.factors) && healthScore.factors.map((factor, index) => (
                    <div key={index} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Activity className="w-5 h-5 text-blue-600" />
                            <h3 className="font-semibold text-gray-900 dark:text-white">{factor.name}</h3>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              factor.status === 'excellent' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                              factor.status === 'good' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                              factor.status === 'fair' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {factor.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-slate-400">{factor.detail}</p>
                        </div>
                        <div className="text-right ml-4">
                          <div className={`text-2xl font-bold ${
                            factor.impact > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {factor.impact > 0 ? '+' : ''}{factor.impact}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">points</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {healthScore.recommendations && Array.isArray(healthScore.recommendations) && healthScore.recommendations.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-900/30 p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Personalized Recommendations</h2>
                  <div className="space-y-4">
                    {healthScore.recommendations.map((rec, index) => (
                      <div key={index} className="border-l-4 border-blue-600 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-r-lg">
                        <div className="flex items-start space-x-3">
                          {getPriorityIcon(rec.priority)}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-semibold text-gray-900 dark:text-white">{rec.title}</h3>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                rec.priority === 'critical' || rec.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              }`}>
                                {rec.priority.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-slate-300 mb-3">{rec.description}</p>
                            <div className="bg-white dark:bg-slate-800 rounded p-3">
                              <div className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2">ACTION STEPS:</div>
                              <ul className="space-y-1">
                                {rec.actionSteps && Array.isArray(rec.actionSteps) && rec.actionSteps.map((step, idx) => (
                                  <li key={idx} className="text-sm text-gray-700 dark:text-slate-300 flex items-start">
                                    <span className="text-blue-600 mr-2">•</span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Savings Opportunities Tab */}
          {activeTab === 'savings' && savingsOpportunities && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-900/30 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Savings Opportunities</h2>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 dark:text-slate-400">Total Potential Savings</div>
                    <div className="text-3xl font-bold text-green-600">
                      {formatCurrency(savingsOpportunities.totalPotentialSavings)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">per month</div>
                  </div>
                </div>

                {savingsOpportunities.opportunities && Array.isArray(savingsOpportunities.opportunities) && savingsOpportunities.opportunities.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-slate-400">Great job! No major savings opportunities identified.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {savingsOpportunities.opportunities && Array.isArray(savingsOpportunities.opportunities) && savingsOpportunities.opportunities.map((opp, index) => (
                      <div key={index} className="border border-gray-200 dark:border-slate-700 rounded-lg p-5 hover:shadow-md dark:hover:shadow-slate-900/30 transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {opp.type === 'high_spending_category' ? (
                                <PieChart className="w-5 h-5 text-orange-600" />
                              ) : (
                                <Zap className="w-5 h-5 text-purple-600" />
                              )}
                              <h3 className="font-semibold text-gray-900 dark:text-white capitalize">
                                {opp.type === 'high_spending_category' ? 
                                  `${opp.category} - High Spending Category` : 
                                  `Recurring: ${opp.description}`
                                }
                              </h3>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">{opp.suggestion}</p>
                            
                            <div className="grid grid-cols-3 gap-4">
                              {opp.currentSpending && (
                                <div className="bg-gray-50 dark:bg-slate-900 rounded p-2">
                                  <div className="text-xs text-gray-600 dark:text-slate-400">Current Spending</div>
                                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {formatCurrency(opp.currentSpending || opp.totalSpent)}
                                  </div>
                                </div>
                              )}
                              {opp.frequency && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                                  <div className="text-xs text-gray-600 dark:text-slate-400">Frequency</div>
                                  <div className="text-lg font-semibold text-blue-700 dark:text-blue-400">
                                    {opp.frequency} times
                                  </div>
                                </div>
                              )}
                              {opp.transactionCount && (
                                <div className="bg-purple-50 dark:bg-purple-900/20 rounded p-2">
                                  <div className="text-xs text-gray-600 dark:text-slate-400">Transactions</div>
                                  <div className="text-lg font-semibold text-purple-700 dark:text-purple-400">
                                    {opp.transactionCount}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="ml-4 text-right">
                            <div className="text-xs text-gray-600 dark:text-slate-400 mb-1">Potential Savings</div>
                            <div className="text-2xl font-bold text-green-600">
                              {formatCurrency(opp.potentialSavings || opp.potentialMonthlySavings)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">/month</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default AdvancedAnalytics;
