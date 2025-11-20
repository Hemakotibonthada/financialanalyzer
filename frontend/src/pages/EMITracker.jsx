import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import {
  Box,
  Container,
  Grid,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as AccountBalanceIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  Add as AddIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  CalendarToday as CalendarIcon,
  Payment as PaymentIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';

// Import custom hooks
import { useEMIData, useMonthlyTrends, useLoansGiven, usePersonalLoans } from './EMI/hooks';

// Import utility functions
import { formatCurrency } from './EMI/utils/formatters';

// Import components
import StatCard from './EMI/components/StatCard';

// Import dialogs (to be created)
import ManualEMIDialog from './EMI/dialogs/ManualEMIDialog';
import SyncDialog from './EMI/dialogs/SyncDialog';
import ExportDialog from './EMI/dialogs/ExportDialog';

// Import tabs (to be created)
import OverviewTab from './EMI/tabs/OverviewTab';
import MonthlyTrendsTab from './EMI/tabs/MonthlyTrendsTab';
import ReportsTab from './EMI/tabs/ReportsTab';
import UpcomingPaymentsTab from './EMI/tabs/UpcomingPaymentsTab';
import ActiveEMIsTab from './EMI/tabs/ActiveEMIsTab';
import CompletedEMIsTab from './EMI/tabs/CompletedEMIsTab';
import LoansGivenTab from './EMI/tabs/LoansGivenTab';
import PersonalLoansTab from './EMI/tabs/PersonalLoansTab';

const EMITracker = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [userProfile, setUserProfile] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [manualEMIDialogOpen, setManualEMIDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Use custom hooks
  const emiData = useEMIData();
  const monthlyTrendsData = useMonthlyTrends();
  const loansGivenData = useLoansGiven();
  const personalLoansData = usePersonalLoans();

  useEffect(() => {
    fetchUserProfile();
    monthlyTrendsData.fetchMonthlyTrends(monthlyTrendsData.trendsMonths);
  }, [monthlyTrendsData.trendsMonths]);

  useEffect(() => {
    if (activeTab === 6) {
      loansGivenData.fetchLoansGiven();
    }
    if (activeTab === 7) {
      personalLoansData.fetchPersonalLoans();
    }
  }, [activeTab]);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const axios = require('axios');
      const API_URL = require('./EMI/hooks/useEMIData').API_URL;
      const response = await axios.get(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserProfile(response.data.data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  if (emiData.loading && !emiData.overview) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  return (
    <>
      <Sidebar />
      <Box className="lg:ml-72 min-h-screen bg-gray-50">
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4, px: { xs: 2, sm: 3 } }}>
          {/* Header */}
          <Box 
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 4,
              p: 4,
              mb: 4,
              boxShadow: '0 20px 60px rgba(102, 126, 234, 0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 800, color: 'white', mb: 1 }}>
                  💳 EMI Tracker
                </Typography>
                <Typography variant="subtitle1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  Track and manage all your EMI payments in one place
                </Typography>
              </Box>
              <Box display="flex" gap={2}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={emiData.fetchAllData}
                  disabled={emiData.loading}
                  sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
                >
                  Refresh
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<AssessmentIcon />}
                  onClick={() => setExportDialogOpen(true)}
                  sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
                >
                  Export Report
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setManualEMIDialogOpen(true)}
                  sx={{ background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' }}
                >
                  Add Manual EMI
                </Button>
                <Button
                  variant="contained"
                  startIcon={syncing ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <DownloadIcon />}
                  onClick={() => setSyncDialogOpen(true)}
                  disabled={syncing}
                  sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}
                >
                  {syncing ? 'Syncing...' : 'Sync Statements'}
                </Button>
              </Box>
            </Box>
          </Box>

          {emiData.error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => emiData.setError(null)}>
              {emiData.error}
            </Alert>
          )}

          {/* Overview Cards */}
          {emiData.overview && (
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Active EMIs"
                  value={emiData.overview.totalActiveEMIs || 0}
                  subtitle={`${emiData.overview.totalCompletedEMIs || 0} completed`}
                  icon={CreditCardIcon}
                  gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  animateCards={emiData.animateCards}
                  delay={0}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Outstanding Amount"
                  value={formatCurrency((emiData.overview.totalOutstanding || 0) + ((personalLoansData.personalLoansSummary?.totalOutstanding) || 0))}
                  subtitle="Total remaining debt"
                  icon={AccountBalanceIcon}
                  gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
                  animateCards={emiData.animateCards}
                  delay={100}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Monthly Burden"
                  value={formatCurrency(emiData.overview.totalMonthlyPayment || 0)}
                  subtitle="Paid monthly"
                  icon={TrendingUpIcon}
                  gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
                  animateCards={emiData.animateCards}
                  delay={200}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Total Paid"
                  value={formatCurrency(emiData.overview.totalPaid || 0)}
                  subtitle="Successfully paid"
                  icon={CheckCircleIcon}
                  gradient="linear-gradient(135deg, #30cfd0 0%, #330867 100%)"
                  animateCards={emiData.animateCards}
                  delay={300}
                />
              </Grid>
            </Grid>
          )}

          {/* Tabs */}
          <Box sx={{ mb: 4, bgcolor: 'white', borderRadius: 4, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label="Overview" icon={<AssessmentIcon />} iconPosition="start" />
              <Tab label="Monthly Trends" icon={<TrendingUpIcon />} iconPosition="start" />
              <Tab label="Reports" icon={<TrendingUpIcon />} iconPosition="start" />
              <Tab label="Upcoming Payments" icon={<CalendarIcon />} iconPosition="start" />
              <Tab label="Active EMIs" icon={<CreditCardIcon />} iconPosition="start" />
              <Tab label="Completed EMIs" icon={<CheckCircleIcon />} iconPosition="start" />
              <Tab label="Loans Given" icon={<PaymentIcon />} iconPosition="start" />
              <Tab label="Personal Loans" icon={<MoneyIcon />} iconPosition="start" />
            </Tabs>
          </Box>

          {/* Tab Panels */}
          {activeTab === 0 && <OverviewTab chartData={emiData.chartData} upcomingPayments={emiData.upcomingPayments} insights={emiData.insights} />}
          {activeTab === 1 && <MonthlyTrendsTab monthlyTrendsData={monthlyTrendsData} />}
          {activeTab === 2 && <ReportsTab chartData={emiData.chartData} selectedPeriod={emiData.selectedPeriod} setSelectedPeriod={emiData.setSelectedPeriod} />}
          {activeTab === 3 && <UpcomingPaymentsTab upcomingPayments={emiData.upcomingPayments} setUpcomingPayments={emiData.setUpcomingPayments} fetchAllData={emiData.fetchAllData} />}
          {activeTab === 4 && <ActiveEMIsTab overview={emiData.overview} fetchAllData={emiData.fetchAllData} setUpcomingPayments={emiData.setUpcomingPayments} upcomingPayments={emiData.upcomingPayments} />}
          {activeTab === 5 && <CompletedEMIsTab overview={emiData.overview} />}
          {activeTab === 6 && <LoansGivenTab loansGivenData={loansGivenData} />}
          {activeTab === 7 && <PersonalLoansTab personalLoansData={personalLoansData} />}

          {/* Dialogs */}
          <ManualEMIDialog
            open={manualEMIDialogOpen}
            onClose={() => setManualEMIDialogOpen(false)}
            onSuccess={emiData.fetchAllData}
          />
          <SyncDialog
            open={syncDialogOpen}
            onClose={() => setSyncDialogOpen(false)}
            userProfile={userProfile}
            syncing={syncing}
            setSyncing={setSyncing}
            onSuccess={emiData.fetchAllData}
          />
          <ExportDialog
            open={exportDialogOpen}
            onClose={() => setExportDialogOpen(false)}
          />
        </Container>
      </Box>
    </>
  );
};

export default EMITracker;
