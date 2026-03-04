import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { PageShell, PageLoader, EmptyPlaceholder, ThemeGradientText, ThemeButton } from '../components/ui/ThemePageComponents';
import { 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  CheckCircle,
  DollarSign,
  PieChart,
  Activity,
  Target,
  Shield,
  Zap,
  ArrowUp,
  ArrowDown,
  Info,
  Heart
} from 'lucide-react';
import MainLayout from '../components/MainLayout';
import { Line, Pie, Bar, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

const FinancialHealthDashboard = () => {
  const { mode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState(null);
  const [spendingData, setSpendingData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Theme-aware palette
  const p = useMemo(() => {
    const isDark = mode === 'dark', isBlack = mode === 'black', dk = isDark || isBlack;
    return {
      dk,
      bg: isBlack ? 'bg-black' : isDark ? 'bg-slate-950' : 'bg-gray-50',
      card: isBlack ? 'bg-gray-950 border-gray-800' : isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200',
      cardShadow: isBlack ? 'shadow-none' : isDark ? 'shadow-md shadow-slate-900/30' : 'shadow-md',
      text: isBlack ? 'text-gray-100' : isDark ? 'text-white' : 'text-gray-900',
      textSub: isBlack ? 'text-gray-300' : isDark ? 'text-slate-300' : 'text-gray-700',
      textMuted: isBlack ? 'text-gray-500' : isDark ? 'text-slate-400' : 'text-gray-600',
      textFaint: isBlack ? 'text-gray-600' : isDark ? 'text-slate-500' : 'text-gray-500',
      border: isBlack ? 'border-gray-800' : isDark ? 'border-slate-700' : 'border-gray-200',
      inputBg: isBlack ? 'bg-gray-900' : isDark ? 'bg-slate-900' : 'bg-gray-50',
      barBg: isBlack ? 'bg-gray-800' : isDark ? 'bg-slate-700' : 'bg-gray-200',
      tinted: (color) => dk ? `bg-${color}-900/20` : `bg-${color}-50`,
      tintedBorder: (color) => dk ? `border-${color}-700` : `border-${color}-200`,
      tintedText: (color) => dk ? `text-${color}-400` : `text-${color}-800`,
      tintedSub: (color) => dk ? `text-${color}-400` : `text-${color}-600`,
    };
  }, [mode]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [healthResult, spendingResult] = await Promise.allSettled([
        api.get('/insights/financial-health'),
        api.get('/insights/spending-behavior')
      ]);
      
      if (healthResult.status === 'fulfilled') {
        setHealthData(healthResult.value.data);
      } else {
        console.error('Error fetching financial health:', healthResult.reason);
      }
      
      if (spendingResult.status === 'fulfilled') {
        setSpendingData(spendingResult.value.data);
      } else {
        console.error('Error fetching spending behavior:', spendingResult.reason);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Financial Health">
        <PageShell><PageLoader text="Analyzing financial health..." /></PageShell>
      </MainLayout>
    );
  }

  if (!healthData) {
    return (
      <MainLayout title="Financial Health">
        <PageShell>
          <EmptyPlaceholder
            icon={<AlertCircle className="w-12 h-12" />}
            title="No Data Available"
            subtitle="Add some transactions to see your financial health"
          />
        </PageShell>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Financial Health Dashboard">
    <div className={`min-h-screen ${p.bg} p-6 transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-4xl font-bold ${p.text} mb-2 flex items-center gap-3`}>
            <Heart className="w-9 h-9 opacity-70" />
            <ThemeGradientText>Financial Health Dashboard</ThemeGradientText>
          </h1>
          <p className={p.textMuted}>Comprehensive analysis of your financial wellness</p>
        </div>

        {/* Overall Score Card */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Overall Financial Health</h2>
              <p className="text-indigo-100">Based on 8 key financial indicators</p>
            </div>
            <div className="text-center">
              <div className="relative">
                <div className="text-6xl font-bold">{healthData.overallScore}</div>
                <div className="text-xl mt-2">{healthData.grade.grade}</div>
              </div>
              <div className="mt-4 px-4 py-2 bg-white bg-opacity-20 rounded-lg">
                <span className="text-sm">{healthData.grade.description}</span>
              </div>
            </div>
          </div>
          
          {/* Risk Level Badge */}
          <div className="mt-6 flex items-center space-x-4">
            <div className={`px-4 py-2 rounded-lg ${
              healthData.riskLevel.level === 'low' ? 'bg-green-500' :
              healthData.riskLevel.level === 'medium' ? 'bg-yellow-500' :
              'bg-red-500'
            }`}>
              <span className="font-semibold">Risk Level: {healthData.riskLevel.level.toUpperCase()}</span>
            </div>
            <span className="text-indigo-100">{healthData.riskLevel.description}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className={`${p.card} rounded-lg ${p.cardShadow} mb-6 border`}>
          <div className={`flex border-b ${p.border} overflow-x-auto`}>
            {['overview', 'scores', 'spending', 'recommendations'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 font-medium capitalize whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : `${p.textMuted} hover:${p.text}`
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={DollarSign}
                title="Savings Rate"
                value={`${healthData.ratios.savingsRate}%`}
                change="+2.3%"
                positive={true}
                color="green"
              />
              <StatCard
                icon={Shield}
                title="Debt-to-Income"
                value={`${healthData.ratios.debtToIncomeRatio}%`}
                change="-1.5%"
                positive={true}
                color="blue"
              />
              <StatCard
                icon={Target}
                title="Budget Compliance"
                value={`${spendingData?.budgetCompliance?.overallComplianceScore || 0}%`}
                change="+5.2%"
                positive={true}
                color="purple"
              />
              <StatCard
                icon={TrendingUp}
                title="Net Worth"
                value={`₹${healthData.ratios.netWorth.toLocaleString()}`}
                change="+8.4%"
                positive={true}
                color="indigo"
              />
            </div>

            {/* Strengths and Weaknesses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Strengths */}
              <div className={`${p.card} rounded-lg ${p.cardShadow} p-6 border`}>
                <div className="flex items-center mb-4">
                  <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
                  <h3 className={`text-xl font-bold ${p.text}`}>Your Strengths</h3>
                </div>
                {healthData.strengths.length > 0 ? (
                  <div className="space-y-3">
                    {healthData.strengths.map((strength, index) => (
                      <div key={index} className={`flex items-center justify-between p-3 ${p.tinted('green')} rounded-lg`}>
                        <span className={`font-medium ${p.textSub} capitalize`}>
                          {strength.category.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <div className="flex items-center">
                          <span className="text-green-600 font-bold mr-2">{strength.score}/100</span>
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={p.textFaint}>Keep working on your financial health to build strengths</p>
                )}
              </div>

              {/* Weaknesses */}
              <div className={`${p.card} rounded-lg ${p.cardShadow} p-6 border`}>
                <div className="flex items-center mb-4">
                  <AlertCircle className="w-6 h-6 text-orange-500 mr-2" />
                  <h3 className={`text-xl font-bold ${p.text}`}>Areas for Improvement</h3>
                </div>
                {healthData.weaknesses.length > 0 ? (
                  <div className="space-y-3">
                    {healthData.weaknesses.map((weakness, index) => (
                      <div key={index} className={`p-3 ${p.tinted('orange')} rounded-lg`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-medium ${p.textSub} capitalize`}>
                            {weakness.category.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className="text-orange-600 font-bold">{weakness.score}/100</span>
                        </div>
                        <p className={`text-sm ${p.textMuted}`}>{weakness.recommendation}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={p.textFaint}>Great! No major weaknesses identified</p>
                )}
              </div>
            </div>

            {/* Spending Insights */}
            {spendingData && (
              <div className={`${p.card} rounded-lg ${p.cardShadow} p-6 border`}>
                <h3 className={`text-xl font-bold ${p.text} mb-4`}>Spending Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {spendingData.insights.slice(0, 3).map((insight, index) => (
                    <div key={index} className={`p-4 ${p.tinted('indigo')} rounded-lg`}>
                      <div className="text-3xl mb-2">{insight.icon}</div>
                      <h4 className={`font-semibold ${p.text} mb-1`}>{insight.title}</h4>
                      <p className={`text-sm ${p.textMuted}`}>{insight.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scores Tab */}
        {activeTab === 'scores' && (
          <div className="space-y-6">
            {/* Score Radar Chart */}
            <div className={`${p.card} rounded-lg ${p.cardShadow} p-6 border`}>
              <h3 className={`text-xl font-bold ${p.text} mb-6`}>Health Score Breakdown</h3>
              <div className="h-96">
                <Radar
                  data={{
                    labels: Object.keys(healthData.scores).map(key => 
                      key.replace(/([A-Z])/g, ' $1').trim()
                    ),
                    datasets: [{
                      label: 'Your Score',
                      data: Object.values(healthData.scores).map(s => s.score),
                      backgroundColor: 'rgba(99, 102, 241, 0.2)',
                      borderColor: 'rgb(99, 102, 241)',
                      pointBackgroundColor: 'rgb(99, 102, 241)',
                      pointBorderColor: '#fff',
                      pointHoverBackgroundColor: '#fff',
                      pointHoverBorderColor: 'rgb(99, 102, 241)'
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                          stepSize: 20
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Individual Scores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(healthData.scores).map(([key, scoreData]) => (
                <ScoreCard
                  key={key}
                  title={key.replace(/([A-Z])/g, ' $1').trim()}
                  score={scoreData.score}
                  status={scoreData.status}
                  message={scoreData.message}
                  details={scoreData}
                />
              ))}
            </div>
          </div>
        )}

        {/* Spending Tab */}
        {activeTab === 'spending' && spendingData && (
          <div className="space-y-6">
            {/* Spending Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className={`${p.card} rounded-lg ${p.cardShadow} p-6 border`}>
                <h4 className={`text-sm font-medium ${p.textMuted} mb-2`}>Total Expenses</h4>
                <p className={`text-3xl font-bold ${p.text}`}>
                  ₹{spendingData.summary.totalExpense.toLocaleString()}
                </p>
                <p className={`text-sm ${p.textFaint} mt-2`}>Last 6 months</p>
              </div>
              <div className={`${p.card} rounded-lg ${p.cardShadow} p-6 border`}>
                <h4 className={`text-sm font-medium ${p.textMuted} mb-2`}>Total Income</h4>
                <p className={`text-3xl font-bold ${p.text}`}>
                  ₹{spendingData.summary.totalIncome.toLocaleString()}
                </p>
                <p className={`text-sm ${p.textFaint} mt-2`}>Last 6 months</p>
              </div>
              <div className={`${p.card} rounded-lg ${p.cardShadow} p-6 border`}>
                <h4 className={`text-sm font-medium ${p.textMuted} mb-2`}>Net Savings</h4>
                <p className={`text-3xl font-bold ${
                  spendingData.summary.netSavings >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ₹{spendingData.summary.netSavings.toLocaleString()}
                </p>
                <p className={`text-sm ${p.textFaint} mt-2`}>
                  Savings Rate: {spendingData.summary.savingsRate}%
                </p>
              </div>
            </div>

            {/* Category Spending */}
            <div className={`${p.card} rounded-lg ${p.cardShadow} p-6 border`}>
              <h3 className={`text-xl font-bold ${p.text} mb-6`}>Spending by Category</h3>
              <div className="h-80">
                <Pie
                  data={{
                    labels: spendingData.categories.topCategories.map(c => c.category),
                    datasets: [{
                      data: spendingData.categories.topCategories.map(c => c.total),
                      backgroundColor: [
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(168, 85, 247, 0.8)',
                        'rgba(236, 72, 153, 0.8)',
                        'rgba(251, 146, 60, 0.8)',
                        'rgba(34, 197, 94, 0.8)'
                      ]
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right'
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Spending Patterns */}
            <div className={`${p.card} rounded-lg ${p.cardShadow} p-6 border`}>
              <h3 className={`text-xl font-bold ${p.text} mb-4`}>Spending Patterns</h3>
              <div className="space-y-4">
                <div className={`p-4 ${p.tinted('blue')} rounded-lg`}>
                  <h4 className={`font-semibold ${p.text} mb-2`}>Recurring Transactions</h4>
                  <p className={`text-sm ${p.textMuted} mb-3`}>
                    {spendingData.patterns.recurring.length} recurring payments detected
                  </p>
                  <div className="space-y-2">
                    {spendingData.patterns.recurring.slice(0, 3).map((transaction, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{transaction.merchant}</span>
                        <div className="text-right">
                          <span className="text-sm font-bold">₹{transaction.amount}</span>
                          <span className={`text-xs ${p.textFaint} ml-2`}>{transaction.frequency}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`p-4 ${p.tinted('orange')} rounded-lg`}>
                  <h4 className={`font-semibold ${p.text} mb-2`}>Impulse Purchases</h4>
                  <p className={`text-sm ${p.textMuted}`}>
                    {spendingData.patterns.impulse.count} impulse purchases totaling ₹
                    {spendingData.patterns.impulse.totalAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="space-y-6">
            <div className={`${p.card} rounded-lg ${p.cardShadow} p-6 border`}>
              <h3 className={`text-xl font-bold ${p.text} mb-6`}>Personalized Recommendations</h3>
              <div className="space-y-4">
                {healthData.recommendations.map((rec, index) => (
                  <RecommendationCard key={index} recommendation={rec} />
                ))}
                {spendingData?.recommendations.slice(0, 3).map((rec, index) => (
                  <RecommendationCard key={`spending-${index}`} recommendation={rec} />
                ))}
              </div>
            </div>

            {/* Projections */}
            <div className={`${p.card} rounded-lg ${p.cardShadow} p-6 border`}>
              <h3 className={`text-xl font-bold ${p.text} mb-6`}>Financial Health Projections</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ProjectionCard
                  period="3 Months"
                  score={healthData.projections.threeMonths}
                  currentScore={healthData.overallScore}
                />
                <ProjectionCard
                  period="6 Months"
                  score={healthData.projections.sixMonths}
                  currentScore={healthData.overallScore}
                />
                <ProjectionCard
                  period="1 Year"
                  score={healthData.projections.oneYear}
                  currentScore={healthData.overallScore}
                />
              </div>
              <div className={`mt-6 p-4 ${p.inputBg} rounded-lg`}>
                <h4 className={`font-semibold ${p.text} mb-2`}>Assumptions:</h4>
                <ul className={`list-disc list-inside text-sm ${p.textMuted} space-y-1`}>
                  {healthData.projections.assumptions.map((assumption, index) => (
                    <li key={index}>{assumption}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </MainLayout>
  );
};

// Stat Card Component
const StatCard = ({ icon: Icon, title, value, change, positive, color }) => {
  const { mode } = useTheme();
  const dk = mode === 'dark' || mode === 'black';
  const colors = {
    green: dk ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600',
    blue: dk ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600',
    purple: dk ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-600',
    indigo: dk ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
  };
  const cardCls = mode === 'black' ? 'bg-gray-950 border border-gray-800' : dk ? 'bg-slate-800 shadow-md shadow-slate-900/30' : 'bg-white shadow-md';

  return (
    <div className={`${cardCls} rounded-lg p-6`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className={`flex items-center text-sm font-medium ${
          positive ? 'text-green-600' : 'text-red-600'
        }`}>
          {positive ? <ArrowUp className="w-4 h-4 mr-1" /> : <ArrowDown className="w-4 h-4 mr-1" />}
          {change}
        </div>
      </div>
      <h3 className={`text-sm font-medium ${dk ? 'text-slate-400' : 'text-gray-600'} mb-1`}>{title}</h3>
      <p className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
};

// Score Card Component
const ScoreCard = ({ title, score, status, message, details }) => {
  const { mode } = useTheme();
  const dk = mode === 'dark' || mode === 'black';
  const getStatusColor = (status) => {
    const m = (l, d) => dk ? d : l;
    switch(status) {
      case 'excellent': return m('bg-green-100 text-green-800 border-green-200', 'bg-green-900/30 text-green-400 border-green-700');
      case 'good': return m('bg-blue-100 text-blue-800 border-blue-200', 'bg-blue-900/30 text-blue-400 border-blue-700');
      case 'fair': return m('bg-yellow-100 text-yellow-800 border-yellow-200', 'bg-yellow-900/30 text-yellow-400 border-yellow-700');
      case 'poor': return m('bg-orange-100 text-orange-800 border-orange-200', 'bg-orange-900/30 text-orange-400 border-orange-700');
      case 'critical': return m('bg-red-100 text-red-800 border-red-200', 'bg-red-900/30 text-red-400 border-red-700');
      default: return m('bg-gray-100 text-gray-800 border-gray-200', 'bg-slate-800/50 text-slate-300 border-slate-700');
    }
  };
  const cardCls = mode === 'black' ? 'bg-gray-950 border border-gray-800' : dk ? 'bg-slate-800 shadow-md shadow-slate-900/30' : 'bg-white shadow-md';

  return (
    <div className={`${cardCls} rounded-lg p-6 border-l-4 border-indigo-500`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'} capitalize`}>{title}</h4>
        <div className="text-3xl font-bold text-indigo-600">{score}</div>
      </div>
      <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(status)} mb-3`}>
        {status.toUpperCase()}
      </div>
      <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'} mb-3`}>{message}</p>
      
      {/* Progress bar */}
      <div className={`w-full ${dk ? 'bg-slate-700' : 'bg-gray-200'} rounded-full h-2`}>
        <div 
          className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${score}%` }}
        ></div>
      </div>
    </div>
  );
};

// Recommendation Card Component
const RecommendationCard = ({ recommendation }) => {
  const { mode } = useTheme();
  const dk = mode === 'dark' || mode === 'black';
  const getPriorityBadge = (priority) => {
    const m = (l, d) => dk ? d : l;
    switch(priority) {
      case 'high':
        return <span className={`px-2 py-1 ${m('bg-red-100 text-red-800', 'bg-red-900/30 text-red-400')} text-xs font-semibold rounded`}>HIGH</span>;
      case 'medium':
        return <span className={`px-2 py-1 ${m('bg-yellow-100 text-yellow-800', 'bg-yellow-900/30 text-yellow-400')} text-xs font-semibold rounded`}>MEDIUM</span>;
      default:
        return <span className={`px-2 py-1 ${m('bg-blue-100 text-blue-800', 'bg-blue-900/30 text-blue-400')} text-xs font-semibold rounded`}>LOW</span>;
    }
  };
  const actionBg = mode === 'black' ? 'bg-gray-950' : dk ? 'bg-slate-800' : 'bg-white';

  return (
    <div className={`p-6 border-l-4 border-indigo-500 ${dk ? 'bg-indigo-900/20' : 'bg-indigo-50'} rounded-lg`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center">
          <Zap className="w-5 h-5 text-indigo-600 mr-2" />
          <h4 className={`font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>{recommendation.title}</h4>
        </div>
        {getPriorityBadge(recommendation.priority)}
      </div>
      <p className={`text-sm ${dk ? 'text-slate-300' : 'text-gray-700'} mb-3`}>{recommendation.message}</p>
      {recommendation.action && (
        <div className={`flex items-start mt-3 p-3 ${actionBg} rounded`}>
          <Info className="w-4 h-4 text-indigo-600 mr-2 mt-0.5 flex-shrink-0" />
          <span className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'}`}>{recommendation.action}</span>
        </div>
      )}
      {recommendation.potentialSavings && (
        <div className="mt-3 text-sm font-semibold text-green-600">
          Potential Savings: ₹{recommendation.potentialSavings.toLocaleString()}
        </div>
      )}
    </div>
  );
};

// Projection Card Component
const ProjectionCard = ({ period, score, currentScore }) => {
  const improvement = score - currentScore;
  
  return (
    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
      <h4 className="text-lg font-semibold mb-2">{period}</h4>
      <div className="text-4xl font-bold mb-2">{score}</div>
      <div className="flex items-center text-sm">
        {improvement > 0 ? (
          <>
            <ArrowUp className="w-4 h-4 mr-1" />
            <span>+{improvement} points</span>
          </>
        ) : (
          <span>No change</span>
        )}
      </div>
    </div>
  );
};

export default FinancialHealthDashboard;
