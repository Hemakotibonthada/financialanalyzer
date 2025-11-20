import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Alert } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import DeleteIcon from '@mui/icons-material/Delete';

const DeleteConfirmDialog = ({ open, onClose, onConfirm, selectedEMI, formatCurrency }) => {
  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ sx: { borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' } }}>
      <DialogTitle sx={{ color: 'error.main', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon />
        Delete EMI?
      </DialogTitle>
      <DialogContent>
        <Typography>Are you sure you want to delete this EMI?</Typography>
        {selectedEMI && (
          <Box mt={2} p={2} bgcolor="grey.100" borderRadius={2}>
            <Typography variant="body2"><strong>Merchant:</strong> {selectedEMI.merchantName}</Typography>
            <Typography variant="body2"><strong>Card:</strong> {selectedEMI.cardProvider} {selectedEMI.cardLastFourDigits}</Typography>
            <Typography variant="body2"><strong>EMI Amount:</strong> {formatCurrency(selectedEMI.emiAmount)}</Typography>
            <Typography variant="body2"><strong>Remaining:</strong> {formatCurrency(selectedEMI.remainingAmount)}</Typography>
          </Box>
        )}
        <Alert severity="warning" sx={{ mt: 2 }}>
          This action cannot be undone. All payment history will be permanently deleted.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <Button onClick={onConfirm} variant="contained" color="error" startIcon={<DeleteIcon />} sx={{ '&:hover': { transform: 'scale(1.05)', boxShadow: 6 } }}>Delete</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmDialog;
