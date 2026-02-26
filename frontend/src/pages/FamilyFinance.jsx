import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Wallet, PiggyBank, Target, Receipt, ChevronRight,
  Edit3, Trash2, Plus, X, Check, Star, TrendingUp, TrendingDown,
  DollarSign, RefreshCw, Award, Heart, Baby, User, Crown, Settings
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend, LineChart, Line
} from 'recharts';

const loadLocal = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
const saveLocal = (key, data) => localStorage.setItem(key, JSON.stringify(data));

const AnimatedValue = ({ value, prefix = '', suffix = '', duration = 800 }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = value / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(Math.round(start));
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <span>{prefix}{display.toLocaleString()}{suffix}</span>;
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const AVATARS = ['👨', '👩', '👦', '👧', '👴', '👶'];


export default function FamilyFinance() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState(() => loadLocal('fa_family_members'));
  const [bills, setBills] = useState(() => loadLocal('fa_family_bills'));
  const [goals, setGoals] = useState(() => loadLocal('fa_family_goals'));
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', role: 'Child', avatar: '👦', budget: 0, allowance: 0 });
  const [selectedMember, setSelectedMember] = useState(null);
  const [viewMode, setViewMode] = useState('family');

  useEffect(() => { saveLocal('fa_family_members', members); }, [members]);
  useEffect(() => { saveLocal('fa_family_bills', bills); }, [bills]);
  useEffect(() => { saveLocal('fa_family_goals', goals); }, [goals]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const totalBudget = members.reduce((sum, m) => sum + m.budget, 0);
  const totalSpent = members.reduce((sum, m) => sum + m.spent, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.saved, 0);
  const pieData = members.map(m => ({ name: m.name, value: m.spent }));

  const handleAddMember = () => {
    if (!newMember.name.trim()) return;
    setMembers(prev => [...prev, { ...newMember, id: Date.now(), color: COLORS[prev.length % COLORS.length], spent: 0 }]);
    setNewMember({ name: '', role: 'Child', avatar: '👦', budget: 0, allowance: 0 });
    setShowAddMember(false);
  };

  const toggleBillStatus = (billId) => {
    setBills(prev => prev.map(b => b.id === billId ? { ...b, status: b.status === 'paid' ? 'pending' : 'paid' } : b));
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'members', label: 'Members' },
    { id: 'bills', label: 'Bills' },
    { id: 'goals', label: 'Goals' },
    { id: 'allowances', label: 'Allowances' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading family data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" /> Family Finance
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your family's finances together</p>
          </div>
          <button onClick={() => setShowAddMember(true)} className="flex items-center gap-2 bg-blue-600 text-white rounded-xl text-sm font-medium px-4 py-2 hover:bg-blue-700 transition-colors">
            <UserPlus className="w-4 h-4" /> Add Member
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 dashboard-grid">
          {[
            { label: 'Total Budget', value: totalBudget, icon: Wallet, color: 'blue' },
            { label: 'Total Spent', value: totalSpent, icon: Receipt, color: 'red' },
            { label: 'Total Saved', value: totalSaved, icon: PiggyBank, color: 'green' },
            { label: 'Members', value: members.length, icon: Users, color: 'purple', noPrefix: true },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</span>
                  <Icon className={`w-5 h-5 text-${stat.color}-500`} />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  <AnimatedValue value={stat.value} prefix={stat.noPrefix ? '' : '₹'} />
                </p>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-slate-800 rounded-2xl p-1.5 border border-slate-200 dark:border-slate-700 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 dashboard-grid">
            {/* Member Spending Pie */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Spending by Member</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => `₹${v.toLocaleString()}`} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 12, color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly Trend */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Monthly Spending Trend</h3>
              {members.length === 0 ? (
                <p className="text-center text-slate-400 dark:text-slate-500 py-12">Add family members to see spending trends</p>
              ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={[]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#64748b20" />
                  <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 12, color: '#fff' }} />
                  <Legend />
                  {members.map((m, i) => (
                    <Line key={m.id} type="monotone" dataKey={m.name} stroke={COLORS[i]} strokeWidth={2} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              )}
            </div>

            {/* Member Cards */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {members.map(member => {
                const pct = Math.round((member.spent / member.budget) * 100);
                return (
                  <div key={member.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => { setSelectedMember(member); setActiveTab('members'); }}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{member.avatar}</span>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{member.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{member.role}</p>
                      </div>
                    </div>
                    <div className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500 dark:text-slate-400">₹{member.spent.toLocaleString()} / ₹{member.budget.toLocaleString()}</span>
                        <span className={pct > 90 ? 'text-red-500' : pct > 70 ? 'text-yellow-500' : 'text-green-500'}>{pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: member.color }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="space-y-4">
            <div className="flex gap-2 mb-4">
              <button onClick={() => setViewMode('family')} className={`px-4 py-2 rounded-xl text-sm font-medium ${viewMode === 'family' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>Family View</button>
              <button onClick={() => setViewMode('individual')} className={`px-4 py-2 rounded-xl text-sm font-medium ${viewMode === 'individual' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>Individual View</button>
            </div>
            {viewMode === 'family' ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Family Spending Comparison</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={members.map(m => ({ name: m.name, Budget: m.budget, Spent: m.spent }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#64748b20" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 12, color: '#fff' }} />
                    <Legend />
                    <Bar dataKey="Budget" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="Spent" fill="#ef4444" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {members.map(m => (
                  <div key={m.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-4xl">{m.avatar}</span>
                      <div>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{m.name}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${m.color}20`, color: m.color }}>{m.role}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl">
                        <p className="text-slate-500 dark:text-slate-400 text-xs">Budget</p>
                        <p className="font-bold text-slate-900 dark:text-white">₹{m.budget.toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl">
                        <p className="text-slate-500 dark:text-slate-400 text-xs">Spent</p>
                        <p className="font-bold text-slate-900 dark:text-white">₹{m.spent.toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl">
                        <p className="text-slate-500 dark:text-slate-400 text-xs">Remaining</p>
                        <p className="font-bold text-green-600">₹{(m.budget - m.spent).toLocaleString()}</p>
                      </div>
                      {m.allowance !== null && (
                        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl">
                          <p className="text-slate-500 dark:text-slate-400 text-xs">Allowance</p>
                          <p className="font-bold text-purple-600">₹{m.allowance.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bills Tab */}
        {activeTab === 'bills' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-500" /> Bill Responsibilities
            </h3>
            <div className="space-y-3">
              {bills.map(bill => {
                const assignee = members.find(m => m.id === bill.assignedTo);
                return (
                  <div key={bill.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleBillStatus(bill.id)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${bill.status === 'paid' ? 'bg-green-500 border-green-500' : 'border-slate-300 dark:border-slate-500'}`}>
                        {bill.status === 'paid' && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <div>
                        <p className={`font-medium ${bill.status === 'paid' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>{bill.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Due: {bill.dueDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{assignee?.avatar}</span>
                        <span className="text-sm text-slate-600 dark:text-slate-300">{assignee?.name}</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">₹{bill.amount.toLocaleString()}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${bill.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : bill.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'}`}>{bill.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 dashboard-grid">
            {goals.map(goal => {
              const pct = Math.round((goal.saved / goal.target) * 100);
              return (
                <div key={goal.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                  <div className="text-4xl mb-3">{goal.icon}</div>
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-white">{goal.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Deadline: {goal.deadline}</p>
                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 dark:text-slate-300">₹{goal.saved.toLocaleString()}</span>
                      <span className="text-slate-400">₹{goal.target.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-right text-xs text-slate-500 dark:text-slate-400 mt-1">{pct}% complete</p>
                  </div>
                  <button className="w-full mt-2 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                    Contribute
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Allowances Tab */}
        {activeTab === 'allowances' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-green-500" /> Allowance Management
            </h3>
            <div className="space-y-4">
              {members.filter(m => m.allowance !== null).map(m => {
                const pct = Math.round((m.spent / m.allowance) * 100);
                return (
                  <div key={m.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{m.avatar}</span>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{m.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Monthly allowance: ₹{m.allowance.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">₹{(m.allowance - m.spent).toLocaleString()} left</p>
                        <p className={`text-xs ${pct > 80 ? 'text-red-500' : 'text-green-500'}`}>{pct}% used</p>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
              {members.filter(m => m.allowance !== null).length === 0 && (
                <div className="text-center py-8">
                  <Baby className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">No allowances set up yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Add Family Member</h3>
              <button onClick={() => setShowAddMember(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2 justify-center">
                {AVATARS.map(av => (
                  <button key={av} onClick={() => setNewMember(p => ({ ...p, avatar: av }))}
                    className={`text-3xl p-2 rounded-xl transition-colors ${newMember.avatar === av ? 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-500' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{av}</button>
                ))}
              </div>
              <input value={newMember.name} onChange={e => setNewMember(p => ({ ...p, name: e.target.value }))} placeholder="Name" className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500" />
              <select value={newMember.role} onChange={e => setNewMember(p => ({ ...p, role: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500">
                <option value="Parent">Parent</option>
                <option value="Child">Child</option>
                <option value="Spouse">Spouse</option>
                <option value="Other">Other</option>
              </select>
              <input type="number" value={newMember.budget} onChange={e => setNewMember(p => ({ ...p, budget: Number(e.target.value) }))} placeholder="Monthly Budget" className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500" />
              {newMember.role === 'Child' && (
                <input type="number" value={newMember.allowance} onChange={e => setNewMember(p => ({ ...p, allowance: Number(e.target.value) }))} placeholder="Monthly Allowance" className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500" />
              )}
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowAddMember(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">Cancel</button>
              <button onClick={handleAddMember} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Add Member</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
