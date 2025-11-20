import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  User, Mail, Phone, CreditCard, DollarSign, Calendar, 
  Settings, Bell, Shield, CheckCircle, AlertCircle, 
  TrendingUp, Target, Plus, Trash2, Save, RefreshCw,
  Eye, EyeOff, Lock, Globe, Zap, Link, XCircle
} from 'lucide-react';

const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [profile, setProfile] = useState({
    fullName: '',
    dateOfBirth: '',
    panNumber: '',
    phoneNumber: '',
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
  const [newCategory, setNewCategory] = useState({
    name: '',
    icon: '',
    keywords: ''
  });

  const categories = [
    'food_dining', 'groceries', 'transportation', 'fuel', 'utilities',
    'rent_mortgage', 'insurance', 'healthcare', 'entertainment', 'shopping',
    'education', 'travel', 'subscriptions', 'investment', 'emi', 'loan', 'other'
  ];

  const currencies = [
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'INR', name: 'Indian Rupee' },
    { code: 'JPY', name: 'Japanese Yen' },
    { code: 'AUD', name: 'Australian Dollar' },
    { code: 'CAD', name: 'Canadian Dollar' }
  ];

  useEffect(() => {
    loadProfile();
    loadGmailStatus();
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const gmailTokens = urlParams.get('gmail_tokens');
    const error = urlParams.get('error');
    const success = urlParams.get('success');

    if (error) {
      const errorMessage = urlParams.get('message') || 'OAuth authorization failed';
      setMessage({ type: 'error', text: decodeURIComponent(errorMessage) });
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (success && gmailTokens) {
      try {
        // Decode the base64 tokens
        const decodedTokens = JSON.parse(atob(gmailTokens));
        
        // Save tokens via API
        const response = await api.post('/auth/gmail/save-tokens', {
          tokens: decodedTokens
        });

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
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/profile');
      if (response.data.success && response.data.data?.profile) {
        const profileData = response.data.data.profile;
        setProfile({
          ...profile,
          ...profileData,
          dateOfBirth: profileData.dateOfBirth ? new Date(profileData.dateOfBirth).toISOString().split('T')[0] : '',
          savingsGoal: {
            amount: profileData.savingsGoal?.amount || '',
            deadline: profileData.savingsGoal?.deadline ? new Date(profileData.savingsGoal.deadline).toISOString().split('T')[0] : '',
            description: profileData.savingsGoal?.description || ''
          }
        });
      }
      // Load income info
      await loadIncomeInfo();
    } catch (error) {
      console.error('Error loading profile:', error);
      setMessage({ type: 'error', text: 'Failed to load profile data' });
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

  const handleAddCustomCategory = () => {
    if (!newCategory.name || !newCategory.icon) {
      setMessage({ type: 'error', text: 'Please provide both name and icon for the category' });
      return;
    }

    const keywordsArray = newCategory.keywords
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0);

    const categoryToAdd = {
      name: newCategory.name.trim(),
      icon: newCategory.icon,
      keywords: keywordsArray
    };

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
    try {
      setSaving(true);
      const response = await api.post('/profile', profile);
      
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage({ type: 'error', text: 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  };

  const connectGmail = async () => {
    try {
      const response = await api.get('/gmail/auth-url');
      if (response.data.success) {
        // Redirect to Google OAuth in the same window
        window.location.href = response.data.authUrl;
      }
    } catch (error) {
      console.error('Error getting Gmail auth URL:', error);
      const apiMessage = error.response?.data?.message;
      setMessage({ type: 'error', text: apiMessage || 'Failed to initiate Gmail connection' });
    }
  };

  const disconnectGmail = async () => {
    try {
      await api.post('/gmail/disconnect');
      setGmailStatus({
        isConnected: false,
        email: null,
        lastSync: null,
        lastFullSyncAt: null,
        grantedScopes: []
      });
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
        setMessage({
          type: 'error',
          text: 'Gmail permissions have expired. Please disconnect and reconnect Gmail to grant email read access.'
        });
      } else {
        setMessage({
          type: 'error',
          text: apiMessage || 'Failed to sync Gmail documents'
        });
      }
    }
  };

  const validatePAN = (pan) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Enhanced Header */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 text-white relative overflow-hidden">
            {/* Decorative background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-32 sm:w-64 h-32 sm:h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-48 sm:w-96 h-48 sm:h-96 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
            </div>
            
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4 lg:gap-6 flex-1 min-w-0">
                <div className="bg-white/20 backdrop-blur-sm p-3 sm:p-4 rounded-xl sm:rounded-2xl flex-shrink-0">
                  <User className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2 truncate">Profile Settings</h1>
                  <p className="text-blue-100 text-xs sm:text-sm lg:text-base">
                    Manage your personal information and preferences
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

        {message.text && (
          <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl shadow-lg flex items-start gap-2 sm:gap-3 animate-fade-in text-sm sm:text-base ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border-2 border-green-200' :
            message.type === 'error' ? 'bg-red-50 text-red-700 border-2 border-red-200' :
            'bg-blue-50 text-blue-700 border-2 border-blue-200'
          }`}>
            {message.type === 'success' && <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />}
            {message.type === 'error' && <AlertCircle className="w-6 h-6 flex-shrink-0" />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Enhanced Tab Navigation */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto scrollbar-hide profile-tabs-wrapper">
              {[
                { key: 'personal', label: 'Personal Info', icon: User },
                { key: 'financial', label: 'Financial Details', icon: DollarSign },
                { key: 'budget', label: 'Budget & Goals', icon: Target },
                { key: 'gmail', label: 'Gmail Integration', icon: Mail },
                { key: 'preferences', label: 'Preferences', icon: Settings }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`profile-tab-button group flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 font-medium text-sm sm:text-base whitespace-nowrap transition-all flex-shrink-0 touch-target border-b-2 ${
                      isActive
                        ? 'text-blue-600 border-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-transparent'
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
            {/* Personal Information */}
            {activeTab === 'personal' && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-3 rounded-xl">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
                    <p className="text-gray-500 text-sm">Update your personal details and identity information</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                      <User className="w-4 h-4 text-blue-600" />
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={profile.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300 hover:border-gray-300 font-medium"
                      placeholder="Enter your full name as per PAN"
                      required
                    />
                  </div>

                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={profile.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300 hover:border-gray-300 font-medium"
                    />
                  </div>

                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      PAN Number
                    </label>
                    <input
                      type="text"
                      value={profile.panNumber}
                      onChange={(e) => handleInputChange('panNumber', e.target.value.toUpperCase())}
                      className={`w-full p-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all duration-300 hover:border-gray-300 font-medium uppercase ${
                        profile.panNumber && !validatePAN(profile.panNumber) 
                          ? 'border-red-500 focus:border-red-500 bg-red-50' 
                          : 'border-gray-200 focus:border-blue-500'
                      }`}
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
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                      <Phone className="w-4 h-4 text-blue-600" />
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={profile.phoneNumber || ''}
                      onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300 hover:border-gray-300 font-medium"
                      placeholder="10-digit mobile number"
                      maxLength="10"
                      pattern="[0-9]{10}"
                    />
                    {profile.phoneNumber && !/^[0-9]{10}$/.test(profile.phoneNumber) && (
                      <p className="text-red-600 text-sm mt-1">Please enter a valid 10-digit phone number</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Financial Details */}
            {activeTab === 'financial' && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-3 rounded-xl">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Financial Details</h2>
                    <p className="text-gray-500 text-sm">Manage your income and currency preferences</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      Monthly Income *
                    </label>
                    <input
                      type="number"
                      value={profile.monthlyIncome}
                      onChange={(e) => handleInputChange('monthlyIncome', e.target.value)}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-300 hover:border-gray-300 font-medium"
                      placeholder="Enter your monthly income"
                      min="0"
                      step="0.01"
                      required
                    />
                    {incomeInfo.source === 'salary-transactions' && (
                      <div className="mt-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl text-sm text-green-800 animate-scale-in">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold block">Auto-detected from {incomeInfo.transactionCount} salary transaction{incomeInfo.transactionCount !== 1 ? 's' : ''}</span>
                            {incomeInfo.lastSalaryDate && (
                              <div className="text-xs mt-1 text-green-600">
                                Last salary: {new Date(incomeInfo.lastSalaryDate).toLocaleDateString('en-IN')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {incomeInfo.source === 'profile-setting' && (
                      <div className="mt-3 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl text-sm text-blue-800 animate-scale-in">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          <span className="font-medium">Manual entry - Connect Gmail to auto-detect from payslips</span>
                        </div>
                      </div>
                    )}
                    {incomeInfo.source === 'not-set' && (
                      <div className="mt-3 p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl text-sm text-yellow-800 animate-scale-in">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                          <span className="font-medium">Not set - Enter manually or connect Gmail for auto-detection</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      Currency
                    </label>
                    <select
                      value={profile.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-300 hover:border-gray-300 font-medium bg-white cursor-pointer"
                    >
                      {currencies.map(curr => (
                        <option key={curr.code} value={curr.code}>
                          {curr.code} - {curr.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Budget & Goals */}
            {activeTab === 'budget' && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-xl">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Budget Limits & Savings Goals</h2>
                    <p className="text-gray-500 text-sm">Set spending limits and define your financial goals</p>
                  </div>
                </div>
                
                {/* Budget Limits */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                    Monthly Budget Limits
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map(category => (
                      <div key={category} className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </label>
                        <input
                          type="number"
                          value={profile.budgetLimits[category] || ''}
                          onChange={(e) => handleBudgetLimitChange(category, e.target.value)}
                          className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-300 hover:border-gray-300 font-medium"
                          placeholder="0"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom Expense Categories */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    Custom Expense Categories
                  </h3>
                  
                  <div className="bg-white/80 backdrop-blur-sm border-2 border-purple-200 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Add your custom expense types</h4>
                        <p className="text-gray-600 text-sm mt-1">
                          Create custom categories to better track your specific spending patterns (e.g., Bills, Rent, Loans, Pet Care)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Add New Category Form */}
                  <div className="bg-white rounded-xl p-6 border-2 border-purple-200 mb-6 shadow-sm">
                    <h4 className="font-semibold text-gray-900 mb-4">Add New Category</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Category Name
                        </label>
                        <input
                          type="text"
                          value={newCategory.name}
                          onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                          className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-300"
                          placeholder="e.g., Rent, Bills, Loans"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Icon (Emoji)
                        </label>
                        <input
                          type="text"
                          value={newCategory.icon}
                          onChange={(e) => setNewCategory({...newCategory, icon: e.target.value})}
                          className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-300 text-center text-2xl"
                          placeholder="🏠 💡 💳"
                          maxLength="2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Keywords (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={newCategory.keywords}
                          onChange={(e) => setNewCategory({...newCategory, keywords: e.target.value})}
                          className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-300"
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
                      <h4 className="font-semibold text-gray-900 mb-4">Your Custom Categories</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {profile.customCategories.map((category, index) => (
                          <div key={index} className="bg-white border-2 border-purple-200 rounded-xl p-4 flex items-center justify-between hover:shadow-lg transition-all duration-300 hover:scale-105 animate-scale-in">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl">{category.icon}</span>
                              <div>
                                <p className="font-semibold text-gray-900">{category.name}</p>
                                {category.keywords && category.keywords.length > 0 && (
                                  <p className="text-xs text-gray-500">{category.keywords.join(', ')}</p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveCustomCategory(index)}
                              className="text-red-600 hover:text-red-800 hover:scale-110 transition-all duration-300"
                              title="Remove category"
                            >
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Savings Goal */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-green-600" />
                    Savings Goal
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Target Amount
                      </label>
                      <input
                        type="number"
                        value={profile.savingsGoal.amount}
                        onChange={(e) => handleInputChange('savingsGoal.amount', e.target.value)}
                        className="w-full p-3 border-2 border-green-200 bg-white rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-300 font-medium"
                        placeholder="Enter target amount"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Target Date
                      </label>
                      <input
                        type="date"
                        value={profile.savingsGoal.deadline}
                        onChange={(e) => handleInputChange('savingsGoal.deadline', e.target.value)}
                        className="w-full p-3 border-2 border-green-200 bg-white rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-300 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Description
                      </label>
                      <input
                        type="text"
                        value={profile.savingsGoal.description}
                        onChange={(e) => handleInputChange('savingsGoal.description', e.target.value)}
                        className="w-full p-3 border-2 border-green-200 bg-white rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-300 font-medium"
                        placeholder="e.g., Emergency fund, Vacation"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Gmail Integration */}
            {activeTab === 'gmail' && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-br from-red-500 to-orange-500 p-3 rounded-xl">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Gmail Integration</h2>
                    <p className="text-gray-500 text-sm">Automatically sync financial documents from your email</p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-6 mb-6">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-blue-900 text-lg">Connect Your Gmail</h3>
                      <p className="text-blue-700 text-sm mt-2 leading-relaxed">
                        Connect your Gmail account to automatically fetch financial documents like bank statements, 
                        credit card statements, and receipts from your email.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-8">
                  {gmailStatus.isConnected ? (
                    <div>
                      <div className="flex items-center justify-between mb-6 pb-6 border-b-2 border-gray-100">
                        <div className="flex items-center gap-4">
                          <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-4 rounded-2xl">
                            <CheckCircle className="w-8 h-8 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">Connected</h3>
                            <p className="text-gray-600 mt-1">{gmailStatus.email}</p>
                            {gmailStatus.lastSync && (
                              <p className="text-sm text-gray-500 mt-1">
                                Last synced: {new Date(gmailStatus.lastSync).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-3">
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
                      
                      {/* Scopes and Permissions */}
                      <div className="mt-6 space-y-4">
                        {!hasReadonlyScope && (
                          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-5 animate-scale-in">
                            <div className="flex items-start gap-3">
                              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                              <div>
                                <p className="font-semibold text-yellow-900 text-sm">Missing Required Permissions</p>
                                <p className="text-yellow-700 text-sm mt-1">
                                  Gmail read permission missing. Remove "Financial Analyzer" from <a className="underline hover:text-yellow-900" href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">Google account permissions</a> and reconnect to grant full access.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        {gmailStatus.grantedScopes && gmailStatus.grantedScopes.length > 0 && (
                          <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              Granted Permissions
                            </h4>
                            <ul className="space-y-2">
                              {gmailStatus.grantedScopes.map(scope => (
                                <li key={scope} className="text-sm text-gray-600 flex items-center gap-2">
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
                      <div className="bg-gradient-to-br from-gray-100 to-gray-200 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Mail className="w-12 h-12 text-gray-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">Connect Gmail Account</h3>
                      <p className="text-gray-600 mb-6 max-w-md mx-auto">
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

            {/* Preferences */}
            {activeTab === 'preferences' && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-3 rounded-xl">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Preferences</h2>
                    <p className="text-gray-500 text-sm">Customize your experience and notification settings</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {/* AI Provider */}
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-indigo-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Settings className="w-5 h-5 text-indigo-600" />
                      AI Analysis Provider
                    </h3>
                    <div className="space-y-3">
                      <label className="flex items-center p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-300 transition-all duration-300 cursor-pointer bg-white">
                        <input
                          type="radio"
                          name="aiProvider"
                          value="ollama"
                          checked={profile.preferences.aiProvider === 'ollama'}
                          onChange={(e) => handleInputChange('preferences.aiProvider', e.target.value)}
                          className="w-5 h-5 text-indigo-600 mr-4"
                        />
                        <div>
                          <span className="font-semibold text-gray-900">Ollama (Local AI)</span>
                          <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Free</span>
                          <p className="text-sm text-gray-600 mt-1">Run AI analysis locally on your machine</p>
                        </div>
                      </label>
                      <label className="flex items-center p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-300 transition-all duration-300 cursor-pointer bg-white">
                        <input
                          type="radio"
                          name="aiProvider"
                          value="openai"
                          checked={profile.preferences.aiProvider === 'openai'}
                          onChange={(e) => handleInputChange('preferences.aiProvider', e.target.value)}
                          className="w-5 h-5 text-indigo-600 mr-4"
                        />
                        <div>
                          <span className="font-semibold text-gray-900">OpenAI</span>
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">API Key Required</span>
                          <p className="text-sm text-gray-600 mt-1">Use OpenAI's powerful cloud-based AI</p>
                        </div>
                      </label>
                    </div>
                    
                    {profile.preferences.aiProvider === 'openai' && (
                      <div className="mt-4 animate-scale-in">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          OpenAI API Key
                        </label>
                        <input
                          type="password"
                          value={profile.preferences.openAIKey}
                          onChange={(e) => handleInputChange('preferences.openAIKey', e.target.value)}
                          className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-300 font-medium"
                          placeholder="sk-..."
                        />
                        <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          Your API key is encrypted and stored securely
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Notifications */}
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Mail className="w-5 h-5 text-blue-600" />
                      Notifications
                    </h3>
                    <div className="space-y-4">
                      <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 transition-all duration-300 cursor-pointer bg-white">
                        <div>
                          <span className="font-semibold text-gray-900">Email Notifications</span>
                          <p className="text-sm text-gray-600 mt-1">Get notified when analysis is complete</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={profile.preferences.emailNotifications}
                          onChange={(e) => handleInputChange('preferences.emailNotifications', e.target.checked)}
                          className="w-6 h-6 text-blue-600 rounded focus:ring-4 focus:ring-blue-100"
                        />
                      </label>
                      <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 transition-all duration-300 cursor-pointer bg-white">
                        <div>
                          <span className="font-semibold text-gray-900">Budget Limit Alerts</span>
                          <p className="text-sm text-gray-600 mt-1">Get alerts when you exceed budget limits</p>
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

                  {/* Auto-fetch settings */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-green-600" />
                      Auto-fetch Settings
                    </h3>
                    <div className="space-y-4">
                      <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-green-300 transition-all duration-300 cursor-pointer bg-white">
                        <div>
                          <span className="font-semibold text-gray-900">Automatic Gmail Sync</span>
                          <p className="text-sm text-gray-600 mt-1">Automatically fetch documents from Gmail</p>
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
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Sync Frequency
                          </label>
                          <select
                            value={profile.preferences.fetchFrequency}
                            onChange={(e) => handleInputChange('preferences.fetchFrequency', e.target.value)}
                            className="w-full p-3 border-2 border-green-200 bg-white rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-300 font-medium cursor-pointer"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
