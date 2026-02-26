import React, { useState, useEffect } from 'react';
import { Plus, X, TrendingUp, Calendar, DollarSign, Clock } from 'lucide-react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { useConfirm } from '../hooks/useConfirm';

const QuickIncomeEntry = ({ onIncomeAdded }) => {
  const notification = useNotification();
  const { confirm, ConfirmDialog } = useConfirm();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('add');
  const [income, setIncome] = useState({
    description: '',
    amount: '',
    source: 'salary',
    category: 'salary',
    date: new Date().toISOString().split('T')[0]
  });
  const [todayIncomes, setTodayIncomes] = useState([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [saving, setSaving] = useState(false);

  const sources = [
    { value: 'salary', label: 'Salary', icon: '💼' },
    { value: 'freelance', label: 'Freelance', icon: '💻' },
    { value: 'business', label: 'Business', icon: '🏢' },
    { value: 'investment', label: 'Investment', icon: '📈' },
    { value: 'rental', label: 'Rental', icon: '🏠' },
    { value: 'bonus', label: 'Bonus', icon: '🎁' },
    { value: 'interest', label: 'Interest', icon: '💰' },
    { value: 'gift', label: 'Gift', icon: '🎉' },
    { value: 'refund', label: 'Refund', icon: '↩️' },
    { value: 'other', label: 'Other', icon: '💵' }
  ];

  const categories = [
    { value: 'salary', label: 'Salary', icon: '💼' },
    { value: 'freelance', label: 'Freelance', icon: '💻' },
    { value: 'business_income', label: 'Business Income', icon: '🏢' },
    { value: 'investment_returns', label: 'Investment Returns', icon: '📈' },
    { value: 'rental_income', label: 'Rental Income', icon: '🏠' },
    { value: 'bonus', label: 'Bonus/Commission', icon: '🎁' },
    { value: 'interest', label: 'Interest', icon: '💰' },
    { value: 'dividend', label: 'Dividend', icon: '💹' },
    { value: 'capital_gains', label: 'Capital Gains', icon: '📊' },
    { value: 'gift', label: 'Gift', icon: '🎉' },
    { value: 'refund', label: 'Refund', icon: '↩️' },
    { value: 'pension', label: 'Pension', icon: '👴' },
    { value: 'other', label: 'Other', icon: '💵' }
  ];

  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      loadTodayIncomes();
    }
  }, [isOpen, activeTab]);

  const loadTodayIncomes = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get('/incomes/quick-incomes', {
        params: { date: today }
      });
      
      if (response.data.success) {
        setTodayIncomes(response.data.data.incomes || []);
        setTodayTotal(response.data.data.total || 0);
      }
    } catch (error) {
      console.error('Error loading today incomes:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!income.description.trim() || !income.amount || parseFloat(income.amount) <= 0) {
      notification?.showNotification('Please fill in all fields with valid values', 'error');
      return;
    }

    try {
      setSaving(true);
      const response = await api.post('/incomes', income);
      
      if (response.data.success) {
        notification?.showNotification('Income added successfully! 💰', 'success');
        
        // Reset form
        setIncome({
          description: '',
          amount: '',
          source: 'salary',
          category: 'salary',
          date: new Date().toISOString().split('T')[0]
        });
        
        // Reload today's incomes
        loadTodayIncomes();
        
        // Notify parent component
        if (onIncomeAdded) {
          onIncomeAdded();
        }
      }
    } catch (error) {
      console.error('Error adding income:', error);
      notification?.showNotification(
        error.response?.data?.message || 'Failed to add income',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteIncome = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Income',
      message: 'Are you sure you want to delete this income? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger'
    });

    if (!confirmed) return;

    try {
      await api.delete(`/incomes/${id}`);
      notification?.showNotification('Income deleted successfully', 'success');
      loadTodayIncomes();
      if (onIncomeAdded) onIncomeAdded();
    } catch (error) {
      console.error('Error deleting income:', error);
      notification?.showNotification('Failed to delete income', 'error');
    }
  };

  if (!isOpen) {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-6 bg-green-600 hover:bg-green-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 flex items-center space-x-2 z-50"
          style={{ boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)' }}
        >
          <TrendingUp className="w-6 h-6" />
          <span className="font-medium">Quick Income</span>
        </button>
        <ConfirmDialog />
      </>
    );
  }

  return (
    <>
    <div className="fixed bottom-6 right-6 w-96 bg-white dark:bg-slate-800 rounded-lg shadow-2xl dark:shadow-slate-900/30 z-50 border border-gray-200 dark:border-slate-700">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-5 h-5" />
          <h3 className="font-semibold">Quick Income Entry</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="hover:bg-green-700 rounded-full p-1 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('add')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'add'
              ? 'text-green-600 border-b-2 border-green-600 bg-green-50 dark:bg-green-900/20'
              : 'text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700'
          }`}
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Add Income
        </button>
        <button
          onClick={() => {
            setActiveTab('history');
            loadTodayIncomes();
          }}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'text-green-600 border-b-2 border-green-600 bg-green-50 dark:bg-green-900/20'
              : 'text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700'
          }`}
        >
          <Clock className="w-4 h-4 inline mr-2" />
          Today's Incomes
        </button>
      </div>

      {/* Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {activeTab === 'add' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={income.description}
                onChange={(e) => setIncome({ ...income, description: e.target.value })}
                placeholder="e.g., Monthly salary, Freelance project"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Amount (₹)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
                <input
                  type="number"
                  step="0.01"
                  value={income.amount}
                  onChange={(e) => setIncome({ ...income, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Source
                </label>
                <select
                  value={income.source}
                  onChange={(e) => setIncome({ ...income, source: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                  disabled={saving}
                >
                  {sources.map(source => (
                    <option key={source.value} value={source.value}>
                      {source.icon} {source.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={income.category}
                  onChange={(e) => setIncome({ ...income, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                  disabled={saving}
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
                <input
                  type="date"
                  value={income.date}
                  onChange={(e) => setIncome({ ...income, date: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                  disabled={saving}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Adding...' : '+ Add Income'}
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-slate-400">Today's Total</span>
                <span className="text-xl font-bold text-green-600">
                  ₹{todayTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {todayIncomes.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-slate-400 py-4">No incomes added today</p>
            ) : (
              todayIncomes.map((inc) => (
                <div
                  key={inc.id}
                  className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3 border border-gray-200 dark:border-slate-600 hover:border-green-300 dark:hover:border-green-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{inc.description}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        {categories.find(c => c.value === inc.category)?.icon || '💵'}{' '}
                        {categories.find(c => c.value === inc.category)?.label || inc.category}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        ₹{parseFloat(inc.amount).toLocaleString('en-IN')}
                      </p>
                      <button
                        onClick={() => handleDeleteIncome(inc.id)}
                        className="text-xs text-red-500 hover:text-red-700 mt-1"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
    <ConfirmDialog />
    </>
  );
};

export default QuickIncomeEntry;
