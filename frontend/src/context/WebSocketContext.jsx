import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [documentUpdates, setDocumentUpdates] = useState({});
  const [analysisProgress, setAnalysisProgress] = useState({});
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Get WebSocket URL from environment or construct from API URL
      const getWebSocketURL = () => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        // Remove /api from the end to get base URL
        return apiUrl.replace(/\/api$/, '');
      };

      const wsUrl = getWebSocketURL();
      console.log('🔌 Connecting to WebSocket:', wsUrl);

      // Initialize socket connection
      const socketInstance = io(wsUrl, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      // Connection handlers
      socketInstance.on('connect', () => {
        console.log('✅ WebSocket connected:', socketInstance.id);
        setIsConnected(true);
        setSocket(socketInstance);
        
        // Join user-specific room
        socketInstance.emit('join-user-room', user._id || user.id);
        
        // Show connection notification
        toast.success('Real-time updates enabled', { 
          position: 'bottom-right',
          autoClose: 2000 
        });
      });

      socketInstance.on('disconnect', () => {
        console.log('❌ WebSocket disconnected');
        setIsConnected(false);
        toast.warning('Real-time updates disconnected', { 
          position: 'bottom-right',
          autoClose: 3000 
        });
      });

      socketInstance.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setIsConnected(false);
        toast.error('Failed to connect real-time updates', { 
          position: 'bottom-right',
          autoClose: 5000 
        });
      });

      // Document processing updates
      socketInstance.on('document_update', (update) => {
        console.log('📄 Document update:', update);
        setDocumentUpdates(prev => ({
          ...prev,
          [update.documentId]: update
        }));

        // Show progress notification
        if (update.status === 'processing') {
          toast.info(`Processing document... ${update.progress}%`, {
            toastId: `doc-${update.documentId}`,
            position: 'bottom-right',
            autoClose: false,
            progress: update.progress / 100
          });
        } else if (update.status === 'completed') {
          toast.dismiss(`doc-${update.documentId}`);
          toast.success(`Document processed! Found ${update.transactionCount} transactions`, {
            position: 'bottom-right',
            autoClose: 4000
          });
        } else if (update.status === 'failed') {
          toast.dismiss(`doc-${update.documentId}`);
          toast.error(`Document processing failed: ${update.error}`, {
            position: 'bottom-right',
            autoClose: 6000
          });
        }
      });

      // Transaction updates
      socketInstance.on('transaction_update', (update) => {
        console.log('💳 Transaction update:', update);
        // Trigger dashboard refresh or update specific transaction data
      });

      // Analysis progress updates
      socketInstance.on('analysis_update', (update) => {
        console.log('📊 Analysis update:', update);
        setAnalysisProgress(prev => ({
          ...prev,
          [update.analysisId]: update
        }));

        // Show progress notification
        toast.info(`${update.stage} ${update.progress}%`, {
          toastId: `analysis-${update.analysisId}`,
          position: 'bottom-right',
          autoClose: false,
          progress: update.progress / 100
        });
      });

      // Analysis completion
      socketInstance.on('analysis_complete', (update) => {
        console.log('✅ Analysis complete:', update);
        toast.dismiss(`analysis-${update.analysisId}`);
        toast.success('Financial analysis completed!', {
          position: 'bottom-right',
          autoClose: 5000
        });

        // Update analysis progress state
        setAnalysisProgress(prev => ({
          ...prev,
          [update.analysisId]: { ...update, progress: 100, stage: 'Completed' }
        }));
      });

      // Dashboard updates
      socketInstance.on('dashboard_update', (update) => {
        console.log('📈 Dashboard update:', update);
        // This could trigger a callback to refresh dashboard data
      });

      // Error notifications
      socketInstance.on('error', (update) => {
        console.error('❌ WebSocket error:', update);
        toast.error(`Error: ${update.error.message}`, {
          position: 'bottom-right',
          autoClose: 8000
        });
      });

      // General notifications
      socketInstance.on('notification', (update) => {
        console.log('🔔 Notification:', update);
        const { notification } = update;
        
        setNotifications(prev => [
          ...prev.slice(-9), // Keep last 10 notifications
          { ...notification, id: Date.now(), timestamp: update.timestamp }
        ]);

        // Show toast notification
        const toastOptions = {
          position: 'bottom-right',
          autoClose: notification.level === 'error' ? 8000 : 5000
        };

        switch (notification.level) {
          case 'success':
            toast.success(notification.message, toastOptions);
            break;
          case 'warning':
            toast.warning(notification.message, toastOptions);
            break;
          case 'error':
            toast.error(notification.message, toastOptions);
            break;
          default:
            toast.info(notification.message, toastOptions);
        }
      });

      return () => {
        console.log('🔌 Cleaning up WebSocket connection');
        socketInstance.disconnect();
      };
    }
  }, [isAuthenticated, user]);

  // Function to manually refresh dashboard data (can be called by components)
  const requestDashboardUpdate = () => {
    if (socket && isConnected) {
      socket.emit('request_dashboard_update');
    }
  };

  // Function to clear notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Function to clear specific document update
  const clearDocumentUpdate = (documentId) => {
    setDocumentUpdates(prev => {
      const newUpdates = { ...prev };
      delete newUpdates[documentId];
      return newUpdates;
    });
  };

  // Function to clear specific analysis progress
  const clearAnalysisProgress = (analysisId) => {
    setAnalysisProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[analysisId];
      return newProgress;
    });
  };

  const contextValue = {
    socket,
    isConnected,
    documentUpdates,
    analysisProgress,
    notifications,
    requestDashboardUpdate,
    clearNotifications,
    clearDocumentUpdate,
    clearAnalysisProgress
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};