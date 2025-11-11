import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, Plus, Check, X, Clock, AlertCircle, Calendar, 
  DollarSign, Filter, Search, Edit, Trash2, Eye, 
  CheckCircle, XCircle, AlertTriangle, Zap, TrendingUp,
  CreditCard, Smartphone, Building, Droplet, Lightbulb, Wifi, Phone, Shield
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { toast } from 'react-toastify';

const BillReminders = () => {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [billToDelete, setBillToDelete] = useState(null);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [billsRes, dashboardRes] = await Promise.all([
        api.get('/bill-reminders', { params: filter !== 'all' ? { status: filter } : {} }),
        api.get('/bill-reminders/dashboard')
      ]);
      
      setBills(billsRes.data.data);
      setDashboard(dashboardRes.data.data);
    } catch (error) {
      console.error('Error fetching bills:', error);
      toast.error('Failed to load bill reminders');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      electricity: <Lightbulb className="w-5 h-5" />,
      water: <Droplet className="w-5 h-5" />,
      internet: <Wifi className="w-5 h-5" />,
      mobile: <Phone className="w-5 h-5" />,
      milk: <DollarSign className="w-5 h-5" />,
      rent: <Building className="w-5 h-5" />,
      subscription: <Smartphone className="w-5 h-5" />,
      insurance: <Building className="w-5 h-5" />,
      loan: <CreditCard className="w-5 h-5" />,
      other: <Bell className="w-5 h-5" />
    };
    return icons[category] || icons.other;
  };

  const getCategoryColor = (category) => {
    const colors = {
      electricity: 'from-yellow-400 to-orange-500',
      water: 'from-blue-400 to-cyan-500',
      internet: 'from-purple-400 to-indigo-500',
      mobile: 'from-green-400 to-emerald-500',
      milk: 'from-pink-400 to-rose-500',
      rent: 'from-red-400 to-pink-500',
      subscription: 'from-indigo-400 to-purple-500',
      insurance: 'from-cyan-400 to-blue-500',
      loan: 'from-orange-400 to-red-500',
      other: 'from-gray-400 to-gray-500'
    };
    return colors[category] || colors.other;
  };

  const getStatusBadge = (bill) => {
    const statuses = {
      pending: { 
        icon: <Clock className="w-4 h-4" />, 
        color: 'bg-blue-100 text-blue-700',
        text: 'Pending'
      },
      awaiting_approval: { 
        icon: <AlertCircle className="w-4 h-4" />, 
        color: 'bg-amber-100 text-amber-700',
        text: 'Needs Approval'
      },
      approved: { 
        icon: <CheckCircle className="w-4 h-4" />, 
        color: 'bg-green-100 text-green-700',
        text: 'Approved'
      },
      paid: { 
        icon: <Check className="w-4 h-4" />, 
        color: 'bg-emerald-100 text-emerald-700',
        text: 'Paid'
      },
      overdue: { 
        icon: <AlertTriangle className="w-4 h-4" />, 
        color: 'bg-red-100 text-red-700',
        text: 'Overdue'
      },
      rejected: { 
        icon: <XCircle className="w-4 h-4" />, 
        color: 'bg-gray-100 text-gray-700',
        text: 'Rejected'
      }
    };
    
    const status = statuses[bill.status] || statuses.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
        {status.icon}
        {status.text}
      </span>
    );
  };

  const getDaysUntilDue = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const days = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    return days;
  };

  const handleApproveBill = async (billId, approved, note = '') => {
    try {
      const endpoint = approved ? 'approve' : 'reject';
      await api.post(`/bill-reminders/${billId}/${endpoint}`, { note });
      toast.success(`Bill ${approved ? 'approved' : 'rejected'} successfully`);
      fetchData();
      setShowApprovalModal(false);
    } catch (error) {
      toast.error(`Failed to ${approved ? 'approve' : 'reject'} bill`);
    }
  };

  const handleMarkPaid = async (billId, details) => {
    try {
      await api.post(`/bill-reminders/${billId}/mark-paid`, details);
      toast.success('Bill marked as paid successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to mark bill as paid');
    }
  };

  const handleDeleteBill = async (billId) => {
    setBillToDelete(billId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!billToDelete) return;
    
    try {
      await api.delete(`/bill-reminders/${billToDelete}`);
      toast.success('Bill deleted successfully');
      setShowDeleteModal(false);
      setBillToDelete(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to delete bill');
    }
  };

  const filteredBills = bills.filter(bill =>
    bill.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar />
      
      <div className="flex-1 p-8 ml-0 lg:ml-72">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Bill Reminders & Auto-Pay
              </h1>
              <p className="text-gray-600 mt-2">Automate your monthly bills with smart reminders</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Bill
            </button>
          </div>
        </div>

        {/* Dashboard Stats */}
        {dashboard && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Due Soon"
              value={dashboard.billsDueSoon.length}
              amount={`₹${dashboard.statistics.totalDueSoon.toLocaleString()}`}
              icon={<Clock className="w-6 h-6" />}
              gradient="from-blue-500 to-cyan-500"
              onClick={() => setFilter('pending')}
            />
            <StatCard
              title="Awaiting Approval"
              value={dashboard.awaitingApproval.length}
              amount="Action Required"
              icon={<AlertCircle className="w-6 h-6" />}
              gradient="from-amber-500 to-orange-500"
              onClick={() => setFilter('awaiting_approval')}
              pulse={dashboard.awaitingApproval.length > 0}
            />
            <StatCard
              title="Overdue"
              value={dashboard.overdueBills.length}
              amount={`₹${dashboard.statistics.totalOverdue.toLocaleString()}`}
              icon={<AlertTriangle className="w-6 h-6" />}
              gradient="from-red-500 to-pink-500"
              onClick={() => setFilter('overdue')}
            />
            <StatCard
              title="Paid This Month"
              value={dashboard.paidThisMonth.length}
              amount={`₹${dashboard.statistics.totalPaidThisMonth.toLocaleString()}`}
              icon={<CheckCircle className="w-6 h-6" />}
              gradient="from-green-500 to-emerald-500"
              onClick={() => setFilter('paid')}
            />
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {['all', 'pending', 'awaiting_approval', 'approved', 'paid', 'overdue'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filter === f
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </button>
              ))}
            </div>
            
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search bills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Bills List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Bell className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No bills found</h3>
            <p className="text-gray-500 mb-6">Start by adding your first bill reminder</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg"
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Add Bill
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBills.map((bill) => (
              <BillCard
                key={bill._id}
                bill={bill}
                onApprove={() => {
                  setSelectedBill(bill);
                  setShowApprovalModal(true);
                }}
                onView={() => {
                  setSelectedBill(bill);
                  setShowDetailsModal(true);
                }}
                onEdit={() => {
                  setSelectedBill(bill);
                  setShowAddModal(true);
                }}
                onDelete={() => handleDeleteBill(bill._id)}
                onMarkPaid={() => handleMarkPaid(bill._id, { amount: bill.amount })}
                getCategoryIcon={getCategoryIcon}
                getCategoryColor={getCategoryColor}
                getStatusBadge={getStatusBadge}
                getDaysUntilDue={getDaysUntilDue}
              />
            ))}
          </div>
        )}

        {/* Modals */}
        {showAddModal && (
          <AddBillModal
            bill={selectedBill}
            onClose={() => {
              setShowAddModal(false);
              setSelectedBill(null);
            }}
            onSuccess={() => {
              fetchData();
              setShowAddModal(false);
              setSelectedBill(null);
            }}
          />
        )}

        {showApprovalModal && selectedBill && (
          <ApprovalModal
            bill={selectedBill}
            onClose={() => {
              setShowApprovalModal(false);
              setSelectedBill(null);
            }}
            onApprove={(note) => handleApproveBill(selectedBill._id, true, note)}
            onReject={(note) => handleApproveBill(selectedBill._id, false, note)}
          />
        )}

        {showDeleteModal && (
          <DeleteConfirmationModal
            onClose={() => {
              setShowDeleteModal(false);
              setBillToDelete(null);
            }}
            onConfirm={confirmDelete}
          />
        )}

        {showDetailsModal && selectedBill && (
          <BillDetailsModal
            bill={selectedBill}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedBill(null);
            }}
            getCategoryIcon={getCategoryIcon}
            getCategoryColor={getCategoryColor}
            getStatusBadge={getStatusBadge}
          />
        )}
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, amount, icon, gradient, onClick, pulse }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-xl shadow-lg p-6 cursor-pointer transform hover:scale-105 transition-all duration-200 ${
      pulse ? 'animate-pulse' : ''
    }`}
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg bg-gradient-to-r ${gradient} text-white`}>
        {icon}
      </div>
      <span className="text-3xl font-bold text-gray-800">{value}</span>
    </div>
    <h3 className="text-gray-600 font-medium mb-1">{title}</h3>
    <p className="text-sm text-gray-500">{amount}</p>
  </div>
);

// Bill Card Component
const BillCard = ({ 
  bill, onApprove, onView, onEdit, onDelete, onMarkPaid,
  getCategoryIcon, getCategoryColor, getStatusBadge, getDaysUntilDue 
}) => {
  const daysUntilDue = getDaysUntilDue(bill.dueDate);
  const isOverdue = daysUntilDue < 0;
  const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 3;

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-all duration-200 hover:shadow-xl">
      {/* Header with Category */}
      <div className={`p-4 bg-gradient-to-r ${getCategoryColor(bill.category)} text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getCategoryIcon(bill.category)}
            <span className="font-medium capitalize">{bill.category}</span>
          </div>
          {bill.autoPayEnabled && (
            <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full text-xs">
              <Zap className="w-3 h-3" />
              Auto
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">{bill.title}</h3>
        
        <div className="flex items-baseline justify-between mb-4">
          <span className="text-3xl font-bold text-gray-900">₹{bill.amount.toLocaleString()}</span>
          {getStatusBadge(bill)}
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>Due: {new Date(bill.dueDate).toLocaleDateString()}</span>
          </div>
          
          {(isOverdue || isDueSoon) && (
            <div className={`flex items-center gap-2 text-sm ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>
              <AlertTriangle className="w-4 h-4" />
              <span>
                {isOverdue 
                  ? `${Math.abs(daysUntilDue)} day(s) overdue!`
                  : `Due in ${daysUntilDue} day(s)`
                }
              </span>
            </div>
          )}

          {bill.frequency !== 'once' && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <TrendingUp className="w-4 h-4" />
              <span className="capitalize">{bill.frequency} recurring</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {bill.status === 'awaiting_approval' && (
            <button
              onClick={onApprove}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-md transition-all text-sm font-medium"
            >
              Approve
            </button>
          )}
          
          {(bill.status === 'pending' || bill.status === 'approved' || bill.status === 'overdue') && (
            <button
              onClick={onMarkPaid}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-md transition-all text-sm font-medium"
            >
              Mark Paid
            </button>
          )}
          
          <button
            onClick={onView}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          
          <button
            onClick={onDelete}
            className="px-4 py-2 bg-gray-100 text-red-600 rounded-lg hover:bg-red-50 transition-all"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Delete Confirmation Modal Component
const DeleteConfirmationModal = ({ onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
            Delete Bill Reminder
          </h2>
          
          <p className="text-gray-600 text-center mb-6">
            Are you sure you want to delete this bill? This action cannot be undone.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Approval Modal Component
const ApprovalModal = ({ bill, onClose, onApprove, onReject }) => {
  const [note, setNote] = useState('');
  const [action, setAction] = useState(null);

  const handleSubmit = () => {
    if (action === 'approve') {
      onApprove(note);
    } else if (action === 'reject') {
      onReject(note);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">Payment Approval</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-2">{bill.title}</h3>
            <div className="text-4xl font-bold text-purple-600 mb-4">
              ₹{bill.amount.toLocaleString()}
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Due: {new Date(bill.dueDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                <span className="capitalize">{bill.category}</span>
              </div>
              {bill.vendor?.name && (
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  <span>Vendor: {bill.vendor.name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Add any additional notes..."
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setAction('approve');
                handleSubmit();
              }}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg transition-all font-medium"
            >
              <Check className="w-5 h-5 inline mr-2" />
              Approve Payment
            </button>
            <button
              onClick={() => {
                setAction('reject');
                handleSubmit();
              }}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all font-medium"
            >
              <X className="w-5 h-5 inline mr-2" />
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add Bill Modal Component (You'll need to implement the full form)
const AddBillModal = ({ bill, onClose, onSuccess }) => {
  const [formData, setFormData] = useState(bill || {
    title: '',
    description: '',
    amount: '',
    category: 'electricity',
    dueDate: '',
    frequency: 'monthly',
    reminderDays: 3,
    autoPayEnabled: false,
    requiresApproval: true,
    paymentMethod: 'manual'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (bill) {
        await api.put(`/bill-reminders/${bill._id}`, formData);
        toast.success('Bill updated successfully');
      } else {
        await api.post('/bill-reminders', formData);
        toast.success('Bill created successfully');
      }
      onSuccess();
    } catch (error) {
      toast.error(`Failed to ${bill ? 'update' : 'create'} bill`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">
              {bill ? 'Edit Bill' : 'Add New Bill'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., Monthly Electricity Bill"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="electricity">Electricity</option>
                <option value="water">Water</option>
                <option value="gas">Gas</option>
                <option value="internet">Internet</option>
                <option value="mobile">Mobile</option>
                <option value="milk">Milk</option>
                <option value="rent">Rent</option>
                <option value="subscription">Subscription</option>
                <option value="insurance">Insurance</option>
                <option value="loan">Loan</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (₹) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date *
              </label>
              <input
                type="date"
                required
                value={formData.dueDate ? new Date(formData.dueDate).toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frequency
              </label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="once">One-time</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remind Me (days before)
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={formData.reminderDays}
                onChange={(e) => setFormData({ ...formData, reminderDays: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Additional details about this bill..."
              />
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
                <input
                  type="checkbox"
                  id="autoPayEnabled"
                  checked={formData.autoPayEnabled}
                  onChange={(e) => setFormData({ ...formData, autoPayEnabled: e.target.checked })}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <label htmlFor="autoPayEnabled" className="flex-1 cursor-pointer">
                  <div className="font-medium text-gray-800 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-600" />
                    Enable Auto-Payment
                  </div>
                  <p className="text-sm text-gray-600">Automatically process payment when due</p>
                </label>
              </div>

              {formData.autoPayEnabled && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="requiresApproval"
                    checked={formData.requiresApproval}
                    onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                    className="w-5 h-5 text-amber-600 rounded focus:ring-2 focus:ring-amber-500"
                  />
                  <label htmlFor="requiresApproval" className="flex-1 cursor-pointer">
                    <div className="font-medium text-gray-800 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-amber-600" />
                      Require Approval Before Payment
                    </div>
                    <p className="text-sm text-gray-600">You'll need to approve each payment before it's processed</p>
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
            >
              {bill ? 'Update Bill' : 'Create Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Bill Details Modal Component
const BillDetailsModal = ({ bill, onClose, getCategoryIcon, getCategoryColor, getStatusBadge }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Bill Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className={`p-6 rounded-xl bg-gradient-to-r ${getCategoryColor(bill.category)} text-white`}>
          <div className="flex items-center gap-3 mb-3">
            {getCategoryIcon(bill.category)}
            <span className="text-lg font-medium capitalize">{bill.category}</span>
          </div>
          <h3 className="text-2xl font-bold mb-2">{bill.title}</h3>
          <div className="text-4xl font-bold">₹{bill.amount.toLocaleString()}</div>
        </div>

        {/* Status */}
        <div>
          {getStatusBadge(bill)}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Due Date</label>
            <p className="text-gray-800 font-medium">{new Date(bill.dueDate).toLocaleDateString()}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Frequency</label>
            <p className="text-gray-800 font-medium capitalize">{bill.frequency}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Reminder Days</label>
            <p className="text-gray-800 font-medium">{bill.reminderDays} days before</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Auto-Payment</label>
            <p className="text-gray-800 font-medium">{bill.autoPayEnabled ? '✅ Enabled' : '❌ Disabled'}</p>
          </div>
        </div>

        {/* Description */}
        {bill.description && (
          <div>
            <label className="text-sm text-gray-500">Description</label>
            <p className="text-gray-800">{bill.description}</p>
          </div>
        )}

        {/* Payment History */}
        {bill.paymentHistory && bill.paymentHistory.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Payment History</h4>
            <div className="space-y-2">
              {bill.paymentHistory.map((payment, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">₹{payment.amount.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">{new Date(payment.paidDate).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm text-gray-600 capitalize">{payment.paymentMethod}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default BillReminders;
