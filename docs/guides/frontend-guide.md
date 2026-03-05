# Frontend Architecture Guide

> React 18 + Vite 5 + MUI 7 + Tailwind CSS 3 — 146 pages, 67 components

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18 | UI framework |
| Vite | 5 | Build tool & dev server |
| Material UI | 7 | Component library |
| Tailwind CSS | 3 | Utility-first CSS |
| React Router | 6 | Client-side routing |
| Chart.js + Recharts | 4 / 2 | Data visualization |
| Lucide React | — | Icon library |
| Axios | — | HTTP client |
| Socket.IO Client | — | Real-time communication |
| Firebase | 12 | Auth + Hosting |

---

## Application Architecture

### Provider Stack (App.jsx)
```
EnterpriseErrorBoundary
  └─ ErrorBoundary
       └─ ThemeProvider (3 modes + 8 accents)
            └─ ToastProvider
                 └─ AuthProvider (dual backend: MongoDB / Firebase)
                      └─ WebSocketProvider (Socket.IO)
                           └─ NotificationProvider
                                └─ SidebarProvider (collapse state)
                                     └─ CurrencyProvider (INR, USD, etc.)
                                          └─ FeatureFlagProvider
                                               └─ Router (BrowserRouter)
                                                    └─ KeyboardShortcutsProvider
                                                         └─ Routes + SmartAssistant
```

### Code Splitting
- Login, Register, LandingPage: **eagerly loaded**
- All other 130+ pages: **lazy-loaded** via `React.lazy()`
- `lazyRetry()` wrapper: retries dynamic imports up to 3x with 1s delay (handles Vite HMR failures)

---

## Routing (~130 routes)

All protected routes wrap with `<ProtectedRoute>`:
```jsx
<Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
```

Admin routes use role check:
```jsx
<Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
```

### Route Categories
| Category | Count | Example Paths |
|----------|-------|---------------|
| Public | 3 | `/`, `/login`, `/register` |
| Core | 6 | `/dashboard`, `/profile`, `/analyze` |
| Transactions | 5 | `/transactions`, `/bank-accounts`, `/credit-cards` |
| Budget | 5 | `/budget-planner`, `/budget-wizard`, `/cash-flow` |
| Investments | 11 | `/investments`, `/mutual-funds`, `/crypto`, `/sip-calculator` |
| Debt & EMI | 7 | `/emi-tracker`, `/debt-management`, `/loan-calculator` |
| Goals | 4 | `/goals`, `/goal-timeline`, `/savings-challenges` |
| Reports | 11 | `/reports`, `/data-lab`, `/export-center`, `/scorecard` |
| AI Features | 29 | `/ai-command-center-v3`, `/rl-optimizer`, `/credit-score-predictor` |
| Enterprise V2 | 11 | `/dashboard-v2`, `/financial-health-v2`, `/settings-v2` |
| Enterprise V3 | 13 | `/dashboard-v3`, `/ai-chat-v3`, `/gmail-browser` |
| Other | 25 | `/insurance`, `/retirement`, `/education`, `/automation` |

---

## Layout System

### MainLayout
All authenticated pages use `<MainLayout>`:

```jsx
<MainLayout title="Dashboard" subtitle="Overview" headerActions={<CustomActions />}>
  <PageContent />
</MainLayout>
```

Structure:
```
┌──────────────────────────────────────────────────────┐
│ Fixed Header (glassmorphism, backdrop-blur)           │
│ [Title]  [Subtitle]  [Actions]  [Bell] [Theme] [User]│
├──────────┬───────────────────────────────────────────┤
│ Sidebar  │ Main content area (scrollable)             │
│ (fixed)  │                                            │
│ 72px or  │  Page content renders here                 │
│ 288px    │                                            │
│          │                                            │
│ auto-    │                                            │
│ expand   │                                            │
│ on route │                                            │
└──────────┴───────────────────────────────────────────┘
```

### Profile Dropdown
The user avatar in the header opens a rich dropdown with:
- User info (avatar, name, email, role)
- Account links (Profile, Notifications, Security)
- Preferences (General, Appearance, Language)
- Data (Data Management, API, Backup)
- Help (Help Center, Docs, Contact)
- Enterprise (Admin, Team, Logs) — admin only
- App info + Logout

Each link navigates to `/profile?tab=<tabName>` for deep linking.

---

## Sidebar Navigation

### Sections (9 collapsible groups)
1. **Enterprise V2** — 13 items
2. **Money** — 11 items
3. **Invest & Wealth** — 11 items
4. **Debt & EMI** — 6 items
5. **Plan & Goals** — 6 items
6. **Insights & Reports** — 21 items
7. **Wealth** — 5 items
8. **AI Lab** — 13 items
9. **More** — 9 items

### Features
- **Collapse persistence** — expanded sections saved to `localStorage`
- **Auto-expand** — section auto-expands when navigating to a route in that section
- **Mobile drawer** — slides out on mobile devices
- **Icon-only mode** — collapses to 72px showing only icons
- **Badge system** — `NEW`, `AI`, `ML` badges on items
- **Color-coded icons** — 15 color variants (blue, green, purple, etc.)
- **Quick access** — Dashboard, Health, Notifications always visible at top

---

## Theme System

### 3 Modes
| Mode | Description |
|------|-------------|
| `light` | Default light theme |
| `dark` | Dark theme |
| `black` | AMOLED-optimized pure black |

### 8 Accent Colors
Ocean Blue, Royal Purple, Emerald, Rose, Amber, Teal, Indigo, Sky

### How It Works
1. `ThemeContext` provides `{ mode, darkMode, toggleTheme, accentColor, setAccentColor }`
2. Sets CSS custom properties on `:root` (11 variables: `--theme-bg`, `--theme-surface`, etc.)
3. Adds `dark` class to `<html>` for Tailwind dark mode
4. Switches MUI theme provider between light/dark/black themes
5. Persists to `localStorage` (`themeMode`, `themeAccent`)
6. Syncs with OS `prefers-color-scheme` (unless user explicitly chose)

### Using Theme in Components
```jsx
const { mode } = useTheme();
const dk = mode === 'dark' || mode === 'black';

<div className={dk ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}>
```

---

## Authentication Flow

### AuthContext
```
Mount → Check localStorage/sessionStorage for token
  ├─ If Firebase mode → onAuthStateChanged listener
  ├─ If local mode → GET /api/auth/me to validate
  └─ Safety timeout → force loading=false after 10s

Login → POST /api/auth/login → store token → set user state
Logout → clear storage → clear state → signOut (Firebase)
401 → API interceptor → dispatch auth:unauthorized event
```

### Token Storage
- `localStorage` — persistent with expiry date
- `sessionStorage` — session-only fallback
- Expiry validation on every read

---

## API Service (api.js)

### Configuration
```javascript
const API = axios.create({
  baseURL: dynamicApiUrl,  // auto-detects: Firebase Functions / LAN IP / localhost:5001
  timeout: 30000,
});
```

### Features
- **Auto-retry** — 3 retries with exponential backoff for GET/HEAD requests
- **Token injection** — request interceptor adds Bearer token
- **401 handling** — clears storage, dispatches event
- **FormData support** — auto-removes Content-Type for file uploads

### Service Modules
15+ service modules exposed: `authService`, `profileService`, `financialService`, `aiService`, `automationService`, `financialInsightsService`, `aiTrainingService`, `aiModelService`, `dataExportService`, `jobsService`, `aiIntelligenceService`, `localAIService`

---

## State Management

### Context API (8 Contexts)
| Context | Purpose |
|---------|---------|
| `AuthContext` | User state, login/logout, token management |
| `ThemeContext` | Theme mode, accent color, CSS variables |
| `CurrencyContext` | Selected currency, conversion rates |
| `NotificationContext` | Notification list, unread count |
| `SidebarContext` | Sidebar expanded/collapsed state |
| `WebSocketContext` | Socket.IO connection, event listeners |
| `FeatureFlagContext` | Feature toggle flags |
| `KeyboardShortcutsContext` | Global keyboard shortcuts |

### Custom Hooks (7)
| Hook | Purpose |
|------|---------|
| `useAIFeatures` | AI feature state and operations |
| `useAnimations` | Animation utilities |
| `useConfirm` | Confirmation dialog |
| `useCustomHooks` | Collection of utility hooks |
| `useFinancialData` | Financial data fetching |
| `useLocalStorage` | localStorage with React state sync |
| `useThemeStyles` | Theme-aware style generation |

---

## UI Component Library

### Core Components (`components/ui/`)
| Component | Purpose |
|-----------|---------|
| `ComponentLibrary` | AnimatedCard, Badge, Modal, and more |
| `AnimatedComponents` | FadeIn, PageTransition, SlideIn |
| `ChartComponents` | Chart wrappers for Chart.js/Recharts |
| `DashboardWidgets` | KPI cards, stat widgets |
| `DataTable` | Sortable, filterable data table |
| `EnterpriseComponents` | Enterprise UI kit (MetricComparison, etc.) |
| `StateComponents` | Loading, empty, error states |
| `ThemePageComponents` | Theme-aware button, gradient text |

### Global Components
| Component | Purpose |
|-----------|---------|
| `SmartAssistant` | Floating AI assistant (available on every page) |
| `NotificationBell` | Header notification bell with count |
| `ThemeToggle` | Theme mode toggle button |
| `ThemePicker` | Accent color picker popup |
| `ErrorBoundary` | React error boundary (2 layers) |

---

## Build Configuration

### Vite Config
```javascript
{
  server: { port: 5173, proxy: { '/api': 'http://localhost:5001' } },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: { output: { manualChunks: { vendor: [...] } } }
  }
}
```

### Tailwind Config
- Dark mode: `class` strategy
- Custom colors, shadows, animations
- Extended with financial-specific color palette

### PostCSS
- Tailwind CSS processing
- Autoprefixer for cross-browser support
