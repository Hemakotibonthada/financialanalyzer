# ICICI Bank Statement Support

## Overview
The Financial Analyzer now supports extracting transactions from ICICI Bank statements with the following format:

```
DATE MODE** PARTICULARS DEPOSITS WITHDRAWALS BALANCE
13-04-2025 B/F 20,055.55
14-04-2025 ICICI CRM CAM/72041ORY/CASH DEP-Self/14-04-25/2488 15,500.00 35,555.55
26-04-2025 MOBILE BANKING MMT/IMPS/511614818398/Hema Kotes/HDFC0002081 5,000.00 34,555.55
```

## Features

### 1. Format Detection
- Automatically detects ICICI bank statement format
- Recognizes DATE, MODE, PARTICULARS, DEPOSITS, WITHDRAWALS, BALANCE columns
- Handles Balance Brought Forward (B/F) entries

### 2. Transaction Extraction
Extracts the following information for each transaction:
- **Date**: DD-MM-YYYY format
- **Description**: Full transaction description/particulars
- **Amount**: Deposit or withdrawal amount
- **Type**: Credit (deposit) or Debit (withdrawal)
- **Balance**: Account balance after transaction
- **Payment Method**: Cash, IMPS, UPI, NEFT, RTGS, ATM, POS, etc.
- **Reference Number**: Transaction ID (10+ digits)

### 3. Payment Method Detection
Automatically categorizes transactions by mode:
- **Cash Deposit**: ICICI CRM CAM transactions
- **Mobile Banking - IMPS**: MMT/IMPS transactions
- **UPI**: UPI transactions
- **NEFT**: NEFT transfers
- **RTGS**: RTGS transfers
- **ATM**: ATM withdrawals
- **POS**: Point of Sale transactions

### 4. IMPS Transaction Details
For IMPS transactions, extracts:
- Transaction ID
- Beneficiary Name
- Bank Code

Example:
```
MMT/IMPS/511614818398/Hema Kotes/HDFC0002081
         └─────┬─────┘ └────┬────┘ └────┬────┘
         Transaction ID  Beneficiary  Bank Code
```

### 5. Password Protection Support
- Supports password-protected PDF bank statements
- Password format: Uses your date of birth (BONT + DDMM)
  - Example: If DOB is 09/06, password is `BONT0906`
- Automatic password generation based on:
  - User profile date of birth
  - Common patterns
  - Email hints

## Implementation

### 1. Enhanced Document Processor
Location: `backend/services/documentProcessor.js`

New function: `extractICICIBankTransactions(text)`

### 2. Detection Logic
```javascript
const isICICIFormat = lines.some(line => 
  /DATE\s+MODE\*?\*?\s+PARTICULARS\s+DEPOSITS?\s+WITHDRAWALS?\s+BALANCE/i.test(line) ||
  /\d{2}-\d{2}-\d{4}\s+.+\s+\d+[,\d]*\.\d{2}\s+\d+[,\d]*\.\d{2}/i.test(line)
);
```

### 3. Transaction Pattern Matching
```javascript
// Full transaction pattern
const transactionPattern = /^(\d{2}-\d{2}-\d{4})\s+(.*?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})$/;

// Balance forward pattern
const balanceForwardPattern = /^(\d{2}-\d{2}-\d{4})\s+B\/F\s+([\d,]+\.\d{2})$/;
```

## Usage

### 1. Upload ICICI Statement
```javascript
POST /api/documents/upload
Content-Type: multipart/form-data

{
  file: [ICICI_Statement.pdf],
  category: "banking",
  password: "BONT0906"  // Optional if PDF is password-protected
}
```

### 2. Process with Password
```javascript
const documentProcessor = require('./services/documentProcessor');

const result = await documentProcessor.processDocumentFile(
  'path/to/statement.pdf',
  'pdf',
  'BONT0906'  // Your password
);

console.log(`Extracted ${result.transactions.length} transactions`);
```

### 3. Via Gmail Integration
If the statement is received via email with password hint:
```javascript
{
  "subject": "ICICI Bank Statement - October 2025",
  "passwordHint": "BONT + your birthdate (DDMM)",
  "attachment": "Statement_OCT2025.pdf"
}
```

The system will automatically:
1. Extract the password hint
2. Try combinations using your profile
3. Unlock and process the PDF

## Transaction Categories

ICICI transactions are automatically categorized based on description:
- **Cash Deposit** → Banking/Deposits
- **IMPS Transfer** → Peer-to-Peer Transfer
- **UPI Payment** → UPI Payments
- **Bill Payment** → Mobile Recharge & Bills
- **ATM Withdrawal** → Cash Withdrawal
- **POS Transaction** → Shopping/Food & Dining

## Example Output

```javascript
{
  transactions: [
    {
      date: "2025-04-14T00:00:00.000Z",
      description: "ICICI CRM CAM/72041ORY/CASH DEP-Self/14-04-25/2488",
      amount: 15500.00,
      type: "credit",
      balance: 35555.55,
      paymentMethod: "cash_deposit",
      referenceNumber: "72041",
      source: "bank_statement"
    },
    {
      date: "2025-04-26T00:00:00.000Z",
      description: "MOBILE BANKING MMT/IMPS/511614818398/Hema Kotes/HDFC0002081",
      amount: 5000.00,
      type: "debit",
      balance: 34555.55,
      paymentMethod: "mobile_banking_-_imps",
      referenceNumber: "511614818398",
      upi: {
        transactionId: "511614818398",
        beneficiaryName: "Hema Kotes",
        bankCode: "HDFC0002081"
      },
      source: "bank_statement"
    }
  ],
  metadata: {
    type: "pdf",
    pages: 1,
    passwordUsed: "BONT0906"
  }
}
```

## Benefits

### 1. Automatic Processing
- No manual entry required
- Instant transaction import
- Balance tracking

### 2. Enhanced Insights
- Track spending by payment method
- Identify IMPS beneficiaries
- Monitor cash deposits
- Analyze transaction patterns

### 3. Security
- Encrypted password storage
- Password hint support
- Secure PDF processing

### 4. Integration
- Works with Gmail auto-fetch
- Document upload interface
- API endpoints

## Testing

Test script: `backend/test-icici-statement.js`

```bash
cd backend
node test-icici-statement.js
```

Expected output:
```
✅ Successfully extracted text (5000+ characters)
✅ Found 4 transactions

💰 Transaction Summary:
📥 Credits: 3 transactions, Total: ₹19,500.00
📤 Debits: 1 transactions, Total: ₹5,000.00

📋 Sample Transactions:
1. 💰 2025-04-14 | +₹15,500.00 | ICICI CRM CAM/72041ORY/CASH DEP-Self
2. 💸 2025-04-26 | -₹5,000.00 | MOBILE BANKING MMT/IMPS/511614818398/Hema Kotes

💳 Payment Methods:
  - cash_deposit: 3 transactions
  - mobile_banking_-_imps: 1 transactions

💵 Final Balance: ₹34,555.55
```

## Troubleshooting

### Password Issues
If the PDF won't decrypt:
1. Verify password format (e.g., `BONT0906` not `bont0906`)
2. Check if DOB in profile matches
3. Try manual upload with explicit password
4. Check PDF encryption type (some banks use owner passwords)

### Extraction Issues
If transactions aren't detected:
1. Check if format matches expected pattern
2. Verify date format (DD-MM-YYYY)
3. Look for amount format (comma-separated, 2 decimals)
4. Check for header row presence

### Balance Calculation
The system tracks balance changes:
- B/F entry sets initial balance
- Each transaction updates running balance
- Verifies deposits increase balance
- Verifies withdrawals decrease balance

## Future Enhancements

1. **Multiple Bank Support**: Add HDFC, SBI, Axis formats
2. **Multi-Page PDFs**: Handle statements with multiple pages
3. **OCR Fallback**: Use OCR if PDF text extraction fails
4. **Smart Categorization**: ML-based transaction categorization
5. **Duplicate Detection**: Prevent duplicate imports
6. **Currency Support**: Handle multi-currency statements

## API Endpoints

### Upload with Password
```
POST /api/documents/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <PDF file>
category: "banking"
password: "BONT0906"
```

### Re-process with Password
```
POST /api/documents/:id/reprocess
Authorization: Bearer <token>
Content-Type: application/json

{
  "password": "BONT0906"
}
```

### Get Document Transactions
```
GET /api/documents/:id/transactions
Authorization: Bearer <token>
```

## Security Considerations

1. **Password Storage**: Never store passwords in plain text
2. **Password Hints**: Store hints securely, not actual passwords
3. **Temporary Files**: Clean up decrypted PDFs after processing
4. **Access Control**: Only document owner can access transactions
5. **Audit Trail**: Log all document access attempts

## Support

For issues or questions:
1. Check the logs: `backend/logs/combined.log`
2. Verify PDF is ICICI format
3. Ensure password is correct
4. Check MongoDB connection
5. Review transaction extraction patterns

## Version History

- **v1.0** (2025-10-25): Initial ICICI bank statement support
  - Date: DD-MM-YYYY format parsing
  - Deposits and withdrawals extraction
  - Payment method detection
  - IMPS transaction details
  - Password-protected PDF support
  - Balance tracking
