import React, { useState, useMemo, useEffect } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import {
  Shield, Heart, Car, Home, Plane, Plus, Edit2, Trash2, X,
  AlertTriangle, CheckCircle, TrendingUp, IndianRupee, Calendar,
  ChevronRight, Info, FileText
} from 'lucide-react';
import MainLayout from '../components/MainLayout';
import api from '../services/api';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

const loadLocal = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
const saveLocal = (key, data) => localStorage.setItem(key, JSON.stringify(data));

const fmt = (n) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString('en-IN')}`;

export default function InsurancePlanner() {
  const [showModal, setShowModal] = useState(false);
  const [editPolicy, setEditPolicy] = useState(null);
  const [policies, setPolicies] = useState(() => loadLocal('fa_insurance_policies'));
  const [claims, setClaims] = useState(() => loadLocal('fa_insurance_claims'));
  const [formData, setFormData] = useState({ type: 'Health', provider: '', premium: '', cover: '', expiry: '' });
  const [calcAge, setCalcAge] = useState(30);
  const [calcIncome, setCalcIncome] = useState(1200000);
  const [calcDependents, setCalcDependents] = useState(2);

  // Sync with backend on mount
  useEffect(() => {
    const fetchFromAPI = async () => {
      try {
        const res = await api.get('/insurance');
        const data = res.data?.policies || res.data?.data || res.data || [];
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map(p => ({
            type: p.type || p.policyType || 'Health', provider: p.provider || p.insurer || '',
            premium: p.premiumAmount || p.premium || 0, cover: p.coverAmount || p.cover || p.sumAssured || 0,
            expiry: p.endDate ? new Date(p.endDate).toISOString().split('T')[0] : '',
            status: p.status || 'Active', _backendId: p._id
          }));
          setPolicies(mapped);
          saveLocal('fa_insurance_policies', mapped);
        }
      } catch { /* fallback to localStorage */ }
    };
    fetchFromAPI();
  }, []);

  useEffect(() => { saveLocal('fa_insurance_policies', policies); }, [policies]);
  useEffect(() => { saveLocal('fa_insurance_claims', claims); }, [claims]);

  const premiumData = useMemo(() => policies.map((p, i) => ({
    name: p.type, value: p.premium
  })), [policies]);

  const totalPremium = useMemo(() => policies.reduce((s, p) => s + p.premium, 0), [policies]);
  const totalCover = useMemo(() => policies.reduce((s, p) => s + p.cover, 0), [policies]);
  const activeCount = useMemo(() => policies.filter(p => p.status === 'Active').length, [policies]);

  const recommendedLifeCover = useMemo(() => calcIncome * (10 + calcDependents * 2), [calcIncome, calcDependents]);
  const recommendedHealthCover = useMemo(() => {
    const base = calcAge < 35 ? 500000 : calcAge < 50 ? 1000000 : 2000000;
    return base + calcDependents * 200000;
  }, [calcAge, calcDependents]);

  const coverageGaps = useMemo(() => {
    const typeMap = {};
    policies.forEach(p => { typeMap[p.type] = (typeMap[p.type] || 0) + p.cover; });
    const recommended = { Health: recommendedHealthCover, Life: recommendedLifeCover, Vehicle: 750000, Home: 5000000, Travel: 1000000 };
    return Object.entries(recommended).map(([type, rec]) => ({ category: `${type} Insurance`, current: typeMap[type] || 0, recommended: rec }));
  }, [policies, recommendedHealthCover, recommendedLifeCover]);

  const openAddModal = () => { setEditPolicy(null); setFormData({ type: 'Health', provider: '', premium: '', cover: '', expiry: '' }); setShowModal(true); };
  const openEditModal = (p, idx) => { setEditPolicy(idx); setFormData({ type: p.type, provider: p.provider, premium: p.premium, cover: p.cover, expiry: p.expiry || '' }); setShowModal(true); };

  const savePolicy = async () => {
    const iconMap = { Health: Heart, Life: Shield, Vehicle: Car, Home: Home, Travel: Plane };
    const colorMap = { Health: '#EF4444', Life: '#3B82F6', Vehicle: '#F59E0B', Home: '#10B981', Travel: '#8B5CF6' };
    const newPolicy = { ...formData, premium: Number(formData.premium), cover: Number(formData.cover), icon: iconMap[formData.type], color: colorMap[formData.type], status: 'Active' };
    if (editPolicy !== null) {
      const updated = [...policies];
      const existing = updated[editPolicy];
      updated[editPolicy] = { ...existing, ...newPolicy };
      setPolicies(updated);
      if (existing?._backendId) {
        try { await api.put(`/insurance/${existing._backendId}`, { type: newPolicy.type, provider: newPolicy.provider, premiumAmount: newPolicy.premium, coverAmount: newPolicy.cover, endDate: newPolicy.expiry }); } catch { /* updated locally */ }
      }
    } else {
      setPolicies([...policies, newPolicy]);
      try {
        const res = await api.post('/insurance', { type: newPolicy.type, provider: newPolicy.provider, premiumAmount: newPolicy.premium, coverAmount: newPolicy.cover, sumAssured: newPolicy.cover, endDate: newPolicy.expiry, status: 'Active' });
        if (res.data?._id) {
          setPolicies(prev => { const copy = [...prev]; copy[copy.length - 1] = { ...copy[copy.length - 1], _backendId: res.data._id }; return copy; });
        }
      } catch { /* saved locally */ }
    }
    setShowModal(false);
  };

  const deletePolicy = async (idx) => {
    const policy = policies[idx];
    setPolicies(policies.filter((_, i) => i !== idx));
    if (policy?._backendId) {
      try { await api.delete(`/insurance/${policy._backendId}`); } catch { /* removed locally */ }
    }
  };

  return (
    <MainLayout title="Insurance Planner">
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-600" /> Insurance Planner
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your insurance portfolio and identify coverage gaps</p>
        </div>
        <button onClick={openAddModal} className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 px-4 py-2 flex items-center gap-2 w-fit">
          <Plus className="w-4 h-4" /> Add Policy
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Premium/Year', value: fmt(totalPremium), icon: IndianRupee, color: 'text-blue-600' },
          { label: 'Total Coverage', value: fmt(totalCover), icon: Shield, color: 'text-green-600' },
          { label: 'Active Policies', value: activeCount, icon: CheckCircle, color: 'text-emerald-600' },
          { label: 'Claims This Year', value: 2, icon: FileText, color: 'text-orange-600' },
        ].map((c, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">{c.label}</span>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Insurance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {policies.map((p, i) => {
          const Icon = p.icon || Shield;
          return (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: p.color + '20' }}>
                    <Icon className="w-5 h-5" style={{ color: p.color }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{p.type} Insurance</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{p.provider}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : p.status === 'Expired' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                  {p.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Premium</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-white">{fmt(p.premium)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Coverage</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-white">{fmt(p.cover)}</p>
                </div>
              </div>
              {p.expiry && <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Expires: {p.expiry}</p>}
              <div className="flex gap-2">
                <button onClick={() => openEditModal(p, i)} className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm px-3 py-1.5 flex items-center gap-1"><Edit2 className="w-3 h-3" /> Edit</button>
                <button onClick={() => deletePolicy(i)} className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm px-3 py-1.5 flex items-center gap-1"><Trash2 className="w-3 h-3" /> Remove</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Coverage Gap Analysis + Premium PieChart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" /> Coverage Gap Analysis
          </h2>
          <div className="space-y-4">
            {coverageGaps.map((g, i) => {
              const pct = Math.min((g.current / g.recommended) * 100, 100);
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700 dark:text-slate-300">{g.category}</span>
                    <span className="text-slate-500 dark:text-slate-400">{fmt(g.current)} / {fmt(g.recommended)}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                    <div className={`h-3 rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  {pct < 100 && <p className="text-xs text-red-500 mt-1">Gap: {fmt(g.recommended - g.current)}</p>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Annual Premium Summary</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={premiumData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ₹${value.toLocaleString('en-IN')}`}>
                {premiumData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Premium Comparison Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Premium Comparison</h2>
          {policies.length === 0 ? (
            <p className="text-center text-slate-400 dark:text-slate-500 py-8">Add policies to see premium comparison</p>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Type</th>
                  <th className="text-right py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Provider</th>
                  <th className="text-right py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Premium</th>
                  <th className="text-right py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="py-3 px-4 text-slate-800 dark:text-white font-medium">{p.type}</td>
                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">{p.provider || '-'}</td>
                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">{fmt(p.premium)}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800 dark:text-white">{fmt(p.cover)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
      </div>

      {/* Claims History + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" /> Claims History
          </h2>
          <div className="space-y-4">
            {claims.length === 0 ? (
              <p className="text-center text-slate-400 dark:text-slate-500 py-8">No claims history yet</p>
            ) : (
            claims.map((c) => (
              <div key={c.id} className="flex items-start gap-3 relative pl-6 before:absolute before:left-[9px] before:top-6 before:bottom-0 before:w-px before:bg-slate-200 dark:before:bg-slate-700 last:before:hidden">
                <div className={`absolute left-0 top-1 w-5 h-5 rounded-full flex items-center justify-center ${c.status === 'Settled' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  {c.status === 'Settled' ? <CheckCircle className="w-3 h-3 text-green-600" /> : <X className="w-3 h-3 text-red-600" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium text-slate-800 dark:text-white">{c.description}</p>
                    <span className="text-sm font-semibold text-slate-800 dark:text-white">₹{c.amount.toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{c.type} • {c.date} • <span className={c.status === 'Settled' ? 'text-green-600' : 'text-red-500'}>{c.status}</span></p>
                </div>
              </div>
            ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" /> Recommendations
          </h2>
          <div className="space-y-3">
            {coverageGaps.filter(g => g.current < g.recommended).length === 0 ? (
              <p className="text-center text-slate-400 dark:text-slate-500 py-8">Your coverage looks adequate!</p>
            ) : (
              coverageGaps.filter(g => g.current < g.recommended).map((g, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium text-slate-800 dark:text-white">Increase {g.category}</h4>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Gap</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Current: {fmt(g.current)} → Recommended: {fmt(g.recommended)}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1"><Info className="w-3 h-3" /> Gap of {fmt(g.recommended - g.current)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Coverage Calculator */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Coverage Calculator</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-sm text-slate-500 dark:text-slate-400 block mb-2">Age: {calcAge}</label>
            <input type="range" min={18} max={70} value={calcAge} onChange={e => setCalcAge(Number(e.target.value))} className="w-full accent-blue-600" />
          </div>
          <div>
            <label className="text-sm text-slate-500 dark:text-slate-400 block mb-2">Annual Income: {fmt(calcIncome)}</label>
            <input type="range" min={300000} max={10000000} step={100000} value={calcIncome} onChange={e => setCalcIncome(Number(e.target.value))} className="w-full accent-blue-600" />
          </div>
          <div>
            <label className="text-sm text-slate-500 dark:text-slate-400 block mb-2">Dependents: {calcDependents}</label>
            <input type="range" min={0} max={6} value={calcDependents} onChange={e => setCalcDependents(Number(e.target.value))} className="w-full accent-blue-600" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">Recommended Life Cover</p>
            <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{fmt(recommendedLifeCover)}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Based on {10 + calcDependents * 2}x annual income</p>
          </div>
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300 mb-1">Recommended Health Cover</p>
            <p className="text-2xl font-bold text-red-800 dark:text-red-200">{fmt(recommendedHealthCover)}</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">Includes ₹{(calcDependents * 200000).toLocaleString('en-IN')} for dependents</p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-slate-200 dark:border-slate-700 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{editPolicy !== null ? 'Edit' : 'Add'} Insurance Policy</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Type</label>
                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm">
                  {['Health', 'Life', 'Vehicle', 'Home', 'Travel'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Provider</label>
                <input value={formData.provider} onChange={e => setFormData({ ...formData, provider: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm" placeholder="e.g. Star Health" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Annual Premium (₹)</label>
                  <input type="number" value={formData.premium} onChange={e => setFormData({ ...formData, premium: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Coverage (₹)</label>
                  <input type="number" value={formData.cover} onChange={e => setFormData({ ...formData, cover: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Expiry Date</label>
                <input type="date" value={formData.expiry} onChange={e => setFormData({ ...formData, expiry: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setShowModal(false)} className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm px-4 py-2">Cancel</button>
              <button onClick={savePolicy} className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 px-4 py-2">Save Policy</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </MainLayout>
  );
}
