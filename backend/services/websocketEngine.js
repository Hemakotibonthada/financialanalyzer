// ============================================================================
// Enterprise WebSocket Engine — Real-time Updates, Presence, Channels
// ============================================================================

const { EventEmitter } = require('events');

// ============================================================================
// § 1 — Event Types
// ============================================================================

const WS_EVENTS = {
  // Transaction Events
  TRANSACTION_CREATED: 'transaction:created',
  TRANSACTION_UPDATED: 'transaction:updated',
  TRANSACTION_DELETED: 'transaction:deleted',
  TRANSACTION_BULK: 'transaction:bulk',

  // Budget Events
  BUDGET_WARNING: 'budget:warning',
  BUDGET_EXCEEDED: 'budget:exceeded',
  BUDGET_UPDATED: 'budget:updated',

  // Goal Events
  GOAL_MILESTONE: 'goal:milestone',
  GOAL_COMPLETED: 'goal:completed',
  GOAL_UPDATED: 'goal:updated',

  // Alert Events
  ALERT_NEW: 'alert:new',
  ALERT_DISMISSED: 'alert:dismissed',
  ANOMALY_DETECTED: 'anomaly:detected',

  // AI Events
  AI_INSIGHT: 'ai:insight',
  AI_PREDICTION: 'ai:prediction',
  AI_TRAINING_COMPLETE: 'ai:training_complete',
  AI_ANALYSIS_READY: 'ai:analysis_ready',

  // Financial Events
  EMI_DUE: 'emi:due',
  BILL_REMINDER: 'bill:reminder',
  CREDIT_SCORE_CHANGE: 'credit:score_change',
  NET_WORTH_UPDATE: 'networth:update',

  // System Events
  SYSTEM_NOTIFICATION: 'system:notification',
  DATA_SYNC: 'data:sync',
  EXPORT_READY: 'export:ready',

  // Presence
  USER_ONLINE: 'presence:online',
  USER_OFFLINE: 'presence:offline',
};

// ============================================================================
// § 2 — Channel Manager
// ============================================================================

class ChannelManager {
  constructor() {
    this.channels = new Map(); // channelName → Set<socketId>
    this.socketChannels = new Map(); // socketId → Set<channelName>
  }

  subscribe(socketId, channel) {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel).add(socketId);

    if (!this.socketChannels.has(socketId)) {
      this.socketChannels.set(socketId, new Set());
    }
    this.socketChannels.get(socketId).add(channel);
  }

  unsubscribe(socketId, channel) {
    const channelSockets = this.channels.get(channel);
    if (channelSockets) {
      channelSockets.delete(socketId);
      if (channelSockets.size === 0) this.channels.delete(channel);
    }

    const socketChans = this.socketChannels.get(socketId);
    if (socketChans) {
      socketChans.delete(channel);
    }
  }

  unsubscribeAll(socketId) {
    const channels = this.socketChannels.get(socketId);
    if (channels) {
      for (const channel of channels) {
        const channelSockets = this.channels.get(channel);
        if (channelSockets) {
          channelSockets.delete(socketId);
          if (channelSockets.size === 0) this.channels.delete(channel);
        }
      }
      this.socketChannels.delete(socketId);
    }
  }

  getSubscribers(channel) {
    return this.channels.get(channel) || new Set();
  }

  getChannels(socketId) {
    return this.socketChannels.get(socketId) || new Set();
  }
}

// ============================================================================
// § 3 — Presence Tracker
// ============================================================================

class PresenceTracker {
  constructor() {
    this.onlineUsers = new Map(); // userId → { socketId, lastSeen, metadata }
    this.socketToUser = new Map(); // socketId → userId
  }

  setOnline(userId, socketId, metadata = {}) {
    this.onlineUsers.set(userId, {
      socketId,
      lastSeen: new Date(),
      connectedAt: new Date(),
      metadata,
    });
    this.socketToUser.set(socketId, userId);
  }

  setOffline(socketId) {
    const userId = this.socketToUser.get(socketId);
    if (userId) {
      this.onlineUsers.delete(userId);
      this.socketToUser.delete(socketId);
    }
    return userId;
  }

  isOnline(userId) {
    return this.onlineUsers.has(userId);
  }

  getOnlineUsers() {
    return Array.from(this.onlineUsers.entries()).map(([userId, data]) => ({
      userId,
      lastSeen: data.lastSeen,
      connectedAt: data.connectedAt,
    }));
  }

  getOnlineCount() {
    return this.onlineUsers.size;
  }

  getUserBySocket(socketId) {
    return this.socketToUser.get(socketId);
  }

  updateLastSeen(socketId) {
    const userId = this.socketToUser.get(socketId);
    if (userId && this.onlineUsers.has(userId)) {
      this.onlineUsers.get(userId).lastSeen = new Date();
    }
  }
}

// ============================================================================
// § 4 — Message Queue (for offline delivery)
// ============================================================================

class MessageQueue {
  constructor(maxPerUser = 100) {
    this.queues = new Map(); // userId → Array<message>
    this.maxPerUser = maxPerUser;
  }

  enqueue(userId, event, data) {
    if (!this.queues.has(userId)) {
      this.queues.set(userId, []);
    }

    const queue = this.queues.get(userId);
    queue.push({
      event,
      data,
      timestamp: new Date().toISOString(),
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    });

    // Trim to max
    if (queue.length > this.maxPerUser) {
      this.queues.set(userId, queue.slice(-this.maxPerUser));
    }
  }

  dequeue(userId) {
    const messages = this.queues.get(userId) || [];
    this.queues.delete(userId);
    return messages;
  }

  getCount(userId) {
    return (this.queues.get(userId) || []).length;
  }
}

// ============================================================================
// § 5 — Rate Limiter for WebSocket Events
// ============================================================================

class WSRateLimiter {
  constructor(maxEvents = 50, windowMs = 10000) {
    this.maxEvents = maxEvents;
    this.windowMs = windowMs;
    this.counters = new Map(); // socketId → { count, windowStart }
  }

  check(socketId) {
    const now = Date.now();
    const entry = this.counters.get(socketId);

    if (!entry || now - entry.windowStart > this.windowMs) {
      this.counters.set(socketId, { count: 1, windowStart: now });
      return true;
    }

    entry.count++;
    return entry.count <= this.maxEvents;
  }

  reset(socketId) {
    this.counters.delete(socketId);
  }
}

// ============================================================================
// § 6 — Enterprise WebSocket Engine
// ============================================================================

class EnterpriseWebSocketEngine extends EventEmitter {
  constructor() {
    super();
    this.io = null;
    this.channels = new ChannelManager();
    this.presence = new PresenceTracker();
    this.messageQueue = new MessageQueue(100);
    this.rateLimiter = new WSRateLimiter(50, 10000);
    this.stats = {
      totalConnections: 0,
      totalMessages: 0,
      totalBroadcasts: 0,
      startTime: new Date(),
    };
  }

  /**
   * Initialize with Socket.IO instance
   */
  initialize(io) {
    this.io = io;

    io.on('connection', (socket) => {
      this.stats.totalConnections++;
      console.log(`[WS] Client connected: ${socket.id}`);

      // Handle authentication
      this._handleAuth(socket);

      // Handle channel subscriptions
      socket.on('channel:subscribe', (channel) => {
        if (!this.rateLimiter.check(socket.id)) return;
        this.channels.subscribe(socket.id, channel);
        socket.join(channel);
        console.log(`[WS] ${socket.id} subscribed to ${channel}`);
      });

      socket.on('channel:unsubscribe', (channel) => {
        this.channels.unsubscribe(socket.id, channel);
        socket.leave(channel);
      });

      // Handle real-time data requests
      socket.on('request:dashboard', () => {
        if (!this.rateLimiter.check(socket.id)) return;
        this.emit('dashboard:request', {
          socketId: socket.id,
          userId: this.presence.getUserBySocket(socket.id),
        });
      });

      // Handle heartbeat
      socket.on('heartbeat', () => {
        this.presence.updateLastSeen(socket.id);
        socket.emit('heartbeat:ack', { timestamp: Date.now() });
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        const userId = this.presence.setOffline(socket.id);
        this.channels.unsubscribeAll(socket.id);
        this.rateLimiter.reset(socket.id);

        if (userId) {
          this.broadcastToChannel(`user:${userId}:contacts`, WS_EVENTS.USER_OFFLINE, {
            userId,
            timestamp: new Date().toISOString(),
          });
        }

        console.log(`[WS] Client disconnected: ${socket.id} (${reason})`);
      });
    });

    console.log('[WS] Enterprise WebSocket Engine initialized');
    return this;
  }

  /**
   * Handle socket authentication
   */
  _handleAuth(socket) {
    const userId = socket.handshake?.auth?.userId || socket.handshake?.query?.userId;

    if (userId) {
      this.presence.setOnline(userId, socket.id, {
        ip: socket.handshake.address,
      });

      // Auto-subscribe to personal channel
      this.channels.subscribe(socket.id, `user:${userId}`);
      socket.join(`user:${userId}`);

      // Deliver queued messages
      const queued = this.messageQueue.dequeue(userId);
      if (queued.length > 0) {
        socket.emit('queued:messages', queued);
        console.log(`[WS] Delivered ${queued.length} queued messages to user ${userId}`);
      }

      // Notify contacts
      this.broadcastToChannel(`user:${userId}:contacts`, WS_EVENTS.USER_ONLINE, {
        userId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ============================================================================
  // Emit Methods
  // ============================================================================

  /**
   * Send event to a specific user
   */
  sendToUser(userId, event, data) {
    this.stats.totalMessages++;

    if (this.presence.isOnline(userId)) {
      const info = this.io?.to(`user:${userId}`);
      if (info) info.emit(event, this._wrapPayload(event, data));
    } else {
      // Queue for later delivery
      this.messageQueue.enqueue(userId, event, data);
    }
  }

  /**
   * Broadcast to a channel
   */
  broadcastToChannel(channel, event, data) {
    this.stats.totalBroadcasts++;
    if (this.io) {
      this.io.to(channel).emit(event, this._wrapPayload(event, data));
    }
  }

  /**
   * Broadcast to all connected clients
   */
  broadcastAll(event, data) {
    this.stats.totalBroadcasts++;
    if (this.io) {
      this.io.emit(event, this._wrapPayload(event, data));
    }
  }

  /**
   * Send to all authenticated users
   */
  broadcastToAuthenticated(event, data) {
    this.stats.totalBroadcasts++;
    const onlineUsers = this.presence.getOnlineUsers();
    for (const { userId } of onlineUsers) {
      this.sendToUser(userId, event, data);
    }
  }

  /**
   * Wrap payload with metadata
   */
  _wrapPayload(event, data) {
    return {
      event,
      data,
      timestamp: new Date().toISOString(),
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    };
  }

  // ============================================================================
  // Enterprise Event Emitters
  // ============================================================================

  /**
   * Notify about new transaction
   */
  notifyTransaction(userId, action, transaction) {
    const eventMap = {
      create: WS_EVENTS.TRANSACTION_CREATED,
      update: WS_EVENTS.TRANSACTION_UPDATED,
      delete: WS_EVENTS.TRANSACTION_DELETED,
    };

    this.sendToUser(userId, eventMap[action] || WS_EVENTS.TRANSACTION_CREATED, {
      action,
      transaction: {
        id: transaction._id || transaction.id,
        amount: transaction.amount,
        category: transaction.category,
        description: transaction.description,
        type: transaction.type,
        date: transaction.date,
      },
    });
  }

  /**
   * Notify about budget status
   */
  notifyBudgetAlert(userId, budgetData) {
    const event = budgetData.percentage >= 100
      ? WS_EVENTS.BUDGET_EXCEEDED
      : WS_EVENTS.BUDGET_WARNING;

    this.sendToUser(userId, event, {
      category: budgetData.category,
      spent: budgetData.spent,
      limit: budgetData.limit,
      percentage: budgetData.percentage,
      remaining: budgetData.limit - budgetData.spent,
    });
  }

  /**
   * Notify about goal milestone
   */
  notifyGoalMilestone(userId, goalData) {
    const event = goalData.progress >= 100
      ? WS_EVENTS.GOAL_COMPLETED
      : WS_EVENTS.GOAL_MILESTONE;

    this.sendToUser(userId, event, {
      goalName: goalData.name,
      progress: goalData.progress,
      currentAmount: goalData.currentAmount,
      targetAmount: goalData.targetAmount,
    });
  }

  /**
   * Send AI insight
   */
  notifyAIInsight(userId, insight) {
    this.sendToUser(userId, WS_EVENTS.AI_INSIGHT, insight);
  }

  /**
   * Notify anomaly detection
   */
  notifyAnomaly(userId, anomaly) {
    this.sendToUser(userId, WS_EVENTS.ANOMALY_DETECTED, anomaly);
  }

  /**
   * Notify EMI due
   */
  notifyEMIDue(userId, emiData) {
    this.sendToUser(userId, WS_EVENTS.EMI_DUE, emiData);
  }

  /**
   * Notify export ready
   */
  notifyExportReady(userId, exportData) {
    this.sendToUser(userId, WS_EVENTS.EXPORT_READY, exportData);
  }

  /**
   * System notification to all users
   */
  systemNotification(message, severity = 'info') {
    this.broadcastAll(WS_EVENTS.SYSTEM_NOTIFICATION, { message, severity });
  }

  // ============================================================================
  // Stats & Admin
  // ============================================================================

  getStats() {
    return {
      ...this.stats,
      onlineUsers: this.presence.getOnlineCount(),
      onlineUserList: this.presence.getOnlineUsers(),
      uptime: Math.floor((Date.now() - this.stats.startTime) / 1000),
      queuedMessages: 0, // Could sum all queues
    };
  }

  getPresence() {
    return {
      online: this.presence.getOnlineUsers(),
      count: this.presence.getOnlineCount(),
    };
  }
}

// ============================================================================
// § 7 — Singleton Export
// ============================================================================

const wsEngine = new EnterpriseWebSocketEngine();

module.exports = {
  wsEngine,
  WS_EVENTS,
  EnterpriseWebSocketEngine,
};
