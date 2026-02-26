import React, { useState, useMemo, useEffect } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import {
  Trophy, TrendingUp, Target, Shield, Award, Star, ChevronRight,
  ArrowUp, ArrowDown, Share2, Download, CheckCircle, AlertTriangle,
  Zap, DollarSign, PiggyBank, Briefcase, Heart, Lock,
  Calendar, ExternalLink, Info
} from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

const categoryScores = [
  { category: 'Savings', score: 82, maxScore: 100, icon: PiggyBank, color: '#3B82F6', trend: 5, tips: ['Increase emergency fund to 6 months', 'Set up auto-transfer to savings'] },
  { category: 'Investments', score: 68, maxScore: 100, icon: TrendingUp, color: '#10B981', trend: 3, tips: ['Diversify into international funds', 'Start SIP in debt fund for stability'] },
  { category: 'Debt', score: 75, maxScore: 100, icon: DollarSign, color: '#F59E0B', trend: -2, tips: ['Pay off credit card first (highest interest)', 'Consider balance transfer'] },
  { category: 'Insurance', score: 55, maxScore: 100, icon: Shield, color: '#EF4444', trend: 0, tips: ['Get term life insurance ASAP', 'Increase health cover to ₹10L minimum'] },
  { category: 'Tax', score: 88, maxScore: 100, icon: Briefcase, color: '#8B5CF6', trend: 8, tips: ['Claim HRA exemption if renting', 'Invest remaining ₹35K in ELSS'] },
  { category: 'Budgeting', score: 72, maxScore: 100, icon: Target, color: '#EC4899', trend: 1, tips: ['Reduce dining-out expenses by 20%', 'Track subscriptions monthly'] },
];

const scoreTrend = [
  { month: 'Sep', score: 62 }, { month: 'Oct', score: 65 }, { month: 'Nov', score: 68 },
  { month: 'Dec', score: 70 }, { month: 'Jan', score: 72 }, { month: 'Feb', score: 75 },
];

const radarData = categoryScores.map(c => ({ subject: c.category, You: c.score, Peers: Math.min(c.score + Math.round((Math.random() - 0.5) * 20), 100) }));

const peerComparison = [
  { metric: 'Overall Score', you: 75, peerAvg: 68, percentile: 72 },
  { metric: 'Savings Rate', you: 28, peerAvg: 22, percentile: 78 },
  { metric: 'Debt-to-Income', you: 15, peerAvg: 25, percentile: 82 },
  { metric: 'Investment Returns', you: 14, peerAvg: 12, percentile: 65 },
  { metric: 'Insurance Score', you: 55, peerAvg: 50, percentile: 55 },
  { metric: 'Tax Efficiency', you: 88, peerAvg: 72, percentile: 88 },
];

const badges = [
  { name: 'Budget Master', desc: 'Stayed within budget for 3 months', icon: '🎯', earned: true, date: 'Jan 2026' },
  { name: 'Savings Star', desc: 'Saved 25%+ of income', icon: '⭐', earned: true, date: 'Feb 2026' },
  { name: 'Debt Slayer', desc: 'Paid off a loan early', icon: '⚔️', earned: true, date: 'Dec 2025' },
  { name: 'Tax Genius', desc: 'Maximized all deductions', icon: '🧠', earned: false, progress: 85 },
  { name: 'Investor Pro', desc: '10+ SIPs active', icon: '📈', earned: false, progress: 60 },
  { name: 'Insured & Secure', desc: 'Complete insurance coverage', icon: '🛡️', earned: false, progress: 40 },
  { name: 'Emergency Ready', desc: '6 months emergency fund', icon: '🏦', earned: false, progress: 70 },
  { name: 'Net Worth ₹1Cr', desc: 'Reached ₹1 crore net worth', icon: '💎', earned: false, progress: 35 },
];

const monthlyHistory = [
  { month: 'Sep 2025', overall: 62, savings: 70, investment: 55, debt: 65, insurance: 50, tax: 75 },
  { month: 'Oct 2025', overall: 65, savings: 73, investment: 58, debt: 68, insurance: 50, tax: 78 },
  { month: 'Nov 2025', overall: 68, savings: 76, investment: 62, debt: 70, insurance: 52, tax: 82 },
  { month: 'Dec 2025', overall: 70, savings: 78, investment: 65, debt: 72, insurance: 53, tax: 85 },
  { month: 'Jan 2026', overall: 72, savings: 80, investment: 66, debt: 74, insurance: 54, tax: 86 },
  { month: 'Feb 2026', overall: 75, savings: 82, investment: 68, debt: 75, insurance: 55, tax: 88 },
];

const recommendations = [
  { title: 'Get Term Life Insurance', impact: 15, priority: 'High', category: 'Insurance', desc: 'A ₹1Cr term plan costs just ₹800/mo at your age. This alone can boost your score by 15 points.' },
  { title: 'Increase Health Cover', impact: 10, priority: 'High', category: 'Insurance', desc: 'Upgrade from ₹3L to ₹10L health insurance. Super top-up is affordable.' },
  { title: 'Start International SIP', impact: 8, priority: 'Medium', category: 'Investments', desc: 'Allocate 10-15% to international equity for diversification.' },
  { title: 'Emergency Fund Top-up', impact: 7, priority: 'Medium', category: 'Savings', desc: 'Add ₹50K more to reach 6-month expense coverage.' },
  { title: 'Reduce Dining Expenses', impact: 5, priority: 'Low', category: 'Budgeting', desc: 'Cut dining out by 20% to save ₹3K/month more.' },
  { title: 'Max Out 80C Limit', impact: 4, priority: 'Low', category: 'Tax', desc: 'Invest remaining ₹35K in ELSS before March.' },
];

const tips = [
  'Automate your investments — set SIPs on salary day',
  'Review insurance annually — life changes need coverage updates',
  'Keep debt-to-income ratio under 30%',
  'Build 6 months of expenses in emergency fund',
  'Diversify across at least 3 asset classes',
  'File taxes early to avoid last-minute mistakes',
];

export default function FinancialScorecard() {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [expandedRec, setExpandedRec] = useState(null);
  const [tipIndex, setTipIndex] = useState(0);

  const overallScore = useMemo(() => Math.round(categoryScores.reduce((s, c) => s + c.score, 0) / categoryScores.length), []);
  const totalImpact = useMemo(() => recommendations.reduce((s, r) => s + r.impact, 0), []);
  const earnedBadges = useMemo(() => badges.filter(b => b.earned).length, []);

  useEffect(() => {
    let frame;
    let start = 0;
    const animate = () => {
      start += 1;
      if (start <= overallScore) {
        setAnimatedScore(start);
        frame = requestAnimationFrame(animate);
      }
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [overallScore]);

  useEffect(() => {
    const interval = setInterval(() => setTipIndex(i => (i + 1) % tips.length), 5000);
    return () => clearInterval(interval);
  }, []);

  const getGrade = (score) => {
    if (score >= 90) return { grade: 'A+', color: 'text-green-600' };
    if (score >= 80) return { grade: 'A', color: 'text-green-500' };
    if (score >= 70) return { grade: 'B+', color: 'text-blue-600' };
    if (score >= 60) return { grade: 'B', color: 'text-blue-500' };
    if (score >= 50) return { grade: 'C', color: 'text-amber-500' };
    return { grade: 'D', color: 'text-red-500' };
  };

  const gaugeAngle = (animatedScore / 100) * 270;
  const gaugeColor = animatedScore >= 80 ? '#10B981' : animatedScore >= 60 ? '#F59E0B' : '#EF4444';

  const describeArc = (x, y, r, startAngle, endAngle) => {
    const rad = (a) => ((a - 135) * Math.PI) / 180;
    const x1 = x + r * Math.cos(rad(startAngle));
    const y1 = y + r * Math.sin(rad(startAngle));
    const x2 = x + r * Math.cos(rad(endAngle));
    const y2 = y + r * Math.sin(rad(endAngle));
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-500" /> Financial Scorecard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your comprehensive financial health assessment</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm px-4 py-2 flex items-center gap-2">
            <Download className="w-4 h-4" /> Export Report
          </button>
          <button onClick={() => setShowShareModal(true)} className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 px-4 py-2 flex items-center gap-2">
            <Share2 className="w-4 h-4" /> Share Scorecard
          </button>
        </div>
      </div>

      {/* Rotating Tip */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800 flex items-center gap-3">
        <Zap className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <p className="text-sm text-blue-700 dark:text-blue-300 transition-all">{tips[tipIndex]}</p>
      </div>

      {/* Overall Score Gauge + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Overall Financial Score</h2>
          <svg width="220" height="190" viewBox="0 0 220 190">
            <path d={describeArc(110, 110, 85, 0, 270)} fill="none" stroke="#e2e8f0" strokeWidth="16" strokeLinecap="round" />
            <path d={describeArc(110, 110, 85, 0, gaugeAngle)} fill="none" stroke={gaugeColor} strokeWidth="16" strokeLinecap="round" style={{ transition: 'all 0.3s' }} />
            <text x="110" y="105" textAnchor="middle" className="fill-slate-800 dark:fill-white" fontSize="42" fontWeight="bold">{animatedScore}</text>
            <text x="110" y="130" textAnchor="middle" className="fill-slate-400" fontSize="14">out of 100</text>
            <text x="110" y="155" textAnchor="middle" fontSize="20" fontWeight="bold" className={getGrade(animatedScore).color === 'text-green-600' ? 'fill-green-600' : getGrade(animatedScore).color === 'text-green-500' ? 'fill-green-500' : getGrade(animatedScore).color === 'text-blue-600' ? 'fill-blue-600' : getGrade(animatedScore).color === 'text-amber-500' ? 'fill-amber-500' : 'fill-red-500'}>
              Grade: {getGrade(animatedScore).grade}
            </text>
          </svg>
          <div className="flex items-center gap-2 mt-2">
            <ArrowUp className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-600 font-medium">+3 from last month</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Potential: {overallScore + totalImpact} with all improvements</p>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          {categoryScores.map((c, i) => (
            <button key={i} onClick={() => setSelectedCategory(selectedCategory === i ? null : i)}
              className={`bg-white dark:bg-slate-800 rounded-2xl p-4 border shadow-sm text-left transition-all ${selectedCategory === i ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-900' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: c.color + '20' }}>
                  <c.icon className="w-4 h-4" style={{ color: c.color }} />
                </div>
                <span className="text-sm font-medium text-slate-800 dark:text-white">{c.category}</span>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{c.score}</p>
                <div className={`flex items-center gap-0.5 text-xs font-medium ${c.trend > 0 ? 'text-green-500' : c.trend < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                  {c.trend > 0 ? <ArrowUp className="w-3 h-3" /> : c.trend < 0 ? <ArrowDown className="w-3 h-3" /> : null}
                  {c.trend !== 0 ? Math.abs(c.trend) : '—'}
                </div>
              </div>
              <div className="mt-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                <div className="h-2 rounded-full transition-all" style={{ width: `${c.score}%`, backgroundColor: c.color }} />
              </div>
              {selectedCategory === i && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-1">
                  {c.tips.map((tip, j) => (
                    <p key={j} className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" /> {tip}
                    </p>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Score Trend + Radar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Score Trend</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={scoreTrend}>
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis domain={[50, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={3} dot={{ r: 5, fill: '#3B82F6' }} name="Score" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Score Breakdown vs Peers</h2>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData} cx="50%" cy="50%">
              <PolarGrid stroke="#94a3b8" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Radar name="You" dataKey="You" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
              <Radar name="Peers" dataKey="Peers" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Peer Comparison Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Peer Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-3 text-slate-500 dark:text-slate-400 font-medium">Metric</th>
                <th className="text-right py-3 px-3 text-slate-500 dark:text-slate-400 font-medium">Your Score</th>
                <th className="text-right py-3 px-3 text-slate-500 dark:text-slate-400 font-medium">Peer Avg</th>
                <th className="text-right py-3 px-3 text-slate-500 dark:text-slate-400 font-medium">Percentile</th>
                <th className="py-3 px-3 text-slate-500 dark:text-slate-400 font-medium text-center w-32">Position</th>
              </tr>
            </thead>
            <tbody>
              {peerComparison.map((p, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="py-3 px-3 text-slate-800 dark:text-white font-medium">{p.metric}</td>
                  <td className="py-3 px-3 text-right font-bold text-blue-600">{p.you}%</td>
                  <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400">{p.peerAvg}%</td>
                  <td className="py-3 px-3 text-right">
                    <span className={`font-medium ${p.percentile >= 75 ? 'text-green-600' : p.percentile >= 50 ? 'text-blue-600' : 'text-amber-500'}`}>
                      Top {100 - p.percentile}%
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 relative">
                      <div className="h-2 rounded-full bg-blue-500" style={{ width: `${p.percentile}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Improvement Recommendations */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" /> Improvement Recommendations
        </h2>
        <div className="space-y-3">
          {recommendations.map((r, i) => (
            <div key={i} className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 overflow-hidden">
              <button onClick={() => setExpandedRec(expandedRec === i ? null : i)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${r.priority === 'High' ? 'bg-red-100 dark:bg-red-900/30' : r.priority === 'Medium' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                  {r.priority === 'High' ? <AlertTriangle className="w-5 h-5 text-red-500" /> : r.priority === 'Medium' ? <Info className="w-5 h-5 text-amber-500" /> : <CheckCircle className="w-5 h-5 text-blue-500" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{r.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{r.category} • {r.priority} Priority</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-green-600">+{r.impact} pts</p>
                </div>
                <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${expandedRec === i ? 'rotate-90' : ''}`} />
              </button>
              {expandedRec === i && (
                <div className="px-4 pb-4 pt-0 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-3">{r.desc}</p>
                  <button className="mt-3 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 px-3 py-1.5 flex items-center gap-1">
                    Take Action <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Achievement Badges */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" /> Achievement Badges
          <span className="text-xs text-slate-500 dark:text-slate-400 font-normal ml-2">{earnedBadges}/{badges.length} earned</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {badges.map((b, i) => (
            <div key={i} className={`p-4 rounded-xl border text-center transition-all ${b.earned ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' : 'bg-slate-50 dark:bg-slate-700/30 border-slate-100 dark:border-slate-700 opacity-75'}`}>
              <div className="text-3xl mb-2">{b.icon}</div>
              <p className="text-sm font-medium text-slate-800 dark:text-white">{b.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{b.desc}</p>
              {b.earned ? (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center justify-center gap-1">
                  <Star className="w-3 h-3" /> {b.date}
                </p>
              ) : (
                <div className="mt-2">
                  <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${b.progress}%` }} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{b.progress}%</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Score History Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" /> Monthly Score History
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-3 text-slate-500 dark:text-slate-400 font-medium">Month</th>
                <th className="text-center py-3 px-3 text-slate-500 dark:text-slate-400 font-medium">Overall</th>
                {categoryScores.map(c => (
                  <th key={c.category} className="text-center py-3 px-3 text-slate-500 dark:text-slate-400 font-medium">{c.category}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyHistory.map((row, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="py-3 px-3 text-slate-800 dark:text-white font-medium">{row.month}</td>
                  <td className="py-3 px-3 text-center">
                    <span className={`font-bold ${row.overall >= 70 ? 'text-green-600' : row.overall >= 60 ? 'text-blue-600' : 'text-amber-500'}`}>{row.overall}</span>
                  </td>
                  <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-300">{row.savings}</td>
                  <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-300">{row.investment}</td>
                  <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-300">{row.debt}</td>
                  <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-300">{row.insurance}</td>
                  <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-300">{row.tax}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Score Impact Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Potential Score Impact</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={recommendations} layout="vertical">
            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis dataKey="title" type="category" width={180} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip formatter={v => `+${v} points`} />
            <Bar dataKey="impact" fill="#3B82F6" radius={[0, 6, 6, 0]} name="Score Impact">
              {recommendations.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Share Scorecard</h3>
              <button onClick={() => setShowShareModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                <Lock className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="text-center mb-6">
              <div className="w-24 h-24 rounded-full mx-auto flex items-center justify-center text-3xl font-bold text-white" style={{ backgroundColor: gaugeColor }}>
                {overallScore}
              </div>
              <p className="text-lg font-semibold text-slate-800 dark:text-white mt-3">Financial Score: {getGrade(overallScore).grade}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">February 2026</p>
            </div>
            <div className="space-y-2 mb-6">
              {categoryScores.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-300">{c.category}</span>
                  <span className="font-medium text-slate-800 dark:text-white">{c.score}/100</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowShareModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm py-2">Cancel</button>
              <button onClick={() => { navigator.clipboard?.writeText('My Financial Score: ' + overallScore + '/100'); setShowShareModal(false); }}
                className="flex-1 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 py-2 flex items-center justify-center gap-2">
                <Share2 className="w-4 h-4" /> Copy & Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
