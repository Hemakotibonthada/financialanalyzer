import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import {
  Shield, PiggyBank, Plus, Minus, Target, TrendingUp,
  AlertTriangle, Briefcase, Heart, Car, Home, Lightbulb,
  ArrowUpRight, ArrowDownRight, Calendar, DollarSign, Clock
} from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

const fmt = (n) => `₹${n.toLocaleString('en-IN')}`;

const contributionHistory = [
  { month: 'Sep 25', amount: 10000, total: 190000 },
  { month: 'Oct 25', amount: 15000, total: 205000 },
  { month: 'Nov 25', amount: 10000, total: 215000 },
  { month: 'Dec 25', amount: 20000, total: 235000 },
  { month: 'Jan 26', amount: 10000, total: 245000 },
  { month: 'Feb 26', amount: 15000, total: 260000 },
];

const expenseBreakdown = [
  { category: 'Rent/EMI', amount: 25000, icon: Home, color: '#3B82F6' },
  { category: 'Groceries', amount: 12000, icon: DollarSign, color: '#10B981' },
  { category: 'Utilities', amount: 5000, icon: Lightbulb, color: '#F59E0B' },
  { category: 'Transportation', amount: 6000, icon: Car, color: '#8B5CF6' },
  { category: 'Insurance', amount: 4000, icon: Shield, color: '#EC4899' },
  { category: 'Healthcare', amount: 3000, icon: Heart, color: '#EF4444' },
  { category: 'Miscellaneous', amount: 5000, icon: DollarSign, color: '#06B6D4' },
];

const scenarios = [
  { title: 'Job Loss', icon: Briefcase, color: '#EF4444', duration: '6 months', needed: 360000, description: 'Full salary replacement for 6 months', covered: true },
  { title: 'Medical Emergency', icon: Heart, color: '#EC4899', duration: 'One-time', needed: 200000, description: 'Deductible + co-pay for major procedure', covered: true },
  { title: 'Car Repair', icon: Car, color: '#F59E0B', duration: 'One-time', needed: 50000, description: 'Major repair (engine, transmission)', covered: true },
  { title: 'Home Repair', icon: Home, color: '#8B5CF6', duration: 'One-time', needed: 100000, description: 'Plumbing, electrical, or roof repair', covered: false },
];

const withdrawalHistory = [
  { id: 1, date: '2025-08-15', amount: 25000, reason: 'AC Repair', category: 'Home' },
  { id: 2, date: '2025-04-03', amount: 15000, reason: 'Medical Bills', category: 'Healthcare' },
  { id: 3, date: '2024-11-20', amount: 30000, reason: 'Car Service', category: 'Vehicle' },
];

const tips = [
  { title: 'Automate Your Savings', desc: 'Set up auto-transfer on salary day to build your fund consistently.' },
  { title: 'Keep It Accessible', desc: 'Use a high-yield savings account or liquid fund — not FDs with lock-in.' },
  { title: 'Review Monthly Expenses', desc: 'Regularly update your expense estimate to keep your target accurate.' },
  { title: 'Don\'t Invest It', desc: 'Emergency fund is for safety, not returns. Keep it in low-risk instruments.' },
  { title: 'Replenish After Use', desc: 'Whenever you withdraw, prioritize building it back up.' },
];

export default function EmergencyFund() {
  const [targetMonths, setTargetMonths] = useState(6);
  const [currentFund, setCurrentFund] = useState(260000);
  const [autoSaveAmount, setAutoSaveAmount] = useState(10000);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [transAmount, setTransAmount] = useState('');

  const monthlyExpense = useMemo(() => expenseBreakdown.reduce((s, e) => s + e.amount, 0), []);
  const targetAmount = useMemo(() => monthlyExpense * targetMonths, [monthlyExpense, targetMonths]);
  const progressPct = useMemo(() => Math.min((currentFund / targetAmount) * 100, 100), [currentFund, targetAmount]);
  const monthsToTarget = useMemo(() => {
    if (currentFund >= targetAmount) return 0;
    return Math.ceil((targetAmount - currentFund) / autoSaveAmount);
  }, [currentFund, targetAmount, autoSaveAmount]);

  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (progressPct / 100) * circumference;

  const handleDeposit = () => {
    if (transAmount && Number(transAmount) > 0) {
      setCurrentFund(currentFund + Number(transAmount));
      setTransAmount('');
      setShowDeposit(false);
    }
  };

  const handleWithdraw = () => {
    if (transAmount && Number(transAmount) > 0 && Number(transAmount) <= currentFund) {
      setCurrentFund(currentFund - Number(transAmount));
      setTransAmount('');
      setShowWithdraw(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Shield className="w-7 h-7 text-green-600" /> Emergency Fund Tracker
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Build and maintain your financial safety net</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Current Fund', value: fmt(currentFund), icon: PiggyBank, color: 'text-blue-600', sub: `${progressPct.toFixed(0)}% of target` },
          { label: 'Target Amount', value: fmt(targetAmount), icon: Target, color: 'text-green-600', sub: `${targetMonths} months of expenses` },
          { label: 'Monthly Expenses', value: fmt(monthlyExpense), icon: DollarSign, color: 'text-amber-600', sub: '7 categories tracked' },
          { label: 'Months to Target', value: monthsToTarget, icon: Clock, color: 'text-purple-600', sub: monthsToTarget === 0 ? 'Target reached!' : `at ₹${autoSaveAmount.toLocaleString('en-IN')}/mo` },
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

      {/* Progress Ring + Quick Actions + Target Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Fund Progress</h2>
          <div className="relative w-52 h-52">
            <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
              <circle cx="100" cy="100" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="14" className="dark:stroke-slate-700" />
              <circle cx="100" cy="100" r={radius} fill="none"
                stroke={progressPct >= 100 ? '#10B981' : progressPct >= 60 ? '#3B82F6' : '#F59E0B'}
                strokeWidth="14" strokeLinecap="round"
                strokeDasharray={`${strokeDash} ${circumference}`}
                className="transition-all duration-700" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-3xl font-bold text-slate-800 dark:text-white">{progressPct.toFixed(0)}%</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">of target</p>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => { setShowDeposit(true); setShowWithdraw(false); }}
              className="bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 px-4 py-2 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Deposit
            </button>
            <button onClick={() => { setShowWithdraw(true); setShowDeposit(false); }}
              className="bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 px-4 py-2 flex items-center gap-2">
              <Minus className="w-4 h-4" /> Withdraw
            </button>
          </div>
          {(showDeposit || showWithdraw) && (
            <div className="mt-4 w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-800 dark:text-white mb-2">{showDeposit ? 'Deposit' : 'Withdraw'} Amount</p>
              <div className="flex gap-2">
                <input type="number" value={transAmount} onChange={e => setTransAmount(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white px-3 py-2 text-sm" placeholder="₹ Amount" />
                <button onClick={showDeposit ? handleDeposit : handleWithdraw}
                  className={`${showDeposit ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'} text-white rounded-xl text-sm font-medium px-4 py-2`}>
                  {showDeposit ? 'Add' : 'Take'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Target Calculator</h2>
          <div className="mb-4">
            <label className="text-sm text-slate-500 dark:text-slate-400 flex justify-between mb-2">
              <span>Target Months</span><span className="font-semibold text-slate-800 dark:text-white">{targetMonths} months</span>
            </label>
            <input type="range" min={1} max={12} value={targetMonths} onChange={e => setTargetMonths(Number(e.target.value))} className="w-full accent-blue-600" />
            <div className="flex justify-between text-xs text-slate-400 mt-1"><span>1 month</span><span>12 months</span></div>
          </div>
          <div className="space-y-2 mt-4">
            {[3, 6, 9, 12].map(m => (
              <button key={m} onClick={() => setTargetMonths(m)}
                className={`w-full text-left p-3 rounded-xl text-sm flex justify-between ${targetMonths === m ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' : 'bg-slate-50 dark:bg-slate-700/30 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700'}`}>
                <span>{m} months</span>
                <span className="font-semibold">{fmt(monthlyExpense * m)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Auto-Save Config</h2>
          <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
            <span className="text-sm text-slate-700 dark:text-slate-300">Auto-save enabled</span>
            <button onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative ${autoSaveEnabled ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${autoSaveEnabled ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>
          <div className="mb-4">
            <label className="text-sm text-slate-500 dark:text-slate-400 flex justify-between mb-2">
              <span>Monthly Auto-Save</span><span className="font-semibold text-slate-800 dark:text-white">₹{autoSaveAmount.toLocaleString('en-IN')}</span>
            </label>
            <input type="range" min={1000} max={50000} step={1000} value={autoSaveAmount} onChange={e => setAutoSaveAmount(Number(e.target.value))} className="w-full accent-blue-600" disabled={!autoSaveEnabled} />
          </div>
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 mt-4">
            <p className="text-xs text-blue-600 dark:text-blue-400">Next auto-save</p>
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">1st March 2026 • {fmt(autoSaveAmount)}</p>
          </div>
          <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 mt-3">
            <p className="text-xs text-green-600 dark:text-green-400">Target reached by</p>
            <p className="text-sm font-semibold text-green-800 dark:text-green-200">
              {monthsToTarget === 0 ? 'Already achieved!' : `${new Date(Date.now() + monthsToTarget * 30 * 86400000).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`}
            </p>
          </div>
        </div>
      </div>

      {/* Contribution History */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Contribution History</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={contributionHistory}>
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={v => fmt(v)} />
            <Legend />
            <Bar yAxisId="left" dataKey="amount" fill="#3B82F6" name="Contribution" radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="total" stroke="#10B981" strokeWidth={2} name="Total Fund" dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Expense Breakdown */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Monthly Expenses (What the Fund Covers)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {expenseBreakdown.map((e, i) => {
            const pct = (e.amount / monthlyExpense) * 100;
            const Icon = e.icon;
            return (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: e.color + '20' }}>
                  <Icon className="w-4 h-4" style={{ color: e.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-800 dark:text-white font-medium">{e.category}</span>
                    <span className="text-slate-600 dark:text-slate-300">{fmt(e.amount)}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: e.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scenarios */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" /> Emergency Scenarios
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenarios.map((s, i) => {
            const Icon = s.icon;
            const covered = currentFund >= s.needed;
            return (
              <div key={i} className={`p-4 rounded-xl border ${covered ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: s.color + '20' }}>
                    <Icon className="w-5 h-5" style={{ color: s.color }} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-800 dark:text-white">{s.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{s.duration}</p>
                  </div>
                  {covered ? <span className="ml-auto text-green-600"><Shield className="w-5 h-5" /></span> : <span className="ml-auto text-red-500"><AlertTriangle className="w-5 h-5" /></span>}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{s.description}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Needed: {fmt(s.needed)}</span>
                  <span className={covered ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>{covered ? '✓ Covered' : `Short: ${fmt(s.needed - currentFund)}`}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Withdrawal History + Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Withdrawal History</h2>
          {withdrawalHistory.length > 0 ? (
            <div className="space-y-3">
              {withdrawalHistory.map(w => (
                <div key={w.id} className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800">
                  <ArrowDownRight className="w-5 h-5 text-red-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-white">{w.reason}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{w.date} • {w.category}</p>
                  </div>
                  <span className="text-sm font-bold text-red-600">-{fmt(w.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No withdrawals yet</p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" /> Tips & Recommendations
          </h2>
          <div className="space-y-3">
            {tips.map((t, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-800 dark:text-white">{t.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
