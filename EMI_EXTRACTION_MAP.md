# EMI Tracker Component Extraction Map

This document maps exactly where each piece of code should be moved from the original 5235-line EMITracker.jsx file.

## Line Number Reference Guide

### STATE VARIABLES (Lines 127-232)
These are now managed in custom hooks:

#### useEMIData hook (Lines 127-145)
```javascript
// Original lines moved to hooks/useEMIData.js
- loading, setLoading
- syncing, setSyncing  
- error, setError
- activeTab, setActiveTab (keep in main)
- overview, setOverview
- upcomingPayments, setUpcomingPayments
- chartData, setChartData
- insights, setInsights
- selectedPeriod, setSelectedPeriod
- animateCards, setAnimateCards
```

#### useMonthlyTrends hook (Lines 148-151)
```javascript
// Moved to hooks/useMonthlyTrends.js
- monthlyTrends, setMonthlyTrends
- trendsMonths, setTrendsMonths
- trendsLoading, setTrendsLoading
```

#### Manual EMI Dialog State (Lines 154-178)
```javascript
// Move to dialogs/ManualEMIDialog.jsx as internal state
- manualEMIDialogOpen, setManualEMIDialogOpen (keep in main)
- manualEMILoading, setManualEMILoading
- manualEMIData, setManualEMIData
- manualEMIErrors, setManualEMIErrors
```

#### Loans Given State (Lines 193-212)
```javascript
// Moved to hooks/useLoansGiven.js
- loansGiven, setLoansGiven
- loansGivenSummary, setLoansGivenSummary
- loansGivenLoading, setLoansGivenLoading
- loanGivenDialogOpen, setLoanGivenDialogOpen (keep in main)
- loanGivenFormData, setLoanGivenFormData
- repaymentDialogOpen, setRepaymentDialogOpen
- repaymentData, setRepaymentData
```

#### Personal Loans State (Lines 215-232)
```javascript
// Moved to hooks/usePersonalLoans.js
- personalLoans, setPersonalLoans
- personalLoansSummary, setPersonalLoansSummary
- personalLoansLoading, setPersonalLoansLoading
- personalLoanDialogOpen, setPersonalLoanDialogOpen (keep in main)
- personalLoanFormData, setPersonalLoanFormData
- personalLoanRepaymentDialogOpen, setPersonalLoanRepaymentDialogOpen
- personalLoanRepaymentData, setPersonalLoanRepaymentData
```

### FUNCTIONS TO EXTRACT

#### EMI Data Functions (Lines 259-318)
```javascript
// Lines 259-318: fetchAllData() → hooks/useEMIData.js
// Lines 320-349: fetchMonthlyTrends() → hooks/useMonthlyTrends.js
// Lines 351-383: handleExportMonthlyTrends() → tabs/MonthlyTrendsTab.jsx
```

#### Loans Given Functions (Lines 386-459)
```javascript
// Lines 386-415: fetchLoansGiven() → hooks/useLoansGiven.js
// Lines 418-450: handleSaveLoanGiven() → hooks/useLoansGiven.js  
// Lines 453-478: handleAddRepayment() → hooks/useLoansGiven.js
// Lines 481-497: handleDeleteLoanGiven() → hooks/useLoansGiven.js
// Lines 500-516: handleWriteOffLoan() → hooks/useLoansGiven.js
```

#### Personal Loans Functions (Lines 520-627)
```javascript
// Lines 520-544: fetchPersonalLoans() → hooks/usePersonalLoans.js
// Lines 547-579: handleSavePersonalLoan() → hooks/usePersonalLoans.js
// Lines 582-610: handleAddPersonalLoanRepayment() → hooks/usePersonalLoans.js
// Lines 613-627: handleMarkPersonalLoanRepaid() → hooks/usePersonalLoans.js
// Lines 630-645: handleDeletePersonalLoan() → hooks/usePersonalLoans.js
```

#### Export Report Function (Lines 648-693)
```javascript
// Lines 648-693: handleExportReport() → dialogs/ExportDialog.jsx
```

#### Sync Statements Function (Lines 695-727)
```javascript
// Lines 695-727: handleSyncStatements() → dialogs/SyncDialog.jsx
```

#### Manual EMI Functions (Lines 730-806)
```javascript
// Lines 730-736: handleOpenManualEMIDialog() → dialogs/ManualEMIDialog.jsx
// Lines 738-757: handleCloseManualEMIDialog() → dialogs/ManualEMIDialog.jsx
// Lines 759-768: handleManualEMIChange() → dialogs/ManualEMIDialog.jsx
// Lines 770-805: validateManualEMI() → dialogs/ManualEMIDialog.jsx
// Lines 808-837: handleCreateManualEMI() → dialogs/ManualEMIDialog.jsx
```

#### Delete EMI Function (Lines 840-879)
```javascript
// Lines 840-879: handleDeleteEMI() → tabs/ActiveEMIsTab.jsx
```

#### Mark as Paid Function (Lines 882-949)
```javascript
// Lines 882-949: handleMarkAsPaid() → tabs/UpcomingPaymentsTab.jsx or ActiveEMIsTab.jsx
```

### JSX SECTIONS TO EXTRACT

#### Overview Cards (Lines 1221-1406)
```javascript
// Lines 1221-1406: 4 StatCard components
// Already extracted to components/StatCard.jsx
// Just need to map data props in main file
```

#### Insights Section (Lines 1409-1451)
```javascript
// Lines 1409-1451: Smart Insights section
// Move to tabs/OverviewTab.jsx
```

#### Tab Content (Lines 1468-4997)
Extract each tab to its own file:

##### Tab 0: Overview (Lines 1992-2287)
```javascript
// Lines 1992-2287 → tabs/OverviewTab.jsx
// Includes: Pie chart, Radar chart, Monthly trends chart
```

##### Tab 1: Monthly Trends (Lines 2290-2648)
```javascript  
// Lines 2290-2648 → tabs/MonthlyTrendsTab.jsx
// Includes: Summary cards, controls, comprehensive chart, breakdown table
```

##### Tab 2: Reports (Lines 2651-3419)
```javascript
// Lines 2651-3419 → tabs/ReportsTab.jsx  
// Includes: All chart variations (Bar, Area, Composed, Scatter, etc.)
```

##### Tab 3: Upcoming Payments (Lines 3422-3583)
```javascript
// Lines 3422-3583 → tabs/UpcomingPaymentsTab.jsx
// Includes: Time period selector, monthly breakdown cards
```

##### Tab 4: Active EMIs (Lines 3586-3768)
```javascript
// Lines 3586-3768 → tabs/ActiveEMIsTab.jsx
// Includes: Active EMI cards with actions
```

##### Tab 5: Completed EMIs (Lines 3771-3912)
```javascript
// Lines 3771-3912 → tabs/CompletedEMIsTab.jsx
// Includes: Completed EMI cards
```

##### Tab 6: Loans Given (Lines 3915-4053)
```javascript
// Lines 3915-4053 → tabs/LoansGivenTab.jsx
// Includes: Summary cards, add button, loans grid
```

##### Tab 7: Personal Loans (Lines 4056-4244)
```javascript
// Lines 4056-4244 → tabs/PersonalLoansTab.jsx
// Includes: Summary cards, add button, personal loans grid
```

#### Dialog Components

##### Manual EMI Dialog (Lines 4349-4915)
```javascript
// Lines 4349-4915 → dialogs/ManualEMIDialog.jsx
// Massive dialog with form fields, summary card
```

##### Sync Dialog (Lines 4918-4973)
```javascript
// Lines 4918-4973 → dialogs/SyncDialog.jsx
// Simple dialog with Gmail connection check
```

##### EMI Detail Dialog (Lines 1272-1391)
```javascript
// Lines 1272-1391 → dialogs/EMIDetailDialog.jsx
// Full EMI information display
```

##### Delete Confirmation Dialog (Lines 4976-5033)
```javascript
// Lines 4976-5033 → dialogs/DeleteConfirmDialog.jsx  
// Delete EMI confirmation with details
```

##### Confirmation Dialog (Lines 1354-1403)
```javascript
// Lines 1354-1403 → dialogs/ConfirmationDialog.jsx
// Generic confirmation dialog
```

##### Export Report Dialog (Lines 5036-5141)
```javascript
// Lines 5036-5141 → dialogs/ExportDialog.jsx
// Export configuration and format selection
```

##### Add/Edit Loan Given Dialog (Lines 5144-5274)
```javascript
// Lines 5144-5274 → dialogs/LoanGivenDialog.jsx
// Form for adding/editing loans given
```

##### Add Repayment Dialog (Lines 5277-5352)
```javascript
// Lines 5277-5352 → dialogs/RepaymentDialog.jsx
// Add repayment to loan given
```

##### Personal Loan Dialog (Lines 5355-5452)
```javascript
// Lines 5355-5452 → dialogs/PersonalLoanDialog.jsx
// Add/edit personal loan form
```

##### Personal Loan Repayment Dialog (Lines 5455-5506)
```javascript
// Lines 5455-5506 → dialogs/PersonalLoanRepaymentDialog.jsx
// Add repayment to personal loan
```

## Quick Reference: Component Mapping

| Original Lines | Component File | Description |
|----------------|---------------|-------------|
| 1-126 | Main imports | Keep in main file |
| 127-232 | hooks/* | State management |
| 259-949 | hooks/*, tabs/* | Business logic |
| 1221-1406 | components/StatCard.jsx | Overview cards |
| 1409-1451 | tabs/OverviewTab.jsx | Insights |
| 1468-1502 | Main file | Tabs navigation |
| 1992-2287 | tabs/OverviewTab.jsx | Tab 0 content |
| 2290-2648 | tabs/MonthlyTrendsTab.jsx | Tab 1 content |
| 2651-3419 | tabs/ReportsTab.jsx | Tab 2 content |
| 3422-3583 | tabs/UpcomingPaymentsTab.jsx | Tab 3 content |
| 3586-3768 | tabs/ActiveEMIsTab.jsx | Tab 4 content |
| 3771-3912 | tabs/CompletedEMIsTab.jsx | Tab 5 content |
| 3915-4053 | tabs/LoansGivenTab.jsx | Tab 6 content |
| 4056-4244 | tabs/PersonalLoansTab.jsx | Tab 7 content |
| 4349-4915 | dialogs/ManualEMIDialog.jsx | Manual EMI form |
| 4918-4973 | dialogs/SyncDialog.jsx | Sync statements |
| 5036-5141 | dialogs/ExportDialog.jsx | Export report |
| Various | dialogs/* | Other dialogs |

## Extraction Priority

1. ✅ **DONE**: Folder structure, hooks, utilities, constants
2. **NEXT**: Extract dialogs (most reusable)
3. **THEN**: Extract tab components
4. **FINALLY**: Replace main file, test thoroughly

## Notes

- Always preserve exact functionality
- Copy comments and documentation
- Update imports after moving code
- Test each component independently
- Use TypeScript for new components (optional)
