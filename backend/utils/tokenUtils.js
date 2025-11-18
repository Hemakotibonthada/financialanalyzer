const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('../models/RefreshToken');

/**
 * Generate access token with configurable expiry
 * @param {string} userId - User ID
 * @param {boolean} rememberMe - If true, token lasts for 30 days, else 7 days (default active user token)
 */
const generateAccessToken = (userId, rememberMe = false) => {
  // For active users, give them long-lived tokens so they don't get logged out
  // rememberMe: 30 days, regular: 7 days (plenty for active session)
  const expiresIn = rememberMe ? '30d' : '7d';
  
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

/**
 * Generate refresh token (long-lived: 7 days)
 */
const generateRefreshToken = async (userId, ipAddress) => {
  // Create a refresh token
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  const refreshToken = new RefreshToken({
    token,
    userId,
    expiresAt,
    createdByIp: ipAddress
  });
  
  await refreshToken.save();
  
  return token;
};

/**
 * Generate both access and refresh tokens
 * @param {string} userId - User ID
 * @param {string} ipAddress - IP address for audit trail
 * @param {boolean} rememberMe - If true, generate longer-lived tokens
 */
const generateTokens = async (userId, ipAddress, rememberMe = false) => {
  const accessToken = generateAccessToken(userId, rememberMe);
  const refreshToken = await generateRefreshToken(userId, ipAddress);
  
  return {
    accessToken,
    refreshToken
  };
};

/**
 * Verify access token
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token expired');
    }
    throw new Error('Invalid access token');
  }
};

/**
 * Verify refresh token and return user ID
 */
const verifyRefreshToken = async (token) => {
  const refreshToken = await RefreshToken.findOne({ token });
  
  if (!refreshToken) {
    throw new Error('Invalid refresh token');
  }
  
  if (!refreshToken.isActive()) {
    throw new Error('Refresh token expired or revoked');
  }
  
  return refreshToken.userId;
};

/**
 * Rotate refresh token (revoke old and create new)
 */
const rotateRefreshToken = async (oldToken, ipAddress) => {
  const refreshToken = await RefreshToken.findOne({ token: oldToken });
  
  if (!refreshToken || !refreshToken.isActive()) {
    throw new Error('Invalid refresh token');
  }
  
  const userId = refreshToken.userId;
  
  // Generate new refresh token
  const newToken = await generateRefreshToken(userId, ipAddress);
  
  // Revoke old token and link to new one
  refreshToken.isRevoked = true;
  refreshToken.revokedAt = Date.now();
  refreshToken.revokedByIp = ipAddress;
  refreshToken.replacedByToken = newToken;
  await refreshToken.save();
  
  return {
    userId,
    newToken
  };
};

/**
 * Revoke refresh token
 */
const revokeRefreshToken = async (token, ipAddress) => {
  await RefreshToken.revokeToken(token, ipAddress);
};

/**
 * Revoke all refresh tokens for a user
 */
const revokeAllUserTokens = async (userId, ipAddress) => {
  await RefreshToken.revokeAllUserTokens(userId, ipAddress);
};

/**
 * Get IP address from request
 */
const getIpAddress = (req) => {
  return req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  getIpAddress
};
