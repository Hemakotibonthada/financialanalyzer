import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import { CheckCircle as CheckCircleIcon, Warning as WarningIcon, Info as InfoIcon } from '@mui/icons-material';

const ConfirmationDialog = ({ dialog, onClose }) => {
  if (!dialog || !dialog.open) return null;

  return (
    <Dialog open={dialog.open} onClose={onClose}>
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        color: dialog.isError ? 'error.main' : dialog.isSuccess ? 'success.main' : 'text.primary'
      }}>
        {dialog.isError ? <WarningIcon color="error" /> : 
         dialog.isSuccess ? <CheckCircleIcon color="success" /> : 
         <InfoIcon />}
        {dialog.title}
      </DialogTitle>
      <DialogContent>
        <Typography>{dialog.message}</Typography>
      </DialogContent>
      <DialogActions>
        {(!dialog.isSuccess && !dialog.isError) ? (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="contained" onClick={dialog.confirmAction}>Confirm</Button>
          </>
        ) : (
          <Button variant="contained" onClick={onClose}>OK</Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationDialog;
