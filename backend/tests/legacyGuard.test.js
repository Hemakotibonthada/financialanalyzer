/**
 * Legacy Guard - safety-critical regression tests.
 *
 * This module decides whether a person is treated as deceased and how much
 * money is charged to their family. The properties asserted here are the ones
 * that must never silently regress:
 *
 *   1. One person can never both propose and approve a death marking.
 *   2. A deceased marking is always reversible.
 *   3. The audit trail cannot be rewritten and tampering is detectable.
 *   4. The fee is charged only on money actually recovered.
 *   5. Claims cannot skip states.
 *   6. Proof of life immediately outranks every dormancy signal.
 *
 * Runs against an in-memory MongoDB provided by tests/setup.js.
 */

const mongoose = require('mongoose');

const EstateCase = require('../models/EstateCase');
const EstateAsset = require('../models/EstateAsset');
const EstateAuditEvent = require('../models/EstateAuditEvent');
const SettlementFee = require('../models/SettlementFee');
const Nominee = require('../models/Nominee');
const RecoveryClaim = require('../models/RecoveryClaim');
const DormancyPolicy = require('../models/DormancyPolicy');

const {
  stageForInactiveDays,
  isStageEscalation,
  isValidEstateTransition,
  isValidClaimTransition,
  roundMoney,
  maskValue,
  daysBetween,
  PROOF_OF_LIFE_OUTCOMES,
  RECOVERED_ASSET_STATUSES,
  APPROVER_ROLES,
  DEFAULT_THRESHOLDS
} = require('../constants/legacyConstants');

const oid = () => new mongoose.Types.ObjectId();

/** Minimal valid estate case for tests that only care about approval fields. */
const buildEstateCase = async (overrides = {}) => {
  const userId = overrides.userId || oid();
  return EstateCase.create({
    caseNumber: overrides.caseNumber || `EST-209901-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
    userId,
    status: 'initiated',
    ...overrides
  });
};

describe('Legacy Guard - maker-checker on death marking', () => {
  it('rejects an approval by the same person who proposed it', async () => {
    const actor = oid();
    const estateCase = await buildEstateCase();

    estateCase.approval.proposedBy = actor;
    estateCase.approval.proposedAt = new Date();
    estateCase.approval.approvedBy = actor;
    estateCase.approval.approverRole = 'estate_officer';

    const validationError = estateCase.validateSync();

    expect(validationError).toBeDefined();
    expect(JSON.stringify(validationError.errors)).toMatch(/maker-checker/i);
  });

  it('accepts an approval by a different person', async () => {
    const proposer = oid();
    const approver = oid();
    const estateCase = await buildEstateCase();

    estateCase.approval.proposedBy = proposer;
    estateCase.approval.proposedAt = new Date();
    estateCase.approval.approvedBy = approver;
    estateCase.approval.approverRole = 'estate_officer';
    estateCase.approval.decision = 'approved';

    expect(estateCase.validateSync()).toBeUndefined();
    await expect(estateCase.save()).resolves.toBeDefined();
  });

  it('does not allow plain support staff to be an approver role', () => {
    // 'support' may propose but must never appear as an approver.
    expect(APPROVER_ROLES).not.toContain('support');
    expect(APPROVER_ROLES).toEqual(expect.arrayContaining(['estate_officer', 'compliance', 'admin']));
  });
});

describe('Legacy Guard - audit trail integrity', () => {
  /** record() requires the subject user in addition to the acting agent. */
  const appendEvent = (estateCaseId, action, after, actorRole = 'support') =>
    EstateAuditEvent.record({
      estateCaseId,
      userId: oid(),
      actorId: oid(),
      actorRole,
      action,
      entityType: 'EstateCase',
      after
    });

  it('chains hashes across appended events', async () => {
    const estateCaseId = oid();

    await appendEvent(estateCaseId, 'estate_case.initiated', { status: 'initiated' });
    await appendEvent(estateCaseId, 'estate_case.approved', { status: 'verified' }, 'estate_officer');

    const events = await EstateAuditEvent.find({ estateCaseId }).sort({ sequence: 1 }).lean();

    expect(events).toHaveLength(2);
    expect(events[0].previousHash).toBe('GENESIS');
    expect(events[1].previousHash).toBe(events[0].hash);

    const result = await EstateAuditEvent.verifyChain(estateCaseId);
    expect(result.valid).toBe(true);
    expect(result.totalEvents).toBe(2);
  });

  it('refuses to update an existing audit event', async () => {
    const estateCaseId = oid();
    await appendEvent(estateCaseId, 'estate_case.initiated', { status: 'initiated' }, 'admin');

    await expect(
      EstateAuditEvent.updateOne({ estateCaseId }, { $set: { action: 'tampered' } })
    ).rejects.toThrow(/append-only/i);
  });

  it('refuses to delete an audit event', async () => {
    const estateCaseId = oid();
    await appendEvent(estateCaseId, 'estate_case.initiated', { status: 'initiated' }, 'admin');

    await expect(EstateAuditEvent.deleteOne({ estateCaseId })).rejects.toThrow(/append-only/i);
  });

  it('detects tampering that bypasses mongoose', async () => {
    const estateCaseId = oid();
    await appendEvent(estateCaseId, 'estate_case.initiated', { status: 'initiated' });
    const second = await appendEvent(
      estateCaseId,
      'estate_case.approved',
      { status: 'verified' },
      'estate_officer'
    );

    // Write straight through the driver, sidestepping the append-only hooks,
    // to simulate an attacker with direct database access.
    await mongoose.connection.collection('estateauditevents').updateOne(
      { _id: second._id },
      { $set: { action: 'estate_case.rejected' } }
    );

    const result = await EstateAuditEvent.verifyChain(estateCaseId);
    expect(result.valid).toBe(false);
    expect(result.brokenAtSequence).toBe(2);
  });

  it('audits an action that has no estate case at all', async () => {
    // Regression guard: a user edits their nominees long before anyone dies, so
    // estateCaseId is genuinely absent and actorRole is the ordinary 'user'.
    // Requiring either of those broke every nominee write with a 500.
    const userId = oid();

    const event = await EstateAuditEvent.record({
      userId,
      actorId: userId,
      actorRole: 'user',
      action: 'nominee_created',
      entityType: 'Nominee',
      entityId: oid(),
      after: { fullName: 'Test Nominee' }
    });

    expect(event.sequence).toBe(1);
    expect(event.previousHash).toBe('GENESIS');
    expect(event.chainKey).toBe(String(userId));
    expect(event.estateCaseId).toBeUndefined();
  });

  it('chains user-scoped events independently of estate chains', async () => {
    const userA = oid();
    const userB = oid();

    const mk = (userId, action) => EstateAuditEvent.record({
      userId,
      actorId: userId,
      actorRole: 'user',
      action,
      entityType: 'Nominee',
      after: { action }
    });

    await mk(userA, 'nominee_created');
    await mk(userA, 'nominee_updated');
    await mk(userB, 'nominee_created');

    const a = await EstateAuditEvent.verifyChain(userA);
    const b = await EstateAuditEvent.verifyChain(userB);

    expect(a.valid).toBe(true);
    expect(a.totalEvents).toBe(2);
    // userB's chain must restart at its own genesis, not continue userA's.
    expect(b.valid).toBe(true);
    expect(b.totalEvents).toBe(1);
  });

  it('refuses an event with no scope to chain against', async () => {
    await expect(
      EstateAuditEvent.record({
        actorId: oid(),
        actorRole: 'support',
        action: 'orphan_event',
        entityType: 'Nothing',
        after: {}
      })
    ).rejects.toThrow(/estateCaseId, dormancyCaseId or userId/i);
  });
});

describe('Legacy Guard - success fee', () => {
  const seedPolicy = () => DormancyPolicy.create({
    name: 'test-policy',
    version: 1,
    isActive: true,
    createdBy: oid(),
    thresholds: DEFAULT_THRESHOLDS,
    fee: {
      percentage: 1,
      minFeeInINR: 0,
      maxFeeInINR: null,
      gstPercentage: 18,
      chargeOn: 'recovered_only'
    }
  });

  const seedAsset = (estateCaseId, userId, overrides) => EstateAsset.create({
    estateCaseId,
    userId,
    kind: 'asset',
    category: 'insurance',
    sourceModel: 'InsurancePolicy',
    sourceId: oid(),
    title: 'Test policy',
    estimatedValueInINR: 1000000,
    recoveredValueInINR: 0,
    status: 'discovered',
    ...overrides
  });

  it('charges only on recovered amounts, never on discovered value', async () => {
    await seedPolicy();
    const estateCaseId = oid();
    const userId = oid();

    // Recovered in full.
    await seedAsset(estateCaseId, userId, {
      estimatedValueInINR: 1000000,
      recoveredValueInINR: 1000000,
      status: 'recovered'
    });
    // Discovered but never recovered - must not enter the fee basis at all.
    await seedAsset(estateCaseId, userId, {
      estimatedValueInINR: 5000000,
      recoveredValueInINR: 0,
      status: 'unrecoverable'
    });

    const computed = await SettlementFee.computeFor(estateCaseId);

    // Basis is 1,000,000 - not 6,000,000.
    expect(computed.basisAmountInINR).toBe(1000000);
    expect(computed.grossFeeInINR).toBe(10000);
  });

  it('includes partially recovered assets in the basis', async () => {
    await seedPolicy();
    const estateCaseId = oid();
    const userId = oid();

    await seedAsset(estateCaseId, userId, {
      estimatedValueInINR: 800000,
      recoveredValueInINR: 250000,
      status: 'partially_recovered'
    });

    const computed = await SettlementFee.computeFor(estateCaseId);
    expect(computed.basisAmountInINR).toBe(250000);
    expect(computed.grossFeeInINR).toBe(2500);
  });

  it('produces a zero fee when nothing was recovered', async () => {
    await seedPolicy();
    const estateCaseId = oid();
    const userId = oid();

    await seedAsset(estateCaseId, userId, { recoveredValueInINR: 0, status: 'unrecoverable' });

    const computed = await SettlementFee.computeFor(estateCaseId);
    expect(computed.basisAmountInINR).toBe(0);
    expect(computed.grossFeeInINR).toBe(0);
  });

  it('only treats recovered statuses as chargeable', () => {
    expect(RECOVERED_ASSET_STATUSES).toEqual(['recovered', 'partially_recovered']);
    expect(RECOVERED_ASSET_STATUSES).not.toContain('discovered');
    expect(RECOVERED_ASSET_STATUSES).not.toContain('unrecoverable');
  });
});

describe('Legacy Guard - nominee share validation', () => {
  const seedNominee = (userId, overrides) => Nominee.create({
    userId,
    fullName: 'Test Nominee',
    relationship: 'spouse',
    sharePercentage: 50,
    status: 'verified',
    ...overrides
  });

  it('flags share totals that do not add up to 100', async () => {
    const userId = oid();
    await seedNominee(userId, { sharePercentage: 40 });
    await seedNominee(userId, { sharePercentage: 30, relationship: 'son' });

    const result = await Nominee.validateShares(userId);
    expect(result.valid).toBe(false);
    expect(result.total).toBe(70);
  });

  it('accepts share totals of exactly 100', async () => {
    const userId = oid();
    await seedNominee(userId, { sharePercentage: 60 });
    await seedNominee(userId, { sharePercentage: 40, relationship: 'daughter' });

    const result = await Nominee.validateShares(userId);
    expect(result.valid).toBe(true);
    expect(result.total).toBe(100);
  });
});

describe('Legacy Guard - claim state machine', () => {
  it('permits only legal forward transitions', () => {
    expect(isValidClaimTransition('draft', 'submitted')).toBe(true);
    expect(isValidClaimTransition('approved', 'settled')).toBe(true);
    expect(isValidClaimTransition('rejected', 'appealed')).toBe(true);
  });

  it('blocks skipping straight from draft to settled', () => {
    expect(isValidClaimTransition('draft', 'settled')).toBe(false);
    expect(isValidClaimTransition('draft', 'approved')).toBe(false);
  });

  it('treats settled and withdrawn as terminal', () => {
    expect(isValidClaimTransition('settled', 'under_review')).toBe(false);
    expect(isValidClaimTransition('withdrawn', 'submitted')).toBe(false);
  });

  it('throws on an illegal transition at the model level', async () => {
    const claim = await RecoveryClaim.create({
      claimNumber: `CLM-209901-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
      estateCaseId: oid(),
      estateAssetId: oid(),
      userId: oid(),
      claimType: 'insurance_death_claim',
      status: 'draft',
      claimedAmountInINR: 100000
    });

    // transitionTo validates synchronously and throws before any await.
    expect(() => claim.transitionTo('settled', oid(), 'skipping ahead')).toThrow(/illegal/i);
  });
});

describe('Legacy Guard - estate state machine', () => {
  it('requires verification before asset discovery', () => {
    expect(isValidEstateTransition('initiated', 'asset_discovery')).toBe(false);
    expect(isValidEstateTransition('verification_pending', 'verified')).toBe(true);
    expect(isValidEstateTransition('verified', 'asset_discovery')).toBe(true);
  });

  it('allows revocation from every pre-disbursement state', () => {
    ['initiated', 'verification_pending', 'verified', 'asset_discovery', 'claims_in_progress', 'settlement_pending']
      .forEach((state) => {
        expect(isValidEstateTransition(state, 'revoked')).toBe(true);
      });
  });

  it('treats closed as terminal', () => {
    expect(isValidEstateTransition('closed', 'asset_discovery')).toBe(false);
  });
});

describe('Legacy Guard - dormancy classification', () => {
  it('maps inactive days onto the correct stage', () => {
    expect(stageForInactiveDays(10)).toBe('active');
    expect(stageForInactiveDays(60)).toBe('watch');
    expect(stageForInactiveDays(120)).toBe('dormant');
    expect(stageForInactiveDays(180)).toBe('unreachable');
    expect(stageForInactiveDays(240)).toBe('welfare_check');
    expect(stageForInactiveDays(9999)).toBe('welfare_check');
  });

  it('treats stage boundaries as inclusive', () => {
    expect(stageForInactiveDays(59)).toBe('active');
    expect(stageForInactiveDays(119)).toBe('watch');
    expect(stageForInactiveDays(179)).toBe('dormant');
    expect(stageForInactiveDays(239)).toBe('unreachable');
  });

  it('recognises escalation but not de-escalation', () => {
    expect(isStageEscalation('active', 'watch')).toBe(true);
    expect(isStageEscalation('dormant', 'unreachable')).toBe(true);
    expect(isStageEscalation('unreachable', 'watch')).toBe(false);
    expect(isStageEscalation('watch', 'watch')).toBe(false);
  });

  it('resets a resolved-alive account to the bottom of the ladder', () => {
    // resolved_alive must rank equal to active so a revived account is never
    // treated as still escalating.
    expect(isStageEscalation('resolved_alive', 'watch')).toBe(true);
    expect(isStageEscalation('welfare_check', 'resolved_alive')).toBe(false);
  });
});

describe('Legacy Guard - proof of life', () => {
  it('classifies reaching the user as proof of life', () => {
    expect(PROOF_OF_LIFE_OUTCOMES).toContain('reached_user');
    expect(PROOF_OF_LIFE_OUTCOMES).toContain('confirmed_alive');
  });

  it('does not treat reaching a family member as proof of life', () => {
    // Speaking to a relative is not evidence the account holder is alive.
    expect(PROOF_OF_LIFE_OUTCOMES).not.toContain('reached_family');
    expect(PROOF_OF_LIFE_OUTCOMES).not.toContain('no_answer');
  });
});

describe('Legacy Guard - support access controls', () => {
  const { requireRole, requireDifferentActor, logSupportAccess } = require('../middleware/supportAuth');

  const runMiddleware = (mw, req) =>
    new Promise((resolve) => {
      const res = {
        statusCode: 200,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(body) {
          resolve({ status: this.statusCode, body, nextCalled: false });
          return this;
        },
        on() {}
      };
      mw(req, res, () => resolve({ status: null, body: null, nextCalled: true }));
    });

  it('refuses a role outside the allowed set', async () => {
    const result = await runMiddleware(
      requireRole('estate_officer', 'admin'),
      { user: { _id: oid(), role: 'support' } }
    );
    expect(result.nextCalled).toBe(false);
    expect(result.status).toBe(403);
  });

  it('admits an allowed role', async () => {
    const result = await runMiddleware(
      requireRole('estate_officer', 'admin'),
      { user: { _id: oid(), role: 'estate_officer' } }
    );
    expect(result.nextCalled).toBe(true);
  });

  it('blocks the proposer from approving their own case', async () => {
    const actor = oid();
    const result = await runMiddleware(
      requireDifferentActor(async () => actor),
      { user: { _id: actor, role: 'estate_officer' } }
    );
    expect(result.nextCalled).toBe(false);
    expect(result.status).toBe(409);
    expect(JSON.stringify(result.body)).toMatch(/maker-checker/i);
  });

  it('allows a different actor to approve', async () => {
    const result = await runMiddleware(
      requireDifferentActor(async () => oid()),
      { user: { _id: oid(), role: 'estate_officer' } }
    );
    expect(result.nextCalled).toBe(true);
  });

  it('records a PII read even when the route carries only a case id', async () => {
    // Regression guard: EstateAuditEvent.userId is required, and these routes
    // expose only :id. The middleware must resolve the subject from the case,
    // otherwise every PII-access audit is silently dropped.
    const subjectUserId = oid();
    const estateCase = await buildEstateCase({ userId: subjectUserId });
    const actorId = oid();

    const finishHandlers = [];
    const res = {
      statusCode: 200,
      on: (event, handler) => {
        if (event === 'finish') finishHandlers.push(handler);
      }
    };
    const req = {
      user: { _id: actorId, role: 'estate_officer' },
      params: { id: estateCase._id.toString() },
      query: {},
      method: 'GET',
      originalUrl: `/api/legacy/estate/${estateCase._id}`,
      ip: '127.0.0.1',
      get: () => 'jest'
    };

    await new Promise((resolve) => logSupportAccess('EstateCase')(req, res, resolve));
    await Promise.all(finishHandlers.map((h) => h()));

    const events = await EstateAuditEvent.find({
      estateCaseId: estateCase._id,
      action: 'support_pii_read'
    }).lean();

    expect(events).toHaveLength(1);
    expect(String(events[0].userId)).toBe(String(subjectUserId));
    expect(String(events[0].actorId)).toBe(String(actorId));
  });

  it('does not audit a failed request', async () => {
    const estateCase = await buildEstateCase();
    const finishHandlers = [];
    const res = {
      statusCode: 403,
      on: (event, handler) => {
        if (event === 'finish') finishHandlers.push(handler);
      }
    };
    const req = {
      user: { _id: oid(), role: 'support' },
      params: { id: estateCase._id.toString() },
      query: {},
      method: 'GET',
      originalUrl: `/api/legacy/estate/${estateCase._id}`,
      ip: '127.0.0.1',
      get: () => 'jest'
    };

    await new Promise((resolve) => logSupportAccess('EstateCase')(req, res, resolve));
    await Promise.all(finishHandlers.map((h) => h()));

    const events = await EstateAuditEvent.find({ estateCaseId: estateCase._id }).lean();
    expect(events).toHaveLength(0);
  });
});

describe('Legacy Guard - helpers', () => {
  it('rounds money without floating point drift', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(1234.567)).toBe(1234.57);
    expect(roundMoney('not a number')).toBe(0);
  });

  it('masks PII for logs and list responses', () => {
    expect(maskValue('9876543210')).toBe('******3210');
    // local part 'someone' is 7 chars: first char kept, remaining 6 masked.
    expect(maskValue('someone@example.com')).toBe('s******@example.com');
    expect(maskValue(null)).toBeNull();
  });

  it('never reveals the full value when masking', () => {
    const phone = '9876543210';
    expect(maskValue(phone)).not.toContain('9876');
  });

  it('computes whole days between dates and never goes negative', () => {
    const now = new Date('2026-08-02T00:00:00Z');
    expect(daysBetween(new Date('2026-08-01T00:00:00Z'), now)).toBe(1);
    expect(daysBetween(new Date('2026-09-01T00:00:00Z'), now)).toBe(0);
    expect(daysBetween(null)).toBeNull();
  });
});
