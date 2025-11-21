import React from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import {
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon,
  CreditCard as CreditCardIcon,
  CheckCircle as CheckCircleIcon,
  Payment as PaymentIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';

const EMITabs = ({ activeTab, onChange }) => {
  const tabs = [
    { label: 'Overview', icon: <AssessmentIcon /> },
    { label: 'Monthly Trends', icon: <TrendingUpIcon /> },
    { label: 'Reports', icon: <TrendingUpIcon /> },
    { label: 'Upcoming Payments', icon: <CalendarIcon /> },
    { label: 'Active EMIs', icon: <CreditCardIcon /> },
    { label: 'Completed EMIs', icon: <CheckCircleIcon /> },
    { label: 'Loans Given', icon: <PaymentIcon /> },
    { label: 'Personal Loans', icon: <MoneyIcon /> }
  ];

  return (
    <Box 
      sx={{ 
        mb: 4,
        bgcolor: 'white',
        borderRadius: 4,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        overflow: 'hidden'
      }}
    >
      <Tabs 
        value={activeTab} 
        onChange={onChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          px: 2,
          '& .MuiTabs-indicator': {
            height: 4,
            borderRadius: '4px 4px 0 0',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          },
          '& .MuiTab-root': {
            fontWeight: 600,
            fontSize: '1rem',
            textTransform: 'none',
            minHeight: 64,
            minWidth: 'auto',
            px: 3,
            transition: 'all 0.3s ease',
            '&:hover': {
              color: '#667eea',
              transform: 'translateY(-2px)'
            }
          },
          '& .Mui-selected': {
            fontWeight: 700,
            background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)'
          }
        }}
      >
        {tabs.map((tab, index) => (
          <Tab 
            key={index}
            label={tab.label} 
            icon={tab.icon} 
            iconPosition="start"
          />
        ))}
      </Tabs>
    </Box>
  );
};

export default EMITabs;
