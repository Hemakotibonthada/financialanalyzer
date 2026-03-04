// ============================================================================
// Real-Time Smart Notification Bell — Enterprise Notification Center
// ============================================================================
// A notification bell component that aggregates financial alerts, AI insights,
// bill reminders, anomaly detections, and system notifications in real-time.
// ============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import {
  Bell, X, Check, CheckCheck, AlertTriangle, TrendingUp, DollarSign,
  Calendar, Shield, Sparkles, CreditCard, Clock, ChevronRight,
  Trash2, Settings, Volume2, VolumeX, Filter
} from 'lucide-react';

// ─── Notification Types ─────────────────────────────────────────────
const NOTIF_TYPES = {
  alert: { icon: AlertTriangle, color: 'red', label: 'Alert' },
  insight: { icon: Sparkles, color: 'purple', label: 'AI Insight' },
  bill: { icon: Calendar, color: 'amber', label: 'Bill Due' },
  anomaly: { icon: Shield, color: 'orange', label: 'Anomaly' },
  achievement: { icon: TrendingUp, color: 'green', label: 'Achievement' },
  system: { icon: Bell, color: 'blue', label: 'System' },
  emi: { icon: CreditCard, color: 'indigo', label: 'EMI' },
};

function NotificationItem({ notification, dk, onRead, onDismiss }) {
  const typeConfig = NOTIF_TYPES[notification.type] || NOTIF_TYPES.system;
  const Icon = typeConfig.icon;
  const isUnread = !notification.read;
  const timeAgo = getTimeAgo(notification.createdAt || notification.date);

  return (
    <div className={`flex gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer group ${
      isUnread
        ? dk ? 'bg-slate-800/60 hover:bg-slate-700/60' : 'bg-indigo-50/50 hover:bg-indigo-50'
        : dk ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50'
    }`} onClick={() => onRead?.(notification.id)}>
      {/* Icon */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
        dk ? `bg-${typeConfig.color}-900/30` : `bg-${typeConfig.color}-100`
      }`}>
        <Icon className={`w-4.5 h-4.5 text-${typeConfig.color}-500`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${
              dk ? `text-${typeConfig.color}-400` : `text-${typeConfig.color}-600`
            }`}>{typeConfig.label}</span>
            <h4 className={`text-sm font-semibold mt-0.5 ${dk ? 'text-white' : 'text-gray-900'} ${isUnread ? '' : 'opacity-70'}`}>
              {notification.title}
            </h4>
          </div>
          {isUnread && <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />}
        </div>
        <p className={`text-xs mt-0.5 line-clamp-2 ${dk ? 'text-slate-400' : 'text-gray-500'}`}>
          {notification.message}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          <span className={`text-[10px] ${dk ? 'text-slate-500' : 'text-gray-400'}`}>
            <Clock className="w-3 h-3 inline mr-0.5" />{timeAgo}
          </span>
          <button onClick={(e) => { e.stopPropagation(); onDismiss?.(notification.id); }}
            className={`text-[10px] opacity-0 group-hover:opacity-100 transition-opacity ${
              dk ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'
            }`}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(date) {
  if (!date) return 'just now';
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export default function NotificationBell() {
  const { mode } = useTheme();
  const dk = mode === 'dark' || mode === 'black';
  const bk = mode === 'black';

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const panelRef = useRef(null);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  // Generate smart notifications from financial data
  const generateNotifications = useCallback(async () => {
    try {
      const [alertsRes, billsRes] = await Promise.allSettled([
        api.get('/analytics-v2/alerts'),
        api.get('/bill-reminders?status=pending&limit=5'),
      ]);

      const notifs = [];
      let id = 1;

      // Spending alerts
      if (alertsRes.status === 'fulfilled') {
        (alertsRes.value.data?.data || []).forEach(alert => {
          notifs.push({
            id: `alert-${id++}`,
            type: 'alert',
            title: alert.title,
            message: alert.message,
            read: false,
            createdAt: new Date(),
            severity: alert.severity,
          });
        });
      }

      // Bill reminders
      if (billsRes.status === 'fulfilled') {
        (billsRes.value.data?.data || billsRes.value.data?.bills || []).forEach(bill => {
          const dueDate = new Date(bill.dueDate);
          const daysUntil = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
          if (daysUntil <= 7 && daysUntil >= 0) {
            notifs.push({
              id: `bill-${id++}`,
              type: 'bill',
              title: bill.title || bill.name || 'Bill Due',
              message: `₹${(bill.amount || 0).toLocaleString('en-IN')} due ${daysUntil === 0 ? 'today' : `in ${daysUntil} days`}`,
              read: false,
              createdAt: new Date(),
            });
          }
        });
      }

      // AI insights (generated locally)
      notifs.push({
        id: `insight-${id++}`,
        type: 'insight',
        title: 'Weekly Summary Ready',
        message: 'Your AI-powered weekly financial summary is ready to review.',
        read: false,
        createdAt: new Date(Date.now() - 3600000),
      });

      setNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const newNotifs = notifs.filter(n => !existingIds.has(n.id));
        return [...newNotifs, ...prev].slice(0, 50);
      });
    } catch (err) {
      console.error('Notification fetch error:', err);
    }
  }, []);

  useEffect(() => {
    generateNotifications();
    const interval = setInterval(generateNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [generateNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const markRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const dismiss = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => setNotifications([]);

  const filtered = useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter(n => !n.read);
    return notifications.filter(n => n.type === filter);
  }, [notifications, filter]);

  const p = useMemo(() => ({
    panel: bk ? 'bg-black border-gray-800' : dk ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-gray-200',
    header: bk ? 'border-gray-800' : dk ? 'border-slate-700/50' : 'border-gray-100',
    text: dk ? 'text-white' : 'text-gray-900',
    textSub: dk ? 'text-slate-400' : 'text-gray-500',
    filter: dk ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100',
    filterActive: 'bg-indigo-600 text-white',
  }), [dk, bk]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-all duration-200 ${
          dk ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-gray-100 text-gray-600'
        }`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center badge-pop badge-glow">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className={`absolute right-0 top-12 w-[380px] max-h-[500px] ${p.panel} rounded-2xl border shadow-2xl overflow-hidden z-50`}
          style={{ animation: 'modalContentIn 0.2s ease-out forwards' }}>
          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-3 border-b ${p.header}`}>
            <div className="flex items-center gap-2">
              <h3 className={`text-sm font-bold ${p.text}`}>Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className={`text-xs px-2 py-1 rounded-lg ${p.filter}`}>
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={clearAll} className={`text-xs px-2 py-1 rounded-lg ${p.filter}`}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setIsOpen(false)} className={`p-1 rounded-lg ${p.filter}`}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1 px-3 py-2 overflow-x-auto">
            {['all', 'unread', 'alert', 'insight', 'bill'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                  filter === f ? p.filterActive : p.filter
                }`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-[350px] px-2 pb-2 space-y-0.5">
            {filtered.length > 0 ? (
              filtered.map(notif => (
                <NotificationItem
                  key={notif.id}
                  notification={notif}
                  dk={dk}
                  onRead={markRead}
                  onDismiss={dismiss}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <Bell className={`w-10 h-10 mx-auto mb-2 ${dk ? 'text-slate-600' : 'text-gray-300'}`} />
                <p className={`text-sm ${p.textSub}`}>No notifications</p>
                <p className={`text-xs mt-1 ${dk ? 'text-slate-500' : 'text-gray-400'}`}>You're all caught up!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
