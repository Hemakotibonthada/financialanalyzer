// ============================================================
// Gmail Inbox Page — Browse, search, and manage synced financial emails
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useWebSocket } from '../context/WebSocketContext';
import MainLayout from '../components/MainLayout';
import gmailEnhancedService from '../services/gmailEnhancedService';
import {
  Mail, Search, RefreshCw, Star, StarOff, Trash2, Eye, EyeOff,
  Download, Filter, ChevronLeft, ChevronRight, Loader2, AlertCircle,
  CheckCircle, Clock, DollarSign, CreditCard, Building2, FileText,
  ArrowUpRight, ArrowDownRight, Tag, Paperclip, Calendar, X, ChevronDown,
  Inbox, Archive, Send, BarChart2, Shield, Zap, TrendingUp, IndianRupee
} from 'lucide-react';

const GmailInboxPage = () => {
  const { mode } = useTheme();
  const dk = mode === 'dark' || mode === 'black';
  const { socket } = useWebSocket();

  // ── State ──
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmails, setTotalEmails] = useState(0);
  const PAGE_SIZE = 25;

  // ── Data Loading ──
  const loadEmails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit: PAGE_SIZE,
        sort: sortBy === 'newest' ? '-receivedAt' : sortBy === 'oldest' ? 'receivedAt' : sortBy === 'amount' ? '-extractedAmount' : '-receivedAt',
      };
      if (searchQuery) params.search = searchQuery;
      if (filterCategory !== 'all') params.category = filterCategory;
      if (filterType !== 'all') params.type = filterType;

      const res = await gmailEnhancedService.listEmails(params);
      const data = res.data?.data || res.data;
      setEmails(Array.isArray(data?.emails) ? data.emails : Array.isArray(data) ? data : []);
      setTotalPages(data?.totalPages || 1);
      setTotalEmails(data?.total || data?.totalEmails || 0);
    } catch (err) {
      console.error('Load emails error:', err);
      setError('Failed to load emails. Make sure Gmail is synced.');
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, filterCategory, filterType, sortBy]);

  const loadStats = useCallback(async () => {
    try {
      const res = await gmailEnhancedService.getStats();
      setStats(res.data?.data || res.data);
    } catch (err) {
      console.error('Stats error:', err);
    }
  }, []);

  const loadSyncStatus = useCallback(async () => {
    try {
      const res = await gmailEnhancedService.getStatus();
      setSyncStatus(res.data?.data || res.data);
    } catch (err) {
      console.error('Sync status error:', err);
    }
  }, []);

  useEffect(() => {
    loadEmails();
    loadStats();
    loadSyncStatus();
  }, [loadEmails, loadStats, loadSyncStatus]);

  // Auto-reload data when sync completes (via WebSocket)
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      if (data.status === 'completed') {
        loadEmails();
        loadStats();
        loadSyncStatus();
      }
    };
    socket.on('gmailSyncProgress', handler);
    return () => socket.off('gmailSyncProgress', handler);
  }, [socket, loadEmails, loadStats, loadSyncStatus]);

  // ── Actions ──
  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);
      // Enhanced sync runs in background — progress shown via global WebSocket bar
      await gmailEnhancedService.sync({ maxResults: 500 });
      setSuccessMsg('Sync started! Progress bar will appear at the top of the screen.');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleStar = async (emailId) => {
    try {
      await gmailEnhancedService.starEmail(emailId);
      setEmails(prev => prev.map(e => e._id === emailId ? { ...e, isStarred: !e.isStarred } : e));
    } catch (err) {
      console.error('Star error:', err);
    }
  };

  const handleMarkRead = async (emailId) => {
    try {
      await gmailEnhancedService.markRead(emailId);
      setEmails(prev => prev.map(e => e._id === emailId ? { ...e, isRead: true } : e));
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const handleDelete = async (emailId) => {
    try {
      await gmailEnhancedService.deleteEmail(emailId);
      setEmails(prev => prev.filter(e => e._id !== emailId));
      if (selectedEmail?._id === emailId) setSelectedEmail(null);
      setSuccessMsg('Email deleted');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // ── Helpers ──
  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  const formatAmount = (amount) => {
    if (!amount && amount !== 0) return null;
    return `₹${Math.abs(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const getCategoryIcon = (cat) => {
    const icons = {
      banking: Building2, credit_card: CreditCard, upi: Zap, investment: TrendingUp,
      insurance: Shield, tax: FileText, salary: DollarSign, emi: IndianRupee,
      loan: Building2, utility: Clock, shopping: Tag, subscription: Archive
    };
    return icons[cat] || Mail;
  };

  const getCategoryColor = (cat) => {
    const colors = {
      banking: 'text-blue-500', credit_card: 'text-purple-500', upi: 'text-green-500',
      investment: 'text-teal-500', insurance: 'text-orange-500', tax: 'text-red-500',
      salary: 'text-emerald-500', emi: 'text-rose-500', loan: 'text-amber-500',
      utility: 'text-cyan-500', shopping: 'text-pink-500'
    };
    return colors[cat] || 'text-gray-500';
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'banking', label: 'Banking' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'upi', label: 'UPI' },
    { value: 'investment', label: 'Investment' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'tax', label: 'Tax' },
    { value: 'salary', label: 'Salary' },
    { value: 'emi', label: 'EMI' },
    { value: 'loan', label: 'Loan' },
    { value: 'utility', label: 'Utility' },
    { value: 'shopping', label: 'Shopping' },
  ];

  const transactionTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'credit', label: 'Credits (Income)' },
    { value: 'debit', label: 'Debits (Expense)' },
    { value: 'transfer', label: 'Transfers' },
  ];

  // ── Render ──
  return (
    <MainLayout title="Gmail Financial Inbox" subtitle="Browse and manage synced financial emails">
      <div className="space-y-4">
        {/* Status Alerts */}
        {error && (
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${dk ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}
        {successMsg && (
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${dk ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-green-50 border-green-200 text-green-700'}`}>
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{successMsg}</span>
          </div>
        )}

        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Emails', value: stats.totalEmails || 0, icon: Mail, color: 'blue' },
              { label: 'Transactions', value: stats.totalTransactions || 0, icon: DollarSign, color: 'green' },
              { label: 'Credits', value: formatAmount(stats.totalCredits) || '₹0', icon: ArrowDownRight, color: 'emerald' },
              { label: 'Debits', value: formatAmount(stats.totalDebits) || '₹0', icon: ArrowUpRight, color: 'red' },
              { label: 'Attachments', value: stats.totalAttachments || 0, icon: Paperclip, color: 'purple' },
              { label: 'Last Sync', value: stats.lastSync ? formatDate(stats.lastSync) : 'Never', icon: Clock, color: 'gray' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className={`p-3 rounded-xl border ${dk ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 text-${color}-500`} />
                  <span className={`text-xs font-medium ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{label}</span>
                </div>
                <div className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className={`flex flex-wrap items-center gap-3 p-4 rounded-xl border ${dk ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-gray-200'}`}>
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${dk ? 'text-slate-400' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search emails, senders, amounts..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm ${dk ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'} focus:ring-2 focus:ring-blue-500 outline-none`}
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium ${showFilters ? (dk ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700') : (dk ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-700')}`}
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg text-sm font-semibold shadow-md disabled:opacity-50 transition-all"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {syncing ? 'Syncing...' : 'Sync Gmail'}
          </button>
        </div>

        {/* Filter Row */}
        {showFilters && (
          <div className={`flex flex-wrap items-center gap-3 p-4 rounded-xl border ${dk ? 'bg-slate-800/40 border-slate-700/50' : 'bg-gray-50 border-gray-200'}`}>
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
              className={`px-3 py-2 rounded-lg border text-sm ${dk ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
            >
              {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              className={`px-3 py-2 rounded-lg border text-sm ${dk ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
            >
              {transactionTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm ${dk ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount">Highest Amount</option>
            </select>
            <button onClick={() => { setFilterCategory('all'); setFilterType('all'); setSortBy('newest'); setSearchQuery(''); }} className={`text-sm ${dk ? 'text-blue-400' : 'text-blue-600'} hover:underline`}>
              Clear All
            </button>
          </div>
        )}

        {/* Main Content: Email List + Detail */}
        <div className="flex gap-4" style={{ minHeight: '60vh' }}>
          {/* Email List */}
          <div className={`${selectedEmail ? 'w-2/5' : 'w-full'} border rounded-xl overflow-hidden transition-all ${dk ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-gray-200'}`}>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className={`w-8 h-8 animate-spin ${dk ? 'text-blue-400' : 'text-blue-500'}`} />
              </div>
            ) : emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <Inbox className={`w-16 h-16 mb-4 ${dk ? 'text-slate-600' : 'text-gray-300'}`} />
                <h3 className={`text-lg font-semibold mb-2 ${dk ? 'text-white' : 'text-gray-900'}`}>No emails found</h3>
                <p className={`text-sm mb-4 ${dk ? 'text-slate-400' : 'text-gray-500'}`}>
                  {searchQuery || filterCategory !== 'all' ? 'Try adjusting your filters' : 'Click "Sync Gmail" to fetch financial emails'}
                </p>
                <button onClick={handleSync} disabled={syncing}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium">
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/30">
                {emails.map((email) => {
                  const CatIcon = getCategoryIcon(email.category);
                  const isSelected = selectedEmail?._id === email._id;
                  return (
                    <div
                      key={email._id}
                      onClick={() => { setSelectedEmail(email); handleMarkRead(email._id); }}
                      className={`flex items-start gap-3 p-4 cursor-pointer transition-colors ${
                        isSelected
                          ? (dk ? 'bg-blue-500/15' : 'bg-blue-50')
                          : (dk ? 'hover:bg-slate-700/40' : 'hover:bg-gray-50')
                      } ${!email.isRead ? (dk ? 'border-l-2 border-l-blue-500' : 'border-l-2 border-l-blue-500 bg-blue-50/50') : ''}`}
                    >
                      {/* Category Icon */}
                      <div className={`mt-0.5 flex-shrink-0 ${getCategoryColor(email.category)}`}>
                        <CatIcon className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold truncate ${!email.isRead ? (dk ? 'text-white' : 'text-gray-900') : (dk ? 'text-slate-300' : 'text-gray-700')}`}>
                            {email.senderName || email.from?.split('<')[0]?.trim() || 'Unknown'}
                          </span>
                          {email.hasAttachments && <Paperclip className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                          <span className={`ml-auto text-xs flex-shrink-0 ${dk ? 'text-slate-500' : 'text-gray-400'}`}>
                            {formatDate(email.receivedAt || email.date)}
                          </span>
                        </div>
                        <p className={`text-sm truncate mt-0.5 ${!email.isRead ? (dk ? 'text-slate-200' : 'text-gray-800') : (dk ? 'text-slate-400' : 'text-gray-600')}`}>
                          {email.subject || '(No subject)'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {email.extractedAmount != null && (
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                              email.transactionType === 'credit'
                                ? (dk ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700')
                                : (dk ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700')
                            }`}>
                              {email.transactionType === 'credit' ? '+' : '-'}{formatAmount(email.extractedAmount)}
                            </span>
                          )}
                          {email.category && email.category !== 'other' && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${dk ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                              {email.category.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Star */}
                      <button onClick={(e) => { e.stopPropagation(); handleStar(email._id); }} className="flex-shrink-0 mt-0.5">
                        {email.isStarred
                          ? <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          : <Star className={`w-4 h-4 ${dk ? 'text-slate-600 hover:text-yellow-500' : 'text-gray-300 hover:text-yellow-500'}`} />
                        }
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={`flex items-center justify-between px-4 py-3 border-t ${dk ? 'border-slate-700/50' : 'border-gray-200'}`}>
                <span className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>
                  Page {page} of {totalPages} ({totalEmails} emails)
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className={`p-1.5 rounded ${dk ? 'hover:bg-slate-700 disabled:text-slate-600' : 'hover:bg-gray-100 disabled:text-gray-300'}`}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className={`p-1.5 rounded ${dk ? 'hover:bg-slate-700 disabled:text-slate-600' : 'hover:bg-gray-100 disabled:text-gray-300'}`}>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Email Detail Panel */}
          {selectedEmail && (
            <div className={`w-3/5 border rounded-xl overflow-hidden ${dk ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-gray-200'}`}>
              {/* Header */}
              <div className={`p-4 border-b ${dk ? 'border-slate-700/50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>
                    {selectedEmail.subject || '(No subject)'}
                  </h2>
                  <button onClick={() => setSelectedEmail(null)}
                    className={`p-1.5 rounded-lg ${dk ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`text-sm ${dk ? 'text-slate-300' : 'text-gray-700'}`}>
                    <strong>From:</strong> {selectedEmail.from || selectedEmail.senderName || 'Unknown'}
                  </span>
                  <span className={`text-xs ${dk ? 'text-slate-500' : 'text-gray-400'}`}>
                    {new Date(selectedEmail.receivedAt || selectedEmail.date).toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={() => handleStar(selectedEmail._id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border ${dk ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {selectedEmail.isStarred ? <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" /> : <StarOff className="w-3.5 h-3.5" />}
                    {selectedEmail.isStarred ? 'Unstar' : 'Star'}
                  </button>
                  <button onClick={() => handleDelete(selectedEmail._id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border ${dk ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-red-200 text-red-600 hover:bg-red-50'}`}>
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>

              {/* Extracted Data */}
              {(selectedEmail.extractedAmount != null || selectedEmail.category) && (
                <div className={`mx-4 mt-4 p-4 rounded-xl border ${dk ? 'bg-slate-700/40 border-slate-600/50' : 'bg-blue-50 border-blue-200'}`}>
                  <h3 className={`text-sm font-semibold mb-3 ${dk ? 'text-blue-400' : 'text-blue-700'}`}>
                    <Zap className="w-4 h-4 inline mr-1" />AI-Extracted Data
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {selectedEmail.extractedAmount != null && (
                      <div>
                        <span className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Amount</span>
                        <p className={`text-lg font-bold ${selectedEmail.transactionType === 'credit' ? 'text-green-500' : 'text-red-500'}`}>
                          {selectedEmail.transactionType === 'credit' ? '+' : '-'}{formatAmount(selectedEmail.extractedAmount)}
                        </p>
                      </div>
                    )}
                    {selectedEmail.category && (
                      <div>
                        <span className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Category</span>
                        <p className={`text-sm font-semibold capitalize ${dk ? 'text-white' : 'text-gray-900'}`}>
                          {selectedEmail.category.replace(/_/g, ' ')}
                        </p>
                      </div>
                    )}
                    {selectedEmail.transactionType && (
                      <div>
                        <span className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Type</span>
                        <p className={`text-sm font-semibold capitalize ${dk ? 'text-white' : 'text-gray-900'}`}>
                          {selectedEmail.transactionType}
                        </p>
                      </div>
                    )}
                    {selectedEmail.aiConfidence != null && (
                      <div>
                        <span className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>AI Confidence</span>
                        <p className={`text-sm font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>
                          {Math.round(selectedEmail.aiConfidence * 100)}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Email Body */}
              <div className="p-4 overflow-y-auto" style={{ maxHeight: '400px' }}>
                {selectedEmail.bodyText || selectedEmail.snippet ? (
                  <div className={`text-sm whitespace-pre-wrap leading-relaxed ${dk ? 'text-slate-300' : 'text-gray-700'}`}>
                    {selectedEmail.bodyText || selectedEmail.snippet}
                  </div>
                ) : (
                  <p className={`text-sm italic ${dk ? 'text-slate-500' : 'text-gray-400'}`}>No email body available</p>
                )}
              </div>

              {/* Attachments */}
              {selectedEmail.attachments?.length > 0 && (
                <div className={`mx-4 mb-4 p-4 rounded-xl border ${dk ? 'bg-slate-700/30 border-slate-600/50' : 'bg-gray-50 border-gray-200'}`}>
                  <h3 className={`text-sm font-semibold mb-2 ${dk ? 'text-white' : 'text-gray-900'}`}>
                    <Paperclip className="w-4 h-4 inline mr-1" />Attachments ({selectedEmail.attachments.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedEmail.attachments.map((att, i) => (
                      <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${dk ? 'bg-slate-700/50' : 'bg-white'}`}>
                        <FileText className={`w-4 h-4 ${dk ? 'text-slate-400' : 'text-gray-400'}`} />
                        <span className={`text-sm flex-1 truncate ${dk ? 'text-slate-300' : 'text-gray-700'}`}>
                          {att.filename || att.name || 'Attachment'}
                        </span>
                        <span className={`text-xs ${dk ? 'text-slate-500' : 'text-gray-400'}`}>
                          {att.size ? `${(att.size / 1024).toFixed(0)} KB` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default GmailInboxPage;
