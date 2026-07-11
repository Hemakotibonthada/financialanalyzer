import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ArrowRight, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';
import MainLayout from '../components/MainLayout';
import api from '../services/api';

const STATUS_STYLE = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  trialing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  past_due: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  canceled: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  inactive: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
};
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function Billing() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/billing/me');
      setData(res.data?.data || null);
    } catch (e) {
      toast.error('Could not load billing info');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cancel = async () => {
    if (!window.confirm('Cancel your subscription? You keep access until the end of the current period.')) return;
    setBusy(true);
    try {
      await api.post('/billing/cancel');
      toast.success('Subscription will end at the current period.');
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Cancel failed');
    } finally {
      setBusy(false);
    }
  };

  const sub = data?.subscription || {};
  const planName = data?.plan?.name || 'Free';
  const isPaid = (sub.plan && sub.plan !== 'free');

  return (
    <MainLayout title="Billing & Subscription" subtitle="Manage your plan and payments">
      <div className="mx-auto max-w-3xl">
        {loading ? (
          <div className="flex justify-center py-20 text-slate-400"><Loader2 className="animate-spin" /></div>
        ) : (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
                    <CreditCard size={22} />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">{planName} plan</h2>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[sub.status] || STATUS_STYLE.inactive}`}>
                        {sub.status || 'active'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      {isPaid ? `Billed ${sub.billingCycle}` : 'You are on the free plan'}
                    </p>
                  </div>
                </div>
                <button onClick={() => navigate('/pricing')} className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600">
                  {isPaid ? 'Change plan' : 'Upgrade'} <ArrowRight size={16} />
                </button>
              </div>

              {isPaid && (
                <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 dark:border-slate-700">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-400">Renews / ends on</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{fmtDate(sub.currentPeriodEnd)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-400">Provider</div>
                    <div className="font-semibold capitalize text-slate-800 dark:text-slate-100">{sub.provider || '—'}</div>
                  </div>
                </div>
              )}

              {sub.cancelAtPeriodEnd && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-300">
                  <AlertTriangle size={16} /> Your plan is set to cancel on {fmtDate(sub.currentPeriodEnd)}.
                </div>
              )}
            </div>

            {isPaid && !sub.cancelAtPeriodEnd && (
              <button onClick={cancel} disabled={busy} className="mt-4 text-sm font-medium text-rose-600 hover:underline dark:text-rose-400">
                {busy ? 'Cancelling…' : 'Cancel subscription'}
              </button>
            )}

            <div className="mt-6 flex items-start gap-2 rounded-xl bg-slate-50 p-4 text-xs text-slate-500 dark:bg-slate-800/50">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-teal-500" />
              Payments are processed securely by the payment gateway. We never store your card details.
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
