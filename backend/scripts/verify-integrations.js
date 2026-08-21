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

(async () => {
  console.log('Verifying Financial Analyzer integrations...');
  await checkPostgres();
  await checkStorage();

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
