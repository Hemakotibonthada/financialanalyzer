const express = require('express');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();
const db = admin.firestore();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
    const token = jwt.sign({ uid: userRecord.uid, email }, JWT_SECRET, { expiresIn: '30d' });
    
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
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Registration failed'
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
    
    // For Cloud Functions, we'll use Firebase Auth
    // This is a simplified version - in production, use Firebase Client SDK
    const userRecord = await admin.auth().getUserByEmail(email);
    
    // Get user profile from Firestore
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    const userData = userDoc.data();
    
    // Generate JWT token
    const token = jwt.sign({ uid: userRecord.uid, email }, JWT_SECRET, { expiresIn: '30d' });
    
    res.json({
      success: true,
      data: {
        user: {
          id: userRecord.uid,
          name: userRecord.displayName || userData?.name,
          email: userRecord.email,
          role: userData?.role || 'user'
        },
        accessToken: token,
        token,
        rememberMe: req.body.rememberMe || false
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    
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
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
});

// Save Gmail tokens (for OAuth callback)
router.post('/gmail/save-tokens', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;
    
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
