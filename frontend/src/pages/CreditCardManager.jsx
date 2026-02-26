import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard, Plus, X, Calendar, Gift, AlertTriangle, TrendingUp,
  ChevronLeft, ChevronRight, Star, Eye, EyeOff, Wallet, BarChart3,
  Clock, Shield, Palette, Check
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, RadialBarChart, RadialBar, Legend
} from 'recharts';
import api from '../services/api';

const AnimatedValue = ({ end, prefix = '₹' }) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    let s; const r = { current: null };
    const a = (t) => { if (!s) s = t; const p = Math.min((t - s) / 1200, 1); setV((1 - Math.pow(1 - p, 3)) * end); if (p < 1) r.current = requestAnimationFrame(a); };
    r.current = requestAnimationFrame(a); return () => cancelAnimationFrame(r.current);
  }, [end]);
  return <span>{prefix}{Math.round(v).toLocaleString()}</span>;
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
const CARD_COLORS = ['#1e3a5f', '#0f4c3a', '#4a1942', '#2d1b4e', '#1a1a2e', '#3d0c02', '#0d3b66'];
const CARD_GRADIENTS = [
  'from-blue-900 to-blue-700', 'from-emerald-900 to-emerald-700', 'from-purple-900 to-purple-700',
  'from-slate-900 to-slate-700', 'from-rose-900 to-rose-700', 'from-amber-900 to-amber-700', 'from-cyan-900 to-cyan-700',
];

const UtilizationRing = ({ used, limit, size = 100 }) => {
  const pct = Math.round((used / limit) * 100);
  const circumference = 2 * Math.PI * 38;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct > 75 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#e2e8f0" strokeWidth="8" className="dark:stroke-slate-600" />
        <circle cx="50" cy="50" r="38" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} transform="rotate(-90 50 50)" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold" style={{ color }}>{pct}%</span>
      </div>
    </div>
  );
};

export default function CreditCardManager() {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNumbers, setShowNumbers] = useState({});
  const [newCard, setNewCard] = useState({ name: '', number: '', expiry: '', limit: '', gradient: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/financial/credit-cards');
        const fetched = res.data?.data?.creditCards || res.data?.creditCards || res.data?.data || res.data || [];
        setCards(Array.isArray(fetched) ? fetched : []);
      } catch {
        setCards([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const card = cards[selectedCard] || cards[0];
  const totalLimit = cards.reduce((s, c) => s + (c.limit || 0), 0);
  const totalBalance = cards.reduce((s, c) => s + (c.balance || 0), 0);
  const totalRewards = cards.reduce((s, c) => s + (c.rewards || 0), 0);
  const overallUtil = totalLimit ? Math.round((totalBalance / totalLimit) * 100) : 0;

  const daysUntilDue = (dateStr) => {
    if (!dateStr) return 0;
    const due = new Date(dateStr); const now = new Date();
    return Math.max(0, Math.ceil((due - now) / (1000 * 60 * 60 * 24)));
  };

  const addCard = async () => {
    if (!newCard.name || !newCard.number) return;
    const cardData = {
      name: newCard.name,
      number: newCard.number.replace(/\d(?=\d{4})/g, '*'),
      expiry: newCard.expiry || '12/28',
      limit: +newCard.limit || 100000,
      balance: 0,
      dueDate: '',
      rewards: 0,
      gradient: newCard.gradient,
      network: 'Visa',
      spending: [{ cat: 'Other', amount: 0 }]
    };
    try {
      const res = await api.post('/financial/credit-cards', cardData);
      const saved = res.data?.data || res.data || cardData;
      setCards((prev) => [...prev, { ...cardData, ...saved, id: saved._id || saved.id || Date.now() }]);
    } catch {
      // Still add locally so user sees immediate feedback
      setCards((prev) => [...prev, { ...cardData, id: Date.now() }]);
    }
    setNewCard({ name: '', number: '', expiry: '', limit: '', gradient: 0 });
    setShowAddModal(false);
  };

  const makePayment = async (cardId, amount) => {
    try {
      await api.post(`/financial/credit-cards/${cardId}/payment`, { amount });
      setCards((prev) => prev.map((c) => c.id === cardId || c._id === cardId ? { ...c, balance: Math.max(0, c.balance - amount) } : c));
    } catch (err) {
      console.error('Payment failed:', err);
    }
  };

  const toggleShowNumber = (id) => setShowNumbers((p) => ({ ...p, [id]: !p[id] }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading cards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3"><CreditCard className="w-8 h-8 text-purple-600" /> Credit Cards</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your credit cards & track spending</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-600/30 px-4 py-2 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Card
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 dashboard-grid animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2"><Wallet className="w-5 h-5 text-blue-600" /><span className="text-xs text-slate-500 dark:text-slate-400">Total Limit</span></div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white"><AnimatedValue end={totalLimit} /></p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-5 h-5 text-red-500" /><span className="text-xs text-slate-500 dark:text-slate-400">Total Outstanding</span></div>
            <p className="text-2xl font-bold text-red-500"><AnimatedValue end={totalBalance} /></p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2"><Shield className="w-5 h-5 text-amber-600" /><span className="text-xs text-slate-500 dark:text-slate-400">Overall Utilization</span></div>
            <p className={`text-2xl font-bold ${overallUtil > 75 ? 'text-red-500' : overallUtil > 50 ? 'text-amber-600' : 'text-emerald-600'}`}>{overallUtil}%</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2"><Gift className="w-5 h-5 text-purple-600" /><span className="text-xs text-slate-500 dark:text-slate-400">Total Rewards</span></div>
            <p className="text-2xl font-bold text-purple-600"><AnimatedValue end={totalRewards} prefix="" /> pts</p>
          </div>
        </div>

        {/* Card Carousel */}
        <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => setSelectedCard(Math.max(0, selectedCard - 1))} disabled={selectedCard === 0} className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 overflow-hidden">
              <div className="flex gap-4 transition-transform duration-300" style={{ transform: `translateX(-${selectedCard * 340}px)` }}>
                {cards.map((c, i) => {
                  const cid = c.id || c._id || i;
                  return (
                  <div key={cid} onClick={() => setSelectedCard(i)} className={`min-w-[320px] rounded-2xl p-6 bg-gradient-to-br ${CARD_GRADIENTS[(c.gradient || 0) % CARD_GRADIENTS.length]} text-white cursor-pointer transition-all duration-300 ${selectedCard === i ? 'scale-105 shadow-2xl ring-2 ring-white/30' : 'opacity-80 hover:opacity-100'}`}>
                    <div className="flex items-start justify-between mb-8">
                      <div>
                        <p className="text-xs text-white/60 uppercase tracking-wider">{c.network}</p>
                        <p className="font-bold text-lg mt-1">{c.name}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); toggleShowNumber(cid); }} className="p-1 rounded-lg hover:bg-white/10">
                        {showNumbers[cid] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xl font-mono tracking-widest mb-6">{showNumbers[cid] ? (c.number || '').replace(/\*/g, '5') : c.number}</p>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs text-white/60">Valid Thru</p>
                        <p className="font-medium">{c.expiry}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-white/60">Balance</p>
                        <p className="font-bold text-lg">₹{(c.balance || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
            <button onClick={() => setSelectedCard(Math.min(cards.length - 1, selectedCard + 1))} disabled={selectedCard >= cards.length - 1} className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {card && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card Details */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Card Details</h3>
              <div className="flex justify-center mb-6">
                <UtilizationRing used={card.balance || 0} limit={card.limit || 1} size={120} />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Credit Limit</span>
                  <span className="font-semibold text-slate-900 dark:text-white">₹{(card.limit || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Outstanding</span>
                  <span className="font-semibold text-red-500">₹{(card.balance || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Available</span>
                  <span className="font-semibold text-emerald-600">₹{((card.limit || 0) - (card.balance || 0)).toLocaleString()}</span>
                </div>
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Due Date</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{card.dueDate}</span>
                  </div>
                  <div className="mt-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-400">{daysUntilDue(card.dueDate)} days until payment due</span>
                    </div>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1"><Gift className="w-3.5 h-3.5" /> Rewards</span>
                  <span className="font-semibold text-purple-600">{(card.rewards || 0).toLocaleString()} pts</span>
                </div>
              </div>
            </div>

            {/* Spending by Category */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Spending by Category</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={card.spending || []} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="amount" nameKey="cat" paddingAngle={3} animationDuration={1200}>
                    {(card.spending || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {(card.spending || []).map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-slate-600 dark:text-slate-400">{s.cat}: ₹{(s.amount || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Statement Summary */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Statement Summary</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Billed</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">₹{(card.balance || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Minimum Due</p>
                  <p className="text-xl font-bold text-amber-600">₹{Math.round((card.balance || 0) * 0.05).toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Reward Value</p>
                      <p className="text-lg font-bold text-purple-600">₹{Math.round((card.rewards || 0) * 0.25).toLocaleString()}</p>
                    </div>
                    <Star className="w-8 h-8 text-amber-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All Cards Comparison */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-600" /> Usage Across Cards</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={cards.map((c) => ({ name: (c.name || '').split(' ').pop(), used: c.balance || 0, available: (c.limit || 0) - (c.balance || 0) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
              <Bar dataKey="used" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} name="Used" />
              <Bar dataKey="available" stackId="a" fill="#10b981" radius={[6, 6, 0, 0]} name="Available" />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Due Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 dashboard-grid animate-fade-in-up" style={{ animationDelay: '700ms' }}>
          {cards.map((c, i) => {
            const days = daysUntilDue(c.dueDate);
            const cid = c.id || c._id || i;
            return (
              <div key={cid} className={`bg-white dark:bg-slate-800 rounded-2xl p-4 border ${days <= 3 ? 'border-red-300 dark:border-red-700' : days <= 7 ? 'border-amber-300 dark:border-amber-700' : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {days <= 3 && <AlertTriangle className="w-4 h-4 text-red-500" />}
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{c.name}</p>
                </div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">₹{(c.balance || 0).toLocaleString()}</p>
                <p className={`text-xs mt-1 font-medium ${days <= 3 ? 'text-red-500' : days <= 7 ? 'text-amber-500' : 'text-slate-400'}`}>
                  Due in {days} days ({c.dueDate})
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Card Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Add Credit Card</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-3">
              <input value={newCard.name} onChange={(e) => setNewCard({ ...newCard, name: e.target.value })} placeholder="Card Name (e.g., HDFC Regalia)" className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm border-0 outline-none focus:ring-2 focus:ring-blue-500" />
              <input value={newCard.number} onChange={(e) => setNewCard({ ...newCard, number: e.target.value })} placeholder="Card Number (last 4 digits)" className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm border-0 outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="grid grid-cols-2 gap-3">
                <input value={newCard.expiry} onChange={(e) => setNewCard({ ...newCard, expiry: e.target.value })} placeholder="MM/YY" className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm border-0 outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="number" value={newCard.limit} onChange={(e) => setNewCard({ ...newCard, limit: e.target.value })} placeholder="Credit Limit" className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm border-0 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {/* Color Picker */}
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1"><Palette className="w-3.5 h-3.5" /> Card Color</p>
                <div className="flex gap-2">
                  {CARD_GRADIENTS.map((g, i) => (
                    <button key={i} onClick={() => setNewCard({ ...newCard, gradient: i })} className={`w-8 h-8 rounded-lg bg-gradient-to-br ${g} flex items-center justify-center ${newCard.gradient === i ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800' : ''}`}>
                      {newCard.gradient === i && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium">Cancel</button>
              <button onClick={addCard} className="flex-1 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-600/30 px-4 py-2.5">Add Card</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
