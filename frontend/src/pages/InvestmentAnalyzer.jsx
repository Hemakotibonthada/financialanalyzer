import React, { useState, useMemo } from 'react';
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

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

const fmt = (n) => {
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
};

const assetAllocation = [
  { name: 'Equity', value: 4500000, target: 50 },
  { name: 'Debt', value: 2000000, target: 25 },
  { name: 'Gold', value: 800000, target: 10 },
  { name: 'Real Estate', value: 3500000, target: 10 },
  { name: 'Cash', value: 200000, target: 5 },
];

const holdings = [
  { id: 1, name: 'HDFC Bank', type: 'Stock', invested: 200000, current: 280000, units: 80, sector: 'Banking' },
  { id: 2, name: 'Infosys', type: 'Stock', invested: 150000, current: 175000, units: 50, sector: 'IT' },
  { id: 3, name: 'Reliance Industries', type: 'Stock', invested: 300000, current: 420000, units: 100, sector: 'Conglomerate' },
  { id: 4, name: 'Parag Parikh Flexi Cap', type: 'Mutual Fund', invested: 500000, current: 680000, units: 12000, sector: 'Diversified' },
  { id: 5, name: 'SBI Small Cap', type: 'Mutual Fund', invested: 300000, current: 410000, units: 3000, sector: 'Small Cap' },
  { id: 6, name: 'ICICI Pru Bluechip', type: 'Mutual Fund', invested: 400000, current: 480000, units: 6000, sector: 'Large Cap' },
  { id: 7, name: 'Nippon Gold BeES', type: 'ETF', invested: 200000, current: 260000, units: 400, sector: 'Gold' },
  { id: 8, name: 'HDFC Corporate Bond', type: 'Mutual Fund', invested: 300000, current: 335000, units: 8000, sector: 'Debt' },
  { id: 9, name: 'SBI Magnum Gilt', type: 'Mutual Fund', invested: 200000, current: 218000, units: 5000, sector: 'Debt' },
  { id: 10, name: 'TCS', type: 'Stock', invested: 250000, current: 310000, units: 60, sector: 'IT' },
];

const performanceData = {
  '1M': [{ d: 'W1', v: 108 }, { d: 'W2', v: 106.5 }, { d: 'W3', v: 109 }, { d: 'W4', v: 110 }],
  '3M': [{ d: 'Dec', v: 104 }, { d: 'Jan', v: 107 }, { d: 'Feb', v: 110 }],
  '6M': [{ d: 'Sep', v: 100 }, { d: 'Oct', v: 102 }, { d: 'Nov', v: 103 }, { d: 'Dec', v: 104 }, { d: 'Jan', v: 107 }, { d: 'Feb', v: 110 }],
  '1Y': [{ d: 'Mar', v: 92 }, { d: 'May', v: 96 }, { d: 'Jul', v: 100 }, { d: 'Sep', v: 100 }, { d: 'Nov', v: 104 }, { d: 'Jan', v: 107 }, { d: 'Feb', v: 110 }],
  '3Y': [{ d: '2023', v: 72 }, { d: '2024 H1', v: 85 }, { d: '2024 H2', v: 96 }, { d: '2025 H1', v: 102 }, { d: '2025 H2', v: 104 }, { d: '2026', v: 110 }],
  '5Y': [{ d: '2021', v: 55 }, { d: '2022', v: 62 }, { d: '2023', v: 72 }, { d: '2024', v: 90 }, { d: '2025', v: 103 }, { d: '2026', v: 110 }],
  'ALL': [{ d: '2019', v: 35 }, { d: '2020', v: 30 }, { d: '2021', v: 55 }, { d: '2022', v: 62 }, { d: '2023', v: 72 }, { d: '2024', v: 90 }, { d: '2025', v: 103 }, { d: '2026', v: 110 }],
};

const riskData = [
  { metric: 'Volatility', value: 65 },
  { metric: 'Sharpe Ratio', value: 72 },
  { metric: 'Max Drawdown', value: 45 },
  { metric: 'Beta', value: 70 },
  { metric: 'Diversification', value: 80 },
  { metric: 'Liquidity', value: 85 },
];

const sectorData = [
  { name: 'Banking', value: 25 },
  { name: 'IT', value: 20 },
  { name: 'Diversified', value: 18 },
  { name: 'Small Cap', value: 12 },
  { name: 'Large Cap', value: 10 },
  { name: 'Debt', value: 10 },
  { name: 'Gold', value: 5 },
];

const sipVsLumpsum = [
  { year: 'Y1', sip: 120000, lumpsum: 118000 },
  { year: 'Y2', sip: 258000, lumpsum: 248000 },
  { year: 'Y3', sip: 415000, lumpsum: 390000 },
  { year: 'Y4', sip: 590000, lumpsum: 548000 },
  { year: 'Y5', sip: 795000, lumpsum: 730000 },
];

const dividends = [
  { date: '2026-01-15', stock: 'HDFC Bank', amount: 3200 },
  { date: '2025-11-20', stock: 'Infosys', amount: 2800 },
  { date: '2025-09-10', stock: 'TCS', amount: 4500 },
  { date: '2025-07-05', stock: 'Reliance', amount: 1800 },
  { date: '2025-05-12', stock: 'HDFC Bank', amount: 3000 },
];

const rebalancing = [
  { asset: 'Equity', current: 41, target: 50, action: 'Increase', amount: 990000 },
  { asset: 'Debt', current: 18, target: 25, action: 'Increase', amount: 770000 },
  { asset: 'Gold', current: 7, target: 10, action: 'Increase', amount: 300000 },
  { asset: 'Real Estate', current: 32, target: 10, action: 'Decrease', amount: -2420000 },
  { asset: 'Cash', current: 2, target: 5, action: 'Increase', amount: 350000 },
];

const benchmarkData = [
  { month: 'Sep', portfolio: 100, nifty: 100 },
  { month: 'Oct', portfolio: 102, nifty: 101 },
  { month: 'Nov', portfolio: 103, nifty: 102.5 },
  { month: 'Dec', portfolio: 104, nifty: 103 },
  { month: 'Jan', portfolio: 107, nifty: 105 },
  { month: 'Feb', portfolio: 110, nifty: 107 },
];

export default function InvestmentAnalyzer() {
  const [perfTab, setPerfTab] = useState('1Y');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newInv, setNewInv] = useState({ name: '', type: 'Stock', invested: '', current: '', units: '', sector: '' });
  const [holdingsList, setHoldingsList] = useState(holdings);
  const [searchTerm, setSearchTerm] = useState('');

  const totalInvested = useMemo(() => holdingsList.reduce((s, h) => s + h.invested, 0), [holdingsList]);
  const totalCurrent = useMemo(() => holdingsList.reduce((s, h) => s + h.current, 0), [holdingsList]);
  const totalGain = totalCurrent - totalInvested;
  const gainPct = ((totalGain / totalInvested) * 100).toFixed(1);
  const dailyChange = 12500;
  const dailyChangePct = 0.23;

  const totalPortfolio = useMemo(() => assetAllocation.reduce((s, a) => s + a.value, 0), []);
  const allocationPie = useMemo(() => assetAllocation.map(a => ({ ...a, pct: ((a.value / totalPortfolio) * 100).toFixed(1) })), [totalPortfolio]);

  const filteredHoldings = useMemo(() =>
    holdingsList.filter(h => !searchTerm || h.name.toLowerCase().includes(searchTerm.toLowerCase()) || h.sector.toLowerCase().includes(searchTerm.toLowerCase())),
    [holdingsList, searchTerm]
  );

  const totalDividends = useMemo(() => dividends.reduce((s, d) => s + d.amount, 0), []);

  const addInvestment = () => {
    if (!newInv.name || !newInv.invested) return;
    setHoldingsList([...holdingsList, { ...newInv, id: Date.now(), invested: Number(newInv.invested), current: Number(newInv.current), units: Number(newInv.units) }]);
    setNewInv({ name: '', type: 'Stock', invested: '', current: '', units: '', sector: '' });
    setShowAddForm(false);
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
          { label: 'Portfolio Value', value: fmt(totalCurrent), icon: Briefcase, color: 'text-blue-600', sub: <span className="flex items-center gap-1">{dailyChange > 0 ? <ArrowUpRight className="w-3 h-3 text-green-500" /> : <ArrowDownRight className="w-3 h-3 text-red-500" />}<span className={dailyChange > 0 ? 'text-green-500' : 'text-red-500'}>{fmt(dailyChange)} ({dailyChangePct}%)</span></span> },
          { label: 'Total Invested', value: fmt(totalInvested), icon: DollarSign, color: 'text-amber-600', sub: `${holdingsList.length} holdings` },
          { label: 'Total Gain/Loss', value: fmt(totalGain), icon: totalGain >= 0 ? TrendingUp : TrendingDown, color: totalGain >= 0 ? 'text-green-600' : 'text-red-600', sub: `${gainPct}% overall return` },
          { label: 'Dividends Earned', value: fmt(totalDividends), icon: Coins, color: 'text-purple-600', sub: 'Last 12 months' },
        ].map((c, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">{c.label}</span>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{c.value}</p>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Asset Allocation + Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Asset Allocation</h2>
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
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Performance</h2>
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-1">
              {Object.keys(performanceData).map(tab => (
                <button key={tab} onClick={() => setPerfTab(tab)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium ${perfTab === tab ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={performanceData[perfTab]}>
              <XAxis dataKey="d" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip />
              <Area type="monotone" dataKey="v" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.15} strokeWidth={2} name="Portfolio Index" />
            </AreaChart>
          </ResponsiveContainer>
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
              </tr>
            </thead>
            <tbody>
              {filteredHoldings.map(h => {
                const gain = h.current - h.invested;
                const ret = ((gain / h.invested) * 100).toFixed(1);
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk Radar + Sector Diversification */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Risk Analysis</h2>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={riskData}>
              <PolarGrid stroke="#94a3b8" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 100]} />
              <Radar name="Score" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Sector Diversification</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={sectorData} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                label={({ name, value }) => `${name}: ${value}%`}>
                {sectorData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SIP vs Lumpsum + Dividend Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">SIP vs Lumpsum Comparison</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sipVsLumpsum}>
              <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tickFormatter={v => fmt(v)} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip formatter={v => fmt(v)} />
              <Legend />
              <Bar dataKey="sip" fill="#3B82F6" name="SIP" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lumpsum" fill="#F59E0B" name="Lumpsum" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" /> Dividend Tracker
          </h2>
          <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 mb-4">
            <p className="text-xs text-green-600 dark:text-green-400">Total Dividends (12 months)</p>
            <p className="text-xl font-bold text-green-700 dark:text-green-300">{fmt(totalDividends)}</p>
          </div>
          <div className="space-y-2">
            {dividends.map((d, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{d.stock}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{d.date}</p>
                </div>
                <span className="text-sm font-bold text-green-600">+{fmt(d.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rebalancing Suggestions */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-blue-500" /> Rebalancing Suggestions
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Asset Class</th>
                <th className="text-right py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Current %</th>
                <th className="text-right py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Target %</th>
                <th className="text-center py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Action</th>
                <th className="text-right py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rebalancing.map((r, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="py-3 px-4 text-slate-800 dark:text-white font-medium">{r.asset}</td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">{r.current}%</td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">{r.target}%</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.action === 'Increase' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {r.action}
                    </span>
                  </td>
                  <td className={`py-3 px-4 text-right font-medium ${r.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>{r.amount >= 0 ? '+' : ''}{fmt(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Portfolio vs Nifty50 Benchmark */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Landmark className="w-5 h-5 text-purple-500" /> Portfolio vs Nifty50 Benchmark
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={benchmarkData}>
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[95, 115]} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="portfolio" stroke="#3B82F6" strokeWidth={2} name="Your Portfolio" dot={{ r: 4 }} />
            <Line type="monotone" dataKey="nifty" stroke="#F59E0B" strokeWidth={2} name="Nifty 50" dot={{ r: 4 }} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 text-center">
          <p className="text-sm text-green-700 dark:text-green-300">Your portfolio outperformed Nifty50 by <span className="font-bold">+3%</span> over the last 6 months</p>
        </div>
      </div>

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
                  <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Invested (₹)</label>
                  <input type="number" value={newInv.invested} onChange={e => setNewInv({ ...newInv, invested: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Current (₹)</label>
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
