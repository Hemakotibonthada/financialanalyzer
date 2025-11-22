import React, { useState, useEffect } from 'react';
import { X, Users, Building, Mail, Phone, DollarSign, Calendar, AlertCircle, Percent } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-toastify';

const InvestorFormModal = ({ isOpen, onClose, investor, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'Individual',
    email: '',
    phone: '',
    company: '',
    designation: '',
    investmentAmount: '',
    equityPercentage: '',
    investmentDate: new Date().toISOString().split('T')[0],
    investmentType: 'Equity',
    preferredShares: '',
    commonShares: '',
    valuationCap: '',
    discountRate: '',
    vestingPeriod: '',
    cliffPeriod: '',
    boardSeat: false,
    votingRights: true,
    liquidationPreference: 'Non-Participating',
    antiDilution: 'Weighted Average',
    address: '',
    city: '',
    state: '',
    country: 'India',
    postalCode: '',
    panNumber: '',
    taxId: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    notes: '',
    status: 'Active',
    tags: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const investorTypes = [
    'Individual',
    'Angel Investor',
    'Venture Capital',
    'Private Equity',
    'Corporate Investor',
    'Family Office',
    'Institutional Investor',
    'Strategic Partner'
  ];

  const investmentTypes = [
    'Equity',
    'Convertible Note',
    'SAFE',
    'Preferred Stock',
    'Common Stock',
    'Debt',
    'Revenue Share',
    'Hybrid'
  ];

  const liquidationPreferences = [
    'Non-Participating',
    '1x Participating',
    '2x Participating',
    '3x Participating',
    'Full Participating'
  ];

  const antiDilutionOptions = [
    'None',
    'Full Ratchet',
    'Weighted Average',
    'Broad-Based Weighted Average',
    'Narrow-Based Weighted Average'
  ];

  const statusOptions = [
    'Active',
    'Pending',
    'Exited',
    'Inactive'
  ];

  useEffect(() => {
    if (investor) {
      setFormData({
        name: investor.name || '',
        type: investor.type || 'Individual',
        email: investor.email || '',
        phone: investor.phone || '',
        company: investor.company || '',
        designation: investor.designation || '',
        investmentAmount: investor.investmentAmount || '',
        equityPercentage: investor.equityPercentage || '',
        investmentDate: investor.investmentDate ? new Date(investor.investmentDate).toISOString().split('T')[0] : '',
        investmentType: investor.investmentType || 'Equity',
        preferredShares: investor.preferredShares || '',
        commonShares: investor.commonShares || '',
        valuationCap: investor.valuationCap || '',
        discountRate: investor.discountRate || '',
        vestingPeriod: investor.vestingPeriod || '',
        cliffPeriod: investor.cliffPeriod || '',
        boardSeat: investor.boardSeat || false,
        votingRights: investor.votingRights !== undefined ? investor.votingRights : true,
        liquidationPreference: investor.liquidationPreference || 'Non-Participating',
        antiDilution: investor.antiDilution || 'Weighted Average',
        address: investor.address || '',
        city: investor.city || '',
        state: investor.state || '',
        country: investor.country || 'India',
        postalCode: investor.postalCode || '',
        panNumber: investor.panNumber || '',
        taxId: investor.taxId || '',
        bankName: investor.bankName || '',
        accountNumber: investor.accountNumber || '',
        ifscCode: investor.ifscCode || '',
        notes: investor.notes || '',
        status: investor.status || 'Active',
        tags: investor.tags?.join(', ') || ''
      });
    }
  }, [investor]);

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
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Investor name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    if (!formData.investmentAmount || parseFloat(formData.investmentAmount) <= 0) {
      newErrors.investmentAmount = 'Valid investment amount is required';
    }

    if (formData.equityPercentage && (parseFloat(formData.equityPercentage) < 0 || parseFloat(formData.equityPercentage) > 100)) {
      newErrors.equityPercentage = 'Equity percentage must be between 0 and 100';
    }

    if (!formData.investmentDate) {
      newErrors.investmentDate = 'Investment date is required';
    }

    if (formData.discountRate && (parseFloat(formData.discountRate) < 0 || parseFloat(formData.discountRate) > 100)) {
      newErrors.discountRate = 'Discount rate must be between 0 and 100';
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

      const investorData = {
        ...formData,
        investorType: formData.type, // Backend expects 'investorType', frontend uses 'type'
        hasBoardSeat: formData.boardSeat, // Backend expects 'hasBoardSeat', frontend uses 'boardSeat'
        hasVotingRights: formData.votingRights, // Backend expects 'hasVotingRights', frontend uses 'votingRights'
        investmentAmount: parseFloat(formData.investmentAmount),
        equityPercentage: formData.equityPercentage ? parseFloat(formData.equityPercentage) : null,
        preferredShares: formData.preferredShares ? parseInt(formData.preferredShares) : null,
        commonShares: formData.commonShares ? parseInt(formData.commonShares) : null,
        valuationCap: formData.valuationCap ? parseFloat(formData.valuationCap) : null,
        discountRate: formData.discountRate ? parseFloat(formData.discountRate) : null,
        vestingPeriod: formData.vestingPeriod ? parseInt(formData.vestingPeriod) : null,
        cliffPeriod: formData.cliffPeriod ? parseInt(formData.cliffPeriod) : null,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };

      if (investor?._id) {
        await api.put(`/company-expenses/investors/${investor._id}`, investorData);
        toast.success('Investor updated successfully');
      } else {
        await api.post('/company-expenses/investors', investorData);
        toast.success('Investor added successfully');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving investor:', error);
      toast.error(error.response?.data?.message || 'Failed to save investor');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {investor ? 'Edit Investor' : 'Add New Investor'}
              </h2>
              <p className="text-sm text-gray-600">
                Manage investor information and investment details
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
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Basic Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Investor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., John Doe or XYZ Ventures"
                  className={`w-full px-4 py-2 border ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Investor Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {investorTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="investor@example.com"
                    className={`w-full pl-10 pr-4 py-2 border ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className={`w-full pl-10 pr-4 py-2 border ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.phone}
                  </p>
                )}
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company/Organization
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Company name"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Designation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Designation/Title
                </label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  placeholder="Managing Partner, CEO, etc."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Investment Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              Investment Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Investment Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Investment Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="investmentAmount"
                  value={formData.investmentAmount}
                  onChange={handleChange}
                  placeholder="1000000"
                  min="0"
                  step="0.01"
                  className={`w-full px-4 py-2 border ${
                    errors.investmentAmount ? 'border-red-500' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                />
                {errors.investmentAmount && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.investmentAmount}
                  </p>
                )}
                {formData.investmentAmount && !errors.investmentAmount && (
                  <p className="mt-1 text-sm text-gray-600">
                    {formatCurrency(formData.investmentAmount)}
                  </p>
                )}
              </div>

              {/* Equity Percentage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Equity Percentage (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="equityPercentage"
                    value={formData.equityPercentage}
                    onChange={handleChange}
                    placeholder="10"
                    min="0"
                    max="100"
                    step="0.01"
                    className={`w-full px-4 py-2 border ${
                      errors.equityPercentage ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  />
                  <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                {errors.equityPercentage && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.equityPercentage}
                  </p>
                )}
              </div>

              {/* Investment Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Investment Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    name="investmentDate"
                    value={formData.investmentDate}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2 border ${
                      errors.investmentDate ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  />
                </div>
                {errors.investmentDate && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.investmentDate}
                  </p>
                )}
              </div>

              {/* Investment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Investment Type
                </label>
                <select
                  name="investmentType"
                  value={formData.investmentType}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {investmentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Preferred Shares */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Shares
                </label>
                <input
                  type="number"
                  name="preferredShares"
                  value={formData.preferredShares}
                  onChange={handleChange}
                  placeholder="1000"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Common Shares */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Common Shares
                </label>
                <input
                  type="number"
                  name="commonShares"
                  value={formData.commonShares}
                  onChange={handleChange}
                  placeholder="500"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Valuation Cap */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valuation Cap (₹)
                </label>
                <input
                  type="number"
                  name="valuationCap"
                  value={formData.valuationCap}
                  onChange={handleChange}
                  placeholder="50000000"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Discount Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Rate (%)
                </label>
                <input
                  type="number"
                  name="discountRate"
                  value={formData.discountRate}
                  onChange={handleChange}
                  placeholder="20"
                  min="0"
                  max="100"
                  step="0.01"
                  className={`w-full px-4 py-2 border ${
                    errors.discountRate ? 'border-red-500' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                />
                {errors.discountRate && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.discountRate}
                  </p>
                )}
              </div>

              {/* Vesting Period */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vesting Period (months)
                </label>
                <input
                  type="number"
                  name="vestingPeriod"
                  value={formData.vestingPeriod}
                  onChange={handleChange}
                  placeholder="48"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Cliff Period */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliff Period (months)
                </label>
                <input
                  type="number"
                  name="cliffPeriod"
                  value={formData.cliffPeriod}
                  onChange={handleChange}
                  placeholder="12"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Liquidation Preference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Liquidation Preference
                </label>
                <select
                  name="liquidationPreference"
                  value={formData.liquidationPreference}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {liquidationPreferences.map(pref => (
                    <option key={pref} value={pref}>{pref}</option>
                  ))}
                </select>
              </div>

              {/* Anti-Dilution */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Anti-Dilution Protection
                </label>
                <select
                  name="antiDilution"
                  value={formData.antiDilution}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {antiDilutionOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  name="boardSeat"
                  checked={formData.boardSeat}
                  onChange={handleChange}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Board Seat</span>
                  <p className="text-xs text-gray-500">Investor has a seat on the board of directors</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  name="votingRights"
                  checked={formData.votingRights}
                  onChange={handleChange}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Voting Rights</span>
                  <p className="text-xs text-gray-500">Investor has voting rights in company decisions</p>
                </div>
              </label>
            </div>
          </div>

          {/* Address & Tax Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Address & Tax Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street address"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="City"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State/Province
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="State"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="India"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Postal Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postal Code
                </label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  placeholder="400001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* PAN Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PAN Number
                </label>
                <input
                  type="text"
                  name="panNumber"
                  value={formData.panNumber}
                  onChange={handleChange}
                  placeholder="ABCDE1234F"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Tax ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax ID/EIN
                </label>
                <input
                  type="text"
                  name="taxId"
                  value={formData.taxId}
                  onChange={handleChange}
                  placeholder="Tax identification number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Banking Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Banking Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Bank Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  placeholder="HDFC Bank"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  placeholder="XXXXXXXXXXXX"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* IFSC Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  name="ifscCode"
                  value={formData.ifscCode}
                  onChange={handleChange}
                  placeholder="HDFC0001234"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Additional Information
            </h3>

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
                placeholder="Additional notes about the investor or investment terms..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="angel, seed-round, strategic (comma separated)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
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
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Users className="w-5 h-5" />
                  {investor ? 'Update Investor' : 'Add Investor'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InvestorFormModal;
