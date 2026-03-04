// ============================================================================
// ENTERPRISE REPORTS PAGE — PDF-Ready Financial Report Generation
// ============================================================================
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import MainLayout from '../../components/MainLayout';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import {
  PageTransition, AnimatedCard, AnimatedNumber, AnimatedTabs, GlassCard,
  Badge, Shimmer, EmptyState,
} from '../../components/enterprise/EnterpriseAnimationSystem';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import {
  FileText, Download, Calendar, Filter, Printer, Mail, Share2,
  TrendingUp, TrendingDown, DollarSign, PieChart as PieIcon,
  Clock, CheckCircle, AlertTriangle, BarChart3, Eye, Plus,
  FileSpreadsheet, FilePlus, ArrowRight, RefreshCw,
} from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#F97316'];

const REPORT_TYPES = [
  { id: 'executive', name: 'Executive Summary', icon: FileText, desc: 'High-level financial overview with KPIs', color: '#3B82F6' },
  { id: 'income-expense', name: 'Income & Expense', icon: BarChart3, desc: 'Detailed income vs expense analysis', color: '#10B981' },
  { id: 'investment', name: 'Investment Portfolio', icon: TrendingUp, desc: 'Portfolio performance & allocation', color: '#8B5CF6' },
  { id: 'debt', name: 'Debt Analysis', icon: AlertTriangle, desc: 'Debt breakdown & payoff progress', color: '#F59E0B' },
  { id: 'cashflow', name: 'Cash Flow', icon: DollarSign, desc: 'Monthly cash flow patterns', color: '#06B6D4' },
  { id: 'tax', name: 'Tax Summary', icon: FileSpreadsheet, desc: 'Tax-ready income & deduction summary', color: '#EC4899' },
  { id: 'full', name: 'Full Financial Report', icon: FilePlus, desc: 'Comprehensive report across all areas', color: '#F97316' },
];

const PERIOD_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom Range' },
];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: ₹{typeof entry.value === 'number' ? entry.value.toLocaleString('en-IN') : entry.value}
        </p>
      ))}
    </div>
  );
}

// ── Report Card ──
function ReportTypeCard({ report, isSelected, onSelect }) {
  const Icon = report.icon;
  return (
    <button onClick={() => onSelect(report.id)}
      className={`p-4 rounded-xl border-2 text-left transition-all ${
        isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${report.color}15` }}>
          <Icon size={18} style={{ color: report.color }} />
        </div>
        <div className="flex-1">
          <h4 className={`text-sm font-semibold ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-white'}`}>{report.name}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{report.desc}</p>
        </div>
        {isSelected && <CheckCircle size={18} className="text-blue-500 flex-shrink-0" />}
      </div>
    </button>
  );
}

// ── Generated Report Preview ──
function ReportPreview({ reportData, reportType }) {
  if (!reportData) return null;

  const kpis = reportData.kpis || reportData.executiveSummary?.kpis || {};

  return (
    <div className="space-y-6">
      {/* KPIs */}
      {kpis && Object.keys(kpis).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(kpis).slice(0, 8).map(([key, value], i) => (
            <AnimatedCard key={key} className="p-4 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mb-1">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {typeof value === 'number' ? `₹${value.toLocaleString('en-IN')}` : String(value)}
              </p>
            </AnimatedCard>
          ))}
        </div>
      )}

      {/* Charts based on report type */}
      {reportData.periods && reportData.periods.length > 0 && (
        <AnimatedCard className="p-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">CASH FLOW TREND</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.periods}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<ChartTooltip />} />
              <Legend />
              <Bar dataKey="inflow" fill="#10B981" radius={[4, 4, 0, 0]} name="Inflow" />
              <Bar dataKey="outflow" fill="#EF4444" radius={[4, 4, 0, 0]} name="Outflow" />
            </BarChart>
          </ResponsiveContainer>
        </AnimatedCard>
      )}

      {/* Category breakdown */}
      {reportData.expenses?.categories && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatedCard className="p-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">EXPENSE CATEGORIES</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={Object.entries(reportData.expenses.categories).map(([name, val]) => ({
                  name, value: typeof val === 'object' ? val.total || 0 : val
                }))} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {Object.keys(reportData.expenses.categories).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </AnimatedCard>

          <AnimatedCard className="p-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">CATEGORY DETAILS</h3>
            <div className="space-y-2 max-h-[250px] overflow-auto">
              {Object.entries(reportData.expenses.categories).map(([name, val], i) => {
                const amount = typeof val === 'object' ? val.total || 0 : val;
                return (
                  <div key={name} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">₹{amount.toLocaleString('en-IN')}</span>
                  </div>
                );
              })}
            </div>
          </AnimatedCard>
        </div>
      )}

      {/* Recommendations */}
      {reportData.recommendations && reportData.recommendations.length > 0 && (
        <AnimatedCard className="p-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">AI RECOMMENDATIONS</h3>
          <div className="space-y-2">
            {reportData.recommendations.map((rec, i) => (
              <div key={i} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-700 dark:text-gray-300">
                {typeof rec === 'string' ? rec : rec.text || rec.description || JSON.stringify(rec)}
              </div>
            ))}
          </div>
        </AnimatedCard>
      )}
    </div>
  );
}

// ============================================================================
// MAIN
// ============================================================================
export default function EnterpriseReports() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState('executive');
  const [period, setPeriod] = useState('monthly');
  const [reportData, setReportData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [previousReports, setPreviousReports] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const printRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [txRes] = await Promise.allSettled([
          api.get('/financial/transactions'),
        ]);
        setTransactions(txRes.status === 'fulfilled' ? (txRes.value?.data?.transactions || txRes.value?.data || []) : []);

        // Load saved reports from localStorage
        try {
          const saved = JSON.parse(localStorage.getItem('enterprise_reports') || '[]');
          setPreviousReports(saved);
        } catch {}
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const generateReport = useCallback(async () => {
    setGenerating(true);
    try {
      // Try API first
      const res = await api.post('/enterprise/reports/generate', {
        type: selectedType,
        period,
        options: { includeCharts: true, includeRecommendations: true },
      });
      if (res?.data?.report) {
        setReportData(res.data.report);
      } else {
        throw new Error('No report data');
      }
    } catch {
      // Fallback: generate locally from transactions
      const expenses = transactions.filter(t => (t.amount || 0) < 0);
      const income = transactions.filter(t => (t.amount || 0) > 0);
      const totalIncome = income.reduce((s, t) => s + Math.abs(t.amount), 0);
      const totalExpenses = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);

      const categoryMap = {};
      expenses.forEach(t => {
        const cat = t.category || 'Uncategorized';
        categoryMap[cat] = (categoryMap[cat] || 0) + Math.abs(t.amount);
      });

      const monthlyData = {};
      transactions.forEach(t => {
        const m = new Date(t.date).toISOString().slice(0, 7);
        if (!monthlyData[m]) monthlyData[m] = { inflow: 0, outflow: 0 };
        if ((t.amount || 0) > 0) monthlyData[m].inflow += Math.abs(t.amount);
        else monthlyData[m].outflow += Math.abs(t.amount);
      });

      const periods = Object.entries(monthlyData).sort(([a], [b]) => a.localeCompare(b))
        .map(([period, data]) => ({ period, ...data, net: data.inflow - data.outflow }));

      setReportData({
        kpis: {
          totalIncome, totalExpenses,
          netSavings: totalIncome - totalExpenses,
          savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) + '%' : '0%',
          transactionCount: transactions.length,
          avgExpense: expenses.length > 0 ? Math.round(totalExpenses / expenses.length) : 0,
          topCategory: Object.entries(categoryMap).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A',
          categoryCount: Object.keys(categoryMap).length,
        },
        expenses: { categories: categoryMap, total: totalExpenses },
        income: { total: totalIncome },
        periods,
        recommendations: [
          totalExpenses > totalIncome ? '⚠️ Your expenses exceed income. Review discretionary spending.' : '✅ Positive cash flow this period.',
          `📊 Top spending category: ${Object.entries(categoryMap).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A'}`,
          '💡 Consider automating savings via SIP to ensure consistent investing.',
          '🎯 Set specific budget limits for top 3 spending categories.',
        ],
      });
    }

    // Save to history
    const newReport = {
      id: Date.now(),
      type: selectedType,
      period,
      date: new Date().toISOString(),
      name: REPORT_TYPES.find(r => r.id === selectedType)?.name || selectedType,
    };
    setPreviousReports(prev => {
      const updated = [newReport, ...prev].slice(0, 20);
      localStorage.setItem('enterprise_reports', JSON.stringify(updated));
      return updated;
    });

    setGenerating(false);
    setActiveTab(1); // Switch to preview tab
  }, [selectedType, period, transactions]);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${selectedType}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const tabs = ['Generate', 'Preview', 'History'];

  if (loading) {
    return (
      <MainLayout title="Reports" subtitle="Loading...">
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <Shimmer key={i} className="h-40 rounded-xl" />)}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Reports" subtitle="Professional Financial Report Generation">
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Reports</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Generate professional-grade financial reports</p>
            </div>
            {reportData && (
              <div className="flex gap-2">
                <button onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm">
                  <Printer size={16} /> Print
                </button>
                <button onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                  <Download size={16} /> Export
                </button>
              </div>
            )}
          </div>

          <AnimatedTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

          {/* Generate Tab */}
          {activeTab === 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Report Type Selection */}
              <div className="lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Select Report Type</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {REPORT_TYPES.map(report => (
                    <ReportTypeCard key={report.id} report={report}
                      isSelected={selectedType === report.id} onSelect={setSelectedType} />
                  ))}
                </div>
              </div>

              {/* Configuration */}
              <div className="space-y-6">
                <GlassCard className="p-6">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">REPORT SETTINGS</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Period</label>
                      <select value={period} onChange={e => setPeriod(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-2.5 text-sm">
                        {PERIOD_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="pt-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Data Available</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="info">{transactions.length} transactions</Badge>
                      </div>
                    </div>
                  </div>

                  <button onClick={generateReport} disabled={generating}
                    className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium">
                    {generating ? (
                      <><RefreshCw size={16} className="animate-spin" /> Generating...</>
                    ) : (
                      <><FilePlus size={16} /> Generate Report</>
                    )}
                  </button>
                </GlassCard>

                <GlassCard className="p-6">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">QUICK TIPS</h3>
                  <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                    <p>📊 Executive Summary is best for a quick overview</p>
                    <p>📈 Use Cash Flow for monthly pattern analysis</p>
                    <p>🏷️ Full Report combines all sections</p>
                    <p>🖨️ Reports are print-optimized for PDF export</p>
                  </div>
                </GlassCard>
              </div>
            </div>
          )}

          {/* Preview Tab */}
          {activeTab === 1 && (
            <div ref={printRef}>
              {reportData ? (
                <ReportPreview reportData={reportData} reportType={selectedType} />
              ) : (
                <EmptyState icon={<FileText size={48} />} title="No Report Generated"
                  description='Go to the "Generate" tab to create a financial report.' />
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 2 && (
            <div>
              {previousReports.length > 0 ? (
                <div className="space-y-3">
                  {previousReports.map((report, i) => (
                    <AnimatedCard key={report.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                          <FileText size={18} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-800 dark:text-white">{report.name}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(report.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            {' · '}{report.period}
                          </p>
                        </div>
                      </div>
                      <Badge variant="default">{report.type}</Badge>
                    </AnimatedCard>
                  ))}
                </div>
              ) : (
                <EmptyState icon={<Clock size={48} />} title="No Previous Reports"
                  description="Generated reports will appear here for quick access." />
              )}
            </div>
          )}
        </div>
      </PageTransition>
    </MainLayout>
  );
}
