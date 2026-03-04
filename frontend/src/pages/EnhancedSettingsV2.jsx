// ============================================================================
// Enterprise Settings V2 — Comprehensive User Settings & Preferences
// ============================================================================

import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import MainLayout from '../components/MainLayout';
import {
  Settings, User, Bell, Palette, Shield, Lock, Globe, Database,
  Moon, Sun, Monitor, Smartphone, Key, Eye, EyeOff, Save,
  RefreshCw, Download, Upload, Trash2, AlertTriangle, Check,
  ChevronRight, Mail, Fingerprint, Laptop, LogOut, BellOff,
  Languages, DollarSign, Calendar, Clock,
} from 'lucide-react';
import api from '../services/api';

// ============================================================================
// § 1 — Settings Tabs Configuration
// ============================================================================

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'preferences', label: 'Preferences', icon: Settings },
  { id: 'data', label: 'Data & Privacy', icon: Database },
];

// ============================================================================
// § 2 — Toggle Switch Component
// ============================================================================

function Toggle({ enabled, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
        {description && <div className="text-xs text-gray-500 mt-0.5">{description}</div>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
          enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
    </div>
  );
}

// ============================================================================
// § 3 — Profile Tab
// ============================================================================

function ProfileTab() {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    panNumber: '',
    dateOfBirth: '',
    occupation: '',
    annualIncome: '',
    city: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/profile', profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* noop */ }
    setSaving(false);
  };

  const Field = ({ label, field, type = 'text', placeholder }) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={profile[field]}
        onChange={e => setProfile(p => ({ ...p, [field]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
          bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600
          flex items-center justify-center text-white text-2xl font-bold shadow-lg">
          {(profile.name || 'U')[0].toUpperCase()}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{profile.name || 'User'}</h3>
          <p className="text-sm text-gray-500">{profile.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Full Name" field="name" placeholder="Enter your name" />
        <Field label="Email" field="email" type="email" placeholder="email@example.com" />
        <Field label="Phone" field="phone" type="tel" placeholder="+91 XXXXX XXXXX" />
        <Field label="PAN Number" field="panNumber" placeholder="ABCDE1234F" />
        <Field label="Date of Birth" field="dateOfBirth" type="date" />
        <Field label="Occupation" field="occupation" placeholder="Software Engineer" />
        <Field label="Annual Income (₹)" field="annualIncome" type="number" placeholder="1200000" />
        <Field label="City" field="city" placeholder="Mumbai" />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all
          ${saved ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}
          disabled:opacity-50`}
      >
        {saved ? <Check size={16} /> : saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
        {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Profile'}
      </button>
    </div>
  );
}

// ============================================================================
// § 4 — Appearance Tab
// ============================================================================

function AppearanceTab() {
  const { mode, setMode, accentColor, setAccentColor } = useContext(ThemeContext);

  const themes = [
    { id: 'light', label: 'Light', icon: Sun, preview: 'bg-white border-gray-200' },
    { id: 'dark', label: 'Dark', icon: Moon, preview: 'bg-gray-900 border-gray-700' },
    { id: 'black', label: 'Black', icon: Monitor, preview: 'bg-black border-gray-800' },
  ];

  const accents = [
    { id: 'blue', color: '#3b82f6', label: 'Blue' },
    { id: 'purple', color: '#8b5cf6', label: 'Purple' },
    { id: 'green', color: '#22c55e', label: 'Green' },
    { id: 'rose', color: '#f43f5e', label: 'Rose' },
    { id: 'amber', color: '#f59e0b', label: 'Amber' },
    { id: 'teal', color: '#14b8a6', label: 'Teal' },
    { id: 'indigo', color: '#6366f1', label: 'Indigo' },
    { id: 'sky', color: '#0ea5e9', label: 'Sky' },
  ];

  return (
    <div className="space-y-8">
      {/* Theme Mode */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Theme Mode</h3>
        <div className="grid grid-cols-3 gap-3">
          {themes.map(t => {
            const Icon = t.icon;
            const isActive = mode === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setMode(t.id)}
                className={`relative p-4 rounded-xl border-2 transition-all ${
                  isActive
                    ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className={`w-full h-16 rounded-lg ${t.preview} border mb-3`} />
                <div className="flex items-center justify-center gap-2">
                  <Icon size={14} />
                  <span className="text-sm font-medium">{t.label}</span>
                </div>
                {isActive && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check size={12} className="text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Accent Color */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Accent Color</h3>
        <div className="flex gap-3 flex-wrap">
          {accents.map(a => (
            <button
              key={a.id}
              onClick={() => setAccentColor(a.id)}
              className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 ${
                accentColor === a.id ? 'border-gray-900 dark:border-white scale-110 shadow-lg' : 'border-transparent'
              }`}
              style={{ backgroundColor: a.color }}
              title={a.label}
            >
              {accentColor === a.id && <Check size={16} className="text-white mx-auto" />}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Display</h3>
        <Toggle label="Compact Mode" description="Reduce spacing for more content" enabled={false} onChange={() => {}} />
        <Toggle label="Animations" description="Enable page transitions and micro-interactions" enabled={true} onChange={() => {}} />
        <Toggle label="Show Sidebar Labels" description="Display text labels in navigation" enabled={true} onChange={() => {}} />
      </div>
    </div>
  );
}

// ============================================================================
// § 5 — Notifications Tab
// ============================================================================

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    budgetAlerts: true,
    transactionAlerts: true,
    goalReminders: true,
    billReminders: true,
    weeklyReport: true,
    monthlyReport: true,
    securityAlerts: true,
    aiInsights: true,
    marketUpdates: false,
    emiReminders: true,
    pushNotifications: true,
    emailNotifications: true,
    quietHoursEnabled: false,
    quietStart: '22:00',
    quietEnd: '07:00',
  });

  const update = (key, val) => setPrefs(p => ({ ...p, [key]: val }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Channels</h3>
        <Toggle label="Push Notifications" description="Browser push notifications" enabled={prefs.pushNotifications} onChange={v => update('pushNotifications', v)} />
        <Toggle label="Email Notifications" description="Send alerts to your email" enabled={prefs.emailNotifications} onChange={v => update('emailNotifications', v)} />
      </div>

      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Alerts</h3>
        <Toggle label="Budget Alerts" description="When budget thresholds are crossed" enabled={prefs.budgetAlerts} onChange={v => update('budgetAlerts', v)} />
        <Toggle label="Transaction Alerts" description="Large or unusual transactions" enabled={prefs.transactionAlerts} onChange={v => update('transactionAlerts', v)} />
        <Toggle label="Goal Reminders" description="Goal progress and deadlines" enabled={prefs.goalReminders} onChange={v => update('goalReminders', v)} />
        <Toggle label="Bill Reminders" description="Upcoming bill payments" enabled={prefs.billReminders} onChange={v => update('billReminders', v)} />
        <Toggle label="EMI Reminders" description="EMI payment due dates" enabled={prefs.emiReminders} onChange={v => update('emiReminders', v)} />
        <Toggle label="Security Alerts" description="Login attempts and security events" enabled={prefs.securityAlerts} onChange={v => update('securityAlerts', v)} />
        <Toggle label="AI Insights" description="AI-powered financial tips" enabled={prefs.aiInsights} onChange={v => update('aiInsights', v)} />
        <Toggle label="Market Updates" description="Stock and mutual fund price changes" enabled={prefs.marketUpdates} onChange={v => update('marketUpdates', v)} />
      </div>

      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Reports</h3>
        <Toggle label="Weekly Summary" description="Every Monday morning" enabled={prefs.weeklyReport} onChange={v => update('weeklyReport', v)} />
        <Toggle label="Monthly Report" description="1st of every month" enabled={prefs.monthlyReport} onChange={v => update('monthlyReport', v)} />
      </div>

      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <Toggle label="Quiet Hours" description="Suppress non-critical notifications" enabled={prefs.quietHoursEnabled} onChange={v => update('quietHoursEnabled', v)} />
        {prefs.quietHoursEnabled && (
          <div className="flex gap-4 mt-2 pl-4">
            <div>
              <label className="text-xs text-gray-500">From</label>
              <input type="time" value={prefs.quietStart} onChange={e => update('quietStart', e.target.value)}
                className="block mt-1 px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">To</label>
              <input type="time" value={prefs.quietEnd} onChange={e => update('quietEnd', e.target.value)}
                className="block mt-1 px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// § 6 — Security Tab
// ============================================================================

function SecurityTab() {
  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [twoFA, setTwoFA] = useState(false);
  const [sessions, setSessions] = useState([
    { device: 'Chrome on Windows', location: 'Mumbai, India', current: true, lastActive: 'Now' },
    { device: 'Safari on iPhone', location: 'Mumbai, India', current: false, lastActive: '2 hours ago' },
  ]);

  return (
    <div className="space-y-6">
      {/* Password Change */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Change Password</h3>
        <div className="space-y-3 max-w-md">
          {['current', 'new', 'confirm'].map(field => (
            <div key={field} className="relative">
              <label className="block text-xs text-gray-500 mb-1 capitalize">{field === 'confirm' ? 'Confirm New' : field} Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwords[field]}
                  onChange={e => setPasswords(p => ({ ...p, [field]: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-200 dark:border-gray-700
                    bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ))}
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all">
            Update Password
          </button>
        </div>
      </div>

      {/* 2FA */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Two-Factor Authentication</h3>
        <Toggle
          label="Enable 2FA"
          description="Add an extra layer of security with TOTP"
          enabled={twoFA}
          onChange={setTwoFA}
        />
      </div>

      {/* Active Sessions */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Active Sessions</h3>
        <div className="space-y-2">
          {sessions.map((s, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Laptop size={18} className="text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{s.device}</div>
                  <div className="text-xs text-gray-500">{s.location} • {s.lastActive}</div>
                </div>
              </div>
              {s.current ? (
                <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                  Current
                </span>
              ) : (
                <button className="text-xs text-red-500 hover:text-red-700 font-medium">Revoke</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// § 7 — Preferences Tab
// ============================================================================

function PreferencesTab() {
  const [prefs, setPrefs] = useState({
    currency: 'INR',
    dateFormat: 'DD/MM/YYYY',
    language: 'en',
    financialYearStart: 'April',
    defaultView: 'dashboard',
    autoCategorizeTxn: true,
    showDecimalPlaces: false,
    weekStartsOn: 'Monday',
  });

  const update = (key, val) => setPrefs(p => ({ ...p, [key]: val }));

  const Select = ({ label, value, options, onChange }) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
          bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500">
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select label="Currency" value={prefs.currency} onChange={v => update('currency', v)}
          options={[
            { value: 'INR', label: '₹ Indian Rupee (INR)' },
            { value: 'USD', label: '$ US Dollar (USD)' },
            { value: 'EUR', label: '€ Euro (EUR)' },
            { value: 'GBP', label: '£ British Pound (GBP)' },
          ]}
        />
        <Select label="Date Format" value={prefs.dateFormat} onChange={v => update('dateFormat', v)}
          options={[
            { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
            { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
            { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
          ]}
        />
        <Select label="Language" value={prefs.language} onChange={v => update('language', v)}
          options={[
            { value: 'en', label: 'English' },
            { value: 'hi', label: 'हिन्दी (Hindi)' },
            { value: 'ta', label: 'தமிழ் (Tamil)' },
            { value: 'te', label: 'తెలుగు (Telugu)' },
          ]}
        />
        <Select label="Financial Year Start" value={prefs.financialYearStart} onChange={v => update('financialYearStart', v)}
          options={[
            { value: 'April', label: 'April (India)' },
            { value: 'January', label: 'January' },
            { value: 'July', label: 'July (Australia)' },
          ]}
        />
        <Select label="Default Landing Page" value={prefs.defaultView} onChange={v => update('defaultView', v)}
          options={[
            { value: 'dashboard', label: 'Dashboard' },
            { value: 'transactions', label: 'Transactions' },
            { value: 'budget', label: 'Budgets' },
            { value: 'investments', label: 'Investments' },
          ]}
        />
        <Select label="Week Starts On" value={prefs.weekStartsOn} onChange={v => update('weekStartsOn', v)}
          options={[
            { value: 'Monday', label: 'Monday' },
            { value: 'Sunday', label: 'Sunday' },
            { value: 'Saturday', label: 'Saturday' },
          ]}
        />
      </div>

      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <Toggle label="Auto-Categorize Transactions" description="AI-powered automatic categorization"
          enabled={prefs.autoCategorizeTxn} onChange={v => update('autoCategorizeTxn', v)} />
        <Toggle label="Show Decimal Places" description="Display amounts with decimal precision"
          enabled={prefs.showDecimalPlaces} onChange={v => update('showDecimalPlaces', v)} />
      </div>
    </div>
  );
}

// ============================================================================
// § 8 — Data & Privacy Tab
// ============================================================================

function DataTab() {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const res = await api.get(`/data-export/all?format=${format}`, { responseType: 'blob' });
      // Download logic
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-data-${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { /* noop */ }
    setExporting(false);
  };

  return (
    <div className="space-y-6">
      {/* Data Export */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Export Data</h3>
        <p className="text-xs text-gray-500 mb-3">Download all your financial data</p>
        <div className="flex gap-3">
          <button onClick={() => handleExport('csv')} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => handleExport('json')} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Download size={14} /> Export JSON
          </button>
        </div>
      </div>

      {/* Import */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Import Data</h3>
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
          <Upload size={24} className="mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">Drag & drop CSV or JSON file here</p>
          <p className="text-xs text-gray-400 mt-1">Supports bank statements, transaction exports</p>
          <input type="file" accept=".csv,.json" className="hidden" id="import-file" />
          <label htmlFor="import-file"
            className="inline-block mt-3 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300
              rounded-lg text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700">
            Browse Files
          </label>
        </div>
      </div>

      {/* Cache */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Cache & Storage</h3>
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <div className="text-sm font-medium">Local Cache</div>
            <div className="text-xs text-gray-500">~{(JSON.stringify(localStorage).length / 1024).toFixed(1)} KB used</div>
          </div>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="text-xs text-red-500 hover:text-red-700 font-medium">
            Clear Cache
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="border-t border-red-200 dark:border-red-900 pt-4">
        <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3">⚠️ Danger Zone</h3>
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">Delete All Data</div>
              <div className="text-xs text-gray-500">Permanently delete all transactions, budgets, and goals</div>
            </div>
            <button className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 flex items-center gap-1">
              <Trash2 size={12} /> Delete
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">Delete Account</div>
              <div className="text-xs text-gray-500">This action cannot be undone</div>
            </div>
            <button className="px-3 py-1.5 border border-red-600 text-red-600 text-xs rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// § 9 — Main Settings Page
// ============================================================================

export default function EnhancedSettingsV2() {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  const { theme } = useContext(ThemeContext);
  const [activeTab, setActiveTab] = useState('profile');

  const renderTab = () => {
    switch (activeTab) {
      case 'profile': return <ProfileTab />;
      case 'appearance': return <AppearanceTab />;
      case 'notifications': return <NotificationsTab />;
      case 'security': return <SecurityTab />;
      case 'preferences': return <PreferencesTab />;
      case 'data': return <DataTab />;
      default: return <ProfileTab />;
    }
  };

  const activeConfig = TABS.find(t => t.id === activeTab);

  return (
    <MainLayout>
      <div className="page-transition p-4 md:p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Settings className="text-gray-500" size={28} />
            Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your account, appearance, notifications, and privacy
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Tab Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-2">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                      transition-all mb-0.5 ${isActive
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  >
                    <Icon size={18} />
                    {tab.label}
                    {isActive && <ChevronRight size={14} className="ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                {activeConfig && <activeConfig.icon size={20} className="text-blue-500" />}
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {activeConfig?.label}
                </h2>
              </div>
              {renderTab()}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
