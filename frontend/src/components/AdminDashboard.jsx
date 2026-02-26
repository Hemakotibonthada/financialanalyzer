import React, { useState, useEffect } from 'react';
import {
  Users, FileText, Activity, TrendingUp, Database, Shield,
  AlertTriangle, CheckCircle, XCircle, Clock, Search, Filter,
  Download, RefreshCw, Trash2, UserCheck, UserX, Crown, Settings,
  BarChart3, PieChart, Server, HardDrive, Cpu, MemoryStick,
  MessageSquare, Bell, Eye, Edit2, Lock, Unlock, User
} from 'lucide-react';
import api from '../services/api';
import CacheManagementPanel from './CacheManagementPanel';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // User management filters
  const [userSearch, setUserSearch] = useState('');
  const [userStatus, setUserStatus] = useState('all');
  const [userRole, setUserRole] = useState('all');
  const [userPage, setUserPage] = useState(1);
  const [userPagination, setUserPagination] = useState(null);
  
  // Segmentation state
  const [segmentedUsers, setSegmentedUsers] = useState([]);
  const [segmentStats, setSegmentStats] = useState(null);
  const [segmentFilters, setSegmentFilters] = useState({
    segment: 'all',
    minIncome: '',
    maxIncome: '',
    minTransactions: '',
    maxTransactions: '',
    minSpending: '',
    maxSpending: '',
    sortBy: 'income',
    order: 'desc'
  });
  const [segmentPage, setSegmentPage] = useState(1);
  const [segmentPagination, setSegmentPagination] = useState(null);
  
  // Document filters
  const [docPage, setDocPage] = useState(1);
  const [docPagination, setDocPagination] = useState(null);
  
  // Edit modal
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'segmentation') {
      loadSegmentation();
    } else if (activeTab === 'documents') {
      loadDocuments();
    } else if (activeTab === 'analytics') {
      loadAnalytics();
    } else if (activeTab === 'system') {
      loadSystemHealth();
    }
  }, [activeTab, userPage, docPage, userSearch, userStatus, userRole, segmentPage, segmentFilters]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/dashboard/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      if (error.response?.status === 403) {
        setMessage({ type: 'error', text: 'You do not have admin access' });
      } else {
        setMessage({ type: 'error', text: 'Failed to load dashboard data' });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/admin/users', {
        params: { page: userPage, limit: 20, search: userSearch, status: userStatus, role: userRole }
      });
      if (response.data.success) {
        setUsers(response.data.data.users);
        setUserPagination(response.data.data.pagination);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setMessage({ type: 'error', text: 'Failed to load users' });
    }
  };

  const loadSegmentation = async () => {
    try {
      const response = await api.get('/admin/users/segmentation', {
        params: { 
          page: segmentPage, 
          limit: 50,
          ...segmentFilters
        }
      });
      if (response.data.success) {
        setSegmentedUsers(response.data.data.users);
        setSegmentPagination(response.data.data.pagination);
        setSegmentStats(response.data.data.segmentStats);
      }
    } catch (error) {
      console.error('Error loading segmentation:', error);
      setMessage({ type: 'error', text: 'Failed to load user segmentation' });
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await api.get('/admin/documents', {
        params: { page: docPage, limit: 50 }
      });
      if (response.data.success) {
        setDocuments(response.data.data.documents);
        setDocPagination(response.data.data.pagination);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      setMessage({ type: 'error', text: 'Failed to load documents' });
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await api.get('/admin/analytics/overview', {
        params: { days: 30 }
      });
      if (response.data.success) {
        setAnalytics(response.data.data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      setMessage({ type: 'error', text: 'Failed to load analytics' });
    }
  };

  const loadSystemHealth = async () => {
    try {
      const response = await api.get('/admin/system/health');
      if (response.data.success) {
        setSystemHealth(response.data.data);
      }
    } catch (error) {
      console.error('Error loading system health:', error);
      setMessage({ type: 'error', text: 'Failed to load system health' });
    }
  };

  const handleToggleUserStatus = async (userId) => {
    try {
      const response = await api.post(`/admin/users/${userId}/toggle-status`);
      if (response.data.success) {
        setMessage({ type: 'success', text: response.data.message });
        loadUsers();
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      setMessage({ type: 'error', text: 'Failed to toggle user status' });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure? This will delete the user and ALL their data permanently!')) {
      return;
    }
    
    try {
      const response = await api.delete(`/admin/users/${userId}`);
      if (response.data.success) {
        setMessage({ type: 'success', text: response.data.message });
        loadUsers();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to delete user' });
    }
  };

  const handleEditUser = (user) => {
    setEditingUser({ ...user });
    setShowEditModal(true);
  };

  const handleSaveUser = async () => {
    try {
      const response = await api.put(`/admin/users/${editingUser._id}`, {
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        isActive: editingUser.isActive
      });
      
      if (response.data.success) {
        setMessage({ type: 'success', text: 'User updated successfully' });
        setShowEditModal(false);
        setEditingUser(null);
        loadUsers();
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setMessage({ type: 'error', text: 'Failed to update user' });
    }
  };

  const handleQuickRoleChange = async (userId, newRole) => {
    try {
      const response = await api.put(`/admin/users/${userId}`, { role: newRole });
      if (response.data.success) {
        setMessage({ type: 'success', text: `Role changed to ${newRole}` });
        loadUsers();
      }
    } catch (error) {
      console.error('Error changing role:', error);
      setMessage({ type: 'error', text: 'Failed to change role' });
    }
  };

  const handleGenerateReport = async (reportType) => {
    try {
      const response = await api.get(`/admin/reports/${reportType}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setMessage({ type: 'success', text: 'Report generated successfully' });
    } catch (error) {
      console.error('Error generating report:', error);
      setMessage({ type: 'error', text: 'Failed to generate report' });
    }
  };

  const handleBulkAction = async (action, userIds) => {
    if (!window.confirm(`Are you sure you want to ${action} ${userIds.length} users?`)) {
      return;
    }
    
    try {
      const response = await api.post('/admin/users/bulk-action', {
        action,
        userIds
      });
      
      if (response.data.success) {
        setMessage({ type: 'success', text: `Bulk ${action} completed successfully` });
        loadUsers();
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      setMessage({ type: 'error', text: 'Failed to perform bulk action' });
    }
  };

  const handleSystemCleanup = async () => {
    if (!window.confirm('Run system cleanup? This will remove orphaned files and invalid data.')) {
      return;
    }
    
    try {
      const response = await api.post('/admin/system/cleanup');
      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: `Cleanup complete: ${response.data.data.invalidDocuments} documents, ${response.data.data.orphanedTransactions} transactions removed` 
        });
      }
    } catch (error) {
      console.error('Error running cleanup:', error);
      setMessage({ type: 'error', text: 'Failed to run cleanup' });
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-10 h-10" />
              <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-purple-200 text-sm">System Management & Monitoring</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadDashboardData}
                className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <Crown className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {message.text && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' :
            message.type === 'error' ? 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' :
            'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 mr-2" />
              ) : (
                <AlertTriangle className="w-5 h-5 mr-2" />
              )}
              {message.text}
              <button
                onClick={() => setMessage({ type: '', text: '' })}
                className="ml-auto text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        {stats && activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Users Card */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-10 h-10 text-blue-500" />
                  <span className="text-sm font-medium text-gray-500 dark:text-slate-400">USERS</span>
                </div>
                <div className="mb-2">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.users.total}</div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">
                    {stats.users.active} active • {stats.users.inactive} inactive
                  </div>
                </div>
              </div>

              {/* Documents Card */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between mb-4">
                  <FileText className="w-10 h-10 text-green-500" />
                  <span className="text-sm font-medium text-gray-500 dark:text-slate-400">DOCUMENTS</span>
                </div>
                <div className="mb-2">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.documents.total}</div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">Total uploaded</div>
                </div>
              </div>

              {/* Transactions Card */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between mb-4">
                  <Activity className="w-10 h-10 text-purple-500" />
                  <span className="text-sm font-medium text-gray-500 dark:text-slate-400">TRANSACTIONS</span>
                </div>
                <div className="mb-2">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.transactions.total.toLocaleString()}</div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">
                    ₹{(stats.transactions.volume.totalCredit - stats.transactions.volume.totalDebit).toLocaleString()} net
                  </div>
                </div>
              </div>

              {/* System Card */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6 border-l-4 border-orange-500">
                <div className="flex items-center justify-between mb-4">
                  <Server className="w-10 h-10 text-orange-500" />
                  <span className="text-sm font-medium text-gray-500 dark:text-slate-400">SYSTEM</span>
                </div>
                <div className="mb-2">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">{formatUptime(stats.system.uptime)}</div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">
                    {formatBytes(stats.system.memoryUsage.heapUsed)} / {formatBytes(stats.system.memoryUsage.heapTotal)}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Users */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Recent Users
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-slate-300">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-slate-300">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-slate-300">Role</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-slate-300">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-slate-300">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.users.recent.map((user) => (
                      <tr key={user._id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700">
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{user.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-400">{user.email}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                            {user.role === 'admin' && <Crown className="w-3 h-3 mr-1" />}
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.isActive 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-400">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 mb-8">
          <div className="flex border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>Overview</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${
                activeTab === 'users'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>User Management</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('segmentation')}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${
                activeTab === 'segmentation'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2">
                <PieChart className="w-4 h-4" />
                <span>User Segmentation</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${
                activeTab === 'documents'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Documents</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span>Analytics</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${
                activeTab === 'system'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Server className="w-4 h-4" />
                <span>System Health</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Reports</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('cache')}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${
                activeTab === 'cache'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4" />
                <span>Cache Management</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </div>
            </button>
          </div>
        </div>

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Management</h3>
              <button
                onClick={loadUsers}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={userStatus}
                onChange={(e) => setUserStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-slate-300">User</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-slate-300">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-slate-300">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-slate-300">Stats</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-slate-300">Joined</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="py-3 px-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                          <div className="text-sm text-gray-500 dark:text-slate-400">{user.email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={user.role}
                          onChange={(e) => handleQuickRoleChange(user._id, e.target.value)}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
                              : user.role === 'lender'
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}
                        >
                          <option value="user">User</option>
                          <option value="lender">Lender</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.isActive 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {user.isActive ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-600 dark:text-slate-400">
                          <div>{user.stats.documents} docs</div>
                          <div>{user.stats.transactions} txns</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus(user._id)}
                            className={`p-1 rounded ${
                              user.isActive 
                                ? 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20' 
                                : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                            }`}
                            title={user.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {user.isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {userPagination && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600 dark:text-slate-400">
                  Showing {((userPagination.page - 1) * userPagination.limit) + 1} to {Math.min(userPagination.page * userPagination.limit, userPagination.total)} of {userPagination.total} users
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setUserPage(userPage - 1)}
                    disabled={userPage === 1}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setUserPage(userPage + 1)}
                    disabled={userPage >= userPagination.pages}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Segmentation Tab */}
        {activeTab === 'segmentation' && (
          <div className="space-y-6">
            {/* Segmentation Stats */}
            {segmentStats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Total Users</p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{segmentStats.totalUsers || 0}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">Avg Monthly Income</p>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                        ₹{(segmentStats.averageIncome || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">Avg Transactions</p>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                        {(segmentStats.averageTransactions || 0).toFixed(1)}
                      </p>
                    </div>
                    <Activity className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-lg p-4 border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-600 font-medium">Avg Spending</p>
                      <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                        ₹{(segmentStats.averageSpending || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-orange-600" />
                  </div>
                </div>
              </div>
            )}

            {/* Income Distribution */}
            {segmentStats && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Income Distribution</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200">
                    <p className="text-3xl font-bold text-emerald-700">{segmentStats.highIncomeUsers || 0}</p>
                    <p className="text-sm text-emerald-600 mt-1">High Income</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">₹100K+/month</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                    <p className="text-3xl font-bold text-blue-700">{segmentStats.mediumIncomeUsers || 0}</p>
                    <p className="text-sm text-blue-600 mt-1">Medium Income</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">₹50K-100K/month</p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200">
                    <p className="text-3xl font-bold text-amber-700">{segmentStats.lowIncomeUsers || 0}</p>
                    <p className="text-sm text-amber-600 mt-1">Low Income</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">₹0-50K/month</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700">
                    <p className="text-3xl font-bold text-gray-700 dark:text-slate-300">{segmentStats.noIncomeUsers || 0}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">No Income Set</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">₹0/month</p>
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filter & Segment Users</h3>
                <button
                  onClick={() => {
                    setSegmentFilters({
                      segment: 'all',
                      minIncome: '',
                      maxIncome: '',
                      minTransactions: '',
                      maxTransactions: '',
                      minSpending: '',
                      maxSpending: '',
                      sortBy: 'income',
                      order: 'desc'
                    });
                    setSegmentPage(1);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Reset Filters
                </button>
              </div>

              {/* Quick Segments */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Quick Segments</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'all', label: 'All Users', icon: Users },
                    { value: 'high-income', label: 'High Income (₹100K+)', icon: TrendingUp },
                    { value: 'medium-income', label: 'Medium Income (₹50K-100K)', icon: Activity },
                    { value: 'low-income', label: 'Low Income (<₹50K)', icon: User },
                    { value: 'no-income', label: 'No Income Set', icon: XCircle },
                    { value: 'high-spenders', label: 'High Spenders (₹50K+)', icon: TrendingUp },
                    { value: 'active-users', label: 'Active Users (10+ txns)', icon: CheckCircle },
                    { value: 'inactive-users', label: 'Inactive Users (<5 txns)', icon: Clock }
                  ].map((seg) => {
                    const Icon = seg.icon;
                    return (
                      <button
                        key={seg.value}
                        onClick={() => {
                          setSegmentFilters(prev => ({ ...prev, segment: seg.value }));
                          setSegmentPage(1);
                        }}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          segmentFilters.segment === seg.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{seg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Advanced Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Monthly Income Range</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={segmentFilters.minIncome}
                      onChange={(e) => setSegmentFilters(prev => ({ ...prev, minIncome: e.target.value }))}
                      className="w-1/2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={segmentFilters.maxIncome}
                      onChange={(e) => setSegmentFilters(prev => ({ ...prev, maxIncome: e.target.value }))}
                      className="w-1/2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Transaction Count Range</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={segmentFilters.minTransactions}
                      onChange={(e) => setSegmentFilters(prev => ({ ...prev, minTransactions: e.target.value }))}
                      className="w-1/2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={segmentFilters.maxTransactions}
                      onChange={(e) => setSegmentFilters(prev => ({ ...prev, maxTransactions: e.target.value }))}
                      className="w-1/2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Total Spending Range</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={segmentFilters.minSpending}
                      onChange={(e) => setSegmentFilters(prev => ({ ...prev, minSpending: e.target.value }))}
                      className="w-1/2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={segmentFilters.maxSpending}
                      onChange={(e) => setSegmentFilters(prev => ({ ...prev, maxSpending: e.target.value }))}
                      className="w-1/2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Sort Options */}
              <div className="flex items-center space-x-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Sort By</label>
                  <select
                    value={segmentFilters.sortBy}
                    onChange={(e) => setSegmentFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="income">Monthly Income</option>
                    <option value="transactions">Transaction Count</option>
                    <option value="spending">Total Spending</option>
                    <option value="credit">Credit Score</option>
                    <option value="date">Join Date</option>
                    <option value="name">Name</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Order</label>
                  <select
                    value={segmentFilters.order}
                    onChange={(e) => setSegmentFilters(prev => ({ ...prev, order: e.target.value }))}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
                <div className="flex-1"></div>
                <button
                  onClick={loadSegmentation}
                  className="mt-6 flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Filter className="w-4 h-4" />
                  <span>Apply Filters</span>
                </button>
              </div>
            </div>

            {/* Segmented Users Table */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Segmented Users ({segmentPagination?.totalUsers || 0})
                </h3>
                <button
                  onClick={loadSegmentation}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-slate-300">User</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-slate-300">Monthly Income</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-slate-300">Transactions</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-slate-300">Total Spending</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-slate-300">Total Income</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-slate-300">Credit Score</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-slate-300">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segmentedUsers.map((user) => (
                      <tr key={user._id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700">
                        <td className="py-3 px-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                            <div className="text-sm text-gray-500 dark:text-slate-400">{user.email}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`text-sm font-medium ${
                            user.monthlyIncome >= 100000 ? 'text-green-600' :
                            user.monthlyIncome >= 50000 ? 'text-blue-600' :
                            user.monthlyIncome > 0 ? 'text-amber-600' : 'text-gray-400 dark:text-slate-500'
                          }`}>
                            {user.monthlyIncome > 0 
                              ? `₹${user.monthlyIncome.toLocaleString('en-IN')}`
                              : 'Not set'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`text-sm font-medium ${
                            user.transactionCount >= 10 ? 'text-green-600' :
                            user.transactionCount >= 5 ? 'text-blue-600' : 'text-gray-500 dark:text-slate-400'
                          }`}>
                            {user.transactionCount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-sm font-medium text-red-600">
                            ₹{user.totalSpending.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-sm font-medium text-green-600">
                            ₹{user.totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {user.creditScore > 0 ? (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              user.creditScore >= 750 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              user.creditScore >= 650 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              user.creditScore >= 550 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {user.creditScore}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-slate-500">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.isActive 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {user.isActive ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {segmentPagination && segmentPagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-600 dark:text-slate-400">
                    Showing {((segmentPage - 1) * 50) + 1} to {Math.min(segmentPage * 50, segmentPagination.totalUsers)} of {segmentPagination.totalUsers} users
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSegmentPage(prev => Math.max(1, prev - 1))}
                      disabled={segmentPage === 1}
                      className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600 dark:text-slate-400">
                      Page {segmentPage} of {segmentPagination.totalPages}
                    </span>
                    <button
                      onClick={() => setSegmentPage(prev => Math.min(segmentPagination.totalPages, prev + 1))}
                      disabled={segmentPage === segmentPagination.totalPages}
                      className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Documents</h3>
              <button
                onClick={loadDocuments}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-slate-300">File Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-slate-300">User</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-slate-300">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-slate-300">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-slate-300">Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc._id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{doc.originalName}</td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900 dark:text-white">{doc.userId?.name || 'Unknown'}</div>
                          <div className="text-gray-500 dark:text-slate-400">{doc.userId?.email || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300">
                          {doc.type || 'unknown'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          doc.status === 'processed' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                            : doc.status === 'failed'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-400">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {docPagination && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600 dark:text-slate-400">
                  Showing {((docPagination.page - 1) * docPagination.limit) + 1} to {Math.min(docPagination.page * docPagination.limit, docPagination.total)} of {docPagination.total} documents
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setDocPage(docPage - 1)}
                    disabled={docPage === 1}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setDocPage(docPage + 1)}
                    disabled={docPage >= docPagination.pages}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">User Growth (Last 30 Days)</h3>
              <div className="text-center text-gray-600 dark:text-slate-400">
                {analytics.userGrowth.length} new users in the last 30 days
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Users by Volume</h3>
              <div className="space-y-3">
                {analytics.topUsers.map((item, index) => (
                  <div key={item._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{item.user.name}</div>
                        <div className="text-sm text-gray-600 dark:text-slate-400">{item.user.email}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900 dark:text-white">₹{item.totalVolume.toLocaleString()}</div>
                      <div className="text-sm text-gray-600 dark:text-slate-400">{item.transactionCount} transactions</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* System Health Tab */}
        {activeTab === 'system' && systemHealth && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Memory Usage */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Memory Usage</h4>
                  <MemoryStick className="w-6 h-6 text-blue-500" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-slate-400">Used</span>
                    <span className="font-medium">{formatBytes(systemHealth.memory.used)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-slate-400">Total</span>
                    <span className="font-medium">{formatBytes(systemHealth.memory.total)}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mt-3">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${systemHealth.memory.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-center text-sm text-gray-600 dark:text-slate-400 mt-2">
                    {systemHealth.memory.percentage}% used
                  </div>
                </div>
              </div>

              {/* System Info */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">System Info</h4>
                  <Cpu className="w-6 h-6 text-green-500" />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">Platform</span>
                    <span className="font-medium">{systemHealth.system.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">CPUs</span>
                    <span className="font-medium">{systemHealth.system.cpus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">Arch</span>
                    <span className="font-medium">{systemHealth.system.arch}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">Uptime</span>
                    <span className="font-medium">{formatUptime(systemHealth.uptime)}</span>
                  </div>
                </div>
              </div>

              {/* Database */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Database</h4>
                  <Database className="w-6 h-6 text-purple-500" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {systemHealth.database.connected ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className="text-sm font-medium">
                      {systemHealth.database.connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-400 mt-3">
                    {systemHealth.database.collections.length} collections
                  </div>
                </div>
              </div>
            </div>

            {/* System Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">System Maintenance</h4>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSystemCleanup}
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Run Cleanup</span>
                </button>
                <button
                  onClick={loadSystemHealth}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh Health</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl dark:shadow-slate-900/30 p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Edit User</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={editingUser.isActive}
                  onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Active</label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Generate Reports</h2>
            <p className="text-gray-600 dark:text-slate-400">Export comprehensive reports for analysis and compliance</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Users Report */}
            <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <Users className="w-8 h-8 text-blue-600 mr-3" />
                <h3 className="text-lg font-semibold">Users Report</h3>
              </div>
              <p className="text-gray-600 dark:text-slate-400 text-sm mb-4">
                Complete user data including registration dates, activity levels, and status
              </p>
              <button
                onClick={() => handleGenerateReport('users')}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Generate CSV
              </button>
            </div>

            {/* Transactions Report */}
            <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <Activity className="w-8 h-8 text-green-600 mr-3" />
                <h3 className="text-lg font-semibold">Transactions Report</h3>
              </div>
              <p className="text-gray-600 dark:text-slate-400 text-sm mb-4">
                All transactions with amounts, categories, dates, and user information
              </p>
              <button
                onClick={() => handleGenerateReport('transactions')}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Generate CSV
              </button>
            </div>

            {/* Documents Report */}
            <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <FileText className="w-8 h-8 text-purple-600 mr-3" />
                <h3 className="text-lg font-semibold">Documents Report</h3>
              </div>
              <p className="text-gray-600 dark:text-slate-400 text-sm mb-4">
                Document processing stats, types, statuses, and upload history
              </p>
              <button
                onClick={() => handleGenerateReport('documents')}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Generate CSV
              </button>
            </div>

            {/* Financial Summary */}
            <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <TrendingUp className="w-8 h-8 text-orange-600 mr-3" />
                <h3 className="text-lg font-semibold">Financial Summary</h3>
              </div>
              <p className="text-gray-600 dark:text-slate-400 text-sm mb-4">
                Aggregate financial data including income, expenses, and trends
              </p>
              <button
                onClick={() => handleGenerateReport('financial-summary')}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center justify-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Generate CSV
              </button>
            </div>

            {/* Lender Report */}
            <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <BarChart3 className="w-8 h-8 text-red-600 mr-3" />
                <h3 className="text-lg font-semibold">Lender Report</h3>
              </div>
              <p className="text-gray-600 dark:text-slate-400 text-sm mb-4">
                Lender details, active loans, borrowers, and payment statistics
              </p>
              <button
                onClick={() => handleGenerateReport('lenders')}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Generate CSV
              </button>
            </div>

            {/* System Activity */}
            <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <Shield className="w-8 h-8 text-indigo-600 mr-3" />
                <h3 className="text-lg font-semibold">System Activity</h3>
              </div>
              <p className="text-gray-600 dark:text-slate-400 text-sm mb-4">
                Login history, failed attempts, and security events
              </p>
              <button
                onClick={() => handleGenerateReport('activity')}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Generate CSV
              </button>
            </div>
          </div>

          {/* Custom Report Builder */}
          <div className="mt-8 border-t pt-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Custom Report Builder</h3>
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Report Type</label>
                  <select className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg">
                    <option>All Data</option>
                    <option>Users Only</option>
                    <option>Transactions Only</option>
                    <option>Financial Analysis</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Date Range</label>
                  <select className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg">
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                    <option>Last 90 Days</option>
                    <option>Last Year</option>
                    <option>All Time</option>
                  </select>
                </div>
              </div>
              <button className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium">
                Generate Custom Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Admin Settings</h2>
            <p className="text-gray-600 dark:text-slate-400">Configure system-wide settings and preferences</p>
          </div>

          {/* System Configuration */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              System Configuration
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Maintenance Mode</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Disable user access for system maintenance</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">User Registration</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Allow new users to register accounts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Email Notifications</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Send system notifications to users via email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Security Settings
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  defaultValue={30}
                  className="w-full md:w-64 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
                />
              </div>

              <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Maximum Login Attempts
                </label>
                <input
                  type="number"
                  defaultValue={5}
                  className="w-full md:w-64 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Require 2FA for all admin accounts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Email Templates */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Email Templates
            </h3>
            <div className="space-y-3">
              <button className="w-full p-4 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-left flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Welcome Email</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Sent when new users register</p>
                </div>
                <Edit2 className="w-5 h-5 text-gray-400 dark:text-slate-500" />
              </button>
              
              <button className="w-full p-4 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-left flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Password Reset</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Sent when users request password reset</p>
                </div>
                <Edit2 className="w-5 h-5 text-gray-400 dark:text-slate-500" />
              </button>

              <button className="w-full p-4 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-left flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">EMI Reminder</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Sent before EMI due dates</p>
                </div>
                <Edit2 className="w-5 h-5 text-gray-400 dark:text-slate-500" />
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium">
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* Cache Management Tab */}
      {activeTab === 'cache' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/30">
          <CacheManagementPanel />
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

