const mongoose = require('mongoose');

const {
  DOCUMENT_TYPE,
  DOCUMENT_STATUS,
  SUPPORT_ROLES,
  maskValue
} = require('../constants/legacyConstants');

const estateDocumentSchema = new mongoose.Schema({
  estateCaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EstateCase',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  documentType: {
    type: String,
    enum: DOCUMENT_TYPE,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: DOCUMENT_STATUS,
    default: 'pending',
    index: true
  },
  fileName: {
    type: String,
    required: true,
    trim: true
  },
  filePath: {
    type: String,
    required: true,
    trim: true,
    select: false
  },
  mimeType: {
    type: String,
    trim: true
  },
  sizeBytes: {
    type: Number,
    default: 0,
    min: 0
  },
  checksumSha256: {
    type: String,
    trim: true,
    index: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  uploadedByRole: {
    type: String,
    enum: SUPPORT_ROLES,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  issuedBy: {
    type: String,
    trim: true
  },
  issueDate: {
    type: Date
  },
  expiryDate: {
    type: Date,
    index: true
  },
  documentNumberMasked: {
    type: String,
    trim: true
  },
  isSensitive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

estateDocumentSchema.index({ userId: 1, status: 1 });
estateDocumentSchema.index({ estateCaseId: 1, documentType: 1 });
estateDocumentSchema.index({ estateCaseId: 1, status: 1 });
estateDocumentSchema.index({ checksumSha256: 1, estateCaseId: 1 });
estateDocumentSchema.index({ expiryDate: 1, status: 1 });

estateDocumentSchema.virtual('isExpired').get(function() {
  return Boolean(this.expiryDate && new Date() > this.expiryDate);
});

estateDocumentSchema.virtual('isReviewed').get(function() {
  return ['verified', 'rejected', 'expired'].includes(this.status);
});

estateDocumentSchema.virtual('ageDays').get(function() {
  if (!this.uploadedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(this.uploadedAt).getTime()) / 86400000));
});

estateDocumentSchema.set('toJSON', { virtuals: true });
estateDocumentSchema.set('toObject', { virtuals: true });

estateDocumentSchema.pre('save', function(next) {
  if (this.documentNumberMasked) {
    this.documentNumberMasked = maskValue(this.documentNumberMasked);
  }
  if (this.expiryDate && new Date() > this.expiryDate && this.status !== 'verified') {
    this.status = 'expired';
  }
  next();
});

estateDocumentSchema.methods.markUnderReview = function(actorId) {
  this.status = 'under_review';
  this.reviewedBy = actorId;
  this.reviewedAt = new Date();
  return this.save();
};

estateDocumentSchema.methods.verify = function(actorId) {
  this.status = 'verified';
  this.reviewedBy = actorId;
  this.reviewedAt = new Date();
  this.rejectionReason = undefined;
  return this.save();
};

estateDocumentSchema.methods.reject = function(actorId, reason) {
  this.status = 'rejected';
  this.reviewedBy = actorId;
  this.reviewedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

estateDocumentSchema.methods.updateDocumentNumber = function(rawValue) {
  this.documentNumberMasked = maskValue(rawValue);
  return this;
};

estateDocumentSchema.statics.getRequiredMissing = async function(estateCaseId, requiredTypes) {
  const documents = await this.find({
    estateCaseId,
    documentType: { $in: requiredTypes },
    status: 'verified'
  }).select('documentType').lean();
  const present = new Set(documents.map(doc => doc.documentType));
  return requiredTypes.filter(type => !present.has(type));
};

estateDocumentSchema.statics.getCaseDocuments = function(estateCaseId, filters = {}) {
  const query = { estateCaseId };
  if (filters.status) query.status = filters.status;
  if (filters.documentType) query.documentType = filters.documentType;
  return this.find(query).sort({ uploadedAt: -1 });
};

estateDocumentSchema.statics.getReviewQueue = function(limit = 100) {
  return this.find({ status: { $in: ['uploaded', 'under_review'] } })
    .sort({ uploadedAt: 1 })
    .limit(limit);
};

module.exports = mongoose.model('EstateDocument', estateDocumentSchema);
