/**
 * API smoke test.
 *
 * Registers (or logs in) a throwaway test user, then issues authenticated GET
 * requests against the main feature endpoints and reports the HTTP status of
 * each. The goal is to surface server crashes (5xx) across the API surface.
 *
 * Usage:
 *   node scripts/smoke-test.js
 *
 * Requires the backend to be running (default http://localhost:5001).
 */
const axios = require('axios');

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:5001/api';
const http = axios.create({ baseURL: BASE, timeout: 20000, validateStatus: () => true });

const TEST_USER = {
  name: 'Smoke Test',
  email: 'smoke.test@example.com',
  password: 'SmokeTest123',
};

// Authenticated GET endpoints to probe (base list endpoints across features).
const ENDPOINTS = [
  '/profile',
  '/transactions',
  '/budgets',
  '/goals',
  '/goal-tracking',
  '/investments',
  '/networth',
  '/bank-accounts',
  '/cc-bills',
  '/debt',
  '/insurance',
  '/portfolio',
  '/retirement',
  '/subscriptions',
  '/tax',
  '/templates',
  '/receipts',
  '/documents',
  '/notifications',
  '/enterprise-notifications',
  '/activity-logs',
  '/bill-reminders',
  '/automation',
  '/insights',
  '/forecast',
  '/personal-loans',
  '/loans-given',
  '/lenders',
  '/lender-loans',
  '/lender-payments',
  '/funders',
  '/company-expenses',
  '/real-estate',
  '/webhooks',
  '/achievements',
  '/family',
  '/recurring',
  '/emis',
  '/real-cibil',
  '/health',
];

function classify(status) {
  if (status >= 200 && status < 300) return 'OK   ';
  if (status === 304) return 'OK   ';
  if (status === 401 || status === 403) return 'AUTH ';
  if (status === 404) return '404  ';
  if (status === 400 || status === 422) return 'VALID';
  if (status >= 500) return 'FAIL ';
  return `${status}`;
}

async function getToken() {
  // Try register first; if user exists, fall back to login.
  let res = await http.post('/auth/register', TEST_USER);
  if (res.status === 201 && res.data?.data?.accessToken) {
    return res.data.data.accessToken;
  }
  res = await http.post('/auth/login', {
    email: TEST_USER.email,
    password: TEST_USER.password,
  });
  if (res.status === 200 && res.data?.data?.accessToken) {
    return res.data.data.accessToken;
  }
  throw new Error(
    `Could not authenticate. register=${res.status} ${JSON.stringify(res.data)}`
  );
}

async function main() {
  console.log(`Smoke testing ${BASE}\n`);
  const token = await getToken();
  console.log('Authenticated OK\n');
  http.defaults.headers.common['Authorization'] = `Bearer ${token}`;

  const failures = [];
  const results = [];

  for (const ep of ENDPOINTS) {
    try {
      const res = await http.get(ep);
      const tag = classify(res.status);
      results.push(`  [${tag}] ${res.status}  GET ${ep}`);
      if (res.status >= 500) {
        failures.push({ ep, status: res.status, body: res.data });
      }
    } catch (err) {
      results.push(`  [ERR  ] ---  GET ${ep}  (${err.message})`);
      failures.push({ ep, status: 'ERR', body: err.message });
    }
  }

  console.log(results.join('\n'));
  console.log(`\n${'='.repeat(50)}`);
  if (failures.length === 0) {
    console.log('✅ No 5xx failures across probed endpoints.');
  } else {
    console.log(`❌ ${failures.length} endpoint(s) returned 5xx / errored:`);
    for (const f of failures) {
      const detail =
        typeof f.body === 'object' ? JSON.stringify(f.body).slice(0, 300) : String(f.body).slice(0, 300);
      console.log(`  - ${f.ep} -> ${f.status}: ${detail}`);
    }
  }
}

main().catch((err) => {
  console.error('Smoke test aborted:', err.message);
  process.exit(1);
});
