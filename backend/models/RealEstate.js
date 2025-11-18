const mongoose = require('mongoose');

const realEstateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  propertyType: {
    type: String,
    enum: [
      'residential_house',
      'residential_apartment',
      'residential_villa',
      'residential_plot',
      'commercial_office',
      'commercial_shop',
      'commercial_warehouse',
      'commercial_plot',
      'agricultural_land',
      'industrial',
      'mixed_use',
      'other'
    ],
    required: true
  },
  propertyDetails: {
    name: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'India' },
      landmark: String
    },
    area: {
      value: Number,
      unit: {
        type: String,
        enum: ['sqft', 'sqm', 'acre', 'hectare', 'gaj', 'bigha'],
        default: 'sqft'
      }
    },
    bedrooms: Number,
    bathrooms: Number,
    floors: Number,
    parkingSpaces: Number,
    furnished: {
      type: String,
      enum: ['unfurnished', 'semi_furnished', 'fully_furnished']
    },
    age: Number, // Years
    facing: String,
    amenities: [String]
  },
  ownership: {
    ownershipType: {
      type: String,
      enum: ['sole', 'joint', 'inherited', 'gifted'],
      default: 'sole'
    },
    coOwners: [{
      name: String,
      relationship: String,
      share: Number // Percentage
    }],
    acquisitionDate: Date,
    registrationDate: Date
  },
  financial: {
    purchasePrice: { type: Number, required: true },
    currentValue: Number,
    marketValue: Number,
    stampDuty: Number,
    registrationCharges: Number,
    brokerageCharges: Number,
    legalFees: Number,
    otherCosts: Number,
    totalInvestment: Number,
    appreciation: {
      amount: Number,
      percentage: Number
    }
  },
  mortgage: {
    hasLoan: { type: Boolean, default: false },
    lender: String,
    loanAmount: Number,
    loanAccountNumber: String,
    interestRate: Number,
    tenure: Number, // Months
    emi: Number,
    startDate: Date,
    endDate: Date,
    principalPaid: Number,
    interestPaid: Number,
    principalOutstanding: Number,
    prepayments: [{
      date: Date,
      amount: Number,
      newEmi: Number,
      newTenure: Number
    }]
  },
  rental: {
    isRented: { type: Boolean, default: false },
    tenant: {
      name: String,
      contact: String,
      email: String,
      occupation: String
    },
    agreement: {
      startDate: Date,
      endDate: Date,
      duration: Number, // Months
      agreementNumber: String,
      depositAmount: Number,
      lockInPeriod: Number
    },
    monthlyRent: Number,
    rentEscalation: {
      percentage: Number,
      frequency: Number // Years
    },
    maintenanceCharges: Number,
    rentHistory: [{
      month: Date,
      amountDue: Number,
      amountReceived: Number,
      receivedDate: Date,
      status: {
        type: String,
        enum: ['pending', 'received', 'overdue', 'partial']
      },
      lateFeesCharged: Number
    }],
    totalRentReceived: Number,
    averageOccupancyRate: Number
  },
  expenses: {
    monthlyExpenses: [{
      type: {
        type: String,
        enum: ['maintenance', 'property_tax', 'insurance', 'utilities', 'repairs', 'hoa_fees', 'other']
      },
      amount: Number,
      frequency: String,
      lastPaid: Date,
      nextDue: Date
    }],
    annualExpenses: Number,
    propertyTax: {
      amount: Number,
      assessedValue: Number,
      lastPaidYear: String,
      nextDueDate: Date
    },
    insurance: {
      provider: String,
      policyNumber: String,
      coverageAmount: Number,
      premium: Number,
      startDate: Date,
      endDate: Date
    },
    majorRepairs: [{
      description: String,
      date: Date,
      cost: Number,
      category: String
    }]
  },
  returns: {
    rentalYield: Number, // Annual rental income / property value
    capitalAppreciation: Number,
    totalReturn: Number,
    roi: Number,
    irr: Number,
    cashFlow: {
      monthly: Number,
      annual: Number
    }
  },
  documents: [{
    type: {
      type: String,
      enum: [
        'sale_deed',
        'title_deed',
        'tax_receipt',
        'encumbrance_certificate',
        'property_tax_receipt',
        'building_plan',
        'occupancy_certificate',
        'rental_agreement',
        'insurance_policy',
        'loan_documents',
        'valuation_report',
        'photos',
        'other'
      ]
    },
    name: String,
    url: String,
    uploadDate: Date,
    expiryDate: Date
  }],
  valuations: [{
    date: Date,
    valuedBy: String,
    method: {
      type: String,
      enum: ['market_comparison', 'income_approach', 'cost_approach', 'professional_appraisal']
    },
    value: Number,
    reportUrl: String,
    notes: String
  }],
  maintenance: {
    lastMajorRenovation: Date,
    upcomingMaintenance: [{
      task: String,
      priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent']
      },
      estimatedCost: Number,
      scheduledDate: Date,
      status: {
        type: String,
        enum: ['planned', 'in_progress', 'completed', 'cancelled']
      }
    }],
    maintenanceHistory: [{
      date: Date,
      description: String,
      cost: Number,
      vendor: String,
      category: String
    }]
  },
  legal: {
    hasDispute: Boolean,
    disputes: [{
      type: String,
      description: String,
      filedDate: Date,
      status: String,
      courtCase: String
    }],
    clearTitle: Boolean,
    encumbrances: [String],
    zoning: String,
    legalNotes: String
  },
  status: {
    type: String,
    enum: ['owned', 'under_construction', 'rented_out', 'vacant', 'under_renovation', 'for_sale', 'sold'],
    default: 'owned'
  },
  notes: String,
  tags: [String]
}, {
  timestamps: true
});

// Indexes
realEstateSchema.index({ userId: 1, status: 1 });
realEstateSchema.index({ 'propertyDetails.address.city': 1 });
realEstateSchema.index({ propertyType: 1 });
realEstateSchema.index({ 'rental.isRented': 1 });

// Virtual for property age
realEstateSchema.virtual('propertyAge').get(function() {
  if (!this.ownership.acquisitionDate) return null;
  const years = (new Date() - this.ownership.acquisitionDate) / (365 * 24 * 60 * 60 * 1000);
  return Math.floor(years);
});

// Methods
realEstateSchema.methods.calculateReturns = function() {
  const currentValue = this.financial.currentValue || this.financial.marketValue || this.financial.purchasePrice;
  const investment = this.financial.totalInvestment || this.financial.purchasePrice;
  
  // Capital appreciation
  this.financial.appreciation = {
    amount: currentValue - investment,
    percentage: ((currentValue - investment) / investment) * 100
  };
  
  // Rental yield
  if (this.rental.isRented && this.rental.monthlyRent) {
    const annualRent = this.rental.monthlyRent * 12;
    this.returns.rentalYield = (annualRent / currentValue) * 100;
  } else {
    this.returns.rentalYield = 0;
  }
  
  // Capital appreciation rate
  const years = this.propertyAge || 1;
  this.returns.capitalAppreciation = (Math.pow(currentValue / investment, 1 / years) - 1) * 100;
  
  // Total return
  this.returns.totalReturn = this.returns.rentalYield + this.returns.capitalAppreciation;
  
  // ROI
  const totalGains = (currentValue - investment) + (this.rental.totalRentReceived || 0);
  this.returns.roi = (totalGains / investment) * 100;
  
  // Calculate cash flow
  const monthlyRent = this.rental.monthlyRent || 0;
  const monthlyExpense = (this.expenses.annualExpenses || 0) / 12;
  const monthlyEmi = this.mortgage.hasLoan ? (this.mortgage.emi || 0) : 0;
  
  this.returns.cashFlow = {
    monthly: monthlyRent - monthlyExpense - monthlyEmi,
    annual: (monthlyRent - monthlyExpense - monthlyEmi) * 12
  };
  
  return this.returns;
};

realEstateSchema.methods.recordRentPayment = async function(month, amount, receivedDate) {
  const rentRecord = {
    month,
    amountDue: this.rental.monthlyRent,
    amountReceived: amount,
    receivedDate: receivedDate || new Date(),
    status: amount >= this.rental.monthlyRent ? 'received' : 'partial'
  };
  
  // Check if payment is late (more than 5 days after month end)
  const dueDate = new Date(month);
  dueDate.setDate(5);
  dueDate.setMonth(dueDate.getMonth() + 1);
  
  if (new Date(receivedDate) > dueDate) {
    rentRecord.status = 'overdue';
    // Calculate late fees (e.g., 3% per month)
    const daysLate = Math.floor((new Date(receivedDate) - dueDate) / (24 * 60 * 60 * 1000));
    rentRecord.lateFeesCharged = (this.rental.monthlyRent * 0.03 * daysLate) / 30;
  }
  
  this.rental.rentHistory.push(rentRecord);
  this.rental.totalRentReceived = (this.rental.totalRentReceived || 0) + amount;
  
  await this.save();
  return rentRecord;
};

realEstateSchema.methods.recordExpense = async function(expenseDetails) {
  if (expenseDetails.type === 'major_repair') {
    this.expenses.majorRepairs.push({
      description: expenseDetails.description,
      date: expenseDetails.date || new Date(),
      cost: expenseDetails.cost,
      category: expenseDetails.category
    });
  } else {
    let expense = this.expenses.monthlyExpenses.find(e => e.type === expenseDetails.type);
    
    if (expense) {
      expense.amount = expenseDetails.amount;
      expense.lastPaid = expenseDetails.date || new Date();
    } else {
      this.expenses.monthlyExpenses.push({
        type: expenseDetails.type,
        amount: expenseDetails.amount,
        frequency: expenseDetails.frequency || 'monthly',
        lastPaid: expenseDetails.date || new Date()
      });
    }
  }
  
  // Recalculate annual expenses
  this.expenses.annualExpenses = this.expenses.monthlyExpenses.reduce((sum, exp) => {
    const multiplier = exp.frequency === 'yearly' ? 1 : exp.frequency === 'quarterly' ? 4 : 12;
    return sum + (exp.amount * multiplier);
  }, 0);
  
  await this.save();
};

realEstateSchema.methods.recordMortgagePayment = async function(paymentDate) {
  if (!this.mortgage.hasLoan) return;
  
  const emi = this.mortgage.emi;
  const rate = this.mortgage.interestRate / 1200; // Monthly rate
  const outstanding = this.mortgage.principalOutstanding || this.mortgage.loanAmount;
  
  // Calculate interest and principal components
  const interestComponent = outstanding * rate;
  const principalComponent = emi - interestComponent;
  
  this.mortgage.interestPaid = (this.mortgage.interestPaid || 0) + interestComponent;
  this.mortgage.principalPaid = (this.mortgage.principalPaid || 0) + principalComponent;
  this.mortgage.principalOutstanding = outstanding - principalComponent;
  
  await this.save();
};

realEstateSchema.methods.valuateProperty = async function(method = 'market_comparison') {
  // Simplified valuation logic
  let value = this.financial.purchasePrice;
  const years = this.propertyAge || 0;
  
  // Assume 5-7% annual appreciation
  const appreciationRate = 0.06;
  value = value * Math.pow(1 + appreciationRate, years);
  
  // Adjust for property condition
  if (this.propertyDetails.age > 20) {
    value *= 0.9; // 10% reduction for old property
  }
  
  // Adjust for location (simplified - could use external APIs)
  // Premium cities
  const premiumCities = ['mumbai', 'bangalore', 'delhi', 'pune', 'hyderabad'];
  const city = this.propertyDetails.address.city.toLowerCase();
  
  if (premiumCities.includes(city)) {
    value *= 1.15; // 15% premium
  }
  
  const valuation = {
    date: new Date(),
    valuedBy: 'System',
    method,
    value: Math.round(value),
    notes: 'Automated valuation based on historical data and market trends'
  };
  
  this.valuations.push(valuation);
  this.financial.marketValue = valuation.value;
  this.financial.currentValue = valuation.value;
  
  await this.save();
  return valuation;
};

// Static methods
realEstateSchema.statics.getPortfolioSummary = async function(userId) {
  const properties = await this.find({ userId });
  
  const summary = {
    totalProperties: properties.length,
    totalValue: 0,
    totalInvestment: 0,
    totalAppreciation: 0,
    rentedProperties: 0,
    totalMonthlyRent: 0,
    totalMonthlyExpenses: 0,
    netMonthlyCashFlow: 0,
    averageRentalYield: 0,
    totalLoanOutstanding: 0,
    byType: {},
    byCity: {}
  };
  
  properties.forEach(property => {
    property.calculateReturns();
    
    summary.totalValue += property.financial.currentValue || 0;
    summary.totalInvestment += property.financial.totalInvestment || 0;
    summary.totalAppreciation += property.financial.appreciation.amount || 0;
    
    if (property.rental.isRented) {
      summary.rentedProperties++;
      summary.totalMonthlyRent += property.rental.monthlyRent || 0;
    }
    
    summary.totalMonthlyExpenses += (property.expenses.annualExpenses || 0) / 12;
    summary.netMonthlyCashFlow += property.returns.cashFlow.monthly || 0;
    
    if (property.mortgage.hasLoan) {
      summary.totalLoanOutstanding += property.mortgage.principalOutstanding || 0;
    }
    
    // Group by type
    const type = property.propertyType;
    if (!summary.byType[type]) {
      summary.byType[type] = { count: 0, value: 0 };
    }
    summary.byType[type].count++;
    summary.byType[type].value += property.financial.currentValue || 0;
    
    // Group by city
    const city = property.propertyDetails.address.city;
    if (!summary.byCity[city]) {
      summary.byCity[city] = { count: 0, value: 0 };
    }
    summary.byCity[city].count++;
    summary.byCity[city].value += property.financial.currentValue || 0;
  });
  
  if (summary.totalValue > 0) {
    summary.averageRentalYield = (summary.totalMonthlyRent * 12 / summary.totalValue) * 100;
  }
  
  return summary;
};

realEstateSchema.statics.getUpcomingRentPayments = async function(userId) {
  const properties = await this.find({
    userId,
    'rental.isRented': true,
    status: 'rented_out'
  });
  
  const today = new Date();
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  return properties.map(property => {
    const lastPayment = property.rental.rentHistory
      .filter(r => r.month >= thisMonth)
      .sort((a, b) => b.month - a.month)[0];
    
    return {
      property: property._id,
      propertyName: property.propertyDetails.name,
      tenant: property.rental.tenant.name,
      monthlyRent: property.rental.monthlyRent,
      dueDate: new Date(today.getFullYear(), today.getMonth(), 5),
      status: lastPayment ? lastPayment.status : 'pending'
    };
  });
};

const RealEstate = mongoose.model('RealEstate', realEstateSchema);

module.exports = RealEstate;
