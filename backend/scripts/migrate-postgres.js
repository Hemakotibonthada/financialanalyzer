#!/usr/bin/env node
/**
 * Applies the Neon Postgres schema and prints what is in the database.
 *
 * Idempotent - safe to run on every deploy. Exits non-zero if DATABASE_URL is
 * set but unreachable, so a deploy fails loudly on a bad connection string;
 * exits zero when Postgres is simply not configured, because it is optional.
 *
 *   npm run db:migrate
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pg = require('../db/postgres');

(async () => {
  if (!pg.isConfigured()) {
    console.log('DATABASE_URL is not set - skipping Postgres migration.');
    console.log('The app will run with MongoDB only; Postgres-backed features stay disabled.');
    process.exit(0);
  }

  console.log('Applying Neon Postgres schema...');
  const ok = await pg.init();
  if (!ok) {
    console.error('Schema init failed:', pg.disabledReason);
    process.exit(1);
  }

  const health = await pg.health();
  if (!health.connected) {
    console.error('Could not reach Postgres:', health.reason);
    process.exit(1);
  }

  const tables = await pg.query(`
    SELECT c.relname                                     AS table_name,
           COALESCE(s.n_live_tup, 0)                     AS approx_rows,
           pg_size_pretty(pg_total_relation_size(c.oid)) AS size
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname
  `);

  console.log('\nSchema ready. Tables:');
  for (const row of tables.rows) {
    console.log(`  ${row.table_name.padEnd(22)} ~${String(row.approx_rows).padStart(8)} rows  ${row.size}`);
  }

  await pg.close();
  console.log('\nDone.');
  process.exit(0);
})().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
