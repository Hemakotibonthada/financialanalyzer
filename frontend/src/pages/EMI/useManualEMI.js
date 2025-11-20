import { useState } from 'react';
import * as api from './apiHandlers';

export const useManualEMI = (onSuccess) => {
  const [manualEMIDialogOpen, setManualEMIDialogOpen] = useState(false);
  const [manualEMILoading, setManualEMILoading] = useState(false);
  const [manualEMIData, setManualEMIData] = useState({
    cardProvider: '',
    customProviderName: '',
    cardLastFourDigits: '',
    cardHolderName: '',
    merchantName: '',
    productDescription: '',
    category: 'electronics',
    invoiceNumber: '',
    principalAmount: '',
    interestRate: '',
    processingFee: '',
    prepaymentCharges: '',
    emiAmount: '',
    totalTenure: '',
    repaymentType: 'MONTHLY',
    startDate: new Date().toISOString().split('T')[0],
    reminderDate: '',
    lenderContact: '',
    loanAccountNumber: '',
    insuranceIncluded: 'no',
    autoDebit: 'no',
    notes: '',
    tags: []
  });
  const [manualEMIErrors, setManualEMIErrors] = useState({});

  const handleOpen = () => {
    setManualEMIDialogOpen(true);
    setManualEMIErrors({});
  };

  const handleClose = () => {
    setManualEMIDialogOpen(false);
    setManualEMIData({
      cardProvider: '',
      customProviderName: '',
      cardLastFourDigits: '',
      cardHolderName: '',
      merchantName: '',
      productDescription: '',
      category: 'electronics',
      invoiceNumber: '',
      principalAmount: '',
      interestRate: '',
      processingFee: '',
      prepaymentCharges: '',
      emiAmount: '',
      totalTenure: '',
      repaymentType: 'MONTHLY',
      startDate: new Date().toISOString().split('T')[0],
      reminderDate: '',
      lenderContact: '',
      loanAccountNumber: '',
      insuranceIncluded: 'no',
      autoDebit: 'no',
      notes: '',
      tags: []
    });
    setManualEMIErrors({});
  };

  const handleChange = (field, value) => {
    setManualEMIData(prev => ({
      ...prev,
      [field]: value
    }));
    if (manualEMIErrors[field]) {
      setManualEMIErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validate = () => {
    const errors = {};
    
    if (!manualEMIData.cardProvider) errors.cardProvider = 'Card provider is required';
    if (manualEMIData.cardProvider === 'OTHER' && !manualEMIData.customProviderName) {
      errors.customProviderName = 'Provider name is required when selecting OTHER';
    }
    if (!manualEMIData.cardLastFourDigits) {
      errors.cardLastFourDigits = 'Card last 4 digits required';
    } else if (!/^\d{4}$/.test(manualEMIData.cardLastFourDigits)) {
      errors.cardLastFourDigits = 'Must be exactly 4 digits';
    }
    if (!manualEMIData.cardHolderName) errors.cardHolderName = 'Card holder name is required';
    if (!manualEMIData.merchantName) errors.merchantName = 'Merchant name is required';
    if (!manualEMIData.principalAmount || parseFloat(manualEMIData.principalAmount) <= 0) {
      errors.principalAmount = 'Valid principal amount required';
    }
    
    if (manualEMIData.repaymentType === 'MONTHLY') {
      if (!manualEMIData.emiAmount || parseFloat(manualEMIData.emiAmount) <= 0) {
        errors.emiAmount = 'Valid EMI amount required';
      }
      if (!manualEMIData.totalTenure || parseInt(manualEMIData.totalTenure) <= 0) {
        errors.totalTenure = 'Valid tenure required';
      }
    }
    
    if (!manualEMIData.startDate) errors.startDate = 'Start date is required';
    
    setManualEMIErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;

    setManualEMILoading(true);

    try {
      await api.createManualEMI(manualEMIData);
      alert('EMI created successfully!');
      handleClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to create EMI';
      alert(errorMessage);
    } finally {
      setManualEMILoading(false);
    }
  };

  return {
    manualEMIDialogOpen,
    manualEMILoading,
    manualEMIData,
    manualEMIErrors,
    handleOpen,
    handleClose,
    handleChange,
    handleCreate
  };
};
