import { useState } from 'react';
import axios from 'axios';
import { API_URL as API_BASE } from '../../../services/api';
import { showPasswordNotification, extractPasswordFromResponse, downloadFileWithPassword } from '../../../utils/documentPasswordNotification';

const API_URL = API_BASE;

export const useEMIHandlers = ({
  fetchAllData,
  setError,
  setSyncing,
  setSyncDialogOpen,
  setUpcomingPayments,
  upcomingPayments,
  userProfile
}) => {
  // Manual EMI State
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
  const [manualEMILoading, setManualEMILoading] = useState(false);
  const [editEMIDialogOpen, setEditEMIDialogOpen] = useState(false);

  // Export State
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportDateRange, setExportDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 6, 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 12, 0).toISOString().split('T')[0]
  });

  // Confirmation Dialog State
  const [confirmationDialog, setConfirmationDialog] = useState({
    open: false,
    title: '',
    message: '',
    confirmAction: () => {},
    emiDetails: null
  });

  const handleSyncStatements = async () => {
    if (!userProfile?.gmailConnected) {
      const errorMsg = 'Gmail not connected. Please connect Gmail in your Profile settings first.';
      setError(errorMsg);
      alert(errorMsg);
      setSyncDialogOpen(false);
      return;
    }

    setSyncing(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/emi/sync-statements`,
        { maxResults: 50 },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSyncDialogOpen(false);
      fetchAllData();
      alert(response.data.message || 'Statements synced successfully!');
    } catch (err) {
      console.error('Error syncing statements:', err);
      const errorMessage = err.response?.data?.message || 'Failed to sync statements.';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setSyncing(false);
    }
  };

  const handleManualEMIChange = (field, value) => {
    setManualEMIData(prev => ({ ...prev, [field]: value }));
    if (manualEMIErrors[field]) {
      setManualEMIErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateManualEMI = () => {
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

  const handleCreateManualEMI = async () => {
    if (!validateManualEMI()) return;

    setManualEMILoading(true);

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/emi/manual`,
        manualEMIData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('EMI created successfully!');
      handleCloseManualEMIDialog();
      fetchAllData();
    } catch (err) {
      console.error('Error creating manual EMI:', err);
      const errorMessage = err.response?.data?.message || 'Failed to create EMI';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setManualEMILoading(false);
    }
  };

  const handleCloseManualEMIDialog = () => {
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

  const handleDeleteEMI = async (selectedEMI) => {
    if (!selectedEMI) return;

    try {
      const token = localStorage.getItem('token');
      const deletedEmiId = selectedEMI.id;
      
      await axios.delete(
        `${API_URL}/emi/${deletedEmiId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (upcomingPayments && upcomingPayments.monthlyBreakdown) {
        const updatedBreakdown = upcomingPayments.monthlyBreakdown.map(month => ({
          ...month,
          emis: month.emis.filter(emi => emi.emiId !== deletedEmiId),
          emiCount: month.emis.filter(emi => emi.emiId !== deletedEmiId).length,
          totalAmount: month.emis
            .filter(emi => emi.emiId !== deletedEmiId)
            .reduce((sum, emi) => sum + emi.amount, 0)
        })).filter(month => month.emiCount > 0);

        setUpcomingPayments({
          ...upcomingPayments,
          monthlyBreakdown: updatedBreakdown
        });
      }

      alert('EMI deleted successfully!');
      fetchAllData();
    } catch (err) {
      console.error('Error deleting EMI:', err);
      alert('Failed to delete EMI');
    }
  };

  const handleMarkAsPaid = async (emiId, installmentNumber, emiDetails) => {
    setConfirmationDialog({
      open: true,
      title: 'Mark Payment as Paid',
      message: `Are you sure you want to mark this EMI payment as paid?`,
      confirmAction: async () => {
        try {
          const token = localStorage.getItem('token');
          await axios.post(
            `${API_URL}/emi/${emiId}/mark-paid`,
            { installmentNumber, paidDate: new Date().toISOString() },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (upcomingPayments && upcomingPayments.monthlyBreakdown) {
            const updatedBreakdown = upcomingPayments.monthlyBreakdown.map(month => ({
              ...month,
              emis: month.emis.filter(emi => emi.emiId !== emiId || emi.installmentNumber !== installmentNumber),
              emiCount: month.emis.filter(emi => emi.emiId !== emiId || emi.installmentNumber !== installmentNumber).length,
              totalAmount: month.emis
                .filter(emi => emi.emiId !== emiId || emi.installmentNumber !== installmentNumber)
                .reduce((sum, emi) => sum + emi.amount, 0)
            })).filter(month => month.emiCount > 0);

            setUpcomingPayments({
              ...upcomingPayments,
              monthlyBreakdown: updatedBreakdown
            });
          }

          setConfirmationDialog(prev => ({
            ...prev,
            open: true,
            title: 'Success',
            message: 'Payment marked as paid!',
            isSuccess: true,
            confirmAction: () => {
              setConfirmationDialog(prev => ({ ...prev, open: false }));
            }
          }));

          fetchAllData();
        } catch (err) {
          console.error('Error marking payment as paid:', err);
          setConfirmationDialog(prev => ({
            ...prev,
            title: 'Error',
            message: 'Failed to mark payment as paid. Please try again.',
            isError: true
          }));
        }
      },
      emiDetails
    });
  };

  const handleExportReport = async () => {
    setExportLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        startDate: exportDateRange.startDate,
        endDate: exportDateRange.endDate
      });
      
      let password = null;
      let filename = '';
      
      if (exportFormat === 'pdf') {
        const response = await axios.get(`${API_URL}/emi/export/pdf?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        });
        
        password = extractPasswordFromResponse(response);
        filename = `EMI_Report_${exportDateRange.startDate}_to_${exportDateRange.endDate}.pdf`;
        downloadFileWithPassword(new Blob([response.data]), filename, password);
        
      } else if (exportFormat === 'excel') {
        const response = await axios.get(`${API_URL}/emi/export/excel?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        });
        
        password = extractPasswordFromResponse(response);
        filename = `EMI_Report_${exportDateRange.startDate}_to_${exportDateRange.endDate}.xlsx`;
        downloadFileWithPassword(new Blob([response.data]), filename, password);
        
      } else if (exportFormat === 'csv') {
        const response = await axios.get(`${API_URL}/emi/export/csv?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        });
        
        filename = `EMI_Report_${exportDateRange.startDate}_to_${exportDateRange.endDate}.csv`;
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
      
      alert('Report exported successfully!');
    } catch (err) {
      console.error('Error exporting report:', err);
      alert(err.response?.data?.message || 'Failed to export report');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportMonthlyTrends = async (format) => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        months: 6,
        format: format
      });
      
      const response = await axios.get(`${API_URL}/emi/monthly-trends/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const password = extractPasswordFromResponse(response);
      const fileExtension = format === 'pdf' ? 'pdf' : 'xlsx';
      const fileName = `Monthly_Trends_6months_${new Date().toISOString().slice(0, 10)}.${fileExtension}`;
      
      downloadFileWithPassword(new Blob([response.data]), fileName, password);
      
      setError(null);
    } catch (err) {
      console.error('Error exporting monthly trends:', err);
      setError(err.response?.data?.message || 'Failed to export monthly trends');
      alert('Failed to export report. Please try again.');
    }
  };

  return {
    manualEMIData,
    manualEMIErrors,
    manualEMILoading,
    editEMIDialogOpen,
    setEditEMIDialogOpen,
    exportFormat,
    setExportFormat,
    exportLoading,
    exportDateRange,
    setExportDateRange,
    confirmationDialog,
    setConfirmationDialog,
    handleSyncStatements,
    handleManualEMIChange,
    handleCreateManualEMI,
    handleCloseManualEMIDialog,
    handleDeleteEMI,
    handleMarkAsPaid,
    handleExportReport,
    handleExportMonthlyTrends
  };
};
