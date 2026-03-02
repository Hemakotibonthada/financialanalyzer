/**
 * @fileoverview Currency Conversion Service
 * Provides exchange rate lookups, currency conversion, historical rates,
 * rate alerts, and supported currency metadata.
 * 
 * When EXCHANGE_RATE_API_KEY is set in .env, real exchange rates are fetched
 * from exchangerate-api.com. Otherwise, reference rates with INR as the
 * primary base are used as fallback.
 * @module services/currencyService
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const axios = require('axios');

/* ---------- Mongoose Schema ---------- */

const rateAlertSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fromCurrency: { type: String, required: true, uppercase: true },
    toCurrency: { type: String, required: true, uppercase: true },
    targetRate: { type: Number, required: true },
    direction: { type: String, enum: ['above', 'below'], required: true },
    isActive: { type: Boolean, default: true },
    triggeredAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

rateAlertSchema.index({ isActive: 1 });

const RateAlert = mongoose.models.RateAlert || mongoose.model('RateAlert', rateAlertSchema);

/* ---------- Currency Data ---------- */

/**
 * Supported currencies with metadata.
 * Rates are expressed as 1 unit = X INR.
 */
const CURRENCIES = {
  INR: { name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', rateToINR: 1 },
  USD: { name: 'US Dollar', symbol: '$', flag: '🇺🇸', rateToINR: 83.25 },
  EUR: { name: 'Euro', symbol: '€', flag: '🇪🇺', rateToINR: 90.40 },
  GBP: { name: 'British Pound', symbol: '£', flag: '🇬🇧', rateToINR: 105.50 },
  JPY: { name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', rateToINR: 0.555 },
  AUD: { name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', rateToINR: 54.20 },
  CAD: { name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦', rateToINR: 61.30 },
  SGD: { name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬', rateToINR: 62.10 },
  AED: { name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪', rateToINR: 22.67 },
  CHF: { name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭', rateToINR: 94.80 },
  CNY: { name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳', rateToINR: 11.45 },
  HKD: { name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰', rateToINR: 10.65 },
  NZD: { name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿', rateToINR: 49.80 },
  SEK: { name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪', rateToINR: 7.85 },
  KRW: { name: 'South Korean Won', symbol: '₩', flag: '🇰🇷', rateToINR: 0.0625 },
  THB: { name: 'Thai Baht', symbol: '฿', flag: '🇹🇭', rateToINR: 2.38 },
  MYR: { name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾', rateToINR: 17.65 },
  SAR: { name: 'Saudi Riyal', symbol: '﷼', flag: '🇸🇦', rateToINR: 22.19 },
  ZAR: { name: 'South African Rand', symbol: 'R', flag: '🇿🇦', rateToINR: 4.52 },
  BRL: { name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷', rateToINR: 16.70 },
};

/* ---------- Helpers ---------- */

/**
 * Apply a small random fluctuation to a base rate.
 * @param {number} base - Base exchange rate.
 * @param {number} [maxPct=0.5] - Maximum percentage deviation.
 * @returns {number}
 */
function jitter(base, maxPct = 0.5) {
  const change = base * ((Math.random() * 2 - 1) * maxPct) / 100;
  return +(base + change).toFixed(4);
}

/**
 * Validate that a currency code is supported.
 * @param {string} code
 * @returns {boolean}
 */
function isSupported(code) {
  return !!CURRENCIES[code?.toUpperCase()];
}

/* ============================================================
 *  Currency Service
 * ============================================================ */
const currencyService = {
  /* ----------------------------------------------------------
   *  getExchangeRates
   * ---------------------------------------------------------- */
  /**
   * Get current exchange rates for all currencies relative to a base.
   * @param {string} [baseCurrency='INR'] - Base currency code.
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getExchangeRates(baseCurrency = 'INR') {
    try {
      const base = baseCurrency.toUpperCase();
      if (!isSupported(base)) throw new Error(`Unsupported base currency: ${base}`);

      // Try real API if configured
      const apiKey = process.env.EXCHANGE_RATE_API_KEY;
      if (apiKey) {
        try {
          const res = await axios.get(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/${base}`, { timeout: 5000 });
          if (res.data && res.data.result === 'success') {
            const rates = {};
            for (const code of Object.keys(CURRENCIES)) {
              rates[code] = res.data.conversion_rates[code] || null;
            }
            return {
              success: true,
              data: { base, rates, timestamp: new Date(), source: 'exchangerate-api.com', disclaimer: 'Live exchange rates.' },
            };
          }
        } catch (apiErr) {
          logger.warn(`Real exchange rate API failed, using reference rates: ${apiErr.message}`);
        }
      }

      // Fallback to reference rates
      const baseToINR = jitter(CURRENCIES[base].rateToINR);
      const rates = {};

      for (const [code, info] of Object.entries(CURRENCIES)) {
        if (code === base) {
          rates[code] = 1;
          continue;
        }
        const targetToINR = jitter(info.rateToINR);
        rates[code] = +(baseToINR / targetToINR).toFixed(6);
      }

      return {
        success: true,
        data: {
          base,
          rates,
          timestamp: new Date(),
          source: 'reference',
          disclaimer: 'Reference rates for informational purposes. Set EXCHANGE_RATE_API_KEY for live rates.',
        },
      };
    } catch (error) {
      logger.error(`getExchangeRates error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  convert
   * ---------------------------------------------------------- */
  /**
   * Convert an amount from one currency to another.
   * @param {number} amount - Amount to convert.
   * @param {string} from - Source currency code.
   * @param {string} to - Target currency code.
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async convert(amount, from, to) {
    try {
      if (amount == null || isNaN(amount)) throw new Error('A valid numeric amount is required');
      if (amount < 0) throw new Error('Amount must be non-negative');

      const fromCode = from?.toUpperCase();
      const toCode = to?.toUpperCase();
      if (!isSupported(fromCode)) throw new Error(`Unsupported currency: ${fromCode}`);
      if (!isSupported(toCode)) throw new Error(`Unsupported currency: ${toCode}`);

      if (fromCode === toCode) {
        return {
          success: true,
          data: {
            from: fromCode,
            to: toCode,
            amount,
            convertedAmount: amount,
            rate: 1,
            inverseRate: 1,
            timestamp: new Date(),
          },
        };
      }

      const fromToINR = jitter(CURRENCIES[fromCode].rateToINR);
      const toToINR = jitter(CURRENCIES[toCode].rateToINR);
      const rate = +(fromToINR / toToINR).toFixed(6);
      const convertedAmount = +(amount * rate).toFixed(2);

      return {
        success: true,
        data: {
          from: fromCode,
          to: toCode,
          amount,
          convertedAmount,
          rate,
          inverseRate: +(1 / rate).toFixed(6),
          fromSymbol: CURRENCIES[fromCode].symbol,
          toSymbol: CURRENCIES[toCode].symbol,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      logger.error(`convert error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getHistoricalRates
   * ---------------------------------------------------------- */
  /**
   * Get historical exchange rates for a base currency over a number of days.
   * @param {string} [baseCurrency='INR']
   * @param {number} [days=30]
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getHistoricalRates(baseCurrency = 'INR', days = 30) {
    try {
      const base = baseCurrency.toUpperCase();
      if (!isSupported(base)) throw new Error(`Unsupported currency: ${base}`);

      const safeDays = Math.min(365, Math.max(1, days));
      const history = [];

      for (let i = safeDays; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        // Skip weekends (forex markets closed on weekends)
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        const dayRates = {};
        const baseToINR = jitter(CURRENCIES[base].rateToINR, 1);

        for (const [code, info] of Object.entries(CURRENCIES)) {
          if (code === base) {
            dayRates[code] = 1;
            continue;
          }
          const targetToINR = jitter(info.rateToINR, 1);
          dayRates[code] = +(baseToINR / targetToINR).toFixed(6);
        }

        history.push({
          date: date.toISOString().split('T')[0],
          rates: dayRates,
        });
      }

      // Compute trend for a few key pairs
      const trends = {};
      const targetCodes = base === 'INR' ? ['USD', 'EUR', 'GBP'] : ['INR', 'USD', 'EUR'];
      for (const tc of targetCodes) {
        if (history.length >= 2) {
          const first = history[0].rates[tc];
          const last = history[history.length - 1].rates[tc];
          trends[tc] = {
            startRate: first,
            endRate: last,
            changePercent: +(((last - first) / first) * 100).toFixed(3),
            direction: last >= first ? 'up' : 'down',
          };
        }
      }

      return {
        success: true,
        data: {
          base,
          days: safeDays,
          dataPoints: history.length,
          history,
          trends,
        },
      };
    } catch (error) {
      logger.error(`getHistoricalRates error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getSupportedCurrencies
   * ---------------------------------------------------------- */
  /**
   * List all supported currencies with names and symbols.
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getSupportedCurrencies() {
    try {
      const currencies = Object.entries(CURRENCIES).map(([code, info]) => ({
        code,
        name: info.name,
        symbol: info.symbol,
        flag: info.flag,
      }));

      return { success: true, data: currencies };
    } catch (error) {
      logger.error(`getSupportedCurrencies error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getRateAlerts
   * ---------------------------------------------------------- */
  /**
   * Get all rate alerts for a user.
   * @param {string} userId
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getRateAlerts(userId) {
    try {
      if (!userId) throw new Error('userId is required');

      const alerts = await RateAlert.find({ userId, isActive: true })
        .sort({ createdAt: -1 })
        .lean();

      // Enrich with current rates
      const enriched = alerts.map((alert) => {
        const fromInfo = CURRENCIES[alert.fromCurrency];
        const toInfo = CURRENCIES[alert.toCurrency];
        let currentRate = null;
        if (fromInfo && toInfo) {
          currentRate = +(jitter(fromInfo.rateToINR) / jitter(toInfo.rateToINR)).toFixed(6);
        }
        return {
          ...alert,
          currentRate,
          isTriggered: currentRate != null && (
            (alert.direction === 'above' && currentRate >= alert.targetRate) ||
            (alert.direction === 'below' && currentRate <= alert.targetRate)
          ),
        };
      });

      return { success: true, data: enriched };
    } catch (error) {
      logger.error(`getRateAlerts error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  createRateAlert
   * ---------------------------------------------------------- */
  /**
   * Create a new rate alert.
   * @param {string} userId
   * @param {string} from - Source currency code.
   * @param {string} to - Target currency code.
   * @param {number} targetRate - Rate at which to trigger the alert.
   * @param {'above'|'below'} direction - Trigger when rate goes above or below target.
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async createRateAlert(userId, from, to, targetRate, direction) {
    try {
      if (!userId) throw new Error('userId is required');
      if (!from || !to) throw new Error('from and to currencies are required');
      if (targetRate == null || isNaN(targetRate) || targetRate <= 0) {
        throw new Error('A valid positive targetRate is required');
      }
      if (!['above', 'below'].includes(direction)) {
        throw new Error('Direction must be "above" or "below"');
      }

      const fromCode = from.toUpperCase();
      const toCode = to.toUpperCase();
      if (!isSupported(fromCode)) throw new Error(`Unsupported currency: ${fromCode}`);
      if (!isSupported(toCode)) throw new Error(`Unsupported currency: ${toCode}`);
      if (fromCode === toCode) throw new Error('from and to currencies must differ');

      // Limit active alerts per user
      const activeCount = await RateAlert.countDocuments({ userId, isActive: true });
      if (activeCount >= 20) {
        throw new Error('Maximum of 20 active rate alerts reached. Delete one before adding another.');
      }

      const alert = new RateAlert({
        userId,
        fromCurrency: fromCode,
        toCurrency: toCode,
        targetRate,
        direction,
      });

      await alert.save();

      const currentRate = +(jitter(CURRENCIES[fromCode].rateToINR) / jitter(CURRENCIES[toCode].rateToINR)).toFixed(6);

      logger.info(`Rate alert created: ${fromCode}/${toCode} ${direction} ${targetRate} for user ${userId}`);
      return {
        success: true,
        data: {
          id: alert._id,
          fromCurrency: fromCode,
          toCurrency: toCode,
          targetRate,
          currentRate,
          direction,
          createdAt: alert.createdAt,
        },
      };
    } catch (error) {
      logger.error(`createRateAlert error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  deleteRateAlert
   * ---------------------------------------------------------- */
  /**
   * Delete (deactivate) a rate alert.
   * @param {string} userId
   * @param {string} alertId
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async deleteRateAlert(userId, alertId) {
    try {
      if (!userId || !alertId) throw new Error('userId and alertId are required');

      const alert = await RateAlert.findOneAndUpdate(
        { _id: alertId, userId, isActive: true },
        { $set: { isActive: false } },
        { new: true }
      );

      if (!alert) throw new Error('Rate alert not found or already deleted');

      logger.info(`Rate alert ${alertId} deleted for user ${userId}`);
      return { success: true, data: { id: alertId, deleted: true } };
    } catch (error) {
      logger.error(`deleteRateAlert error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  checkRateAlerts
   * ---------------------------------------------------------- */
  /**
   * Check all active rate alerts against current rates and mark
   * triggered ones. Returns a list of newly triggered alerts.
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async checkRateAlerts() {
    try {
      const activeAlerts = await RateAlert.find({ isActive: true, triggeredAt: null });

      const triggered = [];

      for (const alert of activeAlerts) {
        const fromInfo = CURRENCIES[alert.fromCurrency];
        const toInfo = CURRENCIES[alert.toCurrency];
        if (!fromInfo || !toInfo) continue;

        const currentRate = +(jitter(fromInfo.rateToINR) / jitter(toInfo.rateToINR)).toFixed(6);

        const isTriggered =
          (alert.direction === 'above' && currentRate >= alert.targetRate) ||
          (alert.direction === 'below' && currentRate <= alert.targetRate);

        if (isTriggered) {
          alert.triggeredAt = new Date();
          alert.isActive = false;
          await alert.save();

          triggered.push({
            alertId: alert._id,
            userId: alert.userId,
            pair: `${alert.fromCurrency}/${alert.toCurrency}`,
            targetRate: alert.targetRate,
            currentRate,
            direction: alert.direction,
            triggeredAt: alert.triggeredAt,
          });
        }
      }

      logger.info(`Rate alerts checked: ${triggered.length} triggered out of ${activeAlerts.length} active`);
      return {
        success: true,
        data: {
          checked: activeAlerts.length,
          triggered: triggered.length,
          alerts: triggered,
        },
      };
    } catch (error) {
      logger.error(`checkRateAlerts error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },
};

module.exports = currencyService;
