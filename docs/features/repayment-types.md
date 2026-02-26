# 🤝 Repayment Types Feature - Complete Guide

## Overview
The EMI Tracker now supports **two types of repayment methods** to accommodate different lending scenarios:

### 📅 **MONTHLY EMI** (Traditional)
- Fixed monthly installments
- Defined tenure (e.g., 6, 12, 24, 36 months)
- Scheduled due dates
- Interest calculations
- Progress tracking with completion percentage
- **Best for:** Credit card EMIs, bank loans, structured payment plans

### 🤝 **ON REQUEST** (Personal Loans)
- Pay back anytime when requested
- No fixed monthly installments
- No defined tenure
- Flexible repayment schedule
- **Best for:** Loans from friends/family, informal lending, emergency loans

---

## ✨ What's New?

### Frontend Changes
1. **New Field: Repayment Type Selector**
   - Location: Financial Details section in Add Manual EMI form
   - Two options with clear descriptions
   
2. **Conditional Fields**
   - **EMI Amount**: Only shows for MONTHLY type
   - **Tenure**: Only shows for MONTHLY type
   - **Principal Amount**: Required for both types (represents loan amount for ON_REQUEST)

3. **Dynamic Summary Card**
   - **MONTHLY**: Shows EMI breakdown with total payable and interest
   - **ON_REQUEST**: Shows loan amount and flexible repayment note

### Backend Changes
1. **EMI Model Update**
   - New field: `repaymentType` (enum: 'MONTHLY', 'ON_REQUEST')
   - `endDate` and `nextDueDate` now optional (not applicable for ON_REQUEST)

2. **Validation Logic**
   - Validates EMI amount and tenure only for MONTHLY type
   - For ON_REQUEST, sets EMI amount = principal amount, tenure = 1

3. **Payment History**
   - **MONTHLY**: Creates full schedule with monthly installments
   - **ON_REQUEST**: Single entry with no fixed due date

---

## 📋 How to Use

### Adding a Monthly EMI
1. Click "Add Manual EMI"
2. Fill Card Details (Provider, Last 4 digits, Holder name)
3. Fill Purchase Details (Merchant, Product description)
4. **Select "Monthly EMI"** as Repayment Type
5. Fill Financial Details:
   - Principal Amount: ₹50,000
   - EMI Amount (Monthly): ₹5,000
   - Interest Rate: 12%
   - Tenure: 12 months
6. Select Start Date
7. Add Notes (optional)
8. Click "CREATE EMI"

**Result**: EMI with 12 scheduled payments, monthly burden of ₹5,000

### Adding an On-Request Loan
1. Click "Add Manual EMI"
2. Fill Card Details (Provider: OTHER, Custom Name: "Friend - Ramesh")
3. Fill Purchase Details:
   - Merchant Name: "Friend Ramesh"
   - Product Description: "Emergency Loan"
4. **Select "On Request (Personal Loan)"** as Repayment Type
5. Fill Financial Details:
   - Principal Amount: ₹50,000 (This is the total loan amount)
   - Interest Rate: 0% (or applicable rate)
6. Select Start Date
7. Add Notes: "To be repaid when requested"
8. Click "CREATE EMI"

**Result**: Loan tracked with ₹50,000 outstanding, no monthly burden

---

## 🎯 Use Cases

### Monthly EMI Examples
```
✅ iPhone purchase on credit card (12 months @ ₹8,000/month)
✅ Laptop EMI from bank (24 months @ ₹3,500/month)
✅ Buy-now-pay-later from Amazon (6 months @ ₹2,000/month)
✅ Personal loan from HDFC (36 months @ ₹10,000/month)
```

### On-Request Loan Examples
```
✅ Emergency loan from friend (₹50,000 - pay back anytime)
✅ Family loan for medical expenses (₹1,00,000 - flexible)
✅ Informal business loan (₹2,50,000 - repay when possible)
✅ Short-term loan from colleague (₹25,000 - on demand)
```

---

## 📊 Impact on Financial Health

### Monthly EMI Impact
- **Adds to Monthly Burden**: Active monthly EMIs contribute to total monthly burden
- **Health Score Impact**: High EMI burden (>40% of income) negatively affects health score
- **Tracked in Budget**: Monthly EMIs are considered in budget calculations
- **Progress Tracking**: Shows completion percentage and paid installments

### On-Request Loan Impact
- **No Monthly Burden**: Does NOT add to monthly EMI burden (₹0/month)
- **Outstanding Debt**: Still tracked as total outstanding debt
- **Health Score**: Affects total debt metric but not EMI burden ratio
- **Flexible Timeline**: No pressure of monthly due dates

---

## 🔍 Technical Details

### Database Schema
```javascript
{
  repaymentType: {
    type: String,
    enum: ['MONTHLY', 'ON_REQUEST'],
    default: 'MONTHLY'
  },
  // For ON_REQUEST type:
  emiAmount: principalAmount, // Full loan amount
  totalTenure: 1, // Single installment
  endDate: null, // No fixed end date
  nextDueDate: null, // No scheduled due date
  paymentHistory: [
    {
      installmentNumber: 1,
      dueDate: null,
      amount: principalAmount,
      principalPaid: principalAmount,
      interestPaid: 0,
      status: 'upcoming'
    }
  ]
}
```

### API Request Example (ON_REQUEST)
```json
{
  "cardProvider": "OTHER",
  "customProviderName": "Friend Ramesh",
  "cardLastFourDigits": "9999",
  "cardHolderName": "Hema Naidu",
  "merchantName": "Friend Ramesh",
  "productDescription": "Emergency Loan",
  "principalAmount": 50000,
  "interestRate": 0,
  "processingFee": 0,
  "repaymentType": "ON_REQUEST",
  "startDate": "2025-10-25",
  "notes": "Personal loan - pay back when requested"
}
```

**Note**: When `repaymentType: "ON_REQUEST"`, EMI amount and tenure are not required in the request.

---

## 🧪 Testing

### Test File
```bash
cd backend
node test-repayment-types.js
```

This shows:
- Count of Monthly EMIs vs On-Request loans
- Total principal for each type
- Monthly burden calculation (excludes ON_REQUEST)
- Complete breakdown of all loans

### Manual Testing
1. ✅ Add a Monthly EMI → Verify monthly burden increases
2. ✅ Add an On-Request loan → Verify monthly burden stays same
3. ✅ Check Active EMIs tab → Both types should appear
4. ✅ Verify Total Outstanding includes both types
5. ✅ Verify Total Paid calculation works correctly

---

## 📈 Dashboard Impact

### Cards Affected
1. **Active EMIs**: Shows count of both types
2. **Outstanding Amount**: Sum of remaining debt from both types
3. **Monthly Burden**: Only includes MONTHLY type EMIs
4. **Total Paid**: Includes payments from both types

### Example Scenario
```
Monthly EMIs: 3 loans
- Loan 1: ₹5,000/month (12 months)
- Loan 2: ₹3,000/month (24 months)
- Loan 3: ₹2,000/month (36 months)
Monthly Burden: ₹10,000/month

On-Request Loans: 2 loans
- Friend 1: ₹50,000 (pay anytime)
- Family: ₹1,00,000 (flexible)
Monthly Burden: ₹0/month

Total Active EMIs: 5
Total Outstanding: ₹X,XX,XXX (sum of all remaining debt)
Total Monthly Burden: ₹10,000 (only structured EMIs)
```

---

## 💡 Benefits

### For Users
1. **Flexibility**: Track all types of loans in one place
2. **Real Burden**: Monthly burden only shows fixed commitments
3. **Better Planning**: Know which loans are urgent vs flexible
4. **Complete Picture**: See total debt including informal loans

### For Financial Health
1. **Accurate Score**: EMI burden calculation only considers fixed monthly commitments
2. **Realistic Budget**: Monthly budget planning excludes flexible loans
3. **Better Insights**: Separate tracking for structured vs informal debt

---

## 🚀 Future Enhancements

Potential features for ON_REQUEST type:
1. **Manual Payment Tracking**: Record when partial/full payments are made
2. **Request Date**: Add field for when lender requested repayment
3. **Interest Accrual**: Calculate interest over time for informal loans
4. **Reminder System**: Set custom reminders for flexible repayment
5. **Relationship Tags**: Tag loans by relationship (Friend, Family, Colleague)

---

## ✅ Summary

| Feature | MONTHLY EMI | ON_REQUEST |
|---------|-------------|------------|
| Fixed Monthly Amount | ✅ Required | ❌ Not applicable |
| Tenure | ✅ Required | ❌ Not applicable |
| Due Dates | ✅ Scheduled | ❌ Flexible |
| Monthly Burden | ✅ Counted | ❌ Not counted |
| Progress Tracking | ✅ Automatic | ⚠️ Manual |
| Best For | Banks, Cards | Friends, Family |

---

## 📞 Support

If you encounter issues:
1. Check validation errors in the form
2. Verify repayment type is selected
3. Ensure required fields are filled based on type
4. Check browser console for errors
5. Restart backend server if needed

**Test Command**: `node backend/test-repayment-types.js`

---

🎉 **Enjoy flexible loan tracking!**
