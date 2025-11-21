# EMI Cloud Functionality Test Guide

## Quick Test Checklist

Visit: https://finserveassist.web.app/emi-tracker

### 1. Overview Tab ✓
- [ ] Pie chart displays provider distribution
- [ ] Shows active/completed EMI counts
- [ ] Displays total monthly payment
- [ ] Shows insights cards
- [ ] No console errors

### 2. Monthly Trends Tab ✓
- [ ] Chart displays properly
- [ ] Shows income vs spending vs EMI
- [ ] Displays savings rate
- [ ] Trend lines visible

### 3. Add Manual EMI ✓
- [ ] Click "Add Manual EMI" button
- [ ] Fill form fields
- [ ] Submit successfully
- [ ] New EMI appears in list

### 4. Active EMIs Tab ✓
- [ ] Lists all active EMIs
- [ ] Shows EMI details (provider, amount, tenure)
- [ ] Action buttons work (Edit, Delete)

### 5. Loans Given Tab ✓
- [ ] Shows loans given to others
- [ ] Displays borrower name, amount, interest
- [ ] Can add repayment

### 6. Personal Loans Tab ✓
- [ ] Shows loans taken
- [ ] Displays lender, amount, interest
- [ ] Can mark as repaid

## Browser Console Test

Open DevTools Console (F12) and verify:

```javascript
// Check API URL
console.log('Expected:', 'https://asia-south1-finserveassist.cloudfunctions.net/api');

// Test API connectivity
fetch('https://asia-south1-finserveassist.cloudfunctions.net/api/health')
  .then(r => r.json())
  .then(d => console.log('Health check:', d));
```

Expected output:
```json
{
  "status": "ok",
  "timestamp": "2025-11-20T...",
  "service": "Financial Analyzer API",
  "version": "1.0.0",
  "firestore": "connected"
}
```

## API Endpoint Tests

### Test /emi/charts (THE FIX)

```javascript
// Must be logged in first
fetch('https://asia-south1-finserveassist.cloudfunctions.net/api/emi/charts', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())
.then(d => {
  console.log('Charts data:', d);
  console.log('providerDistribution.data:', d.data.providerDistribution.data);
  console.log('Is array?', Array.isArray(d.data.providerDistribution.data));
});
```

Expected structure:
```json
{
  "success": true,
  "data": {
    "providerDistribution": {
      "data": [
        { "provider": "HDFC", "amount": 3, "name": "HDFC" },
        { "provider": "ICICI", "amount": 2, "name": "ICICI" }
      ],
      "total": 5
    },
    "merchantDistribution": [...],
    "statusDistribution": {...},
    "interestRateDistribution": {...},
    "principalVsInterest": {...}
  }
}
```

### Test /emi/overview

```javascript
fetch('https://asia-south1-finserveassist.cloudfunctions.net/api/emi/overview', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())
.then(d => console.log('Overview:', d));
```

### Test /emi/monthly-trends

```javascript
fetch('https://asia-south1-finserveassist.cloudfunctions.net/api/emi/monthly-trends?months=6', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())
.then(d => {
  console.log('Monthly trends:', d);
  console.log('Is array?', Array.isArray(d.data.monthlyTrends));
});
```

## Common Issues & Solutions

### Issue: "No distribution data available"
**Cause:** No EMIs in database  
**Solution:** Add at least one EMI using "Add Manual EMI"

### Issue: Console error "n.map is not a function"
**Cause:** Data format mismatch or missing array validation  
**Solution:** ✅ FIXED in latest deployment

### Issue: API returns 401 Unauthorized
**Cause:** Token expired or not logged in  
**Solution:** Logout and login again

### Issue: Charts not rendering
**Cause:** Empty data or wrong data format  
**Solution:** ✅ FIXED - providerDistribution now returns proper array format

## Performance Benchmarks

Expected load times:
- Dashboard: < 1 second
- EMI Overview: < 1.5 seconds
- Monthly Trends: < 2 seconds

Network requests:
- /emi/overview: ~200-500ms
- /emi/charts: ~200-500ms
- /emi/monthly-trends: ~300-800ms

## Deployment Verification

```bash
# Check Firebase Functions logs
firebase functions:log --only api

# Check hosting deployment
firebase hosting:channel:list

# Verify function URL
curl https://asia-south1-finserveassist.cloudfunctions.net/api/health
```

## Manual Test Scenario

1. **Login** to https://finserveassist.web.app
2. **Navigate** to EMI Tracker
3. **Click** "Add Manual EMI"
4. **Fill** the form:
   - Card Provider: HDFC
   - Product: iPhone 15
   - Principal: ₹80,000
   - EMI Amount: ₹7,500
   - Tenure: 12 months
   - Interest Rate: 15%
5. **Submit** and verify:
   - EMI appears in Active EMIs tab
   - Overview pie chart updates
   - Monthly trends show the EMI payment

## Expected Console Logs (Clean)

After fix, you should see:
```
[runtime] API_URL = https://asia-south1-finserveassist.cloudfunctions.net/api
✓ Loaded 3 EMIs
✓ Charts data loaded
✓ Monthly trends loaded
```

No errors should appear!

## Test Complete ✅

If all tests pass:
- ✅ Backend properly deployed
- ✅ Frontend consuming correct APIs
- ✅ Data format issues resolved
- ✅ EMI functionality fully operational in cloud
