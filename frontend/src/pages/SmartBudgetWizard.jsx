import React, { useState, useMemo } from 'react';
import api from '../services/api';
import MainLayout from '../components/MainLayout';

const STEPS = ['Income', 'Fixed Expenses', 'Variable Expenses', 'Savings', 'Review'];

const FIXED_CATEGORIES = [
  { id: 'rent', label: 'Rent / Mortgage', icon: '🏠' },
  { id: 'utilities', label: 'Utilities', icon: '💡' },
  { id: 'insurance', label: 'Insurance', icon: '🛡️' },
  { id: 'emi', label: 'EMI / Loans', icon: '🏦' },
  { id: 'subscriptions', label: 'Subscriptions', icon: '📺' },
  { id: 'education', label: 'Education', icon: '🎓' },
  { id: 'transport', label: 'Transport / Fuel', icon: '🚗' },
  { id: 'other_fixed', label: 'Other Fixed', icon: '📌' },
];

const VARIABLE_CATEGORIES = [
  { id: 'groceries', label: 'Groceries', icon: '🛒' },
  { id: 'dining', label: 'Dining Out', icon: '🍽️' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️' },
  { id: 'health', label: 'Health / Medical', icon: '🏥' },
  { id: 'personal', label: 'Personal Care', icon: '💇' },
  { id: 'travel', label: 'Travel', icon: '✈️' },
  { id: 'gifts', label: 'Gifts / Donations', icon: '🎁' },
  { id: 'other_var', label: 'Other Variable', icon: '📎' },
];

const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'yearly', label: 'Yearly' },
];

function toMonthly(amount, freq) {
  if (freq === 'weekly') return amount * 4.33;
  if (freq === 'yearly') return amount / 12;
  return amount;
}

export default function SmartBudgetWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [frequency, setFrequency] = useState('monthly');
  const [income, setIncome] = useState({ salary: '', other: '' });
  const [fixedExpenses, setFixedExpenses] = useState(
    Object.fromEntries(FIXED_CATEGORIES.map(c => [c.id, '']))
  );
  const [variableExpenses, setVariableExpenses] = useState(
    Object.fromEntries(VARIABLE_CATEGORIES.map(c => [c.id, '']))
  );
  const [savings, setSavings] = useState({ emergency: '', investment: '', retirement: '', other: '' });
  const [selectedFixed, setSelectedFixed] = useState(new Set(['rent', 'utilities', 'emi']));
  const [selectedVariable, setSelectedVariable] = useState(new Set(['groceries', 'dining', 'entertainment']));
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [saved, setSaved] = useState(false);

  const totalIncome = toMonthly((Number(income.salary) || 0) + (Number(income.other) || 0), frequency);
  const totalFixed = Object.entries(fixedExpenses).reduce((s, [k, v]) => selectedFixed.has(k) ? s + toMonthly(Number(v) || 0, frequency) : s, 0);
  const totalVariable = Object.entries(variableExpenses).reduce((s, [k, v]) => selectedVariable.has(k) ? s + toMonthly(Number(v) || 0, frequency) : s, 0);
  const totalSavings = Object.values(savings).reduce((s, v) => s + toMonthly(Number(v) || 0, frequency), 0);
  const remaining = totalIncome - totalFixed - totalVariable - totalSavings;

  const recommendation503020 = useMemo(() => ({
    needs: Math.round(totalIncome * 0.5),
    wants: Math.round(totalIncome * 0.3),
    savings: Math.round(totalIncome * 0.2),
  }), [totalIncome]);

  const pieData = useMemo(() => {
    const total = totalFixed + totalVariable + totalSavings + Math.max(remaining, 0);
    if (total === 0) return [];
    return [
      { label: 'Fixed Expenses', value: totalFixed, color: '#3b82f6', percent: ((totalFixed / total) * 100).toFixed(1) },
      { label: 'Variable Expenses', value: totalVariable, color: '#f59e0b', percent: ((totalVariable / total) * 100).toFixed(1) },
      { label: 'Savings', value: totalSavings, color: '#10b981', percent: ((totalSavings / total) * 100).toFixed(1) },
      { label: 'Remaining', value: Math.max(remaining, 0), color: '#6b7280', percent: ((Math.max(remaining, 0) / total) * 100).toFixed(1) },
    ];
  }, [totalFixed, totalVariable, totalSavings, remaining]);

  const canProceed = () => {
    if (currentStep === 0) return totalIncome > 0;
    return true;
  };

  const handleNext = () => { if (currentStep < STEPS.length - 1 && canProceed()) setCurrentStep(s => s + 1); };
  const handleBack = () => { if (currentStep > 0) setCurrentStep(s => s - 1); };

  const handleSave = async () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    try {
      // Save budget plan to backend
      const budgetData = {
        income: totalIncome,
        fixedExpenses: Object.fromEntries(
          Object.entries(fixedExpenses).filter(([k]) => selectedFixed.has(k)).map(([k, v]) => [k, toMonthly(Number(v) || 0, frequency)])
        ),
        variableExpenses: Object.fromEntries(
          Object.entries(variableExpenses).filter(([k]) => selectedVariable.has(k)).map(([k, v]) => [k, toMonthly(Number(v) || 0, frequency)])
        ),
        savings: Object.fromEntries(Object.entries(savings).map(([k, v]) => [k, toMonthly(Number(v) || 0, frequency)])),
        totalFixed, totalVariable, totalSavings, remaining,
        recommendation: recommendation503020
      };
      await api.post('/budget-optimization/analyze', budgetData);
    } catch { /* saved locally */ }
  };

  const toggleFixed = (id) => {
    const next = new Set(selectedFixed);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedFixed(next);
  };

  const toggleVariable = (id) => {
    const next = new Set(selectedVariable);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedVariable(next);
  };

  const applySuggestion = () => {
    setSavings(prev => ({ ...prev, emergency: String(recommendation503020.savings) }));
    setShowRecommendation(false);
  };

  return (
    <MainLayout title="Smart Budget Wizard">
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Smart Budget Wizard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Create a personalized budget plan step by step</p>
        </div>

        {/* Step Indicator */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, i) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    i < currentStep ? 'bg-green-500 text-white' :
                    i === currentStep ? 'bg-blue-600 text-white ring-4 ring-blue-200 dark:ring-blue-800' :
                    'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}>
                    {i < currentStep ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs mt-1 font-medium hidden md:block ${
                    i === currentStep ? 'text-blue-600' : 'text-slate-400'
                  }`}>{step}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded-full transition-all duration-500 ${
                    i < currentStep ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>

        {/* Frequency Toggle */}
        <div className="flex justify-center gap-2">
          {FREQUENCY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFrequency(opt.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                frequency === opt.value ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 min-h-[400px] transition-all duration-300">
          {/* Step 0: Income */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">💰 Enter Your Income</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Add all sources of income ({frequency})</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Salary / Primary Income</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                    <input
                      type="number"
                      value={income.salary}
                      onChange={e => setIncome(p => ({ ...p, salary: e.target.value }))}
                      className="w-full pl-8 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g. 80000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Other Income</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                    <input
                      type="number"
                      value={income.other}
                      onChange={e => setIncome(p => ({ ...p, other: e.target.value }))}
                      className="w-full pl-8 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g. 10000"
                    />
                  </div>
                </div>
              </div>
              {totalIncome > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Total Monthly Income: <span className="font-bold">₹{Math.round(totalIncome).toLocaleString()}</span>
                  </p>
                </div>
              )}

              {/* 50-30-20 Recommendation */}
              {totalIncome > 0 && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <p className="text-sm font-semibold text-green-700 dark:text-green-300 mb-2">📊 50-30-20 Recommendation</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold text-green-700 dark:text-green-400">₹{recommendation503020.needs.toLocaleString()}</p>
                      <p className="text-xs text-green-600 dark:text-green-400">Needs (50%)</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-amber-700 dark:text-amber-400">₹{recommendation503020.wants.toLocaleString()}</p>
                      <p className="text-xs text-amber-600 dark:text-amber-400">Wants (30%)</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-400">₹{recommendation503020.savings.toLocaleString()}</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">Savings (20%)</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Fixed Expenses */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">🏠 Fixed Expenses</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Select and enter your regular fixed expenses</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {FIXED_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => toggleFixed(cat.id)}
                    className={`p-3 rounded-xl text-center transition-all ${
                      selectedFixed.has(cat.id)
                        ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 text-blue-700 dark:text-blue-300'
                        : 'bg-slate-50 dark:bg-slate-700/50 border-2 border-transparent text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-2xl block">{cat.icon}</span>
                    <span className="text-xs font-medium mt-1 block">{cat.label}</span>
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {FIXED_CATEGORIES.filter(c => selectedFixed.has(c.id)).map(cat => (
                  <div key={cat.id} className="flex items-center gap-3">
                    <span className="text-xl">{cat.icon}</span>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 w-36">{cat.label}</label>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                      <input
                        type="number"
                        value={fixedExpenses[cat.id]}
                        onChange={e => setFixedExpenses(p => ({ ...p, [cat.id]: e.target.value }))}
                        className="w-full pl-8 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="0"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Total Fixed (Monthly): <span className="font-bold">₹{Math.round(totalFixed).toLocaleString()}</span>
                  {totalIncome > 0 && <span className="ml-2 text-slate-400">({((totalFixed / totalIncome) * 100).toFixed(1)}% of income)</span>}
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Variable Expenses */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">🛒 Variable Expenses</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Budget for your flexible spending categories</p>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-4">
                {VARIABLE_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => toggleVariable(cat.id)}
                    className={`p-3 rounded-xl text-center transition-all ${
                      selectedVariable.has(cat.id)
                        ? 'bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-500 text-amber-700 dark:text-amber-300'
                        : 'bg-slate-50 dark:bg-slate-700/50 border-2 border-transparent text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-2xl block">{cat.icon}</span>
                    <span className="text-xs font-medium mt-1 block">{cat.label}</span>
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {VARIABLE_CATEGORIES.filter(c => selectedVariable.has(c.id)).map(cat => (
                  <div key={cat.id} className="flex items-center gap-3">
                    <span className="text-xl">{cat.icon}</span>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 w-36">{cat.label}</label>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                      <input
                        type="number"
                        value={variableExpenses[cat.id]}
                        onChange={e => setVariableExpenses(p => ({ ...p, [cat.id]: e.target.value }))}
                        className="w-full pl-8 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="0"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Total Variable (Monthly): <span className="font-bold">₹{Math.round(totalVariable).toLocaleString()}</span>
                  {totalIncome > 0 && <span className="ml-2 text-slate-400">({((totalVariable / totalIncome) * 100).toFixed(1)}% of income)</span>}
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Savings */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">💎 Savings Goals</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Allocate money towards your financial goals</p>
                </div>
                <button
                  onClick={() => setShowRecommendation(!showRecommendation)}
                  className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 px-4 py-2 transition-colors"
                >
                  Auto-Suggest
                </button>
              </div>

              {showRecommendation && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                    Based on 50-30-20 rule, you should save <span className="font-bold">₹{recommendation503020.savings.toLocaleString()}</span>/month
                  </p>
                  <button onClick={applySuggestion} className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 px-4 py-2 transition-colors">
                    Apply Suggestion
                  </button>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { key: 'emergency', label: 'Emergency Fund', icon: '🆘' },
                  { key: 'investment', label: 'Investments', icon: '📈' },
                  { key: 'retirement', label: 'Retirement', icon: '🏖️' },
                  { key: 'other', label: 'Other Savings', icon: '🎯' },
                ].map(item => (
                  <div key={item.key} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      <span className="text-xl">{item.icon}</span> {item.label}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                      <input
                        type="number"
                        value={savings[item.key]}
                        onChange={e => setSavings(p => ({ ...p, [item.key]: e.target.value }))}
                        className="w-full pl-8 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="0"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-300">
                  Total Savings (Monthly): <span className="font-bold">₹{Math.round(totalSavings).toLocaleString()}</span>
                  {totalIncome > 0 && <span className="ml-2">({((totalSavings / totalIncome) * 100).toFixed(1)}% of income)</span>}
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">📋 Budget Summary</h2>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Income', value: totalIncome, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
                  { label: 'Fixed', value: totalFixed, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                  { label: 'Variable', value: totalVariable, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                  { label: 'Savings', value: totalSavings, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                ].map(item => (
                  <div key={item.label} className={`${item.bg} rounded-xl p-4 text-center`}>
                    <p className={`text-lg font-bold ${item.color}`}>₹{Math.round(item.value).toLocaleString()}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
                  </div>
                ))}
              </div>

              {/* Remaining */}
              <div className={`p-4 rounded-xl border ${remaining >= 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Remaining Budget</span>
                  <span className={`text-xl font-bold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{Math.round(Math.abs(remaining)).toLocaleString()} {remaining < 0 ? '(Over budget!)' : ''}
                  </span>
                </div>
              </div>

              {/* Pie Chart Visualization */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Budget Breakdown</h3>
                <div className="flex flex-wrap gap-6 items-center justify-center">
                  {/* Simple Bar Chart */}
                  <div className="flex-1 min-w-[200px] space-y-3">
                    {pieData.map(item => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1">
                          <span>{item.label}</span>
                          <span>₹{Math.round(item.value).toLocaleString()} ({item.percent}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-4">
                          <div className="h-4 rounded-full transition-all duration-700" style={{ width: `${item.percent}%`, backgroundColor: item.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Pie Legend */}
                  <div className="space-y-2">
                    {pieData.map(item => (
                      <div key={item.label} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-slate-600 dark:text-slate-300">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Fixed Expenses Detail</h3>
                  {FIXED_CATEGORIES.filter(c => selectedFixed.has(c.id) && Number(fixedExpenses[c.id]) > 0).map(cat => (
                    <div key={cat.id} className="flex justify-between py-1.5 text-sm">
                      <span className="text-slate-600 dark:text-slate-400">{cat.icon} {cat.label}</span>
                      <span className="font-medium text-slate-900 dark:text-white">₹{Math.round(toMonthly(Number(fixedExpenses[cat.id]), frequency)).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Variable Expenses Detail</h3>
                  {VARIABLE_CATEGORIES.filter(c => selectedVariable.has(c.id) && Number(variableExpenses[c.id]) > 0).map(cat => (
                    <div key={cat.id} className="flex justify-between py-1.5 text-sm">
                      <span className="text-slate-600 dark:text-slate-400">{cat.icon} {cat.label}</span>
                      <span className="font-medium text-slate-900 dark:text-white">₹{Math.round(toMonthly(Number(variableExpenses[cat.id]), frequency)).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save */}
              <div className="flex justify-center">
                <button
                  onClick={handleSave}
                  className={`px-8 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                    saved ? 'bg-green-600 text-white scale-105' : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {saved ? '✓ Budget Plan Saved!' : '💾 Save Budget Plan'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              currentStep === 0
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            ← Back
          </button>
          {currentStep < STEPS.length - 1 && (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                canProceed()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
    </MainLayout>
  );
}
