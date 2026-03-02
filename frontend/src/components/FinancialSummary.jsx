import React, { useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, PiggyBank, CreditCard, TrendingUpIcon, Info } from 'lucide-react';

const BreakdownTooltip = ({ breakdown, prefix = '₹' }) => {
  const [show, setShow] = useState(false);
  if (!breakdown || Object.keys(breakdown).length === 0) return null;

  const labels = {
    transactions: 'Transactions',
    emiPayments: 'EMI Payments',
    creditCardBills: 'Credit Card Bills',
    billReminders: 'Bills & Reminders',
    newPurchases: 'New Purchases',
    sipContributions: 'SIP Contributions',
    salary: 'Salary / Income',
    loanRepayments: 'Loan Repayments',
    dividends: 'Dividends'
  };

  const items = Object.entries(breakdown).filter(([, val]) => val > 0);
  if (items.length === 0) return null;

  return (
    <div className="relative inline-block ml-1">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-gray-200 dark:border-slate-600 p-3">
          <p className="text-xs font-semibold text-gray-700 dark:text-slate-200 mb-2 border-b border-gray-100 dark:border-slate-600 pb-1">Breakdown</p>
          {items.map(([key, val]) => (
            <div key={key} className="flex justify-between text-xs py-0.5">
              <span className="text-gray-600 dark:text-slate-300">{labels[key] || key}</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {prefix}{val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ))}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-white dark:bg-slate-700 border-r border-b border-gray-200 dark:border-slate-600 rotate-45"></div>
        </div>
      )}
    </div>
  );
};

const FinancialSummary = ({ summary }) => {
  if (!summary) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Financial Summary</h3>
        <p className="text-gray-500 dark:text-slate-400">No financial data available yet.</p>
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
      prefix: '₹',
      breakdown: summary.incomeBreakdown
    },
    {
      title: 'Monthly Spending',
      value: summary.monthlySpending || 0,
      icon: CreditCard,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      prefix: '₹',
      breakdown: summary.spendingBreakdown
    },
    {
      title: 'Monthly Investments',
      value: summary.monthlyInvestments || 0,
      icon: TrendingUpIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      prefix: '₹',
      breakdown: summary.investmentBreakdown
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
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Financial Summary</h3>
        <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Current month overview</p>
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
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">{card.title}</p>
                      {card.breakdown && <BreakdownTooltip breakdown={card.breakdown} prefix={card.prefix || ''} />}
                    </div>
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
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Financial Health Score</p>
              <p className="text-xs text-gray-600 dark:text-slate-400">Based on spending patterns and savings rate</p>
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
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    summary.financialHealthScore >= 80 ? 'bg-green-600' :
                    summary.financialHealthScore >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                  }`}
                  style={{ width: `${Math.min(summary.financialHealthScore, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mt-1">
                <span>Poor</span>
                <span>Fair</span>
                <span>Good</span>
                <span>Excellent</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalAnalyses || 0}</p>
              <p className="text-sm text-gray-600 dark:text-slate-400">Total Analyses</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {summary.lastSyncDate ? 
                  new Date(summary.lastSyncDate).toLocaleDateString() : 
                  'Never'
                }
              </p>
              <p className="text-sm text-gray-600 dark:text-slate-400">Last Sync</p>
            </div>
            {summary.totalActiveEMIs > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{summary.totalActiveEMIs}</p>
                <p className="text-sm text-gray-600 dark:text-slate-400">Active EMIs</p>
              </div>
            )}
            {summary.portfolioValue > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  ₹{summary.portfolioValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className="text-sm text-gray-600 dark:text-slate-400">Portfolio Value</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialSummary;