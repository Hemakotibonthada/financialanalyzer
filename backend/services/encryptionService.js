const crypto = require('crypto');

/**
 * Encryption Service
 * Provides AES-256-GCM encryption for sensitive data
 */
class EncryptionService {
  constructor() {
    // Get encryption key from environment variable
    const encryptionKey = process.env.ENCRYPTION_KEY;
    
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }

    // Ensure key is 32 bytes for AES-256
    this.key = crypto.scryptSync(encryptionKey, 'salt', 32);
    this.algorithm = 'aes-256-gcm';
  }

  /**
   * Encrypt a string value
   * @param {string} plainText - The text to encrypt
   * @returns {string} Encrypted text in format: iv:authTag:encryptedData
   */
  encrypt(plainText) {
    if (!plainText) return null;

    try {
      // Generate random initialization vector
      const iv = crypto.randomBytes(16);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      // Encrypt the data
      let encrypted = cipher.update(plainText, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get auth tag for GCM mode
      const authTag = cipher.getAuthTag();
      
      // Return IV, auth tag, and encrypted data (all needed for decryption)
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt an encrypted string
   * @param {string} encryptedText - The encrypted text in format: iv:authTag:encryptedData
   * @returns {string} Decrypted plain text
   */
  decrypt(encryptedText) {
    if (!encryptedText) return null;

    try {
      // Split the encrypted text into components
      const parts = encryptedText.split(':');
      
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivHex, authTagHex, encrypted] = parts;
      
      // Convert hex strings back to buffers
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt the data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash a value using SHA-256 (one-way, cannot be decrypted)
   * Useful for creating searchable hashes of sensitive data
   * @param {string} value - The value to hash
   * @returns {string} Hex string of the hash
   */
  hash(value) {
    if (!value) return null;
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * Mask a credit card number for display
   * @param {string} cardNumber - Full credit card number
   * @returns {string} Masked card number (e.g., ****1234)
   */
  maskCardNumber(cardNumber) {
    if (!cardNumber) return null;
    
    const cleaned = cardNumber.replace(/\s/g, '');
    if (cleaned.length < 4) return '****';
    
    return '**** **** **** ' + cleaned.slice(-4);
  }

  /**
   * Mask an account number for display
   * @param {string} accountNumber - Full account number
   * @returns {string} Masked account number (e.g., ****5678)
   */
  maskAccountNumber(accountNumber) {
    if (!accountNumber) return null;
    
    const cleaned = accountNumber.replace(/\s/g, '');
    if (cleaned.length < 4) return '****';
    
    return '****' + cleaned.slice(-4);
  }

  /**
   * Validate if a string is encrypted (has correct format)
   * @param {string} text - Text to check
   * @returns {boolean} True if text appears to be encrypted
   */
  isEncrypted(text) {
    if (!text || typeof text !== 'string') return false;
    
    const parts = text.split(':');
    return parts.length === 3 && 
           parts[0].length === 32 && // IV length
           parts[1].length === 32;   // Auth tag length
  }

  /**
   * Encrypt an object's sensitive fields
   * @param {Object} obj - Object with fields to encrypt
   * @param {Array<string>} fields - Array of field names to encrypt
   * @returns {Object} Object with encrypted fields
   */
  encryptFields(obj, fields) {
    const encrypted = { ...obj };
    
    fields.forEach(field => {
      if (obj[field]) {
        encrypted[field] = this.encrypt(String(obj[field]));
      }
    });
    
    return encrypted;
  }

  /**
   * Decrypt an object's encrypted fields
   * @param {Object} obj - Object with encrypted fields
   * @param {Array<string>} fields - Array of field names to decrypt
   * @returns {Object} Object with decrypted fields
   */
  decryptFields(obj, fields) {
    const decrypted = { ...obj };
    
    fields.forEach(field => {
      if (obj[field] && this.isEncrypted(obj[field])) {
        try {
          decrypted[field] = this.decrypt(obj[field]);
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
          decrypted[field] = null;
        }
      }
    });
    
    return decrypted;
  }
}

// Create singleton instance
let encryptionService;

try {
  encryptionService = new EncryptionService();
} catch (error) {
  console.error('Failed to initialize encryption service:', error.message);
  // In development, you might want to use a default key
  if (process.env.NODE_ENV === 'development') {
    console.warn('Using default encryption key for development');
    process.env.ENCRYPTION_KEY = 'dev-encryption-key-change-in-production';
    encryptionService = new EncryptionService();
  } else {
    throw error;
  }
}

module.exports = encryptionService;
