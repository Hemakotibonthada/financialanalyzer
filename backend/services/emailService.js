const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const { maskValue } = require('../constants/legacyConstants');

/**
 * Lightweight, dependency-free email service.
 *
 * Configuration accepts BOTH naming conventions. The repository historically
 * disagreed with itself: .env.example ships SMTP_HOST/SMTP_USER/SMTP_PASS,
 * docker-compose.prod.yml sets EMAIL_HOST/EMAIL_USER/EMAIL_PASSWORD, and this
 * file only ever read the EMAIL_* names. A .env configured the documented way
 * therefore looked "not configured", and every verification and OTP email was
 * silently logged instead of sent. Both spellings now work, EMAIL_* winning
 * when both are present.
 *
 * Every attempt is written to the EmailLog collection so a failure to deliver
 * is visible in the admin console rather than buried in a log file.
 */

let transporter = null;
let cachedSignature = null;

function readConfig() {
  return {
    host: process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT || process.env.SMTP_PORT) || 587,
    secure: (process.env.EMAIL_SECURE || process.env.SMTP_SECURE) === 'true',
    user: process.env.EMAIL_USER || process.env.SMTP_USER,
    pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || process.env.SMTP_PASSWORD
  };
}

function isConfigured() {
  const { user, pass } = readConfig();
  return !!(user && pass);
}

/** Non-secret view of the current configuration, for the admin console. */
function getStatus() {
  const cfg = readConfig();
  return {
    configured: !!(cfg.user && cfg.pass),
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    user: cfg.user ? maskValue(cfg.user) : null,
    from: fromAddress(),
    // Which spelling actually supplied the credentials, so a misconfiguration
    // is obvious at a glance.
    source: process.env.EMAIL_USER ? 'EMAIL_*' : (process.env.SMTP_USER ? 'SMTP_*' : 'none')
  };
}

function getTransporter() {
  const cfg = readConfig();
  if (!cfg.user || !cfg.pass) return null;

  // Rebuild if the configuration changed underneath us (tests, hot reload).
  const signature = `${cfg.host}:${cfg.port}:${cfg.secure}:${cfg.user}`;
  if (transporter && cachedSignature === signature) return transporter;

  transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass }
  });
  cachedSignature = signature;
  return transporter;
}

/** Verify the SMTP connection without sending anything. */
async function verifyConnection() {
  const tx = getTransporter();
  if (!tx) return { ok: false, error: 'SMTP is not configured' };
  try {
    await tx.verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function fromAddress() {
  const name = process.env.APP_NAME || 'Financial Analyzer';
  const cfg = readConfig();
  const addr = process.env.EMAIL_FROM || cfg.user || 'no-reply@financialanalyzer.local';
  // EMAIL_FROM may already be a full "Name <addr>" header.
  if (/<.+>/.test(addr)) return addr;
  return `${name} <${addr}>`;
}

/** Append to EmailLog. Never throws - logging must not break sending. */
async function recordAttempt(entry) {
  try {
    const EmailLog = require('../models/EmailLog');
    await EmailLog.record(entry);
  } catch (error) {
    logger.warn(`Could not write EmailLog entry: ${error.message}`);
  }
}

async function sendMail({ to, subject, html, text, template = 'generic', userId }) {
  const started = Date.now();
  const cfg = readConfig();
  const base = {
    to,
    toMasked: maskValue(to),
    subject,
    template,
    userId,
    host: cfg.host,
    fromAddress: fromAddress(),
    bodyPreview: (text || '').slice(0, 200)
  };

  const tx = getTransporter();

  if (!tx) {
    logger.warn(`[email] SMTP not configured - "${subject}" NOT sent to ${maskValue(to)}`);
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`[email:dev] ${text || subject}`);
    }
    await recordAttempt({
      ...base,
      status: 'skipped',
      reason: 'smtp_not_configured',
      durationMs: Date.now() - started
    });
    return { delivered: false, dev: true, reason: 'smtp_not_configured' };
  }

  try {
    const info = await tx.sendMail({ from: fromAddress(), to, subject, html, text });
    logger.info(`[email] Sent "${subject}" to ${maskValue(to)}`);
    await recordAttempt({
      ...base,
      status: 'sent',
      messageId: info.messageId,
      smtpResponse: info.response,
      durationMs: Date.now() - started
    });
    return { delivered: true, dev: false, messageId: info.messageId };
  } catch (error) {
    // Previously this threw, so a bad password surfaced as a 500 on the caller
    // with no persistent record of what happened.
    logger.error(`[email] FAILED "${subject}" to ${maskValue(to)}: ${error.message}`);
    await recordAttempt({
      ...base,
      status: 'failed',
      reason: error.code || 'send_error',
      errorMessage: error.message,
      durationMs: Date.now() - started
    });
    return { delivered: false, dev: false, error: error.message };
  }
}

function baseTemplate(heading, bodyHtml) {
  const appName = process.env.APP_NAME || 'Financial Analyzer';
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,.08);">
          <tr><td style="background:linear-gradient(135deg,#0f766e,#0d9488);padding:28px 32px;">
            <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:.2px;">${appName}</span>
          </td></tr>
          <tr><td style="padding:32px;color:#0f172a;">
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;">${heading}</h1>
            ${bodyHtml}
          </td></tr>
          <tr><td style="padding:20px 32px;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.6;">
            You received this email because an account was created with this address at ${appName}.
            If this wasn't you, you can safely ignore it.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

async function sendVerificationEmail(user, verifyUrl) {
  const subject = 'Verify your email address';
  const html = baseTemplate('Confirm your email', `
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">
      Hi ${user.name || 'there'}, welcome aboard! Please confirm your email address to
      secure your account and unlock email notifications.
    </p>
    <p style="margin:0 0 28px;">
      <a href="${verifyUrl}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:15px;">Verify email</a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#64748b;">Or paste this link into your browser:</p>
    <p style="margin:0;font-size:13px;word-break:break-all;color:#0d9488;">${verifyUrl}</p>
    <p style="margin:20px 0 0;font-size:13px;color:#94a3b8;">This link expires in 24 hours.</p>
  `);
  const text = `Confirm your email for ${process.env.APP_NAME || 'Financial Analyzer'}: ${verifyUrl} (expires in 24 hours)`;
  return sendMail({ to: user.email, subject, html, text, template: 'verification', userId: user._id });
}

/**
 * One-time passcode for email-based two-factor authentication.
 *
 * The code is rendered large and letter-spaced because people read it off a
 * phone. It is never logged: only the fact that a send was attempted.
 */
async function sendOtpEmail(user, code, { expiresInMinutes = 10, purpose = 'sign-in' } = {}) {
  const subject = `Your ${purpose} code: ${code}`;
  const html = baseTemplate('Your verification code', `
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">
      Hi ${user.name || 'there'}, use this code to complete your ${purpose}.
    </p>
    <p style="margin:0 0 24px;text-align:center;">
      <span style="display:inline-block;background:#f0fdfa;border:1px solid #99f6e4;color:#0f766e;font-size:32px;font-weight:700;letter-spacing:10px;padding:16px 24px;border-radius:12px;font-family:'Courier New',monospace;">${code}</span>
    </p>
    <p style="margin:0 0 8px;font-size:14px;color:#334155;">
      This code expires in ${expiresInMinutes} minutes and can be used once.
    </p>
    <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;">
      If you didn't request this, someone may know your password. Change it and review your
      active sessions.
    </p>
  `);
  const text = `Your ${process.env.APP_NAME || 'Financial Analyzer'} ${purpose} code is ${code}. It expires in ${expiresInMinutes} minutes.`;
  return sendMail({ to: user.email, subject, html, text, template: 'otp', userId: user._id });
}

module.exports = {
  isConfigured,
  getStatus,
  verifyConnection,
  sendMail,
  sendVerificationEmail,
  sendOtpEmail
};