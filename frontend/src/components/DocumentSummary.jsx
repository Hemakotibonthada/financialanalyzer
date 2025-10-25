import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, FileText, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../services/api';

const DocumentSummary = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/financial/analytics/document-summary');
      
      if (response.data.success) {
        setSummary(response.data.data);
      }
    } catch (err) {
      console.error('Error loading document summary:', err);
      setError(err.response?.data?.message || 'Failed to load document summary');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatLargeNumber = (num) => {
    if (num >= 10000000) { // 1 Crore
      return `₹${(num / 10000000).toFixed(2)}Cr`;
    } else if (num >= 100000) { // 1 Lakh
      return `₹${(num / 100000).toFixed(2)}L`;
    } else if (num >= 1000) { // 1 Thousand
      return `₹${(num / 1000).toFixed(2)}K`;
    }
    return formatCurrency(num);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center text-red-700">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>{error}</span>
        </div>
        <button
          onClick={loadSummary}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  if (!summary || summary.overview.totalTransactions === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <FileText className="w-12 h-12 text-blue-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-blue-900 mb-2">No Data Available</h3>
        <p className="text-blue-700">Upload financial documents to see your comprehensive analysis</p>
      </div>
    );
  }

  const { overview } = summary;

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Complete Financial Overview</h2>
          <p className="text-gray-600 mt-1">
            Aggregated data from {overview.totalDocuments} document{overview.totalDocuments !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={loadSummary}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Summary Cards - Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Expenses */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600 mt-2">
                {formatCurrency(overview.totalExpenses)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatLargeNumber(overview.totalExpenses)}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        {/* Total Income */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {formatCurrency(overview.totalIncome)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatLargeNumber(overview.totalIncome)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Net Savings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Savings</p>
              <p className={`text-2xl font-bold mt-2 ${
                overview.netSavings >= 0 ? 'text-blue-600' : 'text-red-600'
              }`}>
                {formatCurrency(overview.netSavings)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {overview.savingsRate.toFixed(1)}% savings rate
              </p>
            </div>
            <div className={`p-3 rounded-full ${
              overview.netSavings >= 0 ? 'bg-blue-100' : 'bg-red-100'
            }`}>
              <DollarSign className={`w-6 h-6 ${
                overview.netSavings >= 0 ? 'text-blue-600' : 'text-red-600'
              }`} />
            </div>
          </div>
        </div>

        {/* Total Transactions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {overview.totalTransactions.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Avg: {formatCurrency(overview.averageTransactionValue)}
              </p>
            </div>
            <div className="bg-gray-100 p-3 rounded-full">
              <FileText className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Date Range */}
      {summary.dateRange.earliest && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700">
              <strong>Data Period:</strong> {new Date(summary.dateRange.earliest).toLocaleDateString()} 
              {' to '}
              {new Date(summary.dateRange.latest).toLocaleDateString()}
            </span>
            <span className="text-blue-700 font-medium">
              {Math.ceil((new Date(summary.dateRange.latest) - new Date(summary.dateRange.earliest)) / (1000 * 60 * 60 * 24))} days
            </span>
          </div>
        </div>
      )}

      {/* Document Breakdown */}
      {summary.documents && summary.documents.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Document</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Transactions</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Income</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Expenses</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Net Flow</th>
                </tr>
              </thead>
              <tbody>
                {summary.documents.map((doc, idx) => (
                  <tr key={doc.documentId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{doc.fileName}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(doc.uploadDate).toLocaleDateString()}
                        </p>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-gray-900">
                      {doc.transactionCount}
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-green-600 font-medium">
                      {formatCurrency(doc.totalIncome)}
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-red-600 font-medium">
                      {formatCurrency(doc.totalExpenses)}
                    </td>
                    <td className={`text-right py-3 px-4 text-sm font-medium ${
                      doc.netFlow >= 0 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(doc.netFlow)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-300 bg-gray-50">
                <tr>
                  <td className="py-3 px-4 font-bold text-gray-900">TOTAL</td>
                  <td className="text-right py-3 px-4 font-bold text-gray-900">
                    {overview.totalTransactions}
                  </td>
                  <td className="text-right py-3 px-4 font-bold text-green-600">
                    {formatCurrency(overview.totalIncome)}
                  </td>
                  <td className="text-right py-3 px-4 font-bold text-red-600">
                    {formatCurrency(overview.totalExpenses)}
                  </td>
                  <td className={`text-right py-3 px-4 font-bold ${
                    overview.netSavings >= 0 ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(overview.netSavings)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Top Categories */}
      {summary.categories && summary.categories.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Spending Categories</h3>
          <div className="space-y-3">
            {summary.categories.slice(0, 5).map((cat, idx) => {
              const percentage = (cat.amount / overview.totalExpenses) * 100;
              return (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {cat.category.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(cat.amount)} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{cat.count} transactions</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentSummary;
