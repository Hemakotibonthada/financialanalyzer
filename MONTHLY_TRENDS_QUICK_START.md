# 🚀 Monthly Trends Report - Quick Start Guide

## Access the Report

### Option 1: Direct URL
```
http://localhost:3001/reports
```

### Option 2: Navigation
1. Open your Financial Analyzer app
2. Click on "Reports" in the navigation menu
3. Monthly Trends Report loads automatically

## Quick Actions

### 📅 View Last 12 Months
1. Default view shows last 12 months
2. No configuration needed
3. Just open the reports page

### 🔍 Filter by Date Range
1. Use "Quick Select" dropdown:
   - Last 3 Months
   - Last 6 Months
   - Last 12 Months
   - Last 24 Months
2. Click "Apply Filter"

### 📆 Custom Date Range
1. Enter "Start Date" (YYYY-MM-DD)
2. Enter "End Date" (YYYY-MM-DD)
3. Click "Apply Filter"

### 💾 Export Reports

#### PDF Export (With Charts)
```
Click "Export PDF" button → File downloads automatically
```
**Contains**: 3 charts, summary, monthly breakdown

#### Excel Export (Multi-Sheet)
```
Click "Export Excel" button → .xlsx file downloads
```
**Contains**: 3 sheets (Summary, Trends, Categories)

#### CSV Export (Simple Data)
```
Click "Export CSV" button → .csv file downloads
```
**Contains**: Basic monthly data table

## What You'll See

### 📊 Summary Cards (Top)
- **Total Income** - Sum of all income in period
- **Total Expenses** - Sum of all expenses in period
- **Total Net** - Income minus expenses
- **Avg Savings Rate** - Average percentage saved per month

### 📈 Charts (Middle Section)
1. **Income vs Expenses Trend** - Line chart showing both over time
2. **Monthly Savings Rate** - Bar chart of savings percentages
3. **Top Expense Categories** - Doughnut chart of spending breakdown

### 📋 Trend Analysis (Right Panel)
- Income Growth %
- Expense Growth %
- Savings Trend
- Months Analyzed

### 🗂️ Monthly Breakdown Table (Bottom)
- Month-by-month detailed data
- Sortable columns
- Color-coded values

## API Endpoints

### Get Report Data
```bash
GET http://localhost:5001/api/financial/monthly-trends-report?months=12
```

### Export PDF
```bash
GET http://localhost:5001/api/financial/monthly-trends-report/export/pdf?months=12
```

### Export Excel
```bash
GET http://localhost:5001/api/financial/monthly-trends-report/export/excel?months=12
```

### Export CSV
```bash
GET http://localhost:5001/api/financial/monthly-trends-report/export/csv?months=12
```

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| months | number | 12 | Number of months to analyze |
| startDate | string | - | Custom start date (YYYY-MM-DD) |
| endDate | string | - | Custom end date (YYYY-MM-DD) |

## Example Scenarios

### Scenario 1: Last 6 Months Report
1. Select "Last 6 Months" from dropdown
2. Click "Apply Filter"
3. View updated charts and data

### Scenario 2: Financial Year Report
1. Enter Start Date: `2024-04-01`
2. Enter End Date: `2025-03-31`
3. Click "Apply Filter"
4. Click "Export PDF" for complete report

### Scenario 3: Year-over-Year Comparison
1. Export report for 2023 (Jan 1 - Dec 31)
2. Export report for 2024 (Jan 1 - Dec 31)
3. Compare the two PDF files

## Tips & Tricks

### 💡 Best Practices
- Use **Last 12 Months** for annual overview
- Use **Last 3 Months** for recent trends
- Use **Custom Dates** for specific periods (quarters, fiscal years)
- Export to **PDF** for presentations
- Export to **Excel** for further analysis
- Export to **CSV** for importing to other tools

### 🎯 Quick Insights
- **Green values** = Income or positive metrics
- **Red values** = Expenses or negative metrics
- **Blue values** = Savings rate or neutral metrics
- **Higher Savings Rate** = Better financial health

### ⚡ Keyboard Shortcuts
- `Ctrl+P` - Print report (after opening)
- `Ctrl+S` - Save page (for offline viewing)

## Troubleshooting

### Issue: No data showing
**Solution**: Ensure you have transactions in the selected date range

### Issue: Charts not loading
**Solution**: Refresh the page or clear browser cache

### Issue: Export not working
**Solution**: Check your internet connection and try again

### Issue: Slow loading
**Solution**: Reduce the date range (use fewer months)

## Common Use Cases

### 1️⃣ Monthly Budget Review
- View last month's data
- Compare income vs expenses
- Check savings rate

### 2️⃣ Quarterly Financial Report
- Set 3-month date range
- Export to PDF
- Share with family/advisor

### 3️⃣ Annual Tax Preparation
- Select full tax year
- Export to Excel
- Use for tax filing

### 4️⃣ Spending Analysis
- View category breakdown chart
- Identify top expense categories
- Plan budget adjustments

### 5️⃣ Trend Monitoring
- Check income/expense growth
- Monitor savings trend
- Set financial goals

## File Formats Explained

### PDF Format
- **Best for**: Presentations, printing, sharing
- **Contains**: Charts, tables, formatted text
- **Size**: ~500KB - 2MB
- **Opens in**: Adobe Reader, browsers

### Excel Format
- **Best for**: Data analysis, calculations
- **Contains**: 3 sheets with raw data
- **Size**: ~50KB - 200KB
- **Opens in**: Microsoft Excel, Google Sheets

### CSV Format
- **Best for**: Simple data, importing to other tools
- **Contains**: Plain text table
- **Size**: ~10KB - 50KB
- **Opens in**: Excel, text editors, any spreadsheet app

## Need Help?

### Check Documentation
- `MONTHLY_TRENDS_REPORT.md` - Complete feature documentation
- `README.md` - General application guide

### Contact Support
- Create an issue in the repository
- Check existing issues for solutions

---

**Quick Reference**: Just go to `/reports` and start exploring! 🎉

**Last Updated**: October 25, 2025
