import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator, IndianRupee, Percent, Clock, Download, Plus, Trash2,
  TrendingDown, BarChart3, ArrowRight, ChevronDown, ChevronUp, FileSpreadsheet, Scale
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';
import MainLayout from '../components/MainLayout';
import api from '../services/api';

const AnimatedValue = ({ end, prefix = '₹' }) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    let s; const r = { current: null };
    const a = (t) => { if (!s) s = t; const p = Math.min((t - s) / 1200, 1); setV((1 - Math.pow(1 - p, 3)) * end); if (p < 1) r.current = requestAnimationFrame(a); };
    r.current = requestAnimationFrame(a); return () => cancelAnimationFrame(r.current);
  }, [end]);
  return <span>{prefix}{Math.round(v).toLocaleString()}</span>;
};

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

function calcEMI(P, annualRate, tenureMonths) {
  if (!P || !annualRate || !tenureMonths) return 0;
  const r = annualRate / 12 / 100;
  return (P * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
}

function generateSchedule(P, annualRate, tenureMonths, prepayMonth = 0, prepayAmt = 0) {
  const r = annualRate / 12 / 100;
  const emi = calcEMI(P, annualRate, tenureMonths);
  const schedule = [];
  let balance = P;
  for (let m = 1; m <= tenureMonths && balance > 0; m++) {
    let interest = balance * r;
    let principal = emi - interest;
    if (prepayMonth && m === prepayMonth) {
      balance -= prepayAmt;
      if (balance < 0) balance = 0;
    }
    if (principal > balance) principal = balance;
    balance -= principal;
    schedule.push({ month: m, emi: Math.round(emi), principal: Math.round(principal), interest: Math.round(interest), balance: Math.round(Math.max(balance, 0)) });
    if (balance <= 0) break;
  }
  return schedule;
}

export default function LoanCalculator() {
  const [loading, setLoading] = useState(true);
  const [loanAmount, setLoanAmount] = useState(2500000);
  const [interestRate, setInterestRate] = useState(8.5);
  const [tenure, setTenure] = useState(240);
  const [prepayMonth, setPrepayMonth] = useState(0);
  const [prepayAmount, setPrepayAmount] = useState(0);
  const [showSchedule, setShowSchedule] = useState(false);
  const [compareLoans, setCompareLoans] = useState([
    { id: 1, name: 'Bank A', amount: 2500000, rate: 8.5, tenure: 240 },
    { id: 2, name: 'Bank B', amount: 2500000, rate: 9.0, tenure: 240 },
  ]);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => { setTimeout(() => setLoading(false), 500); }, []);

  const emi = useMemo(() => calcEMI(loanAmount, interestRate, tenure), [loanAmount, interestRate, tenure]);
  const totalPayable = emi * tenure;
  const totalInterest = totalPayable - loanAmount;
  const schedule = useMemo(() => generateSchedule(loanAmount, interestRate, tenure, prepayMonth, prepayAmount), [loanAmount, interestRate, tenure, prepayMonth, prepayAmount]);

  const pieData = [
    { name: 'Principal', value: loanAmount },
    { name: 'Interest', value: Math.round(totalInterest) },
  ];

  const chartData = useMemo(() => {
    const step = Math.max(1, Math.floor(schedule.length / 24));
    return schedule.filter((_, i) => i % step === 0 || i === schedule.length - 1).map((s) => ({
      month: `M${s.month}`, principal: s.principal, interest: s.interest, balance: s.balance
    }));
  }, [schedule]);

  const exportSchedule = () => {
    const header = 'Month,EMI,Principal,Interest,Balance\n';
    const rows = schedule.map((s) => `${s.month},${s.emi},${s.principal},${s.interest},${s.balance}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'amortization_schedule.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const addCompareLoan = () => {
    if (compareLoans.length >= 3) return;
    setCompareLoans([...compareLoans, { id: Date.now(), name: `Bank ${String.fromCharCode(65 + compareLoans.length)}`, amount: 2500000, rate: 9.5, tenure: 240 }]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading calculator...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout title="Loan Calculator">
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="animate-fade-in-up">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Calculator className="w-8 h-8 text-blue-600" /> Loan EMI Calculator
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Calculate EMI, view amortization & compare loan offers</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Panel */}
          <div className="lg:col-span-1 space-y-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Loan Parameters</h2>

              <div>
                <div className="flex justify-between text-sm mb-2"><span className="text-slate-600 dark:text-slate-400 flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" /> Loan Amount</span><span className="font-semibold text-slate-900 dark:text-white">₹{loanAmount.toLocaleString()}</span></div>
                <input type="range" min={100000} max={50000000} step={50000} value={loanAmount} onChange={(e) => setLoanAmount(+e.target.value)} className="w-full accent-blue-600" />
                <div className="flex justify-between text-xs text-slate-400 mt-1"><span>₹1L</span><span>₹5Cr</span></div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2"><span className="text-slate-600 dark:text-slate-400 flex items-center gap-1"><Percent className="w-3.5 h-3.5" /> Interest Rate</span><span className="font-semibold text-slate-900 dark:text-white">{interestRate}%</span></div>
                <input type="range" min={1} max={30} step={0.1} value={interestRate} onChange={(e) => setInterestRate(+e.target.value)} className="w-full accent-blue-600" />
                <div className="flex justify-between text-xs text-slate-400 mt-1"><span>1%</span><span>30%</span></div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2"><span className="text-slate-600 dark:text-slate-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Tenure</span><span className="font-semibold text-slate-900 dark:text-white">{tenure} months ({(tenure / 12).toFixed(1)} yrs)</span></div>
                <input type="range" min={12} max={360} step={12} value={tenure} onChange={(e) => setTenure(+e.target.value)} className="w-full accent-blue-600" />
                <div className="flex justify-between text-xs text-slate-400 mt-1"><span>1 yr</span><span>30 yrs</span></div>
              </div>

              {/* Prepayment */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-emerald-600" /> Prepayment</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Prepay at Month</label>
                    <input type="number" min={0} max={tenure} value={prepayMonth} onChange={(e) => setPrepayMonth(+e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm border-0 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Prepay Amount</label>
                    <input type="number" min={0} value={prepayAmount} onChange={(e) => setPrepayAmount(+e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm border-0 outline-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 dashboard-grid animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Monthly EMI</p>
                <p className="text-xl font-bold text-blue-600"><AnimatedValue end={Math.round(emi)} /></p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Interest</p>
                <p className="text-xl font-bold text-amber-600"><AnimatedValue end={Math.round(totalInterest)} /></p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Payable</p>
                <p className="text-xl font-bold text-emerald-600"><AnimatedValue end={Math.round(totalPayable)} /></p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Interest Ratio</p>
                <p className="text-xl font-bold text-purple-600">{totalPayable ? ((totalInterest / totalPayable) * 100).toFixed(1) : 0}%</p>
              </div>
            </div>

            {/* Chart Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pie */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">EMI Breakdown</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={4} animationBegin={200} animationDuration={1200}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 mt-2">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs"><div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} /><span className="text-slate-600 dark:text-slate-400">{d.name}: ₹{d.value.toLocaleString()}</span></div>
                  ))}
                </div>
              </div>

              {/* Area Chart */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Payment Over Time</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                    <Area type="monotone" dataKey="principal" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                    <Area type="monotone" dataKey="interest" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Amortization Schedule */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
              <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
                <button onClick={() => setShowSchedule(!showSchedule)} className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" /> Amortization Schedule
                  {showSchedule ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button onClick={exportSchedule} className="bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 shadow-lg shadow-blue-600/30 px-3 py-1.5 flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>
              {showSchedule && (
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-700">
                      <tr className="text-xs text-slate-500 dark:text-slate-400">
                        <th className="text-left p-3">Month</th>
                        <th className="text-right p-3">EMI</th>
                        <th className="text-right p-3">Principal</th>
                        <th className="text-right p-3">Interest</th>
                        <th className="text-right p-3">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map((s) => (
                        <tr key={s.month} className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="p-3 text-slate-900 dark:text-white font-medium">{s.month}</td>
                          <td className="p-3 text-right text-slate-700 dark:text-slate-300">₹{s.emi.toLocaleString()}</td>
                          <td className="p-3 text-right text-blue-600">₹{s.principal.toLocaleString()}</td>
                          <td className="p-3 text-right text-amber-600">₹{s.interest.toLocaleString()}</td>
                          <td className="p-3 text-right text-slate-900 dark:text-white font-medium">₹{s.balance.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Comparison Tool */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2"><Scale className="w-5 h-5 text-purple-600" /> Compare Loan Offers</h3>
                <div className="flex gap-2">
                  <button onClick={() => setShowCompare(!showCompare)} className="text-sm text-blue-600 hover:underline">{showCompare ? 'Hide' : 'Show'}</button>
                  {compareLoans.length < 3 && <button onClick={addCompareLoan} className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600"><Plus className="w-4 h-4" /></button>}
                </div>
              </div>
              {showCompare && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {compareLoans.map((loan) => {
                      const loanEmi = calcEMI(loan.amount, loan.rate, loan.tenure);
                      const loanTotal = loanEmi * loan.tenure;
                      const loanInterest = loanTotal - loan.amount;
                      return (
                        <div key={loan.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 relative">
                          {compareLoans.length > 1 && (
                            <button onClick={() => setCompareLoans(compareLoans.filter((l) => l.id !== loan.id))} className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                          )}
                          <input value={loan.name} onChange={(e) => setCompareLoans(compareLoans.map((l) => l.id === loan.id ? { ...l, name: e.target.value } : l))} className="font-semibold text-sm text-slate-900 dark:text-white bg-transparent border-0 outline-none w-full mb-3" />
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between"><span className="text-slate-500">Amount</span>
                              <input type="number" value={loan.amount} onChange={(e) => setCompareLoans(compareLoans.map((l) => l.id === loan.id ? { ...l, amount: +e.target.value } : l))} className="w-24 text-right bg-white dark:bg-slate-600 rounded px-2 py-0.5 text-slate-900 dark:text-white outline-none" />
                            </div>
                            <div className="flex justify-between"><span className="text-slate-500">Rate %</span>
                              <input type="number" step="0.1" value={loan.rate} onChange={(e) => setCompareLoans(compareLoans.map((l) => l.id === loan.id ? { ...l, rate: +e.target.value } : l))} className="w-24 text-right bg-white dark:bg-slate-600 rounded px-2 py-0.5 text-slate-900 dark:text-white outline-none" />
                            </div>
                            <div className="flex justify-between"><span className="text-slate-500">Tenure (m)</span>
                              <input type="number" value={loan.tenure} onChange={(e) => setCompareLoans(compareLoans.map((l) => l.id === loan.id ? { ...l, tenure: +e.target.value } : l))} className="w-24 text-right bg-white dark:bg-slate-600 rounded px-2 py-0.5 text-slate-900 dark:text-white outline-none" />
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600 space-y-1">
                            <div className="flex justify-between text-xs"><span className="text-slate-500">EMI</span><span className="font-semibold text-blue-600">₹{Math.round(loanEmi).toLocaleString()}</span></div>
                            <div className="flex justify-between text-xs"><span className="text-slate-500">Total Interest</span><span className="font-semibold text-amber-600">₹{Math.round(loanInterest).toLocaleString()}</span></div>
                            <div className="flex justify-between text-xs"><span className="text-slate-500">Total Cost</span><span className="font-semibold text-slate-900 dark:text-white">₹{Math.round(loanTotal).toLocaleString()}</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </MainLayout>
  );
}
