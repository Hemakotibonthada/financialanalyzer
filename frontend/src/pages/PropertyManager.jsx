import React, { useState, useEffect, useMemo } from 'react';
import {
  Home, Building2, MapPin, Plus, Edit2, Trash2, TrendingUp, TrendingDown,
  DollarSign, Calendar, Wrench, Calculator, BarChart3, ArrowUpRight,
  IndianRupee, X, ChevronDown, ChevronUp, Eye, Landmark, FileText, AlertTriangle
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import MainLayout from '../components/MainLayout';
import api from '../services/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6'];

const loadLocal = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
const saveLocal = (key, data) => localStorage.setItem(key, JSON.stringify(data));

const PROPERTY_TYPES = [
  { value: 'owned', label: 'Owned', color: 'bg-blue-500' },
  { value: 'rented', label: 'Rented Out', color: 'bg-green-500' },
  { value: 'invested', label: 'Invested', color: 'bg-purple-500' },
];


const emptyForm = { name: '', type: 'owned', value: '', address: '', area: '', year: '' };

export default function PropertyManager() {
  const [properties, setProperties] = useState(() => loadLocal('fa_properties'));
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [view, setView] = useState('grid');
  const [maintenanceForm, setMaintenanceForm] = useState({ date: '', desc: '', cost: '' });
  const [showMaintenance, setShowMaintenance] = useState(null);
  const [compareIds, setCompareIds] = useState([]);

  // Sync with backend on mount
  useEffect(() => {
    const fetchFromAPI = async () => {
      try {
        const res = await api.get('/real-estate');
        const data = res.data?.properties || res.data?.data || res.data || [];
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map(p => ({
            id: p._id || p.id, name: p.name || p.propertyName, type: p.propertyType || p.type || 'owned',
            value: p.currentValue || p.purchasePrice || 0, address: p.address || p.location || '',
            area: p.area || p.squareFeet || 0, year: p.purchaseYear || (p.purchaseDate ? new Date(p.purchaseDate).getFullYear() : 2024),
            rentalIncome: p.monthlyRent || p.rentalIncome || 0,
            mortgage: p.mortgage || { amount: 0, emi: 0, remaining: 0, rate: 0 },
            tax: p.propertyTax || p.tax || 0, maintenanceLog: p.maintenanceLog || p.expenses || [],
            appreciation: p.appreciation || p.valuationHistory || [], _backendId: p._id
          }));
          setProperties(mapped);
          saveLocal('fa_properties', mapped);
        }
      } catch { /* fallback to localStorage */ }
    };
    fetchFromAPI();
  }, []);

  useEffect(() => { saveLocal('fa_properties', properties); }, [properties]);

  const totalValue = useMemo(() => properties.reduce((s, p) => s + p.value, 0), [properties]);
  const totalRental = useMemo(() => properties.reduce((s, p) => s + p.rentalIncome, 0), [properties]);
  const totalMortgage = useMemo(() => properties.reduce((s, p) => s + p.mortgage.remaining, 0), [properties]);
  const netEquity = totalValue - totalMortgage;

  const typeDistribution = useMemo(() => {
    const map = {};
    properties.forEach(p => { map[p.type] = (map[p.type] || 0) + p.value; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [properties]);

  const allAppreciation = useMemo(() => {
    const yearMap = {};
    properties.forEach(p => {
      p.appreciation.forEach(a => {
        if (!yearMap[a.year]) yearMap[a.year] = { year: a.year };
        yearMap[a.year][p.name] = a.value;
      });
    });
    return Object.values(yearMap).sort((a, b) => a.year - b.year);
  }, [properties]);

  const handleSubmit = async () => {
    if (!form.name || !form.value) return;
    if (editId) {
      setProperties(prev => prev.map(p => p.id === editId ? { ...p, ...form, value: Number(form.value), area: Number(form.area), year: Number(form.year) } : p));
      const existing = properties.find(p => p.id === editId);
      if (existing?._backendId) {
        try { await api.put(`/real-estate/${existing._backendId}`, { name: form.name, propertyType: form.type, currentValue: Number(form.value), address: form.address, area: Number(form.area) }); } catch { /* updated locally */ }
      }
    } else {
      const newProp = {
        id: Date.now(), ...form, value: Number(form.value), area: Number(form.area), year: Number(form.year),
        image: null, rentalIncome: 0, mortgage: { amount: 0, emi: 0, remaining: 0, rate: 0 }, tax: 0,
        maintenanceLog: [], appreciation: [{ year: Number(form.year), value: Number(form.value) }]
      };
      setProperties(prev => [...prev, newProp]);
      try {
        const res = await api.post('/real-estate', {
          name: form.name, propertyType: form.type, purchasePrice: Number(form.value), currentValue: Number(form.value),
          address: form.address, area: Number(form.area), purchaseYear: Number(form.year)
        });
        if (res.data?._id) {
          setProperties(prev => prev.map(p => p.id === newProp.id ? { ...p, _backendId: res.data._id } : p));
        }
      } catch { /* saved locally */ }
    }
    setShowModal(false);
    setForm(emptyForm);
    setEditId(null);
  };

  const handleDelete = async (id) => {
    const prop = properties.find(p => p.id === id);
    setProperties(prev => prev.filter(p => p.id !== id));
    if (selectedProperty?.id === id) setSelectedProperty(null);
    if (prop?._backendId) {
      try { await api.delete(`/real-estate/${prop._backendId}`); } catch { /* removed locally */ }
    }
  };

  const handleEdit = (p) => {
    setForm({ name: p.name, type: p.type, value: p.value, address: p.address, area: p.area, year: p.year });
    setEditId(p.id);
    setShowModal(true);
  };

  const addMaintenance = (propId) => {
    if (!maintenanceForm.desc || !maintenanceForm.cost) return;
    setProperties(prev => prev.map(p => p.id === propId ? { ...p, maintenanceLog: [...p.maintenanceLog, { ...maintenanceForm, cost: Number(maintenanceForm.cost) }] } : p));
    setMaintenanceForm({ date: '', desc: '', cost: '' });
  };

  const calcROI = (p) => {
    const totalInvested = p.appreciation[0]?.value || p.value;
    const totalRentalEarned = p.rentalIncome * 12 * (new Date().getFullYear() - p.year);
    const totalMaintCost = p.maintenanceLog.reduce((s, m) => s + m.cost, 0);
    const gain = p.value - totalInvested + totalRentalEarned - totalMaintCost;
    const years = new Date().getFullYear() - p.year || 1;
    return { totalGain: gain, annualROI: ((gain / totalInvested) / years * 100).toFixed(2) };
  };

  const toggleCompare = (id) => {
    setCompareIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : prev.length < 3 ? [...prev, id] : prev);
  };

  const comparedProperties = useMemo(() => properties.filter(p => compareIds.includes(p.id)), [properties, compareIds]);

  return (
    <MainLayout title="Property Manager">
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-7 h-7 text-blue-600" /> Property Manager
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Track and manage your real estate portfolio</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setEditId(null); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          <Plus className="w-4 h-4" /> Add Property
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Property Value', value: totalValue, icon: <Home className="w-5 h-5" />, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40' },
          { label: 'Net Equity', value: netEquity, icon: <Landmark className="w-5 h-5" />, color: 'text-green-600 bg-green-100 dark:bg-green-900/40' },
          { label: 'Monthly Rental Income', value: totalRental, icon: <IndianRupee className="w-5 h-5" />, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/40' },
          { label: 'Total Mortgage Outstanding', value: totalMortgage, icon: <FileText className="w-5 h-5" />, color: 'text-red-600 bg-red-100 dark:bg-red-900/40' },
        ].map((c, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">{c.label}</span>
              <span className={`p-2 rounded-lg ${c.color}`}>{c.icon}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{c.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Property Value Appreciation Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" /> Property Value Appreciation
        </h2>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={allAppreciation}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="year" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
            <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
            <Legend />
            {properties.map((p, i) => (
              <Line key={p.id} type="monotone" dataKey={p.name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 4 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Property Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
        {properties.map(p => {
          const roi = calcROI(p);
          const typeInfo = PROPERTY_TYPES.find(t => t.value === p.type);
          return (
            <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition">
              <div className={`h-2 ${typeInfo?.color || 'bg-gray-400'}`} />
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{p.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> {p.address}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.type === 'owned' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : p.type === 'rented' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'}`}>
                    {typeInfo?.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div><span className="text-gray-500 dark:text-gray-400">Value</span><p className="font-semibold text-gray-900 dark:text-white">₹{p.value.toLocaleString()}</p></div>
                  <div><span className="text-gray-500 dark:text-gray-400">Area</span><p className="font-semibold text-gray-900 dark:text-white">{p.area} sq.ft</p></div>
                  <div><span className="text-gray-500 dark:text-gray-400">Year</span><p className="font-semibold text-gray-900 dark:text-white">{p.year}</p></div>
                  <div><span className="text-gray-500 dark:text-gray-400">Annual ROI</span><p className={`font-semibold ${Number(roi.annualROI) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{roi.annualROI}%</p></div>
                </div>
                {p.rentalIncome > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg mb-3 text-sm">
                    <span className="text-green-700 dark:text-green-300 font-medium">Rental Income: ₹{p.rentalIncome.toLocaleString()}/mo</span>
                  </div>
                )}
                {p.mortgage.remaining > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg mb-3 text-sm">
                    <span className="text-red-700 dark:text-red-300 font-medium">Mortgage: ₹{p.mortgage.remaining.toLocaleString()} remaining @ {p.mortgage.rate}%</span>
                  </div>
                )}
                {p.tax > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg mb-3 text-sm flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-yellow-600" />
                    <span className="text-yellow-700 dark:text-yellow-300 font-medium">Property Tax: ₹{p.tax.toLocaleString()}/yr</span>
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setSelectedProperty(p)} className="flex-1 text-center py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"><Eye className="w-3 h-3 inline mr-1" />Details</button>
                  <button onClick={() => handleEdit(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  <button onClick={() => toggleCompare(p.id)} className={`p-1.5 rounded-lg ${compareIds.includes(p.id) ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}><BarChart3 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Maintenance Log */}
      {selectedProperty && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-500" /> Maintenance Log — {selectedProperty.name}
            </h2>
            <button onClick={() => setSelectedProperty(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700"><th className="pb-2 pr-4">Date</th><th className="pb-2 pr-4">Description</th><th className="pb-2">Cost</th></tr></thead>
              <tbody>
                {selectedProperty.maintenanceLog.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-gray-400">No maintenance records</td></tr>}
                {selectedProperty.maintenanceLog.map((m, i) => (
                  <tr key={i} className="border-b dark:border-gray-700">
                    <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{m.date}</td>
                    <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{m.desc}</td>
                    <td className="py-2 text-gray-700 dark:text-gray-300">₹{m.cost.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 items-end flex-wrap">
            <input type="date" value={maintenanceForm.date} onChange={e => setMaintenanceForm(p => ({ ...p, date: e.target.value }))} className="px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 text-sm dark:text-white" />
            <input placeholder="Description" value={maintenanceForm.desc} onChange={e => setMaintenanceForm(p => ({ ...p, desc: e.target.value }))} className="px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 text-sm flex-1 dark:text-white" />
            <input type="number" placeholder="Cost" value={maintenanceForm.cost} onChange={e => setMaintenanceForm(p => ({ ...p, cost: e.target.value }))} className="px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 text-sm w-28 dark:text-white" />
            <button onClick={() => addMaintenance(selectedProperty.id)} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700">Add</button>
          </div>

          {/* ROI Calculator */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2"><Calculator className="w-4 h-4" /> ROI Calculator</h3>
            {(() => {
              const roi = calcROI(selectedProperty);
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div><span className="text-gray-500 dark:text-gray-400">Purchase Price</span><p className="font-semibold text-gray-900 dark:text-white">₹{(selectedProperty.appreciation[0]?.value || selectedProperty.value).toLocaleString()}</p></div>
                  <div><span className="text-gray-500 dark:text-gray-400">Current Value</span><p className="font-semibold text-gray-900 dark:text-white">₹{selectedProperty.value.toLocaleString()}</p></div>
                  <div><span className="text-gray-500 dark:text-gray-400">Total Gain</span><p className={`font-semibold ${roi.totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{roi.totalGain.toLocaleString()}</p></div>
                  <div><span className="text-gray-500 dark:text-gray-400">Annual ROI</span><p className={`font-semibold ${Number(roi.annualROI) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{roi.annualROI}%</p></div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Property Comparison Table */}
      {comparedProperties.length >= 2 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-500" /> Property Comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                  <th className="pb-2 pr-4">Attribute</th>
                  {comparedProperties.map(p => <th key={p.id} className="pb-2 pr-4">{p.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {['Value', 'Type', 'Area (sq.ft)', 'Year', 'Rental Income', 'Mortgage Remaining', 'Annual Tax', 'Annual ROI'].map(attr => (
                  <tr key={attr} className="border-b dark:border-gray-700">
                    <td className="py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">{attr}</td>
                    {comparedProperties.map(p => {
                      const roi = calcROI(p);
                      const val = attr === 'Value' ? `₹${p.value.toLocaleString()}` : attr === 'Type' ? p.type : attr === 'Area (sq.ft)' ? p.area : attr === 'Year' ? p.year : attr === 'Rental Income' ? `₹${p.rentalIncome.toLocaleString()}/mo` : attr === 'Mortgage Remaining' ? `₹${p.mortgage.remaining.toLocaleString()}` : attr === 'Annual Tax' ? `₹${p.tax.toLocaleString()}` : `${roi.annualROI}%`;
                      return <td key={p.id} className="py-2 pr-4 text-gray-700 dark:text-gray-300">{val}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => setCompareIds([])} className="mt-3 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">Clear comparison</button>
        </div>
      )}

      {/* Rental Income Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-green-500" /> Rental Income Tracker
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={properties.filter(p => p.rentalIncome > 0).map(p => ({ name: p.name, income: p.rentalIncome, annual: p.rentalIncome * 12 }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9ca3af" tickFormatter={v => `₹${v / 1000}K`} />
              <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
              <Bar dataKey="income" name="Monthly" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="annual" name="Annual" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Type Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Property Type Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={typeDistribution} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {typeDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mortgage Details */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Landmark className="w-5 h-5 text-red-500" /> Mortgage Details
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700"><th className="pb-2 pr-4">Property</th><th className="pb-2 pr-4">Loan Amount</th><th className="pb-2 pr-4">EMI</th><th className="pb-2 pr-4">Outstanding</th><th className="pb-2">Rate</th></tr></thead>
            <tbody>
              {properties.filter(p => p.mortgage.amount > 0).map(p => (
                <tr key={p.id} className="border-b dark:border-gray-700">
                  <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{p.name}</td>
                  <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">₹{p.mortgage.amount.toLocaleString()}</td>
                  <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">₹{p.mortgage.emi.toLocaleString()}</td>
                  <td className="py-2 pr-4 text-red-600 font-medium">₹{p.mortgage.remaining.toLocaleString()}</td>
                  <td className="py-2 text-gray-700 dark:text-gray-300">{p.mortgage.rate}%</td>
                </tr>
              ))}
              {properties.filter(p => p.mortgage.amount > 0).length === 0 && <tr><td colSpan={5} className="py-4 text-center text-gray-400">No active mortgages</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Property Tax Reminders */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-yellow-500" /> Property Tax Reminders
        </h2>
        <div className="space-y-3">
          {properties.filter(p => p.tax > 0).map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{p.address}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-yellow-700 dark:text-yellow-300">₹{p.tax.toLocaleString()}/yr</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Due: March 31</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Property Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{editId ? 'Edit Property' : 'Add Property'}</h2>
              <button onClick={() => { setShowModal(false); setEditId(null); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Property Name</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="e.g. 3BHK Apartment" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Value (₹)</label>
                <input type="number" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Area (sq.ft)</label>
                  <input type="number" value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Year</label>
                  <input type="number" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowModal(false); setEditId(null); }} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={handleSubmit} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editId ? 'Update' : 'Add Property'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </MainLayout>
  );
}
