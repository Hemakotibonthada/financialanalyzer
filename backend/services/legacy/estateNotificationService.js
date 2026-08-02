const logger = require('../../utils/logger');
const { maskValue } = require('../../constants/legacyConstants');

const TEMPLATE_REGISTRY = Object.freeze({
  watch_nudge: {
    email: { subject: 'Quick account activity check', body: 'Hello {{userName}},\n\nWe noticed your account has been quiet recently. A quick sign-in confirms you are active and keeps Legacy Guard from starting outreach.\n\nRegards,\nFinancial Analyzer Legacy Guard' },
    sms: { body: 'Financial Analyzer: Please sign in once to confirm activity and keep Legacy Guard status active.' }
  },
  dormant_notice: {
    email: { subject: 'Your account appears dormant', body: 'Hello {{userName}},\n\nYour account appears dormant. Please sign in or reply to confirm all is well. If we cannot reach you, Legacy Guard may contact registered nominees for welfare support.\n\nRegards,\nLegacy Guard' },
    sms: { body: 'Legacy Guard: Your account appears dormant. Please sign in or reply to confirm all is well.' }
  },
  unreachable_warning: {
    email: { subject: 'We could not reach you', body: 'Hello {{userName}},\n\nWe could not reach you on your registered contact channels. Please update your contact details or sign in to prevent welfare escalation.\n\nRegards,\nLegacy Guard' },
    sms: { body: 'Legacy Guard: We could not reach you. Please sign in or update contact details.' }
  },
  welfare_check: {
    email: { subject: 'Legacy Guard welfare check', body: 'Hello {{userName}},\n\nThis is a welfare check from Legacy Guard. Please respond or sign in to confirm you are safe. If you need help, contact support from the app.\n\nRegards,\nLegacy Guard' },
    sms: { body: 'Legacy Guard welfare check: Please reply or sign in to confirm you are safe.' }
  },
  nominee_first_contact: {
    // Bereaved-family tone review: neutral, non-alarming, avoids confirming death, asks for secure portal use only.
    email: { subject: 'Legacy Guard assistance request', body: 'Hello {{nomineeName}},\n\nYou are listed as a nominee/contact for {{userName}}. We are trying to complete a welfare and account-safety review. Please use the secure portal link to verify your details.\n\nWe understand this may be sensitive and will proceed carefully.\n\nRegards,\nLegacy Guard Support' },
    sms: { body: 'Legacy Guard: You are listed as a nominee/contact for {{userName}}. Please use the secure portal link shared with you.' }
  },
  death_report_acknowledgement: {
    // Bereaved-family tone review: expresses condolences, says reported not confirmed, explains careful verification.
    email: { subject: 'We received your report', body: 'Dear {{claimantName}},\n\nWe are sorry for your loss. We have received the report regarding {{userName}} and will now begin a careful verification process before any account status changes are made.\n\nOur team will guide you on documents and next steps with sensitivity.\n\nRegards,\nLegacy Guard Support' },
    sms: { body: 'Legacy Guard: We are sorry for your loss. We received your report and will begin careful verification.' }
  },
  verification_approved: {
    // Bereaved-family tone review: compassionate, practical, no legal overclaiming.
    email: { subject: 'Estate support verification completed', body: 'Dear {{claimantName}},\n\nVerification has been completed for case {{caseNumber}}. We will now help identify assets, liabilities, documents, and recovery steps.\n\nPlease remember that nominee and legal-heir rights can differ; we will record any dispute transparently.\n\nRegards,\nLegacy Guard Support' },
    sms: { body: 'Legacy Guard: Verification completed for {{caseNumber}}. We will guide asset and claim next steps.' }
  },
  verification_rejected: {
    // Bereaved-family tone review: respectful, gives reason and correction path.
    email: { subject: 'Verification could not be completed yet', body: 'Dear {{claimantName}},\n\nWe could not complete verification for case {{caseNumber}}. Reason: {{reason}}.\n\nYou may submit corrected or additional documents, and our team will review again.\n\nRegards,\nLegacy Guard Support' },
    sms: { body: 'Legacy Guard: Verification for {{caseNumber}} needs more information. Reason: {{reason}}.' }
  },
  claim_submitted: {
    // Bereaved-family tone review: factual and reassuring, avoids promising settlement.
    email: { subject: 'Claim submitted: {{claimType}}', body: 'Dear {{claimantName}},\n\nWe submitted the {{claimType}} claim for {{assetTitle}}. The expected SLA target is {{slaDays}} days. We will track replies and document requests.\n\nRegards,\nLegacy Guard Support' },
    sms: { body: 'Legacy Guard: Claim submitted for {{assetTitle}}. Target SLA: {{slaDays}} days.' }
  },
  claim_settled: {
    // Bereaved-family tone review: acknowledges progress without celebratory language.
    email: { subject: 'Claim settlement recorded', body: 'Dear {{claimantName}},\n\nA settlement of ₹{{amount}} has been recorded for {{assetTitle}} in case {{caseNumber}}. We will update the estate statement and any applicable success fee.\n\nRegards,\nLegacy Guard Support' },
    sms: { body: 'Legacy Guard: Settlement recorded for {{assetTitle}}: ₹{{amount}}.' }
  },
  fee_invoice_issued: {
    // Bereaved-family tone review: transparent fee explanation, emphasizes recovered-only basis.
    email: { subject: 'Legacy Guard success-fee invoice', body: 'Dear {{claimantName}},\n\nWe issued invoice {{invoiceNumber}} for ₹{{totalPayable}}. This is calculated only on successfully recovered amounts, not on discovered asset value.\n\nRegards,\nLegacy Guard Support' },
    sms: { body: 'Legacy Guard: Invoice {{invoiceNumber}} issued for ₹{{totalPayable}}, based only on recovered amounts.' }
  },
  case_closed: {
    // Bereaved-family tone review: closes respectfully and offers follow-up support.
    email: { subject: 'Legacy Guard case closed', body: 'Dear {{claimantName}},\n\nCase {{caseNumber}} has been closed. Summary: {{summary}}\n\nThank you for your patience during a difficult process.\n\nRegards,\nLegacy Guard Support' },
    sms: { body: 'Legacy Guard: Case {{caseNumber}} has been closed. Summary: {{summary}}' }
  },
  case_revoked: {
    // Bereaved-family tone review: explicit apology for false alarm, reassuring that marking was reversed.
    email: { subject: 'Legacy Guard case revoked', body: 'Dear {{recipientName}},\n\nWe sincerely apologize. Case {{caseNumber}} was opened based on information that has now been corrected. The deceased marking has been fully reversed, and the account status has been restored.\n\nReason recorded: {{reason}}\n\nRegards,\nLegacy Guard Support' },
    sms: { body: 'Legacy Guard: We apologize. Case {{caseNumber}} was revoked and the account status restored. Reason: {{reason}}' }
  }
});

const STAGE_TEMPLATE = Object.freeze({
  watch: 'watch_nudge',
  dormant: 'dormant_notice',
  unreachable: 'unreachable_warning',
  welfare_check: 'welfare_check'
});

class EstateNotificationService {
  async notifyUserDormancy(userId, stage, ctx = {}) {
    try {
      const key = STAGE_TEMPLATE[stage] || 'watch_nudge';
      const message = this.renderTemplate(key, ctx, ctx.channel || 'email');
      await this.dispatch(userId, key, message, { type: 'legacy_dormancy', stage });
      logger.info('Legacy Guard dormancy notification prepared:', { userId, stage, channel: ctx.channel || 'email' });
      return { userId, stage, template: key, message };
    } catch (error) {
      logger.error('Legacy Guard user dormancy notification failed:', { userId, stage, error: error.message });
      throw new Error(`Failed to notify user about dormancy: ${error.message}`);
    }
  }

  async notifyNominee(nomineeId, ctx = {}) {
    try {
      const Nominee = require('../../models/Nominee');
      const nominee = await Nominee.findById(nomineeId).lean();
      if (!nominee) throw new Error('Nominee not found');
      const message = this.renderTemplate(ctx.templateKey || 'nominee_first_contact', { nomineeName: nominee.fullName, ...ctx }, ctx.channel || 'email');
      logger.info('Legacy Guard nominee notification prepared:', { nomineeId, phone: maskValue(nominee.contact?.phone), email: maskValue(nominee.contact?.email), channel: ctx.channel || 'email' });
      return { nomineeId, message, contact: { phone: maskValue(nominee.contact?.phone), email: maskValue(nominee.contact?.email) } };
    } catch (error) {
      logger.error('Legacy Guard nominee notification failed:', { nomineeId, error: error.message });
      throw new Error(`Failed to notify nominee: ${error.message}`);
    }
  }

  async notifyAgent(agentId, ctx = {}) {
    try {
      const message = this.renderTemplate(ctx.templateKey || 'agent_alert', ctx, ctx.channel || 'email');
      await this.dispatch(agentId, ctx.templateKey || 'agent_alert', message, { type: 'legacy_agent_alert', ...ctx });
      return { agentId, message };
    } catch (error) {
      logger.error('Legacy Guard agent notification failed:', { agentId, error: error.message });
      throw new Error(`Failed to notify agent: ${error.message}`);
    }
  }

  async notifyLifecycle(recipientId, templateKey, ctx = {}, channel = 'email') {
    try {
      const message = this.renderTemplate(templateKey, ctx, channel);
      await this.dispatch(recipientId, templateKey, message, { type: 'legacy_lifecycle', templateKey, estateCaseId: ctx.estateCaseId });
      return { recipientId, templateKey, channel, message };
    } catch (error) {
      logger.error('Legacy Guard lifecycle notification failed:', { recipientId, templateKey, channel, error: error.message });
      throw new Error(`Failed to send lifecycle notification: ${error.message}`);
    }
  }

  renderTemplate(key, ctx = {}, channel = 'email') {
    try {
      const template = TEMPLATE_REGISTRY[key]?.[channel] || TEMPLATE_REGISTRY[key]?.email || { subject: key, body: key };
      return {
        subject: this.interpolate(template.subject || key, ctx),
        body: this.interpolate(template.body || '', ctx),
        channel
      };
    } catch (error) {
      logger.error('Legacy Guard notification template render failed:', { key, channel, error: error.message });
      throw new Error(`Failed to render notification template: ${error.message}`);
    }
  }

  interpolate(template, ctx = {}) {
    return String(template).replace(/{{\s*([\w.]+)\s*}}/g, (_, path) => {
      const value = path.split('.').reduce((acc, part) => acc?.[part], ctx);
      return value === null || value === undefined ? '' : String(value);
    });
  }

  listTemplates() {
    try {
      return Object.keys(TEMPLATE_REGISTRY).map(key => ({ key, channels: Object.keys(TEMPLATE_REGISTRY[key]) }));
    } catch (error) {
      logger.error('Legacy Guard template listing failed:', error);
      throw new Error(`Failed to list notification templates: ${error.message}`);
    }
  }

  async dispatch(userId, templateKey, message, data = {}) {
    try {
      const notificationService = require('../notificationService');
      if (typeof notificationService.sendNotification === 'function') {
        return await notificationService.sendNotification(userId, { title: message.subject, message: message.body, data: { ...data, templateKey, channel: message.channel } });
      }
    } catch (error) {
      logger.warn('Legacy Guard notification backend unavailable:', { userId, templateKey, error: error.message });
    }
    return null;
  }
}

const estateNotificationService = new EstateNotificationService();
module.exports = estateNotificationService;
module.exports.EstateNotificationService = EstateNotificationService;
