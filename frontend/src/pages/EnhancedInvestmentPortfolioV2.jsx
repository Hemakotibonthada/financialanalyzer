// ============================================================================
// Enhanced Investment Portfolio V2 — Enterprise-Grade Investment Dashboard
// ============================================================================
// Comprehensive investment portfolio management with AI asset allocation
// recommendations, performance analytics, risk profiling, and rebalancing.
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import MainLayout from '../components/MainLayout';
import {
  StatCard, SectionHeader, InsightCard, EmptyState,
  CategoryPill, MetricComparison, ProgressRing, ScoreGauge,
  Timeline, QuickAction, LoadingOverlay, AnimatedNumber,
} from '../components/ui/EnterpriseComponents';
import {
  FinancialAreaChart, FinancialBarChart, FinancialDonutChart,
  MultiLineChart, FinancialRadarChart, ChartCard, MiniChart,
  currencyFormatter,
} from '../components/charts/EnterpriseCharts';
import { FadeIn, StaggerChildren, PageTransition } from '../components/ui/AnimatedComponents';
import api from '../services/api';
import { getRiskAssessment, getInsights, getSpendingForecast } from '../services/aiService';
import {
  TrendingUp, TrendingDown, Briefcase, PieChart, Target,
  BarChart3, Shield, DollarSign, RefreshCw, Plus,
  ArrowUpRight, ArrowDownRight, Activity, Layers,
  AlertTriangle, Award, Gem, Building2, Wallet,
  Globe, IndianRupee, Percent, Clock, Star,
} from 'lucide-react';

// ============================================================================
// ASSET TYPE CONFIG
// ============================================================================

const ASSET_TYPES = {
  stocks: { label: 'Stocks', icon: TrendingUp, color: '#3b82f6', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  mutualFunds: { label: 'Mutual Funds', icon: Layers, color: '#8b5cf6', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  fixedDeposits: { label: 'Fixed Deposits', icon: Shield, color: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  gold: { label: 'Gold', icon: Gem, color: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  realEstate: { label: 'Real Estate', icon: Building2, color: '#ec4899', bg: 'bg-pink-50 dark:bg-pink-900/20' },
  crypto: { label: 'Crypto', icon: Globe, color: '#f97316', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  bonds: { label: 'Bonds', icon: Award, color: '#06b6d4', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
  ppf: { label: 'PPF/EPF', icon: Wallet, color: '#14b8a6', bg: 'bg-teal-50 dark:bg-teal-900/20' },
};

// ============================================================================
// RISK LEVEL COLORS
// ============================================================================

const RISK_COLORS = {
  low: '#10b981', medium: '#f59e0b', high: '#ef4444', 'very-high': '#dc2626',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const EnhancedInvestmentPortfolioV2 = () => {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [investments, setInvestments] = useState([]);
  const [portfolioSummary, setPortfolioSummary] = useState(null);
  const [riskProfile, setRiskProfile] = useState(null);
  const [aiInsights, setAiInsights] = useState([]);
  const [performanceHistory, setPerformanceHistory] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.get('/investments'),
        api.get('/investments/summary'),
        api.get('/investments/performance'),
        getRiskAssessment(),
        getInsights(),
      ]);

      const get = (idx) => results[idx]?.status === 'fulfilled' ? results[idx].value : null;

      const invData = get(0)?.data?.data || get(0)?.data?.investments || get(0)?.data || [];
      setInvestments(Array.isArray(invData) ? invData : []);

      const summary = get(1)?.data?.data || get(1)?.data || null;
      setPortfolioSummary(summary);

      const perf = get(2)?.data?.data || get(2)?.data?.performance || [];
      setPerformanceHistory(Array.isArray(perf) ? perf : []);

      setRiskProfile(get(3)?.riskAssessment || get(3)?.data?.riskAssessment || get(3)?.data || null);
      setAiInsights(get(4)?.insights || get(4)?.data?.insights || []);

    } catch (err) {
      console.error('Failed to load investment data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Derived
  const totalInvested = useMemo(() =>
    investments.reduce((sum, inv) => sum + (inv.investedAmount || inv.amount || 0), 0)
  , [investments]);

  const totalCurrent = useMemo(() =>
    investments.reduce((sum, inv) => sum + (inv.currentValue || inv.currentAmount || inv.investedAmount || inv.amount || 0), 0)
  , [investments]);

  const totalReturns = totalCurrent - totalInvested;
  const returnPct = totalInvested > 0 ? ((totalReturns / totalInvested) * 100) : 0;

  const assetAllocation = useMemo(() => {
    const alloc = {};
    investments.forEach(inv => {
      const type = inv.type || inv.assetType || inv.category || 'other';
      const current = inv.currentValue || inv.currentAmount || inv.investedAmount || inv.amount || 0;
      alloc[type] = (alloc[type] || 0) + current;
    });
    return Object.entries(alloc)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [investments]);

  // Risk dimensions for radar
  const riskDimensions = riskProfile ? [
    { dimension: 'Market Risk', value: riskProfile.marketRisk || riskProfile.score || 50 },
    { dimension: 'Liquidity', value: riskProfile.liquidity || 70 },
    { dimension: 'Diversification', value: riskProfile.diversification || 60 },
    { dimension: 'Volatility', value: riskProfile.volatility || 40 },
    { dimension: 'Concentration', value: riskProfile.concentration || 55 },
    { dimension: 'Duration', value: riskProfile.duration || 65 },
  ] : [];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'allocation', label: 'Allocation', icon: <PieChart className="w-4 h-4" /> },
    { id: 'performance', label: 'Performance', icon: <Activity className="w-4 h-4" /> },
    { id: 'risk', label: 'Risk', icon: <Shield className="w-4 h-4" /> },
    { id: 'holdings', label: 'Holdings', icon: <Layers className="w-4 h-4" /> },
  ];

  if (loading) {
    return (
      <MainLayout>
        <LoadingOverlay message="Loading portfolio analytics..." />
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
                <div className="bg-gradient-to-br from-blue-500 to-violet-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/25">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Investment Portfolio</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">AI-powered portfolio analysis & rebalancing</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchData}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-500/25">
                  <Plus className="w-4 h-4" /> Add Investment
                </button>
              </div>
            </div>
          </FadeIn>

          {/* KPI ROW */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Invested"
              value={totalInvested}
              prefix="₹"
              color="primary"
              icon={<IndianRupee className="w-5 h-5 text-inherit" />}
              variant="gradient"
            />
            <StatCard
              title="Current Value"
              value={totalCurrent}
              prefix="₹"
              color="success"
              icon={<Wallet className="w-5 h-5 text-inherit" />}
            />
            <StatCard
              title="Total Returns"
              value={totalReturns}
              prefix={totalReturns >= 0 ? '+₹' : '-₹'}
              color={totalReturns >= 0 ? 'success' : 'danger'}
              icon={totalReturns >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
              trend={returnPct.toFixed(1)}
              trendDirection={totalReturns >= 0 ? 'up' : 'down'}
            />
            <StatCard
              title="Active Investments"
              value={investments.length}
              color="purple"
              icon={<Layers className="w-5 h-5 text-inherit" />}
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

          {/* TAB CONTENT */}
          {activeTab === 'overview' && (
            <StaggerChildren staggerDelay={60} className="space-y-6">
              {investments.length === 0 ? (
                <EmptyState
                  title="No investments yet"
                  description="Start tracking your investments to get AI-powered portfolio analysis."
                />
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartCard title="Asset Allocation" subtitle="Current portfolio distribution">
                      <FinancialDonutChart
                        data={assetAllocation}
                        height={300}
                        centerLabel="Total"
                        centerValue={currencyFormatter(totalCurrent)}
                      />
                    </ChartCard>

                    {riskDimensions.length > 0 && (
                      <ChartCard title="Risk Profile" subtitle="Multi-dimensional risk analysis">
                        <FinancialRadarChart
                          data={riskDimensions}
                          categories={riskDimensions.map(d => d.dimension)}
                          datasets={[{
                            label: 'Your Portfolio',
                            data: riskDimensions.map(d => d.value),
                            borderColor: '#8b5cf6',
                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                          }]}
                          height={300}
                        />
                      </ChartCard>
                    )}
                  </div>

                  {performanceHistory.length > 0 && (
                    <ChartCard title="Portfolio Performance" subtitle="Historical value over time">
                      <FinancialAreaChart
                        data={performanceHistory.map(p => ({
                          date: p.date || p.month || p.period,
                          value: p.value || p.total || p.portfolioValue || 0,
                        }))}
                        dataKey="value"
                        xKey="date"
                        color="#3b82f6"
                        height={300}
                      />
                    </ChartCard>
                  )}

                  {/* AI insights */}
                  {aiInsights.length > 0 && (
                    <>
                      <SectionHeader title="AI Investment Insights" badge={`${aiInsights.length}`} />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {aiInsights.slice(0, 4).map((insight, i) => (
                          <InsightCard
                            key={i}
                            type={insight.priority === 'high' ? 'warning' : insight.type === 'positive' ? 'success' : 'info'}
                            title={insight.title || insight.type}
                            description={insight.message || insight.description}
                            confidence={insight.confidence}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </StaggerChildren>
          )}

          {activeTab === 'allocation' && (
            <StaggerChildren staggerDelay={60} className="space-y-6">
              <ChartCard title="Asset Allocation Breakdown" subtitle="Portfolio composition by asset type">
                <FinancialBarChart
                  data={assetAllocation}
                  bars={[{ key: 'value', name: 'Value' }]}
                  xKey="name"
                  height={350}
                />
              </ChartCard>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assetAllocation.map((asset, i) => {
                  const pct = totalCurrent > 0 ? ((asset.value / totalCurrent) * 100) : 0;
                  const config = ASSET_TYPES[asset.name] || ASSET_TYPES.stocks;
                  const Icon = config.icon;
                  return (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-lg ${config.bg}`}>
                          <Icon className="w-5 h-5" style={{ color: config.color }} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{config.label}</p>
                          <p className="text-xs text-gray-400">{pct.toFixed(1)}% of portfolio</p>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        ₹{asset.value.toLocaleString('en-IN')}
                      </p>
                      <ProgressRing value={pct} size={48} color={config.color} />
                    </div>
                  );
                })}
              </div>

              {/* Ideal vs Current */}
              <ChartCard title="Current vs Ideal Allocation" subtitle="AI-recommended vs actual distribution">
                <FinancialBarChart
                  data={assetAllocation.map(a => ({
                    name: a.name,
                    current: totalCurrent > 0 ? ((a.value / totalCurrent) * 100) : 0,
                    ideal: 100 / assetAllocation.length,
                  }))}
                  bars={[
                    { key: 'current', name: 'Current %', color: '#3b82f6' },
                    { key: 'ideal', name: 'Ideal %', color: '#10b981' },
                  ]}
                  xKey="name"
                  height={300}
                />
              </ChartCard>
            </StaggerChildren>
          )}

          {activeTab === 'performance' && (
            <StaggerChildren staggerDelay={60} className="space-y-6">
              {performanceHistory.length > 0 ? (
                <ChartCard title="Value Over Time" subtitle="Portfolio value trajectory">
                  <FinancialAreaChart
                    data={performanceHistory.map(p => ({
                      date: p.date || p.month,
                      value: p.value || 0,
                    }))}
                    dataKey="value"
                    xKey="date"
                    color="#3b82f6"
                    height={350}
                  />
                </ChartCard>
              ) : (
                <EmptyState title="No performance history available" />
              )}

              {/* Per-asset performance */}
              {investments.length > 0 && (
                <ChartCard title="Per-Asset Returns" subtitle="Returns by each investment">
                  <FinancialBarChart
                    data={investments.slice(0, 15).map(inv => ({
                      name: inv.name || inv.symbol || `Inv ${investments.indexOf(inv) + 1}`,
                      value: ((inv.currentValue || inv.amount || 0) - (inv.investedAmount || inv.amount || 0)),
                    }))}
                    bars={[{ key: 'value', name: 'Returns (₹)' }]}
                    xKey="name"
                    height={320}
                    layout="horizontal"
                  />
                </ChartCard>
              )}
            </StaggerChildren>
          )}

          {activeTab === 'risk' && (
            <StaggerChildren staggerDelay={60} className="space-y-6">
              {riskProfile ? (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Overall Risk Score</h3>
                      <div className="flex items-center justify-center">
                        <ScoreGauge
                          score={riskProfile.score || riskProfile.overallRisk || 50}
                          maxScore={100}
                          size={220}
                          label="Risk"
                        />
                      </div>
                      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                        {riskProfile.description || 'Your portfolio risk level based on diversification, market exposure, and volatility.'}
                      </p>
                    </div>

                    {riskDimensions.length > 0 && (
                      <ChartCard title="Risk Dimensions" subtitle="Breakdown by risk factor">
                        <FinancialRadarChart
                          data={riskDimensions}
                          categories={riskDimensions.map(d => d.dimension)}
                          datasets={[{
                            label: 'Risk Score',
                            data: riskDimensions.map(d => d.value),
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          }]}
                          height={280}
                        />
                      </ChartCard>
                    )}
                  </div>

                  {riskProfile.recommendations && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(Array.isArray(riskProfile.recommendations) ? riskProfile.recommendations : [riskProfile.recommendations])
                        .map((rec, i) => (
                          <InsightCard
                            key={i}
                            type="tip"
                            title={typeof rec === 'string' ? 'AI Recommendation' : rec.title}
                            description={typeof rec === 'string' ? rec : rec.description || rec.message}
                          />
                        ))
                      }
                    </div>
                  )}
                </>
              ) : (
                <EmptyState title="Risk analysis unavailable" description="Add investments to receive AI risk profiling." />
              )}
            </StaggerChildren>
          )}

          {activeTab === 'holdings' && (
            <StaggerChildren staggerDelay={60} className="space-y-6">
              <SectionHeader title="All Holdings" badge={`${investments.length} investments`} />
              {investments.length > 0 ? (
                <div className="space-y-3">
                  {investments.map((inv, i) => {
                    const invested = inv.investedAmount || inv.amount || 0;
                    const current = inv.currentValue || inv.currentAmount || invested;
                    const returns = current - invested;
                    const returnPercent = invested > 0 ? ((returns / invested) * 100) : 0;
                    const config = ASSET_TYPES[inv.type || inv.assetType] || ASSET_TYPES.stocks;
                    const Icon = config.icon;

                    return (
                      <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl ${config.bg}`}>
                            <Icon className="w-5 h-5" style={{ color: config.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {inv.name || inv.symbol || `Investment ${i + 1}`}
                              </h4>
                              <span className={`text-sm font-bold ${returns >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {returns >= 0 ? '+' : ''}₹{Math.abs(returns).toLocaleString('en-IN')}
                                <span className="text-xs ml-1">({returnPercent.toFixed(1)}%)</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs text-gray-400">Invested: ₹{invested.toLocaleString('en-IN')}</span>
                              <span className="text-xs text-gray-400">Current: ₹{current.toLocaleString('en-IN')}</span>
                              {inv.purchaseDate && (
                                <span className="text-xs text-gray-400">
                                  <Clock className="w-3 h-3 inline mr-0.5" />
                                  {new Date(inv.purchaseDate).toLocaleDateString('en-IN')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState title="No holdings" description="Add your first investment to get started." />
              )}
            </StaggerChildren>
          )}

        </div>
      </PageTransition>
    </MainLayout>
  );
};

export default EnhancedInvestmentPortfolioV2;
