# EMI Tracker Refactoring Guide

## Overview
The original EMITracker.jsx file (5235 lines) has been refactored into a modular structure with the following organization:

## New Folder Structure
```
frontend/src/pages/
├── EMITracker.jsx (OLD - 5235 lines)
├── EMITracker_NEW.jsx (NEW - ~300 lines) 
└── EMI/
    ├── components/
    │   └── StatCard.jsx - Reusable stat card component
    ├── dialogs/
    │   ├── ManualEMIDialog.jsx - Manual EMI entry form
    │   ├── SyncDialog.jsx - Gmail sync dialog
    │   └── ExportDialog.jsx - Export report dialog
    ├── tabs/
    │   ├── OverviewTab.jsx - Overview with charts
    │   ├── MonthlyTrendsTab.jsx - Monthly trends
    │   ├── ReportsTab.jsx - Detailed reports
    │   ├── UpcomingPaymentsTab.jsx - Upcoming payments
    │   ├── ActiveEMIsTab.jsx - Active EMIs list
    │   ├── CompletedEMIsTab.jsx - Completed EMIs
    │   ├── LoansGivenTab.jsx - Loans given to others
    │   └── PersonalLoansTab.jsx - Personal loans taken
    ├── hooks/
    │   ├── index.js - Exports all hooks
    │   ├── useEMIData.js - Main EMI data management
    │   ├── useMonthlyTrends.js - Monthly trends data
    │   ├── useLoansGiven.js - Loans given management
    │   └── usePersonalLoans.js - Personal loans management
    └── utils/
        ├── constants.js - Colors, options, configurations
        └── formatters.js - Currency, date, and data formatters
```

## What Was Extracted

### 1. Constants & Utilities ✅
- **constants.js**: COLORS, CARD_PROVIDERS, PURCHASE_CATEGORIES, RELATIONSHIPS, etc.
- **formatters.js**: formatCurrency(), formatDate(), getOrdinalSuffix(), etc.

### 2. Custom Hooks ✅
- **useEMIData**: Manages overview, upcoming payments, charts, insights
- **useMonthlyTrends**: Handles monthly trends data
- **useLoansGiven**: Manages loans given to friends/family
- **usePersonalLoans**: Manages personal loans taken

### 3. Components ✅
- **StatCard.jsx**: Reusable animated stat card component

### 4. Dialogs (Stubs Created) 🔄
- ManualEMIDialog, SyncDialog, ExportDialog
- **TODO**: Copy actual dialog JSX from original file

### 5. Tab Components (Stubs Created) 🔄
- 8 tab components created as stubs
- **TODO**: Copy actual tab content from original file

## Next Steps to Complete Refactoring

### Step 1: Complete Dialog Components
For each dialog in `dialogs/` folder:
1. Open original EMITracker.jsx
2. Find the Dialog component (search for "Dialog open={dialogName}")
3. Copy all JSX from `<Dialog>` to `</Dialog>`
4. Copy related useState hooks and handler functions
5. Pass data via props from main component

Example for ManualEMIDialog:
```jsx
// Copy from original lines ~4500-5200
- Manual EMI form state
- handleManualEMIChange
- validateManualEMI
- handleCreateManualEMI
```

### Step 2: Complete Tab Components
For each tab in `tabs/` folder:
1. Find tab content in original file (search for "activeTab === X")
2. Copy JSX content
3. Extract any tab-specific functions
4. Import required components (Cards, Tables, Charts)

### Step 3: Migrate Chart Components
Create separate chart components in `components/`:
- EMIPieChart.jsx
- EMIBarChart.jsx  
- EMILineChart.jsx
- EMIRadarChart.jsx
- etc.

### Step 4: Migrate Card Components
Create specialized card components:
- EMICard.jsx - For displaying individual EMI
- LoanGivenCard.jsx - For loans given
- PersonalLoanCard.jsx - For personal loans

### Step 5: Update Original File
Once all components are ready:
1. Backup original: `cp EMITracker.jsx EMITracker.BACKUP.jsx`
2. Copy NEW version: `cp EMITracker_NEW.jsx EMITracker.jsx`
3. Test thoroughly
4. Delete backup if working

## Benefits of Refactoring

1. **Maintainability**: Each component has single responsibility
2. **Reusability**: Hooks and components can be reused
3. **Testability**: Smaller units easier to test
4. **Performance**: Potential for better code splitting
5. **Collaboration**: Multiple developers can work on different tabs

## File Size Comparison

| File | Lines | Purpose |
|------|-------|---------|
| EMITracker.jsx (OLD) | 5235 | Monolithic component |
| EMITracker.jsx (NEW) | ~300 | Main orchestrator |
| hooks/useEMIData.js | ~90 | Data management |
| hooks/useMonthlyTrends.js | ~45 | Trends data |
| hooks/useLoansGiven.js | ~120 | Loans given logic |
| hooks/usePersonalLoans.js | ~130 | Personal loans logic |
| utils/constants.js | ~70 | Constants |
| utils/formatters.js | ~55 | Utilities |
| components/StatCard.jsx | ~80 | Stat display |
| **Total (excluding tabs/dialogs)** | **~890** | **Core functionality** |

## Migration Checklist

- [x] Create folder structure
- [x] Extract constants and utilities
- [x] Create custom hooks
- [x] Create StatCard component
- [ ] Complete ManualEMIDialog
- [ ] Complete SyncDialog  
- [ ] Complete ExportDialog
- [ ] Complete OverviewTab
- [ ] Complete MonthlyTrendsTab
- [ ] Complete ReportsTab
- [ ] Complete UpcomingPaymentsTab
- [ ] Complete ActiveEMIsTab
- [ ] Complete CompletedEMIsTab
- [ ] Complete LoansGivenTab
- [ ] Complete PersonalLoansTab
- [ ] Create chart components
- [ ] Create EMI/Loan card components
- [ ] Test all functionality
- [ ] Replace original file

## Testing Strategy

1. Test each hook independently
2. Test each dialog component
3. Test each tab component
4. Integration test with full flow
5. Compare with original functionality

## Notes

- All existing functionality preserved
- No breaking changes to API calls
- State management simplified with custom hooks
- Components follow React best practices
- TypeScript can be added later for type safety
