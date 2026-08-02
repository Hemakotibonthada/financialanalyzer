import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  CalendarClock,
  CheckCircle2,
  Filter,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  Users,
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import {
  Badge,
  DataTable,
  EmptyState,
  Modal,
  SearchInput,
  SkeletonLoader,
  StatCard,
} from '../../components/ui/ComponentLibrary';
import { EnhancedDoughnutChart } from '../../components/ui/ChartComponents';

const stages = [
  'all',
  'watch',
  'dormant',
  'unreachable',
  'welfare_check',
  'deceased_suspected',
  'resolved_alive',
  'escalated_estate',
];
const priorities = ['all', 'low', 'normal', 'high', 'critical'];
const slaFilters = ['all', 'breached', 'due_today', 'due_3_days'];
const stageLabels = {
  welfare_check: 'welfare check',
  deceased_suspected: 'deceased suspected',
  resolved_alive: 'resolved alive',
  escalated_estate: 'estate escalated',
};
const badgeVariant = {
  active: 'success',
  watch: 'info',
  dormant: 'warning',
  unreachable: 'danger',
  welfare_check: 'warning',
  deceased_suspected: 'danger',
  resolved_alive: 'success',
  escalated_estate: 'purple',
  low: 'default',
  normal: 'info',
  high: 'warning',
  critical: 'danger',
};

const unwrap = (res) => res?.data?.data ?? res?.data ?? {};
const arr = (value) => (Array.isArray(value) ? value : []);
const fmtDate = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';
const daysLeft = (value) => (value ? Math.ceil((new Date(value) - new Date()) / 86400000) : null);
const title = (value) => (stageLabels[value] || value || 'unknown').replace(/_/g, ' ');

function ErrorState({ message, onRetry }) {
  return (
    <div
      className={[
        'rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800',
        'dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold">Unable to load dormancy queue</p>
          <p className="text-sm mt-1">{message}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export default function LegacyDormancyQueue() {
  const [cases, setCases] = useState([]);
  const [summary, setSummary] = useState({});
  const [filters, setFilters] = useState({ stage: 'all', priority: 'all', sla: 'all', q: '' });
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignee, setAssignee] = useState('');
  const [sort, setSort] = useState({ key: 'slaDueAt', dir: 'asc' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v && v !== 'all')
      );
      const response = await api.get('/legacy/dormancy', { params });
      const data = unwrap(response);
      const list = arr(data.cases || data.items || data.results || data);
      setCases(list);
      setSummary(data.summary || data.stats || {});
      setSelectedRows(new Set());
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Queue request failed';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const filtered = useMemo(() => {
    const term = filters.q.trim().toLowerCase();
    const passesSla = (item) => {
      const left = daysLeft(item.slaDueAt);
      if (filters.sla === 'breached') return left !== null && left < 0;
      if (filters.sla === 'due_today') return left !== null && left <= 0;
      if (filters.sla === 'due_3_days') return left !== null && left <= 3;
      return true;
    };
    const list = cases.filter((item) => {
      const haystack = [
        item.caseNumber || '',
        item.userId?.name || item.user?.name || '',
        item.userId?.email || item.user?.email || '',
      ]
        .join(' ')
        .toLowerCase();
      return (
        (!term || haystack.includes(term)) &&
        (filters.stage === 'all' || item.stage === filters.stage) &&
        (filters.priority === 'all' || item.priority === filters.priority) &&
        passesSla(item)
      );
    });
    return [...list].sort((a, b) => {
      const av = sort.key.includes('At') ? new Date(a[sort.key] || 0).getTime() : a[sort.key];
      const bv = sort.key.includes('At') ? new Date(b[sort.key] || 0).getTime() : b[sort.key];
      const cmp = typeof av === 'string' ? av.localeCompare(bv || '') : (av || 0) - (bv || 0);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [cases, filters, sort]);

  const selectedCases = useMemo(
    () => [...selectedRows].map((index) => filtered[index]).filter(Boolean),
    [filtered, selectedRows]
  );
  const slaBreaches = filtered.filter((item) => daysLeft(item.slaDueAt) < 0).length;
  const distribution = useMemo(
    () =>
      stages
        .slice(1)
        .map((stage) => ({ stage, count: filtered.filter((item) => item.stage === stage).length }))
        .filter((x) => x.count > 0),
    [filtered]
  );

  const toggleSort = (key) =>
    setSort((prev) => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));

  const bulkAssign = async () => {
    if (!assignee.trim() || selectedCases.length === 0) return;
    try {
      await api.post('/legacy/dormancy/bulk-assign', {
        caseIds: selectedCases.map((item) => item._id || item.id),
        assignedTo: assignee.trim(),
      });
      toast.success(`${selectedCases.length} case(s) assigned`);
      setAssignOpen(false);
      setAssignee('');
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk assignment failed');
    }
  };

  const columns = [
    {
      key: 'caseNumber',
      header: (
        <button
          type="button"
          onClick={() => toggleSort('caseNumber')}
          className="inline-flex items-center gap-1"
        >
          Case <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      render: (_, row) => (
        <div>
          <div className="font-semibold text-gray-900 dark:text-white">
            {row.caseNumber || 'Unnumbered'}
          </div>
          <div className="text-xs text-gray-500">
            {row.userId?.email || row.user?.email || 'No email'}
          </div>
        </div>
      ),
    },
    {
      key: 'stage',
      header: 'Stage',
      render: (value) => <Badge variant={badgeVariant[value] || 'default'}>{title(value)}</Badge>,
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (value) => (
        <Badge variant={badgeVariant[value] || 'default'}>{value || 'normal'}</Badge>
      ),
    },
    {
      key: 'daysInactiveAtDetection',
      header: (
        <button
          type="button"
          onClick={() => toggleSort('daysInactiveAtDetection')}
          className="inline-flex items-center gap-1"
        >
          Inactive <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      render: (value) => `${value ?? '—'} days`,
    },
    {
      key: 'assignedTo',
      header: 'Owner',
      render: (value, row) => value?.name || row.assignedToName || 'Unassigned',
    },
    {
      key: 'slaDueAt',
      header: (
        <button
          type="button"
          onClick={() => toggleSort('slaDueAt')}
          className="inline-flex items-center gap-1"
        >
          SLA <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      render: (value) => {
        const left = daysLeft(value);
        return (
          <span
            className={
              left < 0
                ? 'font-semibold text-red-600 dark:text-red-400'
                : left <= 3
                  ? 'font-semibold text-amber-600 dark:text-amber-400'
                  : ''
            }
          >
            {fmtDate(value)}
            {left !== null && (
              <span className="block text-xs">
                {left < 0 ? `${Math.abs(left)}d breached` : `${left}d left`}
              </span>
            )}
          </span>
        );
      },
    },
  ];

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 p-4 dark:bg-slate-950 sm:p-6">
        <SkeletonLoader variant="card" count={4} />
        <div className="mt-6">
          <SkeletonLoader variant="table" />
        </div>
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen bg-gray-50 p-4 dark:bg-slate-950 sm:p-6">
        <ErrorState message={error} onRetry={fetchQueue} />
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-4 text-gray-900 dark:bg-slate-950 dark:text-white sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header
          className={[
            'flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm',
            'dark:bg-slate-800 md:flex-row md:items-center md:justify-between',
          ].join(' ')}
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Support queue
            </p>
            <h1 className="text-2xl font-bold">Legacy Guard dormancy triage</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              Review inactivity cases, protect dormant accounts, and route welfare checks with
              careful human oversight.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchQueue}
            className={[
              'inline-flex items-center justify-center gap-2 rounded-xl border',
              'border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50',
              'dark:border-slate-700 dark:hover:bg-slate-700',
            ].join(' ')}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Open cases"
            value={summary.open ?? filtered.length}
            icon={<Users className="h-5 w-5" />}
            color="#334155"
          />
          <StatCard
            title="SLA breaches"
            value={summary.slaBreaches ?? slaBreaches}
            icon={<ShieldAlert className="h-5 w-5" />}
            color="#dc2626"
          />
          <StatCard
            title="Welfare checks"
            value={
              summary.welfareChecks ?? filtered.filter((x) => x.stage === 'welfare_check').length
            }
            icon={<UserCheck className="h-5 w-5" />}
            color="#d97706"
          />
          <StatCard
            title="Estate escalations"
            value={
              summary.estateEscalations ??
              filtered.filter((x) => x.stage === 'escalated_estate').length
            }
            icon={<CheckCircle2 className="h-5 w-5" />}
            color="#7c3aed"
          />
        </div>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
          <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-800">
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
              <SearchInput
                value={filters.q}
                onChange={(q) => setFilters((f) => ({ ...f, q }))}
                className="md:col-span-2"
              />
              <select
                value={filters.stage}
                onChange={(e) => setFilters((f) => ({ ...f, stage: e.target.value }))}
                className={[
                  'rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm',
                  'dark:border-slate-700 dark:bg-slate-900',
                ].join(' ')}
              >
                <option value="all">All stages</option>
                {stages.slice(1).map((s) => (
                  <option key={s} value={s}>
                    {title(s)}
                  </option>
                ))}
              </select>
              <select
                value={filters.priority}
                onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
                className={[
                  'rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm',
                  'dark:border-slate-700 dark:bg-slate-900',
                ].join(' ')}
              >
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {p === 'all' ? 'All priority' : p}
                  </option>
                ))}
              </select>
              <select
                value={filters.sla}
                onChange={(e) => setFilters((f) => ({ ...f, sla: e.target.value }))}
                className={[
                  'rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm',
                  'dark:border-slate-700 dark:bg-slate-900',
                ].join(' ')}
              >
                {slaFilters.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="hidden md:block">
              <DataTable
                columns={columns}
                data={filtered}
                selectable
                selectedRows={selectedRows}
                onSelectionChange={setSelectedRows}
                emptyMessage="No dormancy cases match these filters"
                bulkActions={
                  <button
                    type="button"
                    onClick={() => setAssignOpen(true)}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Assign selected
                  </button>
                }
              />
            </div>
            <div className="space-y-3 md:hidden">
              {filtered.length === 0 ? (
                <EmptyState
                  icon="🛡️"
                  title="No dormancy cases"
                  description="Adjust filters or retry after the next scan."
                />
              ) : (
                filtered.map((item, index) => {
                  const left = daysLeft(item.slaDueAt);
                  return (
                    <article
                      key={item._id || item.id || index}
                      className={[
                        'rounded-2xl border p-4 dark:border-slate-700',
                        left < 0
                          ? 'border-red-300 bg-red-50 dark:bg-red-950/20'
                          : 'bg-white dark:bg-slate-900',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{item.caseNumber || 'Unnumbered case'}</p>
                          <p className="text-xs text-slate-500">
                            {item.userId?.name || item.user?.name || 'Unknown user'}
                          </p>
                        </div>
                        <input
                          aria-label="Select case"
                          type="checkbox"
                          checked={selectedRows.has(index)}
                          onChange={() =>
                            setSelectedRows((prev) => {
                              const next = new Set(prev);
                              next.has(index) ? next.delete(index) : next.add(index);
                              return next;
                            })
                          }
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant={badgeVariant[item.stage] || 'default'}>
                          {title(item.stage)}
                        </Badge>
                        <Badge variant={badgeVariant[item.priority] || 'default'}>
                          {item.priority || 'normal'}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm">
                        <CalendarClock className="mr-1 inline h-4 w-4" /> SLA:{' '}
                        {fmtDate(item.slaDueAt)}
                      </p>
                    </article>
                  );
                })
              )}
            </div>
          </div>
          <aside className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
            <div className="mb-4 flex items-center gap-2">
              <Filter className="h-5 w-5 text-slate-500" />
              <h2 className="font-semibold">Stage distribution</h2>
            </div>
            {distribution.length ? (
              <EnhancedDoughnutChart
                data={distribution.map((x) => x.count)}
                labels={distribution.map((x) => title(x.stage))}
                centerLabel="Cases"
                centerValue={filtered.length}
                height={280}
              />
            ) : (
              <EmptyState
                icon="📭"
                title="No distribution"
                description="No cases are available for the current filters."
              />
            )}
          </aside>
        </section>
      </div>
      <Modal
        isOpen={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Bulk assign dormancy cases"
        footer={
          <>
            <button
              type="button"
              onClick={() => setAssignOpen(false)}
              className="rounded-lg border px-4 py-2 text-sm dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={bulkAssign}
              disabled={!assignee.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Assign
            </button>
          </>
        }
      >
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          Assign {selectedCases.length} selected case(s) to a support user ID or queue alias.
        </p>
        <label className="text-sm font-medium">Assignee</label>
        <input
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          className={[
            'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2',
            'dark:border-slate-700 dark:bg-slate-900',
          ].join(' ')}
          autoFocus
        />
      </Modal>
    </div>
  );
}
