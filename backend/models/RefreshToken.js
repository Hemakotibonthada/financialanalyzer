const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdByIp: {
    type: String
  },
  revokedAt: {
    type: Date
  },
  revokedByIp: {
    type: String
  },
  replacedByToken: {
    type: String
  },
  isRevoked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for automatic cleanup of expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Instance method to check if token is expired
refreshTokenSchema.methods.isExpired = function() {
  return Date.now() >= this.expiresAt.getTime();
};

// Instance method to check if token is active
refreshTokenSchema.methods.isActive = function() {
  return !this.isRevoked && !this.isExpired();
};

// Static method to revoke token
refreshTokenSchema.statics.revokeToken = async function(token, ipAddress) {
  const refreshToken = await this.findOne({ token });
  
  if (!refreshToken || !refreshToken.isActive()) {
    throw new Error('Invalid token');
  }
  
  refreshToken.isRevoked = true;
  refreshToken.revokedAt = Date.now();
  refreshToken.revokedByIp = ipAddress;
  await refreshToken.save();
  
  return refreshToken;
};

// Static method to revoke all tokens for a user
refreshTokenSchema.statics.revokeAllUserTokens = async function(userId, ipAddress) {
  const result = await this.updateMany(
    { userId, isRevoked: false },
    { 
      $set: { 
        isRevoked: true, 
        revokedAt: Date.now(), 
        revokedByIp: ipAddress 
      } 
    }
  );
  
  return result;
};

// Static method to clean up old tokens
refreshTokenSchema.statics.removeOldTokens = async function() {
  const result = await this.deleteMany({
    $or: [
      { expiresAt: { $lt: Date.now() } },
      { isRevoked: true, updatedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
    ]
  });
  
  return result;
};

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
