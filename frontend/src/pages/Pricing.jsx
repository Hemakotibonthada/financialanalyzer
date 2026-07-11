import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, Loader2, Crown, Zap } from 'lucide-react';
import { toast } from 'react-toastify';
import MainLayout from '../components/MainLayout';
import api from '../services/api';

const PLAN_ICON = { free: Zap, pro: Sparkles, premium: Crown };
const inr = (paise) => `₹${(Number(paise || 0) / 100).toLocaleString('en-IN')}`;

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  const [configured, setConfigured] = useState(false);
  const [current, setCurrent] = useState('free');
  const [cycle, setCycle] = useState('monthly');
  const [busy, setBusy] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, me] = await Promise.all([api.get('/billing/plans'), api.get('/billing/me')]);
      setPlans(p.data?.data?.plans || []);
      setConfigured(!!p.data?.data?.billingConfigured);
      setCurrent(me.data?.data?.plan?.id || 'free');
    } catch (e) {
      toast.error('Could not load plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const upgrade = async (planId) => {
    setBusy(planId);
    try {
      if (!configured) {
        // Dev mode — activate directly (no live gateway keys configured).
        await api.post('/billing/dev-activate', { planId, cycle });
        toast.success(`Activated ${planId} plan (dev mode)`);
        await load();
        return;
      }
      const ok = await loadRazorpay();
      if (!ok) { toast.error('Failed to load payment gateway'); return; }
      const order = (await api.post('/billing/checkout', { planId, cycle })).data.data;
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'FinAnalyzer',
        description: `${planId} plan (${cycle})`,
        order_id: order.orderId,
        handler: async (resp) => {
          await api.post('/billing/verify', {
            orderId: resp.razorpay_order_id,
            paymentId: resp.razorpay_payment_id,
            signature: resp.razorpay_signature,
            planId, cycle
          });
          toast.success('Payment successful — plan upgraded!');
          await load();
        },
        theme: { color: '#0d9488' }
      });
      rzp.open();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Upgrade failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <MainLayout title="Plans & Pricing" subtitle="Upgrade to unlock unlimited tracking, AI insights & more">
      <div className="mx-auto max-w-6xl">
        {/* Billing cycle toggle */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className={cycle === 'monthly' ? 'font-semibold text-teal-600 dark:text-teal-400' : 'text-slate-500'}>Monthly</span>
          <button
            onClick={() => setCycle((c) => (c === 'monthly' ? 'yearly' : 'monthly'))}
            className="relative h-7 w-14 rounded-full bg-slate-300 dark:bg-slate-600 transition"
            aria-label="Toggle billing cycle"
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${cycle === 'yearly' ? 'left-8' : 'left-1'}`} />
          </button>
          <span className={cycle === 'yearly' ? 'font-semibold text-teal-600 dark:text-teal-400' : 'text-slate-500'}>
            Yearly <span className="ml-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">2 months free</span>
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-slate-400"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const Icon = PLAN_ICON[plan.id] || Sparkles;
              const price = cycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
              const isCurrent = plan.id === current;
              const isPaid = plan.id !== 'free';
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl border p-6 transition ${
                    plan.popular
                      ? 'border-teal-500 shadow-lg shadow-teal-500/10 dark:border-teal-400'
                      : 'border-slate-200 dark:border-slate-700'
                  } bg-white dark:bg-slate-800`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-teal-500 px-3 py-1 text-xs font-semibold text-white">
                      Most popular
                    </span>
                  )}
                  <div className="mb-4 flex items-center gap-2">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
                      <Icon size={20} />
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                      <p className="text-xs text-slate-500">{plan.tagline}</p>
                    </div>
                  </div>
                  <div className="mb-5">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{price ? inr(price) : '₹0'}</span>
                    <span className="text-sm text-slate-500">/{cycle === 'yearly' ? 'yr' : 'mo'}</span>
                  </div>
                  <ul className="mb-6 flex-1 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Check size={16} className="mt-0.5 shrink-0 text-teal-500" /> {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <button disabled className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-700/40">
                      Current plan
                    </button>
                  ) : isPaid ? (
                    <button
                      onClick={() => upgrade(plan.id)}
                      disabled={busy === plan.id}
                      className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition ${
                        plan.popular ? 'bg-teal-500 hover:bg-teal-600' : 'bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600'
                      }`}
                    >
                      {busy === plan.id ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                      Upgrade to {plan.name}
                    </button>
                  ) : (
                    <button onClick={() => navigate('/billing')} className="rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/40">
                      Downgrade
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!configured && !loading && (
          <p className="mt-6 text-center text-xs text-slate-400">
            Payment gateway not configured — running in dev mode. Add RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET to enable live checkout.
          </p>
        )}
      </div>
    </MainLayout>
  );
}
