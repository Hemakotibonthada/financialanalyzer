import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  MessageSquarePlus,
  Phone,
  RefreshCw,
  ShieldAlert,
  Undo2,
  UserRoundCheck,
} from 'lucide-react';
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
  Timeline,
} from '../../components/ui/ComponentLibrary';

const channels = [
  'email',
  'sms',
  'phone_call',
  'whatsapp',
  'postal',
  'in_app',
  'nominee_contact',
  'emergency_contact',
];
const outcomes = [
  'no_answer',
  'reached_user',
  'reached_family',
  'wrong_number',
  'number_invalid',
  'mailbox_full',
  'bounced',
  'callback_requested',
  'refused',
  'confirmed_alive',
  'death_reported',
  'other',
];
const badgeVariant = {
  reached_user: 'success',
  confirmed_alive: 'success',
  death_reported: 'danger',
  no_answer: 'warning',
  bounced: 'danger',
  callback_requested: 'info',
  open: 'info',
  closed_alive: 'success',
  escalated_estate: 'purple',
  welfare_check: 'warning',
  deceased_suspected: 'danger',
};
const unwrap = (res) => res?.data?.data ?? res?.data ?? {};
const arr = (value) => (Array.isArray(value) ? value : []);
const label = (value) => (value || 'unknown').replace(/_/g, ' ');
const fmtDate = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

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
          <p className="font-semibold">Unable to load dormancy case</p>
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

export default function LegacyCaseDetail() {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logOpen, setLogOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [aliveOpen, setAliveOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [interaction, setInteraction] = useState({
    channel: 'phone_call',
    outcome: 'no_answer',
    contactedParty: 'user',
    direction: 'outbound',
    notes: '',
    followUpRequired: false,
    followUpAt: '',
  });
  const [notes, setNotes] = useState('');

  const fetchCase = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/legacy/dormancy/${id}`);
      const data = unwrap(response);
      setCaseData(data.case || data.dormancyCase || data);
      setInteractions(arr(data.interactions || data.outreach || data.case?.outreachHistory));
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Case request failed';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  const timeline = useMemo(
    () =>
      arr(caseData?.timeline).map((item) => ({
        title: label(item.action),
        description: item.detail || item.notes,
        date: fmtDate(item.at),
        status: item.action?.includes('resolve') ? 'completed' : 'active',
      })),
    [caseData]
  );
  const activityTimeline = useMemo(
    () => [
      {
        title: 'Last meaningful activity',
        description: `${caseData?.daysInactiveAtDetection ?? '—'} days inactive at detection`,
        date: fmtDate(caseData?.activityIndexId?.lastMeaningfulActivityAt || caseData?.detectedAt),
        status: 'completed',
      },
      {
        title: 'Dormancy stage set',
        description: label(caseData?.stage),
        date: fmtDate(caseData?.stageChangedAt || caseData?.detectedAt),
        status: 'active',
      },
      ...timeline,
    ],
    [caseData, timeline]
  );

  const submitInteraction = async () => {
    try {
      setSubmitting(true);
      await api.post(`/legacy/dormancy/${id}/outreach`, interaction);
      toast.success('Outreach attempt recorded');
      setLogOpen(false);
      setInteraction({
        channel: 'phone_call',
        outcome: 'no_answer',
        contactedParty: 'user',
        direction: 'outbound',
        notes: '',
        followUpRequired: false,
        followUpAt: '',
      });
      fetchCase();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not record outreach');
    } finally {
      setSubmitting(false);
    }
  };

  const escalate = async () => {
    if (!notes.trim()) return;
    try {
      setSubmitting(true);
      await api.post(`/legacy/dormancy/${id}/escalate`, { notes });
      toast.success('Case escalated for estate verification');
      setEscalateOpen(false);
      setNotes('');
      fetchCase();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Escalation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const resolveAlive = async () => {
    if (!notes.trim()) return;
    try {
      setSubmitting(true);
      await api.post(`/legacy/dormancy/${id}/resolve-alive`, { notes });
      toast.success('Case resolved as user alive');
      setAliveOpen(false);
      setNotes('');
      fetchCase();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Resolution failed');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'occurredAt', header: 'When', render: (value) => fmtDate(value) },
    {
      key: 'channel',
      header: 'Channel',
      render: (value) => <Badge variant="info">{label(value)}</Badge>,
    },
    {
      key: 'outcome',
      header: 'Outcome',
      render: (value) => <Badge variant={badgeVariant[value] || 'default'}>{label(value)}</Badge>,
    },
    { key: 'contactedParty', header: 'Party', render: (value) => label(value) },
    {
      key: 'notes',
      header: 'Notes',
      render: (value) => <span className="line-clamp-2">{value || '—'}</span>,
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
        <ErrorState message={error} onRetry={fetchCase} />
      </div>
    );
  if (!caseData)
    return (
      <div className="min-h-screen bg-gray-50 p-4 dark:bg-slate-950">
        <EmptyState title="Case not found" description="The dormancy case could not be located." />
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-4 text-gray-900 dark:bg-slate-950 dark:text-white sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500">Dormancy case</p>
              <h1 className="text-2xl font-bold">{caseData.caseNumber || 'Unnumbered case'}</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {caseData.userId?.name || caseData.user?.name || 'Unknown user'} ·{' '}
                {caseData.userId?.email || caseData.user?.email || 'No email'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant={badgeVariant[caseData.stage] || 'default'}>
                  {label(caseData.stage)}
                </Badge>
                <Badge variant={badgeVariant[caseData.status] || 'default'}>
                  {label(caseData.status)}
                </Badge>
                <Badge variant="warning">No deletion or purge; dormancy freezes only</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setLogOpen(true)}
                className={[
                  'inline-flex items-center gap-2 rounded-xl bg-blue-600',
                  'px-4 py-2 text-sm font-medium text-white',
                ].join(' ')}
              >
                <MessageSquarePlus className="h-4 w-4" />
                Log outreach
              </button>
              <button
                type="button"
                onClick={() => setAliveOpen(true)}
                className={[
                  'inline-flex items-center gap-2 rounded-xl bg-emerald-600',
                  'px-4 py-2 text-sm font-medium text-white',
                ].join(' ')}
              >
                <UserRoundCheck className="h-4 w-4" />
                Resolve alive
              </button>
              <button
                type="button"
                onClick={() => setEscalateOpen(true)}
                className={[
                  'inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2',
                  'text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900',
                ].join(' ')}
              >
                <ShieldAlert className="h-4 w-4" />
                Escalate to estate
              </button>
              <button
                type="button"
                onClick={fetchCase}
                aria-label="Refresh case"
                className="rounded-xl border p-2 dark:border-slate-700"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard
            title="Inactive days"
            value={caseData.daysInactiveAtDetection || 0}
            icon={<HeartPulse className="h-5 w-5" />}
            color="#d97706"
          />
          <StatCard
            title="Outreach attempts"
            value={caseData.outreachAttempts || interactions.length}
            icon={<Phone className="h-5 w-5" />}
            color="#2563eb"
          />
          <StatCard
            title="SLA days left"
            value={
              caseData.slaDueAt
                ? Math.max(Math.ceil((new Date(caseData.slaDueAt) - new Date()) / 86400000), 0)
                : 0
            }
            icon={<AlertTriangle className="h-5 w-5" />}
            color="#dc2626"
          />
          <StatCard
            title="Follow-ups"
            value={interactions.filter((x) => x.followUpRequired).length}
            icon={<CheckCircle2 className="h-5 w-5" />}
            color="#16a34a"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
          <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
            <h2 className="mb-4 text-lg font-semibold">Activity and case timeline</h2>
            {activityTimeline.length ? (
              <Timeline items={activityTimeline} showMore maxItems={8} />
            ) : (
              <EmptyState
                title="No timeline"
                description="Case timeline events will appear here."
              />
            )}
          </section>
          <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Contact attempt history</h2>
              <Badge variant="info">Append-mostly outreach log</Badge>
            </div>
            <div className="hidden md:block">
              <DataTable
                columns={columns}
                data={interactions}
                emptyMessage="No outreach attempts recorded"
              />
            </div>
            <div className="space-y-3 md:hidden">
              {interactions.length ? (
                interactions.map((item, index) => (
                  <article
                    key={item._id || index}
                    className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                  >
                    <div className="flex justify-between">
                      <Badge variant="info">{label(item.channel)}</Badge>
                      <span className="text-xs text-slate-500">{fmtDate(item.occurredAt)}</span>
                    </div>
                    <p className="mt-2 font-medium">{label(item.outcome)}</p>
                    <p className="text-sm text-slate-500">{item.notes || 'No notes'}</p>
                  </article>
                ))
              ) : (
                <EmptyState
                  title="No outreach attempts"
                  description="Use Log outreach to record careful contact attempts."
                />
              )}
            </div>
          </section>
        </div>
      </div>

      <Modal
        isOpen={logOpen}
        onClose={() => setLogOpen(false)}
        title="Record outreach attempt"
        footer={
          <>
            <button
              type="button"
              onClick={() => setLogOpen(false)}
              className="rounded-lg border px-4 py-2 text-sm dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitInteraction}
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Save attempt
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">
            Channel
            <select
              value={interaction.channel}
              onChange={(e) => setInteraction((f) => ({ ...f, channel: e.target.value }))}
              className="mt-1 w-full rounded-xl border p-2 dark:border-slate-700 dark:bg-slate-900"
            >
              {channels.map((x) => (
                <option key={x} value={x}>
                  {label(x)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Outcome
            <select
              value={interaction.outcome}
              onChange={(e) => setInteraction((f) => ({ ...f, outcome: e.target.value }))}
              className="mt-1 w-full rounded-xl border p-2 dark:border-slate-700 dark:bg-slate-900"
            >
              {outcomes.map((x) => (
                <option key={x} value={x}>
                  {label(x)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Contacted party
            <select
              value={interaction.contactedParty}
              onChange={(e) => setInteraction((f) => ({ ...f, contactedParty: e.target.value }))}
              className="mt-1 w-full rounded-xl border p-2 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="user">User</option>
              <option value="nominee">Nominee</option>
              <option value="emergency_contact">Emergency contact</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input
              type="checkbox"
              checked={interaction.followUpRequired}
              onChange={(e) =>
                setInteraction((f) => ({ ...f, followUpRequired: e.target.checked }))
              }
            />
            Follow-up required
          </label>
        </div>
        <label className="mt-4 block text-sm font-medium">
          Notes
          <textarea
            value={interaction.notes}
            onChange={(e) => setInteraction((f) => ({ ...f, notes: e.target.value }))}
            rows={4}
            className="mt-1 w-full rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
      </Modal>

      <Modal
        isOpen={escalateOpen}
        onClose={() => setEscalateOpen(false)}
        title="Confirm escalation to estate verification"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEscalateOpen(false)}
              className="rounded-lg border px-4 py-2 text-sm dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={escalate}
              disabled={submitting || !notes.trim()}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Escalate carefully
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
          <p className="font-semibold">This does not mark the user deceased.</p>
          <p className="mt-1">
            It opens the maker-checker estate verification flow. Death must be proposed by a support
            agent and approved by a different estate officer or compliance user. The marking is
            reversible and audited.
          </p>
        </div>
        <label className="mt-4 block text-sm font-medium">
          Escalation reason
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
      </Modal>

      <Modal
        isOpen={aliveOpen}
        onClose={() => setAliveOpen(false)}
        title="Resolve case as alive"
        footer={
          <>
            <button
              type="button"
              onClick={() => setAliveOpen(false)}
              className="rounded-lg border px-4 py-2 text-sm dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={resolveAlive}
              disabled={submitting || !notes.trim()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Resolve alive
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          <Undo2 className="mr-2 inline h-4 w-4" />
          This records the user response and resets the dormancy concern without deleting any data.
        </p>
        <label className="mt-4 block text-sm font-medium">
          Resolution notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
      </Modal>
    </div>
  );
}
