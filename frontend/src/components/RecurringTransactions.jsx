import React, { useState } from 'react';
import { Repeat, Calendar, DollarSign, TrendingDown, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

const RecurringTransactions = ({ recurringData }) => {
  const [showAll, setShowAll] = useState(false);
  const [hiddenItems, setHiddenItems] = useState(new Set());

  const toggleItemVisibility = (index) => {
    setHiddenItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  if (!recurringData || recurringData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow h-full">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Repeat className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Recurring Transactions</h3>
              <p className="text-sm text-gray-600">Auto-detected patterns</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <div className="relative inline-block mb-4">
              <Repeat className="w-12 h-12 text-gray-300 mx-auto" />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <AlertCircle className="w-3 h-3 text-white" />
              </div>
            </div>
            <p className="text-gray-900 font-medium mb-2">No recurring transactions detected</p>
            <p className="text-sm text-gray-500 mb-4">
              Add more transactions to enable pattern detection
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800">We automatically detect subscriptions and bills</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getFrequencyColor = (frequency) => {
    switch (frequency.toLowerCase()) {
      case 'weekly': return 'bg-green-100 text-green-800';
      case 'monthly': return 'bg-blue-100 text-blue-800';
      case 'quarterly': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getReliabilityColor = (reliability) => {
    if (reliability >= 80) return 'text-green-600';
    if (reliability >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const totalMonthlyImpact = recurringData.reduce((sum, transaction) => 
    sum + (transaction.monthlyImpact || 0), 0
  );

  return (
    <div className="bg-white rounded-lg shadow h-full flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Repeat className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Recurring Transactions</h3>
              <p className="text-sm text-gray-600">Subscriptions and regular payments</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-600">{recurringData.length}</div>
            <div className="text-xs text-gray-500">Active</div>
          </div>
        </div>
      </div>
      
      <div className="p-6 flex-1 overflow-y-auto">
        {/* Summary */}
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-900">Monthly Impact</p>
                <p className="text-2xl font-bold text-purple-600">
                  ₹{totalMonthlyImpact.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-purple-600">{recurringData.length}</p>
              <p className="text-xs text-purple-700 font-medium">Recurring Items</p>
            </div>
          </div>
          
          {/* Savings opportunity */}
          {totalMonthlyImpact > 5000 && (
            <div className="mt-3 pt-3 border-t border-purple-200">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-green-600" />
                <p className="text-xs text-gray-700">
                  <span className="font-semibold text-green-600">Potential savings: ₹{(totalMonthlyImpact * 0.15).toFixed(0)}/month</span> by reviewing subscriptions
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Recurring Transactions List */}
        <div className="space-y-3">
          {recurringData.slice(0, showAll ? undefined : 5).map((transaction, index) => {
            const isHidden = hiddenItems.has(index);
            
            return (
              <div 
                key={index} 
                className={`border-2 rounded-xl p-4 transition-all duration-200 ${
                  isHidden 
                    ? 'bg-gray-50 border-gray-200 opacity-60' 
                    : 'bg-white border-purple-200 hover:border-purple-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Repeat className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      <h4 className={`text-sm font-semibold ${
                        isHidden ? 'text-gray-500 line-through' : 'text-gray-900'
                      }`}>
                        {transaction.description || transaction.category}
                      </h4>
                    </div>
                    <p className="text-xs text-gray-500 ml-6">{transaction.category}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <div className="text-right">
                      <p className={`text-base font-bold ${
                        isHidden ? 'text-gray-500' : 'text-gray-900'
                      }`}>
                        ₹{transaction.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                      </p>
                      <p className="text-xs text-gray-500">per occurrence</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleItemVisibility(index);
                      }}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title={isHidden ? 'Show' : 'Hide'}
                    >
                      {isHidden ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFrequencyColor(transaction.frequency)}`}>
                    {transaction.frequency}
                  </span>
                  <span className="text-xs text-gray-500">
                    Every {transaction.avgInterval} days
                  </span>
                </div>
                
                <div className="flex items-center">
                  <span className={`text-xs font-medium ${getReliabilityColor(transaction.reliability)}`}>
                    {transaction.reliability?.toFixed(0)}% reliable
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                <div className="flex items-center">
                  <DollarSign className="w-3 h-3 mr-1" />
                  <span>Monthly: ₹{transaction.monthlyImpact?.toFixed(2) || '0.00'}</span>
                </div>
                {transaction.nextExpectedDate && (
                  <div className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    <span>Next: {new Date(transaction.nextExpectedDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              
              {/* Occurrences indicator */}
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{transaction.occurrences?.length || 0} occurrences detected</span>
                  {transaction.occurrences && transaction.occurrences.length > 0 && (
                    <span>
                      Last: {new Date(transaction.occurrences[transaction.occurrences.length - 1]).toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                {/* Visual timeline of occurrences */}
                {transaction.occurrences && transaction.occurrences.length > 1 && (
                  <div className="mt-1 flex items-center space-x-1">
                    {transaction.occurrences.slice(-6).map((date, idx) => (
                      <div 
                        key={idx}
                        className="w-2 h-2 bg-purple-400 rounded-full"
                        title={new Date(date).toLocaleDateString()}
                      ></div>
                    ))}
                    {transaction.occurrences.length > 6 && (
                      <span className="text-xs text-gray-400">+{transaction.occurrences.length - 6}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
        
        {/* Show More/Less Button */}
        {recurringData.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-4 w-full py-2 px-4 bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium rounded-lg transition-colors text-sm"
          >
            {showAll ? `Show Less` : `Show All ${recurringData.length} Items`}
          </button>
        )}

        {/* High Impact Alert */}
        {recurringData.some(t => t.monthlyImpact > 100) && (
          <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-900 mb-1">High Impact Subscriptions Detected</p>
                <p className="text-xs text-orange-700">
                  You have <span className="font-bold">{recurringData.filter(t => t.monthlyImpact > 100).length}</span> recurring charges over ₹100/month. 
                  Review these for potential savings of up to ₹{(recurringData.filter(t => t.monthlyImpact > 100).reduce((sum, t) => sum + t.monthlyImpact, 0) * 0.3).toFixed(0)}/month.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecurringTransactions;