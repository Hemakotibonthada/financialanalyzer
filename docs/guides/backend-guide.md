# Backend Architecture Guide

> Express.js + MongoDB + Socket.IO — 89 routes, 128 services, 47 models

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Express.js | 4.x | Web framework |
| MongoDB | 6+ | Database |
| Mongoose | — | ODM |
| Socket.IO | 4.x | Real-time communication |
| Redis | — | Cache (optional, falls back to node-cache) |
| JWT | — | Authentication tokens |
| bcryptjs | — | Password hashing |
| Speakeasy | — | TOTP 2FA |
| Winston | — | Logging |

---

## Server Startup Sequence

```
1. Load environment variables (.env)
2. Connect to MongoDB
3. Initialize Cache Service (Redis → node-cache fallback)
4. Initialize Bill Reminder Service
5. Start Backup Scheduler
6. Start Gmail Auto-Sync
7. Start AI Self-Training Scheduler
8. Auto-train AI models for active users (10s delay)
9. Start Express server on port 5001
10. Initialize WebSocket Engine (Socket.IO)
11. Register graceful shutdown handlers
```

---

## Middleware Pipeline

Requests pass through these middleware layers in order:

```
1. Helmet          → Security headers (CSP, COEP, XSS)
2. Rate Limiter    → 100 req/15min (general), 5 req/15min (auth)
3. CORS            → Whitelisted origins (localhost:3000-5175 + LAN IPs)
4. Body Parser     → JSON + URL-encoded, 10MB limit
5. Request Timeout → 30-second per-request timeout
6. Activity Logger → Logs all API calls (excludes /health, /auth/refresh)
7. Enterprise MW   → Request IDs, API versioning, performance tracking, audit trail
8. Static Files    → /uploads served behind auth middleware
```

### Custom Middleware Files
| Middleware | Purpose |
|------------|---------|
| `auth.js` | JWT token verification, user injection |
| `adminAuth.js` | Admin role check |
| `authorization.js` | Role-based access control |
| `validate.js` | express-validator integration |
| `validation.js` | Custom validators |
| `requestValidator.js` | Request sanitization |
| `rateLimiter.js` | Rate limiting configuration |
| `activityLogger.js` | Activity log recording |
| `cacheMiddleware.js` | Response caching |
| `uploadMiddleware.js` | Multer file upload handling |
| `enterpriseMiddleware.js` | Enterprise features |
| `enterpriseSecurity.js` | Enterprise security |

---

## Route Organization

### 70+ Route Groups
Routes are organized by domain and mounted in `server.js`:

```javascript
app.use('/api/auth', authLimiter, authRoutes);  // Stricter rate limit
app.use('/api/budgets', authenticate, budgetRoutes);
app.use('/api/emi', authenticate, emiRoutes);
app.use('/api/ai-enhanced', authenticate, aiEnhancedRoutes);
// ... 70+ more
```

### Route Groups by Category

**Core (10):** auth, profile, transactions, financial, health, budgets, goals, networth, debt, emi

**AI/ML (8):** ai, ai-enhanced, ai-extended, ai-advanced, ai-premium, ai-training, ai-models, ai-intelligence

**Banking (7):** bank-accounts, cc-bills, personal-loans, loans-given, lenders, lender-loans, lender-payments

**Analytics (5):** analytics, analytics-v2, financial-insights, insights, aggregation

**Import/Export (6):** csv, documents, receipts, export, export-engine, data-export, data-management

**Other (30+):** recurring, bill-reminders, subscriptions, split-expenses, insurance, real-estate, retirement, tax, portfolio, market, currency, security, 2fa, notifications, cache, automation, chat, search, achievements, etc.

---

## Service Layer

### Pattern
Services encapsulate business logic and are injected into routes:

```javascript
// Route
router.get('/dashboard', authenticate, async (req, res) => {
  const data = await localAIEngine.getDashboard(req.user.id);
  res.json({ success: true, data });
});

// Service
class LocalAIEngine {
  async getDashboard(userId) {
    const transactions = await Transaction.find({ userId });
    // ML processing...
    return { healthScore, recommendations, forecasts };
  }
}
```

### Key Service Categories

**Financial Services (15):**
`localAIEngine`, `financialForecastService`, `financialHealthService`, `financialInsightsService`, `financialPlanningService`, `budgetOptimizationService`, `debtManagementService`, `portfolioAnalyticsService`, `riskAssessmentService`, `taxOptimizationService`, `wealthManagementService`, `emiAnalyticsService`, etc.

**AI Services (46):**
See `backend/services/ai/` — 38 core modules + orchestrators

**Integration Services (6):**
`gmailService`, `gmailAutoSync`, `googleDriveService`, `bankingIntegrationService`, `webhookService`, `marketDataService`

**Infrastructure Services (10):**
`cacheService`, `backupService`, `encryptionService`, `securityService`, `notificationService`, `websocketEngine`, `scheduledJobsService`, `selfTrainingScheduler`, etc.

---

## Database Models

### 47 Mongoose Models
Organized by domain:

**User & Profile (3):** User, FinancialProfile, RefreshToken

**Financial (7):** Transaction, Budget, EMI, Investment, Debt, FinancialGoal, NetWorthSnapshot

**Banking (6):** BankAccount, CreditCardBill, PersonalLoan, LoanGiven, Lender, LenderLoan, LenderPayment

**AI/ML (4):** MLModel, Prediction, Anomaly, FinancialAnalysis

**Business (5):** Client, Contract, Invoice, Project, Vendor

**Other (20+):** Notification, BillReminder, Subscription, SplitExpense, Document, Receipt, etc.

### Common Patterns
```javascript
// All models include timestamps
{ timestamps: true }

// User ownership
{ userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true } }

// Status enum
{ status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' } }
```

---

## AI/ML System

### Self-Training Pipeline
```
Startup → For each active user:
  1. Fetch transactions (last 12 months)
  2. Extract features:
     - Temporal: dayOfWeek, monthOfYear, hour, isWeekend
     - Amount: log transform, z-score, percentile
     - Text: TF-IDF on descriptions
     - Category: one-hot encoding
  3. Train models:
     - Categorizer (classify transactions by category)
     - Spending predictor (forecast next month)
     - Anomaly baseline (normal spending patterns)
     - Merchant affinity (frequent merchants)
     - Budget optimizer (optimal allocations)
     - Risk profiler (risk score)
     - Goal forecaster (goal achievement)
     - Income stability (income patterns)
     - Lifestyle cluster (spending personality)
  4. Persist to filesystem: data/models/{userId}_{model}.json
  5. Schedule retraining (on drift detection)
```

### AI Orchestrator
Central singleton coordinating all 38 AI modules:
```javascript
const orchestrator = AIOrchestrator.getInstance();
const result = await orchestrator.analyze(userId, 'comprehensive');
```

### Model Monitoring
- Data drift detection (statistical comparison of feature distributions)
- Concept drift detection (prediction accuracy degradation)
- Automatic alert generation
- A/B testing for model versions
- Performance tracking over time

---

## Real-Time System (WebSocket)

### Socket.IO Configuration
```javascript
const io = new Server(server, {
  cors: { origin: allowedOrigins },
  transports: ['websocket', 'polling'],
});
```

### Authentication
```javascript
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  socket.userId = decoded.id;
  next();
});
```

### Events
- User-specific rooms: `user_${userId}`
- Notification events: `notification`, `budgetAlert`, `anomalyDetected`
- Real-time updates: `transactionCreated`, `modelTrained`

---

## Error Handling

### Standard Error Response
```javascript
res.status(statusCode).json({
  success: false,
  error: 'Error message',
  code: 'ERROR_CODE',
  statusCode: statusCode
});
```

### Global Error Handler
```javascript
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});
```

### Request Timeout
30-second timeout per request with socket destroy on timeout.

---

## File Upload

### Multer Configuration
- Storage: `backend/uploads/`
- Limits: 10MB per file
- Supported types: PDF, CSV, XLS/XLSX, images (JPG, PNG)
- Authentication required for upload and download

### Document Processing Pipeline
```
Upload → Mime type detection → Extension validation
  → PDF: pdf-parse text extraction
  → CSV: csv-parser row parsing
  → Image: Tesseract OCR
  → XLS/XLSX: xlsx library parsing
  → AI enrichment (categorization, entity extraction)
  → Store metadata in Document model
  → Extract transactions → Store in Transaction model
```

---

## Scheduled Jobs

| Job | Frequency | Purpose |
|-----|-----------|---------|
| AI Self-Training | Daily | Retrain models for active users |
| Backup | Daily | Database backup to filesystem |
| Gmail Sync | Hourly | Check for new bank emails |
| Bill Reminders | Daily | Send due date notifications |
| Model Monitoring | Every 6h | Check for model drift |
| Cache Cleanup | Every 12h | Evict stale cache entries |

---

## Environment Variables

```env
# Server
PORT=5001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/financial-analyzer

# Auth
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
ENCRYPTION_KEY=your-32-char-encryption-key

# Gmail
GMAIL_CLIENT_ID=your-google-client-id
GMAIL_CLIENT_SECRET=your-google-client-secret
GMAIL_REDIRECT_URI=http://localhost:5001/api/auth/gmail/callback

# Google Drive
GOOGLE_DRIVE_CLIENT_ID=...
GOOGLE_DRIVE_CLIENT_SECRET=...

# Plaid (Optional)
PLAID_CLIENT_ID=...
PLAID_SECRET=...
PLAID_ENV=sandbox

# Redis (Optional)
REDIS_URL=redis://localhost:6379

# Twilio (Optional)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=...

# Firebase (Optional)
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
```

---

## Testing

### Framework
- **Jest** for unit/integration tests
- **Supertest** for API testing

### Test Files (12)
```
backend/tests/
├── auth.test.js                    # Auth endpoint tests
├── csvService.test.js              # CSV processing tests
├── enterprise-services.test.js     # Enterprise service tests
├── enterprise.test.js              # Enterprise route tests
├── recurringRoutes.test.js         # Recurring route tests
├── recurringTransactionService.test.js  # Recurring service tests
├── setup.js                        # Test setup (MongoDB memory server)
├── test-ai-advanced.js             # AI advanced tests
├── test-ai-enhanced.js             # AI enhanced tests
├── test-ai-extended.js             # AI extended tests
├── test-ai-premium.js              # AI premium tests
└── test-ai-ultimate.js             # AI ultimate tests
```

### Running Tests
```bash
cd backend
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage report
```
