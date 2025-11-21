import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Alert } from '@mui/material';

const SyncDialog = ({ open, onClose, onSync, syncing, userProfile }) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Sync Credit Card Statements</DialogTitle>
      <DialogContent>
        <Typography>Fetch statements from Gmail and extract EMI information.</Typography>
        {userProfile?.gmailConnected ? (
          <Alert severity="success" sx={{ mt: 2 }}>Gmail is connected</Alert>
        ) : (
          <Alert severity="warning" sx={{ mt: 2 }}>Gmail not connected</Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSync} disabled={syncing || !userProfile?.gmailConnected} variant="contained">
          {syncing ? 'Syncing...' : 'Start Sync'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SyncDialog;
