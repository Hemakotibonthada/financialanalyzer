const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vendorType: {
    type: String,
    enum: ['supplier', 'service_provider', 'contractor', 'consultant', 'freelancer', 'manufacturer', 'distributor', 'wholesaler'],
    required: true
  },
  companyDetails: {
    name: { type: String, required: true },
    displayName: String,
    legalName: String,
    registrationNumber: String,
    taxId: String,
    gstin: String,
    pan: String,
    website: String,
    email: String,
    phone: String
  },
  contactPersons: [{
    name: String,
    designation: String,
    email: String,
    phone: String,
    mobile: String,
    isPrimary: Boolean,
    department: String
  }],
  addresses: [{
    type: {
      type: String,
      enum: ['billing', 'shipping', 'office', 'warehouse']
    },
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
    isPrimary: Boolean
  }],
  bankDetails: [{
    bankName: String,
    accountNumber: String,
    accountType: String,
    ifscCode: String,
    swiftCode: String,
    branchName: String,
    isPrimary: Boolean
  }],
  paymentTerms: {
    creditPeriod: Number, // days
    creditLimit: Number,
    paymentMethod: {
      type: String,
      enum: ['cash', 'cheque', 'bank_transfer', 'upi', 'card', 'net_banking']
    },
    currency: { type: String, default: 'INR' },
    discountTerms: String
  },
  financials: {
    totalPurchased: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    totalOutstanding: { type: Number, default: 0 },
    averagePaymentDays: Number,
    creditUtilization: Number,
    lastPurchaseDate: Date,
    lastPaymentDate: Date
  },
  products: [{
    productName: String,
    productCode: String,
    category: String,
    unitPrice: Number,
    unit: String,
    leadTime: Number,
    minimumOrder: Number
  }],
  performance: {
    qualityRating: Number, // 1-5
    deliveryRating: Number, // 1-5
    priceRating: Number, // 1-5
    overallRating: Number, // 1-5
    onTimeDeliveryRate: Number, // percentage
    defectRate: Number, // percentage
    responseTime: Number, // hours
    reviews: [{
      date: Date,
      rating: Number,
      comment: String,
      orderId: String
    }]
  },
  documents: [{
    type: {
      type: String,
      enum: ['contract', 'certificate', 'license', 'insurance', 'agreement', 'nda', 'other']
    },
    name: String,
    documentNumber: String,
    issueDate: Date,
    expiryDate: Date,
    fileUrl: String,
    status: String
  }],
  agreements: [{
    agreementType: String,
    startDate: Date,
    endDate: Date,
    value: Number,
    terms: String,
    renewalDate: Date,
    autoRenewal: Boolean,
    status: {
      type: String,
      enum: ['active', 'expired', 'terminated', 'under_negotiation']
    }
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked', 'pending_approval', 'under_review'],
    default: 'active'
  },
  tags: [String],
  notes: String,
  communications: [{
    date: Date,
    type: {
      type: String,
      enum: ['email', 'phone', 'meeting', 'visit', 'other']
    },
    subject: String,
    summary: String,
    nextAction: String
  }]
}, {
  timestamps: true
});

vendorSchema.index({ userId: 1, status: 1 });
vendorSchema.index({ 'companyDetails.name': 1 });
vendorSchema.index({ 'companyDetails.gstin': 1 });

vendorSchema.methods.updateFinancials = function(purchaseAmount, paymentAmount, paymentDays) {
  if (purchaseAmount) this.financials.totalPurchased += purchaseAmount;
  if (paymentAmount) {
    this.financials.totalPaid += paymentAmount;
    this.financials.totalOutstanding -= paymentAmount;
  }
  
  if (paymentDays !== undefined) {
    if (!this.financials.averagePaymentDays) {
      this.financials.averagePaymentDays = paymentDays;
    } else {
      this.financials.averagePaymentDays = (this.financials.averagePaymentDays + paymentDays) / 2;
    }
  }
  
  if (this.paymentTerms.creditLimit) {
    this.financials.creditUtilization = (this.financials.totalOutstanding / this.paymentTerms.creditLimit) * 100;
  }
};

vendorSchema.methods.calculateOverallRating = function() {
  const { qualityRating, deliveryRating, priceRating } = this.performance;
  
  if (qualityRating && deliveryRating && priceRating) {
    this.performance.overallRating = ((qualityRating * 0.4) + (deliveryRating * 0.4) + (priceRating * 0.2));
  }
  
  return this.performance.overallRating;
};

vendorSchema.methods.addReview = function(rating, comment, orderId) {
  this.performance.reviews.push({
    date: new Date(),
    rating,
    comment,
    orderId
  });
  
  this.calculateOverallRating();
};

vendorSchema.statics.getTopVendors = async function(userId, limit = 10) {
  return this.find({ userId, status: 'active' })
    .sort({ 'financials.totalPurchased': -1 })
    .limit(limit)
    .select('companyDetails financials performance');
};

vendorSchema.statics.getVendorReport = async function(userId, startDate, endDate) {
  const vendors = await this.find({
    userId,
    'financials.lastPurchaseDate': { $gte: startDate, $lte: endDate }
  });
  
  return {
    totalVendors: vendors.length,
    totalPurchased: vendors.reduce((sum, v) => sum + v.financials.totalPurchased, 0),
    totalOutstanding: vendors.reduce((sum, v) => sum + v.financials.totalOutstanding, 0),
    averageRating: vendors.reduce((sum, v) => sum + (v.performance.overallRating || 0), 0) / vendors.length,
    byType: vendors.reduce((acc, v) => {
      const type = v.vendorType;
      if (!acc[type]) acc[type] = { count: 0, purchased: 0 };
      acc[type].count++;
      acc[type].purchased += v.financials.totalPurchased;
      return acc;
    }, {})
  };
};

const Vendor = mongoose.model('Vendor', vendorSchema);

module.exports = Vendor;
