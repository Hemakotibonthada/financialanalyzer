# Developer Guide

> Getting started with FinancialAnalyzer development

---

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **MongoDB** 6+ (local or Atlas)
- **Redis** (optional — falls back to node-cache)
- **Git** for version control
- **VS Code** (recommended IDE)

---

## Quick Start

### 1. Clone Repository
```bash
git clone <repo-url>
cd FinancialAnalyzer
```

### 2. Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Environment Setup
```bash
# Copy and edit backend environment
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secrets, etc.
```

### 4. Start Development Servers
```bash
# Terminal 1 — Backend
cd backend
npm run dev    # nodemon auto-restart on changes

# Terminal 2 — Frontend
cd frontend
npm run dev    # Vite dev server at http://localhost:5173
```

### 5. Access Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:5001/api
- Health Check: http://localhost:5001/api/health

---

## Project Conventions

### File Naming
| Type | Convention | Example |
|------|-----------|---------|
| React Pages | PascalCase.jsx | `Dashboard.jsx` |
| React Components | PascalCase.jsx | `MainLayout.jsx` |
| Services | camelCase.js | `localAIEngine.js` |
| Routes | camelCase.js | `authRoutes.js` |
| Models | PascalCase.js | `Transaction.js` |
| Hooks | useCamelCase.js | `useThemeStyles.js` |
| Context | PascalCaseContext.jsx | `AuthContext.jsx` |
| Tests | *.test.js / *.test.jsx | `auth.test.js` |

### Code Style
- **Frontend:** React functional components with hooks (no class components)
- **Backend:** Express async route handlers with try/catch
- **State:** React Context API (no Redux)
- **CSS:** Tailwind utilities with dark mode ternaries
- **Imports:** Grouped: React → 3rd party → local components → styles

### Dark Mode Pattern
```jsx
const { mode } = useTheme();
const dk = mode === 'dark' || mode === 'black';

// Pattern: ternary for colors
className={dk ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}

// Pattern: conditional class
className={`text-sm ${dk ? 'text-gray-400' : 'text-gray-600'}`}
```

### API Call Pattern
```javascript
// Using the API service modules
import api from '../services/api';

// GET request
const { data } = await api.get('/api/budgets');

// Using service modules
const data = await api.aiService.getDashboard();
const profile = await api.profileService.getProfile();
```

---

## Architecture Decisions

### Why 100% Local AI?
- **Zero cost** — no API tokens, no pay-per-call
- **Full privacy** — user data never leaves the server
- **Offline capable** — works without internet (except Gmail sync)
- **No rate limits** — unlimited predictions/queries
- **Custom algorithms** — tuned for Indian financial data

### Why 3 UI Generations?
- **V1** — Functional, stable, minimal UI
- **V2** — Enhanced with MUI components, animations
- **V3** — Enterprise-grade with advanced analytics

This allows:
- Progressive enhancement without breaking changes
- Users choose their preferred complexity level
- Safe experimentation in newer versions

### Why Context API over Redux?
- Smaller bundle size
- Simpler mental model for domain-specific state
- 8 focused contexts vs. one massive store
- Works well with React 18 concurrent features

---

## Adding a New Feature

### 1. Backend Route
```javascript
// backend/routes/myFeatureRoutes.js
const router = require('express').Router();
const authenticate = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const data = await MyService.getData(req.user.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

### 2. Register Route
```javascript
// backend/server.js
const myFeatureRoutes = require('./routes/myFeatureRoutes');
app.use('/api/my-feature', authenticate, myFeatureRoutes);
```

### 3. Frontend Page
```jsx
// frontend/src/pages/MyFeature.jsx
import React, { useState, useEffect } from 'react';
import MainLayout from '../components/MainLayout';
import api from '../services/api';

const MyFeature = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/api/my-feature').then(res => setData(res.data.data));
  }, []);

  return (
    <MainLayout title="My Feature">
      {/* Page content */}
    </MainLayout>
  );
};

export default MyFeature;
```

### 4. Register Route & Sidebar
```jsx
// App.jsx — add lazy import
const MyFeature = lazyRetry(() => import('./pages/MyFeature'));

// Add route
<Route path="/my-feature" element={<ProtectedRoute><MyFeature /></ProtectedRoute>} />

// Sidebar.jsx — add to appropriate section
{ name: 'My Feature', path: '/my-feature', icon: Star, color: 'blue' }
```

---

## Testing

### Backend Tests
```bash
cd backend
npm test                         # All tests
npm test -- --testPathPattern=auth  # Specific test
npm run test:coverage            # Coverage report
```

### Frontend Tests
```bash
cd frontend
npm test                         # Vitest
npm run test:coverage            # Coverage
```

### AI Module Tests
```bash
cd backend
node tests/test-ai-enhanced.js   # AI enhanced tests
node tests/test-ai-advanced.js   # AI advanced tests
node tests/test-ai-extended.js   # AI extended tests
node tests/test-ai-premium.js    # AI premium tests
```

---

## Deployment

### Build Frontend
```bash
cd frontend
npm run build    # Outputs to frontend/dist/
```

### Environment Variables
Set all required `.env` variables in production:
- `NODE_ENV=production`
- `MONGODB_URI` — production MongoDB connection string
- `JWT_SECRET` — strong random secret (32+ chars)
- `ENCRYPTION_KEY` — 32-character key for 2FA encryption

### Firebase Hosting
```bash
firebase deploy --only hosting    # Deploy frontend
firebase deploy --only functions  # Deploy backend as Cloud Functions
```

### Desktop Build
```bash
cd desktop
npm run build           # Build Electron app
npm run build-installer # Build Windows installer
```

---

## Troubleshooting

### Common Issues

**Port already in use:**
The server auto-recovers by killing the stale process on `EADDRINUSE`.

**MongoDB connection failed:**
Check `MONGODB_URI` in `.env`. Ensure MongoDB is running locally or Atlas is accessible.

**Frontend API calls failing:**
Check that backend is running on port 5001. Vite proxies `/api` requests automatically.

**AI training showing 0/0 models:**
Minimum 5 transactions required per category for training. Add more data.

**Dark mode style conflicts:**
Use ternary pattern: `dk ? 'dark-class' : 'light-class'`. Never concatenate conflicting utilities.

**Token expired:**
Frontend auto-clears expired tokens. Re-login required.
