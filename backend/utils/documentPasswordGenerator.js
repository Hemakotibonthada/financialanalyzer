/**
 * Document Password Generator Utility
 * Generates password for protected documents based on user information
 * Format: First 4 characters of username + DD + MM from DOB
 * Example: Username "johnsmith", DOB "1990-05-15" -> "john1505"
 */

/**
 * Generate document password from user information
 * @param {Object} user - User object with name
 * @param {Date} dateOfBirth - User's date of birth
 * @returns {String} Generated password
 */
const generateDocumentPassword = (user, dateOfBirth) => {
  try {
    // Get first 4 characters of username (lowercase, no spaces)
    const username = user.name || '';
    const cleanUsername = username.toLowerCase().replace(/\s+/g, '');
    const usernamePart = cleanUsername.substring(0, 4).padEnd(4, '0'); // Pad with 0 if less than 4 chars

    // Get date and month from DOB
    if (!dateOfBirth) {
      // If no DOB, use current date as fallback
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      return `${usernamePart}${day}${month}`;
    }

    const dob = new Date(dateOfBirth);
    const day = String(dob.getDate()).padStart(2, '0');
    const month = String(dob.getMonth() + 1).padStart(2, '0');

    return `${usernamePart}${day}${month}`;
  } catch (error) {
    console.error('Error generating document password:', error);
    // Fallback to a default pattern
    return 'user0101';
  }
};

/**
 * Get user password for documents
 * Fetches user profile and generates password
 * @param {String} userId - User ID
 * @param {Object} User - User model
 * @param {Object} FinancialProfile - FinancialProfile model
 * @returns {Promise<String>} Generated password
 */
const getUserDocumentPassword = async (userId, User, FinancialProfile) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const profile = await FinancialProfile.findOne({ userId });
    const dateOfBirth = profile?.dateOfBirth;

    return generateDocumentPassword(user, dateOfBirth);
  } catch (error) {
    console.error('Error getting user document password:', error);
    throw error;
  }
};

module.exports = {
  generateDocumentPassword,
  getUserDocumentPassword
};
