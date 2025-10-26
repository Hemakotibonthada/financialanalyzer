const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      // Authentication
      'login', 'logout', 'register', 'password_change', '2fa_enable', '2fa_disable',
      // Transactions
      'transaction_create', 'transaction_update', 'transaction_delete', 'transaction_view',
      // Documents
      'document_upload', 'document_delete', 'document_download', 'document_analyze',
      // Profile
      'profile_update', 'profile_view', 'settings_change',
      // Financial
      'analysis_run', 'report_generate', 'export_data',
      // EMI
      'emi_create', 'emi_update', 'emi_delete', 'emi_payment_record',
      // Budget
      'budget_create', 'budget_update', 'budget_delete', 'budget_alert',
      // Gmail
      'gmail_connect', 'gmail_disconnect', 'gmail_sync',
      // CIBIL
      'cibil_refresh', 'cibil_view',
      // Admin
      'admin_action', 'user_manage',
      // Other
      'other'
    ]
  },
  resource: {
    type: String,
    enum: [
      'user', 'transaction', 'document', 'profile', 'emi', 'budget',
      'analysis', 'report', 'gmail', 'cibil', 'settings', 'other'
    ],
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    sparse: true
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OTHER'],
    uppercase: true
  },
  endpoint: {
    type: String,
    trim: true
  },
  statusCode: {
    type: Number
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },
  metadata: {
    duration: Number, // Request duration in ms
    errorMessage: String,
    errorStack: String
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info',
    index: true
  },
  isSuccess: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ resource: 1, createdAt: -1 });
activityLogSchema.index({ isSuccess: 1, severity: 1 });
activityLogSchema.index({ createdAt: -1 }); // For cleanup/archival

// TTL index - automatically delete logs older than 90 days
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

// Static method to log activity
activityLogSchema.statics.logActivity = async function(data) {
  try {
    const log = new this(data);
    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error to prevent logging from breaking the main flow
    return null;
  }
};

// Static method to get user activity summary
activityLogSchema.statics.getUserActivitySummary = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const summary = await this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        lastOccurrence: { $max: '$createdAt' },
        successCount: {
          $sum: { $cond: ['$isSuccess', 1, 0] }
        },
        errorCount: {
          $sum: { $cond: ['$isSuccess', 0, 1] }
        }
      }
    },
    { $sort: { count: -1 } }
  ]);

  return summary;
};

// Static method to get recent activities
activityLogSchema.statics.getRecentActivities = async function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('-metadata.errorStack -userAgent')
    .lean();
};

// Static method to get failed activities
activityLogSchema.statics.getFailedActivities = async function(userId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.find({
    userId,
    isSuccess: false,
    createdAt: { $gte: startDate }
  })
    .sort({ createdAt: -1 })
    .select('-metadata.errorStack')
    .lean();
};

// Virtual for formatted date
activityLogSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleString();
});

// Method to get action description
activityLogSchema.methods.getDescription = function() {
  const actionDescriptions = {
    login: 'Logged in',
    logout: 'Logged out',
    register: 'Registered account',
    transaction_create: 'Created transaction',
    transaction_update: 'Updated transaction',
    transaction_delete: 'Deleted transaction',
    document_upload: 'Uploaded document',
    analysis_run: 'Ran financial analysis',
    gmail_sync: 'Synced Gmail',
    cibil_refresh: 'Refreshed CIBIL score'
  };

  return actionDescriptions[this.action] || this.action.replace(/_/g, ' ');
};

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;
