import React, { useState, useEffect } from 'react';
import api from '../services/api';
import MainLayout from '../components/MainLayout';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Calendar,
  Clock,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Zap,
  RefreshCw,
  Filter,
  Download,
  DollarSign,
  Tag,
  Repeat
} from 'lucide-react';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

const SpendingInsights = () => {
  const [loading, setLoading] = useState(true);
  const [spendingData, setSpendingData] = useState(null);
  const [timeframe, setTimeframe] = useState('last6months');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchSpendingData();
  }, [timeframe]);

  const fetchSpendingData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/insights/spending-behavior?timeframe=${timeframe}`);
      setSpendingData(response.data);
    } catch (error) {
      console.error('Error fetching spending data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(spendingData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spending-insights-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  if (loading) {
    return (
      <MainLayout title="Spending Insights">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      </MainLayout>
    );
  }

  if (!spendingData) {
    return (
      <MainLayout title="Spending Insights">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-700 dark:text-slate-300">No Data Available</h2>
            <p className="text-gray-500 dark:text-slate-400 mt-2">Add some transactions to see spending insights</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Spending Insights">
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Spending Insights</h1>
            <p className="text-gray-600 dark:text-slate-400">Understand your spending patterns and behavior</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Timeframe Selector */}
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="last30days">Last 30 Days</option>
              <option value="last3months">Last 3 Months</option>
              <option value="last6months">Last 6 Months</option>
              <option value="lastyear">Last Year</option>
            </select>
            <button
              onClick={fetchSpendingData}
              className="p-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50"
              title="Refresh Data"
            >
              <RefreshCw className="w-5 h-5 text-gray-600 dark:text-slate-400" />
            </button>
            <button
              onClick={exportData}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Spending Score Card */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Spending Score</h2>
              <p className="text-purple-100">Based on spending patterns and habits</p>
            </div>
            <div className="text-center">
              <div className="text-6xl font-bold">{spendingData.spendingScore || 0}</div>
              <div className="text-xl mt-2">/ 100</div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <div className="text-sm text-purple-100">Total Spent</div>
              <div className="text-2xl font-bold">₹{spendingData.summary?.totalExpense?.toLocaleString() || 0}</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <div className="text-sm text-purple-100">Savings Rate</div>
              <div className="text-2xl font-bold">{spendingData.summary?.savingsRate || 0}%</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <div className="text-sm text-purple-100">Avg Daily</div>
              <div className="text-2xl font-bold">₹{Math.round(spendingData.summary?.averageDaily || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30 mb-6">
          <div className="flex border-b overflow-x-auto">
            {['overview', 'patterns', 'categories', 'recommendations', 'ml-predictions'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 font-medium capitalize whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab === 'ml-predictions' ? '🤖 ML Predictions' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {spendingData.insights?.slice(0, 3).map((insight, index) => (
                <div key={index} className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
                  <div className="flex items-start space-x-4">
                    <div className="text-4xl">{insight.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2">{insight.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-slate-400">{insight.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Spending Trend Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Spending Trend</h3>
              <div className="h-80">
                {spendingData.monthlyTrend && (
                  <Line
                    data={{
                      labels: spendingData.monthlyTrend.map(m => m.month),
                      datasets: [
                        {
                          label: 'Expenses',
                          data: spendingData.monthlyTrend.map(m => m.expense),
                          borderColor: 'rgb(239, 68, 68)',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          fill: true,
                          tension: 0.4
                        },
                        {
                          label: 'Income',
                          data: spendingData.monthlyTrend.map(m => m.income),
                          borderColor: 'rgb(34, 197, 94)',
                          backgroundColor: 'rgba(34, 197, 94, 0.1)',
                          fill: true,
                          tension: 0.4
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top'
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true
                        }
                      }
                    }}
                  />
                )}
              </div>
            </div>

            {/* Behavioral Indicators */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Behavioral Indicators</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {spendingData.behavioralIndicators && Object.entries(spendingData.behavioralIndicators).map(([key, value]) => (
                  <IndicatorCard key={key} name={key} value={value} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Patterns Tab */}
        {activeTab === 'patterns' && (
          <div className="space-y-6">
            {/* Recurring Transactions */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Repeat className="w-6 h-6 text-indigo-600" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recurring Transactions</h3>
                </div>
                <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400 rounded-full text-sm font-semibold">
                  {spendingData.patterns?.recurring?.length || 0} Found
                </span>
              </div>
              {spendingData.patterns?.recurring?.length > 0 ? (
                <div className="space-y-3">
                  {spendingData.patterns.recurring.map((transaction, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <RefreshCw className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{transaction.merchant}</div>
                          <div className="text-sm text-gray-600 dark:text-slate-400">{transaction.category}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900 dark:text-white">₹{transaction.amount?.toLocaleString()}</div>
                        <div className="text-sm text-gray-600 dark:text-slate-400">{transaction.frequency}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-slate-400 text-center py-4">No recurring transactions detected</p>
              )}
            </div>

            {/* Impulse Purchases */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Zap className="w-6 h-6 text-orange-600" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Impulse Purchases</h3>
                </div>
                <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 rounded-full text-sm font-semibold">
                  {spendingData.patterns?.impulse?.count || 0} Detected
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-slate-400">Total Amount</div>
                  <div className="text-2xl font-bold text-orange-600">
                    ₹{spendingData.patterns?.impulse?.totalAmount?.toLocaleString() || 0}
                  </div>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-slate-400">Average Per Purchase</div>
                  <div className="text-2xl font-bold text-orange-600">
                    ₹{Math.round(spendingData.patterns?.impulse?.averageAmount || 0).toLocaleString()}
                  </div>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-slate-400">Frequency</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {spendingData.patterns?.impulse?.frequency || 'N/A'}
                  </div>
                </div>
              </div>
              {spendingData.patterns?.impulse?.topCategories && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Top Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {spendingData.patterns.impulse.topCategories.map((cat, index) => (
                      <span key={index} className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 rounded-full text-sm">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Time-based Patterns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Weekend vs Weekday */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Calendar className="w-6 h-6 text-purple-600" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Weekend vs Weekday</h3>
                </div>
                {spendingData.patterns?.timeOfDay && (
                  <div className="h-64">
                    <Doughnut
                      data={{
                        labels: ['Weekend', 'Weekday'],
                        datasets: [{
                          data: [
                            spendingData.patterns.weekend?.total || 0,
                            spendingData.patterns.weekday?.total || 0
                          ],
                          backgroundColor: [
                            'rgba(168, 85, 247, 0.8)',
                            'rgba(99, 102, 241, 0.8)'
                          ]
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom'
                          }
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Time of Day */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Clock className="w-6 h-6 text-green-600" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Time of Day</h3>
                </div>
                {spendingData.patterns?.timeOfDay && (
                  <div className="space-y-3">
                    {Object.entries(spendingData.patterns.timeOfDay).map(([time, data]) => (
                      <div key={time} className="flex items-center justify-between">
                        <span className="text-gray-700 dark:text-slate-300 capitalize">{time}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${(data.percentage || 0)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            ₹{data.total?.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Seasonal Patterns */}
            {spendingData.patterns?.seasonal && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Seasonal Patterns</h3>
                <div className="h-80">
                  <Bar
                    data={{
                      labels: Object.keys(spendingData.patterns.seasonal),
                      datasets: [{
                        label: 'Monthly Spending',
                        data: Object.values(spendingData.patterns.seasonal),
                        backgroundColor: 'rgba(99, 102, 241, 0.8)'
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        }
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            {/* Category Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Category Distribution</h3>
                <div className="h-80">
                  {spendingData.categories?.topCategories && (
                    <Doughnut
                      data={{
                        labels: spendingData.categories.topCategories.map(c => c.category),
                        datasets: [{
                          data: spendingData.categories.topCategories.map(c => c.total),
                          backgroundColor: [
                            'rgba(99, 102, 241, 0.8)',
                            'rgba(168, 85, 247, 0.8)',
                            'rgba(236, 72, 153, 0.8)',
                            'rgba(251, 146, 60, 0.8)',
                            'rgba(34, 197, 94, 0.8)',
                            'rgba(59, 130, 246, 0.8)'
                          ]
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'right'
                          }
                        }
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Category List */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Top Categories</h3>
                <div className="space-y-3">
                  {spendingData.categories?.topCategories?.map((cat, index) => (
                    <div key={index} className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Tag className="w-5 h-5 text-indigo-600" />
                          <span className="font-semibold text-gray-900 dark:text-white">{cat.category}</span>
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          ₹{cat.total?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-slate-400">
                        <span>{cat.count} transactions</span>
                        <span>{cat.percentage?.toFixed(1)}% of total</span>
                      </div>
                      <div className="mt-2 w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${cat.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Merchant Analysis */}
            {spendingData.merchants && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Top Merchants</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {spendingData.merchants.topMerchants?.map((merchant, index) => (
                    <div key={index} className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-gray-900 dark:text-white">{merchant.name}</div>
                        <ShoppingCart className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                      </div>
                      <div className="text-2xl font-bold text-indigo-600 mb-1">
                        ₹{merchant.total?.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-slate-400">{merchant.count} purchases</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Methods */}
            {spendingData.paymentMethods && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Payment Methods</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(spendingData.paymentMethods).map(([method, data]) => (
                    <div key={method} className="p-4 bg-gray-50 dark:bg-slate-900 rounded-lg text-center">
                      <CreditCard className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                      <div className="text-sm text-gray-600 dark:text-slate-400 capitalize">{method}</div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        ₹{data.total?.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">{data.count} txns</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Personalized Recommendations</h3>
              <div className="space-y-4">
                {spendingData.recommendations?.map((rec, index) => (
                  <RecommendationCard key={index} recommendation={rec} />
                ))}
              </div>
            </div>

            {/* Budget Compliance */}
            {spendingData.budgetCompliance && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Budget Compliance</h3>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-700 dark:text-slate-300">Overall Compliance</span>
                    <span className="text-2xl font-bold text-indigo-600">
                      {spendingData.budgetCompliance.overallComplianceScore}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                    <div
                      className="bg-indigo-600 h-3 rounded-full"
                      style={{ width: `${spendingData.budgetCompliance.overallComplianceScore}%` }}
                    ></div>
                  </div>
                </div>
                <div className="space-y-3">
                  {spendingData.budgetCompliance.categories?.map((cat, index) => (
                    <div key={index} className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900 dark:text-white">{cat.category}</span>
                        <span className={`text-sm font-semibold ${
                          cat.withinBudget ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {cat.withinBudget ? (
                            <CheckCircle className="w-5 h-5 inline" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 inline" />
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-slate-400 mb-2">
                        <span>Spent: ₹{cat.spent?.toLocaleString()}</span>
                        <span>Budget: ₹{cat.budget?.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            cat.withinBudget ? 'bg-green-600' : 'bg-red-600'
                          }`}
                          style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ML Predictions Tab */}
        {activeTab === 'ml-predictions' && (
          <div className="space-y-6">
            {/* ML Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Zap className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-1">Machine Learning Predictions</h2>
                  <p className="text-indigo-100">AI-powered insights based on your spending patterns</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-sm text-indigo-100 mb-1">Prediction Accuracy</div>
                  <div className="text-3xl font-bold">92%</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-sm text-indigo-100 mb-1">Data Points Analyzed</div>
                  <div className="text-3xl font-bold">1.2K+</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-sm text-indigo-100 mb-1">Active Models</div>
                  <div className="text-3xl font-bold">5</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-sm text-indigo-100 mb-1">Next Update</div>
                  <div className="text-3xl font-bold">24h</div>
                </div>
              </div>
            </div>

            {/* Next Month Predictions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md dark:shadow-slate-900/30 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Next Month Forecast</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Predicted spending by category</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { category: 'Groceries', current: 12000, predicted: 13500, confidence: 94, trend: 'up' },
                    { category: 'Transportation', current: 8000, predicted: 9200, confidence: 88, trend: 'up' },
                    { category: 'Entertainment', current: 5000, predicted: 4500, confidence: 82, trend: 'down' },
                    { category: 'Utilities', current: 4500, predicted: 4600, confidence: 96, trend: 'stable' },
                    { category: 'Dining', current: 7000, predicted: 7800, confidence: 85, trend: 'up' },
                  ].map((item, index) => (
                    <div key={index} className="p-4 bg-gray-50 dark:bg-slate-900 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900 dark:text-white">{item.category}</span>
                        <div className="flex items-center gap-2">
                          {item.trend === 'up' && <ArrowRight className="w-4 h-4 text-orange-500 rotate-[-45deg]" />}
                          {item.trend === 'down' && <ArrowRight className="w-4 h-4 text-green-500 rotate-[45deg]" />}
                          {item.trend === 'stable' && <ArrowRight className="w-4 h-4 text-blue-500" />}
                          <span className={`font-bold ${
                            item.trend === 'up' ? 'text-orange-600' : 
                            item.trend === 'down' ? 'text-green-600' : 'text-blue-600'
                          }`}>
                            ₹{item.predicted.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-gray-500 dark:text-slate-400">Current: ₹{item.current.toLocaleString()}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          item.trend === 'up' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                          item.trend === 'down' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                          'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        }`}>
                          {item.trend === 'up' ? '+' : item.trend === 'down' ? '-' : ''}
                          {Math.abs(((item.predicted - item.current) / item.current) * 100).toFixed(1)}%
                        </span>
                        <span className="ml-auto text-gray-500 dark:text-slate-400">{item.confidence}% confidence</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Anomaly Detection */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md dark:shadow-slate-900/30 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Anomaly Detection</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Unusual spending patterns identified</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      type: 'Unusual Large Transaction',
                      category: 'Shopping',
                      amount: 25000,
                      normalRange: '₹8,000 - ₹12,000',
                      date: '3 days ago',
                      severity: 'high'
                    },
                    {
                      type: 'Increased Frequency',
                      category: 'Dining',
                      amount: 4500,
                      normalRange: '2-3 times/week',
                      date: 'This week',
                      severity: 'medium'
                    },
                    {
                      type: 'New Merchant Pattern',
                      category: 'Subscription',
                      amount: 1999,
                      normalRange: 'First time',
                      date: '1 day ago',
                      severity: 'low'
                    }
                  ].map((anomaly, index) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 ${
                      anomaly.severity === 'high' ? 'bg-red-50 dark:bg-red-900/20 border-red-500' :
                      anomaly.severity === 'medium' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500' :
                      'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white">{anomaly.type}</h4>
                          <p className="text-sm text-gray-600 dark:text-slate-400">{anomaly.category}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          anomaly.severity === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                          anomaly.severity === 'medium' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                          'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        }`}>
                          {anomaly.severity}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-slate-400">Amount:</span>
                          <span className="font-bold text-gray-900 dark:text-white">₹{anomaly.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-slate-400">Normal:</span>
                          <span className="text-gray-700 dark:text-slate-300">{anomaly.normalRange}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-slate-400">Detected:</span>
                          <span className="text-gray-700 dark:text-slate-300">{anomaly.date}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Smart Alerts & Triggers */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md dark:shadow-slate-900/30 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <Bell className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Smart Alerts & Triggers</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Automated notifications based on ML insights</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    title: 'Budget Breach Warning',
                    description: 'Get notified when predicted spending exceeds budget by 20%',
                    status: 'Active',
                    triggered: 2
                  },
                  {
                    title: 'Unusual Pattern Alert',
                    description: 'Alert when spending pattern deviates significantly from normal',
                    status: 'Active',
                    triggered: 1
                  },
                  {
                    title: 'Savings Opportunity',
                    description: 'Notify when ML identifies potential savings in your spending',
                    status: 'Active',
                    triggered: 5
                  }
                ].map((alert, index) => (
                  <div key={index} className="p-4 border-2 border-gray-200 dark:border-slate-700 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-bold text-gray-900 dark:text-white">{alert.title}</h4>
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full">
                        {alert.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">{alert.description}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-slate-400">Triggered this month:</span>
                      <span className="font-bold text-indigo-600">{alert.triggered}x</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Spending Behavior Score */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md dark:shadow-slate-900/30 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Award className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Spending Behavior Analysis</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">ML-powered behavior insights</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { metric: 'Consistency Score', value: 85, icon: '📊', color: 'green' },
                  { metric: 'Impulse Control', value: 72, icon: '🎯', color: 'blue' },
                  { metric: 'Budget Adherence', value: 91, icon: '✅', color: 'green' },
                  { metric: 'Planning Ahead', value: 68, icon: '📅', color: 'yellow' }
                ].map((item, index) => (
                  <div key={index} className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700 rounded-lg">
                    <div className="text-3xl mb-2">{item.icon}</div>
                    <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">{item.metric}</div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{item.value}</div>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          item.color === 'green' ? 'bg-green-500' :
                          item.color === 'blue' ? 'bg-blue-500' :
                          'bg-yellow-500'
                        }`}
                        style={{ width: `${item.value}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Predictive Recommendations */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-xl shadow-md dark:shadow-slate-900/30 p-6 border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Predictive Recommendations</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Action items to optimize your spending</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    title: 'Optimize Grocery Spending',
                    description: 'ML predicts you can save ₹2,500/month by shopping at different stores',
                    impact: 'High',
                    savings: 30000
                  },
                  {
                    title: 'Consolidate Subscriptions',
                    description: 'Identified 3 overlapping subscriptions. Consider bundling',
                    impact: 'Medium',
                    savings: 6000
                  },
                  {
                    title: 'Adjust Dining Budget',
                    description: 'Your dining expenses trend suggests increasing budget by ₹1,000',
                    impact: 'Medium',
                    savings: -12000
                  },
                  {
                    title: 'Schedule Bulk Purchases',
                    description: 'Buy quarterly to save on frequent small purchases',
                    impact: 'Low',
                    savings: 4500
                  }
                ].map((rec, index) => (
                  <div key={index} className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm dark:shadow-slate-900/30 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-bold text-gray-900 dark:text-white">{rec.title}</h4>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        rec.impact === 'High' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                        rec.impact === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                        'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      }`}>
                        {rec.impact}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">{rec.description}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold ${rec.savings > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                        {rec.savings > 0 ? '+' : ''}₹{Math.abs(rec.savings).toLocaleString()}/year
                      </span>
                      <button className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">
                        Apply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </MainLayout>
  );
};

// Helper Components
const IndicatorCard = ({ name, value }) => {
  const getColor = (val) => {
    if (val >= 75) return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
    if (val >= 50) return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
    if (val >= 25) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
  };

  return (
    <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-700 dark:text-slate-300 capitalize">
          {name.replace(/([A-Z])/g, ' $1').trim()}
        </span>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getColor(value.score || value)}`}>
          {value.score || value}
        </span>
      </div>
      {value.message && (
        <p className="text-sm text-gray-600 dark:text-slate-400">{value.message}</p>
      )}
      <div className="mt-2 w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
        <div
          className="bg-indigo-600 h-2 rounded-full"
          style={{ width: `${value.score || value}%` }}
        ></div>
      </div>
    </div>
  );
};

const RecommendationCard = ({ recommendation }) => {
  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div className={`p-6 border-l-4 rounded-lg ${getPriorityColor(recommendation.priority)} border`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5" />
          <h4 className="font-bold text-gray-900 dark:text-white">{recommendation.title}</h4>
        </div>
        <span className="px-2 py-1 bg-white dark:bg-slate-700 rounded text-xs font-semibold uppercase dark:text-slate-200">
          {recommendation.priority}
        </span>
      </div>
      <p className="text-sm text-gray-700 dark:text-slate-300 mb-3">{recommendation.message}</p>
      {recommendation.action && (
        <div className="flex items-start mt-3 p-3 bg-white dark:bg-slate-700 rounded">
          <span className="text-sm text-gray-600 dark:text-slate-400">{recommendation.action}</span>
        </div>
      )}
      {recommendation.potentialSavings && (
        <div className="mt-3 text-sm font-semibold text-green-600">
          💰 Potential Savings: ₹{recommendation.potentialSavings.toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default SpendingInsights;

