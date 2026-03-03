// ============================================================================
// ENTERPRISE SETTINGS PAGE — Theme, Security, Preferences & Account Management
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '../../components/Layout/MainLayout';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import {
  PageTransition, AnimatedCard, AnimatedTabs, GlassCard, Badge,
} from '../../components/enterprise/EnterpriseAnimationSystem';
import {
  Settings, Palette, Shield, Bell, User, Globe, Lock, Eye, EyeOff,
  Sun, Moon, Monitor, Smartphone, Download, Trash2, LogOut, Key,
  CheckCircle, AlertTriangle, Save, RotateCcw, Mail, Phone,
  Fingerprint, Database, Cpu, HardDrive, Wifi,
} from 'lucide-react';

const ACCENT_COLORS = [
  { name: 'Blue', value: 'blue', hex: '#3B82F6' },
  { name: 'Purple', value: 'purple', hex: '#8B5CF6' },
  { name: 'Green', value: 'green', hex: '#10B981' },
  { name: 'Rose', value: 'rose', hex: '#F43F5E' },
  { name: 'Amber', value: 'amber', hex: '#F59E0B' },
  { name: 'Teal', value: 'teal', hex: '#14B8A6' },
  { name: 'Indigo', value: 'indigo', hex: '#6366F1' },
  { name: 'Sky', value: 'sky', hex: '#0EA5E9' },
];

const THEME_MODES = [
  { name: 'Light', value: 'light', icon: Sun, desc: 'Bright & clean' },
  { name: 'Dark', value: 'dark', icon: Moon, desc: 'Easy on eyes' },
  { name: 'Black', value: 'black', icon: Monitor, desc: 'OLED optimized' },
];

function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-white">{label}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5.5 left-0.5' : 'left-0.5'}`}
          style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }} />
      </button>
    </div>
  );
}

function SettingSection({ icon: Icon, title, children }) {
  return (
    <AnimatedCard className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
          <Icon size={20} className="text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
        {children}
      </div>
    </AnimatedCard>
  );
}

// ============================================================================
// MAIN
// ============================================================================
export default function EnterpriseSettings() {
  const { theme, setTheme, accent, setAccent } = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── Preferences State ──
  const [preferences, setPreferences] = useState({
    currency: 'INR',
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    notifications: { email: true, push: true, sms: false, weeklyReport: true, budgetAlerts: true, goalReminders: true, anomalyAlerts: true },
    privacy: { showProfile: true, shareData: false, analytics: true },
    security: { twoFactor: false, biometric: false, sessionTimeout: 30 },
    display: { compactMode: false, animations: true, reducedMotion: false, chartAnimations: true },
  });

  // ── Profile State ──
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', occupation: '', monthlyIncome: '' });

  useEffect(() => {
    // Load saved preferences
    try {
      const saved = localStorage.getItem('enterprise_preferences');
      if (saved) setPreferences(prev => ({ ...prev, ...JSON.parse(saved) }));

      const savedProfile = localStorage.getItem('enterprise_profile');
      if (savedProfile) setProfile(prev => ({ ...prev, ...JSON.parse(savedProfile) }));
    } catch {}

    // Try loading from API
    api.get('/profile').then(res => {
      if (res?.data) {
        setProfile(prev => ({
          ...prev,
          name: res.data.name || res.data.displayName || prev.name,
          email: res.data.email || prev.email,
          phone: res.data.phone || prev.phone,
        }));
      }
    }).catch(() => {});
  }, []);

  const updatePreference = useCallback((path, value) => {
    setPreferences(prev => {
      const updated = { ...prev };
      const keys = path.split('.');
      let obj = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] };
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem('enterprise_preferences', JSON.stringify(preferences));
      localStorage.setItem('enterprise_profile', JSON.stringify(profile));
      await api.put('/profile', profile).catch(() => {});
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const res = await api.get('/data-export/transactions?format=json');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'financial-data-export.json';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export feature requires backend connection');
    }
  };

  const tabs = ['Appearance', 'Notifications', 'Security', 'Account', 'Data'];

  return (
    <MainLayout title="Settings" subtitle="Customize Your Experience">
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-6">

          {/* ── Header ── */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage your preferences and account</p>
            </div>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium">
              {saved ? <CheckCircle size={16} /> : <Save size={16} />}
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>

          <AnimatedTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

          {/* ── Appearance Tab ── */}
          {activeTab === 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Theme Mode */}
              <SettingSection icon={Palette} title="Theme Mode">
                <div className="grid grid-cols-3 gap-3 py-3">
                  {THEME_MODES.map(mode => {
                    const Icon = mode.icon;
                    const isActive = theme === mode.value;
                    return (
                      <button key={mode.value} onClick={() => setTheme(mode.value)}
                        className={`p-4 rounded-xl border-2 transition-all text-center ${
                          isActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}>
                        <Icon size={24} className={isActive ? 'text-blue-600 mx-auto' : 'text-gray-400 mx-auto'} />
                        <p className={`text-sm font-medium mt-2 ${isActive ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'}`}>{mode.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{mode.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </SettingSection>

              {/* Accent Color */}
              <SettingSection icon={Palette} title="Accent Color">
                <div className="grid grid-cols-4 gap-3 py-3">
                  {ACCENT_COLORS.map(color => (
                    <button key={color.value} onClick={() => setAccent(color.value)}
                      className={`relative p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        accent === color.value ? 'border-current shadow-md' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`} style={accent === color.value ? { borderColor: color.hex } : {}}>
                      <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: color.hex }} />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{color.name}</span>
                      {accent === color.value && (
                        <div className="absolute top-1 right-1">
                          <CheckCircle size={14} style={{ color: color.hex }} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </SettingSection>

              {/* Display Preferences */}
              <SettingSection icon={Eye} title="Display Preferences">
                <Toggle label="Animations" description="Enable smooth page transitions and micro-animations"
                  checked={preferences.display.animations} onChange={v => updatePreference('display.animations', v)} />
                <Toggle label="Reduced Motion" description="Minimize motion for accessibility"
                  checked={preferences.display.reducedMotion} onChange={v => updatePreference('display.reducedMotion', v)} />
                <Toggle label="Chart Animations" description="Animate chart data transitions"
                  checked={preferences.display.chartAnimations} onChange={v => updatePreference('display.chartAnimations', v)} />
                <Toggle label="Compact Mode" description="Reduce spacing for denser information display"
                  checked={preferences.display.compactMode} onChange={v => updatePreference('display.compactMode', v)} />
              </SettingSection>

              {/* Regional Preferences */}
              <SettingSection icon={Globe} title="Regional Settings">
                <div className="py-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
                  <select value={preferences.currency} onChange={e => updatePreference('currency', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-2.5 text-sm">
                    <option value="INR">₹ INR — Indian Rupee</option>
                    <option value="USD">$ USD — US Dollar</option>
                    <option value="EUR">€ EUR — Euro</option>
                    <option value="GBP">£ GBP — British Pound</option>
                  </select>
                </div>
                <div className="py-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Format</label>
                  <select value={preferences.dateFormat} onChange={e => updatePreference('dateFormat', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-2.5 text-sm">
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
              </SettingSection>
            </div>
          )}

          {/* ── Notifications Tab ── */}
          {activeTab === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SettingSection icon={Bell} title="Notification Channels">
                <Toggle label="Email Notifications" description="Receive alerts and reports via email"
                  checked={preferences.notifications.email} onChange={v => updatePreference('notifications.email', v)} />
                <Toggle label="Push Notifications" description="Browser push notifications for real-time alerts"
                  checked={preferences.notifications.push} onChange={v => updatePreference('notifications.push', v)} />
                <Toggle label="SMS Alerts" description="Critical alerts via SMS (requires phone number)"
                  checked={preferences.notifications.sms} onChange={v => updatePreference('notifications.sms', v)} />
              </SettingSection>

              <SettingSection icon={Bell} title="Alert Types">
                <Toggle label="Weekly Financial Report" description="Summary of income, expenses, and savings"
                  checked={preferences.notifications.weeklyReport} onChange={v => updatePreference('notifications.weeklyReport', v)} />
                <Toggle label="Budget Alerts" description="When spending approaches or exceeds budget limits"
                  checked={preferences.notifications.budgetAlerts} onChange={v => updatePreference('notifications.budgetAlerts', v)} />
                <Toggle label="Goal Reminders" description="Progress updates and deadline reminders"
                  checked={preferences.notifications.goalReminders} onChange={v => updatePreference('notifications.goalReminders', v)} />
                <Toggle label="Anomaly Detection" description="AI-detected unusual spending patterns"
                  checked={preferences.notifications.anomalyAlerts} onChange={v => updatePreference('notifications.anomalyAlerts', v)} />
              </SettingSection>
            </div>
          )}

          {/* ── Security Tab ── */}
          {activeTab === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SettingSection icon={Shield} title="Authentication">
                <Toggle label="Two-Factor Authentication" description="Add an extra layer of security with TOTP"
                  checked={preferences.security.twoFactor} onChange={v => updatePreference('security.twoFactor', v)} />
                <Toggle label="Biometric Login" description="Use fingerprint or face recognition"
                  checked={preferences.security.biometric} onChange={v => updatePreference('security.biometric', v)} />
                <div className="py-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Session Timeout (minutes)</label>
                  <select value={preferences.security.sessionTimeout}
                    onChange={e => updatePreference('security.sessionTimeout', Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-2.5 text-sm">
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                    <option value={480}>8 hours</option>
                  </select>
                </div>
              </SettingSection>

              <SettingSection icon={Lock} title="Password & API Keys">
                <div className="py-3">
                  <button className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key size={16} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Change Password</span>
                      </div>
                      <span className="text-xs text-gray-400">Last changed: 30 days ago</span>
                    </div>
                  </button>
                </div>
                <div className="py-3">
                  <button className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Fingerprint size={16} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Manage API Keys</span>
                      </div>
                      <Badge variant="info">2 active</Badge>
                    </div>
                  </button>
                </div>
              </SettingSection>

              <SettingSection icon={Eye} title="Privacy">
                <Toggle label="Public Profile" description="Allow others to see your financial achievements"
                  checked={preferences.privacy.showProfile} onChange={v => updatePreference('privacy.showProfile', v)} />
                <Toggle label="Data Sharing" description="Share anonymized data for community insights"
                  checked={preferences.privacy.shareData} onChange={v => updatePreference('privacy.shareData', v)} />
                <Toggle label="Usage Analytics" description="Help improve the app with anonymous usage data"
                  checked={preferences.privacy.analytics} onChange={v => updatePreference('privacy.analytics', v)} />
              </SettingSection>
            </div>
          )}

          {/* ── Account Tab ── */}
          {activeTab === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SettingSection icon={User} title="Profile Information">
                {[
                  { key: 'name', label: 'Full Name', type: 'text', icon: User },
                  { key: 'email', label: 'Email Address', type: 'email', icon: Mail },
                  { key: 'phone', label: 'Phone Number', type: 'tel', icon: Phone },
                  { key: 'occupation', label: 'Occupation', type: 'text', icon: Cpu },
                  { key: 'monthlyIncome', label: 'Monthly Income (₹)', type: 'number', icon: DollarSign },
                ].map(field => {
                  const FieldIcon = field.icon;
                  return (
                    <div key={field.key} className="py-3">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</label>
                      <div className="mt-1 relative">
                        <FieldIcon size={16} className="absolute left-3 top-3 text-gray-400" />
                        <input type={field.type} value={profile[field.key]}
                          onChange={e => setProfile(p => ({ ...p, [field.key]: e.target.value }))}
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                          placeholder={`Enter ${field.label.toLowerCase()}`} />
                      </div>
                    </div>
                  );
                })}
              </SettingSection>

              <div className="space-y-6">
                <SettingSection icon={Shield} title="Active Sessions">
                  {[
                    { device: 'Chrome on Windows', ip: '192.168.1.x', time: 'Active now', current: true },
                    { device: 'Mobile App (Android)', ip: '10.0.0.x', time: '2 hours ago', current: false },
                  ].map((session, i) => (
                    <div key={i} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Smartphone size={16} className="text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{session.device}</p>
                          <p className="text-xs text-gray-400">{session.ip} · {session.time}</p>
                        </div>
                      </div>
                      {session.current ? (
                        <Badge variant="success">Current</Badge>
                      ) : (
                        <button className="text-xs text-red-500 hover:text-red-400">Revoke</button>
                      )}
                    </div>
                  ))}
                </SettingSection>

                <AnimatedCard className="p-6 border-2 border-red-200 dark:border-red-900/50">
                  <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">Danger Zone</h3>
                  <div className="space-y-3">
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm font-medium">
                      <LogOut size={16} /> Sign Out of All Devices
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm font-medium">
                      <Trash2 size={16} /> Delete Account
                    </button>
                  </div>
                </AnimatedCard>
              </div>
            </div>
          )}

          {/* ── Data Tab ── */}
          {activeTab === 4 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SettingSection icon={Database} title="Data Management">
                <div className="py-3">
                  <button onClick={handleExportData}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm font-medium">
                    <Download size={16} /> Export All Financial Data (JSON)
                  </button>
                </div>
                <div className="py-3">
                  <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-sm font-medium">
                    <Download size={16} /> Export as CSV
                  </button>
                </div>
                <div className="py-3">
                  <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors text-sm font-medium">
                    <RotateCcw size={16} /> Restore from Backup
                  </button>
                </div>
              </SettingSection>

              <SettingSection icon={HardDrive} title="Storage Usage">
                <div className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Used Storage</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">24.7 MB / 500 MB</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div className="h-3 rounded-full bg-blue-500" style={{ width: '5%' }} />
                  </div>
                  <div className="mt-4 space-y-2">
                    {[
                      { name: 'Transactions', size: '12.3 MB', color: '#3B82F6' },
                      { name: 'Documents', size: '8.1 MB', color: '#10B981' },
                      { name: 'Reports', size: '3.2 MB', color: '#F59E0B' },
                      { name: 'Cache', size: '1.1 MB', color: '#8B5CF6' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-xs text-gray-600 dark:text-gray-400">{item.name}</span>
                        </div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.size}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </SettingSection>

              <SettingSection icon={Wifi} title="Connected Services">
                {[
                  { name: 'Google Account', status: 'connected', desc: 'Gmail & Drive sync' },
                  { name: 'Bank API', status: 'disconnected', desc: 'Auto-import transactions' },
                  { name: 'UPI Integration', status: 'connected', desc: 'Track UPI payments' },
                ].map((svc, i) => (
                  <div key={i} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{svc.name}</p>
                      <p className="text-xs text-gray-400">{svc.desc}</p>
                    </div>
                    <Badge variant={svc.status === 'connected' ? 'success' : 'default'}>
                      {svc.status === 'connected' ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                ))}
              </SettingSection>
            </div>
          )}
        </div>
      </PageTransition>
    </MainLayout>
  );
}
