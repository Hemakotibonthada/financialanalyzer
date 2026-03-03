import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, DollarSign, Calendar, Target, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

const RetirementPlanner = () => {
  const { isDark } = useTheme();
  const [plans, setPlans] = useState([]);
  const [projection, setProjection] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchRetirementData();
  }, []);

  const fetchRetirementData = async () => {
    try {
      const plansRes = await api.get('/retirement');
      setPlans(plansRes.data);
      
      if (plansRes.data.length > 0) {
        setSelectedPlan(plansRes.data[0]);
        fetchProjection(plansRes.data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching retirement data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjection = async (planId) => {
    try {
      const res = await api.get(`/retirement/${planId}/projection`);
      setProjection(res.data);
    } catch (error) {
      console.error('Error fetching projection:', error);
    }
  };

  const handlePlanChange = async (planId) => {
    const plan = plans.find(p => p._id === planId);
    setSelectedPlan(plan);
    await fetchProjection(planId);
  };

  if (loading) {
    return <div className={`flex justify-center items-center h-64 ${isDark ? 'text-gray-300' : ''}`}>Loading Retirement Planner...</div>;
  }

  const totalSaved = plans.reduce((sum, p) => sum + (p.currentBalance || 0), 0);
  const totalTarget = plans.reduce((sum, p) => sum + (p.targetAmount || 0), 0);
  const monthlyContributions = plans.reduce((sum, p) => sum + (p.monthlyContribution || 0), 0);

  const planDistribution = plans.map(p => ({
    name: p.planName,
    value: p.currentBalance || 0
  }));

  // Generate growth projection chart data
  const growthData = projection?.yearlyProjections || [];

  const contributionData = plans.map(p => ({
    name: p.planName,
    monthly: p.monthlyContribution || 0,
    annual: (p.monthlyContribution || 0) * 12
  }));

  return (
    <div className={`min-h-screen p-6 space-y-6 ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <div className="flex justify-between items-center">
        <h1 className={`text-3xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <Target className="w-8 h-8" />
          Retirement Planning
        </h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Create New Plan
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Saved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(totalSaved / 100000).toFixed(2)}L
            </div>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Current Balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Retirement Goal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ₹{(totalTarget / 10000000).toFixed(2)}Cr
            </div>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Target Corpus</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Monthly Contribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{monthlyContributions.toLocaleString()}
            </div>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Across all plans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(1) : 0}%
            </div>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Of total goal</p>
          </CardContent>
        </Card>
      </div>

      {/* Plan Selector */}
      {plans.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>Select Plan:</label>
            <select 
              className={`ml-3 px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300'}`}
              value={selectedPlan?._id || ''}
              onChange={(e) => handlePlanChange(e.target.value)}
            >
              {plans.map(plan => (
                <option key={plan._id} value={plan._id}>
                  {plan.planName}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projection">Projection</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="strategy">Strategy</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={planDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ₹${(value / 100000).toFixed(0)}L`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {planDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${(value / 100000).toFixed(2)}L`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Contributions</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={contributionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="monthly" fill="#82ca9d" name="Monthly" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Plan Details */}
          {selectedPlan && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>{selectedPlan.planName} - Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Current Age</p>
                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>{selectedPlan.currentAge}</p>
                  </div>
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-green-900/20' : 'bg-green-50'}`}>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Retirement Age</p>
                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>{selectedPlan.retirementAge}</p>
                  </div>
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Years to Retirement</p>
                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>{selectedPlan.retirementAge - selectedPlan.currentAge}</p>
                  </div>
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-orange-900/20' : 'bg-orange-50'}`}>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Expected Return</p>
                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>{selectedPlan.expectedReturn}%</p>
                  </div>
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Inflation Rate</p>
                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>{selectedPlan.inflationRate}%</p>
                  </div>
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Life Expectancy</p>
                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>{selectedPlan.lifeExpectancy}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="projection">
          {projection && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Corpus Growth Projection</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={growthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip formatter={(value) => `₹${(value / 100000).toFixed(2)}L`} />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="balance" 
                        stackId="1" 
                        stroke="#8884d8" 
                        fill="#8884d8" 
                        name="Portfolio Value"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Projected Corpus at Retirement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      ₹{(projection.projectedCorpus / 10000000).toFixed(2)}Cr
                    </div>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>At age {selectedPlan?.retirementAge}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Monthly Income Post-Retirement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      ₹{(projection.monthlyIncomePostRetirement || 0).toLocaleString()}
                    </div>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Inflation adjusted</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Surplus/Shortfall</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${
                      projection.surplus >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {projection.surplus >= 0 ? '+' : ''}₹{(Math.abs(projection.surplus) / 100000).toFixed(2)}L
                    </div>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {projection.surplus >= 0 ? 'On track!' : 'Needs adjustment'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Yearly Breakdown Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Year-by-Year Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                          <th className={`text-left py-2 ${isDark ? 'text-gray-300' : ''}`}>Year</th>
                          <th className={`text-right py-2 ${isDark ? 'text-gray-300' : ''}`}>Age</th>
                          <th className={`text-right py-2 ${isDark ? 'text-gray-300' : ''}`}>Contribution</th>
                          <th className={`text-right py-2 ${isDark ? 'text-gray-300' : ''}`}>Returns</th>
                          <th className={`text-right py-2 ${isDark ? 'text-gray-300' : ''}`}>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {growthData.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                            <td className="py-2">{row.year}</td>
                            <td className="text-right py-2">{row.age}</td>
                            <td className="text-right py-2 text-green-600">
                              ₹{(row.contribution / 1000).toFixed(0)}K
                            </td>
                            <td className="text-right py-2 text-blue-600">
                              ₹{(row.returns / 1000).toFixed(0)}K
                            </td>
                            <td className="text-right py-2 font-semibold">
                              ₹{(row.balance / 100000).toFixed(2)}L
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {growthData.length > 10 && (
                      <p className={`text-xs mt-2 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Showing first 10 years. Full projection available in detailed view.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="plans">
          <div className="space-y-4">
            {plans.map(plan => {
              const yearsToRetirement = plan.retirementAge - plan.currentAge;
              const progress = plan.targetAmount > 0 
                ? ((plan.currentBalance / plan.targetAmount) * 100) 
                : 0;

              return (
                <Card key={plan._id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className={`text-xl font-bold ${isDark ? 'text-white' : ''}`}>{plan.planName}</h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{plan.planType}</p>
                      </div>
                      <button 
                        className={`px-3 py-1 text-sm border rounded-lg ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                        onClick={() => handlePlanChange(plan._id)}
                      >
                        View Details
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Current Balance</p>
                        <p className={`text-lg font-semibold ${isDark ? 'text-white' : ''}`}>₹{(plan.currentBalance / 100000).toFixed(2)}L</p>
                      </div>
                      <div>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Target Amount</p>
                        <p className={`text-lg font-semibold ${isDark ? 'text-white' : ''}`}>₹{(plan.targetAmount / 100000).toFixed(2)}L</p>
                      </div>
                      <div>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Monthly SIP</p>
                        <p className="text-lg font-semibold text-green-600">
                          ₹{plan.monthlyContribution.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Years to Retirement</p>
                        <p className={`text-lg font-semibold ${isDark ? 'text-white' : ''}`}>{yearsToRetirement}</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress to Goal</span>
                        <span className="font-semibold">{progress.toFixed(1)}%</span>
                      </div>
                      <div className={`w-full rounded-full h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Investment Allocation */}
                    {plan.investmentAllocation && plan.investmentAllocation.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Investment Allocation</p>
                        <div className="flex gap-2 flex-wrap">
                          {plan.investmentAllocation.map((alloc, idx) => (
                            <span key={idx} className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                              {alloc.assetType}: {alloc.percentage}%
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="strategy">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Retirement Strategy Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projection && projection.surplus < 0 && (
                    <div className={`p-4 rounded-lg border ${isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div>
                          <p className={`font-semibold ${isDark ? 'text-red-400' : 'text-red-900'}`}>Shortfall Alert</p>
                          <p className={`text-sm mt-1 ${isDark ? 'text-red-300' : 'text-red-800'}`}>
                            Your current savings plan falls short by ₹{(Math.abs(projection.surplus) / 100000).toFixed(2)}L. 
                            Consider increasing your monthly contribution.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {projection && projection.surplus >= 0 && (
                    <div className={`p-4 rounded-lg border ${isDark ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'}`}>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <p className={`font-semibold ${isDark ? 'text-green-400' : 'text-green-900'}`}>On Track!</p>
                          <p className={`text-sm mt-1 ${isDark ? 'text-green-300' : 'text-green-800'}`}>
                            Your retirement plan is on track. You're projected to have a surplus of ₹{(projection.surplus / 100000).toFixed(2)}L.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={`p-4 rounded-lg ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                    <h4 className={`font-semibold mb-2 ${isDark ? 'text-white' : ''}`}>Optimization Tips</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <TrendingUp className="w-4 h-4 mt-0.5 text-blue-600" />
                        <span>Consider increasing equity allocation in early years for higher growth potential</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Target className="w-4 h-4 mt-0.5 text-blue-600" />
                        <span>Gradually shift to debt instruments as you approach retirement age</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <DollarSign className="w-4 h-4 mt-0.5 text-blue-600" />
                        <span>Take advantage of employer matching contributions if available</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 mt-0.5 text-blue-600" />
                        <span>Review and rebalance your portfolio annually</span>
                      </li>
                    </ul>
                  </div>

                  {selectedPlan && (
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>
                      <h4 className={`font-semibold mb-2 ${isDark ? 'text-white' : ''}`}>Suggested Actions</h4>
                      <ul className="space-y-2 text-sm">
                        {selectedPlan.monthlyContribution < 10000 && (
                          <li>• Consider increasing monthly contribution to at least ₹10,000</li>
                        )}
                        {selectedPlan.expectedReturn < 10 && (
                          <li>• Review investment allocation for potentially higher returns</li>
                        )}
                        {(selectedPlan.retirementAge - selectedPlan.currentAge) < 20 && (
                          <li>• With less than 20 years to retirement, consider more aggressive savings</li>
                        )}
                        <li>• Explore tax-saving investment options like ELSS, PPF, NPS</li>
                        <li>• Consider diversifying across multiple retirement instruments</li>
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RetirementPlanner;
