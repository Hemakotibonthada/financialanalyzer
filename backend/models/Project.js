const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  projectType: {
    type: String,
    enum: ['fixed_price', 'hourly', 'retainer', 'milestone_based'],
    required: true
  },
  status: {
    type: String,
    enum: ['proposal', 'active', 'on_hold', 'completed', 'cancelled'],
    default: 'proposal'
  },
  timeline: {
    startDate: Date,
    endDate: Date,
    estimatedHours: Number,
    actualHours: Number
  },
  budget: {
    estimated: Number,
    actual: Number,
    currency: { type: String, default: 'INR' }
  },
  billing: {
    hourlyRate: Number,
    fixedPrice: Number,
    retainerAmount: Number,
    billingCycle: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly', 'milestone', 'upon_completion']
    }
  },
  milestones: [{
    name: String,
    description: String,
    dueDate: Date,
    amount: Number,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'approved'],
      default: 'pending'
    },
    completedDate: Date
  }],
  tasks: [{
    title: String,
    description: String,
    assignedTo: String,
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'review', 'done'],
      default: 'todo'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    estimatedHours: Number,
    actualHours: Number,
    dueDate: Date,
    completedDate: Date
  }],
  timeTracking: [{
    date: Date,
    hours: Number,
    description: String,
    task: String,
    billable: { type: Boolean, default: true },
    hourlyRate: Number,
    amount: Number
  }],
  expenses: [{
    date: Date,
    description: String,
    category: String,
    amount: Number,
    billable: { type: Boolean, default: true },
    receipt: String
  }],
  invoices: [{
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice'
    },
    invoiceNumber: String,
    amount: Number,
    status: String,
    date: Date
  }],
  financials: {
    totalInvoiced: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    profit: Number,
    profitMargin: Number
  },
  documents: [{
    type: String,
    name: String,
    url: String,
    uploadDate: Date
  }],
  team: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    role: String,
    hourlyRate: Number,
    hoursWorked: Number
  }],
  notes: String,
  tags: [String]
}, {
  timestamps: true
});

// Indexes
projectSchema.index({ userId: 1, status: 1 });
projectSchema.index({ clientId: 1 });
projectSchema.index({ status: 1 });

// Methods
projectSchema.methods.calculateFinancials = function() {
  // Calculate total hours
  this.timeline.actualHours = this.timeTracking.reduce((sum, entry) => sum + entry.hours, 0);
  
  // Calculate total expenses
  this.financials.totalExpenses = this.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  // Calculate revenue based on project type
  let revenue = 0;
  if (this.projectType === 'hourly') {
    revenue = this.timeTracking
      .filter(entry => entry.billable)
      .reduce((sum, entry) => sum + (entry.hours * (entry.hourlyRate || this.billing.hourlyRate)), 0);
  } else if (this.projectType === 'fixed_price') {
    revenue = this.billing.fixedPrice || 0;
  } else if (this.projectType === 'milestone_based') {
    revenue = this.milestones
      .filter(m => m.status === 'approved')
      .reduce((sum, m) => sum + m.amount, 0);
  }
  
  this.financials.totalInvoiced = this.invoices.reduce((sum, inv) => sum + inv.amount, 0);
  this.financials.totalPaid = this.invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0);
  
  // Calculate profit
  const costs = this.financials.totalExpenses + 
    (this.team.reduce((sum, member) => sum + (member.hourlyRate * member.hoursWorked || 0), 0));
  
  this.financials.profit = this.financials.totalPaid - costs;
  
  if (this.financials.totalPaid > 0) {
    this.financials.profitMargin = (this.financials.profit / this.financials.totalPaid) * 100;
  }
  
  return this.financials;
};

projectSchema.methods.trackTime = async function(entry) {
  // Calculate amount for this entry
  const rate = entry.hourlyRate || this.billing.hourlyRate || 0;
  entry.amount = entry.hours * rate;
  
  this.timeTracking.push(entry);
  
  // Update actual hours
  this.calculateFinancials();
  
  await this.save();
};

projectSchema.methods.addExpense = async function(expense) {
  this.expenses.push(expense);
  this.calculateFinancials();
  await this.save();
};

projectSchema.methods.completeMilestone = async function(milestoneId) {
  const milestone = this.milestones.id(milestoneId);
  if (milestone) {
    milestone.status = 'completed';
    milestone.completedDate = new Date();
    await this.save();
  }
};

// Static methods
projectSchema.statics.getActiveProjects = async function(userId) {
  return this.find({
    userId,
    status: { $in: ['active', 'on_hold'] }
  }).populate('clientId');
};

projectSchema.statics.getProjectReport = async function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        'timeline.startDate': { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$financials.totalPaid' },
        totalProfit: { $sum: '$financials.profit' }
      }
    }
  ]);
};

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
