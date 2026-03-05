# Architecture Overview

## System Architecture

FinancialAnalyzer is a full-stack enterprise financial management platform with an AI-first architecture. Every AI/ML algorithm runs 100% locally — zero external API dependencies.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │  React SPA   │  │  Electron    │  │  React Native (Mobile)   │   │
│  │  (Vite 5)    │  │  Desktop App │  │  (Future)                │   │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬──────────────┘   │
└─────────┼──────────────────┼─────────────────────┼──────────────────┘
          │                  │                     │
          ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     API GATEWAY LAYER                                │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Express.js Server (port 5001)                               │   │
│  │  ├── Helmet (security headers)                               │   │
│  │  ├── Rate Limiting (100 req/15min prod)                      │   │
│  │  ├── CORS (whitelisted origins)                              │   │
│  │  ├── JWT Authentication Middleware                            │   │
│  │  ├── Enterprise Middleware (request IDs, versioning, audit)   │   │
│  │  └── Activity Logger                                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐
│  ROUTE LAYER    │ │  WEBSOCKET      │ │  SCHEDULED JOBS         │
│  (89 files)     │ │  Socket.IO      │ │  (Self-training,        │
│  70+ prefixes   │ │  Real-time      │ │   Backup, Gmail Sync)   │
│  300+ endpoints │ │  Notifications  │ │                         │
└────────┬────────┘ └────────┬────────┘ └────────────┬────────────┘
         │                   │                       │
         ▼                   ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                                    │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ CORE SERVICES (82 files)                                       │ │
│  │ ├── Financial: transactions, budgets, EMIs, investments        │ │
│  │ ├── Analytics: dashboards, reports, insights                   │ │
│  │ ├── Integration: Gmail, Google Drive, Plaid, Twilio            │ │
│  │ ├── Security: 2FA, encryption, audit trails                    │ │
│  │ └── Utilities: cache, backup, export, search                   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ AI/ML ENGINE (46 files, ~33,000 lines)                         │ │
│  │ ├── Neural Networks (dense, backprop, Adam)                    │ │
│  │ ├── Decision Trees / Random Forest / Gradient Boosting         │ │
│  │ ├── Time Series (ARIMA, Holt-Winters, seasonal decomposition)  │ │
│  │ ├── Clustering (K-Means++, DBSCAN, hierarchical, PCA)          │ │
│  │ ├── NLP (TF-IDF, NER, sentiment, conversational AI)            │ │
│  │ ├── Reinforcement Learning (DQN, Actor-Critic, policy gradient) │ │
│  │ ├── Anomaly Detection (Isolation Forest, LOF, autoencoders)    │ │
│  │ ├── Explainable AI (SHAP, LIME, counterfactual)                │ │
│  │ └── AutoML Pipeline (auto feature eng, model selection)         │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     DATA LAYER                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │  MongoDB      │  │  Redis Cache │  │  File System             │   │
│  │  47 Models    │  │  (Optional)  │  │  (ML Models, Uploads)    │   │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Authentication Flow
```
User → Login/Register → authRoutes → bcrypt verify/hash → JWT pair (access + refresh)
                                    → 2FA check (if enabled) → Speakeasy TOTP verify
                                    → Token rotation on refresh
                                    → Account lockout after 5 failures (30min)
```

### 2. Transaction Flow
```
Upload Document → PDF/CSV/OCR Parse → AI Enrichment Pipeline:
    ├── Auto-categorization (ML model)
    ├── Merchant normalization
    ├── Anomaly flagging (Isolation Forest)
    ├── UPI metadata extraction
    ├── Recurring pattern detection
    └── Tax deductibility check
    → Store in MongoDB → Budget auto-update → Notification triggers
```

### 3. AI Training Flow
```
Startup/Schedule → Fetch user transactions → Feature extraction:
    ├── Temporal features (day-of-week, month, hour)
    ├── Amount features (log transform, z-score)
    ├── Text features (TF-IDF on descriptions)
    └── Category features (one-hot encoding)
    → Train models (categorizer, predictor, anomaly, risk, etc.)
    → Persist to filesystem (data/models/{userId}_{model}.json)
    → Model monitoring (drift detection → auto-retrain)
```

### 4. Real-Time Notification Flow
```
Event Trigger → Smart Notification AI:
    ├── Priority engine (P0 fraud → P3 savings tip)
    ├── Delivery timing optimization
    ├── Fatigue prevention (cooldown)
    └── Preference learning
    → Socket.IO → Client bell/toast → Email/SMS (Nodemailer/Twilio)
```

---

## Key Architectural Decisions

### 1. 100% Local AI
All ML algorithms implemented from scratch in JavaScript. No OpenAI, TensorFlow, or external AI APIs required. This ensures:
- Zero API costs
- Full data privacy (nothing leaves the server)
- Offline capability
- No rate limiting or quota issues

### 2. Multi-Version Frontend Architecture
The app maintains 3 generations of UI:
- **V1** — Original functional pages
- **V2** — Enhanced with MUI + animations
- **V3** — Enterprise-grade with advanced analytics

Users can navigate to any version — progressive enhancement without breaking changes.

### 3. Micro-Service-Ready Monolith
While deployed as a monolith, the service layer uses clear boundaries. Each service is self-contained with its own models and could be extracted to a microservice.

### 4. Dual Auth Backend
Supports both:
- **Local MongoDB** — JWT + bcrypt (development, self-hosted)
- **Firebase Auth** — Google OAuth (cloud deployment)

The frontend `AuthContext` auto-detects and switches seamlessly.

### 5. Indian Financial Market Focus
- INR formatting with Cr/Lakh/K notation
- CIBIL credit score methodology
- Indian tax rules (FY 2025-26: STCG 20%, LTCG 12.5%)
- Indian investment products (NPS, PPF, ELSS, EPF)
- 55+ subscription service dictionary (Swiggy, Jio, etc.)

---

## Port Configuration

| Service | Port | Purpose |
|---------|------|---------|
| Backend API | 5001 | Express + Socket.IO |
| Frontend Dev | 5173 | Vite dev server |
| Frontend Preview | 4173 | Vite preview |
| MongoDB | 27017 | Database |
| Redis | 6379 | Cache (optional) |
| Firebase Emulator | 5000 | Firebase hosting emulator |

---

## Security Architecture

```
 Request Lifecycle:
 ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌───────────┐
 │ Rate     │ →  │ Helmet   │ →  │ CORS     │ →  │ JWT       │
 │ Limiter  │    │ Headers  │    │ Origin   │    │ Verify    │
 └──────────┘    └──────────┘    └──────────┘    └─────┬─────┘
                                                       │
 ┌──────────┐    ┌──────────┐    ┌──────────┐          │
 │ Activity │ ←  │ Request  │ ←  │ Enter-   │ ←────────┘
 │ Logger   │    │ Validator│    │ prise MW │
 └──────────┘    └──────────┘    └──────────┘
```

- **Passwords:** bcrypt (10 salt rounds)
- **2FA Secrets:** AES-256-GCM encrypted at rest
- **JWT:** Short-lived access tokens + rotatable refresh tokens
- **Rate Limiting:** 100 req/15min (general), 5 req/15min (auth)
- **File Uploads:** Authenticated access, type validation, size limits
- **Input Validation:** express-validator on all routes
- **Audit Trail:** Full activity logging with request/response metadata
