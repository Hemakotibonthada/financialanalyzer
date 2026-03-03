/**
 * Demo Account Seed Script
 * ========================
 * Creates a demo account with comprehensive financial data across ALL models.
 * 
 * Credentials:
 *   Email:    demo@financialanalyzer.com
 *   Password: Demo@123456
 * 
 * Usage:
 *   node backend/scripts/seed-demo-account.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ─── Models ────────────────────────────────────────────────────────
const User = require('../models/User');
const FinancialProfile = require('../models/FinancialProfile');
const Transaction = require('../models/Transaction');
const EMI = require('../models/EMI');
const Budget = require('../models/Budget');
const Investment = require('../models/Investment');
const BankAccount = require('../models/BankAccount');
const BillReminder = require('../models/BillReminder');
const CreditCardBill = require('../models/CreditCardBill');
const Debt = require('../models/Debt');
const FinancialGoal = require('../models/FinancialGoal');
const InsurancePolicy = require('../models/InsurancePolicy');
const LoanGiven = require('../models/LoanGiven');
const PersonalLoan = require('../models/PersonalLoan');
const NetWorthSnapshot = require('../models/NetWorthSnapshot');
const Subscription = require('../models/Subscription');
const Notification = require('../models/Notification');
const AutomationRule = require('../models/AutomationRule');
const Portfolio = require('../models/Portfolio');
const RealEstate = require('../models/RealEstate');
const RetirementPlan = require('../models/RetirementPlan');
const TaxRecord = require('../models/TaxRecord');
const Anomaly = require('../models/Anomaly');
const Prediction = require('../models/Prediction');
const Analysis = require('../models/Analysis');

// ─── Config ────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/financial_analyzer';
const DEMO_EMAIL = 'demo@financialanalyzer.com';
const DEMO_PASSWORD = 'Demo@123456';
const DEMO_NAME = 'Demo User';

// ─── Helpers ───────────────────────────────────────────────────────
const d = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
};

const futureDate = (daysAhead) => {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date;
};

const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ─── Main Seed Function ───────────────────────────────────────────
async function seedDemoAccount() {
  console.log('🚀 Starting Demo Account Seed...\n');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // ─── 1. Delete existing demo user & data ──────────────────────
    const existingUser = await User.findOne({ email: DEMO_EMAIL });
    if (existingUser) {
      const uid = existingUser._id;
      console.log('🗑️  Cleaning existing demo data...');
      await Promise.all([
        FinancialProfile.deleteMany({ userId: uid }),
        Transaction.deleteMany({ userId: uid }),
        EMI.deleteMany({ userId: uid }),
        Budget.deleteMany({ userId: uid }),
        Investment.deleteMany({ userId: uid }),
        BankAccount.deleteMany({ userId: uid }),
        BillReminder.deleteMany({ userId: uid }),
        CreditCardBill.deleteMany({ userId: uid }),
        Debt.deleteMany({ userId: uid }),
        FinancialGoal.deleteMany({ userId: uid }),
        InsurancePolicy.deleteMany({ userId: uid }),
        LoanGiven.deleteMany({ userId: uid }),
        PersonalLoan.deleteMany({ userId: uid }),
        NetWorthSnapshot.deleteMany({ userId: uid }),
        Subscription.deleteMany({ userId: uid }),
        Notification.deleteMany({ userId: uid }),
        AutomationRule.deleteMany({ userId: uid }),
        Portfolio.deleteMany({ userId: uid }),
        RealEstate.deleteMany({ userId: uid }),
        RetirementPlan.deleteMany({ userId: uid }),
        TaxRecord.deleteMany({ userId: uid }),
        Anomaly.deleteMany({ userId: uid }),
        Prediction.deleteMany({ userId: uid }),
        Analysis.deleteMany({ userId: uid }),
      ]);
      await User.deleteOne({ _id: uid });
      console.log('   ✅ Existing demo data removed\n');
    }

    // ─── 2. Create Demo User ──────────────────────────────────────
    console.log('👤 Creating demo user...');
    const user = new User({
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD, // Will be hashed by pre-save hook
      role: 'user',
      isActive: true,
      lastLogin: new Date(),
    });
    await user.save();
    const userId = user._id;
    console.log(`   ✅ User created: ${DEMO_EMAIL}\n`);

    // ─── 3. Financial Profile ─────────────────────────────────────
    console.log('📋 Creating financial profile...');
    await FinancialProfile.create({
      userId,
      fullName: DEMO_NAME,
      dateOfBirth: new Date('1992-06-15'),
      panNumber: 'ABCPD1234E',
      phoneNumber: '9876543210',
      monthlyIncome: 185000,
      currency: 'INR',
      preferences: {
        currency: 'INR',
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
        notifications: { email: true, push: true, sms: false },
      },
      creditScore: {
        score: 782,
        provider: 'CIBIL',
        lastUpdated: d(15),
        history: [
          { score: 745, date: d(365) },
          { score: 758, date: d(270) },
          { score: 770, date: d(180) },
          { score: 782, date: d(15) },
        ],
      },
      customCategories: [
        { name: 'Gym', keywords: ['gym', 'fitness', 'workout'], color: '#FF6B6B' },
        { name: 'Pet Care', keywords: ['pet', 'vet', 'animal'], color: '#4ECDC4' },
        { name: 'Hobby', keywords: ['hobby', 'craft', 'gaming'], color: '#45B7D1' },
        { name: 'Charity', keywords: ['donation', 'charity', 'ngo'], color: '#96CEB4' },
      ],
      budgetLimits: new Map([
        ['Food', 15000],
        ['Transport', 8000],
        ['Entertainment', 10000],
        ['Shopping', 20000],
        ['Utilities', 5000],
        ['Healthcare', 5000],
      ]),
    });
    console.log('   ✅ Financial profile created\n');

    // ─── 4. Bank Accounts ─────────────────────────────────────────
    console.log('🏦 Creating bank accounts...');
    const bankAccounts = await BankAccount.insertMany([
      {
        userId,
        bankName: 'HDFC Bank',
        accountNumber: 'XXXX1234',
        accountType: 'savings',
        balance: 485000,
        currency: 'INR',
        metadata: { ifscCode: 'HDFC0001234', branchName: 'Hyderabad - Banjara Hills' },
        balanceHistory: [
          { date: d(90), balance: 320000 },
          { date: d(60), balance: 385000 },
          { date: d(30), balance: 445000 },
          { date: d(0), balance: 485000 },
        ],
      },
      {
        userId,
        bankName: 'ICICI Bank',
        accountNumber: 'XXXX5678',
        accountType: 'salary',
        balance: 142000,
        currency: 'INR',
        metadata: { ifscCode: 'ICIC0005678', branchName: 'Hyderabad - Madhapur' },
        balanceHistory: [
          { date: d(90), balance: 95000 },
          { date: d(60), balance: 110000 },
          { date: d(30), balance: 125000 },
          { date: d(0), balance: 142000 },
        ],
      },
      {
        userId,
        bankName: 'SBI',
        accountNumber: 'XXXX9012',
        accountType: 'savings',
        balance: 275000,
        currency: 'INR',
        metadata: { ifscCode: 'SBIN0009012', branchName: 'Hyderabad - Ameerpet' },
        balanceHistory: [
          { date: d(90), balance: 250000 },
          { date: d(60), balance: 258000 },
          { date: d(30), balance: 268000 },
          { date: d(0), balance: 275000 },
        ],
      },
      {
        userId,
        bankName: 'Kotak Mahindra Bank',
        accountNumber: 'XXXX3456',
        accountType: 'FD',
        balance: 500000,
        currency: 'INR',
        metadata: { ifscCode: 'KKBK0003456', branchName: 'Hyderabad - Jubilee Hills' },
      },
    ]);
    console.log(`   ✅ ${bankAccounts.length} bank accounts created\n`);

    // ─── 5. Transactions (Last 6 months) ──────────────────────────
    console.log('💸 Creating transactions...');
    const categories = [
      'Food & Dining', 'Groceries', 'Transport', 'Fuel', 'Shopping',
      'Entertainment', 'Utilities', 'Healthcare', 'Education', 'Rent',
      'EMI', 'Insurance', 'Salary', 'Freelance', 'Investment',
      'Transfer', 'Recharge', 'Subscription', 'Travel', 'Gifts',
    ];
    const merchants = [
      'Swiggy', 'Zomato', 'Amazon India', 'Flipkart', 'BigBasket',
      'Uber', 'Ola', 'Netflix', 'Spotify', 'DMart', 'Reliance Fresh',
      'Apollo Pharmacy', 'IRCTC', 'BookMyShow', 'Myntra', 'Croma',
      'Indian Oil', 'HP Petrol', 'Jio', 'Airtel', 'Meesho',
      'PhonePe', 'Google Pay', 'Paytm', 'HDFC Life', 'LIC',
    ];

    const transactions = [];
    // Salary credits (6 months)
    for (let m = 0; m < 6; m++) {
      transactions.push({
        userId,
        date: d(m * 30 + 1),
        description: 'Monthly Salary Credit',
        amount: 185000,
        currency: 'INR',
        type: 'credit',
        category: 'Salary',
        paymentMethod: 'bank_transfer',
        source: 'manual',
        merchantName: 'TechCorp Solutions Pvt Ltd',
      });
    }
    // Freelance income (every 45 days)
    for (let i = 0; i < 4; i++) {
      transactions.push({
        userId,
        date: d(i * 45 + 10),
        description: 'Freelance Project Payment',
        amount: randomBetween(25000, 50000),
        currency: 'INR',
        type: 'credit',
        category: 'Freelance',
        paymentMethod: 'bank_transfer',
        source: 'manual',
        merchantName: 'Upwork / Direct Client',
      });
    }
    // Daily expenses
    for (let day = 0; day < 180; day++) {
      const numTxns = randomBetween(1, 4);
      for (let t = 0; t < numTxns; t++) {
        const cat = categories[randomBetween(0, categories.length - 1)];
        const merchant = merchants[randomBetween(0, merchants.length - 1)];
        let amount;
        switch (cat) {
          case 'Food & Dining': amount = randomBetween(150, 2500); break;
          case 'Groceries': amount = randomBetween(200, 5000); break;
          case 'Transport': amount = randomBetween(100, 1500); break;
          case 'Fuel': amount = randomBetween(500, 4000); break;
          case 'Shopping': amount = randomBetween(500, 15000); break;
          case 'Entertainment': amount = randomBetween(200, 3000); break;
          case 'Utilities': amount = randomBetween(500, 5000); break;
          case 'Healthcare': amount = randomBetween(200, 8000); break;
          case 'Education': amount = randomBetween(1000, 10000); break;
          case 'Rent': amount = day % 30 === 0 ? 25000 : randomBetween(0, 0); break;
          case 'Recharge': amount = randomBetween(199, 999); break;
          case 'Subscription': amount = randomBetween(149, 1499); break;
          case 'Travel': amount = randomBetween(1000, 25000); break;
          case 'Gifts': amount = randomBetween(500, 5000); break;
          default: amount = randomBetween(100, 5000);
        }
        if (amount > 0) {
          transactions.push({
            userId,
            date: d(day),
            description: `${cat} - ${merchant}`,
            amount,
            currency: 'INR',
            type: 'debit',
            category: cat,
            paymentMethod: ['upi', 'card', 'cash', 'net_banking', 'wallet'][randomBetween(0, 4)],
            source: 'manual',
            merchantName: merchant,
            tags: [cat.toLowerCase().replace(/ & /g, '-')],
          });
        }
      }
    }
    await Transaction.insertMany(transactions);
    console.log(`   ✅ ${transactions.length} transactions created\n`);

    // ─── 6. EMIs ──────────────────────────────────────────────────
    console.log('📅 Creating EMIs...');
    const emiData = [
      { provider: 'HDFC Bank', digits: '4521', merchant: 'Apple iPhone 15 Pro', principal: 139900, rate: 14, emi: 12500, tenure: 12, paid: 6, remaining: 6, start: 180, endD: 180, nextDue: 15, status: 'active' },
      { provider: 'ICICI Bank', digits: '8734', merchant: 'Sony 65" BRAVIA TV', principal: 89990, rate: 12, emi: 7850, tenure: 12, paid: 9, remaining: 3, start: 270, endD: 90, nextDue: 20, status: 'active' },
      { provider: 'Bajaj Finserv', digits: '6120', merchant: 'Home Interior Setup', principal: 250000, rate: 16, emi: 14500, tenure: 18, paid: 4, remaining: 14, start: 120, endD: 420, nextDue: 10, status: 'active' },
      { provider: 'HDFC Bank', digits: '4521', merchant: 'MacBook Pro M3', principal: 199900, rate: 0, emi: 16658, tenure: 12, paid: 12, remaining: 0, start: 365, endD: -5, nextDue: null, status: 'completed' },
    ];
    const emis = await EMI.insertMany(emiData.map(e => ({
      userId,
      cardProvider: e.provider,
      cardLastFourDigits: e.digits,
      cardHolderName: DEMO_NAME,
      merchantName: e.merchant,
      principalAmount: e.principal,
      principalAmountInINR: e.principal,
      currency: 'INR',
      interestRate: e.rate,
      emiAmount: e.emi,
      emiAmountInINR: e.emi,
      totalTenure: e.tenure,
      paidInstallments: e.paid,
      remainingInstallments: e.remaining,
      repaymentType: 'MONTHLY',
      startDate: d(e.start),
      endDate: e.endD >= 0 ? futureDate(e.endD) : d(Math.abs(e.endD)),
      nextDueDate: e.nextDue ? futureDate(e.nextDue) : undefined,
      status: e.status,
      paymentHistory: Array.from({ length: e.paid }, (_, i) => {
        const principalPortion = Math.round(e.principal / e.tenure);
        const interestPortion = e.emi - principalPortion;
        return {
          installmentNumber: i + 1,
          amount: e.emi,
          principalPaid: principalPortion,
          interestPaid: Math.max(0, interestPortion),
          dueDate: d(e.start - i * 30),
          paidDate: d(e.start - i * 30),
          status: 'paid',
        };
      }),
    })));
    console.log(`   ✅ ${emis.length} EMIs created\n`);

    // ─── 7. Budgets ───────────────────────────────────────────────
    console.log('💰 Creating budgets...');
    const budgets = await Budget.insertMany([
      { userId, category: 'Food & Dining', amount: 15000, period: 'MONTHLY', startDate: d(30), isActive: true, alertThreshold: 80, spent: 12500 },
      { userId, category: 'Groceries', amount: 8000, period: 'MONTHLY', startDate: d(30), isActive: true, alertThreshold: 80, spent: 7200 },
      { userId, category: 'Transport', amount: 6000, period: 'MONTHLY', startDate: d(30), isActive: true, alertThreshold: 80, spent: 4800 },
      { userId, category: 'Shopping', amount: 20000, period: 'MONTHLY', startDate: d(30), isActive: true, alertThreshold: 75, spent: 18200 },
      { userId, category: 'Entertainment', amount: 10000, period: 'MONTHLY', startDate: d(30), isActive: true, alertThreshold: 80, spent: 6500 },
      { userId, category: 'Utilities', amount: 5000, period: 'MONTHLY', startDate: d(30), isActive: true, alertThreshold: 90, spent: 4200 },
      { userId, category: 'Healthcare', amount: 5000, period: 'MONTHLY', startDate: d(30), isActive: true, alertThreshold: 85, spent: 2800 },
      { userId, category: 'Education', amount: 10000, period: 'MONTHLY', startDate: d(30), isActive: true, alertThreshold: 80, spent: 5000 },
      { userId, category: 'Travel', amount: 25000, period: 'MONTHLY', startDate: d(30), isActive: true, alertThreshold: 70, spent: 15000 },
      { userId, category: 'Fuel', amount: 8000, period: 'MONTHLY', startDate: d(30), isActive: true, alertThreshold: 80, spent: 6200 },
    ]);
    console.log(`   ✅ ${budgets.length} budgets created\n`);

    // ─── 8. Investments ───────────────────────────────────────────
    console.log('📈 Creating investments...');
    const investments = await Investment.insertMany([
      { userId, type: 'stock', name: 'Reliance Industries', symbol: 'RELIANCE', quantity: 25, purchasePrice: 2450, purchaseDate: d(365), totalInvestedAmount: 61250, currentPrice: 2890, currentValue: 72250, platform: 'Zerodha', riskLevel: 'moderate', status: 'active' },
      { userId, type: 'stock', name: 'TCS', symbol: 'TCS', quantity: 15, purchasePrice: 3650, purchaseDate: d(300), totalInvestedAmount: 54750, currentPrice: 4120, currentValue: 61800, platform: 'Zerodha', riskLevel: 'low', status: 'active' },
      { userId, type: 'stock', name: 'Infosys', symbol: 'INFY', quantity: 30, purchasePrice: 1480, purchaseDate: d(200), totalInvestedAmount: 44400, currentPrice: 1620, currentValue: 48600, platform: 'Zerodha', riskLevel: 'low', status: 'active' },
      { userId, type: 'stock', name: 'HDFC Bank', symbol: 'HDFCBANK', quantity: 20, purchasePrice: 1550, purchaseDate: d(180), totalInvestedAmount: 31000, currentPrice: 1740, currentValue: 34800, platform: 'Groww', riskLevel: 'low', status: 'active' },
      { userId, type: 'stock', name: 'Bajaj Finance', symbol: 'BAJFINANCE', quantity: 10, purchasePrice: 6800, purchaseDate: d(150), totalInvestedAmount: 68000, currentPrice: 7450, currentValue: 74500, platform: 'Zerodha', riskLevel: 'moderate', status: 'active' },
      { userId, type: 'mutual_fund', name: 'Axis Bluechip Fund', symbol: 'AXISBLUECHIP', quantity: 500, purchasePrice: 48.5, purchaseDate: d(540), totalInvestedAmount: 24250, currentPrice: 56.2, currentValue: 28100, isSIP: true, sipAmount: 5000, platform: 'Groww', riskLevel: 'moderate', status: 'active' },
      { userId, type: 'mutual_fund', name: 'Parag Parikh Flexi Cap', symbol: 'PPFAS', quantity: 800, purchasePrice: 62.3, purchaseDate: d(450), totalInvestedAmount: 49840, currentPrice: 74.8, currentValue: 59840, isSIP: true, sipAmount: 10000, platform: 'Coin by Zerodha', riskLevel: 'moderate', status: 'active' },
      { userId, type: 'mutual_fund', name: 'SBI Small Cap Fund', symbol: 'SBISMALLCAP', quantity: 350, purchasePrice: 115, purchaseDate: d(365), totalInvestedAmount: 40250, currentPrice: 142, currentValue: 49700, isSIP: true, sipAmount: 5000, platform: 'Groww', riskLevel: 'high', status: 'active' },
      { userId, type: 'fd', name: 'HDFC FD - 1 Year', quantity: 1, purchasePrice: 500000, purchaseDate: d(180), totalInvestedAmount: 500000, currentValue: 535000, platform: 'HDFC Bank', riskLevel: 'very_low', status: 'active' },
      { userId, type: 'gold', name: 'Sovereign Gold Bond 2024', quantity: 10, purchasePrice: 5800, purchaseDate: d(200), totalInvestedAmount: 58000, currentPrice: 6450, currentValue: 64500, platform: 'RBI', riskLevel: 'low', status: 'active' },
      { userId, type: 'crypto', name: 'Bitcoin', symbol: 'BTC', quantity: 0.05, purchasePrice: 4200000, purchaseDate: d(365), totalInvestedAmount: 210000, currentPrice: 7500000, currentValue: 375000, platform: 'WazirX', riskLevel: 'very_high', status: 'active' },
      { userId, type: 'crypto', name: 'Ethereum', symbol: 'ETH', quantity: 1.2, purchasePrice: 180000, purchaseDate: d(300), totalInvestedAmount: 216000, currentPrice: 265000, currentValue: 318000, platform: 'WazirX', riskLevel: 'high', status: 'active' },
    ]);
    console.log(`   ✅ ${investments.length} investments created\n`);

    // ─── 9. Credit Card Bills ─────────────────────────────────────
    console.log('💳 Creating credit card bills...');
    const ccBills = await CreditCardBill.insertMany([
      { userId, cardProvider: 'HDFC Bank', cardLastFourDigits: '4521', statementDate: d(5), dueDate: futureDate(20), totalAmount: 45230, minimumDue: 4523, creditLimit: 300000, spendingByCategory: [{ category: 'shopping', amount: 18000 }, { category: 'dining', amount: 12000 }, { category: 'travel', amount: 15230 }] },
      { userId, cardProvider: 'ICICI Bank', cardLastFourDigits: '8734', statementDate: d(3), dueDate: futureDate(22), totalAmount: 28750, minimumDue: 2875, creditLimit: 200000, spendingByCategory: [{ category: 'shopping', amount: 15000 }, { category: 'groceries', amount: 8750 }, { category: 'entertainment', amount: 5000 }] },
      { userId, cardProvider: 'Axis Bank', cardLastFourDigits: '2190', statementDate: d(8), dueDate: futureDate(17), totalAmount: 15680, minimumDue: 1568, creditLimit: 150000, spendingByCategory: [{ category: 'fuel', amount: 8000 }, { category: 'dining', amount: 4680 }, { category: 'utilities', amount: 3000 }] },
    ]);
    console.log(`   ✅ ${ccBills.length} credit card bills created\n`);

    // ─── 10. Debts ────────────────────────────────────────────────
    console.log('🏠 Creating debts...');
    const debts = await Debt.insertMany([
      {
        userId,
        debtType: 'home_loan',
        creditor: { name: 'HDFC Home Loans', type: 'bank', accountNumber: 'HL2021004567' },
        loanDetails: { principalAmount: 4500000, currentBalance: 3850000, interestRate: 8.5, tenure: 240, emi: 39000, startDate: d(1460) },
        paymentHistory: Array.from({ length: 24 }, (_, i) => ({
          date: d(720 - i * 30),
          totalPaid: 39000,
          principalPaid: 15000 + i * 200,
          interestPaid: 24000 - i * 200,
          status: 'on_time',
        })),
        statistics: { totalPaid: 936000, totalInterestPaid: 520000, totalPrincipalPaid: 416000 },
      },
      {
        userId,
        debtType: 'car_loan',
        creditor: { name: 'ICICI Bank', type: 'bank', accountNumber: 'CL2023001234' },
        loanDetails: { principalAmount: 800000, currentBalance: 580000, interestRate: 9.5, tenure: 60, emi: 16800, startDate: d(420) },
        paymentHistory: Array.from({ length: 14 }, (_, i) => ({
          date: d(420 - i * 30),
          totalPaid: 16800,
          principalPaid: 10500 + i * 100,
          interestPaid: 6300 - i * 100,
          status: 'on_time',
        })),
        statistics: { totalPaid: 235200, totalInterestPaid: 78400, totalPrincipalPaid: 156800 },
      },
      {
        userId,
        debtType: 'education_loan',
        creditor: { name: 'SBI Education', type: 'bank', accountNumber: 'EL2020005678' },
        loanDetails: { principalAmount: 1200000, currentBalance: 450000, interestRate: 7.5, tenure: 84, emi: 18500, startDate: d(1200) },
        paymentHistory: Array.from({ length: 40 }, (_, i) => ({
          date: d(1200 - i * 30),
          totalPaid: 18500,
          principalPaid: 12000 + i * 150,
          interestPaid: 6500 - i * 150,
          status: 'on_time',
        })),
        statistics: { totalPaid: 740000, totalInterestPaid: 140000, totalPrincipalPaid: 600000 },
      },
    ]);
    console.log(`   ✅ ${debts.length} debts created\n`);

    // ─── 11. Financial Goals ──────────────────────────────────────
    console.log('🎯 Creating financial goals...');
    const goals = await FinancialGoal.insertMany([
      { userId, name: 'Emergency Fund', category: 'emergency_fund', targetAmount: 600000, currentAmount: 385000, targetDate: futureDate(270), progressPercentage: 64, priority: 'high', status: 'active', contributions: Array.from({ length: 8 }, (_, i) => ({ amount: randomBetween(30000, 60000), date: d(240 - i * 30), note: `Monthly contribution ${i + 1}` })) },
      { userId, name: 'Dream Vacation to Europe', category: 'vacation', targetAmount: 500000, currentAmount: 180000, targetDate: futureDate(365), progressPercentage: 36, priority: 'medium', status: 'active', contributions: Array.from({ length: 6 }, (_, i) => ({ amount: 30000, date: d(180 - i * 30), note: `Travel fund ${i + 1}` })) },
      { userId, name: 'Down Payment for House', category: 'home_purchase', targetAmount: 2000000, currentAmount: 850000, targetDate: futureDate(730), progressPercentage: 42.5, priority: 'high', status: 'active', contributions: Array.from({ length: 12 }, (_, i) => ({ amount: randomBetween(50000, 90000), date: d(360 - i * 30), note: `House fund ${i + 1}` })) },
      { userId, name: 'New Car Fund', category: 'car_purchase', targetAmount: 1200000, currentAmount: 420000, targetDate: futureDate(540), progressPercentage: 35, priority: 'medium', status: 'active', contributions: Array.from({ length: 7 }, (_, i) => ({ amount: 60000, date: d(210 - i * 30), note: `Car fund ${i + 1}` })) },
      { userId, name: "Child's Education Fund", category: 'education', targetAmount: 5000000, currentAmount: 1250000, targetDate: futureDate(3650), progressPercentage: 25, priority: 'high', status: 'active', contributions: Array.from({ length: 15 }, (_, i) => ({ amount: randomBetween(70000, 100000), date: d(450 - i * 30), note: `Education fund ${i + 1}` })) },
      { userId, name: 'Wedding Fund', category: 'wedding', targetAmount: 3000000, currentAmount: 3000000, targetDate: d(30), progressPercentage: 100, priority: 'high', status: 'completed', contributions: Array.from({ length: 24 }, (_, i) => ({ amount: 125000, date: d(750 - i * 30), note: `Wedding fund ${i + 1}` })) },
    ]);
    console.log(`   ✅ ${goals.length} financial goals created\n`);

    // ─── 12. Insurance Policies ───────────────────────────────────
    console.log('🛡️ Creating insurance policies...');
    const insurance = await InsurancePolicy.insertMany([
      {
        userId,
        policyType: 'life_term',
        provider: { name: 'HDFC Life', policyNumber: 'HDFC-TL-2022-001' },
        policyDetails: { startDate: d(730), endDate: futureDate(10950), coverageAmount: 10000000, premiumAmount: 12500, premiumFrequency: 'monthly' },
        insured: [{ name: DEMO_NAME, relationship: 'self', dateOfBirth: new Date('1992-06-15') }],
        nominees: [{ name: 'Spouse Demo', relationship: 'spouse', percentage: 100 }],
      },
      {
        userId,
        policyType: 'health_individual',
        provider: { name: 'Star Health', policyNumber: 'STAR-H-2023-042' },
        policyDetails: { startDate: d(365), endDate: futureDate(365), coverageAmount: 1000000, premiumAmount: 18000, premiumFrequency: 'yearly' },
        insured: [
          { name: DEMO_NAME, relationship: 'self', dateOfBirth: new Date('1992-06-15') },
          { name: 'Spouse Demo', relationship: 'spouse', dateOfBirth: new Date('1994-03-22') },
        ],
      },
      {
        userId,
        policyType: 'vehicle_car',
        provider: { name: 'ICICI Lombard', policyNumber: 'ICICI-M-2024-178' },
        policyDetails: { startDate: d(90), endDate: futureDate(275), coverageAmount: 800000, premiumAmount: 22000, premiumFrequency: 'yearly' },
      },
      {
        userId,
        policyType: 'life_ulip',
        provider: { name: 'SBI Life', policyNumber: 'SBI-ULIP-2021-055' },
        policyDetails: { startDate: d(1095), endDate: futureDate(3650), coverageAmount: 5000000, premiumAmount: 50000, premiumFrequency: 'yearly' },
      },
    ]);
    console.log(`   ✅ ${insurance.length} insurance policies created\n`);

    // ─── 13. Loans Given ──────────────────────────────────────────
    console.log('🤝 Creating loans given...');
    const loansGiven = await LoanGiven.insertMany([
      { userId, borrowerName: 'Rahul Sharma', relationship: 'Friend', amount: 50000, currency: 'INR', amountInINR: 50000, loanDate: d(120), expectedRepaymentDate: futureDate(60), status: 'partially_paid', totalRepaid: 20000, repayments: [{ amount: 10000, amountInINR: 10000, date: d(60), note: 'Partial repayment' }, { amount: 10000, amountInINR: 10000, date: d(30), note: 'Partial repayment' }] },
      { userId, borrowerName: 'Priya Patel', relationship: 'Colleague', amount: 30000, currency: 'INR', amountInINR: 30000, loanDate: d(90), expectedRepaymentDate: futureDate(30), status: 'partially_paid', totalRepaid: 15000, repayments: [{ amount: 15000, amountInINR: 15000, date: d(30), note: 'Half returned' }] },
      { userId, borrowerName: 'Vikram Singh', relationship: 'Relative', amount: 100000, currency: 'INR', amountInINR: 100000, loanDate: d(300), expectedRepaymentDate: d(60), status: 'fully_paid', totalRepaid: 100000, repayments: [{ amount: 50000, amountInINR: 50000, date: d(180), note: 'Partial' }, { amount: 50000, amountInINR: 50000, date: d(60), note: 'Final' }] },
    ]);
    console.log(`   ✅ ${loansGiven.length} loans given created\n`);

    // ─── 14. Personal Loans (Borrowed) ────────────────────────────
    console.log('💵 Creating personal loans...');
    const personalLoans = await PersonalLoan.insertMany([
      { userId, lenderName: 'Father', relationship: 'Family', principalAmount: 200000, loanTakenDate: d(365), interestRate: 0, interestType: 'none', status: 'active', totalRepaid: 120000, contactDetails: { phone: '9111222333' } },
      { userId, lenderName: 'Amit Kumar', relationship: 'Friend', principalAmount: 50000, loanTakenDate: d(180), interestRate: 0, interestType: 'none', status: 'repaid', totalRepaid: 50000 },
    ]);
    console.log(`   ✅ ${personalLoans.length} personal loans created\n`);

    // ─── 15. Bill Reminders ───────────────────────────────────────
    console.log('🔔 Creating bill reminders...');
    const bills = await BillReminder.insertMany([
      { userId, title: 'Electricity Bill', amount: 3500, category: 'electricity', dueDate: futureDate(8), frequency: 'monthly', status: 'pending', vendor: { name: 'TSSPDCL' } },
      { userId, title: 'Internet - ACT Fibernet', amount: 1199, category: 'internet', dueDate: futureDate(12), frequency: 'monthly', status: 'pending', vendor: { name: 'ACT Fibernet' } },
      { userId, title: 'Mobile Recharge', amount: 599, category: 'mobile', dueDate: futureDate(5), frequency: 'monthly', status: 'pending', vendor: { name: 'Jio' } },
      { userId, title: 'House Rent', amount: 25000, category: 'rent', dueDate: futureDate(3), frequency: 'monthly', status: 'pending', vendor: { name: 'Landlord' } },
      { userId, title: 'Home Loan EMI', amount: 39000, category: 'loan', dueDate: futureDate(7), frequency: 'monthly', status: 'pending', autoPayEnabled: true, vendor: { name: 'HDFC Bank' } },
      { userId, title: 'Car Loan EMI', amount: 16800, category: 'loan', dueDate: futureDate(10), frequency: 'monthly', status: 'pending', autoPayEnabled: true, vendor: { name: 'ICICI Bank' } },
      { userId, title: 'Society Maintenance', amount: 4500, category: 'other', dueDate: futureDate(15), frequency: 'monthly', status: 'pending', vendor: { name: 'Resident Welfare Association' } },
      { userId, title: 'Water Bill', amount: 800, category: 'water', dueDate: futureDate(18), frequency: 'monthly', status: 'pending', vendor: { name: 'HMWSSB' } },
      { userId, title: 'Gas Cylinder', amount: 950, category: 'gas', dueDate: futureDate(25), frequency: 'monthly', status: 'pending', vendor: { name: 'HP Gas' } },
      { userId, title: 'Health Insurance Premium', amount: 18000, category: 'insurance', dueDate: futureDate(45), frequency: 'yearly', status: 'pending', vendor: { name: 'Star Health' } },
    ]);
    console.log(`   ✅ ${bills.length} bill reminders created\n`);

    // ─── 16. Subscriptions ────────────────────────────────────────
    console.log('📺 Creating subscriptions...');
    const subs = await Subscription.insertMany([
      { userId, serviceName: 'Netflix', category: 'streaming', pricing: { amount: 649, billingCycle: 'monthly' }, dates: { startDate: d(365), renewalDate: futureDate(15) }, status: 'active', autoRenewal: true },
      { userId, serviceName: 'Spotify Premium', category: 'music', pricing: { amount: 119, billingCycle: 'monthly' }, dates: { startDate: d(540), renewalDate: futureDate(10) }, status: 'active', autoRenewal: true },
      { userId, serviceName: 'Amazon Prime', category: 'streaming', pricing: { amount: 1499, billingCycle: 'yearly' }, dates: { startDate: d(120), renewalDate: futureDate(245) }, status: 'active', autoRenewal: true },
      { userId, serviceName: 'YouTube Premium', category: 'streaming', pricing: { amount: 149, billingCycle: 'monthly' }, dates: { startDate: d(300), renewalDate: futureDate(18) }, status: 'active', autoRenewal: true },
      { userId, serviceName: 'Disney+ Hotstar', category: 'streaming', pricing: { amount: 1499, billingCycle: 'yearly' }, dates: { startDate: d(60), renewalDate: futureDate(305) }, status: 'active', autoRenewal: true },
      { userId, serviceName: 'Zerodha (Kite)', category: 'productivity', pricing: { amount: 0, billingCycle: 'monthly' }, dates: { startDate: d(730) }, status: 'active', autoRenewal: true },
      { userId, serviceName: 'Groww Pro', category: 'productivity', pricing: { amount: 499, billingCycle: 'monthly' }, dates: { startDate: d(180), renewalDate: futureDate(20) }, status: 'active', autoRenewal: true },
      { userId, serviceName: 'Gym Membership', category: 'fitness', pricing: { amount: 2500, billingCycle: 'monthly' }, dates: { startDate: d(420), renewalDate: futureDate(8) }, status: 'active', autoRenewal: false },
      { userId, serviceName: 'iCloud+ Storage', category: 'software', pricing: { amount: 75, billingCycle: 'monthly' }, dates: { startDate: d(365), renewalDate: futureDate(22) }, status: 'active', autoRenewal: true },
      { userId, serviceName: 'LinkedIn Premium', category: 'productivity', pricing: { amount: 1500, billingCycle: 'monthly' }, dates: { startDate: d(90), renewalDate: futureDate(5) }, status: 'active', autoRenewal: true },
    ]);
    console.log(`   ✅ ${subs.length} subscriptions created\n`);

    // ─── 17. Net Worth Snapshots ──────────────────────────────────
    console.log('📊 Creating net worth snapshots...');
    const netWorthSnapshots = [];
    for (let m = 0; m < 12; m++) {
      const baseAssets = 3500000 + m * 120000;
      const baseLiabilities = 5000000 - m * 40000;
      netWorthSnapshots.push({
        userId,
        date: d(360 - m * 30),
        period: 'monthly',
        netWorth: baseAssets - baseLiabilities,
        assets: {
          cash: 50000 + m * 5000,
          bankSavings: 600000 + m * 30000,
          stocks: 250000 + m * 15000,
          mutualFunds: 100000 + m * 8000,
          crypto: 300000 + m * 25000,
          gold: 58000 + m * 2000,
          realEstate: 2000000,
          fixedDeposits: 500000,
        },
        liabilities: {
          homeLoan: 3850000 - m * 15000,
          carLoan: 580000 - m * 15700,
          educationLoan: 450000 - m * 12000,
          creditCard: 40000 + (m % 3) * 10000,
        },
        totals: {
          totalAssets: baseAssets,
          totalLiabilities: baseLiabilities,
          netWorth: baseAssets - baseLiabilities,
        },
      });
    }
    await NetWorthSnapshot.insertMany(netWorthSnapshots);
    console.log(`   ✅ ${netWorthSnapshots.length} net worth snapshots created\n`);

    // ─── 18. Portfolio ────────────────────────────────────────────
    console.log('💼 Creating portfolios...');
    const portfolios = await Portfolio.insertMany([
      {
        userId,
        name: 'Long Term Growth',
        type: 'mixed',
        holdings: [
          { symbol: 'RELIANCE', quantity: 25, averagePrice: 2450, currentPrice: 2890 },
          { symbol: 'TCS', quantity: 15, averagePrice: 3650, currentPrice: 4120 },
          { symbol: 'INFY', quantity: 30, averagePrice: 1480, currentPrice: 1620 },
          { symbol: 'HDFCBANK', quantity: 20, averagePrice: 1550, currentPrice: 1740 },
        ],
        performance: { totalInvested: 259400, currentValue: 291950, returns: 32550, returnsPercentage: 12.5 },
        risk: { level: 'medium', beta: 0.95, sharpeRatio: 1.2 },
      },
      {
        userId,
        name: 'SIP Portfolio',
        type: 'mutual_funds',
        holdings: [
          { symbol: 'AXISBLUECHIP', quantity: 500, averagePrice: 48.5, currentPrice: 56.2 },
          { symbol: 'PPFAS', quantity: 800, averagePrice: 62.3, currentPrice: 74.8 },
          { symbol: 'SBISMALLCAP', quantity: 350, averagePrice: 115, currentPrice: 142 },
        ],
        performance: { totalInvested: 114340, currentValue: 137640, returns: 23300, returnsPercentage: 20.4 },
        risk: { level: 'medium', beta: 1.1, sharpeRatio: 1.4 },
      },
      {
        userId,
        name: 'Crypto Holdings',
        type: 'crypto',
        holdings: [
          { symbol: 'BTC', quantity: 0.05, averagePrice: 4200000, currentPrice: 7500000 },
          { symbol: 'ETH', quantity: 1.2, averagePrice: 180000, currentPrice: 265000 },
        ],
        performance: { totalInvested: 426000, currentValue: 693000, returns: 267000, returnsPercentage: 62.7 },
        risk: { level: 'high', beta: 2.1, sharpeRatio: 0.8 },
      },
    ]);
    console.log(`   ✅ ${portfolios.length} portfolios created\n`);

    // ─── 19. Real Estate ──────────────────────────────────────────
    console.log('🏡 Creating real estate...');
    const properties = await RealEstate.insertMany([
      {
        userId,
        propertyType: 'residential_apartment',
        propertyDetails: { address: { street: 'Flat 602, Green Valley Apartments, Banjara Hills', city: 'Hyderabad', state: 'Telangana', zipCode: '500034', country: 'India' }, area: { value: 1350, unit: 'sqft' }, bedrooms: 3 },
        ownership: { ownershipType: 'sole', purchaseDate: d(1460) },
        financial: { purchasePrice: 7500000, currentValue: 9200000 },
        mortgage: { lender: 'HDFC Home Loans', loanAmount: 4500000, emi: 39000, remainingBalance: 3850000, interestRate: 8.5 },
        status: 'owned',
      },
      {
        userId,
        propertyType: 'residential_plot',
        propertyDetails: { address: { street: 'Plot 45, Shankarpally, RR District', city: 'Hyderabad', state: 'Telangana', zipCode: '501203', country: 'India' }, area: { value: 200, unit: 'sqft' } },
        ownership: { ownershipType: 'sole', purchaseDate: d(730) },
        financial: { purchasePrice: 2000000, currentValue: 2800000 },
        status: 'owned',
      },
    ]);
    console.log(`   ✅ ${properties.length} real estate entries created\n`);

    // ─── 20. Retirement Plan ──────────────────────────────────────
    console.log('🏖️ Creating retirement plan...');
    await RetirementPlan.create({
      userId,
      basicInfo: { currentAge: 33, retirementAge: 55, lifeExpectancy: 85 },
      goals: { targetMonthlyIncome: 150000 },
      corpus: { required: 54000000, current: 4850000, gap: 49150000 },
      investments: [
        { type: 'epf', monthlyContribution: 21600, currentValue: 1800000, expectedReturn: 8.5 },
        { type: 'ppf', monthlyContribution: 12500, currentValue: 850000, expectedReturn: 7.1 },
        { type: 'nps', monthlyContribution: 10000, currentValue: 650000, expectedReturn: 10 },
        { type: 'mutual_fund', monthlyContribution: 20000, currentValue: 1200000, expectedReturn: 12 },
        { type: 'stocks', monthlyContribution: 0, currentValue: 291950, expectedReturn: 15 },
      ],
      pension: { expectedMonthlyPension: 25000, pensionType: 'NPS annuity' },
    });
    console.log('   ✅ Retirement plan created\n');

    // ─── 21. Tax Record ───────────────────────────────────────────
    console.log('🧾 Creating tax records...');
    const taxRecords = await TaxRecord.insertMany([
      {
        userId,
        financialYear: '2024-25',
        assessmentYear: '2025-26',
        taxRegime: 'old',
        income: {
          salary: { basic: 1200000, hra: 480000, specialAllowance: 300000, bonus: 240000, total: 2220000 },
          houseProperty: { rental: 0, interestOnLoan: 200000, netIncome: -200000 },
          capitalGains: { shortTerm: 35000, longTerm: 50000, total: 85000 },
          otherSources: { interest: 25000, dividend: 8000, total: 33000 },
        },
        deductions: {
          section80C: { ppf: 50000, elss: 50000, epf: 21600, lifeInsurance: 28400, total: 150000 },
          section80D: { self: 25000, total: 25000 },
          section80E: 0,
          section80TTA: 10000,
          section24: 200000,
        },
        taxableIncome: 1720000,
        taxCalculation: {
          incomeTax: 362500,
          surcharge: 0,
          cess: 14500,
        },
      },
      {
        userId,
        financialYear: '2023-24',
        assessmentYear: '2024-25',
        taxRegime: 'old',
        income: {
          salary: { basic: 1080000, hra: 432000, specialAllowance: 270000, bonus: 198000, total: 1980000 },
          houseProperty: { rental: 0, interestOnLoan: 180000, netIncome: -180000 },
          capitalGains: { shortTerm: 20000, longTerm: 25000, total: 45000 },
          otherSources: { interest: 18000, dividend: 5000, total: 23000 },
        },
        deductions: {
          section80C: { ppf: 50000, elss: 50000, epf: 21600, lifeInsurance: 28400, total: 150000 },
          section80D: { self: 25000, total: 25000 },
          section80TTA: 10000,
          section24: 180000,
        },
        taxableIncome: 1480000,
        taxCalculation: {
          incomeTax: 287500,
          surcharge: 0,
          cess: 11500,
        },
      },
    ]);
    console.log(`   ✅ ${taxRecords.length} tax records created\n`);

    // ─── 22. Automation Rules ─────────────────────────────────────
    console.log('⚙️ Creating automation rules...');
    const automationRules = await AutomationRule.insertMany([
      {
        userId,
        name: 'High Spending Alert',
        description: 'Alert when a single transaction exceeds ₹10,000',
        category: 'alerting',
        trigger: { type: 'amount_above', value: { threshold: 10000, operator: 'greater_than' } },
        action: { type: 'send_notification', params: { title: 'High Spending Alert', message: 'Transaction over ₹10,000 detected' } },
        isActive: true,
        stats: { timesTriggered: 15, lastTriggered: d(2) },
      },
      {
        userId,
        name: 'Budget Overspend Warning',
        description: 'Notify when budget exceeds 80%',
        category: 'budgeting',
        trigger: { type: 'budget_threshold', value: { percentage: 80 } },
        action: { type: 'send_notification', params: { title: 'Budget Warning', message: 'Budget nearing limit' } },
        isActive: true,
        stats: { timesTriggered: 8, lastTriggered: d(5) },
      },
      {
        userId,
        name: 'Auto-Categorize UPI',
        description: 'Automatically categorize UPI transactions',
        category: 'organization',
        trigger: { type: 'category_match', value: { method: 'upi' } },
        action: { type: 'auto_categorize', params: {} },
        isActive: true,
        stats: { timesTriggered: 120, lastTriggered: d(1) },
      },
      {
        userId,
        name: 'Monthly Savings Transfer',
        description: 'Remind to transfer to savings on salary day',
        category: 'saving',
        trigger: { type: 'schedule', value: { dayOfMonth: 1 } },
        action: { type: 'send_notification', params: { title: 'Savings Reminder', message: 'Transfer to savings account' } },
        isActive: true,
        stats: { timesTriggered: 6, lastTriggered: d(28) },
      },
      {
        userId,
        name: 'EMI Due Reminder',
        description: 'Remind 3 days before EMI due date',
        category: 'alerting',
        trigger: { type: 'emi_due', value: { days: 3 } },
        action: { type: 'send_notification', params: { title: 'EMI Due Soon', message: 'EMI payment due in 3 days' } },
        isActive: true,
        stats: { timesTriggered: 12, lastTriggered: d(3) },
      },
    ]);
    console.log(`   ✅ ${automationRules.length} automation rules created\n`);

    // ─── 23. Notifications ────────────────────────────────────────
    console.log('🔔 Creating notifications...');
    const notifications = await Notification.insertMany([
      { userId, type: 'budget_alert', title: 'Shopping Budget at 91%', message: 'Your Shopping budget has reached 91% (₹18,200 of ₹20,000). Consider reducing spending.', priority: 'high', category: 'finance', isRead: false },
      { userId, type: 'bill_reminder', title: 'House Rent Due in 3 Days', message: 'Your house rent of ₹25,000 is due on the 5th. Make sure you have sufficient balance.', priority: 'high', category: 'reminder', isRead: false },
      { userId, type: 'emi_reminder', title: 'iPhone EMI Due on 15th', message: 'Your Apple iPhone 15 Pro EMI of ₹12,500 is due in 15 days.', priority: 'medium', category: 'reminder', isRead: false },
      { userId, type: 'info', title: 'Portfolio Up 2.3% This Week', message: 'Your Long Term Growth portfolio gained ₹6,700 this week. Total value: ₹2,91,950.', priority: 'low', category: 'finance', isRead: true },
      { userId, type: 'goal_milestone', title: 'Emergency Fund 64% Complete', message: "You've saved ₹3,85,000 of your ₹6,00,000 emergency fund goal. Keep it up!", priority: 'low', category: 'finance', isRead: true },
      { userId, type: 'warning', title: 'Unusual Spending Pattern', message: 'We detected unusually high spending on Entertainment this month (₹12,500 vs avg ₹7,000).', priority: 'high', category: 'alert', isRead: false },
      { userId, type: 'cibil_update', title: 'Credit Score Updated', message: 'Your CIBIL score improved to 782 (+12 points from last month).', priority: 'medium', category: 'finance', isRead: true },
      { userId, type: 'info', title: 'Netflix Renewal in 15 Days', message: 'Your Netflix subscription (₹649/month) will auto-renew soon.', priority: 'low', category: 'reminder', isRead: false },
      { userId, type: 'system', title: 'New Feature: AI Insights', message: 'Check out our new AI-powered spending insights on the ML Dashboard!', priority: 'low', category: 'system', isRead: true },
      { userId, type: 'info', title: 'Advance Tax Due Date', message: 'Advance tax for Q4 FY 2025-26 is due on March 15th. Estimated: ₹94,000.', priority: 'high', category: 'reminder', isRead: false },
    ]);
    console.log(`   ✅ ${notifications.length} notifications created\n`);

    // ─── 24. Anomalies ────────────────────────────────────────────
    console.log('🔍 Creating anomalies...');
    const anomalies = await Anomaly.insertMany([
      { userId, anomalyType: 'unusual_spending', severity: 'medium', score: 72, detectionMethod: 'statistical', status: 'detected', isFraud: false },
      { userId, anomalyType: 'category_deviation', severity: 'low', score: 55, detectionMethod: 'ml_model', status: 'resolved', isFraud: false },
      { userId, anomalyType: 'duplicate_transaction', severity: 'high', score: 88, detectionMethod: 'rule_based', status: 'resolved', isFraud: false },
    ]);
    console.log(`   ✅ ${anomalies.length} anomalies created\n`);

    // ─── 25. Predictions ──────────────────────────────────────────
    console.log('🔮 Creating predictions...');
    const predictions = await Prediction.insertMany([
      { userId, predictionType: 'spending', targetDate: futureDate(30), predictedValue: 92000, confidence: 0.85 },
      { userId, predictionType: 'savings', targetDate: futureDate(30), predictedValue: 93000, confidence: 0.78 },
      { userId, predictionType: 'income', targetDate: futureDate(30), predictedValue: 210000, confidence: 0.92 },
      { userId, predictionType: 'financial_health', targetDate: futureDate(365), predictedValue: 3200000, confidence: 0.65 },
    ]);
    console.log(`   ✅ ${predictions.length} predictions created\n`);

    // ─── 26. Analysis ─────────────────────────────────────────────
    console.log('📈 Creating analysis records...');
    await Analysis.create({
      userId,
      analysisType: 'spending_analysis',
      period: { startDate: d(30), endDate: new Date() },
      aiProvider: 'ollama',
      aiModel: 'llama3',
      summary: {
        totalIncome: 210000,
        totalExpenses: 117000,
        netSavings: 93000,
      },
      categoryBreakdown: [
        { category: 'Food & Dining', amount: 15200, percentage: 13 },
        { category: 'Rent', amount: 25000, percentage: 21.4 },
        { category: 'EMI', amount: 34850, percentage: 29.8 },
        { category: 'Shopping', amount: 18200, percentage: 15.6 },
        { category: 'Transport', amount: 4800, percentage: 4.1 },
        { category: 'Utilities', amount: 9700, percentage: 8.3 },
        { category: 'Entertainment', amount: 6500, percentage: 5.6 },
        { category: 'Healthcare', amount: 2750, percentage: 2.4 },
      ],
      insights: [
        { type: 'achievement', title: 'Excellent Savings Rate', description: 'Your savings rate is 44.3%, which is excellent (above 30% benchmark).', impact: 'high', actionable: false },
        { type: 'warning', title: 'High EMI Burden', description: 'EMI payments constitute 29.8% of your expenses - consider prepaying high-interest debts.', impact: 'high', actionable: true, suggestedAction: 'Prepay high-interest EMIs' },
        { type: 'trend', title: 'Food Spending On Track', description: 'Food spending is within budget at 101% of allocated amount.', impact: 'low', actionable: false },
        { type: 'suggestion', title: 'Entertainment Reduced', description: 'Your entertainment spending decreased 15% compared to last month.', impact: 'medium', actionable: false },
      ],
      recommendations: [
        { category: 'Investments', currentSpending: 20000, recommendedSpending: 25000, potentialSavings: 60000, reasoning: 'Increasing SIP contributions by ₹5,000/month for better long-term wealth creation.', priority: 'high', timeframe: 'monthly' },
        { category: 'Emergency Fund', currentSpending: 0, recommendedSpending: 15000, potentialSavings: 180000, reasoning: 'Emergency fund is at 64% - prioritize reaching 100% in the next 4 months.', priority: 'high', timeframe: '4 months' },
        { category: 'EMI', currentSpending: 39000, recommendedSpending: 39000, potentialSavings: 85000, reasoning: 'Look into balance transfer options for the 16% interest Home Interior EMI.', priority: 'medium', timeframe: '1 month' },
        { category: 'Tax Saving', currentSpending: 150000, recommendedSpending: 200000, potentialSavings: 15600, reasoning: 'Explore NPS for additional ₹50,000 deduction under Section 80CCD(1B).', priority: 'medium', timeframe: 'yearly' },
      ],
    });
    console.log('   ✅ Analysis records created\n');

    // ─── Done ─────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('  🎉 Demo Account Created Successfully!');
    console.log('');
    console.log('  ┌─────────────────────────────────────────────────────┐');
    console.log('  │  📧 Email:     demo@financialanalyzer.com          │');
    console.log('  │  🔑 Password:  Demo@123456                         │');
    console.log('  └─────────────────────────────────────────────────────┘');
    console.log('');
    console.log('  Data Created:');
    console.log(`    • Financial Profile with CIBIL score 782`);
    console.log(`    • ${bankAccounts.length} Bank Accounts (₹14,02,000 total)`);
    console.log(`    • ${transactions.length} Transactions (6 months history)`);
    console.log(`    • ${emis.length} EMIs (3 active, 1 completed)`);
    console.log(`    • ${budgets.length} Budgets across categories`);
    console.log(`    • ${investments.length} Investments (stocks, MFs, crypto, gold, FD)`);
    console.log(`    • ${ccBills.length} Credit Card Bills`);
    console.log(`    • ${debts.length} Debts (home, car, education loans)`);
    console.log(`    • ${goals.length} Financial Goals`);
    console.log(`    • ${insurance.length} Insurance Policies`);
    console.log(`    • ${loansGiven.length} Loans Given`);
    console.log(`    • ${personalLoans.length} Personal Loans`);
    console.log(`    • ${bills.length} Bill Reminders`);
    console.log(`    • ${subs.length} Subscriptions`);
    console.log(`    • ${netWorthSnapshots.length} Net Worth Snapshots`);
    console.log(`    • ${portfolios.length} Portfolios`);
    console.log(`    • ${properties.length} Real Estate Properties`);
    console.log(`    • 1 Retirement Plan`);
    console.log(`    • ${taxRecords.length} Tax Records`);
    console.log(`    • ${automationRules.length} Automation Rules`);
    console.log(`    • ${notifications.length} Notifications`);
    console.log(`    • ${anomalies.length} Anomalies`);
    console.log(`    • ${predictions.length} Predictions`);
    console.log(`    • 1 Monthly Analysis`);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error seeding demo account:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

seedDemoAccount();
