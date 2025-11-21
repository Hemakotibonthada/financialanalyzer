import React, { useState, useEffect } from 'react';
import { X, CreditCard, DollarSign, Calendar, AlertCircle, FileText, Tag, Building, User } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-toastify';

const TransactionFormModal = ({ isOpen, onClose, transaction, onSuccess }) => {
  const [formData, setFormData] = useState({
    type: 'Income',
    category: 'Sales Revenue',
    amount: '',
    transactionDate: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: 'Bank Transfer',
    paymentStatus: 'Completed',
    referenceNumber: '',
    fromAccount: '',
    toAccount: '',
    partyName: '',
    partyType: 'Customer',
    invoiceNumber: '',
    poNumber: '',
    taxAmount: '',
    taxRate: '',
    discountAmount: '',
    discountPercentage: '',
    subtotal: '',
    totalAmount: '',
    currency: 'INR',
    exchangeRate: '1',
    notes: '',
    attachments: [],
    tags: '',
    recurring: false,
    recurringFrequency: 'Monthly',
    recurringEndDate: '',
    billable: false,
    project: '',
    department: '',
    costCenter: '',
    approvedBy: '',
    approvalDate: '',
    reconciled: false,
    reconciliationDate: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const transactionTypes = ['Income', 'Expense', 'Transfer'];

  const incomeCategories = [
    'Sales Revenue',
    'Service Revenue',
    'Investment Income',
    'Interest Income',
    'Rental Income',
    'Commission Income',
    'Dividend Income',
    'Capital Gains',
    'Other Income'
  ];

  const expenseCategories = [
    'Operating Expenses',
    'Salaries & Wages',
    'Rent',
    'Utilities',
    'Marketing & Advertising',
    'Office Supplies',
    'Technology',
    'Travel & Entertainment',
    'Professional Services',
    'Insurance',
    'Taxes',
    'Depreciation',
    'Interest Expense',
    'Other Expenses'
  ];

  const transferCategories = [
    'Internal Transfer',
    'Bank to Bank',
    'Cash Deposit',
    'Cash Withdrawal',
    'Investment Transfer',
    'Loan Disbursement',
    'Loan Repayment'
  ];

  const paymentMethods = [
    'Cash',
    'Bank Transfer',
    'Credit Card',
    'Debit Card',
    'Cheque',
    'UPI',
    'Net Banking',
    'Mobile Wallet',
    'Wire Transfer',
    'PayPal',
    'Cryptocurrency',
    'Other'
  ];

  const paymentStatuses = [
    'Pending',
    'Completed',
    'Failed',
    'Cancelled',
    'Refunded',
    'Processing',
    'On Hold'
  ];

  const partyTypes = [
    'Customer',
    'Vendor',
    'Supplier',
    'Employee',
    'Contractor',
    'Partner',
    'Investor',
    'Lender',
    'Government',
    'Other'
  ];

  const recurringFrequencies = [
    'Daily',
    'Weekly',
    'Bi-Weekly',
    'Monthly',
    'Quarterly',
    'Semi-Annually',
    'Annually'
  ];

  const departments = [
    'Sales',
    'Marketing',
    'Operations',
    'Finance',
    'HR',
    'IT',
    'Legal',
    'Administration',
    'R&D',
    'Customer Service'
  ];

  useEffect(() => {
    if (transaction) {
      setFormData({
        type: transaction.type || 'Income',
        category: transaction.category || 'Sales Revenue',
        amount: transaction.amount || '',
        transactionDate: transaction.transactionDate ? new Date(transaction.transactionDate).toISOString().split('T')[0] : '',
        description: transaction.description || '',
        paymentMethod: transaction.paymentMethod || 'Bank Transfer',
        paymentStatus: transaction.paymentStatus || 'Completed',
        referenceNumber: transaction.referenceNumber || '',
        fromAccount: transaction.fromAccount || '',
        toAccount: transaction.toAccount || '',
        partyName: transaction.partyName || '',
        partyType: transaction.partyType || 'Customer',
        invoiceNumber: transaction.invoiceNumber || '',
        poNumber: transaction.poNumber || '',
        taxAmount: transaction.taxAmount || '',
        taxRate: transaction.taxRate || '',
        discountAmount: transaction.discountAmount || '',
        discountPercentage: transaction.discountPercentage || '',
        subtotal: transaction.subtotal || '',
        totalAmount: transaction.totalAmount || '',
        currency: transaction.currency || 'INR',
        exchangeRate: transaction.exchangeRate || '1',
        notes: transaction.notes || '',
        attachments: transaction.attachments || [],
        tags: transaction.tags?.join(', ') || '',
        recurring: transaction.recurring || false,
        recurringFrequency: transaction.recurringFrequency || 'Monthly',
        recurringEndDate: transaction.recurringEndDate ? new Date(transaction.recurringEndDate).toISOString().split('T')[0] : '',
        billable: transaction.billable || false,
        project: transaction.project || '',
        department: transaction.department || '',
        costCenter: transaction.costCenter || '',
        approvedBy: transaction.approvedBy || '',
        approvalDate: transaction.approvalDate ? new Date(transaction.approvalDate).toISOString().split('T')[0] : '',
        reconciled: transaction.reconciled || false,
        reconciliationDate: transaction.reconciliationDate ? new Date(transaction.reconciliationDate).toISOString().split('T')[0] : ''
      });
    }
  }, [transaction]);

  const getCategoriesByType = () => {
    switch (formData.type) {
      case 'Income':
        return incomeCategories;
      case 'Expense':
        return expenseCategories;
      case 'Transfer':
        return transferCategories;
      default:
        return incomeCategories;
    }
  };

  const calculateTotals = () => {
    const amount = parseFloat(formData.amount) || 0;
    const taxRate = parseFloat(formData.taxRate) || 0;
    const discountPercentage = parseFloat(formData.discountPercentage) || 0;
    const discountAmount = parseFloat(formData.discountAmount) || 0;

    let subtotal = amount;
    let calculatedDiscount = discountAmount || (amount * discountPercentage / 100);
    let afterDiscount = subtotal - calculatedDiscount;
    let taxAmount = afterDiscount * taxRate / 100;
    let total = afterDiscount + taxAmount;

    setFormData(prev => ({
      ...prev,
      subtotal: subtotal.toFixed(2),
      discountAmount: calculatedDiscount.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      totalAmount: total.toFixed(2)
    }));
  };

  useEffect(() => {
    if (formData.amount || formData.taxRate || formData.discountPercentage || formData.discountAmount) {
      calculateTotals();
    }
  }, [formData.amount, formData.taxRate, formData.discountPercentage]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Reset category when type changes
    if (name === 'type') {
      const categories = type === 'Income' ? incomeCategories : 
                        type === 'Expense' ? expenseCategories : 
                        transferCategories;
      setFormData(prev => ({
        ...prev,
        category: categories[0]
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount is required';
    }

    if (!formData.transactionDate) {
      newErrors.transactionDate = 'Transaction date is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.type === 'Transfer') {
      if (!formData.fromAccount.trim()) {
        newErrors.fromAccount = 'From account is required for transfers';
      }
      if (!formData.toAccount.trim()) {
        newErrors.toAccount = 'To account is required for transfers';
      }
    }

    if (formData.taxRate && (parseFloat(formData.taxRate) < 0 || parseFloat(formData.taxRate) > 100)) {
      newErrors.taxRate = 'Tax rate must be between 0 and 100';
    }

    if (formData.discountPercentage && (parseFloat(formData.discountPercentage) < 0 || parseFloat(formData.discountPercentage) > 100)) {
      newErrors.discountPercentage = 'Discount percentage must be between 0 and 100';
    }

    if (formData.recurring && !formData.recurringEndDate) {
      newErrors.recurringEndDate = 'End date is required for recurring transactions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    try {
      setLoading(true);

      const transactionData = {
        ...formData,
        amount: parseFloat(formData.amount),
        taxAmount: formData.taxAmount ? parseFloat(formData.taxAmount) : null,
        taxRate: formData.taxRate ? parseFloat(formData.taxRate) : null,
        discountAmount: formData.discountAmount ? parseFloat(formData.discountAmount) : null,
        discountPercentage: formData.discountPercentage ? parseFloat(formData.discountPercentage) : null,
        subtotal: formData.subtotal ? parseFloat(formData.subtotal) : null,
        totalAmount: formData.totalAmount ? parseFloat(formData.totalAmount) : null,
        exchangeRate: formData.exchangeRate ? parseFloat(formData.exchangeRate) : 1,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };

      if (transaction?._id) {
        await api.put(`/company-expenses/transactions/${transaction._id}`, transactionData);
        toast.success('Transaction updated successfully');
      } else {
        await api.post('/company-expenses/transactions', transactionData);
        toast.success('Transaction added successfully');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error(error.response?.data?.message || 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {transaction ? 'Edit Transaction' : 'Add New Transaction'}
              </h2>
              <p className="text-sm text-gray-600">
                Track income, expenses, and transfers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Transaction Type & Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Transaction Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {transactionTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {getCategoriesByType().map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Transaction Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    name="transactionDate"
                    value={formData.transactionDate}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2 border ${
                      errors.transactionDate ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                </div>
                {errors.transactionDate && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.transactionDate}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="2"
                placeholder="Enter transaction description..."
                className={`w-full px-4 py-2 border ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none`}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.description}
                </p>
              )}
            </div>
          </div>

          {/* Amount & Calculations */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              Amount & Calculations
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="10000.00"
                  min="0"
                  step="0.01"
                  className={`w-full px-4 py-2 border ${
                    errors.amount ? 'border-red-500' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.amount}
                  </p>
                )}
              </div>

              {/* Discount Percentage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount (%)
                </label>
                <input
                  type="number"
                  name="discountPercentage"
                  value={formData.discountPercentage}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.01"
                  className={`w-full px-4 py-2 border ${
                    errors.discountPercentage ? 'border-red-500' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
                {errors.discountPercentage && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.discountPercentage}
                  </p>
                )}
              </div>

              {/* Tax Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  name="taxRate"
                  value={formData.taxRate}
                  onChange={handleChange}
                  placeholder="18"
                  min="0"
                  max="100"
                  step="0.01"
                  className={`w-full px-4 py-2 border ${
                    errors.taxRate ? 'border-red-500' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
                {errors.taxRate && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.taxRate}
                  </p>
                )}
              </div>

              {/* Total Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Amount (₹)
                </label>
                <input
                  type="text"
                  value={formData.totalAmount}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-semibold text-gray-900"
                />
                {formData.totalAmount && (
                  <p className="mt-1 text-sm text-gray-600">
                    {formatCurrency(formData.totalAmount)}
                  </p>
                )}
              </div>
            </div>

            {/* Calculation Breakdown */}
            {formData.amount && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Subtotal:</p>
                    <p className="font-semibold text-gray-900">{formatCurrency(formData.subtotal)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Discount:</p>
                    <p className="font-semibold text-orange-600">-{formatCurrency(formData.discountAmount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Tax:</p>
                    <p className="font-semibold text-gray-900">+{formatCurrency(formData.taxAmount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Final Total:</p>
                    <p className="font-bold text-blue-600 text-lg">{formatCurrency(formData.totalAmount)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Payment Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {paymentMethods.map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>

              {/* Payment Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Status
                </label>
                <select
                  name="paymentStatus"
                  value={formData.paymentStatus}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {paymentStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {/* Reference Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Number
                </label>
                <input
                  type="text"
                  name="referenceNumber"
                  value={formData.referenceNumber}
                  onChange={handleChange}
                  placeholder="TXN123456"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Transfer Details (shown only for Transfer type) */}
          {formData.type === 'Transfer' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Transfer Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* From Account */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Account <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fromAccount"
                    value={formData.fromAccount}
                    onChange={handleChange}
                    placeholder="Source account"
                    className={`w-full px-4 py-2 border ${
                      errors.fromAccount ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                  {errors.fromAccount && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.fromAccount}
                    </p>
                  )}
                </div>

                {/* To Account */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Account <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="toAccount"
                    value={formData.toAccount}
                    onChange={handleChange}
                    placeholder="Destination account"
                    className={`w-full px-4 py-2 border ${
                      errors.toAccount ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                  {errors.toAccount && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.toAccount}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Party Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Party Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Party Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Party Name
                </label>
                <input
                  type="text"
                  name="partyName"
                  value={formData.partyName}
                  onChange={handleChange}
                  placeholder="Customer/Vendor name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Party Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Party Type
                </label>
                <select
                  name="partyType"
                  value={formData.partyType}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {partyTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Invoice Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Number
                </label>
                <input
                  type="text"
                  name="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={handleChange}
                  placeholder="INV-001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* PO Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PO Number
                </label>
                <input
                  type="text"
                  name="poNumber"
                  value={formData.poNumber}
                  onChange={handleChange}
                  placeholder="PO-001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Project */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project
                </label>
                <input
                  type="text"
                  name="project"
                  value={formData.project}
                  onChange={handleChange}
                  placeholder="Project name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Recurring Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Recurring Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Recurring Checkbox */}
              <div className="md:col-span-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="recurring"
                    checked={formData.recurring}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Recurring Transaction</span>
                    <p className="text-xs text-gray-500">This transaction repeats automatically</p>
                  </div>
                </label>
              </div>

              {formData.recurring && (
                <>
                  {/* Recurring Frequency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frequency
                    </label>
                    <select
                      name="recurringFrequency"
                      value={formData.recurringFrequency}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {recurringFrequencies.map(freq => (
                        <option key={freq} value={freq}>{freq}</option>
                      ))}
                    </select>
                  </div>

                  {/* Recurring End Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="recurringEndDate"
                      value={formData.recurringEndDate}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 border ${
                        errors.recurringEndDate ? 'border-red-500' : 'border-gray-300'
                      } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                    {errors.recurringEndDate && (
                      <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.recurringEndDate}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Additional Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Billable */}
              <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  name="billable"
                  checked={formData.billable}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Billable</span>
                  <p className="text-xs text-gray-500">Can be invoiced to client</p>
                </div>
              </label>

              {/* Reconciled */}
              <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  name="reconciled"
                  checked={formData.reconciled}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Reconciled</span>
                  <p className="text-xs text-gray-500">Matched with bank statement</p>
                </div>
              </label>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                placeholder="Additional notes about this transaction..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="urgent, recurring, project-x (comma separated)"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">Separate tags with commas</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  {transaction ? 'Update Transaction' : 'Add Transaction'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionFormModal;
