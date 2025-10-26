const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');

/**
 * Two-Factor Authentication Service
 * Provides TOTP-based 2FA functionality
 */
class TwoFactorAuthService {
  /**
   * Generate a new 2FA secret for a user
   * @param {string} email - User's email address
   * @param {string} appName - Application name for QR code
   * @returns {Object} Secret and otpauth_url
   */
  static generateSecret(email, appName = 'Financial Analyzer') {
    const secret = speakeasy.generateSecret({
      name: `${appName} (${email})`,
      length: 32
    });

    return {
      secret: secret.base32,
      otpauth_url: secret.otpauth_url
    };
  }

  /**
   * Generate QR code for 2FA setup
   * @param {string} otpauth_url - OTP auth URL from secret generation
   * @returns {Promise<string>} Base64 encoded QR code image
   */
  static async generateQRCode(otpauth_url) {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(otpauth_url);
      return qrCodeDataUrl;
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify a TOTP token
   * @param {string} token - 6-digit TOTP token
   * @param {string} secret - Base32 encoded secret
   * @returns {boolean} True if token is valid
   */
  static verifyToken(token, secret) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps before/after for clock skew
    });
  }

  /**
   * Generate backup codes for account recovery
   * @param {number} count - Number of backup codes to generate
   * @returns {Array<string>} Array of backup codes
   */
  static generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Verify a backup code
   * @param {string} inputCode - Code provided by user
   * @param {Array} backupCodes - Array of backup code objects from database
   * @returns {Object|null} Matching backup code object or null
   */
  static verifyBackupCode(inputCode, backupCodes) {
    const normalizedInput = inputCode.toUpperCase().replace(/\s/g, '');
    
    return backupCodes.find(
      bc => bc.code === normalizedInput && !bc.used
    );
  }

  /**
   * Generate a temporary 2FA setup token
   * @returns {string} Temporary token for 2FA setup process
   */
  static generateSetupToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Format backup codes for display
   * @param {Array<string>} codes - Array of backup codes
   * @returns {Array<string>} Formatted codes (XXXX-XXXX)
   */
  static formatBackupCodes(codes) {
    return codes.map(code => {
      return code.match(/.{1,4}/g).join('-');
    });
  }

  /**
   * Check if 2FA token is required for login
   * @param {Object} user - User object from database
   * @returns {boolean} True if 2FA is enabled and verified
   */
  static is2FARequired(user) {
    return user.twoFactorAuth?.enabled && user.twoFactorAuth?.verified;
  }

  /**
   * Get time remaining for current TOTP token
   * @returns {number} Seconds remaining for current token
   */
  static getTokenTimeRemaining() {
    const step = 30; // TOTP time step in seconds
    const currentTime = Math.floor(Date.now() / 1000);
    const timeRemaining = step - (currentTime % step);
    return timeRemaining;
  }
}

module.exports = TwoFactorAuthService;
