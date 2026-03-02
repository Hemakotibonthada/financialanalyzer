import React, { useState, useEffect, useMemo } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  TrendingUp, TrendingDown, Plus, X, DollarSign, PieChart as PieIcon,
  BarChart2, Activity, Target, Info, RefreshCw, ArrowUpRight,
  ArrowDownRight, Filter, Calendar, Briefcase, Landmark, Coins,
  Building, Gem, Search
} from 'lucide-react';
import api from '../services/api';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

const loadLocal = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
const saveLocal = (key, data) => localStorage.setItem(key, JSON.stringify(data));

const fmt = (n) => {
  if (Math.abs(n) >= 10000000) return `\u20B9${(n / 10000000).toFixed(2)}Cr`;
  if (Math.abs(n) >= 100000) return `\u20B9${(n / 100000).toFixed(2)}L`;
  return `\u20B9${n.toLocaleString('en-IN')}`;
};

export default function InvestmentAnalyzer() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newInv, setNewInv] = useState({ name: '', type: 'Stock', invested: '', current: '', units: '', sector: '' });
  const [holdingsList, setHoldingsList] = useState(() => loadLocal('fa_investments'));
  const [searchTerm, setSearchTerm] = useState('');

  // Sync with backend on mount
  useEffect(() => {
    const fetchFromAPI = async () => {
      try {
        const res = await api.get('/investments');
        const data = res.data?.investments || res.data?.data || res.data || [];
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map(inv => ({
            id: inv._id || inv.id, name: inv.name, type: inv.type || 'Stock',
            invested: inv.totalInvestedAmount || 0, current: inv.currentValue || inv.totalInvestedAmount || 0,
            units: inv.quantity || 0, sector: inv.sector || '', _backendId: inv._id
          }));
          setHoldingsList(mapped);
          saveLocal('fa_investments', mapped);
        }
      } catch { /* fallback to localStorage */ }
    };
    fetchFromAPI();
  }, []);

  useEffect(() => { saveLocal('fa_investments', holdingsList); }, [holdingsList]);

  const totalInvested = useMemo(() => holdingsList.reduce((s, h) => s + h.invested, 0), [holdingsList]);
  const totalCurrent = useMemo(() => holdingsList.reduce((s, h) => s + h.current, 0), [holdingsList]);
  const totalGain = totalCurrent - totalInvested;
  const gainPct = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(1) : '0.0';

  const allocationPie = useMemo(() => {
    const map = {};
    holdingsList.forEach(h => {
      const key = h.type || 'Other';
      map[key] = (map[key] || 0) + h.current;
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map).map(([name, value]) => ({ name, value, pct: total > 0 ? ((value / total) * 100).toFixed(1) : '0' }));
  }, [holdingsList]);

  const sectorData = useMemo(() => {
    const map = {};
    holdingsList.forEach(h => {
      const key = h.sector || 'Other';
      map[key] = (map[key] || 0) + h.current;
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map).map(([name, value]) => ({ name, value: total > 0 ? Math.round((value / total) * 100) : 0 }));
  }, [holdingsList]);

  const filteredHoldings = useMemo(() =>
    holdingsList.filter(h => !searchTerm || h.name.toLowerCase().includes(searchTerm.toLowerCase()) || (h.sector && h.sector.toLowerCase().includes(searchTerm.toLowerCase()))),
    [holdingsList, searchTerm]
  );

  const addInvestment = async () => {
    if (!newInv.name || !newInv.invested) return;
    const invObj = { ...newInv, id: Date.now(), invested: Number(newInv.invested), current: Number(newInv.current) || Number(newInv.invested), units: Number(newInv.units) };
    setHoldingsList([...holdingsList, invObj]);
    setNewInv({ name: '', type: 'Stock', invested: '', current: '', units: '', sector: '' });
    setShowAddForm(false);
    try {
      const typeMap = { Stock: 'stock', 'Mutual Fund': 'mutual_fund', ETF: 'etf', Bond: 'bond', Crypto: 'crypto', Gold: 'gold', FD: 'fd', 'Real Estate': 'real_estate' };
      const res = await api.post('/investments', {
        type: typeMap[invObj.type] || 'other', name: invObj.name, quantity: invObj.units || 1,
        purchasePrice: invObj.units ? invObj.invested / invObj.units : invObj.invested,
        currentPrice: invObj.units ? invObj.current / invObj.units : invObj.current,
        totalInvestedAmount: invObj.invested, currentValue: invObj.current,
        sector: invObj.sector, purchaseDate: new Date().toISOString()
      });
      if (res.data?._id) {
        setHoldingsList(prev => prev.map(h => h.id === invObj.id ? { ...h, _backendId: res.data._id } : h));
      }
    } catch { /* saved locally */ }
  };

  const removeHolding = async (id) => {
    const holding = holdingsList.find(h => h.id === id);
    setHoldingsList(prev => prev.filter(h => h.id !== id));
    if (holding?._backendId) {
      try { await api.delete(`/investments/${holding._backendId}`); } catch { /* removed locally */ }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Activity className="w-7 h-7 text-blue-600" /> Investment Analyzer
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track, analyze and optimize your investment portfolio</p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 px-4 py-2 flex items-center gap-2 w-fit">
          <Plus className="w-4 h-4" /> Add Investment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Portfolio Value', value: fmt(totalCurrent), icon: Briefcase, color: 'text-blue-600' },
          { label: 'Total Invested', value: fmt(totalInvested), icon: DollarSign, color: 'text-amber-600', sub: `${holdingsList.length} holdings` },
          { label: 'Total Gain/Loss', value: fmt(totalGain), icon: totalGain >= 0 ? TrendingUp : TrendingDown, color: totalGain >= 0 ? 'text-green-600' : 'text-red-600', sub: `${gainPct}% overall return` },
          { label: 'Holdings Count', value: holdingsList.length, icon: Coins, color: 'text-purple-600' },
        ].map((c, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">{c.label}</span>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{c.value}</p>
            {c.sub && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{c.sub}</div>}
          </div>
        ))}
      </div>

      {holdingsList.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 border border-slate-200 dark:border-slate-700 text-center">
          <Activity className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">No investments added yet</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Click &quot;Add Investment&quot; to start tracking your portfolio</p>
        </div>
      ) : (
        <>
          {/* Asset Allocation + Sector */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Asset Allocation</h2>
              {allocationPie.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={allocationPie} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value"
                        label={({ name, pct }) => `${name}: ${pct}%`}>
                        {allocationPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 mt-2 justify-center">
                    {allocationPie.map((a, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                        {a.name}: {a.pct}%
                      </div>
                    ))}
                  </div>
                </>
              ) : <p className="text-center text-slate-400 py-8">No data</p>}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Sector Diversification</h2>
              {sectorData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={sectorData} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}>
                      {sectorData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-slate-400 py-8">No data</p>}
            </div>
          </div>

          {/* Holdings Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Holdings</h2>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search holdings..." className="pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white w-56" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-3 text-slate-500 dark:text-slate-400 font-medium">Name</th>
                    <th className="text-center py-3 px-3 text-slate-500 dark:text-slate-400 font-medium">Type</th>
                    <th className="text-right py-3 px-3 text-slate-500 dark:text-slate-400 font-medium">Invested</th>
                    <th className="text-right py-3 px-3 text-slate-500 dark:text-slate-400 font-medium">Current</th>
                    <th className="text-right py-3 px-3 text-slate-500 dark:text-slate-400 font-medium">Gain/Loss</th>
                    <th className="text-right py-3 px-3 text-slate-500 dark:text-slate-400 font-medium">Return %</th>
                    <th className="text-center py-3 px-3 text-slate-500 dark:text-slate-400 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHoldings.map(h => {
                    const gain = h.current - h.invested;
                    const ret = h.invested > 0 ? ((gain / h.invested) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={h.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="py-3 px-3">
                          <p className="font-medium text-slate-800 dark:text-white">{h.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{h.sector}</p>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${h.type === 'Stock' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : h.type === 'ETF' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                            {h.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600 dark:text-slate-300">{fmt(h.invested)}</td>
                        <td className="py-3 px-3 text-right font-medium text-slate-800 dark:text-white">{fmt(h.current)}</td>
                        <td className={`py-3 px-3 text-right font-medium ${gain >= 0 ? 'text-green-600' : 'text-red-500'}`}>{gain >= 0 ? '+' : ''}{fmt(gain)}</td>
                        <td className={`py-3 px-3 text-right font-semibold ${gain >= 0 ? 'text-green-600' : 'text-red-500'}`}>{gain >= 0 ? '+' : ''}{ret}%</td>
                        <td className="py-3 px-3 text-center"><button onClick={() => removeHolding(h.id)} className="text-red-400 hover:text-red-600 text-xs">Remove</button></td>
                      </tr>
                    );
                  })}
                  {filteredHoldings.length === 0 && (
                    <tr><td colSpan={7} className="py-8 text-center text-slate-400">No holdings found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add Investment Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-slate-200 dark:border-slate-700 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Add Investment</h3>
              <button onClick={() => setShowAddForm(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Name</label>
                <input value={newInv.name} onChange={e => setNewInv({ ...newInv, name: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm" placeholder="e.g. HDFC Bank" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Type</label>
                  <select value={newInv.type} onChange={e => setNewInv({ ...newInv, type: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm">
                    <option>Stock</option><option>Mutual Fund</option><option>ETF</option><option>Bond</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Sector</label>
                  <input value={newInv.sector} onChange={e => setNewInv({ ...newInv, sector: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Invested (&#8377;)</label>
                  <input type="number" value={newInv.invested} onChange={e => setNewInv({ ...newInv, invested: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Current (&#8377;)</label>
                  <input type="number" value={newInv.current} onChange={e => setNewInv({ ...newInv, current: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Units</label>
                  <input type="number" value={newInv.units} onChange={e => setNewInv({ ...newInv, units: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setShowAddForm(false)} className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm px-4 py-2">Cancel</button>
              <button onClick={addInvestment} className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 px-4 py-2">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}