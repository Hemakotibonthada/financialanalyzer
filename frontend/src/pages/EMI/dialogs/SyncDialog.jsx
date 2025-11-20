import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert, Typography } from '@mui/material';

const SyncDialog = ({ open, onClose, userProfile, syncing, setSyncing, onSuccess }) => {
  const handleSync = async () => {
    // Call the onSuccess handler if provided
    if (onSuccess) {
      await onSuccess();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      TransitionProps={{
        style: {
          transition: 'all 0.3s ease'
        }
      }}
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
        }
      }}
    >
      <DialogTitle sx={{ 
        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
        color: 'white',
        fontWeight: 'bold'
      }}>
        📥 Sync Credit Card Statements
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Typography gutterBottom>
          This will fetch credit card statements from your Gmail and automatically extract EMI information.
        </Typography>
        
        {userProfile?.gmailConnected ? (
          <Alert 
            severity="success" 
            sx={{ 
              mt: 2,
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: 4,
                transform: 'scale(1.02)'
              }
            }}
          >
            ✓ Gmail is connected and ready to sync
          </Alert>
        ) : (
          <Alert 
            severity="warning" 
            sx={{ 
              mt: 2,
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: 4,
                transform: 'scale(1.02)'
              }
            }}
          >
            ⚠ Gmail not connected. Please go to Profile → Settings to connect Gmail first.
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button 
          onClick={onClose}
          sx={{
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'scale(1.05)',
              backgroundColor: 'grey.100'
            }
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSync} 
          variant="contained" 
          disabled={syncing || !userProfile?.gmailConnected}
          sx={{
            transition: 'all 0.3s ease',
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            '&:hover': {
              transform: 'scale(1.05)',
              boxShadow: 6,
              background: 'linear-gradient(45deg, #1976D2 30%, #00BCD4 90%)'
            },
            '&:disabled': {
              background: 'grey.300'
            }
          }}
        >
          {syncing ? '⏳ Syncing...' : '🚀 Start Sync'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SyncDialog;
