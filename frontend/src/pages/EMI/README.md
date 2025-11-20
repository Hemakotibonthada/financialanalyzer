# EMI Tracker Modular Structure

## Overview
The EMITracker has been refactored from a monolithic 5,235-line file into a modular, maintainable structure.

## Directory Structure

```
/frontend/src/pages/EMI/
├── index.js              # Main export file
├── constants.js          # API URL, colors, styles
├── utils.js              # Utility functions (formatCurrency, formatDate, etc.)
├── apiHandlers.js        # All API calls centralized (290+ lines)
├── useEMITracker.js      # Main EMI tracker hook (200+ lines)
├── useManualEMI.js       # Manual EMI management hook
├── useLoansGiven.js      # Loans given management hook
├── usePersonalLoans.js   # Personal loans management hook
└── README.md             # This file
```

## File Descriptions

### `constants.js`
- API_URL configuration
- Color palette for charts
- Chart card hover effects styling

### `utils.js`
- `formatCurrency()` - Format amounts in INR
- `formatDate()` - Format dates
- `getOrdinalSuffix()` - Get ordinal suffixes (1st, 2nd, etc.)
- `estimateEndDate()` - Calculate EMI end date
- `getSeverityColor()` - Get color for severity levels
- `getDisplayedMonths()` - Filter upcoming payments by months

### `apiHandlers.js`
Centralized API calls for:
- **Core EMI**: fetchUserProfile, fetchAllData, fetchMonthlyTrends, syncStatements, exportReport
- **Manual EMI**: createManualEMI, deleteEMI, markPaymentAsPaid
- **Loans Given**: fetchLoansGiven, saveLoanGiven, addRepayment, deleteLoanGiven, writeOffLoan
- **Personal Loans**: fetchPersonalLoans, savePersonalLoan, addPersonalLoanRepayment, markPersonalLoanRepaid, deletePersonalLoan

### `useEMITracker.js`
Main hook managing:
- Core EMI state (overview, upcoming payments, charts, insights)
- Monthly trends
- Export functionality
- Sync functionality
- Loading and error states
- Dialog states

### `useManualEMI.js`
Hook for manual EMI creation:
- Form state management
- Validation logic
- Create/Update operations
- Dialog management

### `useLoansGiven.js`
Hook for loans given to others:
- Loans list and summary
- Add/Edit/Delete operations
- Repayment tracking
- Write-off functionality

### `usePersonalLoans.js`
Hook for personal loans (taken from others):
- Loans list and summary
- Add/Edit/Delete operations
- Repayment tracking
- Mark as repaid functionality

## Usage

### Import in EMITracker.jsx
```javascript
import {
  useEMITracker,
  useManualEMI,
  useLoansGiven,
  usePersonalLoans,
  formatCurrency,
  formatDate,
  COLORS
} from './EMI';
```

### Using the Main Hook
```javascript
const {
  loading,
  error,
  overview,
  chartData,
  loadAllData,
  handleSync,
  handleExport
} = useEMITracker();
```

### Using Manual EMI Hook
```javascript
const {
  manualEMIDialogOpen,
  manualEMIData,
  handleOpen,
  handleCreate
} = useManualEMI(loadAllData);
```

## Benefits

1. **Maintainability**: Each file has a single responsibility
2. **Reusability**: Hooks can be used across components
3. **Testability**: Each module can be tested independently
4. **Performance**: Easier to implement code splitting
5. **Developer Experience**: Smaller, focused files are easier to navigate

## Migration Path

The original EMITracker.jsx (5,235 lines) is preserved. The new structure allows for:
1. Gradual migration of UI components
2. Testing individual modules
3. Progressive replacement of functionality
4. Zero breaking changes during transition

## Next Steps

1. Create individual UI component files for each tab
2. Create dialog components
3. Integrate modular structure with main EMITracker
4. Test thoroughly
5. Remove old monolithic file

## File Size Comparison

| Component | Lines |
|-----------|-------|
| Original EMITracker.jsx | 5,235 |
| **New Structure** | |
| constants.js | 35 |
| utils.js | 55 |
| apiHandlers.js | 290 |
| useEMITracker.js | 200 |
| useManualEMI.js | 140 |
| useLoansGiven.js | 140 |
| usePersonalLoans.js | 140 |
| **Total** | **~1,000** (distributed) |

The main EMITracker.jsx component will be dramatically reduced to ~200-300 lines focusing only on UI layout.
