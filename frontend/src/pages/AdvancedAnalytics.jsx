import { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, AlertTriangle, Calendar, DollarSign, 
  Target, Activity, Award, Lightbulb, Zap, BarChart3, PieChart,
  Clock, MapPin, Flame, Check, X
} from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const AdvancedAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('forecast');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAdvancedAnalytics();
  }, []);

  const fetchAdvancedAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/analytics/advanced/complete-dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setAnalyticsData(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching advanced analytics:', err);
      setError(err.response?.data?.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 65) return 'text-blue-600 bg-blue-100';
    if (score >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getSeverityColor = (severity) => {
    if (severity === 'high') return 'text-red-600 bg-red-50 border-red-200';
    if (severity === 'medium') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'critical' || priority === 'high') return <AlertTriangle className="w-5 h-5 text-red-500" />;
    if (priority === 'medium') return <Activity className="w-5 h-5 text-yellow-500" />;
    return <Lightbulb className="w-5 h-5 text-blue-500" />;
  };

  const getConfidenceColor = (confidence) => {
    if (confidence === 'high') return 'text-green-600';
    if (confidence === 'medium') return 'text-yellow-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading advanced analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 text-center mb-2">Error Loading Analytics</h3>
          <p className="text-red-700 text-center">{error}</p>
          <button
            onClick={fetchAdvancedAnalytics}
            className="mt-4 w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { forecast, anomalies, heatmap, healthScore, savingsOpportunities } = analyticsData || {};

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Advanced Analytics Dashboard</h1>
          <p className="text-gray-600">AI-powered insights into your financial patterns</p>
        </div>

        {/* Financial Health Score - Prominent Display */}
        {healthScore && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 mb-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Award className="w-6 h-6" />
                  <h2 className="text-xl font-semibold">Financial Health Score</h2>
                </div>
                <p className="text-blue-100 text-sm">Based on {healthScore.factors.length} key factors</p>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold mb-1">{healthScore.score}</div>
                <div className="text-xl font-medium">{healthScore.rating}</div>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
              <div className="text-center">
                <div className="text-2xl font-bold">{healthScore.factors.length}</div>
                <div className="text-sm text-blue-100">Factors Analyzed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{healthScore.recommendations?.length || 0}</div>
                <div className="text-sm text-blue-100">Recommendations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {formatCurrency(savingsOpportunities?.totalPotentialSavings || 0)}
                </div>
                <div className="text-sm text-blue-100">Potential Savings</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-2">
          <div className="flex space-x-2 overflow-x-auto">
            {[
              { id: 'forecast', label: 'Spending Forecast', icon: TrendingUp },
              { id: 'anomalies', label: 'Anomalies', icon: AlertTriangle },
              { id: 'heatmap', label: 'Spending Heatmap', icon: Flame },
              { id: 'health', label: 'Health Factors', icon: Activity },
              { id: 'savings', label: 'Savings Opportunities', icon: Target }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Spending Forecast Tab */}
          {activeTab === 'forecast' && forecast && (
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">30-Day Spending Forecast</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(forecast.confidence)}`}>
                    {forecast.confidence.toUpperCase()} Confidence
                  </span>
                </div>
                
                {forecast.summary && (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Avg Daily Spending</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(forecast.summary.avgDailySpending)}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Expected Monthly</div>
                      <div className="text-2xl font-bold text-purple-600">
                        {formatCurrency(forecast.summary.expectedMonthlySpending)}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Volatility</div>
                      <div className="text-2xl font-bold text-gray-700">
                        {forecast.summary.volatility}
                      </div>
                    </div>
                  </div>
                )}

                {/* Forecast Timeline */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Daily Predictions</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {forecast.forecast.slice(0, 14).map((day, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                        <div className="flex items-center space-x-3">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900">
                              {new Date(day.date).toLocaleDateString('en-IN', { 
                                month: 'short', 
                                day: 'numeric',
                                weekday: 'short'
                              })}
                            </div>
                            <div className="text-xs text-gray-500">
                              Range: {formatCurrency(day.confidenceRange.lower)} - {formatCurrency(day.confidenceRange.upper)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">{formatCurrency(day.predicted)}</div>
                          <div className="text-xs text-gray-500">{day.dayOfWeek}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category Patterns */}
              {forecast.categoryPatterns && Object.keys(forecast.categoryPatterns).length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Category Spending Patterns</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(forecast.categoryPatterns).map(([category, data]) => (
                      <div key={category} className="border border-gray-200 rounded-lg p-4">
                        <div className="font-medium text-gray-900 mb-2 capitalize">{category}</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Average Amount:</span>
                            <span className="font-semibold">{formatCurrency(data.avgAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Frequency:</span>
                            <span className="font-semibold">{(data.frequency * 30).toFixed(1)} times/month</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Transactions:</span>
                            <span className="font-semibold">{data.count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Anomalies Tab */}
          {activeTab === 'anomalies' && anomalies && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Unusual Transactions Detected</h2>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-gray-900">{anomalies.summary.totalAnomalies}</div>
                    <div className="text-sm text-gray-600">Total Anomalies</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-red-600">{anomalies.summary.highSeverity}</div>
                    <div className="text-sm text-gray-600">High Severity</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-yellow-600">{anomalies.summary.mediumSeverity}</div>
                    <div className="text-sm text-gray-600">Medium Severity</div>
                  </div>
                </div>

                {/* Anomaly List */}
                {anomalies.detected.length === 0 ? (
                  <div className="text-center py-8">
                    <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-600">No unusual transactions detected. Your spending is consistent!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {anomalies.detected.map((anomaly, index) => (
                      <div 
                        key={index} 
                        className={`border rounded-lg p-4 ${getSeverityColor(anomaly.severity)}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <AlertTriangle className={`w-4 h-4 ${
                                anomaly.severity === 'high' ? 'text-red-500' : 'text-yellow-500'
                              }`} />
                              <span className="font-semibold text-gray-900">
                                {anomaly.transaction.description}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                anomaly.severity === 'high' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'
                              }`}>
                                {anomaly.severity.toUpperCase()}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 capitalize">
                              {anomaly.transaction.category} • {new Date(anomaly.transaction.date).toLocaleDateString('en-IN')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-gray-900">
                              {formatCurrency(anomaly.transaction.amount)}
                            </div>
                            <div className="text-xs text-gray-600">
                              {anomaly.anomalyType === 'unusually_high' ? '↑' : '↓'} {anomaly.context.percentageDifference}
                            </div>
                          </div>
                        </div>
                        <div className="bg-white/50 rounded p-2 text-sm">
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-600">Category Average:</span>
                            <span className="font-medium">{formatCurrency(anomaly.context.categoryAverage)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Deviation:</span>
                            <span className="font-medium">{formatCurrency(Math.abs(anomaly.context.deviation))}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Heatmap Tab */}
          {activeTab === 'heatmap' && heatmap && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Spending Heatmap</h2>
                <p className="text-gray-600 mb-6">When do you spend the most? Darker colors indicate higher spending.</p>

                {/* Peak Times */}
                {heatmap.peakTimes && heatmap.peakTimes.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Peak Spending Times</h3>
                    <div className="grid grid-cols-5 gap-3">
                      {heatmap.peakTimes.map((peak, index) => (
                        <div key={index} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-1">
                            <Flame className="w-4 h-4 text-orange-600" />
                            <span className="text-xs font-medium text-gray-600">#{index + 1}</span>
                          </div>
                          <div className="text-sm font-semibold text-gray-900">{peak.time}</div>
                          <div className="text-xs text-gray-600">{formatCurrency(peak.averageSpending)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Day Totals */}
                {heatmap.dayTotals && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Spending by Day of Week</h3>
                    <div className="space-y-2">
                      {heatmap.dayTotals.map((day, index) => {
                        const maxTotal = Math.max(...heatmap.dayTotals.map(d => d.total));
                        const percentage = (day.total / maxTotal) * 100;
                        
                        return (
                          <div key={index}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-gray-700">{day.day}</span>
                              <span className="text-sm font-bold text-gray-900">{formatCurrency(day.total)}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Avg per transaction: {formatCurrency(day.avgPerTransaction)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Health Factors Tab */}
          {activeTab === 'health' && healthScore && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Financial Health Breakdown</h2>
                
                <div className="space-y-4">
                  {healthScore.factors.map((factor, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Activity className="w-5 h-5 text-blue-600" />
                            <h3 className="font-semibold text-gray-900">{factor.name}</h3>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              factor.status === 'excellent' ? 'bg-green-100 text-green-800' :
                              factor.status === 'good' ? 'bg-blue-100 text-blue-800' :
                              factor.status === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {factor.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{factor.detail}</p>
                        </div>
                        <div className="text-right ml-4">
                          <div className={`text-2xl font-bold ${
                            factor.impact > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {factor.impact > 0 ? '+' : ''}{factor.impact}
                          </div>
                          <div className="text-xs text-gray-500">points</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {healthScore.recommendations && healthScore.recommendations.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Personalized Recommendations</h2>
                  <div className="space-y-4">
                    {healthScore.recommendations.map((rec, index) => (
                      <div key={index} className="border-l-4 border-blue-600 bg-blue-50 p-4 rounded-r-lg">
                        <div className="flex items-start space-x-3">
                          {getPriorityIcon(rec.priority)}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                rec.priority === 'critical' || rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                                rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {rec.priority.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-3">{rec.description}</p>
                            <div className="bg-white rounded p-3">
                              <div className="text-xs font-semibold text-gray-600 mb-2">ACTION STEPS:</div>
                              <ul className="space-y-1">
                                {rec.actionSteps.map((step, idx) => (
                                  <li key={idx} className="text-sm text-gray-700 flex items-start">
                                    <span className="text-blue-600 mr-2">•</span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Savings Opportunities Tab */}
          {activeTab === 'savings' && savingsOpportunities && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Savings Opportunities</h2>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Total Potential Savings</div>
                    <div className="text-3xl font-bold text-green-600">
                      {formatCurrency(savingsOpportunities.totalPotentialSavings)}
                    </div>
                    <div className="text-xs text-gray-500">per month</div>
                  </div>
                </div>

                {savingsOpportunities.opportunities.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Great job! No major savings opportunities identified.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {savingsOpportunities.opportunities.map((opp, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {opp.type === 'high_spending_category' ? (
                                <PieChart className="w-5 h-5 text-orange-600" />
                              ) : (
                                <Zap className="w-5 h-5 text-purple-600" />
                              )}
                              <h3 className="font-semibold text-gray-900 capitalize">
                                {opp.type === 'high_spending_category' ? 
                                  `${opp.category} - High Spending Category` : 
                                  `Recurring: ${opp.description}`
                                }
                              </h3>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{opp.suggestion}</p>
                            
                            <div className="grid grid-cols-3 gap-4">
                              {opp.currentSpending && (
                                <div className="bg-gray-50 rounded p-2">
                                  <div className="text-xs text-gray-600">Current Spending</div>
                                  <div className="text-lg font-semibold text-gray-900">
                                    {formatCurrency(opp.currentSpending || opp.totalSpent)}
                                  </div>
                                </div>
                              )}
                              {opp.frequency && (
                                <div className="bg-blue-50 rounded p-2">
                                  <div className="text-xs text-gray-600">Frequency</div>
                                  <div className="text-lg font-semibold text-blue-700">
                                    {opp.frequency} times
                                  </div>
                                </div>
                              )}
                              {opp.transactionCount && (
                                <div className="bg-purple-50 rounded p-2">
                                  <div className="text-xs text-gray-600">Transactions</div>
                                  <div className="text-lg font-semibold text-purple-700">
                                    {opp.transactionCount}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="ml-4 text-right">
                            <div className="text-xs text-gray-600 mb-1">Potential Savings</div>
                            <div className="text-2xl font-bold text-green-600">
                              {formatCurrency(opp.potentialSavings || opp.potentialMonthlySavings)}
                            </div>
                            <div className="text-xs text-gray-500">/month</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;
