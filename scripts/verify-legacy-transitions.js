/**
 * Guard against drift between the backend claim state machine and the copy the
 * mobile app uses to decide which transition buttons to show.
 *
 * Run: node scripts/verify-legacy-transitions.js   (exit 1 on any mismatch)
 *
 * Why a copy exists at all: the mobile bundle cannot import from backend/, so
 * `mobile/src/constants/legacyTransitions.js` mirrors CLAIM_STATUS_TRANSITIONS
 * from backend/constants/legacyConstants.js.
 *
 * Why drift matters in both directions:
 *   - backend removes a transition, mobile still offers it -> the user taps a
 *     button that always fails.
 *   - backend adds a transition, mobile does not offer it  -> a legitimate step
 *     in an estate claim becomes unreachable on mobile, and the family is stuck.
 *
 * The backend remains the authority: it validates every transition regardless
 * of what the client shows. This check exists so the UI does not quietly lie
 * about what is possible.
 */
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function loadBackendMap() {
  const constants = require(path.join(ROOT, 'backend', 'constants', 'legacyConstants.js'));
  const map = constants.CLAIM_STATUS_TRANSITIONS;
  if (!map) {
    throw new Error('CLAIM_STATUS_TRANSITIONS is not exported from backend/constants/legacyConstants.js');
  }
  return map;
}

function loadMobileMap() {
  const file = path.join(ROOT, 'mobile', 'src', 'constants', 'legacyTransitions.js');

  // The mobile file is an ES module; read and evaluate just the object literal
  // rather than pulling Babel into this script.
  const fs = require('fs');
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${path.relative(ROOT, file)}`);
  }

  const src = fs.readFileSync(file, 'utf8');
  const match = /export const CLAIM_STATUS_TRANSITIONS\s*=\s*(\{[\s\S]*?\n\});/.exec(src);
  if (!match) {
    throw new Error('Could not find `export const CLAIM_STATUS_TRANSITIONS = { ... };` in the mobile constants file');
  }

  // eslint-disable-next-line no-new-func
  return new Function(`return (${match[1]});`)();
}

function normalise(map) {
  return Object.fromEntries(
    Object.keys(map).sort().map((k) => [k, [...map[k]].sort()])
  );
}

let backend;
let mobile;

try {
  backend = normalise(loadBackendMap());
  mobile = normalise(loadMobileMap());
} catch (error) {
  console.error(`FAIL  ${error.message}`);
  process.exit(1);
}

const problems = [];

for (const state of Object.keys(backend)) {
  if (!(state in mobile)) {
    problems.push(`mobile is missing state "${state}" (backend allows -> ${backend[state].join(', ') || 'nothing'})`);
    continue;
  }
  const missing = backend[state].filter((t) => !mobile[state].includes(t));
  const extra = mobile[state].filter((t) => !backend[state].includes(t));
  if (missing.length) {
    problems.push(`"${state}": mobile is missing transitions the backend allows -> ${missing.join(', ')}`);
  }
  if (extra.length) {
    problems.push(`"${state}": mobile offers transitions the backend rejects -> ${extra.join(', ')}`);
  }
}

for (const state of Object.keys(mobile)) {
  if (!(state in backend)) {
    problems.push(`mobile has state "${state}" that the backend does not define`);
  }
}

if (problems.length) {
  console.error('Claim transition drift between backend and mobile:\n');
  problems.forEach((p) => console.error(`  - ${p}`));
  console.error(
    '\nFix mobile/src/constants/legacyTransitions.js so it matches'
    + '\nbackend/constants/legacyConstants.js CLAIM_STATUS_TRANSITIONS exactly.'
  );
  process.exit(1);
}

const states = Object.keys(backend).length;
const edges = Object.values(backend).reduce((sum, list) => sum + list.length, 0);
console.log(`Claim transitions in sync: ${states} states, ${edges} transitions.`);
