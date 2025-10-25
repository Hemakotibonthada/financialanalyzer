import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, PiggyBank, CreditCard, TrendingUpIcon } from 'lucide-react';

const FinancialSummary = ({ summary }) => {
  if (!summary) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Summary</h3>
        <p className="text-gray-500">No financial data available yet.</p>
      </div>
    );
  }

  // Net Savings = Income - Spending (investments already included in spending)
  const netSavings = (summary.monthlyIncome || 0) - (summary.monthlySpending || 0);
  const savingsRate = summary.monthlyIncome > 0 ? 
    Math.round((netSavings / summary.monthlyIncome) * 100) : 0;

  const summaryCards = [
    {
      title: 'Monthly Income',
      value: summary.monthlyIncome || 0,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      prefix: '₹'
    },
    {
      title: 'Monthly Spending',
      value: summary.monthlySpending || 0,
      icon: CreditCard,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      prefix: '₹'
    },
    {
      title: 'Monthly Investments',
      value: summary.monthlyInvestments || 0,
      icon: TrendingUpIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      prefix: '₹'
    },
    {
      title: 'Net Savings',
      value: netSavings,
      icon: netSavings >= 0 ? TrendingUp : TrendingDown,
      color: netSavings >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: netSavings >= 0 ? 'bg-green-50' : 'bg-red-50',
      prefix: '₹'
    },
    {
      title: 'Savings Rate',
      value: savingsRate,
      icon: PiggyBank,
      color: savingsRate >= 20 ? 'text-green-600' : savingsRate >= 10 ? 'text-yellow-600' : 'text-red-600',
      bgColor: savingsRate >= 20 ? 'bg-green-50' : savingsRate >= 10 ? 'bg-yellow-50' : 'bg-red-50',
      suffix: '%'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Financial Summary</h3>
        <p className="text-sm text-gray-600 mt-1">Current month overview</p>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {summaryCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div key={index} className="relative">
                <div className="flex flex-col">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${card.bgColor} mb-3`}>
                    <Icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                    <p className={`text-xl font-bold ${card.color}`}>
                      {card.prefix && card.prefix}
                      {Math.abs(card.value).toLocaleString('en-IN', {
                        minimumFractionDigits: card.prefix ? 2 : 0,
                        maximumFractionDigits: card.prefix ? 2 : 0
                      })}
                      {card.suffix && card.suffix}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Financial Health Indicator */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Financial Health Score</p>
              <p className="text-xs text-gray-600">Based on spending patterns and savings rate</p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${
                summary.financialHealthScore >= 80 ? 'text-green-600' :
                summary.financialHealthScore >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {summary.financialHealthScore || 'N/A'}
                {summary.financialHealthScore && '/100'}
              </p>
            </div>
          </div>
          
          {/* Health Score Bar */}
          {summary.financialHealthScore && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    summary.financialHealthScore >= 80 ? 'bg-green-600' :
                    summary.financialHealthScore >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                  }`}
                  style={{ width: `${Math.min(summary.financialHealthScore, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Poor</span>
                <span>Fair</span>
                <span>Good</span>
                <span>Excellent</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{summary.totalAnalyses || 0}</p>
              <p className="text-sm text-gray-600">Total Analyses</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {summary.lastSyncDate ? 
                  new Date(summary.lastSyncDate).toLocaleDateString() : 
                  'Never'
                }
              </p>
              <p className="text-sm text-gray-600">Last Sync</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialSummary;