import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bitcoin, Plus, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  IndianRupee, X, Trash2, RefreshCw, AlertTriangle, Newspaper, Calculator,
  BarChart3, Clock, ArrowRightLeft, Shield, Zap, ChevronDown
} from 'lucide-react';
import {
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import MainLayout from '../components/MainLayout';
import api from '../services/api';

const COLORS = ['#f7931a', '#627eea', '#26a17b', '#e6007a', '#8247e5', '#00d4aa', '#ff007a', '#3b82f6'];

const loadLocal = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
const saveLocal = (key, data) => localStorage.setItem(key, JSON.stringify(data));

const emptyForm = { name: '', symbol: '', quantity: '', avgPrice: '', currentPrice: '' };

export default function CryptoPortfolio() {
  const [holdings, setHoldings] = useState(() => loadLocal('fa_crypto_holdings'));
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showDCA, setShowDCA] = useState(false);
  const [dcaAmount, setDcaAmount] = useState(5000);
  const [dcaFreq, setDcaFreq] = useState('weekly');
  const [dcaDuration, setDcaDuration] = useState(12);

  // Sync with backend on mount
  useEffect(() => {
    const fetchFromAPI = async () => {
      try {
        const res = await api.get('/investments', { params: { type: 'crypto' } });
        const data = res.data?.investments || res.data?.data || res.data || [];
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((inv, i) => ({
            id: inv._id || inv.id, name: inv.name, symbol: inv.symbol || inv.name.substring(0, 4).toUpperCase(),
            quantity: inv.quantity, avgPrice: inv.purchasePrice, currentPrice: inv.currentPrice || inv.purchasePrice,
            change24h: inv.returnPercentage || 0, color: COLORS[i % COLORS.length], _backendId: inv._id
          }));
          setHoldings(mapped);
          saveLocal('fa_crypto_holdings', mapped);
        }
      } catch { /* fallback to localStorage */ }
    };
    fetchFromAPI();
  }, []);

  useEffect(() => { saveLocal('fa_crypto_holdings', holdings); }, [holdings]);

  const totalValue = useMemo(() => holdings.reduce((s, h) => s + h.quantity * h.currentPrice, 0), [holdings]);
  const totalInvested = useMemo(() => holdings.reduce((s, h) => s + h.quantity * h.avgPrice, 0), [holdings]);
  const totalPnL = totalValue - totalInvested;
  const pnlPercent = totalInvested > 0 ? ((totalPnL / totalInvested) * 100).toFixed(2) : 0;

  const allocationData = useMemo(() => holdings.map(h => ({ name: h.symbol, value: Math.round(h.quantity * h.currentPrice) })), [holdings]);

  const handleAdd = async () => {
    if (!form.name || !form.quantity || !form.avgPrice) return;
    const newHolding = {
      id: Date.now(), name: form.name, symbol: form.symbol || form.name.substring(0, 4).toUpperCase(),
      quantity: Number(form.quantity), avgPrice: Number(form.avgPrice),
      currentPrice: Number(form.currentPrice) || Number(form.avgPrice),
      change24h: 0, color: COLORS[holdings.length % COLORS.length]
    };
    setHoldings(prev => [...prev, newHolding]);
    setForm(emptyForm);
    setShowAddModal(false);
    try {
      const res = await api.post('/investments', {
        type: 'crypto', name: newHolding.name, symbol: newHolding.symbol,
        quantity: newHolding.quantity, purchasePrice: newHolding.avgPrice,
        currentPrice: newHolding.currentPrice, totalInvestedAmount: newHolding.quantity * newHolding.avgPrice,
        purchaseDate: new Date().toISOString()
      });
      if (res.data?._id) {
        setHoldings(prev => prev.map(h => h.id === newHolding.id ? { ...h, _backendId: res.data._id } : h));
      }
    } catch { /* saved locally */ }
  };

  const handleRemove = async (id) => {
    const holding = holdings.find(h => h.id === id);
    setHoldings(prev => prev.filter(h => h.id !== id));
    if (holding?._backendId) {
      try { await api.delete(`/investments/${holding._backendId}`); } catch { /* removed locally */ }
    }
  };

  const dcaResult = useMemo(() => {
    const freq = dcaFreq === 'daily' ? 365 : dcaFreq === 'weekly' ? 52 : 12;
    const totalInvestments = freq * dcaDuration;
    const totalAmount = dcaAmount * totalInvestments;
    return { totalAmount, investments: totalInvestments };
  }, [dcaAmount, dcaFreq, dcaDuration]);

  return (
    <MainLayout title="Crypto Portfolio">
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bitcoin className="w-7 h-7 text-orange-500" /> Crypto Portfolio
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Track your cryptocurrency investments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowDCA(!showDCA)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <Calculator className="w-4 h-4" /> DCA Calc
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
            <Plus className="w-4 h-4" /> Add Holding
          </button>
        </div>
      </div>

      {/* Portfolio Value Card */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 mb-6 text-white">
        <p className="text-gray-400 text-sm mb-1">Portfolio Value</p>
        <div className="flex items-center gap-4 mb-2">
          <span className="text-3xl font-bold">&#8377;{Math.round(totalValue).toLocaleString()}</span>
        </div>
        <div className="flex gap-6 text-sm">
          <div><span className="text-gray-400">Invested</span><p className="font-semibold">&#8377;{Math.round(totalInvested).toLocaleString()}</p></div>
          <div><span className="text-gray-400">P&amp;L</span><p className={`font-semibold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{totalPnL >= 0 ? '+' : ''}&#8377;{Math.round(totalPnL).toLocaleString()} ({pnlPercent}%)</p></div>
        </div>
      </div>

      {/* Holdings Cards */}
      {holdings.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-sm border border-gray-100 dark:border-gray-700 text-center mb-6">
          <Bitcoin className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No crypto holdings yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Click &quot;Add Holding&quot; to start tracking your crypto investments</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
            {holdings.map(h => {
              const value = h.quantity * h.currentPrice;
              const pnl = (h.currentPrice - h.avgPrice) * h.quantity;
              const pnlPct = h.avgPrice > 0 ? (((h.currentPrice - h.avgPrice) / h.avgPrice) * 100).toFixed(1) : 0;
              return (
                <div key={h.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 transition hover:shadow-md">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{h.symbol}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{h.name}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${pnl >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                      {pnl >= 0 ? '+' : ''}{pnlPct}%
                    </span>
                  </div>
                  <div className="mt-2 text-sm">
                    <p className="text-gray-900 dark:text-white font-medium">&#8377;{Math.round(value).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{h.quantity} {h.symbol}</p>
                  </div>
                  <button onClick={() => handleRemove(h.id)} className="mt-2 text-xs text-red-400 hover:text-red-600">Remove</button>
                </div>
              );
            })}
          </div>

          {/* Allocation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Allocation</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={allocationData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {allocationData.map((entry, i) => <Cell key={i} fill={holdings[i]?.color || COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => `\u20B9${v.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">P/L Summary</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-gray-500 dark:text-gray-400">Total Invested</span>
                  <span className="text-gray-900 dark:text-white font-medium">&#8377;{Math.round(totalInvested).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-gray-500 dark:text-gray-400">Current Value</span>
                  <span className="text-gray-900 dark:text-white font-medium">&#8377;{Math.round(totalValue).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-t dark:border-gray-600">
                  <span className="text-gray-500 dark:text-gray-400">Profit/Loss</span>
                  <span className={`font-semibold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>{totalPnL >= 0 ? '+' : ''}&#8377;{Math.round(totalPnL).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Recent Transactions - empty state */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-gray-500" /> Recent Transactions</h2>
          <div className="text-center py-8">
            <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400 dark:text-gray-500 text-sm">No transactions recorded yet</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Newspaper className="w-5 h-5 text-blue-500" /> News Feed</h2>
          <div className="text-center py-8">
            <Newspaper className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400 dark:text-gray-500 text-sm">No news available</p>
          </div>
        </div>
      </div>

      {/* DCA Calculator */}
      {showDCA && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Calculator className="w-5 h-5 text-blue-500" /> DCA Calculator</h2>
            <button onClick={() => setShowDCA(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount per buy (&#8377;)</label><input type="number" value={dcaAmount} onChange={e => setDcaAmount(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frequency</label><select value={dcaFreq} onChange={e => setDcaFreq(e.target.value)} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (months)</label><input type="number" value={dcaDuration} onChange={e => setDcaDuration(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Investment</p>
              <p className="text-xl font-bold text-orange-600">&#8377;{dcaResult.totalAmount.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{dcaResult.investments} purchases</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Holding Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Crypto Holding</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Coin Name</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="e.g. Bitcoin" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Symbol</label><input value={form.symbol} onChange={e => setForm(p => ({ ...p, symbol: e.target.value }))} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="e.g. BTC" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label><input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Average Buy Price (&#8377;)</label><input type="number" value={form.avgPrice} onChange={e => setForm(p => ({ ...p, avgPrice: e.target.value }))} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Price (&#8377;)</label><input type="number" value={form.currentPrice} onChange={e => setForm(p => ({ ...p, currentPrice: e.target.value }))} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleAdd} className="flex-1 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">Add Holding</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </MainLayout>
  );
}