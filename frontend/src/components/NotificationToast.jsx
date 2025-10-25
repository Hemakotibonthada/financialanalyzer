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
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'budget-alert':
        return 'bg-orange-50 border-orange-200';
      case 'spending':
        return 'bg-blue-50 border-blue-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div
      className={`${getBackground()} border rounded-lg shadow-lg p-4 mb-3 min-w-[320px] max-w-[400px] animate-slide-in`}
      role="alert"
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          {notification.title && (
            <p className="text-sm font-semibold text-gray-900 mb-1">
              {notification.title}
            </p>
          )}
          <p className="text-sm text-gray-700">
            {notification.message}
          </p>
          {notification.action && (
            <button
              onClick={() => {
                notification.action.onClick();
                onClose(notification.id);
              }}
              className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              {notification.action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => onClose(notification.id)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;
