import React, { useState, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  Shield, Plus, TrendingUp, Calculator, Calendar, IndianRupee, X,
  ArrowUpRight, Clock, Target, BarChart3, PiggyBank, Award,
  ChevronDown, ChevronUp, Info, Lock, Unlock, FileText
} from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import MainLayout from '../components/MainLayout';
import api from '../services/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
const PPF_RATE = 7.1;
const PPF_MAX = 150000;
const PPF_MIN = 500;

const initialAccount = {
  balance: 685000,
  openingYear: 2018,
  maturityYear: 2033,
  totalContributed: 600000,
  interestEarned: 85000,
  loansTaken: 0,
  withdrawalsMade: 0,
};

const contributions = [
  { year: '2018-19', amount: 50000, interest: 3550, closing: 53550 },
  { year: '2019-20', amount: 80000, interest: 9472, closing: 143022 },
  { year: '2020-21', amount: 100000, interest: 17255, closing: 260277 },
  { year: '2021-22', amount: 100000, interest: 25580, closing: 385857 },
  { year: '2022-23', amount: 120000, interest: 35916, closing: 541773 },
  { year: '2023-24', amount: 80000, interest: 44146, closing: 665919 },
  { year: '2024-25', amount: 70000, interest: 52250, closing: 685000 },
];

const yearlyBarData = contributions.map(c => ({ year: c.year.split('-')[0], contribution: c.amount, interest: c.interest }));

function generateProjection(currentBalance, yearlyAmount, rate, startYear, endYear) {
  const data = [];
  let balance = currentBalance;
  for (let y = startYear; y <= endYear; y++) {
    balance = (balance + yearlyAmount) * (1 + rate / 100);
    data.push({ year: y.toString(), balance: Math.round(balance), contribution: yearlyAmount });
  }
  return data;
}

const comparisonData = [
  { instrument: 'PPF', returns: 7.1, lockIn: '15Y', taxBenefit: '80C + EEE', risk: 'Nil' },
  { instrument: 'ELSS', returns: 12.0, lockIn: '3Y', taxBenefit: '80C', risk: 'High' },
  { instrument: 'NPS', returns: 9.5, lockIn: 'Retirement', taxBenefit: '80CCD', risk: 'Medium' },
  { instrument: 'Tax Saver FD', returns: 7.0, lockIn: '5Y', taxBenefit: '80C', risk: 'Nil' },
  { instrument: 'NSC', returns: 7.7, lockIn: '5Y', taxBenefit: '80C', risk: 'Nil' },
];

const emptyForm = { amount: '', year: new Date().getFullYear().toString() };

export default function PPFTracker() {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  const [account, setAccount] = useState(initialAccount);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [projYears, setProjYears] = useState(20);
  const [projYearlyAmt, setProjYearlyAmt] = useState(100000);
  const [showCalc, setShowCalc] = useState(false);
  const [calcAmount, setCalcAmount] = useState(100000);
  const [contributionHistory, setContributionHistory] = useState(contributions);
  const [showExtension, setShowExtension] = useState(false);

  const yearsCompleted = new Date().getFullYear() - account.openingYear;
  const yearsRemaining = account.maturityYear - new Date().getFullYear();
  const section80cUsed = contributionHistory.length > 0 ? contributionHistory[contributionHistory.length - 1].amount : 0;
  const section80cRemaining = PPF_MAX - section80cUsed;

  const projectionData = useMemo(() => {
    return generateProjection(account.balance, projYearlyAmt, PPF_RATE, new Date().getFullYear(), new Date().getFullYear() + projYears);
  }, [account.balance, projYearlyAmt, projYears]);

  const optimalContribution = useMemo(() => {
    let opt = PPF_MAX;
    const earned = projectionData[projectionData.length - 1]?.balance || 0;
    return { amount: opt, projectedCorpus: earned };
  }, [projectionData]);

  const loanEligibility = yearsCompleted >= 3 && yearsCompleted <= 6;
  const withdrawalEligibility = yearsCompleted >= 7;
  const maxLoan = loanEligibility ? Math.round(account.balance * 0.25) : 0;
  const maxWithdrawal = withdrawalEligibility ? Math.round(account.balance * 0.5) : 0;

  const handleAddContribution = () => {
    if (!form.amount) return;
    const amt = Number(form.amount);
    if (amt < PPF_MIN || amt > PPF_MAX) return;
    const interest = Math.round((account.balance + amt) * PPF_RATE / 100);
    const newClosing = account.balance + amt + interest;
    setContributionHistory(prev => [...prev, { year: `${form.year}-${(Number(form.year) + 1).toString().slice(2)}`, amount: amt, interest, closing: newClosing }]);
    setAccount(prev => ({ ...prev, balance: newClosing, totalContributed: prev.totalContributed + amt, interestEarned: prev.interestEarned + interest }));
    setForm(emptyForm);
    setShowAddForm(false);
  };

  return (
    <MainLayout title="PPF Tracker">
    <div className={`min-h-screen ${dk ? 'bg-gray-900' : 'bg-gray-50'} p-4 md:p-6`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
            <Shield className="w-7 h-7 text-green-600" /> PPF Tracker
          </h1>
          <p className={`${dk ? 'text-gray-400' : 'text-gray-500'} text-sm mt-1`}>Public Provident Fund management and projections</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCalc(!showCalc)} className={`flex items-center gap-2 px-4 py-2 border ${dk ? `border-gray-600` : `border-gray-300`} ${dk ? 'text-gray-300' : 'text-gray-700'} rounded-lg ${dk ? `hover:bg-gray-700` : `hover:bg-gray-100`}`}>
            <Calculator className="w-4 h-4" /> Calculator
          </button>
          <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Plus className="w-4 h-4" /> Add Contribution
          </button>
        </div>
      </div>

      {/* Account Summary Card */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-xl p-6 mb-6 text-white">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-green-200 text-xs mb-1">Current Balance</p>
            <p className="text-2xl font-bold">₹{account.balance.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-green-200 text-xs mb-1">Interest Rate</p>
            <p className="text-2xl font-bold">{PPF_RATE}%</p>
          </div>
          <div>
            <p className="text-green-200 text-xs mb-1">Maturity Year</p>
            <p className="text-2xl font-bold">{account.maturityYear}</p>
            <p className="text-green-200 text-xs">{yearsRemaining}Y remaining</p>
          </div>
          <div>
            <p className="text-green-200 text-xs mb-1">Loans Available</p>
            <p className="text-2xl font-bold">{loanEligibility ? `₹${maxLoan.toLocaleString()}` : 'N/A'}</p>
            <p className="text-green-200 text-xs">{loanEligibility ? 'Eligible (Yr 3-6)' : yearsCompleted < 3 ? 'After year 3' : 'Expired'}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Contributed', value: `₹${account.totalContributed.toLocaleString()}`, icon: <PiggyBank className="w-5 h-5" />, color: `text-blue-600 ${dk ? 'bg-blue-900/40' : 'bg-blue-100'}` },
          { label: 'Interest Earned', value: `₹${account.interestEarned.toLocaleString()}`, icon: <TrendingUp className="w-5 h-5" />, color: `text-green-600 ${dk ? 'bg-green-900/40' : 'bg-green-100'}` },
          { label: '80C Remaining', value: `₹${section80cRemaining.toLocaleString()}`, icon: <Award className="w-5 h-5" />, color: `text-purple-600 ${dk ? 'bg-purple-900/40' : 'bg-purple-100'}` },
          { label: `Withdrawal Eligible`, value: withdrawalEligibility ? `₹${maxWithdrawal.toLocaleString()}` : `Not yet`, icon: withdrawalEligibility ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />, color: withdrawalEligibility ? `text-green-600 ${dk ? 'bg-green-900/40' : 'bg-green-100'}` : `text-red-600 ${dk ? `bg-red-900/40` : `bg-red-100`}` },
        ].map((c, i) => (
          <div key={i} className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 shadow-sm border ${dk ? 'border-gray-700' : 'border-gray-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${dk ? 'text-gray-400' : 'text-gray-500'}`}>{c.label}</span>
              <span className={`p-2 rounded-lg ${c.color}`}>{c.icon}</span>
            </div>
            <p className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Tax Savings Indicator */}
      <div className={`${dk ? 'bg-purple-900/20' : 'bg-purple-50'} border ${dk ? 'border-purple-800' : 'border-purple-200'} rounded-xl p-4 mb-6`}>
        <div className="flex items-center gap-2 mb-2">
          <Award className="w-5 h-5 text-purple-600" />
          <span className={`font-medium ${dk ? 'text-purple-200' : 'text-purple-800'}`}>Section 80C Tax Savings</span>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex-1 ${dk ? 'bg-purple-800' : 'bg-purple-200'} rounded-full h-3`}>
            <div className="bg-purple-600 h-3 rounded-full transition-all" style={{ width: `${Math.min((section80cUsed / PPF_MAX) * 100, 100)}%` }}></div>
          </div>
          <span className={`text-sm font-medium ${dk ? 'text-purple-300' : 'text-purple-700'}`}>₹{section80cUsed.toLocaleString()} / ₹{PPF_MAX.toLocaleString()}</span>
        </div>
        <p className={`text-xs ${dk ? 'text-purple-400' : 'text-purple-600'} mt-2`}>PPF enjoys EEE (Exempt-Exempt-Exempt) tax status — contributions, interest, and maturity are all tax-free.</p>
      </div>

      {/* Yearly Contribution BarChart */}
      <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 shadow-sm border ${dk ? 'border-gray-700' : 'border-gray-100'} mb-6`}>
        <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}><BarChart3 className="w-5 h-5 text-blue-500" /> Yearly Contributions</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={yearlyBarData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="year" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={v => `₹${Number(v).toLocaleString()}`} />
            <Legend />
            <Bar dataKey="contribution" name="Contribution" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="interest" name="Interest" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Growth Projection */}
      <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 shadow-sm border ${dk ? 'border-gray-700' : 'border-gray-100'} mb-6`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}><TrendingUp className="w-5 h-5 text-green-500" /> Growth Projection (15Y + Extensions)</h2>
          <div className="flex gap-2 items-center">
            <label className={`text-sm ${dk ? 'text-gray-400' : 'text-gray-500'}`}>Yearly:</label>
            <input type="number" value={projYearlyAmt} onChange={e => setProjYearlyAmt(Number(e.target.value))} className={`w-28 px-2 py-1 rounded border text-sm ${dk ? 'border-gray-600 bg-gray-700 text-white' : ''}`} />
            <label className={`text-sm ${dk ? 'text-gray-400' : 'text-gray-500'} ml-2`}>Years:</label>
            <select value={projYears} onChange={e => setProjYears(Number(e.target.value))} className={`px-2 py-1 rounded border text-sm ${dk ? 'border-gray-600 bg-gray-700 text-white' : ''}`}>
              <option value={10}>10</option><option value={15}>15</option><option value={20}>20 (Ext)</option><option value={25}>25 (Ext)</option><option value={30}>30 (Ext)</option>
            </select>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={projectionData}>
            <defs><linearGradient id="ppfGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="year" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
            <Tooltip formatter={v => `₹${Number(v).toLocaleString()}`} />
            <Area type="monotone" dataKey="balance" stroke="#10b981" fill="url(#ppfGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
        <div className={`mt-3 p-3 ${dk ? 'bg-green-900/20' : 'bg-green-50'} rounded-lg text-center`}>
          <span className={`text-sm ${dk ? 'text-gray-300' : 'text-gray-600'}`}>Projected Corpus in {projYears} years: </span>
          <span className="text-lg font-bold text-green-600">₹{(projectionData[projectionData.length - 1]?.balance || 0).toLocaleString()}</span>
        </div>
      </div>

      {/* Contribution History */}
      <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 shadow-sm border ${dk ? 'border-gray-700' : 'border-gray-100'} mb-6`}>
        <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}><FileText className="w-5 h-5 text-gray-500" /> Contribution History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className={`text-left ${dk ? 'text-gray-400' : 'text-gray-500'} ${dk ? 'border-gray-700' : 'border-b'}`}><th className="pb-2 pr-3">Year</th><th className="pb-2 pr-3">Contribution</th><th className="pb-2 pr-3">Interest</th><th className="pb-2">Closing Balance</th></tr></thead>
            <tbody>
              {contributionHistory.map((c, i) => (
                <tr key={i} className={`${dk ? 'border-gray-700' : 'border-b'}`}>
                  <td className={`py-2 pr-3 font-medium ${dk ? 'text-white' : 'text-gray-900'}`}>{c.year}</td>
                  <td className={`py-2 pr-3 ${dk ? 'text-gray-300' : 'text-gray-700'}`}>₹{c.amount.toLocaleString()}</td>
                  <td className="py-2 pr-3 text-green-600">₹{c.interest.toLocaleString()}</td>
                  <td className={`py-2 font-medium ${dk ? 'text-white' : 'text-gray-900'}`}>₹{c.closing.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Withdrawal/Loan & Optimal Contribution Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 shadow-sm border ${dk ? 'border-gray-700' : 'border-gray-100'}`}>
          <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}><Lock className="w-5 h-5 text-red-500" /> Withdrawal & Loan Eligibility</h2>
          <div className="space-y-3">
            <div className={`p-3 rounded-lg ${loanEligibility ? `${dk ? 'bg-green-900/20' : 'bg-green-50'}` : `${dk ? 'bg-gray-700/50' : 'bg-gray-50'}`}`}>
              <div className="flex justify-between"><span className={`text-sm ${dk ? 'text-gray-300' : 'text-gray-700'}`}>Loan (Year 3-6)</span><span className={`font-medium ${loanEligibility ? 'text-green-600' : 'text-gray-400'}`}>{loanEligibility ? `Eligible — Max ₹${maxLoan.toLocaleString()}` : 'Not eligible'}</span></div>
              <p className="text-xs text-gray-500 mt-1">Max 25% of balance at end of 2nd preceding year. Rate: PPF+1%</p>
            </div>
            <div className={`p-3 rounded-lg ${withdrawalEligibility ? `${dk ? 'bg-green-900/20' : 'bg-green-50'}` : `${dk ? 'bg-gray-700/50' : 'bg-gray-50'}`}`}>
              <div className="flex justify-between"><span className={`text-sm ${dk ? 'text-gray-300' : 'text-gray-700'}`}>Partial Withdrawal (After Year 7)</span><span className={`font-medium ${withdrawalEligibility ? 'text-green-600' : 'text-gray-400'}`}>{withdrawalEligibility ? `Eligible — Max ₹${maxWithdrawal.toLocaleString()}` : `After ${7 - yearsCompleted} more years`}</span></div>
              <p className="text-xs text-gray-500 mt-1">Max 50% of balance at end of 4th preceding year or previous year, whichever is lower.</p>
            </div>
          </div>
        </div>

        <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 shadow-sm border ${dk ? 'border-gray-700' : 'border-gray-100'}`}>
          <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}><Target className="w-5 h-5 text-blue-500" /> Optimal Contribution</h2>
          <div className={`p-4 ${dk ? 'bg-blue-900/20' : 'bg-blue-50'} rounded-lg mb-3`}>
            <p className={`text-sm ${dk ? 'text-gray-300' : 'text-gray-600'}`}>To maximize 80C benefits, invest the full ₹1,50,000/year</p>
            <p className="text-xl font-bold text-blue-600 mt-1">₹{optimalContribution.projectedCorpus.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Projected corpus with ₹{PPF_MAX.toLocaleString()}/yr for {projYears} years</p>
          </div>
          <p className={`text-xs ${dk ? 'text-gray-400' : 'text-gray-500'}`}>Best to invest between April 1-5 each year to maximize interest (calculated on lowest balance between 5th and end of month).</p>
        </div>
      </div>

      {/* Extension Options */}
      <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 shadow-sm border ${dk ? 'border-gray-700' : 'border-gray-100'} mb-6`}>
        <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}><Clock className="w-5 h-5" /> Extension After Maturity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 ${dk ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg`}>
            <h3 className={`font-medium ${dk ? 'text-white' : 'text-gray-900'} mb-2`}>Option 1: No Contribution</h3>
            <p className={`text-sm ${dk ? 'text-gray-300' : 'text-gray-600'}`}>Extend in blocks of 5 years without depositing. Balance earns interest at prevailing rate. Full withdrawal allowed once per year.</p>
          </div>
          <div className={`p-4 ${dk ? 'bg-green-900/20' : 'bg-green-50'} rounded-lg`}>
            <h3 className={`font-medium ${dk ? 'text-green-300' : 'text-green-800'} mb-2`}>Option 2: With Contribution</h3>
            <p className={`text-sm ${dk ? 'text-gray-300' : 'text-gray-600'}`}>Extend in blocks of 5 years with annual contributions (max ₹1.5L). Partial withdrawal up to 60% of existing balance allowed. Form H must be submitted within 1 year of maturity.</p>
          </div>
        </div>
      </div>

      {/* PPF vs Other Tax-Saving Instruments */}
      <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 shadow-sm border ${dk ? 'border-gray-700' : 'border-gray-100'} mb-6`}>
        <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>PPF vs Other Tax-Saving Instruments</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className={`text-left ${dk ? 'text-gray-400 border-gray-700' : 'text-gray-500 border-b'}`}><th className="pb-2 pr-3">Instrument</th><th className="pb-2 pr-3">Returns (%)</th><th className="pb-2 pr-3">Lock-in</th><th className="pb-2 pr-3">Tax Benefit</th><th className="pb-2">Risk</th></tr></thead>
            <tbody>
              {comparisonData.map(c => (
                <tr key={c.instrument} className={`${dk ? 'border-gray-700' : 'border-b'} ${c.instrument === 'PPF' ? `${dk ? 'bg-green-900/20' : 'bg-green-50'}` : ''}`}>
                  <td className={`py-2 pr-3 font-medium ${dk ? 'text-white' : 'text-gray-900'}`}>{c.instrument}</td>
                  <td className={`py-2 pr-3 ${dk ? 'text-gray-300' : 'text-gray-700'}`}>{c.returns}%</td>
                  <td className={`py-2 pr-3 ${dk ? 'text-gray-300' : 'text-gray-700'}`}>{c.lockIn}</td>
                  <td className={`py-2 pr-3 ${dk ? 'text-gray-300' : 'text-gray-700'}`}>{c.taxBenefit}</td>
                  <td className="py-2"><span className={`text-xs px-2 py-1 rounded-full ${c.risk === `Nil` ? `bg-green-100 ${dk ? 'bg-green-900/30` : `text-green-700`}` : c.risk === `High` ? `bg-red-100 ${dk ? `bg-red-900/30' : 'text-red-700'}` : `bg-yellow-100 ${dk ? `bg-yellow-900/30` : `text-yellow-700`}`}`}>{c.risk}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Optimal Contribution Calculator */}
      {showCalc && (
        <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 shadow-sm border ${dk ? 'border-gray-700' : 'border-gray-100'} mb-6`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}><Calculator className="w-5 h-5 text-blue-500" /> PPF Calculator</h2>
            <button onClick={() => setShowCalc(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className={`block text-sm font-medium ${dk ? `text-gray-300` : `text-gray-700`} mb-1`}>Yearly Amount (₹)</label><input type="number" value={calcAmount} onChange={e => setCalcAmount(Number(e.target.value))} className={`w-full px-3 py-2 rounded-lg ${dk ? 'border-gray-600' : 'border'} ${dk ? `text-white` : `${dk ? `bg-gray-700` : ''}`}`} /></div>
            <div className={`${dk ? 'bg-green-900/20' : 'bg-green-50'} rounded-lg p-3`}>
              <p className={`text-xs ${dk ? 'text-gray-400' : 'text-gray-500'}`}>15-Year Corpus (@ {PPF_RATE}%)</p>
              <p className="text-xl font-bold text-green-600">₹{Math.round(calcAmount * ((Math.pow(1 + PPF_RATE / 100, 15) - 1) / (PPF_RATE / 100)) * (1 + PPF_RATE / 100)).toLocaleString()}</p>
            </div>
            <div className={`${dk ? 'bg-blue-900/20' : 'bg-blue-50'} rounded-lg p-3`}>
              <p className={`text-xs ${dk ? 'text-gray-400' : 'text-gray-500'}`}>25-Year Corpus (with extension)</p>
              <p className="text-xl font-bold text-blue-600">₹{Math.round(calcAmount * ((Math.pow(1 + PPF_RATE / 100, 25) - 1) / (PPF_RATE / 100)) * (1 + PPF_RATE / 100)).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Contribution Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 w-full max-w-sm shadow-xl`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>Add Yearly Contribution</h2>
              <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className={`block text-sm font-medium ${dk ? `text-gray-300` : `text-gray-700`} mb-1`}>Financial Year</label><input value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} className={`w-full px-3 py-2 rounded-lg ${dk ? 'border-gray-600' : 'border'} ${dk ? `text-white` : `${dk ? `bg-gray-700` : ''}`}`} /></div>
              <div><label className={`block text-sm font-medium ${dk ? `text-gray-300` : `text-gray-700`} mb-1`}>Amount (₹{PPF_MIN} - ₹{PPF_MAX.toLocaleString()})</label><input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} min={PPF_MIN} max={PPF_MAX} className={`w-full px-3 py-2 rounded-lg ${dk ? 'border-gray-600' : 'border'} ${dk ? `text-white` : `${dk ? `bg-gray-700` : ''}`}`} /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAddForm(false)} className={`flex-1 py-2 border ${dk ? 'border-gray-600' : 'border-gray-300'} rounded-lg ${dk ? 'text-gray-300' : 'text-gray-700'}`}>Cancel</button>
              <button onClick={handleAddContribution} className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </MainLayout>
  );
}
