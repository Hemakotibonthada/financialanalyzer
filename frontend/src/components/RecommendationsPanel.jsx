import React, { useState } from 'react';
import { Lightbulb, AlertTriangle, Info, CheckCircle, TrendingUp, Target, PiggyBank, CreditCard, ArrowRight, Sparkles } from 'lucide-react';

const RecommendationsPanel = ({ recommendations }) => {
  const [expandedIndex, setExpandedIndex] = useState(null);

  // Generate smart suggestions if no recommendations
  const generateSmartSuggestions = () => [
    {
      title: 'Set Up Your First Budget',
      description: 'Start tracking your expenses by creating budget categories for groceries, utilities, and entertainment.',
      action: 'Navigate to Budget section and create your first budget',
      type: 'budget',
      priority: 'high',
      icon: Target,
      benefit: 'Save up to 20% on monthly expenses'
    },
    {
      title: 'Track Daily Expenses',
      description: 'Add your daily transactions to get personalized insights and spending patterns.',
      action: 'Use Quick Expense Entry to log transactions',
      type: 'tracking',
      priority: 'medium',
      icon: CreditCard,
      benefit: 'Better financial visibility'
    },
    {
      title: 'Create an Emergency Fund',
      description: 'Set aside 3-6 months of expenses as emergency savings for financial security.',
      action: 'Set up a savings goal in Financial Goals',
      type: 'savings',
      priority: 'high',
      icon: PiggyBank,
      benefit: 'Financial peace of mind'
    },
    {
      title: 'Review Subscriptions',
      description: 'Identify and cancel unused subscriptions to save money each month.',
      action: 'Check Recurring Transactions for subscriptions',
      type: 'subscriptions',
      priority: 'medium',
      icon: TrendingUp,
      benefit: 'Save ₹500-2000 per month'
    }
  ];

  const displayRecommendations = recommendations && recommendations.length > 0 
    ? recommendations 
    : generateSmartSuggestions();

  if (!displayRecommendations || displayRecommendations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Recommendations</h3>
        <div className="text-center py-8">
          <Sparkles className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <p className="text-gray-900 font-medium">AI Insights Loading...</p>
          <p className="text-xs text-gray-400 mt-2">
            Analyzing your financial data to provide personalized recommendations
          </p>
        </div>
      </div>
    );
  }

  const getRecommendationIcon = (rec) => {
    // Use custom icon if provided
    if (rec.icon) return rec.icon;
    
    if (rec.priority === 'high') return AlertTriangle;
    
    switch (rec.type) {
      case 'urgent': return AlertTriangle;
      case 'budget': return Target;
      case 'savings': return PiggyBank;
      case 'subscriptions': return CreditCard;
      case 'investment': return TrendingUp;
      case 'tracking': return CheckCircle;
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
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                Financial Recommendations
                {!recommendations || recommendations.length === 0 ? (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">AI Powered</span>
                ) : null}
              </h3>
              <p className="text-sm text-gray-600 mt-1">Personalized advice to improve your finances</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{displayRecommendations.length}</div>
            <div className="text-xs text-gray-500">Active Tips</div>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="space-y-3">
          {displayRecommendations.map((rec, index) => {
            const RecommendationIcon = getRecommendationIcon(rec);
            const isExpanded = expandedIndex === index;
            
            return (
              <div 
                key={index} 
                className={`border-2 rounded-xl transition-all duration-200 hover:shadow-md cursor-pointer ${
                  isExpanded ? 'shadow-lg' : ''
                } ${getRecommendationStyle(rec.priority, rec.type)}`}
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm">
                      <RecommendationIcon className={`w-5 h-5 ${getIconStyle(rec.priority, rec.type)}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="text-base font-semibold mb-1">
                            {rec.title}
                          </h4>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                            rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {rec.priority} priority
                          </span>
                        </div>
                        <ArrowRight className={`w-5 h-5 text-gray-400 transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`} />
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-3">
                        {rec.description}
                      </p>
                      
                      {/* Benefit badge */}
                      {rec.benefit && (
                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 border border-green-200 rounded-full mb-3">
                          <Sparkles className="w-3 h-3 text-green-600" />
                          <span className="text-xs font-medium text-green-700">{rec.benefit}</span>
                        </div>
                      )}
                      
                      {/* Expanded content */}
                      {isExpanded && rec.action && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-start gap-2 p-3 bg-white bg-opacity-70 rounded-lg">
                            <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-gray-900 mb-1">Recommended Action:</p>
                              <p className="text-sm text-gray-700">{rec.action}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Category tag */}
                      <div className="mt-2">
                        <span className="inline-block px-2 py-1 rounded-md text-xs font-medium bg-white bg-opacity-60">
                          {rec.type?.charAt(0).toUpperCase() + rec.type?.slice(1) || 'General'}
                        </span>
                      </div>
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