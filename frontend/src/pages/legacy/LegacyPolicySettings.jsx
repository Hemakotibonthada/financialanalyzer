import React, { useCallback, useEffect, useMemo, useState } from 'react';
import MainLayout from '../../components/MainLayout';
import {
  Accordion,
  AnimatedCard,
  Badge,
  DataTable,
  EmptyState,
  Modal,
  SkeletonLoader,
} from '../../components/ui/ComponentLibrary';
import { legacyAdminService } from '../../services/legacyService';
import {
  AlertTriangle,
  CheckCircle2,
  GitCompareArrows,
  History,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'react-toastify';

const defaultPolicy = {
  name: 'Legacy Guard policy',
  version: 1,
  isActive: false,
  thresholds: { watchDays: 60, dormantDays: 120, unreachableDays: 180, welfareCheckDays: 240 },
  outreach: {
    maxAttemptsPerChannel: 3,
    cooldownHours: 48,
    requiredChannelsBeforeEscalation: ['email', 'sms', 'phone_call'],
  },
  escalation: {
    autoEscalateAfterDays: 30,
    requireDualApproval: true,
    minApproverRole: 'estate_officer',
  },
  fee: {
    percentage: 1,
    minFeeInINR: 0,
    maxFeeInINR: '',
    gstPercentage: 18,
    chargeOn: 'recovered_only',
  },
  freezeOnStage: 'unreachable',
  changeReason: '',
};
const inputClass =
  'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 ' +
  'bg-white dark:bg-gray-900 text-gray-900 dark:text-white ' +
  'focus:ring-2 focus:ring-blue-500 outline-none';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
const channelOptions = [
  'email',
  'sms',
  'phone_call',
  'whatsapp',
  'postal',
  'in_app',
  'nominee_contact',
  'emergency_contact',
];

export default function LegacyPolicySettings() {
  const [versions, setVersions] = useState([]);
  const [form, setForm] = useState(defaultPolicy);
  const [selectedId, setSelectedId] = useState('');
  const [compareId, setCompareId] = useState('');
  const [activateTarget, setActivateTarget] = useState(null);
  const [activateReason, setActivateReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await legacyAdminService.getPolicies();
      const list = res.data?.data?.policies || res.data?.data || res.data?.policies || [];
      setVersions(Array.isArray(list) ? list : []);
      const active = (Array.isArray(list) ? list : []).find((p) => p.isActive) || list?.[0];
      if (active) {
        setForm(normalizePolicy(active));
        setSelectedId(active._id || active.id || '');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load policy versions.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const selectedPolicy = useMemo(
    () => versions.find((v) => (v._id || v.id) === selectedId),
    [versions, selectedId]
  );
  const comparePolicy = useMemo(
    () => versions.find((v) => (v._id || v.id) === compareId),
    [versions, compareId]
  );
  const thresholdValid =
    form.thresholds.watchDays < form.thresholds.dormantDays &&
    form.thresholds.dormantDays < form.thresholds.unreachableDays &&
    form.thresholds.unreachableDays < form.thresholds.welfareCheckDays;

  const choosePolicy = (id) => {
    setSelectedId(id);
    const p = versions.find((v) => (v._id || v.id) === id);
    if (p) setForm(normalizePolicy(p));
  };
  const update = (path, value) =>
    setForm((prev) => {
      const next = structuredClone(prev);
      path
        .split('.')
        .reduce(
          (obj, key, idx, arr) => (idx === arr.length - 1 ? (obj[key] = value) : obj[key]),
          next
        );
      return next;
    });
  const updateNumber = (path, value) => update(path, value === '' ? '' : Number(value));
  const toggleChannel = (ch) =>
    setForm((prev) => {
      const set = new Set(prev.outreach.requiredChannelsBeforeEscalation || []);
      set.has(ch) ? set.delete(ch) : set.add(ch);
      return {
        ...prev,
        outreach: { ...prev.outreach, requiredChannelsBeforeEscalation: Array.from(set) },
      };
    });

  const savePolicy = async () => {
    if (!thresholdValid) {
      toast.error(
        'Thresholds must be strictly increasing: watch < dormant < unreachable < welfare check.'
      );
      return;
    }
    if (!form.changeReason.trim()) {
      toast.error('A change reason is required for policy versioning.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        fee: {
          ...form.fee,
          maxFeeInINR: form.fee.maxFeeInINR === '' ? null : Number(form.fee.maxFeeInINR),
        },
      };
      if (selectedId) await legacyAdminService.updatePolicy(selectedId, payload);
      else await legacyAdminService.createPolicy(payload);
      toast.success('Policy version saved.');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to save policy.');
    } finally {
      setSaving(false);
    }
  };

  const activate = async () => {
    if (!activateReason.trim()) {
      toast.error('Activation requires a mandatory change reason.');
      return;
    }
    try {
      await legacyAdminService.activatePolicy(activateTarget._id || activateTarget.id, {
        reason: activateReason,
      });
      toast.success('Policy version activated.');
      setActivateTarget(null);
      setActivateReason('');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to activate policy.');
    }
  };

  const versionColumns = [
    {
      key: 'version',
      header: 'Version',
      render: (v, row) => (
        <div className="font-semibold text-gray-900 dark:text-white">v{v || row.name}</div>
      ),
    },
    {
      key: 'isActive',
      header: 'Active',
      render: (v) => (v ? <Badge variant="success">active</Badge> : <Badge>inactive</Badge>),
    },
    {
      key: 'changeReason',
      header: 'Change reason',
      render: (v) => <span className="text-sm text-gray-600 dark:text-gray-300">{v || '—'}</span>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (v) => (v ? new Date(v).toLocaleString('en-IN') : '—'),
    },
  ];

  return (
    <MainLayout
      title="Legacy Policy Settings"
      subtitle="Dormancy thresholds, outreach, escalation and success-fee configuration"
    >
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 lg:p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={[
                'w-12 h-12 rounded-2xl bg-gradient-to-br',
                'from-violet-500 to-indigo-600 flex items-center justify-center',
              ].join(' ')}
            >
              <Settings2 className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Legacy Guard policy
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Versioned controls for dormancy detection, welfare outreach, escalation and fees.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={load}
              className={[
                'inline-flex items-center gap-2 px-4 py-2 rounded-xl border',
                'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200',
              ].join(' ')}
            >
              <RefreshCw className="w-4 h-4" />
              Reload
            </button>
            <button
              onClick={savePolicy}
              disabled={saving || !thresholdValid}
              className={[
                'inline-flex items-center gap-2 px-4 py-2 rounded-xl',
                'bg-blue-600 disabled:opacity-50 text-white',
              ].join(' ')}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save version'}
            </button>
          </div>
        </div>

        {loading ? (
          <SkeletonLoader variant="card" count={4} />
        ) : error ? (
          <ErrorPanel message={error} onRetry={load} />
        ) : (
          <>
            <div className="grid lg:grid-cols-3 gap-6">
              <AnimatedCard className="lg:col-span-2" hover={false}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Editable policy draft
                  </h2>
                  <Badge variant={thresholdValid ? 'success' : 'danger'}>
                    {thresholdValid ? 'thresholds valid' : 'threshold order invalid'}
                  </Badge>
                </div>
                {!thresholdValid && (
                  <div
                    className={[
                      'mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20',
                      'text-red-700 dark:text-red-300 text-sm',
                    ].join(' ')}
                  >
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    Watch, dormant, unreachable and welfare-check days must be strictly increasing.
                  </div>
                )}
                <div className="space-y-6">
                  <section>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-3">
                      Dormancy thresholds
                    </h3>
                    <div className="grid md:grid-cols-4 gap-4">
                      <NumberField
                        label="Watch days"
                        value={form.thresholds.watchDays}
                        onChange={(v) => updateNumber('thresholds.watchDays', v)}
                      />
                      <NumberField
                        label="Dormant days"
                        value={form.thresholds.dormantDays}
                        onChange={(v) => updateNumber('thresholds.dormantDays', v)}
                      />
                      <NumberField
                        label="Unreachable days"
                        value={form.thresholds.unreachableDays}
                        onChange={(v) => updateNumber('thresholds.unreachableDays', v)}
                      />
                      <NumberField
                        label="Welfare-check days"
                        value={form.thresholds.welfareCheckDays}
                        onChange={(v) => updateNumber('thresholds.welfareCheckDays', v)}
                      />
                    </div>
                  </section>
                  <section>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-3">Outreach rules</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <NumberField
                        label="Max attempts per channel"
                        value={form.outreach.maxAttemptsPerChannel}
                        onChange={(v) => updateNumber('outreach.maxAttemptsPerChannel', v)}
                      />
                      <NumberField
                        label="Cooldown hours"
                        value={form.outreach.cooldownHours}
                        onChange={(v) => updateNumber('outreach.cooldownHours', v)}
                      />
                    </div>
                    <div className="mt-3">
                      <label className={labelClass}>Required channels before escalation</label>
                      <div className="flex flex-wrap gap-2">
                        {channelOptions.map((ch) => (
                          <button
                            key={ch}
                            type="button"
                            onClick={() => toggleChannel(ch)}
                            className={[
                              'px-3 py-1.5 rounded-full text-sm border',
                              form.outreach.requiredChannelsBeforeEscalation?.includes(ch)
                                ? 'bg-blue-600 text-white border-blue-600'
                                : [
                                    'border-gray-200 dark:border-gray-700',
                                    'text-gray-700 dark:text-gray-300',
                                  ].join(' '),
                            ].join(' ')}
                          >
                            {ch.replace(/_/g, ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>
                  <section>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-3">
                      Escalation rules
                    </h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <NumberField
                        label="Auto escalate after days"
                        value={form.escalation.autoEscalateAfterDays}
                        onChange={(v) => updateNumber('escalation.autoEscalateAfterDays', v)}
                      />
                      <SelectField
                        label="Minimum approver role"
                        value={form.escalation.minApproverRole}
                        onChange={(v) => update('escalation.minApproverRole', v)}
                        options={['estate_officer', 'compliance', 'admin']}
                      />
                      <SelectField
                        label="Freeze on stage"
                        value={form.freezeOnStage}
                        onChange={(v) => update('freezeOnStage', v)}
                        options={['unreachable', 'welfare_check', 'deceased_suspected']}
                      />
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={form.escalation.requireDualApproval}
                        onChange={(e) => update('escalation.requireDualApproval', e.target.checked)}
                      />
                      Require maker-checker approval for deceased marking
                    </label>
                  </section>
                  <section>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-3">
                      Fee configuration
                    </h3>
                    <div className="grid md:grid-cols-5 gap-4">
                      <NumberField
                        label="Success fee %"
                        value={form.fee.percentage}
                        onChange={(v) => updateNumber('fee.percentage', v)}
                        step="0.1"
                      />
                      <NumberField
                        label="Min fee ₹"
                        value={form.fee.minFeeInINR}
                        onChange={(v) => updateNumber('fee.minFeeInINR', v)}
                      />
                      <NumberField
                        label="Max cap ₹"
                        value={form.fee.maxFeeInINR ?? ''}
                        onChange={(v) => updateNumber('fee.maxFeeInINR', v)}
                      />
                      <NumberField
                        label="GST %"
                        value={form.fee.gstPercentage}
                        onChange={(v) => updateNumber('fee.gstPercentage', v)}
                      />
                      <SelectField
                        label="Charge on"
                        value={form.fee.chargeOn}
                        onChange={(v) => update('fee.chargeOn', v)}
                        options={['recovered_only']}
                      />
                    </div>
                    <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
                      Contract safeguard: fee must be charged only on recovered amounts, never
                      discovered value.
                    </p>
                  </section>
                  <section>
                    <label className={labelClass}>Mandatory change reason</label>
                    <textarea
                      rows={3}
                      value={form.changeReason || ''}
                      onChange={(e) => update('changeReason', e.target.value)}
                      className={inputClass}
                      aria-label="Policy change reason"
                    />
                  </section>
                </div>
              </AnimatedCard>

              <AnimatedCard hover={false}>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  <History className="w-5 h-5 inline mr-2" />
                  Policy versions
                </h2>
                {versions.length ? (
                  <div className="space-y-3 max-h-[620px] overflow-y-auto">
                    {versions.map((v) => {
                      const id = v._id || v.id;
                      return (
                        <button
                          key={id}
                          onClick={() => choosePolicy(id)}
                          className={[
                            'w-full text-left p-4 rounded-2xl border transition-all',
                            selectedId === id
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : [
                                  'border-gray-200 dark:border-gray-700',
                                  'bg-white dark:bg-gray-900',
                                ].join(' '),
                          ].join(' ')}
                        >
                          <div className="flex justify-between gap-2">
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white">
                                v{v.version || id}
                              </p>
                              <p className="text-xs text-gray-500">
                                {v.changeReason || 'No reason recorded'}
                              </p>
                            </div>
                            {v.isActive && <Badge variant="success">active</Badge>}
                          </div>
                          <div className="flex gap-2 mt-3">
                            <span className="text-xs text-gray-500">
                              watch {v.thresholds?.watchDays}d → welfare{' '}
                              {v.thresholds?.welfareCheckDays}d
                            </span>
                            {!v.isActive && (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActivateTarget(v);
                                }}
                                className="ml-auto text-xs text-blue-600 font-semibold"
                              >
                                Activate
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon="⚙️"
                    title="No policy versions"
                    description="Save this draft to create the first version."
                  />
                )}
              </AnimatedCard>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <AnimatedCard hover={false}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    <GitCompareArrows className="w-5 h-5 inline mr-2" />
                    Diff-style comparison
                  </h2>
                  <select
                    value={compareId}
                    onChange={(e) => setCompareId(e.target.value)}
                    className={inputClass + ' max-w-xs'}
                  >
                    <option value="">Compare with version...</option>
                    {versions
                      .filter((v) => (v._id || v.id) !== selectedId)
                      .map((v) => (
                        <option key={v._id || v.id} value={v._id || v.id}>
                          v{v.version || v._id}
                        </option>
                      ))}
                  </select>
                </div>
                {selectedPolicy && comparePolicy ? (
                  <DiffView
                    left={normalizePolicy(comparePolicy)}
                    right={form}
                    leftLabel={`v${comparePolicy.version}`}
                    rightLabel="Selected draft"
                  />
                ) : (
                  <p className="text-gray-500">
                    Choose another policy version to see threshold, outreach, escalation and fee
                    differences.
                  </p>
                )}
              </AnimatedCard>
              <AnimatedCard hover={false}>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  <ShieldCheck className="w-5 h-5 inline mr-2" />
                  Safeguards
                </h2>
                <Accordion
                  items={[
                    {
                      title: 'Death is never auto-detected',
                      content: [
                        'Policy can escalate welfare checks, but deceased marking',
                        'still requires support proposal and different approver.',
                      ].join(' '),
                    },
                    {
                      title: 'False positives are reversible',
                      content: [
                        'EstateCase revocation remains mandatory with a reason;',
                        'no destructive account purge occurs.',
                      ].join(' '),
                    },
                    {
                      title: 'Success fee only',
                      content: [
                        'The UI locks chargeOn to recovered_only and displays fee',
                        'as a percentage of recovered amounts.',
                      ].join(' '),
                    },
                  ]}
                  allowMultiple
                />
              </AnimatedCard>
            </div>
          </>
        )}

        <Modal
          isOpen={!!activateTarget}
          onClose={() => setActivateTarget(null)}
          title="Activate policy version"
          footer={
            <>
              <button
                onClick={() => setActivateTarget(null)}
                className={[
                  'px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600',
                  'text-gray-700 dark:text-gray-200',
                ].join(' ')}
              >
                Cancel
              </button>
              <button
                onClick={activate}
                disabled={!activateReason.trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 disabled:opacity-50 text-white"
              >
                Activate
              </button>
            </>
          }
        >
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Activation changes production dormancy and fee behavior. Record the Dharma: why is this
            version right?
          </p>
          <textarea
            value={activateReason}
            onChange={(e) => setActivateReason(e.target.value)}
            rows={4}
            className={inputClass}
            aria-label="Mandatory activation reason"
          />
        </Modal>
      </div>
    </MainLayout>
  );
}

function normalizePolicy(p) {
  return {
    ...defaultPolicy,
    ...p,
    thresholds: { ...defaultPolicy.thresholds, ...(p.thresholds || {}) },
    outreach: { ...defaultPolicy.outreach, ...(p.outreach || {}) },
    escalation: { ...defaultPolicy.escalation, ...(p.escalation || {}) },
    fee: { ...defaultPolicy.fee, ...(p.fee || {}) },
  };
}
function NumberField({ label, value, onChange, step = '1' }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        className={inputClass}
        type="number"
        min="0"
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
    </div>
  );
}
function ErrorPanel({ message, onRetry }) {
  return (
    <AnimatedCard hover={false} className="border-red-200 dark:border-red-800">
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-3">
          <AlertTriangle className="text-red-500" />
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Policy settings unavailable</h3>
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
function DiffView({ left, right, leftLabel, rightLabel }) {
  const rows = [
    ['Watch days', left.thresholds.watchDays, right.thresholds.watchDays],
    ['Dormant days', left.thresholds.dormantDays, right.thresholds.dormantDays],
    ['Unreachable days', left.thresholds.unreachableDays, right.thresholds.unreachableDays],
    ['Welfare-check days', left.thresholds.welfareCheckDays, right.thresholds.welfareCheckDays],
    [
      'Max attempts/channel',
      left.outreach.maxAttemptsPerChannel,
      right.outreach.maxAttemptsPerChannel,
    ],
    ['Cooldown hours', left.outreach.cooldownHours, right.outreach.cooldownHours],
    [
      'Required channels',
      (left.outreach.requiredChannelsBeforeEscalation || []).join(', '),
      (right.outreach.requiredChannelsBeforeEscalation || []).join(', '),
    ],
    [
      'Auto escalate days',
      left.escalation.autoEscalateAfterDays,
      right.escalation.autoEscalateAfterDays,
    ],
    [
      'Dual approval',
      String(left.escalation.requireDualApproval),
      String(right.escalation.requireDualApproval),
    ],
    ['Fee %', left.fee.percentage, right.fee.percentage],
    ['GST %', left.fee.gstPercentage, right.fee.gstPercentage],
    ['Max fee cap', left.fee.maxFeeInINR || 'none', right.fee.maxFeeInINR || 'none'],
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-3 py-2 text-left">Field</th>
            <th className="px-3 py-2 text-left text-red-600">− {leftLabel}</th>
            <th className="px-3 py-2 text-left text-emerald-600">+ {rightLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, l, r]) => (
            <tr key={k} className="border-t border-gray-100 dark:border-gray-800">
              <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{k}</td>
              <td
                className={[
                  'px-3 py-2',
                  String(l) !== String(r)
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                    : 'text-gray-500',
                ].join(' ')}
              >
                {String(l)}
              </td>
              <td
                className={[
                  'px-3 py-2',
                  String(l) !== String(r)
                    ? [
                        'bg-emerald-50 dark:bg-emerald-900/20',
                        'text-emerald-700 dark:text-emerald-300',
                      ].join(' ')
                    : 'text-gray-500',
                ].join(' ')}
              >
                {String(r)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
