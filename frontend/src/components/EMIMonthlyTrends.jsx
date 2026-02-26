import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Calendar, CreditCard, DollarSign, PiggyBank } from 'lucide-react';
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

const EMIMonthlyTrends = ({ monthlyData }) => {
  const [viewType, setViewType] = useState('line'); // 'line' or 'bar'

  if (!monthlyData || monthlyData.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">📊 EMI Monthly Trends</h3>
        <p className="text-gray-500 dark:text-slate-400">No EMI trend data available yet. Sync your statements to see monthly trends.</p>
      </div>
    );
  }

  // Calculate summary statistics
  const totalMonthlyBurden = monthlyData.reduce((sum, m) => sum + m.totalAmount, 0) / monthlyData.length;
  const maxMonthlyBurden = Math.max(...monthlyData.map(m => m.totalAmount));
  const minMonthlyBurden = Math.min(...monthlyData.map(m => m.totalAmount));
  const totalEMIs = monthlyData.reduce((sum, m) => sum + m.emiCount, 0);
  
  // Calculate trend (comparing first vs last month)
  const firstMonth = monthlyData[0];
  const lastMonth = monthlyData[monthlyData.length - 1];
  const trend = firstMonth.totalAmount > 0 
    ? ((lastMonth.totalAmount - firstMonth.totalAmount) / firstMonth.totalAmount * 100) 
    : 0;

  // Prepare datasets
  const datasets = [
    {
      label: 'Total EMI Payments',
      data: monthlyData.map(m => m.totalAmount || 0),
      borderColor: '#EF4444',
      backgroundColor: viewType === 'bar' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(239, 68, 68, 0.1)',
      tension: 0.4,
      fill: viewType === 'line',
      pointBackgroundColor: '#EF4444',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7
    },
    {
      label: 'Number of EMIs',
      data: monthlyData.map(m => (m.emiCount || 0) * 1000), // Scale for visibility
      borderColor: '#3B82F6',
      backgroundColor: viewType === 'bar' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
      fill: viewType === 'line',
      pointBackgroundColor: '#3B82F6',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      yAxisID: 'y1',
      hidden: viewType === 'bar' // Hide in bar view for clarity
    }
  ];

  // Chart.js configuration
  const chartData = {
    labels: monthlyData.map(m => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[m.month - 1]} ${m.year}`;
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
          },
          filter: function(item, chart) {
            // Hide 'Number of EMIs' in bar view
            return !(viewType === 'bar' && item.text === 'Number of EMIs');
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
            let value = context.parsed.y || 0;
            
            // For EMI count, divide by 1000 (we scaled it up for visibility)
            if (label === 'Number of EMIs') {
              value = value / 1000;
              return `${label}: ${value} EMIs`;
            }
            
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
        type: 'linear',
        display: true,
        position: 'left',
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
      },
      y1: {
        type: 'linear',
        display: viewType === 'line',
        position: 'right',
        beginAtZero: true,
        grid: {
          drawOnChartArea: false
        },
        border: {
          display: false
        },
        ticks: {
          callback: function(value) {
            return (value / 1000).toFixed(0);
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

  // Find peak month
  const peakMonth = monthlyData.reduce((max, m) => 
    m.totalAmount > max.totalAmount ? m : max
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">📊 EMI Monthly Trends</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Your EMI payment patterns over time</p>
          </div>
          <div className="flex items-center space-x-3">
            {/* View Type Toggle */}
            <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setViewType('line')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewType === 'line' 
                    ? 'bg-white dark:bg-slate-600 text-blue-600 shadow-sm' 
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Line
              </button>
              <button
                onClick={() => setViewType('bar')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewType === 'bar' 
                    ? 'bg-white dark:bg-slate-600 text-blue-600 shadow-sm' 
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Bar
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {/* Enhanced Summary Stats with 4 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 rounded-lg p-4 border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-red-600" />
              <div className={`flex items-center text-xs font-medium ${
                trend > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {trend > 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {Math.abs(trend).toFixed(1)}%
              </div>
            </div>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">
              ₹{totalMonthlyBurden.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">Avg Monthly Burden</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-orange-600" />
              <div className="flex items-center text-xs font-medium text-orange-600">
                <Calendar className="w-3 h-3 mr-1" />
                Peak
              </div>
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
              ₹{maxMonthlyBurden.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Highest Month</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <TrendingDown className="w-8 h-8 text-green-600" />
              <div className="flex items-center text-xs font-medium text-green-600">
                <Calendar className="w-3 h-3 mr-1" />
                Low
              </div>
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">
              ₹{minMonthlyBurden.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">Lowest Month</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <CreditCard className="w-8 h-8 text-blue-600" />
              <div className="flex items-center text-xs font-medium text-blue-600">
                <PiggyBank className="w-3 h-3 mr-1" />
                Total
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {totalEMIs}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Total Payments</p>
          </div>
        </div>

        {/* Peak Month Alert */}
        <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Peak EMI Month</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Your highest EMI payment month in the analyzed period
              </p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <p className="text-lg font-bold text-amber-900 dark:text-amber-100">
                  {`${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][peakMonth.month - 1]} ${peakMonth.year}`}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">Month</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber-900 dark:text-amber-100">
                  ₹{peakMonth.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">Amount</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber-900 dark:text-amber-100">
                  {peakMonth.emiCount}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">EMIs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Chart */}
        <div className="h-96 mt-6">
          {viewType === 'line' ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <Bar data={chartData} options={chartOptions} />
          )}
        </div>

        {/* Insights Footer */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Analysis Period</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{monthlyData.length} months</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Total Paid</p>
              <p className="text-lg font-semibold text-blue-600">
                ₹{monthlyData.reduce((sum, m) => sum + m.totalAmount, 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Trend</p>
              <p className={`text-lg font-semibold ${trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EMIMonthlyTrends;
