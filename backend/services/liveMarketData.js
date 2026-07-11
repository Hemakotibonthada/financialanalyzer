/**
 * @fileoverview Live market data provider.
 *
 * Fetches REAL quotes/history from free, no-key public sources:
 *   - Yahoo Finance (v8 chart) for Indian & global indices and equities
 *   - CoinGecko for crypto prices
 *
 * Everything is cached (NodeCache) and time-bounded. Callers should treat a
 * thrown error / null as "live data unavailable" and fall back to reference
 * data, so the app degrades gracefully (offline, rate-limited, or blocked).
 *
 * @module services/liveMarketData
 */

const axios = require('axios');
const NodeCache = require('node-cache');
const logger = require('../utils/logger');

const quoteCache = new NodeCache({ stdTTL: 60 });        // live quotes: 60s
const snapshotCache = new NodeCache({ stdTTL: 120 });    // universe snapshot: 120s
const histCache = new NodeCache({ stdTTL: 900 });        // history: 15m
const cryptoCache = new NodeCache({ stdTTL: 60 });       // crypto: 60s
const mfCache = new NodeCache({ stdTTL: 6 * 3600 });     // MF NAV map: 6h

const YAHOO = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const COINGECKO = 'https://api.coingecko.com/api/v3';
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; FinancialAnalyzer/1.0)' };

/* ---------------- Symbol maps (single source of truth) ---------------- */

const INDIA_INDICES = [
  { symbol: 'NIFTY50', name: 'NIFTY 50', yahoo: '^NSEI' },
  { symbol: 'SENSEX', name: 'BSE SENSEX', yahoo: '^BSESN' },
  { symbol: 'BANKNIFTY', name: 'BANK NIFTY', yahoo: '^NSEBANK' },
  { symbol: 'NIFTYIT', name: 'NIFTY IT', yahoo: '^CNXIT' },
  { symbol: 'NIFTYMIDCAP', name: 'NIFTY MIDCAP 100', yahoo: '^CNXMIDCAP' },
];

const GLOBAL_INDICES = [
  { symbol: 'DJI', name: 'Dow Jones', country: 'US', yahoo: '^DJI' },
  { symbol: 'SPX', name: 'S&P 500', country: 'US', yahoo: '^GSPC' },
  { symbol: 'IXIC', name: 'NASDAQ', country: 'US', yahoo: '^IXIC' },
  { symbol: 'FTSE', name: 'FTSE 100', country: 'UK', yahoo: '^FTSE' },
  { symbol: 'N225', name: 'Nikkei 225', country: 'JP', yahoo: '^N225' },
  { symbol: 'HSI', name: 'Hang Seng', country: 'HK', yahoo: '^HSI' },
];

// A representative NSE large-cap universe used to compute gainers/losers/trending.
const STOCK_UNIVERSE = [
  { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'IT' },
  { symbol: 'INFY', name: 'Infosys', sector: 'IT' },
  { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Oil & Gas' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Banking' },
  { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel', sector: 'Telecom' },
  { symbol: 'ITC', name: 'ITC', sector: 'FMCG' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', sector: 'FMCG' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', sector: 'Banking' },
  { symbol: 'LT', name: 'Larsen & Toubro', sector: 'Infrastructure' },
  { symbol: 'WIPRO', name: 'Wipro', sector: 'IT' },
  { symbol: 'HCLTECH', name: 'HCL Technologies', sector: 'IT' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors', sector: 'Auto' },
  { symbol: 'MARUTI', name: 'Maruti Suzuki', sector: 'Auto' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharma', sector: 'Pharma' },
  { symbol: 'DRREDDY', name: "Dr. Reddy's Labs", sector: 'Pharma' },
  { symbol: 'ADANIENT', name: 'Adani Enterprises', sector: 'Conglomerate' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance', sector: 'NBFC' },
  { symbol: 'TITAN', name: 'Titan Company', sector: 'Consumer' },
  { symbol: 'ASIANPAINT', name: 'Asian Paints', sector: 'Consumer' },
  { symbol: 'NESTLEIND', name: 'Nestle India', sector: 'FMCG' },
  { symbol: 'POWERGRID', name: 'Power Grid Corp', sector: 'Power' },
  { symbol: 'NTPC', name: 'NTPC', sector: 'Power' },
  { symbol: 'TATASTEEL', name: 'Tata Steel', sector: 'Metals' },
];

/* ---------------- Helpers ---------------- */

const round2 = (n) => (Number.isFinite(n) ? Math.round(n * 100) / 100 : null);
const lastFinite = (arr) => {
  if (!Array.isArray(arr)) return undefined;
  for (let i = arr.length - 1; i >= 0; i--) if (Number.isFinite(arr[i])) return arr[i];
  return undefined;
};

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++;
      try { results[i] = await fn(items[i], i); } catch { results[i] = null; }
    }
  });
  await Promise.all(workers);
  return results;
}

async function yahooChart(yahooSymbol, range = '1mo', interval = '1d') {
  const url = `${YAHOO}${encodeURIComponent(yahooSymbol)}?range=${range}&interval=${interval}`;
  const { data } = await axios.get(url, { timeout: 8000, headers: UA });
  const result = data && data.chart && data.chart.result && data.chart.result[0];
  if (!result || !result.meta) throw new Error(`Yahoo: no data for ${yahooSymbol}`);
  return result;
}

/* ---------------- Public API ---------------- */

/**
 * Live quote for a Yahoo symbol (e.g. "^NSEI", "TCS.NS").
 * @returns {Promise<object>} normalized quote
 */
async function getQuote(yahooSymbol) {
  const cacheKey = `q:${yahooSymbol}`;
  const cached = quoteCache.get(cacheKey);
  if (cached) return cached;

  const r = await yahooChart(yahooSymbol, '1mo', '1d');
  const m = r.meta || {};
  const q = (r.indicators && r.indicators.quote && r.indicators.quote[0]) || {};
  const closes = (q.close || []).map(Number).filter(Number.isFinite);

  const price = Number.isFinite(m.regularMarketPrice) ? m.regularMarketPrice : lastFinite(q.close);
  // Daily previous close. NOTE: meta.chartPreviousClose is the close at the *start of the
  // range* (~1 month ago for range=1mo) and must NOT be used for a daily change. Prefer the
  // explicit prior-day close, else the second-to-last close in the daily series (yesterday).
  let prevClose = m.regularMarketPreviousClose;
  if (!Number.isFinite(prevClose)) prevClose = m.previousClose;
  if (!Number.isFinite(prevClose) && closes.length >= 2) prevClose = closes[closes.length - 2];
  if (!Number.isFinite(prevClose)) prevClose = m.chartPreviousClose;

  const change = Number.isFinite(price) && Number.isFinite(prevClose) ? price - prevClose : null;
  const changePercent = change != null && prevClose ? (change / prevClose) * 100 : null;

  const out = {
    symbol: m.symbol || yahooSymbol,
    currency: m.currency || null,
    price: round2(price),
    previousClose: round2(prevClose),
    change: round2(change),
    changePercent: round2(changePercent),
    open: round2(m.regularMarketOpen != null ? m.regularMarketOpen : lastFinite(q.open)),
    high: round2(m.regularMarketDayHigh != null ? m.regularMarketDayHigh : lastFinite(q.high)),
    low: round2(m.regularMarketDayLow != null ? m.regularMarketDayLow : lastFinite(q.low)),
    volume: Number.isFinite(m.regularMarketVolume) ? m.regularMarketVolume : lastFinite(q.volume) || null,
    week52High: round2(m.fiftyTwoWeekHigh),
    week52Low: round2(m.fiftyTwoWeekLow),
    marketTime: m.regularMarketTime ? new Date(m.regularMarketTime * 1000).toISOString() : new Date().toISOString(),
    live: true,
  };
  quoteCache.set(cacheKey, out);
  return out;
}

/**
 * Live daily OHLCV history for a Yahoo symbol.
 * @param {string} yahooSymbol
 * @param {string} range   Yahoo range (e.g. 5d, 1mo, 3mo, 6mo, 1y)
 * @param {string} interval
 * @returns {Promise<Array<{date,open,high,low,close,volume}>>}
 */
async function getHistorical(yahooSymbol, range = '1mo', interval = '1d') {
  const cacheKey = `h:${yahooSymbol}:${range}:${interval}`;
  const cached = histCache.get(cacheKey);
  if (cached) return cached;

  const r = await yahooChart(yahooSymbol, range, interval);
  const ts = r.timestamp || [];
  const q = (r.indicators && r.indicators.quote && r.indicators.quote[0]) || {};
  const rows = ts
    .map((t, i) => ({
      date: new Date(t * 1000).toISOString().split('T')[0],
      open: round2(q.open && q.open[i]),
      high: round2(q.high && q.high[i]),
      low: round2(q.low && q.low[i]),
      close: round2(q.close && q.close[i]),
      volume: q.volume && Number.isFinite(q.volume[i]) ? q.volume[i] : null,
    }))
    .filter((x) => x.close != null);

  histCache.set(cacheKey, rows);
  return rows;
}

/**
 * Snapshot of the NSE universe (used for gainers/losers/trending). Cached 120s.
 * @returns {Promise<Array<object>>} entries with symbol, name, sector, price, change, changePercent, volume
 */
async function getUniverseSnapshot() {
  const cached = snapshotCache.get('universe');
  if (cached) return cached;

  const quotes = await mapLimit(STOCK_UNIVERSE, 6, async (s) => {
    const qq = await getQuote(`${s.symbol}.NS`);
    return { ...s, price: qq.price, change: qq.change, changePercent: qq.changePercent, volume: qq.volume };
  });
  const rows = quotes.filter((x) => x && x.price != null && x.changePercent != null);
  if (rows.length === 0) throw new Error('Universe snapshot unavailable');
  snapshotCache.set('universe', rows);
  return rows;
}

/**
 * Live crypto prices via CoinGecko.
 * @param {string[]} ids   CoinGecko ids (e.g. ["bitcoin","ethereum"])
 * @param {string} vs      fiat currency (default inr)
 */
async function getCryptoPrices(ids, vs = 'inr') {
  const key = `c:${vs}:${ids.slice().sort().join(',')}`;
  const cached = cryptoCache.get(key);
  if (cached) return cached;

  const url = `${COINGECKO}/simple/price?ids=${encodeURIComponent(ids.join(','))}` +
    `&vs_currencies=${encodeURIComponent(vs)}&include_24hr_change=true`;
  const { data } = await axios.get(url, { timeout: 8000, headers: UA });
  cryptoCache.set(key, data);
  return data;
}

/* ---------------- Mutual funds (AMFI) & precious metals ---------------- */

const AMFI_NAV_URL = 'https://www.amfiindia.com/spages/NAVAll.txt';
const OZ_TO_GRAM = 31.1034768;

/**
 * Fetch & parse the full AMFI daily NAV file into a { schemeCode: {name,nav,date} }
 * map. Cached 6h. Line format: Code;ISIN1;ISIN2;Name;NAV;Date (headers skipped).
 */
async function getMutualFundNavMap() {
  const cached = mfCache.get('navmap');
  if (cached) return cached;
  const { data } = await axios.get(AMFI_NAV_URL, { timeout: 20000, maxRedirects: 5, headers: UA });
  const map = {};
  for (const line of String(data).split('\n')) {
    const p = line.split(';');
    if (p.length < 6) continue;
    const code = p[0].trim();
    const nav = parseFloat(p[4]);
    if (/^\d+$/.test(code) && Number.isFinite(nav)) {
      map[code] = { schemeCode: code, name: p[3].trim(), nav, date: p[5].trim() };
    }
  }
  if (Object.keys(map).length === 0) throw new Error('AMFI NAV parse produced no schemes');
  mfCache.set('navmap', map);
  return map;
}

/** NAV for a single AMFI scheme code, or null. */
async function getMutualFundNav(schemeCode) {
  const map = await getMutualFundNavMap();
  return map[String(schemeCode).trim()] || null;
}

/**
 * Live gold & silver in INR, derived from COMEX spot (Yahoo GC=F/SI=F) converted
 * with the live USD/INR rate. International spot (per gram / 10g / kg) — NOT
 * MCX/retail (which adds import duty, GST, making charges). Cached 60s.
 */
async function getMetalPrices() {
  const cached = quoteCache.get('metals');
  if (cached) return cached;
  const [gold, silver, fx] = await Promise.all([
    getQuote('GC=F').catch(() => null),
    getQuote('SI=F').catch(() => null),
    getQuote('USDINR=X').catch(() => null),
  ]);
  if (!gold || gold.price == null || !fx || fx.price == null) throw new Error('metal price unavailable');
  const usdinr = fx.price;
  const goldPerGram = round2((gold.price * usdinr) / OZ_TO_GRAM);
  const silverPerGram = silver && silver.price != null ? round2((silver.price * usdinr) / OZ_TO_GRAM) : null;
  const out = {
    currency: 'INR',
    usdinr: round2(usdinr),
    gold: { perGram: goldPerGram, per10Gram: round2(goldPerGram * 10), perOunceUsd: gold.price, changePercent: gold.changePercent },
    silver: silverPerGram != null
      ? { perGram: silverPerGram, perKg: round2(silverPerGram * 1000), perOunceUsd: silver.price, changePercent: silver.changePercent }
      : null,
    source: 'Yahoo COMEX spot × live USD/INR',
    note: 'International spot; excludes Indian import duty, GST and making charges.',
    asOf: new Date().toISOString(),
  };
  quoteCache.set('metals', out);
  return out;
}

/* ---------------- Crypto symbol map + unified price resolver ---------------- */

const CRYPTO_SYMBOL_MAP = {
  BTC: 'bitcoin', ETH: 'ethereum', USDT: 'tether', BNB: 'binancecoin', XRP: 'ripple',
  ADA: 'cardano', SOL: 'solana', DOGE: 'dogecoin', DOT: 'polkadot', MATIC: 'matic-network',
  LTC: 'litecoin', TRX: 'tron', SHIB: 'shiba-inu', AVAX: 'avalanche-2', LINK: 'chainlink',
  BCH: 'bitcoin-cash', XLM: 'stellar', UNI: 'uniswap', ATOM: 'cosmos', ETC: 'ethereum-classic',
};

/**
 * Resolve a live INR price for a holding by type + symbol.
 * Supports 'stock'/'etf' (Yahoo NSE/BSE) and 'crypto' (CoinGecko). Returns null
 * for unsupported types (mutual_fund/gold are handled by their own feeds) or on
 * failure, so callers keep the stored value.
 * @returns {Promise<{price:number, changePercent:(number|null), source:string}|null>}
 */
async function resolveLivePrice({ type, symbol }) {
  try {
    if (type === 'gold') {
      const m = await getMetalPrices();
      return m && m.gold ? { price: m.gold.perGram, changePercent: m.gold.changePercent, source: 'yahoo-metal' } : null;
    }
    if (!symbol) return null;
    const s = String(symbol).trim().toUpperCase();
    if (!s) return null;
    if (type === 'crypto') {
      const id = CRYPTO_SYMBOL_MAP[s] || s.toLowerCase();
      const data = await getCryptoPrices([id], 'inr');
      const v = data && data[id];
      if (!v || v.inr == null) return null;
      return { price: round2(v.inr), changePercent: v.inr_24h_change != null ? round2(v.inr_24h_change) : null, source: 'coingecko' };
    }
    if (type === 'stock' || type === 'etf') {
      for (const cand of [`${s}.NS`, `${s}.BO`, s]) {
        try {
          const q = await getQuote(cand);
          if (q && q.price != null) return { price: q.price, changePercent: q.changePercent, source: 'yahoo' };
        } catch { /* try next exchange suffix */ }
      }
      return null;
    }
    if (type === 'mutual_fund') {
      const mf = await getMutualFundNav(s);
      return mf && mf.nav != null ? { price: mf.nav, changePercent: null, source: 'amfi' } : null;
    }
    return null;
  } catch {
    return null;
  }
}

module.exports = {
  INDIA_INDICES,
  GLOBAL_INDICES,
  STOCK_UNIVERSE,
  CRYPTO_SYMBOL_MAP,
  getQuote,
  getHistorical,
  getUniverseSnapshot,
  getCryptoPrices,
  getMutualFundNav,
  getMutualFundNavMap,
  getMetalPrices,
  resolveLivePrice,
  mapLimit,
};
