import React from 'react';
import { Target, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

const BudgetTracker = ({ budgetData }) => {
  if (!budgetData || !budgetData.hasBudget) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Budget Tracker</h3>
        <div className="text-center py-8">
          <Target className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-slate-400 mb-4">{budgetData?.message || 'No budget configured'}</p>
          {budgetData?.recommendation && (
            <p className="text-sm text-gray-400 dark:text-slate-500">{budgetData.recommendation}</p>
          )}
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      case 'warning': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'critical': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400';
      case 'over': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      default: return 'text-gray-600 bg-gray-100 dark:text-slate-400 dark:bg-slate-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'good': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'critical': return AlertTriangle;
      case 'over': return AlertTriangle;
      default: return Target;
    }
  };

  const overallPercentage = budgetData.totalBudget > 0 ? 
    Math.min((budgetData.totalSpent / budgetData.totalBudget) * 100, 100) : 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Budget Tracker</h3>
        <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Monthly budget progress</p>
      </div>
      
      <div className="p-6">
        {/* Overall Budget Status */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Overall Budget</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(budgetData.overallStatus)}`}>
              {budgetData.overallStatus?.charAt(0).toUpperCase() + budgetData.overallStatus?.slice(1)}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-4 mb-2">
            <div 
              className={`h-4 rounded-full transition-all duration-500 ${
                budgetData.overallStatus === 'good' ? 'bg-green-500' :
                budgetData.overallStatus === 'warning' ? 'bg-yellow-500' :
                budgetData.overallStatus === 'critical' ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${overallPercentage}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-slate-400">
              Spent: ₹{budgetData.totalSpent?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
            </span>
            <span className="text-gray-600 dark:text-slate-400">
              Budget: ₹{budgetData.totalBudget?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
            </span>
          </div>
          
          <div className="mt-2 text-center">
            <p className={`text-lg font-bold ${
              budgetData.totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              ₹{Math.abs(budgetData.totalRemaining || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} 
              {budgetData.totalRemaining >= 0 ? ' Remaining' : ' Over Budget'}
            </p>
          </div>
        </div>

        {/* Category Budgets */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Category Breakdown</h4>
          
          <div className="space-y-4 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-gray-100 dark:scrollbar-track-slate-800">
          {budgetData.categories && Array.isArray(budgetData.categories) && budgetData.categories.map((category, index) => {
            if (!category) return null;
            const StatusIcon = getStatusIcon(category.status || 'good');
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <StatusIcon className={`w-4 h-4 mr-2 ${
                      category.status === 'good' ? 'text-green-500' :
                      category.status === 'warning' ? 'text-yellow-500' :
                      category.status === 'critical' ? 'text-orange-500' : 'text-red-500'
                    }`} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{category.category || 'Unknown'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium">
                      ${(category.spent || 0).toFixed(2)} / ${(category.budget || 0).toFixed(2)}
                    </span>
                    <span className={`ml-2 text-xs ${
                      category.status === 'good' ? 'text-green-600' :
                      category.status === 'warning' ? 'text-yellow-600' :
                      category.status === 'critical' ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {(category.percentUsed || 0).toFixed(0)}%
                    </span>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      category.status === 'good' ? 'bg-green-500' :
                      category.status === 'warning' ? 'bg-yellow-500' :
                      category.status === 'critical' ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(category.percentUsed || 0, 100)}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
          </div>
        </div>

        {/* Alerts */}
        {budgetData.alerts && budgetData.alerts.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Budget Alerts</h4>
            <div className="space-y-2">
              {budgetData.alerts.map((alert, index) => (
                <div key={index} className={`p-3 rounded-lg ${
                  alert.severity === 'over' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                }`}>
                  <div className="flex items-center">
                    <AlertTriangle className={`w-4 h-4 mr-2 ${
                      alert.severity === 'over' ? 'text-red-500' : 'text-orange-500'
                    }`} />
                    <span className={`text-sm font-medium ${
                      alert.severity === 'over' ? 'text-red-800 dark:text-red-300' : 'text-orange-800 dark:text-orange-300'
                    }`}>
                      {alert.category}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${
                    alert.severity === 'over' ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'
                  }`}>
                    {alert.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projected Month End */}
        {budgetData.projectedMonthEnd && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 text-blue-500 mr-2" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Projected Month End</span>
              </div>
              <span className={`text-sm font-medium ${
                budgetData.projectedMonthEnd > budgetData.totalBudget ? 'text-red-600' : 'text-blue-600'
              }`}>
                ₹{budgetData.projectedMonthEnd.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetTracker;