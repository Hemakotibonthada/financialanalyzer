import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Box, FormControl, Select, MenuItem, InputLabel,
  Typography, Alert
} from '@mui/material';

const RepaymentDialog = ({ open, onClose, onSave, data, setData, selectedLoan }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Repayment</DialogTitle>
      <DialogContent>
        {selectedLoan && (
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info">
              <Typography variant="body2">
                <strong>{selectedLoan.borrowerName}</strong>
                <br />
                Outstanding: ₹{(selectedLoan.remainingAmount || 0).toLocaleString()}
              </Typography>
            </Alert>

            <TextField label="Repayment Amount *" type="number" fullWidth value={data.amount}
              onChange={(e) => setData({ ...data, amount: e.target.value })}
              InputProps={{ startAdornment: '₹' }}
              helperText={`Max: ₹${(selectedLoan.remainingAmount || 0).toLocaleString()}`}
            />

            <TextField label="Repayment Date" type="date" fullWidth value={data.date}
              onChange={(e) => setData({ ...data, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            <FormControl fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select value={data.method} onChange={(e) => setData({ ...data, method: e.target.value })} label="Payment Method">
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                <MenuItem value="upi">UPI</MenuItem>
                <MenuItem value="cheque">Cheque</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>

            <TextField label="Transaction ID" fullWidth value={data.transactionId}
              onChange={(e) => setData({ ...data, transactionId: e.target.value })}
            />

            <TextField label="Notes" fullWidth multiline rows={2} value={data.notes}
              onChange={(e) => setData({ ...data, notes: e.target.value })}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSave} variant="contained" color="primary">
          Add Repayment
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RepaymentDialog;
