const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// In-memory watchlist store (per user)
const userWatchlists = {};

/**
 * @route   GET /api/market/indices
 * @desc    Get major market indices
 * @access  Private
 */
router.get('/indices', authenticate, async (req, res) => {
  try {
    const indices = [
      { symbol: 'NIFTY50', name: 'NIFTY 50', value: 24850.75, change: 125.30, changePercent: 0.51 },
      { symbol: 'SENSEX', name: 'BSE SENSEX', value: 81625.40, change: 410.15, changePercent: 0.50 },
      { symbol: 'BANKNIFTY', name: 'BANK NIFTY', value: 54120.60, change: -85.40, changePercent: -0.16 },
      { symbol: 'NIFTYIT', name: 'NIFTY IT', value: 42350.20, change: 320.80, changePercent: 0.76 },
      { symbol: 'NIFTYMIDCAP', name: 'NIFTY MIDCAP 100', value: 58920.15, change: 245.60, changePercent: 0.42 },
    ];
    res.json({ success: true, data: indices, lastUpdated: new Date().toISOString() });
  } catch (error) {
    console.error('Error fetching indices:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch market indices' });
  }
});

/**
 * @route   GET /api/market/gainers
 * @desc    Get top market gainers
 * @access  Private
 */
router.get('/gainers', authenticate, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const gainers = [
      { symbol: 'TATAMOTORS', name: 'Tata Motors', price: 985.50, change: 42.30, changePercent: 4.49, volume: 15200000 },
      { symbol: 'ADANIENT', name: 'Adani Enterprises', price: 2850.75, change: 95.20, changePercent: 3.46, volume: 8500000 },
      { symbol: 'HDFCBANK', name: 'HDFC Bank', price: 1825.40, change: 38.60, changePercent: 2.16, volume: 12300000 },
      { symbol: 'INFY', name: 'Infosys', price: 1920.30, change: 35.10, changePercent: 1.86, volume: 9800000 },
      { symbol: 'TCS', name: 'TCS', price: 4250.80, change: 72.50, changePercent: 1.74, volume: 5600000 },
    ].slice(0, Number(limit));
    res.json({ success: true, data: gainers });
  } catch (error) {
    console.error('Error fetching gainers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch market gainers' });
  }
});

/**
 * @route   GET /api/market/losers
 * @desc    Get top market losers
 * @access  Private
 */
router.get('/losers', authenticate, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const losers = [
      { symbol: 'WIPRO', name: 'Wipro', price: 452.30, change: -18.60, changePercent: -3.95, volume: 11200000 },
      { symbol: 'SUNPHARMA', name: 'Sun Pharma', price: 1680.50, change: -45.30, changePercent: -2.63, volume: 7800000 },
      { symbol: 'COALINDIA', name: 'Coal India', price: 385.20, change: -8.40, changePercent: -2.13, volume: 6200000 },
      { symbol: 'BPCL', name: 'BPCL', price: 345.80, change: -6.20, changePercent: -1.76, volume: 5100000 },
    ].slice(0, Number(limit));
    res.json({ success: true, data: losers });
  } catch (error) {
    console.error('Error fetching losers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch market losers' });
  }
});

/**
 * @route   GET /api/market/sectors
 * @desc    Get sector performance
 * @access  Private
 */
router.get('/sectors', authenticate, async (req, res) => {
  try {
    const sectors = [
      { name: 'Information Technology', change: 1.85, marketCap: '₹42.5L Cr' },
      { name: 'Banking & Finance', change: 0.72, marketCap: '₹68.2L Cr' },
      { name: 'Automobile', change: 2.15, marketCap: '₹18.9L Cr' },
      { name: 'Pharma & Healthcare', change: -0.65, marketCap: '₹15.6L Cr' },
      { name: 'FMCG', change: 0.35, marketCap: '₹22.1L Cr' },
      { name: 'Energy', change: -1.20, marketCap: '₹35.8L Cr' },
      { name: 'Metals & Mining', change: 1.42, marketCap: '₹12.3L Cr' },
      { name: 'Real Estate', change: 0.98, marketCap: '₹5.8L Cr' },
    ];
    res.json({ success: true, data: sectors });
  } catch (error) {
    console.error('Error fetching sectors:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sector data' });
  }
});

/**
 * @route   GET /api/market/global
 * @desc    Get global market data
 * @access  Private
 */
router.get('/global', authenticate, async (req, res) => {
  try {
    const globalMarkets = [
      { symbol: 'DJI', name: 'Dow Jones', value: 42580.50, change: 185.40, changePercent: 0.44, country: 'US' },
      { symbol: 'SPX', name: 'S&P 500', value: 5920.30, change: 28.60, changePercent: 0.49, country: 'US' },
      { symbol: 'IXIC', name: 'NASDAQ', value: 19250.80, change: 120.50, changePercent: 0.63, country: 'US' },
      { symbol: 'FTSE', name: 'FTSE 100', value: 8450.20, change: -32.10, changePercent: -0.38, country: 'UK' },
      { symbol: 'N225', name: 'Nikkei 225', value: 39850.60, change: 285.40, changePercent: 0.72, country: 'JP' },
      { symbol: 'HSI', name: 'Hang Seng', value: 22150.80, change: -180.30, changePercent: -0.81, country: 'HK' },
    ];
    res.json({ success: true, data: globalMarkets });
  } catch (error) {
    console.error('Error fetching global markets:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch global market data' });
  }
});

/**
 * @route   GET /api/market/sentiment
 * @desc    Get market sentiment indicators
 * @access  Private
 */
router.get('/sentiment', authenticate, async (req, res) => {
  try {
    const sentiment = {
      fearGreedIndex: 62,
      label: 'Greed',
      putCallRatio: 0.85,
      advanceDecline: { advances: 1450, declines: 980, unchanged: 70 },
      fiiActivity: { buy: 4520, sell: 3850, net: 670, unit: 'Cr' },
      diiActivity: { buy: 3200, sell: 2800, net: 400, unit: 'Cr' },
      vix: 13.45,
    };
    res.json({ success: true, data: sentiment });
  } catch (error) {
    console.error('Error fetching sentiment:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch market sentiment' });
  }
});

/**
 * @route   GET /api/market/trending
 * @desc    Get trending stocks
 * @access  Private
 */
router.get('/trending', authenticate, async (req, res) => {
  try {
    const trending = [
      { symbol: 'RELIANCE', name: 'Reliance Industries', price: 2950.40, volume: 18500000, mentions: 1250 },
      { symbol: 'TATAMOTORS', name: 'Tata Motors', price: 985.50, volume: 15200000, mentions: 980 },
      { symbol: 'HDFCBANK', name: 'HDFC Bank', price: 1825.40, volume: 12300000, mentions: 870 },
      { symbol: 'INFY', name: 'Infosys', price: 1920.30, volume: 9800000, mentions: 750 },
    ];
    res.json({ success: true, data: trending });
  } catch (error) {
    console.error('Error fetching trending:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch trending stocks' });
  }
});

/**
 * @route   GET /api/market/news
 * @desc    Get market news
 * @access  Private
 */
router.get('/news', authenticate, async (req, res) => {
  try {
    const { category = 'all', limit = 10 } = req.query;
    const news = [
      { id: 1, title: 'NIFTY hits all-time high amid strong FII inflows', source: 'Economic Times', time: '2h ago', category: 'market', sentiment: 'positive' },
      { id: 2, title: 'RBI keeps repo rate unchanged at 6.5%', source: 'Mint', time: '4h ago', category: 'policy', sentiment: 'neutral' },
      { id: 3, title: 'IT sector rallies on strong Q4 guidance', source: 'Moneycontrol', time: '6h ago', category: 'sector', sentiment: 'positive' },
      { id: 4, title: 'Crude oil prices surge, energy stocks under pressure', source: 'Business Standard', time: '8h ago', category: 'commodity', sentiment: 'negative' },
    ].filter(n => category === 'all' || n.category === category).slice(0, Number(limit));
    res.json({ success: true, data: news });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch market news' });
  }
});

/**
 * @route   GET /api/market/quote/:symbol
 * @desc    Get stock quote by symbol
 * @access  Private
 */
router.get('/quote/:symbol', authenticate, async (req, res) => {
  try {
    const { symbol } = req.params;
    const quote = {
      symbol: symbol.toUpperCase(),
      name: `${symbol.toUpperCase()} Ltd`,
      price: 1825.40, open: 1810.00, high: 1835.50, low: 1798.20, close: 1786.80,
      volume: 12300000, avgVolume: 10500000, marketCap: '₹13.8L Cr',
      pe: 22.5, pb: 3.8, eps: 81.13, dividend: 1.2,
      weekHigh52: 1920.50, weekLow52: 1420.80,
      change: 38.60, changePercent: 2.16,
    };
    res.json({ success: true, data: quote });
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stock quote' });
  }
});

/**
 * @route   GET /api/market/historical/:symbol
 * @desc    Get historical price data
 * @access  Private
 */
router.get('/historical/:symbol', authenticate, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = '1M' } = req.query;
    const data = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (30 - i));
      return {
        date: date.toISOString().split('T')[0],
        open: 1780 + Math.random() * 80,
        high: 1800 + Math.random() * 80,
        low: 1760 + Math.random() * 60,
        close: 1770 + Math.random() * 80,
        volume: 8000000 + Math.floor(Math.random() * 8000000),
      };
    });
    res.json({ success: true, symbol: symbol.toUpperCase(), period, data });
  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch historical data' });
  }
});

/**
 * @route   GET /api/market/watchlist
 * @desc    Get user watchlist
 * @access  Private
 */
router.get('/watchlist', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const watchlist = userWatchlists[userId] || [];
    res.json({ success: true, data: watchlist });
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch watchlist' });
  }
});

/**
 * @route   POST /api/market/watchlist
 * @desc    Add symbol to watchlist
 * @access  Private
 */
router.post('/watchlist', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { symbol, name } = req.body;
    if (!symbol) return res.status(400).json({ success: false, error: 'Symbol is required' });
    if (!userWatchlists[userId]) userWatchlists[userId] = [];
    if (userWatchlists[userId].find(w => w.symbol === symbol.toUpperCase())) {
      return res.status(400).json({ success: false, error: 'Symbol already in watchlist' });
    }
    userWatchlists[userId].push({ symbol: symbol.toUpperCase(), name: name || symbol, addedAt: new Date().toISOString() });
    res.json({ success: true, message: 'Added to watchlist', data: userWatchlists[userId] });
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    res.status(500).json({ success: false, error: 'Failed to add to watchlist' });
  }
});

/**
 * @route   DELETE /api/market/watchlist/:symbol
 * @desc    Remove symbol from watchlist
 * @access  Private
 */
router.delete('/watchlist/:symbol', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { symbol } = req.params;
    if (!userWatchlists[userId]) return res.status(404).json({ success: false, error: 'Watchlist not found' });
    userWatchlists[userId] = userWatchlists[userId].filter(w => w.symbol !== symbol.toUpperCase());
    res.json({ success: true, message: 'Removed from watchlist', data: userWatchlists[userId] });
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    res.status(500).json({ success: false, error: 'Failed to remove from watchlist' });
  }
});

/**
 * @route   GET /api/market/portfolio-impact
 * @desc    Get market impact on user portfolio
 * @access  Private
 */
router.get('/portfolio-impact', authenticate, async (req, res) => {
  try {
    const impact = {
      totalValue: 2850000,
      dayChange: 15420,
      dayChangePercent: 0.54,
      topGainer: { symbol: 'TATAMOTORS', change: 4.49 },
      topLoser: { symbol: 'WIPRO', change: -3.95 },
      sectorExposure: [
        { sector: 'IT', weight: 35, change: 1.85 },
        { sector: 'Banking', weight: 25, change: 0.72 },
        { sector: 'Auto', weight: 15, change: 2.15 },
        { sector: 'Pharma', weight: 10, change: -0.65 },
        { sector: 'Others', weight: 15, change: 0.45 },
      ],
    };
    res.json({ success: true, data: impact });
  } catch (error) {
    console.error('Error fetching portfolio impact:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch portfolio impact' });
  }
});

module.exports = router;
