import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Plus, Edit3, Trash2, UserPlus, DollarSign, ArrowRight, Share2,
  Check, X, Copy, Link2, Calculator, ChevronDown, ChevronRight, Search,
  CreditCard, Receipt, Clock, CheckCircle2, AlertCircle, Crown
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import MainLayout from '../components/MainLayout';
import api from '../services/api';

const AnimatedValue = ({ end, prefix = '₹' }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start; const ref = { current: null };
    const animate = (ts) => { if (!start) start = ts; const p = Math.min((ts - start) / 1200, 1); setVal((1 - Math.pow(1 - p, 3)) * end); if (p < 1) ref.current = requestAnimationFrame(animate); };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [end]);
  return <span>{prefix}{Math.round(val).toLocaleString()}</span>;
};

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#f97316'];

export default function SplitExpenses() {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', members: '', avatar: '👥' });
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', paidBy: 'You', splitType: 'equal', date: '' });

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/financial/splits');
      setGroups(res.data?.groups || res.data || []);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const selectedGroupData = useMemo(() => {
    if (!selectedGroup) return null;
    return groups.find(g => g.id === selectedGroup);
  }, [groups, selectedGroup]);

  const balances = useMemo(() => {
    if (!selectedGroupData) return {};
    const memberCount = selectedGroupData.members.length;
    const balanceMap = {};
    selectedGroupData.members.forEach(m => { balanceMap[m] = 0; });
    selectedGroupData.expenses.forEach(exp => {
      const share = exp.amount / memberCount;
      balanceMap[exp.paidBy] += exp.amount - share;
      selectedGroupData.members.forEach(m => {
        if (m !== exp.paidBy) balanceMap[m] -= share;
      });
    });
    return balanceMap;
  }, [selectedGroupData]);

  const settlements = useMemo(() => {
    if (!selectedGroupData) return [];
    const debtors = [];
    const creditors = [];
    Object.entries(balances).forEach(([name, amount]) => {
      if (amount < -0.5) debtors.push({ name, amount: Math.abs(amount) });
      else if (amount > 0.5) creditors.push({ name, amount });
    });
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);
    const results = [];
    let di = 0, ci = 0;
    while (di < debtors.length && ci < creditors.length) {
      const settled = Math.min(debtors[di].amount, creditors[ci].amount);
      results.push({ from: debtors[di].name, to: creditors[ci].name, amount: Math.round(settled) });
      debtors[di].amount -= settled;
      creditors[ci].amount -= settled;
      if (debtors[di].amount < 0.5) di++;
      if (creditors[ci].amount < 0.5) ci++;
    }
    return results;
  }, [balances, selectedGroupData]);

  const totalGroupExpense = useMemo(() => {
    if (!selectedGroupData) return 0;
    return selectedGroupData.expenses.reduce((s, e) => s + e.amount, 0);
  }, [selectedGroupData]);

  const expenseByMember = useMemo(() => {
    if (!selectedGroupData) return [];
    const map = {};
    selectedGroupData.members.forEach(m => { map[m] = 0; });
    selectedGroupData.expenses.forEach(e => { map[e.paidBy] += e.amount; });
    return Object.entries(map).map(([name, total], i) => ({ name, total, color: COLORS[i % COLORS.length] }));
  }, [selectedGroupData]);

  const handleCreateGroup = useCallback(() => {
    const members = ['You', ...groupForm.members.split(',').map(m => m.trim()).filter(Boolean)];
    const newGroup = { id: Date.now(), name: groupForm.name, members, avatar: groupForm.avatar, expenses: [] };
    setGroups(prev => [...prev, newGroup]);
    setGroupForm({ name: '', members: '', avatar: '👥' });
    setShowGroupModal(false);
    setSelectedGroup(newGroup.id);
  }, [groupForm]);

  const handleAddExpense = useCallback(() => {
    if (!selectedGroup) return;
    const newExpense = { ...expenseForm, id: Date.now(), amount: parseFloat(expenseForm.amount), date: expenseForm.date || new Date().toISOString().split('T')[0] };
    setGroups(prev => prev.map(g => g.id === selectedGroup ? { ...g, expenses: [...g.expenses, newExpense] } : g));
    setExpenseForm({ description: '', amount: '', paidBy: 'You', splitType: 'equal', date: '' });
    setShowExpenseModal(false);
  }, [expenseForm, selectedGroup]);

  const handleDeleteExpense = useCallback((expId) => {
    setGroups(prev => prev.map(g => g.id === selectedGroup ? { ...g, expenses: g.expenses.filter(e => e.id !== expId) } : g));
  }, [selectedGroup]);

  const handleDeleteGroup = useCallback((groupId) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
    if (selectedGroup === groupId) setSelectedGroup(null);
  }, [selectedGroup]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(`https://financialapp.com/split/${selectedGroup}`).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  }, [selectedGroup]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groups;
    return groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [groups, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in-up">
          <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 text-lg">Loading split expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout title="Split Expenses">
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in-down">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl text-white shadow-lg shadow-violet-600/30">
              <Users className="w-6 h-6" />
            </div>
            Split Expenses
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Split bills & settle up with friends</p>
        </div>
        <button onClick={() => setShowGroupModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30">
          <Plus className="w-4 h-4" /> New Group
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Groups List */}
        <div className="space-y-4 animate-fade-in-up">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search groups..."
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" />
          </div>

          {filteredGroups.map(group => {
            const total = group.expenses.reduce((s, e) => s + e.amount, 0);
            return (
              <div key={group.id}
                onClick={() => setSelectedGroup(group.id)}
                className={`bg-white dark:bg-slate-800 rounded-2xl p-4 border cursor-pointer transition-all hover:shadow-lg ${selectedGroup === group.id ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg' : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{group.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">{group.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{group.members.length} members • {group.expenses.length} expenses</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-slate-900 dark:text-white">₹{total.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">total</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1">
                  {group.members.slice(0, 4).map((m, i) => (
                    <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white text-xs font-bold flex items-center justify-center -ml-1 first:ml-0 border-2 border-white dark:border-slate-800">
                      {m.charAt(0)}
                    </div>
                  ))}
                  {group.members.length > 4 && <span className="text-xs text-slate-500 ml-1">+{group.members.length - 4}</span>}
                </div>
              </div>
            );
          })}

          {filteredGroups.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No groups found</p>
            </div>
          )}
        </div>

        {/* Group Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedGroupData ? (
            <>
              {/* Group Header */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{selectedGroupData.avatar}</span>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedGroupData.name}</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{selectedGroupData.members.join(', ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowShareModal(true)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                      <Share2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDeleteGroup(selectedGroupData.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
                    <div className="text-lg font-bold text-blue-700 dark:text-blue-400"><AnimatedValue end={totalGroupExpense} /></div>
                    <div className="text-xs text-blue-600/70 dark:text-blue-400/70">Total Expenses</div>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
                    <div className="text-lg font-bold text-green-700 dark:text-green-400">₹{Math.round(totalGroupExpense / selectedGroupData.members.length).toLocaleString()}</div>
                    <div className="text-xs text-green-600/70 dark:text-green-400/70">Per Person</div>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-center">
                    <div className="text-lg font-bold text-purple-700 dark:text-purple-400">{selectedGroupData.expenses.length}</div>
                    <div className="text-xs text-purple-600/70 dark:text-purple-400/70">Transactions</div>
                  </div>
                </div>
              </div>

              {/* Paid by Chart */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Paid by Each</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={expenseByMember} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="total">
                          {expenseByMember.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} formatter={(v) => [`₹${v.toLocaleString()}`]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5">
                    {expenseByMember.map((m, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                          <span className="text-slate-600 dark:text-slate-400">{m.name}</span>
                        </div>
                        <span className="font-medium text-slate-900 dark:text-white">₹{m.total.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Settlements */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-green-500" /> Settlements
                  </h3>
                  {settlements.length > 0 ? (
                    <div className="space-y-3">
                      {settlements.map((s, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-red-500 text-white text-xs font-bold flex items-center justify-center">{s.from.charAt(0)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-slate-900 dark:text-white">{s.from}</span>
                              <ArrowRight className="w-4 h-4 text-slate-400" />
                              <span className="font-medium text-slate-900 dark:text-white">{s.to}</span>
                            </div>
                          </div>
                          <span className="font-bold text-red-600 dark:text-red-400">₹{s.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-green-500">
                      <CheckCircle2 className="w-10 h-10 mx-auto mb-2" />
                      <p className="font-medium">All settled up!</p>
                    </div>
                  )}

                  {/* Balances */}
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Balances</h4>
                    {Object.entries(balances).map(([name, amount]) => (
                      <div key={name} className="flex items-center justify-between py-1.5 text-sm">
                        <span className="text-slate-700 dark:text-slate-300">{name}</span>
                        <span className={`font-semibold ${amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {amount >= 0 ? '+' : ''}₹{Math.round(amount).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Expenses List */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-blue-500" /> Expenses
                  </h3>
                  <button onClick={() => setShowExpenseModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add Expense
                  </button>
                </div>
                <div className="space-y-2">
                  {selectedGroupData.expenses.map(exp => (
                    <div key={exp.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 dark:text-white text-sm truncate">{exp.description}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <span>Paid by <span className="font-medium">{exp.paidBy}</span></span>
                          <span>•</span>
                          <span>{new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">₹{exp.amount.toLocaleString()}</span>
                      <button onClick={() => handleDeleteExpense(exp.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {selectedGroupData.expenses.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      <Receipt className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No expenses yet. Add one to get started!</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 border border-slate-200 dark:border-slate-700 text-center animate-fade-in-up">
              <Users className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Select a Group</h3>
              <p className="text-slate-500 dark:text-slate-400">Choose a group from the left to view expenses and settlements.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowGroupModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Create Group</h3>
              <button onClick={() => setShowGroupModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Group Emoji</label>
                <div className="flex gap-2 flex-wrap">
                  {['👥', '🏖️', '🏠', '🍕', '✈️', '🎉', '💼', '🎮'].map(e => (
                    <button key={e} onClick={() => setGroupForm(p => ({ ...p, avatar: e }))}
                      className={`text-2xl p-2 rounded-lg transition-colors ${groupForm.avatar === e ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Group Name</label>
                <input value={groupForm.name} onChange={e => setGroupForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Goa Trip"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Members (comma-separated)</label>
                <input value={groupForm.members} onChange={e => setGroupForm(p => ({ ...p, members: e.target.value }))} placeholder="Rahul, Priya, Amit"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-slate-500 mt-1">You will be added automatically</p>
              </div>
              <button onClick={handleCreateGroup}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && selectedGroupData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowExpenseModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Add Expense</h3>
              <button onClick={() => setShowExpenseModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <input value={expenseForm.description} onChange={e => setExpenseForm(p => ({ ...p, description: e.target.value }))} placeholder="e.g. Hotel booking"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (₹)</label>
                  <input type="number" value={expenseForm.amount} onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))} placeholder="1000"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Paid By</label>
                  <select value={expenseForm.paidBy} onChange={e => setExpenseForm(p => ({ ...p, paidBy: e.target.value }))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                    {selectedGroupData.members.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Split Type</label>
                  <select value={expenseForm.splitType} onChange={e => setExpenseForm(p => ({ ...p, splitType: e.target.value }))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="equal">Equal Split</option>
                    <option value="percentage">By Percentage</option>
                    <option value="exact">Exact Amounts</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                  <input type="date" value={expenseForm.date} onChange={e => setExpenseForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <button onClick={handleAddExpense}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Add Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowShareModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Share Group</h3>
              <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
                <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
                <input readOnly value={`https://financialapp.com/split/${selectedGroup}`}
                  className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-300 outline-none" />
                <button onClick={handleCopyLink} className={`p-1.5 rounded-lg transition-colors ${copySuccess ? 'text-green-500 bg-green-50 dark:bg-green-900/20' : 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}>
                  {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 text-center">{copySuccess ? 'Link copied to clipboard!' : 'Share this link with group members'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
    </MainLayout>
  );
}
