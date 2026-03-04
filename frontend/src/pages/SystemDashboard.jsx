// ============================================================================
// SystemDashboard.jsx — Admin system management dashboard
// ============================================================================
// Manages: scheduled jobs, system health, data export, cache, and services.
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import MainLayout from '../components/MainLayout';
import {
  Server, Clock, Play, Square, RefreshCw, CheckCircle2, XCircle,
  AlertTriangle, Activity, Database, Download, FileText, Trash2,
  Settings, Zap, Shield, BarChart3, Timer, ArrowRight
} from 'lucide-react';
import api from '../services/api';
import { PageTransition, FadeIn, StaggerChildren, CardSkeleton } from '../components/ui/AnimatedComponents';

// ─── Job Status Badge ───────────────────────────────────────────────
function JobStatusBadge({ status }) {
  const config = {
    idle:    { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400', label: 'Idle' },
    running: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', label: 'Running' },
    error:   { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', label: 'Error' },
    stopped: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', label: 'Stopped' },
  };
  const c = config[status] || config.idle;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>{c.label}</span>;
}

// ─── Job Card ───────────────────────────────────────────────────────
function JobCard({ name, job, onRun }) {
  const [running, setRunning] = useState(false);

  const handleRun = async () => {
    setRunning(true);
    try { await onRun(name); } finally { setRunning(false); }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{name}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">{job.description}</p>
          </div>
        </div>
        <JobStatusBadge status={job.status} />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400">Runs</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{job.runCount || 0}</p>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400">Errors</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{job.errors || 0}</p>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400">Interval</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{job.intervalHours}h</p>
        </div>
      </div>

      {job.lastRun && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
          Last run: {new Date(job.lastRun).toLocaleString()}
        </p>
      )}

      <button
        onClick={handleRun}
        disabled={running}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-medium transition-colors"
      >
        {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        {running ? 'Running...' : 'Run Now'}
      </button>
    </div>
  );
}

// ─── Export Card ─────────────────────────────────────────────────────
function ExportCard({ icon: Icon, title, description, onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 text-left hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-300 w-full"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
        {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
        {loading ? 'Exporting...' : 'Download CSV'}
      </div>
    </button>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function SystemDashboard() {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  const [jobsData, setJobsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState({});
  const [snackbar, setSnackbar] = useState(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await api.get('/jobs/status');
      setJobsData(res.data);
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const showSnackbar = (message, type = 'success') => {
    setSnackbar({ message, type });
    setTimeout(() => setSnackbar(null), 4000);
  };

  const handleRunJob = async (name) => {
    try {
      const res = await api.post(`/jobs/run/${name}`);
      showSnackbar(`Job "${name}" completed successfully`);
      fetchJobs();
    } catch (err) {
      showSnackbar(`Job "${name}" failed: ${err.response?.data?.message || err.message}`, 'error');
    }
  };

  const handleStartAll = async () => {
    try {
      await api.post('/jobs/start');
      showSnackbar('All scheduled jobs started');
      fetchJobs();
    } catch (err) {
      showSnackbar('Failed to start jobs', 'error');
    }
  };

  const handleStopAll = async () => {
    try {
      await api.post('/jobs/stop');
      showSnackbar('All scheduled jobs stopped');
      fetchJobs();
    } catch (err) {
      showSnackbar('Failed to stop jobs', 'error');
    }
  };

  const handleExport = async (type) => {
    setExportLoading(prev => ({ ...prev, [type]: true }));
    try {
      const res = await api.get(`/data-export/${type}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSnackbar(`${type} exported successfully`);
    } catch (err) {
      showSnackbar(`Export failed: ${err.message}`, 'error');
    } finally {
      setExportLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const jobs = jobsData?.jobs || {};
  const history = jobsData?.history || [];

  return (
    <MainLayout>
      <PageTransition>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <FadeIn>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Server className="w-7 h-7 text-indigo-500" />
                System Dashboard
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage scheduled jobs, exports, and system health</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleStartAll} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors">
                <Play className="w-4 h-4" /> Start All Jobs
              </button>
              <button onClick={handleStopAll} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors">
                <Square className="w-4 h-4" /> Stop All
              </button>
              <button onClick={fetchJobs} className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </FadeIn>

        {/* System Stats */}
        <FadeIn delay={100}>
          <StaggerChildren staggerDelay={80}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
                <Settings className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
                <p className="text-xl font-bold text-gray-900 dark:text-white">{Object.keys(jobs).length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Jobs</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
                <Activity className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                <p className="text-xl font-bold text-gray-900 dark:text-white">{Object.values(jobs).filter(j => j.status === 'idle').length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
                <CheckCircle2 className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <p className="text-xl font-bold text-gray-900 dark:text-white">{history.filter(h => h.status === 'success').length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Successful Runs</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
                <XCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                <p className="text-xl font-bold text-gray-900 dark:text-white">{history.filter(h => h.status === 'error').length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Failed Runs</p>
              </div>
            </div>
          </StaggerChildren>
        </FadeIn>

        {/* Scheduled Jobs */}
        <FadeIn delay={200}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Timer className="w-5 h-5 text-indigo-500" /> Scheduled Jobs
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(jobs).map(([name, job]) => (
                <JobCard key={name} name={name} job={job} onRun={handleRunJob} />
              ))}
            </div>
          )}
        </FadeIn>

        {/* Data Export */}
        <FadeIn delay={300}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-500" /> Data Export
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ExportCard icon={FileText} title="Transactions" description="Export all transactions to CSV" onClick={() => handleExport('transactions')} loading={exportLoading.transactions} />
            <ExportCard icon={BarChart3} title="Budgets" description="Export budget data" onClick={() => handleExport('budgets')} loading={exportLoading.budgets} />
            <ExportCard icon={Database} title="EMIs" description="Export EMI/loan schedules" onClick={() => handleExport('emis')} loading={exportLoading.emis} />
            <ExportCard icon={Zap} title="Investments" description="Export portfolio data" onClick={() => handleExport('investments')} loading={exportLoading.investments} />
            <ExportCard icon={Shield} title="Goals" description="Export financial goals" onClick={() => handleExport('goals')} loading={exportLoading.goals} />
            <ExportCard icon={BarChart3} title="Category Report" description="Spending by category report" onClick={() => handleExport('category-report')} loading={exportLoading['category-report']} />
          </div>
        </FadeIn>

        {/* Recent Job History */}
        {history.length > 0 && (
          <FadeIn delay={400}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-500" /> Recent Job History
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Job</th>
                      <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Status</th>
                      <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Duration</th>
                      <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {history.slice().reverse().slice(0, 15).map((h, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{h.name}</td>
                        <td className="px-4 py-3">
                          {h.status === 'success' ? (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Success</span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600 dark:text-red-400"><XCircle className="w-3.5 h-3.5" /> Error</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{h.duration}ms</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(h.startTime).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </FadeIn>
        )}

        {/* Snackbar */}
        {snackbar && (
          <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-white text-sm shadow-2xl flex items-center gap-2 animate-slide-in-right ${
            snackbar.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
          }`}>
            {snackbar.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {snackbar.message}
          </div>
        )}
      </div>
    </PageTransition>
    </MainLayout>
  );
}
