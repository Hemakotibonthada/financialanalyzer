import React, { useCallback, useEffect, useMemo, useState } from 'react';
import MainLayout from '../../components/MainLayout';
import {
  AnimatedCard,
  Badge,
  EmptyState,
  SkeletonLoader,
  StatCard,
} from '../../components/ui/ComponentLibrary';
import {
  EnhancedBarChart,
  EnhancedDoughnutChart,
  EnhancedLineChart,
  GaugeChart,
} from '../../components/ui/ChartComponents';
import { legacyAdminService } from '../../services/legacyService';
import {
  AlertTriangle,
  BarChart3,
  Clock,
  IndianRupee,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  UsersRound,
} from 'lucide-react';

function inr(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;
}

export default function LegacyAnalytics() {
  const [range, setRange] = useState('90d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await legacyAdminService.getAnalytics({ range });
      setData(res.data?.data || res.data || null);
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Unable to load Legacy Guard analytics.'
      );
    } finally {
      setLoading(false);
    }
  }, [range]);
  useEffect(() => {
    load();
  }, [load]);

  const d = data || {};
  const funnelLabels = ['Active', 'Watch', 'Dormant', 'Unreachable', 'Welfare check', 'Estate'];
  const funnelValues = [
    d.funnel?.active,
    d.funnel?.watch,
    d.funnel?.dormant,
    d.funnel?.unreachable,
    d.funnel?.welfare_check,
    d.funnel?.estate,
  ].map(Number);
  const recovery = d.recoveryByCategory || [];
  const daysLabels = Object.keys(d.avgDaysToSettle || {});
  const daysValues = Object.values(d.avgDaysToSettle || {});
  const trend = d.feeRevenueTrend || [];
  const falseAlarmBad = Number(d.falseAlarmRate || 0) > 5;

  return (
    <MainLayout
      title="Legacy Analytics"
      subtitle="Dormancy, welfare outreach and estate settlement performance"
    >
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 lg:p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={[
                'w-12 h-12 rounded-2xl bg-gradient-to-br',
                'from-cyan-500 to-indigo-600 flex items-center justify-center',
              ].join(' ')}
            >
              <BarChart3 className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Legacy Guard analytics
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Quality metrics matter: a high false-alarm rate is bad.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className={[
                'px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700',
                'bg-white dark:bg-gray-900 text-gray-900 dark:text-white',
              ].join(' ')}
            >
              <option value="30d">30 days</option>
              <option value="90d">90 days</option>
              <option value="180d">180 days</option>
              <option value="365d">1 year</option>
            </select>
            <button
              onClick={load}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">
            <SkeletonLoader variant="chart" count={4} />
          </div>
        ) : error ? (
          <ErrorPanel message={error} onRetry={load} />
        ) : !data ? (
          <EmptyState
            icon="📊"
            title="No analytics returned"
            description="Run Legacy Guard reports to populate this dashboard."
            action={load}
            actionLabel="Retry"
          />
        ) : (
          <>
            <div className="grid md:grid-cols-5 gap-4">
              <StatCard
                title="Estate cases"
                value={d.totals?.estateCases || d.funnel?.estate || 0}
                icon={<UsersRound className="w-5 h-5" />}
                color="#6366f1"
              />
              <StatCard
                title="Recovered"
                value={d.totals?.recoveredInINR || 0}
                format="currency"
                icon={<IndianRupee className="w-5 h-5" />}
                color="#10b981"
              />
              <StatCard
                title="Fee revenue"
                value={d.totals?.feeRevenueInINR || 0}
                format="currency"
                icon={<TrendingUp className="w-5 h-5" />}
                color="#0ea5e9"
              />
              <StatCard
                title="Avg settle days"
                value={d.totals?.avgDays || 0}
                icon={<Clock className="w-5 h-5" />}
                color="#f59e0b"
              />
              <StatCard
                title="False alarms"
                value={d.falseAlarmRate || 0}
                suffix="%"
                icon={<ShieldAlert className="w-5 h-5" />}
                color={falseAlarmBad ? '#ef4444' : '#10b981'}
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <ChartCard
                title="Dormancy funnel"
                subtitle="Active → watch → dormant → unreachable → welfare check → estate"
              >
                <EnhancedBarChart
                  labels={funnelLabels}
                  data={funnelValues}
                  height={320}
                  colors={['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6']}
                />
              </ChartCard>
              <ChartCard
                title="Recovery by asset category"
                subtitle="Recovered amount compared across asset classes"
              >
                <EnhancedBarChart
                  labels={recovery.map((r) => r.category?.replace(/_/g, ' '))}
                  datasets={[
                    {
                      label: 'Recovered',
                      data: recovery.map((r) => r.recoveredInINR || 0),
                      backgroundColor: 'rgba(16,185,129,.75)',
                    },
                    {
                      label: 'Discovered',
                      data: recovery.map((r) => r.discoveredInINR || 0),
                      backgroundColor: 'rgba(99,102,241,.35)',
                    },
                  ]}
                  currency
                  height={320}
                />
              </ChartCard>
              <ChartCard title="Average days-to-settle" subtitle="By claim playbook type">
                <EnhancedBarChart
                  labels={daysLabels.map((x) => x.replace(/_/g, ' '))}
                  data={daysValues}
                  horizontal
                  height={320}
                  colors={['#f59e0b', '#06b6d4', '#8b5cf6', '#10b981']}
                />
              </ChartCard>
              <ChartCard
                title="Fee revenue trend"
                subtitle="1% success fee on recovered amounts only"
              >
                <EnhancedLineChart
                  labels={trend.map((t) => t.month || t.label)}
                  data={trend.map((t) => t.revenue || t.feeRevenueInINR || 0)}
                  currency
                  height={320}
                />
              </ChartCard>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <AnimatedCard hover={false}>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  False-alarm rate
                </h2>
                <GaugeChart
                  value={Number(d.falseAlarmRate || 0)}
                  max={20}
                  title={falseAlarmBad ? 'Needs attention' : 'Healthy'}
                  thresholds={[
                    { value: 5, color: '#10B981' },
                    { value: 10, color: '#F59E0B' },
                    { value: 20, color: '#EF4444' },
                  ]}
                />
                <p className="text-sm text-gray-500 mt-3">
                  Lower is better. Death reports must remain maker-checker and reversible.
                </p>
              </AnimatedCard>
              <AnimatedCard hover={false}>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  SLA compliance
                </h2>
                <GaugeChart
                  value={Number(d.slaCompliance || 0)}
                  max={100}
                  title="Within SLA"
                  thresholds={[
                    { value: 70, color: '#EF4444' },
                    { value: 90, color: '#F59E0B' },
                    { value: 100, color: '#10B981' },
                  ]}
                />
                <p className="text-sm text-gray-500 mt-3">
                  Measures outreach, document review and claim follow-up timelines.
                </p>
              </AnimatedCard>
              <AnimatedCard hover={false}>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Recovered mix
                </h2>
                <EnhancedDoughnutChart
                  data={recovery.map((r) => r.recoveredInINR || 0)}
                  labels={recovery.map((r) => r.category?.replace(/_/g, ' '))}
                  currency
                  height={250}
                  centerLabel="Recovered"
                  centerValue={inr(recovery.reduce((s, r) => s + (r.recoveredInINR || 0), 0))}
                />
              </AnimatedCard>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <AnimatedCard hover={false}>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
      {children}
    </AnimatedCard>
  );
}
function ErrorPanel({ message, onRetry }) {
  return (
    <AnimatedCard hover={false} className="border-red-200 dark:border-red-800">
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-3">
          <AlertTriangle className="text-red-500" />
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Analytics unavailable</h3>
            <p className="text-sm text-gray-500">{message}</p>
          </div>
        </div>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    </AnimatedCard>
  );
}
