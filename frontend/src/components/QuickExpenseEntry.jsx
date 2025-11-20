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
        // Backend returns expenses directly in response.data.expenses
        setAllExpenses(response.data.expenses || []);
      }
    } catch (error) {
      console.error('Error loading expense history:', error);
      setAllExpenses([]);
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
    if (!window.confirm('Delete this expense?')) {
      return;
    }

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
                  <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {Array.isArray(categories) && categories.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setExpense({ ...expense, category: cat.value })}
                        className={`p-2 border rounded-lg text-xs flex flex-col items-center justify-center transition-all ${
                          expense.category === cat.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium ring-2 ring-blue-200'
                            : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50 text-gray-700'
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
                                  {Array.isArray(categories) ? categories.find(c => c.value === exp.category)?.icon || '💰' : '💰'}
                                </span>
                                <span className="font-medium text-gray-900">{exp.description}</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {Array.isArray(categories) ? categories.find(c => c.value === exp.category)?.label || 'Other' : 'Other'} • 
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
                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Search by description or category..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && loadAllExpenses()}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>

                    {/* Filter Pills */}
                    <div className="flex flex-wrap gap-2">
                      <div className="flex-1 min-w-[200px]">
                        <select
                          value={filterCategory}
                          onChange={(e) => setFilterCategory(e.target.value)}
                          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="all">🔍 All Categories</option>
                          {Array.isArray(categories) && categories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex-1 min-w-[200px]">
                        <select
                          value={filterDateRange}
                          onChange={(e) => setFilterDateRange(e.target.value)}
                          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="week">📅 This Week</option>
                          <option value="month">📅 This Month</option>
                          <option value="3months">📅 Last 3 Months</option>
                          <option value="year">📅 This Year</option>
                          <option value="all">📅 All Time</option>
                        </select>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={loadAllExpenses}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg font-medium"
                      >
                        <Search className="w-5 h-5" />
                        Apply Filters
                      </button>
                      <button
                        onClick={handleExportExpenses}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg font-medium"
                      >
                        <Download className="w-5 h-5" />
                        Export CSV
                      </button>
                    </div>
                  </div>

                  {/* Expense History List */}
                  <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                    {allExpenses.length === 0 ? (
                      <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
                        <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                          <Calendar className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-lg font-medium text-gray-700">No expenses found</p>
                        <p className="text-sm text-gray-500 mt-2">Try adjusting your filters or add your first expense</p>
                      </div>
                    ) : (
                      <>
                        {allExpenses.map((exp, index) => (
                          <div
                            key={exp._id}
                            className="group flex items-center justify-between p-4 bg-gradient-to-r from-white to-gray-50 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200"
                            style={{
                              animation: `slideIn 0.3s ease-out ${index * 0.05}s both`
                            }}
                          >
                            <div className="flex items-center space-x-3 flex-1">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center text-2xl shadow-sm">
                                {Array.isArray(categories) ? categories.find(c => c.value === exp.category)?.icon || '💰' : '💰'}
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                  {exp.description}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                                    {Array.isArray(categories) ? categories.find(c => c.value === exp.category)?.label || 'Other' : 'Other'}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(exp.date).toLocaleDateString('en-IN', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <div className="font-bold text-lg text-gray-900">
                                  {formatCurrency(exp.amount)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {exp.currency || 'INR'}
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteExpense(exp._id)}
                                className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-all"
                                title="Delete expense"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  {/* Summary Footer */}
                  {allExpenses.length > 0 && (
                    <div className="sticky bottom-0 pt-4 border-t-2 border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 shadow-md">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm text-gray-600 font-medium">Total Expenses</div>
                          <div className="text-xs text-gray-500 mt-0.5">{allExpenses.length} transactions</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                            {formatCurrency(allExpenses.reduce((sum, exp) => sum + exp.amount, 0))}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Avg: {formatCurrency(allExpenses.reduce((sum, exp) => sum + exp.amount, 0) / allExpenses.length)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <style jsx>{`
                    @keyframes slideIn {
                      from {
                        opacity: 0;
                        transform: translateY(10px);
                      }
                      to {
                        opacity: 1;
                        transform: translateY(0);
                      }
                    }
                    .custom-scrollbar::-webkit-scrollbar {
                      width: 8px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                      background: #f1f1f1;
                      border-radius: 10px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                      background: #888;
                      border-radius: 10px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                      background: #555;
                    }
                  `}</style>
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
                            {Array.isArray(categories) ? categories.find(c => c.value === template.category)?.icon || '💰' : '💰'}
                          </span>
                          <div>
                            <div className="font-medium text-gray-900">{template.description}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              {Array.isArray(categories) ? categories.find(c => c.value === template.category)?.label || 'Other' : 'Other'}
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
