import React, { useCallback, useEffect, useMemo, useState } from 'react';
import MainLayout from '../../components/MainLayout';
import {
  AnimatedCard,
  Badge,
  DataTable,
  EmptyState,
  FileUploader,
  Modal,
  SkeletonLoader,
  StatCard,
} from '../../components/ui/ComponentLibrary';
import { nomineeService } from '../../services/legacyService';
import { useTheme } from '../../context/ThemeContext';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  FileCheck2,
  HeartHandshake,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import { toast } from 'react-toastify';

const RELATIONSHIPS = [
  'spouse',
  'son',
  'daughter',
  'father',
  'mother',
  'brother',
  'sister',
  'grandson',
  'granddaughter',
  'nephew',
  'niece',
  'friend',
  'trust',
  'other',
];
const LIKELY_CLASS_I_HEIRS = new Set(['spouse', 'son', 'daughter', 'mother']);
const emptyForm = {
  fullName: '',
  relationship: 'spouse',
  sharePercentage: 0,
  dateOfBirth: '',
  isLegalHeir: true,
  contact: {
    phone: '',
    alternatePhone: '',
    email: '',
    address: { line1: '', line2: '', city: '', state: '', pincode: '', country: 'India' },
  },
  identification: { type: 'aadhaar', maskedNumber: '' },
  guardian: { name: '', relationship: '', phone: '', email: '' },
  canInitiateClaim: true,
  notes: '',
  isActive: true,
};

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const ageFromDob = (dob) =>
  dob ? Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000) : null;
const isMinorDob = (dob) => {
  const age = ageFromDob(dob);
  return age !== null && age < 18;
};
const fieldClass =
  'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 ' +
  'bg-white dark:bg-gray-900 text-gray-900 dark:text-white ' +
  'focus:ring-2 focus:ring-blue-500 outline-none';

export default function NomineeManagement() {
  const { mode } = useTheme();
  const isBlack = mode === 'black';
  const [nominees, setNominees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [documents, setDocuments] = useState([]);
  const [saving, setSaving] = useState(false);

  const loadNominees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await nomineeService.list();
      const data = res.data?.data?.nominees || res.data?.data || res.data?.nominees || [];
      setNominees(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load nominees.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNominees();
  }, [loadNominees]);

  const activeNominees = useMemo(
    () =>
      nominees.filter(
        (n) => n.isActive !== false && n.status !== 'inactive' && n.status !== 'superseded'
      ),
    [nominees]
  );
  const shareTotal = useMemo(
    () => activeNominees.reduce((sum, n) => sum + Number(n.sharePercentage || 0), 0),
    [activeNominees]
  );
  const draftTotal = useMemo(() => {
    const base = nominees
      .filter((n) => n.isActive !== false && n.status !== 'inactive' && n._id !== editing?._id)
      .reduce((sum, n) => sum + Number(n.sharePercentage || 0), 0);
    return base + (form.isActive ? Number(form.sharePercentage || 0) : 0);
  }, [nominees, editing, form.sharePercentage, form.isActive]);
  const readiness = useMemo(() => {
    const checks = [
      { label: 'At least one active nominee is named', ok: activeNominees.length > 0 },
      { label: 'Active nominee shares total exactly 100%', ok: shareTotal === 100 },
      {
        label: 'Every active nominee has phone and email',
        ok:
          activeNominees.length > 0 &&
          activeNominees.every((n) => n.contact?.phone && n.contact?.email),
      },
      {
        label: 'ID or address proof uploaded for every nominee',
        ok:
          activeNominees.length > 0 && activeNominees.every((n) => (n.documents || []).length > 0),
      },
      {
        label: 'Minor nominees have guardian details',
        ok: activeNominees.every(
          (n) => !isMinorDob(n.dateOfBirth) || (n.guardian?.name && n.guardian?.phone)
        ),
      },
    ];
    const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
    return { checks, score };
  }, [activeNominees, shareTotal]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDocuments([]);
    setModalOpen(true);
  };
  const openEdit = (n) => {
    setEditing(n);
    setForm({
      ...emptyForm,
      ...n,
      contact: {
        ...emptyForm.contact,
        ...(n.contact || {}),
        address: { ...emptyForm.contact.address, ...(n.contact?.address || {}) },
      },
      identification: { ...emptyForm.identification, ...(n.identification || {}) },
      guardian: { ...emptyForm.guardian, ...(n.guardian || {}) },
    });
    setDocuments([]);
    setModalOpen(true);
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

  const validateForm = () => {
    if (!form.fullName.trim()) return 'Full name is required.';
    if (Number(form.sharePercentage) < 0 || Number(form.sharePercentage) > 100)
      return 'Share percentage must be between 0 and 100.';
    if (draftTotal !== 100)
      return `Active nominee shares must total exactly 100%. Current draft total is ${draftTotal}%.`;
    if (!form.contact.phone || !form.contact.email)
      return 'Phone and email are required for welfare outreach.';
    if (isMinorDob(form.dateOfBirth) && (!form.guardian.name || !form.guardian.phone))
      return 'Guardian name and phone are required for a minor nominee.';
    return '';
  };

  const saveNominee = async (e) => {
    e.preventDefault();
    const msg = validateForm();
    if (msg) {
      toast.error(msg);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        sharePercentage: Number(form.sharePercentage),
        isLegalHeir: LIKELY_CLASS_I_HEIRS.has(form.relationship) ? form.isLegalHeir : false,
      };
      const res = editing?._id
        ? await nomineeService.update(editing._id, payload)
        : await nomineeService.create(payload);
      const saved = res.data?.data || res.data?.nominee || res.data;
      const id = saved?._id || editing?._id;
      if (id && documents.length) {
        for (const file of documents) {
          const fd = new FormData();
          fd.append('document', file);
          fd.append('documentType', 'nominee_id_proof');
          await nomineeService.uploadDocument(id, fd);
        }
      }
      toast.success('Nominee details saved.');
      setModalOpen(false);
      await loadNominees();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Unable to save nominee.');
    } finally {
      setSaving(false);
    }
  };

  const removeNominee = async (n) => {
    if (!window.confirm(`Remove ${n.fullName} as an active nominee?`)) return;
    try {
      await nomineeService.remove(n._id);
      toast.success('Nominee removed.');
      await loadNominees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to remove nominee.');
    }
  };

  const columns = [
    {
      key: 'fullName',
      header: 'Nominee',
      render: (_, n) => (
        <div>
          <div className="font-semibold text-gray-900 dark:text-white">{n.fullName}</div>
          <div className="text-xs text-gray-500">
            {n.relationship} {n.isPrimary ? '• Primary' : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'sharePercentage',
      header: 'Share',
      render: (v) => <span className="font-bold text-blue-600">{Number(v || 0)}%</span>,
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (_, n) => (
        <div className="text-xs">
          <div>{n.contact?.phone || '—'}</div>
          <div className="text-gray-500">{n.contact?.email || '—'}</div>
        </div>
      ),
    },
    {
      key: 'documents',
      header: 'Documents',
      render: (docs) => (
        <Badge variant={(docs || []).length ? 'success' : 'warning'}>
          {(docs || []).length ? `${docs.length} uploaded` : 'Pending'}
        </Badge>
      ),
    },
    {
      key: 'relationship',
      header: 'Legal heir signal',
      render: (rel, n) =>
        LIKELY_CLASS_I_HEIRS.has(rel) || n.isLegalHeir ? (
          <Badge variant="success">Likely Class I</Badge>
        ) : (
          <Badge variant="warning">Trustee, not likely heir</Badge>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (v, n) => (
        <Badge variant={n.isActive === false ? 'danger' : v === 'verified' ? 'success' : 'primary'}>
          {n.isActive === false ? 'inactive' : v || 'pending_verification'}
        </Badge>
      ),
    },
  ];

  return (
    <MainLayout title="Nominee Management" subtitle="Legacy Guard estate readiness">
      <div
        className={`min-h-screen ${isBlack ? 'bg-black' : 'bg-gray-50 dark:bg-slate-950'} p-4 lg:p-6 space-y-6`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={[
                'w-12 h-12 rounded-2xl bg-gradient-to-br',
                'from-indigo-500 to-purple-600 flex items-center justify-center',
              ].join(' ')}
            >
              <HeartHandshake className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Nominees</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Name trusted recipients for welfare outreach and estate settlement.
              </p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className={[
              'inline-flex items-center gap-2 px-5 py-3 rounded-xl',
              'bg-blue-600 hover:bg-blue-700 text-white font-semibold',
            ].join(' ')}
          >
            <Plus className="w-4 h-4" /> Add nominee
          </button>
        </div>

        <AnimatedCard
          className={[
            'bg-gradient-to-br from-amber-50 to-orange-50',
            'dark:from-amber-900/20 dark:to-orange-900/10',
            'border-amber-200 dark:border-amber-800',
          ].join(' ')}
          hover={false}
        >
          <div className="flex gap-3">
            <ShieldCheck className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">
                Plain-language legal note for India
              </h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                A nominee is usually a trustee who can receive funds and help complete paperwork. A
                nominee is not automatically the legal heir or final owner. If your nominee is not a
                likely Class I heir — spouse, son, daughter, or mother — your family may still need
                legal-heir, succession, or court documents.
              </p>
            </div>
          </div>
        </AnimatedCard>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-4">
            <SkeletonLoader count={3} />
          </div>
        ) : error ? (
          <ErrorPanel message={error} onRetry={loadNominees} />
        ) : (
          <>
            <div className="grid md:grid-cols-4 gap-4">
              <StatCard
                title="Readiness score"
                value={readiness.score}
                suffix="%"
                format="percentage"
                icon={<UserRoundCheck className="w-5 h-5" />}
                color="#10b981"
              />
              <StatCard
                title="Active nominees"
                value={activeNominees.length}
                icon={<Users className="w-5 h-5" />}
                color="#6366f1"
              />
              <StatCard
                title="Share total"
                value={shareTotal}
                suffix="%"
                icon={<CheckCircle2 className="w-5 h-5" />}
                color={shareTotal === 100 ? '#10b981' : '#ef4444'}
              />
              <StatCard
                title="Documents"
                value={activeNominees.reduce((s, n) => s + (n.documents?.length || 0), 0)}
                icon={<FileCheck2 className="w-5 h-5" />}
                color="#f59e0b"
              />
            </div>

            <AnimatedCard hover={false}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Live share validator
                </h2>
                <Badge variant={shareTotal === 100 ? 'success' : 'danger'}>
                  {shareTotal}% / 100%
                </Badge>
              </div>
              <div className="h-4 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className={[
                    'h-full transition-all',
                    shareTotal === 100
                      ? 'bg-emerald-500'
                      : shareTotal > 100
                        ? 'bg-red-500'
                        : 'bg-blue-500',
                  ].join(' ')}
                  style={{ width: `${Math.min(shareTotal, 100)}%` }}
                />
              </div>
              {shareTotal !== 100 && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Active nominee shares must total exactly 100% before saving staged changes.
                </p>
              )}
            </AnimatedCard>

            <div className="grid lg:grid-cols-3 gap-6">
              <AnimatedCard className="lg:col-span-2" hover={false}>
                {nominees.length ? (
                  <DataTable
                    columns={columns}
                    data={nominees}
                    actions={(row) => (
                      <div className="flex justify-end gap-2">
                        <button
                          aria-label={`Edit ${row.fullName}`}
                          onClick={() => openEdit(row)}
                          className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          aria-label={`Remove ${row.fullName}`}
                          onClick={() => removeNominee(row)}
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  />
                ) : (
                  <EmptyState
                    icon="🛡️"
                    title="No nominees yet"
                    description={[
                      'Add at least one nominee so your loved ones know whom to contact',
                      'and how shares should be handled.',
                    ].join(' ')}
                    action={openCreate}
                    actionLabel="Add first nominee"
                  />
                )}
              </AnimatedCard>
              <AnimatedCard hover={false}>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Legacy readiness checklist
                </h2>
                <div className="space-y-3">
                  {readiness.checks.map((c) => (
                    <div key={c.label} className="flex gap-2 text-sm">
                      <CheckCircle2
                        className={`w-5 h-5 flex-shrink-0 ${c.ok ? 'text-emerald-500' : 'text-gray-300'}`}
                      />
                      <span className={c.ok ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500'}>
                        {c.label}
                      </span>
                    </div>
                  ))}
                </div>
              </AnimatedCard>
            </div>
          </>
        )}

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? 'Edit nominee' : 'Add nominee'}
          size="xl"
          footer={
            <>
              <button
                onClick={() => setModalOpen(false)}
                className={[
                  'px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600',
                  'text-gray-700 dark:text-gray-200',
                ].join(' ')}
              >
                Cancel
              </button>
              <button
                onClick={saveNominee}
                disabled={saving || draftTotal !== 100}
                className={[
                  'inline-flex items-center gap-2 px-4 py-2 rounded-xl',
                  'bg-blue-600 disabled:opacity-50 text-white',
                ].join(' ')}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save nominee'}
              </button>
            </>
          }
        >
          <form onSubmit={saveNominee} className="space-y-5">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  Draft active-share total
                </span>
                <span
                  className={
                    draftTotal === 100 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'
                  }
                >
                  {draftTotal}%
                </span>
              </div>
              <div className="h-2 bg-white/70 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={draftTotal === 100 ? 'h-full bg-emerald-500' : 'h-full bg-red-500'}
                  style={{ width: `${Math.min(draftTotal, 100)}%` }}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <Field
                label="Full name"
                value={form.fullName}
                onChange={(v) => update('fullName', v)}
                required
              />
              <Select
                label="Relationship"
                value={form.relationship}
                onChange={(v) => update('relationship', v)}
                options={RELATIONSHIPS}
              />
              <Field
                label="Share %"
                type="number"
                value={form.sharePercentage}
                onChange={(v) => update('sharePercentage', v)}
                required
              />
            </div>
            {!LIKELY_CLASS_I_HEIRS.has(form.relationship) && (
              <div
                className={[
                  'p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20',
                  'text-sm text-amber-800 dark:text-amber-200',
                ].join(' ')}
              >
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                This relationship is not a likely Class I heir under the app semantics. They can be
                a trustee/recipient, but legal heir documents may still be needed.
              </div>
            )}
            <div className="grid md:grid-cols-4 gap-4">
              <Field
                label="Date of birth"
                type="date"
                value={form.dateOfBirth || ''}
                onChange={(v) => update('dateOfBirth', v)}
              />
              <Field
                label="Phone"
                value={form.contact.phone}
                onChange={(v) => update('contact.phone', v)}
                required
              />
              <Field
                label="Alternate phone"
                value={form.contact.alternatePhone || ''}
                onChange={(v) => update('contact.alternatePhone', v)}
              />
              <Field
                label="Email"
                type="email"
                value={form.contact.email}
                onChange={(v) => update('contact.email', v)}
                required
              />
            </div>
            <div className="grid md:grid-cols-5 gap-4">
              <Field
                label="Address line 1"
                value={form.contact.address.line1}
                onChange={(v) => update('contact.address.line1', v)}
              />
              <Field
                label="City"
                value={form.contact.address.city}
                onChange={(v) => update('contact.address.city', v)}
              />
              <Field
                label="State"
                value={form.contact.address.state}
                onChange={(v) => update('contact.address.state', v)}
              />
              <Field
                label="Pincode"
                value={form.contact.address.pincode}
                onChange={(v) => update('contact.address.pincode', v)}
              />
              <Field
                label="Country"
                value={form.contact.address.country}
                onChange={(v) => update('contact.address.country', v)}
              />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <Select
                label="ID proof type"
                value={form.identification.type}
                onChange={(v) => update('identification.type', v)}
                options={['aadhaar', 'pan', 'passport', 'voter_id', 'driving_license', 'other']}
              />
              <Field
                label="Masked ID number"
                value={form.identification.maskedNumber}
                onChange={(v) => update('identification.maskedNumber', v)}
              />
              <label className="flex items-center gap-2 mt-8 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.canInitiateClaim}
                  onChange={(e) => update('canInitiateClaim', e.target.checked)}
                />
                Can initiate claim outreach
              </label>
            </div>
            {isMinorDob(form.dateOfBirth) && (
              <div
                className={[
                  'p-4 rounded-2xl border border-purple-200 dark:border-purple-800',
                  'bg-purple-50 dark:bg-purple-900/20',
                ].join(' ')}
              >
                <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-3">
                  Guardian details for minor nominee
                </h3>
                <div className="grid md:grid-cols-4 gap-4">
                  <Field
                    label="Guardian name"
                    value={form.guardian.name}
                    onChange={(v) => update('guardian.name', v)}
                  />
                  <Field
                    label="Relationship"
                    value={form.guardian.relationship}
                    onChange={(v) => update('guardian.relationship', v)}
                  />
                  <Field
                    label="Phone"
                    value={form.guardian.phone}
                    onChange={(v) => update('guardian.phone', v)}
                  />
                  <Field
                    label="Email"
                    value={form.guardian.email}
                    onChange={(v) => update('guardian.email', v)}
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Upload className="w-4 h-4 inline mr-1" />
                Upload ID/address proof
              </label>
              <FileUploader onUpload={setDocuments} accept=".pdf,.jpg,.jpeg,.png" maxFiles={4} />
            </div>
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={3}
              className={fieldClass}
              aria-label="Notes for family or estate officer"
            />
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
}

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {required && ' *'}
      </label>
      <input
        className={fieldClass}
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  );
}
function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <select className={fieldClass} value={value} onChange={(e) => onChange(e.target.value)}>
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
            <h3 className="font-bold text-gray-900 dark:text-white">Could not load nominees</h3>
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
