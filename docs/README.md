# FinancialAnalyzer — Documentation Hub

> **Comprehensive Enterprise Financial Management Platform**
> Built by Circuvent Technologies | Version 2.0.0

---

## 📖 Documentation Index

### Architecture & Overview
| Document | Description |
|----------|-------------|
| [Architecture Overview](architecture/architecture-overview.md) | System architecture, tech stack, data flow |
| [Project Structure](architecture/project-structure.md) | Complete file/folder catalog (~640+ files) |
| [Database Schema](architecture/database-schema.md) | All 47 Mongoose models documented |

### API Reference
| Document | Description |
|----------|-------------|
| [API Reference](api/api-reference.md) | Existing API docs |
| [API Routes](api/api-routes.md) | Complete route listing |
| [Complete API Guide](api/complete-api-guide.md) | All 70+ route groups, 300+ endpoints |
| [Authentication API](api/authentication-api.md) | JWT + 2FA auth system |
| [AI API Reference](api/ai-api-reference.md) | 100+ AI/ML endpoints |

### Feature Documentation
| Document | Description |
|----------|-------------|
| [Feature Catalog](features/feature-catalog.md) | Complete feature inventory (200+ features) |
| [AI & ML Features](features/ai-ml-features.md) | All 38 AI modules documented |
| [Core Financial Features](features/core-financial-features.md) | Transactions, budgets, EMIs, investments |
| [Enterprise Features](features/enterprise-features.md) | Enterprise V2/V3, admin, analytics |

### Guides
| Document | Description |
|----------|-------------|
| [Setup Guide](guides/setup-guide.md) | Existing setup guide |
| [Developer Guide](guides/developer-guide.md) | Development workflow, code patterns |
| [Frontend Guide](guides/frontend-guide.md) | React architecture, routing, themes |
| [Backend Guide](guides/backend-guide.md) | Express server, middleware, services |

### Deployment
| Document | Description |
|----------|-------------|
| [Deployment Guide](deployment/deployment-guide.md) | Existing deployment docs |
| [Desktop App](deployment/desktop-installer.md) | Electron desktop build |

---

## Quick Stats

| Metric | Count |
|--------|-------|
| **Backend Routes** | 89 route files, 70+ mounted prefixes |
| **Backend Services** | 128 service files (82 general + 46 AI) |
| **Backend Models** | 47 Mongoose models |
| **Frontend Pages** | 146 pages (133 + 13 enterprise) |
| **Frontend Components** | 67 components |
| **AI Modules** | 38 AI/ML modules (~33,000 lines) |
| **Total API Endpoints** | 300+ |
| **Total Source Files** | ~640+ |

---

## Technology Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js 4.x
- **Database:** MongoDB 6+ (Mongoose ODM)
- **Cache:** Redis (optional) + Node-Cache
- **Real-time:** Socket.IO 4.x
- **Auth:** JWT + bcrypt + Speakeasy (2FA)

### Frontend
- **Framework:** React 18 + Vite 5
- **UI Libraries:** Material UI 7 + Tailwind CSS 3
- **Charts:** Chart.js 4 + Recharts 2
- **Icons:** Lucide React
- **State:** React Context API
- **Routing:** React Router DOM 6

### AI/ML (100% Local)
- **Neural Networks:** From-scratch dense layers, backprop, Adam optimizer
- **Ensemble Learning:** Random Forest, Gradient Boosting, XGBoost-like
- **Time Series:** ARIMA, Holt-Winters, Seasonal Decomposition
- **Clustering:** K-Means++, DBSCAN, Hierarchical, PCA
- **NLP:** TF-IDF, NER, Sentiment Analysis, Conversational AI
- **RL:** Q-Learning, DQN, Policy Gradient, Actor-Critic
- **Anomaly Detection:** Isolation Forest, LOF, Autoencoders, SPC

### Integrations
- Gmail API (email transaction parsing)
- Google Drive (backup/sync)
- Plaid (banking API)
- Twilio (SMS notifications)
- Firebase (Auth + Hosting)
- Tesseract OCR (receipt scanning)
