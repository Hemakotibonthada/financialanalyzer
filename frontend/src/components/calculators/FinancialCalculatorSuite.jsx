import React, { useState, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
  Calculator, TrendingUp, Home, Car, GraduationCap, Baby, Wallet,
  Target, Clock, Percent, DollarSign, Calendar, ArrowRight, RefreshCw,
  ChevronRight, X, BarChart3, PieChart, Shield, Landmark, Building2,
  CreditCard, Banknote, Scale, Briefcase, Heart, Star
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
//  FINANCIAL CALCULATOR SUITE - Comprehensive Financial Calculator Collection
// ═══════════════════════════════════════════════════════════════════════════════

const formatCurrency = (amount) => {
  if (!amount || isNaN(amount)) return '₹0';
  const abs = Math.abs(amount);
  if (abs >= 10000000) return `₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `₹${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `₹${(abs / 1000).toFixed(1)}K`;
  return `₹${abs.toLocaleString('en-IN')}`;
};

// ─── SIP Calculator ──────────────────────────────────────────────────────────

export const SIPCalculator = ({ palette }) => {
  const [amount, setAmount] = useState(10000);
  const [years, setYears] = useState(15);
  const [rate, setRate] = useState(12);
  const [stepUp, setStepUp] = useState(0);

  const result = useMemo(() => {
    let totalInvested = 0;
    let currentSIP = amount;
    let corpusValue = 0;
    const monthlyRate = rate / 12 / 100;

    for (let year = 0; year < years; year++) {
      for (let month = 0; month < 12; month++) {
        totalInvested += currentSIP;
        corpusValue = (corpusValue + currentSIP) * (1 + monthlyRate);
      }
      currentSIP = currentSIP * (1 + stepUp / 100);
    }

    return {
      totalInvested: Math.round(totalInvested),
      corpusValue: Math.round(corpusValue),
      wealthGained: Math.round(corpusValue - totalInvested),
      absoluteReturn: totalInvested > 0 ? ((corpusValue - totalInvested) / totalInvested * 100) : 0
    };
  }, [amount, years, rate, stepUp]);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className={palette?.textSub || 'text-gray-600'}>Monthly SIP: {formatCurrency(amount)}</span>
        </div>
        <input type="range" min="500" max="500000" step="500" value={amount} onChange={e => setAmount(parseInt(e.target.value))} className="w-full accent-blue-500" />
      </div>
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className={palette?.textSub || 'text-gray-600'}>Duration: {years} years</span>
        </div>
        <input type="range" min="1" max="40" value={years} onChange={e => setYears(parseInt(e.target.value))} className="w-full accent-blue-500" />
      </div>
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className={palette?.textSub || 'text-gray-600'}>Expected Return: {rate}%</span>
        </div>
        <input type="range" min="1" max="30" value={rate} onChange={e => setRate(parseInt(e.target.value))} className="w-full accent-emerald-500" />
      </div>
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className={palette?.textSub || 'text-gray-600'}>Annual Step-up: {stepUp}%</span>
        </div>
        <input type="range" min="0" max="25" value={stepUp} onChange={e => setStepUp(parseInt(e.target.value))} className="w-full accent-purple-500" />
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
        <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
          <p className="text-xs text-blue-600 dark:text-blue-400">Invested</p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(result.totalInvested)}</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
          <p className="text-xs text-emerald-600 dark:text-emerald-400">Returns</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(result.wealthGained)}</p>
        </div>
        <div className="col-span-2 text-center p-4 rounded-xl bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-900/20 dark:to-emerald-900/20">
          <p className="text-xs text-gray-600 dark:text-gray-400">Total Corpus</p>
          <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600">{formatCurrency(result.corpusValue)}</p>
          <p className="text-xs text-gray-500 mt-1">{result.absoluteReturn.toFixed(0)}% absolute returns</p>
        </div>
      </div>

      {/* Visual */}
      <div className="flex h-6 rounded-full overflow-hidden">
        <div className="bg-blue-500 transition-all" style={{ width: `${(result.totalInvested / result.corpusValue) * 100}%` }} />
        <div className="bg-emerald-500 transition-all" style={{ width: `${(result.wealthGained / result.corpusValue) * 100}%` }} />
      </div>
    </div>
  );
};

// ─── EMI Calculator ──────────────────────────────────────────────────────────

export const EMICalculator = ({ palette }) => {
  const [principal, setPrincipal] = useState(5000000);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(20);
  const [prepayment, setPrepayment] = useState(0);

  const result = useMemo(() => {
    const monthlyRate = rate / 12 / 100;
    const months = tenure * 12;
    const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
    const totalPayment = emi * months;
    const totalInterest = totalPayment - principal;

    // With prepayment
    let remainingPrincipal = principal;
    let totalInterestWithPrepay = 0;
    let monthsWithPrepay = 0;
    const emiFixed = emi;

    while (remainingPrincipal > 0 && monthsWithPrepay < months * 2) {
      const interestForMonth = remainingPrincipal * monthlyRate;
      const principalForMonth = Math.min(emiFixed - interestForMonth + (prepayment / 12), remainingPrincipal);
      totalInterestWithPrepay += interestForMonth;
      remainingPrincipal -= principalForMonth;
      monthsWithPrepay++;
      if (remainingPrincipal <= 0) break;
    }

    // Amortization schedule (simplified - first 12 months)
    const schedule = [];
    let bal = principal;
    for (let m = 1; m <= Math.min(12, months); m++) {
      const interest = bal * monthlyRate;
      const principalPart = emi - interest;
      bal -= principalPart;
      schedule.push({ month: m, emi: Math.round(emi), principal: Math.round(principalPart), interest: Math.round(interest), balance: Math.round(Math.max(0, bal)) });
    }

    return {
      emi: Math.round(emi),
      totalPayment: Math.round(totalPayment),
      totalInterest: Math.round(totalInterest),
      interestSavedByPrepay: prepayment > 0 ? Math.round(totalInterest - totalInterestWithPrepay) : 0,
      monthsSavedByPrepay: prepayment > 0 ? months - monthsWithPrepay : 0,
      schedule
    };
  }, [principal, rate, tenure, prepayment]);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className={palette?.textSub || 'text-gray-600'}>Loan Amount: {formatCurrency(principal)}</span>
        </div>
        <input type="range" min="100000" max="100000000" step="100000" value={principal} onChange={e => setPrincipal(parseInt(e.target.value))} className="w-full accent-blue-500" />
      </div>
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className={palette?.textSub || 'text-gray-600'}>Interest Rate: {rate}%</span>
        </div>
        <input type="range" min="4" max="20" step="0.1" value={rate} onChange={e => setRate(parseFloat(e.target.value))} className="w-full accent-red-500" />
      </div>
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className={palette?.textSub || 'text-gray-600'}>Tenure: {tenure} years</span>
        </div>
        <input type="range" min="1" max="30" value={tenure} onChange={e => setTenure(parseInt(e.target.value))} className="w-full accent-amber-500" />
      </div>
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className={palette?.textSub || 'text-gray-600'}>Annual Prepayment: {formatCurrency(prepayment)}</span>
        </div>
        <input type="range" min="0" max="1000000" step="10000" value={prepayment} onChange={e => setPrepayment(parseInt(e.target.value))} className="w-full accent-emerald-500" />
      </div>

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
        <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
          <p className="text-xs text-blue-600 dark:text-blue-400">Monthly EMI</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(result.emi)}</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-red-50 dark:bg-red-900/20">
          <p className="text-xs text-red-600 dark:text-red-400">Total Interest</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(result.totalInterest)}</p>
        </div>
        {prepayment > 0 && (
          <>
            <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Interest Saved</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(result.interestSavedByPrepay)}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
              <p className="text-xs text-amber-600 dark:text-amber-400">Months Saved</p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{result.monthsSavedByPrepay}</p>
            </div>
          </>
        )}
      </div>

      {/* Pie chart representation */}
      <div className="flex h-5 rounded-full overflow-hidden">
        <div className="bg-blue-500" style={{ width: `${(principal / result.totalPayment) * 100}%` }} />
        <div className="bg-red-400" style={{ width: `${(result.totalInterest / result.totalPayment) * 100}%` }} />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Principal: {((principal / result.totalPayment) * 100).toFixed(0)}%</span>
        <span>Interest: {((result.totalInterest / result.totalPayment) * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
};

// ─── Retirement Calculator ───────────────────────────────────────────────────

export const RetirementCalculator = ({ palette }) => {
  const [currentAge, setCurrentAge] = useState(30);
  const [retireAge, setRetireAge] = useState(55);
  const [lifeExpectancy, setLifeExpectancy] = useState(85);
  const [monthlyExpenses, setMonthlyExpenses] = useState(50000);
  const [currentSavings, setCurrentSavings] = useState(500000);
  const [preRetReturn, setPreRetReturn] = useState(12);
  const [postRetReturn, setPostRetReturn] = useState(8);
  const [inflation, setInflation] = useState(6);

  const result = useMemo(() => {
    const yearsToRetire = retireAge - currentAge;
    const yearsInRetirement = lifeExpectancy - retireAge;
    
    // Expenses at retirement (inflation adjusted)
    const monthlyExpensesAtRetirement = monthlyExpenses * Math.pow(1 + inflation / 100, yearsToRetire);
    const annualExpensesAtRetirement = monthlyExpensesAtRetirement * 12;

    // Corpus needed at retirement (present value of annuity considering post-retirement real return)
    const realPostRetReturn = (postRetReturn - inflation) / 100;
    let corpusNeeded;
    if (Math.abs(realPostRetReturn) < 0.001) {
      corpusNeeded = annualExpensesAtRetirement * yearsInRetirement;
    } else {
      corpusNeeded = annualExpensesAtRetirement * (1 - Math.pow(1 + realPostRetReturn, -yearsInRetirement)) / realPostRetReturn;
    }

    // Monthly SIP needed
    const monthlyRate = preRetReturn / 12 / 100;
    const months = yearsToRetire * 12;
    const fvCurrentSavings = currentSavings * Math.pow(1 + monthlyRate, months);
    const remaining = Math.max(0, corpusNeeded - fvCurrentSavings);
    const monthlySIPNeeded = months > 0 && monthlyRate > 0
      ? remaining / ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate * (1 + monthlyRate))
      : remaining / Math.max(1, months);

    // Current savings adequacy
    const adequacyPercent = corpusNeeded > 0 ? ((currentSavings * Math.pow(1 + preRetReturn / 100, yearsToRetire)) / corpusNeeded) * 100 : 0;

    return {
      corpusNeeded: Math.round(corpusNeeded),
      monthlyExpensesAtRetirement: Math.round(monthlyExpensesAtRetirement),
      annualExpensesAtRetirement: Math.round(annualExpensesAtRetirement),
      monthlySIPNeeded: Math.round(monthlySIPNeeded),
      fvCurrentSavings: Math.round(fvCurrentSavings),
      shortfall: Math.round(remaining),
      adequacyPercent: Math.min(100, adequacyPercent),
      yearsToRetire,
      yearsInRetirement
    };
  }, [currentAge, retireAge, lifeExpectancy, monthlyExpenses, currentSavings, preRetReturn, postRetReturn, inflation]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">Current Age: {currentAge}</label>
          <input type="range" min="18" max="60" value={currentAge} onChange={e => setCurrentAge(parseInt(e.target.value))} className="w-full accent-blue-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Retire at: {retireAge}</label>
          <input type="range" min={currentAge + 1} max="70" value={retireAge} onChange={e => setRetireAge(parseInt(e.target.value))} className="w-full accent-blue-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Monthly Expenses: {formatCurrency(monthlyExpenses)}</label>
          <input type="range" min="10000" max="500000" step="5000" value={monthlyExpenses} onChange={e => setMonthlyExpenses(parseInt(e.target.value))} className="w-full accent-amber-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Current Savings: {formatCurrency(currentSavings)}</label>
          <input type="range" min="0" max="50000000" step="100000" value={currentSavings} onChange={e => setCurrentSavings(parseInt(e.target.value))} className="w-full accent-emerald-500" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-slate-700">
        <div className="text-center p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
          <p className="text-xs text-indigo-600 dark:text-indigo-400">Corpus Needed</p>
          <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(result.corpusNeeded)}</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
          <p className="text-xs text-blue-600 dark:text-blue-400">Monthly SIP Needed</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(result.monthlySIPNeeded)}</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
          <p className="text-xs text-amber-600 dark:text-amber-400">Monthly at Retirement</p>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{formatCurrency(result.monthlyExpensesAtRetirement)}</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
          <p className="text-xs text-emerald-600 dark:text-emerald-400">Readiness</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{result.adequacyPercent.toFixed(0)}%</p>
        </div>
      </div>

      {/* Readiness bar */}
      <div>
        <div className="w-full h-3 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${result.adequacyPercent >= 80 ? 'bg-emerald-500' : result.adequacyPercent >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${result.adequacyPercent}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{result.yearsToRetire} years to retirement</span>
          <span>{result.yearsInRetirement} years in retirement</span>
        </div>
      </div>
    </div>
  );
};

// ─── Goal Planner Calculator ─────────────────────────────────────────────────

export const GoalPlannerCalculator = ({ palette }) => {
  const [goalAmount, setGoalAmount] = useState(2000000);
  const [currentSavings, setCurrentSavings] = useState(100000);
  const [years, setYears] = useState(5);
  const [expectedReturn, setExpectedReturn] = useState(12);
  const [inflation, setInflation] = useState(6);

  const result = useMemo(() => {
    const inflationAdjusted = goalAmount * Math.pow(1 + inflation / 100, years);
    const monthlyRate = expectedReturn / 12 / 100;
    const months = years * 12;
    const fvCurrentSavings = currentSavings * Math.pow(1 + monthlyRate, months);
    const remaining = Math.max(0, inflationAdjusted - fvCurrentSavings);
    const monthlySIP = months > 0 && monthlyRate > 0
      ? remaining / ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate * (1 + monthlyRate))
      : remaining / Math.max(1, months);
    const progress = inflationAdjusted > 0 ? (fvCurrentSavings / inflationAdjusted) * 100 : 0;

    return {
      inflationAdjusted: Math.round(inflationAdjusted),
      monthlySIP: Math.round(monthlySIP),
      fvCurrentSavings: Math.round(fvCurrentSavings),
      remaining: Math.round(remaining),
      progress: Math.min(100, progress)
    };
  }, [goalAmount, currentSavings, years, expectedReturn, inflation]);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className={palette?.textSub || 'text-gray-600'}>Goal Amount: {formatCurrency(goalAmount)}</span>
        </div>
        <input type="range" min="50000" max="100000000" step="50000" value={goalAmount} onChange={e => setGoalAmount(parseInt(e.target.value))} className="w-full accent-blue-500" />
      </div>
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className={palette?.textSub || 'text-gray-600'}>Current Savings: {formatCurrency(currentSavings)}</span>
        </div>
        <input type="range" min="0" max="50000000" step="10000" value={currentSavings} onChange={e => setCurrentSavings(parseInt(e.target.value))} className="w-full accent-emerald-500" />
      </div>
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className={palette?.textSub || 'text-gray-600'}>Time: {years} years</span>
        </div>
        <input type="range" min="1" max="30" value={years} onChange={e => setYears(parseInt(e.target.value))} className="w-full accent-amber-500" />
      </div>

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
        <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
          <p className="text-xs text-blue-600 dark:text-blue-400">Inflation Adjusted Goal</p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(result.inflationAdjusted)}</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
          <p className="text-xs text-emerald-600 dark:text-emerald-400">Monthly SIP Needed</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(result.monthlySIP)}</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Current progress</span>
          <span>{result.progress.toFixed(0)}%</span>
        </div>
        <div className="w-full h-3 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700" style={{ width: `${result.progress}%` }} />
        </div>
      </div>
    </div>
  );
};

// ─── FD Calculator ───────────────────────────────────────────────────────────

export const FDCalculator = ({ palette }) => {
  const [principal, setPrincipal] = useState(500000);
  const [rate, setRate] = useState(7.5);
  const [tenure, setTenure] = useState(3);
  const [compound, setCompound] = useState('quarterly');

  const result = useMemo(() => {
    const compoundFreq = { monthly: 12, quarterly: 4, halfyearly: 2, yearly: 1 };
    const n = compoundFreq[compound] || 4;
    const maturityValue = principal * Math.pow(1 + (rate / 100) / n, n * tenure);
    const totalInterest = maturityValue - principal;
    const effectiveRate = (Math.pow(1 + (rate / 100) / n, n) - 1) * 100;

    return {
      maturityValue: Math.round(maturityValue),
      totalInterest: Math.round(totalInterest),
      effectiveRate
    };
  }, [principal, rate, tenure, compound]);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className={palette?.textSub || 'text-gray-600'}>Principal: {formatCurrency(principal)}</span>
        </div>
        <input type="range" min="10000" max="50000000" step="10000" value={principal} onChange={e => setPrincipal(parseInt(e.target.value))} className="w-full accent-blue-500" />
      </div>
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className={palette?.textSub || 'text-gray-600'}>Interest Rate: {rate}%</span>
        </div>
        <input type="range" min="3" max="12" step="0.1" value={rate} onChange={e => setRate(parseFloat(e.target.value))} className="w-full accent-emerald-500" />
      </div>
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className={palette?.textSub || 'text-gray-600'}>Tenure: {tenure} years</span>
        </div>
        <input type="range" min="1" max="10" value={tenure} onChange={e => setTenure(parseInt(e.target.value))} className="w-full accent-amber-500" />
      </div>
      <div>
        <label className="text-sm text-gray-500">Compounding</label>
        <div className="flex gap-2 mt-1">
          {['monthly', 'quarterly', 'halfyearly', 'yearly'].map(opt => (
            <button key={opt} onClick={() => setCompound(opt)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${compound === opt ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'}`}>
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
        <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
          <p className="text-xs text-blue-600 dark:text-blue-400">Principal</p>
          <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatCurrency(principal)}</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
          <p className="text-xs text-emerald-600 dark:text-emerald-400">Interest</p>
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(result.totalInterest)}</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
          <p className="text-xs text-amber-600 dark:text-amber-400">Maturity</p>
          <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{formatCurrency(result.maturityValue)}</p>
        </div>
      </div>
    </div>
  );
};

// ─── PPF Calculator ──────────────────────────────────────────────────────────

export const PPFCalculator = ({ palette }) => {
  const [yearlyDeposit, setYearlyDeposit] = useState(150000);
  const [rate, setRate] = useState(7.1);
  const [existingBalance, setExistingBalance] = useState(0);
  const [yearsCompleted, setYearsCompleted] = useState(0);

  const result = useMemo(() => {
    const totalYears = 15;
    const remainingYears = totalYears - yearsCompleted;
    let balance = existingBalance;
    let totalDeposited = existingBalance;

    for (let y = 0; y < remainingYears; y++) {
      balance += yearlyDeposit;
      totalDeposited += yearlyDeposit;
      balance *= (1 + rate / 100);
    }

    return {
      maturityValue: Math.round(balance),
      totalDeposited: Math.round(totalDeposited),
      totalInterest: Math.round(balance - totalDeposited),
      remainingYears,
      taxSaved: Math.round(Math.min(yearlyDeposit, 150000) * 0.3) // 30% tax bracket
    };
  }, [yearlyDeposit, rate, existingBalance, yearsCompleted]);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className={palette?.textSub || 'text-gray-600'}>Yearly Deposit: {formatCurrency(yearlyDeposit)}</span>
        </div>
        <input type="range" min="500" max="150000" step="500" value={yearlyDeposit} onChange={e => setYearlyDeposit(parseInt(e.target.value))} className="w-full accent-blue-500" />
      </div>
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className={palette?.textSub || 'text-gray-600'}>PPF Rate: {rate}%</span>
        </div>
        <input type="range" min="6" max="9" step="0.1" value={rate} onChange={e => setRate(parseFloat(e.target.value))} className="w-full accent-emerald-500" />
      </div>
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className={palette?.textSub || 'text-gray-600'}>Existing Balance: {formatCurrency(existingBalance)}</span>
        </div>
        <input type="range" min="0" max="5000000" step="10000" value={existingBalance} onChange={e => setExistingBalance(parseInt(e.target.value))} className="w-full accent-amber-500" />
      </div>

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
        <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
          <p className="text-xs text-blue-600 dark:text-blue-400">Maturity Value</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(result.maturityValue)}</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
          <p className="text-xs text-emerald-600 dark:text-emerald-400">Total Interest</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(result.totalInterest)}</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
          <p className="text-xs text-amber-600 dark:text-amber-400">Tax Saved/Year</p>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{formatCurrency(result.taxSaved)}</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20">
          <p className="text-xs text-purple-600 dark:text-purple-400">Years Left</p>
          <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{result.remainingYears}</p>
        </div>
      </div>
    </div>
  );
};

// ─── Main Calculator Suite Component ─────────────────────────────────────────

const CALCULATORS = [
  { id: 'sip', label: 'SIP Calculator', icon: TrendingUp, color: 'blue', Component: SIPCalculator },
  { id: 'emi', label: 'EMI Calculator', icon: Home, color: 'amber', Component: EMICalculator },
  { id: 'retirement', label: 'Retirement', icon: Landmark, color: 'indigo', Component: RetirementCalculator },
  { id: 'goal', label: 'Goal Planner', icon: Target, color: 'emerald', Component: GoalPlannerCalculator },
  { id: 'fd', label: 'FD Calculator', icon: Shield, color: 'teal', Component: FDCalculator },
  { id: 'ppf', label: 'PPF Calculator', icon: Lock, color: 'purple', Component: PPFCalculator }
];

const FinancialCalculatorSuite = () => {
  const { mode } = useTheme();
  const isDark = mode === 'dark' || mode === 'black';
  const isBlack = mode === 'black';
  const palette = useMemo(() => ({
    bg: isBlack ? 'bg-black' : isDark ? 'bg-slate-950' : 'bg-gray-50',
    card: isBlack ? 'bg-zinc-900 border-zinc-800' : isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200',
    text: isBlack ? 'text-zinc-100' : isDark ? 'text-slate-100' : 'text-gray-900',
    textSub: isBlack ? 'text-zinc-400' : isDark ? 'text-slate-400' : 'text-gray-600',
    textMuted: isBlack ? 'text-zinc-500' : isDark ? 'text-slate-500' : 'text-gray-500',
    btnBg: isBlack ? 'bg-zinc-800 hover:bg-zinc-700' : isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-gray-50',
    btnBorder: isBlack ? 'border-zinc-700' : isDark ? 'border-slate-600' : 'border-gray-300',
  }), [isDark, isBlack]);

  const [activeCalc, setActiveCalc] = useState('sip');
  const ActiveComponent = CALCULATORS.find(c => c.id === activeCalc)?.Component || SIPCalculator;

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-6">
        <Calculator className="w-5 h-5 text-blue-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>Financial Calculators</h3>
      </div>

      {/* Calculator Selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CALCULATORS.map(calc => {
          const CalcIcon = calc.icon;
          return (
            <button key={calc.id} onClick={() => setActiveCalc(calc.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeCalc === calc.id ? `bg-${calc.color}-500 text-white` : `${palette.textSub} border ${palette.btnBorder}`}`}>
              <CalcIcon className="w-3.5 h-3.5" />{calc.label}
            </button>
          );
        })}
      </div>

      {/* Active Calculator */}
      <ActiveComponent palette={palette} />
    </div>
  );
};

export default FinancialCalculatorSuite;
