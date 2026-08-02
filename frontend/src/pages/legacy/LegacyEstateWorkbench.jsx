import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  FileUp,
  Gavel,
  RefreshCw,
  ShieldCheck,
  Undo2,
  UserRound,
  XCircle,
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import {
  AnimatedTabs,
  Badge,
  DataTable,
  EmptyState,
  Modal,
  SkeletonLoader,
  StatCard,
  Stepper,
  Timeline,
} from '../../components/ui/ComponentLibrary';
import { EnhancedDoughnutChart } from '../../components/ui/ChartComponents';

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'verification', label: 'Verification' },
  { key: 'claimant', label: 'Claimant/Nominee' },
  { key: 'assets', label: 'Assets' },
  { key: 'claims', label: 'Claims' },
  { key: 'settlement', label: 'Settlement' },
  { key: 'audit', label: 'Audit Trail' },
];
const statuses = [
  'initiated',
  'verification_pending',
  'verified',
  'asset_discovery',
  'claims_in_progress',
  'settlement_pending',
  'disbursed',
  'closed',
  'rejected',
  'revoked',
];
const methods = [
  'death_certificate',
  'municipal_record',
  'hospital_record',
  'family_affidavit',
  'legal_heir_certificate',
  'court_order',
  'police_report',
];
const docTypes = [
  'death_certificate',
  'legal_heir_certificate',
  'succession_certificate',
  'nominee_id_proof',
  'nominee_address_proof',
  'bank_passbook',
  'policy_document',
  'loan_agreement',
  'indemnity_bond',
  'affidavit',
  'court_order',
  'photograph',
  'other',
];
const badgeVariant = {
  initiated: 'info',
  verification_pending: 'warning',
  verified: 'success',
  asset_discovery: 'info',
  claims_in_progress: 'purple',
  settlement_pending: 'warning',
  disbursed: 'success',
  closed: 'success',
  rejected: 'danger',
  revoked: 'danger',
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
    ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';
const currentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
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
          <p className="font-semibold">Unable to load estate workbench</p>
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

export default function LegacyEstateWorkbench() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [estate, setEstate] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [assets, setAssets] = useState([]);
  const [claims, setClaims] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [docForm, setDocForm] = useState({
    documentType: 'death_certificate',
    method: 'death_certificate',
    file: null,
    notes: '',
  });
  const user = currentUser();

  const fetchWorkbench = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/legacy/estate/${id}`);
      const data = unwrap(response);
      setEstate(data.case || data.estateCase || data);
      setDocuments(arr(data.documents || data.case?.documents));
      setAssets(arr(data.assets));
      setClaims(arr(data.claims));
      setAudit(arr(data.audit || data.auditTrail));
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Estate case request failed';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWorkbench();
  }, [fetchWorkbench]);

  const approval = estate?.approval || {};
  const proposerId =
    approval.proposedBy?._id ||
    approval.proposedBy ||
    estate?.deceased?.reportedBy?._id ||
    estate?.deceased?.reportedBy;
  const isProposer = user?._id && proposerId && String(user._id) === String(proposerId);
  const approvalPending = (approval.decision || 'pending') === 'pending';
  const statusIndex = Math.max(0, statuses.indexOf(estate?.status));
  const nomineeDisclaimer = (
    <div
      className={[
        'rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900',
        'dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200',
      ].join(' ')}
    >
      <Gavel className="mr-2 inline h-4 w-4" />
      Nominee ≠ legal heir in India. A nominee is a trustee who receives funds, not necessarily the
      legal owner. Check legal heir documents and dispute flags before disbursement.
    </div>
  );

  const postAction = async (path, payload, success) => {
    try {
      await api.post(path, payload);
      toast.success(success);
      setApproveOpen(false);
      setRejectOpen(false);
      setRevokeOpen(false);
      setReason('');
      fetchWorkbench();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const uploadDocument = async () => {
    if (!docForm.file) return toast.error('Choose a document file');
    const formData = new FormData();
    formData.append('document', docForm.file);
    formData.append('documentType', docForm.documentType);
    formData.append('method', docForm.method);
    formData.append('notes', docForm.notes);
    try {
      await api.post(`/legacy/estate/${id}/documents`, formData);
      toast.success('Document uploaded for review');
      setUploadOpen(false);
      setDocForm({
        documentType: 'death_certificate',
        method: 'death_certificate',
        file: null,
        notes: '',
      });
      fetchWorkbench();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    }
  };

  const assetSplit = useMemo(() => {
    const assetsValue = assets
      .filter((x) => x.kind !== 'liability')
      .reduce((s, x) => s + Number(x.estimatedValueInINR || x.estimatedValue || 0), 0);
    const liabilitiesValue = assets
      .filter((x) => x.kind === 'liability')
      .reduce((s, x) => s + Number(x.estimatedValueInINR || x.estimatedValue || 0), 0);
    return { assetsValue, liabilitiesValue };
  }, [assets]);

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
        <ErrorState message={error} onRetry={fetchWorkbench} />
      </div>
    );
  if (!estate)
    return (
      <div className="min-h-screen bg-gray-50 p-4 dark:bg-slate-950">
        <EmptyState title="Estate case not found" />
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-4 text-gray-900 dark:bg-slate-950 dark:text-white sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500">Estate workbench</p>
              <h1 className="text-2xl font-bold">{estate.caseNumber || 'Estate case'}</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Careful verification, recovery orchestration, and settlement. Deceased marking is
                reversible and audit logged.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant={badgeVariant[estate.status] || 'default'}>
                  {label(estate.status)}
                </Badge>
                {estate.revocation?.revoked && (
                  <Badge variant="danger">revoked: {estate.revocation.reason}</Badge>
                )}
                {estate.disputeFlag && <Badge variant="warning">nominee/heir dispute</Badge>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className={[
                  'inline-flex items-center gap-2 rounded-xl bg-blue-600',
                  'px-4 py-2 text-sm font-medium text-white',
                ].join(' ')}
              >
                <FileUp className="h-4 w-4" />
                Upload document
              </button>
              <button
                type="button"
                onClick={() => setRevokeOpen(true)}
                className={[
                  'inline-flex items-center gap-2 rounded-xl border border-red-300',
                  'px-4 py-2 text-sm font-medium text-red-700',
                  'dark:border-red-900 dark:text-red-300',
                ].join(' ')}
              >
                <Undo2 className="h-4 w-4" />
                Revoke marking
              </button>
              <button
                type="button"
                onClick={fetchWorkbench}
                aria-label="Refresh workbench"
                className="rounded-xl border p-2 dark:border-slate-700"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>
        <section className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-800">
          <Stepper steps={statuses.map((s) => ({ label: label(s) }))} currentStep={statusIndex} />
        </section>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard
            title="Discovered assets"
            value={estate.totals?.discoveredAssetsInINR || assetSplit.assetsValue}
            format="currency"
            icon={<Archive className="h-5 w-5" />}
            color="#2563eb"
          />
          <StatCard
            title="Liabilities"
            value={estate.totals?.discoveredLiabilitiesInINR || assetSplit.liabilitiesValue}
            format="currency"
            icon={<AlertTriangle className="h-5 w-5" />}
            color="#dc2626"
          />
          <StatCard
            title="Recovered"
            value={estate.totals?.recoveredInINR || 0}
            format="currency"
            icon={<CheckCircle2 className="h-5 w-5" />}
            color="#16a34a"
          />
          <StatCard
            title="Success fee"
            value={estate.totals?.feeInINR || 0}
            format="currency"
            icon={<ShieldCheck className="h-5 w-5" />}
            color="#7c3aed"
          />
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-800">
          <AnimatedTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="pills" />
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
            <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
              <h2 className="mb-4 text-lg font-semibold">Approval state</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border p-4 dark:border-slate-700">
                  <p className="text-xs uppercase text-slate-500">Proposed by</p>
                  <p className="font-semibold">
                    {approval.proposedBy?.name || approval.proposedByName || 'Not recorded'}
                  </p>
                  <p className="text-sm text-slate-500">
                    {fmtDate(approval.proposedAt || estate.deceased?.reportedAt)}
                  </p>
                </div>
                <div className="rounded-xl border p-4 dark:border-slate-700">
                  <p className="text-xs uppercase text-slate-500">Decision</p>
                  <Badge
                    variant={
                      approval.decision === 'approved'
                        ? 'success'
                        : approval.decision === 'rejected'
                          ? 'danger'
                          : 'warning'
                    }
                  >
                    {approval.decision || 'pending'}
                  </Badge>
                </div>
                <div className="rounded-xl border p-4 dark:border-slate-700">
                  <p className="text-xs uppercase text-slate-500">Approved by</p>
                  <p className="font-semibold">
                    {approval.approvedBy?.name ||
                      approval.approvedByName ||
                      'Awaiting different approver'}
                  </p>
                  <p className="text-sm text-slate-500">{fmtDate(approval.approvedAt)}</p>
                </div>
              </div>
              <div
                className={[
                  'mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm',
                  'dark:border-slate-700 dark:bg-slate-900',
                ].join(' ')}
              >
                <p className="font-semibold">Maker-checker safeguard</p>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  Death is never auto-detected. The approver must be different from the proposer.
                  Backend enforces this; the UI also disables approval for the proposer.
                </p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={!approvalPending || isProposer}
                  onClick={() => setApproveOpen(true)}
                  className={[
                    'inline-flex items-center gap-2 rounded-xl bg-emerald-600',
                    'px-4 py-2 text-sm font-medium text-white',
                    'disabled:cursor-not-allowed disabled:opacity-40',
                  ].join(' ')}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve deceased marking
                </button>
                <button
                  type="button"
                  disabled={!approvalPending}
                  onClick={() => setRejectOpen(true)}
                  className={[
                    'inline-flex items-center gap-2 rounded-xl bg-red-600',
                    'px-4 py-2 text-sm font-medium text-white disabled:opacity-40',
                  ].join(' ')}
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
                {isProposer && (
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    You are the proposer, so you cannot approve this case.
                  </p>
                )}
              </div>
            </section>
            <aside className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
              <h2 className="mb-4 text-lg font-semibold">Asset/liability split</h2>
              <EnhancedDoughnutChart
                data={[assetSplit.assetsValue, assetSplit.liabilitiesValue]}
                labels={['Assets', 'Liabilities']}
                currency
                centerLabel="Net"
                centerValue={money(assetSplit.assetsValue - assetSplit.liabilitiesValue)}
                height={280}
              />
            </aside>
          </div>
        )}
        {activeTab === 'verification' && (
          <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
            <div className="mb-4 flex justify-between">
              <h2 className="text-lg font-semibold">Verification documents</h2>
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white"
              >
                Upload
              </button>
            </div>
            <DataTable
              columns={[
                { key: 'documentType', header: 'Type', render: (v) => label(v) },
                { key: 'fileName', header: 'File' },
                {
                  key: 'status',
                  header: 'Status',
                  render: (v) => (
                    <Badge
                      variant={
                        v === 'verified' ? 'success' : v === 'rejected' ? 'danger' : 'warning'
                      }
                    >
                      {label(v)}
                    </Badge>
                  ),
                },
                {
                  key: 'uploadedBy',
                  header: 'Uploaded by',
                  render: (v, r) => v?.name || r.uploadedByName || '—',
                },
                {
                  key: 'reviewedBy',
                  header: 'Reviewed by',
                  render: (v, r) => v?.name || r.reviewedByName || '—',
                },
              ]}
              data={documents}
              emptyMessage="No verification documents uploaded"
            />
          </section>
        )}
        {activeTab === 'claimant' && (
          <section className="space-y-4 rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
            {nomineeDisclaimer}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border p-4 dark:border-slate-700">
                <UserRound className="mb-2 h-5 w-5 text-slate-500" />
                <p className="text-xs uppercase text-slate-500">Claimant / nominee</p>
                <h3 className="text-lg font-semibold">
                  {estate.claimant?.fullName || 'Not attached'}
                </h3>
                <p className="text-sm text-slate-500">
                  {label(estate.claimant?.relationship)} ·{' '}
                  {estate.claimant?.isLegalHeir ? 'Legal heir indicated' : 'Nominee/trustee only'}
                </p>
              </div>
              <div className="rounded-xl border p-4 dark:border-slate-700">
                <p className="text-xs uppercase text-slate-500">Dispute status</p>
                <Badge variant={estate.disputeFlag ? 'warning' : 'success'}>
                  {estate.disputeFlag ? 'Dispute flagged' : 'No dispute flag'}
                </Badge>
                <p className="mt-2 text-sm text-slate-500">
                  {estate.disputeNotes || 'No dispute notes recorded.'}
                </p>
              </div>
            </div>
          </section>
        )}
        {activeTab === 'assets' && (
          <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
            <DataTable
              columns={[
                {
                  key: 'kind',
                  header: 'Kind',
                  render: (v) => (
                    <Badge variant={v === 'liability' ? 'danger' : 'success'}>{v}</Badge>
                  ),
                },
                { key: 'title', header: 'Title' },
                { key: 'category', header: 'Category', render: (v) => label(v) },
                {
                  key: 'estimatedValueInINR',
                  header: 'Estimated',
                  align: 'right',
                  render: (v, r) => money(v || r.estimatedValue),
                },
                { key: 'status', header: 'Status', render: (v) => <Badge>{label(v)}</Badge> },
              ]}
              data={assets}
              emptyMessage="No discovered assets or liabilities"
            />
          </section>
        )}
        {activeTab === 'claims' && (
          <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
            <DataTable
              columns={[
                { key: 'claimNumber', header: 'Claim' },
                { key: 'claimType', header: 'Type', render: (v) => label(v) },
                {
                  key: 'status',
                  header: 'Status',
                  render: (v) => (
                    <Badge
                      variant={v === 'settled' ? 'success' : v === 'rejected' ? 'danger' : 'info'}
                    >
                      {label(v)}
                    </Badge>
                  ),
                },
                {
                  key: 'claimedAmountInINR',
                  header: 'Claimed',
                  align: 'right',
                  render: (v) => money(v),
                },
                {
                  key: 'receivedAmountInINR',
                  header: 'Received',
                  align: 'right',
                  render: (v) => money(v),
                },
              ]}
              data={claims}
              emptyMessage="No recovery claims"
            />
          </section>
        )}
        {activeTab === 'settlement' && (
          <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
            <h2 className="mb-4 text-lg font-semibold">Settlement and fee basis</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                <p className="text-sm text-slate-500">Recovered only</p>
                <p className="text-2xl font-bold">{money(estate.totals?.recoveredInINR)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                <p className="text-sm text-slate-500">1% success fee</p>
                <p className="text-2xl font-bold">
                  {money((estate.totals?.recoveredInINR || 0) * 0.01)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                <p className="text-sm text-slate-500">GST @ 18%</p>
                <p className="text-2xl font-bold">
                  {money((estate.totals?.recoveredInINR || 0) * 0.01 * 0.18)}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Fee is never charged on discovered value, only on amount recovered.
            </p>
          </section>
        )}
        {activeTab === 'audit' && (
          <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
            <h2 className="mb-4 text-lg font-semibold">Append-only audit trail</h2>
            {audit.length ? (
              <Timeline
                items={audit.map((x) => ({
                  title: x.action,
                  description: `${x.actorRole || ''} ${x.reason || ''}`.trim(),
                  date: fmtDate(x.occurredAt),
                  status: 'completed',
                }))}
                showMore
                maxItems={10}
              />
            ) : (
              <EmptyState
                title="No audit events"
                description="Support access and estate decisions will appear here."
              />
            )}
          </section>
        )}
      </div>
      <Modal
        isOpen={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="Approve deceased marking"
        footer={
          <>
            <button
              type="button"
              onClick={() => setApproveOpen(false)}
              className="rounded-lg border px-4 py-2 text-sm dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                postAction(
                  `/legacy/estate/${id}/approve-deceased`,
                  { notes: reason },
                  'Deceased marking approved'
                )
              }
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
            >
              Approve
            </button>
          </>
        }
      >
        <div
          className={[
            'rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800',
            'dark:border-red-900 dark:bg-red-950/30 dark:text-red-200',
          ].join(' ')}
        >
          <p className="font-semibold">Consequences</p>
          <p>
            Approval opens estate workflows, freezes sensitive actions, notifies authorised parties,
            and starts auditable recovery steps. It is reversible through revoke with mandatory
            reason. No account data is deleted.
          </p>
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          aria-label="Approval notes"
          className="mt-4 w-full rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-900"
        />
      </Modal>
      <Modal
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject deceased proposal"
        footer={
          <>
            <button
              type="button"
              onClick={() => setRejectOpen(false)}
              className="rounded-lg border px-4 py-2 text-sm dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                postAction(`/legacy/estate/${id}/reject-deceased`, { reason }, 'Proposal rejected')
              }
              disabled={!reason.trim()}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Reject
            </button>
          </>
        }
      >
        <label className="text-sm font-medium">
          Rejection reason
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
      </Modal>
      <Modal
        isOpen={revokeOpen}
        onClose={() => setRevokeOpen(false)}
        title="Revoke deceased marking"
        footer={
          <>
            <button
              type="button"
              onClick={() => setRevokeOpen(false)}
              className="rounded-lg border px-4 py-2 text-sm dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                postAction(`/legacy/estate/${id}/revoke`, { reason }, 'Deceased marking revoked')
              }
              disabled={!reason.trim()}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Revoke
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Every deceased marking is reversible. Revocation records a false alarm or correction and
          preserves the audit trail.
        </p>
        <label className="mt-4 block text-sm font-medium">
          Mandatory reason
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
      </Modal>
      <Modal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload verification document"
        footer={
          <>
            <button
              type="button"
              onClick={() => setUploadOpen(false)}
              className="rounded-lg border px-4 py-2 text-sm dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={uploadDocument}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Upload
            </button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">
            Document type
            <select
              value={docForm.documentType}
              onChange={(e) => setDocForm((f) => ({ ...f, documentType: e.target.value }))}
              className="mt-1 w-full rounded-xl border p-2 dark:border-slate-700 dark:bg-slate-900"
            >
              {docTypes.map((x) => (
                <option key={x} value={x}>
                  {label(x)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Verification method
            <select
              value={docForm.method}
              onChange={(e) => setDocForm((f) => ({ ...f, method: e.target.value }))}
              className="mt-1 w-full rounded-xl border p-2 dark:border-slate-700 dark:bg-slate-900"
            >
              {methods.map((x) => (
                <option key={x} value={x}>
                  {label(x)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <input
          type="file"
          onChange={(e) => setDocForm((f) => ({ ...f, file: e.target.files?.[0] || null }))}
          className="mt-4 w-full rounded-xl border p-3 dark:border-slate-700"
        />
        <textarea
          value={docForm.notes}
          onChange={(e) => setDocForm((f) => ({ ...f, notes: e.target.value }))}
          rows={3}
          aria-label="Review notes"
          className="mt-4 w-full rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-900"
        />
      </Modal>
    </div>
  );
}
