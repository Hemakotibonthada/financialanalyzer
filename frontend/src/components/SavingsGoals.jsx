import React from 'react';
import { Target, CheckCircle, Clock, TrendingUp } from 'lucide-react';

const SavingsGoals = ({ savingsData }) => {
  if (!savingsData || !savingsData.hasGoals) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Savings Goals</h3>
        <div className="text-center py-8">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No savings goals set</p>
          {savingsData?.recommendation && (
            <p className="text-sm text-gray-400">{savingsData.recommendation}</p>
          )}
        </div>
      </div>
    );
  }

  const { goals, totalTargetAmount, totalCurrentAmount, avgMonthlySavings, recommendations } = savingsData;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Savings Goals</h3>
        <p className="text-sm text-gray-600 mt-1">Track your financial objectives</p>
      </div>
      
      <div className="p-6">
        {/* Overall Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm text-gray-600">
              ₹{totalCurrentAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'} / 
              ₹{totalTargetAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-500 h-3 rounded-full transition-all duration-500"
              style={{ 
                width: `${totalTargetAmount > 0 ? Math.min((totalCurrentAmount / totalTargetAmount) * 100, 100) : 0}%` 
              }}
            ></div>
          </div>
          
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>
              {totalTargetAmount > 0 ? Math.round((totalCurrentAmount / totalTargetAmount) * 100) : 0}%
            </span>
            <span>100%</span>
          </div>
        </div>

        {/* Individual Goals */}
        <div className="space-y-4 mb-6">
          {goals?.slice(0, 4).map((goal, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  {goal.progressPercentage >= 100 ? (
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  ) : goal.onTrack === false ? (
                    <Clock className="w-4 h-4 text-red-500 mr-2" />
                  ) : (
                    <Target className="w-4 h-4 text-blue-500 mr-2" />
                  )}
                  <span className="text-sm font-medium text-gray-900">{goal.name || 'Savings Goal'}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium">
                    ₹{goal.currentAmount?.toLocaleString('en-IN', { minimumFractionDigits: 0 }) || '0'}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">
                    / ₹{goal.targetAmount?.toLocaleString('en-IN', { minimumFractionDigits: 0 }) || '0'}
                  </span>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    goal.progressPercentage >= 100 ? 'bg-green-500' :
                    goal.onTrack === false ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(goal.progressPercentage || 0, 100)}%` }}
                ></div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{goal.progressPercentage || 0}% complete</span>
                {goal.monthsRemaining !== null && goal.monthsRemaining !== undefined && (
                  <span>
                    {goal.monthsRemaining > 0 ? 
                      `${Math.round(goal.monthsRemaining)} months left` : 
                      'Overdue'
                    }
                  </span>
                )}
              </div>
              
              {goal.requiredMonthlySavings && (
                <div className="mt-2 text-xs">
                  <span className={`${
                    goal.onTrack === false ? 'text-red-600' : 'text-green-600'
                  }`}>
                    Need: ${goal.requiredMonthlySavings.toFixed(2)}/month
                  </span>
                  {avgMonthlySavings && (
                    <span className="text-gray-500 ml-2">
                      (Current: ${avgMonthlySavings.toFixed(2)}/month)
                    </span>
                  )}
                </div>
              )}
              
              {goal.projectedCompletionDate && (
                <div className="mt-1 text-xs text-gray-500">
                  Projected completion: {new Date(goal.projectedCompletionDate).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Savings Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-500 mr-1" />
              <p className="text-lg font-bold text-green-600">
                ${avgMonthlySavings?.toFixed(2) || '0.00'}
              </p>
            </div>
            <p className="text-xs text-gray-500">Avg Monthly Savings</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">
              {goals?.filter(g => g.onTrack !== false).length || 0}
            </p>
            <p className="text-xs text-gray-500">Goals on Track</p>
          </div>
        </div>

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Recommendations</h4>
            <div className="space-y-2">
              {recommendations.map((rec, index) => (
                <div key={index} className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                  {rec}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavingsGoals;