import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  FileText, Upload, FolderOpen, Search, Eye, Download, Trash2,
  Grid, List, Share2, Clock, AlertTriangle, Plus, X, Filter,
  File, FileImage, FilePlus, ExternalLink, Shield, Calendar,
  HardDrive, ChevronRight, Tag, Lock
} from 'lucide-react';
import api from '../services/api';
import MainLayout from '../components/MainLayout';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

const categoryList = [
  { name: 'Tax Returns', icon: FileText, color: '#3B82F6' },
  { name: 'Pay Slips', icon: File, color: '#10B981' },
  { name: 'Insurance', icon: Shield, color: '#EF4444' },
  { name: 'Investments', icon: File, color: '#F59E0B' },
  { name: 'Property', icon: File, color: '#8B5CF6' },
  { name: 'ID Documents', icon: Lock, color: '#EC4899' },
];

export default function FinancialDocuments() {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [shareLink, setShareLink] = useState(null);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadCategory, setUploadCategory] = useState('Tax Returns');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  const formatDate = (d) => {
    if (!d) return 'N/A';
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  useEffect(() => {
    const fetchDocuments = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/documents');
        const raw = res.data?.documents || res.data?.data || res.data || [];
        const docs = (Array.isArray(raw) ? raw : []).map(d => {
          // Map backend category to frontend display category
          const catMap = {
            'bank_statement': 'Tax Returns', 'tax_document': 'Tax Returns', 'tax': 'Tax Returns',
            'payslip': 'Pay Slips', 'salary': 'Pay Slips', 'payroll': 'Pay Slips',
            'insurance': 'Insurance',
            'investment': 'Investments', 'mutual_fund': 'Investments', 'demat': 'Investments',
            'credit_card': 'Tax Returns', 'receipt': 'Tax Returns',
            'loan': 'Property', 'real_estate': 'Property',
          };
          const sizeBytes = d.fileSize || d.size || 0;
          const sizeMB = typeof sizeBytes === 'number' ? sizeBytes / (1024 * 1024) : 0;
          return {
            ...d,
            id: d._id || d.id,
            name: d.originalFileName || d.fileName || d.name || 'Unnamed Document',
            category: catMap[d.category] || d.category || 'Tax Returns',
            size: sizeMB >= 1 ? `${sizeMB.toFixed(1)} MB` : `${(sizeBytes / 1024).toFixed(0)} KB`,
            sizeBytes,
            uploaded: formatDate(d.createdAt || d.uploaded || d.date),
            tags: d.tags || (d.metadata?.folderName ? [d.metadata.folderName] : []),
            type: d.fileType || d.type || 'pdf',
            source: d.source || 'upload',
          };
        });
        setDocuments(docs);
      } catch (err) {
        console.error('Error fetching documents:', err);
        setError('Failed to load documents.');
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, []);

  const categoryCounts = useMemo(() => {
    const counts = {};
    documents.forEach(d => {
      counts[d.category] = (counts[d.category] || 0) + 1;
    });
    return counts;
  }, [documents]);

  const filteredDocs = useMemo(() => {
    return documents.filter(d => {
      if (filterCategory !== 'All' && d.category !== filterCategory) return false;
      if (searchTerm && !d.name.toLowerCase().includes(searchTerm.toLowerCase()) && !(d.tags || []).some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))) return false;
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
  [documents]);

  const totalStorage = useMemo(() => {
    return documents.reduce((sum, d) => sum + (d.sizeBytes || 0), 0) / (1024 * 1024);
  }, [documents]);
  const maxStorage = 100;
  const storagePct = (totalStorage / maxStorage) * 100;

  const deleteDoc = async (id) => {
    try {
      await api.delete(`/documents/${id}`);
      setDocuments(documents.filter(d => d.id !== id && d._id !== id));
    } catch {
      setDocuments(documents.filter(d => d.id !== id && d._id !== id));
    }
  };
  const shareDoc = (doc) => setShareLink(`https://app.financialanalyzer.com/shared/${doc.id || doc._id}/${Date.now()}`);

  const handleUpload = async () => {
    if (!uploadFiles.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      uploadFiles.forEach(f => formData.append('documents', f));
      formData.append('category', uploadCategory);
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowUpload(false);
      setUploadFiles([]);
      // Re-fetch documents
      const res = await api.get('/documents');
      const raw = res.data?.documents || res.data?.data || res.data || [];
      const catMap = {
        'bank_statement': 'Tax Returns', 'tax_document': 'Tax Returns', 'tax': 'Tax Returns',
        'payslip': 'Pay Slips', 'salary': 'Pay Slips', 'payroll': 'Pay Slips',
        'insurance': 'Insurance', 'investment': 'Investments', 'mutual_fund': 'Investments',
        'demat': 'Investments', 'credit_card': 'Tax Returns', 'receipt': 'Tax Returns',
        'loan': 'Property', 'real_estate': 'Property',
      };
      const docs = (Array.isArray(raw) ? raw : []).map(d => {
        const sizeBytes = d.fileSize || d.size || 0;
        const sizeMB = typeof sizeBytes === 'number' ? sizeBytes / (1024 * 1024) : 0;
        return {
          ...d, id: d._id || d.id,
          name: d.originalFileName || d.fileName || d.name || 'Unnamed Document',
          category: catMap[d.category] || d.category || 'Tax Returns',
          size: sizeMB >= 1 ? `${sizeMB.toFixed(1)} MB` : `${(sizeBytes / 1024).toFixed(0)} KB`,
          sizeBytes, uploaded: formatDate(d.createdAt || d.uploaded || d.date),
          tags: d.tags || (d.metadata?.folderName ? [d.metadata.folderName] : []),
          type: d.fileType || d.type || 'pdf', source: d.source || 'upload',
        };
      });
      setDocuments(docs);
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const downloadDoc = async (doc) => {
    try {
      const res = await api.get(`/documents/${doc.id || doc._id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const getCategoryColor = (cat) => categoryList.find(c => c.name === cat)?.color || '#64748b';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={`${dk ? 'text-slate-400' : 'text-slate-600'} text-lg`}>Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout title="Financial Documents">
    <div className={`min-h-screen ${dk ? 'bg-slate-900' : 'bg-slate-50'} p-4 md:p-6 space-y-6`}>
      {error && (
        <div className={`${dk ? `bg-red-900/20` : `bg-red-50`} border ${dk ? 'border-red-800' : 'border-red-200'} rounded-xl p-4 ${dk ? `text-red-400` : `text-red-700`} text-sm`}>{error}</div>
      )}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${dk ? 'text-white' : 'text-slate-800'} flex items-center gap-2`}>
            <FolderOpen className="w-7 h-7 text-blue-600" /> Financial Documents
          </h1>
          <p className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'} mt-1`}>Securely store and manage all your financial documents</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 px-4 py-2 flex items-center gap-2 w-fit">
          <Upload className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Documents', value: documents.length, icon: FileText, color: 'text-blue-600', sub: `${categoryList.length} categories` },
          { label: 'Storage Used', value: `${Math.round(totalStorage)} MB`, icon: HardDrive, color: 'text-green-600', sub: `of ${maxStorage} MB` },
          { label: 'Expiring Soon', value: expiringDocs.length, icon: AlertTriangle, color: 'text-amber-600', sub: 'within 6 months' },
          { label: 'Recent Uploads', value: recentDocs.length, icon: Clock, color: 'text-purple-600', sub: 'last 5 documents' },
        ].map((c, i) => (
          <div key={i} className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 border ${dk ? 'border-slate-700' : 'border-slate-200'} shadow-sm`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'}`}>{c.label}</span>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className={`text-3xl font-bold ${dk ? 'text-white' : 'text-slate-800'}`}>{c.value}</p>
            <p className={`text-xs ${dk ? 'text-slate-400' : 'text-slate-500'} mt-1`}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Storage Bar */}
      <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 border ${dk ? 'border-slate-700' : 'border-slate-200'} shadow-sm`}>
        <div className="flex items-center justify-between mb-2">
          <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-slate-800'}`}>Storage Usage</h2>
          <span className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'}`}>{Math.round(totalStorage)} MB / {maxStorage} MB</span>
        </div>
        <div className={`w-full ${dk ? 'bg-slate-700' : 'bg-slate-200'} rounded-full h-3`}>
          <div className={`h-3 rounded-full transition-all ${storagePct > 80 ? 'bg-red-500' : storagePct > 50 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${storagePct}%` }} />
        </div>
        <div className="flex gap-4 mt-3 flex-wrap">
          {categoryList.map((c, i) => (
            <div key={i} className={`flex items-center gap-1.5 text-xs ${dk ? 'text-slate-300' : 'text-slate-600'}`}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
              {c.name}: {categoryCounts[c.name] || 0}
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
              className={`p-4 rounded-2xl border text-center transition-all ${filterCategory === cat.name ? `${dk ? 'border-blue-600 bg-blue-900/20' : 'border-blue-300 bg-blue-50'}` : `${dk ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`} shadow-sm`}>
              <div className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: cat.color + '20' }}>
                <Icon className="w-5 h-5" style={{ color: cat.color }} />
              </div>
              <p className={`text-xs font-medium ${dk ? 'text-white' : 'text-slate-800'}`}>{cat.name}</p>
              <p className={`text-xs ${dk ? 'text-slate-400' : 'text-slate-500'}`}>{categoryCounts[cat.name] || 0} files</p>
            </button>
          );
        })}
      </div>

      {/* Search, Filter, View Toggle */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search documents..." className={`pl-9 pr-3 py-2 text-sm rounded-xl border ${dk ? `border-slate-700` : `border-slate-200`} ${dk ? 'bg-slate-900' : 'bg-white'} ${dk ? `text-white` : `text-slate-800`} w-56`} />
          </div>
          <button onClick={() => setFilterCategory('All')}
            className={`px-3 py-2 rounded-xl text-xs font-medium ${filterCategory === `All` ? `${dk ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-700'}` : `${dk ? `bg-slate-700 text-slate-300` : 'bg-slate-100 text-slate-700'}`}`}>
            All Documents
          </button>
        </div>
        <div className={`flex gap-1 ${dk ? 'bg-slate-700' : 'bg-slate-100'} rounded-xl p-1`}>
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === `grid` ? `${dk ? 'bg-slate-600' : 'bg-white'} shadow-sm` : ``}`}>
            <Grid className={`w-4 h-4 ${dk ? 'text-slate-300' : 'text-slate-600'}`} />
          </button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === `list` ? `${dk ? 'bg-slate-600' : 'bg-white'} shadow-sm` : ``}`}>
            <List className={`w-4 h-4 ${dk ? 'text-slate-300' : 'text-slate-600'}`} />
          </button>
        </div>
      </div>

      {/* Document Grid/List */}
      {filteredDocs.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No documents found</p>
          <p className="text-sm mt-1">Upload documents to get started.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredDocs.map(doc => (
            <div key={doc.id || doc._id} className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-4 border ${dk ? 'border-slate-700' : 'border-slate-200'} shadow-sm hover:shadow-md transition-shadow`}>
              <div className={`w-full h-28 rounded-xl ${dk ? 'bg-slate-700' : 'bg-slate-100'} flex items-center justify-center mb-3`}>
                <FileText className="w-12 h-12" style={{ color: getCategoryColor(doc.category) }} />
              </div>
              <p className={`text-sm font-medium ${dk ? 'text-white' : 'text-slate-800'} truncate`} title={doc.name}>{doc.name}</p>
              <p className={`text-xs ${dk ? 'text-slate-400' : 'text-slate-500'} mt-1`}>{doc.size} • {doc.uploaded}</p>
              <div className="flex gap-1 mt-2 flex-wrap">
                {(doc.tags || []).slice(0, 2).map((t, i) => (
                  <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${dk ? 'bg-slate-700' : 'bg-slate-100'} ${dk ? 'text-slate-400' : 'text-slate-600'}`}>{t}</span>
                ))}
              </div>
              <div className={`flex gap-1 mt-3 pt-3 border-t ${dk ? 'border-slate-700' : 'border-slate-100'}`}>
                <button onClick={() => setPreviewDoc(doc)} className={`p-1.5 rounded-lg ${dk ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><Eye className="w-4 h-4 text-blue-500" /></button>
                <button onClick={() => downloadDoc(doc)} className={`p-1.5 rounded-lg ${dk ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><Download className="w-4 h-4 text-green-500" /></button>
                <button onClick={() => shareDoc(doc)} className={`p-1.5 rounded-lg ${dk ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><Share2 className="w-4 h-4 text-purple-500" /></button>
                <button onClick={() => deleteDoc(doc.id || doc._id)} className={`p-1.5 rounded-lg ${dk ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} ml-auto`}><Trash2 className="w-4 h-4 text-red-500" /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl border ${dk ? 'border-slate-700' : 'border-slate-200'} shadow-sm overflow-hidden`}>
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${dk ? 'border-slate-700' : 'border-slate-200'}`}>
                <th className={`text-left py-3 px-4 ${dk ? 'text-slate-400' : 'text-slate-500'} font-medium`}>Name</th>
                <th className={`text-left py-3 px-4 ${dk ? 'text-slate-400' : 'text-slate-500'} font-medium`}>Category</th>
                <th className={`text-left py-3 px-4 ${dk ? 'text-slate-400' : 'text-slate-500'} font-medium`}>Size</th>
                <th className={`text-left py-3 px-4 ${dk ? 'text-slate-400' : 'text-slate-500'} font-medium`}>Uploaded</th>
                <th className={`text-center py-3 px-4 ${dk ? 'text-slate-400' : 'text-slate-500'} font-medium`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map(doc => (
                <tr key={doc.id || doc._id} className={`border-b ${dk ? 'border-slate-700/50' : 'border-slate-100'} ${dk ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" style={{ color: getCategoryColor(doc.category) }} />
                      <span className={`font-medium ${dk ? 'text-white' : 'text-slate-800'}`}>{doc.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: getCategoryColor(doc.category) + '20', color: getCategoryColor(doc.category) }}>
                      {doc.category}
                    </span>
                  </td>
                  <td className={`py-3 px-4 ${dk ? 'text-slate-300' : 'text-slate-600'}`}>{doc.size}</td>
                  <td className={`py-3 px-4 ${dk ? 'text-slate-300' : 'text-slate-600'}`}>{doc.uploaded}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => setPreviewDoc(doc)} className={`p-1.5 rounded-lg ${dk ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><Eye className="w-4 h-4 text-blue-500" /></button>
                      <button onClick={() => downloadDoc(doc)} className={`p-1.5 rounded-lg ${dk ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><Download className="w-4 h-4 text-green-500" /></button>
                      <button onClick={() => shareDoc(doc)} className={`p-1.5 rounded-lg ${dk ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><Share2 className="w-4 h-4 text-purple-500" /></button>
                      <button onClick={() => deleteDoc(doc.id || doc._id)} className={`p-1.5 rounded-lg ${dk ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><Trash2 className="w-4 h-4 text-red-500" /></button>
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
        <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 border ${dk ? 'border-slate-700' : 'border-slate-200'} shadow-sm`}>
          <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-slate-800'} mb-4 flex items-center gap-2`}>
            <AlertTriangle className="w-5 h-5 text-amber-500" /> Expiry Tracking
          </h2>
          {expiringDocs.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No documents expiring soon.</p>
          ) : (
            <div className="space-y-3">
              {expiringDocs.map(doc => {
                const expDate = new Date(doc.expiry);
                const now = new Date();
                const daysLeft = Math.ceil((expDate - now) / 86400000);
                const isExpired = daysLeft < 0;
                return (
                  <div key={doc.id || doc._id} className={`flex items-center gap-3 p-3 rounded-xl border ${isExpired ? `${dk ? `bg-red-900/10 border-red-800` : `bg-red-50 border-red-100`}` : daysLeft < 90 ? `${dk ? 'bg-amber-900/10 border-amber-800' : 'bg-amber-50 border-amber-100'}` : `${dk ? `bg-slate-700/30 border-slate-700` : `bg-slate-50 border-slate-100`}`}`}>
                    <Calendar className={`w-5 h-5 ${isExpired ? 'text-red-500' : 'text-amber-500'}`} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${dk ? 'text-white' : 'text-slate-800'}`}>{doc.name}</p>
                      <p className={`text-xs ${dk ? 'text-slate-400' : 'text-slate-500'}`}>Expires: {doc.expiry}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${isExpired ? `${dk ? `bg-red-900/30 text-red-400` : `bg-red-100 text-red-700`}` : daysLeft < 90 ? `${dk ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'}` : `${dk ? `bg-green-900/30 text-green-400` : `bg-green-100 text-green-700`}`}`}>
                      {isExpired ? 'Expired' : `${daysLeft} days`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 border ${dk ? 'border-slate-700' : 'border-slate-200'} shadow-sm`}>
          <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-slate-800'} mb-4 flex items-center gap-2`}>
            <Clock className="w-5 h-5 text-blue-500" /> Recent Documents
          </h2>
          {recentDocs.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No recent documents.</p>
          ) : (
            <div className="space-y-3">
              {recentDocs.map(doc => (
                <div key={doc.id || doc._id} className={`flex items-center gap-3 p-3 rounded-xl ${dk ? `bg-slate-700/30` : `bg-slate-50`} border ${dk ? 'border-slate-700' : 'border-slate-100'} cursor-pointer ${dk ? `hover:bg-slate-700/50` : `hover:bg-slate-100`}`} onClick={() => setPreviewDoc(doc)}>
                  <FileText className="w-5 h-5" style={{ color: getCategoryColor(doc.category) }} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${dk ? 'text-white' : 'text-slate-800'} truncate`}>{doc.name}</p>
                    <p className={`text-xs ${dk ? 'text-slate-400' : 'text-slate-500'}`}>{doc.uploaded} • {doc.size}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 w-full max-w-lg border ${dk ? 'border-slate-700' : 'border-slate-200'} shadow-xl`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-slate-800'}`}>Upload Document</h3>
              <button onClick={() => { setShowUpload(false); setUploadFiles([]); }} className={`p-1 rounded-lg ${dk ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.csv,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png,.txt" className="hidden" onChange={e => setUploadFiles(Array.from(e.target.files || []))} />
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); setUploadFiles(Array.from(e.dataTransfer.files || [])); }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${dragOver ? `border-blue-500 ${dk ? 'bg-blue-900/20' : 'bg-blue-50'}` : `${dk ? 'border-slate-600' : 'border-slate-300'} hover:border-blue-400`}`}
            >
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              {uploadFiles.length > 0 ? (
                <>
                  <p className={`text-sm ${dk ? 'text-green-300' : 'text-green-700'} font-medium`}>{uploadFiles.length} file(s) selected</p>
                  <div className="mt-2 space-y-1">
                    {uploadFiles.map((f, i) => <p key={i} className={`text-xs ${dk ? 'text-slate-400' : 'text-slate-500'} truncate`}>{f.name} ({(f.size / 1024).toFixed(0)} KB)</p>)}
                  </div>
                </>
              ) : (
                <>
                  <p className={`text-sm ${dk ? 'text-slate-300' : 'text-slate-700'} font-medium`}>Drag & drop files here</p>
                  <p className={`text-xs ${dk ? 'text-slate-400' : 'text-slate-500'} mt-1`}>or click to browse</p>
                  <p className="text-xs text-slate-400 mt-3">PDF, CSV, XLSX, JPG, PNG up to 50MB</p>
                </>
              )}
            </div>
            <div className="mt-4">
              <label className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'} block mb-1`}>Category</label>
              <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)} className={`w-full rounded-xl border ${dk ? `border-slate-700` : `border-slate-200`} ${dk ? 'bg-slate-900' : 'bg-white'} ${dk ? `text-white` : `text-slate-800`} px-3 py-2 text-sm`}>
                {categoryList.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => { setShowUpload(false); setUploadFiles([]); }} className={`${dk ? 'bg-slate-700' : 'bg-slate-100'} ${dk ? 'text-slate-300' : 'text-slate-700'} rounded-xl text-sm px-4 py-2`}>Cancel</button>
              <button onClick={handleUpload} disabled={!uploadFiles.length || uploading} className={`bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed`}>{uploading ? 'Uploading...' : 'Upload'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 w-full max-w-2xl border ${dk ? 'border-slate-700' : 'border-slate-200'} shadow-xl`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-slate-800'}`}>{previewDoc.name}</h3>
              <button onClick={() => setPreviewDoc(null)} className={`p-1 rounded-lg ${dk ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className={`w-full h-64 rounded-xl ${dk ? 'bg-slate-700' : 'bg-slate-100'} flex items-center justify-center mb-4`}>
              <div className="text-center">
                <FileText className="w-16 h-16 text-slate-400 mx-auto mb-2" />
                <p className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'}`}>Document Preview</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className={`${dk ? 'text-slate-400' : 'text-slate-500'}`}>Category:</span> <span className={`${dk ? 'text-white' : 'text-slate-800'} font-medium ml-1`}>{previewDoc.category}</span></div>
              <div><span className={`${dk ? 'text-slate-400' : 'text-slate-500'}`}>Size:</span> <span className={`${dk ? 'text-white' : 'text-slate-800'} font-medium ml-1`}>{previewDoc.size}</span></div>
              <div><span className={`${dk ? 'text-slate-400' : 'text-slate-500'}`}>Uploaded:</span> <span className={`${dk ? 'text-white' : 'text-slate-800'} font-medium ml-1`}>{previewDoc.uploaded}</span></div>
              <div><span className={`${dk ? 'text-slate-400' : `text-slate-500`}`}>Expiry:</span> <span className={`${dk ? 'text-white' : 'text-slate-800'} font-medium ml-1`}>{previewDoc.expiry || `N/A`}</span></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => downloadDoc(previewDoc)} className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 px-4 py-2 flex items-center gap-2"><Download className="w-4 h-4" /> Download</button>
              <button onClick={() => shareDoc(previewDoc)} className={`${dk ? 'bg-slate-700' : 'bg-slate-100'} ${dk ? 'text-slate-300' : 'text-slate-700'} rounded-xl text-sm px-4 py-2 flex items-center gap-2`}><Share2 className="w-4 h-4" /> Share</button>
            </div>
          </div>
        </div>
      )}

      {/* Share Link Toast */}
      {shareLink && (
        <div className={`fixed bottom-6 right-6 z-50 ${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-4 border ${dk ? 'border-slate-700' : 'border-slate-200'} shadow-lg max-w-sm`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-sm font-medium ${dk ? 'text-white' : 'text-slate-800'}`}>Share Link Generated</p>
            <button onClick={() => setShareLink(null)} className="p-1"><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="flex gap-2">
            <input readOnly value={shareLink} className={`flex-1 text-xs rounded-lg border ${dk ? `border-slate-700` : `border-slate-200`} ${dk ? 'bg-slate-900' : 'bg-slate-50'} ${dk ? `text-slate-300` : `text-slate-600`} px-2 py-1.5`} />
            <button onClick={() => { navigator.clipboard?.writeText(shareLink); }} className="bg-blue-600 text-white rounded-lg text-xs font-medium px-3 py-1.5">Copy</button>
          </div>
        </div>
      )}
    </div>
    </MainLayout>
  );
}
