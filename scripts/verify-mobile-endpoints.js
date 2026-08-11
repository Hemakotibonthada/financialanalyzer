/**
 * Verify every path referenced in mobile/src/api/endpoints.js resolves to a
 * real Express route in backend/routes/*.js.
 *
 * Run: node scripts/verify-mobile-endpoints.js   (exit 1 if anything is broken)
 *
 * Why this exists: an endpoint that does not exist is the most expensive kind
 * of mistake in this codebase. It passes review, it bundles, it ships, and it
 * only fails in a user's hands as a 404 that the UI reports as a generic
 * error. The first run of this script found ten of them in already-shipped
 * mobile code, including `GET /emi` and `POST /emi` - which meant the entire
 * EMI list and EMI form screens had never worked.
 *
 * Also catches method drift: the app called PATCH /notifications/:id/read
 * where the backend only serves PUT.
 */
const fs = require('fs');
const path = require('path');

// Resolve from the repo root so this works from any working directory.
const ROOT = path.resolve(__dirname, '..');
const SERVER = path.join(ROOT, 'backend', 'server.js');
const ROUTES_DIR = path.join(ROOT, 'backend', 'routes');
const ENDPOINTS = path.join(ROOT, 'mobile', 'src', 'api', 'endpoints.js');

// ---- 1. Build mount map: '/api/x' -> routeFile
const server = fs.readFileSync(SERVER, 'utf8');
const mounts = [];
const inlineRe = /app\.use\(\s*'(\/api\/[^']+)'[^)]*?require\('\.\/routes\/([\w.-]+)'\)/g;
const varRe = /app\.use\(\s*'(\/api\/[^']+)'\s*,(?:[^)]*?,)?\s*(\w+)\s*\)/g;
let m;
while ((m = inlineRe.exec(server))) mounts.push({ mount: m[1], ref: m[2] });
while ((m = varRe.exec(server))) mounts.push({ mount: m[1], ref: m[2] });

// map require variable name -> file
const requireRe = /const\s+(\w+)\s*=\s*require\('\.\/routes\/([\w.-]+)'\)/g;
const varToFile = {};
while ((m = requireRe.exec(server))) varToFile[m[1]] = m[2];

const mountMap = [];
for (const { mount, ref } of mounts) {
  const file = ref.endsWith('.js') ? ref : (varToFile[ref] ? varToFile[ref] : `${ref}.js`);
  const full = path.join(ROUTES_DIR, file.endsWith('.js') ? file : `${file}.js`);
  if (fs.existsSync(full)) mountMap.push({ mount: mount.replace(/^\/api/, ''), file: full });
}

// ---- 2. Collect concrete routes per mount
const routes = []; // { method, regex, literal }
for (const { mount, file } of mountMap) {
  const src = fs.readFileSync(file, 'utf8');
  const re = /router\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g;
  let r;
  while ((r = re.exec(src))) {
    const method = r[1].toUpperCase();
    const sub = r[2] === '/' ? '' : r[2];
    const full = `${mount}${sub}`;
    // ':param' matches a single non-slash segment
    const pattern = '^' + full.replace(/:[A-Za-z0-9_]+/g, '[^/]+').replace(/\//g, '\\/') + '$';
    routes.push({ method, regex: new RegExp(pattern), literal: full });
  }
}

// ---- 3. Extract calls from endpoints.js
const ep = fs.readFileSync(ENDPOINTS, 'utf8');
const callRe = /\b(get|post|put|patch|del|getCached)\(\s*(`[^`]*`|'[^']*')/g;
const calls = [];
while ((m = callRe.exec(ep))) {
  const method = m[1] === 'del' ? 'DELETE' : (m[1] === 'getCached' ? 'GET' : m[1].toUpperCase());
  let raw = m[2].slice(1, -1);
  // template literal ${...} -> a single segment
  const concrete = raw.replace(/\$\{[^}]*\}/g, 'X');
  const line = ep.slice(0, m.index).split('\n').length;
  calls.push({ method, raw, concrete, line });
}

// ---- 4. Match
let bad = 0;
const seen = new Set();
for (const c of calls) {
  const key = `${c.method} ${c.concrete}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const hit = routes.some((r) => r.method === c.method && r.regex.test(c.concrete));
  if (!hit) {
    bad++;
    console.log(`MISSING  ${c.method.padEnd(6)} ${c.raw}   (endpoints.js:${c.line})`);
  }
}

console.log(`\nmounts: ${mountMap.length}  backendRoutes: ${routes.length}  mobileCalls: ${seen.size}  unmatched: ${bad}`);
process.exit(bad === 0 ? 0 : 1);
