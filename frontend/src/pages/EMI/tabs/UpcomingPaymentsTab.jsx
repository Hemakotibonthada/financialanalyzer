import React, { useState, useMemo } from 'react';
import { 
  Box, Grid, Card, CardContent, Typography, Chip, Button, 
  IconButton, ToggleButtonGroup, ToggleButton, Alert, Divider,
  Badge
} from '@mui/material';
import { 
  CheckCircle, CalendarToday, CreditCard, TrendingUp, 
  Warning, Info
} from '@mui/icons-material';

const UpcomingPaymentsTab = ({ overview, upcomingMonthsToShow, setUpcomingMonthsToShow, onMarkAsPaid }) => {
  const [monthsFilter, setMonthsFilter] = useState(upcomingMonthsToShow || 3);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const upcomingPayments = useMemo(() => {
    if (!overview || !overview.activeEMIs || !Array.isArray(overview.activeEMIs)) return [];
    
    const today = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + monthsFilter);
    
    const payments = [];
    
    overview.activeEMIs.forEach(emi => {
      if (!emi.nextPaymentDate || !emi.totalTenure || !emi.remainingInstallments) return;
      
      let currentDate = new Date(emi.nextPaymentDate);
      let installmentNum = emi.totalTenure - emi.remainingInstallments + 1;
      
      for (let i = 0; i < emi.remainingInstallments; i++) {
        if (currentDate >= today && currentDate <= endDate) {
          payments.push({
            ...emi,
            emiId: emi.id || emi._id || emi.emiId,
            paymentDate: new Date(currentDate),
            installmentNumber: installmentNum,
            daysUntil: Math.floor((currentDate - today) / (1000 * 60 * 60 * 24))
          });
        }
        
        currentDate = new Date(currentDate);
        currentDate.setMonth(currentDate.getMonth() + 1);
        installmentNum++;
        
        if (currentDate > endDate) break;
      }
    });
    
    return payments.sort((a, b) => a.paymentDate - b.paymentDate);
  }, [overview, monthsFilter]);

  // Group by month
  const paymentsByMonth = useMemo(() => {
    const grouped = {};
    
    if (!Array.isArray(upcomingPayments)) return grouped;
    
    upcomingPayments.forEach(payment => {
      if (!payment.paymentDate) return;
      
      const monthKey = payment.paymentDate.toLocaleDateString('en-IN', { 
        month: 'long', 
        year: 'numeric' 
      });
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(payment);
    });
    
    return grouped;
  }, [upcomingPayments]);

  const totalUpcoming = upcomingPayments.reduce((sum, p) => sum + p.emiAmount, 0);
  const overdueSoon = upcomingPayments.filter(p => p.daysUntil <= 7).length;
  const thisMonth = upcomingPayments.filter(p => {
    const now = new Date();
    const pDate = p.paymentDate;
    return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
  });

  if (upcomingPayments.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          <Typography>No upcoming payments in the next {monthsFilter} month(s).</Typography>
        </Alert>
      </Box>
    );
  }

  const getStatusColor = (daysUntil) => {
    if (daysUntil < 0) return 'error';
    if (daysUntil <= 3) return 'warning';
    if (daysUntil <= 7) return 'info';
    return 'success';
  };

  const getDaysText = (daysUntil) => {
    if (daysUntil < 0) return 'Overdue';
    if (daysUntil === 0) return 'Due Today';
    if (daysUntil === 1) return 'Due Tomorrow';
    return `In ${daysUntil} days`;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CalendarToday sx={{ mr: 1 }} />
                <Typography variant="body2">Total Payments</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {upcomingPayments.length}
              </Typography>
              <Typography variant="caption">Next {monthsFilter} month(s)</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUp sx={{ mr: 1 }} />
                <Typography variant="body2">Total Amount</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {formatCurrency(totalUpcoming)}
              </Typography>
              <Typography variant="caption">
                This month: {formatCurrency(thisMonth.reduce((sum, p) => sum + p.emiAmount, 0))}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Warning sx={{ mr: 1 }} />
                <Typography variant="body2">Urgent Payments</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {overdueSoon}
              </Typography>
              <Typography variant="caption">Due within 7 days</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
        <ToggleButtonGroup
          value={monthsFilter}
          exclusive
          onChange={(e, val) => {
            if (val) {
              setMonthsFilter(val);
              if (setUpcomingMonthsToShow) setUpcomingMonthsToShow(val);
            }
          }}
          size="small"
        >
          <ToggleButton value={1}>1 Month</ToggleButton>
          <ToggleButton value={3}>3 Months</ToggleButton>
          <ToggleButton value={6}>6 Months</ToggleButton>
          <ToggleButton value={12}>12 Months</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Payments by Month */}
      {Object.entries(paymentsByMonth).map(([month, payments]) => (
        <Box key={month} sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
            {month}
          </Typography>
          
          <Grid container spacing={2}>
            {Array.isArray(payments) && payments.map((payment, idx) => (
              <Grid item xs={12} md={6} lg={4} key={`${payment._id}-${idx}`}>
                <Card 
                  sx={{ 
                    border: payment.daysUntil <= 3 ? 2 : 1,
                    borderColor: payment.daysUntil <= 3 ? 'warning.main' : 'divider',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    }
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {payment.cardProvider || 'N/A'}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {payment.productDescription || payment.merchantName || 'EMI Payment'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Installment {payment.installmentNumber} of {payment.totalTenure}
                        </Typography>
                      </Box>
                      
                      <CreditCard color="action" />
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Amount
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {formatCurrency(payment.emiAmount)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Due Date
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {formatDate(payment.paymentDate)}
                        </Typography>
                      </Box>
                      
                      <Chip 
                        label={getDaysText(payment.daysUntil)}
                        color={getStatusColor(payment.daysUntil)}
                        size="small"
                        icon={payment.daysUntil <= 3 ? <Warning /> : <Info />}
                      />
                    </Box>
                    
                    <Button
                      fullWidth
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircle />}
                      onClick={() => onMarkAsPaid(payment.emiId, payment.installmentNumber, { emiAmount: payment.amount, amount: payment.amount })}
                      size="small"
                    >
                      Mark as Paid
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );
};

export default UpcomingPaymentsTab;
