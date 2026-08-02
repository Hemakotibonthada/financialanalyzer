# Firebase Deployment Guide - Financial Analyzer

## Complete Web Application Deployment

This guide covers deploying the entire Financial Analyzer application to Firebase, including:
- ✅ Frontend (React SPA) → Firebase Hosting
- ✅ Backend (Express API) → Cloud Functions
- ✅ Database → Firestore with security rules
- ✅ Storage → Firebase Storage with security rules

---

## Prerequisites

### 1. Firebase CLI Installation
```powershell
npm install -g firebase-tools
```

### 2. Firebase Login
```powershell
firebase login
```

### 3. Verify Project
```powershell
firebase projects:list
```
Should show: **finserveassist**

---

## Project Structure

```
Financial_Analyzer/
├── frontend/               # React application
│   └── dist/              # Built frontend (deploy to Hosting)
├── functions/             # Cloud Functions (backend API)
│   ├── index.js          # Main entry point
│   ├── routes/           # API routes
│   └── middleware/       # Auth middleware
├── firebase.json         # Firebase configuration
├── firestore.rules       # Firestore security rules
├── firebase-storage.rules # Storage security rules
├── .firebaserc           # Project configuration
└── firestore.indexes.json # Database indexes
```

---

## Step-by-Step Deployment

### Step 1: Build Frontend
```powershell
cd frontend
npm install
npm run build
```

**Output:** `frontend/dist/` folder with production build

**Verification:**
- Check `frontend/dist/index.html` exists
- Bundle size: ~720 KB

### Step 2: Install Functions Dependencies
```powershell
cd ..\functions
npm install
```

**Key Dependencies:**
- firebase-admin: ^12.0.0
- firebase-functions: ^5.0.0
- express: ^4.18.2
- And all backend dependencies

### Step 3: Deploy Firestore Rules
```powershell
cd ..
firebase deploy --only firestore:rules
```

**What it does:**
- Deploys security rules from `firestore.rules`
- User-scoped data access
- Role-based permissions (admin, lender, user)
- Validates userId on all operations

**Verify:**
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/finserveassist/firestore/rules
```

### Step 4: Deploy Storage Rules
```powershell
firebase deploy --only storage
```

**What it does:**
- Deploys security rules from `firebase-storage.rules`
- 10MB file limit (50MB for enterprise)
- User-scoped file access
- File type validation

**Verify:**
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/finserveassist/storage/rules
```

### Step 5: Deploy Cloud Functions
```powershell
firebase deploy --only functions
```

**What it does:**
- Uploads Cloud Functions code
- Creates Express API endpoints
- Sets up scheduled functions
- Configures HTTP triggers

**Functions deployed:**
- `api` - Main Express API (HTTP)
- `scheduledBackup` - Daily backup (Scheduled)
- `processBillReminders` - Hourly reminders (Scheduled)
- `onUserCreate` - User creation trigger (Auth)
- `onUserDelete` - User deletion trigger (Auth)

**Expected output:**
```
✔ functions[api(us-central1)]: Successful update operation.
✔ functions[scheduledBackup(us-central1)]: Successful update operation.
✔ functions[processBillReminders(us-central1)]: Successful update operation.
✔ functions[onUserCreate(us-central1)]: Successful update operation.
✔ functions[onUserDelete(us-central1)]: Successful update operation.

Function URL (api): https://us-central1-finserveassist.cloudfunctions.net/api
```

### Step 6: Deploy Hosting
```powershell
firebase deploy --only hosting
```

**What it does:**
- Uploads `frontend/dist/` to Firebase Hosting
- Configures SPA routing
- Sets cache headers
- Enables CDN

**Expected output:**
```
✔ Deploy complete!

Hosting URL: https://finserveassist.web.app
```

### Step 7: Deploy Everything at Once (Alternative)
```powershell
firebase deploy
```

**Deploys:**
- ✅ Firestore rules
- ✅ Storage rules
- ✅ Cloud Functions
- ✅ Hosting

---

## Post-Deployment Configuration

### 1. Enable Authentication in Console

**Go to:** https://console.firebase.google.com/project/finserveassist/authentication/providers

**Enable:**
- ✅ Email/Password
- ✅ Google Sign-In (optional)

### 2. Update Frontend Environment

The frontend is already configured to use Firebase:

```javascript
// frontend/src/services/firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyCjq21hbswP3uwSkOCvGxQ6g5BY1jF1yx8",
  authDomain: "finserveassist.firebaseapp.com",
  projectId: "finserveassist",
  storageBucket: "finserveassist.firebasestorage.app",
  messagingSenderId: "639604596498",
  appId: "1:639604596498:web:83b2a7bc0969a47ccdddcb",
  measurementId: "G-9B93V0H4WC"
};
```

### 3. Set Environment Variables (Cloud Functions)

The functions read configuration from `process.env`, which is populated from
`functions/.env` at deploy time. Copy the template and fill it in:

```powershell
Copy-Item functions/.env.example functions/.env
```

Two values are **required** — the API fails closed without them:

| Variable | Purpose | Where to get it |
|---|---|---|
| `JWT_SECRET` | Signs the JWTs the API issues. Without it, `/auth/login` returns 503 and every protected route returns 401. | `openssl rand -hex 32` |
| `FIREBASE_API_KEY` | Verifies email/password logins via the Identity Toolkit REST API. The Admin SDK cannot check passwords, so login returns 503 without it. | Firebase Console → Project settings → General → Web API Key |

> ⚠️ `firebase functions:config:set` populates `functions.config()`, **not**
> `process.env`, so it will not work for these variables. Use `functions/.env`.

**Redeploy functions after setting config:**
```powershell
firebase deploy --only functions
```

---

## API Endpoints

Once deployed, your API will be available at:

**Base URL:** `https://us-central1-finserveassist.cloudfunctions.net/api`

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user

### Data Management
- GET/POST/PUT/DELETE `/api/expenses` - Expenses
- GET/POST/PUT/DELETE `/api/incomes` - Incomes
- GET/POST/PUT/DELETE `/api/budgets` - Budgets
- GET/POST/PUT/DELETE `/api/goals` - Goals
- GET/POST/PUT/DELETE `/api/emis` - EMIs
- GET/POST/PUT/DELETE `/api/lenders` - Lenders
- GET/POST/PUT/DELETE `/api/loans` - Loans
- GET/POST/PUT/DELETE `/api/bill-reminders` - Bill Reminders
- GET/POST/PUT/DELETE `/api/reports` - Reports
- GET/POST/PUT/DELETE `/api/investments` - Investments
- GET/POST/PUT/DELETE `/api/company-expenses` - Company Expenses

### Health Check
- GET `/health` - API health status

---

## Testing Deployment

### 1. Test Frontend
```
Open: https://finserveassist.web.app
```

**Expected:**
- Landing page loads
- Can navigate to login/register
- UI is responsive

### 2. Test Authentication
```javascript
// Register
POST https://us-central1-finserveassist.cloudfunctions.net/api/api/auth/register
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "password123"
}

// Expected: 201 Created with user and token
```

### 3. Test Data Operations
```javascript
// Create Expense (with auth token)
POST https://us-central1-finserveassist.cloudfunctions.net/api/api/expenses
Headers: Authorization: Bearer <token>
{
  "amount": 1000,
  "category": "Food",
  "description": "Groceries",
  "date": "2025-11-18"
}

// Expected: 201 Created with expense data
```

### 4. Test Firestore Rules
```
Go to: https://console.firebase.google.com/project/finserveassist/firestore/data
```

**Verify:**
- Can see collections: users, expenses, incomes, etc.
- Documents have `userId` field
- Try accessing another user's data (should be denied)

### 5. Test Storage Rules
```
Go to: https://console.firebase.google.com/project/finserveassist/storage
```

**Upload a file:**
```javascript
const storage = getStorage();
const storageRef = ref(storage, `users/${userId}/documents/test.pdf`);
uploadBytes(storageRef, file);
```

---

## URL Summary

### Production URLs
- **Frontend:** https://finserveassist.web.app
- **API:** https://us-central1-finserveassist.cloudfunctions.net/api
- **Firebase Console:** https://console.firebase.google.com/project/finserveassist

### Console Sections
- **Authentication:** /authentication/users
- **Firestore:** /firestore/data
- **Storage:** /storage
- **Functions:** /functions/list
- **Hosting:** /hosting/sites
- **Analytics:** /analytics/overview

---

## Monitoring & Logs

### View Function Logs
```powershell
firebase functions:log
```

### View Specific Function
```powershell
firebase functions:log --only api
```

### Real-time Logs
```powershell
firebase functions:log --follow
```

### Console Logs
```
Go to: https://console.firebase.google.com/project/finserveassist/functions/logs
```

---

## Costs & Quotas

### Free Tier (Spark Plan)
- ✅ Hosting: 10GB storage, 360MB/day transfer
- ✅ Firestore: 1GB storage, 50K reads/day, 20K writes/day
- ✅ Storage: 5GB storage, 1GB/day download
- ✅ Functions: 2M invocations/month, 400K GB-seconds

### Blaze Plan (Pay-as-you-go)
Required for:
- Cloud Functions (need billing enabled)
- Scheduled functions
- High traffic applications

**Enable Blaze:**
```
Console → Project Settings → Usage and billing → Modify plan
```

---

## Rollback & Updates

### Rollback to Previous Version
```powershell
# List deployments
firebase hosting:channel:list

# View history
firebase hosting:releases:list

# Rollback (via console)
# Go to Hosting → Release history → Click "Rollback"
```

### Update Frontend Only
```powershell
cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

### Update Functions Only
```powershell
firebase deploy --only functions
```

### Update Rules Only
```powershell
firebase deploy --only firestore:rules,storage
```

---

## Troubleshooting

### Issue: Functions not deploying
**Solution:**
```powershell
# Check Node version (must be 18)
node --version

# Clear cache
firebase functions:delete --all
firebase deploy --only functions
```

### Issue: Frontend shows 404
**Check:**
- `frontend/dist/` folder exists and has content
- `firebase.json` points to correct public directory
- Rewrite rules configured for SPA

### Issue: API returns 401 Unauthorized
**Check:**
- Token is included in Authorization header
- Token format: `Bearer <token>`
- JWT_SECRET is set in functions config

### Issue: Firestore permission denied
**Check:**
- User is authenticated
- Document has `userId` field
- Firestore rules are deployed
- User ID matches document userId

---

## Maintenance Commands

### Check Deployment Status
```powershell
firebase deploy:status
```

### View Project Info
```powershell
firebase projects:list
firebase use finserveassist
firebase apps:list
```

### Update Firebase CLI
```powershell
npm install -g firebase-tools@latest
```

### Clear Functions Cache
```powershell
firebase functions:delete --all
```

---

## Security Checklist

Before going to production:

- [ ] Change JWT_SECRET in functions config
- [ ] Enable Email/Password authentication
- [ ] Deploy Firestore security rules
- [ ] Deploy Storage security rules
- [ ] Set up backups
- [ ] Configure error monitoring
- [ ] Set up usage alerts
- [ ] Review CORS settings
- [ ] Enable HTTPS only
- [ ] Set up custom domain (optional)

---

## Next Steps

1. **Test thoroughly** in production environment
2. **Set up monitoring** - Firebase Analytics, Crashlytics
3. **Configure backups** - Export Firestore data regularly
4. **Set up CI/CD** - GitHub Actions for automatic deployment
5. **Add custom domain** - Configure DNS for custom URL

---

## Support

### Firebase Documentation
- Functions: https://firebase.google.com/docs/functions
- Hosting: https://firebase.google.com/docs/hosting
- Firestore: https://firebase.google.com/docs/firestore
- Storage: https://firebase.google.com/docs/storage

### Community
- Stack Overflow: firebase tag
- Firebase Slack: https://firebase.community

---

**Deployment Date:** November 18, 2025  
**Project:** finserveassist  
**Status:** Ready for deployment
