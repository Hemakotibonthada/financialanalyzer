// ============================================================
// Financial Analyzer - Unified Profile & Settings Page
// Merged from Profile.jsx and AccountSettings.jsx
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLocalStorage } from '../hooks/useCustomHooks';
import { AnimatedCard, Badge, Modal } from '../components/ui/ComponentLibrary';
import api from '../services/api';
import {
  User, Mail, Phone, CreditCard, DollarSign, Calendar,
  Settings, Bell, Shield, CheckCircle, AlertCircle,
  TrendingUp, Target, Plus, Trash2, Save, RefreshCw,
  Eye, EyeOff, Lock, Globe, Zap, Link, XCircle, Database, Sparkles
} from 'lucide-react';
import '../styles/animations.css';
import { ThemeGradientText, ThemeButton } from '../components/ui/ThemePageComponents';
import MainLayout from '../components/MainLayout';
import { FadeIn, PageTransition } from '../components/ui/AnimatedComponents';

// ======================== CONSTANTS ========================

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
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

const BUDGET_CATEGORIES = [
  'food_dining', 'groceries', 'transportation', 'fuel', 'utilities',
  'rent_mortgage', 'insurance', 'healthcare', 'entertainment', 'shopping',
  'education', 'travel', 'subscriptions', 'investment', 'emi', 'loan', 'other'
];

// ======================== HELPER COMPONENTS ========================

function FormField({ label, value, onChange, type = 'text', placeholder, icon: Icon, color = 'blue', disabled = false, ...props }) {
  const { mode: _mode } = useTheme();
  const dk = _mode === 'dark' || _mode === 'black';
  return (
    <div className="group">
      <label className={`flex items-center gap-2 text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-3`}>
        {Icon && <Icon className={`w-4 h-4 text-${color}-600`} />}
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full p-4 border-2 ${disabled ? `${dk ? `border-slate-700` : `border-gray-200`} ${dk ? `bg-slate-800/50` : `bg-gray-50`} ${dk ? `text-slate-400` : `text-gray-500`}` : `${dk ? `border-slate-700` : `border-gray-200`} focus:ring-4 focus:ring-${color}-100 focus:border-${color}-500 ${dk ? `hover:border-slate-600` : `hover:border-gray-300`} ${dk ? `bg-slate-900` : `bg-white`} ${dk ? `text-white` : ``}`} rounded-xl transition-all duration-300 font-medium`}
        {...props}
      />
    </div>
  );
}

function ToggleSetting({ label, description, value, onChange }) {
  const { mode: _mode } = useTheme();
  const dk = _mode === 'dark' || _mode === 'black';
  return (
    <div className={`flex items-center justify-between py-3 px-4 border-2 ${dk ? `border-slate-700` : `border-gray-200`} rounded-xl ${dk ? 'hover:border-blue-700' : 'hover:border-blue-300'} transition-all duration-300 cursor-pointer ${dk ? `bg-slate-800` : `bg-white`}`} onClick={() => onChange(!value)}>
      <div>
        <div className={`text-sm font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>{label}</div>
        {description && <div className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'} mt-0.5`}>{description}</div>}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onChange(!value); }}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          value ? 'bg-blue-600' : `${dk ? 'bg-gray-600' : 'bg-gray-300'}`
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

// ======================== MAIN COMPONENT ========================

const Profile = () => {
  const { user } = useAuth();
  const { darkMode, toggleTheme, mode } = useTheme();
  const dk = mode === 'dark' || mode === 'black';
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

  // ===== Profile state (backend-persisted via POST /profile) =====
  const [profile, setProfile] = useState({
    fullName: user?.name || '',
    dateOfBirth: '',
    panNumber: '',
    phoneNumber: '',
    gender: '',
    occupation: '',
    city: '',
    state: '',
    bio: '',
    monthlyIncome: '',
    currency: 'INR',
    preferences: {
      autoFetchDocuments: false,
      fetchFrequency: 'weekly',
      aiProvider: 'ollama',
      openAIKey: '',
      emailNotifications: true,
      budgetAlerts: true
    },
    budgetLimits: {},
    savingsGoal: {
      amount: '',
      deadline: '',
      description: ''
    },
    customCategories: []
  });

  // ===== Display preferences (localStorage) =====
  const [displayPrefs, setDisplayPrefs] = useLocalStorage('user-preferences', {
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

  // ===== Notification settings (localStorage) =====
  const [notifications, setNotifications] = useLocalStorage('notification-settings', {
    email: { enabled: true, billReminders: true, budgetAlerts: true, weeklyReport: true, monthlyReport: true, goalProgress: true, securityAlerts: true, newsletters: false, promotions: false },
    push: { enabled: true, billReminders: true, budgetAlerts: true, transactionAlerts: true, priceAlerts: false },
    sms: { enabled: false, billReminders: false, securityAlerts: true },
    inApp: { enabled: true, all: true },
  });

  // ===== Privacy settings (localStorage) =====
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

  // ===== Other state =====
  const [incomeInfo, setIncomeInfo] = useState({
    source: 'not-set',
    transactionCount: 0,
    lastSalaryDate: null
  });
  const [gmailStatus, setGmailStatus] = useState({
    isConnected: false,
    email: null,
    lastSync: null,
    lastFullSyncAt: null,
    grantedScopes: []
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [newCategory, setNewCategory] = useState({ name: '', icon: '', keywords: '' });

  // ======================== EFFECTS ========================

  useEffect(() => {
    loadProfile();
    loadGmailStatus();
    handleOAuthCallback();
  }, []);

  // ======================== DATA LOADING ========================

  const handleOAuthCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const gmailTokens = urlParams.get('gmail_tokens');
    const error = urlParams.get('error');
    const success = urlParams.get('success');

    if (error) {
      const errorMessage = urlParams.get('message') || 'OAuth authorization failed';
      setMessage({ type: 'error', text: decodeURIComponent(errorMessage) });
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (success && gmailTokens) {
      try {
        const decodedTokens = JSON.parse(atob(gmailTokens));
        const response = await api.post('/auth/gmail/save-tokens', { tokens: decodedTokens });
        if (response.data.success) {
          setMessage({ type: 'success', text: `Gmail connected successfully: ${response.data.email}` });
          loadGmailStatus();
        } else if (response.data?.requiresReauth) {
          setMessage({ type: 'error', text: response.data.message || 'Gmail authorization did not include email read access.' });
        }
      } catch (error) {
        console.error('Error saving Gmail tokens:', error);
        const requiresReauth = error.response?.data?.requiresReauth;
        const apiMessage = error.response?.data?.message;
        setMessage({
          type: 'error',
          text: requiresReauth
            ? (apiMessage || 'Gmail authorization did not include email read access. Please remove the app from Google account permissions and reconnect.')
            : (apiMessage || 'Failed to complete Gmail connection')
        });
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/profile');
      if (response.data.success && response.data.data?.profile) {
        const profileData = response.data.data.profile;
        setProfile(prev => ({
          ...prev,
          ...profileData,
          fullName: profileData.fullName || user?.name || '',
          dateOfBirth: profileData.dateOfBirth ? new Date(profileData.dateOfBirth).toISOString().split('T')[0] : '',
          savingsGoal: {
            amount: profileData.savingsGoal?.amount || '',
            deadline: profileData.savingsGoal?.deadline ? new Date(profileData.savingsGoal.deadline).toISOString().split('T')[0] : '',
            description: profileData.savingsGoal?.description || ''
          }
        }));
      }
      await loadIncomeInfo();
    } catch (error) {
      console.error('Error loading profile:', error);
      const errorMsg = error.response?.data?.message || 'Failed to load profile data';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const loadIncomeInfo = async () => {
    try {
      const response = await api.get('/profile/monthly-income');
      if (response.data.success) {
        setIncomeInfo(response.data.data);
      }
    } catch (error) {
      console.error('Error loading income info:', error);
    }
  };

  const loadGmailStatus = async () => {
    try {
      const response = await api.get('/gmail/status');
      if (response.data.success) {
        setGmailStatus(prev => ({
          ...prev,
          isConnected: response.data.isConnected,
          email: response.data.email,
          lastSync: response.data.lastSync,
          lastFullSyncAt: response.data.lastFullSyncAt,
          initialSyncCompleted: response.data.initialSyncCompleted,
          grantedScopes: response.data.grantedScopes || [],
          totalMessagesSynced: response.data.totalMessagesSynced,
          lastAttachmentSyncCount: response.data.lastAttachmentSyncCount
        }));
      }
    } catch (error) {
      console.error('Error loading Gmail status:', error);
    }
  };

  // ======================== HANDLERS ========================

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setProfile(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setProfile(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleBudgetLimitChange = (category, amount) => {
    setProfile(prev => ({
      ...prev,
      budgetLimits: {
        ...prev.budgetLimits,
        [category]: parseFloat(amount) || 0
      }
    }));
  };

  // Auto-fill budget limits based on monthly income using Indian spending benchmarks
  const handleAutoFillBudgets = () => {
    const income = parseFloat(profile.monthlyIncome);
    if (!income || income <= 0) {
      setMessage({ type: 'error', text: 'Please set your monthly income in the Financial tab first' });
      return;
    }

    // Budget allocation based on 50/30/20 rule adapted for Indian households
    // 50% Needs, 30% Wants, 20% Savings/Investments
    const budgets = {
      food_dining:      Math.round(income * 0.08),   // 8% eating out
      groceries:        Math.round(income * 0.10),   // 10% groceries
      transportation:   Math.round(income * 0.05),   // 5% transport
      fuel:             Math.round(income * 0.04),   // 4% fuel
      utilities:        Math.round(income * 0.05),   // 5% electricity/water/gas/internet
      rent_mortgage:    Math.round(income * 0.25),   // 25% housing (biggest chunk)
      insurance:        Math.round(income * 0.05),   // 5% health + life + vehicle
      healthcare:       Math.round(income * 0.03),   // 3% medical
      entertainment:    Math.round(income * 0.05),   // 5% movies/subscriptions/hobbies
      shopping:         Math.round(income * 0.05),   // 5% clothes/household
      education:        Math.round(income * 0.03),   // 3% courses/books
      travel:           Math.round(income * 0.03),   // 3% trips
      subscriptions:    Math.round(income * 0.02),   // 2% streaming/apps
      investment:       Math.round(income * 0.10),   // 10% SIP/FD/stocks
      emi:              Math.round(income * 0.05),   // 5% EMIs (adjust if loans exist)
      loan:             Math.round(income * 0.00),   // 0% default (user adjusts)
      other:            Math.round(income * 0.02),   // 2% miscellaneous
    };

    setProfile(prev => ({ ...prev, budgetLimits: budgets }));
    setMessage({ type: 'success', text: `Budget limits auto-filled based on ₹${income.toLocaleString()} monthly income (50/30/20 rule)` });
  };

  const handleAddCustomCategory = () => {
    if (!newCategory.name || !newCategory.icon) {
      setMessage({ type: 'error', text: 'Please provide both name and icon for the category' });
      return;
    }
    const keywordsArray = newCategory.keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
    const categoryToAdd = { name: newCategory.name.trim(), icon: newCategory.icon, keywords: keywordsArray };
    setProfile(prev => ({
      ...prev,
      customCategories: [...(prev.customCategories || []), categoryToAdd]
    }));
    setNewCategory({ name: '', icon: '', keywords: '' });
    setMessage({ type: 'success', text: 'Custom category added! Remember to save your profile.' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleRemoveCustomCategory = (index) => {
    setProfile(prev => ({
      ...prev,
      customCategories: prev.customCategories.filter((_, i) => i !== index)
    }));
    setMessage({ type: 'success', text: 'Custom category removed! Remember to save your profile.' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const saveProfile = async () => {
    if (!profile.fullName?.trim()) {
      setMessage({ type: 'error', text: 'Full name is required' });
      return;
    }
    try {
      setSaving(true);
      const response = await api.post('/profile', profile);
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      const errorMsg = error.response?.data?.message || 'Failed to save profile';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setSaving(false);
    }
  };

  const connectGmail = async () => {
    try {
      const response = await api.get('/gmail/auth-url');
      if (response.data.success) {
        window.location.href = response.data.authUrl;
      }
    } catch (error) {
      console.error('Error getting Gmail auth URL:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to initiate Gmail connection' });
    }
  };

  const disconnectGmail = async () => {
    try {
      await api.post('/gmail/disconnect');
      setGmailStatus({ isConnected: false, email: null, lastSync: null, lastFullSyncAt: null, grantedScopes: [] });
      setMessage({ type: 'success', text: 'Gmail account disconnected' });
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      setMessage({ type: 'error', text: 'Failed to disconnect Gmail' });
    }
  };

  const hasReadonlyScope = gmailStatus.grantedScopes?.includes('https://www.googleapis.com/auth/gmail.readonly');

  const syncGmail = async () => {
    try {
      setMessage({ type: 'info', text: 'Syncing Gmail documents...' });
      const response = await api.post('/gmail/sync');
      if (response.data.success) {
        setMessage({
          type: 'success',
          text: `Sync completed! Found ${response.data.results.downloadedAttachments} financial documents`
        });
        loadGmailStatus();
      }
    } catch (error) {
      console.error('Error syncing Gmail:', error);
      const apiMessage = error.response?.data?.message;
      const requiresReauth = error.response?.data?.requiresReauth;
      if (requiresReauth) {
        setMessage({ type: 'error', text: 'Gmail permissions have expired. Please disconnect and reconnect Gmail to grant email read access.' });
      } else {
        setMessage({ type: 'error', text: apiMessage || 'Failed to sync Gmail documents' });
      }
    }
  };

  const validatePAN = (pan) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
  };

  // ======================== TAB DEFINITIONS ========================

  const tabs = [
    { key: 'personal', label: 'Personal Info', icon: User },
    { key: 'financial', label: 'Financial', icon: DollarSign },
    { key: 'budget', label: 'Budget & Goals', icon: Target },
    { key: 'preferences', label: 'Preferences', icon: Settings },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'integrations', label: 'Integrations', icon: Link },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'appearance', label: 'Appearance', icon: Eye },
    { key: 'data', label: 'Data', icon: Database },
  ];

  // ======================== LOADING STATE ========================

  if (loading) {
    return (
      <MainLayout title="Profile & Settings">
        <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className={`${dk ? 'text-slate-400' : 'text-gray-600'} font-medium`}>Loading your settings...</p>
        </div>
      </div>
      </MainLayout>
    );
  }

  // ======================== RENDER ========================

  return (
    <MainLayout title="Profile & Settings">
      <PageTransition>
      <div className={`min-h-screen bg-gradient-to-br ${dk ? `from-slate-950` : `from-slate-50`} ${dk ? 'via-slate-900' : 'via-blue-50/30'} ${dk ? `to-slate-950` : `to-indigo-50/20`}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* ===== HEADER ===== */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-32 sm:w-64 h-32 sm:h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-48 sm:w-96 h-48 sm:h-96 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4 lg:gap-6 flex-1 min-w-0">
                <div className="bg-white/20 backdrop-blur-sm p-3 sm:p-4 rounded-xl sm:rounded-2xl flex-shrink-0">
                  <Settings className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2 truncate">Settings</h1>
                  <p className="text-blue-100 text-xs sm:text-sm lg:text-base">
                    Manage your profile, preferences, and account settings
                  </p>
                </div>
              </div>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="w-full sm:w-auto bg-white text-blue-600 px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-semibold hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 touch-target"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ===== MESSAGE ===== */}
        {message.text && (
          <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl shadow-lg flex items-start gap-2 sm:gap-3 animate-fade-in text-sm sm:text-base ${
            message.type === 'success' ? `${dk ? 'bg-green-900/30' : 'bg-green-50'} ${dk ? 'text-green-400' : 'text-green-700'} border-2 ${dk ? 'border-green-800' : 'border-green-200'}` :
            message.type === 'error' ? `${dk ? 'bg-red-900/30' : 'bg-red-50'} ${dk ? 'text-red-400' : 'text-red-700'} border-2 ${dk ? 'border-red-800' : 'border-red-200'}` :
            `${dk ? 'bg-blue-900/30' : 'bg-blue-50'} ${dk ? 'text-blue-400' : 'text-blue-700'} border-2 ${dk ? 'border-blue-800' : 'border-blue-200'}`
          }`}>
            {message.type === 'success' && <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />}
            {message.type === 'error' && <AlertCircle className="w-6 h-6 flex-shrink-0" />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* ===== TAB NAVIGATION ===== */}
        <div className={`${dk ? `bg-slate-800` : `bg-white`} rounded-xl sm:rounded-2xl ${dk ? 'shadow-slate-900/30' : 'shadow-sm'} border ${dk ? `border-slate-700` : `border-gray-200`} mb-6 overflow-hidden`}>
          <div className={`border-b ${dk ? 'border-slate-700' : 'border-gray-200'}`}>
            <nav className="flex overflow-x-auto scrollbar-hide profile-tabs-wrapper">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`profile-tab-button group flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 font-medium text-sm sm:text-base whitespace-nowrap transition-all flex-shrink-0 touch-target border-b-2 ${
                      isActive
                        ? `text-blue-600 border-blue-600 ${dk ? 'bg-blue-900/30' : 'bg-blue-50'}`
                        : `${dk ? 'text-slate-400' : 'text-gray-600'} ${dk ? 'hover:text-white' : 'hover:text-gray-900'} ${dk ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'} border-transparent`
                    }`}
                  >
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-4 sm:p-6 lg:p-8 profile-content-wrapper">

            {/* ==================== TAB 1: PERSONAL INFO ==================== */}
            {activeTab === 'personal' && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-3 rounded-xl">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>Personal Information</h2>
                    <p className={`${dk ? 'text-slate-400' : 'text-gray-500'} text-sm`}>Update your personal details and identity information</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group">
                    <label className={`flex items-center gap-2 text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-3`}>
                      <User className="w-4 h-4 text-blue-600" />
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={profile.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      className={`w-full p-4 border-2 ${dk ? `border-slate-700` : `border-gray-200`} rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300 ${dk ? `hover:border-slate-600` : `hover:border-gray-300`} font-medium ${dk ? `bg-slate-900` : `bg-white`} ${dk ? `text-white` : ``}`}
                      placeholder="Enter your full name as per PAN"
                      required
                    />
                  </div>

                  <div className="group">
                    <label className={`flex items-center gap-2 text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-3`}>
                      <Calendar className="w-4 h-4 text-blue-600" />
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={profile.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      className={`w-full p-4 border-2 ${dk ? `border-slate-700` : `border-gray-200`} rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300 ${dk ? `hover:border-slate-600` : `hover:border-gray-300`} font-medium ${dk ? `bg-slate-900` : `bg-white`} ${dk ? `text-white` : ``}`}
                    />
                  </div>

                  <div className="group">
                    <label className={`flex items-center gap-2 text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-3`}>
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      PAN Number
                    </label>
                    <input
                      type="text"
                      value={profile.panNumber}
                      onChange={(e) => handleInputChange('panNumber', e.target.value.toUpperCase())}
                      className={`w-full p-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all duration-300 ${dk ? 'hover:border-slate-600' : 'hover:border-gray-300'} font-medium uppercase ${dk ? 'bg-slate-900' : 'bg-white'} ${
                        profile.panNumber && !validatePAN(profile.panNumber)
                          ? `border-red-500 focus:border-red-500 ${dk ? 'bg-red-900/20' : 'bg-red-50'}`
                          : `${dk ? 'border-slate-700' : 'border-gray-200'} focus:border-blue-500`
                      } ${dk ? 'text-white' : ''}`}
                      placeholder="ABCDE1234F"
                      maxLength="10"
                    />
                    {profile.panNumber && !validatePAN(profile.panNumber) && (
                      <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Please enter a valid PAN number (e.g., ABCDE1234F)
                      </p>
                    )}
                  </div>

                  <div className="group">
                    <label className={`flex items-center gap-2 text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-3`}>
                      <Phone className="w-4 h-4 text-blue-600" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profile.phoneNumber || ''}
                      onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                      className={`w-full p-4 border-2 ${dk ? `border-slate-700` : `border-gray-200`} rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300 ${dk ? `hover:border-slate-600` : `hover:border-gray-300`} font-medium ${dk ? `bg-slate-900` : `bg-white`} ${dk ? `text-white` : ``}`}
                      placeholder="10-digit mobile number"
                      maxLength="10"
                      pattern="[0-9]{10}"
                    />
                    {profile.phoneNumber && !/^[0-9]{10}$/.test(profile.phoneNumber) && (
                      <p className="text-red-600 text-sm mt-1">Please enter a valid 10-digit phone number</p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-3`}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className={`w-full p-4 border-2 ${dk ? `border-slate-700` : `border-gray-200`} rounded-xl ${dk ? 'bg-slate-800/50' : 'bg-gray-50'} ${dk ? `text-slate-400` : `text-gray-500`} font-medium`}
                    />
                  </div>

                  <div className="group">
                    <label className={`block text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-3`}>
                      Gender
                    </label>
                    <select
                      value={profile.gender || ''}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className={`w-full p-4 border-2 ${dk ? `border-slate-700` : `border-gray-200`} rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300 ${dk ? `hover:border-slate-600` : `hover:border-gray-300`} font-medium ${dk ? `bg-slate-900` : `bg-white`} cursor-pointer ${dk ? `text-white` : ``}`}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>

                  <FormField label="Occupation" value={profile.occupation || ''} onChange={(v) => handleInputChange('occupation', v)} placeholder="e.g., Software Engineer" />
                  <FormField label="City" value={profile.city || ''} onChange={(v) => handleInputChange('city', v)} placeholder="e.g., Mumbai" />
                  <FormField label="State" value={profile.state || ''} onChange={(v) => handleInputChange('state', v)} placeholder="e.g., Maharashtra" />
                </div>

                <div className="group">
                  <label className={`block text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-3`}>Bio</label>
                  <textarea
                    value={profile.bio || ''}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    rows={3}
                    className={`w-full p-4 border-2 ${dk ? `border-slate-700` : `border-gray-200`} rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300 ${dk ? `hover:border-slate-600` : `hover:border-gray-300`} font-medium ${dk ? `bg-slate-900` : `bg-white`} resize-none ${dk ? `text-white` : ``}`}
                    placeholder="Write a short bio..."
                  />
                </div>
              </div>
            )}

            {/* ==================== TAB 2: FINANCIAL DETAILS ==================== */}
            {activeTab === 'financial' && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-3 rounded-xl">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>Financial Details</h2>
                    <p className={`${dk ? 'text-slate-400' : 'text-gray-500'} text-sm`}>Manage your income and currency preferences</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group">
                    <label className={`flex items-center gap-2 text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-3`}>
                      <DollarSign className="w-4 h-4 text-green-600" />
                      Monthly Income *
                    </label>
                    <input
                      type="number"
                      value={profile.monthlyIncome}
                      onChange={(e) => handleInputChange('monthlyIncome', e.target.value)}
                      className={`w-full p-4 border-2 ${dk ? `border-slate-700` : `border-gray-200`} rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-300 ${dk ? `hover:border-slate-600` : `hover:border-gray-300`} font-medium ${dk ? `bg-slate-900` : `bg-white`} ${dk ? `text-white` : ``}`}
                      placeholder="Enter your monthly income"
                      min="0"
                      step="0.01"
                    />
                    {incomeInfo.source === 'salary-transactions' && (
                      <div className={`mt-3 p-4 bg-gradient-to-br ${dk ? `from-green-900/20` : `from-green-50`} ${dk ? `to-emerald-900/20` : `to-emerald-50`} border-2 ${dk ? `border-green-800` : `border-green-200`} rounded-xl text-sm ${dk ? `text-green-400` : `text-green-800`} animate-scale-in`}>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold block">Auto-detected from {incomeInfo.transactionCount} salary transaction{incomeInfo.transactionCount !== 1 ? 's' : ''}</span>
                            {incomeInfo.lastSalaryDate && (
                              <div className={`text-xs mt-1 ${dk ? 'text-green-500' : 'text-green-600'}`}>
                                Last salary: {new Date(incomeInfo.lastSalaryDate).toLocaleDateString('en-IN')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {incomeInfo.source === 'profile-setting' && (
                      <div className={`mt-3 p-4 bg-gradient-to-br ${dk ? `from-blue-900/20` : `from-blue-50`} ${dk ? `to-cyan-900/20` : `to-cyan-50`} border-2 ${dk ? `border-blue-800` : `border-blue-200`} rounded-xl text-sm ${dk ? `text-blue-400` : `text-blue-800`} animate-scale-in`}>
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          <span className="font-medium">Manual entry - Connect Gmail to auto-detect from payslips</span>
                        </div>
                      </div>
                    )}
                    {incomeInfo.source === 'not-set' && (
                      <div className={`mt-3 p-4 bg-gradient-to-br ${dk ? `from-yellow-900/20` : `from-yellow-50`} ${dk ? `to-orange-900/20` : `to-orange-50`} border-2 ${dk ? `border-yellow-800` : `border-yellow-200`} rounded-xl text-sm ${dk ? `text-yellow-400` : `text-yellow-800`} animate-scale-in`}>
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                          <span className="font-medium">Not set - Enter manually or connect Gmail for auto-detection</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="group">
                    <label className={`flex items-center gap-2 text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-3`}>
                      <DollarSign className="w-4 h-4 text-green-600" />
                      Currency
                    </label>
                    <select
                      value={profile.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                      className={`w-full p-4 border-2 ${dk ? `border-slate-700` : `border-gray-200`} rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-300 ${dk ? `hover:border-slate-600` : `hover:border-gray-300`} font-medium ${dk ? `bg-slate-900` : `bg-white`} cursor-pointer ${dk ? `text-white` : ``}`}
                    >
                      {CURRENCIES.map(curr => (
                        <option key={curr.code} value={curr.code}>
                          {curr.symbol} {curr.name} ({curr.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 3: BUDGET & GOALS ==================== */}
            {activeTab === 'budget' && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-xl">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>Budget Limits & Savings Goals</h2>
                    <p className={`${dk ? 'text-slate-400' : 'text-gray-500'} text-sm`}>Set spending limits and define your financial goals</p>
                  </div>
                </div>

                {/* Budget Limits */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
                      <DollarSign className="w-5 h-5 text-purple-600" />
                      Monthly Budget Limits
                    </h3>
                    <button
                      onClick={handleAutoFillBudgets}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg"
                    >
                      <Sparkles className="w-4 h-4" />
                      Auto-fill from Salary
                    </button>
                  </div>
                  {profile.monthlyIncome > 0 && (
                    <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-500'} mb-4`}>
                      Based on your salary of ₹{parseFloat(profile.monthlyIncome).toLocaleString()}/month — click "Auto-fill" to set recommended budgets using the 50/30/20 rule
                    </p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {BUDGET_CATEGORIES.map(category => (
                      <div key={category} className="group">
                        <label className={`block text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-2`}>
                          {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </label>
                        <input
                          type="number"
                          value={profile.budgetLimits[category] || ''}
                          onChange={(e) => handleBudgetLimitChange(category, e.target.value)}
                          className={`w-full p-3 border-2 ${dk ? `border-slate-700` : `border-gray-200`} rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-300 ${dk ? `hover:border-slate-600` : `hover:border-gray-300`} font-medium ${dk ? `bg-slate-900` : `bg-white`} ${dk ? `text-white` : ``}`}
                          placeholder="0"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom Expense Categories */}
                <div className={`bg-gradient-to-br ${dk ? `from-purple-900/20` : `from-purple-50`} ${dk ? 'to-pink-900/20' : 'to-pink-50'} rounded-2xl p-6 border-2 ${dk ? `border-purple-800` : `border-purple-100`}`}>
                  <h3 className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                    <Target className="w-5 h-5 text-purple-600" />
                    Custom Expense Categories
                  </h3>

                  <div className={`${dk ? 'bg-slate-800/80' : 'bg-white/80'} backdrop-blur-sm border-2 ${dk ? 'border-purple-700' : 'border-purple-200'} rounded-xl p-4 mb-6`}>
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>Add your custom expense types</h4>
                        <p className={`${dk ? 'text-slate-400' : 'text-gray-600'} text-sm mt-1`}>
                          Create custom categories to better track your specific spending patterns (e.g., Bills, Rent, Loans, Pet Care)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Add New Category Form */}
                  <div className={`${dk ? `bg-slate-800` : `bg-white`} rounded-xl p-6 border-2 ${dk ? 'border-purple-700' : 'border-purple-200'} mb-6 ${dk ? `shadow-slate-900/30` : `shadow-sm`}`}>
                    <h4 className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Add New Category</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className={`block text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-2`}>Category Name</label>
                        <input
                          type="text"
                          value={newCategory.name}
                          onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                          className={`w-full p-3 border-2 ${dk ? `border-slate-700` : `border-gray-200`} rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-300 ${dk ? 'bg-slate-900' : 'bg-white'} ${dk ? `text-white` : ``}`}
                          placeholder="e.g., Rent, Bills, Loans"
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-2`}>Icon (Emoji)</label>
                        <input
                          type="text"
                          value={newCategory.icon}
                          onChange={(e) => setNewCategory({...newCategory, icon: e.target.value})}
                          className={`w-full p-3 border-2 ${dk ? 'border-slate-700' : 'border-gray-200'} rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-300 text-center text-2xl ${dk ? 'bg-slate-900' : 'bg-white'}`}
                          placeholder="🏠 💡 💳"
                          maxLength="2"
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-2`}>Keywords (comma-separated)</label>
                        <input
                          type="text"
                          value={newCategory.keywords}
                          onChange={(e) => setNewCategory({...newCategory, keywords: e.target.value})}
                          className={`w-full p-3 border-2 ${dk ? `border-slate-700` : `border-gray-200`} rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-300 ${dk ? 'bg-slate-900' : 'bg-white'} ${dk ? `text-white` : ``}`}
                          placeholder="rent, lease, apartment"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleAddCustomCategory}
                      disabled={!newCategory.name || !newCategory.icon}
                      className="mt-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 shadow-lg"
                    >
                      Add Category
                    </button>
                  </div>

                  {/* Existing Custom Categories */}
                  {profile.customCategories && profile.customCategories.length > 0 && (
                    <div>
                      <h4 className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Your Custom Categories</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {profile.customCategories.map((category, index) => (
                          <div key={index} className={`${dk ? `bg-slate-800` : `bg-white`} border-2 ${dk ? 'border-purple-700' : 'border-purple-200'} rounded-xl p-4 flex items-center justify-between ${dk ? `hover:shadow-slate-900/30` : `hover:shadow-lg`} transition-all duration-300 hover:scale-105 animate-scale-in`}>
                            <div className="flex items-center gap-3">
                              <span className="text-3xl">{category.icon}</span>
                              <div>
                                <p className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>{category.name}</p>
                                {category.keywords && category.keywords.length > 0 && (
                                  <p className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{category.keywords.join(', ')}</p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveCustomCategory(index)}
                              className="text-red-600 hover:text-red-800 hover:scale-110 transition-all duration-300"
                              title="Remove category"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Savings Goal */}
                <div className={`bg-gradient-to-br ${dk ? `from-green-900/20` : `from-green-50`} ${dk ? 'to-emerald-900/20' : 'to-emerald-50'} rounded-2xl p-6 border-2 ${dk ? `border-green-800` : `border-green-200`}`}>
                  <h3 className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                    <Target className="w-5 h-5 text-green-600" />
                    Savings Goal
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-2`}>Target Amount</label>
                      <input
                        type="number"
                        value={profile.savingsGoal.amount}
                        onChange={(e) => handleInputChange('savingsGoal.amount', e.target.value)}
                        className={`w-full p-3 border-2 ${dk ? `border-green-700` : `border-green-200`} ${dk ? 'bg-slate-900' : 'bg-white'} rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-300 font-medium ${dk ? `text-white` : ``}`}
                        placeholder="Enter target amount"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-2`}>Target Date</label>
                      <input
                        type="date"
                        value={profile.savingsGoal.deadline}
                        onChange={(e) => handleInputChange('savingsGoal.deadline', e.target.value)}
                        className={`w-full p-3 border-2 ${dk ? `border-green-700` : `border-green-200`} ${dk ? 'bg-slate-900' : 'bg-white'} rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-300 font-medium ${dk ? `text-white` : ``}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-2`}>Description</label>
                      <input
                        type="text"
                        value={profile.savingsGoal.description}
                        onChange={(e) => handleInputChange('savingsGoal.description', e.target.value)}
                        className={`w-full p-3 border-2 ${dk ? `border-green-700` : `border-green-200`} ${dk ? 'bg-slate-900' : 'bg-white'} rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-300 font-medium ${dk ? `text-white` : ``}`}
                        placeholder="e.g., Emergency fund, Vacation"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 4: PREFERENCES ==================== */}
            {activeTab === 'preferences' && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-3 rounded-xl">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>Preferences</h2>
                    <p className={`${dk ? 'text-slate-400' : 'text-gray-500'} text-sm`}>Customize your experience and analysis settings</p>
                  </div>
                </div>

                {/* AI Provider (backend-saved) */}
                <div className={`bg-gradient-to-br ${dk ? `from-indigo-900/20` : `from-indigo-50`} ${dk ? 'to-purple-900/20' : 'to-purple-50'} rounded-2xl p-6 border-2 ${dk ? `border-indigo-800` : `border-indigo-200`}`}>
                  <h3 className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                    <Zap className="w-5 h-5 text-indigo-600" />
                    AI Analysis Provider
                  </h3>
                  <div className="space-y-3">
                    <label className={`flex items-center p-4 border-2 ${dk ? 'border-slate-700' : 'border-gray-200'} rounded-xl hover:border-indigo-300 transition-all duration-300 cursor-pointer ${dk ? 'bg-slate-800' : 'bg-white'}`}>
                      <input
                        type="radio"
                        name="aiProvider"
                        value="ollama"
                        checked={profile.preferences.aiProvider === 'ollama'}
                        onChange={(e) => handleInputChange('preferences.aiProvider', e.target.value)}
                        className="w-5 h-5 text-indigo-600 mr-4"
                      />
                      <div>
                        <span className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>Ollama (Local AI)</span>
                        <span className={`ml-2 text-xs ${dk ? 'bg-green-900/40' : 'bg-green-100'} ${dk ? 'text-green-400' : 'text-green-700'} px-2 py-1 rounded-full font-medium`}>Free</span>
                        <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'} mt-1`}>Run AI analysis locally on your machine</p>
                      </div>
                    </label>
                    <label className={`flex items-center p-4 border-2 ${dk ? 'border-slate-700' : 'border-gray-200'} rounded-xl hover:border-indigo-300 transition-all duration-300 cursor-pointer ${dk ? 'bg-slate-800' : 'bg-white'}`}>
                      <input
                        type="radio"
                        name="aiProvider"
                        value="openai"
                        checked={profile.preferences.aiProvider === 'openai'}
                        onChange={(e) => handleInputChange('preferences.aiProvider', e.target.value)}
                        className="w-5 h-5 text-indigo-600 mr-4"
                      />
                      <div>
                        <span className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>OpenAI</span>
                        <span className={`ml-2 text-xs ${dk ? 'bg-blue-900/40' : 'bg-blue-100'} ${dk ? 'text-blue-400' : 'text-blue-700'} px-2 py-1 rounded-full font-medium`}>API Key Required</span>
                        <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'} mt-1`}>Use OpenAI's powerful cloud-based AI</p>
                      </div>
                    </label>
                  </div>
                  {profile.preferences.aiProvider === 'openai' && (
                    <div className="mt-4 animate-scale-in">
                      <label className={`block text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-2`}>OpenAI API Key</label>
                      <input
                        type="password"
                        value={profile.preferences.openAIKey}
                        onChange={(e) => handleInputChange('preferences.openAIKey', e.target.value)}
                        className={`w-full p-3 border-2 ${dk ? `border-slate-700` : `border-gray-200`} rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-300 font-medium ${dk ? 'bg-slate-900' : 'bg-white'} ${dk ? `text-white` : ``}`}
                        placeholder="sk-..."
                      />
                      <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-500'} mt-2 flex items-center gap-2`}>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Your API key is encrypted and stored securely
                      </p>
                    </div>
                  )}
                </div>

                {/* Auto-fetch settings (backend-saved) */}
                <div className={`bg-gradient-to-br ${dk ? `from-green-900/20` : `from-green-50`} ${dk ? 'to-emerald-900/20' : 'to-emerald-50'} rounded-2xl p-6 border-2 ${dk ? `border-green-800` : `border-green-200`}`}>
                  <h3 className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                    <RefreshCw className="w-5 h-5 text-green-600" />
                    Auto-fetch Settings
                  </h3>
                  <div className="space-y-4">
                    <label className={`flex items-center justify-between p-4 border-2 ${dk ? 'border-slate-700' : 'border-gray-200'} rounded-xl hover:border-green-300 transition-all duration-300 cursor-pointer ${dk ? 'bg-slate-800' : 'bg-white'}`}>
                      <div>
                        <span className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>Automatic Gmail Sync</span>
                        <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'} mt-1`}>Automatically fetch documents from Gmail</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={profile.preferences.autoFetchDocuments}
                        onChange={(e) => handleInputChange('preferences.autoFetchDocuments', e.target.checked)}
                        className="w-6 h-6 text-green-600 rounded focus:ring-4 focus:ring-green-100"
                      />
                    </label>
                    {profile.preferences.autoFetchDocuments && (
                      <div className="animate-scale-in">
                        <label className={`block text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-2`}>Sync Frequency</label>
                        <select
                          value={profile.preferences.fetchFrequency}
                          onChange={(e) => handleInputChange('preferences.fetchFrequency', e.target.value)}
                          className={`w-full p-3 border-2 ${dk ? `border-green-700` : `border-green-200`} ${dk ? 'bg-slate-900' : 'bg-white'} rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-300 font-medium cursor-pointer ${dk ? `text-white` : ``}`}
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Regional Settings (localStorage) */}
                <div className={`bg-gradient-to-br ${dk ? `from-blue-900/20` : `from-blue-50`} ${dk ? 'to-cyan-900/20' : 'to-cyan-50'} rounded-2xl p-6 border-2 ${dk ? `border-blue-800` : `border-blue-200`}`}>
                  <h3 className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                    <Globe className="w-5 h-5 text-blue-600" />
                    Regional Settings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-2`}>Display Currency</label>
                      <select value={displayPrefs.currency} onChange={(e) => setDisplayPrefs(p => ({ ...p, currency: e.target.value }))} className={`w-full p-3 border-2 ${dk ? `border-slate-700` : `border-gray-200`} rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${dk ? 'bg-slate-900' : 'bg-white'} font-medium cursor-pointer ${dk ? `text-white` : ``}`}>
                        {CURRENCIES.map(c => (
                          <option key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-2`}>Language</label>
                      <select value={displayPrefs.language} onChange={(e) => setDisplayPrefs(p => ({ ...p, language: e.target.value }))} className={`w-full p-3 border-2 ${dk ? `border-slate-700` : `border-gray-200`} rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${dk ? 'bg-slate-900' : 'bg-white'} font-medium cursor-pointer ${dk ? `text-white` : ``}`}>
                        {LANGUAGES.map(l => (
                          <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-2`}>Date Format</label>
                      <select value={displayPrefs.dateFormat} onChange={(e) => setDisplayPrefs(p => ({ ...p, dateFormat: e.target.value }))} className={`w-full p-3 border-2 ${dk ? `border-slate-700` : `border-gray-200`} rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${dk ? 'bg-slate-900' : 'bg-white'} font-medium cursor-pointer ${dk ? `text-white` : ``}`}>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-2`}>Fiscal Year Start</label>
                      <select value={displayPrefs.fiscalYearStart} onChange={(e) => setDisplayPrefs(p => ({ ...p, fiscalYearStart: e.target.value }))} className={`w-full p-3 border-2 ${dk ? `border-slate-700` : `border-gray-200`} rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${dk ? 'bg-slate-900' : 'bg-white'} font-medium cursor-pointer ${dk ? `text-white` : ``}`}>
                        <option value="january">January</option>
                        <option value="april">April (India)</option>
                        <option value="july">July</option>
                        <option value="october">October</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Display Preferences (localStorage) */}
                <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 border-2 ${dk ? 'border-slate-700' : 'border-gray-200'}`}>
                  <h3 className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                    <Eye className={`w-5 h-5 ${dk ? 'text-gray-300' : 'text-gray-600'}`} />
                    Display Preferences
                  </h3>
                  <div className="space-y-3">
                    <ToggleSetting label="Compact Numbers" description="Show 1.2L instead of 1,20,000" value={displayPrefs.compactNumbers} onChange={(v) => setDisplayPrefs(p => ({ ...p, compactNumbers: v }))} />
                    <ToggleSetting label="Show Decimals" description="Display paisa/cents in amounts" value={displayPrefs.showDecimal} onChange={(v) => setDisplayPrefs(p => ({ ...p, showDecimal: v }))} />
                    <ToggleSetting label="Auto Round-Up" description="Automatically round up transactions" value={displayPrefs.autoRoundUp} onChange={(v) => setDisplayPrefs(p => ({ ...p, autoRoundUp: v }))} />
                    <ToggleSetting label="Enable Animations" description="Smooth transitions and animations" value={displayPrefs.enableAnimations} onChange={(v) => setDisplayPrefs(p => ({ ...p, enableAnimations: v }))} />
                    <ToggleSetting label="Enable Sounds" description="Play sounds for notifications" value={displayPrefs.enableSounds} onChange={(v) => setDisplayPrefs(p => ({ ...p, enableSounds: v }))} />
                    <ToggleSetting label="Auto Save" description="Automatically save form changes" value={displayPrefs.autoSave} onChange={(v) => setDisplayPrefs(p => ({ ...p, autoSave: v }))} />
                    <ToggleSetting label="Welcome Message" description="Show welcome message on login" value={displayPrefs.showWelcomeMessage} onChange={(v) => setDisplayPrefs(p => ({ ...p, showWelcomeMessage: v }))} />
                  </div>
                </div>

                {/* Default Settings (localStorage) */}
                <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 border-2 ${dk ? 'border-slate-700' : 'border-gray-200'}`}>
                  <h3 className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                    <Settings className={`w-5 h-5 ${dk ? 'text-gray-300' : 'text-gray-600'}`} />
                    Default Settings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-2`}>Default Dashboard</label>
                      <select value={displayPrefs.defaultDashboard} onChange={(e) => setDisplayPrefs(p => ({ ...p, defaultDashboard: e.target.value }))} className={`w-full p-3 border-2 ${dk ? `border-slate-700` : `border-gray-200`} rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${dk ? 'bg-slate-900' : 'bg-white'} font-medium cursor-pointer ${dk ? `text-white` : ``}`}>
                        <option value="overview">Overview</option>
                        <option value="analytics">Analytics</option>
                        <option value="goals">Goals</option>
                        <option value="budget">Budget</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-2`}>Default Time Range</label>
                      <select value={displayPrefs.defaultTimeRange} onChange={(e) => setDisplayPrefs(p => ({ ...p, defaultTimeRange: e.target.value }))} className={`w-full p-3 border-2 ${dk ? `border-slate-700` : `border-gray-200`} rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${dk ? 'bg-slate-900' : 'bg-white'} font-medium cursor-pointer ${dk ? `text-white` : ``}`}>
                        <option value="7d">7 Days</option>
                        <option value="30d">30 Days</option>
                        <option value="90d">90 Days</option>
                        <option value="1y">1 Year</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-2`}>Items Per Page</label>
                      <select value={displayPrefs.itemsPerPage} onChange={(e) => setDisplayPrefs(p => ({ ...p, itemsPerPage: Number(e.target.value) }))} className={`w-full p-3 border-2 ${dk ? `border-slate-700` : `border-gray-200`} rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${dk ? 'bg-slate-900' : 'bg-white'} font-medium cursor-pointer ${dk ? `text-white` : ``}`}>
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 5: NOTIFICATIONS ==================== */}
            {activeTab === 'notifications' && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-br from-orange-500 to-red-500 p-3 rounded-xl">
                    <Bell className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>Notifications</h2>
                    <p className={`${dk ? 'text-slate-400' : 'text-gray-500'} text-sm`}>Configure how you want to be notified</p>
                  </div>
                </div>

                {/* Basic alerts (backend-saved) */}
                <div className={`bg-gradient-to-br ${dk ? `from-blue-900/20` : `from-blue-50`} ${dk ? 'to-cyan-900/20' : 'to-cyan-50'} rounded-2xl p-6 border-2 ${dk ? `border-blue-800` : `border-blue-200`}`}>
                  <h3 className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                    <Mail className="w-5 h-5 text-blue-600" />
                    Core Alert Settings
                    <span className={`text-xs ${dk ? 'bg-blue-900/40' : 'bg-blue-100'} ${dk ? 'text-blue-400' : 'text-blue-600'} px-2 py-1 rounded-full`}>synced</span>
                  </h3>
                  <div className="space-y-4">
                    <label className={`flex items-center justify-between p-4 border-2 ${dk ? 'border-slate-700' : 'border-gray-200'} rounded-xl hover:border-blue-300 transition-all duration-300 cursor-pointer ${dk ? 'bg-slate-800' : 'bg-white'}`}>
                      <div>
                        <span className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>Email Notifications</span>
                        <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'} mt-1`}>Get notified when analysis is complete</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={profile.preferences.emailNotifications}
                        onChange={(e) => handleInputChange('preferences.emailNotifications', e.target.checked)}
                        className="w-6 h-6 text-blue-600 rounded focus:ring-4 focus:ring-blue-100"
                      />
                    </label>
                    <label className={`flex items-center justify-between p-4 border-2 ${dk ? 'border-slate-700' : 'border-gray-200'} rounded-xl hover:border-blue-300 transition-all duration-300 cursor-pointer ${dk ? 'bg-slate-800' : 'bg-white'}`}>
                      <div>
                        <span className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>Budget Limit Alerts</span>
                        <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'} mt-1`}>Get alerts when you exceed budget limits</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={profile.preferences.budgetAlerts}
                        onChange={(e) => handleInputChange('preferences.budgetAlerts', e.target.checked)}
                        className="w-6 h-6 text-blue-600 rounded focus:ring-4 focus:ring-blue-100"
                      />
                    </label>
                  </div>
                </div>

                {/* Granular Email Notifications (localStorage) */}
                <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 border-2 ${dk ? 'border-slate-700' : 'border-gray-200'}`}>
                  <h3 className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>📧 Email Notification Details</h3>
                  <div className="space-y-3">
                    <ToggleSetting label="Email Notifications" description="Master toggle for email notifications" value={notifications.email.enabled} onChange={(v) => setNotifications(p => ({ ...p, email: { ...p.email, enabled: v } }))} />
                    {notifications.email.enabled && (
                      <div className={`pl-4 border-l-2 ${dk ? 'border-gray-700' : 'border-gray-200'} space-y-3 mt-2`}>
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
                </div>

                {/* Push Notifications */}
                <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 border-2 ${dk ? 'border-slate-700' : 'border-gray-200'}`}>
                  <h3 className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>🔔 Push Notifications</h3>
                  <div className="space-y-3">
                    <ToggleSetting label="Push Notifications" description="Browser/mobile push notifications" value={notifications.push.enabled} onChange={(v) => setNotifications(p => ({ ...p, push: { ...p.push, enabled: v } }))} />
                    {notifications.push.enabled && (
                      <div className={`pl-4 border-l-2 ${dk ? 'border-gray-700' : 'border-gray-200'} space-y-3 mt-2`}>
                        <ToggleSetting label="Bill Reminders" value={notifications.push.billReminders} onChange={(v) => setNotifications(p => ({ ...p, push: { ...p.push, billReminders: v } }))} />
                        <ToggleSetting label="Budget Alerts" value={notifications.push.budgetAlerts} onChange={(v) => setNotifications(p => ({ ...p, push: { ...p.push, budgetAlerts: v } }))} />
                        <ToggleSetting label="Transaction Alerts" value={notifications.push.transactionAlerts} onChange={(v) => setNotifications(p => ({ ...p, push: { ...p.push, transactionAlerts: v } }))} />
                        <ToggleSetting label="Price Alerts" value={notifications.push.priceAlerts} onChange={(v) => setNotifications(p => ({ ...p, push: { ...p.push, priceAlerts: v } }))} />
                      </div>
                    )}
                  </div>
                </div>

                {/* SMS Notifications */}
                <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 border-2 ${dk ? 'border-slate-700' : 'border-gray-200'}`}>
                  <h3 className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>📱 SMS Notifications</h3>
                  <div className="space-y-3">
                    <ToggleSetting label="SMS Notifications" description="Text message alerts" value={notifications.sms.enabled} onChange={(v) => setNotifications(p => ({ ...p, sms: { ...p.sms, enabled: v } }))} />
                    {notifications.sms.enabled && (
                      <div className={`pl-4 border-l-2 ${dk ? 'border-gray-700' : 'border-gray-200'} space-y-3 mt-2`}>
                        <ToggleSetting label="Bill Reminders" value={notifications.sms.billReminders} onChange={(v) => setNotifications(p => ({ ...p, sms: { ...p.sms, billReminders: v } }))} />
                        <ToggleSetting label="Security Alerts" value={notifications.sms.securityAlerts} onChange={(v) => setNotifications(p => ({ ...p, sms: { ...p.sms, securityAlerts: v } }))} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 6: INTEGRATIONS (Gmail + Drive) ==================== */}
            {activeTab === 'integrations' && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-br from-red-500 to-orange-500 p-3 rounded-xl">
                    <Link className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>Integrations</h2>
                    <p className={`${dk ? 'text-slate-400' : 'text-gray-500'} text-sm`}>Connect external services for automatic syncing</p>
                  </div>
                </div>

                {/* Gmail Integration */}
                <div className={`bg-gradient-to-br ${dk ? `from-blue-900/20` : `from-blue-50`} ${dk ? 'to-cyan-900/20' : 'to-cyan-50'} border-2 ${dk ? `border-blue-800` : `border-blue-200`} rounded-2xl p-6 mb-6`}>
                  <div className="flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className={`font-semibold ${dk ? 'text-blue-300' : 'text-blue-900'} text-lg`}>Gmail Integration</h3>
                      <p className={`${dk ? 'text-blue-400' : 'text-blue-700'} text-sm mt-2 leading-relaxed`}>
                        Connect your Gmail account to automatically fetch financial documents like bank statements,
                        credit card statements, and receipts from your email.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`${dk ? `bg-slate-800` : `bg-white`} rounded-2xl ${dk ? 'shadow-slate-900/30' : 'shadow-lg'} border-2 ${dk ? `border-slate-700` : `border-gray-200`} p-8`}>
                  {gmailStatus.isConnected ? (
                    <div>
                      <div className={`flex items-center justify-between mb-6 pb-6 border-b-2 ${dk ? 'border-slate-700' : 'border-gray-100'}`}>
                        <div className="flex items-center gap-4">
                          <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-4 rounded-2xl">
                            <CheckCircle className="w-8 h-8 text-white" />
                          </div>
                          <div>
                            <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>Connected</h3>
                            <p className={`${dk ? 'text-slate-400' : 'text-gray-600'} mt-1`}>{gmailStatus.email}</p>
                            {gmailStatus.lastSync && (
                              <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-500'} mt-1`}>
                                Last synced: {new Date(gmailStatus.lastSync).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={syncGmail}
                            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 shadow-lg flex items-center gap-2"
                            disabled={!hasReadonlyScope}
                          >
                            <RefreshCw className="w-5 h-5" />
                            Sync Now
                          </button>
                          <button
                            onClick={disconnectGmail}
                            className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-red-700 hover:to-rose-700 transition-all duration-300 hover:scale-105 shadow-lg flex items-center gap-2"
                          >
                            <Mail className="w-5 h-5" />
                            Disconnect
                          </button>
                        </div>
                      </div>

                      <div className="mt-6 space-y-4">
                        {!hasReadonlyScope && (
                          <div className={`bg-gradient-to-br ${dk ? `from-yellow-900/20` : `from-yellow-50`} ${dk ? 'to-orange-900/20' : 'to-orange-50'} border-2 ${dk ? `border-yellow-800` : `border-yellow-300`} rounded-xl p-5 animate-scale-in`}>
                            <div className="flex items-start gap-3">
                              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                              <div>
                                <p className={`font-semibold ${dk ? 'text-yellow-300' : 'text-yellow-900'} text-sm`}>Missing Required Permissions</p>
                                <p className={`${dk ? 'text-yellow-400' : 'text-yellow-700'} text-sm mt-1`}>
                                  Gmail read permission missing. Remove "Financial Analyzer" from <a className={`underline ${dk ? 'hover:text-yellow-200' : 'hover:text-yellow-900'}`} href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">Google account permissions</a> and reconnect to grant full access.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        {gmailStatus.grantedScopes && gmailStatus.grantedScopes.length > 0 && (
                          <div className={`${dk ? 'bg-slate-900' : 'bg-gray-50'} rounded-xl p-5 border-2 ${dk ? 'border-slate-700' : 'border-gray-200'}`}>
                            <h4 className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-3 flex items-center gap-2`}>
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              Granted Permissions
                            </h4>
                            <ul className="space-y-2">
                              {gmailStatus.grantedScopes.map(scope => (
                                <li key={scope} className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'} flex items-center gap-2`}>
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                  {scope}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className={`bg-gradient-to-br ${dk ? 'from-slate-700' : 'from-gray-100'} ${dk ? 'to-slate-600' : 'to-gray-200'} w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6`}>
                        <Mail className={`w-12 h-12 ${dk ? 'text-slate-500' : 'text-gray-400'}`} />
                      </div>
                      <h3 className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-3`}>Connect Gmail Account</h3>
                      <p className={`${dk ? 'text-slate-400' : 'text-gray-600'} mb-6 max-w-md mx-auto`}>
                        Automatically fetch financial documents from your Gmail account including bank statements, credit card bills, and receipts
                      </p>
                      <button
                        onClick={connectGmail}
                        className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-8 py-4 rounded-xl hover:from-red-700 hover:to-orange-700 font-semibold text-lg transition-all duration-300 hover:scale-105 shadow-xl flex items-center gap-3 mx-auto"
                      >
                        <Mail className="w-6 h-6" />
                        Connect Gmail
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ==================== TAB 7: SECURITY ==================== */}
            {activeTab === 'security' && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-br from-red-500 to-pink-500 p-3 rounded-xl">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>Privacy & Security</h2>
                    <p className={`${dk ? 'text-slate-400' : 'text-gray-500'} text-sm`}>Manage your security settings and privacy controls</p>
                  </div>
                </div>

                {/* Security Toggles */}
                <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 border-2 ${dk ? 'border-slate-700' : 'border-gray-200'}`}>
                  <h3 className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                    <Lock className="w-5 h-5 text-red-600" />
                    Security
                  </h3>
                  <div className="space-y-3">
                    <ToggleSetting label="Two-Factor Authentication" description="Extra security with OTP on login" value={privacy.twoFactorAuth} onChange={(v) => setPrivacy(p => ({ ...p, twoFactorAuth: v }))} />
                    <ToggleSetting label="Biometric Login" description="Use fingerprint or face recognition" value={privacy.biometricLogin} onChange={(v) => setPrivacy(p => ({ ...p, biometricLogin: v }))} />
                    <ToggleSetting label="Login Notifications" description="Get alerted on new device logins" value={privacy.loginNotifications} onChange={(v) => setPrivacy(p => ({ ...p, loginNotifications: v }))} />
                    <ToggleSetting label="Data Encryption" description="Encrypt sensitive financial data" value={privacy.dataEncryption} onChange={(v) => setPrivacy(p => ({ ...p, dataEncryption: v }))} />
                    <div className="pt-2">
                      <label className={`block text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-2`}>Session Timeout</label>
                      <select value={privacy.sessionTimeout} onChange={(e) => setPrivacy(p => ({ ...p, sessionTimeout: Number(e.target.value) }))} className={`w-full max-w-xs p-3 border-2 ${dk ? `border-slate-700` : `border-gray-200`} rounded-xl focus:ring-4 focus:ring-red-100 focus:border-red-500 transition-all ${dk ? 'bg-slate-900' : 'bg-white'} font-medium cursor-pointer ${dk ? `text-white` : ``}`}>
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="60">1 hour</option>
                        <option value="120">2 hours</option>
                        <option value="0">Never</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Privacy */}
                <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 border-2 ${dk ? 'border-slate-700' : 'border-gray-200'}`}>
                  <h3 className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                    <Eye className="w-5 h-5 text-blue-600" />
                    Privacy
                  </h3>
                  <div className="space-y-3">
                    <div className="pt-2">
                      <label className={`block text-sm font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'} mb-2`}>Profile Visibility</label>
                      <select value={privacy.profileVisibility} onChange={(e) => setPrivacy(p => ({ ...p, profileVisibility: e.target.value }))} className={`w-full max-w-xs p-3 border-2 ${dk ? `border-slate-700` : `border-gray-200`} rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${dk ? 'bg-slate-900' : 'bg-white'} font-medium cursor-pointer ${dk ? `text-white` : ``}`}>
                        <option value="private">Private - Only me</option>
                        <option value="friends">Friends only</option>
                        <option value="public">Public</option>
                      </select>
                    </div>
                    <ToggleSetting label="Show on Leaderboard" description="Display your name on savings leaderboards" value={privacy.showOnLeaderboard} onChange={(v) => setPrivacy(p => ({ ...p, showOnLeaderboard: v }))} />
                    <ToggleSetting label="Share Analytics" description="Help improve the app by sharing usage analytics" value={privacy.shareAnalytics} onChange={(v) => setPrivacy(p => ({ ...p, shareAnalytics: v }))} />
                  </div>
                </div>

                {/* Password & Auth */}
                <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 border-2 ${dk ? 'border-slate-700' : 'border-gray-200'}`}>
                  <h3 className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                    <Lock className="w-5 h-5 text-purple-600" />
                    Password & Authentication
                  </h3>
                  <div className="space-y-3">
                    <button className={`w-full text-left p-4 rounded-xl ${dk ? `bg-slate-900` : `bg-gray-50`} ${dk ? 'hover:bg-slate-700' : 'hover:bg-gray-100'} transition-colors flex items-center justify-between group border-2 ${dk ? `border-slate-700` : `border-gray-200`}`}>
                      <div>
                        <div className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>Change Password</div>
                        <div className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Update your account password</div>
                      </div>
                      <span className="text-gray-400 group-hover:text-blue-600 transition-colors text-xl">→</span>
                    </button>
                    <button className={`w-full text-left p-4 rounded-xl ${dk ? `bg-slate-900` : `bg-gray-50`} ${dk ? 'hover:bg-slate-700' : 'hover:bg-gray-100'} transition-colors flex items-center justify-between group border-2 ${dk ? `border-slate-700` : `border-gray-200`}`}>
                      <div>
                        <div className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>Active Sessions</div>
                        <div className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Manage your logged-in devices</div>
                      </div>
                      <span className="text-gray-400 group-hover:text-blue-600 transition-colors text-xl">→</span>
                    </button>
                    <button className={`w-full text-left p-4 rounded-xl ${dk ? `bg-slate-900` : `bg-gray-50`} ${dk ? 'hover:bg-slate-700' : 'hover:bg-gray-100'} transition-colors flex items-center justify-between group border-2 ${dk ? `border-slate-700` : `border-gray-200`}`}>
                      <div>
                        <div className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>Connected Accounts</div>
                        <div className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Google, GitHub</div>
                      </div>
                      <span className="text-gray-400 group-hover:text-blue-600 transition-colors text-xl">→</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 8: APPEARANCE ==================== */}
            {activeTab === 'appearance' && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-br from-pink-500 to-violet-500 p-3 rounded-xl">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>Appearance</h2>
                    <p className={`${dk ? 'text-slate-400' : 'text-gray-500'} text-sm`}>Customize the look and feel of the app</p>
                  </div>
                </div>

                {/* Theme */}
                <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 border-2 ${dk ? 'border-slate-700' : 'border-gray-200'}`}>
                  <h3 className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                    🌓 Theme
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { value: 'light', label: 'Light', icon: '☀️' },
                      { value: 'dark', label: 'Dark', icon: '🌙' },
                      { value: 'system', label: 'System', icon: '💻' },
                    ].map(theme => (
                      <button
                        key={theme.value}
                        onClick={() => {
                          if (theme.value === 'dark' && !darkMode) toggleTheme();
                          if (theme.value === 'light' && darkMode) toggleTheme();
                        }}
                        className={`p-6 rounded-xl text-center border-2 transition-all ${
                          (darkMode && theme.value === 'dark') || (!darkMode && theme.value === 'light')
                            ? `ring-2 ring-blue-500 ${dk ? 'border-blue-600' : 'border-blue-300'}`
                            : `${dk ? 'border-gray-700' : 'border-gray-200'} ${dk ? 'hover:border-gray-600' : 'hover:border-gray-300'}`
                        }`}
                      >
                        <span className="text-3xl block mb-2">{theme.icon}</span>
                        <span className={`font-medium ${dk ? 'text-white' : 'text-gray-900'}`}>{theme.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 border-2 ${dk ? 'border-slate-700' : 'border-gray-200'}`}>
                  <h3 className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>🔤 Font Size</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {FONT_SIZES.map(size => (
                      <button
                        key={size.value}
                        onClick={() => setDisplayPrefs(p => ({ ...p, fontSize: size.value }))}
                        className={`p-4 rounded-xl text-center transition-all border-2 ${
                          displayPrefs.fontSize === size.value
                            ? `${dk ? 'border-blue-600' : 'border-blue-300'} ${dk ? 'bg-blue-900/20' : 'bg-blue-50'}`
                            : `${dk ? 'border-gray-700' : 'border-gray-200'} ${dk ? 'hover:border-gray-600' : 'hover:border-gray-300'}`
                        }`}
                      >
                        <span style={{ fontSize: `${size.px}px` }} className={`font-medium ${dk ? 'text-white' : 'text-gray-900'} block mb-1`}>Aa</span>
                        <span className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{size.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent Color */}
                <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 border-2 ${dk ? 'border-slate-700' : 'border-gray-200'}`}>
                  <h3 className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>🎨 Accent Color</h3>
                  <div className="flex gap-3 flex-wrap">
                    {['#3B82F6', '#8B5CF6', '#10B981', '#EF4444', '#F59E0B', '#EC4899', '#6366F1', '#14B8A6'].map(color => (
                      <button
                        key={color}
                        className="w-10 h-10 rounded-full transition-transform hover:scale-110 shadow-md hover:shadow-lg"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 9: DATA MANAGEMENT ==================== */}
            {activeTab === 'data' && (
              <DataManagementTab />
            )}

          </div>
        </div>
      </div>
    </div>
    </PageTransition>
    </MainLayout>
  );
};

// ======================== DATA MANAGEMENT TAB ========================

function DataManagementTab() {
  const { mode: _mode } = useTheme();
  const dk = _mode === 'dark' || _mode === 'black';
  const [driveStatus, setDriveStatus] = useState({ configured: false, connected: false, backup: null });
  const [dataCounts, setDataCounts] = useState({ transactions: 0, documents: 0, budgets: 0 });
  const [loading, setLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Database backup state
  const [backups, setBackups] = useState([]);
  const [backupSchedule, setBackupSchedule] = useState({ enabled: false, frequency: 'weekly', retentionCount: { daily: 7, weekly: 4, monthly: 6 } });
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [createBackupLoading, setCreateBackupLoading] = useState(false);
  const [restoreId, setRestoreId] = useState(null);
  const [restoreStrategy, setRestoreStrategy] = useState('merge');
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showUploadRestore, setShowUploadRestore] = useState(false);

  // Handle OAuth callback from Google Drive
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const driveTokens = params.get('drive_tokens');
    const driveSuccess = params.get('drive_success');
    const driveError = params.get('drive_error');

    if (driveSuccess && driveTokens) {
      try {
        const tokens = JSON.parse(atob(driveTokens));
        api.post('/drive/save-tokens', { tokens }).then(() => {
          setMessage({ type: 'success', text: 'Google Drive connected successfully!' });
          loadDriveStatus();
          window.history.replaceState({}, '', window.location.pathname);
        }).catch(() => {
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
      const res = await api.get('/drive/status');
      setDriveStatus(res.data);
    } catch (err) {
      console.log('Drive status not available');
    }
  }, []);

  const loadDataCounts = useCallback(async () => {
    try {
      const [txRes, budgetRes] = await Promise.allSettled([
        api.get('/transactions?limit=1'),
        api.get('/budgets'),
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

  const loadBackups = useCallback(async () => {
    try {
      const res = await api.get('/backup/list');
      if (res.data.success) setBackups(res.data.backups || []);
    } catch (err) {
      console.log('Backup list not available');
    }
  }, []);

  const loadSchedule = useCallback(async () => {
    try {
      const res = await api.get('/backup/schedule');
      if (res.data.success) setBackupSchedule(res.data.schedule);
    } catch (err) {
      console.log('Backup schedule not available');
    }
  }, []);

  useEffect(() => {
    Promise.all([loadDriveStatus(), loadDataCounts(), loadBackups(), loadSchedule()]).finally(() => setLoading(false));
  }, [loadDriveStatus, loadDataCounts, loadBackups, loadSchedule]);

  const connectDrive = async () => {
    try {
      const res = await api.get('/drive/auth-url');
      window.location.href = res.data.url;
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to start Drive connection.' });
    }
  };

  const disconnectDrive = async () => {
    try {
      await api.post('/drive/disconnect');
      setDriveStatus(prev => ({ ...prev, connected: false, backup: null }));
      setMessage({ type: 'success', text: 'Google Drive disconnected.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to disconnect Drive.' });
    }
  };

  const backupToDrive = async () => {
    setBackupLoading(true);
    try {
      const res = await api.post('/drive/backup');
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
      const res = await api.post('/drive/restore');
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

  const createDatabaseBackup = async () => {
    setCreateBackupLoading(true);
    try {
      const res = await api.post('/backup/create');
      if (res.data.success) {
        setMessage({ type: 'success', text: `Backup created! ${res.data.backup.totalDocuments} documents from ${res.data.backup.totalCollections} collections.` });
        loadBackups();
      } else {
        setMessage({ type: 'error', text: res.data.message || 'Backup failed.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to create backup.' });
    } finally {
      setCreateBackupLoading(false);
    }
  };

  const exportBackup = async () => {
    setExportLoading(true);
    try {
      const res = await api.get('/backup/export', { responseType: 'blob' });
      const disposition = res.headers['content-disposition'];
      let filename = 'FinancialAnalyzer_Backup.json';
      if (disposition) {
        const match = disposition.match(/filename="?(.+?)"?$/);
        if (match) filename = match[1];
      }
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Backup exported and downloaded!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to export backup.' });
    } finally {
      setExportLoading(false);
    }
  };

  const downloadBackup = async (id, filename) => {
    try {
      const res = await api.get(`/backup/download/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to download backup.' });
    }
  };

  const restoreFromServerBackup = async () => {
    if (!restoreId) return;
    if (!window.confirm(`This will restore from the selected backup using "${restoreStrategy}" strategy. Continue?`)) return;
    setRestoreLoading(true);
    setShowRestoreModal(false);
    try {
      const res = await api.post(`/backup/restore/${restoreId}`, { strategy: restoreStrategy });
      if (res.data.success) {
        setMessage({ type: 'success', text: `Restored ${res.data.results.totalRestored} documents. ${res.data.results.totalSkipped} skipped.` });
        setTimeout(() => window.location.reload(), 2500);
      } else {
        setMessage({ type: 'error', text: res.data.message || 'Restore failed.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Restore failed.' });
    } finally {
      setRestoreLoading(false);
    }
  };

  const restoreFromUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!window.confirm(`Restore from "${file.name}" using "${restoreStrategy}" strategy? This may overwrite existing data.`)) {
      e.target.value = '';
      return;
    }
    setRestoreLoading(true);
    try {
      const formData = new FormData();
      formData.append('backup', file);
      formData.append('strategy', restoreStrategy);
      const res = await api.post('/backup/restore-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setMessage({ type: 'success', text: `Restored ${res.data.results.totalRestored} documents from uploaded file.` });
        setTimeout(() => window.location.reload(), 2500);
      } else {
        setMessage({ type: 'error', text: res.data.message || 'Restore failed.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Restore failed.' });
    } finally {
      setRestoreLoading(false);
      e.target.value = '';
    }
  };

  const deleteBackup = async (id) => {
    if (!window.confirm('Delete this backup permanently?')) return;
    try {
      await api.delete(`/backup/${id}`);
      setMessage({ type: 'success', text: 'Backup deleted.' });
      loadBackups();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete backup.' });
    }
  };

  const updateSchedule = async (newSettings) => {
    setScheduleLoading(true);
    try {
      const res = await api.put('/backup/schedule', newSettings);
      if (res.data.success) {
        setBackupSchedule(res.data.schedule);
        setMessage({ type: 'success', text: res.data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update schedule.' });
    } finally {
      setScheduleLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  };

  const getTypeColor = (type) => {
    const colors = {
      manual: `${dk ? 'bg-blue-900/30' : 'bg-blue-100'} ${dk ? 'text-blue-400' : 'text-blue-700'}`,
      daily: `${dk ? 'bg-green-900/30' : 'bg-green-100'} ${dk ? 'text-green-400' : 'text-green-700'}`,
      weekly: `${dk ? 'bg-purple-900/30' : 'bg-purple-100'} ${dk ? 'text-purple-400' : 'text-purple-700'}`,
      monthly: `${dk ? 'bg-orange-900/30' : 'bg-orange-100'} ${dk ? 'text-orange-400' : 'text-orange-700'}`,
      export: `${dk ? 'bg-gray-800' : 'bg-gray-100'} ${dk ? 'text-gray-400' : 'text-gray-700'}`
    };
    return colors[type] || colors.manual;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className={`${dk ? 'text-gray-400' : 'text-gray-500'}`}>Loading data management...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-gradient-to-br from-cyan-500 to-blue-500 p-3 rounded-xl">
          <Database className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>Data Management</h2>
          <p className={`${dk ? 'text-slate-400' : 'text-gray-500'} text-sm`}>Backup, restore, and manage your financial data</p>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium animate-fade-in ${message.type === `success` ? `${dk ? `bg-green-900/20` : `bg-green-100`} ${dk ? `text-green-400` : `text-green-700`} border-2 ${dk ? `border-green-800` : `border-green-200`}` : `${dk ? `bg-red-900/20` : `bg-red-100`} ${dk ? `text-red-400` : `text-red-700`} border-2 ${dk ? `border-red-800` : 'border-red-200'}`}`}>
          {message.type === 'success' ? '✅' : '❌'} {message.text}
        </div>
      )}

      {/* Data Overview */}
      <AnimatedCard>
        <h3 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>📊 Data Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 ${dk ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl text-center`}>
            <div className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>{dataCounts.transactions.toLocaleString()}</div>
            <div className={`text-xs ${dk ? 'text-gray-400' : 'text-gray-500'}`}>Transactions</div>
          </div>
          <div className={`p-4 ${dk ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl text-center`}>
            <div className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>{dataCounts.budgets}</div>
            <div className={`text-xs ${dk ? 'text-gray-400' : 'text-gray-500'}`}>Budgets</div>
          </div>
          <div className={`p-4 ${dk ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl text-center`}>
            <div className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>{backups.length}</div>
            <div className={`text-xs ${dk ? 'text-gray-400' : 'text-gray-500'}`}>Saved Backups</div>
          </div>
          <div className={`p-4 ${dk ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl text-center`}>
            <div className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>
              {backupSchedule.enabled ? '🟢' : '⚪'}
            </div>
            <div className={`text-xs ${dk ? 'text-gray-400' : 'text-gray-500'}`}>{backupSchedule.enabled ? `Auto: ${backupSchedule.frequency}` : 'Auto-backup Off'}</div>
          </div>
        </div>
      </AnimatedCard>

      {/* Database Backup & Restore */}
      <AnimatedCard delay={100}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>💾 Database Backup & Restore</h3>
            <p className={`text-sm ${dk ? 'text-gray-400' : 'text-gray-500'}`}>
              Full database backup of all your financial data — transactions, budgets, loans, investments, and more.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={createDatabaseBackup}
            disabled={createBackupLoading}
            className={`p-4 rounded-xl bg-gradient-to-br ${dk ? `from-blue-900/20` : `from-blue-50`} ${dk ? `to-indigo-900/20` : `to-indigo-50`} ${dk ? `hover:from-blue-900/30` : `hover:from-blue-100`} ${dk ? `hover:to-indigo-900/30` : `hover:to-indigo-100`} border ${dk ? `border-blue-800` : `border-blue-200`} transition-all duration-300 text-left disabled:opacity-50 group`}
          >
            <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{createBackupLoading ? '⏳' : '💾'}</div>
            <div className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>
              {createBackupLoading ? 'Creating Backup...' : 'Create Backup'}
            </div>
            <div className={`text-xs ${dk ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Save a snapshot of all your data to the server</div>
          </button>

          <button
            onClick={exportBackup}
            disabled={exportLoading}
            className={`p-4 rounded-xl bg-gradient-to-br ${dk ? `from-green-900/20` : `from-green-50`} ${dk ? `to-emerald-900/20` : `to-emerald-50`} ${dk ? `hover:from-green-900/30` : `hover:from-green-100`} ${dk ? `hover:to-emerald-900/30` : `hover:to-emerald-100`} border ${dk ? `border-green-800` : `border-green-200`} transition-all duration-300 text-left disabled:opacity-50 group`}
          >
            <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{exportLoading ? '⏳' : '📤'}</div>
            <div className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>
              {exportLoading ? 'Exporting...' : 'Export & Download'}
            </div>
            <div className={`text-xs ${dk ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Download your entire database as a JSON file</div>
          </button>

          <button
            onClick={() => setShowUploadRestore(true)}
            disabled={restoreLoading}
            className={`p-4 rounded-xl bg-gradient-to-br ${dk ? `from-purple-900/20` : `from-purple-50`} ${dk ? `to-pink-900/20` : `to-pink-50`} ${dk ? `hover:from-purple-900/30` : `hover:from-purple-100`} ${dk ? `hover:to-pink-900/30` : `hover:to-pink-100`} border ${dk ? `border-purple-800` : `border-purple-200`} transition-all duration-300 text-left disabled:opacity-50 group`}
          >
            <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{restoreLoading ? '⏳' : '📥'}</div>
            <div className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>
              {restoreLoading ? 'Restoring...' : 'Restore from File'}
            </div>
            <div className={`text-xs ${dk ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Upload a backup file to restore data</div>
          </button>
        </div>

        {/* Upload Restore Panel */}
        {showUploadRestore && (
          <div className={`mb-6 p-4 ${dk ? 'bg-purple-900/20' : 'bg-purple-50'} rounded-xl border ${dk ? 'border-purple-800' : 'border-purple-200'} animate-fade-in`}>
            <h4 className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-3`}>📥 Restore from Uploaded File</h4>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="flex-1">
                <label className={`block text-sm font-medium ${dk ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Restore Strategy</label>
                <select
                  value={restoreStrategy}
                  onChange={(e) => setRestoreStrategy(e.target.value)}
                  className={`w-full px-3 py-2 border ${dk ? `border-gray-600` : ``} rounded-lg ${dk ? 'bg-gray-700' : 'bg-white'} ${dk ? `text-white` : `text-gray-900`} text-sm`}
                >
                  <option value="merge">Merge (keep existing + add new)</option>
                  <option value="replace">Replace (overwrite with backup data)</option>
                </select>
              </div>
              <div className="flex-1">
                <label className={`block text-sm font-medium ${dk ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Backup File (.json or .json.gz)</label>
                <input
                  type="file"
                  accept=".json,.gz"
                  onChange={restoreFromUpload}
                  disabled={restoreLoading}
                  className={`w-full text-sm ${dk ? 'text-gray-400' : 'text-gray-500'} file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 disabled:opacity-50`}
                />
              </div>
              <button onClick={() => setShowUploadRestore(false)} className={`text-xs text-gray-400 ${dk ? 'hover:text-gray-300' : 'hover:text-gray-600'} mt-6`}>Cancel</button>
            </div>
          </div>
        )}

        {/* Backup History */}
        {backups.length > 0 && (
          <div>
            <h4 className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-3 flex items-center gap-2`}>
              📋 Backup History
              <Badge variant="default" className="text-xs">{backups.length}</Badge>
            </h4>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {backups.map((b) => (
                <div
                  key={b.id}
                  className={`flex items-center justify-between p-3 ${dk ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl ${dk ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100'} transition-colors group`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-xl">{b.fileExists ? '💾' : '⚠️'}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${dk ? 'text-white' : 'text-gray-900'} truncate`}>
                          {new Date(b.createdAt).toLocaleString()}
                        </span>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(b.type)}`}>
                          {b.type}
                        </span>
                      </div>
                      <div className={`text-xs ${dk ? 'text-gray-400' : 'text-gray-500'}`}>
                        {b.totalDocuments} docs · {b.totalCollections} collections · {formatBytes(b.sizeBytes)}
                        {b.uncompressedSizeBytes && ` (${formatBytes(b.uncompressedSizeBytes)} uncompressed)`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {b.fileExists && (
                      <>
                        <button
                          onClick={() => downloadBackup(b.id, b.filename)}
                          className={`p-2 text-blue-600 ${dk ? 'hover:bg-blue-900/30' : 'hover:bg-blue-100'} rounded-lg transition-colors`}
                          title="Download"
                        >⬇️</button>
                        <button
                          onClick={() => { setRestoreId(b.id); setShowRestoreModal(true); }}
                          className={`p-2 text-green-600 ${dk ? 'hover:bg-green-900/30' : 'hover:bg-green-100'} rounded-lg transition-colors`}
                          title="Restore"
                        >🔄</button>
                      </>
                    )}
                    <button
                      onClick={() => deleteBackup(b.id)}
                      className={`p-2 text-red-500 ${dk ? 'hover:bg-red-900/30' : 'hover:bg-red-100'} rounded-lg transition-colors`}
                      title="Delete"
                    >🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {backups.length === 0 && (
          <div className={`text-center py-6 ${dk ? 'text-gray-500' : 'text-gray-400'}`}>
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm">No backups yet. Create your first backup above!</p>
          </div>
        )}
      </AnimatedCard>

      {/* Automatic Backup Schedule */}
      <AnimatedCard delay={200}>
        <h3 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-2`}>⏰ Automatic Backup Schedule</h3>
        <p className={`text-sm ${dk ? 'text-gray-400' : 'text-gray-500'} mb-4`}>
          Configure automatic scheduled backups to protect your data without manual effort.
        </p>

        <div className={`p-4 ${dk ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl space-y-4`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`font-medium ${dk ? 'text-white' : 'text-gray-900'}`}>Enable Auto-Backup</div>
              <div className={`text-xs ${dk ? 'text-gray-400' : 'text-gray-500'}`}>Automatically create backups on a schedule</div>
            </div>
            <button
              onClick={() => updateSchedule({ ...backupSchedule, enabled: !backupSchedule.enabled })}
              disabled={scheduleLoading}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${backupSchedule.enabled ? 'bg-green-500' : `${dk ? 'bg-gray-600' : 'bg-gray-300'}`} disabled:opacity-50`}
            >
              <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${backupSchedule.enabled ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
          </div>

          {backupSchedule.enabled && (
            <div className="animate-fade-in space-y-4">
              <div>
                <label className={`block text-sm font-medium ${dk ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Backup Frequency</label>
                <div className="grid grid-cols-3 gap-2">
                  {['daily', 'weekly', 'monthly'].map(freq => (
                    <button
                      key={freq}
                      onClick={() => updateSchedule({ ...backupSchedule, frequency: freq })}
                      disabled={scheduleLoading}
                      className={`py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 border-2 ${
                        backupSchedule.frequency === freq
                          ? `border-blue-500 ${dk ? 'bg-blue-900/30' : 'bg-blue-50'} ${dk ? 'text-blue-400' : 'text-blue-700'} shadow-md`
                          : `${dk ? 'border-gray-700' : 'border-gray-200'} ${dk ? 'text-gray-400' : 'text-gray-600'} hover:border-gray-300 ${dk ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`
                      } disabled:opacity-50`}
                    >
                      <div className="text-lg mb-1">{freq === 'daily' ? '📅' : freq === 'weekly' ? '📆' : '🗓️'}</div>
                      <div className="capitalize">{freq}</div>
                      <div className="text-xs opacity-60 mt-0.5">
                        {freq === 'daily' ? 'Every 24 hrs' : freq === 'weekly' ? 'Every 7 days' : 'Every 30 days'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className={`p-3 ${dk ? 'bg-gray-900' : 'bg-white'} rounded-lg border ${dk ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className={`text-sm font-medium ${dk ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Retention Policy</div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'daily', label: 'Daily', count: backupSchedule.retentionCount?.daily || 7 },
                    { key: 'weekly', label: 'Weekly', count: backupSchedule.retentionCount?.weekly || 4 },
                    { key: 'monthly', label: 'Monthly', count: backupSchedule.retentionCount?.monthly || 6 }
                  ].map(r => (
                    <div key={r.key} className="text-center">
                      <div className={`text-xs ${dk ? 'text-gray-400' : 'text-gray-500'} mb-1`}>{r.label} backups</div>
                      <div className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>Keep {r.count}</div>
                    </div>
                  ))}
                </div>
              </div>

              {backupSchedule.lastRun && (
                <div className={`text-xs ${dk ? 'text-gray-400' : 'text-gray-500'}`}>
                  Last auto-backup: {new Date(backupSchedule.lastRun).toLocaleString()}
                </div>
              )}
              {backupSchedule.nextRun && (
                <div className={`text-xs ${dk ? 'text-gray-400' : 'text-gray-500'}`}>
                  Next auto-backup: {new Date(backupSchedule.nextRun).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>
      </AnimatedCard>

      {/* Google Drive Integration */}
      <AnimatedCard delay={300}>
        <h3 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-2`}>☁️ Google Drive Sync</h3>
        <p className={`text-sm ${dk ? 'text-gray-400' : 'text-gray-500'} mb-4`}>
          Backup your financial data to Google Drive and access it from any device.
        </p>

        {!driveStatus.configured ? (
          <div className={`p-4 ${dk ? 'bg-yellow-900/20' : 'bg-yellow-50'} rounded-xl border-2 ${dk ? 'border-yellow-800' : 'border-yellow-200'}`}>
            <p className={`text-sm ${dk ? 'text-yellow-400' : 'text-yellow-700'}`}>
              Google Drive integration requires Google OAuth credentials. Ask your administrator to set
              GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_DRIVE_REDIRECT_URI in the server .env file.
            </p>
          </div>
        ) : !driveStatus.connected ? (
          <div className="space-y-4">
            <div className={`p-4 ${dk ? 'bg-blue-900/20' : 'bg-blue-50'} rounded-xl border-2 ${dk ? 'border-blue-800' : 'border-blue-200'}`}>
              <p className={`text-sm ${dk ? 'text-blue-400' : 'text-blue-700'} mb-3`}>
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
            <div className={`flex items-center justify-between p-4 ${dk ? 'bg-green-900/20' : 'bg-green-50'} rounded-xl border-2 ${dk ? 'border-green-800' : 'border-green-200'}`}>
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                <div>
                  <div className={`text-sm font-medium ${dk ? 'text-green-400' : 'text-green-700'}`}>Google Drive Connected</div>
                  {driveStatus.backup && (
                    <div className={`text-xs ${dk ? 'text-green-500' : 'text-green-600'}`}>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={backupToDrive} disabled={backupLoading}
                className={`p-4 rounded-xl ${dk ? `bg-blue-900/20` : `bg-blue-50`} ${dk ? 'hover:bg-blue-900/30' : 'hover:bg-blue-100'} transition-colors text-left disabled:opacity-50 border-2 ${dk ? `border-blue-800` : `border-blue-200`}`}>
                <div className="text-lg mb-1">{backupLoading ? '⏳' : '☁️'} Backup to Drive</div>
                <div className={`text-sm ${dk ? 'text-gray-400' : 'text-gray-600'}`}>
                  {backupLoading ? 'Backing up...' : 'Save all financial data to Google Drive'}
                </div>
              </button>
              <button onClick={restoreFromDrive} disabled={restoreLoading || !driveStatus.backup}
                className={`p-4 rounded-xl ${dk ? `bg-purple-900/20` : `bg-purple-50`} ${dk ? 'hover:bg-purple-900/30' : 'hover:bg-purple-100'} transition-colors text-left disabled:opacity-50 border-2 ${dk ? `border-purple-800` : `border-purple-200`}`}>
                <div className="text-lg mb-1">{restoreLoading ? '⏳' : '📥'} Restore from Drive</div>
                <div className={`text-sm ${dk ? 'text-gray-400' : 'text-gray-600'}`}>
                  {restoreLoading ? 'Restoring...' : driveStatus.backup ? 'Restore data from your Drive backup' : 'No backup available yet'}
                </div>
              </button>
            </div>
          </div>
        )}
      </AnimatedCard>

      {/* Danger Zone */}
      <AnimatedCard delay={400} className={`border ${dk ? 'border-red-800' : 'border-red-200'}`}>
        <h3 className="text-lg font-semibold text-red-600 mb-4">⚠️ Danger Zone</h3>
        <div className="space-y-3">
          <button className={`w-full text-left p-4 rounded-xl ${dk ? `bg-red-900/20` : `bg-red-50`} ${dk ? 'hover:bg-red-900/40' : 'hover:bg-red-100'} transition-colors flex items-center justify-between border-2 ${dk ? `border-red-800` : `border-red-200`}`}>
            <div>
              <div className={`font-medium ${dk ? 'text-red-400' : 'text-red-700'}`}>Clear All Data</div>
              <div className="text-xs text-red-500">Delete all transactions, budgets, and settings</div>
            </div>
            <span className="text-red-400">🗑️</span>
          </button>
          <button className={`w-full text-left p-4 rounded-xl ${dk ? `bg-red-900/20` : `bg-red-50`} ${dk ? 'hover:bg-red-900/40' : 'hover:bg-red-100'} transition-colors flex items-center justify-between border-2 ${dk ? `border-red-800` : `border-red-200`}`}>
            <div>
              <div className={`font-medium ${dk ? 'text-red-400' : 'text-red-700'}`}>Delete Account</div>
              <div className="text-xs text-red-500">Permanently delete your account and all data</div>
            </div>
            <span className="text-red-400">❌</span>
          </button>
        </div>
      </AnimatedCard>

      {/* Restore Modal */}
      {showRestoreModal && (
        <Modal onClose={() => setShowRestoreModal(false)} title="Restore from Backup">
          <div className="space-y-4">
            <p className={`text-sm ${dk ? 'text-gray-400' : 'text-gray-600'}`}>
              Choose how to restore data from this backup:
            </p>
            <div className="space-y-2">
              <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer ${dk ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} transition-colors`}>
                <input type="radio" name="strategy" value="merge" checked={restoreStrategy === 'merge'} onChange={(e) => setRestoreStrategy(e.target.value)} className="mt-1" />
                <div>
                  <div className={`font-medium ${dk ? 'text-white' : 'text-gray-900'}`}>Merge</div>
                  <div className={`text-xs ${dk ? 'text-gray-400' : 'text-gray-500'}`}>Keep existing data and add missing items from the backup. Safest option.</div>
                </div>
              </label>
              <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer ${dk ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} transition-colors`}>
                <input type="radio" name="strategy" value="replace" checked={restoreStrategy === 'replace'} onChange={(e) => setRestoreStrategy(e.target.value)} className="mt-1" />
                <div>
                  <div className="font-medium text-red-600">Replace</div>
                  <div className={`text-xs ${dk ? 'text-gray-400' : 'text-gray-500'}`}>Delete existing data and replace with backup data. ⚠️ Destructive.</div>
                </div>
              </label>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowRestoreModal(false)}
                className={`px-4 py-2 text-sm ${dk ? 'text-gray-400' : 'text-gray-600'} ${dk ? 'hover:text-white' : 'hover:text-gray-900'}`}>
                Cancel
              </button>
              <button onClick={restoreFromServerBackup}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                Restore Now
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Profile;
