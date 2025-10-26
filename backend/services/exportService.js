const ExcelJS = require('exceljs');
const Transaction = require('../models/Transaction');
const EMI = require('../models/EMI');
const FinancialProfile = require('../models/FinancialProfile');
const logger = require('../utils/logger');

/**
 * Export transactions to Excel
 */
const exportTransactionsToExcel = async (userId, startDate, endDate, filters = {}) => {
  try {
    // Build query
    const query = {
      userId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    };

    // Apply filters
    if (filters.category) {
      query.category = filters.category;
    }
    if (filters.type) {
      query.type = filters.type;
    }
    if (filters.minAmount || filters.maxAmount) {
      query.amount = {};
      if (filters.minAmount) query.amount.$gte = filters.minAmount;
      if (filters.maxAmount) query.amount.$lte = filters.maxAmount;
    }

    // Fetch transactions
    const transactions = await Transaction.find(query)
      .sort({ date: -1 })
      .lean();

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transactions');

    // Set up columns
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Merchant', key: 'merchantName', width: 20 },
      { header: 'Payment Method', key: 'paymentMethod', width: 15 },
      { header: 'Source', key: 'source', width: 12 },
      { header: 'Balance', key: 'balance', width: 12 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1976D2' }
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Add data rows
    transactions.forEach(transaction => {
      worksheet.addRow({
        date: new Date(transaction.date).toLocaleDateString(),
        description: transaction.description || '',
        amount: transaction.amount || 0,
        type: transaction.type || '',
        category: transaction.category || '',
        merchantName: transaction.merchantName || '',
        paymentMethod: transaction.paymentMethod || '',
        source: transaction.source || '',
        balance: transaction.balance || ''
      });
    });

    // Add summary rows
    const totalDebit = transactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalCredit = transactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    worksheet.addRow({});
    worksheet.addRow({ description: 'Total Debits:', amount: totalDebit });
    worksheet.addRow({ description: 'Total Credits:', amount: totalCredit });
    worksheet.addRow({ description: 'Net:', amount: totalCredit - totalDebit });

    // Style summary rows
    const lastRow = worksheet.rowCount;
    for (let i = lastRow - 2; i <= lastRow; i++) {
      worksheet.getRow(i).font = { bold: true };
    }

    // Return buffer
    return await workbook.xlsx.writeBuffer();
  } catch (error) {
    logger.error('Export transactions to Excel error:', error);
    throw error;
  }
};

/**
 * Export EMI schedule to Excel
 */
const exportEMIScheduleToExcel = async (userId) => {
  try {
    // Fetch all active EMIs
    const emis = await EMI.find({ userId, status: { $ne: 'CLOSED' } })
      .sort({ startDate: -1 })
      .lean();

    // Create workbook
    const workbook = new ExcelJS.Workbook();

    // Summary worksheet
    const summarySheet = workbook.addWorksheet('EMI Summary');
    summarySheet.columns = [
      { header: 'Merchant', key: 'merchant', width: 20 },
      { header: 'Card Provider', key: 'cardProvider', width: 15 },
      { header: 'Principal Amount', key: 'principal', width: 15 },
      { header: 'Interest Rate', key: 'interestRate', width: 12 },
      { header: 'EMI Amount', key: 'emiAmount', width: 12 },
      { header: 'Total Tenure', key: 'totalTenure', width: 12 },
      { header: 'Paid', key: 'paid', width: 10 },
      { header: 'Remaining', key: 'remaining', width: 10 },
      { header: 'Start Date', key: 'startDate', width: 12 },
      { header: 'Next Due', key: 'nextDue', width: 12 },
      { header: 'Status', key: 'status', width: 10 }
    ];

    // Style header
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1976D2' }
    };
    summarySheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Add EMI data
    emis.forEach(emi => {
      summarySheet.addRow({
        merchant: emi.merchantName,
        cardProvider: emi.cardProvider,
        principal: emi.principalAmount,
        interestRate: `${emi.interestRate}%`,
        emiAmount: emi.emiAmount,
        totalTenure: emi.totalTenure,
        paid: emi.paidInstallments,
        remaining: emi.remainingInstallments,
        startDate: new Date(emi.startDate).toLocaleDateString(),
        nextDue: emi.nextDueDate ? new Date(emi.nextDueDate).toLocaleDateString() : 'N/A',
        status: emi.status
      });
    });

    // Add totals
    summarySheet.addRow({});
    summarySheet.addRow({
      merchant: 'Total Outstanding:',
      principal: emis.reduce((sum, e) => sum + (e.principalAmount * (e.remainingInstallments / e.totalTenure)), 0).toFixed(2)
    });

    // Create detailed schedule for each EMI
    for (const emi of emis) {
      const sheetName = `${emi.merchantName.substring(0, 20)} ${emi.cardLastFourDigits}`;
      const detailSheet = workbook.addWorksheet(sheetName);

      detailSheet.columns = [
        { header: 'Month', key: 'month', width: 10 },
        { header: 'Due Date', key: 'dueDate', width: 12 },
        { header: 'EMI Amount', key: 'emiAmount', width: 12 },
        { header: 'Principal', key: 'principal', width: 12 },
        { header: 'Interest', key: 'interest', width: 12 },
        { header: 'Outstanding', key: 'outstanding', width: 15 },
        { header: 'Status', key: 'status', width: 10 }
      ];

      // Style header
      detailSheet.getRow(1).font = { bold: true };
      detailSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4CAF50' }
      };
      detailSheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

      // Calculate schedule
      let outstanding = emi.principalAmount;
      const monthlyRate = emi.interestRate / 100 / 12;

      for (let i = 1; i <= emi.totalTenure; i++) {
        const interest = outstanding * monthlyRate;
        const principal = emi.emiAmount - interest;
        outstanding -= principal;

        const dueDate = new Date(emi.startDate);
        dueDate.setMonth(dueDate.getMonth() + i - 1);

        detailSheet.addRow({
          month: i,
          dueDate: dueDate.toLocaleDateString(),
          emiAmount: emi.emiAmount.toFixed(2),
          principal: principal.toFixed(2),
          interest: interest.toFixed(2),
          outstanding: Math.max(0, outstanding).toFixed(2),
          status: i <= emi.paidInstallments ? 'PAID' : 'PENDING'
        });
      }
    }

    return await workbook.xlsx.writeBuffer();
  } catch (error) {
    logger.error('Export EMI schedule to Excel error:', error);
    throw error;
  }
};

/**
 * Export CIBIL report to Excel
 */
const exportCIBILReportToExcel = async (userId) => {
  try {
    const profile = await FinancialProfile.findOne({ userId }).lean();
    
    if (!profile || !profile.creditScore) {
      throw new Error('No CIBIL data found');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('CIBIL Report');

    // Add header
    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').value = 'CIBIL Credit Score Report';
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Add credit score info
    worksheet.addRow([]);
    worksheet.addRow(['Credit Score:', profile.creditScore.score || 'N/A']);
    worksheet.addRow(['Grade:', profile.creditScore.grade || 'N/A']);
    worksheet.addRow(['Last Updated:', profile.creditScore.lastUpdated ? new Date(profile.creditScore.lastUpdated).toLocaleDateString() : 'N/A']);
    worksheet.addRow([]);

    // Add factors affecting score
    if (profile.creditScore.factors && profile.creditScore.factors.length > 0) {
      worksheet.addRow(['Factors Affecting Score:']);
      worksheet.columns = [
        { header: 'Factor', key: 'factor', width: 25 },
        { header: 'Impact', key: 'impact', width: 15 },
        { header: 'Description', key: 'description', width: 40 }
      ];

      worksheet.getRow(7).font = { bold: true };
      
      profile.creditScore.factors.forEach(factor => {
        worksheet.addRow({
          factor: factor.factor || '',
          impact: factor.impact || '',
          description: factor.description || ''
        });
      });
    }

    // Add credit history if available
    if (profile.creditScore.creditHistory && profile.creditScore.creditHistory.length > 0) {
      worksheet.addRow([]);
      worksheet.addRow(['Credit History:']);
      
      const historyStartRow = worksheet.rowCount + 1;
      worksheet.addRow(['Month', 'Score', 'Inquiries', 'Accounts']);
      worksheet.getRow(historyStartRow).font = { bold: true };
      
      profile.creditScore.creditHistory.forEach(history => {
        worksheet.addRow([
          history.month || '',
          history.score || '',
          history.inquiries || 0,
          history.accounts || 0
        ]);
      });
    }

    return await workbook.xlsx.writeBuffer();
  } catch (error) {
    logger.error('Export CIBIL report to Excel error:', error);
    throw error;
  }
};

module.exports = {
  exportTransactionsToExcel,
  exportEMIScheduleToExcel,
  exportCIBILReportToExcel
};
