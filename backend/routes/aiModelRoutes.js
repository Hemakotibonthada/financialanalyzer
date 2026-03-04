/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  AI Model Manager Routes — Enterprise Model Registry & Self-Training
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *  Routes:
 *    GET  /api/ai-models/dashboard          – Full model management dashboard
 *    GET  /api/ai-models/registry            – List all registered models
 *    GET  /api/ai-models/registry/:name      – Get versions for a model
 *    POST /api/ai-models/train               – Train all models for current user
 *    POST /api/ai-models/train/:model        – Train a specific model
 *    GET  /api/ai-models/scheduler           – Get scheduler status
 *    POST /api/ai-models/scheduler/start     – Start auto-training scheduler
 *    POST /api/ai-models/scheduler/stop      – Stop auto-training scheduler
 *    POST /api/ai-models/learn               – Incremental learning from new data
 *    GET  /api/ai-models/drift/:name         – Get drift status for a model
 *    POST /api/ai-models/ab-test             – Create A/B test
 *    GET  /api/ai-models/ab-test/:name       – Get A/B test results
 *    POST /api/ai-models/promote             – Promote a model version
 *    GET  /api/ai-models/compare             – Compare two model versions
 *    GET  /api/ai-models/health              – System-wide AI health check
 *
 *  All routes require authentication via auth middleware.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const express = require('express');
const router = express.Router();

// Lazy-load to avoid circular dependencies
let modelRegistry = null;
let selfTrainingScheduler = null;
let localAIEngine = null;

function getModelRegistry() {
  if (!modelRegistry) {
    try {
      const mod = require('../services/ai/modelManager');
      modelRegistry = mod.modelRegistry;
    } catch (err) {
      console.warn('Model registry not available:', err.message);
    }
  }
  return modelRegistry;
}

function getScheduler() {
  if (!selfTrainingScheduler) {
    try {
      const mod = require('../services/selfTrainingScheduler');
      selfTrainingScheduler = mod.selfTrainingScheduler;
    } catch (err) {
      console.warn('Self-training scheduler not available:', err.message);
    }
  }
  return selfTrainingScheduler;
}

function getLocalAIEngine() {
  if (!localAIEngine) {
    try {
      localAIEngine = require('../services/localAIEngine');
    } catch (err) {
      console.warn('Local AI engine not available:', err.message);
    }
  }
  return localAIEngine;
}

// ──────────────────────────────────────────────────────────────────────────
//  Middleware — Auth
// ──────────────────────────────────────────────────────────────────────────

let authMiddleware;
try {
  authMiddleware = require('../middleware/auth');
} catch {
  // Fallback: pass through
  authMiddleware = (req, res, next) => next();
}

router.use(authMiddleware);

// ──────────────────────────────────────────────────────────────────────────
//  GET  /dashboard — Full dashboard data
// ──────────────────────────────────────────────────────────────────────────

router.get('/dashboard', async (req, res) => {
  try {
    const scheduler = getScheduler();
    const registry = getModelRegistry();

    const dashboardData = scheduler
      ? scheduler.getDashboard()
      : { scheduler: { isRunning: false }, models: registry ? registry.getDashboard() : {} };

    res.json({
      success: true,
      ...dashboardData,
      system: {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        nodeVersion: process.version,
      },
    });
  } catch (error) {
    console.error('AI Models dashboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
//  GET  /registry — List all registered models
// ──────────────────────────────────────────────────────────────────────────

router.get('/registry', async (req, res) => {
  try {
    const registry = getModelRegistry();
    if (!registry) {
      return res.json({ success: true, models: {}, message: 'Registry not initialized' });
    }

    const dashboard = registry.getDashboard();
    res.json({ success: true, ...dashboard });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
//  GET  /registry/:name — Get versions for a specific model
// ──────────────────────────────────────────────────────────────────────────

router.get('/registry/:name', async (req, res) => {
  try {
    const registry = getModelRegistry();
    if (!registry) {
      return res.json({ success: true, versions: [] });
    }

    const versions = registry.getModelVersions(req.params.name);
    const active = registry.getActiveModel(req.params.name);

    res.json({
      success: true,
      modelName: req.params.name,
      activeVersion: active?.version || null,
      versions,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
//  POST /train — Train all models for current user
// ──────────────────────────────────────────────────────────────────────────

router.post('/train', async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || 'default';
    const scheduler = getScheduler();
    const engine = getLocalAIEngine();

    if (scheduler) {
      // Use the enterprise scheduler
      const Transaction = require('mongoose').model('Transaction');
      const dataFetcher = async () => {
        const transactions = await Transaction.find({ userId })
          .sort({ date: -1 })
          .limit(5000)
          .lean();
        return { transactions };
      };

      const result = await scheduler.trainAllForUser(userId, dataFetcher);

      res.json({
        success: true,
        message: `Queued ${result.count} training jobs`,
        ...result,
      });
    } else if (engine) {
      // Fallback to basic training
      const result = await engine.trainModels(userId);
      res.json({ success: true, ...result });
    } else {
      res.json({ success: false, message: 'No AI training engine available' });
    }
  } catch (error) {
    console.error('Training error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
//  POST /train/:model — Train a specific model
// ──────────────────────────────────────────────────────────────────────────

router.post('/train/:model', async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || 'default';
    const modelName = req.params.model;
    const scheduler = getScheduler();

    if (scheduler) {
      const Transaction = require('mongoose').model('Transaction');
      const transactions = await Transaction.find({ userId })
        .sort({ date: -1 })
        .limit(5000)
        .lean();

      const job = scheduler.submitJob({
        modelName,
        userId,
        type: 'batch',
        priority: 2,
        data: { transactions },
      });

      res.json({
        success: true,
        jobId: job.id,
        modelName,
        message: `Training job queued for ${modelName}`,
      });
    } else {
      res.json({ success: false, message: 'Scheduler not available' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
//  GET  /scheduler — Scheduler status
// ──────────────────────────────────────────────────────────────────────────

router.get('/scheduler', async (req, res) => {
  try {
    const scheduler = getScheduler();
    if (!scheduler) {
      return res.json({ success: true, status: null, message: 'Scheduler not initialized' });
    }

    res.json({ success: true, ...scheduler.getStatus() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
//  POST /scheduler/start — Start auto-training
// ──────────────────────────────────────────────────────────────────────────

router.post('/scheduler/start', async (req, res) => {
  try {
    const scheduler = getScheduler();
    if (!scheduler) {
      return res.json({ success: false, message: 'Scheduler not initialized' });
    }

    const intervalMs = req.body.intervalMs || 30 * 60 * 1000; // Default 30 min
    scheduler.start(intervalMs);

    res.json({
      success: true,
      message: `Scheduler started with ${intervalMs / 1000}s interval`,
      status: scheduler.getStatus(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
//  POST /scheduler/stop — Stop auto-training
// ──────────────────────────────────────────────────────────────────────────

router.post('/scheduler/stop', async (req, res) => {
  try {
    const scheduler = getScheduler();
    if (!scheduler) {
      return res.json({ success: false, message: 'Scheduler not initialized' });
    }

    scheduler.stop();
    res.json({ success: true, message: 'Scheduler stopped' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
//  POST /learn — Incremental learning from new transactions
// ──────────────────────────────────────────────────────────────────────────

router.post('/learn', async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || 'default';
    const { transactions } = req.body;
    const scheduler = getScheduler();

    if (!scheduler) {
      return res.json({ success: false, message: 'Scheduler not initialized' });
    }

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ success: false, error: 'Transactions array required' });
    }

    const result = await scheduler.learnIncremental(userId, transactions);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
//  GET  /drift/:name — Model drift status
// ──────────────────────────────────────────────────────────────────────────

router.get('/drift/:name', async (req, res) => {
  try {
    const registry = getModelRegistry();
    if (!registry) {
      return res.json({ success: true, drift: null });
    }

    const driftDetector = registry.driftDetectors.get(req.params.name);
    if (!driftDetector) {
      return res.json({ success: true, drift: null, message: `No drift detector for ${req.params.name}` });
    }

    res.json({ success: true, drift: driftDetector.getDriftSummary() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
//  POST /ab-test — Create an A/B test
// ──────────────────────────────────────────────────────────────────────────

router.post('/ab-test', async (req, res) => {
  try {
    const registry = getModelRegistry();
    if (!registry) {
      return res.json({ success: false, message: 'Registry not initialized' });
    }

    const { testName, modelA, modelB, trafficSplit } = req.body;
    if (!testName || !modelA || !modelB) {
      return res.status(400).json({ success: false, error: 'testName, modelA, and modelB required' });
    }

    const test = registry.abTestManager.createTest(testName, modelA, modelB, trafficSplit || 0.5);
    res.json({ success: true, test });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
//  GET  /ab-test/:name — A/B test results
// ──────────────────────────────────────────────────────────────────────────

router.get('/ab-test/:name', async (req, res) => {
  try {
    const registry = getModelRegistry();
    if (!registry) {
      return res.json({ success: true, test: null });
    }

    const results = registry.abTestManager.getTestResults(req.params.name);
    res.json({ success: true, ...results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
//  POST /promote — Promote a model version to production
// ──────────────────────────────────────────────────────────────────────────

router.post('/promote', async (req, res) => {
  try {
    const registry = getModelRegistry();
    if (!registry) {
      return res.json({ success: false, message: 'Registry not initialized' });
    }

    const { modelName, version } = req.body;
    if (!modelName || !version) {
      return res.status(400).json({ success: false, error: 'modelName and version required' });
    }

    const model = registry.promoteToProduction(modelName, version);
    res.json({ success: true, model: model.serialize(), message: `${modelName} v${version} promoted to production` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
//  GET  /compare — Compare two model versions
// ──────────────────────────────────────────────────────────────────────────

router.get('/compare', async (req, res) => {
  try {
    const registry = getModelRegistry();
    if (!registry) {
      return res.json({ success: true, comparison: null });
    }

    const { model, versionA, versionB } = req.query;
    if (!model || !versionA || !versionB) {
      return res.status(400).json({ success: false, error: 'model, versionA, versionB query params required' });
    }

    const comparison = registry.compareModels(model, versionA, versionB);
    res.json({ success: true, ...comparison });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
//  GET  /health — System-wide AI health check
// ──────────────────────────────────────────────────────────────────────────

router.get('/health', async (req, res) => {
  try {
    const registry = getModelRegistry();
    const scheduler = getScheduler();
    const engine = getLocalAIEngine();

    const health = {
      registry: !!registry,
      scheduler: scheduler ? { running: scheduler.isRunning, queueLength: scheduler.queue.length } : null,
      engine: !!engine,
      models: registry ? Object.fromEntries(
        [...registry.activeModels.entries()].map(([name, model]) => [
          name,
          { version: model.version, status: model.status, metrics: model.metrics },
        ])
      ) : {},
      memory: process.memoryUsage(),
      uptime: process.uptime(),
    };

    // Overall health status
    const activeModelCount = registry ? registry.activeModels.size : 0;
    health.overallStatus = activeModelCount >= 3 ? 'healthy' : activeModelCount >= 1 ? 'partial' : 'uninitialized';

    res.json({ success: true, ...health });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
