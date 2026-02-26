# New Features API Reference

This document describes the newly implemented API endpoints for Investment Portfolio, Financial Goals, and Net Worth tracking features.

## Table of Contents

1. [Investment Portfolio APIs](#investment-portfolio-apis)
2. [Financial Goals APIs](#financial-goals-apis)
3. [Net Worth Tracking APIs](#net-worth-tracking-apis)

---

## Investment Portfolio APIs

Base URL: `/api/investments`

### 1. Create Investment

**POST** `/api/investments`

Add a new investment to your portfolio.

**Request Body:**
```json
{
  "type": "mutual_fund",
  "name": "HDFC Mid-Cap Opportunities Fund",
  "symbol": "HDFCMIDCAP",
  "quantity": 100,
  "purchasePrice": 150.50,
  "currentPrice": 165.75,
  "purchaseDate": "2024-01-15",
  "category": "equity",
  "riskLevel": "high",
  "maturityDate": null,
  "sipAmount": 5000,
  "sipFrequency": "monthly",
  "sipStartDate": "2024-01-15",
  "notes": "Long-term wealth creation"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Investment created successfully",
  "data": { /* Investment object */ }
}
```

---

### 2. Get All Investments

**GET** `/api/investments?type=mutual_fund&status=active&sortBy=currentValue&order=desc`

Retrieve all investments with optional filters.

**Query Parameters:**
- `type`: Investment type (stock, mutual_fund, fd, crypto, etc.)
- `status`: active, matured, sold
- `sortBy`: purchaseDate, currentValue, returnPercentage
- `order`: asc, desc

**Response:**
```json
{
  "success": true,
  "count": 15,
  "data": [ /* Array of investments */ ]
}
```

---

### 3. Get Portfolio Summary

**GET** `/api/investments/portfolio`

Get comprehensive portfolio summary with aggregated metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalInvested": 500000,
    "currentValue": 587500,
    "absoluteReturn": 87500,
    "returnPercentage": 17.5,
    "totalDividends": 12500,
    "dayChange": 2500,
    "dayChangePercent": 0.43,
    "byType": {
      "stocks": { /* Aggregated stats */ },
      "mutual_fund": { /* Aggregated stats */ }
    },
    "byRisk": {
      "high": { /* Aggregated stats */ },
      "medium": { /* Aggregated stats */ }
    },
    "topPerformers": [ /* Top 5 investments */ ],
    "worstPerformers": [ /* Bottom 5 investments */ ]
  }
}
```

---

### 4. Get Performance Metrics

**GET** `/api/investments/performance`

Get detailed performance metrics broken down by investment type.

**Response:**
```json
{
  "success": true,
  "data": {
    "stocks": {
      "count": 5,
      "totalInvested": 200000,
      "currentValue": 235000,
      "returnPercentage": 17.5,
      "xirr": 18.2,
      "cagr": 17.8
    },
    "mutual_fund": { /* Similar structure */ }
  }
}
```

---

### 5. Get Upcoming Maturities

**GET** `/api/investments/maturities?days=30`

Get investments maturing within the specified number of days.

**Query Parameters:**
- `days`: Number of days to look ahead (default: 30)

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "name": "HDFC Fixed Deposit",
      "type": "fd",
      "maturityDate": "2024-03-15",
      "maturityAmount": 115000,
      "daysUntilMaturity": 15
    }
  ]
}
```

---

### 6. Get Single Investment

**GET** `/api/investments/:id`

Get detailed information about a specific investment.

**Response:**
```json
{
  "success": true,
  "data": { /* Complete investment object */ }
}
```

---

### 7. Update Investment

**PUT** `/api/investments/:id`

Update investment details.

**Request Body:**
```json
{
  "quantity": 150,
  "currentPrice": 175.50,
  "notes": "Added more units"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Investment updated successfully",
  "data": { /* Updated investment object */ }
}
```

---

### 8. Delete Investment

**DELETE** `/api/investments/:id`

Delete an investment from portfolio.

**Response:**
```json
{
  "success": true,
  "message": "Investment deleted successfully"
}
```

---

### 9. Record Transaction

**POST** `/api/investments/:id/transaction`

Record a buy, sell, dividend, or other transaction.

**Request Body:**
```json
{
  "type": "buy",
  "quantity": 50,
  "price": 170,
  "date": "2024-02-15",
  "amount": 8500,
  "notes": "Additional purchase"
}
```

**Transaction Types:**
- `buy`: Purchase more units
- `sell`: Sell units
- `dividend`: Dividend received
- `bonus`: Bonus shares
- `split`: Stock split
- `merger`: Merger transaction

**Response:**
```json
{
  "success": true,
  "message": "Transaction recorded successfully",
  "data": { /* Updated investment with transaction */ }
}
```

---

### 10. Update Current Price

**PUT** `/api/investments/:id/price`

Update current price and recalculate returns.

**Request Body:**
```json
{
  "currentPrice": 180.25
}
```

**Response:**
```json
{
  "success": true,
  "message": "Price updated successfully",
  "data": { /* Updated investment */ }
}
```

---

### 11. Sync Prices from APIs

**POST** `/api/investments/sync-prices`

Sync current prices from external APIs (Alpha Vantage, Yahoo Finance, CoinGecko).

**Response:**
```json
{
  "success": true,
  "message": "Prices synced successfully",
  "updated": 15,
  "failed": 0
}
```

---

### 12. Get Asset Allocation

**GET** `/api/investments/analytics/allocation`

Get detailed asset allocation breakdown.

**Response:**
```json
{
  "success": true,
  "data": {
    "byType": {
      "stocks": { "value": 235000, "percentage": 40 },
      "mutual_fund": { "value": 200000, "percentage": 34 }
    },
    "byRisk": {
      "high": { "value": 350000, "percentage": 59.6 },
      "medium": { "value": 200000, "percentage": 34 }
    },
    "byCategory": {
      "equity": { "value": 435000, "percentage": 74 },
      "debt": { "value": 100000, "percentage": 17 }
    }
  }
}
```

---

## Financial Goals APIs

Base URL: `/api/goals`

### 1. Create Goal

**POST** `/api/goals`

Create a new financial goal.

**Request Body:**
```json
{
  "name": "Emergency Fund",
  "description": "6 months of expenses",
  "category": "emergency_fund",
  "targetAmount": 300000,
  "currentAmount": 50000,
  "targetDate": "2025-12-31",
  "priority": "high",
  "savingsStrategy": "monthly",
  "monthlySavingsTarget": 15000,
  "linkedAccounts": ["bank_account_123"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Goal created successfully",
  "data": { /* Goal object */ }
}
```

---

### 2. Get All Goals

**GET** `/api/goals?status=active&category=retirement&priority=high`

Retrieve all goals with optional filters.

**Query Parameters:**
- `status`: active, completed, paused, cancelled
- `category`: retirement, emergency_fund, home_purchase, etc.
- `priority`: low, medium, high, critical

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [ /* Array of goals */ ]
}
```

---

### 3. Get Goals Summary

**GET** `/api/goals/summary`

Get aggregated goals summary.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTargetAmount": 5000000,
    "totalCurrentAmount": 1500000,
    "totalShortfall": 3500000,
    "averageProgress": 30,
    "totalMonthlySavingsRequired": 75000,
    "goalsByPriority": {
      "high": 3,
      "medium": 2
    },
    "byCategory": {
      "retirement": { /* Category stats */ },
      "emergency_fund": { /* Category stats */ }
    }
  }
}
```

---

### 4. Get Upcoming Goals

**GET** `/api/goals/upcoming?months=12`

Get goals with target dates approaching.

**Query Parameters:**
- `months`: Number of months to look ahead (default: 12)

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "name": "Vacation Fund",
      "targetAmount": 150000,
      "currentAmount": 120000,
      "targetDate": "2024-06-30",
      "daysRemaining": 60,
      "shortfall": 30000
    }
  ]
}
```

---

### 5. Get Single Goal

**GET** `/api/goals/:id`

Get detailed information about a specific goal.

**Response:**
```json
{
  "success": true,
  "data": { /* Complete goal object with milestones */ }
}
```

---

### 6. Update Goal

**PUT** `/api/goals/:id`

Update goal details.

**Request Body:**
```json
{
  "targetAmount": 350000,
  "monthlySavingsTarget": 18000,
  "priority": "critical"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Goal updated successfully",
  "data": { /* Updated goal */ }
}
```

---

### 7. Delete Goal

**DELETE** `/api/goals/:id`

Delete a goal.

**Response:**
```json
{
  "success": true,
  "message": "Goal deleted successfully"
}
```

---

### 8. Add Contribution

**POST** `/api/goals/:id/contribute`

Add a contribution to a goal.

**Request Body:**
```json
{
  "amount": 15000,
  "source": "Salary",
  "notes": "February contribution"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Contribution added successfully",
  "data": { /* Updated goal with new contribution */ }
}
```

---

### 9. Add Milestone

**POST** `/api/goals/:id/milestone`

Add a milestone to track progress.

**Request Body:**
```json
{
  "name": "25% Complete",
  "amount": 75000,
  "date": "2024-06-30"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Milestone added successfully",
  "data": { /* Updated goal with new milestone */ }
}
```

---

### 10. Project Completion

**POST** `/api/goals/:id/project`

Calculate projected completion date based on current savings rate.

**Response:**
```json
{
  "success": true,
  "data": {
    "projectedCompletionDate": "2025-08-15",
    "monthsRemaining": 18,
    "onTrack": true,
    "averageMonthlySavings": 15000
  }
}
```

---

## Net Worth Tracking APIs

Base URL: `/api/networth`

### 1. Create Manual Snapshot

**POST** `/api/networth/snapshot`

Create a manual net worth snapshot.

**Request Body:**
```json
{
  "period": "monthly",
  "assets": {
    "cash": 50000,
    "bankSavings": 200000,
    "stocks": 300000,
    "mutualFunds": 250000,
    "fixedDeposits": 150000,
    "ppf": 100000,
    "primaryHome": 5000000,
    "vehicles": 800000
  },
  "liabilities": {
    "homeLoan": 3500000,
    "carLoan": 400000,
    "creditCardDues": 25000
  },
  "notes": "End of month snapshot"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Net worth snapshot created successfully",
  "data": { /* Snapshot with calculated totals and metrics */ }
}
```

---

### 2. Auto-Generate Snapshot

**POST** `/api/networth/auto-generate`

Automatically generate snapshot from current investments and loans.

**Request Body:**
```json
{
  "period": "monthly"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Net worth snapshot auto-generated successfully",
  "data": { /* Auto-generated snapshot */ }
}
```

---

### 3. Get Latest Snapshot

**GET** `/api/networth/latest`

Get the most recent net worth snapshot.

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2024-02-29",
    "netWorth": 3250000,
    "assets": { /* All asset categories */ },
    "liabilities": { /* All liability categories */ },
    "metrics": {
      "debtToAssetRatio": 0.52,
      "liquidityRatio": 0.15
    },
    "assetAllocation": {
      "liquidAssets": 15,
      "investments": 25,
      "realEstate": 55,
      "otherAssets": 5
    }
  }
}
```

---

### 4. Get Historical Snapshots

**GET** `/api/networth/history?months=12&period=monthly`

Get historical snapshots.

**Query Parameters:**
- `months`: Number of months to retrieve (default: 12)
- `period`: Filter by period type (daily, weekly, monthly, quarterly, yearly)

**Response:**
```json
{
  "success": true,
  "count": 12,
  "data": [ /* Array of snapshots */ ]
}
```

---

### 5. Get Net Worth Trend

**GET** `/api/networth/trend?period=monthly&count=12`

Get trend analysis with growth calculations.

**Query Parameters:**
- `period`: Aggregation period (monthly, quarterly, yearly)
- `count`: Number of periods to retrieve (default: 12)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "period": "2024-02",
      "netWorth": 3250000,
      "assets": 6850000,
      "liabilities": 3600000,
      "growth": 125000,
      "growthPercent": 4.0
    }
  ]
}
```

---

### 6. Get Period Comparison

**GET** `/api/networth/comparison`

Compare current net worth with previous periods.

**Response:**
```json
{
  "success": true,
  "data": {
    "current": {
      "netWorth": 3250000,
      "totalAssets": 6850000,
      "totalLiabilities": 3600000,
      "date": "2024-02-29"
    },
    "monthAgo": {
      "netWorth": 3125000,
      "change": {
        "netWorth": 125000,
        "netWorthPercent": 4.0,
        "assets": 100000,
        "liabilities": -25000
      }
    },
    "yearAgo": {
      "netWorth": 2800000,
      "change": {
        "netWorth": 450000,
        "netWorthPercent": 16.07,
        "assets": 500000,
        "liabilities": 50000
      }
    }
  }
}
```

---

### 7. Get Net Worth Projections

**GET** `/api/networth/projections?months=12`

Get future net worth projections based on historical growth.

**Query Parameters:**
- `months`: Number of months to project (default: 12)

**Response:**
```json
{
  "success": true,
  "data": {
    "currentNetWorth": 3250000,
    "avgMonthlyGrowthRate": 3.5,
    "projections": [
      {
        "month": 1,
        "date": "2024-03-31",
        "projectedNetWorth": 3363750,
        "growthRate": 3.5
      }
    ]
  }
}
```

---

### 8. Get Single Snapshot

**GET** `/api/networth/:id`

Get specific snapshot details.

**Response:**
```json
{
  "success": true,
  "data": { /* Complete snapshot object */ }
}
```

---

### 9. Update Snapshot

**PUT** `/api/networth/:id`

Update a snapshot.

**Request Body:**
```json
{
  "assets": {
    "bankSavings": 225000
  },
  "notes": "Corrected bank balance"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Snapshot updated successfully",
  "data": { /* Updated snapshot */ }
}
```

---

### 10. Delete Snapshot

**DELETE** `/api/networth/:id`

Delete a snapshot.

**Response:**
```json
{
  "success": true,
  "message": "Snapshot deleted successfully"
}
```

---

## Authentication

All endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `500`: Server Error

---

**Version:** 1.0.0  
**Last Updated:** February 2024
