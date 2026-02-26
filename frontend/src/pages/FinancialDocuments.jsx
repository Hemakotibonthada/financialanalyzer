import React, { useState, useMemo } from 'react';
import {
  FileText, Upload, FolderOpen, Search, Eye, Download, Trash2,
  Grid, List, Share2, Clock, AlertTriangle, Plus, X, Filter,
  File, FileImage, FilePlus, ExternalLink, Shield, Calendar,
  HardDrive, ChevronRight, Tag, Lock
} from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

const categoryList = [
  { name: 'Tax Returns', icon: FileText, color: '#3B82F6', count: 5 },
  { name: 'Pay Slips', icon: File, color: '#10B981', count: 12 },
  { name: 'Insurance', icon: Shield, color: '#EF4444', count: 6 },
  { name: 'Investments', icon: File, color: '#F59E0B', count: 8 },
  { name: 'Property', icon: File, color: '#8B5CF6', count: 3 },
  { name: 'ID Documents', icon: Lock, color: '#EC4899', count: 4 },
];

const initialDocuments = [
  { id: 1, name: 'ITR_FY2025.pdf', category: 'Tax Returns', size: '2.4 MB', uploaded: '2025-07-15', expiry: null, tags: ['tax', 'ITR'] },
  { id: 2, name: 'ITR_FY2024.pdf', category: 'Tax Returns', size: '2.1 MB', uploaded: '2024-07-20', expiry: null, tags: ['tax', 'ITR'] },
  { id: 3, name: 'Salary_Jan2026.pdf', category: 'Pay Slips', size: '450 KB', uploaded: '2026-02-01', expiry: null, tags: ['salary'] },
  { id: 4, name: 'Salary_Dec2025.pdf', category: 'Pay Slips', size: '440 KB', uploaded: '2026-01-01', expiry: null, tags: ['salary'] },
  { id: 5, name: 'Health_Insurance_Policy.pdf', category: 'Insurance', size: '1.8 MB', uploaded: '2025-08-10', expiry: '2026-08-15', tags: ['health', 'insurance'] },
  { id: 6, name: 'Car_Insurance.pdf', category: 'Insurance', size: '1.2 MB', uploaded: '2025-11-15', expiry: '2026-11-20', tags: ['vehicle', 'insurance'] },
  { id: 7, name: 'Life_Insurance_LIC.pdf', category: 'Insurance', size: '3.1 MB', uploaded: '2025-03-01', expiry: '2045-03-01', tags: ['life', 'insurance'] },
  { id: 8, name: 'MF_Statement_Q4.pdf', category: 'Investments', size: '5.2 MB', uploaded: '2026-01-10', expiry: null, tags: ['mutual funds'] },
  { id: 9, name: 'Demat_Holdings.pdf', category: 'Investments', size: '1.5 MB', uploaded: '2026-02-15', expiry: null, tags: ['stocks', 'demat'] },
  { id: 10, name: 'PPF_Statement.pdf', category: 'Investments', size: '800 KB', uploaded: '2026-01-05', expiry: null, tags: ['PPF'] },
  { id: 11, name: 'Property_Deed.pdf', category: 'Property', size: '8.5 MB', uploaded: '2024-06-20', expiry: null, tags: ['property', 'deed'] },
  { id: 12, name: 'Sale_Agreement.pdf', category: 'Property', size: '4.2 MB', uploaded: '2024-06-15', expiry: null, tags: ['property'] },
  { id: 13, name: 'Passport.pdf', category: 'ID Documents', size: '3.2 MB', uploaded: '2023-05-10', expiry: '2033-05-09', tags: ['ID', 'passport'] },
  { id: 14, name: 'Aadhaar_Card.pdf', category: 'ID Documents', size: '1.1 MB', uploaded: '2023-01-15', expiry: null, tags: ['ID', 'aadhaar'] },
  { id: 15, name: 'PAN_Card.pdf', category: 'ID Documents', size: '600 KB', uploaded: '2023-01-15', expiry: null, tags: ['ID', 'PAN'] },
  { id: 16, name: 'Home_Insurance.pdf', category: 'Insurance', size: '1.5 MB', uploaded: '2025-01-01', expiry: '2025-12-31', tags: ['home', 'insurance'] },
];

const formatSize = (size) => size;

export default function FinancialDocuments() {
  const [documents, setDocuments] = useState(initialDocuments);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [shareLink, setShareLink] = useState(null);

  const filteredDocs = useMemo(() => {
    return documents.filter(d => {
      if (filterCategory !== 'All' && d.category !== filterCategory) return false;
      if (searchTerm && !d.name.toLowerCase().includes(searchTerm.toLowerCase()) && !d.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))) return false;
      return true;
    });
  }, [documents, filterCategory, searchTerm]);

  const expiringDocs = useMemo(() => {
    const now = new Date();
    const sixMonths = new Date(now.getTime() + 180 * 86400000);
    return documents.filter(d => d.expiry && new Date(d.expiry) <= sixMonths).sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
  }, [documents]);

  const recentDocs = useMemo(() =>
    [...documents].sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded)).slice(0, 5),
    [documents]
  );

  const totalStorage = 38; // MB
  const maxStorage = 100;
  const storagePct = (totalStorage / maxStorage) * 100;

  const deleteDoc = (id) => setDocuments(documents.filter(d => d.id !== id));
  const shareDoc = (doc) => setShareLink(`https://app.financialanalyzer.com/shared/${doc.id}/${Date.now()}`);

  const getCategoryColor = (cat) => categoryList.find(c => c.name === cat)?.color || '#64748b';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FolderOpen className="w-7 h-7 text-blue-600" /> Financial Documents
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Securely store and manage all your financial documents</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 px-4 py-2 flex items-center gap-2 w-fit">
          <Upload className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Documents', value: documents.length, icon: FileText, color: 'text-blue-600', sub: `${categoryList.length} categories` },
          { label: 'Storage Used', value: `${totalStorage} MB`, icon: HardDrive, color: 'text-green-600', sub: `of ${maxStorage} MB` },
          { label: 'Expiring Soon', value: expiringDocs.length, icon: AlertTriangle, color: 'text-amber-600', sub: 'within 6 months' },
          { label: 'Recent Uploads', value: recentDocs.length, icon: Clock, color: 'text-purple-600', sub: 'last 5 documents' },
        ].map((c, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">{c.label}</span>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{c.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Storage Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Storage Usage</h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">{totalStorage} MB / {maxStorage} MB</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
          <div className={`h-3 rounded-full transition-all ${storagePct > 80 ? 'bg-red-500' : storagePct > 50 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${storagePct}%` }} />
        </div>
        <div className="flex gap-4 mt-3 flex-wrap">
          {categoryList.map((c, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
              {c.name}: {c.count}
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {categoryList.map((cat, i) => {
          const Icon = cat.icon;
          return (
            <button key={i} onClick={() => setFilterCategory(cat.name)}
              className={`p-4 rounded-2xl border text-center transition-all ${filterCategory === cat.name ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'} shadow-sm`}>
              <div className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: cat.color + '20' }}>
                <Icon className="w-5 h-5" style={{ color: cat.color }} />
              </div>
              <p className="text-xs font-medium text-slate-800 dark:text-white">{cat.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{cat.count} files</p>
            </button>
          );
        })}
      </div>

      {/* Search, Filter, View Toggle */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search documents..." className="pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white w-56" />
          </div>
          <button onClick={() => setFilterCategory('All')}
            className={`px-3 py-2 rounded-xl text-xs font-medium ${filterCategory === 'All' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
            All Documents
          </button>
        </div>
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-1">
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 shadow-sm' : ''}`}>
            <Grid className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow-sm' : ''}`}>
            <List className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      </div>

      {/* Document Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredDocs.map(doc => (
            <div key={doc.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-full h-28 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
                <FileText className="w-12 h-12" style={{ color: getCategoryColor(doc.category) }} />
              </div>
              <p className="text-sm font-medium text-slate-800 dark:text-white truncate" title={doc.name}>{doc.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{doc.size} • {doc.uploaded}</p>
              <div className="flex gap-1 mt-2 flex-wrap">
                {doc.tags.slice(0, 2).map((t, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">{t}</span>
                ))}
              </div>
              <div className="flex gap-1 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button onClick={() => setPreviewDoc(doc)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Eye className="w-4 h-4 text-blue-500" /></button>
                <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Download className="w-4 h-4 text-green-500" /></button>
                <button onClick={() => shareDoc(doc)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Share2 className="w-4 h-4 text-purple-500" /></button>
                <button onClick={() => deleteDoc(doc.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 ml-auto"><Trash2 className="w-4 h-4 text-red-500" /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Name</th>
                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Category</th>
                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Size</th>
                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Uploaded</th>
                <th className="text-center py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map(doc => (
                <tr key={doc.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" style={{ color: getCategoryColor(doc.category) }} />
                      <span className="font-medium text-slate-800 dark:text-white">{doc.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: getCategoryColor(doc.category) + '20', color: getCategoryColor(doc.category) }}>
                      {doc.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{doc.size}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{doc.uploaded}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => setPreviewDoc(doc)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Eye className="w-4 h-4 text-blue-500" /></button>
                      <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Download className="w-4 h-4 text-green-500" /></button>
                      <button onClick={() => shareDoc(doc)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Share2 className="w-4 h-4 text-purple-500" /></button>
                      <button onClick={() => deleteDoc(doc.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Trash2 className="w-4 h-4 text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Expiry Tracking + Recent Docs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" /> Expiry Tracking
          </h2>
          <div className="space-y-3">
            {expiringDocs.map(doc => {
              const expDate = new Date(doc.expiry);
              const now = new Date();
              const daysLeft = Math.ceil((expDate - now) / 86400000);
              const isExpired = daysLeft < 0;
              return (
                <div key={doc.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isExpired ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800' : daysLeft < 90 ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800' : 'bg-slate-50 dark:bg-slate-700/30 border-slate-100 dark:border-slate-700'}`}>
                  <Calendar className={`w-5 h-5 ${isExpired ? 'text-red-500' : 'text-amber-500'}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-white">{doc.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Expires: {doc.expiry}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${isExpired ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : daysLeft < 90 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                    {isExpired ? 'Expired' : `${daysLeft} days`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" /> Recent Documents
          </h2>
          <div className="space-y-3">
            {recentDocs.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50" onClick={() => setPreviewDoc(doc)}>
                <FileText className="w-5 h-5" style={{ color: getCategoryColor(doc.category) }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{doc.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{doc.uploaded} • {doc.size}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-slate-200 dark:border-slate-700 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Upload Document</h3>
              <button onClick={() => setShowUpload(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); }}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-blue-400'}`}
            >
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">Drag & drop files here</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">or click to browse</p>
              <p className="text-xs text-slate-400 mt-3">PDF, JPG, PNG up to 10MB</p>
            </div>
            <div className="mt-4">
              <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Category</label>
              <select className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm">
                {categoryList.map(c => <option key={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setShowUpload(false)} className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm px-4 py-2">Cancel</button>
              <button className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 px-4 py-2">Upload</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-2xl border border-slate-200 dark:border-slate-700 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{previewDoc.name}</h3>
              <button onClick={() => setPreviewDoc(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="w-full h-64 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
              <div className="text-center">
                <FileText className="w-16 h-16 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Document Preview</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500 dark:text-slate-400">Category:</span> <span className="text-slate-800 dark:text-white font-medium ml-1">{previewDoc.category}</span></div>
              <div><span className="text-slate-500 dark:text-slate-400">Size:</span> <span className="text-slate-800 dark:text-white font-medium ml-1">{previewDoc.size}</span></div>
              <div><span className="text-slate-500 dark:text-slate-400">Uploaded:</span> <span className="text-slate-800 dark:text-white font-medium ml-1">{previewDoc.uploaded}</span></div>
              <div><span className="text-slate-500 dark:text-slate-400">Expiry:</span> <span className="text-slate-800 dark:text-white font-medium ml-1">{previewDoc.expiry || 'N/A'}</span></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 px-4 py-2 flex items-center gap-2"><Download className="w-4 h-4" /> Download</button>
              <button onClick={() => shareDoc(previewDoc)} className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm px-4 py-2 flex items-center gap-2"><Share2 className="w-4 h-4" /> Share</button>
            </div>
          </div>
        </div>
      )}

      {/* Share Link Toast */}
      {shareLink && (
        <div className="fixed bottom-6 right-6 z-50 bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-lg max-w-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-800 dark:text-white">Share Link Generated</p>
            <button onClick={() => setShareLink(null)} className="p-1"><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="flex gap-2">
            <input readOnly value={shareLink} className="flex-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 px-2 py-1.5" />
            <button onClick={() => { navigator.clipboard?.writeText(shareLink); }} className="bg-blue-600 text-white rounded-lg text-xs font-medium px-3 py-1.5">Copy</button>
          </div>
        </div>
      )}
    </div>
  );
}
