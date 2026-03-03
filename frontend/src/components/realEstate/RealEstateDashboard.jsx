import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Home, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

const RealEstateDashboard = () => {
  const { isDark } = useTheme();
  const [properties, setProperties] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchRealEstateData();
  }, []);

  const fetchRealEstateData = async () => {
    try {
      const [propertiesRes, portfolioRes] = await Promise.all([
        api.get('/realEstate'),
        api.get('/realEstate/portfolio/summary')
      ]);

      setProperties(propertiesRes.data);
      setPortfolio(portfolioRes.data);
    } catch (error) {
      console.error('Error fetching real estate data:', error);
    } finally {
      setLoading(false);
    }
  }

  const propertyDistribution = properties.reduce((acc, prop) => {
    const type = prop.propertyType;
    if (!acc[type]) acc[type] = { count: 0, value: 0 };
    acc[type].count++;
    acc[type].value += prop.currentValue || 0;
    return acc;
  }, {});

  const propertyChartData = Object.entries(propertyDistribution).map(([type, data]) => ({
    name: type.replace('_', ' '),
    value: data.value,
    count: data.count
  }));

  const rentalIncomeData = properties
    .filter(p => p.rentalIncome && p.rentalIncome.monthlyRent > 0)
    .map(p => ({
      name: p.propertyName,
      rent: p.rentalIncome.monthlyRent,
      expenses: p.expenses.reduce((sum, e) => sum + e.amount, 0)
    }));

  if (loading) {
    return <div className={`flex justify-center items-center h-64 ${isDark ? 'text-gray-300' : ''}`}>Loading Real Estate Dashboard...</div>;
  }

  return (
    <div className={`min-h-screen p-6 space-y-6 ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <div className="flex justify-between items-center">
        <h1 className={`text-3xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <Home className="w-8 h-8" />
          Real Estate Portfolio
        </h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Add Property
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolio?.totalProperties || 0}</div>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Across {Object.keys(propertyDistribution).length} types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{((portfolio?.totalValue || 0) / 10000000).toFixed(2)}Cr
            </div>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Portfolio Value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Monthly Rental Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{(portfolio?.totalRentalIncome || 0).toLocaleString()}
            </div>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>From {portfolio?.rentedProperties || 0} properties</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Mortgages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ₹{((portfolio?.totalMortgage || 0) / 100000).toFixed(2)}L
            </div>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Outstanding Debt</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="rental">Rental Income</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Property Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={propertyChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, count }) => `${name} (${count})`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {propertyChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rental Income vs Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={rentalIncomeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="rent" fill="#82ca9d" name="Rental Income" />
                    <Bar dataKey="expenses" fill="#ff8042" name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Portfolio Metrics */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Portfolio Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Average Property Value</p>
                  <p className="text-2xl font-bold">
                    ₹{((portfolio?.averagePropertyValue || 0) / 100000).toFixed(2)}L
                  </p>
                </div>
                <div className={`p-4 rounded-lg ${isDark ? 'bg-green-900/20' : 'bg-green-50'}`}>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Rental Yield</p>
                  <p className="text-2xl font-bold text-green-600">
                    {portfolio?.rentalYield?.toFixed(2) || 0}%
                  </p>
                </div>
                <div className={`p-4 rounded-lg ${isDark ? 'bg-orange-900/20' : 'bg-orange-50'}`}>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loan-to-Value Ratio</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {portfolio?.loanToValue?.toFixed(1) || 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="properties">
          <Card>
            <CardHeader>
              <CardTitle>Property List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {properties.map(property => (
                  <div key={property._id} className={`p-4 border rounded-lg hover:shadow-md transition-shadow ${isDark ? 'border-gray-700 hover:shadow-gray-900/30' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : ''}`}>{property.propertyName}</h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{property.address.city}, {property.address.state}</p>
                        <div className="flex gap-4 mt-2 text-sm">
                          <span className={`px-2 py-1 rounded ${isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100'}`}>
                            {property.propertyType.replace('_', ' ')}
                          </span>
                          <span className={`px-2 py-1 rounded ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100'}`}>
                            {property.area} {property.areaUnit}
                          </span>
                          <span className={`px-2 py-1 rounded ${
                            property.status === 'owned' ? (isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800') :
                            property.status === 'rented' ? (isDark ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800') :
                            (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100')
                          }`}>
                            {property.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          ₹{((property.currentValue || 0) / 100000).toFixed(2)}L
                        </p>
                        {property.rentalIncome && property.rentalIncome.monthlyRent > 0 && (
                          <p className="text-sm text-green-600">
                            Rent: ₹{property.rentalIncome.monthlyRent.toLocaleString()}/mo
                          </p>
                        )}
                        {property.mortgage && property.mortgage.currentBalance > 0 && (
                          <p className="text-sm text-red-600">
                            Mortgage: ₹{((property.mortgage.currentBalance || 0) / 100000).toFixed(2)}L
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rental">
          <Card>
            <CardHeader>
              <CardTitle>Rental Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {properties
                  .filter(p => p.rentalIncome && p.rentalIncome.monthlyRent > 0)
                  .map(property => (
                    <div key={property._id} className={`p-4 border rounded-lg ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className={`font-semibold ${isDark ? 'text-white' : ''}`}>{property.propertyName}</h3>
                          {property.tenants && property.tenants.length > 0 && (
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              Tenant: {property.tenants[0].name}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            ₹{property.rentalIncome.monthlyRent.toLocaleString()}/mo
                          </p>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Deposit: ₹{property.rentalIncome.securityDeposit?.toLocaleString() || 0}
                          </p>
                        </div>
                      </div>
                      
                      {/* Lease details */}
                      {property.tenants && property.tenants[0] && (
                        <div className={`grid grid-cols-2 gap-2 text-sm mt-3 pt-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                          <div>
                            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Lease Start</p>
                            <p>{new Date(property.tenants[0].leaseStartDate).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Lease End</p>
                            <p>{new Date(property.tenants[0].leaseEndDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Property Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <th className={`text-left py-2 ${isDark ? 'text-gray-300' : ''}`}>Property</th>
                        <th className={`text-right py-2 ${isDark ? 'text-gray-300' : ''}`}>Purchase Price</th>
                        <th className={`text-right py-2 ${isDark ? 'text-gray-300' : ''}`}>Current Value</th>
                        <th className={`text-right py-2 ${isDark ? 'text-gray-300' : ''}`}>Appreciation</th>
                        <th className={`text-right py-2 ${isDark ? 'text-gray-300' : ''}`}>ROI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {properties.map(property => {
                        const appreciation = (property.currentValue || 0) - (property.purchasePrice || 0);
                        const roi = property.purchasePrice > 0 
                          ? (appreciation / property.purchasePrice) * 100 
                          : 0;

                        return (
                          <tr key={property._id} className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                            <td className="py-2">{property.propertyName}</td>
                            <td className="text-right py-2">
                              ₹{((property.purchasePrice || 0) / 100000).toFixed(2)}L
                            </td>
                            <td className="text-right py-2">
                              ₹{((property.currentValue || 0) / 100000).toFixed(2)}L
                            </td>
                            <td className={`text-right py-2 ${appreciation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {appreciation >= 0 ? <TrendingUp className="inline w-4 h-4" /> : <TrendingDown className="inline w-4 h-4" />}
                              ₹{(Math.abs(appreciation) / 100000).toFixed(2)}L
                            </td>
                            <td className={`text-right py-2 ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {roi.toFixed(2)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RealEstateDashboard;
