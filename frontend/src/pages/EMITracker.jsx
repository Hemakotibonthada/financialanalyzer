import React, { useState, useEffect } from 'react';
import { Box, Container, CircularProgress, Alert } from '@mui/material';
import Sidebar from '../components/Sidebar';
import EMIMonthlyTrends from '../components/EMIMonthlyTrends';

// Import custom hooks
import { useEMIData } from './EMI/hooks/useEMIData';
import { useUserProfile } from './EMI/hooks/useUserProfile';
import { useLoansGiven } from './EMI/hooks/useLoansGiven';
import { usePersonalLoans } from './EMI/hooks/usePersonalLoans';

// Import components
import EMIHeader from './EMI/components/EMIHeader';
import OverviewCards from './EMI/components/OverviewCards';
import InsightsSection from './EMI/components/InsightsSection';
import EMITabs from './EMI/components/EMITabs';

// Import tabs (we'll create these)
import OverviewTab from './EMI/tabs/OverviewTab';
import MonthlyTrendsTab from './EMI/tabs/MonthlyTrendsTab';
import ReportsTab from './EMI/tabs/ReportsTab';
import UpcomingPaymentsTab from './EMI/tabs/UpcomingPaymentsTab';
import ActiveEMIsTab from './EMI/tabs/ActiveEMIsTab';
import CompletedEMIsTab from './EMI/tabs/CompletedEMIsTab';
import LoansGivenTab from './EMI/tabs/LoansGivenTab';
import PersonalLoansTab from './EMI/tabs/PersonalLoansTab';

// Import dialogs
import SyncDialog from './EMI/dialogs/SyncDialog';
import ManualEMIDialog from './EMI/dialogs/ManualEMIDialog';
import DeleteConfirmDialog from './EMI/dialogs/DeleteConfirmDialog';
import ExportDialog from './EMI/dialogs/ExportDialog';
import EMIDetailDialog from './EMI/dialogs/EMIDetailDialog';
import ConfirmationDialog from './EMI/dialogs/ConfirmationDialog';
import LoanGivenDialog from './EMI/dialogs/LoanGivenDialog';
import RepaymentDialog from './EMI/dialogs/RepaymentDialog';
import PersonalLoanDialog from './EMI/dialogs/PersonalLoanDialog';
import PersonalLoanRepaymentDialog from './EMI/dialogs/PersonalLoanRepaymentDialog';

// Import handlers
import { useEMIHandlers } from './EMI/handlers/emiHandlers';
import { useLoansGivenHandlers } from './EMI/handlers/loansGivenHandlers';
import { usePersonalLoansHandlers } from './EMI/handlers/personalLoansHandlers';

const EMITracker = () => {
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState(12);
  const [animateCards, setAnimateCards] = useState(false);
  const [trendsMonths, setTrendsMonths] = useState(6);
  const [upcomingMonthsToShow, setUpcomingMonthsToShow] = useState(1);
  const [syncing, setSyncing] = useState(false);

  // Dialog states
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [manualEMIDialogOpen, setManualEMIDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [emiDetailOpen, setEmiDetailOpen] = useState(false);
  const [selectedEMI, setSelectedEMI] = useState(null);
  const [selectedEmiChartData, setSelectedEmiChartData] = useState(null);

  // Custom hooks
  const { userProfile } = useUserProfile();
  const {
    loading,
    error,
    setError,
    overview,
    upcomingPayments,
    setUpcomingPayments,
    chartData,
    insights,
    monthlyTrends,
    trendsLoading,
    fetchAllData,
    fetchMonthlyTrends
  } = useEMIData(selectedPeriod, trendsMonths);

  const {
    loansGiven,
    loansGivenSummary,
    loansGivenLoading,
    fetchLoansGiven
  } = useLoansGiven();

  const {
    personalLoans,
    personalLoansSummary,
    personalLoansLoading,
    fetchPersonalLoans
  } = usePersonalLoans();

  // EMI handlers
  const emiHandlers = useEMIHandlers({
    fetchAllData,
    setError,
    setSyncing,
    setSyncDialogOpen,
    setUpcomingPayments,
    upcomingPayments,
    userProfile,
    setManualEMIDialogOpen
  });

  // Loans Given handlers
  const loansGivenHandlers = useLoansGivenHandlers({
    fetchLoansGiven
  });

  // Personal Loans handlers
  const personalLoansHandlers = usePersonalLoansHandlers({
    fetchPersonalLoans
  });

  // Effects
  useEffect(() => {
    setTimeout(() => setAnimateCards(true), 100);
  }, []);

  useEffect(() => {
    if (activeTab === 6) {
      fetchLoansGiven();
    }
    if (activeTab === 7) {
      fetchPersonalLoans();
    }
  }, [activeTab]);

  useEffect(() => {
    if (!selectedEMI) {
      setSelectedEmiChartData(null);
      return;
    }

    const schedule = selectedEMI.schedule && selectedEMI.schedule.length ? selectedEMI.schedule : null;
    if (schedule) {
      const data = schedule.map(s => ({
        name: `#${s.installmentNumber}`,
        dueDate: s.dueDate,
        amount: s.amount,
        paid: !!s.paid
      }));
      setSelectedEmiChartData(data);
      return;
    }

    const tenure = parseInt(selectedEMI.totalTenure || 0, 10);
    const amt = parseFloat(selectedEMI.emiAmount || 0);
    if (tenure > 0 && amt > 0) {
      const data = Array.from({ length: tenure }).map((_, idx) => ({
        name: `#${idx + 1}`,
        dueDate: null,
        amount: amt,
        paid: idx < (selectedEMI.paidInstallments || 0)
      }));
      setSelectedEmiChartData(data);
      return;
    }

    setSelectedEmiChartData(null);
  }, [selectedEMI]);

  if (loading && !overview) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="400px"
        sx={{
          '& .MuiCircularProgress-root': {
            animation: 'pulse 1.5s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1, transform: 'scale(1)' },
              '50%': { opacity: 0.7, transform: 'scale(1.1)' }
            }
          }
        }}
      >
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  return (
    <>
      <Sidebar />
      <Box className="lg:ml-72 min-h-screen bg-gray-50">
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4, px: { xs: 2, sm: 3 } }}>
          
          <EMIHeader
            loading={loading}
            syncing={syncing}
            onRefresh={fetchAllData}
            onExport={() => setExportDialogOpen(true)}
            onAddManual={() => setManualEMIDialogOpen(true)}
            onSync={() => setSyncDialogOpen(true)}
          />

          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }} 
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <OverviewCards 
            overview={overview} 
            animateCards={animateCards}
            personalLoansSummary={personalLoansSummary}
          />

          <InsightsSection insights={insights} />

          <EMITabs 
            activeTab={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)} 
          />

          {/* Tab Content */}
          {activeTab === 0 && (
            <OverviewTab 
              chartData={chartData}
              upcomingPayments={upcomingPayments}
            />
          )}

          {activeTab === 1 && (
            <MonthlyTrendsTab
              monthlyTrends={monthlyTrends}
              trendsMonths={trendsMonths}
              setTrendsMonths={setTrendsMonths}
              trendsLoading={trendsLoading}
              onExport={emiHandlers.handleExportMonthlyTrends}
            />
          )}

          {activeTab === 2 && (
            <ReportsTab 
              chartData={chartData}
              selectedPeriod={selectedPeriod}
              setSelectedPeriod={setSelectedPeriod}
            />
          )}

          {activeTab === 3 && (
            <UpcomingPaymentsTab
              overview={overview}
              upcomingMonthsToShow={upcomingMonthsToShow}
              setUpcomingMonthsToShow={setUpcomingMonthsToShow}
              onMarkAsPaid={emiHandlers.handleMarkAsPaid}
            />
          )}

          {activeTab === 4 && (
            <ActiveEMIsTab
              overview={overview}
              onEMIClick={(emi) => {
                setSelectedEMI(emi);
                setEmiDetailOpen(true);
              }}
              onDelete={(emi) => {
                setSelectedEMI(emi);
                setDeleteConfirmOpen(true);
              }}
              onMarkAsPaid={emiHandlers.handleMarkAsPaid}
            />
          )}

          {activeTab === 5 && (
            <CompletedEMIsTab 
              overview={overview}
              onEMIClick={(emi) => {
                setSelectedEMI(emi);
                setEmiDetailOpen(true);
              }}
              onExport={() => setExportDialogOpen(true)}
            />
          )}

          {activeTab === 6 && (
            <LoansGivenTab
              loansGiven={loansGiven}
              loansGivenSummary={loansGivenSummary}
              loansGivenLoading={loansGivenLoading}
              handlers={loansGivenHandlers}
            />
          )}

          {activeTab === 7 && (
            <PersonalLoansTab
              personalLoans={personalLoans}
              personalLoansSummary={personalLoansSummary}
              personalLoansLoading={personalLoansLoading}
              handlers={personalLoansHandlers}
            />
          )}

        </Container>
      </Box>

      {/* Dialogs */}
      <SyncDialog
        open={syncDialogOpen}
        onClose={() => setSyncDialogOpen(false)}
        onSync={emiHandlers.handleSyncStatements}
        syncing={syncing}
        userProfile={userProfile}
      />

      <ManualEMIDialog
        open={manualEMIDialogOpen}
        onClose={emiHandlers.handleCloseManualEMIDialog}
        onCreate={emiHandlers.handleSaveEMI}
        data={emiHandlers.manualEMIData}
        errors={emiHandlers.manualEMIErrors}
        loading={emiHandlers.manualEMILoading}
        onChange={emiHandlers.handleManualEMIChange}
      />

      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setSelectedEMI(null);
        }}
        onConfirm={emiHandlers.handleDeleteEMI}
        selectedEMI={selectedEMI}
      />

      <ExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        onExport={emiHandlers.handleExportReport}
        exportFormat={emiHandlers.exportFormat}
        setExportFormat={emiHandlers.setExportFormat}
        dateRange={emiHandlers.exportDateRange}
        setDateRange={emiHandlers.setExportDateRange}
        loading={emiHandlers.exportLoading}
      />

      <EMIDetailDialog
        open={emiDetailOpen}
        onClose={() => setEmiDetailOpen(false)}
        selectedEMI={selectedEMI}
        selectedEmiChartData={selectedEmiChartData}
        onEdit={() => {
          emiHandlers.handleEditEMI(selectedEMI);
          setEmiDetailOpen(false);
        }}
        onDelete={() => {
          setDeleteConfirmOpen(true);
          setEmiDetailOpen(false);
        }}
        onMarkPaid={emiHandlers.handleMarkAsPaid}
      />

      <ConfirmationDialog
        dialog={emiHandlers.confirmationDialog}
        onClose={() => emiHandlers.setConfirmationDialog(prev => ({ ...prev, open: false }))}
      />

      <LoanGivenDialog
        {...loansGivenHandlers.loanGivenDialogProps}
      />

      <RepaymentDialog
        {...loansGivenHandlers.repaymentDialogProps}
      />

      <PersonalLoanDialog
        {...personalLoansHandlers.personalLoanDialogProps}
      />

      <PersonalLoanRepaymentDialog
        {...personalLoansHandlers.repaymentDialogProps}
      />
    </>
  );
};

export default EMITracker;
