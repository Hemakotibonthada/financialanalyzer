const mongoose = require('mongoose');

const insurancePolicySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  policyType: {
    type: String,
    enum: [
      'life_term',
      'life_endowment',
      'life_ulip',
      'life_whole',
      'health_individual',
      'health_family_floater',
      'health_critical_illness',
      'health_senior_citizen',
      'vehicle_car',
      'vehicle_two_wheeler',
      'home',
      'travel',
      'personal_accident',
      'disability',
      'cyber',
      'liability',
      'professional_indemnity',
      'other'
    ],
    required: true
  },
  provider: {
    name: { type: String, required: true },
    policyNumber: { type: String, required: true },
    contact: {
      phone: String,
      email: String,
      website: String,
      claimNumber: String
    }
  },
  policyDetails: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    term: Number, // In years
    coverageAmount: { type: Number, required: true },
    premiumAmount: { type: Number, required: true },
    premiumFrequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'half_yearly', 'yearly', 'single'],
      default: 'yearly'
    },
    paymentMode: {
      type: String,
      enum: ['online', 'cheque', 'cash', 'auto_debit', 'ecs']
    },
    nextDueDate: Date,
    maturityAmount: Number,
    maturityDate: Date
  },
  insured: [{
    name: String,
    relationship: String,
    age: Number,
    sumInsured: Number,
    isMainInsured: Boolean
  }],
  nominees: [{
    name: String,
    relationship: String,
    age: Number,
    share: Number, // Percentage
    contact: String
  }],
  riders: [{
    name: String,
    type: String,
    coverage: Number,
    premium: Number,
    description: String
  }],
  benefits: [{
    type: String,
    description: String,
    amount: Number,
    conditions: String
  }],
  exclusions: [String],
  claims: [{
    claimNumber: String,
    claimDate: Date,
    claimAmount: Number,
    claimType: String,
    description: String,
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'approved', 'rejected', 'settled', 'withdrawn']
    },
    documents: [{
      name: String,
      url: String,
      uploadDate: Date
    }],
    settledAmount: Number,
    settlementDate: Date,
    rejectionReason: String,
    notes: String
  }],
  premiumHistory: [{
    dueDate: Date,
    paidDate: Date,
    amount: Number,
    paymentMethod: String,
    receiptNumber: String,
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue', 'lapsed']
    },
    lateFee: Number
  }],
  documents: [{
    type: String, // policy_copy, proposal_form, medical_reports, etc.
    name: String,
    url: String,
    uploadDate: Date
  }],
  status: {
    type: String,
    enum: ['active', 'lapsed', 'expired', 'surrendered', 'matured', 'cancelled'],
    default: 'active'
  },
  isAutoRenewal: {
    type: Boolean,
    default: false
  },
  reminders: [{
    type: {
      type: String,
      enum: ['premium_due', 'renewal', 'document_upload', 'medical_checkup', 'policy_review']
    },
    date: Date,
    sent: Boolean,
    message: String
  }],
  riskAssessment: {
    score: Number,
    factors: [{
      factor: String,
      weight: Number,
      value: String
    }],
    recommendations: [String],
    lastAssessed: Date
  },
  returns: {
    totalPremiumPaid: Number,
    currentValue: Number,
    maturityValue: Number,
    roi: Number, // Return on Investment percentage
    irr: Number // Internal Rate of Return
  },
  tags: [String],
  notes: String
}, {
  timestamps: true
});

// Indexes
insurancePolicySchema.index({ userId: 1, status: 1 });
insurancePolicySchema.index({ userId: 1, policyType: 1 });
insurancePolicySchema.index({ 'policyDetails.endDate': 1 });
insurancePolicySchema.index({ 'policyDetails.nextDueDate': 1 });
insurancePolicySchema.index({ 'provider.policyNumber': 1 });

// Virtual for checking if policy is expiring soon
insurancePolicySchema.virtual('isExpiringSoon').get(function() {
  if (!this.policyDetails.endDate) return false;
  const daysUntilExpiry = Math.floor(
    (this.policyDetails.endDate - new Date()) / (1000 * 60 * 60 * 24)
  );
  return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
});

// Methods
insurancePolicySchema.methods.recordPremiumPayment = async function(paymentDetails) {
  this.premiumHistory.push({
    dueDate: this.policyDetails.nextDueDate,
    paidDate: paymentDetails.paidDate || new Date(),
    amount: paymentDetails.amount || this.policyDetails.premiumAmount,
    paymentMethod: paymentDetails.paymentMethod,
    receiptNumber: paymentDetails.receiptNumber,
    status: 'paid',
    lateFee: paymentDetails.lateFee || 0
  });
  
  // Update next due date
  const nextDate = new Date(this.policyDetails.nextDueDate);
  switch (this.policyDetails.premiumFrequency) {
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'half_yearly':
      nextDate.setMonth(nextDate.getMonth() + 6);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }
  
  this.policyDetails.nextDueDate = nextDate;
  
  // Update returns
  this.returns.totalPremiumPaid = (this.returns.totalPremiumPaid || 0) + 
    (paymentDetails.amount || this.policyDetails.premiumAmount);
  
  await this.save();
};

insurancePolicySchema.methods.fileClaim = async function(claimDetails) {
  const claim = {
    claimNumber: claimDetails.claimNumber || `CLM-${Date.now()}`,
    claimDate: claimDetails.claimDate || new Date(),
    claimAmount: claimDetails.claimAmount,
    claimType: claimDetails.claimType,
    description: claimDetails.description,
    status: 'submitted',
    documents: claimDetails.documents || [],
    notes: claimDetails.notes
  };
  
  this.claims.push(claim);
  await this.save();
  return claim;
};

insurancePolicySchema.methods.updateClaimStatus = async function(claimNumber, status, details = {}) {
  const claim = this.claims.find(c => c.claimNumber === claimNumber);
  if (!claim) throw new Error('Claim not found');
  
  claim.status = status;
  if (details.settledAmount) claim.settledAmount = details.settledAmount;
  if (details.settlementDate) claim.settlementDate = details.settlementDate;
  if (details.rejectionReason) claim.rejectionReason = details.rejectionReason;
  if (details.notes) claim.notes = details.notes;
  
  await this.save();
  return claim;
};

insurancePolicySchema.methods.calculateReturns = function() {
  const totalPremiumPaid = this.returns.totalPremiumPaid || 0;
  const currentValue = this.returns.currentValue || totalPremiumPaid;
  const maturityValue = this.policyDetails.maturityAmount || currentValue;
  
  // Calculate ROI
  if (totalPremiumPaid > 0) {
    this.returns.roi = ((maturityValue - totalPremiumPaid) / totalPremiumPaid) * 100;
  }
  
  // Calculate IRR (simplified)
  const years = this.policyDetails.term || 1;
  if (years > 0 && totalPremiumPaid > 0) {
    this.returns.irr = (Math.pow(maturityValue / totalPremiumPaid, 1 / years) - 1) * 100;
  }
  
  return this.returns;
};

insurancePolicySchema.methods.assessRisk = function() {
  let score = 100;
  const factors = [];
  const recommendations = [];
  
  // Check coverage adequacy
  const coverageAmount = this.policyDetails.coverageAmount;
  if (this.policyType.startsWith('life') && coverageAmount < 1000000) {
    score -= 15;
    factors.push({
      factor: 'Low coverage amount',
      weight: 15,
      value: `₹${coverageAmount}`
    });
    recommendations.push('Consider increasing your life insurance coverage to at least 10x your annual income');
  }
  
  // Check for pending premiums
  const pendingPremiums = this.premiumHistory.filter(p => p.status === 'overdue').length;
  if (pendingPremiums > 0) {
    score -= pendingPremiums * 10;
    factors.push({
      factor: 'Pending premium payments',
      weight: pendingPremiums * 10,
      value: `${pendingPremiums} payment(s)`
    });
    recommendations.push('Clear pending premium payments to avoid policy lapse');
  }
  
  // Check policy expiry
  const daysUntilExpiry = Math.floor(
    (this.policyDetails.endDate - new Date()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysUntilExpiry < 30 && daysUntilExpiry > 0) {
    score -= 20;
    factors.push({
      factor: 'Policy expiring soon',
      weight: 20,
      value: `${daysUntilExpiry} days`
    });
    recommendations.push('Renew your policy before expiry to maintain continuous coverage');
  }
  
  // Check nominee details
  if (!this.nominees || this.nominees.length === 0) {
    score -= 10;
    factors.push({
      factor: 'No nominees added',
      weight: 10,
      value: 'Missing'
    });
    recommendations.push('Add nominee details to ensure smooth claim settlement');
  }
  
  this.riskAssessment = {
    score: Math.max(0, score),
    factors,
    recommendations,
    lastAssessed: new Date()
  };
  
  return this.riskAssessment;
};

// Static methods
insurancePolicySchema.statics.getExpiringPolicies = async function(userId, days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    userId,
    status: 'active',
    'policyDetails.endDate': {
      $gte: new Date(),
      $lte: futureDate
    }
  });
};

insurancePolicySchema.statics.getPremiumsDue = async function(userId) {
  const today = new Date();
  
  return this.find({
    userId,
    status: 'active',
    'policyDetails.nextDueDate': { $lte: today }
  });
};

insurancePolicySchema.statics.getCoverageAnalysis = async function(userId) {
  const policies = await this.find({ userId, status: 'active' });
  
  const analysis = {
    totalCoverage: 0,
    totalPremium: 0,
    byType: {},
    gaps: []
  };
  
  policies.forEach(policy => {
    analysis.totalCoverage += policy.policyDetails.coverageAmount;
    analysis.totalPremium += policy.policyDetails.premiumAmount;
    
    const type = policy.policyType;
    if (!analysis.byType[type]) {
      analysis.byType[type] = {
        count: 0,
        coverage: 0,
        premium: 0
      };
    }
    
    analysis.byType[type].count++;
    analysis.byType[type].coverage += policy.policyDetails.coverageAmount;
    analysis.byType[type].premium += policy.policyDetails.premiumAmount;
  });
  
  // Identify gaps
  const hasLifeInsurance = policies.some(p => p.policyType.startsWith('life'));
  const hasHealthInsurance = policies.some(p => p.policyType.startsWith('health'));
  
  if (!hasLifeInsurance) {
    analysis.gaps.push({
      type: 'life_insurance',
      priority: 'high',
      recommendation: 'Get life insurance coverage'
    });
  }
  
  if (!hasHealthInsurance) {
    analysis.gaps.push({
      type: 'health_insurance',
      priority: 'critical',
      recommendation: 'Get health insurance coverage immediately'
    });
  }
  
  return analysis;
};

const InsurancePolicy = mongoose.model('InsurancePolicy', insurancePolicySchema);

module.exports = InsurancePolicy;
