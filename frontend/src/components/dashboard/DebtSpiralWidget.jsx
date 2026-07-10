import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '../../services/api';

// Debt-Spiral warning widget.
// Self-contained and fail-safe: on any error, or when the picture is healthy,
// it renders nothing so it can never break the dashboard.
const inr = (n) =>
  `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

const TONE = {
  severe: { ring: 'border-rose-500/40 bg-rose-500/10', text: 'text-rose-300', dot: 'bg-rose-500', label: 'Severe debt-spiral risk' },
  high: { ring: 'border-orange-500/40 bg-orange-500/10', text: 'text-orange-300', dot: 'bg-orange-500', label: 'High debt-spiral risk' },
  watch: { ring: 'border-amber-500/40 bg-amber-500/10', text: 'text-amber-300', dot: 'bg-amber-500', label: 'Debt load worth watching' }
};

export default function DebtSpiralWidget() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .get('/loan-intelligence/spiral')
      .then((res) => {
        if (active) setData(res?.data?.data || null);
      })
      .catch(() => {
        /* fail silent — never break the dashboard */
      });
    return () => {
      active = false;
    };
  }, []);

  if (!data) return null;
  // Nothing worth alarming about — stay quiet.
  if (data.verdict === 'healthy' || (data.lenderCount === 0 && data.overdueCount === 0)) {
    return null;
  }

  const tone = TONE[data.verdict] || TONE.watch;

  return (
    <div className={`mb-6 rounded-2xl border ${tone.ring} p-4 sm:p-5`}>
      <div className="flex items-start gap-4">
        <div className="mt-0.5 shrink-0">
          {data.verdict === 'watch' ? (
            <ShieldCheck className={tone.text} size={22} />
          ) : (
            <AlertTriangle className={tone.text} size={22} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`font-semibold ${tone.text}`}>{tone.label}</h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-black/20 px-2 py-0.5 text-xs text-slate-300">
              <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
              score {data.score}/100
            </span>
          </div>

          <p className="mt-1 text-sm text-slate-300">
            {data.overdueCount > 0 && (
              <b className="text-rose-300">{data.overdueCount} loan{data.overdueCount > 1 ? 's' : ''} overdue. </b>
            )}
            Detected {data.lenderCount} app/NBFC lender{data.lenderCount === 1 ? '' : 's'} with about{' '}
            <b>{inr(data.totalMonthlyEmi)}</b>/month in EMIs
            {data.monthlyIncome > 0 && data.emiToIncome != null && (
              <> — that&apos;s <b>{Math.round(data.emiToIncome * 100)}%</b> of your income</>
            )}
            .
          </p>

          {Array.isArray(data.reasons) && data.reasons.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
              {data.reasons.slice(0, 3).map((r, i) => (
                <li key={i} className="flex items-center gap-1">
                  <span className={`h-1 w-1 rounded-full ${tone.dot}`} />
                  {r}
                </li>
              ))}
            </ul>
          )}

          <Link
            to="/debt-spiral"
            className={`mt-3 inline-flex items-center gap-1.5 text-sm font-medium ${tone.text} hover:underline`}
          >
            Open Debt Spiral Monitor <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
