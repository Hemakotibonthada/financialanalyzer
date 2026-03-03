import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { Briefcase, FileText, Users, DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

// Simple UI components using Tailwind CSS
const Card = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/30 ${className}`}>{children}</div>
);

const CardHeader = ({ children, className = '' }) => (
  <div className={`p-6 border-b border-gray-200 dark:border-gray-700 ${className}`}>{children}</div>
);

const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-xl font-bold text-gray-900 dark:text-gray-100 ${className}`}>{children}</h3>
);

const CardContent = ({ children, className = '' }) => (
  <div className={`p-6 ${className}`}>{children}</div>
);

const Tabs = ({ children, value, onValueChange, className = '' }) => (
  <div className={className}>{children}</div>
);

const TabsList = ({ children, className = '' }) => (
  <div className={`flex space-x-2 border-b border-gray-200 dark:border-gray-700 ${className}`}>{children}</div>
);

const TabsTrigger = ({ children, value, onClick, active, className = '' }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 font-medium transition-colors ${
      active
        ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
    } ${className}`}
  >
    {children}
  </button>
);

const TabsContent = ({ children, value, activeValue, className = '' }) => (
  value === activeValue ? <div className={className}>{children}</div> : null
);

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

const BusinessDashboard = () => {
  const { isDark } = useTheme();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchBusinessData();
  }, []);

  const fetchBusinessData = async () => {
    try {
      const [invoicesRes, clientsRes, projectsRes, vendorsRes] = await Promise.all([
        api.get('/business/invoices'),
        api.get('/business/clients'),
        api.get('/business/projects'),
        api.get('/business/vendors')
      ]);

      setInvoices(invoicesRes.data);
      setClients(clientsRes.data);
      setProjects(projectsRes.data);
      setVendors(vendorsRes.data);
    } catch (error) {
      console.error('Error fetching business data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Invoice calculations
  const totalRevenue = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

  const pendingInvoices = invoices.filter(inv => inv.status === 'sent' || inv.status === 'overdue');
  const totalPending = pendingInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

  const overdueInvoices = invoices.filter(inv => inv.status === 'overdue');
  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

  // Project calculations
  const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'in_progress');
  const completedProjects = projects.filter(p => p.status === 'completed');

  // Revenue by client
  const revenueByClient = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((acc, inv) => {
      const clientId = inv.client?._id || inv.client;
      const client = clients.find(c => c._id === clientId);
      const clientName = client?.clientName || 'Unknown';
      
      if (!acc[clientName]) acc[clientName] = 0;
      acc[clientName] += inv.totalAmount || 0;
      return acc;
    }, {});

  const revenueChartData = Object.entries(revenueByClient)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Invoice status distribution
  const invoiceStatusData = [
    { name: 'Paid', value: invoices.filter(i => i.status === 'paid').length },
    { name: 'Sent', value: invoices.filter(i => i.status === 'sent').length },
    { name: 'Overdue', value: overdueInvoices.length },
    { name: 'Draft', value: invoices.filter(i => i.status === 'draft').length }
  ].filter(d => d.value > 0);

  // Monthly revenue trend
  const monthlyRevenue = invoices
    .filter(inv => inv.status === 'paid' && inv.paidDate)
    .reduce((acc, inv) => {
      const month = new Date(inv.paidDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!acc[month]) acc[month] = 0;
      acc[month] += inv.totalAmount || 0;
      return acc;
    }, {});

  const revenueTimeline = Object.entries(monthlyRevenue)
    .map(([month, amount]) => ({ month, amount }))
    .slice(-6);

  if (loading) {
    return <div className={`flex justify-center items-center h-64 ${isDark ? 'text-gray-300' : ''}`}>Loading Business Dashboard...</div>;
  }

  return (
    <div className={`min-h-screen p-6 space-y-6 ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <div className="flex justify-between items-center">
        <h1 className={`text-3xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <Briefcase className="w-8 h-8" />
          Business Management
        </h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            New Invoice
          </button>
          <button className={`px-4 py-2 border rounded-lg ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
            New Client
          </button>
        </div>
      </div>

      {/* Alerts */}
      {overdueInvoices.length > 0 && (
        <Card className={`${isDark ? 'border-red-800 bg-red-900/20' : 'border-red-200 bg-red-50'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm">
                <strong>{overdueInvoices.length}</strong> overdue {overdueInvoices.length === 1 ? 'invoice' : 'invoices'} 
                totaling ₹{totalOverdue.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{(totalRevenue / 100000).toFixed(2)}L
            </div>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>From {invoices.filter(i => i.status === 'paid').length} invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ₹{(totalPending / 100000).toFixed(2)}L
            </div>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{pendingInvoices.length} pending invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjects.length}</div>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{completedProjects.length} completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {clients.filter(c => c.status === 'active').length} active
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" onClick={() => setActiveTab('overview')} active={activeTab === 'overview'}>
            Overview
          </TabsTrigger>
          <TabsTrigger value="invoices" onClick={() => setActiveTab('invoices')} active={activeTab === 'invoices'}>
            Invoices
          </TabsTrigger>
          <TabsTrigger value="clients" onClick={() => setActiveTab('clients')} active={activeTab === 'clients'}>
            Clients
          </TabsTrigger>
          <TabsTrigger value="projects" onClick={() => setActiveTab('projects')} active={activeTab === 'projects'}>
            Projects
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" activeValue={activeTab}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Client (Top 5)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                    <Bar dataKey="value" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Invoice Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={invoiceStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {invoiceStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Timeline */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Revenue Trend (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueTimeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="amount" stroke="#8884d8" name="Revenue" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Average Invoice Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{invoices.length > 0 ? (invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0) / invoices.length).toFixed(0).toLocaleString() : 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Payment Collection Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {invoices.length > 0 ? ((invoices.filter(i => i.status === 'paid').length / invoices.length) * 100).toFixed(1) : 0}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Average Project Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{projects.length > 0 ? (projects.reduce((sum, p) => sum + (p.budget || 0), 0) / projects.length).toFixed(0).toLocaleString() : 0}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices" activeValue={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>All Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <th className={`text-left py-2 ${isDark ? 'text-gray-300' : ''}`}>Invoice #</th>
                      <th className={`text-left py-2 ${isDark ? 'text-gray-300' : ''}`}>Client</th>
                      <th className={`text-left py-2 ${isDark ? 'text-gray-300' : ''}`}>Date</th>
                      <th className={`text-right py-2 ${isDark ? 'text-gray-300' : ''}`}>Amount</th>
                      <th className={`text-left py-2 ${isDark ? 'text-gray-300' : ''}`}>Status</th>
                      <th className={`text-left py-2 ${isDark ? 'text-gray-300' : ''}`}>Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(invoice => {
                      const client = clients.find(c => c._id === (invoice.client?._id || invoice.client));
                      const daysOverdue = invoice.status === 'overdue' 
                        ? Math.ceil((new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24))
                        : 0;

                      return (
                        <tr key={invoice._id} className={`border-b ${isDark ? 'border-gray-700 hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                          <td className="py-2 font-mono text-sm">{invoice.invoiceNumber}</td>
                          <td className="py-2">{client?.clientName || 'Unknown'}</td>
                          <td className="py-2 text-sm">{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                          <td className="text-right py-2 font-semibold">₹{invoice.totalAmount?.toLocaleString()}</td>
                          <td className="py-2">
                            <span className={`px-2 py-1 text-xs rounded ${
                              invoice.status === 'paid' ? (isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800') :
                              invoice.status === 'sent' ? (isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800') :
                              invoice.status === 'overdue' ? (isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800') :
                              (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100')
                            }`}>
                              {invoice.status}
                            </span>
                          </td>
                          <td className="py-2 text-sm">
                            {new Date(invoice.dueDate).toLocaleDateString()}
                            {daysOverdue > 0 && (
                              <span className="text-red-600 ml-2">({daysOverdue}d overdue)</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" activeValue={activeTab}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clients.map(client => {
              const clientInvoices = invoices.filter(inv => 
                (inv.client?._id || inv.client) === client._id
              );
              const clientRevenue = clientInvoices
                .filter(inv => inv.status === 'paid')
                .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
              const pendingAmount = clientInvoices
                .filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled')
                .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

              return (
                <Card key={client._id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className={`text-lg font-bold ${isDark ? 'text-white' : ''}`}>{client.clientName}</h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{client.email}</p>
                        {client.phone && (
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{client.phone}</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        client.status === 'active' ? (isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800') :
                        (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100')
                      }`}>
                        {client.status}
                      </span>
                    </div>

                    <div className={`grid grid-cols-2 gap-3 mt-4 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Revenue</p>
                        <p className="text-lg font-semibold text-green-600">
                          ₹{clientRevenue.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Pending</p>
                        <p className="text-lg font-semibold text-orange-600">
                          ₹{pendingAmount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Invoices</p>
                        <p className="text-lg font-semibold">{clientInvoices.length}</p>
                      </div>
                      <div>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Projects</p>
                        <p className="text-lg font-semibold">
                          {projects.filter(p => (p.client?._id || p.client) === client._id).length}
                        </p>
                      </div>
                    </div>

                    {client.company && (
                      <div className={`mt-3 pt-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Company</p>
                        <p className="text-sm font-medium">{client.company}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="projects" activeValue={activeTab}>
          <div className="space-y-4">
            {projects.map(project => {
              const client = clients.find(c => c._id === (project.client?._id || project.client));
              const projectInvoices = invoices.filter(inv => 
                (inv.project?._id || inv.project) === project._id
              );
              const invoicedAmount = projectInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
              const progress = project.budget > 0 ? (invoicedAmount / project.budget) * 100 : 0;

              return (
                <Card key={project._id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className={`text-lg font-bold ${isDark ? 'text-white' : ''}`}>{project.projectName}</h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{client?.clientName || 'Unknown Client'}</p>
                        {project.description && (
                          <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{project.description}</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        project.status === 'completed' ? (isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800') :
                        project.status === 'active' || project.status === 'in_progress' ? (isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800') :
                        project.status === 'on_hold' ? (isDark ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800') :
                        (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100')
                      }`}>
                        {project.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Budget</p>
                        <p className={`text-lg font-semibold ${isDark ? 'text-white' : ''}`}>₹{project.budget?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Invoiced</p>
                        <p className="text-lg font-semibold text-green-600">
                          ₹{invoicedAmount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Start Date</p>
                        <p className="text-sm">{new Date(project.startDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>End Date</p>
                        <p className="text-sm">
                          {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Ongoing'}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Budget Utilization</span>
                        <span className="font-semibold">{progress.toFixed(1)}%</span>
                      </div>
                      <div className={`w-full rounded-full h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            progress > 100 ? 'bg-red-600' : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>

                    {project.milestones && project.milestones.length > 0 && (
                      <div className={`mt-4 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <p className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : ''}`}>Milestones</p>
                        <div className="space-y-2">
                          {project.milestones.map((milestone, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                {milestone.completed ? (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Clock className="w-4 h-4 text-gray-400" />
                                )}
                                <span className={milestone.completed ? 'line-through text-gray-500' : ''}>
                                  {milestone.name}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(milestone.dueDate).toLocaleDateString()}
                              </span>
                            </div>
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
      </Tabs>
    </div>
  );
};

export default BusinessDashboard;
