const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['individual', 'business', 'government', 'nonprofit'],
    default: 'business'
  },
  name: {
    type: String,
    required: true
  },
  company: String,
  email: {
    type: String,
    required: true
  },
  phone: String,
  alternatePhone: String,
  website: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  },
  billing: {
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    gstin: String,
    pan: String,
    taxId: String
  },
  contacts: [{
    name: String,
    designation: String,
    email: String,
    phone: String,
    isPrimary: Boolean
  }],
  projects: [{
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    name: String,
    status: String,
    startDate: Date,
    endDate: Date
  }],
  financials: {
    totalInvoiced: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    totalOutstanding: { type: Number, default: 0 },
    creditLimit: Number,
    paymentTerms: String, // e.g., "Net 30", "Due on receipt"
    averagePaymentDays: Number,
    lastPaymentDate: Date
  },
  invoiceHistory: [{
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice'
    },
    invoiceNumber: String,
    date: Date,
    amount: Number,
    status: String
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived', 'blocked'],
    default: 'active'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  tags: [String],
  notes: String,
  documents: [{
    type: String,
    name: String,
    url: String,
    uploadDate: Date
  }],
  preferences: {
    currency: { type: String, default: 'INR' },
    language: { type: String, default: 'en' },
    invoiceDelivery: {
      type: String,
      enum: ['email', 'postal', 'both'],
      default: 'email'
    }
  },
  communications: [{
    date: Date,
    type: {
      type: String,
      enum: ['email', 'call', 'meeting', 'message']
    },
    subject: String,
    notes: String,
    followUpDate: Date
  }]
}, {
  timestamps: true
});

// Indexes
clientSchema.index({ userId: 1, status: 1 });
clientSchema.index({ userId: 1, name: 1 });
clientSchema.index({ email: 1 });

// Methods
clientSchema.methods.updateFinancials = async function() {
  const Invoice = require('./Invoice');
  
  const invoices = await Invoice.find({
    userId: this.userId,
    'client.clientId': this._id
  });
  
  this.financials.totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
  this.financials.totalPaid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
  this.financials.totalOutstanding = this.financials.totalInvoiced - this.financials.totalPaid;
  
  // Calculate average payment days
  const paidInvoices = invoices.filter(inv => inv.status === 'paid');
  if (paidInvoices.length > 0) {
    const totalDays = paidInvoices.reduce((sum, inv) => {
      const days = Math.floor((inv.paidAt - inv.invoiceDate) / (24 * 60 * 60 * 1000));
      return sum + days;
    }, 0);
    this.financials.averagePaymentDays = Math.round(totalDays / paidInvoices.length);
  }
  
  // Last payment date
  const sortedPaidInvoices = paidInvoices.sort((a, b) => b.paidAt - a.paidAt);
  if (sortedPaidInvoices.length > 0) {
    this.financials.lastPaymentDate = sortedPaidInvoices[0].paidAt;
  }
  
  await this.save();
};

clientSchema.methods.addCommunication = async function(communication) {
  this.communications.push({
    date: communication.date || new Date(),
    type: communication.type,
    subject: communication.subject,
    notes: communication.notes,
    followUpDate: communication.followUpDate
  });
  
  await this.save();
};

// Static methods
clientSchema.statics.getTopClients = async function(userId, limit = 10) {
  return this.find({ userId, status: 'active' })
    .sort({ 'financials.totalPaid': -1 })
    .limit(limit);
};

clientSchema.statics.getClientReport = async function(userId) {
  const clients = await this.find({ userId, status: 'active' });
  
  return {
    totalClients: clients.length,
    totalRevenue: clients.reduce((sum, c) => sum + c.financials.totalPaid, 0),
    totalOutstanding: clients.reduce((sum, c) => sum + c.financials.totalOutstanding, 0),
    averagePaymentDays: clients.reduce((sum, c) => sum + (c.financials.averagePaymentDays || 0), 0) / clients.length
  };
};

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;
