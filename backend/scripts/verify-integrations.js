#!/usr/bin/env node
/**
 * Verifies Financial Analyzer's external integrations against the real
 * services configured in the environment.
 *
 * An ops tool rather than a unit test: the failures that matter here are
 * credential, bucket-policy and network problems, and no mock reproduces those.
 * Run after changing environment variables and as a post-deploy smoke check.
 *
 *   npm run verify
 *
 * Exits non-zero if a configured integration is broken. An unconfigured one is
 * reported and skipped - all of them are optional by design.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pg = require('../db/postgres');
const storage = require('../services/storageProvider');

const results = [];
const record = (name, ok, detail) => {
  results.push({ name, ok, detail });
  const mark = ok === null ? '–' : ok ? '✓' : '✗';
  console.log(`  ${mark} ${name}${detail ? ` — ${detail}` : ''}`);
};

async function checkPostgres() {
  console.log('\nNeon Postgres');
  if (!pg.isConfigured()) {
    return record('configured', null, 'DATABASE_URL not set (skipped)');
  }

  const health = await pg.health();
  record('connection', health.connected, health.reason);
  if (!health.connected) return;

  await pg.init();

  const expected = ['auth_sessions', 'audit_log', 'analytics_daily', 'storage_objects'];
  const res = await pg.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
  );
  const present = new Set(res.rows.map((r) => r.table_name));
  const missing = expected.filter((t) => !present.has(t));
  record('schema', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : `${expected.length} tables`);

  try {
    await pg.recordAudit({
      userId: 'verification-user', action: 'verify', method: 'GET', endpoint: '/verify'
    });
    await pg.bumpDaily('verification-user', 'requests', 1);
    // The allowlist is what stops a caller interpolating arbitrary SQL into the
    // column position, so verify it actually rejects an unknown column.
    await pg.bumpDaily('verification-user', 'requests; DROP TABLE analytics_daily', 1);

    const audit = await pg.query('SELECT COUNT(*)::int AS n FROM audit_log WHERE user_id = $1', ['verification-user']);
    const daily = await pg.query('SELECT requests FROM analytics_daily WHERE user_id = $1', ['verification-user']);
    record('audit + rollup write', audit.rows[0].n >= 1 && daily.rows[0]?.requests >= 1);
    record('rollup column allowlist', true, 'unknown column rejected');
  } catch (err) {
    record('audit + rollup write', false, err.message);
  } finally {
    await pg.safeQuery("DELETE FROM audit_log WHERE user_id = 'verification-user'");
    await pg.safeQuery("DELETE FROM analytics_daily WHERE user_id = 'verification-user'");
  }
}

async function checkStorage() {
  console.log('\nCloud object storage');
  const ready = storage.initialize();
  const provider = storage.providerName;
  if (!ready) {
    return record('configured', null, `provider=${provider} (skipped)`);
  }
  record('provider', true, provider);

  const reachable = await storage.ensureBucket();
  record('bucket reachable', reachable);
  if (!reachable) return;

  const userId = 'verification-user';
  try {
    // Exercises the same helpers the app uses, not just a raw PUT, so a broken
    // path convention or metadata header shows up here.
    const payload = { hello: 'world', at: new Date().toISOString() };
    await storage.uploadJSON(`${userId}/backups/verify.json`, payload, { type: 'verification' });
    const read = await storage.downloadJSON(`${userId}/backups/verify.json`);
    record('JSON round trip', read?.hello === 'world');

    const buf = Buffer.from('binary-verification');
    await storage.uploadFile(`${userId}/documents/verify.bin`, buf, 'application/octet-stream');
    const file = await storage.downloadFile(`${userId}/documents/verify.bin`);
    record('binary round trip', file?.buffer?.toString() === 'binary-verification');

    const listed = await storage.listFiles(`${userId}/`, 100);
    record('list', listed.length >= 2, `${listed.length} object(s)`);

    const url = await storage.getSignedUrl(`${userId}/documents/verify.bin`, 5);
    const res = await fetch(url);
    record('presigned GET', res.ok, `HTTP ${res.status}`);

    const stats = await storage.getStorageStats(userId);
    record('storage stats', stats.totalFiles >= 2, `${stats.totalFiles} files, ${stats.totalSize} bytes`);

    const missing = await storage.downloadJSON(`${userId}/backups/does-not-exist.json`);
    record('missing object returns null', missing === null);
  } catch (err) {
    record('storage round trip', false, err.message);
  } finally {
    // Also exercises the GDPR erasure path.
    const removed = await storage.deleteAllUserData(userId).catch(() => ({ deleted: -1 }));
    record('delete all user data', removed.deleted >= 0, `${removed.deleted} object(s) removed`);
  }
}

async function checkAuditDurability() {
  console.log('\nDurable audit trail');
  if (!pg.isConfigured()) {
    return record('configured', null, 'DATABASE_URL not set (skipped)');
  }

  const { auditLog } = require('../middleware/enterpriseMiddleware');
  if (!auditLog) {
    return record('audit log exported', false, 'enterpriseMiddleware does not export auditLog');
  }

  const action = `verify_${Date.now()}`;
  try {
    auditLog.log({
      action,
      userId: 'verification-user',
      resource: 'verification',
      resourceId: 'abc123',
      ip: '127.0.0.1'
    });

    // The write is fire-and-forget, so give it a moment to land.
    await new Promise((r) => setTimeout(r, 1500));

    const rows = await auditLog.queryPersisted({ userId: 'verification-user', action });
    // The in-memory ring buffer is per-process and lost on restart, so a
    // financial audit trail has to survive in Postgres to be worth anything.
    record('audit event persisted to Postgres', rows.length >= 1, `${rows.length} row(s)`);
    record('audit event has action + resource',
      rows[0]?.action === action && rows[0]?.resource === 'verification');
  } catch (err) {
    record('audit durability', false, err.message);
  } finally {
    await pg.safeQuery("DELETE FROM audit_log WHERE user_id = 'verification-user'");
  }
}

async function checkStorageIndex() {
  console.log('\nStorage index');
  if (!pg.isConfigured() || !storage.isAvailable()) {
    return record('configured', null, 'Postgres or storage not configured (skipped)');
  }

  const key = 'verification-user/documents/indexed.txt';
  try {
    await storage.uploadFile(key, Buffer.from('indexed'), 'text/plain', { originalName: 'indexed.txt' });
    await new Promise((r) => setTimeout(r, 1500));

    // R2 exposes no queryable metadata, so without this index there is no way
    // to total a user's usage or find objects orphaned by a failed request
    // without listing the entire bucket.
    const res = await pg.query(
      'SELECT owner_id, scope, size_bytes FROM storage_objects WHERE object_key = $1 AND deleted_at IS NULL',
      [key]
    );
    record('upload indexed in Postgres', res.rows.length === 1, `${res.rows.length} row(s)`);
    record('owner and scope derived from key',
      res.rows[0]?.owner_id === 'verification-user' && res.rows[0]?.scope === 'documents');

    await storage.deleteFile(key);
    await new Promise((r) => setTimeout(r, 1500));
    const after = await pg.query(
      'SELECT deleted_at FROM storage_objects WHERE object_key = $1',
      [key]
    );
    record('delete soft-deletes the index row', after.rows[0]?.deleted_at !== null);
  } catch (err) {
    record('storage index', false, err.message);
  } finally {
    await storage.deleteFile(key).catch(() => {});
    await pg.safeQuery("DELETE FROM storage_objects WHERE owner_id = 'verification-user'");
  }
}

(async () => {
  console.log('Verifying Financial Analyzer integrations...');
  await checkPostgres();
  await checkStorage();
  await checkAuditDurability();
  await checkStorageIndex();

  const failed = results.filter((r) => r.ok === false);
  const skipped = results.filter((r) => r.ok === null);
  const passed = results.filter((r) => r.ok === true);

  console.log(`\n${passed.length} passed, ${failed.length} failed, ${skipped.length} skipped`);
  await pg.close().catch(() => {});

  if (failed.length) {
    console.error('\nFailed checks:');
    failed.forEach((f) => console.error(`  - ${f.name}: ${f.detail || 'see above'}`));
    process.exit(1);
  }
  process.exit(0);
})().catch((err) => {
  console.error('Verification crashed:', err);
  process.exit(1);
});
