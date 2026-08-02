# Legacy Guard — dormancy detection, welfare outreach & estate settlement

Legacy Guard watches for accounts that have gone quiet, escalates them through a
human welfare check, and — only when death is independently verified and approved by two
different people — helps the nominee recover what the account holder left behind.

The platform charges **1% of what is actually recovered**. Nothing is charged on
amounts that are discovered but never recovered.

---

## Why this exists

A dormant account is ambiguous. The holder may have simply lost interest, changed their
number, been hospitalised, or died. Each possibility needs a different response, and
getting it wrong is expensive in opposite directions:

- Treat a living user as dead → account frozen, family alarmed, trust destroyed.
- Treat a dead user as merely inactive → insurance lapses unclaimed, money lent to
  friends is never recovered, the family never learns those assets existed.

Legacy Guard is deliberately biased toward the first error being **loud, rare and
reversible**, and the second being **caught by a human before any money moves**.

---

## Lifecycle

```
ACTIVE ──inactivity──▶ WATCH ──▶ DORMANT ──▶ UNREACHABLE ──▶ WELFARE_CHECK
                                                                   │
                        ┌──────────────────────────────────────────┤
                        ▼                                          ▼
                  USER RESPONDS                            DEATH REPORTED
              (ladder resets to ACTIVE,                            │
               account unfrozen)                     ┌─────────────┴────────────┐
                                                     ▼                          ▼
                                            VERIFICATION_PENDING          FALSE_ALARM
                                       (certificate + dual approval)    (revoked, audited)
                                                     │
                                                     ▼
                                              ESTATE CASE OPEN
                                                     │
                                    ┌────────────────┼────────────────┐
                                    ▼                ▼                ▼
                            ASSET DISCOVERY   NOMINEE VERIFY    LIABILITY TALLY
                                    │                │                │
                                    └────────────────┼────────────────┘
                                                     ▼
                                          RECOVERY CLAIMS (per asset)
                                                     │
                                                     ▼
                                    SETTLEMENT — 1% success fee on RECOVERED only
                                                     │
                                                     ▼
                                              DISBURSE → CLOSE
```

Default thresholds (configurable per `DormancyPolicy` version):

| Stage | Inactive days | What happens |
|---|---|---|
| `watch` | 60 | Passive. Gentle in-app + email nudge. |
| `dormant` | 120 | Enters the support queue. Multi-channel outreach begins. |
| `unreachable` | 180 | Account frozen (read-only). Nominees may be contacted. |
| `welfare_check` | 240 | Phone welfare call. Escalation to estate case permitted. |

---

## Safety design

These are the constraints that make the module safe to operate. They are enforced in
code, not just documented.

### 1. Death is never inferred automatically
No scheduled job, heuristic or model can mark someone deceased. A support agent must
explicitly *propose* it, and a **different** person holding `estate_officer`,
`compliance` or `admin` must *approve* it.

Enforced in three independent places:
- `EstateCase` schema validator rejects `approval.approvedBy === approval.proposedBy`
- `estateCaseService.approveDeceased()` re-checks actor identity and role
- `requireDifferentActor` middleware returns 409 before the handler is reached

### 2. Every deceased marking is reversible
`estateCaseService.revoke()` fully reverses the marking with a mandatory reason and a
complete audit entry. False positives are an expected operating condition, not an
exception.

### 3. A login is the strongest possible proof of life
If someone logs into an account with an open dormancy or estate case, that outranks
every other signal. The ladder resets immediately, the account unfreezes, and the case
closes as `closed_alive`. Contact outcomes in `PROOF_OF_LIFE_OUTCOMES` do the same.

### 4. Nothing is ever deleted
Dormancy freezes an account into a read-only state. No financial record is purged by
this module at any stage.

### 5. The fee is a success fee
`SettlementFee.computeFor()` derives its basis solely from assets in
`RECOVERED_ASSET_STATUSES`. Discovered-but-unrecovered value can never enter the
calculation, so the platform is never paid for work that produced nothing.

### 6. The audit trail cannot be rewritten
`EstateAuditEvent` is append-only — update and delete paths throw at the Mongoose
middleware layer. Each event is hash-chained to its predecessor, so
`verifyChain(estateCaseId)` will detect any tampering and report the exact sequence
number where the chain breaks.

---

## Nominee is not the same as legal heir

Under Indian succession law a nominee is a **trustee who receives** the money, not
necessarily the person **entitled to keep** it. A nominee may be legally obliged to hand
the proceeds to the legal heirs.

The module therefore tracks `isLegalHeir` separately from nominee status and raises
`EstateCase.disputeFlag` when they diverge. The UI states this distinction in plain
language wherever a nominee is shown. Legacy Guard surfaces the difference; it does not
attempt to adjudicate it.

---

## Why `AccountActivityIndex` exists

`ActivityLog` carries a **90-day TTL index** (`models/ActivityLog.js`) and deletes itself.
Dormancy thresholds run to 240 days, so activity history has already been destroyed by
the time it is needed.

`AccountActivityIndex` is a small, durable, one-row-per-user rollup updated cheaply on
each authenticated request. It is the only reliable source for inactivity duration and
should never be given a TTL.

---

## Architecture

```
backend/
  constants/legacyConstants.js       all enums, transition maps, playbooks, helpers
  models/                            11 schemas (see below)
  services/legacy/                   12 services
  routes/                            7 route files
  middleware/supportAuth.js          role gates + maker-checker guard + PII access audit
frontend/src/
  pages/legacy/                      10 pages
  services/legacyService.js          grouped API wrappers
```

### Models

| Model | Role |
|---|---|
| `AccountActivityIndex` | Durable per-user last-seen rollup; survives ActivityLog TTL |
| `DormancyPolicy` | Versioned thresholds, outreach rules, fee config |
| `Nominee` | Nominees with share %, KYC, guardian for minors, legal-heir flag |
| `DormancyCase` | Dormancy lifecycle, outreach counters, SLA, timeline |
| `SupportInteraction` | Every outreach attempt, channel and outcome |
| `EstateCase` | Master estate case: verification, maker-checker approval, totals |
| `EstateAsset` | One discovered asset or liability, with recovered value |
| `RecoveryClaim` | Per-asset claim workstream with a validated state machine |
| `SettlementFee` | Success-fee ledger, invoice, payments, waivers |
| `EstateDocument` | Death certificate, heir certificate, KYC, indemnity |
| `EstateAuditEvent` | Append-only, hash-chained audit trail |

### Asset discovery

`assetDiscoveryService` walks `DISCOVERY_SOURCE_MAP` in the constants file, so adding a
new financial product to the platform needs only a new row there.

Recovered as **assets**: `InsurancePolicy`, `LoanGiven`, `Investment`, `Portfolio`,
`BankAccount`, `RealEstate`, `RetirementPlan`, `FinancialGoal`.

Tallied as **liabilities**: `EMI`, `PersonalLoan`, `CreditCardBill`, `Debt`, `LenderLoan`.

Discovery is idempotent — it upserts on `(estateCaseId, sourceModel, sourceId)`, so it
can be re-run safely as new products are added to the deceased's profile.

`LoanGiven` is marked `recoverability: 'low'` on purpose. Informal loans to friends and
family rarely have enforceable documentation, and setting family expectations honestly
at the start matters more than an optimistic estimate.

---

## Fee calculation

```
basis      = Σ recoveredValueInINR  (assets in RECOVERED_ASSET_STATUSES only)
grossFee   = basis × feePercentage (default 1%)
grossFee   = clamp(grossFee, minFeeInINR, maxFeeInINR)   // when configured
gst        = grossFee × gstPercentage (default 18%)
total      = grossFee + gst
```

Idempotent and safe to recompute at any point. Every line item traces back to the
specific `EstateAsset` that produced it, so the family can see exactly what they are
being charged for.

---

## Roles

| Role | Capability |
|---|---|
| `user` | Manage own nominees |
| `support` | Dormancy queue, outreach logging, **propose** deceased |
| `estate_officer` | Everything above, plus **approve** deceased, run claims, settle |
| `compliance` | Approve, revoke, waive fees, verify audit integrity |
| `admin` | Full access including policy versioning |

`support` deliberately cannot approve a death marking it proposed — that is the whole
point of the separation.

---

## Nominee portal access

Nominees do not have platform accounts. `EstateCase` issues a single-purpose JWT
(`purpose: 'nominee_portal'`, 14-day expiry) delivered to the verified nominee.

`nomineePortalRoutes` verifies **only** that token and rejects any token whose `purpose`
claim is not exactly `nominee_portal`, which prevents an ordinary user session token
being replayed against the portal.

---

## Scheduled jobs

Started explicitly from `server.js` via `legacyScheduler.start()`; nothing auto-starts on
require.

| Job | Cadence | Work |
|---|---|---|
| Dormancy scan | Daily | Reclassify stages, open cases on escalation |
| Escalation ladder | Hourly | Due outreach, cooldowns, auto-escalation |
| SLA sweep | Daily | Flag breached cases and claims |

Implemented with `setInterval`, matching `backupScheduler.js` and `gmailAutoSync.js`.
`node-cron` is not a dependency of this project.

---

## Operating notes

- **Watch the false-alarm rate.** It is surfaced in `LegacyAnalytics`. A rising rate
  means thresholds are too aggressive or contact data is stale — tune the policy rather
  than pushing more cases through.
- **Freeze is not punishment.** A frozen account must still be trivially recoverable by
  its owner. If freeze-related support contacts rise, the ladder is too fast.
- **Never let the fee drive escalation.** Estate cases are opened on evidence of death,
  never on the size of the estate. Case assignment should stay blind to estate value.
