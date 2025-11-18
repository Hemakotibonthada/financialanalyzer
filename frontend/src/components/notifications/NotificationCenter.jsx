import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, X, Check, AlertCircle, Info, CheckCircle, Clock, Settings } from 'lucide-react';
import axios from 'axios';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [preferences, setPreferences] = useState({});
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchNotifications();
    fetchPreferences();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get('/api/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const response = await axios.get('/api/notifications/preferences');
      setPreferences(response.data);
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`/api/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n => 
        n._id === notificationId ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put('/api/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`/api/notifications/${notificationId}`);
      setNotifications(notifications.filter(n => n._id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const updatePreferences = async (newPreferences) => {
    try {
      await axios.put('/api/notifications/preferences', newPreferences);
      setPreferences(newPreferences);
      setShowSettings(false);
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'alert':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'warning':
        return <Clock className="w-5 h-5 text-orange-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return n.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading notifications...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="w-8 h-8" />
            Notifications
          </h1>
          {unreadCount > 0 && (
            <span className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-semibold">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Mark all read
            </button>
          )}
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Channels</h3>
                <div className="space-y-2">
                  {['email', 'sms', 'push', 'whatsapp'].map(channel => (
                    <label key={channel} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={preferences[channel] || false}
                        onChange={(e) => updatePreferences({
                          ...preferences,
                          [channel]: e.target.checked
                        })}
                        className="w-4 h-4"
                      />
                      <span className="capitalize">{channel}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Notification Types</h3>
                <div className="space-y-2">
                  {['budgetAlerts', 'billReminders', 'debtReminders', 'smartAlerts', 'digestEmails'].map(type => (
                    <label key={type} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={preferences[type] !== false}
                        onChange={(e) => updatePreferences({
                          ...preferences,
                          [type]: e.target.checked
                        })}
                        className="w-4 h-4"
                      />
                      <span>{type.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Digest Frequency</h3>
                <select
                  value={preferences.digestFrequency || 'weekly'}
                  onChange={(e) => updatePreferences({
                    ...preferences,
                    digestFrequency: e.target.value
                  })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="never">Never</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'unread', 'read', 'alert', 'success', 'info', 'warning'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg capitalize ${
              filter === f 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map(notification => (
            <Card 
              key={notification._id}
              className={`${!notification.read ? 'border-blue-200 bg-blue-50' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    {getIcon(notification.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold ${!notification.read ? 'text-blue-900' : ''}`}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{new Date(notification.createdAt).toLocaleString()}</span>
                        {notification.priority && (
                          <span className={`px-2 py-0.5 rounded ${
                            notification.priority === 'high' ? 'bg-red-100 text-red-800' :
                            notification.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {notification.priority} priority
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification._id)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification._id)}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Delete"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
                {notification.actionUrl && (
                  <a
                    href={notification.actionUrl}
                    className="inline-block mt-2 text-sm text-blue-600 hover:underline"
                  >
                    View Details →
                  </a>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
