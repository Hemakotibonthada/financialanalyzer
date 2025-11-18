const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contractType: {
    type: String,
    enum: [
      'service_agreement',
      'purchase_order',
      'lease_agreement',
      'employment_contract',
      'consulting_agreement',
      'maintenance_contract',
      'nda',
      'partnership_agreement',
      'license_agreement',
      'vendor_agreement',
      'client_agreement',
      'subscription_agreement'
    ],
    required: true
  },
  contractNumber: {
    type: String,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  parties: [{
    partyType: {
      type: String,
      enum: ['client', 'vendor', 'partner', 'employee', 'contractor', 'landlord', 'tenant']
    },
    name: String,
    companyName: String,
    contactPerson: String,
    email: String,
    phone: String,
    address: String,
    taxId: String,
    role: String
  }],
  duration: {
    startDate: { type: Date, required: true },
    endDate: Date,
    noticePeriod: Number, // days
    renewalDate: Date,
    terminationDate: Date
  },
  financialTerms: {
    contractValue: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    billingCycle: {
      type: String,
      enum: ['one_time', 'monthly', 'quarterly', 'half_yearly', 'yearly', 'milestone_based']
    },
    paymentTerms: String,
    penaltyClause: String,
    earlyTerminationFee: Number,
    securityDeposit: Number,
    advancePayment: Number
  },
  milestones: [{
    name: String,
    description: String,
    dueDate: Date,
    completionDate: Date,
    value: Number,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'delayed', 'cancelled']
    },
    deliverables: [String],
    paymentPercentage: Number
  }],
  deliverables: [{
    name: String,
    description: String,
    dueDate: Date,
    deliveryDate: Date,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'delivered', 'approved', 'rejected']
    },
    milestoneId: mongoose.Schema.Types.ObjectId
  }],
  terms: [{
    clauseNumber: String,
    title: String,
    description: String,
    category: {
      type: String,
      enum: ['payment', 'delivery', 'confidentiality', 'warranty', 'liability', 'termination', 'dispute', 'general']
    },
    isCritical: Boolean
  }],
  sla: {
    responseTime: Number, // hours
    resolutionTime: Number, // hours
    uptime: Number, // percentage
    penalties: [{
      breach: String,
      penalty: Number
    }]
  },
  renewalTerms: {
    autoRenewal: { type: Boolean, default: false },
    renewalNoticePeriod: Number, // days
    renewalType: {
      type: String,
      enum: ['automatic', 'manual', 'negotiable']
    },
    priceEscalation: Number, // percentage
    renewalHistory: [{
      renewedDate: Date,
      previousEndDate: Date,
      newEndDate: Date,
      oldValue: Number,
      newValue: Number,
      notes: String
    }]
  },
  status: {
    type: String,
    enum: ['draft', 'under_review', 'pending_approval', 'active', 'expired', 'terminated', 'renewed', 'cancelled'],
    default: 'draft'
  },
  approvals: [{
    approver: String,
    department: String,
    approvalDate: Date,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected']
    },
    comments: String
  }],
  documents: [{
    type: {
      type: String,
      enum: ['contract', 'amendment', 'annex', 'invoice', 'receipt', 'correspondence', 'other']
    },
    name: String,
    fileUrl: String,
    uploadDate: Date,
    version: String
  }],
  amendments: [{
    amendmentNumber: String,
    date: Date,
    description: String,
    changedClauses: [String],
    effectiveDate: Date,
    fileUrl: String
  }],
  alerts: [{
    alertType: {
      type: String,
      enum: ['renewal', 'expiry', 'milestone', 'payment', 'compliance']
    },
    date: Date,
    message: String,
    triggered: Boolean,
    notificationDate: Date
  }],
  compliance: [{
    requirement: String,
    status: {
      type: String,
      enum: ['compliant', 'non_compliant', 'pending_review']
    },
    checkDate: Date,
    nextReviewDate: Date,
    notes: String
  }],
  performance: {
    milestonesCompleted: Number,
    milestonesTotal: Number,
    onTimeDelivery: Boolean,
    budgetUtilization: Number, // percentage
    qualityScore: Number, // 1-5
    clientSatisfaction: Number, // 1-5
    issues: [{
      date: Date,
      description: String,
      resolution: String,
      resolvedDate: Date
    }]
  },
  tags: [String],
  notes: String
}, {
  timestamps: true
});

contractSchema.index({ userId: 1, status: 1 });
contractSchema.index({ contractNumber: 1 });
contractSchema.index({ 'duration.endDate': 1 });
contractSchema.index({ 'duration.renewalDate': 1 });

contractSchema.pre('save', function(next) {
  if (!this.contractNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.contractNumber = `CNT-${year}${month}-${random}`;
  }
  next();
});

contractSchema.methods.calculatePerformance = function() {
  const completedMilestones = this.milestones.filter(m => m.status === 'completed').length;
  this.performance.milestonesCompleted = completedMilestones;
  this.performance.milestonesTotal = this.milestones.length;
  
  if (this.milestones.length > 0) {
    this.performance.budgetUtilization = (completedMilestones / this.milestones.length) * 100;
  }
  
  const onTimeMilestones = this.milestones.filter(m => 
    m.status === 'completed' && m.completionDate <= m.dueDate
  ).length;
  
  this.performance.onTimeDelivery = (onTimeMilestones / completedMilestones) >= 0.8;
  
  return this.performance;
};

contractSchema.methods.addAmendment = function(description, changedClauses, effectiveDate) {
  const amendmentNumber = `AMD-${this.amendments.length + 1}`;
  this.amendments.push({
    amendmentNumber,
    date: new Date(),
    description,
    changedClauses,
    effectiveDate
  });
};

contractSchema.methods.renew = function(newEndDate, newValue, notes) {
  this.renewalTerms.renewalHistory.push({
    renewedDate: new Date(),
    previousEndDate: this.duration.endDate,
    newEndDate,
    oldValue: this.financialTerms.contractValue,
    newValue: newValue || this.financialTerms.contractValue,
    notes
  });
  
  this.duration.startDate = this.duration.endDate;
  this.duration.endDate = newEndDate;
  
  if (newValue) {
    this.financialTerms.contractValue = newValue;
  }
  
  this.status = 'active';
};

contractSchema.statics.getExpiringContracts = async function(userId, daysAhead = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  
  return this.find({
    userId,
    status: 'active',
    'duration.endDate': { $lte: futureDate, $gte: new Date() }
  }).sort({ 'duration.endDate': 1 });
};

contractSchema.statics.getContractSummary = async function(userId) {
  const contracts = await this.find({ userId });
  
  return {
    total: contracts.length,
    active: contracts.filter(c => c.status === 'active').length,
    expiring: contracts.filter(c => {
      const daysToExpiry = (c.duration.endDate - new Date()) / (24 * 60 * 60 * 1000);
      return c.status === 'active' && daysToExpiry <= 30 && daysToExpiry > 0;
    }).length,
    totalValue: contracts.reduce((sum, c) => sum + (c.financialTerms.contractValue || 0), 0),
    byType: contracts.reduce((acc, c) => {
      const type = c.contractType;
      if (!acc[type]) acc[type] = { count: 0, value: 0 };
      acc[type].count++;
      acc[type].value += c.financialTerms.contractValue || 0;
      return acc;
    }, {})
  };
};

const Contract = mongoose.model('Contract', contractSchema);

module.exports = Contract;
