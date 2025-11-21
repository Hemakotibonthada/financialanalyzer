import React from 'react';
import { Box, Typography, Grid, Alert, Chip } from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import { getSeverityColor } from '../utils/formatters';

const InsightsSection = ({ insights }) => {
  if (!insights || insights.length === 0) return null;

  return (
    <Box mb={4}>
      <Box 
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 3,
          pb: 2,
          borderBottom: '2px solid',
          borderImage: 'linear-gradient(to right, #667eea, #764ba2) 1'
        }}
      >
        <Box
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 2,
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <InfoIcon sx={{ color: 'white', fontSize: 28 }} />
        </Box>
        <Typography 
          variant="h5" 
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundClip: 'text',
            textFillColor: 'transparent',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Smart Insights & Recommendations
        </Typography>
      </Box>
      <Grid container spacing={3}>
        {insights.map((insight, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Alert
              severity={getSeverityColor(insight.severity)}
              icon={<InfoIcon sx={{ fontSize: 24 }} />}
              action={
                insight.action && (
                  <Chip 
                    label={insight.action} 
                    size="small"
                    sx={{
                      fontWeight: 600,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                )
              }
              sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateX(8px) translateY(-4px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                }
              }}
            >
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 0.5 }}>
                {insight.title}
              </Typography>
              <Typography variant="body2">{insight.description}</Typography>
            </Alert>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default InsightsSection;
