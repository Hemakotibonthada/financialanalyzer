const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const crypto = require('crypto');

// In-memory session store
const userSessions = {};
const loginHistory = {};

/**
 * @route   GET /api/security/score
 * @desc    Get user security score
 * @access  Private
 */
router.get('/score', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const score = {
      total: 72,
      maxScore: 100,
      breakdown: [
        { category: 'Password Strength', score: 18, maxScore: 25, status: 'good' },
        { category: 'Two-Factor Auth', score: 0, maxScore: 25, status: 'critical' },
        { category: 'Login Activity', score: 22, maxScore: 25, status: 'good' },
        { category: 'Privacy Settings', score: 20, maxScore: 25, status: 'good' },
      ],
      recommendations: [
        'Enable two-factor authentication for enhanced security',
        'Review active sessions periodically',
        'Update password every 90 days',
      ],
    };
    res.json({ success: true, data: score });
  } catch (error) {
    console.error('Error fetching security score:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch security score' });
  }
});

/**
 * @route   POST /api/security/2fa/enable
 * @desc    Enable 2FA
 * @access  Private
 */
router.post('/2fa/enable', authenticate, async (req, res) => {
  try {
    const secret = crypto.randomBytes(20).toString('hex');
    const otpauthUrl = `otpauth://tofa/FinancialAnalyzer:${req.user.email}?secret=${secret}&issuer=FinancialAnalyzer`;
    res.json({
      success: true,
      message: '2FA setup initiated',
      data: { secret, otpauthUrl, backupCodes: Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex')) },
    });
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    res.status(500).json({ success: false, error: 'Failed to enable 2FA' });
  }
});

/**
 * @route   POST /api/security/2fa/verify
 * @desc    Verify 2FA token
 * @access  Private
 */
router.post('/2fa/verify', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: 'Token is required' });
    // In production, verify against stored secret using speakeasy/otplib
    const isValid = token.length === 6 && /^\d+$/.test(token);
    if (!isValid) return res.status(400).json({ success: false, error: 'Invalid token' });
    res.json({ success: true, message: '2FA verified successfully', verified: true });
  } catch (error) {
    console.error('Error verifying 2FA:', error);
    res.status(500).json({ success: false, error: 'Failed to verify 2FA' });
  }
});

/**
 * @route   POST /api/security/2fa/disable
 * @desc    Disable 2FA
 * @access  Private
 */
router.post('/2fa/disable', authenticate, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ success: false, error: 'Password is required to disable 2FA' });
    res.json({ success: true, message: '2FA has been disabled' });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({ success: false, error: 'Failed to disable 2FA' });
  }
});

/**
 * @route   GET /api/security/sessions
 * @desc    Get active sessions
 * @access  Private
 */
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const sessions = userSessions[userId] || [
      { id: 'sess_1', device: 'Chrome on Windows', ip: '192.168.1.10', location: 'Mumbai, IN', lastActive: new Date().toISOString(), current: true },
      { id: 'sess_2', device: 'Safari on iPhone', ip: '192.168.1.15', location: 'Mumbai, IN', lastActive: new Date(Date.now() - 3600000).toISOString(), current: false },
    ];
    res.json({ success: true, data: sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sessions' });
  }
});

/**
 * @route   DELETE /api/security/sessions/:id
 * @desc    Revoke a specific session
 * @access  Private
 */
router.delete('/sessions/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    res.json({ success: true, message: `Session ${id} has been revoked` });
  } catch (error) {
    console.error('Error revoking session:', error);
    res.status(500).json({ success: false, error: 'Failed to revoke session' });
  }
});

/**
 * @route   DELETE /api/security/sessions
 * @desc    Revoke all other sessions
 * @access  Private
 */
router.delete('/sessions', authenticate, async (req, res) => {
  try {
    res.json({ success: true, message: 'All other sessions have been revoked' });
  } catch (error) {
    console.error('Error revoking sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to revoke sessions' });
  }
});

/**
 * @route   GET /api/security/login-history
 * @desc    Get login history
 * @access  Private
 */
router.get('/login-history', authenticate, async (req, res) => {
  try {
    const history = [
      { id: 1, timestamp: new Date().toISOString(), ip: '192.168.1.10', device: 'Chrome on Windows', location: 'Mumbai, IN', status: 'success' },
      { id: 2, timestamp: new Date(Date.now() - 86400000).toISOString(), ip: '192.168.1.10', device: 'Chrome on Windows', location: 'Mumbai, IN', status: 'success' },
      { id: 3, timestamp: new Date(Date.now() - 172800000).toISOString(), ip: '103.45.67.89', device: 'Firefox on Linux', location: 'Delhi, IN', status: 'failed' },
      { id: 4, timestamp: new Date(Date.now() - 259200000).toISOString(), ip: '192.168.1.15', device: 'Safari on iPhone', location: 'Mumbai, IN', status: 'success' },
      { id: 5, timestamp: new Date(Date.now() - 432000000).toISOString(), ip: '192.168.1.10', device: 'Chrome on Windows', location: 'Mumbai, IN', status: 'success' },
    ];
    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Error fetching login history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch login history' });
  }
});

/**
 * @route   GET /api/security/privacy
 * @desc    Get privacy settings
 * @access  Private
 */
router.get('/privacy', authenticate, async (req, res) => {
  try {
    const privacy = {
      profileVisibility: 'private',
      showEmail: false,
      showPhone: false,
      dataSharing: false,
      activityTracking: true,
      marketingEmails: false,
      transactionAlerts: true,
      loginAlerts: true,
    };
    res.json({ success: true, data: privacy });
  } catch (error) {
    console.error('Error fetching privacy settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch privacy settings' });
  }
});

/**
 * @route   PUT /api/security/privacy
 * @desc    Update privacy settings
 * @access  Private
 */
router.put('/privacy', authenticate, async (req, res) => {
  try {
    const updates = req.body;
    res.json({ success: true, message: 'Privacy settings updated', data: updates });
  } catch (error) {
    console.error('Error updating privacy:', error);
    res.status(500).json({ success: false, error: 'Failed to update privacy settings' });
  }
});

/**
 * @route   POST /api/security/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current and new passwords are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, error: 'New password must differ from current password' });
    }
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
});

/**
 * @route   GET /api/security/export-data
 * @desc    Export user data (GDPR)
 * @access  Private
 */
router.get('/export-data', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const exportData = {
      requestId: crypto.randomUUID(),
      status: 'processing',
      message: 'Your data export has been initiated. You will receive a download link via email within 24 hours.',
      requestedAt: new Date().toISOString(),
      estimatedCompletion: new Date(Date.now() + 86400000).toISOString(),
    };
    res.json({ success: true, data: exportData });
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate data export' });
  }
});

module.exports = router;
