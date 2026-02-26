import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap, Plus, X, Check, Play, Pause, Trash2, Edit3, Copy,
  ChevronRight, ChevronDown, Clock, Tag, DollarSign, Bell,
  RefreshCw, ArrowRight, Filter, Settings, BarChart3, Activity,
  AlertTriangle, Calendar, FolderOpen, Send, Repeat, GripVertical,
  ToggleLeft, ToggleRight, History, Search, Star, Save
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import api from '../services/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const TRIGGER_TYPES = [
  { id: 'amount', label: 'Amount Threshold', icon: DollarSign, desc: 'When a transaction exceeds a set amount' },
  { id: 'category', label: 'Category Match', icon: Tag, desc: 'When a transaction matches a category' },
  { id: 'recurring', label: 'Recurring Pattern', icon: Repeat, desc: 'When a recurring transaction is detected' },
  { id: 'date', label: 'Date-Based', icon: Calendar, desc: 'Triggered on specific dates or schedules' },
  { id: 'balance', label: 'Balance Change', icon: Activity, desc: 'When balance goes above or below threshold' },
];

const ACTION_TYPES = [
  { id: 'categorize', label: 'Auto-Categorize', icon: FolderOpen, desc: 'Assign a category automatically' },
  { id: 'notify', label: 'Send Notification', icon: Bell, desc: 'Send an alert or notification' },
  { id: 'save', label: 'Auto-Save', icon: DollarSign, desc: 'Transfer to savings automatically' },
  { id: 'transfer', label: 'Auto-Transfer', icon: Send, desc: 'Transfer between accounts' },
  { id: 'tag', label: 'Apply Tag', icon: Tag, desc: 'Tag the transaction for tracking' },
];

const TRIGGER_TO_BACKEND = { amount: 'amount_above', category: 'category_match', recurring: 'recurring_pattern', date: 'date_match', balance: 'amount_below' };
const TRIGGER_FROM_BACKEND = { amount_above: 'amount', amount_below: 'balance', category_match: 'category', recurring_pattern: 'recurring', date_match: 'date', keyword_match: 'category' };
const ACTION_TO_BACKEND = { categorize: 'auto_categorize', notify: 'send_notification', save: 'auto_save', transfer: 'auto_transfer', tag: 'auto_tag' };
const ACTION_FROM_BACKEND = { auto_categorize: 'categorize', send_notification: 'notify', create_alert: 'notify', auto_save: 'save', auto_transfer: 'transfer', auto_tag: 'tag' };

const normalizeRule = (rule) => ({
  id: rule._id || rule.id,
  name: rule.name || '',
  trigger: TRIGGER_FROM_BACKEND[rule.trigger?.type] || rule.trigger?.type || '',
  triggerValue: String(rule.trigger?.value ?? ''),
  action: ACTION_FROM_BACKEND[rule.action?.type] || rule.action?.type || '',
  actionValue: rule.action?.config?.label || '',
  enabled: rule.isActive ?? true,
  priority: rule.priority || 0,
  executions: rule.executionCount || 0,
  lastRun: rule.lastExecutedAt || null,
  created: rule.createdAt ? rule.createdAt.split('T')[0] : '',
});

const RULE_TEMPLATES = [
  { name: 'Round-Up Savings', trigger: 'amount', action: 'save', desc: 'Round up transactions and save the difference' },
  { name: 'Budget Watchdog', trigger: 'amount', action: 'notify', desc: 'Alert when spending exceeds daily budget' },
  { name: 'Income Splitter', trigger: 'amount', action: 'transfer', desc: 'Auto-split salary into budget categories' },
  { name: 'Receipt Tagger', trigger: 'category', action: 'tag', desc: 'Auto-tag business expenses for tax' },
];

export default function AutomationRules() {
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState([]);
  const [activeTab, setActiveTab] = useState('rules');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRule, setExpandedRule] = useState(null);
  const [newRule, setNewRule] = useState({ name: '', trigger: '', triggerValue: '', action: '', actionValue: '', priority: 1 });
  const [step, setStep] = useState(1);
  const [executionHistory, setExecutionHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/automation');
      const data = res.data?.data || [];
      setRules(data.map(normalizeRule));
    } catch (err) {
      console.error('Failed to fetch automation rules:', err);
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

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

  const toggleRule = async (id) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    try {
      await api.patch(`/automation/${id}/toggle`);
    } catch (err) {
      setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
      console.error('Failed to toggle rule:', err);
    }
  };

  const deleteRule = async (id) => {
    const previous = rules;
    setRules(prev => prev.filter(r => r.id !== id));
    try {
      await api.delete(`/automation/${id}`);
    } catch (err) {
      setRules(previous);
      console.error('Failed to delete rule:', err);
    }
  };

  const duplicateRule = async (rule) => {
    try {
      const payload = {
        name: `${rule.name} (Copy)`,
        trigger: { type: TRIGGER_TO_BACKEND[rule.trigger] || rule.trigger, value: rule.triggerValue },
        action: { type: ACTION_TO_BACKEND[rule.action] || rule.action, config: { label: rule.actionValue } },
        priority: rules.length + 1,
      };
      const res = await api.post('/automation', payload);
      setRules(prev => [...prev, normalizeRule(res.data.data)]);
    } catch (err) {
      console.error('Failed to duplicate rule:', err);
    }
  };

  const moveRule = (id, direction) => {
    setRules(prev => {
      const idx = prev.findIndex(r => r.id === id);
      if ((direction === -1 && idx === 0) || (direction === 1 && idx === prev.length - 1)) return prev;
      const newRules = [...prev];
      [newRules[idx], newRules[idx + direction]] = [newRules[idx + direction], newRules[idx]];
      return newRules.map((r, i) => ({ ...r, priority: i + 1 }));
    });
  };

  const filteredRules = rules.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleCreateRule = async () => {
    if (!newRule.name || !newRule.trigger || !newRule.action) return;
    try {
      const payload = {
        name: newRule.name,
        trigger: { type: TRIGGER_TO_BACKEND[newRule.trigger] || newRule.trigger, value: newRule.triggerValue },
        action: { type: ACTION_TO_BACKEND[newRule.action] || newRule.action, config: { label: newRule.actionValue } },
        priority: rules.length + 1,
      };
      const res = await api.post('/automation', payload);
      setRules(prev => [...prev, normalizeRule(res.data.data)]);
      setNewRule({ name: '', trigger: '', triggerValue: '', action: '', actionValue: '', priority: rules.length + 2 });
      setShowCreateModal(false);
      setStep(1);
    } catch (err) {
      console.error('Failed to create rule:', err);
    }
  };

  const executionStats = statsData ? [
    { name: 'Active', value: statsData.summary?.activeRules || 0 },
    { name: 'Inactive', value: (statsData.summary?.totalRules || 0) - (statsData.summary?.activeRules || 0) },
    { name: 'Executions', value: statsData.summary?.totalExecutions || 0 },
  ] : [
    { name: 'Active', value: rules.filter(r => r.enabled).length },
    { name: 'Inactive', value: rules.filter(r => !r.enabled).length },
    { name: 'Executions', value: rules.reduce((s, r) => s + r.executions, 0) },
  ];

  const triggerBreakdown = statsData?.triggerBreakdown?.map(t => ({
    day: TRIGGER_FROM_BACKEND[t._id] || t._id || 'unknown',
    count: t.count,
  })) || TRIGGER_TYPES.map(t => ({
    day: t.label,
    count: rules.filter(r => r.trigger === t.id).length,
  })).filter(t => t.count > 0);

  const tabs = [
    { id: 'rules', label: 'Active Rules' },
    { id: 'templates', label: 'Templates' },
    { id: 'history', label: 'Execution History' },
    { id: 'stats', label: 'Statistics' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading automation rules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Zap className="w-8 h-8 text-yellow-500" /> Automation Rules
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Automate your financial workflows</p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search rules..." className="pl-9 pr-4 py-2 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
            </div>
            <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 bg-blue-600 text-white rounded-xl text-sm font-medium px-4 py-2 hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" /> New Rule
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 dashboard-grid">
          {[
            { label: 'Total Rules', value: rules.length, icon: Zap, color: 'blue' },
            { label: 'Active', value: rules.filter(r => r.enabled).length, icon: Play, color: 'green' },
            { label: 'Executions', value: rules.reduce((s, r) => s + r.executions, 0), icon: Activity, color: 'purple' },
            { label: 'Templates', value: RULE_TEMPLATES.length, icon: Star, color: 'yellow' },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</span>
                  <Icon className={`w-5 h-5 text-${stat.color}-500`} />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-slate-800 rounded-2xl p-1.5 border border-slate-200 dark:border-slate-700 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Active Rules */}
        {activeTab === 'rules' && (
          <div className="space-y-3">
            {filteredRules.map(rule => {
              const triggerInfo = TRIGGER_TYPES.find(t => t.id === rule.trigger);
              const actionInfo = ACTION_TYPES.find(a => a.id === rule.action);
              const TriggerIcon = triggerInfo?.icon || Zap;
              const ActionIcon = actionInfo?.icon || Zap;
              const isExpanded = expandedRule === rule.id;

              return (
                <div key={rule.id} className={`bg-white dark:bg-slate-800 rounded-2xl border transition-all ${rule.enabled ? 'border-slate-200 dark:border-slate-700' : 'border-slate-100 dark:border-slate-800 opacity-60'}`}>
                  <div className="flex items-center gap-4 p-5 cursor-pointer" onClick={() => setExpandedRule(isExpanded ? null : rule.id)}>
                    <div className="flex items-center gap-1">
                      <button onClick={e => { e.stopPropagation(); moveRule(rule.id, -1); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs">▲</button>
                      <button onClick={e => { e.stopPropagation(); moveRule(rule.id, 1); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs">▼</button>
                    </div>
                    <span className="text-xs text-slate-400 font-mono w-6">#{rule.priority}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 dark:text-white">{rule.name}</p>
                        {rule.enabled && <span className="w-2 h-2 bg-green-500 rounded-full" />}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1"><TriggerIcon className="w-3 h-3" /> {rule.triggerValue}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span className="flex items-center gap-1"><ActionIcon className="w-3 h-3" /> {rule.actionValue}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">{rule.executions} runs</span>
                      <button onClick={e => { e.stopPropagation(); toggleRule(rule.id); }}
                        className={`w-11 h-6 rounded-full transition-colors relative ${rule.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${rule.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-0 border-t border-slate-100 dark:border-slate-700">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Trigger</p>
                          <p className="font-medium text-slate-900 dark:text-white">{triggerInfo?.label}</p>
                          <p className="text-xs text-slate-500 mt-1">{rule.triggerValue}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Action</p>
                          <p className="font-medium text-slate-900 dark:text-white">{actionInfo?.label}</p>
                          <p className="text-xs text-slate-500 mt-1">{rule.actionValue}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Last Run</p>
                          <p className="font-medium text-slate-900 dark:text-white">{rule.lastRun ? new Date(rule.lastRun).toLocaleDateString() : 'Never'}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Created</p>
                          <p className="font-medium text-slate-900 dark:text-white">{rule.created}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4 justify-end">
                        <button onClick={() => duplicateRule(rule)} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600">
                          <Copy className="w-3 h-3" /> Duplicate
                        </button>
                        <button onClick={() => deleteRule(rule.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50">
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {filteredRules.length === 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 border border-slate-200 dark:border-slate-700 text-center">
                <Zap className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">No rules found. Create your first automation!</p>
              </div>
            )}
          </div>
        )}

        {/* Templates */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 dashboard-grid">
            {RULE_TEMPLATES.map((tmpl, i) => {
              const TriggerIcon = TRIGGER_TYPES.find(t => t.id === tmpl.trigger)?.icon || Zap;
              const ActionIcon = ACTION_TYPES.find(a => a.id === tmpl.action)?.icon || Zap;
              return (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 rounded-xl bg-yellow-100 dark:bg-yellow-900/30">
                      <Star className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">{tmpl.name}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{tmpl.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
                    <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full"><TriggerIcon className="w-3 h-3" /> {tmpl.trigger}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full"><ActionIcon className="w-3 h-3" /> {tmpl.action}</span>
                  </div>
                  <button onClick={() => { setNewRule({ ...newRule, name: tmpl.name, trigger: tmpl.trigger, action: tmpl.action }); setShowCreateModal(true); }}
                    className="w-full py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                    Use Template
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Execution History */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-500" /> Execution History
            </h3>
            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : executionHistory.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">No execution history yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {executionHistory.map((exec, idx) => (
                  <div key={exec._id || idx} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{exec.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {TRIGGER_FROM_BACKEND[exec.trigger?.type] || exec.trigger?.type || 'N/A'} → {ACTION_FROM_BACKEND[exec.action?.type] || exec.action?.type || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">{exec.executionCount} runs</span>
                      <p className="text-xs text-slate-400 mt-1">{exec.lastExecutedAt ? new Date(exec.lastExecutedAt).toLocaleString() : 'Never'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Statistics */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 dashboard-grid">
            {statsLoading ? (
              <div className="col-span-full flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : (
              <>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Rule Breakdown</h3>
                  {executionStats.some(s => s.value > 0) ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={executionStats} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          <Cell fill="#10b981" />
                          <Cell fill="#f59e0b" />
                          <Cell fill="#3b82f6" />
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 12, color: '#fff' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[220px] text-slate-400 text-sm">No data available</div>
                  )}
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Rules by Trigger Type</h3>
                  {triggerBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={triggerBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#64748b20" />
                        <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 12, color: '#fff' }} />
                        <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[220px] text-slate-400 text-sm">No data available</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Create Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Create Automation Rule</h3>
              <button onClick={() => { setShowCreateModal(false); setStep(1); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-6">
              {/* Progress */}
              <div className="flex items-center gap-2">
                {[1, 2, 3].map(s => (
                  <React.Fragment key={s}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>{s}</div>
                    {s < 3 && <div className={`flex-1 h-1 rounded ${step > s ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />}
                  </React.Fragment>
                ))}
              </div>

              {step === 1 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Rule Name</h4>
                  <input value={newRule.name} onChange={e => setNewRule(p => ({ ...p, name: e.target.value }))} placeholder="Give your rule a name..." className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500 mb-4" />
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Select Trigger (IF)</h4>
                  <div className="space-y-2">
                    {TRIGGER_TYPES.map(t => {
                      const Icon = t.icon;
                      return (
                        <button key={t.id} onClick={() => setNewRule(p => ({ ...p, trigger: t.id }))}
                          className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${newRule.trigger === t.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}>
                          <Icon className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="font-medium text-sm text-slate-900 dark:text-white">{t.label}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{t.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Select Action (THEN)</h4>
                  <div className="space-y-2">
                    {ACTION_TYPES.map(a => {
                      const Icon = a.icon;
                      return (
                        <button key={a.id} onClick={() => setNewRule(p => ({ ...p, action: a.id }))}
                          className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${newRule.action === a.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}>
                          <Icon className="w-5 h-5 text-green-500" />
                          <div>
                            <p className="font-medium text-sm text-slate-900 dark:text-white">{a.label}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{a.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Configure Values</h4>
                  <input value={newRule.triggerValue} onChange={e => setNewRule(p => ({ ...p, triggerValue: e.target.value }))} placeholder="Trigger value (e.g., > ₹5,000)" className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500 mb-3" />
                  <input value={newRule.actionValue} onChange={e => setNewRule(p => ({ ...p, actionValue: e.target.value }))} placeholder="Action value (e.g., Food & Dining)" className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500" />
                  <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <p className="text-sm text-slate-900 dark:text-white font-medium">Rule Summary</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      IF <span className="text-blue-600 font-medium">{newRule.trigger}</span> {newRule.triggerValue && `(${newRule.triggerValue})`} THEN <span className="text-green-600 font-medium">{newRule.action}</span> {newRule.actionValue && `(${newRule.actionValue})`}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-between">
              <button onClick={() => step > 1 ? setStep(s => s - 1) : setShowCreateModal(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                {step > 1 ? 'Back' : 'Cancel'}
              </button>
              {step < 3 ? (
                <button onClick={() => setStep(s => s + 1)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handleCreateRule} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
                  <Save className="w-4 h-4" /> Create Rule
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
