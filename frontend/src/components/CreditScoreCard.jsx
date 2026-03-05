import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Info, RefreshCw, Eye } from 'lucide-react';
import api from '../services/api';

const CreditScoreCard = () => {
  const navigate = useNavigate();
  const [creditData, setCreditData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastFetchDate, setLastFetchDate] = useState(null);
  const [canFetchThisMonth, setCanFetchThisMonth] = useState(true);

  useEffect(() => {
    // Check profile status and load existing credit score
    const initializeCreditScore = async () => {
      console.log('CreditScoreCard: Initializing...');
      await checkProfileAndLoadCreditScore();
    };
    initializeCreditScore();
  }, []);

  const checkProfileAndLoadCreditScore = async () => {
    try {
      setLoading(true);
      
      // First check profile status
      const statusResponse = await api.get('/financial/profile-status');
      
      if (statusResponse.data.success) {
        const { canFetchCreditScore, hasProfile, missingFields, hasCreditScore, lastCreditUpdate } = statusResponse.data.data;
        
        if (!hasProfile || !canFetchCreditScore) {
          setError(`Profile incomplete: ${missingFields.join(', ')} required for credit score`);
          return;
        }

        // Check monthly fetch limit (disabled in development)
        if (import.meta.env.MODE === 'production' && lastCreditUpdate) {
          const lastUpdate = new Date(lastCreditUpdate);
          const now = new Date();
          const daysSinceLastFetch = (now - lastUpdate) / (1000 * 60 * 60 * 24);
          
          setLastFetchDate(lastUpdate);
          setCanFetchThisMonth(daysSinceLastFetch >= 30); // 30 days = 1 month
        } else {
          setCanFetchThisMonth(true); // Always allow fetch in development
        }

        // Always try to load existing credit score from profile
        try {
          console.log('🔍 Attempting to load credit score from profile...');
          const profileResponse = await api.get('/profile');
          console.log('📋 Profile response received:', profileResponse.data);
          
          if (profileResponse.data.success && profileResponse.data.data?.profile?.creditScore) {
            const creditScore = profileResponse.data.data.profile.creditScore;
            
            // Check if the creditScore object actually has any meaningful data
            // Mongoose may return an empty sub-document {} which is truthy but empty
            const hasAnyData = creditScore.score || creditScore.totalCreditLimit || 
              creditScore.creditUtilization || creditScore.grade || 
              creditScore.accounts?.total || creditScore.creditCards?.length ||
              creditScore.totalCredit || creditScore.availableCredit ||
              creditScore.factors?.length || creditScore.recommendations?.length;
            
            console.log('🎯 Credit score found in profile:', {
              score: creditScore.score,
              totalCreditLimit: creditScore.totalCreditLimit,
              creditUtilization: creditScore.creditUtilization,
              grade: creditScore.grade,
              hasAnyData: !!hasAnyData
            });
            
            if (!hasAnyData) {
              // Empty credit score sub-document — nothing to show
              console.log('ℹ️ Credit score object is empty — no data fetched yet. Click "Fetch" to get your score.');
            } else if (creditScore.score) {
              setCreditData(creditScore);
              console.log('✅ Credit score loaded and set in component state');
            } else {
              // Has partial data (credit cards, utilization, etc.) but no score yet
              setCreditData({ ...creditScore, score: null });
              console.log('⚠️ Partial credit data loaded (no score value yet)');
            }
          } else {
            console.log('❌ No credit score found in profile response');
          }
        } catch (profileErr) {
          console.log('❌ Error loading profile credit score:', profileErr.response?.data || profileErr.message);
        }
      }
    } catch (err) {
      console.log('Error checking profile status:', err);
      if (err.response?.status === 404) {
        setError('Please complete your profile first to access credit score features');
      } else {
        setError('Unable to load credit score data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCreditScore = async () => {
    // This is for manual refresh - reloads existing data
    try {
      setLoading(true);
      setError(''); // Clear any existing errors
      
      const response = await api.get('/profile');
      if (response.data.success && response.data.data?.profile?.creditScore) {
        const creditScore = response.data.data.profile.creditScore;
        setCreditData(creditScore);
        
        // Update monthly limit tracking (disabled in development)
        if (import.meta.env.MODE === 'production' && creditScore.lastUpdated) {
          const lastUpdate = new Date(creditScore.lastUpdated);
          const now = new Date();
          const daysSinceLastFetch = (now - lastUpdate) / (1000 * 60 * 60 * 24);
          
          setLastFetchDate(lastUpdate);
          setCanFetchThisMonth(daysSinceLastFetch >= 30);
        } else {
          setCanFetchThisMonth(true); // Always allow fetch in development
        }
      } else {
        setError('No credit score data found. Please fetch your credit score first.');
      }
    } catch (err) {
      console.log('Error loading credit score:', err.response?.status);
      setError('Failed to load credit score data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCreditScore = async () => {
    // Check monthly limit before fetching (disabled in development)
    if (import.meta.env.MODE === 'production' && !canFetchThisMonth) {
      const nextFetchDate = new Date(lastFetchDate);
      nextFetchDate.setDate(nextFetchDate.getDate() + 30);
      setError(`You can fetch your credit score again after ${nextFetchDate.toLocaleDateString()}. Credit scores are limited to once per month to protect your credit profile.`);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await api.post('/financial/credit-score');

      if (response.data.success) {
        setCreditData(response.data.data);
        setCanFetchThisMonth(false); // Mark as fetched this month
        setLastFetchDate(new Date()); // Update last fetch date
      } else {
        setError(response.data.message || 'Failed to fetch credit score');
      }
    } catch (err) {
      console.error('Credit score fetch error:', err);
      const errorMessage = err.response?.data?.message || 'Failed to fetch credit score';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 750) return 'text-green-600';
    if (score >= 650) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score) => {
    if (score >= 750) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 650) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  const getGradeIcon = (grade) => {
    if (['A', 'A+', 'A++'].includes(grade)) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (['B', 'B+'].includes(grade)) return <Info className="w-5 h-5 text-yellow-600" />;
    return <AlertCircle className="w-5 h-5 text-red-600" />;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <CreditCard className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Credit Score</h3>
        </div>
        
        <div className="flex space-x-2">
          {creditData && (
            <button
              onClick={canFetchThisMonth ? fetchCreditScore : loadCreditScore}
              disabled={loading}
              className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 disabled:opacity-50"
              title={canFetchThisMonth ? 'Fetch new credit score' : 'Reload existing credit score data'}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-sm">
                {canFetchThisMonth ? 'Update Score' : 'Refresh'}
              </span>
            </button>
          )}
          
          {/* Force reload button for debugging */}
          <button
            onClick={checkProfileAndLoadCreditScore}
            className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded hover:bg-yellow-200 dark:hover:bg-yellow-800"
            title="Force reload data"
          >
            Debug
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 rounded">
          {error}
        </div>
      )}

      {!creditData ? (
        <div className="text-center py-8">
          <CreditCard className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
          {error ? (
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => window.location.href = '/profile'}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              >
                Complete Profile
              </button>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 dark:text-slate-400 mb-4">
                Get your CIBIL credit score to understand your financial health
              </p>
              <button
                onClick={fetchCreditScore}
                disabled={loading || !canFetchThisMonth}
                className={`px-6 py-2 rounded-md font-medium ${
                  canFetchThisMonth 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50' 
                    : 'bg-gray-300 dark:bg-slate-600 text-gray-500 dark:text-slate-400 cursor-not-allowed'
                }`}
              >
                {loading ? 'Fetching...' : canFetchThisMonth ? 'Fetch Credit Score' : 'Already Fetched This Month'}
              </button>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 text-center">
                {canFetchThisMonth 
                  ? "We'll use your profile details to fetch your credit score" 
                  : lastFetchDate 
                    ? `Last fetched: ${lastFetchDate.toLocaleDateString()}. Next fetch available in ${30 - Math.floor((new Date() - lastFetchDate) / (1000 * 60 * 60 * 24))} days`
                    : 'Credit scores are limited to once per month'
                }
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Credit Score Display */}
          <div className={`p-4 rounded-lg ${getScoreBgColor(creditData.score)}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`text-3xl font-bold ${getScoreColor(creditData.score)}`}>
                    {creditData.score || '—'}
                  </span>
                  <div className="flex items-center space-x-1">
                    {getGradeIcon(creditData.grade)}
                    <span className="font-medium">{creditData.grade}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                  Last updated: {new Date(creditData.lastUpdated).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 dark:text-slate-400">Range: 300-850</div>
                <div className="text-xs text-gray-400 dark:text-slate-500">
                  {creditData.percentile && `${creditData.percentile}th percentile`}
                </div>
              </div>
            </div>
          </div>

          {/* Credit Factors */}
          {creditData.factors && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Key Factors</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {creditData.factors.map((factor, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded">
                    <div className="flex items-center space-x-2">
                      {factor.impact === 'positive' ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium">{factor.factor}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      factor.impact === 'positive' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    }`}>
                      {factor.impact}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {creditData.recommendations && creditData.recommendations.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Recommendations</h4>
              <div className="space-y-2">
                {creditData.recommendations.slice(0, 3).map((rec, index) => (
                  <div key={index} className="flex items-start space-x-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded">
                    <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">{rec.title}</p>
                      <p className="text-xs text-blue-700 mt-1">{rec.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Account Summary */}
          {creditData.accounts && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Account Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {creditData.accounts.total || 0}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">Total Accounts</div>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded">
                  <div className="text-lg font-semibold text-green-700">
                    {creditData.accounts.open || 0}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">Active</div>
                </div>
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded">
                  <div className="text-lg font-semibold text-yellow-700">
                    ₹{creditData.totalCreditLimit ? (creditData.totalCreditLimit / 100000).toFixed(1) : '0.0'}L
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">Credit Limit</div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded">
                  <div className="text-lg font-semibold text-blue-700">
                    {creditData.creditUtilization ? Math.round(creditData.creditUtilization) : '0'}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">Utilization</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-4">
            {creditData && (
              <button
                onClick={() => navigate('/credit-score-detail')}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
              >
                <Eye className="w-4 h-4" />
                View Detailed Report
              </button>
            )}
            <button
              onClick={fetchCreditScore}
              disabled={!canFetchThisMonth}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-all ${
                canFetchThisMonth 
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg' 
                  : 'bg-gray-300 dark:bg-slate-600 text-gray-500 dark:text-slate-400 cursor-not-allowed'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              {canFetchThisMonth ? 'Update Score' : 'Update Unavailable'}
            </button>
          </div>
          {!canFetchThisMonth && lastFetchDate && (
            <div className="text-center mt-2">
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Next update available: {new Date(lastFetchDate.getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      )}


    </div>
  );
};

export default CreditScoreCard;