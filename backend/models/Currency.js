const mongoose = require('mongoose');

const currencySchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  name: String,
  symbol: String,
  country: String,
  exchangeRates: [{
    toCurrency: String,
    rate: Number,
    date: Date,
    source: String
  }],
  historicalRates: [{
    date: Date,
    rates: Map
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Currency = mongoose.model('Currency', currencySchema);

module.exports = Currency;
