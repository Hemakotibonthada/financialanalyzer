import React from 'react';
import { Box, Typography, Alert } from '@mui/material';
import OverviewTab from './OverviewTab';

const ReportsTab = ({ chartData, upcomingPayments, selectedPeriod, setSelectedPeriod }) => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>EMI Reports & Analytics</Typography>
      <Alert severity="info" sx={{ mb: 3 }}>Comprehensive EMI analytics and reports</Alert>
      <OverviewTab chartData={chartData} upcomingPayments={upcomingPayments} />
    </Box>
  );
};

export default ReportsTab;
