import React, { useState, useEffect } from 'react';
import { X, Upload, Paperclip, Trash2, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-toastify';
import CurrencyInput from './CurrencyInput';
import { createCurrencyData } from '../utils/currency';

const ExpenseFormModal = ({ isOpen, onClose, expense, onSuccess }) => {
  const [formData, setFormData] = useState({
    expenseDate: '',
    category: '',
    subcategory: '',
    description: '',
    amount: '',
    currency: 'INR',
    amountInINR: 0,
    exchangeRate: 1,
    vendorName: '',
    vendorEmail: '',
    vendorPhone: '',
    paymentMethod: 'Credit Card',
    paymentStatus: 'Paid',
    invoiceNumber: '',
    referenceNumber: '',
    project: '',
    department: 'General',
    budgetId: '', // Link to budget
    isBillable: false,
    isRecurring: false,
    recurringFrequency: 'Monthly',
    tags: '',
    notes: '',
    taxDeductible: false,
    taxPercentage: 0,
    reimbursable: false
  });

  const [files, setFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [budgets, setBudgets] = useState([]);

  // Fetch budgets for dropdown
  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        const response = await api.get('/company-expenses/budgets');
        setBudgets(response.data.budgets || []);
      } catch (error) {
        console.error('Error fetching budgets:', error);
      }
    };
    if (isOpen) {
      fetchBudgets();
    }
  }, [isOpen]);

  useEffect(() => {
    if (expense) {
      // Populate form with existing expense data
      setFormData({
        expenseDate: expense.expenseDate ? new Date(expense.expenseDate).toISOString().split('T')[0] : '',
        category: expense.category || '',
        subcategory: expense.subcategory || '',
        description: expense.description || '',
        amount: expense.amount || '',
        currency: expense.currency || 'INR',
        amountInINR: expense.amountInINR || 0,
        exchangeRate: expense.exchangeRate || 1,
        vendorName: expense.vendor?.name || '',
        vendorEmail: expense.vendor?.email || '',
        vendorPhone: expense.vendor?.phone || '',
        paymentMethod: expense.paymentMethod || 'Credit Card',
        paymentStatus: expense.paymentStatus || 'Paid',
        invoiceNumber: expense.invoiceNumber || '',
        referenceNumber: expense.referenceNumber || '',
        project: expense.project || '',
        department: expense.department || 'General',
        budgetId: expense.budgetId || '',
        isBillable: expense.isBillable || false,
        isRecurring: expense.isRecurring || false,
        recurringFrequency: expense.recurringDetails?.frequency || 'Monthly',
        tags: expense.tags?.join(', ') || '',
        notes: expense.notes || '',
        taxDeductible: expense.taxDeductible || false,
        taxPercentage: expense.taxPercentage || 0,
        reimbursable: expense.reimbursable || false
      });
      setExistingAttachments(expense.attachments || []);
    } else {
      // Set default date to today
      setFormData(prev => ({
        ...prev,
        expenseDate: new Date().toISOString().split('T')[0]
      }));
    }
  }, [expense]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (fileList) => {
    const newFiles = Array.from(fileList);
    
    // Check total file count
    const totalFiles = files.length + newFiles.length;
    if (totalFiles > 5) {
      toast.error(`Maximum 5 files allowed. You have ${files.length} files already.`);
      return;
    }
    
    // Validate each file
    const validFiles = newFiles.filter(file => {
      const maxSize = 10 * 1024 * 1024; // 10MB per file
      if (file.size > maxSize) {
        toast.error(`File "${file.name}" is too large. Maximum size is 10MB.`);
        return false;
      }
      
      // Check file type
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast.error(`File "${file.name}" type not supported. Only images, PDFs, and Office documents allowed.`);
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} file(s) added successfully`);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingAttachment = async (attachmentId) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;

    try {
      await api.delete(`/company-expenses/${expense._id}/attachments/${attachmentId}`);
      setExistingAttachments(prev => prev.filter(att => att._id !== attachmentId));
      toast.success('Attachment deleted successfully');
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Failed to delete attachment');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields before submission
    if (!formData.description || !formData.description.trim()) {
      toast.error('Please enter a description');
      return;
    }
    if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!formData.category || !formData.category.trim()) {
      toast.error('Please select a category');
      return;
    }
    
    setLoading(true);

    try {
      const submitData = new FormData();

      // Append required fields first to ensure they're included
      submitData.append('description', formData.description.trim());
      submitData.append('amount', formData.amount);
      submitData.append('category', formData.category);
      
      // Append other basic fields
      submitData.append('expenseDate', formData.expenseDate || new Date().toISOString().split('T')[0]);
      submitData.append('paymentMethod', formData.paymentMethod || 'Credit Card');
      submitData.append('paymentStatus', formData.paymentStatus || 'Paid');
      submitData.append('department', formData.department || 'General');
      submitData.append('currency', formData.currency || 'INR');
      
      // Append optional fields only if they have values
      if (formData.subcategory) submitData.append('subcategory', formData.subcategory);
      if (formData.invoiceNumber) submitData.append('invoiceNumber', formData.invoiceNumber);
      if (formData.referenceNumber) submitData.append('referenceNumber', formData.referenceNumber);
      if (formData.project) submitData.append('project', formData.project);
      if (formData.notes) submitData.append('notes', formData.notes);
      if (formData.amountInINR) submitData.append('amountInINR', formData.amountInINR);
      if (formData.exchangeRate) submitData.append('exchangeRate', formData.exchangeRate);
      if (formData.taxPercentage) submitData.append('taxPercentage', formData.taxPercentage);
      if (formData.budgetId) submitData.append('budgetId', formData.budgetId);
      
      // Append boolean fields
      submitData.append('isBillable', formData.isBillable || false);
      submitData.append('isRecurring', formData.isRecurring || false);
      submitData.append('taxDeductible', formData.taxDeductible || false);
      submitData.append('reimbursable', formData.reimbursable || false);

      // Append vendor data if provided
      if (formData.vendorName || formData.vendorEmail || formData.vendorPhone) {
        submitData.append('vendor', JSON.stringify({
          name: formData.vendorName || '',
          email: formData.vendorEmail || '',
          phone: formData.vendorPhone || ''
        }));
      }
      
      // Append tags if provided
      if (formData.tags) {
        const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(t => t);
        if (tagsArray.length > 0) {
          submitData.append('tags', JSON.stringify(tagsArray));
        }
      }
      
      // Append recurring details if applicable
      if (formData.isRecurring && formData.recurringFrequency) {
        submitData.append('recurringDetails', JSON.stringify({
          frequency: formData.recurringFrequency,
          startDate: formData.expenseDate
        }));
      }

      // Append files
      files.forEach(file => {
        submitData.append('attachments', file);
      });

      console.log('Submitting expense with fields:', Array.from(submitData.keys()));

      let response;
      try {
        if (expense) {
          // Update existing expense
          response = await api.put(`/company-expenses/${expense._id}`, submitData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
          toast.success('Expense updated successfully');
        } else {
          // Create new expense
          response = await api.post('/company-expenses', submitData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
          toast.success('Expense created successfully');
        }
        
        onSuccess(response.data.data);
        onClose();
      } catch (uploadError) {
        // If upload with files fails and we have files, try without them using JSON
        if (files.length > 0 && uploadError.response?.status === 400) {
          console.log('File upload failed, retrying without attachments using JSON...');
          toast.warning('File upload failed. Saving expense without attachments...');
          
          // Create JSON data without files
          const jsonData = {
            description: formData.description.trim(),
            amount: parseFloat(formData.amount),
            category: formData.category,
            date: formData.expenseDate || new Date().toISOString().split('T')[0],
            paymentMethod: formData.paymentMethod || 'Credit Card',
            paymentStatus: formData.paymentStatus || 'Paid',
            department: formData.department || 'General',
            currency: formData.currency || 'INR',
            isBillable: formData.isBillable || false,
            isRecurring: formData.isRecurring || false,
            taxDeductible: formData.taxDeductible || false,
            reimbursable: formData.reimbursable || false
          };
          
          // Add optional fields
          if (formData.subcategory) jsonData.subcategory = formData.subcategory;
          if (formData.invoiceNumber) jsonData.invoiceNumber = formData.invoiceNumber;
          if (formData.referenceNumber) jsonData.referenceNumber = formData.referenceNumber;
          if (formData.project) jsonData.project = formData.project;
          if (formData.notes) jsonData.notes = formData.notes;
          if (formData.amountInINR) jsonData.amountInINR = parseFloat(formData.amountInINR);
          if (formData.exchangeRate) jsonData.exchangeRate = parseFloat(formData.exchangeRate);
          if (formData.taxPercentage) jsonData.taxPercentage = parseFloat(formData.taxPercentage);
          if (formData.budgetId) jsonData.budgetId = formData.budgetId;
          
          // Add vendor if provided
          if (formData.vendorName || formData.vendorEmail || formData.vendorPhone) {
            jsonData.vendor = {
              name: formData.vendorName || '',
              email: formData.vendorEmail || '',
              phone: formData.vendorPhone || ''
            };
          }
          
          // Add tags if provided
          if (formData.tags) {
            const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(t => t);
            if (tagsArray.length > 0) {
              jsonData.tags = tagsArray;
            }
          }
          
          // Add recurring details if applicable
          if (formData.isRecurring && formData.recurringFrequency) {
            jsonData.recurringDetails = {
              frequency: formData.recurringFrequency,
              startDate: formData.expenseDate || new Date().toISOString().split('T')[0]
            };
          }
          
          try {
            if (expense) {
              response = await api.put(`/company-expenses/${expense._id}`, jsonData);
            } else {
              response = await api.post('/company-expenses', jsonData);
            }
            
            toast.success('Expense saved without attachments. Please configure storage CORS to enable file uploads.');
            onSuccess(response.data.data);
            onClose();
            return;
          } catch (retryError) {
            console.error('Retry without files also failed:', retryError);
            throw retryError; // Fall through to main error handler
          }
        }
        throw uploadError; // Re-throw if not a file upload issue
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save expense';
      toast.error(errorMessage);
      
      // Log detailed error for debugging
      if (error.response?.data) {
        console.error('Server response:', error.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {expense ? 'Edit Expense' : 'Add New Expense'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    name="expenseDate"
                    value={formData.expenseDate}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select Category</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Equipment & Hardware">Equipment & Hardware</option>
                    <option value="Software & Subscriptions">Software & Subscriptions</option>
                    <option value="Marketing & Advertising">Marketing & Advertising</option>
                    <option value="Travel & Transportation">Travel & Transportation</option>
                    <option value="Meals & Entertainment">Meals & Entertainment</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Rent & Facilities">Rent & Facilities</option>
                    <option value="Salaries & Wages">Salaries & Wages</option>
                    <option value="Professional Services">Professional Services</option>
                    <option value="Training & Development">Training & Development</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Taxes & Licenses">Taxes & Licenses</option>
                    <option value="Communication">Communication</option>
                    <option value="Maintenance & Repairs">Maintenance & Repairs</option>
                    <option value="Inventory & Raw Materials">Inventory & Raw Materials</option>
                    <option value="Shipping & Delivery">Shipping & Delivery</option>
                    <option value="Legal & Compliance">Legal & Compliance</option>
                    <option value="Banking & Finance Charges">Banking & Finance Charges</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    placeholder="Brief description of the expense"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <CurrencyInput
                    label="Amount"
                    value={formData.amount}
                    currency={formData.currency}
                    onChange={(currencyData) => {
                      setFormData(prev => ({
                        ...prev,
                        amount: currencyData.amount,
                        currency: currencyData.currency,
                        amountInINR: currencyData.amountInINR,
                        exchangeRate: currencyData.exchangeRate
                      }));
                    }}
                    required
                    showConversion
                  />
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Wire Transfer">Wire Transfer</option>
                    <option value="Check">Check</option>
                    <option value="PayPal">PayPal</option>
                    <option value="Venmo">Venmo</option>
                    <option value="UPI">UPI</option>
                    <option value="Digital Wallet">Digital Wallet</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Status *
                  </label>
                  <select
                    name="paymentStatus"
                    value={formData.paymentStatus}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    name="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={handleChange}
                    placeholder="INV-12345"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    name="referenceNumber"
                    value={formData.referenceNumber}
                    onChange={handleChange}
                    placeholder="REF-12345"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Vendor Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Name
                  </label>
                  <input
                    type="text"
                    name="vendorName"
                    value={formData.vendorName}
                    onChange={handleChange}
                    placeholder="ABC Company"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Email
                  </label>
                  <input
                    type="email"
                    name="vendorEmail"
                    value={formData.vendorEmail}
                    onChange={handleChange}
                    placeholder="vendor@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Phone
                  </label>
                  <input
                    type="tel"
                    name="vendorPhone"
                    value={formData.vendorPhone}
                    onChange={handleChange}
                    placeholder="+1 234 567 8900"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Organization Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="General">General</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Operations">Operations</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Finance">Finance</option>
                    <option value="Legal">Legal</option>
                    <option value="Customer Support">Customer Support</option>
                    <option value="Research & Development">Research & Development</option>
                    <option value="IT">IT</option>
                    <option value="Administration">Administration</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <select
                    name="budgetId"
                    value={formData.budgetId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">No Budget</option>
                    {budgets.map(budget => (
                      <option key={budget.id} value={budget.id}>
                        {budget.name} - {budget.department} ({budget.status})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Link this expense to a budget for tracking</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project
                  </label>
                  <input
                    type="text"
                    name="project"
                    value={formData.project}
                    onChange={handleChange}
                    placeholder="Project Alpha"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Tax & Additional Options */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Options</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="taxDeductible"
                      checked={formData.taxDeductible}
                      onChange={handleChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Tax Deductible
                    </label>
                  </div>

                  {formData.taxDeductible && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax Percentage
                      </label>
                      <input
                        type="number"
                        name="taxPercentage"
                        value={formData.taxPercentage}
                        onChange={handleChange}
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isBillable"
                      checked={formData.isBillable}
                      onChange={handleChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Billable to Client
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="reimbursable"
                      checked={formData.reimbursable}
                      onChange={handleChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Reimbursable
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isRecurring"
                      checked={formData.isRecurring}
                      onChange={handleChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Recurring Expense
                    </label>
                  </div>

                  {formData.isRecurring && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Frequency
                      </label>
                      <select
                        name="recurringFrequency"
                        value={formData.recurringFrequency}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="Daily">Daily</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Yearly">Yearly</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    name="tags"
                    value={formData.tags}
                    onChange={handleChange}
                    placeholder="urgent, office, hardware"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Additional notes about this expense..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h3>
              
              {/* Existing Attachments */}
              {existingAttachments.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Current Attachments:</p>
                  <div className="space-y-2">
                    {existingAttachments.map((attachment) => (
                      <div key={attachment._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Paperclip className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700">{attachment.originalName}</span>
                          <span className="text-xs text-gray-500">
                            ({(attachment.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExistingAttachment(attachment._id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Area */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center ${
                  dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
                }`}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-600 mb-2">
                  Drag and drop files here, or click to select
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Supported: Images, PDFs, Documents (Max 10MB each)
                </p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer inline-block"
                >
                  Select Files
                </label>
              </div>

              {/* New Files List */}
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">New Attachments:</p>
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Paperclip className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center space-x-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>{expense ? 'Update' : 'Create'} Expense</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseFormModal;
