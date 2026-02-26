import React, { useState, useEffect, useCallback } from 'react';
import {
  Scale, CreditCard, Home, Shield, TrendingUp, Star, ChevronDown,
  Plus, X, Check, AlertCircle, Save, BarChart3, RefreshCw, Zap,
  Award, ThumbsUp, Filter, Search, BookmarkPlus, Trash2
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  CartesianGrid
} from 'recharts';
import api from '../services/api';

const AnimatedValue = ({ value, duration = 800 }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = value / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(Math.round(start));
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <span>{display}</span>;
};

const PRODUCT_TYPES = [
  { id: 'credit-cards', label: 'Credit Cards', icon: CreditCard },
  { id: 'loans', label: 'Loans', icon: Home },
  { id: 'insurance', label: 'Insurance', icon: Shield },
  { id: 'investments', label: 'Investments', icon: TrendingUp },
];

const SAMPLE_PRODUCTS = {
  'credit-cards': [
    { id: 1, name: 'Platinum Rewards', provider: 'BankA', annualFee: 499, cashback: 2, apr: 36, rewardRate: 4, securityScore: 9, customerService: 8, benefits: 7, flexibility: 6, features: ['Lounge Access', 'Travel Insurance', '2% Cashback'] },
    { id: 2, name: 'Gold Elite', provider: 'BankB', annualFee: 999, cashback: 5, apr: 30, rewardRate: 8, securityScore: 8, customerService: 9, benefits: 9, flexibility: 7, features: ['5% Cashback', 'Priority Support', 'EMI Conversion'] },
    { id: 3, name: 'Basic Saver', provider: 'BankC', annualFee: 0, cashback: 1, apr: 42, rewardRate: 2, securityScore: 7, customerService: 6, benefits: 4, flexibility: 9, features: ['No Annual Fee', 'Fuel Surcharge Waiver'] },
  ],
  loans: [
    { id: 4, name: 'Home Plus', provider: 'LenderA', annualFee: 0, interestRate: 8.5, tenure: 30, rewardRate: 5, securityScore: 9, customerService: 8, benefits: 7, flexibility: 6, features: ['Low Interest', 'Flexible Tenure', 'No Prepayment Penalty'] },
    { id: 5, name: 'Quick Personal', provider: 'LenderB', annualFee: 999, interestRate: 12, tenure: 5, rewardRate: 3, securityScore: 7, customerService: 7, benefits: 5, flexibility: 8, features: ['Instant Approval', 'Minimal Docs'] },
  ],
  insurance: [
    { id: 6, name: 'LifeShield Pro', provider: 'InsureA', annualFee: 12000, coverage: 5000000, rewardRate: 7, securityScore: 9, customerService: 8, benefits: 8, flexibility: 5, features: ['Term Life', 'Critical Illness', 'Accidental Cover'] },
    { id: 7, name: 'Health Guard', provider: 'InsureB', annualFee: 8000, coverage: 1000000, rewardRate: 6, securityScore: 8, customerService: 9, benefits: 7, flexibility: 7, features: ['Cashless Hospitals', 'No Claim Bonus', 'Day Care Cover'] },
  ],
  investments: [
    { id: 8, name: 'Growth Fund', provider: 'AMC-A', annualFee: 150, returns3Y: 15, rewardRate: 8, securityScore: 6, customerService: 7, benefits: 8, flexibility: 7, features: ['High Returns', 'SIP Option', 'Tax Saving'] },
    { id: 9, name: 'Balanced Fund', provider: 'AMC-B', annualFee: 100, returns3Y: 10, rewardRate: 6, securityScore: 8, customerService: 8, benefits: 6, flexibility: 8, features: ['Low Risk', 'Stable Returns', 'Dividend Option'] },
  ],
};

const CRITERIA = [
  { key: 'rewardRate', label: 'Rewards' },
  { key: 'securityScore', label: 'Security' },
  { key: 'customerService', label: 'Service' },
  { key: 'benefits', label: 'Benefits' },
  { key: 'flexibility', label: 'Flexibility' },
];

export default function ComparisonTool() {
  const [loading, setLoading] = useState(true);
  const [productType, setProductType] = useState('credit-cards');
  const [selected, setSelected] = useState([]);
  const [weights, setWeights] = useState({ rewardRate: 5, securityScore: 5, customerService: 5, benefits: 5, flexibility: 5 });
  const [savedComparisons, setSavedComparisons] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightDiff, setHighlightDiff] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSelected(SAMPLE_PRODUCTS[productType]?.slice(0, 2).map(p => p.id) || []);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [productType]);

  const products = SAMPLE_PRODUCTS[productType] || [];
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const selectedProducts = products.filter(p => selected.includes(p.id));

  const computeScore = useCallback((product) => {
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    if (!totalWeight) return 0;
    return Math.round(
      CRITERIA.reduce((sum, c) => sum + (product[c.key] || 0) * weights[c.key], 0) / totalWeight * 10
    );
  }, [weights]);

  const radarData = CRITERIA.map(c => {
    const entry = { criteria: c.label };
    selectedProducts.forEach(p => { entry[p.name] = p[c.key] || 0; });
    return entry;
  });

  const barData = selectedProducts.map(p => ({ name: p.name, score: computeScore(p) }));
  const recommended = [...selectedProducts].sort((a, b) => computeScore(b) - computeScore(a))[0];

  const handleSave = () => {
    if (!saveName.trim()) return;
    setSavedComparisons(prev => [...prev, { id: Date.now(), name: saveName, type: productType, products: selectedProducts.map(p => p.name), date: new Date().toLocaleDateString() }]);
    setSaveName('');
    setShowSaveModal(false);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading comparison data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Scale className="w-8 h-8 text-blue-500" /> Comparison Tool
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Compare financial products side by side</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSaveModal(true)} className="flex items-center gap-2 bg-blue-600 text-white rounded-xl text-sm font-medium px-4 py-2 hover:bg-blue-700 transition-colors">
              <Save className="w-4 h-4" /> Save Comparison
            </button>
          </div>
        </div>

        {/* Product Type Selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 dashboard-grid">
          {PRODUCT_TYPES.map(type => {
            const Icon = type.icon;
            return (
              <button key={type.id} onClick={() => { setProductType(type.id); setSelected([]); setLoading(true); }}
                className={`p-4 rounded-2xl border transition-all text-left ${productType === type.id ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'}`}>
                <Icon className="w-6 h-6 mb-2" />
                <span className="font-medium text-sm">{type.label}</span>
              </button>
            );
          })}
        </div>

        {/* Product Selection */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Select Products to Compare</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="pl-9 pr-4 py-2 text-sm rounded-xl bg-slate-100 dark:bg-slate-700 border-0 focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProducts.map(product => {
              const isSelected = selected.includes(product.id);
              return (
                <button key={product.id} onClick={() => setSelected(prev => isSelected ? prev.filter(id => id !== product.id) : prev.length < 4 ? [...prev, product.id] : prev)}
                  className={`p-4 rounded-xl border text-left transition-all ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{product.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{product.provider}</p>
                    </div>
                    {isSelected && <Check className="w-5 h-5 text-blue-500" />}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {product.features.slice(0, 2).map((f, i) => (
                      <span key={i} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">{f}</span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {selectedProducts.length >= 2 && (
          <>
            {/* Side-by-Side Feature Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 overflow-x-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Feature Comparison</h2>
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <input type="checkbox" checked={highlightDiff} onChange={e => setHighlightDiff(e.target.checked)} className="rounded text-blue-600" />
                  Highlight Differences
                </label>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Feature</th>
                    {selectedProducts.map(p => (
                      <th key={p.id} className="text-center py-3 px-4 text-slate-900 dark:text-white font-semibold">{p.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {['annualFee', 'rewardRate', 'securityScore', 'customerService', 'benefits', 'flexibility'].map(key => {
                    const values = selectedProducts.map(p => p[key]);
                    const best = key === 'annualFee' ? Math.min(...values) : Math.max(...values);
                    const allSame = values.every(v => v === values[0]);
                    return (
                      <tr key={key} className="border-b border-slate-100 dark:border-slate-700/50">
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 capitalize">{key.replace(/([A-Z])/g, ' $1')}</td>
                        {selectedProducts.map(p => {
                          const isBest = p[key] === best && !allSame;
                          return (
                            <td key={p.id} className={`text-center py-3 px-4 font-medium ${highlightDiff && isBest ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' : 'text-slate-900 dark:text-white'}`}>
                              {key === 'annualFee' ? `₹${p[key]}` : `${p[key]}/10`}
                              {highlightDiff && isBest && <Award className="w-3 h-3 inline ml-1 text-green-500" />}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  <tr>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-semibold">Features</td>
                    {selectedProducts.map(p => (
                      <td key={p.id} className="py-3 px-4 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {p.features.map((f, i) => (
                            <span key={i} className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">{f}</span>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Weighted Criteria */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-500" /> Customize Weights
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {CRITERIA.map(c => (
                  <div key={c.key}>
                    <label className="text-sm text-slate-600 dark:text-slate-400 mb-1 block">{c.label}: <span className="font-bold text-slate-900 dark:text-white">{weights[c.key]}</span></label>
                    <input type="range" min="0" max="10" value={weights[c.key]} onChange={e => setWeights(prev => ({ ...prev, [c.key]: Number(e.target.value) }))}
                      className="w-full accent-blue-600" />
                  </div>
                ))}
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 dashboard-grid">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Radar Comparison</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#64748b40" />
                    <PolarAngleAxis dataKey="criteria" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    {selectedProducts.map((p, i) => (
                      <Radar key={p.id} name={p.name} dataKey={p.name} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} strokeWidth={2} />
                    ))}
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Overall Score</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#64748b20" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 12, color: '#fff' }} />
                    <Bar dataKey="score" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recommendation */}
            {recommended && (
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Zap className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1">Recommended: {recommended.name}</h3>
                    <p className="text-blue-100 text-sm mb-3">Based on your weighted criteria, this product scores the highest at <span className="font-bold text-white">{computeScore(recommended)}/100</span>.</p>
                    <div className="flex flex-wrap gap-2">
                      {recommended.features.map((f, i) => (
                        <span key={i} className="text-xs bg-white/20 px-3 py-1 rounded-full">{f}</span>
                      ))}
                    </div>
                  </div>
                  <ThumbsUp className="w-6 h-6 text-yellow-300" />
                </div>
              </div>
            )}
          </>
        )}

        {selectedProducts.length < 2 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 border border-slate-200 dark:border-slate-700 text-center">
            <Scale className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">Select at least 2 products above to start comparing</p>
          </div>
        )}

        {/* Saved Comparisons */}
        {savedComparisons.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <BookmarkPlus className="w-5 h-5 text-blue-500" /> Saved Comparisons
            </h2>
            <div className="space-y-3">
              {savedComparisons.map(comp => (
                <div key={comp.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{comp.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{comp.products.join(' vs ')} &bull; {comp.date}</p>
                  </div>
                  <button onClick={() => setSavedComparisons(prev => prev.filter(c => c.id !== comp.id))} className="p-2 text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Products Available', value: products.length, color: 'text-blue-600' },
            { label: 'Selected', value: selectedProducts.length, color: 'text-green-600' },
            { label: 'Saved Comparisons', value: savedComparisons.length, color: 'text-purple-600' },
            { label: 'Categories', value: PRODUCT_TYPES.length, color: 'text-amber-600' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Save Comparison</h3>
              <button onClick={() => setShowSaveModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="Comparison name..." className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500 mb-4" />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
