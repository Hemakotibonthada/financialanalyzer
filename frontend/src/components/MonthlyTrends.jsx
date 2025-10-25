import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
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
  if (!trendsData || !trendsData.trends || trendsData.trends.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Trends</h3>
        <p className="text-gray-500">No trend data available yet.</p>
      </div>
    );
  }

  const { trends, summary } = trendsData;

  // Chart.js configuration for interactive line chart
  const chartData = {
    labels: trends.map(trend => {
      const date = new Date(trend.month + '-01');
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }),
    datasets: [
      {
        label: 'Income',
        data: trends.map(trend => trend.totalIncome || 0),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
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
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#EF4444',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7
      },
      {
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
      }
    ]
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
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y || 0;
            return `${label}: ₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
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
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        border: {
          display: false
        },
        ticks: {
          callback: function(value) {
            return '₹' + value.toLocaleString('en-IN');
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

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Monthly Trends</h3>
            <p className="text-sm text-gray-600 mt-1">Income and spending over time</p>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
              <span>Income</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
              <span>Spending</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              ₹{(summary?.averageIncome || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-600">Avg Monthly Income</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              ₹{(summary?.averageSpending || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-600">Avg Monthly Spending</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center">
              {summary?.spendingTrend > 0 ? (
                <TrendingUp className="w-6 h-6 text-red-500 mr-1" />
              ) : (
                <TrendingDown className="w-6 h-6 text-green-500 mr-1" />
              )}
              <p className={`text-2xl font-bold ${summary?.spendingTrend > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {Math.abs(summary?.spendingTrend || 0).toFixed(1)}%
              </p>
            </div>
            <p className="text-sm text-gray-600">Spending Trend</p>
          </div>
        </div>

        {/* Interactive Line Chart */}
        <div className="h-80 mt-6">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};

export default MonthlyTrends;