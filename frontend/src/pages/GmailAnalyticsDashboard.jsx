// ============================================================
// Gmail Analytics Dashboard — AI-powered insights from financial emails
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import MainLayout from '../components/MainLayout';
import gmailEnhancedService from '../services/gmailEnhancedService';
import {
  BarChart2, TrendingUp, TrendingDown, DollarSign, Mail, PieChart,
  AlertCircle, Loader2, RefreshCw, Calendar, Download, CreditCard,
  Building2, Zap, Shield, FileText, Clock, CheckCircle, Target,
  ArrowUpRight, ArrowDownRight, Activity, Brain, Sparkles, IndianRupee,
  ChevronDown, Eye
} from 'lucide-react';
import { PieChart as RePie, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, AreaChart, Area } from 'recharts';

const GmailAnalyticsDashboard = () => {
  const { mode } = useTheme();
  const dk = mode === 'dark' || mode === 'black';

  const [analytics, setAnalytics] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(90);
  const [activeTab, setActiveTab] = useState('overview');

  const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#14B8A6', '#F97316', '#6366F1'];

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [analyticsRes, reportRes] = await Promise.allSettled([
        gmailEnhancedService.getAnalytics(days),
        gmailEnhancedService.getReport(days),
      ]);

      if (analyticsRes.status === 'fulfilled') {
        setAnalytics(analyticsRes.value.data?.data || analyticsRes.value.data);
      }
      if (reportRes.status === 'fulfilled') {
        setReport(reportRes.value.data?.data || reportRes.value.data);
      }
    } catch (err) {
      console.error('Analytics error:', err);
      setError('Failed to load analytics. Please sync Gmail first.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  const handleRunAnalysis = async () => {
    try {
      setAnalyzing(true);
      setError(null);
      await gmailEnhancedService.runAnalysis(days);
      await loadAnalytics();
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const fmt = (amount) => {
    if (!amount && amount !== 0) return '₹0';
    const abs = Math.abs(amount);
    if (abs >= 10000000) return `₹${(abs / 10000000).toFixed(1)}Cr`;
    if (abs >= 100000) return `₹${(abs / 100000).toFixed(1)}L`;
    if (abs >= 1000) return `₹${(abs / 1000).toFixed(0)}K`;
    return `₹${abs.toLocaleString('en-IN')}`;
  };

  const cardCls = dk ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-gray-200';
  const textPrimary = dk ? 'text-white' : 'text-gray-900';
  const textSecondary = dk ? 'text-slate-400' : 'text-gray-500';
  const gridStroke = dk ? '#334155' : '#e2e8f0';

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart2 },
    { key: 'categories', label: 'Categories', icon: PieChart },
    { key: 'trends', label: 'Trends', icon: TrendingUp },
    { key: 'insights', label: 'AI Insights', icon: Brain },
    { key: 'report', label: 'Report', icon: FileText },
  ];

  if (loading) {
    return (
      <MainLayout title="Gmail Analytics" subtitle="AI-powered financial email analysis">
        <div className="flex items-center justify-center py-20">
          <Loader2 className={`w-8 h-8 animate-spin ${dk ? 'text-blue-400' : 'text-blue-500'}`} />
          <span className={`ml-3 ${textSecondary}`}>Loading analytics...</span>
        </div>
      </MainLayout>
    );
  }

  // Prepare chart data
  const categoryData = analytics?.categoryBreakdown
    ? Object.entries(analytics.categoryBreakdown).map(([name, data]) => ({
        name: name.replace(/_/g, ' '),
        count: typeof data === 'number' ? data : data.count || 0,
        amount: typeof data === 'number' ? 0 : data.totalAmount || data.amount || 0,
      })).filter(d => d.count > 0).sort((a, b) => b.count - a.count)
    : [];

  const monthlyData = analytics?.monthlyTrends
    ? Object.entries(analytics.monthlyTrends).map(([month, data]) => ({
        month: month.length > 7 ? month : new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        credits: typeof data === 'number' ? 0 : data.credits || data.totalCredits || 0,
        debits: typeof data === 'number' ? 0 : data.debits || data.totalDebits || 0,
        count: typeof data === 'number' ? data : data.count || 0,
      }))
    : [];

  const senderData = analytics?.topSenders
    ? (Array.isArray(analytics.topSenders) ? analytics.topSenders : Object.entries(analytics.topSenders).map(([name, count]) => ({ name, count })))
        .slice(0, 10)
    : [];

  return (
    <MainLayout
      title="Gmail Analytics"
      subtitle="AI-powered financial email analysis"
      headerActions={
        <div className="flex items-center gap-2">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}
            className={`px-3 py-2 rounded-lg border text-sm ${dk ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 6 months</option>
            <option value={365}>Last year</option>
          </select>
          <button onClick={handleRunAnalysis} disabled={analyzing}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-lg text-sm font-semibold shadow-md disabled:opacity-50">
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {analyzing ? 'Analyzing...' : 'Run AI Analysis'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${dk ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}`}>
            <AlertCircle className="w-5 h-5" /><span className="text-sm">{error}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className={`flex overflow-x-auto gap-1 p-1 rounded-xl border ${dk ? 'bg-slate-800/60 border-slate-700/50' : 'bg-gray-100 border-gray-200'}`}>
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === key
                  ? (dk ? 'bg-blue-500/20 text-blue-400 shadow' : 'bg-white text-blue-700 shadow')
                  : (dk ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')
              }`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Total Emails', value: analytics?.totalEmails || 0, icon: Mail, color: 'blue', change: null },
                { label: 'Total Credits', value: fmt(analytics?.totalCredits || 0), icon: ArrowDownRight, color: 'green', change: analytics?.creditTrend },
                { label: 'Total Debits', value: fmt(analytics?.totalDebits || 0), icon: ArrowUpRight, color: 'red', change: analytics?.debitTrend },
                { label: 'Net Flow', value: fmt((analytics?.totalCredits || 0) - (analytics?.totalDebits || 0)), icon: Activity, color: 'purple', change: null },
                { label: 'Categories', value: categoryData.length, icon: PieChart, color: 'orange', change: null },
                { label: 'AI Score', value: analytics?.aiScore ? `${analytics.aiScore}/100` : 'N/A', icon: Brain, color: 'teal', change: null },
              ].map(({ label, value, icon: Icon, color, change }) => (
                <div key={label} className={`p-4 rounded-xl border ${cardCls}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-lg bg-${color}-500/10`}><Icon className={`w-4 h-4 text-${color}-500`} /></div>
                    <span className={`text-xs font-medium ${textSecondary}`}>{label}</span>
                  </div>
                  <div className={`text-xl font-bold ${textPrimary}`}>{value}</div>
                  {change != null && (
                    <div className={`text-xs mt-1 flex items-center gap-1 ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(change).toFixed(1)}% vs prev period
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Monthly Trend */}
              <div className={`p-5 rounded-xl border ${cardCls}`}>
                <h3 className={`text-sm font-semibold mb-4 ${textPrimary}`}>Monthly Income vs Expenses</h3>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: dk ? '#94a3b8' : '#64748b' }} />
                      <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11, fill: dk ? '#94a3b8' : '#64748b' }} />
                      <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} contentStyle={{ backgroundColor: dk ? '#1e293b' : '#fff', border: 'none', borderRadius: 8 }} />
                      <Legend />
                      <Area type="monotone" dataKey="credits" name="Credits" stroke="#10B981" fill="#10B98130" strokeWidth={2} />
                      <Area type="monotone" dataKey="debits" name="Debits" stroke="#EF4444" fill="#EF444430" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={`flex items-center justify-center h-[280px] ${textSecondary}`}>No monthly data available</div>
                )}
              </div>

              {/* Category Pie */}
              <div className={`p-5 rounded-xl border ${cardCls}`}>
                <h3 className={`text-sm font-semibold mb-4 ${textPrimary}`}>Email Categories</h3>
                {categoryData.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={280}>
                      <RePie>
                        <Pie data={categoryData} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={2}>
                          {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </RePie>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {categoryData.slice(0, 8).map((cat, i) => (
                        <div key={cat.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className={`text-xs flex-1 truncate capitalize ${textSecondary}`}>{cat.name}</span>
                          <span className={`text-xs font-semibold ${textPrimary}`}>{cat.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={`flex items-center justify-center h-[280px] ${textSecondary}`}>No category data available</div>
                )}
              </div>
            </div>

            {/* Top Senders */}
            {senderData.length > 0 && (
              <div className={`p-5 rounded-xl border ${cardCls}`}>
                <h3 className={`text-sm font-semibold mb-4 ${textPrimary}`}>Top Email Senders</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={senderData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: dk ? '#94a3b8' : '#64748b' }} />
                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 10, fill: dk ? '#94a3b8' : '#64748b' }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Emails" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* ── CATEGORIES TAB ── */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryData.map((cat, i) => {
                const icons = { banking: Building2, credit_card: CreditCard, upi: Zap, investment: TrendingUp, insurance: Shield, tax: FileText, salary: DollarSign, emi: IndianRupee };
                const CatIcon = icons[cat.name.replace(/ /g, '_')] || Mail;
                return (
                  <div key={cat.name} className={`p-5 rounded-xl border ${cardCls}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${COLORS[i % COLORS.length]}20` }}>
                        <CatIcon className="w-5 h-5" style={{ color: COLORS[i % COLORS.length] }} />
                      </div>
                      <div>
                        <h3 className={`text-sm font-semibold capitalize ${textPrimary}`}>{cat.name}</h3>
                        <span className={`text-xs ${textSecondary}`}>{cat.count} emails</span>
                      </div>
                    </div>
                    {cat.amount > 0 && (
                      <div className={`text-lg font-bold ${textPrimary}`}>{fmt(cat.amount)}</div>
                    )}
                    <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${Math.min(100, (cat.count / Math.max(...categoryData.map(c => c.count))) * 100)}%`,
                        backgroundColor: COLORS[i % COLORS.length]
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {categoryData.length === 0 && (
              <div className={`text-center py-16 ${textSecondary}`}>
                <PieChart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No category data. Run AI analysis to categorize your emails.</p>
              </div>
            )}
          </div>
        )}

        {/* ── TRENDS TAB ── */}
        {activeTab === 'trends' && (
          <div className="space-y-4">
            {monthlyData.length > 0 ? (
              <>
                <div className={`p-5 rounded-xl border ${cardCls}`}>
                  <h3 className={`text-sm font-semibold mb-4 ${textPrimary}`}>Email Volume Over Time</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: dk ? '#94a3b8' : '#64748b' }} />
                      <YAxis tick={{ fontSize: 11, fill: dk ? '#94a3b8' : '#64748b' }} />
                      <Tooltip contentStyle={{ backgroundColor: dk ? '#1e293b' : '#fff', border: 'none', borderRadius: 8 }} />
                      <Legend />
                      <Line type="monotone" dataKey="count" name="Emails" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className={`p-5 rounded-xl border ${cardCls}`}>
                  <h3 className={`text-sm font-semibold mb-4 ${textPrimary}`}>Cash Flow Trend</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: dk ? '#94a3b8' : '#64748b' }} />
                      <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11, fill: dk ? '#94a3b8' : '#64748b' }} />
                      <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} contentStyle={{ backgroundColor: dk ? '#1e293b' : '#fff', border: 'none', borderRadius: 8 }} />
                      <Legend />
                      <Bar dataKey="credits" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="debits" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className={`text-center py-16 ${textSecondary}`}>
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No trend data available. Sync more emails to see trends.</p>
              </div>
            )}
          </div>
        )}

        {/* ── AI INSIGHTS TAB ── */}
        {activeTab === 'insights' && (
          <div className="space-y-4">
            {analytics?.insights?.length > 0 || analytics?.recommendations?.length > 0 || analytics?.anomalies?.length > 0 ? (
              <>
                {/* Anomalies */}
                {analytics.anomalies?.length > 0 && (
                  <div className={`p-5 rounded-xl border ${dk ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
                    <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${dk ? 'text-red-400' : 'text-red-700'}`}>
                      <AlertCircle className="w-4 h-4" />Anomalies Detected ({analytics.anomalies.length})
                    </h3>
                    <div className="space-y-2">
                      {analytics.anomalies.map((a, i) => (
                        <div key={i} className={`p-3 rounded-lg ${dk ? 'bg-slate-800/60' : 'bg-white'}`}>
                          <p className={`text-sm ${textPrimary}`}>{a.description || a.message || JSON.stringify(a)}</p>
                          {a.amount && <span className="text-xs text-red-500 font-semibold">{fmt(a.amount)}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Insights */}
                {analytics.insights?.length > 0 && (
                  <div className={`p-5 rounded-xl border ${cardCls}`}>
                    <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${dk ? 'text-blue-400' : 'text-blue-700'}`}>
                      <Brain className="w-4 h-4" />AI Insights ({analytics.insights.length})
                    </h3>
                    <div className="space-y-3">
                      {analytics.insights.map((insight, i) => (
                        <div key={i} className={`p-4 rounded-lg border-l-4 ${
                          insight.type === 'warning' ? 'border-l-orange-500' :
                          insight.type === 'positive' ? 'border-l-green-500' : 'border-l-blue-500'
                        } ${dk ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                          <p className={`text-sm font-medium ${textPrimary}`}>{insight.title || insight.message || insight}</p>
                          {insight.description && <p className={`text-xs mt-1 ${textSecondary}`}>{insight.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {analytics.recommendations?.length > 0 && (
                  <div className={`p-5 rounded-xl border ${dk ? 'bg-green-500/5 border-green-500/20' : 'bg-green-50 border-green-200'}`}>
                    <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${dk ? 'text-green-400' : 'text-green-700'}`}>
                      <Target className="w-4 h-4" />Recommendations ({analytics.recommendations.length})
                    </h3>
                    <div className="space-y-2">
                      {analytics.recommendations.map((rec, i) => (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${dk ? 'bg-slate-800/60' : 'bg-white'}`}>
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <p className={`text-sm ${textPrimary}`}>{rec.message || rec.text || rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className={`text-center py-16 ${textSecondary}`}>
                <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="mb-4">No AI insights yet. Click "Run AI Analysis" to generate insights.</p>
                <button onClick={handleRunAnalysis} disabled={analyzing}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium">
                  {analyzing ? 'Analyzing...' : 'Run AI Analysis'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── REPORT TAB ── */}
        {activeTab === 'report' && (
          <div className="space-y-4">
            {report ? (
              <div className={`p-6 rounded-xl border ${cardCls}`}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className={`text-lg font-bold ${textPrimary}`}>{report.title || 'Gmail Financial Report'}</h3>
                    <p className={`text-sm ${textSecondary}`}>
                      Generated {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString('en-IN') : 'Now'} • {days}-day analysis
                    </p>
                  </div>
                </div>

                {/* Executive Summary */}
                {report.summary && (
                  <div className={`p-4 rounded-xl mb-4 ${dk ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                    <h4 className={`text-sm font-semibold mb-2 ${dk ? 'text-blue-400' : 'text-blue-700'}`}>Executive Summary</h4>
                    <p className={`text-sm leading-relaxed ${textPrimary}`}>{report.summary}</p>
                  </div>
                )}

                {/* Report Sections */}
                {report.sections?.map((section, i) => (
                  <div key={i} className={`mb-4 p-4 rounded-xl border ${dk ? 'border-slate-700/50' : 'border-gray-200'}`}>
                    <h4 className={`text-sm font-semibold mb-2 ${textPrimary}`}>{section.title}</h4>
                    <p className={`text-sm leading-relaxed ${dk ? 'text-slate-300' : 'text-gray-700'}`}>{section.content}</p>
                    {section.metrics && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                        {Object.entries(section.metrics).map(([key, val]) => (
                          <div key={key}>
                            <span className={`text-xs ${textSecondary}`}>{key.replace(/_/g, ' ')}</span>
                            <p className={`text-sm font-semibold ${textPrimary}`}>{typeof val === 'number' ? fmt(val) : val}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Narrative Report */}
                {report.narrative && (
                  <div className={`p-4 rounded-xl ${dk ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                    <h4 className={`text-sm font-semibold mb-2 ${textPrimary}`}>Detailed Narrative</h4>
                    <div className={`text-sm leading-relaxed whitespace-pre-wrap ${dk ? 'text-slate-300' : 'text-gray-700'}`}>
                      {report.narrative}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={`text-center py-16 ${textSecondary}`}>
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="mb-4">No report generated yet. Run AI analysis first.</p>
                <button onClick={handleRunAnalysis} disabled={analyzing}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium">
                  {analyzing ? 'Analyzing...' : 'Generate Report'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default GmailAnalyticsDashboard;
