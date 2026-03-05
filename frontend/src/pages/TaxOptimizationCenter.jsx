import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import MainLayout from '../components/MainLayout';
import {
  Calculator, Percent, DollarSign, FileText, Download, RefreshCw, ChevronRight,
  CheckCircle, AlertTriangle, Info, Shield, TrendingUp, Target, Wallet,
  Building2, Briefcase, Heart, Baby, GraduationCap, Home, Landmark,
  CreditCard, PieChart, BarChart3, ArrowUpRight, ArrowDownRight, Star,
  Zap, HelpCircle, BookOpen, Clock, Calendar, Search, Filter, Plus,
  Minus, X, Check, Edit3, Save, Eye, EyeOff, Lock, ExternalLink
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
//  TAX OPTIMIZATION CENTER - Comprehensive Tax Planning & Filing Assistant
// ═══════════════════════════════════════════════════════════════════════════════

const TAX_SLABS_NEW = {
  fy2025: {
    name: 'New Tax Regime (FY 2025-26)',
    slabs: [
      { min: 0, max: 400000, rate: 0 },
      { min: 400001, max: 800000, rate: 5 },
      { min: 800001, max: 1200000, rate: 10 },
      { min: 1200001, max: 1600000, rate: 15 },
      { min: 1600001, max: 2000000, rate: 20 },
      { min: 2000001, max: 2400000, rate: 25 },
      { min: 2400001, max: Infinity, rate: 30 }
    ],
    standardDeduction: 75000,
    rebate87A: 60000, // for income up to ₹12L (post deduction)
    cess: 4,
    surcharge: [
      { min: 5000001, max: 10000000, rate: 10 },
      { min: 10000001, max: 20000000, rate: 15 },
      { min: 20000001, max: 50000000, rate: 25 },
      { min: 50000001, max: Infinity, rate: 37 }
    ]
  }
};

const TAX_SLABS_OLD = {
  fy2025: {
    name: 'Old Tax Regime (FY 2025-26)',
    slabs: [
      { min: 0, max: 250000, rate: 0 },
      { min: 250001, max: 500000, rate: 5 },
      { min: 500001, max: 1000000, rate: 20 },
      { min: 1000001, max: Infinity, rate: 30 }
    ],
    standardDeduction: 50000,
    rebate87A: 12500,
    cess: 4,
    surcharge: [
      { min: 5000001, max: 10000000, rate: 10 },
      { min: 10000001, max: 20000000, rate: 15 },
      { min: 20000001, max: 50000000, rate: 25 },
      { min: 50000001, max: Infinity, rate: 37 }
    ]
  }
};

const TAX_DEDUCTIONS = {
  section80C: { label: 'Section 80C', limit: 150000, items: ['PPF', 'ELSS', 'LIC Premium', 'Home Loan Principal', 'Children Tuition', 'NSC', 'Tax Saver FD', 'Sukanya Samriddhi'] },
  section80CCC: { label: 'Section 80CCC', limit: 150000, items: ['Pension Fund Contribution'] },
  section80CCD1: { label: 'Section 80CCD(1)', limit: 150000, items: ['NPS Employee Contribution'] },
  section80CCD1B: { label: 'Section 80CCD(1B)', limit: 50000, items: ['Additional NPS Contribution'] },
  section80CCD2: { label: 'Section 80CCD(2)', limit: null, items: ['NPS Employer Contribution (10% of basic)'] },
  section80D: { label: 'Section 80D', limit: 100000, items: ['Health Insurance Premium', 'Medical Checkup'] },
  section80E: { label: 'Section 80E', limit: null, items: ['Education Loan Interest'] },
  section80EEA: { label: 'Section 80EEA', limit: 150000, items: ['Home Loan Interest (First-time buyer)'] },
  section80G: { label: 'Section 80G', limit: null, items: ['Donations to Charitable Organizations'] },
  section80GG: { label: 'Section 80GG', limit: 60000, items: ['Rent Paid (if no HRA)'] },
  section80TTA: { label: 'Section 80TTA', limit: 10000, items: ['Savings Account Interest'] },
  section24: { label: 'Section 24(b)', limit: 200000, items: ['Home Loan Interest'] },
  hra: { label: 'HRA Exemption', limit: null, items: ['House Rent Allowance'] }
};

const formatCurrency = (amount) => {
  if (!amount || isNaN(amount)) return '₹0';
  const abs = Math.abs(amount);
  if (abs >= 10000000) return `${amount < 0 ? '-' : ''}₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `${amount < 0 ? '-' : ''}₹${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `${amount < 0 ? '-' : ''}₹${(abs / 1000).toFixed(1)}K`;
  return `${amount < 0 ? '-' : ''}₹${abs.toLocaleString('en-IN')}`;
};

// ─── Tax Calculator ──────────────────────────────────────────────────────────

const calculateTax = (income, deductions, regime = 'new') => {
  const slabs = regime === 'new' ? TAX_SLABS_NEW.fy2025 : TAX_SLABS_OLD.fy2025;
  
  // Apply standard deduction
  let taxableIncome = income - slabs.standardDeduction;
  
  // Apply deductions (only for old regime)
  if (regime === 'old') {
    const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + (val || 0), 0);
    taxableIncome -= totalDeductions;
  }
  
  taxableIncome = Math.max(0, taxableIncome);
  
  // Calculate tax based on slabs
  let tax = 0;
  for (const slab of slabs.slabs) {
    if (taxableIncome <= 0) break;
    const taxableInSlab = Math.min(taxableIncome, (slab.max === Infinity ? taxableIncome : slab.max - slab.min + 1));
    if (taxableIncome > slab.min || slab.min === 0) {
      const amount = Math.min(taxableInSlab, taxableIncome - (slab.min > 0 ? slab.min - 1 : 0));
      tax += Math.max(0, amount) * (slab.rate / 100);
    }
  }

  // Simplified tax calculation
  tax = 0;
  let remaining = taxableIncome;
  for (const slab of slabs.slabs) {
    if (remaining <= 0) break;
    const slabWidth = slab.max === Infinity ? remaining : slab.max - slab.min + 1;
    const taxableInSlab = Math.min(remaining, slabWidth);
    tax += taxableInSlab * (slab.rate / 100);
    remaining -= taxableInSlab;
  }

  // Apply rebate under Section 87A
  if (regime === 'new' && taxableIncome <= 1200000) {
    tax = Math.max(0, tax - slabs.rebate87A);
  } else if (regime === 'old' && taxableIncome <= 500000) {
    tax = Math.max(0, tax - slabs.rebate87A);
  }

  // Apply surcharge
  let surcharge = 0;
  if (income > 5000000) {
    for (const sc of slabs.surcharge) {
      if (income >= sc.min && income <= sc.max) {
        surcharge = tax * (sc.rate / 100);
        break;
      }
    }
  }

  // Apply cess
  const totalTax = tax + surcharge;
  const cess = totalTax * (slabs.cess / 100);

  return {
    grossIncome: income,
    standardDeduction: slabs.standardDeduction,
    totalDeductions: regime === 'old' ? Object.values(deductions).reduce((s, v) => s + (v || 0), 0) : 0,
    taxableIncome,
    baseTax: tax,
    surcharge,
    cess,
    totalTax: Math.round(totalTax + cess),
    effectiveRate: income > 0 ? (((totalTax + cess) / income) * 100) : 0,
    marginalRate: slabs.slabs.find(s => taxableIncome <= s.max)?.rate || 30,
    regime
  };
};

// ─── IncomeInputPanel ────────────────────────────────────────────────────────

const IncomeInputPanel = ({ income, setIncome, palette }) => {
  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-6">
        <DollarSign className="w-5 h-5 text-emerald-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>Income Details</h3>
      </div>

      <div className="space-y-4">
        {[
          { key: 'salary', label: 'Salary Income', icon: Briefcase, placeholder: '₹0' },
          { key: 'bonus', label: 'Bonus / Variable Pay', icon: Star, placeholder: '₹0' },
          { key: 'rental', label: 'Rental Income', icon: Building2, placeholder: '₹0' },
          { key: 'business', label: 'Business / Freelance Income', icon: Briefcase, placeholder: '₹0' },
          { key: 'capitalGains', label: 'Capital Gains', icon: TrendingUp, placeholder: '₹0' },
          { key: 'interest', label: 'Interest Income', icon: Percent, placeholder: '₹0' },
          { key: 'dividend', label: 'Dividend Income', icon: Wallet, placeholder: '₹0' },
          { key: 'other', label: 'Other Income', icon: FileText, placeholder: '₹0' }
        ].map(({ key, label, icon: Icon, placeholder }) => (
          <div key={key}>
            <label className={`flex items-center gap-2 text-sm font-medium ${palette.textSub} mb-1`}>
              <Icon className="w-4 h-4" />{label}
            </label>
            <input
              type="number"
              value={income[key] || ''}
              onChange={e => setIncome(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
              className={`w-full px-4 py-2.5 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text} focus:ring-2 focus:ring-blue-500`}
              placeholder={placeholder}
            />
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t" style={{ borderColor: palette.text === 'text-white' ? 'rgba(71,85,105,0.3)' : 'rgba(226,232,240,0.8)' }}>
        <div className="flex justify-between items-center">
          <span className={`text-sm font-medium ${palette.text}`}>Gross Total Income</span>
          <span className="text-xl font-bold text-emerald-500">{formatCurrency(Object.values(income).reduce((s, v) => s + (v || 0), 0))}</span>
        </div>
      </div>
    </div>
  );
};

// ─── DeductionsPanel ─────────────────────────────────────────────────────────

const DeductionsPanel = ({ deductions, setDeductions, palette }) => {
  const [expandedSection, setExpandedSection] = useState(null);

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-5 h-5 text-blue-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>Tax Deductions (Old Regime)</h3>
      </div>

      <div className="space-y-3">
        {Object.entries(TAX_DEDUCTIONS).map(([key, section]) => {
          const isExpanded = expandedSection === key;
          const currentValue = deductions[key] || 0;
          const isMaxed = section.limit && currentValue >= section.limit;

          return (
            <div key={key}>
              <button onClick={() => setExpandedSection(isExpanded ? null : key)} className={`w-full flex items-center justify-between p-3 rounded-xl ${palette.btnBg} border ${palette.btnBorder} transition-all`}>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${palette.text}`}>{section.label}</span>
                  {section.limit && <span className={`text-xs ${palette.textMuted}`}>(Limit: {formatCurrency(section.limit)})</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${isMaxed ? 'text-emerald-500' : palette.text}`}>{formatCurrency(currentValue)}</span>
                  <ChevronRight className={`w-4 h-4 ${palette.textMuted} transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {isExpanded && (
                <div className={`mt-2 p-4 rounded-xl border ${palette.btnBorder}`}>
                  <input
                    type="number"
                    value={currentValue || ''}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      const clamped = section.limit ? Math.min(val, section.limit) : val;
                      setDeductions(prev => ({ ...prev, [key]: clamped }));
                    }}
                    className={`w-full px-4 py-2.5 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text} focus:ring-2 focus:ring-blue-500 mb-3`}
                    placeholder="Enter amount"
                  />
                  <div className="space-y-1">
                    <p className={`text-xs font-medium ${palette.textMuted}`}>Eligible items:</p>
                    {section.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className={`text-xs ${palette.textSub}`}>{item}</span>
                      </div>
                    ))}
                  </div>
                  {section.limit && (
                    <div className="mt-2">
                      <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                        <div className={`h-full rounded-full ${isMaxed ? 'bg-emerald-500' : 'bg-blue-500'} transition-all duration-500`} style={{ width: `${Math.min(100, (currentValue / section.limit) * 100)}%` }} />
                      </div>
                      <span className={`text-xs ${palette.textMuted}`}>{((currentValue / section.limit) * 100).toFixed(0)}% utilized</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t" style={{ borderColor: palette.text === 'text-white' ? 'rgba(71,85,105,0.3)' : 'rgba(226,232,240,0.8)' }}>
        <div className="flex justify-between items-center">
          <span className={`text-sm font-medium ${palette.text}`}>Total Deductions</span>
          <span className="text-xl font-bold text-blue-500">{formatCurrency(Object.values(deductions).reduce((s, v) => s + (v || 0), 0))}</span>
        </div>
      </div>
    </div>
  );
};

// ─── TaxComparisonCard ───────────────────────────────────────────────────────

const TaxComparisonCard = ({ newRegimeTax, oldRegimeTax, palette }) => {
  const savings = Math.abs(newRegimeTax.totalTax - oldRegimeTax.totalTax);
  const betterRegime = newRegimeTax.totalTax <= oldRegimeTax.totalTax ? 'new' : 'old';

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-6">
        <Calculator className="w-5 h-5 text-purple-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>Tax Comparison</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* New Regime */}
        <div className={`p-4 rounded-xl border-2 transition-all ${betterRegime === 'new' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : `${palette.btnBorder}`}`}>
          {betterRegime === 'new' && (
            <div className="flex items-center gap-1 mb-2">
              <Star className="w-4 h-4 text-emerald-500 fill-current" />
              <span className="text-xs font-medium text-emerald-500">RECOMMENDED</span>
            </div>
          )}
          <p className={`text-sm font-medium ${palette.textSub} mb-1`}>New Tax Regime</p>
          <p className={`text-2xl font-bold ${palette.text}`}>{formatCurrency(newRegimeTax.totalTax)}</p>
          <p className={`text-xs ${palette.textMuted} mt-1`}>Effective Rate: {newRegimeTax.effectiveRate.toFixed(1)}%</p>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span className={palette.textMuted}>Taxable Income</span>
              <span className={palette.textSub}>{formatCurrency(newRegimeTax.taxableIncome)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className={palette.textMuted}>Std. Deduction</span>
              <span className={palette.textSub}>{formatCurrency(newRegimeTax.standardDeduction)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className={palette.textMuted}>Base Tax</span>
              <span className={palette.textSub}>{formatCurrency(newRegimeTax.baseTax)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className={palette.textMuted}>Cess (4%)</span>
              <span className={palette.textSub}>{formatCurrency(newRegimeTax.cess)}</span>
            </div>
          </div>
        </div>

        {/* Old Regime */}
        <div className={`p-4 rounded-xl border-2 transition-all ${betterRegime === 'old' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : `${palette.btnBorder}`}`}>
          {betterRegime === 'old' && (
            <div className="flex items-center gap-1 mb-2">
              <Star className="w-4 h-4 text-emerald-500 fill-current" />
              <span className="text-xs font-medium text-emerald-500">RECOMMENDED</span>
            </div>
          )}
          <p className={`text-sm font-medium ${palette.textSub} mb-1`}>Old Tax Regime</p>
          <p className={`text-2xl font-bold ${palette.text}`}>{formatCurrency(oldRegimeTax.totalTax)}</p>
          <p className={`text-xs ${palette.textMuted} mt-1`}>Effective Rate: {oldRegimeTax.effectiveRate.toFixed(1)}%</p>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span className={palette.textMuted}>Taxable Income</span>
              <span className={palette.textSub}>{formatCurrency(oldRegimeTax.taxableIncome)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className={palette.textMuted}>Deductions</span>
              <span className={palette.textSub}>{formatCurrency(oldRegimeTax.totalDeductions)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className={palette.textMuted}>Base Tax</span>
              <span className={palette.textSub}>{formatCurrency(oldRegimeTax.baseTax)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className={palette.textMuted}>Cess (4%)</span>
              <span className={palette.textSub}>{formatCurrency(oldRegimeTax.cess)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Savings Highlight */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className={`text-sm font-medium ${palette.textSub}`}>
              You save {formatCurrency(savings)} with the {betterRegime === 'new' ? 'New' : 'Old'} Tax Regime
            </p>
            <p className={`text-xs ${palette.textMuted}`}>
              Consider {betterRegime === 'new' ? 'switching to new regime for simplicity' : 'maximizing your deductions under old regime'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── TaxSavingOpportunities ──────────────────────────────────────────────────

const TaxSavingOpportunities = ({ income, deductions, palette }) => {
  const totalIncome = Object.values(income).reduce((s, v) => s + (v || 0), 0);
  const opportunities = useMemo(() => {
    const ops = [];

    // Section 80C opportunity
    const current80C = (deductions.section80C || 0) + (deductions.section80CCC || 0) + (deductions.section80CCD1 || 0);
    if (current80C < 150000) {
      const gap = 150000 - current80C;
      ops.push({
        section: '80C',
        title: 'Maximize Section 80C',
        description: `You can save up to ₹${Math.round(gap * 0.3).toLocaleString()} more in taxes by investing ₹${gap.toLocaleString()} in ELSS, PPF, or NPS.`,
        amount: gap,
        taxSaving: Math.round(gap * 0.3),
        priority: 'high',
        suggestions: ['ELSS Mutual Funds (3yr lock-in)', 'PPF (15yr, 7.1% guaranteed)', 'NPS (retirement savings)', 'Tax Saver FD (5yr lock-in)']
      });
    }

    // NPS additional deduction
    if (!deductions.section80CCD1B || deductions.section80CCD1B < 50000) {
      const gap = 50000 - (deductions.section80CCD1B || 0);
      ops.push({
        section: '80CCD(1B)',
        title: 'NPS Additional Deduction',
        description: `Invest ₹${gap.toLocaleString()} more in NPS for additional tax benefit over 80C.`,
        amount: gap,
        taxSaving: Math.round(gap * 0.3),
        priority: 'medium',
        suggestions: ['Additional NPS contribution beyond 80C limit']
      });
    }

    // Health Insurance
    if (!deductions.section80D || deductions.section80D < 25000) {
      const gap = 25000 - (deductions.section80D || 0);
      ops.push({
        section: '80D',
        title: 'Health Insurance Premium',
        description: `Health insurance premium of ₹${gap.toLocaleString()} can save ₹${Math.round(gap * 0.3).toLocaleString()} in taxes.`,
        amount: gap,
        taxSaving: Math.round(gap * 0.3),
        priority: 'high',
        suggestions: ['Self + family health insurance', 'Parents health insurance (additional ₹50K if senior citizen)', 'Preventive health checkup (₹5K)']
      });
    }

    // Home Loan Interest
    if (income.rental && (!deductions.section24 || deductions.section24 < 200000)) {
      const gap = 200000 - (deductions.section24 || 0);
      ops.push({
        section: '24(b)',
        title: 'Home Loan Interest',
        description: `Claim home loan interest deduction of up to ₹2 lakhs.`,
        amount: gap,
        taxSaving: Math.round(gap * 0.3),
        priority: 'medium',
        suggestions: ['Home loan interest on self-occupied property']
      });
    }

    // Education Loan
    if (!deductions.section80E) {
      ops.push({
        section: '80E',
        title: 'Education Loan Interest',
        description: 'Interest on education loans is fully deductible with no upper limit.',
        amount: 0,
        taxSaving: 0,
        priority: 'low',
        suggestions: ['Full interest deduction for 8 years from first repayment']
      });
    }

    // HRA Exemption
    if (income.salary > 0 && !deductions.hra) {
      ops.push({
        section: 'HRA',
        title: 'HRA Exemption',
        description: 'If you pay rent, you may be eligible for HRA exemption.',
        amount: 0,
        taxSaving: 0,
        priority: 'medium',
        suggestions: ['Submit rent receipts to employer', 'PAN of landlord required for rent > ₹1L/year']
      });
    }

    return ops.sort((a, b) => {
      const prio = { high: 3, medium: 2, low: 1 };
      return (prio[b.priority] || 0) - (prio[a.priority] || 0);
    });
  }, [income, deductions]);

  const totalPotentialSavings = opportunities.reduce((s, o) => s + (o.taxSaving || 0), 0);

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          <h3 className={`text-lg font-bold ${palette.text}`}>Tax Saving Opportunities</h3>
        </div>
        {totalPotentialSavings > 0 && (
          <span className="text-sm font-medium px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
            Save up to {formatCurrency(totalPotentialSavings)}
          </span>
        )}
      </div>

      {opportunities.length > 0 ? (
        <div className="space-y-4">
          {opportunities.map((opp, i) => (
            <div key={i} className={`p-4 rounded-xl border ${palette.btnBorder} hover:shadow-md transition-all`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className={`font-semibold text-sm ${palette.text}`}>{opp.title}</h4>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      opp.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                      opp.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}>{opp.priority}</span>
                  </div>
                  <p className={`text-xs ${palette.textMuted} mt-0.5`}>Section {opp.section}</p>
                </div>
                {opp.taxSaving > 0 && (
                  <span className="text-sm font-bold text-emerald-500">Save {formatCurrency(opp.taxSaving)}</span>
                )}
              </div>
              <p className={`text-sm ${palette.textSub} mb-3`}>{opp.description}</p>
              {opp.suggestions.length > 0 && (
                <div className="space-y-1">
                  {opp.suggestions.map((sug, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <ArrowUpRight className="w-3 h-3 text-blue-500" />
                      <span className={`text-xs ${palette.textSub}`}>{sug}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <p className={`font-medium ${palette.text}`}>All Optimized!</p>
          <p className={`text-sm ${palette.textMuted}`}>You're fully utilizing available tax deductions</p>
        </div>
      )}
    </div>
  );
};

// ─── TaxSlabBreakdown ────────────────────────────────────────────────────────

const TaxSlabBreakdown = ({ taxResult, palette }) => {
  const slabs = taxResult.regime === 'new' ? TAX_SLABS_NEW.fy2025.slabs : TAX_SLABS_OLD.fy2025.slabs;
  const taxableIncome = taxResult.taxableIncome;

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-5 h-5 text-indigo-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>Tax Slab Breakdown</h3>
      </div>

      <div className="space-y-2">
        {slabs.map((slab, i) => {
          const slabMin = slab.min;
          const slabMax = slab.max === Infinity ? Math.max(taxableIncome, slab.min) : slab.max;
          const taxableInSlab = Math.max(0, Math.min(taxableIncome - slabMin, slabMax - slabMin + 1));
          const taxInSlab = taxableInSlab * (slab.rate / 100);
          const isActive = taxableIncome > slabMin;

          return (
            <div key={i} className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${isActive ? '' : 'opacity-40'}`}>
              <div className="w-16 text-right">
                <span className={`text-sm font-bold ${slab.rate === 0 ? 'text-emerald-500' : palette.text}`}>{slab.rate}%</span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className={palette.textSub}>{formatCurrency(slab.min)} - {slab.max === Infinity ? 'Above' : formatCurrency(slab.max)}</span>
                  <span className={`font-medium ${palette.text}`}>{formatCurrency(taxInSlab)}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${
                    slab.rate === 0 ? 'bg-emerald-500' :
                    slab.rate <= 10 ? 'bg-blue-500' :
                    slab.rate <= 20 ? 'bg-amber-500' : 'bg-red-500'
                  }`} style={{ width: `${isActive ? Math.min(100, (taxableInSlab / Math.max(1, slabMax - slabMin + 1)) * 100) : 0}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t" style={{ borderColor: palette.text === 'text-white' ? 'rgba(71,85,105,0.3)' : 'rgba(226,232,240,0.8)' }}>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className={`text-xs ${palette.textMuted}`}>Base Tax</p>
            <p className={`text-sm font-bold ${palette.text}`}>{formatCurrency(taxResult.baseTax)}</p>
          </div>
          <div>
            <p className={`text-xs ${palette.textMuted}`}>Surcharge + Cess</p>
            <p className={`text-sm font-bold ${palette.text}`}>{formatCurrency(taxResult.surcharge + taxResult.cess)}</p>
          </div>
          <div>
            <p className={`text-xs ${palette.textMuted}`}>Total Tax</p>
            <p className="text-sm font-bold text-red-500">{formatCurrency(taxResult.totalTax)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main TaxOptimizationCenter Component ────────────────────────────────────

const TaxOptimizationCenter = () => {
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

  const [activeTab, setActiveTab] = useState('calculator');
  const [income, setIncome] = useState({ salary: 1200000, bonus: 0, rental: 0, business: 0, capitalGains: 0, interest: 0, dividend: 0, other: 0 });
  const [deductions, setDeductions] = useState({ section80C: 0, section80CCC: 0, section80CCD1: 0, section80CCD1B: 0, section80D: 0, section80E: 0, section80G: 0, section80GG: 0, section80TTA: 0, section24: 0, hra: 0 });

  const totalIncome = Object.values(income).reduce((s, v) => s + (v || 0), 0);
  const newRegimeTax = useMemo(() => calculateTax(totalIncome, deductions, 'new'), [totalIncome, deductions]);
  const oldRegimeTax = useMemo(() => calculateTax(totalIncome, deductions, 'old'), [totalIncome, deductions]);

  const tabs = [
    { key: 'calculator', label: 'Tax Calculator', icon: Calculator },
    { key: 'deductions', label: 'Deductions', icon: Shield },
    { key: 'opportunities', label: 'Opportunities', icon: Zap },
    { key: 'slabs', label: 'Tax Slabs', icon: BarChart3 }
  ];

  return (
    <MainLayout title="Tax Optimization" subtitle="Smart tax planning & filing assistant">
      <div className={`min-h-screen ${palette.bg} p-4 lg:p-6`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className={`text-2xl lg:text-3xl font-bold ${palette.text}`}>Tax Optimization Center</h1>
            <p className={`${palette.textSub} mt-1`}>FY 2025-26 (AY 2026-27) tax planning assistant</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium shadow-lg text-sm">
              <Download className="w-4 h-4" /> Export Tax Report
            </button>
          </div>
        </div>

        {/* Quick Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Gross Income', value: formatCurrency(totalIncome), color: 'text-emerald-500', icon: DollarSign },
            { label: 'Best Regime Tax', value: formatCurrency(Math.min(newRegimeTax.totalTax, oldRegimeTax.totalTax)), color: 'text-red-500', icon: Calculator },
            { label: 'Effective Rate', value: `${Math.min(newRegimeTax.effectiveRate, oldRegimeTax.effectiveRate).toFixed(1)}%`, color: 'text-amber-500', icon: Percent },
            { label: 'Potential Savings', value: formatCurrency(Math.abs(newRegimeTax.totalTax - oldRegimeTax.totalTax)), color: 'text-blue-500', icon: Zap }
          ].map((stat, i) => {
            const StatIcon = stat.icon;
            return (
              <div key={i} className={`${palette.card} rounded-xl border p-4`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color} bg-opacity-10`} style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}>
                    <StatIcon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className={`text-xs ${palette.textMuted}`}>{stat.label}</p>
                    <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className={`flex items-center gap-1 p-1 rounded-xl ${palette.card} border mb-6 overflow-x-auto`}>
          {tabs.map(tab => {
            const TabIcon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${activeTab === tab.key ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md' : `${palette.textSub}`}`}>
                <TabIcon className="w-4 h-4" />{tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'calculator' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <IncomeInputPanel income={income} setIncome={setIncome} palette={palette} />
            <TaxComparisonCard newRegimeTax={newRegimeTax} oldRegimeTax={oldRegimeTax} palette={palette} />
          </div>
        )}

        {activeTab === 'deductions' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DeductionsPanel deductions={deductions} setDeductions={setDeductions} palette={palette} />
            <TaxComparisonCard newRegimeTax={newRegimeTax} oldRegimeTax={oldRegimeTax} palette={palette} />
          </div>
        )}

        {activeTab === 'opportunities' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TaxSavingOpportunities income={income} deductions={deductions} palette={palette} />
            <TaxSlabBreakdown taxResult={oldRegimeTax} palette={palette} />
          </div>
        )}

        {activeTab === 'slabs' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TaxSlabBreakdown taxResult={newRegimeTax} palette={palette} />
            <TaxSlabBreakdown taxResult={oldRegimeTax} palette={palette} />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default TaxOptimizationCenter;
