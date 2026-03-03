import React, { useState, useMemo, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  Legend, ResponsiveContainer, LineChart, Line
} from 'recharts';
import {
  CreditCard, TrendingDown, Calendar, IndianRupee, Plus, X,
  Zap, Snowflake, Target, Clock, ArrowDown, ArrowUp,
  CheckCircle, AlertTriangle, Trash2, Calculator
} from 'lucide-react';
import MainLayout from '../components/MainLayout';
import api from '../services/api';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

const fmt = (n) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
};

const loadLocal = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
const saveLocal = (key, data) => localStorage.setItem(key, JSON.stringify(data));

function calcPayoff(debts, extraPayment, strategy) {
  let sorted = [...debts].map(d => ({ ...d, remaining: d.balance }));
  if (strategy === 'avalanche') sorted.sort((a, b) => b.rate - a.rate);
  else sorted.sort((a, b) => a.remaining - b.remaining);

  let months = 0;
  let totalInterest = 0;
  const timeline = [];
  const maxMonths = 360;

  while (sorted.some(d => d.remaining > 0) && months < maxMonths) {
    months++;
    let extra = extraPayment;
    let monthTotal = 0;

    for (const d of sorted) {
      if (d.remaining <= 0) continue;
      const interest = d.remaining * (d.rate / 100 / 12);
      totalInterest += interest;
      let payment = d.minPayment;
      if (sorted.indexOf(d) === sorted.findIndex(x => x.remaining > 0)) {
        payment += extra;
      }
      d.remaining = Math.max(d.remaining + interest - payment, 0);
      monthTotal += d.remaining;
    }

    if (months % 3 === 0 || months <= 6) {
      timeline.push({ month: months, balance: Math.round(monthTotal) });
    }
  }

  return { months, totalInterest: Math.round(totalInterest), timeline };
}

export default function DebtPayoff() {
  const [debts, setDebts] = useState(() => loadLocal('fa_debts'));
  const [extraPayment, setExtraPayment] = useState(5000);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDebt, setNewDebt] = useState({ name: '', balance: '', rate: '', minPayment: '', type: 'Unsecured' });
  const [selectedStrategy, setSelectedStrategy] = useState('avalanche');

  // Sync with backend on mount
  useEffect(() => {
    const fetchFromAPI = async () => {
      try {
        const res = await api.get('/debt');
        const data = res.data?.debts || res.data?.data || res.data || [];
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map(d => ({
            id: d._id || d.id, name: d.name || d.lender || d.description,
            balance: d.currentBalance || d.balance || d.amount,
            rate: d.interestRate || d.rate || 0,
            minPayment: d.minimumPayment || d.minPayment || d.emiAmount || 0,
            type: d.type || d.category || 'Unsecured', _backendId: d._id
          }));
          setDebts(mapped);
          saveLocal('fa_debts', mapped);
        }
      } catch { /* fallback to localStorage */ }
    };
    fetchFromAPI();
  }, []);

  useEffect(() => { saveLocal('fa_debts', debts); }, [debts]);

  const totalDebt = useMemo(() => debts.reduce((s, d) => s + d.balance, 0), [debts]);
  const totalMinPayment = useMemo(() => debts.reduce((s, d) => s + d.minPayment, 0), [debts]);
  const avgRate = useMemo(() => {
    const weighted = debts.reduce((s, d) => s + d.rate * d.balance, 0);
    return totalDebt > 0 ? (weighted / totalDebt).toFixed(1) : 0;
  }, [debts, totalDebt]);

  const avalanche = useMemo(() => calcPayoff(debts, extraPayment, 'avalanche'), [debts, extraPayment]);
  const snowball = useMemo(() => calcPayoff(debts, extraPayment, 'snowball'), [debts, extraPayment]);
  const noExtra = useMemo(() => calcPayoff(debts, 0, 'avalanche'), [debts]);

  const interestSaved = noExtra.totalInterest - (selectedStrategy === 'avalanche' ? avalanche.totalInterest : snowball.totalInterest);
  const activeResult = selectedStrategy === 'avalanche' ? avalanche : snowball;

  const payoffDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + activeResult.months);
    return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }, [activeResult.months]);

  const daysLeft = activeResult.months * 30;
  const yearsLeft = Math.floor(activeResult.months / 12);
  const monthsLeft = activeResult.months % 12;

  const combinedTimeline = useMemo(() => {
    const map = {};
    avalanche.timeline.forEach(t => { map[t.month] = { ...map[t.month], month: `M${t.month}`, avalanche: t.balance }; });
    snowball.timeline.forEach(t => { map[t.month] = { ...map[t.month], month: `M${t.month}`, snowball: t.balance }; });
    return Object.values(map).sort((a, b) => parseInt(a.month.slice(1)) - parseInt(b.month.slice(1)));
  }, [avalanche, snowball]);

  const paymentSchedule = useMemo(() => {
    let sorted = [...debts];
    if (selectedStrategy === 'avalanche') sorted.sort((a, b) => b.rate - a.rate);
    else sorted.sort((a, b) => a.balance - b.balance);
    let order = 1;
    return sorted.map(d => ({ ...d, order: order++, monthlyInterest: Math.round(d.balance * d.rate / 100 / 12) }));
  }, [debts, selectedStrategy]);

  const addDebt = async () => {
    if (!newDebt.name || !newDebt.balance) return;
    const debtObj = { ...newDebt, id: Date.now(), balance: Number(newDebt.balance), rate: Number(newDebt.rate), minPayment: Number(newDebt.minPayment) };
    setDebts([...debts, debtObj]);
    setNewDebt({ name: '', balance: '', rate: '', minPayment: '', type: 'Unsecured' });
    setShowAddForm(false);
    try {
      const res = await api.post('/debt', {
        name: debtObj.name, amount: debtObj.balance, currentBalance: debtObj.balance,
        interestRate: debtObj.rate, minimumPayment: debtObj.minPayment,
        type: debtObj.type, category: debtObj.type
      });
      if (res.data?._id) {
        setDebts(prev => prev.map(d => d.id === debtObj.id ? { ...d, _backendId: res.data._id } : d));
      }
    } catch { /* saved locally */ }
  };

  const removeDebt = async (id) => {
    const debt = debts.find(d => d.id === id);
    setDebts(debts.filter(d => d.id !== id));
    if (debt?._backendId) {
      try { await api.delete(`/debt/${debt._backendId}`); } catch { /* removed locally */ }
    }
  };

  return (
    <MainLayout title="Debt Payoff">
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <TrendingDown className="w-7 h-7 text-green-600" /> Debt Payoff Planner
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Strategize your way to becoming debt-free</p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 px-4 py-2 flex items-center gap-2 w-fit">
          <Plus className="w-4 h-4" /> Add Debt
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Debt', value: fmt(totalDebt), icon: CreditCard, color: 'text-red-600', sub: `${debts.length} accounts` },
          { label: 'Monthly Payment', value: fmt(totalMinPayment + extraPayment), icon: IndianRupee, color: 'text-blue-600', sub: `₹${extraPayment.toLocaleString('en-IN')} extra` },
          { label: 'Debt-Free Date', value: payoffDate, icon: Calendar, color: 'text-green-600', sub: `${yearsLeft}y ${monthsLeft}m remaining` },
          { label: 'Interest Saved', value: fmt(interestSaved), icon: Target, color: 'text-purple-600', sub: 'vs minimum payments only' },
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

      {/* Debt-Free Countdown */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2"><Clock className="w-5 h-5" /> Debt-Free Countdown</h2>
            <div className="flex items-center gap-6 mt-3">
              <div>
                <p className="text-4xl font-bold">{yearsLeft}</p>
                <p className="text-sm text-green-100">Years</p>
              </div>
              <div>
                <p className="text-4xl font-bold">{monthsLeft}</p>
                <p className="text-sm text-green-100">Months</p>
              </div>
              <div>
                <p className="text-4xl font-bold">{daysLeft}</p>
                <p className="text-sm text-green-100">Days (approx)</p>
              </div>
            </div>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-sm text-green-100">Avg Interest Rate</p>
            <p className="text-3xl font-bold">{avgRate}%</p>
          </div>
        </div>
      </div>

      {/* Debt List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Your Debts</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Debt</th>
                <th className="text-right py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Balance</th>
                <th className="text-right py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Rate</th>
                <th className="text-right py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Min Payment</th>
                <th className="text-center py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Type</th>
                <th className="text-center py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {debts.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500">No debts added yet. Click &quot;Add Debt&quot; to get started.</td></tr>
              )}
              {debts.sort((a, b) => b.rate - a.rate).map((d) => (
                <tr key={d.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="py-3 px-4 text-slate-800 dark:text-white font-medium">{d.name}</td>
                  <td className="py-3 px-4 text-right text-slate-800 dark:text-white font-semibold">{fmt(d.balance)}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`font-medium ${d.rate >= 20 ? 'text-red-500' : d.rate >= 10 ? 'text-amber-500' : 'text-green-500'}`}>{d.rate}%</span>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">₹{d.minPayment.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${d.type === 'Revolving' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : d.type === 'Secured' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                      {d.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button onClick={() => removeDebt(d.id)} className="text-red-500 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strategy Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Payoff Strategy</h2>
          <div className="flex gap-3 mb-4">
            <button onClick={() => setSelectedStrategy('avalanche')}
              className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 ${selectedStrategy === 'avalanche' ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30'}`}>
              <Zap className={`w-6 h-6 ${selectedStrategy === 'avalanche' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className={`text-sm font-medium ${selectedStrategy === 'avalanche' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>Avalanche</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Highest rate first</span>
            </button>
            <button onClick={() => setSelectedStrategy('snowball')}
              className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 ${selectedStrategy === 'snowball' ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30'}`}>
              <Snowflake className={`w-6 h-6 ${selectedStrategy === 'snowball' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className={`text-sm font-medium ${selectedStrategy === 'snowball' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>Snowball</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Smallest balance first</span>
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
              <span className="text-sm text-slate-600 dark:text-slate-300">Avalanche - Total Interest</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white">{fmt(avalanche.totalInterest)} ({avalanche.months} months)</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
              <span className="text-sm text-slate-600 dark:text-slate-300">Snowball - Total Interest</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white">{fmt(snowball.totalInterest)} ({snowball.months} months)</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
              <span className="text-sm text-green-700 dark:text-green-300">Interest Difference</span>
              <span className="text-sm font-bold text-green-700 dark:text-green-300">{fmt(Math.abs(avalanche.totalInterest - snowball.totalInterest))}</span>
            </div>
          </div>
        </div>

        {/* Extra Payment Calculator */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-500" /> Extra Payment Calculator
          </h2>
          <div className="mb-6">
            <label className="text-sm text-slate-500 dark:text-slate-400 flex justify-between mb-2">
              <span>Extra Monthly Payment</span>
              <span className="font-semibold text-slate-800 dark:text-white">₹{extraPayment.toLocaleString('en-IN')}</span>
            </label>
            <input type="range" min={0} max={50000} step={500} value={extraPayment} onChange={e => setExtraPayment(Number(e.target.value))} className="w-full accent-blue-600" />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>₹0</span><span>₹50,000</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
              <p className="text-xs text-blue-600 dark:text-blue-400">With extra payments</p>
              <p className="text-xl font-bold text-blue-800 dark:text-blue-200">{activeResult.months} months • {fmt(activeResult.totalInterest)} interest</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">Without extra payments</p>
              <p className="text-xl font-bold text-slate-800 dark:text-white">{noExtra.months} months • {fmt(noExtra.totalInterest)} interest</p>
            </div>
            <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
              <p className="text-xs text-green-600 dark:text-green-400">You save</p>
              <p className="text-xl font-bold text-green-700 dark:text-green-300">{fmt(interestSaved)} & {noExtra.months - activeResult.months} months earlier!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payoff Timeline Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Payoff Timeline Comparison</h2>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={combinedTimeline}>
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis tickFormatter={v => fmt(v)} tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip formatter={v => fmt(v)} />
            <Legend />
            <Area type="monotone" dataKey="avalanche" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} name="Avalanche" />
            <Area type="monotone" dataKey="snowball" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} name="Snowball" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Payment Schedule */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Payment Priority ({selectedStrategy === 'avalanche' ? 'Avalanche' : 'Snowball'} Order)</h2>
        <div className="space-y-3">
          {paymentSchedule.map((d, i) => (
            <div key={d.id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${i === 0 ? 'bg-blue-600' : 'bg-slate-400 dark:bg-slate-600'}`}>
                {d.order}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800 dark:text-white">{d.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{d.rate}% APR • Monthly interest: ₹{d.monthlyInterest.toLocaleString('en-IN')}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800 dark:text-white">{fmt(d.balance)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Min: ₹{d.minPayment.toLocaleString('en-IN')}/mo</p>
              </div>
              {i === 0 && <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Focus</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Add Debt Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-slate-200 dark:border-slate-700 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Add New Debt</h3>
              <button onClick={() => setShowAddForm(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Name</label>
                <input value={newDebt.name} onChange={e => setNewDebt({ ...newDebt, name: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm" placeholder="e.g. Personal Loan" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Balance (₹)</label>
                  <input type="number" value={newDebt.balance} onChange={e => setNewDebt({ ...newDebt, balance: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Interest Rate (%)</label>
                  <input type="number" step="0.1" value={newDebt.rate} onChange={e => setNewDebt({ ...newDebt, rate: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Min Payment (₹)</label>
                  <input type="number" value={newDebt.minPayment} onChange={e => setNewDebt({ ...newDebt, minPayment: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Type</label>
                  <select value={newDebt.type} onChange={e => setNewDebt({ ...newDebt, type: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm">
                    <option>Secured</option><option>Unsecured</option><option>Revolving</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setShowAddForm(false)} className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm px-4 py-2">Cancel</button>
              <button onClick={addDebt} className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 px-4 py-2">Add Debt</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </MainLayout>
  );
}
