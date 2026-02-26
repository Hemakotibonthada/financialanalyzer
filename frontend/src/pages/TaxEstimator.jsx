import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  Calculator, IndianRupee, FileText, Download, Calendar,
  TrendingUp, TrendingDown, Info, ChevronDown, Shield,
  Building, Heart, Plane, GraduationCap, Home, Landmark,
  CheckCircle, AlertTriangle, Clock
} from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

const fmt = (n) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
};

const oldSlabs = [
  { range: '0 - 2.5L', rate: 0, min: 0, max: 250000 },
  { range: '2.5L - 5L', rate: 5, min: 250000, max: 500000 },
  { range: '5L - 10L', rate: 20, min: 500000, max: 1000000 },
  { range: 'Above 10L', rate: 30, min: 1000000, max: Infinity },
];

const newSlabs = [
  { range: '0 - 3L', rate: 0, min: 0, max: 300000 },
  { range: '3L - 7L', rate: 5, min: 300000, max: 700000 },
  { range: '7L - 10L', rate: 10, min: 700000, max: 1000000 },
  { range: '10L - 12L', rate: 15, min: 1000000, max: 1200000 },
  { range: '12L - 15L', rate: 20, min: 1200000, max: 1500000 },
  { range: 'Above 15L', rate: 30, min: 1500000, max: Infinity },
];

const deductionCategories = [
  { section: '80C', label: 'Life Insurance, PPF, ELSS, etc.', limit: 150000, icon: Shield, color: '#3B82F6' },
  { section: '80D', label: 'Health Insurance Premium', limit: 50000, icon: Heart, color: '#EF4444' },
  { section: 'HRA', label: 'House Rent Allowance', limit: 200000, icon: Home, color: '#10B981' },
  { section: 'LTA', label: 'Leave Travel Allowance', limit: 50000, icon: Plane, color: '#F59E0B' },
  { section: '80E', label: 'Education Loan Interest', limit: 200000, icon: GraduationCap, color: '#8B5CF6' },
  { section: 'Std Ded', label: 'Standard Deduction', limit: 50000, icon: Building, color: '#06B6D4' },
];

const taxSavingTips = [
  { title: 'Invest in ELSS Mutual Funds', savings: 46800, section: '80C', desc: 'Tax saving with equity growth. Lock-in: 3 years.' },
  { title: 'PPF Annual Contribution', savings: 46800, section: '80C', desc: 'Government-backed, 7.1% returns, 15-year lock-in.' },
  { title: 'NPS Tier-1 Additional', savings: 15600, section: '80CCD(1B)', desc: 'Additional ₹50K deduction beyond 80C limit.' },
  { title: 'Health Insurance for Parents', savings: 7800, section: '80D', desc: 'Up to ₹50K for senior citizen parents.' },
  { title: 'Home Loan Principal', savings: 46800, section: '80C', desc: 'Up to ₹1.5L deduction on principal repayment.' },
  { title: 'Home Loan Interest', savings: 60000, section: '24(b)', desc: 'Up to ₹2L deduction on interest for self-occupied property.' },
];

const taxCalendar = [
  { date: 'Jun 15, 2026', event: 'Advance Tax - Q1 (15%)', status: 'upcoming' },
  { date: 'Jul 31, 2026', event: 'ITR Filing Deadline (Non-audit)', status: 'upcoming' },
  { date: 'Sep 15, 2026', event: 'Advance Tax - Q2 (45%)', status: 'upcoming' },
  { date: 'Dec 15, 2026', event: 'Advance Tax - Q3 (75%)', status: 'upcoming' },
  { date: 'Mar 15, 2027', event: 'Advance Tax - Q4 (100%)', status: 'upcoming' },
  { date: 'Mar 31, 2027', event: 'Tax Saving Investments Deadline', status: 'upcoming' },
];

const monthlyTDS = [
  { month: 'Apr 25', tds: 12500, salary: 125000 },
  { month: 'May 25', tds: 12500, salary: 125000 },
  { month: 'Jun 25', tds: 12500, salary: 125000 },
  { month: 'Jul 25', tds: 15000, salary: 130000 },
  { month: 'Aug 25', tds: 15000, salary: 130000 },
  { month: 'Sep 25', tds: 15000, salary: 130000 },
  { month: 'Oct 25', tds: 15000, salary: 135000 },
  { month: 'Nov 25', tds: 15000, salary: 135000 },
  { month: 'Dec 25', tds: 15000, salary: 135000 },
  { month: 'Jan 26', tds: 17500, salary: 140000 },
  { month: 'Feb 26', tds: 17500, salary: 140000 },
];

const historicalTax = [
  { year: 'FY22', oldRegime: 280000, newRegime: 310000 },
  { year: 'FY23', oldRegime: 320000, newRegime: 340000 },
  { year: 'FY24', oldRegime: 340000, newRegime: 320000 },
  { year: 'FY25', oldRegime: 380000, newRegime: 330000 },
  { year: 'FY26', oldRegime: 410000, newRegime: 345000 },
];

function calcTax(income, slabs) {
  let tax = 0;
  for (const slab of slabs) {
    if (income > slab.min) {
      const taxable = Math.min(income, slab.max) - slab.min;
      tax += taxable * slab.rate / 100;
    }
  }
  return Math.round(tax);
}

export default function TaxEstimator() {
  const [grossIncome, setGrossIncome] = useState(1800000);
  const [deductions, setDeductions] = useState({
    '80C': 120000, '80D': 25000, 'HRA': 100000, 'LTA': 20000, '80E': 0, 'Std Ded': 50000
  });
  const [selectedRegime, setSelectedRegime] = useState('new');
  const [showSlabs, setShowSlabs] = useState(false);

  const totalDeductions = useMemo(() => Object.values(deductions).reduce((s, v) => s + v, 0), [deductions]);
  const taxableOld = useMemo(() => Math.max(grossIncome - totalDeductions, 0), [grossIncome, totalDeductions]);
  const taxableNew = useMemo(() => Math.max(grossIncome - 75000, 0), [grossIncome]); // new regime std deduction
  const taxOld = useMemo(() => calcTax(taxableOld, oldSlabs), [taxableOld]);
  const taxNew = useMemo(() => calcTax(taxableNew, newSlabs), [taxableNew]);
  const cess = (tax) => Math.round(tax * 0.04);
  const totalOld = taxOld + cess(taxOld);
  const totalNew = taxNew + cess(taxNew);
  const savings = totalOld - totalNew;
  const betterRegime = savings > 0 ? 'New' : 'Old';
  const tdsPaid = useMemo(() => monthlyTDS.reduce((s, m) => s + m.tds, 0), []);

  const slabVisualization = useMemo(() => {
    const slabs = selectedRegime === 'old' ? oldSlabs : newSlabs;
    return slabs.map(s => {
      const taxable = Math.max(Math.min(selectedRegime === 'old' ? taxableOld : taxableNew, s.max) - s.min, 0);
      return { slab: s.range, taxable, tax: Math.round(taxable * s.rate / 100), rate: s.rate };
    }).filter(s => s.taxable > 0);
  }, [selectedRegime, taxableOld, taxableNew]);

  const updateDeduction = (key, val) => {
    const cat = deductionCategories.find(c => c.section === key);
    const capped = Math.min(Number(val), cat?.limit || Infinity);
    setDeductions({ ...deductions, [key]: capped });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Calculator className="w-7 h-7 text-blue-600" /> Tax Estimator
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Estimate your tax liability and optimize your savings</p>
        </div>
        <button className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 px-4 py-2 flex items-center gap-2 w-fit">
          <Download className="w-4 h-4" /> Export Tax Sheet
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Gross Income', value: fmt(grossIncome), icon: IndianRupee, color: 'text-blue-600', sub: 'FY 2025-26' },
          { label: `Tax (${betterRegime} Regime)`, value: fmt(Math.min(totalOld, totalNew)), icon: Calculator, color: 'text-red-600', sub: `${betterRegime} regime is better` },
          { label: 'TDS Paid', value: fmt(tdsPaid), icon: TrendingDown, color: 'text-amber-600', sub: '11 months tracked' },
          { label: 'Total Deductions', value: fmt(totalDeductions), icon: Shield, color: 'text-green-600', sub: `${deductionCategories.length} sections` },
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

      {/* Income Input + Regime Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Income Details</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-500 dark:text-slate-400 flex justify-between mb-2">
                <span>Gross Annual Income</span><span className="font-semibold text-slate-800 dark:text-white">{fmt(grossIncome)}</span>
              </label>
              <input type="range" min={300000} max={10000000} step={50000} value={grossIncome} onChange={e => setGrossIncome(Number(e.target.value))} className="w-full accent-blue-600" />
              <div className="flex justify-between text-xs text-slate-400 mt-1"><span>₹3L</span><span>₹1Cr</span></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">Taxable (Old)</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{fmt(taxableOld)}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">Taxable (New)</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{fmt(taxableNew)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Old vs New Regime</h2>
          <div className="flex gap-3 mb-4">
            {[
              { key: 'old', label: 'Old Regime', tax: totalOld },
              { key: 'new', label: 'New Regime', tax: totalNew },
            ].map(r => (
              <button key={r.key} onClick={() => setSelectedRegime(r.key)}
                className={`flex-1 p-4 rounded-xl border text-left ${selectedRegime === r.key ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30'}`}>
                <p className={`text-sm font-medium ${selectedRegime === r.key ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>{r.label}</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white mt-1">{fmt(r.tax)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">incl. 4% cess</p>
              </button>
            ))}
          </div>
          <div className={`p-4 rounded-xl border ${savings > 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800'}`}>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm font-medium text-green-700 dark:text-green-300">{betterRegime} Regime saves you {fmt(Math.abs(savings))}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tax Slab Visualization */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Tax Slab Breakdown ({selectedRegime === 'old' ? 'Old' : 'New'} Regime)</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={slabVisualization}>
            <XAxis dataKey="slab" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tickFormatter={v => fmt(v)} tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip formatter={v => fmt(v)} />
            <Legend />
            <Bar dataKey="taxable" fill="#3B82F6" name="Taxable Amount" radius={[4, 4, 0, 0]} />
            <Bar dataKey="tax" fill="#EF4444" name="Tax" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Deduction Tracker */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Deduction Tracker (Old Regime)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {deductionCategories.map((cat, i) => {
            const used = deductions[cat.section] || 0;
            const pct = (used / cat.limit) * 100;
            const Icon = cat.icon;
            return (
              <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + '20' }}>
                    <Icon className="w-4 h-4" style={{ color: cat.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-white">Section {cat.section}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{cat.label}</p>
                  </div>
                </div>
                <div className="flex justify-between text-xs mb-1 text-slate-500 dark:text-slate-400">
                  <span>{fmt(used)} used</span><span>Limit: {fmt(cat.limit)}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2 mb-2">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: cat.color }} />
                </div>
                <input type="range" min={0} max={cat.limit} step={1000} value={used}
                  onChange={e => updateDeduction(cat.section, e.target.value)} className="w-full accent-blue-600" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Tax Saving Suggestions */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" /> Tax Saving Suggestions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {taxSavingTips.map((tip, i) => (
            <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-medium text-slate-800 dark:text-white">{tip.title}</h4>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{tip.section}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{tip.desc}</p>
              <p className="text-sm font-bold text-green-600 dark:text-green-400">Save up to {fmt(tip.savings)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly TDS + Tax Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Monthly TDS Tracker</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyTDS}>
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip formatter={v => fmt(v)} />
              <Legend />
              <Bar dataKey="tds" fill="#EF4444" name="TDS Deducted" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-300">Total TDS paid: {fmt(tdsPaid)}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {tdsPaid > Math.min(totalOld, totalNew) ? `Refund expected: ${fmt(tdsPaid - Math.min(totalOld, totalNew))}` : `Balance tax: ${fmt(Math.min(totalOld, totalNew) - tdsPaid)}`}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" /> Tax Calendar
          </h2>
          <div className="space-y-3">
            {taxCalendar.map((e, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{e.event}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{e.date}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Upcoming</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Historical Tax Comparison */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Historical Tax Comparison</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={historicalTax}>
            <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis tickFormatter={v => fmt(v)} tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip formatter={v => fmt(v)} />
            <Legend />
            <Line type="monotone" dataKey="oldRegime" stroke="#EF4444" strokeWidth={2} name="Old Regime" dot={{ r: 4 }} />
            <Line type="monotone" dataKey="newRegime" stroke="#3B82F6" strokeWidth={2} name="New Regime" dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
