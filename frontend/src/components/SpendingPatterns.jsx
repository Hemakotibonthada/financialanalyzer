import React from 'react';
import { Calendar, Clock, Store } from 'lucide-react';

const SpendingPatterns = ({ patternsData }) => {
  if (!patternsData) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Spending Patterns</h3>
        <p className="text-gray-500">No pattern data available yet.</p>
      </div>
    );
  }

  const { dayOfWeek, hourly, merchants } = patternsData;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Spending Patterns</h3>
        <p className="text-sm text-gray-600 mt-1">When and where you spend money</p>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Day of Week Patterns */}
        <div>
          <div className="flex items-center mb-3">
            <Calendar className="w-4 h-4 text-gray-500 mr-2" />
            <h4 className="text-sm font-medium text-gray-900">Weekly Patterns</h4>
          </div>
          
          <div className="space-y-2">
            {dayOfWeek?.data?.map((day, index) => {
              const maxAmount = Math.max(...dayOfWeek.data.map(d => d.amount));
              const width = maxAmount > 0 ? (day.amount / maxAmount) * 100 : 0;
              const isWeekend = day.dayIndex === 0 || day.dayIndex === 6;
              
              return (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-12 text-xs font-medium text-gray-600">
                    {day.day.slice(0, 3)}
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isWeekend ? 'bg-orange-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${width}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-16 text-xs text-right text-gray-600">
                    ${day.amount.toFixed(0)}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-3 text-xs text-gray-500">
            <p>Peak day: <span className="font-medium">{dayOfWeek?.peakDay}</span></p>
            <div className="flex justify-between mt-1">
              <span>Weekdays: ${dayOfWeek?.weekdayTotal?.toFixed(2) || '0'}</span>
              <span>Weekends: ${dayOfWeek?.weekendTotal?.toFixed(2) || '0'}</span>
            </div>
          </div>
        </div>

        {/* Hourly Patterns */}
        {hourly?.peakHour !== undefined && (
          <div>
            <div className="flex items-center mb-3">
              <Clock className="w-4 h-4 text-gray-500 mr-2" />
              <h4 className="text-sm font-medium text-gray-900">Peak Spending Time</h4>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                Most active hour: <span className="font-medium">
                  {hourly.peakHour}:00 - {hourly.peakHour + 1}:00
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Top Merchants */}
        {merchants && merchants.length > 0 && (
          <div>
            <div className="flex items-center mb-3">
              <Store className="w-4 h-4 text-gray-500 mr-2" />
              <h4 className="text-sm font-medium text-gray-900">Top merchant Types</h4>
            </div>
            
            <div className="space-y-2">
              {merchants.slice(0, 5).map((merchant, index) => {
                const maxCount = merchants[0]?.count || 1;
                const width = (merchant.count / maxCount) * 100;
                
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <span className="text-sm font-medium text-gray-900 w-24 truncate">
                        {merchant.type}
                      </span>
                      <div className="flex-1 mx-3">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${width}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 ml-2">
                      {merchant.count} transactions
                    </span>
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