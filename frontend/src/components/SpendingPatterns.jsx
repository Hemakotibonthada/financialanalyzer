import React from 'react';
import { Calendar, Clock, Store, TrendingUp, AlertCircle, Activity, PieChart } from 'lucide-react';

const SpendingPatterns = ({ patternsData }) => {
  if (!patternsData) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Spending Patterns</h3>
        <p className="text-gray-500">No pattern data available yet. Add more expenses to see your spending patterns.</p>
      </div>
    );
  }

  const { dayOfWeek, hourly, merchants, categoryPatterns, recurringPatterns, insights, summary } = patternsData;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Spending Patterns</h3>
        <p className="text-sm text-gray-600 mt-1">Understand when and where you spend money</p>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-900">{summary.totalTransactions}</p>
              <p className="text-xs text-blue-700">Total Transactions</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <PieChart className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-900">₹{summary.avgTransactionSize}</p>
              <p className="text-xs text-green-700">Avg Transaction</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-sm font-bold text-purple-900">{summary.mostActiveDay}</p>
              <p className="text-xs text-purple-700">Most Active Day</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-sm font-bold text-orange-900">{summary.mostActiveHour}</p>
              <p className="text-xs text-orange-700">Peak Hour</p>
            </div>
          </div>
        )}

        {/* Insights */}
        {insights && insights.length > 0 && (
          <div className="space-y-2">
            {insights.map((insight, index) => (
              <div 
                key={index}
                className={`flex items-start space-x-3 p-3 rounded-lg ${
                  insight.type === 'warning' 
                    ? 'bg-amber-50 border border-amber-200' 
                    : 'bg-blue-50 border border-blue-200'
                }`}
              >
                <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                  insight.type === 'warning' ? 'text-amber-600' : 'text-blue-600'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    insight.type === 'warning' ? 'text-amber-900' : 'text-blue-900'
                  }`}>
                    {insight.message}
                  </p>
                  <p className={`text-xs mt-1 ${
                    insight.type === 'warning' ? 'text-amber-700' : 'text-blue-700'
                  }`}>
                    💡 {insight.suggestion}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Day of Week Patterns */}
        {dayOfWeek && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 text-gray-500 mr-2" />
                <h4 className="text-sm font-medium text-gray-900">Weekly Spending Pattern</h4>
              </div>
              <span className="text-xs text-gray-500">
                Weekend: {dayOfWeek.weekendRatio}%
              </span>
            </div>
          
            <div className="space-y-2">
              {dayOfWeek.data && Array.isArray(dayOfWeek.data) && dayOfWeek.data.map((day, index) => {
                if (!day) return null;
                const maxAmount = Math.max(...(dayOfWeek.data || []).map(d => d?.amount || 0));
                const width = maxAmount > 0 ? ((day.amount || 0) / maxAmount) * 100 : 0;
                const isWeekend = day.dayIndex === 0 || day.dayIndex === 6;
                const isPeakDay = day.day === dayOfWeek.peakDay;
              
                return (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`w-14 text-xs font-medium ${
                      isPeakDay ? 'text-blue-600 font-bold' : 'text-gray-600'
                    }`}>
                      {day.day ? day.day.slice(0, 3) : 'N/A'}
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
                        <div 
                          className={`h-3 rounded-full transition-all duration-500 ${
                            isPeakDay ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                            isWeekend ? 'bg-orange-400' : 'bg-blue-400'
                          }`}
                          style={{ width: `${width}%` }}
                        >
                          {isPeakDay && (
                            <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="w-20 text-xs text-right">
                      <span className={`font-medium ${isPeakDay ? 'text-blue-600' : 'text-gray-900'}`}>
                        ₹{(day.amount || 0).toFixed(0)}
                      </span>
                      <span className="text-gray-500 ml-1">({day.count})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          
            <div className="mt-4 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="text-gray-600">Weekdays:</span>
                  <span className="font-bold text-gray-900 ml-2">₹{dayOfWeek.weekdayTotal?.toFixed(2) || '0'}</span>
                </div>
                <div className="w-px h-6 bg-gray-300"></div>
                <div>
                  <span className="text-gray-600">Weekends:</span>
                  <span className="font-bold text-gray-900 ml-2">₹{dayOfWeek.weekendTotal?.toFixed(2) || '0'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Time of Day Analysis */}
        {hourly && (
          <div>
            <div className="flex items-center mb-3">
              <Clock className="w-4 h-4 text-gray-500 mr-2" />
              <h4 className="text-sm font-medium text-gray-900">Time of Day Spending</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">🌅</span>
                  <TrendingUp className="w-4 h-4 text-yellow-600" />
                </div>
                <p className="text-lg font-bold text-yellow-900">₹{(hourly.morning || 0).toFixed(0)}</p>
                <p className="text-xs text-yellow-700">Morning (6AM-12PM)</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">☀️</span>
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                </div>
                <p className="text-lg font-bold text-orange-900">₹{(hourly.afternoon || 0).toFixed(0)}</p>
                <p className="text-xs text-orange-700">Afternoon (12PM-6PM)</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">🌆</span>
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-lg font-bold text-purple-900">₹{(hourly.evening || 0).toFixed(0)}</p>
                <p className="text-xs text-purple-700">Evening (6PM-12AM)</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">🌙</span>
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-lg font-bold text-indigo-900">₹{(hourly.night || 0).toFixed(0)}</p>
                <p className="text-xs text-indigo-700">Night (12AM-6AM)</p>
              </div>
            </div>

            {hourly.peakHour !== undefined && (
              <div className="mt-3 bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-sm text-blue-900">
                  <span className="font-medium">Peak spending time:</span> {hourly.peakHour}:00 - {hourly.peakHour + 1}:00
                  <span className="text-xs ml-2">(₹{hourly.peakAmount?.toFixed(0)})</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Recurring Patterns */}
        {recurringPatterns && recurringPatterns.length > 0 && (
          <div>
            <div className="flex items-center mb-3">
              <Activity className="w-4 h-4 text-gray-500 mr-2" />
              <h4 className="text-sm font-medium text-gray-900">Recurring Spending Patterns</h4>
            </div>
            
            <div className="space-y-2">
              {recurringPatterns.map((pattern, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {pattern.category}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Usually on <span className="font-medium text-green-700">{pattern.preferredDay}</span> around{' '}
                      <span className="font-medium text-green-700">{pattern.preferredTime}</span>
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-bold text-gray-900">₹{pattern.avgAmount.toFixed(0)}</p>
                    <p className="text-xs text-gray-500">{pattern.frequency}x</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Categories by Transaction */}
        {merchants && merchants.length > 0 && (
          <div>
            <div className="flex items-center mb-3">
              <Store className="w-4 h-4 text-gray-500 mr-2" />
              <h4 className="text-sm font-medium text-gray-900">Top Spending Categories</h4>
            </div>
            
            <div className="space-y-2">
              {merchants.slice(0, 5).map((merchant, index) => {
                const maxCount = merchants[0]?.count || 1;
                const width = (merchant.count / maxCount) * 100;
                const colors = [
                  'bg-blue-500',
                  'bg-green-500', 
                  'bg-purple-500',
                  'bg-orange-500',
                  'bg-pink-500'
                ];
                
                return (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg ${colors[index % colors.length]} flex items-center justify-center text-white font-bold text-xs`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {merchant.type}
                        </span>
                        <span className="text-xs text-gray-600 ml-2">
                          ₹{merchant.totalAmount.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`${colors[index % colors.length]} h-2 rounded-full transition-all duration-500`}
                              style={{ width: `${width}%` }}
                            ></div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {merchant.count} txns
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpendingPatterns;