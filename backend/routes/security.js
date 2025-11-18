const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const securityService = require('../services/securityService');
const User = require('../models/User');

/**
 * @route   POST /api/security/2fa/setup
 * @desc    Setup 2FA for user
 * @access  Private
 */
router.post('/2fa/setup', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA is already enabled' });
    }

    // Generate 2FA secret
    const { secret, otpauth_url } = securityService.generate2FASecret(user.email);
    
    // Generate QR code
    const qrCode = await securityService.generate2FAQRCode(otpauth_url);
    
    // Generate backup codes
    const backupCodes = securityService.generateBackupCodes();
    
    // Hash backup codes for storage
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => securityService.hashBackupCode(code))
    );

    // Store secret temporarily (will be confirmed on verification)
    user.twoFactorSecret = secret;
    user.twoFactorBackupCodes = hashedBackupCodes;
    await user.save();

    res.json({
      secret,
      qrCode,
      backupCodes // Send unhashed codes to user once
    });
  } catch (error) {
    console.error('Error setting up 2FA:', error);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

/**
 * @route   POST /api/security/2fa/verify
 * @desc    Verify and enable 2FA
 * @access  Private
 */
router.post('/2fa/verify', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ error: 'Invalid setup' });
    }

    const isValid = securityService.verify2FAToken(token, user.twoFactorSecret);

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    user.twoFactorEnabled = true;
    await user.save();

    res.json({ success: true, message: '2FA enabled successfully' });
  } catch (error) {
    console.error('Error verifying 2FA:', error);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

/**
 * @route   POST /api/security/2fa/disable
 * @desc    Disable 2FA
 * @access  Private
 */
router.post('/2fa/disable', authenticate, async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify password
    const isValidPassword = await securityService.comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Verify 2FA token or backup code
    const isValidToken = securityService.verify2FAToken(token, user.twoFactorSecret);
    
    if (!isValidToken) {
      // Check backup codes
      let isValidBackup = false;
      for (const hashedCode of user.twoFactorBackupCodes || []) {
        if (await securityService.comparePassword(token, hashedCode)) {
          isValidBackup = true;
          break;
        }
      }

      if (!isValidBackup) {
        return res.status(400).json({ error: 'Invalid token or backup code' });
      }
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorBackupCodes = undefined;
    await user.save();

    res.json({ success: true, message: '2FA disabled successfully' });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

/**
 * @route   POST /api/security/api-keys
 * @desc    Generate API key
 * @access  Private
 */
router.post('/api-keys', authenticate, async (req, res) => {
  try {
    const { name, permissions } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const apiKey = securityService.generateAPIKey();
    const hashedKey = await securityService.hashAPIKey(apiKey);

    const apiKeyData = {
      name: name || 'API Key',
      key: hashedKey,
      permissions: permissions || ['read'],
      createdAt: new Date(),
      lastUsed: null
    };

    user.apiKeys = user.apiKeys || [];
    user.apiKeys.push(apiKeyData);
    await user.save();

    // Return unhashed key only once
    res.json({
      apiKey,
      name: apiKeyData.name,
      message: 'Save this key securely. It will not be shown again.'
    });
  } catch (error) {
    console.error('Error generating API key:', error);
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

/**
 * @route   GET /api/security/api-keys
 * @desc    List API keys
 * @access  Private
 */
router.get('/api-keys', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const keys = (user.apiKeys || []).map(key => ({
      id: key._id,
      name: key.name,
      permissions: key.permissions,
      createdAt: key.createdAt,
      lastUsed: key.lastUsed,
      key: securityService.maskData(key.key.slice(-8))
    }));

    res.json(keys);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

/**
 * @route   DELETE /api/security/api-keys/:id
 * @desc    Revoke API key
 * @access  Private
 */
router.delete('/api-keys/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.apiKeys = (user.apiKeys || []).filter(key => key._id.toString() !== req.params.id);
    await user.save();

    res.json({ success: true, message: 'API key revoked' });
  } catch (error) {
    console.error('Error revoking API key:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

/**
 * @route   POST /api/security/password/check-strength
 * @desc    Check password strength
 * @access  Public
 */
router.post('/password/check-strength', (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const strength = securityService.checkPasswordStrength(password);
    res.json(strength);
  } catch (error) {
    console.error('Error checking password strength:', error);
    res.status(500).json({ error: 'Failed to check password strength' });
  }
});

/**
 * @route   POST /api/security/encrypt
 * @desc    Encrypt sensitive data
 * @access  Private
 */
router.post('/encrypt', authenticate, (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data) {
      return res.status(400).json({ error: 'Data is required' });
    }

    const encrypted = securityService.encrypt(data);
    res.json(encrypted);
  } catch (error) {
    console.error('Error encrypting data:', error);
    res.status(500).json({ error: 'Failed to encrypt data' });
  }
});

/**
 * @route   POST /api/security/decrypt
 * @desc    Decrypt sensitive data
 * @access  Private
 */
router.post('/decrypt', authenticate, (req, res) => {
  try {
    const { encrypted, iv, authTag } = req.body;
    
    if (!encrypted || !iv || !authTag) {
      return res.status(400).json({ error: 'Encrypted data, IV, and auth tag are required' });
    }

    const decrypted = securityService.decrypt(encrypted, iv, authTag);
    res.json({ data: decrypted });
  } catch (error) {
    console.error('Error decrypting data:', error);
    res.status(500).json({ error: 'Failed to decrypt data' });
  }
});

/**
 * @route   GET /api/security/sessions
 * @desc    Get active sessions
 * @access  Private
 */
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const sessions = (user.sessions || []).map(session => ({
      id: session._id,
      device: session.userAgent,
      location: session.ipAddress,
      lastActive: session.lastActive,
      current: session._id.toString() === req.sessionId
    }));

    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

/**
 * @route   DELETE /api/security/sessions/:id
 * @desc    Terminate session
 * @access  Private
 */
router.delete('/sessions/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.sessions = (user.sessions || []).filter(s => s._id.toString() !== req.params.id);
    await user.save();

    res.json({ success: true, message: 'Session terminated' });
  } catch (error) {
    console.error('Error terminating session:', error);
    res.status(500).json({ error: 'Failed to terminate session' });
  }
});

/**
 * @route   GET /api/security/audit-log
 * @desc    Get security audit log
 * @access  Private
 */
router.get('/audit-log', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const logs = user.auditLog || [];
    const recentLogs = logs.slice(-50).reverse(); // Last 50 entries

    res.json(recentLogs);
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

module.exports = router;
