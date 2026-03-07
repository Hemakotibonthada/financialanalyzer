import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  Cloud, CloudOff, Upload, Download, RefreshCw, Trash2, Shield,
  HardDrive, Database, FileText, CreditCard, Wallet, Target, Clock,
  CheckCircle2, AlertCircle, XCircle, ChevronDown, ChevronUp,
  ArrowUpRight, BarChart3, Layers, Eye, Calendar, Info
} from 'lucide-react';
import MainLayout from '../components/MainLayout';
import api from '../services/api';
import { toast } from 'react-toastify';

const CloudBackup = () => {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;

  const [status, setStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backing, setBacking] = useState({});
  const [restoring, setRestoring] = useState(false);
  const [showBackups, setShowBackups] = useState(false);

  const p = {
    bg:        isBlack ? 'bg-black' : dk ? 'bg-slate-950' : 'bg-gray-50',
    card:      isBlack ? 'bg-zinc-900 border-zinc-800' : dk ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-gray-200/80',
    cardHover: isBlack ? 'hover:bg-zinc-800/80' : dk ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50',
    glass:     isBlack ? 'bg-zinc-900/80 backdrop-blur-xl border-zinc-800' : dk ? 'bg-slate-800/60 backdrop-blur-xl border-slate-700/40' : 'bg-white/80 backdrop-blur-xl border-gray-200/60',
    text:      isBlack ? 'text-zinc-100' : dk ? 'text-slate-100' : 'text-gray-900',
    textSub:   isBlack ? 'text-zinc-400' : dk ? 'text-slate-400' : 'text-gray-500',
    textMuted: isBlack ? 'text-zinc-500' : dk ? 'text-slate-500' : 'text-gray-400',
    border:    isBlack ? 'border-zinc-800' : dk ? 'border-slate-700/50' : 'border-gray-200/80',
    input:     isBlack ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : dk ? 'bg-slate-700/50 border-slate-600/50 text-slate-100' : 'bg-white border-gray-300 text-gray-900',
  };

  const fmtBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };
  const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, statsRes, backupsRes] = await Promise.allSettled([
        api.get('/gcp-storage/status'),
        api.get('/gcp-storage/stats'),
        api.get('/gcp-storage/backups'),
      ]);
      if (statusRes.status === 'fulfilled') setStatus(statusRes.value.data?.data);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data?.data);
      if (backupsRes.status === 'fulfilled') setBackups(backupsRes.value.data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const runBackup = async (type) => {
    setBacking(prev => ({ ...prev, [type]: true }));
    try {
      const endpoint = type === 'full' ? '/gcp-storage/backup/full'
        : type === 'accounts' ? '/gcp-storage/backup/accounts'
        : type === 'transactions' ? '/gcp-storage/backup/transactions'
        : '/gcp-storage/backup/profile';

      const res = await api.post(endpoint, type === 'transactions' ? {} : undefined);
      toast.success(res.data?.message || `${type} backup complete!`);
      fetchAll();
    } catch (err) {
      const msg = err.response?.data?.message || 'Backup failed';
      toast.error(msg);
    } finally {
      setBacking(prev => ({ ...prev, [type]: false }));
    }
  };

  const runRestore = async (fileName) => {
    if (!window.confirm('This will restore data from backup. Existing data will be merged. Continue?')) return;
    setRestoring(true);
    try {
      const res = await api.post('/gcp-storage/restore/full', { fileName });
      toast.success(res.data?.message || 'Restore complete!');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Restore failed');
    } finally {
      setRestoring(false);
    }
  };

  const deleteBackup = async (fileName) => {
    if (!window.confirm(`Delete backup "${fileName}"?`)) return;
    try {
      await api.delete(`/gcp-storage/backups/${fileName}`);
      toast.success('Backup deleted');
      fetchAll();
    } catch {
      toast.error('Delete failed');
    }
  };

  const isAvailable = status?.available === true;

  return (
    <MainLayout title="Cloud Backup">
      <div className={`min-h-screen ${p.bg} transition-colors duration-300`}>
        {/* Header */}
        <div className={`${p.glass} border-b ${p.border} px-4 sm:px-6 py-5`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                <Cloud className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`text-xl sm:text-2xl font-bold ${p.text} flex items-center gap-2`}>
                  GCP Cloud Backup
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white tracking-wide">GCP</span>
                </h1>
                <p className={`text-xs sm:text-sm ${p.textSub}`}>
                  Securely backup accounts, transactions & financial data to Google Cloud Storage
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchAll} className={`p-2.5 rounded-xl border ${p.border} ${p.card} ${p.cardHover} transition-all`}>
                <RefreshCw className={`w-4 h-4 ${p.textSub} ${loading ? 'animate-spin' : ''}`} />
              </button>
              {isAvailable && (
                <button onClick={() => runBackup('full')} disabled={backing.full}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium text-sm shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50">
                  {backing.full ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Full Backup
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-6 space-y-6">
          {/* Connection Status */}
          <div className={`rounded-2xl border ${p.border} ${p.card} p-6`}>
            <div className="flex items-center gap-4">
              {isAvailable ? (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-7 h-7 text-white" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg">
                  <CloudOff className="w-7 h-7 text-white" />
                </div>
              )}
              <div className="flex-1">
                <h2 className={`text-lg font-semibold ${p.text}`}>
                  {isAvailable ? 'Connected to Google Cloud Storage' : 'GCP Storage Not Configured'}
                </h2>
                <p className={`text-sm ${p.textSub}`}>
                  {isAvailable
                    ? `Bucket: ${status.bucket} · Project: ${status.projectId}`
                    : 'Set GCP_STORAGE_BUCKET and credentials in your .env file to enable cloud backups.'}
                </p>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${isAvailable
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20'}`}>
                {isAvailable ? '● Connected' : '○ Offline'}
              </div>
            </div>
          </div>

          {!isAvailable && (
            <div className={`rounded-2xl border ${p.border} ${p.card} p-6`}>
              <h3 className={`text-lg font-semibold ${p.text} mb-3 flex items-center gap-2`}>
                <Info className="w-5 h-5 text-blue-500" /> Setup Instructions
              </h3>
              <div className={`space-y-2 text-sm ${p.textSub}`}>
                <p>1. Create a GCP project at <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">console.cloud.google.com</a></p>
                <p>2. Enable the <strong>Cloud Storage API</strong></p>
                <p>3. Create a Storage bucket (e.g., <code className={`px-1.5 py-0.5 rounded ${dk ? 'bg-slate-700' : 'bg-gray-100'}`}>my-financial-data</code>)</p>
                <p>4. Create a Service Account with <strong>Storage Admin</strong> role</p>
                <p>5. Download the JSON key file and add to your <code className={`px-1.5 py-0.5 rounded ${dk ? 'bg-slate-700' : 'bg-gray-100'}`}>.env</code>:</p>
                <pre className={`mt-2 p-4 rounded-xl text-xs ${dk ? 'bg-slate-800' : 'bg-gray-100'} overflow-x-auto`}>
{`GCP_PROJECT_ID=your-project-id
GCP_STORAGE_BUCKET=your-bucket-name
GCP_KEY_FILE=./config/gcp-service-account.json`}
                </pre>
              </div>
            </div>
          )}

          {isAvailable && (
            <>
              {/* Storage Stats */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { label: 'Accounts', icon: CreditCard, count: stats.categories?.accounts?.fileCount || 0, size: stats.categories?.accounts?.totalSize || 0, color: 'from-indigo-500 to-blue-600' },
                    { label: 'Transactions', icon: BarChart3, count: stats.categories?.transactions?.fileCount || 0, size: stats.categories?.transactions?.totalSize || 0, color: 'from-emerald-500 to-teal-600' },
                    { label: 'Profiles', icon: Wallet, count: stats.categories?.profiles?.fileCount || 0, size: stats.categories?.profiles?.totalSize || 0, color: 'from-purple-500 to-pink-600' },
                    { label: 'Reports', icon: FileText, count: stats.categories?.reports?.fileCount || 0, size: stats.categories?.reports?.totalSize || 0, color: 'from-amber-500 to-orange-600' },
                    { label: 'Documents', icon: Layers, count: stats.categories?.documents?.fileCount || 0, size: stats.categories?.documents?.totalSize || 0, color: 'from-cyan-500 to-blue-600' },
                    { label: 'Backups', icon: HardDrive, count: stats.categories?.backups?.fileCount || 0, size: stats.categories?.backups?.totalSize || 0, color: 'from-rose-500 to-red-600' },
                  ].map((cat, i) => (
                    <div key={i} className={`rounded-2xl border ${p.border} ${p.card} p-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 group`}>
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center mb-3`}>
                        <cat.icon className="w-4.5 h-4.5 text-white" />
                      </div>
                      <p className={`text-2xl font-bold ${p.text}`}>{cat.count}</p>
                      <p className={`text-xs font-medium ${p.textSub}`}>{cat.label}</p>
                      <p className={`text-[10px] ${p.textMuted} mt-0.5`}>{fmtBytes(cat.size)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Total storage banner */}
              {stats && (
                <div className={`rounded-2xl border ${p.border} ${p.card} p-5 flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <Database className={`w-5 h-5 text-cyan-500`} />
                    <div>
                      <span className={`text-sm font-medium ${p.text}`}>Total Cloud Storage Used</span>
                      <span className={`text-sm ${p.textMuted} ml-2`}>{stats.totalFiles} files</span>
                    </div>
                  </div>
                  <span className={`text-lg font-bold ${p.text}`}>{fmtBytes(stats.totalSize)}</span>
                </div>
              )}

              {/* Backup Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { type: 'full', label: 'Full Backup', desc: 'All accounts, transactions, profile, EMIs, goals & budgets', icon: Cloud, grad: 'from-cyan-500 to-blue-600', shadow: 'shadow-cyan-500/20' },
                  { type: 'accounts', label: 'Accounts Only', desc: 'Bank accounts with balances and history', icon: CreditCard, grad: 'from-indigo-500 to-purple-600', shadow: 'shadow-indigo-500/20' },
                  { type: 'transactions', label: 'Transactions', desc: 'All transaction records and categories', icon: BarChart3, grad: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
                  { type: 'profile', label: 'Profile & Settings', desc: 'Financial profile, budgets, and preferences', icon: Wallet, grad: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20' },
                ].map((action, i) => (
                  <div key={i} className={`rounded-2xl border ${p.border} ${p.card} p-5 hover:shadow-lg ${action.shadow} transition-all duration-300 hover:-translate-y-1 group`}>
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${action.grad} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className={`text-base font-semibold ${p.text} mb-1`}>{action.label}</h3>
                    <p className={`text-xs ${p.textSub} mb-4 line-clamp-2`}>{action.desc}</p>
                    <button onClick={() => runBackup(action.type)} disabled={backing[action.type]}
                      className={`w-full py-2.5 rounded-xl bg-gradient-to-r ${action.grad} text-white font-medium text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2`}>
                      {backing[action.type] ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {backing[action.type] ? 'Backing up...' : 'Backup Now'}
                    </button>
                  </div>
                ))}
              </div>

              {/* Restore from Latest */}
              <div className={`rounded-2xl border ${p.border} ${p.card} p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Download className="w-5 h-5 text-green-500" />
                    <div>
                      <h3 className={`text-lg font-semibold ${p.text}`}>Restore from Backup</h3>
                      <p className={`text-sm ${p.textSub}`}>Restore your financial data from the latest cloud backup</p>
                    </div>
                  </div>
                  <button onClick={() => runRestore()} disabled={restoring}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2">
                    {restoring ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {restoring ? 'Restoring...' : 'Restore Latest'}
                  </button>
                </div>
                <div className={`p-3 rounded-xl ${dk ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'} border flex items-start gap-2`}>
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className={`text-xs ${dk ? 'text-amber-400' : 'text-amber-700'}`}>
                    Restore merges backup data with your existing data. Duplicate transactions will be skipped. Bank accounts are matched by account number.
                  </p>
                </div>
              </div>

              {/* Backup History */}
              <div className={`rounded-2xl border ${p.border} ${p.card} p-6`}>
                <button onClick={() => setShowBackups(!showBackups)}
                  className={`w-full flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-purple-500" />
                    <h3 className={`text-lg font-semibold ${p.text}`}>Backup History ({backups.length})</h3>
                  </div>
                  {showBackups ? <ChevronUp className={`w-5 h-5 ${p.textSub}`} /> : <ChevronDown className={`w-5 h-5 ${p.textSub}`} />}
                </button>
                {showBackups && (
                  <div className="mt-4 space-y-2">
                    {backups.length === 0 ? (
                      <p className={`text-sm ${p.textMuted} text-center py-6`}>No backups yet. Create your first backup above.</p>
                    ) : backups.map((b, i) => (
                      <div key={i} className={`flex items-center justify-between py-3 px-4 rounded-xl ${p.cardHover} transition-all`}>
                        <div className="flex items-center gap-3">
                          <HardDrive className={`w-4 h-4 ${p.textMuted}`} />
                          <div>
                            <p className={`text-sm font-medium ${p.text}`}>{b.name}</p>
                            <p className={`text-xs ${p.textMuted}`}>{fmtDate(b.createdAt)} · {fmtBytes(b.size)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => runRestore(b.name)} title="Restore this backup"
                            className="p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-500/10 text-green-500 transition-colors">
                            <Download className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteBackup(b.name)} title="Delete"
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Security Note */}
              <div className={`rounded-2xl border ${p.border} ${p.card} p-5`}>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className={`text-sm font-semibold ${p.text} mb-1`}>Security & Privacy</h4>
                    <ul className={`text-xs ${p.textSub} space-y-1`}>
                      <li>• Data is encrypted in transit (TLS) and at rest (AES-256) by Google Cloud</li>
                      <li>• Sensitive fields (PAN, tokens, passwords) are excluded from backups</li>
                      <li>• Backups are isolated per user — no cross-user access</li>
                      <li>• You can delete all cloud data at any time (GDPR compliant)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default CloudBackup;
