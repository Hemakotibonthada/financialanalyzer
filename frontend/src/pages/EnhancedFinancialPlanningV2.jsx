// ============================================================================
// Enterprise Financial Planning Page — Retirement, Tax, SIP, Wealth
// ============================================================================

import React, { useState, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import MainLayout from '../components/MainLayout';
import {
  TrendingUp, Calculator, Shield, Landmark, PiggyBank, Target,
  ArrowRight, DollarSign, Calendar, AlertTriangle, ChevronDown,
  ChevronUp, BarChart3, Percent, Clock, Building, Heart, Users,
  BadgeCheck, Wallet, ArrowUpRight, ArrowDownRight, RefreshCw,
} from 'lucide-react';
import api from '../services/api';
import {
  FinancialAreaChart, FinancialBarChart, FinancialDonutChart,
} from '../components/charts/EnterpriseCharts';

// ============================================================================
// § 1 — Constants & Config
// ============================================================================

const CALCULATORS = [
  { id: 'sip', label: 'SIP Calculator', icon: TrendingUp, color: 'blue' },
  { id: 'lumpsum', label: 'Lumpsum', icon: DollarSign, color: 'green' },
  { id: 'retirement', label: 'Retirement', icon: Landmark, color: 'purple' },
  { id: 'emi', label: 'EMI Calculator', icon: Calculator, color: 'orange' },
  { id: 'tax', label: 'Tax Planner', icon: Percent, color: 'rose' },
  { id: 'emergency', label: 'Emergency Fund', icon: Shield, color: 'amber' },
  { id: 'wealth', label: 'Wealth Projection', icon: BarChart3, color: 'teal' },
  { id: 'insurance', label: 'Insurance', icon: Heart, color: 'indigo' },
  { id: 'debtPayoff', label: 'Debt Payoff', icon: Target, color: 'red' },
  { id: 'comprehensive', label: 'Full Plan', icon: BadgeCheck, color: 'sky' },
];

// ============================================================================
// § 2 — Reusable Input Component
// ============================================================================

function InputField({ label, value, onChange, type = 'number', suffix, min, max, step }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={e => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
          min={min}
          max={max}
          step={step || 1}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent
            transition-all"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function ResultCard({ label, value, subtitle, color = 'blue', icon: Icon }) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[color] || colors.blue}`}>
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon size={14} className="text-gray-500" />}
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <div className="text-lg font-bold text-gray-900 dark:text-white">{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>}
    </div>
  );
}

// ============================================================================
// § 3 — SIP Calculator Panel
// ============================================================================

function SIPCalculator() {
  const [params, setParams] = useState({ monthlySIP: 10000, annualReturn: 12, years: 10, annualStepUp: 10 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    setLoading(true);
    try {
      const res = await api.post('/planning/sip', {
        monthlySIP: params.monthlySIP,
        annualReturn: params.annualReturn / 100,
        years: params.years,
        annualStepUp: params.annualStepUp / 100,
      });
      if (res.data?.success) setResult(res.data.data);
    } catch { /* fallback local calc */ }
    setLoading(false);
  };

  const fmt = v => '₹' + (v >= 10000000 ? (v / 10000000).toFixed(2) + ' Cr' :
    v >= 100000 ? (v / 100000).toFixed(2) + ' L' : v.toLocaleString('en-IN'));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <InputField label="Monthly SIP (₹)" value={params.monthlySIP} onChange={v => setParams(p => ({ ...p, monthlySIP: v }))} suffix="₹" />
        <InputField label="Expected Return (%)" value={params.annualReturn} onChange={v => setParams(p => ({ ...p, annualReturn: v }))} suffix="%" step={0.5} />
        <InputField label="Duration (Years)" value={params.years} onChange={v => setParams(p => ({ ...p, years: v }))} suffix="yrs" />
        <InputField label="Annual Step-up (%)" value={params.annualStepUp} onChange={v => setParams(p => ({ ...p, annualStepUp: v }))} suffix="%" />
      </div>
      <button onClick={calculate} disabled={loading}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium
          transition-all disabled:opacity-50 flex items-center justify-center gap-2">
        {loading ? <RefreshCw className="animate-spin" size={16} /> : <Calculator size={16} />}
        Calculate Returns
      </button>
      {result && (
        <div className="space-y-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            <ResultCard label="Total Invested" value={fmt(result.totalInvested)} icon={Wallet} />
            <ResultCard label="Future Value" value={fmt(result.futureValue)} color="green" icon={TrendingUp} />
            <ResultCard label="Wealth Gain" value={fmt(result.wealthGain)} color="purple" icon={ArrowUpRight} />
            <ResultCard label="Absolute Return" value={`${result.absoluteReturn}%`} color="amber" icon={Percent} />
          </div>
          {result.yearlyBreakdown && (
            <FinancialAreaChart
              data={result.yearlyBreakdown.map(y => ({
                name: `Y${y.year}`,
                invested: y.invested,
                value: y.value,
              }))}
              areas={[
                { key: 'invested', name: 'Invested', color: '#64748b' },
                { key: 'value', name: 'Value', color: '#3b82f6' },
              ]}
              height={200}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// § 4 — Retirement Calculator Panel
// ============================================================================

function RetirementCalculator() {
  const [params, setParams] = useState({
    currentAge: 30, retirementAge: 60, lifeExpectancy: 85,
    monthlyExpenses: 50000, currentSavings: 500000, monthlySIP: 15000,
    expectedReturn: 12, inflationRate: 6,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    setLoading(true);
    try {
      const res = await api.post('/planning/retirement', {
        ...params,
        expectedReturn: params.expectedReturn / 100,
        inflationRate: params.inflationRate / 100,
      });
      if (res.data?.success) setResult(res.data.data);
    } catch { /* noop */ }
    setLoading(false);
  };

  const fmt = v => '₹' + (v >= 10000000 ? (v / 10000000).toFixed(2) + ' Cr' :
    v >= 100000 ? (v / 100000).toFixed(2) + ' L' : v.toLocaleString('en-IN'));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <InputField label="Current Age" value={params.currentAge} onChange={v => setParams(p => ({ ...p, currentAge: v }))} />
        <InputField label="Retirement Age" value={params.retirementAge} onChange={v => setParams(p => ({ ...p, retirementAge: v }))} />
        <InputField label="Monthly Expenses (₹)" value={params.monthlyExpenses} onChange={v => setParams(p => ({ ...p, monthlyExpenses: v }))} />
        <InputField label="Current Savings (₹)" value={params.currentSavings} onChange={v => setParams(p => ({ ...p, currentSavings: v }))} />
        <InputField label="Monthly SIP (₹)" value={params.monthlySIP} onChange={v => setParams(p => ({ ...p, monthlySIP: v }))} />
        <InputField label="Expected Return (%)" value={params.expectedReturn} onChange={v => setParams(p => ({ ...p, expectedReturn: v }))} suffix="%" />
        <InputField label="Inflation (%)" value={params.inflationRate} onChange={v => setParams(p => ({ ...p, inflationRate: v }))} suffix="%" />
        <InputField label="Life Expectancy" value={params.lifeExpectancy} onChange={v => setParams(p => ({ ...p, lifeExpectancy: v }))} />
      </div>
      <button onClick={calculate} disabled={loading}
        className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all">
        {loading ? 'Calculating...' : '🏦 Plan Retirement'}
      </button>
      {result && (
        <div className="space-y-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            <ResultCard label="Corpus Needed" value={fmt(result.corpusNeeded)} color="red" icon={Target} />
            <ResultCard label="Projected Corpus" value={fmt(result.projectedCorpus)} color="green" icon={TrendingUp} />
            <ResultCard label="Shortfall" value={result.shortfall > 0 ? fmt(result.shortfall) : '₹0 ✅'}
              color={result.shortfall > 0 ? 'red' : 'green'} icon={AlertTriangle} />
            <ResultCard label="Readiness" value={`${result.readinessPercent}%`}
              color={result.readinessPercent >= 80 ? 'green' : 'amber'} icon={BadgeCheck} />
          </div>
          {result.additionalSIPNeeded > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                💡 Additional {fmt(result.additionalSIPNeeded)}/month SIP needed to close the gap
              </p>
            </div>
          )}
          {result.milestones?.length > 0 && (
            <FinancialBarChart
              data={result.milestones.map(m => ({
                name: `Age ${m.age}`,
                corpus: m.projectedCorpus,
              }))}
              bars={[{ key: 'corpus', name: 'Corpus', color: '#8b5cf6' }]}
              height={200}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// § 5 — EMI Calculator Panel
// ============================================================================

function EMICalculator() {
  const [params, setParams] = useState({ principal: 5000000, annualRate: 8.5, tenureMonths: 240 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    setLoading(true);
    try {
      const res = await api.post('/planning/emi', params);
      if (res.data?.success) setResult(res.data.data);
    } catch { /* noop */ }
    setLoading(false);
  };

  const fmt = v => '₹' + (v >= 100000 ? (v / 100000).toFixed(2) + 'L' : v.toLocaleString('en-IN'));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <InputField label="Loan Amount (₹)" value={params.principal} onChange={v => setParams(p => ({ ...p, principal: v }))} />
        <InputField label="Interest Rate (%)" value={params.annualRate} onChange={v => setParams(p => ({ ...p, annualRate: v }))} suffix="%" step={0.1} />
        <InputField label="Tenure (Months)" value={params.tenureMonths} onChange={v => setParams(p => ({ ...p, tenureMonths: v }))} />
      </div>
      <button onClick={calculate} disabled={loading}
        className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-all">
        {loading ? 'Calculating...' : '📊 Calculate EMI'}
      </button>
      {result && (
        <div className="space-y-3 animate-fade-in">
          <div className="grid grid-cols-3 gap-3">
            <ResultCard label="Monthly EMI" value={fmt(result.emi)} color="blue" icon={Calendar} />
            <ResultCard label="Total Interest" value={fmt(result.totalInterest)} color="red" icon={Percent} />
            <ResultCard label="Total Payment" value={fmt(result.emi * params.tenureMonths)} color="purple" icon={DollarSign} />
          </div>
          {result.schedule && (
            <FinancialDonutChart
              data={[
                { name: 'Principal', value: params.principal },
                { name: 'Interest', value: result.totalInterest },
              ]}
              colors={['#3b82f6', '#ef4444']}
              height={200}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// § 6 — Tax Planner Panel
// ============================================================================

function TaxPlanner() {
  const [income, setIncome] = useState(1200000);
  const [deductions, setDeductions] = useState({
    section80C: 150000, section80D: 25000, nps: 50000, section24b: 0,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    setLoading(true);
    try {
      const res = await api.post('/planning/tax', { grossIncome: income, deductions });
      if (res.data?.success) setResult(res.data.data);
    } catch { /* noop */ }
    setLoading(false);
  };

  const fmt = v => '₹' + v.toLocaleString('en-IN');

  return (
    <div className="space-y-4">
      <InputField label="Gross Annual Income (₹)" value={income} onChange={setIncome} />
      <div className="grid grid-cols-2 gap-3">
        <InputField label="80C (PPF/ELSS/LIC)" value={deductions.section80C} onChange={v => setDeductions(d => ({ ...d, section80C: v }))} />
        <InputField label="80D (Health Insurance)" value={deductions.section80D} onChange={v => setDeductions(d => ({ ...d, section80D: v }))} />
        <InputField label="80CCD NPS" value={deductions.nps} onChange={v => setDeductions(d => ({ ...d, nps: v }))} />
        <InputField label="24(b) Home Loan" value={deductions.section24b} onChange={v => setDeductions(d => ({ ...d, section24b: v }))} />
      </div>
      <button onClick={calculate} disabled={loading}
        className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-all">
        {loading ? 'Calculating...' : '📋 Compare Tax Regimes'}
      </button>
      {result && (
        <div className="space-y-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-4">
            <div className={`rounded-xl p-4 border-2 ${result.recommended === 'old' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'}`}>
              <h4 className="font-semibold text-sm mb-2">Old Regime</h4>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{fmt(result.oldRegime.totalTax)}</div>
              <div className="text-xs text-gray-500 mt-1">Effective: {result.oldRegime.effectiveRate}%</div>
              <div className="text-xs text-gray-500">Monthly: {fmt(result.oldRegime.monthlyTax)}</div>
            </div>
            <div className={`rounded-xl p-4 border-2 ${result.recommended === 'new' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'}`}>
              <h4 className="font-semibold text-sm mb-2">New Regime</h4>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{fmt(result.newRegime.totalTax)}</div>
              <div className="text-xs text-gray-500 mt-1">Effective: {result.newRegime.effectiveRate}%</div>
              <div className="text-xs text-gray-500">Monthly: {fmt(result.newRegime.monthlyTax)}</div>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              💡 {result.recommended === 'old' ? 'Old' : 'New'} regime saves you {fmt(result.savings)} this year
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// § 7 — Emergency Fund Panel
// ============================================================================

function EmergencyFundCalculator() {
  const [params, setParams] = useState({
    monthlyExpenses: 50000, dependents: 1, hasInsurance: true,
    jobStability: 'medium', monthlyEMIs: 15000, currentEmergencyFund: 200000,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    setLoading(true);
    try {
      const res = await api.post('/planning/emergency-fund', params);
      if (res.data?.success) setResult(res.data.data);
    } catch { /* noop */ }
    setLoading(false);
  };

  const fmt = v => '₹' + (v >= 100000 ? (v / 100000).toFixed(2) + 'L' : v.toLocaleString('en-IN'));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <InputField label="Monthly Expenses (₹)" value={params.monthlyExpenses} onChange={v => setParams(p => ({ ...p, monthlyExpenses: v }))} />
        <InputField label="Monthly EMIs (₹)" value={params.monthlyEMIs} onChange={v => setParams(p => ({ ...p, monthlyEMIs: v }))} />
        <InputField label="Dependents" value={params.dependents} onChange={v => setParams(p => ({ ...p, dependents: v }))} />
        <InputField label="Current Fund (₹)" value={params.currentEmergencyFund} onChange={v => setParams(p => ({ ...p, currentEmergencyFund: v }))} />
      </div>
      <div className="flex gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={params.hasInsurance} onChange={e => setParams(p => ({ ...p, hasInsurance: e.target.checked }))} />
          Has Insurance
        </label>
        <select value={params.jobStability} onChange={e => setParams(p => ({ ...p, jobStability: e.target.value }))}
          className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
          <option value="low">Low Job Stability</option>
          <option value="medium">Medium Stability</option>
          <option value="high">High Stability</option>
        </select>
      </div>
      <button onClick={calculate} disabled={loading}
        className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-all">
        {loading ? 'Calculating...' : '🛡️ Analyze Emergency Fund'}
      </button>
      {result && (
        <div className="space-y-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            <ResultCard label="Target Amount" value={fmt(result.targetAmount)} icon={Target} />
            <ResultCard label="Current Coverage" value={`${result.coverageMonths} months`}
              color={result.status === 'adequate' ? 'green' : 'red'} icon={Shield} />
            <ResultCard label="Gap" value={result.gap > 0 ? fmt(result.gap) : '₹0 ✅'}
              color={result.gap > 0 ? 'red' : 'green'} icon={AlertTriangle} />
            <ResultCard label="Status" value={result.status.toUpperCase()}
              color={result.status === 'adequate' ? 'green' : 'amber'} icon={BadgeCheck} />
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">{result.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// § 8 — Wealth Projection Panel
// ============================================================================

function WealthProjection() {
  const [params, setParams] = useState({
    currentNetWorth: 1000000, monthlyIncome: 120000, monthlyExpenses: 60000,
    annualIncomeGrowth: 8, annualExpenseGrowth: 6, investmentReturn: 12, years: 20,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    setLoading(true);
    try {
      const res = await api.post('/planning/wealth-projection', {
        ...params,
        annualIncomeGrowth: params.annualIncomeGrowth / 100,
        annualExpenseGrowth: params.annualExpenseGrowth / 100,
        investmentReturn: params.investmentReturn / 100,
      });
      if (res.data?.success) setResult(res.data.data);
    } catch { /* noop */ }
    setLoading(false);
  };

  const fmt = v => '₹' + (v >= 10000000 ? (v / 10000000).toFixed(2) + ' Cr' :
    v >= 100000 ? (v / 100000).toFixed(2) + ' L' : v.toLocaleString('en-IN'));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <InputField label="Current Net Worth (₹)" value={params.currentNetWorth} onChange={v => setParams(p => ({ ...p, currentNetWorth: v }))} />
        <InputField label="Monthly Income (₹)" value={params.monthlyIncome} onChange={v => setParams(p => ({ ...p, monthlyIncome: v }))} />
        <InputField label="Monthly Expenses (₹)" value={params.monthlyExpenses} onChange={v => setParams(p => ({ ...p, monthlyExpenses: v }))} />
        <InputField label="Income Growth (%)" value={params.annualIncomeGrowth} onChange={v => setParams(p => ({ ...p, annualIncomeGrowth: v }))} suffix="%" />
        <InputField label="Expense Growth (%)" value={params.annualExpenseGrowth} onChange={v => setParams(p => ({ ...p, annualExpenseGrowth: v }))} suffix="%" />
        <InputField label="Investment Return (%)" value={params.investmentReturn} onChange={v => setParams(p => ({ ...p, investmentReturn: v }))} suffix="%" />
      </div>
      <InputField label="Projection Years" value={params.years} onChange={v => setParams(p => ({ ...p, years: v }))} />
      <button onClick={calculate} disabled={loading}
        className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-all">
        {loading ? 'Projecting...' : '📈 Project Wealth'}
      </button>
      {result && (
        <div className="space-y-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            <ResultCard label="Final Net Worth" value={fmt(result.finalNetWorth)} color="green" icon={TrendingUp} />
            <ResultCard label="Wealth Multiple" value={`${result.wealthMultiple}x`} color="purple" icon={ArrowUpRight} />
          </div>
          {result.financialIndependence && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                🎯 Financial Independence at year {result.financialIndependence.reachedInYear} ({result.financialIndependence.calendarYear})
              </p>
            </div>
          )}
          {result.milestones?.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Milestones</h4>
              {result.milestones.map(m => (
                <div key={m.target} className="flex justify-between text-xs py-1 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-600 dark:text-gray-400">{m.targetLabel}</span>
                  <span className="font-medium">Year {m.reachedInYear} ({m.calendarYear})</span>
                </div>
              ))}
            </div>
          )}
          {result.projections && (
            <FinancialAreaChart
              data={result.projections.filter((_, i) => i % 2 === 0 || i === result.projections.length - 1).map(p => ({
                name: `Y${p.year}`,
                netWorth: p.netWorth,
                savings: p.annualSavings,
              }))}
              areas={[
                { key: 'netWorth', name: 'Net Worth', color: '#14b8a6' },
              ]}
              height={200}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// § 9 — Main Page Component
// ============================================================================

export default function EnhancedFinancialPlanningV2() {
  const { mode, isDark, isBlack, theme } = useTheme();
  const dk = isDark || isBlack;
  const [activeCalc, setActiveCalc] = useState('sip');

  const renderCalculator = () => {
    switch (activeCalc) {
      case 'sip': return <SIPCalculator />;
      case 'retirement': return <RetirementCalculator />;
      case 'emi': return <EMICalculator />;
      case 'tax': return <TaxPlanner />;
      case 'emergency': return <EmergencyFundCalculator />;
      case 'wealth': return <WealthProjection />;
      default: return <SIPCalculator />;
    }
  };

  const activeConfig = CALCULATORS.find(c => c.id === activeCalc);

  return (
    <MainLayout>
      <div className="page-transition p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Calculator className="text-blue-500" size={28} />
            Financial Planning Suite
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Enterprise calculators for retirement, tax, investments, and wealth management
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calculator Selector */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
                Calculators
              </h3>
              <div className="space-y-1">
                {CALCULATORS.filter(c => ['sip', 'retirement', 'emi', 'tax', 'emergency', 'wealth'].includes(c.id)).map(calc => {
                  const Icon = calc.icon;
                  const isActive = activeCalc === calc.id;
                  return (
                    <button
                      key={calc.id}
                      onClick={() => setActiveCalc(calc.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                        transition-all ${isActive
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                      <Icon size={18} />
                      {calc.label}
                      {isActive && <ArrowRight size={14} className="ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Calculator Panel */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-6">
              <div className="flex items-center gap-3 mb-5">
                {activeConfig && <activeConfig.icon size={22} className="text-blue-500" />}
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {activeConfig?.label || 'Calculator'}
                </h2>
              </div>
              {renderCalculator()}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
