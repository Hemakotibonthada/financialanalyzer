import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Calendar, Download, Filter, Search,
  ChevronLeft, ChevronRight, ArrowUpDown, Eye, EyeOff, Tag, Clock,
  BarChart3, PieChart, Layers, CreditCard, Wallet, MapPin, FileText,
  RefreshCw, Plus, Edit2, Trash2, MoreHorizontal, CheckCircle, XCircle,
  ArrowUp, ArrowDown, X, SlidersHorizontal, Grid, List as ListIcon
} from 'lucide-react';
import MainLayout from '../components/MainLayout';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../services/api';
import { FadeIn, PageTransition, StaggerChildren, CardSkeleton } from '../components/ui/AnimatedComponents';

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

const CATEGORIES = [
  'All', 'Food & Dining', 'Transportation', 'Shopping', 'Bills & Utilities',
  'Entertainment', 'Healthcare', 'Education', 'Rent', 'Groceries',
  'Fuel', 'Salary', 'Investment', 'Insurance', 'Travel', 'Personal Care', 'Other'
];

const TransactionManager = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [type, setType] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [view, setView] = useState('list');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [amountRange, setAmountRange] = useState({ min: '', max: '' });
  const [selectedTxns, setSelectedTxns] = useState(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [newTransaction, setNewTransaction] = useState({
    description: '', amount: '', category: 'Food & Dining', type: 'expense', date: new Date().toISOString().split('T')[0], notes: ''
  });

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20, sort: `${sortOrder === 'desc' ? '-' : ''}${sortBy}` };
      if (search) params.search = search;
      if (category !== 'All') params.category = category;
      if (type !== 'all') params.type = type;
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;
      if (amountRange.min) params.minAmount = amountRange.min;
      if (amountRange.max) params.maxAmount = amountRange.max;

      const res = await api.get('/financial/transactions', { params });
      const data = res.data?.data || res.data;
      setTransactions(data?.transactions || data || []);
      setTotalPages(data?.totalPages || Math.ceil((data?.total || 0) / 20) || 1);

      // Calculate statistics
      const txns = data?.transactions || data || [];
      const totalIncome = txns.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
      const totalExpenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const categoryBreakdown = {};
      txns.forEach(t => {
        const cat = t.category || 'Other';
        categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + Math.abs(t.amount || 0);
      });
      setStatistics({
        totalIncome, totalExpenses, net: totalIncome - totalExpenses,
        count: txns.length,
        categoryBreakdown: Object.entries(categoryBreakdown).map(([name, value], i) => ({
          name, value, color: COLORS[i % COLORS.length]
        }))
      });
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortOrder, search, category, type, dateRange, amountRange]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const handleAddTransaction = async () => {
    try {
      const payload = { ...newTransaction, amount: parseFloat(newTransaction.amount) };
      if (editingTxn) {
        await api.put(`/financial/transactions/${editingTxn._id}`, payload);
      } else {
        await api.post('/financial/transactions', payload);
      }
      setShowAddModal(false);
      setEditingTxn(null);
      setNewTransaction({ description: '', amount: '', category: 'Food & Dining', type: 'expense', date: new Date().toISOString().split('T')[0], notes: '' });
      fetchTransactions();
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await api.delete(`/financial/transactions/${id}`);
      fetchTransactions();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedTxns.size} transactions?`)) return;
    try {
      await Promise.all([...selectedTxns].map(id => api.delete(`/financial/transactions/${id}`)));
      setSelectedTxns(new Set());
      fetchTransactions();
    } catch (err) {
      console.error('Bulk delete error:', err);
    }
  };

  const toggleSelect = (id) => {
    setSelectedTxns(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedTxns.size === transactions.length) {
      setSelectedTxns(new Set());
    } else {
      setSelectedTxns(new Set(transactions.map(t => t._id)));
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const exportCSV = () => {
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount'];
    const rows = transactions.map(t => [
      new Date(t.date).toLocaleDateString(), t.description, t.category, t.type, t.amount
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'transactions.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearch(''); setCategory('All'); setType('all');
    setDateRange({ start: '', end: '' });
    setAmountRange({ min: '', max: '' });
    setPage(1);
  };

  return (
    <MainLayout title="Transaction Manager">
    <PageTransition>
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 animate-fade-in-down">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transaction Manager</h1>
          <p className="text-slate-500 dark:text-slate-400">Track, search, and manage all your transactions</p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <Download size={16} /> Export
          </button>
          <button onClick={() => { setEditingTxn(null); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30">
            <Plus size={16} /> Add Transaction
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 dashboard-grid">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <TrendingUp size={18} className="text-emerald-600" />
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400">Total Income</span>
            </div>
            <p className="text-xl font-bold text-emerald-600">₹{statistics.totalIncome.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <TrendingDown size={18} className="text-red-600" />
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400">Total Expenses</span>
            </div>
            <p className="text-xl font-bold text-red-600">₹{statistics.totalExpenses.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Wallet size={18} className="text-blue-600" />
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400">Net Balance</span>
            </div>
            <p className={`text-xl font-bold ${statistics.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {statistics.net >= 0 ? '+' : ''}₹{statistics.net.toLocaleString()}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Layers size={18} className="text-purple-600" />
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400">Transactions</span>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{statistics.count}</p>
          </div>
        </StaggerChildren>
      )}

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6 animate-fade-in-up">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search transactions..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
          </div>
          <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}
            className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
            {['all', 'income', 'expense'].map(t => (
              <button key={t} onClick={() => { setType(t); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  type === t ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
            ))}
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl border transition-colors ${showFilters ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
            <SlidersHorizontal size={18} />
          </button>
          <div className="flex gap-1">
            <button onClick={() => setView('list')} className={`p-2.5 rounded-xl ${view === 'list' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}>
              <ListIcon size={18} />
            </button>
            <button onClick={() => setView('grid')} className={`p-2.5 rounded-xl ${view === 'grid' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}>
              <Grid size={18} />
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in-down">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Start Date</label>
              <input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">End Date</label>
              <input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Min Amount</label>
              <input type="number" value={amountRange.min} onChange={e => setAmountRange(p => ({ ...p, min: e.target.value }))} placeholder="₹0"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Max Amount</label>
              <input type="number" value={amountRange.max} onChange={e => setAmountRange(p => ({ ...p, max: e.target.value }))} placeholder="₹∞"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white" />
            </div>
            <div className="md:col-span-4 flex justify-end">
              <button onClick={clearFilters} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedTxns.size > 0 && (
        <div className="flex items-center gap-4 mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 animate-fade-in-down">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {selectedTxns.size} selected
          </span>
          <button onClick={handleBulkDelete} className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
            <Trash2 size={14} /> Delete Selected
          </button>
          <button onClick={() => setSelectedTxns(new Set())} className="text-sm text-slate-500 hover:text-slate-700">
            Deselect All
          </button>
        </div>
      )}

      {/* Transactions Table/Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                  <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            ))}
          </div>
        ) : view === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3 text-left w-10">
                    <input type="checkbox" checked={selectedTxns.size === transactions.length && transactions.length > 0}
                      onChange={selectAll} className="rounded" />
                  </th>
                  {[
                    { key: 'date', label: 'Date', icon: Calendar },
                    { key: 'description', label: 'Description', icon: FileText },
                    { key: 'category', label: 'Category', icon: Tag },
                    { key: 'type', label: 'Type', icon: ArrowUpDown },
                    { key: 'amount', label: 'Amount', icon: DollarSign },
                  ].map(col => (
                    <th key={col.key} onClick={() => handleSort(col.key)}
                      className="p-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:text-blue-600 transition-colors select-none">
                      <div className="flex items-center gap-1">
                        <col.icon size={14} />
                        {col.label}
                        {sortBy === col.key && (
                          sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="p-3 text-right text-xs font-semibold text-slate-500 w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn, i) => (
                  <tr key={txn._id || i}
                    className={`border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors animate-fade-in-up ${
                      selectedTxns.has(txn._id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                    }`} style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="p-3">
                      <input type="checkbox" checked={selectedTxns.has(txn._id)} onChange={() => toggleSelect(txn._id)} className="rounded" />
                    </td>
                    <td className="p-3 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {new Date(txn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-3">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-xs">
                        {txn.description || txn.category}
                      </p>
                      {txn.notes && <p className="text-xs text-slate-400 truncate">{txn.notes}</p>}
                    </td>
                    <td className="p-3">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300">
                        {txn.category}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${
                        txn.type === 'income' ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        'text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {txn.type === 'income' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {txn.type}
                      </span>
                    </td>
                    <td className={`p-3 text-sm font-semibold ${txn.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {txn.type === 'income' ? '+' : '-'}₹{Math.abs(txn.amount || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditingTxn(txn); setNewTransaction({ ...txn, amount: Math.abs(txn.amount), date: txn.date?.split('T')[0] }); setShowAddModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(txn._id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
            {transactions.map((txn, i) => (
              <div key={txn._id || i}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 animate-fade-in-up cursor-pointer"
                style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${txn.type === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    {txn.type === 'income' ? <TrendingUp size={16} className="text-emerald-600" /> : <TrendingDown size={16} className="text-red-600" />}
                  </div>
                  <span className="text-xs text-slate-400">{new Date(txn.date).toLocaleDateString()}</span>
                </div>
                <p className="font-medium text-slate-900 dark:text-white truncate mb-1">{txn.description || txn.category}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{txn.category}</p>
                <p className={`text-lg font-bold ${txn.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {txn.type === 'income' ? '+' : '-'}₹{Math.abs(txn.amount || 0).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {!loading && transactions.length === 0 && (
          <div className="text-center py-16">
            <FileText size={48} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No transactions found</h3>
            <p className="text-sm text-slate-500 mb-4">Try adjusting your filters or add new transactions</p>
            <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
              <Plus size={16} className="inline mr-1" /> Add Transaction
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700">
                <ChevronLeft size={16} className="text-slate-600 dark:text-slate-400" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page + i - 2;
                if (p > totalPages || p < 1) return null;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                      page === p ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}>{p}</button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700">
                <ChevronRight size={16} className="text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Category Chart */}
      {statistics?.categoryBreakdown?.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Category Breakdown</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={statistics.categoryBreakdown}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => `₹${Number(v).toLocaleString()}`} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {statistics.categoryBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <RePieChart>
                <Pie data={statistics.categoryBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value">
                  {statistics.categoryBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={v => `₹${Number(v).toLocaleString()}`} />
                <Legend />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingTxn ? 'Edit Transaction' : 'Add Transaction'}
              </h2>
              <button onClick={() => { setShowAddModal(false); setEditingTxn(null); }}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Description</label>
                <input type="text" value={newTransaction.description} onChange={e => setNewTransaction(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  placeholder="e.g., Grocery shopping" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Amount (₹)</label>
                  <input type="number" value={newTransaction.amount} onChange={e => setNewTransaction(p => ({ ...p, amount: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                    placeholder="0.00" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Date</label>
                  <input type="date" value={newTransaction.date} onChange={e => setNewTransaction(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Category</label>
                  <select value={newTransaction.category} onChange={e => setNewTransaction(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white">
                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Type</label>
                  <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {['expense', 'income'].map(t => (
                      <button key={t} onClick={() => setNewTransaction(p => ({ ...p, type: t }))}
                        className={`flex-1 py-3 text-sm font-medium transition-all ${
                          newTransaction.type === t
                            ? t === 'income' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                            : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                        }`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Notes (optional)</label>
                <textarea value={newTransaction.notes} onChange={e => setNewTransaction(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white resize-none"
                  rows={2} placeholder="Additional notes..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowAddModal(false); setEditingTxn(null); }}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                  Cancel
                </button>
                <button onClick={handleAddTransaction}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30"
                  disabled={!newTransaction.description || !newTransaction.amount}>
                  {editingTxn ? 'Update' : 'Add'} Transaction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </PageTransition>
    </MainLayout>
  );
};

export default TransactionManager;
