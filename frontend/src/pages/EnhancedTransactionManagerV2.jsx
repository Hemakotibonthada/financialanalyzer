// ============================================================================
// Enhanced Transaction Manager V2 — Enterprise Transaction Hub
// ============================================================================
// Full-featured transaction management with AI categorization,
// bulk actions, advanced search/filter, and visual analytics.
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import MainLayout from '../components/MainLayout';
import {
  StatCard, SectionHeader, InsightCard, EmptyState,
  CategoryPill, QuickAction, LoadingOverlay, EnhancedDataTable,
} from '../components/ui/EnterpriseComponents';
import {
  FinancialDonutChart, FinancialBarChart, ChartCard, currencyFormatter,
} from '../components/charts/EnterpriseCharts';
import { FadeIn, StaggerChildren, PageTransition } from '../components/ui/AnimatedComponents';
import api from '../services/api';
import { categorizeTransaction } from '../services/aiService';
import {
  DollarSign, TrendingUp, TrendingDown, Plus, RefreshCw,
  Search, Filter, Download, Upload, ArrowUpRight,
  ArrowDownRight, Calendar, Tag, Trash2, Edit3,
  ChevronLeft, ChevronRight, SortAsc, SortDesc,
  CheckSquare, X, FileText, Eye, BarChart3,
} from 'lucide-react';

// ============================================================================
// FILTER PANEL
// ============================================================================

const FilterPanel = ({ filters, setFilters, categories, onReset }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 space-y-3">
    <div className="flex items-center justify-between">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Filter className="w-4 h-4" /> Filters
      </h4>
      <button onClick={onReset} className="text-xs text-blue-600 hover:underline">Reset</button>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Type</label>
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
        >
          <option value="">All</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="transfer">Transfer</option>
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Category</label>
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
        >
          <option value="">All</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-400 mb-1 block">From Date</label>
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-gray-400 mb-1 block">To Date</label>
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
        />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Min Amount</label>
        <input
          type="number"
          value={filters.minAmount}
          onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
          placeholder="₹0"
          className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Max Amount</label>
        <input
          type="number"
          value={filters.maxAmount}
          onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
          placeholder="₹∞"
          className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
        />
      </div>
    </div>
  </div>
);

// ============================================================================
// ADD TRANSACTION MODAL
// ============================================================================

const AddTransactionModal = ({ show, onClose, onAdd }) => {
  const [form, setForm] = useState({
    description: '', amount: '', type: 'expense', category: '',
    date: new Date().toISOString().split('T')[0], notes: '',
  });
  const [aiCategory, setAiCategory] = useState(null);
  const [categorizing, setCategorizing] = useState(false);

  const handleDescChange = async (desc) => {
    setForm({ ...form, description: desc });
    if (desc.length > 3) {
      setCategorizing(true);
      try {
        const result = await categorizeTransaction(desc, parseFloat(form.amount) || 0);
        if (result?.category) {
          setAiCategory(result.category);
          if (!form.category) setForm(f => ({ ...f, category: result.category }));
        }
      } catch {}
      setCategorizing(false);
    }
  };

  const handleSubmit = () => {
    if (!form.description || !form.amount) return;
    onAdd({
      ...form,
      amount: parseFloat(form.amount),
    });
    setForm({ description: '', amount: '', type: 'expense', category: '', date: new Date().toISOString().split('T')[0], notes: '' });
    setAiCategory(null);
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-lg w-full shadow-xl animate-scale-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Transaction</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-3 gap-2">
            {['expense', 'income', 'transfer'].map(t => (
              <button
                key={t}
                onClick={() => setForm({ ...form, type: t })}
                className={`py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                  form.type === t
                    ? t === 'income' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      t === 'expense' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => handleDescChange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm"
              placeholder="e.g., Grocery shopping at Big Bazaar"
            />
            {aiCategory && (
              <p className="text-xs text-purple-500 mt-1">
                🤖 AI suggests: <span className="font-medium">{aiCategory}</span>
                {categorizing && <span className="ml-1 animate-pulse">...</span>}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Amount (₹)</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Category</label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm"
              placeholder="e.g., Food, Transport, Shopping"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm resize-none"
              rows={2}
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-500/25"
            >
              Add Transaction
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const EnhancedTransactionManagerV2 = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeView, setActiveView] = useState('list'); // list or analytics
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const defaultFilters = { type: '', category: '', startDate: '', endDate: '', minAmount: '', maxAmount: '' };
  const [filters, setFilters] = useState(defaultFilters);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', perPage);
      params.set('sort', `${sortDir === 'desc' ? '-' : ''}${sortField}`);
      if (searchQuery) params.set('search', searchQuery);
      if (filters.type) params.set('type', filters.type);
      if (filters.category) params.set('category', filters.category);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.minAmount) params.set('minAmount', filters.minAmount);
      if (filters.maxAmount) params.set('maxAmount', filters.maxAmount);

      const res = await api.get(`/transactions?${params.toString()}`);
      const data = res.data?.data || res.data || {};
      setTransactions(data.transactions || data.data || (Array.isArray(data) ? data : []));
      setTotalCount(data.total || data.totalCount || data.count || 0);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, searchQuery, filters, sortField, sortDir]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  // Derived data
  const categories = useMemo(() => {
    const set = new Set(transactions.map(t => t.category).filter(Boolean));
    return [...set].sort();
  }, [transactions]);

  const summary = useMemo(() => {
    let income = 0, expense = 0;
    transactions.forEach(t => {
      if (t.type === 'income') income += Math.abs(t.amount || 0);
      else expense += Math.abs(t.amount || 0);
    });
    return { income, expense, net: income - expense, count: transactions.length };
  }, [transactions]);

  const categoryBreakdown = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      if (t.type !== 'income' && t.category) {
        map[t.category] = (map[t.category] || 0) + Math.abs(t.amount || 0);
      }
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [transactions]);

  const totalPages = Math.ceil(totalCount / perPage);

  const handleAddTransaction = async (txn) => {
    try {
      await api.post('/transactions', txn);
      fetchTransactions();
    } catch (err) {
      console.error('Failed to add transaction:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await api.delete(`/transactions/${id}`);
      fetchTransactions();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} transactions?`)) return;
    try {
      await Promise.all([...selectedIds].map(id => api.delete(`/transactions/${id}`)));
      setSelectedIds(new Set());
      fetchTransactions();
    } catch (err) {
      console.error('Bulk delete failed:', err);
    }
  };

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(transactions.map(t => t._id)));
  };

  return (
    <MainLayout>
      <PageTransition>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* HEADER */}
          <FadeIn>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/25">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {totalCount} transaction{totalCount !== 1 ? 's' : ''} total
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveView(v => v === 'list' ? 'analytics' : 'list')}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {activeView === 'list' ? <BarChart3 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  {activeView === 'list' ? 'Analytics' : 'List'}
                </button>
                <button
                  onClick={fetchTransactions}
                  className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  <RefreshCw className="w-4 h-4 text-gray-500" />
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-500/25"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>
          </FadeIn>

          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Income" value={summary.income} prefix="₹" color="success" icon={<ArrowUpRight className="w-5 h-5" />} />
            <StatCard title="Expenses" value={summary.expense} prefix="₹" color="danger" icon={<ArrowDownRight className="w-5 h-5" />} />
            <StatCard title="Net" value={Math.abs(summary.net)} prefix={summary.net >= 0 ? '₹' : '-₹'} color={summary.net >= 0 ? 'primary' : 'danger'} icon={<DollarSign className="w-5 h-5" />} />
            <StatCard title="Count" value={summary.count} color="purple" icon={<FileText className="w-5 h-5" />} />
          </div>

          {activeView === 'analytics' ? (
            <StaggerChildren staggerDelay={60} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Spending by Category">
                  <FinancialDonutChart data={categoryBreakdown} height={300} centerLabel="Categories" centerValue={`${categoryBreakdown.length}`} />
                </ChartCard>
                <ChartCard title="Top Categories">
                  <FinancialBarChart data={categoryBreakdown.slice(0, 8)} bars={[{ key: 'value', name: 'Amount' }]} xKey="name" height={300} layout="horizontal" />
                </ChartCard>
              </div>
            </StaggerChildren>
          ) : (
            <>
              {/* SEARCH & FILTER BAR */}
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    placeholder="Search transactions..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(f => !f)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    showFilters
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </button>
              </div>

              {showFilters && (
                <FilterPanel
                  filters={filters}
                  setFilters={(f) => { setFilters(f); setPage(1); }}
                  categories={categories}
                  onReset={() => { setFilters(defaultFilters); setPage(1); }}
                />
              )}

              {/* Bulk actions */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-400">{selectedIds.size} selected</span>
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-xs font-medium"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-xs text-gray-500 hover:text-gray-700 ml-auto"
                  >
                    Clear selection
                  </button>
                </div>
              )}

              {/* TRANSACTION LIST */}
              {loading ? (
                <LoadingOverlay message="Loading transactions..." />
              ) : transactions.length === 0 ? (
                <EmptyState title="No transactions found" description="Try adjusting your filters or add a new transaction." />
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                  {/* Table header */}
                  <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/50 text-xs font-medium text-gray-500 uppercase">
                    <div className="col-span-1 flex items-center">
                      <input type="checkbox" checked={selectedIds.size === transactions.length} onChange={toggleSelectAll} className="rounded" />
                    </div>
                    <div className="col-span-3 flex items-center gap-1 cursor-pointer" onClick={() => toggleSort('description')}>
                      Description
                      {sortField === 'description' && (sortDir === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                    </div>
                    <div className="col-span-2 flex items-center gap-1 cursor-pointer" onClick={() => toggleSort('category')}>
                      Category
                    </div>
                    <div className="col-span-2 flex items-center gap-1 cursor-pointer" onClick={() => toggleSort('date')}>
                      Date
                      {sortField === 'date' && (sortDir === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                    </div>
                    <div className="col-span-2 flex items-center gap-1 cursor-pointer text-right justify-end" onClick={() => toggleSort('amount')}>
                      Amount
                      {sortField === 'amount' && (sortDir === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                    </div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>

                  {/* Transaction rows */}
                  {transactions.map((txn, i) => {
                    const isIncome = txn.type === 'income';
                    const absAmount = Math.abs(txn.amount || 0);
                    const selected = selectedIds.has(txn._id);
                    return (
                      <div
                        key={txn._id || i}
                        className={`grid grid-cols-12 gap-4 px-5 py-3.5 items-center border-b border-gray-50 dark:border-gray-700/30 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors ${selected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                      >
                        <div className="col-span-1 hidden sm:flex items-center">
                          <input type="checkbox" checked={selected} onChange={() => toggleSelect(txn._id)} className="rounded" />
                        </div>
                        <div className="col-span-8 sm:col-span-3 flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg flex-shrink-0 ${isIncome ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                            {isIncome ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /> : <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {txn.description || txn.merchant || txn.title || 'Transaction'}
                            </p>
                            {txn.notes && <p className="text-xs text-gray-400 truncate mt-0.5">{txn.notes}</p>}
                          </div>
                        </div>
                        <div className="col-span-4 sm:col-span-2 hidden sm:flex">
                          {txn.category && <CategoryPill category={txn.category} />}
                        </div>
                        <div className="col-span-4 sm:col-span-2 hidden sm:block">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {txn.date ? new Date(txn.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                          </span>
                        </div>
                        <div className="col-span-3 sm:col-span-2 text-right">
                          <span className={`text-sm font-bold ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>
                            {isIncome ? '+' : '-'}₹{absAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="col-span-1 sm:col-span-2 flex justify-end gap-1">
                          <button
                            onClick={() => handleDelete(txn._id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Pagination */}
                  <div className="flex items-center justify-between px-5 py-3 bg-gray-50/50 dark:bg-gray-800/50">
                    <span className="text-xs text-gray-400">
                      Page {page} of {totalPages || 1} ({totalCount} total)
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <AddTransactionModal show={showAddModal} onClose={() => setShowAddModal(false)} onAdd={handleAddTransaction} />

        </div>
      </PageTransition>
    </MainLayout>
  );
};

export default EnhancedTransactionManagerV2;
