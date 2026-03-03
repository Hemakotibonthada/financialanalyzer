// ============================================================================
// ENTERPRISE NOTIFICATION SYSTEM
// Toast notifications, notification center, and alert management
// ============================================================================
import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import {
  Bell, X, Check, AlertTriangle, Info, AlertCircle, Trash2,
  Settings, Volume2, VolumeX, CheckCheck, Clock,
} from 'lucide-react';

// ── Context ─────────────────────────────────────────────────────────────────
const NotificationSystemContext = createContext(null);

export function useNotifications() {
  const ctx = useContext(NotificationSystemContext);
  if (!ctx) throw new Error('useNotifications must be used within EnterpriseNotificationProvider');
  return ctx;
}

// ── Constants ───────────────────────────────────────────────────────────────
const VARIANTS = {
  success: { icon: Check, bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-800 dark:text-green-200', iconColor: 'text-green-600' },
  error:   { icon: AlertCircle, bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-800 dark:text-red-200', iconColor: 'text-red-600' },
  warning: { icon: AlertTriangle, bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-800 dark:text-yellow-200', iconColor: 'text-yellow-600' },
  info:    { icon: Info, bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-800 dark:text-blue-200', iconColor: 'text-blue-600' },
};

// ── Toast Component ─────────────────────────────────────────────────────────
function Toast({ notification, onDismiss }) {
  const [isExiting, setIsExiting] = useState(false);
  const variant = VARIANTS[notification.type] || VARIANTS.info;
  const Icon = variant.icon;

  useEffect(() => {
    if (notification.duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onDismiss(notification.id), 300);
      }, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification.id, notification.duration, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(notification.id), 300);
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm max-w-sm w-full
      ${variant.bg} ${variant.border} transition-all duration-300 ${isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0 animate-slide-in-right'}`}>
      <Icon size={18} className={`${variant.iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        {notification.title && (
          <p className={`text-sm font-semibold ${variant.text}`}>{notification.title}</p>
        )}
        <p className={`text-sm ${variant.text} ${notification.title ? 'mt-0.5 opacity-80' : ''}`}>
          {notification.message}
        </p>
        {notification.action && (
          <button onClick={notification.action.onClick}
            className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
            {notification.action.label}
          </button>
        )}
      </div>
      <button onClick={handleDismiss} className={`${variant.iconColor} opacity-60 hover:opacity-100 transition-opacity flex-shrink-0`}>
        <X size={14} />
      </button>
    </div>
  );
}

// ── Notification Center Panel ───────────────────────────────────────────────
function NotificationCenter({ notifications, onDismiss, onClear, onMarkAllRead, isOpen, onClose }) {
  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed top-14 right-4 w-96 max-h-[70vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 flex flex-col overflow-hidden animate-fade-in-scale">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{unreadCount} unread</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={onMarkAllRead} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={onClear} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto">
          {notifications.length > 0 ? (
            notifications.map((n) => {
              const variant = VARIANTS[n.type] || VARIANTS.info;
              const Icon = variant.icon;
              return (
                <div key={n.id}
                  className={`flex items-start gap-3 p-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                  <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
                    <Icon size={14} className={variant.iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {n.title && <p className="text-sm font-medium text-gray-800 dark:text-white">{n.title}</p>}
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(n.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button onClick={() => onDismiss(n.id)} className="text-gray-300 hover:text-gray-500 transition-colors">
                    <X size={12} />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center">
              <Bell size={32} className="mx-auto text-gray-300 dark:text-gray-700 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No notifications</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Bell Button ─────────────────────────────────────────────────────────────
export function NotificationBell() {
  const { notifications, toggleCenter, isCenterOpen } = useNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <button onClick={toggleCenter} className="relative p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
      <Bell size={20} />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce-in">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// PROVIDER
// ============================================================================
export function EnterpriseNotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isCenterOpen, setIsCenterOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const idRef = useRef(0);

  // Load persisted notifications
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('enterprise_notifications') || '[]');
      setNotifications(saved.slice(0, 50));
    } catch {}
  }, []);

  // Persist notifications
  useEffect(() => {
    localStorage.setItem('enterprise_notifications', JSON.stringify(notifications.slice(0, 50)));
  }, [notifications]);

  const notify = useCallback(({ type = 'info', title, message, duration = 5000, action, persistent = false }) => {
    const id = ++idRef.current;
    const notification = {
      id, type, title, message, duration: persistent ? 0 : duration,
      timestamp: Date.now(), read: false, action,
    };

    // Add toast (ephemeral)
    setToasts(prev => [...prev, notification]);

    // Add to notification center (persistent)
    setNotifications(prev => [notification, ...prev].slice(0, 100));

    return id;
  }, []);

  const success = useCallback((message, opts = {}) => notify({ type: 'success', message, ...opts }), [notify]);
  const error = useCallback((message, opts = {}) => notify({ type: 'error', message, duration: 8000, ...opts }), [notify]);
  const warning = useCallback((message, opts = {}) => notify({ type: 'warning', message, ...opts }), [notify]);
  const info = useCallback((message, opts = {}) => notify({ type: 'info', message, ...opts }), [notify]);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const toggleCenter = useCallback(() => {
    setIsCenterOpen(prev => !prev);
  }, []);

  const value = {
    notify, success, error, warning, info,
    notifications, toasts,
    dismissToast, dismissNotification,
    clearAll, markAllRead,
    isCenterOpen, toggleCenter,
    soundEnabled, setSoundEnabled,
  };

  return (
    <NotificationSystemContext.Provider value={value}>
      {children}

      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast notification={toast} onDismiss={dismissToast} />
          </div>
        ))}
      </div>

      {/* Notification Center */}
      <NotificationCenter
        notifications={notifications}
        onDismiss={dismissNotification}
        onClear={clearAll}
        onMarkAllRead={markAllRead}
        isOpen={isCenterOpen}
        onClose={() => setIsCenterOpen(false)}
      />
    </NotificationSystemContext.Provider>
  );
}

// ── CSS Animations (inject via style tag) ──
const styleId = 'enterprise-notification-styles';
if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes slide-in-right {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes bounce-in {
      0% { transform: scale(0); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
    @keyframes fade-in-scale {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .animate-slide-in-right { animation: slide-in-right 0.3s ease-out; }
    .animate-bounce-in { animation: bounce-in 0.3s ease-out; }
    .animate-fade-in-scale { animation: fade-in-scale 0.2s ease-out; }
  `;
  document.head.appendChild(style);
}

export default EnterpriseNotificationProvider;
