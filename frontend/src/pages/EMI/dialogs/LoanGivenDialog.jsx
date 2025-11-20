import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, Typography } from '@mui/material';

const LoanGivenDialog = ({ open, onClose, onSave, selectedLoan, formData, setFormData }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{selectedLoan ? 'Edit Loan' : 'Add New Loan Given'}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Borrower Name *" fullWidth value={formData.borrowerName} onChange={(e) => setFormData({ ...formData, borrowerName: e.target.value })} />
          <FormControl fullWidth>
            <InputLabel>Relationship</InputLabel>
            <Select value={formData.relationship} onChange={(e) => setFormData({ ...formData, relationship: e.target.value })} label="Relationship">
              <MenuItem value="Friend">Friend</MenuItem>
              <MenuItem value="Family">Family</MenuItem>
              <MenuItem value="Colleague">Colleague</MenuItem>
              <MenuItem value="Relative">Relative</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Amount *" type="number" fullWidth value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} InputProps={{ startAdornment: '₹' }} />
          <TextField label="Loan Date" type="date" fullWidth value={formData.loanDate} onChange={(e) => setFormData({ ...formData, loanDate: e.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField label="Expected Repayment Date" type="date" fullWidth value={formData.expectedRepaymentDate} onChange={(e) => setFormData({ ...formData, expectedRepaymentDate: e.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField label="Purpose" fullWidth multiline rows={2} value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} />
          <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 2, border: '1px solid', borderColor: 'primary.main' }}>
            <FormControlLabel
              control={<Checkbox checked={formData.hasInterest} onChange={(e) => setFormData({ ...formData, hasInterest: e.target.checked, interestRate: e.target.checked ? formData.interestRate : 0 })} sx={{ color: 'primary.main' }} />}
              label={<Box><Typography variant="body1" fontWeight={600}>💰 Charge Interest on this Loan</Typography><Typography variant="caption" color="text.secondary">Enable to add interest rate for this loan</Typography></Box>}
            />
            {formData.hasInterest && (
              <Box sx={{ mt: 2 }}>
                <TextField label="Interest Rate (% per annum)" type="number" fullWidth value={formData.interestRate} onChange={(e) => setFormData({ ...formData, interestRate: parseFloat(e.target.value) || 0 })} InputProps={{ endAdornment: '% p.a.', inputProps: { min: 0, max: 100, step: 0.5 } }} helperText="Simple interest will be calculated based on days elapsed" />
                {formData.amount && formData.interestRate > 0 && (
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.light', borderRadius: 1 }}>
                    <Typography variant="caption" color="info.dark" display="block">📊 Interest Preview (1 year):</Typography>
                    <Typography variant="body2" color="info.dark" fontWeight={600}>₹{((parseFloat(formData.amount) * parseFloat(formData.interestRate) / 100) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
          <Box display="flex" gap={2}>
            <TextField label="Phone Number" fullWidth value={formData.contactDetails?.phone} onChange={(e) => setFormData({ ...formData, contactDetails: { ...formData.contactDetails, phone: e.target.value } })} />
            <TextField label="Email" fullWidth type="email" value={formData.contactDetails?.email} onChange={(e) => setFormData({ ...formData, contactDetails: { ...formData.contactDetails, email: e.target.value } })} />
          </Box>
          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} label="Priority">
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Notes" fullWidth multiline rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSave} variant="contained" color="primary">{selectedLoan ? 'Update' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default LoanGivenDialog;
