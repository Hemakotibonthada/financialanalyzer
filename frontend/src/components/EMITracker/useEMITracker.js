import { useState } from 'react';
import * as api from './api';

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
  const [userProfile, setUserProfile] = useState(null);
  const [animateCards, setAnimateCards] = useState(false);

  // Monthly Trends State
  const [monthlyTrends, setMonthlyTrends] = useState(null);
  const [trendsMonths, setTrendsMonths] = useState(6);
  const [trendsLoading, setTrendsLoading] = useState(false);

  // Upcoming Payments State
  const [upcomingMonthsToShow, setUpcomingMonthsToShow] = useState(1);

  // Export State
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportDateRange, setExportDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 6, 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 12, 0).toISOString().split('T')[0]
  });

  // Dialog States
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [emiDetailOpen, setEmiDetailOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedEMI, setSelectedEMI] = useState(null);
  const [selectedEmiChartData, setSelectedEmiChartData] = useState(null);
  const [confirmationDialog, setConfirmationDialog] = useState({
    open: false,
    title: '',
    message: '',
    confirmAction: () => {},
    emiDetails: null
  });

  // Fetch Functions
  const fetchUserProfile = async () => {
    try {
      const data = await api.fetchUserProfile();
      setUserProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [overviewData, upcomingData, chartsData, insightsData] = await Promise.all([
        api.fetchOverview(),
        api.fetchUpcomingPayments(selectedPeriod),
        api.fetchCharts(),
        api.fetchInsights()
      ]);

      setOverview(overviewData);
      setUpcomingPayments(upcomingData);
      setChartData(chartsData);
      setInsights(insightsData);
    } catch (err) {
      console.error('Error fetching EMI data:', err);
      setError(err.response?.data?.message || 'Failed to fetch EMI data');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyTrends = async (months = 6) => {
    setTrendsLoading(true);
    try {
      const data = await api.fetchMonthlyTrends(months);
      setMonthlyTrends(data);
    } catch (err) {
      console.error('Error fetching monthly trends:', err);
      alert('Failed to fetch monthly trends');
    } finally {
      setTrendsLoading(false);
    }
  };

  const handleExportMonthlyTrends = async (format) => {
    try {
      const blob = await api.exportMonthlyTrends(format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `monthly-trends.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting monthly trends:', err);
      alert('Failed to export monthly trends');
    }
  };

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
      const response = await api.syncStatements(50);
      setSyncDialogOpen(false);
      fetchAllData();
      alert(response.message || 'Statements synced successfully!');
    } catch (err) {
      console.error('Error syncing statements:', err);
      const errorMessage = err.response?.data?.message || 'Failed to sync statements';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setSyncing(false);
    }
  };

  const handleExportReport = async () => {
    setExportLoading(true);
    try {
      const blob = await api.exportReport(exportFormat, exportDateRange);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const extension = exportFormat === 'excel' ? 'xlsx' : exportFormat;
      link.setAttribute('download', `emi-report.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setExportDialogOpen(false);
    } catch (err) {
      console.error('Error exporting report:', err);
      alert(err.response?.data?.message || 'Failed to export report');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteEMI = async () => {
    if (!selectedEMI) return;

    try {
      await api.deleteEMI(selectedEMI.id);
      setDeleteConfirmOpen(false);
      setEmiDetailOpen(false);
      setSelectedEMI(null);
      fetchAllData();
      alert('EMI deleted successfully!');
    } catch (err) {
      console.error('Error deleting EMI:', err);
      alert(err.response?.data?.message || 'Failed to delete EMI');
    }
  };

  const handleMarkAsPaid = async (emiId, installmentNumber, emiDetails) => {
    setConfirmationDialog({
      open: true,
      title: 'Confirm Payment',
      message: `Mark installment #${installmentNumber} as paid?`,
      emiDetails,
      confirmAction: async () => {
        try {
          await api.markPaymentAsPaid(emiId, installmentNumber);
          setConfirmationDialog({ ...confirmationDialog, open: false });
          fetchAllData();
          alert('Payment marked as paid successfully!');
        } catch (err) {
          console.error('Error marking payment as paid:', err);
          alert(err.response?.data?.message || 'Failed to mark payment as paid');
        }
      }
    });
  };

  const getDisplayedMonths = () => {
    if (!upcomingPayments?.upcoming) return [];
    const now = new Date();
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() + upcomingMonthsToShow, 0);
    return upcomingPayments.upcoming.filter(emi => {
      const dueDate = new Date(emi.nextDueDate);
      return dueDate <= cutoffDate;
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
    userProfile,
    animateCards,
    monthlyTrends,
    trendsMonths,
    trendsLoading,
    upcomingMonthsToShow,
    exportDialogOpen,
    exportFormat,
    exportLoading,
    exportDateRange,
    syncDialogOpen,
    emiDetailOpen,
    deleteConfirmOpen,
    selectedEMI,
    selectedEmiChartData,
    confirmationDialog,

    // Setters
    setError,
    setActiveTab,
    setSelectedPeriod,
    setAnimateCards,
    setTrendsMonths,
    setUpcomingMonthsToShow,
    setExportDialogOpen,
    setExportFormat,
    setExportDateRange,
    setSyncDialogOpen,
    setEmiDetailOpen,
    setDeleteConfirmOpen,
    setSelectedEMI,
    setSelectedEmiChartData,
    setConfirmationDialog,

    // Functions
    fetchUserProfile,
    fetchAllData,
    fetchMonthlyTrends,
    handleExportMonthlyTrends,
    handleSyncStatements,
    handleExportReport,
    handleDeleteEMI,
    handleMarkAsPaid,
    getDisplayedMonths
  };
};
