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
import MainLayout from '../components/MainLayout';

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

const CRITERIA = [
  { key: 'rewardRate', label: 'Rewards' },
  { key: 'securityScore', label: 'Security' },
  { key: 'customerService', label: 'Service' },
  { key: 'benefits', label: 'Benefits' },
  { key: 'flexibility', label: 'Flexibility' },
];

const EMPTY_PRODUCT = {
  name: '',
  provider: '',
  annualFee: 0,
  rewardRate: 5,
  securityScore: 5,
  customerService: 5,
  benefits: 5,
  flexibility: 5,
  features: '',
};

export default function ComparisonTool() {
  const [productType, setProductType] = useState('credit-cards');
  const [selected, setSelected] = useState([]);
  const [weights, setWeights] = useState({ rewardRate: 5, securityScore: 5, customerService: 5, benefits: 5, flexibility: 5 });
  const [savedComparisons, setSavedComparisons] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightDiff, setHighlightDiff] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ ...EMPTY_PRODUCT });

  // Load all products from localStorage
  const [allProducts, setAllProducts] = useState(() => {
    try {
      const stored = localStorage.getItem('fa_comparisons');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Persist products to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('fa_comparisons', JSON.stringify(allProducts));
  }, [allProducts]);

  // Clear selection when switching product types
  useEffect(() => {
    setSelected([]);
    setSearchQuery('');
  }, [productType]);

  const products = allProducts[productType] || [];
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const selectedProducts = products.filter(p => selected.includes(p.id));

  const addProduct = () => {
    if (!newProduct.name.trim() || !newProduct.provider.trim()) return;
    const product = {
      ...newProduct,
      id: Date.now(),
      annualFee: Number(newProduct.annualFee) || 0,
      rewardRate: Number(newProduct.rewardRate) || 5,
      securityScore: Number(newProduct.securityScore) || 5,
      customerService: Number(newProduct.customerService) || 5,
      benefits: Number(newProduct.benefits) || 5,
      flexibility: Number(newProduct.flexibility) || 5,
      features: newProduct.features
        ? newProduct.features.split(',').map(f => f.trim()).filter(Boolean)
        : [],
    };
    setAllProducts(prev => ({
      ...prev,
      [productType]: [...(prev[productType] || []), product],
    }));
    setNewProduct({ ...EMPTY_PRODUCT });
    setShowAddModal(false);
  };

  const removeProduct = (productId) => {
    setAllProducts(prev => ({
      ...prev,
      [productType]: (prev[productType] || []).filter(p => p.id !== productId),
    }));
    setSelected(prev => prev.filter(id => id !== productId));
  };

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
  const recommended = selectedProducts.length >= 2
    ? [...selectedProducts].sort((a, b) => computeScore(b) - computeScore(a))[0]
    : null;

  const handleSave = () => {
    if (!saveName.trim()) return;
    setSavedComparisons(prev => [...prev, {
      id: Date.now(),
      name: saveName,
      type: productType,
      products: selectedProducts.map(p => p.name),
      date: new Date().toLocaleDateString(),
    }]);
    setSaveName('');
    setShowSaveModal(false);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <MainLayout title="Comparison Tool">
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
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-green-600 text-white rounded-xl text-sm font-medium px-4 py-2 hover:bg-green-700 transition-colors">
              <Plus className="w-4 h-4" /> Add Product
            </button>
            <button onClick={() => setShowSaveModal(true)} disabled={selectedProducts.length < 2} className="flex items-center gap-2 bg-blue-600 text-white rounded-xl text-sm font-medium px-4 py-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <Save className="w-4 h-4" /> Save Comparison
            </button>
          </div>
        </div>

        {/* Product Type Selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 dashboard-grid">
          {PRODUCT_TYPES.map(type => {
            const Icon = type.icon;
            return (
              <button key={type.id} onClick={() => setProductType(type.id)}
                className={`p-4 rounded-2xl border transition-all text-left ${productType === type.id ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'}`}>
                <Icon className="w-6 h-6 mb-2" />
                <span className="font-medium text-sm">{type.label}</span>
                <span className={`block text-xs mt-0.5 ${productType === type.id ? 'text-blue-100' : 'text-slate-400'}`}>
                  {(allProducts[type.id] || []).length} products
                </span>
              </button>
            );
          })}
        </div>

        {/* Product Selection */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Select Products to Compare</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="pl-9 pr-4 py-2 text-sm rounded-xl bg-slate-100 dark:bg-slate-700 border-0 focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
              </div>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Scale className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400 mb-2">
                {products.length === 0 ? 'No products added yet for this category' : 'No products match your search'}
              </p>
              {products.length === 0 && (
                <>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">Click &quot;Add Product&quot; to start comparing</p>
                  <button onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl text-sm font-medium px-4 py-2 hover:bg-blue-700 transition-colors">
                    <Plus className="w-4 h-4" /> Add Product
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredProducts.map(product => {
                const isSelected = selected.includes(product.id);
                return (
                  <div key={product.id} className={`p-4 rounded-xl border text-left transition-all ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}>
                    <div className="flex items-start justify-between">
                      <button
                        onClick={() => setSelected(prev => isSelected ? prev.filter(id => id !== product.id) : prev.length < 4 ? [...prev, product.id] : prev)}
                        className="flex-1 text-left"
                      >
                        <p className="font-semibold text-slate-900 dark:text-white">{product.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{product.provider}</p>
                      </button>
                      <div className="flex items-center gap-1">
                        {isSelected && <Check className="w-5 h-5 text-blue-500" />}
                        <button onClick={() => removeProduct(product.id)} className="p-1 text-red-400 hover:text-red-600 transition-colors" title="Remove product">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(product.features || []).slice(0, 2).map((f, i) => (
                        <span key={i} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">{f}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                    const values = selectedProducts.map(p => p[key] ?? 0);
                    const best = key === 'annualFee' ? Math.min(...values) : Math.max(...values);
                    const allSame = values.every(v => v === values[0]);
                    return (
                      <tr key={key} className="border-b border-slate-100 dark:border-slate-700/50">
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 capitalize">{key.replace(/([A-Z])/g, ' $1')}</td>
                        {selectedProducts.map(p => {
                          const val = p[key] ?? 0;
                          const isBest = val === best && !allSame;
                          return (
                            <td key={p.id} className={`text-center py-3 px-4 font-medium ${highlightDiff && isBest ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' : 'text-slate-900 dark:text-white'}`}>
                              {key === 'annualFee' ? `₹${val}` : `${val}/10`}
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
                          {(p.features || []).map((f, i) => (
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
                      {(recommended.features || []).map((f, i) => (
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

        {selectedProducts.length < 2 && products.length > 0 && (
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 mt-6 max-w-7xl mx-auto">
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

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Add Product ({PRODUCT_TYPES.find(t => t.id === productType)?.label})
              </h3>
              <button onClick={() => { setShowAddModal(false); setNewProduct({ ...EMPTY_PRODUCT }); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Product Name *</label>
                <input value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Platinum Rewards Card" className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Provider *</label>
                <input value={newProduct.provider} onChange={e => setNewProduct(p => ({ ...p, provider: e.target.value }))} placeholder="e.g. HDFC Bank" className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Annual Fee (₹)</label>
                <input type="number" value={newProduct.annualFee} onChange={e => setNewProduct(p => ({ ...p, annualFee: e.target.value }))} placeholder="0" className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Features (comma-separated)</label>
                <input value={newProduct.features} onChange={e => setNewProduct(p => ({ ...p, features: e.target.value }))} placeholder="e.g. Lounge Access, 2% Cashback, Travel Insurance" className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-3">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Rate each criterion (0–10)</p>
                {CRITERIA.map(c => (
                  <div key={c.key} className="flex items-center gap-3 mb-2">
                    <label className="text-sm text-slate-600 dark:text-slate-400 w-24">{c.label}</label>
                    <input type="range" min="0" max="10" value={newProduct[c.key]} onChange={e => setNewProduct(p => ({ ...p, [c.key]: Number(e.target.value) }))} className="flex-1 accent-blue-600" />
                    <span className="text-sm font-bold text-slate-900 dark:text-white w-8 text-right">{newProduct[c.key]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => { setShowAddModal(false); setNewProduct({ ...EMPTY_PRODUCT }); }} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">Cancel</button>
              <button onClick={addProduct} disabled={!newProduct.name.trim() || !newProduct.provider.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">Add Product</button>
            </div>
          </div>
        </div>
      )}

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
    </MainLayout>
  );
}
