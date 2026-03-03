// ============================================================================
// Scheduled Jobs Routes — Admin API for managing scheduled jobs
// ============================================================================
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const scheduledJobsService = require('../services/scheduledJobsService');
const logger = require('../utils/logger');

// GET /api/jobs/status — Get all job statuses
router.get('/status', authenticate, async (req, res) => {
  try {
    const status = scheduledJobsService.getJobStatus();
    res.json({ success: true, ...status });
  } catch (error) {
    logger.error('Get job status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/jobs/run/:jobName — Manually trigger a job
router.post('/run/:jobName', authenticate, async (req, res) => {
  try {
    const { jobName } = req.params;
    const result = await scheduledJobsService.runJob(jobName);
    res.json({ success: true, job: jobName, result });
  } catch (error) {
    logger.error(`Run job ${req.params.jobName} error:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/jobs/start — Start all scheduled jobs
router.post('/start', authenticate, async (req, res) => {
  try {
    scheduledJobsService.startAllJobs();
    res.json({ success: true, message: 'All jobs started' });
  } catch (error) {
    logger.error('Start jobs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/jobs/stop — Stop all scheduled jobs
router.post('/stop', authenticate, async (req, res) => {
  try {
    scheduledJobsService.stopAllJobs();
    res.json({ success: true, message: 'All jobs stopped' });
  } catch (error) {
    logger.error('Stop jobs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
