import React from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import {
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  Add as AddIcon,
  Download as DownloadIcon
} from '@mui/icons-material';

const EMIHeader = ({ 
  loading, 
  syncing, 
  onRefresh, 
  onExport, 
  onAddManual, 
  onSync 
}) => {
  return (
    <Box 
      sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 4,
        p: 4,
        mb: 4,
        boxShadow: '0 20px 60px rgba(102, 126, 234, 0.3)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          opacity: 0.4
        }
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} position="relative" zIndex={1}>
        <Box>
          <Typography 
            variant="h3" 
            sx={{
              fontWeight: 800,
              color: 'white',
              mb: 1,
              textShadow: '0 4px 12px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            💳 EMI Tracker
          </Typography>
          <Typography 
            variant="subtitle1" 
            sx={{
              color: 'rgba(255,255,255,0.9)',
              fontWeight: 500
            }}
          >
            Track and manage all your EMI payments in one place
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            disabled={loading}
            sx={{ 
              color: 'white',
              borderColor: 'rgba(255,255,255,0.5)',
              backdropFilter: 'blur(10px)',
              backgroundColor: 'rgba(255,255,255,0.1)',
              fontWeight: 600,
              px: 3,
              py: 1.5,
              borderRadius: 3,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                borderColor: 'white',
                backgroundColor: 'rgba(255,255,255,0.2)',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
              }
            }}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<AssessmentIcon />}
            onClick={onExport}
            sx={{ 
              color: 'white',
              borderColor: 'rgba(255,255,255,0.5)',
              backdropFilter: 'blur(10px)',
              backgroundColor: 'rgba(255,255,255,0.1)',
              fontWeight: 600,
              px: 3,
              py: 1.5,
              borderRadius: 3,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                borderColor: 'white',
                backgroundColor: 'rgba(255,255,255,0.2)',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
              }
            }}
          >
            Export Report
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAddManual}
            sx={{
              background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
              color: 'white',
              fontWeight: 700,
              px: 3,
              py: 1.5,
              borderRadius: 3,
              boxShadow: '0 8px 24px rgba(51, 8, 103, 0.4)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 12px 32px rgba(51, 8, 103, 0.5)'
              }
            }}
          >
            Add Manual EMI
          </Button>
          <Button
            variant="contained"
            startIcon={syncing ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <DownloadIcon />}
            onClick={onSync}
            disabled={syncing}
            sx={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              fontWeight: 700,
              px: 3,
              py: 1.5,
              borderRadius: 3,
              boxShadow: '0 8px 24px rgba(245, 87, 108, 0.4)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 12px 32px rgba(245, 87, 108, 0.5)'
              }
            }}
          >
            {syncing ? 'Syncing...' : 'Sync Statements'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default EMIHeader;
