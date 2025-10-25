import React, { createContext, useContext, useState, useCallback } from 'react';
import NotificationToast from '../components/NotificationToast';

const NotificationContext = createContext();

let notificationId = 0;

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = notificationId++;
    const newNotification = { id, ...notification };
    
    setNotifications(prev => [...prev, newNotification]);
    
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
      
      {/* Notification Container */}
      <div className="fixed top-4 right-4 z-50 pointer-events-auto">
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
