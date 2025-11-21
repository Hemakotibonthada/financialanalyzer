import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Alert } from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { formatCurrency } from '../utils/formatters';

const DeleteConfirmDialog = ({ open, onClose, onConfirm, selectedEMI }) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon /> Delete EMI?
      </DialogTitle>
      <DialogContent>
        <Typography>Are you sure you want to delete this EMI?</Typography>
        {selectedEMI && (
          <Box mt={2} p={2} bgcolor="grey.100" borderRadius={2}>
            <Typography variant="body2"><strong>Merchant:</strong> {selectedEMI.merchantName}</Typography>
            <Typography variant="body2"><strong>Card:</strong> {selectedEMI.cardProvider} {selectedEMI.cardLastFourDigits}</Typography>
            <Typography variant="body2"><strong>Amount:</strong> {formatCurrency(selectedEMI.emiAmount)}</Typography>
          </Box>
        )}
        <Alert severity="warning" sx={{ mt: 2 }}>
          This action cannot be undone.
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={() => onConfirm(selectedEMI)} color="error" variant="contained">Delete</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmDialog;
