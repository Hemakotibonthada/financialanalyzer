// ============================================================================
// Enterprise WebSocket Client — React Hooks for Real-time Updates
// ============================================================================

import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';

// ============================================================================
// § 1 — WebSocket Event Constants (mirrors backend WS_EVENTS)
// ============================================================================

export const WS_EVENTS = {
  TRANSACTION_CREATED: 'transaction:created',
  TRANSACTION_UPDATED: 'transaction:updated',
  TRANSACTION_DELETED: 'transaction:deleted',
  BUDGET_WARNING: 'budget:warning',
  BUDGET_EXCEEDED: 'budget:exceeded',
  GOAL_MILESTONE: 'goal:milestone',
  GOAL_COMPLETED: 'goal:completed',
  ALERT_NEW: 'alert:new',
  ANOMALY_DETECTED: 'anomaly:detected',
  AI_INSIGHT: 'ai:insight',
  AI_PREDICTION: 'ai:prediction',
  AI_TRAINING_COMPLETE: 'ai:training_complete',
  EMI_DUE: 'emi:due',
  BILL_REMINDER: 'bill:reminder',
  NET_WORTH_UPDATE: 'networth:update',
  SYSTEM_NOTIFICATION: 'system:notification',
  EXPORT_READY: 'export:ready',
};

// ============================================================================
// § 2 — Connection Manager
// ============================================================================

class WSConnectionManager {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = null;
    this.isConnected = false;
    this.pendingSubscriptions = [];
    this.eventQueue = [];
  }

  connect(url, token) {
    if (this.socket?.connected) return;

    // Dynamic import of socket.io-client
    import('socket.io-client').then(({ io }) => {
      this.socket = io(url, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        console.log('[WS Client] Connected:', this.socket.id);
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // Replay pending subscriptions
        for (const channel of this.pendingSubscriptions) {
          this.socket.emit('channel:subscribe', channel);
        }
        this.pendingSubscriptions = [];

        // Start heartbeat
        this.startHeartbeat();

        // Notify listeners
        this._emit('connection', { status: 'connected', id: this.socket.id });
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[WS Client] Disconnected:', reason);
        this.isConnected = false;
        this.stopHeartbeat();
        this._emit('connection', { status: 'disconnected', reason });
      });

      this.socket.on('connect_error', (error) => {
        this.reconnectAttempts++;
        console.warn('[WS Client] Connection error:', error.message);
        this._emit('connection', { status: 'error', error: error.message });
      });

      // Handle queued messages (received on reconnect)
      this.socket.on('queued:messages', (messages) => {
        console.log(`[WS Client] Received ${messages.length} queued messages`);
        for (const msg of messages) {
          this._emit(msg.event, msg.data);
        }
      });

      // Register all known event handlers
      Object.values(WS_EVENTS).forEach(event => {
        this.socket.on(event, (payload) => {
          this._emit(event, payload?.data || payload);
        });
      });
    }).catch(err => {
      console.warn('[WS Client] socket.io-client not available:', err.message);
    });
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }

  subscribe(channel) {
    if (this.isConnected && this.socket) {
      this.socket.emit('channel:subscribe', channel);
    } else {
      this.pendingSubscriptions.push(channel);
    }
  }

  unsubscribe(channel) {
    if (this.socket) {
      this.socket.emit('channel:unsubscribe', channel);
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat');
      }
    }, 30000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(callback);
    }
  }

  _emit(event, data) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (err) {
          console.error('[WS Client] Event handler error:', err);
        }
      }
    }

    // Also emit to wildcard listeners
    const wildcardHandlers = this.listeners.get('*');
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        try {
          handler(event, data);
        } catch (err) {
          console.error('[WS Client] Wildcard handler error:', err);
        }
      }
    }
  }
}

// Singleton
const wsManager = new WSConnectionManager();

// ============================================================================
// § 3 — React Context
// ============================================================================

const EnterpriseWSContext = createContext(null);

export function EnterpriseWSProvider({ children, url, token }) {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    if (!url || !token) return;

    const unsubscribe = wsManager.on('connection', ({ status }) => {
      setConnectionStatus(status);
    });

    wsManager.connect(url, token);

    return () => {
      unsubscribe();
      wsManager.disconnect();
    };
  }, [url, token]);

  return (
    <EnterpriseWSContext.Provider value={{ wsManager, connectionStatus }}>
      {children}
    </EnterpriseWSContext.Provider>
  );
}

// ============================================================================
// § 4 — React Hooks
// ============================================================================

/**
 * Listen to a specific WebSocket event
 */
export function useWSEvent(event, callback) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handler = (data) => callbackRef.current(data);
    const unsubscribe = wsManager.on(event, handler);
    return unsubscribe;
  }, [event]);
}

/**
 * Listen to multiple WebSocket events
 */
export function useWSEvents(events, callback) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const unsubscribers = events.map(event => {
      const handler = (data) => callbackRef.current(event, data);
      return wsManager.on(event, handler);
    });
    return () => unsubscribers.forEach(unsub => unsub());
  }, [events.join(',')]);
}

/**
 * Get connection status
 */
export function useWSConnection() {
  const ctx = useContext(EnterpriseWSContext);
  return ctx || { wsManager, connectionStatus: wsManager.isConnected ? 'connected' : 'disconnected' };
}

/**
 * Subscribe to a channel and listen for events
 */
export function useWSChannel(channel) {
  useEffect(() => {
    if (!channel) return;
    wsManager.subscribe(channel);
    return () => wsManager.unsubscribe(channel);
  }, [channel]);
}

/**
 * Hook for transaction real-time updates
 */
export function useTransactionUpdates(onUpdate) {
  useWSEvent(WS_EVENTS.TRANSACTION_CREATED, (data) => onUpdate?.('created', data));
  useWSEvent(WS_EVENTS.TRANSACTION_UPDATED, (data) => onUpdate?.('updated', data));
  useWSEvent(WS_EVENTS.TRANSACTION_DELETED, (data) => onUpdate?.('deleted', data));
}

/**
 * Hook for budget alerts
 */
export function useBudgetAlerts(onAlert) {
  useWSEvent(WS_EVENTS.BUDGET_WARNING, (data) => onAlert?.('warning', data));
  useWSEvent(WS_EVENTS.BUDGET_EXCEEDED, (data) => onAlert?.('exceeded', data));
}

/**
 * Hook for AI insights
 */
export function useAIInsights(onInsight) {
  useWSEvent(WS_EVENTS.AI_INSIGHT, (data) => onInsight?.(data));
  useWSEvent(WS_EVENTS.AI_PREDICTION, (data) => onInsight?.(data));
  useWSEvent(WS_EVENTS.AI_TRAINING_COMPLETE, (data) => onInsight?.(data));
}

/**
 * Hook for goal milestones
 */
export function useGoalUpdates(onGoalUpdate) {
  useWSEvent(WS_EVENTS.GOAL_MILESTONE, (data) => onGoalUpdate?.('milestone', data));
  useWSEvent(WS_EVENTS.GOAL_COMPLETED, (data) => onGoalUpdate?.('completed', data));
}

/**
 * Hook that accumulates real-time events
 */
export function useWSEventLog(maxItems = 50) {
  const [events, setEvents] = useState([]);

  useWSEvents(Object.values(WS_EVENTS), (eventName, data) => {
    setEvents(prev => {
      const newEvents = [{
        event: eventName,
        data,
        timestamp: new Date().toISOString(),
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      }, ...prev];
      return newEvents.slice(0, maxItems);
    });
  });

  const clearEvents = useCallback(() => setEvents([]), []);

  return { events, clearEvents };
}

// ============================================================================
// § 5 — Exports
// ============================================================================

export { wsManager };
export default wsManager;
