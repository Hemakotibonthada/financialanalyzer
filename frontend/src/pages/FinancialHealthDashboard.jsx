import React, { useState, useEffect } from 'react';
import api from '../services/api';
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
  Info
} from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState(null);
  const [spendingData, setSpendingData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-700 dark:text-slate-300">No Data Available</h2>
          <p className="text-gray-500 dark:text-slate-400 mt-2">Add some transactions to see your financial health</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Financial Health Dashboard</h1>
          <p className="text-gray-600 dark:text-slate-400">Comprehensive analysis of your financial wellness</p>
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
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30 mb-6">
          <div className="flex border-b dark:border-slate-700 overflow-x-auto">
            {['overview', 'scores', 'spending', 'recommendations'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 font-medium capitalize whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
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
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
                <div className="flex items-center mb-4">
                  <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Your Strengths</h3>
                </div>
                {healthData.strengths.length > 0 ? (
                  <div className="space-y-3">
                    {healthData.strengths.map((strength, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <span className="font-medium text-gray-700 dark:text-slate-300 capitalize">
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
                  <p className="text-gray-500 dark:text-slate-400">Keep working on your financial health to build strengths</p>
                )}
              </div>

              {/* Weaknesses */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
                <div className="flex items-center mb-4">
                  <AlertCircle className="w-6 h-6 text-orange-500 mr-2" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Areas for Improvement</h3>
                </div>
                {healthData.weaknesses.length > 0 ? (
                  <div className="space-y-3">
                    {healthData.weaknesses.map((weakness, index) => (
                      <div key={index} className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-700 dark:text-slate-300 capitalize">
                            {weakness.category.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className="text-orange-600 font-bold">{weakness.score}/100</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-slate-400">{weakness.recommendation}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-slate-400">Great! No major weaknesses identified</p>
                )}
              </div>
            </div>

            {/* Spending Insights */}
            {spendingData && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Spending Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {spendingData.insights.slice(0, 3).map((insight, index) => (
                    <div key={index} className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                      <div className="text-3xl mb-2">{insight.icon}</div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{insight.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-slate-400">{insight.message}</p>
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
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Health Score Breakdown</h3>
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
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
                <h4 className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-2">Total Expenses</h4>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  ₹{spendingData.summary.totalExpense.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">Last 6 months</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
                <h4 className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-2">Total Income</h4>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  ₹{spendingData.summary.totalIncome.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">Last 6 months</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
                <h4 className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-2">Net Savings</h4>
                <p className={`text-3xl font-bold ${
                  spendingData.summary.netSavings >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ₹{spendingData.summary.netSavings.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
                  Savings Rate: {spendingData.summary.savingsRate}%
                </p>
              </div>
            </div>

            {/* Category Spending */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Spending by Category</h3>
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
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Spending Patterns</h3>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Recurring Transactions</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">
                    {spendingData.patterns.recurring.length} recurring payments detected
                  </p>
                  <div className="space-y-2">
                    {spendingData.patterns.recurring.slice(0, 3).map((transaction, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{transaction.merchant}</span>
                        <div className="text-right">
                          <span className="text-sm font-bold">₹{transaction.amount}</span>
                          <span className="text-xs text-gray-500 dark:text-slate-400 ml-2">{transaction.frequency}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Impulse Purchases</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
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
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Personalized Recommendations</h3>
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
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Financial Health Projections</h3>
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
              <div className="mt-6 p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Assumptions:</h4>
                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-slate-400 space-y-1">
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
  );
};

// Stat Card Component
const StatCard = ({ icon: Icon, title, value, change, positive, color }) => {
  const colors = {
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
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
      <h3 className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
};

// Score Card Component
const ScoreCard = ({ title, score, status, message, details }) => {
  const getStatusColor = (status) => {
    switch(status) {
      case 'excellent': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-700';
      case 'good': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-700';
      case 'fair': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700';
      case 'poor': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-700';
      case 'critical': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-700';
      default: return 'bg-gray-100 dark:bg-slate-800/50 text-gray-800 dark:text-slate-300 border-gray-200 dark:border-slate-700';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6 border-l-4 border-indigo-500">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-bold text-gray-900 dark:text-white capitalize">{title}</h4>
        <div className="text-3xl font-bold text-indigo-600">{score}</div>
      </div>
      <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(status)} mb-3`}>
        {status.toUpperCase()}
      </div>
      <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">{message}</p>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
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
  const getPriorityBadge = (priority) => {
    switch(priority) {
      case 'high':
        return <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 text-xs font-semibold rounded">HIGH</span>;
      case 'medium':
        return <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 text-xs font-semibold rounded">MEDIUM</span>;
      default:
        return <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-xs font-semibold rounded">LOW</span>;
    }
  };

  return (
    <div className="p-6 border-l-4 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center">
          <Zap className="w-5 h-5 text-indigo-600 mr-2" />
          <h4 className="font-bold text-gray-900 dark:text-white">{recommendation.title}</h4>
        </div>
        {getPriorityBadge(recommendation.priority)}
      </div>
      <p className="text-sm text-gray-700 dark:text-slate-300 mb-3">{recommendation.message}</p>
      {recommendation.action && (
        <div className="flex items-start mt-3 p-3 bg-white dark:bg-slate-800 rounded">
          <Info className="w-4 h-4 text-indigo-600 mr-2 mt-0.5 flex-shrink-0" />
          <span className="text-sm text-gray-600 dark:text-slate-400">{recommendation.action}</span>
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
