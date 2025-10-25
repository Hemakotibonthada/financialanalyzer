const logger = require('../utils/logger');

class WebSocketService {
  constructor() {
    this.io = null;
  }

  initialize(io) {
    this.io = io;
    logger.info('📡 WebSocket service initialized');
  }

  // Emit document processing status update
  emitDocumentStatus(userId, documentId, status, data = {}) {
    if (!this.io) {
      logger.warn('WebSocket service not initialized');
      return;
    }

    const update = {
      type: 'document_status',
      documentId,
      status,
      timestamp: new Date(),
      ...data
    };

    this.io.to(`user-${userId}`).emit('document_update', update);
    logger.info(`📄 Emitted document status for user ${userId}: ${status}`);
  }

  // Emit transaction processing update
  emitTransactionUpdate(userId, data) {
    if (!this.io) {
      logger.warn('WebSocket service not initialized');
      return;
    }

    const update = {
      type: 'transaction_update',
      timestamp: new Date(),
      ...data
    };

    this.io.to(`user-${userId}`).emit('transaction_update', update);
    logger.info(`💳 Emitted transaction update for user ${userId}`);
  }

  // Emit analysis progress update
  emitAnalysisProgress(userId, analysisId, progress, stage) {
    if (!this.io) {
      logger.warn('WebSocket service not initialized');
      return;
    }

    const update = {
      type: 'analysis_progress',
      analysisId,
      progress,
      stage,
      timestamp: new Date()
    };

    this.io.to(`user-${userId}`).emit('analysis_update', update);
    logger.info(`📊 Emitted analysis progress for user ${userId}: ${progress}% - ${stage}`);
  }

  // Emit analysis completion
  emitAnalysisComplete(userId, analysisId, report) {
    if (!this.io) {
      logger.warn('WebSocket service not initialized');
      return;
    }

    const update = {
      type: 'analysis_complete',
      analysisId,
      report,
      timestamp: new Date()
    };

    this.io.to(`user-${userId}`).emit('analysis_complete', update);
    logger.info(`✅ Emitted analysis completion for user ${userId}`);
  }

  // Emit dashboard data update
  emitDashboardUpdate(userId, data) {
    if (!this.io) {
      logger.warn('WebSocket service not initialized');
      return;
    }

    const update = {
      type: 'dashboard_update',
      data,
      timestamp: new Date()
    };

    this.io.to(`user-${userId}`).emit('dashboard_update', update);
    logger.info(`📈 Emitted dashboard update for user ${userId}`);
  }

  // Emit error notification
  emitError(userId, error, context = '') {
    if (!this.io) {
      logger.warn('WebSocket service not initialized');
      return;
    }

    const update = {
      type: 'error',
      error: {
        message: error.message || 'An error occurred',
        code: error.code || 'UNKNOWN_ERROR',
        context
      },
      timestamp: new Date()
    };

    this.io.to(`user-${userId}`).emit('error', update);
    logger.error(`❌ Emitted error for user ${userId}: ${error.message}`);
  }

  // Emit notification
  emitNotification(userId, notification) {
    if (!this.io) {
      logger.warn('WebSocket service not initialized');
      return;
    }

    const update = {
      type: 'notification',
      notification: {
        title: notification.title,
        message: notification.message,
        level: notification.level || 'info', // info, success, warning, error
        action: notification.action || null
      },
      timestamp: new Date()
    };

    this.io.to(`user-${userId}`).emit('notification', update);
    logger.info(`🔔 Emitted notification for user ${userId}: ${notification.title}`);
  }

  // Broadcast to all connected users (admin functionality)
  broadcast(event, data) {
    if (!this.io) {
      logger.warn('WebSocket service not initialized');
      return;
    }

    this.io.emit(event, {
      ...data,
      timestamp: new Date()
    });

    logger.info(`📢 Broadcasted ${event} to all users`);
  }

  // Get connection count
  getConnectionCount() {
    if (!this.io) {
      return 0;
    }
    return this.io.engine.clientsCount;
  }

  // Get room information
  getRoomInfo(roomName) {
    if (!this.io) {
      return null;
    }
    
    const room = this.io.sockets.adapter.rooms.get(roomName);
    return room ? { size: room.size, sockets: Array.from(room) } : null;
  }
}

// Export singleton instance
module.exports = new WebSocketService();