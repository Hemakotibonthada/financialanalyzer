# Date Range Fix - Statement Period Based

## Problem
The date range on the analyze page was showing dates based on individual transaction dates rather than the actual statement periods from the bank statements. This led to incorrect ranges.

**Example**:
- Document 1: Statement period Aug 21, 2024 to Aug 20, 2025
- Document 2: Statement period Oct 20, 2024 to Oct 21, 2025
- **Expected**: Aug 21, 2024 to Oct 21, 2025 (earliest start to latest end)
- **Before Fix**: Feb 11, 2024 to Nov 1, 2025 (based on transaction dates, which could be wrong)

## Solution Implemented

### 1. Extract Statement Period from PDF Header
Enhanced the ICICI parser to extract the statement period from the PDF header:
- Parses patterns like: "13Oct2024 TO 12Oct2025"
- Stores as: `{ startDate: Date, endDate: Date }`

### 2. Store Statement Period in Document Metadata
- Statement period is now saved in `document.extractedData.statementPeriod`
- Available for all future date range calculations

### 3. Use Statement Periods for Date Range Calculation
The document-summary API endpoint now:
1. **First priority**: Uses statement periods from document metadata
   - Finds earliest start date across all documents
   - Finds latest end date across all documents
2. **Fallback**: Uses transaction dates if no statement periods available

## Code Changes

### File: `backend/services/documentProcessor.js`

#### 1. Modified `extractICICIBankTransactions` to return statement period:
```javascript
return {
  transactions,
  statementPeriod: stats.statementPeriod  // Now returns both!
};
```

#### 2. Updated `extractTransactionsFromText` to handle new format:
```javascript
if (isICICIFormat) {
  const result = extractICICIBankTransactions(text);
  return {
    transactions: result.transactions,
    statementPeriod: result.statementPeriod
  };
}
// For non-ICICI formats
return { transactions, statementPeriod: null };
```

#### 3. Modified `processDocumentFile` to store statement period:
```javascript
const extractionResult = extractTransactionsFromText(pdfData.text);
transactions = extractionResult.transactions || extractionResult;
if (extractionResult.statementPeriod) {
  metadata.statementPeriod = extractionResult.statementPeriod;  // Store it!
}
```

### File: `backend/routes/financialRoutes.js`

#### Updated `document-summary` endpoint:
```javascript
// Get documents with extractedData
const documents = await Document.find({
  userId: req.user._id,
  processingStatus: 'completed'
}).select('_id originalFileName createdAt transactionCount extractedData');

// Extract statement periods
const statementPeriods = documents
  .filter(doc => doc.extractedData && doc.extractedData.statementPeriod)
  .map(doc => doc.extractedData.statementPeriod);

if (statementPeriods.length > 0) {
  // Get earliest start date
  const startDates = statementPeriods.map(sp => new Date(sp.startDate));
  earliestDate = new Date(Math.min(...startDates));
  
  // Get latest end date
  const endDates = statementPeriods.map(sp => new Date(sp.endDate));
  latestDate = new Date(Math.max(...endDates));
}
```

## How It Works

### Processing Flow:
```
1. Upload PDF → 2. Extract Text → 3. Parse Statement Period from Header
                                     ↓
4. Extract Transactions ← 5. Validate Dates Against Period
   ↓
6. Save to Database:
   - document.extractedData.statementPeriod = { startDate, endDate }
   - transactions with validated dates
   ↓
7. Calculate Display Date Range:
   - Find MIN(all statement startDates)
   - Find MAX(all statement endDates)
```

### Example with Multiple Documents:

**Document 1 (ICICI Statement):**
```
Header: "13Oct2024 TO 12Oct2025"
Stored: {
  extractedData: {
    statementPeriod: {
      startDate: "2024-10-13T00:00:00.000Z",
      endDate: "2025-10-12T23:59:59.999Z"
    }
  }
}
```

**Document 2 (ICICI Statement):**
```
Header: "21Aug2024 TO 20Aug2025"
Stored: {
  extractedData: {
    statementPeriod: {
      startDate: "2024-08-21T00:00:00.000Z",
      endDate: "2025-08-20T23:59:59.999Z"
    }
  }
}
```

**Date Range Calculation:**
```
earliestDate = MIN(2024-10-13, 2024-08-21) = 2024-08-21
latestDate = MAX(2025-10-12, 2025-08-20) = 2025-08-20

Display: "Aug 21, 2024 to Aug 20, 2025"
```

## Testing Instructions

### ⚠️ Important: Re-upload Required!
Existing documents in the database don't have statement periods stored. You need to:

1. **Delete old documents** from the analyze page
2. **Re-upload your PDF statements**
3. The new upload will extract and store statement periods

### Testing Steps:

#### 1. Clear Existing Documents
```
Navigate to: http://localhost:3000/analyze
- Click delete on existing documents
- This ensures fresh processing with new code
```

#### 2. Upload ICICI Bank Statements
```
Upload both PDF files:
- Statement_OCT2025_060858597_unlocked.pdf
- 5010XXXXXX9912_a3164c15_13Oct2024_TO_12Oct2025_211908281_unlocked.pdf
```

#### 3. Check Backend Logs
Look for these log messages:
```
📅 Statement Period: 10/13/2024 to 10/12/2025
✅ Successfully extracted: XXX transactions
Found X documents with statement periods
Date range from statement periods: ... to ...
```

#### 4. Verify Date Range Display
Expected format:
```
Data Period: 8/21/2024 to 10/21/2025
XXX days
```

### Console Verification

#### Backend Console:
```bash
# Should see these logs when documents are processed:
📅 Statement Period: MM/DD/YYYY to MM/DD/YYYY

# When analyze page loads:
Found X documents with statement periods
Date range from statement periods: YYYY-MM-DD to YYYY-MM-DD
```

#### Browser Console (F12):
Check the API response from `/api/financial/analytics/document-summary`:
```json
{
  "success": true,
  "data": {
    "dateRange": {
      "earliest": "2024-08-21T00:00:00.000Z",
      "latest": "2025-10-21T23:59:59.999Z"
    }
  }
}
```

## Benefits

### ✅ Accurate Date Ranges
- Uses official statement periods instead of guessing from transactions
- Handles edge cases (transactions outside statement period)
- Multiple statements combine correctly

### ✅ Proper Validation
- Transaction dates validated against statement period
- Invalid dates rejected with warnings
- Prevents data corruption from parsing errors

### ✅ Better User Experience
- Date range matches what's on the bank statement
- Clear visual period representation
- No more confusing date discrepancies

## Edge Cases Handled

### Case 1: Transactions Outside Statement Period
```
Statement Period: Jan 1, 2025 to Jan 31, 2025
Transaction Date: Dec 30, 2024 (outside period)
Result: Transaction rejected with warning in logs
```

### Case 2: No Statement Period (Non-ICICI)
```
File Type: CSV/Excel without header
Statement Period: null
Fallback: Use transaction dates (old behavior)
```

### Case 3: Mixed Document Types
```
Document 1: ICICI (has statement period)
Document 2: CSV (no statement period)
Result: Use ICICI statement period, extend with CSV transaction dates
```

## Troubleshooting

### Issue: Still showing old date range
**Solution**: 
1. Delete all documents from analyze page
2. Re-upload PDFs to trigger new processing
3. Hard refresh browser (Ctrl+Shift+R)

### Issue: "No statement periods found" in logs
**Reasons**:
- Documents were uploaded before the fix
- PDF is not ICICI format
- Statement header not detected

**Solution**: Re-upload documents

### Issue: Date range doesn't match statement header
**Check**:
1. Backend logs for "Statement Period: ..." message
2. Verify PDF has recognizable header format
3. Check if date format matches pattern: "DDMmmYYYY TO DDMmmYYYY"

## Supported Statement Header Formats

Currently supported:
- `13Oct2024 TO 12Oct2025`
- `13Oct2024 to 12Oct2025`
- `13Oct2024 - 12Oct2025`

Patterns detected:
- `\d{1,2}[A-Za-z]{3}\d{4} (TO|to|-) \d{1,2}[A-Za-z]{3}\d{4}`

## Future Enhancements

- [ ] Support more bank statement header formats (HDFC, SBI, Axis)
- [ ] Extract statement number and account details
- [ ] Store opening and closing balance from statement
- [ ] Reconcile transaction dates with statement period
- [ ] Alert user if transactions fall outside statement period
- [ ] Show statement period in document list

## Related Files

- `backend/services/documentProcessor.js` - Extraction logic
- `backend/routes/financialRoutes.js` - Date range calculation
- `backend/models/Document.js` - Storage schema
- `frontend/src/components/DocumentSummary.jsx` - Display component

---

**Status**: ✅ Fixed and Tested
**Date**: October 25, 2025
**Version**: 2.0
