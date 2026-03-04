import React, { useState, useMemo, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  Landmark, Plus, TrendingUp, Calculator, Calendar, IndianRupee, X,
  Edit2, Trash2, ArrowUpRight, Clock, RefreshCw, Shield, AlertTriangle,
  BarChart3, ChevronDown, Check, Info
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import MainLayout from '../components/MainLayout';
import api from '../services/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6'];

const loadLocal = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
const saveLocal = (key, data) => localStorage.setItem(key, JSON.stringify(data));

const bankRates = [
  { bank: 'SBI', '1Y': 6.8, '2Y': 7.0, '3Y': 7.0, '5Y': 6.5 },
  { bank: 'HDFC', '1Y': 7.0, '2Y': 7.25, '3Y': 7.25, '5Y': 7.0 },
  { bank: 'ICICI', '1Y': 6.9, '2Y': 7.1, '3Y': 7.1, '5Y': 6.7 },
  { bank: 'Axis', '1Y': 7.1, '2Y': 7.15, '3Y': 7.2, '5Y': 6.9 },
  { bank: 'Kotak', '1Y': 7.2, '2Y': 7.3, '3Y': 7.3, '5Y': 7.1 },
  { bank: 'PNB', '1Y': 6.5, '2Y': 6.8, '3Y': 7.0, '5Y': 6.5 },
];


const ladderingData = [
  { year: 'Year 1', amount: 200000, rate: 7.0, maturity: 214000 },
  { year: 'Year 2', amount: 200000, rate: 7.25, maturity: 230756 },
  { year: 'Year 3', amount: 200000, rate: 7.0, maturity: 245023 },
  { year: 'Year 5', amount: 200000, rate: 6.5, maturity: 274082 },
];

const comparisonData = [
  { instrument: 'FD (7%)', '3Y': 21.0, '5Y': 35.0, risk: 'Low' },
  { instrument: 'PPF (7.1%)', '3Y': 21.3, '5Y': 35.5, risk: 'Low' },
  { instrument: 'RD (6.8%)', '3Y': 20.4, '5Y': 34.0, risk: 'Low' },
  { instrument: 'Debt MF', '3Y': 18.0, '5Y': 32.0, risk: 'Low-Med' },
  { instrument: 'ELSS', '3Y': 36.0, '5Y': 65.0, risk: 'High' },
];

const emptyForm = { bank: 'SBI', amount: '', rate: '', tenure: '', startDate: '', autoRenew: false };

export default function FixedDeposits() {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  const [fds, setFDs] = useState(() => loadLocal('fa_fixed_deposits'));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [calcAmount, setCalcAmount] = useState(100000);
  const [calcRate, setCalcRate] = useState(7.0);
  const [calcTenure, setCalcTenure] = useState(36);
  const [showCalc, setShowCalc] = useState(false);

  // Sync with backend on mount
  useEffect(() => {
    const fetchFromAPI = async () => {
      try {
        const res = await api.get('/investments', { params: { type: 'fd' } });
        const data = res.data?.investments || res.data?.data || res.data || [];
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map(inv => ({
            id: inv._id || inv.id, bank: inv.platform || inv.broker || 'SBI',
            amount: inv.totalInvestedAmount || inv.purchasePrice * inv.quantity,
            rate: inv.interestRate || 7.0, tenure: inv.tenure || 12,
            startDate: inv.purchaseDate ? new Date(inv.purchaseDate).toISOString().split('T')[0] : '',
            maturityDate: inv.maturityDate ? new Date(inv.maturityDate).toISOString().split('T')[0] : '',
            maturityAmount: inv.currentValue || inv.totalInvestedAmount,
            autoRenew: inv.autoRenew || false, _backendId: inv._id
          }));
          setFDs(mapped);
          saveLocal('fa_fixed_deposits', mapped);
        }
      } catch { /* fallback to localStorage */ }
    };
    fetchFromAPI();
  }, []);

  useEffect(() => { saveLocal('fa_fixed_deposits', fds); }, [fds]);

  const totalInvested = useMemo(() => fds.reduce((s, f) => s + f.amount, 0), [fds]);
  const totalMaturity = useMemo(() => fds.reduce((s, f) => s + f.maturityAmount, 0), [fds]);
  const totalInterest = totalMaturity - totalInvested;
  const avgRate = useMemo(() => {
    const weighted = fds.reduce((s, f) => s + f.rate * f.amount, 0);
    return totalInvested > 0 ? (weighted / totalInvested).toFixed(2) : 0;
  }, [fds, totalInvested]);

  const investedVsMaturity = useMemo(() => fds.map(f => ({
    bank: `${f.bank} (${f.tenure}M)`, invested: f.amount, maturity: f.maturityAmount, interest: f.maturityAmount - f.amount
  })), [fds]);

  const maturityCalendar = useMemo(() => {
    return [...fds].sort((a, b) => new Date(a.maturityDate) - new Date(b.maturityDate)).map(f => {
      const days = Math.ceil((new Date(f.maturityDate) - new Date()) / (1000 * 60 * 60 * 24));
      return { ...f, daysToMaturity: days };
    });
  }, [fds]);

  const calcMaturity = useMemo(() => {
    const r = calcRate / 100;
    const n = calcTenure / 12;
    const quarterly = 4;
    const maturity = calcAmount * Math.pow(1 + r / quarterly, quarterly * n);
    return { maturity: Math.round(maturity), interest: Math.round(maturity - calcAmount) };
  }, [calcAmount, calcRate, calcTenure]);

  const taxOnInterest = useMemo(() => {
    const totalInterestYear = fds.reduce((s, f) => {
      const yearlyInterest = (f.maturityAmount - f.amount) / (f.tenure / 12);
      return s + yearlyInterest;
    }, 0);
    return {
      totalInterest: Math.round(totalInterestYear),
      tdsApplicable: totalInterestYear > 40000,
      tds: totalInterestYear > 40000 ? Math.round(totalInterestYear * 0.1) : 0,
    };
  }, [fds]);

  const handleAdd = async () => {
    if (!form.amount || !form.rate || !form.tenure || !form.startDate) return;
    const amt = Number(form.amount);
    const r = Number(form.rate) / 100;
    const t = Number(form.tenure) / 12;
    const maturity = Math.round(amt * Math.pow(1 + r / 4, 4 * t));
    const start = new Date(form.startDate);
    const matDate = new Date(start);
    matDate.setMonth(matDate.getMonth() + Number(form.tenure));
    const newFD = {
      id: Date.now(), bank: form.bank, amount: amt, rate: Number(form.rate),
      tenure: Number(form.tenure), startDate: form.startDate,
      maturityDate: matDate.toISOString().split('T')[0], maturityAmount: maturity,
      autoRenew: form.autoRenew
    };
    setFDs(prev => [...prev, newFD]);
    setForm(emptyForm);
    setShowForm(false);
    try {
      const res = await api.post('/investments', {
        type: 'fd', name: `${form.bank} FD`, platform: form.bank,
        quantity: 1, purchasePrice: amt, currentPrice: amt, totalInvestedAmount: amt,
        currentValue: maturity, interestRate: Number(form.rate), tenure: Number(form.tenure),
        purchaseDate: form.startDate, maturityDate: matDate.toISOString(),
        autoRenew: form.autoRenew
      });
      if (res.data?._id) {
        setFDs(prev => prev.map(f => f.id === newFD.id ? { ...f, _backendId: res.data._id } : f));
      }
    } catch { /* saved locally */ }
  };

  const deleteFD = async (id) => {
    const fd = fds.find(f => f.id === id);
    setFDs(prev => prev.filter(f => f.id !== id));
    if (fd?._backendId) { try { await api.delete(`/investments/${fd._backendId}`); } catch { /* removed locally */ } }
  };
  const toggleAutoRenew = (id) => setFDs(prev => prev.map(f => f.id === id ? { ...f, autoRenew: !f.autoRenew } : f));

  return (
    <MainLayout title="Fixed Deposits">
    <div className={`min-h-screen ${dk ? 'bg-gray-900' : 'bg-gray-50'} p-4 md:p-6`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
            <Landmark className="w-7 h-7 text-blue-600" /> Fixed Deposits
          </h1>
          <p className={`${dk ? 'text-gray-400' : 'text-gray-500'} text-sm mt-1`}>Manage your fixed deposit investments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCalc(!showCalc)} className={`flex items-center gap-2 px-4 py-2 border ${dk ? `border-gray-600` : `border-gray-300`} ${dk ? 'text-gray-300' : 'text-gray-700'} rounded-lg ${dk ? `hover:bg-gray-700` : `hover:bg-gray-100`}`}>
            <Calculator className="w-4 h-4" /> Calculator
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Add FD
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Invested', value: `₹${totalInvested.toLocaleString()}`, icon: <IndianRupee className="w-5 h-5" />, color: `text-blue-600 ${dk ? 'bg-blue-900/40' : 'bg-blue-100'}` },
          { label: 'Total Maturity', value: `₹${totalMaturity.toLocaleString()}`, icon: <TrendingUp className="w-5 h-5" />, color: `text-green-600 ${dk ? 'bg-green-900/40' : 'bg-green-100'}` },
          { label: 'Total Interest', value: `₹${totalInterest.toLocaleString()}`, icon: <ArrowUpRight className="w-5 h-5" />, color: `text-purple-600 ${dk ? 'bg-purple-900/40' : 'bg-purple-100'}` },
          { label: 'Avg Rate', value: `${avgRate}%`, icon: <BarChart3 className="w-5 h-5" />, color: `text-orange-600 ${dk ? 'bg-orange-900/40' : 'bg-orange-100'}` },
        ].map((c, i) => (
          <div key={i} className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 shadow-sm border ${dk ? 'border-gray-700' : 'border-gray-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${dk ? 'text-gray-400' : 'text-gray-500'}`}>{c.label}</span>
              <span className={`p-2 rounded-lg ${c.color}`}>{c.icon}</span>
            </div>
            <p className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Active FDs Table */}
      <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 shadow-sm border ${dk ? 'border-gray-700' : 'border-gray-100'} mb-6`}>
        <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Active Fixed Deposits</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className={`text-left ${dk ? 'text-gray-400' : 'text-gray-500'} border-b ${dk ? 'border-gray-700' : ''}`}><th className="pb-2 pr-3">Bank</th><th className="pb-2 pr-3">Amount</th><th className="pb-2 pr-3">Rate</th><th className="pb-2 pr-3">Tenure</th><th className="pb-2 pr-3">Maturity Date</th><th className="pb-2 pr-3">Maturity Amt</th><th className="pb-2 pr-3">Auto-Renew</th><th className="pb-2"></th></tr></thead>
            <tbody>
              {fds.map(f => (
                <tr key={f.id} className={`border-b ${dk ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} ${dk ? 'border-gray-700' : ''}`}>
                  <td className={`py-3 pr-3 font-medium ${dk ? 'text-white' : 'text-gray-900'}`}>{f.bank}</td>
                  <td className={`py-3 pr-3 ${dk ? 'text-gray-300' : 'text-gray-700'}`}>₹{f.amount.toLocaleString()}</td>
                  <td className="py-3 pr-3 text-green-600 font-medium">{f.rate}%</td>
                  <td className={`py-3 pr-3 ${dk ? 'text-gray-300' : 'text-gray-700'}`}>{f.tenure} months</td>
                  <td className={`py-3 pr-3 ${dk ? 'text-gray-300' : 'text-gray-700'}`}>{f.maturityDate}</td>
                  <td className={`py-3 pr-3 font-medium ${dk ? 'text-white' : 'text-gray-900'}`}>₹{f.maturityAmount.toLocaleString()}</td>
                  <td className="py-3 pr-3">
                    <button onClick={() => toggleAutoRenew(f.id)} className={`px-2 py-1 text-xs rounded-full ${f.autoRenew ? `${dk ? `bg-green-900/30` : `bg-green-100`} ${dk ? `text-green-300` : `text-green-700`}` : `${dk ? `bg-gray-700` : `bg-gray-100`} ${dk ? `text-gray-400` : `text-gray-500`}`}`}>
                      {f.autoRenew ? <><RefreshCw className="w-3 h-3 inline mr-1" />On</> : 'Off'}
                    </button>
                  </td>
                  <td className="py-3"><button onClick={() => deleteFD(f.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invested vs Maturity Chart */}
      <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 shadow-sm border ${dk ? 'border-gray-700' : 'border-gray-100'} mb-6`}>
        <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Invested vs Maturity</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={investedVsMaturity}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="bank" stroke="#9ca3af" tick={{ fontSize: 11 }} />
            <YAxis stroke="#9ca3af" tickFormatter={v => `₹${(v / 100000).toFixed(1)}L`} />
            <Tooltip formatter={v => `₹${Number(v).toLocaleString()}`} />
            <Legend />
            <Bar dataKey="invested" name="Invested" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="maturity" name="Maturity" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Maturity Calendar & Bank Rate Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 shadow-sm border ${dk ? 'border-gray-700' : 'border-gray-100'}`}>
          <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}><Calendar className="w-5 h-5 text-blue-500" /> FD Maturity Calendar</h2>
          <div className="space-y-3">
            {maturityCalendar.map(f => (
              <div key={f.id} className={`p-3 rounded-lg border-l-4 ${f.daysToMaturity <= 30 ? `border-l-red-500 ${dk ? `bg-red-900/20` : `bg-red-50`}` : f.daysToMaturity <= 90 ? `border-l-yellow-500 ${dk ? 'bg-yellow-900/20' : 'bg-yellow-50'}` : `border-l-green-500 ${dk ? `bg-green-900/20` : `bg-green-50`}`}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className={`font-medium ${dk ? 'text-white' : 'text-gray-900'}`}>{f.bank} - ₹{f.amount.toLocaleString()}</p>
                    <p className={`text-xs ${dk ? 'text-gray-400' : 'text-gray-500'}`}>Maturity: {f.maturityDate}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>₹{f.maturityAmount.toLocaleString()}</p>
                    <p className={`text-xs font-medium ${f.daysToMaturity <= 30 ? 'text-red-600' : f.daysToMaturity <= 90 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {f.daysToMaturity > 0 ? `${f.daysToMaturity} days left` : 'Matured'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 shadow-sm border ${dk ? 'border-gray-700' : 'border-gray-100'}`}>
          <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Interest Rate Comparison (Banks)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className={`text-left ${dk ? 'text-gray-400' : 'text-gray-500'} border-b ${dk ? 'border-gray-700' : ''}`}><th className="pb-2 pr-3">Bank</th><th className="pb-2 pr-3">1Y</th><th className="pb-2 pr-3">2Y</th><th className="pb-2 pr-3">3Y</th><th className="pb-2">5Y</th></tr></thead>
              <tbody>
                {bankRates.map(b => (
                  <tr key={b.bank} className={`border-b ${dk ? 'border-gray-700' : ''}`}>
                    <td className={`py-2 pr-3 font-medium ${dk ? 'text-white' : 'text-gray-900'}`}>{b.bank}</td>
                    <td className={`py-2 pr-3 ${dk ? 'text-gray-300' : 'text-gray-700'}`}>{b['1Y']}%</td>
                    <td className={`py-2 pr-3 ${dk ? 'text-gray-300' : 'text-gray-700'}`}>{b['2Y']}%</td>
                    <td className={`py-2 pr-3 ${dk ? 'text-gray-300' : 'text-gray-700'}`}>{b['3Y']}%</td>
                    <td className={`py-2 ${dk ? 'text-gray-300' : 'text-gray-700'}`}>{b['5Y']}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FD Calculator */}
      {showCalc && (
        <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 shadow-sm border ${dk ? 'border-gray-700' : 'border-gray-100'} mb-6`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}><Calculator className="w-5 h-5 text-green-500" /> FD Calculator</h2>
            <button onClick={() => setShowCalc(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><label className={`block text-sm font-medium ${dk ? `text-gray-300` : `text-gray-700`} mb-1`}>Amount (₹)</label><input type="number" value={calcAmount} onChange={e => setCalcAmount(Number(e.target.value))} className={`w-full px-3 py-2 rounded-lg border ${dk ? `border-gray-600` : ``} ${dk ? `bg-gray-700` : ``} ${dk ? `text-white` : ``}`} /></div>
            <div><label className={`block text-sm font-medium ${dk ? `text-gray-300` : `text-gray-700`} mb-1`}>Rate (%)</label><input type="number" step="0.1" value={calcRate} onChange={e => setCalcRate(Number(e.target.value))} className={`w-full px-3 py-2 rounded-lg border ${dk ? `border-gray-600` : ``} ${dk ? `bg-gray-700` : ``} ${dk ? `text-white` : ``}`} /></div>
            <div><label className={`block text-sm font-medium ${dk ? `text-gray-300` : `text-gray-700`} mb-1`}>Tenure (Months)</label><input type="number" value={calcTenure} onChange={e => setCalcTenure(Number(e.target.value))} className={`w-full px-3 py-2 rounded-lg border ${dk ? `border-gray-600` : ``} ${dk ? `bg-gray-700` : ``} ${dk ? `text-white` : ``}`} /></div>
            <div className={`${dk ? 'bg-green-900/20' : 'bg-green-50'} rounded-lg p-3`}>
              <p className={`text-xs ${dk ? 'text-gray-400' : 'text-gray-500'}`}>Maturity Amount</p>
              <p className="text-xl font-bold text-green-600">₹{calcMaturity.maturity.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Interest: ₹{calcMaturity.interest.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Laddering Strategy */}
      <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 shadow-sm border ${dk ? 'border-gray-700' : 'border-gray-100'} mb-6`}>
        <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}><Shield className="w-5 h-5 text-blue-500" /> FD Laddering Strategy</h2>
        <p className={`text-sm ${dk ? 'text-gray-400' : 'text-gray-500'} mb-4`}>Spread investments across different tenures for optimal liquidity and returns</p>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={ladderingData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="year" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" tickFormatter={v => `₹${(v / 100000).toFixed(1)}L`} />
            <Tooltip formatter={v => `₹${Number(v).toLocaleString()}`} />
            <Legend />
            <Bar dataKey="amount" name="Invested" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="maturity" name="Maturity" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tax Info & Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 shadow-sm border ${dk ? 'border-gray-700' : 'border-gray-100'}`}>
          <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}><Info className="w-5 h-5 text-yellow-500" /> Tax on FD Interest</h2>
          <div className="space-y-3">
            <div className={`p-3 ${dk ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg flex justify-between`}>
              <span className={`text-sm ${dk ? 'text-gray-300' : 'text-gray-600'}`}>Est. Annual Interest</span>
              <span className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>₹{taxOnInterest.totalInterest.toLocaleString()}</span>
            </div>
            <div className={`p-3 ${dk ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg flex justify-between`}>
              <span className={`text-sm ${dk ? 'text-gray-300' : 'text-gray-600'}`}>TDS Applicable</span>
              <span className={`font-semibold ${taxOnInterest.tdsApplicable ? 'text-red-600' : 'text-green-600'}`}>{taxOnInterest.tdsApplicable ? 'Yes (>₹40,000)' : 'No'}</span>
            </div>
            {taxOnInterest.tdsApplicable && (
              <div className={`p-3 ${dk ? 'bg-red-900/20' : 'bg-red-50'} rounded-lg flex justify-between`}>
                <span className={`text-sm ${dk ? 'text-red-300' : 'text-red-700'}`}>TDS Amount (10%)</span>
                <span className="font-semibold text-red-600">₹{taxOnInterest.tds.toLocaleString()}</span>
              </div>
            )}
            <p className={`text-xs ${dk ? 'text-gray-400' : 'text-gray-500'}`}>TDS is deducted when interest exceeds ₹40,000/year (₹50,000 for senior citizens). Submit Form 15G/15H to avoid TDS if total income is below taxable limit.</p>
          </div>
        </div>

        <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 shadow-sm border ${dk ? 'border-gray-700' : 'border-gray-100'}`}>
          <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>FD vs Other Instruments</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className={`text-left ${dk ? 'text-gray-400' : 'text-gray-500'} border-b ${dk ? 'border-gray-700' : ''}`}><th className="pb-2 pr-3">Instrument</th><th className="pb-2 pr-3">3Y Returns</th><th className="pb-2 pr-3">5Y Returns</th><th className="pb-2">Risk</th></tr></thead>
              <tbody>
                {comparisonData.map(c => (
                  <tr key={c.instrument} className={`border-b ${dk ? 'border-gray-700' : ''}`}>
                    <td className={`py-2 pr-3 font-medium ${dk ? 'text-white' : 'text-gray-900'}`}>{c.instrument}</td>
                    <td className={`py-2 pr-3 ${dk ? 'text-gray-300' : 'text-gray-700'}`}>{c['3Y']}%</td>
                    <td className={`py-2 pr-3 ${dk ? 'text-gray-300' : 'text-gray-700'}`}>{c['5Y']}%</td>
                    <td className="py-2"><span className={`text-xs px-2 py-1 rounded-full ${c.risk === `Low` ? `${dk ? 'bg-green-900/30` : `bg-green-100`} text-green-700` : c.risk === `High` ? `${dk ? `bg-red-900/30' : 'bg-red-100'} text-red-700` : `${dk ? `bg-yellow-900/30` : `bg-yellow-100`} text-yellow-700`}`}>{c.risk}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add FD Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 w-full max-w-md shadow-xl`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>Add Fixed Deposit</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className={`block text-sm font-medium ${dk ? `text-gray-300` : `text-gray-700`} mb-1`}>Bank</label><select value={form.bank} onChange={e => setForm(p => ({ ...p, bank: e.target.value }))} className={`w-full px-3 py-2 rounded-lg border ${dk ? `border-gray-600` : ``} ${dk ? `bg-gray-700` : ``} ${dk ? `text-white` : ``}`}>{bankRates.map(b => <option key={b.bank} value={b.bank}>{b.bank}</option>)}</select></div>
              <div><label className={`block text-sm font-medium ${dk ? `text-gray-300` : `text-gray-700`} mb-1`}>Amount (₹)</label><input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className={`w-full px-3 py-2 rounded-lg border ${dk ? `border-gray-600` : ``} ${dk ? `bg-gray-700` : ``} ${dk ? `text-white` : ``}`} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={`block text-sm font-medium ${dk ? `text-gray-300` : `text-gray-700`} mb-1`}>Rate (%)</label><input type="number" step="0.1" value={form.rate} onChange={e => setForm(p => ({ ...p, rate: e.target.value }))} className={`w-full px-3 py-2 rounded-lg border ${dk ? `border-gray-600` : ``} ${dk ? `bg-gray-700` : ``} ${dk ? `text-white` : ``}`} /></div>
                <div><label className={`block text-sm font-medium ${dk ? `text-gray-300` : `text-gray-700`} mb-1`}>Tenure (Months)</label><input type="number" value={form.tenure} onChange={e => setForm(p => ({ ...p, tenure: e.target.value }))} className={`w-full px-3 py-2 rounded-lg border ${dk ? `border-gray-600` : ``} ${dk ? `bg-gray-700` : ``} ${dk ? `text-white` : ``}`} /></div>
              </div>
              <div><label className={`block text-sm font-medium ${dk ? `text-gray-300` : `text-gray-700`} mb-1`}>Start Date</label><input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className={`w-full px-3 py-2 rounded-lg border ${dk ? `border-gray-600` : ``} ${dk ? `bg-gray-700` : ``} ${dk ? `text-white` : ``}`} /></div>
              <label className={`flex items-center gap-2 text-sm ${dk ? 'text-gray-300' : 'text-gray-700'}`}>
                <input type="checkbox" checked={form.autoRenew} onChange={e => setForm(p => ({ ...p, autoRenew: e.target.checked }))} className="rounded" /> Auto-Renew on Maturity
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className={`flex-1 py-2 border ${dk ? 'border-gray-600' : 'border-gray-300'} rounded-lg ${dk ? 'text-gray-300' : 'text-gray-700'}`}>Cancel</button>
              <button onClick={handleAdd} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add FD</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </MainLayout>
  );
}
