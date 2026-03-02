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

const loadLocal = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
const saveLocal = (key, data) => localStorage.setItem(key, JSON.stringify(data));

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


const SparklineChart = ({ data, positive }) => (
  <ResponsiveContainer width={80} height={32}>
    <LineChart data={data.map((v, i) => ({ v, i }))}>
      <Line type="monotone" dataKey="v" stroke={positive ? '#10b981' : '#ef4444'} strokeWidth={1.5} dot={false} />
    </LineChart>
  </ResponsiveContainer>
);

export default function WatchlistDashboard() {
  const [loading, setLoading] = useState(true);
  const [watchlist, setWatchlist] = useState(() => loadLocal('fa_watchlist'));
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterType, setFilterType] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(null);
  const [alertPrice, setAlertPrice] = useState('');
  const [newSymbol, setNewSymbol] = useState('');

  useEffect(() => {
    const fetchFromAPI = async () => {
      try {
        const res = await api.get('/market/watchlist');
        const data = res.data?.watchlist || res.data?.data || res.data || [];
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map(w => ({
            id: w._id || w.id, symbol: w.symbol, name: w.name || w.symbol,
            price: w.price || w.currentPrice || 0, change: w.change || w.changePercent || 0,
            sector: w.sector || 'Other', sparkline: w.sparkline || w.priceHistory || [],
            alert: w.alertPrice || w.alert || null, type: w.type || 'Stock', _backendId: w._id
          }));
          setWatchlist(mapped);
          saveLocal('fa_watchlist', mapped);
        }
      } catch { /* fallback to localStorage */ }
    };
    fetchFromAPI().finally(() => setLoading(false));
  }, []);

  useEffect(() => { saveLocal('fa_watchlist', watchlist); }, [watchlist]);

  const removeItem = (id) => setWatchlist((prev) => prev.filter((w) => w.id !== id));

  const addItem = () => {
    if (!newSymbol.trim()) return;
    const item = {
      id: Date.now(), symbol: newSymbol.toUpperCase(), name: newSymbol, price: 0,
      change: 0, sector: 'Other',
      sparkline: [], alert: null, type: 'Stock'
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
        {watchlist.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 border border-slate-200 dark:border-slate-700 text-center">
            <Eye className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">Your watchlist is empty</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Click &quot;Add Symbol&quot; to start tracking stocks and mutual funds</p>
          </div>
        ) : (
        <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 dashboard-grid">
          {watchlist.slice(0, 4).map((idx, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{idx.symbol}</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">₹{parseFloat(idx.price).toLocaleString()}</p>
              <div className={`flex items-center gap-1 mt-1 text-sm font-medium ${parseFloat(idx.change) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {parseFloat(idx.change) >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {Math.abs(parseFloat(idx.change))}%
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
              {(() => {
                const sMap = {};
                watchlist.forEach(w => { sMap[w.sector || 'Other'] = (sMap[w.sector || 'Other'] || 0) + 1; });
                const total = watchlist.length;
                const sd = Object.entries(sMap).map(([name, cnt]) => ({ name, value: Math.round((cnt / total) * 100) }));
                return (
                  <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={sd} cx="50%" cy="50%" outerRadius={75} innerRadius={45} dataKey="value" paddingAngle={3}>
                        {sd.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {sd.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                        <span className="text-slate-600 dark:text-slate-400">{s.name} ({s.value}%)</span>
                      </div>
                    ))}
                  </div>
                  </>
                );
              })()}
            </div>

            {/* News Feed */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4"><Newspaper className="w-5 h-5 text-cyan-600" /> Market News</h3>
              <p className="text-center text-slate-400 dark:text-slate-500 py-8">No market news available</p>
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
        </>
        )}
      </div>
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
