import React, { memo } from 'react';
import { Heart, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';

const FinancialHealth = ({ healthData }) => {
  if (!healthData) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Financial Health</h3>
        <p className="text-gray-500 dark:text-slate-400">No health data available yet.</p>
      </div>
    );
  }

  const { score, grade, factors, recommendations } = healthData;

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700';
      case 'B': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700';
      case 'C': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700';
      case 'D': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-700';
      case 'F': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700';
      default: return 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200 border-gray-200 dark:border-slate-600';
    }
  };

  const getFactorIcon = (factorScore) => {
    if (factorScore >= 20) return CheckCircle;
    if (factorScore >= 15) return TrendingUp;
    if (factorScore >= 10) return TrendingDown;
    return AlertCircle;
  };

  const getFactorColor = (factorScore) => {
    if (factorScore >= 20) return 'text-green-500';
    if (factorScore >= 15) return 'text-yellow-500';
    if (factorScore >= 10) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Financial Health Score</h3>
        <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Overall assessment of your financial wellbeing</p>
      </div>
      
      <div className="p-6">
        {/* Main Health Score */}
        <div className="text-center mb-6">
          <div className="relative inline-block">
            {/* Circular progress */}
            <svg className="w-32 h-32" viewBox="0 0 100 100" role="img" aria-label={`Financial health score: ${score} out of 100`}>
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke={score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444'}
                strokeWidth="8"
                strokeDasharray={`${score * 2.51} ${251 - score * 2.51}`}
                strokeDashoffset="0"
                strokeLinecap="round"
                className="transition-all duration-1000"
                transform="rotate(-90 50 50)"
              />
            </svg>
            
            {/* Score in center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Heart className="w-8 h-8 text-red-400 mb-1" />
              <p className={`text-3xl font-bold ${getScoreColor(score)}`}>
                {score}
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-400">/ 100</p>
            </div>
          </div>
          
          <div className="mt-4">
            <span className={`inline-block px-4 py-2 rounded-full border text-lg font-bold ${getGradeColor(grade)}`}>
              Grade: {grade}
            </span>
          </div>
        </div>

        {/* Health Factors */}
        <div className="space-y-4 mb-6">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">Health Factors</h4>
          
          {factors && Array.isArray(factors) && factors.map((factor, index) => {
            if (!factor) return null;
            const FactorIcon = getFactorIcon(factor.score || 0);
            const maxScore = 25; // Assuming each factor is out of 25
            const percentage = ((factor.score || 0) / maxScore) * 100;
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FactorIcon className={`w-4 h-4 mr-2 ${getFactorColor(factor.score || 0)}`} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{factor.factor || 'Unknown'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium">{factor.score || 0}/25</span>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      (factor.score || 0) >= 20 ? 'bg-green-500' :
                      (factor.score || 0) >= 15 ? 'bg-yellow-500' :
                      (factor.score || 0) >= 10 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                
                {factor.description && (
                  <p className="text-xs text-gray-600 dark:text-slate-400">{factor.description}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Improvement Recommendations</h4>
            <div className="space-y-2">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex items-start p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 mr-3 flex-shrink-0"></div>
                  <p className="text-sm text-blue-900 dark:text-blue-300">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Health Status Message (FIXED: mutually exclusive conditions) */}
        <div className="mt-6 p-4 rounded-lg border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/20">
          <p className="text-sm text-blue-900 dark:text-blue-300 font-medium">
            {score >= 80
              ? "Excellent! Your financial health is strong."
              : score >= 60
              ? "Good progress! A few improvements could boost your score."
              : score >= 40
              ? "Fair. Focus on the key areas highlighted above."
              : "Needs attention. Consider implementing the recommendations to improve your financial health."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default memo(FinancialHealth);