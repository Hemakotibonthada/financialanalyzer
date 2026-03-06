import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon, DollarSign,
  CreditCard, TrendingUp, Bell, Check, Clock, Tag, Edit2, Trash2, Repeat,
  AlertTriangle
} from 'lucide-react';
import api from '../services/api';
import MainLayout from '../components/MainLayout';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EVENT_TYPES = [
  { id: 'income', label: 'Income', color: '#10b981', icon: TrendingUp },
  { id: 'expense', label: 'Expense', color: '#ef4444', icon: DollarSign },
  { id: 'bill', label: 'Bill Due', color: '#f59e0b', icon: Bell },
  { id: 'emi', label: 'EMI', color: '#6366f1', icon: CreditCard },
  { id: 'subscription', label: 'Subscription', color: '#8b5cf6', icon: Repeat },
  { id: 'reminder', label: 'Reminder', color: '#06b6d4', icon: Clock },
];

const EventForm = ({ event, onSave, onCancel }) => {
  const [form, setForm] = useState(event || {
    title: '', type: 'expense', amount: '', date: new Date().toISOString().split('T')[0],
    recurring: false, recurrence: 'monthly', notes: '',
  });
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, amount: parseFloat(form.amount) || 0 });
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm">
            {EVENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (₹)</label>
          <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input type="checkbox" checked={form.recurring} onChange={e => setForm({ ...form, recurring: e.target.checked })} className="rounded" />
            Recurring
          </label>
        </div>
      </div>
      {form.recurring && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Recurrence</label>
          <select value={form.recurrence} onChange={e => setForm({ ...form, recurrence: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm">
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
        <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm resize-none outline-none" />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium">Cancel</button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Save</button>
      </div>
    </form>
  );
};

export default function FinancialCalendar() {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const startDate = new Date(year, month, 1).toISOString();
        const endDate = new Date(year, month + 1, 0).toISOString();
        const [txRes, billRes, emiRes] = await Promise.all([
          api.get('/transactions', { params: { startDate, endDate, limit: 500 } }).catch(() => ({ data: { data: [] } })),
          api.get('/bill-reminders').catch(() => ({ data: { data: [] } })),
          api.get('/emi/overview').catch(() => ({ data: { data: { activeEMIs: [] } } })),
        ]);

        const txRaw = txRes.data?.data || txRes.data?.transactions || [];
        const txns = (Array.isArray(txRaw) ? txRaw : []).map(t => ({
          id: t._id || t.id,
          title: t.description || t.name || 'Transaction',
          amount: t.amount || 0,
          date: t.date,
          type: t.type === 'income' || t.type === 'credit' ? 'income' : 'expense',
          source: 'transaction',
        }));

        const billRaw = billRes.data?.data || billRes.data?.reminders || [];
        const bills = (Array.isArray(billRaw) ? billRaw : []).map(b => ({
          id: b._id || b.id,
          title: b.name || b.title || 'Bill',
          amount: b.amount || 0,
          date: b.dueDate || b.date,
          type: 'bill',
          recurring: b.recurring || false,
          source: 'bill',
        }));

        const emiRaw = emiRes.data?.data?.activeEMIs || emiRes.data?.data || [];
        const emis = (Array.isArray(emiRaw) ? emiRaw : []).map(e => ({
          id: e._id || e.id,
          title: e.merchantName || e.name || e.loanName || 'EMI',
          amount: e.emiAmount || e.amount || 0,
          date: e.nextDueDate || e.dueDate || e.date,
          type: 'emi',
          source: 'emi',
        }));

        setEvents([...txns, ...bills, ...emis]);
      } catch (err) {
        console.error('Error fetching calendar events:', err);
        setError('Failed to load calendar events.');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [year, month]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const days = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: daysInPrevMonth - i, isCurrentMonth: false, date: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, isCurrentMonth: true, date: dateStr });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isCurrentMonth: false, date: null });
    }
    return days;
  }, [year, month]);

  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach(evt => {
      if (!evt.date) return;
      const d = new Date(evt.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[key]) map[key] = [];
      map[key].push(evt);
    });
    return map;
  }, [events]);

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate[selectedDate] || [];
  }, [selectedDate, eventsByDate]);

  const monthSummary = useMemo(() => {
    const income = events.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
    const expense = events.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);
    const bills = events.filter(e => e.type === 'bill').reduce((s, e) => s + (e.amount || 0), 0);
    const emis = events.filter(e => e.type === 'emi').reduce((s, e) => s + (e.amount || 0), 0);
    return { income, expense, bills, emis, total: events.length };
  }, [events]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter(e => e.date && new Date(e.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 8);
  }, [events]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => { setCurrentDate(new Date()); setSelectedDate(new Date().toISOString().split('T')[0]); };

  const isToday = (dateStr) => dateStr === new Date().toISOString().split('T')[0];

  const handleSaveEvent = useCallback((data) => {
    if (editingEvent) {
      setEvents(prev => prev.map(e => (e.id === editingEvent.id) ? { ...e, ...data } : e));
    } else {
      setEvents(prev => [...prev, { ...data, id: `custom-${Date.now()}`, source: 'custom' }]);
    }
    setShowAddModal(false);
    setEditingEvent(null);
  }, [editingEvent]);

  const handleDeleteEvent = useCallback((id) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  const getEventColor = (type) => EVENT_TYPES.find(t => t.id === type)?.color || '#64748b';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 text-lg">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout title="Financial Calendar">
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-6 space-y-6">
      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-400 text-sm">{error}</div>}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-blue-600" /> Financial Calendar
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track bills, EMIs, and financial events</p>
        </div>
        <button onClick={() => { setEditingEvent(null); setShowAddModal(true); }}
          className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 px-4 py-2.5 flex items-center gap-2 w-fit shadow-lg shadow-blue-600/30">
          <Plus className="w-4 h-4" /> Add Event
        </button>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Income', value: monthSummary.income, color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Expenses', value: monthSummary.expense, color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Bills', value: monthSummary.bills, color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'EMIs', value: monthSummary.emis, color: 'text-indigo-600', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20' },
          { label: 'Events', value: monthSummary.total, color: 'text-slate-600', bgColor: 'bg-slate-50 dark:bg-slate-800' },
        ].map((s, i) => (
          <div key={i} className={`${s.bgColor} rounded-2xl p-4 border border-slate-200 dark:border-slate-700`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>
              {s.label === 'Events' ? s.value : `₹${(s.value || 0).toLocaleString()}`}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" /></button>
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">{MONTHS[month]} {year}</h2>
              <button onClick={goToday} className="text-xs text-blue-600 hover:underline mt-0.5">Today</button>
            </div>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" /></button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 py-2">{d}</div>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cell, i) => {
              const dayEvents = cell.date ? (eventsByDate[cell.date] || []) : [];
              const selected = cell.date === selectedDate;
              const today = cell.date && isToday(cell.date);
              return (
                <div key={i} onClick={() => cell.isCurrentMonth && setSelectedDate(cell.date)}
                  className={`min-h-[80px] p-1.5 rounded-xl border transition-all cursor-pointer ${!cell.isCurrentMonth ? 'opacity-30 cursor-default' : selected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/30'} ${today ? 'ring-2 ring-blue-400' : ''}`}>
                  <div className={`text-xs font-medium mb-1 ${today ? 'text-blue-600 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                    {cell.day}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((evt, j) => (
                      <div key={j} className="text-[10px] px-1 py-0.5 rounded truncate" style={{ backgroundColor: getEventColor(evt.type) + '20', color: getEventColor(evt.type) }}>
                        {evt.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-slate-400 text-center">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Event Type Legend */}
          <div className="flex gap-3 mt-4 flex-wrap">
            {EVENT_TYPES.map(t => (
              <div key={t.id} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                {t.label}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar - Day Detail & Upcoming */}
        <div className="space-y-6">
          {/* Selected Date Events */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-3">
              {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Select a date'}
            </h3>
            {selectedDateEvents.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                {selectedDate ? 'No events on this date.' : 'Click a date to see events.'}
              </p>
            ) : (
              <div className="space-y-2">
                {selectedDateEvents.map(evt => (
                  <div key={evt.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
                    <div className="w-2 h-8 rounded-full" style={{ backgroundColor: getEventColor(evt.type) }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{evt.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {EVENT_TYPES.find(t => t.id === evt.type)?.label} {evt.amount ? `• ₹${evt.amount.toLocaleString()}` : ''}
                      </p>
                    </div>
                    {evt.source === 'custom' && (
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingEvent(evt); setShowAddModal(true); }} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600"><Edit2 className="w-3.5 h-3.5 text-blue-500" /></button>
                        <button onClick={() => handleDeleteEvent(evt.id)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" /> Upcoming
            </h3>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">No upcoming events.</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map(evt => {
                  const d = new Date(evt.date);
                  const daysAway = Math.ceil((d - Date.now()) / 86400000);
                  return (
                    <div key={evt.id} onClick={() => setSelectedDate(evt.date?.split('T')[0] || '')}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors">
                      <div className="w-2 h-6 rounded-full" style={{ backgroundColor: getEventColor(evt.type) }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{evt.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          <span className="ml-1 text-blue-600">({daysAway <= 0 ? 'Today' : `${daysAway}d`})</span>
                        </p>
                      </div>
                      {evt.amount > 0 && <span className="text-xs font-bold text-slate-800 dark:text-white">₹{evt.amount.toLocaleString()}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { setShowAddModal(false); setEditingEvent(null); }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-slate-200 dark:border-slate-700 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{editingEvent ? 'Edit' : 'Add'} Event</h3>
              <button onClick={() => { setShowAddModal(false); setEditingEvent(null); }} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <EventForm
              event={editingEvent || (selectedDate ? { date: selectedDate } : undefined)}
              onSave={handleSaveEvent}
              onCancel={() => { setShowAddModal(false); setEditingEvent(null); }}
            />
          </div>
        </div>
      )}
    </div>
    </MainLayout>
  );
}
