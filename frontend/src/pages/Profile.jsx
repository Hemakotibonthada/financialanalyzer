import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

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

  const categories = [
    'food_dining', 'groceries', 'transportation', 'fuel', 'utilities',
    'rent_mortgage', 'insurance', 'healthcare', 'entertainment', 'shopping',
    'education', 'travel', 'subscriptions', 'investments', 'other'
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' :
            message.type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' :
            'bg-blue-100 text-blue-700 border border-blue-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'personal', label: 'Personal Info' },
                { key: 'financial', label: 'Financial Details' },
                { key: 'budget', label: 'Budget & Goals' },
                { key: 'gmail', label: 'Gmail Integration' },
                { key: 'preferences', label: 'Preferences' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Personal Information */}
            {activeTab === 'personal' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={profile.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your full name as per PAN"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={profile.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PAN Number
                    </label>
                    <input
                      type="text"
                      value={profile.panNumber}
                      onChange={(e) => handleInputChange('panNumber', e.target.value.toUpperCase())}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        profile.panNumber && !validatePAN(profile.panNumber) 
                          ? 'border-red-500' 
                          : 'border-gray-300'
                      }`}
                      placeholder="ABCDE1234F"
                      maxLength="10"
                    />
                    {profile.panNumber && !validatePAN(profile.panNumber) && (
                      <p className="text-red-600 text-sm mt-1">Please enter a valid PAN number</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={profile.phoneNumber || ''}
                      onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">Financial Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monthly Income *
                    </label>
                    <input
                      type="number"
                      value={profile.monthlyIncome}
                      onChange={(e) => handleInputChange('monthlyIncome', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your monthly income"
                      min="0"
                      step="0.01"
                      required
                    />
                    {incomeInfo.source === 'salary-transactions' && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                        <span className="font-medium">✓ Auto-detected from {incomeInfo.transactionCount} salary transaction{incomeInfo.transactionCount !== 1 ? 's' : ''}</span>
                        {incomeInfo.lastSalaryDate && (
                          <div className="text-xs mt-1">
                            Last salary: {new Date(incomeInfo.lastSalaryDate).toLocaleDateString('en-IN')}
                          </div>
                        )}
                      </div>
                    )}
                    {incomeInfo.source === 'profile-setting' && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                        <span className="font-medium">ℹ Manual entry - Connect Gmail to auto-detect from payslips</span>
                      </div>
                    )}
                    {incomeInfo.source === 'not-set' && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                        <span className="font-medium">⚠ Not set - Enter manually or connect Gmail for auto-detection</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Currency
                    </label>
                    <select
                      value={profile.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">Budget Limits & Savings Goals</h2>
                
                {/* Budget Limits */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Monthly Budget Limits</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map(category => (
                      <div key={category}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </label>
                        <input
                          type="number"
                          value={profile.budgetLimits[category] || ''}
                          onChange={(e) => handleBudgetLimitChange(category, e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Savings Goal */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Savings Goal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Target Amount
                      </label>
                      <input
                        type="number"
                        value={profile.savingsGoal.amount}
                        onChange={(e) => handleInputChange('savingsGoal.amount', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter target amount"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Target Date
                      </label>
                      <input
                        type="date"
                        value={profile.savingsGoal.deadline}
                        onChange={(e) => handleInputChange('savingsGoal.deadline', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <input
                        type="text"
                        value={profile.savingsGoal.description}
                        onChange={(e) => handleInputChange('savingsGoal.description', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Emergency fund, Vacation, House down payment"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Gmail Integration */}
            {activeTab === 'gmail' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">Gmail Integration</h2>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="font-medium text-blue-900">Connect Your Gmail</h3>
                      <p className="text-blue-700 text-sm mt-1">
                        Connect your Gmail account to automatically fetch financial documents like bank statements, 
                        credit card statements, and receipts from your email.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  {gmailStatus.isConnected ? (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="flex items-center mb-2">
                            <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                            <span className="font-medium text-green-700">Gmail Connected</span>
                          </div>
                          <p className="text-gray-600">Email: {gmailStatus.email}</p>
                          {gmailStatus.lastSync && (
                            <p className="text-sm text-gray-500">
                              Last sync: {new Date(gmailStatus.lastSync).toLocaleDateString()}
                            </p>
                          )}
                          {!hasReadonlyScope && (
                            <p className="mt-3 text-sm text-red-600">
                              Gmail read permission missing. Remove "Financial Analyzer" from <a className="underline" href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">Google account permissions</a> and reconnect to grant full access.
                            </p>
                          )}
                          {gmailStatus.grantedScopes && gmailStatus.grantedScopes.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs text-gray-500">Granted scopes:</p>
                              <ul className="text-xs text-gray-500 list-disc list-inside">
                                {gmailStatus.grantedScopes.map(scope => (
                                  <li key={scope}>{scope}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <div className="space-x-3">
                          <button
                            onClick={syncGmail}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!hasReadonlyScope}
                          >
                            Sync Now
                          </button>
                          <button
                            onClick={disconnectGmail}
                            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                          >
                            Disconnect
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Gmail Account</h3>
                      <p className="text-gray-600 mb-4">
                        Automatically fetch financial documents from your Gmail account
                      </p>
                      <button
                        onClick={connectGmail}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
                      >
                        Connect Gmail
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Preferences */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">Preferences</h2>
                
                <div className="space-y-6">
                  {/* AI Provider */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI Analysis Provider
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="aiProvider"
                          value="ollama"
                          checked={profile.preferences.aiProvider === 'ollama'}
                          onChange={(e) => handleInputChange('preferences.aiProvider', e.target.value)}
                          className="mr-3"
                        />
                        <span>Ollama (Local AI - Free)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="aiProvider"
                          value="openai"
                          checked={profile.preferences.aiProvider === 'openai'}
                          onChange={(e) => handleInputChange('preferences.aiProvider', e.target.value)}
                          className="mr-3"
                        />
                        <span>OpenAI (Requires API Key)</span>
                      </label>
                    </div>
                    
                    {profile.preferences.aiProvider === 'openai' && (
                      <div className="mt-3">
                        <input
                          type="password"
                          value={profile.preferences.openAIKey}
                          onChange={(e) => handleInputChange('preferences.openAIKey', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter your OpenAI API key"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Your API key is encrypted and stored securely
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Notifications */}
                  <div>
                    <h3 className="text-lg font-medium mb-3">Notifications</h3>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={profile.preferences.emailNotifications}
                          onChange={(e) => handleInputChange('preferences.emailNotifications', e.target.checked)}
                          className="mr-3"
                        />
                        <span>Email notifications for analysis completion</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={profile.preferences.budgetAlerts}
                          onChange={(e) => handleInputChange('preferences.budgetAlerts', e.target.checked)}
                          className="mr-3"
                        />
                        <span>Budget limit alerts</span>
                      </label>
                    </div>
                  </div>

                  {/* Auto-fetch settings */}
                  <div>
                    <h3 className="text-lg font-medium mb-3">Auto-fetch Settings</h3>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={profile.preferences.autoFetchDocuments}
                          onChange={(e) => handleInputChange('preferences.autoFetchDocuments', e.target.checked)}
                          className="mr-3"
                        />
                        <span>Automatically fetch documents from Gmail</span>
                      </label>
                      
                      {profile.preferences.autoFetchDocuments && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Fetch Frequency
                          </label>
                          <select
                            value={profile.preferences.fetchFrequency}
                            onChange={(e) => handleInputChange('preferences.fetchFrequency', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
