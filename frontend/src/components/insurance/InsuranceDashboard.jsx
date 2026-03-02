import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Shield, Heart, Car, Home, Briefcase, AlertTriangle, CheckCircle, Plus, TrendingUp, IndianRupee, FileText } from 'lucide-react';
import api from '@/services/api';
import MainLayout from '@/components/MainLayout';
import '../../styles/animations.css';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

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
    return (
      <MainLayout title="Insurance" subtitle="Your insurance portfolio">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400">Loading insurance data...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Insurance" subtitle="Manage your insurance portfolio">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Header */}
        <div className="animate-fade-in-up">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 p-6 md:p-8 shadow-xl">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNEgyNHYtMmgxMnYyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">Insurance Portfolio</h1>
                  <p className="text-pink-100 mt-1">Manage policies, track coverage & file claims</p>
                </div>
              </div>
              <button className="px-5 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-300 flex items-center gap-2 font-medium border border-white/20">
                <Plus className="w-4 h-4" />
                Add Policy
              </button>
            </div>
          </div>
        </div>

      {/* Alert for expiring policies */}
      {expiringPolicies.length > 0 && (
        <div className="animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
          <Card className="border-orange-300 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <p className="text-sm text-orange-800 dark:text-orange-300">
                  <strong>{expiringPolicies.length}</strong> {expiringPolicies.length === 1 ? 'policy' : 'policies'} expiring in the next 30 days
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Coverage Gaps Alert */}
      {coverageGaps.length > 0 && (
        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <Card className="border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-sm font-semibold text-red-800 dark:text-red-300">Coverage Gaps Detected</p>
                  <ul className="text-xs mt-1 list-disc list-inside text-red-700 dark:text-red-400">
                    {coverageGaps.slice(0, 3).map((gap, idx) => (
                      <li key={idx}>{typeof gap === 'string' ? gap : (gap.recommendation || gap.type || JSON.stringify(gap))}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
        {[
          { title: 'Active Policies', value: activePolicies.length, sub: `Out of ${policies.length} total`, icon: Shield, gradient: 'from-blue-500 to-cyan-500', iconBg: 'bg-blue-500/20' },
          { title: 'Total Coverage', value: `₹${(totalCoverage / 10000000).toFixed(2)}Cr`, sub: 'Sum Assured', icon: TrendingUp, gradient: 'from-green-500 to-emerald-500', iconBg: 'bg-green-500/20' },
          { title: 'Total Premium', value: `₹${totalPremium.toLocaleString()}`, sub: 'Annual equivalent', icon: IndianRupee, gradient: 'from-orange-500 to-amber-500', iconBg: 'bg-orange-500/20' },
          { title: 'Claims Filed', value: policies.reduce((sum, p) => sum + (p.claims?.length || 0), 0), sub: 'Total claims', icon: FileText, gradient: 'from-purple-500 to-pink-500', iconBg: 'bg-purple-500/20' },
        ].map((stat, i) => (
          <div key={i} className="group">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                <div className={`p-2 rounded-lg ${stat.iconBg}`}>
                  <stat.icon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">Coverage by Type</CardTitle>
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
                    <Tooltip formatter={(value) => `₹${(value / 100000).toFixed(2)}L`} contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '12px', color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">Premium by Frequency</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={frequencyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8' }} />
                    <YAxis tick={{ fill: '#94a3b8' }} />
                    <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '12px', color: '#fff' }} />
                    <Bar dataKey="amount" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Policy Type Breakdown */}
          <Card className="mt-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">Policy Type Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {coverageChartData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(item.name.toLowerCase())}
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{item.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{item.count} {item.count === 1 ? 'policy' : 'policies'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900 dark:text-white">₹{(item.coverage / 100000).toFixed(2)}L</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Premium: ₹{item.premium.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">All Policies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {policies.map((policy, idx) => {
                  const daysToExpiry = Math.ceil((new Date(policy.endDate) - new Date()) / (1000 * 60 * 60 * 24));
                  const isExpiring = daysToExpiry <= 30 && daysToExpiry > 0;

                  return (
                    <div key={policy._id} className={`p-5 border rounded-xl transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${isExpiring ? 'border-orange-300 dark:border-orange-500/30 bg-orange-50/50 dark:bg-orange-500/5' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`} style={{ animationDelay: `${idx * 0.05}s` }}>
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3 flex-1">
                          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                            {getTypeIcon(policy.policyType)}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{policy.policyName}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{policy.provider}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Policy #: {policy.policyNumber}</p>
                            
                            <div className="flex gap-2 mt-2">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                                policy.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                                policy.status === 'expired' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                                'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                              }`}>
                                {policy.status}
                              </span>
                              <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-medium">
                                {policy.policyType.charAt(0).toUpperCase() + policy.policyType.slice(1)}
                              </span>
                            </div>

                            {isExpiring && (
                              <div className="mt-2 flex items-center gap-1 text-orange-600 dark:text-orange-400 text-sm">
                                <AlertTriangle className="w-4 h-4" />
                                <span>Expires in {daysToExpiry} days</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-slate-500 dark:text-slate-400">Coverage</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white">₹{((policy.coverageAmount || 0) / 100000).toFixed(2)}L</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Premium</p>
                          <p className="text-md font-semibold text-orange-600 dark:text-orange-400">
                            ₹{policy.premiumAmount?.toLocaleString()} / {policy.premiumFrequency}
                          </p>
                        </div>
                      </div>

                      {/* Beneficiaries */}
                      {policy.beneficiaries && policy.beneficiaries.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Beneficiaries:</p>
                          <div className="flex gap-2 flex-wrap">
                            {policy.beneficiaries.map((ben, idx) => (
                              <span key={idx} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-lg">
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
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">Claims History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {policies
                  .filter(p => p.claims && p.claims.length > 0)
                  .map(policy => (
                    <div key={policy._id}>
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{policy.policyName}</h3>
                      {policy.claims.map((claim, idx) => (
                        <div key={idx} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl mb-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {new Date(claim.claimDate).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{claim.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-slate-900 dark:text-white">₹{claim.claimAmount?.toLocaleString()}</p>
                              <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                                claim.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                                claim.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                                claim.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' :
                                'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                              }`}>
                                {claim.status}
                              </span>
                            </div>
                          </div>
                          {claim.approvedAmount && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                              Approved: ₹{claim.approvedAmount.toLocaleString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                
                {policies.every(p => !p.claims || p.claims.length === 0) && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">No claims filed yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis">
          <div className="space-y-6">
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">Coverage Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-100 dark:border-blue-500/20">
                    <p className="text-sm text-blue-600 dark:text-blue-400">Average Coverage</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      ₹{activePolicies.length > 0 ? ((totalCoverage / activePolicies.length) / 100000).toFixed(2) : 0}L
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Per policy</p>
                  </div>
                  <div className="p-5 bg-green-50 dark:bg-green-500/10 rounded-xl border border-green-100 dark:border-green-500/20">
                    <p className="text-sm text-green-600 dark:text-green-400">Average Premium</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      ₹{activePolicies.length > 0 ? (totalPremium / activePolicies.length).toFixed(0) : 0}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Per policy</p>
                  </div>
                  <div className="p-5 bg-purple-50 dark:bg-purple-500/10 rounded-xl border border-purple-100 dark:border-purple-500/20">
                    <p className="text-sm text-purple-600 dark:text-purple-400">Coverage Ratio</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {totalPremium > 0 ? (totalCoverage / totalPremium).toFixed(0) : 0}x
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Coverage per rupee premium</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {coverageGaps.map((gap, idx) => (
                    <div key={idx} className="p-4 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="text-yellow-800 dark:text-yellow-300">{typeof gap === 'string' ? gap : (gap.recommendation || gap.type || '')}</p>
                          {gap.priority && <span className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-lg font-medium ${gap.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' : gap.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>{gap.priority}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {expiringPolicies.length > 0 && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="font-semibold text-orange-800 dark:text-orange-300">Policies expiring soon:</p>
                          <ul className="list-disc list-inside mt-1 text-orange-700 dark:text-orange-400">
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
      </div>
    </MainLayout>
  );
};

export default InsuranceDashboard;
