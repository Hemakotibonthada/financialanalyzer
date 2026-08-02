const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const {
  DISCOVERY_SOURCE_MAP,
  RECOVERED_ASSET_STATUSES,
  maskValue,
  roundMoney
} = require('../../constants/legacyConstants');

const SETTLED_STATUSES = Object.freeze(['fully_paid', 'paid', 'closed', 'settled', 'written_off', 'inactive', 'cancelled', 'lapsed']);

class AssetDiscoveryService {
  constructor() {
    this.handlers = {
      InsurancePolicy: this.discoverInsurancePolicy.bind(this),
      LoanGiven: this.discoverLoanGiven.bind(this),
      Investment: this.discoverInvestment.bind(this),
      Portfolio: this.discoverPortfolio.bind(this),
      BankAccount: this.discoverBankAccount.bind(this),
      RealEstate: this.discoverRealEstate.bind(this),
      RetirementPlan: this.discoverRetirementPlan.bind(this),
      FinancialGoal: this.discoverFinancialGoal.bind(this),
      EMI: this.discoverEMI.bind(this),
      PersonalLoan: this.discoverPersonalLoan.bind(this),
      CreditCardBill: this.discoverCreditCardBill.bind(this),
      Debt: this.discoverDebt.bind(this),
      LenderLoan: this.discoverLenderLoan.bind(this)
    };
  }

  async discoverForUser(userId, estateCaseId) {
    try {
      const EstateAsset = require('../../models/EstateAsset');
      const EstateCase = require('../../models/EstateCase');
      const before = await this.currentTotals(estateCaseId);
      const discovered = [];

      for (const entry of DISCOVERY_SOURCE_MAP) {
        const Model = this.resolveModel(entry.model);
        if (!Model) continue;
        const docs = await this.querySource(Model, entry.model, userId);
        for (const doc of docs) {
          const normalized = this.normalizeDocument(entry, doc);
          if (!normalized || this.shouldSkip(normalized, doc)) continue;
          const asset = await EstateAsset.findOneAndUpdate(
            { estateCaseId, sourceModel: entry.model, sourceId: doc._id },
            { $set: { ...normalized, estateCaseId, userId }, $setOnInsert: { status: 'discovered', recoveredValueInINR: 0 } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          discovered.push(asset);
        }
      }

      const allAssets = await EstateAsset.find({ estateCaseId }).lean();
      const summary = this.summarize(allAssets);
      await EstateCase.findByIdAndUpdate(estateCaseId, {
        $set: {
          'totals.discoveredAssetsInINR': summary.discoveredAssetsInINR,
          'totals.discoveredLiabilitiesInINR': summary.discoveredLiabilitiesInINR,
          'totals.recoveredInINR': summary.recoveredInINR,
          'totals.netEstateInINR': summary.netEstateInINR
        }
      });
      await require('./estateAuditService').record({ estateCaseId, userId, action: 'estate_assets_discovered', entityType: 'EstateAsset', before, after: summary });
      return { assets: allAssets.filter(a => a.kind === 'asset'), liabilities: allAssets.filter(a => a.kind === 'liability'), summary };
    } catch (error) {
      logger.error('Legacy Guard asset discovery failed:', { userId, estateCaseId, error: error.message });
      throw new Error(`Failed to discover estate assets: ${error.message}`);
    }
  }

  async reconcileForUser(userId, estateCaseId) {
    try {
      const EstateAsset = require('../../models/EstateAsset');
      const before = await EstateAsset.find({ estateCaseId }).lean();
      const beforeMap = new Map(before.map(a => [this.sourceKey(a), a]));
      const discovery = await this.discoverForUser(userId, estateCaseId);
      const after = await EstateAsset.find({ estateCaseId }).lean();
      const afterMap = new Map(after.map(a => [this.sourceKey(a), a]));
      const added = [];
      const valueChanged = [];
      const disappeared = [];

      for (const [key, item] of afterMap.entries()) {
        const previous = beforeMap.get(key);
        if (!previous) added.push(item);
        else if (roundMoney(previous.estimatedValueInINR) !== roundMoney(item.estimatedValueInINR)) {
          valueChanged.push({ asset: item, before: previous.estimatedValueInINR, after: item.estimatedValueInINR });
        }
      }

      for (const [key, item] of beforeMap.entries()) {
        if (!afterMap.has(key)) disappeared.push(item);
      }

      const reconciliation = { added, valueChanged, disappeared, summary: discovery.summary };
      await require('./estateAuditService').record({ estateCaseId, userId, action: 'estate_assets_reconciled', entityType: 'EstateAsset', after: { added: added.length, valueChanged: valueChanged.length, disappeared: disappeared.length, summary: discovery.summary } });
      return reconciliation;
    } catch (error) {
      logger.error('Legacy Guard asset reconciliation failed:', { userId, estateCaseId, error: error.message });
      throw new Error(`Failed to reconcile estate assets: ${error.message}`);
    }
  }

  normalizeDocument(entry, doc) {
    const handler = this.handlers[entry.model] || this.discoverGeneric.bind(this);
    const normalized = handler(entry, doc);
    if (!normalized) return null;
    const confidence = this.valueConfidence(normalized, doc);
    return {
      kind: entry.kind,
      category: entry.category,
      sourceModel: entry.model,
      sourceId: doc._id,
      currency: doc.currency || 'INR',
      exchangeRate: doc.exchangeRate || 1,
      discoveryMethod: 'auto_scan',
      discoveredAt: new Date(),
      valueConfidence: confidence,
      recoverability: this.recoverabilityFor(entry, doc, normalized, confidence),
      notes: this.discoveryAdvice(entry, normalized),
      ...normalized,
      estimatedValue: roundMoney(normalized.estimatedValueInINR),
      estimatedValueInINR: roundMoney(normalized.estimatedValueInINR)
    };
  }

  discoverInsurancePolicy(entry, doc) {
    const value = this.firstFinite(doc, ['sumAssuredInINR', 'sumAssured', 'policyDetails.coverageAmount', 'policyDetails.maturityAmount', 'insured.0.sumInsured']);
    return { title: this.firstText(doc, ['policyName', 'policyType', 'provider.name', 'provider']), institution: this.firstText(doc, ['provider.name', 'provider']), identifierMasked: maskValue(doc.provider?.policyNumber || doc.policyNumber), estimatedValueInINR: value };
  }

  discoverLoanGiven(entry, doc) {
    const repaid = this.firstFinite(doc, ['totalRepaidInINR', 'totalRepaid']) || 0;
    const fallback = (this.firstFinite(doc, ['amountInINR', 'amount']) || 0) - repaid;
    const value = this.firstFinite(doc, ['remainingAmountInINR', 'remainingAmount']) || fallback;
    return { title: this.firstText(doc, ['borrowerName', 'purpose']) || 'Loan given', institution: null, estimatedValueInINR: value, counterparty: { name: doc.borrowerName, relationship: doc.relationship, phone: maskValue(doc.contactDetails?.phone), email: maskValue(doc.contactDetails?.email) } };
  }

  discoverInvestment(entry, doc) {
    return { title: this.firstText(doc, ['name', 'investmentType', 'schemeName', 'symbol']), institution: this.firstText(doc, ['platform', 'broker', 'fundHouse']), identifierMasked: maskValue(doc.folio || doc.isin), estimatedValueInINR: this.firstFinite(doc, ['currentValueInINR', 'currentValue', 'totalInvestedAmount', 'investedAmountInINR', 'amount']) };
  }

  discoverPortfolio(entry, doc) {
    return { title: this.firstText(doc, ['name', 'portfolioName']), institution: this.firstText(doc, ['broker', 'platform']), estimatedValueInINR: this.firstFinite(doc, ['totalValueInINR', 'currentValue', 'totalValue']) };
  }

  discoverBankAccount(entry, doc) {
    return { title: this.firstText(doc, ['accountName', 'nickname', 'bankName']), institution: this.firstText(doc, ['bankName', 'bank']), identifierMasked: maskValue(doc.accountNumber), estimatedValueInINR: this.firstFinite(doc, ['balanceInINR', 'currentBalance', 'balance']) };
  }

  discoverRealEstate(entry, doc) {
    return { title: this.firstText(doc, ['propertyName', 'name', 'address.line1', 'address']), institution: null, estimatedValueInINR: this.firstFinite(doc, ['currentValuationInINR', 'currentValuation', 'currentValue', 'purchasePrice']) };
  }

  discoverRetirementPlan(entry, doc) {
    return { title: this.firstText(doc, ['planName', 'name', 'planType']), institution: this.firstText(doc, ['provider']), identifierMasked: maskValue(doc.accountNumber || doc.pran), estimatedValueInINR: this.firstFinite(doc, ['currentCorpusInINR', 'currentCorpus', 'accumulatedAmount']) };
  }

  discoverFinancialGoal(entry, doc) {
    return { title: this.firstText(doc, ['title', 'name', 'goalName']), institution: null, estimatedValueInINR: this.firstFinite(doc, ['currentAmountInINR', 'currentAmount', 'savedAmount']) };
  }

  discoverEMI(entry, doc) {
    return { title: this.firstText(doc, ['merchantName', 'productDescription']), institution: this.firstText(doc, ['bankName', 'merchantName']), estimatedValueInINR: this.firstFinite(doc, ['outstandingAmountInINR', 'remainingAmount', 'principalAmount']) };
  }

  discoverPersonalLoan(entry, doc) {
    return { title: this.firstText(doc, ['lenderName', 'purpose']), institution: this.firstText(doc, ['lenderName']), estimatedValueInINR: this.firstFinite(doc, ['remainingAmountInINR', 'remainingAmount', 'amountInINR']) };
  }

  discoverCreditCardBill(entry, doc) {
    return { title: this.firstText(doc, ['cardName', 'bankName']), institution: this.firstText(doc, ['bankName']), identifierMasked: maskValue(doc.cardNumber), estimatedValueInINR: this.firstFinite(doc, ['totalDueInINR', 'totalDue', 'outstandingAmount']) };
  }

  discoverDebt(entry, doc) {
    return { title: this.firstText(doc, ['name', 'debtType', 'creditorName']), institution: this.firstText(doc, ['creditorName', 'lender']), estimatedValueInINR: this.firstFinite(doc, ['currentBalanceInINR', 'currentBalance', 'balance']) };
  }

  discoverLenderLoan(entry, doc) {
    return { title: this.firstText(doc, ['loanType', 'purpose']), institution: this.firstText(doc, ['lenderName']), estimatedValueInINR: this.firstFinite(doc, ['outstandingAmountInINR', 'outstandingAmount', 'principalAmount']) };
  }

  discoverGeneric(entry, doc) {
    return { title: this.firstText(doc, entry.titleFields), institution: this.firstText(doc, entry.institutionFields), estimatedValueInINR: this.firstFinite(doc, entry.valueFields) };
  }

  shouldSkip(normalized, doc) {
    if (!Number.isFinite(Number(normalized.estimatedValueInINR)) || Number(normalized.estimatedValueInINR) <= 0) return true;
    const status = String(doc.status || doc.paymentStatus || doc.claimStatus || '').toLowerCase();
    return SETTLED_STATUSES.includes(status);
  }

  recoverabilityFor(entry, doc, normalized, confidence) {
    if (entry.kind === 'liability') return 'unknown';
    if (entry.category === 'loan_given') {
      const relationship = String(doc.relationship || '').toLowerCase();
      const hasAgreement = Boolean(doc.agreementDocument || doc.documentId || doc.notes?.toLowerCase?.().includes('agreement'));
      if (!hasAgreement && ['friend', 'colleague', 'other'].includes(relationship)) return 'low';
      return hasAgreement ? 'medium' : 'low';
    }
    if (entry.category === 'real_estate') return confidence >= 0.8 ? 'medium' : 'low';
    if (['insurance', 'investment', 'portfolio', 'bank_deposit'].includes(entry.category)) return confidence >= 0.6 ? 'high' : 'medium';
    return entry.recoverability || 'unknown';
  }

  valueConfidence(normalized, doc) {
    let score = 0.45;
    if (normalized.estimatedValueInINR > 0) score += 0.2;
    if (doc.lastUpdated || doc.updatedAt) score += 0.1;
    if (normalized.identifierMasked || normalized.institution) score += 0.1;
    if (normalized.category === 'real_estate' || normalized.title?.toLowerCase?.().includes('property')) score -= 0.1;
    return Math.max(0.1, Math.min(0.95, roundMoney(score)));
  }

  discoveryAdvice(entry, normalized) {
    if (entry.kind === 'liability') return 'Liability discovered; net against recovered estate before family advice.';
    if (entry.category === 'loan_given') return 'Recoverability depends on written agreement and borrower cooperation.';
    if (entry.category === 'insurance') return 'Verify policy status and nominee before initiating claim.';
    return 'Auto-discovered from user financial records; verify supporting documents before claim.';
  }

  summarize(items) {
    const assets = items.filter(i => i.kind === 'asset');
    const liabilities = items.filter(i => i.kind === 'liability');
    const discoveredAssetsInINR = roundMoney(assets.reduce((sum, i) => sum + Number(i.estimatedValueInINR || 0), 0));
    const discoveredLiabilitiesInINR = roundMoney(liabilities.reduce((sum, i) => sum + Number(i.estimatedValueInINR || 0), 0));
    const recoveredInINR = roundMoney(assets.filter(i => RECOVERED_ASSET_STATUSES.includes(i.status)).reduce((sum, i) => sum + Number(i.recoveredValueInINR || 0), 0));
    const netEstateInINR = roundMoney(discoveredAssetsInINR - discoveredLiabilitiesInINR);
    return { count: items.length, assetCount: assets.length, liabilityCount: liabilities.length, discoveredAssetsInINR, discoveredLiabilitiesInINR, recoveredInINR, netEstateInINR, insolventEstate: discoveredLiabilitiesInINR > discoveredAssetsInINR, advice: discoveredLiabilitiesInINR > discoveredAssetsInINR ? 'Liabilities exceed assets; advise family before pursuing recoveries or disbursement.' : 'Assets exceed liabilities; proceed with verification and recovery prioritization.' };
  }

  async currentTotals(estateCaseId) {
    const EstateAsset = require('../../models/EstateAsset');
    return this.summarize(await EstateAsset.find({ estateCaseId }).lean());
  }

  resolveModel(name) {
    try {
      return mongoose.model(name);
    } catch (error) {
      try {
        require(`../../models/${name}`);
        return mongoose.model(name);
      } catch (innerError) {
        logger.debug('Legacy Guard discovery skipped missing model:', { model: name });
        return null;
      }
    }
  }

  async querySource(Model, modelName, userId) {
    try {
      return await Model.find({ userId }).lean();
    } catch (error) {
      logger.warn('Legacy Guard discovery source query failed:', { model: modelName, userId, error: error.message });
      return [];
    }
  }

  firstFinite(doc, fields = []) {
    for (const field of fields || []) {
      const value = Number(this.getPath(doc, field));
      if (Number.isFinite(value)) return value;
    }
    return NaN;
  }

  firstText(doc, fields = []) {
    for (const field of fields || []) {
      const value = this.getPath(doc, field);
      if (value && typeof value === 'object' && value.name) return String(value.name);
      if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
    }
    return null;
  }

  getPath(obj, path) {
    return String(path).split('.').reduce((acc, key) => acc?.[key], obj);
  }

  sourceKey(asset) {
    return `${asset.sourceModel}:${asset.sourceId}`;
  }
}

const assetDiscoveryService = new AssetDiscoveryService();
module.exports = assetDiscoveryService;
module.exports.AssetDiscoveryService = AssetDiscoveryService;
