import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import {
  TrendingDown,
  Target,
  Calendar,
  DollarSign,
  Zap,
  Award,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Download,
  Calculator,
  ArrowRight,
  Info
} from 'lucide-react';
import MainLayout from '../components/MainLayout';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
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

const DebtManagementDashboard = () => {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  const [loading, setLoading] = useState(true);
  const [debtData, setDebtData] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [extraPayment, setExtraPayment] = useState(0);
  const [selectedStrategy, setSelectedStrategy] = useState('avalanche');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDebtData();
  }, []);

  useEffect(() => {
    if (extraPayment >= 0) {
      fetchComparison();
    }
  }, [extraPayment]);

  const fetchDebtData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/debt/analyze');
      setDebtData(response.data);
    } catch (error) {
      console.error('Error fetching debt data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComparison = async () => {
    try {
      const response = await api.post('/debt/compare-strategies', { extraPayment });
      setComparison(response.data);
    } catch (error) {
      console.error('Error fetching comparison:', error);
    }
  };

  const calculateStrategy = async (strategy) => {
    try {
      const response = await api.post(`/debt/${strategy}`, { extraPayment });
      setDebtData({ ...debtData, selectedStrategy: response.data });
      setSelectedStrategy(strategy);
    } catch (error) {
      console.error(`Error calculating ${strategy} strategy:`, error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!debtData || debtData.totalDebt === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className={`text-2xl font-bold ${dk ? 'text-slate-300' : 'text-gray-700'}`}>No Debts Found</h2>
          <p className={`${dk ? 'text-slate-400' : 'text-gray-500'} mt-2`}>You're debt-free! Keep up the good work!</p>
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
            <h1 className={`text-4xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-2`}>Debt Management</h1>
            <p className={`${dk ? 'text-slate-400' : 'text-gray-600'}`}>Strategic debt payoff planning and optimization</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchDebtData}
              className={`p-2 ${dk ? `bg-slate-800` : `bg-white`} border ${dk ? 'border-slate-600' : 'border-gray-300'} rounded-lg ${dk ? `hover:bg-slate-700` : `hover:bg-gray-50`}`}
              title="Refresh Data"
            >
              <RefreshCw className={`w-5 h-5 ${dk ? 'text-slate-400' : 'text-gray-600'}`} />
            </button>
          </div>
        </div>

        {/* Total Debt Card */}
        <div className="bg-gradient-to-r from-red-600 to-pink-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Total Debt</h2>
              <p className="text-red-100">All outstanding balances combined</p>
            </div>
            <div className="text-center">
              <div className="text-6xl font-bold">₹{debtData.totalDebt?.toLocaleString()}</div>
              <div className="text-xl mt-2">{debtData.debts?.length} Debts</div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <div className="text-sm text-red-100">Monthly Payment</div>
              <div className="text-2xl font-bold">₹{debtData.minimumPayment?.toLocaleString()}</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <div className="text-sm text-red-100">Total Interest</div>
              <div className="text-2xl font-bold">₹{debtData.totalInterest?.toLocaleString()}</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <div className="text-sm text-red-100">Avg Interest Rate</div>
              <div className="text-2xl font-bold">{debtData.averageInterestRate?.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* Extra Payment Selector */}
        <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-lg ${dk ? 'shadow-slate-900/30' : 'shadow-md'} p-6 mb-8`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-6 h-6 text-indigo-600" />
              <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>Extra Monthly Payment</h3>
            </div>
            <div className="text-2xl font-bold text-indigo-600">₹{extraPayment.toLocaleString()}</div>
          </div>
          <input
            type="range"
            min="0"
            max="10000"
            step="500"
            value={extraPayment}
            onChange={(e) => setExtraPayment(parseInt(e.target.value))}
            className={`w-full h-2 ${dk ? 'bg-slate-700' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer`}
          />
          <div className={`flex justify-between text-sm ${dk ? 'text-slate-400' : 'text-gray-600'} mt-2`}>
            <span>₹0</span>
            <span>₹5,000</span>
            <span>₹10,000</span>
          </div>
          <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'} mt-4`}>
            Adjust the slider to see how extra payments accelerate your debt payoff
          </p>
        </div>

        {/* Tabs */}
        <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-lg ${dk ? 'shadow-slate-900/30' : 'shadow'} mb-6`}>
          <div className={`flex ${dk ? 'border-slate-700' : 'border-b'} overflow-x-auto`}>
            {['overview', 'strategies', 'schedule', 'debts'].map(tab => (
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
                icon={Target}
                title="Debt-Free Date"
                value={debtData.debtFreeDate || 'Calculate Strategy'}
                color="blue"
              />
              <MetricCard
                icon={Calendar}
                title="Months to Payoff"
                value={debtData.monthsToPayoff || '-'}
                color="purple"
              />
              <MetricCard
                icon={TrendingDown}
                title="Interest Savings"
                value={`₹${(debtData.interestSaved || 0).toLocaleString()}`}
                color="green"
              />
              <MetricCard
                icon={Zap}
                title="Payoff Progress"
                value={`${Math.round(debtData.payoffProgress || 0)}%`}
                color="orange"
              />
            </div>

            {/* Debt Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-lg ${dk ? 'shadow-slate-900/30' : 'shadow-md'} p-6`}>
                <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Debt Distribution</h3>
                <div className="h-80">
                  {debtData.debts && (
                    <Doughnut
                      data={{
                        labels: debtData.debts.map(d => d.name),
                        datasets: [{
                          data: debtData.debts.map(d => d.balance),
                          backgroundColor: [
                            'rgba(239, 68, 68, 0.8)',
                            'rgba(251, 146, 60, 0.8)',
                            'rgba(251, 191, 36, 0.8)',
                            'rgba(34, 197, 94, 0.8)',
                            'rgba(59, 130, 246, 0.8)',
                            'rgba(168, 85, 247, 0.8)'
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
                <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Interest Rate Comparison</h3>
                <div className="h-80">
                  {debtData.debts && (
                    <Bar
                      data={{
                        labels: debtData.debts.map(d => d.name),
                        datasets: [{
                          label: 'Interest Rate (%)',
                          data: debtData.debts.map(d => d.interestRate),
                          backgroundColor: 'rgba(239, 68, 68, 0.8)'
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
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: 'Interest Rate (%)'
                            }
                          }
                        }
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {debtData.recommendations && (
              <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-lg ${dk ? 'shadow-slate-900/30' : 'shadow-md'} p-6`}>
                <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Recommendations</h3>
                <div className="space-y-3">
                  {debtData.recommendations.map((rec, index) => (
                    <div key={index} className={`p-4 ${dk ? 'bg-indigo-900/20' : 'bg-indigo-50'} border-l-4 border-indigo-600 rounded`}>
                      <div className="flex items-start space-x-3">
                        <Info className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                        <p className={`${dk ? 'text-slate-300' : 'text-gray-700'}`}>{rec}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Strategies Tab */}
        {activeTab === 'strategies' && (
          <div className="space-y-6">
            {/* Strategy Comparison */}
            {comparison && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StrategyCard
                  name="Snowball"
                  description="Pay smallest balance first"
                  data={comparison.snowball}
                  selected={selectedStrategy === 'snowball'}
                  onSelect={() => calculateStrategy('snowball')}
                  icon="🎯"
                  color="blue"
                />
                <StrategyCard
                  name="Avalanche"
                  description="Pay highest interest first"
                  data={comparison.avalanche}
                  selected={selectedStrategy === 'avalanche'}
                  onSelect={() => calculateStrategy('avalanche')}
                  icon="⚡"
                  color="purple"
                  recommended={true}
                />
                <StrategyCard
                  name="Custom"
                  description="Balanced approach"
                  data={comparison.custom}
                  selected={selectedStrategy === 'custom'}
                  onSelect={() => calculateStrategy('custom')}
                  icon="🎨"
                  color="green"
                />
              </div>
            )}

            {/* Strategy Details */}
            {debtData.selectedStrategy && (
              <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-lg ${dk ? 'shadow-slate-900/30' : 'shadow-md'} p-6`}>
                <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>
                  {selectedStrategy.charAt(0).toUpperCase() + selectedStrategy.slice(1)} Strategy Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className={`p-4 ${dk ? 'bg-blue-900/20' : 'bg-blue-50'} rounded-lg`}>
                    <div className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'}`}>Debt-Free Date</div>
                    <div className="text-xl font-bold text-blue-600">
                      {debtData.selectedStrategy.debtFreeDate || 'N/A'}
                    </div>
                  </div>
                  <div className={`p-4 ${dk ? 'bg-purple-900/20' : 'bg-purple-50'} rounded-lg`}>
                    <div className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'}`}>Months to Payoff</div>
                    <div className="text-xl font-bold text-purple-600">
                      {debtData.selectedStrategy.monthsToPayoff || '-'}
                    </div>
                  </div>
                  <div className={`p-4 ${dk ? 'bg-green-900/20' : 'bg-green-50'} rounded-lg`}>
                    <div className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'}`}>Interest Saved</div>
                    <div className="text-xl font-bold text-green-600">
                      ₹{(debtData.selectedStrategy.interestSaved || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className={`p-4 ${dk ? 'bg-orange-900/20' : 'bg-orange-50'} rounded-lg`}>
                    <div className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'}`}>Total Paid</div>
                    <div className="text-xl font-bold text-orange-600">
                      ₹{(debtData.selectedStrategy.totalPaid || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Payoff Order */}
                {debtData.selectedStrategy.payoffOrder && (
                  <div>
                    <h4 className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-3`}>Payoff Order</h4>
                    <div className="space-y-2">
                      {debtData.selectedStrategy.payoffOrder.map((debt, index) => (
                        <div key={index} className={`flex items-center justify-between p-3 ${dk ? 'bg-slate-900' : 'bg-gray-50'} rounded-lg`}>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                              {index + 1}
                            </div>
                            <span className={`font-medium ${dk ? 'text-white' : 'text-gray-900'}`}>{debt.name}</span>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'}`}>Balance</div>
                            <div className={`font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>₹{debt.balance?.toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && debtData.selectedStrategy && (
          <div className="space-y-6">
            {/* Timeline Chart */}
            <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-lg ${dk ? 'shadow-slate-900/30' : 'shadow-md'} p-6`}>
              <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Payoff Timeline</h3>
              <div className="h-80">
                {debtData.selectedStrategy.timeline && (
                  <Line
                    data={{
                      labels: debtData.selectedStrategy.timeline.map(t => t.month),
                      datasets: [{
                        label: 'Remaining Balance',
                        data: debtData.selectedStrategy.timeline.map(t => t.balance),
                        borderColor: 'rgb(239, 68, 68)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        tension: 0.4
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
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Balance (₹)'
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Month'
                          }
                        }
                      }
                    }}
                  />
                )}
              </div>
            </div>

            {/* Monthly Schedule */}
            {debtData.selectedStrategy.schedule && (
              <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-lg ${dk ? 'shadow-slate-900/30' : 'shadow-md'} p-6`}>
                <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Monthly Payment Schedule</h3>
                <div className="overflow-x-auto">
                  <table className={`min-w-full divide-y ${dk ? 'divide-slate-700' : 'divide-gray-200'}`}>
                    <thead className={`${dk ? 'bg-slate-900' : 'bg-gray-50'}`}>
                      <tr>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${dk ? 'text-slate-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Month
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${dk ? 'text-slate-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Payment
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${dk ? 'text-slate-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Principal
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${dk ? 'text-slate-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Interest
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${dk ? 'text-slate-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Balance
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`${dk ? 'bg-slate-800' : 'bg-white'} divide-y ${dk ? 'divide-slate-700' : 'divide-gray-200'}`}>
                      {debtData.selectedStrategy.schedule.slice(0, 12).map((row, index) => (
                        <tr key={index}>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${dk ? 'text-white' : 'text-gray-900'}`}>{row.month}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${dk ? 'text-white' : 'text-gray-900'}`}>
                            ₹{row.payment?.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                            ₹{row.principal?.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                            ₹{row.interest?.toLocaleString()}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${dk ? 'text-white' : 'text-gray-900'}`}>
                            ₹{row.balance?.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {debtData.selectedStrategy.schedule.length > 12 && (
                  <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'} mt-4 text-center`}>
                    Showing first 12 months of {debtData.selectedStrategy.schedule.length} total months
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Debts Tab */}
        {activeTab === 'debts' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {debtData.debts?.map((debt, index) => (
                <DebtCard key={index} debt={debt} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Components
const MetricCard = ({ icon: Icon, title, value, color }) => {
  const colors = {
    blue: `${dk ? 'bg-blue-900/30' : 'bg-blue-100'} ${dk ? 'text-blue-400' : 'text-blue-600'}`,
    purple: `${dk ? 'bg-purple-900/30' : 'bg-purple-100'} ${dk ? 'text-purple-400' : 'text-purple-600'}`,
    green: `${dk ? 'bg-green-900/30' : 'bg-green-100'} ${dk ? 'text-green-400' : 'text-green-600'}`,
    orange: `${dk ? 'bg-orange-900/30' : 'bg-orange-100'} ${dk ? 'text-orange-400' : 'text-orange-600'}`
  };

  return (
    <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-lg ${dk ? 'shadow-slate-900/30' : 'shadow-md'} p-6`}>
      <div className={`p-3 rounded-lg ${colors[color]} inline-block mb-3`}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className={`text-sm font-medium ${dk ? 'text-slate-400' : 'text-gray-600'} mb-1`}>{title}</h3>
      <p className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
};

const StrategyCard = ({ name, description, data, selected, onSelect, icon, color, recommended }) => {
  const colors = {
    blue: `border-blue-500 ${dk ? 'bg-blue-900/20' : 'bg-blue-50'}`,
    purple: `border-purple-500 ${dk ? 'bg-purple-900/20' : 'bg-purple-50'}`,
    green: `border-green-500 ${dk ? 'bg-green-900/20' : 'bg-green-50'}`
  };

  return (
    <div
      onClick={onSelect}
      className={`relative p-6 border-2 rounded-lg cursor-pointer transition-all ${
        selected ? `${colors[color]} shadow-lg` : `${dk ? 'border-slate-700' : 'border-gray-200'} ${dk ? 'bg-slate-800' : 'bg-white'} ${dk ? 'hover:border-slate-600' : 'hover:border-gray-300'}`
      }`}
    >
      {recommended && (
        <div className="absolute -top-3 right-4 px-3 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">
          RECOMMENDED
        </div>
      )}
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'} mb-2`}>{name}</h3>
      <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'} mb-4`}>{description}</p>
      {data && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className={`${dk ? 'text-slate-400' : 'text-gray-600'}`}>Months:</span>
            <span className="font-semibold">{data.monthsToPayoff}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className={`${dk ? 'text-slate-400' : 'text-gray-600'}`}>Interest Saved:</span>
            <span className="font-semibold text-green-600">₹{data.interestSaved?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className={`${dk ? 'text-slate-400' : 'text-gray-600'}`}>Total Paid:</span>
            <span className="font-semibold">₹{data.totalPaid?.toLocaleString()}</span>
          </div>
        </div>
      )}
      {selected && (
        <div className="mt-4 flex items-center justify-center text-indigo-600">
          <CheckCircle className="w-5 h-5 mr-2" />
          <span className="font-semibold">Selected</span>
        </div>
      )}
    </div>
  );
};

const DebtCard = ({ debt }) => {
  const progress = ((debt.originalAmount - debt.balance) / debt.originalAmount) * 100;

  return (
    <MainLayout title="Debt Management Dashboard">
    <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-lg ${dk ? 'shadow-slate-900/30' : 'shadow-md'} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>{debt.name}</h3>
          <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'} capitalize`}>{debt.type?.replace('_', ' ')}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-red-600">₹{debt.balance?.toLocaleString()}</div>
          <div className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'}`}>{debt.interestRate}% APR</div>
        </div>
      </div>
      
      <div className="mb-4">
        <div className={`flex justify-between text-sm ${dk ? 'text-slate-400' : 'text-gray-600'} mb-1`}>
          <span>Payoff Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className={`w-full ${dk ? 'bg-slate-700' : 'bg-gray-200'} rounded-full h-3`}>
          <div
            className="bg-green-600 h-3 rounded-full"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className={`p-3 ${dk ? 'bg-slate-900' : 'bg-gray-50'} rounded-lg`}>
          <div className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-600'}`}>Monthly Payment</div>
          <div className={`text-sm font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>₹{debt.minimumPayment?.toLocaleString()}</div>
        </div>
        <div className={`p-3 ${dk ? 'bg-slate-900' : 'bg-gray-50'} rounded-lg`}>
          <div className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-600'}`}>Remaining Months</div>
          <div className={`text-sm font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>{debt.remainingMonths}</div>
        </div>
        <div className={`p-3 ${dk ? 'bg-slate-900' : 'bg-gray-50'} rounded-lg`}>
          <div className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-600'}`}>Original Amount</div>
          <div className={`text-sm font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>₹{debt.originalAmount?.toLocaleString()}</div>
        </div>
      </div>
    </div>
    </MainLayout>
  );
};

export default DebtManagementDashboard;
