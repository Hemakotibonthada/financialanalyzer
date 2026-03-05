import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import MainLayout from '../components/MainLayout';
import {
  Users, UserPlus, DollarSign, CreditCard, Calendar, Clock, CheckCircle,
  AlertTriangle, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Plus, Minus, Edit3, Trash2, X, Check, Search, Filter, RefreshCw,
  Download, ChevronRight, ChevronDown, ChevronUp, Eye, EyeOff, Phone,
  Mail, Star, Shield, Target, Wallet, BarChart3, PieChart, Activity,
  MoreVertical, Hash, Percent, ArrowRight, Info, Zap, Award,
  CircleDollarSign, Banknote, UserCheck, AlertCircle, History
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
//  PERSONAL BORROWINGS TRACKER - Loans Taken From People
// ═══════════════════════════════════════════════════════════════════════════════

const RELATIONSHIPS = ['Friend', 'Family', 'Colleague', 'Relative', 'Other'];
const PRIORITIES = [
  { value: 'low', label: 'Low', color: '#3B82F6', bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'medium', label: 'Medium', color: '#F59E0B', bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'high', label: 'High', color: '#EF4444', bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  { value: 'urgent', label: 'Urgent', color: '#DC2626', bg: 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-200' }
];
const INTEREST_TYPES = [
  { value: 'none', label: 'No Interest' },
  { value: 'simple', label: 'Simple Interest (% p.a.)' },
  { value: 'flat', label: 'Flat Amount (₹)' },
  { value: 'rupee_per_100', label: '₹ per ₹100 per month' }
];

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  const abs = Math.abs(amount);
  if (abs >= 10000000) return `${amount < 0 ? '-' : ''}₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `${amount < 0 ? '-' : ''}₹${(abs / 100000).toFixed(2)}L`;
  return `${amount < 0 ? '-' : ''}₹${abs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const daysBetween = (d1, d2) => {
  if (!d1) return 0;
  const date1 = new Date(d1);
  const date2 = d2 ? new Date(d2) : new Date();
  return Math.floor((date2 - date1) / (1000 * 60 * 60 * 24));
};

const getRelationshipIcon = (rel) => {
  const map = { Friend: '👫', Family: '👨‍👩‍👧‍👦', Colleague: '💼', Relative: '🏠', Other: '👤' };
  return map[rel] || '👤';
};

const getPriorityInfo = (priority) => PRIORITIES.find(p => p.value === priority) || PRIORITIES[1];

// ─── Summary Cards ───────────────────────────────────────────────────────────

const SummaryCards = ({ summary, lendersCount, palette }) => {
  const cards = [
    { label: 'Total Borrowed', value: formatCurrency(summary.totalBorrowed), icon: Banknote, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Outstanding', value: formatCurrency(summary.totalOutstanding), icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: 'Total Repaid', value: formatCurrency(summary.totalRepaid), icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Interest Accrued', value: formatCurrency(summary.totalInterest), icon: Percent, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Active Loans', value: String(summary.activeLoansCount || 0), icon: Activity, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { label: 'People / Lenders', value: String(lendersCount || 0), icon: Users, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20' }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, i) => {
        const CardIcon = card.icon;
        return (
          <div key={i} className={`${palette.card} rounded-xl border p-4`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                <CardIcon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-[11px] ${palette.textMuted} whitespace-nowrap`}>{card.label}</p>
                <p className={`text-lg font-bold ${card.color} truncate`}>{card.value}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Lender Card (Person you borrow from) ────────────────────────────────────

const LenderCard = ({ lender, palette, onExpand, isExpanded, onNewLoan, onViewHistory }) => {
  const prioInfo = getPriorityInfo(lender.priority);
  const hasActive = lender.activeLoansCount > 0;

  return (
    <div className={`${palette.card} rounded-2xl border overflow-hidden transition-all duration-300 ${hasActive ? 'ring-1 ring-blue-500/20' : ''}`}>
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${hasActive ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg' : 'bg-gray-100 dark:bg-slate-700'}`}>
              {hasActive ? <span className="text-white text-lg">
                {lender.lenderName.charAt(0).toUpperCase()}
              </span> : getRelationshipIcon(lender.relationship)}
            </div>
            <div>
              <h3 className={`font-bold text-lg ${palette.text}`}>{lender.lenderName}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs ${palette.textMuted}`}>{lender.relationship}</span>
                <span className="text-xs">•</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${prioInfo.bg}`}>{prioInfo.label}</span>
                {hasActive && <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{lender.activeLoansCount} active</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onNewLoan(lender)} className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors" title="New loan from this person">
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={() => onExpand(lender.lenderName)} className={`p-2 rounded-lg ${palette.btnBg} border ${palette.btnBorder} transition-colors`}>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div>
            <p className={`text-[11px] ${palette.textMuted}`}>Total Borrowed</p>
            <p className={`text-base font-bold ${palette.text}`}>{formatCurrency(lender.totalBorrowed)}</p>
          </div>
          <div>
            <p className={`text-[11px] ${palette.textMuted}`}>Outstanding</p>
            <p className={`text-base font-bold ${lender.totalOutstanding > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{formatCurrency(lender.totalOutstanding)}</p>
          </div>
          <div>
            <p className={`text-[11px] ${palette.textMuted}`}>Repaid</p>
            <p className={`text-base font-bold text-emerald-500`}>{formatCurrency(lender.totalRepaid)}</p>
          </div>
          <div>
            <p className={`text-[11px] ${palette.textMuted}`}>Interest</p>
            <p className={`text-base font-bold text-amber-500`}>{formatCurrency(lender.totalInterestAccrued)}</p>
          </div>
        </div>

        {/* Timeline & Trust */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs">
            <span className={palette.textMuted}>
              <Calendar className="w-3 h-3 inline mr-1" />
              First: {formatDate(lender.firstLoanDate)}
            </span>
            {lender.lastRepaymentDate && (
              <span className={palette.textMuted}>
                <CheckCircle className="w-3 h-3 inline mr-1" />
                Last repaid: {formatDate(lender.lastRepaymentDate)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-xs ${palette.textMuted}`}>Trust:</span>
            <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${lender.trustScore >= 70 ? 'bg-emerald-500' : lender.trustScore >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${lender.trustScore}%` }} />
            </div>
            <span className={`text-xs font-medium ${lender.trustScore >= 70 ? 'text-emerald-500' : lender.trustScore >= 40 ? 'text-amber-500' : 'text-red-500'}`}>{lender.trustScore}%</span>
          </div>
        </div>

        {/* Contact info */}
        {(lender.contactDetails?.phone || lender.contactDetails?.email) && (
          <div className="flex items-center gap-3 mt-2 pt-2 border-t" style={{ borderColor: palette.text === 'text-white' ? 'rgba(71,85,105,0.2)' : 'rgba(226,232,240,0.6)' }}>
            {lender.contactDetails.phone && (
              <a href={`tel:${lender.contactDetails.phone}`} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600">
                <Phone className="w-3 h-3" />{lender.contactDetails.phone}
              </a>
            )}
            {lender.contactDetails.email && (
              <a href={`mailto:${lender.contactDetails.email}`} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600">
                <Mail className="w-3 h-3" />{lender.contactDetails.email}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Expanded: Loan History */}
      {isExpanded && (
        <div className="border-t px-5 py-4" style={{ borderColor: palette.text === 'text-white' ? 'rgba(71,85,105,0.3)' : 'rgba(226,232,240,0.8)' }}>
          <div className="flex items-center justify-between mb-3">
            <h4 className={`text-sm font-semibold ${palette.text}`}>Loan History ({lender.totalTransactions} transactions)</h4>
            <button onClick={() => onViewHistory(lender.lenderName)} className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1">
              View Full History <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {lender.loans.map((loan, i) => (
              <LoanHistoryRow key={loan._id || i} loan={loan} palette={palette} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── LoanHistoryRow ──────────────────────────────────────────────────────────

const LoanHistoryRow = ({ loan, palette }) => {
  const isActive = loan.status === 'active';
  const days = daysBetween(loan.loanTakenDate, loan.repaymentDate);
  const prioInfo = getPriorityInfo(loan.priority);

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${isActive ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10' : ''}`} style={{ borderColor: !isActive ? (palette.text === 'text-white' ? 'rgba(71,85,105,0.2)' : 'rgba(226,232,240,0.6)') : undefined }}>
      {/* Status indicator */}
      <div className={`w-2 h-10 rounded-full flex-shrink-0 ${isActive ? 'bg-blue-500' : 'bg-emerald-500'}`} />

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${palette.text}`}>{formatCurrency(loan.principalAmount)}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${isActive ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
            {isActive ? 'Active' : 'Repaid'}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${prioInfo.bg}`}>{prioInfo.label}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs">
          <span className={palette.textMuted}>
            <Calendar className="w-3 h-3 inline mr-0.5" />
            {formatDate(loan.loanTakenDate)}
          </span>
          {loan.repaymentDate && (
            <span className="text-emerald-500">
              <CheckCircle className="w-3 h-3 inline mr-0.5" />
              Repaid {formatDate(loan.repaymentDate)}
            </span>
          )}
          {loan.purpose && <span className={palette.textMuted}>• {loan.purpose}</span>}
          <span className={palette.textMuted}>• {days} days</span>
        </div>
      </div>

      {/* Amounts */}
      <div className="text-right flex-shrink-0">
        {isActive && (
          <>
            <p className="text-sm font-bold text-red-500">{formatCurrency(loan.outstandingAmount)}</p>
            <p className={`text-[11px] ${palette.textMuted}`}>outstanding</p>
          </>
        )}
        {!isActive && (
          <>
            <p className="text-sm font-bold text-emerald-500">{formatCurrency(loan.totalRepaid)}</p>
            <p className={`text-[11px] ${palette.textMuted}`}>total repaid</p>
          </>
        )}
        {loan.interestRate > 0 && (
          <p className={`text-[10px] ${palette.textMuted}`}>
            {loan.interestType === 'rupee_per_100' ? `₹${loan.interestRate}/₹100/mo` :
             loan.interestType === 'flat' ? `Flat ₹${loan.interestRate}` :
             loan.interestType === 'simple' ? `${loan.interestRate}% p.a.` : ''}
          </p>
        )}
      </div>
    </div>
  );
};

// ─── All Loans Table View ────────────────────────────────────────────────────

const AllLoansTable = ({ loans, palette, onRepay, onMarkRepaid, onEdit, onDelete }) => {
  const [sortField, setSortField] = useState('loanTakenDate');
  const [sortDir, setSortDir] = useState('desc');

  const sortedLoans = useMemo(() => {
    return [...loans].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === 'loanTakenDate' || sortField === 'repaymentDate') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = (bVal || '').toLowerCase(); }
      if (sortDir === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
  }, [loans, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortHeader = ({ field, children }) => (
    <th onClick={() => handleSort(field)} className={`px-3 py-3 text-left text-xs font-semibold ${palette.textMuted} cursor-pointer hover:text-blue-500 transition-colors select-none whitespace-nowrap`}>
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
      </div>
    </th>
  );

  return (
    <div className={`${palette.card} rounded-2xl border overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ borderColor: palette.text === 'text-white' ? 'rgba(71,85,105,0.3)' : 'rgba(226,232,240,0.8)' }}>
              <SortHeader field="lenderName">Lender</SortHeader>
              <SortHeader field="principalAmount">Amount</SortHeader>
              <SortHeader field="loanTakenDate">Taken Date</SortHeader>
              <SortHeader field="repaymentDate">Returned Date</SortHeader>
              <th className={`px-3 py-3 text-left text-xs font-semibold ${palette.textMuted} whitespace-nowrap`}>Duration</th>
              <SortHeader field="interestRate">Interest</SortHeader>
              <th className={`px-3 py-3 text-left text-xs font-semibold ${palette.textMuted} whitespace-nowrap`}>Outstanding</th>
              <SortHeader field="totalRepaid">Repaid</SortHeader>
              <SortHeader field="status">Status</SortHeader>
              <SortHeader field="priority">Priority</SortHeader>
              <th className={`px-3 py-3 text-left text-xs font-semibold ${palette.textMuted}`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedLoans.map((loan, i) => {
              const isActive = loan.status === 'active';
              const days = daysBetween(loan.loanTakenDate, isActive ? null : loan.repaymentDate);
              const prioInfo = getPriorityInfo(loan.priority);
              return (
                <tr key={loan._id || i} className={`border-b transition-colors hover:bg-blue-50/30 dark:hover:bg-slate-700/30 ${isActive ? '' : 'opacity-70'}`} style={{ borderColor: palette.text === 'text-white' ? 'rgba(71,85,105,0.15)' : 'rgba(226,232,240,0.5)' }}>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getRelationshipIcon(loan.relationship)}</span>
                      <div>
                        <p className={`text-sm font-medium ${palette.text}`}>{loan.lenderName}</p>
                        <p className={`text-[11px] ${palette.textMuted}`}>{loan.relationship}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`px-3 py-3 text-sm font-semibold ${palette.text}`}>{formatCurrency(loan.principalAmount)}</td>
                  <td className={`px-3 py-3 text-sm ${palette.textSub}`}>{formatDate(loan.loanTakenDate)}</td>
                  <td className={`px-3 py-3 text-sm ${loan.repaymentDate ? 'text-emerald-500' : palette.textMuted}`}>{loan.repaymentDate ? formatDate(loan.repaymentDate) : '—'}</td>
                  <td className={`px-3 py-3 text-sm ${days > 365 ? 'text-red-500' : days > 180 ? 'text-amber-500' : palette.textSub}`}>{days} days</td>
                  <td className={`px-3 py-3 text-sm ${palette.textSub}`}>
                    {loan.interestRate > 0 ? (
                      loan.interestType === 'rupee_per_100' ? `₹${loan.interestRate}/₹100/mo` :
                      loan.interestType === 'flat' ? `Flat ₹${loan.interestRate}` :
                      loan.interestType === 'simple' ? `${loan.interestRate}% p.a.` : '—'
                    ) : 'None'}
                  </td>
                  <td className="px-3 py-3 text-sm font-semibold text-red-500">{isActive ? formatCurrency(loan.outstandingAmount) : '₹0'}</td>
                  <td className="px-3 py-3 text-sm font-medium text-emerald-500">{formatCurrency(loan.totalRepaid)}</td>
                  <td className="px-3 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isActive ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                      {isActive ? 'Active' : 'Repaid'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${prioInfo.bg}`}>{prioInfo.label}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      {isActive && (
                        <>
                          <button onClick={() => onRepay(loan)} className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 hover:bg-emerald-100 transition-colors" title="Add repayment">
                            <Banknote className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => onMarkRepaid(loan)} className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-500 hover:bg-blue-100 transition-colors" title="Mark fully repaid">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button onClick={() => onEdit(loan)} className={`p-1.5 rounded-lg ${palette.btnBg} border ${palette.btnBorder} transition-colors`} title="Edit">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDelete(loan)} className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sortedLoans.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-12 text-center">
                  <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className={`font-medium ${palette.text}`}>No loans found</p>
                  <p className={`text-sm ${palette.textMuted}`}>Click "New Loan" to record a borrowing</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Add/Edit Loan Modal ─────────────────────────────────────────────────────

const LoanModal = ({ isOpen, onClose, onSubmit, editLoan, prefillLender, palette }) => {
  const [form, setForm] = useState({
    lenderName: '', relationship: 'Friend', principalAmount: '', loanTakenDate: new Date().toISOString().split('T')[0],
    interestRate: '', interestType: 'none', purpose: '', priority: 'medium',
    contactPhone: '', contactEmail: '', notes: '', tags: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editLoan) {
      setForm({
        lenderName: editLoan.lenderName || '',
        relationship: editLoan.relationship || 'Friend',
        principalAmount: editLoan.principalAmount || '',
        loanTakenDate: editLoan.loanTakenDate ? new Date(editLoan.loanTakenDate).toISOString().split('T')[0] : '',
        interestRate: editLoan.interestRate || '',
        interestType: editLoan.interestType || 'none',
        purpose: editLoan.purpose || '',
        priority: editLoan.priority || 'medium',
        contactPhone: editLoan.contactDetails?.phone || '',
        contactEmail: editLoan.contactDetails?.email || '',
        notes: editLoan.notes || '',
        tags: (editLoan.tags || []).join(', ')
      });
    } else if (prefillLender) {
      setForm(prev => ({
        ...prev,
        lenderName: prefillLender.lenderName || '',
        relationship: prefillLender.relationship || 'Friend',
        contactPhone: prefillLender.contactDetails?.phone || '',
        contactEmail: prefillLender.contactDetails?.email || ''
      }));
    } else {
      setForm({
        lenderName: '', relationship: 'Friend', principalAmount: '', loanTakenDate: new Date().toISOString().split('T')[0],
        interestRate: '', interestType: 'none', purpose: '', priority: 'medium',
        contactPhone: '', contactEmail: '', notes: '', tags: ''
      });
    }
  }, [editLoan, prefillLender, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        lenderName: form.lenderName.trim(),
        relationship: form.relationship,
        principalAmount: parseFloat(form.principalAmount),
        loanTakenDate: form.loanTakenDate,
        interestRate: parseFloat(form.interestRate) || 0,
        interestType: form.interestType,
        purpose: form.purpose.trim(),
        priority: form.priority,
        contactDetails: {
          phone: form.contactPhone.trim(),
          email: form.contactEmail.trim()
        },
        notes: form.notes.trim(),
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean)
      };
      await onSubmit(payload, editLoan?._id);
      onClose();
    } catch (err) {
      console.error('Failed to save loan:', err);
    } finally {
      setSaving(false);
    }
  };

  const update = (key, val) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className={`${palette.card} border rounded-2xl p-6 max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-xl font-bold ${palette.text}`}>{editLoan ? 'Edit Loan' : 'Record New Loan'}</h3>
          <button onClick={onClose} className={`p-2 rounded-lg ${palette.btnBg} border ${palette.btnBorder}`}><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Lender Name + Relationship */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className={`block text-sm font-medium ${palette.textSub} mb-1`}>Lender Name *</label>
              <input type="text" required value={form.lenderName} onChange={e => update('lenderName', e.target.value)} className={`w-full px-4 py-2.5 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text} focus:ring-2 focus:ring-blue-500`} placeholder="e.g., Ravi Kumar" disabled={!!editLoan} />
            </div>
            <div>
              <label className={`block text-sm font-medium ${palette.textSub} mb-1`}>Relationship</label>
              <select value={form.relationship} onChange={e => update('relationship', e.target.value)} className={`w-full px-3 py-2.5 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text}`}>
                {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium ${palette.textSub} mb-1`}>Amount (₹) *</label>
              <input type="number" required min="1" value={form.principalAmount} onChange={e => update('principalAmount', e.target.value)} className={`w-full px-4 py-2.5 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text} focus:ring-2 focus:ring-blue-500`} placeholder="50000" disabled={!!editLoan} />
            </div>
            <div>
              <label className={`block text-sm font-medium ${palette.textSub} mb-1`}>Loan Date *</label>
              <input type="date" required value={form.loanTakenDate} onChange={e => update('loanTakenDate', e.target.value)} className={`w-full px-4 py-2.5 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text}`} disabled={!!editLoan} />
            </div>
          </div>

          {/* Interest */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium ${palette.textSub} mb-1`}>Interest Type</label>
              <select value={form.interestType} onChange={e => update('interestType', e.target.value)} className={`w-full px-3 py-2.5 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text}`}>
                {INTEREST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            {form.interestType !== 'none' && (
              <div>
                <label className={`block text-sm font-medium ${palette.textSub} mb-1`}>
                  {form.interestType === 'simple' ? 'Rate (% per annum)' : form.interestType === 'flat' ? 'Flat Amount (₹)' : form.interestType === 'rupee_per_100' ? '₹ per ₹100/month' : 'Rate'}
                </label>
                <input type="number" step="0.01" min="0" value={form.interestRate} onChange={e => update('interestRate', e.target.value)} className={`w-full px-4 py-2.5 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text}`} placeholder="0" />
              </div>
            )}
          </div>

          {/* Purpose + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium ${palette.textSub} mb-1`}>Purpose</label>
              <input type="text" value={form.purpose} onChange={e => update('purpose', e.target.value)} className={`w-full px-4 py-2.5 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text}`} placeholder="e.g., Medical, Emergency" />
            </div>
            <div>
              <label className={`block text-sm font-medium ${palette.textSub} mb-1`}>Priority</label>
              <div className="flex gap-1 mt-1">
                {PRIORITIES.map(p => (
                  <button key={p.value} type="button" onClick={() => update('priority', p.value)} className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-all ${form.priority === p.value ? `text-white` : `${palette.textSub} border ${palette.btnBorder}`}`} style={form.priority === p.value ? { backgroundColor: p.color } : {}}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium ${palette.textSub} mb-1`}>Phone</label>
              <input type="tel" value={form.contactPhone} onChange={e => update('contactPhone', e.target.value)} className={`w-full px-4 py-2.5 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text}`} placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className={`block text-sm font-medium ${palette.textSub} mb-1`}>Email</label>
              <input type="email" value={form.contactEmail} onChange={e => update('contactEmail', e.target.value)} className={`w-full px-4 py-2.5 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text}`} placeholder="name@example.com" />
            </div>
          </div>

          {/* Notes + Tags */}
          <div>
            <label className={`block text-sm font-medium ${palette.textSub} mb-1`}>Notes</label>
            <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2} className={`w-full px-4 py-2.5 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text} resize-none`} placeholder="Any additional details..." />
          </div>
          <div>
            <label className={`block text-sm font-medium ${palette.textSub} mb-1`}>Tags (comma-separated)</label>
            <input type="text" value={form.tags} onChange={e => update('tags', e.target.value)} className={`w-full px-4 py-2.5 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text}`} placeholder="emergency, medical" />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className={`flex-1 px-4 py-2.5 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text} font-medium`}>Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:from-blue-600 hover:to-indigo-700 shadow-lg transition-all disabled:opacity-50">
              {saving ? 'Saving...' : editLoan ? 'Update Loan' : 'Record Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Repayment Modal ─────────────────────────────────────────────────────────

const RepaymentModal = ({ isOpen, onClose, loan, onSubmit, palette }) => {
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (isOpen) setAmount(''); }, [isOpen]);

  if (!isOpen || !loan) return null;

  const outstanding = loan.outstandingAmount || (loan.principalAmount + (loan.currentInterest || 0) - (loan.totalRepaid || 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(loan._id, parseFloat(amount));
      onClose();
    } catch (err) { console.error('Repayment failed:', err); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className={`${palette.card} border rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-xl font-bold ${palette.text}`}>Add Repayment</h3>
          <button onClick={onClose} className={`p-2 rounded-lg ${palette.btnBg} border ${palette.btnBorder}`}><X className="w-4 h-4" /></button>
        </div>

        <div className={`p-4 rounded-xl mb-4 border`} style={{ borderColor: palette.text === 'text-white' ? 'rgba(71,85,105,0.3)' : 'rgba(226,232,240,0.8)' }}>
          <div className="flex justify-between mb-2">
            <span className={`text-sm ${palette.textSub}`}>Loan from</span>
            <span className={`text-sm font-semibold ${palette.text}`}>{loan.lenderName}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className={`text-sm ${palette.textSub}`}>Principal</span>
            <span className={`text-sm ${palette.text}`}>{formatCurrency(loan.principalAmount)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className={`text-sm ${palette.textSub}`}>Interest Accrued</span>
            <span className="text-sm text-amber-500">{formatCurrency(loan.currentInterest || 0)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className={`text-sm ${palette.textSub}`}>Already Repaid</span>
            <span className="text-sm text-emerald-500">{formatCurrency(loan.totalRepaid || 0)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t" style={{ borderColor: palette.text === 'text-white' ? 'rgba(71,85,105,0.3)' : 'rgba(226,232,240,0.8)' }}>
            <span className={`text-sm font-semibold ${palette.text}`}>Outstanding</span>
            <span className="text-sm font-bold text-red-500">{formatCurrency(outstanding)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${palette.textSub} mb-1`}>Repayment Amount (₹) *</label>
            <input type="number" required min="1" max={outstanding} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={`w-full px-4 py-3 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text} text-lg font-semibold focus:ring-2 focus:ring-emerald-500`} placeholder="0" autoFocus />
            <div className="flex gap-2 mt-2">
              {[0.25, 0.5, 0.75, 1].map(pct => (
                <button key={pct} type="button" onClick={() => setAmount(String(Math.round(outstanding * pct)))} className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium ${palette.btnBg} border ${palette.btnBorder} ${palette.textSub} hover:border-emerald-500 transition-colors`}>
                  {pct === 1 ? 'Full' : `${pct * 100}%`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className={`flex-1 px-4 py-2.5 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text} font-medium`}>Cancel</button>
            <button type="submit" disabled={saving || !amount || parseFloat(amount) <= 0} className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium hover:from-emerald-600 hover:to-teal-700 shadow-lg transition-all disabled:opacity-50">
              {saving ? 'Processing...' : `Pay ${amount ? formatCurrency(parseFloat(amount)) : '₹0'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Page Component ─────────────────────────────────────────────────────

const PersonalBorrowings = () => {
  const { user } = useAuth();
  const { mode } = useTheme();
  const isDark = mode === 'dark' || mode === 'black';
  const isBlack = mode === 'black';
  const palette = useMemo(() => ({
    bg: isBlack ? 'bg-black' : isDark ? 'bg-slate-950' : 'bg-gray-50',
    card: isBlack ? 'bg-zinc-900 border-zinc-800' : isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200',
    text: isBlack ? 'text-zinc-100' : isDark ? 'text-slate-100' : 'text-gray-900',
    textSub: isBlack ? 'text-zinc-400' : isDark ? 'text-slate-400' : 'text-gray-600',
    textMuted: isBlack ? 'text-zinc-500' : isDark ? 'text-slate-500' : 'text-gray-500',
    border: isBlack ? 'border-zinc-800' : isDark ? 'border-slate-700' : 'border-gray-200',
    btnBg: isBlack ? 'bg-zinc-800 hover:bg-zinc-700' : isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-gray-50',
    btnBorder: isBlack ? 'border-zinc-700' : isDark ? 'border-slate-600' : 'border-gray-300',
  }), [isDark, isBlack]);

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeView, setActiveView] = useState('people'); // 'people' | 'all' | 'active' | 'repaid'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'repaid'
  const [expandedLender, setExpandedLender] = useState(null);

  // Data
  const [summary, setSummary] = useState({ totalBorrowed: 0, totalOutstanding: 0, totalRepaid: 0, totalInterest: 0, activeLoansCount: 0 });
  const [lenders, setLenders] = useState([]);
  const [allLoans, setAllLoans] = useState([]);

  // Modals
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [prefillLender, setPrefillLender] = useState(null);
  const [repaymentModalOpen, setRepaymentModalOpen] = useState(false);
  const [repayingLoan, setRepayingLoan] = useState(null);

  // ─── Data fetching ─────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryRes, lendersRes, loansRes] = await Promise.allSettled([
        api.get('/personal-loans/summary'),
        api.get('/personal-loans/lenders'),
        api.get('/personal-loans')
      ]);

      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value?.data?.summary || {});
      if (lendersRes.status === 'fulfilled') setLenders(lendersRes.value?.data?.lenders || []);
      if (loansRes.status === 'fulfilled') setAllLoans(loansRes.value?.data?.loans || []);
    } catch (err) {
      console.error('Failed to fetch borrowings data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  // ─── CRUD operations ──────────────────────────────────────────────────────

  const handleSaveLoan = async (payload, editId) => {
    if (editId) {
      await api.put(`/personal-loans/${editId}`, payload);
    } else {
      await api.post('/personal-loans', payload);
    }
    setEditingLoan(null);
    setPrefillLender(null);
    await fetchData();
  };

  const handleRepayment = async (loanId, amount) => {
    await api.post(`/personal-loans/${loanId}/repayment`, { amount });
    setRepayingLoan(null);
    await fetchData();
  };

  const handleMarkRepaid = async (loan) => {
    if (!window.confirm(`Mark loan of ${formatCurrency(loan.principalAmount)} from ${loan.lenderName} as fully repaid?`)) return;
    try {
      await api.put(`/personal-loans/${loan._id}/mark-repaid`, {});
      await fetchData();
    } catch (err) { console.error('Failed to mark as repaid:', err); }
  };

  const handleDeleteLoan = async (loan) => {
    if (!window.confirm(`Delete loan of ${formatCurrency(loan.principalAmount)} from ${loan.lenderName}? This cannot be undone.`)) return;
    try {
      await api.delete(`/personal-loans/${loan._id}`);
      await fetchData();
    } catch (err) { console.error('Failed to delete loan:', err); }
  };

  const handleNewLoanFromLender = (lender) => {
    setPrefillLender(lender);
    setEditingLoan(null);
    setLoanModalOpen(true);
  };

  const handleEditLoan = (loan) => {
    setEditingLoan(loan);
    setPrefillLender(null);
    setLoanModalOpen(true);
  };

  // ─── Filtering ─────────────────────────────────────────────────────────────

  const filteredLenders = useMemo(() => {
    let list = lenders;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(l => l.lenderName.toLowerCase().includes(q) || l.relationship.toLowerCase().includes(q));
    }
    if (statusFilter === 'active') list = list.filter(l => l.activeLoansCount > 0);
    if (statusFilter === 'repaid') list = list.filter(l => l.activeLoansCount === 0);
    return list;
  }, [lenders, searchQuery, statusFilter]);

  const filteredLoans = useMemo(() => {
    let list = allLoans;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(l => l.lenderName.toLowerCase().includes(q) || (l.purpose || '').toLowerCase().includes(q));
    }
    if (activeView === 'active') list = list.filter(l => l.status === 'active');
    if (activeView === 'repaid') list = list.filter(l => l.status === 'repaid');
    return list;
  }, [allLoans, searchQuery, activeView]);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <MainLayout title="Personal Borrowings">
        <div className={`min-h-screen ${palette.bg} flex items-center justify-center`}>
          <div className="text-center">
            <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
            <p className={palette.textSub}>Loading borrowings...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Personal Borrowings" subtitle="Track loans taken from people">
      <div className={`min-h-screen ${palette.bg} p-4 lg:p-6`}>
        {/* ── Page Header ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl lg:text-3xl font-bold ${palette.text}`}>Personal Borrowings</h1>
              <p className={`${palette.textSub} text-sm`}>Track all loans taken from friends, family & others</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${palette.textMuted}`} />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search lenders or loans..." className={`pl-9 pr-4 py-2 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text} text-sm w-56`} />
            </div>
            <button onClick={() => { setEditingLoan(null); setPrefillLender(null); setLoanModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium shadow-lg hover:shadow-xl transition-all text-sm">
              <Plus className="w-4 h-4" /> New Loan
            </button>
            <button onClick={handleRefresh} disabled={refreshing} className={`p-2 rounded-xl ${palette.btnBg} border ${palette.btnBorder} ${refreshing ? 'animate-spin' : ''}`}>
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <SummaryCards summary={summary} lendersCount={lenders.length} palette={palette} />

        {/* ── View Tabs ── */}
        <div className={`flex items-center gap-1 p-1 rounded-xl ${palette.card} border my-6 overflow-x-auto`}>
          {[
            { key: 'people', label: 'By People', icon: Users, count: filteredLenders.length },
            { key: 'all', label: 'All Loans', icon: BarChart3, count: allLoans.length },
            { key: 'active', label: 'Active', icon: Activity, count: allLoans.filter(l => l.status === 'active').length },
            { key: 'repaid', label: 'Repaid', icon: CheckCircle, count: allLoans.filter(l => l.status === 'repaid').length }
          ].map(tab => {
            const TabIcon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setActiveView(tab.key)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${activeView === tab.key ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md' : `${palette.textSub} hover:bg-opacity-10 hover:bg-blue-500`}`}>
                <TabIcon className="w-4 h-4" />
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeView === tab.key ? 'bg-white/20' : `${palette.textMuted}`}`}>{tab.count}</span>
              </button>
            );
          })}
        </div>

        {/* ── Status filter (for people view) ── */}
        {activeView === 'people' && (
          <div className="flex items-center gap-2 mb-4">
            <span className={`text-sm ${palette.textMuted}`}>Show:</span>
            {[
              { value: 'all', label: 'All People' },
              { value: 'active', label: 'With Active Loans' },
              { value: 'repaid', label: 'All Repaid' }
            ].map(f => (
              <button key={f.value} onClick={() => setStatusFilter(f.value)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === f.value ? 'bg-blue-500 text-white' : `${palette.textSub} border ${palette.btnBorder}`}`}>
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Content ── */}
        {activeView === 'people' ? (
          <div className="space-y-4">
            {filteredLenders.length > 0 ? filteredLenders.map((lender, i) => (
              <LenderCard
                key={lender.lenderName + i}
                lender={lender}
                palette={palette}
                isExpanded={expandedLender === lender.lenderName}
                onExpand={(name) => setExpandedLender(expandedLender === name ? null : name)}
                onNewLoan={handleNewLoanFromLender}
                onViewHistory={() => setExpandedLender(expandedLender === lender.lenderName ? null : lender.lenderName)}
              />
            )) : (
              <div className={`${palette.card} rounded-2xl border p-12 text-center`}>
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className={`font-medium text-lg ${palette.text}`}>{searchQuery ? 'No matching lenders found' : 'No borrowings recorded yet'}</p>
                <p className={`text-sm ${palette.textMuted} mt-1`}>{searchQuery ? 'Try a different search' : 'Click "New Loan" to record a borrowing from someone'}</p>
                {!searchQuery && (
                  <button onClick={() => setLoanModalOpen(true)} className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-lg transition-all">
                    <Plus className="w-4 h-4 inline mr-2" />Record First Loan
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <AllLoansTable
            loans={filteredLoans}
            palette={palette}
            onRepay={(loan) => { setRepayingLoan(loan); setRepaymentModalOpen(true); }}
            onMarkRepaid={handleMarkRepaid}
            onEdit={handleEditLoan}
            onDelete={handleDeleteLoan}
          />
        )}

        {/* ── Modals ── */}
        <LoanModal
          isOpen={loanModalOpen}
          onClose={() => { setLoanModalOpen(false); setEditingLoan(null); setPrefillLender(null); }}
          onSubmit={handleSaveLoan}
          editLoan={editingLoan}
          prefillLender={prefillLender}
          palette={palette}
        />
        <RepaymentModal
          isOpen={repaymentModalOpen}
          onClose={() => { setRepaymentModalOpen(false); setRepayingLoan(null); }}
          loan={repayingLoan}
          onSubmit={handleRepayment}
          palette={palette}
        />
      </div>
    </MainLayout>
  );
};

export default PersonalBorrowings;
