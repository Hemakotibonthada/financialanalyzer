import React, { useState, useEffect, useRef } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Box,
  Typography,
  Divider,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  CheckCircle,
  Warning,
  Info,
  Error as ErrorIcon,
  CreditCard,
  TrendingUp,
  Description as FileText,
  Shield,
  Mail,
  Settings,
  Archive,
  MarkEmailRead
} from '@mui/icons-material';
import { useWebSocket } from '../context/WebSocketContext';
import api from '../services/api';
import { formatDistanceToNow } from 'date-fns';

const NotificationBell = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { socket } = useWebSocket();
  const audioRef = useRef(null);

  const open = Boolean(anchorEl);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();

    // Listen for real-time notifications
    if (socket) {
      socket.on('notification', handleNewNotification);
      
      return () => {
        socket.off('notification', handleNewNotification);
      };
    }
  }, [socket]);

  const handleNewNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Play notification sound
    if (audioRef.current) {
      audioRef.current.play().catch(err => console.log('Audio play failed:', err));
    }
  };

  const fetchNotifications = async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await api.get('/notifications', {
        params: {
          page: pageNum,
          limit: 10,
          sort: '-createdAt'
        }
      });

      if (response.data.success) {
        // Handle both response formats: data.data.notifications OR data.data (array)
        const newNotifications = Array.isArray(response.data.data) 
          ? response.data.data 
          : (response.data.data?.notifications || []);
        
        if (pageNum === 1) {
          setNotifications(newNotifications);
        } else {
          setNotifications(prev => [...prev, ...newNotifications]);
        }
        
        // Check if pagination info exists
        const hasMoreData = response.data.data?.pagination?.hasMore !== undefined 
          ? response.data.data.pagination.hasMore 
          : newNotifications.length >= 10;
        
        setHasMore(hasMoreData);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      // Set empty array on error to prevent undefined access
      if (pageNum === 1) {
        setNotifications([]);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      if (response.data.success) {
        setUnreadCount(response.data.data.count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await api.put(`/notifications/${notificationId}/read`);
      if (response.data.success) {
        setNotifications(prev =>
          prev.map(n =>
            n._id === notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await api.put('/notifications/mark-all-read');
      if (response.data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const archiveNotification = async (notificationId) => {
    try {
      const response = await api.put(`/notifications/${notificationId}/archive`);
      if (response.data.success) {
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
        if (!notifications.find(n => n._id === notificationId)?.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Failed to archive notification:', error);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchNotifications(nextPage);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'bill_reminder':
      case 'emi_reminder':
        return <CreditCard fontSize="small" />;
      case 'budget_alert':
        return <Warning fontSize="small" />;
      case 'transaction_alert':
        return <TrendingUp fontSize="small" />;
      case 'document_processed':
        return <FileText fontSize="small" />;
      case 'security_alert':
        return <Shield fontSize="small" />;
      case 'gmail_sync':
        return <Mail fontSize="small" />;
      case 'success':
        return <CheckCircle fontSize="small" />;
      case 'error':
        return <ErrorIcon fontSize="small" />;
      case 'warning':
        return <Warning fontSize="small" />;
      default:
        return <Info fontSize="small" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      default:
        return 'default';
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    
    // Handle action URL
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
      handleClose();
    }
  };

  return (
    <>
      {/* Notification sound */}
      <audio ref={audioRef} src="/notification-sound.mp3" preload="auto" />

      <Tooltip title="Notifications">
        <IconButton
          onClick={handleClick}
          size="large"
          sx={{ 
            color: 'white',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          <Badge 
            badgeContent={unreadCount} 
            color="error" 
            max={99}
            sx={{
              '& .MuiBadge-badge': {
                animation: unreadCount > 0 ? 'pulse 2s infinite' : 'none',
                '@keyframes pulse': {
                  '0%': {
                    transform: 'scale(1)',
                    opacity: 1,
                  },
                  '50%': {
                    transform: 'scale(1.1)',
                    opacity: 0.8,
                  },
                  '100%': {
                    transform: 'scale(1)',
                    opacity: 1,
                  },
                }
              }
            }}
          >
            {unreadCount > 0 ? (
              <NotificationsIcon sx={{ animation: 'bell-ring 0.5s ease-in-out' }} />
            ) : (
              <NotificationsNoneIcon />
            )}
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 420,
            maxHeight: 600,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            elevation: 8
          }
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Notifications
              {unreadCount > 0 && (
                <Chip
                  label={unreadCount}
                  size="small"
                  color="error"
                  sx={{ ml: 1, height: 20, fontSize: '0.75rem' }}
                />
              )}
            </Typography>
            {unreadCount > 0 && (
              <Button
                size="small"
                startIcon={<MarkEmailRead />}
                onClick={markAllAsRead}
              >
                Mark all read
              </Button>
            )}
          </Box>
        </Box>

        <Divider />

        {/* Notifications List */}
        <Box sx={{ 
          overflowY: 'auto', 
          flex: 1,
          maxHeight: 450
        }}>
          {loading && page === 1 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <NotificationsNoneIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No notifications yet
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification._id}>
                  <ListItem
                    alignItems="flex-start"
                    sx={{
                      backgroundColor: notification.isRead ? 'transparent' : 'action.hover',
                      cursor: notification.actionUrl ? 'pointer' : 'default',
                      '&:hover': {
                        backgroundColor: 'action.selected'
                      },
                      position: 'relative',
                      pr: 6
                    }}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <ListItemIcon sx={{ minWidth: 40, mt: 1 }}>
                      {getNotificationIcon(notification.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: notification.isRead ? 400 : 600,
                              flex: 1
                            }}
                          >
                            {notification.title}
                          </Typography>
                          {notification.priority !== 'low' && (
                            <Chip
                              label={notification.priority}
                              size="small"
                              color={getPriorityColor(notification.priority)}
                              sx={{ height: 18, fontSize: '0.65rem', ml: 1 }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ display: 'block', mb: 0.5 }}
                          >
                            {notification.message}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block' }}
                          >
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </Typography>
                        </>
                      }
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        archiveNotification(notification._id);
                      }}
                      sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8
                      }}
                    >
                      <Archive fontSize="small" />
                    </IconButton>
                  </ListItem>
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}

          {/* Load More */}
          {hasMore && notifications.length > 0 && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Button
                size="small"
                onClick={loadMore}
                disabled={loading}
                startIcon={loading && <CircularProgress size={16} />}
              >
                {loading ? 'Loading...' : 'Load More'}
              </Button>
            </Box>
          )}
        </Box>

        <Divider />

        {/* Footer */}
        <Box sx={{ p: 1.5 }}>
          <Button
            fullWidth
            size="small"
            startIcon={<Settings />}
            onClick={() => {
              window.location.href = '/profile?tab=notifications';
              handleClose();
            }}
          >
            Notification Settings
          </Button>
        </Box>
      </Menu>
    </>
  );
};

export default NotificationBell;
