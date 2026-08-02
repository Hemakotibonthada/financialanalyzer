import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  FilePlus2,
  Receipt,
  RefreshCw,
  ShieldCheck,
  WalletCards,
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
import { EnhancedBarChart, EnhancedDoughnutChart } from '../../components/ui/ChartComponents';

const feeStatuses = [
  'all',
  'pending',
  'invoiced',
  'partially_paid',
  'paid',
  'waived',
  'written_off',
  'refunded',
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
const fmtDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';
const badgeVariant = {
  pending: 'warning',
  invoiced: 'info',
  partially_paid: 'warning',
  paid: 'success',
  waived: 'purple',
  written_off: 'danger',
  refunded: 'default',
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
          <p className="font-semibold">Unable to load settlement console</p>
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

export default function LegacySettlementConsole() {
  const [fees, setFees] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [waiverOpen, setWaiverOpen] = useState(false);
  const [payment, setPayment] = useState({
    amountInINR: '',
    method: 'bank_transfer',
    reference: '',
  });
  const [waiverReason, setWaiverReason] = useState('');

  const fetchSettlements = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/legacy/settlement', {
        params: status === 'all' ? {} : { status },
      });
      const data = unwrap(response);
      setFees(arr(data.fees || data.items || data));
      setSummary(data.summary || {});
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Settlement request failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);

  const filtered = useMemo(() => {
    const term = query.toLowerCase();
    return fees.filter(
      (fee) =>
        !term ||
        `${fee.invoiceNumber || ''} ${fee.estateCaseId?.caseNumber || fee.caseNumber || ''}`
          .toLowerCase()
          .includes(term)
    );
  }, [fees, query]);
  const totals = useMemo(
    () => ({
      recovered: filtered.reduce((s, f) => s + Number(f.basisAmountInINR || 0), 0),
      gross: filtered.reduce((s, f) => s + Number(f.grossFeeInINR || 0), 0),
      gst: filtered.reduce((s, f) => s + Number(f.gstAmountInINR || 0), 0),
      payable: filtered.reduce((s, f) => s + Number(f.totalPayableInINR || 0), 0),
      paid: filtered.reduce((s, f) => s + Number(f.amountPaidInINR || 0), 0),
    }),
    [filtered]
  );
  const revenueByStatus = feeStatuses
    .slice(1)
    .map((s) => ({
      status: s,
      amount: filtered
        .filter((f) => f.status === s)
        .reduce((sum, f) => sum + Number(f.totalPayableInINR || 0), 0),
    }))
    .filter((x) => x.amount > 0);

  const computeFee = async (fee) => {
    try {
      await api.post('/legacy/settlement/compute', {
        estateCaseId: fee.estateCaseId?._id || fee.estateCaseId || fee.estateCase,
      });
      toast.success('Fee recomputed on recovered amount only');
      fetchSettlements();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Computation failed');
    }
  };
  const issueInvoice = async (fee) => {
    try {
      await api.post(`/legacy/settlement/${fee._id || fee.id}/invoice`);
      toast.success('Invoice generated');
      fetchSettlements();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invoice generation failed');
    }
  };
  const savePayment = async () => {
    try {
      await api.post(`/legacy/settlement/${selected._id || selected.id}/payments`, {
        ...payment,
        amountInINR: Number(payment.amountInINR || 0),
      });
      toast.success('Payment recorded');
      setPaymentOpen(false);
      setPayment({ amountInINR: '', method: 'bank_transfer', reference: '' });
      fetchSettlements();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    }
  };
  const saveWaiver = async () => {
    if (!waiverReason.trim()) return;
    try {
      await api.post(`/legacy/settlement/${selected._id || selected.id}/waive`, {
        reason: waiverReason,
      });
      toast.success('Waiver submitted for approval');
      setWaiverOpen(false);
      setWaiverReason('');
      fetchSettlements();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Waiver failed');
    }
  };

  const columns = [
    {
      key: 'invoiceNumber',
      header: 'Invoice',
      render: (v, r) => (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{v || 'Not issued'}</p>
          <p className="text-xs text-slate-500">
            {r.estateCaseId?.caseNumber || r.caseNumber || 'Estate case'}
          </p>
        </div>
      ),
    },
    { key: 'basisAmountInINR', header: 'Recovered basis', align: 'right', render: (v) => money(v) },
    {
      key: 'grossFeeInINR',
      header: '1% fee',
      align: 'right',
      render: (v, r) => money(v ?? Number(r.basisAmountInINR || 0) * 0.01),
    },
    { key: 'gstAmountInINR', header: 'GST', align: 'right', render: (v) => money(v) },
    { key: 'totalPayableInINR', header: 'Payable', align: 'right', render: (v) => money(v) },
    {
      key: 'status',
      header: 'Status',
      render: (v) => <Badge variant={badgeVariant[v] || 'default'}>{label(v)}</Badge>,
    },
    { key: 'dueAt', header: 'Due', render: (v) => fmtDate(v) },
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
        <ErrorState message={error} onRetry={fetchSettlements} />
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
            <p className="text-sm uppercase tracking-wide text-slate-500">Settlement</p>
            <h1 className="text-2xl font-bold">Success fee console</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Compute 1% only on recovered amounts, add GST, issue invoices, record payments, and
              manage waivers.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchSettlements}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm dark:border-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </header>
        <div
          className={[
            'rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900',
            'dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200',
          ].join(' ')}
        >
          <ShieldCheck className="mr-2 inline h-4 w-4" />
          Fee policy: 1% success fee is charged only on recovered amount, never on discovered value.
          GST is shown separately before invoice generation.
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard
            title="Recovered basis"
            value={summary.recoveredInINR ?? totals.recovered}
            format="currency"
            icon={<WalletCards className="h-5 w-5" />}
            color="#2563eb"
          />
          <StatCard
            title="Gross fee"
            value={summary.grossFeeInINR ?? totals.gross}
            format="currency"
            icon={<Receipt className="h-5 w-5" />}
            color="#7c3aed"
          />
          <StatCard
            title="GST"
            value={summary.gstInINR ?? totals.gst}
            format="currency"
            icon={<FilePlus2 className="h-5 w-5" />}
            color="#d97706"
          />
          <StatCard
            title="Paid"
            value={summary.paidInINR ?? totals.paid}
            format="currency"
            icon={<Banknote className="h-5 w-5" />}
            color="#16a34a"
          />
        </div>
        <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-800">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
            <SearchInput value={query} onChange={setQuery} />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={[
                'rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm',
                'dark:border-slate-700 dark:bg-slate-900',
              ].join(' ')}
            >
              {feeStatuses.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All statuses' : label(s)}
                </option>
              ))}
            </select>
          </div>
        </section>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
          <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-800">
            {filtered.length ? (
              <>
                <div className="hidden md:block">
                  <DataTable
                    columns={columns}
                    data={filtered}
                    actions={(row) => (
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => computeFee(row)}
                          className="rounded-lg border px-2 py-1 text-xs dark:border-slate-700"
                        >
                          Compute
                        </button>
                        <button
                          type="button"
                          onClick={() => issueInvoice(row)}
                          className="rounded-lg bg-blue-600 px-2 py-1 text-xs text-white"
                        >
                          Invoice
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(row);
                            setPaymentOpen(true);
                          }}
                          className="rounded-lg border px-2 py-1 text-xs dark:border-slate-700"
                        >
                          Pay
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(row);
                            setWaiverOpen(true);
                          }}
                          className={[
                            'rounded-lg border border-amber-300 px-2 py-1 text-xs',
                            'text-amber-700 dark:border-amber-900 dark:text-amber-300',
                          ].join(' ')}
                        >
                          Waive
                        </button>
                      </div>
                    )}
                  />
                </div>
                <div className="space-y-3 md:hidden">
                  {filtered.map((fee) => (
                    <article
                      key={fee._id || fee.id}
                      className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                    >
                      <div className="flex justify-between">
                        <p className="font-semibold">{fee.invoiceNumber || 'Not invoiced'}</p>
                        <Badge variant={badgeVariant[fee.status] || 'default'}>
                          {label(fee.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500">
                        {fee.estateCaseId?.caseNumber || fee.caseNumber}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <span>Recovered {money(fee.basisAmountInINR)}</span>
                        <span>Payable {money(fee.totalPayableInINR)}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => issueInvoice(fee)}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white"
                        >
                          Invoice
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(fee);
                            setPaymentOpen(true);
                          }}
                          className="rounded-lg border px-3 py-1.5 text-xs dark:border-slate-700"
                        >
                          Pay
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(fee);
                            setWaiverOpen(true);
                          }}
                          className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs text-amber-700"
                        >
                          Waive
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState
                title="No settlement fees"
                description="Fees are created after recovered amounts are recorded."
              />
            )}
          </section>
          <aside className="space-y-6">
            <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
              <h2 className="mb-4 text-lg font-semibold">Revenue by status</h2>
              {revenueByStatus.length ? (
                <EnhancedDoughnutChart
                  data={revenueByStatus.map((x) => x.amount)}
                  labels={revenueByStatus.map((x) => label(x.status))}
                  currency
                  centerLabel="Payable"
                  centerValue={money(totals.payable)}
                  height={260}
                />
              ) : (
                <EmptyState title="No revenue chart" />
              )}
            </section>
            <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
              <h2 className="mb-4 text-lg font-semibold">Fee breakdown</h2>
              <EnhancedBarChart
                labels={['Recovered', '1% fee', 'GST', 'Payable', 'Paid']}
                data={[totals.recovered, totals.gross, totals.gst, totals.payable, totals.paid]}
                currency
                height={260}
                showLegend={false}
              />
            </section>
          </aside>
        </div>
      </div>
      <Modal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title="Record payment"
        footer={
          <>
            <button
              type="button"
              onClick={() => setPaymentOpen(false)}
              className="rounded-lg border px-4 py-2 text-sm dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={savePayment}
              disabled={!payment.amountInINR}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Record
            </button>
          </>
        }
      >
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          {selected?.invoiceNumber || 'Invoice pending'} · balance{' '}
          {money(
            selected?.balanceInINR ??
              Number(selected?.totalPayableInINR || 0) - Number(selected?.amountPaidInINR || 0)
          )}
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">
            Amount
            <input
              type="number"
              value={payment.amountInINR}
              onChange={(e) => setPayment((f) => ({ ...f, amountInINR: e.target.value }))}
              className="mt-1 w-full rounded-xl border p-2 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <label className="text-sm font-medium">
            Method
            <select
              value={payment.method}
              onChange={(e) => setPayment((f) => ({ ...f, method: e.target.value }))}
              className="mt-1 w-full rounded-xl border p-2 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="bank_transfer">Bank transfer</option>
              <option value="upi">UPI</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash</option>
            </select>
          </label>
        </div>
        <label className="mt-4 block text-sm font-medium">
          Reference
          <input
            value={payment.reference}
            onChange={(e) => setPayment((f) => ({ ...f, reference: e.target.value }))}
            className="mt-1 w-full rounded-xl border p-2 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
      </Modal>
      <Modal
        isOpen={waiverOpen}
        onClose={() => setWaiverOpen(false)}
        title="Waiver workflow"
        footer={
          <>
            <button
              type="button"
              onClick={() => setWaiverOpen(false)}
              className="rounded-lg border px-4 py-2 text-sm dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveWaiver}
              disabled={!waiverReason.trim()}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Submit waiver
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Waivers require an auditable reason and authorised approval. They do not alter recovered
          amount records.
        </p>
        <label className="mt-4 block text-sm font-medium">
          Reason
          <textarea
            value={waiverReason}
            onChange={(e) => setWaiverReason(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
      </Modal>
    </div>
  );
}
