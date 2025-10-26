const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const TwoFactorAuthService = require('../services/twoFactorAuthService');

/**
 * @route   POST /api/2fa/setup/initiate
 * @desc    Initiate 2FA setup - Generate secret and QR code
 * @access  Private
 */
router.post('/setup/initiate', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if 2FA is already enabled
    if (user.twoFactorAuth.enabled && user.twoFactorAuth.verified) {
      return res.status(400).json({ 
        message: '2FA is already enabled. Disable it first to set up again.' 
      });
    }

    // Generate new secret
    const { secret, otpauth_url } = TwoFactorAuthService.generateSecret(user.email);
    
    // Generate QR code
    const qrCode = await TwoFactorAuthService.generateQRCode(otpauth_url);

    // Save secret (but don't enable yet - requires verification)
    user.twoFactorAuth.secret = secret;
    user.twoFactorAuth.enabled = false;
    user.twoFactorAuth.verified = false;
    await user.save();

    res.json({
      message: '2FA setup initiated',
      secret: secret,
      qrCode: qrCode,
      otpauth_url: otpauth_url
    });
  } catch (error) {
    console.error('2FA setup initiation error:', error);
    res.status(500).json({ message: 'Failed to initiate 2FA setup' });
  }
});

/**
 * @route   POST /api/2fa/setup/verify
 * @desc    Verify and complete 2FA setup
 * @access  Private
 */
router.post('/setup/verify', authenticate, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || token.length !== 6) {
      return res.status(400).json({ message: 'Invalid token format' });
    }

    const user = await User.findById(req.user._id).select('+twoFactorAuth.secret');

    if (!user || !user.twoFactorAuth.secret) {
      return res.status(400).json({ 
        message: 'No 2FA setup in progress. Please initiate setup first.' 
      });
    }

    // Verify the token
    const isValid = TwoFactorAuthService.verifyToken(token, user.twoFactorAuth.secret);

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    // Generate backup codes
    const backupCodesRaw = TwoFactorAuthService.generateBackupCodes(10);
    const backupCodes = backupCodesRaw.map(code => ({
      code: code,
      used: false
    }));

    // Enable 2FA
    user.twoFactorAuth.enabled = true;
    user.twoFactorAuth.verified = true;
    user.twoFactorAuth.backupCodes = backupCodes;
    await user.save();

    // Format backup codes for display
    const formattedCodes = TwoFactorAuthService.formatBackupCodes(backupCodesRaw);

    res.json({
      message: '2FA enabled successfully',
      backupCodes: formattedCodes,
      warning: 'Save these backup codes in a safe place. You will not be able to see them again.'
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ message: 'Failed to verify 2FA setup' });
  }
});

/**
 * @route   POST /api/2fa/verify
 * @desc    Verify 2FA token during login
 * @access  Public (used during login flow)
 */
router.post('/verify', async (req, res) => {
  try {
    const { userId, token, useBackupCode } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ message: 'User ID and token are required' });
    }

    const user = await User.findById(userId).select('+twoFactorAuth.secret');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!TwoFactorAuthService.is2FARequired(user)) {
      return res.status(400).json({ message: '2FA is not enabled for this user' });
    }

    let isValid = false;

    if (useBackupCode) {
      // Verify backup code
      const backupCode = TwoFactorAuthService.verifyBackupCode(
        token, 
        user.twoFactorAuth.backupCodes
      );

      if (backupCode) {
        // Mark backup code as used
        backupCode.used = true;
        await user.save();
        isValid = true;
      }
    } else {
      // Verify TOTP token
      isValid = TwoFactorAuthService.verifyToken(token, user.twoFactorAuth.secret);
    }

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    res.json({
      success: true,
      message: '2FA verification successful'
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ message: 'Failed to verify 2FA' });
  }
});

/**
 * @route   POST /api/2fa/disable
 * @desc    Disable 2FA for the user
 * @access  Private
 */
router.post('/disable', authenticate, async (req, res) => {
  try {
    const { password, token } = req.body;

    if (!password || !token) {
      return res.status(400).json({ 
        message: 'Password and 2FA token are required to disable 2FA' 
      });
    }

    const user = await User.findById(req.user._id)
      .select('+password +twoFactorAuth.secret');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Verify 2FA token
    if (user.twoFactorAuth.enabled) {
      const isTokenValid = TwoFactorAuthService.verifyToken(
        token, 
        user.twoFactorAuth.secret
      );

      if (!isTokenValid) {
        return res.status(400).json({ message: 'Invalid 2FA token' });
      }
    }

    // Disable 2FA
    user.twoFactorAuth = {
      enabled: false,
      secret: undefined,
      backupCodes: [],
      verified: false
    };
    await user.save();

    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ message: 'Failed to disable 2FA' });
  }
});

/**
 * @route   GET /api/2fa/status
 * @desc    Get 2FA status for the user
 * @access  Private
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      enabled: user.twoFactorAuth.enabled,
      verified: user.twoFactorAuth.verified,
      backupCodesRemaining: user.twoFactorAuth.backupCodes.filter(bc => !bc.used).length
    });
  } catch (error) {
    console.error('2FA status error:', error);
    res.status(500).json({ message: 'Failed to get 2FA status' });
  }
});

/**
 * @route   POST /api/2fa/regenerate-backup-codes
 * @desc    Regenerate backup codes
 * @access  Private
 */
router.post('/regenerate-backup-codes', authenticate, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: '2FA token is required' });
    }

    const user = await User.findById(req.user._id).select('+twoFactorAuth.secret');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!TwoFactorAuthService.is2FARequired(user)) {
      return res.status(400).json({ message: '2FA is not enabled' });
    }

    // Verify token
    const isValid = TwoFactorAuthService.verifyToken(token, user.twoFactorAuth.secret);

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid 2FA token' });
    }

    // Generate new backup codes
    const backupCodesRaw = TwoFactorAuthService.generateBackupCodes(10);
    const backupCodes = backupCodesRaw.map(code => ({
      code: code,
      used: false
    }));

    user.twoFactorAuth.backupCodes = backupCodes;
    await user.save();

    const formattedCodes = TwoFactorAuthService.formatBackupCodes(backupCodesRaw);

    res.json({
      message: 'Backup codes regenerated successfully',
      backupCodes: formattedCodes,
      warning: 'Old backup codes have been invalidated. Save these new codes in a safe place.'
    });
  } catch (error) {
    console.error('Backup codes regeneration error:', error);
    res.status(500).json({ message: 'Failed to regenerate backup codes' });
  }
});

module.exports = router;
