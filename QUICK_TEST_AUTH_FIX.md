# Quick Test Guide - Authentication & Cloud Storage Fix

## New Build Available
**Build Time:** November 18, 2025 at 7:34 PM  
**Installer:** `desktop/dist/FinancialAnalyzerSetup-1.0.0.exe` (87.97 MB)  
**Portable:** `desktop/dist/FinancialAnalyzer-Portable-1.0.0.exe` (87.69 MB)

---

## What's Fixed

### 1. ✅ Login Redirect Issue
- **Before:** After login → Landing page (/)
- **After:** After login → Dashboard (/dashboard)

### 2. ✅ Cloud Storage Authentication
- **Before:** Cloud storage didn't use Firebase Auth
- **After:** Cloud storage uses Firebase Authentication + Firestore with proper user scoping

---

## Test Scenarios

### Scenario 1: Local Storage (MongoDB)

1. **Uninstall old version**
   - Settings → Apps → Uninstall "Financial Analyzer"

2. **Install new version**
   ```powershell
   .\desktop\dist\FinancialAnalyzerSetup-1.0.0.exe
   ```

3. **Setup wizard**
   - Select **"Local Storage"** (💾 icon)
   - Click **Continue**

4. **Landing window** (optional)
   - Click **"Launch App"**

5. **Register new account**
   - Fill in: Name, Email, Password
   - Click **"Sign Up"**
   - ✅ Should redirect to **Dashboard** (not landing page!)

6. **Verify dashboard loads**
   - Should see: Welcome message, charts, quick actions
   - ✅ Logged in successfully with local MongoDB

7. **Test data creation**
   - Add an expense
   - Should save to MongoDB backend
   - ✅ Data persisted

8. **Logout and login**
   - Logout from profile menu
   - Login again with same credentials
   - ✅ Should redirect to **Dashboard** (not landing page!)

---

### Scenario 2: Cloud Storage (Firebase)

1. **Uninstall and reinstall** (to see setup again)

2. **Setup wizard**
   - Select **"Online Storage"** (☁️ icon)
   - Click **Continue**

3. **Register with Firebase**
   - Fill in: Name, Email, Password
   - Click **"Sign Up"**
   - ✅ Creates Firebase Authentication user
   - ✅ Stores profile in Firestore `/users/{uid}`
   - ✅ Should redirect to **Dashboard**

4. **Verify Firebase connection**
   - Open browser DevTools (F12)
   - Console should show:
     ```
     [auth] Registering with Firebase Authentication
     Firebase Analytics initialized
     Storage initialized: Firebase/Firestore with user: <firebase-uid>
     ```

5. **Test cloud data**
   - Add an expense
   - Should save to Firestore with `userId` field
   - Data scoped to your Firebase user ID

6. **Verify data scoping**
   - Open Firebase Console: https://console.firebase.google.com/
   - Project: **finserveassist**
   - Firestore Database
   - Check expense document:
     ```json
     {
       "amount": 500,
       "category": "Food",
       "userId": "firebase-uid-here",
       "createdAt": "2025-11-18T...",
       "updatedAt": "2025-11-18T..."
     }
     ```

7. **Logout and login**
   - Logout from profile menu
   - Login with same email/password
   - ✅ Should redirect to **Dashboard**
   - ✅ Previous expense still visible (cloud sync!)

---

### Scenario 3: Cross-Device Sync (Cloud Only)

**Prerequisites:**
- Firebase Authentication enabled in console
- Firestore rules deployed

**Test:**
1. **Device A (Desktop App)**
   - Login with Firebase account
   - Add expense: "Test Sync - ₹1000"

2. **Device B (Another Desktop or Web)**
   - Install app or open in browser
   - Select "Online Storage"
   - Login with **same Firebase account**
   - ✅ Should see "Test Sync - ₹1000" expense
   - ✅ Cloud sync working!

---

## Firebase Setup Checklist

Before testing cloud storage, ensure Firebase is configured:

### 1. Enable Authentication
```
1. Go to: https://console.firebase.google.com/
2. Select project: finserveassist
3. Navigate to: Authentication → Sign-in method
4. Enable: Email/Password
5. Click: Save
```

### 2. Deploy Firestore Rules
```powershell
cd c:\Users\v-hbonthada\WorkSpace\Financial_Analyzer

# Login to Firebase
firebase login

# Initialize (if not done)
firebase init
# Select: Firestore, Storage
# Rules file: firebase-storage.rules

# Deploy
firebase deploy --only firestore,storage
```

### 3. Verify Firestore Database
```
1. Firebase Console → Firestore Database
2. Should see collections after creating data:
   - users
   - expenses
   - incomes
   - budgets
   - goals
   - emis
   - lenders
   - bill-reminders
```

---

## Expected Console Logs

### Local Storage Mode
```
App initialized with local storage
[auth] Using Local MongoDB Authentication
Login successful!
```

### Cloud Storage Mode
```
App initialized with online storage
Firebase Analytics initialized
[auth] Using Firebase Authentication
Storage initialized: Firebase/Firestore with user: <uid>
Login successful!
```

---

## Troubleshooting

### Issue: Still redirecting to landing page
**Solution:** Clear browser cache and localStorage
```javascript
// In DevTools Console (F12)
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Issue: Firebase authentication not working
**Check:**
1. Email/Password auth enabled in Firebase Console
2. Network connectivity (Firebase requires internet)
3. Console logs for Firebase errors
4. `storageType` in localStorage should be `'online'`

### Issue: Data not showing after cloud login
**Check:**
1. Firestore rules deployed
2. User ID properly set (`userId` field on documents)
3. Console log shows: `Storage initialized: Firebase/Firestore with user: <uid>`

### Issue: "Cannot read property 'uid' of null"
**Cause:** Firebase user not authenticated yet
**Solution:**
- Ensure Firebase Auth is enabled
- Check if registration/login completed successfully
- Verify token is stored in localStorage

---

## Quick Debug Commands

### Check Storage Type
```javascript
// In DevTools Console
localStorage.getItem('storageType')  // Should be 'local' or 'online'
```

### Check Authentication Token
```javascript
localStorage.getItem('token')  // Should exist after login
```

### Check Firebase User
```javascript
import { getAuth } from 'firebase/auth';
const auth = getAuth();
console.log(auth.currentUser);  // Should show user object
```

### Force Firebase Reinitialization
```powershell
# Delete settings to trigger setup wizard
Remove-Item "$env:APPDATA\Financial Analyzer\settings.json"

# Restart app
```

---

## Success Criteria

### ✅ Local Storage Working
- Register → Dashboard redirect ✅
- Login → Dashboard redirect ✅
- Data saves to MongoDB ✅
- Logout/Login persists data ✅

### ✅ Cloud Storage Working
- Register → Firebase user created ✅
- Register → Dashboard redirect ✅
- Login → Firebase authentication ✅
- Login → Dashboard redirect ✅
- Data saves to Firestore with `userId` ✅
- Cross-device sync working ✅
- Logout/Login persists data ✅

---

## Test Results Template

```
[ ] Scenario 1: Local Storage
  [ ] Setup wizard shows
  [ ] Local storage selected
  [ ] Register redirects to dashboard
  [ ] Login redirects to dashboard
  [ ] Data persists in MongoDB

[ ] Scenario 2: Cloud Storage
  [ ] Setup wizard shows
  [ ] Cloud storage selected
  [ ] Register creates Firebase user
  [ ] Register redirects to dashboard
  [ ] Login uses Firebase auth
  [ ] Login redirects to dashboard
  [ ] Data saves to Firestore with userId
  [ ] Console shows Firebase initialization

[ ] Scenario 3: Cross-Device Sync
  [ ] Data syncs across devices
  [ ] Same user ID on both devices
  [ ] Real-time updates (if implemented)
```

---

**Test Date:** November 18, 2025  
**Build Version:** 1.0.0  
**Build Time:** 7:34 PM  
**Status:** Ready for testing
