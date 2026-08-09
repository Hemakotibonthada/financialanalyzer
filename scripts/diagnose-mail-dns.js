#!/usr/bin/env node
/**
 * Mail DNS and deliverability diagnostic.
 *
 * Checks the DNS and SMTP configuration of a domain used for email, and
 * explains what each result means for deliverability. Written after
 * circuvent.com turned out to have three separate faults that were invisible
 * from the application: a duplicated DMARC record, an SPF record authorising a
 * different provider to the one actually sending, and no reverse DNS.
 *
 * Usage:
 *   node scripts/diagnose-mail-dns.js circuvent.com
 *   node scripts/diagnose-mail-dns.js circuvent.com --probe vema@circuvent.com
 *
 * --probe opens a real SMTP conversation with the domain's MX and stops at
 * RCPT TO. Nothing is delivered; it only asks whether the mailbox would be
 * accepted. Safe to run against your own domain.
 */

const dns = require('dns').promises;
const net = require('net');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m'
};

const ok = (m) => console.log(`${C.green}  PASS${C.reset}  ${m}`);
const bad = (m) => console.log(`${C.red}  FAIL${C.reset}  ${m}`);
const warn = (m) => console.log(`${C.yellow}  WARN${C.reset}  ${m}`);
const info = (m) => console.log(`${C.dim}        ${m}${C.reset}`);
const head = (m) => console.log(`\n${C.bold}${m}${C.reset}`);

let failures = 0;
let warnings = 0;
const fail = (m) => { failures++; bad(m); };
const caution = (m) => { warnings++; warn(m); };

async function checkMx(domain) {
  head('MX - who accepts mail for this domain');
  let records;
  try {
    records = await dns.resolveMx(domain);
  } catch {
    fail('No MX records. Nothing can receive mail for this domain.');
    return [];
  }
  if (!records.length) {
    fail('No MX records. Nothing can receive mail for this domain.');
    return [];
  }

  records.sort((a, b) => a.priority - b.priority);
  ok(`${records.length} MX record(s)`);
  for (const r of records) {
    let addrs = [];
    try {
      addrs = await dns.resolve4(r.exchange);
    } catch {
      fail(`${r.exchange} does not resolve - mail to this domain will bounce`);
      continue;
    }
    info(`priority ${r.priority}  ${r.exchange} -> ${addrs.join(', ')}`);
  }
  return records;
}

async function checkSpf(domain, mxAddresses) {
  head('SPF - which servers may send as this domain');
  let txt;
  try {
    txt = await dns.resolveTxt(domain);
  } catch {
    caution('No TXT records at all, so no SPF. Receivers cannot verify your senders.');
    return;
  }

  const spfRecords = txt.map((c) => c.join('')).filter((v) => /^v=spf1/i.test(v));

  if (spfRecords.length === 0) {
    caution('No SPF record. Mail you send is far more likely to be treated as spam.');
    return;
  }
  if (spfRecords.length > 1) {
    fail(`${spfRecords.length} SPF records found. More than one is invalid (RFC 7208) and SPF will fail.`);
    spfRecords.forEach((r) => info(r));
    return;
  }

  const spf = spfRecords[0];
  ok('One SPF record');
  info(spf);

  if (/[~-]all/.test(spf) === false) {
    caution('SPF has no "all" mechanism, so it does not actually restrict anything.');
  }
  if (/\+all/.test(spf)) {
    fail('SPF ends in +all, which authorises the entire internet to send as you.');
  }

  // The most common real-world fault: SPF names one provider while mail is
  // actually sent from somewhere else entirely.
  const includes = [...spf.matchAll(/include:([^\s]+)/g)].map((m) => m[1]);
  if (includes.length && mxAddresses.length) {
    info(`includes: ${includes.join(', ')}`);
    info('If your mail actually leaves from your own server, its IP must be listed');
    info('here (ip4:...) or mail you send will fail SPF regardless of the includes.');
  }
}

async function checkDmarc(domain) {
  head('DMARC - what receivers should do when checks fail');
  let txt;
  try {
    txt = await dns.resolveTxt(`_dmarc.${domain}`);
  } catch {
    caution('No DMARC record. Consider starting with p=none to collect reports.');
    return;
  }

  const records = txt.map((c) => c.join('')).filter((v) => /v=DMARC1/i.test(v));

  if (records.length === 0) {
    caution('No DMARC record found at _dmarc.');
    return;
  }

  if (records.length > 1) {
    // This is the trap: two valid-looking records cancel each other out.
    fail(`${records.length} DMARC records found. RFC 7489 requires receivers to STOP`);
    info('evaluating DMARC when more than one record exists, so the effective');
    info('policy is NONE - exactly as if you had published nothing at all.');
    records.forEach((r) => info(`  ${r.trim()}`));
    info('Fix: delete all but one TXT record at _dmarc.' + domain);
    return;
  }

  ok('One DMARC record');
  info(records[0].trim());
  const policy = /p=(\w+)/i.exec(records[0]);
  if (policy && policy[1].toLowerCase() === 'none') {
    info('p=none only monitors. Move to quarantine, then reject, once reports look clean.');
  }
}

async function checkPtr(mxRecords) {
  head('PTR - reverse DNS for the sending IP');
  if (!mxRecords.length) {
    info('Skipped: no MX to check.');
    return;
  }

  for (const r of mxRecords) {
    let addrs = [];
    try {
      addrs = await dns.resolve4(r.exchange);
    } catch {
      continue;
    }
    for (const ip of addrs) {
      try {
        const names = await dns.reverse(ip);
        ok(`${ip} -> ${names.join(', ')}`);
        if (!names.some((n) => n.includes(r.exchange.split('.').slice(-2).join('.')))) {
          caution(`PTR for ${ip} does not match the mail hostname. Some receivers check this.`);
        }
      } catch {
        fail(`${ip} has no PTR record.`);
        info('Large providers reject or heavily penalise mail from an IP with no');
        info('reverse DNS. On a cloud VM this is set in the provider console, not DNS.');
      }
    }
  }
}

function probeMailbox(host, address) {
  return new Promise((resolve) => {
    const lines = [];
    let step = 0;
    let buffer = '';
    let verdict = 'no response';
    const socket = net.createConnection({ host, port: 25, timeout: 25000 });
    const send = (l) => socket.write(`${l}\r\n`);

    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      if (!buffer.endsWith('\r\n')) return;
      const response = buffer.trim();
      buffer = '';
      lines.push(response.split('\r\n')[0]);
      const code = parseInt(response.slice(0, 3), 10);

      if (step === 0) { step = 1; send('EHLO mail-diagnostic.local'); }
      else if (step === 1) { step = 2; send('MAIL FROM:<no-reply@accounts.google.com>'); }
      else if (step === 2) {
        if (code >= 400) { verdict = `sender refused (${code})`; step = 9; send('QUIT'); return; }
        step = 3; send(`RCPT TO:<${address}>`);
      } else if (step === 3) {
        if (code >= 200 && code < 300) verdict = `accepted (${code})`;
        else if (code >= 400 && code < 500) verdict = `temporary reject / greylisting (${code})`;
        else verdict = `permanent reject (${code}) ${response.slice(4, 80)}`;
        step = 9; send('QUIT');
      } else socket.end();
    });

    socket.on('close', () => resolve({ verdict, lines }));
    socket.on('timeout', () => { verdict = 'timeout'; socket.destroy(); });
    socket.on('error', (e) => resolve({ verdict: `error: ${e.message}`, lines }));
  });
}

async function checkDelivery(mxRecords, address) {
  head(`SMTP - would ${address} actually be accepted?`);
  if (!mxRecords.length) {
    info('Skipped: no MX.');
    return;
  }
  const host = mxRecords[0].exchange;
  info(`Talking to ${host}:25 (stops at RCPT TO - nothing is delivered)`);

  const { verdict, lines } = await probeMailbox(host, address);
  lines.slice(0, 2).forEach((l) => info(l));

  if (/^accepted/.test(verdict)) {
    ok(`Mailbox accepted: ${verdict}`);
    info('The server takes the message. If mail still does not appear, the loss is');
    info('AFTER acceptance - spam filtering, a sieve rule, or the Junk folder.');
    info('Check the server: journalctl -u postfix, and the rspamd/SpamAssassin log.');
  } else if (/greylist|temporary/.test(verdict)) {
    fail(`Temporary rejection: ${verdict}`);
    info('Greylisting is a common cause of missing one-time codes: ordinary senders');
    info('retry and succeed, but OTP senders often do not retry, because the code');
    info('would have expired. Consider whitelisting transactional senders.');
  } else {
    fail(verdict);
  }
}

(async () => {
  const domain = process.argv[2];
  const probeIndex = process.argv.indexOf('--probe');
  const probeAddress = probeIndex > -1 ? process.argv[probeIndex + 1] : null;

  if (!domain) {
    console.log('Usage: node scripts/diagnose-mail-dns.js <domain> [--probe user@domain]');
    process.exit(1);
  }

  console.log(`\n${C.bold}Mail diagnostic for ${domain}${C.reset}`);

  const mx = await checkMx(domain);
  const mxAddresses = [];
  for (const r of mx) {
    try {
      mxAddresses.push(...(await dns.resolve4(r.exchange)));
    } catch { /* reported above */ }
  }

  await checkSpf(domain, mxAddresses);
  await checkDmarc(domain);
  await checkPtr(mx);
  if (probeAddress) await checkDelivery(mx, probeAddress);

  head('Summary');
  if (failures === 0 && warnings === 0) {
    console.log(`${C.green}  No problems found.${C.reset}\n`);
  } else {
    console.log(`  ${failures} failure(s), ${warnings} warning(s)\n`);
  }
  process.exit(failures > 0 ? 1 : 0);
})().catch((e) => {
  console.error(`Diagnostic error: ${e.message}`);
  process.exit(1);
});
