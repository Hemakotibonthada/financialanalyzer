import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Box, Typography, Alert
} from '@mui/material';

const PersonalLoanRepaymentDialog = ({ open, onClose, onSave, data, setData, selectedLoan }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Repayment</DialogTitle>
      <DialogContent>
        {selectedLoan && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Alert severity="info">
              <Typography variant="body2">
                <strong>Lender:</strong> {selectedLoan.lenderName}
              </Typography>
              <Typography variant="body2">
                <strong>Outstanding:</strong> ₹{(selectedLoan.outstandingAmount || 0).toLocaleString()}
              </Typography>
              {selectedLoan.currentInterest > 0 && (
                <Typography variant="body2" color="warning.main">
                  <strong>Current Interest:</strong> ₹{(selectedLoan.currentInterest || 0).toLocaleString()}
                </Typography>
              )}
            </Alert>

            <TextField label="Repayment Amount" type="number" required fullWidth value={data.amount}
              onChange={(e) => setData({ ...data, amount: e.target.value })}
              InputProps={{ startAdornment: '₹' }}
              helperText={`Max: ₹${(selectedLoan.outstandingAmount || 0).toLocaleString()}`}
            />

            <TextField label="Notes" fullWidth multiline rows={2} value={data.notes}
              onChange={(e) => setData({ ...data, notes: e.target.value })}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSave} variant="contained" color="success">
          Add Repayment
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PersonalLoanRepaymentDialog;
