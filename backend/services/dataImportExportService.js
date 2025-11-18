const csv = require('csv-parser');
const { parse } = require('json2csv');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');

class DataImportExportService {
  // Import transactions from CSV
  async importTransactionsFromCSV(userId, filePath) {
    const transactions = [];
    const errors = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          try {
            const transaction = this.parseCSVRow(row, userId);
            if (transaction) {
              transactions.push(transaction);
            }
          } catch (error) {
            errors.push({ row, error: error.message });
          }
        })
        .on('end', async () => {
          try {
            if (transactions.length > 0) {
              await Transaction.insertMany(transactions);
            }
            resolve({
              imported: transactions.length,
              errors: errors.length,
              errorDetails: errors
            });
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  parseCSVRow(row, userId) {
    // Support multiple CSV formats
    const date = row.date || row.Date || row.DATE || row.transaction_date;
    const amount = row.amount || row.Amount || row.AMOUNT;
    const description = row.description || row.Description || row.DESCRIPTION || row.narration;
    const type = row.type || row.Type || row.TYPE || (parseFloat(amount) < 0 ? 'expense' : 'income');
    const category = row.category || row.Category || row.CATEGORY || 'Other';

    if (!date || !amount) {
      throw new Error('Missing required fields: date and amount');
    }

    return {
      userId,
      date: new Date(date),
      amount: Math.abs(parseFloat(amount)),
      description: description || 'Imported transaction',
      type: type.toLowerCase(),
      category,
      merchant: row.merchant || row.Merchant || row.MERCHANT,
      paymentMethod: row.payment_method || row['Payment Method'] || 'other',
      notes: row.notes || row.Notes,
      tags: row.tags ? row.tags.split(',').map(t => t.trim()) : [],
      imported: true,
      importedAt: new Date()
    };
  }

  // Import transactions from Excel
  async importTransactionsFromExcel(userId, filePath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.getWorksheet(1);
    const transactions = [];
    const errors = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      try {
        const transaction = {
          userId,
          date: new Date(row.getCell(1).value),
          amount: Math.abs(parseFloat(row.getCell(2).value)),
          description: row.getCell(3).value || 'Imported transaction',
          type: (row.getCell(4).value || 'expense').toLowerCase(),
          category: row.getCell(5).value || 'Other',
          merchant: row.getCell(6).value,
          paymentMethod: row.getCell(7).value || 'other',
          notes: row.getCell(8).value,
          imported: true,
          importedAt: new Date()
        };

        transactions.push(transaction);
      } catch (error) {
        errors.push({ rowNumber, error: error.message });
      }
    });

    if (transactions.length > 0) {
      await Transaction.insertMany(transactions);
    }

    return {
      imported: transactions.length,
      errors: errors.length,
      errorDetails: errors
    };
  }

  // Import from bank statement (OFX format)
  async importFromOFX(userId, filePath) {
    // OFX parsing implementation
    const ofx = require('ofx');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    return new Promise((resolve, reject) => {
      ofx.parse(fileContent, (error, data) => {
        if (error) return reject(error);

        try {
          const transactions = [];
          const bankTransactions = data.OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKTRANLIST.STMTTRN;

          for (const txn of bankTransactions) {
            transactions.push({
              userId,
              date: this.parseOFXDate(txn.DTPOSTED),
              amount: Math.abs(parseFloat(txn.TRNAMT)),
              description: txn.NAME || txn.MEMO || 'Bank transaction',
              type: parseFloat(txn.TRNAMT) < 0 ? 'expense' : 'income',
              category: this.categorizeTransaction(txn.NAME || txn.MEMO),
              transactionId: txn.FITID,
              imported: true,
              importedAt: new Date()
            });
          }

          Transaction.insertMany(transactions)
            .then(() => resolve({
              imported: transactions.length,
              errors: 0
            }))
            .catch(reject);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  parseOFXDate(dateString) {
    // OFX date format: YYYYMMDDHHMMSS
    const year = dateString.substr(0, 4);
    const month = dateString.substr(4, 2);
    const day = dateString.substr(6, 2);
    return new Date(`${year}-${month}-${day}`);
  }

  categorizeTransaction(description) {
    const desc = description.toLowerCase();
    
    if (desc.includes('grocery') || desc.includes('supermarket')) return 'Groceries';
    if (desc.includes('restaurant') || desc.includes('food')) return 'Food & Dining';
    if (desc.includes('fuel') || desc.includes('gas') || desc.includes('petrol')) return 'Transport';
    if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('amazon')) return 'Entertainment';
    if (desc.includes('electricity') || desc.includes('water') || desc.includes('rent')) return 'Bills';
    if (desc.includes('salary') || desc.includes('payroll')) return 'Salary';
    
    return 'Other';
  }

  // Export transactions to CSV
  async exportTransactionsToCSV(userId, startDate, endDate) {
    const transactions = await Transaction.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    }).lean();

    const fields = [
      { label: 'Date', value: 'date' },
      { label: 'Type', value: 'type' },
      { label: 'Category', value: 'category' },
      { label: 'Amount', value: 'amount' },
      { label: 'Description', value: 'description' },
      { label: 'Merchant', value: 'merchant' },
      { label: 'Payment Method', value: 'paymentMethod' },
      { label: 'Notes', value: 'notes' }
    ];

    const csv = parse(transactions, { fields });
    return csv;
  }

  // Export transactions to Excel
  async exportTransactionsToExcel(userId, startDate, endDate, password = null) {
    const transactions = await Transaction.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    }).lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transactions');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Merchant', key: 'merchant', width: 20 },
      { header: 'Payment Method', key: 'paymentMethod', width: 15 },
      { header: 'Notes', key: 'notes', width: 30 }
    ];

    transactions.forEach(t => {
      worksheet.addRow({
        date: t.date.toLocaleDateString(),
        type: t.type,
        category: t.category,
        amount: t.amount,
        description: t.description,
        merchant: t.merchant,
        paymentMethod: t.paymentMethod,
        notes: t.notes
      });
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };

    // Add password protection if provided
    if (password) {
      workbook.model.workbookProtection = {
        lockStructure: true,
        password: password
      };
    }

    return workbook.xlsx.writeBuffer();
  }

  // Export complete financial data
  async exportCompleteData(userId, password = null) {
    const [transactions, budgets, debts, portfolios] = await Promise.all([
      Transaction.find({ userId }).lean(),
      Budget.find({ userId }).lean(),
      require('../models/Debt').find({ userId }).lean(),
      require('../models/Portfolio').find({ userId }).lean()
    ]);

    const workbook = new ExcelJS.Workbook();

    // Transactions sheet
    const transSheet = workbook.addWorksheet('Transactions');
    transSheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Description', key: 'description', width: 30 }
    ];
    transactions.forEach(t => transSheet.addRow(t));

    // Budgets sheet
    const budgetSheet = workbook.addWorksheet('Budgets');
    budgetSheet.columns = [
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Spent', key: 'spent', width: 12 },
      { header: 'Month', key: 'month', width: 10 },
      { header: 'Year', key: 'year', width: 10 }
    ];
    budgets.forEach(b => budgetSheet.addRow(b));

    // Debts sheet
    const debtSheet = workbook.addWorksheet('Debts');
    debtSheet.columns = [
      { header: 'Name', key: 'debtName', width: 20 },
      { header: 'Type', key: 'debtType', width: 15 },
      { header: 'Amount', key: 'originalAmount', width: 12 },
      { header: 'Balance', key: 'currentBalance', width: 12 },
      { header: 'Interest Rate', key: 'interestRate', width: 12 }
    ];
    debts.forEach(d => debtSheet.addRow(d));

    // Add password protection if provided
    if (password) {
      workbook.model.workbookProtection = {
        lockStructure: true,
        password: password
      };
    }

    return workbook.xlsx.writeBuffer();
  }

  // Backup user data
  async backupUserData(userId) {
    const collections = [
      'Transaction',
      'Budget',
      'Debt',
      'Portfolio',
      'TaxRecord',
      'InsurancePolicy',
      'RealEstate',
      'Invoice',
      'Client',
      'Project'
    ];

    const backup = {
      userId,
      backupDate: new Date(),
      data: {}
    };

    for (const collection of collections) {
      try {
        const Model = require(`../models/${collection}`);
        backup.data[collection] = await Model.find({ userId }).lean();
      } catch (error) {
        console.error(`Error backing up ${collection}:`, error);
        backup.data[collection] = [];
      }
    }

    return backup;
  }

  // Restore user data from backup
  async restoreUserData(userId, backupData) {
    const restored = {};
    const errors = {};

    for (const [collection, data] of Object.entries(backupData.data)) {
      try {
        const Model = require(`../models/${collection}`);
        
        // Delete existing data
        await Model.deleteMany({ userId });
        
        // Insert backup data
        if (data.length > 0) {
          await Model.insertMany(data.map(item => ({ ...item, userId, _id: undefined })));
          restored[collection] = data.length;
        }
      } catch (error) {
        console.error(`Error restoring ${collection}:`, error);
        errors[collection] = error.message;
      }
    }

    return { restored, errors };
  }

  // Import budgets from CSV
  async importBudgetsFromCSV(userId, filePath) {
    const budgets = [];
    const errors = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          try {
            budgets.push({
              userId,
              category: row.category || row.Category,
              amount: parseFloat(row.amount || row.Amount),
              month: parseInt(row.month || row.Month || new Date().getMonth() + 1),
              year: parseInt(row.year || row.Year || new Date().getFullYear()),
              spent: parseFloat(row.spent || row.Spent || 0)
            });
          } catch (error) {
            errors.push({ row, error: error.message });
          }
        })
        .on('end', async () => {
          try {
            if (budgets.length > 0) {
              await Budget.insertMany(budgets);
            }
            resolve({
              imported: budgets.length,
              errors: errors.length,
              errorDetails: errors
            });
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  // Generate template CSV files
  generateTransactionTemplate() {
    const template = [
      {
        date: '2024-01-01',
        type: 'expense',
        category: 'Food & Dining',
        amount: '500',
        description: 'Restaurant dinner',
        merchant: 'Restaurant Name',
        payment_method: 'credit_card',
        notes: 'Optional notes'
      },
      {
        date: '2024-01-02',
        type: 'income',
        category: 'Salary',
        amount: '50000',
        description: 'Monthly salary',
        merchant: 'Company Name',
        payment_method: 'bank_transfer',
        notes: ''
      }
    ];

    const fields = [
      'date',
      'type',
      'category',
      'amount',
      'description',
      'merchant',
      'payment_method',
      'notes'
    ];

    return parse(template, { fields });
  }

  generateBudgetTemplate() {
    const template = [
      {
        category: 'Food & Dining',
        amount: '10000',
        month: '1',
        year: '2024',
        spent: '0'
      },
      {
        category: 'Transport',
        amount: '5000',
        month: '1',
        year: '2024',
        spent: '0'
      }
    ];

    const fields = ['category', 'amount', 'month', 'year', 'spent'];
    return parse(template, { fields });
  }
}

module.exports = new DataImportExportService();
