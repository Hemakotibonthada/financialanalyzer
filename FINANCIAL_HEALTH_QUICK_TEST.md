# Financial Health Dashboard - Quick Test Guide

## Prerequisites

✅ Backend services running (`node backend/server.js`)  
✅ Frontend running (`npm start` in frontend/)  
✅ User account created and logged in  
✅ Some transaction data available

## Quick Test (5 minutes)

### Step 1: Access Dashboard
1. Login to application
2. Click **"Financial Health"** in sidebar (Activity icon)
3. Or navigate to: `http://localhost:3000/financial-health`

**Expected:** 
- Loading spinner briefly
- Dashboard loads with gradient header
- Overall score displayed (0-100)
- Grade badge shown (A+ to F)

### Step 2: Verify Overview Tab
1. Check quick stats (4 cards):
   - Savings Rate
   - Debt-to-Income
   - Budget Compliance
   - Net Worth

2. Scroll to Strengths section:
   - Green cards with checkmarks
   - Scores displayed

3. Scroll to Weaknesses section:
   - Orange cards with alerts
   - Recommendations shown

**Expected:** All sections render with data or empty states

### Step 3: Test Scores Tab
1. Click **"Scores"** tab
2. View radar chart:
   - 8 axes visible
   - Blue filled area
   - Interactive tooltips

3. Scroll down to individual score cards:
   - 8 cards total
   - Each shows score, status, progress bar
   - Color-coded by status

**Expected:** Chart renders, cards display scores

### Step 4: Test Spending Tab
1. Click **"Spending"** tab
2. Check summary cards (3 cards)
3. View pie chart:
   - Top 5 categories
   - Legend on right
   - Colors distinct

4. Scroll to spending patterns:
   - Recurring transactions listed
   - Impulse purchases counted

**Expected:** Charts load, data displays correctly

### Step 5: Test Recommendations Tab
1. Click **"Recommendations"** tab
2. Verify recommendations list:
   - Priority badges (High/Medium/Low)
   - Action descriptions
   - Potential savings shown

3. Scroll to projections:
   - 3 gradient cards (3M, 6M, 1Y)
   - Score projections shown
   - Change indicators displayed

**Expected:** Recommendations sorted by priority, projections calculated

## API Testing

### Test Financial Health API
```bash
# Windows PowerShell
$headers = @{"Authorization"="Bearer YOUR_TOKEN"}
Invoke-WebRequest -Uri "http://localhost:5000/api/insights/financial-health" -Headers $headers
```

**Expected Response:**
```json
{
  "overallScore": 75,
  "grade": {
    "grade": "B",
    "description": "Good financial health"
  },
  "riskLevel": {
    "level": "medium",
    "description": "Some areas need attention"
  },
  "scores": {
    "savings": { "score": 80, "status": "good", "message": "..." },
    ...
  },
  "strengths": [...],
  "weaknesses": [...],
  "recommendations": [...],
  "projections": {...}
}
```

### Test Spending Behavior API
```bash
Invoke-WebRequest -Uri "http://localhost:5000/api/insights/spending-behavior" -Headers $headers
```

**Expected Response:**
```json
{
  "summary": {
    "totalExpense": 50000,
    "totalIncome": 80000,
    "netSavings": 30000,
    "savingsRate": 37.5
  },
  "categories": {...},
  "patterns": {...},
  "insights": [...],
  "recommendations": [...]
}
```

## Visual Verification Checklist

### Overall Score Card
- [ ] Gradient background (indigo to purple)
- [ ] Large score number (6xl font)
- [ ] Grade letter displayed
- [ ] Description text visible
- [ ] Risk level badge (green/yellow/red)
- [ ] Risk description shown

### Quick Stats Cards
- [ ] 4 cards in grid (responsive)
- [ ] Icons colored correctly
- [ ] Values formatted (percentages, currency)
- [ ] Change indicators with arrows
- [ ] All colors distinct

### Strengths/Weaknesses
- [ ] Strengths: green background
- [ ] Weaknesses: orange background
- [ ] Scores aligned right
- [ ] Icons appropriate
- [ ] Recommendations clear

### Radar Chart
- [ ] 8 axes labeled
- [ ] Blue fill with transparency
- [ ] Points connected
- [ ] Scale 0-100
- [ ] Grid lines visible

### Score Cards (Individual)
- [ ] Border-left colored (indigo)
- [ ] Score large and bold
- [ ] Status badge colored correctly
- [ ] Progress bar accurate
- [ ] Message descriptive

### Pie Chart
- [ ] 5 distinct colors
- [ ] Legend readable
- [ ] Labels clear
- [ ] Percentages shown on hover

### Recommendations
- [ ] Priority badges colored
- [ ] Icons appropriate (Zap icon)
- [ ] Action boxes distinct
- [ ] Savings highlighted (green)
- [ ] Border-left accent (indigo)

### Projections
- [ ] Gradient cards (indigo to purple)
- [ ] White text readable
- [ ] Score large
- [ ] Change indicator with arrow
- [ ] 3 cards responsive

## Responsive Testing

### Desktop (> 1024px)
- [ ] 4-column grid for quick stats
- [ ] 2-column grid for score cards
- [ ] 3-column grid for projections
- [ ] Charts full width
- [ ] Sidebar expanded

### Tablet (768px - 1024px)
- [ ] 2-column grids
- [ ] Charts responsive
- [ ] Tabs scrollable
- [ ] Sidebar collapsible

### Mobile (< 768px)
- [ ] Single column layout
- [ ] Cards stack vertically
- [ ] Charts scale down
- [ ] Tabs scroll horizontally
- [ ] Sidebar toggleable

## Common Issues & Fixes

### Issue: Dashboard shows "No Data Available"
**Cause:** No transactions in database  
**Fix:** 
1. Add transactions via Analyzer
2. Or run: `node backend/create-test-data.js`

### Issue: Score shows 0 or NaN
**Cause:** Missing budget or income data  
**Fix:**
1. Set up budgets in Budget Tracker
2. Add income transactions
3. Refresh dashboard

### Issue: Charts not rendering
**Cause:** ChartJS not loaded properly  
**Fix:**
1. Check browser console for errors
2. Verify ChartJS imports in component
3. Run: `npm install chart.js react-chartjs-2`

### Issue: API returns 401 Unauthorized
**Cause:** Token expired or missing  
**Fix:**
1. Logout and login again
2. Check token in localStorage
3. Verify backend authentication middleware

### Issue: Loading spinner forever
**Cause:** API endpoint not responding  
**Fix:**
1. Check backend server running
2. Verify routes registered in server.js
3. Check MongoDB connection
4. Look at backend console logs

## Performance Testing

### Load Time Targets
- Initial load: < 2 seconds
- API response: < 500ms
- Chart render: < 300ms
- Tab switch: Instant

### Test Script
```javascript
// Run in browser console
console.time('DashboardLoad');
// Navigate to /financial-health
// Wait for complete load
console.timeEnd('DashboardLoad');
```

## Data Validation

### Check Score Calculations
1. Note overall score on dashboard
2. Calculate manually:
   ```
   Overall = (Savings × 0.20) + (Debt × 0.20) + 
             (Budget × 0.15) + (Investment × 0.15) +
             (Emergency × 0.10) + (CashFlow × 0.10) +
             (Credit × 0.05) + (Goals × 0.05)
   ```
3. Compare with displayed score (should match ±1)

### Verify Grade Assignment
- 90-100 = A+
- 80-89 = A
- 70-79 = B
- 60-69 = C
- 50-59 = D
- 0-49 = F

## Integration Testing

### Test with Other Features
1. **Add Transaction** → Check spending update
2. **Create Budget** → Check budget score change
3. **Add Investment** → Check investment score
4. **Pay off EMI** → Check debt score improvement
5. **Set Goal** → Check goal progress score

## Browser Compatibility

Test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Safari (latest, if Mac available)

## Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast sufficient (WCAG AA)
- [ ] Focus indicators visible
- [ ] Alt text on icons (via aria-label)

## Success Criteria

✅ Dashboard loads without errors  
✅ All 4 tabs render correctly  
✅ Charts display data accurately  
✅ Scores calculate properly  
✅ Recommendations show with priorities  
✅ Responsive on mobile/tablet  
✅ No console errors  
✅ Performance under 2 seconds  

## Test Scenarios

### Scenario 1: New User (No Data)
**Expected:** 
- "No Data Available" message
- Friendly prompt to add transactions
- No errors in console

### Scenario 2: User with Good Financial Health
**Expected:**
- Overall score 70-100
- Grade B or higher
- Multiple strengths shown
- Few or no weaknesses
- Low-priority recommendations

### Scenario 3: User with Poor Financial Health
**Expected:**
- Overall score < 60
- Grade D or F
- Few or no strengths
- Multiple weaknesses
- High-priority recommendations with urgency

### Scenario 4: User with Mixed Health
**Expected:**
- Overall score 50-70
- Grade C or D
- Balance of strengths and weaknesses
- Medium-priority recommendations
- Clear action items

## Reporting Issues

If you find bugs, report with:
1. Browser and version
2. Screen size
3. Steps to reproduce
4. Expected vs actual behavior
5. Console errors (if any)
6. Screenshots

**Report to:** GitHub Issues or Support Portal

## Next Steps After Testing

1. ✅ Verify all features work
2. 📝 Document any issues
3. 🎨 Check visual polish
4. 🚀 Prepare for production
5. 👥 Conduct user acceptance testing

## Pro Testing Tips

1. **Clear Cache:** Between tests to ensure fresh load
2. **Use Incognito:** To test without extensions
3. **Check Network Tab:** Monitor API calls
4. **Test with Real Data:** More accurate than test data
5. **Time Operations:** Ensure performance targets met

## Automated Testing (Future)

Consider adding:
- Jest unit tests for calculations
- Cypress E2E tests for user flows
- API integration tests
- Performance benchmarks
- Accessibility audits

## Conclusion

This Financial Health Dashboard is the centerpiece of your financial intelligence system. Thorough testing ensures users get accurate, actionable insights.

**Happy Testing! 🎉**

---

**Test Duration:** ~30 minutes for comprehensive test  
**Quick Test:** 5 minutes for smoke test  
**Last Updated:** May 2024
