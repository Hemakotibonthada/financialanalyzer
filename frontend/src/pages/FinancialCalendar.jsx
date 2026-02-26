// ============================================================
// Financial Analyzer - Financial Calendar Page
// Feature #84: Interactive Financial Calendar with events
// ============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatedCard, StatCard, Badge, Modal, AnimatedTabs } from '../components/ui/ComponentLibrary';
import { formatCurrency, formatDate } from '../utils/helpers';
import api from '../services/api';
import '../styles/animations.css';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EVENT_TYPES = {
  income: { label: 'Income', color: '#10B981', icon: '💰', bg: 'bg-green-100 dark:bg-green-900/30' },
  expense: { label: 'Expense', color: '#EF4444', icon: '💸', bg: 'bg-red-100 dark:bg-red-900/30' },
  bill: { label: 'Bill Due', color: '#F59E0B', icon: '📋', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  emi: { label: 'EMI', color: '#8B5CF6', icon: '🏦', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  investment: { label: 'Investment', color: '#3B82F6', icon: '📈', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  subscription: { label: 'Subscription', color: '#EC4899', icon: '🔄', bg: 'bg-pink-100 dark:bg-pink-900/30' },
  goal: { label: 'Goal Deadline', color: '#14B8A6', icon: '🎯', bg: 'bg-teal-100 dark:bg-teal-900/30' },
  reminder: { label: 'Reminder', color: '#6366F1', icon: '⏰', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  salary: { label: 'Salary', color: '#059669', icon: '💵', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  tax: { label: 'Tax', color: '#DC2626', icon: '🏛️', bg: 'bg-red-100 dark:bg-red-900/30' },
};

export default function FinancialCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [events, setEvents] = useState([]);
  const [viewMode, setViewMode] = useState('month');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Load events
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const [transRes, billRes, emiRes] = await Promise.allSettled([
          api.get('/api/transactions', { params: { month: month + 1, year } }),
          api.get('/api/bill-reminders'),
          api.get('/api/emi'),
        ]);
        
        const combinedEvents = [];
        
        // Transform transactions to events
        if (transRes.status === 'fulfilled') {
          const transactions = transRes.value.data?.transactions || transRes.value.data || [];
          transactions.forEach(t => {
            combinedEvents.push({
              id: t._id || t.id,
              title: t.description || t.category,
              date: t.date,
              amount: t.amount,
              type: t.type === 'income' ? 'income' : 'expense',
              category: t.category,
            });
          });
        }
        
        // Transform bills to events
        if (billRes.status === 'fulfilled') {
          const bills = billRes.value.data?.bills || billRes.value.data || [];
          bills.forEach(b => {
            combinedEvents.push({
              id: b._id || b.id,
              title: b.name || b.title,
              date: b.dueDate || b.nextDueDate,
              amount: b.amount,
              type: 'bill',
              category: b.category,
            });
          });
        }

        // Transform EMIs to events
        if (emiRes.status === 'fulfilled') {
          const emis = emiRes.value.data?.emis || emiRes.value.data || [];
          emis.forEach(e => {
            combinedEvents.push({
              id: e._id || e.id,
              title: e.name || e.loanName,
              date: e.nextPaymentDate || e.dueDate,
              amount: e.monthlyEMI || e.amount,
              type: 'emi',
              category: 'EMI',
            });
          });
        }

        setEvents(combinedEvents.length > 0 ? combinedEvents : generateMockEvents(year, month));
      } catch {
        setEvents(generateMockEvents(year, month));
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [year, month]);

  // Calendar grid data
  const calendarData = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month days
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        day: prevMonthDays - i,
        isCurrentMonth: false,
        isPast: true,
      });
    }

    // Current month days
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        day: i,
        isCurrentMonth: true,
        isToday: date.toDateString() === today.toDateString(),
        isPast: date < today && date.toDateString() !== today.toDateString(),
        isFuture: date > today,
      });
    }

    // Next month days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        day: i,
        isCurrentMonth: false,
        isFuture: true,
      });
    }

    return days;
  }, [year, month]);

  // Events for each day
  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach(event => {
      if (!event.date) return;
      const dateStr = new Date(event.date).toDateString();
      if (!map[dateStr]) map[dateStr] = [];
      if (filterType === 'all' || event.type === filterType) {
        map[dateStr].push(event);
      }
    });
    return map;
  }, [events, filterType]);

  // Monthly summary
  const monthlySummary = useMemo(() => {
    const monthEvents = events.filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    const income = monthEvents.filter(e => e.type === 'income' || e.type === 'salary').reduce((s, e) => s + (e.amount || 0), 0);
    const expenses = monthEvents.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);
    const bills = monthEvents.filter(e => e.type === 'bill').reduce((s, e) => s + (e.amount || 0), 0);
    const emis = monthEvents.filter(e => e.type === 'emi').reduce((s, e) => s + (e.amount || 0), 0);

    return { income, expenses, bills, emis, total: income - expenses - bills - emis, eventCount: monthEvents.length };
  }, [events, month, year]);

  // Selected day events
  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate[selectedDate.toDateString()] || [];
  }, [selectedDate, eventsByDate]);

  // Navigation
  const navigate = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + direction);
      else if (viewMode === 'week') newDate.setDate(newDate.getDate() + (7 * direction));
      else newDate.setFullYear(newDate.getFullYear() + direction);
      return newDate;
    });
  };

  const goToToday = () => setCurrentDate(new Date());

  const addEvent = (eventData) => {
    setEvents(prev => [...prev, { ...eventData, id: Date.now().toString() }]);
    setShowEventModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Financial Calendar</h1>
            <p className="text-gray-500 mt-1">Track bills, EMIs, income, and financial events</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              {['month', 'week', 'year'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 text-sm font-medium capitalize transition-all ${
                    viewMode === mode
                      ? 'bg-blue-600 text-white rounded-xl'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowEventModal(true)}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              ➕ Add Event
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Income" value={monthlySummary.income} format="currency" color="#10B981" icon="💰" delay={0} />
          <StatCard title="Expenses" value={monthlySummary.expenses} format="currency" color="#EF4444" icon="💸" delay={50} />
          <StatCard title="Bills Due" value={monthlySummary.bills} format="currency" color="#F59E0B" icon="📋" delay={100} />
          <StatCard title="EMIs" value={monthlySummary.emis} format="currency" color="#8B5CF6" icon="🏦" delay={150} />
          <StatCard title="Net Flow" value={monthlySummary.total} format="currency" color={monthlySummary.total >= 0 ? '#10B981' : '#EF4444'} icon={monthlySummary.total >= 0 ? '📈' : '📉'} delay={200} />
        </div>

        {/* Main Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <AnimatedCard>
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">◀</button>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {MONTHS[month]} {year}
                  </h2>
                  <button onClick={() => navigate(1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">▶</button>
                  <button onClick={goToToday} className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
                    Today
                  </button>
                </div>

                {/* Type Filter */}
                <div className="flex gap-1 overflow-x-auto">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      filterType === 'all' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-600'
                    }`}
                  >
                    All
                  </button>
                  {Object.entries(EVENT_TYPES).slice(0, 6).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => setFilterType(key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        filterType === key ? 'text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600'
                      }`}
                      style={filterType === key ? { backgroundColor: val.color } : {}}
                    >
                      {val.icon} {val.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 mb-2">
                {WEEKDAYS.map(day => (
                  <div key={day} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                {calendarData.map((dayItem, index) => {
                  const dayEvents = eventsByDate[dayItem.date.toDateString()] || [];
                  const isSelected = selectedDate?.toDateString() === dayItem.date.toDateString();
                  const totalIncome = dayEvents.filter(e => e.type === 'income' || e.type === 'salary').reduce((s, e) => s + (e.amount || 0), 0);
                  const totalExpense = dayEvents.filter(e => e.type !== 'income' && e.type !== 'salary').reduce((s, e) => s + (e.amount || 0), 0);

                  return (
                    <div
                      key={index}
                      onClick={() => setSelectedDate(dayItem.date)}
                      className={`min-h-[100px] p-1.5 cursor-pointer transition-all ${
                        dayItem.isCurrentMonth
                          ? 'bg-white dark:bg-gray-800'
                          : 'bg-gray-50 dark:bg-gray-900/50'
                      } ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''} hover:bg-blue-50 dark:hover:bg-gray-700/50`}
                    >
                      {/* Day Number */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                            dayItem.isToday
                              ? 'bg-blue-600 text-white'
                              : dayItem.isCurrentMonth
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-400 dark:text-gray-600'
                          }`}
                        >
                          {dayItem.day}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      {/* Event Indicators */}
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map((event, i) => {
                          const typeInfo = EVENT_TYPES[event.type] || EVENT_TYPES.reminder;
                          return (
                            <div
                              key={i}
                              className="text-[10px] leading-tight px-1 py-0.5 rounded truncate"
                              style={{ backgroundColor: typeInfo.color + '20', color: typeInfo.color }}
                              title={`${event.title}: ${formatCurrency(event.amount)}`}
                            >
                              {typeInfo.icon} {event.title}
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-gray-400 pl-1">+{dayEvents.length - 3} more</div>
                        )}
                      </div>

                      {/* Day Totals */}
                      {dayEvents.length > 0 && dayItem.isCurrentMonth && (
                        <div className="mt-auto pt-1 space-y-0 border-t border-gray-100 dark:border-gray-700 mt-1">
                          {totalIncome > 0 && (
                            <div className="text-[10px] text-green-600 font-medium">+{formatCurrency(totalIncome, 'INR', { compact: true })}</div>
                          )}
                          {totalExpense > 0 && (
                            <div className="text-[10px] text-red-500 font-medium">-{formatCurrency(totalExpense, 'INR', { compact: true })}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </AnimatedCard>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Selected Day Details */}
            <AnimatedCard>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {selectedDate ? formatDate(selectedDate, 'longDate') : 'Select a day'}
              </h3>
              {selectedDate ? (
                <div className="space-y-2">
                  {selectedDayEvents.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 text-center">No events on this day</p>
                  ) : (
                    selectedDayEvents.map((event, i) => {
                      const typeInfo = EVENT_TYPES[event.type] || EVENT_TYPES.reminder;
                      return (
                        <div
                          key={i}
                          className={`p-3 rounded-lg ${typeInfo.bg} transition-all hover:scale-[1.02]`}
                          style={{ animationDelay: `${i * 50}ms` }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <span>{typeInfo.icon}</span>
                              <div>
                                <span className="text-sm font-medium text-gray-900 dark:text-white block">{event.title}</span>
                                <span className="text-xs text-gray-500">{typeInfo.label}</span>
                                {event.category && <span className="text-xs text-gray-400 ml-1">• {event.category}</span>}
                              </div>
                            </div>
                            <span
                              className={`text-sm font-bold ${
                                event.type === 'income' || event.type === 'salary' ? 'text-green-600' : 'text-red-500'
                              }`}
                            >
                              {event.type === 'income' || event.type === 'salary' ? '+' : '-'}{formatCurrency(event.amount)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  {selectedDayEvents.length > 0 && (
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Day Total</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {formatCurrency(
                            selectedDayEvents.reduce((s, e) => {
                              const isIncome = e.type === 'income' || e.type === 'salary';
                              return s + (isIncome ? e.amount : -e.amount);
                            }, 0)
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-8 text-center">Click on a date to see events</p>
              )}
            </AnimatedCard>

            {/* Upcoming Events */}
            <AnimatedCard>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Upcoming Events</h3>
              <div className="space-y-2">
                {events
                  .filter(e => e.date && new Date(e.date) >= new Date())
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .slice(0, 8)
                  .map((event, i) => {
                    const typeInfo = EVENT_TYPES[event.type] || EVENT_TYPES.reminder;
                    const daysUntil = Math.ceil((new Date(event.date) - new Date()) / 86400000);
                    return (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <span className="text-sm">{typeInfo.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{event.title}</div>
                          <div className="text-[10px] text-gray-400">
                            {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
                          </div>
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(event.amount)}</span>
                      </div>
                    );
                  })
                }
              </div>
            </AnimatedCard>

            {/* Legend */}
            <AnimatedCard>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Event Types</h3>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(EVENT_TYPES).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: val.color }} />
                    {val.label}
                  </div>
                ))}
              </div>
            </AnimatedCard>
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      <Modal isOpen={showEventModal} onClose={() => setShowEventModal(false)} title="Add Financial Event" size="sm">
        <EventForm onSubmit={addEvent} onCancel={() => setShowEventModal(false)} />
      </Modal>
    </div>
  );
}

// ======================== EVENT FORM ========================
function EventForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    category: '',
    recurring: false,
    notes: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, amount: Number(formData.amount) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
          placeholder="e.g., Electricity Bill"
          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
          <input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))}
            placeholder="0"
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
        <div className="grid grid-cols-5 gap-1.5">
          {Object.entries(EVENT_TYPES).slice(0, 5).map(([key, val]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFormData(p => ({ ...p, type: key }))}
              className={`p-2 rounded-lg text-center text-xs transition-all ${
                formData.type === key ? 'ring-2 ring-offset-1' : 'bg-gray-50 dark:bg-gray-700'
              }`}
              style={formData.type === key ? { backgroundColor: val.color + '20', color: val.color, '--tw-ring-color': val.color } : {}}
            >
              <div className="text-base mb-0.5">{val.icon}</div>
              {val.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">
          Cancel
        </button>
        <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
          Add Event
        </button>
      </div>
    </form>
  );
}

// ======================== MOCK DATA ========================
function generateMockEvents(year, month) {
  const events = [];
  const types = ['income', 'expense', 'bill', 'emi', 'subscription', 'salary'];

  // Monthly salary
  events.push({
    id: 'sal1',
    title: 'Monthly Salary',
    date: new Date(year, month, 1),
    amount: 85000,
    type: 'salary',
    category: 'Salary',
  });

  // EMIs
  events.push({
    id: 'emi1',
    title: 'Home Loan EMI',
    date: new Date(year, month, 5),
    amount: 32000,
    type: 'emi',
    category: 'Home Loan',
  });

  events.push({
    id: 'emi2',
    title: 'Car Loan EMI',
    date: new Date(year, month, 10),
    amount: 15000,
    type: 'emi',
    category: 'Car Loan',
  });

  // Bills
  events.push({
    id: 'bill1',
    title: 'Electricity Bill',
    date: new Date(year, month, 7),
    amount: 2500,
    type: 'bill',
    category: 'Utilities',
  });

  events.push({
    id: 'bill2',
    title: 'Internet Bill',
    date: new Date(year, month, 15),
    amount: 999,
    type: 'bill',
    category: 'Utilities',
  });

  events.push({
    id: 'bill3',
    title: 'Mobile Recharge',
    date: new Date(year, month, 20),
    amount: 599,
    type: 'bill',
    category: 'Phone',
  });

  // Subscriptions
  events.push({
    id: 'sub1',
    title: 'Netflix',
    date: new Date(year, month, 12),
    amount: 649,
    type: 'subscription',
    category: 'Entertainment',
  });

  events.push({
    id: 'sub2',
    title: 'Spotify',
    date: new Date(year, month, 18),
    amount: 119,
    type: 'subscription',
    category: 'Music',
  });

  // Random expenses
  const expenseNames = ['Grocery Shopping', 'Restaurant Dinner', 'Fuel', 'Medical Checkup', 'Shopping', 'Electronics', 'Gym Membership', 'Book Purchase'];
  const expenseAmounts = [3500, 2200, 4000, 1500, 5500, 8000, 2000, 800];

  for (let i = 0; i < 8; i++) {
    events.push({
      id: `exp${i}`,
      title: expenseNames[i],
      date: new Date(year, month, 3 + i * 3),
      amount: expenseAmounts[i],
      type: 'expense',
      category: ['Groceries', 'Food', 'Transport', 'Health', 'Shopping', 'Electronics', 'Fitness', 'Education'][i],
    });
  }

  // Investment
  events.push({
    id: 'inv1',
    title: 'SIP - Mutual Fund',
    date: new Date(year, month, 5),
    amount: 10000,
    type: 'investment',
    category: 'Mutual Fund',
  });

  events.push({
    id: 'inv2',
    title: 'PPF Contribution',
    date: new Date(year, month, 15),
    amount: 5000,
    type: 'investment',
    category: 'PPF',
  });

  return events;
}
