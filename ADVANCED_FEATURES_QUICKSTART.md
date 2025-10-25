# 🚀 Quick Start Guide - Advanced Features

## Multi-Currency Support

### Quick Usage
```javascript
// Add expense with currency
POST /api/financial/quick-expense
{
  "description": "Coffee in NYC",
  "amount": 5.50,
  "category": "food",
  "currency": "USD"
}

// Get all supported currencies
GET /api/financial/currencies

// Convert amount
POST /api/financial/convert-currency
{
  "amount": 100,
  "from": "USD",
  "to": "INR"
}

// View expenses in different currency
GET /api/financial/expenses-in-currency/EUR
```

### Supported Currencies
- 🇺🇸 USD - US Dollar
- 🇪🇺 EUR - Euro
- 🇬🇧 GBP - British Pound
- 🇮🇳 INR - Indian Rupee (Default)
- 🇯🇵 JPY - Japanese Yen
- 🇦🇺 AUD - Australian Dollar
- 🇨🇦 CAD - Canadian Dollar
- 🇨🇳 CNY - Chinese Yuan
- 🇨🇭 CHF - Swiss Franc

---

## Advanced Analytics Dashboard

### Quick Access
1. **From Dashboard:** Click "Advanced Analytics" button (top right)
2. **Direct URL:** Navigate to `/advanced-analytics`

### API Endpoints

#### Get Everything at Once
```javascript
GET /api/analytics/advanced/complete-dashboard
// Returns: forecast, anomalies, heatmap, health score, savings opportunities
```

#### Individual Endpoints
```javascript
// 30-day spending forecast
GET /api/analytics/advanced/forecast?days=30

// Detect unusual transactions
GET /api/analytics/advanced/anomalies?days=30

// Spending patterns by day/hour
GET /api/analytics/advanced/heatmap?days=90

// Financial health score (0-100)
GET /api/analytics/advanced/health-score

// Find ways to save money
GET /api/analytics/advanced/savings-opportunities
```

---

## Financial Health Score

### Scoring Breakdown
| Factor | Max Points | Description |
|--------|-----------|-------------|
| Spending Control | 30 | Income vs expenses ratio |
| Budget Adherence | 20 | Following budget limits |
| Savings Progress | 20 | Achieving savings goals |
| Spending Consistency | 15 | Volatility of expenses |
| Emergency Fund | 15 | Months of expenses saved |
| **TOTAL** | **100** | |

### Rating Scale
- **80-100:** 🟢 Excellent - Keep it up!
- **65-79:** 🔵 Good - On the right track
- **50-64:** 🟡 Fair - Room for improvement
- **0-49:** 🔴 Poor - Needs attention

---

## Anomaly Detection

### How It Works
1. Analyzes last 30 days of transactions
2. Calculates average spending per category
3. Identifies transactions > 2 standard deviations from mean
4. Classifies severity:
   - **High:** > 3 standard deviations
   - **Medium:** > 2 standard deviations

### Example Output
```json
{
  "transaction": {
    "description": "Emergency medical",
    "amount": 15000,
    "category": "healthcare"
  },
  "anomalyType": "unusually_high",
  "severity": "high",
  "zScore": 3.5,
  "context": {
    "categoryAverage": 2000,
    "deviation": 13000,
    "percentageDifference": "650%"
  }
}
```

---

## Spending Forecast

### Algorithm
1. Analyzes last 90 days of transaction history
2. Calculates daily average and standard deviation
3. Applies multipliers:
   - **Weekend:** 1.2x spending
   - **Month start (1-5):** 1.3x spending
   - **Month end (25-31):** 0.9x spending
4. Generates confidence range (±1 std dev)

### Confidence Levels
- **High:** Standard deviation < 50% of average
- **Medium:** Standard deviation < 100% of average
- **Low:** Standard deviation > 100% of average

---

## Savings Opportunities

### Detection Methods

#### 1. High-Spending Categories
- Identifies top 3 spending categories
- Calculates 15% reduction potential
- Shows current spending and potential savings

#### 2. Recurring Small Expenses
- Finds transactions that repeat 5+ times
- Examples: Coffee, parking, subscriptions
- Calculates impact of reducing by 50%

### Example Opportunity
```json
{
  "type": "recurring_small_expense",
  "description": "starbucks coffee",
  "frequency": 20,
  "totalSpent": 4000,
  "avgAmount": 200,
  "potentialMonthlySavings": 2000,
  "suggestion": "You've spent ₹4,000 on starbucks coffee 20 times. Reducing this by half could save ₹2,000/month."
}
```

---

## Frontend Components

### AdvancedAnalytics.jsx
**Location:** `frontend/src/pages/AdvancedAnalytics.jsx`

**State Management:**
```javascript
const [activeTab, setActiveTab] = useState('forecast');
const [analyticsData, setAnalyticsData] = useState(null);
const [loading, setLoading] = useState(true);
```

**Tabs:**
1. **Forecast** - 30-day predictions with confidence ranges
2. **Anomalies** - Unusual transaction detection
3. **Heatmap** - Spending patterns visualization
4. **Health** - Factor breakdown + recommendations
5. **Savings** - Opportunity identification

---

## Integration Points

### Dashboard Navigation
```jsx
<Link to="/advanced-analytics" 
  className="flex items-center px-3 py-2 text-white bg-gradient-to-r from-blue-600 to-purple-600">
  <Sparkles className="w-5 h-5 mr-1" />
  Advanced Analytics
</Link>
```

### Quick Expense Entry
```jsx
<select value={expense.currency} 
  onChange={(e) => setExpense({ ...expense, currency: e.target.value })}>
  {currencies.map(curr => (
    <option key={curr.code} value={curr.code}>
      {curr.symbol} {curr.code}
    </option>
  ))}
</select>
```

---

## Testing Checklist

### Multi-Currency
- [ ] Currency dropdown shows all 9 currencies
- [ ] Expense saves with correct currency
- [ ] Currency symbol displays properly
- [ ] Conversion API returns accurate results
- [ ] Exchange rates auto-update (check logs after 24h)

### Advanced Analytics
- [ ] Dashboard loads without errors
- [ ] All 5 tabs render correctly
- [ ] Health score calculates accurately
- [ ] Forecast shows confidence ranges
- [ ] Anomalies detect unusual transactions
- [ ] Heatmap displays peak times
- [ ] Recommendations are relevant
- [ ] Savings opportunities identified
- [ ] Responsive on mobile devices

---

## Troubleshooting

### Analytics Not Loading
**Issue:** "Insufficient data for analysis"
**Solution:** Add at least 10 transactions for forecast, 5 for anomalies

### Currency Conversion Fails
**Issue:** Exchange rate API error
**Solution:** Check internet connection, API uses cached rates as fallback

### Health Score Low
**Issue:** Score below 50
**Solution:** Follow personalized recommendations in Health tab

### No Anomalies Detected
**Issue:** Empty anomaly list
**Solution:** This is good! Means spending is consistent

---

## Performance Tips

1. **Use Complete Dashboard Endpoint:** Fetches all data in one call
2. **Cache Exchange Rates:** Auto-refreshes every 24 hours
3. **Adjust Lookback Periods:** Shorter periods = faster response
4. **Pagination:** History tab limits displayed items

---

## Security Notes

- All endpoints require authentication
- JWT token must be in Authorization header
- User can only access their own data
- Exchange rate API uses free tier (no API key required)

---

## Support

For detailed documentation, see:
- **Full Implementation:** `ADVANCED_FEATURES_COMPLETE.md`
- **API Reference:** Backend route files
- **Component Details:** Frontend source files

---

**Built with ❤️ for comprehensive financial management**
