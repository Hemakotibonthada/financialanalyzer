import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  DollarSign, TrendingUp, TrendingDown, Calendar, FileText, PieChart,
  Download, Filter, Plus, Edit, Trash2, Eye, Search, X, ChevronDown,
  ChevronUp, BarChart3, ArrowUpRight, ArrowDownRight, Building2,
  Briefcase, Clock, Tag, CreditCard, Receipt, Users, AlertCircle,
  CheckCircle2, XCircle, RefreshCw, Layers, MoreHorizontal,
  ArrowLeft, ArrowRight, Sparkles, Zap, Target, Activity, Globe,
  Upload, Paperclip, Hash, LayoutGrid, List, SlidersHorizontal,
  Wallet, CalendarDays, FileBarChart, Repeat, Boxes, ClipboardList, Banknote
} from 'lucide-react';
import MainLayout from '../components/MainLayout';
import api from '../services/api';
import { toast } from 'react-toastify';
import ExpenseFormModal from '../components/ExpenseFormModal';
import BillOfMaterials from './BillOfMaterials';
import FundsInvestments from './FundsInvestments';
import BudgetPlanner from './BudgetPlanner';
import CashFlowForecast from './CashFlowForecast';
import IncomeTracker from './IncomeTracker';
import RecurringPayments from './RecurringPayments';
import SubscriptionManager from './SubscriptionManager';
import SplitExpenses from './SplitExpenses';
import { extractPasswordFromResponse, downloadFileWithPassword } from '../utils/documentPasswordNotification';

/* ─── Animated Counter ──────────────────────────────────────────────────── */
const AnimatedNumber = ({ value, prefix = '', suffix = '', duration = 1200 }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (typeof value !== 'number' || isNaN(value)) { setDisplay(0); return; }
    let start = 0;
    const step = (ts) => {
      if (!start) start = ts;
      const prog = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - prog, 3);
      setDisplay(Math.floor(ease * value));
      if (prog < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, duration]);
  return <span>{prefix}{display.toLocaleString('en-IN')}{suffix}</span>;
};

/* ─── Progress Ring ─────────────────────────────────────────────────────── */
const ProgressRing = ({ percent = 0, size = 44, stroke = 3.5, color = '#6366f1' }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(percent, 100) / 100) * c;
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke}
        className="text-gray-200 dark:text-slate-700" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        className="transition-all duration-1000 ease-out" />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
        className="text-[10px] font-bold fill-current">{Math.round(percent)}%</text>
    </svg>
  );
};

/* ─── Sparkline ─────────────────────────────────────────────────────────── */
const Sparkline = ({ data = [], color = '#6366f1', width = 100, height = 32 }) => {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / Math.max(data.length - 1, 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ');
  const id = `sp-${color.replace('#','')}`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.3"/><stop offset="100%" stopColor={color} stopOpacity="0"/>
      </linearGradient></defs>
      <polygon points={`0,${height} ${pts} ${width},${height}`} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* ─── Constants ─────────────────────────────────────────────────────────── */
const CATEGORIES = [
  'Office Supplies','Equipment & Hardware','Software & Subscriptions',
  'Marketing & Advertising','Travel & Transportation','Meals & Entertainment',
  'Utilities','Rent & Facilities','Salaries & Wages','Professional Services',
  'Training & Development','Insurance','Taxes & Licenses','Communication',
  'Maintenance & Repairs','Inventory & Raw Materials','Shipping & Delivery',
  'Legal & Compliance','Banking & Finance Charges','Miscellaneous'
];
const DEPARTMENTS = [
  'General','Sales','Marketing','Engineering','Operations',
  'Human Resources','Finance','Legal','Customer Support',
  'Research & Development','IT','Administration'
];
const STATUS_CFG = {
  Paid:             { icon: CheckCircle2, bg:'bg-emerald-50 dark:bg-emerald-500/10', text:'text-emerald-700 dark:text-emerald-400', border:'border-emerald-200 dark:border-emerald-500/20' },
  Pending:          { icon: Clock,        bg:'bg-amber-50 dark:bg-amber-500/10',     text:'text-amber-700 dark:text-amber-400',     border:'border-amber-200 dark:border-amber-500/20' },
  'Partially Paid': { icon: Activity,     bg:'bg-blue-50 dark:bg-blue-500/10',       text:'text-blue-700 dark:text-blue-400',       border:'border-blue-200 dark:border-blue-500/20' },
  Overdue:          { icon: AlertCircle,  bg:'bg-red-50 dark:bg-red-500/10',         text:'text-red-700 dark:text-red-400',         border:'border-red-200 dark:border-red-500/20' },
  Cancelled:        { icon: XCircle,      bg:'bg-gray-50 dark:bg-gray-500/10',       text:'text-gray-600 dark:text-gray-400',       border:'border-gray-200 dark:border-gray-500/20' },
  Refunded:         { icon: RefreshCw,    bg:'bg-purple-50 dark:bg-purple-500/10',   text:'text-purple-700 dark:text-purple-400',   border:'border-purple-200 dark:border-purple-500/20' },
};
const CAT_COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#ec4899','#f97316','#14b8a6','#84cc16','#a855f7','#0ea5e9','#e11d48','#d946ef','#22c55e','#eab308','#64748b','#fb923c','#2dd4bf','#6b7280'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ═══════════════════════════════════════════════════════════════════════════
const CompanyExpensesDashboard = () => {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;

  const [activeTab, setActiveTab] = useState('dashboard');
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [dashSummary, setDashSummary] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [topVendors, setTopVendors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [detailExpense, setDetailExpense] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('expenseDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    category: '', department: '', paymentStatus: '', project: '', search: ''
  });

  // palette
  const p = useMemo(() => ({
    bg:        isBlack ? 'bg-black' : dk ? 'bg-slate-950' : 'bg-gray-50',
    card:      isBlack ? 'bg-zinc-900 border-zinc-800' : dk ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-gray-200/80',
    cardHover: isBlack ? 'hover:bg-zinc-800/80' : dk ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50',
    glass:     isBlack ? 'bg-zinc-900/80 backdrop-blur-xl border-zinc-800' : dk ? 'bg-slate-800/60 backdrop-blur-xl border-slate-700/40' : 'bg-white/80 backdrop-blur-xl border-gray-200/60',
    text:      isBlack ? 'text-zinc-100' : dk ? 'text-slate-100' : 'text-gray-900',
    textSub:   isBlack ? 'text-zinc-400' : dk ? 'text-slate-400' : 'text-gray-500',
    textMuted: isBlack ? 'text-zinc-500' : dk ? 'text-slate-500' : 'text-gray-400',
    border:    isBlack ? 'border-zinc-800' : dk ? 'border-slate-700/50' : 'border-gray-200/80',
    input:     isBlack ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : dk ? 'bg-slate-700/50 border-slate-600/50 text-slate-100' : 'bg-white border-gray-300 text-gray-900',
  }), [dk, isBlack]);

  /* ── Data fetch ── */
  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const qp = new URLSearchParams();
      Object.entries(filters).forEach(([k,v]) => { if (v) qp.append(k, v); });
      qp.append('page', currentPage); qp.append('limit', 20);
      qp.append('sortBy', sortBy); qp.append('sortOrder', sortOrder);

      const [expR, anaR, sumR, catR, dptR, trnR, venR] = await Promise.allSettled([
        api.get(`/company-expenses?${qp}`),
        api.get(`/company-expenses/analytics?startDate=${filters.startDate}&endDate=${filters.endDate}`),
        api.get('/company-expenses/dashboard/summary'),
        api.get(`/company-expenses/analytics/by-category?startDate=${filters.startDate}&endDate=${filters.endDate}`),
        api.get(`/company-expenses/analytics/by-department?startDate=${filters.startDate}&endDate=${filters.endDate}`),
        api.get('/company-expenses/analytics/monthly-trend?months=12'),
        api.get('/company-expenses/analytics/top-vendors?limit=10'),
      ]);
      if (expR.status==='fulfilled') { const d=expR.value.data; setExpenses(d.data?.expenses||d.expenses||[]); const pg=d.data?.pagination; if(pg) setTotalPages(pg.pages||1); }
      if (anaR.status==='fulfilled') setAnalytics(anaR.value.data);
      if (sumR.status==='fulfilled') setDashSummary(sumR.value.data?.data);
      if (catR.status==='fulfilled') setCategoryData(catR.value.data?.data||[]);
      if (dptR.status==='fulfilled') setDepartmentData(dptR.value.data?.data||[]);
      if (trnR.status==='fulfilled') setMonthlyTrend(trnR.value.data?.data||[]);
      if (venR.status==='fulfilled') setTopVendors(venR.value.data?.data||[]);
    } catch(e){ console.error(e); toast.error('Failed to load data'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [filters, currentPage, sortBy, sortOrder]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Handlers ── */
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense permanently?')) return;
    try { await api.delete(`/company-expenses/${id}`); toast.success('Deleted'); fetchAll(true); }
    catch { toast.error('Delete failed'); }
  };
  const handleExport = async (format) => {
    try {
      toast.info(`Generating ${format.toUpperCase()} report...`);
      const res = await api.post('/company-expenses/reports/generate',
        { startDate: filters.startDate, endDate: filters.endDate, format, includeCharts: true },
        { responseType: 'blob' });
      const pw = extractPasswordFromResponse(res);
      downloadFileWithPassword(new Blob([res.data]), `expense-report-${Date.now()}.${format==='pdf'?'pdf':'xlsx'}`, pw);
      toast.success('Report generated!');
    } catch { toast.error('Export failed'); }
  };
  const fmt = (v) => new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 }).format(v||0);
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
  const openAdd = () => { setSelectedExpense(null); setShowModal(true); };
  const openEdit = (e) => { setSelectedExpense(e); setShowModal(true); };
  const onSuccess = () => { setShowModal(false); setSelectedExpense(null); fetchAll(true); };

  /* ── Derived ── */
  const paidPct = analytics ? (analytics.paidAmount / (analytics.totalAmount || 1)) * 100 : 0;
  const monthlyChange = useMemo(() => {
    if (!dashSummary) return 0;
    const cur = dashSummary.monthly?.amount || 0;
    const prev = dashSummary.lastMonth?.amount || 0;
    return prev ? ((cur - prev) / prev) * 100 : 0;
  }, [dashSummary]);
  const sparkData = useMemo(() => monthlyTrend.map(t => t.totalAmount || 0), [monthlyTrend]);

  const tabs = [
    { id:'dashboard', label:'Dashboard', icon: LayoutGrid },
    { id:'expenses',  label:'Expenses',  icon: Receipt },
    { id:'analytics', label:'Analytics', icon: BarChart3 },
    { id:'vendors',   label:'Vendors',   icon: Building2 },
    { id:'bom',       label:'Bill of Materials', icon: Layers },
    { id:'funds',     label:'Funds & Investments', icon: TrendingUp },
    { id:'budget',    label:'Budget', icon: ClipboardList },
    { id:'cashflow',  label:'Cash Flow', icon: Wallet },
    { id:'income',    label:'Income', icon: Banknote },
    { id:'recurring', label:'Recurring', icon: Repeat },
    { id:'subscriptions', label:'Subscriptions', icon: Boxes },
    { id:'split',     label:'Split Expenses', icon: Users },
  ];

  // ═════════ RENDER ═════════
  return (
    <MainLayout title="Company Expenses">
      <div className={`min-h-screen ${p.bg} transition-colors duration-300`}>
        {/* ── Sticky Header ── */}
        <div className={`sticky top-0 z-30 ${p.glass} border-b ${p.border} px-4 sm:px-6 py-4`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 flex-shrink-0">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`text-xl sm:text-2xl font-bold ${p.text} flex items-center gap-2`}>
                  Company Expenses
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white tracking-wide">PRO</span>
                </h1>
                <p className={`text-xs sm:text-sm ${p.textSub}`}>Track, analyze & manage business expenses</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={() => fetchAll(true)} title="Refresh"
                className={`p-2 sm:p-2.5 rounded-xl border ${p.border} ${p.card} ${p.cardHover} transition-all ${refreshing?'animate-spin':''}`}>
                <RefreshCw className={`w-4 h-4 ${p.textSub}`} />
              </button>
              {/* Export dropdown */}
              <div className="relative group">
                <button className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border ${p.border} ${p.card} ${p.cardHover} transition-all text-sm font-medium ${p.text}`}>
                  <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export</span> <ChevronDown className="w-3 h-3" />
                </button>
                <div className={`absolute right-0 mt-2 w-44 rounded-xl border ${p.border} ${p.card} shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden`}>
                  <button onClick={() => handleExport('pdf')} className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 ${p.cardHover} ${p.text}`}>
                    <FileText className="w-4 h-4 text-red-500" /> Export PDF
                  </button>
                  <button onClick={() => handleExport('excel')} className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 ${p.cardHover} ${p.text}`}>
                    <FileBarChart className="w-4 h-4 text-green-500" /> Export Excel
                  </button>
                </div>
              </div>
              <button onClick={openAdd}
                className="flex items-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-sm shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all">
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Expense</span>
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-1 mt-4 -mb-4 overflow-x-auto pb-px">
            {tabs.map(t => {
              const I = t.icon; const act = activeTab === t.id;
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all border-b-2
                    ${act ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5' : `border-transparent ${p.textSub} hover:text-indigo-500`}`}>
                  <I className="w-4 h-4" /> {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 sm:px-6 py-6 space-y-6">

          {/* ═══ DASHBOARD TAB ═══ */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {[
                  { label:'Total Expenses', value: analytics?.totalAmount||dashSummary?.total?.amount||0,
                    icon: DollarSign, grad:'from-indigo-500 to-blue-600', sh:'shadow-indigo-500/20',
                    sub:`${analytics?.expenseCount||dashSummary?.total?.count||0} transactions`,
                    spark: sparkData, sparkCol:'#6366f1' },
                  { label:'Paid Amount', value: analytics?.paidAmount||0,
                    icon: CheckCircle2, grad:'from-emerald-500 to-teal-600', sh:'shadow-emerald-500/20',
                    sub:`${Math.round(paidPct)}% of total`, ring: paidPct, ringCol:'#10b981' },
                  { label:'Pending', value: analytics?.pendingAmount||dashSummary?.pending?.amount||0,
                    icon: Clock, grad:'from-amber-500 to-orange-600', sh:'shadow-amber-500/20',
                    sub:`${dashSummary?.pending?.count||0} pending items`,
                    alert: (analytics?.pendingAmount||0) > 0 },
                  { label:'This Month', value: dashSummary?.monthly?.amount||0,
                    icon: CalendarDays, grad:'from-purple-500 to-pink-600', sh:'shadow-purple-500/20',
                    sub: monthlyChange ? `${monthlyChange>0?'↑':'↓'} ${Math.abs(monthlyChange).toFixed(1)}% vs last` : 'No change',
                    trend: monthlyChange },
                ].map((k,i) => (
                  <div key={i} className={`relative overflow-hidden rounded-2xl border ${p.border} ${p.card} p-5 group hover:shadow-lg ${k.sh} transition-all duration-300 hover:-translate-y-1`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${p.textSub}`}>{k.label}</p>
                        <p className={`text-2xl font-bold mt-1 ${p.text}`}><AnimatedNumber value={k.value} prefix="₹" /></p>
                        <p className={`text-xs mt-1.5 flex items-center gap-1 ${k.trend>0?'text-red-500':k.trend<0?'text-emerald-500':p.textMuted}`}>
                          {k.trend>0 && <ArrowUpRight className="w-3 h-3" />}
                          {k.trend<0 && <ArrowDownRight className="w-3 h-3" />}
                          {k.alert && <AlertCircle className="w-3 h-3 text-amber-500" />}
                          {k.sub}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${k.grad} flex items-center justify-center shadow-lg`}>
                          <k.icon className="w-5 h-5 text-white" />
                        </div>
                        {k.spark && <Sparkline data={k.spark} color={k.sparkCol} width={80} height={28} />}
                        {k.ring !== undefined && <ProgressRing percent={k.ring} color={k.ringCol} />}
                      </div>
                    </div>
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-[0.03] bg-gradient-to-br ${k.grad} pointer-events-none transition-opacity`} />
                  </div>
                ))}
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Monthly bars */}
                <div className={`lg:col-span-2 rounded-2xl border ${p.border} ${p.card} p-6`}>
                  <div className="flex items-center justify-between mb-5">
                    <div><h3 className={`text-lg font-semibold ${p.text}`}>Monthly Trend</h3><p className={`text-sm ${p.textSub}`}>Last 12 months</p></div>
                    <TrendingUp className={`w-4 h-4 ${p.textMuted}`} />
                  </div>
                  {monthlyTrend.length > 0 ? (
                    <div className="flex items-end gap-1.5 sm:gap-2 h-44">
                      {monthlyTrend.map((m,i) => {
                        const mx = Math.max(...monthlyTrend.map(t => t.totalAmount||0),1);
                        const h = ((m.totalAmount||0)/mx)*100;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1 group cursor-pointer">
                            <span className={`text-[9px] font-medium opacity-0 group-hover:opacity-100 transition-opacity ${p.textSub} whitespace-nowrap`}>{fmt(m.totalAmount)}</span>
                            <div className="w-full relative" style={{height:'130px'}}>
                              <div className="absolute bottom-0 w-full rounded-t-lg bg-gradient-to-t from-indigo-500 to-purple-400 opacity-75 hover:opacity-100 transition-all duration-500"
                                style={{height:`${Math.max(h,4)}%`}} />
                            </div>
                            <span className={`text-[9px] ${p.textMuted}`}>{m._id ? MONTHS[(m._id.month||1)-1] : ''}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : <div className={`h-44 flex items-center justify-center ${p.textMuted}`}><BarChart3 className="w-10 h-10 opacity-20" /></div>}
                </div>

                {/* Category breakdown */}
                <div className={`rounded-2xl border ${p.border} ${p.card} p-6`}>
                  <h3 className={`text-lg font-semibold ${p.text} mb-1`}>By Category</h3>
                  <p className={`text-sm ${p.textSub} mb-4`}>Distribution</p>
                  {categoryData.length > 0 ? (
                    <div className="space-y-3">
                      {categoryData.slice(0,6).map((c,i) => {
                        const tot = categoryData.reduce((s,x)=>s+(x.totalAmount||0),0)||1;
                        return (
                          <div key={i} className="group">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs font-medium ${p.text} truncate max-w-[120px]`}>{c._id}</span>
                              <span className={`text-xs ${p.textSub}`}>{fmt(c.totalAmount)}</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-1000" style={{width:`${(c.totalAmount||0)/tot*100}%`, backgroundColor: CAT_COLORS[i%CAT_COLORS.length]}} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <div className={`h-40 flex items-center justify-center ${p.textMuted}`}><PieChart className="w-10 h-10 opacity-20" /></div>}
                </div>
              </div>

              {/* Bottom row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Departments */}
                <div className={`rounded-2xl border ${p.border} ${p.card} p-6`}>
                  <h3 className={`text-lg font-semibold ${p.text} mb-4 flex items-center gap-2`}><Briefcase className="w-5 h-5 text-indigo-500" /> Departments</h3>
                  {departmentData.length > 0 ? departmentData.slice(0,6).map((d,i) => (
                    <div key={i} className={`flex items-center justify-between py-2 px-3 rounded-xl ${p.cardHover} transition-colors`}>
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor:CAT_COLORS[(i+5)%CAT_COLORS.length]}} /><span className={`text-sm ${p.text}`}>{d._id}</span></div>
                      <div><span className={`text-sm font-semibold ${p.text}`}>{fmt(d.totalAmount)}</span><span className={`text-xs ${p.textMuted} ml-1`}>({d.count})</span></div>
                    </div>
                  )) : <p className={`text-sm ${p.textMuted} text-center py-8`}>No data</p>}
                </div>

                {/* Recent */}
                <div className={`lg:col-span-2 rounded-2xl border ${p.border} ${p.card} p-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-semibold ${p.text} flex items-center gap-2`}><Clock className="w-5 h-5 text-purple-500" /> Recent</h3>
                    <button onClick={() => setActiveTab('expenses')} className="text-xs text-indigo-500 hover:text-indigo-400 font-medium">View All →</button>
                  </div>
                  {(dashSummary?.recentExpenses || expenses.slice(0,5)).length > 0 ? (dashSummary?.recentExpenses || expenses.slice(0,5)).map((exp,i) => {
                    const st = STATUS_CFG[exp.paymentStatus] || STATUS_CFG.Pending;
                    return (
                      <div key={i} className={`flex items-center gap-3 py-2.5 px-3 rounded-xl ${p.cardHover} transition-all cursor-pointer`} onClick={() => setDetailExpense(exp)}>
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10 flex items-center justify-center flex-shrink-0">
                          <Receipt className="w-4 h-4 text-indigo-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${p.text} truncate`}>{exp.description||exp.category}</p>
                          <p className={`text-xs ${p.textMuted}`}>{fmtDate(exp.expenseDate)} · {exp.vendor?.name||'—'}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-sm font-semibold ${p.text}`}>{fmt(exp.amountInINR)}</p>
                          <span className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full ${st.bg} ${st.text} border ${st.border}`}>{exp.paymentStatus}</span>
                        </div>
                      </div>
                    );
                  }) : <p className={`text-sm ${p.textMuted} text-center py-8`}>No recent expenses</p>}
                </div>
              </div>
            </div>
          )}

          {/* ═══ EXPENSES TAB ═══ */}
          {activeTab === 'expenses' && (
            <div className="space-y-5">
              {/* Filters */}
              <div className={`rounded-2xl border ${p.border} ${p.card} p-4 sm:p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 text-sm font-medium ${p.text}`}>
                    <SlidersHorizontal className="w-4 h-4 text-indigo-500" /> Filters
                    {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  <div className={`flex rounded-lg border ${p.border} overflow-hidden`}>
                    <button onClick={() => setViewMode('table')} className={`p-2 ${viewMode==='table'?'bg-indigo-500 text-white':p.textSub} transition-colors`}><List className="w-4 h-4" /></button>
                    <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode==='grid'?'bg-indigo-500 text-white':p.textSub} transition-colors`}><LayoutGrid className="w-4 h-4" /></button>
                  </div>
                </div>
                {showFilters && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 pt-3 border-t border-gray-100 dark:border-slate-700/50">
                    {[
                      { key:'startDate', label:'Start Date', type:'date' },
                      { key:'endDate',   label:'End Date',   type:'date' },
                      { key:'category',  label:'Category',   type:'select', opts: CATEGORIES },
                      { key:'department',label:'Department',  type:'select', opts: DEPARTMENTS },
                      { key:'paymentStatus', label:'Status',  type:'select', opts: Object.keys(STATUS_CFG) },
                      { key:'project',   label:'Project',    type:'text', placeholder:'Project name' },
                      { key:'search',    label:'Search',     type:'search', placeholder:'Search...' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className={`block text-xs font-medium ${p.textSub} mb-1`}>{f.label}</label>
                        {f.type === 'select' ? (
                          <select value={filters[f.key]} onChange={e => setFilters(prev => ({...prev, [f.key]: e.target.value}))}
                            className={`w-full px-3 py-2 rounded-lg text-sm border ${p.input} focus:ring-2 focus:ring-indigo-500/30 transition-all`}>
                            <option value="">All</option>
                            {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : f.type === 'search' ? (
                          <div className="relative">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${p.textMuted}`} />
                            <input type="text" placeholder={f.placeholder} value={filters[f.key]}
                              onChange={e => setFilters(prev => ({...prev, [f.key]: e.target.value}))}
                              className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm border ${p.input} focus:ring-2 focus:ring-indigo-500/30 transition-all`} />
                          </div>
                        ) : (
                          <input type={f.type} placeholder={f.placeholder} value={filters[f.key]}
                            onChange={e => setFilters(prev => ({...prev, [f.key]: e.target.value}))}
                            className={`w-full px-3 py-2 rounded-lg text-sm border ${p.input} focus:ring-2 focus:ring-indigo-500/30 transition-all`} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Content */}
              {loading ? (
                <div className="flex justify-center py-20"><div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" /></div>
              ) : expenses.length === 0 ? (
                <div className={`rounded-2xl border ${p.border} ${p.card} p-16 text-center`}>
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10 flex items-center justify-center mb-4"><Receipt className="w-10 h-10 text-indigo-400" /></div>
                  <h3 className={`text-lg font-semibold ${p.text} mb-1`}>No expenses found</h3>
                  <p className={`text-sm ${p.textSub} mb-4`}>Add your first business expense</p>
                  <button onClick={openAdd} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium"><Plus className="w-4 h-4 inline mr-1" /> Add Expense</button>
                </div>
              ) : viewMode === 'table' ? (
                <div className={`rounded-2xl border ${p.border} ${p.card} overflow-hidden`}>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead><tr className={`border-b ${p.border}`}>
                        {['expenseDate:Date','category:Category','description:Description','department:Dept','vendor:Vendor','amountInINR:Amount','paymentStatus:Status','actions:'].map(c => {
                          const [key, label] = c.split(':');
                          const sortable = key !== 'actions' && key !== 'vendor';
                          return (
                            <th key={key} onClick={() => sortable && (setSortBy(key), setSortOrder(o=>o==='asc'?'desc':'asc'))}
                              className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${p.textSub} ${sortable?'cursor-pointer hover:text-indigo-500 select-none':''} transition-colors`}>
                              <span className="flex items-center gap-1">{label}{sortBy===key && (sortOrder==='asc'?<ChevronUp className="w-3 h-3"/>:<ChevronDown className="w-3 h-3"/>)}</span>
                            </th>
                          );
                        })}
                      </tr></thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                        {expenses.map((exp,i) => {
                          const st = STATUS_CFG[exp.paymentStatus]||STATUS_CFG.Pending;
                          const StI = st.icon;
                          return (
                            <tr key={exp._id} className={`${p.cardHover} transition-colors group`}>
                              <td className={`px-4 py-3 text-sm ${p.text} whitespace-nowrap`}>{fmtDate(exp.expenseDate)}</td>
                              <td className="px-4 py-3"><span className="text-xs font-medium px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"><Tag className="w-3 h-3 inline mr-1" />{exp.category}</span></td>
                              <td className={`px-4 py-3 text-sm ${p.text} max-w-[180px] truncate`}>{exp.description}</td>
                              <td className={`px-4 py-3 text-xs ${p.textSub}`}>{exp.department||'—'}</td>
                              <td className={`px-4 py-3 text-sm ${p.text}`}>{exp.vendor?.name||'—'}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`text-sm font-semibold ${p.text}`}>{fmt(exp.amountInINR)}</span>
                                {exp.currency!=='INR' && <span className={`text-[10px] ${p.textMuted} ml-1`}>({exp.currency} {exp.amount})</span>}
                              </td>
                              <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${st.bg} ${st.text} border ${st.border}`}><StI className="w-3 h-3" />{exp.paymentStatus}</span></td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => setDetailExpense(exp)} className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-indigo-500"><Eye className="w-4 h-4" /></button>
                                  <button onClick={() => openEdit(exp)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-500"><Edit className="w-4 h-4" /></button>
                                  <button onClick={() => handleDelete(exp._id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div className={`flex items-center justify-between px-4 py-3 border-t ${p.border}`}>
                      <span className={`text-sm ${p.textSub}`}>Page {currentPage} of {totalPages}</span>
                      <div className="flex items-center gap-1">
                        <button disabled={currentPage<=1} onClick={() => setCurrentPage(n=>n-1)} className={`p-2 rounded-lg ${currentPage<=1?'opacity-30':p.cardHover}`}><ArrowLeft className="w-4 h-4" /></button>
                        {Array.from({length:Math.min(totalPages,5)},(_,i)=>i+1).map(pg => (
                          <button key={pg} onClick={() => setCurrentPage(pg)} className={`w-8 h-8 rounded-lg text-sm font-medium ${pg===currentPage?'bg-indigo-500 text-white shadow-lg':`${p.textSub} ${p.cardHover}`} transition-all`}>{pg}</button>
                        ))}
                        <button disabled={currentPage>=totalPages} onClick={() => setCurrentPage(n=>n+1)} className={`p-2 rounded-lg ${currentPage>=totalPages?'opacity-30':p.cardHover}`}><ArrowRight className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {expenses.map((exp) => {
                    const st = STATUS_CFG[exp.paymentStatus]||STATUS_CFG.Pending;
                    const StI = st.icon;
                    return (
                      <div key={exp._id} className={`rounded-2xl border ${p.border} ${p.card} p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group cursor-pointer`} onClick={() => setDetailExpense(exp)}>
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-xs font-medium px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"><Tag className="w-3 h-3 inline mr-1" />{exp.category}</span>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${st.bg} ${st.text} border ${st.border}`}><StI className="w-3 h-3" />{exp.paymentStatus}</span>
                        </div>
                        <p className={`text-sm font-medium ${p.text} mb-1 truncate`}>{exp.description}</p>
                        <p className={`text-xs ${p.textMuted} mb-3`}>{exp.vendor?.name||'—'} · {fmtDate(exp.expenseDate)}</p>
                        <div className="flex items-center justify-between">
                          <span className={`text-xl font-bold ${p.text}`}>{fmt(exp.amountInINR)}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={e => { e.stopPropagation(); openEdit(exp); }} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-500"><Edit className="w-3.5 h-3.5" /></button>
                            <button onClick={e => { e.stopPropagation(); handleDelete(exp._id); }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                        {exp.tags?.length > 0 && <div className="flex flex-wrap gap-1 mt-3">{exp.tags.slice(0,3).map((t,ti) => <span key={ti} className={`text-[10px] px-2 py-0.5 rounded-full ${dk?'bg-slate-700':'bg-gray-100'} ${p.textSub}`}>#{t}</span>)}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══ ANALYTICS TAB ═══ */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Full category */}
                <div className={`rounded-2xl border ${p.border} ${p.card} p-6`}>
                  <h3 className={`text-lg font-semibold ${p.text} mb-5 flex items-center gap-2`}><PieChart className="w-5 h-5 text-indigo-500" /> Category Breakdown</h3>
                  {categoryData.length > 0 ? <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">{categoryData.map((c,i) => {
                    const tot = categoryData.reduce((s,x)=>s+(x.totalAmount||0),0)||1;
                    const pct = (c.totalAmount||0)/tot*100;
                    return (
                      <div key={i} className={`flex items-center gap-3 py-2 px-3 rounded-xl ${p.cardHover}`}>
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{backgroundColor:CAT_COLORS[i%CAT_COLORS.length]}} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1"><span className={`text-sm font-medium ${p.text} truncate`}>{c._id}</span><span className={`text-sm font-semibold ${p.text}`}>{fmt(c.totalAmount)}</span></div>
                          <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-slate-700"><div className="h-full rounded-full transition-all duration-700" style={{width:`${pct}%`,backgroundColor:CAT_COLORS[i%CAT_COLORS.length]}} /></div>
                          <div className="flex justify-between mt-1"><span className={`text-[10px] ${p.textMuted}`}>{c.count} expenses</span><span className={`text-[10px] ${p.textMuted}`}>{pct.toFixed(1)}%</span></div>
                        </div>
                      </div>
                    );
                  })}</div> : <p className={`text-center py-8 ${p.textMuted}`}>No data</p>}
                </div>
                {/* Full dept */}
                <div className={`rounded-2xl border ${p.border} ${p.card} p-6`}>
                  <h3 className={`text-lg font-semibold ${p.text} mb-5 flex items-center gap-2`}><Briefcase className="w-5 h-5 text-purple-500" /> Department Breakdown</h3>
                  {departmentData.length > 0 ? <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">{departmentData.map((d,i) => {
                    const tot = departmentData.reduce((s,x)=>s+(x.totalAmount||0),0)||1;
                    return (
                      <div key={i} className={`flex items-center gap-3 py-2 px-3 rounded-xl ${p.cardHover}`}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{backgroundColor:`${CAT_COLORS[(i+5)%CAT_COLORS.length]}15`}}>
                          <Building2 className="w-5 h-5" style={{color:CAT_COLORS[(i+5)%CAT_COLORS.length]}} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1"><span className={`text-sm font-medium ${p.text}`}>{d._id}</span><span className={`text-sm font-semibold ${p.text}`}>{fmt(d.totalAmount)}</span></div>
                          <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-slate-700"><div className="h-full rounded-full transition-all duration-700" style={{width:`${(d.totalAmount||0)/tot*100}%`,backgroundColor:CAT_COLORS[(i+5)%CAT_COLORS.length]}} /></div>
                        </div>
                      </div>
                    );
                  })}</div> : <p className={`text-center py-8 ${p.textMuted}`}>No data</p>}
                </div>
              </div>
              {/* Full monthly trend */}
              <div className={`rounded-2xl border ${p.border} ${p.card} p-6`}>
                <h3 className={`text-lg font-semibold ${p.text} mb-5 flex items-center gap-2`}><BarChart3 className="w-5 h-5 text-indigo-500" /> 12-Month Trend</h3>
                {monthlyTrend.length > 0 ? (
                  <div className="flex items-end gap-2 sm:gap-3 h-60">
                    {monthlyTrend.map((m,i) => {
                      const mx = Math.max(...monthlyTrend.map(t=>t.totalAmount||0),1);
                      const h = ((m.totalAmount||0)/mx)*100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group cursor-pointer">
                          <span className={`text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity ${p.text}`}>{fmt(m.totalAmount)}</span>
                          <span className={`text-[10px] ${p.textMuted}`}>{m.count} txns</span>
                          <div className="w-full relative" style={{height:'180px'}}>
                            <div className="absolute bottom-0 w-full rounded-t-xl bg-gradient-to-t from-indigo-500 to-purple-400 opacity-75 hover:opacity-100 transition-all duration-500" style={{height:`${Math.max(h,3)}%`}} />
                          </div>
                          <span className={`text-[10px] font-medium ${p.textSub}`}>{m._id ? MONTHS[(m._id.month||1)-1] : ''}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : <p className={`text-center py-16 ${p.textMuted}`}>No data</p>}
              </div>
            </div>
          )}

          {/* ═══ VENDORS TAB ═══ */}
          {activeTab === 'vendors' && (
            <div className={`rounded-2xl border ${p.border} ${p.card} p-6`}>
              <h3 className={`text-lg font-semibold ${p.text} mb-5 flex items-center gap-2`}><Building2 className="w-5 h-5 text-indigo-500" /> Top Vendors</h3>
              {topVendors.length > 0 ? <div className="space-y-3">{topVendors.map((v,i) => {
                const mx = topVendors[0]?.totalAmount||1;
                return (
                  <div key={i} className={`flex items-center gap-4 py-3 px-4 rounded-xl ${p.cardHover} transition-all`}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-indigo-500">#{i+1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1"><span className={`text-sm font-medium ${p.text} truncate`}>{v._id||'Unknown'}</span><span className={`text-sm font-bold ${p.text}`}>{fmt(v.totalAmount)}</span></div>
                      <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000" style={{width:`${(v.totalAmount||0)/mx*100}%`}} /></div>
                      <div className="flex justify-between mt-1"><span className={`text-[10px] ${p.textMuted}`}>{v.count} expenses</span><span className={`text-[10px] ${p.textMuted}`}>Last: {fmtDate(v.lastExpense)}</span></div>
                    </div>
                  </div>
                );
              })}</div> : (
                <div className={`text-center py-16 ${p.textMuted}`}><Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-sm">No vendor data yet</p></div>
              )}
            </div>
          )}

          {/* ═══ BOM TAB ═══ */}
          {activeTab === 'bom' && <BillOfMaterials embedded />}

          {/* ═══ FUNDS TAB ═══ */}
          {activeTab === 'funds' && <FundsInvestments embedded />}

          {/* ═══ BUDGET TAB ═══ */}
          {activeTab === 'budget' && <BudgetPlanner embedded />}

          {/* ═══ CASH FLOW TAB ═══ */}
          {activeTab === 'cashflow' && <CashFlowForecast embedded />}

          {/* ═══ INCOME TAB ═══ */}
          {activeTab === 'income' && <IncomeTracker embedded />}

          {/* ═══ RECURRING TAB ═══ */}
          {activeTab === 'recurring' && <RecurringPayments embedded />}

          {/* ═══ SUBSCRIPTIONS TAB ═══ */}
          {activeTab === 'subscriptions' && <SubscriptionManager embedded />}

          {/* ═══ SPLIT EXPENSES TAB ═══ */}
          {activeTab === 'split' && <SplitExpenses embedded />}
        </div>

        {/* ═══ DETAIL DRAWER ═══ */}
        {detailExpense && (
          <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setDetailExpense(null)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className={`relative w-full max-w-lg ${dk?'bg-slate-900':'bg-white'} shadow-2xl overflow-y-auto`} onClick={e => e.stopPropagation()}>
              <div className={`sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b ${p.border} ${dk?'bg-slate-900':'bg-white'}`}>
                <h3 className={`text-lg font-semibold ${p.text}`}>Expense Details</h3>
                <button onClick={() => setDetailExpense(null)} className={`p-2 rounded-lg ${p.cardHover}`}><X className="w-5 h-5" /></button>
              </div>
              <div className="px-6 py-5 space-y-5">
                <div className="text-center py-3">
                  <p className={`text-sm ${p.textSub}`}>Amount</p>
                  <p className="text-4xl font-black bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent mt-1">{fmt(detailExpense.amountInINR)}</p>
                  {detailExpense.currency !== 'INR' && <p className={`text-sm ${p.textMuted} mt-1`}>{detailExpense.currency} {detailExpense.amount} × {detailExpense.exchangeRate}</p>}
                </div>
                <div className="flex items-center justify-center gap-3">
                  {(() => { const st=STATUS_CFG[detailExpense.paymentStatus]||STATUS_CFG.Pending;const StI=st.icon;return <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${st.bg} ${st.text} border ${st.border}`}><StI className="w-4 h-4" />{detailExpense.paymentStatus}</span>; })()}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20"><Tag className="w-4 h-4" />{detailExpense.category}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[{l:'Date',v:fmtDate(detailExpense.expenseDate),i:Calendar},{l:'Department',v:detailExpense.department||'—',i:Briefcase},{l:'Payment',v:detailExpense.paymentMethod||'—',i:CreditCard},{l:'Project',v:detailExpense.project||'—',i:Target},{l:'Invoice #',v:detailExpense.invoiceNumber||'—',i:Hash},{l:'Reference',v:detailExpense.referenceNumber||'—',i:FileText}].map((x,i) => (
                    <div key={i} className={`p-3 rounded-xl ${dk?'bg-slate-800':'bg-gray-50'}`}>
                      <div className={`flex items-center gap-1 text-xs ${p.textMuted} mb-1`}><x.i className="w-3 h-3" />{x.l}</div>
                      <p className={`text-sm font-medium ${p.text}`}>{x.v}</p>
                    </div>
                  ))}
                </div>
                <div><h4 className={`text-sm font-semibold ${p.text} mb-1`}>Description</h4><p className={`text-sm ${p.textSub}`}>{detailExpense.description||'None'}</p></div>
                {detailExpense.vendor?.name && (
                  <div className={`p-4 rounded-xl ${dk?'bg-slate-800':'bg-gray-50'}`}>
                    <h4 className={`text-sm font-semibold ${p.text} mb-2 flex items-center gap-2`}><Building2 className="w-4 h-4 text-indigo-500" /> Vendor</h4>
                    <p className={`text-sm ${p.text}`}>{detailExpense.vendor.name}</p>
                    {detailExpense.vendor.email && <p className={`text-xs ${p.textSub}`}>{detailExpense.vendor.email}</p>}
                    {detailExpense.vendor.phone && <p className={`text-xs ${p.textSub}`}>{detailExpense.vendor.phone}</p>}
                  </div>
                )}
                {detailExpense.notes && <div><h4 className={`text-sm font-semibold ${p.text} mb-1`}>Notes</h4><p className={`text-sm ${p.textSub}`}>{detailExpense.notes}</p></div>}
                <div className="flex flex-wrap gap-2">
                  {detailExpense.taxDeductible && <span className="text-xs px-3 py-1 rounded-full bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 font-medium">Tax Deductible</span>}
                  {detailExpense.reimbursable && <span className="text-xs px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium">Reimbursable</span>}
                  {detailExpense.isBillable && <span className="text-xs px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 font-medium">Billable</span>}
                  {detailExpense.isRecurring && <span className="text-xs px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 font-medium">Recurring</span>}
                </div>
                {detailExpense.attachments?.length > 0 && (
                  <div><h4 className={`text-sm font-semibold ${p.text} mb-2`}>Attachments ({detailExpense.attachments.length})</h4>
                    {detailExpense.attachments.map((a,ai) => (
                      <div key={ai} className={`flex items-center gap-3 p-3 rounded-xl ${dk?'bg-slate-800':'bg-gray-50'} mb-2`}>
                        <Paperclip className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        <span className={`text-sm ${p.text} flex-1 truncate`}>{a.originalName||a.filename}</span>
                        <span className={`text-xs ${p.textMuted}`}>{a.fileType}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className={`flex gap-3 pt-4 border-t ${p.border}`}>
                  <button onClick={() => { openEdit(detailExpense); setDetailExpense(null); }} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-sm"><Edit className="w-4 h-4 inline mr-1" /> Edit</button>
                  <button onClick={() => { handleDelete(detailExpense._id); setDetailExpense(null); }} className="px-5 py-2.5 rounded-xl border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 font-medium text-sm hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"><Trash2 className="w-4 h-4 inline mr-1" /> Delete</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showModal && <ExpenseFormModal isOpen={showModal} onClose={() => { setShowModal(false); setSelectedExpense(null); }} expense={selectedExpense} onSuccess={onSuccess} />}
      </div>
    </MainLayout>
  );
};

export default CompanyExpensesDashboard;
