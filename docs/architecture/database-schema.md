# Database Schema Reference

> All 47 Mongoose models documented with fields, types, and relationships

---

## Core User Models

### User
**File:** `backend/models/User.js` (168 lines)

| Field | Type | Description |
|-------|------|-------------|
| `name` | String | User display name (trimmed) |
| `email` | String | Unique, lowercase, indexed |
| `password` | String | bcrypt hashed (select: false) |
| `role` | Enum | `user` / `lender` / `admin` (default: user) |
| `isActive` | Boolean | Account active status (default: true) |
| `failedLoginAttempts` | Number | Counter for lockout (default: 0) |
| `lockUntil` | Date | Account lock expiry timestamp |
| `lastLogin` | Date | Last successful login |
| `profile` | ObjectId → FinancialProfile | Profile reference |
| `twoFactorAuth.enabled` | Boolean | 2FA enabled flag |
| `twoFactorAuth.secret` | String | AES-256-GCM encrypted TOTP secret |
| `twoFactorAuth.backupCodes` | [String] | Recovery codes |
| `twoFactorAuth.verified` | Boolean | 2FA setup verified |
| `createdAt` / `updatedAt` | Date | Timestamps |

**Security:** Password auto-hashed on save (bcrypt, 10 rounds). 2FA secret auto-decrypted on query. Sensitive fields stripped from JSON output.

---

### FinancialProfile
**File:** `backend/models/FinancialProfile.js`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId → User | Owner reference |
| `fullName` | String | Full name |
| `dateOfBirth` | Date | Date of birth |
| `panNumber` | String | PAN card number |
| `phoneNumber` | String | Phone |
| `gender` | String | Gender |
| `occupation` | String | Occupation type |
| `city` / `state` | String | Location |
| `bio` | String | User bio |
| `monthlyIncome` | Number | Monthly salary/income |
| `savingsGoal` | Number | Monthly savings target |
| `currency` | String | Preferred currency code |
| `language` | String | Preferred language |
| `budgets` | Map | Category → amount budget map |
| `preferences` | Object | Notification/display preferences |
| `customCategories` | [String] | User-defined categories |
| `creditScore` | Object | Credit score data (score, factors, history) |

---

## Transaction & Financial Models

### Transaction
**File:** `backend/models/Transaction.js` (319 lines)

| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId → User | Owner |
| `documentId` | ObjectId → Document | Source document |
| `date` | Date | Transaction date (indexed) |
| `description` | String | Transaction description |
| `amount` | Number | Amount (required) |
| `currency` | String | Currency code (default: INR) |
| `type` | Enum | `debit` / `credit` / `transfer` |
| `category` | String | Category (lowercase, indexed) |
| `subcategory` | String | Subcategory |
| `merchantName` | String | Merchant name |
| `paymentMethod` | Enum | `cash` / `card` / `upi` / `bank_transfer` / `wallet` / `net_banking` / `cheque` / `IMPS` / `NEFT` / `RTGS` |
| `source` | Enum | `manual` / `upload` / `bank_statement` / `gmail_attachment` / `gmail_email` / `api` / `quick_entry` |
| `location` | String | Location of transaction |
| `accountNumber` | String | Masked account number |
| `referenceNumber` | String | Reference/UTR number |
| `balance` | Number | Running balance |
| `isRecurring` | Boolean | Recurring transaction flag |
| `recurringPattern` | Object | frequency, dayOfMonth, confidence |
| `tags` | [String] | User tags |
| `notes` | String | User notes |
| `upiDetails` | Object | VPA, UTR, reference, app, payer, payee |
| `emailMetadata` | Object | from, subject, receivedDate |
| `confidence` | Number | Extraction confidence (0-1) |
| `isVerified` | Boolean | User-verified flag |
| `aiProcessed` | Boolean | AI enrichment completed |
| `extractionMethod` | Enum | `ocr` / `pdf_text` / `csv_parse` / `manual` / `ai_enhanced` |
| `aiEnhancements` | Object | suggestedCategory, merchant, confidence, tags |
| `processingMetadata` | Object | Additional processing data |

**Indexes:** Full-text search (weighted), compound indexes: userId+date, userId+category, userId+type+date

**Static Methods:** `getSpendingByCategory(userId, startDate, endDate)`

---

### Budget
**File:** `backend/models/Budget.js` (211 lines)

| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId → User | Owner |
| `category` | String | Budget category (required) |
| `amount` | Number | Budget limit (min: 0) |
| `period` | Enum | `MONTHLY` / `WEEKLY` / `YEARLY` |
| `startDate` | Date | Budget period start |
| `endDate` | Date | Budget period end |
| `isActive` | Boolean | Active status (default: true) |
| `alertThreshold` | Number | Alert percentage threshold (default: 80) |
| `notifications.email` | Boolean | Email alerts enabled |
| `notifications.push` | Boolean | Push alerts enabled |
| `spent` | Number | Current spent amount (auto-calculated) |
| `rollover.enabled` | Boolean | Rollover unused budget |
| `rollover.amount` | Number | Rollover amount |
| `notes` | String | Budget notes |

**Virtuals:** `remaining`, `percentageUsed`, `status` (GOOD/MODERATE/WARNING/EXCEEDED), `isOverBudget`

**Constraint:** Unique compound index: userId + category + period

---

### EMI
**File:** `backend/models/EMI.js` (481 lines)

| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId → User | Owner |
| `cardProvider` | String | Credit card provider |
| `cardLast4` | String | Last 4 digits |
| `cardHolderName` | String | Cardholder name |
| `merchantName` | String | Merchant/seller |
| `productName` | String | Product purchased |
| `principalAmount` | Number | Principal in original currency |
| `principalAmountINR` | Number | Principal in INR |
| `interestRate` | Number | Interest rate |
| `interestType` | Enum | `percentage` / `flat` |
| `processingFee` | Number | Processing fee |
| `emiAmount` | Number | Monthly EMI amount |
| `emiAmountINR` | Number | EMI in INR |
| `currency` | String | Original currency |
| `exchangeRate` | Number | Exchange rate used |
| `tenure` | Object | total, paid, remaining months |
| `repaymentType` | Enum | `MONTHLY` / `ON_REQUEST` |
| `dates` | Object | startDate, endDate, nextDueDate |
| `paymentHistory` | [Object] | Per-installment tracking (date, amount, principal, interest, status) |
| `statementReferences` | [Object] | Statement document references |
| `status` | Enum | `active` / `completed` / `foreclosed` / `cancelled` |
| `bankDeduction` | Object | Bank account, auto-deduction config |

---

### Investment
**File:** `backend/models/Investment.js`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId → User | Owner |
| `type` | String | Investment type (stocks, MF, FD, gold, crypto, etc.) |
| `name` | String | Investment name |
| `symbol` | String | Ticker symbol |
| `quantity` | Number | Units held |
| `buyPrice` | Number | Purchase price per unit |
| `currentPrice` | Number | Current market price |
| `totalInvested` | Number | Total investment amount |
| `currentValue` | Number | Current market value |
| `returns` | Object | absolute, percentage, CAGR, XIRR |
| `dividends` | [Object] | Dividend history |
| `transactions` | [Object] | Buy/sell transaction history |
| `maturityDate` | Date | Maturity date (for FDs) |
| `interestRate` | Number | Interest rate (for FDs/bonds) |
| `status` | Enum | `active` / `sold` / `matured` |

---

### Debt
**File:** `backend/models/Debt.js`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId → User | Owner |
| `name` | String | Debt name |
| `type` | String | Debt type (loan, credit card, etc.) |
| `originalAmount` | Number | Original debt amount |
| `currentBalance` | Number | Current balance |
| `interestRate` | Number | Annual interest rate |
| `minimumPayment` | Number | Minimum monthly payment |
| `dueDate` | Date | Next payment due |
| `lender` | String | Lender name |
| `status` | Enum | `active` / `paid_off` |

---

### FinancialGoal
**File:** `backend/models/FinancialGoal.js`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId → User | Owner |
| `title` | String | Goal title |
| `type` | String | Goal type (emergency fund, retirement, etc.) |
| `targetAmount` | Number | Target amount |
| `currentAmount` | Number | Current saved amount |
| `deadline` | Date | Target completion date |
| `priority` | Enum | `high` / `medium` / `low` |
| `monthlyContribution` | Number | Monthly contribution |
| `milestones` | [Object] | Milestone definitions |
| `status` | Enum | `active` / `completed` / `paused` |

---

### NetWorthSnapshot
**File:** `backend/models/NetWorthSnapshot.js`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId → User | Owner |
| `date` | Date | Snapshot date |
| `assets` | Object | Asset categories with values |
| `liabilities` | Object | Liability categories with values |
| `totalAssets` | Number | Sum of all assets |
| `totalLiabilities` | Number | Sum of all liabilities |
| `netWorth` | Number | Total assets - total liabilities |
| `source` | Enum | `manual` / `auto_generated` |

---

## Banking & Lending Models

### BankAccount
| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId | Owner |
| `bankName` | String | Bank name |
| `accountNumber` | String | Masked account number |
| `accountType` | String | savings / current / salary |
| `balance` | Number | Current balance |
| `ifscCode` | String | IFSC code |
| `isDefault` | Boolean | Default account flag |

### CreditCardBill
| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId | Owner |
| `cardProvider` | String | Card issuer |
| `cardLast4` | String | Last 4 digits |
| `billingPeriod` | Object | start, end dates |
| `totalAmount` | Number | Total bill amount |
| `minimumDue` | Number | Minimum payment |
| `dueDate` | Date | Payment due date |
| `transactions` | [Object] | Itemized transactions |
| `status` | Enum | `pending` / `paid` / `partial` |

### PersonalLoan / LoanGiven / Lender / LenderLoan / LenderPayment
Models for tracking personal borrowing, loans given to others, lender management, and payment tracking.

---

## Notification & Automation Models

### Notification
| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId | Recipient |
| `type` | String | Notification type |
| `title` | String | Notification title |
| `message` | String | Notification body |
| `priority` | Enum | `low` / `medium` / `high` / `critical` |
| `isRead` | Boolean | Read status |
| `actionUrl` | String | Action link |

### BillReminder
| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId | Owner |
| `title` | String | Reminder title |
| `amount` | Number | Expected amount |
| `dueDate` | Date | Due date |
| `frequency` | String | Recurring frequency |
| `category` | String | Bill category |
| `isAutoPay` | Boolean | Auto-pay enabled |
| `remindBefore` | Number | Remind X days before |

### AutomationRule / AutomationLog
Rule-based automation engine with conditions, actions, triggers, and execution logging.

### ActivityLog
Comprehensive activity audit trail with user, action, metadata, IP address, and timestamp.

---

## Document & Receipt Models

### Document
| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId | Owner |
| `filename` | String | Original filename |
| `filepath` | String | Storage path |
| `type` | String | Document type (bank_statement, etc.) |
| `size` | Number | File size in bytes |
| `mimeType` | String | MIME type |
| `isProcessed` | Boolean | AI processing completed |
| `extractedData` | Mixed | Parsed data |
| `password` | String | Document password (if encrypted) |

### Receipt
| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId | Owner |
| `merchantName` | String | Merchant from OCR |
| `amount` | Number | Amount from OCR |
| `date` | Date | Date from OCR |
| `category` | String | Auto-categorized |
| `imagePath` | String | Receipt image path |
| `ocrText` | String | Raw OCR text |
| `confidence` | Number | OCR confidence score |

---

## Specialized Models

### InsurancePolicy, RealEstate, RetirementPlan, TaxRecord, Subscription, SplitExpense, CompanyExpense, FamilyMember, Group, Currency, Template, Portfolio

Each provides domain-specific schema for its respective feature with full CRUD support, user ownership, and timestamps.

---

## AI & ML Models

### MLModel
| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId | Owner |
| `name` | String | Model name |
| `type` | String | Model type (categorizer, predictor, etc.) |
| `version` | Number | Model version |
| `accuracy` | Number | Model accuracy score |
| `trainedAt` | Date | Last training timestamp |
| `parameters` | Mixed | Model hyperparameters |
| `metrics` | Object | Performance metrics |
| `status` | Enum | `training` / `active` / `deprecated` |

### Prediction
| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId | Owner |
| `modelId` | ObjectId → MLModel | Source model |
| `type` | String | Prediction type |
| `input` | Mixed | Input features |
| `output` | Mixed | Prediction result |
| `confidence` | Number | Prediction confidence |
| `feedback` | Object | User feedback on accuracy |

### Anomaly
| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId | Owner |
| `transactionId` | ObjectId → Transaction | Flagged transaction |
| `type` | String | Anomaly type |
| `severity` | Enum | `low` / `medium` / `high` / `critical` |
| `score` | Number | Anomaly score |
| `explanation` | String | Human-readable explanation |
| `isResolved` | Boolean | Resolution status |

---

## Business Models

### Client, Contract, Invoice, Project, Vendor
Full business management schema supporting freelancer/enterprise features:
- Client management with contact info and billing
- Contract tracking with terms and milestones
- Invoice generation with line items and payment tracking
- Project management with budgets and timelines
- Vendor management with payment terms

---

## Token Management

### RefreshToken
| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId → User | Token owner |
| `token` | String | JWT refresh token (indexed, unique) |
| `expiresAt` | Date | Token expiry (TTL index for auto-cleanup) |
| `isRevoked` | Boolean | Revocation status |
| `ipAddress` | String | IP where token was issued |
| `createdAt` | Date | Issue timestamp |
