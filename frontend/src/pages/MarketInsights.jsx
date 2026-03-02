import React, { useState, useEffect } from 'react';
import api from '../services/api';

const MARKET_INDICES = [
  { name: 'SENSEX', value: 82450.32, change: 345.67, changePercent: 0.42, high: 82680, low: 81920 },
  { name: 'NIFTY 50', value: 24890.15, change: -112.40, changePercent: -0.45, high: 25010, low: 24780 },
  { name: 'BANK NIFTY', value: 51234.80, change: 678.90, changePercent: 1.34, high: 51450, low: 50800 },
  { name: 'NIFTY IT', value: 38920.55, change: -234.10, changePercent: -0.60, high: 39200, low: 38750 },
];

const TOP_GAINERS = [
  { symbol: 'TATAMOTORS', price: 945.20, change: 42.30, changePercent: 4.69, volume: '12.5M' },
  { symbol: 'RELIANCE', price: 2890.50, change: 78.60, changePercent: 2.80, volume: '8.3M' },
  { symbol: 'HDFCBANK', price: 1650.75, change: 38.20, changePercent: 2.37, volume: '15.1M' },
  { symbol: 'INFY', price: 1820.30, change: 32.50, changePercent: 1.82, volume: '6.7M' },
  { symbol: 'ICICIBANK', price: 1245.90, change: 18.70, changePercent: 1.52, volume: '9.2M' },
];

const TOP_LOSERS = [
  { symbol: 'ADANIENT', price: 2340.10, change: -98.40, changePercent: -4.04, volume: '11.2M' },
  { symbol: 'WIPRO', price: 478.60, change: -15.30, changePercent: -3.10, volume: '7.8M' },
  { symbol: 'SUNPHARMA', price: 1125.40, change: -28.90, changePercent: -2.50, volume: '4.5M' },
  { symbol: 'BAJFINANCE', price: 7120.80, change: -145.60, changePercent: -2.00, volume: '3.9M' },
  { symbol: 'MARUTI', price: 12450.00, change: -210.00, changePercent: -1.66, volume: '2.1M' },
];

const SECTORS = [
  { name: 'Banking', change: 1.34, color: 'bg-green-500' },
  { name: 'IT', change: -0.60, color: 'bg-red-400' },
  { name: 'Pharma', change: -1.20, color: 'bg-red-500' },
  { name: 'Auto', change: 2.10, color: 'bg-green-600' },
  { name: 'FMCG', change: 0.30, color: 'bg-green-300' },
  { name: 'Energy', change: -0.15, color: 'bg-red-300' },
  { name: 'Metals', change: 1.80, color: 'bg-green-500' },
  { name: 'Realty', change: -2.40, color: 'bg-red-600' },
  { name: 'Infra', change: 0.85, color: 'bg-green-400' },
  { name: 'Media', change: -0.50, color: 'bg-red-400' },
  { name: 'PSU Banks', change: 2.50, color: 'bg-green-600' },
  { name: 'Telecom', change: 0.10, color: 'bg-green-200' },
];

const MARKET_NEWS = [
  { id: 1, title: 'RBI keeps repo rate unchanged at 6.5%', time: '2 hours ago', source: 'Economic Times', sentiment: 'neutral' },
  { id: 2, title: 'FII inflows surge to ₹5,200 Cr in February', time: '3 hours ago', source: 'Moneycontrol', sentiment: 'positive' },
  { id: 3, title: 'IT sector faces headwinds from global slowdown', time: '5 hours ago', source: 'LiveMint', sentiment: 'negative' },
  { id: 4, title: 'Auto sales hit record high in January 2026', time: '6 hours ago', source: 'Business Standard', sentiment: 'positive' },
  { id: 5, title: 'Crude oil prices rise amid Middle East tensions', time: '8 hours ago', source: 'Reuters', sentiment: 'negative' },
];

const GLOBAL_MARKETS = [
  { name: 'S&P 500', value: '5,892.30', change: 0.32 },
  { name: 'NASDAQ', value: '18,456.80', change: -0.18 },
  { name: 'Dow Jones', value: '43,120.50', change: 0.45 },
  { name: 'FTSE 100', value: '8,234.10', change: 0.12 },
  { name: 'Nikkei 225', value: '39,780.40', change: -0.65 },
  { name: 'Shanghai', value: '3,124.70', change: 0.78 },
];

const TRENDING_STOCKS = [
  { symbol: 'ZOMATO', mentions: 1240, sentiment: 'bullish' },
  { symbol: 'TATAPOWER', mentions: 980, sentiment: 'bullish' },
  { symbol: 'PAYTM', mentions: 870, sentiment: 'bearish' },
  { symbol: 'IRCTC', mentions: 650, sentiment: 'neutral' },
  { symbol: 'JSWSTEEL', mentions: 540, sentiment: 'bullish' },
];

const PORTFOLIO_IMPACT = [
  { stock: 'RELIANCE', shares: 10, avgPrice: 2650, currentPrice: 2890.50, impact: 2405 },
  { stock: 'HDFCBANK', shares: 15, avgPrice: 1580, currentPrice: 1650.75, impact: 1061.25 },
  { stock: 'INFY', shares: 20, avgPrice: 1750, currentPrice: 1820.30, impact: 1406 },
  { stock: 'TATAMOTORS', shares: 25, avgPrice: 880, currentPrice: 945.20, impact: 1630 },
];

export default function MarketInsights() {
  const [activeTab, setActiveTab] = useState('overview');
  const [sentimentScore, setSentimentScore] = useState(62);
  const [indices, setIndices] = useState(MARKET_INDICES);
  const [gainers, setGainers] = useState(TOP_GAINERS);
  const [losers, setLosers] = useState(TOP_LOSERS);
  const [sectors, setSectors] = useState(SECTORS);
  const [globalMarkets, setGlobalMarkets] = useState(GLOBAL_MARKETS);
  const [trending, setTrending] = useState(TRENDING_STOCKS);
  const [news, setNews] = useState(MARKET_NEWS);
  const [portfolioImpact, setPortfolioImpact] = useState(PORTFOLIO_IMPACT);
  const [loading, setLoading] = useState(true);

  const fetchMarketData = async () => {
    setLoading(true);
    try {
      const [indicesRes, gainersRes, losersRes, sectorsRes, globalRes, sentimentRes, trendingRes, newsRes, impactRes] = await Promise.allSettled([
        api.get('/market/indices'),
        api.get('/market/gainers'),
        api.get('/market/losers'),
        api.get('/market/sectors'),
        api.get('/market/global'),
        api.get('/market/sentiment'),
        api.get('/market/trending'),
        api.get('/market/news'),
        api.get('/market/portfolio-impact'),
      ]);
      if (indicesRes.status === 'fulfilled' && indicesRes.value.data?.data) setIndices(indicesRes.value.data.data);
      if (gainersRes.status === 'fulfilled' && gainersRes.value.data?.data) setGainers(gainersRes.value.data.data);
      if (losersRes.status === 'fulfilled' && losersRes.value.data?.data) setLosers(losersRes.value.data.data);
      if (sectorsRes.status === 'fulfilled' && sectorsRes.value.data?.data) setSectors(sectorsRes.value.data.data);
      if (globalRes.status === 'fulfilled' && globalRes.value.data?.data) setGlobalMarkets(globalRes.value.data.data);
      if (sentimentRes.status === 'fulfilled' && sentimentRes.value.data?.data?.score != null) setSentimentScore(sentimentRes.value.data.data.score);
      if (trendingRes.status === 'fulfilled' && trendingRes.value.data?.data) setTrending(trendingRes.value.data.data);
      if (newsRes.status === 'fulfilled' && newsRes.value.data?.data) setNews(newsRes.value.data.data);
      if (impactRes.status === 'fulfilled' && impactRes.value.data?.data) setPortfolioImpact(impactRes.value.data.data);
    } catch (err) {
      console.error('Market data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
  }, []);

  const getSentimentLabel = () => {
    if (sentimentScore >= 70) return { label: 'Bullish', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' };
    if (sentimentScore >= 40) return { label: 'Neutral', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' };
    return { label: 'Bearish', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' };
  };
  const sentiment = getSentimentLabel();

  const totalPortfolioImpact = portfolioImpact.reduce((s, p) => s + p.impact, 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Market Insights</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Real-time market data and analysis</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`${sentiment.bg} px-4 py-2 rounded-xl flex items-center gap-2`}>
              <div className={`w-3 h-3 rounded-full ${sentimentScore >= 70 ? 'bg-green-500' : sentimentScore >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} />
              <span className={`text-sm font-semibold ${sentiment.color}`}>Market: {sentiment.label}</span>
              <span className="text-xs text-slate-500">({sentimentScore}/100)</span>
            </div>
            <button onClick={fetchMarketData} disabled={loading} className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 px-4 py-2 transition-colors disabled:opacity-50">
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
          {['overview', 'gainers/losers', 'sectors', 'global', 'portfolio'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-t-xl text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Market Indices Cards */}
        {(activeTab === 'overview') && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {indices.map((index) => (
                <div key={index.name} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{index.name}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{index.value.toLocaleString()}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-sm font-semibold ${index.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {index.change >= 0 ? '▲' : '▼'} {Math.abs(index.change).toFixed(2)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      index.change >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {index.changePercent >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between mt-3 text-xs text-slate-400">
                    <span>H: {index.high.toLocaleString()}</span>
                    <span>L: {index.low.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Market News Feed */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">📰 Market News</h2>
              <div className="space-y-3">
                {news.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      n.sentiment === 'positive' ? 'bg-green-500' : n.sentiment === 'negative' ? 'bg-red-500' : 'bg-amber-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{n.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400">{n.source}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-400">{n.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trending Stocks */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">🔥 Trending Stocks</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {trending.map((stock) => (
                  <div key={stock.symbol} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{stock.symbol}</p>
                    <p className="text-xs text-slate-500 mt-1">{stock.mentions} mentions</p>
                    <span className={`text-xs font-medium mt-1 inline-block px-2 py-0.5 rounded-full ${
                      stock.sentiment === 'bullish' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      stock.sentiment === 'bearish' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {stock.sentiment}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Top Gainers/Losers */}
        {activeTab === 'gainers/losers' && (
          <div className="grid md:grid-cols-2 gap-6">
            {[{ title: '📈 Top Gainers', data: gainers, isGainer: true }, { title: '📉 Top Losers', data: losers, isGainer: false }].map(({ title, data, isGainer }) => (
              <div key={title} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{title}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2">Symbol</th>
                        <th className="text-right py-2">Price</th>
                        <th className="text-right py-2">Change</th>
                        <th className="text-right py-2">Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((stock) => (
                        <tr key={stock.symbol} className="border-b border-slate-100 dark:border-slate-700/50">
                          <td className="py-3 font-medium text-slate-900 dark:text-white">{stock.symbol}</td>
                          <td className="py-3 text-right">₹{stock.price.toLocaleString()}</td>
                          <td className={`py-3 text-right font-medium ${isGainer ? 'text-green-600' : 'text-red-600'}`}>
                            {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                          </td>
                          <td className="py-3 text-right text-slate-500">{stock.volume}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sector Heatmap */}
        {activeTab === 'sectors' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">🗺️ Sector Performance Heatmap</h2>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {sectors.map((sector) => {
                const intensity = Math.min(Math.abs(sector.change) * 100, 255);
                const bgColor = sector.change >= 0
                  ? `rgba(34, 197, 94, ${0.2 + Math.abs(sector.change) * 0.15})`
                  : `rgba(239, 68, 68, ${0.2 + Math.abs(sector.change) * 0.15})`;
                return (
                  <div
                    key={sector.name}
                    className="rounded-xl p-4 text-center border border-slate-200 dark:border-slate-700 hover:scale-105 transition-transform cursor-pointer"
                    style={{ backgroundColor: bgColor }}
                  >
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{sector.name}</p>
                    <p className={`text-lg font-bold ${sector.change >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                      {sector.change >= 0 ? '+' : ''}{sector.change.toFixed(2)}%
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Global Markets */}
        {activeTab === 'global' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">🌍 Global Markets</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {globalMarkets.map((market) => (
                <div key={market.name} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{market.name}</p>
                    <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{market.value}</p>
                  </div>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                    market.change >= 0
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {market.change >= 0 ? '+' : ''}{market.change.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio Impact */}
        {activeTab === 'portfolio' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">💼 Portfolio Impact Today</h2>
              <span className={`text-lg font-bold ${totalPortfolioImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalPortfolioImpact >= 0 ? '+' : ''}₹{totalPortfolioImpact.toLocaleString()}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2">Stock</th>
                    <th className="text-right py-2">Shares</th>
                    <th className="text-right py-2">Avg Price</th>
                    <th className="text-right py-2">Current</th>
                    <th className="text-right py-2">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolioImpact.map((item) => (
                    <tr key={item.stock} className="border-b border-slate-100 dark:border-slate-700/50">
                      <td className="py-3 font-medium text-slate-900 dark:text-white">{item.stock}</td>
                      <td className="py-3 text-right">{item.shares}</td>
                      <td className="py-3 text-right">₹{item.avgPrice.toLocaleString()}</td>
                      <td className="py-3 text-right">₹{item.currentPrice.toLocaleString()}</td>
                      <td className={`py-3 text-right font-semibold ${item.impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.impact >= 0 ? '+' : ''}₹{item.impact.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
