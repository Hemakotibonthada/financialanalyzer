import { format, formatDistanceToNowStrict, isValid, parseISO, differenceInDays } from 'date-fns';

/**
 * Formatting helpers.
 *
 * Currency is always INR in en-IN grouping (₹1,23,456.78 - lakhs and crores,
 * not thousands). Screens must use these rather than hand-rolling, so a
 * change of locale is a one-file change.
 */

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

const inrPrecise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

/**
 * @param {number} amount
 * @param {{precise?: boolean, signed?: boolean}} [options]
 */
export function formatMoney(amount, options = {}) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '₹0';

  const formatted = options.precise ? inrPrecise.format(Math.abs(n)) : inr.format(Math.abs(n));

  if (options.signed && n !== 0) return `${n > 0 ? '+' : '-'}${formatted}`;
  return n < 0 ? `-${formatted}` : formatted;
}

/**
 * Indian short scale, for chart axes and tiles where the full number would
 * wrap. 1,50,000 becomes ₹1.5L rather than the misleading ₹150K.
 */
export function formatCompact(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '₹0';

  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';

  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(abs >= 100000000 ? 0 : 1)}Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(abs >= 1000000 ? 0 : 1)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}K`;
  return `${sign}₹${Math.round(abs)}`;
}

export function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('en-IN').format(n);
}

export function formatPercent(value, decimals = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0%';
  return `${n.toFixed(decimals)}%`;
}

/* ------------------------------------------------------------- dates */

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const parsed = typeof value === 'string' ? parseISO(value) : new Date(value);
  return isValid(parsed) ? parsed : null;
}

export function formatDate(value, pattern = 'd MMM yyyy') {
  const d = toDate(value);
  return d ? format(d, pattern) : '—';
}

export function formatDateTime(value) {
  const d = toDate(value);
  return d ? format(d, 'd MMM yyyy, h:mm a') : '—';
}

export function formatMonth(value) {
  const d = toDate(value);
  return d ? format(d, 'MMM yyyy') : '—';
}

/** "3 days ago" / "in 2 months". */
export function relativeTime(value) {
  const d = toDate(value);
  if (!d) return '—';
  const suffix = d.getTime() > Date.now() ? 'in ' : '';
  const ago = d.getTime() > Date.now() ? '' : ' ago';
  return `${suffix}${formatDistanceToNowStrict(d)}${ago}`;
}

/**
 * Days until a due date. Negative means overdue, which callers use to switch
 * to the danger colour.
 */
export function daysUntil(value) {
  const d = toDate(value);
  if (!d) return null;
  return differenceInDays(d, new Date());
}

/** Human due-date label with an urgency tier the UI can colour by. */
export function dueLabel(value) {
  const days = daysUntil(value);
  if (days === null) return { text: '—', tone: 'muted' };
  if (days < 0) return { text: `Overdue by ${Math.abs(days)}d`, tone: 'danger' };
  if (days === 0) return { text: 'Due today', tone: 'danger' };
  if (days === 1) return { text: 'Due tomorrow', tone: 'warning' };
  if (days <= 7) return { text: `Due in ${days} days`, tone: 'warning' };
  return { text: formatDate(value), tone: 'muted' };
}

/* ------------------------------------------------------------- text */

export function initials(name) {
  if (!name) return '?';
  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

export function titleCase(value) {
  if (!value) return '';
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function truncate(value, max = 40) {
  if (!value) return '';
  const s = String(value);
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Mask an identifier for display: 9876543210 -> ******3210. */
export function maskValue(value, visibleTail = 4) {
  if (!value) return '—';
  const s = String(value);
  if (s.includes('@')) {
    const [local, domain] = s.split('@');
    return `${local[0]}${'*'.repeat(Math.max(local.length - 1, 1))}@${domain}`;
  }
  if (s.length <= visibleTail) return '*'.repeat(s.length);
  return `${'*'.repeat(s.length - visibleTail)}${s.slice(-visibleTail)}`;
}

export default {
  formatMoney,
  formatCompact,
  formatNumber,
  formatPercent,
  formatDate,
  formatDateTime,
  formatMonth,
  relativeTime,
  daysUntil,
  dueLabel,
  initials,
  titleCase,
  truncate,
  maskValue
};
