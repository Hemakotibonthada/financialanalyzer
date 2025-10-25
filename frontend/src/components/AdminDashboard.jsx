import React, { useState, useEffect } from 'react';
import {
  Users, FileText, Activity, TrendingUp, Database, Shield,
  AlertTriangle, CheckCircle, XCircle, Clock, Search, Filter,
  Download, RefreshCw, Trash2, UserCheck, UserX, Crown, Settings,
  BarChart3, PieChart, Server, HardDrive, Cpu, MemoryStick,
  MessageSquare, Bell, Eye, Edit2, Lock, Unlock, User
} from 'lucide-react';
import api from '../services/api';

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
            message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' :
            message.type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' :
            'bg-blue-100 text-blue-700 border border-blue-200'
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
                className="ml-auto text-gray-500 hover:text-gray-700"
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
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-10 h-10 text-blue-500" />
                  <span className="text-sm font-medium text-gray-500">USERS</span>
                </div>
                <div className="mb-2">
                  <div className="text-3xl font-bold text-gray-900">{stats.users.total}</div>
                  <div className="text-sm text-gray-600">
                    {stats.users.active} active • {stats.users.inactive} inactive
                  </div>
                </div>
              </div>

              {/* Documents Card */}
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between mb-4">
                  <FileText className="w-10 h-10 text-green-500" />
                  <span className="text-sm font-medium text-gray-500">DOCUMENTS</span>
                </div>
                <div className="mb-2">
                  <div className="text-3xl font-bold text-gray-900">{stats.documents.total}</div>
                  <div className="text-sm text-gray-600">Total uploaded</div>
                </div>
              </div>

              {/* Transactions Card */}
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between mb-4">
                  <Activity className="w-10 h-10 text-purple-500" />
                  <span className="text-sm font-medium text-gray-500">TRANSACTIONS</span>
                </div>
                <div className="mb-2">
                  <div className="text-3xl font-bold text-gray-900">{stats.transactions.total.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">
                    ₹{(stats.transactions.volume.totalCredit - stats.transactions.volume.totalDebit).toLocaleString()} net
                  </div>
                </div>
              </div>

              {/* System Card */}
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
                <div className="flex items-center justify-between mb-4">
                  <Server className="w-10 h-10 text-orange-500" />
                  <span className="text-sm font-medium text-gray-500">SYSTEM</span>
                </div>
                <div className="mb-2">
                  <div className="text-3xl font-bold text-gray-900">{formatUptime(stats.system.uptime)}</div>
                  <div className="text-sm text-gray-600">
                    {formatBytes(stats.system.memoryUsage.heapUsed)} / {formatBytes(stats.system.memoryUsage.heapTotal)}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Users */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Recent Users
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Role</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.users.recent.map((user) => (
                      <tr key={user._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">{user.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {user.role === 'admin' && <Crown className="w-3 h-3 mr-1" />}
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.isActive 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
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
        <div className="bg-white rounded-lg shadow-md mb-8">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
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
                  : 'text-gray-600 hover:text-gray-900'
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
                  : 'text-gray-600 hover:text-gray-900'
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
                  : 'text-gray-600 hover:text-gray-900'
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
                  : 'text-gray-600 hover:text-gray-900'
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
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Server className="w-4 h-4" />
                <span>System Health</span>
              </div>
            </button>
          </div>
        </div>

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={userStatus}
                onChange={(e) => setUserStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">User</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Stats</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Joined</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {user.role === 'admin' && <Crown className="w-3 h-3 mr-1" />}
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.isActive 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {user.isActive ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-600">
                          <div>{user.stats.documents} docs</div>
                          <div>{user.stats.transactions} txns</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus(user._id)}
                            className={`p-1 rounded ${
                              user.isActive 
                                ? 'text-orange-600 hover:bg-orange-50' 
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={user.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {user.isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
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
                <div className="text-sm text-gray-600">
                  Showing {((userPagination.page - 1) * userPagination.limit) + 1} to {Math.min(userPagination.page * userPagination.limit, userPagination.total)} of {userPagination.total} users
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setUserPage(userPage - 1)}
                    disabled={userPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setUserPage(userPage + 1)}
                    disabled={userPage >= userPagination.pages}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Total Users</p>
                      <p className="text-2xl font-bold text-blue-900">{segmentStats.totalUsers || 0}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">Avg Monthly Income</p>
                      <p className="text-2xl font-bold text-green-900">
                        ₹{(segmentStats.averageIncome || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">Avg Transactions</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {(segmentStats.averageTransactions || 0).toFixed(1)}
                      </p>
                    </div>
                    <Activity className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-600 font-medium">Avg Spending</p>
                      <p className="text-2xl font-bold text-orange-900">
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
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Income Distribution</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-3xl font-bold text-emerald-700">{segmentStats.highIncomeUsers || 0}</p>
                    <p className="text-sm text-emerald-600 mt-1">High Income</p>
                    <p className="text-xs text-gray-500 mt-1">₹100K+/month</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-3xl font-bold text-blue-700">{segmentStats.mediumIncomeUsers || 0}</p>
                    <p className="text-sm text-blue-600 mt-1">Medium Income</p>
                    <p className="text-xs text-gray-500 mt-1">₹50K-100K/month</p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-3xl font-bold text-amber-700">{segmentStats.lowIncomeUsers || 0}</p>
                    <p className="text-sm text-amber-600 mt-1">Low Income</p>
                    <p className="text-xs text-gray-500 mt-1">₹0-50K/month</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-3xl font-bold text-gray-700">{segmentStats.noIncomeUsers || 0}</p>
                    <p className="text-sm text-gray-600 mt-1">No Income Set</p>
                    <p className="text-xs text-gray-500 mt-1">₹0/month</p>
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Filter & Segment Users</h3>
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
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Reset Filters
                </button>
              </div>

              {/* Quick Segments */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Quick Segments</label>
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
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Income Range</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={segmentFilters.minIncome}
                      onChange={(e) => setSegmentFilters(prev => ({ ...prev, minIncome: e.target.value }))}
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={segmentFilters.maxIncome}
                      onChange={(e) => setSegmentFilters(prev => ({ ...prev, maxIncome: e.target.value }))}
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Count Range</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={segmentFilters.minTransactions}
                      onChange={(e) => setSegmentFilters(prev => ({ ...prev, minTransactions: e.target.value }))}
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={segmentFilters.maxTransactions}
                      onChange={(e) => setSegmentFilters(prev => ({ ...prev, maxTransactions: e.target.value }))}
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Spending Range</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={segmentFilters.minSpending}
                      onChange={(e) => setSegmentFilters(prev => ({ ...prev, minSpending: e.target.value }))}
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={segmentFilters.maxSpending}
                      onChange={(e) => setSegmentFilters(prev => ({ ...prev, maxSpending: e.target.value }))}
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Sort Options */}
              <div className="flex items-center space-x-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <select
                    value={segmentFilters.sortBy}
                    onChange={(e) => setSegmentFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                  <select
                    value={segmentFilters.order}
                    onChange={(e) => setSegmentFilters(prev => ({ ...prev, order: e.target.value }))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
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
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">User</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Monthly Income</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Transactions</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Total Spending</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Total Income</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Credit Score</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segmentedUsers.map((user) => (
                      <tr key={user._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`text-sm font-medium ${
                            user.monthlyIncome >= 100000 ? 'text-green-600' :
                            user.monthlyIncome >= 50000 ? 'text-blue-600' :
                            user.monthlyIncome > 0 ? 'text-amber-600' : 'text-gray-400'
                          }`}>
                            {user.monthlyIncome > 0 
                              ? `₹${user.monthlyIncome.toLocaleString('en-IN')}`
                              : 'Not set'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`text-sm font-medium ${
                            user.transactionCount >= 10 ? 'text-green-600' :
                            user.transactionCount >= 5 ? 'text-blue-600' : 'text-gray-500'
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
                              user.creditScore >= 750 ? 'bg-green-100 text-green-700' :
                              user.creditScore >= 650 ? 'bg-blue-100 text-blue-700' :
                              user.creditScore >= 550 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {user.creditScore}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.isActive 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
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
                  <div className="text-sm text-gray-600">
                    Showing {((segmentPage - 1) * 50) + 1} to {Math.min(segmentPage * 50, segmentPagination.totalUsers)} of {segmentPagination.totalUsers} users
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSegmentPage(prev => Math.max(1, prev - 1))}
                      disabled={segmentPage === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {segmentPage} of {segmentPagination.totalPages}
                    </span>
                    <button
                      onClick={() => setSegmentPage(prev => Math.min(segmentPagination.totalPages, prev + 1))}
                      disabled={segmentPage === segmentPagination.totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
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
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">File Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">User</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">{doc.originalName}</td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{doc.userId?.name || 'Unknown'}</div>
                          <div className="text-gray-500">{doc.userId?.email || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {doc.type || 'unknown'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          doc.status === 'processed' 
                            ? 'bg-green-100 text-green-700' 
                            : doc.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
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
                <div className="text-sm text-gray-600">
                  Showing {((docPagination.page - 1) * docPagination.limit) + 1} to {Math.min(docPagination.page * docPagination.limit, docPagination.total)} of {docPagination.total} documents
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setDocPage(docPage - 1)}
                    disabled={docPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setDocPage(docPage + 1)}
                    disabled={docPage >= docPagination.pages}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth (Last 30 Days)</h3>
              <div className="text-center text-gray-600">
                {analytics.userGrowth.length} new users in the last 30 days
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Users by Volume</h3>
              <div className="space-y-3">
                {analytics.topUsers.map((item, index) => (
                  <div key={item._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{item.user.name}</div>
                        <div className="text-sm text-gray-600">{item.user.email}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">₹{item.totalVolume.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">{item.transactionCount} transactions</div>
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
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900">Memory Usage</h4>
                  <MemoryStick className="w-6 h-6 text-blue-500" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Used</span>
                    <span className="font-medium">{formatBytes(systemHealth.memory.used)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total</span>
                    <span className="font-medium">{formatBytes(systemHealth.memory.total)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${systemHealth.memory.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-center text-sm text-gray-600 mt-2">
                    {systemHealth.memory.percentage}% used
                  </div>
                </div>
              </div>

              {/* System Info */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900">System Info</h4>
                  <Cpu className="w-6 h-6 text-green-500" />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Platform</span>
                    <span className="font-medium">{systemHealth.system.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">CPUs</span>
                    <span className="font-medium">{systemHealth.system.cpus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Arch</span>
                    <span className="font-medium">{systemHealth.system.arch}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Uptime</span>
                    <span className="font-medium">{formatUptime(systemHealth.uptime)}</span>
                  </div>
                </div>
              </div>

              {/* Database */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900">Database</h4>
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
                  <div className="text-sm text-gray-600 mt-3">
                    {systemHealth.database.collections.length} collections
                  </div>
                </div>
              </div>
            </div>

            {/* System Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h4 className="font-semibold text-gray-900 mb-4">System Maintenance</h4>
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
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Edit User</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <label className="text-sm font-medium text-gray-700">Active</label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
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
    </div>
  );
};

export default AdminDashboard;
