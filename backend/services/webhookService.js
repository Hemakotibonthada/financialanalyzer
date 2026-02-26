// ============================================================
// Financial Analyzer - Webhook Service
// Feature #97: Webhook management for integrations
// ============================================================

const crypto = require('crypto');

class WebhookService {
  static webhooks = new Map(); // In production, use database
  static deliveryLog = [];

  /**
   * Register a new webhook
   */
  static async registerWebhook(userId, config) {
    const {
      url,
      events = ['*'],
      secret = crypto.randomBytes(32).toString('hex'),
      description = '',
      headers = {},
      retryPolicy = { maxRetries: 3, backoffMultiplier: 2, initialDelay: 1000 },
    } = config;

    // Validate URL
    try {
      new URL(url);
    } catch {
      return { success: false, error: 'Invalid webhook URL' };
    }

    const webhook = {
      id: `wh_${crypto.randomBytes(12).toString('hex')}`,
      userId,
      url,
      events,
      secret,
      description,
      headers,
      retryPolicy,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deliveryStats: {
        totalDeliveries: 0,
        successCount: 0,
        failureCount: 0,
        lastDeliveryAt: null,
        lastStatus: null,
      },
    };

    this.webhooks.set(webhook.id, webhook);

    return {
      success: true,
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        secret: webhook.secret,
        status: webhook.status,
        createdAt: webhook.createdAt,
      },
    };
  }

  /**
   * List all webhooks for a user
   */
  static async listWebhooks(userId) {
    const userWebhooks = Array.from(this.webhooks.values())
      .filter(wh => wh.userId === userId)
      .map(wh => ({
        id: wh.id,
        url: wh.url,
        events: wh.events,
        status: wh.status,
        description: wh.description,
        deliveryStats: wh.deliveryStats,
        createdAt: wh.createdAt,
      }));

    return { success: true, webhooks: userWebhooks, count: userWebhooks.length };
  }

  /**
   * Update webhook configuration
   */
  static async updateWebhook(webhookId, userId, updates) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook || webhook.userId !== userId) {
      return { success: false, error: 'Webhook not found' };
    }

    if (updates.url) {
      try { new URL(updates.url); } catch { return { success: false, error: 'Invalid URL' }; }
      webhook.url = updates.url;
    }
    if (updates.events) webhook.events = updates.events;
    if (updates.description) webhook.description = updates.description;
    if (updates.headers) webhook.headers = updates.headers;
    if (updates.status) webhook.status = updates.status;
    webhook.updatedAt = new Date().toISOString();

    this.webhooks.set(webhookId, webhook);
    return { success: true, webhook };
  }

  /**
   * Delete a webhook
   */
  static async deleteWebhook(webhookId, userId) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook || webhook.userId !== userId) {
      return { success: false, error: 'Webhook not found' };
    }

    this.webhooks.delete(webhookId);
    return { success: true, message: 'Webhook deleted successfully' };
  }

  /**
   * Trigger webhooks for an event
   */
  static async triggerEvent(userId, eventType, payload) {
    const matchingWebhooks = Array.from(this.webhooks.values()).filter(
      wh => wh.userId === userId && wh.status === 'active' && 
        (wh.events.includes('*') || wh.events.includes(eventType))
    );

    const results = [];
    for (const webhook of matchingWebhooks) {
      const result = await this._deliverWebhook(webhook, eventType, payload);
      results.push(result);
    }

    return {
      success: true,
      event: eventType,
      deliveries: results.length,
      results,
    };
  }

  /**
   * Get delivery history for a webhook
   */
  static async getDeliveryHistory(webhookId, userId, limit = 50) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook || webhook.userId !== userId) {
      return { success: false, error: 'Webhook not found' };
    }

    const deliveries = this.deliveryLog
      .filter(d => d.webhookId === webhookId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    return {
      success: true,
      webhookId,
      deliveries,
      stats: webhook.deliveryStats,
    };
  }

  /**
   * Test a webhook endpoint
   */
  static async testWebhook(webhookId, userId) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook || webhook.userId !== userId) {
      return { success: false, error: 'Webhook not found' };
    }

    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook delivery',
        webhookId: webhook.id,
      },
    };

    const result = await this._deliverWebhook(webhook, 'webhook.test', testPayload);
    return { success: true, test: result };
  }

  /**
   * Available webhook events
   */
  static getAvailableEvents() {
    return {
      success: true,
      events: [
        // Transaction events
        { event: 'transaction.created', description: 'A new transaction is added', category: 'transactions' },
        { event: 'transaction.updated', description: 'A transaction is modified', category: 'transactions' },
        { event: 'transaction.deleted', description: 'A transaction is removed', category: 'transactions' },
        { event: 'transaction.categorized', description: 'A transaction is auto-categorized', category: 'transactions' },
        
        // Budget events
        { event: 'budget.exceeded', description: 'Spending exceeds budget limit', category: 'budget' },
        { event: 'budget.warning', description: 'Budget is 80%+ utilized', category: 'budget' },
        { event: 'budget.created', description: 'New budget is created', category: 'budget' },
        
        // Bill events
        { event: 'bill.upcoming', description: 'Bill due date approaching', category: 'bills' },
        { event: 'bill.overdue', description: 'Bill is past due date', category: 'bills' },
        { event: 'bill.paid', description: 'Bill marked as paid', category: 'bills' },
        
        // Goal events
        { event: 'goal.created', description: 'New financial goal created', category: 'goals' },
        { event: 'goal.milestone', description: 'Goal reaches a milestone (25%, 50%, 75%)', category: 'goals' },
        { event: 'goal.achieved', description: 'Financial goal is achieved', category: 'goals' },
        
        // Investment events
        { event: 'investment.updated', description: 'Investment value updated', category: 'investments' },
        { event: 'investment.alert', description: 'Significant portfolio change', category: 'investments' },
        
        // Account events
        { event: 'account.login', description: 'User logged in', category: 'account' },
        { event: 'account.settings_changed', description: 'Account settings modified', category: 'account' },
        
        // Analysis events
        { event: 'analysis.completed', description: 'Financial analysis completed', category: 'analysis' },
        { event: 'analysis.anomaly', description: 'Anomaly detected in spending', category: 'analysis' },
        
        // Export events
        { event: 'export.completed', description: 'Report/export is ready', category: 'export' },
        
        // System events
        { event: 'webhook.test', description: 'Test delivery', category: 'system' },
        { event: '*', description: 'All events', category: 'system' },
      ],
    };
  }

  // ======================== PRIVATE METHODS ========================

  static async _deliverWebhook(webhook, eventType, payload) {
    const deliveryId = `del_${crypto.randomBytes(8).toString('hex')}`;
    const timestamp = new Date().toISOString();

    // Create signature
    const signature = this._createSignature(JSON.stringify(payload), webhook.secret);

    const delivery = {
      id: deliveryId,
      webhookId: webhook.id,
      event: eventType,
      url: webhook.url,
      timestamp,
      payload,
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': eventType,
        'X-Webhook-Delivery': deliveryId,
        'X-Webhook-Timestamp': timestamp,
        ...webhook.headers,
      },
    };

    try {
      // In production, use fetch/axios to actually deliver
      // Simulating delivery
      const success = Math.random() > 0.1; // 90% success rate simulation

      delivery.response = {
        status: success ? 200 : 500,
        statusText: success ? 'OK' : 'Internal Server Error',
        duration: Math.round(Math.random() * 500 + 100),
      };
      delivery.success = success;

      // Update stats
      webhook.deliveryStats.totalDeliveries++;
      if (success) {
        webhook.deliveryStats.successCount++;
      } else {
        webhook.deliveryStats.failureCount++;
      }
      webhook.deliveryStats.lastDeliveryAt = timestamp;
      webhook.deliveryStats.lastStatus = success ? 'success' : 'failed';

    } catch (error) {
      delivery.success = false;
      delivery.error = error.message;
      webhook.deliveryStats.totalDeliveries++;
      webhook.deliveryStats.failureCount++;
    }

    this.deliveryLog.push(delivery);
    // Keep only last 1000 deliveries in memory
    if (this.deliveryLog.length > 1000) {
      this.deliveryLog = this.deliveryLog.slice(-1000);
    }

    return delivery;
  }

  static _createSignature(payload, secret) {
    return `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
  }
}

module.exports = WebhookService;
