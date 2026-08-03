#!/usr/bin/env node
/**
 * Cloud database setup and verification.
 *
 * Point the application at a hosted MongoDB (MongoDB Atlas or any other
 * MongoDB-compatible host), verify it actually works, and prepare the schema.
 *
 * Usage:
 *   node scripts/setup-cloud-db.js "mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/financial_analyzer"
 *   node scripts/setup-cloud-db.js --verify-only
 *   node scripts/setup-cloud-db.js --uri "<uri>" --no-write
 *
 * What it does:
 *   1. Validates the connection string shape and warns about common mistakes
 *      (missing database name, unescaped password characters, srv vs standard).
 *   2. Connects and reports server version, topology and latency.
 *   3. Writes MONGODB_URI into backend/.env, preserving every other line and
 *      taking a timestamped backup first.
 *   4. Loads every Mongoose model and syncs indexes so the cluster is ready.
 *   5. Prints a summary.
 *
 * The connection string is never printed in full and never written to a log.
 * backend/.env is gitignored, so the credential does not reach version control.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const ENV_PATH = path.join(__dirname, '..', '.env');
const MODELS_DIR = path.join(__dirname, '..', 'models');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

const ok = (msg) => console.log(`${c.green}✓${c.reset} ${msg}`);
const warn = (msg) => console.log(`${c.yellow}!${c.reset} ${msg}`);
const fail = (msg) => console.log(`${c.red}✗${c.reset} ${msg}`);
const info = (msg) => console.log(`${c.cyan}·${c.reset} ${msg}`);

/** Hide credentials so a URI can be printed or logged safely. */
function redact(uri) {
  if (!uri) return '(none)';
  return uri
    .replace(/\/\/([^:/?#]+):([^@]+)@/, '//$1:<redacted>@')
    .replace(/(?<=\/\/)([^:@/]+)@/, '<redacted>@');
}

function parseArgs(argv) {
  const args = { uri: null, verifyOnly: false, write: true, seed: false };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--verify-only') args.verifyOnly = true;
    else if (a === '--no-write') args.write = false;
    else if (a === '--seed') args.seed = true;
    else if (a === '--uri') args.uri = argv[++i];
    else if (!a.startsWith('--') && !args.uri) args.uri = a;
  }

  return args;
}

/**
 * Check the connection string for the mistakes that actually bite people,
 * rather than trying to fully parse it.
 */
function validateUri(uri) {
  const problems = [];
  const warnings = [];

  if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
    problems.push('Must start with mongodb:// or mongodb+srv://');
    return { problems, warnings };
  }

  const isSrv = uri.startsWith('mongodb+srv://');
  const afterScheme = uri.replace(/^mongodb(\+srv)?:\/\//, '');
  const credPart = afterScheme.includes('@') ? afterScheme.split('@')[0] : '';
  const hostAndRest = afterScheme.includes('@') ? afterScheme.split('@').slice(1).join('@') : afterScheme;

  if (!credPart) {
    warnings.push('No credentials in the URI. Fine for a local server, but a hosted cluster will reject it.');
  } else {
    const [, password] = credPart.split(':');
    if (password === undefined || password === '') {
      problems.push('Username present but password is missing.');
    } else if (/[@/:?#[\]]/.test(decodeURIComponent(password)) && password === decodeURIComponent(password)) {
      problems.push(
        'Password contains a reserved character (@ / : ? # [ ]) and is not percent-encoded. ' +
        'Encode it, or regenerate a password without those characters.'
      );
    }
    if (password === '<db_password>' || password === 'PASSWORD' || password === '<password>') {
      problems.push('Password is still the placeholder from the Atlas UI. Replace it with the real one.');
    }
  }

  const pathPart = hostAndRest.split('?')[0];
  const dbName = pathPart.includes('/') ? pathPart.split('/').slice(1).join('/') : '';

  if (!dbName) {
    warnings.push(
      'No database name in the URI. The driver will default to "test". ' +
      'Append /financial_analyzer before the query string.'
    );
  }

  if (isSrv && /:\d+/.test(pathPart)) {
    problems.push('mongodb+srv:// URIs must not include a port number.');
  }

  return { problems, warnings, isSrv, dbName };
}

/** Replace or append MONGODB_URI in .env without disturbing anything else. */
function writeEnv(uri) {
  let original = '';
  if (fs.existsSync(ENV_PATH)) {
    original = fs.readFileSync(ENV_PATH, 'utf8');
    const backup = `${ENV_PATH}.backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    fs.writeFileSync(backup, original);
    info(`Backed up existing .env to ${path.basename(backup)}`);
  }

  const line = `MONGODB_URI=${uri}`;
  const lines = original.split(/\r?\n/);
  let replaced = false;

  const updated = lines.map((l) => {
    if (/^\s*MONGODB_URI\s*=/.test(l)) {
      replaced = true;
      return line;
    }
    return l;
  });

  if (!replaced) {
    if (updated.length && updated[updated.length - 1].trim() !== '') updated.push('');
    updated.push('# Cloud database (set by scripts/setup-cloud-db.js)');
    updated.push(line);
  }

  fs.writeFileSync(ENV_PATH, updated.join('\n'));
  ok(replaced ? 'Updated MONGODB_URI in backend/.env' : 'Added MONGODB_URI to backend/.env');
}

/** Load every model file so their indexes can be synced. */
function loadModels() {
  const files = fs.readdirSync(MODELS_DIR).filter((f) => f.endsWith('.js'));
  const loaded = [];
  const failed = [];

  for (const file of files) {
    try {
      require(path.join(MODELS_DIR, file));
      loaded.push(file.replace('.js', ''));
    } catch (error) {
      failed.push({ file, message: error.message.split('\n')[0] });
    }
  }

  return { loaded, failed };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Reconnect if the driver has dropped the connection mid-run. */
async function ensureConnected(uri) {
  if (mongoose.connection.readyState === 1) return;
  try {
    await mongoose.disconnect();
  } catch {
    /* already down */
  }
  await mongoose.connect(uri, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 20000,
    socketTimeoutMS: 45000
  });
}

/**
 * Sync indexes model by model, gently.
 *
 * Shared tiers (Atlas M0) rate-limit aggressively: firing 60+ index builds back
 * to back gets the client throttled, at which point the server rejects the TLS
 * handshake outright and every subsequent operation buffers until it times out.
 * So: pace the requests, reconnect when the connection drops, and retry each
 * model a few times with backoff.
 */
async function syncAllIndexes(uri, { pauseMs = 250, maxAttempts = 3 } = {}) {
  const names = Object.keys(mongoose.models);
  let synced = 0;
  const failed = [];

  for (let i = 0; i < names.length; i += 1) {
    const name = names[i];
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await ensureConnected(uri);
        await mongoose.models[name].syncIndexes();
        synced += 1;
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        // Back off harder each time; throttling needs real time to clear.
        await sleep(1000 * attempt * attempt);
      }
    }

    if (lastError) {
      failed.push({ name, message: lastError.message.split('\n')[0] });
    }

    if ((i + 1) % 10 === 0) {
      info(`  ...${i + 1}/${names.length} models processed`);
    }
    await sleep(pauseMs);
  }

  return { synced, failed };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const uri = args.uri || process.env.MONGODB_URI;

  console.log(`\n${c.bold}Cloud database setup${c.reset}\n`);

  if (!uri) {
    fail('No connection string supplied.');
    console.log(`\n  Usage: node scripts/setup-cloud-db.js "mongodb+srv://user:pass@cluster.mongodb.net/financial_analyzer"\n`);
    process.exit(1);
  }

  info(`Target: ${redact(uri)}`);

  // 1. Validate shape
  const { problems, warnings, isSrv, dbName } = validateUri(uri);
  warnings.forEach(warn);
  if (problems.length) {
    problems.forEach(fail);
    console.log('\nFix the connection string and run again.\n');
    process.exit(1);
  }
  ok(`Connection string looks valid (${isSrv ? 'SRV' : 'standard'}${dbName ? `, database "${dbName}"` : ''})`);

  // 2. Connect
  const started = Date.now();
  try {
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 20000,
      socketTimeoutMS: 45000
    });
  } catch (error) {
    fail(`Connection failed: ${error.message}`);
    console.log(`\n${c.bold}Common causes${c.reset}`);
    console.log('  • Your IP is not on the cluster allowlist (Atlas: Network Access → Add IP Address)');
    console.log('  • Wrong username or password (Atlas: Database Access)');
    console.log('  • Password contains a reserved character and is not percent-encoded');
    console.log('  • The cluster is still provisioning — wait a minute and retry\n');
    process.exit(1);
  }

  const latency = Date.now() - started;
  ok(`Connected in ${latency}ms`);

  const conn = mongoose.connection;
  info(`Host: ${conn.host}`);
  info(`Database: ${conn.name}`);

  try {
    const admin = conn.db.admin();
    const build = await admin.serverStatus();
    info(`Server version: ${build.version}`);
    if (build.process) info(`Process: ${build.process}`);
  } catch {
    // serverStatus is restricted on shared tiers such as Atlas M0 - not an error.
    info('Server details unavailable (normal on shared/free tiers)');
  }

  const collections = await conn.db.listCollections().toArray();
  info(`Existing collections: ${collections.length ? collections.length : 'none (fresh cluster)'}`);

  // 3. Persist to .env
  if (args.write && !args.verifyOnly) {
    writeEnv(uri);
  } else {
    info('Skipped writing .env (--no-write or --verify-only)');
  }

  // 4. Sync indexes
  let indexResult = { synced: 0, failed: [] };
  if (!args.verifyOnly) {
    console.log(`\n${c.bold}Preparing schema${c.reset}`);
    const { loaded, failed } = loadModels();
    ok(`Loaded ${loaded.length} models`);
    failed.forEach((f) => warn(`Could not load ${f.file}: ${f.message}`));

    indexResult = await syncAllIndexes(uri);
    ok(`Synced indexes for ${indexResult.synced} models`);
    indexResult.failed.forEach((f) => warn(`Index sync failed for ${f.name}: ${f.message}`));
  }

  await mongoose.disconnect();

  // Report honestly. Claiming success while most of the schema failed would
  // hide a broken setup until the app misbehaves in production.
  if (indexResult.failed.length) {
    console.log(
      `\n${c.yellow}${c.bold}Connected, but ${indexResult.failed.length} model(s) did not get their indexes.${c.reset}`
    );
    console.log(`${c.dim}Mongoose will create missing indexes lazily on first use, but you should re-run:${c.reset}`);
    console.log(`${c.dim}  npm run db:cloud${c.reset}\n`);
    process.exit(1);
  }

  console.log(`\n${c.green}${c.bold}Database is ready.${c.reset}`);
  console.log(`${c.dim}Next: npm run dev${c.reset}\n`);
  process.exit(0);
}

main().catch(async (error) => {
  fail(`Unexpected error: ${error.message}`);
  try { await mongoose.disconnect(); } catch { /* ignore */ }
  process.exit(1);
});
