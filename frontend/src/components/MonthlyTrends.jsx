import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Calendar, BarChart3, DollarSign, PiggyBank } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const MonthlyTrends = ({ trendsData }) => {
  const [viewType, setViewType] = useState('line'); // 'line' or 'bar'
  const [showInvestments, setShowInvestments] = useState(true);

  if (!trendsData || !trendsData.trends || trendsData.trends.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Trends</h3>
        <p className="text-gray-500">No trend data available yet. Upload some documents to see your financial trends.</p>
      </div>
    );
  }

  const { trends, summary } = trendsData;

  // Prepare datasets
  const datasets = [
    {
      label: 'Income',
      data: trends.map(trend => trend.totalIncome || 0),
      borderColor: '#10B981',
      backgroundColor: viewType === 'bar' ? 'rgba(16, 185, 129, 0.8)' : 'rgba(16, 185, 129, 0.1)',
      tension: 0.4,
      fill: viewType === 'line',
      pointBackgroundColor: '#10B981',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7
    },
    {
      label: 'Spending',
      data: trends.map(trend => trend.totalSpending || 0),
      borderColor: '#EF4444',
      backgroundColor: viewType === 'bar' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(239, 68, 68, 0.1)',
      tension: 0.4,
      fill: viewType === 'line',
      pointBackgroundColor: '#EF4444',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7
    }
  ];

  // Add investments dataset if available and visible
  if (showInvestments && trends.some(t => t.totalInvestments > 0)) {
    datasets.push({
      label: 'Investments',
      data: trends.map(trend => trend.totalInvestments || 0),
      borderColor: '#8B5CF6',
      backgroundColor: viewType === 'bar' ? 'rgba(139, 92, 246, 0.8)' : 'rgba(139, 92, 246, 0.1)',
      tension: 0.4,
      fill: viewType === 'line',
      pointBackgroundColor: '#8B5CF6',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7
    });
  }

  // Add net savings for line view
  if (viewType === 'line') {
    datasets.push({
      label: 'Net Savings',
      data: trends.map(trend => (trend.totalIncome || 0) - (trend.totalSpending || 0)),
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
      fill: false,
      pointBackgroundColor: '#3B82F6',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderDash: [5, 5]
    });
  }

  // Chart.js configuration
  const chartData = {
    labels: trends.map(trend => {
      const date = new Date(trend.month + '-01');
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }),
    datasets: datasets
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
            weight: '500'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y || 0;
            return `${label}: ₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        border: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        border: {
          display: false
        },
        ticks: {
          callback: function(value) {
            if (value >= 1000) {
              return '₹' + (value / 1000).toFixed(0) + 'k';
            }
            return '₹' + value.toLocaleString('en-IN');
          },
          font: {
            size: 11
          }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    animation: {
      duration: 1000
    }
  };

  // Calculate additional insights
  const latestMonth = trends[trends.length - 1];
  const previousMonth = trends[trends.length - 2];
  const monthOverMonthChange = previousMonth ? 
    ((latestMonth.totalSpending - previousMonth.totalSpending) / previousMonth.totalSpending * 100) : 0;
  
  const totalInvestments = trends.reduce((sum, t) => sum + (t.totalInvestments || 0), 0);
  const avgSavingsRate = summary?.averageIncome > 0 ? 
    ((summary.averageIncome - summary.averageSpending) / summary.averageIncome * 100) : 0;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Monthly Trends</h3>
            <p className="text-sm text-gray-600 mt-1">Income and spending over time</p>
          </div>
          <div className="flex items-center space-x-3">
            {/* View Type Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewType('line')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewType === 'line' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Line
              </button>
              <button
                onClick={() => setViewType('bar')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewType === 'bar' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Bar
              </button>
            </div>
            
            {/* Show Investments Toggle */}
            {trends.some(t => t.totalInvestments > 0) && (
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInvestments}
                  onChange={(e) => setShowInvestments(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Show Investments</span>
              </label>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {/* Enhanced Summary Stats with 4 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div className={`flex items-center text-xs font-medium ${
                summary?.incomeTrend >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {summary?.incomeTrend >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {Math.abs(summary?.incomeTrend || 0).toFixed(1)}%
              </div>
            </div>
            <p className="text-2xl font-bold text-green-700">
              ₹{(summary?.averageIncome || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-green-600 mt-1">Avg Monthly Income</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 text-red-600" />
              <div className={`flex items-center text-xs font-medium ${
                summary?.spendingTrend > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {summary?.spendingTrend > 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {Math.abs(summary?.spendingTrend || 0).toFixed(1)}%
              </div>
            </div>
            <p className="text-2xl font-bold text-red-700">
              ₹{(summary?.averageSpending || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-red-600 mt-1">Avg Monthly Spending</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-8 h-8 text-purple-600" />
              <div className="flex items-center text-xs font-medium text-purple-600">
                <TrendingUp className="w-3 h-3 mr-1" />
                {trends.length} months
              </div>
            </div>
            <p className="text-2xl font-bold text-purple-700">
              ₹{totalInvestments.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-purple-600 mt-1">Total Investments</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <PiggyBank className="w-8 h-8 text-blue-600" />
              <div className={`flex items-center text-xs font-medium ${
                avgSavingsRate >= 20 ? 'text-green-600' : avgSavingsRate >= 10 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {avgSavingsRate >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {Math.abs(avgSavingsRate).toFixed(1)}%
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-700">
              ₹{((summary?.averageIncome || 0) - (summary?.averageSpending || 0)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-blue-600 mt-1">Avg Savings Rate</p>
          </div>
        </div>

        {/* Month over Month Comparison */}
        {previousMonth && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Month-over-Month Change</p>
                <p className="text-xs text-gray-500 mt-1">
                  Comparing {new Date(latestMonth.month).toLocaleDateString('en-US', { month: 'long' })} vs {new Date(previousMonth.month).toLocaleDateString('en-US', { month: 'long' })}
                </p>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <p className={`text-lg font-bold ${monthOverMonthChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {monthOverMonthChange > 0 ? '+' : ''}{monthOverMonthChange.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-600">Spending Change</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">
                    ₹{Math.abs(latestMonth.totalSpending - previousMonth.totalSpending).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-gray-600">Difference</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Chart */}
        <div className="h-96 mt-6">
          {viewType === 'line' ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <Bar data={chartData} options={chartOptions} />
          )}
        </div>

        {/* Insights Footer */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">Best Month</p>
              <p className="text-lg font-semibold text-green-600">
                {(() => {
                  const bestMonth = trends.reduce((max, t) => 
                    ((t.totalIncome - t.totalSpending) > (max.totalIncome - max.totalSpending)) ? t : max
                  );
                  return new Date(bestMonth.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                })()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Period</p>
              <p className="text-lg font-semibold text-gray-900">{trends.length} months</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Consistency Score</p>
              <p className="text-lg font-semibold text-blue-600">
                {(() => {
                  const variance = trends.reduce((sum, t) => {
                    const diff = t.totalSpending - summary.averageSpending;
                    return sum + (diff * diff);
                  }, 0) / trends.length;
                  const stdDev = Math.sqrt(variance);
                  const consistency = Math.max(0, 100 - (stdDev / summary.averageSpending * 100));
                  return consistency.toFixed(0) + '%';
                })()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyTrends;