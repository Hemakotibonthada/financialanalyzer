import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

const NotificationToast = ({ notification, onClose }) => {
  useEffect(() => {
    if (notification.autoClose !== false) {
      const timer = setTimeout(() => {
        onClose(notification.id);
      }, notification.duration || 5000);

      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'budget-alert':
        return <TrendingUp className="w-5 h-5 text-orange-500" />;
      case 'spending':
        return <TrendingDown className="w-5 h-5 text-blue-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBackground = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800';
      case 'budget-alert':
        return 'bg-orange-50 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800';
      case 'spending':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800';
    }
  };

  return (
    <div
      className={`${getBackground()} border rounded-lg shadow-lg dark:shadow-gray-900/30 p-4 mb-3 min-w-[320px] max-w-[400px] animate-slide-in`}
      role="alert"
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          {notification.title && (
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              {notification.title}
            </p>
          )}
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {notification.message}
          </p>
          {notification.action && (
            <button
              onClick={() => {
                notification.action.onClick();
                onClose(notification.id);
              }}
              className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {notification.action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => onClose(notification.id)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;
