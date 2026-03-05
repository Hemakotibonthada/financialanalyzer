import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import MainLayout from '../components/MainLayout';
import {
  Heart, Activity, TrendingUp, TrendingDown, Shield, AlertTriangle, CheckCircle,
  Target, Wallet, PieChart, BarChart3, Clock, Calendar, Star, Award, Zap,
  ArrowUpRight, ArrowDownRight, ChevronRight, RefreshCw, Info, HelpCircle,
  DollarSign, CreditCard, Percent, FileText, Users, Home, Car, Briefcase,
  GraduationCap, Umbrella, Landmark, Building2, Globe, Gem, BookOpen, Coffee,
  ShoppingBag, Smartphone, Plane, Utensils, Fuel, Wrench, Stethoscope, Baby,
  Dumbbell, Music, Tv, Gift, ShoppingCart, Scale, ArrowRight, ArrowLeft,
  MoreVertical, X, Check, Search, Download, Share2, ExternalLink, Bell
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
//  FINANCIAL WELLNESS CENTER - Comprehensive Financial Health Analysis
// ═══════════════════════════════════════════════════════════════════════════════

const WELLNESS_PILLARS = [
  { key: 'spending', label: 'Spending Health', icon: ShoppingCart, color: '#3B82F6', description: 'How well you manage day-to-day expenses' },
  { key: 'savings', label: 'Savings Strength', icon: Wallet, color: '#10B981', description: 'Your ability to save consistently' },
  { key: 'debt', label: 'Debt Management', icon: CreditCard, color: '#EF4444', description: 'How effectively you handle debt' },
  { key: 'investment', label: 'Investment Growth', icon: TrendingUp, color: '#8B5CF6', description: 'Your investment portfolio performance' },
  { key: 'protection', label: 'Financial Protection', icon: Shield, color: '#F59E0B', description: 'Insurance and emergency preparedness' },
  { key: 'planning', label: 'Future Planning', icon: Target, color: '#EC4899', description: 'Retirement and goal planning progress' }
];

const HEALTH_CATEGORIES = {
  excellent: { label: 'Excellent', color: '#10B981', bg: 'bg-emerald-50 dark:bg-emerald-900/20', range: [80, 100] },
  good: { label: 'Good', color: '#3B82F6', bg: 'bg-blue-50 dark:bg-blue-900/20', range: [60, 79] },
  fair: { label: 'Fair', color: '#F59E0B', bg: 'bg-amber-50 dark:bg-amber-900/20', range: [40, 59] },
  poor: { label: 'Needs Attention', color: '#EF4444', bg: 'bg-red-50 dark:bg-red-900/20', range: [0, 39] }
};

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  const abs = Math.abs(amount);
  if (abs >= 10000000) return `${amount < 0 ? '-' : ''}₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `${amount < 0 ? '-' : ''}₹${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `${amount < 0 ? '-' : ''}₹${(abs / 1000).toFixed(1)}K`;
  return `${amount < 0 ? '-' : ''}₹${abs.toFixed(0)}`;
};

const getHealthCategory = (score) => {
  if (score >= 80) return HEALTH_CATEGORIES.excellent;
  if (score >= 60) return HEALTH_CATEGORIES.good;
  if (score >= 40) return HEALTH_CATEGORIES.fair;
  return HEALTH_CATEGORIES.poor;
};

// ─── CircularProgressRing ────────────────────────────────────────────────────

const CircularProgressRing = ({ value, maxValue = 100, size = 120, strokeWidth = 8, color, label, sublabel, palette }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / maxValue, 1);
  const offset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={palette.text === 'text-white' ? 'rgba(71,85,105,0.3)' : 'rgba(226,232,240,0.8)'} strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${palette.text}`}>{Math.round(value)}</span>
          {sublabel && <span className={`text-[10px] ${palette.textMuted}`}>{sublabel}</span>}
        </div>
      </div>
      {label && <span className={`text-sm font-medium ${palette.textSub} mt-2`}>{label}</span>}
    </div>
  );
};

// ─── PillarScoreCard ─────────────────────────────────────────────────────────

const PillarScoreCard = ({ pillar, score, details, palette, onClick }) => {
  const Icon = pillar.icon;
  const category = getHealthCategory(score);

  return (
    <div onClick={onClick} className={`${palette.card} rounded-xl border p-5 cursor-pointer group hover:shadow-lg transition-all duration-300`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${pillar.color}15` }}>
            <Icon className="w-6 h-6" style={{ color: pillar.color }} />
          </div>
          <div>
            <h3 className={`font-semibold ${palette.text} group-hover:text-blue-500 transition-colors`}>{pillar.label}</h3>
            <p className={`text-xs ${palette.textMuted}`}>{pillar.description}</p>
          </div>
        </div>
        <ChevronRight className={`w-5 h-5 ${palette.textMuted} group-hover:translate-x-1 transition-transform`} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16">
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="26" fill="none" stroke={palette.text === 'text-white' ? 'rgba(71,85,105,0.3)' : 'rgba(226,232,240,0.8)'} strokeWidth="5" />
              <circle cx="32" cy="32" r="26" fill="none" stroke={pillar.color} strokeWidth="5" strokeDasharray={`${2 * Math.PI * 26}`} strokeDashoffset={`${2 * Math.PI * 26 * (1 - score / 100)}`} strokeLinecap="round" transform="rotate(-90 32 32)" className="transition-all duration-700" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-sm font-bold ${palette.text}`}>{score}</span>
            </div>
          </div>
          <div>
            <span className="text-sm font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${category.color}15`, color: category.color }}>{category.label}</span>
          </div>
        </div>

        {details && (
          <div className="text-right space-y-1">
            {details.slice(0, 2).map((detail, i) => (
              <p key={i} className={`text-xs ${palette.textMuted}`}>{detail}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── WellnessScoreGauge ──────────────────────────────────────────────────────

const WellnessScoreGauge = ({ score, previousScore, palette }) => {
  const category = getHealthCategory(score);
  const change = score - (previousScore || score);

  return (
    <div className={`${palette.card} rounded-2xl border p-6 text-center`}>
      <h2 className={`text-xl font-bold ${palette.text} mb-6`}>Financial Wellness Score</h2>
      
      <div className="relative inline-block mb-6">
        <svg width="200" height="120" viewBox="0 0 200 120">
          {/* Background arc */}
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={palette.text === 'text-white' ? 'rgba(71,85,105,0.3)' : 'rgba(226,232,240,0.8)'} strokeWidth="12" strokeLinecap="round" />
          {/* Score arc */}
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={category.color} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${Math.PI * 80}`} strokeDashoffset={`${Math.PI * 80 * (1 - score / 100)}`} className="transition-all duration-1000 ease-out" />
          {/* Score text */}
          <text x="100" y="80" textAnchor="middle" className={`fill-current ${palette.text}`} style={{ fontSize: '36px', fontWeight: 'bold' }}>{score}</text>
          <text x="100" y="100" textAnchor="middle" className={`fill-current ${palette.textMuted}`} style={{ fontSize: '12px' }}>/100</text>
        </svg>
      </div>

      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="text-lg font-bold px-4 py-1 rounded-full" style={{ backgroundColor: `${category.color}15`, color: category.color }}>{category.label}</span>
        {change !== 0 && (
          <span className={`flex items-center gap-1 text-sm font-medium ${change > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {change > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {change > 0 ? '+' : ''}{change.toFixed(0)} pts
          </span>
        )}
      </div>

      <p className={`text-sm ${palette.textMuted} max-w-sm mx-auto`}>
        {score >= 80 ? 'Your financial health is excellent! Keep maintaining your good habits.' :
         score >= 60 ? 'You\'re on a good track. Focus on the areas highlighted below.' :
         score >= 40 ? 'There\'s room for improvement. Review the recommendations carefully.' :
         'Your finances need attention. Let\'s work on improving key areas.'}
      </p>
    </div>
  );
};

// ─── SpendingHealthDetail ────────────────────────────────────────────────────

const SpendingHealthDetail = ({ data, palette }) => {
  const categories = useMemo(() => {
    if (!data?.categoryBreakdown) return [];
    return Object.entries(data.categoryBreakdown)
      .map(([key, value]) => ({ name: key, amount: value.amount || 0, percentage: value.percentage || 0, budget: value.budget || 0, trend: value.trend || 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [data]);

  const insights = useMemo(() => {
    const results = [];
    if (data?.needsVsWants) {
      const needsPct = data.needsVsWants.needs || 0;
      const wantsPct = data.needsVsWants.wants || 0;
      if (needsPct > 60) results.push({ type: 'warning', text: `${needsPct}% of spending goes to necessities. Consider finding savings opportunities.` });
      if (wantsPct > 40) results.push({ type: 'warning', text: `${wantsPct}% of spending is discretionary. Review non-essential expenses.` });
    }
    if (data?.avgDailySpend > 0) {
      results.push({ type: 'info', text: `Your average daily spending is ${formatCurrency(data.avgDailySpend)}.` });
    }
    if (data?.topMerchant) {
      results.push({ type: 'info', text: `Top merchant: ${data.topMerchant.name} (${formatCurrency(data.topMerchant.amount)} this month)` });
    }
    if (data?.impulseSpendingScore > 30) {
      results.push({ type: 'warning', text: `Impulse spending score is ${data.impulseSpendingScore}/100. Try the 24-hour rule.` });
    }
    return results;
  }, [data]);

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-6">
        <ShoppingCart className="w-5 h-5 text-blue-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>Spending Analysis</h3>
      </div>

      {/* 50/30/20 Rule Comparison */}
      {data?.needsVsWants && (
        <div className="mb-6">
          <p className={`text-sm font-medium ${palette.text} mb-3`}>50/30/20 Rule Analysis</p>
          <div className="space-y-3">
            {[
              { label: 'Needs (Target: 50%)', actual: data.needsVsWants.needs || 0, target: 50, color: '#3B82F6' },
              { label: 'Wants (Target: 30%)', actual: data.needsVsWants.wants || 0, target: 30, color: '#8B5CF6' },
              { label: 'Savings (Target: 20%)', actual: data.needsVsWants.savings || 0, target: 20, color: '#10B981' }
            ].map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className={palette.textSub}>{item.label}</span>
                  <span className={`font-medium ${Math.abs(item.actual - item.target) <= 5 ? 'text-emerald-500' : 'text-amber-500'}`}>{item.actual.toFixed(0)}%</span>
                </div>
                <div className="relative h-3 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, item.actual)}%`, backgroundColor: item.color }} />
                  <div className="absolute top-0 h-full w-0.5 bg-white dark:bg-slate-900" style={{ left: `${item.target}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {categories.length > 0 && (
        <div className="mb-6">
          <p className={`text-sm font-medium ${palette.text} mb-3`}>Top Categories</p>
          <div className="space-y-2">
            {categories.slice(0, 6).map((cat, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className={palette.text}>{cat.name}</span>
                    <span className={palette.textSub}>{formatCurrency(cat.amount)}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${cat.percentage}%` }} />
                  </div>
                </div>
                <span className={`text-xs ${cat.trend > 0 ? 'text-red-500' : cat.trend < 0 ? 'text-emerald-500' : palette.textMuted}`}>
                  {cat.trend > 0 ? `+${cat.trend}%` : cat.trend < 0 ? `${cat.trend}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spending Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          <p className={`text-sm font-medium ${palette.text} mb-2`}>Insights</p>
          {insights.map((insight, i) => (
            <div key={i} className={`flex items-start gap-2 p-3 rounded-lg ${insight.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/10' : 'bg-blue-50 dark:bg-blue-900/10'}`}>
              {insight.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" /> : <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />}
              <p className={`text-sm ${palette.textSub}`}>{insight.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── SavingsHealthDetail ─────────────────────────────────────────────────────

const SavingsHealthDetail = ({ data, palette }) => {
  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-6">
        <Wallet className="w-5 h-5 text-emerald-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>Savings Analysis</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className={`${palette.card} rounded-xl border p-4 text-center`}>
          <p className={`text-xs ${palette.textMuted} mb-1`}>Savings Rate</p>
          <p className={`text-2xl font-bold ${(data?.savingsRate || 0) >= 20 ? 'text-emerald-500' : 'text-amber-500'}`}>{(data?.savingsRate || 0).toFixed(1)}%</p>
          <p className={`text-xs ${palette.textMuted}`}>Target: 20%+</p>
        </div>
        <div className={`${palette.card} rounded-xl border p-4 text-center`}>
          <p className={`text-xs ${palette.textMuted} mb-1`}>Monthly Savings</p>
          <p className={`text-2xl font-bold text-emerald-500`}>{formatCurrency(data?.monthlySavings || 0)}</p>
          <p className={`text-xs ${palette.textMuted}`}>Avg 6 months</p>
        </div>
        <div className={`${palette.card} rounded-xl border p-4 text-center`}>
          <p className={`text-xs ${palette.textMuted} mb-1`}>Emergency Fund</p>
          <p className={`text-2xl font-bold ${(data?.emergencyFundMonths || 0) >= 6 ? 'text-emerald-500' : (data?.emergencyFundMonths || 0) >= 3 ? 'text-amber-500' : 'text-red-500'}`}>{(data?.emergencyFundMonths || 0).toFixed(1)} mo</p>
          <p className={`text-xs ${palette.textMuted}`}>Target: 6 months</p>
        </div>
        <div className={`${palette.card} rounded-xl border p-4 text-center`}>
          <p className={`text-xs ${palette.textMuted} mb-1`}>Consistency Score</p>
          <p className={`text-2xl font-bold ${(data?.consistencyScore || 0) >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{data?.consistencyScore || 0}/100</p>
          <p className={`text-xs ${palette.textMuted}`}>Last 12 months</p>
        </div>
      </div>

      {/* Savings Trend Chart */}
      {data?.savingsTrend && data.savingsTrend.length > 0 && (
        <div className="mb-6">
          <p className={`text-sm font-medium ${palette.text} mb-3`}>Monthly Savings Trend</p>
          <div className="flex items-end gap-1 h-32">
            {data.savingsTrend.map((item, i) => {
              const maxAmount = Math.max(...data.savingsTrend.map(t => Math.abs(t.amount)));
              const height = maxAmount > 0 ? (Math.abs(item.amount) / maxAmount) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div className="w-full relative" style={{ height: '110px' }}>
                    <div className={`absolute bottom-0 w-full rounded-t-sm ${item.amount >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ height: `${height}%` }} />
                  </div>
                  <span className={`text-[9px] ${palette.textMuted} mt-1`}>{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Savings Recommendations */}
      <div className="space-y-2">
        <p className={`text-sm font-medium ${palette.text} mb-2`}>Recommendations</p>
        {[
          data?.savingsRate < 20 && { icon: Target, text: `Increase savings rate to 20%. You could save an additional ${formatCurrency((data?.monthlyIncome || 0) * 0.2 - (data?.monthlySavings || 0))}/month.` },
          data?.emergencyFundMonths < 6 && { icon: Shield, text: 'Build your emergency fund to cover at least 6 months of expenses.' },
          data?.hasAutomatedSavings === false && { icon: Zap, text: 'Set up automated transfers to your savings account on payday.' },
          { icon: Star, text: 'Consider high-yield savings accounts or liquid mutual funds for better returns.' }
        ].filter(Boolean).map((rec, i) => {
          const RecIcon = rec.icon;
          return (
            <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10">
              <RecIcon className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <p className={`text-sm ${palette.textSub}`}>{rec.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── DebtHealthDetail ────────────────────────────────────────────────────────

const DebtHealthDetail = ({ data, palette }) => {
  const debtItems = useMemo(() => {
    if (!data?.debts) return [];
    return data.debts.sort((a, b) => b.interestRate - a.interestRate);
  }, [data]);

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-6">
        <CreditCard className="w-5 h-5 text-red-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>Debt Health</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className={`${palette.card} rounded-xl border p-4 text-center`}>
          <p className={`text-xs ${palette.textMuted} mb-1`}>Total Debt</p>
          <p className="text-2xl font-bold text-red-500">{formatCurrency(data?.totalDebt || 0)}</p>
        </div>
        <div className={`${palette.card} rounded-xl border p-4 text-center`}>
          <p className={`text-xs ${palette.textMuted} mb-1`}>Debt-to-Income</p>
          <p className={`text-2xl font-bold ${(data?.dti || 0) < 36 ? 'text-emerald-500' : (data?.dti || 0) < 50 ? 'text-amber-500' : 'text-red-500'}`}>{(data?.dti || 0).toFixed(1)}%</p>
          <p className={`text-xs ${palette.textMuted}`}>Target: &lt;36%</p>
        </div>
        <div className={`${palette.card} rounded-xl border p-4 text-center`}>
          <p className={`text-xs ${palette.textMuted} mb-1`}>Avg Interest Rate</p>
          <p className={`text-2xl font-bold ${palette.text}`}>{(data?.avgInterestRate || 0).toFixed(1)}%</p>
        </div>
        <div className={`${palette.card} rounded-xl border p-4 text-center`}>
          <p className={`text-xs ${palette.textMuted} mb-1`}>Monthly Payments</p>
          <p className={`text-2xl font-bold text-amber-500`}>{formatCurrency(data?.monthlyPayments || 0)}</p>
        </div>
      </div>

      {/* Debt Payoff Strategy */}
      {data?.payoffStrategy && (
        <div className="mb-6">
          <p className={`text-sm font-medium ${palette.text} mb-3`}>Recommended Strategy: {data.payoffStrategy.name}</p>
          <p className={`text-sm ${palette.textMuted} mb-3`}>{data.payoffStrategy.description}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-lg ${palette.card} border`}>
              <p className={`text-xs ${palette.textMuted}`}>Est. Payoff Date</p>
              <p className={`text-sm font-bold ${palette.text}`}>{data.payoffStrategy.estimatedDate || 'N/A'}</p>
            </div>
            <div className={`p-3 rounded-lg ${palette.card} border`}>
              <p className={`text-xs ${palette.textMuted}`}>Interest Saved</p>
              <p className="text-sm font-bold text-emerald-500">{formatCurrency(data.payoffStrategy.interestSaved || 0)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Debt Items */}
      {debtItems.length > 0 && (
        <div className="space-y-3">
          <p className={`text-sm font-medium ${palette.text} mb-2`}>Debt Breakdown</p>
          {debtItems.map((debt, i) => (
            <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${palette.card} border`}>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-8 rounded-full ${i === 0 ? 'bg-red-500' : i === 1 ? 'bg-amber-500' : 'bg-blue-500'}`} />
                <div>
                  <p className={`text-sm font-medium ${palette.text}`}>{debt.name}</p>
                  <p className={`text-xs ${palette.textMuted}`}>{debt.interestRate}% APR</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${palette.text}`}>{formatCurrency(debt.balance)}</p>
                <p className={`text-xs ${palette.textMuted}`}>{formatCurrency(debt.monthlyPayment)}/mo</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── InvestmentHealthDetail ──────────────────────────────────────────────────

const InvestmentHealthDetail = ({ data, palette }) => {
  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-violet-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>Investment Health</h3>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className={`${palette.card} rounded-xl border p-4 text-center`}>
          <p className={`text-xs ${palette.textMuted} mb-1`}>Portfolio Value</p>
          <p className={`text-xl font-bold ${palette.text}`}>{formatCurrency(data?.portfolioValue || 0)}</p>
        </div>
        <div className={`${palette.card} rounded-xl border p-4 text-center`}>
          <p className={`text-xs ${palette.textMuted} mb-1`}>XIRR Return</p>
          <p className={`text-xl font-bold ${(data?.xirr || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{(data?.xirr || 0).toFixed(1)}%</p>
        </div>
        <div className={`${palette.card} rounded-xl border p-4 text-center`}>
          <p className={`text-xs ${palette.textMuted} mb-1`}>Diversification</p>
          <p className={`text-xl font-bold ${(data?.diversificationScore || 0) >= 70 ? 'text-emerald-500' : 'text-amber-500'}`}>{data?.diversificationScore || 0}/100</p>
        </div>
      </div>

      {/* Asset Mix */}
      {data?.assetMix && (
        <div className="mb-6">
          <p className={`text-sm font-medium ${palette.text} mb-3`}>Asset Mix</p>
          <div className="flex h-4 rounded-full overflow-hidden mb-2">
            {Object.entries(data.assetMix).map(([key, value], i) => {
              const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500'];
              return <div key={key} className={`${colors[i % colors.length]} transition-all duration-700`} style={{ width: `${value}%` }} />;
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {Object.entries(data.assetMix).map(([key, value], i) => {
              const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500'];
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${colors[i % colors.length]}`} />
                  <span className={`text-xs ${palette.textSub}`}>{key}: {value}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Risk Assessment */}
      {data?.riskProfile && (
        <div className="mb-6">
          <p className={`text-sm font-medium ${palette.text} mb-2`}>Risk Profile</p>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className={`text-xs ${palette.textMuted}`}>Conservative</span>
                <span className={`text-xs ${palette.textMuted}`}>Aggressive</span>
              </div>
              <div className="relative h-3 rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 opacity-30">
                <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-blue-500 shadow-lg" style={{ left: `${data.riskProfile.score}%` }} />
              </div>
            </div>
            <span className={`text-sm font-medium ${palette.text}`}>{data.riskProfile.label}</span>
          </div>
        </div>
      )}

      {/* Performance vs Benchmark */}
      {data?.benchmarkComparison && (
        <div className="space-y-2">
          <p className={`text-sm font-medium ${palette.text} mb-2`}>Performance vs Benchmarks</p>
          {Object.entries(data.benchmarkComparison).map(([bench, returns], i) => (
            <div key={bench} className="flex items-center justify-between p-2 rounded-lg">
              <span className={`text-sm ${palette.textSub}`}>{bench}</span>
              <span className={`text-sm font-medium ${returns >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{returns >= 0 ? '+' : ''}{returns.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── ProtectionHealthDetail ──────────────────────────────────────────────────

const ProtectionHealthDetail = ({ data, palette }) => {
  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-5 h-5 text-amber-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>Financial Protection</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className={`${palette.card} rounded-xl border p-4 text-center`}>
          <p className={`text-xs ${palette.textMuted} mb-1`}>Life Cover</p>
          <p className={`text-xl font-bold ${(data?.lifeCoverMultiple || 0) >= 10 ? 'text-emerald-500' : 'text-amber-500'}`}>{(data?.lifeCoverMultiple || 0).toFixed(0)}x</p>
          <p className={`text-xs ${palette.textMuted}`}>of annual income</p>
        </div>
        <div className={`${palette.card} rounded-xl border p-4 text-center`}>
          <p className={`text-xs ${palette.textMuted} mb-1`}>Health Cover</p>
          <p className={`text-xl font-bold ${palette.text}`}>{formatCurrency(data?.healthCover || 0)}</p>
          <p className={`text-xs ${palette.textMuted}`}>Sum insured</p>
        </div>
        <div className={`${palette.card} rounded-xl border p-4 text-center`}>
          <p className={`text-xs ${palette.textMuted} mb-1`}>Emergency Fund</p>
          <p className={`text-xl font-bold ${(data?.emergencyFundMonths || 0) >= 6 ? 'text-emerald-500' : 'text-amber-500'}`}>{(data?.emergencyFundMonths || 0).toFixed(1)} mo</p>
        </div>
        <div className={`${palette.card} rounded-xl border p-4 text-center`}>
          <p className={`text-xs ${palette.textMuted} mb-1`}>Will/Nomination</p>
          <p className={`text-xl font-bold ${data?.hasWill ? 'text-emerald-500' : 'text-red-500'}`}>{data?.hasWill ? 'Yes' : 'No'}</p>
        </div>
      </div>

      {/* Insurance Checklist */}
      <div className="space-y-2">
        <p className={`text-sm font-medium ${palette.text} mb-2`}>Protection Checklist</p>
        {[
          { label: 'Term Life Insurance', done: data?.hasTermLife, details: data?.termLifeDetails },
          { label: 'Health Insurance', done: data?.hasHealthInsurance, details: data?.healthInsuranceDetails },
          { label: 'Critical Illness Cover', done: data?.hasCriticalIllness },
          { label: 'Personal Accident Cover', done: data?.hasAccidentCover },
          { label: 'Home Insurance', done: data?.hasHomeInsurance },
          { label: 'Emergency Fund (6+ months)', done: (data?.emergencyFundMonths || 0) >= 6 },
          { label: 'Will & Nominations Updated', done: data?.hasWill },
          { label: 'Adequate Liability Coverage', done: data?.hasLiabilityCoverage }
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${item.done ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                {item.done ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-red-500" />}
              </div>
              <span className={`text-sm ${palette.text}`}>{item.label}</span>
            </div>
            {item.details && <span className={`text-xs ${palette.textMuted}`}>{item.details}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── PlanningHealthDetail ────────────────────────────────────────────────────

const PlanningHealthDetail = ({ data, palette }) => {
  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-6">
        <Target className="w-5 h-5 text-pink-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>Future Planning</h3>
      </div>

      {/* Retirement Readiness */}
      <div className="mb-6">
        <p className={`text-sm font-medium ${palette.text} mb-3`}>Retirement Readiness</p>
        <div className="grid grid-cols-2 gap-4">
          <div className={`${palette.card} rounded-xl border p-4 text-center`}>
            <p className={`text-xs ${palette.textMuted} mb-1`}>Current Corpus</p>
            <p className={`text-lg font-bold ${palette.text}`}>{formatCurrency(data?.retirementCorpus || 0)}</p>
          </div>
          <div className={`${palette.card} rounded-xl border p-4 text-center`}>
            <p className={`text-xs ${palette.textMuted} mb-1`}>Target Corpus</p>
            <p className={`text-lg font-bold text-blue-500`}>{formatCurrency(data?.retirementTarget || 0)}</p>
          </div>
        </div>
        {data?.retirementTarget > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className={palette.textMuted}>{((data?.retirementCorpus || 0) / data.retirementTarget * 100).toFixed(0)}% complete</span>
              <span className={palette.textMuted}>{data?.yearsToRetirement || 0} years left</span>
            </div>
            <div className="w-full h-3 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700" style={{ width: `${Math.min(100, (data?.retirementCorpus || 0) / data.retirementTarget * 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Goals Progress */}
      {data?.goals && data.goals.length > 0 && (
        <div className="space-y-3">
          <p className={`text-sm font-medium ${palette.text} mb-2`}>Financial Goals</p>
          {data.goals.slice(0, 5).map((goal, i) => {
            const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
            return (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className={palette.text}>{goal.name}</span>
                  <span className={palette.textSub}>{progress.toFixed(0)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, progress)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── ActionItemsPanel ────────────────────────────────────────────────────────

const ActionItemsPanel = ({ actions, palette }) => {
  const [completedActions, setCompletedActions] = useState(new Set());

  const toggleAction = (id) => {
    setCompletedActions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const priorityColors = {
    high: { bg: 'bg-red-50 dark:bg-red-900/10', icon: 'text-red-500', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    medium: { bg: 'bg-amber-50 dark:bg-amber-900/10', icon: 'text-amber-500', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    low: { bg: 'bg-blue-50 dark:bg-blue-900/10', icon: 'text-blue-500', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' }
  };

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-blue-500" />
          <h3 className={`text-lg font-bold ${palette.text}`}>Action Items</h3>
        </div>
        <span className={`text-sm ${palette.textMuted}`}>{completedActions.size}/{actions?.length || 0} done</span>
      </div>

      {actions && actions.length > 0 ? (
        <div className="space-y-3">
          {actions.map((action, i) => {
            const isDone = completedActions.has(i);
            const colors = priorityColors[action.priority] || priorityColors.low;
            return (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${isDone ? 'opacity-50' : ''} ${colors.bg} transition-all`}>
                <button onClick={() => toggleAction(i)} className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isDone ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-slate-600'}`}>
                  {isDone && <Check className="w-3 h-3 text-white" />}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${palette.text} ${isDone ? 'line-through' : ''}`}>{action.title}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${colors.badge}`}>{action.priority}</span>
                  </div>
                  <p className={`text-xs ${palette.textMuted} mt-0.5`}>{action.description}</p>
                  {action.impact && <p className={`text-xs text-emerald-500 mt-1`}>Impact: {action.impact}</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <p className={`font-medium ${palette.text}`}>All Caught Up!</p>
          <p className={`text-sm ${palette.textMuted}`}>No pending action items</p>
        </div>
      )}
    </div>
  );
};

// ─── HistoricalTrendChart ────────────────────────────────────────────────────

const HistoricalTrendChart = ({ history, palette }) => {
  if (!history || history.length < 2) {
    return (
      <div className={`${palette.card} rounded-2xl border p-6 text-center`}>
        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className={`${palette.textMuted}`}>Not enough history to show trends</p>
      </div>
    );
  }

  const maxScore = Math.max(...history.map(h => h.score));
  const minScore = Math.min(...history.map(h => h.score));
  const range = maxScore - minScore || 1;

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-indigo-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>Wellness Score History</h3>
      </div>
      <div className="relative h-48">
        <svg width="100%" height="100%" viewBox="0 0 800 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id="wellnessGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
            </linearGradient>
          </defs>
          {(() => {
            const points = history.map((h, i) => ({
              x: (i / (history.length - 1)) * 800,
              y: 200 - ((h.score - minScore) / range) * 180
            }));
            const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            const areaPath = linePath + ` L ${points[points.length - 1].x} 200 L ${points[0].x} 200 Z`;
            return (
              <>
                <path d={areaPath} fill="url(#wellnessGrad)" />
                <path d={linePath} fill="none" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" />
                {points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 12)) === 0).map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="3" fill="#6366F1" stroke="white" strokeWidth="2" />
                ))}
              </>
            );
          })()}
        </svg>
      </div>
      <div className="flex justify-between mt-2">
        <span className={`text-xs ${palette.textMuted}`}>{history[0]?.date ? new Date(history[0].date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) : ''}</span>
        <span className={`text-xs ${palette.textMuted}`}>{history[history.length - 1]?.date ? new Date(history[history.length - 1].date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) : ''}</span>
      </div>
    </div>
  );
};

// ─── Main FinancialWellness Component ────────────────────────────────────────

const FinancialWellness = () => {
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

  const [loading, setLoading] = useState(true);
  const [selectedPillar, setSelectedPillar] = useState(null);
  const [wellnessScore, setWellnessScore] = useState(0);
  const [previousScore, setPreviousScore] = useState(0);
  const [pillarScores, setPillarScores] = useState({});
  const [pillarDetails, setPillarDetails] = useState({});
  const [actionItems, setActionItems] = useState([]);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [spendingData, setSpendingData] = useState(null);
  const [savingsData, setSavingsData] = useState(null);
  const [debtData, setDebtData] = useState(null);
  const [investmentData, setInvestmentData] = useState(null);
  const [protectionData, setProtectionData] = useState(null);
  const [planningData, setPlanningData] = useState(null);

  const fetchWellnessData = useCallback(async () => {
    try {
      setLoading(true);
      const [wellnessRes, actionsRes, historyRes] = await Promise.allSettled([
        api.get('/financial-insights/wellness-score'),
        api.get('/financial-insights/action-items'),
        api.get('/financial-insights/wellness-history')
      ]);

      if (wellnessRes.status === 'fulfilled' && wellnessRes.value?.data?.data) {
        const d = wellnessRes.value.data.data;
        setWellnessScore(d.overallScore || 0);
        setPreviousScore(d.previousScore || 0);
        setPillarScores(d.pillarScores || {});
        setPillarDetails(d.pillarDetails || {});
        setSpendingData(d.spending || null);
        setSavingsData(d.savings || null);
        setDebtData(d.debt || null);
        setInvestmentData(d.investment || null);
        setProtectionData(d.protection || null);
        setPlanningData(d.planning || null);
      }
      if (actionsRes.status === 'fulfilled') setActionItems(actionsRes.value?.data?.data || []);
      if (historyRes.status === 'fulfilled') setScoreHistory(historyRes.value?.data?.data || []);
    } catch (err) { console.error('Failed to fetch wellness data:', err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchWellnessData(); }, [fetchWellnessData]);

  if (loading) {
    return (
      <MainLayout title="Financial Wellness">
        <div className={`min-h-screen ${palette.bg} flex items-center justify-center`}>
          <div className="text-center"><RefreshCw className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" /><p className={palette.textSub}>Analyzing your financial wellness...</p></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Financial Wellness" subtitle="Your comprehensive financial health assessment">
      <div className={`min-h-screen ${palette.bg} p-4 lg:p-6`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className={`text-2xl lg:text-3xl font-bold ${palette.text}`}>Financial Wellness Center</h1>
            <p className={`${palette.textSub} mt-1`}>Understand and improve your financial health</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchWellnessData} className={`flex items-center gap-2 px-4 py-2 rounded-xl ${palette.btnBg} border ${palette.btnBorder} ${palette.text} text-sm font-medium`}>
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium shadow-lg text-sm">
              <Download className="w-4 h-4" /> Export Report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <WellnessScoreGauge score={wellnessScore} previousScore={previousScore} palette={palette} />
          <div className="lg:col-span-2">
            <HistoricalTrendChart history={scoreHistory} palette={palette} />
          </div>
        </div>

        {/* Pillar Scores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {WELLNESS_PILLARS.map((pillar) => (
            <PillarScoreCard
              key={pillar.key}
              pillar={pillar}
              score={pillarScores[pillar.key] || 0}
              details={pillarDetails[pillar.key]}
              palette={palette}
              onClick={() => setSelectedPillar(selectedPillar === pillar.key ? null : pillar.key)}
            />
          ))}
        </div>

        {/* Pillar Detail Views */}
        {selectedPillar && (
          <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {selectedPillar === 'spending' && <SpendingHealthDetail data={spendingData} palette={palette} />}
            {selectedPillar === 'savings' && <SavingsHealthDetail data={savingsData} palette={palette} />}
            {selectedPillar === 'debt' && <DebtHealthDetail data={debtData} palette={palette} />}
            {selectedPillar === 'investment' && <InvestmentHealthDetail data={investmentData} palette={palette} />}
            {selectedPillar === 'protection' && <ProtectionHealthDetail data={protectionData} palette={palette} />}
            {selectedPillar === 'planning' && <PlanningHealthDetail data={planningData} palette={palette} />}
            <ActionItemsPanel actions={actionItems.filter(a => a.pillar === selectedPillar || !a.pillar)} palette={palette} />
          </div>
        )}

        {!selectedPillar && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActionItemsPanel actions={actionItems} palette={palette} />
            <div className="space-y-6">
              {spendingData && <SpendingHealthDetail data={spendingData} palette={palette} />}
              {savingsData && <SavingsHealthDetail data={savingsData} palette={palette} />}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default FinancialWellness;
