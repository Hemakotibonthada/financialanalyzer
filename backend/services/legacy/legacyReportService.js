const logger = require('../../utils/logger');
const { roundMoney } = require('../../constants/legacyConstants');

class LegacyReportService {
  async caseSummaryReport(filters = {}) {
    try {
      const [funnel, falseAlarmRate, slaCompliance] = await Promise.all([
        this.caseFunnelReport(filters),
        this.falseAlarmRateReport(filters),
        this.slaComplianceReport(filters)
      ]);
      return { funnel, falseAlarmRate, slaCompliance };
    } catch (error) {
      logger.error('Legacy Guard case summary report failed:', error);
      throw new Error(`Failed to build case summary report: ${error.message}`);
    }
  }

  async caseFunnelReport(filters = {}) {
    try {
      const DormancyCase = require('../../models/DormancyCase');
      const EstateCase = require('../../models/EstateCase');
      const [dormancyStages, estateStatuses] = await Promise.all([
        DormancyCase.aggregate([
          { $match: this.dateMatch(filters, 'detectedAt') },
          { $group: { _id: '$stage', cases: { $sum: 1 }, open: { $sum: { $cond: [{ $in: ['$status', ['open', 'in_progress', 'awaiting_user', 'awaiting_nominee']] }, 1, 0] } } } },
          { $sort: { _id: 1 } }
        ]),
        EstateCase.aggregate([
          { $match: this.dateMatch(filters) },
          { $group: { _id: '$status', cases: { $sum: 1 }, recoveredInINR: { $sum: '$totals.recoveredInINR' }, feeInINR: { $sum: '$totals.feeInINR' } } },
          { $sort: { _id: 1 } }
        ])
      ]);
      return { dormancyStages, estateStatuses };
    } catch (error) {
      logger.error('Legacy Guard case funnel report failed:', error);
      throw new Error(`Failed to build case funnel report: ${error.message}`);
    }
  }

  async recoveryPerformanceReport(filters = {}) {
    try {
      const EstateAsset = require('../../models/EstateAsset');
      const rows = await EstateAsset.aggregate([
        { $match: { ...this.dateMatch(filters, 'discoveredAt'), kind: 'asset' } },
        { $group: { _id: '$category', discovered: { $sum: '$estimatedValueInINR' }, recovered: { $sum: '$recoveredValueInINR' }, count: { $sum: 1 }, recoveredCount: { $sum: { $cond: [{ $in: ['$status', ['recovered', 'partially_recovered']] }, 1, 0] } } } },
        { $sort: { recovered: -1 } }
      ]);
      return rows.map(row => ({ ...row, recoveryRate: row.discovered ? roundMoney((row.recovered / row.discovered) * 100) : 0 }));
    } catch (error) {
      logger.error('Legacy Guard recovery performance report failed:', error);
      throw new Error(`Failed to build recovery performance report: ${error.message}`);
    }
  }

  async averageDaysToSettleReport(filters = {}) {
    try {
      const RecoveryClaim = require('../../models/RecoveryClaim');
      return await RecoveryClaim.aggregate([
        { $match: { ...this.dateMatch(filters, 'createdAt'), settledAt: { $exists: true, $ne: null } } },
        { $project: { claimType: 1, daysToSettle: { $divide: [{ $subtract: ['$settledAt', '$createdAt'] }, 86400000] } } },
        { $group: { _id: '$claimType', count: { $sum: 1 }, avgDaysToSettle: { $avg: '$daysToSettle' }, minDays: { $min: '$daysToSettle' }, maxDays: { $max: '$daysToSettle' } } },
        { $sort: { avgDaysToSettle: 1 } }
      ]);
    } catch (error) {
      logger.error('Legacy Guard days-to-settle report failed:', error);
      throw new Error(`Failed to build days-to-settle report: ${error.message}`);
    }
  }

  async feeRevenueReport(filters = {}) {
    try {
      const SettlementFee = require('../../models/SettlementFee');
      return await SettlementFee.aggregate([
        { $match: this.dateMatch(filters, 'issuedAt') },
        { $project: { status: 1, totalPayableInINR: 1, amountPaidInINR: 1, balanceInINR: 1, period: { $dateToString: { format: '%Y-%m', date: '$issuedAt' } } } },
        { $group: { _id: { period: '$period', status: '$status' }, invoices: { $sum: 1 }, billed: { $sum: '$totalPayableInINR' }, paid: { $sum: '$amountPaidInINR' }, balance: { $sum: '$balanceInINR' } } },
        { $sort: { '_id.period': 1 } }
      ]);
    } catch (error) {
      logger.error('Legacy Guard fee revenue report failed:', error);
      throw new Error(`Failed to build fee revenue report: ${error.message}`);
    }
  }

  async falseAlarmRateReport(filters = {}) {
    try {
      const DormancyCase = require('../../models/DormancyCase');
      const EstateCase = require('../../models/EstateCase');
      const [dormancy, estate] = await Promise.all([
        DormancyCase.aggregate([{ $match: this.dateMatch(filters, 'detectedAt') }, { $group: { _id: null, total: { $sum: 1 }, falseAlarms: { $sum: { $cond: [{ $eq: ['$status', 'closed_false_alarm'] }, 1, 0] } }, alive: { $sum: { $cond: [{ $eq: ['$status', 'closed_alive'] }, 1, 0] } } } }]),
        EstateCase.aggregate([{ $match: this.dateMatch(filters) }, { $group: { _id: null, total: { $sum: 1 }, revoked: { $sum: { $cond: [{ $eq: ['$status', 'revoked'] }, 1, 0] } }, rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } } } }])
      ]);
      const d = dormancy[0] || { total: 0, falseAlarms: 0, alive: 0 };
      const e = estate[0] || { total: 0, revoked: 0, rejected: 0 };
      return { dormancy: { ...d, rate: d.total ? roundMoney(((d.falseAlarms + d.alive) / d.total) * 100) : 0 }, estate: { ...e, rate: e.total ? roundMoney(((e.revoked + e.rejected) / e.total) * 100) : 0 } };
    } catch (error) {
      logger.error('Legacy Guard false-alarm report failed:', error);
      throw new Error(`Failed to build false-alarm report: ${error.message}`);
    }
  }

  async slaComplianceReport(filters = {}) {
    try {
      const DormancyCase = require('../../models/DormancyCase');
      const RecoveryClaim = require('../../models/RecoveryClaim');
      const now = new Date();
      const [dormancy, claims] = await Promise.all([
        DormancyCase.aggregate([{ $match: { ...this.dateMatch(filters, 'detectedAt'), slaDueAt: { $exists: true } } }, { $group: { _id: '$stage', total: { $sum: 1 }, breached: { $sum: { $cond: [{ $and: [{ $lt: ['$slaDueAt', now] }, { $not: { $in: ['$status', ['closed_alive', 'closed_deceased', 'closed_false_alarm', 'cancelled']] } }] }, 1, 0] } } } }]),
        RecoveryClaim.aggregate([{ $match: { ...this.dateMatch(filters), slaDueAt: { $exists: true } } }, { $group: { _id: '$claimType', total: { $sum: 1 }, breached: { $sum: { $cond: [{ $and: [{ $lt: ['$slaDueAt', now] }, { $not: { $in: ['$status', ['settled', 'withdrawn']] } }] }, 1, 0] } } } }])
      ]);
      return { dormancy: dormancy.map(this.withSlaRate), claims: claims.map(this.withSlaRate) };
    } catch (error) {
      logger.error('Legacy Guard SLA compliance report failed:', error);
      throw new Error(`Failed to build SLA compliance report: ${error.message}`);
    }
  }

  async agentWorkloadReport(filters = {}) {
    try {
      const SupportInteraction = require('../../models/SupportInteraction');
      const RecoveryClaim = require('../../models/RecoveryClaim');
      const [outreach, claims] = await Promise.all([
        SupportInteraction.aggregate([
          { $match: this.dateMatch(filters, 'occurredAt') },
          {
            $group: {
              _id: '$agentId',
              interactions: { $sum: 1 },
              followUps: { $sum: { $cond: ['$followUpRequired', 1, 0] } },
              successfulContacts: { $sum: { $cond: [{ $in: ['$outcome', ['reached_user', 'confirmed_alive', 'reached_family']] }, 1, 0] } }
            }
          }
        ]),
        RecoveryClaim.aggregate([
          { $match: this.dateMatch(filters) },
          {
            $group: {
              _id: '$assignedTo',
              claims: { $sum: 1 },
              settledClaims: { $sum: { $cond: [{ $eq: ['$status', 'settled'] }, 1, 0] } },
              recovered: { $sum: '$receivedAmountInINR' }
            }
          }
        ])
      ]);
      return { outreach, claims };
    } catch (error) {
      logger.error('Legacy Guard agent workload report failed:', error);
      throw new Error(`Failed to build agent workload report: ${error.message}`);
    }
  }

  async exportReportCsv(reportName, filters = {}) {
    try {
      const report = await this.runReport(reportName, filters);
      const rows = Array.isArray(report) ? report : this.flattenReport(report);
      return this.exportCsv(rows);
    } catch (error) {
      logger.error('Legacy Guard report CSV export failed:', { reportName, error: error.message });
      throw new Error(`Failed to export ${reportName} report CSV: ${error.message}`);
    }
  }

  async runReport(reportName, filters = {}) {
    const reports = {
      caseSummary: () => this.caseSummaryReport(filters),
      caseFunnel: () => this.caseFunnelReport(filters),
      recoveryPerformance: () => this.recoveryPerformanceReport(filters),
      averageDaysToSettle: () => this.averageDaysToSettleReport(filters),
      feeRevenue: () => this.feeRevenueReport(filters),
      falseAlarmRate: () => this.falseAlarmRateReport(filters),
      slaCompliance: () => this.slaComplianceReport(filters),
      agentWorkload: () => this.agentWorkloadReport(filters)
    };
    if (!reports[reportName]) throw new Error(`Unknown report: ${reportName}`);
    return reports[reportName]();
  }

  exportCsv(rows = []) {
    try {
      if (!Array.isArray(rows) || !rows.length) return '';
      const headers = Array.from(rows.reduce((set, row) => {
        Object.keys(row || {}).forEach(key => set.add(key));
        return set;
      }, new Set()));
      const escape = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
      return [headers.join(','), ...rows.map(row => headers.map(header => escape(typeof row[header] === 'object' ? JSON.stringify(row[header]) : row[header])).join(','))].join('\n');
    } catch (error) {
      logger.error('Legacy Guard CSV export failed:', error);
      throw new Error(`Failed to export Legacy Guard CSV: ${error.message}`);
    }
  }

  flattenReport(report, prefix = '') {
    if (Array.isArray(report)) return report;
    const rows = [];
    for (const [key, value] of Object.entries(report || {})) {
      if (Array.isArray(value)) rows.push(...value.map(row => ({ report: prefix + key, ...row })));
      else if (value && typeof value === 'object') rows.push(...this.flattenReport(value, `${prefix}${key}.`));
      else rows.push({ metric: prefix + key, value });
    }
    return rows;
  }

  dateMatch(filters = {}, field = 'createdAt') {
    const match = {};
    if (filters.from || filters.to) {
      match[field] = {};
      if (filters.from) match[field].$gte = new Date(filters.from);
      if (filters.to) match[field].$lte = new Date(filters.to);
    }
    if (filters.status) match.status = filters.status;
    if (filters.assignedTo) match.assignedTo = filters.assignedTo;
    return match;
  }

  withSlaRate(row) {
    return { ...row, compliant: row.total - row.breached, complianceRate: row.total ? roundMoney(((row.total - row.breached) / row.total) * 100) : 100 };
  }
}

const legacyReportService = new LegacyReportService();
module.exports = legacyReportService;
module.exports.LegacyReportService = LegacyReportService;
