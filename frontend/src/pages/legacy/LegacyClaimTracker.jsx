import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock3,
  FileCheck2,
  MessageSquarePlus,
  RefreshCw,
  Send,
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import {
  Badge,
  EmptyState,
  Modal,
  SearchInput,
  SkeletonLoader,
  StatCard,
  Timeline,
} from '../../components/ui/ComponentLibrary';

const statuses = [
  'draft',
  'submitted',
  'acknowledged',
  'under_review',
  'additional_info_required',
  'approved',
  'rejected',
  'settled',
  'appealed',
  'withdrawn',
];
const checklist = {
  insurance_death_claim: [
    'death_certificate',
    'policy_document',
    'nominee_id_proof',
    'bank_passbook',
    'indemnity_bond',
  ],
  loan_recovery: ['loan_agreement', 'death_certificate', 'legal_heir_certificate', 'bank_passbook'],
  investment_redemption: [
    'death_certificate',
    'nominee_id_proof',
    'bank_passbook',
    'succession_certificate',
  ],
  deposit_closure: [
    'death_certificate',
    'nominee_id_proof',
    'nominee_address_proof',
    'bank_passbook',
  ],
  generic_recovery: ['death_certificate', 'legal_heir_certificate', 'bank_passbook'],
};
const unwrap = (res) => res?.data?.data ?? res?.data ?? {};
const arr = (value) => (Array.isArray(value) ? value : []);
const label = (value) => (value || 'unknown').replace(/_/g, ' ');
const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
const fmtDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';
const daysLeft = (value) => (value ? Math.ceil((new Date(value) - new Date()) / 86400000) : null);
const badgeVariant = {
  draft: 'default',
  submitted: 'info',
  acknowledged: 'info',
  under_review: 'purple',
  additional_info_required: 'warning',
  approved: 'success',
  rejected: 'danger',
  settled: 'success',
  appealed: 'warning',
  withdrawn: 'default',
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
          <p className="font-semibold">Unable to load recovery claims</p>
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

export default function LegacyClaimTracker() {
  const [claims, setClaims] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [activeClaim, setActiveClaim] = useState(null);
  const [correspondenceOpen, setCorrespondenceOpen] = useState(false);
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [correspondence, setCorrespondence] = useState({
    direction: 'outbound',
    channel: 'email',
    summary: '',
  });
  const [nextStatus, setNextStatus] = useState('submitted');
  const [note, setNote] = useState('');

  const fetchClaims = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/legacy/claims', {
        params: selectedStatus === 'all' ? {} : { status: selectedStatus },
      });
      const data = unwrap(response);
      setClaims(arr(data.claims || data.items || data));
      setSummary(data.summary || {});
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Claims request failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  const filtered = useMemo(() => {
    const term = query.toLowerCase();
    return claims.filter(
      (claim) =>
        !term ||
        `${claim.claimNumber || ''} ${claim.institution?.name || ''} ${claim.claimType || ''}`
          .toLowerCase()
          .includes(term)
    );
  }, [claims, query]);

  const grouped = useMemo(
    () =>
      statuses
        .map((status) => ({ status, claims: filtered.filter((claim) => claim.status === status) }))
        .filter((group) =>
          selectedStatus === 'all'
            ? group.claims.length ||
              ['submitted', 'under_review', 'approved', 'settled'].includes(group.status)
            : group.status === selectedStatus
        ),
    [filtered, selectedStatus]
  );
  const totalClaimed = filtered.reduce(
    (sum, claim) => sum + Number(claim.claimedAmountInINR || 0),
    0
  );
  const totalReceived = filtered.reduce(
    (sum, claim) => sum + Number(claim.receivedAmountInINR || 0),
    0
  );
  const dueSoon = filtered.filter((claim) => {
    const left = daysLeft(claim.slaDueAt);
    return left !== null && left <= 3 && left >= 0;
  }).length;

  const openCorrespondence = (claim) => {
    setActiveClaim(claim);
    setCorrespondenceOpen(true);
  };
  const openTransition = (claim) => {
    setActiveClaim(claim);
    setNextStatus(claim.status || 'submitted');
    setTransitionOpen(true);
  };

  const saveCorrespondence = async () => {
    if (!correspondence.summary.trim()) return;
    try {
      await api.post(
        `/legacy/claims/${activeClaim._id || activeClaim.id}/correspondence`,
        correspondence
      );
      toast.success('Correspondence logged');
      setCorrespondenceOpen(false);
      setCorrespondence({ direction: 'outbound', channel: 'email', summary: '' });
      fetchClaims();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not log correspondence');
    }
  };

  const transitionClaim = async () => {
    try {
      await api.post(`/legacy/claims/${activeClaim._id || activeClaim.id}/transition`, {
        status: nextStatus,
        note,
      });
      toast.success(`Claim moved to ${label(nextStatus)}`);
      setTransitionOpen(false);
      setNote('');
      fetchClaims();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transition failed');
    }
  };

  const docChecklist = (claim) => checklist[claim.claimType] || checklist.generic_recovery;

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 p-4 dark:bg-slate-950 sm:p-6">
        <SkeletonLoader variant="card" count={4} />
        <div className="mt-6">
          <SkeletonLoader variant="card" count={3} />
        </div>
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen bg-gray-50 p-4 dark:bg-slate-950 sm:p-6">
        <ErrorState message={error} onRetry={fetchClaims} />
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-4 text-gray-900 dark:bg-slate-950 dark:text-white sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header
          className={[
            'flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm',
            'dark:bg-slate-800 lg:flex-row lg:items-center lg:justify-between',
          ].join(' ')}
        >
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">Recovery claims</p>
            <h1 className="text-2xl font-bold">Claim tracker</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Track claim status, required documents, SLA countdowns, and correspondence across all
              estate cases.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchClaims}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm dark:border-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </header>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard
            title="Claims"
            value={summary.total ?? filtered.length}
            icon={<FileCheck2 className="h-5 w-5" />}
            color="#2563eb"
          />
          <StatCard
            title="Claimed"
            value={summary.claimedInINR ?? totalClaimed}
            format="currency"
            icon={<Send className="h-5 w-5" />}
            color="#7c3aed"
          />
          <StatCard
            title="Received"
            value={summary.receivedInINR ?? totalReceived}
            format="currency"
            icon={<FileCheck2 className="h-5 w-5" />}
            color="#16a34a"
          />
          <StatCard
            title="SLA due soon"
            value={summary.dueSoon ?? dueSoon}
            icon={<Clock3 className="h-5 w-5" />}
            color="#d97706"
          />
        </div>
        <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-800">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
            <SearchInput value={query} onChange={setQuery} />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={[
                'rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm',
                'dark:border-slate-700 dark:bg-slate-900',
              ].join(' ')}
            >
              <option value="all">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {label(status)}
                </option>
              ))}
            </select>
          </div>
        </section>
        {filtered.length === 0 ? (
          <EmptyState
            icon="📄"
            title="No recovery claims"
            description="Claims will appear after estate assets are selected for recovery."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
            {grouped.map((group) => (
              <section
                key={group.status}
                className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-800"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-semibold">{label(group.status)}</h2>
                  <Badge variant={badgeVariant[group.status] || 'default'}>
                    {group.claims.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {group.claims.length ? (
                    group.claims.map((claim) => {
                      const left = daysLeft(claim.slaDueAt);
                      return (
                        <article
                          key={claim._id || claim.id}
                          className={[
                            'rounded-xl border p-4 dark:border-slate-700',
                            left < 0
                              ? 'border-red-300 bg-red-50 dark:bg-red-950/20'
                              : 'border-slate-200',
                          ].join(' ')}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">{claim.claimNumber || 'Draft claim'}</p>
                              <p className="text-xs text-slate-500">
                                {label(claim.claimType)} ·{' '}
                                {claim.institution?.name || 'Institution pending'}
                              </p>
                            </div>
                            <Badge variant={badgeVariant[claim.status] || 'default'}>
                              {label(claim.status)}
                            </Badge>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <span>Claimed {money(claim.claimedAmountInINR)}</span>
                            <span>Received {money(claim.receivedAmountInINR)}</span>
                          </div>
                          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-900">
                            <p className="font-semibold">Document checklist</p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {docChecklist(claim).map((doc) => (
                                <Badge
                                  key={doc}
                                  variant={
                                    arr(claim.documents).some(
                                      (d) => d.documentType === doc || d.type === doc
                                    )
                                      ? 'success'
                                      : 'default'
                                  }
                                >
                                  {label(doc)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-xs">
                            <span
                              className={
                                left < 0
                                  ? 'font-semibold text-red-600 dark:text-red-400'
                                  : left <= 3
                                    ? 'font-semibold text-amber-600 dark:text-amber-400'
                                    : 'text-slate-500'
                              }
                            >
                              SLA:{' '}
                              {left === null
                                ? '—'
                                : left < 0
                                  ? `${Math.abs(left)}d breached`
                                  : `${left}d left`}
                            </span>
                            <span>Expected: {fmtDate(claim.expectedSettlementDate)}</span>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => openTransition(claim)}
                              className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white"
                            >
                              Move
                            </button>
                            <button
                              type="button"
                              onClick={() => openCorrespondence(claim)}
                              className="flex-1 rounded-lg border px-3 py-2 text-xs font-medium dark:border-slate-700"
                            >
                              Log note
                            </button>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-500">No claims in this status.</p>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
      <Modal
        isOpen={correspondenceOpen}
        onClose={() => setCorrespondenceOpen(false)}
        title="Log correspondence"
        footer={
          <>
            <button
              type="button"
              onClick={() => setCorrespondenceOpen(false)}
              className="rounded-lg border px-4 py-2 text-sm dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveCorrespondence}
              disabled={!correspondence.summary.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Save
            </button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">
            Direction
            <select
              value={correspondence.direction}
              onChange={(e) => setCorrespondence((f) => ({ ...f, direction: e.target.value }))}
              className="mt-1 w-full rounded-xl border p-2 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="outbound">Outbound</option>
              <option value="inbound">Inbound</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Channel
            <select
              value={correspondence.channel}
              onChange={(e) => setCorrespondence((f) => ({ ...f, channel: e.target.value }))}
              className="mt-1 w-full rounded-xl border p-2 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="portal">Portal</option>
              <option value="letter">Letter</option>
            </select>
          </label>
        </div>
        <label className="mt-4 block text-sm font-medium">
          Summary
          <textarea
            value={correspondence.summary}
            onChange={(e) => setCorrespondence((f) => ({ ...f, summary: e.target.value }))}
            rows={4}
            className="mt-1 w-full rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        {activeClaim?.correspondence?.length > 0 && (
          <div className="mt-4">
            <Timeline
              items={activeClaim.correspondence.map((item) => ({
                title: `${item.direction} ${item.channel}`,
                description: item.summary,
                date: fmtDate(item.at),
                status: 'completed',
              }))}
              maxItems={3}
              showMore
            />
          </div>
        )}
      </Modal>
      <Modal
        isOpen={transitionOpen}
        onClose={() => setTransitionOpen(false)}
        title="Move claim status"
        footer={
          <>
            <button
              type="button"
              onClick={() => setTransitionOpen(false)}
              className="rounded-lg border px-4 py-2 text-sm dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={transitionClaim}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Move
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          {activeClaim?.claimNumber} · current status {label(activeClaim?.status)}
        </p>
        <select
          value={nextStatus}
          onChange={(e) => setNextStatus(e.target.value)}
          className="w-full rounded-xl border p-2 dark:border-slate-700 dark:bg-slate-900"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {label(status)}
            </option>
          ))}
        </select>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          aria-label="Transition note"
          className="mt-4 w-full rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-900"
        />
      </Modal>
    </div>
  );
}
