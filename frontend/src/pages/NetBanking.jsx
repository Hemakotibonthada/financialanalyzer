import React, { useState, useMemo, useEffect } from 'react';
import api from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
  Building, CreditCard, RefreshCw, Search, Plus, X, Link2,
  CheckCircle, AlertTriangle, Clock, ArrowUpRight, ArrowDownRight,
  Filter, Download, Upload, Tag, Wifi, WifiOff, Shield,
  ChevronDown, Eye, FileText
} from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

const fmt = (n) => {
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
};

const banks = [
  { id: 1, name: 'HDFC Bank', type: 'Savings', balance: 285000, lastSync: '2 min ago', status: 'connected', logo: '🏦', color: '#3B82F6' },
  { id: 2, name: 'SBI', type: 'Savings', balance: 145000, lastSync: '5 min ago', status: 'connected', logo: '🏛️', color: '#10B981' },
  { id: 3, name: 'ICICI Bank', type: 'Current', balance: 520000, lastSync: '15 min ago', status: 'connected', logo: '🏦', color: '#F59E0B' },
  { id: 4, name: 'Axis Bank', type: 'Savings', balance: 92000, lastSync: '1 hour ago', status: 'warning', logo: '🏛️', color: '#8B5CF6' },
  { id: 5, name: 'Kotak Mahindra', type: 'Savings', balance: 178000, lastSync: 'Failed', status: 'error', logo: '🏦', color: '#EF4444' },
];

const recentTransactions = [
  { id: 1, desc: 'Salary Credit', amount: 125000, type: 'credit', bank: 'HDFC Bank', date: '2026-02-25', category: 'Income', autoCategory: true },
  { id: 2, desc: 'Amazon Purchase', amount: -3499, type: 'debit', bank: 'HDFC Bank', date: '2026-02-25', category: 'Shopping', autoCategory: true },
  { id: 3, desc: 'Swiggy Order', amount: -450, type: 'debit', bank: 'HDFC Bank', date: '2026-02-24', category: 'Food', autoCategory: true },
  { id: 4, desc: 'SIP - Parag Parikh', amount: -10000, type: 'debit', bank: 'SBI', date: '2026-02-24', category: 'Investment', autoCategory: true },
  { id: 5, desc: 'Electricity Bill', amount: -2500, type: 'debit', bank: 'ICICI Bank', date: '2026-02-23', category: 'Utilities', autoCategory: true },
  { id: 6, desc: 'Rent Payment', amount: -25000, type: 'debit', bank: 'HDFC Bank', date: '2026-02-23', category: 'Rent', autoCategory: false },
  { id: 7, desc: 'Freelance Payment', amount: 15000, type: 'credit', bank: 'SBI', date: '2026-02-22', category: 'Income', autoCategory: false },
  { id: 8, desc: 'Netflix Subscription', amount: -649, type: 'debit', bank: 'ICICI Bank', date: '2026-02-22', category: 'Entertainment', autoCategory: true },
  { id: 9, desc: 'Petrol Pump', amount: -2000, type: 'debit', bank: 'Axis Bank', date: '2026-02-21', category: 'Transport', autoCategory: true },
  { id: 10, desc: 'Medical Store', amount: -850, type: 'debit', bank: 'HDFC Bank', date: '2026-02-21', category: 'Healthcare', autoCategory: true },
  { id: 11, desc: 'UPI Transfer In', amount: 5000, type: 'credit', bank: 'SBI', date: '2026-02-20', category: 'Transfer', autoCategory: false },
  { id: 12, desc: 'Grocery - BigBasket', amount: -3200, type: 'debit', bank: 'HDFC Bank', date: '2026-02-20', category: 'Groceries', autoCategory: true },
];

const categorySpending = [
  { name: 'Rent', HDFC: 25000, SBI: 0, ICICI: 0 },
  { name: 'Food', HDFC: 3200, SBI: 0, ICICI: 1800 },
  { name: 'Shopping', HDFC: 8500, SBI: 2000, ICICI: 3500 },
  { name: 'Utilities', HDFC: 2500, SBI: 1200, ICICI: 2500 },
  { name: 'Transport', HDFC: 2000, SBI: 0, ICICI: 1500 },
  { name: 'Investment', HDFC: 15000, SBI: 10000, ICICI: 5000 },
];

const reconciliation = [
  { bank: 'HDFC Bank', matched: 145, unmatched: 3, pending: 2 },
  { bank: 'SBI', matched: 62, unmatched: 1, pending: 0 },
  { bank: 'ICICI Bank', matched: 89, unmatched: 5, pending: 1 },
  { bank: 'Axis Bank', matched: 45, unmatched: 2, pending: 3 },
];

const categories = ['All', 'Income', 'Shopping', 'Food', 'Rent', 'Utilities', 'Investment', 'Entertainment', 'Transport', 'Healthcare', 'Groceries', 'Transfer'];

const connectionSteps = [
  { step: 1, title: 'Select Bank', desc: 'Choose your bank from the list' },
  { step: 2, title: 'Authenticate', desc: 'Login with your net banking credentials' },
  { step: 3, title: 'Authorize', desc: 'Grant read-only access to your accounts' },
  { step: 4, title: 'Sync Data', desc: 'Import your transactions automatically' },
];

export default function NetBanking() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterBank, setFilterBank] = useState('All');
  const [dateRange, setDateRange] = useState({ from: '2026-02-01', to: '2026-02-28' });
  const [showConnect, setShowConnect] = useState(false);
  const [connectStep, setConnectStep] = useState(0);
  const [transactions, setTransactions] = useState(recentTransactions);
  const [bankList, setBankList] = useState(banks);

  useEffect(() => {
    const fetchBankingData = async () => {
      try {
        const [accountsRes, txnRes] = await Promise.allSettled([
          api.get('/bank-accounts'),
          api.get('/banking/sync-transactions'),
        ]);
        if (accountsRes.status === 'fulfilled' && Array.isArray(accountsRes.value.data?.data)) {
          setBankList(accountsRes.value.data.data);
        }
        if (txnRes.status === 'fulfilled' && Array.isArray(txnRes.value.data?.data)) {
          setTransactions(txnRes.value.data.data);
        }
      } catch (err) {
        console.log('Banking data fetch fallback to defaults:', err.message);
      }
    };
    fetchBankingData();
  }, []);

  const totalBalance = useMemo(() => bankList.reduce((s, b) => s + (b.balance || 0), 0), [bankList]);
  const connectedCount = useMemo(() => bankList.filter(b => b.status === 'connected').length, [bankList]);
  const monthCredits = useMemo(() => transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0), [transactions]);
  const monthDebits = useMemo(() => transactions.filter(t => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0), [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filterCategory !== 'All' && t.category !== filterCategory) return false;
      if (filterBank !== 'All' && t.bank !== filterBank) return false;
      if (searchTerm && !t.desc.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [transactions, filterCategory, filterBank, searchTerm]);

  const bankBalancePie = useMemo(() => bankList.map(b => ({ name: b.name, value: b.balance || 0 })), [bankList]);

  const updateCategory = async (id, newCat) => {
    setTransactions(transactions.map(t => t.id === id ? { ...t, category: newCat, autoCategory: false } : t));
    try {
      await api.put(`/transactions/${id}`, { category: newCat });
    } catch (err) {
      console.error('Failed to update category:', err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Building className="w-7 h-7 text-blue-600" /> Net Banking Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">View all your bank accounts and transactions in one place</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm px-4 py-2 flex items-center gap-2">
            <Upload className="w-4 h-4" /> Import Statement
          </button>
          <button onClick={() => { setShowConnect(true); setConnectStep(0); }} className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 px-4 py-2 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Bank
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Balance', value: fmt(totalBalance), icon: CreditCard, color: 'text-blue-600', sub: `Across ${bankList.length} banks` },
          { label: 'Connected Banks', value: connectedCount, icon: Link2, color: 'text-green-600', sub: `${bankList.length - connectedCount} need attention` },
          { label: 'Month Credits', value: fmt(monthCredits), icon: ArrowUpRight, color: 'text-emerald-600', sub: 'Feb 2026' },
          { label: 'Month Debits', value: fmt(monthDebits), icon: ArrowDownRight, color: 'text-red-600', sub: 'Feb 2026' },
        ].map((c, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">{c.label}</span>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{c.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Connected Banks */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Connected Banks</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bankList.map(bank => (
            <div key={bank.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: bank.color + '15' }}>
                  {bank.logo}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{bank.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{bank.type} Account</p>
                </div>
                <div className="flex items-center gap-1">
                  {bank.status === 'connected' ? <Wifi className="w-4 h-4 text-green-500" /> : bank.status === 'warning' ? <Clock className="w-4 h-4 text-amber-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{fmt(bank.balance)}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Last sync: {bank.lastSync}</span>
                <button className="text-blue-600 dark:text-blue-400 text-xs flex items-center gap-1 hover:text-blue-700"><RefreshCw className="w-3 h-3" /> Sync</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Balance Distribution + Connection Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Balance Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={bankBalancePie} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value"
                label={({ name, value }) => `${name}: ${fmt(value)}`}>
                {bankBalancePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" /> Connection Health
          </h2>
          <div className="space-y-3">
            {bankList.map(bank => (
              <div key={bank.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
                <span className="text-lg">{bank.logo}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{bank.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{bank.lastSync}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${bank.status === 'connected' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : bank.status === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {bank.status === 'connected' ? 'Connected' : bank.status === 'warning' ? 'Slow' : 'Error'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction Feed */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Recent Transactions</h2>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search transactions..." className="pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white w-48" />
            </div>
            <select value={filterBank} onChange={e => setFilterBank(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm">
              <option value="All">All Banks</option>
              {bankList.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          {filteredTransactions.map(t => (
            <div key={t.id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.type === 'credit' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                {t.type === 'credit' ? <ArrowUpRight className="w-5 h-5 text-green-600" /> : <ArrowDownRight className="w-5 h-5 text-red-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{t.desc}</p>
                  {t.autoCategory && <Tag className="w-3 h-3 text-blue-500 flex-shrink-0" title="Auto-categorized" />}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.bank} • {t.date}</p>
              </div>
              <select value={t.category} onChange={e => updateCategory(t.id, e.target.value)}
                className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1">
                {categories.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
              </select>
              <span className={`text-sm font-bold min-w-[80px] text-right ${t.type === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                {t.type === 'credit' ? '+' : ''}{fmt(t.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Category Spending Per Bank */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Category Spending by Bank</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={categorySpending}>
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip formatter={v => fmt(v)} />
            <Legend />
            <Bar dataKey="HDFC" stackId="a" fill="#3B82F6" name="HDFC Bank" />
            <Bar dataKey="SBI" stackId="a" fill="#10B981" name="SBI" />
            <Bar dataKey="ICICI" stackId="a" fill="#F59E0B" name="ICICI Bank" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Reconciliation Status */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Reconciliation Status</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Bank</th>
                <th className="text-right py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Matched</th>
                <th className="text-right py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Unmatched</th>
                <th className="text-right py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Pending</th>
                <th className="text-right py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {reconciliation.map((r, i) => {
                const total = r.matched + r.unmatched + r.pending;
                const accuracy = ((r.matched / total) * 100).toFixed(1);
                return (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="py-3 px-4 text-slate-800 dark:text-white font-medium">{r.bank}</td>
                    <td className="py-3 px-4 text-right text-green-600">{r.matched}</td>
                    <td className="py-3 px-4 text-right text-red-500">{r.unmatched}</td>
                    <td className="py-3 px-4 text-right text-amber-500">{r.pending}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-medium ${Number(accuracy) > 95 ? 'text-green-600' : 'text-amber-500'}`}>{accuracy}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Bank Modal */}
      {showConnect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-slate-200 dark:border-slate-700 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Connect Bank Account</h3>
              <button onClick={() => setShowConnect(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              {connectionSteps.map((s, i) => (
                <div key={s.step} className={`flex items-center gap-4 p-4 rounded-xl border ${i <= connectStep ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-slate-50 dark:bg-slate-700/30 border-slate-100 dark:border-slate-700'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i < connectStep ? 'bg-green-500 text-white' : i === connectStep ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400'}`}>
                    {i < connectStep ? <CheckCircle className="w-4 h-4" /> : s.step}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${i <= connectStep ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}>{s.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setShowConnect(false)} className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm px-4 py-2">Cancel</button>
              {connectStep < 3 ? (
                <button onClick={() => setConnectStep(connectStep + 1)} className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 px-4 py-2">Next Step</button>
              ) : (
                <button onClick={() => setShowConnect(false)} className="bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 px-4 py-2">Complete</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
