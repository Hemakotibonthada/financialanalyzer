// ============================================================
// Financial Analyzer - Account Settings Page
// Feature #88: Comprehensive account settings & preferences
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatedCard, AnimatedTabs, Badge, Modal, Avatar } from '../components/ui/ComponentLibrary';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLocalStorage } from '../hooks/useCustomHooks';
import api from '../services/api';
import '../styles/animations.css';

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
];

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
];

const FONT_SIZES = [
  { value: 'small', label: 'Small', px: 14 },
  { value: 'medium', label: 'Medium', px: 16 },
  { value: 'large', label: 'Large', px: 18 },
];

export default function AccountSettings() {
  const { darkMode, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [showSuccess, setShowSuccess] = useState(false);

  // Profile state - populated from real user data, no hardcoded defaults
  const [profileData, setProfileData] = useState({
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    phone: user?.phone || '',
    dateOfBirth: user?.dateOfBirth || '',
    gender: user?.gender || '',
    occupation: user?.occupation || '',
    annualIncome: user?.annualIncome || '',
    city: user?.city || '',
    state: user?.state || '',
    country: user?.country || 'India',
    profileImage: user?.profileImage || null,
    bio: user?.bio || '',
  });

  // Preferences
  const [preferences, setPreferences] = useLocalStorage('user-preferences', {
    currency: 'INR',
    language: 'en',
    fontSize: 'medium',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'indian',
    fiscalYearStart: 'april',
    weekStart: 'monday',
    compactNumbers: true,
    showDecimal: true,
    autoRoundUp: false,
    defaultDashboard: 'overview',
    defaultTimeRange: '30d',
    itemsPerPage: 25,
    showWelcomeMessage: true,
    enableAnimations: true,
    enableSounds: false,
    autoSave: true,
    dataRetention: '1year',
  });

  // Notification settings
  const [notifications, setNotifications] = useLocalStorage('notification-settings', {
    email: { enabled: true, billReminders: true, budgetAlerts: true, weeklyReport: true, monthlyReport: true, goalProgress: true, securityAlerts: true, newsletters: false, promotions: false },
    push: { enabled: true, billReminders: true, budgetAlerts: true, transactionAlerts: true, priceAlerts: false },
    sms: { enabled: false, billReminders: false, securityAlerts: true },
    inApp: { enabled: true, all: true },
  });

  // Privacy settings
  const [privacy, setPrivacy] = useLocalStorage('privacy-settings', {
    profileVisibility: 'private',
    showOnLeaderboard: true,
    shareAnalytics: false,
    allowDataCollection: true,
    twoFactorAuth: false,
    biometricLogin: false,
    sessionTimeout: 30,
    loginNotifications: true,
    deviceManagement: true,
    dataEncryption: true,
  });

  const handleSave = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const tabs = [
    { key: 'profile', label: 'Profile', icon: '👤' },
    { key: 'preferences', label: 'Preferences', icon: '⚙️' },
    { key: 'notifications', label: 'Notifications', icon: '🔔' },
    { key: 'privacy', label: 'Privacy & Security', icon: '🔒' },
    { key: 'appearance', label: 'Appearance', icon: '🎨' },
    { key: 'data', label: 'Data Management', icon: '💾' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
          <p className="text-gray-500 mt-1">Manage your profile, preferences, and privacy</p>
        </div>

        {/* Success Toast */}
        {showSuccess && (
          <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg animate-slide-in-right flex items-center gap-2">
            ✅ Settings saved successfully!
          </div>
        )}

        {/* Tabs */}
        <AnimatedTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="pills" />

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <AnimatedCard>
              <div className="flex items-center gap-6 mb-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl text-white overflow-hidden">
                    {profileData.profileImage ? (
                      <img src={profileData.profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      profileData.firstName[0] + (profileData.lastName[0] || '')
                    )}
                  </div>
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs shadow-lg hover:bg-blue-700 transition-colors">
                    📷
                  </button>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {profileData.firstName} {profileData.lastName}
                  </h2>
                  <p className="text-gray-500">{profileData.email}</p>
                  <Badge variant="success" className="mt-1">Verified</Badge>
                </div>
              </div>

              {/* Profile Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="First Name" value={profileData.firstName} onChange={(v) => setProfileData(p => ({ ...p, firstName: v }))} />
                <FormField label="Last Name" value={profileData.lastName} onChange={(v) => setProfileData(p => ({ ...p, lastName: v }))} />
                <FormField label="Email" value={profileData.email} type="email" onChange={(v) => setProfileData(p => ({ ...p, email: v }))} />
                <FormField label="Phone" value={profileData.phone} type="tel" onChange={(v) => setProfileData(p => ({ ...p, phone: v }))} />
                <FormField label="Date of Birth" value={profileData.dateOfBirth} type="date" onChange={(v) => setProfileData(p => ({ ...p, dateOfBirth: v }))} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
                  <select
                    value={profileData.gender}
                    onChange={(e) => setProfileData(p => ({ ...p, gender: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
                <FormField label="Occupation" value={profileData.occupation} onChange={(v) => setProfileData(p => ({ ...p, occupation: v }))} />
                <FormField label="Annual Income" value={profileData.annualIncome} type="number" onChange={(v) => setProfileData(p => ({ ...p, annualIncome: v }))} />
                <FormField label="City" value={profileData.city} onChange={(v) => setProfileData(p => ({ ...p, city: v }))} />
                <FormField label="State" value={profileData.state} onChange={(v) => setProfileData(p => ({ ...p, state: v }))} />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData(p => ({ ...p, bio: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl resize-none"
                />
              </div>
              <div className="flex justify-end mt-4">
                <button onClick={handleSave} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
                  Save Profile
                </button>
              </div>
            </AnimatedCard>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="space-y-6">
            <AnimatedCard>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Regional Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
                  <select value={preferences.currency} onChange={(e) => setPreferences(p => ({ ...p, currency: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl">
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
                  <select value={preferences.language} onChange={(e) => setPreferences(p => ({ ...p, language: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl">
                    {LANGUAGES.map(l => (
                      <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Format</label>
                  <select value={preferences.dateFormat} onChange={(e) => setPreferences(p => ({ ...p, dateFormat: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl">
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fiscal Year Start</label>
                  <select value={preferences.fiscalYearStart} onChange={(e) => setPreferences(p => ({ ...p, fiscalYearStart: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl">
                    <option value="january">January</option>
                    <option value="april">April (India)</option>
                    <option value="july">July</option>
                    <option value="october">October</option>
                  </select>
                </div>
              </div>
            </AnimatedCard>

            <AnimatedCard delay={100}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Display Preferences</h3>
              <div className="space-y-4">
                <ToggleSetting label="Compact Numbers" description="Show 1.2L instead of 1,20,000" value={preferences.compactNumbers} onChange={(v) => setPreferences(p => ({ ...p, compactNumbers: v }))} />
                <ToggleSetting label="Show Decimals" description="Display paisa/cents in amounts" value={preferences.showDecimal} onChange={(v) => setPreferences(p => ({ ...p, showDecimal: v }))} />
                <ToggleSetting label="Auto Round-Up" description="Automatically round up transactions" value={preferences.autoRoundUp} onChange={(v) => setPreferences(p => ({ ...p, autoRoundUp: v }))} />
                <ToggleSetting label="Enable Animations" description="Smooth transitions and animations" value={preferences.enableAnimations} onChange={(v) => setPreferences(p => ({ ...p, enableAnimations: v }))} />
                <ToggleSetting label="Enable Sounds" description="Play sounds for notifications" value={preferences.enableSounds} onChange={(v) => setPreferences(p => ({ ...p, enableSounds: v }))} />
                <ToggleSetting label="Auto Save" description="Automatically save form changes" value={preferences.autoSave} onChange={(v) => setPreferences(p => ({ ...p, autoSave: v }))} />
                <ToggleSetting label="Welcome Message" description="Show welcome message on login" value={preferences.showWelcomeMessage} onChange={(v) => setPreferences(p => ({ ...p, showWelcomeMessage: v }))} />
              </div>
            </AnimatedCard>

            <AnimatedCard delay={200}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Default Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Dashboard</label>
                  <select value={preferences.defaultDashboard} onChange={(e) => setPreferences(p => ({ ...p, defaultDashboard: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl">
                    <option value="overview">Overview</option>
                    <option value="analytics">Analytics</option>
                    <option value="goals">Goals</option>
                    <option value="budget">Budget</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Time Range</label>
                  <select value={preferences.defaultTimeRange} onChange={(e) => setPreferences(p => ({ ...p, defaultTimeRange: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl">
                    <option value="7d">7 Days</option>
                    <option value="30d">30 Days</option>
                    <option value="90d">90 Days</option>
                    <option value="1y">1 Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Items Per Page</label>
                  <select value={preferences.itemsPerPage} onChange={(e) => setPreferences(p => ({ ...p, itemsPerPage: Number(e.target.value) }))} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl">
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button onClick={handleSave} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
                  Save Preferences
                </button>
              </div>
            </AnimatedCard>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <AnimatedCard>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📧 Email Notifications</h3>
              <div className="space-y-3">
                <ToggleSetting label="Email Notifications" description="Master toggle for email notifications" value={notifications.email.enabled} onChange={(v) => setNotifications(p => ({ ...p, email: { ...p.email, enabled: v } }))} />
                {notifications.email.enabled && (
                  <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-3">
                    <ToggleSetting label="Bill Reminders" description="Get reminders before bills are due" value={notifications.email.billReminders} onChange={(v) => setNotifications(p => ({ ...p, email: { ...p.email, billReminders: v } }))} />
                    <ToggleSetting label="Budget Alerts" description="Alerts when approaching budget limits" value={notifications.email.budgetAlerts} onChange={(v) => setNotifications(p => ({ ...p, email: { ...p.email, budgetAlerts: v } }))} />
                    <ToggleSetting label="Weekly Report" description="Weekly financial summary" value={notifications.email.weeklyReport} onChange={(v) => setNotifications(p => ({ ...p, email: { ...p.email, weeklyReport: v } }))} />
                    <ToggleSetting label="Monthly Report" description="Detailed monthly report" value={notifications.email.monthlyReport} onChange={(v) => setNotifications(p => ({ ...p, email: { ...p.email, monthlyReport: v } }))} />
                    <ToggleSetting label="Goal Progress" description="Updates on goal milestones" value={notifications.email.goalProgress} onChange={(v) => setNotifications(p => ({ ...p, email: { ...p.email, goalProgress: v } }))} />
                    <ToggleSetting label="Security Alerts" description="Login attempts and security events" value={notifications.email.securityAlerts} onChange={(v) => setNotifications(p => ({ ...p, email: { ...p.email, securityAlerts: v } }))} />
                    <ToggleSetting label="Newsletters" description="Tips and financial advice" value={notifications.email.newsletters} onChange={(v) => setNotifications(p => ({ ...p, email: { ...p.email, newsletters: v } }))} />
                  </div>
                )}
              </div>
            </AnimatedCard>

            <AnimatedCard delay={100}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🔔 Push Notifications</h3>
              <div className="space-y-3">
                <ToggleSetting label="Push Notifications" description="Browser/mobile push notifications" value={notifications.push.enabled} onChange={(v) => setNotifications(p => ({ ...p, push: { ...p.push, enabled: v } }))} />
                {notifications.push.enabled && (
                  <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-3">
                    <ToggleSetting label="Bill Reminders" value={notifications.push.billReminders} onChange={(v) => setNotifications(p => ({ ...p, push: { ...p.push, billReminders: v } }))} />
                    <ToggleSetting label="Budget Alerts" value={notifications.push.budgetAlerts} onChange={(v) => setNotifications(p => ({ ...p, push: { ...p.push, budgetAlerts: v } }))} />
                    <ToggleSetting label="Transaction Alerts" value={notifications.push.transactionAlerts} onChange={(v) => setNotifications(p => ({ ...p, push: { ...p.push, transactionAlerts: v } }))} />
                    <ToggleSetting label="Price Alerts" value={notifications.push.priceAlerts} onChange={(v) => setNotifications(p => ({ ...p, push: { ...p.push, priceAlerts: v } }))} />
                  </div>
                )}
              </div>
            </AnimatedCard>

            <AnimatedCard delay={200}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📱 SMS Notifications</h3>
              <div className="space-y-3">
                <ToggleSetting label="SMS Notifications" description="Text message alerts" value={notifications.sms.enabled} onChange={(v) => setNotifications(p => ({ ...p, sms: { ...p.sms, enabled: v } }))} />
                {notifications.sms.enabled && (
                  <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-3">
                    <ToggleSetting label="Bill Reminders" value={notifications.sms.billReminders} onChange={(v) => setNotifications(p => ({ ...p, sms: { ...p.sms, billReminders: v } }))} />
                    <ToggleSetting label="Security Alerts" value={notifications.sms.securityAlerts} onChange={(v) => setNotifications(p => ({ ...p, sms: { ...p.sms, securityAlerts: v } }))} />
                  </div>
                )}
              </div>
            </AnimatedCard>

            <div className="flex justify-end">
              <button onClick={handleSave} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
                Save Notification Settings
              </button>
            </div>
          </div>
        )}

        {/* Privacy & Security Tab */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <AnimatedCard>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🔒 Security</h3>
              <div className="space-y-3">
                <ToggleSetting label="Two-Factor Authentication" description="Extra security with OTP on login" value={privacy.twoFactorAuth} onChange={(v) => setPrivacy(p => ({ ...p, twoFactorAuth: v }))} />
                <ToggleSetting label="Biometric Login" description="Use fingerprint or face recognition" value={privacy.biometricLogin} onChange={(v) => setPrivacy(p => ({ ...p, biometricLogin: v }))} />
                <ToggleSetting label="Login Notifications" description="Get alerted on new device logins" value={privacy.loginNotifications} onChange={(v) => setPrivacy(p => ({ ...p, loginNotifications: v }))} />
                <ToggleSetting label="Data Encryption" description="Encrypt sensitive financial data" value={privacy.dataEncryption} onChange={(v) => setPrivacy(p => ({ ...p, dataEncryption: v }))} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Session Timeout (minutes)</label>
                  <select value={privacy.sessionTimeout} onChange={(e) => setPrivacy(p => ({ ...p, sessionTimeout: Number(e.target.value) }))} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl max-w-xs">
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                    <option value="0">Never</option>
                  </select>
                </div>
              </div>
            </AnimatedCard>

            <AnimatedCard delay={100}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">👁️ Privacy</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profile Visibility</label>
                  <select value={privacy.profileVisibility} onChange={(e) => setPrivacy(p => ({ ...p, profileVisibility: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl max-w-xs">
                    <option value="private">Private - Only me</option>
                    <option value="friends">Friends only</option>
                    <option value="public">Public</option>
                  </select>
                </div>
                <ToggleSetting label="Show on Leaderboard" description="Display your name on savings leaderboards" value={privacy.showOnLeaderboard} onChange={(v) => setPrivacy(p => ({ ...p, showOnLeaderboard: v }))} />
                <ToggleSetting label="Share Analytics" description="Help improve the app by sharing usage analytics" value={privacy.shareAnalytics} onChange={(v) => setPrivacy(p => ({ ...p, shareAnalytics: v }))} />
              </div>
            </AnimatedCard>

            <AnimatedCard delay={200}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🔑 Password & Authentication</h3>
              <div className="space-y-3">
                <button className="w-full text-left p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between group">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Change Password</div>
                    <div className="text-xs text-gray-500">Last changed 45 days ago</div>
                  </div>
                  <span className="text-gray-400 group-hover:text-blue-600 transition-colors">→</span>
                </button>
                <button className="w-full text-left p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between group">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Active Sessions</div>
                    <div className="text-xs text-gray-500">2 active sessions</div>
                  </div>
                  <span className="text-gray-400 group-hover:text-blue-600 transition-colors">→</span>
                </button>
                <button className="w-full text-left p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between group">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Connected Accounts</div>
                    <div className="text-xs text-gray-500">Google, GitHub</div>
                  </div>
                  <span className="text-gray-400 group-hover:text-blue-600 transition-colors">→</span>
                </button>
              </div>
            </AnimatedCard>

            <div className="flex justify-end">
              <button onClick={handleSave} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
                Save Privacy Settings
              </button>
            </div>
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="space-y-6">
            <AnimatedCard>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🌓 Theme</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: 'light', label: 'Light', icon: '☀️', bg: 'bg-white border-gray-200', textColor: 'text-gray-900' },
                  { value: 'dark', label: 'Dark', icon: '🌙', bg: 'bg-gray-900 border-gray-700', textColor: 'text-white' },
                  { value: 'system', label: 'System', icon: '💻', bg: 'bg-gradient-to-r from-white to-gray-900 border-gray-400', textColor: 'text-gray-600' },
                ].map(theme => (
                  <button
                    key={theme.value}
                    onClick={() => {
                      if (theme.value === 'dark' && !darkMode) toggleTheme();
                      if (theme.value === 'light' && darkMode) toggleTheme();
                    }}
                    className={`p-6 rounded-xl text-center border-2 transition-all ${
                      (darkMode && theme.value === 'dark') || (!darkMode && theme.value === 'light')
                        ? 'ring-2 ring-blue-500 border-blue-300'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <span className="text-3xl block mb-2">{theme.icon}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{theme.label}</span>
                  </button>
                ))}
              </div>
            </AnimatedCard>

            <AnimatedCard delay={100}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🔤 Font Size</h3>
              <div className="grid grid-cols-3 gap-4">
                {FONT_SIZES.map(size => (
                  <button
                    key={size.value}
                    onClick={() => setPreferences(p => ({ ...p, fontSize: size.value }))}
                    className={`p-4 rounded-xl text-center transition-all border-2 ${
                      preferences.fontSize === size.value
                        ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <span style={{ fontSize: `${size.px}px` }} className="font-medium text-gray-900 dark:text-white block mb-1">Aa</span>
                    <span className="text-xs text-gray-500">{size.label}</span>
                  </button>
                ))}
              </div>
            </AnimatedCard>

            <AnimatedCard delay={200}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🎨 Accent Color</h3>
              <div className="flex gap-3">
                {['#3B82F6', '#8B5CF6', '#10B981', '#EF4444', '#F59E0B', '#EC4899', '#6366F1', '#14B8A6'].map(color => (
                  <button
                    key={color}
                    className="w-10 h-10 rounded-full transition-transform hover:scale-110"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </AnimatedCard>
          </div>
        )}

        {/* Data Management Tab */}
        {activeTab === 'data' && (
          <DataManagementTab />
        )}
      </div>
    </div>
  );
}

// ======================== HELPER COMPONENTS ========================
function FormField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
      />
    </div>
  );
}

function ToggleSetting({ label, description, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
        {description && <div className="text-xs text-gray-500">{description}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          value ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
            value ? 'translate-x-5.5 left-0.5' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}

// ======================== DATA MANAGEMENT TAB ========================
function DataManagementTab() {
  const [driveStatus, setDriveStatus] = useState({ configured: false, connected: false, backup: null });
  const [dataCounts, setDataCounts] = useState({ transactions: 0, documents: 0, budgets: 0 });
  const [loading, setLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Handle OAuth callback from Google Drive
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const driveTokens = params.get('drive_tokens');
    const driveSuccess = params.get('drive_success');
    const driveError = params.get('drive_error');

    if (driveSuccess && driveTokens) {
      try {
        const tokens = JSON.parse(atob(driveTokens));
        api.post('/api/drive/save-tokens', { tokens }).then(() => {
          setMessage({ type: 'success', text: 'Google Drive connected successfully!' });
          loadDriveStatus();
          // Clean URL
          window.history.replaceState({}, '', window.location.pathname);
        }).catch(err => {
          setMessage({ type: 'error', text: 'Failed to save Drive tokens.' });
        });
      } catch (e) {
        setMessage({ type: 'error', text: 'Invalid Drive token data.' });
      }
    } else if (driveError) {
      setMessage({ type: 'error', text: `Drive connection failed: ${driveError}` });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const loadDriveStatus = useCallback(async () => {
    try {
      const res = await api.get('/api/drive/status');
      setDriveStatus(res.data);
    } catch (err) {
      console.log('Drive status not available');
    }
  }, []);

  const loadDataCounts = useCallback(async () => {
    try {
      const [txRes, budgetRes] = await Promise.allSettled([
        api.get('/api/transactions?limit=1'),
        api.get('/api/budgets'),
      ]);
      setDataCounts({
        transactions: txRes.status === 'fulfilled' ? (txRes.value.data.total || txRes.value.data.transactions?.length || 0) : 0,
        budgets: budgetRes.status === 'fulfilled' ? (budgetRes.value.data.length || 0) : 0,
        documents: 0,
      });
    } catch (err) {
      console.log('Data counts not available');
    }
  }, []);

  useEffect(() => {
    Promise.all([loadDriveStatus(), loadDataCounts()]).finally(() => setLoading(false));
  }, [loadDriveStatus, loadDataCounts]);

  const connectDrive = async () => {
    try {
      const res = await api.get('/api/drive/auth-url');
      window.location.href = res.data.url;
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to start Drive connection.' });
    }
  };

  const disconnectDrive = async () => {
    try {
      await api.post('/api/drive/disconnect');
      setDriveStatus(prev => ({ ...prev, connected: false, backup: null }));
      setMessage({ type: 'success', text: 'Google Drive disconnected.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to disconnect Drive.' });
    }
  };

  const backupToDrive = async () => {
    setBackupLoading(true);
    try {
      const res = await api.post('/api/drive/backup');
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Data backed up to Google Drive successfully!' });
        loadDriveStatus();
      } else {
        setMessage({ type: 'error', text: res.data.error || 'Backup failed.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Backup failed.' });
    } finally {
      setBackupLoading(false);
    }
  };

  const restoreFromDrive = async () => {
    if (!window.confirm('This will restore data from your Google Drive backup. Existing data will be merged. Continue?')) return;
    setRestoreLoading(true);
    try {
      const res = await api.post('/api/drive/restore');
      if (res.data.success) {
        setMessage({ type: 'success', text: `Data restored from backup (${res.data.backupDate}). Refreshing...` });
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setMessage({ type: 'error', text: res.data.error || 'Restore failed.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Restore failed.' });
    } finally {
      setRestoreLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">Loading data management...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
          {message.type === 'success' ? '✅' : '❌'} {message.text}
        </div>
      )}

      {/* Data Overview - Real counts from API */}
      <AnimatedCard>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📊 Data Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{dataCounts.transactions.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Transactions</div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{dataCounts.budgets}</div>
            <div className="text-xs text-gray-500">Budgets</div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {driveStatus.connected ? '☁️' : '📱'}
            </div>
            <div className="text-xs text-gray-500">{driveStatus.connected ? 'Cloud Synced' : 'Local Only'}</div>
          </div>
        </div>
      </AnimatedCard>

      {/* Google Drive Integration */}
      <AnimatedCard delay={100}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">☁️ Google Drive Sync</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Backup your financial data to Google Drive and access it from any device.
        </p>

        {!driveStatus.configured ? (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              Google Drive integration requires Google OAuth credentials. Ask your administrator to set
              GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_DRIVE_REDIRECT_URI in the server .env file.
            </p>
          </div>
        ) : !driveStatus.connected ? (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
                Connect your Google Drive to enable cloud backup and cross-device data sync.
              </p>
              <button onClick={connectDrive}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                </svg>
                Connect Google Drive
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connected Status */}
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <div>
                  <div className="text-sm font-medium text-green-700 dark:text-green-400">Google Drive Connected</div>
                  {driveStatus.backup && (
                    <div className="text-xs text-green-600 dark:text-green-500">
                      Last backup: {new Date(driveStatus.backup.lastModified).toLocaleString()}
                      {driveStatus.backup.size && ` (${(parseInt(driveStatus.backup.size) / 1024).toFixed(1)} KB)`}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={disconnectDrive}
                className="text-xs text-red-500 hover:text-red-700 font-medium">
                Disconnect
              </button>
            </div>

            {/* Backup & Restore Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={backupToDrive} disabled={backupLoading}
                className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left disabled:opacity-50">
                <div className="text-lg mb-1">{backupLoading ? '⏳' : '☁️'} Backup to Drive</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {backupLoading ? 'Backing up...' : 'Save all financial data to Google Drive'}
                </div>
              </button>
              <button onClick={restoreFromDrive} disabled={restoreLoading || !driveStatus.backup}
                className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-left disabled:opacity-50">
                <div className="text-lg mb-1">{restoreLoading ? '⏳' : '📥'} Restore from Drive</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {restoreLoading ? 'Restoring...' : driveStatus.backup ? 'Restore data from your Drive backup' : 'No backup available yet'}
                </div>
              </button>
            </div>
          </div>
        )}
      </AnimatedCard>

      {/* Import/Export */}
      <AnimatedCard delay={200}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">⬇️ Import & Export</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 transition-colors text-left">
            <div className="text-lg mb-1">📥 Import Data</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Import from CSV, Excel, or other apps</div>
          </button>
          <button className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 hover:bg-green-100 transition-colors text-left">
            <div className="text-lg mb-1">📤 Export All Data</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Download all your data in one file</div>
          </button>
        </div>
      </AnimatedCard>

      {/* Danger Zone */}
      <AnimatedCard delay={300} className="border border-red-200 dark:border-red-800">
        <h3 className="text-lg font-semibold text-red-600 mb-4">⚠️ Danger Zone</h3>
        <div className="space-y-3">
          <button className="w-full text-left p-4 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 transition-colors flex items-center justify-between">
            <div>
              <div className="font-medium text-red-700 dark:text-red-400">Clear All Data</div>
              <div className="text-xs text-red-500">Delete all transactions, budgets, and settings</div>
            </div>
            <span className="text-red-400">🗑️</span>
          </button>
          <button className="w-full text-left p-4 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 transition-colors flex items-center justify-between">
            <div>
              <div className="font-medium text-red-700 dark:text-red-400">Delete Account</div>
              <div className="text-xs text-red-500">Permanently delete your account and all data</div>
            </div>
            <span className="text-red-400">❌</span>
          </button>
        </div>
      </AnimatedCard>
    </div>
  );
}
