// ============================================================================
// ENTERPRISE TRANSACTION MANAGER — AI-Powered Transaction Page
// ============================================================================
// Full CRUD, smart categorization, bulk actions, anomaly detection, recurring
// detection, advanced search & filters, analytics sidebar, export.
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis,
  Tooltip as RechartTooltip, CartesianGrid,
} from 'recharts';
import {
  Search, Filter, Plus, Download, Upload, Trash2, Edit3, Check,
  X, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronLeft, ChevronRight,
  Calendar, Tag, Building2, CreditCard, IndianRupee, RefreshCw, MoreHorizontal,
  BrainCircuit, Sparkles, AlertTriangle, TrendingUp, TrendingDown, Eye,
  ArrowRightLeft, BarChart3, Clock, Repeat, CheckCircle2, XCircle,
  SlidersHorizontal, ListFilter, LayoutGrid, LayoutList, FileText,
} from 'lucide-react';
import MainLayout from '../../components/MainLayout';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import {
  PageTransition, AnimatedCard, GlassCard, Badge, Shimmer,
  AnimatedNumber, useInView, colorPalette, chartColors, EmptyState,
} from '../../components/enterprise/EnterpriseAnimationSystem';

// ============================================================================
// §1  CONSTANTS
// ============================================================================

const CATEGORIES = [
  'Food & Dining', 'Groceries', 'Shopping', 'Transport', 'Fuel',
  'Entertainment', 'Healthcare', 'Education', 'Utilities', 'Rent',
  'Insurance', 'EMI', 'Investment', 'Salary', 'Freelance',
  'Business Income', 'Gift', 'Reimbursement', 'Transfer', 'Other',
];

const PAYMENT_METHODS = ['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Wallet', 'NEFT/RTGS', 'Cheque'];

const SORT_OPTIONS = [
  { id: '-date', label: 'Newest First' },
  { id: 'date', label: 'Oldest First' },
  { id: '-amount', label: 'Highest Amount' },
  { id: 'amount', label: 'Lowest Amount' },
];

// ============================================================================
// §2  SUB-COMPONENTS
// ============================================================================

const QuickStat = ({ label, value, prefix = '₹', icon: Icon, color, change }) => {
  const colors = colorPalette[color] || colorPalette.blue;
  return (
    <div className={`p-4 rounded-xl ${colors.bg} border ${colors.border}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${colors.text}`} />
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
        {change !== undefined && (
          <span className={`text-xs font-medium ml-auto ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {change >= 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      <p className={`text-lg font-bold ${colors.text}`}>
        {prefix}<AnimatedNumber value={typeof value === 'number' ? value : 0} compact />
      </p>
    </div>
  );
};

const TransactionRow = ({ txn, selected, onSelect, onEdit, onDelete, index }) => {
  const isIncome = txn.type === 'income' || txn.type === 'credit';
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (actionsRef.current && !actionsRef.current.contains(e.target)) setShowActions(false); };
    if (showActions) document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showActions]);

  return (
    <div className={`group flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/10 transition-colors
      ${selected ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}
      style={{ animationDelay: `${index * 30}ms` }}>
      {/* Checkbox */}
      <input type="checkbox" checked={selected} onChange={() => onSelect(txn._id)}
        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />

      {/* Type indicator */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
        ${isIncome ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
        {isIncome ? <ArrowDownRight className="w-5 h-5 text-green-600 dark:text-green-400" /> : <ArrowUpRight className="w-5 h-5 text-red-600 dark:text-red-400" />}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{txn.description || txn.merchant || 'Transaction'}</p>
          {txn.isRecurring && <Badge variant="info"><Repeat className="w-3 h-3 mr-0.5" /> Recurring</Badge>}
          {txn.isAnomaly && <Badge variant="warning"><AlertTriangle className="w-3 h-3 mr-0.5" /> Unusual</Badge>}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Tag className="w-3 h-3" /> {txn.category || 'Uncategorized'}
          </span>
          {txn.paymentMethod && (
            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <CreditCard className="w-3 h-3" /> {txn.paymentMethod}
            </span>
          )}
          <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {new Date(txn.date || txn.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Amount */}
      <div className="text-right">
        <p className={`text-sm font-bold ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {isIncome ? '+' : '-'}₹{Math.abs(txn.amount || 0).toLocaleString('en-IN')}
        </p>
        {txn.aiConfidence && (
          <p className="text-xs text-gray-400 flex items-center justify-end gap-0.5 mt-0.5">
            <BrainCircuit className="w-3 h-3" /> {Math.round(txn.aiConfidence * 100)}% AI
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="relative" ref={actionsRef}>
        <button onClick={(e) => { e.stopPropagation(); setShowActions(!showActions); }}
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
          <MoreHorizontal className="w-4 h-4 text-gray-400" />
        </button>
        {showActions && (
          <div className="absolute right-0 top-8 z-50 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 animate-fade-in-scale">
            <button onClick={() => { onEdit(txn); setShowActions(false); }}
              className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
              <Edit3 className="w-3.5 h-3.5" /> Edit
            </button>
            <button onClick={() => { onDelete(txn._id); setShowActions(false); }}
              className="w-full px-3 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const AddTransactionModal = ({ open, onClose, onSave, editData }) => {
  const [form, setForm] = useState({
    type: 'expense', description: '', amount: '', category: '', paymentMethod: 'UPI', date: new Date().toISOString().split('T')[0], notes: '',
  });

  useEffect(() => {
    if (editData) {
      setForm({
        type: editData.type || 'expense',
        description: editData.description || editData.merchant || '',
        amount: Math.abs(editData.amount || 0).toString(),
        category: editData.category || '',
        paymentMethod: editData.paymentMethod || 'UPI',
        date: (editData.date || editData.createdAt || new Date().toISOString()).split('T')[0],
        notes: editData.notes || '',
      });
    } else {
      setForm({ type: 'expense', description: '', amount: '', category: '', paymentMethod: 'UPI', date: new Date().toISOString().split('T')[0], notes: '' });
    }
  }, [editData, open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, amount: parseFloat(form.amount) || 0, _id: editData?._id });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 mx-4 animate-fade-in-scale" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editData ? 'Edit Transaction' : 'Add Transaction'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
            {['income', 'expense'].map(t => (
              <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all
                  ${form.type === t
                    ? t === 'income' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    : 'text-gray-500 dark:text-gray-400'}`}>
                {t === 'income' ? 'Income' : 'Expense'}
              </button>
            ))}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g., Grocery shopping at BigBasket" required />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Amount (₹)</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0" required min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          {/* Category + Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Auto-detect</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Payment Method</label>
              <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes (optional)</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder="Add notes..." />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors flex items-center justify-center gap-2">
              <Check className="w-4 h-4" /> {editData ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MiniChart = ({ data, color = '#3B82F6', height = 40 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data}>
      <defs>
        <linearGradient id={`mini-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Area type="monotone" dataKey="value" stroke={color} fill={`url(#mini-${color.replace('#', '')})`} strokeWidth={1.5} dot={false} />
    </AreaChart>
  </ResponsiveContainer>
);

// ============================================================================
// §3  MAIN COMPONENT
// ============================================================================

const EnterpriseTransactionManager = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  // State
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [filteredTxns, setFilteredTxns] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('-date');
  const [filters, setFilters] = useState({ type: 'all', category: '', paymentMethod: '', dateFrom: '', dateTo: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [aiInsights, setAiInsights] = useState([]);
  const [stats, setStats] = useState({ income: 0, expense: 0, count: 0, avgAmount: 0 });

  // ------- FETCH -------
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page, limit: pageSize, sort: sortBy,
        ...(searchQuery && { search: searchQuery }),
        ...(filters.type !== 'all' && { type: filters.type }),
        ...(filters.category && { category: filters.category }),
        ...(filters.paymentMethod && { paymentMethod: filters.paymentMethod }),
        ...(filters.dateFrom && { startDate: filters.dateFrom }),
        ...(filters.dateTo && { endDate: filters.dateTo }),
      };

      const [txnRes, insightRes] = await Promise.allSettled([
        api.get('/financial/transactions', { params }),
        api.get('/ai/insights', { params: { type: 'transactions' } }),
      ]);

      if (txnRes.status === 'fulfilled') {
        const d = txnRes.value?.data;
        const txns = d?.data?.transactions || d?.transactions || d?.data || [];
        setTransactions(Array.isArray(txns) ? txns : []);
        setTotalCount(d?.data?.total || d?.total || txns.length);
      }

      if (insightRes.status === 'fulfilled') {
        const insights = insightRes.value?.data?.data?.insights || insightRes.value?.data?.insights || insightRes.value?.data?.data || [];
        setAiInsights(Array.isArray(insights) ? insights.slice(0, 5) : []);
      }
    } catch (err) {
      console.error('Fetch transactions error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, searchQuery, filters]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  // ------- CLIENT-SIDE FILTERING -------
  useEffect(() => {
    let result = [...transactions];

    // Client-side search (supplement server-side)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        (t.description || '').toLowerCase().includes(q) ||
        (t.merchant || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q)
      );
    }

    setFilteredTxns(result);

    // Calculate stats
    const income = result.filter(t => t.type === 'income' || t.type === 'credit').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
    const expense = result.filter(t => t.type === 'expense' || t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
    setStats({
      income: Math.round(income),
      expense: Math.round(expense),
      count: result.length,
      avgAmount: result.length > 0 ? Math.round((income + expense) / result.length) : 0,
    });
  }, [transactions, searchQuery]);

  // ------- HANDLERS -------
  const handleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredTxns.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredTxns.map(t => t._id)));
  }, [selectedIds, filteredTxns]);

  const handleSave = useCallback(async (formData) => {
    try {
      if (formData._id) {
        await api.put(`/financial/transactions/${formData._id}`, formData);
      } else {
        await api.post('/financial/transactions', formData);
      }
      setShowModal(false);
      setEditData(null);
      fetchTransactions();
    } catch (err) {
      console.error('Save error:', err);
    }
  }, [fetchTransactions]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await api.delete(`/financial/transactions/${id}`);
      fetchTransactions();
    } catch (err) {
      console.error('Delete error:', err);
    }
  }, [fetchTransactions]);

  const handleBulkDelete = useCallback(async () => {
    if (!window.confirm(`Delete ${selectedIds.size} transactions?`)) return;
    try {
      await Promise.all([...selectedIds].map(id => api.delete(`/financial/transactions/${id}`)));
      setSelectedIds(new Set());
      fetchTransactions();
    } catch (err) {
      console.error('Bulk delete error:', err);
    }
  }, [selectedIds, fetchTransactions]);

  const handleExport = useCallback(async () => {
    try {
      const { data } = await api.get('/export/transactions', { params: { format: 'csv' }, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    }
  }, []);

  // ------- MINI CHART DATA -------
  const miniChartData = useMemo(() => {
    const days = {};
    transactions.forEach(t => {
      const d = (t.date || t.createdAt || '').split('T')[0];
      if (!days[d]) days[d] = 0;
      days[d] += Math.abs(t.amount || 0);
    });
    return Object.entries(days).sort().slice(-14).map(([date, value]) => ({ date, value }));
  }, [transactions]);

  const totalPages = Math.ceil(totalCount / pageSize);

  // ------- RENDER -------
  return (
    <MainLayout title="Transactions" subtitle="AI-powered transaction management">
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4 md:p-6 lg:p-8">

          {/* ─── STATS ROW ─── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <QuickStat label="Total Income" value={stats.income} icon={TrendingUp} color="green" change={4.2} />
            <QuickStat label="Total Expenses" value={stats.expense} icon={TrendingDown} color="rose" change={-1.8} />
            <QuickStat label="Net Flow" value={stats.income - stats.expense} icon={ArrowRightLeft} color="blue" />
            <QuickStat label="Avg Transaction" value={stats.avgAmount} icon={BarChart3} color="purple" />
          </div>

          {/* ─── TOOLBAR ─── */}
          <GlassCard className="p-4 mb-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                  placeholder="Search transactions..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Sort */}
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {SORT_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>

                {/* Filter toggle */}
                <button onClick={() => setShowFilters(!showFilters)}
                  className={`px-3 py-2 text-xs rounded-lg border flex items-center gap-1 transition-colors
                    ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400' : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
                </button>

                {/* View mode */}
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                  <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}>
                    <LayoutList className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                  </button>
                  <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}>
                    <LayoutGrid className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>

                {/* Add */}
                <button onClick={() => { setEditData(null); setShowModal(true); }}
                  className="px-3 py-2 text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-1 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>

                {/* Export */}
                <button onClick={handleExport}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <Download className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Filter panel */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 md:grid-cols-5 gap-3 animate-fade-in-down">
                <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
                  className="px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  <option value="all">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
                <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
                  className="px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  <option value="">All Categories</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={filters.paymentMethod} onChange={e => setFilters(f => ({ ...f, paymentMethod: e.target.value }))}
                  className="px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  <option value="">All Methods</option>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                  className="px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
                <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                  className="px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
              </div>
            )}

            {/* Bulk actions bar */}
            {selectedIds.size > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3 animate-fade-in">
                <span className="text-xs text-gray-500 dark:text-gray-400">{selectedIds.size} selected</span>
                <button onClick={handleBulkDelete}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/40 flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Delete Selected
                </button>
                <button onClick={() => setSelectedIds(new Set())}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  Clear Selection
                </button>
              </div>
            )}
          </GlassCard>

          {/* ─── CONTENT GRID ─── */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

            {/* Transaction List — 3 cols */}
            <div className="xl:col-span-3">
              <GlassCard className="overflow-hidden">
                {/* Header row */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                  <input type="checkbox" checked={selectedIds.size === filteredTxns.length && filteredTxns.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex-1">
                    {loading ? 'Loading...' : `${totalCount.toLocaleString()} transactions`}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Page {page} of {Math.max(1, totalPages)}
                  </span>
                </div>

                {/* Transaction rows */}
                <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3">
                        <Shimmer width={16} height={16} rounded="rounded" />
                        <Shimmer width={40} height={40} rounded="rounded-xl" />
                        <div className="flex-1 space-y-1.5">
                          <Shimmer width="60%" height={14} />
                          <Shimmer width="40%" height={10} />
                        </div>
                        <Shimmer width={80} height={14} />
                      </div>
                    ))
                  ) : filteredTxns.length === 0 ? (
                    <EmptyState
                      icon={ArrowRightLeft}
                      title="No transactions found"
                      description={searchQuery ? 'Try adjusting your search or filters' : 'Add your first transaction to get started'}
                      action={() => { setEditData(null); setShowModal(true); }}
                      actionLabel="Add Transaction"
                    />
                  ) : viewMode === 'list' ? (
                    filteredTxns.map((txn, i) => (
                      <TransactionRow key={txn._id || i} txn={txn} index={i}
                        selected={selectedIds.has(txn._id)}
                        onSelect={handleSelect}
                        onEdit={(t) => { setEditData(t); setShowModal(true); }}
                        onDelete={handleDelete} />
                    ))
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
                      {filteredTxns.map((txn, i) => {
                        const isIncome = txn.type === 'income' || txn.type === 'credit';
                        return (
                          <AnimatedCard key={txn._id || i} delay={i * 40}
                            className={`p-4 rounded-xl border ${isIncome ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/10' : 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/10'}`}>
                            <div className="flex justify-between items-start mb-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{txn.description || txn.merchant || 'Transaction'}</p>
                              <p className={`text-sm font-bold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                                {isIncome ? '+' : '-'}₹{Math.abs(txn.amount || 0).toLocaleString('en-IN')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Badge variant={isIncome ? 'success' : 'error'}>{txn.type}</Badge>
                              <span>{txn.category}</span>
                              <span className="ml-auto">{new Date(txn.date || txn.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                            </div>
                          </AnimatedCard>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                    <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50">
                      <ChevronLeft className="w-3 h-3" /> Prev
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                        const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                        if (pageNum > totalPages) return null;
                        return (
                          <button key={pageNum} onClick={() => setPage(pageNum)}
                            className={`w-8 h-8 text-xs rounded-lg ${page === pageNum ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50">
                      Next <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </GlassCard>
            </div>

            {/* Sidebar — 1 col */}
            <div className="space-y-4">
              {/* Mini Trend */}
              <GlassCard className="p-4">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">14-Day Trend</h4>
                <MiniChart data={miniChartData} height={60} color={isDark ? '#60A5FA' : '#3B82F6'} />
              </GlassCard>

              {/* AI Insights */}
              <GlassCard className="p-4">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" /> AI Analysis
                </h4>
                <div className="space-y-2">
                  {aiInsights.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">Add more transactions for AI analysis</p>
                  ) : (
                    aiInsights.map((insight, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{insight.title || insight.message}</p>
                        {insight.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{insight.description}</p>}
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>

              {/* Category Summary */}
              <GlassCard className="p-4">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">Top Categories</h4>
                <div className="space-y-2">
                  {(() => {
                    const cats = {};
                    filteredTxns.filter(t => t.type !== 'income' && t.type !== 'credit').forEach(t => {
                      const c = t.category || 'Other';
                      cats[c] = (cats[c] || 0) + Math.abs(t.amount || 0);
                    });
                    const total = Object.values(cats).reduce((s, v) => s + v, 0);
                    return Object.entries(cats)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([cat, val], i) => (
                        <div key={cat} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: chartColors[i] }} />
                          <span className="text-xs text-gray-600 dark:text-gray-400 flex-1 truncate">{cat}</span>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {total > 0 ? Math.round((val / total) * 100) : 0}%
                          </span>
                        </div>
                      ));
                  })()}
                </div>
              </GlassCard>
            </div>
          </div>
        </div>

        {/* Modal */}
        <AddTransactionModal open={showModal} onClose={() => { setShowModal(false); setEditData(null); }} onSave={handleSave} editData={editData} />
      </PageTransition>
    </MainLayout>
  );
};

export default EnterpriseTransactionManager;
