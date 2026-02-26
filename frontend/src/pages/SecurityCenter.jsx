import React, { useState, useEffect } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, Smartphone, Laptop, Monitor,
  MapPin, Clock, Trash2, LogOut, Key, Lock, Unlock, Eye, EyeOff,
  AlertTriangle, CheckCircle2, XCircle, Download, RefreshCw,
  Fingerprint, Mail, Globe, ChevronRight, ToggleLeft, ToggleRight,
  FileText, UserX, Settings, Activity, Info, X, Check
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip, PieChart, Pie, Cell
} from 'recharts';
import api from '../services/api';

const AnimatedValue = ({ value, suffix = '', duration = 1000 }) => {
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
  return <span>{display}{suffix}</span>;
};

const SECURITY_SCORE_DATA = [
  { subject: 'Password', score: 9 },
  { subject: '2FA', score: 7 },
  { subject: 'Sessions', score: 8 },
  { subject: 'Privacy', score: 6 },
  { subject: 'Encryption', score: 10 },
  { subject: 'Updates', score: 8 },
];

const LOGIN_HISTORY = [
  { id: 1, device: 'Chrome on Windows', icon: 'laptop', ip: '192.168.1.45', location: 'Mumbai, India', time: '2026-02-26T10:30:00', status: 'success', current: true },
  { id: 2, device: 'Safari on iPhone', icon: 'phone', ip: '103.52.14.89', location: 'Mumbai, India', time: '2026-02-25T18:45:00', status: 'success', current: false },
  { id: 3, device: 'Firefox on macOS', icon: 'monitor', ip: '45.67.89.12', location: 'Delhi, India', time: '2026-02-24T14:20:00', status: 'success', current: false },
  { id: 4, device: 'Unknown Browser', icon: 'monitor', ip: '78.90.12.34', location: 'Unknown', time: '2026-02-23T03:15:00', status: 'failed', current: false },
  { id: 5, device: 'Chrome on Android', icon: 'phone', ip: '192.168.1.50', location: 'Mumbai, India', time: '2026-02-22T09:00:00', status: 'success', current: false },
];

const ACTIVE_SESSIONS = [
  { id: 1, device: 'Chrome on Windows', location: 'Mumbai, India', lastActive: '2 minutes ago', current: true },
  { id: 2, device: 'Safari on iPhone', location: 'Mumbai, India', lastActive: '1 hour ago', current: false },
  { id: 3, device: 'Firefox on macOS', location: 'Delhi, India', lastActive: '2 days ago', current: false },
];

const SECURITY_EVENTS = [
  { id: 1, event: 'Password changed', time: '2026-02-20', type: 'info' },
  { id: 2, event: '2FA enabled for login', time: '2026-02-18', type: 'success' },
  { id: 3, event: 'Failed login attempt blocked', time: '2026-02-23', type: 'warning' },
  { id: 4, event: 'New device authorized', time: '2026-02-15', type: 'info' },
  { id: 5, event: 'Security review completed', time: '2026-02-10', type: 'success' },
  { id: 6, event: 'Suspicious IP blocked', time: '2026-02-08', type: 'warning' },
];

const TWO_FA_STEPS = [
  { id: 1, label: 'Authenticator App', done: true },
  { id: 2, label: 'Recovery Codes', done: true },
  { id: 3, label: 'SMS Backup', done: false },
  { id: 4, label: 'Biometric', done: false },
];

export default function SecurityCenter() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState(ACTIVE_SESSIONS);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(82);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [privacy, setPrivacy] = useState({
    dataSharing: false,
    analytics: true,
    thirdParty: false,
    marketingEmails: true,
  });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const securityScore = Math.round(SECURITY_SCORE_DATA.reduce((sum, d) => sum + d.score, 0) / SECURITY_SCORE_DATA.length * 10);
  const revokeSession = (id) => setSessions(prev => prev.filter(s => s.id !== id));

  const getDeviceIcon = (type) => {
    if (type === 'phone') return Smartphone;
    if (type === 'laptop') return Laptop;
    return Monitor;
  };

  const scoreColor = securityScore >= 80 ? 'text-green-500' : securityScore >= 60 ? 'text-yellow-500' : 'text-red-500';
  const scorePie = [{ name: 'Score', value: securityScore }, { name: 'Remaining', value: 100 - securityScore }];

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'sessions', label: 'Sessions' },
    { id: 'history', label: 'Login History' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'danger', label: 'Danger Zone' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading security data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-500" /> Security Center
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Monitor and manage your account security</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${securityScore >= 80 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
              <ShieldCheck className={`w-5 h-5 ${scoreColor}`} />
              <span className={`font-bold ${scoreColor}`}><AnimatedValue value={securityScore} suffix="/100" /></span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-slate-800 rounded-2xl p-1.5 border border-slate-200 dark:border-slate-700 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 dashboard-grid">
              {/* Security Score Gauge */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Security Score</h3>
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <ResponsiveContainer width={200} height={200}>
                      <PieChart>
                        <Pie data={scorePie} cx="50%" cy="50%" innerRadius={65} outerRadius={85} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                          <Cell fill={securityScore >= 80 ? '#10b981' : securityScore >= 60 ? '#f59e0b' : '#ef4444'} />
                          <Cell fill="#e2e8f0" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-4xl font-bold ${scoreColor}`}>{securityScore}</span>
                      <span className="text-xs text-slate-500">out of 100</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Radar */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Security Breakdown</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={SECURITY_SCORE_DATA}>
                    <PolarGrid stroke="#64748b40" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} />
                    <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 12, color: '#fff' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2FA Progress */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-blue-500" /> Two-Factor Authentication
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {TWO_FA_STEPS.map(step => (
                  <div key={step.id} className={`p-4 rounded-xl border-2 text-center ${step.done ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30'}`}>
                    {step.done ? <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" /> : <XCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />}
                    <p className={`text-sm font-medium ${step.done ? 'text-green-700 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>{step.label}</p>
                    <p className="text-xs mt-1">{step.done ? <span className="text-green-600">Enabled</span> : <button className="text-blue-600 hover:underline">Setup</button>}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Password Strength */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-500" /> Password Strength
              </h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${passwordStrength >= 80 ? 'bg-green-500' : passwordStrength >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${passwordStrength}%` }} />
                  </div>
                </div>
                <span className={`text-sm font-bold ${passwordStrength >= 80 ? 'text-green-500' : passwordStrength >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>{passwordStrength >= 80 ? 'Strong' : passwordStrength >= 60 ? 'Medium' : 'Weak'}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {[['Min 12 chars', true], ['Uppercase', true], ['Numbers', true], ['Special chars', false]].map(([label, ok]) => (
                  <div key={label} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    {ok ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-400" />}
                    {label}
                  </div>
                ))}
              </div>
              <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">Change Password</button>
            </div>

            {/* Data Encryption */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-green-500" /> Data Encryption Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Data at Rest', status: 'AES-256', ok: true },
                  { label: 'Data in Transit', status: 'TLS 1.3', ok: true },
                  { label: 'Backup Encryption', status: 'Enabled', ok: true },
                ].map(item => (
                  <div key={item.label} className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldCheck className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-green-800 dark:text-green-300">{item.label}</span>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400">{item.status}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Security Events */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" /> Recent Security Events
              </h3>
              <div className="space-y-3">
                {SECURITY_EVENTS.map(evt => (
                  <div key={evt.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    {evt.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" /> : evt.type === 'warning' ? <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" /> : <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />}
                    <div className="flex-1">
                      <p className="text-sm text-slate-900 dark:text-white">{evt.event}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{evt.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Active Sessions</h3>
              <button onClick={() => setSessions(prev => prev.filter(s => s.current))} className="text-sm text-red-500 hover:text-red-600 font-medium">Revoke All Others</button>
            </div>
            <div className="space-y-3">
              {sessions.map(session => (
                <div key={session.id} className={`flex items-center justify-between p-4 rounded-xl ${session.current ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : 'bg-slate-50 dark:bg-slate-700/50'}`}>
                  <div className="flex items-center gap-3">
                    <Laptop className="w-6 h-6 text-slate-500" />
                    <div>
                      <p className="font-medium text-sm text-slate-900 dark:text-white">{session.device} {session.current && <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full ml-2">Current</span>}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{session.location} • {session.lastActive}</p>
                    </div>
                  </div>
                  {!session.current && (
                    <button onClick={() => revokeSession(session.id)} className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 font-medium">
                      <LogOut className="w-4 h-4" /> Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Login History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Login History</h3>
            <div className="space-y-3">
              {LOGIN_HISTORY.map(login => {
                const DeviceIcon = getDeviceIcon(login.icon);
                return (
                  <div key={login.id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <DeviceIcon className="w-6 h-6 text-slate-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{login.device}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {login.location}</span>
                        <span>{login.ip}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(login.time).toLocaleString()}</span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${login.status === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>{login.status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Privacy Settings</h3>
            <div className="space-y-4">
              {[
                { key: 'dataSharing', label: 'Data Sharing', desc: 'Share anonymized data to improve services' },
                { key: 'analytics', label: 'Analytics', desc: 'Allow usage analytics collection' },
                { key: 'thirdParty', label: 'Third-Party Access', desc: 'Allow third-party app integrations' },
                { key: 'marketingEmails', label: 'Marketing Emails', desc: 'Receive promotional emails and offers' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                  </div>
                  <button onClick={() => setPrivacy(p => ({ ...p, [item.key]: !p[item.key] }))}
                    className={`w-11 h-6 rounded-full transition-colors relative ${privacy[item.key] ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${privacy[item.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Danger Zone */}
        {activeTab === 'danger' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Export Your Data</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Download a copy of all your financial data in JSON format.</p>
              <button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                <Download className="w-4 h-4" /> Export Data
              </button>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-red-200 dark:border-red-800">
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Delete Account</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
              <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors">
                <UserX className="w-4 h-4" /> Delete Account
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-red-200 dark:border-red-800">
            <div className="text-center mb-6">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Are you sure?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">This will permanently delete your account and all data. This cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600">Cancel</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">Delete Account</button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Export Data</h3>
              <button onClick={() => setShowExportModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              {['Transactions', 'Budgets', 'Goals', 'Settings', 'Login History'].map(item => (
                <label key={item} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                  <span className="text-sm text-slate-900 dark:text-white">{item}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowExportModal(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400">Cancel</button>
              <button onClick={() => setShowExportModal(false)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
