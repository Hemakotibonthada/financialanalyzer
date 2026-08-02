const express = require('express');
const admin = require('firebase-admin');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const db = admin.firestore();

const IDENTITY_TOOLKIT_SIGNIN_URL =
  'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword';

class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

// Never fall back to a hardcoded signing key: a known secret lets anyone forge
// tokens for any account.
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new ConfigurationError('JWT_SECRET is not configured');
  }
  return secret;
};

const getFirebaseApiKey = () => {
  const apiKey = process.env.FIREBASE_API_KEY || process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) {
    throw new ConfigurationError('FIREBASE_API_KEY is not configured');
  }
  return apiKey;
};

/**
 * Verify an email/password pair against Firebase Authentication.
 *
 * The Admin SDK deliberately exposes no password-checking API, so credentials
 * must be validated through the Identity Toolkit REST endpoint. Throws when the
 * credentials are rejected, so callers fail closed.
 */
const verifyPassword = async (email, password) => {
  const apiKey = getFirebaseApiKey();
  const { data } = await axios.post(
    `${IDENTITY_TOOLKIT_SIGNIN_URL}?key=${encodeURIComponent(apiKey)}`,
    { email, password, returnSecureToken: true },
    { timeout: 10000 }
  );
  return data;
};

const issueToken = (uid, email) =>
  jwt.sign({ uid, id: uid, email }, getJwtSecret(), { expiresIn: '30d' });

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password'
      });
    }
    
    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name
    });
    
    // Create user profile in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      name,
      email,
      role: 'user',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Generate JWT token
    const token = issueToken(userRecord.uid, email);
    
    res.status(201).json({
      success: true,
      data: {
        user: {
          id: userRecord.uid,
          name,
          email,
          role: 'user'
        },
        accessToken: token,
        token
      }
    });
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error('Registration configuration error:', error.message);
      return res.status(503).json({
        success: false,
        message: 'Authentication is not configured on this server'
      });
    }

    console.error('Registration error:', error);

    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    if (error.code === 'auth/invalid-password' || error.code === 'auth/invalid-email') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Validate the password before trusting the caller. Without this the
    // endpoint hands out a token to anyone who knows a registered address.
    const credentials = await verifyPassword(email, password);
    const uid = credentials.localId;

    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();

    const token = issueToken(uid, credentials.email || email);

    res.json({
      success: true,
      data: {
        user: {
          id: uid,
          name: credentials.displayName || userData?.name,
          email: credentials.email || email,
          role: userData?.role || 'user'
        },
        accessToken: token,
        token,
        rememberMe: req.body.rememberMe || false
      }
    });
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error('Login configuration error:', error.message);
      return res.status(503).json({
        success: false,
        message: 'Authentication is not configured on this server'
      });
    }

    console.error('Login error:', error.response?.data?.error?.message || error.message);
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const uid = req.user.uid || req.user.id;
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const userData = userDoc.data();
    
    res.json({
      success: true,
      data: {
        user: {
          id: userDoc.id,
          ...userData
        }
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load user'
    });
  }
});

// Save Gmail tokens (for OAuth callback)
router.post('/gmail/save-tokens', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    
    const { accessToken, refreshToken, expiryDate, email } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Access token is required'
      });
    }
    
    // Store Gmail credentials securely
    await db.collection('users').doc(userId).update({
      gmailAuth: {
        accessToken,
        refreshToken: refreshToken || null,
        expiryDate: expiryDate || null,
        email: email || null,
        connectedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      success: true,
      message: 'Gmail tokens saved successfully',
      data: {
        connected: true,
        email: email || null
      }
    });
  } catch (error) {
    console.error('Save Gmail tokens error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save Gmail tokens'
    });
  }
});

module.exports = router;
