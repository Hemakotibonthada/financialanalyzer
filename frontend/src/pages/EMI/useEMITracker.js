import { useState, useEffect } from 'react';
import * as api from './apiHandlers';

export const useEMITracker = () => {
  // Core State
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [overview, setOverview] = useState(null);
  const [upcomingPayments, setUpcomingPayments] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [insights, setInsights] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(12);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [animateCards, setAnimateCards] = useState(false);

  // Monthly Trends State
  const [monthlyTrends, setMonthlyTrends] = useState(null);
  const [trendsMonths, setTrendsMonths] = useState(6);
  const [trendsLoading, setTrendsLoading] = useState(false);

  // EMI Detail State
  const [selectedEMI, setSelectedEMI] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editEMIDialogOpen, setEditEMIDialogOpen] = useState(false);
  const [emiDetailOpen, setEmiDetailOpen] = useState(false);
  const [selectedEmiChartData, setSelectedEmiChartData] = useState(null);

  // Upcoming Payments State
  const [upcomingMonthsToShow, setUpcomingMonthsToShow] = useState(1);

  // Confirmation Dialog State
  const [confirmationDialog, setConfirmationDialog] = useState({
    open: false,
    title: '',
    message: '',
    confirmAction: () => {},
    emiDetails: null
  });

  // Export State
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportDateRange, setExportDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 6, 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 12, 0).toISOString().split('T')[0]
  });

  // Fetch Functions
  const loadUserProfile = async () => {
    try {
      const profile = await api.fetchUserProfile();
      setUserProfile(profile);
    } catch (err) {
      // Silent fail for profile
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.fetchAllData(selectedPeriod);
      setOverview(data.overview);
      setUpcomingPayments(data.upcomingPayments);
      setChartData(data.chartData);
      setInsights(data.insights);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch EMI data');
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyTrends = async (months = 6) => {
    setTrendsLoading(true);
    try {
      const data = await api.fetchMonthlyTrends(months);
      setMonthlyTrends(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch monthly trends');
    } finally {
      setTrendsLoading(false);
    }
  };

  const handleExportTrends = async (format) => {
    try {
      await api.handleExportMonthlyTrends(format, trendsMonths);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to export monthly trends');
      alert('Failed to export report. Please try again.');
    }
  };

  const handleSync = async () => {
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
      await api.syncStatements(50);
      setSyncDialogOpen(false);
      loadAllData();
      alert('Statements synced successfully!');
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to sync statements';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      await api.exportReport(exportFormat, exportDateRange);
      setExportDialogOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to export report');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEMI) return;

    try {
      const deletedEmiId = selectedEMI.id;
      await api.deleteEMI(deletedEmiId);

      // Update UI immediately
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
      setDeleteConfirmOpen(false);
      setSelectedEMI(null);
      loadAllData();
    } catch (err) {
      alert('Failed to delete EMI');
    }
  };

  const handleMarkPaid = async (emiId, installmentNumber, emiDetails) => {
    setConfirmationDialog({
      open: true,
      title: 'Confirm Payment',
      message: `Mark installment #${installmentNumber} as paid?`,
      emiDetails,
      confirmAction: async () => {
        try {
          await api.markPaymentAsPaid(emiId, installmentNumber);
          setConfirmationDialog({ ...confirmationDialog, open: false });
          loadAllData();
          alert('Payment marked as paid successfully!');
        } catch (err) {
          alert(err.response?.data?.message || 'Failed to mark payment as paid');
        }
      }
    });
  };

  return {
    // State
    loading,
    syncing,
    error,
    activeTab,
    overview,
    upcomingPayments,
    chartData,
    insights,
    selectedPeriod,
    syncDialogOpen,
    userProfile,
    animateCards,
    monthlyTrends,
    trendsMonths,
    trendsLoading,
    selectedEMI,
    deleteConfirmOpen,
    editEMIDialogOpen,
    emiDetailOpen,
    selectedEmiChartData,
    upcomingMonthsToShow,
    confirmationDialog,
    exportDialogOpen,
    exportFormat,
    exportLoading,
    exportDateRange,

    // Setters
    setError,
    setActiveTab,
    setSelectedPeriod,
    setSyncDialogOpen,
    setAnimateCards,
    setTrendsMonths,
    setSelectedEMI,
    setDeleteConfirmOpen,
    setEditEMIDialogOpen,
    setEmiDetailOpen,
    setSelectedEmiChartData,
    setUpcomingMonthsToShow,
    setConfirmationDialog,
    setExportDialogOpen,
    setExportFormat,
    setExportDateRange,

    // Functions
    loadUserProfile,
    loadAllData,
    loadMonthlyTrends,
    handleExportTrends,
    handleSync,
    handleExport,
    handleDelete,
    handleMarkPaid
  };
};
