// ============================================================================
// Enterprise Financial Reports V2 — Comprehensive Report Generation
// ============================================================================

import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import MainLayout from '../components/MainLayout';
import {
  FileText, Download, Calendar, BarChart3, PieChart, TrendingUp,
  TrendingDown, DollarSign, Filter, Printer, Share2, RefreshCw,
  ChevronDown, ArrowUpRight, ArrowDownRight, Wallet, Target,
  Users, Building, CreditCard, Briefcase, Clock, CheckCircle2,
} from 'lucide-react';
import api from '../services/api';
import {
  FinancialAreaChart, FinancialBarChart, FinancialDonutChart,
  IncomeExpenseChart,
} from '../components/charts/EnterpriseCharts';

// ============================================================================
// § 1 — Report Types
// ============================================================================

const REPORT_TYPES = [
  { id: 'monthly', label: 'Monthly Summary', icon: Calendar, description: 'Income, expenses, savings for a month' },
  { id: 'spending', label: 'Spending Analysis', icon: PieChart, description: 'Category breakdown and trends' },
  { id: 'income', label: 'Income Report', icon: TrendingUp, description: 'Income sources and stability' },
  { id: 'networth', label: 'Net Worth', icon: Wallet, description: 'Assets, liabilities, and net worth' },
  { id: 'budget', label: 'Budget Performance', icon: Target, description: 'Budget vs actual comparison' },
  { id: 'tax', label: 'Tax Summary', icon: Building, description: 'Tax-related transactions for filing' },
  { id: 'investment', label: 'Investment Report', icon: Briefcase, description: 'Portfolio performance & allocation' },
  { id: 'debt', label: 'Debt Summary', icon: CreditCard, description: 'Outstanding debts and repayment' },
];

// ============================================================================
// § 2 — Report Card Component
// ============================================================================

function ReportCard({ report, onGenerate }) {
  const Icon = report.icon;
  return (
    <button
      onClick={() => onGenerate(report.id)}
      className="group relative p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100
        dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 shadow-sm
        hover:shadow-lg transition-all text-left"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400
          group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
          <Icon size={22} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{report.label}</h3>
          <p className="text-xs text-gray-500 mt-1">{report.description}</p>
        </div>
        <ArrowUpRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
      </div>
    </button>
  );
}

// ============================================================================
// § 3 — Stat Summary Row
// ============================================================================

function StatRow({ items }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {items.map((item, i) => (
        <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
          <div className="flex items-center gap-2 mb-1">
            {item.icon && <item.icon size={14} className="text-gray-400" />}
            <span className="text-xs text-gray-500">{item.label}</span>
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">{item.value}</div>
          {item.change !== undefined && (
            <div className={`flex items-center gap-1 text-xs mt-0.5 ${item.change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {item.change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(item.change).toFixed(1)}%
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// § 4 — Report Viewer Component
// ============================================================================

function ReportViewer({ type, data, period, onClose }) {
  const reportRef = useRef(null);
  const config = REPORT_TYPES.find(r => r.id === type);
  const Icon = config?.icon || FileText;
  const fmt = v => '₹' + (Math.abs(v) >= 10000000 ? (v / 10000000).toFixed(2) + ' Cr' :
    Math.abs(v) >= 100000 ? (v / 100000).toFixed(2) + ' L' :
      Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + 'K' : v.toLocaleString('en-IN'));

  const handlePrint = () => {
    const content = reportRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>${config?.label || 'Report'}</title>
      <style>body{font-family:system-ui;padding:2rem}table{width:100%;border-collapse:collapse}
      th,td{padding:8px 12px;border:1px solid #ddd;text-align:left}th{background:#f5f5f5}</style>
      </head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <Icon size={20} className="text-blue-500" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{config?.label}</h2>
            <p className="text-xs text-gray-500">{period}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            <Printer size={16} />
          </button>
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            <Download size={16} />
          </button>
          <button onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium">
            Close
          </button>
        </div>
      </div>

      {/* Content */}
      <div ref={reportRef} className="p-6 space-y-6">
        {type === 'monthly' && data && (
          <>
            <StatRow items={[
              { label: 'Total Income', value: fmt(data.income || 0), icon: TrendingUp },
              { label: 'Total Expenses', value: fmt(data.expenses || 0), icon: TrendingDown },
              { label: 'Net Savings', value: fmt((data.income || 0) - (data.expenses || 0)), icon: Wallet },
              { label: 'Savings Rate', value: `${data.income ? (((data.income - data.expenses) / data.income) * 100).toFixed(1) : 0}%`, icon: Target },
            ]} />
            {data.categoryBreakdown && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold mb-3">Expense Categories</h3>
                  <FinancialDonutChart
                    data={Object.entries(data.categoryBreakdown || {}).map(([name, val]) => ({
                      name, value: typeof val === 'object' ? val.total : val,
                    })).filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 8)}
                    height={220}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-3">Daily Trend</h3>
                  <FinancialAreaChart
                    data={(data.dailyTrend || []).map(d => ({
                      name: new Date(d.date || d._id).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                      amount: d.total || d.amount || 0,
                    }))}
                    areas={[{ key: 'amount', name: 'Spending', color: '#ef4444' }]}
                    height={220}
                  />
                </div>
              </div>
            )}
            {data.topMerchants && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Top Merchants</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 text-gray-500 font-medium">Merchant</th>
                        <th className="text-right py-2 text-gray-500 font-medium">Amount</th>
                        <th className="text-right py-2 text-gray-500 font-medium">Txns</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topMerchants.slice(0, 10).map((m, i) => (
                        <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-2 text-gray-900 dark:text-white">{m.merchant || m.name || m._id}</td>
                          <td className="py-2 text-right font-medium">{fmt(m.total || m.amount)}</td>
                          <td className="py-2 text-right text-gray-500">{m.count || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {type === 'spending' && data && (
          <>
            <StatRow items={[
              { label: 'Total Spending', value: fmt(data.totalSpending || 0), icon: DollarSign },
              { label: 'Daily Average', value: fmt(data.dailyAverage || 0), icon: Clock },
              { label: 'Categories', value: `${Object.keys(data.categoryBreakdown || {}).length}`, icon: PieChart },
              { label: 'Transactions', value: `${data.transactionCount || 0}`, icon: BarChart3 },
            ]} />
            {data.categoryBreakdown && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Category Breakdown</h3>
                <FinancialBarChart
                  data={Object.entries(data.categoryBreakdown || {}).map(([name, val]) => ({
                    name: name.length > 12 ? name.slice(0, 12) + '…' : name,
                    amount: typeof val === 'object' ? val.total : val,
                  })).sort((a, b) => b.amount - a.amount).slice(0, 10)}
                  bars={[{ key: 'amount', name: 'Amount', color: '#3b82f6' }]}
                  height={250}
                />
              </div>
            )}
          </>
        )}

        {type === 'networth' && data && (
          <>
            <StatRow items={[
              { label: 'Total Assets', value: fmt(data.totalAssets || 0), icon: TrendingUp },
              { label: 'Total Liabilities', value: fmt(data.totalLiabilities || 0), icon: TrendingDown },
              { label: 'Net Worth', value: fmt((data.totalAssets || 0) - (data.totalLiabilities || 0)), icon: Wallet },
              { label: 'Debt-to-Asset', value: `${((data.totalLiabilities / Math.max(data.totalAssets, 1)) * 100).toFixed(1)}%`, icon: Target },
            ]} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold mb-3">Assets</h3>
                <FinancialDonutChart
                  data={Object.entries(data.assets || {}).filter(([, v]) => v > 0).map(([name, value]) => ({
                    name: name.replace(/([A-Z])/g, ' $1').trim(), value,
                  }))}
                  colors={['#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6']}
                  height={220}
                />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-3">Liabilities</h3>
                <FinancialDonutChart
                  data={Object.entries(data.liabilities || {}).filter(([, v]) => v > 0).map(([name, value]) => ({
                    name: name.replace(/([A-Z])/g, ' $1').trim(), value,
                  }))}
                  colors={['#ef4444', '#f97316', '#eab308', '#f43f5e']}
                  height={220}
                />
              </div>
            </div>
          </>
        )}

        {/* Fallback for types without specific rendering */}
        {!['monthly', 'spending', 'networth'].includes(type) && data && (
          <div className="text-center py-12 text-gray-500">
            <FileText size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Report data loaded. Use the print button to export.</p>
            <pre className="mt-4 text-xs text-left max-h-96 overflow-auto p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// § 5 — Main Reports Page
// ============================================================================

export default function EnhancedReportsV2() {
  const { theme } = useContext(ThemeContext);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('last30');

  const periodLabel = {
    last7: 'Last 7 Days',
    last30: 'Last 30 Days',
    last90: 'Last 90 Days',
    last365: 'Last 365 Days',
    thisMonth: 'This Month',
    thisYear: 'This Year',
  };

  const generateReport = async (type) => {
    setSelectedReport(type);
    setLoading(true);
    setReportData(null);

    const days = { last7: 7, last30: 30, last90: 90, last365: 365, thisMonth: 30, thisYear: 365 }[period] || 30;

    try {
      let res;
      switch (type) {
        case 'monthly':
          res = await api.get(`/analytics/v2/comprehensive?days=${days}`);
          break;
        case 'spending':
          res = await api.get(`/analytics/v2/spending?days=${days}`);
          break;
        case 'income':
          res = await api.get(`/analytics/v2/income?days=${days}`);
          break;
        case 'networth':
          res = await api.get('/analytics/v2/networth');
          break;
        case 'budget':
          res = await api.get('/analytics/v2/budget-status');
          break;
        case 'investment':
          res = await api.get('/investments/summary');
          break;
        case 'debt':
          const [debtsRes, emisRes] = await Promise.allSettled([
            api.get('/debts'), api.get('/emis'),
          ]);
          res = { data: { success: true, data: {
            debts: debtsRes.status === 'fulfilled' ? debtsRes.value.data?.data || debtsRes.value.data : [],
            emis: emisRes.status === 'fulfilled' ? emisRes.value.data?.data || emisRes.value.data : [],
          }}};
          break;
        case 'tax':
          res = await api.get(`/analytics/v2/comprehensive?days=365`);
          break;
        default:
          res = await api.get(`/analytics/v2/comprehensive?days=${days}`);
      }

      if (res.data?.success) setReportData(res.data.data);
      else if (res.data?.data) setReportData(res.data.data);
      else setReportData(res.data);
    } catch (err) {
      console.error('Report generation error:', err);
      setReportData({ error: 'Failed to generate report. Please try again.' });
    }
    setLoading(false);
  };

  return (
    <MainLayout>
      <div className="page-transition p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <FileText className="text-blue-500" size={28} />
              Financial Reports
            </h1>
            <p className="text-sm text-gray-500 mt-1">Generate and export comprehensive financial reports</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                bg-white dark:bg-gray-800 text-sm"
            >
              {Object.entries(periodLabel).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Report */}
        {selectedReport ? (
          <div className="mb-6">
            {loading ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
                <RefreshCw className="animate-spin mx-auto mb-3 text-blue-500" size={32} />
                <p className="text-sm text-gray-500">Generating report...</p>
              </div>
            ) : reportData ? (
              <ReportViewer
                type={selectedReport}
                data={reportData}
                period={periodLabel[period]}
                onClose={() => { setSelectedReport(null); setReportData(null); }}
              />
            ) : null}
          </div>
        ) : null}

        {/* Report Type Grid */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            {selectedReport ? 'Generate Another Report' : 'Choose a Report'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {REPORT_TYPES.map(report => (
              <ReportCard key={report.id} report={report} onGenerate={generateReport} />
            ))}
          </div>
        </div>

        {/* Recent Reports */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button onClick={() => generateReport('monthly')}
              className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-500 to-blue-600
                rounded-xl text-white hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg">
              <Calendar size={20} />
              <div className="text-left">
                <div className="font-semibold text-sm">Monthly Summary</div>
                <div className="text-xs opacity-80">Quick overview of this month</div>
              </div>
            </button>
            <button onClick={() => generateReport('networth')}
              className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-500 to-emerald-600
                rounded-xl text-white hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg">
              <Wallet size={20} />
              <div className="text-left">
                <div className="font-semibold text-sm">Net Worth Statement</div>
                <div className="text-xs opacity-80">Assets vs liabilities</div>
              </div>
            </button>
            <button onClick={() => generateReport('tax')}
              className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-500 to-indigo-600
                rounded-xl text-white hover:from-purple-600 hover:to-indigo-700 transition-all shadow-lg">
              <Building size={20} />
              <div className="text-left">
                <div className="font-semibold text-sm">Tax Summary</div>
                <div className="text-xs opacity-80">For income tax filing</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
