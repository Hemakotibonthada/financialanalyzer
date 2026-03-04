import React, { useState, useMemo, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  Target, TrendingUp, Calendar, DollarSign, CheckSquare, Sliders,
  PiggyBank, Clock, Award, ChevronDown, ChevronUp, Info, Shield,
  Sun, Briefcase, Heart
} from 'lucide-react';
import MainLayout from '../components/MainLayout';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

const fmt = (n) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
};

const savingsVsTarget = [
  { name: 'EPF', current: 1800000, target: 5000000 },
  { name: 'PPF', current: 900000, target: 2500000 },
  { name: 'NPS', current: 600000, target: 3000000 },
  { name: 'Mutual Funds', current: 2200000, target: 5000000 },
  { name: 'FD', current: 500000, target: 1000000 },
  { name: 'Stocks', current: 800000, target: 2000000 },
];

const incomeProjection = [
  { year: '2026', conservative: 40000, moderate: 40000, aggressive: 40000 },
  { year: '2030', conservative: 55000, moderate: 65000, aggressive: 80000 },
  { year: '2035', conservative: 75000, moderate: 100000, aggressive: 140000 },
  { year: '2040', conservative: 100000, moderate: 150000, aggressive: 230000 },
  { year: '2045', conservative: 135000, moderate: 220000, aggressive: 380000 },
  { year: '2050', conservative: 180000, moderate: 320000, aggressive: 600000 },
  { year: '2055', conservative: 240000, moderate: 460000, aggressive: 950000 },
  { year: '2060', conservative: 310000, moderate: 650000, aggressive: 1500000 },
];

const scenarioData = [
  { label: 'Conservative (8%)', rate: 8, corpus: 28500000, monthly: 95000, color: '#3B82F6' },
  { label: 'Moderate (12%)', rate: 12, corpus: 52000000, monthly: 173000, color: '#10B981' },
  { label: 'Aggressive (15%)', rate: 15, corpus: 85000000, monthly: 283000, color: '#F59E0B' },
];

const expenseForecast = [
  { category: 'Housing', current: 25000, retired: 15000, note: 'Loan paid off by retirement' },
  { category: 'Healthcare', current: 5000, retired: 20000, note: 'Increases with age' },
  { category: 'Food & Groceries', current: 15000, retired: 20000, note: 'Inflation adjusted' },
  { category: 'Utilities', current: 5000, retired: 7000, note: 'Inflation adjusted' },
  { category: 'Travel & Leisure', current: 8000, retired: 15000, note: 'More free time' },
  { category: 'Insurance Premiums', current: 6000, retired: 10000, note: 'Higher health premiums' },
  { category: 'Miscellaneous', current: 10000, retired: 13000, note: 'Inflation adjusted' },
];

const actionItems = [
  { id: 1, text: 'Increase SIP amount by ₹5,000/month', done: false, priority: 'High' },
  { id: 2, text: 'Open NPS account for additional tax savings', done: true, priority: 'Medium' },
  { id: 3, text: 'Review and rebalance portfolio quarterly', done: false, priority: 'High' },
  { id: 4, text: 'Buy term insurance of ₹1Cr', done: true, priority: 'High' },
  { id: 5, text: 'Maximize 80C deductions', done: false, priority: 'Medium' },
  { id: 6, text: 'Create emergency fund of 6 months expenses', done: false, priority: 'High' },
  { id: 7, text: 'Set up health insurance super top-up', done: false, priority: 'Medium' },
  { id: 8, text: 'Start a retirement-specific mutual fund', done: false, priority: 'Low' },
];

const pensionBreakdown = [
  { name: 'EPF Pension', value: 15000 },
  { name: 'NPS Annuity', value: 12000 },
  { name: 'PPF Withdrawal', value: 8000 },
  { name: 'Rental Income', value: 20000 },
];

export default function RetirementPlanner() {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  const [retireAge, setRetireAge] = useState(60);
  const [currentAge] = useState(30);
  const [monthlyContribution, setMonthlyContribution] = useState(25000);
  const [expectedReturn, setExpectedReturn] = useState(12);
  const [monthlyExpense, setMonthlyExpense] = useState(50000);
  const [activeScenario, setActiveScenario] = useState('moderate');
  const [items, setItems] = useState(actionItems);
  const [withdrawalStrategy, setWithdrawalStrategy] = useState('4percent');
  const [savingsData, setSavingsData] = useState(savingsVsTarget);
  const [pension, setPension] = useState(pensionBreakdown);
  const [planId, setPlanId] = useState(null);

  useEffect(() => {
    const fetchRetirementData = async () => {
      try {
        const res = await api.get('/retirement');
        const plans = res.data?.data;
        if (Array.isArray(plans) && plans.length > 0) {
          const plan = plans[0];
          setPlanId(plan._id);
          if (plan.retireAge) setRetireAge(plan.retireAge);
          if (plan.monthlyContribution) setMonthlyContribution(plan.monthlyContribution);
          if (plan.expectedReturn) setExpectedReturn(plan.expectedReturn);
          if (plan.monthlyExpense) setMonthlyExpense(plan.monthlyExpense);
          if (plan.withdrawalStrategy) setWithdrawalStrategy(plan.withdrawalStrategy);
          if (plan.savings) setSavingsData(plan.savings);
          if (plan.pension) setPension(plan.pension);
          if (plan.actionItems) setItems(plan.actionItems);
        }
      } catch (err) {
        console.log('Retirement data fetch fallback to defaults:', err.message);
      }
    };
    fetchRetirementData();
  }, []);

  const yearsToRetire = retireAge - currentAge;
  const months = yearsToRetire * 12;

  const projectedCorpus = useMemo(() => {
    const r = expectedReturn / 100 / 12;
    if (r === 0) return monthlyContribution * months;
    return monthlyContribution * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
  }, [monthlyContribution, expectedReturn, months]);

  const targetCorpus = useMemo(() => {
    const inflationAdj = monthlyExpense * Math.pow(1.06, yearsToRetire);
    return inflationAdj * 12 * 25;
  }, [monthlyExpense, yearsToRetire]);

  const readinessScore = useMemo(() => Math.min(Math.round((projectedCorpus / targetCorpus) * 100), 100), [projectedCorpus, targetCorpus]);

  const monthlyRetirementIncome = useMemo(() => {
    if (withdrawalStrategy === '4percent') return Math.round(projectedCorpus * 0.04 / 12);
    return Math.round(projectedCorpus * 0.035 / 12);
  }, [projectedCorpus, withdrawalStrategy]);

  const totalSaved = useMemo(() => savingsData.reduce((s, i) => s + i.current, 0), [savingsData]);
  const totalTarget = useMemo(() => savingsData.reduce((s, i) => s + i.target, 0), [savingsData]);
  const pensionTotal = useMemo(() => pension.reduce((s, i) => s + i.value, 0), [pension]);

  const toggleItem = async (id) => {
    const updated = items.map(i => i.id === id ? { ...i, done: !i.done } : i);
    setItems(updated);
    if (planId) {
      try {
        await api.put(`/retirement/${planId}`, { actionItems: updated });
      } catch (err) {
        console.error('Failed to save action item:', err.message);
      }
    }
  };
  const completedCount = items.filter(i => i.done).length;

  const gaugeAngle = (readinessScore / 100) * 180;

  return (
    <MainLayout title="Retirement Planner">
    <div className={`min-h-screen ${dk ? 'bg-slate-900' : 'bg-slate-50'} p-4 md:p-6 space-y-6`}>
      {/* Header */}
      <div>
        <h1 className={`text-2xl font-bold ${dk ? 'text-white' : 'text-slate-800'} flex items-center gap-2`}>
          <Sun className="w-7 h-7 text-amber-500" /> Retirement Planner
        </h1>
        <p className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'} mt-1`}>Plan for a comfortable retirement with projections and actionable steps</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Current Savings', value: fmt(totalSaved), icon: PiggyBank, color: 'text-blue-600', sub: `${Math.round((totalSaved / totalTarget) * 100)}% of target` },
          { label: 'Projected Corpus', value: fmt(projectedCorpus), icon: TrendingUp, color: 'text-green-600', sub: `at ${expectedReturn}% returns` },
          { label: 'Target Corpus', value: fmt(targetCorpus), icon: Target, color: 'text-amber-600', sub: `for ₹${monthlyExpense.toLocaleString('en-IN')}/mo lifestyle` },
          { label: 'Years to Retire', value: yearsToRetire, icon: Clock, color: 'text-purple-600', sub: `Retire at age ${retireAge}` },
        ].map((c, i) => (
          <div key={i} className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 border ${dk ? 'border-slate-700' : 'border-slate-200'} shadow-sm`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'}`}>{c.label}</span>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className={`text-3xl font-bold ${dk ? 'text-white' : 'text-slate-800'}`}>{c.value}</p>
            <p className={`text-xs ${dk ? 'text-slate-400' : 'text-slate-500'} mt-1`}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Readiness Gauge + Retirement Age Slider */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 border ${dk ? 'border-slate-700' : 'border-slate-200'} shadow-sm flex flex-col items-center`}>
          <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-slate-800'} mb-4`}>Retirement Readiness Score</h2>
          <div className="relative w-64 h-36">
            <svg viewBox="0 0 200 110" className="w-full">
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e2e8f0" strokeWidth="16" strokeLinecap="round" className={`${dk ? 'stroke-slate-700' : ''}`} />
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={readinessScore >= 70 ? '#10B981' : readinessScore >= 40 ? '#F59E0B' : '#EF4444'} strokeWidth="16" strokeLinecap="round"
                strokeDasharray={`${(gaugeAngle / 180) * 251.2} 251.2`} />
              <text x="100" y="85" textAnchor="middle" className={`text-4xl font-bold ${dk ? 'fill-white' : 'fill-slate-800'}`} fontSize="32">{readinessScore}</text>
              <text x="100" y="105" textAnchor="middle" className={`${dk ? 'fill-slate-400' : 'fill-slate-500'}`} fontSize="12">out of 100</text>
            </svg>
          </div>
          <p className={`text-sm font-medium mt-2 ${readinessScore >= 70 ? 'text-green-600' : readinessScore >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
            {readinessScore >= 70 ? 'On Track!' : readinessScore >= 40 ? 'Needs Improvement' : 'Behind Schedule'}
          </p>
          <p className={`text-xs ${dk ? 'text-slate-400' : 'text-slate-500'} mt-1 text-center`}>
            Gap: {fmt(Math.max(targetCorpus - projectedCorpus, 0))}
          </p>
        </div>

        <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 border ${dk ? 'border-slate-700' : 'border-slate-200'} shadow-sm space-y-6`}>
          <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-slate-800'}`}>Contribution Calculator</h2>
          <div>
            <label className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'} flex justify-between mb-2`}>
              <span>Retirement Age</span><span className={`font-semibold ${dk ? 'text-white' : 'text-slate-800'}`}>{retireAge}</span>
            </label>
            <input type="range" min={45} max={70} value={retireAge} onChange={e => setRetireAge(Number(e.target.value))} className="w-full accent-blue-600" />
          </div>
          <div>
            <label className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'} flex justify-between mb-2`}>
              <span>Monthly Contribution</span><span className={`font-semibold ${dk ? 'text-white' : 'text-slate-800'}`}>₹{monthlyContribution.toLocaleString('en-IN')}</span>
            </label>
            <input type="range" min={5000} max={200000} step={1000} value={monthlyContribution} onChange={e => setMonthlyContribution(Number(e.target.value))} className="w-full accent-blue-600" />
          </div>
          <div>
            <label className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'} flex justify-between mb-2`}>
              <span>Expected Return</span><span className={`font-semibold ${dk ? 'text-white' : 'text-slate-800'}`}>{expectedReturn}%</span>
            </label>
            <input type="range" min={6} max={18} step={0.5} value={expectedReturn} onChange={e => setExpectedReturn(Number(e.target.value))} className="w-full accent-blue-600" />
          </div>
          <div>
            <label className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'} flex justify-between mb-2`}>
              <span>Monthly Expense (Today)</span><span className={`font-semibold ${dk ? 'text-white' : 'text-slate-800'}`}>₹{monthlyExpense.toLocaleString('en-IN')}</span>
            </label>
            <input type="range" min={20000} max={300000} step={5000} value={monthlyExpense} onChange={e => setMonthlyExpense(Number(e.target.value))} className="w-full accent-blue-600" />
          </div>
        </div>
      </div>

      {/* Current Savings vs Target */}
      <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 border ${dk ? 'border-slate-700' : 'border-slate-200'} shadow-sm`}>
        <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-slate-800'} mb-4`}>Current Savings vs Target</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={savingsData} layout="vertical">
            <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} width={100} />
            <Tooltip formatter={v => fmt(v)} />
            <Legend />
            <Bar dataKey="current" fill="#3B82F6" name="Current" radius={[0, 4, 4, 0]} />
            <Bar dataKey="target" fill="#E2E8F0" name="Target" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Retirement Income Projection */}
      <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 border ${dk ? 'border-slate-700' : 'border-slate-200'} shadow-sm`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-slate-800'}`}>Retirement Income Projection</h2>
          <div className="flex gap-2">
            {['conservative', 'moderate', 'aggressive'].map(s => (
              <button key={s} onClick={() => setActiveScenario(s)}
                className={`px-3 py-1 rounded-xl text-xs font-medium capitalize ${activeScenario === s ? `${dk ? `bg-blue-900/20` : `bg-blue-50`} ${dk ? `text-blue-300` : `text-blue-700`}` : `${dk ? `bg-slate-700` : `bg-slate-100`} ${dk ? `text-slate-300` : `text-slate-700`}`}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={incomeProjection}>
            <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip formatter={v => `₹${v.toLocaleString('en-IN')}`} />
            <Legend />
            {(activeScenario === 'conservative' || activeScenario === 'moderate' || activeScenario === 'aggressive') && (
              <Area type="monotone" dataKey="conservative" stroke="#3B82F6" fill="#3B82F6" fillOpacity={activeScenario === 'conservative' ? 0.3 : 0.05} name="Conservative (8%)" />
            )}
            <Area type="monotone" dataKey="moderate" stroke="#10B981" fill="#10B981" fillOpacity={activeScenario === 'moderate' ? 0.3 : 0.05} name="Moderate (12%)" />
            <Area type="monotone" dataKey="aggressive" stroke="#F59E0B" fill="#F59E0B" fillOpacity={activeScenario === 'aggressive' ? 0.3 : 0.05} name="Aggressive (15%)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Scenarios Comparison + Pension Estimation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 border ${dk ? 'border-slate-700' : 'border-slate-200'} shadow-sm`}>
          <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-slate-800'} mb-4`}>Scenarios Comparison</h2>
          <div className="space-y-4">
            {scenarioData.map((s, i) => (
              <div key={i} className={`p-4 rounded-xl border ${dk ? 'border-slate-700' : 'border-slate-100'} ${dk ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <h4 className={`text-sm font-medium ${dk ? 'text-white' : 'text-slate-800'}`}>{s.label}</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={`text-xs ${dk ? 'text-slate-400' : 'text-slate-500'}`}>Projected Corpus</p>
                    <p className={`text-lg font-bold ${dk ? 'text-white' : 'text-slate-800'}`}>{fmt(s.corpus)}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${dk ? 'text-slate-400' : 'text-slate-500'}`}>Monthly Income</p>
                    <p className={`text-lg font-bold ${dk ? 'text-white' : 'text-slate-800'}`}>{fmt(s.monthly)}/mo</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 border ${dk ? 'border-slate-700' : 'border-slate-200'} shadow-sm`}>
          <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-slate-800'} mb-4`}>Pension & Social Security</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pension} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value"
                label={({ name, value }) => `${name}: ₹${value.toLocaleString('en-IN')}`}>
                {pension.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={v => `₹${v.toLocaleString('en-IN')}`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="text-center mt-2">
            <p className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'}`}>Estimated Monthly Pension</p>
            <p className={`text-2xl font-bold ${dk ? 'text-white' : 'text-slate-800'}`}>₹{pensionTotal.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Withdrawal Strategy */}
      <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 border ${dk ? 'border-slate-700' : 'border-slate-200'} shadow-sm`}>
        <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-slate-800'} mb-4`}>Withdrawal Strategy</h2>
        <div className="flex gap-4 mb-4">
          {[
            { key: '4percent', label: '4% Rule', desc: 'Withdraw 4% of corpus annually' },
            { key: 'dynamic', label: 'Dynamic (3.5%)', desc: 'Adjust based on market conditions' },
          ].map(s => (
            <button key={s.key} onClick={() => setWithdrawalStrategy(s.key)}
              className={`flex-1 p-4 rounded-xl text-left border ${withdrawalStrategy === s.key ? `${dk ? `border-blue-600` : `border-blue-300`} ${dk ? `bg-blue-900/20` : `bg-blue-50`}` : `${dk ? `border-slate-700` : `border-slate-200`} ${dk ? `bg-slate-700/30` : `bg-slate-50`}`}`}>
              <p className={`text-sm font-medium ${withdrawalStrategy === s.key ? `${dk ? 'text-blue-300' : 'text-blue-700'}` : `${dk ? 'text-white' : 'text-slate-800'}`}`}>{s.label}</p>
              <p className={`text-xs ${dk ? 'text-slate-400' : 'text-slate-500'} mt-1`}>{s.desc}</p>
            </button>
          ))}
        </div>
        <div className={`p-4 rounded-xl ${dk ? 'bg-green-900/20' : 'bg-green-50'} border ${dk ? 'border-green-800' : 'border-green-100'}`}>
          <p className={`text-sm ${dk ? 'text-green-300' : 'text-green-700'}`}>Estimated Monthly Retirement Income</p>
          <p className={`text-3xl font-bold ${dk ? 'text-green-200' : 'text-green-800'}`}>{fmt(monthlyRetirementIncome)}/mo</p>
          <p className={`text-xs ${dk ? 'text-green-400' : 'text-green-600'} mt-1`}>Plus pension income of ₹{pensionTotal.toLocaleString('en-IN')}/mo = Total {fmt(monthlyRetirementIncome + pensionTotal)}/mo</p>
        </div>
      </div>

      {/* Expense Forecast */}
      <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 border ${dk ? 'border-slate-700' : 'border-slate-200'} shadow-sm`}>
        <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-slate-800'} mb-4`}>Expense Forecast</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${dk ? 'border-slate-700' : 'border-slate-200'}`}>
                <th className={`text-left py-3 px-4 ${dk ? 'text-slate-400' : 'text-slate-500'} font-medium`}>Category</th>
                <th className={`text-right py-3 px-4 ${dk ? 'text-slate-400' : 'text-slate-500'} font-medium`}>Current</th>
                <th className={`text-right py-3 px-4 ${dk ? 'text-slate-400' : 'text-slate-500'} font-medium`}>Retired</th>
                <th className={`text-right py-3 px-4 ${dk ? 'text-slate-400' : 'text-slate-500'} font-medium`}>Change</th>
                <th className={`text-left py-3 px-4 ${dk ? 'text-slate-400' : 'text-slate-500'} font-medium`}>Note</th>
              </tr>
            </thead>
            <tbody>
              {expenseForecast.map((e, i) => {
                const change = e.retired - e.current;
                return (
                  <tr key={i} className={`border-b ${dk ? 'border-slate-700/50' : 'border-slate-100'}`}>
                    <td className={`py-3 px-4 ${dk ? 'text-white' : 'text-slate-800'} font-medium`}>{e.category}</td>
                    <td className={`py-3 px-4 text-right ${dk ? 'text-slate-300' : 'text-slate-600'}`}>₹{e.current.toLocaleString('en-IN')}</td>
                    <td className={`py-3 px-4 text-right ${dk ? 'text-slate-300' : 'text-slate-600'}`}>₹{e.retired.toLocaleString('en-IN')}</td>
                    <td className={`py-3 px-4 text-right font-medium ${change > 0 ? 'text-red-500' : 'text-green-500'}`}>{change > 0 ? '+' : ''}{fmt(change)}</td>
                    <td className={`py-3 px-4 ${dk ? 'text-slate-400' : 'text-slate-500'} text-xs`}>{e.note}</td>
                  </tr>
                );
              })}
              <tr className="font-bold">
                <td className={`py-3 px-4 ${dk ? 'text-white' : 'text-slate-800'}`}>Total</td>
                <td className={`py-3 px-4 text-right ${dk ? 'text-white' : 'text-slate-800'}`}>₹{expenseForecast.reduce((s, e) => s + e.current, 0).toLocaleString('en-IN')}</td>
                <td className={`py-3 px-4 text-right ${dk ? 'text-white' : 'text-slate-800'}`}>₹{expenseForecast.reduce((s, e) => s + e.retired, 0).toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right text-red-500">+{fmt(expenseForecast.reduce((s, e) => s + e.retired - e.current, 0))}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Items Checklist */}
      <div className={`${dk ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 border ${dk ? 'border-slate-700' : 'border-slate-200'} shadow-sm`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-slate-800'} flex items-center gap-2`}>
            <CheckSquare className="w-5 h-5 text-green-500" /> Action Items
          </h2>
          <span className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'}`}>{completedCount}/{items.length} completed</span>
        </div>
        <div className={`w-full ${dk ? 'bg-slate-700' : 'bg-slate-200'} rounded-full h-2 mb-4`}>
          <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${(completedCount / items.length) * 100}%` }} />
        </div>
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} onClick={() => toggleItem(item.id)}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border ${item.done ? `${dk ? `bg-green-900/10` : `bg-green-50`} ${dk ? `border-green-800` : `border-green-100`}` : `${dk ? `bg-slate-700/30` : `bg-slate-50`} ${dk ? `border-slate-700` : `border-slate-100`}`}`}>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${item.done ? 'bg-green-500 border-green-500' : `${dk ? 'border-slate-600' : 'border-slate-300'}`}`}>
                {item.done && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span className={`text-sm flex-1 ${item.done ? 'text-slate-400 line-through' : `${dk ? 'text-white' : 'text-slate-800'}`}`}>{item.text}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.priority === `High` ? `bg-red-100 ${dk ? `bg-red-900/30` : `text-red-700`} ${dk ? `text-red-400` : ``}` : item.priority === `Medium` ? `bg-amber-100 ${dk ? `bg-amber-900/30` : `text-amber-700`} ${dk ? `text-amber-400` : ``}` : `bg-green-100 ${dk ? `bg-green-900/30` : `text-green-700`} ${dk ? `text-green-400` : ``}`}`}>
                {item.priority}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
    </MainLayout>
  );
}
