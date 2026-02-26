import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import NotificationToast from '../components/NotificationToast';

const NotificationContext = createContext();

const MAX_NOTIFICATIONS = 10;

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const notificationIdRef = useRef(0);

  const addNotification = useCallback((notification) => {
    const id = notificationIdRef.current++;
    const newNotification = { id, ...notification };
    
    setNotifications(prev => {
      const updated = [...prev, newNotification];
      // Cap notifications at MAX_NOTIFICATIONS, removing oldest first
      if (updated.length > MAX_NOTIFICATIONS) {
        return updated.slice(-MAX_NOTIFICATIONS);
      }
      return updated;
    });
    
    // Auto-dismiss after 8 seconds if not explicitly set otherwise
    const autoDismissMs = notification.duration || 8000;
    if (autoDismissMs > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, autoDismissMs);
    }
    
    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods
  const success = useCallback((message, title, options = {}) => {
    return addNotification({
      type: 'success',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  const error = useCallback((message, title, options = {}) => {
    return addNotification({
      type: 'error',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  const warning = useCallback((message, title, options = {}) => {
    return addNotification({
      type: 'warning',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  const info = useCallback((message, title, options = {}) => {
    return addNotification({
      type: 'info',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  const budgetAlert = useCallback((message, title, options = {}) => {
    return addNotification({
      type: 'budget-alert',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  const spendingAlert = useCallback((message, title, options = {}) => {
    return addNotification({
      type: 'spending',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  const value = {
    addNotification,
    removeNotification,
    clearAll,
    success,
    error,
    warning,
    info,
    budgetAlert,
    spendingAlert
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Notification Container with accessibility */}
      <div
        className="fixed top-4 right-4 z-50 pointer-events-auto"
        role="log"
        aria-live="polite"
        aria-label="Notifications"
      >
        {notifications.map(notification => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export default NotificationContext;
