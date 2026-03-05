# Core Financial Features

> Transaction management, budgets, EMIs, investments, net worth, and debt management

---

## 1. Transaction Management

### Overview
Full lifecycle management of financial transactions with AI-powered enrichment.

### Features
| Feature | Description |
|---------|-------------|
| Manual Entry | Quick add expense/income with category, amount, merchant |
| Document Upload | Upload bank statements (PDF/CSV/images) for auto-extraction |
| Gmail Sync | Auto-extract transactions from bank alert emails (UPI, NEFT, etc.) |
| Receipt Scanner | OCR-powered receipt scanning with auto-categorization |
| AI Enrichment | Auto-categorize, normalize merchants, flag anomalies |
| Multi-Currency | 8 currencies with auto-conversion to INR |
| Full-Text Search | Weighted search across description, merchant, UPI, tags |
| Advanced Filters | By date range, category, type (debit/credit), payment method |
| Bulk Import/Export | CSV import/export with column mapping |
| Recurring Detection | AI identifies recurring payments (subscription, EMI, etc.) |

### Payment Methods Supported
Cash, Card, UPI, Bank Transfer, Wallet, Net Banking, Cheque, IMPS, NEFT, RTGS

### Transaction Sources
Manual, Upload, Bank Statement, Gmail Attachment, Gmail Email, API, Quick Entry

### AI Processing Pipeline
```
Transaction Created/Imported
  → Category Classification (ML model trained on user data)
  → Merchant Name Normalization
  → Anomaly Score Calculation (Isolation Forest)
  → UPI Metadata Extraction (VPA, UTR, app)
  → Recurring Pattern Detection
  → Tax Deductibility Check
  → Budget Impact Calculation
  → Notification Triggers (budget alerts, anomalies)
```

---

## 2. Budget Management

### Overview
Category-based budget creation with real-time spending tracking and AI optimization.

### Features
| Feature | Description |
|---------|-------------|
| Category Budgets | Set monthly/weekly/yearly budgets per category |
| Auto-Spending Calc | Real-time spent amount from transactions |
| Alert Thresholds | Configurable alerts (default 80%) |
| Budget Rollover | Carry unused budget to next period |
| 50/30/20 Auto-Fill | Auto-calculate budgets from salary |
| Smart Budget Wizard | Step-by-step guided budget creation |
| AI Budget Optimizer | RL-powered optimal allocation recommendation |
| Visual Progress | Progress bars, charts, trend analysis |

### Budget States
| State | Condition |
|-------|-----------|
| GOOD | < 50% spent |
| MODERATE | 50-80% spent |
| WARNING | 80-100% spent |
| EXCEEDED | > 100% spent |

### Budget Categories
food_dining, groceries, transportation, fuel, utilities, rent_mortgage, insurance, healthcare, entertainment, shopping, education, travel, subscriptions, investment, emi, loan, other

---

## 3. EMI Tracking

### Overview
The most comprehensive EMI management system with 33 API endpoints covering tracking, analytics, foreclosure, and debt freedom features.

### Core Features
| Feature | Description |
|---------|-------------|
| Full EMI CRUD | Create, read, update, delete EMI entries |
| Statement Sync | Extract EMIs from credit card statements |
| Document Extraction | Parse EMIs from uploaded documents |
| Payment History | Per-installment tracking with principal/interest split |
| Provider Grouping | Group EMIs by card provider |
| Merchant Grouping | Group EMIs by merchant/seller |
| Timeline View | Visual EMI timeline |
| Monthly Trends | Trend analysis with export |
| Multi-Currency | USD/INR with exchange rate tracking |

### Debt Freedom Features
| Feature | Description |
|---------|-------------|
| One-Click Prepay | Create prepayment intent |
| Auto-Sweep | Automatically sweep surplus funds to EMIs |
| Late Fee Shield | Late fee protection system |
| Balance Transfer | Analyze balance transfer opportunities |
| Foreclosure Calc | Calculate foreclosure costs and savings |
| Bank Deduction | Track auto-deduction from bank accounts |
| Bulk Assign Bank | Bulk assign EMIs to bank accounts |

### Export Options
- PDF report
- Excel spreadsheet
- CSV data file

### EMI Status Lifecycle
```
active → completed (all installments paid)
active → foreclosed (early closure)
active → cancelled (cancelled by user)
```

---

## 4. Investment Portfolio

### Overview
Complete investment tracking with performance analytics, risk assessment, and AI recommendations.

### Supported Investment Types
Stocks, Mutual Funds, Fixed Deposits, Gold (physical + digital), Crypto, PPF, EPF, NPS, ELSS, REITs, Bonds, SIPs

### Core Features
| Feature | Description |
|---------|-------------|
| Portfolio Dashboard | Overview of all investments with total value |
| Performance Metrics | XIRR, CAGR, absolute/percentage returns |
| Asset Allocation | Visual allocation across asset types |
| Risk Analysis | Risk scoring with diversification assessment |
| Dividend Tracking | Dividend history and yield calculation |
| Price Sync | Update current prices (manual or auto) |
| Maturity Alerts | Alerts for upcoming FD/bond maturities |
| Transaction History | Buy/sell transaction recording |
| Tax Efficiency | Tax impact analysis per investment |

### Analytics Endpoints (12)
| Endpoint | Analysis |
|----------|----------|
| `/analytics/allocation` | Asset allocation pie chart |
| `/analytics/comprehensive` | Full analytics dashboard |
| `/analytics/metrics` | Key performance metrics |
| `/analytics/risk` | Risk scoring and VaR |
| `/analytics/diversification` | Diversification score (0-100) |
| `/analytics/performance` | Time-weighted returns |
| `/analytics/tax-efficiency` | Tax impact analysis |
| `/analytics/recommendations` | AI buy/sell/hold recommendations |
| `/analytics/optimize` | Portfolio optimization |
| `/analytics/health-score` | Investment health score |

### AI-Powered Features
- Portfolio Optimization (Markowitz Mean-Variance)
- Efficient Frontier generation
- Black-Litterman model for investor views
- Risk Parity allocation
- Monte Carlo simulation for scenario analysis
- Smart Investment Advisor with personalized recommendations

---

## 5. Net Worth Tracking

### Overview
Comprehensive assets vs. liabilities tracking with projections and trend analysis.

### Asset Categories
| Category | Examples |
|----------|---------|
| Cash & Bank | Savings, current, salary accounts |
| Investments | Stocks, MFs, FDs, gold, crypto |
| Property | Real estate, vehicles |
| Retirement | PPF, EPF, NPS |
| Other Assets | Jewelry, collectibles, receivables |

### Liability Categories
| Category | Examples |
|----------|---------|
| Home Loan | Mortgage |
| Personal Loan | Unsecured loans |
| Car Loan | Vehicle loans |
| Credit Card | Outstanding balances |
| EMIs | Active installments |
| Other Debt | Informal loans |

### Features
| Feature | Description |
|---------|-------------|
| Manual Snapshot | Create point-in-time net worth record |
| Auto-Generate | Calculate from investments, loans, bank accounts |
| Historical Trend | Track net worth over time |
| Period Comparison | Month-over-month, year-over-year |
| Projections | Future net worth based on current trajectory |
| Asset Management | Add/edit/remove individual assets |
| Liability Management | Add/edit/remove individual liabilities |

---

## 6. Debt Management

### Overview
Comprehensive debt tracking with payoff strategy analysis.

### Features
| Feature | Description |
|---------|-------------|
| Debt Overview | All debts with balances, rates, payments |
| Payoff Strategies | Snowball vs. Avalanche comparison |
| Payment Tracking | Record and track payments |
| Interest Calculator | Interest cost over time |
| Emergency Fund | Emergency fund tracker with contribution history |
| Loan Calculator | EMI/amortization calculator |
| Debt-to-Income | DTI ratio monitoring |

### Payoff Strategies
| Strategy | Method |
|----------|--------|
| Snowball | Pay smallest balance first (psychological wins) |
| Avalanche | Pay highest interest first (mathematical optimal) |
| Hybrid | AI-recommended blend based on behavioral profile |

### Debt Types Tracked
- Home Loan / Mortgage
- Personal Loan
- Car Loan
- Education Loan
- Credit Card Debt
- EMI (Equated Monthly Installment)
- Loans Given to Others
- Informal Borrowings

---

## 7. Goals & Savings

### Overview
Goal-based financial planning with milestone tracking and achievement prediction.

### Features
| Feature | Description |
|---------|-------------|
| Goal Creation | Set target amount, deadline, priority |
| Progress Tracking | Track contributions and progress percentage |
| Milestone System | Sub-milestones with celebrations |
| AI Forecasting | Predict goal achievement date |
| SIP Calculator | Required monthly investment calculation |
| Savings Challenges | Gamified savings challenges |
| Goal Timeline | Visual timeline of all goals |
| FIRE Tracker | Financial Independence Retire Early calculator |

### Goal Types
Emergency Fund, Vacation, Home Purchase, Car Purchase, Education, Wedding, Retirement, Wealth Building, Custom

---

## 8. Tax & Insurance

### Tax Features
| Feature | Description |
|---------|-------------|
| Tax Planner | Income tax planning |
| Old vs New Regime | Side-by-side comparison |
| Tax Estimator | Quick tax estimation |
| Tax Optimization | AI-powered deduction recommendations |
| Tax Harvesting | Capital gains/loss harvesting |
| Section 80C/80D | Deduction tracking |

### Insurance Features
| Feature | Description |
|---------|-------------|
| Insurance Dashboard | Policy overview |
| Insurance Planner | Coverage gap analysis |
| Premium Tracking | Premium payment history |
| Claim Management | Claim tracking |

---

## 9. Retirement Planning

### Features
| Feature | Description |
|---------|-------------|
| Retirement Planner | Corpus calculation with inflation |
| PPF Tracker | Public Provident Fund tracking (7.1% p.a.) |
| EPF Tracker | Employee Provident Fund tracking |
| NPS Management | National Pension System allocation |
| FIRE Tracker | Financial Independence calculator |
| SIP Calculator | Systematic Investment Plan returns |

---

## 10. Banking & Cards

### Features
| Feature | Description |
|---------|-------------|
| Bank Account Manager | Multiple bank accounts with balances |
| Credit Card Manager | Card tracking with bills and due dates |
| Net Banking | Net banking integration |
| Currency Converter | Real-time currency conversion |
| Lender Dashboard | Dashboard for money lenders (role-based) |
| Loans Given | Track money lent to others with interest |
| Personal Borrowings | Track money borrowed informally |
