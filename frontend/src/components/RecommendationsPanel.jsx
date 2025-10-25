import React from 'react';
import { Lightbulb, AlertTriangle, Info, CheckCircle } from 'lucide-react';

const RecommendationsPanel = ({ recommendations }) => {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Recommendations</h3>
        <div className="text-center py-8">
          <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No recommendations available</p>
          <p className="text-xs text-gray-400 mt-2">
            Recommendations will appear as your financial data is analyzed
          </p>
        </div>
      </div>
    );
  }

  const getRecommendationIcon = (type, priority) => {
    if (priority === 'high') return AlertTriangle;
    
    switch (type) {
      case 'urgent': return AlertTriangle;
      case 'budget': return AlertTriangle;
      case 'savings': return CheckCircle;
      case 'subscriptions': return Info;
      default: return Lightbulb;
    }
  };

  const getRecommendationStyle = (priority, type) => {
    if (priority === 'high') {
      return 'bg-red-50 border-red-200 text-red-800';
    }
    
    switch (priority) {
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIconStyle = (priority, type) => {
    if (priority === 'high') {
      return 'text-red-500';
    }
    
    switch (priority) {
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
  const sortedRecommendations = [...recommendations].sort((a, b) => 
    (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
  );

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Financial Recommendations</h3>
            <p className="text-sm text-gray-600 mt-1">Personalized advice to improve your finances</p>
          </div>
          <div className="text-sm text-gray-500">
            {recommendations.length} recommendations
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {sortedRecommendations.map((rec, index) => {
            const RecommendationIcon = getRecommendationIcon(rec.type, rec.priority);
            
            return (
              <div 
                key={index} 
                className={`border rounded-lg p-4 ${getRecommendationStyle(rec.priority, rec.type)}`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-3">
                    <RecommendationIcon className={`w-5 h-5 ${getIconStyle(rec.priority, rec.type)}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium">
                        {rec.title}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                        rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {rec.priority} priority
                      </span>
                    </div>
                    
                    <p className="text-sm mb-3">
                      {rec.description}
                    </p>
                    
                    {rec.action && (
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-current rounded-full mr-2 opacity-60"></div>
                        <span className="text-sm font-medium">
                          Action: {rec.action}
                        </span>
                      </div>
                    )}
                    
                    {/* Recommendation type indicator */}
                    <div className="mt-2">
                      <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-white bg-opacity-50">
                        {rec.type?.charAt(0).toUpperCase() + rec.type?.slice(1) || 'General'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-red-600">
                {recommendations.filter(r => r.priority === 'high').length}
              </p>
              <p className="text-xs text-gray-500">High Priority</p>
            </div>
            <div>
              <p className="text-lg font-bold text-yellow-600">
                {recommendations.filter(r => r.priority === 'medium').length}
              </p>
              <p className="text-xs text-gray-500">Medium Priority</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-600">
                {recommendations.filter(r => r.priority === 'low').length}
              </p>
              <p className="text-xs text-gray-500">Low Priority</p>
            </div>
          </div>
        </div>
        
        {/* Action Prompt */}
        {recommendations.some(r => r.priority === 'high') && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-red-800">Urgent Action Required</p>
                <p className="text-xs text-red-600 mt-1">
                  You have {recommendations.filter(r => r.priority === 'high').length} high-priority 
                  recommendations that need immediate attention.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationsPanel;