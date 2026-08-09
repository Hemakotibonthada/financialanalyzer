const mongoose = require('mongoose');

/**
 * Record of every outbound email the application attempts.
 *
 * This exists because email failures were previously invisible: when SMTP was
 * misconfigured, sendMail() logged a warning to a file nobody reads and
 * returned success-ish, so an operator had no way to tell that verification and
 * OTP mail was never leaving the building.
 *
 * Every attempt is recorded - delivered, skipped or failed - so the admin
 * console can answer "did that email actually go out?" without SSH access.
 */
const emailLogSchema = new mongoose.Schema({
  to: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  // Stored separately so the console can show a recipient without exposing the
  // full address in list views or logs.
  toMasked: {
    type: String,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  // Logical template/purpose, e.g. 'verification', 'otp', 'bill_reminder'.
  template: {
    type: String,
    trim: true,
    default: 'generic',
    index: true
  },
  status: {
    type: String,
    enum: ['sent', 'skipped', 'failed'],
    required: true,
    index: true
  },
  // Why a send was skipped or failed. For 'skipped' this is almost always
  // 'smtp_not_configured'.
  reason: {
    type: String,
    trim: true
  },
  errorMessage: {
    type: String,
    trim: true
  },
  // Provider acknowledgement (nodemailer messageId / SMTP response).
  messageId: {
    type: String,
    trim: true
  },
  smtpResponse: {
    type: String,
    trim: true
  },
  provider: {
    type: String,
    trim: true,
    default: 'smtp'
  },
  host: {
    type: String,
    trim: true
  },
  fromAddress: {
    type: String,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  durationMs: {
    type: Number
  },
  // Never store the rendered HTML: verification links and OTP codes live in it,
  // and this collection is readable by admins.
  bodyPreview: {
    type: String,
    trim: true,
    maxlength: 200
  }
}, {
  timestamps: true
});

emailLogSchema.index({ createdAt: -1 });
emailLogSchema.index({ status: 1, createdAt: -1 });
emailLogSchema.index({ template: 1, createdAt: -1 });
emailLogSchema.index({ to: 1, createdAt: -1 });

// Keep 90 days. Long enough to debug a delivery complaint, short enough that
// recipient addresses are not retained indefinitely.
emailLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

emailLogSchema.virtual('wasDelivered').get(function () {
  return this.status === 'sent';
});

/**
 * Append an entry. Never throws: logging a send must not be able to break the
 * send itself, nor the request that triggered it.
 */
emailLogSchema.statics.record = async function (entry) {
  try {
    return await this.create(entry);
  } catch (error) {
    // eslint-disable-next-line global-require
    require('../utils/logger').warn(`Failed to record email log: ${error.message}`);
    return null;
  }
};

/** Counts by status over a window, for the admin dashboard header. */
emailLogSchema.statics.getSummary = async function (days = 7) {
  const since = new Date(Date.now() - days * 86400000);
  const rows = await this.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const summary = { sent: 0, skipped: 0, failed: 0, total: 0, windowDays: days };
  rows.forEach((r) => {
    summary[r._id] = r.count;
    summary.total += r.count;
  });
  return summary;
};

module.exports = mongoose.model('EmailLog', emailLogSchema);
