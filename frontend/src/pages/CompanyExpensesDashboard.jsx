import React, { useState, useEffect } from 'react';
import MainLayout from '../components/MainLayout';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  FileText, 
  PieChart,
  Download,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Wallet,
  Users,
  CreditCard,
  Target
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-toastify';
import ExpenseFormModal from '../components/ExpenseFormModal';
import BudgetFormModal from '../components/BudgetFormModal';
import InvestorFormModal from '../components/InvestorFormModal';
import TransactionFormModal from '../components/TransactionFormModal';
import { showPasswordNotification, extractPasswordFromResponse, downloadFileWithPassword } from '../utils/documentPasswordNotification';

const CompanyExpensesDashboard = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'expenses', 'budget', 'transactions', 'investors'
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [showInvestorModal, setShowInvestorModal] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [investorLoading, setInvestorLoading] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    category: '',
    paymentStatus: '',
    search: ''
  });

  useEffect(() => {
    fetchExpenses();
    fetchAnalytics();
    if (activeTab === 'budget' || activeTab === 'overview') {
      fetchBudgets();
    }
    if (activeTab === 'investors' || activeTab === 'overview') {
      fetchInvestors();
    }
    if (activeTab === 'transactions' || activeTab === 'overview') {
      fetchTransactions();
    }
  }, [filters, activeTab]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.category) params.append('category', filters.category);
      if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(`/company-expenses?${params.toString()}`);
      setExpenses(response.data.expenses || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(`/company-expenses/analytics?${params.toString()}`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchBudgets = async () => {
    try {
      setBudgetLoading(true);
      const response = await api.get('/company-expenses/budgets');
      setBudgets(response.data.budgets || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      toast.error('Failed to fetch budgets');
    } finally {
      setBudgetLoading(false);
    }
  };

  const handleDeleteBudget = async (id) => {
    if (!window.confirm('Are you sure you want to delete this budget?')) return;

    try {
      await api.delete(`/company-expenses/budgets/${id}`);
      toast.success('Budget deleted successfully');
      fetchBudgets();
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast.error('Failed to delete budget');
    }
  };

  const openAddBudgetModal = () => {
    setSelectedBudget(null);
    setShowBudgetModal(true);
  };

  const openEditBudgetModal = (budget) => {
    setSelectedBudget(budget);
    setShowBudgetModal(true);
  };

  const handleBudgetModalSuccess = () => {
    setShowBudgetModal(false);
    setSelectedBudget(null);
    fetchBudgets();
  };

  const fetchInvestors = async () => {
    try {
      setInvestorLoading(true);
      const response = await api.get('/company-expenses/investors');
      setInvestors(response.data.investors || []);
    } catch (error) {
      console.error('Error fetching investors:', error);
      toast.error('Failed to fetch investors');
    } finally {
      setInvestorLoading(false);
    }
  };

  const handleDeleteInvestor = async (id) => {
    if (!window.confirm('Are you sure you want to delete this investor?')) return;

    try {
      await api.delete(`/company-expenses/investors/${id}`);
      toast.success('Investor deleted successfully');
      fetchInvestors();
    } catch (error) {
      console.error('Error deleting investor:', error);
      toast.error('Failed to delete investor');
    }
  };

  const openAddInvestorModal = () => {
    setSelectedInvestor(null);
    setShowInvestorModal(true);
  };

  const openEditInvestorModal = (investor) => {
    setSelectedInvestor(investor);
    setShowInvestorModal(true);
  };

  const handleInvestorModalSuccess = () => {
    setShowInvestorModal(false);
    setSelectedInvestor(null);
    fetchInvestors();
  };

  const fetchTransactions = async () => {
    try {
      setTransactionLoading(true);
      const response = await api.get('/company-expenses/transactions');
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to fetch transactions');
    } finally {
      setTransactionLoading(false);
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;

    try {
      await api.delete(`/company-expenses/transactions/${id}`);
      toast.success('Transaction deleted successfully');
      fetchTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    }
  };

  const openAddTransactionModal = () => {
    setSelectedTransaction(null);
    setShowTransactionModal(true);
  };

  const openEditTransactionModal = (transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionModal(true);
  };

  const handleTransactionModalSuccess = () => {
    setShowTransactionModal(false);
    setSelectedTransaction(null);
    fetchTransactions();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;

    try {
      await api.delete(`/company-expenses/${id}`);
      toast.success('Expense deleted successfully');
      fetchExpenses();
      fetchAnalytics();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  const handleExport = async (format) => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('format', format);

      const response = await api.get(`/company-expenses/report?${params.toString()}`, {
        responseType: 'blob'
      });

      // Get password from response headers
      const password = extractPasswordFromResponse(response);
      
      // Download file with password notification
      const filename = `company-expenses-${Date.now()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      downloadFileWithPassword(new Blob([response.data]), filename, password);
      
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openAddModal = () => {
    setSelectedExpense(null);
    setShowModal(true);
  };

  const openEditModal = (expense) => {
    setSelectedExpense(expense);
    setShowModal(true);
  };

  const handleModalSuccess = () => {
    setShowModal(false);
    setSelectedExpense(null);
    fetchExpenses();
    fetchAnalytics();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const categories = [
    'Office Supplies',
    'Travel',
    'Marketing',
    'Technology',
    'Utilities',
    'Salaries',
    'Rent',
    'Insurance',
    'Professional Services',
    'Miscellaneous'
  ];

  return (
    <MainLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Company Trans</h1>
            <p className="text-gray-600 mt-1">Track expenses, budgets, transactions & investors</p>
          </div>
          <button
            onClick={() => {
              if (activeTab === 'expenses') openAddModal();
              else if (activeTab === 'budget') openAddBudgetModal();
              else if (activeTab === 'investors') openAddInvestorModal();
              else if (activeTab === 'transactions') openAddTransactionModal();
              // Add handlers for other tabs as needed
            }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {activeTab === 'expenses' && 'Add Expense'}
            {activeTab === 'budget' && 'Add Budget'}
            {activeTab === 'transactions' && 'Add Transaction'}
            {activeTab === 'investors' && 'Add Investor'}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('expenses')}
                className={`${
                  activeTab === 'expenses'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <FileText className="w-5 h-5" />
                Expenses
              </button>
              <button
                onClick={() => setActiveTab('budget')}
                className={`${
                  activeTab === 'budget'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <Target className="w-5 h-5" />
                Budget
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`${
                  activeTab === 'transactions'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <CreditCard className="w-5 h-5" />
                Transactions
              </button>
              <button
                onClick={() => setActiveTab('investors')}
                className={`${
                  activeTab === 'investors'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <Users className="w-5 h-5" />
                Investors
              </button>
            </nav>
          </div>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Expenses</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(analytics.totalAmount)}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Paid Amount</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {formatCurrency(analytics.paidAmount)}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Pending Amount</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">
                    {formatCurrency(analytics.pendingAmount)}
                  </p>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Calendar className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Count</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {analytics.expenseCount}
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Overview Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-8 h-8 opacity-80" />
                  <span className="text-xs font-semibold bg-white bg-opacity-20 px-2 py-1 rounded">TOTAL</span>
                </div>
                <p className="text-3xl font-bold">{formatCurrency((analytics?.totalAmount || 0) + budgets.reduce((sum, b) => sum + (b.amount || 0), 0))}</p>
                <p className="text-sm opacity-90 mt-1">Total Budget + Expenses</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 opacity-80" />
                  <span className="text-xs font-semibold bg-white bg-opacity-20 px-2 py-1 rounded">PAID</span>
                </div>
                <p className="text-3xl font-bold">{formatCurrency(analytics?.paidAmount || 0)}</p>
                <p className="text-sm opacity-90 mt-1">Paid Expenses</p>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-8 h-8 opacity-80" />
                  <span className="text-xs font-semibold bg-white bg-opacity-20 px-2 py-1 rounded">PENDING</span>
                </div>
                <p className="text-3xl font-bold">{formatCurrency(analytics?.pendingAmount || 0)}</p>
                <p className="text-sm opacity-90 mt-1">Pending Payments</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 opacity-80" />
                  <span className="text-xs font-semibold bg-white bg-opacity-20 px-2 py-1 rounded">INVESTORS</span>
                </div>
                <p className="text-3xl font-bold">{formatCurrency(investors.reduce((sum, inv) => sum + (inv.investmentAmount || 0), 0))}</p>
                <p className="text-sm opacity-90 mt-1">Total Investment</p>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Expenses Summary */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Expenses Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm text-gray-600">Total Count</span>
                    <span className="font-semibold text-gray-900">{expenses.length}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm text-gray-600">Total Amount</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(analytics?.totalAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm text-gray-600">Paid</span>
                    <span className="font-semibold text-green-600">{formatCurrency(analytics?.paidAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pending</span>
                    <span className="font-semibold text-orange-600">{formatCurrency(analytics?.pendingAmount || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Budget Summary */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-600" />
                  Budget Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm text-gray-600">Total Budgets</span>
                    <span className="font-semibold text-gray-900">{budgets.length}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm text-gray-600">Total Budget</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(budgets.reduce((sum, b) => sum + (b.amount || 0), 0))}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm text-gray-600">Spent</span>
                    <span className="font-semibold text-red-600">{formatCurrency(budgets.reduce((sum, b) => sum + (b.spent || 0), 0))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Remaining</span>
                    <span className="font-semibold text-green-600">{formatCurrency(budgets.reduce((sum, b) => sum + ((b.amount || 0) - (b.spent || 0)), 0))}</span>
                  </div>
                </div>
              </div>

              {/* Transactions Summary */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  Transactions Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm text-gray-600">Total Count</span>
                    <span className="font-semibold text-gray-900">{transactions.length}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm text-gray-600">Income</span>
                    <span className="font-semibold text-green-600">{formatCurrency(transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + (t.totalAmount || t.amount || 0), 0))}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm text-gray-600">Expenses</span>
                    <span className="font-semibold text-red-600">{formatCurrency(transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + (t.totalAmount || t.amount || 0), 0))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Net</span>
                    <span className={`font-semibold ${(transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + (t.totalAmount || t.amount || 0), 0) - transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + (t.totalAmount || t.amount || 0), 0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + (t.totalAmount || t.amount || 0), 0) - transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + (t.totalAmount || t.amount || 0), 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Investors Overview */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Investors Overview
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{investors.length}</p>
                  <p className="text-sm text-gray-600 mt-1">Total Investors</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{investors.filter(inv => inv.hasBoardSeat || inv.boardSeat).length}</p>
                  <p className="text-sm text-gray-600 mt-1">Board Seats</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{investors.filter(inv => inv.hasVotingRights || inv.votingRights).length}</p>
                  <p className="text-sm text-gray-600 mt-1">Voting Rights</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(investors.reduce((sum, inv) => sum + (inv.investmentAmount || 0), 0))}</p>
                  <p className="text-sm text-gray-600 mt-1">Total Funding</p>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent Expenses */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Expenses</h3>
                <div className="space-y-3">
                  {expenses.slice(0, 5).map(expense => (
                    <div key={expense.id || expense._id} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{expense.description || 'No description'}</p>
                        <p className="text-xs text-gray-500">{expense.date ? new Date(expense.date).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <span className="font-semibold text-gray-900">{formatCurrency(expense.amountInINR || expense.amount || 0)}</span>
                    </div>
                  ))}
                  {expenses.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No expenses yet</p>
                  )}
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
                <div className="space-y-3">
                  {transactions.slice(0, 5).map(transaction => (
                    <div key={transaction.id} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{transaction.description || 'No description'}</p>
                        <p className="text-xs text-gray-500">{transaction.date ? new Date(transaction.date).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <span className={`font-semibold ${transaction.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'Income' ? '+' : '-'}{formatCurrency(transaction.totalAmount || transaction.amount || 0)}
                      </span>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No transactions yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        {activeTab === 'expenses' && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Status
              </label>
              <select
                name="paymentStatus"
                value={filters.paymentStatus}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Search..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => handleExport('pdf')}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          </div>
        </div>
        )}

        {/* Expenses Table */}
        {activeTab === 'expenses' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No expenses found</p>
                <button
                  onClick={openAddModal}
                  className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Add your first expense
                </button>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {expenses.map((expense) => (
                    <tr key={expense.id || expense._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {expense.date ? new Date(expense.date).toLocaleDateString() : 'Invalid Date'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {expense.description}
                        {expense.budgetId && (() => {
                          const linkedBudget = budgets.find(b => b.id === expense.budgetId || b._id === expense.budgetId);
                          return linkedBudget ? (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                <Target className="w-3 h-3 mr-1" />
                                {linkedBudget.name}
                              </span>
                            </div>
                          ) : null;
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {expense.vendor?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(expense.amountInINR || expense.amount)}
                        {expense.currency && expense.currency !== 'INR' && (
                          <span className="text-xs text-gray-500 ml-1">
                            ({expense.currency} {expense.amount})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          expense.paymentStatus === 'Paid'
                            ? 'bg-green-100 text-green-800'
                            : expense.paymentStatus === 'Pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {expense.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(expense)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id || expense._id)}
                            className="text-red-600 hover:text-red-900"
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
            )}
          </div>
        </div>
        )}

        {/* Budget Tab */}
        {activeTab === 'budget' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Budget Management</h2>
              <p className="text-gray-600 mb-6">Set and track budgets for different categories and departments.</p>
              
              {/* Budget Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Budget</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(budgets.reduce((sum, b) => sum + (b.amount || 0), 0))}
                  </p>
                </div>
                <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <p className="text-sm text-gray-600">Spent</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {formatCurrency(budgets.reduce((sum, b) => sum + (b.spent || 0), 0))}
                  </p>
                </div>
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                  <p className="text-sm text-gray-600">Remaining</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {formatCurrency(budgets.reduce((sum, b) => sum + ((b.amount || 0) - (b.spent || 0)), 0))}
                  </p>
                </div>
              </div>

              {/* Budget List */}
              {budgetLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
              ) : budgets.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-2">No budgets created yet</p>
                  <p className="text-sm text-gray-500 mb-4">Create your first budget to start tracking spending limits</p>
                  <button
                    onClick={openAddBudgetModal}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    <Plus className="w-4 h-4" />
                    Create Budget
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {budgets.map((budget) => {
                    const spent = budget.spent || 0;
                    const remaining = budget.amount - spent;
                    const percentage = (spent / budget.amount) * 100;
                    const isOverBudget = percentage > 100;
                    const isNearThreshold = percentage >= budget.alertThreshold && !isOverBudget;

                    return (
                      <div key={budget._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{budget.name}</h3>
                              {budget.isActive ? (
                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                  Active
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                                  Inactive
                                </span>
                              )}
                              {isOverBudget && (
                                <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                                  Over Budget
                                </span>
                              )}
                              {isNearThreshold && (
                                <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                                  Near Limit
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <FileText className="w-4 h-4" />
                                {budget.category}
                              </span>
                              <span>•</span>
                              <span>{budget.department}</span>
                              <span>•</span>
                              <span>{budget.period}</span>
                              <span>•</span>
                              <span>
                                {new Date(budget.startDate).toLocaleDateString()} - {new Date(budget.endDate).toLocaleDateString()}
                              </span>
                            </div>
                            {budget.description && (
                              <p className="text-sm text-gray-600 mt-2">{budget.description}</p>
                            )}
                            {/* Show linked expenses count */}
                            {(() => {
                              const linkedExpenses = expenses.filter(e => e.budgetId === budget.id || e.budgetId === budget._id);
                              const linkedAmount = linkedExpenses.reduce((sum, e) => sum + (e.amountInINR || e.amount || 0), 0);
                              return linkedExpenses.length > 0 ? (
                                <div className="mt-2 flex items-center gap-2 text-sm">
                                  <span className="text-indigo-600 font-medium">{linkedExpenses.length} expense(s) linked</span>
                                  <span className="text-gray-400">|</span>
                                  <span className="text-gray-600">Total: {formatCurrency(linkedAmount)}</span>
                                </div>
                              ) : null;
                            })()}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => openEditBudgetModal(budget)}
                              className="text-indigo-600 hover:text-indigo-900 p-2"
                              title="Edit Budget"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteBudget(budget._id)}
                              className="text-red-600 hover:text-red-900 p-2"
                              title="Delete Budget"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Budget Progress */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Budget Progress</span>
                            <span className={`font-medium ${isOverBudget ? 'text-red-600' : isNearThreshold ? 'text-yellow-600' : 'text-gray-900'}`}>
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full transition-all ${
                                isOverBudget ? 'bg-red-600' : isNearThreshold ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-sm">
                            <div>
                              <span className="text-gray-600">Spent: </span>
                              <span className="font-medium text-gray-900">{formatCurrency(spent)}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Budget: </span>
                              <span className="font-medium text-gray-900">{formatCurrency(budget.amount)}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Remaining: </span>
                              <span className={`font-medium ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(Math.abs(remaining))}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            {transactionLoading ? (
              <div className="bg-white rounded-lg shadow p-8">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              </div>
            ) : (
              <>
                {/* Transaction Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Transactions</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{transactions.length}</p>
                      </div>
                      <CreditCard className="w-8 h-8 text-gray-400" />
                    </div>
                  </div>
                  <div className="bg-white border border-green-200 rounded-lg p-4 bg-green-50 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Income</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">
                          {formatCurrency(transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + (t.totalAmount || t.amount || 0), 0))}
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-400" />
                    </div>
                  </div>
                  <div className="bg-white border border-red-200 rounded-lg p-4 bg-red-50 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Expenses</p>
                        <p className="text-2xl font-bold text-red-600 mt-1">
                          {formatCurrency(transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + (t.totalAmount || t.amount || 0), 0))}
                        </p>
                      </div>
                      <DollarSign className="w-8 h-8 text-red-400" />
                    </div>
                  </div>
                  <div className="bg-white border border-blue-200 rounded-lg p-4 bg-blue-50 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Net Cash Flow</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">
                          {formatCurrency(
                            transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + (t.totalAmount || t.amount || 0), 0) -
                            transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + (t.totalAmount || t.amount || 0), 0)
                          )}
                        </p>
                      </div>
                      <Wallet className="w-8 h-8 text-blue-400" />
                    </div>
                  </div>
                </div>

                {/* Transaction List */}
                {transactions.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-8">
                    <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                      <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-900 font-semibold mb-2">No transactions recorded</p>
                      <p className="text-sm text-gray-500 mb-4">Add your first transaction to track cash flow</p>
                      <button
                        onClick={openAddTransactionModal}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Transaction
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Category
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Party
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Payment
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {transactions.map((transaction) => (
                            <tr key={transaction._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {new Date(transaction.transactionDate).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {transaction.description}
                                </div>
                                {transaction.referenceNumber && (
                                  <div className="text-xs text-gray-500">
                                    Ref: {transaction.referenceNumber}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  transaction.type === 'Income' ? 'bg-green-100 text-green-800' :
                                  transaction.type === 'Expense' ? 'bg-red-100 text-red-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {transaction.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-700">{transaction.category}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {transaction.partyName ? (
                                  <div>
                                    <div className="text-sm text-gray-900">{transaction.partyName}</div>
                                    <div className="text-xs text-gray-500">{transaction.partyType}</div>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-700">{transaction.paymentMethod}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`text-sm font-semibold ${
                                  transaction.type === 'Income' ? 'text-green-600' :
                                  transaction.type === 'Expense' ? 'text-red-600' :
                                  'text-blue-600'
                                }`}>
                                  {transaction.type === 'Income' ? '+' : transaction.type === 'Expense' ? '-' : ''}
                                  {formatCurrency(transaction.totalAmount || transaction.amount)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  transaction.paymentStatus === 'Completed' ? 'bg-green-100 text-green-800' :
                                  transaction.paymentStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                  transaction.paymentStatus === 'Failed' ? 'bg-red-100 text-red-800' :
                                  transaction.paymentStatus === 'Processing' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {transaction.paymentStatus}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={() => openEditTransactionModal(transaction)}
                                  className="text-indigo-600 hover:text-indigo-900 mr-3"
                                  title="Edit Transaction"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTransaction(transaction._id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete Transaction"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Transaction Summary */}
                    <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Total Income: </span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + (t.totalAmount || t.amount || 0), 0))}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Expenses: </span>
                          <span className="font-semibold text-red-600">
                            {formatCurrency(transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + (t.totalAmount || t.amount || 0), 0))}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Net Cash Flow: </span>
                          <span className="font-semibold text-blue-600">
                            {formatCurrency(
                              transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + (t.totalAmount || t.amount || 0), 0) -
                              transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + (t.totalAmount || t.amount || 0), 0)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Investors Tab */}
        {activeTab === 'investors' && (
          <div className="space-y-6">
            {investorLoading ? (
              <div className="bg-white rounded-lg shadow p-8">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
              </div>
            ) : (
              <>
                {/* Investor Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Investors</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{investors.length}</p>
                      </div>
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                  </div>
                  <div className="bg-white border border-green-200 rounded-lg p-4 bg-green-50 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Investment</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">
                          {formatCurrency(investors.reduce((sum, inv) => sum + (inv.investmentAmount || 0), 0))}
                        </p>
                      </div>
                      <DollarSign className="w-8 h-8 text-green-400" />
                    </div>
                  </div>
                  <div className="bg-white border border-purple-200 rounded-lg p-4 bg-purple-50 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Active Investors</p>
                        <p className="text-2xl font-bold text-purple-600 mt-1">
                          {investors.filter(inv => inv.status === 'Active').length}
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-purple-400" />
                    </div>
                  </div>
                  <div className="bg-white border border-blue-200 rounded-lg p-4 bg-blue-50 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Equity</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">
                          {investors.reduce((sum, inv) => sum + (inv.equityPercentage || 0), 0).toFixed(2)}%
                        </p>
                      </div>
                      <PieChart className="w-8 h-8 text-blue-400" />
                    </div>
                  </div>
                </div>

                {/* Investor List */}
                {investors.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-8">
                    <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-900 font-semibold mb-2">No investors added</p>
                      <p className="text-sm text-gray-500 mb-4">Add investor details to manage stakeholder information</p>
                      <button
                        onClick={openAddInvestorModal}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Investor
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Investor
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Investment
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Equity
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Investment Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {investors.map((investor) => (
                            <tr key={investor._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{investor.name}</div>
                                  <div className="text-sm text-gray-500">{investor.email}</div>
                                  {investor.company && (
                                    <div className="text-xs text-gray-400">{investor.company}</div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                  {investor.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-gray-900">
                                  {formatCurrency(investor.investmentAmount)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(investor.investmentDate).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-purple-600">
                                  {investor.equityPercentage ? `${investor.equityPercentage}%` : 'N/A'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-700">{investor.investmentType}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  investor.status === 'Active' ? 'bg-green-100 text-green-800' :
                                  investor.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                  investor.status === 'Exited' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {investor.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={() => openEditInvestorModal(investor)}
                                  className="text-indigo-600 hover:text-indigo-900 mr-3"
                                  title="Edit Investor"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteInvestor(investor._id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete Investor"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Investor Details Summary */}
                    <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Total Investment: </span>
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(investors.reduce((sum, inv) => sum + (inv.investmentAmount || 0), 0))}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Equity Distributed: </span>
                          <span className="font-semibold text-purple-600">
                            {investors.reduce((sum, inv) => sum + (inv.equityPercentage || 0), 0).toFixed(2)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">With Board Seats: </span>
                          <span className="font-semibold text-blue-600">
                            {investors.filter(inv => inv.hasBoardSeat || inv.boardSeat).length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <ExpenseFormModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedExpense(null);
          }}
          expense={selectedExpense}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Budget Modal */}
      {showBudgetModal && (
        <BudgetFormModal
          isOpen={showBudgetModal}
          onClose={() => {
            setShowBudgetModal(false);
            setSelectedBudget(null);
          }}
          budget={selectedBudget}
          onSuccess={handleBudgetModalSuccess}
        />
      )}

      {/* Investor Modal */}
      {showInvestorModal && (
        <InvestorFormModal
          isOpen={showInvestorModal}
          onClose={() => {
            setShowInvestorModal(false);
            setSelectedInvestor(null);
          }}
          investor={selectedInvestor}
          onSuccess={handleInvestorModalSuccess}
        />
      )}

      {/* Transaction Modal */}
      {showTransactionModal && (
        <TransactionFormModal
          isOpen={showTransactionModal}
          onClose={() => {
            setShowTransactionModal(false);
            setSelectedTransaction(null);
          }}
          transaction={selectedTransaction}
          onSuccess={handleTransactionModalSuccess}
        />
      )}
    </MainLayout>
  );
};

export default CompanyExpensesDashboard;
