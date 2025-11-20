import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Alert, Chip } from '@mui/material';
import { formatCurrency, formatDate } from '../utils/formatters';

const UpcomingPaymentsTab = ({ upcomingPayments }) => {
  if (!upcomingPayments || !upcomingPayments.upcoming || upcomingPayments.upcoming.length === 0) {
    return <Box sx={{ p: 3 }}><Alert severity="info">No upcoming payments</Alert></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Upcoming Payments</Typography>
      <Grid container spacing={2}>
        {upcomingPayments.upcoming.map((payment, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card elevation={2} sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>{payment.merchantName}</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>{payment.cardProvider} {payment.cardLastFourDigits}</Typography>
                <Typography variant="h5" color="primary" sx={{ my: 2, fontWeight: 700 }}>{formatCurrency(payment.emiAmount)}</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption">Due: {formatDate(payment.nextPaymentDate)}</Typography>
                  <Chip label={`${payment.remainingTenure} left`} size="small" color="warning" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default UpcomingPaymentsTab;
