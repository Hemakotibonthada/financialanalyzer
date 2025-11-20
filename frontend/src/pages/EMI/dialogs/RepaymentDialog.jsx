import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Alert, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const RepaymentDialog = ({ open, onClose, onSave, selectedLoan, formData, setFormData }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Repayment</DialogTitle>
      <DialogContent>
        {selectedLoan && (
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info">
              <Typography variant="body2"><strong>{selectedLoan.borrowerName}</strong><br />Outstanding: ₹{(selectedLoan.remainingAmount || 0).toLocaleString()}</Typography>
            </Alert>
            <TextField label="Repayment Amount *" type="number" fullWidth value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} InputProps={{ startAdornment: '₹' }} helperText={`Max: ₹${(selectedLoan.remainingAmount || 0).toLocaleString()}`} />
            <TextField label="Repayment Date" type="date" fullWidth value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} InputLabelProps={{ shrink: true }} />
            <FormControl fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select value={formData.method} onChange={(e) => setFormData({ ...formData, method: e.target.value })} label="Payment Method">
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                <MenuItem value="upi">UPI</MenuItem>
                <MenuItem value="cheque">Cheque</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Transaction ID" fullWidth value={formData.transactionId} onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })} />
            <TextField label="Notes" fullWidth multiline rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSave} variant="contained" color="primary">Add Repayment</Button>
      </DialogActions>
    </Dialog>
  );
};

export default RepaymentDialog;
