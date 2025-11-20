import React, { useEffect } from 'react';
import { Box, Container } from '@mui/material';
import Sidebar from '../components/Sidebar';
import EMIMonthlyTrends from '../components/EMIMonthlyTrends';
import { 
  useEMITracker, 
  useManualEMI, 
  useLoansGiven, 
  usePersonalLoans 
} from '../components/EMITracker';

// Import tab components (to be created separately)
import EMIHeader from '../components/EMITracker/EMIHeader';
import EMIOverviewTab from '../components/EMITracker/EMIOverviewTab';
import EMIUpcomingTab from '../components/EMITracker/EMIUpcomingTab';
import EMIReportsTab from '../components/EMITracker/EMIReportsTab';
import EMIInsightsTab from '../components/EMITracker/EMIInsightsTab';
import EMIDetailsTab from '../components/EMITracker/EMIDetailsTab';
import LoansGivenTab from '../components/EMITracker/LoansGivenTab';
import PersonalLoansTab from '../components/EMITracker/PersonalLoansTab';
import EMIDialogs from '../components/EMITracker/EMIDialogs';
import LoadingState from '../components/EMITracker/LoadingState';
import ErrorAlert from '../components/EMITracker/ErrorAlert';

const EMITracker = () => {
  // Main EMI Tracker Hook
  const emiTracker = useEMITracker();
  
  // Manual EMI Hook
  const manualEMI = useManualEMI(emiTracker.fetchAllData);
  
  // Loans Given Hook
  const loansGiven = useLoansGiven();
  
  // Personal Loans Hook
  const personalLoans = usePersonalLoans();

  // Initial data fetch
  useEffect(() => {
    emiTracker.fetchAllData();
    emiTracker.fetchUserProfile();
    emiTracker.fetchMonthlyTrends(emiTracker.trendsMonths);
    setTimeout(() => emiTracker.setAnimateCards(true), 100);
  }, [emiTracker.selectedPeriod, emiTracker.trendsMonths]);

  // Fetch loans when tab changes
  useEffect(() => {
    if (emiTracker.activeTab === 6) {
      loansGiven.fetchLoansGiven();
    }
    if (emiTracker.activeTab === 7) {
      personalLoans.fetchPersonalLoans();
    }
  }, [emiTracker.activeTab]);

  if (emiTracker.loading && !emiTracker.overview) {
    return <LoadingState />;
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f7fa' }}>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Container maxWidth="xl">
          {/* Header */}
          <EMIHeader 
            {...emiTracker}
            onOpenManualEMI={manualEMI.handleOpenManualEMIDialog}
          />

          {/* Error Alert */}
          {emiTracker.error && (
            <ErrorAlert 
              error={emiTracker.error} 
              onClose={() => emiTracker.setError(null)} 
            />
          )}

          {/* Tabs Content */}
          {emiTracker.activeTab === 0 && (
            <EMIOverviewTab {...emiTracker} />
          )}

          {emiTracker.activeTab === 1 && (
            <EMIUpcomingTab 
              {...emiTracker}
              onMarkAsPaid={emiTracker.handleMarkAsPaid}
            />
          )}

          {emiTracker.activeTab === 2 && (
            <EMIReportsTab {...emiTracker} />
          )}

          {emiTracker.activeTab === 3 && (
            <EMIInsightsTab {...emiTracker} />
          )}

          {emiTracker.activeTab === 4 && (
            <EMIMonthlyTrends 
              monthlyTrends={emiTracker.monthlyTrends}
              trendsMonths={emiTracker.trendsMonths}
              setTrendsMonths={emiTracker.setTrendsMonths}
              loading={emiTracker.trendsLoading}
              onRefresh={emiTracker.fetchMonthlyTrends}
              onExport={emiTracker.handleExportMonthlyTrends}
            />
          )}

          {emiTracker.activeTab === 5 && (
            <EMIDetailsTab {...emiTracker} />
          )}

          {emiTracker.activeTab === 6 && (
            <LoansGivenTab {...loansGiven} />
          )}

          {emiTracker.activeTab === 7 && (
            <PersonalLoansTab {...personalLoans} />
          )}

          {/* Dialogs */}
          <EMIDialogs 
            emiTracker={emiTracker}
            manualEMI={manualEMI}
            loansGiven={loansGiven}
            personalLoans={personalLoans}
          />
        </Container>
      </Box>
    </Box>
  );
};

export default EMITracker;
