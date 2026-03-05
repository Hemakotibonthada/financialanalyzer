const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validation');
const { generateTokens, verifyRefreshToken, rotateRefreshToken, revokeRefreshToken, revokeAllUserTokens, getIpAddress } = require('../utils/tokenUtils');
const logger = require('../utils/logger');
const gmailService = require('../services/gmailService');
const FinancialProfile = require('../models/FinancialProfile');
const { google } = require('googleapis');
const TwoFactorAuthService = require('../services/twoFactorAuthService');

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', registerValidation, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user
    const user = new User({
      name,
      email: email.toLowerCase(),
      password // Will be hashed by pre-save hook
    });

    await user.save();

    // Generate tokens (default to rememberMe for new registrations so they don't get immediately logged out)
    const ipAddress = getIpAddress(req);
    const { accessToken, refreshToken } = await generateTokens(user._id, ipAddress, true);

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', loginValidation, async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if 2FA is required
    if (TwoFactorAuthService.is2FARequired(user)) {
      // Don't generate tokens yet - require 2FA verification first
      return res.json({
        success: true,
        requires2FA: true,
        userId: user._id,
        message: 'Please provide 2FA verification code'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens with rememberMe option
    const ipAddress = getIpAddress(req);
    const { accessToken, refreshToken } = await generateTokens(user._id, ipAddress, rememberMe);

    logger.info(`User logged in: ${email}${rememberMe ? ' (remember me)' : ''}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        accessToken,
        refreshToken,
        rememberMe: !!rememberMe
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/auth/login/2fa
 * @desc    Complete login with 2FA verification
 * @access  Public
 */
router.post('/login/2fa', async (req, res) => {
  try {
    const { userId, token, useBackupCode } = req.body;

    if (!userId || !token) {
      return res.status(400).json({
        success: false,
        message: 'User ID and verification code are required'
      });
    }

    // Find user
    const user = await User.findById(userId).select('+twoFactorAuth.secret');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid user'
      });
    }

    // Verify 2FA
    let isValid = false;

    if (useBackupCode) {
      const backupCode = TwoFactorAuthService.verifyBackupCode(
        token,
        user.twoFactorAuth.backupCodes
      );

      if (backupCode) {
        backupCode.used = true;
        await user.save();
        isValid = true;
      }
    } else {
      isValid = TwoFactorAuthService.verifyToken(token, user.twoFactorAuth.secret);
    }

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const ipAddress = getIpAddress(req);
    const { accessToken, refreshToken } = await generateTokens(user._id, ipAddress);

    logger.info(`User logged in with 2FA: ${user.email}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('2FA login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('profile')
      .select('-password');

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user data'
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (revoke refresh token)
 * @access  Private
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const ipAddress = getIpAddress(req);
    
    if (refreshToken) {
      // Revoke the specific refresh token
      await revokeRefreshToken(refreshToken, ipAddress);
    }
    
    logger.info(`User logged out: ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out'
    });
  }
});

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }
    
    const ipAddress = getIpAddress(req);
    
    // Rotate refresh token (revoke old, create new)
    const { userId, newToken } = await rotateRefreshToken(refreshToken, ipAddress);
    
    // Generate new access token
    const { generateAccessToken } = require('../utils/tokenUtils');
    const accessToken = generateAccessToken(userId);
    
    logger.info(`Token refreshed for user: ${userId}`);
    
    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newToken
      }
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: error.message || 'Invalid refresh token'
    });
  }
});

/**
 * @route   POST /api/auth/revoke-token
 * @desc    Revoke a refresh token
 * @access  Private
 */
router.post('/revoke-token', authenticate, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const ipAddress = getIpAddress(req);
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }
    
    await revokeRefreshToken(refreshToken, ipAddress);
    
    res.json({
      success: true,
      message: 'Token revoked successfully'
    });
  } catch (error) {
    logger.error('Revoke token error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error revoking token'
    });
  }
});

/**
 * @route   POST /api/auth/revoke-all
 * @desc    Revoke all refresh tokens for the user
 * @access  Private
 */
router.post('/revoke-all', authenticate, async (req, res) => {
  try {
    const ipAddress = getIpAddress(req);
    await revokeAllUserTokens(req.user._id, ipAddress);
    
    logger.info(`All tokens revoked for user: ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'All tokens revoked successfully'
    });
  } catch (error) {
    logger.error('Revoke all tokens error:', error);
    res.status(500).json({
      success: false,
      message: 'Error revoking tokens'
    });
  }
});

/**
 * @route   PUT /api/auth/password
 * @desc    Change password
 * @access  Private
 */
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword; // Will be hashed by pre-save hook
    await user.save();

    logger.info(`Password changed for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password'
    });
  }
});

/**
 * @route   DELETE /api/auth/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/account', authenticate, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide password to confirm deletion'
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password'
      });
    }

    // Soft delete (deactivate)
    user.isActive = false;
    await user.save();

    logger.info(`User account deleted: ${user.email}`);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    logger.error('Account deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting account'
    });
  }
});

/**
 * @route   GET /api/auth/gmail/callback
 * @desc    Handle Gmail OAuth callback from Google
 * @access  Public (but requires valid OAuth state)
 */
router.get('/gmail/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    // Handle OAuth error
    if (error) {
      logger.error('Gmail OAuth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/profile?error=oauth_error&message=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/profile?error=no_code&message=${encodeURIComponent('No authorization code received')}`);
    }

    try {
      // Exchange code for tokens
      const tokens = await gmailService.getTokensFromCode(code);
      
      // For now, store tokens temporarily and redirect to frontend
      // The frontend will need to make a separate authenticated request to save these tokens
      const tokenData = Buffer.from(JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        scope: tokens.scope,
        token_type: tokens.token_type
      })).toString('base64');

      // Redirect to frontend with tokens (base64 encoded for security)
      return res.redirect(`${process.env.FRONTEND_URL}/profile?gmail_tokens=${tokenData}&success=true`);

    } catch (tokenError) {
      logger.error('Token exchange error:', tokenError);
      return res.redirect(`${process.env.FRONTEND_URL}/profile?error=token_exchange&message=${encodeURIComponent('Failed to exchange authorization code for tokens')}`);
    }

  } catch (error) {
    logger.error('Gmail callback error:', error);
    return res.redirect(`${process.env.FRONTEND_URL}/profile?error=callback_error&message=${encodeURIComponent('OAuth callback failed')}`);
  }
});

/**
 * @route   POST /api/auth/gmail/save-tokens
 * @desc    Save Gmail tokens for authenticated user
 * @access  Private
 */
router.post('/gmail/save-tokens', authenticate, async (req, res) => {
  try {
    logger.info('Gmail save-tokens endpoint called');
    
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      logger.error('No user found in request:', { hasUser: !!req.user, userId: req.user?._id });
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { tokens } = req.body;
    
    logger.info('Received tokens:', { 
      hasTokens: !!tokens, 
      hasAccessToken: !!(tokens?.access_token),
      hasRefreshToken: !!(tokens?.refresh_token),
      tokenType: tokens?.token_type,
      scope: tokens?.scope,
      accessTokenLength: tokens?.access_token?.length,
      refreshTokenLength: tokens?.refresh_token?.length
    });

    const grantedScopes = typeof tokens?.scope === 'string'
      ? tokens.scope.split(/[\s,]+/).filter(Boolean)
      : Array.isArray(tokens?.scope)
        ? tokens.scope
        : [];

    logger.info('Parsed Gmail scopes:', grantedScopes);

    if (!grantedScopes.includes('https://www.googleapis.com/auth/gmail.readonly')) {
      logger.warn('Gmail scopes missing read permission. Rejecting token save.');
      return res.status(400).json({
        success: false,
        message: 'Gmail authorization did not include email read access. Please remove the Financial Analyzer app from your Google Account permissions and reconnect.',
        requiresReauth: true,
        scopesGranted: grantedScopes
      });
    }
    
    // Log the first few and last few characters of the tokens for debugging (safely)
    if (tokens?.access_token) {
      const accessToken = tokens.access_token;
      logger.info('Access token format:', {
        starts: accessToken.substring(0, 10),
        ends: accessToken.substring(accessToken.length - 10),
        length: accessToken.length
      });
    }
    
    if (!tokens || !tokens.access_token) {
      logger.warn('Invalid tokens provided:', { hasTokens: !!tokens, hasAccessToken: !!(tokens?.access_token) });
      return res.status(400).json({
        success: false,
        message: 'Valid tokens are required'
      });
    }

    logger.info('Finding user profile for user:', req.user._id);

    // Update user profile with Gmail settings — use upsert to handle race conditions
    let profile;
    try {
      profile = await FinancialProfile.findOneAndUpdate(
        { userId: req.user._id },
        { $setOnInsert: { userId: req.user._id, fullName: req.user.name || 'User', monthlyIncome: 0 } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      logger.info('Profile found/created:', { userId: req.user._id });
    } catch (profileError) {
      logger.error('Error finding/creating profile:', profileError);
      throw new Error('Database error while looking up user profile');
    }

    logger.info('Setting Gmail credentials');
    // Set Gmail credentials and get user info
    try {
      gmailService.setCredentials(tokens);
      logger.info('Credentials set successfully');
      
      // Verify the OAuth2Client is properly configured
      if (!gmailService.oauth2Client) {
        throw new Error('OAuth2Client not initialized');
      }
      
      logger.info('OAuth2Client configured with credentials');
    } catch (credError) {
      logger.error('Error setting credentials:', credError);
      throw credError;
    }
    
    logger.info('Creating Gmail client');
    const gmail = google.gmail({ version: 'v1', auth: gmailService.oauth2Client });
    
    logger.info('Getting user profile from Gmail API');
    
    let userProfile;
    try {
      userProfile = await gmail.users.getProfile({ userId: 'me' });
      logger.info('Gmail profile retrieved successfully');
    } catch (gmailApiError) {
      logger.error('Gmail API Error:', {
        message: gmailApiError.message,
        code: gmailApiError.code,
        status: gmailApiError.status,
        statusText: gmailApiError.statusText,
        stack: gmailApiError.stack
      });
      
      // If it's an authentication error, provide more specific message
      if (gmailApiError.code === 401 || gmailApiError.code === 403) {
        throw new Error('Gmail authentication failed. Please re-authorize your Gmail account.');
      }
      
      throw new Error(`Gmail API call failed: ${gmailApiError.message}`);
    }
    
    if (!userProfile || !userProfile.data || !userProfile.data.emailAddress) {
      throw new Error('Invalid response from Gmail API - no email address found');
    }
    
    logger.info('Gmail profile retrieved:', userProfile.data.emailAddress);
    
    try {
      const gmailSettings = {
        isConnected: true,
        email: userProfile.data.emailAddress,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        grantedScopes,
        lastSync: null
      };
      logger.info('Gmail settings updated on profile');

      logger.info('Saving profile to database');
      await FinancialProfile.findOneAndUpdate(
        { userId: req.user._id },
        { $set: { gmailSettings } },
        { upsert: true, new: true }
      );
      logger.info('Profile saved successfully');
    } catch (profileSaveError) {
      logger.error('Error saving profile:', {
        message: profileSaveError.message,
        name: profileSaveError.name,
        code: profileSaveError.code,
        stack: profileSaveError.stack
      });
      
      if (profileSaveError.name === 'ValidationError') {
        logger.error('Validation errors:', profileSaveError.errors);
      }
      
      throw new Error('Failed to save Gmail settings to profile');
    }

    logger.info(`Gmail connected for user ${req.user._id}: ${userProfile.data.emailAddress}`);

    res.json({
      success: true,
      message: 'Gmail account connected successfully',
      email: userProfile.data.emailAddress
    });

  } catch (error) {
    logger.error('Save Gmail tokens error:', error?.message || 'Unknown error');
    logger.error('Error stack:', error?.stack || 'No stack trace');
    logger.error('Error name:', error?.name || 'Unknown');
    logger.error('Error code:', error?.code || 'Unknown');
    
    // Log specific parts of the error object
    if (error) {
      const errorProps = Object.getOwnPropertyNames(error);
      logger.error('Error properties:', errorProps);
      errorProps.forEach(prop => {
        logger.error(`Error.${prop}:`, error[prop]);
      });
    }
    
    // Also check if it's a mongoose validation error
    if (error.name === 'ValidationError') {
      logger.error('Mongoose validation errors:', error.errors);
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to save Gmail connection',
      error: process.env.NODE_ENV === 'development' ? (error?.message || 'Unknown error') : undefined,
      details: process.env.NODE_ENV === 'development' ? {
        name: error?.name,
        code: error?.code,
        stack: error?.stack
      } : undefined
    });
  }
});

module.exports = router;
