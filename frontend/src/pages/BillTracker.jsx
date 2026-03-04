import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Receipt, Calendar, Bell, Plus, X, Edit2, Trash2, Search,
  CreditCard, Home, Wifi, Shield, Car, Zap, AlertTriangle,
  CheckCircle, Clock, ChevronLeft, ChevronRight, ToggleLeft,
  ToggleRight, Repeat, DollarSign, Users, TrendingUp, Filter,
  Loader2
} from 'lucide-react';
import MainLayout from '../components/MainLayout';
import api from '../services/api';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

const fmt = (n) => `₹${n.toLocaleString('en-IN')}`;

const categoryIcons = { Utilities: Zap, Subscriptions: Wifi, Insurance: Shield, Rent: Home, EMI: CreditCard, Transport: Car };
const categoryColors = { Utilities: '#F59E0B', Subscriptions: '#8B5CF6', Insurance: '#3B82F6', Rent: '#10B981', EMI: '#EF4444', Transport: '#06B6D4' };

// Map backend category to frontend display category
const mapCategory = (cat) => {
  const map = {
    electricity: 'Utilities', water: 'Utilities', gas: 'Utilities',
    internet: 'Utilities', mobile: 'Utilities', milk: 'Utilities',
    rent: 'Rent', subscription: 'Subscriptions', insurance: 'Insurance',
    loan: 'EMI', other: 'Utilities',
  };
  return map[cat] || cat || 'Utilities';
};

// Map frontend display category back to backend category
const reverseMapCategory = (cat) => {
  const map = {
    Utilities: 'other', Subscriptions: 'subscription', Insurance: 'insurance',
    Rent: 'rent', EMI: 'loan', Transport: 'other',
  };
  return map[cat] || 'other';
};

// Normalize backend bill to frontend shape
const normalizeBill = (b) => ({
  id: b._id || b.id,
  name: b.title || b.name || '',
  amount: b.amount || 0,
  category: mapCategory(b.category),
  dueDate: b.dueDate ? new Date(b.dueDate).getDate() : 1,
  autoPay: b.autoPayEnabled ?? b.autoPay ?? false,
  paid: b.isPaid || b.status === 'paid',
  provider: b.vendor?.name || b.provider || '',
});

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function BillTracker() {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editBill, setEditBill] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [formData, setFormData] = useState({ name: '', amount: '', category: 'Utilities', dueDate: '', autoPay: false, provider: '' });
  const [reminderDays, setReminderDays] = useState(3);

  const today = new Date().getDate();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Fetch bills from API on mount
  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/bill-reminders');
      const data = res.data?.data || res.data || [];
      const normalized = (Array.isArray(data) ? data : []).map(normalizeBill);
      setBills(normalized);
    } catch (err) {
      console.error('Failed to fetch bills:', err);
      setError('Failed to load bills');
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => ['All', ...new Set(bills.map(b => b.category))], [bills]);

  const filteredBills = useMemo(() => {
    return bills.filter(b => {
      if (filterCategory !== 'All' && b.category !== filterCategory) return false;
      if (search && !b.name.toLowerCase().includes(search.toLowerCase()) && !b.provider.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [bills, filterCategory, search]);

  const totalMonthly = useMemo(() => bills.reduce((s, b) => s + b.amount, 0), [bills]);
  const paidAmount = useMemo(() => bills.filter(b => b.paid).reduce((s, b) => s + b.amount, 0), [bills]);
  const overdueBills = useMemo(() => bills.filter(b => !b.paid && b.dueDate < today), [bills, today]);
  const upcomingBills = useMemo(() => bills.filter(b => !b.paid && b.dueDate >= today).sort((a, b) => a.dueDate - b.dueDate), [bills, today]);

  const monthlySummary = useMemo(() => {
    const map = {};
    bills.forEach(b => {
      if (!map[b.category]) map[b.category] = 0;
      map[b.category] += b.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [bills]);

  const annualForecast = useMemo(() => {
    const total = bills.reduce((s, b) => s + b.amount, 0);
    return monthNames.map(m => ({ month: m, amount: total }));
  }, [bills]);

  const paymentHistory = [];

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const billDays = new Set(bills.map(b => b.dueDate));

  const toggleAutoPay = async (id) => {
    const bill = bills.find(b => b.id === id);
    if (!bill) return;
    const prev = bills;
    setBills(bills.map(b => b.id === id ? { ...b, autoPay: !b.autoPay } : b));
    try {
      await api.put(`/bill-reminders/${id}`, { autoPayEnabled: !bill.autoPay });
    } catch (err) {
      console.error('Failed to toggle auto-pay:', err);
      setBills(prev);
    }
  };

  const markPaid = async (id) => {
    const prev = bills;
    setBills(bills.map(b => b.id === id ? { ...b, paid: true } : b));
    try {
      await api.post(`/bill-reminders/${id}/mark-paid`);
    } catch (err) {
      console.error('Failed to mark paid:', err);
      setBills(prev);
    }
  };

  const deleteBill = async (id) => {
    const prev = bills;
    setBills(bills.filter(b => b.id !== id));
    try {
      await api.delete(`/bill-reminders/${id}`);
    } catch (err) {
      console.error('Failed to delete bill:', err);
      setBills(prev);
    }
  };

  const openAdd = () => {
    setEditBill(null);
    setFormData({ name: '', amount: '', category: 'Utilities', dueDate: '', autoPay: false, provider: '' });
    setShowModal(true);
  };

  const openEdit = (b) => {
    setEditBill(b.id);
    setFormData({ name: b.name, amount: b.amount, category: b.category, dueDate: b.dueDate, autoPay: b.autoPay, provider: b.provider });
    setShowModal(true);
  };

  const saveBill = async () => {
    if (!formData.name || !formData.amount) return;
    const dueDay = Number(formData.dueDate);
    const dueDateObj = new Date(calYear, calMonth, dueDay);
    const payload = {
      title: formData.name,
      amount: Number(formData.amount),
      category: reverseMapCategory(formData.category),
      dueDate: dueDateObj.toISOString(),
      autoPayEnabled: formData.autoPay,
      vendor: { name: formData.provider },
    };

    try {
      if (editBill) {
        const res = await api.put(`/bill-reminders/${editBill}`, payload);
        const updated = normalizeBill(res.data?.data || res.data);
        setBills(bills.map(b => b.id === editBill ? updated : b));
      } else {
        const res = await api.post('/bill-reminders', payload);
        const created = normalizeBill(res.data?.data || res.data);
        setBills([...bills, created]);
      }
    } catch (err) {
      console.error('Failed to save bill:', err);
      // Fallback: update locally so UI stays responsive
      const data = { ...formData, amount: Number(formData.amount), dueDate: dueDay, paid: false };
      if (editBill) {
        setBills(bills.map(b => b.id === editBill ? { ...b, ...data } : b));
      } else {
        setBills([...bills, { ...data, id: Date.now().toString() }]);
      }
    }
    setShowModal(false);
  };

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading bills...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout title="Bill Tracker">
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Receipt className="w-7 h-7 text-blue-600" /> Bill Tracker
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Never miss a payment — manage all your bills in one place</p>
        </div>
        <button onClick={openAdd} className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 px-4 py-2 flex items-center gap-2 w-fit">
          <Plus className="w-4 h-4" /> Add Bill
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200 flex-1">{error}</p>
          <button onClick={fetchBills} className="bg-amber-600 text-white rounded-xl text-xs font-medium px-3 py-1.5">Retry</button>
        </div>
      )}

      {/* Overdue Alert */}
      {overdueBills.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">{overdueBills.length} Overdue Bill{overdueBills.length > 1 ? 's' : ''}!</p>
            <p className="text-xs text-red-600 dark:text-red-400">{overdueBills.map(b => b.name).join(', ')} — Total: {fmt(overdueBills.reduce((s, b) => s + b.amount, 0))}</p>
          </div>
          <button className="bg-red-600 text-white rounded-xl text-xs font-medium px-3 py-1.5">Pay Now</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Bills/Month', value: fmt(totalMonthly), icon: DollarSign, color: 'text-blue-600', sub: `${bills.length} bills` },
          { label: 'Paid This Month', value: fmt(paidAmount), icon: CheckCircle, color: 'text-green-600', sub: `${bills.filter(b => b.paid).length} of ${bills.length}` },
          { label: 'Overdue', value: fmt(overdueBills.reduce((s, b) => s + b.amount, 0)), icon: AlertTriangle, color: 'text-red-600', sub: `${overdueBills.length} bill${overdueBills.length !== 1 ? 's' : ''}` },
          { label: 'Upcoming', value: fmt(upcomingBills.reduce((s, b) => s + b.amount, 0)), icon: Clock, color: 'text-amber-600', sub: `Next: ${upcomingBills[0]?.name || 'None'}` },
        ].map((c, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">{c.label}</span>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{c.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Calendar + Category Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Bills Calendar</h2>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronLeft className="w-4 h-4 text-slate-500" /></button>
              <span className="text-sm font-medium text-slate-800 dark:text-white min-w-[100px] text-center">{monthNames[calMonth]} {calYear}</span>
              <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronRight className="w-4 h-4 text-slate-500" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-xs text-slate-500 dark:text-slate-400 py-2 font-medium">{d}</div>
            ))}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
            {calendarDays.map(day => {
              const hasBill = billDays.has(day);
              const isToday = day === today && calMonth === currentMonth && calYear === currentYear;
              return (
                <div key={day} className={`py-2 rounded-lg text-sm relative cursor-pointer ${isToday ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                  {day}
                  {hasBill && <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${isToday ? 'bg-white' : 'bg-blue-500'}`} />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Monthly Bill Summary</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlySummary} layout="vertical">
              <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} width={100} />
              <Tooltip formatter={v => fmt(v)} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {monthlySummary.map((entry, i) => <rect key={i} fill={categoryColors[entry.name] || COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bill List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">All Bills</h2>
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bills..." className="pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white w-48" />
            </div>
            <div className="flex gap-1 flex-wrap">
              {categories.map(c => (
                <button key={c} onClick={() => setFilterCategory(c)} className={`px-3 py-1.5 rounded-xl text-xs font-medium ${filterCategory === c ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {filteredBills.map(b => {
            const isOverdue = !b.paid && b.dueDate < today;
            const Icon = categoryIcons[b.category] || Receipt;
            const color = categoryColors[b.category] || '#64748b';
            return (
              <div key={b.id} className={`flex items-center gap-4 p-4 rounded-xl border ${b.paid ? 'bg-green-50/50 dark:bg-green-900/5 border-green-100 dark:border-green-900/30' : isOverdue ? 'bg-red-50/50 dark:bg-red-900/5 border-red-100 dark:border-red-900/30' : 'bg-slate-50 dark:bg-slate-700/30 border-slate-100 dark:border-slate-700'}`}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{b.name}</p>
                    {b.paid && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                    {isOverdue && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{b.provider} • Due: {b.dueDate}th</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{fmt(b.amount)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${b.category === 'EMI' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>{b.category}</span>
                </div>
                <button onClick={() => toggleAutoPay(b.id)} title="Toggle Auto-Pay" className="flex-shrink-0">
                  {b.autoPay ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
                </button>
                <div className="flex gap-1 flex-shrink-0">
                  {!b.paid && <button onClick={() => markPaid(b.id)} className="text-green-600 hover:text-green-700 p-1"><CheckCircle className="w-4 h-4" /></button>}
                  <button onClick={() => openEdit(b)} className="text-slate-400 hover:text-slate-600 p-1"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteBill(b.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment History + Annual Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Payment History</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={paymentHistory}>
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip formatter={v => fmt(v)} />
              <Legend />
              <Bar dataKey="onTime" stackId="a" fill="#10B981" name="On Time" radius={[0, 0, 0, 0]} />
              <Bar dataKey="late" stackId="a" fill="#EF4444" name="Late" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Annual Bill Forecast</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={annualForecast}>
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip formatter={v => fmt(v)} />
              <Bar dataKey="amount" fill="#3B82F6" name="Estimated" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-2">Estimated annual total: {fmt(annualForecast.reduce((s, m) => s + m.amount, 0))}</p>
        </div>
      </div>

      {/* Reminders Config + Bill Splitting */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" /> Reminder Settings
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
              <span className="text-sm text-slate-700 dark:text-slate-300">Remind days before due</span>
              <select value={reminderDays} onChange={e => setReminderDays(Number(e.target.value))} className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white px-2 py-1">
                {[1, 2, 3, 5, 7].map(d => <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>)}
              </select>
            </div>
            {['Email Reminders', 'Push Notifications', 'SMS Alerts'].map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                <span className="text-sm text-slate-700 dark:text-slate-300">{r}</span>
                <button className={`w-10 h-5 rounded-full relative ${i < 2 ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 ${i < 2 ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" /> Bill Splitting
          </h2>
          <div className="space-y-3">
            {[
              { bill: 'House Rent', total: 25000, split: 2, your: 12500 },
              { bill: 'Electricity', total: 2500, split: 2, your: 1250 },
              { bill: 'Internet', total: 999, split: 2, your: 500 },
            ].map((s, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-slate-800 dark:text-white">{s.bill}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">{s.split} people</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Total: {fmt(s.total)}</span>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">Your share: {fmt(s.your)}</span>
                </div>
              </div>
            ))}
            <button className="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm py-2 flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Add Split Bill
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-slate-200 dark:border-slate-700 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{editBill ? 'Edit' : 'Add'} Bill</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Bill Name</label>
                <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Amount (₹)</label>
                  <input type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Due Date (Day)</label>
                  <input type="number" min={1} max={31} value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Category</label>
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm">
                    {Object.keys(categoryIcons).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Provider</label>
                  <input value={formData.provider} onChange={e => setFormData({ ...formData, provider: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                <span className="text-sm text-slate-700 dark:text-slate-300">Auto-Pay</span>
                <button onClick={() => setFormData({ ...formData, autoPay: !formData.autoPay })} className={`w-10 h-5 rounded-full relative ${formData.autoPay ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 ${formData.autoPay ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setShowModal(false)} className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm px-4 py-2">Cancel</button>
              <button onClick={saveBill} className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 px-4 py-2">Save Bill</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </MainLayout>
  );
}
