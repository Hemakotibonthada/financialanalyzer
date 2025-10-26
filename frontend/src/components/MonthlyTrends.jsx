import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Calendar, BarChart3, DollarSign, PiggyBank } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const MonthlyTrends = ({ trendsData }) => {
  const [showInvestments, setShowInvestments] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  if (!trendsData || !trendsData.trends || trendsData.trends.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Trends</h3>
        <p className="text-gray-500">No trend data available yet. Upload bank statements to see your financial trends.</p>
      </div>
    );
  }

  const { trends, summary } = trendsData;
  
  // Log data source for debugging
  console.log('📊 Monthly Trends - Data Source:', {
    trendsCount: trends?.length,
    hasRealData: trends && trends.length > 0,
    dataSource: 'Backend API (/api/analytics/dashboard)',
    basedOn: 'Bank Statements & Profile Settings'
  });

  // Filter trends based on date range
  const filteredTrends = useMemo(() => {
    if (!startDate && !endDate) return trends;
    
    return trends.filter(trend => {
      const trendDate = new Date(trend.month + '-01');
      const start = startDate ? new Date(startDate + '-01') : null;
      const end = endDate ? new Date(endDate + '-01') : null;
      
      if (start && end) {
        return trendDate >= start && trendDate <= end;
      } else if (start) {
        return trendDate >= start;
      } else if (end) {
        return trendDate <= end;
      }
      return true;
    });
  }, [trends, startDate, endDate]);

  // Recalculate summary for filtered data
  const filteredSummary = useMemo(() => {
    if (filteredTrends.length === 0) return summary;
    
    const totalSpending = filteredTrends.reduce((sum, t) => sum + (t.totalSpending || 0), 0);
    const totalIncome = filteredTrends.reduce((sum, t) => sum + (t.totalIncome || 0), 0);
    const totalInvestments = filteredTrends.reduce((sum, t) => sum + (t.totalInvestments || 0), 0);
    const monthCount = filteredTrends.length;
    
    return {
      totalMonths: monthCount,
      averageSpending: monthCount > 0 ? totalSpending / monthCount : 0,
      averageIncome: monthCount > 0 ? totalIncome / monthCount : 0,
      averageInvestments: monthCount > 0 ? totalInvestments / monthCount : 0,
      spendingTrend: filteredTrends.length >= 2 && filteredTrends[0].totalSpending > 0 ? 
        ((filteredTrends[filteredTrends.length - 1].totalSpending - filteredTrends[0].totalSpending) / filteredTrends[0].totalSpending * 100) : 0,
      incomeTrend: filteredTrends.length >= 2 && filteredTrends[0].totalIncome > 0 ? 
        ((filteredTrends[filteredTrends.length - 1].totalIncome - filteredTrends[0].totalIncome) / filteredTrends[0].totalIncome * 100) : 0
    };
  }, [filteredTrends, summary]);

  // Prepare datasets (always line chart with area fills)
  const datasets = [
    {
      label: 'Income',
      data: filteredTrends.map(trend => trend.totalIncome || 0),
      borderColor: '#10B981',
      backgroundColor: 'rgba(16, 185, 129, 0.2)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: '#10B981',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2
    },
    {
      label: 'Spending',
      data: filteredTrends.map(trend => trend.totalSpending || 0),
      borderColor: '#F97316',
      backgroundColor: 'rgba(249, 115, 22, 0.2)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: '#F97316',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2
    }
  ];

  // Add investments dataset if available and visible
  if (showInvestments && filteredTrends.some(t => t.totalInvestments > 0)) {
    datasets.push({
      label: 'Investments',
      data: filteredTrends.map(trend => trend.totalInvestments || 0),
      borderColor: '#A855F7',
      backgroundColor: 'rgba(168, 85, 247, 0.2)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: '#A855F7',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2
    });
  }

  // Add net savings (dashed line)
  datasets.push({
    label: 'Net Savings',
    data: filteredTrends.map(trend => (trend.totalIncome || 0) - (trend.totalSpending || 0) - (trend.totalInvestments || 0)),
    borderColor: '#3B82F6',
    backgroundColor: 'transparent',
    tension: 0.4,
    fill: false,
    pointBackgroundColor: '#3B82F6',
    pointBorderColor: '#fff',
    pointBorderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6,
    borderDash: [5, 5],
    borderWidth: 2
  });

  // Chart.js configuration
  const chartData = {
    labels: filteredTrends.map(trend => {
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
        position: 'bottom',
        align: 'center',
        labels: {
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 13,
            weight: '500',
            family: "'Inter', 'system-ui', sans-serif"
          },
          color: '#374151',
          boxWidth: 8,
          boxHeight: 8
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y || 0;
            return `${label}: ₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false
        },
        border: {
          display: false
        },
        ticks: {
          font: {
            size: 12,
            family: "'Inter', 'system-ui', sans-serif"
          },
          color: '#6B7280',
          padding: 8
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false
        },
        border: {
          display: false,
          dash: [3, 3]
        },
        ticks: {
          callback: function(value) {
            if (value >= 100000) {
              return '₹' + (value / 100000).toFixed(0) + 'L';
            } else if (value >= 1000) {
              return '₹' + (value / 1000).toFixed(0) + 'k';
            }
            return '₹' + value.toLocaleString('en-IN');
          },
          font: {
            size: 11,
            family: "'Inter', 'system-ui', sans-serif"
          },
          color: '#6B7280',
          padding: 10
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart'
    }
  };

  // Calculate additional insights using filtered data
  const latestMonth = filteredTrends[filteredTrends.length - 1];
  const previousMonth = filteredTrends[filteredTrends.length - 2];
  const monthOverMonthChange = previousMonth ? 
    ((latestMonth.totalSpending - previousMonth.totalSpending) / previousMonth.totalSpending * 100) : 0;
  
  const totalInvestments = filteredTrends.reduce((sum, t) => sum + (t.totalInvestments || 0), 0);
  const avgSavingsRate = filteredSummary?.averageIncome > 0 ? 
    ((filteredSummary.averageIncome - filteredSummary.averageSpending) / filteredSummary.averageIncome * 100) : 0;

  // Get min and max dates for date pickers
  const minDate = trends.length > 0 ? trends[0].month : '';
  const maxDate = trends.length > 0 ? trends[trends.length - 1].month : '';

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Monthly Trends</h3>
            <p className="text-sm text-gray-600 mt-1">Income and spending over time</p>
          </div>
          <div className="flex items-center flex-wrap gap-3">
            {/* Date Range Filters */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="month"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={minDate}
                max={endDate || maxDate}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Start"
              />
              <span className="text-gray-500">to</span>
              <input
                type="month"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || minDate}
                max={maxDate}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="End"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                >
                  Clear
                </button>
              )}
            </div>
            
            {/* Show Investments Toggle */}
            {filteredTrends.some(t => t.totalInvestments > 0) && (
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
        {/* Data Source Indicator */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-800">
            <strong>Real Data:</strong> All values below are calculated from your actual bank statements and transaction history.
          </p>
        </div>

        {/* Enhanced Summary Stats with 4 cards - Data from Bank Statements */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div 
            className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 cursor-help" 
            title="Calculated from your bank statements and credit transactions"
          >
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div className={`flex items-center text-xs font-medium ${
                filteredSummary?.incomeTrend >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {filteredSummary?.incomeTrend >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {Math.abs(filteredSummary?.incomeTrend || 0).toFixed(1)}%
              </div>
            </div>
            <p className="text-2xl font-bold text-green-700">
              ₹{(filteredSummary?.averageIncome || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-green-600 mt-1">Avg Monthly Income</p>
            <p className="text-[10px] text-green-500 mt-1 opacity-75">From bank statements</p>
          </div>

          <div 
            className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200 cursor-help"
            title="Calculated from your bank statements and debit transactions"
          >
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 text-red-600" />
              <div className={`flex items-center text-xs font-medium ${
                filteredSummary?.spendingTrend > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {filteredSummary?.spendingTrend > 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {Math.abs(filteredSummary?.spendingTrend || 0).toFixed(1)}%
              </div>
            </div>
            <p className="text-2xl font-bold text-red-700">
              ₹{(filteredSummary?.averageSpending || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-red-600 mt-1">Avg Monthly Spending</p>
            <p className="text-[10px] text-red-500 mt-1 opacity-75">From bank statements</p>
          </div>

          <div 
            className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200 cursor-help"
            title="Total investment transactions from your bank statements"
          >
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-8 h-8 text-purple-600" />
              <div className="flex items-center text-xs font-medium text-purple-600">
                <TrendingUp className="w-3 h-3 mr-1" />
                {filteredTrends.length} months
              </div>
            </div>
            <p className="text-2xl font-bold text-purple-700">
              ₹{totalInvestments.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-purple-600 mt-1">Total Investments</p>
            <p className="text-[10px] text-purple-500 mt-1 opacity-75">From bank statements</p>
          </div>

          <div 
            className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 cursor-help"
            title="Average savings calculated as Income - Spending from your transactions"
          >
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
              ₹{((filteredSummary?.averageIncome || 0) - (filteredSummary?.averageSpending || 0)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-blue-600 mt-1">Avg Savings Amount</p>
            <p className="text-[10px] text-blue-500 mt-1 opacity-75">From bank statements</p>
          </div>
        </div>

        {/* Month over Month Comparison */}
        {previousMonth && latestMonth && (
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

        {/* Interactive Chart - Always Line Chart */}
        <div className="h-[500px] mt-6 bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <Line data={chartData} options={chartOptions} />
        </div>

        {/* Insights Footer */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">Best Month</p>
              <p className="text-lg font-semibold text-green-600">
                {(() => {
                  if (filteredTrends.length === 0) return 'N/A';
                  const bestMonth = filteredTrends.reduce((max, t) => 
                    ((t.totalIncome - t.totalSpending) > (max.totalIncome - max.totalSpending)) ? t : max
                  );
                  return new Date(bestMonth.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                })()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Period</p>
              <p className="text-lg font-semibold text-gray-900">{filteredTrends.length} months</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Consistency Score</p>
              <p className="text-lg font-semibold text-blue-600">
                {(() => {
                  if (filteredTrends.length === 0 || !filteredSummary.averageSpending) return '0%';
                  const variance = filteredTrends.reduce((sum, t) => {
                    const diff = t.totalSpending - filteredSummary.averageSpending;
                    return sum + (diff * diff);
                  }, 0) / filteredTrends.length;
                  const stdDev = Math.sqrt(variance);
                  const consistency = Math.max(0, 100 - (stdDev / filteredSummary.averageSpending * 100));
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