const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

/**
 * Lightweight, dependency-free email service.
 *
 * When SMTP credentials (EMAIL_USER + EMAIL_PASSWORD) are configured, mail is
 * sent via nodemailer. Otherwise it falls back to logging the message so local
 * development and CI never require a live mail server.
 */

let transporter = null;

function isConfigured() {
  return !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
}

function getTransporter() {
  if (!isConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
  return transporter;
}

function fromAddress() {
  const name = process.env.APP_NAME || 'Financial Analyzer';
  const addr = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@financialanalyzer.local';
  return `${name} <${addr}>`;
}

async function sendMail({ to, subject, html, text }) {
  const tx = getTransporter();
  if (!tx) {
    logger.warn(`[email] SMTP not configured — email NOT sent. To: ${to} | Subject: ${subject}`);
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`[email:dev] ${text || subject}`);
    }
    return { delivered: false, dev: true };
  }
  await tx.sendMail({ from: fromAddress(), to, subject, html, text });
  logger.info(`[email] Sent "${subject}" to ${to}`);
  return { delivered: true, dev: false };
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
  return sendMail({ to: user.email, subject, html, text });
}

module.exports = {
  isConfigured,
  sendMail,
  sendVerificationEmail
};
