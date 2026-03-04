// ============================================================================
// Enhanced Debt Management V2 — Enterprise Debt Tracking & Payoff Strategy
// ============================================================================
// Comprehensive debt management with AI payoff optimization,
// snowball/avalanche strategy comparison, and payoff timelines.
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import MainLayout from '../components/MainLayout';
import {
  StatCard, SectionHeader, InsightCard, EmptyState,
  ProgressRing, ScoreGauge, MetricComparison,
  Timeline, QuickAction, LoadingOverlay,
} from '../components/ui/EnterpriseComponents';
import {
  FinancialAreaChart, FinancialBarChart, FinancialDonutChart,
  ChartCard, WaterfallChart, currencyFormatter,
} from '../components/charts/EnterpriseCharts';
import { FadeIn, StaggerChildren, PageTransition, AnimatedProgress } from '../components/ui/AnimatedComponents';
import api from '../services/api';
import { getAIRecommendations, getFinancialHealthScore, getCashflowProjection } from '../services/aiService';
import {
  DollarSign, TrendingDown, TrendingUp, Shield, AlertTriangle,
  Calendar, RefreshCw, Plus, Target, Clock, ArrowRight,
  CheckCircle, XCircle, Zap, Award, BarChart3, CreditCard,
  Home, Car, GraduationCap, Building2, Wallet, Percent,
} from 'lucide-react';

// ============================================================================
// DEBT TYPE CONFIG
// ============================================================================

const DEBT_TYPES = {
  'credit-card': { label: 'Credit Card', icon: CreditCard, color: '#ef4444' },
  'home-loan': { label: 'Home Loan', icon: Home, color: '#3b82f6' },
  'car-loan': { label: 'Car Loan', icon: Car, color: '#8b5cf6' },
  'education': { label: 'Education', icon: GraduationCap, color: '#f59e0b' },
  'personal': { label: 'Personal Loan', icon: DollarSign, color: '#ec4899' },
  'business': { label: 'Business Loan', icon: Building2, color: '#06b6d4' },
  'other': { label: 'Other', icon: Wallet, color: '#6b7280' },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const EnhancedDebtManagementV2 = () => {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [debts, setDebts] = useState([]);
  const [healthScore, setHealthScore] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [cashflow, setCashflow] = useState([]);
  const [strategy, setStrategy] = useState('avalanche'); // avalanche or snowball

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.get('/debts'),
        api.get('/emis'),
        getFinancialHealthScore(),
        getAIRecommendations(),
        getCashflowProjection(),
      ]);

      const get = (idx) => results[idx]?.status === 'fulfilled' ? results[idx].value : null;

      let debtData = get(0)?.data?.data || get(0)?.data?.debts || get(0)?.data || [];
      const emiData = get(1)?.data?.data || get(1)?.data?.emis || [];

      // Combine debts and EMIs
      if (!Array.isArray(debtData)) debtData = [];
      const combined = [...debtData];
      if (Array.isArray(emiData)) {
        emiData.forEach(emi => {
          if (!combined.some(d => d._id === emi._id)) {
            combined.push({
              ...emi,
              type: emi.type || 'other',
              outstanding: emi.remainingAmount || emi.totalAmount || 0,
              interestRate: emi.interestRate || 0,
              minimumPayment: emi.emiAmount || 0,
            });
          }
        });
      }
      setDebts(combined);

      const hs = get(2);
      setHealthScore(hs?.healthScore || hs?.data?.healthScore || hs?.score || null);

      const recs = get(3)?.recommendations || get(3)?.data?.recommendations || [];
      setRecommendations(Array.isArray(recs) ? recs.filter(r =>
        (r.category || r.type || '').toLowerCase().includes('debt') ||
        (r.message || r.description || '').toLowerCase().includes('debt') ||
        (r.message || r.description || '').toLowerCase().includes('loan') ||
        (r.message || r.description || '').toLowerCase().includes('emi')
      ) : []);

      const cf = get(4)?.projections || get(4)?.data?.projections || [];
      setCashflow(Array.isArray(cf) ? cf : []);

    } catch (err) {
      console.error('Debt data fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Derived
  const totalDebt = debts.reduce((sum, d) => sum + (d.outstanding || d.remainingAmount || d.totalAmount || d.amount || 0), 0);
  const totalPaid = debts.reduce((sum, d) => sum + (d.paidAmount || d.totalPaid || 0), 0);
  const totalOriginal = debts.reduce((sum, d) => sum + (d.originalAmount || d.totalAmount || d.amount || 0), 0);
  const totalMonthlyPayment = debts.reduce((sum, d) => sum + (d.minimumPayment || d.emiAmount || d.monthlyPayment || 0), 0);
  const debtFreeProgress = totalOriginal > 0 ? ((totalPaid / totalOriginal) * 100) : 0;

  const avgInterestRate = useMemo(() => {
    const weighted = debts.reduce((sum, d) => {
      const bal = d.outstanding || d.remainingAmount || 0;
      return sum + (bal * (d.interestRate || 0));
    }, 0);
    return totalDebt > 0 ? (weighted / totalDebt) : 0;
  }, [debts, totalDebt]);

  // Sort by strategy
  const sortedDebts = useMemo(() => {
    const sorted = [...debts];
    if (strategy === 'avalanche') {
      sorted.sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0));
    } else {
      sorted.sort((a, b) => (a.outstanding || a.remainingAmount || 0) - (b.outstanding || b.remainingAmount || 0));
    }
    return sorted;
  }, [debts, strategy]);

  // Debt breakdown by type
  const debtByType = useMemo(() => {
    const grouped = {};
    debts.forEach(d => {
      const type = d.type || d.debtType || d.category || 'other';
      grouped[type] = (grouped[type] || 0) + (d.outstanding || d.remainingAmount || 0);
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [debts]);

  // Payoff timeline
  const payoffTimeline = useMemo(() => {
    if (totalMonthlyPayment <= 0 || totalDebt <= 0) return [];
    const months = [];
    let remaining = totalDebt;
    for (let i = 0; i <= Math.min(Math.ceil(totalDebt / totalMonthlyPayment), 60); i++) {
      months.push({ month: `M${i}`, remaining: Math.max(remaining, 0) });
      remaining -= totalMonthlyPayment;
      if (remaining <= 0) break;
    }
    return months;
  }, [totalDebt, totalMonthlyPayment]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'strategy', label: 'Payoff Strategy', icon: <Target className="w-4 h-4" /> },
    { id: 'debts', label: 'All Debts', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'ai', label: 'AI Advisor', icon: <Zap className="w-4 h-4" /> },
  ];

  if (loading) {
    return (
      <MainLayout>
        <LoadingOverlay message="Analyzing debt portfolio..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageTransition>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* HEADER */}
          <FadeIn>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-red-500 to-rose-600 p-2.5 rounded-xl shadow-lg shadow-red-500/25">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Debt Management</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">AI-optimized debt payoff planning</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchData}
                  className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  <RefreshCw className="w-4 h-4 text-gray-500" />
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-red-500/25">
                  <Plus className="w-4 h-4" /> Add Debt
                </button>
              </div>
            </div>
          </FadeIn>

          {/* KPI ROW */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Outstanding"
              value={totalDebt}
              prefix="₹"
              color="danger"
              icon={<DollarSign className="w-5 h-5 text-inherit" />}
              variant="gradient"
            />
            <StatCard
              title="Monthly Payments"
              value={totalMonthlyPayment}
              prefix="₹"
              color="warning"
              icon={<Calendar className="w-5 h-5 text-inherit" />}
            />
            <StatCard
              title="Avg Interest Rate"
              value={avgInterestRate.toFixed(1)}
              suffix="%"
              color="purple"
              icon={<Percent className="w-5 h-5 text-inherit" />}
              animateValue={false}
            />
            <StatCard
              title="Debt-Free Progress"
              value={debtFreeProgress.toFixed(0)}
              suffix="%"
              color={debtFreeProgress > 50 ? 'success' : 'warning'}
              icon={<Target className="w-5 h-5 text-inherit" />}
            />
          </div>

          {/* TABS */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/50 rounded-xl p-1 overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === t.id
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <StaggerChildren staggerDelay={60} className="space-y-6">
              {debts.length === 0 ? (
                <EmptyState title="No debts tracked" description="Add your debts to get AI-powered payoff strategies." />
              ) : (
                <>
                  {/* Debt-free progress gauge */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 text-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Debt-Free Journey</h3>
                    <div className="flex justify-center">
                      <ScoreGauge score={debtFreeProgress} maxScore={100} size={200} label="Paid Off" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                      ₹{totalPaid.toLocaleString('en-IN')} paid of ₹{totalOriginal.toLocaleString('en-IN')} total
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartCard title="Debt Distribution" subtitle="Outstanding by type">
                      <FinancialDonutChart
                        data={debtByType}
                        height={280}
                        centerLabel="Total Debt"
                        centerValue={currencyFormatter(totalDebt)}
                      />
                    </ChartCard>

                    {payoffTimeline.length > 0 && (
                      <ChartCard title="Payoff Timeline" subtitle="Projected debt reduction">
                        <FinancialAreaChart
                          data={payoffTimeline}
                          dataKey="remaining"
                          xKey="month"
                          color="#ef4444"
                          height={280}
                        />
                      </ChartCard>
                    )}
                  </div>
                </>
              )}
            </StaggerChildren>
          )}

          {activeTab === 'strategy' && (
            <StaggerChildren staggerDelay={60} className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Strategy:</span>
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setStrategy('avalanche')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      strategy === 'avalanche'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    🏔️ Avalanche
                  </button>
                  <button
                    onClick={() => setStrategy('snowball')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      strategy === 'snowball'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    ❄️ Snowball
                  </button>
                </div>
              </div>

              <InsightCard
                type="tip"
                title={strategy === 'avalanche' ? 'Avalanche Method' : 'Snowball Method'}
                description={strategy === 'avalanche'
                  ? 'Pay off highest interest rate debts first. Saves the most money in interest over time.'
                  : 'Pay off smallest balances first. Builds momentum through quick wins.'
                }
              />

              <SectionHeader title="Payment Priority Order" subtitle={`${strategy === 'avalanche' ? 'Highest interest first' : 'Smallest balance first'}`} />
              <div className="space-y-3">
                {sortedDebts.map((d, i) => {
                  const outstanding = d.outstanding || d.remainingAmount || d.totalAmount || 0;
                  const original = d.originalAmount || d.totalAmount || d.amount || outstanding;
                  const paidPct = original > 0 ? (((original - outstanding) / original) * 100) : 0;
                  const config = DEBT_TYPES[d.type] || DEBT_TYPES.other;
                  const Icon = config.icon;

                  return (
                    <div key={i} className={`bg-white dark:bg-gray-800 rounded-xl p-5 border ${i === 0 ? 'border-blue-200 dark:border-blue-800/40 ring-1 ring-blue-500/20' : 'border-gray-100 dark:border-gray-700/50'} hover:shadow-md transition-shadow`}>
                      <div className="flex items-start gap-4">
                        <div className="flex items-center gap-3">
                          <span className={`text-lg font-bold ${i === 0 ? 'text-blue-600' : 'text-gray-400'}`}>#{i + 1}</span>
                          <div className="p-2 rounded-lg" style={{ backgroundColor: `${config.color}15` }}>
                            <Icon className="w-5 h-5" style={{ color: config.color }} />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                              {d.name || d.lender || d.description || config.label}
                            </h4>
                            <span className="text-lg font-bold text-gray-900 dark:text-white">
                              ₹{outstanding.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                            <span>Rate: {d.interestRate || 0}%</span>
                            <span>EMI: ₹{(d.minimumPayment || d.emiAmount || 0).toLocaleString('en-IN')}</span>
                            <span>{paidPct.toFixed(0)}% paid</span>
                          </div>
                          <div className="mt-3 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all duration-700"
                              style={{ width: `${paidPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      {i === 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            ⭐ Focus extra payments here for maximum {strategy === 'avalanche' ? 'interest savings' : 'quick wins'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Comparison */}
              <ChartCard title="Debt Comparison" subtitle="Outstanding balances">
                <FinancialBarChart
                  data={sortedDebts.map(d => ({
                    name: d.name || d.lender || 'Debt',
                    outstanding: d.outstanding || d.remainingAmount || 0,
                    interestRate: d.interestRate || 0,
                  }))}
                  bars={[{ key: 'outstanding', name: 'Outstanding', color: '#ef4444' }]}
                  xKey="name"
                  height={300}
                  layout="horizontal"
                />
              </ChartCard>
            </StaggerChildren>
          )}

          {activeTab === 'debts' && (
            <StaggerChildren staggerDelay={60} className="space-y-6">
              <SectionHeader title="All Debts & EMIs" badge={`${debts.length}`} />
              {debts.length > 0 ? (
                <div className="space-y-3">
                  {debts.map((d, i) => {
                    const outstanding = d.outstanding || d.remainingAmount || d.totalAmount || 0;
                    const config = DEBT_TYPES[d.type] || DEBT_TYPES.other;
                    const Icon = config.icon;
                    return (
                      <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${config.color}15` }}>
                            <Icon className="w-5 h-5" style={{ color: config.color }} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {d.name || d.lender || d.description || config.label}
                                </h4>
                                <span className="text-xs text-gray-400">{config.label}</span>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-gray-900 dark:text-white">₹{outstanding.toLocaleString('en-IN')}</p>
                                <span className="text-xs text-gray-400">{d.interestRate || 0}% APR</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState title="No debts recorded" description="Start tracking your debts for AI-powered payoff optimization." />
              )}
            </StaggerChildren>
          )}

          {activeTab === 'ai' && (
            <StaggerChildren staggerDelay={60} className="space-y-6">
              <SectionHeader title="AI Debt Advisor" badge={`${recommendations.length} tips`} />
              {recommendations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendations.map((rec, i) => (
                    <InsightCard
                      key={i}
                      type={rec.priority === 'high' ? 'danger' : 'tip'}
                      title={rec.title || 'Debt Strategy'}
                      description={rec.message || rec.description}
                      impact={rec.impact || rec.potentialSavings}
                      confidence={rec.confidence}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState title="No debt-specific recommendations" description="AI needs more data to generate personalized debt advice." />
              )}

              {/* Interest savings comparison */}
              {debts.length > 1 && (
                <ChartCard title="Interest Rate Comparison" subtitle="Compare rates across your debts">
                  <FinancialBarChart
                    data={debts.map(d => ({
                      name: d.name || d.lender || 'Debt',
                      rate: d.interestRate || 0,
                    }))}
                    bars={[{ key: 'rate', name: 'Interest Rate %', color: '#ef4444' }]}
                    xKey="name"
                    height={280}
                  />
                </ChartCard>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <QuickAction icon={<Target />} label="Set Payoff Goal" onClick={() => {}} />
                <QuickAction icon={<Zap />} label="Optimize Payments" onClick={() => {}} />
                <QuickAction icon={<Calendar />} label="Schedule Reminders" onClick={() => {}} />
                <QuickAction icon={<Award />} label="Milestones" onClick={() => {}} />
              </div>
            </StaggerChildren>
          )}

        </div>
      </PageTransition>
    </MainLayout>
  );
};

export default EnhancedDebtManagementV2;
