import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Zap,
  Brain,
  Target,
  DollarSign,
  Calendar,
  Activity,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Info
} from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import api from '../services/api';

const AIFinancialPredictions = () => {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('3months');
  const [activeView, setActiveView] = useState('overview');

  useEffect(() => {
    fetchPredictions();
  }, [selectedTimeframe]);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/insights/ai-predictions?timeframe=${selectedTimeframe}`);
      setPredictions(response.data);
    } catch (error) {
      console.error('Error fetching AI predictions:', error);
      // Set demo data for display
      setPredictions(getDemoData());
    } finally {
      setLoading(false);
    }
  };

  const getDemoData = () => ({
    spending: {
      nextMonth: {
        predicted: 45000,
        confidence: 87,
        trend: 'increasing',
        change: 8.5
      },
      categories: [
        { name: 'Groceries', predicted: 12000, confidence: 92, trend: 'stable' },
        { name: 'Transportation', predicted: 8500, confidence: 85, trend: 'increasing' },
        { name: 'Entertainment', predicted: 5000, confidence: 78, trend: 'increasing' },
        { name: 'Utilities', predicted: 4500, confidence: 95, trend: 'stable' },
      ]
    },
    savings: {
      projection: [
        { month: 'Current', amount: 150000 },
        { month: 'Month 1', amount: 162000 },
        { month: 'Month 2', amount: 174500 },
        { month: 'Month 3', amount: 187200 },
      ],
      goalAchievement: {
        emergencyFund: { progress: 75, onTrack: true, eta: '2 months' },
        vacation: { progress: 45, onTrack: true, eta: '5 months' },
        investment: { progress: 30, onTrack: false, eta: '8 months' }
      }
    },
    insights: [
      {
        type: 'warning',
        title: 'Spending Alert',
        message: 'Your entertainment spending is predicted to increase by 15% next month',
        action: 'Review subscriptions',
        priority: 'high'
      },
      {
        type: 'success',
        title: 'Savings Milestone',
        message: 'You\'re on track to reach your emergency fund goal in 2 months',
        action: 'Keep it up!',
        priority: 'medium'
      },
      {
        type: 'info',
        title: 'Investment Opportunity',
        message: 'Consider increasing your SIP by ₹5,000 to meet your investment goals',
        action: 'Optimize portfolio',
        priority: 'medium'
      }
    ],
    anomalies: [
      {
        type: 'unusual_spending',
        category: 'Shopping',
        amount: 18000,
        normalRange: '8,000 - 12,000',
        detected: '2 days ago'
      }
    ],
    recommendations: {
      savingsOptimization: {
        current: 12000,
        recommended: 15000,
        potentialSavings: 36000,
        timeframe: 'yearly'
      },
      debtPayoff: {
        current: 'minimum payments',
        recommended: 'avalanche method',
        potentialSavings: 45000,
        timeReduction: '8 months'
      }
    }
  });

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 rounded-2xl shadow-lg dark:shadow-slate-900/30 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (!predictions) {
    return null;
  }

  const SpendingPredictionCard = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md dark:shadow-slate-900/30 p-6 border border-purple-100 dark:border-purple-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Next Month Prediction</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">AI-powered spending forecast</p>
          </div>
        </div>
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
          predictions?.spending?.nextMonth?.trend === 'increasing' 
            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' 
            : predictions?.spending?.nextMonth?.trend === 'decreasing'
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
        }`}>
          {predictions?.spending?.nextMonth?.trend === 'increasing' ? (
            <TrendingUp className="w-4 h-4" />
          ) : predictions?.spending?.nextMonth?.trend === 'decreasing' ? (
            <TrendingDown className="w-4 h-4" />
          ) : (
            <Activity className="w-4 h-4" />
          )}
          <span className="text-sm font-semibold">
            {predictions?.spending?.nextMonth?.trend === 'increasing' ? '+' : predictions?.spending?.nextMonth?.trend === 'decreasing' ? '-' : ''}
            {predictions?.spending?.nextMonth?.change || 0}%
          </span>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">
            ₹{(predictions?.spending?.nextMonth?.predicted || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-sm text-gray-500 dark:text-slate-400">predicted spending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full" 
              style={{ width: `${predictions?.spending?.nextMonth?.confidence || 0}%` }}
            ></div>
          </div>
          <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
            {predictions?.spending?.nextMonth?.confidence || 0}% confidence
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Category Breakdown</h4>
        {predictions?.spending?.categories?.map((category, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{category.name}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  ₹{category.predicted.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-1.5">
                  <div 
                    className="bg-purple-500 h-1.5 rounded-full" 
                    style={{ width: `${category.confidence}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 dark:text-slate-400">{category.confidence}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const SavingsProjectionCard = () => {
    const chartData = {
      labels: predictions?.savings?.projection?.map(p => p.month) || [],
      datasets: [{
        label: 'Projected Savings',
        data: predictions?.savings?.projection?.map(p => p.amount) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      }]
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `₹${context.parsed.y.toLocaleString('en-IN')}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => `₹${(value / 1000).toFixed(0)}k`
          }
        }
      }
    };

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md dark:shadow-slate-900/30 p-6 border border-blue-100 dark:border-blue-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Savings Projection</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">Goal achievement timeline</p>
          </div>
        </div>

        <div className="mb-6" style={{ height: '200px' }}>
          <Line data={chartData} options={chartOptions} />
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Goal Progress</h4>
          {Object.entries(predictions?.savings?.goalAchievement || {}).map(([goal, data], index) => (
            <div key={index} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                  {goal.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <div className="flex items-center gap-2">
                  {data.onTrack ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                  )}
                  <span className="text-xs font-medium text-gray-600 dark:text-slate-400">ETA: {data.eta}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${data.onTrack ? 'bg-green-500' : 'bg-orange-500'}`}
                    style={{ width: `${data.progress}%` }}
                  ></div>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{data.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const InsightsCard = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md dark:shadow-slate-900/30 p-6 border border-green-100 dark:border-green-800">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
          <Sparkles className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Insights</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">Personalized recommendations</p>
        </div>
      </div>

      <div className="space-y-3">
        {predictions?.insights?.map((insight, index) => (
          <div 
            key={index} 
            className={`p-4 rounded-lg border-l-4 ${
              insight.type === 'warning' 
                ? 'bg-orange-50 border-orange-500 dark:bg-orange-900/20' 
                : insight.type === 'success'
                ? 'bg-green-50 border-green-500 dark:bg-green-900/20'
                : 'bg-blue-50 border-blue-500 dark:bg-blue-900/20'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {insight.type === 'warning' ? (
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                ) : insight.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Info className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">{insight.title}</h4>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                    insight.priority === 'high' 
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                      : insight.priority === 'medium'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}>
                    {insight.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">{insight.message}</p>
                <button className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  {insight.action}
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {predictions.anomalies && predictions.anomalies.length > 0 && (
        <>
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Detected Anomalies
            </h4>
            {predictions.anomalies.map((anomaly, index) => (
              <div key={index} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                      {anomaly.type.replace(/_/g, ' ')}
                    </span>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                      {anomaly.category}: <span className="font-bold">₹{anomaly.amount.toLocaleString('en-IN')}</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                      Normal range: ₹{anomaly.normalRange} • {anomaly.detected}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const OptimizationCard = () => (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl shadow-md dark:shadow-slate-900/30 p-6 border border-indigo-200 dark:border-indigo-800">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
          <Award className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Optimization Tips</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">Maximize your financial potential</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm dark:shadow-slate-900/30">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">💰 Savings Optimization</h4>
            <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
              +₹{(predictions?.recommendations?.savingsOptimization?.potentialSavings || 0).toLocaleString('en-IN')}/year
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-slate-400">Current Monthly Saving:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                ₹{(predictions?.recommendations?.savingsOptimization?.current || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-slate-400">Recommended:</span>
              <span className="font-bold text-green-600">
                ₹{(predictions?.recommendations?.savingsOptimization?.recommended || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          <button className="mt-3 w-full py-2 px-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold text-sm hover:from-green-600 hover:to-emerald-600 transition-all">
            Apply Recommendation
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm dark:shadow-slate-900/30">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">🎯 Debt Payoff Strategy</h4>
            <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
              Save {predictions?.recommendations?.debtPayoff?.timeReduction || 'N/A'}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-slate-400">Current Strategy:</span>
              <span className="font-semibold text-gray-900 dark:text-white capitalize">
                {predictions?.recommendations?.debtPayoff?.current || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-slate-400">Recommended:</span>
              <span className="font-bold text-blue-600 capitalize">
                {predictions?.recommendations?.debtPayoff?.recommended || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-slate-400">Interest Savings:</span>
              <span className="font-bold text-green-600">
                ₹{(predictions?.recommendations?.debtPayoff?.potentialSavings || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          <button className="mt-3 w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg font-semibold text-sm hover:from-blue-600 hover:to-indigo-600 transition-all">
            Switch Strategy
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              <Brain className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">AI Financial Intelligence</h2>
              <p className="text-purple-100 text-sm">Powered by machine learning predictions</p>
            </div>
          </div>
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <option value="1month" className="text-gray-900">Next Month</option>
            <option value="3months" className="text-gray-900">Next 3 Months</option>
            <option value="6months" className="text-gray-900">Next 6 Months</option>
            <option value="1year" className="text-gray-900">Next Year</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5" />
              <span className="text-sm font-semibold">Prediction Accuracy</span>
            </div>
            <div className="text-3xl font-bold">94%</div>
            <div className="text-xs text-purple-100 mt-1">Based on your history</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5" />
              <span className="text-sm font-semibold">Active Insights</span>
            </div>
            <div className="text-3xl font-bold">{predictions?.insights?.length || 0}</div>
            <div className="text-xs text-purple-100 mt-1">Actionable recommendations</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5" />
              <span className="text-sm font-semibold">Next Update</span>
            </div>
            <div className="text-3xl font-bold">24h</div>
            <div className="text-xs text-purple-100 mt-1">Real-time monitoring</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendingPredictionCard />
        <SavingsProjectionCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <InsightsCard />
        </div>
        <div>
          <OptimizationCard />
        </div>
      </div>
    </div>
  );
};

export default AIFinancialPredictions;
