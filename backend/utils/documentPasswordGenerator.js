/**
 * Document Password Generator Utility
 * Generates multiple password candidates for protected documents based on user info.
 * 
 * Banks commonly use: FirstName(4chars) + DDMM from DOB
 * Variants: lowercase, UPPERCASE, Title Case, with/without spaces
 * 
 * Example: Name "Hema Koteswar", DOB "1999-06-09"
 *   -> hema0906, HEMA0906, Hema0906, hema0609, HEMA0609,
 *      hemakoteswar0906, HEMAKOTESWAR0906, hemak0906, etc.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

/**
 * Generate all possible password variants from user info
 * @param {Object} user - User object with name
 * @param {Date|String} dateOfBirth - User's date of birth
 * @returns {String[]} Array of password candidates to try
 */
const generatePasswordCandidates = (user, dateOfBirth) => {
  const candidates = new Set();
  const name = (user?.name || user?.fullName || '').trim();
  
  if (!name) return ['user0101'];

  // Parse name parts
  const nameParts = name.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || '';
  const lastName = nameParts[nameParts.length - 1] || '';
  const fullNameNoSpaces = nameParts.join('');
  const first4 = firstName.substring(0, 4);
  const first5 = firstName.substring(0, 5);
  const first6 = firstName.substring(0, 6);

  // Parse DOB
  let dd = '01', mm = '01', yy = '00', yyyy = '2000';
  if (dateOfBirth) {
    const dob = new Date(dateOfBirth);
    if (!isNaN(dob.getTime())) {
      dd = String(dob.getDate()).padStart(2, '0');
      mm = String(dob.getMonth() + 1).padStart(2, '0');
      yy = String(dob.getFullYear()).slice(-2);
      yyyy = String(dob.getFullYear());
    }
  }

  // Generate variants for a name part + date combo
  const addVariants = (namePart, dateSuffix) => {
    if (!namePart) return;
    candidates.add(namePart.toLowerCase() + dateSuffix);
    candidates.add(namePart.toUpperCase() + dateSuffix);
    candidates.add(namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase() + dateSuffix);
  };

  // ── Primary patterns: first4 + DDMM (most common bank format) ──
  const dateFormats = [
    dd + mm,       // DDMM (0906)
    mm + dd,       // MMDD (0609)
    dd + mm + yy,  // DDMMYY (090699)
    dd + mm + yyyy,// DDMMYYYY (09061999)
    yy + mm + dd,  // YYMMDD
  ];

  for (const dateFmt of dateFormats) {
    addVariants(first4, dateFmt);
    addVariants(first5, dateFmt);
    addVariants(first6, dateFmt);
    addVariants(firstName, dateFmt);
    addVariants(fullNameNoSpaces, dateFmt);
    if (lastName !== firstName) {
      addVariants(lastName.substring(0, 4), dateFmt);
    }
  }

  // ── Additional common patterns ──
  // Just DDMMYYYY / DOB
  candidates.add(dd + mm + yyyy);
  candidates.add(dd + mm + yy);
  
  // PAN-based: first 5 chars of PAN (if available)
  // Name only
  candidates.add(firstName.toLowerCase());
  candidates.add(firstName.toUpperCase());
  candidates.add(fullNameNoSpaces.toLowerCase());
  candidates.add(fullNameNoSpaces.toUpperCase());

  // Common bank patterns: name@123, name123
  candidates.add(first4.toLowerCase() + '123');
  candidates.add(first4.toLowerCase() + '1234');
  candidates.add(firstName.toLowerCase() + '123');

  return [...candidates].filter(p => p.length >= 4);
};

/**
 * Try to unlock a password-protected PDF using generated password candidates
 * @param {String} inputPath - Path to the locked PDF
 * @param {Object} user - User object
 * @param {Date|String} dateOfBirth - DOB
 * @returns {Promise<{success: boolean, outputPath?: string, password?: string, attempts: number}>}
 */
const tryUnlockPDF = async (inputPath, user, dateOfBirth) => {
  const candidates = generatePasswordCandidates(user, dateOfBirth);
  const outputPath = inputPath.replace(/\.pdf$/i, '_unlocked.pdf');
  
  logger.info(`[PasswordUnlock] Trying ${candidates.length} password candidates for: ${path.basename(inputPath)}`);

  for (let i = 0; i < candidates.length; i++) {
    const password = candidates[i];
    try {
      execSync(
        `qpdf --password="${password}" --decrypt "${inputPath}" "${outputPath}"`,
        { timeout: 10000, stdio: 'pipe' }
      );
      
      // Verify output file exists and is valid
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        logger.info(`[PasswordUnlock] ✅ Unlocked with password "${password}" (attempt ${i + 1}/${candidates.length})`);
        return { success: true, outputPath, password, attempts: i + 1 };
      }
    } catch (err) {
      // Wrong password — continue trying
      // Clean up failed output
      try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (_) {}
    }
  }

  logger.warn(`[PasswordUnlock] ❌ Failed to unlock after ${candidates.length} attempts: ${path.basename(inputPath)}`);
  return { success: false, attempts: candidates.length };
};

/**
 * Legacy single password generation (backward compatible)
 */
const generateDocumentPassword = (user, dateOfBirth) => {
  const candidates = generatePasswordCandidates(user, dateOfBirth);
  return candidates[0] || 'user0101';
};

/**
 * Get user password for documents (legacy)
 */
const getUserDocumentPassword = async (userId, User, FinancialProfile) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    const profile = await FinancialProfile.findOne({ userId });
    return generateDocumentPassword(user, profile?.dateOfBirth);
  } catch (error) {
    logger.error('Error getting user document password:', error.message);
    throw error;
  }
};

module.exports = {
  generateDocumentPassword,
  generatePasswordCandidates,
  getUserDocumentPassword,
  tryUnlockPDF
};
