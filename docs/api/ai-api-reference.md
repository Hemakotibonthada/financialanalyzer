# AI & ML API Reference

> 100+ AI endpoints across 7 API groups — all running 100% locally

---

## Architecture

All AI operations run locally on the server — no external API calls. The AI system consists of:

- **38 AI modules** implementing ML algorithms from scratch in JavaScript
- **~33,000 lines** of AI/ML code
- **Per-user models** trained on individual transaction data
- **Self-learning pipeline** with automatic retraining on data drift

---

## API Groups

| Group | Prefix | Endpoints | Focus |
|-------|--------|-----------|-------|
| Core AI | `/api/ai` | 24 | Dashboard, forecasting, anomalies, NLP |
| Enhanced AI | `/api/ai-enhanced` | 27 | RL, knowledge graph, XAI, AutoML, monitoring |
| Advanced AI | `/api/ai-advanced` | 17 | Portfolio optimization, credit score, peer comparison |
| Extended AI | `/api/ai-extended` | 21 | Fraud detection, NL reports, behavioral finance |
| Premium AI | `/api/ai-premium` | 12 | Cash flow intelligence, subscriptions, tax harvesting |
| AI Training | `/api/ai-training` | ~10 | Model training, NLP, classification |
| AI Models | `/api/ai-models` | ~15 | Model registry, A/B testing, drift detection |

---

## Core AI (`/api/ai`)

### Dashboard & Health
```
GET /api/ai/dashboard        → AI overview (models trained, accuracy, last trained)
GET /api/ai/health-score     → Financial health score (0-100 with breakdown)
GET /api/ai/recommendations  → Personalized AI recommendations
```

### Forecasting
```
GET /api/ai/forecast/spending  → 6-month spending forecast
GET /api/ai/forecast/income    → Income forecast with seasonality
GET /api/ai/forecast/savings   → Savings potential analysis
GET /api/ai/forecast/cashflow  → Cash flow projection
GET /api/ai/moving-averages    → Moving average analysis (7/14/30 day)
```

### Anomaly Detection
```
GET /api/ai/anomalies      → Detected spending anomalies
GET /api/ai/changepoints   → Change point detection (spending shifts)
```

### Pattern Analysis
```
GET /api/ai/patterns/recurring  → Recurring transaction patterns
GET /api/ai/patterns/merchants  → Merchant spending patterns
GET /api/ai/patterns/velocity   → Spending velocity analysis
GET /api/ai/patterns/spending   → Overall spending patterns
```

### NLP
```
POST /api/ai/query     → Natural language financial query
POST /api/ai/entities  → Entity extraction from text
GET  /api/ai/sentiment → Transaction sentiment analysis
GET  /api/ai/summary   → AI financial summary
```

### Training
```
POST /api/ai/train           → Train all models for current user
POST /api/ai/categorize      → AI categorize a transaction
GET  /api/ai/pipeline/status → Training pipeline status
```

---

## Enhanced AI (`/api/ai-enhanced`)

### Conversational AI
```
POST /api/ai-enhanced/chat         → Multi-turn financial chatbot
GET  /api/ai-enhanced/chat/summary → Conversation summary
```

**Chat Request:**
```json
{
  "message": "How much did I spend on food last month?",
  "sessionId": "optional_session_id"
}
```

### Optimization
```
POST /api/ai-enhanced/optimize/budget      → RL-based budget optimization
POST /api/ai-enhanced/optimize/investments → Investment strategy optimization
POST /api/ai-enhanced/optimize/debt        → Debt payoff optimization
```

### Knowledge Graph
```
POST /api/ai-enhanced/knowledge/query → Query financial knowledge graph
GET  /api/ai-enhanced/knowledge/graph → Full knowledge graph visualization
```

### Explainable AI (XAI)
```
POST /api/ai-enhanced/explain     → SHAP/LIME explanation for any prediction
GET  /api/ai-enhanced/audit-trail → Decision audit trail
```

**Explain Request:**
```json
{
  "predictionType": "spending_forecast",
  "features": { "category": "food", "month": 3 }
}
```

**Response:**
```json
{
  "explanation": "Food spending forecast is influenced primarily by:",
  "factors": [
    { "feature": "day_of_week", "importance": 0.35, "direction": "positive" },
    { "feature": "month_trend", "importance": 0.25, "direction": "positive" }
  ],
  "counterfactuals": [
    { "change": "Reduce food orders by 20%", "impact": "Save ₹3,400/month" }
  ]
}
```

### AutoML
```
POST /api/ai-enhanced/automl/run     → Run automated ML pipeline
GET  /api/ai-enhanced/automl/history → Past AutoML runs and results
```

### Model Monitoring
```
GET  /api/ai-enhanced/monitoring/dashboard               → Monitoring overview
GET  /api/ai-enhanced/monitoring/metrics/:modelId         → Model performance
GET  /api/ai-enhanced/monitoring/alerts                   → Active alerts
POST /api/ai-enhanced/monitoring/alerts/:alertId/acknowledge → Acknowledge alert
```

### A/B Testing
```
POST /api/ai-enhanced/ab-test/create → Create A/B test
GET  /api/ai-enhanced/ab-test/list   → List active tests
```

### What-If Analysis
```
POST /api/ai-enhanced/what-if → Scenario analysis
```

**Request:**
```json
{
  "scenario": "increase_savings",
  "parameters": { "savingsIncrease": 5000, "months": 12 }
}
```

---

## Advanced AI (`/api/ai-advanced`)

### Portfolio Optimization
```
POST /api/ai-advanced/portfolio/optimize          → Markowitz optimization
POST /api/ai-advanced/portfolio/analyze            → Portfolio analysis
POST /api/ai-advanced/portfolio/stress-test         → Market stress testing
POST /api/ai-advanced/portfolio/rebalance           → Rebalancing suggestions
GET  /api/ai-advanced/portfolio/efficient-frontier  → Efficient frontier chart
GET  /api/ai-advanced/portfolio/assets              → Available asset library
```

**Optimize Request:**
```json
{
  "riskTolerance": "moderate",
  "investmentAmount": 500000,
  "horizon": 5,
  "constraints": { "maxSingleAsset": 0.3, "minBonds": 0.1 }
}
```

### Credit Score Prediction
```
GET  /api/ai-advanced/credit/score            → Predicted CIBIL score
GET  /api/ai-advanced/credit/improvement-plan → Score improvement plan
GET  /api/ai-advanced/credit/history          → Score history/trend
POST /api/ai-advanced/credit/simulate         → Simulate decision impact
```

**Simulate Request:**
```json
{
  "action": "close_credit_card",
  "details": { "creditLimit": 200000, "balance": 0 }
}
```

### Peer Comparison
```
POST /api/ai-advanced/peers/compare → Anonymous benchmarking
```

### Semantic Search
```
POST /api/ai-advanced/search/smart       → Natural language search
POST /api/ai-advanced/search/parse       → Query parsing
GET  /api/ai-advanced/search/suggestions → Search suggestions
```

---

## Extended AI (`/api/ai-extended`)

### Fraud Detection
```
POST /api/ai-extended/fraud/screen                → Screen single transaction
POST /api/ai-extended/fraud/screen-batch          → Batch screening
POST /api/ai-extended/fraud/initialize            → Initialize fraud engine
GET  /api/ai-extended/fraud/alerts                → Active fraud alerts
GET  /api/ai-extended/fraud/stats                 → Fraud statistics
POST /api/ai-extended/fraud/alerts/:alertId/resolve → Resolve alert
```

### Natural Language Reports
```
GET /api/ai-extended/reports/generate            → Full NL financial report
GET /api/ai-extended/reports/quick-summary       → Quick summary
GET /api/ai-extended/reports/category/:category  → Category report
```

### Behavioral Finance
```
GET /api/ai-extended/behavioral/analyze → Cognitive bias analysis
```

**Response includes:**
- Loss aversion score (Kahneman-Tversky 2.5x ratio)
- Anchoring bias detection
- Mental accounting patterns
- Sunk cost fallacy instances
- Nudge-based recommendations

### Financial Planning AI
```
POST /api/ai-extended/planning/comprehensive  → Full financial plan
POST /api/ai-extended/planning/tax-comparison  → Old vs New tax regime
POST /api/ai-extended/planning/retirement      → Retirement plan
POST /api/ai-extended/planning/insurance-gap   → Insurance gap analysis
```

### Ensemble Forecasting
```
GET  /api/ai-extended/forecast/ensemble      → Multi-model ensemble forecast
POST /api/ai-extended/forecast/monte-carlo   → Monte Carlo simulation
```

---

## Premium AI (`/api/ai-premium`)

### Cash Flow Intelligence
```
GET /api/ai-premium/cashflow/analyze         → Full cash flow analysis
GET /api/ai-premium/cashflow/forecast        → Cash flow forecast
GET /api/ai-premium/cashflow/income-patterns → Income pattern detection
GET /api/ai-premium/cashflow/recurring       → Recurring flow analysis
GET /api/ai-premium/cashflow/liquidity       → Liquidity assessment
```

### Subscription Manager
```
GET /api/ai-premium/subscriptions/analyze → Subscription analysis
GET /api/ai-premium/subscriptions/detect  → Auto-detect subscriptions
GET /api/ai-premium/subscriptions/optimize → Optimization suggestions
```

### Tax-Loss Harvesting
```
POST /api/ai-premium/tax-harvesting/analyze            → Tax harvesting analysis
POST /api/ai-premium/tax-harvesting/calculate-gains     → Capital gains calculation
POST /api/ai-premium/tax-harvesting/loss-opportunities  → Loss harvesting opportunities
POST /api/ai-premium/tax-harvesting/gain-opportunities  → Gain booking opportunities
```

---

## AI Module Catalog

### Core ML Infrastructure
| Module | Algorithm | Lines |
|--------|-----------|-------|
| Neural Network | Dense layers, backprop, Adam, SGD, RMSProp | 1,459 |
| Decision Tree | CART, Random Forest, Gradient Boosting | 953 |
| Clustering | K-Means++, DBSCAN, Hierarchical, PCA | 1,027 |
| Time Series | ARIMA, Holt-Winters, Seasonal Decomp | 1,210 |

### Training & Orchestration
| Module | Purpose | Lines |
|--------|---------|-------|
| Training Pipeline | Model versioning, k-fold CV, scheduling | 1,038 |
| Self-Learning Pipeline | Continuous improvement from user data | 806 |
| AutoML Pipeline | Auto feature engineering, model selection | 1,258 |
| AI Orchestrator | Central hub for all AI modules | 946 |
| Data Pipeline | Feature extraction, preprocessing | 577 |
| Model Monitoring | Drift detection, A/B testing, alerts | 853 |

### Anomaly Detection & Fraud
| Module | Algorithm | Lines |
|--------|-----------|-------|
| Advanced Anomaly Detection | Isolation Forest, LOF, Autoencoders, SPC | 1,208 |
| Fraud Detection System | Rule engine + ML + behavioral analysis | 1,300 |

### NLP & Conversational
| Module | Algorithm | Lines |
|--------|-----------|-------|
| NLP Engine | TF-IDF, NER, sentiment, query understanding | 852 |
| Conversational AI | Multi-turn dialogue, memory, intent classification | 1,291 |
| NL Report Generator | Natural language financial narratives | 855 |
| Document Intelligence | Structured extraction from unstructured docs | 610 |
| Semantic Search | TF-IDF indexing, fuzzy matching, faceted search | 663 |

### Optimization & Planning
| Module | Algorithm | Lines |
|--------|-----------|-------|
| Reinforcement Learning | Q-Learning, DQN, Policy Gradient, Actor-Critic | 1,586 |
| Portfolio Optimization | Markowitz, Black-Litterman, Risk Parity | 1,077 |
| Smart Financial Planner | Multi-goal optimization, retirement analysis | 796 |
| Goal Achievement Engine | Feasibility analysis, contribution optimization | 621 |
| Tax Harvesting Engine | Indian STCG/LTCG rules, indexation, exemptions | 487 |

### Behavioral & Spending
| Module | Purpose | Lines |
|--------|---------|-------|
| Behavioral Finance | Cognitive bias detection (loss aversion, etc.) | 881 |
| Spending Intelligence | Merchant-level insights, impulse detection | 805 |
| Pattern Recognition | Spending clustering, lifestyle inflation | 545 |
| Peer Comparison Engine | Anonymous benchmarking by income bracket | 418 |
| Financial Wellness | 8-dimension wellness scoring | 547 |

### Recommendations & Notifications
| Module | Purpose | Lines |
|--------|---------|-------|
| Recommendation Engine | Collaborative + content-based filtering | 899 |
| Smart Notification AI | Priority-weighted, fatigue-aware alerts | 612 |
| Subscription Manager AI | Auto-detect, renewal prediction, alternatives | 457 |

### Explainability & Knowledge
| Module | Algorithm | Lines |
|--------|-----------|-------|
| Explainable AI | SHAP, LIME, counterfactual, natural language | 865 |
| Knowledge Graph | Entity graph, relationship mapping, reasoning | 940 |

### Integration Engines
| Module | Purpose | Lines |
|--------|---------|-------|
| Local AI Engine | Unified ML inference API | 1,524 |
| AI Model Trainer | Per-user model training/persistence | 1,822 |
