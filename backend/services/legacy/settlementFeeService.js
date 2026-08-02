const logger = require('../../utils/logger');
const {
  RECOVERED_ASSET_STATUSES,
  DEFAULT_FEE_PERCENTAGE,
  DEFAULT_GST_PERCENTAGE,
  CASE_NUMBER_PREFIX,
  roundMoney
} = require('../../constants/legacyConstants');

class SettlementFeeService {
  async computeFee(estateCaseId) {
    try {
      const EstateAsset = require('../../models/EstateAsset');
      const DormancyPolicy = require('../../models/DormancyPolicy');
      const policy = await DormancyPolicy.getActive().catch(() => null);
      const feePolicy = policy?.fee || {};
      const percentage = Number(feePolicy.percentage ?? DEFAULT_FEE_PERCENTAGE);
      const gstPercentage = Number(feePolicy.gstPercentage ?? DEFAULT_GST_PERCENTAGE);
      const assets = await EstateAsset.find({ estateCaseId, kind: 'asset', status: { $in: RECOVERED_ASSET_STATUSES } }).lean();
      const rawLineItems = assets.map(asset => this.lineItemForAsset(asset, percentage)).filter(item => item.recoveredInINR > 0);
      const basisAmountInINR = roundMoney(rawLineItems.reduce((sum, item) => sum + item.recoveredInINR, 0));
      let grossFeeInINR = roundMoney(rawLineItems.reduce((sum, item) => sum + item.feeInINR, 0));
      let minFeeApplied = false;
      let maxFeeApplied = false;

      if (basisAmountInINR > 0 && Number.isFinite(Number(feePolicy.minFeeInINR)) && grossFeeInINR < Number(feePolicy.minFeeInINR)) {
        grossFeeInINR = roundMoney(feePolicy.minFeeInINR);
        minFeeApplied = true;
      }
      if (feePolicy.maxFeeInINR !== null && feePolicy.maxFeeInINR !== undefined && Number.isFinite(Number(feePolicy.maxFeeInINR)) && grossFeeInINR > Number(feePolicy.maxFeeInINR)) {
        grossFeeInINR = roundMoney(feePolicy.maxFeeInINR);
        maxFeeApplied = true;
      }

      const lineItems = this.apportionCaps(rawLineItems, grossFeeInINR);
      const gstAmountInINR = roundMoney(grossFeeInINR * (gstPercentage / 100));
      return { feePercentage: percentage, gstPercentage, basisAmountInINR, grossFeeInINR, gstAmountInINR, totalPayableInINR: roundMoney(grossFeeInINR + gstAmountInINR), minFeeApplied, maxFeeApplied, lineItems, chargeBasis: 'recovered_only' };
    } catch (error) {
      logger.error('Legacy Guard fee compute failed:', { estateCaseId, error: error.message });
      throw new Error(`Failed to compute settlement fee: ${error.message}`);
    }
  }

  async issueInvoice(estateCaseId, actorId) {
    try {
      const SettlementFee = require('../../models/SettlementFee');
      const EstateCase = require('../../models/EstateCase');
      const estateCase = await EstateCase.findById(estateCaseId).lean();
      if (!estateCase) throw new Error('Estate case not found');
      const computed = await this.computeFee(estateCaseId);
      const existing = await SettlementFee.findOne({ estateCaseId, status: { $nin: ['refunded', 'written_off'] } });
      const invoiceNumber = existing?.invoiceNumber || await this.generateInvoiceNumber(SettlementFee);
      const amountPaidInINR = Number(existing?.amountPaidInINR || 0);
      const fee = await SettlementFee.findOneAndUpdate(
        { estateCaseId },
        { $set: { ...computed, invoiceNumber, userId: estateCase.userId, status: existing?.status || 'invoiced', issuedAt: existing?.issuedAt || new Date(), dueAt: existing?.dueAt || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), amountPaidInINR, balanceInINR: roundMoney(computed.totalPayableInINR - amountPaidInINR) } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      await EstateCase.findByIdAndUpdate(estateCaseId, { $set: { 'totals.feeInINR': computed.totalPayableInINR, 'totals.recoveredInINR': computed.basisAmountInINR } });
      await require('./estateAuditService').record({ estateCaseId, userId: estateCase.userId, actorId, action: 'settlement_fee_invoiced', entityType: 'SettlementFee', entityId: fee._id, after: computed });
      await require('./estateNotificationService').notifyLifecycle(estateCase.userId, 'fee_invoice_issued', { invoiceNumber, totalPayable: computed.totalPayableInINR, estateCaseId }).catch(err => logger.warn('Legacy Guard fee notification failed:', err.message));
      return fee;
    } catch (error) {
      logger.error('Legacy Guard invoice issue failed:', { estateCaseId, error: error.message });
      throw new Error(`Failed to issue settlement invoice: ${error.message}`);
    }
  }

  async recordPayment(feeId, payload = {}) {
    try {
      const SettlementFee = require('../../models/SettlementFee');
      const fee = await SettlementFee.findById(feeId);
      if (!fee) throw new Error('Settlement fee not found');
      const amount = roundMoney(payload.amountInINR);
      if (amount <= 0) throw new Error('Payment amount must be positive');
      const before = this.feeSnapshot(fee);
      fee.payments = fee.payments || [];
      fee.payments.push({ amountInINR: amount, method: payload.method, reference: payload.reference, receivedAt: payload.receivedAt || new Date(), recordedBy: payload.recordedBy });
      fee.amountPaidInINR = roundMoney((fee.amountPaidInINR || 0) + amount);
      fee.balanceInINR = roundMoney(Math.max(0, (fee.totalPayableInINR || 0) - fee.amountPaidInINR));
      fee.status = fee.balanceInINR <= 0 ? 'paid' : 'partially_paid';
      if (fee.status === 'paid') fee.paidAt = new Date();
      await fee.save();
      await require('./estateAuditService').record({ estateCaseId: fee.estateCaseId, userId: fee.userId, actorId: payload.recordedBy, action: 'settlement_fee_payment_recorded', entityType: 'SettlementFee', entityId: fee._id, before, after: this.feeSnapshot(fee) });
      return fee;
    } catch (error) {
      logger.error('Legacy Guard fee payment failed:', { feeId, error: error.message });
      throw new Error(`Failed to record settlement payment: ${error.message}`);
    }
  }

  async requestWaiver(feeId, actorId, reason) {
    try {
      if (!reason) throw new Error('Waiver reason is required');
      const SettlementFee = require('../../models/SettlementFee');
      const fee = await SettlementFee.findById(feeId);
      if (!fee) throw new Error('Settlement fee not found');
      const before = this.feeSnapshot(fee);
      fee.waiver = { ...(fee.waiver || {}), requested: true, reason, requestedBy: actorId, requestedAt: new Date(), waived: false };
      await fee.save();
      await require('./estateAuditService').record({ estateCaseId: fee.estateCaseId, userId: fee.userId, actorId, action: 'settlement_fee_waiver_requested', entityType: 'SettlementFee', entityId: fee._id, before, after: this.feeSnapshot(fee), reason });
      return fee;
    } catch (error) {
      logger.error('Legacy Guard fee waiver request failed:', { feeId, error: error.message });
      throw new Error(`Failed to request settlement fee waiver: ${error.message}`);
    }
  }

  async waive(feeId, actorId, reason) {
    try {
      if (!reason) throw new Error('Waiver reason is required');
      const SettlementFee = require('../../models/SettlementFee');
      const fee = await SettlementFee.findById(feeId);
      if (!fee) throw new Error('Settlement fee not found');
      const before = this.feeSnapshot(fee);
      fee.status = 'waived';
      fee.balanceInINR = 0;
      fee.waiver = { ...(fee.waiver || {}), waived: true, reason, approvedBy: actorId, approvedAt: new Date() };
      await fee.save();
      await require('./estateAuditService').record({ estateCaseId: fee.estateCaseId, userId: fee.userId, actorId, action: 'settlement_fee_waived', entityType: 'SettlementFee', entityId: fee._id, before, after: this.feeSnapshot(fee), reason });
      return fee;
    } catch (error) {
      logger.error('Legacy Guard fee waiver failed:', { feeId, error: error.message });
      throw new Error(`Failed to waive settlement fee: ${error.message}`);
    }
  }

  async getStatement(estateCaseId) {
    try {
      const SettlementFee = require('../../models/SettlementFee');
      const fee = await SettlementFee.findOne({ estateCaseId }).lean();
      const computed = await this.computeFee(estateCaseId);
      const ledger = fee ? this.buildLedger(fee) : [];
      return { fee, computed, ledger, balanceInINR: fee?.balanceInINR ?? computed.totalPayableInINR };
    } catch (error) {
      logger.error('Legacy Guard fee statement failed:', { estateCaseId, error: error.message });
      throw new Error(`Failed to get settlement fee statement: ${error.message}`);
    }
  }

  buildLedger(fee) {
    const entries = [];
    entries.push({ at: fee.issuedAt, type: 'invoice', description: fee.invoiceNumber, debitInINR: fee.totalPayableInINR, creditInINR: 0, balanceInINR: fee.totalPayableInINR });
    let balance = Number(fee.totalPayableInINR || 0);
    for (const payment of fee.payments || []) {
      balance = roundMoney(balance - Number(payment.amountInINR || 0));
      entries.push({ at: payment.receivedAt, type: 'payment', description: payment.reference || payment.method, debitInINR: 0, creditInINR: payment.amountInINR, balanceInINR: balance });
    }
    if (fee.waiver?.waived) entries.push({ at: fee.waiver.approvedAt, type: 'waiver', description: fee.waiver.reason, debitInINR: 0, creditInINR: balance, balanceInINR: 0 });
    return entries.sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0));
  }

  lineItemForAsset(asset, percentage) {
    const recoveredInINR = roundMoney(asset.recoveredValueInINR || 0);
    return { estateAssetId: asset._id, sourceModel: asset.sourceModel, sourceId: asset.sourceId, description: asset.title || asset.category, recoveredInINR, feeInINR: roundMoney(recoveredInINR * (percentage / 100)) };
  }

  apportionCaps(items, cappedGrossFee) {
    const rawTotal = roundMoney(items.reduce((sum, item) => sum + item.feeInINR, 0));
    if (!rawTotal || rawTotal === cappedGrossFee) return items;
    return items.map(item => ({ ...item, feeInINR: roundMoney((item.feeInINR / rawTotal) * cappedGrossFee) }));
  }

  async generateInvoiceNumber(SettlementFee) {
    if (typeof SettlementFee.generateInvoiceNumber === 'function') return SettlementFee.generateInvoiceNumber();
    return `${CASE_NUMBER_PREFIX.invoice}-${Date.now()}`;
  }

  feeSnapshot(fee) {
    return { status: fee.status, invoiceNumber: fee.invoiceNumber, basisAmountInINR: fee.basisAmountInINR, totalPayableInINR: fee.totalPayableInINR, amountPaidInINR: fee.amountPaidInINR, balanceInINR: fee.balanceInINR, waiver: fee.waiver };
  }
}

const settlementFeeService = new SettlementFeeService();
module.exports = settlementFeeService;
module.exports.SettlementFeeService = SettlementFeeService;
