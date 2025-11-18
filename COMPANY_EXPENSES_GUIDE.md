# Company Expenses Tracking Dashboard

## Overview

A comprehensive, enterprise-grade expense tracking system for managing company expenditures with advanced features including file attachments, detailed analytics, and automated report generation.

## Features

### 📊 **Dashboard Overview**
- **Real-time Statistics**: Total, monthly, yearly, and pending expenses at a glance
- **Visual Analytics**: Category breakdown charts and trend analysis
- **Recent Activity**: Quick view of latest expenses
- **Smart Filtering**: Advanced search and filter capabilities

### 💰 **Expense Management**
- **Complete Tracking**: Track every company expense with detailed information
- **Categories**: 20+ predefined expense categories including:
  - Office Supplies
  - Equipment & Hardware
  - Software & Subscriptions
  - Marketing & Advertising
  - Travel & Transportation
  - Utilities & Rent
  - Salaries & Professional Services
  - And more...

### 📎 **Attachment Management**
- **Multiple File Support**: Upload receipts, invoices, contracts, and documents
- **File Types**: Images (JPG, PNG), PDFs, Documents (DOC, DOCX, XLS, XLSX), CSV, TXT
- **Drag & Drop**: Easy file upload with drag-and-drop interface
- **Size Limit**: Up to 10MB per file
- **Cloud Storage**: Secure file storage with easy retrieval

### 🏢 **Organization Features**
- **Department Tracking**: Assign expenses to specific departments
- **Project Association**: Link expenses to projects
- **Vendor Management**: Track vendor information (name, email, phone)
- **Multi-Currency**: Support for USD, EUR, GBP, INR, CAD, AUD, JPY, CNY

### 💳 **Payment Tracking**
- **Payment Methods**: Cash, Credit/Debit Cards, Bank Transfer, PayPal, UPI, and more
- **Payment Status**: Track paid, pending, overdue, cancelled, or refunded expenses
- **Invoice Management**: Store invoice and reference numbers
- **Recurring Expenses**: Set up daily, weekly, monthly, quarterly, or yearly recurring expenses

### 📈 **Advanced Analytics**
- **Category Analysis**: See spending breakdown by category
- **Department Analysis**: Track expenses per department
- **Monthly Trends**: Visualize spending patterns over time
- **Top Vendors**: Identify your most frequent vendors
- **Time-based Insights**: Compare current vs previous periods

### 📄 **Report Generation**
- **PDF Reports**: Professional formatted PDF reports with charts
- **Excel Export**: Detailed Excel spreadsheets with multiple sheets
- **Custom Date Ranges**: Generate reports for any period
- **Comprehensive Data**: Include summary, analytics, and detailed transactions
- **Attachment Evidence**: All receipts and documents linked in reports

### 🔍 **Search & Filter**
- **Full-Text Search**: Search across description, vendor, category, notes
- **Advanced Filters**:
  - Date range
  - Category & Department
  - Payment status
  - Amount range
  - Project assignment
- **Real-time Filtering**: Instant results as you type
- **Saved Searches**: Quick access to frequently used filters

### 💼 **Business Intelligence**
- **Tax Tracking**: Mark expenses as tax-deductible with percentage
- **Billable Expenses**: Track client-billable expenses
- **Reimbursement**: Manage reimbursable expenses
- **Approval Workflow**: Built-in approval system
- **Audit Trail**: Complete metadata tracking (created by, IP address, device info)

### 📱 **Mobile Responsive**
- Fully responsive design works on all devices
- Touch-friendly interface
- Mobile-optimized layouts
- Swipe gestures support

## Technical Implementation

### Backend Architecture

#### Database Model
```javascript
CompanyExpense Schema:
- userId: Reference to user
- expenseDate: Date of expense
- category: Expense category (20+ options)
- description: Detailed description
- amount: Expense amount
- currency: Multi-currency support
- vendor: {name, email, phone, address, taxId}
- paymentMethod: Payment type
- paymentStatus: Current status
- invoiceNumber: Invoice reference
- department: Company department
- project: Project association
- attachments: Array of file attachments
- tags: Custom tags
- notes: Additional notes
- taxDeductible: Tax deduction flag
- isRecurring: Recurring expense flag
- metadata: Audit information
```

#### API Endpoints

**CRUD Operations:**
- `POST /api/company-expenses` - Create new expense
- `GET /api/company-expenses` - Get all expenses (with filtering)
- `GET /api/company-expenses/:id` - Get single expense
- `PUT /api/company-expenses/:id` - Update expense
- `DELETE /api/company-expenses/:id` - Delete expense

**Analytics:**
- `GET /api/company-expenses/dashboard/summary` - Dashboard statistics
- `GET /api/company-expenses/analytics/by-category` - Category breakdown
- `GET /api/company-expenses/analytics/by-department` - Department analysis
- `GET /api/company-expenses/analytics/monthly-trend` - Monthly trends
- `GET /api/company-expenses/analytics/top-vendors` - Top vendors list

**File Management:**
- `GET /api/company-expenses/:id/attachments/:attachmentId/download` - Download file
- `DELETE /api/company-expenses/:id/attachments/:attachmentId` - Delete attachment

**Reports:**
- `POST /api/company-expenses/reports/generate` - Generate PDF/Excel report

#### Controllers
- **companyExpenseController.js**: Business logic for all operations
- Full CRUD operations
- Advanced analytics queries
- Report generation (PDF & Excel)
- File upload/download handling

#### Features Implemented:
- MongoDB aggregation pipelines for analytics
- Multer for file uploads
- PDFKit for PDF generation
- ExcelJS for Excel reports
- Full-text search indexing
- Automatic recurring expense handling

### Frontend Architecture

#### Components

**Main Dashboard (`CompanyExpensesDashboard.jsx`):**
- Summary cards with key metrics
- Interactive charts and visualizations
- Advanced filter panel
- Expense table with sorting
- Modal-based expense management

**Expense Form (`ExpenseFormModal.jsx`):**
- Multi-step form with validation
- File upload with drag-and-drop
- Dynamic field visibility
- Real-time validation
- Edit mode support

#### Features:
- React Hooks for state management
- Lazy loading for performance
- Toast notifications
- Loading states
- Error handling
- Responsive grid layouts
- Tailwind CSS styling
- Lucide React icons

#### UI/UX Highlights:
- **Color-coded Status**: Visual indicators for payment status
- **Interactive Tables**: Sortable, filterable data tables
- **Progressive Disclosure**: Show/hide filters panel
- **Quick Actions**: Inline edit, delete, view buttons
- **Drag & Drop**: Modern file upload experience
- **Modal Dialogs**: Non-intrusive data entry
- **Real-time Search**: Instant filter results
- **Loading States**: Skeleton screens and spinners

## Usage Guide

### Adding an Expense

1. **Navigate** to "Company Expenses" from the sidebar
2. **Click** "Add Expense" button
3. **Fill in** the required information:
   - Expense date
   - Category
   - Description
   - Amount
4. **Add optional** details:
   - Vendor information
   - Payment details
   - Department/Project
   - Tags and notes
5. **Upload** receipts or invoices (drag & drop supported)
6. **Click** "Create Expense"

### Viewing & Managing Expenses

- **Filter**: Use the filter panel to narrow down expenses
- **Search**: Type in the search box for instant results
- **View**: Click the eye icon to see full details
- **Edit**: Click the edit icon to modify
- **Delete**: Click trash icon to remove (with confirmation)

### Generating Reports

1. **Set Filters**: Choose date range and other filters
2. **Click** "Export" button
3. **Select** format (PDF or Excel)
4. **Download**: Report downloads automatically with all data and charts

### Using Analytics

The dashboard automatically shows:
- **Summary Cards**: Quick overview of spending
- **Category Breakdown**: Top categories with progress bars
- **Recent Expenses**: Latest transactions
- **Monthly Trends**: Historical spending patterns

## Best Practices

### Data Entry
- Always attach receipts/invoices for audit purposes
- Use consistent vendor names for better analytics
- Tag expenses for easy searching
- Add notes for context

### Organization
- Assign correct departments for accurate tracking
- Link expenses to projects when applicable
- Use appropriate categories
- Mark tax-deductible expenses

### Security
- All file uploads are validated
- Files stored securely on server
- Access restricted to authenticated users
- Audit trail maintained for all actions

## Configuration

### File Upload Settings
Located in `backend/routes/companyExpenseRoutes.js`:
```javascript
Maximum file size: 10MB
Allowed types: jpeg, jpg, png, pdf, doc, docx, xls, xlsx, csv, txt
Upload directory: uploads/company-expenses/
```

### Categories
Modify categories in `backend/models/CompanyExpense.js`:
```javascript
enum: [
  'Office Supplies',
  'Equipment & Hardware',
  // Add more categories...
]
```

### Departments
Update departments in the model enum to match your organization.

## Database Indexes

Optimized queries with indexes on:
- userId + expenseDate
- userId + category
- userId + department
- Full-text search on description, vendor, notes, tags

## Performance Optimizations

- Lazy loading of React components
- Pagination for large datasets
- Aggregation pipelines for analytics
- Text indexes for fast searching
- Efficient file storage
- Compressed responses

## API Response Format

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

## Error Handling

- Comprehensive error messages
- Toast notifications for user feedback
- Validation on both frontend and backend
- Graceful degradation
- Loading states for async operations

## Future Enhancements

Potential features for future releases:
- [ ] Approval workflow with multiple approvers
- [ ] Email notifications for pending approvals
- [ ] Budget limits and alerts
- [ ] Integration with accounting software
- [ ] Mobile app
- [ ] Bulk upload via CSV
- [ ] Advanced analytics with AI insights
- [ ] Expense policy enforcement
- [ ] Multi-company support
- [ ] Role-based access control

## Troubleshooting

### Common Issues

**Files not uploading:**
- Check file size (max 10MB)
- Verify file type is allowed
- Ensure uploads directory exists and has write permissions

**Reports not generating:**
- Check date range is valid
- Ensure data exists for selected period
- Verify PDF/Excel libraries are installed

**Search not working:**
- Rebuild text indexes: `db.companyexpenses.createIndex({...})`
- Check MongoDB version supports text search

## API Testing

Use the following curl commands to test the API:

```bash
# Create expense
curl -X POST http://localhost:5001/api/company-expenses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "expenseDate=2024-01-15" \
  -F "category=Office Supplies" \
  -F "description=Printer paper" \
  -F "amount=50" \
  -F "attachments=@receipt.pdf"

# Get expenses
curl -X GET http://localhost:5001/api/company-expenses \
  -H "Authorization: Bearer YOUR_TOKEN"

# Generate report
curl -X POST http://localhost:5001/api/company-expenses/reports/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"format":"pdf","startDate":"2024-01-01","endDate":"2024-12-31"}' \
  --output report.pdf
```

## Support

For issues or questions:
1. Check this documentation
2. Review the code comments
3. Check the console for error messages
4. Verify API endpoint availability
5. Ensure all dependencies are installed

## License

Part of the Financial Analyzer application.

## Credits

Built with:
- React + Vite
- Node.js + Express
- MongoDB + Mongoose
- Tailwind CSS
- Lucide Icons
- PDFKit
- ExcelJS
- Multer

---

**Version:** 1.0.0  
**Last Updated:** November 2024  
**Status:** Production Ready ✅
