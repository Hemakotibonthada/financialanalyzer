const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  invoiceDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  client: {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client'
    },
    name: { type: String, required: true },
    email: String,
    phone: String,
    company: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    gstin: String,
    pan: String
  },
  items: [{
    description: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    unit: String,
    rate: { type: Number, required: true },
    amount: Number,
    taxRate: Number,
    taxAmount: Number,
    discount: Number,
    discountType: {
      type: String,
      enum: ['percentage', 'fixed']
    },
    total: Number,
    hsn: String, // HSN/SAC code for GST
    category: String
  }],
  subtotal: Number,
  discount: {
    amount: Number,
    type: {
      type: String,
      enum: ['percentage', 'fixed']
    }
  },
  tax: {
    cgst: Number,
    sgst: Number,
    igst: Number,
    totalTax: Number
  },
  total: Number,
  amountPaid: {
    type: Number,
    default: 0
  },
  balanceDue: Number,
  currency: {
    type: String,
    default: 'INR'
  },
  exchangeRate: Number,
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled', 'refunded'],
    default: 'draft'
  },
  paymentTerms: String,
  paymentMethod: String,
  payments: [{
    date: Date,
    amount: Number,
    paymentMethod: String,
    transactionId: String,
    notes: String
  }],
  notes: String,
  terms: String,
  internalNotes: String,
  attachments: [{
    name: String,
    url: String,
    uploadDate: Date
  }],
  recurring: {
    isRecurring: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly']
    },
    nextInvoiceDate: Date,
    endDate: Date
  },
  project: {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    name: String
  },
  reminders: [{
    sentDate: Date,
    type: {
      type: String,
      enum: ['due_soon', 'overdue', 'payment_received']
    },
    channel: {
      type: String,
      enum: ['email', 'sms', 'whatsapp']
    }
  }],
  viewedAt: Date,
  paidAt: Date,
  cancelledAt: Date,
  cancelReason: String
}, {
  timestamps: true
});

// Indexes
invoiceSchema.index({ userId: 1, status: 1 });
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ 'client.clientId': 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ status: 1, dueDate: 1 });

// Pre-save middleware
invoiceSchema.pre('save', function(next) {
  // Calculate item totals
  this.items.forEach(item => {
    item.amount = item.quantity * item.rate;
    
    // Apply discount
    if (item.discount) {
      if (item.discountType === 'percentage') {
        item.amount -= (item.amount * item.discount / 100);
      } else {
        item.amount -= item.discount;
      }
    }
    
    // Calculate tax
    if (item.taxRate) {
      item.taxAmount = (item.amount * item.taxRate / 100);
    }
    
    item.total = item.amount + (item.taxAmount || 0);
  });
  
  // Calculate subtotal
  this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
  
  // Apply invoice-level discount
  let discountedSubtotal = this.subtotal;
  if (this.discount && this.discount.amount) {
    if (this.discount.type === 'percentage') {
      discountedSubtotal -= (this.subtotal * this.discount.amount / 100);
    } else {
      discountedSubtotal -= this.discount.amount;
    }
  }
  
  // Calculate total tax
  this.tax.totalTax = this.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
  
  // Calculate total
  this.total = discountedSubtotal + this.tax.totalTax;
  
  // Calculate balance due
  this.balanceDue = this.total - (this.amountPaid || 0);
  
  // Update status based on payment
  if (this.amountPaid >= this.total) {
    this.status = 'paid';
    if (!this.paidAt) this.paidAt = new Date();
  } else if (this.amountPaid > 0) {
    this.status = 'partial';
  } else if (this.status !== 'draft' && this.status !== 'cancelled' && new Date() > this.dueDate) {
    this.status = 'overdue';
  }
  
  next();
});

// Methods
invoiceSchema.methods.recordPayment = async function(paymentDetails) {
  this.payments.push({
    date: paymentDetails.date || new Date(),
    amount: paymentDetails.amount,
    paymentMethod: paymentDetails.paymentMethod,
    transactionId: paymentDetails.transactionId,
    notes: paymentDetails.notes
  });
  
  this.amountPaid += paymentDetails.amount;
  
  await this.save();
  return this;
};

invoiceSchema.methods.sendReminder = async function(type, channel = 'email') {
  this.reminders.push({
    sentDate: new Date(),
    type,
    channel
  });
  
  await this.save();
};

invoiceSchema.methods.markAsViewed = async function() {
  if (!this.viewedAt) {
    this.viewedAt = new Date();
    if (this.status === 'sent') {
      this.status = 'viewed';
    }
    await this.save();
  }
};

invoiceSchema.methods.cancel = async function(reason) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelReason = reason;
  await this.save();
};

invoiceSchema.methods.generatePDF = function() {
  // This would integrate with a PDF generation library
  // Returns invoice data formatted for PDF
  return {
    invoiceNumber: this.invoiceNumber,
    invoiceDate: this.invoiceDate,
    dueDate: this.dueDate,
    client: this.client,
    items: this.items,
    subtotal: this.subtotal,
    tax: this.tax,
    total: this.total,
    balanceDue: this.balanceDue,
    notes: this.notes,
    terms: this.terms
  };
};

// Static methods
invoiceSchema.statics.generateInvoiceNumber = async function(userId) {
  const today = new Date();
  const year = today.getFullYear().toString().substr(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  
  // Find the last invoice for this user
  const lastInvoice = await this.findOne({ userId })
    .sort({ createdAt: -1 });
  
  let sequence = 1;
  if (lastInvoice && lastInvoice.invoiceNumber) {
    const lastSeq = parseInt(lastInvoice.invoiceNumber.split('-').pop());
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }
  
  return `INV-${year}${month}-${sequence.toString().padStart(4, '0')}`;
};

invoiceSchema.statics.getOverdueInvoices = async function(userId) {
  return this.find({
    userId,
    status: { $in: ['sent', 'viewed', 'partial', 'overdue'] },
    dueDate: { $lt: new Date() },
    balanceDue: { $gt: 0 }
  }).sort({ dueDate: 1 });
};

invoiceSchema.statics.getRevenueReport = async function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        status: { $in: ['paid', 'partial'] },
        paidAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$paidAt' },
          month: { $month: '$paidAt' }
        },
        totalRevenue: { $sum: '$amountPaid' },
        invoiceCount: { $sum: 1 },
        avgInvoiceValue: { $avg: '$total' }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);
};

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
