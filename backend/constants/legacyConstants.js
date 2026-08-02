/**
 * Legacy Guard - shared domain constants
 *
 * Dormancy detection, welfare escalation and estate settlement.
 * Every model, service, route and page in the Legacy Guard module imports its
 * enums from here so that a value can never drift between layers.
 *
 * See docs/features/legacy-guard.md for the business flow.
 */

// ---------------------------------------------------------------------------
// Dormancy
// ---------------------------------------------------------------------------

const DORMANCY_STAGE = Object.freeze([
  'active',
  'watch',
  'dormant',
  'unreachable',
  'welfare_check',
  'deceased_suspected',
  'resolved_alive',
  'escalated_estate'
]);

// Ordered severity, used to decide whether a stage change is a promotion or a
// reset. Higher number means further along the escalation ladder.
const DORMANCY_STAGE_ORDER = Object.freeze({
  active: 0,
  watch: 1,
  dormant: 2,
  unreachable: 3,
  welfare_check: 4,
  deceased_suspected: 5,
  escalated_estate: 6,
  resolved_alive: 0
});

const DORMANCY_TRIGGER = Object.freeze([
  'no_login',
  'no_transaction',
  'no_app_activity',
  'bounced_email',
  'failed_contact',
  'manual_flag',
  'third_party_report'
]);

const CASE_STATUS = Object.freeze([
  'open',
  'in_progress',
  'awaiting_user',
  'awaiting_nominee',
  'awaiting_documents',
  'awaiting_approval',
  'on_hold',
  'closed_alive',
  'closed_deceased',
  'closed_false_alarm',
  'cancelled'
]);

const TERMINAL_CASE_STATUSES = Object.freeze([
  'closed_alive',
  'closed_deceased',
  'closed_false_alarm',
  'cancelled'
]);

const CASE_PRIORITY = Object.freeze(['low', 'normal', 'high', 'critical']);

// ---------------------------------------------------------------------------
// Outreach
// ---------------------------------------------------------------------------

const OUTREACH_CHANNEL = Object.freeze([
  'email',
  'sms',
  'phone_call',
  'whatsapp',
  'postal',
  'in_app',
  'nominee_contact',
  'emergency_contact'
]);

const OUTREACH_OUTCOME = Object.freeze([
  'no_answer',
  'reached_user',
  'reached_family',
  'wrong_number',
  'number_invalid',
  'mailbox_full',
  'bounced',
  'callback_requested',
  'refused',
  'confirmed_alive',
  'death_reported',
  'other'
]);

// Outcomes that prove the account holder is alive and must immediately reset
// the whole escalation ladder.
const PROOF_OF_LIFE_OUTCOMES = Object.freeze(['reached_user', 'confirmed_alive']);

// Outcomes indicating the contact channel itself is dead, which is a dormancy
// signal in its own right.
const CHANNEL_FAILURE_OUTCOMES = Object.freeze([
  'wrong_number',
  'number_invalid',
  'mailbox_full',
  'bounced'
]);

// ---------------------------------------------------------------------------
// Estate
// ---------------------------------------------------------------------------

const ESTATE_STATUS = Object.freeze([
  'initiated',
  'verification_pending',
  'verified',
  'asset_discovery',
  'claims_in_progress',
  'settlement_pending',
  'disbursed',
  'closed',
  'rejected',
  'revoked'
]);

// Legal forward transitions. Anything not listed is rejected by
// estateCaseService.transitionTo(), so an estate case can never silently skip
// verification or approval.
const ESTATE_STATUS_TRANSITIONS = Object.freeze({
  initiated: ['verification_pending', 'rejected', 'revoked'],
  verification_pending: ['verified', 'rejected', 'revoked'],
  verified: ['asset_discovery', 'revoked'],
  asset_discovery: ['claims_in_progress', 'settlement_pending', 'revoked'],
  claims_in_progress: ['settlement_pending', 'revoked'],
  settlement_pending: ['disbursed', 'revoked'],
  disbursed: ['closed'],
  closed: [],
  rejected: [],
  revoked: []
});

const VERIFICATION_METHOD = Object.freeze([
  'death_certificate',
  'municipal_record',
  'hospital_record',
  'family_affidavit',
  'legal_heir_certificate',
  'court_order',
  'police_report'
]);

// Verification methods strong enough to stand alone. Anything else requires a
// second corroborating document before approval.
const PRIMARY_VERIFICATION_METHODS = Object.freeze([
  'death_certificate',
  'municipal_record',
  'court_order'
]);

// ---------------------------------------------------------------------------
// Assets and liabilities
// ---------------------------------------------------------------------------

const ASSET_CATEGORY = Object.freeze([
  'insurance',
  'loan_given',
  'investment',
  'bank_deposit',
  'retirement',
  'real_estate',
  'portfolio',
  'receivable',
  'other'
]);

const LIABILITY_CATEGORY = Object.freeze([
  'emi',
  'personal_loan',
  'credit_card',
  'debt',
  'lender_loan',
  'other'
]);

const ALL_CATEGORIES = Object.freeze([
  ...new Set([...ASSET_CATEGORY, ...LIABILITY_CATEGORY])
]);

const ASSET_STATUS = Object.freeze([
  'discovered',
  'verified',
  'claim_initiated',
  'claim_in_progress',
  'recovered',
  'partially_recovered',
  'unrecoverable',
  'disputed',
  'written_off'
]);

// Only these contribute to the fee basis - the fee is a success fee.
const RECOVERED_ASSET_STATUSES = Object.freeze(['recovered', 'partially_recovered']);

const RECOVERABILITY = Object.freeze(['high', 'medium', 'low', 'unknown']);

const DISCOVERY_METHOD = Object.freeze([
  'auto_scan',
  'manual',
  'nominee_reported',
  'document_extract'
]);

/**
 * Maps existing application models onto estate asset/liability categories.
 * assetDiscoveryService walks this table, so adding a new financial product to
 * the platform only requires a new entry here.
 *
 * valueFields are tried in order; the first numeric field present on the
 * document wins. This tolerates the schema drift already present across the
 * codebase (some models carry `...InINR`, some do not).
 */
const DISCOVERY_SOURCE_MAP = Object.freeze([
  { model: 'InsurancePolicy', kind: 'asset', category: 'insurance', valueFields: ['sumAssuredInINR', 'sumAssured', 'coverageAmount'], titleFields: ['policyName', 'policyType', 'provider'], institutionFields: ['provider', 'insurer', 'company'], recoverability: 'high' },
  { model: 'LoanGiven', kind: 'asset', category: 'loan_given', valueFields: ['remainingAmountInINR', 'remainingAmount', 'amountInINR'], titleFields: ['borrowerName', 'purpose'], institutionFields: [], recoverability: 'low' },
  { model: 'Investment', kind: 'asset', category: 'investment', valueFields: ['currentValueInINR', 'currentValue', 'investedAmountInINR', 'amount'], titleFields: ['name', 'investmentType', 'schemeName'], institutionFields: ['platform', 'broker', 'fundHouse'], recoverability: 'high' },
  { model: 'Portfolio', kind: 'asset', category: 'portfolio', valueFields: ['totalValueInINR', 'currentValue', 'totalValue'], titleFields: ['name', 'portfolioName'], institutionFields: ['broker', 'platform'], recoverability: 'high' },
  { model: 'BankAccount', kind: 'asset', category: 'bank_deposit', valueFields: ['balanceInINR', 'currentBalance', 'balance'], titleFields: ['accountName', 'nickname', 'bankName'], institutionFields: ['bankName', 'bank'], recoverability: 'high' },
  { model: 'RealEstate', kind: 'asset', category: 'real_estate', valueFields: ['currentValuationInINR', 'currentValuation', 'currentValue', 'purchasePrice'], titleFields: ['propertyName', 'name', 'address'], institutionFields: [], recoverability: 'medium' },
  { model: 'RetirementPlan', kind: 'asset', category: 'retirement', valueFields: ['currentCorpusInINR', 'currentCorpus', 'accumulatedAmount'], titleFields: ['planName', 'name', 'planType'], institutionFields: ['provider'], recoverability: 'medium' },
  { model: 'FinancialGoal', kind: 'asset', category: 'receivable', valueFields: ['currentAmountInINR', 'currentAmount', 'savedAmount'], titleFields: ['title', 'name', 'goalName'], institutionFields: [], recoverability: 'medium' },

  { model: 'EMI', kind: 'liability', category: 'emi', valueFields: ['outstandingAmountInINR', 'remainingAmount', 'principalAmount'], titleFields: ['merchantName', 'productDescription'], institutionFields: ['bankName', 'merchantName'], recoverability: 'unknown' },
  { model: 'PersonalLoan', kind: 'liability', category: 'personal_loan', valueFields: ['remainingAmountInINR', 'remainingAmount', 'amountInINR'], titleFields: ['lenderName', 'purpose'], institutionFields: ['lenderName'], recoverability: 'unknown' },
  { model: 'CreditCardBill', kind: 'liability', category: 'credit_card', valueFields: ['totalDueInINR', 'totalDue', 'outstandingAmount'], titleFields: ['cardName', 'bankName'], institutionFields: ['bankName'], recoverability: 'unknown' },
  { model: 'Debt', kind: 'liability', category: 'debt', valueFields: ['currentBalanceInINR', 'currentBalance', 'balance'], titleFields: ['name', 'debtType', 'creditorName'], institutionFields: ['creditorName', 'lender'], recoverability: 'unknown' },
  { model: 'LenderLoan', kind: 'liability', category: 'lender_loan', valueFields: ['outstandingAmountInINR', 'outstandingAmount', 'principalAmount'], titleFields: ['loanType', 'purpose'], institutionFields: ['lenderName'], recoverability: 'unknown' }
]);

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

const CLAIM_STATUS = Object.freeze([
  'draft',
  'submitted',
  'acknowledged',
  'under_review',
  'additional_info_required',
  'approved',
  'rejected',
  'settled',
  'appealed',
  'withdrawn'
]);

const CLAIM_STATUS_TRANSITIONS = Object.freeze({
  draft: ['submitted', 'withdrawn'],
  submitted: ['acknowledged', 'rejected', 'withdrawn'],
  acknowledged: ['under_review', 'additional_info_required', 'rejected', 'withdrawn'],
  under_review: ['approved', 'rejected', 'additional_info_required', 'withdrawn'],
  additional_info_required: ['under_review', 'submitted', 'withdrawn'],
  approved: ['settled'],
  rejected: ['appealed', 'withdrawn'],
  appealed: ['under_review', 'rejected'],
  settled: [],
  withdrawn: []
});

const TERMINAL_CLAIM_STATUSES = Object.freeze(['settled', 'withdrawn']);

const CLAIM_TYPE = Object.freeze([
  'insurance_death_claim',
  'loan_recovery',
  'investment_redemption',
  'deposit_closure',
  'epf_claim',
  'ppf_claim',
  'nps_claim',
  'property_transfer',
  'generic_recovery'
]);

// Maps an asset category to the claim type an officer should raise for it.
const CATEGORY_TO_CLAIM_TYPE = Object.freeze({
  insurance: 'insurance_death_claim',
  loan_given: 'loan_recovery',
  investment: 'investment_redemption',
  portfolio: 'investment_redemption',
  bank_deposit: 'deposit_closure',
  retirement: 'epf_claim',
  real_estate: 'property_transfer',
  receivable: 'generic_recovery',
  other: 'generic_recovery'
});

/**
 * Per claim type: the documents an institution typically demands, and a
 * realistic service-level target in days. Drives the checklist UI and the SLA
 * clock rather than acting as hard validation.
 */
const CLAIM_PLAYBOOKS = Object.freeze({
  insurance_death_claim: {
    label: 'Insurance death claim',
    slaDays: 30,
    requiredDocuments: ['death_certificate', 'policy_document', 'nominee_id_proof', 'nominee_address_proof', 'bank_passbook'],
    optionalDocuments: ['legal_heir_certificate', 'affidavit'],
    guidance: 'Submit to the insurer within 90 days of death. Delay beyond that usually needs a written condonation request.'
  },
  loan_recovery: {
    label: 'Recovery of money lent',
    slaDays: 90,
    requiredDocuments: ['death_certificate', 'loan_agreement', 'legal_heir_certificate'],
    optionalDocuments: ['affidavit', 'court_order'],
    guidance: 'Informal loans to friends and family rarely have enforceable paperwork. Attempt amicable recovery first and record every contact.'
  },
  investment_redemption: {
    label: 'Investment redemption / transmission',
    slaDays: 21,
    requiredDocuments: ['death_certificate', 'nominee_id_proof', 'bank_passbook'],
    optionalDocuments: ['succession_certificate', 'indemnity_bond'],
    guidance: 'Transmission to a registered nominee is usually faster than redemption. Check the folio nomination first.'
  },
  deposit_closure: {
    label: 'Bank deposit closure',
    slaDays: 15,
    requiredDocuments: ['death_certificate', 'nominee_id_proof', 'bank_passbook'],
    optionalDocuments: ['indemnity_bond', 'succession_certificate'],
    guidance: 'Accounts with a registered nominee settle without a succession certificate at most banks.'
  },
  epf_claim: {
    label: 'EPF / pension claim',
    slaDays: 45,
    requiredDocuments: ['death_certificate', 'nominee_id_proof', 'bank_passbook'],
    optionalDocuments: ['legal_heir_certificate'],
    guidance: 'Form 20 for provident fund and Form 10D for pension, filed through the last employer where possible.'
  },
  ppf_claim: {
    label: 'PPF claim',
    slaDays: 30,
    requiredDocuments: ['death_certificate', 'nominee_id_proof', 'bank_passbook'],
    optionalDocuments: ['succession_certificate'],
    guidance: 'Form G at the holding bank or post office. The account cannot be continued by the nominee.'
  },
  nps_claim: {
    label: 'NPS withdrawal',
    slaDays: 30,
    requiredDocuments: ['death_certificate', 'nominee_id_proof', 'bank_passbook'],
    optionalDocuments: ['legal_heir_certificate'],
    guidance: 'Raised through the CRA. The nominee may need to purchase an annuity depending on corpus size.'
  },
  property_transfer: {
    label: 'Property transfer',
    slaDays: 180,
    requiredDocuments: ['death_certificate', 'legal_heir_certificate', 'nominee_id_proof'],
    optionalDocuments: ['succession_certificate', 'court_order', 'affidavit'],
    guidance: 'Mutation at the local municipal body. Expect this to be the slowest workstream in the estate.'
  },
  generic_recovery: {
    label: 'General recovery',
    slaDays: 60,
    requiredDocuments: ['death_certificate', 'nominee_id_proof'],
    optionalDocuments: [],
    guidance: 'Use for anything without a standard institutional process.'
  }
});

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

const DOCUMENT_TYPE = Object.freeze([
  'death_certificate',
  'legal_heir_certificate',
  'succession_certificate',
  'nominee_id_proof',
  'nominee_address_proof',
  'bank_passbook',
  'policy_document',
  'loan_agreement',
  'indemnity_bond',
  'affidavit',
  'court_order',
  'photograph',
  'other'
]);

const DOCUMENT_STATUS = Object.freeze([
  'pending',
  'uploaded',
  'under_review',
  'verified',
  'rejected',
  'expired'
]);

// ---------------------------------------------------------------------------
// Fees
// ---------------------------------------------------------------------------

const FEE_STATUS = Object.freeze([
  'pending',
  'invoiced',
  'partially_paid',
  'paid',
  'waived',
  'written_off',
  'refunded'
]);

const DEFAULT_FEE_PERCENTAGE = 1;
const DEFAULT_GST_PERCENTAGE = 18;

// ---------------------------------------------------------------------------
// Nominees and people
// ---------------------------------------------------------------------------

const NOMINEE_STATUS = Object.freeze([
  'pending_verification',
  'verified',
  'rejected',
  'inactive',
  'superseded'
]);

const RELATIONSHIP = Object.freeze([
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
  'other'
]);

// Relationships that commonly qualify as Class I heirs under the Hindu
// Succession Act. Used only to surface a hint in the UI when a nominee is
// unlikely to also be the legal heir - never to make an automated legal
// determination. A nominee is a trustee who receives the money; the legal heir
// is who is ultimately entitled to it, and the two are frequently different.
const LIKELY_CLASS_I_HEIRS = Object.freeze(['spouse', 'son', 'daughter', 'mother']);

const ID_PROOF_TYPE = Object.freeze(['aadhaar', 'pan', 'passport', 'voter_id', 'driving_licence', 'other']);

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

const SUPPORT_ROLES = Object.freeze(['support', 'estate_officer', 'compliance', 'admin']);

// Roles permitted to approve a deceased marking. Deliberately excludes plain
// 'support' so the agent who proposes cannot also approve.
const APPROVER_ROLES = Object.freeze(['estate_officer', 'compliance', 'admin']);

const ALL_USER_ROLES = Object.freeze([
  'user',
  'lender',
  'admin',
  'support',
  'estate_officer',
  'compliance'
]);

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_THRESHOLDS = Object.freeze({
  watchDays: 60,
  dormantDays: 120,
  unreachableDays: 180,
  welfareCheckDays: 240
});

const DEFAULT_OUTREACH = Object.freeze({
  maxAttemptsPerChannel: 3,
  cooldownHours: 48,
  requiredChannelsBeforeEscalation: ['email', 'sms', 'phone_call']
});

const CASE_NUMBER_PREFIX = Object.freeze({
  dormancy: 'DRM',
  estate: 'EST',
  claim: 'CLM',
  invoice: 'INV'
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** True when moving from `from` to `to` is a legal estate-case transition. */
function isValidEstateTransition(from, to) {
  if (from === to) return true;
  const allowed = ESTATE_STATUS_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

/** True when moving from `from` to `to` is a legal claim transition. */
function isValidClaimTransition(from, to) {
  if (from === to) return true;
  const allowed = CLAIM_STATUS_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

/**
 * Mask a phone number, email or identity number for display and logging.
 * PII must never reach the logs in full.
 */
function maskValue(value, visibleTail = 4) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str) return null;

  if (str.includes('@')) {
    const [local, domain] = str.split('@');
    const head = local.slice(0, 1);
    return `${head}${'*'.repeat(Math.max(local.length - 1, 1))}@${domain}`;
  }

  if (str.length <= visibleTail) return '*'.repeat(str.length);
  return `${'*'.repeat(str.length - visibleTail)}${str.slice(-visibleTail)}`;
}

/** Round a money amount to 2 decimal places without floating point drift. */
function roundMoney(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Whole days between two dates, floored, never negative. */
function daysBetween(from, to = new Date()) {
  if (!from) return null;
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.max(0, Math.floor((end - start) / 86400000));
}

/** Stage implied by a raw inactive-day count under the given thresholds. */
function stageForInactiveDays(days, thresholds = DEFAULT_THRESHOLDS) {
  if (days === null || days === undefined) return 'active';
  if (days >= thresholds.welfareCheckDays) return 'welfare_check';
  if (days >= thresholds.unreachableDays) return 'unreachable';
  if (days >= thresholds.dormantDays) return 'dormant';
  if (days >= thresholds.watchDays) return 'watch';
  return 'active';
}

/** True when `next` is further along the ladder than `current`. */
function isStageEscalation(current, next) {
  return (DORMANCY_STAGE_ORDER[next] ?? 0) > (DORMANCY_STAGE_ORDER[current] ?? 0);
}

/** Build a zero-padded sequential reference such as DRM-202608-00042. */
function formatCaseNumber(prefix, sequence, when = new Date()) {
  const d = new Date(when);
  const period = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${prefix}-${period}-${String(sequence).padStart(5, '0')}`;
}

module.exports = {
  DORMANCY_STAGE,
  DORMANCY_STAGE_ORDER,
  DORMANCY_TRIGGER,
  CASE_STATUS,
  TERMINAL_CASE_STATUSES,
  CASE_PRIORITY,
  OUTREACH_CHANNEL,
  OUTREACH_OUTCOME,
  PROOF_OF_LIFE_OUTCOMES,
  CHANNEL_FAILURE_OUTCOMES,
  ESTATE_STATUS,
  ESTATE_STATUS_TRANSITIONS,
  VERIFICATION_METHOD,
  PRIMARY_VERIFICATION_METHODS,
  ASSET_CATEGORY,
  LIABILITY_CATEGORY,
  ALL_CATEGORIES,
  ASSET_STATUS,
  RECOVERED_ASSET_STATUSES,
  RECOVERABILITY,
  DISCOVERY_METHOD,
  DISCOVERY_SOURCE_MAP,
  CLAIM_STATUS,
  CLAIM_STATUS_TRANSITIONS,
  TERMINAL_CLAIM_STATUSES,
  CLAIM_TYPE,
  CATEGORY_TO_CLAIM_TYPE,
  CLAIM_PLAYBOOKS,
  DOCUMENT_TYPE,
  DOCUMENT_STATUS,
  FEE_STATUS,
  DEFAULT_FEE_PERCENTAGE,
  DEFAULT_GST_PERCENTAGE,
  NOMINEE_STATUS,
  RELATIONSHIP,
  LIKELY_CLASS_I_HEIRS,
  ID_PROOF_TYPE,
  SUPPORT_ROLES,
  APPROVER_ROLES,
  ALL_USER_ROLES,
  DEFAULT_THRESHOLDS,
  DEFAULT_OUTREACH,
  CASE_NUMBER_PREFIX,
  isValidEstateTransition,
  isValidClaimTransition,
  maskValue,
  roundMoney,
  daysBetween,
  stageForInactiveDays,
  isStageEscalation,
  formatCaseNumber
};
