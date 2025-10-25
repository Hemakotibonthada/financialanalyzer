import React from 'react';
import { Repeat, Calendar, DollarSign } from 'lucide-react';

const RecurringTransactions = ({ recurringData }) => {
  if (!recurringData || recurringData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recurring Transactions</h3>
        <div className="text-center py-8">
          <Repeat className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No recurring transactions detected</p>
          <p className="text-xs text-gray-400 mt-2">
            Recurring patterns will appear as more data is analyzed
          </p>
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
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Recurring Transactions</h3>
        <p className="text-sm text-gray-600 mt-1">Subscriptions and regular payments</p>
      </div>
      
      <div className="p-6">
        {/* Summary */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Monthly Impact</p>
              <p className="text-2xl font-bold text-blue-600">
                ₹{totalMonthlyImpact.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-blue-900">{recurringData.length}</p>
              <p className="text-xs text-blue-700">Recurring Items</p>
            </div>
          </div>
        </div>

        {/* Recurring Transactions List */}
        <div className="space-y-4">
          {recurringData.slice(0, 8).map((transaction, index) => (
            <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <Repeat className="w-4 h-4 text-gray-400 mr-2" />
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {transaction.description || transaction.category}
                    </h4>
                  </div>
                  <p className="text-xs text-gray-500">{transaction.category}</p>
                </div>
                
                <div className="text-right ml-4">
                  <p className="text-sm font-bold text-gray-900">
                    ₹{transaction.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                  </p>
                  <p className="text-xs text-gray-500">per occurrence</p>
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
                  <span>Monthly: ${transaction.monthlyImpact?.toFixed(2) || '0.00'}</span>
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
                        className="w-2 h-2 bg-blue-400 rounded-full"
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
          ))}
        </div>
        
        {recurringData.length > 8 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              +{recurringData.length - 8} more recurring transactions
            </p>
          </div>
        )}

        {/* High Impact Alert */}
        {recurringData.some(t => t.monthlyImpact > 100) && (
          <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
              <p className="text-sm font-medium text-orange-800">High Impact Subscriptions</p>
            </div>
            <p className="text-xs text-orange-600 mt-1">
              You have {recurringData.filter(t => t.monthlyImpact > 100).length} recurring charges over $100/month. 
              Consider reviewing these for potential savings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecurringTransactions;