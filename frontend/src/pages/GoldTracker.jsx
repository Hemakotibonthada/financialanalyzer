import React, { useState, useEffect, useMemo } from 'react';
import {
  Gem, Plus, TrendingUp, TrendingDown, IndianRupee, BarChart3, Bell,
  X, Edit2, Trash2, ArrowUpRight, ArrowDownRight, Clock, PieChart as PieIcon,
  AlertTriangle, ShieldCheck, Coins, Weight, Package
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line
} from 'recharts';

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#ec4899'];

const loadLocal = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
const saveLocal = (key, data) => localStorage.setItem(key, JSON.stringify(data));

const HOLDING_TYPES = [
  { value: 'physical', label: 'Physical Gold', icon: <Coins className="w-4 h-4" /> },
  { value: 'digital', label: 'Digital Gold', icon: <Package className="w-4 h-4" /> },
  { value: 'etf', label: 'Gold ETF', icon: <BarChart3 className="w-4 h-4" /> },
  { value: 'sgb', label: 'Sovereign Gold Bond', icon: <ShieldCheck className="w-4 h-4" /> },
];

const TIME_RANGES = ['1M', '6M', '1Y', '5Y'];


const comparisonData = [
  { asset: 'Gold', '1Y': 14.2, '3Y': 38.5, '5Y': 72.1 },
  { asset: 'Nifty 50', '1Y': 12.8, '3Y': 42.1, '5Y': 85.3 },
  { asset: 'FD', '1Y': 7.0, '3Y': 21.5, '5Y': 38.0 },
  { asset: 'Silver', '1Y': 18.5, '3Y': 28.0, '5Y': 55.2 },
  { asset: 'Real Estate', '1Y': 8.0, '3Y': 25.0, '5Y': 48.0 },
];

const emptyForm = { type: 'physical', name: '', weight: '', unit: 'grams', purchasePrice: '', purchaseDate: '', purity: '24K' };

export default function GoldTracker() {
  const [holdings, setHoldings] = useState(() => loadLocal('fa_gold_holdings'));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [timeRange, setTimeRange] = useState('1Y');
  const [priceTrend, setPriceTrend] = useState([]);
  const [alerts, setAlerts] = useState(() => loadLocal('fa_gold_alerts'));
  const [alertForm, setAlertForm] = useState({ type: 'above', price: '' });
  const [showAlerts, setShowAlerts] = useState(false);
  const [goldPrice, setGoldPrice] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fa_gold_price')) || { perGram: 0, per10g: 0, perOunce: 0, change24h: 0 }; } catch { return { perGram: 0, per10g: 0, perOunce: 0, change24h: 0 }; }
  });

  useEffect(() => { saveLocal('fa_gold_holdings', holdings); }, [holdings]);
  useEffect(() => { saveLocal('fa_gold_alerts', alerts); }, [alerts]);
  useEffect(() => { localStorage.setItem('fa_gold_price', JSON.stringify(goldPrice)); }, [goldPrice]);


  const totalWeight = useMemo(() => holdings.reduce((s, h) => s + (h.unit === 'grams' ? h.weight : 0), 0), [holdings]);
  const totalInvested = useMemo(() => holdings.reduce((s, h) => s + h.purchasePrice * h.weight, 0), [holdings]);
  const totalCurrentValue = useMemo(() => holdings.reduce((s, h) => {
    if (h.unit === 'grams') return s + h.weight * goldPrice.perGram * (h.purity === '22K' ? 0.916 : 1);
    return s + h.weight * (h.nav || goldPrice.perGram);
  }, 0), [holdings, goldPrice]);
  const totalGain = totalCurrentValue - totalInvested;
  const gainPercent = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(2) : 0;

  const allocationData = useMemo(() => {
    const map = {};
    holdings.forEach(h => {
      const label = HOLDING_TYPES.find(t => t.value === h.type)?.label || h.type;
      const val = h.unit === 'grams' ? h.weight * goldPrice.perGram * (h.purity === '22K' ? 0.916 : 1) : h.weight * (h.nav || goldPrice.perGram);
      map[label] = (map[label] || 0) + val;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [holdings]);

  const portfolioPercent = 18.5; // Gold as % of total portfolio (mock)

  const handleAddHolding = () => {
    if (!form.name || !form.weight || !form.purchasePrice) return;
    setHoldings(prev => [...prev, { id: Date.now(), ...form, weight: Number(form.weight), purchasePrice: Number(form.purchasePrice) }]);
    setForm(emptyForm);
    setShowForm(false);
  };

  const handleDeleteHolding = (id) => setHoldings(prev => prev.filter(h => h.id !== id));

  const addAlert = () => {
    if (!alertForm.price) return;
    setAlerts(prev => [...prev, { id: Date.now(), ...alertForm, price: Number(alertForm.price), active: true }]);
    setAlertForm({ type: 'above', price: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Gem className="w-7 h-7 text-yellow-500" /> Gold Tracker
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Track your gold investments and monitor prices</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAlerts(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <Bell className="w-4 h-4" /> Alerts
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition">
            <Plus className="w-4 h-4" /> Add Purchase
          </button>
        </div>
      </div>

      {/* Current Gold Price Card */}
      <div className="bg-gradient-to-r from-yellow-500 to-amber-600 rounded-xl p-6 mb-6 text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-yellow-100 text-sm mb-1">Current Gold Price (24K)</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold">₹{goldPrice.perGram.toLocaleString()}/g</span>
              <span className={`flex items-center text-sm px-2 py-1 rounded-full ${goldPrice.change24h >= 0 ? 'bg-green-500/30' : 'bg-red-500/30'}`}>
                {goldPrice.change24h >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                {goldPrice.change24h}%
              </span>
            </div>
          </div>
          <div className="flex gap-6">
            <div><p className="text-yellow-100 text-xs">Per 10g</p><p className="text-xl font-bold">₹{goldPrice.per10g.toLocaleString()}</p></div>
            <div><p className="text-yellow-100 text-xs">Per Ounce</p><p className="text-xl font-bold">₹{goldPrice.perOunce.toLocaleString()}</p></div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Weight', value: `${totalWeight}g`, sub: `${(totalWeight / 31.1035).toFixed(2)} oz`, icon: <Weight className="w-5 h-5" />, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/40' },
          { label: 'Total Invested', value: `₹${totalInvested.toLocaleString()}`, icon: <IndianRupee className="w-5 h-5" />, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40' },
          { label: 'Current Value', value: `₹${Math.round(totalCurrentValue).toLocaleString()}`, icon: <Coins className="w-5 h-5" />, color: 'text-green-600 bg-green-100 dark:bg-green-900/40' },
          { label: 'Total Gain', value: `₹${Math.round(totalGain).toLocaleString()}`, sub: `${gainPercent}%`, icon: totalGain >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />, color: totalGain >= 0 ? 'text-green-600 bg-green-100 dark:bg-green-900/40' : 'text-red-600 bg-red-100 dark:bg-red-900/40' },
        ].map((c, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">{c.label}</span>
              <span className={`p-2 rounded-lg ${c.color}`}>{c.icon}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{c.value}</p>
            {c.sub && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Gold Price Trend */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-yellow-500" /> Gold Price Trend
          </h2>
          <div className="flex gap-1">
            {TIME_RANGES.map(r => (
              <button key={r} onClick={() => setTimeRange(r)} className={`px-3 py-1 text-xs rounded-lg font-medium transition ${timeRange === r ? 'bg-yellow-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>{r}</button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={priceTrend}>
            <defs><linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 11 }} />
            <YAxis stroke="#9ca3af" tickFormatter={v => `₹${v.toFixed(0)}`} />
            <Tooltip formatter={v => `₹${Number(v).toFixed(2)}`} />
            <Area type="monotone" dataKey="price" stroke="#f59e0b" fill="url(#goldGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Holdings & Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Holdings</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700"><th className="pb-2 pr-3">Type</th><th className="pb-2 pr-3">Name</th><th className="pb-2 pr-3">Weight</th><th className="pb-2 pr-3">Purity</th><th className="pb-2 pr-3">Buy Price</th><th className="pb-2 pr-3">Current</th><th className="pb-2 pr-3">Gain</th><th className="pb-2"></th></tr></thead>
              <tbody>
                {holdings.map(h => {
                  const curVal = h.unit === 'grams' ? h.weight * goldPrice.perGram * (h.purity === '22K' ? 0.916 : 1) : h.weight * (h.nav || goldPrice.perGram);
                  const invested = h.purchasePrice * h.weight;
                  const gain = curVal - invested;
                  return (
                    <tr key={h.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-2 pr-3"><span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">{h.type}</span></td>
                      <td className="py-2 pr-3 font-medium text-gray-900 dark:text-white">{h.name}</td>
                      <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{h.weight} {h.unit}</td>
                      <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{h.purity}</td>
                      <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">₹{invested.toLocaleString()}</td>
                      <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">₹{Math.round(curVal).toLocaleString()}</td>
                      <td className={`py-2 pr-3 font-medium ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>{gain >= 0 ? '+' : ''}₹{Math.round(gain).toLocaleString()}</td>
                      <td className="py-2"><button onClick={() => handleDeleteHolding(h.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Allocation</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={allocationData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}>
                {allocationData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Gold in Portfolio</p>
            <p className="text-2xl font-bold text-yellow-600">{portfolioPercent}%</p>
          </div>
        </div>
      </div>

      {/* Gold vs Other Assets */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-500" /> Gold vs Other Assets
        </h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={comparisonData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="asset" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" tickFormatter={v => `${v}%`} />
            <Tooltip formatter={v => `${v}%`} />
            <Legend />
            <Bar dataKey="1Y" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="3Y" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="5Y" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Purchase History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-500" /> Purchase History
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700"><th className="pb-2 pr-3">Date</th><th className="pb-2 pr-3">Item</th><th className="pb-2 pr-3">Type</th><th className="pb-2 pr-3">Weight</th><th className="pb-2 pr-3">Price/unit</th><th className="pb-2">Total</th></tr></thead>
            <tbody>
              {holdings.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate)).map(h => (
                <tr key={h.id} className="border-b dark:border-gray-700">
                  <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{h.purchaseDate}</td>
                  <td className="py-2 pr-3 font-medium text-gray-900 dark:text-white">{h.name}</td>
                  <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{h.type}</td>
                  <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{h.weight} {h.unit}</td>
                  <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">₹{h.purchasePrice.toLocaleString()}</td>
                  <td className="py-2 text-gray-700 dark:text-gray-300">₹{(h.purchasePrice * h.weight).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Purchase Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Gold Purchase</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  {HOLDING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Weight</label><input type="number" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purity</label><select value={form.purity} onChange={e => setForm(p => ({ ...p, purity: e.target.value }))} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option>24K</option><option>22K</option><option>18K</option><option>N/A</option></select></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Price (per unit ₹)</label><input type="number" value={form.purchasePrice} onChange={e => setForm(p => ({ ...p, purchasePrice: e.target.value }))} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Date</label><input type="date" value={form.purchaseDate} onChange={e => setForm(p => ({ ...p, purchaseDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleAddHolding} className="flex-1 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">Add Purchase</button>
            </div>
          </div>
        </div>
      )}

      {/* Price Alerts Modal */}
      {showAlerts && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Bell className="w-5 h-5" /> Price Alerts</h2>
              <button onClick={() => setShowAlerts(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2 mb-4">
              {alerts.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {a.type === 'above' ? <ArrowUpRight className="w-4 h-4 text-green-500" /> : <ArrowDownRight className="w-4 h-4 text-red-500" />}
                    <span className="text-sm text-gray-700 dark:text-gray-300">Alert when price goes {a.type} ₹{a.price.toLocaleString()}/g</span>
                  </div>
                  <button onClick={() => setAlerts(prev => prev.filter(al => al.id !== a.id))} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <select value={alertForm.type} onChange={e => setAlertForm(p => ({ ...p, type: e.target.value }))} className="px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm">
                <option value="above">Above</option><option value="below">Below</option>
              </select>
              <input type="number" placeholder="Price/g" value={alertForm.price} onChange={e => setAlertForm(p => ({ ...p, price: e.target.value }))} className="flex-1 px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 text-sm dark:text-white" />
              <button onClick={addAlert} className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
