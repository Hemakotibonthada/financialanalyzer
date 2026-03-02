import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, TrendingDown, Calendar, DollarSign, Search, Download, Clock, Star, Edit2, BarChart2, ArrowUpRight, ArrowDownRight, Repeat, Trash2, Check, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { useConfirm } from '../hooks/useConfirm';

const QuickExpenseEntry = ({ onExpenseAdded }) => {
  const notification = useNotification();
  const { confirm, ConfirmDialog } = useConfirm();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('add'); // 'add', 'history', 'templates'
  const [expense, setExpense] = useState({
    description: '',
    amount: '',
    category: 'other',
    currency: 'INR',
    date: new Date().toISOString().split('T')[0]
  });
  const [todayExpenses, setTodayExpenses] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [expenseSummary, setExpenseSummary] = useState(null);
  const [todayTotal, setTodayTotal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [currencies, setCurrencies] = useState([
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' }
  ]);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('week'); // 'week', 'month', 'year', 'custom'
  const [templates, setTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editTemplateData, setEditTemplateData] = useState({ description: '', amount: '', category: '', currency: 'INR' });
  const [showCategoryBreakdown, setShowCategoryBreakdown] = useState(false);
  const [sortBy, setSortBy] = useState('date'); // 'date', 'amount', 'category'
  const [sortDir, setSortDir] = useState('desc'); // 'asc', 'desc'

  const categories = [
    { value: 'food_dining', label: 'Food & Dining', icon: '🍽️' },
    { value: 'groceries', label: 'Groceries', icon: '🛒' },
    { value: 'transportation', label: 'Transportation', icon: '🚗' },
    { value: 'fuel', label: 'Fuel', icon: '⛽' },
    { value: 'rent_mortgage', label: 'Rent/Mortgage', icon: '🏠' },
    { value: 'utilities', label: 'Utilities', icon: '💡' },
    { value: 'entertainment', label: 'Entertainment', icon: '🎬' },
    { value: 'shopping', label: 'Shopping', icon: '🛍️' },
    { value: 'healthcare', label: 'Healthcare', icon: '⚕️' },
    { value: 'insurance', label: 'Insurance', icon: '🛡️' },
    { value: 'education', label: 'Education', icon: '📚' },
    { value: 'travel', label: 'Travel', icon: '✈️' },
    { value: 'subscriptions', label: 'Subscriptions', icon: '📱' },
    { value: 'investment', label: 'Investment', icon: '📈' },
    { value: 'emi', label: 'EMI', icon: '💳' },
    { value: 'loan', label: 'Loan', icon: '🏦' },
    { value: 'personal_care', label: 'Personal Care', icon: '💆' },
    { value: 'gifts_donations', label: 'Gifts & Donations', icon: '🎁' },
    { value: 'pets', label: 'Pets', icon: '🐾' },
    { value: 'childcare', label: 'Childcare', icon: '👶' },
    { value: 'home_maintenance', label: 'Home Maintenance', icon: '🔧' },
    { value: 'clothing', label: 'Clothing', icon: '👕' },
    { value: 'fitness', label: 'Fitness', icon: '💪' },
    { value: 'taxes', label: 'Taxes', icon: '📋' },
    { value: 'business', label: 'Business', icon: '💼' },
    { value: 'other', label: 'Other', icon: '💰' }
  ];

  useEffect(() => {
    if (isOpen) {
      loadTodayExpenses();
      loadCurrencies();
      if (activeTab === 'history') {
        loadAllExpenses();
      } else if (activeTab === 'templates') {
        loadTemplates();
      }
    }
  }, [isOpen, activeTab]);

  // Auto-search when filters change
  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      const debounceTimer = setTimeout(() => {
        loadAllExpenses();
      }, 500); // Wait 500ms after user stops typing
      
      return () => clearTimeout(debounceTimer);
    }
  }, [searchQuery, filterCategory, filterDateRange, activeTab, isOpen]);

  const loadCurrencies = async () => {
    try {
      const response = await api.get('/financial/currencies');
      if (response.data.success && Array.isArray(response.data.data)) {
        setCurrencies(response.data.data);
      }
    } catch (error) {
      console.error('Error loading currencies:', error);
      // Keep default currencies if API fails
    }
  };

  const loadTodayExpenses = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get('/financial/quick-expenses', {
        params: { date: today }
      });
      
      if (response.data.success) {
        setTodayExpenses(response.data.data.expenses || []);
        setTodayTotal(response.data.data.total || 0);
      }
    } catch (error) {
      console.error('Error loading today expenses:', error);
    }
  };

  const loadAllExpenses = async () => {
    try {
      const params = {
        range: filterDateRange
      };
      if (filterCategory !== 'all') {
        params.category = filterCategory;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await api.get('/financial/expense-history', { params });
      
      if (response.data.success) {
        setAllExpenses(response.data.expenses || []);
        setExpenseSummary(response.data.summary || null);
      }
    } catch (error) {
      console.error('Error loading expense history:', error);
      setAllExpenses([]);
      setExpenseSummary(null);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await api.get('/financial/expense-templates');
      if (response.data.success) {
        // Backend returns templates directly in response.data.templates
        setTemplates(response.data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!expense.description.trim() || !expense.amount || parseFloat(expense.amount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter valid description and amount' });
      notification.error('Please enter valid description and amount', 'Invalid Input');
      return;
    }

    try {
      setSaving(true);
      setMessage({ type: '', text: '' });

      const response = await api.post('/financial/quick-expense', {
        description: expense.description.trim(),
        amount: parseFloat(expense.amount),
        category: expense.category,
        currency: expense.currency,
        date: expense.date
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: '✓ Expense added successfully!' });
        
        // Get currency symbol
        const currencySymbol = (Array.isArray(currencies) && currencies.length > 0) ? 
          (currencies.find(c => c.code === expense.currency)?.symbol || expense.currency) : 
          expense.currency;
        
        // Show success notification
        notification.success(
          `${currencySymbol}${parseFloat(expense.amount).toFixed(2)} expense recorded`,
          '✓ Expense Added'
        );

        // Check for budget alerts
        if (response.data.data?.budgetAlert) {
          const alert = response.data.data.budgetAlert;
          const categoryName = Array.isArray(categories) ? 
            categories.find(c => c.value === alert.category)?.label || alert.category : 
            alert.category;
          
          if (alert.type === 'exceeded') {
            notification.budgetAlert(
              `You've spent ₹${alert.spent.toFixed(2)} of ₹${alert.budget} (${alert.percentUsed}%) in ${categoryName} this month!`,
              '⚠️ Budget Exceeded!',
              { duration: 8000 }
            );
          } else if (alert.type === 'warning') {
            notification.warning(
              `You've used ${alert.percentUsed}% of your ${categoryName} budget (₹${alert.spent.toFixed(2)} of ₹${alert.budget})`,
              '⚠️ Budget Alert',
              { duration: 6000 }
            );
          }
        }
        
        // Reset form
        setExpense({
          description: '',
          amount: '',
          category: 'other',
          currency: expense.currency, // Keep selected currency
          date: new Date().toISOString().split('T')[0]
        });

        // Reload today's expenses
        await loadTodayExpenses();

        // Notify parent component
        if (onExpenseAdded) {
          onExpenseAdded();
        }

        // Clear success message after 2 seconds
        setTimeout(() => {
          setMessage({ type: '', text: '' });
        }, 2000);
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      const errorMsg = error.response?.data?.message || 'Failed to add expense';
      setMessage({ 
        type: 'error', 
        text: errorMsg
      });
      notification.error(errorMsg, 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    const confirmed = await confirm({
      title: 'Delete Expense',
      message: 'Are you sure you want to delete this expense? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger'
    });

    if (!confirmed) return;

    try {
      const response = await api.delete(`/financial/quick-expense/${expenseId}`);
      
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Expense deleted' });
        notification.success('Expense removed from your records', 'Deleted');
        
        // Reload data based on active tab
        await loadTodayExpenses();
        if (activeTab === 'history') {
          await loadAllExpenses();
        }
        
        if (onExpenseAdded) {
          onExpenseAdded();
        }

        setTimeout(() => {
          setMessage({ type: '', text: '' });
        }, 2000);
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      const errorMsg = error.response?.data?.message || 'Failed to delete expense';
      setMessage({ 
        type: 'error', 
        text: errorMsg
      });
      notification.error(errorMsg, 'Error');
    }
  };

  const formatCurrency = (amount, currencyCode = 'INR') => {
    const currency = Array.isArray(currencies) ? currencies.find(c => c.code === currencyCode) : null;
    const symbol = currency?.symbol || currencyCode;
    
    return `${symbol}${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  };

  const handleSaveAsTemplate = async () => {
    if (!expense.description.trim() || !expense.amount) {
      setMessage({ type: 'error', text: 'Please fill description and amount to save template' });
      notification.warning('Please fill description and amount to save template', 'Missing Info');
      return;
    }

    try {
      const response = await api.post('/financial/expense-template', {
        description: expense.description.trim(),
        amount: parseFloat(expense.amount),
        category: expense.category,
        currency: expense.currency || 'INR'
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Template saved!' });
        notification.success('Template saved for quick re-use', '⭐ Template Created');
        await loadTemplates();
        setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      const errorMsg = 'Failed to save template';
      setMessage({ type: 'error', text: errorMsg });
      notification.error(errorMsg, 'Error');
    }
  };

  const handleUseTemplate = async (template) => {
    setExpense({
      description: template.description,
      amount: template.amount.toString(),
      category: template.category,
      currency: template.currency || 'INR',
      date: new Date().toISOString().split('T')[0]
    });
    setActiveTab('add');
    notification.info(`Template "${template.description}" loaded`, 'Template Applied');

    // Track usage in background
    try {
      await api.post(`/financial/expense-template/${template._id}/use`);
      // Update local state
      setTemplates(prev => prev.map(t => 
        t._id === template._id 
          ? { ...t, usageCount: (t.usageCount || 0) + 1, lastUsedAt: new Date().toISOString() }
          : t
      ));
    } catch (err) {
      // Non-critical, ignore
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    const confirmed = await confirm({
      title: 'Delete Template',
      message: 'Are you sure you want to delete this template? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger'
    });

    if (!confirmed) return;

    try {
      const response = await api.delete(`/financial/expense-template/${templateId}`);
      if (response.data.success) {
        await loadTemplates();
        setMessage({ type: 'success', text: 'Template deleted' });
        notification.success('Template removed', 'Deleted');
        setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      const errorMsg = 'Failed to delete template';
      setMessage({ type: 'error', text: errorMsg });
      notification.error(errorMsg, 'Error');
    }
  };

  const handleExportExpenses = async () => {
    try {
      notification.info('Preparing your expense data...', 'Exporting');
      
      const params = {
        range: filterDateRange,
        format: 'csv'
      };
      if (filterCategory !== 'all') {
        params.category = filterCategory;
      }

      const response = await api.get('/financial/export-expenses', { 
        params,
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `expenses_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setMessage({ type: 'success', text: 'Expenses exported!' });
      notification.success('CSV file downloaded successfully', '📥 Export Complete');
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
    } catch (error) {
      console.error('Error exporting expenses:', error);
      const errorMsg = 'Failed to export expenses';
      setMessage({ type: 'error', text: errorMsg });
      notification.error(errorMsg, 'Export Failed');
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;
    try {
      const response = await api.put(`/financial/expense-template/${editingTemplate._id}`, editTemplateData);
      if (response.data.success) {
        setEditingTemplate(null);
        await loadTemplates();
        setMessage({ type: 'success', text: 'Template updated!' });
        notification.success('Template updated successfully', 'Updated');
        setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      }
    } catch (error) {
      console.error('Error updating template:', error);
      setMessage({ type: 'error', text: 'Failed to update template' });
      notification.error('Failed to update template', 'Error');
    }
  };

  // Sort expenses
  const sortedExpenses = useMemo(() => {
    const sorted = [...allExpenses];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') {
        cmp = new Date(a.date) - new Date(b.date);
      } else if (sortBy === 'amount') {
        cmp = a.amount - b.amount;
      } else if (sortBy === 'category') {
        cmp = (a.category || '').localeCompare(b.category || '');
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }, [allExpenses, sortBy, sortDir]);

  // Group expenses by date for daily display
  const groupedByDate = useMemo(() => {
    const groups = {};
    sortedExpenses.forEach(exp => {
      const day = new Date(exp.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      if (!groups[day]) groups[day] = { expenses: [], total: 0 };
      groups[day].expenses.push(exp);
      groups[day].total += exp.amount;
    });
    return groups;
  }, [sortedExpenses]);

  // Top category for period
  const topCategory = useMemo(() => {
    if (!expenseSummary?.categoryTotals) return null;
    const entries = Object.entries(expenseSummary.categoryTotals);
    if (entries.length === 0) return null;
    const [cat, data] = entries.reduce((max, entry) => entry[1].total > max[1].total ? entry : max);
    const catInfo = categories.find(c => c.value === cat);
    return { name: catInfo?.label || cat, icon: catInfo?.icon || '💰', ...data };
  }, [expenseSummary]);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-all hover:scale-110 z-40"
        title="Add Quick Expense"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl dark:shadow-slate-900/30 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold flex items-center">
                  <TrendingDown className="w-5 h-5 mr-2" />
                  Expense Tracker
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Tabs */}
              <div className="flex space-x-4 mt-4">
                <button
                  onClick={() => setActiveTab('add')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'add'
                      ? 'bg-white text-blue-600 font-medium'
                      : 'text-white hover:bg-blue-700'
                  }`}
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Add Expense
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'history'
                      ? 'bg-white text-blue-600 font-medium'
                      : 'text-white hover:bg-blue-700'
                  }`}
                >
                  <Clock className="w-4 h-4 inline mr-1" />
                  History
                </button>
                <button
                  onClick={() => setActiveTab('templates')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'templates'
                      ? 'bg-white text-blue-600 font-medium'
                      : 'text-white hover:bg-blue-700'
                  }`}
                >
                  <Star className="w-4 h-4 inline mr-1" />
                  Templates
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Message */}
              {message.text && (
                <div className={`mb-4 p-3 rounded-lg ${
                  message.type === 'success' 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700' 
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-700'
                }`}>
                  {message.text}
                </div>
              )}

              {/* Add Expense Tab */}
              {activeTab === 'add' && (
                <div>
                  {/* Today's Summary */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 mb-6 border border-blue-100 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-gray-700 dark:text-slate-300">
                        <Calendar className="w-5 h-5" />
                        <span className="font-medium">Today's Total</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(todayTotal)}
                      </div>
                    </div>
                    {todayExpenses.length > 0 && (
                      <div className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                        {todayExpenses.length} expense{todayExpenses.length !== 1 ? 's' : ''} recorded
                      </div>
                    )}
                  </div>

                  {/* Expense Form */}
                  <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        What did you spend on? *
                      </label>
                      <input
                        type="text"
                        value={expense.description}
                        onChange={(e) => setExpense({ ...expense, description: e.target.value })}
                    placeholder="e.g., Banana, Coffee, Taxi fare..."
                    className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                    required
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Amount *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 w-5 h-5 text-gray-400 dark:text-slate-500" />
                      <input
                        type="number"
                        value={expense.amount}
                        onChange={(e) => setExpense({ ...expense, amount: e.target.value })}
                        placeholder="100"
                        step="0.01"
                        min="0"
                        className="w-full pl-10 p-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Currency
                    </label>
                    <select
                      value={expense.currency}
                      onChange={(e) => setExpense({ ...expense, currency: e.target.value })}
                      className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                    >
                      {currencies.map(curr => (
                        <option key={curr.code} value={curr.code}>
                          {curr.symbol} {curr.code}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={expense.date}
                    onChange={(e) => setExpense({ ...expense, date: e.target.value })}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Category
                  </label>
                  <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {Array.isArray(categories) && categories.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setExpense({ ...expense, category: cat.value })}
                        className={`p-2 border rounded-lg text-xs flex flex-col items-center justify-center transition-all ${
                          expense.category === cat.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium ring-2 ring-blue-200'
                            : 'border-gray-300 dark:border-slate-600 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="text-xl mb-1">{cat.icon}</span>
                        <span className="text-[10px] leading-tight text-center">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {saving ? 'Adding...' : 'Add Expense'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAsTemplate}
                    disabled={!expense.description || !expense.amount}
                    className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Save as template"
                  >
                    <Star className="w-5 h-5" />
                  </button>
                </div>
                  </form>

                  {/* Today's Expenses List */}
                  {todayExpenses.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Today's Expenses</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {todayExpenses.map((exp) => (
                          <div
                            key={exp._id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">
                                  {Array.isArray(categories) ? categories.find(c => c.value === exp.category)?.icon || '💰' : '💰'}
                                </span>
                                <span className="font-medium text-gray-900 dark:text-white">{exp.description}</span>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                                {Array.isArray(categories) ? categories.find(c => c.value === exp.category)?.label || 'Other' : 'Other'} • 
                                {new Date(exp.date).toLocaleTimeString('en-IN', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(exp.amount)}
                              </span>
                              <button
                                onClick={() => handleDeleteExpense(exp._id)}
                                className="text-red-500 hover:text-red-700"
                                title="Delete expense"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  {/* Search and Filters */}
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Search expenses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all dark:bg-slate-700 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <div className="flex-1 min-w-[150px]">
                        <select
                          value={filterCategory}
                          onChange={(e) => setFilterCategory(e.target.value)}
                          className="w-full px-3 py-2.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white text-sm"
                        >
                          <option value="all">🔍 All Categories</option>
                          {Array.isArray(categories) && categories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1 min-w-[150px]">
                        <select
                          value={filterDateRange}
                          onChange={(e) => setFilterDateRange(e.target.value)}
                          className="w-full px-3 py-2.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white text-sm"
                        >
                          <option value="week">📅 This Week</option>
                          <option value="month">📅 This Month</option>
                          <option value="3months">📅 Last 3 Months</option>
                          <option value="year">📅 This Year</option>
                          <option value="all">📅 All Time</option>
                        </select>
                      </div>
                      <div className="flex-1 min-w-[100px]">
                        <select
                          value={`${sortBy}-${sortDir}`}
                          onChange={(e) => {
                            const [by, dir] = e.target.value.split('-');
                            setSortBy(by);
                            setSortDir(dir);
                          }}
                          className="w-full px-3 py-2.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white text-sm"
                        >
                          <option value="date-desc">Newest First</option>
                          <option value="date-asc">Oldest First</option>
                          <option value="amount-desc">Highest First</option>
                          <option value="amount-asc">Lowest First</option>
                          <option value="category-asc">Category A-Z</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={loadAllExpenses}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-md font-medium text-sm"
                      >
                        <Search className="w-4 h-4" />
                        Apply
                      </button>
                      <button
                        onClick={handleExportExpenses}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-md font-medium text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Export CSV
                      </button>
                    </div>
                  </div>

                  {/* Summary Insights Cards */}
                  {expenseSummary && allExpenses.length > 0 && (
                    <div className="space-y-3">
                      {/* Quick Stats */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 rounded-xl p-3 border border-blue-200 dark:border-blue-700">
                          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total Spent</div>
                          <div className="text-lg font-bold text-blue-800 dark:text-blue-300">
                            {formatCurrency(expenseSummary.grandTotal)}
                          </div>
                          <div className="text-xs text-blue-500 dark:text-blue-400">{expenseSummary.totalCount} txns</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 rounded-xl p-3 border border-purple-200 dark:border-purple-700">
                          <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">Avg/Txn</div>
                          <div className="text-lg font-bold text-purple-800 dark:text-purple-300">
                            {formatCurrency(expenseSummary.avgPerTransaction)}
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20 rounded-xl p-3 border border-orange-200 dark:border-orange-700">
                          <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">Top Category</div>
                          <div className="text-sm font-bold text-orange-800 dark:text-orange-300 truncate">
                            {topCategory ? `${topCategory.icon} ${topCategory.name}` : '—'}
                          </div>
                          {topCategory && (
                            <div className="text-xs text-orange-500 dark:text-orange-400">{formatCurrency(topCategory.total)}</div>
                          )}
                        </div>
                      </div>

                      {/* Category Breakdown Toggle */}
                      <button
                        onClick={() => setShowCategoryBreakdown(!showCategoryBreakdown)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all text-sm font-medium text-gray-700 dark:text-slate-300"
                      >
                        <span className="flex items-center gap-2">
                          <BarChart2 className="w-4 h-4" />
                          Category Breakdown
                        </span>
                        {showCategoryBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {showCategoryBreakdown && expenseSummary.categoryTotals && (
                        <div className="space-y-2 bg-gray-50 dark:bg-slate-700/30 rounded-xl p-3 border border-gray-200 dark:border-slate-600">
                          {Object.entries(expenseSummary.categoryTotals)
                            .sort(([, a], [, b]) => b.total - a.total)
                            .map(([cat, data]) => {
                              const catInfo = categories.find(c => c.value === cat);
                              const pct = expenseSummary.grandTotal > 0 ? (data.total / expenseSummary.grandTotal * 100) : 0;
                              return (
                                <div key={cat} className="flex items-center gap-2">
                                  <span className="text-lg w-8 text-center">{catInfo?.icon || '💰'}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between text-xs mb-0.5">
                                      <span className="font-medium text-gray-700 dark:text-slate-300 truncate">{catInfo?.label || cat}</span>
                                      <span className="text-gray-500 dark:text-slate-400 ml-2 whitespace-nowrap">{formatCurrency(data.total)} ({data.count})</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                                      <div
                                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                  <span className="text-xs font-medium text-gray-500 dark:text-slate-400 w-10 text-right">{pct.toFixed(0)}%</span>
                                </div>
                              );
                            })}
                        </div>
                      )}

                      {/* Highest Spending Day */}
                      {expenseSummary.highestSpendingDay && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm">
                          <ArrowUpRight className="w-4 h-4 text-red-500" />
                          <span className="text-red-700 dark:text-red-400">
                            Highest day: <strong>{new Date(expenseSummary.highestSpendingDay.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</strong> — {formatCurrency(expenseSummary.highestSpendingDay.total)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expense History List - Grouped by Date */}
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {allExpenses.length === 0 ? (
                      <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700 rounded-xl">
                        <div className="bg-white dark:bg-slate-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                          <Calendar className="w-10 h-10 text-gray-400 dark:text-slate-300" />
                        </div>
                        <p className="text-lg font-medium text-gray-700 dark:text-slate-300">No expenses found</p>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">Try adjusting your filters or add your first expense</p>
                      </div>
                    ) : (
                      Object.entries(groupedByDate).map(([date, { expenses: dayExps, total: dayTotal }]) => (
                        <div key={date}>
                          {/* Date Header */}
                          <div className="flex items-center justify-between mb-2 px-1">
                            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{date}</span>
                            <span className="text-xs font-bold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                              {formatCurrency(dayTotal)}
                            </span>
                          </div>
                          {/* Day Expenses */}
                          <div className="space-y-1.5">
                            {dayExps.map((exp) => (
                              <div
                                key={exp._id}
                                className="group flex items-center justify-between p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md transition-all duration-200"
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                                    {Array.isArray(categories) ? categories.find(c => c.value === exp.category)?.icon || '💰' : '💰'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 dark:text-white text-sm truncate">{exp.description}</div>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                                      <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-[10px] font-medium">
                                        {Array.isArray(categories) ? categories.find(c => c.value === exp.category)?.label || 'Other' : 'Other'}
                                      </span>
                                      <span>
                                        {new Date(exp.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                      {exp.source === 'quick_entry' && (
                                        <span className="text-[10px] text-green-500">⚡ Quick</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-900 dark:text-white text-sm">
                                    {formatCurrency(exp.amount, exp.currency)}
                                  </span>
                                  <button
                                    onClick={() => handleDeleteExpense(exp._id)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-all"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Summary Footer */}
                  {allExpenses.length > 0 && (
                    <div className="sticky bottom-0 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm text-gray-600 dark:text-slate-400 font-medium">Total</div>
                          <div className="text-xs text-gray-500 dark:text-slate-500">{allExpenses.length} transactions</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                            {formatCurrency(allExpenses.reduce((sum, exp) => sum + exp.amount, 0))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <style>{`
                    @keyframes slideIn {
                      from { opacity: 0; transform: translateY(10px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 10px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
                  `}</style>
                </div>
              )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">💡 Tip: Save Templates</p>
                <p>Fill an expense in the "Add" tab, then click the ⭐ button to save it as a reusable template!</p>
              </div>

              {templates.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                  <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No templates saved yet</p>
                  <p className="text-sm mt-1">Create recurring expenses faster with templates</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Templates sorted by most used */}
                  {[...templates]
                    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
                    .map((template) => (
                      <div key={template._id}>
                        {editingTemplate?._id === template._id ? (
                          /* Edit Mode */
                          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border-2 border-yellow-300 dark:border-yellow-700 space-y-3">
                            <div className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                              <Edit2 className="w-4 h-4" />
                              Editing Template
                            </div>
                            <input
                              type="text"
                              value={editTemplateData.description}
                              onChange={(e) => setEditTemplateData({ ...editTemplateData, description: e.target.value })}
                              className="w-full p-2.5 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
                              placeholder="Description"
                            />
                            <div className="grid grid-cols-3 gap-2">
                              <input
                                type="number"
                                value={editTemplateData.amount}
                                onChange={(e) => setEditTemplateData({ ...editTemplateData, amount: e.target.value })}
                                className="p-2.5 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
                                placeholder="Amount"
                                step="0.01"
                              />
                              <select
                                value={editTemplateData.category}
                                onChange={(e) => setEditTemplateData({ ...editTemplateData, category: e.target.value })}
                                className="p-2.5 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
                              >
                                {categories.map(cat => (
                                  <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                                ))}
                              </select>
                              <select
                                value={editTemplateData.currency}
                                onChange={(e) => setEditTemplateData({ ...editTemplateData, currency: e.target.value })}
                                className="p-2.5 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
                              >
                                {currencies.map(c => (
                                  <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleUpdateTemplate}
                                className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center justify-center gap-1"
                              >
                                <Check className="w-4 h-4" />
                                Save
                              </button>
                              <button
                                onClick={() => setEditingTemplate(null)}
                                className="flex-1 px-3 py-2 bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-400 dark:hover:bg-slate-500 text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Display Mode */
                          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-700 hover:shadow-md transition-shadow group">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-11 h-11 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                                {Array.isArray(categories) ? categories.find(c => c.value === template.category)?.icon || '💰' : '💰'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 dark:text-white text-sm truncate">{template.description}</div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                                  <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-[10px] font-medium">
                                    {Array.isArray(categories) ? categories.find(c => c.value === template.category)?.label || 'Other' : 'Other'}
                                  </span>
                                  {(template.usageCount || 0) > 0 && (
                                    <span className="flex items-center gap-0.5">
                                      <Repeat className="w-3 h-3" />
                                      Used {template.usageCount}x
                                    </span>
                                  )}
                                  {template.lastUsedAt && (
                                    <span>
                                      Last: {new Date(template.lastUsedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right mr-1">
                                <div className="font-bold text-purple-700 dark:text-purple-400 text-sm">
                                  {formatCurrency(template.amount, template.currency)}
                                </div>
                                <div className="text-[10px] text-gray-400">{template.currency || 'INR'}</div>
                              </div>
                              <button
                                onClick={() => handleUseTemplate(template)}
                                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs font-medium transition-all hover:scale-105"
                                title="Use this template"
                              >
                                Use
                              </button>
                              <button
                                onClick={() => {
                                  setEditingTemplate(template);
                                  setEditTemplateData({
                                    description: template.description,
                                    amount: template.amount.toString(),
                                    category: template.category,
                                    currency: template.currency || 'INR'
                                  });
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-blue-500 hover:text-white hover:bg-blue-500 rounded-lg transition-all"
                                title="Edit template"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTemplate(template._id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-all"
                                title="Delete template"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                  {/* Templates Summary */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-3 border border-purple-200 dark:border-purple-800">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-slate-400">{templates.length} template{templates.length !== 1 ? 's' : ''}</span>
                      <span className="text-gray-500 dark:text-slate-400">
                        Total uses: {templates.reduce((sum, t) => sum + (t.usageCount || 0), 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )}

  {/* Confirmation Dialog */}
  <ConfirmDialog />
  </>
);
};

export default QuickExpenseEntry;
