import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Shield, Heart, Car, Home, Briefcase, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '@/services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658'];

const InsuranceDashboard = () => {
  const [policies, setPolicies] = useState([]);
  const [coverageGaps, setCoverageGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchInsuranceData();
  }, []);

  const fetchInsuranceData = async () => {
    try {
      const [policiesRes, gapsRes] = await Promise.all([
        api.get('/insurance').catch(() => ({ data: [] })),
        api.get('/insurance/analysis/coverage').catch(() => ({ data: {} }))
      ]);

      const policiesData = policiesRes.data;
      setPolicies(Array.isArray(policiesData) ? policiesData : (policiesData?.policies || []));
      setCoverageGaps(gapsRes.data?.gaps || gapsRes.data?.recommendations || []);
    } catch (error) {
      console.error('Error fetching insurance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'life': return <Heart className="w-5 h-5" />;
      case 'health': return <Heart className="w-5 h-5 text-red-500" />;
      case 'vehicle': return <Car className="w-5 h-5 text-blue-500" />;
      case 'home': return <Home className="w-5 h-5 text-green-500" />;
      case 'travel': return <Briefcase className="w-5 h-5 text-purple-500" />;
      default: return <Shield className="w-5 h-5" />;
    }
  };

  const activePolicies = policies.filter(p => p.status === 'active');
  const expiringPolicies = policies.filter(p => {
    const daysToExpiry = Math.ceil((new Date(p.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    return daysToExpiry <= 30 && daysToExpiry > 0;
  });

  const totalCoverage = activePolicies.reduce((sum, p) => sum + (p.coverageAmount || 0), 0);
  const totalPremium = activePolicies.reduce((sum, p) => sum + (p.premiumAmount || 0), 0);

  const coverageByType = policies.reduce((acc, policy) => {
    const type = policy.policyType;
    if (!acc[type]) acc[type] = { coverage: 0, premium: 0, count: 0 };
    acc[type].coverage += policy.coverageAmount || 0;
    acc[type].premium += policy.premiumAmount || 0;
    acc[type].count++;
    return acc;
  }, {});

  const coverageChartData = Object.entries(coverageByType).map(([type, data]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    coverage: data.coverage,
    premium: data.premium,
    count: data.count
  }));

  const premiumFrequencyData = policies.reduce((acc, policy) => {
    const freq = policy.premiumFrequency;
    if (!acc[freq]) acc[freq] = 0;
    acc[freq] += policy.premiumAmount || 0;
    return acc;
  }, {});

  const frequencyChartData = Object.entries(premiumFrequencyData).map(([freq, amount]) => ({
    name: freq.charAt(0).toUpperCase() + freq.slice(1),
    amount
  }));

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading Insurance Dashboard...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="w-8 h-8" />
          Insurance Portfolio
        </h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Add Policy
        </button>
      </div>

      {/* Alert for expiring policies */}
      {expiringPolicies.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <p className="text-sm">
                <strong>{expiringPolicies.length}</strong> {expiringPolicies.length === 1 ? 'policy' : 'policies'} expiring in the next 30 days
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coverage Gaps Alert */}
      {coverageGaps.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm font-semibold">Coverage Gaps Detected</p>
                <ul className="text-xs mt-1 list-disc list-inside">
                  {coverageGaps.slice(0, 3).map((gap, idx) => (
                    <li key={idx}>{typeof gap === 'string' ? gap : (gap.recommendation || gap.type || JSON.stringify(gap))}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePolicies.length}</div>
            <p className="text-xs text-gray-500 mt-1">Out of {policies.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(totalCoverage / 10000000).toFixed(2)}Cr
            </div>
            <p className="text-xs text-gray-500 mt-1">Sum Assured</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Premium</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ₹{totalPremium.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Annual equivalent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Claims Filed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {policies.reduce((sum, p) => sum + (p.claims?.length || 0), 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Total claims</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Coverage by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={coverageChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, coverage }) => `${name}: ₹${(coverage / 100000).toFixed(0)}L`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="coverage"
                    >
                      {coverageChartData.map((entry, index) => (
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
                <CardTitle>Premium by Frequency</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={frequencyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                    <Bar dataKey="amount" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Policy Type Breakdown */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Policy Type Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {coverageChartData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(item.name.toLowerCase())}
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-gray-600">{item.count} {item.count === 1 ? 'policy' : 'policies'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₹{(item.coverage / 100000).toFixed(2)}L</p>
                      <p className="text-sm text-gray-600">Premium: ₹{item.premium.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies">
          <Card>
            <CardHeader>
              <CardTitle>All Policies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {policies.map(policy => {
                  const daysToExpiry = Math.ceil((new Date(policy.endDate) - new Date()) / (1000 * 60 * 60 * 24));
                  const isExpiring = daysToExpiry <= 30 && daysToExpiry > 0;

                  return (
                    <div key={policy._id} className={`p-4 border rounded-lg ${isExpiring ? 'border-orange-300 bg-orange-50' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3 flex-1">
                          {getTypeIcon(policy.policyType)}
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold">{policy.policyName}</h3>
                            <p className="text-sm text-gray-600">{policy.provider}</p>
                            <p className="text-xs text-gray-500">Policy #: {policy.policyNumber}</p>
                            
                            <div className="flex gap-4 mt-2 text-sm">
                              <span className={`px-2 py-1 rounded ${
                                policy.status === 'active' ? 'bg-green-100 text-green-800' :
                                policy.status === 'expired' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100'
                              }`}>
                                {policy.status}
                              </span>
                              <span className="px-2 py-1 bg-blue-100 rounded">
                                {policy.policyType.charAt(0).toUpperCase() + policy.policyType.slice(1)}
                              </span>
                            </div>

                            {isExpiring && (
                              <div className="mt-2 flex items-center gap-1 text-orange-600 text-sm">
                                <AlertTriangle className="w-4 h-4" />
                                <span>Expires in {daysToExpiry} days</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Coverage</p>
                          <p className="text-lg font-bold">₹{((policy.coverageAmount || 0) / 100000).toFixed(2)}L</p>
                          <p className="text-sm text-gray-600 mt-2">Premium</p>
                          <p className="text-md font-semibold text-orange-600">
                            ₹{policy.premiumAmount?.toLocaleString()} / {policy.premiumFrequency}
                          </p>
                        </div>
                      </div>

                      {/* Beneficiaries */}
                      {policy.beneficiaries && policy.beneficiaries.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-gray-600 mb-1">Beneficiaries:</p>
                          <div className="flex gap-2 flex-wrap">
                            {policy.beneficiaries.map((ben, idx) => (
                              <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {ben.name} ({ben.relationship}) - {ben.percentage}%
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims">
          <Card>
            <CardHeader>
              <CardTitle>Claims History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {policies
                  .filter(p => p.claims && p.claims.length > 0)
                  .map(policy => (
                    <div key={policy._id}>
                      <h3 className="font-semibold mb-2">{policy.policyName}</h3>
                      {policy.claims.map((claim, idx) => (
                        <div key={idx} className="p-3 border rounded-lg mb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium">
                                {new Date(claim.claimDate).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">{claim.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">₹{claim.claimAmount?.toLocaleString()}</p>
                              <span className={`text-xs px-2 py-1 rounded ${
                                claim.status === 'approved' ? 'bg-green-100 text-green-800' :
                                claim.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                claim.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100'
                              }`}>
                                {claim.status}
                              </span>
                            </div>
                          </div>
                          {claim.approvedAmount && (
                            <p className="text-xs text-green-600 mt-2">
                              Approved: ₹{claim.approvedAmount.toLocaleString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                
                {policies.every(p => !p.claims || p.claims.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <p>No claims filed yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Coverage Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Average Coverage</p>
                    <p className="text-2xl font-bold">
                      ₹{activePolicies.length > 0 ? ((totalCoverage / activePolicies.length) / 100000).toFixed(2) : 0}L
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Per policy</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Average Premium</p>
                    <p className="text-2xl font-bold">
                      ₹{activePolicies.length > 0 ? (totalPremium / activePolicies.length).toFixed(0) : 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Per policy</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600">Coverage Ratio</p>
                    <p className="text-2xl font-bold">
                      {totalPremium > 0 ? (totalCoverage / totalPremium).toFixed(0) : 0}x
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Coverage per rupee premium</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {coverageGaps.map((gap, idx) => (
                    <div key={idx} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div className="text-sm">
                          <p>{typeof gap === 'string' ? gap : (gap.recommendation || gap.type || '')}</p>
                          {gap.priority && <span className={`text-xs mt-1 inline-block px-1.5 py-0.5 rounded ${gap.priority === 'high' ? 'bg-red-100 text-red-700' : gap.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{gap.priority}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {expiringPolicies.length > 0 && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-semibold">Policies expiring soon:</p>
                          <ul className="list-disc list-inside mt-1">
                            {expiringPolicies.map(p => (
                              <li key={p._id}>{p.policyName} - {Math.ceil((new Date(p.endDate) - new Date()) / (1000 * 60 * 60 * 24))} days</li>
                            ))}
                          </ul>
                        </div>
                      </div>
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

export default InsuranceDashboard;
