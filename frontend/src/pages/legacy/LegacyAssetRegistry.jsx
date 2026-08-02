import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Coins, Edit3, PlayCircle, RefreshCw, Scale } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import {
  Badge,
  DataTable,
  EmptyState,
  Modal,
  SkeletonLoader,
  StatCard,
} from '../../components/ui/ComponentLibrary';
import { EnhancedDoughnutChart } from '../../components/ui/ChartComponents';

const statuses = [
  'discovered',
  'verified',
  'claim_initiated',
  'claim_in_progress',
  'recovered',
  'partially_recovered',
  'unrecoverable',
  'disputed',
  'written_off',
];
const unwrap = (res) => res?.data?.data ?? res?.data ?? {};
const arr = (value) => (Array.isArray(value) ? value : []);
const label = (value) => (value || 'unknown').replace(/_/g, ' ');
const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
const badgeVariant = {
  asset: 'success',
  liability: 'danger',
  recovered: 'success',
  partially_recovered: 'warning',
  disputed: 'danger',
  unrecoverable: 'danger',
  claim_in_progress: 'info',
  verified: 'success',
};

function ErrorState({ message, onRetry }) {
  return (
    <div
      className={[
        'rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800',
        'dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200',
      ].join(' ')}
    >
      <div className="flex gap-3">
        <AlertTriangle className="h-5 w-5" />
        <div className="flex-1">
          <p className="font-semibold">Unable to load asset registry</p>
          <p className="text-sm">{message}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export default function LegacyAssetRegistry() {
  const { id } = useParams();
  const [assets, setAssets] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/legacy/estate/${id}/assets`);
      const data = unwrap(response);
      setAssets(arr(data.assets || data.items || data));
      setSummary(data.summary || {});
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Asset registry request failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const totals = useMemo(
    () => ({
      assets: assets
        .filter((x) => x.kind !== 'liability')
        .reduce((s, x) => s + Number(x.estimatedValueInINR || x.estimatedValue || 0), 0),
      liabilities: assets
        .filter((x) => x.kind === 'liability')
        .reduce((s, x) => s + Number(x.estimatedValueInINR || x.estimatedValue || 0), 0),
      recovered: assets.reduce((s, x) => s + Number(x.recoveredValueInINR || 0), 0),
    }),
    [assets]
  );

  const runDiscovery = async () => {
    try {
      setRunning(true);
      const response = await api.post(`/legacy/estate/${id}/assets/discover`);
      const data = unwrap(response);
      toast.success(data.message || 'Asset discovery completed');
      fetchAssets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Discovery failed');
    } finally {
      setRunning(false);
    }
  };

  const saveAsset = async () => {
    try {
      await api.patch(`/legacy/estate/${id}/assets/${editing._id || editing.id}`, {
        status: editing.status,
        recoveredValueInINR: Number(editing.recoveredValueInINR || 0),
        notes: editing.notes,
      });
      toast.success('Asset updated');
      setEditing(null);
      fetchAssets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const columns = [
    {
      key: 'kind',
      header: 'Kind',
      render: (v) => <Badge variant={badgeVariant[v] || 'default'}>{v}</Badge>,
    },
    {
      key: 'title',
      header: 'Asset / liability',
      render: (v, r) => (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{v}</p>
          <p className="text-xs text-slate-500">{r.institution || r.sourceModel || 'Manual'}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (v) => label(v) },
    {
      key: 'estimatedValueInINR',
      header: 'Estimated',
      align: 'right',
      render: (v, r) => money(v || r.estimatedValue),
    },
    { key: 'recoveredValueInINR', header: 'Recovered', align: 'right', render: (v) => money(v) },
    {
      key: 'status',
      header: 'Status',
      render: (v) => <Badge variant={badgeVariant[v] || 'default'}>{label(v)}</Badge>,
    },
    {
      key: 'recoverability',
      header: 'Recoverability',
      render: (v) => (
        <Badge variant={v === 'high' ? 'success' : v === 'low' ? 'warning' : 'default'}>
          {v || 'unknown'}
        </Badge>
      ),
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
        <ErrorState message={error} onRetry={fetchAssets} />
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
            <p className="text-sm uppercase tracking-wide text-slate-500">Estate assets</p>
            <h1 className="text-2xl font-bold">Asset and liability registry</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Discovery is idempotent and snapshots sources. Success fee applies only to recovered
              amounts.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={runDiscovery}
              disabled={running}
              className={[
                'inline-flex items-center gap-2 rounded-xl bg-blue-600',
                'px-4 py-2 text-sm font-medium text-white disabled:opacity-50',
              ].join(' ')}
            >
              <PlayCircle className="h-4 w-4" />
              {running ? 'Running...' : 'Run discovery'}
            </button>
            <button
              type="button"
              onClick={fetchAssets}
              aria-label="Refresh assets"
              className="rounded-xl border p-2 dark:border-slate-700"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </header>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard
            title="Asset value"
            value={summary.assetsInINR ?? totals.assets}
            format="currency"
            icon={<Coins className="h-5 w-5" />}
            color="#2563eb"
          />
          <StatCard
            title="Liabilities"
            value={summary.liabilitiesInINR ?? totals.liabilities}
            format="currency"
            icon={<Scale className="h-5 w-5" />}
            color="#dc2626"
          />
          <StatCard
            title="Recovered"
            value={summary.recoveredInINR ?? totals.recovered}
            format="currency"
            icon={<Coins className="h-5 w-5" />}
            color="#16a34a"
          />
          <StatCard
            title="Net estimate"
            value={totals.assets - totals.liabilities}
            format="currency"
            icon={<Scale className="h-5 w-5" />}
            color="#7c3aed"
          />
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
          <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-800">
            <div className="hidden md:block">
              <DataTable
                columns={columns}
                data={assets}
                emptyMessage="No assets discovered yet"
                actions={(row) => (
                  <button
                    type="button"
                    onClick={() => setEditing({ ...row })}
                    className={[
                      'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs',
                      'dark:border-slate-700',
                    ].join(' ')}
                  >
                    <Edit3 className="h-3 w-3" />
                    Edit
                  </button>
                )}
              />
            </div>
            <div className="space-y-3 md:hidden">
              {assets.length ? (
                assets.map((asset) => (
                  <article
                    key={asset._id || asset.id}
                    className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                  >
                    <div className="flex justify-between">
                      <Badge variant={badgeVariant[asset.kind] || 'default'}>{asset.kind}</Badge>
                      <button
                        type="button"
                        aria-label="Edit asset"
                        onClick={() => setEditing({ ...asset })}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </div>
                    <h3 className="mt-2 font-semibold">{asset.title}</h3>
                    <p className="text-sm text-slate-500">
                      {label(asset.category)} · {asset.institution || 'No institution'}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <span>
                        Estimated: {money(asset.estimatedValueInINR || asset.estimatedValue)}
                      </span>
                      <span>Recovered: {money(asset.recoveredValueInINR)}</span>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState
                  title="No registry items"
                  description="Run discovery to scan known finance modules."
                />
              )}
            </div>
          </section>
          <aside className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
            <h2 className="mb-4 text-lg font-semibold">Assets vs liabilities</h2>
            <EnhancedDoughnutChart
              data={[totals.assets, totals.liabilities]}
              labels={['Assets', 'Liabilities']}
              currency
              centerLabel="Recovered"
              centerValue={money(totals.recovered)}
              height={280}
            />
          </aside>
        </div>
      </div>
      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title="Edit registry item"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg border px-4 py-2 text-sm dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveAsset}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Save
            </button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div>
              <p className="font-semibold">{editing.title}</p>
              <p className="text-sm text-slate-500">{editing.institution || editing.sourceModel}</p>
            </div>
            <label className="block text-sm font-medium">
              Status
              <select
                value={editing.status || 'discovered'}
                onChange={(e) => setEditing((f) => ({ ...f, status: e.target.value }))}
                className="mt-1 w-full rounded-xl border p-2 dark:border-slate-700 dark:bg-slate-900"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Recovered amount (INR)
              <input
                type="number"
                value={editing.recoveredValueInINR || ''}
                onChange={(e) => setEditing((f) => ({ ...f, recoveredValueInINR: e.target.value }))}
                className="mt-1 w-full rounded-xl border p-2 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="block text-sm font-medium">
              Notes
              <textarea
                value={editing.notes || ''}
                onChange={(e) => setEditing((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}
