import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Grid, Typography, Box, FormControl, Select, MenuItem,
  InputLabel, Alert, CircularProgress
} from '@mui/material';
import { Assessment as AssessmentIcon, Download as DownloadIcon } from '@mui/icons-material';

const ExportDialog = ({ open, onClose, onExport, exportFormat, setExportFormat, dateRange, setDateRange, loading }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' } }}>
      <DialogTitle sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1
      }}>
        <AssessmentIcon />
        Export EMI Report
      </DialogTitle>

      <DialogContent sx={{ mt: 3 }}>
        <Typography variant="body1" gutterBottom sx={{ mb: 3 }}>
          Configure your EMI report parameters:
        </Typography>

        {/* Date Range Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            📅 Date Range
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Start Date" type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                helperText="EMIs started from this date"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="End Date" type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                helperText="Payments due until this date"
              />
            </Grid>
          </Grid>
        </Box>

        {/* Format Selection */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            📄 Export Format
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Choose Format</InputLabel>
            <Select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} label="Choose Format">
              <MenuItem value="pdf">
                <Box display="flex" alignItems="center" gap={1}>
                  <DownloadIcon sx={{ color: 'error.main' }} />
                  PDF Report (Detailed with formatting)
                </Box>
              </MenuItem>
              <MenuItem value="excel">
                <Box display="flex" alignItems="center" gap={1}>
                  <DownloadIcon sx={{ color: 'success.main' }} />
                  Excel Spreadsheet (Multiple sheets)
                </Box>
              </MenuItem>
              <MenuItem value="csv">
                <Box display="flex" alignItems="center" gap={1}>
                  <DownloadIcon sx={{ color: 'info.main' }} />
                  CSV File (Simple data)
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Alert severity="info">
          <Box>
            <Typography variant="body2" component="div" sx={{ fontWeight: 600 }}>
              Report includes:
            </Typography>
            <Box component="ul" sx={{ marginTop: 1, paddingLeft: 2.5, fontSize: '0.875rem' }}>
              <li>EMI Overview & Summary Statistics</li>
              <li>All EMIs (Active, Completed, Foreclosed) in date range</li>
              <li>Upcoming Payments Schedule</li>
              <li>Payment History & Status</li>
              <li>Provider-wise Breakdown</li>
              <li>Interest & Principal Analysis</li>
            </Box>
          </Box>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={loading} variant="outlined">
          Cancel
        </Button>
        <Button onClick={onExport} disabled={loading} variant="contained"
          startIcon={loading ? <CircularProgress size={16} /> : <DownloadIcon />}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': { transform: 'scale(1.05)', boxShadow: 6, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }
          }}>
          {loading ? 'Exporting...' : 'Export Report'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog;
