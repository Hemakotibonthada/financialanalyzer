import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  TrendingUp, IndianRupee, Percent, Clock, Target, ArrowUpRight,
  BarChart3, Layers, Calculator, Zap, ShieldCheck, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, BarChart, Bar
} from 'recharts';
import MainLayout from '../components/MainLayout';
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'];

function calcSIP(monthly, rate, years) {
  const r = rate / 12 / 100;
  const n = years * 12;
  if (r === 0) return monthly * n;
  return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}

function calcStepUpSIP(monthly, rate, years, stepUp) {
  let total = 0;
  let currentMonthly = monthly;
  for (let y = 0; y < years; y++) {
    const r = rate / 12 / 100;
    for (let m = 0; m < 12; m++) {
      total = (total + currentMonthly) * (1 + r);
    }
    currentMonthly *= (1 + stepUp / 100);
  }
  return total;
}

function calcLumpsum(amount, rate, years) {
  return amount * Math.pow(1 + rate / 100, years);
}

function calcGoalSIP(target, rate, years) {
  const r = rate / 12 / 100;
  const n = years * 12;
  if (r === 0) return target / n;
  return target / (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
}

export default function SIPCalculator() {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  const [loading, setLoading] = useState(true);
  const [sipAmount, setSipAmount] = useState(10000);
  const [returnRate, setReturnRate] = useState(12);
  const [timePeriod, setTimePeriod] = useState(10);
  const [stepUpRate, setStepUpRate] = useState(10);
  const [enableStepUp, setEnableStepUp] = useState(false);
  const [inflationRate, setInflationRate] = useState(6);
  const [showGoal, setShowGoal] = useState(false);
  const [goalAmount, setGoalAmount] = useState(5000000);
  const [showYearTable, setShowYearTable] = useState(false);
  const [activeTab, setActiveTab] = useState('sip');

  useEffect(() => { setTimeout(() => setLoading(false), 500); }, []);

  const futureValue = useMemo(() => enableStepUp ? calcStepUpSIP(sipAmount, returnRate, timePeriod, stepUpRate) : calcSIP(sipAmount, returnRate, timePeriod), [sipAmount, returnRate, timePeriod, enableStepUp, stepUpRate]);
  const totalInvested = useMemo(() => {
    if (!enableStepUp) return sipAmount * 12 * timePeriod;
    let total = 0, current = sipAmount;
    for (let y = 0; y < timePeriod; y++) { total += current * 12; current *= (1 + stepUpRate / 100); }
    return total;
  }, [sipAmount, timePeriod, enableStepUp, stepUpRate]);
  const totalReturns = futureValue - totalInvested;
  const inflationAdjusted = futureValue / Math.pow(1 + inflationRate / 100, timePeriod);

  const lumpsumEquiv = calcLumpsum(sipAmount * 12 * timePeriod, returnRate, timePeriod);
  const lumpsumInvested = sipAmount * 12 * timePeriod;
  const sipFV = calcSIP(sipAmount, returnRate, timePeriod);

  const goalSIP = useMemo(() => calcGoalSIP(goalAmount, returnRate, timePeriod), [goalAmount, returnRate, timePeriod]);

  const pieData = [
    { name: 'Invested', value: Math.round(totalInvested) },
    { name: 'Returns', value: Math.round(totalReturns) },
  ];

  const yearData = useMemo(() => {
    const data = [];
    let invested = 0, currentMonthly = sipAmount;
    for (let y = 1; y <= timePeriod; y++) {
      invested += currentMonthly * 12;
      const fv = enableStepUp ? calcStepUpSIP(sipAmount, returnRate, y, stepUpRate) : calcSIP(sipAmount, returnRate, y);
      data.push({ year: `Year ${y}`, invested: Math.round(invested), value: Math.round(fv), returns: Math.round(fv - invested) });
      if (enableStepUp) currentMonthly *= (1 + stepUpRate / 100);
    }
    return data;
  }, [sipAmount, returnRate, timePeriod, enableStepUp, stepUpRate]);

  const growthChart = useMemo(() => yearData.map((d) => ({ ...d, name: d.year })), [yearData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading SIP Calculator...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout title="SIP Calculator">
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="animate-fade-in-up">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-emerald-600" /> SIP Calculator
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Plan your systematic investments & grow your wealth</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          {[{ id: 'sip', label: 'SIP Calculator', icon: Calculator }, { id: 'goal', label: 'Goal-Based', icon: Target }, { id: 'compare', label: 'SIP vs Lumpsum', icon: Layers }].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'sip' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Inputs */}
            <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Investment Details</h2>

                <div>
                  <div className="flex justify-between text-sm mb-2"><span className="text-slate-600 dark:text-slate-400 flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" />Monthly SIP</span><span className="font-semibold text-slate-900 dark:text-white">₹{sipAmount.toLocaleString()}</span></div>
                  <input type="range" min={500} max={500000} step={500} value={sipAmount} onChange={(e) => setSipAmount(+e.target.value)} className="w-full accent-emerald-600" />
                  <div className="flex justify-between text-xs text-slate-400 mt-1"><span>₹500</span><span>₹5L</span></div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2"><span className="text-slate-600 dark:text-slate-400 flex items-center gap-1"><Percent className="w-3.5 h-3.5" />Expected Return</span><span className="font-semibold text-slate-900 dark:text-white">{returnRate}%</span></div>
                  <input type="range" min={1} max={30} step={0.5} value={returnRate} onChange={(e) => setReturnRate(+e.target.value)} className="w-full accent-emerald-600" />
                  <div className="flex justify-between text-xs text-slate-400 mt-1"><span>1%</span><span>30%</span></div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2"><span className="text-slate-600 dark:text-slate-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Time Period</span><span className="font-semibold text-slate-900 dark:text-white">{timePeriod} years</span></div>
                  <input type="range" min={1} max={40} step={1} value={timePeriod} onChange={(e) => setTimePeriod(+e.target.value)} className="w-full accent-emerald-600" />
                  <div className="flex justify-between text-xs text-slate-400 mt-1"><span>1 yr</span><span>40 yrs</span></div>
                </div>

                {/* Step-up */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <label className="flex items-center gap-3 cursor-pointer mb-3">
                    <input type="checkbox" checked={enableStepUp} onChange={(e) => setEnableStepUp(e.target.checked)} className="w-4 h-4 accent-emerald-600 rounded" />
                    <span className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-1"><Zap className="w-4 h-4 text-amber-500" /> Step-Up SIP</span>
                  </label>
                  {enableStepUp && (
                    <div>
                      <div className="flex justify-between text-sm mb-2"><span className="text-slate-500 dark:text-slate-400">Annual Increase</span><span className="font-semibold text-slate-900 dark:text-white">{stepUpRate}%</span></div>
                      <input type="range" min={1} max={25} step={1} value={stepUpRate} onChange={(e) => setStepUpRate(+e.target.value)} className="w-full accent-amber-500" />
                    </div>
                  )}
                </div>

                {/* Inflation */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between text-sm mb-2"><span className="text-slate-600 dark:text-slate-400 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />Inflation Rate</span><span className="font-semibold text-slate-900 dark:text-white">{inflationRate}%</span></div>
                  <input type="range" min={0} max={12} step={0.5} value={inflationRate} onChange={(e) => setInflationRate(+e.target.value)} className="w-full accent-purple-600" />
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-2 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 dashboard-grid animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Invested Amount</p>
                  <p className="text-lg font-bold text-blue-600"><AnimatedValue end={Math.round(totalInvested)} /></p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Est. Returns</p>
                  <p className="text-lg font-bold text-emerald-600"><AnimatedValue end={Math.round(totalReturns)} /></p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Future Value</p>
                  <p className="text-lg font-bold text-purple-600"><AnimatedValue end={Math.round(futureValue)} /></p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Inflation Adj.</p>
                  <p className="text-lg font-bold text-amber-600"><AnimatedValue end={Math.round(inflationAdjusted)} /></p>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Investment vs Returns</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={4} animationDuration={1200}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-6 mt-2">
                    {pieData.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs"><div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} /><span className="text-slate-600 dark:text-slate-400">{d.name}</span></div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Wealth Growth</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={growthChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                      <Area type="monotone" dataKey="invested" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                      <Area type="monotone" dataKey="returns" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                      <Legend />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Year-wise Table */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
                <button onClick={() => setShowYearTable(!showYearTable)} className="w-full p-4 flex items-center justify-between text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700">
                  <span className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-emerald-600" /> Year-wise Breakdown</span>
                  {showYearTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showYearTable && (
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-slate-50 dark:bg-slate-700">
                        <tr className="text-xs text-slate-500 dark:text-slate-400">
                          <th className="text-left p-3">Year</th>
                          <th className="text-right p-3">Invested</th>
                          <th className="text-right p-3">Value</th>
                          <th className="text-right p-3">Returns</th>
                        </tr>
                      </thead>
                      <tbody>
                        {yearData.map((d, i) => (
                          <tr key={i} className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                            <td className="p-3 font-medium text-slate-900 dark:text-white">{d.year}</td>
                            <td className="p-3 text-right text-blue-600">₹{d.invested.toLocaleString()}</td>
                            <td className="p-3 text-right text-slate-900 dark:text-white font-medium">₹{d.value.toLocaleString()}</td>
                            <td className="p-3 text-right text-emerald-600">₹{d.returns.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'goal' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2"><Target className="w-5 h-5 text-emerald-600" /> Goal-Based SIP</h2>
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">Target Amount</label>
                <div className="flex justify-between text-sm mb-2"><span className="text-slate-500">₹{goalAmount.toLocaleString()}</span></div>
                <input type="range" min={100000} max={100000000} step={100000} value={goalAmount} onChange={(e) => setGoalAmount(+e.target.value)} className="w-full accent-emerald-600" />
                <div className="flex justify-between text-xs text-slate-400 mt-1"><span>₹1L</span><span>₹10Cr</span></div>
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <p className="text-sm text-emerald-700 dark:text-emerald-400">At {returnRate}% return for {timePeriod} years:</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">₹{Math.round(goalSIP).toLocaleString()}/month</p>
                <p className="text-xs text-emerald-600/70 mt-1">Required monthly SIP to reach your goal</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Goal Projection</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={Array.from({ length: timePeriod }, (_, i) => ({ year: `Y${i + 1}`, value: Math.round(calcSIP(goalSIP, returnRate, i + 1)), target: goalAmount }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                  <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="target" stroke="#ef4444" fill="none" strokeDasharray="5 5" />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'compare' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Layers className="w-5 h-5 text-blue-600" /> SIP vs Lump Sum</h2>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-sm text-blue-700 dark:text-blue-400">SIP (₹{sipAmount.toLocaleString()}/month × {timePeriod} years)</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">₹{Math.round(sipFV).toLocaleString()}</p>
                  <p className="text-xs text-blue-500 mt-1">Total invested: ₹{(sipAmount * 12 * timePeriod).toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20">
                  <p className="text-sm text-purple-700 dark:text-purple-400">Lump Sum (₹{lumpsumInvested.toLocaleString()} for {timePeriod} years)</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">₹{Math.round(lumpsumEquiv).toLocaleString()}</p>
                  <p className="text-xs text-purple-500 mt-1">Same total investment, lump sum at start</p>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                  <p className="text-sm text-amber-700 dark:text-amber-400">Difference</p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">₹{Math.abs(Math.round(lumpsumEquiv - sipFV)).toLocaleString()}</p>
                  <p className="text-xs text-amber-500 mt-1">{lumpsumEquiv > sipFV ? 'Lump sum wins (if you have the capital)' : 'SIP wins with rupee cost averaging'}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Comparison Chart</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[{ name: 'SIP', invested: sipAmount * 12 * timePeriod, returns: Math.round(sipFV - sipAmount * 12 * timePeriod) }, { name: 'Lump Sum', invested: lumpsumInvested, returns: Math.round(lumpsumEquiv - lumpsumInvested) }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                  <Bar dataKey="invested" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="returns" stackId="a" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
    </MainLayout>
  );
}
