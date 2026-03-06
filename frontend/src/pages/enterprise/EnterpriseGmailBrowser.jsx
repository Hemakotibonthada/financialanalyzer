// ============================================================================
// ENTERPRISE GMAIL BROWSER — Email Transaction Intelligence
// ============================================================================
// Browse, search, and analyze financial emails from Gmail. View parsed
// transactions, sync status, connection management, and email-sourced
// spending analytics.
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Mail, MailOpen, RefreshCw, Search, Filter, Download, CheckCircle2,
  AlertTriangle, Clock, ArrowUpRight, ArrowDownRight, CreditCard,
  Building2, Banknote, Wallet, ChevronRight, ChevronDown, Link2,
  Unlink, MailCheck, MailX, Inbox, Send, Star, Tag, CalendarDays,
  TrendingUp, DollarSign, Eye, BarChart3, Loader2, X, Settings,
  ArrowRightLeft, Zap, Shield, Globe, ExternalLink,
} from 'lucide-react';
import MainLayout from '../../components/MainLayout';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import {
  PageTransition, AnimatedCard, GlassCard, Badge,
  StatusBadge, AnimatedTabs, Shimmer,
} from '../../components/enterprise/EnterpriseAnimationSystem';

// ── Payment method icons ────────────────────────────────────────────────────
const PAYMENT_ICONS = {
  upi: Wallet, neft: ArrowRightLeft, rtgs: ArrowRightLeft,
  imps: Zap, card: CreditCard, net_banking: Globe,
  wallet: Wallet, cheque: Banknote, other: DollarSign,
};

// ── Category colors ─────────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  'Credit Card': '#ef4444', 'Salary & Income': '#22c55e',
  'EMI & Loans': '#f97316', 'Bank Transfer': '#3b82f6',
  'Bills & Utilities': '#a855f7', 'Insurance': '#06b6d4',
  'Investments': '#10b981', 'Tax': '#eab308',
  'E-commerce': '#ec4899', 'Subscriptions': '#8b5cf6',
  'Travel': '#14b8a6', 'Cashback & Rewards': '#84cc16',
  'General': '#6b7280',
};

export default function EnterpriseGmailBrowser() {
  const { mode } = useTheme();
  const isDark = mode === 'dark' || mode === 'black';

  // ── State ───────────────────────────────────────────────────────────────
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [emails, setEmails] = useState([]);
  const [emailTransactions, setEmailTransactions] = useState([]);
  const [syncStatus, setSyncStatus] = useState(null);
  const [autoSyncStats, setAutoSyncStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // ── Data Loading ────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, messagesRes, txRes] = await Promise.allSettled([
        api.get('/gmail/status'),
        api.get('/gmail/messages', { params: { limit: 100 } }),
        api.get('/financial/transactions', {
          params: { source: 'gmail_email', limit: 200, sort: '-date' },
        }),
      ]);

      if (statusRes.status === 'fulfilled') {
        setConnectionStatus(statusRes.value.data);
      }
      if (messagesRes.status === 'fulfilled') {
        setEmails(messagesRes.value.data?.messages || messagesRes.value.data || []);
      }
      if (txRes.status === 'fulfilled') {
        const txData = txRes.value.data?.transactions || txRes.value.data || [];
        setEmailTransactions(txData);
      }

      // Load auto-sync stats
      try {
        const autoRes = await api.get('/gmail/auto-sync-stats');
        setAutoSyncStats(autoRes.data);
      } catch { /* auto-sync stats optional */ }

    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Sync Gmail ──────────────────────────────────────────────────────────
  const handleSync = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await api.post('/gmail/sync', {
        dateAfter: new Date(Date.now() - parseInt(dateRange) * 86400000).toISOString(),
        maxResults: 200,
      });
      setSyncStatus(res.data);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [dateRange, loadData]);

  // ── Connect / Disconnect Gmail ──────────────────────────────────────────
  const handleConnect = useCallback(async () => {
    try {
      const res = await api.get('/gmail/auth-url');
      window.open(res.data.url || res.data.authUrl, '_blank', 'width=600,height=700');
    } catch (err) {
      setError('Failed to get auth URL');
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    if (!window.confirm('Disconnect Gmail? Existing synced data will be kept.')) return;
    try {
      await api.post('/gmail/disconnect');
      await loadData();
    } catch (err) {
      setError('Failed to disconnect');
    }
  }, [loadData]);

  // ── Filtered transactions ───────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    let txs = [...emailTransactions];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      txs = txs.filter(tx =>
        (tx.description || '').toLowerCase().includes(q) ||
        (tx.merchantName || '').toLowerCase().includes(q) ||
        (tx.category || '').toLowerCase().includes(q) ||
        (tx.emailMetadata?.subject || '').toLowerCase().includes(q)
      );
    }
    if (filterType !== 'all') {
      txs = txs.filter(tx => tx.type === filterType);
    }
    if (filterCategory !== 'all') {
      txs = txs.filter(tx => tx.category === filterCategory);
    }

    return txs;
  }, [emailTransactions, searchQuery, filterType, filterCategory]);

  const paginatedTx = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, page]);

  const totalPages = Math.ceil(filteredTransactions.length / pageSize);

  // ── Stats ───────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalIncome = emailTransactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalExpenses = emailTransactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const categories = {};
    emailTransactions.forEach(t => {
      const cat = t.category || 'General';
      categories[cat] = (categories[cat] || 0) + (t.amount || 0);
    });

    const paymentMethods = {};
    emailTransactions.forEach(t => {
      const pm = t.paymentMethod || 'other';
      paymentMethods[pm] = (paymentMethods[pm] || 0) + 1;
    });

    return { totalIncome, totalExpenses, categories, paymentMethods };
  }, [emailTransactions]);

  const uniqueCategories = useMemo(
    () => [...new Set(emailTransactions.map(t => t.category).filter(Boolean))],
    [emailTransactions]
  );

  // ── Styles ──────────────────────────────────────────────────────────────
  const cardStyle = {
    background: isDark ? 'rgba(30,30,40,0.85)' : 'rgba(255,255,255,0.95)',
    borderRadius: 16, border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
    padding: 20, backdropFilter: 'blur(20px)',
  };
  const inputStyle = {
    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
    borderRadius: 10, padding: '8px 14px', color: isDark ? '#fff' : '#111',
    fontSize: 14, outline: 'none', width: '100%',
  };

  // ── Tab Content ─────────────────────────────────────────────────────────
  const tabs = ['Inbox', 'Transactions', 'Analytics', 'Settings'];

  const renderConnectionBanner = () => {
    const isConnected = connectionStatus?.isConnected || connectionStatus?.connected;
    return (
      <div style={{
        ...cardStyle, display: 'flex', alignItems: 'center', gap: 16,
        padding: '16px 20px', marginBottom: 20,
        borderColor: isConnected ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: isConnected ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isConnected ? <MailCheck size={24} color="#22c55e" /> : <MailX size={24} color="#ef4444" />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: isDark ? '#fff' : '#111' }}>
            {isConnected ? 'Gmail Connected' : 'Gmail Not Connected'}
          </div>
          <div style={{ fontSize: 13, color: isDark ? '#aaa' : '#666', marginTop: 2 }}>
            {isConnected
              ? `Syncing as ${connectionStatus?.email || 'your account'} • Last sync: ${connectionStatus?.lastSync ? new Date(connectionStatus.lastSync).toLocaleString() : 'Never'}`
              : 'Connect your Gmail to automatically import financial transactions from emails'}
          </div>
        </div>
        {isConnected ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSync} disabled={syncing}
              style={{
                padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff',
                fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
                opacity: syncing ? 0.7 : 1,
              }}>
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
            <button onClick={handleDisconnect}
              style={{
                padding: '8px 16px', borderRadius: 10, border: `1px solid ${isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)'}`,
                background: 'transparent', color: '#ef4444', cursor: 'pointer',
                fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
              }}>
              <Unlink size={14} /> Disconnect
            </button>
          </div>
        ) : (
          <button onClick={handleConnect}
            style={{
              padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff',
              fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
            }}>
            <Link2 size={16} /> Connect Gmail
          </button>
        )}
      </div>
    );
  };

  // ── Render Inbox Tab ────────────────────────────────────────────────────
  const renderInboxTab = () => (
    <div>
      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: isDark ? '#888' : '#999' }} />
          <input type="text" placeholder="Search emails..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 36 }} />
        </div>
        <select value={dateRange} onChange={e => setDateRange(e.target.value)}
          style={{ ...inputStyle, width: 'auto', minWidth: 120 }}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="180">Last 6 months</option>
          <option value="365">Last year</option>
        </select>
      </div>

      {/* Email List */}
      {emails.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 40 }}>
          <Inbox size={48} style={{ color: isDark ? '#555' : '#ccc', margin: '0 auto 16px' }} />
          <div style={{ fontWeight: 600, color: isDark ? '#aaa' : '#666' }}>No emails synced yet</div>
          <div style={{ fontSize: 13, color: isDark ? '#777' : '#999', marginTop: 8 }}>
            Click "Sync Now" to import financial emails from Gmail
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {emails.slice(0, 50).map((email, i) => {
            const isSelected = selectedEmail?.id === email.id;
            return (
              <div key={email.id || i} onClick={() => setSelectedEmail(isSelected ? null : email)}
                style={{
                  ...cardStyle, padding: '12px 16px', cursor: 'pointer',
                  borderColor: isSelected ? 'rgba(59,130,246,0.4)' : cardStyle.borderColor,
                  background: isSelected
                    ? (isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)')
                    : cardStyle.background,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                <div style={{ color: isDark ? '#3b82f6' : '#2563eb' }}>
                  {isSelected ? <MailOpen size={18} /> : <Mail size={18} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 600, fontSize: 14, color: isDark ? '#fff' : '#111',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {email.subject || '(No subject)'}
                  </div>
                  <div style={{
                    fontSize: 12, color: isDark ? '#888' : '#999', marginTop: 2,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {email.from} • {email.date ? new Date(email.date).toLocaleDateString() : ''}
                  </div>
                </div>
                <ChevronRight size={16} style={{
                  color: isDark ? '#555' : '#ccc',
                  transform: isSelected ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.2s',
                }} />
              </div>
            );
          })}
        </div>
      )}

      {/* Email Detail Preview */}
      {selectedEmail && (
        <div style={{ ...cardStyle, marginTop: 16, padding: 20 }}>
          <h3 style={{ margin: '0 0 8px', color: isDark ? '#fff' : '#111', fontSize: 16 }}>
            {selectedEmail.subject}
          </h3>
          <div style={{ fontSize: 13, color: isDark ? '#aaa' : '#666', marginBottom: 12 }}>
            From: {selectedEmail.from} • {selectedEmail.date ? new Date(selectedEmail.date).toLocaleString() : ''}
          </div>
          <div style={{
            fontSize: 13, color: isDark ? '#ccc' : '#444',
            lineHeight: 1.6, maxHeight: 200, overflowY: 'auto',
            padding: 12, borderRadius: 8,
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          }}>
            {selectedEmail.snippet || selectedEmail.bodyText || '(No preview available)'}
          </div>
        </div>
      )}
    </div>
  );

  // ── Render Transactions Tab ─────────────────────────────────────────────
  const renderTransactionsTab = () => (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: isDark ? '#888' : '#999' }} />
          <input type="text" placeholder="Search transactions..." value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            style={{ ...inputStyle, paddingLeft: 36 }} />
        </div>
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}
          style={{ ...inputStyle, width: 'auto', minWidth: 100 }}>
          <option value="all">All Types</option>
          <option value="debit">Debits</option>
          <option value="credit">Credits</option>
        </select>
        <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }}
          style={{ ...inputStyle, width: 'auto', minWidth: 140 }}>
          <option value="all">All Categories</option>
          {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total Transactions', value: emailTransactions.length, icon: Mail, color: '#3b82f6' },
          { label: 'Total Income', value: `₹${stats.totalIncome.toLocaleString()}`, icon: ArrowDownRight, color: '#22c55e' },
          { label: 'Total Expenses', value: `₹${stats.totalExpenses.toLocaleString()}`, icon: ArrowUpRight, color: '#ef4444' },
          { label: 'Categories', value: uniqueCategories.length, icon: Tag, color: '#a855f7' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ ...cardStyle, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: isDark ? '#aaa' : '#888' }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: isDark ? '#fff' : '#111', marginTop: 2 }}>
                {value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Transaction Table */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                {['Date', 'Description', 'Amount', 'Type', 'Category', 'Payment', 'Source'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left', fontWeight: 600,
                    color: isDark ? '#aaa' : '#666', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedTx.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: isDark ? '#666' : '#999' }}>
                    No email transactions found
                  </td>
                </tr>
              ) : paginatedTx.map((tx, i) => {
                const PayIcon = PAYMENT_ICONS[tx.paymentMethod] || DollarSign;
                return (
                  <tr key={tx._id || i} style={{
                    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                  }}>
                    <td style={{ padding: '10px 16px', color: isDark ? '#ccc' : '#444', whiteSpace: 'nowrap' }}>
                      {tx.date ? new Date(tx.date).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '10px 16px', color: isDark ? '#fff' : '#111', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.description}
                    </td>
                    <td style={{
                      padding: '10px 16px', fontWeight: 700, whiteSpace: 'nowrap',
                      color: tx.type === 'credit' ? '#22c55e' : '#ef4444',
                    }}>
                      {tx.type === 'credit' ? '+' : '-'}₹{(tx.amount || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: tx.type === 'credit' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                        color: tx.type === 'credit' ? '#22c55e' : '#ef4444',
                      }}>
                        {tx.type}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: `${CATEGORY_COLORS[tx.category] || '#6b7280'}20`,
                        color: CATEGORY_COLORS[tx.category] || '#6b7280',
                      }}>
                        {tx.category || 'General'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <PayIcon size={14} color={isDark ? '#aaa' : '#888'} />
                        <span style={{ fontSize: 12, color: isDark ? '#aaa' : '#888' }}>
                          {tx.paymentMethod || '—'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Mail size={12} color={isDark ? '#3b82f6' : '#2563eb'} />
                        <span style={{ fontSize: 11, color: isDark ? '#888' : '#aaa' }}>Gmail</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          }}>
            <span style={{ fontSize: 12, color: isDark ? '#888' : '#999' }}>
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredTransactions.length)} of {filteredTransactions.length}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, background: 'transparent', color: isDark ? '#ccc' : '#444', cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.4 : 1 }}>
                Prev
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, background: 'transparent', color: isDark ? '#ccc' : '#444', cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.4 : 1 }}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Render Analytics Tab ────────────────────────────────────────────────
  const renderAnalyticsTab = () => {
    const sortedCategories = Object.entries(stats.categories)
      .sort((a, b) => b[1] - a[1]);
    const totalCatAmount = sortedCategories.reduce((s, [, v]) => s + v, 0) || 1;

    const sortedPayments = Object.entries(stats.paymentMethods)
      .sort((a, b) => b[1] - a[1]);
    const totalPmCount = sortedPayments.reduce((s, [, v]) => s + v, 0) || 1;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Spending by Category */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: isDark ? '#fff' : '#111' }}>
            Spending by Category
          </h3>
          {sortedCategories.length === 0 ? (
            <p style={{ color: isDark ? '#666' : '#999', fontSize: 13 }}>No data</p>
          ) : sortedCategories.map(([cat, amount]) => {
            const pct = (amount / totalCatAmount * 100).toFixed(1);
            const color = CATEGORY_COLORS[cat] || '#6b7280';
            return (
              <div key={cat} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: isDark ? '#ddd' : '#333' }}>{cat}</span>
                  <span style={{ fontWeight: 600, color: isDark ? '#fff' : '#111' }}>
                    ₹{amount.toLocaleString()} ({pct}%)
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                  <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: color, transition: 'width 0.5s' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment Method Distribution */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: isDark ? '#fff' : '#111' }}>
            Payment Methods
          </h3>
          {sortedPayments.length === 0 ? (
            <p style={{ color: isDark ? '#666' : '#999', fontSize: 13 }}>No data</p>
          ) : sortedPayments.map(([pm, count]) => {
            const pct = (count / totalPmCount * 100).toFixed(1);
            const Icon = PAYMENT_ICONS[pm] || DollarSign;
            return (
              <div key={pm} style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
                padding: '8px 12px', borderRadius: 8,
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              }}>
                <Icon size={18} color={isDark ? '#aaa' : '#666'} />
                <span style={{ flex: 1, fontSize: 13, color: isDark ? '#ddd' : '#333', textTransform: 'uppercase' }}>{pm}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#fff' : '#111' }}>{count}</span>
                <span style={{ fontSize: 11, color: isDark ? '#888' : '#999' }}>({pct}%)</span>
              </div>
            );
          })}
        </div>

        {/* Monthly Trend */}
        <div style={{ ...cardStyle, gridColumn: 'span 2' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: isDark ? '#fff' : '#111' }}>
            Monthly Email Transactions
          </h3>
          {(() => {
            const monthly = {};
            emailTransactions.forEach(tx => {
              if (!tx.date) return;
              const key = new Date(tx.date).toISOString().slice(0, 7); // YYYY-MM
              if (!monthly[key]) monthly[key] = { income: 0, expenses: 0 };
              if (tx.type === 'credit') monthly[key].income += tx.amount || 0;
              else monthly[key].expenses += tx.amount || 0;
            });
            const sorted = Object.entries(monthly).sort((a, b) => a[0].localeCompare(b[0]));

            if (sorted.length === 0) return <p style={{ color: isDark ? '#666' : '#999', fontSize: 13 }}>No data</p>;

            const maxVal = Math.max(...sorted.flatMap(([, v]) => [v.income, v.expenses])) || 1;

            return sorted.map(([month, data]) => (
              <div key={month} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: isDark ? '#ddd' : '#333' }}>{month}</span>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <span style={{ color: '#22c55e' }}>+₹{data.income.toLocaleString()}</span>
                    <span style={{ color: '#ef4444' }}>-₹{data.expenses.toLocaleString()}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 2, height: 8 }}>
                  <div style={{ height: '100%', borderRadius: '3px 0 0 3px', width: `${(data.income / maxVal * 100).toFixed(1)}%`, background: '#22c55e', minWidth: data.income ? 4 : 0 }} />
                  <div style={{ height: '100%', borderRadius: '0 3px 3px 0', width: `${(data.expenses / maxVal * 100).toFixed(1)}%`, background: '#ef4444', minWidth: data.expenses ? 4 : 0 }} />
                </div>
              </div>
            ));
          })()}
        </div>
      </div>
    );
  };

  // ── Render Settings Tab ─────────────────────────────────────────────────
  const renderSettingsTab = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* Sync Settings */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: isDark ? '#fff' : '#111', display: 'flex', alignItems: 'center', gap: 8 }}>
          <RefreshCw size={18} /> Sync Settings
        </h3>
        <div style={{ fontSize: 13, color: isDark ? '#aaa' : '#666', marginBottom: 12 }}>
          Configure how often and how far back Gmail emails are synced.
        </div>
        <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: isDark ? '#ccc' : '#555' }}>
          Sync Window
        </label>
        <select value={dateRange} onChange={e => setDateRange(e.target.value)}
          style={{ ...inputStyle, marginBottom: 16, width: '100%' }}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 3 months</option>
          <option value="180">Last 6 months</option>
          <option value="365">Last 1 year</option>
        </select>
        <button onClick={handleSync} disabled={syncing}
          style={{
            padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff',
            fontWeight: 600, fontSize: 14, width: '100%',
            opacity: syncing ? 0.7 : 1,
          }}>
          {syncing ? 'Syncing...' : 'Manual Sync'}
        </button>
      </div>

      {/* Auto-Sync Status */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: isDark ? '#fff' : '#111', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={18} /> Auto-Sync Status
        </h3>
        {autoSyncStats ? (
          <div style={{ fontSize: 13 }}>
            {[
              { label: 'Status', value: autoSyncStats.enabled ? 'Active' : 'Disabled', color: autoSyncStats.enabled ? '#22c55e' : '#ef4444' },
              { label: 'Total Runs', value: autoSyncStats.totalRuns },
              { label: 'Users Processed', value: autoSyncStats.totalUsersProcessed },
              { label: 'Transactions Imported', value: autoSyncStats.totalTransactionsCreated },
              { label: 'Last Run Duration', value: autoSyncStats.lastRunDuration ? `${(autoSyncStats.lastRunDuration / 1000).toFixed(1)}s` : '—' },
              { label: 'Next Run', value: autoSyncStats.nextRun ? new Date(autoSyncStats.nextRun).toLocaleString() : '—' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between', padding: '8px 0',
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
              }}>
                <span style={{ color: isDark ? '#aaa' : '#666' }}>{label}</span>
                <span style={{ fontWeight: 600, color: color || (isDark ? '#fff' : '#111') }}>{value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: isDark ? '#666' : '#999' }}>Auto-sync stats unavailable</p>
        )}
      </div>

      {/* Connection Info */}
      <div style={{ ...cardStyle, gridColumn: 'span 2' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: isDark ? '#fff' : '#111', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={18} /> Connection Details
        </h3>
        {connectionStatus ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
            {[
              { label: 'Connected Email', value: connectionStatus.email || '—' },
              { label: 'Connected', value: connectionStatus.isConnected || connectionStatus.connected ? 'Yes' : 'No' },
              { label: 'Last Sync', value: connectionStatus.lastSync ? new Date(connectionStatus.lastSync).toLocaleString() : 'Never' },
              { label: 'Total Messages Synced', value: connectionStatus.totalMessagesSynced || 0 },
              { label: 'Initial Sync Completed', value: connectionStatus.initialSyncCompleted ? 'Yes' : 'No' },
              { label: 'Scopes', value: connectionStatus.grantedScopes?.join(', ') || 'Standard' },
            ].map(({ label, value }) => (
              <div key={label} style={{
                padding: '8px 12px', borderRadius: 8,
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              }}>
                <div style={{ color: isDark ? '#888' : '#999', fontSize: 11, marginBottom: 2 }}>{label}</div>
                <div style={{ color: isDark ? '#fff' : '#111', fontWeight: 600 }}>{String(value)}</div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: isDark ? '#666' : '#999' }}>Not connected</p>
        )}
      </div>
    </div>
  );

  // ── Main Render ─────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{
              margin: 0, fontSize: 24, fontWeight: 800,
              color: isDark ? '#fff' : '#111',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Mail size={28} /> Gmail Intelligence
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: isDark ? '#aaa' : '#666' }}>
              Automatically extract and analyze financial transactions from your emails
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={loadData}
              style={{
                padding: '8px 14px', borderRadius: 10, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                background: 'transparent', color: isDark ? '#ccc' : '#555', cursor: 'pointer',
                fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
              }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{
            ...cardStyle, padding: '12px 16px', marginBottom: 16,
            borderColor: 'rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <AlertTriangle size={16} color="#ef4444" />
            <span style={{ color: '#ef4444', fontSize: 13 }}>{error}</span>
            <button onClick={() => setError(null)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Sync Results Banner */}
        {syncStatus && (
          <div style={{
            ...cardStyle, padding: '12px 16px', marginBottom: 16,
            borderColor: 'rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <CheckCircle2 size={18} color="#22c55e" />
            <div style={{ flex: 1, fontSize: 13, color: isDark ? '#ccc' : '#444' }}>
              Synced {syncStatus.processedEmails || 0} emails •{' '}
              {syncStatus.upiTransactionsCreated || 0} UPI transactions •{' '}
              {syncStatus.emailTransactionsCreated || 0} email transactions •{' '}
              {syncStatus.downloadedAttachments || 0} attachments
            </div>
            <button onClick={() => setSyncStatus(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#888' : '#aaa' }}>
              <X size={14} />
            </button>
          </div>
        )}

        {renderConnectionBanner()}

        {/* Loading */}
        {loading ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: 60 }}>
            <Loader2 size={32} style={{ margin: '0 auto 12px', color: '#3b82f6' }} className="animate-spin" />
            <div style={{ color: isDark ? '#aaa' : '#666', fontSize: 14 }}>Loading Gmail data...</div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
              {tabs.map((tab, i) => (
                <button key={tab} onClick={() => setActiveTab(i)}
                  style={{
                    padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    border: 'none', cursor: 'pointer',
                    color: activeTab === i ? '#fff' : (isDark ? '#aaa' : '#666'),
                    background: activeTab === i ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                  }}>
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 0 && renderInboxTab()}
            {activeTab === 1 && renderTransactionsTab()}
            {activeTab === 2 && renderAnalyticsTab()}
            {activeTab === 3 && renderSettingsTab()}
          </>
        )}
      </div>
    </MainLayout>
  );
}
