import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Activity,
  Shield,
  Target,
  Zap,
  RefreshCw,
  Download,
  Info,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon
} from 'lucide-react';
import MainLayout from '../components/MainLayout';
import { Line, Bar, Doughnut, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PortfolioAnalyticsDashboard = () => {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  const [loading, setLoading] = useState(true);
  const [portfolioData, setPortfolioData] = useState(null);
  const [timeframe, setTimeframe] = useState('1Y');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchPortfolioData();
  }, [timeframe]);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/portfolio/analytics?timeframe=${timeframe}`);
      setPortfolioData(response.data);
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    if (!portfolioData) return;
    const dataStr = JSON.stringify(portfolioData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `portfolio-analytics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!portfolioData || portfolioData.totalValue === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <PieChartIcon className={`w-16 h-16 ${dk ? 'text-slate-500' : 'text-gray-400'} mx-auto mb-4`} />
          <h2 className={`text-2xl font-bold ${dk ? 'text-slate-300' : 'text-gray-700'}`}>No Portfolio Data</h2>
          <p className={`${dk ? 'text-slate-400' : 'text-gray-500'} mt-2`}>Add investments to start tracking your portfolio</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${dk ? 'bg-slate-950' : 'bg-gray-50'} p-6`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className={`text-4xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-2`}>Portfolio Analytics</h1>
            <p className={`${dk ? 'text-slate-400' : 'text-gray-600'}`}>Advanced investment analysis and performance metrics</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className={`px-4 py-2 border ${dk ? `border-slate-600` : `border-gray-300`} rounded-lg focus:outline-none focus:ring-2 ${dk ? 'bg-slate-800' : 'focus:ring-indigo-500'}${dk ? `text-slate-200` : ` `}`}
            >
              <option value="1M">1 Month</option>
              <option value="3M">3 Months</option>
              <option value="6M">6 Months</option>
              <option value="1Y">1 Year</option>
              <option value="ALL">All Time</option>
            </select>
            <button
              onClick={fetchPortfolioData}
              className={`p-2 ${dk ? `bg-slate-800` : `bg-white`} border ${dk ? 'border-slate-600' : 'border-gray-300'} rounded-lg ${dk ? `hover:bg-slate-700` : `hover:bg-gray-50`}`}
              title="Refresh Data"
            >
              <RefreshCw className={`w-5 h-5 ${dk ? 'text-slate-400' : 'text-gray-600'}`} />
            </button>
            <button
              onClick={exportData}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Download className="w-5 h-5 inline mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Portfolio Value Card */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Total Portfolio Value</h2>
              <p className="text-indigo-100">Current market value of all investments</p>
            </div>
            <div className="text-center">
              <div className="text-6xl font-bold">₹{portfolioData.totalValue?.toLocaleString()}</div>
              <div className="flex items-center justify-center mt-2 space-x-4">
                <div className={`flex items-center ${portfolioData.totalReturn >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  {portfolioData.totalReturn >= 0 ? <TrendingUp className="w-6 h-6 mr-1" /> : <TrendingDown className="w-6 h-6 mr-1" />}
                  <span className="text-2xl font-bold">
                    {portfolioData.totalReturn >= 0 ? '+' : ''}₹{Math.abs(portfolioData.totalReturn || 0).toLocaleString()}
                  </span>
                </div>
                <span className="text-2xl">
                  ({portfolioData.totalReturnPercent >= 0 ? '+' : ''}{portfolioData.totalReturnPercent?.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-4 gap-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <div className="text-sm text-indigo-100">Invested</div>
              <div className="text-2xl font-bold">₹{portfolioData.totalInvested?.toLocaleString()}</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <div className="text-sm text-indigo-100">Day Change</div>
              <div className={`text-2xl font-bold ${portfolioData.dayChange >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {portfolioData.dayChange >= 0 ? '+' : ''}₹{Math.abs(portfolioData.dayChange || 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <div className="text-sm text-indigo-100">XIRR</div>
              <div className="text-2xl font-bold">{portfolioData.xirr?.toFixed(2)}%</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <div className="text-sm text-indigo-100">Holdings</div>
              <div className="text-2xl font-bold">{portfolioData.holdings?.length || 0}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-lg ${dk ? 'shadow-slate-900/30' : 'shadow'} mb-6`}>
          <div className={`flex ${dk ? 'border-slate-700' : 'border-b'} overflow-x-auto`}>
            {['overview', 'performance', 'risk', 'allocation', 'holdings'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 font-medium capitalize whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : `${dk ? 'text-slate-400' : 'text-gray-600'} ${dk ? 'hover:text-white' : 'hover:text-gray-900'}`
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
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <MetricCard
                icon={TrendingUp}
                title="Annualized Return"
                value={`${portfolioData.annualizedReturn?.toFixed(2)}%`}
                subtitle={portfolioData.annualizedReturn > 0 ? 'Above benchmark' : 'Below benchmark'}
                color="green"
              />
              <MetricCard
                icon={Activity}
                title="Sharpe Ratio"
                value={portfolioData.sharpeRatio?.toFixed(2)}
                subtitle={portfolioData.sharpeRatio > 1 ? 'Excellent' : portfolioData.sharpeRatio > 0 ? 'Good' : 'Poor'}
                color="blue"
              />
              <MetricCard
                icon={Shield}
                title="Beta"
                value={portfolioData.beta?.toFixed(2)}
                subtitle={portfolioData.beta < 1 ? 'Lower volatility' : 'Higher volatility'}
                color="purple"
              />
              <MetricCard
                icon={AlertTriangle}
                title="Value at Risk (95%)"
                value={`₹${Math.abs(portfolioData.valueAtRisk || 0).toLocaleString()}`}
                subtitle="Potential loss"
                color="red"
              />
            </div>

            {/* Performance Chart */}
            <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-lg ${dk ? 'shadow-slate-900/30' : 'shadow-md'} p-6`}>
              <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Portfolio Performance</h3>
              <div className="h-80">
                {portfolioData.performanceHistory && (
                  <Line
                    data={{
                      labels: portfolioData.performanceHistory.map(p => p.date),
                      datasets: [
                        {
                          label: 'Portfolio Value',
                          data: portfolioData.performanceHistory.map(p => p.value),
                          borderColor: 'rgb(99, 102, 241)',
                          backgroundColor: 'rgba(99, 102, 241, 0.1)',
                          fill: true,
                          tension: 0.4
                        },
                        {
                          label: 'Invested Amount',
                          data: portfolioData.performanceHistory.map(p => p.invested),
                          borderColor: 'rgb(156, 163, 175)',
                          borderDash: [5, 5],
                          fill: false,
                          tension: 0.4
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top'
                        },
                        tooltip: {
                          mode: 'index',
                          intersect: false
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: false,
                          title: {
                            display: true,
                            text: 'Value (₹)'
                          }
                        }
                      }
                    }}
                  />
                )}
              </div>
            </div>

            {/* Asset Allocation & Sector Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-lg ${dk ? 'shadow-slate-900/30' : 'shadow-md'} p-6`}>
                <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Asset Allocation</h3>
                <div className="h-80">
                  {portfolioData.assetAllocation && (
                    <Doughnut
                      data={{
                        labels: portfolioData.assetAllocation.map(a => a.type),
                        datasets: [{
                          data: portfolioData.assetAllocation.map(a => a.percentage),
                          backgroundColor: [
                            'rgba(99, 102, 241, 0.8)',
                            'rgba(168, 85, 247, 0.8)',
                            'rgba(236, 72, 153, 0.8)',
                            'rgba(251, 146, 60, 0.8)',
                            'rgba(34, 197, 94, 0.8)',
                            'rgba(14, 165, 233, 0.8)'
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
                  )}
                </div>
              </div>

              <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-lg ${dk ? 'shadow-slate-900/30' : 'shadow-md'} p-6`}>
                <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Sector Distribution</h3>
                <div className="h-80">
                  {portfolioData.sectorDistribution && (
                    <Bar
                      data={{
                        labels: portfolioData.sectorDistribution.map(s => s.sector),
                        datasets: [{
                          label: 'Percentage',
                          data: portfolioData.sectorDistribution.map(s => s.percentage),
                          backgroundColor: 'rgba(99, 102, 241, 0.8)'
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        plugins: {
                          legend: {
                            display: false
                          }
                        },
                        scales: {
                          x: {
                            beginAtZero: true,
                            max: 100,
                            title: {
                              display: true,
                              text: 'Percentage (%)'
                            }
                          }
                        }
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            {/* Returns by Period */}
            <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-lg ${dk ? 'shadow-slate-900/30' : 'shadow-md'} p-6`}>
              <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Returns by Period</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {portfolioData.returnsByPeriod && Object.entries(portfolioData.returnsByPeriod).map(([period, value]) => (
                  <div key={period} className={`p-4 ${dk ? 'bg-slate-900' : 'bg-gray-50'} rounded-lg text-center`}>
                    <div className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'} capitalize`}>{period}</div>
                    <div className={`text-2xl font-bold ${value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {value >= 0 ? '+' : ''}{value?.toFixed(2)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Returns Heatmap */}
            <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-lg ${dk ? 'shadow-slate-900/30' : 'shadow-md'} p-6`}>
              <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Monthly Returns</h3>
              <div className="h-80">
                {portfolioData.monthlyReturns && (
                  <Bar
                    data={{
                      labels: portfolioData.monthlyReturns.map(m => m.month),
                      datasets: [{
                        label: 'Monthly Return (%)',
                        data: portfolioData.monthlyReturns.map(m => m.return),
                        backgroundColor: portfolioData.monthlyReturns.map(m =>
                          m.return >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'
                        )
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        }
                      },
                      scales: {
                        y: {
                          title: {
                            display: true,
                            text: 'Return (%)'
                          }
                        }
                      }
                    }}
                  />
                )}
              </div>
            </div>

            {/* Top Performers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-lg ${dk ? 'shadow-slate-900/30' : 'shadow-md'} p-6`}>
                <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>
                  <TrendingUp className="w-6 h-6 inline text-green-600 mr-2" />
                  Top Performers
                </h3>
                <div className="space-y-3">
                  {portfolioData.topPerformers?.map((holding, index) => (
                    <div key={index} className={`flex items-center justify-between p-3 ${dk ? 'bg-green-900/20' : 'bg-green-50'} rounded-lg`}>
                      <div>
                        <div className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>{holding.name}</div>
                        <div className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'}`}>{holding.type}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">+{holding.return?.toFixed(2)}%</div>
                        <div className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'}`}>₹{holding.gain?.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-lg ${dk ? 'shadow-slate-900/30' : 'shadow-md'} p-6`}>
                <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>
                  <TrendingDown className="w-6 h-6 inline text-red-600 mr-2" />
                  Underperformers
                </h3>
                <div className="space-y-3">
                  {portfolioData.underperformers?.map((holding, index) => (
                    <div key={index} className={`flex items-center justify-between p-3 ${dk ? 'bg-red-900/20' : 'bg-red-50'} rounded-lg`}>
                      <div>
                        <div className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>{holding.name}</div>
                        <div className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'}`}>{holding.type}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-red-600">{holding.return?.toFixed(2)}%</div>
                        <div className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'}`}>₹{holding.loss?.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Risk Tab */}
        {activeTab === 'risk' && (
          <div className="space-y-6">
            {/* Risk Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <RiskCard
                title="Standard Deviation"
                value={`${portfolioData.standardDeviation?.toFixed(2)}%`}
                description="Measure of portfolio volatility"
                level={portfolioData.standardDeviation > 20 ? 'high' : portfolioData.standardDeviation > 10 ? 'medium' : 'low'}
              />
              <RiskCard
                title="Maximum Drawdown"
                value={`${portfolioData.maxDrawdown?.toFixed(2)}%`}
                description="Largest peak-to-trough decline"
                level={Math.abs(portfolioData.maxDrawdown) > 30 ? 'high' : Math.abs(portfolioData.maxDrawdown) > 15 ? 'medium' : 'low'}
              />
              <RiskCard
                title="Sortino Ratio"
                value={portfolioData.sortinoRatio?.toFixed(2)}
                description="Downside risk-adjusted return"
                level={portfolioData.sortinoRatio > 1.5 ? 'low' : portfolioData.sortinoRatio > 0.5 ? 'medium' : 'high'}
              />
            </div>

            {/* Risk vs Return Scatter */}
            <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-lg ${dk ? 'shadow-slate-900/30' : 'shadow-md'} p-6`}>
              <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Risk vs Return Analysis</h3>
              <div className="h-80">
                {portfolioData.riskReturnData && (
                  <Scatter
                    data={{
                      datasets: [{
                        label: 'Holdings',
                        data: portfolioData.riskReturnData.map(h => ({
                          x: h.risk,
                          y: h.return,
                          label: h.name
                        })),
                        backgroundColor: 'rgba(99, 102, 241, 0.6)',
                        pointRadius: 8
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              const point = context.raw;
                              return `${point.label}: Return ${point.y?.toFixed(2)}%, Risk ${point.x?.toFixed(2)}%`;
                            }
                          }
                        }
                      },
                      scales: {
                        x: {
                          title: {
                            display: true,
                            text: 'Risk (Std Dev %)'
                          }
                        },
                        y: {
                          title: {
                            display: true,
                            text: 'Return (%)'
                          }
                        }
                      }
                    }}
                  />
                )}
              </div>
            </div>

            {/* Concentration Risk */}
            <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-lg ${dk ? 'shadow-slate-900/30' : 'shadow-md'} p-6`}>
              <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Concentration Risk</h3>
              <div className="space-y-4">
                <div className={`p-4 ${dk ? 'bg-yellow-900/20' : 'bg-yellow-50'} border-l-4 border-yellow-400 rounded`}>
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>Top 5 Holdings</div>
                      <div className={`text-sm ${dk ? 'text-slate-300' : 'text-gray-700'} mt-1`}>
                        Your top 5 holdings represent {portfolioData.top5Concentration?.toFixed(1)}% of your portfolio
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {portfolioData.concentrationByType && Object.entries(portfolioData.concentrationByType).map(([type, percentage]) => (
                    <div key={type} className={`p-4 ${dk ? 'bg-slate-900' : 'bg-gray-50'} rounded-lg`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className={`font-medium ${dk ? 'text-white' : 'text-gray-900'} capitalize`}>{type}</span>
                        <span className={`font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>{percentage?.toFixed(1)}%</span>
                      </div>
                      <div className={`w-full ${dk ? 'bg-slate-700' : 'bg-gray-200'} rounded-full h-2`}>
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Allocation Tab */}
        {activeTab === 'allocation' && (
          <div className="space-y-6">
            {/* Target vs Actual Allocation */}
            <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-lg ${dk ? 'shadow-slate-900/30' : 'shadow-md'} p-6`}>
              <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Target vs Actual Allocation</h3>
              <div className="space-y-4">
                {portfolioData.allocationComparison && portfolioData.allocationComparison.map((item, index) => (
                  <div key={index}>
                    <div className={`flex justify-between text-sm ${dk ? 'text-slate-400' : 'text-gray-600'} mb-2`}>
                      <span className="font-medium">{item.type}</span>
                      <span>
                        Actual: {item.actual?.toFixed(1)}% | Target: {item.target?.toFixed(1)}% 
                        <span className={`ml-2 font-bold ${item.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ({item.difference >= 0 ? '+' : ''}{item.difference?.toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                    <div className={`relative w-full ${dk ? 'bg-slate-700' : 'bg-gray-200'} rounded-full h-6`}>
                      <div
                        className="absolute bg-indigo-600 h-6 rounded-full"
                        style={{ width: `${item.actual}%` }}
                      ></div>
                      <div
                        className="absolute border-2 border-yellow-500 h-6"
                        style={{ left: `${item.target}%`, width: '2px' }}
                        title="Target"
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rebalancing Recommendations */}
            {portfolioData.rebalanceRecommendations && (
              <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-lg ${dk ? 'shadow-slate-900/30' : 'shadow-md'} p-6`}>
                <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Rebalancing Recommendations</h3>
                <div className="space-y-3">
                  {portfolioData.rebalanceRecommendations.map((rec, index) => (
                    <div key={index} className={`p-4 border-l-4 rounded ${
                      rec.action === 'buy' ? `${dk ? 'bg-green-900/20' : 'bg-green-50'} border-green-500` : `${dk ? 'bg-red-900/20' : 'bg-red-50'} border-red-500`
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>{rec.holding}</div>
                          <div className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'} mt-1`}>{rec.reason}</div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${rec.action === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                            {rec.action === 'buy' ? 'BUY' : 'SELL'}
                          </div>
                          <div className={`text-sm ${dk ? 'text-white' : 'text-gray-900'}`}>₹{rec.amount?.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Holdings Tab */}
        {activeTab === 'holdings' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {portfolioData.holdings?.map((holding, index) => (
                <HoldingCard key={index} holding={holding} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Components
const MetricCard = ({ icon: Icon, title, value, subtitle, color }) => {
  const colors = {
    green: `${dk ? 'bg-green-900/30' : 'bg-green-100'} ${dk ? 'text-green-400' : 'text-green-600'}`,
    blue: `${dk ? 'bg-blue-900/30' : 'bg-blue-100'} ${dk ? 'text-blue-400' : 'text-blue-600'}`,
    purple: `${dk ? 'bg-purple-900/30' : 'bg-purple-100'} ${dk ? 'text-purple-400' : 'text-purple-600'}`,
    red: `${dk ? 'bg-red-900/30' : 'bg-red-100'} ${dk ? 'text-red-400' : 'text-red-600'}`
  };

  return (
    <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-lg ${dk ? 'shadow-slate-900/30' : 'shadow-md'} p-6`}>
      <div className={`p-3 rounded-lg ${colors[color]} inline-block mb-3`}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className={`text-sm font-medium ${dk ? 'text-slate-400' : 'text-gray-600'} mb-1`}>{title}</h3>
      <p className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-1`}>{value}</p>
      <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{subtitle}</p>
    </div>
  );
};

const RiskCard = ({ title, value, description, level }) => {
  const levelColors = {
    low: `${dk ? 'bg-green-900/30' : 'bg-green-100'} ${dk ? 'text-green-400' : 'text-green-800'} ${dk ? 'border-green-700' : 'border-green-300'}`,
    medium: `${dk ? 'bg-yellow-900/30' : 'bg-yellow-100'} ${dk ? 'text-yellow-400' : 'text-yellow-800'} ${dk ? 'border-yellow-700' : 'border-yellow-300'}`,
    high: `${dk ? 'bg-red-900/30' : 'bg-red-100'} ${dk ? 'text-red-400' : 'text-red-800'} ${dk ? 'border-red-700' : 'border-red-300'}`
  };

  return (
    <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-lg ${dk ? 'shadow-slate-900/30' : 'shadow-md'} p-6`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${levelColors[level]}`}>
          {level.toUpperCase()}
        </span>
      </div>
      <p className={`text-3xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-2`}>{value}</p>
      <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'}`}>{description}</p>
    </div>
  );
};

const HoldingCard = ({ holding }) => {
  const returnPercent = ((holding.currentValue - holding.invested) / holding.invested) * 100;
  const isProfit = returnPercent >= 0;

  return (
    <MainLayout title="Portfolio Analytics Dashboard">
    <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-lg ${dk ? 'shadow-slate-900/30' : 'shadow-md'} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>{holding.name}</h3>
          <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'}`}>{holding.type} • {holding.quantity} units</p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>₹{holding.currentValue?.toLocaleString()}</div>
          <div className={`text-lg font-semibold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
            {isProfit ? '+' : ''}₹{Math.abs(holding.currentValue - holding.invested).toLocaleString()} ({returnPercent.toFixed(2)}%)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className={`p-3 ${dk ? 'bg-slate-900' : 'bg-gray-50'} rounded-lg`}>
          <div className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-600'}`}>Invested</div>
          <div className={`text-sm font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>₹{holding.invested?.toLocaleString()}</div>
        </div>
        <div className={`p-3 ${dk ? 'bg-slate-900' : 'bg-gray-50'} rounded-lg`}>
          <div className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-600'}`}>Avg Price</div>
          <div className={`text-sm font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>₹{holding.avgPrice?.toLocaleString()}</div>
        </div>
        <div className={`p-3 ${dk ? 'bg-slate-900' : 'bg-gray-50'} rounded-lg`}>
          <div className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-600'}`}>Current Price</div>
          <div className={`text-sm font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>₹{holding.currentPrice?.toLocaleString()}</div>
        </div>
        <div className={`p-3 ${dk ? 'bg-slate-900' : 'bg-gray-50'} rounded-lg`}>
          <div className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-600'}`}>Day Change</div>
          <div className={`text-sm font-bold ${holding.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {holding.dayChange >= 0 ? '+' : ''}{holding.dayChange?.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
    </MainLayout>
  );
};

export default PortfolioAnalyticsDashboard;
