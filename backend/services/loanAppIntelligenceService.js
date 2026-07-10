// ============================================================================
// Loan-App & NBFC Intelligence Service
// ----------------------------------------------------------------------------
// Detects unsecured loan-app / NBFC EMIs and OVERDUE / collections situations
// directly from stored Gmail emails (GmailEmail model). This complements
// emiExtractionService (which only reads credit-card SmartEMI/FlexiPay from PDF
// statements) by covering app lenders like MoneyView/Whizdm, Fibe/EarlySalary,
// PayU/LazyPay/PaySense, Poonawalla, Tata Capital, KreditBee, Navi, etc.
//
// It also computes a "debt-spiral" verdict: when monthly debt outflow dwarfs
// income and/or several accounts are overdue, that signals borrow-to-repay.
// ============================================================================

const logger = require('../utils/logger');
const GmailEmail = require('../models/GmailEmail');
const FinancialProfile = require('../models/FinancialProfile');

// ── Known Indian loan-app / NBFC lenders ────────────────────────────────────
// domains: matched against the sender email; names: matched against sender
// name, subject or body (covers lending-partner mentions like "Whizdm").
const LOAN_LENDERS = [
  { key: 'moneyview',   label: 'MoneyView',            domains: ['mvloans.in', 'moneyview.in'],            names: ['moneyview', 'whizdm'],                    typicalRate: 24, secured: false },
  { key: 'fibe',        label: 'Fibe (EarlySalary)',   domains: ['fibe.in', 'earlysalary.com'],            names: ['fibe', 'earlysalary'],                    typicalRate: 30, secured: false },
  { key: 'lazypay',     label: 'PayU / LazyPay',       domains: ['payufin.com', 'lazypay.in'],             names: ['lazypay', 'paysense', 'payu finance'],    typicalRate: 30, secured: false },
  { key: 'poonawalla',  label: 'Poonawalla Fincorp',   domains: ['poonawallafincorp.com'],                 names: ['poonawalla'],                             typicalRate: 20, secured: false },
  { key: 'tatacapital', label: 'Tata Capital',         domains: ['tatacapital.com', 'tatacapital.in'],     names: ['tata capital'],                           typicalRate: 16, secured: false },
  { key: 'kreditbee',   label: 'KreditBee',            domains: ['kreditbee.in', 'kreditbee.com'],         names: ['kreditbee'],                              typicalRate: 30, secured: false },
  { key: 'navi',        label: 'Navi',                 domains: ['navi.com'],                              names: ['navi finserv', 'navi loan'],              typicalRate: 20, secured: false },
  { key: 'cashe',       label: 'CASHe',                domains: ['cashe.co.in', 'cashe.in'],               names: ['cashe'],                                  typicalRate: 30, secured: false },
  { key: 'mobikwik',    label: 'MobiKwik',             domains: ['mobikwik.com', 'mobikwik.net'],          names: ['mobikwik', 'zip emi'],                    typicalRate: 24, secured: false },
  { key: 'kissht',      label: 'Kissht',               domains: ['kissht.com'],                            names: ['kissht'],                                 typicalRate: 28, secured: false },
  { key: 'zestmoney',   label: 'ZestMoney',            domains: ['zestmoney.in', 'zest.money'],            names: ['zestmoney'],                              typicalRate: 28, secured: false },
  { key: 'dhani',       label: 'Dhani',                domains: ['dhani.com'],                             names: ['dhani'],                                  typicalRate: 36, secured: false },
  { key: 'bajaj',       label: 'Bajaj Finserv',        domains: ['bajajfinserv.in', 'bajajfinance.com'],   names: ['bajaj finserv', 'bajaj finance'],         typicalRate: 16, secured: false },
  { key: 'stashfin',    label: 'Stashfin',             domains: ['stashfin.com'],                          names: ['stashfin'],                               typicalRate: 30, secured: false },
  { key: 'prefr',       label: 'Prefr',                domains: ['prefr.com'],                             names: ['prefr'],                                  typicalRate: 30, secured: false },
  { key: 'nira',        label: 'Nira',                 domains: ['nira.money', 'nira.finance'],            names: ['nira finance'],                           typicalRate: 24, secured: false },
  { key: 'smartcoin',   label: 'SmartCoin',            domains: ['smartcoin.co.in'],                       names: ['smartcoin'],                              typicalRate: 30, secured: false },
  { key: 'truebalance', label: 'True Balance',         domains: ['truebalance.io'],                        names: ['true balance'],                           typicalRate: 30, secured: false },
  { key: 'flexsalary',  label: 'FlexSalary',           domains: ['flexsalary.com'],                        names: ['flexsalary'],                             typicalRate: 30, secured: false }
];

// ── Signal keywords ─────────────────────────────────────────────────────────
const OVERDUE_SIGNALS = [
  'overdue', 'past due', 'unpaid', 'missed', 'not received', 'clear your dues',
  'clear the dues', 'auto-debit unsuccessful', 'auto debit unsuccessful',
  'auto-debit failed', 'bounce', 'bounced', 'penal', 'late payment', 'late fee',
  'defaulted', 'default', 'settle your', 'immediate payment'
];
const COLLECTION_SIGNALS = [
  'collection partner', 'collections', 'recovery', 'authorised agency',
  'authorized agency', 'legal action', 'field visit', 'recovery agent',
  'recovery representative', 'will be contacting you'
];
const PAID_SIGNALS = [
  'auto-debited successfully', 'auto debited successfully', 'payment received',
  'payment successful', 'successfully paid', 'we have received', 'emi received',
  'payment confirmation', 'thank you for your payment'
];
const EMI_SIGNALS = ['emi', 'instalment', 'installment', 'repayment', 'loan id', 'loan account'];

// Amounts like ₹12,345 / Rs. 12,345.00 / INR 12345 — captured with position.
const AMOUNT_RE = /(?:₹|rs\.?|inr)\s*([0-9][0-9,]*(?:\.\d{1,2})?)/gi;

class LoanAppIntelligenceService {
  /**
   * Resolve which known lender an email belongs to (or null).
   */
  matchLender(email) {
    const fromEmail = (email?.from?.email || '').toLowerCase();
    const fromName = (email?.from?.name || '').toLowerCase();
    const subject = (email?.subject || '').toLowerCase();
    const haystackName = `${fromName} ${subject}`;

    for (const lender of LOAN_LENDERS) {
      if (lender.domains.some((d) => fromEmail.includes(d))) return lender;
    }
    // Fall back to name/subject mentions (e.g., lending-partner named in body).
    for (const lender of LOAN_LENDERS) {
      if (lender.names.some((n) => haystackName.includes(n))) return lender;
    }
    return null;
  }

  /**
   * Largest plausible EMI-like amount in a text (ignores tiny fees / huge caps).
   */
  extractEmiAmount(text, { min = 500, max = 500000 } = {}) {
    if (!text) return null;
    const amounts = [];
    let m;
    AMOUNT_RE.lastIndex = 0;
    while ((m = AMOUNT_RE.exec(text)) !== null) {
      const val = parseFloat(m[1].replace(/,/g, ''));
      if (!Number.isNaN(val) && val >= min && val <= max) amounts.push(val);
    }
    if (!amounts.length) return null;
    // EMI reminders usually state a single figure; the mode/most-frequent is
    // the most reliable, else the max.
    const freq = new Map();
    amounts.forEach((a) => freq.set(a, (freq.get(a) || 0) + 1));
    let best = amounts[0];
    let bestCount = 0;
    for (const [val, count] of freq.entries()) {
      if (count > bestCount || (count === bestCount && val > best)) {
        best = val;
        bestCount = count;
      }
    }
    return best;
  }

  classifyStatus(text) {
    const t = (text || '').toLowerCase();
    const hasCollection = COLLECTION_SIGNALS.some((s) => t.includes(s));
    const hasOverdue = OVERDUE_SIGNALS.some((s) => t.includes(s));
    const hasPaid = PAID_SIGNALS.some((s) => t.includes(s));
    if (hasCollection) return 'collections';
    if (hasOverdue) return 'overdue';
    if (hasPaid) return 'paid';
    return 'active';
  }

  /**
   * Analyze all of a user's stored Gmail emails and build a per-lender picture.
   * @param {string} userId
   * @returns {Promise<Object>} lenders[], totals, generatedAt
   */
  async analyzeLoans(userId) {
    // Only pull fields we need; cap for safety on very large mailboxes.
    const emails = await GmailEmail.find({ userId })
      .select('from subject snippet bodyText date internalDate emailType')
      .sort({ date: 1 })
      .limit(5000)
      .lean();

    const buckets = new Map(); // key -> aggregate

    for (const email of emails) {
      const lender = this.matchLender(email);
      if (!lender) continue;

      const text = `${email.subject || ''}\n${email.bodyText || email.snippet || ''}`;
      const status = this.classifyStatus(text);
      const emiAmount = this.extractEmiAmount(text);
      const when = email.date ? new Date(email.date) : null;

      if (!buckets.has(lender.key)) {
        buckets.set(lender.key, {
          key: lender.key,
          lender: lender.label,
          secured: lender.secured,
          typicalRate: lender.typicalRate,
          emailCount: 0,
          emiAmount: null,
          firstSeen: null,
          lastSeen: null,
          firstPaidDate: null,
          paidCount: 0,
          overdueCount: 0,
          collectionsCount: 0,
          status: 'active',
          latestStatusDate: null
        });
      }
      const b = buckets.get(lender.key);
      b.emailCount += 1;
      if (emiAmount && (!b.emiAmount || emiAmount > b.emiAmount)) b.emiAmount = emiAmount;
      if (when) {
        if (!b.firstSeen || when < b.firstSeen) b.firstSeen = when;
        if (!b.lastSeen || when > b.lastSeen) b.lastSeen = when;
      }
      if (status === 'paid') {
        b.paidCount += 1;
        if (when && (!b.firstPaidDate || when < b.firstPaidDate)) b.firstPaidDate = when;
      } else if (status === 'overdue') {
        b.overdueCount += 1;
      } else if (status === 'collections') {
        b.collectionsCount += 1;
      }
      // Track the most recent meaningful status (collections > overdue > paid).
      if (when && (!b.latestStatusDate || when >= b.latestStatusDate)) {
        b.latestStatusDate = when;
      }
    }

    // Derive a final status per lender from its signal history.
    const lenders = Array.from(buckets.values()).map((b) => {
      let finalStatus = 'active';
      if (b.collectionsCount > 0) finalStatus = 'collections';
      else if (b.overdueCount > 0) finalStatus = 'overdue';
      else if (b.paidCount > 0) finalStatus = 'repaying';
      b.status = finalStatus;
      b.firstEmiDate = b.firstPaidDate || b.firstSeen;
      return b;
    });

    // Sort worst-first so the UI leads with the danger.
    const rank = { collections: 0, overdue: 1, repaying: 2, active: 3 };
    lenders.sort((a, b) => (rank[a.status] - rank[b.status]) || ((b.emiAmount || 0) - (a.emiAmount || 0)));

    const totalMonthlyEmi = lenders.reduce((s, l) => s + (l.emiAmount || 0), 0);
    const overdueLenders = lenders.filter((l) => l.status === 'overdue' || l.status === 'collections');

    return {
      generatedAt: new Date(),
      scannedEmails: emails.length,
      lenderCount: lenders.length,
      overdueCount: overdueLenders.length,
      totalMonthlyEmi,
      lenders
    };
  }

  /**
   * Compute a debt-spiral verdict from the loan analysis + the user's income.
   */
  async computeSpiral(userId) {
    const analysis = await this.analyzeLoans(userId);

    let monthlyIncome = 0;
    try {
      const profile = await FinancialProfile.findOne({ userId }).lean();
      monthlyIncome =
        profile?.monthlyIncome ||
        profile?.income?.monthly ||
        profile?.incomeDetails?.monthlyIncome ||
        0;
    } catch (err) {
      logger.warn(`Spiral: could not read income for ${userId}: ${err.message}`);
    }

    const { totalMonthlyEmi, overdueCount, lenderCount } = analysis;
    const emiToIncome = monthlyIncome > 0 ? totalMonthlyEmi / monthlyIncome : null;

    // Verdict logic — leads with the most serious condition.
    let verdict = 'healthy';
    let score = 0; // 0 (safe) .. 100 (severe spiral)
    const reasons = [];

    if (overdueCount >= 3) {
      reasons.push(`${overdueCount} loans are overdue or in collections`);
      score += 45;
    } else if (overdueCount > 0) {
      reasons.push(`${overdueCount} loan(s) overdue`);
      score += 25;
    }
    if (emiToIncome !== null) {
      if (emiToIncome >= 1) {
        reasons.push('loan EMIs alone meet or exceed your income');
        score += 45;
      } else if (emiToIncome >= 0.5) {
        reasons.push('over half your income goes to loan EMIs');
        score += 25;
      } else if (emiToIncome >= 0.35) {
        reasons.push('a large share of income goes to loan EMIs');
        score += 12;
      }
    }
    if (lenderCount >= 5) {
      reasons.push(`borrowing is spread across ${lenderCount} app/NBFC lenders`);
      score += 15;
    } else if (lenderCount >= 3) {
      score += 8;
    }

    score = Math.min(100, score);
    if (score >= 70) verdict = 'severe';
    else if (score >= 45) verdict = 'high';
    else if (score >= 20) verdict = 'watch';

    // The signature borrow-to-repay red flag: many lenders + overdue despite income.
    const borrowToRepayRisk =
      lenderCount >= 3 && (overdueCount >= 2 || (emiToIncome !== null && emiToIncome >= 0.6));

    return {
      generatedAt: analysis.generatedAt,
      verdict,
      score,
      reasons,
      borrowToRepayRisk,
      monthlyIncome,
      totalMonthlyEmi,
      emiToIncome,
      overdueCount,
      lenderCount,
      lenders: analysis.lenders,
      scannedEmails: analysis.scannedEmails
    };
  }
}

module.exports = LoanAppIntelligenceService;
