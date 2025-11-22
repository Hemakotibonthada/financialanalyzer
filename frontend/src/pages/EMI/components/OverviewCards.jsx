import React from 'react';
import { Grid, Card, CardContent, Typography, Box, Chip } from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as AccountBalanceIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { formatCurrency } from '../utils/formatters';

const OverviewCards = ({ overview, animateCards, personalLoansSummary }) => {
  console.log('🎴 OverviewCards - Received overview:', overview);
  console.log('🎴 OverviewCards - Overview stats:', overview?.overview);
  console.log('🎴 OverviewCards - Active EMIs array:', overview?.activeEMIs);
  
  if (!overview) {
    console.warn('⚠️ OverviewCards - No overview data received!');
    return null;
  }

  // Extract the nested overview stats
  const stats = overview.overview || {};
  
  const cardConfigs = [
    {
      title: 'Active EMIs',
      value: stats.totalActiveEMIs || 0,
      subtitle: `${stats.totalCompletedEMIs || 0} completed`,
      icon: CreditCardIcon,
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      delay: '0ms'
    },
    {
      title: 'Outstanding Amount',
      value: formatCurrency((stats.totalOutstanding || 0) + ((personalLoansSummary && personalLoansSummary.totalOutstanding) || 0)),
      subtitle: 'Total remaining debt',
      icon: AccountBalanceIcon,
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      delay: '100ms',
      caption: personalLoansSummary && personalLoansSummary.totalOutstanding > 0 ? 
        `(EMI: ${formatCurrency(stats.totalOutstanding || 0)} + Personal Loans: ${formatCurrency(personalLoansSummary.totalOutstanding)})` : null
    },
    {
      title: 'Monthly Burden',
      value: formatCurrency((stats.monthlyBurden || 0) + ((personalLoansSummary && personalLoansSummary.monthlyPayments) || 0)),
      subtitle: 'Paid monthly',
      icon: TrendingUpIcon,
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      delay: '200ms',
      caption: personalLoansSummary && personalLoansSummary.monthlyPayments > 0 ? 
        `(EMI: ${formatCurrency(stats.monthlyBurden || 0)} + Personal Loans: ${formatCurrency(personalLoansSummary.monthlyPayments)})` : null
    },
    {
      title: 'Total Paid',
      value: formatCurrency((stats.totalAmountPaid || 0) + ((personalLoansSummary && personalLoansSummary.totalPaid) || 0)),
      subtitle: 'Successfully paid',
      icon: CheckCircleIcon,
      gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      delay: '300ms',
      caption: personalLoansSummary && personalLoansSummary.totalPaid > 0 ? 
        `(EMI: ${formatCurrency(stats.totalAmountPaid || 0)} + Personal Loans: ${formatCurrency(personalLoansSummary.totalPaid)})` : null
    }
  ];

  return (
    <Grid container spacing={3} mb={4}>
      {cardConfigs.map((config, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card 
            elevation={0}
            sx={{ 
              background: config.gradient,
              color: 'white',
              borderRadius: 4,
              overflow: 'hidden',
              position: 'relative',
              transform: animateCards ? 'translateY(0)' : 'translateY(20px)',
              opacity: animateCards ? 1 : 0,
              transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              transitionDelay: config.delay,
              '&:hover': { 
                transform: 'translateY(-12px) scale(1.02)', 
                boxShadow: '0 20px 40px rgba(102, 126, 234, 0.4)',
                '& .icon-container': {
                  transform: 'rotate(360deg) scale(1.2)'
                },
                '& .stats-number': {
                  transform: 'scale(1.1)'
                }
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '150px',
                height: '150px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
                transform: 'translate(30%, -30%)'
              }
            }}
          >
            <CardContent sx={{ position: 'relative', zIndex: 1 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 600, mb: 1 }}>
                    {config.title}
                  </Typography>
                  <Typography 
                    variant="h2" 
                    className="stats-number"
                    sx={{ 
                      fontWeight: 800, 
                      fontSize: { xs: '1.75rem', sm: '2.5rem' },
                      transition: 'transform 0.3s ease',
                      textShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }}
                  >
                    {config.value}
                  </Typography>
                </Box>
                <Box 
                  className="icon-container"
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)',
                    borderRadius: 3,
                    p: 1.5,
                    transition: 'all 0.5s ease'
                  }}
                >
                  <config.icon sx={{ fontSize: 40 }} />
                </Box>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                {config.title === 'Active EMIs' ? <CheckCircleIcon sx={{ fontSize: 16, opacity: 0.8 }} /> : 
                 config.title === 'Outstanding Amount' ? <WarningIcon sx={{ fontSize: 16, opacity: 0.8 }} /> :
                 config.title === 'Monthly Burden' ? <CalendarIcon sx={{ fontSize: 16, opacity: 0.8 }} /> :
                 <TrendingUpIcon sx={{ fontSize: 16, opacity: 0.8 }} />}
                <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>
                  {config.subtitle}
                </Typography>
              </Box>
              {config.caption && (
                <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 400, mt: 0.5, display: 'block' }}>
                  {config.caption}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default OverviewCards;
