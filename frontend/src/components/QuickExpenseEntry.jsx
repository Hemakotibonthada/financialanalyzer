import React, { useState, useEffect } from 'react';
import { Plus, X, TrendingDown, Calendar, DollarSign, Search, Download, Clock, Star } from 'lucide-react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

const QuickExpenseEntry = ({ onExpenseAdded }) => {
  const notification = useNotification();
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

  const categories = [
    { value: 'food_dining', label: 'Food & Dining', icon: '🍽️' },
    { value: 'groceries', label: 'Groceries', icon: '🛒' },
    { value: 'transportation', label: 'Transportation', icon: '🚗' },
    { value: 'fuel', label: 'Fuel', icon: '⛽' },
    { value: 'utilities', label: 'Utilities', icon: '💡' },
    { value: 'entertainment', label: 'Entertainment', icon: '🎬' },
    { value: 'shopping', label: 'Shopping', icon: '🛍️' },
    { value: 'healthcare', label: 'Healthcare', icon: '⚕️' },
    { value: 'education', label: 'Education', icon: '📚' },
    { value: 'travel', label: 'Travel', icon: '✈️' },
    { value: 'subscriptions', label: 'Subscriptions', icon: '📱' },
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

  const loadCurrencies = async () => {
    try {
      const response = await api.get('/financial/currencies');
      if (response.data.success) {
        setCurrencies(response.data.currencies);
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
        setAllExpenses(response.data.data.expenses || []);
      }
    } catch (error) {
      console.error('Error loading expense history:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await api.get('/financial/expense-templates');
      if (response.data.success) {
        setTemplates(response.data.data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
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
        const currencySymbol = currencies.find(c => c.code === expense.currency)?.symbol || expense.currency;
        
        // Show success notification
        notification.success(
          `${currencySymbol}${parseFloat(expense.amount).toFixed(2)} expense recorded`,
          '✓ Expense Added'
        );

        // Check for budget alerts
        if (response.data.data?.budgetAlert) {
          const alert = response.data.data.budgetAlert;
          const categoryName = categories.find(c => c.value === alert.category)?.label || alert.category;
          
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
    if (!window.confirm('Delete this expense?')) {
      return;
    }

    try {
      const response = await api.delete(`/financial/quick-expense/${expenseId}`);
      
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Expense deleted' });
        notification.success('Expense removed from your records', 'Deleted');
        
        await loadTodayExpenses();
        
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
    const currency = currencies.find(c => c.code === currencyCode);
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
        category: expense.category
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

  const handleUseTemplate = (template) => {
    setExpense({
      description: template.description,
      amount: template.amount.toString(),
      category: template.category,
      date: new Date().toISOString().split('T')[0]
    });
    setActiveTab('add');
    notification.info(`Template "${template.description}" loaded`, 'Template Applied');
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Delete this template?')) {
      return;
    }

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
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
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
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : 'bg-red-100 text-red-700 border border-red-200'
                }`}>
                  {message.text}
                </div>
              )}

              {/* Add Expense Tab */}
              {activeTab === 'add' && (
                <div>
                  {/* Today's Summary */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6 border border-blue-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-gray-700">
                        <Calendar className="w-5 h-5" />
                        <span className="font-medium">Today's Total</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(todayTotal)}
                      </div>
                    </div>
                    {todayExpenses.length > 0 && (
                      <div className="mt-2 text-sm text-gray-600">
                        {todayExpenses.length} expense{todayExpenses.length !== 1 ? 's' : ''} recorded
                      </div>
                    )}
                  </div>

                  {/* Expense Form */}
                  <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        What did you spend on? *
                      </label>
                      <input
                        type="text"
                        value={expense.description}
                        onChange={(e) => setExpense({ ...expense, description: e.target.value })}
                    placeholder="e.g., Banana, Coffee, Taxi fare..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <input
                        type="number"
                        value={expense.amount}
                        onChange={(e) => setExpense({ ...expense, amount: e.target.value })}
                        placeholder="100"
                        step="0.01"
                        min="0"
                        className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Currency
                    </label>
                    <select
                      value={expense.currency}
                      onChange={(e) => setExpense({ ...expense, currency: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={expense.date}
                    onChange={(e) => setExpense({ ...expense, date: e.target.value })}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setExpense({ ...expense, category: cat.value })}
                        className={`p-3 border rounded-lg text-sm flex flex-col items-center justify-center transition-all ${
                          expense.category === cat.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                            : 'border-gray-300 hover:border-blue-300 text-gray-700'
                        }`}
                      >
                        <span className="text-2xl mb-1">{cat.icon}</span>
                        <span className="text-xs">{cat.label}</span>
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
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Today's Expenses</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {todayExpenses.map((exp) => (
                          <div
                            key={exp._id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">
                                  {categories.find(c => c.value === exp.category)?.icon || '💰'}
                                </span>
                                <span className="font-medium text-gray-900">{exp.description}</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {categories.find(c => c.value === exp.category)?.label || 'Other'} • 
                                {new Date(exp.date).toLocaleTimeString('en-IN', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="font-semibold text-gray-900">
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
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Search expenses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-2">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                    ))}
                  </select>

                  <select
                    value={filterDateRange}
                    onChange={(e) => setFilterDateRange(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="3months">Last 3 Months</option>
                    <option value="year">This Year</option>
                    <option value="all">All Time</option>
                  </select>
                </div>

                <button
                  onClick={handleExportExpenses}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Download className="w-4 h-4" />
                  Export to CSV
                </button>
              </div>

              {/* Expense History List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {allExpenses.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No expenses found</p>
                  </div>
                ) : (
                  allExpenses.map((exp) => (
                    <div
                      key={exp._id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">
                            {categories.find(c => c.value === exp.category)?.icon || '💰'}
                          </span>
                          <span className="font-medium text-gray-900">{exp.description}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {categories.find(c => c.value === exp.category)?.label || 'Other'} • 
                          {new Date(exp.date).toLocaleDateString('en-IN', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="font-semibold text-gray-900">
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
                  ))
                )}
              </div>

              {allExpenses.length > 0 && (
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Total ({allExpenses.length} expenses)</span>
                    <span className="font-bold text-lg text-gray-900">
                      {formatCurrency(allExpenses.reduce((sum, exp) => sum + exp.amount, 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <p className="font-medium mb-1">💡 Tip: Save Templates</p>
                <p>Add an expense in the "Add" tab, then save it as a template for quick re-use!</p>
              </div>

              {templates.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No templates saved yet</p>
                  <p className="text-sm mt-1">Create recurring expenses faster with templates</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {templates.map((template) => (
                    <div
                      key={template._id}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">
                            {categories.find(c => c.value === template.category)?.icon || '💰'}
                          </span>
                          <div>
                            <div className="font-medium text-gray-900">{template.description}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              {categories.find(c => c.value === template.category)?.label || 'Other'}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-purple-700">
                          {formatCurrency(template.amount)}
                        </span>
                        <button
                          onClick={() => handleUseTemplate(template)}
                          className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                        >
                          Use
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template._id)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete template"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )}
  </>
);
};

export default QuickExpenseEntry;
