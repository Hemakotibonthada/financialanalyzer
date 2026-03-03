import React, { useState, useMemo } from 'react';
import {
  Briefcase, Plus, TrendingUp, Calculator, Calendar, IndianRupee, X,
  Upload, ArrowUpRight, Clock, BarChart3, Users, Shield, FileText,
  ChevronDown, Target, Building2, ArrowRightLeft, Info
} from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import MainLayout from '../components/MainLayout';
import api from '../services/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
const EPF_RATE = 8.15;
const EPS_RATE = 8.33;

const initialAccount = {
  uan: '1001 2345 6789',
  employer: 'TechCorp India Pvt Ltd',
  dateOfJoining: '2019-04-15',
  basicSalary: 55000,
  employeeContribution: 6600, // 12% of basic
  employerEPF: 3217, // 3.67% to EPF
  employerEPS: 3383, // 8.33% to EPS (max on 15K)
  totalBalance: 985000,
  employeeBalance: 520000,
  employerBalance: 465000,
  epsBalance: 185000,
};

const monthlyContributions = [
  { month: 'Mar 25', employee: 6600, employer: 3217, total: 9817 },
  { month: 'Apr 25', employee: 6600, employer: 3217, total: 9817 },
  { month: 'May 25', employee: 6600, employer: 3217, total: 9817 },
  { month: 'Jun 25', employee: 6600, employer: 3217, total: 9817 },
  { month: 'Jul 25', employee: 6600, employer: 3217, total: 9817 },
  { month: 'Aug 25', employee: 6600, employer: 3217, total: 9817 },
  { month: 'Sep 25', employee: 6600, employer: 3217, total: 9817 },
  { month: 'Oct 25', employee: 6600, employer: 3217, total: 9817 },
  { month: 'Nov 25', employee: 6600, employer: 3217, total: 9817 },
  { month: 'Dec 25', employee: 6600, employer: 3217, total: 9817 },
  { month: 'Jan 26', employee: 6600, employer: 3217, total: 9817 },
  { month: 'Feb 26', employee: 6600, employer: 3217, total: 9817 },
];

const yearlyGrowth = [
  { year: '2019', balance: 95000 },
  { year: '2020', balance: 215000 },
  { year: '2021', balance: 365000 },
  { year: '2022', balance: 530000 },
  { year: '2023', balance: 720000 },
  { year: '2024', balance: 850000 },
  { year: '2025', balance: 985000 },
];

const transferHistory = [
  { id: 1, fromEmployer: 'InfoSys Ltd', toEmployer: 'TechCorp India Pvt Ltd', amount: 285000, date: '2019-04-20', status: 'completed' },
];

const withdrawalRules = [
  { purpose: 'Medical Emergency', service: '0 years', maxAmount: '6 months basic', earlyAllowed: true },
  { purpose: 'Home Purchase', service: '5 years', maxAmount: '36x monthly wages', earlyAllowed: false },
  { purpose: 'Home Loan Repayment', service: '10 years', maxAmount: '36x monthly wages', earlyAllowed: false },
  { purpose: 'Education (Children)', service: '7 years', maxAmount: '50% of employee share', earlyAllowed: false },
  { purpose: 'Marriage', service: '7 years', maxAmount: '50% of employee share', earlyAllowed: false },
  { purpose: 'Pre-Retirement (54+)', service: '54 years age', maxAmount: '90% of total', earlyAllowed: false },
];

export default function EPFTracker() {
  const [account] = useState(initialAccount);
  const [showCalc, setShowCalc] = useState(false);
  const [vpfAmount, setVpfAmount] = useState(0);
  const [calcBasic, setCalcBasic] = useState(account.basicSalary);
  const [calcYears, setCalcYears] = useState(25);
  const [calcIncrement, setCalcIncrement] = useState(8);
  const [showUpload, setShowUpload] = useState(false);

  const yearsOfService = useMemo(() => {
    const join = new Date(account.dateOfJoining);
    const now = new Date();
    return ((now - join) / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1);
  }, [account.dateOfJoining]);

  const splitData = useMemo(() => [
    { name: 'Employee Share', value: account.employeeBalance },
    { name: 'Employer Share', value: account.employerBalance },
  ], [account]);

  const retirementProjection = useMemo(() => {
    const data = [];
    let balance = account.totalBalance;
    let basic = calcBasic;
    for (let y = 0; y < calcYears; y++) {
      const empContrib = basic * 0.12 * 12;
      const erContrib = basic * 0.0367 * 12;
      const vpfContrib = vpfAmount * 12;
      balance = (balance + empContrib + erContrib + vpfContrib) * (1 + EPF_RATE / 100);
      data.push({ year: `Y${y + 1}`, balance: Math.round(balance), epf: Math.round(empContrib + erContrib), vpf: Math.round(vpfContrib) });
      basic *= (1 + calcIncrement / 100);
    }
    return data;
  }, [account.totalBalance, calcBasic, calcYears, calcIncrement, vpfAmount]);

  const epsPension = useMemo(() => {
    const pensionableSalary = Math.min(calcBasic, 15000);
    const years = Math.min(Number(yearsOfService) + calcYears, 35);
    return Math.round((pensionableSalary * years) / 70);
  }, [calcBasic, yearsOfService, calcYears]);

  const epfVsVpfData = useMemo(() => {
    const epfOnly = retirementProjection[retirementProjection.length - 1]?.balance || 0;
    let withVPF = account.totalBalance;
    let basic = calcBasic;
    for (let y = 0; y < calcYears; y++) {
      const emp = basic * 0.12 * 12;
      const er = basic * 0.0367 * 12;
      const vpf = basic * 0.12 * 12;
      withVPF = (withVPF + emp + er + vpf) * (1 + EPF_RATE / 100);
      basic *= (1 + calcIncrement / 100);
    }
    return [
      { label: 'EPF Only', value: Math.round(epfOnly) },
      { label: 'EPF + VPF (24%)', value: Math.round(withVPF) },
    ];
  }, [retirementProjection, account.totalBalance, calcBasic, calcYears, calcIncrement]);

  return (
    <MainLayout title="EPF Tracker">
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-blue-600" /> EPF Tracker
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Employee Provident Fund management</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <Upload className="w-4 h-4" /> Upload Statement
          </button>
          <button onClick={() => setShowCalc(!showCalc)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Calculator className="w-4 h-4" /> Calculator
          </button>
        </div>
      </div>

      {/* EPF Balance Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 mb-6 text-white">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-blue-200 text-xs mb-1">Total EPF Balance</p>
            <p className="text-2xl font-bold">₹{account.totalBalance.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs mb-1">Employee Share</p>
            <p className="text-xl font-bold">₹{account.employeeBalance.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs mb-1">Employer Share</p>
            <p className="text-xl font-bold">₹{account.employerBalance.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs mb-1">Interest Rate</p>
            <p className="text-xl font-bold">{EPF_RATE}%</p>
            <p className="text-blue-200 text-xs">FY 2025-26</p>
          </div>
        </div>
      </div>

      {/* Contribution & Split */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Monthly Employee', value: `₹${account.employeeContribution.toLocaleString()}`, sub: '12% of Basic', icon: <Users className="w-5 h-5" />, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40' },
          { label: 'Monthly Employer (EPF)', value: `₹${account.employerEPF.toLocaleString()}`, sub: '3.67% of Basic', icon: <Building2 className="w-5 h-5" />, color: 'text-green-600 bg-green-100 dark:bg-green-900/40' },
          { label: 'Monthly EPS', value: `₹${account.employerEPS.toLocaleString()}`, sub: '8.33% (max on ₹15K)', icon: <Shield className="w-5 h-5" />, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/40' },
          { label: 'Years of Service', value: yearsOfService, sub: `Since ${account.dateOfJoining}`, icon: <Clock className="w-5 h-5" />, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/40' },
        ].map((c, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">{c.label}</span>
              <span className={`p-1.5 rounded-lg ${c.color}`}>{c.icon}</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{c.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Monthly Contribution Chart & Employee/Employer Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-500" /> Monthly Contributions</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyContributions}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#9ca3af" tick={{ fontSize: 11 }} />
              <YAxis stroke="#9ca3af" tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={v => `₹${Number(v).toLocaleString()}`} />
              <Legend />
              <Bar dataKey="employee" name="Employee (12%)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="employer" name="Employer (3.67%)" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Balance Split</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={splitData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}>
                {splitData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
          {/* UAN Details */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">UAN</span><span className="font-mono text-gray-900 dark:text-white">{account.uan}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Employer</span><span className="text-gray-900 dark:text-white text-xs">{account.employer}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Basic Salary</span><span className="text-gray-900 dark:text-white">₹{account.basicSalary.toLocaleString()}</span></div>
          </div>
        </div>
      </div>

      {/* Balance Growth */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-500" /> Balance Growth Over Years</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={yearlyGrowth}>
            <defs><linearGradient id="epfGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="year" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
            <Tooltip formatter={v => `₹${Number(v).toLocaleString()}`} />
            <Area type="monotone" dataKey="balance" stroke="#3b82f6" fill="url(#epfGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Withdrawal Eligibility & EPS Pension */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-red-500" /> Withdrawal Eligibility</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700"><th className="pb-2 pr-3">Purpose</th><th className="pb-2 pr-3">Min Service</th><th className="pb-2">Max Amount</th></tr></thead>
              <tbody>
                {withdrawalRules.map((r, i) => (
                  <tr key={i} className="border-b dark:border-gray-700">
                    <td className="py-2 pr-3 font-medium text-gray-900 dark:text-white">{r.purpose}</td>
                    <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{r.service}</td>
                    <td className="py-2 text-gray-700 dark:text-gray-300">{r.maxAmount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-purple-500" /> EPS Pension Estimation</h2>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">Estimated Monthly Pension</p>
            <p className="text-3xl font-bold text-purple-600 mt-1">₹{epsPension.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Formula: (Pensionable Salary × Years of Service) / 70</p>
            <p className="text-xs text-gray-500">Pensionable Salary capped at ₹15,000 | Min 10 years service required</p>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
            <p>• EPS pension starts at age 58 (reduced pension from 50)</p>
            <p>• Family pension in case of death of member</p>
            <p>• Can withdraw lump sum if service &lt; 10 years</p>
          </div>
        </div>
      </div>

      {/* Transfer History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-blue-500" /> Transfer History</h2>
        {transferHistory.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No transfers yet</p>
        ) : (
          <div className="space-y-3">
            {transferHistory.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{t.fromEmployer} → {t.toEmployer}</p>
                  <p className="text-xs text-gray-500">{t.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">₹{t.amount.toLocaleString()}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30'}`}>{t.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EPF vs VPF & Retirement Projection */}
      {showCalc && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Calculator className="w-5 h-5 text-blue-500" /> EPF vs VPF Calculator & Retirement Projection</h2>
            <button onClick={() => setShowCalc(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Basic Salary (₹)</label><input type="number" value={calcBasic} onChange={e => setCalcBasic(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">VPF Extra/mo (₹)</label><input type="number" value={vpfAmount} onChange={e => setVpfAmount(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Years to Retire</label><input type="number" value={calcYears} onChange={e => setCalcYears(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Annual Increment (%)</label><input type="number" value={calcIncrement} onChange={e => setCalcIncrement(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={retirementProjection}>
              <defs><linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="year" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
              <Tooltip formatter={v => `₹${Number(v).toLocaleString()}`} />
              <Area type="monotone" dataKey="balance" stroke="#3b82f6" fill="url(#retGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {epfVsVpfData.map((d, i) => (
              <div key={i} className={`p-4 rounded-lg ${i === 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                <p className="text-sm text-gray-600 dark:text-gray-300">{d.label}</p>
                <p className={`text-2xl font-bold mt-1 ${i === 0 ? 'text-blue-600' : 'text-green-600'}`}>₹{d.value.toLocaleString()}</p>
                <p className="text-xs text-gray-500">After {calcYears} years @ {EPF_RATE}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PF Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upload PF Statement</h2>
              <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Drop your PF passbook PDF or Excel here</p>
              <p className="text-xs text-gray-400">Supports PDF, XLSX formats from EPFO portal</p>
              <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Browse Files</button>
            </div>
            <button onClick={() => setShowUpload(false)} className="w-full mt-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">Close</button>
          </div>
        </div>
      )}
    </div>
    </MainLayout>
  );
}
