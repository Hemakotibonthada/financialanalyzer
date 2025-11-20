import React from 'react';
import { Card, CardContent, Box, Typography } from '@mui/material';

const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  gradient, 
  animateCards, 
  delay = 0 
}) => {
  return (
    <Card 
      elevation={0}
      sx={{ 
        background: gradient,
        color: 'white',
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
        transform: animateCards ? 'translateY(0)' : 'translateY(20px)',
        opacity: animateCards ? 1 : 0,
        transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        transitionDelay: `${delay}ms`,
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
              {title}
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
              {value}
            </Typography>
          </Box>
          {Icon && (
            <Box 
              className="icon-container"
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)',
                borderRadius: 3,
                p: 1.5,
                transition: 'all 0.5s ease'
              }}
            >
              <Icon sx={{ fontSize: 40 }} />
            </Box>
          )}
        </Box>
        {subtitle && (
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>
              {subtitle}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
