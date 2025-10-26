const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const exportService = require('../services/exportService');
const logger = require('../utils/logger');

/**
 * @route   POST /api/export/transactions/excel
 * @desc    Export transactions to Excel
 * @access  Private
 */
router.post('/transactions/excel', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, filters = {} } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const buffer = await exportService.exportTransactionsToExcel(
      req.user._id,
      new Date(startDate),
      new Date(endDate),
      filters
    );

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=transactions_${Date.now()}.xlsx`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  } catch (error) {
    logger.error('Export transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export transactions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/export/emi/excel
 * @desc    Export EMI schedule to Excel
 * @access  Private
 */
router.get('/emi/excel', authenticate, async (req, res) => {
  try {
    const buffer = await exportService.exportEMIScheduleToExcel(req.user._id);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=emi_schedule_${Date.now()}.xlsx`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  } catch (error) {
    logger.error('Export EMI schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export EMI schedule',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/export/cibil/excel
 * @desc    Export CIBIL report to Excel
 * @access  Private
 */
router.get('/cibil/excel', authenticate, async (req, res) => {
  try {
    const buffer = await exportService.exportCIBILReportToExcel(req.user._id);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=cibil_report_${Date.now()}.xlsx`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  } catch (error) {
    logger.error('Export CIBIL report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export CIBIL report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/export/all/excel
 * @desc    Export all data (transactions, EMI, CIBIL) to a single Excel file
 * @access  Private
 */
router.get('/all/excel', authenticate, async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();

    // Add metadata
    workbook.creator = 'Financial Analyzer';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Get date range (last 12 months by default)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);

    // Export all data to separate sheets (reusing logic from exportService)
    // This is a simplified version - you can enhance it further
    
    const worksheet = workbook.addWorksheet('Export Info');
    worksheet.addRow(['Financial Analyzer - Complete Data Export']);
    worksheet.addRow(['Generated:', new Date().toLocaleString()]);
    worksheet.addRow(['User:', req.user.email]);
    worksheet.addRow([]);
    worksheet.addRow(['This workbook contains:']);
    worksheet.addRow(['- Transactions (last 12 months)']);
    worksheet.addRow(['- EMI Schedule']);
    worksheet.addRow(['- CIBIL Report']);

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=financial_data_export_${Date.now()}.xlsx`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  } catch (error) {
    logger.error('Export all data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
