import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Zap, Plus, X, Check, Play, Pause, Trash2, Edit3, Copy,
  ChevronRight, ChevronDown, Clock, Tag, DollarSign, Bell,
  RefreshCw, ArrowRight, Filter, Settings, BarChart3, Activity,
  AlertTriangle, Calendar, FolderOpen, Send, Repeat,
  History, Search, Star, Save,
  Download, Upload, Brain, Sparkles, Shield, Target, TrendingUp,
  TrendingDown, Wallet, CreditCard, PiggyBank, FileText,
  CheckCircle, XCircle, AlertOctagon, Eye,
  Layers, Cpu, Info, Package, Timer,
  LayoutGrid, List, Wand2, Lightbulb, Hash,
  Flag, Trophy, Gauge
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell
} from 'recharts';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import MainLayout from '../components/MainLayout';

// ─── Colors ──────────────────────────────────────────────────────────
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const CATEGORY_COLORS = {
  alerting: '#ef4444', ai_powered: '#8b5cf6', budgeting: '#f59e0b', saving: '#10b981',
  debt: '#f97316', spending: '#3b82f6', reporting: '#6366f1', organization: '#14b8a6',
  investment: '#ec4899', custom: '#64748b'
};

// ─── Trigger & Action type definitions (match backend) ──────────────
const TRIGGER_TYPES = [
  { id: 'amount_above', label: 'Amount Above', icon: TrendingUp, desc: 'Transaction exceeds threshold', category: 'amount' },
  { id: 'amount_below', label: 'Amount Below', icon: TrendingDown, desc: 'Transaction below threshold', category: 'amount' },
  { id: 'amount_between', label: 'Amount Range', icon: DollarSign, desc: 'Transaction within a range', category: 'amount' },
  { id: 'category_match', label: 'Category Match', icon: Tag, desc: 'Matches a specific category', category: 'category' },
  { id: 'keyword_match', label: 'Keyword Match', icon: Search, desc: 'Description contains keyword', category: 'category' },
  { id: 'merchant_match', label: 'Merchant Match', icon: Package, desc: 'From a specific merchant', category: 'category' },
  { id: 'budget_threshold', label: 'Budget Threshold', icon: AlertTriangle, desc: 'Budget usage reaches %', category: 'budget' },
  { id: 'budget_exceeded', label: 'Budget Exceeded', icon: AlertOctagon, desc: 'Budget has been exceeded', category: 'budget' },
  { id: 'spending_velocity', label: 'Spending Velocity', icon: Activity, desc: 'Spending rate is unusual', category: 'spending' },
  { id: 'spending_spike', label: 'Spending Spike', icon: Zap, desc: 'Sudden spending increase', category: 'spending' },
  { id: 'savings_milestone', label: 'Savings Milestone', icon: Trophy, desc: 'Savings reach a target', category: 'savings' },
  { id: 'income_received', label: 'Income Received', icon: Wallet, desc: 'Income deposit detected', category: 'income' },
  { id: 'bill_due', label: 'Bill Due', icon: Calendar, desc: 'Upcoming bill reminder', category: 'bills' },
  { id: 'emi_due', label: 'EMI Due', icon: CreditCard, desc: 'EMI payment upcoming', category: 'bills' },
  { id: 'goal_progress', label: 'Goal Progress', icon: Target, desc: 'Financial goal milestone', category: 'goals' },
  { id: 'anomaly_detected', label: 'Anomaly Detected', icon: Shield, desc: 'AI detects unusual pattern', category: 'ai' },
  { id: 'fraud_suspected', label: 'Fraud Suspected', icon: AlertOctagon, desc: 'Potential fraud alert', category: 'ai' },
  { id: 'pattern_change', label: 'Pattern Change', icon: Brain, desc: 'Spending pattern changed', category: 'ai' },
  { id: 'low_balance', label: 'Low Balance', icon: TrendingDown, desc: 'Balance drops below threshold', category: 'balance' },
  { id: 'new_transaction', label: 'New Transaction', icon: Plus, desc: 'Any new transaction', category: 'general' },
  { id: 'schedule', label: 'Scheduled', icon: Timer, desc: 'Run on a schedule', category: 'time' },
  { id: 'recurring_pattern', label: 'Recurring Pattern', icon: Repeat, desc: 'Recurring payment detected', category: 'spending' },
];

const TRIGGER_CATEGORIES = [
  { id: 'all', label: 'All Triggers' },
  { id: 'amount', label: 'Amount Based' },
  { id: 'category', label: 'Category & Search' },
  { id: 'budget', label: 'Budget' },
  { id: 'spending', label: 'Spending' },
  { id: 'savings', label: 'Savings' },
  { id: 'income', label: 'Income' },
  { id: 'bills', label: 'Bills & EMI' },
  { id: 'goals', label: 'Goals' },
  { id: 'ai', label: 'AI-Powered' },
  { id: 'balance', label: 'Balance' },
  { id: 'general', label: 'General' },
  { id: 'time', label: 'Schedule' },
];

const ACTION_TYPES = [
  { id: 'auto_categorize', label: 'Auto-Categorize', icon: FolderOpen, desc: 'Assign category automatically' },
  { id: 'auto_tag', label: 'Apply Tag', icon: Hash, desc: 'Tag the transaction' },
  { id: 'add_note', label: 'Add Note', icon: FileText, desc: 'Attach a note' },
  { id: 'flag_review', label: 'Flag for Review', icon: Flag, desc: 'Mark for manual review' },
  { id: 'send_notification', label: 'Send Notification', icon: Bell, desc: 'Push notification alert' },
  { id: 'send_email', label: 'Send Email', icon: Send, desc: 'Email notification' },
  { id: 'create_alert', label: 'Create Alert', icon: AlertTriangle, desc: 'Create system alert' },
  { id: 'auto_save', label: 'Auto-Save', icon: PiggyBank, desc: 'Transfer to savings' },
  { id: 'auto_transfer', label: 'Auto-Transfer', icon: Send, desc: 'Transfer funds' },
  { id: 'auto_invest', label: 'Auto-Invest', icon: TrendingUp, desc: 'Invest automatically' },
  { id: 'create_budget', label: 'Create Budget', icon: Wallet, desc: 'Create new budget' },
  { id: 'adjust_budget', label: 'Adjust Budget', icon: Settings, desc: 'Modify existing budget' },
  { id: 'update_goal', label: 'Update Goal', icon: Target, desc: 'Update financial goal' },
  { id: 'generate_report', label: 'Generate Report', icon: FileText, desc: 'Create financial report' },
  { id: 'export_data', label: 'Export Data', icon: Download, desc: 'Export to CSV/PDF' },
  { id: 'run_analysis', label: 'Run AI Analysis', icon: Brain, desc: 'Trigger AI analysis' },
  { id: 'train_model', label: 'Train AI Model', icon: Cpu, desc: 'Retrain AI model' },
  { id: 'generate_insight', label: 'Generate Insight', icon: Sparkles, desc: 'AI-generated insight' },
  { id: 'create_reminder', label: 'Create Reminder', icon: Clock, desc: 'Set future reminder' },
  { id: 'log_event', label: 'Log Event', icon: List, desc: 'Log custom event' },
];

// ─── Lookup maps ────────────────────────────────────────────────────
const TRIGGER_TYPES_MAP = Object.fromEntries(TRIGGER_TYPES.map(t => [t.id, t]));
const ACTION_TYPES_MAP = Object.fromEntries(ACTION_TYPES.map(a => [a.id, a]));

// ─── Built-in Rule Templates ───────────────────────────────────────
const RULE_TEMPLATES = [
  { name: 'High-Value Transaction Alert', desc: 'Get notified for large transactions', trigger: 'amount_above', action: 'send_notification', triggerValue: '5000', actionValue: 'High transaction detected', category: 'alerting', tags: ['popular', 'security'] },
  { name: 'Smart Auto-Categorize', desc: 'Auto-categorize new transactions with AI', trigger: 'new_transaction', action: 'auto_categorize', triggerValue: '', actionValue: 'AI-powered', category: 'ai_powered', tags: ['ai'] },
  { name: 'Budget Guardian', desc: 'Alert when spending reaches 80% of budget', trigger: 'budget_threshold', action: 'create_alert', triggerValue: '80', actionValue: 'Budget warning', category: 'budgeting', tags: ['popular'] },
  { name: 'Pay Yourself First', desc: 'Auto-save 20% when salary is received', trigger: 'income_received', action: 'auto_save', triggerValue: '', actionValue: '20% auto-save', category: 'saving', tags: ['saving'] },
  { name: 'EMI Reminder', desc: 'Remind 3 days before EMI due date', trigger: 'emi_due', action: 'send_notification', triggerValue: '3', actionValue: 'EMI payment due soon', category: 'debt', tags: ['debt'] },
  { name: 'AI Anomaly Watch', desc: 'AI-powered unusual activity detection', trigger: 'anomaly_detected', action: 'send_notification', triggerValue: 'medium', actionValue: 'Unusual activity detected', category: 'ai_powered', tags: ['ai', 'security'] },
  { name: 'Subscription Tracker', desc: 'Track recurring subscriptions', trigger: 'recurring_pattern', action: 'auto_tag', triggerValue: '', actionValue: 'subscription', category: 'spending', tags: ['spending'] },
  { name: 'Low Balance Alert', desc: 'Alert when balance drops below ₹5,000', trigger: 'low_balance', action: 'send_notification', triggerValue: '5000', actionValue: 'Balance is low', category: 'alerting', tags: ['alerting'] },
  { name: 'Savings Milestone', desc: 'Celebrate when savings reach a milestone', trigger: 'savings_milestone', action: 'send_notification', triggerValue: '10000', actionValue: 'Milestone reached!', category: 'saving', tags: ['saving'] },
  { name: 'Spending Velocity Alert', desc: 'Alert on sharp spending increase', trigger: 'spending_velocity', action: 'create_alert', triggerValue: '30', actionValue: 'Spending rate increasing', category: 'ai_powered', tags: ['ai'] },
  { name: 'Monthly Report', desc: 'Auto-generate monthly financial summary', trigger: 'schedule', action: 'generate_report', triggerValue: 'monthly', actionValue: 'Monthly Summary', category: 'reporting', tags: ['reporting'] },
  { name: 'Bill Reminder', desc: 'Get notified 5 days before bills are due', trigger: 'bill_due', action: 'send_notification', triggerValue: '5', actionValue: 'Bill payment reminder', category: 'alerting', tags: ['bills'] },
  { name: 'Food Expense Tagger', desc: 'Auto-tag food & dining expenses', trigger: 'category_match', action: 'auto_tag', triggerValue: 'Food & Dining', actionValue: 'food-expense', category: 'spending', tags: ['spending'] },
  { name: 'Tax Deduction Tagger', desc: 'Flag tax-deductible expenses', trigger: 'category_match', action: 'auto_tag', triggerValue: 'Insurance', actionValue: 'tax-deductible', category: 'organization', tags: ['tax'] },
  { name: 'Goal Progress Notifier', desc: 'Alert at 50%, 75%, 100% goal progress', trigger: 'goal_progress', action: 'send_notification', triggerValue: '50', actionValue: 'Goal milestone reached', category: 'saving', tags: ['goals'] },
  { name: 'Round-Up Savings', desc: 'Round up each transaction & save the diff', trigger: 'new_transaction', action: 'auto_save', triggerValue: '', actionValue: 'Round up ₹100', category: 'saving', tags: ['saving'] },
  { name: 'New Merchant Alert', desc: 'Alert for first-time merchants', trigger: 'merchant_match', action: 'flag_review', triggerValue: '', actionValue: 'First-time merchant', category: 'alerting', tags: ['security'] },
  { name: 'Fraud Detection', desc: 'AI-powered fraud detection & alerting', trigger: 'fraud_suspected', action: 'create_alert', triggerValue: '', actionValue: 'Possible fraud detected', category: 'ai_powered', tags: ['ai', 'security'] },
  { name: 'Daily Spending Digest', desc: 'Daily summary of spending at 8 PM', trigger: 'schedule', action: 'generate_report', triggerValue: 'daily', actionValue: 'Daily Digest', category: 'reporting', tags: ['reporting'] },
  { name: 'Pattern Change Alert', desc: 'Alert when spending pattern changes', trigger: 'pattern_change', action: 'generate_insight', triggerValue: '', actionValue: 'Pattern analysis', category: 'ai_powered', tags: ['ai'] },
];

// ─── Normalize backend rule to frontend format ──────────────────────
const normalizeRule = (rule) => ({
  id: rule._id || rule.id,
  name: rule.name || '',
  description: rule.description || '',
  trigger: rule.trigger?.type || '',
  triggerValue: String(rule.trigger?.value ?? ''),
  triggerConfig: rule.trigger || {},
  action: rule.action?.type || '',
  actionValue: rule.action?.config?.label || rule.action?.config?.category || rule.action?.config?.message || '',
  actionConfig: rule.action || {},
  enabled: rule.isActive ?? true,
  priority: rule.priority || 0,
  executions: rule.executionCount || 0,
  successCount: rule.successCount || 0,
  failureCount: rule.failureCount || 0,
  lastRun: rule.lastExecutedAt || null,
  created: rule.createdAt ? new Date(rule.createdAt).toLocaleDateString() : '',
  category: rule.category || 'custom',
  schedule: rule.schedule || null,
  chainedActions: rule.chainedActions || [],
  tags: rule.tags || [],
  cooldownMinutes: rule.cooldownMinutes || 0,
  maxExecutionsPerDay: rule.maxExecutionsPerDay || 0,
  metadata: rule.metadata || {},
  _raw: rule,
});

// ─── Animation keyframes (injected once) ────────────────────────────
const ANIM_STYLES = `
@keyframes autoFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes autoFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes autoSlideRight { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
@keyframes autoScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
@keyframes autoPulseGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.4); } 50% { box-shadow: 0 0 0 8px rgba(59,130,246,0); } }
@keyframes autoSlideDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 600px; } }
@keyframes autoCountUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.auto-fade-up { animation: autoFadeUp 0.4s ease-out both; }
.auto-fade { animation: autoFade 0.3s ease-out both; }
.auto-slide-right { animation: autoSlideRight 0.4s ease-out both; }
.auto-scale { animation: autoScale 0.3s ease-out both; }
.auto-pulse-glow { animation: autoPulseGlow 2s ease-in-out infinite; }
.auto-slide-down { animation: autoSlideDown 0.35s ease-out both; }
.auto-count { animation: autoCountUp 0.5s ease-out both; }
`;

// ─── Snackbar Component ─────────────────────────────────────────────
function Snackbar({ open, message, type, onClose }) {
  if (!open) return null;
  const colors = { success: 'bg-emerald-500', error: 'bg-red-500', warning: 'bg-amber-500', info: 'bg-blue-500' };
  const icons = { success: CheckCircle, error: XCircle, warning: AlertTriangle, info: Info };
  const Icon = icons[type] || icons.info;
  return (
    <div className="fixed bottom-6 right-6 z-[60] auto-fade-up">
      <div className={`${colors[type] || colors.info} text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[280px]`}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium flex-1">{message}</span>
        <button onClick={onClose} className="hover:bg-white/20 rounded-lg p-0.5 transition-colors"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

// ─── Stat Card Component ────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, isDark, delay = 0 }) {
  const colorMap = {
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'text-blue-500' },
    green: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-500' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-500' },
    yellow: { bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-500' },
    red: { bg: 'bg-red-50 dark:bg-red-900/20', icon: 'text-red-500' },
    cyan: { bg: 'bg-cyan-50 dark:bg-cyan-900/20', icon: 'text-cyan-500' },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className={`${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'} rounded-2xl p-5 border backdrop-blur-sm auto-fade-up hover:shadow-lg transition-all duration-300 group`}
      style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
        <div className={`p-2 rounded-xl ${c.bg} group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'} auto-count`}
        style={{ animationDelay: `${delay + 100}ms` }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════
export default function AutomationRules() {
  const { isDark } = useTheme();

  // ─── State ───────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState([]);
  const [activeTab, setActiveTab] = useState('rules');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRule, setExpandedRule] = useState(null);
  const [selectedRules, setSelectedRules] = useState(new Set());
  const [viewMode, setViewMode] = useState('list');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('priority');

  // Create / Edit
  const [newRule, setNewRule] = useState({ name: '', trigger: '', triggerValue: '', action: '', actionValue: '', priority: 1, category: 'custom', description: '' });
  const [step, setStep] = useState(1);
  const [editingRule, setEditingRule] = useState(null);
  const [triggerCategoryFilter, setTriggerCategoryFilter] = useState('all');

  // Tab data
  const [executionHistory, setExecutionHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [backendTemplates, setBackendTemplates] = useState([]);

  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' });
  const snackbarTimer = useRef(null);

  const showSnackbar = useCallback((message, type = 'success') => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setSnackbar({ open: true, message, type });
    snackbarTimer.current = setTimeout(() => setSnackbar(s => ({ ...s, open: false })), 3500);
  }, []);

  // ─── Style injection ────────────────────────────────────────────
  useEffect(() => {
    if (!document.getElementById('automation-animations')) {
      const style = document.createElement('style');
      style.id = 'automation-animations';
      style.textContent = ANIM_STYLES;
      document.head.appendChild(style);
    }
  }, []);

  // ─── Data fetching ──────────────────────────────────────────────
  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/automation');
      const data = res.data?.data || res.data || [];
      setRules(Array.isArray(data) ? data.map(normalizeRule) : []);
    } catch (err) {
      console.error('Failed to fetch automation rules:', err);
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  // Tab-specific data loading
  useEffect(() => {
    if (activeTab === 'history') {
      setHistoryLoading(true);
      api.get('/automation/history')
        .then(res => setExecutionHistory(res.data?.data || []))
        .catch(() => setExecutionHistory([]))
        .finally(() => setHistoryLoading(false));
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'stats') {
      setStatsLoading(true);
      api.get('/automation/stats')
        .then(res => setStatsData(res.data?.data || null))
        .catch(() => setStatsData(null))
        .finally(() => setStatsLoading(false));
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'suggestions') {
      setSuggestionsLoading(true);
      api.get('/automation/suggestions')
        .then(res => setSuggestions(res.data?.data || []))
        .catch(() => setSuggestions([]))
        .finally(() => setSuggestionsLoading(false));
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'templates') {
      api.get('/automation/templates')
        .then(res => setBackendTemplates(res.data?.data?.builtIn || []))
        .catch(() => setBackendTemplates([]));
    }
  }, [activeTab]);

  // ─── Rule CRUD ──────────────────────────────────────────────────
  const toggleRule = async (id) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    try {
      await api.patch(`/automation/${id}/toggle`);
      showSnackbar('Rule toggled successfully');
    } catch (err) {
      setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
      showSnackbar('Failed to toggle rule', 'error');
    }
  };

  const deleteRule = async (id) => {
    const previous = rules;
    setRules(prev => prev.filter(r => r.id !== id));
    try {
      await api.delete(`/automation/${id}`);
      showSnackbar('Rule deleted');
    } catch (err) {
      setRules(previous);
      showSnackbar('Failed to delete rule', 'error');
    }
  };

  const duplicateRule = async (rule) => {
    try {
      const res = await api.post(`/automation/${rule.id}/duplicate`);
      setRules(prev => [...prev, normalizeRule(res.data.data)]);
      showSnackbar('Rule duplicated');
    } catch (err) {
      try {
        const payload = {
          name: `${rule.name} (Copy)`,
          trigger: { type: rule.trigger, value: rule.triggerValue },
          action: { type: rule.action, config: { label: rule.actionValue } },
          priority: rules.length + 1,
          category: rule.category,
        };
        const res = await api.post('/automation', payload);
        setRules(prev => [...prev, normalizeRule(res.data.data)]);
        showSnackbar('Rule duplicated');
      } catch (e2) {
        showSnackbar('Failed to duplicate rule', 'error');
      }
    }
  };

  const handleCreateRule = async () => {
    if (!newRule.name || !newRule.trigger || !newRule.action) {
      showSnackbar('Please fill in rule name, trigger, and action', 'warning');
      return;
    }
    try {
      const payload = {
        name: newRule.name,
        description: newRule.description,
        trigger: { type: newRule.trigger, value: newRule.triggerValue || true },
        action: { type: newRule.action, config: { label: newRule.actionValue, message: newRule.actionValue } },
        priority: rules.length + 1,
        category: newRule.category,
      };

      if (editingRule) {
        const res = await api.put(`/automation/${editingRule}`, payload);
        setRules(prev => prev.map(r => r.id === editingRule ? normalizeRule(res.data.data) : r));
        showSnackbar('Rule updated successfully');
      } else {
        const res = await api.post('/automation', payload);
        setRules(prev => [...prev, normalizeRule(res.data.data)]);
        showSnackbar('Rule created successfully');
      }

      resetModal();
    } catch (err) {
      showSnackbar(`Failed to ${editingRule ? 'update' : 'create'} rule`, 'error');
    }
  };

  const handleEditRule = (rule) => {
    setNewRule({
      name: rule.name,
      trigger: rule.trigger,
      triggerValue: rule.triggerValue,
      action: rule.action,
      actionValue: rule.actionValue,
      priority: rule.priority,
      category: rule.category,
      description: rule.description || '',
    });
    setEditingRule(rule.id);
    setStep(1);
    setShowCreateModal(true);
  };

  const handleUseTemplate = (tmpl) => {
    setNewRule({
      name: tmpl.name,
      trigger: tmpl.trigger?.type || tmpl.trigger || '',
      triggerValue: String(tmpl.trigger?.value ?? tmpl.triggerValue ?? ''),
      action: tmpl.action?.type || tmpl.action || '',
      actionValue: tmpl.action?.config?.label || tmpl.action?.config?.message || tmpl.actionValue || '',
      priority: rules.length + 1,
      category: tmpl.category || 'custom',
      description: tmpl.desc || tmpl.description || '',
    });
    setEditingRule(null);
    setStep(1);
    setShowCreateModal(true);
  };

  const handleUseSuggestion = (sug) => {
    setNewRule({
      name: sug.name,
      trigger: sug.trigger?.type || '',
      triggerValue: String(sug.trigger?.value ?? ''),
      action: sug.action?.type || '',
      actionValue: sug.action?.config?.label || sug.action?.config?.message || '',
      priority: rules.length + 1,
      category: sug.category || 'custom',
      description: sug.description || '',
    });
    setEditingRule(null);
    setStep(1);
    setShowCreateModal(true);
  };

  const resetModal = () => {
    setNewRule({ name: '', trigger: '', triggerValue: '', action: '', actionValue: '', priority: 1, category: 'custom', description: '' });
    setShowCreateModal(false);
    setStep(1);
    setEditingRule(null);
    setTriggerCategoryFilter('all');
  };

  // Bulk actions
  const handleBulkAction = async (action) => {
    if (selectedRules.size === 0) return;
    try {
      await api.post('/automation/bulk', { action, ruleIds: Array.from(selectedRules) });
      showSnackbar(`Bulk ${action} completed (${selectedRules.size} rules)`);
      setSelectedRules(new Set());
      fetchRules();
    } catch (err) {
      showSnackbar(`Bulk ${action} failed`, 'error');
    }
  };

  const handleExportRules = async () => {
    try {
      const res = await api.get('/automation/export');
      const blob = new Blob([JSON.stringify(res.data?.data || [], null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'automation-rules.json'; a.click();
      URL.revokeObjectURL(url);
      showSnackbar('Rules exported successfully');
    } catch (err) {
      showSnackbar('Export failed', 'error');
    }
  };

  const handleImportRules = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        await api.post('/automation/import', { rules: Array.isArray(data) ? data : [data] });
        showSnackbar('Rules imported successfully');
        fetchRules();
      } catch (err) {
        showSnackbar('Import failed — check file format', 'error');
      }
    };
    reader.readAsText(file);
  };

  // ─── Computed ───────────────────────────────────────────────────
  const filteredRules = useMemo(() => {
    let result = rules;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.trigger.toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q) ||
        (r.category || '').toLowerCase().includes(q)
      );
    }
    if (filterCategory !== 'all') {
      result = result.filter(r => r.category === filterCategory);
    }
    if (sortBy === 'priority') result = [...result].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    else if (sortBy === 'name') result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'executions') result = [...result].sort((a, b) => b.executions - a.executions);
    else if (sortBy === 'recent') result = [...result].sort((a, b) => new Date(b.lastRun || 0) - new Date(a.lastRun || 0));
    return result;
  }, [rules, searchQuery, filterCategory, sortBy]);

  const executionStats = useMemo(() => {
    if (statsData) {
      return [
        { name: 'Active', value: statsData.summary?.activeRules || 0 },
        { name: 'Inactive', value: (statsData.summary?.totalRules || 0) - (statsData.summary?.activeRules || 0) },
        { name: 'Total Runs', value: statsData.summary?.totalExecutions || 0 },
      ];
    }
    return [
      { name: 'Active', value: rules.filter(r => r.enabled).length },
      { name: 'Inactive', value: rules.filter(r => !r.enabled).length },
      { name: 'Total Runs', value: rules.reduce((s, r) => s + r.executions, 0) },
    ];
  }, [statsData, rules]);

  const triggerBreakdown = useMemo(() => {
    if (statsData?.triggerBreakdown) {
      return statsData.triggerBreakdown.map(t => ({
        name: (TRIGGER_TYPES_MAP[t._id]?.label) || t._id || 'Unknown',
        count: t.count,
        executions: t.executions || 0,
      }));
    }
    return TRIGGER_TYPES.map(t => ({
      name: t.label,
      count: rules.filter(r => r.trigger === t.id).length,
    })).filter(t => t.count > 0);
  }, [statsData, rules]);

  const allTemplates = useMemo(() => {
    if (backendTemplates.length > 0) return backendTemplates;
    return RULE_TEMPLATES;
  }, [backendTemplates]);

  const tabs = [
    { id: 'rules', label: 'Active Rules', icon: Zap, count: rules.length },
    { id: 'templates', label: 'Templates', icon: Star, count: allTemplates.length },
    { id: 'suggestions', label: 'AI Suggestions', icon: Brain, count: suggestions.length },
    { id: 'history', label: 'History', icon: History },
    { id: 'stats', label: 'Statistics', icon: BarChart3 },
  ];

  const categoryOptions = ['all', 'alerting', 'ai_powered', 'budgeting', 'saving', 'debt', 'spending', 'reporting', 'organization', 'investment', 'custom'];

  const filteredTriggers = useMemo(() => {
    if (triggerCategoryFilter === 'all') return TRIGGER_TYPES;
    return TRIGGER_TYPES.filter(t => t.category === triggerCategoryFilter);
  }, [triggerCategoryFilter]);

  // ═════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <MainLayout title="Automation">
        <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
          <div className="text-center auto-fade-up">
            <div className="relative inline-block">
              <Zap className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <RefreshCw className="w-6 h-6 text-blue-400 animate-spin absolute -bottom-1 -right-1" />
            </div>
            <p className={`mt-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Loading automation engine...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Automation">
      <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-slate-50'} p-4 md:p-6 lg:p-8`}>
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ─── Header ──────────────────────────────────────────── */}
          <div className="auto-fade-up flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'} flex items-center gap-3`}>
                <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/20">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                Automation Engine
              </h1>
              <p className={`mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Create powerful rules to automate your financial workflows
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search rules..."
                  className={`pl-9 pr-4 py-2.5 text-sm rounded-xl border focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-56 ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
                />
              </div>
              <button onClick={handleExportRules}
                className={`p-2.5 rounded-xl border transition-colors ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white' : 'border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                title="Export Rules">
                <Download className="w-4 h-4" />
              </button>
              <label className={`p-2.5 rounded-xl border cursor-pointer transition-colors ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white' : 'border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                title="Import Rules">
                <Upload className="w-4 h-4" />
                <input type="file" accept=".json" onChange={handleImportRules} className="hidden" />
              </label>
              <button onClick={() => { resetModal(); setShowCreateModal(true); }}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold px-5 py-2.5 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 active:scale-[0.98]">
                <Plus className="w-4 h-4" /> New Rule
              </button>
            </div>
          </div>

          {/* ─── Stats Cards ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Total Rules" value={rules.length} icon={Zap} color="blue" isDark={isDark} delay={0} />
            <StatCard label="Active" value={rules.filter(r => r.enabled).length} icon={Play} color="green" isDark={isDark} delay={50} />
            <StatCard label="Inactive" value={rules.filter(r => !r.enabled).length} icon={Pause} color="yellow" isDark={isDark} delay={100} />
            <StatCard label="Total Runs" value={rules.reduce((s, r) => s + r.executions, 0)} icon={Activity} color="purple" isDark={isDark} delay={150} />
            <StatCard label="Success Rate" value={`${statsData?.successRate ?? 100}%`} icon={CheckCircle} color="cyan" isDark={isDark} delay={200} />
            <StatCard label="Templates" value={allTemplates.length} icon={Star} color="yellow" isDark={isDark} delay={250} />
          </div>

          {/* ─── Bulk Actions (when selected) ────────────────────── */}
          {selectedRules.size > 0 && (
            <div className={`auto-slide-down flex items-center gap-3 p-4 rounded-xl border ${isDark ? 'bg-blue-900/20 border-blue-600/30' : 'bg-blue-50 border-blue-200'}`}>
              <span className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                {selectedRules.size} rule(s) selected
              </span>
              <div className="flex-1" />
              <button onClick={() => handleBulkAction('activate')} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors">Activate</button>
              <button onClick={() => handleBulkAction('deactivate')} className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors">Deactivate</button>
              <button onClick={() => handleBulkAction('delete')} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors">Delete</button>
              <button onClick={() => setSelectedRules(new Set())} className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Clear</button>
            </div>
          )}

          {/* ─── Tabs ────────────────────────────────────────────── */}
          <div className={`flex gap-1 rounded-2xl p-1.5 border overflow-x-auto ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'}`}>
            {tabs.map(tab => {
              const TabIcon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20'
                      : isDark ? 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }`}>
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.id ? 'bg-white/20' : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
                    }`}>{tab.count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ─── Active Rules Tab ────────────────────────────────── */}
          {activeTab === 'rules' && (
            <div className="auto-fade-up space-y-4">
              {/* Filters & Sort */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                  <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                    className={`text-sm rounded-lg px-3 py-1.5 border focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-700'}`}>
                    {categoryOptions.map(c => (
                      <option key={c} value={c}>{c === 'all' ? 'All Categories' : c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Settings className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                    className={`text-sm rounded-lg px-3 py-1.5 border focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-700'}`}>
                    <option value="priority">Sort by Priority</option>
                    <option value="name">Sort by Name</option>
                    <option value="executions">Sort by Executions</option>
                    <option value="recent">Sort by Last Run</option>
                  </select>
                </div>
                <div className="flex-1" />
                <div className={`flex rounded-lg overflow-hidden border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  <button onClick={() => setViewMode('list')}
                    className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}>
                    <List className="w-4 h-4" />
                  </button>
                  <button onClick={() => setViewMode('grid')}
                    className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}>
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={() => {
                  if (selectedRules.size === filteredRules.length) setSelectedRules(new Set());
                  else setSelectedRules(new Set(filteredRules.map(r => r.id)));
                }}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${isDark ? 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                  {selectedRules.size === filteredRules.length && filteredRules.length > 0 ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Rule Cards */}
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'}>
                {filteredRules.map((rule, idx) => {
                  const triggerInfo = TRIGGER_TYPES_MAP[rule.trigger];
                  const actionInfo = ACTION_TYPES_MAP[rule.action];
                  const TriggerIcon = triggerInfo?.icon || Zap;
                  const ActionIcon = actionInfo?.icon || Zap;
                  const isExpanded = expandedRule === rule.id;
                  const isSelected = selectedRules.has(rule.id);
                  const catColor = CATEGORY_COLORS[rule.category] || CATEGORY_COLORS.custom;

                  return (
                    <div key={rule.id}
                      className={`rounded-2xl border transition-all duration-300 auto-fade-up ${
                        isDark ? 'bg-slate-800/80 backdrop-blur-sm' : 'bg-white'
                      } ${rule.enabled
                          ? isDark ? 'border-slate-700/50 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'
                          : isDark ? 'border-slate-800 opacity-50' : 'border-slate-100 opacity-50'
                      } ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900' : ''} hover:shadow-lg`}
                      style={{ animationDelay: `${idx * 40}ms` }}>

                      {/* Rule Header */}
                      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpandedRule(isExpanded ? null : rule.id)}>
                        <input type="checkbox" checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            setSelectedRules(prev => {
                              const next = new Set(prev);
                              if (next.has(rule.id)) next.delete(rule.id); else next.add(rule.id);
                              return next;
                            });
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          onClick={e => e.stopPropagation()} />

                        <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: catColor }} />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{rule.name}</p>
                            {rule.enabled && <span className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0 animate-pulse" />}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                              <TriggerIcon className="w-3 h-3" /> {triggerInfo?.label || rule.trigger}
                            </span>
                            <ArrowRight className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                              <ActionIcon className="w-3 h-3" /> {actionInfo?.label || rule.action}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}
                              style={{ borderLeft: `3px solid ${catColor}` }}>
                              {(rule.category || 'custom').replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{rule.executions} runs</span>
                          <button onClick={e => { e.stopPropagation(); toggleRule(rule.id); }}
                            className={`w-11 h-6 rounded-full transition-all duration-300 relative flex-shrink-0 ${rule.enabled ? 'bg-blue-600 shadow-lg shadow-blue-500/30' : isDark ? 'bg-slate-600' : 'bg-slate-300'}`}>
                            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${rule.enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                          </button>
                          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isDark ? 'text-slate-500' : 'text-slate-400'} ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className={`px-4 pb-4 auto-slide-down border-t ${isDark ? 'border-slate-700/50' : 'border-slate-100'}`}>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
                            <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Trigger</p>
                              <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{triggerInfo?.label || rule.trigger}</p>
                              <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{rule.triggerValue || 'Default'}</p>
                            </div>
                            <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Action</p>
                              <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{actionInfo?.label || rule.action}</p>
                              <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{rule.actionValue || 'Default'}</p>
                            </div>
                            <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Last Run</p>
                              <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {rule.lastRun ? new Date(rule.lastRun).toLocaleDateString() : 'Never'}
                              </p>
                              <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                {rule.executions} total runs
                              </p>
                            </div>
                            <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Created</p>
                              <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{rule.created || 'Unknown'}</p>
                              <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Priority: {rule.priority}</p>
                            </div>
                          </div>

                          {rule.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {rule.tags.map((tag, i) => (
                                <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 mt-4 justify-end">
                            <button onClick={() => handleEditRule(rule)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                              <Edit3 className="w-3 h-3" /> Edit
                            </button>
                            <button onClick={() => duplicateRule(rule)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                              <Copy className="w-3 h-3" /> Duplicate
                            </button>
                            <button onClick={() => deleteRule(rule.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${isDark ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredRules.length === 0 && (
                  <div className={`col-span-full rounded-2xl p-16 border text-center auto-fade-up ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                    <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 mb-4">
                      <Zap className={`w-12 h-12 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                    </div>
                    <p className={`text-lg font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {searchQuery ? 'No matching rules found' : 'No automation rules yet'}
                    </p>
                    <p className={`mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {searchQuery ? 'Try a different search query' : 'Create your first rule or pick a template to get started'}
                    </p>
                    {!searchQuery && (
                      <button onClick={() => { resetModal(); setShowCreateModal(true); }}
                        className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl text-sm font-medium px-5 py-2.5 hover:bg-blue-700 transition-colors">
                        <Plus className="w-4 h-4" /> Create First Rule
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Templates Tab ───────────────────────────────────── */}
          {activeTab === 'templates' && (
            <div className="auto-fade-up grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {allTemplates.map((tmpl, i) => {
                const triggerId = tmpl.trigger?.type || tmpl.trigger;
                const actionId = tmpl.action?.type || tmpl.action;
                const triggerInfo = TRIGGER_TYPES_MAP[triggerId];
                const actionInfo = ACTION_TYPES_MAP[actionId];
                const TriggerIcon = triggerInfo?.icon || Zap;
                const ActionIcon = actionInfo?.icon || Zap;
                const catColor = CATEGORY_COLORS[tmpl.category] || CATEGORY_COLORS.custom;

                return (
                  <div key={tmpl.id || i}
                    className={`rounded-2xl p-5 border transition-all duration-300 hover:shadow-lg auto-fade-up group ${isDark ? 'bg-slate-800/80 border-slate-700/50 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                    style={{ animationDelay: `${i * 40}ms` }}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2.5 rounded-xl group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: catColor + '20' }}>
                        <TriggerIcon className="w-5 h-5" style={{ color: catColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{tmpl.name}</h4>
                        <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {tmpl.desc || tmpl.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs mb-4 flex-wrap">
                      <span className={`flex items-center gap-1 px-2 py-1 rounded-full ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                        <TriggerIcon className="w-3 h-3" /> {triggerInfo?.label || triggerId}
                      </span>
                      <ArrowRight className={`w-3 h-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                      <span className={`flex items-center gap-1 px-2 py-1 rounded-full ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                        <ActionIcon className="w-3 h-3" /> {actionInfo?.label || actionId}
                      </span>
                    </div>

                    {tmpl.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {tmpl.tags.map((tag, j) => (
                          <span key={j} className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>{tag}</span>
                        ))}
                      </div>
                    )}

                    <button onClick={() => handleUseTemplate(tmpl)}
                      className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${isDark ? 'bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-600/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100'}`}>
                      <span className="flex items-center justify-center gap-2">
                        <Wand2 className="w-4 h-4" /> Use Template
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── AI Suggestions Tab ──────────────────────────────── */}
          {activeTab === 'suggestions' && (
            <div className="auto-fade-up space-y-4">
              {suggestionsLoading ? (
                <div className={`rounded-2xl p-16 border text-center ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                  <Brain className="w-10 h-10 text-purple-500 animate-pulse mx-auto mb-4" />
                  <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>AI is analyzing your financial data...</p>
                </div>
              ) : suggestions.length === 0 ? (
                <div className={`rounded-2xl p-16 border text-center ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                  <Brain className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                  <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>No AI suggestions available yet. Add more transactions to get personalized automation ideas.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suggestions.map((sug, i) => {
                    const triggerId = sug.trigger?.type || '';
                    const actionId = sug.action?.type || '';
                    const triggerInfo = TRIGGER_TYPES_MAP[triggerId];
                    const actionInfo = ACTION_TYPES_MAP[actionId];
                    const TriggerIcon = triggerInfo?.icon || Brain;
                    const ActionIcon = actionInfo?.icon || Sparkles;
                    const confidence = sug.confidence ? Math.round(sug.confidence * 100) : null;

                    return (
                      <div key={i} className={`rounded-2xl p-5 border transition-all duration-300 hover:shadow-lg auto-fade-up ${isDark ? 'bg-slate-800/80 border-slate-700/50 hover:border-purple-600/30' : 'bg-white border-slate-200 hover:border-purple-300'}`}
                        style={{ animationDelay: `${i * 60}ms` }}>
                        <div className="flex items-start gap-3 mb-3">
                          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                            <Brain className="w-5 h-5 text-purple-500" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{sug.name}</h4>
                              {confidence && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${confidence >= 90 ? 'bg-emerald-500/10 text-emerald-500' : confidence >= 70 ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                  {confidence}% match
                                </span>
                              )}
                            </div>
                            <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{sug.description}</p>
                          </div>
                        </div>

                        {sug.reason && (
                          <p className={`text-xs mb-3 px-3 py-2 rounded-lg ${isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                            <Lightbulb className="w-3 h-3 inline mr-1" /> {sug.reason}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-xs mb-4">
                          <span className={`flex items-center gap-1 px-2 py-1 rounded-full ${isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                            <TriggerIcon className="w-3 h-3" /> {triggerInfo?.label || triggerId}
                          </span>
                          <ArrowRight className={`w-3 h-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                          <span className={`flex items-center gap-1 px-2 py-1 rounded-full ${isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                            <ActionIcon className="w-3 h-3" /> {actionInfo?.label || actionId}
                          </span>
                        </div>

                        <button onClick={() => handleUseSuggestion(sug)}
                          className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${isDark ? 'bg-purple-600/10 text-purple-400 hover:bg-purple-600/20 border border-purple-600/20' : 'bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-100'}`}>
                          <span className="flex items-center justify-center gap-2">
                            <Sparkles className="w-4 h-4" /> Apply Suggestion
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── Execution History Tab ───────────────────────────── */}
          {activeTab === 'history' && (
            <div className={`auto-fade-up rounded-2xl p-6 border ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'}`}>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'} mb-4 flex items-center gap-2`}>
                <History className="w-5 h-5 text-blue-500" /> Execution History
              </h3>
              {historyLoading ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                </div>
              ) : executionHistory.length === 0 ? (
                <div className="text-center py-16">
                  <History className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                  <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>No execution history yet. Rules will show here when they fire.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {executionHistory.map((exec, idx) => {
                    const triggerType = exec.trigger?.type || exec.ruleId?.trigger?.type || '';
                    const actionType = exec.action?.type || exec.ruleId?.action?.type || '';
                    const triggerInfo = TRIGGER_TYPES_MAP[triggerType];
                    const actionInfo = ACTION_TYPES_MAP[actionType];
                    const success = exec.status !== 'failed';
                    const StatusIcon = success ? CheckCircle : XCircle;

                    return (
                      <div key={exec._id || idx}
                        className={`flex items-center gap-4 p-4 rounded-xl auto-fade-up ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}
                        style={{ animationDelay: `${idx * 30}ms` }}>
                        <StatusIcon className={`w-5 h-5 flex-shrink-0 ${success ? 'text-emerald-500' : 'text-red-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {exec.name || exec.ruleId?.name || 'Unknown Rule'}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {triggerInfo?.label || triggerType || 'N/A'} → {actionInfo?.label || actionType || 'N/A'}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                            {exec.executionCount || 1} runs
                          </span>
                          <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {exec.lastExecutedAt || exec.executedAt ? new Date(exec.lastExecutedAt || exec.executedAt).toLocaleString() : 'Unknown'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── Statistics Tab ───────────────────────────────────── */}
          {activeTab === 'stats' && (
            <div className="auto-fade-up space-y-6">
              {statsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                </div>
              ) : (
                <>
                  {statsData?.summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatCard label="Success Rate" value={`${statsData.successRate || 100}%`} icon={CheckCircle} color="green" isDark={isDark} delay={0} />
                      <StatCard label="Avg Priority" value={Math.round(statsData.summary.avgPriority || 0)} icon={Gauge} color="purple" isDark={isDark} delay={50} />
                      <StatCard label="Successes" value={statsData.summary.totalSuccess || 0} icon={Check} color="cyan" isDark={isDark} delay={100} />
                      <StatCard label="Failures" value={statsData.summary.totalFailures || 0} icon={XCircle} color="red" isDark={isDark} delay={150} />
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className={`rounded-2xl p-6 border ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                      <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Rule Breakdown</h3>
                      {executionStats.some(s => s.value > 0) ? (
                        <ResponsiveContainer width="100%" height={240}>
                          <PieChart>
                            <Pie data={executionStats} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value"
                              label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                              <Cell fill="#10b981" />
                              <Cell fill="#f59e0b" />
                              <Cell fill="#3b82f6" />
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', border: 'none', borderRadius: 12, color: isDark ? '#fff' : '#1e293b', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className={`flex items-center justify-center h-[240px] text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No data available</div>
                      )}
                    </div>

                    <div className={`rounded-2xl p-6 border ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                      <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Rules by Trigger Type</h3>
                      {triggerBreakdown.length > 0 ? (
                        <ResponsiveContainer width="100%" height={240}>
                          <BarChart data={triggerBreakdown}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                            <XAxis dataKey="name" tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }} angle={-25} textAnchor="end" height={60} />
                            <YAxis tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                            <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', border: 'none', borderRadius: 12, color: isDark ? '#fff' : '#1e293b', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }} />
                            <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className={`flex items-center justify-center h-[240px] text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No data available</div>
                      )}
                    </div>
                  </div>

                  {statsData?.topRules?.length > 0 && (
                    <div className={`rounded-2xl p-6 border ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                      <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Top Performing Rules</h3>
                      <div className="space-y-3">
                        {statsData.topRules.map((rule, i) => (
                          <div key={rule._id || i} className={`flex items-center gap-4 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-500/20 text-yellow-500' : i === 1 ? 'bg-slate-400/20 text-slate-400' : i === 2 ? 'bg-amber-600/20 text-amber-600' : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
                              {i + 1}
                            </span>
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{rule.name}</p>
                              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {TRIGGER_TYPES_MAP[rule.trigger?.type]?.label || rule.trigger?.type} → {ACTION_TYPES_MAP[rule.action?.type]?.label || rule.action?.type}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{rule.executionCount}</p>
                              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>executions</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {statsData?.categoryBreakdown?.length > 0 && (
                    <div className={`rounded-2xl p-6 border ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                      <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Rules by Category</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {statsData.categoryBreakdown.map((cat, i) => {
                          const catColor = CATEGORY_COLORS[cat._id] || CATEGORY_COLORS.custom;
                          return (
                            <div key={i} className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: catColor }} />
                                <span className={`text-xs capitalize ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{(cat._id || 'custom').replace(/_/g, ' ')}</span>
                              </div>
                              <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{cat.count}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
            CREATE / EDIT RULE MODAL
         ═══════════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={resetModal}>
          <div
            className={`w-full max-w-xl rounded-2xl border max-h-[90vh] overflow-hidden flex flex-col auto-scale ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
            onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div className={`p-5 border-b flex items-center justify-between flex-shrink-0 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <div>
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {editingRule ? 'Edit Automation Rule' : 'Create Automation Rule'}
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Step {step} of 3 — {step === 1 ? 'Trigger' : step === 2 ? 'Action' : 'Configure & Review'}
                </p>
              </div>
              <button onClick={resetModal}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress bar */}
            <div className={`flex items-center gap-2 px-5 py-3 border-b flex-shrink-0 ${isDark ? 'border-slate-700/50 bg-slate-800/50' : 'border-slate-100 bg-slate-50/50'}`}>
              {[1, 2, 3].map(s => (
                <React.Fragment key={s}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    step >= s
                      ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/30'
                      : isDark ? 'bg-slate-700 text-slate-500' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {step > s ? <Check className="w-4 h-4" /> : s}
                  </div>
                  {s < 3 && (
                    <div className={`flex-1 h-1 rounded-full transition-all duration-500 ${
                      step > s ? 'bg-blue-600' : isDark ? 'bg-slate-700' : 'bg-slate-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* Step 1: Name + Trigger */}
              {step === 1 && (
                <div className="auto-fade space-y-4">
                  <div>
                    <label className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Rule Name *</label>
                    <input value={newRule.name} onChange={e => setNewRule(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g., Alert on high-value transactions"
                      className={`w-full mt-1.5 px-4 py-3 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-700 text-white placeholder-slate-500' : 'bg-slate-100 text-slate-900 placeholder-slate-400'}`} />
                  </div>
                  <div>
                    <label className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Description</label>
                    <input value={newRule.description} onChange={e => setNewRule(p => ({ ...p, description: e.target.value }))}
                      placeholder="Brief description of what this rule does..."
                      className={`w-full mt-1.5 px-4 py-2.5 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 text-sm ${isDark ? 'bg-slate-700 text-white placeholder-slate-500' : 'bg-slate-100 text-slate-900 placeholder-slate-400'}`} />
                  </div>

                  <div>
                    <label className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Select Trigger (IF this happens...)</label>
                    <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
                      {TRIGGER_CATEGORIES.map(cat => (
                        <button key={cat.id} onClick={() => setTriggerCategoryFilter(cat.id)}
                          className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                            triggerCategoryFilter === cat.id
                              ? 'bg-blue-600 text-white'
                              : isDark ? 'bg-slate-700 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-500 hover:text-slate-700'
                          }`}>
                          {cat.label}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      {filteredTriggers.map(t => {
                        const Icon = t.icon;
                        return (
                          <button key={t.id} onClick={() => setNewRule(p => ({ ...p, trigger: t.id }))}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 ${
                              newRule.trigger === t.id
                                ? isDark ? 'border-blue-500 bg-blue-900/20 shadow-sm' : 'border-blue-500 bg-blue-50 shadow-sm'
                                : isDark ? 'border-slate-700 hover:border-blue-400/50 hover:bg-slate-700/50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                            }`}>
                            <Icon className={`w-4 h-4 flex-shrink-0 ${newRule.trigger === t.id ? 'text-blue-500' : isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                            <div className="min-w-0">
                              <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.label}</p>
                              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.desc}</p>
                            </div>
                            {newRule.trigger === t.id && <Check className="w-4 h-4 text-blue-500 flex-shrink-0 ml-auto" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Action */}
              {step === 2 && (
                <div className="auto-fade space-y-4">
                  <div>
                    <label className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Select Action (THEN do this...)</label>
                    <div className="space-y-1.5 mt-2 max-h-80 overflow-y-auto pr-1">
                      {ACTION_TYPES.map(a => {
                        const Icon = a.icon;
                        return (
                          <button key={a.id} onClick={() => setNewRule(p => ({ ...p, action: a.id }))}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 ${
                              newRule.action === a.id
                                ? isDark ? 'border-emerald-500 bg-emerald-900/20 shadow-sm' : 'border-emerald-500 bg-emerald-50 shadow-sm'
                                : isDark ? 'border-slate-700 hover:border-emerald-400/50 hover:bg-slate-700/50' : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                            }`}>
                            <Icon className={`w-4 h-4 flex-shrink-0 ${newRule.action === a.id ? 'text-emerald-500' : isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                            <div className="min-w-0">
                              <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{a.label}</p>
                              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{a.desc}</p>
                            </div>
                            {newRule.action === a.id && <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 ml-auto" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Configure & Review */}
              {step === 3 && (
                <div className="auto-fade space-y-4">
                  <div>
                    <label className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Trigger Value</label>
                    <input value={newRule.triggerValue} onChange={e => setNewRule(p => ({ ...p, triggerValue: e.target.value }))}
                      placeholder="e.g., 5000 for amount, Food for category..."
                      className={`w-full mt-1.5 px-4 py-3 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-700 text-white placeholder-slate-500' : 'bg-slate-100 text-slate-900 placeholder-slate-400'}`} />
                  </div>
                  <div>
                    <label className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Action Value</label>
                    <input value={newRule.actionValue} onChange={e => setNewRule(p => ({ ...p, actionValue: e.target.value }))}
                      placeholder="e.g., Food & Dining for category, Alert message..."
                      className={`w-full mt-1.5 px-4 py-3 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-700 text-white placeholder-slate-500' : 'bg-slate-100 text-slate-900 placeholder-slate-400'}`} />
                  </div>
                  <div>
                    <label className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Category</label>
                    <select value={newRule.category} onChange={e => setNewRule(p => ({ ...p, category: e.target.value }))}
                      className={`w-full mt-1.5 px-4 py-3 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 text-sm ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-900'}`}>
                      {categoryOptions.filter(c => c !== 'all').map(c => (
                        <option key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                      ))}
                    </select>
                  </div>

                  <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700/50 border border-slate-600/50' : 'bg-blue-50 border border-blue-100'}`}>
                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'} mb-2`}>Rule Summary</p>
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className={`font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>IF</span>
                      <span className={`px-2 py-1 rounded-lg ${isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                        {TRIGGER_TYPES_MAP[newRule.trigger]?.label || newRule.trigger || '(select trigger)'}
                      </span>
                      {newRule.triggerValue && (
                        <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>= &quot;{newRule.triggerValue}&quot;</span>
                      )}
                      <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>THEN</span>
                      <span className={`px-2 py-1 rounded-lg ${isDark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                        {ACTION_TYPES_MAP[newRule.action]?.label || newRule.action || '(select action)'}
                      </span>
                      {newRule.actionValue && (
                        <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>→ &quot;{newRule.actionValue}&quot;</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`p-5 border-t flex justify-between flex-shrink-0 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <button onClick={() => step > 1 ? setStep(s => s - 1) : resetModal()}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {step > 1 ? '← Back' : 'Cancel'}
              </button>
              {step < 3 ? (
                <button onClick={() => {
                  if (step === 1 && !newRule.trigger) { showSnackbar('Please select a trigger', 'warning'); return; }
                  if (step === 2 && !newRule.action) { showSnackbar('Please select an action', 'warning'); return; }
                  setStep(s => s + 1);
                }}
                  disabled={step === 1 ? !newRule.name : false}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-800 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 transition-all">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handleCreateRule}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl text-sm font-semibold hover:from-emerald-700 hover:to-emerald-800 flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all">
                  <Save className="w-4 h-4" /> {editingRule ? 'Update Rule' : 'Create Rule'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Snackbar ────────────────────────────────────────────── */}
      <Snackbar open={snackbar.open} message={snackbar.message} type={snackbar.type}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))} />
    </MainLayout>
  );
}
