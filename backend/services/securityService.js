const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');

class SecurityService {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    this.algorithm = 'aes-256-gcm';
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        this.algorithm,
        Buffer.from(this.encryptionKey, 'hex'),
        iv
      );

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw error;
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encrypted, iv, authTag) {
    try {
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        Buffer.from(this.encryptionKey, 'hex'),
        Buffer.from(iv, 'hex')
      );

      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw error;
    }
  }

  /**
   * Hash password
   */
  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Compare password with hash
   */
  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate 2FA secret
   */
  generate2FASecret(email) {
    const secret = speakeasy.generateSecret({
      name: `Financial Analyzer (${email})`,
      length: 32
    });

    return {
      secret: secret.base32,
      otpauth_url: secret.otpauth_url
    };
  }

  /**
   * Generate QR code for 2FA
   */
  async generate2FAQRCode(otpauth_url) {
    try {
      const qrCode = await QRCode.toDataURL(otpauth_url);
      return qrCode;
    } catch (error) {
      console.error('QR Code generation error:', error);
      throw error;
    }
  }

  /**
   * Verify 2FA token
   */
  verify2FAToken(token, secret) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps before/after for clock drift
    });
  }

  /**
   * Generate backup codes for 2FA
   */
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;
      codes.push(formatted);
    }
    return codes;
  }

  /**
   * Hash backup code for storage
   */
  async hashBackupCode(code) {
    return this.hashPassword(code);
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate API key
   */
  generateAPIKey() {
    const prefix = 'fa_'; // Financial Analyzer prefix
    const key = crypto.randomBytes(32).toString('hex');
    return `${prefix}${key}`;
  }

  /**
   * Hash API key for storage
   */
  async hashAPIKey(apiKey) {
    return this.hashPassword(apiKey);
  }

  /**
   * Verify API key
   */
  async verifyAPIKey(apiKey, hashedKey) {
    return this.comparePassword(apiKey, hashedKey);
  }

  /**
   * Generate password reset token
   */
  generatePasswordResetToken() {
    const token = this.generateSecureToken(32);
    const expiry = new Date(Date.now() + 3600000); // 1 hour

    return {
      token,
      expiry
    };
  }

  /**
   * Generate email verification token
   */
  generateEmailVerificationToken() {
    return this.generateSecureToken(32);
  }

  /**
   * Sign JWT token
   */
  signJWT(payload, expiresIn = '7d') {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
  }

  /**
   * Verify JWT token
   */
  verifyJWT(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  /**
   * Mask sensitive data (for display)
   */
  maskData(data, type = 'default') {
    if (!data) return '';

    switch (type) {
      case 'email':
        const [localPart, domain] = data.split('@');
        return `${localPart.slice(0, 2)}***@${domain}`;
      
      case 'phone':
        return `***-***-${data.slice(-4)}`;
      
      case 'card':
        return `**** **** **** ${data.slice(-4)}`;
      
      case 'account':
        return `***${data.slice(-4)}`;
      
      default:
        return `${data.slice(0, 2)}***${data.slice(-2)}`;
    }
  }

  /**
   * Sanitize user input
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    // Remove potentially dangerous characters
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  /**
   * Check password strength
   */
  checkPasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    const score = [
      password.length >= minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar
    ].filter(Boolean).length;

    let strength = 'weak';
    if (score >= 4) strength = 'strong';
    else if (score >= 3) strength = 'medium';

    return {
      strength,
      score,
      suggestions: [
        password.length < minLength && `Use at least ${minLength} characters`,
        !hasUpperCase && 'Add uppercase letters',
        !hasLowerCase && 'Add lowercase letters',
        !hasNumbers && 'Add numbers',
        !hasSpecialChar && 'Add special characters'
      ].filter(Boolean)
    };
  }

  /**
   * Rate limiting check
   */
  checkRateLimit(identifier, maxAttempts = 5, windowMs = 900000) {
    // This would typically use Redis
    // For now, using in-memory store (not suitable for production cluster)
    if (!this.rateLimitStore) {
      this.rateLimitStore = new Map();
    }

    const now = Date.now();
    const userAttempts = this.rateLimitStore.get(identifier) || [];
    
    // Filter attempts within window
    const recentAttempts = userAttempts.filter(time => now - time < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      const oldestAttempt = Math.min(...recentAttempts);
      const resetTime = oldestAttempt + windowMs;
      const waitTime = Math.ceil((resetTime - now) / 1000);
      
      return {
        allowed: false,
        resetIn: waitTime
      };
    }

    // Add current attempt
    recentAttempts.push(now);
    this.rateLimitStore.set(identifier, recentAttempts);

    return {
      allowed: true,
      remaining: maxAttempts - recentAttempts.length
    };
  }

  /**
   * Generate CSRF token
   */
  generateCSRFToken() {
    return this.generateSecureToken(32);
  }

  /**
   * Verify CSRF token
   */
  verifyCSRFToken(token, storedToken) {
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(storedToken)
    );
  }

  /**
   * Encrypt file
   */
  encryptFile(fileBuffer) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      Buffer.from(this.encryptionKey, 'hex'),
      iv
    );

    const encrypted = Buffer.concat([
      cipher.update(fileBuffer),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypt file
   */
  decryptFile(encryptedBuffer, iv, authTag) {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      Buffer.from(this.encryptionKey, 'hex'),
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    return Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final()
    ]);
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return crypto.randomBytes(32).toString('base64');
  }

  /**
   * Audit log entry creation
   */
  createAuditLog(userId, action, details, ipAddress) {
    return {
      userId,
      action,
      details,
      ipAddress,
      timestamp: new Date(),
      userAgent: details.userAgent || null
    };
  }

  /**
   * Detect suspicious activity
   */
  detectSuspiciousActivity(user, currentRequest) {
    const flags = [];

    // Check for unusual location
    if (user.lastLoginIP && user.lastLoginIP !== currentRequest.ip) {
      flags.push('different_ip');
    }

    // Check for rapid requests (could indicate bot)
    const timeSinceLastLogin = Date.now() - new Date(user.lastLoginAt).getTime();
    if (timeSinceLastLogin < 5000) { // 5 seconds
      flags.push('rapid_login');
    }

    // Check for unusual user agent
    if (user.lastUserAgent && user.lastUserAgent !== currentRequest.userAgent) {
      flags.push('different_device');
    }

    return {
      suspicious: flags.length > 0,
      flags,
      riskLevel: flags.length >= 2 ? 'high' : flags.length === 1 ? 'medium' : 'low'
    };
  }
}

module.exports = new SecurityService();
