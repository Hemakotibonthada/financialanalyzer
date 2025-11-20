import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const PersonalLoanDialog = ({ open, onClose, onSave, selectedLoan, formData, setFormData }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{selectedLoan ? 'Edit Personal Loan' : 'Add Personal Loan'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField label="Lender Name" required fullWidth value={formData.lenderName} onChange={(e) => setFormData({ ...formData, lenderName: e.target.value })} />
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
          <TextField label="Principal Amount" type="number" required fullWidth value={formData.principalAmount} onChange={(e) => setFormData({ ...formData, principalAmount: e.target.value })} InputProps={{ startAdornment: '₹' }} />
          <TextField label="Loan Taken Date" type="date" fullWidth value={formData.loanTakenDate} onChange={(e) => setFormData({ ...formData, loanTakenDate: e.target.value })} InputLabelProps={{ shrink: true }} />
          <FormControl fullWidth>
            <InputLabel>Interest Type</InputLabel>
            <Select value={formData.interestType} onChange={(e) => setFormData({ ...formData, interestType: e.target.value })} label="Interest Type">
              <MenuItem value="none">No Interest</MenuItem>
              <MenuItem value="simple">Simple Interest</MenuItem>
            </Select>
          </FormControl>
          {formData.interestType === 'simple' && (
            <TextField label="Interest Rate (% per annum)" type="number" fullWidth value={formData.interestRate} onChange={(e) => setFormData({ ...formData, interestRate: parseFloat(e.target.value) || 0 })} InputProps={{ endAdornment: '%' }} />
          )}
          <TextField label="Purpose" fullWidth multiline rows={2} value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} />
          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} label="Priority">
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Contact Phone" fullWidth value={formData.contactDetails?.phone} onChange={(e) => setFormData({ ...formData, contactDetails: { ...formData.contactDetails, phone: e.target.value } })} />
          <TextField label="Contact Email" fullWidth type="email" value={formData.contactDetails?.email} onChange={(e) => setFormData({ ...formData, contactDetails: { ...formData.contactDetails, email: e.target.value } })} />
          <TextField label="Notes" fullWidth multiline rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSave} variant="contained" color="primary">{selectedLoan ? 'Update' : 'Add'} Loan</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PersonalLoanDialog;
