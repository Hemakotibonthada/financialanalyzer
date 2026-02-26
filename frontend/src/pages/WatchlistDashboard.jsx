import React, { useState, useEffect, useMemo } from 'react';
import {
  Eye, Plus, Trash2, Bell, Search, Filter, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, Star, RefreshCw, BarChart3, Newspaper,
  PieChart as PieIcon, ChevronDown, X, AlertTriangle, Briefcase
} from 'lucide-react';
import {
  LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Area, AreaChart
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const mockIndices = [
  { name: 'NIFTY 50', value: 24876.50, change: 1.23 },
  { name: 'SENSEX', value: 81432.18, change: 0.98 },
  { name: 'BANK NIFTY', value: 52341.75, change: -0.45 },
  { name: 'NIFTY IT', value: 38920.30, change: 2.15 },
];

const mockWatchlist = [
  { id: 1, symbol: 'RELIANCE', name: 'Reliance Industries', price: 2845.60, change: 2.34, sector: 'Energy', sparkline: [2800, 2820, 2810, 2835, 2850, 2840, 2845], alert: null, type: 'Stock' },
  { id: 2, symbol: 'TCS', name: 'Tata Consultancy', price: 4120.25, change: -0.87, sector: 'IT', sparkline: [4150, 4140, 4130, 4125, 4110, 4115, 4120], alert: 4200, type: 'Stock' },
  { id: 3, symbol: 'HDFCBANK', name: 'HDFC Bank', price: 1678.90, change: 1.12, sector: 'Banking', sparkline: [1660, 1665, 1670, 1668, 1675, 1680, 1678], alert: null, type: 'Stock' },
  { id: 4, symbol: 'INFY', name: 'Infosys Ltd', price: 1892.40, change: -1.56, sector: 'IT', sparkline: [1920, 1915, 1910, 1900, 1895, 1890, 1892], alert: 1850, type: 'Stock' },
  { id: 5, symbol: 'PARAG_FLEXI', name: 'Parag Parikh Flexi Cap', price: 72.45, change: 0.65, sector: 'Mutual Fund', sparkline: [71.5, 71.8, 72.0, 72.1, 72.3, 72.4, 72.45], alert: null, type: 'Mutual Fund' },
  { id: 6, symbol: 'BAJFINANCE', name: 'Bajaj Finance', price: 7234.80, change: 3.21, sector: 'Finance', sparkline: [7100, 7140, 7180, 7200, 7210, 7230, 7234], alert: 7500, type: 'Stock' },
  { id: 7, symbol: 'ITC', name: 'ITC Ltd', price: 465.30, change: 0.42, sector: 'FMCG', sparkline: [462, 463, 464, 463.5, 464.5, 465, 465.3], alert: null, type: 'Stock' },
  { id: 8, symbol: 'AXISBANK', name: 'Axis Bank', price: 1156.75, change: -0.32, sector: 'Banking', sparkline: [1162, 1160, 1158, 1157, 1155, 1156, 1156.75], alert: null, type: 'Stock' },
];

const mockNews = [
  { id: 1, title: 'RBI keeps repo rate unchanged at 6.5%', source: 'Economic Times', time: '2h ago', sentiment: 'neutral' },
  { id: 2, title: 'IT sector sees strong Q3 earnings beat', source: 'Moneycontrol', time: '4h ago', sentiment: 'positive' },
  { id: 3, title: 'Crude oil prices surge amid global tensions', source: 'LiveMint', time: '6h ago', sentiment: 'negative' },
  { id: 4, title: 'New IPO listings expected next week', source: 'Business Standard', time: '8h ago', sentiment: 'neutral' },
];

const sectorData = [
  { name: 'IT', value: 30 }, { name: 'Banking', value: 25 }, { name: 'Energy', value: 15 },
  { name: 'Finance', value: 12 }, { name: 'FMCG', value: 10 }, { name: 'MF', value: 8 },
];

const SparklineChart = ({ data, positive }) => (
  <ResponsiveContainer width={80} height={32}>
    <LineChart data={data.map((v, i) => ({ v, i }))}>
      <Line type="monotone" dataKey="v" stroke={positive ? '#10b981' : '#ef4444'} strokeWidth={1.5} dot={false} />
    </LineChart>
  </ResponsiveContainer>
);

export default function WatchlistDashboard() {
  const [loading, setLoading] = useState(true);
  const [watchlist, setWatchlist] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterType, setFilterType] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(null);
  const [alertPrice, setAlertPrice] = useState('');
  const [newSymbol, setNewSymbol] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/watchlist');
        setWatchlist(res.data?.length ? res.data : mockWatchlist);
      } catch {
        setWatchlist(mockWatchlist);
      } finally {
        setTimeout(() => setLoading(false), 600);
      }
    };
    load();
  }, []);

  const removeItem = (id) => setWatchlist((prev) => prev.filter((w) => w.id !== id));

  const addItem = () => {
    if (!newSymbol.trim()) return;
    const item = {
      id: Date.now(), symbol: newSymbol.toUpperCase(), name: newSymbol, price: (Math.random() * 5000 + 100).toFixed(2),
      change: (Math.random() * 6 - 3).toFixed(2), sector: 'Other',
      sparkline: Array.from({ length: 7 }, () => Math.random() * 100 + 50), alert: null, type: 'Stock'
    };
    setWatchlist((prev) => [...prev, item]);
    setNewSymbol('');
    setShowAddModal(false);
  };

  const setAlert = () => {
    if (!alertPrice || !showAlertModal) return;
    setWatchlist((prev) => prev.map((w) => w.id === showAlertModal.id ? { ...w, alert: parseFloat(alertPrice) } : w));
    setShowAlertModal(null);
    setAlertPrice('');
  };

  const filtered = useMemo(() => {
    let items = [...watchlist];
    if (searchTerm) items = items.filter((w) => w.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || w.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filterType !== 'All') items = items.filter((w) => w.type === filterType);
    items.sort((a, b) => sortBy === 'name' ? a.symbol.localeCompare(b.symbol) : sortBy === 'change' ? b.change - a.change : b.price - a.price);
    return items;
  }, [watchlist, searchTerm, sortBy, filterType]);

  const totalValue = watchlist.reduce((s, w) => s + parseFloat(w.price), 0);
  const avgChange = watchlist.length ? (watchlist.reduce((s, w) => s + parseFloat(w.change), 0) / watchlist.length).toFixed(2) : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading watchlist...</p>
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
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Eye className="w-8 h-8 text-blue-600" /> Watchlist Dashboard
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Track your investments in real-time</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-600/30 px-4 py-2 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Symbol
            </button>
            <button className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium px-4 py-2 flex items-center gap-2 hover:bg-slate-300 dark:hover:bg-slate-600">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Market Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 dashboard-grid">
          {mockIndices.map((idx, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{idx.name}</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{idx.value.toLocaleString()}</p>
              <div className={`flex items-center gap-1 mt-1 text-sm font-medium ${idx.change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {idx.change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {Math.abs(idx.change)}%
              </div>
            </div>
          ))}
        </div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2"><Briefcase className="w-5 h-5 text-blue-600" /><span className="text-sm text-slate-500 dark:text-slate-400">Watchlist Value</span></div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white"><AnimatedValue end={totalValue} /></p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2"><TrendingUp className="w-5 h-5 text-emerald-600" /><span className="text-sm text-slate-500 dark:text-slate-400">Avg Change</span></div>
            <p className={`text-2xl font-bold ${avgChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{avgChange >= 0 ? '+' : ''}{avgChange}%</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2"><Star className="w-5 h-5 text-amber-500" /><span className="text-sm text-slate-500 dark:text-slate-400">Items Tracked</span></div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{watchlist.length}</p>
          </div>
        </div>

        {/* Search / Filter / Sort */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-3 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search symbols..." className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm border-0 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm border-0 outline-none">
            <option>All</option><option>Stock</option><option>Mutual Fund</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm border-0 outline-none">
            <option value="name">Sort: Name</option><option value="price">Sort: Price</option><option value="change">Sort: Change</option>
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Watchlist Table */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-600" /> Your Watchlist</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                    <th className="text-left p-3 pl-4">Symbol</th>
                    <th className="text-right p-3">Price</th>
                    <th className="text-right p-3">Change</th>
                    <th className="text-center p-3 hidden md:table-cell">Trend</th>
                    <th className="text-center p-3">Alert</th>
                    <th className="text-center p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, i) => (
                    <tr key={item.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors" style={{ animationDelay: `${i * 50}ms` }}>
                      <td className="p-3 pl-4">
                        <p className="font-semibold text-slate-900 dark:text-white text-sm">{item.symbol}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.name}</p>
                      </td>
                      <td className="p-3 text-right font-semibold text-slate-900 dark:text-white">₹{parseFloat(item.price).toLocaleString()}</td>
                      <td className="p-3 text-right">
                        <span className={`inline-flex items-center gap-1 text-sm font-medium ${item.change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {item.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {Math.abs(item.change)}%
                        </span>
                      </td>
                      <td className="p-3 hidden md:table-cell"><SparklineChart data={item.sparkline} positive={item.change >= 0} /></td>
                      <td className="p-3 text-center">
                        {item.alert ? (
                          <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full">₹{item.alert}</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setShowAlertModal(item); setAlertPrice(item.alert || ''); }} className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600"><Bell className="w-4 h-4" /></button>
                          <button onClick={() => removeItem(item.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan="6" className="p-8 text-center text-slate-400">No items match your search</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Sector Breakdown */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4"><PieIcon className="w-5 h-5 text-purple-600" /> Sector Breakdown</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={sectorData} cx="50%" cy="50%" outerRadius={75} innerRadius={45} dataKey="value" paddingAngle={3}>
                    {sectorData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {sectorData.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                    <span className="text-slate-600 dark:text-slate-400">{s.name} ({s.value}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* News Feed */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4"><Newspaper className="w-5 h-5 text-cyan-600" /> Market News</h3>
              <div className="space-y-3">
                {mockNews.map((n) => (
                  <div key={n.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                    <p className="text-sm font-medium text-slate-900 dark:text-white leading-snug">{n.title}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{n.source}</span>
                      <span className="text-xs text-slate-400">{n.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Impact Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '700ms' }}>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Portfolio Impact Analysis</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={watchlist.slice(0, 8).map((w) => ({ name: w.symbol, change: parseFloat(w.change) }))}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="change" radius={[6, 6, 0, 0]}>
                {watchlist.slice(0, 8).map((w, i) => <Cell key={i} fill={w.change >= 0 ? '#10b981' : '#ef4444'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Add Symbol Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Add Symbol</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <input value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} placeholder="Enter symbol (e.g., TATAMOTORS)" className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm border-0 outline-none focus:ring-2 focus:ring-blue-500 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600">Cancel</button>
              <button onClick={addItem} className="flex-1 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-600/30 px-4 py-2.5">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2"><Bell className="w-5 h-5 text-amber-500" />Price Alert — {showAlertModal.symbol}</h3>
              <button onClick={() => setShowAlertModal(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Current: ₹{parseFloat(showAlertModal.price).toLocaleString()}</p>
            <input type="number" value={alertPrice} onChange={(e) => setAlertPrice(e.target.value)} placeholder="Alert price" className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm border-0 outline-none focus:ring-2 focus:ring-blue-500 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowAlertModal(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium">Cancel</button>
              <button onClick={setAlert} className="flex-1 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-600/30 px-4 py-2.5">Set Alert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
