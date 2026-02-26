import React, { useState, useEffect, useMemo } from 'react';
import {
  Bitcoin, Plus, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  IndianRupee, X, Trash2, RefreshCw, AlertTriangle, Newspaper, Calculator,
  BarChart3, Clock, ArrowRightLeft, Shield, Zap, ChevronDown
} from 'lucide-react';
import {
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../services/api';

const COLORS = ['#f7931a', '#627eea', '#26a17b', '#e6007a', '#8247e5', '#00d4aa', '#ff007a', '#3b82f6'];

const TIME_RANGES = ['1H', '1D', '1W', '1M', '1Y'];

const generatePriceData = (range, base) => {
  const points = range === '1H' ? 60 : range === '1D' ? 24 : range === '1W' ? 7 : range === '1M' ? 30 : 12;
  return Array.from({ length: points }, (_, i) => ({
    time: range === '1H' ? `${i}m` : range === '1D' ? `${i}h` : range === '1W' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i] : range === '1M' ? `D${i + 1}` : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
    price: base * (1 + Math.sin(i * 0.5) * 0.05 + (Math.random() - 0.5) * 0.03),
  }));
};

const initialHoldings = [
  { id: 1, name: 'Bitcoin', symbol: 'BTC', quantity: 0.15, avgPrice: 4200000, currentPrice: 5850000, change24h: 2.3, color: '#f7931a', sparkline: Array.from({ length: 20 }, (_, i) => ({ i, v: 5650000 + Math.sin(i * 0.8) * 200000 + Math.random() * 100000 })) },
  { id: 2, name: 'Ethereum', symbol: 'ETH', quantity: 2.5, avgPrice: 220000, currentPrice: 285000, change24h: -1.5, color: '#627eea', sparkline: Array.from({ length: 20 }, (_, i) => ({ i, v: 275000 + Math.sin(i * 0.6) * 15000 + Math.random() * 5000 })) },
  { id: 3, name: 'Solana', symbol: 'SOL', quantity: 50, avgPrice: 8500, currentPrice: 12800, change24h: 5.2, color: '#00d4aa', sparkline: Array.from({ length: 20 }, (_, i) => ({ i, v: 11500 + Math.sin(i * 0.7) * 1500 + Math.random() * 800 })) },
  { id: 4, name: 'Polygon', symbol: 'MATIC', quantity: 1000, avgPrice: 65, currentPrice: 82, change24h: -0.8, color: '#8247e5', sparkline: Array.from({ length: 20 }, (_, i) => ({ i, v: 78 + Math.sin(i * 0.9) * 6 + Math.random() * 3 })) },
  { id: 5, name: 'Cardano', symbol: 'ADA', quantity: 3000, avgPrice: 35, currentPrice: 48, change24h: 1.1, color: '#3b82f6', sparkline: Array.from({ length: 20 }, (_, i) => ({ i, v: 45 + Math.sin(i * 0.5) * 5 + Math.random() * 2 })) },
];

const recentTxns = [
  { id: 1, type: 'buy', coin: 'BTC', amount: 0.05, price: 5700000, date: '2026-02-20', total: 285000 },
  { id: 2, type: 'sell', coin: 'ETH', amount: 1.0, price: 280000, date: '2026-02-18', total: 280000 },
  { id: 3, type: 'swap', coin: 'SOL→MATIC', amount: 10, price: 12500, date: '2026-02-15', total: 125000 },
  { id: 4, type: 'buy', coin: 'ADA', amount: 500, price: 46, date: '2026-02-10', total: 23000 },
  { id: 5, type: 'buy', coin: 'SOL', amount: 20, price: 11000, date: '2026-02-05', total: 220000 },
];

const newsItems = [
  { id: 1, title: 'Bitcoin hits new ATH as institutional adoption surges', time: '2h ago', source: 'CoinDesk' },
  { id: 2, title: 'Ethereum Shanghai upgrade boosts staking rewards', time: '5h ago', source: 'The Block' },
  { id: 3, title: 'India crypto regulations expected by Q3 2026', time: '1d ago', source: 'Economic Times' },
  { id: 4, title: 'Solana DeFi TVL crosses $15B milestone', time: '1d ago', source: 'DeFi Pulse' },
];

const emptyForm = { name: '', symbol: '', quantity: '', avgPrice: '' };

export default function CryptoPortfolio() {
  const [holdings, setHoldings] = useState(initialHoldings);
  const [timeRange, setTimeRange] = useState('1M');
  const [selectedCoin, setSelectedCoin] = useState(holdings[0]);
  const [priceData, setPriceData] = useState(() => generatePriceData('1M', holdings[0].currentPrice));
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showDCA, setShowDCA] = useState(false);
  const [dcaAmount, setDcaAmount] = useState(5000);
  const [dcaFreq, setDcaFreq] = useState('weekly');
  const [dcaDuration, setDcaDuration] = useState(12);

  useEffect(() => {
    setPriceData(generatePriceData(timeRange, selectedCoin.currentPrice));
  }, [timeRange, selectedCoin]);

  const totalValue = useMemo(() => holdings.reduce((s, h) => s + h.quantity * h.currentPrice, 0), [holdings]);
  const totalInvested = useMemo(() => holdings.reduce((s, h) => s + h.quantity * h.avgPrice, 0), [holdings]);
  const totalPnL = totalValue - totalInvested;
  const pnlPercent = totalInvested > 0 ? ((totalPnL / totalInvested) * 100).toFixed(2) : 0;
  const change24h = useMemo(() => {
    const weighted = holdings.reduce((s, h) => s + (h.quantity * h.currentPrice * h.change24h / 100), 0);
    return totalValue > 0 ? (weighted / totalValue * 100).toFixed(2) : 0;
  }, [holdings, totalValue]);

  const allocationData = useMemo(() => holdings.map(h => ({ name: h.symbol, value: Math.round(h.quantity * h.currentPrice) })), [holdings]);

  const handleAdd = () => {
    if (!form.name || !form.quantity || !form.avgPrice) return;
    setHoldings(prev => [...prev, {
      id: Date.now(), name: form.name, symbol: form.symbol || form.name.substring(0, 4).toUpperCase(),
      quantity: Number(form.quantity), avgPrice: Number(form.avgPrice), currentPrice: Number(form.avgPrice),
      change24h: 0, color: COLORS[prev.length % COLORS.length],
      sparkline: Array.from({ length: 20 }, (_, i) => ({ i, v: Number(form.avgPrice) * (1 + Math.sin(i * 0.5) * 0.03) }))
    }]);
    setForm(emptyForm);
    setShowAddModal(false);
  };

  const handleRemove = (id) => {
    setHoldings(prev => prev.filter(h => h.id !== id));
    if (selectedCoin?.id === id && holdings.length > 1) setSelectedCoin(holdings.find(h => h.id !== id));
  };

  const dcaResult = useMemo(() => {
    const freq = dcaFreq === 'daily' ? 365 : dcaFreq === 'weekly' ? 52 : 12;
    const totalInvestments = freq * dcaDuration;
    const totalAmount = dcaAmount * totalInvestments;
    return { totalAmount, investments: totalInvestments };
  }, [dcaAmount, dcaFreq, dcaDuration]);

  const highVolatility = useMemo(() => holdings.filter(h => Math.abs(h.change24h) > 3), [holdings]);

  return (
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
          <span className="text-3xl font-bold">₹{Math.round(totalValue).toLocaleString()}</span>
          <span className={`flex items-center text-sm px-2 py-1 rounded-full ${Number(change24h) >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {Number(change24h) >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
            {change24h}% (24h)
          </span>
        </div>
        <div className="flex gap-6 text-sm">
          <div><span className="text-gray-400">Invested</span><p className="font-semibold">₹{Math.round(totalInvested).toLocaleString()}</p></div>
          <div><span className="text-gray-400">P&L</span><p className={`font-semibold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{totalPnL >= 0 ? '+' : ''}₹{Math.round(totalPnL).toLocaleString()} ({pnlPercent}%)</p></div>
        </div>
      </div>

      {/* Volatility Warnings */}
      {highVolatility.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span className="font-medium text-yellow-800 dark:text-yellow-200">High Volatility Alert</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {highVolatility.map(h => (
              <span key={h.id} className="text-sm px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200">
                {h.symbol}: {h.change24h > 0 ? '+' : ''}{h.change24h}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Holdings Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        {holdings.map(h => {
          const value = h.quantity * h.currentPrice;
          const pnl = (h.currentPrice - h.avgPrice) * h.quantity;
          return (
            <div key={h.id} onClick={() => setSelectedCoin(h)} className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border cursor-pointer transition hover:shadow-md ${selectedCoin?.id === h.id ? 'border-orange-400 dark:border-orange-500' : 'border-gray-100 dark:border-gray-700'}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{h.symbol}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{h.name}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${h.change24h >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                  {h.change24h >= 0 ? '+' : ''}{h.change24h}%
                </span>
              </div>
              <ResponsiveContainer width="100%" height={40}>
                <LineChart data={h.sparkline}>
                  <Line type="monotone" dataKey="v" stroke={h.change24h >= 0 ? '#10b981' : '#ef4444'} strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-2 text-sm">
                <p className="text-gray-900 dark:text-white font-medium">₹{Math.round(value).toLocaleString()}</p>
                <p className="text-xs text-gray-500">{h.quantity} {h.symbol}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleRemove(h.id); }} className="mt-2 text-xs text-red-400 hover:text-red-600">Remove</button>
            </div>
          );
        })}
      </div>

      {/* Price Chart & Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedCoin.name} Price</h2>
              <p className="text-sm text-gray-500">₹{selectedCoin.currentPrice.toLocaleString()}</p>
            </div>
            <div className="flex gap-1">
              {TIME_RANGES.map(r => (
                <button key={r} onClick={() => setTimeRange(r)} className={`px-3 py-1 text-xs rounded-lg font-medium transition ${timeRange === r ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{r}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={priceData}>
              <defs><linearGradient id="cryptoGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={selectedCoin.color} stopOpacity={0.3} /><stop offset="95%" stopColor={selectedCoin.color} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#9ca3af" tick={{ fontSize: 11 }} />
              <YAxis stroke="#9ca3af" tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} domain={['auto', 'auto']} />
              <Tooltip formatter={v => `₹${Number(v).toLocaleString()}`} />
              <Area type="monotone" dataKey="price" stroke={selectedCoin.color} fill="url(#cryptoGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Allocation</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={allocationData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {allocationData.map((entry, i) => <Cell key={i} fill={holdings[i]?.color || COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
          {/* P/L Summary */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Total Invested</span>
              <span className="text-gray-900 dark:text-white font-medium">₹{Math.round(totalInvested).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Current Value</span>
              <span className="text-gray-900 dark:text-white font-medium">₹{Math.round(totalValue).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm border-t dark:border-gray-600 pt-2">
              <span className="text-gray-500 dark:text-gray-400">Profit/Loss</span>
              <span className={`font-semibold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>{totalPnL >= 0 ? '+' : ''}₹{Math.round(totalPnL).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions & News */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-gray-500" /> Recent Transactions</h2>
          <div className="space-y-3">
            {recentTxns.map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`p-1.5 rounded-lg ${tx.type === 'buy' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : tx.type === 'sell' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'}`}>
                    {tx.type === 'buy' ? <ArrowDownRight className="w-4 h-4" /> : tx.type === 'sell' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowRightLeft className="w-4 h-4" />}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm capitalize">{tx.type} {tx.coin}</p>
                    <p className="text-xs text-gray-500">{tx.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">₹{tx.total.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{tx.amount} @ ₹{tx.price.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Newspaper className="w-5 h-5 text-blue-500" /> News Feed</h2>
          <div className="space-y-3">
            {newsItems.map(n => (
              <div key={n.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600/50 cursor-pointer transition">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{n.title}</p>
                <p className="text-xs text-gray-500 mt-1">{n.source} • {n.time}</p>
              </div>
            ))}
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
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount per buy (₹)</label><input type="number" value={dcaAmount} onChange={e => setDcaAmount(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frequency</label><select value={dcaFreq} onChange={e => setDcaFreq(e.target.value)} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (months)</label><input type="number" value={dcaDuration} onChange={e => setDcaDuration(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Investment</p>
              <p className="text-xl font-bold text-orange-600">₹{dcaResult.totalAmount.toLocaleString()}</p>
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
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Average Buy Price (₹)</label><input type="number" value={form.avgPrice} onChange={e => setForm(p => ({ ...p, avgPrice: e.target.value }))} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleAdd} className="flex-1 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">Add Holding</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
