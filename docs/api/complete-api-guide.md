# Complete API Guide

> All 70+ route groups, 300+ endpoints across the FinancialAnalyzer backend

---

## Base URL
```
Development: http://localhost:5001/api
Production:  https://<your-domain>/api
```

## Authentication
All protected routes require a Bearer token:
```
Authorization: Bearer <jwt_access_token>
```

---

## 1. Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Register new user | No |
| POST | `/login` | Login with email/password | No |
| POST | `/login/2fa` | Complete login with 2FA code | No |
| GET | `/me` | Get current user | Yes |
| POST | `/logout` | Logout (revoke refresh token) | Yes |
| POST | `/refresh-token` | Rotate access/refresh tokens | No |
| POST | `/revoke-token` | Revoke specific token | Yes |
| POST | `/revoke-all` | Revoke all user tokens | Yes |
| PUT | `/password` | Change password | Yes |
| DELETE | `/account` | Delete account permanently | Yes |
| GET | `/gmail/callback` | Gmail OAuth callback | No |
| POST | `/gmail/save-tokens` | Save Gmail OAuth tokens | Yes |

**Rate Limit:** 5 requests / 15 minutes (production)

---

## 2. Profile (`/api/profile`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get user profile |
| POST | `/` | Create or update profile |
| PUT | `/preferences` | Update preferences |
| PUT | `/budget` | Set category budgets |
| PUT | `/savings-goal` | Set savings target |
| POST | `/categories` | Add custom category |
| DELETE | `/categories/:name` | Remove custom category |
| DELETE | `/` | Delete profile |

---

## 3. Transactions (`/api/transactions`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List transactions (filters: days, dateRange, category, type) |
| POST | `/` | Create transaction (with AI enrichment) |
| GET | `/analytics` | Transaction analytics |

---

## 4. Core Financial (`/api/financial`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analyze-all` | Comprehensive analysis pipeline (Gmail sync → AI analysis) |
| POST | `/analyze` | Analyze uploaded documents |
| GET | `/reports` | List financial reports |
| GET | `/reports/:id` | Get specific report |
| GET | `/charts` | Chart data |
| GET | `/insights` | Financial insights |
| GET | `/health-score` | Financial health score |
| POST | `/export` | Export report (PDF/Excel/CSV) |

---

## 5. Budget Management (`/api/budgets`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all budgets with spending calculations |
| GET | `/:id` | Get single budget |
| POST | `/` | Create budget (unique per category/period) |
| PUT | `/:id` | Update budget |
| DELETE | `/:id` | Delete budget |

---

## 6. EMI Tracking (`/api/emi`, `/api/emis`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/overview` | Comprehensive EMI overview |
| GET | `/upcoming` | Upcoming EMI payments |
| GET | `/by-provider` | EMIs grouped by card provider |
| GET | `/by-merchant` | EMIs grouped by merchant |
| GET | `/timeline` | EMI timeline visualization |
| GET | `/charts` | Chart data for EMI dashboard |
| GET | `/insights` | AI-powered EMI insights |
| GET | `/monthly-trends` | Monthly trend analysis |
| GET | `/monthly-trends/export` | Export monthly trends |
| GET | `/statistics/summary` | Statistics summary |
| GET | `/bank-deduction-summary` | Bank deduction summary |
| GET | `/:id` | Get single EMI |
| PUT | `/:id` | Update EMI |
| DELETE | `/:id` | Delete EMI |
| POST | `/manual` | Create manual EMI entry |
| POST | `/:id/mark-paid` | Mark installment as paid |
| POST | `/sync-statements` | Sync from credit card statements |
| POST | `/extract/:documentId` | Extract EMIs from document |
| GET | `/foreclosure/:emiId` | Foreclosure calculation |
| POST | `/:id/foreclose` | Execute foreclosure |
| GET | `/export/pdf` | Export to PDF |
| GET | `/export/excel` | Export to Excel |
| GET | `/export/csv` | Export to CSV |
| POST | `/one-click-prepay` | Prepayment intent |
| POST | `/auto-sweep` | Auto-sweep surplus |
| POST | `/late-fee-shield` | Late fee protection |
| POST | `/reminders/pre-due` | Pre-due date reminders |
| POST | `/balance-transfer-request` | Balance transfer |
| PATCH | `/:id/bank-deduction` | Update bank deduction info |
| PATCH | `/bulk-assign-bank` | Bulk assign bank accounts |

---

## 7. Investments (`/api/investments`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List investments (filter by type/status) |
| GET | `/portfolio` | Portfolio summary |
| GET | `/performance` | Performance metrics (XIRR, CAGR) |
| GET | `/maturities` | Upcoming maturities |
| GET | `/summary` | Investment summary |
| GET | `/:id` | Get single investment |
| POST | `/` | Add new investment |
| PUT | `/:id` | Update investment |
| DELETE | `/:id` | Delete investment |
| POST | `/:id/transaction` | Record investment transaction |
| PUT | `/:id/price` | Update current price |
| POST | `/sync-prices` | Sync all prices |
| GET | `/analytics/allocation` | Asset allocation |
| GET | `/analytics/comprehensive` | Full analytics |
| GET | `/analytics/metrics` | Key metrics |
| GET | `/analytics/risk` | Risk analysis |
| GET | `/analytics/diversification` | Diversification score |
| GET | `/analytics/performance` | Performance analytics |
| GET | `/analytics/tax-efficiency` | Tax efficiency |
| GET | `/analytics/recommendations` | AI recommendations |
| POST | `/analytics/optimize` | Portfolio optimization |
| GET | `/analytics/health-score` | Investment health score |

---

## 8. Net Worth (`/api/networth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/snapshot` | Create manual snapshot |
| POST | `/auto-generate` | Auto-generate from data |
| GET | `/latest` | Latest snapshot |
| GET | `/history` | Historical snapshots |
| GET | `/trend` | Trend analysis |
| GET | `/comparison` | Period comparison |
| GET | `/projections` | Net worth projections |
| GET | `/assets` | List assets |
| POST | `/assets` | Add asset |
| PUT | `/assets/:field` | Update asset |
| DELETE | `/assets/:field` | Remove asset |
| GET | `/liabilities` | List liabilities |
| POST | `/liabilities` | Add liability |
| GET | `/:id` | Get snapshot by ID |
| PUT | `/:id` | Update snapshot |
| DELETE | `/:id` | Delete snapshot |

---

## 9. Goals (`/api/goals`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all goals |
| GET | `/:id` | Get single goal |
| POST | `/` | Create goal |
| PUT | `/:id` | Update goal |
| DELETE | `/:id` | Delete goal |
| POST | `/:id/contribution` | Add contribution |
| GET | `/:id/progress` | Goal progress analysis |

---

## 10. Debt Management (`/api/debt`, `/api/debts`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all debts |
| POST | `/` | Add debt |
| PUT | `/:id` | Update debt |
| DELETE | `/:id` | Delete debt |
| GET | `/summary` | Debt summary |
| GET | `/payoff-strategies` | Debt payoff strategies (snowball/avalanche) |
| POST | `/:id/payment` | Record payment |

---

## 11–20. Additional Route Groups

### Banking & Cards
| Prefix | Key Endpoints |
|--------|--------------|
| `/api/bank-accounts` | CRUD, set default, sync |
| `/api/cc-bills` | Credit card bills management |
| `/api/personal-loans` | Personal loan tracking |
| `/api/loans-given` | Loans given to others |
| `/api/lenders` | Lender directory |
| `/api/lender-loans` | Lender loan management |
| `/api/lender-payments` | Lender payment tracking |

### Recurring & Bills
| Prefix | Key Endpoints |
|--------|--------------|
| `/api/recurring` | Recurring transaction detection & management |
| `/api/bill-reminders` | Bill reminders with auto-pay |
| `/api/subscriptions` | Subscription tracking |
| `/api/split-expenses` | Split expenses & group management |

### Import/Export
| Prefix | Key Endpoints |
|--------|--------------|
| `/api/csv` | CSV import/export |
| `/api/documents` | Document upload & management |
| `/api/receipts` | Receipt scanning (OCR) |
| `/api/export` / `/api/export-engine` | Multi-format export |
| `/api/data-export` | Data export (transactions, budgets, EMIs, etc.) |
| `/api/data-management` | Import/export/backup management |
| `/api/backup` | Database backup & restore |

### Analytics & Insights
| Prefix | Key Endpoints |
|--------|--------------|
| `/api/analytics` | Analytics V1 |
| `/api/analytics-v2` | Enterprise Analytics V2 |
| `/api/financial-insights` | Trends, ratios, velocity, merchants |
| `/api/insights` | Financial insights & behavior |
| `/api/forecast` | Financial forecasting |
| `/api/risk-assessment` | Risk assessment |

### Specialized Finance
| Prefix | Key Endpoints |
|--------|--------------|
| `/api/real-cibil` | CIBIL credit score integration |
| `/api/insurance` | Insurance policy management |
| `/api/real-estate` | Real estate portfolio |
| `/api/retirement` | Retirement planning |
| `/api/tax` / `/api/tax-optimization` | Tax management & optimization |
| `/api/portfolio` | Portfolio analytics |
| `/api/wealth` | Wealth management, FIRE, projections |
| `/api/planning` | Financial planning (retirement, SIP, insurance, wealth) |

### Enterprise & Admin
| Prefix | Key Endpoints |
|--------|--------------|
| `/api/admin` | Admin panel |
| `/api/enterprise` | Enterprise AI services |
| `/api/enterprise-notifications` | Smart AI notification engine |
| `/api/company-expenses` | Company expense management |
| `/api/activity-logs` | Activity audit trail |
| `/api/jobs` | Scheduled job management |
| `/api/webhooks` | Webhook management |

### Integrations
| Prefix | Key Endpoints |
|--------|--------------|
| `/api/gmail` | Gmail integration & sync |
| `/api/drive` | Google Drive backup |
| `/api/banking` | Plaid banking integration |
| `/api/market` | Market data & watchlist |
| `/api/currency` / `/api/currency-v2` | Currency conversion & alerts |

### Other
| Prefix | Key Endpoints |
|--------|--------------|
| `/api/chat` | AI financial chat |
| `/api/search` / `/api/advanced-search` | Search functionality |
| `/api/security` / `/api/security-v2` | Security features |
| `/api/2fa` | Two-factor authentication |
| `/api/notifications` | Notification management |
| `/api/cache` | Cache management |
| `/api/achievements` | Gamification system |
| `/api/aggregation` | Data aggregation |
| `/api/automation` | Automation rule engine |
| `/api/business` | Business features (invoices, clients, projects) |
| `/api/categorize` | Smart categorization |
| `/api/family` | Family finance |
| `/api/templates` | Financial templates |
| `/api/support` | Support tickets |
| `/api/health` | Health check (no auth) |

---

## 21–27. AI/ML API Groups

### Core AI (`/api/ai`) — 24 endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | AI dashboard overview |
| GET | `/health-score` | AI health score |
| GET | `/recommendations` | AI recommendations |
| GET | `/forecast/spending` | Spending forecast |
| GET | `/forecast/income` | Income forecast |
| GET | `/forecast/savings` | Savings forecast |
| GET | `/forecast/cashflow` | Cash flow forecast |
| GET | `/anomalies` | Detected anomalies |
| GET | `/changepoints` | Change point detection |
| GET | `/insights` | AI insights |
| GET | `/sentiment` | Sentiment analysis |
| GET | `/summary` | Financial summary |
| GET | `/risk-assessment` | Risk assessment |
| GET | `/moving-averages` | Moving averages |
| GET | `/patterns/recurring` | Recurring patterns |
| GET | `/patterns/merchants` | Merchant patterns |
| GET | `/patterns/velocity` | Spending velocity |
| GET | `/patterns/spending` | Spending patterns |
| POST | `/query` | Natural language query |
| POST | `/entities` | Entity extraction |
| POST | `/train` | Train models |
| POST | `/categorize` | Categorize transaction |
| GET | `/pipeline/status` | Pipeline status |

### Enhanced AI (`/api/ai-enhanced`) — 27 endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analyze` | Comprehensive AI analysis |
| POST | `/chat` | Conversational AI chat |
| GET | `/chat/summary` | Chat summary |
| POST | `/optimize/budget` | Budget optimization |
| POST | `/optimize/investments` | Investment optimization |
| POST | `/optimize/debt` | Debt optimization |
| GET | `/anomalies` | Advanced anomaly detection |
| POST | `/anomalies/check` | Check specific transaction |
| POST | `/knowledge/query` | Knowledge graph query |
| GET | `/knowledge/graph` | Get knowledge graph |
| GET | `/health-score` | Enhanced health score |
| GET | `/predict/spending` | Spending prediction |
| POST | `/categorize` | Smart categorization |
| GET | `/insights` | Enhanced insights |
| POST | `/what-if` | What-if scenario analysis |
| POST | `/explain` | Explainable AI (XAI) |
| GET | `/audit-trail` | XAI audit trail |
| POST | `/automl/run` | Run AutoML pipeline |
| GET | `/automl/history` | AutoML run history |
| GET | `/monitoring/dashboard` | Model monitoring dashboard |
| GET | `/monitoring/metrics/:modelId` | Model metrics |
| GET | `/monitoring/alerts` | Monitoring alerts |
| POST | `/monitoring/alerts/:alertId/acknowledge` | Acknowledge alert |
| POST | `/ab-test/create` | Create A/B test |
| GET | `/ab-test/list` | List A/B tests |
| POST | `/feedback` | Submit feedback |

### Advanced AI (`/api/ai-advanced`) — 17 endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/portfolio/optimize` | Portfolio optimization (Markowitz) |
| POST | `/portfolio/analyze` | Portfolio analysis |
| POST | `/portfolio/stress-test` | Stress testing |
| POST | `/portfolio/rebalance` | Rebalancing recommendations |
| GET | `/portfolio/efficient-frontier` | Efficient frontier |
| GET | `/portfolio/assets` | Asset library |
| GET | `/credit/score` | Credit score prediction |
| GET | `/credit/improvement-plan` | Score improvement plan |
| GET | `/credit/history` | Credit score history |
| POST | `/credit/simulate` | Score simulation |
| POST | `/notifications/process` | Process smart notifications |
| POST | `/notifications/interaction` | Record notification interaction |
| GET | `/notifications/stats` | Notification statistics |
| POST | `/peers/compare` | Peer comparison benchmarking |
| POST | `/search/smart` | Semantic search |
| POST | `/search/parse` | Query parsing |
| GET | `/search/suggestions` | Search suggestions |

### Extended AI (`/api/ai-extended`) — 21 endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/fraud/screen` | Fraud screening |
| POST | `/fraud/screen-batch` | Batch fraud screening |
| POST | `/fraud/initialize` | Initialize fraud engine |
| GET | `/fraud/alerts` | Fraud alerts |
| GET | `/fraud/stats` | Fraud statistics |
| POST | `/fraud/alerts/:alertId/resolve` | Resolve fraud alert |
| GET | `/reports/generate` | Generate NL report |
| GET | `/reports/quick-summary` | Quick summary report |
| GET | `/reports/category/:category` | Category-specific report |
| POST | `/documents/analyze` | Document intelligence |
| POST | `/documents/extract-amounts` | Extract amounts from text |
| GET | `/behavioral/analyze` | Behavioral finance analysis |
| GET | `/spending/intelligence` | Spending intelligence |
| GET | `/recommendations` | AI recommendations |
| POST | `/recommendations/feedback` | Recommendation feedback |
| GET | `/forecast/ensemble` | Ensemble forecasting |
| POST | `/forecast/monte-carlo` | Monte Carlo simulation |
| POST | `/planning/comprehensive` | Comprehensive financial plan |
| POST | `/planning/tax-comparison` | Tax regime comparison |
| POST | `/planning/retirement` | Retirement planning |
| POST | `/planning/insurance-gap` | Insurance gap analysis |

### Premium AI (`/api/ai-premium`) — 12 endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cashflow/analyze` | Cash flow analysis |
| GET | `/cashflow/forecast` | Cash flow forecast |
| GET | `/cashflow/income-patterns` | Income patterns |
| GET | `/cashflow/recurring` | Recurring analysis |
| GET | `/cashflow/liquidity` | Liquidity assessment |
| GET | `/subscriptions/analyze` | Subscription analysis |
| GET | `/subscriptions/detect` | Auto-detect subscriptions |
| GET | `/subscriptions/optimize` | Optimization suggestions |
| POST | `/tax-harvesting/analyze` | Tax harvesting analysis |
| POST | `/tax-harvesting/calculate-gains` | Capital gains calculation |
| POST | `/tax-harvesting/loss-opportunities` | Loss harvesting opportunities |
| POST | `/tax-harvesting/gain-opportunities` | Gain opportunities |

### Additional AI Groups

| Prefix | Description | Key Endpoints |
|--------|-------------|---------------|
| `/api/ai-training` | Model training & NLP | Train all/specific models, NLP chat, classify |
| `/api/ai-models` | Model registry | Dashboard, registry, health, drift, A/B test, promote |
| `/api/ai-intelligence` | Self-learning | Enrichment, goals AI, budget AI, debt AI, cash flow, financial literacy |
| `/api/ml` | ML service | Models, predictions, train |
| `/api/local-ai` | Offline AI | Chat, categorize, alerts, status |

---

## Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

## Success Response Format

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed"
}
```

## Pagination

Most list endpoints support:
```
GET /api/resource?page=1&limit=20&sort=-createdAt
```

## Filtering

Transaction endpoints support:
```
GET /api/transactions?days=30&category=food&type=debit&startDate=2025-01-01&endDate=2025-12-31
```
