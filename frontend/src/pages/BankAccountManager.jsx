import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2, Plus, CreditCard, ArrowRightLeft, Wallet, TrendingUp,
  TrendingDown, Search, Filter, MoreVertical, X, Check, RefreshCw,
  Landmark, Banknote, PiggyBank, ArrowUpRight, ArrowDownRight, Edit, Trash2
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';
import api from '../services/api';

const AnimatedValue = ({ end, prefix = '₹' }) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    let s; const r = { current: null };
    const a = (t) => { if (!s) s = t; const p = Math.min((t - s) / 1200, 1); setV((1 - Math.pow(1 - p, 3)) * end); if (p < 1) r.current = requestAnimationFrame(a); };
    r.current = requestAnimationFrame(a); return () => cancelAnimationFrame(r.current);
  }, [end]);
  return <span>{prefix}{Math.round(v).toLocaleString()}</span>;
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
const ACCOUNT_TYPES = ['Savings', 'Current', 'FD', 'RD'];
const CATEGORIES = ['Personal', 'Business', 'Joint'];
const BANK_COLORS = { 'SBI': '#1a237e', 'HDFC': '#004b87', 'ICICI': '#f37b21', 'Axis': '#800020', 'Kotak': '#ed1c24', 'PNB': '#0d47a1', 'Default': '#3b82f6' };

const mockAccounts = [
  { id: 1, bank: 'HDFC', accountNo: '****4521', type: 'Savings', category: 'Personal', balance: 245000, lastSync: '2 min ago', synced: true },
  { id: 2, bank: 'SBI', accountNo: '****7832', type: 'Savings', category: 'Personal', balance: 128500, lastSync: '5 min ago', synced: true },
  { id: 3, bank: 'ICICI', accountNo: '****1234', type: 'Current', category: 'Business', balance: 567800, lastSync: '1 hr ago', synced: true },
  { id: 4, bank: 'Axis', accountNo: '****9087', type: 'FD', category: 'Personal', balance: 1000000, lastSync: '1 day ago', synced: false },
  { id: 5, bank: 'Kotak', accountNo: '****5678', type: 'Savings', category: 'Joint', balance: 89200, lastSync: '10 min ago', synced: true },
];

const mockTransactions = [
  { id: 1, accountId: 1, desc: 'Salary Credit', amount: 85000, type: 'credit', date: '2026-02-25', category: 'Income' },
  { id: 2, accountId: 1, desc: 'Rent Payment', amount: 25000, type: 'debit', date: '2026-02-24', category: 'Housing' },
  { id: 3, accountId: 2, desc: 'Electricity Bill', amount: 3200, type: 'debit', date: '2026-02-23', category: 'Utilities' },
  { id: 4, accountId: 3, desc: 'Client Payment', amount: 150000, type: 'credit', date: '2026-02-22', category: 'Income' },
  { id: 5, accountId: 1, desc: 'Grocery Shopping', amount: 4500, type: 'debit', date: '2026-02-21', category: 'Food' },
  { id: 6, accountId: 2, desc: 'SIP Investment', amount: 10000, type: 'debit', date: '2026-02-20', category: 'Investment' },
  { id: 7, accountId: 3, desc: 'Vendor Payment', amount: 45000, type: 'debit', date: '2026-02-19', category: 'Business' },
  { id: 8, accountId: 5, desc: 'Joint Deposit', amount: 20000, type: 'credit', date: '2026-02-18', category: 'Transfer' },
];

export default function BankAccountManager() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [newAccount, setNewAccount] = useState({ bank: '', accountNo: '', type: 'Savings', category: 'Personal', balance: '' });
  const [transfer, setTransfer] = useState({ from: '', to: '', amount: '' });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/bank-accounts');
        setAccounts(res.data?.length ? res.data : mockAccounts);
        setTransactions(mockTransactions);
      } catch {
        setAccounts(mockAccounts);
        setTransactions(mockTransactions);
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    };
    load();
  }, []);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const savingsTotal = accounts.filter((a) => a.type === 'Savings').reduce((s, a) => s + a.balance, 0);
  const currentTotal = accounts.filter((a) => a.type === 'Current').reduce((s, a) => s + a.balance, 0);
  const fdTotal = accounts.filter((a) => a.type === 'FD' || a.type === 'RD').reduce((s, a) => s + a.balance, 0);

  const filteredAccounts = useMemo(() => {
    let list = [...accounts];
    if (searchTerm) list = list.filter((a) => a.bank.toLowerCase().includes(searchTerm.toLowerCase()) || a.accountNo.includes(searchTerm));
    if (filterCategory !== 'All') list = list.filter((a) => a.category === filterCategory);
    return list;
  }, [accounts, searchTerm, filterCategory]);

  const accountTxns = selectedAccount ? transactions.filter((t) => t.accountId === selectedAccount) : transactions.slice(0, 6);

  const spendingByAccount = accounts.map((a) => ({
    name: a.bank,
    spending: transactions.filter((t) => t.accountId === a.id && t.type === 'debit').reduce((s, t) => s + t.amount, 0),
    income: transactions.filter((t) => t.accountId === a.id && t.type === 'credit').reduce((s, t) => s + t.amount, 0),
  }));

  const typeBreakdown = [
    { name: 'Savings', value: savingsTotal },
    { name: 'Current', value: currentTotal },
    { name: 'FD/RD', value: fdTotal },
  ].filter((d) => d.value > 0);

  const addAccount = () => {
    if (!newAccount.bank || !newAccount.accountNo) return;
    setAccounts([...accounts, { id: Date.now(), ...newAccount, balance: +newAccount.balance || 0, lastSync: 'Just now', synced: true }]);
    setNewAccount({ bank: '', accountNo: '', type: 'Savings', category: 'Personal', balance: '' });
    setShowAddModal(false);
  };

  const deleteAccount = (id) => setAccounts(accounts.filter((a) => a.id !== id));

  const doTransfer = () => {
    const amt = +transfer.amount;
    if (!transfer.from || !transfer.to || !amt || transfer.from === transfer.to) return;
    setAccounts(accounts.map((a) => {
      if (a.id === +transfer.from) return { ...a, balance: a.balance - amt };
      if (a.id === +transfer.to) return { ...a, balance: a.balance + amt };
      return a;
    }));
    setTransfer({ from: '', to: '', amount: '' });
    setShowTransferModal(false);
  };

  const getBankColor = (bank) => BANK_COLORS[bank] || BANK_COLORS.Default;
  const getTypeIcon = (type) => type === 'Savings' ? PiggyBank : type === 'Current' ? Banknote : Landmark;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3"><Building2 className="w-8 h-8 text-blue-600" /> Bank Accounts</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage all your bank accounts in one place</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowTransferModal(true)} className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium px-4 py-2 flex items-center gap-2 hover:bg-slate-300 dark:hover:bg-slate-600">
              <ArrowRightLeft className="w-4 h-4" /> Transfer
            </button>
            <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-600/30 px-4 py-2 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Account
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 dashboard-grid animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2"><Wallet className="w-5 h-5 text-blue-600" /><span className="text-xs text-slate-500 dark:text-slate-400">Total Balance</span></div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white"><AnimatedValue end={totalBalance} /></p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2"><PiggyBank className="w-5 h-5 text-emerald-600" /><span className="text-xs text-slate-500 dark:text-slate-400">Savings</span></div>
            <p className="text-2xl font-bold text-emerald-600"><AnimatedValue end={savingsTotal} /></p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2"><Banknote className="w-5 h-5 text-amber-600" /><span className="text-xs text-slate-500 dark:text-slate-400">Current</span></div>
            <p className="text-2xl font-bold text-amber-600"><AnimatedValue end={currentTotal} /></p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2"><Landmark className="w-5 h-5 text-purple-600" /><span className="text-xs text-slate-500 dark:text-slate-400">FD/RD</span></div>
            <p className="text-2xl font-bold text-purple-600"><AnimatedValue end={fdTotal} /></p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-3 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by bank or account..." className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm border-0 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm border-0 outline-none">
            <option>All</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Account Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 dashboard-grid">
          {filteredAccounts.map((acc, i) => {
            const TypeIcon = getTypeIcon(acc.type);
            return (
              <div key={acc.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow animate-fade-in-up" style={{ animationDelay: `${(i + 3) * 80}ms` }}>
                <div className="h-2" style={{ background: getBankColor(acc.bank) }} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: getBankColor(acc.bank) }}>
                        {acc.bank.slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{acc.bank} Bank</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{acc.accountNo} · {acc.type}</p>
                      </div>
                    </div>
                    <button onClick={() => deleteAccount(acc.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mb-3">₹{acc.balance.toLocaleString()}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded-full ${acc.category === 'Personal' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : acc.category === 'Business' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>{acc.category}</span>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${acc.synced ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className="text-xs text-slate-400">{acc.lastSync}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedAccount(selectedAccount === acc.id ? null : acc.id)} className="mt-3 w-full text-center text-xs text-blue-600 hover:underline">
                    {selectedAccount === acc.id ? 'Hide Transactions' : 'View Transactions'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts & Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Account-wise Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Balance by Type</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={typeBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
                  {typeBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {typeBreakdown.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-xs"><div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} /><span className="text-slate-600 dark:text-slate-400">{d.name}</span></div>
              ))}
            </div>
          </div>

          {/* Spending Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Account Activity</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={spendingByAccount.filter((d) => d.spending > 0 || d.income > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spending" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '700ms' }}>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Transactions</h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-72 overflow-y-auto">
              {accountTxns.map((txn) => (
                <div key={txn.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${txn.type === 'credit' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                      {txn.type === 'credit' ? <ArrowDownRight className="w-4 h-4 text-emerald-600" /> : <ArrowUpRight className="w-4 h-4 text-red-500" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{txn.desc}</p>
                      <p className="text-xs text-slate-400">{txn.date}</p>
                    </div>
                  </div>
                  <p className={`font-semibold text-sm ${txn.type === 'credit' ? 'text-emerald-600' : 'text-red-500'}`}>{txn.type === 'credit' ? '+' : '-'}₹{txn.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Add Bank Account</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-3">
              <input value={newAccount.bank} onChange={(e) => setNewAccount({ ...newAccount, bank: e.target.value })} placeholder="Bank Name" className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm border-0 outline-none focus:ring-2 focus:ring-blue-500" />
              <input value={newAccount.accountNo} onChange={(e) => setNewAccount({ ...newAccount, accountNo: e.target.value })} placeholder="Account Number (last 4 digits)" className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm border-0 outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="number" value={newAccount.balance} onChange={(e) => setNewAccount({ ...newAccount, balance: e.target.value })} placeholder="Current Balance" className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm border-0 outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="grid grid-cols-2 gap-3">
                <select value={newAccount.type} onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value })} className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm border-0 outline-none">
                  {ACCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <select value={newAccount.category} onChange={(e) => setNewAccount({ ...newAccount, category: e.target.value })} className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm border-0 outline-none">
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium">Cancel</button>
              <button onClick={addAccount} className="flex-1 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-600/30 px-4 py-2.5">Add Account</button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-blue-600" /> Transfer Funds</h3>
              <button onClick={() => setShowTransferModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-3">
              <select value={transfer.from} onChange={(e) => setTransfer({ ...transfer, from: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm border-0 outline-none">
                <option value="">From Account</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.bank} {a.accountNo} (₹{a.balance.toLocaleString()})</option>)}
              </select>
              <select value={transfer.to} onChange={(e) => setTransfer({ ...transfer, to: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm border-0 outline-none">
                <option value="">To Account</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.bank} {a.accountNo}</option>)}
              </select>
              <input type="number" value={transfer.amount} onChange={(e) => setTransfer({ ...transfer, amount: e.target.value })} placeholder="Amount" className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm border-0 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowTransferModal(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium">Cancel</button>
              <button onClick={doTransfer} className="flex-1 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-600/30 px-4 py-2.5">Transfer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
