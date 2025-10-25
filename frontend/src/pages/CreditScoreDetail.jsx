import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart 
} from 'recharts';
import api from '../services/api';

const CreditScoreDetail = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [creditData, setcreditData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('12months');

  useEffect(() => {
    fetchDetailedCreditData();
  }, []);

  const fetchDetailedCreditData = async () => {
    try {
      setLoading(true);
      
      // Try to fetch comprehensive credit detail first
      try {
        const detailResponse = await api.get('/financial/credit-detail');
        if (detailResponse.data.success) {
          setcreditData(detailResponse.data.data);
          return;
        }
      } catch (detailError) {
        console.log('Detailed endpoint not available, falling back to credit-score');
      }
      
      // Fallback to regular credit score endpoint
      const response = await api.post('/financial/credit-score');
      
      if (response.data.success) {
        setcreditData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching credit data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading detailed credit report...</p>
        </div>
      </div>
    );
  }

  if (!creditData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">No credit data available</p>
          <button onClick={() => navigate('/dashboard')} className="mt-4 text-indigo-600 hover:text-indigo-800">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Generate mock historical data for demonstration
  const generateHistoricalData = () => {
    // Use backend data if available
    if (creditData.history && creditData.history.length > 0) {
      return creditData.history;
    }
    
    // Fallback to generated data
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const baseScore = creditData.score;
    
    return months.map((month, index) => ({
      month,
      score: Math.max(550, Math.min(900, baseScore - 50 + Math.floor(Math.random() * 100))),
      inquiries: Math.floor(Math.random() * 3),
    }));
  };

  const historicalData = generateHistoricalData();

  // Calculate utilization data
  const utilizationData = creditData.creditCards?.map(card => ({
    name: card.cardName,
    utilization: parseFloat(card.utilizationPercent),
    limit: card.creditLimit,
  })) || [];

  // Payment status distribution
  // If payment history factor is 100, user never missed any payment
  const paymentHistoryScore = creditData.factors?.paymentHistory || 85;
  const neverMissedPayment = paymentHistoryScore === 100;
  
  const paymentStatusData = neverMissedPayment ? [
    { name: 'On Time', value: 100, color: '#10b981' },
    { name: 'Late', value: 0, color: '#f59e0b' },
    { name: 'Missed', value: 0, color: '#ef4444' },
  ] : [
    { name: 'On Time', value: Math.floor(paymentHistoryScore), color: '#10b981' },
    { name: 'Late', value: Math.floor((100 - paymentHistoryScore) / 2), color: '#f59e0b' },
    { name: 'Missed', value: Math.ceil((100 - paymentHistoryScore) / 2), color: '#ef4444' },
  ];

  // Credit mix data
  const creditMixData = [
    { name: 'Credit Cards', value: creditData.creditCards?.length || 0, color: '#6366f1' },
    { name: 'Personal Loans', value: 1, color: '#8b5cf6' },
    { name: 'Auto Loans', value: 1, color: '#ec4899' },
    { name: 'Home Loan', value: 1, color: '#14b8a6' },
  ].filter(item => item.value > 0);

  const getScoreColor = (score) => {
    if (score >= 750) return 'text-green-600';
    if (score >= 650) return 'text-blue-600';
    if (score >= 550) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreGradient = (score) => {
    if (score >= 750) return 'from-green-500 to-emerald-600';
    if (score >= 650) return 'from-blue-500 to-indigo-600';
    if (score >= 550) return 'from-yellow-500 to-orange-600';
    return 'from-red-500 to-pink-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-indigo-600 hover:text-indigo-800 mb-4 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Detailed Credit Report
              </h1>
              <p className="text-gray-600 mt-2">Comprehensive analysis of your credit profile</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="text-lg font-semibold text-gray-700">
                {new Date(creditData.lastUpdated).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Credit Score Hero Section */}
        <div className={`bg-gradient-to-r ${getScoreGradient(creditData.score)} rounded-3xl shadow-2xl p-8 mb-8 text-white`}>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <p className="text-white/80 text-sm font-medium mb-2">Your Credit Score</p>
              <div className="flex items-baseline">
                <span className="text-7xl font-bold">{creditData.score}</span>
                <span className="text-2xl ml-2">/900</span>
              </div>
              <p className="mt-4 text-lg font-semibold">{creditData.grade}</p>
              <div className="mt-6 bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <p className="text-sm text-white/90">Credit Score Range</p>
                <div className="mt-2 h-2 bg-white/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-500"
                    style={{ width: `${(creditData.score / 900) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="md:col-span-2 grid grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <p className="text-white/80 text-sm mb-2">Total Credit Limit</p>
                <p className="text-3xl font-bold">₹{(creditData.totalCredit / 100000).toFixed(1)}L</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <p className="text-white/80 text-sm mb-2">Available Credit</p>
                <p className="text-3xl font-bold">₹{(creditData.availableCredit / 100000).toFixed(1)}L</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <p className="text-white/80 text-sm mb-2">Credit Utilization</p>
                <p className="text-3xl font-bold">{creditData.utilizationRatio}%</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <p className="text-white/80 text-sm mb-2">Active Accounts</p>
                <p className="text-3xl font-bold">{creditData.creditCardSummary?.totalCards || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-8 overflow-hidden">
          <div className="flex border-b">
            {['overview', 'creditCards', 'loans', 'history', 'insights'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                  activeTab === tab
                    ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1).replace(/([A-Z])/g, ' $1')}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Credit Score Trend */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Credit Score Trend</h2>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="6months">Last 6 Months</option>
                  <option value="12months">Last 12 Months</option>
                  <option value="24months">Last 24 Months</option>
                </select>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={historicalData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis domain={[500, 900]} stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Credit Utilization */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Credit Utilization by Card</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={utilizationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" angle={-45} textAnchor="end" height={100} />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Bar dataKey="utilization" fill="#6366f1" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Payment Status */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Payment History Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={paymentStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Credit Mix */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Credit Account Mix</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={creditMixData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {creditMixData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'creditCards' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Credit Cards</h2>
              
              {creditData.creditCards && creditData.creditCards.length > 0 ? (
                <div className="space-y-4">
                  {creditData.creditCards.map((card, index) => (
                    <div key={card.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-800">{card.cardName}</h3>
                          <p className="text-gray-600">{card.provider || card.bank}</p>
                          <p className="text-sm text-gray-500 mt-1">{card.cardNumber}</p>
                        </div>
                        <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                          card.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {card.status}
                        </span>
                      </div>

                      <div className="grid md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-indigo-50 rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-1">Credit Limit</p>
                          <p className="text-lg font-bold text-indigo-600">₹{(card.creditLimit / 100000).toFixed(2)}L</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-1">Available</p>
                          <p className="text-lg font-bold text-purple-600">₹{(card.availableLimit / 100000).toFixed(2)}L</p>
                        </div>
                        <div className="bg-pink-50 rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-1">Current Balance</p>
                          <p className="text-lg font-bold text-pink-600">₹{(card.currentBalance / 1000).toFixed(0)}K</p>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-1">Utilization</p>
                          <p className="text-lg font-bold text-orange-600">{card.utilizationPercent}%</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600">Utilization</span>
                          <span className="font-semibold">{card.utilizationPercent}%</span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              parseFloat(card.utilizationPercent) > 70 ? 'bg-red-500' :
                              parseFloat(card.utilizationPercent) > 30 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(parseFloat(card.utilizationPercent), 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Interest Rate</p>
                          <p className="font-semibold text-gray-800">{card.interestRate}% APR</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Reward Points</p>
                          <p className="font-semibold text-gray-800">{card.rewardPoints?.toLocaleString() || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Min Amount Due</p>
                          <p className="font-semibold text-gray-800">₹{(card.minAmountDue || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="w-24 h-24 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <p className="text-gray-600 text-lg">No credit cards on record</p>
                </div>
              )}
            </div>

            {/* Credit Card Summary Stats */}
            {creditData.creditCardSummary && (
              <div className="grid md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
                  <p className="text-white/80 text-sm mb-2">Total Cards</p>
                  <p className="text-4xl font-bold">{creditData.creditCardSummary.totalCards}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg p-6 text-white">
                  <p className="text-white/80 text-sm mb-2">Total Limit</p>
                  <p className="text-4xl font-bold">₹{(creditData.creditCardSummary.totalCreditLimit / 100000).toFixed(1)}L</p>
                </div>
                <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl shadow-lg p-6 text-white">
                  <p className="text-white/80 text-sm mb-2">Avg Utilization</p>
                  <p className="text-4xl font-bold">{creditData.creditCardSummary.averageUtilization}%</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white">
                  <p className="text-white/80 text-sm mb-2">Total Rewards</p>
                  <p className="text-4xl font-bold">{(creditData.creditCardSummary.totalRewardPoints || 0).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'loans' && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Active Loans</h2>
            
            {creditData.loans && creditData.loans.length > 0 ? (
              <div className="space-y-6">
                {creditData.loans.map((loan) => (
                  <div key={loan.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{loan.type}</h3>
                        <p className="text-gray-600">{loan.provider}</p>
                        <p className="text-sm text-gray-500 mt-1">Loan ID: {loan.id}</p>
                      </div>
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                        loan.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {loan.status}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-indigo-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Principal Amount</p>
                        <p className="text-lg font-bold text-indigo-600">₹{(loan.principalAmount / 100000).toFixed(1)}L</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Outstanding</p>
                        <p className="text-lg font-bold text-purple-600">₹{(loan.outstandingAmount / 100000).toFixed(1)}L</p>
                      </div>
                      <div className="bg-pink-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Monthly EMI</p>
                        <p className="text-lg font-bold text-pink-600">₹{loan.emi.toLocaleString()}</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Interest Rate</p>
                        <p className="text-lg font-bold text-orange-600">{loan.interestRate}%</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Repayment Progress</span>
                        <span className="font-semibold">
                          {Math.round(((loan.tenure - loan.remainingTenure) / loan.tenure) * 100)}% Complete
                        </span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-500"
                          style={{ width: `${((loan.tenure - loan.remainingTenure) / loan.tenure) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Disbursement Date</p>
                        <p className="font-semibold text-gray-800">
                          {new Date(loan.disbursementDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Last Payment</p>
                        <p className="font-semibold text-gray-800">
                          {new Date(loan.lastPaymentDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Next Due Date</p>
                        <p className="font-semibold text-gray-800">
                          {new Date(loan.nextDueDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loan Summary Stats */}
                {creditData.loanSummary && (
                  <div className="grid md:grid-cols-4 gap-6 mt-8">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg p-6 text-white">
                      <p className="text-white/80 text-sm mb-2">Total Loans</p>
                      <p className="text-4xl font-bold">{creditData.loanSummary.totalLoans}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg p-6 text-white">
                      <p className="text-white/80 text-sm mb-2">Total Principal</p>
                      <p className="text-4xl font-bold">₹{(creditData.loanSummary.totalPrincipal / 100000).toFixed(1)}L</p>
                    </div>
                    <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl shadow-lg p-6 text-white">
                      <p className="text-white/80 text-sm mb-2">Outstanding</p>
                      <p className="text-4xl font-bold">₹{(creditData.loanSummary.totalOutstanding / 100000).toFixed(1)}L</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg p-6 text-white">
                      <p className="text-white/80 text-sm mb-2">Total Monthly EMI</p>
                      <p className="text-4xl font-bold">₹{(creditData.loanSummary.totalEMI / 1000).toFixed(0)}K</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="w-24 h-24 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-600 text-lg">No active loans found</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Credit Inquiries</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                  <Bar dataKey="inquiries" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Recent Account Activity</h2>
              <div className="space-y-4">
                {[
                  { date: '2025-03-15', action: 'Credit Card Payment', status: 'On Time', amount: '₹25,000' },
                  { date: '2025-03-10', action: 'Credit Inquiry', status: 'Completed', amount: 'HDFC Bank' },
                  { date: '2025-02-28', action: 'EMI Payment', status: 'On Time', amount: '₹42,500' },
                  { date: '2025-02-15', action: 'Credit Card Payment', status: 'On Time', amount: '₹18,500' },
                ].map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{activity.action}</p>
                        <p className="text-sm text-gray-500">{activity.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">{activity.amount}</p>
                      <span className={`text-xs px-2 py-1 rounded ${
                        activity.status === 'On Time' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {activity.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">AI-Powered Insights</h2>
              
              <div className="space-y-4">
                {creditData.recommendations?.map((rec, index) => (
                  <div key={index} className="border-l-4 border-indigo-500 bg-indigo-50 p-6 rounded-lg">
                    <div className="flex items-start">
                      <svg className="w-6 h-6 text-indigo-600 mr-3 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h3 className="font-bold text-gray-800 mb-2">{rec.category}</h3>
                        <p className="text-gray-700">{rec.action}</p>
                        <span className={`inline-block mt-2 text-xs px-3 py-1 rounded-full ${
                          rec.priority === 'High' ? 'bg-red-100 text-red-700' :
                          rec.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {rec.priority} Priority
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {creditData.creditCardRecommendations && creditData.creditCardRecommendations.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Recommended Credit Cards</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {creditData.creditCardRecommendations.map((card, index) => (
                    <div key={index} className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{card.cardName}</h3>
                      <p className="text-gray-600 mb-4">{card.provider}</p>
                      <p className="text-gray-700 mb-4">{card.reason}</p>
                      <div className="space-y-2">
                        <p className="font-semibold text-gray-800">Benefits:</p>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                          {card.benefits?.map((benefit, i) => (
                            <li key={i}>{benefit}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Score Improvement Tips */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white">
              <h2 className="text-2xl font-bold mb-6">Tips to Improve Your Score</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <h3 className="font-bold mb-2">💳 Keep Utilization Low</h3>
                  <p className="text-white/90 text-sm">Maintain credit utilization below 30% for optimal score</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <h3 className="font-bold mb-2">📅 Pay On Time</h3>
                  <p className="text-white/90 text-sm">Never miss a payment deadline to maintain good history</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <h3 className="font-bold mb-2">🎯 Limit Inquiries</h3>
                  <p className="text-white/90 text-sm">Too many credit inquiries can negatively impact your score</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <h3 className="font-bold mb-2">🔄 Mix Credit Types</h3>
                  <p className="text-white/90 text-sm">Diversify with different types of credit accounts</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditScoreDetail;
