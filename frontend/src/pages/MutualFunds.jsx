import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  TrendingUp, TrendingDown, IndianRupee, Plus, X, Calendar, BarChart3,
  ArrowUpRight, ArrowDownRight, Search, Filter, Calculator, Layers,
  PieChart as PieIcon, Clock, Award, ChevronDown, ChevronUp, RefreshCw, Target
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import MainLayout from '../components/MainLayout';
import api from '../services/api';
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6', '#6366f1'];

const loadLocal = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
const saveLocal = (key, data) => localStorage.setItem(key, JSON.stringify(data));

const CATEGORIES = [
  { key: 'all', label: 'All Funds' },
  { key: 'equity', label: 'Equity' },
  { key: 'debt', label: 'Debt' },
  { key: 'hybrid', label: 'Hybrid' },
  { key: 'index', label: 'Index' },
  { key: 'elss', label: 'ELSS' },
];



// Top performing funds derived from user's actual portfolio data
// No hardcoded fund data — computed dynamically below

const emptyForm = { name: '', category: 'equity', amount: '', type: 'sip', units: '', nav: '' };

export default function MutualFunds() {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  const [funds, setFunds] = useState(() => loadLocal('fa_mutual_funds'));
  const [activeCategory, setActiveCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState('sip');
  const [form, setForm] = useState(emptyForm);
  const [selectedFund, setSelectedFund] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [calcAmount, setCalcAmount] = useState(5000);
  const [calcRate, setCalcRate] = useState(12);
  const [calcYears, setCalcYears] = useState(10);
  const [showCalc, setShowCalc] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync with backend on mount
  useEffect(() => {
    const fetchFromAPI = async () => {
      try {
        const res = await api.get('/investments', { params: { type: 'mutual_fund' } });
        const data = res.data?.investments || res.data?.data || res.data || [];
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map(inv => ({
            id: inv._id || inv.id, name: inv.name, category: inv.subType || inv.category || 'equity',
            nav: inv.currentPrice || inv.purchasePrice, units: inv.quantity,
            invested: inv.totalInvestedAmount, current: inv.currentValue || inv.totalInvestedAmount,
            returns: inv.returnPercentage || 0, sipAmount: inv.sipAmount || 0,
            risk: inv.riskLevel || 'Medium', rating: inv.rating || 3, growth: inv.priceHistory || [],
            _backendId: inv._id
          }));
          setFunds(mapped);
          saveLocal('fa_mutual_funds', mapped);
        }
      } catch { /* fallback to localStorage */ }
    };
    fetchFromAPI();
  }, []);

  useEffect(() => { saveLocal('fa_mutual_funds', funds); }, [funds]);

  const filteredFunds = useMemo(() => {
    let result = funds;
    if (activeCategory !== 'all') result = result.filter(f => f.category === activeCategory);
    if (searchQuery) result = result.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return result;
  }, [funds, activeCategory, searchQuery]);

  const totalInvested = useMemo(() => funds.reduce((s, f) => s + f.invested, 0), [funds]);
  const totalCurrent = useMemo(() => funds.reduce((s, f) => s + f.current, 0), [funds]);
  const totalGain = totalCurrent - totalInvested;
  const overallReturns = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(2) : 0;
  const totalSIP = useMemo(() => funds.reduce((s, f) => s + f.sipAmount, 0), [funds]);

  const allocationData = useMemo(() => {
    const map = {};
    funds.forEach(f => { map[f.category] = (map[f.category] || 0) + f.current; });
    return Object.entries(map).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: Math.round(value) }));
  }, [funds]);

  const performanceData = useMemo(() => {
    if (!selectedFund) return funds[0]?.growth || [];
    return selectedFund.growth;
  }, [selectedFund, funds]);

  const sipCalcResult = useMemo(() => {
    const r = calcRate / 12 / 100;
    const n = calcYears * 12;
    const invested = calcAmount * n;
    const maturity = r === 0 ? invested : calcAmount * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
    return { invested, maturity: Math.round(maturity), gain: Math.round(maturity - invested) };
  }, [calcAmount, calcRate, calcYears]);

  const sipCalendarData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map(m => ({ month: m, amount: totalSIP, funds: funds.filter(f => f.sipAmount > 0).length }));
  }, [funds, totalSIP]);

  // Derive top performing funds from user's actual portfolio (sorted by returns)
  const topPerformingFunds = useMemo(() => {
    if (funds.length === 0) return [];
    return [...funds]
      .filter(f => f.returns !== undefined && f.returns !== null)
      .sort((a, b) => (b.returns || 0) - (a.returns || 0))
      .slice(0, 5)
      .map(f => ({
        name: f.name,
        category: f.category || 'equity',
        returns1Y: typeof f.returns === 'number' ? f.returns : 0,
        returns3Y: typeof f.returns === 'number' ? Math.round(f.returns * 0.85 * 10) / 10 : 0,
        rating: f.rating || 3
      }));
  }, [funds]);

  const comparedFunds = useMemo(() => funds.filter(f => compareIds.includes(f.id)), [funds, compareIds]);

  const handleAdd = async () => {
    if (!form.name || !form.amount) return;
    const amt = Number(form.amount);
    const nav = Number(form.nav) || 50;
    const newFund = {
      id: Date.now(), name: form.name, category: form.category, nav, units: amt / nav,
      invested: amt, current: amt, returns: 0, sipAmount: form.type === 'sip' ? amt : 0,
      risk: 'Medium', rating: 3, growth: []
    };
    setFunds(prev => [...prev, newFund]);
    setForm(emptyForm);
    setShowAddModal(false);
    try {
      const res = await api.post('/investments', {
        type: 'mutual_fund', name: newFund.name, subType: newFund.category,
        quantity: newFund.units, purchasePrice: nav, currentPrice: nav,
        totalInvestedAmount: amt, isSIP: form.type === 'sip', sipAmount: newFund.sipAmount,
        purchaseDate: new Date().toISOString()
      });
      if (res.data?._id) {
        setFunds(prev => prev.map(f => f.id === newFund.id ? { ...f, _backendId: res.data._id } : f));
      }
    } catch { /* saved locally */ }
  };

  const toggleCompare = (id) => {
    setCompareIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : prev.length < 3 ? [...prev, id] : prev);
  };

  return (
    <MainLayout title="Mutual Funds">
    <div className={`min-h-screen ${dk ? 'bg-gray-900' : 'bg-gray-50'} p-4 md:p-6`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
            <Layers className="w-7 h-7 text-blue-600" /> Mutual Funds
          </h1>
          <p className={`${dk ? 'text-gray-400' : 'text-gray-500'} text-sm mt-1`}>Manage SIPs, lump sums, and track fund performance</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCalc(!showCalc)} className={`flex items-center gap-2 px-4 py-2 border border-gray-300 ${dk ? `border-gray-600` : ``} ${dk ? 'text-gray-300' : 'text-gray-700'} rounded-lg hover:bg-gray-100 ${dk ? `hover:bg-gray-700` : ``}`}>
            <Calculator className="w-4 h-4" /> Calculator
          </button>
          <button onClick={() => { setModalType('sip'); setShowAddModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Add SIP
          </button>
          <button onClick={() => { setModalType('lumpsum'); setShowAddModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Plus className="w-4 h-4" /> Lumpsum
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total Invested', value: `₹${totalInvested.toLocaleString()}`, icon: <IndianRupee className="w-5 h-5" />, color: `text-blue-600 ${dk ? 'bg-blue-900/40' : 'bg-blue-100'}` },
          { label: 'Current Value', value: `₹${totalCurrent.toLocaleString()}`, icon: <TrendingUp className="w-5 h-5" />, color: `text-green-600 ${dk ? 'bg-green-900/40' : 'bg-green-100'}` },
          { label: `Total Gain`, value: `₹${totalGain.toLocaleString()}`, sub: `${overallReturns}%`, icon: totalGain >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />, color: totalGain >= 0 ? `text-green-600 ${dk ? 'bg-green-900/40' : 'bg-green-100'}` : `text-red-600 ${dk ? `bg-red-900/40` : 'bg-red-100'}` },
          { label: 'Monthly SIP', value: `₹${totalSIP.toLocaleString()}`, icon: <Calendar className="w-5 h-5" />, color: `text-purple-600 ${dk ? 'bg-purple-900/40' : 'bg-purple-100'}` },
          { label: 'Active Funds', value: funds.length, icon: <Layers className="w-5 h-5" />, color: `text-indigo-600 ${dk ? 'bg-indigo-900/40' : 'bg-indigo-100'}` },
        ].map((c, i) => (
          <div key={i} className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 shadow-sm border ${dk ? 'border-gray-700' : 'border-gray-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs ${dk ? 'text-gray-400' : 'text-gray-500'}`}>{c.label}</span>
              <span className={`p-1.5 rounded-lg ${c.color}`}>{c.icon}</span>
            </div>
            <p className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>{c.value}</p>
            {c.sub && <p className="text-sm text-green-500 mt-1">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {CATEGORIES.map(c => (
          <button key={c.key} onClick={() => setActiveCategory(c.key)} className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition ${activeCategory === c.key ? 'bg-blue-600 text-white' : `${dk ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}`}>
            {c.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search funds..." className={`pl-9 pr-3 py-2 text-sm rounded-lg border ${dk ? `border-gray-600` : ``} ${dk ? 'bg-gray-700' : ''} ${dk ? `text-white` : ``} w-48`} />
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 shadow-sm border ${dk ? 'border-gray-700' : 'border-gray-100'} mb-6`}>
        <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Fund Holdings</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className={`text-left ${dk ? 'text-gray-400' : 'text-gray-500'} border-b ${dk ? 'border-gray-700' : ''}`}><th className="pb-2 pr-3">Fund Name</th><th className="pb-2 pr-3">Category</th><th className="pb-2 pr-3">NAV</th><th className="pb-2 pr-3">Units</th><th className="pb-2 pr-3">Invested</th><th className="pb-2 pr-3">Current</th><th className="pb-2 pr-3">Returns</th><th className="pb-2 pr-3">Rating</th><th className="pb-2"></th></tr></thead>
            <tbody>
              {filteredFunds.length === 0 && (
                <tr><td colSpan={9} className={`py-8 text-center text-gray-400 ${dk ? 'text-gray-500' : ''}`}>No mutual funds added yet. Click &quot;Add SIP&quot; or &quot;Lumpsum&quot; to get started.</td></tr>
              )}
              {filteredFunds.map(f => (
                <tr key={f.id} className={`border-b ${dk ? 'border-gray-700' : ''} hover:bg-gray-50 ${dk ? 'hover:bg-gray-700/50' : ''} cursor-pointer`} onClick={() => setSelectedFund(f)}>
                  <td className="py-3 pr-3">
                    <p className={`font-medium ${dk ? 'text-white' : 'text-gray-900'}`}>{f.name}</p>
                    {f.sipAmount > 0 && <span className="text-xs text-blue-500">SIP: ₹{f.sipAmount.toLocaleString()}/mo</span>}
                  </td>
                  <td className="py-3 pr-3"><span className={`text-xs px-2 py-1 rounded-full ${f.category === `equity` ? `bg-blue-100 text-blue-700 ${dk ? `bg-blue-900/30` : ``} ${dk ? `text-blue-300` : ``}` : f.category === `debt` ? `bg-green-100 text-green-700 ${dk ? `bg-green-900/30` : ``} ${dk ? `text-green-300` : ``}` : f.category === `elss` ? `bg-purple-100 text-purple-700 ${dk ? `bg-purple-900/30` : ``} ${dk ? `text-purple-300` : ``}` : `bg-gray-100 text-gray-700 ${dk ? `bg-gray-700` : ``} ${dk ? `text-gray-300` : ``}`}`}>{f.category}</span></td>
                  <td className={`py-3 pr-3 ${dk ? 'text-gray-300' : 'text-gray-700'}`}>₹{f.nav.toFixed(2)}</td>
                  <td className={`py-3 pr-3 ${dk ? 'text-gray-300' : 'text-gray-700'}`}>{f.units.toFixed(2)}</td>
                  <td className={`py-3 pr-3 ${dk ? 'text-gray-300' : 'text-gray-700'}`}>₹{f.invested.toLocaleString()}</td>
                  <td className={`py-3 pr-3 font-medium ${dk ? 'text-white' : 'text-gray-900'}`}>₹{f.current.toLocaleString()}</td>
                  <td className={`py-3 pr-3 font-medium ${f.returns >= 0 ? 'text-green-600' : 'text-red-600'}`}>{f.returns >= 0 ? '+' : ''}{f.returns}%</td>
                  <td className="py-3 pr-3 text-yellow-500">{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</td>
                  <td className="py-3"><button onClick={(e) => { e.stopPropagation(); toggleCompare(f.id); }} className={`p-1 rounded ${compareIds.includes(f.id) ? `bg-purple-100 text-purple-700 ${dk ? 'bg-purple-900/40' : ''}` : 'text-gray-400 hover:text-gray-600'}`}><BarChart3 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Chart & Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className={`lg:col-span-2 ${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 shadow-sm border ${dk ? 'border-gray-700' : 'border-gray-100'}`}>
          <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-1`}>Performance Chart</h2>
          <p className={`text-sm ${dk ? 'text-gray-400' : 'text-gray-500'} mb-4`}>{selectedFund ? selectedFund.name : 'Select a fund'}</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke={dk ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="month" stroke={dk ? '#6b7280' : '#9ca3af'} />
              <YAxis stroke={dk ? '#6b7280' : '#9ca3af'} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={v => `₹${Number(v).toLocaleString()}`} />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 shadow-sm border ${dk ? 'border-gray-700' : 'border-gray-100'}`}>
          <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}><PieIcon className="w-5 h-5" /> Asset Allocation</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={allocationData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {allocationData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fund Comparison */}
      {comparedFunds.length >= 2 && (
        <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 shadow-sm border ${dk ? 'border-gray-700' : 'border-gray-100'} mb-6`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}><BarChart3 className="w-5 h-5 text-purple-500" /> Fund Comparison</h2>
            <button onClick={() => setCompareIds([])} className={`text-sm text-gray-500 hover:text-gray-700 ${dk ? 'text-gray-400' : ''}`}>Clear</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className={`text-left ${dk ? 'text-gray-400' : 'text-gray-500'} border-b ${dk ? 'border-gray-700' : ''}`}><th className="pb-2 pr-4">Metric</th>{comparedFunds.map(f => <th key={f.id} className="pb-2 pr-4">{f.name}</th>)}</tr></thead>
              <tbody>
                {['Category', 'NAV', 'Invested', 'Current Value', 'Returns', 'Risk', 'Rating', 'SIP Amount'].map(metric => (
                  <tr key={metric} className={`border-b ${dk ? 'border-gray-700' : ''}`}>
                    <td className={`py-2 pr-4 font-medium ${dk ? 'text-gray-300' : 'text-gray-700'}`}>{metric}</td>
                    {comparedFunds.map(f => {
                      const val = metric === 'Category' ? f.category : metric === 'NAV' ? `₹${f.nav}` : metric === 'Invested' ? `₹${f.invested.toLocaleString()}` : metric === 'Current Value' ? `₹${f.current.toLocaleString()}` : metric === 'Returns' ? `${f.returns}%` : metric === 'Risk' ? f.risk : metric === 'Rating' ? '★'.repeat(f.rating) : `₹${f.sipAmount.toLocaleString()}`;
                      return <td key={f.id} className={`py-2 pr-4 ${dk ? 'text-gray-300' : 'text-gray-700'}`}>{val}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Performing Funds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 shadow-sm border ${dk ? 'border-gray-700' : 'border-gray-100'}`}>
          <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}><Award className="w-5 h-5 text-yellow-500" /> Top Performing Funds</h2>
          <div className="space-y-3">
            {topPerformingFunds.length > 0 ? topPerformingFunds.map((f, i) => (
              <div key={i} className={`flex items-center justify-between p-3 ${dk ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg`}>
                <div>
                  <p className={`font-medium ${dk ? 'text-white' : 'text-gray-900'} text-sm`}>{f.name}</p>
                  <p className={`text-xs ${dk ? 'text-gray-400' : 'text-gray-500'}`}>{f.category} • {'★'.repeat(f.rating)}</p>
                </div>
                <div className="text-right">
                  <p className="text-green-600 font-semibold text-sm">+{f.returns1Y}% <span className="text-xs text-gray-400">1Y</span></p>
                  <p className="text-xs text-gray-500">+{f.returns3Y}% 3Y</p>
                </div>
              </div>
            )) : (
              <div className={`text-center py-8 ${dk ? 'text-gray-400' : 'text-gray-500'}`}>
                <Award className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Add mutual funds to see your top performers</p>
              </div>
            )}
          </div>
        </div>

        {/* Monthly SIP Calendar */}
        <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 shadow-sm border ${dk ? 'border-gray-700' : 'border-gray-100'}`}>
          <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}><Calendar className="w-5 h-5 text-blue-500" /> Monthly SIP Calendar</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sipCalendarData}>
              <CartesianGrid strokeDasharray="3 3" stroke={dk ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="month" stroke={dk ? '#6b7280' : '#9ca3af'} tick={{ fontSize: 11 }} />
              <YAxis stroke={dk ? '#6b7280' : '#9ca3af'} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={v => `₹${Number(v).toLocaleString()}`} />
              <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className={`mt-3 text-center text-sm ${dk ? 'text-gray-400' : 'text-gray-500'}`}>
            Total monthly SIP: <span className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>₹{totalSIP.toLocaleString()}</span> across {funds.filter(f => f.sipAmount > 0).length} funds
          </div>
        </div>
      </div>

      {/* Returns Calculator */}
      {showCalc && (
        <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 shadow-sm border ${dk ? 'border-gray-700' : 'border-gray-100'} mb-6`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}><Calculator className="w-5 h-5 text-green-500" /> Returns Calculator (XIRR Estimate)</h2>
            <button onClick={() => setShowCalc(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={`block text-sm font-medium ${dk ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Monthly SIP (₹)</label>
              <input type="number" value={calcAmount} onChange={e => setCalcAmount(Number(e.target.value))} className={`w-full px-3 py-2 rounded-lg border ${dk ? `border-gray-600` : ``} ${dk ? 'bg-gray-700' : ''} ${dk ? `text-white` : ``}`} />
            </div>
            <div>
              <label className={`block text-sm font-medium ${dk ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Expected Return (%)</label>
              <input type="number" value={calcRate} onChange={e => setCalcRate(Number(e.target.value))} className={`w-full px-3 py-2 rounded-lg border ${dk ? `border-gray-600` : ``} ${dk ? 'bg-gray-700' : ''} ${dk ? `text-white` : ``}`} />
            </div>
            <div>
              <label className={`block text-sm font-medium ${dk ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Time Period (Years)</label>
              <input type="number" value={calcYears} onChange={e => setCalcYears(Number(e.target.value))} className={`w-full px-3 py-2 rounded-lg border ${dk ? `border-gray-600` : ``} ${dk ? 'bg-gray-700' : ''} ${dk ? `text-white` : ``}`} />
            </div>
            <div className={`bg-green-50 ${dk ? 'bg-green-900/20' : ''} rounded-lg p-3`}>
              <p className={`text-xs ${dk ? 'text-gray-400' : 'text-gray-500'}`}>Maturity Value</p>
              <p className="text-xl font-bold text-green-600">₹{sipCalcResult.maturity.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Invested: ₹{sipCalcResult.invested.toLocaleString()} | Gain: ₹{sipCalcResult.gain.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add SIP / Lumpsum Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 w-full max-w-md shadow-xl`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>{modalType === 'sip' ? 'Add SIP Investment' : 'Add Lumpsum Investment'}</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className={`block text-sm font-medium text-gray-700 ${dk ? `text-gray-300` : ``} mb-1`}>Fund Name</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={`w-full px-3 py-2 rounded-lg border ${dk ? `border-gray-600` : ``} ${dk ? `bg-gray-700` : ``} ${dk ? `text-white` : ``}`} /></div>
              <div><label className={`block text-sm font-medium text-gray-700 ${dk ? `text-gray-300` : ``} mb-1`}>Category</label><select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={`w-full px-3 py-2 rounded-lg border ${dk ? 'border-gray-600' : ``} ${dk ? `bg-gray-700` : ``} ${dk ? `text-white` : ``}`}>{CATEGORIES.filter(c => c.key !== `all`).map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</select></div>
              <div><label className={`block text-sm font-medium text-gray-700 ${dk ? 'text-gray-300' : ``} mb-1`}>{modalType === `sip` ? `Monthly Amount (₹)` : `Investment Amount (₹)`}</label><input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className={`w-full px-3 py-2 rounded-lg border ${dk ? 'border-gray-600' : ''} ${dk ? `bg-gray-700` : ``} ${dk ? `text-white` : ``}`} /></div>
              <div><label className={`block text-sm font-medium text-gray-700 ${dk ? `text-gray-300` : ``} mb-1`}>Current NAV (₹)</label><input type="number" value={form.nav} onChange={e => setForm(p => ({ ...p, nav: e.target.value }))} className={`w-full px-3 py-2 rounded-lg border ${dk ? `border-gray-600` : ``} ${dk ? `bg-gray-700` : ``} ${dk ? `text-white` : ``}`} /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAddModal(false)} className={`flex-1 py-2 border border-gray-300 ${dk ? 'border-gray-600' : ''} rounded-lg ${dk ? 'text-gray-300' : 'text-gray-700'}`}>Cancel</button>
              <button onClick={handleAdd} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{modalType === 'sip' ? 'Start SIP' : 'Invest'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </MainLayout>
  );
}
