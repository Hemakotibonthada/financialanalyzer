import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileText, Download, Calculator, TrendingUp, AlertCircle } from 'lucide-react';
import axios from 'axios';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

const TaxPlanner = () => {
  const [taxRecords, setTaxRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [formData, setFormData] = useState({
    assessmentYear: '2024-25',
    taxRegime: 'new',
    income: {
      salary: 0,
      business: 0,
      capitalGains: 0,
      otherSources: 0,
      rental: 0
    },
    deductions: {
      section80C: 0,
      section80D: 0,
      section24b: 0,
      section80E: 0,
      section80G: 0
    }
  });

  useEffect(() => {
    fetchTaxRecords();
  }, []);

  const fetchTaxRecords = async () => {
    try {
      const response = await axios.get('/api/tax');
      setTaxRecords(response.data);
      if (response.data.length > 0) {
        setSelectedRecord(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching tax records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: parseFloat(value) || 0
      }
    }));
  };

  const calculateTax = async () => {
    try {
      const response = await axios.post('/api/tax', formData);
      await fetchTaxRecords();
      setSelectedRecord(response.data);
      alert('Tax calculated successfully!');
    } catch (error) {
      console.error('Error calculating tax:', error);
      alert('Failed to calculate tax');
    }
  };

  const generateOptimizations = async (recordId) => {
    try {
      const response = await axios.post(`/api/tax/${recordId}/optimize`);
      setSelectedRecord(response.data);
      alert('Optimizations generated!');
    } catch (error) {
      console.error('Error generating optimizations:', error);
    }
  };

  const compareRegimes = async (recordId) => {
    try {
      const response = await axios.post(`/api/tax/${recordId}/compare-regimes`);
      alert(`Current Regime: ₹${response.data.currentRegime.totalTax.toLocaleString()}\nOther Regime: ₹${response.data.otherRegime.totalTax.toLocaleString()}\nRecommended: ${response.data.recommendation}`);
    } catch (error) {
      console.error('Error comparing regimes:', error);
    }
  };

  const incomeBreakdown = selectedRecord ? [
    { name: 'Salary', value: selectedRecord.income.salary },
    { name: 'Business', value: selectedRecord.income.business },
    { name: 'Capital Gains', value: selectedRecord.income.capitalGains },
    { name: 'Rental', value: selectedRecord.income.rental },
    { name: 'Other', value: selectedRecord.income.otherSources }
  ].filter(item => item.value > 0) : [];

  const deductionBreakdown = selectedRecord ? [
    { name: '80C', value: selectedRecord.deductions.section80C },
    { name: '80D', value: selectedRecord.deductions.section80D },
    { name: '24(b)', value: selectedRecord.deductions.section24b },
    { name: '80E', value: selectedRecord.deductions.section80E },
    { name: '80G', value: selectedRecord.deductions.section80G }
  ].filter(item => item.value > 0) : [];

  const taxBreakdown = selectedRecord?.taxCalculation ? [
    { name: 'Income Tax', value: selectedRecord.taxCalculation.incomeTax },
    { name: 'Surcharge', value: selectedRecord.taxCalculation.surcharge },
    { name: 'Cess', value: selectedRecord.taxCalculation.cess }
  ] : [];

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading Tax Planner...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calculator className="w-8 h-8" />
          Tax Planning & Optimization
        </h1>
        <div className="flex gap-2">
          {selectedRecord && (
            <>
              <button
                onClick={() => generateOptimizations(selectedRecord._id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Generate Optimizations
              </button>
              <button
                onClick={() => compareRegimes(selectedRecord._id)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Compare Regimes
              </button>
            </>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calculator">Tax Calculator</TabsTrigger>
          <TabsTrigger value="optimizations">Optimizations</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {selectedRecord ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ₹{selectedRecord.income.total.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Gross Income</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      ₹{selectedRecord.deductions.total.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Tax Savings</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Taxable Income</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      ₹{selectedRecord.taxCalculation?.taxableIncome.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">After Deductions</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Tax</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      ₹{selectedRecord.taxCalculation?.totalTax.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Tax Liability</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Income Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={incomeBreakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ₹${(value/1000).toFixed(0)}K`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {incomeBreakdown.map((entry, index) => (
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
                    <CardTitle>Deduction Utilization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={deductionBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                        <Bar dataKey="value" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Tax Calculation Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Tax Calculation Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span>Gross Income</span>
                      <span className="font-semibold">₹{selectedRecord.income.total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-green-600">Less: Deductions</span>
                      <span className="font-semibold text-green-600">
                        - ₹{selectedRecord.deductions.total.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="font-medium">Taxable Income</span>
                      <span className="font-bold">
                        ₹{selectedRecord.taxCalculation?.taxableIncome.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span>Income Tax</span>
                      <span className="font-semibold">
                        ₹{selectedRecord.taxCalculation?.incomeTax.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span>Surcharge</span>
                      <span className="font-semibold">
                        ₹{selectedRecord.taxCalculation?.surcharge.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span>Health & Education Cess</span>
                      <span className="font-semibold">
                        ₹{selectedRecord.taxCalculation?.cess.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 bg-red-50 px-3 rounded">
                      <span className="text-lg font-bold">Total Tax Payable</span>
                      <span className="text-2xl font-bold text-red-600">
                        ₹{selectedRecord.taxCalculation?.totalTax.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mb-4" />
                <p className="text-gray-500">No tax records found. Create one using the calculator.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="calculator">
          <Card>
            <CardHeader>
              <CardTitle>Tax Calculator</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Assessment Year</label>
                    <input
                      type="text"
                      value={formData.assessmentYear}
                      onChange={(e) => setFormData({...formData, assessmentYear: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Tax Regime</label>
                    <select
                      value={formData.taxRegime}
                      onChange={(e) => setFormData({...formData, taxRegime: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="old">Old Regime</option>
                      <option value="new">New Regime</option>
                    </select>
                  </div>
                </div>

                {/* Income Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Income</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(formData.income).map(key => (
                      <div key={key}>
                        <label className="block text-sm font-medium mb-2 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </label>
                        <input
                          type="number"
                          value={formData.income[key]}
                          onChange={(e) => handleInputChange('income', key, e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deductions Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Deductions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(formData.deductions).map(key => (
                      <div key={key}>
                        <label className="block text-sm font-medium mb-2">
                          {key}
                        </label>
                        <input
                          type="number"
                          value={formData.deductions[key]}
                          onChange={(e) => handleInputChange('deductions', key, e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={calculateTax}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  Calculate Tax
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimizations">
          {selectedRecord?.optimizations && selectedRecord.optimizations.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Tax Saving Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedRecord.optimizations.map((opt, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-blue-50">
                      <div className="flex items-start gap-3">
                        <TrendingUp className="w-5 h-5 text-blue-600 mt-1" />
                        <div className="flex-1">
                          <h4 className="font-semibold">{opt.category}</h4>
                          <p className="text-sm text-gray-600 mt-1">{opt.suggestion}</p>
                          <p className="text-sm font-semibold text-green-600 mt-2">
                            Potential Savings: ₹{opt.potentialSavings.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
                <p className="text-gray-500">No optimizations generated yet.</p>
                <p className="text-sm text-gray-400">Calculate tax first, then generate optimizations.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Tax Record History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Assessment Year</th>
                      <th className="text-left py-2">Regime</th>
                      <th className="text-left py-2">Total Income</th>
                      <th className="text-left py-2">Total Tax</th>
                      <th className="text-left py-2">ITR Status</th>
                      <th className="text-left py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxRecords.map(record => (
                      <tr key={record._id} className="border-b">
                        <td className="py-2">{record.assessmentYear}</td>
                        <td className="py-2 capitalize">{record.taxRegime}</td>
                        <td className="py-2">₹{record.income.total.toLocaleString()}</td>
                        <td className="py-2">₹{record.taxCalculation?.totalTax.toLocaleString()}</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            record.itrFiling.status === 'filed' ? 'bg-green-100 text-green-800' :
                            record.itrFiling.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {record.itrFiling.status}
                          </span>
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => setSelectedRecord(record)}
                            className="text-blue-600 hover:underline"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TaxPlanner;
