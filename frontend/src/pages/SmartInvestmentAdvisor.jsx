import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import MainLayout from '../components/MainLayout';
import {
  TrendingUp, TrendingDown, BarChart3, LineChart, PieChart, Brain,
  Target, Shield, AlertTriangle, CheckCircle, Wallet, Building2, Gem,
  Globe, Briefcase, RefreshCw, Download, Filter, Calendar, ChevronRight,
  Star, Award, Zap, Activity, Info, Plus, ArrowUp, ArrowDown,
  ArrowUpRight, ArrowDownRight, Layers, Percent, Scale, Lightbulb,
  Calculator, Clock, Eye, BarChart2, Search, Bell, Settings, Share2,
  Minus, X, Check, ExternalLink, CreditCard, Lock, Unlock, Heart,
  ThumbsUp, ThumbsDown, Bookmark, BookOpen, GraduationCap, HelpCircle
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
//  SMART INVESTMENT ADVISOR - AI-Powered Investment Recommendations
// ═══════════════════════════════════════════════════════════════════════════════

const RISK_PROFILES = {
  conservative: { label: 'Conservative', color: '#10B981', equity: 20, debt: 60, gold: 10, cash: 10, description: 'Focus on capital preservation with steady returns' },
  moderate: { label: 'Moderate', color: '#3B82F6', equity: 40, debt: 40, gold: 10, cash: 10, description: 'Balanced approach between growth and stability' },
  balanced: { label: 'Balanced', color: '#8B5CF6', equity: 55, debt: 30, gold: 10, cash: 5, description: 'Equal weightage to growth and income' },
  growth: { label: 'Growth', color: '#F59E0B', equity: 70, debt: 20, gold: 5, cash: 5, description: 'Aggressive growth with moderate risk' },
  aggressive: { label: 'Aggressive', color: '#EF4444', equity: 85, debt: 10, gold: 3, cash: 2, description: 'Maximum growth potential with high risk tolerance' }
};

const INVESTMENT_TYPES = {
  equity_large_cap: { label: 'Large Cap Funds', risk: 'moderate', expectedReturn: '12-15%', icon: Building2 },
  equity_mid_cap: { label: 'Mid Cap Funds', risk: 'high', expectedReturn: '14-18%', icon: TrendingUp },
  equity_small_cap: { label: 'Small Cap Funds', risk: 'very_high', expectedReturn: '15-22%', icon: Zap },
  equity_flexi_cap: { label: 'Flexi Cap Funds', risk: 'moderate', expectedReturn: '13-16%', icon: Layers },
  debt_liquid: { label: 'Liquid Funds', risk: 'low', expectedReturn: '5-7%', icon: Wallet },
  debt_corporate: { label: 'Corporate Bond Funds', risk: 'low', expectedReturn: '7-9%', icon: Briefcase },
  debt_gilt: { label: 'Gilt Funds', risk: 'moderate', expectedReturn: '6-8%', icon: Shield },
  hybrid_balanced: { label: 'Balanced Advantage', risk: 'moderate', expectedReturn: '10-13%', icon: Scale },
  gold_etf: { label: 'Gold ETF/SGB', risk: 'moderate', expectedReturn: '8-10%', icon: Gem },
  ppf: { label: 'PPF', risk: 'very_low', expectedReturn: '7.1%', icon: Lock },
  nps: { label: 'NPS', risk: 'moderate', expectedReturn: '9-12%', icon: Target },
  fd: { label: 'Fixed Deposit', risk: 'very_low', expectedReturn: '6-8%', icon: Shield },
  elss: { label: 'ELSS (Tax Saver)', risk: 'high', expectedReturn: '12-16%', icon: Percent },
  index_fund: { label: 'Index Funds', risk: 'moderate', expectedReturn: '12-14%', icon: BarChart3 },
  international: { label: 'International Funds', risk: 'high', expectedReturn: '10-15%', icon: Globe },
  reit: { label: 'REITs', risk: 'moderate', expectedReturn: '8-12%', icon: Building2 }
};

const formatCurrency = (amount) => {
  if (!amount || isNaN(amount)) return '₹0';
  const abs = Math.abs(amount);
  if (abs >= 10000000) return `${amount < 0 ? '-' : ''}₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `${amount < 0 ? '-' : ''}₹${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `${amount < 0 ? '-' : ''}₹${(abs / 1000).toFixed(1)}K`;
  return `${amount < 0 ? '-' : ''}₹${abs.toFixed(0)}`;
};

// ─── RiskProfileQuiz ─────────────────────────────────────────────────────────

const RiskProfileQuiz = ({ onComplete, palette }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});

  const questions = [
    {
      id: 'age', question: 'What is your age group?',
      options: [
        { value: 'under25', label: 'Under 25', score: 5 },
        { value: '25-35', label: '25-35', score: 4 },
        { value: '35-45', label: '35-45', score: 3 },
        { value: '45-55', label: '45-55', score: 2 },
        { value: 'above55', label: 'Above 55', score: 1 }
      ]
    },
    {
      id: 'horizon', question: 'What is your investment time horizon?',
      options: [
        { value: 'less1', label: 'Less than 1 year', score: 1 },
        { value: '1-3', label: '1-3 years', score: 2 },
        { value: '3-5', label: '3-5 years', score: 3 },
        { value: '5-10', label: '5-10 years', score: 4 },
        { value: 'more10', label: 'More than 10 years', score: 5 }
      ]
    },
    {
      id: 'reaction', question: 'If your portfolio dropped 20% in a month, what would you do?',
      options: [
        { value: 'sell_all', label: 'Sell everything immediately', score: 1 },
        { value: 'sell_some', label: 'Sell some to reduce losses', score: 2 },
        { value: 'hold', label: 'Hold and wait for recovery', score: 3 },
        { value: 'buy_some', label: 'Buy more at lower prices', score: 4 },
        { value: 'buy_aggressive', label: 'Aggressively buy the dip', score: 5 }
      ]
    },
    {
      id: 'goal', question: 'What is your primary investment goal?',
      options: [
        { value: 'preserve', label: 'Preserve capital', score: 1 },
        { value: 'income', label: 'Regular income', score: 2 },
        { value: 'balanced', label: 'Balanced growth & income', score: 3 },
        { value: 'growth', label: 'Long-term wealth growth', score: 4 },
        { value: 'max_growth', label: 'Maximum capital appreciation', score: 5 }
      ]
    },
    {
      id: 'income_stability', question: 'How stable is your income?',
      options: [
        { value: 'very_unstable', label: 'Very variable/uncertain', score: 1 },
        { value: 'somewhat_unstable', label: 'Somewhat variable', score: 2 },
        { value: 'stable', label: 'Stable salaried income', score: 3 },
        { value: 'stable_savings', label: 'Stable with good savings', score: 4 },
        { value: 'very_stable', label: 'Multiple stable income sources', score: 5 }
      ]
    },
    {
      id: 'experience', question: 'How experienced are you with investing?',
      options: [
        { value: 'none', label: 'No experience', score: 1 },
        { value: 'basic', label: 'Basic knowledge (FDs, savings)', score: 2 },
        { value: 'moderate', label: 'Some mutual fund/stock experience', score: 3 },
        { value: 'experienced', label: 'Active investor for 3+ years', score: 4 },
        { value: 'expert', label: 'Expert with diverse portfolio', score: 5 }
      ]
    },
    {
      id: 'dependents', question: 'How many financial dependents do you have?',
      options: [
        { value: 'many', label: '4 or more', score: 1 },
        { value: 'some', label: '2-3', score: 2 },
        { value: 'few', label: '1', score: 3 },
        { value: 'none', label: 'None', score: 4 },
        { value: 'none_high_income', label: 'None, with high disposable income', score: 5 }
      ]
    },
    {
      id: 'emergency_fund', question: 'Do you have an emergency fund?',
      options: [
        { value: 'none', label: 'No emergency fund', score: 1 },
        { value: 'less3', label: 'Less than 3 months expenses', score: 2 },
        { value: '3-6', label: '3-6 months expenses', score: 3 },
        { value: '6-12', label: '6-12 months expenses', score: 4 },
        { value: 'more12', label: 'More than 12 months', score: 5 }
      ]
    }
  ];

  const handleAnswer = (questionId, answer) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate risk profile
      const totalScore = Object.values(newAnswers).reduce((sum, a) => sum + a.score, 0);
      const maxScore = questions.length * 5;
      const normalizedScore = (totalScore / maxScore) * 100;

      let profile = 'balanced';
      if (normalizedScore >= 80) profile = 'aggressive';
      else if (normalizedScore >= 65) profile = 'growth';
      else if (normalizedScore >= 50) profile = 'balanced';
      else if (normalizedScore >= 35) profile = 'moderate';
      else profile = 'conservative';

      onComplete(profile, normalizedScore);
    }
  };

  const q = questions[currentQuestion];

  return (
    <div className={`${palette.card} rounded-2xl border p-8 max-w-2xl mx-auto`}>
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-xl font-bold ${palette.text}`}>Risk Profile Assessment</h3>
          <span className={`text-sm ${palette.textMuted}`}>{currentQuestion + 1} of {questions.length}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500" style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      <h4 className={`text-lg font-semibold ${palette.text} mb-6`}>{q.question}</h4>

      <div className="space-y-3">
        {q.options.map((option, i) => (
          <button key={i} onClick={() => handleAnswer(q.id, option)} className={`w-full text-left p-4 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text} hover:border-blue-500 hover:shadow-md transition-all duration-200 group`}>
            <div className="flex items-center justify-between">
              <span className="font-medium group-hover:text-blue-500 transition-colors">{option.label}</span>
              <ChevronRight className={`w-4 h-4 ${palette.textMuted} group-hover:text-blue-500 group-hover:translate-x-1 transition-all`} />
            </div>
          </button>
        ))}
      </div>

      {currentQuestion > 0 && (
        <button onClick={() => setCurrentQuestion(currentQuestion - 1)} className={`mt-4 text-sm ${palette.textMuted} hover:text-blue-500 transition-colors`}>
          ← Previous question
        </button>
      )}
    </div>
  );
};

// ─── AssetAllocationRecommendation ───────────────────────────────────────────

const AssetAllocationRecommendation = ({ profile, currentAllocation, palette }) => {
  const profileData = RISK_PROFILES[profile] || RISK_PROFILES.balanced;
  const recommended = { equity: profileData.equity, debt: profileData.debt, gold: profileData.gold, cash: profileData.cash };

  const colors = { equity: '#3B82F6', debt: '#10B981', gold: '#F59E0B', cash: '#8B5CF6' };
  const labels = { equity: 'Equity', debt: 'Debt', gold: 'Gold', cash: 'Cash' };

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-6">
        <PieChart className="w-5 h-5 text-blue-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>Recommended Asset Allocation</h3>
      </div>
      
      <div className="flex items-center justify-center gap-4 mb-6">
        <span className="text-sm font-medium px-3 py-1 rounded-full" style={{ backgroundColor: `${profileData.color}15`, color: profileData.color }}>{profileData.label}</span>
        <span className={`text-sm ${palette.textMuted}`}>{profileData.description}</span>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Recommended */}
        <div>
          <h4 className={`text-sm font-medium ${palette.textSub} mb-3 text-center`}>Recommended</h4>
          <div className="flex h-4 rounded-full overflow-hidden mb-3">
            {Object.entries(recommended).map(([key, value]) => (
              <div key={key} style={{ width: `${value}%`, backgroundColor: colors[key] }} className="transition-all duration-700" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(recommended).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[key] }} />
                <span className={`text-xs ${palette.textSub}`}>{labels[key]}: {value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Current */}
        <div>
          <h4 className={`text-sm font-medium ${palette.textSub} mb-3 text-center`}>Current</h4>
          <div className="flex h-4 rounded-full overflow-hidden mb-3">
            {Object.entries(currentAllocation || { equity: 25, debt: 25, gold: 25, cash: 25 }).map(([key, value]) => (
              <div key={key} style={{ width: `${value}%`, backgroundColor: colors[key] }} className="transition-all duration-700" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(currentAllocation || { equity: 25, debt: 25, gold: 25, cash: 25 }).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[key] }} />
                <span className={`text-xs ${palette.textSub}`}>{labels[key]}: {value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rebalancing Actions */}
      <div className="space-y-2 pt-4 border-t" style={{ borderColor: palette.text === 'text-white' ? 'rgba(71,85,105,0.3)' : 'rgba(226,232,240,0.8)' }}>
        <h4 className={`text-sm font-medium ${palette.text} mb-2`}>Rebalancing Actions</h4>
        {Object.entries(recommended).map(([key, target]) => {
          const current = (currentAllocation || {})[key] || 0;
          const diff = target - current;
          if (Math.abs(diff) < 2) return null;
          return (
            <div key={key} className="flex items-center justify-between p-2 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[key] }} />
                <span className={`text-sm ${palette.text}`}>{labels[key]}</span>
              </div>
              <span className={`text-sm font-medium ${diff > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {diff > 0 ? `+${diff}%` : `${diff}%`} ({diff > 0 ? 'Increase' : 'Decrease'})
              </span>
            </div>
          );
        }).filter(Boolean)}
      </div>
    </div>
  );
};

// ─── InvestmentRecommendationCard ────────────────────────────────────────────

const InvestmentRecommendationCard = ({ recommendation, palette, onBookmark }) => {
  const [bookmarked, setBookmarked] = useState(false);
  const typeInfo = INVESTMENT_TYPES[recommendation.type] || {};
  const Icon = typeInfo.icon || TrendingUp;

  const riskColors = {
    very_low: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
    low: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
    moderate: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
    high: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20',
    very_high: 'text-red-500 bg-red-50 dark:bg-red-900/20'
  };

  return (
    <div className={`${palette.card} rounded-xl border p-5 hover:shadow-lg transition-all duration-300 group`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className={`font-semibold ${palette.text}`}>{recommendation.name}</h4>
            <p className={`text-xs ${palette.textMuted}`}>{typeInfo.label || recommendation.type}</p>
          </div>
        </div>
        <button onClick={() => { setBookmarked(!bookmarked); onBookmark?.(recommendation); }} className={`p-2 rounded-lg transition-colors ${bookmarked ? 'text-amber-500' : palette.textMuted}`}>
          <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p className={`text-xs ${palette.textMuted}`}>Expected Return</p>
          <p className={`text-sm font-bold text-emerald-500`}>{recommendation.expectedReturn || typeInfo.expectedReturn || 'N/A'}</p>
        </div>
        <div>
          <p className={`text-xs ${palette.textMuted}`}>Min Investment</p>
          <p className={`text-sm font-bold ${palette.text}`}>{formatCurrency(recommendation.minInvestment || 500)}</p>
        </div>
        <div>
          <p className={`text-xs ${palette.textMuted}`}>Risk Level</p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${riskColors[recommendation.risk || typeInfo.risk || 'moderate']}`}>
            {(recommendation.risk || typeInfo.risk || 'moderate').replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {recommendation.description && (
        <p className={`text-sm ${palette.textSub} mb-4`}>{recommendation.description}</p>
      )}

      {recommendation.reasons && recommendation.reasons.length > 0 && (
        <div className="space-y-1 mb-4">
          <p className={`text-xs font-medium ${palette.textMuted} mb-1`}>Why this fund?</p>
          {recommendation.reasons.slice(0, 3).map((reason, i) => (
            <div key={i} className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span className={`text-xs ${palette.textSub}`}>{reason}</span>
            </div>
          ))}
        </div>
      )}

      {/* Suitability Score */}
      {recommendation.suitabilityScore && (
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className={palette.textMuted}>Suitability for you</span>
            <span className={`font-medium ${recommendation.suitabilityScore >= 80 ? 'text-emerald-500' : recommendation.suitabilityScore >= 60 ? 'text-blue-500' : 'text-amber-500'}`}>
              {recommendation.suitabilityScore}%
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${recommendation.suitabilityScore >= 80 ? 'bg-emerald-500' : recommendation.suitabilityScore >= 60 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${recommendation.suitabilityScore}%` }} />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium text-sm hover:shadow-lg transition-all">
          Invest Now
        </button>
        <button className={`px-4 py-2 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text} text-sm font-medium hover:border-blue-500 transition-all`}>
          Details
        </button>
      </div>
    </div>
  );
};

// ─── SIPCalculatorWidget ─────────────────────────────────────────────────────

const SIPCalculatorWidget = ({ palette }) => {
  const [monthlyAmount, setMonthlyAmount] = useState(10000);
  const [years, setYears] = useState(10);
  const [expectedReturn, setExpectedReturn] = useState(12);
  const [isLumpsum, setIsLumpsum] = useState(false);

  const result = useMemo(() => {
    const monthlyRate = expectedReturn / 12 / 100;
    const months = years * 12;
    let futureValue, totalInvested;

    if (isLumpsum) {
      totalInvested = monthlyAmount;
      futureValue = monthlyAmount * Math.pow(1 + expectedReturn / 100, years);
    } else {
      totalInvested = monthlyAmount * months;
      futureValue = monthlyAmount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
    }

    const wealthGained = futureValue - totalInvested;
    return { futureValue, totalInvested, wealthGained };
  }, [monthlyAmount, years, expectedReturn, isLumpsum]);

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-6">
        <Calculator className="w-5 h-5 text-indigo-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>{isLumpsum ? 'Lumpsum' : 'SIP'} Calculator</h3>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setIsLumpsum(false)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${!isLumpsum ? 'bg-blue-500 text-white' : `${palette.textSub}`}`}>SIP</button>
        <button onClick={() => setIsLumpsum(true)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isLumpsum ? 'bg-blue-500 text-white' : `${palette.textSub}`}`}>Lumpsum</button>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <div className="flex justify-between mb-1">
            <label className={`text-sm ${palette.textSub}`}>{isLumpsum ? 'Investment Amount' : 'Monthly SIP'}</label>
            <span className={`text-sm font-medium ${palette.text}`}>{formatCurrency(monthlyAmount)}</span>
          </div>
          <input type="range" min="500" max="500000" step="500" value={monthlyAmount} onChange={e => setMonthlyAmount(parseInt(e.target.value))} className="w-full accent-blue-500" />
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <label className={`text-sm ${palette.textSub}`}>Time Period</label>
            <span className={`text-sm font-medium ${palette.text}`}>{years} years</span>
          </div>
          <input type="range" min="1" max="40" value={years} onChange={e => setYears(parseInt(e.target.value))} className="w-full accent-blue-500" />
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <label className={`text-sm ${palette.textSub}`}>Expected Return</label>
            <span className={`text-sm font-medium ${palette.text}`}>{expectedReturn}%</span>
          </div>
          <input type="range" min="1" max="30" value={expectedReturn} onChange={e => setExpectedReturn(parseInt(e.target.value))} className="w-full accent-blue-500" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-4 border-t" style={{ borderColor: palette.text === 'text-white' ? 'rgba(71,85,105,0.3)' : 'rgba(226,232,240,0.8)' }}>
        <div className="text-center">
          <p className={`text-xs ${palette.textMuted} mb-1`}>Invested</p>
          <p className={`text-sm font-bold ${palette.text}`}>{formatCurrency(result.totalInvested)}</p>
        </div>
        <div className="text-center">
          <p className={`text-xs ${palette.textMuted} mb-1`}>Wealth Gained</p>
          <p className="text-sm font-bold text-emerald-500">{formatCurrency(result.wealthGained)}</p>
        </div>
        <div className="text-center">
          <p className={`text-xs ${palette.textMuted} mb-1`}>Total Value</p>
          <p className="text-sm font-bold text-blue-500">{formatCurrency(result.futureValue)}</p>
        </div>
      </div>

      {/* Visual breakdown */}
      <div className="mt-4">
        <div className="flex h-6 rounded-full overflow-hidden">
          <div className="bg-blue-500 transition-all duration-700" style={{ width: `${(result.totalInvested / result.futureValue) * 100}%` }} />
          <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${(result.wealthGained / result.futureValue) * 100}%` }} />
        </div>
        <div className="flex justify-between mt-1 text-xs">
          <span className="text-blue-500">Investment ({((result.totalInvested / result.futureValue) * 100).toFixed(0)}%)</span>
          <span className="text-emerald-500">Returns ({((result.wealthGained / result.futureValue) * 100).toFixed(0)}%)</span>
        </div>
      </div>
    </div>
  );
};

// ─── MarketInsightsWidget ────────────────────────────────────────────────────

const MarketInsightsWidget = ({ insights, palette }) => {
  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-5 h-5 text-cyan-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>Market Insights</h3>
      </div>

      <div className="space-y-3">
        {(insights || [
          { index: 'Nifty 50', value: '22,450', change: '+1.2%', positive: true },
          { index: 'Sensex', value: '74,230', change: '+1.1%', positive: true },
          { index: 'Nifty Bank', value: '48,120', change: '-0.3%', positive: false },
          { index: 'Nifty IT', value: '34,560', change: '+2.1%', positive: true },
          { index: 'Gold (₹/10g)', value: '72,450', change: '+0.5%', positive: true },
          { index: 'USD/INR', value: '83.25', change: '-0.1%', positive: true }
        ]).map((item, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-opacity-50 transition-colors" style={{ backgroundColor: palette.text === 'text-white' ? 'rgba(30,41,59,0.3)' : 'rgba(248,250,252,0.8)' }}>
            <div>
              <p className={`text-sm font-medium ${palette.text}`}>{item.index}</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-bold ${palette.text}`}>{item.value}</p>
              <p className={`text-xs font-medium ${item.positive ? 'text-emerald-500' : 'text-red-500'}`}>{item.change}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── InvestmentEducationCard ─────────────────────────────────────────────────

const InvestmentEducationCard = ({ palette }) => {
  const [expandedTopic, setExpandedTopic] = useState(null);

  const topics = [
    { id: 'sip', title: 'SIP vs Lumpsum', icon: Calculator, content: 'SIP (Systematic Investment Plan) allows investing fixed amounts regularly, averaging out market volatility through rupee cost averaging. Lumpsum is ideal when markets are low or for large windfalls. For most investors, SIP is recommended for disciplined investing.' },
    { id: 'diversification', title: 'Why Diversify?', icon: PieChart, content: 'Diversification reduces risk by spreading investments across asset classes, sectors, and geographies. Don\'t put all eggs in one basket. A well-diversified portfolio typically includes equity, debt, gold, and real estate.' },
    { id: 'tax', title: 'Tax-Efficient Investing', icon: Percent, content: 'ELSS funds offer tax deduction under Section 80C (₹1.5L). Long-term equity gains are tax-free up to ₹1L/year. Debt fund gains after 3 years qualify for indexation benefit. PPF and NPS offer additional tax benefits.' },
    { id: 'compound', title: 'Power of Compounding', icon: TrendingUp, content: 'Compounding means earning returns on your returns. Starting early is crucial - investing ₹10,000/month from age 25 at 12% gives ₹3.5Cr by 55. Starting at 35 would give only ₹1Cr. Time is your biggest advantage.' },
    { id: 'risk', title: 'Understanding Risk', icon: Shield, content: 'Risk and return are directly related. Higher potential returns come with higher risk. Your risk tolerance depends on age, income stability, dependents, and investment horizon. Match your portfolio to your risk profile.' },
    { id: 'rebalance', title: 'Portfolio Rebalancing', icon: Scale, content: 'Rebalancing means periodically adjusting your portfolio back to target allocation. When equity grows beyond target, sell some and buy debt. This enforces "buy low, sell high" discipline. Rebalance annually or when allocation drifts 5%+.' }
  ];

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-4">
        <GraduationCap className="w-5 h-5 text-violet-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>Investment Education</h3>
      </div>

      <div className="space-y-2">
        {topics.map((topic) => {
          const TopicIcon = topic.icon;
          const isExpanded = expandedTopic === topic.id;
          return (
            <div key={topic.id}>
              <button onClick={() => setExpandedTopic(isExpanded ? null : topic.id)} className={`w-full flex items-center justify-between p-3 rounded-xl ${palette.btnBg} border ${palette.btnBorder} transition-all`}>
                <div className="flex items-center gap-2">
                  <TopicIcon className="w-4 h-4 text-blue-500" />
                  <span className={`text-sm font-medium ${palette.text}`}>{topic.title}</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${palette.textMuted} transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </button>
              {isExpanded && (
                <div className={`p-4 mt-1 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800`}>
                  <p className={`text-sm ${palette.textSub} leading-relaxed`}>{topic.content}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main SmartInvestmentAdvisor Component ───────────────────────────────────

const SmartInvestmentAdvisor = () => {
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
  const [riskProfile, setRiskProfile] = useState(null);
  const [riskScore, setRiskScore] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [activeTab, setActiveTab] = useState('recommendations');
  const [recommendations, setRecommendations] = useState([]);
  const [currentAllocation, setCurrentAllocation] = useState(null);
  const [marketInsights, setMarketInsights] = useState(null);

  const fetchAdvisorData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileRes, recsRes, allocRes] = await Promise.allSettled([
        api.get('/investments/risk-profile'),
        api.get('/investments/recommendations'),
        api.get('/investments/current-allocation')
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value?.data?.data?.riskProfile) {
        setRiskProfile(profileRes.value.data.data.riskProfile);
        setRiskScore(profileRes.value.data.data.riskScore || 50);
      } else {
        setShowQuiz(true);
      }

      if (recsRes.status === 'fulfilled' && recsRes.value?.data?.data?.length > 0) {
        setRecommendations(recsRes.value.data.data);
      } else {
        setRecommendations([]);
      }

      if (allocRes.status === 'fulfilled' && allocRes.value?.data?.data) {
        setCurrentAllocation(allocRes.value.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch advisor data:', err);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAdvisorData(); }, [fetchAdvisorData]);

  // No hardcoded default recommendations — show empty state if API returns no data

  const handleQuizComplete = (profile, score) => {
    setRiskProfile(profile);
    setRiskScore(score);
    setShowQuiz(false);
    // Save to backend
    api.post('/investments/risk-profile', { riskProfile: profile, riskScore: score }).catch(console.error);
  };

  const tabs = [
    { key: 'recommendations', label: 'Recommendations', icon: Lightbulb },
    { key: 'allocation', label: 'Asset Allocation', icon: PieChart },
    { key: 'calculator', label: 'Calculator', icon: Calculator },
    { key: 'education', label: 'Learn', icon: GraduationCap },
    { key: 'market', label: 'Market', icon: Globe }
  ];

  if (loading) {
    return (
      <MainLayout title="Investment Advisor">
        <div className={`min-h-screen ${palette.bg} flex items-center justify-center`}>
          <div className="text-center"><RefreshCw className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" /><p className={palette.textSub}>Analyzing your investment profile...</p></div>
        </div>
      </MainLayout>
    );
  }

  if (showQuiz) {
    return (
      <MainLayout title="Investment Advisor">
        <div className={`min-h-screen ${palette.bg} p-4 lg:p-6`}>
          <div className="mb-6">
            <h1 className={`text-2xl font-bold ${palette.text}`}>Smart Investment Advisor</h1>
            <p className={`${palette.textSub} mt-1`}>Let's determine your risk profile first</p>
          </div>
          <RiskProfileQuiz onComplete={handleQuizComplete} palette={palette} />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Investment Advisor" subtitle="AI-powered investment recommendations">
      <div className={`min-h-screen ${palette.bg} p-4 lg:p-6`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className={`text-2xl lg:text-3xl font-bold ${palette.text}`}>Smart Investment Advisor</h1>
            <p className={`${palette.textSub} mt-1`}>Personalized investment recommendations based on your profile</p>
          </div>
          <div className="flex items-center gap-3">
            {riskProfile && (
              <span className="text-sm font-medium px-3 py-1.5 rounded-full" style={{ backgroundColor: `${(RISK_PROFILES[riskProfile] || RISK_PROFILES.balanced).color}15`, color: (RISK_PROFILES[riskProfile] || RISK_PROFILES.balanced).color }}>
                {(RISK_PROFILES[riskProfile] || RISK_PROFILES.balanced).label} Investor
              </span>
            )}
            <button onClick={() => setShowQuiz(true)} className={`flex items-center gap-2 px-4 py-2 rounded-xl ${palette.btnBg} border ${palette.btnBorder} ${palette.text} text-sm font-medium`}>
              <RefreshCw className="w-4 h-4" /> Retake Quiz
            </button>
          </div>
        </div>

        <div className={`flex items-center gap-1 p-1 rounded-xl ${palette.card} border mb-6 overflow-x-auto`}>
          {tabs.map(tab => {
            const TabIcon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${activeTab === tab.key ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md' : `${palette.textSub} hover:bg-opacity-10 hover:bg-blue-500`}`}>
                <TabIcon className="w-4 h-4" />{tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'recommendations' && (
          <div>
            {recommendations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.map((rec, i) => (
                  <InvestmentRecommendationCard key={i} recommendation={rec} palette={palette} />
                ))}
              </div>
            ) : (
              <div className={`text-center py-16 rounded-xl border-2 border-dashed ${palette.border}`}>
                <Target className="w-12 h-12 mx-auto mb-4 text-blue-400 opacity-50" />
                <h3 className={`text-lg font-semibold ${palette.text} mb-2`}>No Recommendations Yet</h3>
                <p className={`${palette.textSub} text-sm max-w-md mx-auto`}>Complete your risk profile quiz above to get personalized investment recommendations based on your financial goals.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'allocation' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AssetAllocationRecommendation profile={riskProfile} currentAllocation={currentAllocation} palette={palette} />
            <SIPCalculatorWidget palette={palette} />
          </div>
        )}

        {activeTab === 'calculator' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SIPCalculatorWidget palette={palette} />
            <InvestmentEducationCard palette={palette} />
          </div>
        )}

        {activeTab === 'education' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <InvestmentEducationCard palette={palette} />
            <MarketInsightsWidget insights={marketInsights} palette={palette} />
          </div>
        )}

        {activeTab === 'market' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MarketInsightsWidget insights={marketInsights} palette={palette} />
            <SIPCalculatorWidget palette={palette} />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default SmartInvestmentAdvisor;
