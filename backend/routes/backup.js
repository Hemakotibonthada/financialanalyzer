const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createGunzip } = require('zlib');
const backupService = require('../services/backupService');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

// Configure multer for backup file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.json', '.gz'];
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (ext === 'json' || ext === 'gz') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .json and .json.gz files are accepted.'));
    }
  }
});

// ==========================================
// Manual Backup Operations
// ==========================================

/**
 * POST /api/backup/create
 * Create a manual backup and save to server
 */
router.post('/create', authenticate, async (req, res) => {
  try {
    const backup = await backupService.createBackup(req.user.id, { type: 'manual' });
    const record = await backupService.saveBackupToFile(req.user.id, backup);

    res.json({
      success: true,
      message: 'Backup created successfully',
      backup: {
        id: record._id,
        filename: record.filename,
        sizeBytes: record.sizeBytes,
        totalDocuments: record.totalDocuments,
        totalCollections: record.totalCollections,
        collectionCounts: record.collectionCounts,
        createdAt: record.createdAt,
        type: record.type
      }
    });
  } catch (error) {
    logger.error('Create backup error:', error);
    res.status(500).json({ success: false, message: 'Failed to create backup', error: error.message });
  }
});

/**
 * GET /api/backup/export
 * Export backup as downloadable JSON file
 */
router.get('/export', authenticate, async (req, res) => {
  try {
    const { compressed } = req.query;
    
    let result;
    if (compressed === 'true') {
      result = await backupService.createCompressedExportBackup(req.user.id);
      res.setHeader('Content-Type', 'application/gzip');
    } else {
      result = await backupService.createExportBackup(req.user.id);
      res.setHeader('Content-Type', 'application/json');
    }

    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('X-Backup-Documents', result.metadata.totalDocuments);
    res.setHeader('X-Backup-Collections', result.metadata.totalCollections);
    res.send(result.data);
  } catch (error) {
    logger.error('Export backup error:', error);
    res.status(500).json({ success: false, message: 'Failed to export backup', error: error.message });
  }
});

/**
 * GET /api/backup/list
 * List all backups for the current user
 */
router.get('/list', authenticate, async (req, res) => {
  try {
    const backups = await backupService.listBackups(req.user.id);
    res.json({
      success: true,
      backups: backups.map(b => ({
        id: b._id,
        filename: b.filename,
        type: b.type,
        sizeBytes: b.sizeBytes,
        uncompressedSizeBytes: b.uncompressedSizeBytes,
        totalDocuments: b.totalDocuments,
        totalCollections: b.totalCollections,
        collectionCounts: b.collectionCounts,
        createdAt: b.createdAt,
        fileExists: b.fileExists
      }))
    });
  } catch (error) {
    logger.error('List backups error:', error);
    res.status(500).json({ success: false, message: 'Failed to list backups', error: error.message });
  }
});

/**
 * GET /api/backup/download/:id
 * Download a specific backup file
 */
router.get('/download/:id', authenticate, async (req, res) => {
  try {
    const backups = await backupService.listBackups(req.user.id);
    const backup = backups.find(b => b._id.toString() === req.params.id);

    if (!backup) {
      return res.status(404).json({ success: false, message: 'Backup not found' });
    }

    if (!backup.fileExists) {
      return res.status(404).json({ success: false, message: 'Backup file no longer exists on disk' });
    }

    const fs = require('fs');
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${backup.filename}"`);
    
    const fileStream = fs.createReadStream(backup.filepath);
    fileStream.pipe(res);
  } catch (error) {
    logger.error('Download backup error:', error);
    res.status(500).json({ success: false, message: 'Failed to download backup', error: error.message });
  }
});

/**
 * POST /api/backup/restore/:id
 * Restore from a server-saved backup
 */
router.post('/restore/:id', authenticate, async (req, res) => {
  try {
    const { strategy = 'merge' } = req.body; // 'merge' or 'replace'
    
    const results = await backupService.restoreFromFile(
      req.user.id,
      req.params.id,
      { strategy }
    );

    res.json({
      success: true,
      message: `Restore complete: ${results.totalRestored} documents restored`,
      results
    });
  } catch (error) {
    logger.error('Restore backup error:', error);
    res.status(500).json({ success: false, message: 'Failed to restore backup', error: error.message });
  }
});

/**
 * POST /api/backup/restore-upload
 * Restore from an uploaded backup file
 */
router.post('/restore-upload', authenticate, upload.single('backup'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No backup file uploaded' });
    }

    const { strategy = 'merge' } = req.body;
    let backupData;

    // Detect format (JSON or gzipped JSON)
    const filename = req.file.originalname.toLowerCase();
    if (filename.endsWith('.gz')) {
      // Decompress
      backupData = await new Promise((resolve, reject) => {
        const gunzip = createGunzip();
        const chunks = [];
        gunzip.on('data', chunk => chunks.push(chunk));
        gunzip.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')));
          } catch (e) {
            reject(new Error('Invalid backup file format'));
          }
        });
        gunzip.on('error', reject);
        gunzip.write(req.file.buffer);
        gunzip.end();
      });
    } else {
      backupData = JSON.parse(req.file.buffer.toString('utf-8'));
    }

    const results = await backupService.restoreFromBackup(
      req.user.id,
      backupData,
      { strategy }
    );

    res.json({
      success: true,
      message: `Restore complete: ${results.totalRestored} documents restored`,
      results
    });
  } catch (error) {
    logger.error('Restore upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to restore from uploaded backup', error: error.message });
  }
});

/**
 * DELETE /api/backup/:id
 * Delete a specific backup
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await backupService.deleteBackup(req.user.id, req.params.id);
    res.json({ success: true, message: 'Backup deleted successfully' });
  } catch (error) {
    logger.error('Delete backup error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete backup', error: error.message });
  }
});

// ==========================================
// Schedule Management
// ==========================================

/**
 * GET /api/backup/schedule
 * Get current backup schedule settings
 */
router.get('/schedule', authenticate, async (req, res) => {
  try {
    const settings = await backupService.getScheduleSettings(req.user.id);
    res.json({ success: true, schedule: settings });
  } catch (error) {
    logger.error('Get schedule error:', error);
    res.status(500).json({ success: false, message: 'Failed to get schedule settings', error: error.message });
  }
});

/**
 * PUT /api/backup/schedule
 * Update backup schedule settings
 */
router.put('/schedule', authenticate, async (req, res) => {
  try {
    const { enabled, frequency, retentionCount } = req.body;

    if (frequency && !['daily', 'weekly', 'monthly'].includes(frequency)) {
      return res.status(400).json({ success: false, message: 'Invalid frequency. Use daily, weekly, or monthly.' });
    }

    const settings = await backupService.updateScheduleSettings(req.user.id, {
      enabled: !!enabled,
      frequency: frequency || 'weekly',
      retentionCount: retentionCount || { daily: 7, weekly: 4, monthly: 6 }
    });

    res.json({
      success: true,
      message: `Backup schedule ${enabled ? 'enabled' : 'disabled'}`,
      schedule: settings
    });
  } catch (error) {
    logger.error('Update schedule error:', error);
    res.status(500).json({ success: false, message: 'Failed to update schedule settings', error: error.message });
  }
});

module.exports = router;
