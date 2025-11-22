import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Box, FormControl, Select, MenuItem, InputLabel
} from '@mui/material';

const PersonalLoanDialog = ({ open, onClose, onSave, data, setData, selectedLoan }) => {
  // Provide default values to prevent undefined errors
  const formData = data || {
    lenderName: '',
    relationship: 'Friend',
    principalAmount: '',
    loanTakenDate: new Date().toISOString().split('T')[0],
    interestType: 'none',
    interestRate: 0,
    purpose: '',
    priority: 'medium',
    contactDetails: { phone: '', email: '' },
    notes: ''
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{selectedLoan ? 'Edit Personal Loan' : 'Add Personal Loan'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField label="Lender Name" required fullWidth value={formData.lenderName}
            onChange={(e) => setData({ ...formData, lenderName: e.target.value })}
          />

          <FormControl fullWidth>
            <InputLabel>Relationship</InputLabel>
            <Select value={formData.relationship} onChange={(e) => setData({ ...formData, relationship: e.target.value })} label="Relationship">
              <MenuItem value="Friend">Friend</MenuItem>
              <MenuItem value="Family">Family</MenuItem>
              <MenuItem value="Colleague">Colleague</MenuItem>
              <MenuItem value="Relative">Relative</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>

          <TextField label="Principal Amount" type="number" required fullWidth value={formData.principalAmount}
            onChange={(e) => setData({ ...formData, principalAmount: e.target.value })}
            InputProps={{ startAdornment: '₹' }}
          />

          <TextField label="Loan Taken Date" type="date" fullWidth value={formData.loanTakenDate}
            onChange={(e) => setData({ ...formData, loanTakenDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />

          <FormControl fullWidth>
            <InputLabel>Interest Type</InputLabel>
            <Select value={formData.interestType} onChange={(e) => setData({ ...formData, interestType: e.target.value })} label="Interest Type">
              <MenuItem value="none">No Interest</MenuItem>
              <MenuItem value="simple">Simple Interest</MenuItem>
            </Select>
          </FormControl>

          {formData.interestType === 'simple' && (
            <TextField label="Interest Rate (% per annum)" type="number" fullWidth value={formData.interestRate}
              onChange={(e) => setData({ ...formData, interestRate: parseFloat(e.target.value) || 0 })}
              InputProps={{ endAdornment: '%' }}
            />
          )}

          <TextField label="Purpose" fullWidth multiline rows={2} value={formData.purpose}
            onChange={(e) => setData({ ...formData, purpose: e.target.value })}
          />

          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select value={formData.priority} onChange={(e) => setData({ ...formData, priority: e.target.value })} label="Priority">
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
            </Select>
          </FormControl>

          <TextField label="Contact Phone" fullWidth value={formData.contactDetails.phone}
            onChange={(e) => setData({ ...formData, contactDetails: { ...formData.contactDetails, phone: e.target.value } })}
          />

          <TextField label="Contact Email" fullWidth type="email" value={formData.contactDetails.email}
            onChange={(e) => setData({ ...formData, contactDetails: { ...formData.contactDetails, email: e.target.value } })}
          />

          <TextField label="Notes" fullWidth multiline rows={3} value={formData.notes}
            onChange={(e) => setData({ ...formData, notes: e.target.value })}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSave} variant="contained" color="primary">
          {selectedLoan ? 'Update' : 'Add'} Loan
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PersonalLoanDialog;
