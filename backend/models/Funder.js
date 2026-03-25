const mongoose = require('mongoose');

const funderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Funder/Investor info
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true },
  phone: { type: String, trim: true },
  company: { type: String, trim: true },
  type: {
    type: String,
    enum: ['angel', 'vc', 'pe', 'family_office', 'corporate', 'government', 'crowdfunding', 'personal', 'bank_loan', 'other'],
    default: 'angel'
  },
  // Investment details
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  equityPercentage: { type: Number, min: 0, max: 100, default: 0 },
  valuationAtInvestment: { type: Number, min: 0 },
  round: {
    type: String,
    enum: ['pre_seed', 'seed', 'series_a', 'series_b', 'series_c', 'series_d', 'bridge', 'debt', 'grant', 'other'],
    default: 'seed'
  },
  investmentDate: { type: Date, required: true },
  // Terms
  instrumentType: {
    type: String,
    enum: ['equity', 'convertible_note', 'safe', 'debt', 'revenue_share', 'grant', 'other'],
    default: 'equity'
  },
  interestRate: { type: Number, min: 0 },
  maturityDate: { type: Date },
  conversionTerms: { type: String },
  vestingSchedule: { type: String },
  boardSeat: { type: Boolean, default: false },
  // Status
  status: {
    type: String,
    enum: ['committed', 'received', 'partially_received', 'converted', 'exited', 'defaulted'],
    default: 'received'
  },
  amountReceived: { type: Number, default: 0 },
  exitDate: { type: Date },
  exitAmount: { type: Number },
  // Notes & docs
  notes: { type: String },
  tags: [{ type: String }],
  documents: [{
    name: String,
    url: String,
    type: { type: String, enum: ['term_sheet', 'agreement', 'receipt', 'other'] },
    uploadedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

funderSchema.index({ userId: 1, status: 1 });
funderSchema.index({ userId: 1, round: 1 });
funderSchema.index({ userId: 1, investmentDate: -1 });

// Static: get funding summary for a user
funderSchema.statics.getFundingSummary = async function(userId) {
  const funders = await this.find({ userId }).lean();
  const totalRaised = funders.reduce((s, f) => s + (f.amountReceived || f.amount || 0), 0);
  const totalCommitted = funders.reduce((s, f) => s + (f.amount || 0), 0);
  const totalEquityGiven = funders.reduce((s, f) => s + (f.equityPercentage || 0), 0);
  const byRound = {};
  const byType = {};
  funders.forEach(f => {
    const r = f.round || 'other';
    if (!byRound[r]) byRound[r] = { count: 0, amount: 0 };
    byRound[r].count++; byRound[r].amount += f.amountReceived || f.amount || 0;

    const t = f.type || 'other';
    if (!byType[t]) byType[t] = { count: 0, amount: 0 };
    byType[t].count++; byType[t].amount += f.amountReceived || f.amount || 0;
  });
  return {
    totalFunders: funders.length,
    totalRaised,
    totalCommitted,
    totalEquityGiven,
    founderEquity: 100 - totalEquityGiven,
    byRound: Object.entries(byRound).map(([round, data]) => ({ round, ...data })),
    byType: Object.entries(byType).map(([type, data]) => ({ type, ...data })),
    activeFunders: funders.filter(f => f.status === 'received' || f.status === 'committed').length,
  };
};

module.exports = mongoose.model('Funder', funderSchema);
