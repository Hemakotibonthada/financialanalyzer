// Placeholder - Will implement complete dialog
import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

const ManualEMIDialog = ({ open, onClose, onCreate, data, errors, loading, onChange }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Add Manual EMI</DialogTitle>
      <DialogContent>
        {/* Complete form implementation here */}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onCreate} disabled={loading} variant="contained">Create</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManualEMIDialog;
