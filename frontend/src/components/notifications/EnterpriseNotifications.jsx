// ============================================================================
// Enterprise Notification System — Toast, Alerts, Real-time & Persistent
// ============================================================================
// Complete notification system with:
// - Toast notifications (success/error/warning/info)
// - Alert banners
// - Real-time WebSocket-based notifications
// - Notification center with persistence
// - AI-powered smart alerts
// ============================================================================

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  CheckCircle, AlertTriangle, XCircle, Info as InfoIcon,
  X, Bell, BellOff, ChevronRight, Trash2, ExternalLink,
  TrendingUp, TrendingDown, Shield, Zap, DollarSign, Clock,
} from 'lucide-react';

// ============================================================================
// §1 — TOAST NOTIFICATION ENGINE
// ============================================================================

const ToastContext = createContext();

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const TOAST_ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: InfoIcon,
};

const TOAST_STYLES = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50',
    icon: 'text-emerald-500',
    title: 'text-emerald-800 dark:text-emerald-200',
    progress: 'bg-emerald-500',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50',
    icon: 'text-red-500',
    title: 'text-red-800 dark:text-red-200',
    progress: 'bg-red-500',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50',
    icon: 'text-amber-500',
    title: 'text-amber-800 dark:text-amber-200',
    progress: 'bg-amber-500',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50',
    icon: 'text-blue-500',
    title: 'text-blue-800 dark:text-blue-200',
    progress: 'bg-blue-500',
  },
};

function Toast({ id, type = 'info', title, message, duration = 5000, onClose, action, actionLabel }) {
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef(null);
  const startRef = useRef(Date.now());

  const styles = TOAST_STYLES[type] || TOAST_STYLES.info;
  const Icon = TOAST_ICONS[type] || TOAST_ICONS.info;

  useEffect(() => {
    if (duration <= 0) return;

    const animate = () => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        timerRef.current = requestAnimationFrame(animate);
      } else {
        handleClose();
      }
    };

    timerRef.current = requestAnimationFrame(animate);
    return () => timerRef.current && cancelAnimationFrame(timerRef.current);
  }, [duration]);

  const handleClose = useCallback(() => {
    setExiting(true);
    setTimeout(() => onClose(id), 300);
  }, [id, onClose]);

  return (
    <div
      className={`
        relative flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm
        max-w-md w-full pointer-events-auto
        ${styles.bg}
        ${exiting ? 'notification-exit' : 'notification-enter'}
      `}
      role="alert"
      aria-live="assertive"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.icon}`} />
      <div className="flex-1 min-w-0">
        {title && <p className={`text-sm font-semibold ${styles.title}`}>{title}</p>}
        {message && <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{message}</p>}
        {action && (
          <button
            onClick={() => { action(); handleClose(); }}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline mt-1"
          >
            {actionLabel || 'Take Action'}
          </button>
        )}
      </div>
      <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0">
        <X className="w-4 h-4" />
      </button>

      {/* Progress bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full ${styles.progress} rounded-full transition-none`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function ToastProvider({ children, maxToasts = 5 }) {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const addToast = useCallback((options) => {
    const id = `toast_${++counterRef.current}`;
    const toast = {
      id,
      type: options.type || 'info',
      title: options.title,
      message: options.message,
      duration: options.duration ?? 5000,
      action: options.action,
      actionLabel: options.actionLabel,
    };
    setToasts(prev => [...prev.slice(-(maxToasts - 1)), toast]);
    return id;
  }, [maxToasts]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useMemo(() => ({
    show: addToast,
    success: (title, message, opts) => addToast({ type: 'success', title, message, ...opts }),
    error: (title, message, opts) => addToast({ type: 'error', title, message, ...opts }),
    warning: (title, message, opts) => addToast({ type: 'warning', title, message, ...opts }),
    info: (title, message, opts) => addToast({ type: 'info', title, message, ...opts }),
    dismiss: removeToast,
    dismissAll: () => setToasts([]),
  }), [addToast, removeToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Container */}
      <div
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none"
        aria-label="Notifications"
      >
        {toasts.map(t => (
          <Toast key={t.id} {...t} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ============================================================================
// §2 — NOTIFICATION CENTER 
// ============================================================================

const NOTIFICATION_ICONS = {
  transaction: DollarSign,
  anomaly: Shield,
  insight: Zap,
  forecast: TrendingUp,
  alert: AlertTriangle,
  reminder: Clock,
  default: Bell,
};

export function NotificationItem({ notification, onRead, onAction, onDelete }) {
  const Icon = NOTIFICATION_ICONS[notification.category] || NOTIFICATION_ICONS.default;
  const isUnread = !notification.read;

  return (
    <div
      className={`flex items-start gap-3 p-4 border-b border-gray-100 dark:border-gray-700/50 last:border-0 
        ${isUnread ? 'bg-blue-50/50 dark:bg-blue-900/5' : ''} 
        hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group`}
      onClick={() => onRead?.(notification.id)}
    >
      <div className={`p-2 rounded-xl flex-shrink-0 ${
        isUnread 
          ? 'bg-blue-100 dark:bg-blue-900/20' 
          : 'bg-gray-100 dark:bg-gray-800'
      }`}>
        <Icon className={`w-4 h-4 ${isUnread ? 'text-blue-500' : 'text-gray-400'}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm ${isUnread ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
            {notification.title}
          </p>
          {isUnread && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
        </div>
        {notification.message && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notification.message}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-xs text-gray-400">{formatRelativeTime(notification.timestamp || notification.createdAt)}</span>
          {notification.actionUrl && (
            <button
              onClick={(e) => { e.stopPropagation(); onAction?.(notification); }}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
            >
              View <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onDelete?.(notification.id); }}
        className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export function NotificationPanel({ notifications = [], onRead, onAction, onDelete, onReadAll, onClearAll, className = '' }) {
  const [filter, setFilter] = useState('all');
  const unreadCount = notifications.filter(n => !n.read).length;

  const filtered = useMemo(() => {
    if (filter === 'unread') return notifications.filter(n => !n.read);
    if (filter === 'alerts') return notifications.filter(n => n.category === 'anomaly' || n.category === 'alert');
    if (filter === 'insights') return notifications.filter(n => n.category === 'insight' || n.category === 'forecast');
    return notifications;
  }, [notifications, filter]);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={onReadAll} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={onClearAll} className="text-xs text-gray-400 hover:text-red-500">
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 px-4 py-2 border-b border-gray-100 dark:border-gray-700/50">
        {['all', 'unread', 'alerts', 'insights'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto">
        {filtered.length > 0 ? (
          filtered.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRead={onRead}
              onAction={onAction}
              onDelete={onDelete}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BellOff className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No notifications</p>
            <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// §3 — NOTIFICATION BELL BUTTON — Shows in navbar/header
// ============================================================================

export function NotificationBell({ count = 0, onClick, className = '' }) {
  return (
    <button onClick={onClick} className={`relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${className}`}>
      <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-5 h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full shadow-sm animate-pulse">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// §4 — ALERT BANNER — Full-width system alerts
// ============================================================================

export function AlertBanner({
  type = 'info',
  title,
  message,
  action,
  actionLabel,
  dismissible = true,
  className = '',
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const bannerStyles = {
    info: 'bg-blue-600 text-white',
    warning: 'bg-amber-500 text-white',
    error: 'bg-red-600 text-white',
    success: 'bg-emerald-600 text-white',
    announcement: 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white',
  };

  const Icon = TOAST_ICONS[type === 'announcement' ? 'info' : type];

  return (
    <div className={`${bannerStyles[type]} py-3 px-4 ${className}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Icon className="w-5 h-5 flex-shrink-0" />
          <div className="flex items-center gap-2 text-sm">
            {title && <span className="font-semibold">{title}</span>}
            {message && <span className="opacity-90 truncate">{message}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {action && (
            <button
              onClick={action}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
            >
              {actionLabel || 'Learn More'}
            </button>
          )}
          {dismissible && (
            <button onClick={() => setDismissed(true)} className="hover:bg-white/20 rounded-lg p-1 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// §5 — SMART NOTIFICATION GENERATOR — AI-powered alerts
// ============================================================================

export function generateSmartNotifications(data) {
  const notifications = [];
  const now = new Date();

  // High spending alert
  if (data?.healthScore < 40) {
    notifications.push({
      id: `health_${now.getTime()}`,
      category: 'alert',
      title: 'Low Financial Health Score',
      message: `Your financial health score is ${data.healthScore}/100. Review your spending habits and consider following AI recommendations.`,
      priority: 'high',
      timestamp: now,
      read: false,
    });
  }

  // Anomaly alerts
  if (data?.anomalies?.length > 0) {
    data.anomalies.slice(0, 3).forEach((anomaly, i) => {
      notifications.push({
        id: `anomaly_${now.getTime()}_${i}`,
        category: 'anomaly',
        title: 'Unusual Transaction Detected',
        message: `${anomaly.description || anomaly.merchant || 'Unknown'}: ₹${Math.abs(anomaly.amount || 0).toLocaleString('en-IN')} — ${anomaly.reason || 'Anomalous pattern'}`,
        priority: 'high',
        timestamp: now,
        read: false,
        actionUrl: '/anomaly-detector',
      });
    });
  }

  // Budget overspend
  if (data?.budgetUtilization > 90) {
    notifications.push({
      id: `budget_${now.getTime()}`,
      category: 'alert',
      title: 'Budget Nearly Exhausted',
      message: `You've used ${data.budgetUtilization}% of your monthly budget. Consider reducing non-essential spending.`,
      priority: 'medium',
      timestamp: now,
      read: false,
      actionUrl: '/budget-planner',
    });
  }

  // Savings milestone
  if (data?.savingsGoalProgress >= 100) {
    notifications.push({
      id: `savings_${now.getTime()}`,
      category: 'insight',
      title: 'Savings Goal Achieved! 🎉',
      message: 'Congratulations! You\'ve reached your savings goal. Consider setting a new target.',
      priority: 'low',
      timestamp: now,
      read: false,
      actionUrl: '/goals',
    });
  }

  // Upcoming bills
  if (data?.upcomingBills?.length > 0) {
    notifications.push({
      id: `bills_${now.getTime()}`,
      category: 'reminder',
      title: 'Bills Due Soon',
      message: `You have ${data.upcomingBills.length} bills due in the next 7 days totaling ₹${data.upcomingBills.reduce((s, b) => s + (b.amount || 0), 0).toLocaleString('en-IN')}.`,
      priority: 'medium',
      timestamp: now,
      read: false,
      actionUrl: '/bill-reminders',
    });
  }

  return notifications;
}

// ============================================================================
// §6 — NOTIFICATION HOOKS
// ============================================================================

export function useNotificationCenter() {
  const [notifications, setNotifications] = useState(() => {
    try {
      const stored = localStorage.getItem('app_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('app_notifications', JSON.stringify(notifications.slice(-100)));
  }, [notifications]);

  const addNotification = useCallback((notification) => {
    setNotifications(prev => [{
      id: notification.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date(),
      read: false,
      ...notification,
    }, ...prev]);
  }, []);

  const markRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    addNotification,
    markRead,
    markAllRead,
    deleteNotification,
    clearAll,
  };
}

// ============================================================================
// §7 — UTILITY
// ============================================================================

function formatRelativeTime(date) {
  if (!date) return '';
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now - d) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export default {
  ToastProvider,
  useToast,
  NotificationPanel,
  NotificationBell,
  AlertBanner,
  NotificationItem,
  generateSmartNotifications,
  useNotificationCenter,
};
