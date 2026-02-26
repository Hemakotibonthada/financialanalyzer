import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Camera, Upload, Image, FileText, Edit3, Trash2, Check, X, Save, Eye,
  RotateCcw, ZoomIn, Search, Filter, Calendar, Tag, Store, Plus, Download,
  ScanLine, CheckCircle2, AlertCircle, Loader2, Grid3X3, List, Clock
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import api from '../services/api';

const AnimatedValue = ({ end, prefix = '₹' }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start; const ref = { current: null };
    const animate = (ts) => { if (!start) start = ts; const p = Math.min((ts - start) / 1200, 1); setVal((1 - Math.pow(1 - p, 3)) * end); if (p < 1) ref.current = requestAnimationFrame(animate); };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [end]);
  return <span>{prefix}{Math.round(val).toLocaleString()}</span>;
};

const CATEGORIES = ['Food & Dining', 'Groceries', 'Shopping', 'Transport', 'Utilities', 'Healthcare', 'Entertainment', 'Other'];
const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#64748b'];

const MOCK_RECEIPTS = [
  { id: 1, vendor: 'BigBasket', amount: 2350, date: '2026-02-24', category: 'Groceries', status: 'verified', items: 12, thumbnail: null },
  { id: 2, vendor: 'Swiggy', amount: 580, date: '2026-02-23', category: 'Food & Dining', status: 'verified', items: 3, thumbnail: null },
  { id: 3, vendor: 'Amazon', amount: 4999, date: '2026-02-22', category: 'Shopping', status: 'verified', items: 2, thumbnail: null },
  { id: 4, vendor: 'Apollo Pharmacy', amount: 1200, date: '2026-02-20', category: 'Healthcare', status: 'pending', items: 5, thumbnail: null },
  { id: 5, vendor: 'Shell Petrol', amount: 3000, date: '2026-02-18', category: 'Transport', status: 'verified', items: 1, thumbnail: null },
  { id: 6, vendor: 'Reliance Fresh', amount: 1850, date: '2026-02-15', category: 'Groceries', status: 'verified', items: 8, thumbnail: null },
  { id: 7, vendor: 'BookMyShow', amount: 750, date: '2026-02-14', category: 'Entertainment', status: 'verified', items: 2, thumbnail: null },
  { id: 8, vendor: 'Electricity Board', amount: 2800, date: '2026-02-10', category: 'Utilities', status: 'verified', items: 1, thumbnail: null },
];

export default function ReceiptScanner() {
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedData, setScannedData] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [batchFiles, setBatchFiles] = useState([]);
  const [showPreview, setShowPreview] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/documents/scan');
      setReceipts(res.data?.receipts || MOCK_RECEIPTS);
    } catch {
      setReceipts(MOCK_RECEIPTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReceipts(); }, [fetchReceipts]);

  const stats = useMemo(() => {
    const total = receipts.reduce((s, r) => s + r.amount, 0);
    const verified = receipts.filter(r => r.status === 'verified').length;
    const pending = receipts.filter(r => r.status === 'pending').length;
    const categoryBreakdown = {};
    receipts.forEach(r => {
      if (!categoryBreakdown[r.category]) categoryBreakdown[r.category] = 0;
      categoryBreakdown[r.category] += r.amount;
    });
    const chartData = Object.entries(categoryBreakdown).map(([name, value], i) => ({
      name, value, color: CATEGORY_COLORS[CATEGORIES.indexOf(name)] || '#64748b'
    }));
    return { total, verified, pending, count: receipts.length, chartData };
  }, [receipts]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter(r => {
      if (filterCategory !== 'all' && r.category !== filterCategory) return false;
      if (searchQuery && !r.vendor.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [receipts, filterCategory, searchQuery]);

  const simulateScan = useCallback((fileName) => {
    setScanning(true);
    setScanProgress(0);
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setScanning(false);
          const mockResult = {
            vendor: ['BigBasket', 'DMart', 'Swiggy', 'Amazon', 'Flipkart'][Math.floor(Math.random() * 5)],
            amount: Math.floor(500 + Math.random() * 5000),
            date: new Date().toISOString().split('T')[0],
            category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)],
            items: Math.floor(1 + Math.random() * 15),
            confidence: Math.floor(85 + Math.random() * 15),
            fileName,
          };
          setScannedData(mockResult);
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 200);
  }, []);

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 1) {
      simulateScan(files[0].name);
    } else if (files.length > 1) {
      setBatchFiles(files.map(f => ({ name: f.name, status: 'pending' })));
      files.forEach((f, i) => {
        setTimeout(() => {
          setBatchFiles(prev => prev.map((bf, j) => j === i ? { ...bf, status: 'processing' } : bf));
          setTimeout(() => {
            setBatchFiles(prev => prev.map((bf, j) => j === i ? { ...bf, status: 'done' } : bf));
            const newReceipt = {
              id: Date.now() + i,
              vendor: ['Store A', 'Store B', 'Store C'][i % 3],
              amount: Math.floor(500 + Math.random() * 3000),
              date: new Date().toISOString().split('T')[0],
              category: CATEGORIES[Math.floor(Math.random() * 6)],
              status: 'pending',
              items: Math.floor(1 + Math.random() * 10),
            };
            setReceipts(prev => [...prev, newReceipt]);
          }, 2000 + i * 500);
        }, i * 2500);
      });
    }
  }, [simulateScan]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) simulateScan(files[0].name);
  }, [simulateScan]);

  const handleSaveScanned = useCallback(() => {
    if (!scannedData) return;
    const newReceipt = {
      id: Date.now(),
      vendor: scannedData.vendor,
      amount: scannedData.amount,
      date: scannedData.date,
      category: scannedData.category,
      status: 'verified',
      items: scannedData.items,
    };
    setReceipts(prev => [newReceipt, ...prev]);
    setScannedData(null);
  }, [scannedData]);

  const handleEdit = useCallback((receipt) => {
    setEditingReceipt({ ...receipt });
    setShowEditModal(true);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingReceipt) return;
    setReceipts(prev => prev.map(r => r.id === editingReceipt.id ? editingReceipt : r));
    setShowEditModal(false);
    setEditingReceipt(null);
  }, [editingReceipt]);

  const handleDelete = useCallback((id) => {
    setReceipts(prev => prev.filter(r => r.id !== id));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in-up">
          <div className="w-16 h-16 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 text-lg">Loading receipts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in-down">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl text-white shadow-lg shadow-cyan-600/30">
              <ScanLine className="w-6 h-6" />
            </div>
            Receipt Scanner
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Scan, extract & organize receipts</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => cameraInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            <Camera className="w-4 h-4" /> Camera
          </button>
          <button onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30">
            <Upload className="w-4 h-4" /> Upload Receipt
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*,.pdf" multiple className="hidden" onChange={handleFileSelect} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up">
        {[
          { label: 'Total Scanned', value: stats.total, icon: FileText, color: 'cyan', prefix: '₹' },
          { label: 'Receipts', value: stats.count, icon: Image, color: 'blue', prefix: '' },
          { label: 'Verified', value: stats.verified, icon: CheckCircle2, color: 'green', prefix: '' },
          { label: 'Pending Review', value: stats.pending, icon: AlertCircle, color: 'amber', prefix: '' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <div className={`p-2.5 rounded-xl bg-${stat.color}-100 dark:bg-${stat.color}-900/30 text-${stat.color}-600 dark:text-${stat.color}-400 w-fit mb-3`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white"><AnimatedValue end={stat.value} prefix={stat.prefix} /></div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Upload Zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 md:p-12 text-center transition-all animate-fade-in-up ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]' : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500'}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        {scanning ? (
          <div className="space-y-4">
            <div className="w-20 h-20 mx-auto relative">
              <ScanLine className="w-20 h-20 text-blue-500 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Scanning Receipt...</h3>
            <div className="max-w-xs mx-auto">
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-300" style={{ width: `${Math.min(scanProgress, 100)}%` }} />
              </div>
              <p className="text-sm text-slate-500 mt-2">{Math.min(Math.round(scanProgress), 100)}% — Extracting data with OCR</p>
            </div>
          </div>
        ) : scannedData ? (
          <div className="max-w-lg mx-auto space-y-4">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle2 className="w-8 h-8" />
              <h3 className="text-lg font-semibold">Scan Complete!</h3>
            </div>
            <p className="text-sm text-slate-500">Confidence: <span className="font-semibold text-green-600">{scannedData.confidence}%</span></p>
            <div className="grid grid-cols-2 gap-3 text-left">
              {[
                { label: 'Vendor', value: scannedData.vendor, icon: Store },
                { label: 'Amount', value: `₹${scannedData.amount.toLocaleString()}`, icon: Tag },
                { label: 'Date', value: scannedData.date, icon: Calendar },
                { label: 'Category', value: scannedData.category, icon: Filter },
              ].map((field, i) => (
                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <div className="text-xs text-slate-500 flex items-center gap-1 mb-1"><field.icon className="w-3 h-3" /> {field.label}</div>
                  <div className="font-semibold text-slate-900 dark:text-white text-sm">{field.value}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setScannedData(null)} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                <RotateCcw className="w-4 h-4 inline mr-1" /> Rescan
              </button>
              <button onClick={() => { setEditingReceipt({ ...scannedData, id: Date.now(), status: 'pending' }); setScannedData(null); setShowEditModal(true); }}
                className="px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl text-sm font-medium hover:bg-amber-200 transition-colors">
                <Edit3 className="w-4 h-4 inline mr-1" /> Edit
              </button>
              <button onClick={handleSaveScanned}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30">
                <Save className="w-4 h-4 inline mr-1" /> Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <Upload className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Drop receipt here or click to upload</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Supports JPG, PNG, PDF. Max 10MB per file.</p>
            <button onClick={() => fileInputRef.current?.click()}
              className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30">
              Browse Files
            </button>
          </>
        )}
      </div>

      {/* Batch Progress */}
      {batchFiles.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Batch Scanning</h3>
            <button onClick={() => setBatchFiles([])} className="text-sm text-slate-500 hover:text-slate-700">Clear</button>
          </div>
          <div className="space-y-2">
            {batchFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 truncate">{f.name}</span>
                {f.status === 'pending' && <Clock className="w-4 h-4 text-slate-400" />}
                {f.status === 'processing' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                {f.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Breakdown & Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Spending by Category</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                  {stats.chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} formatter={(v) => [`₹${v.toLocaleString()}`]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
            {stats.chartData.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-slate-600 dark:text-slate-400">{c.name}</span>
                </div>
                <span className="font-medium text-slate-900 dark:text-white">₹{c.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Receipts List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search receipts..."
                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" />
            </div>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="px-3 py-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 outline-none">
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
              {[{ v: 'grid', icon: Grid3X3 }, { v: 'list', icon: List }].map(({ v, icon: Icon }) => (
                <button key={v} onClick={() => setViewMode(v)}
                  className={`p-2 rounded-md transition-colors ${viewMode === v ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredReceipts.map(receipt => (
                <div key={receipt.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-lg">
                        {receipt.category === 'Groceries' ? '🛒' : receipt.category === 'Food & Dining' ? '🍔' : receipt.category === 'Shopping' ? '🛍️' : receipt.category === 'Transport' ? '🚗' : receipt.category === 'Healthcare' ? '💊' : receipt.category === 'Entertainment' ? '🎬' : receipt.category === 'Utilities' ? '⚡' : '📄'}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{receipt.vendor}</h4>
                        <p className="text-xs text-slate-500">{receipt.category}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${receipt.status === 'verified' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                      {receipt.status}
                    </span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-xl font-bold text-slate-900 dark:text-white">₹{receipt.amount.toLocaleString()}</div>
                      <div className="text-xs text-slate-500">{new Date(receipt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {receipt.items} items</div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(receipt)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(receipt.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredReceipts.map(receipt => (
                <div key={receipt.id} className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 flex items-center gap-3 hover:shadow-md transition-all">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-lg shrink-0">
                    {receipt.category === 'Groceries' ? '🛒' : receipt.category === 'Food & Dining' ? '🍔' : '📄'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 dark:text-white text-sm truncate">{receipt.vendor}</div>
                    <div className="text-xs text-slate-500">{receipt.category} • {new Date(receipt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${receipt.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{receipt.status}</span>
                  <span className="font-bold text-slate-900 dark:text-white shrink-0">₹{receipt.amount.toLocaleString()}</span>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => handleEdit(receipt)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(receipt.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredReceipts.length === 0 && (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
              <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No receipts found</p>
              <p className="text-sm mt-1">Upload a receipt to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowEditModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Edit Receipt</h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vendor</label>
                <input value={editingReceipt.vendor} onChange={e => setEditingReceipt(p => ({ ...p, vendor: e.target.value }))}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (₹)</label>
                  <input type="number" value={editingReceipt.amount} onChange={e => setEditingReceipt(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                  <input type="date" value={editingReceipt.date} onChange={e => setEditingReceipt(p => ({ ...p, date: e.target.value }))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                <select value={editingReceipt.category} onChange={e => setEditingReceipt(p => ({ ...p, category: e.target.value }))}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button onClick={handleSaveEdit}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
