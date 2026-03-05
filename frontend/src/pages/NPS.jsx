import React, { useState, useMemo, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  Landmark, Plus, TrendingUp, Calculator, IndianRupee, X, RefreshCw,
  ArrowUpRight, Clock, BarChart3, Users, Shield, PieChart as PieIcon,
  ChevronDown, Target, Calendar, AlertTriangle, Info, Unlock, Lock
} from 'lucide-react';
import {
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import MainLayout from '../components/MainLayout';
import api from '../services/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

const ASSET_CLASSES = [
  { key: 'E', label: 'Equity (E)', color: '#3b82f6', maxTier1: 75, description: 'Equity & related instruments' },
  { key: 'C', label: 'Corporate Debt (C)', color: '#10b981', maxTier1: 100, description: 'Corporate bonds & debentures' },
  { key: 'G', label: 'Government Bonds (G)', color: '#f59e0b', maxTier1: 100, description: 'Government securities' },
  { key: 'A', label: 'Alternative (A)', color: '#8b5cf6', maxTier1: 5, description: 'REITs, InvITs, AIF' },
];

// Fund manager reference data (public NPS data — not user-specific)
const fundManagers = [
  { name: 'SBI Pension Funds', tier1NAV: 0, tier2NAV: 0, returns1Y: 0, returns3Y: 0 },
  { name: 'LIC Pension Fund', tier1NAV: 0, tier2NAV: 0, returns1Y: 0, returns3Y: 0 },
  { name: 'UTI Retirement Solutions', tier1NAV: 0, tier2NAV: 0, returns1Y: 0, returns3Y: 0 },
  { name: 'HDFC Pension Mgmt', tier1NAV: 0, tier2NAV: 0, returns1Y: 0, returns3Y: 0 },
  { name: 'ICICI Pru Pension Fund', tier1NAV: 0, tier2NAV: 0, returns1Y: 0, returns3Y: 0 },
  { name: 'Kotak Pension Fund', tier1NAV: 0, tier2NAV: 0, returns1Y: 0, returns3Y: 0 },
  { name: 'Aditya Birla SL Pension', tier1NAV: 0, tier2NAV: 0, returns1Y: 0, returns3Y: 0 },
];

// Empty default — no dummy data
const emptyAccount = {
  pran: '',
  fundManager: '',
  tier1Balance: 0,
  tier2Balance: 0,
  tier1Allocation: { E: 50, C: 30, G: 15, A: 5 },
  tier2Allocation: { E: 40, C: 35, G: 25, A: 0 },
  monthlyContribution: 0,
  employerContribution: 0,
  dob: '1990-01-01',
};

// NAV history and contributions fetched from API — no hardcoded data

export default function NPS() {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  const [account, setAccount] = useState(emptyAccount);
  const [navHistory, setNavHistory] = useState([]);
  const [monthlyContributions, setMonthlyContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCalc, setShowCalc] = useState(false);
  const [calcMonthly, setCalcMonthly] = useState(5000);
  const [calcRate, setCalcRate] = useState(10);
  const [calcRetireAge, setCalcRetireAge] = useState(60);
  const [newAllocation, setNewAllocation] = useState({ E: 50, C: 30, G: 15, A: 5 });
  const [showRebalance, setShowRebalance] = useState(false);
  const [showContribForm, setShowContribForm] = useState(false);
  const [contribAmount, setContribAmount] = useState('');

  // Fetch NPS data from API
  useEffect(() => {
    const fetchNPSData = async () => {
      try {
        setLoading(true);
        const res = await api.get('/wealth/nps');
        const d = res.data?.data || res.data;
        if (d) {
          if (d.account) setAccount(prev => ({ ...prev, ...d.account }));
          if (d.navHistory?.length) setNavHistory(d.navHistory);
          if (d.contributions?.length) setMonthlyContributions(d.contributions);
          if (d.fundManagers) {
            // Could update fundManagers with live NAV data
          }
        }
      } catch (err) {
        console.log('NPS data not available:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchNPSData();
  }, []);

  const currentAge = useMemo(() => {
    const dob = new Date(account.dob);
    return Math.floor((new Date() - dob) / (365.25 * 24 * 60 * 60 * 1000));
  }, [account.dob]);

  const yearsToRetire = calcRetireAge - currentAge;
  const totalBalance = account.tier1Balance + account.tier2Balance;

  const tier1AllocationData = useMemo(() =>
    ASSET_CLASSES.map(a => ({ name: a.label, value: Math.round(account.tier1Balance * account.tier1Allocation[a.key] / 100), percent: account.tier1Allocation[a.key] }))
  , [account]);

  const tier2AllocationData = useMemo(() =>
    ASSET_CLASSES.filter(a => account.tier2Allocation[a.key] > 0).map(a => ({ name: a.label, value: Math.round(account.tier2Balance * account.tier2Allocation[a.key] / 100), percent: account.tier2Allocation[a.key] }))
  , [account]);

  const annuityEstimate = useMemo(() => {
    const r = calcRate / 12 / 100;
    const n = yearsToRetire * 12;
    const total = calcMonthly > 0 && r > 0 ? calcMonthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r) : calcMonthly * n;
    const corpus = account.tier1Balance + total;
    const annuityPercent = 40;
    const annuityCorpus = corpus * annuityPercent / 100;
    const lumpSum = corpus - annuityCorpus;
    const monthlyPension = Math.round(annuityCorpus * 0.06 / 12);
    return { corpus: Math.round(corpus), lumpSum: Math.round(lumpSum), annuityCorpus: Math.round(annuityCorpus), monthlyPension };
  }, [account.tier1Balance, calcMonthly, calcRate, yearsToRetire]);

  const taxBenefit = useMemo(() => {
    const tier1Self = account.monthlyContribution * 12;
    const tier1Employer = account.employerContribution * 12;
    const section80CCD1 = Math.min(tier1Self, 150000);
    const section80CCD1B = Math.min(50000, tier1Self);
    const section80CCD2 = tier1Employer;
    return { section80CCD1, section80CCD1B, section80CCD2, total: section80CCD1 + section80CCD1B + section80CCD2 };
  }, [account]);

  const partialWithdrawalEligible = useMemo(() => {
    const joinedYears = 3;
    return joinedYears >= 3;
  }, []);

  const handleRebalance = () => {
    const total = Object.values(newAllocation).reduce((s, v) => s + v, 0);
    if (total !== 100) return;
    setAccount(prev => ({ ...prev, tier1Allocation: { ...newAllocation } }));
    setShowRebalance(false);
  };

  const handleAddContribution = () => {
    if (!contribAmount) return;
    setAccount(prev => ({ ...prev, tier1Balance: prev.tier1Balance + Number(contribAmount) }));
    setContribAmount('');
    setShowContribForm(false);
  };

  return (
    <MainLayout title="NPS">
    <div className={`min-h-screen ${dk ? 'bg-gray-900' : 'bg-gray-50'} p-4 md:p-6`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
            <Landmark className="w-7 h-7 text-indigo-600" /> NPS Tracker
          </h1>
          <p className={`${dk ? 'text-gray-400' : 'text-gray-500'} text-sm mt-1`}>National Pension System management</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCalc(!showCalc)} className={`flex items-center gap-2 px-4 py-2 border ${dk ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-100'} rounded-lg`}>
            <Calculator className="w-4 h-4" /> Calculator
          </button>
          <button onClick={() => setShowContribForm(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            <Plus className="w-4 h-4" /> Add Contribution
          </button>
        </div>
      </div>

      {/* Account Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Tier 1 */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl p-6 text-white">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-indigo-200 text-sm">Tier 1 (Pension)</p>
              <p className="text-3xl font-bold mt-1">₹{account.tier1Balance.toLocaleString()}</p>
            </div>
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs">Locked till 60</span>
          </div>
          <div className="flex gap-4 text-sm">
            <div><span className="text-indigo-200">Self</span><p className="font-medium">₹{account.monthlyContribution.toLocaleString()}/mo</p></div>
            <div><span className="text-indigo-200">Employer</span><p className="font-medium">₹{account.employerContribution.toLocaleString()}/mo</p></div>
            <div><span className="text-indigo-200">Fund Manager</span><p className="font-medium">{account.fundManager}</p></div>
          </div>
        </div>

        {/* Tier 2 */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-700 rounded-xl p-6 text-white">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-teal-200 text-sm">Tier 2 (Savings)</p>
              <p className="text-3xl font-bold mt-1">₹{account.tier2Balance.toLocaleString()}</p>
            </div>
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs">Withdrawable</span>
          </div>
          <div className="flex gap-4 text-sm">
            <div><span className="text-teal-200">Total Balance</span><p className="font-medium">₹{totalBalance.toLocaleString()}</p></div>
            <div><span className="text-teal-200">PRAN</span><p className="font-mono font-medium">{account.pran}</p></div>
          </div>
        </div>
      </div>

      {/* Subscriber Details & Tax Benefits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Current Age', value: `${currentAge} years`, sub: `Retire at ${calcRetireAge}`, icon: <Users className="w-5 h-5" />, color: dk ? 'text-blue-600 bg-blue-900/40' : 'text-blue-600 bg-blue-100' },
          { label: 'Years to Retire', value: yearsToRetire, icon: <Clock className="w-5 h-5" />, color: dk ? 'text-purple-600 bg-purple-900/40' : 'text-purple-600 bg-purple-100' },
          { label: 'Tax Benefit (80CCD)', value: `₹${taxBenefit.total.toLocaleString()}`, sub: 'Total deductions/yr', icon: <Shield className="w-5 h-5" />, color: dk ? 'text-green-600 bg-green-900/40' : 'text-green-600 bg-green-100' },
          { label: 'Total Corpus', value: `₹${totalBalance.toLocaleString()}`, icon: <IndianRupee className="w-5 h-5" />, color: dk ? 'text-orange-600 bg-orange-900/40' : 'text-orange-600 bg-orange-100' },
        ].map((c, i) => (
          <div key={i} className={`${dk ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-xl p-4 shadow-sm border`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs ${dk ? 'text-gray-400' : 'text-gray-500'}`}>{c.label}</span>
              <span className={`p-1.5 rounded-lg ${c.color}`}>{c.icon}</span>
            </div>
            <p className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>{c.value}</p>
            {c.sub && <p className="text-xs text-gray-500 mt-1">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Tax Benefit Breakdown */}
      <div className={`${dk ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} border rounded-xl p-4 mb-6`}>
        <h3 className={`font-medium ${dk ? 'text-green-200' : 'text-green-800'} mb-3 flex items-center gap-2`}><Shield className="w-5 h-5" /> Tax Benefit Calculation (80CCD)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className={`p-3 ${dk ? 'bg-gray-800' : 'bg-white'} rounded-lg`}>
            <p className={dk ? 'text-gray-400' : 'text-gray-500'}>80CCD(1) - Self</p>
            <p className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>₹{taxBenefit.section80CCD1.toLocaleString()}</p>
            <p className="text-xs text-gray-400">Within 80C limit of ₹1.5L</p>
          </div>
          <div className={`p-3 ${dk ? 'bg-gray-800' : 'bg-white'} rounded-lg`}>
            <p className={dk ? 'text-gray-400' : 'text-gray-500'}>80CCD(1B) - Additional</p>
            <p className="text-lg font-bold text-green-600">₹{taxBenefit.section80CCD1B.toLocaleString()}</p>
            <p className="text-xs text-gray-400">Extra ₹50K over 80C</p>
          </div>
          <div className={`p-3 ${dk ? 'bg-gray-800' : 'bg-white'} rounded-lg`}>
            <p className={dk ? 'text-gray-400' : 'text-gray-500'}>80CCD(2) - Employer</p>
            <p className="text-lg font-bold text-blue-600">₹{taxBenefit.section80CCD2.toLocaleString()}</p>
            <p className="text-xs text-gray-400">No upper limit cap</p>
          </div>
        </div>
      </div>

      {/* Asset Allocation PieCharts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className={`${dk ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-xl p-5 shadow-sm border`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>Tier 1 Allocation (E/C/G/A)</h2>
            <button onClick={() => setShowRebalance(true)} className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Rebalance</button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={tier1AllocationData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name.split(' ')[0]} ${percent}%`}>
                {tier1AllocationData.map((_, i) => <Cell key={i} fill={ASSET_CLASSES[i].color} />)}
              </Pie>
              <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className={`${dk ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-xl p-5 shadow-sm border`}>
          <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Tier 2 Allocation</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={tier2AllocationData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name.split(' ')[0]} ${percent}%`}>
                {tier2AllocationData.map((_, i) => <Cell key={i} fill={ASSET_CLASSES[i].color} />)}
              </Pie>
              <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* NAV History */}
      <div className={`${dk ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-xl p-5 shadow-sm border mb-6`}>
        <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}><TrendingUp className="w-5 h-5 text-blue-500" /> NAV History (Per Fund)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={navHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" stroke="#9ca3af" tick={{ fontSize: 11 }} />
            <YAxis stroke="#9ca3af" />
            <Tooltip />
            <Legend />
            {ASSET_CLASSES.map(a => <Line key={a.key} type="monotone" dataKey={a.key} name={a.label} stroke={a.color} strokeWidth={2} dot={{ r: 3 }} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Contributions */}
      <div className={`${dk ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-xl p-5 shadow-sm border mb-6`}>
        <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}><Calendar className="w-5 h-5 text-purple-500" /> Monthly Contributions</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={monthlyContributions}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={v => `₹${Number(v).toLocaleString()}`} />
            <Legend />
            <Bar dataKey="self" name="Self" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="employer" name="Employer" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Fund Manager Comparison */}
      <div className={`${dk ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-xl p-5 shadow-sm border mb-6`}>
        <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-4`}>Fund Manager Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className={`text-left ${dk ? 'text-gray-400 border-gray-700' : 'text-gray-500'} border-b`}><th className="pb-2 pr-3">Fund Manager</th><th className="pb-2 pr-3">Tier 1 NAV</th><th className="pb-2 pr-3">Tier 2 NAV</th><th className="pb-2 pr-3">1Y Returns</th><th className="pb-2">3Y Returns</th></tr></thead>
            <tbody>
              {fundManagers.map((fm, i) => (
                <tr key={i} className={`${dk ? 'border-gray-700' : ''} border-b ${fm.name === account.fundManager ? (dk ? 'bg-indigo-900/20' : 'bg-indigo-50') : ''}`}>
                  <td className={`py-2 pr-3 font-medium ${dk ? 'text-white' : 'text-gray-900'}`}>{fm.name} {fm.name === account.fundManager && <span className="text-xs text-indigo-500 ml-1">(Current)</span>}</td>
                  <td className={`py-2 pr-3 ${dk ? 'text-gray-300' : 'text-gray-700'}`}>₹{fm.tier1NAV}</td>
                  <td className={`py-2 pr-3 ${dk ? 'text-gray-300' : 'text-gray-700'}`}>₹{fm.tier2NAV}</td>
                  <td className="py-2 pr-3 text-green-600 font-medium">{fm.returns1Y}%</td>
                  <td className="py-2 text-green-600 font-medium">{fm.returns3Y}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Partial Withdrawal & Annuity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className={`${dk ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-xl p-5 shadow-sm border`}>
          <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>{partialWithdrawalEligible ? <Unlock className="w-5 h-5 text-green-500" /> : <Lock className="w-5 h-5 text-red-500" />}Partial Withdrawal</h2>
          <div className={`p-3 rounded-lg mb-3 ${partialWithdrawalEligible ? (dk ? 'bg-green-900/20' : 'bg-green-50') : (dk ? 'bg-red-900/20' : 'bg-red-50')}`}>
            <p className={`font-medium ${dk ? 'text-white' : 'text-gray-900'}`}>{partialWithdrawalEligible ? 'Eligible for partial withdrawal' : 'Not eligible yet'}</p>
            <p className="text-xs text-gray-500 mt-1">Requires minimum 3 years of contribution</p>
          </div>
          <div className={`space-y-2 text-sm ${dk ? 'text-gray-300' : 'text-gray-600'}`}>
            <p>• Max 25% of own contributions (Tier 1)</p>
            <p>• Allowed for: children's education, marriage, home purchase, medical treatment</p>
            <p>• Maximum 3 times during entire tenure</p>
            <p>• Tier 2: No restrictions on withdrawal</p>
          </div>
        </div>

        <div className={`${dk ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-xl p-5 shadow-sm border`}>
          <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}><Target className="w-5 h-5 text-indigo-500" /> Annuity Estimator at Retirement</h2>
          <div className="space-y-3">
            <div className={`p-3 ${dk ? 'bg-indigo-900/20' : 'bg-indigo-50'} rounded-lg`}>
              <p className={`text-sm ${dk ? 'text-gray-300' : 'text-gray-600'}`}>Projected Corpus at {calcRetireAge}</p>
              <p className="text-2xl font-bold text-indigo-600">₹{annuityEstimate.corpus.toLocaleString()}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 ${dk ? 'bg-green-900/20' : 'bg-green-50'} rounded-lg`}>
                <p className="text-xs text-gray-500">Lump Sum (60%)</p>
                <p className="font-bold text-green-600">₹{annuityEstimate.lumpSum.toLocaleString()}</p>
              </div>
              <div className={`p-3 ${dk ? 'bg-purple-900/20' : 'bg-purple-50'} rounded-lg`}>
                <p className="text-xs text-gray-500">Annuity (40%)</p>
                <p className="font-bold text-purple-600">₹{annuityEstimate.annuityCorpus.toLocaleString()}</p>
              </div>
            </div>
            <div className={`p-3 ${dk ? 'bg-blue-900/20' : 'bg-blue-50'} rounded-lg text-center`}>
              <p className={`text-sm ${dk ? 'text-gray-300' : 'text-gray-600'}`}>Estimated Monthly Pension</p>
              <p className="text-2xl font-bold text-blue-600">₹{annuityEstimate.monthlyPension.toLocaleString()}</p>
              <p className="text-xs text-gray-500">@ 6% annuity rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Calculator */}
      {showCalc && (
        <div className={`${dk ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-xl p-5 shadow-sm border mb-6`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}><Calculator className="w-5 h-5 text-indigo-500" /> NPS Calculator</h2>
            <button onClick={() => setShowCalc(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className={`block text-sm font-medium ${dk ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Monthly Contribution (₹)</label><input type="number" value={calcMonthly} onChange={e => setCalcMonthly(Number(e.target.value))} className={`w-full px-3 py-2 rounded-lg border ${dk ? 'border-gray-600 bg-gray-700 text-white' : ''}`} /></div>
            <div><label className={`block text-sm font-medium ${dk ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Expected Return (%)</label><input type="number" value={calcRate} onChange={e => setCalcRate(Number(e.target.value))} className={`w-full px-3 py-2 rounded-lg border ${dk ? 'border-gray-600 bg-gray-700 text-white' : ''}`} /></div>
            <div><label className={`block text-sm font-medium ${dk ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Retirement Age</label><input type="number" value={calcRetireAge} onChange={e => setCalcRetireAge(Number(e.target.value))} className={`w-full px-3 py-2 rounded-lg border ${dk ? 'border-gray-600 bg-gray-700 text-white' : ''}`} /></div>
          </div>
        </div>
      )}

      {/* Rebalance Modal */}
      {showRebalance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 w-full max-w-md shadow-xl`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}><RefreshCw className="w-5 h-5" /> Rebalance Tier 1</h2>
              <button onClick={() => setShowRebalance(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {ASSET_CLASSES.map(a => (
                <div key={a.key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={dk ? 'text-gray-300' : 'text-gray-700'}>{a.label}</span>
                    <span className={dk ? 'text-gray-400' : 'text-gray-500'}>Max: {a.maxTier1}%</span>
                  </div>
                  <input type="range" min={0} max={a.maxTier1} value={newAllocation[a.key]} onChange={e => setNewAllocation(p => ({ ...p, [a.key]: Number(e.target.value) }))} className="w-full" />
                  <p className="text-xs text-right text-gray-500">{newAllocation[a.key]}%</p>
                </div>
              ))}
              <div className={`p-2 rounded text-center text-sm font-medium ${Object.values(newAllocation).reduce((s, v) => s + v, 0) === 100 ? (dk ? 'bg-green-900/30 text-green-700' : 'bg-green-100 text-green-700') : (dk ? 'bg-red-900/30 text-red-700' : 'bg-red-100 text-red-700')}`}>
                Total: {Object.values(newAllocation).reduce((s, v) => s + v, 0)}% {Object.values(newAllocation).reduce((s, v) => s + v, 0) === 100 ? '✓' : '(must be 100%)'}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowRebalance(false)} className={`flex-1 py-2 border ${dk ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'} rounded-lg`}>Cancel</button>
              <button onClick={handleRebalance} disabled={Object.values(newAllocation).reduce((s, v) => s + v, 0) !== 100} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">Rebalance</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contribution Modal */}
      {showContribForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${dk ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 w-full max-w-sm shadow-xl`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>Add Contribution</h2>
              <button onClick={() => setShowContribForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div><label className={`block text-sm font-medium ${dk ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Amount (₹)</label><input type="number" value={contribAmount} onChange={e => setContribAmount(e.target.value)} className={`w-full px-3 py-2 rounded-lg border ${dk ? 'border-gray-600 bg-gray-700 text-white' : ''}`} /></div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowContribForm(false)} className={`flex-1 py-2 border ${dk ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'} rounded-lg`}>Cancel</button>
              <button onClick={handleAddContribution} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </MainLayout>
  );
}
