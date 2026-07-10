import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ShieldCheck, RefreshCw, TrendingDown, Building2,
  Mail, ArrowLeft, Info
} from 'lucide-react';
import MainLayout from '../components/MainLayout';
import api from '../services/api';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const VERDICT = {
  severe: { title: 'Severe debt-spiral risk', tone: 'text-rose-600 dark:text-rose-300', bg: 'border-rose-500/40 bg-rose-500/10', Icon: AlertTriangle },
  high: { title: 'High debt-spiral risk', tone: 'text-orange-600 dark:text-orange-300', bg: 'border-orange-500/40 bg-orange-500/10', Icon: AlertTriangle },
  watch: { title: 'Debt load worth watching', tone: 'text-amber-600 dark:text-amber-300', bg: 'border-amber-500/40 bg-amber-500/10', Icon: ShieldCheck },
  healthy: { title: 'No app/NBFC debt-spiral detected', tone: 'text-emerald-600 dark:text-emerald-300', bg: 'border-emerald-500/40 bg-emerald-500/10', Icon: ShieldCheck }
};

const STATUS_CHIP = {
  collections: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30',
  overdue: 'bg-orange-500/15 text-orange-600 dark:text-orange-300 border border-orange-500/30',
  repaying: 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30',
  active: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-500/30'
};
const STATUS_LABEL = {
  collections: 'In collections',
  overdue: 'Overdue',
  repaying: 'Repaying',
  active: 'Active'
};

export default function DebtSpiralMonitor() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/loan-intelligence/spiral');
      setData(res?.data?.data || null);
    } catch (err) {
      setError('Could not load loan analysis. Make sure Gmail is connected and synced.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const verdict = VERDICT[data?.verdict] || VERDICT.healthy;
  const VIcon = verdict.Icon;
  const lenders = data?.lenders || [];

  const headerActions = (
    <button
      onClick={load}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
    >
      <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
    </button>
  );

  return (
    <MainLayout
      title="Debt Spiral Monitor"
      subtitle="Loan-app & NBFC EMIs, overdue detection, and borrow-to-repay risk from your Gmail"
      headerActions={headerActions}
    >
      <div className="mx-auto max-w-5xl">
        <Link
          to="/debt-management"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          <ArrowLeft size={15} /> Back to Debt Management
        </Link>

        {loading && !data && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center text-slate-500">
            <RefreshCw className="mx-auto mb-3 animate-spin" size={26} />
            Analyzing your loan &amp; EMI emails…
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-600 dark:text-rose-300">
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Verdict banner */}
            <div className={`mb-5 flex items-start gap-4 rounded-2xl border p-5 ${verdict.bg}`}>
              <VIcon className={`mt-0.5 shrink-0 ${verdict.tone}`} size={26} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className={`text-lg font-bold ${verdict.tone}`}>{verdict.title}</h2>
                  <span className="rounded-full bg-black/10 dark:bg-black/30 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                    Risk score {data.score}/100
                  </span>
                  {data.borrowToRepayRisk && (
                    <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-300">
                      Borrow-to-repay pattern
                    </span>
                  )}
                </div>
                {Array.isArray(data.reasons) && data.reasons.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    {data.reasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
                        {r}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    Your app/NBFC loan load looks under control. Keep EMIs current and avoid new app loans.
                  </p>
                )}
              </div>
            </div>

            {/* Key stats */}
            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="App / NBFC lenders" value={data.lenderCount} icon={Building2} />
              <Stat label="Overdue / collections" value={data.overdueCount} tone={data.overdueCount > 0 ? 'bad' : 'good'} icon={AlertTriangle} />
              <Stat label="Monthly loan EMIs" value={inr(data.totalMonthlyEmi)} icon={TrendingDown} />
              <Stat
                label="EMIs vs income"
                value={data.monthlyIncome > 0 && data.emiToIncome != null ? `${Math.round(data.emiToIncome * 100)}%` : '—'}
                tone={data.emiToIncome >= 0.5 ? 'bad' : data.emiToIncome >= 0.35 ? 'warn' : 'good'}
                icon={Info}
              />
            </div>

            {/* Lender table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
                <Mail size={16} className="text-slate-400" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                  Detected lenders ({lenders.length})
                </h3>
                <span className="ml-auto text-xs text-slate-400">
                  from {data.scannedEmails} scanned emails
                </span>
              </div>

              {lenders.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No app/NBFC loan emails detected. If you have such loans, connect &amp; sync Gmail first.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                        <th className="px-4 py-2 font-medium">Lender</th>
                        <th className="px-4 py-2 font-medium">Status</th>
                        <th className="px-4 py-2 font-medium text-right">Est. EMI</th>
                        <th className="px-4 py-2 font-medium text-right">Penal rate</th>
                        <th className="px-4 py-2 font-medium">First EMI</th>
                        <th className="px-4 py-2 font-medium text-right">Emails</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lenders.map((l) => (
                        <tr key={l.key} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{l.lender}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CHIP[l.status] || STATUS_CHIP.active}`}>
                              {STATUS_LABEL[l.status] || 'Active'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-200">
                            {l.emiAmount ? inr(l.emiAmount) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500">~{l.typicalRate}%</td>
                          <td className="px-4 py-3 text-slate-500">{fmtDate(l.firstEmiDate)}</td>
                          <td className="px-4 py-3 text-right text-slate-500">{l.emailCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <p className="mt-4 flex items-start gap-2 text-xs text-slate-400">
              <Info size={14} className="mt-0.5 shrink-0" />
              Estimates are inferred from email text; exact principal, tenure and outstanding live inside
              password-protected statement PDFs. Educational guidance only — not financial advice.
            </p>
          </>
        )}
      </div>
    </MainLayout>
  );
}

function Stat({ label, value, tone = 'default', icon: Icon }) {
  const toneMap = {
    default: 'text-slate-800 dark:text-white',
    good: 'text-emerald-600 dark:text-emerald-400',
    warn: 'text-amber-600 dark:text-amber-400',
    bad: 'text-rose-600 dark:text-rose-400'
  };
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        {Icon && <Icon size={14} />} {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${toneMap[tone]}`}>{value}</div>
    </div>
  );
}
