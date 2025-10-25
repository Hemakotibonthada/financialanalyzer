const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const gmailService = require('../services/gmailService');
const FinancialProfile = require('../models/FinancialProfile');
const { google } = require('googleapis');

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

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

    // Generate JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

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
        token
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
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

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

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info(`User logged in: ${email}`);

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
        token
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
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
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

    // Update user profile with Gmail settings
    let profile;
    try {
      profile = await FinancialProfile.findOne({ userId: req.user._id });
      logger.info('Profile lookup result:', { found: !!profile, userId: req.user._id });
    } catch (profileFindError) {
      logger.error('Error finding profile:', profileFindError);
      throw new Error('Database error while looking up user profile');
    }
    
    if (!profile) {
      logger.info('Creating new profile for user:', req.user._id);
      try {
        profile = new FinancialProfile({ 
          userId: req.user._id,
          fullName: req.user.name || 'User', // Required field
          monthlyIncome: 0 // Will be updated by user later
        });
        logger.info('New profile created successfully');
      } catch (profileCreateError) {
        logger.error('Error creating new profile:', profileCreateError);
        throw new Error('Failed to create user profile');
      }
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
      profile.gmailSettings = {
        isConnected: true,
        email: userProfile.data.emailAddress,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        grantedScopes,
        lastSync: null
      };
      logger.info('Gmail settings updated on profile');

      logger.info('Saving profile to database');
      await profile.save();
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
