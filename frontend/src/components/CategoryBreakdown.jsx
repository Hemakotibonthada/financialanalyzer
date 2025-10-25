import React from 'react';
import { PieChart } from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const CategoryBreakdown = ({ categoryData }) => {
  if (!categoryData || !categoryData.chartData || categoryData.chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Category Breakdown</h3>
        <p className="text-gray-500">No category data available yet.</p>
      </div>
    );
  }

  const { chartData, summary } = categoryData;

  // Chart.js configuration for interactive donut chart
  const interactiveChartData = {
    labels: chartData.slice(0, 8).map(item => 
      item.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    ),
    datasets: [{
      data: chartData.slice(0, 8).map(item => item.amount),
      backgroundColor: [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#FF6384', '#C9CBCF'
      ],
      borderColor: '#fff',
      borderWidth: 2,
      hoverBorderWidth: 3,
      hoverOffset: 4
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false // We'll show a custom legend below
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const categoryData = chartData.find(item => 
              item.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) === label
            );
            const percentage = categoryData?.percentage || 0;
            return `${label}: ₹${value.toLocaleString('en-IN')} (${percentage.toFixed(1)}%)`;
          }
        }
      }
    },
    cutout: '60%',
    animation: {
      animateRotate: true,
      duration: 1000
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Category Breakdown</h3>
        <p className="text-sm text-gray-600 mt-1">Spending by category (last 6 months)</p>
      </div>
      
      <div className="p-6">
        {/* Interactive Donut Chart */}
        <div className="mb-6">
          <div className="relative h-64 w-64 mx-auto">
            <Doughnut data={interactiveChartData} options={chartOptions} />
            {/* Center content overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <PieChart className="w-8 h-8 text-gray-400 mb-1" />
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">
                  ₹{summary?.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 0 }) || '0'}
                </p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Category List */}
        <div className="space-y-3">
          {chartData.slice(0, 8).map((category, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-3"
                  style={{ backgroundColor: category.color }}
                ></div>
                <span className="text-sm font-medium text-gray-900 truncate">
                  {category.category}
                </span>
              </div>
              <div className="text-right ml-2">
                <p className="text-sm font-medium text-gray-900">
                  ₹{category.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500">{category.percentage}%</p>
              </div>
            </div>
          ))}
          
          {chartData.length > 8 && (
            <div className="text-xs text-gray-500 text-center pt-2">
              +{chartData.length - 8} more categories
            </div>
          )}
        </div>
        
        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-gray-900">{summary?.totalCategories || 0}</p>
              <p className="text-xs text-gray-500">Categories</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">
                {summary?.diversificationIndex?.toFixed(2) || '0.00'}
              </p>
              <p className="text-xs text-gray-500">Diversity Index</p>
            </div>
          </div>
        </div>
        
        {summary?.topCategory && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-900">
              Top Category: {summary.topCategory}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryBreakdown;