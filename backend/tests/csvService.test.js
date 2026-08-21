const CSVService = require('../services/csvService');
const Transaction = require('../models/Transaction');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

describe('CSVService', () => {
  let userId;
  let testFilesDir;

  beforeAll(() => {
    // Create temp directory for test files
    testFilesDir = path.join(__dirname, 'temp_csv_tests');
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }
  });

  beforeEach(() => {
    userId = new mongoose.Types.ObjectId();
  });

  afterAll(() => {
    // Cleanup test files. Use retries and swallow errors: on Windows the
    // temp files can still be briefly locked by the CSV read streams, which
    // previously caused an ENOTEMPTY error that failed the whole suite.
    if (fs.existsSync(testFilesDir)) {
      try {
        fs.rmSync(testFilesDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      } catch (err) {
        // Best-effort cleanup — never let teardown fail the test run.
      }
    }
  });

  describe('Bank Format Configurations', () => {
    it('should have all 5 bank formats defined', () => {
      expect(CSVService.BANK_FORMATS).toBeDefined();
      expect(CSVService.BANK_FORMATS.icici).toBeDefined();
      expect(CSVService.BANK_FORMATS.hdfc).toBeDefined();
      expect(CSVService.BANK_FORMATS.sbi).toBeDefined();
      expect(CSVService.BANK_FORMATS.axis).toBeDefined();
      expect(CSVService.BANK_FORMATS.generic).toBeDefined();
    });

    it('should have correct date formats for each bank', () => {
      expect(CSVService.BANK_FORMATS.icici.dateFormat).toBe('DD/MM/YYYY');
      expect(CSVService.BANK_FORMATS.hdfc.dateFormat).toBe('DD/MM/YY');
      expect(CSVService.BANK_FORMATS.sbi.dateFormat).toBe('DD MMM YYYY');
      expect(CSVService.BANK_FORMATS.axis.dateFormat).toBe('DD-MM-YYYY');
      expect(CSVService.BANK_FORMATS.generic.dateFormat).toBe('YYYY-MM-DD');
    });

    it('should have required columns for each bank', () => {
      Object.keys(CSVService.BANK_FORMATS).forEach(bankKey => {
        const format = CSVService.BANK_FORMATS[bankKey];
        expect(format.columns.date).toBeDefined();
        expect(format.columns.description).toBeDefined();
        expect(format.columns.amount).toBeDefined();
      });
    });
  });

  describe('parseCSV - ICICI Bank Format', () => {
    it('should parse ICICI bank CSV correctly', async () => {
      const csvContent = `Date,Transaction Details,Withdrawal Amt,Deposit Amt,Balance
01/01/2024,Netflix Subscription,199,,10000
02/01/2024,Salary Deposit,,50000,60000
05/01/2024,Swiggy Order,450,,59550`;

      const filePath = path.join(testFilesDir, 'icici_test.csv');
      fs.writeFileSync(filePath, csvContent);

      const transactions = await CSVService.parseCSV(filePath, 'icici');

      expect(transactions.length).toBe(3);
      expect(transactions[0].description).toBe('Netflix Subscription');
      expect(transactions[0].amount).toBe(-199);
      expect(transactions[1].description).toBe('Salary Deposit');
      expect(transactions[1].amount).toBe(50000);
      expect(transactions[2].amount).toBe(-450);
    });

    it('should handle ICICI date format DD/MM/YYYY', async () => {
      const csvContent = `Date,Transaction Details,Withdrawal Amt,Deposit Amt,Balance
15/03/2024,Test Transaction,100,,5000`;

      const filePath = path.join(testFilesDir, 'icici_date.csv');
      fs.writeFileSync(filePath, csvContent);

      const transactions = await CSVService.parseCSV(filePath, 'icici');

      expect(transactions[0].date).toBeInstanceOf(Date);
      expect(transactions[0].date.getMonth()).toBe(2); // March (0-indexed)
      expect(transactions[0].date.getDate()).toBe(15);
    });

    it('should detect transaction type from amount columns', async () => {
      const csvContent = `Date,Transaction Details,Withdrawal Amt,Deposit Amt,Balance
01/01/2024,Purchase,500,,5000
02/01/2024,Refund,,200,5200`;

      const filePath = path.join(testFilesDir, 'icici_types.csv');
      fs.writeFileSync(filePath, csvContent);

      const transactions = await CSVService.parseCSV(filePath, 'icici');

      expect(transactions[0].type).toBe('debit');
      expect(transactions[1].type).toBe('credit');
    });
  });

  describe('parseCSV - HDFC Bank Format', () => {
    it('should parse HDFC bank CSV correctly', async () => {
      const csvContent = `Date,Narration,Chq./Ref.No.,Debit,Credit,Balance
01/01/24,NEFT Payment,REF123,1500,,15000
05/01/24,Salary Credit,SAL456,,40000,55000`;

      const filePath = path.join(testFilesDir, 'hdfc_test.csv');
      fs.writeFileSync(filePath, csvContent);

      const transactions = await CSVService.parseCSV(filePath, 'hdfc');

      expect(transactions.length).toBe(2);
      expect(transactions[0].amount).toBe(-1500);
      expect(transactions[1].amount).toBe(40000);
    });

    it('should handle HDFC date format DD/MM/YY', async () => {
      const csvContent = `Date,Narration,Debit,Credit,Balance
25/12/23,Test,100,,5000`;

      const filePath = path.join(testFilesDir, 'hdfc_date.csv');
      fs.writeFileSync(filePath, csvContent);

      const transactions = await CSVService.parseCSV(filePath, 'hdfc');

      expect(transactions[0].date).toBeInstanceOf(Date);
      expect(transactions[0].date.getFullYear()).toBe(2023);
      expect(transactions[0].date.getMonth()).toBe(11); // December
    });
  });

  describe('parseCSV - SBI Format', () => {
    it('should parse SBI bank CSV correctly', async () => {
      const csvContent = `Txn Date,Description,Ref No./Cheque No.,Debit,Credit,Balance
01 Jan 2024,UPI PAYMENT,UPI123,250,,8000
10 Jan 2024,ACCOUNT CREDIT,DEP456,,10000,18000`;

      const filePath = path.join(testFilesDir, 'sbi_test.csv');
      fs.writeFileSync(filePath, csvContent);

      const transactions = await CSVService.parseCSV(filePath, 'sbi');

      expect(transactions.length).toBe(2);
      expect(transactions[0].amount).toBe(-250);
      expect(transactions[1].amount).toBe(10000);
    });

    it('should handle SBI date format DD MMM YYYY', async () => {
      const csvContent = `Txn Date,Description,Debit,Credit,Balance
15 Mar 2024,Test Transaction,100,,5000`;

      const filePath = path.join(testFilesDir, 'sbi_date.csv');
      fs.writeFileSync(filePath, csvContent);

      const transactions = await CSVService.parseCSV(filePath, 'sbi');

      expect(transactions[0].date).toBeInstanceOf(Date);
      expect(transactions[0].date.getMonth()).toBe(2); // March
    });
  });

  describe('parseCSV - Axis Bank Format', () => {
    it('should parse Axis bank CSV correctly', async () => {
      const csvContent = `Tran Date,Particulars,Chq/Ref Number,Withdrawal Amt,Deposit Amt,Balance
01-01-2024,Online Purchase,TXN123,850,,12000
05-01-2024,Cashback Credit,CB456,,100,12100`;

      const filePath = path.join(testFilesDir, 'axis_test.csv');
      fs.writeFileSync(filePath, csvContent);

      const transactions = await CSVService.parseCSV(filePath, 'axis');

      expect(transactions.length).toBe(2);
      expect(transactions[0].amount).toBe(-850);
      expect(transactions[1].amount).toBe(100);
    });

    it('should handle Axis date format DD-MM-YYYY', async () => {
      const csvContent = `Tran Date,Particulars,Withdrawal Amt,Deposit Amt,Balance
20-06-2024,Test,500,,5000`;

      const filePath = path.join(testFilesDir, 'axis_date.csv');
      fs.writeFileSync(filePath, csvContent);

      const transactions = await CSVService.parseCSV(filePath, 'axis');

      expect(transactions[0].date).toBeInstanceOf(Date);
      expect(transactions[0].date.getMonth()).toBe(5); // June
      expect(transactions[0].date.getDate()).toBe(20);
    });
  });

  describe('parseCSV - Generic Format', () => {
    it('should parse generic CSV format', async () => {
      const csvContent = `date,description,amount,type,category
2024-01-01,Grocery Shopping,-1500,debit,Groceries
2024-01-02,Freelance Income,10000,credit,Income`;

      const filePath = path.join(testFilesDir, 'generic_test.csv');
      fs.writeFileSync(filePath, csvContent);

      const transactions = await CSVService.parseCSV(filePath, 'generic');

      expect(transactions.length).toBe(2);
      expect(transactions[0].amount).toBe(-1500);
      expect(transactions[0].category).toBe('Groceries');
      expect(transactions[1].amount).toBe(10000);
    });

    it('should handle generic date format YYYY-MM-DD', async () => {
      const csvContent = `date,description,amount
2024-12-25,Christmas Shopping,-5000`;

      const filePath = path.join(testFilesDir, 'generic_date.csv');
      fs.writeFileSync(filePath, csvContent);

      const transactions = await CSVService.parseCSV(filePath, 'generic');

      expect(transactions[0].date).toBeInstanceOf(Date);
      expect(transactions[0].date.getMonth()).toBe(11); // December
      expect(transactions[0].date.getDate()).toBe(25);
    });
  });

  describe('Auto-detect Bank Format', () => {
    it('should auto-detect ICICI format from headers', async () => {
      const csvContent = `Value Date,Transaction Details,Withdrawal Amt,Deposit Amt,Balance
01/01/2024,Test Transaction,100,,5000`;

      const filePath = path.join(testFilesDir, 'auto_icici.csv');
      fs.writeFileSync(filePath, csvContent);

      const detectedFormat = await CSVService.detectBankFormat(filePath);
      expect(detectedFormat).toBe('icici');
    });

    it('should auto-detect HDFC format from headers', async () => {
      const csvContent = `Date,Narration,Chq./Ref.No.,Debit,Credit,Balance
01/01/24,Test,REF123,100,,5000`;

      const filePath = path.join(testFilesDir, 'auto_hdfc.csv');
      fs.writeFileSync(filePath, csvContent);

      const detectedFormat = await CSVService.detectBankFormat(filePath);
      expect(detectedFormat).toBe('hdfc');
    });

    it('should auto-detect SBI format from headers', async () => {
      const csvContent = `Txn Date,Description,Ref No./Cheque No.,Debit,Credit,Balance
01 Jan 2024,Test,REF123,100,,5000`;

      const filePath = path.join(testFilesDir, 'auto_sbi.csv');
      fs.writeFileSync(filePath, csvContent);

      const detectedFormat = await CSVService.detectBankFormat(filePath);
      expect(detectedFormat).toBe('sbi');
    });

    it('should auto-detect Axis format from headers', async () => {
      const csvContent = `Tran Date,Particulars,Chq/Ref Number,Withdrawal Amt,Deposit Amt,Balance
01-01-2024,Test,TXN123,100,,5000`;

      const filePath = path.join(testFilesDir, 'auto_axis.csv');
      fs.writeFileSync(filePath, csvContent);

      const detectedFormat = await CSVService.detectBankFormat(filePath);
      expect(detectedFormat).toBe('axis');
    });

    it('should default to generic format when cannot detect', async () => {
      const csvContent = `date,description,amount
2024-01-01,Test,-100`;

      const filePath = path.join(testFilesDir, 'auto_generic.csv');
      fs.writeFileSync(filePath, csvContent);

      const detectedFormat = await CSVService.detectBankFormat(filePath);
      expect(detectedFormat).toBe('generic');
    });
  });

  describe('Validation Logic', () => {
    it('should skip rows with missing required fields', async () => {
      const csvContent = `date,description,amount
2024-01-01,Valid Transaction,-100
2024-01-02,,-200
2024-01-03,Missing Amount,
,Missing Date and Description,-300`;

      const filePath = path.join(testFilesDir, 'validation_test.csv');
      fs.writeFileSync(filePath, csvContent);

      const transactions = await CSVService.parseCSV(filePath, 'generic');

      // Should only include the valid transaction
      expect(transactions.length).toBe(1);
      expect(transactions[0].description).toBe('Valid Transaction');
    });

    it('should handle invalid date formats gracefully', async () => {
      const csvContent = `date,description,amount
invalid-date,Transaction 1,-100
2024-01-01,Valid Transaction,-200
99/99/9999,Transaction 2,-300`;

      const filePath = path.join(testFilesDir, 'invalid_dates.csv');
      fs.writeFileSync(filePath, csvContent);

      const transactions = await CSVService.parseCSV(filePath, 'generic');

      // Should only include transaction with valid date
      expect(transactions.length).toBe(1);
      expect(transactions[0].description).toBe('Valid Transaction');
    });

    it('should handle invalid amount formats', async () => {
      const csvContent = `date,description,amount
2024-01-01,Valid Transaction,-100
2024-01-02,Invalid Amount,abc
2024-01-03,Empty Amount,`;

      const filePath = path.join(testFilesDir, 'invalid_amounts.csv');
      fs.writeFileSync(filePath, csvContent);

      const transactions = await CSVService.parseCSV(filePath, 'generic');

      expect(transactions.length).toBe(1);
      expect(transactions[0].amount).toBe(-100);
    });
  });

  describe('Duplicate Detection', () => {
    beforeEach(async () => {
      await Transaction.deleteMany({});
    });

    it('should detect duplicate transactions by date, amount, and description', async () => {
      // Create existing transaction
      await Transaction.create({
        userId,
        date: new Date('2024-01-01'),
        description: 'Netflix Subscription',
        amount: -199,
        type: 'debit'
      });

      const csvContent = `date,description,amount
2024-01-01,Netflix Subscription,-199
2024-01-02,New Transaction,-299`;

      const filePath = path.join(testFilesDir, 'duplicates.csv');
      fs.writeFileSync(filePath, csvContent);

      const result = await CSVService.importTransactions(userId, filePath, 'generic');

      expect(result.duplicates).toBe(1);
      expect(result.imported).toBe(1);
      expect(result.total).toBe(2);
    });

    it('should not flag similar transactions on different dates as duplicates', async () => {
      await Transaction.create({
        userId,
        date: new Date('2024-01-01'),
        description: 'Netflix',
        amount: -199,
        type: 'debit'
      });

      const csvContent = `date,description,amount
2024-02-01,Netflix,-199`;

      const filePath = path.join(testFilesDir, 'not_duplicate.csv');
      fs.writeFileSync(filePath, csvContent);

      const result = await CSVService.importTransactions(userId, filePath, 'generic');

      expect(result.duplicates).toBe(0);
      expect(result.imported).toBe(1);
    });
  });

  describe('exportTransactions', () => {
    beforeEach(async () => {
      await Transaction.deleteMany({});
    });

    it('should export transactions to CSV', async () => {
      await Transaction.insertMany([
        {
          userId,
          date: new Date('2024-01-01'),
          description: 'Netflix',
          amount: -199,
          type: 'debit',
          category: 'Entertainment'
        },
        {
          userId,
          date: new Date('2024-01-05'),
          description: 'Salary',
          amount: 50000,
          type: 'credit',
          category: 'Income'
        }
      ]);

      const exportPath = path.join(testFilesDir, 'export_test.csv');
      await CSVService.exportTransactions(userId, exportPath);

      expect(fs.existsSync(exportPath)).toBe(true);

      const content = fs.readFileSync(exportPath, 'utf8');
      expect(content).toContain('Netflix');
      expect(content).toContain('Salary');
      expect(content).toContain('-199');
      expect(content).toContain('50000');
    });

    it('should filter export by date range', async () => {
      await Transaction.insertMany([
        {
          userId,
          date: new Date('2024-01-01'),
          description: 'January Transaction',
          amount: -100,
          type: 'debit'
        },
        {
          userId,
          date: new Date('2024-06-01'),
          description: 'June Transaction',
          amount: -200,
          type: 'debit'
        }
      ]);

      const exportPath = path.join(testFilesDir, 'export_filtered.csv');
      await CSVService.exportTransactions(userId, exportPath, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31')
      });

      const content = fs.readFileSync(exportPath, 'utf8');
      expect(content).toContain('January Transaction');
      expect(content).not.toContain('June Transaction');
    });

    it('should filter export by category', async () => {
      await Transaction.insertMany([
        {
          userId,
          date: new Date('2024-01-01'),
          description: 'Grocery',
          amount: -500,
          type: 'debit',
          category: 'Groceries'
        },
        {
          userId,
          date: new Date('2024-01-02'),
          description: 'Movie',
          amount: -300,
          type: 'debit',
          category: 'Entertainment'
        }
      ]);

      const exportPath = path.join(testFilesDir, 'export_category.csv');
      await CSVService.exportTransactions(userId, exportPath, {
        category: 'Groceries'
      });

      const content = fs.readFileSync(exportPath, 'utf8');
      expect(content).toContain('Grocery');
      expect(content).not.toContain('Movie');
    });

    it('should filter export by transaction type', async () => {
      await Transaction.insertMany([
        {
          userId,
          date: new Date('2024-01-01'),
          description: 'Expense',
          amount: -100,
          type: 'debit'
        },
        {
          userId,
          date: new Date('2024-01-02'),
          description: 'Income',
          amount: 5000,
          type: 'credit'
        }
      ]);

      const exportPath = path.join(testFilesDir, 'export_type.csv');
      await CSVService.exportTransactions(userId, exportPath, {
        type: 'credit'
      });

      const content = fs.readFileSync(exportPath, 'utf8');
      expect(content).toContain('Income');
      expect(content).not.toContain('Expense');
    });
  });

  describe('Preview Functionality', () => {
    it('should preview first N rows without importing', async () => {
      const csvContent = `date,description,amount
2024-01-01,Transaction 1,-100
2024-01-02,Transaction 2,-200
2024-01-03,Transaction 3,-300
2024-01-04,Transaction 4,-400
2024-01-05,Transaction 5,-500`;

      const filePath = path.join(testFilesDir, 'preview_test.csv');
      fs.writeFileSync(filePath, csvContent);

      const preview = await CSVService.previewCSV(filePath, 'generic', 3);

      expect(preview.length).toBe(3);
      expect(preview[0].description).toBe('Transaction 1');
      expect(preview[2].description).toBe('Transaction 3');
    });

    it('should show validation errors in preview', async () => {
      const csvContent = `date,description,amount
2024-01-01,Valid Transaction,-100
invalid-date,Invalid Date Transaction,-200
2024-01-03,Missing Amount,`;

      const filePath = path.join(testFilesDir, 'preview_errors.csv');
      fs.writeFileSync(filePath, csvContent);

      const preview = await CSVService.previewCSV(filePath, 'generic', 10);

      expect(preview.length).toBeLessThan(3); // Invalid rows filtered out
      expect(preview[0].description).toBe('Valid Transaction');
    });
  });

  describe('Custom Column Mapping', () => {
    it('should accept custom column mapping', async () => {
      const csvContent = `txn_date,txn_desc,txn_amount,txn_type
2024-01-01,Custom Format Transaction,-500,expense`;

      const filePath = path.join(testFilesDir, 'custom_mapping.csv');
      fs.writeFileSync(filePath, csvContent);

      const customMapping = {
        date: ['txn_date'],
        description: ['txn_desc'],
        amount: ['txn_amount'],
        type: ['txn_type']
      };

      const transactions = await CSVService.parseCSV(filePath, 'generic', customMapping);

      expect(transactions.length).toBe(1);
      expect(transactions[0].description).toBe('Custom Format Transaction');
      expect(transactions[0].amount).toBe(-500);
    });
  });
});
