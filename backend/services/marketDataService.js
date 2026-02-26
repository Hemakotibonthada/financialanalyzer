/**
 * @fileoverview Market Data & Insights Service
 * Provides mock (but realistic) Indian equity market data including
 * indices, stock quotes, sector performance, global markets, sentiment,
 * news, historical data, portfolio impact, and watchlist management.
 * @module services/marketDataService
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/* ---------- Mongoose Schema (watchlist) ---------- */

const watchlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    symbol: { type: String, required: true, uppercase: true, trim: true },
    addedAt: { type: Date, default: Date.now },
    notes: { type: String, trim: true },
    alertPrice: { type: Number },
  },
  { timestamps: true }
);

watchlistSchema.index({ userId: 1, symbol: 1 }, { unique: true });

const Watchlist = mongoose.models.Watchlist || mongoose.model('Watchlist', watchlistSchema);

/* ---------- Mock Data Repository ---------- */

const STOCKS = {
  TCS: { name: 'Tata Consultancy Services', sector: 'IT', basePrice: 3850 },
  INFY: { name: 'Infosys', sector: 'IT', basePrice: 1620 },
  RELIANCE: { name: 'Reliance Industries', sector: 'Oil & Gas', basePrice: 2540 },
  HDFCBANK: { name: 'HDFC Bank', sector: 'Banking', basePrice: 1680 },
  ICICIBANK: { name: 'ICICI Bank', sector: 'Banking', basePrice: 1120 },
  SBIN: { name: 'State Bank of India', sector: 'Banking', basePrice: 780 },
  BHARTIARTL: { name: 'Bharti Airtel', sector: 'Telecom', basePrice: 1450 },
  ITC: { name: 'ITC', sector: 'FMCG', basePrice: 465 },
  HINDUNILVR: { name: 'Hindustan Unilever', sector: 'FMCG', basePrice: 2530 },
  KOTAKBANK: { name: 'Kotak Mahindra Bank', sector: 'Banking', basePrice: 1780 },
  LT: { name: 'Larsen & Toubro', sector: 'Infrastructure', basePrice: 3420 },
  WIPRO: { name: 'Wipro', sector: 'IT', basePrice: 460 },
  HCLTECH: { name: 'HCL Technologies', sector: 'IT', basePrice: 1520 },
  TATAMOTORS: { name: 'Tata Motors', sector: 'Auto', basePrice: 720 },
  MARUTI: { name: 'Maruti Suzuki', sector: 'Auto', basePrice: 12400 },
  SUNPHARMA: { name: 'Sun Pharma', sector: 'Pharma', basePrice: 1650 },
  DRREDDY: { name: 'Dr. Reddy\'s Labs', sector: 'Pharma', basePrice: 6200 },
  ADANIENT: { name: 'Adani Enterprises', sector: 'Conglomerate', basePrice: 2850 },
  BAJFINANCE: { name: 'Bajaj Finance', sector: 'NBFC', basePrice: 7200 },
  TITAN: { name: 'Titan Company', sector: 'Consumer', basePrice: 3550 },
  ASIANPAINT: { name: 'Asian Paints', sector: 'Consumer', basePrice: 2820 },
  NESTLEIND: { name: 'Nestle India', sector: 'FMCG', basePrice: 2450 },
  POWERGRID: { name: 'Power Grid Corp', sector: 'Power', basePrice: 310 },
  NTPC: { name: 'NTPC', sector: 'Power', basePrice: 355 },
  TATASTEEL: { name: 'Tata Steel', sector: 'Metals', basePrice: 145 },
};

const SECTORS = [
  'IT', 'Banking', 'FMCG', 'Pharma', 'Auto',
  'Oil & Gas', 'Telecom', 'Infrastructure', 'Power', 'Metals',
  'Consumer', 'NBFC', 'Conglomerate',
];

/* ---------- Helpers ---------- */

/**
 * Generate a random price fluctuation around a base price.
 * @param {number} base
 * @param {number} [maxPctChange=3] - Max percentage change.
 * @returns {{price: number, change: number, changePercent: number}}
 */
function fluctuate(base, maxPctChange = 3) {
  const changePct = (Math.random() * 2 - 1) * maxPctChange;
  const change = +(base * changePct / 100).toFixed(2);
  const price = +(base + change).toFixed(2);
  return {
    price,
    change,
    changePercent: +changePct.toFixed(2),
  };
}

/**
 * Generate a random integer between min and max (inclusive).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* ============================================================
 *  Market Data Service
 * ============================================================ */
const marketDataService = {
  /* ----------------------------------------------------------
   *  getMarketIndices
   * ---------------------------------------------------------- */
  /**
   * Get current values for major Indian market indices.
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getMarketIndices() {
    try {
      const indices = [
        { name: 'SENSEX', fullName: 'BSE Sensex', base: 78500 },
        { name: 'NIFTY 50', fullName: 'NSE Nifty 50', base: 23800 },
        { name: 'BANK NIFTY', fullName: 'Nifty Bank', base: 51200 },
        { name: 'NIFTY IT', fullName: 'Nifty IT', base: 38500 },
        { name: 'NIFTY MIDCAP', fullName: 'Nifty Midcap 100', base: 52000 },
        { name: 'NIFTY SMALLCAP', fullName: 'Nifty Smallcap 100', base: 16800 },
      ];

      const data = indices.map((idx) => {
        const { price, change, changePercent } = fluctuate(idx.base, 1.5);
        return {
          name: idx.name,
          fullName: idx.fullName,
          value: price,
          change,
          changePercent,
          status: change >= 0 ? 'up' : 'down',
          updatedAt: new Date(),
        };
      });

      return { success: true, data };
    } catch (error) {
      logger.error(`getMarketIndices error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getTopGainers
   * ---------------------------------------------------------- */
  /**
   * Get top gaining stocks.
   * @param {number} [limit=5]
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getTopGainers(limit = 5) {
    try {
      const safeLimit = Math.min(25, Math.max(1, limit));
      const entries = Object.entries(STOCKS).map(([symbol, info]) => {
        const changePct = +(Math.random() * 6 + 0.5).toFixed(2); // positives only
        const change = +(info.basePrice * changePct / 100).toFixed(2);
        return {
          symbol,
          name: info.name,
          sector: info.sector,
          price: +(info.basePrice + change).toFixed(2),
          change,
          changePercent: changePct,
          volume: randInt(500000, 5000000),
        };
      });

      entries.sort((a, b) => b.changePercent - a.changePercent);
      return { success: true, data: entries.slice(0, safeLimit) };
    } catch (error) {
      logger.error(`getTopGainers error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getTopLosers
   * ---------------------------------------------------------- */
  /**
   * Get top losing stocks.
   * @param {number} [limit=5]
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getTopLosers(limit = 5) {
    try {
      const safeLimit = Math.min(25, Math.max(1, limit));
      const entries = Object.entries(STOCKS).map(([symbol, info]) => {
        const changePct = +(Math.random() * -6 - 0.5).toFixed(2); // negatives only
        const change = +(info.basePrice * changePct / 100).toFixed(2);
        return {
          symbol,
          name: info.name,
          sector: info.sector,
          price: +(info.basePrice + change).toFixed(2),
          change,
          changePercent: changePct,
          volume: randInt(500000, 5000000),
        };
      });

      entries.sort((a, b) => a.changePercent - b.changePercent);
      return { success: true, data: entries.slice(0, safeLimit) };
    } catch (error) {
      logger.error(`getTopLosers error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getSectorPerformance
   * ---------------------------------------------------------- */
  /**
   * Get performance data by market sector.
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getSectorPerformance() {
    try {
      const data = SECTORS.map((sector) => {
        const changePct = +((Math.random() * 6 - 3)).toFixed(2);
        const sectorStocks = Object.entries(STOCKS).filter(([, info]) => info.sector === sector);
        return {
          sector,
          changePercent: changePct,
          status: changePct >= 0 ? 'up' : 'down',
          stockCount: sectorStocks.length,
          topStock: sectorStocks.length > 0 ? sectorStocks[0][0] : null,
          marketCap: `₹${randInt(50, 500)} Lakh Cr`,
          updatedAt: new Date(),
        };
      });

      data.sort((a, b) => b.changePercent - a.changePercent);
      return { success: true, data };
    } catch (error) {
      logger.error(`getSectorPerformance error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getGlobalMarkets
   * ---------------------------------------------------------- */
  /**
   * Get international market indices.
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getGlobalMarkets() {
    try {
      const globalIndices = [
        { name: 'S&P 500', country: 'US', base: 5800 },
        { name: 'Dow Jones', country: 'US', base: 42500 },
        { name: 'NASDAQ', country: 'US', base: 18900 },
        { name: 'FTSE 100', country: 'UK', base: 8400 },
        { name: 'Nikkei 225', country: 'Japan', base: 39200 },
        { name: 'Hang Seng', country: 'Hong Kong', base: 20100 },
        { name: 'Shanghai Composite', country: 'China', base: 3100 },
        { name: 'DAX', country: 'Germany', base: 19500 },
        { name: 'ASX 200', country: 'Australia', base: 8200 },
        { name: 'Straits Times', country: 'Singapore', base: 3700 },
      ];

      const data = globalIndices.map((idx) => {
        const { price, change, changePercent } = fluctuate(idx.base, 2);
        return {
          name: idx.name,
          country: idx.country,
          value: price,
          change,
          changePercent,
          status: change >= 0 ? 'up' : 'down',
          updatedAt: new Date(),
        };
      });

      return { success: true, data };
    } catch (error) {
      logger.error(`getGlobalMarkets error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getMarketSentiment
   * ---------------------------------------------------------- */
  /**
   * Get overall market sentiment (bull / bear / neutral).
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getMarketSentiment() {
    try {
      const score = +(Math.random() * 100).toFixed(1);
      let sentiment = 'neutral';
      let description = '';

      if (score >= 70) {
        sentiment = 'bullish';
        description = 'Markets are showing strong bullish momentum driven by positive earnings and FII inflows.';
      } else if (score >= 55) {
        sentiment = 'moderately_bullish';
        description = 'Cautious optimism in the market with selective buying in quality stocks.';
      } else if (score >= 45) {
        sentiment = 'neutral';
        description = 'Markets are range-bound with mixed signals from global and domestic cues.';
      } else if (score >= 30) {
        sentiment = 'moderately_bearish';
        description = 'Caution prevails as global headwinds and profit-booking weigh on sentiment.';
      } else {
        sentiment = 'bearish';
        description = 'Risk-off sentiment dominates with broad-based selling pressure.';
      }

      return {
        success: true,
        data: {
          sentiment,
          score,
          description,
          fearGreedIndex: score,
          advancers: randInt(800, 1800),
          decliners: randInt(600, 1600),
          unchanged: randInt(50, 200),
          fiiActivity: Math.random() > 0.5 ? 'Net Buyer' : 'Net Seller',
          diiActivity: Math.random() > 0.5 ? 'Net Buyer' : 'Net Seller',
          updatedAt: new Date(),
        },
      };
    } catch (error) {
      logger.error(`getMarketSentiment error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getTrendingStocks
   * ---------------------------------------------------------- */
  /**
   * Get trending stocks by volume and mentions.
   * @param {number} [limit=10]
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getTrendingStocks(limit = 10) {
    try {
      const safeLimit = Math.min(25, Math.max(1, limit));

      const entries = Object.entries(STOCKS).map(([symbol, info]) => {
        const { price, change, changePercent } = fluctuate(info.basePrice, 4);
        return {
          symbol,
          name: info.name,
          sector: info.sector,
          price,
          change,
          changePercent,
          volume: randInt(1000000, 20000000),
          trendScore: +(Math.random() * 100).toFixed(1),
          reason: ['High volume', 'Earnings beat', 'Analyst upgrade', 'Block deal', 'News buzz'][
            randInt(0, 4)
          ],
        };
      });

      entries.sort((a, b) => b.trendScore - a.trendScore);
      return { success: true, data: entries.slice(0, safeLimit) };
    } catch (error) {
      logger.error(`getTrendingStocks error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getMarketNews
   * ---------------------------------------------------------- */
  /**
   * Get mock financial news articles.
   * @param {number} [limit=10]
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getMarketNews(limit = 10) {
    try {
      const safeLimit = Math.min(50, Math.max(1, limit));

      const headlines = [
        { title: 'Sensex rallies 400 points on strong FII buying', category: 'Market', source: 'ET Markets' },
        { title: 'RBI keeps repo rate unchanged at 6.5%', category: 'Policy', source: 'Livemint' },
        { title: 'TCS bags $1.2 billion mega deal from European bank', category: 'Corporate', source: 'Moneycontrol' },
        { title: 'Gold prices hit all-time high amid global uncertainty', category: 'Commodities', source: 'Business Standard' },
        { title: 'IT sector Q3 results beat Street estimates', category: 'Earnings', source: 'ET Markets' },
        { title: 'Reliance Jio launches new 5G plans; disrupts pricing', category: 'Telecom', source: 'NDTV Profit' },
        { title: 'Rupee strengthens against dollar to 82.50 levels', category: 'Forex', source: 'Reuters' },
        { title: 'India\'s GDP growth pegged at 7.2% for FY26', category: 'Economy', source: 'Bloomberg Quint' },
        { title: 'Mutual fund SIP inflows cross ₹20,000 crore mark', category: 'Investment', source: 'Value Research' },
        { title: 'SEBI introduces new rules for F&O trading', category: 'Regulation', source: 'Moneycontrol' },
        { title: 'Banking stocks lead rally; Nifty Bank up 2%', category: 'Market', source: 'ET Markets' },
        { title: 'HDFC Bank reports 20% jump in net profit', category: 'Earnings', source: 'Business Standard' },
        { title: 'Auto sales surge 15% in January amid festive demand', category: 'Industry', source: 'Autocar India' },
        { title: 'Crude oil prices fall below $75; positive for India', category: 'Commodities', source: 'Reuters' },
        { title: 'Startup IPOs: Three new listings planned for March', category: 'IPO', source: 'Livemint' },
      ];

      const news = headlines.slice(0, safeLimit).map((item, idx) => ({
        id: `news_${Date.now()}_${idx}`,
        title: item.title,
        category: item.category,
        source: item.source,
        summary: `${item.title}. Market analysts observe developments closely as investors assess the impact on portfolio strategies.`,
        publishedAt: new Date(Date.now() - randInt(0, 48) * 60 * 60 * 1000),
        url: '#',
        sentiment: Math.random() > 0.5 ? 'positive' : Math.random() > 0.5 ? 'negative' : 'neutral',
      }));

      return { success: true, data: news };
    } catch (error) {
      logger.error(`getMarketNews error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getStockQuote
   * ---------------------------------------------------------- */
  /**
   * Get detailed quote for an individual stock.
   * @param {string} symbol - Stock ticker symbol.
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getStockQuote(symbol) {
    try {
      if (!symbol) throw new Error('Stock symbol is required');

      const upperSymbol = symbol.toUpperCase().trim();
      const stockInfo = STOCKS[upperSymbol];
      if (!stockInfo) throw new Error(`Stock "${upperSymbol}" not found`);

      const { price, change, changePercent } = fluctuate(stockInfo.basePrice, 3);
      const open = +(stockInfo.basePrice + (Math.random() * 20 - 10)).toFixed(2);
      const high = +(Math.max(price, open) + Math.random() * 30).toFixed(2);
      const low = +(Math.min(price, open) - Math.random() * 30).toFixed(2);

      return {
        success: true,
        data: {
          symbol: upperSymbol,
          name: stockInfo.name,
          sector: stockInfo.sector,
          price,
          change,
          changePercent,
          open,
          high,
          low,
          previousClose: stockInfo.basePrice,
          volume: randInt(1000000, 15000000),
          avgVolume: randInt(3000000, 10000000),
          marketCap: `₹${(price * randInt(200, 800)).toLocaleString('en-IN')} Cr`,
          pe: +(Math.random() * 30 + 10).toFixed(2),
          eps: +(price / (Math.random() * 30 + 10)).toFixed(2),
          dividend: +(Math.random() * 3).toFixed(2),
          week52High: +(stockInfo.basePrice * 1.25).toFixed(2),
          week52Low: +(stockInfo.basePrice * 0.75).toFixed(2),
          updatedAt: new Date(),
        },
      };
    } catch (error) {
      logger.error(`getStockQuote error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getHistoricalData
   * ---------------------------------------------------------- */
  /**
   * Get historical price data for a stock.
   * @param {string} symbol
   * @param {'1W'|'1M'|'3M'|'6M'|'1Y'|'5Y'} [range='1M']
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getHistoricalData(symbol, range = '1M') {
    try {
      if (!symbol) throw new Error('Stock symbol is required');

      const upperSymbol = symbol.toUpperCase().trim();
      const stockInfo = STOCKS[upperSymbol];
      if (!stockInfo) throw new Error(`Stock "${upperSymbol}" not found`);

      const rangeDays = {
        '1W': 7,
        '1M': 30,
        '3M': 90,
        '6M': 180,
        '1Y': 365,
        '5Y': 1825,
      };

      const days = rangeDays[range] || 30;
      const dataPoints = [];
      let price = stockInfo.basePrice;

      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        const dailyChange = (Math.random() * 4 - 2) / 100;
        price = +(price * (1 + dailyChange)).toFixed(2);
        const vol = randInt(1000000, 10000000);

        dataPoints.push({
          date: date.toISOString().split('T')[0],
          open: +(price - Math.random() * 10).toFixed(2),
          high: +(price + Math.random() * 20).toFixed(2),
          low: +(price - Math.random() * 20).toFixed(2),
          close: price,
          volume: vol,
        });
      }

      const first = dataPoints[0]?.close || stockInfo.basePrice;
      const last = dataPoints[dataPoints.length - 1]?.close || price;
      const periodReturn = +(((last - first) / first) * 100).toFixed(2);

      return {
        success: true,
        data: {
          symbol: upperSymbol,
          name: stockInfo.name,
          range,
          dataPoints,
          periodReturn,
          startPrice: first,
          endPrice: last,
        },
      };
    } catch (error) {
      logger.error(`getHistoricalData error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getPortfolioImpact
   * ---------------------------------------------------------- */
  /**
   * Assess market impact on the user's simulated portfolio.
   * @param {string} userId
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getPortfolioImpact(userId) {
    try {
      if (!userId) throw new Error('userId is required');

      // Simulate a portfolio with random holdings
      const holdingSymbols = ['TCS', 'HDFCBANK', 'RELIANCE', 'INFY', 'ITC'];
      const holdings = holdingSymbols.map((symbol) => {
        const info = STOCKS[symbol];
        const qty = randInt(5, 100);
        const avgCost = +(info.basePrice * (1 - Math.random() * 0.1)).toFixed(2);
        const { price, change, changePercent } = fluctuate(info.basePrice, 3);
        const currentValue = +(price * qty).toFixed(2);
        const investedValue = +(avgCost * qty).toFixed(2);
        const pnl = +(currentValue - investedValue).toFixed(2);

        return {
          symbol,
          name: info.name,
          quantity: qty,
          avgCost,
          currentPrice: price,
          currentValue,
          investedValue,
          pnl,
          pnlPercent: +((pnl / investedValue) * 100).toFixed(2),
          dayChange: change,
          dayChangePercent: changePercent,
        };
      });

      const totalInvested = holdings.reduce((s, h) => s + h.investedValue, 0);
      const totalCurrent = holdings.reduce((s, h) => s + h.currentValue, 0);
      const totalPnl = +(totalCurrent - totalInvested).toFixed(2);
      const todayChange = holdings.reduce((s, h) => s + h.dayChange * h.quantity, 0);

      return {
        success: true,
        data: {
          totalInvested: +totalInvested.toFixed(2),
          currentValue: +totalCurrent.toFixed(2),
          totalPnl,
          totalPnlPercent: +((totalPnl / totalInvested) * 100).toFixed(2),
          todayChange: +todayChange.toFixed(2),
          holdings,
          diversification: {
            sectors: [...new Set(holdings.map((h) => STOCKS[h.symbol].sector))],
            stockCount: holdings.length,
          },
          updatedAt: new Date(),
        },
      };
    } catch (error) {
      logger.error(`getPortfolioImpact error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getWatchlist
   * ---------------------------------------------------------- */
  /**
   * Get user's watchlist with current prices.
   * @param {string} userId
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getWatchlist(userId) {
    try {
      if (!userId) throw new Error('userId is required');

      const items = await Watchlist.find({ userId }).sort({ addedAt: -1 }).lean();

      const enriched = items.map((item) => {
        const info = STOCKS[item.symbol];
        if (!info) {
          return { ...item, name: 'Unknown', price: 0, change: 0, changePercent: 0 };
        }
        const { price, change, changePercent } = fluctuate(info.basePrice, 3);
        return {
          ...item,
          name: info.name,
          sector: info.sector,
          price,
          change,
          changePercent,
          status: change >= 0 ? 'up' : 'down',
        };
      });

      return { success: true, data: enriched };
    } catch (error) {
      logger.error(`getWatchlist error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  addToWatchlist
   * ---------------------------------------------------------- */
  /**
   * Add a stock to the user's watchlist.
   * @param {string} userId
   * @param {string} symbol
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async addToWatchlist(userId, symbol) {
    try {
      if (!userId || !symbol) throw new Error('userId and symbol are required');

      const upperSymbol = symbol.toUpperCase().trim();
      if (!STOCKS[upperSymbol]) throw new Error(`Stock "${upperSymbol}" not recognized`);

      // Check duplicate
      const exists = await Watchlist.findOne({ userId, symbol: upperSymbol });
      if (exists) throw new Error(`${upperSymbol} is already in your watchlist`);

      const item = new Watchlist({ userId, symbol: upperSymbol });
      await item.save();

      logger.info(`${upperSymbol} added to watchlist for user ${userId}`);
      return { success: true, data: { symbol: upperSymbol, addedAt: item.addedAt } };
    } catch (error) {
      logger.error(`addToWatchlist error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  removeFromWatchlist
   * ---------------------------------------------------------- */
  /**
   * Remove a stock from the user's watchlist.
   * @param {string} userId
   * @param {string} symbol
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async removeFromWatchlist(userId, symbol) {
    try {
      if (!userId || !symbol) throw new Error('userId and symbol are required');

      const upperSymbol = symbol.toUpperCase().trim();
      const result = await Watchlist.findOneAndDelete({ userId, symbol: upperSymbol });

      if (!result) throw new Error(`${upperSymbol} not found in your watchlist`);

      logger.info(`${upperSymbol} removed from watchlist for user ${userId}`);
      return { success: true, data: { symbol: upperSymbol, removed: true } };
    } catch (error) {
      logger.error(`removeFromWatchlist error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },
};

module.exports = marketDataService;
