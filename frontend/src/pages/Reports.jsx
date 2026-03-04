import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

import api from '../services/api';
import { showPasswordNotification, extractPasswordFromResponse, downloadFileWithPassword } from '../utils/documentPasswordNotification';
import MainLayout from '../components/MainLayout';
import { FadeIn, PageTransition } from '../components/ui/AnimatedComponents';

const Reports = () => {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({
    months: 12,
    startDate: '',
    endDate: ''
  });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchMonthlyTrendsReport();
  }, []);

  const fetchMonthlyTrendsReport = async (customRange = null) => {
    try {
      setLoading(true);
      const range = customRange || dateRange;
      
      let url = '/financial/monthly-trends-report?';
      if (range.startDate && range.endDate) {
        url += `startDate=${range.startDate}&endDate=${range.endDate}`;
      } else {
        url += `months=${range.months}`;
      }

      const response = await api.get(url);

      if (response.data.success) {
        setReportData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching monthly trends report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyFilter = () => {
    fetchMonthlyTrendsReport();
  };

  const handleExport = async (format) => {
    try {
      setExporting(true);
      
      let url = `/financial/monthly-trends-report/export/${format}?`;
      if (dateRange.startDate && dateRange.endDate) {
        url += `startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      } else {
        url += `months=${dateRange.months}`;
      }

      const response = await api.get(url, {
        responseType: 'blob'
      });

      // Get password from response headers and download with notification
      const password = extractPasswordFromResponse(response);
      const filename = `Monthly_Trends_Report_${Date.now()}.${format === 'excel' ? 'xlsx' : format}`;
      
      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' :
              format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
              'text/csv'
      });
      
      downloadFileWithPassword(blob, filename, password);
    } catch (error) {
      console.error(`Error exporting ${format}:`, error);
      alert(`Failed to export ${format.toUpperCase()} report`);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Reports">
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-slate-400">Loading report...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Chart configurations
  const incomeExpenseChartData = reportData ? {
    labels: reportData.monthlyTrends.map(t => t.month),
    datasets: [
      {
        label: 'Income',
        data: reportData.monthlyTrends.map(t => t.income),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4
      },
      {
        label: 'Expenses',
        data: reportData.monthlyTrends.map(t => t.expenses),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4
      }
    ]
  } : null;

  const savingsRateChartData = reportData ? {
    labels: reportData.monthlyTrends.map(t => t.month),
    datasets: [{
      label: 'Savings Rate (%)',
      data: reportData.monthlyTrends.map(t => parseFloat(t.savingsRate)),
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 1
    }]
  } : null;

  const categoryChartData = reportData ? {
    labels: reportData.categoryBreakdown.map(c => c.category),
    datasets: [{
      label: 'Expenses by Category',
      data: reportData.categoryBreakdown.map(c => c.amount),
      backgroundColor: [
        'rgba(255, 99, 132, 0.8)',
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(153, 102, 255, 0.8)',
        'rgba(255, 159, 64, 0.8)',
        'rgba(199, 199, 199, 0.8)',
        'rgba(83, 102, 255, 0.8)',
        'rgba(255, 99, 255, 0.8)',
        'rgba(99, 255, 132, 0.8)'
      ]
    }]
  } : null;

  return (
    <MainLayout title="Reports">
    <PageTransition>
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Monthly Trends Report</h1>
            <p className="text-gray-600 dark:text-slate-400 mt-1">Comprehensive analysis of your income and expenses</p>
          </div>
          <Link to="/" className="text-primary-600 hover:text-primary-700 font-medium">
            Back to Dashboard
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">Date Range Filter</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Quick Select
              </label>
              <select
                className="w-full border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-200"
                value={dateRange.months}
                onChange={(e) => {
                  setDateRange({ months: e.target.value, startDate: '', endDate: '' });
                }}
              >
                <option value={3}>Last 3 Months</option>
                <option value={6}>Last 6 Months</option>
                <option value={12}>Last 12 Months</option>
                <option value={24}>Last 24 Months</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-200"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-200"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleApplyFilter}
                className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 transition-colors"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">Export Report</h2>
          <div className="flex gap-4">
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting}
              className="flex items-center gap-2 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PDF
            </button>
            <button
              onClick={() => handleExport('excel')}
              disabled={exporting}
              className="flex items-center gap-2 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Excel
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className="flex items-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        {reportData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30 p-6">
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Total Income</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{reportData.summary.totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30 p-6">
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">
                  ₹{reportData.summary.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30 p-6">
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Total Net</p>
                <p className={`text-2xl font-bold ${reportData.summary.totalNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{reportData.summary.totalNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30 p-6">
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Avg Savings Rate</p>
                <p className="text-2xl font-bold text-blue-600">
                  {reportData.summary.avgSavingsRate.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30 p-6">
                <h3 className="text-lg font-semibold mb-4 dark:text-white">Income vs Expenses Trend</h3>
                <Line 
                  data={incomeExpenseChartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: { position: 'bottom' }
                    }
                  }}
                />
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30 p-6">
                <h3 className="text-lg font-semibold mb-4 dark:text-white">Monthly Savings Rate</h3>
                <Bar 
                  data={savingsRateChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: { position: 'bottom' }
                    },
                    scales: {
                      y: { beginAtZero: true }
                    }
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30 p-6">
                <h3 className="text-lg font-semibold mb-4 dark:text-white">Top Expense Categories</h3>
                <Doughnut 
                  data={categoryChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: { position: 'right' }
                    }
                  }}
                />
              </div>
              
              {/* Trend Analysis */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30 p-6">
                <h3 className="text-lg font-semibold mb-4 dark:text-white">Trend Analysis</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700 rounded">
                    <span className="text-gray-700 dark:text-slate-300">Income Growth</span>
                    <span className={`font-semibold ${reportData.trendAnalysis.incomeGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {reportData.trendAnalysis.incomeGrowth >= 0 ? '+' : ''}{reportData.trendAnalysis.incomeGrowth.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700 rounded">
                    <span className="text-gray-700 dark:text-slate-300">Expense Growth</span>
                    <span className={`font-semibold ${reportData.trendAnalysis.expenseGrowth <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {reportData.trendAnalysis.expenseGrowth >= 0 ? '+' : ''}{reportData.trendAnalysis.expenseGrowth.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700 rounded">
                    <span className="text-gray-700 dark:text-slate-300">Savings Trend</span>
                    <span className={`font-semibold ${reportData.trendAnalysis.savingsTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {reportData.trendAnalysis.savingsTrend >= 0 ? '+' : ''}{reportData.trendAnalysis.savingsTrend.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700 rounded">
                    <span className="text-gray-700 dark:text-slate-300">Months Analyzed</span>
                    <span className="font-semibold text-blue-600">
                      {reportData.summary.monthsAnalyzed}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Breakdown Table */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30 p-6">
              <h3 className="text-lg font-semibold mb-4 dark:text-white">Monthly Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Month</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Income</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Expenses</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Net</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Savings Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Transactions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                    {reportData.monthlyTrends.map((trend, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{trend.month}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                          ₹{trend.income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          ₹{trend.expenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${trend.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{trend.net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                          {trend.savingsRate}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                          {trend.transactionCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    </PageTransition>
    </MainLayout>
  );
};

export default Reports;
