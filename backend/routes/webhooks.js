// ============================================================
// Financial Analyzer - Webhooks Routes
// Feature #97: Webhook management API endpoints
// ============================================================

const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middleware/auth');
const WebhookService = require('../services/webhookService');

// POST /api/webhooks - Register a new webhook
router.post('/', auth, async (req, res) => {
  try {
    const result = await WebhookService.registerWebhook(req.user._id || req.user.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/webhooks - List user's webhooks
router.get('/', auth, async (req, res) => {
  try {
    const result = await WebhookService.listWebhooks(req.user._id || req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/webhooks/:id - Update a webhook
router.put('/:id', auth, async (req, res) => {
  try {
    const result = await WebhookService.updateWebhook(req.params.id, req.user._id || req.user.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/webhooks/:id - Delete a webhook
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await WebhookService.deleteWebhook(req.params.id, req.user._id || req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/webhooks/:id/test - Test a webhook
router.post('/:id/test', auth, async (req, res) => {
  try {
    const result = await WebhookService.testWebhook(req.params.id, req.user._id || req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/webhooks/:id/deliveries - Get delivery history
router.get('/:id/deliveries', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const result = await WebhookService.getDeliveryHistory(req.params.id, req.user._id || req.user.id, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/webhooks/events/available - List available events
router.get('/events/available', auth, (req, res) => {
  try {
    const result = WebhookService.getAvailableEvents();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/webhooks/aggregate - Data aggregation routes
router.get('/aggregate/dashboard', auth, async (req, res) => {
  try {
    const DataAggregationService = require('../services/dataAggregationService');
    const period = req.query.period || 'month';
    const result = await DataAggregationService.getDashboardData(req.user._id || req.user.id, period);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
