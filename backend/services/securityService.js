/**
 * @fileoverview Security Management Service
 * Provides two-factor authentication, session management, login history,
 * privacy settings, password changes, and GDPR data export.
 * @module services/securityService
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const logger = require('../utils/logger');

/* ---------- Constants ---------- */

const SALT_ROUNDS = 12;
const TOTP_WINDOW = 30; // seconds
const MAX_LOGIN_HISTORY = 100;

/* ---------- Mongoose Schemas ---------- */

const twoFactorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    method: { type: String, enum: ['totp', 'sms', 'email'], default: 'totp' },
    secret: { type: String, required: true },
    backupCodes: [
      {
        code: String,
        used: { type: Boolean, default: false },
        usedAt: { type: Date },
      },
    ],
    isEnabled: { type: Boolean, default: false },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId: { type: String, required: true, unique: true },
    ip: { type: String },
    userAgent: { type: String },
    device: { type: String },
    browser: { type: String },
    os: { type: String },
    location: { type: String },
    isActive: { type: Boolean, default: true },
    lastActivityAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    revokedAt: { type: Date },
  },
  { timestamps: true }
);

const loginHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ip: { type: String },
    userAgent: { type: String },
    device: { type: String },
    browser: { type: String },
    os: { type: String },
    location: { type: String },
    success: { type: Boolean, required: true },
    failureReason: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const privacySettingsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    profileVisibility: { type: String, enum: ['public', 'private', 'friends'], default: 'private' },
    showEmail: { type: Boolean, default: false },
    showPhone: { type: Boolean, default: false },
    allowDataCollection: { type: Boolean, default: true },
    allowAnalytics: { type: Boolean, default: true },
    allowMarketing: { type: Boolean, default: false },
    dataRetentionMonths: { type: Number, default: 24 },
    showActivityStatus: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const TwoFactor = mongoose.models.TwoFactor || mongoose.model('TwoFactor', twoFactorSchema);
const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);
const LoginHistory =
  mongoose.models.LoginHistory || mongoose.model('LoginHistory', loginHistorySchema);
const PrivacySettings =
  mongoose.models.PrivacySettings || mongoose.model('PrivacySettings', privacySettingsSchema);

/* ---------- Helpers ---------- */

/**
 * Parse a User-Agent string into device / browser / OS (simplified).
 * @param {string} ua
 * @returns {{device: string, browser: string, os: string}}
 */
function parseUserAgent(ua = '') {
  const lower = ua.toLowerCase();

  let device = 'Desktop';
  if (/mobile|android|iphone|ipad/.test(lower)) device = 'Mobile';
  else if (/tablet/.test(lower)) device = 'Tablet';

  let browser = 'Unknown';
  if (/edg/.test(lower)) browser = 'Edge';
  else if (/chrome/.test(lower)) browser = 'Chrome';
  else if (/firefox/.test(lower)) browser = 'Firefox';
  else if (/safari/.test(lower)) browser = 'Safari';

  let os = 'Unknown';
  if (/windows/.test(lower)) os = 'Windows';
  else if (/mac os|macos/.test(lower)) os = 'macOS';
  else if (/linux/.test(lower)) os = 'Linux';
  else if (/android/.test(lower)) os = 'Android';
  else if (/iphone|ipad|ios/.test(lower)) os = 'iOS';

  return { device, browser, os };
}

/**
 * Generate a set of one-time backup codes.
 * @param {number} [count=8]
 * @returns {Array<{code: string, used: boolean}>}
 */
function generateBackupCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    codes.push({
      code: crypto.randomBytes(4).toString('hex').toUpperCase(),
      used: false,
    });
  }
  return codes;
}

/* ============================================================
 *  Security Service
 * ============================================================ */
const securityService = {
  /* ----------------------------------------------------------
   *  getSecurityScore
   * ---------------------------------------------------------- */
  /**
   * Calculate an overall security score (0-100) based on 2FA usage,
   * password strength indicators, recent login patterns, etc.
   * @param {string} userId
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getSecurityScore(userId) {
    try {
      if (!userId) throw new Error('userId is required');

      let score = 40; // Base score for having an account
      const recommendations = [];

      // 2FA check
      const twoFactor = await TwoFactor.findOne({ userId });
      if (twoFactor?.isEnabled) {
        score += 25;
      } else {
        recommendations.push('Enable two-factor authentication for stronger security.');
      }

      // Recent sessions check
      const activeSessions = await Session.countDocuments({ userId, isActive: true });
      if (activeSessions <= 3) {
        score += 10;
      } else {
        recommendations.push(`You have ${activeSessions} active sessions. Review and revoke unused ones.`);
      }

      // Login history — check for failed attempts
      const recentFailures = await LoginHistory.countDocuments({
        userId,
        success: false,
        timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      });
      if (recentFailures === 0) {
        score += 10;
      } else {
        recommendations.push(
          `${recentFailures} failed login attempt(s) in the past 7 days. Verify no unauthorized access.`
        );
      }

      // Privacy settings check
      const privacy = await PrivacySettings.findOne({ userId });
      if (privacy) {
        if (privacy.profileVisibility === 'private') score += 5;
        if (!privacy.showEmail) score += 5;
        if (!privacy.showPhone) score += 5;
      } else {
        recommendations.push('Configure your privacy settings for better data protection.');
      }

      score = Math.min(100, score);

      let level = 'critical';
      if (score >= 80) level = 'excellent';
      else if (score >= 60) level = 'good';
      else if (score >= 40) level = 'fair';
      else if (score >= 20) level = 'weak';

      return {
        success: true,
        data: {
          score,
          level,
          maxScore: 100,
          recommendations,
          details: {
            twoFactorEnabled: !!twoFactor?.isEnabled,
            activeSessions,
            recentFailedLogins: recentFailures,
            privacyConfigured: !!privacy,
          },
        },
      };
    } catch (error) {
      logger.error(`getSecurityScore error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  enable2FA
   * ---------------------------------------------------------- */
  /**
   * Set up two-factor authentication for a user.
   * @param {string} userId
   * @param {'totp'|'sms'|'email'} [method='totp']
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async enable2FA(userId, method = 'totp') {
    try {
      if (!userId) throw new Error('userId is required');

      const validMethods = ['totp', 'sms', 'email'];
      if (!validMethods.includes(method)) {
        throw new Error(`Invalid 2FA method. Must be one of: ${validMethods.join(', ')}`);
      }

      // Check if already enabled
      const existing = await TwoFactor.findOne({ userId });
      if (existing?.isEnabled) {
        throw new Error('Two-factor authentication is already enabled');
      }

      // Generate secret
      const secret = crypto.randomBytes(20).toString('hex');
      const backupCodes = generateBackupCodes(8);

      const twoFactor = await TwoFactor.findOneAndUpdate(
        { userId },
        {
          $set: {
            method,
            secret,
            backupCodes,
            isEnabled: false, // Enable after verification
          },
        },
        { upsert: true, new: true }
      );

      // In production, convert secret to TOTP URI / QR code
      const otpauthUrl = `otpauth://totp/FinancialAnalyzer:user?secret=${secret}&issuer=FinancialAnalyzer`;

      logger.info(`2FA setup initiated for user ${userId} via ${method}`);
      return {
        success: true,
        data: {
          method,
          secret,
          otpauthUrl,
          backupCodes: backupCodes.map((bc) => bc.code),
          message: 'Scan the QR code or enter the secret in your authenticator app, then verify with a code.',
        },
      };
    } catch (error) {
      logger.error(`enable2FA error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  verify2FA
   * ---------------------------------------------------------- */
  /**
   * Verify a 2FA code and activate two-factor if this is the setup step.
   * @param {string} userId
   * @param {string} code - OTP or backup code.
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async verify2FA(userId, code) {
    try {
      if (!userId || !code) throw new Error('userId and code are required');

      const twoFactor = await TwoFactor.findOne({ userId });
      if (!twoFactor) throw new Error('Two-factor authentication not set up');

      // Check backup codes first
      const backupIdx = twoFactor.backupCodes.findIndex(
        (bc) => bc.code === code.toUpperCase() && !bc.used
      );

      if (backupIdx >= 0) {
        twoFactor.backupCodes[backupIdx].used = true;
        twoFactor.backupCodes[backupIdx].usedAt = new Date();
        if (!twoFactor.isEnabled) {
          twoFactor.isEnabled = true;
          twoFactor.verifiedAt = new Date();
        }
        await twoFactor.save();
        logger.info(`2FA verified via backup code for user ${userId}`);
        return {
          success: true,
          data: {
            verified: true,
            method: 'backup_code',
            remainingBackupCodes: twoFactor.backupCodes.filter((bc) => !bc.used).length,
          },
        };
      }

      // Simple TOTP-like verification (time-based mock)
      // In production, use a proper TOTP library (speakeasy, otplib)
      const timeStep = Math.floor(Date.now() / 1000 / TOTP_WINDOW);
      const hash = crypto
        .createHmac('sha1', twoFactor.secret)
        .update(String(timeStep))
        .digest('hex');
      const expectedCode = hash.substring(0, 6).toUpperCase();
      const prevHash = crypto
        .createHmac('sha1', twoFactor.secret)
        .update(String(timeStep - 1))
        .digest('hex');
      const prevCode = prevHash.substring(0, 6).toUpperCase();

      const isValid = code.toUpperCase() === expectedCode || code.toUpperCase() === prevCode;

      if (!isValid) {
        throw new Error('Invalid verification code');
      }

      if (!twoFactor.isEnabled) {
        twoFactor.isEnabled = true;
        twoFactor.verifiedAt = new Date();
      }
      await twoFactor.save();

      logger.info(`2FA verified for user ${userId}`);
      return { success: true, data: { verified: true, method: twoFactor.method } };
    } catch (error) {
      logger.error(`verify2FA error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  disable2FA
   * ---------------------------------------------------------- */
  /**
   * Disable two-factor authentication after password confirmation.
   * @param {string} userId
   * @param {string} password - Current password for confirmation.
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async disable2FA(userId, password) {
    try {
      if (!userId || !password) throw new Error('userId and password are required');

      // Fetch user to validate password (assumes User model exists)
      const User = mongoose.model('User');
      const user = await User.findById(userId).select('+password');
      if (!user) throw new Error('User not found');

      const passwordValid = await bcrypt.compare(password, user.password);
      if (!passwordValid) throw new Error('Invalid password');

      const twoFactor = await TwoFactor.findOne({ userId });
      if (!twoFactor?.isEnabled) throw new Error('Two-factor authentication is not enabled');

      twoFactor.isEnabled = false;
      twoFactor.backupCodes = [];
      await twoFactor.save();

      logger.info(`2FA disabled for user ${userId}`);
      return { success: true, data: { twoFactorEnabled: false, disabledAt: new Date() } };
    } catch (error) {
      logger.error(`disable2FA error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getActiveSessions
   * ---------------------------------------------------------- */
  /**
   * List all active sessions for the user.
   * @param {string} userId
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getActiveSessions(userId) {
    try {
      if (!userId) throw new Error('userId is required');

      const sessions = await Session.find({
        userId,
        isActive: true,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      })
        .sort({ lastActivityAt: -1 })
        .lean();

      return {
        success: true,
        data: sessions.map((s) => ({
          sessionId: s.sessionId,
          device: s.device,
          browser: s.browser,
          os: s.os,
          ip: s.ip,
          location: s.location,
          lastActivity: s.lastActivityAt,
          createdAt: s.createdAt,
          isCurrent: false, // Caller should mark current session
        })),
      };
    } catch (error) {
      logger.error(`getActiveSessions error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  revokeSession
   * ---------------------------------------------------------- */
  /**
   * Revoke (log out) a specific session.
   * @param {string} userId
   * @param {string} sessionId
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async revokeSession(userId, sessionId) {
    try {
      if (!userId || !sessionId) throw new Error('userId and sessionId are required');

      const session = await Session.findOneAndUpdate(
        { userId, sessionId, isActive: true },
        { $set: { isActive: false, revokedAt: new Date() } },
        { new: true }
      );

      if (!session) throw new Error('Session not found or already revoked');

      logger.info(`Session ${sessionId} revoked for user ${userId}`);
      return { success: true, data: { sessionId, revokedAt: session.revokedAt } };
    } catch (error) {
      logger.error(`revokeSession error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  revokeAllSessions
   * ---------------------------------------------------------- */
  /**
   * Revoke all active sessions except optionally the current one.
   * @param {string} userId
   * @param {string} [exceptSessionId] - Session ID to keep active.
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async revokeAllSessions(userId, exceptSessionId) {
    try {
      if (!userId) throw new Error('userId is required');

      const query = { userId, isActive: true };
      if (exceptSessionId) {
        query.sessionId = { $ne: exceptSessionId };
      }

      const result = await Session.updateMany(query, {
        $set: { isActive: false, revokedAt: new Date() },
      });

      logger.info(`Revoked ${result.modifiedCount} sessions for user ${userId}`);
      return {
        success: true,
        data: {
          revokedCount: result.modifiedCount,
          keptSessionId: exceptSessionId || null,
        },
      };
    } catch (error) {
      logger.error(`revokeAllSessions error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getLoginHistory
   * ---------------------------------------------------------- */
  /**
   * Get recent login attempts for the user.
   * @param {string} userId
   * @param {number} [limit=20]
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getLoginHistory(userId, limit = 20) {
    try {
      if (!userId) throw new Error('userId is required');

      const safeLimit = Math.min(MAX_LOGIN_HISTORY, Math.max(1, limit));

      const history = await LoginHistory.find({ userId })
        .sort({ timestamp: -1 })
        .limit(safeLimit)
        .lean();

      return { success: true, data: history };
    } catch (error) {
      logger.error(`getLoginHistory error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  recordLoginAttempt
   * ---------------------------------------------------------- */
  /**
   * Record a login attempt in the history.
   * @param {string} userId
   * @param {string} ip - Client IP address.
   * @param {string} userAgent - Client user-agent string.
   * @param {boolean} success - Whether login succeeded.
   * @param {string} [failureReason]
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async recordLoginAttempt(userId, ip, userAgent, success, failureReason) {
    try {
      if (!userId) throw new Error('userId is required');

      const parsed = parseUserAgent(userAgent);

      const record = new LoginHistory({
        userId,
        ip: ip || 'unknown',
        userAgent: userAgent || '',
        device: parsed.device,
        browser: parsed.browser,
        os: parsed.os,
        success,
        failureReason: success ? undefined : failureReason || 'Invalid credentials',
        timestamp: new Date(),
      });

      await record.save();

      // If login succeeded, create a session
      if (success) {
        const sessionId = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        const session = new Session({
          userId,
          sessionId,
          ip: ip || 'unknown',
          userAgent: userAgent || '',
          device: parsed.device,
          browser: parsed.browser,
          os: parsed.os,
          expiresAt,
        });

        await session.save();
        logger.info(`Session created for user ${userId}: ${sessionId.substring(0, 8)}...`);

        return {
          success: true,
          data: {
            recorded: true,
            loginSuccess: true,
            sessionId,
            expiresAt,
          },
        };
      }

      logger.warn(`Failed login attempt for user ${userId} from IP ${ip}`);
      return { success: true, data: { recorded: true, loginSuccess: false } };
    } catch (error) {
      logger.error(`recordLoginAttempt error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  updatePrivacySettings
   * ---------------------------------------------------------- */
  /**
   * Update user's privacy settings.
   * @param {string} userId
   * @param {Object} settings - Partial settings to merge.
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async updatePrivacySettings(userId, settings) {
    try {
      if (!userId) throw new Error('userId is required');
      if (!settings || typeof settings !== 'object') throw new Error('Settings object is required');

      const allowedFields = [
        'profileVisibility',
        'showEmail',
        'showPhone',
        'allowDataCollection',
        'allowAnalytics',
        'allowMarketing',
        'dataRetentionMonths',
        'showActivityStatus',
      ];

      const updateFields = {};
      for (const field of allowedFields) {
        if (settings[field] !== undefined) {
          updateFields[field] = settings[field];
        }
      }

      const updated = await PrivacySettings.findOneAndUpdate(
        { userId },
        { $set: updateFields },
        { upsert: true, new: true }
      ).lean();

      logger.info(`Privacy settings updated for user ${userId}`);
      return { success: true, data: updated };
    } catch (error) {
      logger.error(`updatePrivacySettings error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getPrivacySettings
   * ---------------------------------------------------------- */
  /**
   * Retrieve user's privacy settings, returning defaults if none exist.
   * @param {string} userId
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getPrivacySettings(userId) {
    try {
      if (!userId) throw new Error('userId is required');

      let settings = await PrivacySettings.findOne({ userId }).lean();

      if (!settings) {
        settings = {
          userId,
          profileVisibility: 'private',
          showEmail: false,
          showPhone: false,
          allowDataCollection: true,
          allowAnalytics: true,
          allowMarketing: false,
          dataRetentionMonths: 24,
          showActivityStatus: true,
        };
      }

      return { success: true, data: settings };
    } catch (error) {
      logger.error(`getPrivacySettings error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  changePassword
   * ---------------------------------------------------------- */
  /**
   * Change the user's password after verifying the old one.
   * @param {string} userId
   * @param {string} oldPassword
   * @param {string} newPassword
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async changePassword(userId, oldPassword, newPassword) {
    try {
      if (!userId) throw new Error('userId is required');
      if (!oldPassword || !newPassword) throw new Error('Both old and new passwords are required');
      if (newPassword.length < 8) throw new Error('New password must be at least 8 characters');
      if (oldPassword === newPassword) throw new Error('New password must differ from the old one');

      // Strength check
      const hasUpper = /[A-Z]/.test(newPassword);
      const hasLower = /[a-z]/.test(newPassword);
      const hasDigit = /\d/.test(newPassword);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
      if (!(hasUpper && hasLower && hasDigit && hasSpecial)) {
        throw new Error(
          'Password must contain uppercase, lowercase, digit, and special character'
        );
      }

      const User = mongoose.model('User');
      const user = await User.findById(userId).select('+password');
      if (!user) throw new Error('User not found');

      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) throw new Error('Current password is incorrect');

      user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await user.save();

      logger.info(`Password changed for user ${userId}`);
      return { success: true, data: { passwordChanged: true, changedAt: new Date() } };
    } catch (error) {
      logger.error(`changePassword error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  exportUserData  (GDPR)
   * ---------------------------------------------------------- */
  /**
   * Export all user data for GDPR compliance.
   * @param {string} userId
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async exportUserData(userId) {
    try {
      if (!userId) throw new Error('userId is required');

      const objectId = new mongoose.Types.ObjectId(userId);

      // Gather data from all known collections
      const [sessions, loginHistory, privacySettings, twoFactor] = await Promise.all([
        Session.find({ userId: objectId }).lean(),
        LoginHistory.find({ userId: objectId }).sort({ timestamp: -1 }).lean(),
        PrivacySettings.findOne({ userId: objectId }).lean(),
        TwoFactor.findOne({ userId: objectId }).lean(),
      ]);

      // Redact sensitive fields
      const redactedTwoFactor = twoFactor
        ? {
            method: twoFactor.method,
            isEnabled: twoFactor.isEnabled,
            verifiedAt: twoFactor.verifiedAt,
            backupCodesRemaining: twoFactor.backupCodes
              ? twoFactor.backupCodes.filter((bc) => !bc.used).length
              : 0,
          }
        : null;

      const exportData = {
        exportedAt: new Date(),
        userId,
        security: {
          twoFactor: redactedTwoFactor,
          activeSessions: sessions.filter((s) => s.isActive).length,
          totalSessions: sessions.length,
          loginHistory: loginHistory.map((lh) => ({
            timestamp: lh.timestamp,
            ip: lh.ip,
            device: lh.device,
            browser: lh.browser,
            os: lh.os,
            success: lh.success,
          })),
        },
        privacy: privacySettings || { note: 'Using default settings' },
        _meta: {
          format: 'json',
          version: '1.0',
          generatedBy: 'FinancialAnalyzer Security Service',
        },
      };

      logger.info(`GDPR data export generated for user ${userId}`);
      return { success: true, data: exportData };
    } catch (error) {
      logger.error(`exportUserData error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },
};

module.exports = securityService;
