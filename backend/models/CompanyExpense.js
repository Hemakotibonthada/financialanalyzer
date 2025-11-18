const mongoose = require('mongoose');

const companyExpenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  expenseDate: {
    type: Date,
    required: [true, 'Expense date is required'],
    index: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Office Supplies',
      'Equipment & Hardware',
      'Software & Subscriptions',
      'Marketing & Advertising',
      'Travel & Transportation',
      'Meals & Entertainment',
      'Utilities',
      'Rent & Facilities',
      'Salaries & Wages',
      'Professional Services',
      'Training & Development',
      'Insurance',
      'Taxes & Licenses',
      'Communication',
      'Maintenance & Repairs',
      'Inventory & Raw Materials',
      'Shipping & Delivery',
      'Legal & Compliance',
      'Banking & Finance Charges',
      'Miscellaneous'
    ],
    index: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['USD', 'INR']
  },
  // Amount always stored in INR for reporting
  amountInINR: {
    type: Number,
    required: true,
    min: [0, 'Amount must be positive'],
    index: true
  },
  exchangeRate: {
    type: Number,
    default: 1,
    min: [0, 'Exchange rate must be positive']
  },
  vendor: {
    name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    taxId: {
      type: String,
      trim: true
    }
  },
  paymentMethod: {
    type: String,
    enum: [
      'Cash',
      'Credit Card',
      'Debit Card',
      'Bank Transfer',
      'Wire Transfer',
      'Check',
      'PayPal',
      'Venmo',
      'UPI',
      'Digital Wallet',
      'Other'
    ],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled', 'Refunded'],
    default: 'Paid',
    index: true
  },
  invoiceNumber: {
    type: String,
    trim: true,
    sparse: true
  },
  referenceNumber: {
    type: String,
    trim: true,
    sparse: true
  },
  project: {
    type: String,
    trim: true,
    index: true
  },
  department: {
    type: String,
    trim: true,
    enum: [
      'General',
      'Sales',
      'Marketing',
      'Engineering',
      'Operations',
      'Human Resources',
      'Finance',
      'Legal',
      'Customer Support',
      'Research & Development',
      'IT',
      'Administration'
    ],
    default: 'General',
    index: true
  },
  approver: {
    name: String,
    email: String,
    approvedAt: Date
  },
  isApproved: {
    type: Boolean,
    default: true
  },
  isBillable: {
    type: Boolean,
    default: false
  },
  isRecurring: {
    type: Boolean,
    default: false,
    index: true
  },
  recurringDetails: {
    frequency: {
      type: String,
      enum: ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly']
    },
    startDate: Date,
    endDate: Date,
    nextDate: Date
  },
  attachments: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    mimetype: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    fileType: {
      type: String,
      enum: ['Receipt', 'Invoice', 'Contract', 'Statement', 'Photo', 'Document', 'Other'],
      default: 'Receipt'
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  taxDeductible: {
    type: Boolean,
    default: false
  },
  taxPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  reimbursable: {
    type: Boolean,
    default: false
  },
  reimbursementStatus: {
    type: String,
    enum: ['Not Applicable', 'Pending', 'Approved', 'Paid'],
    default: 'Not Applicable'
  },
  metadata: {
    createdBy: String,
    lastModifiedBy: String,
    ipAddress: String,
    deviceInfo: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
companyExpenseSchema.index({ userId: 1, expenseDate: -1 });
companyExpenseSchema.index({ userId: 1, category: 1, expenseDate: -1 });
companyExpenseSchema.index({ userId: 1, paymentStatus: 1 });
companyExpenseSchema.index({ userId: 1, department: 1 });
companyExpenseSchema.index({ userId: 1, project: 1 });
companyExpenseSchema.index({ createdAt: -1 });

// Text index for search functionality
companyExpenseSchema.index({
  description: 'text',
  'vendor.name': 'text',
  notes: 'text',
  tags: 'text',
  invoiceNumber: 'text',
  project: 'text'
}, {
  weights: {
    description: 10,
    'vendor.name': 8,
    tags: 6,
    notes: 4,
    invoiceNumber: 5,
    project: 7
  },
  name: 'expense_text_search'
});

// Virtual for attachment count
companyExpenseSchema.virtual('attachmentCount').get(function() {
  return this.attachments ? this.attachments.length : 0;
});

// Virtual for formatted amount (in INR)
companyExpenseSchema.virtual('formattedAmount').get(function() {
  return `₹${(this.amountInINR || this.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
});

// Virtual for tax amount (in INR)
companyExpenseSchema.virtual('taxAmount').get(function() {
  return (this.amountInINR || this.amount) * (this.taxPercentage / 100);
});

// Virtual for total amount including tax (in INR)
companyExpenseSchema.virtual('totalAmount').get(function() {
  return this.amount + this.taxAmount;
});

// Static method: Get expenses by date range
companyExpenseSchema.statics.getExpensesByDateRange = function(userId, startDate, endDate) {
  return this.find({
    userId: new mongoose.Types.ObjectId(userId),
    expenseDate: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ expenseDate: -1 });
};

// Static method: Get expenses by category
companyExpenseSchema.statics.getExpensesByCategory = function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        expenseDate: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amountInINR' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amountInINR' }
      }
    },
    {
      $sort: { totalAmount: -1 }
    }
  ]);
};

// Static method: Get expenses by department
companyExpenseSchema.statics.getExpensesByDepartment = function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        expenseDate: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: '$department',
        totalAmount: { $sum: '$amountInINR' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { totalAmount: -1 }
    }
  ]);
};

// Static method: Get monthly trend
companyExpenseSchema.statics.getMonthlyTrend = function(userId, months = 12) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        expenseDate: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$expenseDate' },
          month: { $month: '$expenseDate' }
        },
        totalAmount: { $sum: '$amountInINR' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);
};

// Static method: Get top vendors
companyExpenseSchema.statics.getTopVendors = function(userId, limit = 10) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        'vendor.name': { $exists: true, $ne: '' }
      }
    },
    {
      $group: {
        _id: '$vendor.name',
        totalAmount: { $sum: '$amountInINR' },
        count: { $sum: 1 },
        lastExpense: { $max: '$expenseDate' }
      }
    },
    {
      $sort: { totalAmount: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

// Static method: Search expenses
companyExpenseSchema.statics.searchExpenses = async function(userId, searchQuery, options = {}) {
  const {
    limit = 50,
    skip = 0,
    sortBy = 'expenseDate',
    sortOrder = 'desc',
    filters = {}
  } = options;

  const query = {
    userId: new mongoose.Types.ObjectId(userId)
  };

  // Add text search if query provided
  if (searchQuery) {
    query.$text = { $search: searchQuery };
  }

  // Apply filters
  if (filters.category) query.category = filters.category;
  if (filters.department) query.department = filters.department;
  if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
  if (filters.project) query.project = filters.project;
  
  if (filters.startDate || filters.endDate) {
    query.expenseDate = {};
    if (filters.startDate) query.expenseDate.$gte = new Date(filters.startDate);
    if (filters.endDate) query.expenseDate.$lte = new Date(filters.endDate);
  }
  
  if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
    query.amountInINR = {};
    if (filters.minAmount !== undefined) query.amountInINR.$gte = filters.minAmount;
    if (filters.maxAmount !== undefined) query.amountInINR.$lte = filters.maxAmount;
  }

  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const results = await this.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await this.countDocuments(query);

  return {
    results,
    total,
    page: Math.floor(skip / limit) + 1,
    pages: Math.ceil(total / limit)
  };
};

// Static method: Get dashboard summary
companyExpenseSchema.statics.getDashboardSummary = async function(userId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    totalExpenses,
    monthlyExpenses,
    yearlyExpenses,
    lastMonthExpenses,
    pendingExpenses,
    categoryBreakdown,
    recentExpenses
  ] = await Promise.all([
    // Total expenses
    this.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: '$amountInINR' }, count: { $sum: 1 } } }
    ]),
    // Monthly expenses
    this.aggregate([
      { 
        $match: { 
          userId: new mongoose.Types.ObjectId(userId),
          expenseDate: { $gte: startOfMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: '$amountInINR' }, count: { $sum: 1 } } }
    ]),
    // Yearly expenses
    this.aggregate([
      { 
        $match: { 
          userId: new mongoose.Types.ObjectId(userId),
          expenseDate: { $gte: startOfYear }
        } 
      },
      { $group: { _id: null, total: { $sum: '$amountInINR' }, count: { $sum: 1 } } }
    ]),
    // Last month expenses
    this.aggregate([
      { 
        $match: { 
          userId: new mongoose.Types.ObjectId(userId),
          expenseDate: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: '$amountInINR' } } }
    ]),
    // Pending expenses
    this.aggregate([
      { 
        $match: { 
          userId: new mongoose.Types.ObjectId(userId),
          paymentStatus: { $in: ['Pending', 'Overdue'] }
        } 
      },
      { $group: { _id: null, total: { $sum: '$amountInINR' }, count: { $sum: 1 } } }
    ]),
    // Category breakdown (top 5)
    this.aggregate([
      { 
        $match: { 
          userId: new mongoose.Types.ObjectId(userId),
          expenseDate: { $gte: startOfMonth }
        } 
      },
      {
        $group: {
          _id: '$category',
          amount: { $sum: '$amountInINR' },
          count: { $sum: 1 }
        }
      },
      { $sort: { amount: -1 } },
      { $limit: 5 }
    ]),
    // Recent expenses
    this.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ expenseDate: -1 })
      .limit(5)
      .lean()
  ]);

  return {
    total: {
      amount: totalExpenses[0]?.total || 0,
      count: totalExpenses[0]?.count || 0
    },
    monthly: {
      amount: monthlyExpenses[0]?.total || 0,
      count: monthlyExpenses[0]?.count || 0
    },
    yearly: {
      amount: yearlyExpenses[0]?.total || 0,
      count: yearlyExpenses[0]?.count || 0
    },
    lastMonth: {
      amount: lastMonthExpenses[0]?.total || 0
    },
    pending: {
      amount: pendingExpenses[0]?.total || 0,
      count: pendingExpenses[0]?.count || 0
    },
    categoryBreakdown,
    recentExpenses
  };
};

// Pre-save middleware to handle recurring expenses
companyExpenseSchema.pre('save', function(next) {
  if (this.isRecurring && this.recurringDetails && !this.recurringDetails.nextDate) {
    const nextDate = new Date(this.expenseDate);
    
    switch (this.recurringDetails.frequency) {
      case 'Daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'Weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'Monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'Quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'Yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }
    
    this.recurringDetails.nextDate = nextDate;
  }
  
  next();
});

const CompanyExpense = mongoose.model('CompanyExpense', companyExpenseSchema);

module.exports = CompanyExpense;
