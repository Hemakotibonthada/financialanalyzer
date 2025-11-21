import React, { useState, useMemo } from 'react';
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
  const [showInvestments, setShowInvestments] = useState(false);

  // Early return with safe checks
  if (!categoryData || !categoryData.chartData || !Array.isArray(categoryData.chartData) || categoryData.chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Category Breakdown</h3>
        <p className="text-gray-500">No category data available yet.</p>
      </div>
    );
  }

  const { chartData = [], summary = {} } = categoryData;

  // Filter data based on showInvestments checkbox
  const filteredChartData = useMemo(() => {
    if (showInvestments) {
      return chartData;
    }
    // Filter out investment-related categories
    return chartData.filter(item => {
      const category = (item?.category || '').toLowerCase();
      return !category.includes('investment') && 
             !category.includes('stock') && 
             !category.includes('mutual') &&
             !category.includes('equity') &&
             !category.includes('bond') &&
             !category.includes('crypto');
    });
  }, [chartData, showInvestments]);

  // Recalculate summary based on filtered data
  const filteredSummary = useMemo(() => {
    if (filteredChartData.length === 0) {
      return { totalAmount: 0, totalCategories: 0, diversificationIndex: 0, topCategory: null };
    }

    const totalAmount = filteredChartData.reduce((sum, item) => sum + (item?.amount || 0), 0);
    const totalCategories = filteredChartData.length;
    
    // Recalculate percentages
    const dataWithPercentages = filteredChartData.map(item => ({
      ...item,
      percentage: totalAmount > 0 ? ((item?.amount || 0) / totalAmount) * 100 : 0
    }));

    // Calculate diversity index (Shannon entropy)
    const diversificationIndex = dataWithPercentages.reduce((index, item) => {
      const p = item.percentage / 100;
      return p > 0 ? index - (p * Math.log(p)) : index;
    }, 0);

    // Find top category
    const topCategory = dataWithPercentages.length > 0 
      ? dataWithPercentages[0]?.category 
      : null;

    return {
      totalAmount,
      totalCategories,
      diversificationIndex,
      topCategory,
      dataWithPercentages
    };
  }, [filteredChartData]);

  // Chart.js configuration for interactive donut chart
  const interactiveChartData = {
    labels: (filteredSummary.dataWithPercentages || filteredChartData || []).slice(0, 8).map(item => 
      (item?.category || 'Unknown').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    ),
    datasets: [{
      data: (filteredSummary.dataWithPercentages || filteredChartData || []).slice(0, 8).map(item => item?.amount || 0),
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
            const displayData = filteredSummary.dataWithPercentages || filteredChartData;
            const categoryItem = Array.isArray(displayData) && displayData.length > 0 ? displayData.find(item => 
              item && item.category && item.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) === label
            ) : null;
            const percentage = categoryItem?.percentage || 0;
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
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Category Breakdown</h3>
            <p className="text-sm text-gray-600 mt-1">Spending by category (last 6 months)</p>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showInvestments"
              checked={showInvestments}
              onChange={(e) => setShowInvestments(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
            />
            <label 
              htmlFor="showInvestments" 
              className="text-sm text-gray-700 cursor-pointer select-none"
            >
              Show Investments
            </label>
          </div>
        </div>
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
                  ₹{filteredSummary?.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 0 }) || '0'}
                </p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Category List */}
        <div className="space-y-3">
          {(filteredSummary.dataWithPercentages || filteredChartData || []).slice(0, 8).map((category, index) => {
            if (!category) return null;
            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: category.color || '#CCCCCC' }}
                  ></div>
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {category.category || 'Unknown'}
                  </span>
                </div>
                <div className="text-right ml-2">
                  <p className="text-sm font-medium text-gray-900">
                    ₹{(category.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500">{(category.percentage || 0).toFixed(1)}%</p>
                </div>
              </div>
            );
          })}
          
          {filteredChartData && filteredChartData.length > 8 && (
            <div className="text-xs text-gray-500 text-center pt-2">
              +{filteredChartData.length - 8} more categories
            </div>
          )}
        </div>
        
        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-gray-900">{filteredSummary?.totalCategories || 0}</p>
              <p className="text-xs text-gray-500">Categories</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">
                {filteredSummary?.diversificationIndex?.toFixed(2) || '0.00'}
              </p>
              <p className="text-xs text-gray-500">Diversity Index</p>
            </div>
          </div>
        </div>
        
        {filteredSummary?.topCategory && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-900">
              Top Category: {filteredSummary.topCategory}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryBreakdown;