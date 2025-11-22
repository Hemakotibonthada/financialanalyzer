# 🧪 Quick Test Guide: User Data Isolation Fix

## Before Testing
Make sure you have:
- Two test accounts ready (e.g., hemakotibonthada@gmail.com and test@ai.com)
- Frontend running on http://localhost:5173 (or your dev URL)
- Backend running on http://localhost:5001
- Browser DevTools open (F12)

## Test Scenario 1: Basic User Isolation ✅

### Steps:
1. **Login as User A (hemakotibonthada@gmail.com)**
   - Navigate to `/login`
   - Enter credentials and log in
   - Go to Dashboard

2. **Verify User A's Data**
   - Note the financial summary (income, spending, savings)
   - Check the Financial Health Score
   - Take a screenshot or write down key numbers

3. **Open Browser Console and Run Test**
   ```javascript
   // Copy test-user-isolation.js content into console
   // OR load it via: 
   const script = document.createElement('script');
   script.src = '/test-user-isolation.js';
   document.head.appendChild(script);
   ```

4. **Verify Cache Keys**
   ```javascript
   // In console:
   testUserIsolation.testCacheKeys();
   // Should show: dashboard_data_hemakotibonthada@gmail.com
   ```

5. **Logout**
   - Click logout button
   - Verify you're on login page

6. **Check Cache After Logout**
   ```javascript
   // In console:
   Object.keys(sessionStorage).filter(k => k.includes('dashboard'))
   // Should return: [] (empty array)
   ```

7. **Login as User B (test@ai.com)**
   - Enter different user credentials
   - Log in and go to Dashboard

8. **🔍 CRITICAL CHECK: Verify NO User A Data is Visible**
   - ✅ Should see ONLY User B's financial data
   - ✅ Financial Health Score should be different
   - ✅ Summary numbers should be different
   - ❌ Should NOT see any of User A's information

9. **Run Tests Again**
   ```javascript
   testUserIsolation.runAllTests();
   // All tests should PASS
   ```

### Expected Results:
- ✅ User B sees only their own data
- ✅ No cache keys from User A remain
- ✅ `last_user_key` shows User B's email/id
- ✅ Dashboard cache key includes User B's identifier

### If Test Fails:
- Clear browser cache completely (Ctrl+Shift+Delete)
- Restart browser
- Re-run the test
- If still fails, check browser console for errors

---

## Test Scenario 2: Hard Refresh ✅

### Steps:
1. Login as User A
2. View Dashboard
3. Logout
4. Login as User B
5. **Hard Refresh (Ctrl+Shift+R or Fn+F5)**
6. Check dashboard

### Expected Results:
- ✅ Still shows only User B's data
- ✅ No User A data visible

---

## Automated Browser Console Tests

Copy and paste into browser console:

```javascript
// Test 1: Check cache isolation
console.log('=== CACHE ISOLATION TEST ===');
const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || 'null');
const userKey = user ? (user.id || user.email) : 'none';
console.log('Current User:', userKey);

const dashboardKeys = Object.keys(sessionStorage).filter(k => k.includes('dashboard'));
console.log('Dashboard Cache Keys:', dashboardKeys);

const hasIsolation = dashboardKeys.every(k => k.includes(userKey) || k === 'last_user_key');
console.log(hasIsolation ? '✅ PASS: Cache is isolated' : '❌ FAIL: Cache leak detected!');

// Test 2: Check for generic cache keys (vulnerable)
console.log('\n=== GENERIC CACHE TEST ===');
const vulnerableKeys = ['dashboard_data', 'dashboard_cache_time'];
const foundVulnerable = vulnerableKeys.filter(k => sessionStorage.getItem(k) || localStorage.getItem(k));
if (foundVulnerable.length > 0) {
  console.log('❌ FAIL: Found vulnerable generic keys:', foundVulnerable);
} else {
  console.log('✅ PASS: No generic cache keys found');
}
```

---

## Success Criteria

✅ **PASS**: All of the following are true:
1. User B never sees User A's financial data
2. Cache keys always include user identifier
3. Logout clears all cached data
4. Login clears previous user's cached data
5. Hard refresh doesn't show old user data
6. Browser console tests all pass

❌ **FAIL**: Any of the following occur:
1. User B sees User A's dashboard data
2. Generic cache keys like 'dashboard_data' exist
3. Cache persists after logout

---

## Report Results

After successful testing, document:
- Date and browser tested
- All tests passed/failed
- Any issues found
- Overall result: PASS/FAIL
