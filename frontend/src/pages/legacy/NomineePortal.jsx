import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { nomineePortalService } from '../../services/legacyService';
import {
  AnimatedCard,
  Badge,
  EmptyState,
  FileUploader,
  SkeletonLoader,
  Stepper,
  Timeline,
} from '../../components/ui/ComponentLibrary';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileHeart,
  HeartHandshake,
  IndianRupee,
  Mail,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'react-toastify';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const statusVariant = (s) =>
  ['recovered', 'settled', 'approved', 'verified'].includes(s)
    ? 'success'
    : ['rejected', 'unrecoverable', 'disputed'].includes(s)
      ? 'danger'
      : ['additional_info_required', 'awaiting_documents'].includes(s)
        ? 'warning'
        : 'primary';
const steps = [
  { label: 'Verification', description: 'We verify documents carefully' },
  { label: 'Asset claims', description: 'Claims are filed with institutions' },
  { label: 'Settlement', description: 'Recovered funds are reconciled' },
  { label: 'Disbursement', description: 'Funds are released to entitled parties' },
  { label: 'Closed', description: 'The case is completed' },
];

export default function NomineePortal() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [caseData, setCaseData] = useState(null);
  const [message, setMessage] = useState('');
  const [uploadingFor, setUploadingFor] = useState(null);

  const loadPortal = useCallback(async () => {
    if (!token) {
      setError(
        'This secure link is missing its access code. Please use the latest link sent by our support team.'
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await nomineePortalService.getCase(token);
      setCaseData(res.data?.data || res.data?.case || res.data);
    } catch (err) {
      const code = err.response?.status;
      setError(
        code === 401 || code === 403
          ? [
              'This secure link has expired or is no longer valid.',
              'Please contact your assigned officer for a fresh link.',
            ].join(' ')
          : err.response?.data?.message ||
              'We could not open this support portal right now. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadPortal();
  }, [loadPortal]);

  const progress = useMemo(() => {
    const status = caseData?.status || 'verification_pending';
    if (['verification_pending', 'initiated'].includes(status)) return 0;
    if (['verified', 'asset_discovery', 'claims_in_progress'].includes(status)) return 1;
    if (['settlement_pending'].includes(status)) return 2;
    if (['disbursed'].includes(status)) return 3;
    if (['closed'].includes(status)) return 4;
    return 0;
  }, [caseData]);

  const assets = caseData?.assets || caseData?.recoveryClaims || [];
  const docs = caseData?.documentsRequired ||
    caseData?.documentChecklist || [
      {
        documentType: 'death_certificate',
        label: 'Death certificate',
        status: 'pending',
        claimType: 'generic_recovery',
        slaDays: 7,
      },
      {
        documentType: 'nominee_id_proof',
        label: 'Nominee ID proof',
        status: 'pending',
        claimType: 'generic_recovery',
        slaDays: 3,
      },
      {
        documentType: 'bank_passbook',
        label: 'Bank passbook or cancelled cheque',
        status: 'pending',
        claimType: 'deposit_closure',
        slaDays: 5,
      },
    ];
  const officer = caseData?.assignedOfficer ||
    caseData?.assignedTo || {
      name: 'Legacy Guard officer',
      phone: 'Support desk',
      email: 'support@financialanalyzer.local',
    };
  const recovered =
    caseData?.totals?.recoveredInINR ||
    caseData?.recoveredInINR ||
    assets.reduce((s, a) => s + Number(a.recoveredValueInINR || a.receivedAmountInINR || 0), 0);
  const feePercent = caseData?.fee?.feePercentage ?? caseData?.policy?.fee?.percentage ?? 1;
  const gstPercent = caseData?.fee?.gstPercentage ?? caseData?.policy?.fee?.gstPercentage ?? 18;
  const fee = (recovered * feePercent) / 100;
  const gst = (fee * gstPercent) / 100;

  const uploadDocument = async (doc, files) => {
    if (!files?.length) return;
    setUploadingFor(doc.documentType || doc.label);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('document', file);
        fd.append('documentType', doc.documentType || 'other');
        await nomineePortalService.uploadDocument(token, fd);
      }
      toast.success('Document uploaded. Thank you — our team will review it.');
      await loadPortal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploadingFor(null);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    try {
      await nomineePortalService.sendMessage(token, { message });
      toast.success('Message sent to your officer.');
      setMessage('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send message.');
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <SkeletonLoader variant="card" count={4} />
        </div>
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <AnimatedCard hover={false} className="max-w-xl text-center">
          <FileHeart className="w-14 h-14 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            We could not open this secure support link
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{error}</p>
          <button
            onClick={loadPortal}
            className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </AnimatedCard>
      </div>
    );
  if (!caseData)
    return (
      <EmptyState
        icon="🕊️"
        title="No case details found"
        description="Please contact your assigned officer for help."
      />
    );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header
          className={[
            'rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900',
            'to-purple-900 text-white p-6 lg:p-8 shadow-xl',
          ].join(' ')}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sm mb-4">
                <HeartHandshake className="w-4 h-4" /> Legacy Guard support portal
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold">We are sorry for your loss.</h1>
              <p className="mt-3 text-indigo-100">
                This secure page helps you track the claim, upload documents, and contact your
                assigned officer. We will keep the process transparent and only charge a success fee
                on amounts actually recovered.
              </p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 min-w-[220px]">
              <p className="text-sm text-indigo-100">Case</p>
              <p className="text-2xl font-bold">{caseData.caseNumber || 'Legacy case'}</p>
              <Badge variant="primary">
                {(caseData.status || 'verification_pending').replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>
        </header>

        <AnimatedCard hover={false}>
          <Stepper steps={steps} currentStep={progress} />
        </AnimatedCard>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <AnimatedCard hover={false}>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Recovery status by asset
              </h2>
              {assets.length ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {assets.map((a, i) => (
                    <div
                      key={a._id || i}
                      className={[
                        'p-4 rounded-2xl border border-gray-200 dark:border-gray-700',
                        'bg-white dark:bg-gray-900',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">
                            {a.title || a.institution?.name || a.category || a.claimType}
                          </p>
                          <p className="text-sm text-gray-500">
                            {(a.category || a.claimType || 'asset').replace(/_/g, ' ')}
                          </p>
                        </div>
                        <Badge variant={statusVariant(a.status)}>
                          {(a.status || 'discovered').replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                        <div>
                          <p className="text-gray-500">Claimed</p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {inr(a.estimatedValueInINR || a.claimedAmountInINR)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Recovered</p>
                          <p className="font-semibold text-emerald-600">
                            {inr(a.recoveredValueInINR || a.receivedAmountInINR)}
                          </p>
                        </div>
                      </div>
                      {a.expectedSettlementDate && (
                        <p className="mt-3 text-xs text-gray-500">
                          <Clock className="w-3 h-3 inline mr-1" />
                          Expected by{' '}
                          {new Date(a.expectedSettlementDate).toLocaleDateString('en-IN')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon="📄"
                  title="Asset recovery is being prepared"
                  description="Your officer will update this once claims are filed with institutions."
                />
              )}
            </AnimatedCard>

            <AnimatedCard hover={false}>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Outstanding document checklist
              </h2>
              <div className="space-y-4">
                {docs.map((d, i) => (
                  <div
                    key={d.documentType || i}
                    className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2
                            className={[
                              'w-5 h-5',
                              ['uploaded', 'verified'].includes(d.status)
                                ? 'text-emerald-500'
                                : 'text-gray-300',
                            ].join(' ')}
                          />
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {d.label || d.documentType?.replace(/_/g, ' ')}
                          </p>
                          <Badge variant={statusVariant(d.status)}>{d.status || 'pending'}</Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Typical timeline: {d.slaDays || d.expectedDays || '3-10'} working days
                          after upload for {(d.claimType || 'generic recovery').replace(/_/g, ' ')}.
                        </p>
                      </div>
                      {!['uploaded', 'verified'].includes(d.status) && (
                        <div className="md:w-72">
                          <FileUploader
                            onUpload={(files) => uploadDocument(d, files)}
                            accept=".pdf,.jpg,.jpeg,.png"
                            maxFiles={2}
                            className={
                              uploadingFor === (d.documentType || d.label)
                                ? 'opacity-60 pointer-events-none'
                                : ''
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </AnimatedCard>
          </div>

          <aside className="space-y-6">
            <AnimatedCard hover={false}>
              <h2 className="font-bold text-gray-900 dark:text-white mb-3">
                Your assigned officer
              </h2>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={[
                    'w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30',
                    'flex items-center justify-center',
                  ].join(' ')}
                >
                  <ShieldCheck className="text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {officer.name || officer.fullName}
                  </p>
                  <p className="text-sm text-gray-500">Estate assistance</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Phone className="w-4 h-4" />
                  {officer.phone || 'Support desk'}
                </p>
                <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Mail className="w-4 h-4" />
                  {officer.email || 'Available through messages'}
                </p>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={[
                  'mt-4 w-full px-3 py-2 rounded-xl border',
                  'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900',
                  'text-gray-900 dark:text-white',
                ].join(' ')}
                rows={3}
                aria-label="Write a message to your officer"
              />
              <button
                onClick={sendMessage}
                className={[
                  'mt-2 w-full inline-flex items-center justify-center gap-2',
                  'px-4 py-2.5 rounded-xl bg-blue-600 text-white',
                ].join(' ')}
              >
                <Send className="w-4 h-4" />
                Send message
              </button>
            </AnimatedCard>

            <AnimatedCard hover={false} className="border-emerald-200 dark:border-emerald-800">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4">
                Transparent fee breakdown
              </h2>
              <div className="space-y-3 text-sm">
                <Row label="Amounts actually recovered" value={inr(recovered)} />
                <Row label={`Success fee (${feePercent}%)`} value={inr(fee)} />
                <Row label={`GST (${gstPercent}%)`} value={inr(gst)} />
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <Row label="Total payable only after recovery" value={inr(fee + gst)} strong />
                </div>
              </div>
              <p
                className={[
                  'mt-4 text-sm text-emerald-700 dark:text-emerald-300',
                  'bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl',
                ].join(' ')}
              >
                <IndianRupee className="w-4 h-4 inline mr-1" />
                Nothing is charged on amounts not recovered.
              </p>
            </AnimatedCard>

            <AnimatedCard hover={false}>
              <h2 className="font-bold text-gray-900 dark:text-white mb-4">Expected timeline</h2>
              <Timeline
                maxItems={5}
                items={(
                  caseData.timeline || [
                    {
                      title: 'Verification started',
                      description: 'Documents and consent are reviewed.',
                      status: 'active',
                    },
                    {
                      title: 'Claims prepared',
                      description: 'Institution-specific claim playbooks are followed.',
                    },
                    {
                      title: 'Settlement',
                      description: 'Recovered amounts and fee statement are reconciled.',
                    },
                  ]
                ).map((t) => ({
                  title: t.title || t.action,
                  description: t.description || t.detail,
                  date: t.at ? new Date(t.at).toLocaleDateString('en-IN') : '',
                  status: t.status,
                }))}
              />
            </AnimatedCard>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={
          strong ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'
        }
      >
        {label}
      </span>
      <span
        className={
          strong ? 'font-extrabold text-emerald-600' : 'font-semibold text-gray-900 dark:text-white'
        }
      >
        {value}
      </span>
    </div>
  );
}
