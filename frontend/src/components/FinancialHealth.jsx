import React from 'react';
import { Heart, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';

const FinancialHealth = ({ healthData }) => {
  if (!healthData) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Health</h3>
        <p className="text-gray-500">No health data available yet.</p>
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
      case 'A': return 'bg-green-100 text-green-800 border-green-200';
      case 'B': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'C': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'D': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'F': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Financial Health Score</h3>
        <p className="text-sm text-gray-600 mt-1">Overall assessment of your financial wellbeing</p>
      </div>
      
      <div className="p-6">
        {/* Main Health Score */}
        <div className="text-center mb-6">
          <div className="relative inline-block">
            {/* Circular progress */}
            <svg className="w-32 h-32" viewBox="0 0 100 100">
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
              <p className="text-sm text-gray-500">/ 100</p>
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
          <h4 className="text-sm font-medium text-gray-900">Health Factors</h4>
          
          {factors?.map((factor, index) => {
            const FactorIcon = getFactorIcon(factor.score);
            const maxScore = 25; // Assuming each factor is out of 25
            const percentage = (factor.score / maxScore) * 100;
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FactorIcon className={`w-4 h-4 mr-2 ${getFactorColor(factor.score)}`} />
                    <span className="text-sm font-medium text-gray-900">{factor.factor}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium">{factor.score}/25</span>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      factor.score >= 20 ? 'bg-green-500' :
                      factor.score >= 15 ? 'bg-yellow-500' :
                      factor.score >= 10 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                
                {factor.description && (
                  <p className="text-xs text-gray-600">{factor.description}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Improvement Recommendations</h4>
            <div className="space-y-2">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex items-start p-3 bg-blue-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 mr-3 flex-shrink-0"></div>
                  <p className="text-sm text-blue-900">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Health Status Message */}
        <div className="mt-6 p-4 rounded-lg border-l-4 border-l-blue-500 bg-blue-50">
          <p className="text-sm text-blue-900 font-medium">
            {score >= 80 && "Excellent! Your financial health is strong."}
            {score >= 60 && score < 80 && "Good progress! A few improvements could boost your score."}
            {score >= 40 && score < 60 && "Fair. Focus on the key areas highlighted above."}
            {score < 40 && "Needs attention. Consider implementing the recommendations to improve your financial health."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FinancialHealth;