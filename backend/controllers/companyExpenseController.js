const CompanyExpense = require('../models/CompanyExpense');
const User = require('../models/User');
const FinancialProfile = require('../models/FinancialProfile');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { getUserDocumentPassword } = require('../utils/documentPasswordGenerator');

/**
 * @desc    Create a new company expense
 * @route   POST /api/company-expenses
 * @access  Private
 */
exports.createExpense = async (req, res) => {
  try {
    const expenseData = {
      ...req.body,
      userId: req.user._id,
      metadata: {
        createdBy: req.user.email,
        ipAddress: req.ip,
        deviceInfo: req.headers['user-agent']
      }
    };

    // Ensure amountInINR is set (should come from frontend, but validate)
    if (!expenseData.amountInINR && expenseData.amount) {
      const exchangeRate = expenseData.exchangeRate || 1;
      expenseData.amountInINR = expenseData.amount * exchangeRate;
    }

    // Handle file attachments if present
    if (req.files && req.files.length > 0) {
      expenseData.attachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size,
        fileType: req.body.fileType || 'Receipt'
      }));
    }

    const expense = await CompanyExpense.create(expenseData);

    logger.info(`Company expense created: ${expense._id} by user ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: expense
    });
  } catch (error) {
    logger.error('Error creating company expense:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create expense'
    });
  }
};

/**
 * @desc    Get all expenses for user
 * @route   GET /api/company-expenses
 * @access  Private
 */
exports.getExpenses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'expenseDate',
      sortOrder = 'desc',
      category,
      department,
      paymentStatus,
      project,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      search
    } = req.query;

    const query = { userId: req.user._id };

    // Apply filters
    if (category) query.category = category;
    if (department) query.department = department;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (project) query.project = project;

    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) query.expenseDate.$gte = new Date(startDate);
      if (endDate) query.expenseDate.$lte = new Date(endDate);
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
      query.amountInINR = {};
      if (minAmount) query.amountInINR.$gte = parseFloat(minAmount);
      if (maxAmount) query.amountInINR.$lte = parseFloat(maxAmount);
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [expenses, total] = await Promise.all([
      CompanyExpense.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      CompanyExpense.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        expenses,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching company expenses:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch expenses'
    });
  }
};

/**
 * @desc    Get single expense by ID
 * @route   GET /api/company-expenses/:id
 * @access  Private
 */
exports.getExpenseById = async (req, res) => {
  try {
    const expense = await CompanyExpense.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    logger.error('Error fetching expense:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch expense'
    });
  }
};

/**
 * @desc    Update expense
 * @route   PUT /api/company-expenses/:id
 * @access  Private
 */
exports.updateExpense = async (req, res) => {
  try {
    const expense = await CompanyExpense.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== 'userId' && key !== '_id') {
        expense[key] = req.body[key];
      }
    });

    // Handle new file attachments
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size,
        fileType: req.body.fileType || 'Receipt'
      }));
      expense.attachments = [...expense.attachments, ...newAttachments];
    }

    expense.metadata.lastModifiedBy = req.user.email;
    await expense.save();

    logger.info(`Company expense updated: ${expense._id} by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Expense updated successfully',
      data: expense
    });
  } catch (error) {
    logger.error('Error updating expense:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update expense'
    });
  }
};

/**
 * @desc    Delete expense
 * @route   DELETE /api/company-expenses/:id
 * @access  Private
 */
exports.deleteExpense = async (req, res) => {
  try {
    const expense = await CompanyExpense.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Delete associated files
    for (const attachment of expense.attachments) {
      try {
        await fs.unlink(attachment.path);
      } catch (err) {
        logger.warn(`Failed to delete file: ${attachment.path}`);
      }
    }

    await expense.deleteOne();

    logger.info(`Company expense deleted: ${req.params.id} by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting expense:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete expense'
    });
  }
};

/**
 * @desc    Delete attachment from expense
 * @route   DELETE /api/company-expenses/:id/attachments/:attachmentId
 * @access  Private
 */
exports.deleteAttachment = async (req, res) => {
  try {
    const expense = await CompanyExpense.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    const attachment = expense.attachments.id(req.params.attachmentId);
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    // Delete file from filesystem
    try {
      await fs.unlink(attachment.path);
    } catch (err) {
      logger.warn(`Failed to delete file: ${attachment.path}`);
    }

    expense.attachments.pull(req.params.attachmentId);
    await expense.save();

    res.json({
      success: true,
      message: 'Attachment deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting attachment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete attachment'
    });
  }
};

/**
 * @desc    Get dashboard summary
 * @route   GET /api/company-expenses/dashboard/summary
 * @access  Private
 */
exports.getDashboardSummary = async (req, res) => {
  try {
    const summary = await CompanyExpense.getDashboardSummary(req.user._id);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Error fetching dashboard summary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch dashboard summary'
    });
  }
};

/**
 * @desc    Get expenses by category
 * @route   GET /api/company-expenses/analytics/by-category
 * @access  Private
 */
exports.getExpensesByCategory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    const data = await CompanyExpense.getExpensesByCategory(req.user._id, start, end);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error fetching expenses by category:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch category data'
    });
  }
};

/**
 * @desc    Get expenses by department
 * @route   GET /api/company-expenses/analytics/by-department
 * @access  Private
 */
exports.getExpensesByDepartment = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    const data = await CompanyExpense.getExpensesByDepartment(req.user._id, start, end);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error fetching expenses by department:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch department data'
    });
  }
};

/**
 * @desc    Get monthly trend
 * @route   GET /api/company-expenses/analytics/monthly-trend
 * @access  Private
 */
exports.getMonthlyTrend = async (req, res) => {
  try {
    const { months = 12 } = req.query;
    const data = await CompanyExpense.getMonthlyTrend(req.user._id, parseInt(months));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error fetching monthly trend:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch monthly trend'
    });
  }
};

/**
 * @desc    Get top vendors
 * @route   GET /api/company-expenses/analytics/top-vendors
 * @access  Private
 */
exports.getTopVendors = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const data = await CompanyExpense.getTopVendors(req.user._id, parseInt(limit));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error fetching top vendors:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch vendor data'
    });
  }
};

/**
 * @desc    Generate expense report (PDF)
 * @route   POST /api/company-expenses/reports/generate
 * @access  Private
 */
exports.generateReport = async (req, res) => {
  try {
    const { startDate, endDate, format = 'pdf', includeCharts = true } = req.body;

    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    // Generate document password
    const password = await getUserDocumentPassword(req.user._id, User, FinancialProfile);

    // Fetch expenses
    const expenses = await CompanyExpense.getExpensesByDateRange(req.user._id, start, end);
    
    // Fetch analytics
    const [categoryData, departmentData, monthlyTrend, topVendors] = await Promise.all([
      CompanyExpense.getExpensesByCategory(req.user._id, start, end),
      CompanyExpense.getExpensesByDepartment(req.user._id, start, end),
      CompanyExpense.getMonthlyTrend(req.user._id, 12),
      CompanyExpense.getTopVendors(req.user._id, 10)
    ]);

    if (format === 'pdf') {
      return await generatePDFReport(res, expenses, {
        categoryData,
        departmentData,
        monthlyTrend,
        topVendors,
        startDate: start,
        endDate: end,
        user: req.user,
        includeCharts
      }, password);
    } else if (format === 'excel') {
      return await generateExcelReport(res, expenses, {
        categoryData,
        departmentData,
        monthlyTrend,
        topVendors,
        startDate: start,
        endDate: end,
        user: req.user
      }, password);
    }

    res.status(400).json({
      success: false,
      message: 'Invalid format specified'
    });
  } catch (error) {
    logger.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate report'
    });
  }
};

/**
 * Helper function to generate PDF report
 * Note: PDFKit doesn't support native password protection.
 * For password-protected PDFs, consider using pdf-lib or hummus post-processing
 */
async function generatePDFReport(res, expenses, analytics, password) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  
  const filename = `Company_Expenses_Report_${Date.now()}.pdf`;
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Document-Password', password); // Send password in header for client info
  
  doc.pipe(res);

  // Title
  doc.fontSize(20).font('Helvetica-Bold').text('Company Expense Report', { align: 'center' });
  doc.moveDown(0.5);
  
  // Date range
  doc.fontSize(12).font('Helvetica').text(
    `Period: ${analytics.startDate.toLocaleDateString()} - ${analytics.endDate.toLocaleDateString()}`,
    { align: 'center' }
  );
  doc.moveDown(0.5);
  doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(2);

  // Summary Section
  doc.fontSize(16).font('Helvetica-Bold').text('Summary');
  doc.moveDown(0.5);
  
  const totalAmount = expenses.reduce((sum, exp) => sum + (exp.amountInINR || exp.amount), 0);
  const avgAmount = expenses.length > 0 ? totalAmount / expenses.length : 0;
  
  doc.fontSize(11).font('Helvetica');
  doc.text(`Total Expenses: ${expenses.length}`);
  doc.text(`Total Amount: ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  doc.text(`Average Expense: ₹${avgAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  doc.moveDown(2);

  // Category Breakdown
  if (analytics.categoryData && analytics.categoryData.length > 0) {
    doc.fontSize(16).font('Helvetica-Bold').text('Expenses by Category');
    doc.moveDown(0.5);
    
    analytics.categoryData.slice(0, 10).forEach((cat, index) => {
      doc.fontSize(10).font('Helvetica');
      doc.text(`${index + 1}. ${cat._id}: ₹${cat.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${cat.count} expenses)`);
    });
    doc.moveDown(2);
  }

  // Department Breakdown
  if (analytics.departmentData && analytics.departmentData.length > 0) {
    doc.fontSize(16).font('Helvetica-Bold').text('Expenses by Department');
    doc.moveDown(0.5);
    
    analytics.departmentData.forEach((dept, index) => {
      doc.fontSize(10).font('Helvetica');
      doc.text(`${index + 1}. ${dept._id}: $${dept.totalAmount.toFixed(2)} (${dept.count} expenses)`);
    });
    doc.moveDown(2);
  }

  // Top Vendors
  if (analytics.topVendors && analytics.topVendors.length > 0) {
    doc.addPage();
    doc.fontSize(16).font('Helvetica-Bold').text('Top Vendors');
    doc.moveDown(0.5);
    
    analytics.topVendors.forEach((vendor, index) => {
      doc.fontSize(10).font('Helvetica');
      doc.text(`${index + 1}. ${vendor._id}: $${vendor.totalAmount.toFixed(2)} (${vendor.count} transactions)`);
    });
    doc.moveDown(2);
  }

  // Detailed Expenses Table
  if (expenses.length > 0) {
    doc.addPage();
    doc.fontSize(16).font('Helvetica-Bold').text('Detailed Expenses');
    doc.moveDown(1);
    
    // Table headers
    const tableTop = doc.y;
    const colWidths = { date: 80, description: 180, category: 100, amount: 80 };
    
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Date', 50, tableTop, { width: colWidths.date });
    doc.text('Description', 130, tableTop, { width: colWidths.description });
    doc.text('Category', 310, tableTop, { width: colWidths.category });
    doc.text('Amount', 410, tableTop, { width: colWidths.amount, align: 'right' });
    
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Table rows
    expenses.slice(0, 50).forEach((expense, index) => {
      const y = doc.y;
      
      // Check if we need a new page
      if (y > 700) {
        doc.addPage();
        doc.moveDown(1);
      }
      
      doc.fontSize(8).font('Helvetica');
      doc.text(new Date(expense.expenseDate).toLocaleDateString(), 50, doc.y, { width: colWidths.date });
      doc.text(expense.description.substring(0, 40), 130, y, { width: colWidths.description });
      doc.text(expense.category, 310, y, { width: colWidths.category });
      doc.text(`$${expense.amount.toFixed(2)}`, 410, y, { width: colWidths.amount, align: 'right' });
      
      doc.moveDown(0.8);
    });
  }

  // Footer
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).font('Helvetica').text(
      `Page ${i + 1} of ${pageCount}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    );
  }

  doc.end();
}

/**
 * Helper function to generate Excel report
 */
async function generateExcelReport(res, expenses, analytics, password) {
  const workbook = new ExcelJS.Workbook();
  
  // Add workbook protection with password
  workbook.model = {
    ...workbook.model,
    workbookProtection: {
      lockStructure: true,
      password: password
    }
  };
  
  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 }
  ];

  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const avgAmount = expenses.length > 0 ? totalAmount / expenses.length : 0;

  summarySheet.addRows([
    { metric: 'Report Period', value: `${analytics.startDate.toLocaleDateString()} - ${analytics.endDate.toLocaleDateString()}` },
    { metric: 'Total Expenses', value: expenses.length },
    { metric: 'Total Amount', value: `$${totalAmount.toFixed(2)}` },
    { metric: 'Average Expense', value: `$${avgAmount.toFixed(2)}` },
    { metric: 'Generated', value: new Date().toLocaleString() }
  ]);

  // Expenses Sheet
  const expensesSheet = workbook.addWorksheet('Expenses');
  expensesSheet.columns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Description', key: 'description', width: 30 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Amount', key: 'amount', width: 12 },
    { header: 'Payment Method', key: 'paymentMethod', width: 15 },
    { header: 'Payment Status', key: 'paymentStatus', width: 15 },
    { header: 'Vendor', key: 'vendor', width: 25 },
    { header: 'Project', key: 'project', width: 20 }
  ];

  expenses.forEach(expense => {
    expensesSheet.addRow({
      date: new Date(expense.expenseDate).toLocaleDateString(),
      description: expense.description,
      category: expense.category,
      department: expense.department,
      amount: expense.amount,
      paymentMethod: expense.paymentMethod,
      paymentStatus: expense.paymentStatus,
      vendor: expense.vendor?.name || '',
      project: expense.project || ''
    });
  });

  // Category Analysis Sheet
  if (analytics.categoryData && analytics.categoryData.length > 0) {
    const categorySheet = workbook.addWorksheet('By Category');
    categorySheet.columns = [
      { header: 'Category', key: 'category', width: 25 },
      { header: 'Total Amount', key: 'totalAmount', width: 15 },
      { header: 'Count', key: 'count', width: 10 },
      { header: 'Average', key: 'average', width: 15 }
    ];

    analytics.categoryData.forEach(cat => {
      categorySheet.addRow({
        category: cat._id,
        totalAmount: cat.totalAmount,
        count: cat.count,
        average: cat.avgAmount
      });
    });
  }

  // Department Analysis Sheet
  if (analytics.departmentData && analytics.departmentData.length > 0) {
    const deptSheet = workbook.addWorksheet('By Department');
    deptSheet.columns = [
      { header: 'Department', key: 'department', width: 25 },
      { header: 'Total Amount', key: 'totalAmount', width: 15 },
      { header: 'Count', key: 'count', width: 10 }
    ];

    analytics.departmentData.forEach(dept => {
      deptSheet.addRow({
        department: dept._id,
        totalAmount: dept.totalAmount,
        count: dept.count
      });
    });
  }

  // Send response
  const filename = `Company_Expenses_Report_${Date.now()}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Document-Password', password); // Send password in header for client info
  
  await workbook.xlsx.write(res);
  res.end();
}

/**
 * @desc    Download attachment
 * @route   GET /api/company-expenses/:id/attachments/:attachmentId/download
 * @access  Private
 */
exports.downloadAttachment = async (req, res) => {
  try {
    const expense = await CompanyExpense.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    const attachment = expense.attachments.id(req.params.attachmentId);
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    res.download(attachment.path, attachment.originalName);
  } catch (error) {
    logger.error('Error downloading attachment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to download attachment'
    });
  }
};
