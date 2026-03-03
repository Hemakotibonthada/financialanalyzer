import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bell, BellOff, BellRing, Check, CheckCheck, X, ChevronDown,
  Settings, Filter, Trash2, AlertTriangle, Target, TrendingUp,
  Shield, Calendar, DollarSign, RefreshCw, Eye, EyeOff, Mail,
  Smartphone, Volume2, VolumeX, BarChart3, Clock, Archive, Star
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid
} from 'recharts';
import api from '../services/api';
import MainLayout from '../components/MainLayout';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const NOTIFICATION_TYPES = {
  bill: { icon: Calendar, color: 'blue', label: 'Bill Reminder' },
  budget: { icon: AlertTriangle, color: 'yellow', label: 'Budget Alert' },
  goal: { icon: Target, color: 'green', label: 'Goal Milestone' },
  market: { icon: TrendingUp, color: 'purple', label: 'Market Alert' },
  security: { icon: Shield, color: 'red', label: 'Security' },
};

// Map backend notification types to frontend UI types
const BACKEND_TYPE_MAP = {
  bill_reminder: 'bill',
  emi_reminder: 'bill',
  budget_alert: 'budget',
  transaction_alert: 'security',
  cibil_update: 'market',
  info: 'goal',
};

function mapBackendType(backendType) {
  return BACKEND_TYPE_MAP[backendType] || 'bill';
}

function computeGroup(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  if (date >= today) return 'Today';
  if (date >= yesterday) return 'Yesterday';
  if (date >= weekAgo) return 'This Week';
  return 'Earlier';
}

function normalizeNotification(n) {
  return {
    id: n.id,
    type: n.type && NOTIFICATION_TYPES[n.type] ? n.type : mapBackendType(n.type),
    title: n.title,
    message: n.message,
    time: n.createdAt || n.time,
    read: n.isRead !== undefined ? n.isRead : (n.read || false),
    actionLabel: n.actionLabel || undefined,
    group: n.group || computeGroup(n.createdAt || n.time || new Date().toISOString()),
  };
}

export default function SmartNotifications() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [preferences, setPreferences] = useState({
    pushEnabled: true,
    emailEnabled: true,
    soundEnabled: true,
    bill: true,
    budget: true,
    goal: true,
    market: true,
    security: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  });

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/notifications');
      const raw = res.data?.data?.notifications || res.data?.notifications || res.data?.data || [];
      const mapped = Array.isArray(raw) ? raw.map(normalizeNotification) : [];
      setNotifications(mapped);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError('Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const filtered = useMemo(() => {
    if (filterType === 'all') return notifications;
    if (filterType === 'unread') return notifications.filter(n => !n.read);
    return notifications.filter(n => n.type === filterType);
  }, [notifications, filterType]);

  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(n => {
      if (!groups[n.group]) groups[n.group] = [];
      groups[n.group].push(n);
    });
    return groups;
  }, [filtered]);

  const [archivedNotifications, setArchivedNotifications] = useState([]);
  const [showArchive, setShowArchive] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;
  const totalCount = notifications.length;
  const todayCount = notifications.filter(n => n.group === 'Today').length;
  const actionableCount = notifications.filter(n => n.actionLabel && !n.read).length;

  const markRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await api.patch('/notifications/read-all');
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const dismiss = async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await api.delete(`/notifications/${id}`);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const toggleRead = async (id) => {
    const notif = notifications.find(n => n.id === id);
    if (!notif) return;
    const newRead = !notif.read;
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: newRead } : n));
    if (newRead) {
      try {
        await api.patch(`/notifications/${id}/read`);
      } catch (err) {
        console.error('Failed to toggle read status:', err);
      }
    }
  };

  const archiveNotification = async (id) => {
    const notif = notifications.find(n => n.id === id);
    if (notif) {
      setArchivedNotifications(prev => [...prev, { ...notif, archivedAt: new Date().toISOString() }]);
      setNotifications(prev => prev.filter(n => n.id !== id));
      try {
        await api.delete(`/notifications/${id}`);
      } catch (err) {
        console.error('Failed to archive notification:', err);
      }
    }
  };

  const restoreNotification = (id) => {
    const notif = archivedNotifications.find(n => n.id === id);
    if (notif) {
      const { archivedAt, ...rest } = notif;
      setNotifications(prev => [...prev, rest]);
      setArchivedNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  const clearAllArchived = () => setArchivedNotifications([]);

  const typeStats = Object.entries(NOTIFICATION_TYPES).map(([key, val]) => ({
    name: val.label,
    count: notifications.filter(n => n.type === key).length,
  }));

  const readVsUnread = [
    { name: 'Read', value: notifications.filter(n => n.read).length },
    { name: 'Unread', value: notifications.filter(n => !n.read).length },
  ];

  if (loading) {
    return (
      <MainLayout title="Notifications">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Loading notifications...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <MainLayout title="Notifications">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
            <button onClick={fetchNotifications} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto">
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Notifications">
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <BellRing className="w-8 h-8 text-blue-500" /> Notifications
              {unreadCount > 0 && (
                <span className="text-sm bg-red-500 text-white px-2.5 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Stay informed about your finances</p>
          </div>
          <div className="flex gap-2">
            <button onClick={markAllRead} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <CheckCheck className="w-4 h-4" /> Mark All Read
            </button>
            <button onClick={() => setShowStats(!showStats)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <BarChart3 className="w-4 h-4" />
            </button>
            <button onClick={() => setShowArchive(!showArchive)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <Archive className="w-4 h-4" /> Archive ({archivedNotifications.length})
            </button>
            <button onClick={() => setShowSettings(!showSettings)} className="flex items-center gap-2 bg-blue-600 text-white rounded-xl text-sm font-medium px-4 py-2 hover:bg-blue-700 transition-colors">
              <Settings className="w-4 h-4" /> Settings
            </button>
          </div>
        </div>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 dashboard-grid">
          {[
            { label: 'Total', value: totalCount, icon: Bell, color: 'blue', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Unread', value: unreadCount, icon: BellRing, color: 'red', bg: 'bg-red-50 dark:bg-red-900/20' },
            { label: 'Today', value: todayCount, icon: Clock, color: 'green', bg: 'bg-green-50 dark:bg-green-900/20' },
            { label: 'Actionable', value: actionableCount, icon: AlertTriangle, color: 'yellow', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className={`${stat.bg} rounded-2xl p-4 border border-slate-200 dark:border-slate-700`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</span>
                  <Icon className={`w-4 h-4 text-${stat.color}-500`} />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Stats Panel */}
        {showStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 dashboard-grid">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">By Type</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={typeStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#64748b20" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 12, color: '#fff' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Read vs Unread</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={readVsUnread} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 12, color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[{ id: 'all', label: 'All' }, { id: 'unread', label: 'Unread' }, ...Object.entries(NOTIFICATION_TYPES).map(([k, v]) => ({ id: k, label: v.label }))].map(f => (
            <button key={f.id} onClick={() => setFilterType(f.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${filterType === f.id ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Notification Feed */}
        {Object.entries(grouped).map(([groupName, items]) => (
          <div key={groupName}>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 pl-1">{groupName}</h3>
            <div className="space-y-2">
              {items.map(notif => {
                const typeInfo = NOTIFICATION_TYPES[notif.type];
                const Icon = typeInfo.icon;
                const colorMap = { blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400', yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400', green: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400', purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400', red: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' };
                return (
                  <div key={notif.id}
                    className={`flex items-start gap-4 p-4 rounded-2xl border transition-all hover:shadow-md cursor-pointer ${notif.read ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'bg-blue-50 dark:bg-slate-800 border-blue-200 dark:border-blue-800'}`}
                    onClick={() => markRead(notif.id)}>
                    <div className={`p-2.5 rounded-xl ${colorMap[typeInfo.color]}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`font-semibold text-sm ${notif.read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>{notif.title}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{notif.message}</p>
                        </div>
                        {!notif.read && <span className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-slate-400">{new Date(notif.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {notif.actionLabel && (
                          <button className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline">{notif.actionLabel}</button>
                        )}
                        <button onClick={e => { e.stopPropagation(); toggleRead(notif.id); }} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1">
                          {notif.read ? <><EyeOff className="w-3 h-3" /> Unread</> : <><Eye className="w-3 h-3" /> Read</>}
                        </button>
                        <button onClick={e => { e.stopPropagation(); archiveNotification(notif.id); }} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1">
                          <Archive className="w-3 h-3" /> Archive
                        </button>
                        <button onClick={e => { e.stopPropagation(); dismiss(notif.id); }} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                          <Trash2 className="w-3 h-3" /> Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 border border-slate-200 dark:border-slate-700 text-center">
            <BellOff className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No notifications to show</p>
            <button onClick={() => setFilterType('all')} className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline">Show all notifications</button>
          </div>
        )}
      </div>

      {/* Archive Panel */}
      {showArchive && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-slate-200 dark:border-slate-700 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Archive className="w-5 h-5 text-blue-500" /> Archived Notifications
              </h3>
              <button onClick={() => setShowArchive(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            {archivedNotifications.length > 0 ? (
              <div className="space-y-3">
                {archivedNotifications.map(notif => {
                  const typeInfo = NOTIFICATION_TYPES[notif.type];
                  const Icon = typeInfo.icon;
                  return (
                    <div key={notif.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                      <Icon className="w-4 h-4 text-slate-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{notif.title}</p>
                        <p className="text-xs text-slate-400">{new Date(notif.archivedAt).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => restoreNotification(notif.id)} className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline">Restore</button>
                    </div>
                  );
                })}
                <button onClick={clearAllArchived} className="w-full py-2 text-sm text-red-500 hover:text-red-600 font-medium mt-2">Clear All Archived</button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Archive className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No archived notifications</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-slate-200 dark:border-slate-700 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Notification Preferences</h3>
              <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="space-y-6">
              {/* Channels */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Channels</h4>
                <div className="space-y-3">
                  {[
                    { key: 'pushEnabled', label: 'Push Notifications', icon: Smartphone, desc: 'Get notifications on your device' },
                    { key: 'emailEnabled', label: 'Email Notifications', icon: Mail, desc: 'Receive email digests' },
                    { key: 'soundEnabled', label: 'Sound', icon: Volume2, desc: 'Play sound for new notifications' },
                  ].map(ch => {
                    const Icon = ch.icon;
                    return (
                      <div key={ch.key} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{ch.label}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{ch.desc}</p>
                          </div>
                        </div>
                        <button onClick={() => setPreferences(p => ({ ...p, [ch.key]: !p[ch.key] }))}
                          className={`w-11 h-6 rounded-full transition-colors relative ${preferences[ch.key] ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${preferences[ch.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Types */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Notification Types</h4>
                <div className="space-y-2">
                  {Object.entries(NOTIFICATION_TYPES).map(([key, val]) => {
                    const Icon = val.icon;
                    return (
                      <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          <span className="text-sm text-slate-900 dark:text-white">{val.label}</span>
                        </div>
                        <button onClick={() => setPreferences(p => ({ ...p, [key]: !p[key] }))}
                          className={`w-11 h-6 rounded-full transition-colors relative ${preferences[key] ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${preferences[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quiet Hours */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Quiet Hours</h4>
                <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  <Clock className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  <div className="flex items-center gap-2">
                    <input type="time" value={preferences.quietHoursStart} onChange={e => setPreferences(p => ({ ...p, quietHoursStart: e.target.value }))} className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600" />
                    <span className="text-sm text-slate-500">to</span>
                    <input type="time" value={preferences.quietHoursEnd} onChange={e => setPreferences(p => ({ ...p, quietHoursEnd: e.target.value }))} className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowSettings(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">Cancel</button>
              <button onClick={async () => {
                try {
                  await api.put('/notifications/preferences', preferences);
                } catch (err) {
                  console.error('Failed to save preferences:', err);
                }
                setShowSettings(false);
              }} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Save Preferences</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </MainLayout>
  );
}
