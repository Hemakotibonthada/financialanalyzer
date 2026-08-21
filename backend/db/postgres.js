/**
 * Neon Postgres access layer.
 *
 * MongoDB stays the primary store for the financial domain (transactions,
 * accounts, EMIs, documents). Postgres carries the workloads that are
 * relational and append-heavy, where Mongo is the wrong shape:
 *
 *   - auth_sessions    refresh-token / session lifecycle with server-side revocation
 *   - audit_log        append-only security and access trail
 *   - analytics_daily  per-user/day rollups so dashboards do not re-aggregate
 *   - storage_objects  index of everything written to R2, so a backup or
 *                      document is findable without listing the bucket
 *
 * `@neondatabase/serverless` is API-compatible with `pg` and works in both a
 * long-running container and a serverless function, so one module covers both.
 *
 * Postgres is OPTIONAL: with no DATABASE_URL every helper degrades to a no-op
 * rather than failing the request. An audit write must never be the reason a
 * user's action fails.
 */
const { Pool, neonConfig } = require('@neondatabase/serverless');

if (!globalThis.WebSocket) {
  // eslint-disable-next-line global-require
  neonConfig.webSocketConstructor = require('ws');
}

let pool = null;
let initPromise = null;
let disabledReason = null;

function connectionString() {
  return (
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    ''
  ).trim();
}

function isConfigured() {
  return Boolean(connectionString());
}

function getPool() {
  if (pool) return pool;
  const cs = connectionString();
  if (!cs) {
    disabledReason = 'DATABASE_URL is not set';
    return null;
  }
  pool = new Pool({
    connectionString: cs,
    max: Number(process.env.PGPOOL_MAX || 5),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });
  pool.on('error', (err) => console.error('[postgres] idle client error:', err.message));
  return pool;
}

async function query(text, params = []) {
  const p = getPool();
  if (!p) return null;
  return p.query(text, params);
}

/** Fire-and-forget write for telemetry paths; logs failures, never throws. */
async function safeQuery(text, params = []) {
  try {
    return await query(text, params);
  } catch (err) {
    console.error('[postgres] query failed:', err.message);
    return null;
  }
}

async function transaction(fn) {
  const p = getPool();
  if (!p) throw new Error('Postgres is not configured (DATABASE_URL missing)');
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS auth_sessions (
  id                 BIGSERIAL PRIMARY KEY,
  session_id         TEXT        NOT NULL UNIQUE,
  user_id            TEXT        NOT NULL,
  refresh_token_hash TEXT,
  user_agent         TEXT,
  ip_address         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at         TIMESTAMPTZ,
  revoked_at         TIMESTAMPTZ,
  revoked_reason     TEXT
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx   ON auth_sessions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS auth_sessions_active_idx ON auth_sessions (user_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT,
  session_id  TEXT,
  action      TEXT        NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  method      TEXT,
  endpoint    TEXT,
  status_code INTEGER,
  duration_ms INTEGER,
  ip_address  TEXT,
  user_agent  TEXT,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_user_time_idx ON audit_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_time_idx      ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_action_idx    ON audit_log (action, created_at DESC);

CREATE TABLE IF NOT EXISTS analytics_daily (
  user_id            TEXT        NOT NULL,
  day                DATE        NOT NULL,
  requests           INTEGER     NOT NULL DEFAULT 0,
  transactions_added INTEGER     NOT NULL DEFAULT 0,
  documents_uploaded INTEGER     NOT NULL DEFAULT 0,
  reports_generated  INTEGER     NOT NULL DEFAULT 0,
  gmail_syncs        INTEGER     NOT NULL DEFAULT 0,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);
CREATE INDEX IF NOT EXISTS analytics_daily_day_idx ON analytics_daily (day DESC);

CREATE TABLE IF NOT EXISTS storage_objects (
  id            BIGSERIAL PRIMARY KEY,
  provider      TEXT        NOT NULL DEFAULT 'r2',
  bucket        TEXT        NOT NULL,
  object_key    TEXT        NOT NULL,
  owner_id      TEXT,
  scope         TEXT,
  original_name TEXT,
  content_type  TEXT,
  size_bytes    BIGINT      NOT NULL DEFAULT 0,
  checksum      TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ,
  UNIQUE (bucket, object_key)
);
CREATE INDEX IF NOT EXISTS storage_objects_owner_idx ON storage_objects (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS storage_objects_scope_idx ON storage_objects (owner_id, scope) WHERE deleted_at IS NULL;
`;

async function init() {
  if (!isConfigured()) {
    disabledReason = 'DATABASE_URL is not set';
    return false;
  }
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const p = getPool();
    if (!p) return false;
    await p.query(SCHEMA);
    console.log('[postgres] Neon schema ready');
    return true;
  })().catch((err) => {
    console.error('[postgres] schema init failed:', err.message);
    disabledReason = err.message;
    initPromise = null;
    return false;
  });
  return initPromise;
}

async function health() {
  if (!isConfigured()) {
    return { configured: false, connected: false, reason: 'DATABASE_URL is not set' };
  }
  try {
    const res = await query('SELECT 1 AS ok');
    return { configured: true, connected: Boolean(res && res.rows.length) };
  } catch (err) {
    return { configured: true, connected: false, reason: err.message };
  }
}

async function close() {
  if (pool) {
    await pool.end().catch(() => {});
    pool = null;
    initPromise = null;
  }
}

/** Records an object written to cloud storage. Best-effort. */
async function indexStorageObject({ provider, bucket, key, ownerId, scope, originalName, contentType, size, metadata }) {
  await safeQuery(
    `INSERT INTO storage_objects
       (provider, bucket, object_key, owner_id, scope, original_name, content_type, size_bytes, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (bucket, object_key) DO UPDATE
       SET size_bytes = EXCLUDED.size_bytes,
           metadata   = EXCLUDED.metadata,
           deleted_at = NULL`,
    [
      provider || 'r2', bucket, key, ownerId ? String(ownerId) : null, scope || null,
      originalName || null, contentType || null, Number(size) || 0,
      metadata ? JSON.stringify(metadata) : null
    ]
  );
}

/** Appends an audit row. Never awaited on a request path. */
async function recordAudit({ userId, sessionId, action, entityType, entityId, method, endpoint, statusCode, durationMs, ip, userAgent, details }) {
  if (!isConfigured()) return;
  await safeQuery(
    `INSERT INTO audit_log
       (user_id, session_id, action, entity_type, entity_id, method, endpoint,
        status_code, duration_ms, ip_address, user_agent, details)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      userId ? String(userId) : null, sessionId || null, action,
      entityType || null, entityId ? String(entityId) : null,
      method || null, endpoint ? String(endpoint).slice(0, 500) : null,
      statusCode || null, durationMs || null, ip || null,
      userAgent ? String(userAgent).slice(0, 300) : null,
      details ? JSON.stringify(details) : null
    ]
  );
}

/** Increments a counter on today's rollup row. */
async function bumpDaily(userId, column, amount = 1) {
  if (!isConfigured() || !userId) return;
  const allowed = ['requests', 'transactions_added', 'documents_uploaded', 'reports_generated', 'gmail_syncs'];
  // Column is interpolated, so it must come from a fixed allowlist - a
  // parameter cannot stand in for an identifier in Postgres.
  if (!allowed.includes(column)) return;
  await safeQuery(
    `INSERT INTO analytics_daily (user_id, day, ${column})
     VALUES ($1, CURRENT_DATE, $2)
     ON CONFLICT (user_id, day)
     DO UPDATE SET ${column} = analytics_daily.${column} + EXCLUDED.${column}, updated_at = now()`,
    [String(userId), amount]
  );
}

module.exports = {
  query,
  safeQuery,
  transaction,
  init,
  health,
  close,
  isConfigured,
  getPool,
  indexStorageObject,
  recordAudit,
  bumpDaily,
  get disabledReason() { return disabledReason; }
};
