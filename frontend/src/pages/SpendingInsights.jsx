import React, { useState, useEffect } from 'react';
import api from '../services/api';
import MainLayout from '../components/MainLayout';
import { useTheme } from '../context/ThemeContext';
import { FadeIn, PageTransition, StaggerChildren } from '../components/ui/AnimatedComponents';
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
  const { mode } = useTheme();
  const dk = mode === 'dark' || mode === 'black';

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
            <AlertTriangle className={`w-16 h-16 ${dk ? 'text-slate-500' : 'text-gray-400'} mx-auto mb-4`} />
            <h2 className={`text-2xl font-bold ${dk ? 'text-slate-300' : 'text-gray-700'}`}>No Data Available</h2>
            <p className={`${dk ? 'text-slate-400' : 'text-gray-500'} mt-2`}>Add some transactions to see spending insights</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Spending Insights">
    <PageTransition>
    <div className={`min-h-screen ${dk ? 'bg-slate-950' : 'bg-gray-50'} p-6`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className={`text-4xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-2`}>Spending Insights</h1>
            <p className={`${dk ? 'text-slate-400' : 'text-gray-600'}`}>Understand your spending patterns and behavior</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Timeframe Selector */}
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className={`px-4 py-2 border ${dk ? 'border-slate-600 bg-slate-800 text-slate-200' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
            >
              <option value="last30days">Last 30 Days</option>
              <option value="last3months">Last 3 Months</option>
              <option value="last6months">Last 6 Months</option>
              <option value="lastyear">Last Year</option>
            </select>
            <button
              onClick={fetchSpendingData}
              className={`p-2 ${dk ? 'bg-slate-800 border-slate-600 hover:bg-slate-700/50' : 'bg-white border-gray-300 hover:bg-gray-50'} border rounded-lg`}
              title="Refresh Data"
            >
              <RefreshCw className={`w-5 h-5 ${dk ? 'text-slate-400' : 'text-gray-600'}`} />
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
        <div className={`${dk ? 'bg-slate-800 shadow-slate-900/30' : 'bg-white'} rounded-lg shadow mb-6`}>
          <div className="flex border-b overflow-x-auto">
            {['overview', 'patterns', 'categories', 'recommendations', 'ml-predictions'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 font-medium capitalize whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : dk ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
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
                <div key={index} className={`${dk ? 'bg-slate-800 shadow-slate-900/30' : 'bg-white'} rounded-lg shadow-md p-6`}>
                  <div className="flex items-start space-x-4">
                    <div className="text-4xl">{insight.icon}</div>
                    <div className="flex-1">
                      <h3 className={`font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-2`}>{insight.title}</h3>
                      <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'}`}>{insight.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Spending Trend Chart */}
            <div className={`${dk ? 'bg-slate-800 shadow-slate-900/30' : 'bg-white'} rounded-lg shadow-md p-6`}>
              <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Spending Trend</h3>
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
            <div className={`${dk ? 'bg-slate-800 shadow-slate-900/30' : 'bg-white'} rounded-lg shadow-md p-6`}>
              <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Behavioral Indicators</h3>
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
            <div className={`${dk ? 'bg-slate-800 shadow-slate-900/30' : 'bg-white'} rounded-lg shadow-md p-6`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Repeat className="w-6 h-6 text-indigo-600" />
                  <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>Recurring Transactions</h3>
                </div>
                <span className={`px-3 py-1 ${dk ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-100 text-indigo-800'} rounded-full text-sm font-semibold`}>
                  {spendingData.patterns?.recurring?.length || 0} Found
                </span>
              </div>
              {spendingData.patterns?.recurring?.length > 0 ? (
                <div className="space-y-3">
                  {spendingData.patterns.recurring.map((transaction, index) => (
                    <div key={index} className={`flex items-center justify-between p-4 ${dk ? 'bg-blue-900/20' : 'bg-blue-50'} rounded-lg`}>
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 ${dk ? 'bg-blue-900/30' : 'bg-blue-100'} rounded-lg`}>
                          <RefreshCw className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>{transaction.merchant}</div>
                          <div className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'}`}>{transaction.category}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>₹{transaction.amount?.toLocaleString()}</div>
                        <div className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'}`}>{transaction.frequency}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`${dk ? 'text-slate-400' : 'text-gray-500'} text-center py-4`}>No recurring transactions detected</p>
              )}
            </div>

            {/* Impulse Purchases */}
            <div className={`${dk ? 'bg-slate-800 shadow-slate-900/30' : 'bg-white'} rounded-lg shadow-md p-6`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Zap className="w-6 h-6 text-orange-600" />
                  <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>Impulse Purchases</h3>
                </div>
                <span className={`px-3 py-1 ${dk ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-800'} rounded-full text-sm font-semibold`}>
                  {spendingData.patterns?.impulse?.count || 0} Detected
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className={`p-4 ${dk ? 'bg-orange-900/20' : 'bg-orange-50'} rounded-lg`}>
                  <div className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'}`}>Total Amount</div>
                  <div className="text-2xl font-bold text-orange-600">
                    ₹{spendingData.patterns?.impulse?.totalAmount?.toLocaleString() || 0}
                  </div>
                </div>
                <div className={`p-4 ${dk ? 'bg-orange-900/20' : 'bg-orange-50'} rounded-lg`}>
                  <div className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'}`}>Average Per Purchase</div>
                  <div className="text-2xl font-bold text-orange-600">
                    ₹{Math.round(spendingData.patterns?.impulse?.averageAmount || 0).toLocaleString()}
                  </div>
                </div>
                <div className={`p-4 ${dk ? 'bg-orange-900/20' : 'bg-orange-50'} rounded-lg`}>
                  <div className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'}`}>Frequency</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {spendingData.patterns?.impulse?.frequency || 'N/A'}
                  </div>
                </div>
              </div>
              {spendingData.patterns?.impulse?.topCategories && (
                <div>
                  <h4 className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-2`}>Top Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {spendingData.patterns.impulse.topCategories.map((cat, index) => (
                      <span key={index} className={`px-3 py-1 ${dk ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-800'} rounded-full text-sm`}>
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
              <div className={`${dk ? 'bg-slate-800 shadow-slate-900/30' : 'bg-white'} rounded-lg shadow-md p-6`}>
                <div className="flex items-center space-x-2 mb-4">
                  <Calendar className="w-6 h-6 text-purple-600" />
                  <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>Weekend vs Weekday</h3>
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
              <div className={`${dk ? 'bg-slate-800 shadow-slate-900/30' : 'bg-white'} rounded-lg shadow-md p-6`}>
                <div className="flex items-center space-x-2 mb-4">
                  <Clock className="w-6 h-6 text-green-600" />
                  <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>Time of Day</h3>
                </div>
                {spendingData.patterns?.timeOfDay && (
                  <div className="space-y-3">
                    {Object.entries(spendingData.patterns.timeOfDay).map(([time, data]) => (
                      <div key={time} className="flex items-center justify-between">
                        <span className={`${dk ? 'text-slate-300' : 'text-gray-700'} capitalize`}>{time}</span>
                        <div className="flex items-center space-x-2">
                          <div className={`w-32 ${dk ? 'bg-slate-700' : 'bg-gray-200'} rounded-full h-2`}>
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${(data.percentage || 0)}%` }}
                            ></div>
                          </div>
                          <span className={`text-sm font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>
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
              <div className={`${dk ? 'bg-slate-800 shadow-slate-900/30' : 'bg-white'} rounded-lg shadow-md p-6`}>
                <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Seasonal Patterns</h3>
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
              <div className={`${dk ? 'bg-slate-800 shadow-slate-900/30' : 'bg-white'} rounded-lg shadow-md p-6`}>
                <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Category Distribution</h3>
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
              <div className={`${dk ? 'bg-slate-800 shadow-slate-900/30' : 'bg-white'} rounded-lg shadow-md p-6`}>
                <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Top Categories</h3>
                <div className="space-y-3">
                  {spendingData.categories?.topCategories?.map((cat, index) => (
                    <div key={index} className={`p-4 border ${dk ? 'border-slate-700' : 'border-gray-200'} rounded-lg`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Tag className="w-5 h-5 text-indigo-600" />
                          <span className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>{cat.category}</span>
                        </div>
                        <span className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>
                          ₹{cat.total?.toLocaleString()}
                        </span>
                      </div>
                      <div className={`flex items-center justify-between text-sm ${dk ? 'text-slate-400' : 'text-gray-600'}`}>
                        <span>{cat.count} transactions</span>
                        <span>{cat.percentage?.toFixed(1)}% of total</span>
                      </div>
                      <div className={`mt-2 w-full ${dk ? 'bg-slate-700' : 'bg-gray-200'} rounded-full h-2`}>
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
              <div className={`${dk ? 'bg-slate-800 shadow-slate-900/30' : 'bg-white'} rounded-lg shadow-md p-6`}>
                <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Top Merchants</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {spendingData.merchants.topMerchants?.map((merchant, index) => (
                    <div key={index} className={`p-4 border ${dk ? 'border-slate-700' : 'border-gray-200'} rounded-lg`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>{merchant.name}</div>
                        <ShoppingCart className={`w-5 h-5 ${dk ? 'text-slate-500' : 'text-gray-400'}`} />
                      </div>
                      <div className="text-2xl font-bold text-indigo-600 mb-1">
                        ₹{merchant.total?.toLocaleString()}
                      </div>
                      <div className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'}`}>{merchant.count} purchases</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Methods */}
            {spendingData.paymentMethods && (
              <div className={`${dk ? 'bg-slate-800 shadow-slate-900/30' : 'bg-white'} rounded-lg shadow-md p-6`}>
                <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Payment Methods</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(spendingData.paymentMethods).map(([method, data]) => (
                    <div key={method} className={`p-4 ${dk ? 'bg-slate-900' : 'bg-gray-50'} rounded-lg text-center`}>
                      <CreditCard className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                      <div className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'} capitalize`}>{method}</div>
                      <div className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>
                        ₹{data.total?.toLocaleString()}
                      </div>
                      <div className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{data.count} txns</div>
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
            <div className={`${dk ? 'bg-slate-800 shadow-slate-900/30' : 'bg-white'} rounded-lg shadow-md p-6`}>
              <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-6`}>Personalized Recommendations</h3>
              <div className="space-y-4">
                {spendingData.recommendations?.map((rec, index) => (
                  <RecommendationCard key={index} recommendation={rec} />
                ))}
              </div>
            </div>

            {/* Budget Compliance */}
            {spendingData.budgetCompliance && (
              <div className={`${dk ? 'bg-slate-800 shadow-slate-900/30' : 'bg-white'} rounded-lg shadow-md p-6`}>
                <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Budget Compliance</h3>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`${dk ? 'text-slate-300' : 'text-gray-700'}`}>Overall Compliance</span>
                    <span className="text-2xl font-bold text-indigo-600">
                      {spendingData.budgetCompliance.overallComplianceScore}%
                    </span>
                  </div>
                  <div className={`w-full ${dk ? 'bg-slate-700' : 'bg-gray-200'} rounded-full h-3`}>
                    <div
                      className="bg-indigo-600 h-3 rounded-full"
                      style={{ width: `${spendingData.budgetCompliance.overallComplianceScore}%` }}
                    ></div>
                  </div>
                </div>
                <div className="space-y-3">
                  {spendingData.budgetCompliance.categories?.map((cat, index) => (
                    <div key={index} className={`p-4 border ${dk ? 'border-slate-700' : 'border-gray-200'} rounded-lg`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>{cat.category}</span>
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
                      <div className={`flex items-center justify-between text-sm ${dk ? 'text-slate-400' : 'text-gray-600'} mb-2`}>
                        <span>Spent: ₹{cat.spent?.toLocaleString()}</span>
                        <span>Budget: ₹{cat.budget?.toLocaleString()}</span>
                      </div>
                      <div className={`w-full ${dk ? 'bg-slate-700' : 'bg-gray-200'} rounded-full h-2`}>
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
              <div className={`${dk ? 'bg-slate-800 shadow-slate-900/30' : 'bg-white'} rounded-xl shadow-md p-6`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className={`p-3 ${dk ? 'bg-purple-900/30' : 'bg-purple-100'} rounded-lg`}>
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>Next Month Forecast</h3>
                    <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Predicted spending by category</p>
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
                    <div key={index} className={`p-4 ${dk ? 'bg-slate-900 hover:bg-slate-700' : 'bg-gray-50 hover:bg-gray-100'} rounded-lg transition-colors`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>{item.category}</span>
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
                        <span className={`${dk ? 'text-slate-400' : 'text-gray-500'}`}>Current: ₹{item.current.toLocaleString()}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          item.trend === 'up' ? (dk ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700') :
                          item.trend === 'down' ? (dk ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') :
                          (dk ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700')
                        }`}>
                          {item.trend === 'up' ? '+' : item.trend === 'down' ? '-' : ''}
                          {Math.abs(((item.predicted - item.current) / item.current) * 100).toFixed(1)}%
                        </span>
                        <span className={`ml-auto ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{item.confidence}% confidence</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Anomaly Detection */}
              <div className={`${dk ? 'bg-slate-800 shadow-slate-900/30' : 'bg-white'} rounded-xl shadow-md p-6`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className={`p-3 ${dk ? 'bg-red-900/30' : 'bg-red-100'} rounded-lg`}>
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>Anomaly Detection</h3>
                    <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Unusual spending patterns identified</p>
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
                      anomaly.severity === 'high' ? (dk ? 'bg-red-900/20' : 'bg-red-50') + ' border-red-500' :
                      anomaly.severity === 'medium' ? (dk ? 'bg-orange-900/20' : 'bg-orange-50') + ' border-orange-500' :
                      (dk ? 'bg-yellow-900/20' : 'bg-yellow-50') + ' border-yellow-500'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className={`font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>{anomaly.type}</h4>
                          <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'}`}>{anomaly.category}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          anomaly.severity === 'high' ? (dk ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700') :
                          anomaly.severity === 'medium' ? (dk ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700') :
                          (dk ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
                        }`}>
                          {anomaly.severity}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center justify-between">
                          <span className={`${dk ? 'text-slate-400' : 'text-gray-600'}`}>Amount:</span>
                          <span className={`font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>₹{anomaly.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`${dk ? 'text-slate-400' : 'text-gray-600'}`}>Normal:</span>
                          <span className={`${dk ? 'text-slate-300' : 'text-gray-700'}`}>{anomaly.normalRange}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`${dk ? 'text-slate-400' : 'text-gray-600'}`}>Detected:</span>
                          <span className={`${dk ? 'text-slate-300' : 'text-gray-700'}`}>{anomaly.date}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Smart Alerts & Triggers */}
            <div className={`${dk ? 'bg-slate-800 shadow-slate-900/30' : 'bg-white'} rounded-xl shadow-md p-6`}>
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 ${dk ? 'bg-yellow-900/30' : 'bg-yellow-100'} rounded-lg`}>
                  <Bell className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>Smart Alerts & Triggers</h3>
                  <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Automated notifications based on ML insights</p>
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
                  <div key={index} className={`p-4 border-2 ${dk ? 'border-slate-700 hover:border-indigo-600' : 'border-gray-200 hover:border-indigo-300'} rounded-lg transition-all`}>
                    <div className="flex items-start justify-between mb-2">
                      <h4 className={`font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>{alert.title}</h4>
                      <span className={`px-2 py-1 ${dk ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'} text-xs font-semibold rounded-full`}>
                        {alert.status}
                      </span>
                    </div>
                    <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'} mb-3`}>{alert.description}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className={`${dk ? 'text-slate-400' : 'text-gray-500'}`}>Triggered this month:</span>
                      <span className="font-bold text-indigo-600">{alert.triggered}x</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Spending Behavior Score */}
            <div className={`${dk ? 'bg-slate-800 shadow-slate-900/30' : 'bg-white'} rounded-xl shadow-md p-6`}>
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 ${dk ? 'bg-green-900/30' : 'bg-green-100'} rounded-lg`}>
                  <Award className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>Spending Behavior Analysis</h3>
                  <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-500'}`}>ML-powered behavior insights</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { metric: 'Consistency Score', value: 85, icon: '📊', color: 'green' },
                  { metric: 'Impulse Control', value: 72, icon: '🎯', color: 'blue' },
                  { metric: 'Budget Adherence', value: 91, icon: '✅', color: 'green' },
                  { metric: 'Planning Ahead', value: 68, icon: '📅', color: 'yellow' }
                ].map((item, index) => (
                  <div key={index} className={`p-4 bg-gradient-to-br ${dk ? 'from-slate-800 to-slate-700' : 'from-gray-50 to-gray-100'} rounded-lg`}>
                    <div className="text-3xl mb-2">{item.icon}</div>
                    <div className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'} mb-1`}>{item.metric}</div>
                    <div className={`text-3xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-2`}>{item.value}</div>
                    <div className={`w-full ${dk ? 'bg-slate-700' : 'bg-gray-200'} rounded-full h-2`}>
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
            <div className={`bg-gradient-to-r ${dk ? 'from-slate-800 to-slate-800 shadow-slate-900/30 border-indigo-800' : 'from-blue-50 to-indigo-50 border-indigo-200'} rounded-xl shadow-md p-6 border`}>
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 ${dk ? 'bg-indigo-900/30' : 'bg-indigo-100'} rounded-lg`}>
                  <CheckCircle className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>Predictive Recommendations</h3>
                  <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Action items to optimize your spending</p>
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
                  <div key={index} className={`${dk ? 'bg-slate-800 shadow-slate-900/30' : 'bg-white'} rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow`}>
                    <div className="flex items-start justify-between mb-2">
                      <h4 className={`font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>{rec.title}</h4>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        rec.impact === 'High' ? (dk ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700') :
                        rec.impact === 'Medium' ? (dk ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700') :
                        (dk ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700')
                      }`}>
                        {rec.impact}
                      </span>
                    </div>
                    <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'} mb-3`}>{rec.description}</p>
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
    </PageTransition>
    </MainLayout>
  );
};

// Helper Components
const IndicatorCard = ({ name, value }) => {
  const { mode } = useTheme();
  const dk = mode === 'dark' || mode === 'black';

  const getColor = (val) => {
    if (val >= 75) return dk ? 'text-green-400 bg-green-900/30' : 'text-green-600 bg-green-100';
    if (val >= 50) return dk ? 'text-blue-400 bg-blue-900/30' : 'text-blue-600 bg-blue-100';
    if (val >= 25) return dk ? 'text-yellow-400 bg-yellow-900/30' : 'text-yellow-600 bg-yellow-100';
    return dk ? 'text-red-400 bg-red-900/30' : 'text-red-600 bg-red-100';
  };

  return (
    <div className={`p-4 border ${dk ? 'border-slate-700' : 'border-gray-200'} rounded-lg`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`${dk ? 'text-slate-300' : 'text-gray-700'} capitalize`}>
          {name.replace(/([A-Z])/g, ' $1').trim()}
        </span>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getColor(value.score || value)}`}>
          {value.score || value}
        </span>
      </div>
      {value.message && (
        <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'}`}>{value.message}</p>
      )}
      <div className={`mt-2 w-full ${dk ? 'bg-slate-700' : 'bg-gray-200'} rounded-full h-2`}>
        <div
          className="bg-indigo-600 h-2 rounded-full"
          style={{ width: `${value.score || value}%` }}
        ></div>
      </div>
    </div>
  );
};

const RecommendationCard = ({ recommendation }) => {
  const { mode } = useTheme();
  const dk = mode === 'dark' || mode === 'black';

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high':
        return dk ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return dk ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' : 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return dk ? 'bg-blue-900/30 text-blue-400 border-blue-800' : 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className={`p-6 border-l-4 rounded-lg ${getPriorityColor(recommendation.priority)} border`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5" />
          <h4 className={`font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>{recommendation.title}</h4>
        </div>
        <span className={`px-2 py-1 ${dk ? 'bg-slate-700 text-slate-200' : 'bg-white'} rounded text-xs font-semibold uppercase`}>
          {recommendation.priority}
        </span>
      </div>
      <p className={`text-sm ${dk ? 'text-slate-300' : 'text-gray-700'} mb-3`}>{recommendation.message}</p>
      {recommendation.action && (
        <div className={`flex items-start mt-3 p-3 ${dk ? 'bg-slate-700' : 'bg-white'} rounded`}>
          <span className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'}`}>{recommendation.action}</span>
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

