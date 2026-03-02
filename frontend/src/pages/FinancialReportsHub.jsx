import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileBarChart2, Download, FileText, Calendar, Clock, Star, StarOff, Plus,
  Filter, Search, Eye, Trash2, Mail, X, Check, ChevronDown, Settings,
  PieChart as PieChartIcon, BarChart3, TrendingUp, CreditCard, Receipt,
  FileSpreadsheet, FileType as FilePdf, Printer, RefreshCw, ArrowRight, BookOpen, Shield,
  AlertTriangle
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';
import api from '../services/api';

const AnimatedValue = ({ end, prefix = '₹' }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start; const ref = { current: null };
    const animate = (ts) => { if (!start) start = ts; const p = Math.min((ts - start) / 1200, 1); setVal((1 - Math.pow(1 - p, 3)) * end); if (p < 1) ref.current = requestAnimationFrame(animate); };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [end]);
  return <span>{prefix}{Math.round(val).toLocaleString()}</span>;
};

const REPORT_TEMPLATES = [
  { id: 'monthly', name: 'Monthly Summary', description: 'Complete monthly financial overview with income, expenses, and savings', icon: Calendar, color: 'blue', chartType: 'bar' },
  { id: 'tax', name: 'Tax Report', description: 'Annual tax computation with deductions and liability breakdown', icon: FileText, color: 'red', chartType: 'pie' },
  { id: 'spending', name: 'Spending Analysis', description: 'Detailed category-wise spending patterns and trends', icon: PieChartIcon, color: 'purple', chartType: 'pie' },
  { id: 'investment', name: 'Investment Report', description: 'Portfolio performance, returns, and asset allocation', icon: TrendingUp, color: 'green', chartType: 'area' },
  { id: 'budget', name: 'Budget vs Actual', description: 'Compare budgeted amounts with actual spending', icon: BarChart3, color: 'amber', chartType: 'bar' },
  { id: 'debt', name: 'Debt Summary', description: 'Outstanding debts, EMIs, and repayment schedule', icon: CreditCard, color: 'pink', chartType: 'bar' },
  { id: 'subscription', name: 'Subscription Audit', description: 'All active subscriptions with costs and renewal dates', icon: Receipt, color: 'cyan', chartType: 'pie' },
  { id: 'networth', name: 'Net Worth Report', description: 'Assets minus liabilities with growth tracking', icon: Shield, color: 'emerald', chartType: 'area' },
];

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function FinancialReportsHub() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [savedReports, setSavedReports] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [dateRange, setDateRange] = useState({ start: '2026-02-01', end: '2026-02-28' });
  const [showExportModal, setShowExportModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduleForm, setScheduleForm] = useState({ frequency: 'Monthly', email: '', format: 'pdf' });

  // Fetch summary data on mount
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/financial-reports/summary');
      const data = res.data;
      if (data?.success === false) {
        setError(data.error || 'Failed to load reports data');
      }
      // Populate saved reports if the API returns them
      if (data?.savedReports) setSavedReports(data.savedReports);
      if (data?.scheduledReports) setScheduled(data.scheduledReports);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load reports data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleGeneratePreview = useCallback(async (template) => {
    setSelectedTemplate(template);
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const res = await api.post('/financial-reports/generate', {
        templateId: template.id,
        format: 'pdf',
        dateRange,
      });
      const data = res.data;
      if (data?.success && data.report?.data) {
        const rd = data.report.data;
        // Map API response into the shape the charts expect
        const summary = rd.overview || rd.totalSpending || {};
        const monthly = (rd.incomeVsExpense || data.incomeVsExpense || []).map(item => ({
          month: item.period || item.month,
          income: item.income || 0,
          expense: item.expense || 0,
          savings: (item.income || 0) - (item.expense || 0),
        }));
        const spending = (rd.categoryBreakdown || data.topCategories || []).map(cat => ({
          name: cat.name || cat.category,
          value: cat.amount || cat.value || 0,
        }));
        const networth = (rd.networth || []).map(item => ({
          month: item.period || item.month,
          assets: item.assets || 0,
          liabilities: item.liabilities || 0,
          networth: item.networth || (item.assets || 0) - (item.liabilities || 0),
        }));

        setPreviewData({
          summary: {
            totalIncome: summary.totalIncome || 0,
            totalExpense: summary.totalExpenses || summary.totalExpense || 0,
            savings: summary.netSavings || summary.savings || 0,
            savingsRate: summary.savingsRate || 0,
          },
          monthly,
          spending,
          networth,
        });
      } else {
        // Fallback: try /reports/summary for basic data
        const summaryRes = await api.get('/financial-reports/summary', { params: { period: 'month' } });
        const sd = summaryRes.data;
        if (sd?.success) {
          const monthly = (sd.incomeVsExpense || []).map(item => ({
            month: item.period || item.month,
            income: item.income || 0,
            expense: item.expense || 0,
            savings: (item.income || 0) - (item.expense || 0),
          }));
          const spending = (sd.topCategories || []).map(cat => ({
            name: cat.name,
            value: cat.amount || 0,
          }));
          setPreviewData({
            summary: {
              totalIncome: sd.summary?.totalIncome || 0,
              totalExpense: sd.summary?.totalExpenses || 0,
              savings: sd.summary?.netSavings || 0,
              savingsRate: sd.summary?.savingsRate || 0,
            },
            monthly,
            spending,
            networth: [],
          });
        }
      }
    } catch (err) {
      console.error('Failed to generate preview:', err);
      setPreviewData(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [dateRange]);

  const handleExport = useCallback(async (format) => {
    setExporting(true);
    try {
      await api.post('/financial-reports/generate', { templateId: selectedTemplate?.id, format, dateRange });
      setShowExportModal(false);
      const newReport = {
        id: Date.now(),
        name: `${selectedTemplate?.name || 'Report'} - ${new Date().toLocaleDateString('en-IN')}`,
        template: selectedTemplate?.id,
        date: new Date().toISOString().split('T')[0],
        starred: false,
      };
      setSavedReports(prev => [newReport, ...prev]);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  }, [selectedTemplate, dateRange]);

  const toggleStar = useCallback((id) => {
    setSavedReports(prev => prev.map(r => r.id === id ? { ...r, starred: !r.starred } : r));
  }, []);

  const deleteReport = useCallback((id) => {
    setSavedReports(prev => prev.filter(r => r.id !== id));
  }, []);

  const deleteSchedule = useCallback((id) => {
    setScheduled(prev => prev.filter(s => s.id !== id));
  }, []);

  const addSchedule = useCallback(async () => {
    if (!selectedTemplate || !scheduleForm.email) return;
    try {
      const res = await api.post('/financial-reports/schedule', {
        templateId: selectedTemplate.id,
        schedule: {
          frequency: scheduleForm.frequency.toLowerCase(),
          format: scheduleForm.format,
          email: scheduleForm.email,
        },
      });
      const data = res.data;
      if (data?.success && data.scheduledReport) {
        setScheduled(prev => [...prev, {
          id: data.scheduledReport.id,
          template: selectedTemplate.id,
          name: data.scheduledReport.templateName || selectedTemplate.name,
          frequency: scheduleForm.frequency,
          nextRun: data.scheduledReport.nextRun,
          email: scheduleForm.email,
          format: scheduleForm.format,
        }]);
      }
    } catch (err) {
      console.error('Failed to schedule report:', err);
    }
    setShowScheduleModal(false);
    setScheduleForm({ frequency: 'Monthly', email: '', format: 'pdf' });
  }, [selectedTemplate, scheduleForm]);

  const filteredSaved = useMemo(() => {
    if (!searchQuery) return savedReports;
    return savedReports.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [savedReports, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in-up">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 text-lg">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center animate-fade-in-up max-w-md">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-slate-700 dark:text-slate-300 text-lg font-medium mb-2">Failed to load reports</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in-down">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg shadow-indigo-600/30">
              <FileBarChart2 className="w-6 h-6" />
            </div>
            Financial Reports Hub
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Generate, preview & export financial reports</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))}
              className="px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 outline-none" />
            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
            <input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))}
              className="px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 outline-none" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-1 animate-fade-in-up">
        {[
          { id: 'templates', label: 'Report Templates', icon: BookOpen },
          { id: 'saved', label: 'Saved Reports', icon: FileText },
          { id: 'scheduled', label: 'Scheduled', icon: Clock },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {REPORT_TEMPLATES.map(template => (
              <button key={template.id} onClick={() => handleGeneratePreview(template)}
                className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border text-left transition-all hover:shadow-lg ${selectedTemplate?.id === template.id ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}>
                <div className={`p-2.5 rounded-xl bg-${template.color}-100 dark:bg-${template.color}-900/30 text-${template.color}-600 dark:text-${template.color}-400 w-fit mb-3`}>
                  <template.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">{template.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{template.description}</p>
              </button>
            ))}
          </div>

          {/* Report Preview */}
          {selectedTemplate && previewLoading && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center animate-fade-in-up">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400">Generating preview...</p>
            </div>
          )}

          {selectedTemplate && !previewLoading && previewData && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-scale-in">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedTemplate.name}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{dateRange.start} to {dateRange.end}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowScheduleModal(true)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                      <Clock className="w-4 h-4" /> Schedule
                    </button>
                    <button onClick={() => setShowExportModal(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30">
                      <Download className="w-4 h-4" /> Export
                    </button>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4 border-b border-slate-100 dark:border-slate-700/50">
                {[
                  { label: 'Total Income', value: previewData.summary.totalIncome, color: 'green' },
                  { label: 'Total Expense', value: previewData.summary.totalExpense, color: 'red' },
                  { label: 'Savings', value: previewData.summary.savings, color: 'blue' },
                  { label: 'Savings Rate', value: previewData.summary.savingsRate, color: 'purple', suffix: '%', noPrefix: true },
                ].map((stat, idx) => (
                  <div key={idx} className={`p-4 rounded-xl bg-${stat.color}-50 dark:bg-${stat.color}-900/20`}>
                    <div className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</div>
                    <div className={`text-xl font-bold text-${stat.color}-700 dark:text-${stat.color}-400 mt-1`}>
                      {stat.noPrefix ? `${stat.value}${stat.suffix}` : <AnimatedValue end={stat.value} />}
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Income vs Expense */}
                {previewData.monthly.length > 0 ? (
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Income vs Expense</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={previewData.monthly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} formatter={(v) => [`₹${v.toLocaleString()}`]} />
                        <Legend />
                        <Bar dataKey="income" name="Income" fill="#10b981" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                ) : (
                <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500">
                  <p className="text-sm">No income/expense data available for this period.</p>
                </div>
                )}

                {/* Spending Breakdown */}
                {previewData.spending.length > 0 ? (
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Spending Breakdown</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={previewData.spending} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                          {previewData.spending.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} formatter={(v) => [`₹${v.toLocaleString()}`]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                    {previewData.spending.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i] }} />
                        <span className="text-slate-500 truncate">{s.name}</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 ml-auto">₹{s.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                ) : (
                <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500">
                  <p className="text-sm">No spending data available for this period.</p>
                </div>
                )}

                {/* Net Worth Trend */}
                {previewData.networth.length > 0 && (
                <div className="lg:col-span-2">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Net Worth Trend</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={previewData.networth}>
                        <defs>
                          <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} formatter={(v) => [`₹${v.toLocaleString()}`]} />
                        <Legend />
                        <Area type="monotone" dataKey="networth" name="Net Worth" stroke="#10b981" fill="url(#nwGrad)" strokeWidth={2.5} />
                        <Area type="monotone" dataKey="assets" name="Assets" stroke="#3b82f6" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
                        <Area type="monotone" dataKey="liabilities" name="Liabilities" stroke="#ef4444" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Saved Reports Tab */}
      {activeTab === 'saved' && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search reports..."
                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" />
            </div>
          </div>

          {filteredSaved.length > 0 ? (
            <div className="space-y-3">
              {filteredSaved.map(report => {
                const template = REPORT_TEMPLATES.find(t => t.id === report.template);
                const IconComp = template?.icon || FileText;
                const color = template?.color || 'slate';
                return (
                  <div key={report.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-5 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-lg transition-all">
                    <div className={`p-3 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400 shrink-0`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">{report.name}</h3>
                      <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{template?.name || 'Report'}</span>
                        <span>•</span>
                        <span>{new Date(report.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => toggleStar(report.id)} className={`p-2 rounded-lg transition-colors ${report.starred ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600 hover:text-amber-400'}`}>
                        {report.starred ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                      </button>
                      <button className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteReport(report.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No saved reports</p>
              <p className="text-sm mt-1">Generate a report from templates to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Scheduled Tab */}
      {activeTab === 'scheduled' && (
        <div className="space-y-4 animate-fade-in-up">
          {scheduled.length > 0 ? (
            <div className="space-y-3">
              {scheduled.map(sched => {
                const template = REPORT_TEMPLATES.find(t => t.id === sched.template);
                const IconComp = template?.icon || FileText;
                const color = template?.color || 'slate';
                return (
                  <div key={sched.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-5 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-lg transition-all">
                    <div className={`p-3 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400 shrink-0`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{sched.name}</h3>
                      <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">{sched.frequency}</span>
                        <span>•</span>
                        <span>Next: {new Date(sched.nextRun).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        <span>•</span>
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{sched.email}</span>
                        <span>•</span>
                        <span className="uppercase text-xs font-medium">{sched.format}</span>
                      </div>
                    </div>
                    <button onClick={() => deleteSchedule(sched.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No scheduled reports</p>
              <p className="text-sm mt-1">Schedule a report from the templates tab.</p>
            </div>
          )}
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowExportModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Export Report</h3>
              <button onClick={() => setShowExportModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-3">
              {[
                { format: 'pdf', label: 'PDF Document', icon: FilePdf, desc: 'Best for printing & sharing', color: 'red' },
                { format: 'excel', label: 'Excel Spreadsheet', icon: FileSpreadsheet, desc: 'Best for data analysis', color: 'green' },
                { format: 'csv', label: 'CSV File', icon: FileText, desc: 'Universal format', color: 'blue' },
              ].map(opt => (
                <button key={opt.format} onClick={() => handleExport(opt.format)} disabled={exporting}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-${opt.color}-400 dark:hover:border-${opt.color}-600 hover:bg-${opt.color}-50 dark:hover:bg-${opt.color}-900/20 transition-all text-left disabled:opacity-50`}>
                  <div className={`p-2.5 rounded-lg bg-${opt.color}-100 dark:bg-${opt.color}-900/30 text-${opt.color}-600 dark:text-${opt.color}-400`}>
                    <opt.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white text-sm">{opt.label}</div>
                    <div className="text-xs text-slate-500">{opt.desc}</div>
                  </div>
                  {exporting && <RefreshCw className="w-4 h-4 text-slate-400 animate-spin ml-auto" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowScheduleModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Schedule Report</h3>
              <button onClick={() => setShowScheduleModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">{selectedTemplate?.name || 'Report'}</div>
                <div className="text-xs text-blue-600/70 dark:text-blue-400/70">Will be generated and sent automatically</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Frequency</label>
                <select value={scheduleForm.frequency} onChange={e => setScheduleForm(p => ({ ...p, frequency: e.target.value }))}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                  {['Daily', 'Weekly', 'Monthly', 'Quarterly'].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email To</label>
                <input type="email" value={scheduleForm.email} onChange={e => setScheduleForm(p => ({ ...p, email: e.target.value }))} placeholder="you@email.com"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Format</label>
                <div className="flex gap-2">
                  {['pdf', 'excel', 'csv'].map(f => (
                    <button key={f} onClick={() => setScheduleForm(p => ({ ...p, format: f }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors uppercase ${scheduleForm.format === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={addSchedule}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Schedule Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
