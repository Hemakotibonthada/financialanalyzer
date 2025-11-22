import React, { useState } from 'react';
import { Lightbulb, AlertTriangle, Info, CheckCircle, TrendingUp, Target, PiggyBank, CreditCard, ArrowRight, Sparkles, X, ThumbsUp, BookOpen, ExternalLink, Filter, ChevronDown } from 'lucide-react';

const RecommendationsPanel = ({ recommendations }) => {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [dismissedIds, setDismissedIds] = useState([]);
  const [completedIds, setCompletedIds] = useState([]);
  const [filterPriority, setFilterPriority] = useState('all');
  const [showCompleted, setShowCompleted] = useState(false);

  // Generate smart suggestions if no recommendations
  const generateSmartSuggestions = () => [
    {
      id: 'budget-setup',
      title: 'Set Up Your First Budget',
      description: 'Start tracking your expenses by creating budget categories for groceries, utilities, and entertainment.',
      action: 'Navigate to Budget section and create your first budget',
      type: 'budget',
      priority: 'high',
      icon: Target,
      benefit: 'Save up to 20% on monthly expenses',
      estimatedTime: '5 minutes',
      learnMore: 'Budgeting helps you control spending and reach financial goals faster.'
    },
    {
      id: 'track-expenses',
      title: 'Track Daily Expenses',
      description: 'Add your daily transactions to get personalized insights and spending patterns.',
      action: 'Use Quick Expense Entry to log transactions',
      type: 'tracking',
      priority: 'medium',
      icon: CreditCard,
      benefit: 'Better financial visibility',
      estimatedTime: '2 minutes daily',
      learnMore: 'Consistent tracking reveals spending habits and opportunities to save.'
    },
    {
      id: 'emergency-fund',
      title: 'Create an Emergency Fund',
      description: 'Set aside 3-6 months of expenses as emergency savings for financial security.',
      action: 'Set up a savings goal in Financial Goals',
      type: 'savings',
      priority: 'high',
      icon: PiggyBank,
      benefit: 'Financial peace of mind',
      estimatedTime: '10 minutes',
      learnMore: 'Emergency funds protect you from unexpected expenses and financial stress.'
    },
    {
      id: 'review-subscriptions',
      title: 'Review Subscriptions',
      description: 'Identify and cancel unused subscriptions to save money each month.',
      action: 'Check Recurring Transactions for subscriptions',
      type: 'subscriptions',
      priority: 'medium',
      icon: TrendingUp,
      benefit: 'Save ₹500-2000 per month',
      estimatedTime: '15 minutes',
      learnMore: 'Most people have 2-3 subscriptions they no longer use or forgot about.'
    }
  ];

  const displayRecommendations = recommendations && recommendations.length > 0 
    ? recommendations.map((rec, idx) => ({ ...rec, id: rec.id || `rec-${idx}` }))
    : generateSmartSuggestions();

  // Filter recommendations
  const filteredRecommendations = displayRecommendations
    .filter(rec => !dismissedIds.includes(rec.id))
    .filter(rec => {
      if (showCompleted) return completedIds.includes(rec.id);
      return !completedIds.includes(rec.id);
    })
    .filter(rec => {
      if (filterPriority === 'all') return true;
      return rec.priority === filterPriority;
    });

  const handleDismiss = (e, recId) => {
    e.stopPropagation();
    setDismissedIds([...dismissedIds, recId]);
  };

  const handleMarkComplete = (e, recId) => {
    e.stopPropagation();
    if (completedIds.includes(recId)) {
      setCompletedIds(completedIds.filter(id => id !== recId));
    } else {
      setCompletedIds([...completedIds, recId]);
    }
  };

  if (filteredRecommendations.length === 0 && !showCompleted) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 -mx-6 -mt-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Financial Recommendations</h3>
              <p className="text-sm text-gray-600 mt-1">Personalized advice to improve your finances</p>
            </div>
          </div>
        </div>
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <p className="text-gray-900 font-medium text-lg">Great Job!</p>
          <p className="text-sm text-gray-500 mt-2">
            You've completed all recommendations. Keep up the good work!
          </p>
          <button
            onClick={() => setShowCompleted(true)}
            className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
          >
            View Completed
          </button>
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
  const sortedRecommendations = [...filteredRecommendations].sort((a, b) => 
    (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
  );

  const activeCount = displayRecommendations.filter(r => !completedIds.includes(r.id) && !dismissedIds.includes(r.id)).length;
  const completedCount = completedIds.length;

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
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{activeCount}</div>
              <div className="text-xs text-gray-500">Active</div>
            </div>
            {completedCount > 0 && (
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                <div className="text-xs text-gray-500">Done</div>
              </div>
            )}
          </div>
        </div>
        
        {/* Filters */}
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600 font-medium">Filter:</span>
          </div>
          <div className="flex gap-2">
            {['all', 'high', 'medium', 'low'].map((priority) => (
              <button
                key={priority}
                onClick={() => setFilterPriority(priority)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  filterPriority === priority
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </button>
            ))}
          </div>
          {completedCount > 0 && (
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                showCompleted
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {showCompleted ? 'Show Active' : `View Completed (${completedCount})`}
            </button>
          )}
        </div>
      </div>
      
      <div className="p-6">
        <div className="space-y-3">
          {sortedRecommendations.map((rec, index) => {
            const RecommendationIcon = getRecommendationIcon(rec);
            const isExpanded = expandedIndex === index;
            const isCompleted = completedIds.includes(rec.id);
            
            return (
              <div 
                key={rec.id || index} 
                className={`border-2 rounded-xl transition-all duration-200 hover:shadow-md cursor-pointer relative ${
                  isExpanded ? 'shadow-lg' : ''
                } ${isCompleted ? 'opacity-60 bg-gray-50 border-gray-300' : getRecommendationStyle(rec.priority, rec.type)}`}
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
              >
                {/* Completion badge */}
                {isCompleted && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white p-1.5 rounded-full shadow-lg z-10">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                )}
                
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm">
                      <RecommendationIcon className={`w-5 h-5 ${isCompleted ? 'text-gray-400' : getIconStyle(rec.priority, rec.type)}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className={`text-base font-semibold mb-1 ${isCompleted ? 'line-through text-gray-500' : ''}`}>
                            {rec.title}
                          </h4>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                              rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {rec.priority} priority
                            </span>
                            {rec.estimatedTime && (
                              <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                ⏱️ {rec.estimatedTime}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <button
                            onClick={(e) => handleMarkComplete(e, rec.id)}
                            className={`p-1.5 rounded-lg transition-all hover:scale-110 ${
                              isCompleted 
                                ? 'bg-green-100 text-green-600' 
                                : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-600'
                            }`}
                            title={isCompleted ? "Mark as incomplete" : "Mark as complete"}
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDismiss(e, rec.id)}
                            className="p-1.5 bg-gray-100 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all hover:scale-110"
                            title="Dismiss"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedIndex(isExpanded ? null : index);
                            }}
                            className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all"
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </div>
                      
                      <p className={`text-sm mb-3 ${isCompleted ? 'text-gray-500' : 'text-gray-700'}`}>
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
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                          {rec.action && (
                            <div className="flex items-start gap-2 p-3 bg-blue-50 bg-opacity-70 rounded-lg">
                              <Target className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs font-medium text-blue-900 mb-1">Recommended Action:</p>
                                <p className="text-sm text-blue-800">{rec.action}</p>
                              </div>
                            </div>
                          )}
                          
                          {rec.learnMore && (
                            <div className="flex items-start gap-2 p-3 bg-purple-50 bg-opacity-70 rounded-lg">
                              <BookOpen className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs font-medium text-purple-900 mb-1">Learn More:</p>
                                <p className="text-sm text-purple-800">{rec.learnMore}</p>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkComplete(e, rec.id);
                              }}
                              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Mark Complete
                            </button>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Take Action
                            </button>
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
        
        {/* Progress Bar */}
        {!showCompleted && activeCount > 0 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Your Progress</p>
              <p className="text-sm font-semibold text-blue-600">
                {completedCount} of {displayRecommendations.length - dismissedIds.length} completed
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{ 
                  width: `${((completedCount / (displayRecommendations.length - dismissedIds.length)) * 100).toFixed(0)}%` 
                }}
              >
                {completedCount > 0 && (
                  <span className="text-xs font-bold text-white drop-shadow">
                    {((completedCount / (displayRecommendations.length - dismissedIds.length)) * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
            {completedCount === displayRecommendations.length - dismissedIds.length && (
              <p className="text-sm text-green-600 font-medium mt-2 text-center">
                🎉 Amazing! You've completed all recommendations!
              </p>
            )}
          </div>
        )}
        
        {/* Summary Stats */}
        {!showCompleted && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">
                  {filteredRecommendations.filter(r => r.priority === 'high' && !completedIds.includes(r.id)).length}
                </p>
                <p className="text-xs text-gray-600 mt-1">High Priority</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">
                  {filteredRecommendations.filter(r => r.priority === 'medium' && !completedIds.includes(r.id)).length}
                </p>
                <p className="text-xs text-gray-600 mt-1">Medium Priority</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {filteredRecommendations.filter(r => r.priority === 'low' && !completedIds.includes(r.id)).length}
                </p>
                <p className="text-xs text-gray-600 mt-1">Low Priority</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Action Prompt */}
        {!showCompleted && sortedRecommendations.some(r => r.priority === 'high' && !completedIds.includes(r.id)) && (
          <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm mr-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800">Urgent Action Required</p>
                <p className="text-xs text-red-700 mt-1">
                  You have {sortedRecommendations.filter(r => r.priority === 'high' && !completedIds.includes(r.id)).length} high-priority 
                  recommendation{sortedRecommendations.filter(r => r.priority === 'high' && !completedIds.includes(r.id)).length > 1 ? 's' : ''} that need{sortedRecommendations.filter(r => r.priority === 'high' && !completedIds.includes(r.id)).length === 1 ? 's' : ''} immediate attention.
                </p>
                <button className="mt-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors shadow-sm">
                  Take Action Now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationsPanel;