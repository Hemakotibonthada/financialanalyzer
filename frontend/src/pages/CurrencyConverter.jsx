import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  ArrowLeftRight, Search, Star, StarOff, Bell, BellRing, TrendingUp, TrendingDown,
  RefreshCw, ChevronDown, Globe, DollarSign, Clock, Filter, X, Plus, Trash2, Check
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import MainLayout from '../components/MainLayout';
import api from '../services/api';
const loadLocal = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
const saveLocal = (key, data) => localStorage.setItem(key, JSON.stringify(data));

const AnimatedValue = ({ end, prefix = '₹', decimals = 2 }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start; const ref = { current: null };
    const animate = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1200, 1);
      setVal((1 - Math.pow(1 - p, 3)) * end);
      if (p < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [end]);
  return <span>{prefix}{val.toFixed(decimals)}</span>;
};

const POPULAR_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', flag: '🇨🇭' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷' },
];

export default function CurrencyConverter() {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState({});
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('INR');
  const [amount, setAmount] = useState(1);
  const [convertedAmount, setConvertedAmount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState(() => loadLocal('fa_currency_favorites', ['USD-INR', 'EUR-INR', 'GBP-INR']));
  const [alerts, setAlerts] = useState(() => loadLocal('fa_currency_alerts'));
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [historicalData, setHistoricalData] = useState([]);
  const [chartPeriod, setChartPeriod] = useState('1M');
  const [newAlert, setNewAlert] = useState({ pair: 'USD-INR', target: '', direction: 'above' });
  const [fromDropdownOpen, setFromDropdownOpen] = useState(false);
  const [toDropdownOpen, setToDropdownOpen] = useState(false);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      // Try backend currency API first
      const res = await api.get('/currency/rates');
      const apiRates = res.data?.rates || res.data?.data || res.data || {};
      if (Object.keys(apiRates).length > 0) {
        setRates(apiRates);
        saveLocal('fa_currency_rates', apiRates);
        return;
      }
    } catch { /* fallback */ }
    try {
      const saved = loadLocal('fa_currency_rates', null);
      if (saved && Object.keys(saved).length > 0) {
        setRates(saved);
      }
    } catch {
      // no saved rates
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  useEffect(() => { saveLocal('fa_currency_favorites', favorites); }, [favorites]);
  useEffect(() => { saveLocal('fa_currency_alerts', alerts); }, [alerts]);
  useEffect(() => { if (Object.keys(rates).length > 0) saveLocal('fa_currency_rates', rates); }, [rates]);

  useEffect(() => {
    if (rates[fromCurrency] && rates[toCurrency]) {
      const fromRate = fromCurrency === 'INR' ? 1 : rates[fromCurrency];
      const toRate = toCurrency === 'INR' ? 1 : rates[toCurrency];
      setConvertedAmount((amount * fromRate) / toRate);
    }
  }, [amount, fromCurrency, toCurrency, rates]);

  const handleSwap = useCallback(() => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  }, [fromCurrency, toCurrency]);

  const toggleFavorite = useCallback((pair) => {
    setFavorites(prev => prev.includes(pair) ? prev.filter(f => f !== pair) : [...prev, pair]);
  }, []);

  const addAlert = useCallback(() => {
    if (!newAlert.target) return;
    setAlerts(prev => [...prev, { ...newAlert, id: Date.now(), active: true, target: parseFloat(newAlert.target) }]);
    setNewAlert({ pair: 'USD-INR', target: '', direction: 'above' });
    setShowAlertModal(false);
  }, [newAlert]);

  const deleteAlert = useCallback((id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const filteredCurrencies = useMemo(() => {
    if (!searchQuery) return POPULAR_CURRENCIES;
    const q = searchQuery.toLowerCase();
    return POPULAR_CURRENCIES.filter(c =>
      c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const comparisonData = useMemo(() => {
    return POPULAR_CURRENCIES.filter(c => c.code !== 'INR').map(c => ({
      ...c,
      rate: rates[c.code] || 0,
    }));
  }, [rates]);

  const getCurrencyInfo = (code) => POPULAR_CURRENCIES.find(c => c.code === code) || { flag: '🌍', name: code, symbol: code };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in-up">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={`${dk ? 'text-slate-400' : 'text-slate-600'} text-lg`}>Loading exchange rates...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout title="Currency Converter">
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in-down">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${dk ? 'text-white' : 'text-slate-900'} flex items-center gap-3`}>
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl text-white shadow-lg shadow-green-600/30">
              <Globe className="w-6 h-6" />
            </div>
            Currency Converter
          </h1>
          <p className={`${dk ? 'text-slate-400' : 'text-slate-500'} mt-1`}>Enter exchange rates &amp; convert currencies</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowAlertModal(true)} className={`flex items-center gap-2 px-4 py-2.5 ${dk ? 'bg-amber-900/30 text-amber-400 hover:bg-amber-900/50 border-amber-800' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200'} rounded-xl text-sm font-medium transition-colors border`}>
            <BellRing className="w-4 h-4" /> Rate Alerts
          </button>
          <button onClick={fetchRates} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30">
            <RefreshCw className="w-4 h-4" /> Refresh Rates
          </button>
        </div>
      </div>

      {/* Converter Card */}
      <div className={`${dk ? 'bg-slate-800 border-slate-700 shadow-slate-900/50' : 'bg-white border-slate-200 shadow-slate-200/50'} rounded-2xl p-6 md:p-8 border animate-fade-in-up shadow-xl`}>
        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 md:gap-6 items-end">
          {/* From */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${dk ? 'text-slate-400' : 'text-slate-600'}`}>From</label>
            <div className="relative">
              <button onClick={() => { setFromDropdownOpen(!fromDropdownOpen); setToDropdownOpen(false); }}
                className={`w-full flex items-center gap-3 p-3 ${dk ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'} rounded-xl border hover:border-blue-400 transition-colors text-left`}>
                <span className="text-2xl">{getCurrencyInfo(fromCurrency).flag}</span>
                <div className="flex-1">
                  <div className={`font-semibold ${dk ? 'text-white' : 'text-slate-900'}`}>{fromCurrency}</div>
                  <div className={`text-xs ${dk ? 'text-slate-400' : 'text-slate-500'}`}>{getCurrencyInfo(fromCurrency).name}</div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              {fromDropdownOpen && (
                <div className={`absolute z-20 top-full mt-1 w-full ${dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-xl border shadow-xl max-h-60 overflow-y-auto`}>
                  {POPULAR_CURRENCIES.map(c => (
                    <button key={c.code} onClick={() => { setFromCurrency(c.code); setFromDropdownOpen(false); }}
                      className={`w-full flex items-center gap-3 p-3 ${dk ? 'hover:bg-slate-700' : 'hover:bg-slate-50'} transition-colors text-left`}>
                      <span className="text-lg">{c.flag}</span>
                      <span className={`font-medium ${dk ? 'text-white' : 'text-slate-900'}`}>{c.code}</span>
                      <span className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'}`}>{c.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input type="number" value={amount} onChange={e => setAmount(parseFloat(e.target.value) || 0)}
              className={`w-full p-3 ${dk ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} rounded-xl border text-2xl font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none`} />
          </div>

          {/* Swap */}
          <div className="flex justify-center md:pb-4">
            <button onClick={handleSwap}
              className={`p-3 ${dk ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 border-blue-800' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200'} rounded-full transition-all hover:scale-110 border`}>
              <ArrowLeftRight className="w-5 h-5" />
            </button>
          </div>

          {/* To */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${dk ? 'text-slate-400' : 'text-slate-600'}`}>To</label>
            <div className="relative">
              <button onClick={() => { setToDropdownOpen(!toDropdownOpen); setFromDropdownOpen(false); }}
                className={`w-full flex items-center gap-3 p-3 ${dk ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'} rounded-xl border hover:border-blue-400 transition-colors text-left`}>
                <span className="text-2xl">{getCurrencyInfo(toCurrency).flag}</span>
                <div className="flex-1">
                  <div className={`font-semibold ${dk ? 'text-white' : 'text-slate-900'}`}>{toCurrency}</div>
                  <div className={`text-xs ${dk ? 'text-slate-400' : 'text-slate-500'}`}>{getCurrencyInfo(toCurrency).name}</div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              {toDropdownOpen && (
                <div className={`absolute z-20 top-full mt-1 w-full ${dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-xl border shadow-xl max-h-60 overflow-y-auto`}>
                  {POPULAR_CURRENCIES.map(c => (
                    <button key={c.code} onClick={() => { setToCurrency(c.code); setToDropdownOpen(false); }}
                      className={`w-full flex items-center gap-3 p-3 ${dk ? 'hover:bg-slate-700' : 'hover:bg-slate-50'} transition-colors text-left`}>
                      <span className="text-lg">{c.flag}</span>
                      <span className={`font-medium ${dk ? 'text-white' : 'text-slate-900'}`}>{c.code}</span>
                      <span className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'}`}>{c.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className={`w-full p-3 bg-gradient-to-r ${dk ? 'from-green-900/20 to-emerald-900/20 border-green-800 text-green-400' : 'from-green-50 to-emerald-50 border-green-200 text-green-700'} rounded-xl border text-2xl font-bold`}>
              <AnimatedValue end={convertedAmount} prefix={getCurrencyInfo(toCurrency).symbol} />
            </div>
          </div>
        </div>

        <div className={`mt-4 flex items-center justify-between text-sm ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
          <div>1 {fromCurrency} = {(convertedAmount / (amount || 1)).toFixed(4)} {toCurrency}</div>
        </div>
      </div>

      {/* Favorites */}
      <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-slate-900'} mb-3 flex items-center gap-2`}>
          <Star className="w-5 h-5 text-amber-500" /> Favorite Pairs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {favorites.map(pair => {
            const [from, to] = pair.split('-');
            const rate = rates[from] || 1;
            return (
              <div key={pair} className={`${dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-2xl p-4 border flex items-center justify-between hover:shadow-lg transition-shadow`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{getCurrencyInfo(from).flag}</span>
                  <span className={`font-medium ${dk ? 'text-slate-300' : 'text-slate-700'}`}>{from}/{to}</span>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${dk ? 'text-white' : 'text-slate-900'}`}>{parseFloat(rate).toFixed(2)}</div>
                  <div className="text-xs text-slate-400">Rate vs INR</div>
                </div>
                <button onClick={() => toggleFavorite(pair)} className="p-1 text-amber-500 hover:text-amber-600">
                  <Star className="w-4 h-4 fill-current" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Historical Chart */}
      <div className={`${dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-2xl p-6 border animate-fade-in-up`} style={{ animationDelay: '200ms' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-slate-900'} flex items-center gap-2`}>
            <TrendingUp className="w-5 h-5 text-blue-500" /> Historical Rates — {fromCurrency}/{toCurrency}
          </h2>
          <div className={`flex ${dk ? 'bg-slate-700' : 'bg-slate-100'} rounded-lg p-1`}>
            {['1W', '1M', '3M', '6M', '1Y'].map(p => (
              <button key={p} onClick={() => setChartPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${chartPeriod === p ? (dk ? 'bg-slate-600 text-blue-400 shadow-sm' : 'bg-white text-blue-600 shadow-sm') : (dk ? 'text-slate-400 hover:text-slate-700' : 'text-slate-500 hover:text-slate-700')}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historicalData}>
              <defs>
                <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} />
              <Legend />
              <Area type="monotone" dataKey="rate" stroke="#3b82f6" fill="url(#rateGradient)" strokeWidth={2} name="Exchange Rate" />
              <Area type="monotone" dataKey="avg" stroke="#f59e0b" fill="none" strokeWidth={1.5} strokeDasharray="5 5" name="Average" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Currency Comparison Table */}
      <div className={`${dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-2xl p-6 border animate-fade-in-up`} style={{ animationDelay: '300ms' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-slate-900'} flex items-center gap-2`}>
            <DollarSign className="w-5 h-5 text-green-500" /> Rates vs INR
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search currency..."
              className={`pl-9 pr-4 py-2 ${dk ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 outline-none`} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${dk ? 'border-slate-700' : 'border-slate-200'}`}>
                <th className={`text-left py-3 px-4 text-xs font-medium ${dk ? 'text-slate-400' : 'text-slate-500'} uppercase`}>Currency</th>
                <th className={`text-right py-3 px-4 text-xs font-medium ${dk ? 'text-slate-400' : 'text-slate-500'} uppercase`}>Rate (INR)</th>
                <th className={`text-center py-3 px-4 text-xs font-medium ${dk ? 'text-slate-400' : 'text-slate-500'} uppercase`}>Favorite</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.filter(c => !searchQuery || c.code.toLowerCase().includes(searchQuery.toLowerCase()) || c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(c => (
                <tr key={c.code} className={`border-b ${dk ? 'border-slate-700/50 hover:bg-slate-700/30' : 'border-slate-100 hover:bg-slate-50'} transition-colors`}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{c.flag}</span>
                      <div>
                        <div className={`font-medium ${dk ? 'text-white' : 'text-slate-900'}`}>{c.code}</div>
                        <div className={`text-xs ${dk ? 'text-slate-400' : 'text-slate-500'}`}>{c.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <input type="number" step="0.01" value={c.rate || ''}
                      onChange={e => setRates(prev => ({ ...prev, [c.code]: parseFloat(e.target.value) || 0 }))}
                      className={`w-24 text-right font-semibold ${dk ? 'text-white bg-slate-700 border-slate-600' : 'text-slate-900 bg-slate-50 border-slate-200'} border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none`} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button onClick={() => toggleFavorite(`${c.code}-INR`)}
                      className={`p-1.5 rounded-lg transition-colors ${favorites.includes(`${c.code}-INR`) ? 'text-amber-500' : (dk ? 'text-slate-600 hover:text-amber-400' : 'text-slate-300 hover:text-amber-400')}`}>
                      {favorites.includes(`${c.code}-INR`) ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className={`${dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-2xl p-6 border animate-fade-in-up`} style={{ animationDelay: '400ms' }}>
          <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-slate-900'} mb-4 flex items-center gap-2`}>
            <Bell className="w-5 h-5 text-amber-500" /> Active Alerts
          </h2>
          <div className="space-y-3">
            {alerts.map(alert => (
              <div key={alert.id} className={`flex items-center justify-between p-4 ${dk ? 'bg-slate-700/50' : 'bg-slate-50'} rounded-xl`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${alert.active ? (dk ? 'bg-green-900/30 text-green-600' : 'bg-green-100 text-green-600') : (dk ? 'bg-slate-600 text-slate-400' : 'bg-slate-200 text-slate-400')}`}>
                    <BellRing className="w-4 h-4" />
                  </div>
                  <div>
                    <div className={`font-medium ${dk ? 'text-white' : 'text-slate-900'}`}>{alert.pair}</div>
                    <div className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'}`}>Alert when rate goes {alert.direction} {alert.target}</div>
                  </div>
                </div>
                <button onClick={() => deleteAlert(alert.id)} className={`p-2 text-red-400 hover:text-red-600 ${dk ? 'hover:bg-red-900/20' : 'hover:bg-red-50'} rounded-lg transition-colors`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAlertModal(false)}>
          <div className={`${dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-2xl p-6 w-full max-w-md shadow-2xl border animate-scale-in`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-slate-900'}`}>Create Rate Alert</h3>
              <button onClick={() => setShowAlertModal(false)} className={`p-2 ${dk ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} rounded-lg transition-colors`}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${dk ? 'text-slate-300' : 'text-slate-700'} mb-1`}>Currency Pair</label>
                <select value={newAlert.pair} onChange={e => setNewAlert(p => ({ ...p, pair: e.target.value }))}
                  className={`w-full p-3 ${dk ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} rounded-xl border outline-none focus:ring-2 focus:ring-blue-500`}>
                  {POPULAR_CURRENCIES.filter(c => c.code !== 'INR').map(c => (
                    <option key={c.code} value={`${c.code}-INR`}>{c.code}/INR</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium ${dk ? 'text-slate-300' : 'text-slate-700'} mb-1`}>Direction</label>
                <div className="flex gap-2">
                  {['above', 'below'].map(d => (
                    <button key={d} onClick={() => setNewAlert(p => ({ ...p, direction: d }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${newAlert.direction === d ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : (dk ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-600')}`}>
                      {d === 'above' ? '↑ Goes Above' : '↓ Goes Below'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium ${dk ? 'text-slate-300' : 'text-slate-700'} mb-1`}>Target Rate</label>
                <input type="number" step="0.01" value={newAlert.target} onChange={e => setNewAlert(p => ({ ...p, target: e.target.value }))} placeholder="e.g. 84.50"
                  className={`w-full p-3 ${dk ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} rounded-xl border outline-none focus:ring-2 focus:ring-blue-500`} />
              </div>
              <button onClick={addAlert}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Create Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </MainLayout>
  );
}
